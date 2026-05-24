// ========== KIỂM KHO — Routes (Sync từ Kho Vải kv_*) ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');
const crypto = require('crypto');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try { await db.exec(`CREATE TABLE IF NOT EXISTS stockcheck_records (
        id SERIAL PRIMARY KEY,
        roll_id INTEGER REFERENCES kv_rolls(id) ON DELETE CASCADE,
        fabric_color_id INTEGER,
        system_weight NUMERIC DEFAULT 0, actual_weight NUMERIC, difference NUMERIC DEFAULT 0,
        is_checked BOOLEAN DEFAULT false, checked_at TIMESTAMPTZ, checked_by INTEGER REFERENCES users(id),
        notes TEXT, created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sc_roll ON stockcheck_records(roll_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sc_fcid ON stockcheck_records(fabric_color_id)`);
    } catch(e) { console.error('[KK] records:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS stockcheck_history (
        id SERIAL PRIMARY KEY, stockcheck_id INTEGER NOT NULL REFERENCES stockcheck_records(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sch_sid ON stockcheck_history(stockcheck_id)`);
    } catch(e) { console.error('[KK] history:', e.message); }

    // ========== HELPERS ==========
    const MGMT = ['giam_doc', 'quan_ly_cap_cao'];
    async function isKhoManager(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) { const n = d.name.toLowerCase(); if (n.includes('qlx') || n.includes('kho') || n.includes('quản lý xưởng')) return true; }
        return false;
    }

    // ========== TREE — Sync from kv_* ==========
    fastify.get('/api/stockcheck/tree', { preHandler: [authenticate] }, async () => {
        const warehouses = await db.all(`
            SELECT w.id, w.name, w.unit,
                   COALESCE((SELECT COUNT(*) FROM kv_rolls r
                       JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id
                       JOIN kv_materials m ON m.id=fc.material_id
                       WHERE m.warehouse_id=w.id AND r.is_returned=false AND fc.is_active=true AND m.is_active=true),0)::int AS roll_count,
                   COALESCE((SELECT SUM(r.weight) FROM kv_rolls r
                       JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id
                       JOIN kv_materials m ON m.id=fc.material_id
                       WHERE m.warehouse_id=w.id AND r.is_returned=false AND fc.is_active=true AND m.is_active=true),0)::numeric AS total_weight
            FROM kv_warehouses w WHERE w.is_active=true ORDER BY w.display_order, w.id`);
        for (const w of warehouses) {
            w.materials = await db.all(`
                SELECT m.id, m.name,
                       COALESCE((SELECT COUNT(*) FROM kv_rolls r JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id
                           WHERE fc.material_id=m.id AND r.is_returned=false AND fc.is_active=true),0)::int AS roll_count,
                       COALESCE((SELECT SUM(r.weight) FROM kv_rolls r JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id
                           WHERE fc.material_id=m.id AND r.is_returned=false AND fc.is_active=true),0)::numeric AS total_weight
                FROM kv_materials m WHERE m.warehouse_id=$1 AND m.is_active=true ORDER BY m.display_order, m.name`, [w.id]);
        }
        const totals = await db.get(`SELECT
            COALESCE((SELECT COUNT(*) FROM kv_rolls r JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id JOIN kv_materials m ON m.id=fc.material_id JOIN kv_warehouses w ON w.id=m.warehouse_id WHERE r.is_returned=false AND fc.is_active=true AND m.is_active=true AND w.is_active=true),0)::int AS total_rolls,
            COALESCE((SELECT SUM(r.weight) FROM kv_rolls r JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id JOIN kv_materials m ON m.id=fc.material_id JOIN kv_warehouses w ON w.id=m.warehouse_id WHERE r.is_returned=false AND fc.is_active=true AND m.is_active=true AND w.is_active=true),0)::numeric AS total_weight`);
        const checked = await db.get(`SELECT COUNT(*)::int AS cnt FROM stockcheck_records WHERE is_checked=true`);
        return { tree: warehouses, totals: totals || {total_rolls:0,total_weight:0}, checked_count: (checked||{}).cnt||0 };
    });

    // ========== LIST — Rolls per material with stockcheck data ==========
    fastify.get('/api/stockcheck/rolls', { preHandler: [authenticate] }, async (req) => {
        const { material_id, warehouse_id, search } = req.query;
        let where = 'WHERE r.is_returned=false AND fc.is_active=true AND m.is_active=true AND w.is_active=true', params = [], idx = 1;
        if (material_id) { where += ` AND fc.material_id=$${idx++}`; params.push(Number(material_id)); }
        else if (warehouse_id) { where += ` AND m.warehouse_id=$${idx++}`; params.push(Number(warehouse_id)); }
        if (search) { where += ` AND (fc.color_name ILIKE $${idx} OR m.name ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        const rows = await db.all(`
            SELECT r.id AS roll_id, r.roll_code, r.weight AS system_weight, r.original_weight, r.source, r.note AS roll_note,
                   fc.id AS fabric_color_id, fc.color_name, m.id AS material_id, m.name AS material_name,
                   w.name AS warehouse_name, w.unit,
                   sc.id AS sc_id, sc.actual_weight, sc.difference, sc.is_checked, sc.checked_at, sc.notes AS sc_notes,
                   u_ck.full_name AS checked_by_name,
                   lh.details AS last_update_detail, lh.performed_at AS last_update_at, lhu.full_name AS last_update_by
            FROM kv_rolls r
            JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id
            JOIN kv_materials m ON m.id=fc.material_id
            JOIN kv_warehouses w ON w.id=m.warehouse_id
            LEFT JOIN stockcheck_records sc ON sc.roll_id=r.id
            LEFT JOIN users u_ck ON sc.checked_by=u_ck.id
            LEFT JOIN LATERAL (SELECT h.details, h.performed_at, h.performed_by FROM stockcheck_history h WHERE h.stockcheck_id=sc.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY m.display_order, m.name, fc.color_name, r.weight DESC`, params);
        return { rolls: rows };
    });

    // ========== CHECK / UPDATE ==========
    fastify.post('/api/stockcheck/check/:rollId', { preHandler: [authenticate] }, async (req) => {
        const rollId = Number(req.params.rollId), { actual_weight, notes, action } = req.body || {}, now = vnNow();
        const roll = await db.get('SELECT r.*, fc.id AS fcid FROM kv_rolls r JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id WHERE r.id=$1', [rollId]);
        if (!roll) return { error: 'Cây vải không tồn tại' };
        const existing = await db.get('SELECT * FROM stockcheck_records WHERE roll_id=$1', [rollId]);

        if (action === 'toggle_check') {
            if (existing) {
                const newState = !existing.is_checked;
                await db.run(`UPDATE stockcheck_records SET is_checked=$1, checked_at=$2, checked_by=$3, updated_at=$2 WHERE id=$4`,
                    [newState, newState?now:null, newState?req.user.id:null, existing.id]);
                await db.run(`INSERT INTO stockcheck_history (stockcheck_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                    [existing.id, newState?'check':'uncheck', newState?'📋 Đã kiểm tra':'↩️ Hoàn tác kiểm', req.user.id, now]);
            } else {
                const sc = await db.get(`INSERT INTO stockcheck_records (roll_id,fabric_color_id,system_weight,is_checked,checked_at,checked_by,created_by,created_at)
                    VALUES ($1,$2,$3,true,$4,$5,$5,$4) RETURNING id`, [rollId, roll.fcid, Number(roll.weight), now, req.user.id]);
                await db.run(`INSERT INTO stockcheck_history (stockcheck_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                    [sc.id, 'check', '📋 Đã kiểm tra', req.user.id, now]);
            }
            return { success: true };
        }

        // Update actual weight
        const aw = actual_weight !== undefined ? Number(actual_weight) : null;
        const sw = Number(roll.weight);
        const diff = aw !== null ? (sw - aw) : 0;

        if (existing) {
            await db.run(`UPDATE stockcheck_records SET system_weight=$1, actual_weight=$2, difference=$3, notes=$4, updated_at=$5 WHERE id=$6`,
                [sw, aw, diff, notes!==undefined?notes:existing.notes, now, existing.id]);
            await db.run(`INSERT INTO stockcheck_history (stockcheck_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [existing.id, 'update', `Kiểm: ${aw}kg (Tồn: ${sw}, Lệch: ${diff>0?'+':''}${diff})`, req.user.id, now]);
        } else {
            const sc = await db.get(`INSERT INTO stockcheck_records (roll_id,fabric_color_id,system_weight,actual_weight,difference,notes,created_by,created_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [rollId, roll.fcid, sw, aw, diff, notes||null, req.user.id, now]);
            await db.run(`INSERT INTO stockcheck_history (stockcheck_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [sc.id, 'create', `Kiểm: ${aw}kg (Tồn: ${sw}, Lệch: ${diff>0?'+':''}${diff})`, req.user.id, now]);
        }
        return { success: true, difference: diff };
    });

    // ========== NHẬP CÂY THỪA → kv_rolls ==========
    fastify.post('/api/stockcheck/add-surplus', { preHandler: [authenticate] }, async (req) => {
        const { fabric_color_id, weight, note } = req.body || {}, now = vnNow();
        if (!fabric_color_id) return { error: 'Chưa chọn loại vải' };
        if (!weight || Number(weight) <= 0) return { error: 'Trọng lượng phải > 0' };
        const fc = await db.get('SELECT * FROM kv_fabric_colors WHERE id=$1', [fabric_color_id]);
        if (!fc) return { error: 'Loại vải không tồn tại' };
        const rollCode = 'KK' + crypto.randomBytes(5).toString('hex').toUpperCase().slice(0,10);
        const roll = await db.get(`INSERT INTO kv_rolls (fabric_color_id,roll_code,weight,original_weight,source,note,created_by)
            VALUES ($1,$2,$3,$3,'kiem_kho_du',$4,$5) RETURNING *`, [fabric_color_id, rollCode, Number(weight), note||'Nhập từ kiểm kho (dư)', req.user.id]);
        await db.run(`INSERT INTO kv_transactions (fabric_color_id,tx_type,quantity,description,created_by)
            VALUES ($1,'NHAP',$2,$3,$4)`, [fabric_color_id, Number(weight), `Kiểm kho dư: ${weight} (${rollCode})`, req.user.id]);
        return { success: true, roll };
    });

    // ========== HISTORY ==========
    fastify.get('/api/stockcheck/history/:scId', { preHandler: [authenticate] }, async (req) => {
        return { history: await db.all(`SELECT h.*, u.full_name AS performer_name FROM stockcheck_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.stockcheck_id=$1 ORDER BY h.performed_at DESC LIMIT 50`, [Number(req.params.scId)]) };
    });

    // ========== RESET KIỂM KHO ==========
    fastify.delete('/api/stockcheck/reset', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isKhoManager(req))) return reply.code(403).send({ error: 'Chỉ QLX/GĐ' });
        await db.run('DELETE FROM stockcheck_history');
        await db.run('DELETE FROM stockcheck_records');
        return { success: true };
    });
};
