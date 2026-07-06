// ========== TELEGRAM SETTINGS ROUTES ==========
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { TELEGRAM_EVENTS, sendTelegramMessage, getBotToken, clearTokenCache, sendTelegramReply, setTelegramWebhook } = require('../utils/telegram');
const { getNextFollowUpDate } = require('../utils/workingDay');

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

    // Auto register webhook on startup
    getBotToken().then(token => {
        if (token) {
            setTelegramWebhook(token).catch(err => console.error('[Telegram Webhook Auto-Reg] Error:', err.message));
        }
    });

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
            const trimmedToken = bot_token.trim();
            await db.run(
                `INSERT INTO app_config (key, value, updated_at) VALUES ('telegram_bot_token', $1, NOW())
                 ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
                [trimmedToken]
            );
            clearTokenCache();
            // Trigger webhook set
            if (trimmedToken) {
                await setTelegramWebhook(trimmedToken).catch(err => console.error('[Telegram Webhook Save] Error:', err.message));
            }
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

    // ===== POST /api/webhooks/telegram — Telegram Webhook Interceptor =====
    fastify.post('/api/webhooks/telegram', async (request, reply) => {
        try {
            console.log('[Telegram Webhook Received]:', JSON.stringify(request.body));
            const { message } = request.body || {};
            if (!message) {
                return reply.code(200).send({ ok: true });
            }

            const text = (message.text || '').trim();
            const lowerText = text.toLowerCase();

            // Handle global duty toggle command /t or /b
            if (lowerText === '/t' || lowerText === '/b') {
                const isTurnOff = lowerText === '/t';
                const chatIdStr = String(message.chat.id);
                
                // 1. Find user by group ID
                let targetUser = null;
                const userRow = await db.get(`SELECT id, full_name, role FROM users WHERE telegram_group_id = $1 LIMIT 1`, [chatIdStr]);
                if (userRow) {
                    targetUser = userRow;
                } else {
                    const notificationRow = await db.get(
                        `SELECT user_id FROM telegram_notifications WHERE chat_id = $1 AND enabled = true LIMIT 1`,
                        [chatIdStr]
                    );
                    if (notificationRow) {
                        const uRow = await db.get(`SELECT id, full_name, role FROM users WHERE id = $1 LIMIT 1`, [notificationRow.user_id]);
                        if (uRow) targetUser = uRow;
                    }
                }

                if (!targetUser) {
                    await sendTelegramReply(
                        message.chat.id,
                        `⚠️ <b>Lỗi:</b> Nhóm chat này chưa được liên kết với tài khoản nhân viên nào trên CRM!`,
                        message.message_id
                    );
                    return reply.code(200).send({ ok: true });
                }

                const userId = targetUser.id;
                const userIdStr = String(userId);

                // 2. Fetch pancake_settings
                const configRow = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
                let pancakeConfig = {};
                if (configRow?.value) {
                    try {
                        pancakeConfig = JSON.parse(configRow.value);
                    } catch (e) {
                        pancakeConfig = {};
                    }
                }

                // 3. Determine Vietnam date and day of week
                const vnTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
                const vnNow = new Date(vnTimeStr);
                const dayOfWeek = vnNow.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7

                const y = vnNow.getFullYear();
                const m = String(vnNow.getMonth() + 1).padStart(2, '0');
                const day = String(vnNow.getDate()).padStart(2, '0');
                const vnDateStr = `${y}-${m}-${day}`;

                const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const dayLabel = dayLabels[dayOfWeek];

                let actionSuccess = false;

                if (dayOfWeek === 0) {
                    // Sunday
                    pancakeConfig.sunday_duty_schedule = pancakeConfig.sunday_duty_schedule || {};
                    let sundayList = pancakeConfig.sunday_duty_schedule[vnDateStr] || [];
                    
                    // Normalize all items to numbers
                    sundayList = sundayList.map(Number);
                    
                    if (isTurnOff) {
                        pancakeConfig.sunday_duty_schedule[vnDateStr] = sundayList.filter(id => id !== userId);
                    } else {
                        if (!sundayList.includes(userId)) {
                            sundayList.push(userId);
                        }
                        pancakeConfig.sunday_duty_schedule[vnDateStr] = sundayList;
                    }
                    actionSuccess = true;
                } else {
                    // Monday - Saturday
                    pancakeConfig.global_working_days = pancakeConfig.global_working_days || {};
                    let currentDays = pancakeConfig.global_working_days[userIdStr];
                    if (currentDays === undefined) {
                        currentDays = [1, 2, 3, 4, 5, 6];
                    }
                    currentDays = currentDays.map(Number);

                    if (isTurnOff) {
                        pancakeConfig.global_working_days[userIdStr] = currentDays.filter(d => d !== dayOfWeek);
                    } else {
                        if (!currentDays.includes(dayOfWeek)) {
                            currentDays.push(dayOfWeek);
                        }
                        pancakeConfig.global_working_days[userIdStr] = currentDays.sort((a, b) => a - b);
                    }
                    actionSuccess = true;
                }

                if (actionSuccess) {
                    // Save to DB
                    await db.run(
                        `INSERT INTO app_config (key, value, updated_at) VALUES ('pancake_settings', $1, NOW())
                         ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
                        [JSON.stringify(pancakeConfig)]
                    );

                    // Clear Settings Cache
                    const settingsRoutes = require('./settings');
                    if (settingsRoutes && settingsRoutes.appConfigCache) {
                        settingsRoutes.appConfigCache.delete('pancake_settings');
                    }

                    // Reply status
                    const statusEmoji = isTurnOff ? '🔴' : '🟢';
                    const statusText = isTurnOff ? 'TẮT' : 'BẬT';
                    const detailText = isTurnOff 
                        ? `đã được <b>TẮT nhận số</b> ngày hôm nay (${dayLabel} - ${vnDateStr.split('-').reverse().join('/')}).` 
                        : `đã được <b>BẬT nhận số</b> ngày hôm nay (${dayLabel} - ${vnDateStr.split('-').reverse().join('/')}).`;

                    const confirmMsg = `${statusEmoji} <b>Cập nhật lịch trực toàn cục thành công!</b>\n` +
                                       `👤 Nhân viên: <code>${targetUser.full_name}</code>\n` +
                                       `📅 Lịch hôm nay: <b>${statusText}</b>\n` +
                                       `💻 Hệ thống: Sale ${targetUser.full_name} ${detailText}`;
                    
                    await sendTelegramReply(message.chat.id, confirmMsg, message.message_id);
                    return reply.code(200).send({ ok: true });
                }
            }

            // Detect payment code reply with "cọc" keyword
            if (message.reply_to_message) {
                const replyText = message.reply_to_message.text || message.reply_to_message.caption || '';
                const codeRegex = /\b(CK\d+-\d+-\d+(?:-Y\d+)?)\b/i;
                const match = replyText.match(codeRegex);
                
                if (match && lowerText.includes('cọc')) {
                    const paymentCode = match[1].toUpperCase();
                    const pr = await db.get('SELECT id, total_order_codes, order_tt_coc FROM payment_records WHERE UPPER(payment_code) = $1', [paymentCode]);
                    if (pr) {
                        const sender = message.from 
                            ? (message.from.username 
                                ? '@' + message.from.username 
                                : [message.from.first_name, message.from.last_name].filter(Boolean).join(' ')) 
                            : 'Telegram User';
                            
                        await db.run(`
                            UPDATE payment_records 
                            SET telegram_deposit_confirmed = true,
                                telegram_deposit_confirmed_by = $1,
                                telegram_deposit_confirmed_at = NOW()
                            WHERE id = $2
                        `, [sender, pr.id]);
                        
                        let extraMsg = '';
                        if (pr.total_order_codes || pr.order_tt_coc) {
                            extraMsg = `\n⚠️ <i>Lưu ý: Mã tiền này đã được liên kết với đơn hàng trước đó.</i>`;
                        }
                        
                        await sendTelegramReply(
                            message.chat.id,
                            `✅ <b>Xác thực tiền cọc thành công!</b>\nMã tiền <code>${paymentCode}</code> đã được mở hiển thị trên CRM khi kinh doanh chọn ghi nhận cọc.\n👤 Nhân viên: ${sender}${extraMsg}`,
                            message.message_id
                        );
                        return reply.code(200).send({ ok: true });
                    }
                }
            }

            // Detect command prefix ";"
            if (!text.startsWith(';')) {
                return reply.code(200).send({ ok: true });
            }

            // Extract consultation content
            const consultContent = text.slice(1).trim();

            // Validate that we have a reply target
            if (!message.reply_to_message) {
                await sendTelegramReply(
                    message.chat.id,
                    `⚠️ <b>Lỗi:</b> Bạn phải trả lời (Reply) trực tiếp vào tin nhắn chuyển số hoặc nhắc nhở số để cập nhật tư vấn!`,
                    message.message_id
                );
                return reply.code(200).send({ ok: true });
            }

            // Get replied message text or caption
            const replyText = message.reply_to_message.text || message.reply_to_message.caption || '';
            
            // Regex to extract customer code: e.g. 1-6-7-Y26 or 1-6-7
            const codeRegex = /\b(\d+-\d+-\d+(?:-Y\d+)?)\b/;
            const match = replyText.match(codeRegex);

            if (!match) {
                await sendTelegramReply(
                    message.chat.id,
                    `⚠️ <b>Lỗi:</b> Không tìm thấy mã số khách hàng (dạng STT-ngày-tháng) trong tin nhắn được phản hồi!`,
                    message.message_id
                );
                return reply.code(200).send({ ok: true });
            }

            const rawCode = match[1];
            const parts = rawCode.split('-');
            const dailyOrderNum = parseInt(parts[0], 10);
            const day = parseInt(parts[1], 10);
            const month = parseInt(parts[2], 10);
            let year = new Date().getFullYear(); // default to current year
            if (parts[3] && parts[3].startsWith('Y')) {
                year = 2000 + parseInt(parts[3].slice(1), 10);
            }
            const effectiveDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Lookup customer matching the code
            const customers = await db.all(
                `SELECT * FROM customers WHERE daily_order_number = $1 AND effective_date = $2`,
                [dailyOrderNum, effectiveDateStr]
            );

            if (customers.length === 0) {
                await sendTelegramReply(
                    message.chat.id,
                    `⚠️ <b>Lỗi:</b> Không tìm thấy khách hàng nào có mã số <b>${rawCode}</b> vào ngày ${effectiveDateStr} trên CRM!`,
                    message.message_id
                );
                return reply.code(200).send({ ok: true });
            }

            let customer = null;
            if (customers.length === 1) {
                customer = customers[0];
            } else {
                // 1. Prioritize matching by customer name in the replied message text
                customer = customers.find(c => c.customer_name && replyText.toLowerCase().includes(c.customer_name.toLowerCase()));

                if (!customer) {
                    // 2. Fallback to assignee ID check from chat ID
                    const chatIdStr = String(message.chat.id);
                    let assigneeId = null;
                    const notificationRow = await db.get(
                        `SELECT user_id FROM telegram_notifications WHERE chat_id = $1 AND enabled = true LIMIT 1`,
                        [chatIdStr]
                    );
                    if (notificationRow) {
                        assigneeId = notificationRow.user_id;
                    } else {
                        const userRow = await db.get(`SELECT id FROM users WHERE telegram_group_id = $1 LIMIT 1`, [chatIdStr]);
                        if (userRow) assigneeId = userRow.id;
                    }

                    if (assigneeId) {
                        customer = customers.find(c => c.assigned_to_id === assigneeId);
                    }
                }

                if (!customer) {
                    // 3. Fallback matching by username or full name of staff in text
                    for (const cust of customers) {
                        const staff = await db.get(`SELECT username, full_name FROM users WHERE id = $1`, [cust.assigned_to_id]);
                        if (staff) {
                            const staffNameEscaped = staff.full_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                            const usernameEscaped = staff.username.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                            const nameRegex = new RegExp(`\\b(${staffNameEscaped}|${usernameEscaped})\\b`, 'i');
                            if (nameRegex.test(replyText)) {
                                customer = cust;
                                break;
                            }
                        }
                    }
                }
            }

            if (!customer) {
                await sendTelegramReply(
                    message.chat.id,
                    `⚠️ <b>Lỗi:</b> Phát hiện nhiều khách hàng trùng mã số <b>${rawCode}</b>. Không thể xác định chính xác khách hàng cho nhóm chat này!`,
                    message.message_id
                );
                return reply.code(200).send({ ok: true });
            }

            // Validate content
            if (!consultContent) {
                await sendTelegramReply(
                    message.chat.id,
                    `⚠️ <b>Lỗi:</b> Vui lòng nhập nội dung tư vấn sau dấu ";" (Ví dụ: <code>; đang tư vấn, hẹn ngày mai gọi lại</code>)`,
                    message.message_id
                );
                return reply.code(200).send({ ok: true });
            }

            // Calculate next appointment date (reschedule date)
            const nextFollowUp = await getNextFollowUpDate(new Date(), customer.assigned_to_id);

            // Perform DB updates in transaction
            await db.run('BEGIN TRANSACTION');
            try {
                // Insert consultation log
                await db.run(
                    `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) 
                     VALUES ($1, 'nhan_tin', $2, $3)`,
                    [customer.id, consultContent, customer.assigned_to_id]
                );

                // Update customer status & appointment date
                await db.run(
                    `UPDATE customers 
                     SET order_status = 'dang_tu_van', appointment_date = $1, updated_at = NOW() 
                     WHERE id = $2`,
                    [nextFollowUp, customer.id]
                );

                // Reset cancel requests if active or pending
                if (customer.cancel_requested === 1 || customer.cancel_approved !== 0) {
                    await db.run(
                        `UPDATE customers 
                         SET cancel_requested = 0, cancel_approved = 0, cancel_reason = NULL, 
                             cancel_requested_by = NULL, cancel_requested_at = NULL, 
                             cancel_approved_by = NULL, cancel_approved_at = NULL 
                         WHERE id = $1`,
                        [customer.id]
                    );
                }

                await db.run('COMMIT');
            } catch (dbErr) {
                await db.run('ROLLBACK');
                throw dbErr;
            }

            // Send confirmation reply
            const confirmMsg = `✅ <b>Đã ghi nhận tư vấn qua Telegram</b>\n` +
                               `👤 Khách: <code>${customer.customer_name}</code>\n` +
                               `📝 Nội dung: <i>${consultContent}</i>\n` +
                               `📅 Hẹn chăm lại: <b>${nextFollowUp}</b>\n` +
                               `💻 CRM: Trạng thái chuyển sang "Đang Tư Vấn" & được ghi nhận "Đã Xử Lý Hôm Nay".`;
            await sendTelegramReply(message.chat.id, confirmMsg, message.message_id);

        } catch (err) {
            console.error('[Telegram Webhook Error]:', err);
            // Reply with error if possible
            try {
                const { message } = request.body || {};
                if (message && message.chat && message.message_id) {
                    await sendTelegramReply(
                        message.chat.id,
                        `❌ <b>Lỗi Hệ Thống:</b> Không thể cập nhật tư vấn. Chi tiết: ${err.message}`,
                        message.message_id
                    );
                }
            } catch (tgErr) {
                console.error('[Telegram Webhook Error Feedback Fail]:', tgErr);
            }
        }

        return reply.code(200).send({ ok: true });
    });
}

module.exports = telegramRoutes;
