// ========== BỘ PHẬN ÉP — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');
const path = require('path');
const fs = require('fs');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try { await db.exec(`CREATE TABLE IF NOT EXISTS pressing_records (
        id SERIAL PRIMARY KEY, dht_order_id INTEGER,
        is_reported BOOLEAN DEFAULT false, reported_at TIMESTAMPTZ, reported_by INTEGER REFERENCES users(id),
        salary_approved BOOLEAN DEFAULT false, salary_approved_at TIMESTAMPTZ, salary_approved_by INTEGER REFERENCES users(id),
        error_reported BOOLEAN DEFAULT false, error_order_id INTEGER,
        press_date DATE, presser_id INTEGER REFERENCES users(id),
        product_name TEXT, cskh_name TEXT,
        order_quantity INTEGER DEFAULT 0, press_quantity INTEGER DEFAULT 0,
        press_salary NUMERIC DEFAULT 0,
        pos_chest_arm INTEGER DEFAULT 0, pos_back_belly INTEGER DEFAULT 0,
        pos_protective INTEGER DEFAULT 0, pos_packaging INTEGER DEFAULT 0, pos_other TEXT,
        press_images TEXT DEFAULT '[]', notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_pr_presser ON pressing_records(presser_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_pr_date ON pressing_records(press_date)`);
    } catch(e) { console.error('[BPE] records:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS pressing_history (
        id SERIAL PRIMARY KEY, pressing_id INTEGER NOT NULL REFERENCES pressing_records(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ph_pid ON pressing_history(pressing_id)`);
    } catch(e) { console.error('[BPE] history:', e.message); }

    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'pressing');
    try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch(e) {}

    // ========== HELPERS ==========
    const MGMT = ['giam_doc', 'quan_ly_cap_cao'];
    async function isPressManager(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) { const n = d.name.toLowerCase(); if (n.includes('qlx') || n.includes('ép') || n.includes('ep') || n.includes('quản lý xưởng')) return true; }
        return false;
    }

    // ========== TREE ==========
    fastify.get('/api/pressing/tree', { preHandler: [authenticate] }, async (req) => {
        const mgr = await isPressManager(req);
        let where = '', params = [];
        if (!mgr && !['quan_ly','truong_phong'].includes(req.user.role)) { where = ' AND pr.presser_id=$1'; params.push(req.user.id); }
        const rows = await db.all(`
            SELECT EXTRACT(YEAR FROM COALESCE(pr.press_date,pr.created_at))::int AS year,
                   EXTRACT(MONTH FROM COALESCE(pr.press_date,pr.created_at))::int AS month,
                   pr.presser_id, u.full_name AS presser_name, COUNT(*)::int AS count
            FROM pressing_records pr LEFT JOIN users u ON pr.presser_id=u.id
            WHERE 1=1 ${where} GROUP BY year,month,pr.presser_id,u.full_name
            ORDER BY year DESC, month DESC, u.full_name`, params);
        const total = rows.reduce((s,r) => s+r.count, 0);
        const yearMap = {};
        for (const r of rows) {
            if (!yearMap[r.year]) yearMap[r.year] = { year: r.year, count: 0, months: {} };
            if (!yearMap[r.year].months[r.month]) yearMap[r.year].months[r.month] = { month: r.month, count: 0, pressers: [] };
            const mo = yearMap[r.year].months[r.month];
            mo.pressers.push({ id: r.presser_id, name: r.presser_name || 'Chưa PC', count: r.count });
            mo.count += r.count; yearMap[r.year].count += r.count;
        }
        const tree = Object.values(yearMap).map(y => ({ ...y, months: Object.values(y.months) }));
        const stats = await db.get(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_reported)::int AS reported,
            COUNT(*) FILTER (WHERE salary_approved)::int AS approved,
            COUNT(*) FILTER (WHERE error_reported)::int AS errors
            FROM pressing_records pr WHERE 1=1 ${where}`, params);
        return { tree, total, stats: stats || { total: 0, reported: 0, approved: 0, errors: 0 } };
    });

    // ========== LIST ==========
    fastify.get('/api/pressing/records', { preHandler: [authenticate] }, async (req) => {
        const mgr = await isPressManager(req);
        const { year, month, presser_id, status, search } = req.query;
        let where = 'WHERE 1=1', params = [], idx = 1;
        if (!mgr && !['quan_ly','truong_phong'].includes(req.user.role)) { where += ` AND pr.presser_id=$${idx++}`; params.push(req.user.id); }
        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(pr.press_date,pr.created_at))=$${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(pr.press_date,pr.created_at))=$${idx++}`; params.push(Number(month)); }
        if (presser_id) { where += ` AND pr.presser_id=$${idx++}`; params.push(Number(presser_id)); }
        if (status === 'reported') where += ` AND pr.is_reported=true`;
        else if (status === 'approved') where += ` AND pr.salary_approved=true`;
        else if (status === 'error') where += ` AND pr.error_reported=true`;
        if (search) { where += ` AND (pr.product_name ILIKE $${idx} OR pr.cskh_name ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        const records = await db.all(`
            SELECT pr.*, u.full_name AS presser_name, u_rpt.full_name AS reported_by_name,
                   u_sal.full_name AS salary_by_name, o.order_code,
                   lh.details AS last_update_detail, lh.performed_at AS last_update_at, lhu.full_name AS last_update_by
            FROM pressing_records pr LEFT JOIN users u ON pr.presser_id=u.id
            LEFT JOIN users u_rpt ON pr.reported_by=u_rpt.id LEFT JOIN users u_sal ON pr.salary_approved_by=u_sal.id
            LEFT JOIN dht_orders o ON pr.dht_order_id=o.id
            LEFT JOIN LATERAL (SELECT h.details, h.performed_at, h.performed_by FROM pressing_history h WHERE h.pressing_id=pr.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY pr.press_date DESC NULLS LAST, pr.created_at DESC`, params);
        return { records };
    });

    // ========== CREATE ==========
    fastify.post('/api/pressing/records', { preHandler: [authenticate] }, async (req) => {
        const b = req.body || {}, now = vnNow();
        const r = await db.get(`INSERT INTO pressing_records (dht_order_id,press_date,presser_id,product_name,cskh_name,
            order_quantity,press_quantity,press_salary,pos_chest_arm,pos_back_belly,pos_protective,pos_packaging,pos_other,
            press_images,notes,created_by,created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
            [b.dht_order_id||null, b.press_date||null, b.presser_id||null, b.product_name||null, b.cskh_name||null,
             Number(b.order_quantity)||0, Number(b.press_quantity)||0, Number(b.press_salary)||0,
             Number(b.pos_chest_arm)||0, Number(b.pos_back_belly)||0, Number(b.pos_protective)||0,
             Number(b.pos_packaging)||0, b.pos_other||null, b.press_images||'[]', b.notes||null, req.user.id, now]);
        await db.run(`INSERT INTO pressing_history (pressing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [r.id, 'create', 'Tạo đơn ép mới', req.user.id, now]);
        return { success: true, id: r.id };
    });

    // ========== TOGGLE ==========
    fastify.post('/api/pressing/toggle/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { action } = req.body || {}, now = vnNow();
        const rec = await db.get('SELECT * FROM pressing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        let detail = '';
        if (action === 'report') {
            await db.run(`UPDATE pressing_records SET is_reported=true, reported_at=$1, reported_by=$2, updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            detail = '🔥 Báo cáo ép';
        } else if (action === 'undo_report') {
            await db.run(`UPDATE pressing_records SET is_reported=false, reported_at=NULL, reported_by=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '↩️ Hoàn tác báo cáo';
        } else if (action === 'approve_salary') {
            if (!(await isPressManager(req))) return reply.code(403).send({ error: 'Chỉ QLX/GĐ' });
            await db.run(`UPDATE pressing_records SET salary_approved=true, salary_approved_at=$1, salary_approved_by=$2, updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            detail = '💰 Duyệt lương ép';
        } else if (action === 'undo_salary') {
            if (!(await isPressManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
            await db.run(`UPDATE pressing_records SET salary_approved=false, salary_approved_at=NULL, salary_approved_by=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '↩️ Hoàn tác duyệt lương';
        } else if (action === 'report_error') {
            await db.run(`UPDATE pressing_records SET error_reported=true, error_order_id=$1, updated_at=$2 WHERE id=$3`, [req.body.error_order_id||null, now, id]);
            detail = '⚠️ Báo lỗi nội bộ';
        } else { return reply.code(400).send({ error: 'Action không hợp lệ' }); }
        await db.run(`INSERT INTO pressing_history (pressing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, action, detail, req.user.id, now]);
        return { success: true };
    });

    // ========== UPDATE ==========
    fastify.put('/api/pressing/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), b = req.body || {}, now = vnNow();
        const rec = await db.get('SELECT * FROM pressing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        await db.run(`UPDATE pressing_records SET press_date=$1,presser_id=$2,product_name=$3,cskh_name=$4,
            order_quantity=$5,press_quantity=$6,press_salary=$7,pos_chest_arm=$8,pos_back_belly=$9,
            pos_protective=$10,pos_packaging=$11,pos_other=$12,press_images=$13,notes=$14,updated_at=$15 WHERE id=$16`,
            [b.press_date!==undefined?b.press_date:rec.press_date, b.presser_id!==undefined?b.presser_id:rec.presser_id,
             b.product_name!==undefined?b.product_name:rec.product_name, b.cskh_name!==undefined?b.cskh_name:rec.cskh_name,
             b.order_quantity!==undefined?Number(b.order_quantity):rec.order_quantity,
             b.press_quantity!==undefined?Number(b.press_quantity):rec.press_quantity,
             b.press_salary!==undefined?Number(b.press_salary):Number(rec.press_salary),
             b.pos_chest_arm!==undefined?Number(b.pos_chest_arm):rec.pos_chest_arm,
             b.pos_back_belly!==undefined?Number(b.pos_back_belly):rec.pos_back_belly,
             b.pos_protective!==undefined?Number(b.pos_protective):rec.pos_protective,
             b.pos_packaging!==undefined?Number(b.pos_packaging):rec.pos_packaging,
             b.pos_other!==undefined?b.pos_other:rec.pos_other,
             b.press_images!==undefined?b.press_images:rec.press_images,
             b.notes!==undefined?b.notes:rec.notes, now, id]);
        await db.run(`INSERT INTO pressing_history (pressing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật thông tin ép', req.user.id, now]);
        return { success: true };
    });

    // ========== INLINE FIELD ==========
    fastify.patch('/api/pressing/records/:id/field', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { field, value } = req.body || {}, now = vnNow();
        const ALLOWED = ['press_date','presser_id','product_name','cskh_name','order_quantity','press_quantity',
            'press_salary','pos_chest_arm','pos_back_belly','pos_protective','pos_packaging','pos_other','notes'];
        if (!ALLOWED.includes(field)) return reply.code(400).send({ error: 'Trường không hợp lệ' });
        const numF = ['presser_id','order_quantity','press_quantity','press_salary','pos_chest_arm','pos_back_belly','pos_protective','pos_packaging'];
        const fv = numF.includes(field) ? (Number(value)||0) : (value||null);
        await db.run(`UPDATE pressing_records SET ${field}=$1, updated_at=$2 WHERE id=$3`, [fv, now, id]);
        await db.run(`INSERT INTO pressing_history (pressing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'inline_update', `${field}: ${value}`, req.user.id, now]);
        return { success: true };
    });

    // ========== UPLOAD IMAGES ==========
    fastify.post('/api/pressing/records/:id/images', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), now = vnNow();
        const rec = await db.get('SELECT press_images FROM pressing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        const parts = await req.parts();
        let images = []; try { images = JSON.parse(rec.press_images || '[]'); } catch(e) { images = []; }
        for await (const part of parts) {
            if (part.file) {
                const ext = path.extname(part.filename || '.jpg');
                const fname = `press_${id}_${Date.now()}${ext}`;
                const dest = path.join(uploadsDir, fname);
                const chunks = []; for await (const chunk of part.file) chunks.push(chunk);
                fs.writeFileSync(dest, Buffer.concat(chunks));
                images.push(`/uploads/pressing/${fname}`);
            }
        }
        await db.run(`UPDATE pressing_records SET press_images=$1, updated_at=$2 WHERE id=$3`, [JSON.stringify(images), now, id]);
        await db.run(`INSERT INTO pressing_history (pressing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'upload_image', `Upload ${images.length} ảnh`, req.user.id, now]);
        return { success: true, images };
    });

    // ========== DELETE ==========
    fastify.delete('/api/pressing/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isPressManager(req))) return reply.code(403).send({ error: 'Chỉ QLX/GĐ' });
        await db.run('DELETE FROM pressing_records WHERE id=$1', [Number(req.params.id)]);
        return { success: true };
    });

    // ========== HISTORY ==========
    fastify.get('/api/pressing/history/:id', { preHandler: [authenticate] }, async (req) => {
        return { history: await db.all(`SELECT h.*, u.full_name AS performer_name FROM pressing_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.pressing_id=$1 ORDER BY h.performed_at DESC LIMIT 50`, [Number(req.params.id)]) };
    });

    // ========== STAFF ==========
    fastify.get('/api/pressing/staff', { preHandler: [authenticate] }, async () => {
        return { staff: await db.all(`SELECT u.id, u.full_name, u.username, d.name AS dept_name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.status='active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien') ORDER BY u.full_name`) };
    });
};
