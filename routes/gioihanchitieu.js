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

    // Column Migration: spend_limit_enabled, auto_reenable_at & daily_enable_paused_until cho tài khoản
    try {
        await db.run(`ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS spend_limit_enabled BOOLEAN DEFAULT TRUE`);
        await db.run(`ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS auto_reenable_at TIMESTAMPTZ`);
        await db.run(`ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS daily_enable_paused_until TIMESTAMPTZ DEFAULT NULL`);
        await db.run(`ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS daily_enable_pause_reason VARCHAR(255) DEFAULT NULL`);
        await db.run(`ALTER TABLE ads_spend_limits ADD COLUMN IF NOT EXISTS original_spend_limit DECIMAL(15,2) DEFAULT NULL`);
        await db.run(`ALTER TABLE ads_spend_limits ADD COLUMN IF NOT EXISTS is_one_time_override BOOLEAN DEFAULT FALSE`);
        await db.run(`ALTER TABLE ads_spend_limits ADD COLUMN IF NOT EXISTS override_applied_at TIMESTAMPTZ DEFAULT NULL`);
        await db.run(`UPDATE ads_spend_limits SET is_one_time_override = false, original_spend_limit = NULL WHERE spend_limit = original_spend_limit OR original_spend_limit IS NULL`);
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
        const allAccounts = await db.all(`SELECT id, account_name, fb_ad_account_id, is_active, assigned_staff_name, connection_status, spend_limit_enabled, auto_reenable_at, daily_enable_paused_until, daily_enable_pause_reason FROM ads_stats_accounts ORDER BY id`);
        
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
            const { account_id, enabled, mode, hours } = req.body;
            const accId = parseInt(account_id);
            if (!accId) return reply.code(400).send({ error: 'Thiếu account_id' });

            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, accId);
            if (!hasAccess) return reply.code(403).send({ error: 'Bạn không có quyền thao tác trên tài khoản này' });

            const isEnabled = enabled !== false;
            let autoReenableAt = null;
            let msg = '';

            if (isEnabled) {
                // BẬT lại thủ công
                await db.run(`UPDATE ads_stats_accounts SET spend_limit_enabled = true, auto_reenable_at = NULL WHERE id = $1`, [accId]);
                msg = 'Đã BẬT giới hạn chi tiêu tự động';
            } else {
                // TẮT: kiểm tra mode 'auto_timer' vs 'manual'
                const numHours = parseFloat(hours);
                if (mode === 'auto_timer' && numHours > 0) {
                    const targetTime = new Date(Date.now() + numHours * 60 * 60 * 1000);
                    autoReenableAt = targetTime.toISOString();
                    await db.run(`UPDATE ads_stats_accounts SET spend_limit_enabled = false, auto_reenable_at = $1 WHERE id = $2`, [autoReenableAt, accId]);
                    
                    const timeStr = targetTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
                    const dateStr = targetTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
                    msg = `Đã DỪNG giới hạn chi tiêu tự động (Tự động BẬT lại sau ${numHours} tiếng - lúc ${timeStr} ngày ${dateStr})`;
                } else {
                    await db.run(`UPDATE ads_stats_accounts SET spend_limit_enabled = false, auto_reenable_at = NULL WHERE id = $1`, [accId]);
                    msg = 'Đã DỪNG giới hạn chi tiêu tự động (Tắt thủ công)';
                }
            }

            return {
                success: true,
                enabled: isEnabled,
                auto_reenable_at: autoReenableAt,
                message: msg
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
                    SELECT l.id, l.account_id, a.account_name, l.day_type, l.time_slot, l.spend_limit, l.is_active, l.sort_order, l.original_spend_limit, l.is_one_time_override, l.override_applied_at
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
                SELECT id, day_type, time_slot, spend_limit, is_active, sort_order, original_spend_limit, is_one_time_override, override_applied_at
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
                const isOverride = c.is_one_time_override === true && c.original_spend_limit != null;
                const origLimit = isOverride ? parseFloat(c.original_spend_limit) : null;
                const overrideAppliedAt = isOverride ? new Date().toISOString() : null;

                await db.run(`
                    INSERT INTO ads_spend_limits (account_id, day_type, time_slot, spend_limit, is_active, sort_order, created_by, original_spend_limit, is_one_time_override, override_applied_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [account_id, c.day_type, c.time_slot, c.spend_limit, c.is_active !== false, i, req.user.id, origLimit, isOverride, overrideAppliedAt]);
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
            const { account_id, spend_limit, slot_id } = req.body;
            if (!account_id || spend_limit == null) {
                return reply.code(400).send({ error: 'Thiếu account_id hoặc spend_limit' });
            }

            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, account_id);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });

            const account = await db.get(`SELECT * FROM ads_stats_accounts WHERE id = $1`, [account_id]);
            if (!account) return reply.code(404).send({ error: 'Tài khoản không tồn tại' });

            const result = await applySpendLimit(account, parseFloat(spend_limit));

            // Tự động khôi phục nếu test slot có cờ is_one_time_override
            if (result.success && slot_id) {
                try {
                    const slot = await db.get(`SELECT * FROM ads_spend_limits WHERE id = $1`, [slot_id]);
                    if (slot && slot.is_one_time_override && slot.original_spend_limit != null) {
                        const origLimit = parseFloat(slot.original_spend_limit);
                        const appliedLimit = parseFloat(slot.spend_limit);
                        const timeStr = slot.time_slot ? String(slot.time_slot).substring(0, 5) : '';

                        await db.run(`
                            UPDATE ads_spend_limits
                            SET spend_limit = $1, original_spend_limit = NULL, is_one_time_override = false, override_applied_at = NULL
                            WHERE id = $2
                        `, [origLimit, slot.id]);

                        const fmtApplied = new Intl.NumberFormat('vi-VN').format(appliedLimit);
                        const fmtOrig = new Intl.NumberFormat('vi-VN').format(origLimit);
                        const revertMsg = `🔄 [Tự Động Khôi Phục] Mốc ${timeStr}: Đã tự động đổi số tiền từ ${fmtApplied} đ về số tiền gốc ${fmtOrig} đ sau khi test thực thi thành công.`;

                        await db.run(`
                            INSERT INTO ads_spend_limit_logs (account_id, account_name, spend_limit, status, response)
                            VALUES ($1, $2, $3, 'auto_revert', $4)
                        `, [account_id, account.account_name, origLimit, revertMsg]);
                    }
                } catch(revertErr) {
                    console.error('[Test Auto Revert Error]', revertErr.message);
                }
            }

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
                // 0. Tự động BẬT lại các tài khoản đã hết thời gian hẹn giờ tắt tạm thời
                try {
                    const expiredAccounts = await db.all(`
                        SELECT id, account_name, auto_reenable_at
                        FROM ads_stats_accounts
                        WHERE (spend_limit_enabled = false OR spend_limit_enabled IS NULL)
                          AND auto_reenable_at IS NOT NULL
                          AND auto_reenable_at <= CURRENT_TIMESTAMP
                    `);

                    for (const acc of expiredAccounts) {
                        await db.run(`
                            UPDATE ads_stats_accounts
                            SET spend_limit_enabled = true, auto_reenable_at = NULL
                            WHERE id = $1
                        `, [acc.id]);

                        await db.run(`
                            INSERT INTO ads_spend_limit_logs (account_id, account_name, spend_limit, status, response)
                            VALUES ($1, $2, 0, 'auto_reenable', $3)
                        `, [acc.id, acc.account_name, 'Hệ thống tự động BẬT lại giới hạn chi tiêu sau khi hết thời gian hẹn giờ tắt tạm thời.']);

                        console.log(`[SpendLimit CRON] ⏰ Tự động BẬT lại giới hạn chi tiêu cho tài khoản: ${acc.account_name}`);
                    }
                } catch (e) {
                    console.error('[SpendLimit CRON Auto Re-enable Error]', e.message);
                }

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

                    // TỰ ĐỘNG KHÔI PHỤC SỐ TIỀN GỐC NẾU CÓ CÀI ĐẶT LỰA CHỌN 2 (THAY ĐỔI TẠM THỜI 1 LẦN)
                    if (result.success && slot.is_one_time_override && slot.original_spend_limit != null) {
                        try {
                            const origLimit = parseFloat(slot.original_spend_limit);
                            const appliedLimit = parseFloat(slot.spend_limit);
                            const timeStr = slot.time_slot ? String(slot.time_slot).substring(0, 5) : currentTime;

                            await db.run(`
                                UPDATE ads_spend_limits
                                SET spend_limit = $1, original_spend_limit = NULL, is_one_time_override = false, override_applied_at = NULL
                                WHERE id = $2
                            `, [origLimit, slot.id]);

                            const fmtApplied = new Intl.NumberFormat('vi-VN').format(appliedLimit);
                            const fmtOrig = new Intl.NumberFormat('vi-VN').format(origLimit);
                            const revertMsg = `🔄 [Tự Động Khôi Phục] Mốc ${timeStr}: Đã tự động đổi số tiền từ ${fmtApplied} đ về số tiền gốc ${fmtOrig} đ sau khi lệnh thực thi thành công lên Facebook Ads.`;

                            await db.run(`
                                INSERT INTO ads_spend_limit_logs (account_id, account_name, spend_limit, status, response)
                                VALUES ($1, $2, $3, 'auto_revert', $4)
                            `, [slot.acc_id, slot.account_name, origLimit, revertMsg]);

                            console.log(`[SpendLimit CRON] 🔄 ${revertMsg}`);
                        } catch(revertErr) {
                            console.error('[SpendLimit CRON Revert Error]', revertErr.message);
                        }
                    }
                }
            } catch (e) {
                console.error('[SpendLimit CRON Error]', e.message);
            }
        }, 60 * 1000); // Mỗi 60 giây

        console.log('[SpendLimit CRON] ✅ Đã khởi động cron job giới hạn chi tiêu (mỗi 60s)');
    }

    // Khởi động cron
    startSpendLimitCron();

    // ======================================================================
    // =========== 2. TẮT / BẬT FB ADS — BẬT FULL CHIẾN DỊCH ==============
    // ======================================================================

    // ========== MIGRATION: Bảng cấu hình BẬT FULL & BẬT TRONG NGÀY ==========
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_auto_enable_configs (
                id SERIAL PRIMARY KEY,
                account_id INT NOT NULL REFERENCES ads_stats_accounts(id) ON DELETE CASCADE,
                config_name VARCHAR(255) NOT NULL DEFAULT 'Cấu hình BẬT',
                config_type VARCHAR(20) NOT NULL DEFAULT 'full',
                days TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
                trigger_time TIME DEFAULT '03:00',
                start_time TIME DEFAULT '08:00',
                end_time TIME DEFAULT '18:00',
                interval_minutes INT DEFAULT 3,
                date_preset VARCHAR(20) DEFAULT 'maximum',
                cpa_threshold DECIMAL(15,2) NOT NULL DEFAULT 89000,
                spend_min DECIMAL(15,2) NOT NULL DEFAULT 1,
                spend_max DECIMAL(15,2) NOT NULL DEFAULT 60000000,
                action_type VARCHAR(100) NOT NULL DEFAULT 'onsite_conversion.messaging_conversation_started_7d',
                is_active BOOLEAN DEFAULT TRUE,
                last_executed_at TIMESTAMPTZ,
                created_by INT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await db.run(`ALTER TABLE ads_auto_enable_configs ADD COLUMN IF NOT EXISTS config_type VARCHAR(20) DEFAULT 'full'`);
        await db.run(`ALTER TABLE ads_auto_enable_configs ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '08:00'`);
        await db.run(`ALTER TABLE ads_auto_enable_configs ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '18:00'`);
        await db.run(`ALTER TABLE ads_auto_enable_configs ADD COLUMN IF NOT EXISTS interval_minutes INT DEFAULT 3`);
        await db.run(`ALTER TABLE ads_auto_enable_configs ADD COLUMN IF NOT EXISTS date_preset VARCHAR(20) DEFAULT 'maximum'`);
    } catch(e) { console.error('[ads_auto_enable_configs migration]', e.message); }

    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_auto_enable_logs (
                id SERIAL PRIMARY KEY,
                config_id INT,
                account_id INT,
                account_name VARCHAR(255),
                campaign_id VARCHAR(100),
                campaign_name VARCHAR(500),
                action_taken VARCHAR(30) DEFAULT 'enabled',
                cpa_value DECIMAL(15,2) DEFAULT 0,
                spend_value DECIMAL(15,2) DEFAULT 0,
                total_actions INT DEFAULT 0,
                reason TEXT,
                batch_id VARCHAR(50),
                executed_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
    } catch(e) { console.error('[ads_auto_enable_logs migration]', e.message); }

    // ========== HELPER: Lấy giờ VN hiện tại ==========
    function getVietnamNow() {
        const now = new Date();
        // Chuyển sang UTC+7
        const vnMs = now.getTime() + 7 * 60 * 60 * 1000;
        const vnDate = new Date(vnMs);
        const hours = vnDate.getUTCHours();
        const minutes = vnDate.getUTCMinutes();
        const timeNum = hours * 60 + minutes; // Phút tính từ 00:00
        return {
            hours,
            minutes,
            timeNum,
            dayOfWeek: vnDate.getUTCDay(), // 0=CN, 1=T2, ... 6=T7
            timeStr: String(hours).padStart(2,'0') + ':' + String(minutes).padStart(2,'0'),
            fullStr: vnDate.toISOString().replace('T', ' ').slice(0, 19) + ' (VN)',
            isoDate: vnDate.toISOString()
        };
    }

    // Helper: Parse "HH:MM" string sang số phút trong ngày
    function parseTimeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const parts = String(timeStr).split(':');
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        return h * 60 + m;
    }

    // ========== HELPER: Format tiền VNĐ ==========
    function fmtVND(val) {
        const n = Math.round(parseFloat(val) || 0);
        return new Intl.NumberFormat('vi-VN').format(n);
    }

    function parseVND(val, defaultVal = 0) {
        if (val === null || val === undefined || val === '') return defaultVal;
        if (typeof val === 'number') return Math.round(val);
        let str = String(val).trim();
        if (!str) return defaultVal;
        if (/^\d+\.\d{1,2}$/.test(str)) {
            return Math.round(parseFloat(str)) || defaultVal;
        }
        const clean = str.replace(/\./g, '').replace(/,/g, '').replace(/[^\d]/g, '');
        return parseInt(clean, 10) || defaultVal;
    }

    // ========== API 1: GET /api/tatbatfbads/accounts ==========
    fastify.get('/api/tatbatfbads/accounts', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const accounts = await getAccessibleAccounts(req.user.id, req.user.role);
            return { accounts };
        } catch (e) {
            console.error('[tatbatfbads accounts GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 2: GET /api/tatbatfbads/enable-configs ==========
    fastify.get('/api/tatbatfbads/enable-configs', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rawAccId = req.query.account_id;
            if (rawAccId === 'all') {
                const accessibleAccounts = await getAccessibleAccounts(req.user.id, req.user.role);
                const accIds = accessibleAccounts.map(a => a.id);
                if (accIds.length === 0) return { configs: [] };
                const configs = await db.all(`
                    SELECT c.*, a.account_name
                    FROM ads_auto_enable_configs c
                    JOIN ads_stats_accounts a ON a.id = c.account_id
                    WHERE c.account_id = ANY($1::int[])
                    ORDER BY c.account_id, c.config_type, c.trigger_time, c.start_time
                `, [accIds]);
                return { configs };
            }
            const accountId = parseInt(rawAccId);
            if (!accountId) return reply.code(400).send({ error: 'Thiếu account_id' });
            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, accountId);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });
            const configs = await db.all(`
                SELECT c.*, a.account_name
                FROM ads_auto_enable_configs c
                JOIN ads_stats_accounts a ON a.id = c.account_id
                WHERE c.account_id = $1
                ORDER BY c.config_type, c.trigger_time, c.start_time
            `, [accountId]);
            return { configs };
        } catch (e) {
            console.error('[tatbatfbads enable-configs GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 3: POST /api/tatbatfbads/enable-configs — Tạo/Sửa ==========
    fastify.post('/api/tatbatfbads/enable-configs', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const {
                id, account_id, config_name, config_type, days, trigger_time,
                start_time, end_time, interval_minutes, date_preset,
                cpa_threshold, spend_min, spend_max, action_type, is_active
            } = req.body;

            if (!account_id) return reply.code(400).send({ error: 'Thiếu account_id' });

            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, account_id);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });

            const cfgType = config_type === 'daily' ? 'daily' : 'full';
            const daysStr = Array.isArray(days) ? days.join(',') : (days || '1,2,3,4,5,6');
            const actionTypeStr = action_type || 'onsite_conversion.messaging_conversion_started_7d';
            const datePresetStr = date_preset || (cfgType === 'daily' ? 'today' : 'maximum');
            const intervalMins = parseInt(interval_minutes) || (cfgType === 'daily' ? 3 : 1);

            const cpaNum = parseVND(cpa_threshold, cfgType === 'daily' ? 75000 : 89000);
            const minNum = parseVND(spend_min) || 1;
            const maxNum = parseVND(spend_max) || (cfgType === 'daily' ? 2000000 : 60000000);

            if (id) {
                // UPDATE
                await db.run(`
                    UPDATE ads_auto_enable_configs
                    SET config_name = $1, config_type = $2, days = $3, trigger_time = $4,
                        start_time = $5, end_time = $6, interval_minutes = $7, date_preset = $8,
                        cpa_threshold = $9, spend_min = $10, spend_max = $11, action_type = $12,
                        is_active = $13, updated_at = NOW()
                    WHERE id = $14 AND account_id = $15
                `, [
                    config_name || (cfgType === 'daily' ? 'Bật Trong Ngày' : 'Bật Full'),
                    cfgType, daysStr, trigger_time || '03:00',
                    start_time || '08:00', end_time || '18:00', intervalMins, datePresetStr,
                    cpaNum, minNum, maxNum,
                    actionTypeStr, is_active !== false, id, account_id
                ]);
                return { success: true, message: 'Đã cập nhật cấu hình BẬT' };
            } else {
                // INSERT
                const result = await db.get(`
                    INSERT INTO ads_auto_enable_configs
                    (account_id, config_name, config_type, days, trigger_time, start_time, end_time, interval_minutes, date_preset, cpa_threshold, spend_min, spend_max, action_type, is_active, created_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING id
                `, [
                    account_id,
                    config_name || (cfgType === 'daily' ? 'Bật Trong Ngày' : 'Bật Full'),
                    cfgType, daysStr, trigger_time || '03:00',
                    start_time || '08:00', end_time || '18:00', intervalMins, datePresetStr,
                    cpaNum, minNum, maxNum,
                    actionTypeStr, is_active !== false, req.user.id
                ]);
                return { success: true, id: result?.id, message: 'Đã tạo cấu hình BẬT mới' };
            }
        } catch (e) {
            console.error('[tatbatfbads enable-configs POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 4: DELETE /api/tatbatfbads/enable-configs/:id ==========
    fastify.delete('/api/tatbatfbads/enable-configs/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const configId = parseInt(req.params.id);
            if (!configId) return reply.code(400).send({ error: 'Thiếu config id' });
            const config = await db.get(`SELECT account_id FROM ads_auto_enable_configs WHERE id = $1`, [configId]);
            if (!config) return reply.code(404).send({ error: 'Cấu hình không tồn tại' });
            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, config.account_id);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });
            await db.run(`DELETE FROM ads_auto_enable_configs WHERE id = $1`, [configId]);
            return { success: true, message: 'Đã xóa cấu hình' };
        } catch (e) {
            console.error('[tatbatfbads enable-configs DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 5: POST /api/tatbatfbads/enable-configs/:id/toggle ==========
    fastify.post('/api/tatbatfbads/enable-configs/:id/toggle', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const configId = parseInt(req.params.id);
            const { is_active } = req.body;
            const config = await db.get(`SELECT account_id, config_name FROM ads_auto_enable_configs WHERE id = $1`, [configId]);
            if (!config) return reply.code(404).send({ error: 'Cấu hình không tồn tại' });
            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, config.account_id);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });
            await db.run(`UPDATE ads_auto_enable_configs SET is_active = $1, updated_at = NOW() WHERE id = $2`, [is_active !== false, configId]);
            return { success: true, message: `Đã ${is_active !== false ? 'BẬT' : 'TẮT'} cấu hình "${config.config_name}"` };
        } catch (e) {
            console.error('[tatbatfbads toggle config]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 6: GET /api/tatbatfbads/enable-logs ==========
    fastify.get('/api/tatbatfbads/enable-logs', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rawAccId = req.query.account_id;
            const limit = parseInt(req.query.limit) || 100;
            let accIds = [];
            if (rawAccId === 'all') {
                const accessibleAccounts = await getAccessibleAccounts(req.user.id, req.user.role);
                accIds = accessibleAccounts.map(a => a.id);
                if (accIds.length === 0) return { logs: [] };
            } else {
                const accountId = parseInt(rawAccId);
                if (!accountId) return reply.code(400).send({ error: 'Thiếu account_id' });
                const hasAccess = await checkAccountAccess(req.user.id, req.user.role, accountId);
                if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });
                accIds = [accountId];
            }

            const logs = await db.all(`
                SELECT 
                    COALESCE(l.batch_id, 'single_' || l.id::text) as batch_id,
                    MAX(l.config_id) as config_id,
                    MAX(c.config_name) as config_name,
                    MAX(c.config_type) as config_type,
                    MAX(l.account_id) as account_id,
                    MAX(l.account_name) as account_name,
                    MAX(l.executed_at) as executed_at,
                    COUNT(*)::int as enabled_count,
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', l.id,
                            'campaign_id', l.campaign_id,
                            'campaign_name', l.campaign_name,
                            'cpa_value', l.cpa_value,
                            'spend_value', l.spend_value,
                            'total_actions', l.total_actions,
                            'reason', l.reason
                        ) ORDER BY l.id ASC
                    ) as details
                FROM ads_auto_enable_logs l
                LEFT JOIN ads_auto_enable_configs c ON c.id = l.config_id
                WHERE l.action_taken = 'enabled' AND l.account_id = ANY($1::int[])
                GROUP BY COALESCE(l.batch_id, 'single_' || l.id::text)
                ORDER BY MAX(l.executed_at) DESC
                LIMIT $2
            `, [accIds, limit]);

            return { logs };
        } catch (e) {
            console.error('[tatbatfbads enable-logs GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 7: POST /api/tatbatfbads/execute-enable — Chạy thủ công ==========
    fastify.post('/api/tatbatfbads/execute-enable', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { config_id } = req.body;
            if (!config_id) return reply.code(400).send({ error: 'Thiếu config_id' });
            const config = await db.get(`
                SELECT c.*, a.account_name, a.fb_ad_account_id, a.fb_access_token
                FROM ads_auto_enable_configs c
                JOIN ads_stats_accounts a ON a.id = c.account_id
                WHERE c.id = $1
            `, [config_id]);
            if (!config) return reply.code(404).send({ error: 'Cấu hình không tồn tại' });
            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, config.account_id);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });

            const result = await executeAutoEnable(config);
            return result;
        } catch (e) {
            console.error('[tatbatfbads execute-enable POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 8: GET /api/tatbatfbads/disable-configs ==========
    fastify.get('/api/tatbatfbads/disable-configs', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rawAccId = req.query.account_id;
            let configs = [];
            if (rawAccId === 'all') {
                const accessibleAccounts = await getAccessibleAccounts(req.user.id, req.user.role);
                const accIds = accessibleAccounts.map(a => a.id);
                if (accIds.length === 0) return { configs: [] };
                configs = await db.all(`
                    SELECT c.*, a.account_name, a.fb_ad_account_id
                    FROM ads_auto_disable_configs c
                    JOIN ads_stats_accounts a ON a.id = c.account_id
                    WHERE c.account_id IN (${accIds.map((_, i) => `$${i + 1}`).join(',')})
                    ORDER BY c.created_at DESC
                `, accIds);
            } else {
                const accountId = parseInt(rawAccId);
                if (!accountId) return reply.code(400).send({ error: 'Thiếu account_id' });
                const hasAccess = await checkAccountAccess(req.user.id, req.user.role, accountId);
                if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền truy cập tài khoản này' });
                configs = await db.all(`
                    SELECT c.*, a.account_name, a.fb_ad_account_id
                    FROM ads_auto_disable_configs c
                    JOIN ads_stats_accounts a ON a.id = c.account_id
                    WHERE c.account_id = $1
                    ORDER BY c.created_at DESC
                `, [accountId]);
            }
            return { configs };
        } catch (e) {
            console.error('[tatbatfbads disable-configs GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 9: POST /api/tatbatfbads/disable-configs ==========
    fastify.post('/api/tatbatfbads/disable-configs', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const {
                id, account_id, config_name, disable_type,
                days, trigger_time, cpa_threshold,
                spend_min, spend_max, action_type, date_preset, is_active,
                start_time, end_time, interval_minutes
            } = req.body;

            const accountId = parseInt(account_id);
            if (!accountId) return reply.code(400).send({ error: 'Thiếu account_id' });
            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, accountId);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền truy cập tài khoản này' });

            const dType = disable_type || 'full';
            const daysStr = Array.isArray(days) ? days.join(',') : (days || '1,2,3,4,5,6,0');
            const cpaNum = parseVND(cpa_threshold, dType === 'full' ? 0 : 75000);
            const minNum = parseVND(spend_min, dType === 'daily' ? 65000 : 1);
            const maxNum = parseVND(spend_max, 2000000);
            const actionTypeStr = action_type || 'onsite_conversion.messaging_conversation_started_7d';
            const datePresetStr = date_preset || 'today';
            const startTimeStr = start_time || '00:00';
            const endTimeStr = end_time || '23:59';
            const intervalMin = parseInt(interval_minutes) || 3;

            if (id) {
                await db.run(`
                    UPDATE ads_auto_disable_configs
                    SET config_name = $1, disable_type = $2, days = $3, trigger_time = $4,
                        cpa_threshold = $5, spend_min = $6, spend_max = $7,
                        action_type = $8, date_preset = $9, is_active = $10,
                        start_time = $11, end_time = $12, interval_minutes = $13,
                        updated_at = NOW()
                    WHERE id = $14 AND account_id = $15
                `, [
                    config_name || (dType === 'daily' ? 'Tắt Camp CPA Cao Trong Ngày' : (dType === 'no_message' ? 'Tắt Camp Không Tin Nhắn' : 'Tắt Full Chiến Dịch')),
                    dType, daysStr, trigger_time || '23:30',
                    cpaNum, minNum, maxNum,
                    actionTypeStr, datePresetStr, is_active !== false,
                    startTimeStr, endTimeStr, intervalMin,
                    id, accountId
                ]);
                return { success: true, message: 'Đã cập nhật cấu hình TẮT' };
            } else {
                const result = await db.get(`
                    INSERT INTO ads_auto_disable_configs 
                    (account_id, config_name, disable_type, days, trigger_time, cpa_threshold, spend_min, spend_max, action_type, date_preset, is_active, start_time, end_time, interval_minutes, created_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING id
                `, [
                    accountId,
                    config_name || (dType === 'daily' ? 'Tắt Camp CPA Cao Trong Ngày' : (dType === 'no_message' ? 'Tắt Camp Không Tin Nhắn' : 'Tắt Full Chiến Dịch')),
                    dType, daysStr, trigger_time || '23:30',
                    cpaNum, minNum, maxNum,
                    actionTypeStr, datePresetStr, is_active !== false,
                    startTimeStr, endTimeStr, intervalMin,
                    req.user.id
                ]);
                return { success: true, id: result?.id, message: 'Đã tạo cấu hình TẮT mới' };
            }
        } catch (e) {
            console.error('[tatbatfbads disable-configs POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 10: DELETE /api/tatbatfbads/disable-configs/:id ==========
    fastify.delete('/api/tatbatfbads/disable-configs/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const configId = parseInt(req.params.id);
            if (!configId) return reply.code(400).send({ error: 'Thiếu config id' });
            const config = await db.get(`SELECT account_id FROM ads_auto_disable_configs WHERE id = $1`, [configId]);
            if (!config) return reply.code(404).send({ error: 'Cấu hình không tồn tại' });
            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, config.account_id);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });
            await db.run(`DELETE FROM ads_auto_disable_configs WHERE id = $1`, [configId]);
            return { success: true, message: 'Đã xóa cấu hình TẮT' };
        } catch (e) {
            console.error('[tatbatfbads disable-configs DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 11: POST /api/tatbatfbads/disable-configs/:id/toggle ==========
    fastify.post('/api/tatbatfbads/disable-configs/:id/toggle', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const configId = parseInt(req.params.id);
            const { is_active } = req.body;
            const config = await db.get(`SELECT account_id, config_name FROM ads_auto_disable_configs WHERE id = $1`, [configId]);
            if (!config) return reply.code(404).send({ error: 'Cấu hình không tồn tại' });
            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, config.account_id);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });
            await db.run(`UPDATE ads_auto_disable_configs SET is_active = $1, updated_at = NOW() WHERE id = $2`, [is_active !== false, configId]);
            return { success: true, message: `Đã ${is_active !== false ? 'BẬT' : 'TẮT'} cấu hình TẮT "${config.config_name}"` };
        } catch (e) {
            console.error('[tatbatfbads toggle disable config]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 12: POST /api/tatbatfbads/execute-disable ==========
    fastify.post('/api/tatbatfbads/execute-disable', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { config_id } = req.body;
            if (!config_id) return reply.code(400).send({ error: 'Thiếu config_id' });
            const config = await db.get(`
                SELECT c.*, a.account_name, a.fb_ad_account_id, a.fb_access_token
                FROM ads_auto_disable_configs c
                JOIN ads_stats_accounts a ON a.id = c.account_id
                WHERE c.id = $1
            `, [config_id]);
            if (!config) return reply.code(404).send({ error: 'Cấu hình không tồn tại' });
            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, config.account_id);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });

            const result = await executeAutoDisable(config);
            return result;
        } catch (e) {
            console.error('[tatbatfbads execute-disable POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 12B: POST /api/tatbatfbads/emergency-disable — Tắt Khẩn Cấp & Hẹn Giờ Tạm Dừng Bật Ngày ==========
    fastify.post('/api/tatbatfbads/emergency-disable', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { account_id, hours, mode } = req.body;
            const accId = parseInt(account_id);
            if (!accId) return reply.code(400).send({ error: 'Thiếu account_id' });

            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, accId);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền thao tác trên tài khoản này' });

            const account = await db.get(`SELECT * FROM ads_stats_accounts WHERE id = $1`, [accId]);
            if (!account) return reply.code(404).send({ error: 'Tài khoản không tồn tại' });

            // 计算 targetTime (thời điểm tự động khôi phục)
            let targetTime = new Date();
            if (mode === 'until_07am') {
                targetTime.setDate(targetTime.getDate() + 1);
                targetTime.setHours(7, 0, 0, 0);
            } else {
                const numHours = parseFloat(hours) || 4;
                targetTime = new Date(Date.now() + numHours * 60 * 60 * 1000);
            }

            const token = (account.fb_access_token || '').trim();
            const rawActId = (account.fb_ad_account_id || '').replace(/^act_/, '').trim();
            const batchId = `emergency_${accId}_${Date.now()}`;
            let disabledCount = 0;
            const disabledCampaigns = [];

            // 1. TẮT TẤT CẢ CHIẾN DỊCH ACTIVE TRÊN FACEBOOK (LẤY 100% BẰNG PAGINATION & INSIGHTS HÔM NAY)
            if (token && rawActId) {
                // A. Lấy insights hôm nay để tính Chi Tiêu, Tin Nhắn, CPA chuẩn xác
                const insightsMap = new Map();
                try {
                    const insightsUrl = `https://graph.facebook.com/v24.0/act_${rawActId}/insights?level=campaign&fields=campaign_id,spend,actions&action_breakdowns=['action_type']&date_preset=today&limit=1000&access_token=${encodeURIComponent(token)}`;
                    const insightsRes = await fetch(insightsUrl);
                    const insightsData = await insightsRes.json();
                    if (insightsData.data) {
                        for (const item of insightsData.data) {
                            const spend = parseFloat(item.spend || 0);
                            let totalActions = 0;
                            const actions = item.actions || [];
                            for (const act of actions) {
                                if (act.action_type === 'onsite_conversion.messaging_conversation_started_7d' || act.action_type === 'onsite_conversion.total_messaging_connection') {
                                    totalActions = parseInt(act.value || 0, 10);
                                    if (totalActions > 0) break;
                                }
                            }
                            const cpa = totalActions > 0 ? spend / totalActions : 0;
                            insightsMap.set(item.campaign_id, { spend, totalActions, cpa });
                        }
                    }
                } catch(insErr) { console.error('[EmergencyDisable Insights Fetch Error]', insErr.message); }

                // B. Lấy TẤT CẢ chiến dịch ACTIVE bằng vòng lặp Pagination (đảm bảo không bị sót 25 camp)
                let campaignsUrl = `https://graph.facebook.com/v24.0/act_${rawActId}/campaigns?fields=id,name,status,effective_status&effective_status=['ACTIVE']&limit=500&access_token=${encodeURIComponent(token)}`;
                const campaigns = [];

                while (campaignsUrl) {
                    const campsRes = await fetch(campaignsUrl);
                    const campsData = await campsRes.json();
                    if (campsData.data && campsData.data.length > 0) {
                        campaigns.push(...campsData.data);
                    }
                    campaignsUrl = (campsData.paging && campsData.paging.next) ? campsData.paging.next : null;
                }

                for (const camp of campaigns) {
                    const disableRes = await fetch(`https://graph.facebook.com/v24.0/${camp.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `status=PAUSED&access_token=${encodeURIComponent(token)}`
                    });
                    const disableData = await disableRes.json();

                    if (disableData.success) {
                        disabledCount++;
                        const ins = insightsMap.get(camp.id) || { spend: 0, totalActions: 0, cpa: 0 };
                        const reasonStr = `🚨 TẮT KHẨN CẤP (Tạm dừng BẬT Trong Ngày đến ${targetTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })} ngày ${targetTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })})`;
                        disabledCampaigns.push({ campaign_name: camp.name, reason: reasonStr });

                        await db.run(`
                            INSERT INTO ads_auto_disable_logs (config_id, account_id, account_name, campaign_id, campaign_name, action_taken, cpa_value, spend_value, total_actions, reason, batch_id)
                            VALUES (NULL, $1, $2, $3, $4, 'disabled', $5, $6, $7, $8, $9)
                        `, [accId, account.account_name, camp.id, camp.name, ins.cpa, ins.spend, ins.totalActions, reasonStr, batchId]);
                    }
                }
            }

            // 2. CẬP NHẬT TRẠNG THÁI TẠM DỪNG VÀO CSDL
            const timeStr = targetTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
            const dateStr = targetTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
            const reasonMsg = `🚨 Tắt Khẩn Cấp (Tạm dừng BẬT Trong Ngày đến ${timeStr} ${dateStr})`;

            await db.run(`
                UPDATE ads_stats_accounts
                SET daily_enable_paused_until = $1, daily_enable_pause_reason = $2
                WHERE id = $3
            `, [targetTime.toISOString(), reasonMsg, accId]);

            // Tạm dừng tất cả cấu hình BẬT Trong Ngày của tài khoản
            await db.run(`
                UPDATE ads_auto_enable_configs
                SET is_active = false
                WHERE account_id = $1 AND config_type = 'daily'
            `, [accId]);

            // 3. GỬI THÔNG BÁO ZALO BOT
            sendAutoDisableZaloNotification({
                disable_type: 'full',
                account_name: account.account_name
            }, disabledCount, disabledCampaigns.length > 0 ? disabledCampaigns : [{ campaign_name: 'Tất cả chiến dịch', reason: reasonMsg }]);

            return {
                success: true,
                disabled_count: disabledCount,
                daily_enable_paused_until: targetTime.toISOString(),
                message: `Đã TẮT KHẨN CẤP (${disabledCount} chiến dịch) & Tạm dừng BẬT Trong Ngày đến ${timeStr} ngày ${dateStr}`
            };
        } catch (e) {
            console.error('[tatbatfbads emergency-disable POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 12C: POST /api/tatbatfbads/resume-daily-enable — Khôi Phục Bật Trong Ngày Thủ Công ==========
    fastify.post('/api/tatbatfbads/resume-daily-enable', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { account_id } = req.body;
            const accId = parseInt(account_id);
            if (!accId) return reply.code(400).send({ error: 'Thiếu account_id' });

            const hasAccess = await checkAccountAccess(req.user.id, req.user.role, accId);
            if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền thao tác' });

            // Reset trạng thái tạm dừng trong ads_stats_accounts
            await db.run(`
                UPDATE ads_stats_accounts
                SET daily_enable_paused_until = NULL, daily_enable_pause_reason = NULL
                WHERE id = $1
            `, [accId]);

            // Bật lại tất cả cấu hình BẬT Trong Ngày của tài khoản
            await db.run(`
                UPDATE ads_auto_enable_configs
                SET is_active = true
                WHERE account_id = $1 AND config_type = 'daily'
            `, [accId]);

            return {
                success: true,
                message: 'Đã KHÔI PHỤC tính năng BẬT Trong Ngày thành công!'
            };
        } catch (e) {
            console.error('[tatbatfbads resume-daily-enable POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== API 13: GET /api/tatbatfbads/disable-logs ==========
    fastify.get('/api/tatbatfbads/disable-logs', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rawAccId = req.query.account_id;
            const limit = parseInt(req.query.limit) || 100;
            let accIds = [];
            if (rawAccId === 'all') {
                const accessibleAccounts = await getAccessibleAccounts(req.user.id, req.user.role);
                accIds = accessibleAccounts.map(a => a.id);
                if (accIds.length === 0) return { logs: [] };
            } else {
                const accountId = parseInt(rawAccId);
                if (!accountId) return reply.code(400).send({ error: 'Thiếu account_id' });
                const hasAccess = await checkAccountAccess(req.user.id, req.user.role, accountId);
                if (!hasAccess) return reply.code(403).send({ error: 'Không có quyền' });
                accIds = [accountId];
            }

            const logs = await db.all(`
                SELECT 
                    COALESCE(l.batch_id, 'single_' || l.id::text) as batch_id,
                    MAX(l.config_id) as config_id,
                    MAX(c.config_name) as config_name,
                    MAX(c.disable_type) as disable_type,
                    MAX(l.account_name) as account_name,
                    MAX(l.created_at) as created_at,
                    COUNT(CASE WHEN l.action_taken = 'disabled' THEN 1 END) as disabled_count,
                    COUNT(CASE WHEN l.action_taken LIKE 'skipped%' THEN 1 END) as skipped_count,
                    COUNT(CASE WHEN l.action_taken = 'error' THEN 1 END) as error_count,
                    COUNT(*) as total_count,
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', l.id,
                            'campaign_id', l.campaign_id,
                            'campaign_name', l.campaign_name,
                            'action_taken', l.action_taken,
                            'cpa_value', l.cpa_value,
                            'spend_value', l.spend_value,
                            'total_actions', l.total_actions,
                            'reason', l.reason,
                            'created_at', l.created_at
                        ) ORDER BY l.id ASC
                    ) as campaign_details
                FROM ads_auto_disable_logs l
                LEFT JOIN ads_auto_disable_configs c ON c.id = l.config_id
                WHERE l.account_id IN (${accIds.map((_, i) => `$${i + 1}`).join(',')})
                GROUP BY COALESCE(l.batch_id, 'single_' || l.id::text)
                ORDER BY MAX(l.created_at) DESC
                LIMIT $${accIds.length + 1}
            `, [...accIds, limit]);

            return { logs };
        } catch (e) {
            console.error('[tatbatfbads disable-logs GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== CORE: Thực thi TẮT CHIẾN DỊCH ==========
    async function executeAutoDisable(config) {
        const rawId = (config.fb_ad_account_id || '').replace(/^act_/, '');
        const token = config.fb_access_token;
        if (!rawId || !token) {
            return { success: false, error: 'Thiếu Ad Account ID hoặc Access Token', disabled: 0, skipped: 0 };
        }

        const batchId = 'disable_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const disableType = config.disable_type || 'full';
        const cpaThreshold = parseFloat(config.cpa_threshold) || 75000;
        const spendMin = parseFloat(config.spend_min) || 1;
        const spendMax = parseFloat(config.spend_max) || 2000000;
        const targetActionType = (config.action_type || 'onsite_conversion.messaging_conversation_started_7d')
            .replace('messaging_conversion_started_7d', 'messaging_conversation_started_7d');

        let disabledCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const results = [];

        try {
            if (disableType === 'full') {
                // LOẠI 1: TẮT FULL — Lấy insights hôm nay + Lấy tất cả campaign đang ACTIVE (bằng Pagination) và TẮT hết
                const insightsMap = new Map();
                try {
                    const insightsUrl = `https://graph.facebook.com/v24.0/act_${rawId}/insights?level=campaign&fields=campaign_id,spend,actions&action_breakdowns=['action_type']&date_preset=today&limit=1000&access_token=${encodeURIComponent(token)}`;
                    const insightsRes = await fetch(insightsUrl);
                    const insightsData = await insightsRes.json();
                    if (insightsData.data) {
                        for (const item of insightsData.data) {
                            const spend = parseFloat(item.spend || 0);
                            let totalActions = 0;
                            const actions = item.actions || [];
                            for (const act of actions) {
                                if (act.action_type === 'onsite_conversion.messaging_conversation_started_7d' || act.action_type === 'onsite_conversion.total_messaging_connection') {
                                    totalActions = parseInt(act.value || 0, 10);
                                    if (totalActions > 0) break;
                                }
                            }
                            const cpa = totalActions > 0 ? spend / totalActions : 0;
                            insightsMap.set(item.campaign_id, { spend, totalActions, cpa });
                        }
                    }
                } catch(insErr) { console.error('[DisableFull Insights Fetch Error]', insErr.message); }

                let campsUrl = `https://graph.facebook.com/v24.0/act_${rawId}/campaigns?fields=id,name,status,effective_status&effective_status=['ACTIVE']&limit=500&access_token=${encodeURIComponent(token)}`;
                const campaigns = [];

                while (campsUrl) {
                    const campsRes = await fetch(campsUrl);
                    const campsData = await campsRes.json();
                    if (campsData.data && campsData.data.length > 0) {
                        campaigns.push(...campsData.data);
                    }
                    campsUrl = (campsData.paging && campsData.paging.next) ? campsData.paging.next : null;
                }

                for (const camp of campaigns) {
                    const status = camp.effective_status || camp.status || '';
                    if (status === 'ACTIVE') {
                        // TẮT campaign
                        const disableRes = await fetch(`https://graph.facebook.com/v24.0/${camp.id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: `status=PAUSED&access_token=${encodeURIComponent(token)}`
                        });
                        const disableData = await disableRes.json();

                        if (disableData.success) {
                            disabledCount++;
                            const ins = insightsMap.get(camp.id) || { spend: 0, totalActions: 0, cpa: 0 };
                            const reason = `[Tắt Full] Tắt tự động theo lịch mốc giờ`;
                            results.push({ campaign_id: camp.id, campaign_name: camp.name, action: 'disabled', cpa: ins.cpa, spend: ins.spend, totalActions: ins.totalActions, reason });

                            await db.run(`
                                INSERT INTO ads_auto_disable_logs (config_id, account_id, account_name, campaign_id, campaign_name, action_taken, cpa_value, spend_value, total_actions, reason, batch_id)
                                VALUES ($1, $2, $3, $4, $5, 'disabled', $6, $7, $8, $9, $10)
                            `, [config.id, config.account_id, config.account_name, camp.id, camp.name, ins.cpa, ins.spend, ins.totalActions, reason, batchId]);
                        } else {
                            errorCount++;
                            const errReason = `FB API Error: ${JSON.stringify(disableData)}`;
                            await db.run(`
                                INSERT INTO ads_auto_disable_logs (config_id, account_id, account_name, campaign_id, campaign_name, action_taken, cpa_value, spend_value, total_actions, reason, batch_id)
                                VALUES ($1, $2, $3, $4, $5, 'error', 0, 0, 0, $6, $7)
                            `, [config.id, config.account_id, config.account_name, camp.id, camp.name, errReason, batchId]);
                        }
                    } else {
                        skippedCount++;
                    }
                }

            } else {
                // LOẠI 2: TẮT Không Ra Tin Nhắn / CPA Cao trong ngày (date_preset=today)
                const insightsUrl = `https://graph.facebook.com/v24.0/act_${rawId}/insights?level=campaign&fields=campaign_id,campaign_name,spend,actions&action_breakdowns=['action_type']&date_preset=today&limit=1000&access_token=${encodeURIComponent(token)}`;
                const insightsRes = await fetch(insightsUrl);
                const insightsData = await insightsRes.json();

                if (insightsData.error) {
                    return { success: false, error: `Facebook API Error: ${insightsData.error.message}`, disabled: 0, skipped: 0 };
                }

                const campaigns = insightsData.data || [];
                for (const camp of campaigns) {
                    const spend = parseFloat(camp.spend || 0);

                    // Lọc theo ngưỡng chi tiêu min-max
                    if (spend < spendMin || spend > spendMax) {
                        skippedCount++;
                        continue;
                    }

                    // Tính tổng tin nhắn
                    const actions = camp.actions || [];
                    let totalActions = 0;
                    for (const action of actions) {
                        if (action.action_type === targetActionType || action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                            totalActions = parseInt(action.value || 0, 10);
                            break;
                        }
                    }
                    if (totalActions === 0) {
                        for (const action of actions) {
                            if (action.action_type === 'onsite_conversion.total_messaging_connection') {
                                totalActions = parseInt(action.value || 0, 10);
                                break;
                            }
                        }
                    }

                    const cpa = totalActions > 0 ? spend / totalActions : 999999;
                    const isNoMessage = totalActions === 0;
                    const isCPAHigh = cpa > cpaThreshold;

                    // Chỉ tắt khi KHÔNG ra tin nhắn hoặc CPA vượt ngưỡng
                    if (!isNoMessage && !isCPAHigh) {
                        skippedCount++;
                        continue;
                    }

                    // Kiểm tra status hiện tại từ Facebook
                    const statusUrl = `https://graph.facebook.com/v24.0/${camp.campaign_id}?fields=status,effective_status&access_token=${encodeURIComponent(token)}`;
                    const statusRes = await fetch(statusUrl);
                    const statusData = await statusRes.json();
                    const currentStatus = statusData.effective_status || statusData.status || '';

                    if (currentStatus === 'ACTIVE') {
                        // TẮT campaign
                        const disableRes = await fetch(`https://graph.facebook.com/v24.0/${camp.campaign_id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: `status=PAUSED&access_token=${encodeURIComponent(token)}`
                        });
                        const disableData = await disableRes.json();

                        if (disableData.success) {
                            disabledCount++;
                            const reasonStr = isNoMessage 
                                ? `Không ra tin nhắn (Chi tiêu: ${fmtVND(spend)}đ, Tin nhắn: 0)` 
                                : `CPA vượt ngưỡng (${fmtVND(cpa)}đ > ${fmtVND(cpaThreshold)}đ | Spend: ${fmtVND(spend)}đ | TN: ${totalActions})`;
                            results.push({ campaign_id: camp.campaign_id, campaign_name: camp.campaign_name, action: 'disabled', cpa, spend, totalActions, reason: reasonStr });

                            await db.run(`
                                INSERT INTO ads_auto_disable_logs (config_id, account_id, account_name, campaign_id, campaign_name, action_taken, cpa_value, spend_value, total_actions, reason, batch_id)
                                VALUES ($1, $2, $3, $4, $5, 'disabled', $6, $7, $8, $9, $10)
                            `, [config.id, config.account_id, config.account_name, camp.campaign_id, camp.campaign_name, cpa, spend, totalActions, reasonStr, batchId]);
                        } else {
                            errorCount++;
                            const errReason = `FB API Error: ${JSON.stringify(disableData)}`;
                            await db.run(`
                                INSERT INTO ads_auto_disable_logs (config_id, account_id, account_name, campaign_id, campaign_name, action_taken, cpa_value, spend_value, total_actions, reason, batch_id)
                                VALUES ($1, $2, $3, $4, $5, 'error', $6, $7, $8, $9, $10)
                            `, [config.id, config.account_id, config.account_name, camp.campaign_id, camp.campaign_name, cpa, spend, totalActions, errReason, batchId]);
                        }
                    } else {
                        skippedCount++;
                    }
                }
            }

            // Update last_executed_at
            await db.run(`UPDATE ads_auto_disable_configs SET last_executed_at = NOW() WHERE id = $1`, [config.id]);

            // Gửi thông báo Zalo nếu có chiến dịch được TẮT
            if (disabledCount > 0) {
                await sendAutoDisableZaloNotification(config, disabledCount, skippedCount, results, batchId);
            }

            return {
                success: true,
                disabled: disabledCount,
                skipped: skippedCount,
                errors: errorCount,
                batch_id: batchId,
                message: `Đã TẮT ${disabledCount} chiến dịch, bỏ qua ${skippedCount}, lỗi ${errorCount}`,
                results
            };
        } catch (e) {
            console.error('[AutoDisable executeAutoDisable]', e);
            return { success: false, error: e.message, disabled: 0, skipped: 0 };
        }
    }

    // ========== HELPER: Gửi thông báo Zalo sau khi TẮT ==========
    async function sendAutoDisableZaloNotification(config, disabledCount, skippedCount, results, batchId) {
        try {
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

            if (!zaloToken && !zaloUserId && !webhookUrl) return;

            const now = new Date();
            const timeStr12h = now.toLocaleTimeString('en-US', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            }).toLowerCase();

            let message = '';
            if (config.disable_type === 'full') {
                // Cú pháp chuẩn n8n dành cho TẮT HẾT TẤT CẢ CHIẾN DỊCH
                message = `⛔ ⛔ ⛔ TẮT HẾT TẤT CẢ CHIẾN DỊCH : Tài khoản ${config.account_name || 'TUẤN HÂN 004'} - ĐỒNG PHỤC HV\nTime Tắt : ${timeStr12h}\n\n⛔ ⛔ ⛔ Tổng số lượng CHIẾN DỊCH TẮT HẾT : ${disabledCount}`;
            } else if (config.disable_type === 'daily') {
                // Cú pháp chuẩn n8n dành cho 5. TẮT Trong Ngày (AI Agent format)
                let itemsText = '';
                if (Array.isArray(results) && results.length > 0) {
                    itemsText = results.map((item, idx) => {
                        return `${idx + 1}. Tên chiến dịch: ${item.campaign_name}\nChi tiêu: ${fmtVND(item.spend)} VNĐ\nTrạng thái: PAUSED\nLý do tắt: ${item.reason}`;
                    }).join('\n\n');
                }
                message = `❌❌❌ TẮT CHIẾN DỊCH Tài khoản ${config.account_name || 'TUẤN HÂN 004'} - ĐỒNG PHỤC HV\n\n${itemsText}\n\n❌❌❌ Tổng số lượng CHIẾN DỊCH TẮT : ${disabledCount}`;
            } else {
                // Cú pháp chuẩn dành cho TẮT CHIẾN DỊCH KHÔNG RA TIN NHẮN / CPA CAO
                message = `⛔ ⛔ ⛔ TẮT CHIẾN DỊCH KHÔNG RA TIN NHẮN / CPA CAO : Tài khoản ${config.account_name || 'TUẤN HÂN 004'} - ĐỒNG PHỤC HV\nTime Tắt : ${timeStr12h}\n\n⛔ ⛔ ⛔ Tổng số lượng CHIẾN DỊCH TẮT : ${disabledCount}`;
            }

            // 1. Trực tiếp gọi Zalo Bot API
            if (zaloToken && zaloUserId) {
                const directUrl = `https://bot-api.zaloplatforms.com/bot${zaloToken}/sendMessage`;
                await fetch(directUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: zaloUserId, text: message })
                });
                console.log(`[AutoDisable Zalo Bot] ✅ Đã gửi thông báo Zalo TẮT ${disabledCount} chiến dịch (${config.account_name})`);
            }

            // 2. Webhook
            if (webhookUrl) {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, config, disabledCount, skippedCount, results, batchId })
                }).catch(e => console.error('[AutoDisable Zalo Webhook Error]', e.message));
            }
        } catch (e) {
            console.error('[AutoDisable Zalo Error]', e.message);
        }
    }

    // ========== CRON JOB: Tự động TẮT CHIẾN DỊCH (mỗi 60s) ==========
    function startAutoDisableCron() {
        setInterval(async () => {
            try {
                const vn = getVietnamNow();
                const currentTime = vn.timeStr; // "HH:MM"
                const currentDay = String(vn.dayOfWeek); // 0=CN, 1=T2, ... 6=T7

                const activeConfigs = await db.all(`
                    SELECT c.*, a.account_name, a.fb_ad_account_id, a.fb_access_token
                    FROM ads_auto_disable_configs c
                    JOIN ads_stats_accounts a ON a.id = c.account_id
                    WHERE c.is_active = true
                `);

                for (const config of activeConfigs) {
                    // Kiểm tra ngày áp dụng
                    const daysArr = (config.days || '').split(',').map(d => d.trim());
                    if (!daysArr.includes(currentDay)) continue;

                    if (config.disable_type === 'daily') {
                        // TẮT Trong Ngày (Quét theo chu kỳ phút)
                        const startTimeStr = String(config.start_time || '00:00').slice(0, 5);
                        const endTimeStr = String(config.end_time || '23:59').slice(0, 5);

                        // Kiểm tra khoảng thời gian trong ngày
                        if (currentTime < startTimeStr || currentTime > endTimeStr) continue;

                        // Kiểm tra khoảng thời gian từ lần chạy cuối
                        const intervalMin = parseInt(config.interval_minutes) || 3;
                        if (config.last_executed_at) {
                            const diffMs = Date.now() - new Date(config.last_executed_at).getTime();
                            if (diffMs < (intervalMin * 60 * 1000 - 10000)) continue; // Trừ 10s buffer
                        }

                        console.log(`[AutoDisable CRON] 🔄 TẮT TRONG NGÀY (${intervalMin}p/lần): ${config.config_name} | ${config.account_name} | ${currentTime}`);
                        await executeAutoDisable(config);
                    } else {
                        // TẮT Full hoặc Tắt Không Mess (Chạy đúng mốc trigger_time HH:MM)
                        const triggerTimeStr = String(config.trigger_time || '23:30').slice(0, 5);
                        if (triggerTimeStr !== currentTime) continue;

                        // Tránh chạy lại trong 90s
                        if (config.last_executed_at) {
                            const diffMs = Date.now() - new Date(config.last_executed_at).getTime();
                            if (diffMs < 90 * 1000) continue;
                        }

                        console.log(`[AutoDisable CRON] ⛔ TẮT CHIẾN DỊCH (${config.disable_type}): ${config.config_name} | ${config.account_name} | ${currentTime}`);
                        await executeAutoDisable(config);
                    }
                }
            } catch (e) {
                console.error('[AutoDisable CRON Error]', e.message);
            }
        }, 60 * 1000); // Quét mỗi 60 giây

        console.log('[AutoDisable CRON] ✅ Đã khởi động cron TẮT CHIẾN DỊCH (mỗi 60s, múi giờ VN UTC+7)');
    }

    startAutoDisableCron();

    // ========== CORE: Thực thi BẬT CHIẾN DỊCH (Hỗ trợ cả Full & Trong Ngày) ==========
    async function executeAutoEnable(config) {
        const rawId = (config.fb_ad_account_id || '').replace(/^act_/, '');
        const token = config.fb_access_token;
        if (!rawId || !token) {
            return { success: false, error: 'Thiếu Ad Account ID hoặc Access Token', enabled: 0, skipped: 0 };
        }

        const batchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const cpaThreshold = parseFloat(config.cpa_threshold) || 75000;
        const spendMin = parseFloat(config.spend_min) || 1;
        const spendMax = parseFloat(config.spend_max) || 60000000;
        const targetActionType = (config.action_type || 'onsite_conversion.messaging_conversation_started_7d')
            .replace('messaging_conversion_started_7d', 'messaging_conversation_started_7d');
        const datePreset = config.date_preset || (config.config_type === 'daily' ? 'today' : 'maximum');

        let enabledCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const results = [];

        try {
            // 1. Lấy dữ liệu campaigns từ Facebook với date_preset linh hoạt ('today' hoặc 'maximum')
            const insightsUrl = `https://graph.facebook.com/v24.0/act_${rawId}/insights?level=campaign&fields=campaign_id,campaign_name,spend,actions&action_breakdowns=['action_type']&date_preset=${datePreset}&limit=1000&access_token=${encodeURIComponent(token)}`;
            const insightsRes = await fetch(insightsUrl);
            const insightsData = await insightsRes.json();

            if (insightsData.error) {
                return { success: false, error: `Facebook API Error: ${insightsData.error.message}`, enabled: 0, skipped: 0 };
            }

            const campaigns = insightsData.data || [];

            for (const camp of campaigns) {
                const spend = parseFloat(camp.spend || 0);

                // 2. Lọc theo ngưỡng chi tiêu
                if (spend < spendMin || spend > spendMax) continue;

                // 3. Tính CPA
                const actions = camp.actions || [];
                let totalActions = 0;
                for (const action of actions) {
                    if (action.action_type === targetActionType || action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        totalActions = parseInt(action.value || 0, 10);
                        break;
                    }
                }
                if (totalActions === 0) {
                    for (const action of actions) {
                        if (action.action_type === 'onsite_conversion.total_messaging_connection') {
                            totalActions = parseInt(action.value || 0, 10);
                            break;
                        }
                    }
                }

                // Chỉ bật khi có ít nhất 1 tin nhắn (totalActions > 0)
                if (totalActions <= 0) {
                    skippedCount++;
                    continue;
                }

                const cpa = spend / totalActions;

                // 4. Kiểm tra CPA <= ngưỡng
                if (cpa > cpaThreshold) {
                    skippedCount++;
                    continue;
                }

                // 5. Lấy status hiện tại của campaign
                try {
                    const statusUrl = `https://graph.facebook.com/v24.0/${camp.campaign_id}?fields=status&access_token=${encodeURIComponent(token)}`;
                    const statusRes = await fetch(statusUrl);
                    const statusData = await statusRes.json();

                    if (statusData.status === 'PAUSED') {
                        // 6. BẬT campaign
                        const enableRes = await fetch(`https://graph.facebook.com/v24.0/${camp.campaign_id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: `status=ACTIVE&access_token=${encodeURIComponent(token)}`
                        });
                        const enableData = await enableRes.json();

                        if (enableData.success) {
                            enabledCount++;
                            const presetTag = datePreset === 'today' ? '[Trong Ngày]' : '[Full]';
                            const reason = `${presetTag} CPA = ${fmtVND(cpa)}đ < ${fmtVND(cpaThreshold)}đ | Chi tiêu: ${fmtVND(spend)}đ | Tin nhắn: ${totalActions}`;
                            results.push({ campaign_id: camp.campaign_id, campaign_name: camp.campaign_name, action: 'enabled', cpa, spend, totalActions, reason });

                            await db.run(`
                                INSERT INTO ads_auto_enable_logs (config_id, account_id, account_name, campaign_id, campaign_name, action_taken, cpa_value, spend_value, total_actions, reason, batch_id)
                                VALUES ($1, $2, $3, $4, $5, 'enabled', $6, $7, $8, $9, $10)
                            `, [config.id, config.account_id, config.account_name, camp.campaign_id, camp.campaign_name, cpa, spend, totalActions, reason, batchId]);
                        } else {
                            errorCount++;
                            const errReason = `FB API Error: ${JSON.stringify(enableData)}`;
                            await db.run(`
                                INSERT INTO ads_auto_enable_logs (config_id, account_id, account_name, campaign_id, campaign_name, action_taken, cpa_value, spend_value, total_actions, reason, batch_id)
                                VALUES ($1, $2, $3, $4, $5, 'error', $6, $7, $8, $9, $10)
                            `, [config.id, config.account_id, config.account_name, camp.campaign_id, camp.campaign_name, cpa, spend, totalActions, errReason, batchId]);
                        }
                    } else if (statusData.status === 'ACTIVE') {
                        skippedCount++;
                        await db.run(`
                            INSERT INTO ads_auto_enable_logs (config_id, account_id, account_name, campaign_id, campaign_name, action_taken, cpa_value, spend_value, total_actions, reason, batch_id)
                            VALUES ($1, $2, $3, $4, $5, 'skipped_active', $6, $7, $8, $9, $10)
                        `, [config.id, config.account_id, config.account_name, camp.campaign_id, camp.campaign_name || '', cpa, spend, totalActions, 'Chiến dịch đang ACTIVE, không cần bật', batchId]);
                    } else {
                        skippedCount++;
                        await db.run(`
                            INSERT INTO ads_auto_enable_logs (config_id, account_id, account_name, campaign_id, campaign_name, action_taken, cpa_value, spend_value, total_actions, reason, batch_id)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        `, [config.id, config.account_id, config.account_name, camp.campaign_id, camp.campaign_name || '', `skipped_${(statusData.status || 'unknown').toLowerCase()}`, cpa, spend, totalActions, `Chiến dịch đang ${statusData.status || 'UNKNOWN'}`, batchId]);
                    }
                } catch (campErr) {
                    errorCount++;
                    console.error(`[AutoEnable] Error processing campaign ${camp.campaign_id}:`, campErr.message);
                }
            }

            // Update last_executed_at
            await db.run(`UPDATE ads_auto_enable_configs SET last_executed_at = NOW() WHERE id = $1`, [config.id]);

            // Gửi thông báo Zalo nếu có chiến dịch được BẬT
            if (enabledCount > 0) {
                await sendAutoEnableZaloNotification(config, enabledCount, skippedCount, results, batchId);
            }

            return {
                success: true,
                enabled: enabledCount,
                skipped: skippedCount,
                errors: errorCount,
                batch_id: batchId,
                message: `Đã BẬT ${enabledCount} chiến dịch, bỏ qua ${skippedCount}, lỗi ${errorCount}`,
                results
            };
        } catch (e) {
            console.error('[AutoEnable executeAutoEnable]', e);
            return { success: false, error: e.message, enabled: 0, skipped: 0 };
        }
    }

    // ========== HELPER: Gửi thông báo Zalo sau khi BẬT ==========
    async function sendAutoEnableZaloNotification(config, enabledCount, skippedCount, results, batchId) {
        try {
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

            if (!zaloToken && !zaloUserId && !webhookUrl) return;

            const now = new Date();
            const timeStr12h = now.toLocaleTimeString('en-US', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            }).toLowerCase();

            let message = '';
            if (config.config_type === 'full') {
                // Cú pháp chuẩn 100% theo Ảnh 1 dành cho BẬT Full Chiến Dịch
                message = `🎉 🎉 🎉 Tài khoản ${config.account_name || 'TUẤN HÂN 004'} - ĐỒNG PHỤC HV\nTime bật : ${timeStr12h}\n\n🎯 🎯 🎯 TỔNG SỐ CHIẾN DỊCH BẬT : ${enabledCount}`;
            } else {
                const vn = getVietnamNow();
                const dayNames = ['CHỦ NHẬT', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'];
                const dayName = dayNames[vn.dayOfWeek] || '';
                let campaignList = '';
                for (const r of results.slice(0, 10)) {
                    campaignList += `\n✅ ${r.campaign_name} | CPA: ${fmtVND(r.cpa)}đ | Spend: ${fmtVND(r.spend)}đ | TN: ${r.totalActions}`;
                }
                if (results.length > 10) {
                    campaignList += `\n... và ${results.length - 10} chiến dịch khác`;
                }
                message = `💚 BẬT CHIẾN DỊCH TRONG NGÀY\n\n📅 ${dayName} - ${vn.timeStr}\n📊 Tài khoản: ${config.account_name}\n⚙️ Cấu hình: ${config.config_name}\n\n🎯 TỔNG SỐ CHIẾN DỊCH BẬT: ${enabledCount}\n📌 Bỏ qua: ${skippedCount}\n\n💰 Ngưỡng CPA: < ${fmtVND(config.cpa_threshold)}đ\n💵 Chi tiêu: ${fmtVND(config.spend_min)}đ → ${fmtVND(config.spend_max)}đ\n${campaignList}`;
            }

            // 1. Trực tiếp gọi Zalo Bot API
            if (zaloToken && zaloUserId) {
                const directUrl = `https://bot-api.zaloplatforms.com/bot${zaloToken}/sendMessage`;
                await fetch(directUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: zaloUserId, text: message })
                });
                console.log(`[AutoEnable Zalo Bot] ✅ Đã gửi thông báo Zalo BẬT ${enabledCount} chiến dịch (${config.account_name})`);
            }

            // 2. Trực tiếp đẩy Webhook nếu có
            if (webhookUrl) {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, config, enabledCount, skippedCount, results, batchId })
                }).catch(e => console.error('[AutoEnable Zalo Webhook Error]', e.message));
            }
        } catch (e) {
            console.error('[AutoEnable Zalo Error]', e.message);
        }
    }

    // ========== CRON JOB: Tự động BẬT CHIẾN DỊCH (mỗi 60s) ==========
    function startAutoEnableCron() {
        setInterval(async () => {
            try {
                // 0. Auto-Resume check cho các tài khoản hết hạn tạm dừng BẬT Trong Ngày
                try {
                    const pausedAccounts = await db.all(`
                        SELECT id, account_name, daily_enable_paused_until
                        FROM ads_stats_accounts
                        WHERE daily_enable_paused_until IS NOT NULL
                    `);

                    for (const acc of pausedAccounts) {
                        if (new Date() >= new Date(acc.daily_enable_paused_until)) {
                            console.log(`[AutoEnable CRON] ⏰ Hết thời hạn tạm dừng BẬT Trong Ngày cho tài khoản ${acc.account_name}. Tự động KHÔI PHỤC!`);
                            await db.run(`
                                UPDATE ads_stats_accounts
                                SET daily_enable_paused_until = NULL, daily_enable_pause_reason = NULL
                                WHERE id = $1
                            `, [acc.id]);
                            
                            await db.run(`
                                UPDATE ads_auto_enable_configs
                                SET is_active = true
                                WHERE account_id = $1 AND config_type = 'daily'
                            `, [acc.id]);
                        }
                    }
                } catch (pErr) { console.error('[AutoEnable CRON Resume Error]', pErr.message); }

                const vn = getVietnamNow();
                const currentTime = vn.timeStr; // "HH:MM"
                const currentMinutes = vn.timeNum; // Phút trong ngày (0 -> 1439)
                const currentDay = String(vn.dayOfWeek); // 0=CN, 1=T2, ... 6=T7

                const activeConfigs = await db.all(`
                    SELECT c.*, a.account_name, a.fb_ad_account_id, a.fb_access_token, a.daily_enable_paused_until
                    FROM ads_auto_enable_configs c
                    JOIN ads_stats_accounts a ON a.id = c.account_id
                    WHERE c.is_active = true
                `);

                for (const config of activeConfigs) {
                    // 1. Kiểm tra ngày áp dụng
                    const daysArr = (config.days || '').split(',').map(d => d.trim());
                    if (!daysArr.includes(currentDay)) continue;

                    const cfgType = config.config_type || 'full';

                    if (cfgType === 'full') {
                        // LOẠI 1: BẬT Full — Chạy đúng mốc trigger_time (HH:MM)
                        const triggerTimeStr = String(config.trigger_time || '03:00').slice(0, 5);
                        if (triggerTimeStr !== currentTime) continue;

                        // Tránh chạy lại trong 90s
                        if (config.last_executed_at) {
                            const diffMs = Date.now() - new Date(config.last_executed_at).getTime();
                            if (diffMs < 90 * 1000) continue;
                        }

                        console.log(`[AutoEnable CRON] ⚡ BẬT FULL: ${config.config_name} | ${config.account_name} | ${currentTime}`);
                        await executeAutoEnable(config);

                    } else if (cfgType === 'daily') {
                        // Nếu tài khoản đang bị tạm dừng BẬT Trong Ngày -> Bỏ qua!
                        if (config.daily_enable_paused_until && new Date() < new Date(config.daily_enable_paused_until)) {
                            continue;
                        }
                        // LOẠI 2: BẬT Trong Ngày — Quét lặp lại X phút/lần trong khung giờ [start_time, end_time]
                        const startMin = parseTimeToMinutes(config.start_time || '08:00');
                        const endMin = parseTimeToMinutes(config.end_time || '18:00');

                        // Kiểm tra thời gian hiện tại nằm trong khung giờ [start_time, end_time]
                        if (currentMinutes < startMin || currentMinutes > endMin) continue;

                        // Kiểm tra chu kỳ lặp lại X phút
                        const intervalMins = parseInt(config.interval_minutes) || 3;
                        if (config.last_executed_at) {
                            const diffMs = Date.now() - new Date(config.last_executed_at).getTime();
                            const requiredMs = (intervalMins * 60 - 15) * 1000; // Trừ buffer 15s cho chuẩn
                            if (diffMs < requiredMs) continue;
                        }

                        console.log(`[AutoEnable CRON] 🔄 BẬT TRONG NGÀY: ${config.config_name} | ${config.account_name} | Khung giờ: ${config.start_time}-${config.end_time} | Quét ${intervalMins}p/lần`);
                        await executeAutoEnable(config);
                    }
                }
            } catch (e) {
                console.error('[AutoEnable CRON Error]', e.message);
            }
        }, 60 * 1000); // Quét mỗi 60 giây

        console.log('[AutoEnable CRON] ✅ Đã khởi động cron BẬT FULL & BẬT TRONG NGÀY (mỗi 60s, múi giờ VN UTC+7)');
    }

    startAutoEnableCron();

    // ========== PAGE ROUTES ==========
    fastify.get('/gioihanchitieu', async (req, reply) => {
        return reply.sendFile('dashboard.html');
    });

    fastify.get('/tatbatfbads', async (req, reply) => {
        return reply.sendFile('dashboard.html');
    });
    fastify.get('/m/tatbatfbads', async (req, reply) => {
        return reply.sendFile('mobile-tatbatfbads.html');
    });

    fastify.get('/hengiobatcamp', async (req, reply) => {
        return reply.sendFile('dashboard.html');
    });
    fastify.get('/m/hengiobatcamp', async (req, reply) => {
        return reply.sendFile('mobile-hengiobatcamp.html');
    });

};
