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

    // Plugins
    fastify.register(require('@fastify/cookie'));
    fastify.register(require('@fastify/formbody'));
    fastify.register(require('@fastify/multipart'), { limits: { fileSize: 5 * 1024 * 1024 } });
    fastify.register(require('@fastify/compress'), { global: true });

    // Static files
    fastify.register(require('@fastify/static'), {
        root: path.join(__dirname, 'public'),
        prefix: '/'
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

    // Serve standalone pages
    fastify.get('/quanlyaffiliate', async (request, reply) => {
        return reply.sendFile('quanlyaffiliate.html');
    });

    // SPA fallback — serve dashboard.html for all app routes
    fastify.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api/')) {
            reply.code(404).send({ error: 'Route không tồn tại' });
        } else if (request.url.startsWith('/uploads/') || request.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            reply.code(404).send('Not found');
        } else {
            // Serve dashboard.html for SPA routes (login page is at /index.html)
            reply.sendFile('dashboard.html');
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
