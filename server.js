require('dotenv').config();
const path = require('path');
const fs = require('fs');
const fastify = require('fastify')({ logger: false, bodyLimit: 52428800 }); // 50MB

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

    // Prevent browser caching of JS files
    fastify.addHook('onSend', (request, reply, payload, done) => {
        if (request.url.match(/\.js(\?|$)/)) {
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

    // Serve standalone pages
    fastify.get('/quanlyaffiliate', async (request, reply) => {
        return reply.sendFile('quanlyaffiliate.html');
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
