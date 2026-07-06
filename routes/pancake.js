// ========== PANCAKE INTEGRATION ROUTES ==========
const db = require('../db/pool');
const { vnNow, vnDateStr, vnISOString } = require('../utils/timezone');
const { sendTelegramMessage } = require('../utils/telegram');
const { getNextWorkingDay } = require('../utils/workingDay');
const { isWithinReminderHours } = require('./reminder-checker');
const { nanoid } = require('nanoid');
const { authenticate } = require('../middleware/auth');

async function pancakeRoutes(fastify, options) {
    // Auto migration/schema check
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS pancake_pending_leads (
                id SERIAL PRIMARY KEY,
                page_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                conversation_id TEXT NOT NULL,
                customer_name TEXT,
                conversation_link TEXT,
                first_message_at TIMESTAMP DEFAULT NOW(),
                process_at TIMESTAMP NOT NULL,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed_with_phone', 'processed_without_phone', 'cancelled')),
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            ALTER TABLE customers ADD COLUMN IF NOT EXISTS pancake_customer_id TEXT;
            ALTER TABLE customers ADD COLUMN IF NOT EXISTS pancake_conversation_id TEXT;
        `);
    } catch (e) {
        console.error('[Pancake Init] Migration error:', e.message);
    }

    async function isStaffWorkingToday(userId, config, now, page) {
        try {
            const user = await db.get("SELECT is_active FROM users WHERE id = $1", [userId]);
            if (!user || !user.is_active) return false;

            const dateStr = vnDateStr(now);
            const holidayRow = await db.get("SELECT id FROM holidays WHERE holiday_date::text = $1", [dateStr]);
            if (holidayRow) return false;

            const { isUserOnLeave } = require('../utils/workingDay');
            const onLeave = await isUserOnLeave(userId, dateStr);
            if (onLeave) return false;

            // Check staff assignment exceptions
            let isOff = false;
            let isForce = false;
            if (page && page.staff_assignments) {
                const sa = page.staff_assignments.find(x => x.crm_user_id === userId);
                if (sa && sa.exceptions) {
                    const matchException = sa.exceptions.find(e => e.date === dateStr);
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
                }
            }

            if (isForce) return true;
            if (isOff) return false;

            const dayOfWeek = now.getDay();
            if (dayOfWeek === 0) {
                const schedule = config.sunday_duty_schedule || {};
                const assignedUsers = schedule[dateStr] || [];
                return assignedUsers.includes(Number(userId));
            }

            const globalWorkingDays = config.global_working_days || {};
            let workingDays = [1, 2, 3, 4, 5, 6]; // default Mon-Sat
            if (globalWorkingDays[userId] !== undefined) {
                workingDays = globalWorkingDays[userId].map(Number).filter(d => d !== 0);
            }
            return workingDays.includes(dayOfWeek);
        } catch (err) {
            console.error('[Pancake Roster Check] Error:', err.message);
            return false;
        }
    }

    // Helper: assign a lead (either with real phone or temporary phone)
    async function assignPancakeLead(page, config, customerId, customerName, conversationId, conversationLink, phone) {
        // 1. Calculate virtual date
        const cutoff = config.cutoff_time || '18:15';
        const [cutoffHour, cutoffMin] = cutoff.split(':').map(Number);
        const now = vnNow();
        let virtualDateStr = vnDateStr(now);
        
        if (now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() >= cutoffMin)) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            virtualDateStr = vnDateStr(tomorrow);
        }

        const virtualDate = new Date(virtualDateStr);
        const dayOfWeek = virtualDate.getDay();

        // 2. Roster filtering
        const eligibleUsers = [];
        const staffMap = {};

        if (page.staff_assignments && Array.isArray(page.staff_assignments)) {
            for (const sa of page.staff_assignments) {
                const userId = sa.crm_user_id;
                if (!userId) continue;

                // Check active status in users table
                const userRow = await db.get("SELECT status, role, department_id, source_crm_type FROM users WHERE id = $1", [userId]);
                if (!userRow || userRow.status !== 'active') continue;

                // Determine user CRM type
                let userCrmType = 'nhu_cau';
                if (userRow.source_crm_type === 'sale') {
                    userCrmType = 'sale';
                } else if (userRow.department_id) {
                    const parentDeptRow = await db.get(`
                        WITH RECURSIVE dept_path AS (
                            SELECT id, parent_id FROM departments WHERE id = $1
                            UNION ALL
                            SELECT d.id, d.parent_id FROM departments d
                            INNER JOIN dept_path dp ON d.id = dp.parent_id
                        )
                        SELECT 1 FROM dept_path WHERE id = 4 LIMIT 1
                    `, [userRow.department_id]);
                    if (parentDeptRow) {
                        userCrmType = 'sale';
                    }
                }

                sa.userCrmType = userCrmType;

                const targetCrmType = page.crm_type === 'ca_hai' ? userCrmType : (page.crm_type || 'nhu_cau');
                const tamRow = await db.get(
                    "SELECT is_active FROM telesale_active_members WHERE user_id = $1 AND crm_type = $2",
                    [userId, targetCrmType]
                );
                if (tamRow && !tamRow.is_active) continue;

                // Exception checks
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
                    if (dayOfWeek === 0) {
                        const schedule = config.sunday_duty_schedule || {};
                        const assignedUsers = schedule[virtualDateStr] || [];
                        if (!assignedUsers.includes(Number(userId))) {
                            isOff = true;
                        }
                    } else {
                        const globalWorkingDays = config.global_working_days || {};
                        const workingDays = globalWorkingDays[userId] !== undefined 
                            ? globalWorkingDays[userId].map(Number).filter(d => d !== 0)
                            : (sa.working_days ? sa.working_days.map(Number).filter(d => d !== 0) : [1, 2, 3, 4, 5, 6]);
                        if (!workingDays.includes(dayOfWeek)) {
                            isOff = true;
                        }
                    }

                    const holidayRow = await db.get(
                        "SELECT id FROM holidays WHERE holiday_date::text = $1",
                        [virtualDateStr]
                    );
                    if (holidayRow) {
                        isOff = true;
                    }
                }

                if (isOff) continue;

                // Quota limit check
                if (sa.daily_limit && sa.daily_limit > 0) {
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
                    if (assignedCount >= sa.daily_limit) {
                        continue; 
                    }
                }

                eligibleUsers.push(userId);
                staffMap[userId] = sa;
            }
        }

        let assignedUserId = null;
        let assignedPancakeStaffId = null;
        let assignedPancakeTagId = null;

        if (eligibleUsers.length > 0) {
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
                    assignedPancakeTagId = sa.pancake_tag_id;
                    break;
                }
            }

            if (assignedUserId !== null) {
                page.last_assigned_index = nextIndex;
                await db.run(
                    "INSERT INTO app_config (key, value, updated_at) VALUES ('pancake_settings', $1, NOW()) ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()",
                    [JSON.stringify(config)]
                );
            }
        }

        const tsUid = 'K' + nanoid(19);

        if (assignedUserId !== null) {
            const appointmentDate = virtualDateStr;
            const maxNum = await db.get(
                "SELECT COALESCE(MAX(daily_order_number), 0) as mx FROM customers WHERE effective_date = ?::date AND assigned_to_id = ?",
                [virtualDateStr, assignedUserId]
            );
            const dailyNum = (maxNum?.mx || 0) + 1;
            const leadCrmType = staffMap[assignedUserId]?.userCrmType || 'nhu_cau';

            const custResult = await db.get(
                `INSERT INTO customers (
                    customer_uid, crm_type, customer_name, phone, facebook_link, 
                    assigned_to_id, receiver_id, daily_order_number, created_by, 
                    job, appointment_date, source_id, order_status, created_at, updated_at,
                    pancake_customer_id, pancake_conversation_id, effective_date
                )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'dang_tu_van', NOW(), NOW(), $13, $14, $15) RETURNING id`,
                [
                    tsUid, leadCrmType, customerName, phone, conversationLink,
                    assignedUserId, assignedUserId, dailyNum, assignedUserId, 
                    page.name, appointmentDate, page.source_id, customerId, conversationId,
                    virtualDateStr
                ]
            );
            const dbCustId = custResult?.id;

            if (dbCustId) {
                await db.run(
                    `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by, created_at) 
                     VALUES ($1, 'goi_dien', $2, $3, NOW())`,
                    [dbCustId, `Đồng bộ từ Pancake (Page: ${page.name})`, assignedUserId]
                );
            }

            const tokenToUse = page.page_access_token || config.pancake_token;
            if (tokenToUse && conversationId) {
                const pageId = String(page.id);
                if (assignedPancakeStaffId) {
                    try {
                        const assignUrl = `https://pages.fm/api/public_api/v1/pages/${pageId}/conversations/${conversationId}/assign?access_token=${tokenToUse}`;
                        await fetch(assignUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ assignee_ids: [assignedPancakeStaffId] })
                        });
                    } catch (e) {
                        console.error('[Pancake Webhook] Pancake API error:', e.message);
                    }
                }

                if (assignedPancakeTagId) {
                    try {
                        const tagUrl = `https://pages.fm/api/public_api/v1/pages/${pageId}/conversations/${conversationId}/tags?access_token=${tokenToUse}`;
                        await fetch(tagUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'add',
                                tag_id: assignedPancakeTagId
                            })
                        });
                    } catch (e) {
                        console.error('[Pancake Webhook] Pancake API tag error:', e.message);
                    }
                }
            }

            const staffChatIdRow = await db.get(
                `SELECT chat_id FROM telegram_notifications WHERE user_id = $1 AND event_type = 'chuyen_so' AND enabled = true`,
                [assignedUserId]
            );
            const staffChatId = staffChatIdRow?.chat_id || (await db.get('SELECT telegram_group_id FROM users WHERE id = $1', [assignedUserId]))?.telegram_group_id;

            if (staffChatId) {
                const hasPhone = phone && !phone.startsWith('pancake_') && phone !== 'Chưa có SĐT';
                const phonePart = hasPhone ? ` - <code>${phone}</code>` : '';
                const sourceRow = await db.get("SELECT name FROM settings_sources WHERE id = $1", [page.source_id]);
                const sourceName = sourceRow?.name || page.name;
                const sourceDisplay = sourceName.startsWith('📍') ? sourceName : `📍${sourceName}`;

                const d = vnNow();
                const day = d.getDate();
                const month = d.getMonth() + 1;
                const yearTwoDigits = String(d.getFullYear()).slice(-2);
                const serialPrefix = `${dailyNum}-${day}-${month}-Y${yearTwoDigits}`;

                const namePart = `<code>${customerName}</code>`;
                const notifyMsg = `🥞 <b>${serialPrefix} : </b>${namePart}${phonePart}<b> - ${sourceDisplay}</b>`;
                await sendTelegramMessage(staffChatId, notifyMsg, page.bot_tele);
            }
            return true;
        } else {
            let leadCrmType = 'nhu_cau';
            if (page.crm_type === 'ca_hai') {
                const srcRow = await db.get("SELECT crm_type FROM settings_sources WHERE id = $1", [page.source_id]);
                if (srcRow && srcRow.crm_type) {
                    leadCrmType = srcRow.crm_type;
                }
            } else {
                leadCrmType = page.crm_type || 'nhu_cau';
            }

            const custResult = await db.get(
                `INSERT INTO customers (
                    customer_uid, crm_type, customer_name, phone, facebook_link, 
                    assigned_to_id, receiver_id, daily_order_number, created_by, 
                    job, appointment_date, source_id, order_status, created_at, updated_at,
                    pancake_customer_id, pancake_conversation_id
                 )
                 VALUES ($1, $2, $3, $4, $5, NULL, NULL, 0, NULL, $6, NULL, $7, 'dang_tu_van', NOW(), NOW(), $8, $9) RETURNING id`,
                [
                    tsUid, leadCrmType, customerName, phone, conversationLink,
                    page.name, page.source_id, customerId, conversationId
                ]
            );
            const dbCustId = custResult?.id;

            if (dbCustId) {
                await db.run(
                    `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by, created_at) 
                     VALUES ($1, 'goi_dien', $2, NULL, NOW())`,
                    [dbCustId, `Đồng bộ từ Pancake (Chưa phân công) (Page: ${page.name})`]
                );
            }

            // Count currently unassigned leads for this source in the last 24 hours
            const countRow = await db.get(
                `SELECT COUNT(*) as cnt FROM customers 
                 WHERE assigned_to_id IS NULL 
                   AND source_id = $1 
                   AND created_at >= NOW() - INTERVAL '24 hours'`,
                [page.source_id]
            );
            const unassignedCount = countRow ? parseInt(countRow.cnt) : 1;

            // Broadcast alert to ALL staff members in the assignment list if within reminder hours
            const inHours = await isWithinReminderHours();
            if (inHours && page.staff_assignments && Array.isArray(page.staff_assignments)) {
                for (const sa of page.staff_assignments) {
                    const isWorking = await isStaffWorkingToday(sa.crm_user_id, config, now, page);
                    if (!isWorking) continue;

                    const staffChatIdRow = await db.get(
                        `SELECT chat_id FROM telegram_notifications WHERE user_id = $1 AND event_type = 'chuyen_so' AND enabled = true`,
                        [sa.crm_user_id]
                    );
                    const staffChatId = staffChatIdRow?.chat_id || (await db.get('SELECT telegram_group_id FROM users WHERE id = $1', [sa.crm_user_id]))?.telegram_group_id;

                    if (staffChatId) {
                        const alertMsg = `📢 <b>Cảnh báo Pancake: Hiện tại không ai bật nhận số!</b>\n` +
                            `━━━━━━━━━━━━━━━━━━━━\n` +
                            `Đang có <b>${unassignedCount}</b> khách hàng từ nguồn <b>${page.name}</b> đang chờ xử lý.\n` +
                            `⚠️ <b>Yêu cầu nhân viên hãy BẬT NHẬN SỐ để xử lý khách!</b>`;
                        await sendTelegramMessage(staffChatId, alertMsg, page.bot_tele);
                    }
                }
            }

            return false;
        }
    }

    // ========== PUBLIC: Webhook receiver from Pancake ==========
    fastify.get('/api/webhooks/pancake', async (request, reply) => {
        const mode = request.query['hub.mode'];
        const token = request.query['hub.verify_token'];
        const challenge = request.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe') {
                console.log('[Pancake Webhook] Facebook hub verification request received.');
                return challenge;
            }
        }
        return { status: "active", message: "Pancake Webhook receiver is running successfully. Please use POST method to send data." };
    });

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

            // Extract customer info
            const customerId = String(event.customer?.id || event.customer_id || event.id || '');
            const conversationId = String(event.conversation_id || event.id || '');
            const conversationLink = event.customer?.fb_link || 
                (conversationId ? `https://pages.fm/p/${pageId}/c/${conversationId}` : '');
            const customerName = event.customer?.name || event.name || event.customer_name || event.page_customer?.name || 'Khách hàng Pancake';

            // Extract phone number from multiple possible fields/formats in Pancake webhook
            let phone = '';
            const possiblePhones = [];
            if (event.phone) possiblePhones.push(String(event.phone));
            if (event.phone_number) possiblePhones.push(String(event.phone_number));
            if (event.bill_phone_number) possiblePhones.push(String(event.bill_phone_number));
            if (event.customer?.phone) possiblePhones.push(String(event.customer.phone));
            if (event.customer?.phone_number) possiblePhones.push(String(event.customer.phone_number));
            if (Array.isArray(event.customer?.phone_numbers)) {
                event.customer.phone_numbers.forEach(p => possiblePhones.push(String(p)));
            }
            if (Array.isArray(event.phone_numbers)) {
                event.phone_numbers.forEach(p => possiblePhones.push(String(p)));
            }
            if (event.shipping_address?.phone_number) {
                possiblePhones.push(String(event.shipping_address.phone_number));
            }
            if (event.page_customer?.recent_phone_numbers && Array.isArray(event.page_customer.recent_phone_numbers)) {
                event.page_customer.recent_phone_numbers.forEach(item => {
                    if (item.phone_number) possiblePhones.push(String(item.phone_number));
                    if (item.captured) possiblePhones.push(String(item.captured));
                });
            }
            let textToParse = '';
            const isPageSender = event.is_page_sender === true || 
                                 event.message?.is_page_sender === true || 
                                 event.message?.is_echo === true || 
                                 String(event.sender_id || '') === pageId || 
                                 String(event.from_id || '') === pageId || 
                                 String(event.message?.from?.id || '') === pageId;

            // Only extract phone number from message content if it was NOT sent by the page/bot/staff
            if (!isPageSender && event.message) {
                if (typeof event.message === 'string') {
                    textToParse = event.message;
                } else if (typeof event.message === 'object' && event.message.text) {
                    textToParse = String(event.message.text);
                }
            }
            if (textToParse) {
                const match = textToParse.match(/(0|\+84)\d{9}/);
                if (match) possiblePhones.push(match[0]);
            }

            for (let rawPhone of possiblePhones) {
                if (!rawPhone) continue;
                rawPhone = rawPhone.replace(/[\s\-\.]/g, '');
                if (rawPhone.startsWith('+84')) {
                    rawPhone = '0' + rawPhone.substring(3);
                }
                if (/^0\d{9}$/.test(rawPhone)) {
                    phone = rawPhone;
                    break;
                }
            }

            if (phone) {
                // --- CASE 1: Webhook contains a phone number ---
                
                // A. Check if this customer is already in the database
                // Default to 1440 minutes (24 hours) to prevent duplicates when customers reply late
                const updateLimitMin = config.update_phone_limit_minutes || 1440;
                const existingCust = await db.get(
                    `SELECT id, assigned_to_id, phone, customer_name, created_at 
                     FROM customers 
                     WHERE (pancake_customer_id = $1 OR pancake_conversation_id = $2) 
                       AND created_at >= NOW() - ($3 || ' minutes')::interval
                     ORDER BY id DESC LIMIT 1`,
                    [customerId, conversationId, String(updateLimitMin)]
                );

                if (existingCust) {
                    // Only update and notify if the phone number has changed (different from existing)
                    if (existingCust.phone !== phone) {
                        await db.run(
                            `UPDATE customers SET phone = $1, updated_at = NOW() WHERE id = $2`,
                            [phone, existingCust.id]
                        );

                        await db.run(
                            `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by, created_at) 
                             VALUES ($1, 'goi_dien', $2, NULL, NOW())`,
                            [existingCust.id, `Cập nhật số điện thoại tự động từ Pancake: ${phone}`]
                        );

                        // Notify assigned salesperson via Telegram
                        if (existingCust.assigned_to_id) {
                            const staffChatIdRow = await db.get(
                                `SELECT chat_id FROM telegram_notifications WHERE user_id = $1 AND event_type = 'chuyen_so' AND enabled = true`,
                                [existingCust.assigned_to_id]
                            );
                            const staffChatId = staffChatIdRow?.chat_id || (await db.get('SELECT telegram_group_id FROM users WHERE id = $1', [existingCust.assigned_to_id]))?.telegram_group_id;

                            if (staffChatId) {
                                const sourceRow = await db.get("SELECT name FROM settings_sources WHERE id = $1", [page.source_id]);
                                const sourceName = sourceRow?.name || page.name;
                                const sourceDisplay = sourceName.startsWith('📍') ? sourceName : `📍${sourceName}`;

                                const updateMsg = `🥞 <b>Cập nhật SĐT : </b><code>${customerName}</code><b> - </b><code>${phone}</code><b> - ${sourceDisplay}</b>`;
                                await sendTelegramMessage(staffChatId, updateMsg, page.bot_tele);
                            }
                        }
                    }

                    // Update status in pending list if any
                    await db.run(
                        `UPDATE pancake_pending_leads SET status = 'processed_with_phone' 
                         WHERE (customer_id = $1 OR conversation_id = $2) AND status = 'pending'`,
                        [customerId, conversationId]
                    );

                    processedCount++;
                    continue;
                }

                // B. If no temporary customer card was recently created, process as a new lead
                
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

                // Cancel pending lead if any
                await db.run(
                    `UPDATE pancake_pending_leads SET status = 'processed_with_phone' 
                     WHERE (customer_id = $1 OR conversation_id = $2) AND status = 'pending'`,
                    [customerId, conversationId]
                );

                await assignPancakeLead(page, config, customerId, customerName, conversationId, conversationLink, phone);
                processedCount++;
            } else {
                // --- CASE 2: Webhook does NOT contain a phone number ---
                
                // Check if customer already exists in CRM
                const exists = await db.get(
                    "SELECT id FROM customers WHERE pancake_customer_id = $1 OR pancake_conversation_id = $2",
                    [customerId, conversationId]
                );
                if (exists) {
                    skippedCount++;
                    continue;
                }

                // Check if already in pending leads queue
                const pendingExists = await db.get(
                    "SELECT id FROM pancake_pending_leads WHERE (customer_id = $1 OR conversation_id = $2) AND status = 'pending'",
                    [customerId, conversationId]
                );
                if (pendingExists) {
                    skippedCount++;
                    continue;
                }

                // Insert into pending leads queue
                const delaySecs = config.delay_assignment_seconds || 60;
                const processAt = new Date(Date.now() + delaySecs * 1000);

                await db.run(
                    `INSERT INTO pancake_pending_leads (page_id, customer_id, conversation_id, customer_name, conversation_link, process_at, status) 
                     VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
                    [pageId, customerId, conversationId, customerName, conversationLink, processAt]
                );

                console.log(`[Pancake Webhook] Enqueued pending lead for customer ${customerId}, will process at ${processAt}`);
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

        const token = page.page_access_token || config.pancake_token;
        if (!token) {
            return reply.code(400).send({ error: `Chưa cấu hình Page Access Token hoặc Token chung cho Fanpage ${page.name}` });
        }

        try {
            const res = await fetch(`https://pages.fm/api/public_api/v1/pages/${pageId}/users?access_token=${token}`);
            const data = await res.json();
            if (data.error || data.success === false) {
                return reply.code(400).send({ error: data.message || (data.error && data.error.message) || 'Lỗi từ Pancake API' });
            }
            const rawUsers = data.users || data.data || [];
            const members = rawUsers.map(u => ({
                id: u.id,
                fb_id: u.fb_id,
                name: u.name
            }));
            return { members };
        } catch (err) {
            return reply.code(500).send({ error: `Không thể kết nối Pancake API: ${err.message}` });
        }
    });

    // ========== GET: Fetch Pancake Page Tags ==========
    fastify.get('/api/pancake/tags/:pageId', { preHandler: [authenticate] }, async (request, reply) => {
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

        const token = page.page_access_token || config.pancake_token;
        if (!token) {
            return reply.code(400).send({ error: `Chưa cấu hình Page Access Token hoặc Token chung cho Fanpage ${page.name}` });
        }

        try {
            const res = await fetch(`https://pages.fm/api/public_api/v1/pages/${pageId}/tags?access_token=${token}`);
            const data = await res.json();
            if (data.error || data.success === false) {
                return reply.code(400).send({ error: data.message || (data.error && data.error.message) || 'Lỗi từ Pancake API' });
            }
            const rawTags = data.tags || data.data || [];
            const tags = rawTags.map(t => ({
                id: t.id,
                name: t.text || t.name
            }));
            return { tags };
        } catch (err) {
            return reply.code(500).send({ error: `Không thể kết nối Pancake API: ${err.message}` });
        }
    });

    // ========== BACKGROUND WORKER: Check and alert unassigned Pancake leads every 15 minutes ==========
    async function checkUnassignedPancakeLeads() {
        try {
            const configRow = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
            if (!configRow || !configRow.value) return;

            let config;
            try {
                config = JSON.parse(configRow.value);
            } catch (e) {
                return;
            }

            if (!config.is_active || !config.pages) return;
            const inHours = await isWithinReminderHours();
            if (!inHours) return;
            const now = vnNow();

            for (const page of config.pages) {
                if (!page.is_active || !page.source_id) continue;

                // Count unassigned leads for this page's source in the last 24 hours
                const countRow = await db.get(
                    `SELECT COUNT(*) as cnt FROM customers 
                     WHERE assigned_to_id IS NULL 
                       AND source_id = $1 
                       AND created_at >= NOW() - INTERVAL '24 hours'`,
                    [page.source_id]
                );
                const cnt = countRow ? parseInt(countRow.cnt) : 0;

                if (cnt > 0 && page.staff_assignments && Array.isArray(page.staff_assignments)) {
                    console.log(`[Pancake Cron] Page ${page.name} has ${cnt} unassigned leads. Notifying roster staff.`);
                    
                    // Broadcast to all staff in roster
                    for (const sa of page.staff_assignments) {
                        if (!sa.crm_user_id) continue;

                        const isWorking = await isStaffWorkingToday(sa.crm_user_id, config, now, page);
                        if (!isWorking) continue;

                        const staffChatIdRow = await db.get(
                            `SELECT chat_id FROM telegram_notifications WHERE user_id = $1 AND event_type = 'chuyen_so' AND enabled = true`,
                            [sa.crm_user_id]
                        );
                        const staffChatId = staffChatIdRow?.chat_id || (await db.get('SELECT telegram_group_id FROM users WHERE id = $1', [sa.crm_user_id]))?.telegram_group_id;

                        if (staffChatId) {
                            const alertMsg = `📢 <b>Cảnh báo Pancake: Hiện tại không ai bật nhận số! (Nhắc nhở 15 phút)</b>\n` +
                                `━━━━━━━━━━━━━━━━━━━━\n` +
                                `Đang có <b>${cnt}</b> khách hàng từ nguồn <b>${page.name}</b> đang chờ xử lý.\n` +
                                `⚠️ <b>Yêu cầu nhân viên hãy BẬT NHẬN SỐ để xử lý khách!</b>`;
                            await sendTelegramMessage(staffChatId, alertMsg, page.bot_tele);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[Pancake Cron] Error checking unassigned leads:', err);
        }
    }

    // ========== BACKGROUND WORKER: Process pending Pancake leads every 5 seconds ==========
    async function processPendingPancakeLeads() {
        try {
            const pendingRows = await db.all(
                `SELECT id, page_id, customer_id, conversation_id, customer_name, conversation_link 
                 FROM pancake_pending_leads 
                 WHERE status = 'pending' AND process_at <= NOW() 
                 LIMIT 10`
            );
            if (pendingRows.length === 0) return;

            const configRow = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
            if (!configRow || !configRow.value) return;
            const config = JSON.parse(configRow.value);
            if (!config.is_active) return;

            for (const row of pendingRows) {
                // Update status first to prevent race condition
                await db.run("UPDATE pancake_pending_leads SET status = 'processed_without_phone' WHERE id = $1", [row.id]);

                const page = config.pages?.find(p => String(p.id) === String(row.page_id));
                if (!page || !page.is_active) continue;

                // Check if customer already exists in CRM
                const exists = await db.get(
                    "SELECT id FROM customers WHERE pancake_customer_id = $1 OR pancake_conversation_id = $2",
                    [row.customer_id, row.conversation_id]
                );
                if (exists) {
                    continue; // Already processed
                }

                const tempPhone = `pancake_${row.customer_id}`;
                await assignPancakeLead(page, config, row.customer_id, row.customer_name, row.conversation_id, row.conversation_link, tempPhone);
            }
        } catch(err) {
            console.error('[Pancake Cron] Error processing pending leads:', err);
        }
    }

    // Start 15-minute interval check
    setInterval(() => {
        checkUnassignedPancakeLeads().catch(err => console.error('[Pancake Interval Error]', err));
    }, 15 * 60 * 1000);

    // Start 5-second interval check
    setInterval(() => {
        processPendingPancakeLeads().catch(err => console.error('[Pancake Pending Leads Interval Error]', err));
    }, 5 * 1000);
}

module.exports = pancakeRoutes;
