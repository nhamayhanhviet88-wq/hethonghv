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
    async function canApprove(userId, userRole) {
        if (userRole === 'giam_doc') return true;
        try {
            // New: user-based config
            const config = await db.get("SELECT value FROM app_config WHERE key = 'crm_conversion_approver_ids'");
            if (config && config.value) {
                const ids = JSON.parse(config.value);
                return ids.includes(userId);
            }
            // Fallback: old role-based config (backward compat)
            const oldConfig = await db.get("SELECT value FROM app_config WHERE key = 'crm_conversion_approver_roles'");
            if (oldConfig && oldConfig.value) {
                const roles = JSON.parse(oldConfig.value);
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

        // Block: CTV, Affiliate, KOL/KOC là điểm cuối — không cho chuyển ra ngoài
        const TERMINAL_CRM_TYPES = ['ctv', 'ctv_hoa_hong', 'koc_tiktok'];
        if (TERMINAL_CRM_TYPES.includes(customer.crm_type)) {
            return reply.code(400).send({ error: `Khách đang ở ${CRM_LABELS[customer.crm_type]} không thể chuyển sang CRM khác` });
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
        const newId = result?.lastID;

        // Get requester name
        const requester = await db.get('SELECT full_name FROM users WHERE id = ?', [user.id]);

        // ★ AUTO-APPROVE: chỉ CTV mới cần duyệt, các CRM khác chuyển ngay
        if (targetCrm !== 'ctv') {
            // Auto approve request
            await db.run(
                "UPDATE crm_conversion_requests SET status = 'approved', approved_by = ?, processed_at = NOW() WHERE id = ?",
                [user.id, newId]
            );
            // Update customer crm_type
            await db.run(
                'UPDATE customers SET crm_type = ?, appointment_date = CURRENT_DATE, updated_at = NOW() WHERE id = ?',
                [targetCrm, Number(customer_id)]
            );
            // Auto-sync linked tkaffiliate
            await db.run(
                "UPDATE users SET source_crm_type = ? WHERE source_customer_id = ? AND role = 'tkaffiliate'",
                [targetCrm, Number(customer_id)]
            );
            // Telegram
            const tgMsg = `✅ <b>ĐÃ CHUYỂN ${CRM_LABELS[targetCrm]?.toUpperCase()}</b> (tự động)\n` +
                `Khách: <b>${customer.customer_name}</b> — ${customer.phone || 'N/A'}\n` +
                `${CRM_LABELS[customer.crm_type]} → <b>${CRM_LABELS[targetCrm]}</b>\n` +
                `NV thực hiện: ${requester?.full_name || user.username}\n` +
                `Lý do: ${reason.trim()}`;
            sendConversionTelegram(tgMsg);
            return { success: true, message: `Đã chuyển sang ${CRM_LABELS[targetCrm]}!`, autoApproved: true };
        }

        // CTV → cần duyệt: gửi Telegram chờ duyệt
        const tgMsg = `🔄 <b>ĐỀ XUẤT CHUYỂN ĐỔI ${CRM_LABELS[targetCrm]?.toUpperCase()}</b>\n` +
            `Khách: <b>${customer.customer_name}</b> — ${customer.phone || 'N/A'}\n` +
            `CRM: ${CRM_LABELS[customer.crm_type]} → <b>${CRM_LABELS[targetCrm]}</b>\n` +
            `NV đề xuất: ${requester?.full_name || user.username}\n` +
            `Lý do: ${reason.trim()}\n` +
            `📋 Vào Chấp Nhận CTV/Affiliate để duyệt`;
        sendConversionTelegram(tgMsg);

        return { success: true, message: 'Đã gửi đề xuất chuyển đổi! Chờ duyệt.', id: newId };
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

    // ========== STATS FOR DASHBOARD CARDS ==========
    fastify.get('/api/crm-conversion/stats', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const allowed = await canApprove(user.id, user.role);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const year = Number(request.query.year) || new Date().getFullYear();
        const requestedBy = request.query.requested_by ? Number(request.query.requested_by) : null;
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year + 1}-01-01`;

        // CRM conversion counts by to_crm_type (approved only)
        let convQuery = `SELECT to_crm_type, COUNT(*) as cnt FROM crm_conversion_requests
             WHERE status = 'approved' AND created_at >= ? AND created_at < ?`;
        const convParams = [yearStart, yearEnd];
        if (requestedBy) { convQuery += ' AND requested_by = ?'; convParams.push(requestedBy); }
        convQuery += ' GROUP BY to_crm_type';
        const convRows = await db.all(convQuery, convParams);
        const convMap = {};
        convRows.forEach(r => { convMap[r.to_crm_type] = r.cnt; });
        // Total approved across all types
        const totalApproved = Object.values(convMap).reduce((sum, v) => sum + v, 0);

        // Affiliate account request counts
        let affApproved = 0, affRejected = 0;
        try {
            let affAppQuery = `SELECT COUNT(*) as cnt FROM affiliate_account_requests
                 WHERE status = 'approved' AND created_at >= ? AND created_at < ?`;
            const affAppParams = [yearStart, yearEnd];
            if (requestedBy) { affAppQuery += ' AND requested_by = ?'; affAppParams.push(requestedBy); }
            const affApp = await db.get(affAppQuery, affAppParams);
            affApproved = affApp?.cnt || 0;
            let affRejQuery = `SELECT COUNT(*) as cnt FROM affiliate_account_requests
                 WHERE status = 'rejected' AND created_at >= ? AND created_at < ?`;
            const affRejParams = [yearStart, yearEnd];
            if (requestedBy) { affRejQuery += ' AND requested_by = ?'; affRejParams.push(requestedBy); }
            const affRej = await db.get(affRejQuery, affRejParams);
            affRejected = affRej?.cnt || 0;
        } catch(e) {}

        return {
            conv_to_affiliate: convMap['ctv_hoa_hong'] || 0,
            conv_to_ctv: convMap['ctv'] || 0,
            conv_to_nhucau: convMap['nhu_cau'] || 0,
            conv_to_koctiktok: convMap['koc_tiktok'] || 0,
            total_approved: totalApproved,
            aff_account_approved: affApproved,
            aff_account_rejected: affRejected,
            year
        };
    });

    // ========== LIST CONVERSION REQUESTS ==========
    fastify.get('/api/crm-conversion/list', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const allowed = await canApprove(user.id, user.role);
        if (!allowed) return reply.code(403).send({ error: 'Bạn không có quyền xem trang này' });

        const { status, year, requested_by } = request.query;
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

        const conditions = [];
        const params = [];
        if (status && status !== 'all') {
            conditions.push('r.status = ?');
            params.push(status);
            // Pending tab: chỉ hiện CTV (Affiliate/KOL/KOC đã auto-approve)
            if (status === 'pending') {
                conditions.push("r.to_crm_type = 'ctv'");
            }
        }
        if (year) {
            conditions.push('r.created_at >= ? AND r.created_at < ?');
            params.push(`${year}-01-01`, `${Number(year) + 1}-01-01`);
        }
        if (requested_by) {
            conditions.push('r.requested_by = ?');
            params.push(Number(requested_by));
        }
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY CASE r.status WHEN \'pending\' THEN 0 ELSE 1 END, r.created_at DESC';

        const requests = await db.all(query, params);

        // Count pending (only CTV — others are auto-approved)
        const pendingCount = await db.get("SELECT COUNT(*) as cnt FROM crm_conversion_requests WHERE status = 'pending' AND to_crm_type = 'ctv'");

        return { requests, pendingCount: pendingCount?.cnt || 0 };
    });

    // ========== APPROVE CONVERSION ==========
    fastify.post('/api/crm-conversion/:id/approve', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const allowed = await canApprove(user.id, user.role);
        if (!allowed) return reply.code(403).send({ error: 'Bạn không có quyền duyệt' });

        const reqId = Number(request.params.id);
        const convReq = await db.get('SELECT * FROM crm_conversion_requests WHERE id = ?', [reqId]);
        if (!convReq) return reply.code(404).send({ error: 'Không tìm thấy yêu cầu' });

        // ★ Chặn self-approve: không tự duyệt yêu cầu do chính mình tạo (trừ GĐ)
        if (convReq.requested_by === user.id && user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Không thể tự duyệt yêu cầu do chính mình tạo. Chỉ GĐ hoặc cấp trên mới duyệt được.' });
        }

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

        // 1b. Auto-sync: update source_crm_type for any linked tkaffiliate account
        await db.run(
            "UPDATE users SET source_crm_type = ? WHERE source_customer_id = ? AND role = 'tkaffiliate'",
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
        const allowed = await canApprove(user.id, user.role);
        if (!allowed) return reply.code(403).send({ error: 'Bạn không có quyền từ chối' });

        const { reject_reason } = request.body || {};
        if (!reject_reason || !reject_reason.trim()) {
            return reply.code(400).send({ error: 'Vui lòng nhập lý do từ chối' });
        }

        const reqId = Number(request.params.id);
        const convReq = await db.get('SELECT * FROM crm_conversion_requests WHERE id = ?', [reqId]);
        if (!convReq) return reply.code(404).send({ error: 'Không tìm thấy yêu cầu' });

        // ★ Chặn self-reject
        if (convReq.requested_by === user.id && user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Không thể tự xử lý yêu cầu do chính mình tạo.' });
        }

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
        const telegram = await db.get("SELECT value FROM app_config WHERE key = 'crm_conversion_telegram_group'");
        const idsCfg = await db.get("SELECT value FROM app_config WHERE key = 'crm_conversion_approver_ids'");
        const ids = idsCfg?.value ? JSON.parse(idsCfg.value) : [];
        // Fetch user info for display
        let approvers = [];
        if (ids.length > 0) {
            const phs = ids.map((_, i) => `$${i + 1}`).join(',');
            approvers = await db.all(`SELECT id, username, full_name, role, phone, department_id FROM users WHERE id IN (${phs})`, ids);
        }
        // Get dept names
        const depts = await db.all('SELECT id, name FROM departments');
        const deptMap = {};
        depts.forEach(d => deptMap[d.id] = d.name);
        approvers = approvers.map(u => ({ ...u, dept_name: deptMap[u.department_id] || '' }));
        return {
            approver_ids: ids,
            approvers,
            telegram_group: telegram?.value || ''
        };
    });

    // ========== SETTINGS: SAVE ==========
    fastify.put('/api/crm-conversion/settings', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { approver_ids, telegram_group } = request.body || {};

        console.log('[CTV-SETTINGS] PUT received:', JSON.stringify({ approver_ids, telegram_group }));

        if (!Array.isArray(approver_ids)) return reply.code(400).send({ error: 'approver_ids phải là mảng' });

        // Filter: keep valid numeric IDs
        const cleanIds = approver_ids.map(id => Number(id)).filter(id => id > 0 && !isNaN(id));

        console.log('[CTV-SETTINGS] cleanIds:', JSON.stringify(cleanIds));

        // Validate all IDs exist
        for (const id of cleanIds) {
            const u = await db.get('SELECT id FROM users WHERE id = ?', [id]);
            if (!u) return reply.code(400).send({ error: `User id=${id} không tồn tại` });
        }

        // Upsert approver_ids
        const existingIds = await db.get("SELECT key FROM app_config WHERE key = 'crm_conversion_approver_ids'");
        if (existingIds) {
            await db.run("UPDATE app_config SET value = ? WHERE key = 'crm_conversion_approver_ids'", [JSON.stringify(cleanIds)]);
        } else {
            await db.run("INSERT INTO app_config (key, value) VALUES ('crm_conversion_approver_ids', ?)", [JSON.stringify(cleanIds)]);
        }

        // Upsert telegram_group
        const tgVal = (telegram_group || '').trim();
        const existingTg = await db.get("SELECT key FROM app_config WHERE key = 'crm_conversion_telegram_group'");
        if (existingTg) {
            await db.run("UPDATE app_config SET value = ? WHERE key = 'crm_conversion_telegram_group'", [tgVal]);
        } else {
            await db.run("INSERT INTO app_config (key, value) VALUES ('crm_conversion_telegram_group', ?)", [tgVal]);
        }

        // Verify
        const saved = await db.get("SELECT value FROM app_config WHERE key = 'crm_conversion_approver_ids'");
        console.log('[CTV-SETTINGS] Saved & verified:', saved?.value);

        return { success: true, message: 'Đã lưu cài đặt!' };
    });

    // ========== PENDING COUNT (for badge/polling) ==========
    fastify.get('/api/crm-conversion/pending-count', { preHandler: [authenticate] }, async (request, reply) => {
        // Chỉ đếm pending CTV (các CRM khác auto-approve)
        const count = await db.get("SELECT COUNT(*) as cnt FROM crm_conversion_requests WHERE status = 'pending' AND to_crm_type = 'ctv'");
        return { count: count?.cnt || 0 };
    });

    // ========== PENDING CUSTOMER IDS (batch for CRM pages freeze) ==========
    // Chỉ freeze khách chờ duyệt CTV (các CRM khác auto-approve nên không freeze)
    fastify.get('/api/crm-conversion/pending-customers', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(
            "SELECT customer_id, expires_at FROM crm_conversion_requests WHERE status = 'pending' AND to_crm_type = 'ctv'"
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
