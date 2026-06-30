// ========== BILL NHẬP HÀNG — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow, vnDateStr } = require('../utils/timezone');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try { await db.exec(`CREATE TABLE IF NOT EXISTS import_sources (
        id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT, notes TEXT,
        is_active BOOLEAN DEFAULT true, display_order INTEGER DEFAULT 0,
        source_type VARCHAR(20) DEFAULT 'fabric',
        created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW()
    )`); } catch(e) { console.error('[BNH] sources:', e.message); }

    try {
        await db.exec(`ALTER TABLE import_sources ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'fabric'`);
        await db.exec(`UPDATE import_sources SET source_type = 'material' WHERE name ILIKE '%SBC%'`);
    } catch(e) { console.error('[BNH] sources source_type column:', e.message); }

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

    // ===== Fabric import columns =====
    try {
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS record_type VARCHAR(10) DEFAULT 'general'`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS fabric_import_code VARCHAR(13)`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS fabric_items JSONB DEFAULT '[]'`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS extra_costs JSONB DEFAULT '[]'`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS ship_cost NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS ship_image_url TEXT`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS ship_image_path TEXT`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS ship_cashflow_id INTEGER`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS ship_cashflow_code TEXT`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS bill_image_url TEXT`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS bill_image_path TEXT`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS ship_payer VARCHAR(20) DEFAULT NULL`);
        await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ir_fabric_code ON import_records(fabric_import_code) WHERE fabric_import_code IS NOT NULL`);
    } catch(e) { console.error('[BNH] fabric cols:', e.message); }

    // ===== qlx_preparation fabric_arrived columns =====
    try {
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS fabric_arrived BOOLEAN DEFAULT FALSE`);
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS fabric_arrived_at TIMESTAMPTZ`);
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS fabric_arrived_by INTEGER`);
    } catch(e) { console.error('[BNH] qlx_prep fabric_arrived:', e.message); }

    // ===== Approved import prices & Price approval system =====
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS approved_import_prices (
                id SERIAL PRIMARY KEY,
                item_type VARCHAR(20) NOT NULL,
                fabric_color_id INTEGER REFERENCES kv_fabric_colors(id) ON DELETE CASCADE,
                material_item_id INTEGER REFERENCES material_items(id) ON DELETE CASCADE,
                source_id INTEGER NOT NULL REFERENCES import_sources(id) ON DELETE CASCADE,
                price NUMERIC NOT NULL,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_approved_price_fabric ON approved_import_prices (fabric_color_id, source_id) WHERE item_type = 'fabric'`);
        await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_approved_price_material ON approved_import_prices (material_item_id, source_id) WHERE item_type = 'material'`);
    } catch(e) { console.error('[BNH] approved_import_prices table:', e.message); }

    try {
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS requires_price_approval BOOLEAN DEFAULT FALSE`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS price_approved_by INTEGER REFERENCES users(id)`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS price_approved_at TIMESTAMPTZ`);
    } catch(e) { console.error('[BNH] requires_price_approval columns:', e.message); }

    // ===== Material Warehouse & Items tables =====
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS material_warehouses (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            is_active BOOLEAN DEFAULT true,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
    } catch(e) { console.error('[BNH] material_warehouses:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS material_items (
            id SERIAL PRIMARY KEY,
            warehouse_id INTEGER NOT NULL REFERENCES material_warehouses(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            is_active BOOLEAN DEFAULT true,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(warehouse_id, name)
        )`);
    } catch(e) { console.error('[BNH] material_items:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS material_warehouse_sources (
            warehouse_id INTEGER NOT NULL REFERENCES material_warehouses(id) ON DELETE CASCADE,
            source_id INTEGER NOT NULL REFERENCES import_sources(id) ON DELETE CASCADE,
            PRIMARY KEY (warehouse_id, source_id)
        )`);
    } catch(e) { console.error('[BNH] material_warehouse_sources:', e.message); }

    try {
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS warehouse_id INTEGER REFERENCES material_warehouses(id) ON DELETE SET NULL`);
        await db.exec(`ALTER TABLE import_records ADD COLUMN IF NOT EXISTS material_item_id INTEGER REFERENCES material_items(id) ON DELETE SET NULL`);
    } catch(e) { console.error('[BNH] import_records alter:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS import_history (
        id SERIAL PRIMARY KEY, import_id INTEGER NOT NULL REFERENCES import_records(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ih_iid ON import_history(import_id)`);
    } catch(e) { console.error('[BNH] history:', e.message); }

    // ===== Payment records table =====
    try { await db.exec(`CREATE TABLE IF NOT EXISTS import_payments (
        id SERIAL PRIMARY KEY,
        import_id INTEGER NOT NULL REFERENCES import_records(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        image_url TEXT, image_path TEXT,
        note TEXT,
        allocations JSONB DEFAULT '[]',
        paid_by INTEGER REFERENCES users(id),
        paid_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ip_iid ON import_payments(import_id)`);
    } catch(e) { console.error('[BNH] payments:', e.message); }
    // Migration: add allocations column
    try { await db.exec(`ALTER TABLE import_payments ADD COLUMN IF NOT EXISTS allocations JSONB DEFAULT '[]'`); } catch(e) {}

    // ========== HELPERS ==========
    const MGMT = ['giam_doc', 'quan_ly_cap_cao'];
    async function isImportManager(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) { const n = d.name.toLowerCase(); if (n.includes('qlx') || n.includes('kế toán') || n.includes('ke toan') || n.includes('quản lý xưởng')) return true; }
        return false;
    }
    async function isAccountant(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) { const n = d.name.toLowerCase(); if (n.includes('kế toán') || n.includes('ke toan')) return true; }
        return false;
    }
    async function canViewImportBill(req) {
        const user = req.user;
        if (!user) return false;
        const name = user.full_name || '';
        const uname = user.username || '';
        const role = user.role || '';

        // 1. Giám đốc
        if (role === 'giam_doc') return true;

        // 2. Kế toán
        if (role === 'ke_toan' || uname === 'ketoan' || uname === 'ketoan1') return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [user.id]);
        if (d && d.name) { 
            const n = d.name.toLowerCase(); 
            if (n.includes('kế toán') || n.includes('ke toan')) return true; 
        }

        // 3. Lê Việt Trinh
        if (name.includes('Lê Việt Trinh') || name.includes('Le Viet Trinh') || uname === 'leviettrinh' || uname === 'trinh.lvt' || uname === 'trinh') {
            return true;
        }

        // 4. Lê Công Thực
        if (name.includes('Lê Công Thực') || name.includes('Le Cong Thuc') || uname === 'lecongthuc' || uname === 'thuc.lct' || uname === 'thuc') {
            return true;
        }

        return false;
    }
    async function isDuyetUser(req) {
        if (req.user.role === 'giam_doc') return true;
        const u = await db.get('SELECT full_name FROM users WHERE id=$1', [req.user.id]);
        return u && u.full_name && (u.full_name.includes('Lê Việt Trinh') || u.full_name.includes('Le Viet Trinh'));
    }
    function calcFinance(cost, refund, paid) {
        const c = Number(cost)||0, r = Number(refund)||0, p = Number(paid)||0;
        const total = c - r, debt = total - p;
        return { total_amount: total, debt };
    }
    function genFabricCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        const bytes = crypto.randomBytes(13);
        let code = '';
        for (let i = 0; i < 13; i++) code += chars[bytes[i] % chars.length];
        return code;
    }


    // ========== DUYET PERMISSION CHECK ==========
    fastify.get('/api/import/check-duyet-perm', { preHandler: [authenticate] }, async (req) => {
        return { allowed: await isDuyetUser(req) };
    });

    // ========== SOURCES CRUD ==========
    fastify.get('/api/import/sources', { preHandler: [authenticate] }, async (req) => {
        const { source_type } = req.query || {};
        let whereClause = 's.is_active=true';
        let params = [];
        if (source_type) {
            whereClause += ' AND s.source_type = $1';
            params.push(source_type);
        }
        return { sources: await db.all(`SELECT s.*, COALESCE(SUM(r.total_amount),0)::numeric AS sum_total, COUNT(r.id)::int AS rec_count
            FROM import_sources s LEFT JOIN import_records r ON s.id=r.source_id
            WHERE ${whereClause} GROUP BY s.id ORDER BY s.display_order, s.name`, params) };
    });
    fastify.post('/api/import/sources', { preHandler: [authenticate] }, async (req, reply) => {
        if (!MGMT.includes(req.user.role)) return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được tạo nguồn NCC' });
        const { name, phone, notes, source_type } = req.body || {};
        if (!name) return reply.code(400).send({ error: 'Tên nguồn bắt buộc' });
        const type = source_type === 'material' ? 'material' : 'fabric';
        const r = await db.get(`INSERT INTO import_sources (name,phone,notes,source_type,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [name, phone||null, notes||null, type, req.user.id]);
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
    fastify.get('/api/import/tree', { preHandler: [authenticate] }, async (req) => {
        const { record_type, warehouse_id } = req.query;
        let sourcesQuery = `
            SELECT s.id, s.name, 
                   COUNT(r.id) FILTER (WHERE r.id IS NOT NULL)::int AS count, 
                   COALESCE(SUM(r.total_amount),0)::numeric AS sum_total,
                   COALESCE(SUM(r.debt),0)::numeric AS sum_debt
            FROM import_sources s 
            LEFT JOIN import_records r ON s.id=r.source_id
        `;
        let whereSources = ['s.is_active=true'];
        let params = [];
        let idx = 1;
        if (record_type) {
            sourcesQuery += ` AND r.record_type = $${idx}`;
            params.push(record_type);
            idx++;
            // Filter sources list to match the record_type
            whereSources.push(`s.source_type = $${idx}`);
            params.push(record_type === 'general' ? 'material' : 'fabric');
            idx++;
        }
        if (warehouse_id) {
            sourcesQuery += ` AND r.warehouse_id = $${idx}`;
            params.push(Number(warehouse_id));
            idx++;
            // Only return suppliers linked to this warehouse
            whereSources.push(`s.id IN (SELECT source_id FROM material_warehouse_sources WHERE warehouse_id = $${idx - 1})`);
        }
        sourcesQuery += ` WHERE ${whereSources.join(' AND ')} GROUP BY s.id, s.name ORDER BY s.display_order, s.name`;

        const sources = await db.all(sourcesQuery, params);

        let totalsQuery = `
            SELECT COUNT(*)::int AS total, COALESCE(SUM(total_amount),0)::numeric AS sum_total,
            COALESCE(SUM(debt),0)::numeric AS sum_debt, COALESCE(SUM(paid),0)::numeric AS sum_paid
            FROM import_records
        `;
        let totalsParams = [];
        let tIdx = 1;
        let totalsWhere = [];
        if (record_type) {
            totalsWhere.push(`record_type = $${tIdx}`);
            totalsParams.push(record_type);
            tIdx++;
        }
        if (warehouse_id) {
            totalsWhere.push(`warehouse_id = $${tIdx}`);
            totalsParams.push(Number(warehouse_id));
            tIdx++;
        }
        if (totalsWhere.length) {
            totalsQuery += ` WHERE ` + totalsWhere.join(' AND ');
        }

        const totals = await db.get(totalsQuery, totalsParams);

        // Count total fabric trees from JSONB
        let total_trees = 0;
        try {
            const tc = await db.get(`SELECT COALESCE(SUM(sub.cnt), 0)::int AS total_trees FROM (
                SELECT (SELECT COALESCE(SUM(jsonb_array_length(fi->'trees')), 0) FROM jsonb_array_elements(ir.fabric_items) fi) AS cnt
                FROM import_records ir WHERE ir.record_type = 'fabric' AND ir.fabric_items IS NOT NULL AND ir.fabric_items::text != '[]'
            ) sub`);
            total_trees = tc?.total_trees || 0;
        } catch(e) { /* fallback for old data */ }
        const t = totals || { total: 0, sum_total: 0, sum_debt: 0, sum_paid: 0 };
        t.total_trees = total_trees;
        return { sources, totals: t };
    });

    // ========== LIST ==========
    fastify.get('/api/import/records', { preHandler: [authenticate] }, async (req) => {
        const { source_id, year, month, status, search, record_type, warehouse_id } = req.query;
        let where = 'WHERE 1=1', params = [], idx = 1;
        if (record_type) { where += ` AND ir.record_type=$${idx++}`; params.push(record_type); }
        if (warehouse_id) { where += ` AND ir.warehouse_id=$${idx++}`; params.push(Number(warehouse_id)); }
        if (source_id) { where += ` AND ir.source_id=$${idx++}`; params.push(Number(source_id)); }
        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(ir.import_date,ir.created_at))=$${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(ir.import_date,ir.created_at))=$${idx++}`; params.push(Number(month)); }
        if (status === 'checked') where += ` AND ir.is_checked=true`;
        else if (status === 'unchecked') where += ` AND ir.is_checked=false`;
        else if (status === 'debt') where += ` AND ir.debt > 0`;
        else if (status === 'paid') where += ` AND ir.debt <= 0`;
        if (search) { where += ` AND (ir.fabric_material ILIKE $${idx} OR s.name ILIKE $${idx} OR ir.fabric_import_code ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        const records = await db.all(`
            SELECT ir.*, s.name AS source_name, wh.name AS warehouse_name, u.full_name AS importer_name, u_ck.full_name AS checked_by_name,
                   lh.details AS last_update_detail, lh.performed_at AS last_update_at, lhu.full_name AS last_update_by,
                   mt_list.txs
            FROM import_records ir LEFT JOIN import_sources s ON ir.source_id=s.id
            LEFT JOIN material_warehouses wh ON ir.warehouse_id=wh.id
            LEFT JOIN users u ON ir.importer_id=u.id LEFT JOIN users u_ck ON ir.checked_by=u_ck.id
            LEFT JOIN LATERAL (SELECT h.details, h.performed_at, h.performed_by FROM import_history h WHERE h.import_id=ir.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            LEFT JOIN LATERAL (
                SELECT json_agg(json_build_object('material_item_id', mt.material_item_id, 'tx_id', mt.id, 'seq', seq_list.seq)) AS txs
                FROM material_transactions mt 
                LEFT JOIN (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY material_item_id ORDER BY performed_at ASC, id ASC) AS seq
                    FROM material_transactions
                    WHERE tx_type = 'NHAP'
                ) seq_list ON mt.id = seq_list.id
                WHERE mt.import_record_id = ir.id AND mt.tx_type = 'NHAP'
            ) mt_list ON true
            ${where} ORDER BY ir.import_date DESC NULLS LAST, ir.created_at DESC`, params);
        return { records };
    });

    // ========== CREATE ==========
    fastify.post('/api/import/records', { preHandler: [authenticate] }, async (req, reply) => {
        const b = req.body || {}, now = vnNow();
        
        // 1. Calculations
        const baseCost = Number(b.cost) || 0;
        const vatAmount = Number(b.vat_amount) || 0;
        const extraCosts = Array.isArray(b.extra_costs) ? b.extra_costs : [];
        const extraTotal = extraCosts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const totalAmount = baseCost + vatAmount + extraTotal;
        const debt = totalAmount; // paid = 0, refund = 0
        
        const shipCost = Number(b.ship_cost) || 0;
        const shipPayer = b.ship_payer; // 'congty' or 'cophanmay'
        const importDate = b.import_date || now.toISOString().split('T')[0];

        const pool = db.getDB();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Check for material price discrepancy
            let requiresPriceApproval = false;
            const items = Array.isArray(b.fabric_items) ? b.fabric_items : [];
            for (const item of items) {
                if (item.material_item_id) {
                    const approvedRes = await client.query(
                        `SELECT price FROM approved_import_prices 
                         WHERE item_type = 'material' AND material_item_id = $1 AND source_id = $2`,
                        [item.material_item_id, b.source_id]
                    );
                    if (approvedRes.rows.length === 0) {
                        requiresPriceApproval = true;
                    } else if (Number(approvedRes.rows[0].price) !== Number(item.price)) {
                        requiresPriceApproval = true;
                    }
                } else {
                    requiresPriceApproval = true;
                }
            }
            
            let shipCfId = null;
            let shipCfCode = null;

            if (shipCost > 0 && (shipPayer === 'congty' || shipPayer === 'cophanmay')) {
                // Get supplier/source name
                const srcRes = await client.query('SELECT name FROM import_sources WHERE id = $1', [b.source_id]);
                const srcName = srcRes.rows[0]?.name || 'N/A';
                
                // Format transaction date components in Vietnam timezone
                const dateParts = importDate.split('-');
                const yyyy = Number(dateParts[0]);
                const mm = Number(dateParts[1]);
                const dd = Number(dateParts[2]);
                const yy = String(yyyy).slice(-2);
                
                const cfDate = importDate;
                
                if (shipPayer === 'cophanmay') {
                    // CPMAY code prefix
                    // 1. Get next seq for CPMAY on this date
                    const cfRow = await client.query(
                        `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM cashflow_records WHERE cashflow_date = $1 AND cashflow_code LIKE 'CPMAY-%'`,
                        [cfDate]
                    );
                    const seq = Number(cfRow.rows[0].max_seq) + 1;
                    const cfCode = `CPMAY-TM-${seq}-${dd}-${mm}-Y${yy}`;
                    const cfDesc = `Chi ship nhập vật liệu + ${srcName} (CP May trả)`;
                    
                    // Insert into cashflow_records only
                    const cfResult = await client.query(
                        `INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, money_source, created_by, image_url)
                         VALUES ($1, 'CHI', $2, $3, $4, $5, 'cophanmay', $6, $7) RETURNING id, cashflow_code`,
                        [cfCode, seq, cfDate, cfDesc, shipCost, req.user.id, b.ship_image_url || null]
                    );
                    shipCfId = cfResult.rows[0].id;
                    shipCfCode = cfResult.rows[0].cashflow_code;
                } else {
                    // Company (congty) code prefix
                    // 1. Get next seq for TM on this date
                    const prRow = await client.query(
                        `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM payment_records WHERE payment_date = $1 AND payment_method = 'TM'`,
                        [cfDate]
                    );
                    const cfRow = await client.query(
                        `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM cashflow_records WHERE cashflow_date = $1 AND cashflow_code LIKE 'TM%'`,
                        [cfDate]
                    );
                    const seq = Math.max(Number(prRow.rows[0].max_seq), Number(cfRow.rows[0].max_seq)) + 1;
                    const cfCode = `TM${seq}-${dd}-${mm}-Y${yy}`;
                    const cfDesc = `Chi ship nhập vật liệu + ${srcName} (Công Ty trả)`;
                    
                    // Insert into payment_records
                    await client.query(
                        `INSERT INTO payment_records (payment_code, payment_method, daily_seq, amount, payment_type, transfer_note, money_source, source, payment_date, created_by)
                         VALUES ($1, 'TM', $2, $3, 'chi', $4, 'congty', 'cashflow_chi', $5, $6)`,
                        [cfCode, seq, shipCost, cfDesc, cfDate, req.user.id]
                    );
                    
                    // Insert into cashflow_records
                    const cfResult = await client.query(
                        `INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, money_source, created_by, image_url)
                         VALUES ($1, 'CHI', $2, $3, $4, $5, 'congty', $6, $7) RETURNING id, cashflow_code`,
                        [cfCode, seq, cfDate, cfDesc, shipCost, req.user.id, b.ship_image_url || null]
                    );
                    shipCfId = cfResult.rows[0].id;
                    shipCfCode = cfResult.rows[0].cashflow_code;
                }
            }

            // Insert into import_records
            const result = await client.query(
                `INSERT INTO import_records (
                    import_date, source_id, importer_id, fabric_material, fabric_quantity,
                    material_name, material_quantity, cost, refund, total_amount, paid, debt,
                    cost_notes, bill_image_url, bill_image_path, created_by, created_at,
                    warehouse_id, material_item_id, fabric_items, record_type,
                    vat_amount, extra_costs, ship_cost, ship_payer, ship_cashflow_id, ship_cashflow_code,
                    ship_image_url, ship_image_path, requires_price_approval
                )
                VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10, $11, $12,
                    $13, $14, $15, $16, $17,
                    $18, $19, $20::jsonb, 'general',
                    $21, $22::jsonb, $23, $24, $25, $26,
                    $27, $28, $29
                ) RETURNING id`,
                [
                    b.import_date || null, b.source_id || null, b.importer_id || req.user.id, b.fabric_material || null,
                    Number(b.fabric_quantity) || 0, b.material_name || null, Number(b.material_quantity) || 0,
                    baseCost, 0, totalAmount, 0, debt,
                    b.cost_notes || null, b.bill_image_url || null, b.bill_image_path || null, req.user.id, now,
                    b.warehouse_id || null, b.material_item_id || null, b.fabric_items ? JSON.stringify(b.fabric_items) : '[]',
                    vatAmount, JSON.stringify(extraCosts), shipCost, shipPayer || null, shipCfId, shipCfCode,
                    b.ship_image_url || null, b.ship_image_path || null, requiresPriceApproval
                ]
            );
            const importId = result.rows[0].id;

            // History
            await client.query(
                `INSERT INTO import_history (import_id, action, details, performed_by, performed_at)
                 VALUES ($1, 'create', 'Tạo bill nhập hàng mới', $2, $3)`,
                [importId, req.user.id, now]
            );

            await client.query('COMMIT');

            // 2. Send Telegram notifications (outside the main db transaction for safety)
            if (shipCost > 0 && shipCfCode) {
                try {
                    const tgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cashflow_group'");
                    const amtStr = shipCost.toLocaleString('vi-VN');
                    const src = await db.get('SELECT name FROM import_sources WHERE id=$1', [b.source_id]);
                    const srcName = src?.name || '';
                    
                    if (shipPayer === 'cophanmay') {
                        // Notify Sổ Thu Chi Telegram group
                        if (tgRow && tgRow.value) {
                            const { sendTelegramPhoto, sendTelegramMessage } = require('../utils/telegram');
                            const thuSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='THU' AND is_closed=false AND NOT (money_source='cophanmay' AND cashflow_code LIKE 'CPMAY-%')");
                            const chiSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='CHI' AND is_closed=false");
                            const runBal = Number(thuSum.t) - Number(chiSum.t);
                            const balStr = runBal.toLocaleString('vi-VN');
                            const caption = `🔴🔴🔴CHI <b>CỔ PHẦN MAY</b> :\n💰${shipCfCode} : <b>${amtStr}đ</b> Chi ship nhập vật liệu + ${srcName} (CP May trả) 👤 ${req.user.full_name || req.user.username}\n\n🔗Tổng Kế Toán Cầm : <b>${balStr}đ</b>`;
                            if (b.ship_image_path) {
                                await sendTelegramPhoto(tgRow.value, b.ship_image_path, caption);
                            } else {
                                await sendTelegramMessage(tgRow.value, caption);
                            }
                        }
                        
                        // Notify Sổ Cổ Phần May Telegram group
                        const cpmTgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cpmay_group'");
                        if (cpmTgRow && cpmTgRow.value) {
                            const { sendTelegramPhoto, sendTelegramMessage } = require('../utils/telegram');
                            const cpmTotal = await db.get("SELECT COALESCE(SUM(CASE WHEN cashflow_type='THU' THEN amount ELSE -amount END),0) AS t FROM cashflow_records WHERE money_source='cophanmay' AND is_closed=false");
                            const cpmTotalStr = Number(cpmTotal.t).toLocaleString('vi-VN');
                            const cpmCaption = `🔴🔴🔴CHI <b>CỔ PHẦN MAY</b> :\n💰${shipCfCode} : <b>${amtStr}đ</b> Chi ship nhập vật liệu + ${srcName} (CP May trả) 👤 ${req.user.full_name || req.user.username}\n\n🔗Tổng CP May : <b>${cpmTotalStr}đ</b>`;
                            if (b.ship_image_path) {
                                await sendTelegramPhoto(cpmTgRow.value, b.ship_image_path, cpmCaption);
                            } else {
                                await sendTelegramMessage(cpmTgRow.value, cpmCaption);
                            }
                        }
                    } else if (shipPayer === 'congty') {
                        // Notify Sổ Thu Chi Telegram group
                        if (tgRow && tgRow.value) {
                            const { sendTelegramPhoto, sendTelegramMessage } = require('../utils/telegram');
                            const thuSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='THU' AND is_closed=false AND NOT (money_source='cophanmay' AND cashflow_code LIKE 'CPMAY-%')");
                            const chiSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='CHI' AND is_closed=false");
                            const runBal = Number(thuSum.t) - Number(chiSum.t);
                            const balStr = runBal.toLocaleString('vi-VN');
                            const caption = `🔴CHI TM <b>CÔNG TY</b> :\n💰${shipCfCode} : <b>${amtStr}đ</b> Chi ship nhập vật liệu + ${srcName} (Công Ty trả) 👤 ${req.user.full_name || req.user.username}\n\n🔗Tổng Kế Toán Cầm : <b>${balStr}đ</b>`;
                            if (b.ship_image_path) {
                                await sendTelegramPhoto(tgRow.value, b.ship_image_path, caption);
                            } else {
                                await sendTelegramMessage(tgRow.value, caption);
                            }
                        }
                    }
                } catch(tgErr) { console.error('[BNH Material Ship TG]', tgErr.message); }
            }

            return { success: true, id: importId };
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[BNH Material Insert]', err.message);
            return reply.code(400).send({ error: err.message || 'Lỗi khi nhập vật liệu' });
        } finally {
            client.release();
        }
    });

    // ========== TOGGLE CHECK ==========
    fastify.post('/api/import/toggle/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { action } = req.body || {}, now = vnNow();
        if (action !== 'check' && action !== 'uncheck') {
            return reply.code(400).send({ error: 'Action không hợp lệ' });
        }
        if (!(await isDuyetUser(req))) {
            return reply.code(403).send({ error: 'Chỉ người duyệt được phép' });
        }

        const pool = db.getDB();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get the import record
            const importRes = await client.query(
                `SELECT record_type, fabric_items, source_id, requires_price_approval FROM import_records WHERE id = $1 FOR UPDATE`,
                [id]
            );
            if (importRes.rows.length === 0) {
                throw new Error('Không tìm thấy bill');
            }
            const record = importRes.rows[0];
            const fabricItems = typeof record.fabric_items === 'string' ? JSON.parse(record.fabric_items) : (record.fabric_items || []);

            if (action === 'check') {
                // Update import_records
                await client.query(
                    `UPDATE import_records 
                     SET is_checked=true, checked_at=$1, checked_by=$2, updated_at=$1,
                         price_approved_by = CASE WHEN requires_price_approval = true THEN $2::int ELSE price_approved_by END,
                         price_approved_at = CASE WHEN requires_price_approval = true THEN $1::timestamptz ELSE price_approved_at END
                     WHERE id=$3`,
                    [now, req.user.id, id]
                );

                // Upsert prices into approved_import_prices if requires_price_approval is true
                if (record.requires_price_approval) {
                    if (record.record_type === 'fabric') {
                        for (const fi of fabricItems) {
                            if (fi.fabric_color_id) {
                                await client.query(
                                    `INSERT INTO approved_import_prices (item_type, fabric_color_id, source_id, price, created_by, updated_at)
                                     VALUES ('fabric', $1, $2, $3, $4, NOW())
                                     ON CONFLICT (fabric_color_id, source_id) WHERE item_type = 'fabric'
                                     DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()`,
                                    [fi.fabric_color_id, record.source_id, Number(fi.unit_price) || 0, req.user.id]
                                );
                            }
                        }
                    } else if (record.record_type === 'general') {
                        for (const item of fabricItems) {
                            if (item.material_item_id) {
                                await client.query(
                                    `INSERT INTO approved_import_prices (item_type, material_item_id, source_id, price, created_by, updated_at)
                                     VALUES ('material', $1, $2, $3, $4, NOW())
                                     ON CONFLICT (material_item_id, source_id) WHERE item_type = 'material'
                                     DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()`,
                                    [item.material_item_id, record.source_id, Number(item.price) || 0, req.user.id]
                                );
                            }
                        }
                    }
                }

                // If fabric import, transition reservations to arrived and run smart fulfillment
                if (record.record_type === 'fabric') {
                    // Update from_stock reservations
                    await client.query(
                        `UPDATE qlx_fabric_reservations 
                         SET status = 'arrived', arrived_at = $1, arrived_by = $2, updated_at = $1
                         WHERE status = 'pending_price_approval' AND roll_id IN (SELECT id FROM kv_rolls WHERE source_import_id = $3)`,
                        [now, req.user.id, id]
                    );

                    // Run smart fulfillment for reservations in this bill
                    // Count imported trees from PREVIOUS bills (and this approved bill)
                    const allImportRows = await client.query(`SELECT fabric_items FROM import_records WHERE record_type='fabric' AND (requires_price_approval = false OR is_checked = true)`);
                    const prevImportEntries = [];
                    for (const row of allImportRows.rows) {
                        let items = []; try { items = typeof row.fabric_items === 'string' ? JSON.parse(row.fabric_items) : (row.fabric_items || []); } catch(e) {}
                        for (const fi of items) {
                            const resIds = (fi.reservation_ids || []).map(Number).filter(n => n > 0);
                            const treeCount = (fi.trees || []).length;
                            if (resIds.length > 0 && treeCount > 0) {
                                prevImportEntries.push({ resIds: new Set(resIds), treeCount });
                            }
                        }
                    }

                    const checkedResGroups = new Set();
                    for (const fi of fabricItems) {
                        const fiResIds = (fi.reservation_ids || []).map(Number).filter(n => n > 0);
                        if (!fiResIds.length) continue;
                        const resKey = fiResIds.slice().sort((a, b) => a - b).join(',');
                        if (checkedResGroups.has(resKey)) continue;
                        checkedResGroups.add(resKey);

                        const fiResIdSet = new Set(fiResIds);

                        // Get the specific reservations linked to this bill
                        const groupRes = await client.query(
                            `SELECT id, dht_order_id, call_trees, call_amount FROM qlx_fabric_reservations
                             WHERE id = ANY($1) AND reservation_type='new_call' AND status='reserved'
                             FOR UPDATE`,
                            [fiResIds]
                        );
                        if (groupRes.rows.length === 0) continue;

                        let neededTrees = 0;
                        for (const r of groupRes.rows) {
                            neededTrees += (Number(r.call_trees) || 0) + (Number(r.call_amount) > 0 ? 1 : 0);
                        }

                        let prevImported = 0;
                        for (const entry of prevImportEntries) {
                            for (const rid of entry.resIds) {
                                if (fiResIdSet.has(rid)) {
                                    prevImported += entry.treeCount;
                                    break;
                                }
                            }
                        }

                        if (prevImported >= neededTrees) {
                            // FULFILLED
                            const resIds = groupRes.rows.map(r => r.id);
                            await client.query(
                                `UPDATE qlx_fabric_reservations SET status='fulfilled', arrived_at=$1, arrived_by=$2, updated_at=$1 WHERE id=ANY($3)`,
                                [now, req.user.id, resIds]
                            );

                            const linkedChildren = await client.query(
                                `SELECT id, dht_order_id FROM qlx_fabric_reservations WHERE linked_call_id = ANY($1) AND status = 'reserved'`,
                                [resIds]
                            );
                            if (linkedChildren.rows.length > 0) {
                                const childResIds = linkedChildren.rows.map(c => c.id);
                                await client.query(
                                    `UPDATE qlx_fabric_reservations SET status = 'fulfilled', arrived_at = $1, arrived_by = $2, updated_at = $1 WHERE id = ANY($3)`,
                                    [now, req.user.id, childResIds]
                                );
                            }

                            const parentOrders = groupRes.rows.map(r => r.dht_order_id);
                            const childOrders = linkedChildren.rows.map(c => c.dht_order_id);
                            const affectedOrders = [...new Set([...parentOrders, ...childOrders])];

                            for (const ordId of affectedOrders) {
                                const pending = await client.query(
                                    `SELECT COUNT(*)::int AS cnt FROM qlx_fabric_reservations WHERE dht_order_id=$1 AND status='reserved'`,
                                    [ordId]
                                );
                                if (pending.rows[0].cnt === 0) {
                                    await client.query(
                                        `INSERT INTO qlx_preparation (dht_order_id, fabric_arrived, fabric_arrived_at, fabric_arrived_by)
                                         VALUES ($1, true, $2, $3)
                                         ON CONFLICT (dht_order_id) WHERE item_id IS NULL DO UPDATE SET fabric_arrived=true, fabric_arrived_at=$2, fabric_arrived_by=$3, updated_at=$2`,
                                        [ordId, now, req.user.id]
                                    );
                                }
                            }
                        }
                    }
                }

                await client.query(
                    `INSERT INTO import_history (import_id,action,details,performed_by,performed_at) 
                     VALUES ($1,$2,$3,$4,$5)`, 
                    [id, 'check', '✅ Duyệt kiểm tra', req.user.id, now]
                );

            } else if (action === 'uncheck') {
                // Update import_records
                await client.query(
                    `UPDATE import_records 
                     SET is_checked=false, checked_at=NULL, checked_by=NULL, price_approved_by=NULL, price_approved_at=NULL, updated_at=$1 
                     WHERE id=$2`, 
                    [now, id]
                );

                // If fabric import, revert reservations status to pending_price_approval and clear arrived_at/by
                if (record.record_type === 'fabric') {
                    // Revert from_stock reservations
                    await client.query(
                        `UPDATE qlx_fabric_reservations 
                         SET status = 'pending_price_approval', arrived_at = NULL, arrived_by = NULL, updated_at = $1
                         WHERE roll_id IN (SELECT id FROM kv_rolls WHERE source_import_id = $2)`,
                        [now, id]
                    );

                    // Revert new_call reservations in the bill back to reserved
                    const newCallResIds = fabricItems.flatMap(fi => fi.reservation_ids || []).map(Number).filter(n => n > 0);
                    if (newCallResIds.length > 0) {
                        await client.query(
                            `UPDATE qlx_fabric_reservations 
                             SET status = 'reserved', arrived_at = NULL, arrived_by = NULL, updated_at = $1
                             WHERE id = ANY($2)`,
                            [now, newCallResIds]
                        );

                        // Cascade to children
                        await client.query(
                            `UPDATE qlx_fabric_reservations 
                             SET status = 'reserved', arrived_at = NULL, arrived_by = NULL, updated_at = $1
                             WHERE linked_call_id = ANY($2)`,
                            [now, newCallResIds]
                        );
                    }

                    // Reset fabric_arrived on qlx_preparation for affected orders
                    // Find affected orders
                    const ordersRes = await client.query(
                        `SELECT DISTINCT dht_order_id FROM qlx_fabric_reservations 
                         WHERE roll_id IN (SELECT id FROM kv_rolls WHERE source_import_id = $1)
                            OR id = ANY($2)`,
                        [id, newCallResIds.length > 0 ? newCallResIds : [-1]]
                    );
                    const affectedOrders = ordersRes.rows.map(o => o.dht_order_id).filter(Boolean);
                    if (affectedOrders.length > 0) {
                        await client.query(
                            `UPDATE qlx_preparation 
                             SET fabric_arrived = false, fabric_arrived_at = NULL, fabric_arrived_by = NULL 
                             WHERE dht_order_id = ANY($1)`,
                            [affectedOrders]
                        );
                    }
                }

                await client.query(
                    `INSERT INTO import_history (import_id,action,details,performed_by,performed_at) 
                     VALUES ($1,$2,$3,$4,$5)`, 
                    [id, 'uncheck', '↩️ Hoàn tác duyệt', req.user.id, now]
                );
            }

            await client.query('COMMIT');
            return { success: true };
        } catch(err) {
            await client.query('ROLLBACK');
            console.error('[BNH Toggle Check]', err.message);
            return reply.code(400).send({ error: err.message || 'Lỗi xử lý duyệt' });
        } finally {
            client.release();
        }
    });

    // ========== PAYMENTS ==========
    fastify.get('/api/import/payments/:importId', { preHandler: [authenticate] }, async (req) => {
        const importId = Number(req.params.importId);
        const payments = await db.all(`
            SELECT p.*, u.full_name AS paid_by_name 
            FROM import_payments p 
            LEFT JOIN users u ON p.paid_by=u.id 
            WHERE p.import_id=$1 
               OR p.allocations @> jsonb_build_array(jsonb_build_object('bill_id', $1::int))
            ORDER BY p.paid_at DESC`, [importId]);
        return { payments };
    });

    fastify.post('/api/import/payments/:importId', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isAccountant(req))) return reply.code(403).send({ error: 'Chỉ Kế Toán / GĐ / QLCC mới được thanh toán' });
        const importId = Number(req.params.importId);
        const { amount, image_data, note } = req.body || {};
        const payAmt = Number(amount) || 0;
        if (payAmt <= 0) return reply.code(400).send({ error: 'Số tiền không hợp lệ' });
        if (!image_data) return reply.code(400).send({ error: 'Hình ảnh thanh toán bắt buộc (Ctrl+V)' });

        // Get the primary bill and its source
        const rec = await db.get('SELECT id, source_id, total_amount, paid, debt FROM import_records WHERE id=$1', [importId]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy bill' });

        // Calculate total source debt (all bills same source)
        const sourceDebtRow = await db.get('SELECT COALESCE(SUM(debt), 0)::numeric AS total_debt FROM import_records WHERE source_id=$1 AND debt > 0', [rec.source_id]);
        const totalSourceDebt = Number(sourceDebtRow?.total_debt) || 0;
        if (payAmt > totalSourceDebt) {
            return reply.code(400).send({ error: 'Số tiền vượt Tổng Công Nợ còn lại (' + totalSourceDebt.toLocaleString('vi-VN') + '₫). Vui lòng kiểm tra lại!' });
        }

        // Save or resolve image
        let imageUrl = '';
        let fpath = '';
        if (image_data.startsWith('/uploads/')) {
            imageUrl = image_data;
            fpath = path.join(__dirname, '..', image_data);
        } else {
            const dir = path.join(__dirname, '../uploads/bill-nhap-hang/payments');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const fname = `pay_${importId}_${Date.now()}.png`;
            fpath = path.join(dir, fname);
            const base64 = image_data.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(fpath, Buffer.from(base64, 'base64'));
            imageUrl = `/uploads/bill-nhap-hang/payments/${fname}`;
        }

        const now = vnNow();

        // Distribute payment: Prioritize the active bill first, then distribute remainder FIFO
        let remaining = payAmt;
        const allocations = [];

        // 1. Allocate to the primary (clicked) bill first
        const primaryDebt = Number(rec.debt) || 0;
        if (primaryDebt > 0) {
            const allocated = Math.min(remaining, primaryDebt);
            remaining -= allocated;
            allocations.push({ bill_id: rec.id, amount: allocated });

            const newPaid = Number(rec.paid) + allocated;
            const newDebt = Number(rec.total_amount) - newPaid;
            await db.run('UPDATE import_records SET paid=$1, debt=$2, updated_at=$3 WHERE id=$4', [newPaid, newDebt, now, rec.id]);

            const histDetail = '💳 Thanh toán ' + allocated.toLocaleString('vi-VN') + '₫' + (payAmt > allocated ? ' (phân bổ từ TT tổng ' + payAmt.toLocaleString('vi-VN') + '₫)' : '');
            await db.run(`INSERT INTO import_history (import_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [rec.id, 'payment', histDetail, req.user.id, now]);
        }

        // 2. Distribute remainder FIFO to other bills of the same source
        if (remaining > 0) {
            const otherBills = await db.all(
                'SELECT id, total_amount, paid, debt FROM import_records WHERE source_id=$1 AND id!=$2 AND debt > 0 ORDER BY import_date ASC NULLS LAST, created_at ASC',
                [rec.source_id, rec.id]
            );
            for (const bill of otherBills) {
                if (remaining <= 0) break;
                const billDebt = Number(bill.debt) || 0;
                const allocated = Math.min(remaining, billDebt);
                remaining -= allocated;
                allocations.push({ bill_id: bill.id, amount: allocated });

                const newPaid = Number(bill.paid) + allocated;
                const newDebt = Number(bill.total_amount) - newPaid;
                await db.run('UPDATE import_records SET paid=$1, debt=$2, updated_at=$3 WHERE id=$4', [newPaid, newDebt, now, bill.id]);

                const histDetail = '💳 Phân bổ ' + allocated.toLocaleString('vi-VN') + '₫ từ TT nguồn của bill #' + rec.id + ' (tổng ' + payAmt.toLocaleString('vi-VN') + '₫)';
                await db.run(`INSERT INTO import_history (import_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                    [bill.id, 'payment', histDetail, req.user.id, now]);
            }
        }

        // Create payment record with allocations
        const p = await db.get(`INSERT INTO import_payments (import_id,amount,image_url,image_path,note,allocations,paid_by,paid_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
            [importId, payAmt, imageUrl, fpath, note||null, JSON.stringify(allocations), req.user.id, now]);

        return { success: true, id: p.id, allocations };
    });

    fastify.delete('/api/import/payments/:paymentId', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được xóa thanh toán' });
        const paymentId = Number(req.params.paymentId);
        const p = await db.get('SELECT * FROM import_payments WHERE id=$1', [paymentId]);
        if (!p) return reply.code(404).send({ error: 'Không tìm thấy' });

        const now = vnNow();
        // Reverse allocations from JSONB
        const allocs = Array.isArray(p.allocations) ? p.allocations : (typeof p.allocations === 'string' ? JSON.parse(p.allocations || '[]') : []);
        if (allocs.length > 0) {
            for (const alloc of allocs) {
                const bill = await db.get('SELECT total_amount, paid FROM import_records WHERE id=$1', [alloc.bill_id]);
                if (bill) {
                    const newPaid = Math.max(0, Number(bill.paid) - Number(alloc.amount));
                    const newDebt = Number(bill.total_amount) - newPaid;
                    await db.run('UPDATE import_records SET paid=$1, debt=$2, updated_at=$3 WHERE id=$4', [newPaid, newDebt, now, alloc.bill_id]);
                    await db.run(`INSERT INTO import_history (import_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                        [alloc.bill_id, 'delete_payment', '🗑 Xóa phân bổ ' + Number(alloc.amount).toLocaleString('vi-VN') + '₫ (TT #' + paymentId + ')', req.user.id, now]);
                }
            }
        } else {
            // Fallback for old payments without allocations
            const rec = await db.get('SELECT total_amount, paid FROM import_records WHERE id=$1', [p.import_id]);
            if (rec) {
                const newPaid = Math.max(0, Number(rec.paid) - Number(p.amount));
                const newDebt = Number(rec.total_amount) - newPaid;
                await db.run('UPDATE import_records SET paid=$1, debt=$2, updated_at=$3 WHERE id=$4', [newPaid, newDebt, now, p.import_id]);
                await db.run(`INSERT INTO import_history (import_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                    [p.import_id, 'delete_payment', '🗑 Xóa thanh toán ' + Number(p.amount).toLocaleString('vi-VN') + '₫', req.user.id, now]);
            }
        }
        if (p.image_path && fs.existsSync(p.image_path)) { try { fs.unlinkSync(p.image_path); } catch(e) {} }
        await db.run('DELETE FROM import_payments WHERE id=$1', [paymentId]);
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
            material_name=$6,material_quantity=$7,cost=$8,refund=$9,total_amount=$10,paid=$11,debt=$12,cost_notes=$13,updated_at=$14,
            warehouse_id=$15,material_item_id=$16,fabric_items=$17 WHERE id=$18`,
            [b.import_date!==undefined?b.import_date:rec.import_date, b.source_id!==undefined?b.source_id:rec.source_id,
             b.importer_id!==undefined?b.importer_id:rec.importer_id, b.fabric_material!==undefined?b.fabric_material:rec.fabric_material,
             b.fabric_quantity!==undefined?Number(b.fabric_quantity):rec.fabric_quantity,
             b.material_name!==undefined?b.material_name:rec.material_name,
             b.material_quantity!==undefined?Number(b.material_quantity):rec.material_quantity,
             cost, refund, fin.total_amount, paid, fin.debt,
             b.cost_notes!==undefined?b.cost_notes:rec.cost_notes, now,
             b.warehouse_id!==undefined?b.warehouse_id:rec.warehouse_id,
             b.material_item_id!==undefined?b.material_item_id:rec.material_item_id,
             b.fabric_items!==undefined ? (typeof b.fabric_items === 'string' ? b.fabric_items : JSON.stringify(b.fabric_items)) : rec.fabric_items,
             id]);
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

        // Keep fabric_items in sync with fabric_quantity and cost during inline updates
        if (field === 'fabric_quantity' || field === 'cost') {
            const rec = await db.get('SELECT fabric_items FROM import_records WHERE id = $1', [id]);
            if (rec && rec.fabric_items) {
                let items = [];
                try {
                    items = typeof rec.fabric_items === 'string' ? JSON.parse(rec.fabric_items) : (rec.fabric_items || []);
                } catch(e) {}
                if (items && items.length === 1) {
                    if (field === 'fabric_quantity') {
                        items[0].quantity = Number(value) || 0;
                        items[0].cost = (items[0].price || 0) * items[0].quantity;
                    } else if (field === 'cost') {
                        items[0].cost = Number(value) || 0;
                        if (items[0].quantity > 0) {
                            items[0].price = items[0].cost / items[0].quantity;
                        }
                    }
                    await db.run('UPDATE import_records SET fabric_items = $1 WHERE id = $2', [JSON.stringify(items), id]);
                }
            }
        }

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

    // ========== DELETE (with fabric rollback) ==========
    fastify.delete('/api/import/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!MGMT.includes(req.user.role)) return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được xóa' });
        const id = Number(req.params.id);
        const rec = await db.get('SELECT * FROM import_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });

        // If fabric bill → atomic rollback
        if (rec.record_type === 'fabric') {
            const pool = db.getDB();
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                // 1. Rollback kv_rolls + kv_transactions
                const items = typeof rec.fabric_items === 'string' ? JSON.parse(rec.fabric_items) : (rec.fabric_items || []);
                const affectedOrders = [];
                for (const fi of items) {
                    if (fi.roll_ids_created && fi.roll_ids_created.length) {
                        await client.query('DELETE FROM kv_transactions WHERE fabric_color_id = $1 AND description LIKE $2',
                            [fi.fabric_color_id, `%bill ${rec.fabric_import_code}%`]);
                        await client.query('DELETE FROM kv_rolls WHERE id = ANY($1)', [fi.roll_ids_created]);
                    }
                    // 2. Revert QLX reservation status
                    if (fi.reservation_id) {
                        const parentRes = await client.query('SELECT dht_order_id FROM qlx_fabric_reservations WHERE id = $1', [fi.reservation_id]);
                        if (parentRes.rows.length && !affectedOrders.includes(parentRes.rows[0].dht_order_id)) {
                            affectedOrders.push(parentRes.rows[0].dht_order_id);
                        }
                        const childRes = await client.query('SELECT dht_order_id FROM qlx_fabric_reservations WHERE linked_call_id = $1 AND status != $2', [fi.reservation_id, 'released']);
                        for (const cr of childRes.rows) {
                            if (!affectedOrders.includes(cr.dht_order_id)) {
                                affectedOrders.push(cr.dht_order_id);
                            }
                        }

                        await client.query('UPDATE qlx_fabric_reservations SET status=$1, arrived_at=NULL, arrived_by=NULL, updated_at=NOW() WHERE id=$2',
                            ['reserved', fi.reservation_id]);
                        await client.query('UPDATE qlx_fabric_reservations SET status=$1, arrived_at=NULL, arrived_by=NULL, updated_at=NOW() WHERE linked_call_id=$2 AND status!=$3',
                            ['reserved', fi.reservation_id, 'released']);
                    }
                }
                for (const oid of affectedOrders) {
                    const remaining = await client.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'reserved')::int AS pending FROM qlx_fabric_reservations WHERE dht_order_id = $1 AND status != 'released'`, [oid]);
                    if (remaining.rows.length && remaining.rows[0].total > 0 && remaining.rows[0].pending === 0) {
                        await client.query(`INSERT INTO qlx_preparation (dht_order_id, fabric_arrived, fabric_arrived_at, fabric_arrived_by)
                            VALUES ($1, true, NOW(), $2)
                            ON CONFLICT (dht_order_id) WHERE item_id IS NULL DO UPDATE SET fabric_arrived = true, fabric_arrived_at = NOW(), fabric_arrived_by = $2, updated_at = NOW()`,
                            [oid, rec.importer_id]);
                    } else {
                        await client.query(`UPDATE qlx_preparation SET fabric_arrived = false, fabric_arrived_at = NULL, fabric_arrived_by = NULL, updated_at = NOW() WHERE dht_order_id = $1`,
                            [oid]);
                    }
                }
                // 3. Delete cashflow + payment if ship
                if (rec.ship_cashflow_id) {
                    await client.query('DELETE FROM cashflow_records WHERE id=$1', [rec.ship_cashflow_id]);
                }
                if (rec.ship_cashflow_code) {
                    await client.query('DELETE FROM payment_records WHERE payment_code=$1', [rec.ship_cashflow_code]);
                }
                // 4. Delete the record + history
                await client.query('DELETE FROM import_history WHERE import_id=$1', [id]);
                await client.query('DELETE FROM import_records WHERE id=$1', [id]);
                await client.query('COMMIT');
            } catch(err) {
                await client.query('ROLLBACK');
                console.error('[BNH Del Fabric]', err.message);
                return reply.code(500).send({ error: 'Lỗi rollback: ' + err.message });
            } finally { client.release(); }
        } else {
            await db.run('DELETE FROM import_records WHERE id=$1', [id]);
        }
        return { success: true };
    });

    // ========== FABRIC DETAIL ==========
    fastify.get('/api/import/fabric-detail/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await canViewImportBill(req))) {
            return reply.code(403).send({ error: 'Bạn không có quyền xem chi tiết bill nhập vải!' });
        }
        const rec = await db.get(`
            SELECT ir.*, s.name AS source_name, COALESCE(u.full_name, uc.full_name) AS importer_name,
                   w.name AS warehouse_name, mi.name AS material_item_name, mt_list.txs
            FROM import_records ir 
            LEFT JOIN import_sources s ON ir.source_id=s.id 
            LEFT JOIN users u ON ir.importer_id=u.id 
            LEFT JOIN users uc ON ir.created_by=uc.id
            LEFT JOIN material_warehouses w ON ir.warehouse_id=w.id
            LEFT JOIN material_items mi ON ir.material_item_id=mi.id
            LEFT JOIN LATERAL (
                SELECT json_agg(json_build_object('material_item_id', mt.material_item_id, 'tx_id', mt.id, 'seq', seq_list.seq)) AS txs
                FROM material_transactions mt 
                LEFT JOIN (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY material_item_id ORDER BY performed_at ASC, id ASC) AS seq
                    FROM material_transactions
                    WHERE tx_type = 'NHAP'
                ) seq_list ON mt.id = seq_list.id
                WHERE mt.import_record_id = ir.id AND mt.tx_type = 'NHAP'
            ) mt_list ON true
            WHERE ir.id=$1`, [Number(req.params.id)]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy bill nhập' });
        // Calculate total source debt for displaying Tổng Công Nợ
        let total_source_debt = Number(rec.debt) || 0;
        if (rec.source_id) {
            const sd = await db.get('SELECT COALESCE(SUM(debt), 0)::numeric AS total_debt FROM import_records WHERE source_id=$1 AND debt > 0', [rec.source_id]);
            total_source_debt = Number(sd?.total_debt) || 0;
        }
        return { record: rec, total_source_debt };
    });

    // ========== HISTORY ==========
    fastify.get('/api/import/history/:id', { preHandler: [authenticate] }, async (req) => {
        return { history: await db.all(`SELECT h.*, u.full_name AS performer_name FROM import_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.import_id=$1 ORDER BY h.performed_at DESC LIMIT 50`, [Number(req.params.id)]) };
    });

    // ========== STAFF ==========
    fastify.get('/api/import/staff', { preHandler: [authenticate] }, async () => {
        return { staff: await db.all(`SELECT u.id, u.full_name, u.username FROM users u WHERE u.status='active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien') ORDER BY u.full_name`) };
    });

    // ========== RESERVATION ORDERS: Get order codes for reservation IDs ==========
    fastify.get('/api/import/reservation-orders', { preHandler: [authenticate] }, async (req) => {
        const idsStr = req.query.ids || '';
        const ids = idsStr.split(',').map(Number).filter(n => n > 0);
        if (!ids.length) return { orders: [] };
        const rows = await db.all(
            `SELECT DISTINCT o.order_code FROM qlx_fabric_reservations r
             LEFT JOIN dht_orders o ON o.id = r.dht_order_id
             WHERE r.id = ANY($1) AND o.order_code IS NOT NULL`, [ids]
        );
        return { orders: rows.map(r => r.order_code) };
    });

    fastify.get('/api/import/fabric-pending-calls', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isAccountant(req))) return reply.code(403).send({ error: 'Chỉ Kế Toán / GĐ' });

        // 1. Get all pending reservations
        const calls = await db.all(`
            SELECT res.id, res.dht_order_id, res.item_id, res.phoi_index,
                   res.material_name, res.color_name, res.unit,
                   res.call_trees, res.call_amount, res.call_note, res.call_date,
                   o.order_code, it.description AS item_description,
                   u.full_name AS called_by_name,
                   (
                       SELECT COUNT(*)::int 
                       FROM dht_order_items doi2 
                       WHERE doi2.dht_order_id = res.dht_order_id AND doi2.id <= res.item_id
                   ) AS item_index,
                   (
                        SELECT loc.name 
                        FROM qlx_order_print_assignments assign
                        JOIN printing_fields pf ON assign.field_id = pf.id
                        JOIN kv_locations loc ON (loc.printing_contractor_id = assign.operator_id AND assign.operator_type = 'contractor')
                                              OR (loc.user_id = assign.operator_id AND assign.operator_type = 'user')
                        WHERE (assign.item_id = res.item_id
                           OR (assign.dht_order_id = res.dht_order_id AND assign.item_id IS NULL AND NOT EXISTS (
                               SELECT 1 FROM qlx_order_print_assignments WHERE item_id = res.item_id
                           )))
                           AND (LOWER(pf.name) LIKE '%3d%' OR LOWER(pf.name) LIKE '%cắt%')
                           AND LOWER(pf.name) NOT LIKE '%hv cắt%'
                        LIMIT 1
                    ) AS target_shelf
            FROM qlx_fabric_reservations res
            LEFT JOIN dht_orders o ON o.id = res.dht_order_id
            LEFT JOIN dht_order_items it ON it.id = res.item_id
            LEFT JOIN users u ON u.id = res.created_by
            WHERE res.reservation_type = 'new_call' AND res.status = 'reserved'
            ORDER BY res.created_at DESC
        `);

        // 2. Group by material_name + color_name + unit
        const groupMap = {};
        for (const c of calls) {
            const key = `${(c.material_name||'').trim().toUpperCase()}|${(c.color_name||'').trim().toUpperCase()}|${(c.unit||'kg')}`;
            if (!groupMap[key]) {
                groupMap[key] = {
                    material_name: (c.material_name||'').trim(),
                    color_name: (c.color_name||'').trim(),
                    unit: c.unit || 'kg',
                    fabric_color_id: null,
                    total_called_trees: 0,
                    total_called_amount: 0,
                    needed_trees: 0,
                    reservations: []
                };
            }
            const g = groupMap[key];
            const ct = Number(c.call_trees) || 0;
            const ca = Number(c.call_amount) || 0;
            g.total_called_trees += ct;
            g.total_called_amount += ca;
            // Each reservation needs: call_trees + (call_amount > 0 ? 1 : 0)
            g.needed_trees += ct + (ca > 0 ? 1 : 0);
            g.reservations.push({
                id: c.id, dht_order_id: c.dht_order_id, order_code: c.order_code,
                item_id: c.item_id, phoi_index: c.phoi_index,
                item_description: c.item_description,
                call_trees: ct, call_amount: ca, call_note: c.call_note,
                called_by_name: c.called_by_name,
                item_index: Number(c.item_index) || 1,
                target_shelf: c.target_shelf || null
            });
        }

        // 3. Match fabric_color_id for each group using Smart Routing
        for (const key of Object.keys(groupMap)) {
            const g = groupMap[key];
            const match = await db.get(`
                SELECT fc.id AS fabric_color_id, m.warehouse_id, w.unit AS wh_unit,
                       (SELECT COUNT(*)::int FROM kv_rolls r WHERE r.fabric_color_id = fc.id AND r.weight > 0 AND r.is_returned = false) AS active_roll_count,
                       (SELECT COUNT(*)::int FROM kv_rolls r WHERE r.fabric_color_id = fc.id) AS total_roll_count,
                       (SELECT COUNT(*)::int FROM kv_rolls r JOIN kv_fabric_colors fc2 ON fc2.id = r.fabric_color_id WHERE fc2.material_id = m.id) AS material_roll_count
                FROM kv_fabric_colors fc
                JOIN kv_materials m ON m.id = fc.material_id
                JOIN kv_warehouses w ON w.id = m.warehouse_id
                WHERE fc.is_active = true AND m.is_active = true
                  AND UPPER(m.name) = UPPER($1) AND UPPER(fc.color_name) = UPPER($2)
                ORDER BY active_roll_count DESC, total_roll_count DESC, material_roll_count DESC, fc.id DESC
                LIMIT 1
            `, [g.material_name, g.color_name]);
            g.fabric_color_id = match ? match.fabric_color_id : null;
            if (match && match.wh_unit) g.unit = match.wh_unit;
        }

        // 4. Count already imported trees linked to specific reservations (NOT by material+color)
        const allImports = await db.all(`
            SELECT fabric_items FROM import_records WHERE record_type = 'fabric'
        `);
        // Build list of { resIds: Set<number>, treeCount } from all previous import bills
        const importEntries = [];
        for (const ir of allImports) {
            let items = [];
            try { items = typeof ir.fabric_items === 'string' ? JSON.parse(ir.fabric_items) : (ir.fabric_items || []); } catch(e) {}
            for (const fi of items) {
                const resIds = (fi.reservation_ids || []).map(Number).filter(n => n > 0);
                const treeCount = (fi.trees || []).length;
                if (resIds.length > 0 && treeCount > 0) {
                    importEntries.push({ resIds: new Set(resIds), treeCount });
                }
            }
        }

        // 5. Calculate remaining and filter fulfilled groups
        const groups = [];
        for (const key of Object.keys(groupMap)) {
            const g = groupMap[key];
            // Count imported trees ONLY from bills whose reservation_ids overlap with this group
            const groupResIds = new Set(g.reservations.map(r => r.id));
            let imported = 0;
            for (const entry of importEntries) {
                for (const rid of entry.resIds) {
                    if (groupResIds.has(rid)) {
                        imported += entry.treeCount;
                        break; // Count each bill entry only once
                    }
                }
            }
            g.imported_trees = imported;
            g.remaining_trees = Math.max(0, g.needed_trees - g.imported_trees);
            if (g.remaining_trees > 0) groups.push(g);
        }

        const todayStr = vnDateStr(vnNow());
        const violatingReturns = await db.all(`
            WITH seq_hoan AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY tx_date ASC NULLS FIRST, created_at ASC, id ASC) as seq_num
                FROM fabric_transactions
                WHERE tx_type = 'HOAN'
            )
            SELECT ft.id, ft.tx_date, ft.source_name, ft.material_name, ft.color_name, 
                   ft.is_postponed, ft.postponed_target_date, s.seq_num
            FROM fabric_transactions ft
            JOIN seq_hoan s ON ft.id = s.id
            WHERE ft.tx_type = 'HOAN'
              AND COALESCE(ft.is_approved, false) = false
              AND COALESCE(ft.is_canceled, false) = false
              AND (
                  COALESCE(ft.is_postponed, false) = false
                  OR ft.postponed_target_date IS NULL
                  OR ft.postponed_target_date <= $1
              )
            ORDER BY ft.id ASC
        `, [todayStr]);

        const pendingRequestedReturns = await db.all(`
            SELECT r.id, r.weight, r.roll_code, r.created_at, r.return_requested_at,
                   fc.color_name, m.name AS material_name, u.full_name AS requester_name
            FROM kv_rolls r
            JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
            JOIN kv_materials m ON m.id = fc.material_id
            LEFT JOIN users u ON u.id = r.return_requested_by
            WHERE r.return_requested = true AND r.return_tx_id IS NULL AND r.is_returned = false
            ORDER BY r.return_requested_at DESC
        `);

        return { groups, violatingReturns, pendingRequestedReturns };
    });

    // ========== FABRIC IMPORT: Check accountant permission ==========
    fastify.get('/api/import/fabric-check-perm', { preHandler: [authenticate] }, async (req) => {
        return { allowed: await isAccountant(req) };
    });

    // ========== FABRIC IMPORT: Upload image ==========
    fastify.post('/api/import/upload-image', { preHandler: [authenticate] }, async (req, reply) => {
        const data = await req.file();
        if (!data) return reply.code(400).send({ error: 'Không có file' });
        const uploadDir = path.join(__dirname, '..', 'uploads', 'import');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        // Validate MIME type
        if (!data.mimetype || !data.mimetype.startsWith('image/')) {
            return reply.code(400).send({ error: 'Chỉ chấp nhận file ảnh' });
        }
        const buf = await data.toBuffer();
        // Compress if available
        let fileName, filePath;
        try {
            const { compressAndSave } = require('../utils/imageCompressor');
            const result = await compressAndSave(buf, uploadDir, 'imp_');
            fileName = result.fileName; filePath = result.filePath;
        } catch(e) {
            fileName = `imp_${Date.now()}.jpg`;
            filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, buf);
        }
        return { success: true, url: `/uploads/import/${fileName}`, path: filePath };
    });

    // ========== FABRIC IMPORT: Submit (Atomic Transaction) ==========
    fastify.post('/api/import/fabric-submit', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isAccountant(req))) return reply.code(403).send({ error: 'Chỉ Kế Toán / GĐ' });

        function stripAccents(str) {
            if (!str) return '';
            return str.normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/đ/g, "d")
                      .replace(/Đ/g, "D")
                      .toLowerCase()
                      .trim();
        }
        
        // Block submit if there are active return requests (requested by warehouse but not resolved)
        const pendingRequestedReturns = await db.all(
            `SELECT r.id, fc.color_name, m.name AS material_name, r.weight, u.full_name AS requester_name
             FROM kv_rolls r
             JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
             JOIN kv_materials m ON m.id = fc.material_id
             LEFT JOIN users u ON u.id = r.return_requested_by
             WHERE r.return_requested = true AND r.return_tx_id IS NULL AND r.is_returned = false`
        );
        if (pendingRequestedReturns.length > 0) {
            const listStr = pendingRequestedReturns.map(r => 
                `- Yêu cầu hoàn cây vải: ${r.material_name} màu ${r.color_name} cây ${r.weight}kg (gửi bởi ${r.requester_name || 'Lê Việt Trinh'})`
            ).join('\n');
            return reply.code(400).send({
                error: `Không thể nhập vải do đang có yêu cầu lập bill hoàn chưa xử lý. Vui lòng tạo hoàn vải trước:\n${listStr}`
            });
        }

        // Block submit if there are active violating returns
        const todayStr = vnDateStr(vnNow());
        const violatingReturns = await db.all(`
            WITH seq_hoan AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY tx_date ASC NULLS FIRST, created_at ASC, id ASC) as seq_num
                FROM fabric_transactions
                WHERE tx_type = 'HOAN'
            )
            SELECT ft.id, ft.source_name, ft.material_name, ft.color_name, 
                   ft.is_postponed, ft.postponed_target_date, s.seq_num
            FROM fabric_transactions ft
            JOIN seq_hoan s ON ft.id = s.id
            WHERE ft.tx_type = 'HOAN'
              AND COALESCE(ft.is_approved, false) = false
              AND COALESCE(ft.is_canceled, false) = false
              AND (
                  COALESCE(ft.is_postponed, false) = false
                  OR ft.postponed_target_date IS NULL
                  OR ft.postponed_target_date <= $1
              )
            ORDER BY ft.id ASC
        `, [todayStr]);

        if (violatingReturns.length > 0) {
            const listStr = violatingReturns.map(r => {
                const dateStr = r.postponed_target_date ? (r.postponed_target_date.split('T')[0].split('-').reverse().join('/')) : '';
                const reason = r.is_postponed ? `hết hạn lùi (${dateStr})` : 'chưa lùi lịch';
                return `- Bill hoàn #${r.seq_num} (${r.source_name || 'N/A'} - ${r.material_name || 'N/A'}: ${reason})`;
            }).join('\n');
            return reply.code(400).send({ 
                error: `Yêu cầu xử lý các cây hoàn vải ở Nhập Xuất Hoàn Vải trước khi nhập vải:\n${listStr}` 
            });
        }

        const b = req.body || {};
        // Validate
        if (!b.source_id) return reply.code(400).send({ error: 'Chọn nguồn NCC' });
        if (!b.fabric_items || !b.fabric_items.length) return reply.code(400).send({ error: 'Chọn ít nhất 1 loại vải' });
        if (!b.bill_image_url) return reply.code(400).send({ error: 'Ảnh bill bắt buộc' });
        if (Number(b.ship_cost) > 0 && !b.ship_image_url) return reply.code(400).send({ error: 'Có phí ship thì phải có ảnh ship' });
        // Validate each fabric item
        const photoReqRow = await db.get("SELECT value FROM app_config WHERE key = 'fabric_import_require_roll_photo'");
        const isPhotoRequired = photoReqRow ? photoReqRow.value === 'true' : true;

        for (const fi of b.fabric_items) {
            if (!fi.trees || !fi.trees.length) return reply.code(400).send({ error: `${fi.material_name} - ${fi.color_name}: nhập ít nhất 1 cây` });
            for (let t = 0; t < fi.trees.length; t++) {
                if (!fi.trees[t].weight || Number(fi.trees[t].weight) <= 0) {
                    return reply.code(400).send({ error: `${fi.material_name}: Cây ${t+1} phải có trọng lượng > 0` });
                }
                if (isPhotoRequired && !fi.trees[t].image_path) {
                    return reply.code(400).send({ error: `${fi.material_name} - ${fi.color_name}: Cây ${t+1} bắt buộc phải chụp ảnh định danh` });
                }
            }
        }
        // Validate extra_costs
        const extraCosts = b.extra_costs || [];
        for (const ec of extraCosts) {
            if (!ec.content || !ec.content.trim()) return reply.code(400).send({ error: 'Nội dung chi phí không được trống' });
            if (!ec.amount || Number(ec.amount) <= 0) return reply.code(400).send({ error: 'Số tiền chi phí phải > 0' });
        }

        const now = vnNow();
        const pool = db.getDB();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Generate unique fabric_import_code
            let fabricCode;
            for (let attempt = 0; attempt < 5; attempt++) {
                fabricCode = genFabricCode();
                const exists = await client.query('SELECT 1 FROM import_records WHERE fabric_import_code=$1', [fabricCode]);
                if (exists.rows.length === 0) break;
                if (attempt === 4) throw new Error('Không thể tạo mã nhập vải duy nhất');
            }

            // 2. Lock and validate reservations (now supports multiple IDs per item)
            const reservationIds = b.fabric_items.flatMap(fi => fi.reservation_ids || (fi.reservation_id ? [fi.reservation_id] : [])).filter(Boolean);
            if (reservationIds.length > 0) {
                const locked = await client.query(
                    `SELECT id, status FROM qlx_fabric_reservations WHERE id = ANY($1) FOR UPDATE`,
                    [reservationIds]
                );
                for (const row of locked.rows) {
                    if (row.status !== 'reserved') {
                        throw new Error(`Yêu cầu gọi vải #${row.id} đã được xử lý bởi người khác`);
                    }
                }
            }

            // 2.5. Check for price discrepancy
            let requiresPriceApproval = false;
            for (const fi of b.fabric_items) {
                let colorId = fi.fabric_color_id;
                if (!colorId) {
                    // New fabric color created on the fly -> requires approval
                    requiresPriceApproval = true;
                    continue;
                }
                const approvedRes = await client.query(
                    `SELECT price FROM approved_import_prices 
                     WHERE item_type = 'fabric' AND fabric_color_id = $1 AND source_id = $2`,
                    [colorId, b.source_id]
                );
                if (approvedRes.rows.length === 0) {
                    requiresPriceApproval = true;
                } else if (Number(approvedRes.rows[0].price) !== Number(fi.unit_price)) {
                    requiresPriceApproval = true;
                }
            }

            // 3. Create kv_rolls for each fabric item + tree
            const fabricItemsResult = [];
            let totalFabricQty = 0;
            const fabricMaterialNames = [];

            for (const fi of b.fabric_items) {
                // Auto-create material/color on the fly if fabric_color_id is missing/null
                if (!fi.fabric_color_id) {
                    const matNameClean = (fi.material_name || '').trim();
                    const colNameClean = (fi.color_name || '').trim();
                    if (matNameClean && colNameClean) {
                        // Get all active materials and check accent-insensitive match
                        const allMats = await client.query(`SELECT id, name FROM kv_materials`);
                        const matchedMat = allMats.rows.find(m => stripAccents(m.name) === stripAccents(matNameClean));

                        let matId;
                        if (matchedMat) {
                            matId = matchedMat.id;
                            // Update material name in request to keep correct accents
                            fi.material_name = matchedMat.name;
                        } else {
                            const whRes = await client.query(`SELECT id FROM kv_warehouses WHERE is_active = true ORDER BY display_order, id LIMIT 1`);
                            const defaultWhId = whRes.rows.length > 0 ? whRes.rows[0].id : 1;
                            const newMatRes = await client.query(
                                `INSERT INTO kv_materials (warehouse_id, name, is_active, created_by) VALUES ($1, $2, true, $3) RETURNING id`,
                                [defaultWhId, matNameClean, req.user.id]
                            );
                            matId = newMatRes.rows[0].id;
                        }

                        // Get all colors for this material and check accent-insensitive match
                        const allCols = await client.query(`SELECT id, color_name FROM kv_fabric_colors WHERE material_id = $1`, [matId]);
                        const matchedCol = allCols.rows.find(c => stripAccents(c.color_name) === stripAccents(colNameClean));

                        if (matchedCol) {
                            fi.fabric_color_id = matchedCol.id;
                            // Update color name in request to keep correct accents
                            fi.color_name = matchedCol.color_name;
                        } else {
                            const newColRes = await client.query(
                                `INSERT INTO kv_fabric_colors (material_id, color_name, is_active, created_by) VALUES ($1, $2, true, $3) RETURNING id`,
                                [matId, colNameClean, req.user.id]
                            );
                            fi.fabric_color_id = newColRes.rows[0].id;
                        }
                    }
                }

                const rollIds = [];
                let itemTotalWeight = 0;
                const unitPrice = Number(fi.unit_price) || 0;
                const treesWithCost = [];

                // Resolve target shelf once per fabric item
                const resIds = fi.reservation_ids || [];
                const calledOrders = [];
                const autoReserveTargets = [];
                let itemTargetLocation = null;

                if (resIds.length > 0) {
                    const resRows = await client.query(
                        `SELECT r.id, r.dht_order_id, r.item_id, r.phoi_index, r.material_name, r.color_name, r.unit,
                                o.order_code
                         FROM qlx_fabric_reservations r
                         LEFT JOIN dht_orders o ON o.id = r.dht_order_id
                         WHERE r.id = ANY($1)`, [resIds]
                    );
                    for (const rr of resRows.rows) {
                        if (rr.order_code && !calledOrders.includes(rr.order_code)) calledOrders.push(rr.order_code);
                        autoReserveTargets.push(rr);
                    }

                    // Query print assignment target shelf for any of the reservations
                    for (const target of autoReserveTargets) {
                        const assignRes = await client.query(
                            `SELECT operator_type, operator_id 
                             FROM qlx_order_print_assignments 
                             WHERE (item_id = $1)
                                OR (dht_order_id = $2 AND item_id IS NULL AND NOT EXISTS (
                                    SELECT 1 FROM qlx_order_print_assignments WHERE item_id = $1
                                ))`,
                            [target.item_id, target.dht_order_id]
                        );
                        for (const assign of assignRes.rows) {
                            const locRes = await client.query(
                                `SELECT name FROM kv_locations 
                                 WHERE (printing_contractor_id = $1 AND $2 = 'contractor')
                                    OR (user_id = $1 AND $2 = 'user')`,
                                [assign.operator_id, assign.operator_type]
                            );
                            if (locRes.rows.length > 0 && locRes.rows[0].name) {
                                itemTargetLocation = locRes.rows[0].name;
                                break;
                            }
                        }
                        if (itemTargetLocation) break;
                    }
                }

                for (const tree of fi.trees) {
                    const w = Number(tree.weight);
                    const treeCost = Math.round(w * unitPrice);
                    itemTotalWeight += w;
                    treesWithCost.push({ weight: w, cost: treeCost, image_path: tree.image_path || null });
                    if (fi.fabric_color_id) {
                        const rollCode = 'KV' + crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 10);
                        const rollResult = await client.query(
                            `INSERT INTO kv_rolls (fabric_color_id, roll_code, weight, original_weight, location, source, note, created_by, image_path)
                             VALUES ($1, $2, $3, $3, $4, 'nhap_vai', $5, $6, $7) RETURNING id`,
                            [fi.fabric_color_id, rollCode, w, itemTargetLocation, `Nhập vải từ bill ${fabricCode}`, req.user.id, tree.image_path || null]
                        );
                        const newRollId = rollResult.rows[0].id;
                        rollIds.push(newRollId);

                        // Tag roll with source info
                        if (calledOrders.length > 0) {
                            // source_import_id will be updated after import_records INSERT (we don't have the ID yet)
                            await client.query(
                                `UPDATE kv_rolls SET called_for_orders = $1::jsonb WHERE id = $2`,
                                [JSON.stringify(calledOrders), newRollId]
                            );
                        }

                        // Auto-create from_stock reservations for each linked order
                        for (const target of autoReserveTargets) {
                            await client.query(
                                `INSERT INTO qlx_fabric_reservations (dht_order_id, item_id, phoi_index, material_name, color_name, unit,
                                    reservation_type, roll_id, roll_code, kg_reserved, status, arrived_at, arrived_by, created_by)
                                 VALUES ($1,$2,$3,$4,$5,$6,'from_stock',$7,$8,$9,$10,$11,$12,$13)`,
                                [target.dht_order_id, target.item_id, target.phoi_index,
                                 target.material_name, target.color_name, target.unit || 'kg',
                                 newRollId, rollCode, w, 
                                 requiresPriceApproval ? 'pending_price_approval' : 'arrived', 
                                 requiresPriceApproval ? null : now, 
                                 requiresPriceApproval ? null : req.user.id, 
                                 req.user.id]
                            );

                            // Also create from_stock reservation for any linked children
                            const childRes = await client.query(
                                `SELECT id, dht_order_id, item_id, phoi_index, material_name, color_name, unit
                                 FROM qlx_fabric_reservations
                                 WHERE linked_call_id = $1 AND status = 'reserved'`,
                                [target.id]
                            );
                            for (const child of childRes.rows) {
                                await client.query(
                                    `INSERT INTO qlx_fabric_reservations (dht_order_id, item_id, phoi_index, material_name, color_name, unit,
                                        reservation_type, roll_id, roll_code, kg_reserved, status, arrived_at, arrived_by, created_by)
                                     VALUES ($1,$2,$3,$4,$5,$6,'from_stock',$7,$8,$9,$10,$11,$12,$13)`,
                                    [child.dht_order_id, child.item_id, child.phoi_index,
                                     child.material_name, child.color_name, child.unit || 'kg',
                                     newRollId, rollCode, w, 
                                     requiresPriceApproval ? 'pending_price_approval' : 'arrived', 
                                     requiresPriceApproval ? null : now, 
                                     requiresPriceApproval ? null : req.user.id, 
                                     req.user.id]
                                );
                            }
                        }

                        await client.query(
                            `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
                             VALUES ($1, 'NHAP', $2, $3, $4)`,
                            [fi.fabric_color_id, w, `Nhập vải: ${fi.material_name} - ${fi.color_name} (${w}${fi.unit || 'kg'}) bill ${fabricCode}`, req.user.id]
                        );
                    }
                }
                const itemCost = treesWithCost.reduce((s, t) => s + t.cost, 0);
                totalFabricQty += itemTotalWeight;
                fabricMaterialNames.push(`${fi.material_name} - ${fi.color_name}`);

                fabricItemsResult.push({
                    reservation_ids: fi.reservation_ids || [],
                    material_name: fi.material_name,
                    color_name: fi.color_name,
                    unit: fi.unit || 'kg',
                    unit_price: unitPrice,
                    trees: treesWithCost,
                    actual_total: itemTotalWeight,
                    item_cost: itemCost,
                    fabric_color_id: fi.fabric_color_id || null,
                    roll_ids_created: rollIds
                });
            }

            // 4. Smart fulfillment check per reservation group (NOT by material+color)
            if (!requiresPriceApproval) {
                // Count imported trees from PREVIOUS bills linked to same reservation IDs
                const allImportRows = await client.query(`SELECT fabric_items FROM import_records WHERE record_type='fabric'`);
                const prevImportEntries = [];
                for (const row of allImportRows.rows) {
                    let items = []; try { items = typeof row.fabric_items === 'string' ? JSON.parse(row.fabric_items) : (row.fabric_items || []); } catch(e) {}
                    for (const fi of items) {
                        const resIds = (fi.reservation_ids || []).map(Number).filter(n => n > 0);
                        const treeCount = (fi.trees || []).length;
                        if (resIds.length > 0 && treeCount > 0) {
                            prevImportEntries.push({ resIds: new Set(resIds), treeCount });
                        }
                    }
                }

                // For each fabric item in this bill, check fulfillment by reservation_ids
                const checkedResGroups = new Set();
                for (const fi of fabricItemsResult) {
                    const fiResIds = (fi.reservation_ids || []).map(Number).filter(n => n > 0);
                    if (!fiResIds.length) continue;
                    const resKey = fiResIds.slice().sort((a, b) => a - b).join(',');
                    if (checkedResGroups.has(resKey)) continue;
                    checkedResGroups.add(resKey);

                    const fiResIdSet = new Set(fiResIds);

                    // Get the specific reservations linked to this bill
                    const groupRes = await client.query(
                        `SELECT id, dht_order_id, call_trees, call_amount FROM qlx_fabric_reservations
                         WHERE id = ANY($1) AND reservation_type='new_call' AND status='reserved'
                         FOR UPDATE`,
                        [fiResIds]
                    );
                    if (groupRes.rows.length === 0) continue;

                    // Calculate needed trees for these specific reservations
                    let neededTrees = 0;
                    for (const r of groupRes.rows) {
                        neededTrees += (Number(r.call_trees) || 0) + (Number(r.call_amount) > 0 ? 1 : 0);
                    }

                    // Count trees from PREVIOUS bills linked to same reservations
                    let prevImported = 0;
                    for (const entry of prevImportEntries) {
                        for (const rid of entry.resIds) {
                            if (fiResIdSet.has(rid)) {
                                prevImported += entry.treeCount;
                                break; // Count each bill entry only once
                            }
                        }
                    }

                    // Count trees from THIS bill for this reservation group
                    let thisImported = 0;
                    for (const fi2 of fabricItemsResult) {
                        const fi2ResIds = (fi2.reservation_ids || []).map(Number);
                        for (const rid of fi2ResIds) {
                            if (fiResIdSet.has(rid)) {
                                thisImported += (fi2.trees || []).length;
                                break; // Count each fabric item only once
                            }
                        }
                    }

                    const totalImported = prevImported + thisImported;

                    if (totalImported >= neededTrees) {
                        // FULFILLED → mark new_call reservations as 'fulfilled'
                        const resIds = groupRes.rows.map(r => r.id);
                        await client.query(
                            `UPDATE qlx_fabric_reservations SET status='fulfilled', arrived_at=$1, arrived_by=$2, updated_at=$1 WHERE id=ANY($3)`,
                            [now, req.user.id, resIds]
                        );

                        // Cascade arrive to all linked children (linked_call)
                        const linkedChildren = await client.query(
                            `SELECT id, dht_order_id FROM qlx_fabric_reservations WHERE linked_call_id = ANY($1) AND status = 'reserved'`,
                            [resIds]
                        );
                        if (linkedChildren.rows.length > 0) {
                            const childResIds = linkedChildren.rows.map(c => c.id);
                            await client.query(
                                `UPDATE qlx_fabric_reservations SET status = 'fulfilled', arrived_at = $1, arrived_by = $2, updated_at = $1 WHERE id = ANY($3)`,
                                [now, req.user.id, childResIds]
                            );
                        }

                        // Auto-check order-level fabric_arrived for each affected order (including children)
                        const parentOrders = groupRes.rows.map(r => r.dht_order_id);
                        const childOrders = linkedChildren.rows.map(c => c.dht_order_id);
                        const affectedOrders = [...new Set([...parentOrders, ...childOrders])];

                        for (const ordId of affectedOrders) {
                            const pending = await client.query(
                                `SELECT COUNT(*)::int AS cnt FROM qlx_fabric_reservations WHERE dht_order_id=$1 AND status='reserved'`,
                                [ordId]
                            );
                            if (pending.rows[0].cnt === 0) {
                                await client.query(
                                    `INSERT INTO qlx_preparation (dht_order_id, fabric_arrived, fabric_arrived_at, fabric_arrived_by)
                                     VALUES ($1, true, $2, $3)
                                     ON CONFLICT (dht_order_id) WHERE item_id IS NULL DO UPDATE SET fabric_arrived=true, fabric_arrived_at=$2, fabric_arrived_by=$3, updated_at=$2`,
                                    [ordId, now, req.user.id]
                                );
                            }
                        }
                    }
                }
            }

            // 5. Calculate financials (auto from unit_price × weight)
            const fabricCost = fabricItemsResult.reduce((s, fi) => s + (fi.item_cost || 0), 0);
            const extraCostTotal = extraCosts.reduce((s, ec) => s + (Number(ec.amount) || 0), 0);
            const vatAmount = Number(b.vat_amount) || 0;
            const totalCost = fabricCost + extraCostTotal + vatAmount;
            const paid = 0; // Payment handled in separate module
            const totalDebt = totalCost;

            // 6. Handle ship cost → create cashflow CHI
            let shipCfId = null, shipCfCode = null;
            const shipCost = Number(b.ship_cost) || 0;
            if (shipCost > 0) {
                // Get source name for description
                const src = await client.query('SELECT name FROM import_sources WHERE id=$1', [b.source_id]);
                const srcName = src.rows[0]?.name || 'N/A';
                const dd = String(now.getDate()).padStart(2, '0');
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const yyyy = now.getFullYear();
                const cfDate = `${yyyy}-${mm}-${dd}`;
                const cfDesc = `Chi ship vận chuyển vải + ${srcName} + ${dd}/${mm}/${yyyy}`;

                // Get next TM seq
                const prRow = await client.query(
                    `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM payment_records WHERE payment_date = $1 AND payment_method = 'TM'`,
                    [cfDate]
                );
                const cfRow = await client.query(
                    `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM cashflow_records WHERE cashflow_date = $1 AND cashflow_code LIKE 'TM%'`,
                    [cfDate]
                );
                const seq = Math.max(Number(prRow.rows[0].max_seq), Number(cfRow.rows[0].max_seq)) + 1;
                const yy = String(yyyy).slice(-2);
                const cfCode = `TM${seq}-${now.getDate()}-${now.getMonth() + 1}-Y${yy}`;

                // Reserve TM code in payment_records
                await client.query(
                    `INSERT INTO payment_records (payment_code, payment_method, daily_seq, amount, payment_type, transfer_note, money_source, source, payment_date, created_by)
                     VALUES ($1, 'TM', $2, $3, 'chi', $4, 'congty', 'cashflow_chi', $5, $6)`,
                    [cfCode, seq, shipCost, cfDesc, cfDate, req.user.id]
                );
                // Create cashflow CHI
                const cfResult = await client.query(
                    `INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, image_url, money_source, created_by)
                     VALUES ($1, 'CHI', $2, $3, $4, $5, $6, 'congty', $7) RETURNING id, cashflow_code`,
                    [cfCode, seq, cfDate, cfDesc, shipCost, b.ship_image_url || null, req.user.id]
                );
                shipCfId = cfResult.rows[0].id;
                shipCfCode = cfResult.rows[0].cashflow_code;
            }

            // 7. Insert import_records
            const importResult = await client.query(
                `INSERT INTO import_records (record_type, fabric_import_code, import_date, source_id, importer_id,
                    fabric_material, fabric_quantity, fabric_items, extra_costs,
                    cost, total_amount, paid, debt,
                    ship_cost, ship_image_url, ship_image_path, ship_cashflow_id, ship_cashflow_code,
                    bill_image_url, bill_image_path, cost_notes, vat_amount,
                    created_by, created_at, requires_price_approval)
                 VALUES ('fabric', $1, $2, $3, $4,
                    $5, $6, $7::jsonb, $8::jsonb,
                    $9, $10, $11, $12,
                    $13, $14, $15, $16, $17,
                    $18, $19, $20, $21,
                    $22, $23, $24) RETURNING id`,
                [fabricCode, now, b.source_id, req.user.id,
                 fabricMaterialNames.join(', '), totalFabricQty, JSON.stringify(fabricItemsResult), JSON.stringify(extraCosts),
                 totalCost, totalCost, paid, totalDebt,
                 shipCost, b.ship_image_url || null, b.ship_image_path || null, shipCfId, shipCfCode,
                 b.bill_image_url, b.bill_image_path || null, b.cost_notes || null, vatAmount,
                 req.user.id, now, requiresPriceApproval]
            );
            const importId = importResult.rows[0].id;

            // 7b. Backfill source_import_id on created rolls
            const allCreatedRollIds = fabricItemsResult.reduce((arr, fi) => arr.concat(fi.roll_ids_created || []), []);
            if (allCreatedRollIds.length > 0) {
                await client.query(
                    `UPDATE kv_rolls SET source_import_id = $1 WHERE id = ANY($2)`,
                    [importId, allCreatedRollIds]
                );
            }

            // 8. History
            await client.query(
                `INSERT INTO import_history (import_id, action, details, performed_by, performed_at)
                 VALUES ($1, 'create_fabric', $2, $3, $4)`,
                [importId, `🧵 Nhập vải: ${fabricMaterialNames.join(', ')} | Mã: ${fabricCode}`, req.user.id, now]
            );

            await client.query('COMMIT');

            // Send Telegram for ship (outside transaction)
            if (shipCost > 0 && shipCfCode) {
                try {
                    const tgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cashflow_group'");
                    if (tgRow && tgRow.value) {
                        const { sendTelegramPhoto, sendTelegramMessage } = require('../utils/telegram');
                        const amtStr = shipCost.toLocaleString('vi-VN');
                        const src = await db.get('SELECT name FROM import_sources WHERE id=$1', [b.source_id]);
                        const caption = `🔴CHI TM <b>CÔNG TY</b> :\n💰${shipCfCode} : <b>${amtStr}đ</b> Chi ship vận chuyển vải + ${src?.name || ''} 👤 ${req.user.full_name || req.user.username}\n\n🧵 Bill nhập vải: ${fabricCode}`;
                        if (b.ship_image_path) await sendTelegramPhoto(tgRow.value, b.ship_image_path, caption);
                        else await sendTelegramMessage(tgRow.value, caption);
                    }
                } catch(tgErr) { console.error('[BNH TG]', tgErr.message); }
            }

            return { success: true, id: importId, fabric_import_code: fabricCode, ship_cashflow_code: shipCfCode };

        } catch(err) {
            await client.query('ROLLBACK');
            console.error('[BNH Fabric]', err.message);
            return reply.code(400).send({ error: err.message || 'Lỗi khi nhập vải' });
        } finally {
            client.release();
        }
    });

    // ========== MATERIAL SETUP APIS ==========
    fastify.get('/api/material-setup/data', { preHandler: [authenticate] }, async (req) => {
        const includeInactive = req.user.role === 'giam_doc';
        const whWhere = includeInactive ? '' : 'WHERE is_active=true';
        const miWhere = includeInactive ? '' : 'WHERE is_active=true';
        const unWhere = includeInactive ? '' : 'WHERE is_active=true';
        const warehouses = await db.all(`SELECT * FROM material_warehouses ${whWhere} ORDER BY display_order, id`);
        const materials = await db.all(`SELECT * FROM material_items ${miWhere} ORDER BY warehouse_id, display_order, id`);
        const warehouse_sources = await db.all(`SELECT * FROM material_warehouse_sources`);
        const units = await db.all(`SELECT * FROM material_units ${unWhere} ORDER BY display_order, id`);
        return { warehouses, materials, warehouse_sources, units };
    });

    fastify.post('/api/material-setup/warehouses', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được cấu hình' });
        const { name, display_order, is_active } = req.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Tên kho không được để trống' });
        try {
            const r = await db.get(`INSERT INTO material_warehouses (name, display_order, is_active) VALUES ($1, $2, $3) RETURNING id`,
                [name.trim(), Number(display_order)||0, is_active !== false]);
            return { success: true, id: r.id };
        } catch(e) {
            return reply.code(400).send({ error: 'Tên kho đã tồn tại hoặc không hợp lệ' });
        }
    });

    fastify.put('/api/material-setup/warehouses/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được cấu hình' });
        const { name, display_order, is_active } = req.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Tên kho không được để trống' });
        const id = Number(req.params.id);
        try {
            await db.run(`UPDATE material_warehouses SET name=$1, display_order=$2, is_active=$3, updated_at=NOW() WHERE id=$4`,
                [name.trim(), Number(display_order)||0, is_active !== false, id]);
            return { success: true };
        } catch(e) {
            return reply.code(400).send({ error: 'Lỗi cập nhật hoặc tên kho đã trùng lặp' });
        }
    });

    fastify.post('/api/material-setup/items', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được cấu hình' });
        const { warehouse_id, name, display_order, is_active, unit } = req.body || {};
        if (!warehouse_id) return reply.code(400).send({ error: 'Vui lòng chọn kho' });
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Tên vật liệu không được để trống' });
        try {
            const r = await db.get(`INSERT INTO material_items (warehouse_id, name, display_order, is_active, unit) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [Number(warehouse_id), name.trim(), Number(display_order)||0, is_active !== false, unit ? unit.trim() : null]);
            return { success: true, id: r.id };
        } catch(e) {
            return reply.code(400).send({ error: 'Tên vật liệu đã tồn tại trong kho này' });
        }
    });

    fastify.put('/api/material-setup/items/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được cấu hình' });
        const { name, display_order, is_active, unit } = req.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Tên vật liệu không được để trống' });
        const id = Number(req.params.id);
        try {
            await db.run(`UPDATE material_items SET name=$1, display_order=$2, is_active=$3, unit=$4, updated_at=NOW() WHERE id=$5`,
                [name.trim(), Number(display_order)||0, is_active !== false, unit ? unit.trim() : null, id]);
            return { success: true };
        } catch(e) {
            return reply.code(400).send({ error: 'Lỗi cập nhật hoặc tên vật liệu đã trùng lặp trong kho' });
        }
    });

    fastify.post('/api/material-setup/warehouse-sources', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được cấu hình' });
        const { warehouse_id, source_ids } = req.body || {};
        if (!warehouse_id) return reply.code(400).send({ error: 'Vui lòng chọn kho' });
        const wid = Number(warehouse_id);
        const sids = Array.isArray(source_ids) ? source_ids.map(Number).filter(n => n > 0) : [];
        
        const pool = db.getDB();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM material_warehouse_sources WHERE warehouse_id = $1', [wid]);
            for (const sid of sids) {
                await client.query('INSERT INTO material_warehouse_sources (warehouse_id, source_id) VALUES ($1, $2)', [wid, sid]);
            }
            await client.query('COMMIT');
            return { success: true };
        } catch(e) {
            await client.query('ROLLBACK');
            return reply.code(500).send({ error: 'Lỗi đồng bộ nhà cung cấp: ' + e.message });
        } finally {
            client.release();
        }
    });

    fastify.post('/api/material-setup/units', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được cấu hình' });
        const { name, display_order, is_active } = req.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Tên định lượng không được để trống' });
        try {
            const r = await db.get(`INSERT INTO material_units (name, display_order, is_active) VALUES ($1, $2, $3) RETURNING id`,
                [name.trim(), Number(display_order)||0, is_active !== false]);
            return { success: true, id: r.id };
        } catch(e) {
            return reply.code(400).send({ error: 'Tên định lượng đã tồn tại hoặc không hợp lệ' });
        }
    });

    fastify.put('/api/material-setup/units/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được cấu hình' });
        const { name, display_order, is_active } = req.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Tên định lượng không được để trống' });
        const id = Number(req.params.id);
        try {
            await db.run(`UPDATE material_units SET name=$1, display_order=$2, is_active=$3 WHERE id=$4`,
                [name.trim(), Number(display_order)||0, is_active !== false, id]);
            return { success: true };
        } catch(e) {
            return reply.code(400).send({ error: 'Lỗi cập nhật hoặc tên định lượng đã trùng lặp' });
        }
    });

    // ========== GIA NHAP GOC (ORIGINAL IMPORT PRICE) APIS ==========
    fastify.get('/api/gianhapgoc/prices', { preHandler: [authenticate] }, async (req) => {
        const prices = await db.all(`
            SELECT 
                ap.*,
                s.name AS source_name,
                CASE 
                    WHEN ap.item_type = 'fabric' THEN kfc.name
                    ELSE mi.name 
                END AS item_name,
                kfm.name AS fabric_material_name,
                kfc.name AS fabric_color_name,
                wh.name AS warehouse_name
            FROM approved_import_prices ap
            LEFT JOIN import_sources s ON ap.source_id = s.id
            LEFT JOIN kv_fabric_colors kfc ON ap.fabric_color_id = kfc.id
            LEFT JOIN kv_fabric_materials kfm ON kfc.material_id = kfm.id
            LEFT JOIN material_items mi ON ap.material_item_id = mi.id
            LEFT JOIN material_warehouses wh ON mi.warehouse_id = wh.id
            ORDER BY ap.item_type, s.name, ap.id
        `);
        return { prices };
    });

    fastify.get('/api/gianhapgoc/history', { preHandler: [authenticate] }, async (req) => {
        const history = await db.all(`
            SELECT 
                ir.id AS import_id,
                ir.fabric_import_code AS import_code,
                ir.import_date,
                ir.source_id,
                s.name AS source_name,
                'fabric' AS item_type,
                (fi->>'fabric_color_id')::int AS fabric_color_id,
                fi->>'material_name' AS material_name,
                fi->>'color_name' AS color_name,
                NULL::int AS material_item_id,
                (fi->>'unit_price')::numeric AS unit_price,
                ir.is_checked,
                ir.requires_price_approval,
                ir.price_approved_at,
                u.full_name AS price_approved_by_name
            FROM import_records ir
            CROSS JOIN LATERAL jsonb_array_elements(ir.fabric_items) fi
            LEFT JOIN import_sources s ON ir.source_id = s.id
            LEFT JOIN users u ON ir.price_approved_by = u.id
            WHERE ir.record_type = 'fabric' AND ir.fabric_items IS NOT NULL AND ir.fabric_items::text != '[]'
            
            UNION ALL
            
            SELECT 
                ir.id AS import_id,
                NULL AS import_code,
                ir.import_date,
                ir.source_id,
                s.name AS source_name,
                'material' AS item_type,
                NULL::int AS fabric_color_id,
                mi.name AS material_name,
                NULL AS color_name,
                (fi->>'material_item_id')::int AS material_item_id,
                (fi->>'price')::numeric AS unit_price,
                ir.is_checked,
                ir.requires_price_approval,
                ir.price_approved_at,
                u.full_name AS price_approved_by_name
            FROM import_records ir
            CROSS JOIN LATERAL jsonb_array_elements(ir.fabric_items) fi
            LEFT JOIN material_items mi ON (fi->>'material_item_id')::int = mi.id
            LEFT JOIN import_sources s ON ir.source_id = s.id
            LEFT JOIN users u ON ir.price_approved_by = u.id
            WHERE ir.record_type = 'general' AND ir.fabric_items IS NOT NULL AND ir.fabric_items::text != '[]'
            
            ORDER BY import_date DESC, import_id DESC
        `);
        return { history };
    });

    fastify.get('/api/gianhapgoc/pending', { preHandler: [authenticate] }, async (req) => {
        // Get all import records requiring price approval
        const records = await db.all(`
            SELECT ir.*, s.name AS source_name, u.full_name AS importer_name
            FROM import_records ir
            LEFT JOIN import_sources s ON ir.source_id = s.id
            LEFT JOIN users u ON ir.importer_id = u.id
            WHERE ir.requires_price_approval = true AND ir.is_checked = false
            ORDER BY ir.import_date DESC, ir.id DESC
        `);

        // Compute discrepancies for each record
        const pendingList = [];
        for (const rec of records) {
            const items = typeof rec.fabric_items === 'string' ? JSON.parse(rec.fabric_items) : (rec.fabric_items || []);
            const discrepancies = [];
            for (const item of items) {
                let approvedPrice = null;
                let itemName = '';
                if (rec.record_type === 'fabric') {
                    itemName = `${item.material_name || ''} - ${item.color_name || ''}`;
                    if (item.fabric_color_id) {
                        const appRes = await db.get(
                            `SELECT price FROM approved_import_prices 
                             WHERE item_type = 'fabric' AND fabric_color_id = $1 AND source_id = $2`,
                            [item.fabric_color_id, rec.source_id]
                        );
                        approvedPrice = appRes ? Number(appRes.price) : null;
                    }
                } else {
                    itemName = item.material_name || '';
                    if (item.material_item_id) {
                        const appRes = await db.get(
                            `SELECT price FROM approved_import_prices 
                             WHERE item_type = 'material' AND material_item_id = $1 AND source_id = $2`,
                            [item.material_item_id, rec.source_id]
                        );
                        approvedPrice = appRes ? Number(appRes.price) : null;
                    }
                }
                const unitPrice = Number(rec.record_type === 'fabric' ? item.unit_price : item.price) || 0;
                if (approvedPrice === null || approvedPrice !== unitPrice) {
                    discrepancies.push({
                        item_name: itemName,
                        unit_price: unitPrice,
                        approved_price: approvedPrice,
                        difference: approvedPrice !== null ? (unitPrice - approvedPrice) : null
                    });
                }
            }
            pendingList.push({
                ...rec,
                discrepancies
            });
        }
        return { pending: pendingList };
    });

    fastify.post('/api/gianhapgoc/set-price', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isDuyetUser(req))) {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc QLCC mới có quyền thay đổi giá gốc' });
        }
        const { item_type, fabric_color_id, material_item_id, source_id, price } = req.body || {};
        if (!item_type || !source_id || price === undefined) {
            return reply.code(400).send({ error: 'Thiếu thông tin yêu cầu' });
        }

        try {
            if (item_type === 'fabric') {
                if (!fabric_color_id) return reply.code(400).send({ error: 'Thiếu fabric_color_id' });
                await db.run(`
                    INSERT INTO approved_import_prices (item_type, fabric_color_id, source_id, price, created_by, updated_at)
                    VALUES ('fabric', $1, $2, $3, $4, NOW())
                    ON CONFLICT (fabric_color_id, source_id) WHERE item_type = 'fabric'
                    DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()`,
                    [fabric_color_id, source_id, Number(price), req.user.id]
                );
            } else if (item_type === 'material') {
                if (!material_item_id) return reply.code(400).send({ error: 'Thiếu material_item_id' });
                await db.run(`
                    INSERT INTO approved_import_prices (item_type, material_item_id, source_id, price, created_by, updated_at)
                    VALUES ('material', $1, $2, $3, $4, NOW())
                    ON CONFLICT (material_item_id, source_id) WHERE item_type = 'material'
                    DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()`,
                    [material_item_id, source_id, Number(price), req.user.id]
                );
            } else {
                return reply.code(400).send({ error: 'item_type không hợp lệ' });
            }
            return { success: true };
        } catch(e) {
            return reply.code(500).send({ error: 'Lỗi cập nhật giá gốc: ' + e.message });
        }
    });
};

