// ========== GỬI HÀNG — Shipping Management Routes ==========
const db = require('../db/pool');
const { authenticate, requirePerm } = require('../middleware/auth');
const { vnNow, vnDateStr } = require('../utils/timezone');

// Helper: check if user belongs to Kế Toán department
async function isKeToan(userId) {
    const row = await db.get(`
        SELECT d.name FROM users u
        JOIN departments d ON u.department_id = d.id
        WHERE u.id = $1
    `, [userId]);
    if (!row || !row.name) return false;
    const n = row.name.toLowerCase();
    return n.includes('kế toán') || n.includes('ke toan');
}

module.exports = async function(fastify) {

    // ========== LIST ORDERS — 4 Filters ==========
    fastify.get('/api/shipping/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const { filter, page_type } = request.query;
        const userId = request.user.id;
        const userRole = request.user.role;

        // Determine data visibility
        const FULL_VIEW_ROLES = ['giam_doc', 'quan_ly_cap_cao'];
        let visibilityFilter = '';
        const params = [];
        let idx = 1;

        if (!FULL_VIEW_ROLES.includes(userRole)) {
            const kt = await isKeToan(userId);
            if (!kt && page_type === 'ketoan') {
                // Non-KT user on KT page — still restricted
                visibilityFilter = ` AND (o.created_by = $${idx} OR o.cskh_user_id = $${idx})`;
                params.push(userId);
                idx++;
            } else if (!kt) {
                // KD page — only own orders
                visibilityFilter = ` AND (o.created_by = $${idx} OR o.cskh_user_id = $${idx})`;
                params.push(userId);
                idx++;
            }
            // KT user sees all
        }

        // Build filter condition using effective_ship_date
        let filterWhere = '';
        let orderBy = 'o.created_at DESC';

        const todayStr = vnDateStr(vnNow());

        switch (filter) {
            case 'early':
                // Gửi Sớm: chưa đến ngày gửi, chưa gửi
                filterWhere = ` AND o.shipping_status = 'pending' AND o.expected_ship_date IS NOT NULL AND COALESCE(o.rescheduled_ship_date, o.expected_ship_date) > $${idx}::date`;
                params.push(todayStr);
                idx++;
                orderBy = 'COALESCE(o.rescheduled_ship_date, o.expected_ship_date) ASC';
                break;

            case 'today':
                // Hôm Nay Gửi: đến hạn hoặc quá hạn
                filterWhere = ` AND o.shipping_status IN ('pending','rescheduled') AND o.expected_ship_date IS NOT NULL AND COALESCE(o.rescheduled_ship_date, o.expected_ship_date) <= $${idx}::date`;
                params.push(todayStr);
                idx++;
                // Quá hạn lên đầu (ngày cũ nhất trước)
                orderBy = 'COALESCE(o.rescheduled_ship_date, o.expected_ship_date) ASC';
                break;

            case 'rescheduled':
                // Chưa Gửi: đã hẹn lại, ngày mới chưa đến
                filterWhere = ` AND o.shipping_status = 'rescheduled' AND o.rescheduled_ship_date > $${idx}::date`;
                params.push(todayStr);
                idx++;
                orderBy = 'o.rescheduled_ship_date ASC';
                break;

            case 'shipped':
                // Đã Gửi
                filterWhere = ` AND o.shipping_status = 'shipped'`;
                orderBy = 'o.shipped_at DESC NULLS LAST, o.shipping_date DESC NULLS LAST';
                break;

            default:
                // All orders with expected_ship_date
                filterWhere = ` AND o.expected_ship_date IS NOT NULL`;
                orderBy = 'o.expected_ship_date DESC';
        }

        const orders = await db.all(`
            SELECT o.id, o.order_code, o.order_date, o.expected_ship_date,
                o.rescheduled_ship_date, o.reschedule_reason,
                o.shipping_status, o.shipping_priority, o.delivery_progress,
                o.customer_name, o.customer_phone, o.province, o.address,
                o.tracking_code, o.carrier_phone, o.shipping_bill_link,
                o.completion_images, o.actual_ship_datetime,
                o.shipped_by, o.shipped_at, o.total_amount,
                o.carrier_id, o.actual_carrier_id,
                o.created_by, o.cskh_user_id,
                cr.name AS carrier_name,
                cr2.name AS actual_carrier_name,
                u_cskh.full_name AS cskh_name,
                u_created.full_name AS created_by_name,
                u_shipped.full_name AS shipped_by_name,
                COALESCE(o.rescheduled_ship_date, o.expected_ship_date) AS effective_ship_date,
                CASE WHEN o.shipping_status IN ('pending','rescheduled')
                     AND COALESCE(o.rescheduled_ship_date, o.expected_ship_date) < $${idx}::date
                     THEN true ELSE false END AS is_overdue
            FROM dht_orders o
            LEFT JOIN dht_carriers cr ON o.carrier_id = cr.id
            LEFT JOIN dht_carriers cr2 ON o.actual_carrier_id = cr2.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN users u_shipped ON o.shipped_by = u_shipped.id
            WHERE o.expected_ship_date IS NOT NULL
            ${visibilityFilter}
            ${filterWhere}
            ORDER BY ${orderBy}
        `, [...params, todayStr]);

        // Count for each filter (for sidebar badges)
        const todayParam = todayStr;
        const counts = await db.get(`
            SELECT
                COUNT(*) FILTER (WHERE shipping_status = 'pending' AND COALESCE(rescheduled_ship_date, expected_ship_date) > $1::date) AS early_count,
                COUNT(*) FILTER (WHERE shipping_status IN ('pending','rescheduled') AND COALESCE(rescheduled_ship_date, expected_ship_date) <= $1::date) AS today_count,
                COUNT(*) FILTER (WHERE shipping_status = 'rescheduled' AND rescheduled_ship_date > $1::date) AS rescheduled_count,
                COUNT(*) FILTER (WHERE shipping_status = 'shipped') AS shipped_count
            FROM dht_orders
            WHERE expected_ship_date IS NOT NULL
        `, [todayParam]);

        // Overdue count for today filter
        const overdueCount = await db.get(`
            SELECT COUNT(*) AS cnt FROM dht_orders
            WHERE shipping_status IN ('pending','rescheduled')
              AND expected_ship_date IS NOT NULL
              AND COALESCE(rescheduled_ship_date, expected_ship_date) < $1::date
        `, [todayParam]);

        return {
            orders,
            counts: {
                early: Number(counts?.early_count) || 0,
                today: Number(counts?.today_count) || 0,
                rescheduled: Number(counts?.rescheduled_count) || 0,
                shipped: Number(counts?.shipped_count) || 0,
                overdue: Number(overdueCount?.cnt) || 0
            }
        };
    });

    // ========== SHIP — Xác nhận gửi hàng ==========
    fastify.post('/api/shipping/orders/:id/ship', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;

        // Only KT + GĐ can ship
        if (userRole !== 'giam_doc') {
            const kt = await isKeToan(userId);
            if (!kt) return reply.code(403).send({ error: '🔒 Chỉ Kế Toán mới được xác nhận gửi hàng' });
        }

        const orderId = Number(request.params.id);
        const order = await db.get('SELECT id, shipping_status, order_code FROM dht_orders WHERE id = $1', [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });
        if (order.shipping_status === 'shipped') return reply.code(400).send({ error: 'Đơn hàng đã được gửi rồi' });

        const now = vnNow();
        await db.run(`
            UPDATE dht_orders SET
                shipping_status = 'shipped',
                shipped_by = $1,
                shipped_at = $2,
                shipping_date = $3,
                actual_ship_datetime = $2,
                last_updated_by = $1,
                last_updated_at = NOW()
            WHERE id = $4
        `, [userId, now.toISOString(), vnDateStr(now), orderId]);

        return { success: true, message: `✅ Đã xác nhận gửi đơn ${order.order_code}` };
    });

    // ========== RESCHEDULE — Hẹn lại ngày gửi ==========
    fastify.post('/api/shipping/orders/:id/reschedule', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;

        if (userRole !== 'giam_doc') {
            const kt = await isKeToan(userId);
            if (!kt) return reply.code(403).send({ error: '🔒 Chỉ Kế Toán mới được hẹn lại ngày gửi' });
        }

        const { new_date, reason } = request.body || {};
        if (!new_date) return reply.code(400).send({ error: 'Vui lòng chọn ngày gửi mới' });
        if (!reason || !reason.trim()) return reply.code(400).send({ error: 'Vui lòng nhập lý do hẹn lại' });

        const todayStr = vnDateStr(vnNow());
        if (new_date <= todayStr) return reply.code(400).send({ error: 'Ngày gửi mới phải sau hôm nay' });

        const orderId = Number(request.params.id);
        const order = await db.get('SELECT id, shipping_status, expected_ship_date, rescheduled_ship_date, order_code FROM dht_orders WHERE id = $1', [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });
        if (order.shipping_status === 'shipped') return reply.code(400).send({ error: 'Đơn hàng đã gửi, không thể hẹn lại' });

        const oldDate = order.rescheduled_ship_date || order.expected_ship_date;

        // Save history
        await db.run(`
            INSERT INTO dht_shipping_reschedules (dht_order_id, old_date, new_date, reason, rescheduled_by)
            VALUES ($1, $2, $3, $4, $5)
        `, [orderId, oldDate, new_date, reason.trim(), userId]);

        // Update order
        await db.run(`
            UPDATE dht_orders SET
                shipping_status = 'rescheduled',
                rescheduled_ship_date = $1,
                reschedule_reason = $2,
                last_updated_by = $3,
                last_updated_at = NOW()
            WHERE id = $4
        `, [new_date, reason.trim(), userId, orderId]);

        return { success: true, message: `📅 Đã hẹn lại đơn ${order.order_code} sang ${new_date}` };
    });

    // ========== TRACKING — Cập nhật NVC, mã vận đơn, SĐT nhà xe ==========
    fastify.put('/api/shipping/orders/:id/tracking', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;

        if (userRole !== 'giam_doc') {
            const kt = await isKeToan(userId);
            if (!kt) return reply.code(403).send({ error: '🔒 Chỉ Kế Toán mới được cập nhật thông tin vận chuyển' });
        }

        const orderId = Number(request.params.id);
        const b = request.body || {};
        const allowed = ['actual_carrier_id', 'tracking_code', 'carrier_phone', 'shipping_bill_link'];
        const sets = [];
        const params = [];
        let idx = 1;

        for (const key of allowed) {
            if (b[key] !== undefined) {
                if (key === 'actual_carrier_id') {
                    sets.push(`${key} = $${idx++}`);
                    params.push(b[key] === null || b[key] === '' ? null : Number(b[key]));
                } else {
                    sets.push(`${key} = $${idx++}`);
                    params.push(b[key] === '' ? null : b[key]);
                }
            }
        }

        if (sets.length === 0) return reply.code(400).send({ error: 'Không có dữ liệu để cập nhật' });

        sets.push(`last_updated_by = $${idx++}`);
        params.push(userId);
        sets.push(`last_updated_at = NOW()`);

        params.push(orderId);
        await db.run(`UPDATE dht_orders SET ${sets.join(', ')} WHERE id = $${idx}`, params);

        return { success: true };
    });

    // ========== HISTORY — Lịch sử hẹn lại (CN) ==========
    fastify.get('/api/shipping/orders/:id/history', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);
        const rows = await db.all(`
            SELECT sr.*, u.full_name AS rescheduled_by_name
            FROM dht_shipping_reschedules sr
            LEFT JOIN users u ON sr.rescheduled_by = u.id
            WHERE sr.dht_order_id = $1
            ORDER BY sr.created_at DESC
        `, [orderId]);
        return { history: rows };
    });

    // ========== CARRIERS — Lấy danh sách NVC ==========
    fastify.get('/api/shipping/carriers', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all('SELECT id, name FROM dht_carriers WHERE is_active = true ORDER BY display_order ASC, id ASC');
        return { carriers: rows };
    });

    // ========== PENALTY STATUS — Kiểm tra quá hạn hôm nay ==========
    fastify.get('/api/shipping/penalty-status', { preHandler: [authenticate] }, async (request, reply) => {
        const todayStr = vnDateStr(vnNow());
        const overdue = await db.all(`
            SELECT id, order_code, expected_ship_date::text,
                COALESCE(rescheduled_ship_date, expected_ship_date)::text AS effective_ship_date,
                customer_name
            FROM dht_orders
            WHERE shipping_status IN ('pending','rescheduled')
              AND expected_ship_date IS NOT NULL
              AND COALESCE(rescheduled_ship_date, expected_ship_date) < $1::date
            ORDER BY COALESCE(rescheduled_ship_date, expected_ship_date) ASC
        `, [todayStr]);
        return { overdue, count: overdue.length, today: todayStr };
    });
};
