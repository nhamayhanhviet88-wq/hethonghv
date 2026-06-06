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
        await db.exec(`CREATE TABLE IF NOT EXISTS printing_fields (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        
        // Pre-populate defaults if empty
        const countRes = await db.get(`SELECT COUNT(*)::int AS cnt FROM printing_fields`);
        if (countRes.cnt === 0) {
            const defaults = ['IN PET', 'IN DECAL', 'THÊU', 'IN 3D', 'IN LƯỚI', 'IN KHÁC'];
            for (let i = 0; i < defaults.length; i++) {
                await db.run(`INSERT INTO printing_fields (name, display_order) VALUES ($1, $2)`, [defaults[i], i]);
            }
            console.log('[BPI] Pre-populated default printing fields');
        }
    } catch(e) { console.error('[BPI] printing_fields migrate:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS printing_field_operators (
            id SERIAL PRIMARY KEY,
            field_id INTEGER NOT NULL REFERENCES printing_fields(id) ON DELETE CASCADE,
            operator_type VARCHAR(20) NOT NULL, -- 'user' or 'contractor'
            operator_id INTEGER NOT NULL,
            UNIQUE(field_id, operator_type, operator_id)
        )`);
    } catch(e) { console.error('[BPI] printing_field_operators migrate:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS qlx_order_print_assignments (
            id SERIAL PRIMARY KEY,
            dht_order_id INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            field_id INTEGER NOT NULL REFERENCES printing_fields(id) ON DELETE CASCADE,
            operator_type VARCHAR(20) NOT NULL, -- 'user' or 'contractor'
            operator_id INTEGER NOT NULL,
            assigned_by INTEGER REFERENCES users(id),
            assigned_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(dht_order_id, field_id, operator_type, operator_id)
        )`);
    } catch(e) { console.error('[BPI] qlx_order_print_assignments migrate:', e.message); }

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
        await db.run(`ALTER TABLE printing_records ADD COLUMN IF NOT EXISTS audit_checked BOOLEAN DEFAULT FALSE`);
        await db.run(`ALTER TABLE printing_records ADD COLUMN IF NOT EXISTS audit_checked_at TIMESTAMPTZ DEFAULT NULL`);
        await db.run(`ALTER TABLE printing_records ADD COLUMN IF NOT EXISTS audit_checked_by INTEGER DEFAULT NULL REFERENCES users(id)`);
        await db.run(`ALTER TABLE printing_records ADD COLUMN IF NOT EXISTS audit_note TEXT DEFAULT NULL`);
    } catch(e) { console.error('[BPI] audit columns migration error:', e.message); }

    try {
        await db.exec(`ALTER TABLE printing_records ALTER COLUMN print_date TYPE TIMESTAMPTZ USING print_date::TIMESTAMPTZ`);
    } catch(e) { console.warn('[BPI] print_date type migration warning:', e.message); }

    try {
        await db.run(`ALTER TABLE printing_records ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL`);
    } catch(e) { console.error('[BPI] image_url column migration error:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS printing_history (
            id SERIAL PRIMARY KEY, printing_id INTEGER NOT NULL REFERENCES printing_records(id) ON DELETE CASCADE,
            action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
            performed_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_ph_pid ON printing_history(printing_id)`);
    } catch(e) { console.error('[BPI] history:', e.message); }

    // ========== HELPERS ==========
    const MGMT_ROLES = ['giam_doc', 'quan_ly_xuong', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'];
    async function isPrintManager(req) {
        if (MGMT_ROLES.includes(req.user.role)) return true;
        const dept = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (dept && dept.name) { const n = dept.name.toLowerCase(); if (n.includes('qlx') || n.includes('in') || n.includes('quản lý xưởng')) return true; }
        return false;
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
            console.error('[BPI] syncPettemRollMeters error:', err.message);
        }
    }

    async function getOrCreatePrintingRecord(idStr, userId) {
        if (typeof idStr === 'string' && idStr.startsWith('dht_')) {
            const dhtOrderId = Number(idStr.replace('dht_', ''));
            const existing = await db.get('SELECT id FROM printing_records WHERE dht_order_id = $1', [dhtOrderId]);
            if (existing) return existing.id;

            const order = await db.get('SELECT * FROM dht_orders WHERE id=$1', [dhtOrderId]);
            if (!order) throw new Error('Không tìm thấy đơn hàng gốc');

            const items = await db.all('SELECT description, quantity FROM dht_order_items WHERE dht_order_id = $1', [dhtOrderId]);
            
            const isPetOrTem = order.category_id === 8 || order.category_id === 9 ||
                               (order.order_code && (order.order_code.includes('GCPET') || order.order_code.includes('GCTEM')));
            let prodName;
            if (isPetOrTem) {
                const filteredItems = items.filter(item => {
                    const desc = (item.description || '').toLowerCase().trim();
                    return !desc.includes('thiết kế') && !desc.includes('thiet ke') && desc !== 'tk';
                });
                prodName = filteredItems.map(item => {
                    let desc = (item.description || '').trim();
                    if (/tờ|to/i.test(desc)) desc = 'Tờ';
                    else if (/mét|met/i.test(desc)) desc = 'Mét';
                    return `${item.quantity || 0} ${desc}`;
                }).join('; ') || '—';
            } else {
                prodName = items.map(i => `${i.description} (SL: ${i.quantity})`).join('; ') || '—';
            }

            const orderQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            const cskh = await db.get('SELECT u.full_name FROM dht_orders o LEFT JOIN users u ON o.cskh_user_id = u.id WHERE o.id = $1', [dhtOrderId]);
            const cskhName = cskh ? cskh.full_name : '—';
            const isPet = order.category_id === 8 || (order.order_code && order.order_code.includes('GCPET'));
            const fieldName = isPet ? 'IN PET' : 'IN TEM';
            const now = vnNow();

            const r = await db.get(`
                INSERT INTO printing_records (dht_order_id, print_date, product_name, cskh_name, order_quantity, print_field, created_by, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING id`,
                [dhtOrderId, order.order_date, prodName, cskhName, orderQty, fieldName, userId, now]
            );

            await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [r.id, 'create', 'Tạo đơn in từ Đơn Hàng Tổng', userId, now]);

            return r.id;
        }
        return Number(idStr);
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
        let userFilter = '';
        let params = [];
        if (!isManager && !['quan_ly', 'truong_phong'].includes(req.user.role)) {
            userFilter = 'AND (pr.printer_id = $1 OR (pr.printer_id IS NULL AND pr.contractor_id IS NULL))';
            params.push(req.user.id);
        }

        const rows = await db.all(`
            WITH unified_printing AS (
                SELECT 
                    COALESCE(pr.print_date, o.order_date) AS print_date,
                    pr.printer_id,
                    pr.contractor_id,
                    pr.print_field,
                    pr.is_print_done,
                    pr.is_test_print,
                    pr.error_reported,
                    pr.created_at,
                    CASE 
                        WHEN pr.contractor_id IS NOT NULL THEN true
                        ELSE pr.is_print_done 
                    END AS is_completed
                FROM printing_records pr
                LEFT JOIN dht_orders o ON pr.dht_order_id = o.id
                WHERE 1=1 ${userFilter}

                UNION ALL

                SELECT 
                    o.order_date AS print_date,
                    NULL::int AS printer_id,
                    NULL::int AS contractor_id,
                    CASE WHEN o.category_id = 8 OR o.order_code LIKE '%GCPET%' THEN 'IN PET' ELSE 'IN TEM' END AS print_field,
                    false AS is_print_done,
                    false AS is_test_print,
                    false AS error_reported,
                    o.created_at,
                    false AS is_completed
                FROM dht_orders o
                WHERE (
                    (o.category_id IN (8, 9) AND o.parent_order_id IS NULL)
                    OR (o.parent_order_id IS NOT NULL AND (o.order_code LIKE '%GCPET%' OR o.order_code LIKE '%GCTEM%'))
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM printing_records pr 
                      WHERE pr.dht_order_id = o.id
                  )
            )
            SELECT 
                EXTRACT(YEAR FROM COALESCE(print_date, created_at))::int AS year,
                is_completed,
                is_test_print,
                error_reported,
                print_field
            FROM unified_printing
        `, params);

        const doneRows = await db.all(`
            SELECT 
                EXTRACT(YEAR FROM COALESCE(pr.print_done_at, pr.print_date, o.order_date, pr.created_at))::int AS year,
                EXTRACT(MONTH FROM COALESCE(pr.print_done_at, pr.print_date, o.order_date, pr.created_at))::int AS month,
                pr.printer_id,
                pr.contractor_id,
                pr.print_field,
                u.full_name AS printer_name,
                c.name AS contractor_name,
                COUNT(*)::int AS count
            FROM printing_records pr
            LEFT JOIN dht_orders o ON pr.dht_order_id = o.id
            LEFT JOIN users u ON pr.printer_id = u.id
            LEFT JOIN printing_contractors c ON pr.contractor_id = c.id
            WHERE (
                CASE 
                    WHEN pr.contractor_id IS NOT NULL THEN true
                    ELSE pr.is_print_done 
                END
            ) = true
            ${userFilter}
            GROUP BY year, month, pr.printer_id, pr.contractor_id, pr.print_field, u.full_name, c.name
            ORDER BY year DESC, month DESC
        `, params);

        const doneYearMap = {};
        for (const dr of doneRows) {
            const yr = dr.year || new Date().getFullYear();
            const mo = dr.month || 1;
            
            if (!doneYearMap[yr]) doneYearMap[yr] = {};
            if (!doneYearMap[yr][mo]) {
                doneYearMap[yr][mo] = {
                    pet: [],
                    tem: [],
                    decal: [],
                    contractors: []
                };
            }
            
            const monthData = doneYearMap[yr][mo];
            
            if (dr.contractor_id) {
                monthData.contractors.push({
                    operator_name: '🏭 ' + (dr.contractor_name || 'Gia công'),
                    operator_type: 'contractor',
                    operator_id: dr.contractor_id,
                    count: dr.count
                });
            } else {
                const worker = {
                    operator_name: dr.printer_name || 'Chưa phân công',
                    operator_type: 'user',
                    operator_id: dr.printer_id || 0,
                    count: dr.count
                };
                const fUpper = (dr.print_field || '').toUpperCase();
                if (fUpper.includes('PET')) {
                    monthData.pet.push(worker);
                } else if (fUpper.includes('DECAL')) {
                    monthData.decal.push(worker);
                } else {
                    monthData.tem.push(worker);
                }
            }
        }

        const yearMap = {};
        for (const r of rows) {
            const yr = r.year || new Date().getFullYear();
            if (!yearMap[yr]) {
                yearMap[yr] = {
                    year: yr,
                    count: 0,
                    pending: {
                        total: 0,
                        pet: 0,
                        decal: 0,
                        tem: 0
                    },
                    done: 0,
                    doneMonths: {}
                };
            }
            
            const item = yearMap[yr];
            item.count++;
            
            if (r.is_completed) {
                item.done++;
            } else {
                item.pending.total++;
                const fUpper = (r.print_field || '').toUpperCase();
                if (fUpper.includes('PET')) {
                    item.pending.pet++;
                } else if (fUpper.includes('DECAL')) {
                    item.pending.decal++;
                } else if (fUpper.includes('TEM')) {
                    item.pending.tem++;
                }
            }
        }

        for (const yr in yearMap) {
            yearMap[yr].doneMonths = doneYearMap[yr] || {};
        }
        
        const tree = Object.values(yearMap).sort((a, b) => b.year - a.year);
        const total = tree.reduce((sum, y) => sum + y.count, 0);
        
        const testing = rows.filter(r => r.is_test_print && !r.is_completed).length;
        const done = rows.filter(r => r.is_completed).length;
        const errors = rows.filter(r => r.error_reported).length;
        
        return { tree, total, stats: { total, testing, done, errors } };
    });

    // ========== LIST ==========
    fastify.get('/api/printing/records', { preHandler: [authenticate] }, async (req) => {
        const isManager = await isPrintManager(req);
        const { year, status, field, search, month, operator_type, operator_id } = req.query;
        
        let userFilter = '';
        let params = [];
        let idx = 1;
        if (!isManager && !['quan_ly', 'truong_phong'].includes(req.user.role)) {
            userFilter = `AND (pr.printer_id = $${idx++} OR (pr.printer_id IS NULL AND pr.contractor_id IS NULL))`;
            params.push(req.user.id);
        }

        let where = 'WHERE 1=1';
        if (year) {
            where += ` AND EXTRACT(YEAR FROM up.print_date) = $${idx++}`;
            params.push(Number(year));
        }
        if (month) {
            where += ` AND EXTRACT(MONTH FROM COALESCE(up.print_done_at, up.print_date)) = $${idx++}`;
            params.push(Number(month));
        }
        if (status) {
            if (status === 'pending') {
                where += ` AND up.is_completed = false`;
            } else if (status === 'done') {
                where += ` AND up.is_completed = true`;
            }
        }
        if (field) {
            where += ` AND up.print_field = $${idx++}`;
            params.push(field);
        }
        if (operator_type) {
            if (operator_type === 'user') {
                where += ` AND up.printer_id = $${idx++} AND up.contractor_id IS NULL`;
                params.push(Number(operator_id));
            } else if (operator_type === 'contractor') {
                where += ` AND up.contractor_id = $${idx++}`;
                params.push(Number(operator_id));
            }
        }
        if (search) {
            where += ` AND (up.product_name ILIKE $${idx} OR up.cskh_name ILIKE $${idx} OR up.order_code ILIKE $${idx} OR up.customer_name ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        let orderBy = 'ORDER BY up.print_date DESC NULLS LAST, up.created_at DESC';
        if (status === 'pending') {
            orderBy = `ORDER BY 
                CASE 
                    WHEN (COALESCE(up.order_code, '') ILIKE '%GCPET%' 
                       OR COALESCE(up.order_code, '') ILIKE '%GCTEM%' 
                       OR COALESCE(up.order_code, '') ILIKE '%SUAGCPET%' 
                       OR COALESCE(up.order_code, '') ILIKE '%SUAPET%' 
                       OR COALESCE(up.order_code, '') ILIKE '%SUAGCTEM%' 
                       OR COALESCE(up.order_code, '') ILIKE '%SUATEM%') THEN 0 
                    ELSE 1 
                END ASC,
                up.expected_ship_date ASC NULLS LAST,
                up.print_date DESC NULLS LAST, 
                up.created_at DESC`;
        }

        const records = await db.all(`
            WITH unified_printing AS (
                SELECT 
                    pr.id AS id,
                    pr.dht_order_id,
                    pr.material_tx_id,
                    pr.pettem_roll_id,
                    ptr.roll_type AS pettem_roll_type,
                    ptr.qty_remaining AS pettem_roll_remaining,
                    ptr.notes AS pettem_roll_notes,
                    o.order_code, o.shipping_priority,
                    o.expected_ship_date,
                    pr.is_test_print,
                    pr.test_print_at,
                    pr.test_print_by,
                    pr.is_print_done,
                    pr.print_done_at,
                    pr.print_done_by,
                    pr.audit_checked,
                    pr.audit_checked_at,
                    pr.audit_checked_by,
                    pr.audit_note,
                    u_audit.full_name AS audit_checked_by_name,
                    pr.error_reported,
                    pr.error_order_id,
                    COALESCE(pr.print_date, o.order_date) AS print_date,
                    pr.printer_id,
                    pr.contractor_id,
                    o.customer_name AS customer_name,
                    COALESCE(pr.product_name, (SELECT string_agg(description || ' (SL: ' || quantity || ')', '; ') FROM dht_order_items WHERE dht_order_id = o.id)) AS product_name,
                    COALESCE(pr.cskh_name, u_cskh.full_name) AS cskh_name,
                    COALESCE(pr.order_quantity, o.total_quantity, 0) AS order_quantity,
                    pr.print_meters,
                    pr.roll_start_qty,
                    pr.roll_end_qty,
                    pr.current_roll,
                    pr.print_field,
                    pr.shared_process,
                    pr.notes,
                    pr.created_by,
                    pr.created_at,
                    pr.updated_at,
                    pr.image_url,
                    'real' AS record_type,
                    c.name AS contractor_name,
                    u_pr.full_name AS printer_name,
                    u_test.full_name AS test_by_name,
                    u_done.full_name AS done_by_name,
                    CASE 
                        WHEN pr.contractor_id IS NOT NULL THEN true
                        ELSE pr.is_print_done 
                    END AS is_completed,
                    pr.order_item_id AS order_item_id,
                    o.category_id AS category_id
                FROM printing_records pr
                LEFT JOIN dht_orders o ON pr.dht_order_id = o.id
                LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
                LEFT JOIN printing_contractors c ON pr.contractor_id = c.id
                LEFT JOIN users u_pr ON pr.printer_id = u_pr.id
                LEFT JOIN users u_test ON pr.test_print_by = u_test.id
                LEFT JOIN users u_done ON pr.print_done_by = u_done.id
                LEFT JOIN users u_audit ON pr.audit_checked_by = u_audit.id
                LEFT JOIN pettem_rolls ptr ON pr.pettem_roll_id = ptr.id
                WHERE 1=1 ${userFilter}

                UNION ALL

                SELECT 
                    NULL::int AS id,
                    o.id AS dht_order_id,
                    NULL::int AS material_tx_id,
                    NULL::int AS pettem_roll_id,
                    NULL::text AS pettem_roll_type,
                    NULL::numeric AS pettem_roll_remaining,
                    NULL::text AS pettem_roll_notes,
                    o.order_code, o.shipping_priority,
                    o.expected_ship_date,
                    false AS is_test_print,
                    NULL::timestamptz AS test_print_at,
                    NULL::int AS test_print_by,
                    false AS is_print_done,
                    NULL::timestamptz AS print_done_at,
                    NULL::int AS print_done_by,
                    false AS audit_checked,
                    NULL::timestamptz AS audit_checked_at,
                    NULL::int AS audit_checked_by,
                    NULL::text AS audit_note,
                    NULL AS audit_checked_by_name,
                    false AS error_reported,
                    NULL::int AS error_order_id,
                    o.order_date AS print_date,
                    NULL::int AS printer_id,
                    NULL::int AS contractor_id,
                    o.customer_name AS customer_name,
                    (SELECT string_agg(description || ' (SL: ' || quantity || ')', '; ') FROM dht_order_items WHERE dht_order_id = o.id) AS product_name,
                    u_cskh.full_name AS cskh_name,
                    COALESCE(o.total_quantity, 0) AS order_quantity,
                    0::numeric AS print_meters,
                    0 AS roll_start_qty,
                    0 AS roll_end_qty,
                    NULL AS current_roll,
                    CASE WHEN o.category_id = 8 OR o.order_code LIKE '%GCPET%' THEN 'IN PET' ELSE 'IN TEM' END AS print_field,
                    NULL AS shared_process,
                    o.notes,
                    o.created_by,
                    o.created_at,
                    o.created_at AS updated_at,
                    NULL::text AS image_url,
                    'virtual' AS record_type,
                    NULL AS contractor_name,
                    NULL AS printer_name,
                    NULL AS test_by_name,
                    NULL AS done_by_name,
                    false AS is_completed,
                    NULL::int AS order_item_id,
                    o.category_id AS category_id
                FROM dht_orders o
                LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
                WHERE (
                    (o.category_id IN (8, 9) AND o.parent_order_id IS NULL)
                    OR (o.parent_order_id IS NOT NULL AND (o.order_code LIKE '%GCPET%' OR o.order_code LIKE '%GCTEM%'))
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM printing_records pr 
                      WHERE pr.dht_order_id = o.id
                  )
            )
            SELECT up.*,
                   lh.details AS last_update_detail, lh.performed_at AS last_update_at, lhu.full_name AS last_update_by,
                   mt.notes AS material_roll_notes, mt.quantity AS material_roll_qty,
                   COALESCE(src.name, 'Nguồn khác') AS material_roll_supplier
            FROM unified_printing up
            LEFT JOIN LATERAL (
                SELECT h.details, h.performed_at, h.performed_by 
                FROM printing_history h 
                WHERE h.printing_id = up.id 
                ORDER BY h.performed_at DESC LIMIT 1
            ) lh ON up.record_type = 'real'
            LEFT JOIN users lhu ON lh.performed_by = lhu.id
            LEFT JOIN material_transactions mt ON up.material_tx_id = mt.id
            LEFT JOIN import_records ir ON mt.import_record_id = ir.id
            LEFT JOIN import_sources src ON ir.source_id = src.id
            ${where}
            ${orderBy}
        `, params);

        const orderIds = [...new Set(records.map(r => r.dht_order_id).filter(Boolean))];
        const orderItems = orderIds.length ? await db.all(`
            SELECT 
                it.id, 
                it.dht_order_id, 
                it.description, 
                it.quantity, 
                it.material_pairs,
                cc.name AS cutting_category_name
            FROM dht_order_items it
            LEFT JOIN dht_products p ON TRIM(it.description) = p.name AND p.is_active = true
            LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id
            WHERE it.dht_order_id IN (${orderIds.map((_, i) => `$${i+1}`).join(',')})
        `, orderIds) : [];

        const allPrRecs = orderIds.length ? await db.all(`
            SELECT pr.id, pr.dht_order_id, pr.order_item_id, pr.print_field, pr.printer_id, pr.contractor_id,
                   u.full_name AS printer_name, c.name AS contractor_name, pr.shared_process
            FROM printing_records pr
            LEFT JOIN users u ON pr.printer_id = u.id
            LEFT JOIN printing_contractors c ON pr.contractor_id = c.id
            WHERE pr.dht_order_id IN (${orderIds.map((_, i) => `$${i+1}`).join(',')})
        `, orderIds) : [];

        const getRecordOpName = (pr) => {
            if (pr.contractor_id) {
                return pr.contractor_name ? '🏭 ' + pr.contractor_name : '🏭 Gia công';
            }
            return pr.printer_name || '';
        };

        const ticketOperators = {};
        allPrRecs.forEach(pr => {
            const key = pr.order_item_id ? `item_${pr.order_item_id}` : `order_${pr.dht_order_id}`;
            if (!ticketOperators[key]) {
                ticketOperators[key] = [];
            }
            const opName = getRecordOpName(pr);
            if (opName) ticketOperators[key].push(opName);
            
            if (pr.shared_process) {
                const parts = pr.shared_process.split(',').map(s => s.trim()).filter(Boolean);
                ticketOperators[key].push(...parts);
            }
        });

        for (const key of Object.keys(ticketOperators)) {
            ticketOperators[key] = [...new Set(ticketOperators[key])];
        }

        const itemsByOrder = {};
        orderItems.forEach(item => {
            if (!itemsByOrder[item.dht_order_id]) {
                itemsByOrder[item.dht_order_id] = [];
            }
            itemsByOrder[item.dht_order_id].push(item);
        });

        const formattedRecords = records.map(r => {
            const items = itemsByOrder[r.dht_order_id] || [];
            const isPetOrTem = (r.category_id === 8 || r.category_id === 9 || 
                                (r.order_code && (r.order_code.includes('GCPET') || r.order_code.includes('GCTEM'))));
            
            let finalProdName = r.product_name;

            if (isPetOrTem) {
                const filteredItems = items.filter(item => {
                    const desc = (item.description || '').toLowerCase().trim();
                    return !desc.includes('thiết kế') && !desc.includes('thiet ke') && desc !== 'tk';
                });

                if (r.order_item_id) {
                    const item = filteredItems.find(it => it.id === r.order_item_id);
                    if (item) {
                        let desc = (item.description || '').trim();
                        if (/tờ|to/i.test(desc)) desc = 'Tờ';
                        else if (/mét|met/i.test(desc)) desc = 'Mét';
                        finalProdName = `${item.quantity || 0} ${desc}`;
                    } else {
                        const rawItem = items.find(it => it.id === r.order_item_id);
                        if (rawItem) {
                            let desc = (rawItem.description || '').trim();
                            if (/tờ|to/i.test(desc)) desc = 'Tờ';
                            else if (/mét|met/i.test(desc)) desc = 'Mét';
                            finalProdName = `${rawItem.quantity || 0} ${desc}`;
                        } else {
                            finalProdName = '—';
                        }
                    }
                } else {
                    finalProdName = filteredItems.map(item => {
                        let desc = (item.description || '').trim();
                        if (/tờ|to/i.test(desc)) desc = 'Tờ';
                        else if (/mét|met/i.test(desc)) desc = 'Mét';
                        return `${item.quantity || 0} ${desc}`;
                    }).join('; ') || '—';
                }
            } else {
                if (r.order_item_id) {
                    const sortedItems = [...items].sort((a, b) => a.id - b.id);
                    const itemIdx = sortedItems.findIndex(it => it.id === r.order_item_id) + 1;
                    const item = sortedItems.find(it => it.id === r.order_item_id);
                    const itemDesc = item ? (item.description || '') : '';
                    
                    let totalRows = 0;
                    for (const it of sortedItems) {
                        let pairs = [];
                        try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}
                        totalRows += pairs.length > 0 ? pairs.length : 1;
                    }

                    if (totalRows > 1) {
                        finalProdName = `${r.order_code} — Phiếu ${itemIdx} — P1 — ${itemDesc}`;
                    } else {
                        finalProdName = `${r.order_code} — ${itemDesc}`;
                    }
                } else {
                    if (items.length === 1) {
                        finalProdName = `${r.order_code} — ${items[0].description || ''}`;
                    } else if (items.length > 1) {
                        finalProdName = `${r.order_code} — ${items.map(it => it.description || '').join('; ')}`;
                    } else {
                        finalProdName = r.order_code || '—';
                    }
                }
            }

            // Dynamic shared process calculation
            let calculatedSharedProcess = r.shared_process;
            if (r.record_type === 'real') {
                const key = r.order_item_id ? `item_${r.order_item_id}` : `order_${r.dht_order_id}`;
                const allOps = ticketOperators[key] || [];
                const currentOp = getRecordOpName(r);
                const otherOps = allOps.filter(op => op !== currentOp);
                calculatedSharedProcess = otherOps.join(', ') || null;
            }

            // Determine cutting category
            let cuttingCategory = null;
            if (r.order_item_id) {
                const item = items.find(it => it.id === r.order_item_id);
                if (item) cuttingCategory = item.cutting_category_name || null;
            } else {
                if (items.length > 0) {
                    cuttingCategory = items[0].cutting_category_name || null;
                }
            }

            return {
                ...r,
                product_name: finalProdName,
                shared_process: calculatedSharedProcess,
                cutting_category: cuttingCategory,
                id: r.record_type === 'virtual' ? 'dht_' + r.dht_order_id : Number(r.id)
            };
        });

        return { records: formattedRecords };
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
        const idStr = req.params.id, { action } = req.body || {}, now = vnNow();
        let id;
        try {
            id = await getOrCreatePrintingRecord(idStr, req.user.id);
        } catch (err) {
            return reply.code(400).send({ error: err.message });
        }

        const rec = await db.get('SELECT * FROM printing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });

        const isManager = await isPrintManager(req);
        if (rec.is_print_done && !isManager) {
            return reply.code(403).send({ error: 'Chỉ Giám đốc hoặc Quản lý mới được phép sửa đổi/báo cáo lại đơn đã in xong.' });
        }

        let detail = '';
        if (action === 'start_test') {
            await db.run(`UPDATE printing_records SET is_test_print=true, test_print_at=$1, test_print_by=$2, updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            detail = '🧪 Bắt đầu in test';
        } else if (action === 'undo_test') {
            await db.run(`UPDATE printing_records SET is_test_print=false, test_print_at=NULL, test_print_by=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '↩️ Hoàn tác in test';
        } else if (action === 'print_done') {
            const fUpper = (rec.print_field || '').toUpperCase();
            const isPetOrTem = fUpper.includes('PET') || fUpper.includes('TEM') || fUpper.includes('DECAL');
            if (isPetOrTem) {
                const { pettem_roll_id, roll_start_qty, print_meters, roll_end_qty, image_url } = req.body || {};
                if (!pettem_roll_id) return reply.code(400).send({ error: 'Mã cây in là bắt buộc đối với đơn hàng PET/TEM' });
                if (!print_meters || Number(print_meters) <= 0) return reply.code(400).send({ error: 'Số mét in phải lớn hơn 0' });
                if (!image_url) return reply.code(400).send({ error: 'Hình ảnh file in là bắt buộc đối với đơn hàng PET/TEM' });

                const roll = await db.get(`SELECT qty_remaining, roll_type FROM pettem_rolls WHERE id = $1`, [Number(pettem_roll_id)]);
                if (!roll) return reply.code(400).send({ error: 'Cây in không tồn tại' });

                let currentRollQty = Number(roll.qty_remaining);
                if (rec.is_print_done && Number(rec.pettem_roll_id) === Number(pettem_roll_id)) {
                    currentRollQty += Number(rec.print_meters || 0);
                }

                const calculatedEndQty = currentRollQty - Number(print_meters);
                if (calculatedEndQty < 0) {
                    return reply.code(400).send({ error: 'Số lượng cuối cuộn bị âm. Vui lòng chọn cây in khác hoặc nhập thêm vật liệu.' });
                }

                await db.run(`UPDATE printing_records SET 
                    is_print_done=true, 
                    print_done_at=COALESCE(print_done_at,$1), 
                    print_done_by=COALESCE(print_done_by,$2), 
                    is_test_print=true, 
                    test_print_at=COALESCE(test_print_at,$1), 
                    updated_at=$1,
                    pettem_roll_id=$3,
                    roll_start_qty=$4,
                    print_meters=$5,
                    roll_end_qty=$6,
                    image_url=$7,
                    printer_id=COALESCE(printer_id,$2)
                    WHERE id=$8`, 
                    [now, req.user.id, Number(pettem_roll_id), currentRollQty, Number(print_meters), calculatedEndQty, image_url, id]);

                await syncPettemRollMeters(pettem_roll_id);
                if (rec.pettem_roll_id && Number(rec.pettem_roll_id) !== Number(pettem_roll_id)) {
                    await syncPettemRollMeters(rec.pettem_roll_id);
                }
            } else {
                await db.run(`UPDATE printing_records SET is_print_done=true, print_done_at=COALESCE(print_done_at,$1), print_done_by=COALESCE(print_done_by,$2), is_test_print=true, test_print_at=COALESCE(test_print_at,$1), updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
                // Auto FIFO assignment if not set
                if (!rec.material_tx_id) {
                    const fUpper = (rec.print_field || '').toUpperCase();
                    let matId = null;
                    if (fUpper.includes('PET')) matId = 4; // Màng In Pet
                    else if (fUpper.includes('TEM') || fUpper.includes('DECAL')) matId = 11; // Màng In Tem
                    
                    if (matId) {
                        const oldestRoll = await db.get(`
                            SELECT id FROM material_transactions mt
                            WHERE mt.material_item_id = $1 AND mt.tx_type = 'NHAP'
                              AND (mt.quantity - COALESCE((SELECT SUM(print_meters) FROM printing_records WHERE material_tx_id = mt.id), 0)) > 0
                            ORDER BY mt.performed_at ASC, mt.id ASC LIMIT 1
                        `, [matId]);
                        if (oldestRoll) {
                            await db.run(`UPDATE printing_records SET material_tx_id = $1 WHERE id = $2`, [oldestRoll.id, id]);
                        }
                    }
                }
                // Auto active roll assignment if not set
                if (!rec.pettem_roll_id) {
                    const fUpper = (rec.print_field || '').toUpperCase();
                    let rollType = null;
                    if (fUpper.includes('PET')) rollType = 'PET';
                    else if (fUpper.includes('TEM')) rollType = 'TEM';
                    else if (fUpper.includes('DECAL')) rollType = 'DECAL';
                    
                    if (rollType) {
                        const activeRoll = await db.get(`
                            SELECT id FROM pettem_rolls
                            WHERE roll_type = $1 AND confirmed_by IS NULL
                            ORDER BY import_date ASC, id ASC LIMIT 1
                        `, [rollType]);
                        if (activeRoll) {
                            await db.run(`UPDATE printing_records SET pettem_roll_id = $1 WHERE id = $2`, [activeRoll.id, id]);
                            await syncPettemRollMeters(activeRoll.id);
                        }
                    }
                }
            }
            // Auto FIFO assignment if not set for PET/TEM also
            if (isPetOrTem && !rec.material_tx_id) {
                let matId = fUpper.includes('PET') ? 4 : 11;
                const oldestRoll = await db.get(`
                    SELECT id FROM material_transactions mt
                    WHERE mt.material_item_id = $1 AND mt.tx_type = 'NHAP'
                      AND (mt.quantity - COALESCE((SELECT SUM(print_meters) FROM printing_records WHERE material_tx_id = mt.id), 0)) > 0
                    ORDER BY mt.performed_at ASC, mt.id ASC LIMIT 1
                `, [matId]);
                if (oldestRoll) {
                    await db.run(`UPDATE printing_records SET material_tx_id = $1 WHERE id = $2`, [oldestRoll.id, id]);
                }
            }
            detail = '✅ In xong';
        } else if (action === 'undo_done') {
            const { print_meters } = req.body || {};
            if (print_meters !== undefined && Number(print_meters) > 0) {
                await db.run(`UPDATE printing_records SET print_meters=$1, updated_at=$2 WHERE id=$3`, [Number(print_meters), now, id]);
                if (rec.pettem_roll_id) {
                    await syncPettemRollMeters(rec.pettem_roll_id);
                }
                detail = `📝 Cập nhật số mét in xong: ${print_meters}m`;
            } else {
                const oldRollId = rec.pettem_roll_id;
                await db.run(`UPDATE printing_records SET is_print_done=false, print_done_at=NULL, print_done_by=NULL, material_tx_id=NULL, pettem_roll_id=NULL, roll_start_qty=0, roll_end_qty=0, print_meters=0, image_url=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
                if (oldRollId) {
                    await syncPettemRollMeters(oldRollId);
                }
                detail = '↩️ Hoàn tác in xong';
            }
        } else if (action === 'report_error') {
            await db.run(`UPDATE printing_records SET error_reported=true, error_order_id=$1, updated_at=$2 WHERE id=$3`, [req.body.error_order_id||null, now, id]);
            detail = '⚠️ Báo đơn lỗi nội bộ';
        } else { return reply.code(400).send({ error: 'Action không hợp lệ' }); }
        await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, action, detail, req.user.id, now]);
        return { success: true, id };
    });

    // ========== AUDIT ==========
    fastify.post('/api/printing/records/:id/audit', { preHandler: [authenticate] }, async (req, reply) => {
        const isAuditor = req.user.role === 'giam_doc' || req.user.username === 'trinh';
        if (!isAuditor) return reply.code(403).send({ error: 'Không có quyền thực hiện chức năng kiểm tra' });

        const idStr = req.params.id, now = vnNow();
        const { audit_note, cancel } = req.body || {};
        let id;
        try {
            id = await getOrCreatePrintingRecord(idStr, req.user.id);
        } catch (err) {
            return reply.code(400).send({ error: err.message });
        }

        const rec = await db.get('SELECT audit_checked FROM printing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy bản ghi' });

        if (cancel) {
            await db.run(`UPDATE printing_records SET audit_checked=false, audit_checked_at=NULL, audit_checked_by=NULL, audit_note=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [id, 'audit', '↩️ Hủy kiểm tra', req.user.id, now]);
            return { success: true, id, audit_checked: false, audit_note: null };
        } else {
            await db.run(`UPDATE printing_records SET audit_checked=true, audit_checked_at=$1, audit_checked_by=$2, audit_note=$3, updated_at=$1 WHERE id=$4`, [now, req.user.id, audit_note || '', id]);
            const detail = '🔍 Đã kiểm tra: ' + (audit_note || '(Không có ghi chú)');
            await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [id, 'audit', detail, req.user.id, now]);
            return { success: true, id, audit_checked: true, audit_note };
        }
    });

    // ========== UPDATE ==========
    fastify.put('/api/printing/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const idStr = req.params.id, b = req.body || {}, now = vnNow();
        let id;
        try {
            id = await getOrCreatePrintingRecord(idStr, req.user.id);
        } catch (err) {
            return reply.code(400).send({ error: err.message });
        }

        const rec = await db.get('SELECT * FROM printing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });

        let auditSql = '';
        if (b.printer_id !== undefined && Number(b.printer_id) !== Number(rec.printer_id)) {
            auditSql = `, audit_checked=false, audit_checked_at=NULL, audit_checked_by=NULL`;
        }
        if (b.contractor_id !== undefined && Number(b.contractor_id) !== Number(rec.contractor_id)) {
            auditSql = `, audit_checked=false, audit_checked_at=NULL, audit_checked_by=NULL`;
        }

        const newRollId = b.pettem_roll_id !== undefined ? (b.pettem_roll_id ? Number(b.pettem_roll_id) : null) : rec.pettem_roll_id;

        await db.run(`UPDATE printing_records SET print_date=$1, printer_id=$2, contractor_id=$3, product_name=$4, cskh_name=$5,
            order_quantity=$6, print_meters=$7, roll_start_qty=$8, roll_end_qty=$9, current_roll=$10,
            print_field=$11, shared_process=$12, notes=$13, material_tx_id=$14, pettem_roll_id=$15, updated_at=$16 ${auditSql} WHERE id=$17`,
            [b.print_date||rec.print_date, b.printer_id||rec.printer_id, b.contractor_id!==undefined?b.contractor_id:rec.contractor_id,
             b.product_name!==undefined?b.product_name:rec.product_name, b.cskh_name!==undefined?b.cskh_name:rec.cskh_name,
             Number(b.order_quantity)||rec.order_quantity, Number(b.print_meters)||rec.print_meters,
             Number(b.roll_start_qty)||rec.roll_start_qty, Number(b.roll_end_qty)||rec.roll_end_qty,
             b.current_roll!==undefined?b.current_roll:rec.current_roll, b.print_field!==undefined?b.print_field:rec.print_field,
             b.shared_process!==undefined?b.shared_process:rec.shared_process, b.notes!==undefined?b.notes:rec.notes,
             b.material_tx_id!==undefined?b.material_tx_id:rec.material_tx_id, newRollId, now, id]);

        if (rec.pettem_roll_id) await syncPettemRollMeters(rec.pettem_roll_id);
        if (newRollId && newRollId !== rec.pettem_roll_id) await syncPettemRollMeters(newRollId);

        if (auditSql) {
            await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [id, 'audit_reset', 'Tự động hủy kiểm tra do đổi người in/gia công', req.user.id, now]);
        }

        await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật thông tin in', req.user.id, now]);
        return { success: true, id };
    });

    // ========== INLINE FIELD ==========
    fastify.patch('/api/printing/records/:id/field', { preHandler: [authenticate] }, async (req, reply) => {
        const idStr = req.params.id, { field, value } = req.body || {}, now = vnNow();
        let id;
        try {
            id = await getOrCreatePrintingRecord(idStr, req.user.id);
        } catch (err) {
            return reply.code(400).send({ error: err.message });
        }

        const rec = await db.get('SELECT * FROM printing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy bản ghi' });

        const ALLOWED = ['print_date','printer_id','contractor_id','product_name','cskh_name','order_quantity','print_meters',
            'roll_start_qty','roll_end_qty','current_roll','print_field','shared_process','notes','material_tx_id','pettem_roll_id'];
        if (!ALLOWED.includes(field)) return reply.code(400).send({ error: 'Trường không hợp lệ' });
        const numF = ['order_quantity','print_meters','roll_start_qty','roll_end_qty','printer_id','contractor_id','material_tx_id','pettem_roll_id'];
        let fv;
        if (value === null || value === undefined || value === '') {
            fv = null;
        } else if (numF.includes(field)) {
            fv = Number(value);
            if (isNaN(fv)) fv = 0;
        } else {
            fv = value;
        }

        let auditSql = '';
        if (field === 'printer_id' || field === 'contractor_id') {
            const currentVal = rec[field];
            if (Number(fv) !== Number(currentVal)) {
                auditSql = `, audit_checked=false, audit_checked_at=NULL, audit_checked_by=NULL`;
            }
        }

        await db.run(`UPDATE printing_records SET ${field}=$1, updated_at=$2 ${auditSql} WHERE id=$3`, [fv, now, id]);

        if (field === 'print_meters' || field === 'pettem_roll_id') {
            if (rec.pettem_roll_id) await syncPettemRollMeters(rec.pettem_roll_id);
            if (field === 'pettem_roll_id' && fv && Number(fv) !== Number(rec.pettem_roll_id)) {
                await syncPettemRollMeters(fv);
            }
        }

        if (auditSql) {
            await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [id, 'audit_reset', 'Tự động hủy kiểm tra do đổi người in/gia công', req.user.id, now]);
        }

        await db.run(`INSERT INTO printing_history (printing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'inline_update', `${field}: ${value}`, req.user.id, now]);
        return { success: true, id };
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

    // ========== PRINT FIELDS CRUD ==========
    fastify.get('/api/printing/fields', { preHandler: [authenticate] }, async () => {
        const rows = await db.all(`SELECT * FROM printing_fields WHERE is_active=true ORDER BY display_order, name`);
        return { fields: rows };
    });

    fastify.post('/api/printing/fields', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isPrintManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
        const { name, display_order } = req.body || {};
        if (!name) return reply.code(400).send({ error: 'Tên lĩnh vực là bắt buộc' });
        try {
            const r = await db.get(`
                INSERT INTO printing_fields (name, display_order)
                VALUES ($1, $2)
                RETURNING id
            `, [name.trim(), Number(display_order) || 0]);
            return { success: true, id: r.id };
        } catch (e) {
            return reply.code(400).send({ error: 'Lĩnh vực đã tồn tại hoặc không hợp lệ' });
        }
    });

    fastify.put('/api/printing/fields/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isPrintManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
        const { name, display_order } = req.body || {};
        if (!name) return reply.code(400).send({ error: 'Tên lĩnh vực là bắt buộc' });
        try {
            await db.run(`
                UPDATE printing_fields
                SET name = $1, display_order = $2
                WHERE id = $3
            `, [name.trim(), Number(display_order) || 0, req.params.id]);
            return { success: true };
        } catch (e) {
            return reply.code(400).send({ error: 'Lĩnh vực đã tồn tại hoặc không hợp lệ' });
        }
    });

    fastify.delete('/api/printing/fields/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isPrintManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
        await db.run(`UPDATE printing_fields SET is_active=false WHERE id=$1`, [req.params.id]);
        return { success: true };
    });

    fastify.get('/api/printing/fields/:id/operators', { preHandler: [authenticate] }, async (req) => {
        const fieldId = Number(req.params.id);
        const staff = await db.all(`
            SELECT u.id, u.full_name FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.status='active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
              AND (d.code = 'phongin' OR UPPER(COALESCE(d.name,'')) = 'PHONG IN')
            ORDER BY u.full_name
        `);
        const contractors = await db.all(`
            SELECT id, name FROM printing_contractors
            WHERE is_active=true
            ORDER BY display_order, name
        `);
        const assigned = await db.all(`
            SELECT operator_type, operator_id
            FROM printing_field_operators
            WHERE field_id = $1
        `, [fieldId]);

        return { staff, contractors, assigned };
    });

    fastify.post('/api/printing/fields/:id/operators', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isPrintManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
        const fieldId = Number(req.params.id);
        const { operators } = req.body || {};
        if (!Array.isArray(operators)) return reply.code(400).send({ error: 'Operators must be an array' });

        await db.run(`DELETE FROM printing_field_operators WHERE field_id = $1`, [fieldId]);
        for (const op of operators) {
            if (['user', 'contractor'].includes(op.operator_type) && op.operator_id) {
                await db.run(`
                    INSERT INTO printing_field_operators (field_id, operator_type, operator_id)
                    VALUES ($1, $2, $3)
                    ON CONFLICT DO NOTHING
                `, [fieldId, op.operator_type, Number(op.operator_id)]);
            }
        }
        return { success: true };
    });
};
