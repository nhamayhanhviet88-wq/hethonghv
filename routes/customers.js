const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendTelegramMessage, broadcastTelegram, notifyTelegram } = require('../utils/telegram');
const { checkPhoneDuplicate, checkPhoneUser, checkPhoneCustomerWarning } = require('../utils/phoneCheck');
const { maskCustomerData } = require('../utils/dataMasking');
const { getVNToday } = require('../utils/workingDay');
const { calculateRealDeadline } = require('./deadline-checker');
const { nanoid } = require('nanoid');
const { getProductionCutoff, getTestAccountIds, buildProductionFilter } = require('../utils/productionMode');

const AFFILIATE_ROLES = ['tkaffiliate', 'hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];

function getStaffTelegramIds() {
    // Note: this is now async but kept sync-compatible for broadcast
    return [];
}

async function customersRoutes(fastify, options) {

    async function getManagedDeptIds(userId) {
        const headDepts = await db.all('SELECT id FROM departments WHERE head_user_id = ? AND status = ?', [userId, 'active']);
        const allIds = new Set();
        const queue = headDepts.map(d => d.id);
        const dbUser = await db.get('SELECT department_id FROM users WHERE id = ?', [userId]);
        if (dbUser && dbUser.department_id) queue.push(dbUser.department_id);
        while (queue.length > 0) {
            const dId = queue.shift();
            if (allIds.has(dId)) continue;
            allIds.add(dId);
            const children = await db.all('SELECT id FROM departments WHERE parent_id = ? AND status = ?', [dId, 'active']);
            children.forEach(c => queue.push(c.id));
        }
        return [...allIds];
    }

    // maskPhone moved to utils/dataMasking.js — use maskCustomerData() instead

    fastify.get('/api/managed-staff', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        if (user.role === 'quan_ly' || user.role === 'truong_phong') {
            const managedDeptIds = await getManagedDeptIds(user.id);
            if (managedDeptIds.length > 0) {
                const placeholders = managedDeptIds.map(() => '?').join(',');
                const users = await db.all(
                    `SELECT id, full_name, role, department_id FROM users WHERE department_id IN (${placeholders}) AND status = 'active' ORDER BY full_name`,
                    managedDeptIds
                );
                const me = await db.get('SELECT id, full_name, role, department_id FROM users WHERE id = ?', [user.id]);
                if (me && !users.find(u => u.id === me.id)) users.unshift(me);
                return { users };
            }
            const me = await db.get('SELECT id, full_name, role, department_id FROM users WHERE id = ?', [user.id]);
            return { users: me ? [me] : [] };
        }
        const users = await db.all("SELECT id, full_name, role, department_id FROM users WHERE status = 'active' ORDER BY full_name");
        return { users };
    });

    fastify.post('/api/customers', { preHandler: [authenticate] }, async (request, reply) => {
        const { crm_type, customer_name, phone, phone2, source_id, source_name, promotion_id, industry_id,
                receiver_id, notes, affiliate_user_id, job, facebook_link, cong_viec, force_create } = request.body || {};
        if (!crm_type) return reply.code(400).send({ error: 'Vui lòng chọn CRM' });
        if (!phone && !facebook_link) return reply.code(400).send({ error: 'Vui lòng nhập SĐT hoặc Link Facebook' });
        if (phone && !/^\d{10}$/.test(phone)) return reply.code(400).send({ error: 'Số điện thoại phải đúng 10 chữ số' });

        // ★ Xác định NV nhận số TRƯỚC khi check phone (cần biết assigned_to_id để check trùng)
        let actualReceiverId = receiver_id ? Number(receiver_id) : null;
        let referrerId = null;
        if (request.user.role === 'hoa_hong') {
            referrerId = request.user.id;
            if (request.user.assigned_to_user_id) actualReceiverId = request.user.assigned_to_user_id;
        } else if (request.user.role === 'tkaffiliate') {
            referrerId = request.user.id;
            if (request.user.managed_by_user_id) actualReceiverId = request.user.managed_by_user_id;
        } else if (affiliate_user_id) {
            referrerId = Number(affiliate_user_id);
        }

        // Check phone: phân quyền theo role
        if (phone) {
            // Hard block: SĐT trùng NV nội bộ (tất cả role đều bị block)
            const userError = await checkPhoneUser(phone);
            if (userError) return reply.code(400).send({ error: userError });

            // ★ Phân quyền SĐT trùng KH:
            const isExecutive = ['giam_doc', 'quan_ly_cap_cao'].includes(request.user.role);

            if (isExecutive) {
                // Giám Đốc / QL Cấp Cao: hiện popup cho TẤT CẢ SĐT trùng (trừ force_create)
                if (!force_create) {
                    const custWarning = await checkPhoneCustomerWarning(phone);
                    if (custWarning) {
                        return reply.code(409).send({
                            error: 'duplicate_customer_warning',
                            message: custWarning.warning,
                            duplicates: custWarning.customers, // ★ mảng tất cả KH trùng
                            receiver_id: actualReceiverId      // ★ NV nhận số từ form
                        });
                    }
                }
            } else {
                // NV / TP / QL / Affiliate: chỉ block nếu CHÍNH NV nhận số đã có KH này
                if (actualReceiverId) {
                    const selfDup = await db.get(
                        `SELECT c.id, c.customer_name, c.phone, u.full_name as assigned_to_name
                         FROM customers c LEFT JOIN users u ON u.id = c.assigned_to_id
                         WHERE c.phone = $1 AND c.assigned_to_id = $2 LIMIT 1`,
                        [phone, actualReceiverId]
                    );
                    if (selfDup) {
                        return reply.code(400).send({
                            error: `SĐT ${phone} đã có trong danh sách KH của "${selfDup.assigned_to_name || 'NV'}" — KH "${selfDup.customer_name}". Không thể gửi trùng.`
                        });
                    }
                }
                // SĐT trùng NV khác → bỏ qua, tạo KH mới tự động
            }
        }

        // Generate unique customer UID: K + 19 random chars
        const customerUid = 'K' + nanoid(19);

        // Auto-lookup source_id from source_name if source_id not provided
        let resolvedSourceId = source_id ? Number(source_id) : null;
        if (!resolvedSourceId && source_name) {
            const srcRow = await db.get('SELECT id FROM settings_sources WHERE UPPER(name) = UPPER($1) LIMIT 1', [source_name.trim()]);
            if (srcRow) resolvedSourceId = srcRow.id;
        }
        console.log('[CSO-BACKEND] source_id from body:', source_id, '| source_name:', source_name, '| resolvedSourceId:', resolvedSourceId);

        // ★ CUTOFF LOGIC — Chuyển số ngoài giờ → gán sang ngày LV kế tiếp
        const { getVNTimeInfo, getNextWorkingDay: getNextWD, getHolidays: getHols, isUserOnLeave: isLeave } = require('../utils/workingDay');
        let effectiveDate = getVNToday();
        const vnTime = getVNTimeInfo();
        const todayStr = effectiveDate;

        console.log('[CUTOFF DEBUG] vnTime:', JSON.stringify(vnTime), '| today:', todayStr);

        // Bước 1: Kiểm tra hôm nay có phải CN / Lễ / NV nghỉ không → luôn dời
        const _holidays = await getHols();
        const isSunday = vnTime.dayOfWeek === 0;
        const isHoliday = _holidays.has(todayStr);
        const isOnLeave = actualReceiverId ? await isLeave(actualReceiverId, todayStr) : false;

        console.log('[CUTOFF DEBUG] isSunday:', isSunday, '| isHoliday:', isHoliday, '| isOnLeave:', isOnLeave);

        if (isSunday || isHoliday || isOnLeave) {
            effectiveDate = await getNextWD(new Date(), actualReceiverId);
            console.log('[CUTOFF DEBUG] Non-working day → effectiveDate:', effectiveDate);
        } else {
            // Bước 2: Kiểm tra giờ cutoff
            let cutoffH = 18, cutoffM = 15;
            try {
                if (vnTime.dayOfWeek === 6) {
                    const cfgRow = await db.get("SELECT value FROM app_config WHERE key = 'chuyenso_cutoff_saturday'");
                    console.log('[CUTOFF DEBUG] Saturday cfgRow:', JSON.stringify(cfgRow));
                    const val = cfgRow?.value || '17:15';
                    const [h, m] = val.split(':').map(Number);
                    cutoffH = h; cutoffM = m;
                } else {
                    const cfgRow = await db.get("SELECT value FROM app_config WHERE key = 'chuyenso_cutoff_weekday'");
                    console.log('[CUTOFF DEBUG] Weekday cfgRow:', JSON.stringify(cfgRow));
                    const val = cfgRow?.value || '18:15';
                    const [h, m] = val.split(':').map(Number);
                    cutoffH = h; cutoffM = m;
                }
            } catch(e) { console.log('[CUTOFF DEBUG] Config error:', e.message); }

            const currentMinutes = vnTime.hour * 60 + vnTime.minute;
            const cutoffMinutes = cutoffH * 60 + cutoffM;

            console.log('[CUTOFF DEBUG] currentMinutes:', currentMinutes, '| cutoffH:', cutoffH, '| cutoffM:', cutoffM, '| cutoffMinutes:', cutoffMinutes, '| shouldShift:', currentMinutes >= cutoffMinutes);

            if (currentMinutes >= cutoffMinutes) {
                effectiveDate = await getNextWD(new Date(), actualReceiverId);
                console.log('[CUTOFF DEBUG] Past cutoff → effectiveDate:', effectiveDate);
            }
        }

        console.log('[CUTOFF DEBUG] FINAL effectiveDate:', effectiveDate);

        const [_y, _m, _d] = effectiveDate.split('-').map(Number);
        const maxNum = await db.get(
            "SELECT COALESCE(MAX(daily_order_number), 0) as mx FROM customers WHERE effective_date = ?::date AND assigned_to_id = ?",
            [effectiveDate, actualReceiverId]
        );
        const dailyNum = (maxNum?.mx || 0) + 1;

        const result = await db.run(
            `INSERT INTO customers (customer_uid, crm_type, customer_name, phone, phone2, source_id, promotion_id,
             industry_id, receiver_id, assigned_to_id, notes, daily_order_number, created_by, referrer_id, job, facebook_link, cong_viec, effective_date, appointment_date)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [customerUid, crm_type, customer_name || null, phone || null, phone2 || null,
             resolvedSourceId, promotion_id ? Number(promotion_id) : null,
             industry_id ? Number(industry_id) : null,
             actualReceiverId, actualReceiverId, notes || null, dailyNum,
             request.user.id, referrerId, job || null, facebook_link || null, cong_viec || null, effectiveDate, effectiveDate]
        );

        const code = `${dailyNum}-${_d}-${_m}`;
        const sourceName = resolvedSourceId ? (await db.get('SELECT name FROM settings_sources WHERE id = ?', [resolvedSourceId]))?.name : '';
        const promoName = promotion_id ? (await db.get('SELECT name FROM settings_promotions WHERE id = ?', [Number(promotion_id)]))?.name : '';
        const industryName = industry_id ? (await db.get('SELECT name FROM settings_industries WHERE id = ?', [Number(industry_id)]))?.name : '';
        const receiverUser = actualReceiverId ? await db.get('SELECT full_name, telegram_group_id FROM users WHERE id = ?', [actualReceiverId]) : null;
        const crmLabels = { nhu_cau: 'Chăm Sóc KH Nhu Cầu', ctv: 'Chăm Sóc CTV', ctv_hoa_hong: 'Chăm Sóc Affiliate', koc_tiktok: 'Chăm Sóc KOL/KOC Tiktok' };

        const tgParts = [`📱 <b>${code}</b> : <code>${customer_name}</code> - ${phone} - ${crmLabels[crm_type] || crm_type}`];
        if (sourceName) tgParts.push(sourceName);
        if (receiverUser?.full_name) tgParts.push(receiverUser.full_name);
        if (promoName) tgParts.push(promoName);
        if (industryName) tgParts.push(industryName);
        const tgMessage = tgParts.join(' - ');
        notifyTelegram(actualReceiverId, 'chuyen_so', tgMessage);

        // Auto-update partner_outreach_entries: mark as transferred
        try {
            if (phone && phone.trim()) {
                await db.run(`UPDATE partner_outreach_entries SET transferred_to_crm = TRUE, transferred_at = NOW(), crm_data_id = $1 WHERE REPLACE(phone, ' ', '') LIKE $2 AND transferred_to_crm = FALSE`, [result.lastInsertRowid, `%${phone.trim()}%`]);
            }
            if (facebook_link && facebook_link.trim()) {
                await db.run(`UPDATE partner_outreach_entries SET transferred_to_crm = TRUE, transferred_at = NOW(), crm_data_id = $1 WHERE LOWER(fb_link) = $2 AND transferred_to_crm = FALSE`, [result.lastInsertRowid, facebook_link.trim().toLowerCase()]);
            }
        } catch(e) { console.error('[Customers] Auto-update partner_outreach error:', e.message); }

        return { success: true, id: result.lastInsertRowid, dailyNum, customer_uid: customerUid, message: 'Chuyển số thành công!' };
    });

    // ========== GỬI LẠI SỐ TRÙNG — Cập nhật KH đã tồn tại vào "Phải Xử Lý Hôm Nay" ==========
    fastify.post('/api/customers/resend', { preHandler: [authenticate] }, async (request, reply) => {
        const { customer_id, notes } = request.body || {};
        if (!customer_id) return reply.code(400).send({ error: 'Thiếu customer_id' });

        const customer = await db.get(
            `SELECT c.*, u.full_name as assigned_to_name, u.telegram_group_id as assigned_telegram
             FROM customers c LEFT JOIN users u ON u.id = c.assigned_to_id
             WHERE c.id = ?`, [Number(customer_id)]
        );
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        // ★ Chỉ set appointment_date = hôm nay → KH lên "Phải Xử Lý Hôm Nay"
        // KHÔNG đổi effective_date + daily_order_number → giữ nguyên mã KH gốc
        const today = getVNToday();

        await db.run(
            `UPDATE customers SET appointment_date = ?, updated_at = NOW() WHERE id = ?`,
            [today, Number(customer_id)]
        );

        // Tính mã KH gốc (giữ nguyên, không đổi)
        let originalCode = '';
        if (customer.daily_order_number && customer.effective_date) {
            const ed = new Date(customer.effective_date);
            const d = ed.getDate(), m = ed.getMonth() + 1;
            const y = 'Y' + String(ed.getFullYear()).slice(-2);
            originalCode = `${customer.daily_order_number}-${d}-${m}-${y}`;
        }

        // ★ KHÔNG ghi consultation_log → giữ nguyên "Phải Xử Lý" + nút tư vấn không bị reset
        // Thông báo gửi lại chỉ qua Telegram

        // Gửi Telegram
        const crmLabels = { nhu_cau: 'Nhu Cầu', ctv: 'CTV', ctv_hoa_hong: 'Affiliate', koc_tiktok: 'KOC/KOL Tiktok' };
        const tgMessage = `🔄 <b>GỬI LẠI SỐ</b>\n` +
            `📱 <b>${originalCode || '?'}</b> : <code>${customer.customer_name}</code> - ${customer.phone}\n` +
            `🏷️ CRM: ${crmLabels[customer.crm_type] || customer.crm_type}\n` +
            (customer.assigned_to_name ? `👨‍💼 NV: ${customer.assigned_to_name}\n` : '') +
            `📝 Bởi: ${request.user.full_name}\n` +
            `🔥 <b>PHẢI XỬ LÝ HÔM NAY!</b>` +
            (notes && notes.trim() ? `\n💬 ${notes.trim()}` : '');

        notifyTelegram(customer.assigned_to_id, 'gui_lai_so', tgMessage);

        console.log(`[RESEND] Customer #${customer_id} resent by ${request.user.username} → code kept: ${originalCode}, appointment: ${today}`);

        return {
            success: true,
            original_code: originalCode,
            message: `✅ Đã gửi lại! Mã ${originalCode} — Phải Xử Lý Hôm Nay!`
        };
    });

    fastify.get('/api/customers', { preHandler: [authenticate] }, async (request, reply) => {
        // Shortcut: count referrals for a specific affiliate user
        const { referrer_id_count } = request.query;
        if (referrer_id_count) {
            const result = await db.get('SELECT COUNT(*) as cnt FROM customers WHERE referrer_id = ?', [Number(referrer_id_count)]);
            return { totalReferrals: result?.cnt || 0 };
        }

        const { crm_type, order_status, assigned_to_id, search, cancel_requested, cancel_approved,
                year, month, day, employee_id } = request.query;

        let query = `SELECT c.*, c.customer_uid,
            s.name as source_name, p.name as promotion_name, i.name as industry_name,
            r.full_name as receiver_name, a.full_name as assigned_to_name,
            cb.full_name as created_by_name, ref.full_name as referrer_name, COALESCE((SELECT sc.crm_type FROM customers sc WHERE sc.id = ref.source_customer_id), CASE ref.role WHEN 'hoa_hong' THEN 'ctv_hoa_hong' WHEN 'tkaffiliate' THEN 'ctv_hoa_hong' WHEN 'ctv' THEN 'ctv' ELSE ref.source_crm_type END) as referrer_user_crm_type,
            crb.full_name as cancel_requested_by_name, cab.full_name as cancel_approved_by_name,
            rc.customer_name as referrer_customer_name, rc.crm_type as referrer_crm_type, rc.phone as referrer_customer_phone
            FROM customers c
            LEFT JOIN settings_sources s ON c.source_id = s.id
            LEFT JOIN settings_promotions p ON c.promotion_id = p.id
            LEFT JOIN settings_industries i ON c.industry_id = i.id
            LEFT JOIN users r ON c.receiver_id = r.id
            LEFT JOIN users a ON c.assigned_to_id = a.id
            LEFT JOIN users cb ON c.created_by = cb.id
            LEFT JOIN users ref ON c.referrer_id = ref.id
            LEFT JOIN users crb ON c.cancel_requested_by = crb.id
            LEFT JOIN users cab ON c.cancel_approved_by = cab.id
            LEFT JOIN customers rc ON c.referrer_customer_id = rc.id
            WHERE 1=1`;
        const params = [];

        // ★ Production Mode: ẩn dữ liệu test (theo thời gian + tài khoản test)
        const _cutoff = await getProductionCutoff();
        const _testIds = await getTestAccountIds();
        const _prodFilter = buildProductionFilter(_cutoff, _testIds, 'c.created_at', 'c.created_by');
        if (_prodFilter) query += _prodFilter;

        if (crm_type) {
            if (crm_type === 'affiliate') { query += ` AND c.crm_type = 'ctv_hoa_hong'`; }
            else { query += ` AND c.crm_type = ?`; params.push(crm_type); }
        }
        if (order_status) { query += ` AND c.order_status = ?`; params.push(order_status); }
        if (assigned_to_id) { query += ` AND c.assigned_to_id = ?`; params.push(Number(assigned_to_id)); }
        if (employee_id) { query += ` AND c.assigned_to_id = ?`; params.push(Number(employee_id)); }
        if (search) {
            query += ` AND (c.customer_name LIKE ? OR c.phone LIKE ? OR c.id IN (SELECT customer_id FROM order_codes WHERE order_code LIKE ?))`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (cancel_requested === '1') { query += ` AND c.cancel_requested = 1`; }
        if (cancel_approved === '1') { query += ` AND c.cancel_approved = 1`; }
        if (cancel_approved === '0') { query += ` AND c.cancel_approved = 0`; }
        if (cancel_approved === '-1') { query += ` AND c.cancel_approved = -1`; }

        if (year) { query += ` AND EXTRACT(YEAR FROM c.created_at) = ?`; params.push(Number(year)); }
        if (month) { query += ` AND EXTRACT(MONTH FROM c.created_at) = ?`; params.push(Number(month)); }
        if (day) { query += ` AND EXTRACT(DAY FROM c.created_at) = ?`; params.push(Number(day)); }

        const user = request.user;
        if (user.role === 'nhan_vien') {
            query += ` AND c.assigned_to_id = ?`; params.push(user.id);
        } else if (user.role === 'truong_phong') {
            const managedDeptIds = await getManagedDeptIds(user.id);
            if (managedDeptIds.length > 0) {
                const managedUserIds = (await db.all(
                    `SELECT id FROM users WHERE department_id IN (${managedDeptIds.map(() => '?').join(',')}) AND status = 'active'`,
                    managedDeptIds
                )).map(u => u.id);
                if (!managedUserIds.includes(user.id)) managedUserIds.push(user.id);
                const placeholders = managedUserIds.map(() => '?').join(',');
                query += ` AND c.assigned_to_id IN (${placeholders})`;
                params.push(...managedUserIds);
            } else {
                query += ` AND c.assigned_to_id = ?`; params.push(user.id);
            }
        } else if (user.role === 'hoa_hong') {
            query += ` AND c.referrer_id = ?`; params.push(user.id);
        } else if (user.role === 'tkaffiliate') {
            // Show customers referred by self + children affiliates
            const childAffiliates = await db.all(
                "SELECT id FROM users WHERE managed_by_user_id = ? AND role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')",
                [user.id]
            );
            const affIds = [user.id, ...childAffiliates.map(a => a.id)];
            const ph = affIds.map(() => '?').join(',');
            query += ` AND c.referrer_id IN (${ph})`; params.push(...affIds);
        } else if (user.role === 'quan_ly') {
            const managedDeptIds = await getManagedDeptIds(user.id);
            if (managedDeptIds.length > 0) {
                const managedUserIds = (await db.all(
                    `SELECT id FROM users WHERE department_id IN (${managedDeptIds.map(() => '?').join(',')}) AND status = 'active'`,
                    managedDeptIds
                )).map(u => u.id);
                managedUserIds.push(user.id);
                const placeholders = managedUserIds.map(() => '?').join(',');
                query += ` AND c.assigned_to_id IN (${placeholders})`;
                params.push(...managedUserIds);
            } else {
                query += ` AND c.assigned_to_id = ?`; params.push(user.id);
            }
        }

        query += ' ORDER BY c.is_pinned DESC NULLS LAST, c.created_at ASC';
        const customers = await db.all(query, params);

        if (user.role === 'quan_ly' || user.role === 'truong_phong') {
            for (const c of customers) {
                if (c.assigned_to_id !== user.id) {
                    maskCustomerData(c);
                }
            }
        }

        // Mask phone/link/address for affiliate roles viewing non-direct referrals
        if (AFFILIATE_ROLES.includes(user.role)) {
            for (const c of customers) {
                if (c.referrer_id !== user.id) {
                    maskCustomerData(c, { maskAddress: true });
                }
            }
        }

        // ★ Batch calculate next_aff_rate: % hoa hồng cho đơn tiếp theo
        try {
            const custIds = customers.map(c => c.id).filter(Boolean);
            const refIds = [...new Set(customers.map(c => c.referrer_id).filter(Boolean))];

            if (custIds.length > 0) {
                // 1. KH đã có đơn completed (first-order done)
                const completedRows = await db.all(
                    `SELECT DISTINCT customer_id FROM order_codes WHERE customer_id IN (${custIds.map(() => '?').join(',')}) AND status = 'completed'`, custIds
                );
                const completedSet = new Set(completedRows.map(r => r.customer_id));

                // 2. KH đã tạo TK affiliate → map customer_id → affiliate_user_id
                const selfRows = await db.all(
                    `SELECT id, source_customer_id FROM users WHERE source_customer_id IN (${custIds.map(() => '?').join(',')}) AND status = 'active'`, custIds
                );
                const selfAffMap = {}; // customer_id → affiliate user_id
                for (const r of selfRows) {
                    selfAffMap[r.source_customer_id] = r.id;
                }

                // 3. Referrer có affiliate cha không (referrer.source_customer_id → customer.referrer_id)
                const parentMap = {}; // referrer_user_id → hasParent
                if (refIds.length > 0) {
                    const refRows = await db.all(
                        `SELECT u.id as ref_id, u.source_customer_id, c2.referrer_id as parent_ref_id
                         FROM users u
                         LEFT JOIN customers c2 ON c2.id = u.source_customer_id
                         WHERE u.id IN (${refIds.map(() => '?').join(',')})`, refIds
                    );
                    for (const r of refRows) {
                        parentMap[r.ref_id] = !!(r.source_customer_id && r.parent_ref_id);
                    }
                }

                // Gắn next_aff_rate cho từng KH
                for (const c of customers) {
                    const ownAffId = selfAffMap[c.id]; // TK affiliate của chính KH
                    const isSelfReferrer = ownAffId && c.referrer_id === ownAffId;
                    const hasOwnAffNoRef = ownAffId && !c.referrer_id;

                    if (isSelfReferrer || hasOwnAffNoRef) {
                        // ★ Self-order: referrer chính là TK mình, HOẶC có TK nhưng không có referrer ngoài → 10% lifetime
                        c.next_aff_rate = 10;
                    } else if (!c.referrer_id) {
                        // Không có referrer + không có TK affiliate → 0%
                        c.next_aff_rate = 0;
                    } else if (completedSet.has(c.id)) {
                        // Referrer ngoài + first-order-only done → 0%
                        c.next_aff_rate = 0;
                    } else {
                        // Referrer ngoài + chưa completed → check parent
                        c.next_aff_rate = parentMap[c.referrer_id] ? 15 : 10;
                    }
                }
            }
        } catch (e) {
            console.error('[next_aff_rate] Error:', e.message);
            // Fallback: don't break API
        }

        // ★ Smart Deadline: Tính cancel_deadline_at cho pending cancel requests
        // Để frontend hiển thị countdown chính xác (skip CN, lễ, nghỉ phép) — đồng bộ với cron auto-revert
        try {
            const pendingCancels = customers.filter(c =>
                c.cancel_requested_at && (
                    (Number(c.cancel_requested) === 1 && Number(c.cancel_approved) === 0) ||
                    c.order_status === 'cho_duyet_huy' || c.order_status === 'cho_duyet_huy_don'
                )
            );
            for (const c of pendingCancels) {
                const dl = await calculateRealDeadline(c.cancel_requested_at, null, 23);
                c.cancel_deadline_at = dl.toISOString();
            }
        } catch (e) {
            console.error('[cancel_deadline_at] Error:', e.message);
        }

        return { customers };
    });

    fastify.get('/api/customers/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const customer = await db.get(
            `SELECT c.*,
             s.name as source_name, p.name as promotion_name, i.name as industry_name,
             r.full_name as receiver_name, a.full_name as assigned_to_name,
             cb.full_name as created_by_name, ref.full_name as referrer_name, COALESCE((SELECT sc.crm_type FROM customers sc WHERE sc.id = ref.source_customer_id), CASE ref.role WHEN 'hoa_hong' THEN 'ctv_hoa_hong' WHEN 'tkaffiliate' THEN 'ctv_hoa_hong' WHEN 'ctv' THEN 'ctv' ELSE ref.source_crm_type END) as referrer_user_crm_type,
             rc.customer_name as referrer_customer_name, rc.crm_type as referrer_crm_type
             FROM customers c
             LEFT JOIN settings_sources s ON c.source_id = s.id
             LEFT JOIN settings_promotions p ON c.promotion_id = p.id
             LEFT JOIN settings_industries i ON c.industry_id = i.id
             LEFT JOIN users r ON c.receiver_id = r.id
             LEFT JOIN users a ON c.assigned_to_id = a.id
             LEFT JOIN users cb ON c.created_by = cb.id
             LEFT JOIN users ref ON c.referrer_id = ref.id
             LEFT JOIN customers rc ON c.referrer_customer_id = rc.id
             WHERE c.id = ?`,
            [Number(request.params.id)]
        );
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        const user = request.user;
        if ((user.role === 'quan_ly' || user.role === 'truong_phong') && customer.assigned_to_id !== user.id) {
            maskCustomerData(customer);
        }

        // Mask phone/link/address for affiliate roles viewing non-direct referrals
        if (AFFILIATE_ROLES.includes(user.role) && customer.referrer_id !== user.id) {
            maskCustomerData(customer, { maskAddress: true });
        }

        const activeOrder = await db.get('SELECT id FROM order_codes WHERE customer_id = ? AND status = \'active\' ORDER BY id DESC LIMIT 1', [Number(request.params.id)]);
        const items = activeOrder
            ? await db.all('SELECT * FROM order_items WHERE customer_id = ? AND order_code_id = ? ORDER BY id', [Number(request.params.id), activeOrder.id])
            : await db.all('SELECT * FROM order_items WHERE customer_id = ? AND order_code_id IS NULL ORDER BY id', [Number(request.params.id)]);
        return { customer, items };
    });

    fastify.put('/api/customers/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const { crm_type, customer_name, phone, source_id, promotion_id, industry_id,
                receiver_id, order_status, notes } = request.body || {};

        // Check phone: only block if matches internal user
        if (phone) {
            const userError = await checkPhoneUser(phone, { userId: null });
            if (userError) return reply.code(400).send({ error: userError });
        }
        await db.run(
            `UPDATE customers SET
             crm_type = COALESCE(?, crm_type), customer_name = COALESCE(?, customer_name),
             phone = COALESCE(?, phone), source_id = ?, promotion_id = ?, industry_id = ?,
             receiver_id = ?, order_status = COALESCE(?, order_status),
             notes = COALESCE(?, notes), updated_at = NOW()
             WHERE id = ?`,
            [crm_type || null, customer_name || null, phone || null,
             source_id ? Number(source_id) : null, promotion_id ? Number(promotion_id) : null,
             industry_id ? Number(industry_id) : null,
             receiver_id ? Number(receiver_id) : null, order_status || null, notes || null,
             Number(request.params.id)]
        );
        return { success: true, message: 'Cập nhật khách hàng thành công' };
    });

    fastify.put('/api/customers/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
        const { order_status, order_total } = request.body || {};
        const validStatuses = ['dang_tu_van', 'bao_gia', 'dat_coc', 'chot_don', 'san_xuat', 'giao_hang', 'hoan_thanh'];
        if (!validStatuses.includes(order_status)) return reply.code(400).send({ error: 'Trạng thái không hợp lệ' });

        const custId = Number(request.params.id);
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [custId]);
        await db.run("UPDATE customers SET order_status = ?, updated_at = NOW() WHERE id = ?", [order_status, custId]);

        if (order_status === 'chot_don' && customer?.referrer_id) {
            const totalRow = await db.get(`SELECT COALESCE(SUM(sub.rev), 0) as grand_total FROM (
                SELECT COALESCE(
                    (SELECT SUM(di.item_total) FROM dht_orders d JOIN dht_order_items di ON di.dht_order_id = d.id WHERE d.order_code = oc.order_code),
                    (SELECT SUM(oi_f.total) FROM order_items oi_f WHERE oi_f.order_code_id = oc.id),
                    0
                ) - COALESCE((SELECT d2.vat_amount FROM dht_orders d2 WHERE d2.order_code = oc.order_code), 0)
                  - COALESCE(oc.discount_amount, 0) as rev
                FROM order_codes oc WHERE oc.customer_id = $1 AND COALESCE(oc.status, 'active') != 'cancelled'
                GROUP BY oc.id, oc.order_code, oc.discount_amount
            ) sub`, [custId]);
            const grandTotal = order_total ? Number(order_total) : (totalRow?.grand_total || 0);
            if (grandTotal > 0) {
                const ctv = await db.get('SELECT u.*, ct.percentage FROM users u LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id WHERE u.id = ?', [customer.referrer_id]);
                if (ctv && ctv.percentage) {
                    // ★ FIRST-ORDER-ONLY: check if this customer already has a prior non-cancelled order
                    let _fooSkipComm = false;
                    try {
                        const _fooCfg = await db.get("SELECT value FROM app_config WHERE key = 'commission_first_order_cutoff'");
                        if (_fooCfg?.value) {
                            const _fooCutoff = new Date(_fooCfg.value);
                            if (new Date() >= _fooCutoff) {
                                // Check if self-order (exempt)
                                const isSelfCust = ctv.source_customer_id && ctv.source_customer_id === custId;
                                if (!isSelfCust) {
                                    // Count non-cancelled orders. If > 1, this is a repeat customer
                                    const orderCount = await db.get("SELECT COUNT(*) as cnt FROM order_codes WHERE customer_id = ? AND status != 'cancelled'", [custId]);
                                    if (orderCount && orderCount.cnt > 1) _fooSkipComm = true;
                                }
                            }
                        }
                    } catch(e) { /* fallback: allow commission */ }

                    if (!_fooSkipComm) {
                        const commission = Math.round(grandTotal * ctv.percentage / 100);
                        await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [commission, customer.referrer_id]);
                        const tgMsg = `💰 <b>Hoa Hồng</b>\nCTV: ${ctv.full_name}\nKhách: <code>${customer.customer_name}</code>\nDoanh số: ${grandTotal.toLocaleString('vi-VN')} VNĐ\nChiết khấu: ${ctv.percentage}%\nHoa hồng: <b>${commission.toLocaleString('vi-VN')} VNĐ</b>`;
                        notifyTelegram(customer.referrer_id, 'chuyen_so', tgMsg);
                    }
                }
            }
        }

        if (customer) {
            const statusLabels = { dang_tu_van: 'Đang Tư Vấn', bao_gia: 'Báo Giá', dat_coc: 'Đặt Cọc', chot_don: 'Chốt Đơn', san_xuat: 'Sản Xuất', giao_hang: 'Giao Hàng', hoan_thanh: 'Hoàn Thành' };
            const tgMsg = `📝 <b>Cập nhật trạng thái</b>\nKhách: <code>${customer.customer_name}</code> - ${customer.phone}\nTrạng thái: <b>${statusLabels[order_status]}</b>\nBởi: ${request.user.full_name}`;
            notifyTelegram(customer.assigned_to_id, 'chuyen_so', tgMsg);
        }
        return { success: true, message: 'Cập nhật trạng thái thành công' };
    });

    const saveItems = async (request, reply) => {
        const { items } = request.body || {};
        const custId = Number(request.params.id);
        // Find active order
        const activeOrder = await db.get('SELECT id FROM order_codes WHERE customer_id = ? AND status = \'active\' ORDER BY id DESC LIMIT 1', [custId]);
        const orderCodeId = activeOrder?.id || null;
        // Delete items for this specific order (or all if no order)
        if (orderCodeId) {
            await db.run('DELETE FROM order_items WHERE customer_id = ? AND order_code_id = ?', [custId, orderCodeId]);
        } else {
            await db.run('DELETE FROM order_items WHERE customer_id = ? AND order_code_id IS NULL', [custId]);
        }
        if (items && items.length > 0) {
            for (const item of items) {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unit_price) || 0;
                await db.run('INSERT INTO order_items (customer_id, description, quantity, unit_price, total, order_code_id) VALUES (?,?,?,?,?,?)',
                    [custId, item.description || '', qty, price, qty * price, orderCodeId]);
            }
        }
        const totalRow = orderCodeId
            ? await db.get('SELECT SUM(total) as grand_total FROM order_items WHERE customer_id = ? AND order_code_id = ?', [custId, orderCodeId])
            : await db.get('SELECT SUM(total) as grand_total FROM order_items WHERE customer_id = ?', [custId]);
        return { success: true, grand_total: totalRow?.grand_total || 0, message: 'Cập nhật đơn hàng thành công' };
    };
    fastify.post('/api/customers/:id/items', { preHandler: [authenticate] }, saveItems);
    fastify.put('/api/customers/:id/items', { preHandler: [authenticate] }, saveItems);

    fastify.put('/api/customers/:id/info', { preHandler: [authenticate] }, async (request, reply) => {
        const custId = Number(request.params.id);
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [custId]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        const { customer_name, phone, address, province, job, birthday, customer_holidays } = request.body || {};
        const updates = [];
        const params = [];
        if (customer_name !== undefined) { updates.push('customer_name = ?'); params.push(customer_name); }
        if (phone !== undefined) {
            if (phone && !/^\d{10}$/.test(phone)) return reply.code(400).send({ error: 'Số điện thoại phải đúng 10 chữ số' });
            // Check phone: only block if matches internal user (UID system allows duplicate customer phones)
            if (phone) {
                const userError = await checkPhoneUser(phone);
                if (userError) return reply.code(400).send({ error: userError });
            }
            updates.push('phone = ?'); params.push(phone);
        }
        if (address !== undefined) { updates.push('address = ?'); params.push(address); }
        if (province !== undefined) { updates.push('province = ?'); params.push(province); }
        if (job !== undefined) { updates.push('job = ?'); params.push(job); }
        if (birthday !== undefined) { updates.push('birthday = ?'); params.push(birthday || null); }
        if (customer_holidays !== undefined) { updates.push('customer_holidays = ?'); params.push(JSON.stringify(customer_holidays)); }

        if (updates.length === 0) return reply.code(400).send({ error: 'Không có thông tin cần cập nhật' });

        updates.push("updated_at = NOW()");
        params.push(custId);
        await db.run(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, params);
        return { success: true, message: 'Đã cập nhật thông tin khách hàng!' };
    });

    fastify.get('/api/customers/:id/consult-logs', { preHandler: [authenticate] }, async (request, reply) => {
        const logs = await db.all(
            `SELECT cl.*, u.full_name as logged_by_name FROM consultation_logs cl
             LEFT JOIN users u ON cl.logged_by = u.id
             WHERE cl.customer_id = ? ORDER BY cl.created_at DESC, CASE WHEN cl.log_type = 'hoan_thanh_cap_cuu' THEN 0 ELSE 1 END, cl.id DESC`,
            [Number(request.params.id)]
        );
        return { logs };
    });

    fastify.get('/api/customers/:id/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const custId = Number(request.params.id);
        const activeOrder = await db.get('SELECT id FROM order_codes WHERE customer_id = ? AND status = \'active\' ORDER BY id DESC LIMIT 1', [custId]);
        const items = activeOrder
            ? await db.all('SELECT * FROM order_items WHERE customer_id = ? AND order_code_id = ? ORDER BY id', [custId, activeOrder.id])
            : [];
        return { items, active_order_id: activeOrder?.id || null };
    });

    // ========== CRM ORDER PREFIX MAPPING ==========
    // Determines order code prefix based on customer's origin source
    const CRM_ORDER_PREFIX = {
        ctv: 'CTV-',
        ctv_hoa_hong: 'AFF-',
        koc_tiktok: 'KOC-'
    };

    async function getCrmOrderPrefix(customerId) {
        if (!customerId) return '';
        const customer = await db.get('SELECT crm_type, referrer_id, referrer_customer_id FROM customers WHERE id = ?', [Number(customerId)]);
        if (!customer) return '';

        // Priority 1: If customer is directly in a non-nhu_cau CRM module
        if (customer.crm_type && customer.crm_type !== 'nhu_cau') {
            return CRM_ORDER_PREFIX[customer.crm_type] || '';
        }

        // Priority 2: If customer was referred by another CUSTOMER (referrer_customer_id)
        // e.g. KHÁCH 1 in CTV module refers KHÁCH 11 into Nhu Cầu
        if (customer.referrer_customer_id) {
            const refCustomer = await db.get('SELECT crm_type FROM customers WHERE id = ?', [customer.referrer_customer_id]);
            if (refCustomer && refCustomer.crm_type && refCustomer.crm_type !== 'nhu_cau') {
                return CRM_ORDER_PREFIX[refCustomer.crm_type] || '';
            }
        }

        // Priority 3: If customer was referred by a USER/affiliate account (referrer_id)
        // e.g. Affiliate user logs in and transfers a customer via "Chuyển Số"
        if (customer.referrer_id) {
            const referrer = await db.get('SELECT source_crm_type, source_customer_id, role FROM users WHERE id = ?', [customer.referrer_id]);
            if (referrer) {
                // Best: trace back to source customer for accurate crm_type
                if (referrer.source_customer_id) {
                    const srcCust = await db.get('SELECT crm_type FROM customers WHERE id = ?', [referrer.source_customer_id]);
                    if (srcCust && srcCust.crm_type && srcCust.crm_type !== 'nhu_cau') {
                        return CRM_ORDER_PREFIX[srcCust.crm_type] || '';
                    }
                }
                // Fallback: role mapping (always correct for hoa_hong/tkaffiliate)
                const ROLE_TO_CRM = { hoa_hong: 'ctv_hoa_hong', ctv: 'ctv', tkaffiliate: 'ctv_hoa_hong' };
                const mappedCrm = ROLE_TO_CRM[referrer.role];
                if (mappedCrm) return CRM_ORDER_PREFIX[mappedCrm] || '';
                // Last resort: user's source_crm_type (may be stale)
                if (referrer.source_crm_type) {
                    return CRM_ORDER_PREFIX[referrer.source_crm_type] || '';
                }
            }
        }

        // Priority 4: Pure nhu_cau customer (no referrer) → no prefix
        return '';
    }

    async function getNextOrderNumber(userId) {
        const lastCode = await db.get('SELECT order_code FROM order_codes WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
        let nextNum = 1;
        if (lastCode) {
            // ★ Chỉ lấy 4 chữ số cuối (padStart(4, '0')) — tránh bắt nhầm số trong prefix
            const match = lastCode.order_code.match(/(\d{4})$/);
            if (match) nextNum = parseInt(match[1]) + 1;
        }
        return nextNum;
    }

    fastify.get('/api/order-codes/next', { preHandler: [authenticate] }, async (request, reply) => {
        const userRow = await db.get('SELECT order_code_prefix FROM users WHERE id = ?', [request.user.id]);
        const prefix = userRow?.order_code_prefix;
        if (!prefix) return { order_code: null, error: 'Chưa cài đặt mã đơn cho nhân viên này' };

        const nextNum = await getNextOrderNumber(request.user.id);
        const { customer_id } = request.query;
        const crmPrefix = await getCrmOrderPrefix(customer_id);

        return { order_code: crmPrefix + prefix + String(nextNum).padStart(4, '0'), prefix, crmPrefix, existing: false };
    });

    fastify.post('/api/order-codes', { preHandler: [authenticate] }, async (request, reply) => {
        const { customer_id } = request.body || {};
        const userId = request.user.id;
        const userRow = await db.get('SELECT order_code_prefix FROM users WHERE id = ?', [userId]);
        const prefix = userRow?.order_code_prefix;
        if (!prefix) return reply.code(400).send({ error: 'Chưa cài đặt mã đơn cho nhân viên này' });

        const nextNum = await getNextOrderNumber(userId);
        const crmPrefix = await getCrmOrderPrefix(customer_id);
        const orderCode = crmPrefix + prefix + String(nextNum).padStart(4, '0');

        const result = await db.run('INSERT INTO order_codes (customer_id, user_id, order_code, status) VALUES (?, ?, ?, \'active\')', [Number(customer_id), userId, orderCode]);

        // ★ V4.1: Backfill order_tt_coc on deposit payment records for this customer
        // At dat_coc time, order_code didn't exist yet → order_tt_coc was NULL
        // Now that order_code is created, link it to the deposit records
        const cust = await db.get('SELECT phone FROM customers WHERE id = ?', [Number(customer_id)]);
        if (cust?.phone) {
            await db.run(`
                UPDATE payment_records SET
                    order_tt_coc = $1,
                    updated_at = NOW()
                WHERE customer_phone = $2
                  AND payment_type = 'dat_coc'
                  AND (order_tt_coc IS NULL OR order_tt_coc = '')
            `, [orderCode, cust.phone]);
        }

        return { success: true, order_code: orderCode, order_id: result?.lastID };
    });

    // Per-order completion (from popup)
    fastify.post('/api/order-codes/:id/complete', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);
        const order = await db.get('SELECT oc.*, c.referrer_id FROM order_codes oc JOIN customers c ON c.id = oc.customer_id WHERE oc.id = ?', [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });
        // Permission: only order creator or giam_doc
        if (order.user_id !== request.user.id && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ NV tạo đơn hoặc Giám Đốc mới được hoàn thành đơn' });
        }
        if (order.status === 'completed') return reply.code(400).send({ error: 'Đơn đã hoàn thành rồi' });
        // Mark order completed
        await db.run("UPDATE order_codes SET status = 'completed' WHERE id = ?", [orderId]);
        // Calculate commission for this order
        const grandTotalRow = await db.get(`SELECT COALESCE(
            (SELECT SUM(di.item_total) FROM dht_orders d JOIN dht_order_items di ON di.dht_order_id = d.id WHERE d.order_code = oc.order_code),
            (SELECT SUM(oi_f.total) FROM order_items oi_f WHERE oi_f.order_code_id = oc.id),
            0
        ) - COALESCE((SELECT d2.vat_amount FROM dht_orders d2 WHERE d2.order_code = oc.order_code), 0)
          - COALESCE(oc.discount_amount, 0) as t
        FROM order_codes oc WHERE oc.id = $1`, [orderId]);
        const grandTotal = { t: grandTotalRow?.t || 0 };
        if (order.referrer_id && grandTotal?.t) {
            const referrer = await db.get('SELECT u.*, ct.percentage FROM users u LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id WHERE u.id = ?', [order.referrer_id]);
            if (referrer?.percentage) {
                // ★ FIRST-ORDER-ONLY: check if this is a repeat order
                let _fooSkipComm2 = false;
                try {
                    const _fooCfg2 = await db.get("SELECT value FROM app_config WHERE key = 'commission_first_order_cutoff'");
                    if (_fooCfg2?.value && new Date() >= new Date(_fooCfg2.value)) {
                        const isSelfCust2 = referrer.source_customer_id && referrer.source_customer_id === order.customer_id;
                        if (!isSelfCust2) {
                            const orderCount2 = await db.get("SELECT COUNT(*) as cnt FROM order_codes WHERE customer_id = ? AND status != 'cancelled'", [order.customer_id]);
                            if (orderCount2 && orderCount2.cnt > 1) _fooSkipComm2 = true;
                        }
                    }
                } catch(e) { /* fallback: allow */ }

                if (!_fooSkipComm2) {
                    const commission = Math.round(grandTotal.t * referrer.percentage / 100);
                    await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [commission, referrer.id]);
                }
            }
        }
        // Check if this is the latest order → move customer to sau_ban_hang
        const latestOrder = await db.get('SELECT id FROM order_codes WHERE customer_id = ? ORDER BY id DESC LIMIT 1', [order.customer_id]);
        if (latestOrder && latestOrder.id === orderId) {
            await db.run("UPDATE customers SET order_status = 'hoan_thanh', updated_at = NOW() WHERE id = ?", [order.customer_id]);
        }
        return { success: true, message: 'Đã hoàn thành đơn!' };
    });

    // Per-order cancellation
    fastify.post('/api/order-codes/:id/cancel', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);
        const order = await db.get('SELECT * FROM order_codes WHERE id = ?', [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });
        if (order.user_id !== request.user.id && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ NV tạo đơn hoặc Giám Đốc mới được hủy đơn' });
        }
        await db.run("UPDATE order_codes SET status = 'cancelled' WHERE id = ?", [orderId]);
        return { success: true, message: 'Đã hủy đơn!' };
    });

    // ★ Lấy ngày chuyển CRM sang Affiliate cho 1 KH (dùng cho Silent Freeze)
    fastify.get('/api/customers/:id/conversion-date', { preHandler: [authenticate] }, async (request, reply) => {
        const custId = Number(request.params.id);
        const row = await db.get(`
            SELECT COALESCE(processed_at, created_at) as conv_date
            FROM crm_conversion_requests
            WHERE customer_id = ? AND to_crm_type = 'ctv_hoa_hong' AND status IN ('approved', 'pending')
            ORDER BY created_at ASC LIMIT 1
        `, [custId]);
        return { conv_date: row?.conv_date || null };
    });

    fastify.get('/api/customers/:id/order-codes', { preHandler: [authenticate] }, async (request, reply) => {
        const custId = Number(request.params.id);
        const codes = await db.all(
            `SELECT oc.*, u.full_name as user_name FROM order_codes oc LEFT JOIN users u ON oc.user_id = u.id WHERE oc.customer_id = ? ORDER BY oc.id DESC`, [custId]);
        // Get items and deposit for each order
        // ★ Priority: DHT is source of truth. Fallback to CRM order_items for pre-DHT orders.
        // ★ Cọc thuộc về đơn tạo SAU nó: range (previous_order.created_at, current_order.created_at]
        for (const code of codes) {
            // ★ Cross-reference DHT: check if this order_code exists in dht_orders
            const dhtOrder = await db.get(
                'SELECT id, total_amount, discount_amount, vat_amount, surcharges, total_quantity, shipping_status FROM dht_orders WHERE order_code = $1',
                [code.order_code]
            );
            if (dhtOrder) {
                // DHT has the real product data — use it
                code.items = await db.all(
                    `SELECT product_name as description, quantity, unit_price, item_total as total
                     FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id`,
                    [dhtOrder.id]
                );
                code.dht_order_id = dhtOrder.id;
                code.dht_total = Number(dhtOrder.total_amount) || 0;
                code.dht_discount = Number(dhtOrder.discount_amount) || 0;
                code.dht_vat = Number(dhtOrder.vat_amount) || 0;
                // Parse surcharges JSON to get total surcharge amount
                let _surcharges = [];
                try { _surcharges = typeof dhtOrder.surcharges === 'string' ? JSON.parse(dhtOrder.surcharges) : (dhtOrder.surcharges || []); } catch(e){}
                code.dht_surcharges = _surcharges.reduce((s, x) => s + (Number(x.amount) || 0), 0);
                code.dht_shipping_status = dhtOrder.shipping_status;
            } else {
                // Fallback: CRM order_items (đơn chưa lên DHT)
                code.items = await db.all('SELECT * FROM order_items WHERE order_code_id = ? ORDER BY id', [code.id]);
            }
            // ★ Deposit: check payment_records linked via order_code (DHT flow) first, then fallback to consultation_logs
            let depositFromPayments = 0;
            if (code.order_code) {
                const prDep = await db.get(
                    `SELECT COALESCE(SUM(amount), 0) as dep FROM payment_records WHERE total_order_codes ILIKE '%' || $1 || '%'`,
                    [code.order_code]
                );
                depositFromPayments = Number(prDep?.dep) || 0;
            }
            const depRow = await db.get(`
                SELECT COALESCE(SUM(deposit_amount), 0) as dep 
                FROM consultation_logs 
                WHERE customer_id = $1 
                  AND log_type = 'dat_coc' 
                  AND created_at <= $2
                  AND created_at > COALESCE(
                    (SELECT created_at FROM order_codes WHERE customer_id = $3 AND id < $4 ORDER BY id DESC LIMIT 1), 
                    '1970-01-01'
                  )
            `, [custId, code.created_at, custId, code.id]);
            const depositFromLogs = Number(depRow?.dep) || 0;
            code.deposit = Math.max(depositFromPayments, depositFromLogs);
        }
        const depositRow = await db.get(`SELECT COALESCE(SUM(deposit_amount), 0) as total_deposit FROM consultation_logs WHERE customer_id = ? AND log_type = 'dat_coc'`, [custId]);
        return { codes, total_deposit: depositRow?.total_deposit || 0 };
    });

    // ========== CHECK PARTNER OUTREACH — Auto-detect khi nhập SĐT/Link ==========
    fastify.get('/api/customers/check-partner-outreach', { preHandler: [authenticate] }, async (request, reply) => {
        const { phone, link } = request.query;
        if ((!phone || phone.trim().length < 3) && (!link || link.trim().length < 5)) return { match: null };

        let row = null;
        if (phone && phone.trim().length >= 3) {
            row = await db.get(
                `SELECT e.id, e.partner_name, e.phone, e.fb_link, e.transferred_to_crm,
                 c.name as category_name
                 FROM partner_outreach_entries e
                 LEFT JOIN partner_outreach_categories c ON e.category_id = c.id
                 WHERE REPLACE(e.phone, ' ', '') LIKE $1
                 ORDER BY e.created_at DESC LIMIT 1`,
                [`%${phone.trim()}%`]
            );
        }
        if (!row && link && link.trim().length >= 5) {
            row = await db.get(
                `SELECT e.id, e.partner_name, e.phone, e.fb_link, e.transferred_to_crm,
                 c.name as category_name
                 FROM partner_outreach_entries e
                 LEFT JOIN partner_outreach_categories c ON e.category_id = c.id
                 WHERE LOWER(e.fb_link) = $1
                 ORDER BY e.created_at DESC LIMIT 1`,
                [link.trim().toLowerCase()]
            );
        }
        if (!row) return { match: null };
        return {
            match: {
                id: row.id,
                partner_name: row.partner_name,
                phone: row.phone,
                fb_link: row.fb_link,
                category_name: row.category_name,
                already_transferred: !!row.transferred_to_crm
            }
        };
    });

    // ========== SMART SEARCH — Tìm SĐT/Link qua tất cả công việc ==========
    fastify.get('/api/customers/search-modules', { preHandler: [authenticate] }, async (request, reply) => {
        const { q } = request.query;
        if (!q || q.trim().length < 3) return { results: [] };
        const search = q.trim();
        const searchLower = search.toLowerCase();
        const isPhone = /^\d+$/.test(search);

        const results = [];

        // 1. Tìm trong telesale_data (Gọi Điện Telesale / Hệ Thống Phân Chia)
        try {
            let telesaleRows;
            if (isPhone) {
                telesaleRows = await db.all(
                    `SELECT d.id, d.customer_name, d.phone, d.fb_link, d.created_at,
                     s.name as source_name, s.crm_type,
                     u.full_name as assigned_user_name
                     FROM telesale_data d
                     LEFT JOIN telesale_sources s ON s.id = d.source_id
                     LEFT JOIN users u ON u.id = d.last_assigned_user_id
                     WHERE d.phone ILIKE $1
                     ORDER BY d.created_at DESC LIMIT 10`,
                    [`%${search}%`]
                );
            } else {
                telesaleRows = await db.all(
                    `SELECT d.id, d.customer_name, d.phone, d.fb_link, d.created_at,
                     s.name as source_name, s.crm_type,
                     u.full_name as assigned_user_name
                     FROM telesale_data d
                     LEFT JOIN telesale_sources s ON s.id = d.source_id
                     LEFT JOIN users u ON u.id = d.last_assigned_user_id
                     WHERE LOWER(d.fb_link) LIKE $1 OR LOWER(d.customer_name) LIKE $1
                     ORDER BY d.created_at DESC LIMIT 10`,
                    [`%${searchLower}%`]
                );
            }
            for (const row of telesaleRows) {
                results.push({
                    module: 'telesale',
                    module_label: '📞 Gọi Điện Telesale',
                    cong_viec: 'Gọi Điện Telesale',
                    id: row.id,
                    customer_name: row.customer_name || '',
                    phone: row.phone || '',
                    link: row.fb_link || '',
                    source_name: row.source_name || '',
                    assigned_to: row.assigned_user_name || '',
                    created_at: row.created_at
                });
            }
        } catch(e) { console.error('[SearchModules] telesale error:', e.message); }

        // 2. Tìm trong partner_outreach_entries (Nhắn Tìm Đối Tác KH)
        try {
            let poRows;
            if (isPhone) {
                poRows = await db.all(
                    `SELECT e.id, e.partner_name, e.phone, e.fb_link, e.created_at, e.entry_date,
                     u.full_name as user_name, c.name as category_name
                     FROM partner_outreach_entries e
                     LEFT JOIN users u ON e.user_id = u.id
                     LEFT JOIN partner_outreach_categories c ON e.category_id = c.id
                     WHERE REPLACE(e.phone, ' ', '') LIKE $1
                     ORDER BY e.created_at DESC LIMIT 10`,
                    [`%${search}%`]
                );
            } else {
                poRows = await db.all(
                    `SELECT e.id, e.partner_name, e.phone, e.fb_link, e.created_at, e.entry_date,
                     u.full_name as user_name, c.name as category_name
                     FROM partner_outreach_entries e
                     LEFT JOIN users u ON e.user_id = u.id
                     LEFT JOIN partner_outreach_categories c ON e.category_id = c.id
                     WHERE LOWER(e.fb_link) LIKE $1 OR LOWER(e.partner_name) LIKE $1
                     ORDER BY e.created_at DESC LIMIT 10`,
                    [`%${searchLower}%`]
                );
            }
            for (const row of poRows) {
                results.push({
                    module: 'partner_outreach',
                    module_label: '💬 Nhắn Tìm Đối Tác KH',
                    cong_viec: 'Nhắn Tìm Đối Tác KH KOL Tiktok',
                    id: row.id,
                    customer_name: row.partner_name || '',
                    phone: row.phone || '',
                    link: row.fb_link || '',
                    source_name: row.category_name || '',
                    assigned_to: row.user_name || '',
                    created_at: row.created_at
                });
            }
        } catch(e) { console.error('[SearchModules] partner_outreach error:', e.message); }

        // 3. Tìm trong daily_link_entries (Add/Cmt, Đăng Video, Đăng Content, Đăng Group, Sedding, Tuyển Dụng)
        try {
            const MODULE_LABELS = {
                addcmt: '👥 Add/Cmt Đối Tác KH',
                dang_video: '🎬 Đăng Video Isocal',
                dang_content: '✍️ Đăng Content Isocal',
                dang_group: '📢 Đăng & Tìm KH Group',
                sedding: '🌐 Sedding Cộng Đồng',
                tuyen_dung: '🎓 Tuyển Dụng SV KD',
                tim_gr_zalo: '🔍 Tìm Gr Zalo Và Join',
                dang_banthan_sp: '📸 Đăng Bản Thân & Sản Phẩm'
            };
            const CONG_VIEC_MAP = {
                addcmt: 'Add/Cmt Đối Tác KH',
                dang_video: 'Đăng Video Isocal',
                dang_content: 'Đăng Content Isocal',
                dang_group: 'Đăng & Tìm KH Group',
                sedding: 'Sedding Cộng Đồng & Lẫn Nhau',
                tuyen_dung: 'Tuyển Dụng SV KD',
                tim_gr_zalo: 'Tìm Gr Zalo Và Join',
                dang_banthan_sp: 'Đăng Bản Thân & Sản Phẩm'
            };
            const dlRows = await db.all(
                `SELECT e.id, e.fb_link, e.module_type, e.created_at, e.entry_date,
                 u.full_name as user_name
                 FROM daily_link_entries e
                 LEFT JOIN users u ON e.user_id = u.id
                 WHERE LOWER(e.fb_link) LIKE $1
                 ORDER BY e.created_at DESC LIMIT 10`,
                [`%${searchLower}%`]
            );
            for (const row of dlRows) {
                results.push({
                    module: 'daily_links',
                    module_label: MODULE_LABELS[row.module_type] || `📋 ${row.module_type}`,
                    cong_viec: CONG_VIEC_MAP[row.module_type] || row.module_type,
                    id: row.id,
                    customer_name: '',
                    phone: '',
                    link: row.fb_link || '',
                    source_name: '',
                    assigned_to: row.user_name || '',
                    created_at: row.created_at
                });
            }
        } catch(e) { console.error('[SearchModules] daily_links error:', e.message); }

        // 4. Cross-check: đánh dấu kết quả đã tồn tại trong CRM (đã chuyển số)
        try {
            for (const r of results) {
                let found = false;
                if (r.phone && r.phone.trim()) {
                    const dup = await db.get('SELECT id FROM customers WHERE phone LIKE $1 LIMIT 1', [`%${r.phone.trim()}%`]);
                    if (dup) found = true;
                }
                if (!found && r.link && r.link.trim()) {
                    const dup = await db.get('SELECT id FROM customers WHERE LOWER(facebook_link) = $1 LIMIT 1', [r.link.trim().toLowerCase()]);
                    if (dup) found = true;
                }
                r.already_transferred = found;
            }
        } catch(e) { console.error('[SearchModules] cross-check error:', e.message); }

        return { results };
    });

    // Cancel + approve-cancel + emergencies + dashboard + withdrawals in next part
    require('./customers_part2')(fastify, db, getManagedDeptIds);
}

module.exports = customersRoutes;
