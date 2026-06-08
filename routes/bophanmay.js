// ========== BỘ PHẬN MAY — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');
const path = require('path');
const fs = require('fs');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try { await db.exec(`CREATE TABLE IF NOT EXISTS sewing_contractors (
        id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT, notes TEXT,
        is_active BOOLEAN DEFAULT true, display_order INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW()
    )`); } catch(e) { console.error('[BPM] contractors:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS sewing_records (
        id SERIAL PRIMARY KEY, dht_order_id INTEGER,
        order_item_id INTEGER REFERENCES dht_order_items(id) ON DELETE CASCADE,
        sewing_team_id INTEGER REFERENCES departments(id),
        is_reported BOOLEAN DEFAULT false, reported_at TIMESTAMPTZ, reported_by INTEGER REFERENCES users(id),
        error_reported BOOLEAN DEFAULT false, error_order_id INTEGER,
        salary_approved BOOLEAN DEFAULT false, salary_approved_at TIMESTAMPTZ, salary_approved_by INTEGER REFERENCES users(id),
        salary_note TEXT,
        expected_date DATE, handover_date DATE, done_date TIMESTAMPTZ,
        sewer_id INTEGER REFERENCES users(id), contractor_id INTEGER,
        product_name TEXT, quantity INTEGER DEFAULT 0,
        base_price NUMERIC DEFAULT 0, checked_price NUMERIC DEFAULT 0, salary NUMERIC DEFAULT 0,
        sewing_details TEXT, inventory_notes TEXT, shared_sewing TEXT,
        finish_images TEXT DEFAULT '[]', notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sr_sewer ON sewing_records(sewer_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sr_contractor ON sewing_records(contractor_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sr_handover ON sewing_records(handover_date)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sr_order_item ON sewing_records(order_item_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sr_sewing_team ON sewing_records(sewing_team_id)`);
    try {
        await db.exec(`ALTER TABLE sewing_records ADD COLUMN IF NOT EXISTS salary_note TEXT`);
    } catch(err) {
        console.error('[BPM] Migration error for salary_note:', err.message);
    }
    } catch(e) { console.error('[BPM] records:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS sewing_history (
        id SERIAL PRIMARY KEY, sewing_id INTEGER NOT NULL REFERENCES sewing_records(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sh_sid ON sewing_history(sewing_id)`);
    } catch(e) { console.error('[BPM] history:', e.message); }

    // Ensure uploads dir
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'sewing');
    try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch(e) {}

    // ========== HELPERS ==========
    const MGMT = ['giam_doc', 'quan_ly_cap_cao'];
    async function isSewManager(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) { const n = d.name.toLowerCase(); if (n.includes('qlx') || n.includes('may') || n.includes('quản lý xưởng')) return true; }
        return false;
    }
    async function canApproveSalary(req) {
        if (req.user.role === 'giam_doc') return true;
        const u = await db.get(`SELECT username, role FROM users WHERE id=$1`, [req.user.id]);
        return u && u.role === 'quan_ly_cap_cao' && u.username === 'trinh';
    }
    function calcSalary(approved, qty, base, checked) {
        if (!approved) return 0;
        const q = Number(qty)||0, c = Number(checked)||0;
        return q * c;
    }

    // ========== CONTRACTORS CRUD ==========
    fastify.get('/api/sewing/contractors', { preHandler: [authenticate] }, async () => {
        return { contractors: await db.all(`SELECT * FROM sewing_contractors WHERE is_active=true ORDER BY display_order, name`) };
    });
    fastify.post('/api/sewing/contractors', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền tạo nhà gia công may' });
        const { name, phone, notes } = req.body || {};
        if (!name) return reply.code(400).send({ error: 'Tên bắt buộc' });
        const r = await db.get(`INSERT INTO sewing_contractors (name,phone,notes,created_by) VALUES ($1,$2,$3,$4) RETURNING id`, [name, phone||null, notes||null, req.user.id]);
        return { success: true, id: r.id };
    });
    fastify.put('/api/sewing/contractors/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền chỉnh sửa nhà gia công may' });
        const { name, phone, notes } = req.body || {};
        await db.run(`UPDATE sewing_contractors SET name=$1, phone=$2, notes=$3 WHERE id=$4`, [name, phone||null, notes||null, req.params.id]);
        return { success: true };
    });
    fastify.delete('/api/sewing/contractors/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa nhà gia công may' });
        await db.run(`UPDATE sewing_contractors SET is_active=false WHERE id=$1`, [req.params.id]);
        return { success: true };
    });

    // ========== TREE ==========
    fastify.get('/api/sewing/tree', { preHandler: [authenticate] }, async (req) => {
        const mgr = await isSewManager(req);
        let where = '', params = [];
        if (!mgr && !['quan_ly','truong_phong'].includes(req.user.role)) { 
            where = ' AND (sr.sewer_id=$1 OR sr.sewing_team_id IN (SELECT department_id FROM users WHERE id=$1))'; 
            params.push(req.user.id); 
        }
        
        const rows = await db.all(`
            SELECT EXTRACT(YEAR FROM COALESCE(sr.handover_date,sr.created_at))::int AS year,
                   sr.sewer_id, u.full_name AS sewer_name,
                   sr.sewing_team_id, dt.name AS sewing_team_name,
                   sr.contractor_id, c.name AS contractor_name,
                   CASE WHEN sr.done_date IS NOT NULL THEN 1 ELSE 0 END AS is_done,
                   CASE WHEN sr.done_date IS NOT NULL THEN EXTRACT(MONTH FROM COALESCE(sr.done_date,sr.handover_date,sr.created_at))::int ELSE NULL END AS done_month,
                   COUNT(*)::int AS count
            FROM sewing_records sr
            LEFT JOIN users u ON sr.sewer_id=u.id
            LEFT JOIN departments dt ON sr.sewing_team_id=dt.id
            LEFT JOIN sewing_contractors c ON sr.contractor_id=c.id
            WHERE 1=1 ${where}
            GROUP BY year, sr.sewer_id, u.full_name, sr.sewing_team_id, dt.name, sr.contractor_id, c.name, is_done, done_month
            ORDER BY year DESC, dt.name, u.full_name, c.name, done_month DESC`, params);

        const total = rows.reduce((s,r) => s+r.count, 0);
        const yearMap = {};
        for (const r of rows) {
            if (!yearMap[r.year]) yearMap[r.year] = { year: r.year, count: 0, sewers: {} };
            const isContractor = !!r.contractor_id;
            const isTeam = !!r.sewing_team_id;
            const key = isContractor ? `c_${r.contractor_id}` : (isTeam ? `t_${r.sewing_team_id}` : `s_${r.sewer_id || 0}`);
            
            if (!yearMap[r.year].sewers[key]) {
                yearMap[r.year].sewers[key] = {
                    id: isContractor ? r.contractor_id : (isTeam ? r.sewing_team_id : r.sewer_id),
                    is_contractor: isContractor,
                    is_team: isTeam,
                    name: isContractor ? (r.contractor_name || 'Gia công') : (isTeam ? r.sewing_team_name : (r.sewer_name || 'Chưa phân công')),
                    total: 0,
                    incomplete_count: 0,
                    months: {}
                };
            }
            
            const sewer = yearMap[r.year].sewers[key];
            sewer.total += r.count;
            yearMap[r.year].count += r.count;
            
            if (r.is_done === 1 && r.done_month !== null) {
                if (!sewer.months[r.done_month]) {
                    sewer.months[r.done_month] = { month: r.done_month, count: 0 };
                }
                sewer.months[r.done_month].count += r.count;
            } else {
                sewer.incomplete_count += r.count;
            }
        }
        
        const tree = Object.values(yearMap).map(y => ({
            year: y.year,
            count: y.count,
            sewers: Object.values(y.sewers).map(s => ({
                ...s,
                months: Object.values(s.months).sort((a,b) => b.month - a.month)
            }))
        })).sort((a,b) => b.year - a.year);

        const stats = await db.get(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_reported AND done_date IS NULL)::int AS in_progress,
            COUNT(*) FILTER (WHERE done_date IS NOT NULL)::int AS done,
            COUNT(*) FILTER (WHERE salary_approved)::int AS approved
            FROM sewing_records sr WHERE 1=1 ${where}`, params);
        return { tree, total, stats: stats || {total:0,in_progress:0,done:0,approved:0} };
    });

    // ========== LIST ==========
    fastify.get('/api/sewing/records', { preHandler: [authenticate] }, async (req) => {
        const mgr = await isSewManager(req);
        const { year, month, sewer_id, contractor_id, sewing_team_id, status, search } = req.query;
        let where = 'WHERE 1=1', params = [], idx = 1;
        if (!mgr && !['quan_ly','truong_phong'].includes(req.user.role)) { 
            where += ` AND (sr.sewer_id=$${idx} OR sr.sewing_team_id IN (SELECT department_id FROM users WHERE id=$${idx}))`; 
            params.push(req.user.id); 
            idx++;
        }
        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(sr.handover_date,sr.created_at))=$${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(sr.handover_date,sr.created_at))=$${idx++}`; params.push(Number(month)); }
        if (sewer_id) {
            if (sewer_id === 'none') {
                where += ` AND sr.sewer_id IS NULL AND sr.contractor_id IS NULL AND sr.sewing_team_id IS NULL`;
            } else {
                where += ` AND sr.sewer_id=$${idx++}`; params.push(Number(sewer_id));
            }
        }
        if (contractor_id) { where += ` AND sr.contractor_id=$${idx++}`; params.push(Number(contractor_id)); }
        if (sewing_team_id) { where += ` AND sr.sewing_team_id=$${idx++}`; params.push(Number(sewing_team_id)); }
        if (status==='progress') where += ` AND sr.is_reported=true AND sr.done_date IS NULL`;
        else if (status==='done') where += ` AND sr.done_date IS NOT NULL`;
        else if (status==='approved') where += ` AND sr.salary_approved=true`;
        else if (status==='incomplete') where += ` AND sr.done_date IS NULL`;
        if (search) { where += ` AND (sr.product_name ILIKE $${idx} OR o.order_code ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        const records = await db.all(`
            SELECT sr.*, COALESCE(dt.name, u.full_name) AS sewer_name, c.name AS contractor_name,
                   u_rpt.full_name AS reported_by_name, u_sal.full_name AS salary_by_name, o.order_code, o.shipping_priority,
                   o.shipping_date,
                   u_cskh.full_name AS cskh_name,
                   (SELECT product_name FROM cutting_records WHERE order_item_id = sr.order_item_id LIMIT 1) AS cut_product_name,
                   cc.name AS category_name,
                   oi.material_name, oi.color_name, oi.pattern_name, oi.sewing_techniques, oi.quantity AS order_qty,
                   ts.factory_price AS ts_factory_price, ts.processing_price AS ts_processing_price, ts.sewing_tech AS ts_sewing_tech,
                   lh.details AS last_update_detail, lh.performed_at AS last_update_at, lhu.full_name AS last_update_by
            FROM sewing_records sr 
            LEFT JOIN users u ON sr.sewer_id=u.id 
            LEFT JOIN departments dt ON sr.sewing_team_id=dt.id
            LEFT JOIN sewing_contractors c ON sr.contractor_id=c.id
            LEFT JOIN users u_rpt ON sr.reported_by=u_rpt.id LEFT JOIN users u_sal ON sr.salary_approved_by=u_sal.id
            LEFT JOIN dht_orders o ON sr.dht_order_id=o.id
            LEFT JOIN users u_cskh ON o.cskh_user_id=u_cskh.id
            LEFT JOIN dht_order_items oi ON sr.order_item_id = oi.id
            LEFT JOIN tsam_samples ts ON oi.pattern_name = ts.sample_code AND ts.is_active = true
            LEFT JOIN dht_products p ON p.name = TRIM(COALESCE(oi.product_name, oi.description)) AND p.is_active = true
            LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id AND cc.category = 'cutting_category'
            LEFT JOIN LATERAL (SELECT h.details, h.performed_at, h.performed_by FROM sewing_history h WHERE h.sewing_id=sr.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY sr.handover_date DESC NULLS LAST, sr.created_at DESC`, params);
        return { records };
    });

    // ========== CREATE ==========
    fastify.post('/api/sewing/records', { preHandler: [authenticate] }, async (req) => {
        const b = req.body||{}, now = vnNow();
        const sal = calcSalary(false, b.quantity, b.base_price, b.checked_price);
        const r = await db.get(`INSERT INTO sewing_records (dht_order_id,expected_date,handover_date,done_date,sewer_id,contractor_id,
            product_name,quantity,base_price,checked_price,salary,sewing_details,inventory_notes,shared_sewing,finish_images,notes,created_by,created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
            [b.dht_order_id||null, b.expected_date||null, b.handover_date||null, b.done_date||null,
             b.sewer_id||null, b.contractor_id||null, b.product_name||null, Number(b.quantity)||0,
             Number(b.base_price)||0, Number(b.checked_price)||0, sal,
             b.sewing_details||null, b.inventory_notes||null, b.shared_sewing||null,
             b.finish_images||'[]', b.notes||null, req.user.id, now]);
        await db.run(`INSERT INTO sewing_history (sewing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [r.id, 'create', 'Tạo đơn may mới', req.user.id, now]);
        return { success: true, id: r.id };
    });

    // ========== TOGGLE ==========
    fastify.post('/api/sewing/toggle/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { action } = req.body||{}, now = vnNow();
        const rec = await db.get('SELECT * FROM sewing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        let detail = '';
        if (action === 'report') {
            await db.run(`UPDATE sewing_records SET is_reported=true, reported_at=$1, reported_by=$2, updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            detail = '📋 Báo cáo may';
        } else if (action === 'undo_report') {
            await db.run(`UPDATE sewing_records SET is_reported=false, reported_at=NULL, reported_by=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '↩️ Hoàn tác báo cáo';
        } else if (action === 'approve_salary') {
            if (!(await canApproveSalary(req))) return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc Quản Lý Cấp Cao (trinh) mới có quyền tính lương!' });
            if (!rec.checked_price || Number(rec.checked_price) <= 0) {
                return reply.code(400).send({ error: 'Cần nhập Giá KTra trước khi tính lương!' });
            }
            const salary_note = req.body.salary_note || null;
            const sal = Number(rec.quantity || 0) * Number(rec.checked_price || 0);
            await db.run(`UPDATE sewing_records SET salary_approved=true, salary_approved_at=$1, salary_approved_by=$2, salary_note=$3, salary=$4, updated_at=$1 WHERE id=$5`, [now, req.user.id, salary_note, sal, id]);
            detail = '💰 Duyệt lương may' + (salary_note ? ': ' + salary_note : '');
        } else if (action === 'undo_salary') {
            if (!(await canApproveSalary(req))) return reply.code(403).send({ error: 'Không có quyền' });
            await db.run(`UPDATE sewing_records SET salary_approved=false, salary_approved_at=NULL, salary_approved_by=NULL, salary_note=NULL, salary=0, updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '↩️ Hoàn tác duyệt lương';
        } else if (action === 'report_error') {
            await db.run(`UPDATE sewing_records SET error_reported=true, error_order_id=$1, updated_at=$2 WHERE id=$3`, [req.body.error_order_id||null, now, id]);
            detail = '⚠️ Báo lỗi nội bộ';
        } else if (action === 'mark_done') {
            await db.run(`UPDATE sewing_records SET done_date=$1, is_reported=true, reported_at=COALESCE(reported_at,$1), updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '✅ May xong';
        } else if (action === 'undo_done') {
            await db.run(`UPDATE sewing_records SET done_date=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '↩️ Hoàn tác may xong';
        } else { return reply.code(400).send({ error: 'Action không hợp lệ' }); }
        await db.run(`INSERT INTO sewing_history (sewing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, action, detail, req.user.id, now]);
        return { success: true };
    });

    // ========== UPDATE ==========
    fastify.put('/api/sewing/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), b = req.body||{}, now = vnNow();
        const rec = await db.get('SELECT * FROM sewing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        const qty = b.quantity!==undefined ? Number(b.quantity)||0 : rec.quantity;
        const bp = b.base_price!==undefined ? Number(b.base_price)||0 : Number(rec.base_price)||0;
        const cp = b.checked_price!==undefined ? Number(b.checked_price)||0 : Number(rec.checked_price)||0;
        const sal = calcSalary(rec.salary_approved, qty, bp, cp);
        await db.run(`UPDATE sewing_records SET expected_date=$1,handover_date=$2,done_date=$3,sewer_id=$4,contractor_id=$5,
            product_name=$6,quantity=$7,base_price=$8,checked_price=$9,salary=$10,sewing_details=$11,
            inventory_notes=$12,shared_sewing=$13,finish_images=$14,notes=$15,updated_at=$16,sewing_team_id=$17 WHERE id=$18`,
            [b.expected_date!==undefined?b.expected_date:rec.expected_date, b.handover_date!==undefined?b.handover_date:rec.handover_date,
             b.done_date!==undefined?b.done_date:rec.done_date, b.sewer_id!==undefined?b.sewer_id:rec.sewer_id,
             b.contractor_id!==undefined?b.contractor_id:rec.contractor_id, b.product_name!==undefined?b.product_name:rec.product_name,
             qty, bp, cp, sal, b.sewing_details!==undefined?b.sewing_details:rec.sewing_details,
             b.inventory_notes!==undefined?b.inventory_notes:rec.inventory_notes,
             b.shared_sewing!==undefined?b.shared_sewing:rec.shared_sewing,
             b.finish_images!==undefined?b.finish_images:rec.finish_images,
             b.notes!==undefined?b.notes:rec.notes, now, b.sewing_team_id!==undefined?b.sewing_team_id:rec.sewing_team_id, id]);
        await db.run(`INSERT INTO sewing_history (sewing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật thông tin may', req.user.id, now]);
        return { success: true, salary: sal };
    });

    // ========== INLINE FIELD ==========
    fastify.patch('/api/sewing/records/:id/field', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { field, value } = req.body||{}, now = vnNow();
        const ALLOWED = ['expected_date','handover_date','done_date','sewer_id','contractor_id','sewing_team_id','product_name',
            'quantity','base_price','checked_price','sewing_details','inventory_notes','shared_sewing','notes'];
        if (!ALLOWED.includes(field)) return reply.code(400).send({ error: 'Trường không hợp lệ' });
        const numF = ['quantity','base_price','checked_price','sewer_id','contractor_id','sewing_team_id'];
        const fv = numF.includes(field) ? (Number(value)||0) : (value||null);
        await db.run(`UPDATE sewing_records SET ${field}=$1, updated_at=$2 WHERE id=$3`, [fv, now, id]);
        // Recalc salary if price/qty changed
        if (['quantity','base_price','checked_price'].includes(field)) {
            const rec = await db.get('SELECT salary_approved, quantity, base_price, checked_price FROM sewing_records WHERE id=$1', [id]);
            if (rec) { const sal = calcSalary(rec.salary_approved, rec.quantity, rec.base_price, rec.checked_price);
                await db.run(`UPDATE sewing_records SET salary=$1 WHERE id=$2`, [sal, id]); }
        }
        await db.run(`INSERT INTO sewing_history (sewing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'inline_update', `${field}: ${value}`, req.user.id, now]);
        return { success: true };
    });

    // ========== TEAMS ==========
    fastify.get('/api/sewing/teams', { preHandler: [authenticate] }, async () => {
        return { teams: await db.all(`SELECT id, name FROM departments WHERE parent_id = 14 OR id = 14 ORDER BY name`) };
    });

    // ========== UPLOAD IMAGES ==========
    fastify.post('/api/sewing/records/:id/images', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), now = vnNow();
        const rec = await db.get('SELECT finish_images FROM sewing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        const parts = await req.parts();
        let images = []; try { images = JSON.parse(rec.finish_images || '[]'); } catch(e) { images = []; }
        for await (const part of parts) {
            if (part.file) {
                const ext = path.extname(part.filename || '.jpg');
                const fname = `sew_${id}_${Date.now()}${ext}`;
                const dest = path.join(uploadsDir, fname);
                const chunks = []; for await (const chunk of part.file) chunks.push(chunk);
                fs.writeFileSync(dest, Buffer.concat(chunks));
                images.push(`/uploads/sewing/${fname}`);
            }
        }
        await db.run(`UPDATE sewing_records SET finish_images=$1, updated_at=$2 WHERE id=$3`, [JSON.stringify(images), now, id]);
        await db.run(`INSERT INTO sewing_history (sewing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'upload_image', `Upload ${images.length} ảnh`, req.user.id, now]);
        return { success: true, images };
    });

    // ========== DELETE ==========
    fastify.delete('/api/sewing/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSewManager(req))) return reply.code(403).send({ error: 'Chỉ QLX/GĐ' });
        await db.run('DELETE FROM sewing_records WHERE id=$1', [Number(req.params.id)]);
        return { success: true };
    });

    // ========== HISTORY ==========
    fastify.get('/api/sewing/history/:id', { preHandler: [authenticate] }, async (req) => {
        return { history: await db.all(`SELECT h.*, u.full_name AS performer_name FROM sewing_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.sewing_id=$1 ORDER BY h.performed_at DESC LIMIT 50`, [Number(req.params.id)]) };
    });

    // ========== STAFF ==========
    fastify.get('/api/sewing/staff', { preHandler: [authenticate] }, async () => {
        return { staff: await db.all(`SELECT u.id, u.full_name, u.username, d.name AS dept_name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.status='active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien') ORDER BY u.full_name`) };
    });
};
