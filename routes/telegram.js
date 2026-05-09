// ========== TELEGRAM SETTINGS ROUTES ==========
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { TELEGRAM_EVENTS, sendTelegramMessage, getBotToken, clearTokenCache } = require('../utils/telegram');

async function telegramRoutes(fastify, options) {
    // ===== Migration: Create telegram_notifications table =====
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS telegram_notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            event_type VARCHAR(50) NOT NULL,
            chat_id VARCHAR(100) NOT NULL,
            enabled BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, event_type)
        )`);
    } catch (e) { /* already exists */ }

    // ===== GET /api/telegram/events — Danh sách event types =====
    fastify.get('/api/telegram/events', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        return { events: TELEGRAM_EVENTS };
    });

    // ===== GET /api/telegram/config — Bot Token + Global Groups =====
    fastify.get('/api/telegram/config', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        // Bot token
        const tokenRow = await db.get("SELECT value FROM app_config WHERE key = 'telegram_bot_token'");
        const botToken = tokenRow?.value || '';

        // All global event configs
        const globalEvents = TELEGRAM_EVENTS.filter(e => e.scope === 'global');
        const globalConfigs = {};
        for (const evt of globalEvents) {
            const row = await db.get("SELECT value FROM app_config WHERE key = $1", [`tg_global_${evt.key}`]);
            globalConfigs[evt.key] = row?.value || '';
        }

        return {
            bot_token: botToken,
            global_configs: globalConfigs,
            events: TELEGRAM_EVENTS
        };
    });

    // ===== PUT /api/telegram/config — Lưu Bot Token + Global Groups =====
    fastify.put('/api/telegram/config', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { bot_token, global_configs } = request.body || {};

        // Save bot token
        if (bot_token !== undefined) {
            await db.run(
                `INSERT INTO app_config (key, value, updated_at) VALUES ('telegram_bot_token', $1, NOW())
                 ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
                [bot_token.trim()]
            );
            clearTokenCache();
        }

        // Save global group configs
        if (global_configs && typeof global_configs === 'object') {
            const globalEvents = TELEGRAM_EVENTS.filter(e => e.scope === 'global');
            for (const evt of globalEvents) {
                const chatId = (global_configs[evt.key] || '').trim();
                const configKey = `tg_global_${evt.key}`;
                await db.run(
                    `INSERT INTO app_config (key, value, updated_at) VALUES ($1, $2, NOW())
                     ON CONFLICT(key) DO UPDATE SET value = $2, updated_at = NOW()`,
                    [configKey, chatId]
                );
            }
        }

        return { success: true, message: 'Đã lưu cấu hình Telegram!' };
    });

    // ===== POST /api/telegram/test — Test gửi tin nhắn =====
    fastify.post('/api/telegram/test', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { chat_id, bot_token } = request.body || {};
        if (!chat_id) return reply.code(400).send({ error: 'Vui lòng nhập Chat ID' });

        const token = bot_token?.trim() || await getBotToken();
        if (!token) return reply.code(400).send({ error: 'Chưa cấu hình Bot Token' });

        const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const testMsg = `🧪 <b>Tin nhắn test từ Đồng Phục HV CRM</b>\n\n✅ Bot hoạt động bình thường!\n📆 Thời gian: ${now}\n👤 Người test: ${request.user.full_name}`;

        const ok = await sendTelegramMessage(chat_id.trim(), testMsg, token);
        if (ok) {
            return { success: true, message: 'Gửi test thành công! Kiểm tra nhóm Telegram.' };
        } else {
            return reply.code(400).send({ error: 'Gửi thất bại! Kiểm tra lại Bot Token và Chat ID.' });
        }
    });

    // ===== GET /api/telegram/staff — Danh sách NV nội bộ + số event đã cài =====
    fastify.get('/api/telegram/staff', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const perStaffEvents = TELEGRAM_EVENTS.filter(e => e.scope === 'per_staff');
        const totalPerStaff = perStaffEvents.length;

        const staff = await db.all(`
            SELECT u.id, u.full_name, u.username, u.role, u.status,
                   d.name as department_name,
                   u.telegram_group_id as legacy_group_id,
                   COALESCE(tn.configured_count, 0) as configured_count
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN (
                SELECT user_id, COUNT(*) as configured_count
                FROM telegram_notifications
                WHERE enabled = true AND chat_id != ''
                GROUP BY user_id
            ) tn ON tn.user_id = u.id
            WHERE u.role NOT IN ('tkaffiliate', 'hoa_hong')
            AND u.status = 'active'
            ORDER BY d.name NULLS LAST, u.full_name
        `);

        return { staff, total_per_staff_events: totalPerStaff };
    });

    // ===== GET /api/telegram/staff/:id — Chi tiết per-staff events của 1 NV =====
    fastify.get('/api/telegram/staff/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const userId = Number(request.params.id);
        const user = await db.get('SELECT id, full_name, username, telegram_group_id FROM users WHERE id = $1', [userId]);
        if (!user) return reply.code(404).send({ error: 'Không tìm thấy nhân viên' });

        const perStaffEvents = TELEGRAM_EVENTS.filter(e => e.scope === 'per_staff');
        const notifications = await db.all(
            'SELECT event_type, chat_id, enabled FROM telegram_notifications WHERE user_id = $1',
            [userId]
        );

        // Build config map
        const configMap = {};
        for (const evt of perStaffEvents) {
            const existing = notifications.find(n => n.event_type === evt.key);
            configMap[evt.key] = {
                chat_id: existing?.chat_id || '',
                enabled: existing ? existing.enabled : true
            };
        }

        return {
            user: { id: user.id, full_name: user.full_name, username: user.username },
            legacy_group_id: user.telegram_group_id || '',
            events: perStaffEvents,
            configs: configMap
        };
    });

    // ===== PUT /api/telegram/staff/:id — Lưu per-staff events cho 1 NV =====
    fastify.put('/api/telegram/staff/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const userId = Number(request.params.id);
        const user = await db.get('SELECT id FROM users WHERE id = $1', [userId]);
        if (!user) return reply.code(404).send({ error: 'Không tìm thấy nhân viên' });

        const { configs } = request.body || {};
        if (!configs || typeof configs !== 'object') {
            return reply.code(400).send({ error: 'Dữ liệu không hợp lệ' });
        }

        const perStaffKeys = TELEGRAM_EVENTS.filter(e => e.scope === 'per_staff').map(e => e.key);
        let savedCount = 0;

        for (const [eventType, config] of Object.entries(configs)) {
            if (!perStaffKeys.includes(eventType)) continue;
            const chatId = (config.chat_id || '').trim();
            const enabled = config.enabled !== false;

            if (!chatId) {
                // Remove if empty
                await db.run('DELETE FROM telegram_notifications WHERE user_id = $1 AND event_type = $2', [userId, eventType]);
            } else {
                // Upsert
                await db.run(
                    `INSERT INTO telegram_notifications (user_id, event_type, chat_id, enabled, updated_at)
                     VALUES ($1, $2, $3, $4, NOW())
                     ON CONFLICT(user_id, event_type) DO UPDATE SET chat_id = $3, enabled = $4, updated_at = NOW()`,
                    [userId, eventType, chatId, enabled]
                );
                savedCount++;
            }
        }

        return { success: true, message: `Đã lưu ${savedCount} cài đặt Telegram cho nhân viên!` };
    });

    // ===== PUT /api/telegram/staff-bulk — Gán nhanh 1 group cho nhiều NV =====
    fastify.put('/api/telegram/staff-bulk', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { event_type, chat_id, user_ids } = request.body || {};
        if (!event_type || !chat_id) return reply.code(400).send({ error: 'Thiếu event_type hoặc chat_id' });

        const perStaffKeys = TELEGRAM_EVENTS.filter(e => e.scope === 'per_staff').map(e => e.key);
        if (!perStaffKeys.includes(event_type)) return reply.code(400).send({ error: 'Event type không hợp lệ' });

        // Nếu không chỉ định user_ids → lấy tất cả NV active nội bộ
        let targetUserIds = user_ids;
        if (!targetUserIds || targetUserIds.length === 0) {
            const users = await db.all("SELECT id FROM users WHERE role NOT IN ('tkaffiliate', 'hoa_hong') AND status = 'active'");
            targetUserIds = users.map(u => u.id);
        }

        let count = 0;
        for (const uid of targetUserIds) {
            await db.run(
                `INSERT INTO telegram_notifications (user_id, event_type, chat_id, enabled, updated_at)
                 VALUES ($1, $2, $3, true, NOW())
                 ON CONFLICT(user_id, event_type) DO UPDATE SET chat_id = $3, enabled = true, updated_at = NOW()`,
                [uid, event_type, chat_id.trim()]
            );
            count++;
        }

        return { success: true, message: `Đã gán nhóm Telegram cho ${count} nhân viên!` };
    });
}

module.exports = telegramRoutes;
