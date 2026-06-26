// ========== VẬT LIỆU PET/TEM — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow, vnDateStr } = require('../utils/timezone');

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
    await db.exec(`ALTER TABLE pettem_rolls ADD COLUMN IF NOT EXISTS material_tx_id INTEGER REFERENCES material_transactions(id) ON DELETE SET NULL`);
    await db.exec(`ALTER TABLE pettem_rolls ADD COLUMN IF NOT EXISTS xuat_tx_id INTEGER REFERENCES material_transactions(id) ON DELETE SET NULL`);
    await db.exec(`ALTER TABLE pettem_rolls ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN DEFAULT FALSE`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ptr_type ON pettem_rolls(roll_type)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ptr_date ON pettem_rolls(import_date)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ptr_material_tx ON pettem_rolls(material_tx_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ptr_xuat_tx ON pettem_rolls(xuat_tx_id)`);
    } catch(e) { console.error('[PT] rolls migration error:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS pettem_history (
        id SERIAL PRIMARY KEY, roll_id INTEGER NOT NULL REFERENCES pettem_rolls(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_pth_rid ON pettem_history(roll_id)`);
    } catch(e) { console.error('[PT] hist:', e.message); }

    try {
        await db.run(`ALTER TABLE printing_records ADD COLUMN IF NOT EXISTS pettem_roll_id INTEGER REFERENCES pettem_rolls(id) ON DELETE SET NULL`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_pr_pettem_roll ON printing_records(pettem_roll_id)`);
    } catch(e) { console.error('[PT] printing_records migration:', e.message); }

    // ========== HELPERS ==========
    const TYPES = ['PET','TEM','DECAL'];
    const LABELS = {PET:'PET',TEM:'Tem',DECAL:'Decal'};
    function calcRemaining(imp,waste,err,printed) {
        return (Number(imp)||0) - (Number(waste)||0) - (Number(err)||0) - (Number(printed)||0);
    }
    async function syncPettemRollMeters(rollId) {
        if (!rollId) return;
        try {
            const sumRow = await db.get(`
                SELECT COALESCE(SUM(print_meters), 0)::numeric AS total_printed
                FROM printing_records
                WHERE pettem_roll_id = $1
            `, [Number(rollId)]);
            const totalPrinted = Number(sumRow.total_printed) || 0;

            const roll = await db.get(`SELECT qty_imported, qty_waste, qty_error FROM pettem_rolls WHERE id = $1`, [Number(rollId)]);
            if (roll) {
                const rem = Number(roll.qty_imported) - Number(roll.qty_waste) - Number(roll.qty_error) - totalPrinted;
                await db.run(`
                    UPDATE pettem_rolls
                    SET qty_printed = $1, qty_remaining = $2, updated_at = NOW()
                    WHERE id = $3
                `, [totalPrinted, rem, Number(rollId)]);
            }
        } catch (err) {
            console.error('[PT] syncPettemRollMeters error:', err.message);
        }
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
            SELECT r.*, COALESCE(uc.full_name, uc.username) AS confirmed_by_name,
                   lh.performed_at AS last_update_at, COALESCE(lhu.full_name, lhu.username) AS last_update_by,
                   seq_list.seq
            FROM pettem_rolls r
            LEFT JOIN users uc ON r.confirmed_by=uc.id
            LEFT JOIN (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY material_item_id ORDER BY performed_at ASC, id ASC) AS seq
                FROM material_transactions
                WHERE tx_type = 'NHAP'
            ) seq_list ON r.material_tx_id = seq_list.id
            LEFT JOIN LATERAL (SELECT h.performed_at, h.performed_by FROM pettem_history h WHERE h.roll_id=r.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY r.import_date DESC NULLS LAST, r.created_at DESC`, params);
        return { rolls };
    });

    // ========== CREATE ==========
    fastify.post('/api/pettem/rolls', { preHandler: [authenticate] }, async (req) => {
        const b = req.body || {}, now = new Date();
        if (!b.roll_type || !TYPES.includes(b.roll_type)) return { error: 'Loại không hợp lệ' };
        const rem = calcRemaining(b.qty_imported, b.qty_waste, b.qty_error, b.qty_printed);
        const r = await db.get(`INSERT INTO pettem_rolls
            (roll_type,import_date,field_name,qty_imported,qty_waste,qty_error,qty_printed,qty_remaining,confirmed_by,notes,created_by,created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
            [b.roll_type, b.import_date||vnDateStr(now), b.field_name||null,
             Number(b.qty_imported)||0, Number(b.qty_waste)||0, Number(b.qty_error)||0, Number(b.qty_printed)||0,
             rem, b.confirmed_by||null, b.notes||null, req.user.id, now]);
        await db.run(`INSERT INTO pettem_history (roll_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [r.id, 'create', `Tạo cây ${LABELS[b.roll_type]}`, req.user.id, now]);
        return { success: true, id: r.id };
    });

    // ========== INLINE FIELD ==========
    fastify.patch('/api/pettem/rolls/:id/field', { preHandler: [authenticate] }, async (req) => {
        const id = Number(req.params.id), { field, value } = req.body || {}, now = new Date();
        const ALLOWED = ['roll_type','import_date','field_name','qty_imported','qty_waste','qty_error','qty_printed','confirmed_by','notes'];
        if (!ALLOWED.includes(field)) return { error: 'Trường không hợp lệ' };
        const numF = ['qty_imported','qty_waste','qty_error','qty_printed','confirmed_by'];
        const fv = numF.includes(field) ? (Number(value)||0) : (value||null);
        await db.run(`UPDATE pettem_rolls SET ${field}=$1, updated_at=$2 WHERE id=$3`, [fv, now, id]);
        
        // Propagate qty_imported change to corresponding XUAT transaction in warehouse
        if (field === 'qty_imported') {
            const roll = await db.get('SELECT xuat_tx_id FROM pettem_rolls WHERE id = $1', [id]);
            if (roll && roll.xuat_tx_id) {
                await db.run('UPDATE material_transactions SET quantity = $1 WHERE id = $2 AND tx_type = \'XUAT\'', [fv, roll.xuat_tx_id]);
            }
        }

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
        const id = Number(req.params.id), b = req.body || {}, now = new Date();
        const rem = calcRemaining(b.qty_imported, b.qty_waste, b.qty_error, b.qty_printed);
        await db.run(`UPDATE pettem_rolls SET roll_type=$1,import_date=$2,field_name=$3,qty_imported=$4,qty_waste=$5,
            qty_error=$6,qty_printed=$7,qty_remaining=$8,confirmed_by=$9,notes=$10,updated_at=$11 WHERE id=$12`,
            [b.roll_type, b.import_date||null, b.field_name||null,
             Number(b.qty_imported)||0, Number(b.qty_waste)||0, Number(b.qty_error)||0, Number(b.qty_printed)||0,
             rem, b.confirmed_by||null, b.notes||null, now, id]);

        // Propagate qty_imported change to corresponding XUAT transaction in warehouse
        if (b.qty_imported !== undefined) {
            const roll = await db.get('SELECT xuat_tx_id FROM pettem_rolls WHERE id = $1', [id]);
            if (roll && roll.xuat_tx_id) {
                await db.run('UPDATE material_transactions SET quantity = $1 WHERE id = $2 AND tx_type = \'XUAT\'', [Number(b.qty_imported) || 0, roll.xuat_tx_id]);
            }
        }

        await db.run(`INSERT INTO pettem_history (roll_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật cây', req.user.id, now]);
        return { success: true };
    });

    // ========== DELETE ==========
    fastify.delete('/api/pettem/rolls/:id', { preHandler: [authenticate] }, async (req) => {
        const id = Number(req.params.id);
        const roll = await db.get('SELECT material_tx_id, xuat_tx_id FROM pettem_rolls WHERE id = $1', [id]);
        if (roll) {
            if (roll.xuat_tx_id) {
                await db.run('DELETE FROM material_transactions WHERE id = $1 AND tx_type = \'XUAT\'', [roll.xuat_tx_id]);
            } else if (roll.material_tx_id) {
                // Fallback for older rolls before migration
                await db.run('DELETE FROM material_transactions WHERE parent_tx_id = $1 AND tx_type = \'XUAT\'', [roll.material_tx_id]);
            }
        }
        await db.run('DELETE FROM pettem_rolls WHERE id=$1', [id]);
        return { success: true };
    });

    // ========== IMPORT FROM WAREHOUSE ==========
    fastify.post('/api/pettem/rolls/import-from-warehouse', { preHandler: [authenticate] }, async (req, reply) => {
        const b = req.body || {}, now = new Date();
        
        if (!b.roll_type || !['PET', 'TEM', 'DECAL'].includes(b.roll_type)) {
            return reply.code(400).send({ error: 'Loại không hợp lệ (chỉ hỗ trợ PET, TEM hoặc DECAL)' });
        }
        
        const selectedTxId = Number(b.material_tx_id);
        if (!selectedTxId || isNaN(selectedTxId)) {
            return reply.code(400).send({ error: 'Vui lòng chọn lô nhập từ Kho Vật Liệu' });
        }

        let materialItemId;
        if (b.roll_type === 'PET') materialItemId = 4;
        else if (b.roll_type === 'TEM') materialItemId = 11;
        else if (b.roll_type === 'DECAL') materialItemId = 21;

        const pool = db.getDB();
        let client;
        
        try {
            client = await pool.connect();
            await client.query('BEGIN');

            // 0. Check if there is already an active (unclosed) roll of this type in the workshop
            const activeRollRes = await client.query(`
                SELECT id, qty_remaining 
                FROM pettem_rolls 
                WHERE roll_type = $1 AND confirmed_by IS NULL
                LIMIT 1
            `, [b.roll_type]);
            
            if (activeRollRes.rows.length > 0) {
                const activeRoll = activeRollRes.rows[0];
                const err = new Error(`Không thể thêm vật liệu mới. Cuộn ${b.roll_type} hiện tại chưa được sử dụng hết hoặc chưa chốt cuộn (Tồn cuối: ${Number(activeRoll.qty_remaining).toLocaleString('vi-VN')} mét).`);
                err.statusCode = 400;
                throw err;
            }

            // 1. Check if there is any other lot of this material type that is currently partially exported (remaining_qty < quantity)
            const partialLots = await client.query(`
                SELECT mt.id,
                       (mt.quantity - COALESCE((SELECT SUM(quantity) FROM material_transactions WHERE parent_tx_id = mt.id AND tx_type = 'XUAT' AND printing_record_id IS NULL), 0))::numeric AS remaining_qty
                FROM material_transactions mt
                WHERE mt.material_item_id = $1 AND mt.tx_type = 'NHAP'
                  AND (mt.quantity - COALESCE((SELECT SUM(quantity) FROM material_transactions WHERE parent_tx_id = mt.id AND tx_type = 'XUAT' AND printing_record_id IS NULL), 0)) > 0
                  AND (mt.quantity - COALESCE((SELECT SUM(quantity) FROM material_transactions WHERE parent_tx_id = mt.id AND tx_type = 'XUAT' AND printing_record_id IS NULL), 0)) < mt.quantity
                LIMIT 1
            `, [materialItemId]);

            if (partialLots.rows.length > 0) {
                const partialLotId = Number(partialLots.rows[0].id);
                if (selectedTxId !== partialLotId) {
                    const err = new Error(`Bắt buộc phải xuất hết phần còn lại của cây đang dở dang trước khi sang cây mới.`);
                    err.statusCode = 400;
                    throw err;
                }
            }
            
            // 2. Get the selected NHAP lot and verify its remaining quantity
            const lotRes = await client.query(`
                SELECT 
                    mt.id, mt.quantity::numeric AS quantity,
                    (mt.quantity - COALESCE((SELECT SUM(quantity) FROM material_transactions WHERE parent_tx_id = mt.id AND tx_type = 'XUAT' AND printing_record_id IS NULL), 0))::numeric AS remaining_qty
                FROM material_transactions mt
                WHERE mt.id = $1 AND mt.tx_type = 'NHAP' AND mt.material_item_id = $2
            `, [selectedTxId, materialItemId]);

            if (lotRes.rows.length === 0) {
                const err = new Error('Không tìm thấy lô nhập này trong Kho Vật Liệu');
                err.statusCode = 400;
                throw err;
            }

            const remainingQty = Number(lotRes.rows[0].remaining_qty);
            if (remainingQty <= 0) {
                const err = new Error(`Lô nhập #${selectedTxId} đã hết hoặc đã được xuất hết sang bộ phận in.`);
                err.statusCode = 400;
                throw err;
            }

            // Read the custom qty_imported from request, validate it
            const requestedQty = Number(b.qty_imported);
            if (isNaN(requestedQty) || requestedQty <= 0) {
                const err = new Error('Số lượng mét xuất kho không hợp lệ');
                err.statusCode = 400;
                throw err;
            }
            if (requestedQty > remainingQty) {
                const err = new Error(`Số mét xuất (${requestedQty}m) vượt quá số lượng tồn kho còn lại (${remainingQty}m)`);
                err.statusCode = 400;
                throw err;
            }

            // If this lot was already partially exported, force exporting the entire remaining quantity
            const hasPrevExportsRes = await client.query(`
                SELECT COUNT(*)::int AS cnt 
                FROM material_transactions 
                WHERE parent_tx_id = $1 AND tx_type = 'XUAT' AND printing_record_id IS NULL
            `, [selectedTxId]);
            const hasPrevExports = hasPrevExportsRes.rows[0].cnt > 0;
            
            if (hasPrevExports && requestedQty < remainingQty) {
                const err = new Error(`Lô này đã được xuất một phần trước đó. Lần xuất này bắt buộc phải xuất toàn bộ phần còn lại (${remainingQty}m) để chốt hết cây.`);
                err.statusCode = 400;
                throw err;
            }

            const qty = requestedQty;

            // 3. Insert into material_transactions (XUAT)
            const notes = b.notes ? b.notes : `Xuất màng in sang bộ phận in ${b.roll_type} (Lô nguồn: #${selectedTxId})`;
            const txRes = await client.query(`
                INSERT INTO material_transactions 
                (material_item_id, tx_type, quantity, price, total_amount, performed_by, performed_at, notes, created_at, parent_tx_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7, $9) RETURNING id
            `, [materialItemId, 'XUAT', qty, 0, 0, req.user.id, now, notes, selectedTxId]);
            
            const materialTxId = txRes.rows[0].id;

            // 4. Insert into pettem_rolls
            const seqRes = await client.query(`
                SELECT seq FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY material_item_id ORDER BY performed_at ASC, id ASC) AS seq
                    FROM material_transactions
                    WHERE tx_type = 'NHAP'
                ) s WHERE id = $1
            `, [selectedTxId]);
            const seq = seqRes.rows[0]?.seq || 1;

            const existingCountRes = await client.query(`
                SELECT COUNT(*)::int AS cnt 
                FROM pettem_rolls 
                WHERE material_tx_id = $1
            `, [selectedTxId]);
            const nextPartNumber = existingCountRes.rows[0].cnt + 1;

            let label = b.roll_type === 'PET' ? 'Pet' : b.roll_type === 'TEM' ? 'Tem' : 'Decal';
            let fieldName = `Cây ${label} #${seq}`;
            if (nextPartNumber > 1) {
                fieldName += ` (Lần ${nextPartNumber})`;
            }

            const rollTypeLabel = b.roll_type;
            const rollNotes = `Nhập từ Kho Vật Liệu Màng In ${rollTypeLabel} (Giao dịch gốc #${selectedTxId})` + (b.notes ? ` - ${b.notes}` : '');
            
            const rollRes = await client.query(`
                INSERT INTO pettem_rolls
                (roll_type, import_date, field_name, qty_imported, qty_waste, qty_error, qty_printed, qty_remaining, notes, created_by, created_at, material_tx_id, xuat_tx_id)
                VALUES ($1, $2, $3, $4, 0, 0, 0, $4, $5, $6, $7, $8, $9) RETURNING id
            `, [b.roll_type, b.import_date || vnDateStr(now), fieldName, qty, rollNotes, req.user.id, now, selectedTxId, materialTxId]);
            
            const rollId = rollRes.rows[0].id;

            // 5. Insert into pettem_history
            await client.query(`
                INSERT INTO pettem_history 
                (roll_id, action, details, performed_by, performed_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [rollId, 'create', `Nhập từ Kho Vật Liệu (Số lượng: ${qty}m, Lô nguồn: #${selectedTxId})`, req.user.id, now]);

            await client.query('COMMIT');
            return { success: true, id: rollId };
        } catch(e) {
            if (client) {
                try {
                    await client.query('ROLLBACK');
                } catch(rollbackErr) {
                    console.error('[PT] ROLLBACK failed:', rollbackErr);
                }
            }
            console.error('[PT] Import from warehouse failed:', e);
            const status = e.statusCode || 500;
            const msg = status === 500 ? 'Lỗi hệ thống khi xuất kho: ' + e.message : e.message;
            return reply.code(status).send({ error: msg });
        } finally {
            if (client) {
                client.release();
            }
        }
    });

    // ========== STAFF ==========
    fastify.get('/api/pettem/staff', { preHandler: [authenticate] }, async () => {
        return { staff: await db.all(`SELECT id, full_name FROM users WHERE status='active' AND role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien') ORDER BY full_name`) };
    });

    // ========== GET ACTIVE ROLLS FOR SELECTION ==========
    fastify.get('/api/pettem/active-rolls', { preHandler: [authenticate] }, async (req) => {
        const { roll_type } = req.query;
        let where = 'WHERE 1=1', params = [];
        if (roll_type) {
            where += ` AND roll_type = $1`;
            params.push(roll_type);
        }
        const rolls = await db.all(`
            SELECT id, roll_type, import_date, qty_imported, qty_remaining, notes, confirmed_by
            FROM pettem_rolls
            ${where}
            ORDER BY confirmed_by ASC NULLS FIRST, import_date DESC, id DESC
            LIMIT 30
        `, params);
        return { rolls };
    });

    // ========== GET INDIVIDUAL ROLL DETAILS ==========
    fastify.get('/api/pettem/rolls/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const roll = await db.get(`
            SELECT r.*, COALESCE(u.full_name, u.username) AS created_by_name, COALESCE(uc.full_name, uc.username) AS confirmed_by_name,
                   seq_list.seq
            FROM pettem_rolls r
            LEFT JOIN users u ON r.created_by = u.id
            LEFT JOIN users uc ON r.confirmed_by = uc.id
            LEFT JOIN (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY material_item_id ORDER BY performed_at ASC, id ASC) AS seq
                FROM material_transactions
                WHERE tx_type = 'NHAP'
            ) seq_list ON r.material_tx_id = seq_list.id
            WHERE r.id = $1
        `, [Number(req.params.id)]);
        if (!roll) return reply.code(404).send({ error: 'Không tìm thấy cuộn vật liệu' });
        return { roll };
    });

    // ========== GET HISTORY OF INDIVIDUAL ROLL ==========
    fastify.get('/api/pettem/rolls/:id/history', { preHandler: [authenticate] }, async (req) => {
        const history = await db.all(`
            SELECT h.*, COALESCE(u.full_name, u.username) AS performer_name
            FROM pettem_history h
            LEFT JOIN users u ON h.performed_by = u.id
            WHERE h.roll_id = $1
            ORDER BY h.performed_at DESC
        `, [Number(req.params.id)]);
        return { history };
    });

    // ========== GET ORDERS PRINTED ON INDIVIDUAL ROLL ==========
    fastify.get('/api/pettem/rolls/:id/orders', { preHandler: [authenticate] }, async (req) => {
        const orders = await db.all(`
            SELECT pr.id, o.order_code, pr.order_quantity, pr.print_meters, pr.print_done_at,
                   COALESCE(u.full_name, u.username) AS printer_name, c.name AS contractor_name
            FROM printing_records pr
            LEFT JOIN dht_orders o ON pr.dht_order_id = o.id
            LEFT JOIN users u ON pr.printer_id = u.id
            LEFT JOIN printing_contractors c ON pr.contractor_id = c.id
            WHERE pr.pettem_roll_id = $1
            ORDER BY pr.print_done_at DESC, pr.id DESC
        `, [Number(req.params.id)]);
        return { orders };
    });

    // ========== ADJUST WASTE ==========
    fastify.post('/api/pettem/rolls/:id/adjust-waste', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const { qty, reason } = req.body || {};
        const qNum = Number(qty);
        if (isNaN(qNum) || qNum <= 0) return reply.code(400).send({ error: 'Số lượng không hợp lệ' });
        if (!reason || !reason.trim()) return reply.code(400).send({ error: 'Lý do hao hụt là bắt buộc' });
        
        const roll = await db.get('SELECT qty_imported, qty_waste, qty_error, qty_printed, pending_approval, confirmed_by FROM pettem_rolls WHERE id=$1', [id]);
        if (!roll) return reply.code(404).send({ error: 'Không tìm thấy cuộn vật liệu' });
        if (roll.confirmed_by) return reply.code(400).send({ error: 'Cuộn vật liệu đã chốt' });
        if (roll.pending_approval) return reply.code(400).send({ error: 'Cuộn vật liệu đang chờ Giám đốc duyệt chốt cuộn, không thể điều chỉnh.' });
        
        const newWaste = (Number(roll.qty_waste) || 0) + qNum;
        const rem = (Number(roll.qty_imported) || 0) - newWaste - (Number(roll.qty_error) || 0) - (Number(roll.qty_printed) || 0);
        
        await db.run(`
            UPDATE pettem_rolls 
            SET qty_waste = $1, qty_remaining = $2, updated_at = NOW() 
            WHERE id = $3
        `, [newWaste, rem, id]);
        
        await db.run(`
            INSERT INTO pettem_history (roll_id, action, details, performed_by, performed_at)
            VALUES ($1, $2, $3, $4, NOW())
        `, [id, 'waste', `Khai báo hao hụt: +${qNum}m (Lý do: ${reason.trim()})`, req.user.id]);
        
        return { success: true };
    });

    // ========== ADJUST ERROR ==========
    fastify.post('/api/pettem/rolls/:id/adjust-error', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const { qty, reason } = req.body || {};
        const qNum = Number(qty);
        if (isNaN(qNum) || qNum <= 0) return reply.code(400).send({ error: 'Số lượng không hợp lệ' });
        if (!reason || !reason.trim()) return reply.code(400).send({ error: 'Lý do lỗi sản xuất là bắt buộc' });
        
        const roll = await db.get('SELECT qty_imported, qty_waste, qty_error, qty_printed, pending_approval, confirmed_by FROM pettem_rolls WHERE id=$1', [id]);
        if (!roll) return reply.code(404).send({ error: 'Không tìm thấy cuộn vật liệu' });
        if (roll.confirmed_by) return reply.code(400).send({ error: 'Cuộn vật liệu đã chốt' });
        if (roll.pending_approval) return reply.code(400).send({ error: 'Cuộn vật liệu đang chờ Giám đốc duyệt chốt cuộn, không thể điều chỉnh.' });
        
        const newError = (Number(roll.qty_error) || 0) + qNum;
        const rem = (Number(roll.qty_imported) || 0) - (Number(roll.qty_waste) || 0) - newError - (Number(roll.qty_printed) || 0);
        
        await db.run(`
            UPDATE pettem_rolls 
            SET qty_error = $1, qty_remaining = $2, updated_at = NOW() 
            WHERE id = $3
        `, [newError, rem, id]);
        
        await db.run(`
            INSERT INTO pettem_history (roll_id, action, details, performed_by, performed_at)
            VALUES ($1, $2, $3, $4, NOW())
        `, [id, 'error', `Khai báo sản xuất lỗi: +${qNum}m (Lý do: ${reason.trim()})`, req.user.id]);
        
        return { success: true };
    });

    // ========== RESET ADJUSTMENTS ==========
    fastify.post('/api/pettem/rolls/:id/reset', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const roll = await db.get('SELECT qty_imported, qty_printed FROM pettem_rolls WHERE id=$1', [id]);
        if (!roll) return reply.code(404).send({ error: 'Không tìm thấy cuộn vật liệu' });
        
        const rem = (Number(roll.qty_imported) || 0) - (Number(roll.qty_printed) || 0);
        await db.run(`
            UPDATE pettem_rolls
            SET qty_waste = 0, qty_error = 0, qty_remaining = $1, confirmed_by = NULL, pending_approval = FALSE, updated_at = NOW()
            WHERE id = $2
        `, [rem, id]);
        
        await db.run(`
            INSERT INTO pettem_history (roll_id, action, details, performed_by, performed_at)
            VALUES ($1, $2, $3, $4, NOW())
        `, [id, 'reset', 'Reset hao hụt/lỗi/chốt cuộn về 0', req.user.id]);
        
        return { success: true };
    });

    // ========== CLOSE ROLL ==========
    fastify.post('/api/pettem/rolls/:id/close', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const roll = await db.get('SELECT roll_type, qty_imported, qty_waste, qty_error, qty_remaining, confirmed_by, pending_approval FROM pettem_rolls WHERE id=$1', [id]);
        if (!roll) return reply.code(404).send({ error: 'Không tìm thấy cuộn vật liệu' });
        
        if (roll.confirmed_by) {
            return reply.code(400).send({ error: 'Cuộn vật liệu đã chốt' });
        }
        if (roll.pending_approval) {
            return reply.code(400).send({ error: 'Cuộn vật liệu đang chờ Giám đốc duyệt chốt' });
        }
        
        if (Math.abs(Number(roll.qty_remaining)) > 0.001) {
            return reply.code(400).send({ error: 'Chỉ được chốt cuộn khi tồn cuối bằng 0 (đã sử dụng hết)' });
        }

        // Check waste + error limit
        const type = roll.roll_type;
        const qtyImported = Number(roll.qty_imported) || 0;
        const totalWasteError = (Number(roll.qty_waste) || 0) + (Number(roll.qty_error) || 0);

        let allowedPct = 5; // default
        if (type === 'PET') allowedPct = 5;
        else if (type === 'TEM') allowedPct = 5;
        else if (type === 'DECAL') allowedPct = 10;

        const configKey = `pettem_allowed_waste_${type.toLowerCase()}`;
        const configRow = await db.get('SELECT value FROM app_config WHERE key = ?', [configKey]);
        if (configRow && configRow.value) {
            const val = Number(configRow.value);
            if (!isNaN(val)) allowedPct = val;
        }

        const maxAllowed = qtyImported * (allowedPct / 100);
        const isExceeded = totalWasteError - maxAllowed > 0.001;

        if (isExceeded) {
            const isDirector = req.user.role === 'giam_doc';
            if (!isDirector) {
                await db.run(`
                    UPDATE pettem_rolls
                    SET pending_approval = TRUE, updated_at = NOW()
                    WHERE id = $1
                `, [id]);

                await db.run(`
                    INSERT INTO pettem_history (roll_id, action, details, performed_by, performed_at)
                    VALUES ($1, $2, $3, $4, NOW())
                `, [id, 'pending_approval', `Gửi yêu cầu chốt cuộn lên Giám đốc (vượt hạn mức: ${totalWasteError.toFixed(2)}m > ${maxAllowed.toFixed(2)}m)`, req.user.id]);

                return { success: true, pending_approval: true, message: 'Đã gửi yêu cầu chốt cuộn lên Giám đốc.' };
            }
        }
        
        // Either not exceeded, or is director -> close immediately
        await db.run(`
            UPDATE pettem_rolls
            SET confirmed_by = $1, pending_approval = FALSE, updated_at = NOW()
            WHERE id = $2
        `, [req.user.id, id]);
        
        const closeMethod = isExceeded 
            ? `Giám đốc duyệt chốt cuộn trực tiếp (vượt hạn mức: ${totalWasteError.toFixed(2)}m > ${maxAllowed.toFixed(2)}m)`
            : 'Chốt cuộn vật liệu';

        await db.run(`
            INSERT INTO pettem_history (roll_id, action, details, performed_by, performed_at)
            VALUES ($1, $2, $3, $4, NOW())
        `, [id, 'close', closeMethod, req.user.id]);
        
        return { success: true };
    });

    // ========== APPROVE CLOSE ROLL (DIRECTOR ONLY) ==========
    fastify.post('/api/pettem/rolls/:id/approve', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        if (req.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám đốc mới có quyền duyệt chốt cuộn.' });
        }
        
        const roll = await db.get('SELECT roll_type, qty_imported, qty_waste, qty_error, pending_approval, confirmed_by FROM pettem_rolls WHERE id=$1', [id]);
        if (!roll) return reply.code(404).send({ error: 'Không tìm thấy cuộn vật liệu' });
        if (roll.confirmed_by) return reply.code(400).send({ error: 'Cuộn vật liệu đã chốt' });
        if (!roll.pending_approval) return reply.code(400).send({ error: 'Cuộn vật liệu không trong trạng thái chờ duyệt' });

        const qtyImported = Number(roll.qty_imported) || 0;
        const totalWasteError = (Number(roll.qty_waste) || 0) + (Number(roll.qty_error) || 0);

        await db.run(`
            UPDATE pettem_rolls
            SET confirmed_by = $1, pending_approval = FALSE, updated_at = NOW()
            WHERE id = $2
        `, [req.user.id, id]);

        await db.run(`
            INSERT INTO pettem_history (roll_id, action, details, performed_by, performed_at)
            VALUES ($1, $2, $3, $4, NOW())
        `, [id, 'close', `Giám đốc phê duyệt yêu cầu chốt cuộn (hao hụt: ${totalWasteError.toFixed(2)}m / ${qtyImported}m)`, req.user.id]);

        return { success: true };
    });

    // ========== REJECT CLOSE ROLL (DIRECTOR ONLY) ==========
    fastify.post('/api/pettem/rolls/:id/reject', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        if (req.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám đốc mới có quyền từ chối chốt cuộn.' });
        }
        
        const roll = await db.get('SELECT pending_approval, confirmed_by FROM pettem_rolls WHERE id=$1', [id]);
        if (!roll) return reply.code(404).send({ error: 'Không tìm thấy cuộn vật liệu' });
        if (roll.confirmed_by) return reply.code(400).send({ error: 'Cuộn vật liệu đã chốt' });
        if (!roll.pending_approval) return reply.code(400).send({ error: 'Cuộn vật liệu không trong trạng thái chờ duyệt' });

        await db.run(`
            UPDATE pettem_rolls
            SET pending_approval = FALSE, updated_at = NOW()
            WHERE id = $1
        `, [id]);

        await db.run(`
            INSERT INTO pettem_history (roll_id, action, details, performed_by, performed_at)
            VALUES ($1, $2, $3, $4, NOW())
        `, [id, 'reject', 'Giám đốc từ chối yêu cầu chốt cuộn', req.user.id]);

        return { success: true };
    });
};
