// ========== PANCAKE INTEGRATION ROUTES ==========
const db = require('../db/pool');
const { vnNow, vnDateStr, vnISOString } = require('../utils/timezone');
const { sendTelegramMessage } = require('../utils/telegram');
const { getNextWorkingDay } = require('../utils/workingDay');
const { nanoid } = require('nanoid');
const { authenticate } = require('../middleware/auth');

async function pancakeRoutes(fastify, options) {
    
    // ========== PUBLIC: Webhook receiver from Pancake ==========
    fastify.post('/api/webhooks/pancake', async (request, reply) => {
        const payload = request.body || {};
        console.log('[Pancake Webhook] Received payload:', JSON.stringify(payload));

        // Read configuration
        const configRow = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
        if (!configRow || !configRow.value) {
            console.log('[Pancake Webhook] No pancake settings found in app_config.');
            return { success: false, error: 'Pancake settings not found' };
        }

        let config;
        try {
            config = JSON.parse(configRow.value);
        } catch (e) {
            console.error('[Pancake Webhook] Invalid JSON in pancake_settings:', e.message);
            return { success: false, error: 'Invalid settings JSON' };
        }

        if (!config.is_active) {
            console.log('[Pancake Webhook] Pancake sync is globally disabled.');
            return { success: true, message: 'Sync is disabled' };
        }

        const events = Array.isArray(payload) ? payload : [payload];
        let processedCount = 0;
        let skippedCount = 0;

        for (const event of events) {
            const pageId = String(event.page_id || '');
            if (!pageId) {
                console.log('[Pancake Webhook] Skipped event without page_id');
                skippedCount++;
                continue;
            }

            // Find matching configured page
            const page = config.pages?.find(p => String(p.id) === pageId);
            if (!page || !page.is_active) {
                console.log(`[Pancake Webhook] Skipped: Page ${pageId} not found or inactive in settings.`);
                skippedCount++;
                continue;
            }

            // Extract phone number
            let phone = event.phone || event.phone_number || event.customer?.phone || '';
            if (!phone && event.message?.text) {
                // Try to parse phone number from text
                const match = event.message.text.match(/(0|\+84)\d{9}/);
                if (match) phone = match[0];
            }

            // Clean phone number format
            if (phone) {
                phone = phone.replace(/[\s\-\.]/g, '');
                if (phone.startsWith('+84')) {
                    phone = '0' + phone.substring(3);
                }
            }

            // If no phone number is found, we might still create lead or skip it.
            // Typically, CRM only creates lead if there is a phone number. Let's require phone.
            if (!phone) {
                console.log('[Pancake Webhook] Skipped: No phone number detected in event.');
                skippedCount++;
                continue;
            }

            // Deduplication (30 minutes window)
            const duplicateRow = await db.get(
                `SELECT id FROM customers 
                 WHERE phone = $1 
                   AND created_at >= NOW() - INTERVAL '30 minutes'
                 LIMIT 1`,
                [phone]
            );
            if (duplicateRow) {
                console.log(`[Pancake Webhook] Duplicate phone ${phone} detected in the last 30 minutes. Skipping.`);
                skippedCount++;
                continue;
            }

            // Extract customer info
            const customerId = event.customer?.id || event.customer_id || event.id || '';
            const conversationId = event.conversation_id || event.id || '';
            const conversationLink = event.customer?.fb_link || 
                (conversationId ? `https://pages.fm/p/${pageId}/c/${conversationId}` : '');
            const customerName = event.customer?.name || event.customer_name || 'Khách hàng Pancake';

            // Calculate virtual date
            const cutoff = config.cutoff_time || '18:15';
            const [cutoffHour, cutoffMin] = cutoff.split(':').map(Number);
            const now = vnNow();
            let virtualDateStr = vnDateStr(now);
            
            if (now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() >= cutoffMin)) {
                // Shift to tomorrow's date
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                virtualDateStr = vnDateStr(tomorrow);
            }

            // Parse JS day of week for virtual date (0=Sun, 1=Mon, ..., 6=Sat)
            const virtualDate = new Date(virtualDateStr);
            const dayOfWeek = virtualDate.getDay();

            // Roster filtering
            const eligibleUsers = [];
            const staffMap = {};

            if (page.staff_assignments && Array.isArray(page.staff_assignments)) {
                for (const sa of page.staff_assignments) {
                    const userId = sa.crm_user_id;
                    if (!userId) continue;

                    // 1. Check if user is active in users table
                    const userRow = await db.get("SELECT status FROM users WHERE id = $1", [userId]);
                    if (!userRow || userRow.status !== 'active') continue;

                    // 2. Check if user is active in telesale_active_members (if registered)
                    const tamRow = await db.get(
                        "SELECT is_active FROM telesale_active_members WHERE user_id = $1 AND crm_type = $2",
                        [userId, page.crm_type || 'nhu_cau']
                    );
                    if (tamRow && !tamRow.is_active) continue;

                    // 3. Exception checks
                    let isOff = false;
                    let isForce = false;
                    const exceptions = sa.exceptions || [];
                    const matchException = exceptions.find(e => e.date === virtualDateStr);
                    if (matchException) {
                        if (matchException.type === 'all_day') {
                            isOff = true;
                        } else if (matchException.type === 'morning_off') {
                            if (now.getHours() < 14) isOff = true;
                        } else if (matchException.type === 'afternoon_off') {
                            if (now.getHours() >= 11) isOff = true;
                        } else if (matchException.type === 'force_receive') {
                            isForce = true;
                        }
                    }

                    if (!isForce && !isOff) {
                        // 4. Day of week check
                        const workingDays = sa.working_days || [];
                        if (!workingDays.includes(dayOfWeek)) {
                            isOff = true;
                        }

                        // 5. System holiday check
                        const holidayRow = await db.get(
                            "SELECT id FROM holidays WHERE holiday_date::text = $1",
                            [virtualDateStr]
                        );
                        if (holidayRow) {
                            isOff = true;
                        }
                    }

                    if (isOff) continue;

                    // 6. Quota limit check (virtual day window)
                    const [hour, min] = cutoff.split(':').map(Number);
                    const totalCutoffMinutes = hour * 60 + min;
                    const dayMinutes = 24 * 60;
                    const shiftMinutes = dayMinutes - totalCutoffMinutes;

                    const assignedCountRow = await db.get(
                        `SELECT COUNT(*) as cnt FROM customers 
                         WHERE assigned_to_id = $1 
                           AND source_id = $2 
                           AND ((created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') + ($3 || ' minutes')::interval)::date = $4::date`,
                        [userId, page.source_id, String(shiftMinutes), virtualDateStr]
                    );
                    const assignedCount = assignedCountRow ? parseInt(assignedCountRow.cnt) : 0;
                    if (assignedCount >= (sa.daily_limit || 0)) {
                        continue; // Over quota
                    }

                    eligibleUsers.push(userId);
                    staffMap[userId] = sa;
                }
            }

            let assignedUserId = null;
            let assignedPancakeStaffId = null;

            if (eligibleUsers.length > 0) {
                // Round-robin selection
                const lastAssignedIndex = page.last_assigned_index != null ? page.last_assigned_index : -1;
                const size = page.staff_assignments.length;
                let nextIndex = -1;

                for (let i = 0; i < size; i++) {
                    const idx = (lastAssignedIndex + 1 + i) % size;
                    const sa = page.staff_assignments[idx];
                    if (eligibleUsers.includes(sa.crm_user_id)) {
                        nextIndex = idx;
                        assignedUserId = sa.crm_user_id;
                        assignedPancakeStaffId = sa.pancake_staff_id;
                        break;
                    }
                }

                if (assignedUserId !== null) {
                    page.last_assigned_index = nextIndex;
                    // Update settings in DB
                    await db.run(
                        "INSERT INTO app_config (key, value, updated_at) VALUES ('pancake_settings', $1, NOW()) ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()",
                        [JSON.stringify(config)]
                    );
                }
            }

            const tsUid = 'K' + nanoid(19);

            if (assignedUserId !== null) {
                // Success: Assign to staff member
                const appointmentDate = await getNextWorkingDay(now, assignedUserId);
                
                // Get daily order number
                const maxNum = await db.get(
                    "SELECT COALESCE(MAX(daily_order_number), 0) as mx FROM customers WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ?::date AND assigned_to_id = ?",
                    [vnDateStr(now), assignedUserId]
                );
                const dailyNum = (maxNum?.mx || 0) + 1;

                // Create customer
                const custResult = await db.get(
                    `INSERT INTO customers (
                        customer_uid, crm_type, customer_name, phone, facebook_link, 
                        assigned_to_id, receiver_id, daily_order_number, created_by, 
                        job, appointment_date, source_id, order_status, created_at, updated_at
                     )
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'dang_tu_van', NOW(), NOW()) RETURNING id`,
                    [
                        tsUid, page.crm_type || 'nhu_cau', customerName, phone, conversationLink,
                        assignedUserId, assignedUserId, dailyNum, assignedUserId, 
                        page.name, appointmentDate, page.source_id
                    ]
                );
                const customerId = custResult?.id;

                if (customerId) {
                    await db.run(
                        `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by, created_at) 
                         VALUES ($1, 'goi_dien', $2, $3, NOW())`,
                        [customerId, `Đồng bộ từ Pancake (Page: ${page.name})`, assignedUserId]
                    );
                }

                // Call Pancake API to assign member
                if (page.page_access_token && conversationId && assignedPancakeStaffId) {
                    try {
                        const assignUrl = `https://pages.fm/api/v1/pages/${pageId}/conversations/${conversationId}/assign?access_token=${page.page_access_token}`;
                        // We use a custom fetch implementation since standard is Node 18+
                        const fetch = require('node-fetch');
                        const assignRes = await fetch(assignUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ member_ids: [assignedPancakeStaffId] })
                        });
                        const assignData = await assignRes.json();
                        console.log('[Pancake Webhook] Assigned on Pancake:', assignData);
                    } catch (e) {
                        console.error('[Pancake Webhook] Pancake API error:', e.message);
                    }
                }

                // Notify Telegram to the staff member
                const staffChatIdRow = await db.get(
                    `SELECT chat_id FROM telegram_notifications WHERE user_id = $1 AND event_type = 'chuyen_so' AND enabled = true`,
                    [assignedUserId]
                );
                const staffChatId = staffChatIdRow?.chat_id || (await db.get('SELECT telegram_group_id FROM users WHERE id = $1', [assignedUserId]))?.telegram_group_id;

                if (staffChatId) {
                    const notifyMsg = `🥞 <b>Số mới từ Pancake!</b>\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `👤 Khách hàng: <b>${customerName}</b>\n` +
                        `📱 SĐT: <b>${phone || '—'}</b>\n` +
                        `📄 Nguồn: <b>${page.name}</b>\n` +
                        `🔗 Chi tiết: <a href="${conversationLink}">Xem hội thoại</a>`;
                    await sendTelegramMessage(staffChatId, notifyMsg, page.bot_tele);
                }

                processedCount++;
            } else {
                // Fallback action: Assign to fallback user
                const fallbackUserId = page.fallback_user_id;
                if (fallbackUserId) {
                    const appointmentDate = await getNextWorkingDay(now, fallbackUserId);
                    const maxNum = await db.get(
                        "SELECT COALESCE(MAX(daily_order_number), 0) as mx FROM customers WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ?::date AND assigned_to_id = ?",
                        [vnDateStr(now), fallbackUserId]
                    );
                    const dailyNum = (maxNum?.mx || 0) + 1;

                    const custResult = await db.get(
                        `INSERT INTO customers (
                            customer_uid, crm_type, customer_name, phone, facebook_link, 
                            assigned_to_id, receiver_id, daily_order_number, created_by, 
                            job, appointment_date, source_id, order_status, created_at, updated_at
                         )
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'dang_tu_van', NOW(), NOW()) RETURNING id`,
                        [
                            tsUid, page.crm_type || 'nhu_cau', customerName, phone, conversationLink,
                            fallbackUserId, fallbackUserId, dailyNum, fallbackUserId, 
                            page.name, appointmentDate, page.source_id
                        ]
                    );
                    const customerId = custResult?.id;

                    if (customerId) {
                        await db.run(
                            `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by, created_at) 
                             VALUES ($1, 'goi_dien', $2, $3, NOW())`,
                            [customerId, `Đồng bộ từ Pancake (Dự phòng) (Page: ${page.name})`, fallbackUserId]
                        );
                    }

                    // Notify fallback user
                    const fbChatIdRow = await db.get(
                        `SELECT chat_id FROM telegram_notifications WHERE user_id = $1 AND event_type = 'chuyen_so' AND enabled = true`,
                        [fallbackUserId]
                    );
                    const fbChatId = fbChatIdRow?.chat_id || (await db.get('SELECT telegram_group_id FROM users WHERE id = $1', [fallbackUserId]))?.telegram_group_id;

                    if (fbChatId) {
                        const notifyMsg = `🥞 ⚠️ <b>Số mới Pancake (Dự Phòng)!</b>\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n` +
                            `👤 Khách hàng: <b>${customerName}</b>\n` +
                            `📱 SĐT: <b>${phone || '—'}</b>\n` +
                            `📄 Nguồn: <b>${page.name}</b>\n` +
                            `🔗 Chi tiết: <a href="${conversationLink}">Xem hội thoại</a>`;
                        await sendTelegramMessage(fbChatId, notifyMsg, page.bot_tele);
                    }
                }

                // Broadcast alert to ALL staff members in the assignment list
                if (page.staff_assignments && Array.isArray(page.staff_assignments)) {
                    for (const sa of page.staff_assignments) {
                        const staffChatIdRow = await db.get(
                            `SELECT chat_id FROM telegram_notifications WHERE user_id = $1 AND event_type = 'chuyen_so' AND enabled = true`,
                            [sa.crm_user_id]
                        );
                        const staffChatId = staffChatIdRow?.chat_id || (await db.get('SELECT telegram_group_id FROM users WHERE id = $1', [sa.crm_user_id]))?.telegram_group_id;

                        if (staffChatId) {
                            const alertMsg = `📢 <b>Yêu cầu nhận số từ Pancake!</b>\n` +
                                `━━━━━━━━━━━━━━━━━━━━\n` +
                                `Hiện tại có khách hàng mới từ nguồn <b>${page.name}</b> cần xử lý.\n` +
                                `Tuy nhiên hệ thống không có nhân viên trực hoặc mọi người đã hết hạn mức hôm nay.\n` +
                                `⚠️ <b>Vui lòng kiểm tra và bật nhận số để xử lý khách hàng!</b>`;
                            await sendTelegramMessage(staffChatId, alertMsg, page.bot_tele);
                        }
                    }
                }

                processedCount++;
            }
        }

        return { success: true, processed: processedCount, skipped: skippedCount };
    });

    // ========== GET: Fetch Pancake Page Members ==========
    fastify.get('/api/pancake/members/:pageId', { preHandler: [authenticate] }, async (request, reply) => {
        const { pageId } = request.params;
        const configRow = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
        if (!configRow || !configRow.value) {
            return reply.code(400).send({ error: 'Chưa cấu hình Pancake' });
        }

        let config;
        try {
            config = JSON.parse(configRow.value);
        } catch (e) {
            return reply.code(500).send({ error: 'Cấu hình Pancake không hợp lệ' });
        }

        const page = config.pages?.find(p => String(p.id) === pageId);
        if (!page) {
            return reply.code(400).send({ error: `Không tìm thấy cấu hình Fanpage ID ${pageId}` });
        }

        const token = page.page_access_token;
        if (!token) {
            return reply.code(400).send({ error: `Chưa cấu hình Page Access Token cho Fanpage ${page.name}` });
        }

        try {
            const fetch = require('node-fetch');
            const res = await fetch(`https://pages.fm/api/v1/pages/${pageId}/members?access_token=${token}`);
            const data = await res.json();
            if (data.error) {
                return reply.code(400).send({ error: data.error.message || 'Lỗi từ Pancake API' });
            }
            const members = Array.isArray(data) ? data : (data.members || data.data || []);
            return { members };
        } catch (err) {
            return reply.code(500).send({ error: `Không thể kết nối Pancake API: ${err.message}` });
        }
    });
}

module.exports = pancakeRoutes;
