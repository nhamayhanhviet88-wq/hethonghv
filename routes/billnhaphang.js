// ========== BILL NHẬP HÀNG — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try { await db.exec(`CREATE TABLE IF NOT EXISTS import_sources (
        id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT, notes TEXT,
        is_active BOOLEAN DEFAULT true, display_order INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW()
    )`); } catch(e) { console.error('[BNH] sources:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS import_records (
        id SERIAL PRIMARY KEY,
        is_checked BOOLEAN DEFAULT false, checked_at TIMESTAMPTZ, checked_by INTEGER REFERENCES users(id),
        import_date DATE, source_id INTEGER REFERENCES import_sources(id),
        importer_id INTEGER REFERENCES users(id),
        fabric_material TEXT, fabric_quantity NUMERIC DEFAULT 0,
        material_name TEXT, material_quantity NUMERIC DEFAULT 0,
        cost NUMERIC DEFAULT 0, refund NUMERIC DEFAULT 0,
        total_amount NUMERIC DEFAULT 0, paid NUMERIC DEFAULT 0, debt NUMERIC DEFAULT 0,
        cost_notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ir_source ON import_records(source_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ir_date ON import_records(import_date)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ir_importer ON import_records(importer_id)`);
    } catch(e) { console.error('[BNH] records:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS import_history (
        id SERIAL PRIMARY KEY, import_id INTEGER NOT NULL REFERENCES import_records(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ih_iid ON import_history(import_id)`);
    } catch(e) { console.error('[BNH] history:', e.message); }

    // ========== HELPERS ==========
    const MGMT = ['giam_doc', 'quan_ly_cap_cao'];
    async function isImportManager(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) { const n = d.name.toLowerCase(); if (n.includes('qlx') || n.includes('kế toán') || n.includes('ke toan') || n.includes('quản lý xưởng')) return true; }
        return false;
    }
    function calcFinance(cost, refund, paid) {
        const c = Number(cost)||0, r = Number(refund)||0, p = Number(paid)||0;
        const total = c - r, debt = total - p;
        return { total_amount: total, debt };
    }

    // ========== SOURCES CRUD ==========
    fastify.get('/api/import/sources', { preHandler: [authenticate] }, async () => {
        return { sources: await db.all(`SELECT s.*, COALESCE(SUM(r.total_amount),0)::numeric AS sum_total, COUNT(r.id)::int AS rec_count
            FROM import_sources s LEFT JOIN import_records r ON s.id=r.source_id
            WHERE s.is_active=true GROUP BY s.id ORDER BY s.display_order, s.name`) };
    });
    fastify.post('/api/import/sources', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isImportManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
        const { name, phone, notes } = req.body || {};
        if (!name) return reply.code(400).send({ error: 'Tên nguồn bắt buộc' });
        const r = await db.get(`INSERT INTO import_sources (name,phone,notes,created_by) VALUES ($1,$2,$3,$4) RETURNING id`, [name, phone||null, notes||null, req.user.id]);
        return { success: true, id: r.id };
    });
    fastify.put('/api/import/sources/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isImportManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
        const { name, phone, notes } = req.body || {};
        await db.run(`UPDATE import_sources SET name=$1, phone=$2, notes=$3 WHERE id=$4`, [name, phone||null, notes||null, req.params.id]);
        return { success: true };
    });
    fastify.delete('/api/import/sources/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isImportManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
        await db.run(`UPDATE import_sources SET is_active=false WHERE id=$1`, [req.params.id]);
        return { success: true };
    });

    // ========== TREE ==========
    fastify.get('/api/import/tree', { preHandler: [authenticate] }, async () => {
        const sources = await db.all(`SELECT s.id, s.name, COUNT(r.id)::int AS count, COALESCE(SUM(r.total_amount),0)::numeric AS sum_total,
            COALESCE(SUM(r.debt),0)::numeric AS sum_debt
            FROM import_sources s LEFT JOIN import_records r ON s.id=r.source_id
            WHERE s.is_active=true GROUP BY s.id, s.name ORDER BY s.display_order, s.name`);
        const totals = await db.get(`SELECT COUNT(*)::int AS total, COALESCE(SUM(total_amount),0)::numeric AS sum_total,
            COALESCE(SUM(debt),0)::numeric AS sum_debt, COALESCE(SUM(paid),0)::numeric AS sum_paid
            FROM import_records`);
        return { sources, totals: totals || { total: 0, sum_total: 0, sum_debt: 0, sum_paid: 0 } };
    });

    // ========== LIST ==========
    fastify.get('/api/import/records', { preHandler: [authenticate] }, async (req) => {
        const { source_id, year, month, status, search } = req.query;
        let where = 'WHERE 1=1', params = [], idx = 1;
        if (source_id) { where += ` AND ir.source_id=$${idx++}`; params.push(Number(source_id)); }
        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(ir.import_date,ir.created_at))=$${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(ir.import_date,ir.created_at))=$${idx++}`; params.push(Number(month)); }
        if (status === 'checked') where += ` AND ir.is_checked=true`;
        else if (status === 'unchecked') where += ` AND ir.is_checked=false`;
        else if (status === 'debt') where += ` AND ir.debt > 0`;
        else if (status === 'paid') where += ` AND ir.debt <= 0`;
        if (search) { where += ` AND (ir.fabric_material ILIKE $${idx} OR ir.material_name ILIKE $${idx} OR s.name ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        const records = await db.all(`
            SELECT ir.*, s.name AS source_name, u.full_name AS importer_name, u_ck.full_name AS checked_by_name,
                   lh.details AS last_update_detail, lh.performed_at AS last_update_at, lhu.full_name AS last_update_by
            FROM import_records ir LEFT JOIN import_sources s ON ir.source_id=s.id
            LEFT JOIN users u ON ir.importer_id=u.id LEFT JOIN users u_ck ON ir.checked_by=u_ck.id
            LEFT JOIN LATERAL (SELECT h.details, h.performed_at, h.performed_by FROM import_history h WHERE h.import_id=ir.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY ir.import_date DESC NULLS LAST, ir.created_at DESC`, params);
        return { records };
    });

    // ========== CREATE ==========
    fastify.post('/api/import/records', { preHandler: [authenticate] }, async (req) => {
        const b = req.body || {}, now = vnNow();
        const fin = calcFinance(b.cost, b.refund, b.paid);
        const r = await db.get(`INSERT INTO import_records (import_date,source_id,importer_id,fabric_material,fabric_quantity,
            material_name,material_quantity,cost,refund,total_amount,paid,debt,cost_notes,created_by,created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
            [b.import_date||null, b.source_id||null, b.importer_id||null, b.fabric_material||null,
             Number(b.fabric_quantity)||0, b.material_name||null, Number(b.material_quantity)||0,
             Number(b.cost)||0, Number(b.refund)||0, fin.total_amount, Number(b.paid)||0, fin.debt,
             b.cost_notes||null, req.user.id, now]);
        await db.run(`INSERT INTO import_history (import_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [r.id, 'create', 'Tạo bill nhập hàng mới', req.user.id, now]);
        return { success: true, id: r.id };
    });

    // ========== TOGGLE CHECK ==========
    fastify.post('/api/import/toggle/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { action } = req.body || {}, now = vnNow();
        if (action === 'check') {
            if (!(await isImportManager(req))) return reply.code(403).send({ error: 'Chỉ QLX/GĐ/KT' });
            await db.run(`UPDATE import_records SET is_checked=true, checked_at=$1, checked_by=$2, updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            await db.run(`INSERT INTO import_history (import_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, 'check', '✅ Duyệt kiểm tra', req.user.id, now]);
        } else if (action === 'uncheck') {
            if (!(await isImportManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
            await db.run(`UPDATE import_records SET is_checked=false, checked_at=NULL, checked_by=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            await db.run(`INSERT INTO import_history (import_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, 'uncheck', '↩️ Hoàn tác duyệt', req.user.id, now]);
        } else { return reply.code(400).send({ error: 'Action không hợp lệ' }); }
        return { success: true };
    });

    // ========== UPDATE ==========
    fastify.put('/api/import/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), b = req.body || {}, now = vnNow();
        const rec = await db.get('SELECT * FROM import_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        const cost = b.cost!==undefined ? Number(b.cost)||0 : Number(rec.cost)||0;
        const refund = b.refund!==undefined ? Number(b.refund)||0 : Number(rec.refund)||0;
        const paid = b.paid!==undefined ? Number(b.paid)||0 : Number(rec.paid)||0;
        const fin = calcFinance(cost, refund, paid);
        await db.run(`UPDATE import_records SET import_date=$1,source_id=$2,importer_id=$3,fabric_material=$4,fabric_quantity=$5,
            material_name=$6,material_quantity=$7,cost=$8,refund=$9,total_amount=$10,paid=$11,debt=$12,cost_notes=$13,updated_at=$14 WHERE id=$15`,
            [b.import_date!==undefined?b.import_date:rec.import_date, b.source_id!==undefined?b.source_id:rec.source_id,
             b.importer_id!==undefined?b.importer_id:rec.importer_id, b.fabric_material!==undefined?b.fabric_material:rec.fabric_material,
             b.fabric_quantity!==undefined?Number(b.fabric_quantity):rec.fabric_quantity,
             b.material_name!==undefined?b.material_name:rec.material_name,
             b.material_quantity!==undefined?Number(b.material_quantity):rec.material_quantity,
             cost, refund, fin.total_amount, paid, fin.debt,
             b.cost_notes!==undefined?b.cost_notes:rec.cost_notes, now, id]);
        await db.run(`INSERT INTO import_history (import_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật bill nhập hàng', req.user.id, now]);
        return { success: true, total_amount: fin.total_amount, debt: fin.debt };
    });

    // ========== INLINE FIELD ==========
    fastify.patch('/api/import/records/:id/field', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { field, value } = req.body || {}, now = vnNow();
        const ALLOWED = ['import_date','source_id','importer_id','fabric_material','fabric_quantity',
            'material_name','material_quantity','cost','refund','paid','cost_notes'];
        if (!ALLOWED.includes(field)) return reply.code(400).send({ error: 'Trường không hợp lệ' });
        const numF = ['source_id','importer_id','fabric_quantity','material_quantity','cost','refund','paid'];
        const fv = numF.includes(field) ? (Number(value)||0) : (value||null);
        await db.run(`UPDATE import_records SET ${field}=$1, updated_at=$2 WHERE id=$3`, [fv, now, id]);
        // Recalc if financial field changed
        if (['cost','refund','paid'].includes(field)) {
            const rec = await db.get('SELECT cost, refund, paid FROM import_records WHERE id=$1', [id]);
            if (rec) { const fin = calcFinance(rec.cost, rec.refund, rec.paid);
                await db.run(`UPDATE import_records SET total_amount=$1, debt=$2 WHERE id=$3`, [fin.total_amount, fin.debt, id]); }
        }
        await db.run(`INSERT INTO import_history (import_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'inline_update', `${field}: ${value}`, req.user.id, now]);
        return { success: true };
    });

    // ========== DELETE ==========
    fastify.delete('/api/import/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isImportManager(req))) return reply.code(403).send({ error: 'Chỉ QLX/GĐ/KT' });
        await db.run('DELETE FROM import_records WHERE id=$1', [Number(req.params.id)]);
        return { success: true };
    });

    // ========== HISTORY ==========
    fastify.get('/api/import/history/:id', { preHandler: [authenticate] }, async (req) => {
        return { history: await db.all(`SELECT h.*, u.full_name AS performer_name FROM import_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.import_id=$1 ORDER BY h.performed_at DESC LIMIT 50`, [Number(req.params.id)]) };
    });

    // ========== STAFF ==========
    fastify.get('/api/import/staff', { preHandler: [authenticate] }, async () => {
        return { staff: await db.all(`SELECT u.id, u.full_name, u.username FROM users u WHERE u.status='active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien') ORDER BY u.full_name`) };
    });
};
