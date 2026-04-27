// ========== AFFILIATE ACCOUNT REQUESTS ==========
const bcrypt = require('bcrypt');
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendTelegramMessage } = require('../utils/telegram');

async function affiliateAccountRoutes(fastify, options) {

    // ========== MIGRATION ==========
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS affiliate_account_requests (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            requested_by INTEGER NOT NULL,
            proposed_username TEXT NOT NULL,
            proposed_password_hash TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            approved_by INTEGER,
            reject_reason TEXT,
            created_user_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            processed_at TIMESTAMP
        )`);
    } catch(e) { /* already exists */ }
    try { await db.exec('CREATE INDEX IF NOT EXISTS idx_aar_status ON affiliate_account_requests(status)'); } catch(e) {}
    try { await db.exec('CREATE INDEX IF NOT EXISTS idx_aar_customer ON affiliate_account_requests(customer_id)'); } catch(e) {}
    try { await db.exec('ALTER TABLE affiliate_account_requests ADD COLUMN proposed_data JSONB'); } catch(e) {}

    // ========== Helper: send Telegram ==========
    async function _sendTg(message) {
        try {
            const config = await db.get("SELECT value FROM app_config WHERE key = 'crm_conversion_telegram_group'");
            if (config && config.value && config.value.trim()) {
                sendTelegramMessage(config.value.trim(), message);
            }
            const globalId = process.env.TELEGRAM_GROUP_ID;
            if (globalId && globalId !== config?.value?.trim()) {
                sendTelegramMessage(globalId, message);
            }
        } catch(e) {}
    }

    // ========== Helper: can approve ==========
    async function canApprove(userRole) {
        if (userRole === 'giam_doc') return true;
        try {
            const config = await db.get("SELECT value FROM app_config WHERE key = 'crm_conversion_approver_roles'");
            if (config && config.value) {
                const roles = JSON.parse(config.value);
                return roles.includes(userRole);
            }
        } catch(e) {}
        return false;
    }

    // ========== CREATE REQUEST ==========
    fastify.post('/api/affiliate-account/request', { preHandler: [authenticate] }, async (request, reply) => {
        const { customer_id, proposed_username, proposed_password, reason, proposed_data } = request.body || {};
        if (!customer_id) return reply.code(400).send({ error: 'Thiếu customer_id' });
        if (!proposed_username || !proposed_username.trim()) return reply.code(400).send({ error: 'Vui lòng nhập tên đăng nhập' });
        if (!proposed_password || proposed_password.length < 4) return reply.code(400).send({ error: 'Mật khẩu phải ít nhất 4 ký tự' });
        if (!reason || !reason.trim()) return reply.code(400).send({ error: 'Vui lòng nhập lý do' });

        const username = proposed_username.trim().toLowerCase().replace(/\s+/g, '');

        // Block: username already exists
        const existingUser = await db.get('SELECT id FROM users WHERE LOWER(username) = ?', [username]);
        if (existingUser) return reply.code(400).send({ error: `Tên đăng nhập "${username}" đã tồn tại` });

        // Fetch customer
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [Number(customer_id)]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        // Block: customer already has a tkaffiliate account
        const existingAff = await db.get("SELECT id, full_name FROM users WHERE source_customer_id = ? AND role = 'tkaffiliate'", [Number(customer_id)]);
        if (existingAff) return reply.code(400).send({ error: `KH đã có TK Affiliate: ${existingAff.full_name}` });

        // Block: customer cancelled
        if (customer.cancel_approved === 1) return reply.code(400).send({ error: 'Không thể xin TK cho khách đã bị hủy' });

        // Block: customer pending CTV/Affiliate conversion
        const pendingConv = await db.get("SELECT id FROM crm_conversion_requests WHERE customer_id = ? AND status = 'pending'", [Number(customer_id)]);
        if (pendingConv) return reply.code(400).send({ error: 'KH đang chờ duyệt chuyển CTV/Affiliate' });

        // Block: only NV assigned or Manager can request
        const user = request.user;
        const isManager = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(user.role);
        if (!isManager && customer.assigned_to_id !== user.id) {
            return reply.code(403).send({ error: 'Bạn chỉ có thể xin TK cho khách mà bạn phụ trách' });
        }

        // Block: existing pending request
        const existing = await db.get("SELECT id FROM affiliate_account_requests WHERE customer_id = ? AND status = 'pending'", [Number(customer_id)]);
        if (existing) return reply.code(400).send({ error: 'KH này đã có yêu cầu đang chờ duyệt' });

        // Block: recently rejected (24h cooldown)
        const recentReject = await db.get(
            `SELECT id FROM affiliate_account_requests WHERE customer_id = ? AND status = 'rejected'
             AND processed_at > NOW() - INTERVAL '24 hours'`, [Number(customer_id)]
        );
        if (recentReject) return reply.code(400).send({ error: 'Yêu cầu bị từ chối gần đây. Vui lòng đợi 24 giờ.' });

        // Hash password before storing
        const passwordHash = await bcrypt.hash(proposed_password, 10);

        // Store full proposed_data as JSON for complete account creation on approve
        const pdJson = proposed_data ? JSON.stringify(proposed_data) : null;

        await db.run(
            `INSERT INTO affiliate_account_requests (customer_id, requested_by, proposed_username, proposed_password_hash, reason, proposed_data)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [Number(customer_id), user.id, username, passwordHash, reason.trim(), pdJson]
        );

        // Telegram
        const requester = await db.get('SELECT full_name FROM users WHERE id = ?', [user.id]);
        const tgMsg = `🔑 <b>XIN TẠO TK AFFILIATE</b>\n` +
            `Khách: <b>${customer.customer_name}</b> — ${customer.phone || 'N/A'}\n` +
            `Username: <b>${username}</b>\n` +
            `NV yêu cầu: ${requester?.full_name || user.username}\n` +
            `Lý do: ${reason.trim()}\n` +
            `📋 Vào Chấp Nhận CTV/Affiliate → tab "Tạo TK" để duyệt`;
        _sendTg(tgMsg);

        return { success: true, message: 'Đã gửi yêu cầu tạo TK Affiliate! Chờ duyệt.' };
    });

    // ========== LIST REQUESTS ==========
    fastify.get('/api/affiliate-account/list', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const allowed = await canApprove(user.role);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const { status } = request.query;
        let query = `SELECT r.*,
            c.customer_name, c.phone, c.facebook_link, c.crm_type,
            req.full_name as requested_by_name, req.role as requested_by_role,
            apr.full_name as approved_by_name,
            cu.full_name as created_user_name, cu.username as created_username
            FROM affiliate_account_requests r
            LEFT JOIN customers c ON r.customer_id = c.id
            LEFT JOIN users req ON r.requested_by = req.id
            LEFT JOIN users apr ON r.approved_by = apr.id
            LEFT JOIN users cu ON r.created_user_id = cu.id`;

        const params = [];
        if (status && status !== 'all') {
            query += ' WHERE r.status = ?';
            params.push(status);
        }
        query += " ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at DESC";

        const requests = await db.all(query, params);
        const pendingCount = await db.get("SELECT COUNT(*) as cnt FROM affiliate_account_requests WHERE status = 'pending'");

        return { requests, pendingCount: pendingCount?.cnt || 0 };
    });

    // ========== PENDING COUNT ==========
    fastify.get('/api/affiliate-account/pending-count', { preHandler: [authenticate] }, async (request, reply) => {
        const count = await db.get("SELECT COUNT(*) as cnt FROM affiliate_account_requests WHERE status = 'pending'");
        return { count: count?.cnt || 0 };
    });

    // ========== APPROVE → AUTO-CREATE ACCOUNT ==========
    fastify.post('/api/affiliate-account/:id/approve', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const allowed = await canApprove(user.role);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền duyệt' });

        const reqId = Number(request.params.id);
        const accReq = await db.get('SELECT * FROM affiliate_account_requests WHERE id = ?', [reqId]);
        if (!accReq) return reply.code(404).send({ error: 'Không tìm thấy yêu cầu' });
        if (accReq.status !== 'pending') return reply.code(400).send({ error: 'Yêu cầu đã được xử lý' });

        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [accReq.customer_id]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        // Re-check username availability (might have been taken since request)
        const usernameCheck = await db.get('SELECT id FROM users WHERE LOWER(username) = ?', [accReq.proposed_username.toLowerCase()]);
        if (usernameCheck) {
            return reply.code(400).send({ error: `Username "${accReq.proposed_username}" đã bị trùng. Từ chối yêu cầu này.` });
        }

        // Re-check customer doesn't already have affiliate account
        const existingAff = await db.get("SELECT id FROM users WHERE source_customer_id = ? AND role = 'tkaffiliate'", [accReq.customer_id]);
        if (existingAff) {
            return reply.code(400).send({ error: 'KH đã có TK Affiliate rồi' });
        }

        // === CREATE THE ACCOUNT (with full proposed_data if available) ===
        const pd = accReq.proposed_data ? (typeof accReq.proposed_data === 'string' ? JSON.parse(accReq.proposed_data) : accReq.proposed_data) : {};
        const result = await db.run(
            `INSERT INTO users (username, password_hash, full_name, phone, address, role,
             managed_by_user_id, source_customer_id, province, birth_date,
             department_id, commission_tier_id, assigned_to_user_id,
             bank_name, bank_account, bank_holder, source_crm_type)
             VALUES (?, ?, ?, ?, ?, 'tkaffiliate', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [accReq.proposed_username, accReq.proposed_password_hash, customer.customer_name,
             pd.phone || customer.phone || null,
             pd.address || customer.address || null,
             pd.managed_by_user_id || accReq.requested_by,
             accReq.customer_id,
             pd.province || customer.province || null,
             pd.birth_date || null,
             pd.department_id ? Number(pd.department_id) : null,
             pd.commission_tier_id ? Number(pd.commission_tier_id) : null,
             pd.assigned_to_user_id ? Number(pd.assigned_to_user_id) : null,
             pd.bank_name || null,
             pd.bank_account || null,
             pd.bank_holder || null,
             pd.source_crm_type || customer.crm_type || null]
        );

        const newUserId = result?.lastInsertRowid || result?.insertId;

        // Update request status
        await db.run(
            "UPDATE affiliate_account_requests SET status = 'approved', approved_by = ?, created_user_id = ?, processed_at = NOW() WHERE id = ?",
            [user.id, newUserId, reqId]
        );

        // Log in consultation_logs
        await db.run(
            `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by)
             VALUES (?, 'chuyen_doi_crm', ?, ?)`,
            [accReq.customer_id,
             `🔑 Đã tạo TK Affiliate — Username: ${accReq.proposed_username} — Duyệt bởi: ${user.username}`,
             user.id]
        );

        // Notification for requesting employee
        try {
            await db.run(
                `INSERT INTO notifications (user_id, type, title, message, related_id)
                 VALUES (?, 'aff_account_approved', '🔑 TK Affiliate đã được tạo', ?, ?)`,
                [accReq.requested_by,
                 `TK Affiliate cho KH "${customer.customer_name}" đã được duyệt!\nUsername: ${accReq.proposed_username}`,
                 accReq.customer_id]
            );
        } catch(e) {}

        // Telegram
        const approver = await db.get('SELECT full_name FROM users WHERE id = ?', [user.id]);
        const tgMsg = `✅ <b>ĐÃ TẠO TK AFFILIATE</b>\n` +
            `Khách: <b>${customer.customer_name}</b> — ${customer.phone || 'N/A'}\n` +
            `Username: <b>${accReq.proposed_username}</b>\n` +
            `Duyệt bởi: ${approver?.full_name || user.username}\n` +
            `User ID: #${newUserId || '—'}`;
        _sendTg(tgMsg);

        return { success: true, message: `✅ Đã tạo TK Affiliate "${accReq.proposed_username}" cho ${customer.customer_name}!`, userId: newUserId };
    });

    // ========== REJECT ==========
    fastify.post('/api/affiliate-account/:id/reject', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const allowed = await canApprove(user.role);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const { reject_reason } = request.body || {};
        if (!reject_reason || !reject_reason.trim()) return reply.code(400).send({ error: 'Vui lòng nhập lý do từ chối' });

        const reqId = Number(request.params.id);
        const accReq = await db.get('SELECT * FROM affiliate_account_requests WHERE id = ?', [reqId]);
        if (!accReq) return reply.code(404).send({ error: 'Không tìm thấy yêu cầu' });
        if (accReq.status !== 'pending') return reply.code(400).send({ error: 'Yêu cầu đã được xử lý' });

        const customer = await db.get('SELECT customer_name, phone FROM customers WHERE id = ?', [accReq.customer_id]);

        await db.run(
            "UPDATE affiliate_account_requests SET status = 'rejected', approved_by = ?, reject_reason = ?, processed_at = NOW() WHERE id = ?",
            [user.id, reject_reason.trim(), reqId]
        );

        // Notification
        try {
            await db.run(
                `INSERT INTO notifications (user_id, type, title, message, related_id)
                 VALUES (?, 'aff_account_rejected', '❌ Yêu cầu TK Affiliate bị từ chối', ?, ?)`,
                [accReq.requested_by,
                 `KH "${customer?.customer_name || ''}" — Lý do: ${reject_reason.trim()}`,
                 accReq.customer_id]
            );
        } catch(e) {}

        // Telegram
        const rejector = await db.get('SELECT full_name FROM users WHERE id = ?', [user.id]);
        const tgMsg = `❌ <b>TỪ CHỐI TẠO TK AFFILIATE</b>\n` +
            `Khách: <b>${customer?.customer_name || '—'}</b>\n` +
            `Lý do: ${reject_reason.trim()}\n` +
            `Từ chối bởi: ${rejector?.full_name || user.username}`;
        _sendTg(tgMsg);

        return { success: true, message: 'Đã từ chối yêu cầu tạo TK.' };
    });

    // ========== CHECK FOR CUSTOMER ==========
    fastify.get('/api/affiliate-account/check/:customerId', { preHandler: [authenticate] }, async (request, reply) => {
        const custId = Number(request.params.customerId);

        // Check pending request
        const pending = await db.get(
            "SELECT id, proposed_username FROM affiliate_account_requests WHERE customer_id = ? AND status = 'pending'", [custId]
        );

        // Check existing account
        const existingAccount = await db.get(
            "SELECT id, username, full_name FROM users WHERE source_customer_id = ? AND role = 'tkaffiliate'", [custId]
        );

        return {
            hasPending: !!pending,
            pendingRequest: pending || null,
            hasAccount: !!existingAccount,
            account: existingAccount || null
        };
    });
}

module.exports = affiliateAccountRoutes;
