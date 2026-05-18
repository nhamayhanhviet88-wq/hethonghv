require('dotenv').config();
const path = require('path');
const fs = require('fs');
const fastify = require('fastify')({ logger: false, bodyLimit: 52428800 }); // 50MB

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
            display_order   INTEGER DEFAULT 0,
            is_active       BOOLEAN DEFAULT true,
            created_at      TIMESTAMP DEFAULT NOW(),
            updated_at      TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS kv_materials (
            id              SERIAL PRIMARY KEY,
            warehouse_id    INTEGER NOT NULL REFERENCES kv_warehouses(id),
            name            TEXT NOT NULL,
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
            weight            NUMERIC NOT NULL DEFAULT 0,
            source            TEXT DEFAULT 'nhap_moi',
            note              TEXT,
            is_returned       BOOLEAN DEFAULT false,
            created_by        INTEGER REFERENCES users(id),
            created_at        TIMESTAMP DEFAULT NOW(),
            updated_at        TIMESTAMP DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_kv_rolls_fcid ON kv_rolls(fabric_color_id)`);
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

    // Plugins
    fastify.register(require('@fastify/cookie'));
    fastify.register(require('@fastify/formbody'));
    fastify.register(require('@fastify/multipart'), { limits: { fileSize: 5 * 1024 * 1024 } });
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

    // Prevent browser/CDN caching of JS, CSS, HTML files
    fastify.addHook('onSend', (request, reply, payload, done) => {
        if (request.url.match(/\.(js|css|html)(\?|$)/) || request.url === '/' || !request.url.startsWith('/api/')) {
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
            .map(f => `    <script src="/js/pages/${f}?v=${buildVer}"></script>`)
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
    // Rebuild when files change in pages dir (dev mode)
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
