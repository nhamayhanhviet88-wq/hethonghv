// ========== NHẬP XUẤT HOÀN VẢI — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');
const path = require('path');
const fs = require('fs');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try { await db.exec(`CREATE TABLE IF NOT EXISTS fabric_transactions (
        id SERIAL PRIMARY KEY,
        tx_type TEXT NOT NULL DEFAULT 'HOAN',
        is_approved BOOLEAN DEFAULT false, approved_at TIMESTAMPTZ, approved_by INTEGER REFERENCES users(id),
        bill_images JSONB DEFAULT '[]'::jsonb,
        tx_date DATE, source_name TEXT, staff_id INTEGER REFERENCES users(id),
        material_name TEXT, color_name TEXT, unit TEXT DEFAULT 'kg',
        tree_details TEXT, tree_count INTEGER DEFAULT 0,
        total_quantity NUMERIC DEFAULT 0, price NUMERIC DEFAULT 0,
        total_amount NUMERIC DEFAULT 0, debt NUMERIC DEFAULT 0, payment NUMERIC DEFAULT 0,
        notes TEXT, created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ftx_type ON fabric_transactions(tx_type)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ftx_date ON fabric_transactions(tx_date)`);
    } catch(e) { console.error('[NXHV] tx:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS fabric_tx_history (
        id SERIAL PRIMARY KEY, tx_id INTEGER NOT NULL REFERENCES fabric_transactions(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_fth_txid ON fabric_tx_history(tx_id)`);
    } catch(e) { console.error('[NXHV] hist:', e.message); }

    // ========== HELPERS ==========
    const MGMT = ['giam_doc','quan_ly_cap_cao'];
    const TX_TYPES = ['HOAN','NHAP_KK','XUAT_KK','NHAP','XUAT'];
    const TX_LABELS = {HOAN:'Hoàn',NHAP_KK:'Nhập Kiểm Kê',XUAT_KK:'Xuất Kiểm Kê',NHAP:'Nhập Vải',XUAT:'Xuất Vải'};
    async function isNxhvManager(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) { const n = d.name.toLowerCase(); if (n.includes('qlx') || n.includes('kế toán') || n.includes('ke toan') || n.includes('kho')) return true; }
        return false;
    }
    function calcFin(qty, price) {
        const q = Number(qty)||0, p = Number(price)||0;
        return { total_amount: q * p };
    }

    // ========== TREE ==========
    fastify.get('/api/fabrictx/tree', { preHandler: [authenticate] }, async () => {
        const types = [];
        for (const t of TX_TYPES) {
            const rows = await db.all(`
                SELECT EXTRACT(YEAR FROM COALESCE(tx_date,created_at))::int AS year,
                       EXTRACT(MONTH FROM COALESCE(tx_date,created_at))::int AS month,
                       COUNT(*)::int AS count
                FROM fabric_transactions WHERE tx_type=$1
                GROUP BY year, month ORDER BY year DESC, month DESC`, [t]);
            const years = {};
            rows.forEach(r => { if (!years[r.year]) years[r.year] = { year: r.year, months: [], count: 0 }; years[r.year].months.push({ month: r.month, count: r.count }); years[r.year].count += r.count; });
            const total = rows.reduce((s, r) => s + r.count, 0);
            types.push({ type: t, label: TX_LABELS[t], total, years: Object.values(years).sort((a,b) => b.year - a.year) });
        }
        const grand = await db.get(`SELECT COUNT(*)::int AS total FROM fabric_transactions`);
        return { types, grand_total: (grand||{}).total||0 };
    });

    // ========== LIST ==========
    fastify.get('/api/fabrictx/records', { preHandler: [authenticate] }, async (req) => {
        const { tx_type, year, month, status, search } = req.query;
        let where = 'WHERE 1=1', params = [], idx = 1;
        if (tx_type && TX_TYPES.includes(tx_type)) { where += ` AND ft.tx_type=$${idx++}`; params.push(tx_type); }
        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(ft.tx_date,ft.created_at))=$${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(ft.tx_date,ft.created_at))=$${idx++}`; params.push(Number(month)); }
        if (status === 'approved') where += ` AND ft.is_approved=true`;
        else if (status === 'pending') where += ` AND ft.is_approved=false`;
        else if (status === 'debt') where += ` AND ft.debt > 0`;
        if (search) { where += ` AND (ft.material_name ILIKE $${idx} OR ft.color_name ILIKE $${idx} OR ft.source_name ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        const records = await db.all(`
            SELECT ft.*, u.full_name AS staff_name, u_ap.full_name AS approved_by_name,
                   lh.performed_at AS last_update_at, lhu.full_name AS last_update_by
            FROM fabric_transactions ft
            LEFT JOIN users u ON ft.staff_id=u.id LEFT JOIN users u_ap ON ft.approved_by=u_ap.id
            LEFT JOIN LATERAL (SELECT h.performed_at, h.performed_by FROM fabric_tx_history h WHERE h.tx_id=ft.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY ft.tx_date DESC NULLS LAST, ft.created_at DESC`, params);
        return { records };
    });

    // ========== CREATE ==========
    fastify.post('/api/fabrictx/records', { preHandler: [authenticate] }, async (req) => {
        const b = req.body || {}, now = vnNow();
        if (!b.tx_type || !TX_TYPES.includes(b.tx_type)) return { error: 'Loại nghiệp vụ không hợp lệ' };
        const fin = calcFin(b.total_quantity, b.price);
        const r = await db.get(`INSERT INTO fabric_transactions
            (tx_type,tx_date,source_name,staff_id,material_name,color_name,unit,tree_details,tree_count,
             total_quantity,price,total_amount,debt,payment,notes,bill_images,created_by,created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18) RETURNING id`,
            [b.tx_type, b.tx_date||null, b.source_name||null, b.staff_id||null,
             b.material_name||null, b.color_name||null, b.unit||'kg',
             b.tree_details||null, Number(b.tree_count)||0,
             Number(b.total_quantity)||0, Number(b.price)||0, fin.total_amount,
             Number(b.debt)||0, Number(b.payment)||0, b.notes||null,
             JSON.stringify(b.bill_images||[]), req.user.id, now]);
        await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [r.id, 'create', `Tạo ${TX_LABELS[b.tx_type]}`, req.user.id, now]);
        return { success: true, id: r.id };
    });

    // ========== TOGGLE APPROVE ==========
    fastify.post('/api/fabrictx/toggle/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { action } = req.body || {}, now = vnNow();
        if (action === 'approve') {
            if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Chỉ QLX/GĐ/KT' });
            
            const tx = await db.get('SELECT tx_type FROM fabric_transactions WHERE id=$1', [id]);
            if (tx && tx.tx_type === 'HOAN') {
                const rolls = await db.all(`SELECT id, fabric_color_id, weight FROM kv_rolls WHERE return_tx_id = $1 AND is_returned = false`, [id]);
                for (const roll of rolls) {
                    await db.run(
                        `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by, created_at)
                         VALUES ($1, 'XUAT', $2, $3, $4, $5)`,
                        [roll.fabric_color_id, 'XUAT', Number(roll.weight), `Trả NCC (Duyệt hoàn #${id}): cục ${roll.weight}`, req.user.id, now]
                    );
                }
                await db.run(`UPDATE kv_rolls SET is_returned=true, location=NULL WHERE return_tx_id=$1`, [id]);
            }

            await db.run(`UPDATE fabric_transactions SET is_approved=true, approved_at=$1, approved_by=$2, updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, 'approve', '✅ Duyệt hoàn', req.user.id, now]);
        } else if (action === 'unapprove') {
            if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Không có quyền' });
            
            const tx = await db.get('SELECT tx_type FROM fabric_transactions WHERE id=$1', [id]);
            if (tx && tx.tx_type === 'HOAN') {
                await db.run(`DELETE FROM kv_transactions WHERE description LIKE 'Trả NCC (Duyệt hoàn ' || $1 || '):%'`, [id]);
                await db.run(`UPDATE kv_rolls SET is_returned=false, location='📍 Kệ Dự Định Hoàn Vải' WHERE return_tx_id=$1`, [id]);
            }

            await db.run(`UPDATE fabric_transactions SET is_approved=false, approved_at=NULL, approved_by=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, 'unapprove', '↩️ Hoàn tác duyệt', req.user.id, now]);
        } else { return reply.code(400).send({ error: 'Action không hợp lệ' }); }
        return { success: true };
    });

    // ========== INLINE FIELD ==========
    fastify.patch('/api/fabrictx/records/:id/field', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { field, value } = req.body || {}, now = vnNow();
        const ALLOWED = ['tx_type','tx_date','source_name','staff_id','material_name','color_name','unit',
            'tree_details','tree_count','total_quantity','price','debt','payment','notes'];
        if (!ALLOWED.includes(field)) return reply.code(400).send({ error: 'Trường không hợp lệ' });
        const numF = ['staff_id','tree_count','total_quantity','price','debt','payment'];
        const fv = numF.includes(field) ? (Number(value)||0) : (value||null);
        await db.run(`UPDATE fabric_transactions SET ${field}=$1, updated_at=$2 WHERE id=$3`, [fv, now, id]);
        if (['total_quantity','price'].includes(field)) {
            const rec = await db.get('SELECT total_quantity, price FROM fabric_transactions WHERE id=$1', [id]);
            if (rec) { const fin = calcFin(rec.total_quantity, rec.price);
                await db.run(`UPDATE fabric_transactions SET total_amount=$1 WHERE id=$2`, [fin.total_amount, id]); }
        }
        await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'inline_update', `${field}: ${value}`, req.user.id, now]);
        return { success: true };
    });

    // ========== UPLOAD BILL IMAGE ==========
    fastify.post('/api/fabrictx/upload/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), now = vnNow();
        const data = await req.file();
        if (!data) return reply.code(400).send({ error: 'Không có file' });
        const uploadDir = path.join(__dirname, '..', 'uploads', 'fabrictx');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const ext = path.extname(data.filename) || '.jpg';
        const fn = `ftx_${id}_${Date.now()}${ext}`;
        const fp = path.join(uploadDir, fn);
        const buf = await data.toBuffer();
        fs.writeFileSync(fp, buf);
        const url = `/uploads/fabrictx/${fn}`;
        const rec = await db.get('SELECT bill_images FROM fabric_transactions WHERE id=$1', [id]);
        let imgs = [];
        try { imgs = JSON.parse(rec.bill_images || '[]'); } catch(e) {}
        if (!Array.isArray(imgs)) imgs = [];
        imgs.push(url);
        await db.run(`UPDATE fabric_transactions SET bill_images=$1::jsonb, updated_at=$2 WHERE id=$3`, [JSON.stringify(imgs), now, id]);
        await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'upload', `📸 Upload ảnh bill`, req.user.id, now]);
        return { success: true, url, images: imgs };
    });

    // ========== UPDATE ==========
    fastify.put('/api/fabrictx/records/:id', { preHandler: [authenticate] }, async (req) => {
        const id = Number(req.params.id), b = req.body || {}, now = vnNow();
        const fin = calcFin(b.total_quantity, b.price);
        await db.run(`UPDATE fabric_transactions SET tx_type=$1,tx_date=$2,source_name=$3,staff_id=$4,material_name=$5,
            color_name=$6,unit=$7,tree_details=$8,tree_count=$9,total_quantity=$10,price=$11,total_amount=$12,
            debt=$13,payment=$14,notes=$15,updated_at=$16 WHERE id=$17`,
            [b.tx_type, b.tx_date||null, b.source_name||null, b.staff_id||null,
             b.material_name||null, b.color_name||null, b.unit||'kg',
             b.tree_details||null, Number(b.tree_count)||0,
             Number(b.total_quantity)||0, Number(b.price)||0, fin.total_amount,
             Number(b.debt)||0, Number(b.payment)||0, b.notes||null, now, id]);
        await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật giao dịch', req.user.id, now]);
        return { success: true };
    });

    // ========== DELETE ==========
    fastify.delete('/api/fabrictx/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Chỉ QLX/GĐ/KT' });
        const id = Number(req.params.id);
        await db.run(`DELETE FROM kv_transactions WHERE description LIKE 'Trả NCC (Duyệt hoàn ' || $1 || '):%'`, [id]);
        await db.run(`UPDATE kv_rolls SET location = original_location, original_location = NULL, return_tx_id = NULL WHERE return_tx_id = $1`, [id]);
        await db.run('DELETE FROM fabric_transactions WHERE id=$1', [id]);
        return { success: true };
    });

    // ========== STAFF ==========
    fastify.get('/api/fabrictx/staff', { preHandler: [authenticate] }, async () => {
        return { staff: await db.all(`SELECT id, full_name, username FROM users WHERE status='active' AND role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien') ORDER BY full_name`) };
    });
};
