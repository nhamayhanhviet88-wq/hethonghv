// ========== VẬT LIỆU PET TEM — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try { await db.exec(`CREATE TABLE IF NOT EXISTS pettem_rolls (
        id SERIAL PRIMARY KEY,
        roll_type TEXT NOT NULL DEFAULT 'PET',
        import_date DATE,
        field_name TEXT,
        qty_imported NUMERIC DEFAULT 0, qty_waste NUMERIC DEFAULT 0,
        qty_error NUMERIC DEFAULT 0, qty_printed NUMERIC DEFAULT 0,
        qty_remaining NUMERIC DEFAULT 0,
        confirmed_by INTEGER REFERENCES users(id),
        notes TEXT, created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ptr_type ON pettem_rolls(roll_type)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ptr_date ON pettem_rolls(import_date)`);
    } catch(e) { console.error('[PT] rolls:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS pettem_history (
        id SERIAL PRIMARY KEY, roll_id INTEGER NOT NULL REFERENCES pettem_rolls(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_pth_rid ON pettem_history(roll_id)`);
    } catch(e) { console.error('[PT] hist:', e.message); }

    // ========== HELPERS ==========
    const TYPES = ['PET','TEM','DECAL'];
    const LABELS = {PET:'PET',TEM:'Tem',DECAL:'Decal'};
    function calcRemaining(imp,waste,err,printed) {
        return (Number(imp)||0) - (Number(waste)||0) - (Number(err)||0) - (Number(printed)||0);
    }

    // ========== TREE ==========
    fastify.get('/api/pettem/tree', { preHandler: [authenticate] }, async () => {
        const types = [];
        for (const t of TYPES) {
            const rows = await db.all(`
                SELECT EXTRACT(YEAR FROM COALESCE(import_date,created_at))::int AS year,
                       EXTRACT(MONTH FROM COALESCE(import_date,created_at))::int AS month,
                       COUNT(*)::int AS count
                FROM pettem_rolls WHERE roll_type=$1
                GROUP BY year, month ORDER BY year DESC, month DESC`, [t]);
            const years = {};
            rows.forEach(r => { if (!years[r.year]) years[r.year] = { year: r.year, months: [], count: 0 }; years[r.year].months.push({ month: r.month, count: r.count }); years[r.year].count += r.count; });
            types.push({ type: t, label: LABELS[t], total: rows.reduce((s,r) => s+r.count, 0), years: Object.values(years).sort((a,b) => b.year-a.year) });
        }
        const grand = await db.get(`SELECT COUNT(*)::int AS total FROM pettem_rolls`);
        return { types, grand_total: (grand||{}).total||0 };
    });

    // ========== LIST ==========
    fastify.get('/api/pettem/rolls', { preHandler: [authenticate] }, async (req) => {
        const { roll_type, year, month, search } = req.query;
        let where = 'WHERE 1=1', params = [], idx = 1;
        if (roll_type && TYPES.includes(roll_type)) { where += ` AND r.roll_type=$${idx++}`; params.push(roll_type); }
        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(r.import_date,r.created_at))=$${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(r.import_date,r.created_at))=$${idx++}`; params.push(Number(month)); }
        if (search) { where += ` AND (r.field_name ILIKE $${idx} OR r.notes ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        const rolls = await db.all(`
            SELECT r.*, uc.full_name AS confirmed_by_name,
                   lh.performed_at AS last_update_at, lhu.full_name AS last_update_by
            FROM pettem_rolls r
            LEFT JOIN users uc ON r.confirmed_by=uc.id
            LEFT JOIN LATERAL (SELECT h.performed_at, h.performed_by FROM pettem_history h WHERE h.roll_id=r.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY r.import_date DESC NULLS LAST, r.created_at DESC`, params);
        return { rolls };
    });

    // ========== CREATE ==========
    fastify.post('/api/pettem/rolls', { preHandler: [authenticate] }, async (req) => {
        const b = req.body || {}, now = vnNow();
        if (!b.roll_type || !TYPES.includes(b.roll_type)) return { error: 'Loại không hợp lệ' };
        const rem = calcRemaining(b.qty_imported, b.qty_waste, b.qty_error, b.qty_printed);
        const r = await db.get(`INSERT INTO pettem_rolls
            (roll_type,import_date,field_name,qty_imported,qty_waste,qty_error,qty_printed,qty_remaining,confirmed_by,notes,created_by,created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
            [b.roll_type, b.import_date||null, b.field_name||null,
             Number(b.qty_imported)||0, Number(b.qty_waste)||0, Number(b.qty_error)||0, Number(b.qty_printed)||0,
             rem, b.confirmed_by||null, b.notes||null, req.user.id, now]);
        await db.run(`INSERT INTO pettem_history (roll_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [r.id, 'create', `Tạo cây ${LABELS[b.roll_type]}`, req.user.id, now]);
        return { success: true, id: r.id };
    });

    // ========== INLINE FIELD ==========
    fastify.patch('/api/pettem/rolls/:id/field', { preHandler: [authenticate] }, async (req) => {
        const id = Number(req.params.id), { field, value } = req.body || {}, now = vnNow();
        const ALLOWED = ['roll_type','import_date','field_name','qty_imported','qty_waste','qty_error','qty_printed','confirmed_by','notes'];
        if (!ALLOWED.includes(field)) return { error: 'Trường không hợp lệ' };
        const numF = ['qty_imported','qty_waste','qty_error','qty_printed','confirmed_by'];
        const fv = numF.includes(field) ? (Number(value)||0) : (value||null);
        await db.run(`UPDATE pettem_rolls SET ${field}=$1, updated_at=$2 WHERE id=$3`, [fv, now, id]);
        // Recalc remaining
        if (['qty_imported','qty_waste','qty_error','qty_printed'].includes(field)) {
            const rec = await db.get('SELECT qty_imported,qty_waste,qty_error,qty_printed FROM pettem_rolls WHERE id=$1', [id]);
            if (rec) { const rem = calcRemaining(rec.qty_imported, rec.qty_waste, rec.qty_error, rec.qty_printed);
                await db.run(`UPDATE pettem_rolls SET qty_remaining=$1 WHERE id=$2`, [rem, id]); }
        }
        await db.run(`INSERT INTO pettem_history (roll_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', `${field}: ${value}`, req.user.id, now]);
        return { success: true };
    });

    // ========== UPDATE ==========
    fastify.put('/api/pettem/rolls/:id', { preHandler: [authenticate] }, async (req) => {
        const id = Number(req.params.id), b = req.body || {}, now = vnNow();
        const rem = calcRemaining(b.qty_imported, b.qty_waste, b.qty_error, b.qty_printed);
        await db.run(`UPDATE pettem_rolls SET roll_type=$1,import_date=$2,field_name=$3,qty_imported=$4,qty_waste=$5,
            qty_error=$6,qty_printed=$7,qty_remaining=$8,confirmed_by=$9,notes=$10,updated_at=$11 WHERE id=$12`,
            [b.roll_type, b.import_date||null, b.field_name||null,
             Number(b.qty_imported)||0, Number(b.qty_waste)||0, Number(b.qty_error)||0, Number(b.qty_printed)||0,
             rem, b.confirmed_by||null, b.notes||null, now, id]);
        await db.run(`INSERT INTO pettem_history (roll_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật cây', req.user.id, now]);
        return { success: true };
    });

    // ========== DELETE ==========
    fastify.delete('/api/pettem/rolls/:id', { preHandler: [authenticate] }, async (req) => {
        await db.run('DELETE FROM pettem_rolls WHERE id=$1', [Number(req.params.id)]);
        return { success: true };
    });

    // ========== STAFF ==========
    fastify.get('/api/pettem/staff', { preHandler: [authenticate] }, async () => {
        return { staff: await db.all(`SELECT id, full_name FROM users WHERE status='active' AND role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien') ORDER BY full_name`) };
    });
};
