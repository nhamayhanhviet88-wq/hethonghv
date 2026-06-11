// ========== CẮT CHỈ & HOÀN THIỆN — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');
const path = require('path');
const fs = require('fs');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try { await db.exec(`CREATE TABLE IF NOT EXISTS finishing_records (
        id SERIAL PRIMARY KEY, dht_order_id INTEGER,
        is_completed BOOLEAN DEFAULT false, completed_at TIMESTAMPTZ, completed_by INTEGER REFERENCES users(id),
        error_reported BOOLEAN DEFAULT false, error_order_id INTEGER,
        expected_date DATE, done_date DATE,
        product_name TEXT, cskh_name TEXT, quantity INTEGER DEFAULT 0,
        finisher_id INTEGER REFERENCES users(id), sewer_name TEXT,
        finish_images TEXT DEFAULT '[]', shipping_standard TEXT DEFAULT 'chuan',
        notes TEXT, created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_fr_finisher ON finishing_records(finisher_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_fr_expected ON finishing_records(expected_date)`);
    } catch(e) { console.error('[BPHT] records:', e.message); }

    try {
        await db.exec(`ALTER TABLE finishing_records ADD COLUMN IF NOT EXISTS sewing_record_id INTEGER REFERENCES sewing_records(id) ON DELETE CASCADE`);
    } catch(e) { console.error('[BPHT] migration sewing_record_id:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS finishing_checklist_templates (
            id SERIAL PRIMARY KEY,
            type VARCHAR(20) DEFAULT 'yes_no',
            content TEXT NOT NULL,
            sort_order INT DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS finishing_checklist_answers (
            id SERIAL PRIMARY KEY,
            finishing_record_id INTEGER NOT NULL REFERENCES finishing_records(id) ON DELETE CASCADE,
            template_id INTEGER NOT NULL REFERENCES finishing_checklist_templates(id) ON DELETE CASCADE,
            answer_value TEXT,
            answered_by INTEGER REFERENCES users(id),
            answered_at TIMESTAMPTZ,
            UNIQUE(finishing_record_id, template_id)
        )`);
    } catch(e) { console.error('[BPHT] checklist tables:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS finishing_history (
        id SERIAL PRIMARY KEY, finishing_id INTEGER NOT NULL REFERENCES finishing_records(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_fh_fid ON finishing_history(finishing_id)`);
    } catch(e) { console.error('[BPHT] history:', e.message); }

    // Ensure uploads dir
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'finishing');
    try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch(e) {}

    // ========== HELPERS ==========
    const MGMT = ['giam_doc', 'quan_ly_cap_cao'];
    async function isFinishManager(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) { const n = d.name.toLowerCase(); if (n.includes('qlx') || n.includes('hoàn thiện') || n.includes('hoan thien') || n.includes('quản lý xưởng')) return true; }
        return false;
    }

    // ========== TREE ==========
    fastify.get('/api/finishing/tree', { preHandler: [authenticate] }, async (req) => {
        const mgr = await isFinishManager(req);
        let where = '', params = [];
        if (!mgr && !['quan_ly','truong_phong'].includes(req.user.role)) { where = ' AND fr.finisher_id=$1'; params.push(req.user.id); }
        const rows = await db.all(`
            SELECT EXTRACT(YEAR FROM COALESCE(fr.expected_date,fr.created_at))::int AS year,
                   EXTRACT(MONTH FROM COALESCE(fr.expected_date,fr.created_at))::int AS month,
                   fr.finisher_id, u.full_name AS finisher_name, COUNT(*)::int AS count
            FROM finishing_records fr LEFT JOIN users u ON fr.finisher_id=u.id
            WHERE 1=1 ${where} GROUP BY year,month,fr.finisher_id,u.full_name
            ORDER BY year DESC, month DESC, u.full_name`, params);
        const total = rows.reduce((s,r) => s+r.count, 0);
        const yearMap = {};
        for (const r of rows) {
            if (!yearMap[r.year]) yearMap[r.year] = { year: r.year, count: 0, months: {} };
            if (!yearMap[r.year].months[r.month]) yearMap[r.year].months[r.month] = { month: r.month, count: 0, finishers: [] };
            const mo = yearMap[r.year].months[r.month];
            mo.finishers.push({ id: r.finisher_id, name: r.finisher_name || 'Chưa phân công', count: r.count });
            mo.count += r.count; yearMap[r.year].count += r.count;
        }
        const tree = Object.values(yearMap).map(y => ({ ...y, months: Object.values(y.months) }));
        const stats = await db.get(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_completed AND done_date IS NULL)::int AS in_progress,
            COUNT(*) FILTER (WHERE done_date IS NOT NULL)::int AS done,
            COUNT(*) FILTER (WHERE error_reported)::int AS errors
            FROM finishing_records fr WHERE 1=1 ${where}`, params);
        return { tree, total, stats: stats || { total: 0, in_progress: 0, done: 0, errors: 0 } };
    });

    // ========== LIST ==========
    fastify.get('/api/finishing/records', { preHandler: [authenticate] }, async (req) => {
        const mgr = await isFinishManager(req);
        const { year, month, finisher_id, status, search } = req.query;
        let where = 'WHERE 1=1', params = [], idx = 1;
        if (!mgr && !['quan_ly','truong_phong'].includes(req.user.role)) { where += ` AND fr.finisher_id=$${idx++}`; params.push(req.user.id); }
        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(fr.expected_date,fr.created_at))=$${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(fr.expected_date,fr.created_at))=$${idx++}`; params.push(Number(month)); }
        if (finisher_id) { where += ` AND fr.finisher_id=$${idx++}`; params.push(Number(finisher_id)); }
        if (status === 'progress') where += ` AND fr.is_completed=true AND fr.done_date IS NULL`;
        else if (status === 'done') where += ` AND fr.done_date IS NOT NULL`;
        else if (status === 'error') where += ` AND fr.error_reported=true`;
        if (search) { where += ` AND (fr.product_name ILIKE $${idx} OR fr.cskh_name ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        const records = await db.all(`
            SELECT fr.*, u.full_name AS finisher_name, u_c.full_name AS completed_by_name, o.order_code,
                   lh.details AS last_update_detail, lh.performed_at AS last_update_at, lhu.full_name AS last_update_by
            FROM finishing_records fr LEFT JOIN users u ON fr.finisher_id=u.id
            LEFT JOIN users u_c ON fr.completed_by=u_c.id LEFT JOIN dht_orders o ON fr.dht_order_id=o.id
            LEFT JOIN LATERAL (SELECT h.details, h.performed_at, h.performed_by FROM finishing_history h WHERE h.finishing_id=fr.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY fr.expected_date DESC NULLS LAST, fr.created_at DESC`, params);
        return { records };
    });

    // ========== CREATE ==========
    fastify.post('/api/finishing/records', { preHandler: [authenticate] }, async (req) => {
        const b = req.body || {}, now = vnNow();
        const r = await db.get(`INSERT INTO finishing_records (dht_order_id,expected_date,done_date,product_name,cskh_name,quantity,
            finisher_id,sewer_name,finish_images,shipping_standard,notes,created_by,created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
            [b.dht_order_id||null, b.expected_date||null, b.done_date||null, b.product_name||null, b.cskh_name||null,
             Number(b.quantity)||0, b.finisher_id||null, b.sewer_name||null, b.finish_images||'[]',
             b.shipping_standard||'chuan', b.notes||null, req.user.id, now]);
        await db.run(`INSERT INTO finishing_history (finishing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [r.id, 'create', 'Tạo đơn hoàn thiện mới', req.user.id, now]);
        return { success: true, id: r.id };
    });

    // ========== TOGGLE ==========
    fastify.post('/api/finishing/toggle/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { action } = req.body || {}, now = vnNow();
        const rec = await db.get('SELECT * FROM finishing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        let detail = '';
        if (action === 'complete') {
            await db.run(`UPDATE finishing_records SET is_completed=true, completed_at=$1, completed_by=$2, done_date=COALESCE(done_date,CURRENT_DATE), updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            detail = '✅ Báo cáo hoàn thành';
        } else if (action === 'undo_complete') {
            await db.run(`UPDATE finishing_records SET is_completed=false, completed_at=NULL, completed_by=NULL, done_date=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '↩️ Hoàn tác hoàn thành';
        } else if (action === 'report_error') {
            await db.run(`UPDATE finishing_records SET error_reported=true, error_order_id=$1, updated_at=$2 WHERE id=$3`, [req.body.error_order_id||null, now, id]);
            detail = '⚠️ Báo lỗi nội bộ';
        } else { return reply.code(400).send({ error: 'Action không hợp lệ' }); }
        await db.run(`INSERT INTO finishing_history (finishing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, action, detail, req.user.id, now]);
        return { success: true };
    });

    // ========== UPDATE ==========
    fastify.put('/api/finishing/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), b = req.body || {}, now = vnNow();
        const rec = await db.get('SELECT * FROM finishing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        await db.run(`UPDATE finishing_records SET expected_date=$1,done_date=$2,product_name=$3,cskh_name=$4,quantity=$5,
            finisher_id=$6,sewer_name=$7,finish_images=$8,shipping_standard=$9,notes=$10,updated_at=$11 WHERE id=$12`,
            [b.expected_date!==undefined?b.expected_date:rec.expected_date, b.done_date!==undefined?b.done_date:rec.done_date,
             b.product_name!==undefined?b.product_name:rec.product_name, b.cskh_name!==undefined?b.cskh_name:rec.cskh_name,
             b.quantity!==undefined?Number(b.quantity):rec.quantity, b.finisher_id!==undefined?b.finisher_id:rec.finisher_id,
             b.sewer_name!==undefined?b.sewer_name:rec.sewer_name, b.finish_images!==undefined?b.finish_images:rec.finish_images,
             b.shipping_standard!==undefined?b.shipping_standard:rec.shipping_standard,
             b.notes!==undefined?b.notes:rec.notes, now, id]);
        await db.run(`INSERT INTO finishing_history (finishing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật thông tin hoàn thiện', req.user.id, now]);
        return { success: true };
    });

    // ========== INLINE FIELD ==========
    fastify.patch('/api/finishing/records/:id/field', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { field, value } = req.body || {}, now = vnNow();
        const ALLOWED = ['expected_date','done_date','product_name','cskh_name','quantity','finisher_id','sewer_name','shipping_standard','notes'];
        if (!ALLOWED.includes(field)) return reply.code(400).send({ error: 'Trường không hợp lệ' });
        const numF = ['quantity','finisher_id'];
        const fv = numF.includes(field) ? (Number(value)||0) : (value||null);
        await db.run(`UPDATE finishing_records SET ${field}=$1, updated_at=$2 WHERE id=$3`, [fv, now, id]);
        await db.run(`INSERT INTO finishing_history (finishing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'inline_update', `${field}: ${value}`, req.user.id, now]);
        return { success: true };
    });

    // ========== UPLOAD IMAGES ==========
    fastify.post('/api/finishing/records/:id/images', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), now = vnNow();
        const rec = await db.get('SELECT finish_images FROM finishing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        const parts = await req.parts();
        let images = []; try { images = JSON.parse(rec.finish_images || '[]'); } catch(e) { images = []; }
        for await (const part of parts) {
            if (part.file) {
                const ext = path.extname(part.filename || '.jpg');
                const fname = `fin_${id}_${Date.now()}${ext}`;
                const dest = path.join(uploadsDir, fname);
                const chunks = []; for await (const chunk of part.file) chunks.push(chunk);
                fs.writeFileSync(dest, Buffer.concat(chunks));
                images.push(`/uploads/finishing/${fname}`);
            }
        }
        await db.run(`UPDATE finishing_records SET finish_images=$1, updated_at=$2 WHERE id=$3`, [JSON.stringify(images), now, id]);
        await db.run(`INSERT INTO finishing_history (finishing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'upload_image', `Upload ${images.length} ảnh`, req.user.id, now]);
        return { success: true, images };
    });

    // ========== DELETE ==========
    fastify.delete('/api/finishing/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isFinishManager(req))) return reply.code(403).send({ error: 'Chỉ QLX/GĐ' });
        await db.run('DELETE FROM finishing_records WHERE id=$1', [Number(req.params.id)]);
        return { success: true };
    });

    // ========== HISTORY ==========
    fastify.get('/api/finishing/history/:id', { preHandler: [authenticate] }, async (req) => {
        return { history: await db.all(`SELECT h.*, u.full_name AS performer_name FROM finishing_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.finishing_id=$1 ORDER BY h.performed_at DESC LIMIT 50`, [Number(req.params.id)]) };
    });

    // ========== STAFF ==========
    fastify.get('/api/finishing/staff', { preHandler: [authenticate] }, async () => {
        return { staff: await db.all(`SELECT u.id, u.full_name, u.username, d.name AS dept_name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.status='active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien') ORDER BY u.full_name`) };
    });

    // ========== FINISHING CHECKLIST TEMPLATES & ANSWERS ==========
    // 1. GET active templates
    fastify.get('/api/finishing/checklist/templates', { preHandler: [authenticate] }, async (req) => {
        const templates = await db.all(`SELECT * FROM finishing_checklist_templates WHERE is_active = true ORDER BY sort_order, id`);
        return { templates };
    });

    // 2. GET all templates for administration
    fastify.get('/api/finishing/checklist/templates/all', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền thiết lập' });
        const templates = await db.all(`SELECT t.*, u.full_name AS created_by_name FROM finishing_checklist_templates t LEFT JOIN users u ON t.created_by = u.id ORDER BY t.sort_order, t.id`);
        return { templates };
    });

    // 3. POST create template
    fastify.post('/api/finishing/checklist/templates', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền thiết lập' });
        const { type, content, sort_order } = req.body || {};
        if (!content || !content.trim()) return reply.code(400).send({ error: 'Nội dung không được trống' });
        const row = await db.get(`INSERT INTO finishing_checklist_templates (type, content, sort_order, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
            [type || 'yes_no', content.trim(), sort_order || 0, req.user.id]);
        return { success: true, template: row };
    });

    // 4. PUT update template
    fastify.put('/api/finishing/checklist/templates/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền thiết lập' });
        const { content, sort_order, is_active, type } = req.body || {};
        await db.run(`UPDATE finishing_checklist_templates SET content = COALESCE($1, content), sort_order = COALESCE($2, sort_order), is_active = COALESCE($3, is_active), type = COALESCE($4, type) WHERE id = $5`,
            [content, sort_order, is_active, type, req.params.id]);
        return { success: true };
    });

    // 5. DELETE template
    fastify.delete('/api/finishing/checklist/templates/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền thiết lập' });
        await db.run(`DELETE FROM finishing_checklist_answers WHERE template_id = $1`, [req.params.id]);
        await db.run(`DELETE FROM finishing_checklist_templates WHERE id = $1`, [req.params.id]);
        return { success: true };
    });

    // 6. GET answers and templates for a finishing record
    fastify.get('/api/finishing/checklist/answers/:finishingRecordId', { preHandler: [authenticate] }, async (req) => {
        const finishingRecordId = parseInt(req.params.finishingRecordId);
        const templates = await db.all(`SELECT * FROM finishing_checklist_templates WHERE is_active = true ORDER BY sort_order, id`);
        const answers = await db.all(`SELECT a.*, u.full_name AS answered_by_name FROM finishing_checklist_answers a LEFT JOIN users u ON a.answered_by = u.id WHERE a.finishing_record_id = $1`, [finishingRecordId]);
        return { templates, answers };
    });

    // 7. POST submit answers for a finishing record
    fastify.post('/api/finishing/checklist/answers/:finishingRecordId', { preHandler: [authenticate] }, async (req) => {
        const finishingRecordId = parseInt(req.params.finishingRecordId);
        const { answers } = req.body || {};
        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        if (Array.isArray(answers)) {
            for (const ans of answers) {
                const templateId = parseInt(ans.template_id);
                const val = ans.answer_value;
                
                await db.run(`
                    INSERT INTO finishing_checklist_answers (finishing_record_id, template_id, answer_value, answered_by, answered_at)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT(finishing_record_id, template_id)
                    DO UPDATE SET answer_value = EXCLUDED.answer_value, answered_by = EXCLUDED.answered_by, answered_at = EXCLUDED.answered_at
                `, [finishingRecordId, templateId, val, req.user.id, now]);
            }
        }
        return { success: true };
    });

    // 8. POST send Telegram notification for finishing checklist
    fastify.post('/api/finishing/checklist/notify/:finishingRecordId', { preHandler: [authenticate] }, async (req, reply) => {
        const finishingRecordId = parseInt(req.params.finishingRecordId);
        
        // Fetch finishing record with order, product details
        const rec = await db.get(`
            SELECT fr.*, o.order_code, u.full_name AS finisher_name, uc.full_name AS completed_by_name
            FROM finishing_records fr
            LEFT JOIN dht_orders o ON fr.dht_order_id = o.id
            LEFT JOIN users u ON fr.finisher_id = u.id
            LEFT JOIN users uc ON fr.completed_by = uc.id
            WHERE fr.id = $1
        `, [finishingRecordId]);

        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy bản ghi hoàn thiện' });

        // Fetch answers and active checklist templates
        const qa = await db.all(`
            SELECT a.answer_value, t.content, t.type
            FROM finishing_checklist_answers a
            JOIN finishing_checklist_templates t ON a.template_id = t.id
            WHERE a.finishing_record_id = $1 AND t.is_active = true
            ORDER BY t.sort_order, t.id
        `, [finishingRecordId]);

        let msg = `✅ <b>BÁO CÁO CẮT CHỈ & HOÀN THIỆN</b>\n`;
        msg += `━━━━━━━━━━━━━━━━━\n`;
        msg += `📋 <b>Mã đơn:</b> ${rec.order_code || '—'}\n`;
        msg += `👕 <b>Sản phẩm:</b> ${rec.product_name || '—'}\n`;
        msg += `👤 <b>Thợ may:</b> ${rec.sewer_name || '—'}\n`;
        msg += `👤 <b>Nhân viên HT:</b> ${rec.finisher_name || '—'}\n`;
        msg += `📦 <b>Số lượng:</b> ${rec.quantity || 0}\n`;
        msg += `🚚 <b>Tiêu chuẩn gửi:</b> ${rec.shipping_standard === 'gap' ? '🔴 GẤP' : (rec.shipping_standard === 'gui' ? '📦 GỬI' : '✅ CHUẨN')}\n`;
        if (rec.notes) {
            msg += `📝 <b>Ghi chú:</b> ${rec.notes}\n`;
        }
        
        if (qa.length > 0) {
            msg += `\n📋 <b>KẾT QUẢ CHECKLIST HOÀN THIỆN:</b>\n`;
            qa.forEach(ans => {
                let valLabel = ans.answer_value;
                if (ans.type === 'yes_no') {
                    valLabel = ans.answer_value === 'yes' ? 'Có' : 'Không';
                } else if (ans.type === 'percentage') {
                    valLabel = ans.answer_value + '%';
                }
                msg += `• ${ans.content}: <b>${valLabel}</b>\n`;
            });
        }
        msg += `━━━━━━━━━━━━━━━━━\n`;
        msg += `👤 <b>Người báo cáo:</b> ${rec.completed_by_name || req.user.full_name}\n`;

        // Send to Telegram
        const { sendTelegramPhoto, sendTelegramMessage } = require('../utils/telegram');
        const tgConfigRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_global_hoan_thanh_hoan_thien'");
        const chatId = tgConfigRow?.value?.trim();

        if (chatId) {
            let photoSent = false;
            try {
                const images = JSON.parse(rec.finish_images || '[]');
                if (Array.isArray(images) && images.length > 0) {
                    const firstImage = images[0];
                    if (firstImage.startsWith('/uploads/')) {
                        const absolutePath = path.join(__dirname, '..', firstImage);
                        if (fs.existsSync(absolutePath)) {
                            photoSent = await sendTelegramPhoto(chatId, absolutePath, msg);
                        }
                    }
                }
            } catch(e) {
                console.error('[Finishing Telegram] Error sending photo:', e);
            }
            
            if (!photoSent) {
                await sendTelegramMessage(chatId, msg);
            }
        }

        return { success: true };
    });
};
