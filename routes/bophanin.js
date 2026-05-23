// ========== BỘ PHẬN IN — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS printing_contractors (
            id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT, notes TEXT,
            is_active BOOLEAN DEFAULT true, display_order INTEGER DEFAULT 0,
            created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
    } catch(e) { console.error('[BPI] contractors:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS printing_records (
            id SERIAL PRIMARY KEY, dht_order_id INTEGER,
            is_test_print BOOLEAN DEFAULT false, test_print_at TIMESTAMPTZ, test_print_by INTEGER REFERENCES users(id),
            is_print_done BOOLEAN DEFAULT false, print_done_at TIMESTAMPTZ, print_done_by INTEGER REFERENCES users(id),
            error_reported BOOLEAN DEFAULT false, error_order_id INTEGER,
            print_date DATE, printer_id INTEGER REFERENCES users(id),
            contractor_id INTEGER, product_name TEXT, cskh_name TEXT,
            order_quantity INTEGER DEFAULT 0, print_meters NUMERIC DEFAULT 0,
            roll_start_qty INTEGER DEFAULT 0, roll_end_qty INTEGER DEFAULT 0,
            current_roll TEXT, print_field TEXT, shared_process TEXT, notes TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_pr_date ON printing_records(print_date)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_pr_printer ON printing_records(printer_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_pr_contractor ON printing_records(contractor_id)`);
    } catch(e) { console.error('[BPI] records:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS printing_history (
            id SERIAL PRIMARY KEY, printing_id INTEGER NOT NULL REFERENCES printing_records(id) ON DELETE CASCADE,
            action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
            performed_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_ph_pid ON printing_history(printing_id)`);
    } catch(e) { console.error('[BPI] history:', e.message); }

    // ========== HELPERS ==========
    const MGMT_ROLES = ['giam_doc', 'quan_ly_cap_cao'];
    async function isPrintManager(req) {
        if (MGMT_ROLES.includes(req.user.role)) return true;
        const dept = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (dept && dept.name) { const n = dept.name.toLowerCase(); if (n.includes('qlx') || n.includes('in') || n.includes('quản lý xưởng')) return true; }
        return false;
    }

    // ========== CONTRACTORS CRUD ==========
    fastify.get('/api/printing/contractors', { preHandler: [authenticate] }, async (req) => {
        const rows = await db.all(`SELECT * FROM printing_contractors WHERE is_active=true ORDER BY display_order, name`);
        return { contractors: rows };
    });

    fastify.post('/api/printing/contractors', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isPrintManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
        const { name, phone, notes } = req.body || {};
        if (!name) return reply.code(400).send({ error: 'Tên nhà gia công là bắt buộc' });
        const r = await db.get(`INSERT INTO printing_contractors (name, phone, notes, created_by) VALUES ($1,$2,$3,$4) RETURNING id`, [name, phone || null, notes || null, req.user.id]);
        return { success: true, id: r.id };
    });

    fastify.put('/api/printing/contractors/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isPrintManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
        const { name, phone, notes } = req.body || {};
        await db.run(`UPDATE printing_contractors SET name=$1, phone=$2, notes=$3 WHERE id=$4`, [name, phone || null, notes || null, req.params.id]);
        return { success: true };
    });

    fastify.delete('/api/printing/contractors/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isPrintManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
        await db.run(`UPDATE printing_contractors SET is_active=false WHERE id=$1`, [req.params.id]);
        return { success: true };
    });

    // ========== TREE ==========
    fastify.get('/api/printing/tree', { preHandler: [authenticate] }, async (req) => {
        const isManager = await isPrintManager(req);
        let where = '', params = [];
        if (!isManager && !['quan_ly', 'truong_phong'].includes(req.user.role)) {
            where = ' AND pr.printer_id = $1'; params.push(req.user.id);
        }
        const rows = await db.all(`
            SELECT EXTRACT(YEAR FROM COALESCE(pr.print_date, pr.created_at))::int AS year,
                   EXTRACT(MONTH FROM COALESCE(pr.print_date, pr.created_at))::int AS month,
                   pr.printer_id, u.full_name AS printer_name,
                   pr.contractor_id, c.name AS contractor_name,
                   COUNT(*)::int AS count
            FROM printing_records pr
            LEFT JOIN users u ON pr.printer_id = u.id
            LEFT JOIN printing_contractors c ON pr.contractor_id = c.id
            WHERE 1=1 ${where}
            GROUP BY year, month, pr.printer_id, u.full_name, pr.contractor_id, c.name
            ORDER BY year DESC, month DESC, u.full_name, c.name
        `, params);
        const total = rows.reduce((s, r) => s + r.count, 0);
        // Build tree
        const yearMap = {};
        for (const r of rows) {
            if (!yearMap[r.year]) yearMap[r.year] = { year: r.year, count: 0, months: {} };
            if (!yearMap[r.year].months[r.month]) yearMap[r.year].months[r.month] = { month: r.month, count: 0, printers: [], contractors: [] };
            const mo = yearMap[r.year].months[r.month];
            if (r.contractor_id) {
                const existing = mo.contractors.find(c => c.id === r.contractor_id);
                if (existing) existing.count += r.count;
                else mo.contractors.push({ id: r.contractor_id, name: r.contractor_name || 'Gia công', count: r.count });
            } else if (r.printer_id) {
                const existing = mo.printers.find(p => p.id === r.printer_id);
                if (existing) existing.count += r.count;
                else mo.printers.push({ id: r.printer_id, name: r.printer_name || 'Chưa PC', count: r.count });
            } else {
                const existing = mo.printers.find(p => p.id === null);
                if (existing) existing.count += r.count;
                else mo.printers.push({ id: null, name: 'Chưa phân công', count: r.count });
            }
            mo.count += r.count; yearMap[r.year].count += r.count;
        }
        const tree = Object.values(yearMap).map(y => ({ ...y, months: Object.values(y.months) }));
        const stats = await db.get(`
            SELECT COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE is_test_print AND NOT is_print_done)::int AS testing,
                   COUNT(*) FILTER (WHERE is_print_done)::int AS done,
                   COUNT(*) FILTER (WHERE error_reported)::int AS errors
            FROM printing_records pr WHERE 1=1 ${where}`, params);
        return { tree, total, stats: stats || { total: 0, testing: 0, done: 0, errors: 0 } };
    });

    // ========== LIST ==========
    fastify.get('/api/printing/records', { preHandler: [authenticate] }, async (req) => {
        const isManager = await isPrintManager(req);
        const { year, month, printer_id, contractor_id, status, search } = req.query;
        let where = 'WHERE 1=1', params = [], idx = 1;
        if (!isManager && !['quan_ly', 'truong_phong'].includes(req.user.role)) {
            where += ` AND pr.printer_id = $${idx++}`; params.push(req.user.id);
        }
        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(pr.print_date, pr.created_at))=$${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(pr.print_date, pr.created_at))=$${idx++}`; params.push(Number(month)); }
        if (printer_id) { where += ` AND pr.printer_id=$${idx++}`; params.push(Number(printer_id)); }
        if (contractor_id) { where += ` AND pr.contractor_id=$${idx++}`; params.push(Number(contractor_id)); }
        if (status === 'testing') where += ` AND pr.is_test_print=true AND pr.is_print_done=false`;
        else if (status === 'done') where += ` AND pr.is_print_done=true`;
        else if (status === 'error') where += ` AND pr.error_reported=true`;
        if (search) { where += ` AND (pr.product_name ILIKE $${idx} OR pr.cskh_name ILIKE $${idx} OR o.order_code ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        const records = await db.all(`
            SELECT pr.*, u.full_name AS printer_name, c.name AS contractor_name,
                   u_test.full_name AS test_by_name, u_done.full_name AS done_by_name,
                   o.order_code,
                   lh.details AS last_update_detail, lh.performed_at AS last_update_at, lhu.full_name AS last_update_by
            FROM printing_records pr
            LEFT JOIN users u ON pr.printer_id=u.id
            LEFT JOIN printing_contractors c ON pr.contractor_id=c.id
            LEFT JOIN users u_test ON pr.test_print_by=u_test.id
            LEFT JOIN users u_done ON pr.print_done_by=u_done.id
            LEFT JOIN dht_orders o ON pr.dht_order_id=o.id
            LEFT JOIN LATERAL (SELECT h.details, h.performed_at, h.performed_by FROM printing_history h WHERE h.printing_id=pr.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY pr.print_date DESC NULLS LAST, pr.created_at DESC
        `, params);
        return { records };
    });

    // ========== CREATE ==========
    fastify.post('/api/printing/records', { preHandler: [authenticate] }, async (req) => {
        const b = req.body || {}, now = vnNow();
        const r = await db.get(`
            INSERT INTO printing_records (dht_order_id, print_date, printer_id, contractor_id, product_name, cskh_name,
                order_quantity, print_meters, roll_start_qty, roll_end_qty, current_roll, print_field, shared_process, notes, created_by, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
            [b.dht_order_id||null, b.print_date||null, b.printer_id||null, b.contractor_id||null,
             b.product_name||null, b.cskh_name||null, Number(b.order_quantity)||0, Number(b.print_meters)||0,
             Number(b.roll_start_qty)||0, Number(b.roll_end_qty)||0, b.current_roll||null,
             b.print_field||null, b.shared_process||null, b.notes||null, req.user.id, now]);
        await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [r.id, 'create', 'Tạo đơn in mới', req.user.id, now]);
        return { success: true, id: r.id };
    });

    // ========== TOGGLE ==========
    fastify.post('/api/printing/toggle/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { action } = req.body || {}, now = vnNow();
        const rec = await db.get('SELECT * FROM printing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        let detail = '';
        if (action === 'start_test') {
            await db.run(`UPDATE printing_records SET is_test_print=true, test_print_at=$1, test_print_by=$2, updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            detail = '🧪 Bắt đầu in test';
        } else if (action === 'undo_test') {
            await db.run(`UPDATE printing_records SET is_test_print=false, test_print_at=NULL, test_print_by=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '↩️ Hoàn tác in test';
        } else if (action === 'print_done') {
            await db.run(`UPDATE printing_records SET is_print_done=true, print_done_at=$1, print_done_by=$2, is_test_print=true, test_print_at=COALESCE(test_print_at,$1), updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            detail = '✅ In xong';
        } else if (action === 'undo_done') {
            await db.run(`UPDATE printing_records SET is_print_done=false, print_done_at=NULL, print_done_by=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '↩️ Hoàn tác in xong';
        } else if (action === 'report_error') {
            await db.run(`UPDATE printing_records SET error_reported=true, error_order_id=$1, updated_at=$2 WHERE id=$3`, [req.body.error_order_id||null, now, id]);
            detail = '⚠️ Báo đơn lỗi nội bộ';
        } else { return reply.code(400).send({ error: 'Action không hợp lệ' }); }
        await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, action, detail, req.user.id, now]);
        return { success: true };
    });

    // ========== UPDATE ==========
    fastify.put('/api/printing/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), b = req.body || {}, now = vnNow();
        const rec = await db.get('SELECT * FROM printing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        await db.run(`UPDATE printing_records SET print_date=$1, printer_id=$2, contractor_id=$3, product_name=$4, cskh_name=$5,
            order_quantity=$6, print_meters=$7, roll_start_qty=$8, roll_end_qty=$9, current_roll=$10,
            print_field=$11, shared_process=$12, notes=$13, updated_at=$14 WHERE id=$15`,
            [b.print_date||rec.print_date, b.printer_id||rec.printer_id, b.contractor_id!==undefined?b.contractor_id:rec.contractor_id,
             b.product_name!==undefined?b.product_name:rec.product_name, b.cskh_name!==undefined?b.cskh_name:rec.cskh_name,
             Number(b.order_quantity)||rec.order_quantity, Number(b.print_meters)||rec.print_meters,
             Number(b.roll_start_qty)||rec.roll_start_qty, Number(b.roll_end_qty)||rec.roll_end_qty,
             b.current_roll!==undefined?b.current_roll:rec.current_roll, b.print_field!==undefined?b.print_field:rec.print_field,
             b.shared_process!==undefined?b.shared_process:rec.shared_process, b.notes!==undefined?b.notes:rec.notes, now, id]);
        await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật thông tin in', req.user.id, now]);
        return { success: true };
    });

    // ========== INLINE FIELD ==========
    fastify.patch('/api/printing/records/:id/field', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { field, value } = req.body || {}, now = vnNow();
        const ALLOWED = ['print_date','printer_id','contractor_id','product_name','cskh_name','order_quantity','print_meters',
            'roll_start_qty','roll_end_qty','current_roll','print_field','shared_process','notes'];
        if (!ALLOWED.includes(field)) return reply.code(400).send({ error: 'Trường không hợp lệ' });
        const numF = ['order_quantity','print_meters','roll_start_qty','roll_end_qty','printer_id','contractor_id'];
        const fv = numF.includes(field) ? (Number(value)||0) : (value||null);
        await db.run(`UPDATE printing_records SET ${field}=$1, updated_at=$2 WHERE id=$3`, [fv, now, id]);
        await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'inline_update', `${field}: ${value}`, req.user.id, now]);
        return { success: true };
    });

    // ========== DELETE ==========
    fastify.delete('/api/printing/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isPrintManager(req))) return reply.code(403).send({ error: 'Chỉ QLX/GĐ mới xóa được' });
        await db.run('DELETE FROM printing_records WHERE id=$1', [Number(req.params.id)]);
        return { success: true };
    });

    // ========== HISTORY ==========
    fastify.get('/api/printing/history/:id', { preHandler: [authenticate] }, async (req) => {
        const rows = await db.all(`SELECT h.*, u.full_name AS performer_name FROM printing_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.printing_id=$1 ORDER BY h.performed_at DESC LIMIT 50`, [Number(req.params.id)]);
        return { history: rows };
    });

    // ========== STAFF ==========
    fastify.get('/api/printing/staff', { preHandler: [authenticate] }, async () => {
        const staff = await db.all(`SELECT u.id, u.full_name, u.username, d.name AS dept_name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.status='active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien') ORDER BY u.full_name`);
        return { staff };
    });
};
