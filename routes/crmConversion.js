const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendTelegramMessage } = require('../utils/telegram');

const CRM_LABELS = {
    nhu_cau: 'Chăm Sóc KH Nhu Cầu',
    ctv: 'Chăm Sóc CTV',
    ctv_hoa_hong: 'Chăm Sóc Affiliate',
    koc_tiktok: 'Chăm Sóc KOL/KOC Tiktok'
};

async function crmConversionRoutes(fastify, options) {

    // ========== MIGRATION: Create table if not exists ==========
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS crm_conversion_requests (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            from_crm_type TEXT NOT NULL,
            to_crm_type TEXT NOT NULL DEFAULT 'ctv',
            reason TEXT NOT NULL,
            requested_by INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            approved_by INTEGER,
            reject_reason TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            processed_at TIMESTAMP,
            expires_at TIMESTAMP
        )`);
    } catch(e) { /* already exists */ }
    try { await db.exec('ALTER TABLE crm_conversion_requests ADD COLUMN expires_at TIMESTAMP'); } catch(e) {}
    try { await db.exec('CREATE INDEX IF NOT EXISTS idx_ccr_status ON crm_conversion_requests(status)'); } catch(e) {}
    try { await db.exec('CREATE INDEX IF NOT EXISTS idx_ccr_customer ON crm_conversion_requests(customer_id)'); } catch(e) {}

    // ========== Helper: check if user can approve ==========
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

    // ========== Helper: send Telegram to configured group ==========
    async function sendConversionTelegram(message) {
        try {
            const config = await db.get("SELECT value FROM app_config WHERE key = 'crm_conversion_telegram_group'");
            if (config && config.value && config.value.trim()) {
                sendTelegramMessage(config.value.trim(), message);
            }
            // Also send to global group
            const globalId = process.env.TELEGRAM_GROUP_ID;
            if (globalId && globalId !== config?.value?.trim()) {
                sendTelegramMessage(globalId, message);
            }
        } catch(e) { /* silent */ }
    }

    // ========== CREATE CONVERSION REQUEST ==========
    fastify.post('/api/crm-conversion/request', { preHandler: [authenticate] }, async (request, reply) => {
        const { customer_id, to_crm_type, reason } = request.body || {};
        if (!customer_id) return reply.code(400).send({ error: 'Thiếu customer_id' });
        if (!reason || !reason.trim()) return reply.code(400).send({ error: 'Vui lòng nhập lý do đề xuất' });

        const targetCrm = to_crm_type || 'ctv';
        if (!['nhu_cau', 'ctv', 'ctv_hoa_hong', 'koc_tiktok'].includes(targetCrm)) {
            return reply.code(400).send({ error: 'Loại CRM chuyển đổi không hợp lệ' });
        }

        // Fetch customer
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [Number(customer_id)]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        // Block: customer already in target CRM
        if (customer.crm_type === targetCrm) {
            return reply.code(400).send({ error: `Khách hàng đã thuộc ${CRM_LABELS[targetCrm]}` });
        }

        // Block: customer cancelled
        if (customer.cancel_approved === 1) {
            return reply.code(400).send({ error: 'Không thể đề xuất khách đã bị hủy' });
        }

        // Block: customer pending cancel approval
        if (customer.cancel_requested === 1 && customer.cancel_approved === 0) {
            return reply.code(400).send({ error: 'Không thể đề xuất khách đang chờ duyệt hủy' });
        }

        // Block: only NV assigned or GĐ/QL/QLCC can request
        const user = request.user;
        const isManager = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(user.role);
        if (!isManager && customer.assigned_to_id !== user.id) {
            return reply.code(403).send({ error: 'Bạn chỉ có thể đề xuất khách mà bạn phụ trách' });
        }

        // Block: existing pending request for this customer
        const existing = await db.get(
            "SELECT id FROM crm_conversion_requests WHERE customer_id = ? AND status = 'pending'",
            [Number(customer_id)]
        );
        if (existing) {
            return reply.code(400).send({ error: 'Khách này đã có yêu cầu đang chờ duyệt' });
        }

        // Block: recently rejected (within 24 hours) — expired requests can be re-submitted immediately
        const recentReject = await db.get(
            `SELECT id FROM crm_conversion_requests WHERE customer_id = ? AND status = 'rejected'
             AND processed_at > NOW() - INTERVAL '24 hours'`,
            [Number(customer_id)]
        );
        if (recentReject) {
            return reply.code(400).send({ error: 'Yêu cầu bị từ chối gần đây. Vui lòng đợi 24 giờ để đề xuất lại.' });
        }

        // Block: recently expired (within 24 hours) — give some cooldown
        const recentExpired = await db.get(
            `SELECT id FROM crm_conversion_requests WHERE customer_id = ? AND status = 'expired'
             AND processed_at > NOW() - INTERVAL '24 hours'`,
            [Number(customer_id)]
        );
        if (recentExpired) {
            return reply.code(400).send({ error: 'Yêu cầu vừa hết hạn gần đây. Vui lòng đợi 24 giờ để đề xuất lại.' });
        }

        // Create request with expiry (midnight of day+2, Vietnam time)
        const result = await db.run(
            `INSERT INTO crm_conversion_requests (customer_id, from_crm_type, to_crm_type, reason, requested_by, expires_at)
             VALUES (?, ?, ?, ?, ?, (DATE(NOW()) + INTERVAL '2 days'))`,
            [Number(customer_id), customer.crm_type, targetCrm, reason.trim(), user.id]
        );

        // Get requester name
        const requester = await db.get('SELECT full_name FROM users WHERE id = ?', [user.id]);

        // Send Telegram
        const tgMsg = `🔄 <b>ĐỀ XUẤT CHUYỂN ĐỔI ${CRM_LABELS[targetCrm]?.toUpperCase()}</b>\n` +
            `Khách: <b>${customer.customer_name}</b> — ${customer.phone || 'N/A'}\n` +
            `CRM: ${CRM_LABELS[customer.crm_type]} → <b>${CRM_LABELS[targetCrm]}</b>\n` +
            `NV đề xuất: ${requester?.full_name || user.username}\n` +
            `Lý do: ${reason.trim()}\n` +
            `📋 Vào Chấp Nhận CTV/Affiliate để duyệt`;
        sendConversionTelegram(tgMsg);

        return { success: true, message: 'Đã gửi đề xuất chuyển đổi! Chờ duyệt.', id: result?.lastID };
    });

    // ========== CHECK PENDING REQUEST FOR A CUSTOMER ==========
    fastify.get('/api/crm-conversion/check/:customerId', { preHandler: [authenticate] }, async (request, reply) => {
        const custId = Number(request.params.customerId);
        const pending = await db.get(
            "SELECT id, to_crm_type, reason, created_at FROM crm_conversion_requests WHERE customer_id = ? AND status = 'pending'",
            [custId]
        );
        return { hasPending: !!pending, request: pending || null };
    });

    // ========== LIST CONVERSION REQUESTS ==========
    fastify.get('/api/crm-conversion/list', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const allowed = await canApprove(user.role);
        if (!allowed) return reply.code(403).send({ error: 'Bạn không có quyền xem trang này' });

        const { status } = request.query;
        let query = `SELECT r.*,
            c.customer_name, c.phone, c.facebook_link, c.address,
            c.assigned_to_id, c.crm_type as current_crm_type,
            req.full_name as requested_by_name, req.role as requested_by_role,
            ass.full_name as assigned_to_name,
            apr.full_name as approved_by_name
            FROM crm_conversion_requests r
            LEFT JOIN customers c ON r.customer_id = c.id
            LEFT JOIN users req ON r.requested_by = req.id
            LEFT JOIN users ass ON c.assigned_to_id = ass.id
            LEFT JOIN users apr ON r.approved_by = apr.id`;

        const params = [];
        if (status && status !== 'all') {
            query += ' WHERE r.status = ?';
            params.push(status);
        }
        query += ' ORDER BY CASE r.status WHEN \'pending\' THEN 0 ELSE 1 END, r.created_at DESC';

        const requests = await db.all(query, params);

        // Count pending
        const pendingCount = await db.get("SELECT COUNT(*) as cnt FROM crm_conversion_requests WHERE status = 'pending'");

        return { requests, pendingCount: pendingCount?.cnt || 0 };
    });

    // ========== APPROVE CONVERSION ==========
    fastify.post('/api/crm-conversion/:id/approve', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const allowed = await canApprove(user.role);
        if (!allowed) return reply.code(403).send({ error: 'Bạn không có quyền duyệt' });

        const reqId = Number(request.params.id);
        const convReq = await db.get('SELECT * FROM crm_conversion_requests WHERE id = ?', [reqId]);
        if (!convReq) return reply.code(404).send({ error: 'Không tìm thấy yêu cầu' });

        // Race condition check
        if (convReq.status !== 'pending') {
            return reply.code(400).send({ error: 'Yêu cầu này đã được xử lý' });
        }

        // Block approve if expired
        if (convReq.expires_at && new Date(convReq.expires_at) <= new Date()) {
            return reply.code(400).send({ error: 'Yêu cầu đã hết hạn duyệt' });
        }

        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [convReq.customer_id]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        // 1. Update customer crm_type + set appointment to today (assigned_to_id stays the same)
        await db.run(
            'UPDATE customers SET crm_type = ?, appointment_date = CURRENT_DATE, updated_at = NOW() WHERE id = ?',
            [convReq.to_crm_type, convReq.customer_id]
        );

        // 2. Update request status (audit trail kept in crm_conversion_requests table)
        await db.run(
            "UPDATE crm_conversion_requests SET status = 'approved', approved_by = ?, processed_at = NOW() WHERE id = ?",
            [user.id, reqId]
        );

        // 3. Telegram
        const approver = await db.get('SELECT full_name FROM users WHERE id = ?', [user.id]);
        const assignedTo = customer.assigned_to_id ?
            await db.get('SELECT full_name FROM users WHERE id = ?', [customer.assigned_to_id]) : null;
        const tgMsg = `✅ <b>ĐÃ DUYỆT CHUYỂN ĐỔI ${CRM_LABELS[convReq.to_crm_type]?.toUpperCase()}</b>\n` +
            `Khách: <b>${customer.customer_name}</b> — ${customer.phone || 'N/A'}\n` +
            `${CRM_LABELS[convReq.from_crm_type]} → <b>${CRM_LABELS[convReq.to_crm_type]}</b>\n` +
            `Duyệt bởi: ${approver?.full_name || user.username}\n` +
            `NV phụ trách: ${assignedTo?.full_name || '—'} (giữ nguyên)`;
        sendConversionTelegram(tgMsg);

        return { success: true, message: `Đã duyệt! Khách chuyển sang ${CRM_LABELS[convReq.to_crm_type]}.` };
    });

    // ========== REJECT CONVERSION ==========
    fastify.post('/api/crm-conversion/:id/reject', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const allowed = await canApprove(user.role);
        if (!allowed) return reply.code(403).send({ error: 'Bạn không có quyền từ chối' });

        const { reject_reason } = request.body || {};
        if (!reject_reason || !reject_reason.trim()) {
            return reply.code(400).send({ error: 'Vui lòng nhập lý do từ chối' });
        }

        const reqId = Number(request.params.id);
        const convReq = await db.get('SELECT * FROM crm_conversion_requests WHERE id = ?', [reqId]);
        if (!convReq) return reply.code(404).send({ error: 'Không tìm thấy yêu cầu' });
        if (convReq.status !== 'pending') {
            return reply.code(400).send({ error: 'Yêu cầu này đã được xử lý' });
        }

        const customer = await db.get('SELECT customer_name, phone FROM customers WHERE id = ?', [convReq.customer_id]);

        await db.run(
            "UPDATE crm_conversion_requests SET status = 'rejected', approved_by = ?, reject_reason = ?, processed_at = NOW() WHERE id = ?",
            [user.id, reject_reason.trim(), reqId]
        );

        // Set appointment_date to TOMORROW (customer wasn't handled during freeze)
        await db.run(
            'UPDATE customers SET appointment_date = CURRENT_DATE + INTERVAL \'1 day\', updated_at = NOW() WHERE id = ?',
            [convReq.customer_id]
        );

        // Log rejection in consultation_logs
        await db.run(
            `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by)
             VALUES (?, 'chuyen_doi_crm', ?, ?)`,
            [convReq.customer_id,
             `❌ Từ chối chuyển ${CRM_LABELS[convReq.to_crm_type] || convReq.to_crm_type} — Lý do: ${reject_reason.trim()}`,
             user.id]
        );

        // Telegram
        const rejector = await db.get('SELECT full_name FROM users WHERE id = ?', [user.id]);
        const tgMsg = `❌ <b>TỪ CHỐI CHUYỂN ĐỔI ${CRM_LABELS[convReq.to_crm_type]?.toUpperCase()}</b>\n` +
            `Khách: <b>${customer?.customer_name || '—'}</b> — ${customer?.phone || 'N/A'}\n` +
            `Lý do từ chối: ${reject_reason.trim()}\n` +
            `Từ chối bởi: ${rejector?.full_name || user.username}`;
        sendConversionTelegram(tgMsg);

        return { success: true, message: 'Đã từ chối yêu cầu chuyển đổi.' };
    });

    // ========== SETTINGS: GET ==========
    fastify.get('/api/crm-conversion/settings', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const roles = await db.get("SELECT value FROM app_config WHERE key = 'crm_conversion_approver_roles'");
        const telegram = await db.get("SELECT value FROM app_config WHERE key = 'crm_conversion_telegram_group'");
        return {
            approver_roles: roles?.value ? JSON.parse(roles.value) : ['giam_doc'],
            telegram_group: telegram?.value || ''
        };
    });

    // ========== SETTINGS: SAVE ==========
    fastify.put('/api/crm-conversion/settings', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { approver_roles, telegram_group } = request.body || {};

        // Ensure giam_doc is always included
        let roles = Array.isArray(approver_roles) ? approver_roles : ['giam_doc'];
        if (!roles.includes('giam_doc')) roles.unshift('giam_doc');

        // Upsert approver_roles
        const existing1 = await db.get("SELECT key FROM app_config WHERE key = 'crm_conversion_approver_roles'");
        if (existing1) {
            await db.run("UPDATE app_config SET value = ? WHERE key = 'crm_conversion_approver_roles'", [JSON.stringify(roles)]);
        } else {
            await db.run("INSERT INTO app_config (key, value) VALUES ('crm_conversion_approver_roles', ?)", [JSON.stringify(roles)]);
        }

        // Upsert telegram_group
        const tgVal = (telegram_group || '').trim();
        const existing2 = await db.get("SELECT key FROM app_config WHERE key = 'crm_conversion_telegram_group'");
        if (existing2) {
            await db.run("UPDATE app_config SET value = ? WHERE key = 'crm_conversion_telegram_group'", [tgVal]);
        } else {
            await db.run("INSERT INTO app_config (key, value) VALUES ('crm_conversion_telegram_group', ?)", [tgVal]);
        }

        return { success: true, message: 'Đã lưu cài đặt!' };
    });

    // ========== PENDING COUNT (for badge/polling) ==========
    fastify.get('/api/crm-conversion/pending-count', { preHandler: [authenticate] }, async (request, reply) => {
        const count = await db.get("SELECT COUNT(*) as cnt FROM crm_conversion_requests WHERE status = 'pending'");
        return { count: count?.cnt || 0 };
    });

    // ========== PENDING CUSTOMER IDS (batch for CRM pages freeze) ==========
    fastify.get('/api/crm-conversion/pending-customers', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(
            "SELECT customer_id, expires_at FROM crm_conversion_requests WHERE status = 'pending'"
        );
        return { customers: rows.map(r => ({ id: r.customer_id, expires_at: r.expires_at })) };
    });

    // Auto-expire is handled by standalone expireCtvRequests() called from deadline-checker
}

// Standalone expire function (called by deadline-checker)
async function expireCtvRequests() {
    const expired = await db.all(
        "SELECT r.*, c.customer_name, c.phone FROM crm_conversion_requests r LEFT JOIN customers c ON r.customer_id = c.id WHERE r.status = 'pending' AND r.expires_at <= NOW()"
    );
    if (expired.length === 0) return;

    // Helper: send to configured telegram group
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

    for (const req of expired) {
        const targetLabel = CRM_LABELS[req.to_crm_type] || req.to_crm_type;

        await db.run(
            "UPDATE crm_conversion_requests SET status = 'expired', processed_at = NOW() WHERE id = ?",
            [req.id]
        );
        await db.run(
            'UPDATE customers SET appointment_date = CURRENT_DATE + INTERVAL \'1 day\', updated_at = NOW() WHERE id = ?',
            [req.customer_id]
        );
        await db.run(
            `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by)
             VALUES (?, 'chuyen_doi_crm', ?, ?)`,
            [req.customer_id, `⏰ Đề xuất chuyển ${targetLabel} hết hạn — không được duyệt trong thời hạn`, req.requested_by]
        );
        try {
            await db.run(
                `INSERT INTO notifications (user_id, type, title, message, related_id)
                 VALUES (?, 'ctv_expired', ?, ?, ?)`,
                [req.requested_by,
                 `⏰ Đề xuất ${targetLabel} hết hạn`,
                 `KH "${req.customer_name || ''}" không được duyệt ${targetLabel} trong thời hạn. KH đã trở lại lịch chăm sóc ngày mai.`,
                 req.customer_id]
            );
        } catch(e) {}

        const tgMsg = `⏰ <b>HẾT HẠN ĐỀ XUẤT ${targetLabel.toUpperCase()}</b>\n` +
            `Khách: <b>${req.customer_name || '—'}</b> — ${req.phone || 'N/A'}\n` +
            `CRM: ${CRM_LABELS[req.from_crm_type]} (giữ nguyên)\n` +
            `Trạng thái: Hết hạn — không có người duyệt trong thời hạn\n` +
            `KH sẽ trở lại "Phải xử lý" vào ngày mai`;
        _sendTg(tgMsg);

        console.log(`[CTV Expire] Request #${req.id} for customer ${req.customer_id} (${req.customer_name}) expired → ${targetLabel}`);
    }
    console.log(`[CTV Expire] Processed ${expired.length} expired request(s)`);
}

module.exports = crmConversionRoutes;
module.exports.expireCtvRequests = expireCtvRequests;
