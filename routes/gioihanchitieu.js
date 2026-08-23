// ========== GIỚI HẠN CHI TIÊU FACEBOOK ADS ROUTES ==========
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

module.exports = async function (fastify, opts) {

    // ========== 0. AUTO MIGRATION ==========

    // Bảng 1: ads_spend_limits — Cấu hình giới hạn chi tiêu
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_spend_limits (
                id SERIAL PRIMARY KEY,
                account_id INT NOT NULL REFERENCES ads_stats_accounts(id) ON DELETE CASCADE,
                day_type VARCHAR(20) NOT NULL DEFAULT 'weekday',
                time_slot TIME NOT NULL,
                spend_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                sort_order INT DEFAULT 0,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch(e) { console.error('[ads_spend_limits migration]', e.message); }

    // Bảng 2: ads_spend_limit_logs — Log lịch sử thực thi
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_spend_limit_logs (
                id SERIAL PRIMARY KEY,
                account_id INT NOT NULL,
                account_name VARCHAR(255),
                spend_limit DECIMAL(15,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'pending',
                response TEXT,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch(e) { console.error('[ads_spend_limit_logs migration]', e.message); }

    // Bảng 3: ads_spend_limit_settings — Cài đặt chung (Zalo webhook, etc.)
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_spend_limit_settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch(e) { console.error('[ads_spend_limit_settings migration]', e.message); }

    // Bảng 4: ads_spend_limit_permissions — Phân quyền NV → tài khoản
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_spend_limit_permissions (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                account_id INT NOT NULL REFERENCES ads_stats_accounts(id) ON DELETE CASCADE,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, account_id)
            )
        `);
    } catch(e) { console.error('[ads_spend_limit_permissions migration]', e.message); }

    // Column Migration: spend_limit_enabled cho tài khoản
    try {
        await db.run(`ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS spend_limit_enabled BOOLEAN DEFAULT TRUE`);
    } catch(e) { console.error('[spend_limit_enabled migration]', e.message); }

    // ========== HELPER: Kiểm tra quyền truy cập tài khoản ==========
    // Logic: GĐ xem tất cả, NV chỉ xem TK mà mình là NV Phụ Trách (assigned_staff_name match full_name)
    async function checkAccountAccess(userId, userRole, accountId) {
        // Giám đốc xem tất cả
        if (userRole === 'giam_doc') return true;
        // NV: kiểm tra assigned_staff_name match full_name
        const [currentUser, account] = await Promise.all([
            db.get(`SELECT full_name FROM users WHERE id = $1`, [userId]),
            db.get(`SELECT assigned_staff_name FROM ads_stats_accounts WHERE id = $1`, [accountId])
        ]);
        const myName = (currentUser?.full_name || '').trim().toLowerCase();
        const assignedName = (account?.assigned_staff_name || '').trim().toLowerCase();
        return myName !== '' && myName === assignedName;
    }

    // ========== HELPER: Lấy danh sách tài khoản theo quyền ==========
    // GĐ: trả về TẤT CẢ tài khoản
    // NV: chỉ trả về TK mà mình là NV Phụ Trách (assigned_staff_name = full_name)
    async function getAccessibleAccounts(userId, userRole) {
        const allAccounts = await db.all(`SELECT id, account_name, fb_ad_account_id, is_active, assigned_staff_name, connection_status, spend_limit_enabled FROM ads_stats_accounts ORDER BY id`);
        
        if (userRole === 'giam_doc') {
            // GĐ xem hết
            return allAccounts.map(a => ({ ...a, _has_access: true }));
        }
        
        // NV: match theo full_name = assigned_staff_name
        const currentUser = await db.get(`SELECT full_name FROM users WHERE id = $1`, [userId]);
        const myName = (currentUser?.full_name || '').trim().toLowerCase();
        
        // Chỉ trả về TK mà NV được gán làm NV Phụ Trách
        return allAccounts
            .filter(a => (a.assigned_staff_name || '').trim().toLowerCase() === myName)
            .map(a => ({ ...a, _has_access: true }));
    }

    // ========== 1. GET /api/gioihanchitieu/accounts ==========
    fastify.get('/api/gioihanchitieu/accounts', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const accounts = await getAccessibleAccounts(req.user.id, req.user.role);
            return { accounts };
        } catch (e) {
            console.error('[gioihanchitieu accounts GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 1B. POST /api/gioihanchitieu/toggle-account-status ==========
    fastify.post('/api/gioihanchitieu/toggle-account-status', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { account_id, enabled } = req.body;
            const accId = parseInt(account_id);
            if (!accId) return reply.code(400).send({ error: 'Thiếu account_id' });

            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, accId);
            if (!hasAccess) return reply.code(403).send({ error: 'Bạn không có quyền thao tác trên tài khoản này' });

            const isEnabled = enabled !== false;
            await db.run(`UPDATE ads_stats_accounts SET spend_limit_enabled = $1 WHERE id = $2`, [isEnabled, accId]);

            return {
                success: true,
                enabled: isEnabled,
                message: isEnabled ? 'Đã BẬT giới hạn chi tiêu tự động' : 'Đã DỪNG giới hạn chi tiêu tự động'
            };
        } catch (e) {
            console.error('[gioihanchitieu toggle-account-status POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 2. GET /api/gioihanchitieu/config?account_id=X ==========
    fastify.get('/api/gioihanchitieu/config', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rawAccId = req.query.account_id;
            if (rawAccId === 'all') {
                const accessibleAccounts = await getAccessibleAccounts(req.user.id, req.user.role);
                const accIds = accessibleAccounts.map(a => a.id);
                if (accIds.length === 0) return { configs: [] };
                
                const configs = await db.all(`
                    SELECT l.id, l.account_id, a.account_name, l.day_type, l.time_slot, l.spend_limit, l.is_active, l.sort_order
                    FROM ads_spend_limits l
                    JOIN ads_stats_accounts a ON a.id = l.account_id
                    WHERE l.account_id = ANY($1::int[])
                    ORDER BY l.account_id, l.day_type, l.sort_order, l.time_slot
                `, [accIds]);
                return { configs };
            }

            const accountId = parseInt(rawAccId);
            if (!accountId) return reply.code(400).send({ error: 'Thiếu account_id' });

            // Kiểm tra quyền
            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, accountId);
            if (!hasAccess) return reply.code(403).send({ error: 'Bạn không có quyền xem tài khoản này' });

            const configs = await db.all(`
                SELECT id, day_type, time_slot, spend_limit, is_active, sort_order
                FROM ads_spend_limits
                WHERE account_id = $1
                ORDER BY day_type, sort_order, time_slot
            `, [accountId]);

            return { configs };
        } catch (e) {
            console.error('[gioihanchitieu config GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 3. POST /api/gioihanchitieu/config — Batch save ==========
    fastify.post('/api/gioihanchitieu/config', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { account_id, configs } = req.body;
            if (!account_id || !Array.isArray(configs)) {
                return reply.code(400).send({ error: 'Thiếu account_id hoặc configs' });
            }

            // Kiểm tra quyền
            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, account_id);
            if (!hasAccess) return reply.code(403).send({ error: 'Bạn không có quyền chỉnh sửa tài khoản này' });

            // Xóa cấu hình cũ rồi insert mới (batch save)
            await db.run(`DELETE FROM ads_spend_limits WHERE account_id = $1`, [account_id]);

            for (let i = 0; i < configs.length; i++) {
                const c = configs[i];
                await db.run(`
                    INSERT INTO ads_spend_limits (account_id, day_type, time_slot, spend_limit, is_active, sort_order, created_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [account_id, c.day_type, c.time_slot, c.spend_limit, c.is_active !== false, i, req.user.id]);
            }

            return { success: true, message: `Đã lưu ${configs.length} khung giờ` };
        } catch (e) {
            console.error('[gioihanchitieu config POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 4. DELETE /api/gioihanchitieu/config/:id ==========
    fastify.delete('/api/gioihanchitieu/config/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            await db.run(`DELETE FROM ads_spend_limits WHERE id = $1`, [req.params.id]);
            return { success: true };
        } catch (e) {
            console.error('[gioihanchitieu config DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 5. GET /api/gioihanchitieu/logs?account_id=X ==========
    fastify.get('/api/gioihanchitieu/logs', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rawAccId = req.query.account_id;
            if (rawAccId === 'all') {
                const accessibleAccounts = await getAccessibleAccounts(req.user.id, req.user.role);
                const accIds = accessibleAccounts.map(a => a.id);
                if (accIds.length === 0) return { logs: [] };

                const logs = await db.all(`
                    SELECT id, account_id, account_name, spend_limit, status, response, executed_at
                    FROM ads_spend_limit_logs
                    WHERE account_id = ANY($1::int[])
                    ORDER BY executed_at DESC
                    LIMIT 100
                `, [accIds]);
                return { logs };
            }

            const accountId = parseInt(rawAccId);
            if (!accountId) return reply.code(400).send({ error: 'Thiếu account_id' });

            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, accountId);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });

            const logs = await db.all(`
                SELECT id, account_id, account_name, spend_limit, status, response, executed_at
                FROM ads_spend_limit_logs
                WHERE account_id = $1
                ORDER BY executed_at DESC
                LIMIT 100
            `, [accountId]);

            return { logs };
        } catch (e) {
            console.error('[gioihanchitieu logs GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 6. POST /api/gioihanchitieu/test — Test thủ công ==========
    fastify.post('/api/gioihanchitieu/test', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { account_id, spend_limit } = req.body;
            if (!account_id || spend_limit == null) {
                return reply.code(400).send({ error: 'Thiếu account_id hoặc spend_limit' });
            }

            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, account_id);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });

            const account = await db.get(`SELECT * FROM ads_stats_accounts WHERE id = $1`, [account_id]);
            if (!account) return reply.code(404).send({ error: 'Tài khoản không tồn tại' });

            const result = await applySpendLimit(account, parseFloat(spend_limit));
            return result;
        } catch (e) {
            console.error('[gioihanchitieu test POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 7. SETTINGS — Cài đặt Zalo webhook ==========
    fastify.get('/api/gioihanchitieu/settings', { preHandler: [authenticate, requireRole('giam_doc')] }, async (req, reply) => {
        try {
            const rows = await db.all(`SELECT setting_key, setting_value FROM ads_spend_limit_settings`);
            const settings = {};
            rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
            return { settings };
        } catch (e) {
            console.error('[gioihanchitieu settings GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    fastify.post('/api/gioihanchitieu/settings', { preHandler: [authenticate, requireRole('giam_doc')] }, async (req, reply) => {
        try {
            const { settings } = req.body;
            if (!settings || typeof settings !== 'object') {
                return reply.code(400).send({ error: 'Thiếu settings' });
            }

            for (const [key, value] of Object.entries(settings)) {
                await db.run(`
                    INSERT INTO ads_spend_limit_settings (setting_key, setting_value, updated_at)
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                    ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
                `, [key, value]);
            }

            return { success: true };
        } catch (e) {
            console.error('[gioihanchitieu settings POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== [ĐÃ XÓA] Phân quyền NV → TK ads ==========
    // Logic phân quyền giờ dựa vào assigned_staff_name trong ads_stats_accounts
    // (Cấu hình ở trang Cài Đặt Tài Khoản Ads → NV Phụ Trách)
    // Bảng ads_spend_limit_permissions vẫn giữ nguyên trong DB để phòng rollback

    // ========== CORE: Hàm gọi Meta API để set spend_cap ==========
    async function applySpendLimit(account, spendLimitVND) {
        const rawId = (account.fb_ad_account_id || '').replace(/^act_/, '');
        const token = account.fb_access_token;

        if (!rawId || !token) {
            return { success: false, error: 'Thiếu Ad Account ID hoặc Access Token' };
        }

        // Đơn vị tiền tệ VNĐ trên Meta Ads API là 1 VNĐ = 1 unit (không nhân 100)
        const spendCapValue = Math.round(spendLimitVND);
        const url = `https://graph.facebook.com/v20.0/act_${rawId}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `access_token=${encodeURIComponent(token)}&spend_cap=${spendCapValue}`
            });
            const data = await response.json();

            const status = data.success ? 'success' : 'error';
            const logMsg = JSON.stringify(data);

            // Log kết quả
            await db.run(`
                INSERT INTO ads_spend_limit_logs (account_id, account_name, spend_limit, status, response)
                VALUES ($1, $2, $3, $4, $5)
            `, [account.id, account.account_name, spendLimitVND, status, logMsg]);

            // Gửi thông báo Zalo nếu có cấu hình
            if (status === 'success') {
                await sendZaloNotification(account, spendLimitVND);
            }

            return { success: data.success, data, message: `Đã cập nhật giới hạn chi tiêu: ${new Intl.NumberFormat('vi-VN').format(spendLimitVND)} đ` };
        } catch (e) {
            await db.run(`
                INSERT INTO ads_spend_limit_logs (account_id, account_name, spend_limit, status, response)
                VALUES ($1, $2, $3, 'error', $4)
            `, [account.id, account.account_name, spendLimitVND, e.message]);
            return { success: false, error: e.message };
        }
    }

    // ========== HELPER: Gửi thông báo Zalo (Direct Zalo Bot API & Webhook) ==========
    async function sendZaloNotification(account, spendLimitVND) {
        try {
            // Đọc cấu hình từ system_zalo_settings (nguồn chuẩn trung tâm), fallback về ads_spend_limit_settings nếu cần
            let enabledRow = await db.get(`SELECT setting_value FROM system_zalo_settings WHERE setting_key = 'zalo_enabled'`);
            if (!enabledRow) enabledRow = await db.get(`SELECT setting_value FROM ads_spend_limit_settings WHERE setting_key = 'zalo_enabled'`);
            if (enabledRow?.setting_value !== 'true') return;

            let tokenRow = await db.get(`SELECT setting_value FROM system_zalo_settings WHERE setting_key = 'zalo_access_token'`);
            if (!tokenRow) tokenRow = await db.get(`SELECT setting_value FROM ads_spend_limit_settings WHERE setting_key = 'zalo_access_token'`);

            let userIdRow = await db.get(`SELECT setting_value FROM system_zalo_settings WHERE setting_key = 'zalo_user_id'`);
            if (!userIdRow) userIdRow = await db.get(`SELECT setting_value FROM ads_spend_limit_settings WHERE setting_key = 'zalo_user_id'`);

            let webhookRow = await db.get(`SELECT setting_value FROM system_zalo_settings WHERE setting_key = 'zalo_webhook_url'`);
            if (!webhookRow) webhookRow = await db.get(`SELECT setting_value FROM ads_spend_limit_settings WHERE setting_key = 'zalo_webhook_url'`);

            const zaloToken = tokenRow?.setting_value?.trim();
            const zaloUserId = userIdRow?.setting_value?.trim();
            const webhookUrl = webhookRow?.setting_value?.trim();

            const now = new Date();
            const dayNames = ['CHỦ NHẬT', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'];
            const vnTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
            const vnDate = new Date(vnTimeString);
            const dayName = dayNames[vnDate.getDay()];

            const pad = (n) => String(n).padStart(2, '0');
            const dateFormatted = `${pad(vnDate.getDate())}/${pad(vnDate.getMonth() + 1)}/${vnDate.getFullYear()} ${pad(vnDate.getHours())}:${pad(vnDate.getMinutes())}:${pad(vnDate.getSeconds())}`;

            const formattedLimit = new Intl.NumberFormat('vi-VN').format(spendLimitVND);
            const adAccId = account.fb_ad_account_id || '';

            const message = `🎯 Giới hạn chi tiêu ${dayName} đã cập nhật!\n\n📅 Ngày: ${dateFormatted}\n\n📊 Tài khoản: ${adAccId} (${account.account_name || ''})\n✅ Trạng thái: Thành công\n\n💰 Giới hạn mới: ${formattedLimit} VND`;

            // 1. Trực tiếp gọi Zalo Bot API (bot-api.zaloplatforms.com) nếu có Token & User ID
            if (zaloToken && zaloUserId) {
                try {
                    const directUrl = `https://bot-api.zaloplatforms.com/bot${zaloToken}/sendMessage`;
                    await fetch(directUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: zaloUserId,
                            text: message
                        })
                    });
                    console.log(`[Zalo Bot Direct API] ✅ Đã gửi tin nhắn Zalo tới user ${zaloUserId}`);
                } catch (e) {
                    console.error('[Zalo Bot Direct API Error]', e.message);
                }
            }

            // 2. Gửi sang Webhook URL (n8n) nếu có cấu hình
            if (webhookUrl) {
                try {
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message,
                            text: message,
                            account_name: account.account_name,
                            spend_limit: spendLimitVND,
                            executed_at: timeStr,
                            zalo_access_token: zaloToken,
                            zalo_user_id: zaloUserId
                        })
                    });
                    console.log(`[Zalo Webhook n8n] ✅ Đã gửi webhook tới ${webhookUrl}`);
                } catch (e) {
                    console.error('[Zalo Webhook Error]', e.message);
                }
            }
        } catch (e) {
            console.error('[Zalo notification error]', e.message);
        }
    }

    // ========== CRON JOB: Chạy mỗi phút kiểm tra khung giờ ==========
    function startSpendLimitCron() {
        // Chạy mỗi 60 giây
        setInterval(async () => {
            try {
                const enabledRow = await db.get(`SELECT setting_value FROM ads_spend_limit_settings WHERE setting_key = 'cron_enabled'`);
                if (enabledRow?.setting_value !== 'true') return;

                // Giờ VN hiện tại
                const now = new Date();
                const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
                const hours = String(vnNow.getUTCHours()).padStart(2, '0');
                const minutes = String(vnNow.getUTCMinutes()).padStart(2, '0');
                const currentTime = `${hours}:${minutes}`;

                // Xác định day_type: Chủ nhật (0) = 'sunday', còn lại = 'weekday'
                const dayOfWeek = vnNow.getUTCDay();
                const dayType = dayOfWeek === 0 ? 'sunday' : 'weekday';

                // Tìm các khung giờ khớp (chỉ áp dụng cho các tài khoản đang BẬT spend_limit_enabled)
                const matchingSlots = await db.all(`
                    SELECT sl.*, a.fb_ad_account_id, a.fb_access_token, a.account_name, a.id as acc_id
                    FROM ads_spend_limits sl
                    INNER JOIN ads_stats_accounts a ON a.id = sl.account_id
                    WHERE sl.is_active = true
                    AND (a.spend_limit_enabled IS NULL OR a.spend_limit_enabled = true)
                    AND sl.day_type = $1
                    AND TO_CHAR(sl.time_slot, 'HH24:MI') = $2
                `, [dayType, currentTime]);

                for (const slot of matchingSlots) {
                    const account = {
                        id: slot.acc_id,
                        account_name: slot.account_name,
                        fb_ad_account_id: slot.fb_ad_account_id,
                        fb_access_token: slot.fb_access_token
                    };
                    const result = await applySpendLimit(account, parseFloat(slot.spend_limit));
                    console.log(`[SpendLimit CRON] ${currentTime} | ${dayType} | ${account.account_name} | ${slot.spend_limit} | ${result.success ? '✅' : '❌'}`);
                }
            } catch (e) {
                console.error('[SpendLimit CRON Error]', e.message);
            }
        }, 60 * 1000); // Mỗi 60 giây

        console.log('[SpendLimit CRON] ✅ Đã khởi động cron job giới hạn chi tiêu (mỗi 60s)');
    }

    // Khởi động cron
    startSpendLimitCron();

    // ========== PAGE ROUTES ==========
    fastify.get('/gioihanchitieu', async (req, reply) => {
        return reply.sendFile('dashboard.html');
    });

};
