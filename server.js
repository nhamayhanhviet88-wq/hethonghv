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
    fastify.register(require('./routes/accessBlock'));

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

    // Sync telesale active members from task templates at startup
    const taskPointRoutes = require('./routes/taskpoints');
    if (taskPointRoutes._syncTelesaleFromTemplates) {
        taskPointRoutes._syncTelesaleFromTemplates().catch(e => console.error('[Startup] Telesale sync error:', e.message));
    }
}

start().catch(err => {
    console.error('❌ Server error:', err);
    process.exit(1);
});
