require('dotenv').config();
const path = require('path');
const fs = require('fs');
const fastify = require('fastify')({ logger: false, bodyLimit: 52428800 }); // 50MB

// Trigger reload: 2026-06-07a
// ========== DOITAC DOMAIN DETECTION ==========
// Detect if request comes from affiliate portal (dongphuchv.net)
const DOITAC_DOMAINS = ['dongphuchv.net', 'www.dongphuchv.net'];
function isDoitacDomain(request) {
    const host = (request.headers.host || request.headers[':authority'] || '').toLowerCase().split(':')[0];
    return DOITAC_DOMAINS.some(d => host === d || host.endsWith('.' + d));
}

// ========== CRASH PREVENTION — Keep server alive ==========
process.on('uncaughtException', (err) => {
    console.error('🔴 [UNCAUGHT EXCEPTION] Server sẽ KHÔNG dừng:', err.message);
    console.error(err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('🟡 [UNHANDLED REJECTION] Promise bị reject:', reason);
});
// ===========================================================

// Global error handler — log all errors
fastify.setErrorHandler((error, request, reply) => {
    console.error(`❌ [${request.method}] ${request.url}:`, error.message);
    if (error.stack) console.error(error.stack);
    reply.code(error.statusCode || 500).send({ error: error.message || 'Internal Server Error' });
});

async function start() {
    // Initialize PostgreSQL database
    const db = require('./db/pool');
    await db.init();

    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    try {
        await db.exec(schema);
        console.log('✅ Schema applied');
    } catch(e) {
        console.warn('⚠️ Schema warning:', e.message);
    }

    // Seed admin if not exists
    const admin = await db.get("SELECT id FROM users WHERE username = 'admin'");
    if (!admin) {
        const bcrypt = require('bcrypt');
        const hash = await bcrypt.hash('admin123', 10);
        await db.run(
            "INSERT INTO users (username, password_hash, full_name, role, status) VALUES (?,?,?,?,?)",
            ['admin', hash, 'Giám Đốc', 'giam_doc', 'active']
        );
        console.log('✅ Admin account created (admin / admin123)');
    }

    // One-time: deactivate test affiliate accounts
    await db.run("UPDATE users SET status = 'resigned' WHERE id IN (2, 7) AND role = 'hoa_hong' AND username IN ('nvtest', 'hoahong')");

    // One-time: backfill source_crm_type from source customer
    await db.exec(`UPDATE users SET source_crm_type = (
        SELECT c.crm_type FROM customers c WHERE c.id = users.source_customer_id
    ) WHERE source_customer_id IS NOT NULL AND (source_crm_type IS NULL OR source_crm_type = '')`);
    // One-time: backfill discount_amount from DHT → CRM order_codes
    try { await db.exec(`UPDATE order_codes SET discount_amount = d.discount_amount FROM dht_orders d WHERE d.order_code = order_codes.order_code AND d.discount_amount > 0 AND COALESCE(order_codes.discount_amount, 0) = 0`); } catch(e) { /* done */ }

    // Migration: add phone2 column to customers
    try { await db.exec('ALTER TABLE customers ADD COLUMN phone2 TEXT'); } catch(e) { /* exists */ }
    try { await db.exec('ALTER TABLE customers ADD COLUMN cong_viec TEXT'); } catch(e) { /* exists */ }
    // Migration: effective_date — ngày hiệu lực (cutoff time logic)
    try { await db.exec('ALTER TABLE customers ADD COLUMN effective_date DATE'); } catch(e) { /* exists */ }
    try { await db.exec("UPDATE customers SET effective_date = (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date WHERE effective_date IS NULL"); } catch(e) { /* already backfilled */ }

    // Migration: force_approval — kiểm soát CV nhân viên yếu kém
    try { await db.exec('ALTER TABLE users ADD COLUMN force_approval BOOLEAN DEFAULT false'); } catch(e) { /* exists */ }
    try { await db.exec('ALTER TABLE users ADD COLUMN force_approval_reviewer_id INTEGER REFERENCES users(id)'); } catch(e) { /* exists */ }
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS user_force_approvals (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            task_type TEXT NOT NULL,
            task_ref_id INTEGER NOT NULL,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, task_type, task_ref_id)
        )`);
    } catch(e) { /* exists */ }

    // Migration: Probation (Thử Việc) — vai trò thử việc có thời hạn
    try { await db.exec('ALTER TABLE users ADD COLUMN probation_end_date TIMESTAMP'); } catch(e) { /* exists */ }
    try { await db.exec('ALTER TABLE users ADD COLUMN probation_days INTEGER DEFAULT 30'); } catch(e) { /* exists */ }
    try { await db.exec('ALTER TABLE users ADD COLUMN probation_contract_file TEXT'); } catch(e) { /* exists */ }
    try { await db.exec('ALTER TABLE users ADD COLUMN probation_warned BOOLEAN DEFAULT false'); } catch(e) { /* exists */ }
    // Seed 'thu_viec' role
    try {
        const existsTV = await db.get("SELECT id FROM system_roles WHERE slug = 'thu_viec'");
        if (!existsTV) {
            await db.run("INSERT INTO system_roles (name, slug, level) VALUES ('Thử Việc', 'thu_viec', 15)");
        }
    } catch(e) { console.log('thu_viec seed:', e.message); }

    // Migration: KPI Targets — chỉ tiêu kinh doanh
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS kpi_targets (
            id SERIAL PRIMARY KEY,
            target_type TEXT NOT NULL CHECK (target_type IN ('user', 'team')),
            target_id INTEGER NOT NULL,
            metric TEXT NOT NULL CHECK (metric IN ('revenue', 'orders', 'conversion_rate', 'retention_rate')),
            period_type TEXT NOT NULL CHECK (period_type IN ('month', 'quarter', 'year')),
            period_value TEXT NOT NULL,
            target_value NUMERIC NOT NULL DEFAULT 0,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(target_type, target_id, metric, period_type, period_value)
        )`);
    } catch(e) { /* exists */ }

    // Migration: Access Block — chặn truy cập thay vì khóa TK
    try { await db.exec('ALTER TABLE users ADD COLUMN access_blocked BOOLEAN DEFAULT false'); } catch(e) { /* exists */ }
    try { await db.exec('ALTER TABLE users ADD COLUMN access_blocked_at TIMESTAMP'); } catch(e) { /* exists */ }
    try { await db.exec('ALTER TABLE users ADD COLUMN access_blocked_reason TEXT'); } catch(e) { /* exists */ }
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS access_unblock_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            unblocked_by INTEGER REFERENCES users(id),
            blocked_reason TEXT,
            penalty_total INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* exists */ }
    // Seed app_config for unblock managers
    try {
        const existsUBM = await db.get("SELECT key FROM app_config WHERE key = 'access_unblock_managers'");
        if (!existsUBM) {
            await db.run("INSERT INTO app_config (key, value) VALUES ('access_unblock_managers', '[]')");
        }
    } catch(e) { /* exists */ }

    // Migration: Meeting Commitments — Cam kết cuộc họp
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS meeting_sessions (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            meeting_date DATE NOT NULL,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* exists */ }
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS meeting_commitments (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES meeting_sessions(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id),
            stt INTEGER NOT NULL DEFAULT 1,
            content TEXT NOT NULL,
            target_revenue NUMERIC DEFAULT 0,
            is_completed BOOLEAN DEFAULT false,
            completion_pct INTEGER DEFAULT 0,
            review_note TEXT,
            reviewed_by INTEGER REFERENCES users(id),
            reviewed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* exists */ }
    // Migration: add department_id for team-level commitments
    try { await db.exec(`ALTER TABLE meeting_commitments ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id)`); } catch(e) { /* exists */ }
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS meeting_commitment_templates (
            id SERIAL PRIMARY KEY,
            page_key VARCHAR(100) NOT NULL,
            stt INTEGER NOT NULL DEFAULT 1,
            question_content TEXT NOT NULL,
            has_revenue_target BOOLEAN DEFAULT false,
            created_by INTEGER REFERENCES users(id),
            updated_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* exists */ }

    // Migration: Promotion Engine — token versioning + audit log
    try { await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0'); } catch(e) { /* exists */ }
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS promotion_log (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            old_role TEXT NOT NULL,
            new_role TEXT NOT NULL,
            direction TEXT NOT NULL CHECK (direction IN ('promote', 'demote')),
            department_id INTEGER REFERENCES departments(id),
            notes TEXT,
            promoted_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* exists */ }

    // Migration: add 'test_hidden' to users status check constraint (Production Mode)
    try {
        await db.exec(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check`);
        await db.exec(`ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active','resigned','locked','deleted','probation_locked','test_hidden'))`);
    } catch(e) { /* already done */ }

    // Migration: Payment Records — Sổ Ghi Nhận Tiền (Bộ Phận Văn Phòng)
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS payment_records (
            id              SERIAL PRIMARY KEY,
            payment_code    TEXT NOT NULL UNIQUE,
            payment_method  TEXT NOT NULL DEFAULT 'CK',
            daily_seq       INTEGER NOT NULL,
            customer_name   TEXT,
            customer_phone  TEXT,
            cskh_user_id    INTEGER REFERENCES users(id),
            amount          NUMERIC NOT NULL DEFAULT 0,
            payment_type    TEXT DEFAULT 'thanh_toan',
            order_tt_coc    TEXT,
            order_ao_mau    TEXT,
            transfer_note   TEXT,
            money_source    TEXT DEFAULT 'khach_hang',
            bank_name       TEXT,
            total_order_codes TEXT,
            total_cod       NUMERIC DEFAULT 0,
            shipping_fee    NUMERIC DEFAULT 0,
            handover_status TEXT DEFAULT 'chua_bangiao',
            handover_at     TIMESTAMP,
            handover_by     INTEGER REFERENCES users(id),
            source          TEXT DEFAULT 'manual',
            source_ref_id   INTEGER,
            payment_date    DATE NOT NULL,
            created_by      INTEGER REFERENCES users(id),
            created_at      TIMESTAMP DEFAULT NOW(),
            updated_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_pr_method_date ON payment_records(payment_method, payment_date)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_pr_date ON payment_records(payment_date)`);
    } catch(e) { /* exists */ }

    // Migration: source_ref_id from INTEGER to TEXT for email hash
    try {
        await db.exec(`ALTER TABLE payment_records ALTER COLUMN source_ref_id TYPE TEXT`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_pr_source_ref ON payment_records(source, source_ref_id)`);
    } catch(e) { /* already text or exists */ }

    // Migration: Email Import Config + Bank Parsers
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS email_import_config (
            id              SERIAL PRIMARY KEY,
            gmail_user      TEXT,
            gmail_pass      TEXT,
            check_interval  INTEGER DEFAULT 2,
            is_active       BOOLEAN DEFAULT false,
            last_check_at   TIMESTAMP,
            last_import_count INTEGER DEFAULT 0,
            last_error      TEXT,
            updated_by      INTEGER REFERENCES users(id),
            updated_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`INSERT INTO email_import_config (id, check_interval, is_active)
            SELECT 1, 2, false WHERE NOT EXISTS (SELECT 1 FROM email_import_config WHERE id = 1)`);

        await db.exec(`CREATE TABLE IF NOT EXISTS email_bank_parsers (
            id              SERIAL PRIMARY KEY,
            bank_name       TEXT NOT NULL,
            sender_filter   TEXT NOT NULL,
            is_active       BOOLEAN DEFAULT true,
            created_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`INSERT INTO email_bank_parsers (bank_name, sender_filter, is_active)
            SELECT 'Sacombank', 'sacombank', true
            WHERE NOT EXISTS (SELECT 1 FROM email_bank_parsers WHERE bank_name = 'Sacombank')`);
        await db.exec(`INSERT INTO email_bank_parsers (bank_name, sender_filter, is_active)
            SELECT 'ACB Công Ty', 'acb.com.vn', true
            WHERE NOT EXISTS (SELECT 1 FROM email_bank_parsers WHERE bank_name = 'ACB Công Ty')`);
    } catch(e) { /* exists */ }

    // Migration: Cashflow Records — Sổ Thu Chi
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS cashflow_records (
            id              SERIAL PRIMARY KEY,
            cashflow_code   TEXT NOT NULL UNIQUE,
            cashflow_type   TEXT NOT NULL CHECK (cashflow_type IN ('THU','CHI')),
            daily_seq       INTEGER NOT NULL,
            cashflow_date   DATE NOT NULL,
            description     TEXT,
            amount          NUMERIC NOT NULL DEFAULT 0,
            order_code      TEXT,
            image_url       TEXT,
            is_closed       BOOLEAN DEFAULT false,
            source_record_id INTEGER UNIQUE REFERENCES payment_records(id),
            created_by      INTEGER REFERENCES users(id),
            checked_by      INTEGER REFERENCES users(id),
            checked_at      TIMESTAMP,
            created_at      TIMESTAMP DEFAULT NOW(),
            updated_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_cf_date ON cashflow_records(cashflow_date)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_cf_type ON cashflow_records(cashflow_type)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_cf_closed ON cashflow_records(is_closed)`);
    } catch(e) { /* exists */ }
    // Migration: cashflow money_source
    try { await db.exec("ALTER TABLE cashflow_records ADD COLUMN money_source TEXT DEFAULT 'congty'"); } catch(e) { /* exists */ }

    // Migration: Đơn Hàng Tổng (DHT) — 3 bảng namespace dht_
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS dht_categories (
            id              SERIAL PRIMARY KEY,
            name            TEXT NOT NULL UNIQUE,
            display_order   INTEGER DEFAULT 0,
            is_active       BOOLEAN DEFAULT true,
            created_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS dht_orders (
            id              SERIAL PRIMARY KEY,
            order_code      TEXT NOT NULL UNIQUE,
            order_date      DATE NOT NULL,
            category_id     INTEGER REFERENCES dht_categories(id),
            customer_name   TEXT,
            customer_phone  TEXT,
            source          TEXT,
            province        TEXT,
            cskh_user_id    INTEGER REFERENCES users(id),
            total_quantity  INTEGER DEFAULT 0,
            total_amount    DOUBLE PRECISION DEFAULT 0,
            discount_amount DOUBLE PRECISION DEFAULT 0,
            shipping_status TEXT DEFAULT 'pending' CHECK (shipping_status IN ('pending','shipped')),
            shipping_priority TEXT DEFAULT 'CHUẨN' CHECK (shipping_priority IN ('GỬI','GẤP','CHUẨN')),
            shipping_date   DATE,
            customer_id     INTEGER,
            notes           TEXT,
            created_by      INTEGER REFERENCES users(id),
            last_updated_at TIMESTAMP DEFAULT NOW(),
            last_updated_by INTEGER REFERENCES users(id),
            created_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dht_orders_date ON dht_orders(order_date)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dht_orders_category ON dht_orders(category_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dht_orders_code ON dht_orders(order_code)`);
        await db.exec(`CREATE TABLE IF NOT EXISTS dht_order_items (
            id              SERIAL PRIMARY KEY,
            dht_order_id    INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            description     TEXT,
            quantity        INTEGER DEFAULT 0,
            unit_price      DOUBLE PRECISION DEFAULT 0,
            total           DOUBLE PRECISION DEFAULT 0,
            created_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dht_items_order ON dht_order_items(dht_order_id)`);
    } catch(e) { console.error('[DHT Migration]', e.message); }

    // Migration: daily_penalty_ledger — Sổ phạt hàng ngày (single source of truth)
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS daily_penalty_ledger (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            penalty_date DATE NOT NULL,
            source_type TEXT NOT NULL,
            source_ref_id TEXT NOT NULL,
            task_name TEXT NOT NULL,
            penalty_amount INTEGER NOT NULL DEFAULT 0,
            penalty_reason TEXT,
            acknowledged BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, penalty_date, source_type, source_ref_id)
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dpl_user_date ON daily_penalty_ledger(user_id, penalty_date)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dpl_date ON daily_penalty_ledger(penalty_date)`);
    } catch(e) { /* exists */ }

    // Migration: Kho Vải — Fabric Warehouse Management (5 tables, prefix kv_)
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS kv_warehouses (
            id              SERIAL PRIMARY KEY,
            name            TEXT NOT NULL,
            unit            TEXT NOT NULL DEFAULT 'kg',
            original_tree_threshold NUMERIC NOT NULL DEFAULT 10,
            display_order   INTEGER DEFAULT 0,
            is_active       BOOLEAN DEFAULT true,
            created_at      TIMESTAMP DEFAULT NOW(),
            updated_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS kv_materials (
            id              SERIAL PRIMARY KEY,
            warehouse_id    INTEGER NOT NULL REFERENCES kv_warehouses(id),
            name            TEXT NOT NULL,
            original_tree_threshold NUMERIC,
            display_order   INTEGER DEFAULT 0,
            is_active       BOOLEAN DEFAULT true,
            created_at      TIMESTAMP DEFAULT NOW(),
            updated_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_kv_mat_wid ON kv_materials(warehouse_id)`);
        await db.exec(`CREATE TABLE IF NOT EXISTS kv_fabric_colors (
            id                      SERIAL PRIMARY KEY,
            material_id             INTEGER NOT NULL REFERENCES kv_materials(id),
            color_name              TEXT NOT NULL,
            price                   NUMERIC DEFAULT 0,
            original_tree_threshold NUMERIC DEFAULT 10,
            notes                   TEXT,
            is_active               BOOLEAN DEFAULT true,
            created_at              TIMESTAMP DEFAULT NOW(),
            updated_at              TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_kv_fc_mid ON kv_fabric_colors(material_id)`);
        await db.exec(`CREATE TABLE IF NOT EXISTS kv_rolls (
            id                SERIAL PRIMARY KEY,
            fabric_color_id   INTEGER NOT NULL REFERENCES kv_fabric_colors(id),
            roll_code         VARCHAR(12) UNIQUE,
            weight            NUMERIC NOT NULL DEFAULT 0,
            original_weight   NUMERIC NOT NULL DEFAULT 0,
            source            TEXT DEFAULT 'nhap_moi',
            note              TEXT,
            bill_id           TEXT,
            receipt_image     TEXT,
            is_returned       BOOLEAN DEFAULT false,
            is_cutting        BOOLEAN DEFAULT false,
            created_by        INTEGER REFERENCES users(id),
            created_at        TIMESTAMP DEFAULT NOW(),
            updated_at        TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_kv_rolls_fcid ON kv_rolls(fabric_color_id)`);
        // Migrations for kv_warehouses & kv_materials
        try { await db.exec(`ALTER TABLE kv_warehouses ADD COLUMN IF NOT EXISTS original_tree_threshold NUMERIC NOT NULL DEFAULT 10`); } catch(e) {}
        try { await db.exec(`ALTER TABLE kv_materials ADD COLUMN IF NOT EXISTS original_tree_threshold NUMERIC`); } catch(e) {}
        // Migrations for kv_rolls
        try { await db.exec(`ALTER TABLE kv_rolls ADD COLUMN IF NOT EXISTS original_weight NUMERIC NOT NULL DEFAULT 0`); } catch(e) {}
        try { await db.exec(`ALTER TABLE kv_rolls ADD COLUMN IF NOT EXISTS is_cutting BOOLEAN DEFAULT false`); } catch(e) {}
        try { await db.exec(`ALTER TABLE kv_rolls ADD COLUMN IF NOT EXISTS roll_code VARCHAR(12) UNIQUE`); } catch(e) {}
        try { await db.exec(`ALTER TABLE kv_rolls ADD COLUMN IF NOT EXISTS bill_id TEXT`); } catch(e) {}
        try { await db.exec(`ALTER TABLE kv_rolls ADD COLUMN IF NOT EXISTS receipt_image TEXT`); } catch(e) {}
        try { await db.exec(`ALTER TABLE kv_rolls ADD COLUMN IF NOT EXISTS source_import_id INTEGER`); } catch(e) {}
        try { await db.exec(`ALTER TABLE kv_rolls ADD COLUMN IF NOT EXISTS called_for_orders JSONB DEFAULT '[]'`); } catch(e) {}
        await db.exec(`UPDATE kv_rolls SET original_weight = weight WHERE original_weight = 0 OR original_weight IS NULL`);
        // Backfill roll_code for existing rows
        const rollsNoCode = await db.all(`SELECT id FROM kv_rolls WHERE roll_code IS NULL`);
        for (const rl of rollsNoCode) {
            const code = 'KV' + require('crypto').randomBytes(5).toString('hex').toUpperCase().slice(0, 10);
            await db.run(`UPDATE kv_rolls SET roll_code = $1 WHERE id = $2`, [code, rl.id]);
        }
        // Cut orders
        await db.exec(`CREATE TABLE IF NOT EXISTS kv_cut_orders (
            id              SERIAL PRIMARY KEY,
            cut_code        VARCHAR(16) UNIQUE,
            cut_date        DATE NOT NULL DEFAULT CURRENT_DATE,
            product_name    TEXT,
            order_quantity  INTEGER DEFAULT 0,
            cut_quantity    INTEGER DEFAULT 0,
            notes           TEXT,
            created_by      INTEGER REFERENCES users(id),
            created_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS kv_cut_order_rolls (
            id              SERIAL PRIMARY KEY,
            cut_order_id    INTEGER NOT NULL REFERENCES kv_cut_orders(id) ON DELETE CASCADE,
            roll_id         INTEGER NOT NULL REFERENCES kv_rolls(id),
            roll_code       VARCHAR(12),
            kg_before       NUMERIC DEFAULT 0,
            kg_used         NUMERIC DEFAULT 0,
            kg_remaining    NUMERIC DEFAULT 0,
            created_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_kv_cor_roll ON kv_cut_order_rolls(roll_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_kv_cor_co ON kv_cut_order_rolls(cut_order_id)`);
        await db.exec(`CREATE TABLE IF NOT EXISTS kv_transactions (
            id                SERIAL PRIMARY KEY,
            fabric_color_id   INTEGER NOT NULL REFERENCES kv_fabric_colors(id),
            tx_type           TEXT NOT NULL DEFAULT 'NHAP',
            quantity          NUMERIC NOT NULL DEFAULT 0,
            description       TEXT,
            created_by        INTEGER REFERENCES users(id),
            created_at        TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_kv_tx_fcid ON kv_transactions(fabric_color_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_kv_tx_type ON kv_transactions(tx_type)`);
    } catch(e) { console.error('[KV Migration]', e.message); }

    // Migration: Nhắc Nhở Công Việc — Reminder Templates
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS reminder_templates (
            id              SERIAL PRIMARY KEY,
            content         TEXT NOT NULL,
            category        TEXT NOT NULL DEFAULT 'san_xuat',
            departments     TEXT DEFAULT '',
            is_active       BOOLEAN DEFAULT true,
            applied_date    DATE,
            created_by      TEXT,
            created_at      TIMESTAMP DEFAULT NOW(),
            updated_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS reminder_history (
            id              SERIAL PRIMARY KEY,
            reminder_id     INTEGER REFERENCES reminder_templates(id),
            action          TEXT,
            changed_by      TEXT,
            changed_at      TIMESTAMP DEFAULT NOW(),
            details         TEXT
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_rh_rid ON reminder_history(reminder_id)`);
    } catch(e) { console.error('[Reminder Migration]', e.message); }

    // Migration: Thông Số Áo Mẫu (TSAM) — Sample Shirt Specifications
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS tsam_samples (
            id                SERIAL PRIMARY KEY,
            category_id       INTEGER REFERENCES dht_categories(id),
            sample_code       TEXT NOT NULL UNIQUE,
            sample_type       TEXT NOT NULL DEFAULT 'DON'
                              CHECK (sample_type IN ('PHA_PHOI', '3D', 'DON')),
            mix_positions     JSONB DEFAULT '[]',
            mix_color_count   INTEGER DEFAULT 0,
            collection        TEXT,
            design_market     TEXT,
            total_sample      TEXT,
            sample_care       TEXT,
            sewing_tech       JSONB DEFAULT '[]',
            factory_price     NUMERIC DEFAULT 0,
            processing_price  NUMERIC DEFAULT 0,
            approval_status   TEXT DEFAULT 'PENDING'
                              CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
            approved_by       INTEGER REFERENCES users(id),
            approved_at       TIMESTAMP,
            is_active         BOOLEAN DEFAULT true,
            display_order     INTEGER DEFAULT 0,
            created_by        INTEGER REFERENCES users(id),
            created_at        TIMESTAMP DEFAULT NOW(),
            updated_at        TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_tsam_category ON tsam_samples(category_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_tsam_code ON tsam_samples(sample_code)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_tsam_status ON tsam_samples(approval_status)`);

        await db.exec(`CREATE TABLE IF NOT EXISTS tsam_history (
            id              SERIAL PRIMARY KEY,
            sample_id       INTEGER NOT NULL REFERENCES tsam_samples(id) ON DELETE CASCADE,
            action          TEXT NOT NULL,
            changed_fields  JSONB DEFAULT '{}',
            changed_by      INTEGER REFERENCES users(id),
            changed_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_tsam_hist_sid ON tsam_history(sample_id)`);

        await db.exec(`CREATE TABLE IF NOT EXISTS tsam_order_links (
            id              SERIAL PRIMARY KEY,
            sample_id       INTEGER NOT NULL REFERENCES tsam_samples(id) ON DELETE CASCADE,
            dht_order_id    INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            dht_order_code  TEXT,
            linked_at       TIMESTAMP DEFAULT NOW(),
            linked_by       INTEGER REFERENCES users(id),
            UNIQUE(sample_id, dht_order_id)
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_tsam_ol_sid ON tsam_order_links(sample_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_tsam_ol_oid ON tsam_order_links(dht_order_id)`);

        // v2: Add spec_image column for Ctrl+V pasteable specification image
        try { await db.exec(`ALTER TABLE tsam_samples ADD COLUMN spec_image TEXT`); } catch(e) { /* column already exists */ }

        // v3: Mix Positions master data for Pha Phối
        await db.exec(`CREATE TABLE IF NOT EXISTS tsam_mix_positions (
            id              SERIAL PRIMARY KEY,
            name            TEXT NOT NULL,
            is_active       BOOLEAN DEFAULT true,
            display_order   INTEGER DEFAULT 0,
            created_at      TIMESTAMPTZ DEFAULT NOW()
        )`);
    } catch(e) { console.error('[TSAM Migration]', e.message); }

    // v4: Add can_approve_tsam flag to users table
    try { await db.exec(`ALTER TABLE users ADD COLUMN can_approve_tsam BOOLEAN DEFAULT false`); } catch(e) { /* already exists */ }

    // v5: Add material_pairs JSON column to dht_order_items for multi-phối support
    try { await db.exec(`ALTER TABLE dht_order_items ADD COLUMN material_pairs JSONB DEFAULT '[]'`); } catch(e) { /* already exists */ }

    // v6: Add surcharges JSONB column to dht_orders for phụ phí support
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS surcharges JSONB DEFAULT '[]'`); } catch(e) { /* already exists */ }

    // v7: Add shipping tracking columns to dht_orders
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS tracking_code TEXT`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS shipping_bill_image TEXT`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS actual_carrier_id INTEGER`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS actual_ship_datetime TIMESTAMPTZ`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS delivery_progress TEXT`); } catch(e) {}
    // delivery_progress: 'early_X' | 'late_X' | 'ontime' | null
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS deposit_amount_cache NUMERIC DEFAULT 0`); } catch(e) {}

    // Migration: Bảng Giá May (BGM) — Sewing Price Catalog
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS bgm_items (
            id                SERIAL PRIMARY KEY,
            name              TEXT NOT NULL,
            group_name        TEXT NOT NULL,
            allowed_roles     JSONB DEFAULT '["giam_doc"]',
            add_type          TEXT NOT NULL DEFAULT 'once'
                              CHECK (add_type IN ('once', 'multi')),
            factory_price     NUMERIC DEFAULT 0,
            processing_price  NUMERIC DEFAULT 0,
            is_active         BOOLEAN DEFAULT true,
            display_order     INTEGER DEFAULT 0,
            created_by        INTEGER REFERENCES users(id),
            created_at        TIMESTAMP DEFAULT NOW(),
            updated_at        TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_bgm_group ON bgm_items(group_name)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_bgm_active ON bgm_items(is_active)`);

        await db.exec(`CREATE TABLE IF NOT EXISTS bgm_history (
            id              SERIAL PRIMARY KEY,
            item_id         INTEGER NOT NULL REFERENCES bgm_items(id) ON DELETE CASCADE,
            action          TEXT NOT NULL,
            changed_fields  JSONB DEFAULT '{}',
            changed_by      INTEGER REFERENCES users(id),
            changed_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_bgm_hist_iid ON bgm_history(item_id)`);
    } catch(e) { console.error('[BGM Migration]', e.message); }

    // v8: Shipping Module — Gửi Hàng (Kế Toán + Kinh Doanh)
    // Fix shipping_status CHECK to support 'rescheduled' (handle auto-named constraints)
    try {
        const chkRows = await db.all(`
            SELECT con.conname FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = 'dht_orders' AND con.contype = 'c'
              AND pg_get_constraintdef(con.oid) ILIKE '%shipping_status%'
        `);
        for (const r of chkRows) {
            await db.exec(`ALTER TABLE dht_orders DROP CONSTRAINT IF EXISTS "${r.conname}"`);
        }
        await db.exec(`ALTER TABLE dht_orders ADD CONSTRAINT dht_orders_shipping_status_check CHECK (shipping_status IN ('pending','shipped','rescheduled'))`);
    } catch(e) { console.error('[Shipping v8] CHECK:', e.message); }
    // New columns for shipping management
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS rescheduled_ship_date DATE`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS reschedule_reason TEXT`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS carrier_phone TEXT`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS shipping_bill_link TEXT`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS completion_images TEXT`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS shipped_by INTEGER`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ`); } catch(e) {}
    // Reschedule history table
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS dht_shipping_reschedules (
            id              SERIAL PRIMARY KEY,
            dht_order_id    INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            old_date        DATE NOT NULL,
            new_date        DATE NOT NULL,
            reason          TEXT,
            rescheduled_by  INTEGER REFERENCES users(id),
            created_at      TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dht_sr_order ON dht_shipping_reschedules(dht_order_id)`);
    } catch(e) { console.error('[Shipping v8] Reschedules:', e.message); }
    // Penalty config for shipping delays
    try { await db.exec(`INSERT INTO global_penalty_config (key, label, amount) VALUES ('gui_hang_tre', 'Gửi hàng trễ — KT chưa gửi đơn hôm nay', 100000) ON CONFLICT (key) DO NOTHING`); } catch(e) {}
    try { await db.exec(`INSERT INTO global_penalty_config (key, label, amount) VALUES ('phieu_qlx_qua_han', 'Phiếu QLX quá hạn — QLX không xử lý', 50000) ON CONFLICT (key) DO NOTHING`); } catch(e) {}

    // v9: Shipping Modal — Phí gửi hàng + NVC thực tế fields
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS shipping_fee_payer TEXT`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS shipping_fee_method TEXT`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS receiver_name TEXT`); } catch(e) {}
    try { await db.exec(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS shipping_cashflow_id INTEGER`); } catch(e) {}

    // v10: Audit Log — Chi tiết lịch sử thay đổi đơn hàng
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS dht_audit_logs (
            id              SERIAL PRIMARY KEY,
            dht_order_id    INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            action          TEXT NOT NULL,
            summary         TEXT NOT NULL,
            changes         JSONB DEFAULT '[]',
            performed_by    INTEGER REFERENCES users(id),
            created_at      TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dht_audit_order ON dht_audit_logs(dht_order_id)`);
    } catch(e) { console.error('[Migration v10] Audit logs:', e.message); }
    // v10b: Backfill audit logs for existing orders
    try {
        const hasLogs = await db.get('SELECT COUNT(*) AS cnt FROM dht_audit_logs');
        if (Number(hasLogs?.cnt || 0) === 0) {
            const allOrders = await db.all(`
                SELECT o.id, o.order_code, o.total_amount, o.total_quantity, o.deposit_amount_cache,
                       o.discount_amount, o.created_at, o.created_by, o.last_updated_at, o.last_updated_by,
                       o.shipped_at, o.shipped_by, o.actual_carrier_id, o.shipping_fee, o.shipping_fee_payer,
                       o.shipping_fee_method, o.tracking_code, o.carrier_phone, o.receiver_name,
                       c.name AS carrier_name
                FROM dht_orders o
                LEFT JOIN dht_carriers c ON c.id = o.actual_carrier_id
                ORDER BY o.id ASC
            `);
            let backfilled = 0;
            for (const o of allOrders) {
                // 1. Create log
                if (o.created_at) {
                    await db.run(`INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by, created_at) VALUES ($1,$2,$3,$4,$5,$6)`, [
                        o.id, 'create', 'Đã tạo đơn ' + (o.order_code || ''),
                        JSON.stringify([
                            { field: 'order_code', label: 'Mã đơn', old: null, new: o.order_code || '' },
                            { field: 'total_amount', label: 'Tổng tiền', old: null, new: String(Number(o.total_amount) || 0) },
                            { field: 'total_quantity', label: 'Tổng SL', old: null, new: String(Number(o.total_quantity) || 0) },
                            ...(Number(o.deposit_amount_cache) > 0 ? [{ field: 'deposit', label: 'Tiền cọc', old: null, new: String(Number(o.deposit_amount_cache)) }] : []),
                            ...(Number(o.discount_amount) > 0 ? [{ field: 'discount', label: 'Giảm giá', old: null, new: String(Number(o.discount_amount)) }] : [])
                        ]),
                        o.created_by, o.created_at
                    ]);
                    backfilled++;
                }
                // 2. Ship log
                if (o.shipped_at && o.actual_carrier_id) {
                    const pLabel = o.shipping_fee_payer === 'hv' ? 'HV trả' : o.shipping_fee_payer === 'khach' ? 'Khách trả' : '—';
                    const mLabel = o.shipping_fee_method === 'ck' ? 'CK' : o.shipping_fee_method === 'tm' ? 'TM' : '—';
                    const cName = o.carrier_name || 'NVC';
                    await db.run(`INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by, created_at) VALUES ($1,$2,$3,$4,$5,$6)`, [
                        o.id, 'ship',
                        `Đã gửi hàng qua ${cName} — Phí ${Number(o.shipping_fee || 0).toLocaleString('vi-VN')}đ ${pLabel} ${mLabel}`,
                        JSON.stringify([
                            { field: 'actual_carrier', label: 'Nhà vận chuyển', old: null, new: cName },
                            { field: 'shipping_fee', label: 'Phí gửi hàng', old: null, new: String(Number(o.shipping_fee) || 0) },
                            { field: 'fee_payer', label: 'Người trả', old: null, new: pLabel + ' — ' + mLabel },
                            ...(o.tracking_code ? [{ field: 'tracking_code', label: 'Mã vận đơn', old: null, new: o.tracking_code }] : []),
                            ...(o.carrier_phone ? [{ field: 'carrier_phone', label: 'SĐT Nhà Xe', old: null, new: o.carrier_phone }] : []),
                            ...(o.receiver_name ? [{ field: 'receiver_name', label: 'Người nhận', old: null, new: o.receiver_name }] : [])
                        ]),
                        o.shipped_by, o.shipped_at
                    ]);
                    backfilled++;
                }
                // 3. Update log (if different from create AND ship time)
                if (o.last_updated_at && o.last_updated_by && o.created_at) {
                    const cTime = new Date(o.created_at).getTime();
                    const uTime = new Date(o.last_updated_at).getTime();
                    const sTime = o.shipped_at ? new Date(o.shipped_at).getTime() : 0;
                    const diffCreate = Math.abs(uTime - cTime);
                    const diffShip = sTime ? Math.abs(uTime - sTime) : Infinity;
                    if (diffCreate > 60000 && diffShip > 60000) { // different from both create and ship
                        await db.run(`INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by, created_at) VALUES ($1,$2,$3,$4,$5,$6)`, [
                            o.id, 'update', 'Đã cập nhật đơn hàng',
                            JSON.stringify([]), o.last_updated_by, o.last_updated_at
                        ]);
                        backfilled++;
                    }
                }
            }
            console.log(`[Migration v10b] Backfilled ${backfilled} audit logs for ${allOrders.length} orders`);
        }
    } catch(e) { console.error('[Migration v10b] Backfill:', e.message); }

    // v11: Production Workflow — Quy Trình Sản Xuất per order
    try {
        // Ensure process steps table exists
        await db.exec(`CREATE TABLE IF NOT EXISTS dht_process_steps (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            short_name TEXT,
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true
        )`);
        // v11b: Add page_link column for department navigation
        try { await db.exec(`ALTER TABLE dht_process_steps ADD COLUMN IF NOT EXISTS page_link TEXT`); } catch(e) {}

        // v11b Migration: MUST run BEFORE seed to avoid unique constraint conflicts
        // Rename "Hoàn Thiện" → "Cắt Chỉ & Hoàn Thiện", reorder, soft-delete "Đóng Gói"
        try {
            // If seed already created "Cắt Chỉ & Hoàn Thiện" AND old "Hoàn Thiện" still exists → delete the seed duplicate
            const oldHT = await db.get(`SELECT id FROM dht_process_steps WHERE name = 'Hoàn Thiện'`);
            const newCCHT = await db.get(`SELECT id FROM dht_process_steps WHERE name = 'Cắt Chỉ & Hoàn Thiện'`);
            if (oldHT && newCCHT) {
                // Move any production records from new duplicate to old (keep original ID for data integrity)
                await db.run(`UPDATE dht_order_production SET step_id = $1 WHERE step_id = $2`, [oldHT.id, newCCHT.id]);
                await db.run(`UPDATE dht_product_process SET step_id = $1 WHERE step_id = $2`, [oldHT.id, newCCHT.id]);
                await db.run(`DELETE FROM dht_process_steps WHERE id = $1`, [newCCHT.id]);
            }
            await db.run(`UPDATE dht_process_steps SET name = 'Cắt Chỉ & Hoàn Thiện', short_name = 'CCHT', display_order = 7, page_link = '/bophanhoanthienhv' WHERE name = 'Hoàn Thiện'`);
            await db.run(`UPDATE dht_process_steps SET display_order = 6, page_link = '/kiemtrachatluong' WHERE name = 'Kiểm Tra Chất Lượng'`);
            await db.run(`UPDATE dht_process_steps SET is_active = false WHERE name = 'Đóng Gói'`);
        } catch(e) { console.error('[Migration v11b] Rename/reorder:', e.message); }

        // Seed 7 default steps (Đóng Gói removed) — runs AFTER rename to avoid conflicts
        const _steps = [
            { name: 'Chuẩn Bị QLX', short: 'CBQLX', order: 1, link: '/congviecqlx' },
            { name: 'Cắt', short: 'CẮT', order: 2, link: '/bophancathv' },
            { name: 'In', short: 'IN', order: 3, link: '/bophaninhv' },
            { name: 'Ép', short: 'ÉP', order: 4, link: '/bophanephv' },
            { name: 'May', short: 'MAY', order: 5, link: '/bophanmayhv' },
            { name: 'Kiểm Tra Chất Lượng', short: 'KTCL', order: 6, link: '/kiemtrachatluong' },
            { name: 'Cắt Chỉ & Hoàn Thiện', short: 'CCHT', order: 7, link: '/bophanhoanthienhv' }
        ];
        for (const s of _steps) {
            await db.run(`INSERT INTO dht_process_steps (name, short_name, display_order, page_link) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO UPDATE SET page_link = EXCLUDED.page_link, short_name = EXCLUDED.short_name, display_order = EXCLUDED.display_order`, [s.name, s.short, s.order, s.link]);
        }

        // Order production tracking — which step each order has completed
        await db.exec(`CREATE TABLE IF NOT EXISTS dht_order_production (
            id SERIAL PRIMARY KEY,
            dht_order_id INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            step_id INTEGER NOT NULL REFERENCES dht_process_steps(id),
            is_completed BOOLEAN DEFAULT false,
            completed_at TIMESTAMPTZ,
            completed_by INTEGER REFERENCES users(id),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(dht_order_id, step_id)
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dht_order_prod_order ON dht_order_production(dht_order_id)`);
    } catch(e) { console.error('[Migration v11] Production:', e.message); }

    // v12: Customer Error Orders — Đơn Lỗi Khách Hàng
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS customer_error_orders (
            id              SERIAL PRIMARY KEY,
            order_code      TEXT,
            report_date     DATE NOT NULL,
            cskh_name       TEXT,
            error_quantity  NUMERIC DEFAULT 0,
            error_content   TEXT,
            error_images    JSONB DEFAULT '[]',
            sale_resolution TEXT,
            violator_name   TEXT,
            production_cost NUMERIC DEFAULT 0,
            shipping_cost   NUMERIC DEFAULT 0,
            violation_month TEXT,
            penalty_month   TEXT,
            violator_commitment TEXT,
            fix_plan        TEXT,
            created_by      INTEGER REFERENCES users(id),
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_ceo_report_date ON customer_error_orders(report_date)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_ceo_order_code ON customer_error_orders(order_code)`);
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS common_error_type TEXT`);
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS dht_order_id INTEGER`);
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS customer_name TEXT`);
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS production_quantity NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS linh_vuc TEXT`);
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS error_video TEXT`);
        // v12b: Lỗi Thường Gặp & Xử Lý — department, resolution tracking
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS error_department TEXT`);
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS resolution_status TEXT DEFAULT 'pending'`);
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ`);
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS resolved_by INTEGER`);
        // v12c: QLX update tracking — auto-timestamp when QLX saves
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS qlx_updated_at TIMESTAMPTZ`);
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS qlx_updated_by INTEGER`);
        await db.exec(`ALTER TABLE customer_error_orders ADD COLUMN IF NOT EXISTS error_type TEXT DEFAULT 'Khách Hàng'`);
        // v12d: External violators (bên gia công / bên ngoài)
        await db.exec(`CREATE TABLE IF NOT EXISTS ceo_external_violators (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
    } catch(e) { console.error('[Migration v12] Customer Errors:', e.message); }

    // v13: Common Errors — Lỗi Thường Gặp & Xử Lý (template table)
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS error_categories (
            id              SERIAL PRIMARY KEY,
            name            TEXT NOT NULL UNIQUE,
            created_at      TIMESTAMPTZ DEFAULT NOW()
        )`);
        // Seed default categories
        const defaultCats = ['Size Áo','Hình In','Đường May','Đường Cắt','Đường Ép','Màu Vải','Thiếu SL','Giao Hàng','Thiết Kế','Khác'];
        for (const cat of defaultCats) {
            await db.run(`INSERT INTO error_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [cat]);
        }

        await db.exec(`CREATE TABLE IF NOT EXISTS common_errors (
            id                  SERIAL PRIMARY KEY,
            error_name          TEXT NOT NULL,
            error_category_id   INTEGER REFERENCES error_categories(id),
            department          TEXT,
            status              TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','resolved')),
            fix_guide           TEXT,
            sale_guide          TEXT,
            commit_factory      TEXT,
            commit_department   TEXT,
            commit_sale         TEXT,
            created_by          INTEGER REFERENCES users(id),
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_ce_category ON common_errors(error_category_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_ce_status ON common_errors(status)`);
        // v13b: Add images and video columns
        try { await db.exec(`ALTER TABLE common_errors ADD COLUMN IF NOT EXISTS error_images JSONB DEFAULT '[]'`); } catch(e) {}
        try { await db.exec(`ALTER TABLE common_errors ADD COLUMN IF NOT EXISTS error_video TEXT`); } catch(e) {}

        // v13c: Dynamic departments + multi-select
        await db.exec(`CREATE TABLE IF NOT EXISTS error_departments (
            id              SERIAL PRIMARY KEY,
            name            TEXT NOT NULL UNIQUE,
            created_at      TIMESTAMPTZ DEFAULT NOW()
        )`);
        const defaultDepts = ['Sale/KD','Cắt','In','Ép','May','Hoàn Thiện','Kho','Thiết Kế'];
        for (const d of defaultDepts) {
            await db.run(`INSERT INTO error_departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [d]);
        }
        // Migrate department TEXT → departments JSONB
        try { await db.exec(`ALTER TABLE common_errors ADD COLUMN IF NOT EXISTS departments JSONB DEFAULT '[]'`); } catch(e) {}
        // v13d: Chịu Trách Nhiệm — who is responsible + penalty %
        try { await db.exec(`ALTER TABLE common_errors ADD COLUMN IF NOT EXISTS responsibility JSONB DEFAULT '[]'`); } catch(e) {}
    } catch(e) { console.error('[Migration v13] Common Errors:', e.message); }

    // Migration: Fix handover_status — centralized logic (thanh_toan/tt_sll → chua_bangiao, rest → thu_quy_nhan)
    try {
        const fixTT = await db.run(`UPDATE payment_records SET handover_status = 'chua_bangiao' WHERE payment_type IN ('thanh_toan', 'tt_sll') AND handover_status = 'thu_quy_nhan'`);
        const fixOther = await db.run(`UPDATE payment_records SET handover_status = 'thu_quy_nhan' WHERE (payment_type IS NULL OR payment_type NOT IN ('thanh_toan', 'tt_sll')) AND handover_status = 'chua_bangiao'`);
        if ((fixTT?.changes || 0) + (fixOther?.changes || 0) > 0) console.log(`[Migration] Fixed handover_status: ${fixTT?.changes || 0} → chua_bangiao, ${fixOther?.changes || 0} → thu_quy_nhan`);
    } catch(e) { /* already done */ }

    // Plugins
    fastify.register(require('@fastify/cookie'));
    fastify.register(require('@fastify/formbody'));
    fastify.register(require('@fastify/multipart'), { limits: { fileSize: 50 * 1024 * 1024 } });
    fastify.register(require('@fastify/compress'), { global: true });

    // Static files
    fastify.register(require('@fastify/static'), {
        root: path.join(__dirname, 'public'),
        prefix: '/',
        maxAge: 0 // No caching for static files
    });
    // Serve cashflow uploads
    fastify.get('/uploads/cashflow/:filename', async (request, reply) => {
        const fs = require('fs');
        const filePath = path.join(__dirname, 'uploads', 'cashflow', request.params.filename);
        if (!fs.existsSync(filePath)) return reply.code(404).send('Not found');
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp' };
        reply.type(mimeMap[ext] || 'application/octet-stream');
        return fs.createReadStream(filePath);
    });

    // Serve payment uploads with automatic MIME sniffing (fixes webp files saved as png/jpg)
    fastify.get('/uploads/bill-nhap-hang/payments/:filename', async (request, reply) => {
        const fs = require('fs');
        const filePath = path.join(__dirname, 'uploads', 'bill-nhap-hang', 'payments', request.params.filename);
        if (!fs.existsSync(filePath)) return reply.code(404).send('Not found');
        
        // Read first 12 bytes to sniff format
        let mime = 'application/octet-stream';
        try {
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(12);
            fs.readSync(fd, buffer, 0, 12, 0);
            fs.closeSync(fd);
            
            if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
                mime = 'image/png';
            } else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
                mime = 'image/jpeg';
            } else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
                       buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
                mime = 'image/webp';
            } else {
                const ext = path.extname(filePath).toLowerCase();
                const mimeMap = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp' };
                mime = mimeMap[ext] || 'application/octet-stream';
            }
        } catch(e) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp' };
            mime = mimeMap[ext] || 'application/octet-stream';
        }
        
        reply.type(mime);
        return fs.createReadStream(filePath);
    });

    // ★ Smart caching: JS/CSS files use ?v= cache-busting (auto-inject uses Date.now()),
    // so browser can cache them safely. HTML must always be fresh.
    fastify.addHook('onSend', (request, reply, payload, done) => {
        const url = request.url;
        if (url.match(/\.(js|css)(\?|$)/)) {
            // JS/CSS: cache 5 phút — đủ nhanh, đủ ngắn để deploy mới lên ngay
            reply.header('Cache-Control', 'public, max-age=300, must-revalidate');
        } else if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)(\?|$)/)) {
            // Static assets: cache for 30 days
            reply.header('Cache-Control', 'public, max-age=2592000');
        } else if (!url.startsWith('/api/')) {
            // HTML pages: always fresh (ensures dashboard picks up new scripts)
            reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            reply.header('Pragma', 'no-cache');
            reply.header('Expires', '0');
        }
        done();
    });

    // Serve uploaded files (PROTECTED - require login)
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // Auth check for uploads - block unauthenticated access to sensitive files
    const jwt = require('jsonwebtoken');
    fastify.addHook('onRequest', (request, reply, done) => {
        if (request.url.startsWith('/uploads/')) {
            const token = request.cookies?.token;
            if (!token) {
                reply.code(401).send({ error: 'Chưa đăng nhập' });
                return;
            }
            try {
                jwt.verify(token, process.env.JWT_SECRET);
                done();
            } catch (err) {
                reply.code(401).send({ error: 'Token không hợp lệ' });
            }
        } else {
            done();
        }
    });

    fastify.register(require('@fastify/static'), {
        root: uploadsDir,
        prefix: '/uploads/',
        decorateReply: false
    });

    // ========== HEALTH CHECK — Pool stats + Server uptime ==========
    const _serverStartTime = Date.now();
    fastify.get('/api/health', async (request, reply) => {
        const stats = db.getPoolStats();
        const uptimeMs = Date.now() - _serverStartTime;
        const uptimeH = Math.floor(uptimeMs / 3600000);
        const uptimeM = Math.floor((uptimeMs % 3600000) / 60000);
        return {
            status: stats.waiting > 0 ? 'degraded' : 'ok',
            uptime: `${uptimeH}h ${uptimeM}m`,
            pool: stats,
        };
    });

    // Log pool stats every 5 minutes (catch slow leaks before they become outages)
    setInterval(() => {
        const s = db.getPoolStats();
        if (s.active > 0 || s.waiting > 0) {
            console.log(`📊 [Pool Stats] active=${s.active}, idle=${s.idle}, waiting=${s.waiting}, total=${s.total}/${s.max}`);
        }
    }, 5 * 60 * 1000);

    // API Routes
    fastify.register(require('./routes/auth'));
    fastify.register(require('./routes/users'));
    fastify.register(require('./routes/teams'));
    fastify.register(require('./routes/settings'));
    fastify.register(require('./routes/customers'));
    fastify.register(require('./routes/affiliate'));
    fastify.register(require('./routes/taskpoints'));
    fastify.register(require('./routes/taskschedule'));
    fastify.register(require('./routes/khoatknv'));
    fastify.register(require('./routes/xinnghi'));
    fastify.register(require('./routes/lockTasks'));
    fastify.register(require('./routes/chainTasks'));
    fastify.register(require('./routes/positionsRoles'));
    fastify.register(require('./routes/telesale'));
    fastify.register(require('./routes/consultRules'));
    fastify.register(require('./routes/partneroutreach'));
    fastify.register(require('./routes/dailylinks'));
    fastify.register(require('./routes/addcmt'));
    fastify.register(require('./routes/search'));
    fastify.register(require('./routes/notifications'));
    fastify.register(require('./routes/crmConversion'));
    fastify.register(require('./routes/affiliateAccount'));
    fastify.register(require('./routes/partnerRegistration'));
    fastify.register(require('./routes/accessBlock'));
    fastify.register(require('./routes/customerRetention'));
    fastify.register(require('./routes/kpiTargets'));
    fastify.register(require('./routes/kpiKdoanh'));
    fastify.register(require('./routes/meetingCommitments'));
    fastify.register(require('./routes/telegram'));
    fastify.register(require('./routes/paymentRecords'));
    fastify.register(require('./routes/cashflow'));
    fastify.register(require('./routes/dailyReport'));
    fastify.register(require('./routes/donhangtong'));
    fastify.register(require('./routes/khovai'));
    fastify.register(require('./routes/nhacnho'));
    fastify.register(require('./routes/thongsoaomau'));
    fastify.register(require('./routes/banggiamay'));
    fastify.register(require('./routes/shipping'));
    fastify.register(require('./routes/donhangthietke'));
    fastify.register(require('./routes/customerErrors'));
    fastify.register(require('./routes/commonErrors'));
    fastify.register(require('./routes/donguiaomau'));
    fastify.register(require('./routes/tulieuxuong'));
    fastify.register(require('./routes/chuanbiqlx'));
    fastify.register(require('./routes/bophancat'));
    fastify.register(require('./routes/bophanin'));
    fastify.register(require('./routes/bophanmay'));
    fastify.register(require('./routes/bophanhoanthien'));
    fastify.register(require('./routes/bophanep'));
    fastify.register(require('./routes/luongsanxuat'));
    fastify.register(require('./routes/luongthocat'));
    fastify.register(require('./routes/billnhaphang'));
    fastify.register(require('./routes/kiemkho'));
    fastify.register(require('./routes/nhapxuathoanvai'));
    fastify.register(require('./routes/vatlieutempet'));
    fastify.register(require('./routes/khovatlieu'));
    fastify.register(require('./routes/worktickets'));
    fastify.register(require('./routes/totalSales'));

    // ========== DOITAC DOMAIN — Serve affiliate portal ==========
    // Root page: serve affiliate login instead of internal login
    fastify.get('/', async (request, reply) => {
        if (isDoitacDomain(request)) {
            return reply.type('text/html').sendFile('doitac-login.html');
        }
        // Internal domain: serve normal login page
        return reply.type('text/html').sendFile('index.html');
    });

    fastify.get('/index.html', async (request, reply) => {
        if (isDoitacDomain(request)) {
            return reply.type('text/html').sendFile('doitac-login.html');
        }
        return reply.type('text/html').sendFile('index.html');
    });

    // Serve standalone pages
    fastify.get('/quanlyaffiliate', async (request, reply) => {
        return reply.sendFile('quanlyaffiliate.html');
    });

    // Mobile Chuyển Số — standalone touch-optimized page
    fastify.get('/m/chuyen-so', async (request, reply) => {
        return reply.sendFile('mobile-chuyenso.html');
    });

    // Mobile Tìm Kiếm KH — standalone touch-optimized page
    fastify.get('/m/tim-kiem', async (request, reply) => {
        return reply.sendFile('mobile-timkiem.html');
    });

    // Mobile Tài Khoản — standalone touch-optimized page
    fastify.get('/m/accounts', async (request, reply) => {
        return reply.sendFile('mobile-accounts.html');
    });

    // Mobile Bộ Phận Cắt — standalone touch-optimized page
    fastify.get('/m/bophancat', async (request, reply) => {
        return reply.sendFile('mobile-bophancat.html');
    });
    fastify.get('/m/bophancathv', async (request, reply) => {
        return reply.sendFile('mobile-bophancat.html');
    });

    // Mobile Bộ Phận In — standalone touch-optimized page
    fastify.get('/m/bophanin', async (request, reply) => {
        return reply.sendFile('mobile-bophanin.html');
    });
    fastify.get('/m/bophaninhv', async (request, reply) => {
        return reply.sendFile('mobile-bophanin.html');
    });

    // Mobile Bộ Phận May — standalone touch-optimized page
    fastify.get('/m/bophanmay', async (request, reply) => {
        return reply.sendFile('mobile-bophanmay.html');
    });
    fastify.get('/m/bophanmayhv', async (request, reply) => {
        return reply.sendFile('mobile-bophanmay.html');
    });

    // Mobile Cắt Chỉ & Hoàn Thiện — standalone touch-optimized page
    fastify.get('/m/bophanhoanthien', async (request, reply) => {
        return reply.sendFile('mobile-bophanhoanthien.html');
    });
    fastify.get('/m/bophanhoanthienhv', async (request, reply) => {
        return reply.sendFile('mobile-bophanhoanthien.html');
    });

    // Mobile Bộ Phận Ép — standalone touch-optimized page
    fastify.get('/m/bophanep', async (request, reply) => {
        return reply.sendFile('mobile-bophanep.html');
    });
    fastify.get('/m/bophanephv', async (request, reply) => {
        return reply.sendFile('mobile-bophanep.html');
    });

    // Mobile Bill Nhập Hàng — standalone touch-optimized page
    fastify.get('/m/billnhaphang', async (request, reply) => {
        return reply.sendFile('mobile-billnhaphang.html');
    });

    // Mobile Kiểm Kho Vải — standalone touch-optimized page
    fastify.get('/m/kiemkho', async (request, reply) => {
        return reply.sendFile('mobile-kiemkho.html');
    });
    fastify.get('/m/kiemkhohv', async (request, reply) => {
        return reply.sendFile('mobile-kiemkho.html');
    });

    // Mobile Nhập Xuất Hoàn Vải — standalone touch-optimized page
    fastify.get('/m/nhapxuathoanvai', async (request, reply) => {
        return reply.sendFile('mobile-nhapxuathoanvai.html');
    });

    // Mobile Vật Liệu PET/TEM — standalone touch-optimized page
    fastify.get('/m/vatlieutempet', async (request, reply) => {
        return reply.sendFile('mobile-vatlieutempet.html');
    });

    // Đối Tác — public standalone page (no auth required)
    fastify.get('/doitac', async (request, reply) => {
        return reply.type('text/html').sendFile('doitac.html');
    });

    // ========== AUTO-INJECT PAGE SCRIPTS ==========
    // Build dashboard HTML with all page scripts auto-injected
    let _cachedDashboardHtml = null;
    function buildDashboardHtml() {
        const dashboardPath = path.join(__dirname, 'public', 'dashboard.html');
        let html = fs.readFileSync(dashboardPath, 'utf8');

        // Scan public/js/pages/ for all JS files
        const pagesDir = path.join(__dirname, 'public', 'js', 'pages');
        let pageFiles = [];
        try {
            pageFiles = fs.readdirSync(pagesDir)
                .filter(f => f.endsWith('.js') && !f.startsWith('_') && !f.startsWith('test'))
                .sort();
        } catch (e) { console.error('⚠️ Cannot scan pages dir:', e.message); }

        // Find which files are already included in dashboard.html
        const alreadyIncluded = new Set();
        const scriptRegex = /src="\/js\/pages\/([^"?]+)/g;
        let match;
        while ((match = scriptRegex.exec(html)) !== null) {
            alreadyIncluded.add(match[1]);
        }

        // Build script tags for MISSING files only (inject before </body>)
        const buildVer = Date.now(); // Cache-bust: mỗi lần server restart = version mới
        const missingScripts = pageFiles
            .filter(f => !alreadyIncluded.has(f))
            .map(f => `    <script defer src="/js/pages/${f}?v=${buildVer}"></script>`)
            .join('\n');

        if (missingScripts) {
            console.log(`📦 Auto-injecting ${missingScripts.split('\n').length} page scripts:`,
                pageFiles.filter(f => !alreadyIncluded.has(f)).join(', '));
            html = html.replace('</body>', missingScripts + '\n</body>');
        }

        _cachedDashboardHtml = html;
        return html;
    }
    // Build once at startup
    buildDashboardHtml();
    // Rebuild when files change in pages dir (DEV MODE ONLY)
    // ★ Disabled in production — fs.watch was triggering continuous rebuilds
    // from editor auto-save and file sync tools (e.g. taophieuxulycv.js).
    // On deploy: restart PM2 → buildDashboardHtml() runs at startup.
    if (process.env.NODE_ENV !== 'production') {
        try {
            const pagesDir = path.join(__dirname, 'public', 'js', 'pages');
            let _fsWatchDebounce = null;
            fs.watch(pagesDir, (eventType, filename) => {
                if (filename && filename.endsWith('.js')) {
                    clearTimeout(_fsWatchDebounce);
                    _fsWatchDebounce = setTimeout(() => {
                        console.log(`🔄 Pages dir changed (${filename}), rebuilding dashboard HTML...`);
                        buildDashboardHtml();
                    }, 500);
                }
            });
        } catch(e) { /* fs.watch not supported, cache stays static */ }
    } else {
        console.log('[Dashboard] ✅ Production mode — fs.watch disabled, HTML cached at startup');
    }

    // SPA fallback — serve dashboard.html for all app routes
    fastify.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api/')) {
            reply.code(404).send({ error: 'Route không tồn tại' });
        } else if (request.url.startsWith('/uploads/') || request.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            reply.code(404).send('Not found');
        } else if (isDoitacDomain(request)) {
            // Affiliate portal: serve lightweight doitac dashboard
            return reply.type('text/html').sendFile('doitac-dashboard.html');
        } else {
            // Serve auto-injected dashboard HTML
            reply.type('text/html').send(_cachedDashboardHtml || buildDashboardHtml());
        }
    });

    // Start
    const PORT = process.env.PORT || 11000;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Đồng Phục HV CRM đang chạy tại http://localhost:${PORT}`);

    // Start deadline checker cron (mỗi 15 phút)
    const { startDeadlineChecker } = require('./routes/deadline-checker');
    startDeadlineChecker();

    // Start reminder checker cron — nhắc NV xử lý số (mỗi 1 phút)
    const { startReminderChecker } = require('./routes/reminder-checker');
    startReminderChecker();

    // Sync telesale active members from task templates at startup
    const taskPointRoutes = require('./routes/taskpoints');
    if (taskPointRoutes._syncTelesaleFromTemplates) {
        taskPointRoutes._syncTelesaleFromTemplates().catch(e => console.error('[Startup] Telesale sync error:', e.message));
    }

    // Start email checker cron — auto-import bank emails
    const { startCron: startEmailCron } = require('./services/emailChecker');
    startEmailCron().catch(e => console.error('[Startup] Email checker error:', e.message));

    // Start notification retry cron — retry failed Telegram/AppSheet (every 5 min)
    const { retryFailedSync } = require('./services/appsheetSync');
    setInterval(() => retryFailedSync().catch(e => console.error('[Retry Cron]', e.message)), 5 * 60 * 1000);
    console.log('[Retry] ✅ Notification retry cron started (every 5 min)');

    // Start unified daily report cron — Tổng Kết Hàng Ngày
    const { vnNow } = require('./utils/timezone');
    const { sendTelegramMessage } = require('./utils/telegram');
    const { _buildReport: _drBuildReport } = require('./routes/dailyReport');
    let _drSentDate = ''; // Track WHICH date was already sent (reset across days)
    async function _drCheckAndSend() {
        try {
            const now = vnNow();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const currentTime = hh + ':' + mm;
            const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

            // Read centralized config
            const cfgRow = await db.get("SELECT value FROM app_config WHERE key = 'daily_report_config'");
            if (!cfgRow?.value) return;
            let cfg;
            try { cfg = JSON.parse(cfgRow.value); } catch { return; }

            const reportTime = (cfg.time || '21:00').trim();
            const groupId = (cfg.group_id || '').trim();
            if (!groupId) return;
            const modules = cfg.modules || [];
            if (!modules.length) return;

            // Check DB for last sent date
            const lastSent = await db.get("SELECT value FROM app_config WHERE key = 'daily_report_last_sent'");
            const lastSentDate = lastSent?.value || '';

            // ★ CATCH-UP: Check if YESTERDAY's report was missed
            // This handles the case where reportTime is late (e.g. 22:00) and server
            // restarts after midnight — "00:25" > "22:00" is FALSE in string comparison,
            // so we need to explicitly check if yesterday was never sent
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth()+1).padStart(2,'0') + '-' + String(yesterday.getDate()).padStart(2,'0');

            if (lastSentDate < yesterdayStr && _drSentDate !== yesterdayStr) {
                // Yesterday's report was never sent — send it now as catch-up
                console.log(`[DailyReport] 📤 Catch-up for MISSED date ${yesterdayStr} (lastSent: ${lastSentDate}, now: ${currentTime})`);
                const report = await _drBuildReport(yesterdayStr, modules);
                const ok = await sendTelegramMessage(groupId, report.message);
                if (ok) {
                    _drSentDate = yesterdayStr;
                    await db.run(
                        `INSERT INTO app_config (key, value, updated_at) VALUES ('daily_report_last_sent', $1, NOW())
                         ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
                        [yesterdayStr]
                    );
                    console.log('[DailyReport] ✅ Catch-up sent for missed date:', yesterdayStr);
                } else {
                    console.error('[DailyReport] ❌ Catch-up Telegram send failed for', yesterdayStr);
                }
                return; // Process one catch-up per cycle
            }

            // ★ TODAY's report: check if already sent
            if (lastSentDate === todayStr || _drSentDate === todayStr) return;

            // Match: exact minute OR catch-up (current time > configured time = missed, send now)
            const isExactMatch = currentTime === reportTime;
            const isCatchUp = currentTime > reportTime;
            if (!isExactMatch && !isCatchUp) return;

            // Build combined report
            console.log(`[DailyReport] 📤 ${isCatchUp ? 'Catch-up' : 'Scheduled'} send at ${currentTime} (configured: ${reportTime})`);
            const report = await _drBuildReport(todayStr, modules);
            const ok = await sendTelegramMessage(groupId, report.message);
            if (ok) {
                _drSentDate = todayStr;
                await db.run(
                    `INSERT INTO app_config (key, value, updated_at) VALUES ('daily_report_last_sent', $1, NOW())
                     ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
                    [todayStr]
                );
                console.log('[DailyReport] ✅ Sent combined report for', todayStr);
            } else {
                console.error('[DailyReport] ❌ Telegram send failed for', todayStr);
            }
        } catch (e) {
            console.error('[DailyReport] Error:', e.message);
        }
    }
    setInterval(_drCheckAndSend, 60 * 1000);
    // Catch-up on startup (in case server restarted after scheduled time)
    setTimeout(_drCheckAndSend, 5000);
    console.log('[DailyReport] ✅ Cron tổng kết hàng ngày đã khởi động (mỗi 1 phút)');
}

start().catch(err => {
    console.error('❌ Server error:', err);
    process.exit(1);
});
// Reload comment 3
