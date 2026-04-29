const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendTelegramMessage, broadcastTelegram } = require('../utils/telegram');
const { checkPhoneDuplicate } = require('../utils/phoneCheck');
const { maskCustomerData } = require('../utils/dataMasking');

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
                receiver_id, notes, affiliate_user_id, job, facebook_link, cong_viec } = request.body || {};
        if (!crm_type) return reply.code(400).send({ error: 'Vui lòng chọn CRM' });
        if (!phone && !facebook_link) return reply.code(400).send({ error: 'Vui lòng nhập SĐT hoặc Link Facebook' });
        if (phone && !/^\d{10}$/.test(phone)) return reply.code(400).send({ error: 'Số điện thoại phải đúng 10 chữ số' });

        // Check phone uniqueness across system (only if phone provided)
        if (phone) {
            const phoneError = await checkPhoneDuplicate(phone);
            if (phoneError) return reply.code(400).send({ error: phoneError });
        }

        // Auto-lookup source_id from source_name if source_id not provided
        let resolvedSourceId = source_id ? Number(source_id) : null;
        if (!resolvedSourceId && source_name) {
            const srcRow = await db.get('SELECT id FROM settings_sources WHERE UPPER(name) = UPPER($1) LIMIT 1', [source_name.trim()]);
            if (srcRow) resolvedSourceId = srcRow.id;
        }

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

        const now = new Date(Date.now() + 7*3600000);
        const today = now.toISOString().split('T')[0];
        const maxNum = await db.get(
            "SELECT COALESCE(MAX(daily_order_number), 0) as mx FROM customers WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ?::date AND assigned_to_id = ?",
            [today, actualReceiverId]
        );
        const dailyNum = (maxNum?.mx || 0) + 1;

        const result = await db.run(
            `INSERT INTO customers (crm_type, customer_name, phone, phone2, source_id, promotion_id,
             industry_id, receiver_id, assigned_to_id, notes, daily_order_number, created_by, referrer_id, job, facebook_link, cong_viec)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [crm_type, customer_name || null, phone || null, phone2 || null,
             resolvedSourceId, promotion_id ? Number(promotion_id) : null,
             industry_id ? Number(industry_id) : null,
             actualReceiverId, actualReceiverId, notes || null, dailyNum,
             request.user.id, referrerId, job || null, facebook_link || null, cong_viec || null]
        );

        const code = `${dailyNum}-${now.getUTCDate()}-${now.getUTCMonth() + 1}`;
        const sourceName = resolvedSourceId ? (await db.get('SELECT name FROM settings_sources WHERE id = ?', [resolvedSourceId]))?.name : '';
        const promoName = promotion_id ? (await db.get('SELECT name FROM settings_promotions WHERE id = ?', [Number(promotion_id)]))?.name : '';
        const industryName = industry_id ? (await db.get('SELECT name FROM settings_industries WHERE id = ?', [Number(industry_id)]))?.name : '';
        const receiverUser = actualReceiverId ? await db.get('SELECT full_name, telegram_group_id FROM users WHERE id = ?', [actualReceiverId]) : null;
        const crmLabels = { nhu_cau: 'Chăm Sóc KH Nhu Cầu', ctv: 'Chăm Sóc CTV', ctv_hoa_hong: 'Chăm Sóc Affiliate', koc_tiktok: 'Chăm Sóc KOL/KOC Tiktok' };

        const tgMessage = `📱 <b>${code}</b> : ${customer_name} - ${phone} - ${crmLabels[crm_type] || crm_type} - ${sourceName || 'N/A'} - ${receiverUser?.full_name || 'N/A'} - ${promoName || 'N/A'} - ${industryName || 'N/A'}`;
        const targetIds = [];
        if (receiverUser?.telegram_group_id) targetIds.push(receiverUser.telegram_group_id);
        const globalId = process.env.TELEGRAM_GROUP_ID;
        if (globalId) targetIds.push(globalId);
        broadcastTelegram(targetIds, tgMessage);

        // Auto-update partner_outreach_entries: mark as transferred
        try {
            if (phone && phone.trim()) {
                await db.run(`UPDATE partner_outreach_entries SET transferred_to_crm = TRUE, transferred_at = NOW(), crm_data_id = $1 WHERE REPLACE(phone, ' ', '') LIKE $2 AND transferred_to_crm = FALSE`, [result.lastInsertRowid, `%${phone.trim()}%`]);
            }
            if (facebook_link && facebook_link.trim()) {
                await db.run(`UPDATE partner_outreach_entries SET transferred_to_crm = TRUE, transferred_at = NOW(), crm_data_id = $1 WHERE LOWER(fb_link) = $2 AND transferred_to_crm = FALSE`, [result.lastInsertRowid, facebook_link.trim().toLowerCase()]);
            }
        } catch(e) { console.error('[Customers] Auto-update partner_outreach error:', e.message); }

        return { success: true, id: result.lastInsertRowid, dailyNum, message: 'Chuyển số thành công!' };
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

        let query = `SELECT c.*,
            s.name as source_name, p.name as promotion_name, i.name as industry_name,
            r.full_name as receiver_name, a.full_name as assigned_to_name,
            cb.full_name as created_by_name, ref.full_name as referrer_name, ref.source_crm_type as referrer_user_crm_type,
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
        return { customers };
    });

    fastify.get('/api/customers/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const customer = await db.get(
            `SELECT c.*,
             s.name as source_name, p.name as promotion_name, i.name as industry_name,
             r.full_name as receiver_name, a.full_name as assigned_to_name,
             cb.full_name as created_by_name, ref.full_name as referrer_name, ref.source_crm_type as referrer_user_crm_type,
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

        // Check phone uniqueness across system
        if (phone) {
            const phoneError = await checkPhoneDuplicate(phone, { customerId: Number(request.params.id) });
            if (phoneError) return reply.code(400).send({ error: phoneError });
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
            const totalRow = await db.get('SELECT COALESCE(SUM(total), 0) as grand_total FROM order_items WHERE customer_id = ?', [custId]);
            const grandTotal = order_total ? Number(order_total) : (totalRow?.grand_total || 0);
            if (grandTotal > 0) {
                const ctv = await db.get('SELECT u.*, ct.percentage FROM users u LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id WHERE u.id = ?', [customer.referrer_id]);
                if (ctv && ctv.percentage) {
                    const commission = Math.round(grandTotal * ctv.percentage / 100);
                    await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [commission, customer.referrer_id]);
                    const tgMsg = `💰 <b>Hoa Hồng</b>\nCTV: ${ctv.full_name}\nKhách: ${customer.customer_name}\nDoanh số: ${grandTotal.toLocaleString('vi-VN')} VNĐ\nChiết khấu: ${ctv.percentage}%\nHoa hồng: <b>${commission.toLocaleString('vi-VN')} VNĐ</b>`;
                    const globalId = process.env.TELEGRAM_GROUP_ID;
                    if (globalId) sendTelegramMessage(globalId, tgMsg);
                }
            }
        }

        if (customer) {
            const statusLabels = { dang_tu_van: 'Đang Tư Vấn', bao_gia: 'Báo Giá', dat_coc: 'Đặt Cọc', chot_don: 'Chốt Đơn', san_xuat: 'Sản Xuất', giao_hang: 'Giao Hàng', hoan_thanh: 'Hoàn Thành' };
            const receiver = customer.assigned_to_id ? await db.get('SELECT telegram_group_id FROM users WHERE id = ?', [customer.assigned_to_id]) : null;
            const tgMsg = `📝 <b>Cập nhật trạng thái</b>\nKhách: ${customer.customer_name} - ${customer.phone}\nTrạng thái: <b>${statusLabels[order_status]}</b>\nBởi: ${request.user.full_name}`;
            if (receiver?.telegram_group_id) sendTelegramMessage(receiver.telegram_group_id, tgMsg);
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
            // Check phone uniqueness across system
            if (phone) {
                const phoneError = await checkPhoneDuplicate(phone, { customerId: custId });
                if (phoneError) return reply.code(400).send({ error: phoneError });
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
        const customer = await db.get('SELECT crm_type, referrer_id FROM customers WHERE id = ?', [Number(customerId)]);
        if (!customer) return '';

        // Priority 1: If customer is directly in a non-nhu_cau CRM module
        if (customer.crm_type && customer.crm_type !== 'nhu_cau') {
            return CRM_ORDER_PREFIX[customer.crm_type] || '';
        }

        // Priority 2: If customer is in nhu_cau but has a referrer, check referrer's source
        if (customer.referrer_id) {
            const referrer = await db.get('SELECT source_crm_type, role FROM users WHERE id = ?', [customer.referrer_id]);
            if (referrer && referrer.source_crm_type) {
                return CRM_ORDER_PREFIX[referrer.source_crm_type] || '';
            }
            // Fallback: check referrer's role if source_crm_type not set
            if (referrer) {
                const ROLE_TO_CRM = { hoa_hong: 'ctv_hoa_hong', ctv: 'ctv', tkaffiliate: 'ctv_hoa_hong' };
                const mappedCrm = ROLE_TO_CRM[referrer.role];
                if (mappedCrm) return CRM_ORDER_PREFIX[mappedCrm] || '';
            }
        }

        // Priority 3: Pure nhu_cau customer (no referrer) → no prefix
        return '';
    }

    async function getNextOrderNumber(userId) {
        const lastCode = await db.get('SELECT order_code FROM order_codes WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
        let nextNum = 1;
        if (lastCode) {
            const match = lastCode.order_code.match(/(\d+)$/);
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
        const grandTotal = await db.get('SELECT COALESCE(SUM(total), 0) as t FROM order_items WHERE order_code_id = ?', [orderId]);
        if (order.referrer_id && grandTotal?.t) {
            const referrer = await db.get('SELECT u.*, ct.percentage FROM users u LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id WHERE u.id = ?', [order.referrer_id]);
            if (referrer?.percentage) {
                const commission = Math.round(grandTotal.t * referrer.percentage / 100);
                await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [commission, referrer.id]);
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

    fastify.get('/api/customers/:id/order-codes', { preHandler: [authenticate] }, async (request, reply) => {
        const custId = Number(request.params.id);
        const codes = await db.all(
            `SELECT oc.*, u.full_name as user_name FROM order_codes oc LEFT JOIN users u ON oc.user_id = u.id WHERE oc.customer_id = ? ORDER BY oc.id DESC`, [custId]);
        // Get items and deposit for each order
        for (const code of codes) {
            code.items = await db.all('SELECT * FROM order_items WHERE order_code_id = ? ORDER BY id', [code.id]);
            const depRow = await db.get(`SELECT COALESCE(SUM(deposit_amount), 0) as dep FROM consultation_logs WHERE customer_id = ? AND log_type = 'dat_coc' AND created_at >= ? AND created_at <= COALESCE((SELECT created_at FROM order_codes WHERE customer_id = ? AND id > ? ORDER BY id ASC LIMIT 1), NOW())`, [custId, code.created_at, custId, code.id]);
            code.deposit = depRow?.dep || 0;
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
