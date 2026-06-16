// ========== ĐƠN HÀNG HÔM NAY QLX — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow, vnDateStr, vnFormat } = require('../utils/timezone');

const { isDayOff } = require('../utils/ledgerDayOff');

module.exports = async function(fastify) {

    // GET: Lấy danh sách đơn hàng phân chia theo 4 tab
    fastify.get('/api/qlx-orders/today-summary', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            // Load configs from database
            const configRows = await db.all("SELECT key, value FROM app_config WHERE key IN ('qlx_xu_ly_days', 'qlx_hoan_thanh_mode')");
            let xu_ly_days = 1;
            let hoan_thanh_mode = 'today';
            for (const r of configRows) {
                if (r.key === 'qlx_xu_ly_days') xu_ly_days = parseInt(r.value) || 1;
                if (r.key === 'qlx_hoan_thanh_mode') hoan_thanh_mode = r.value || 'today';
            }

            const today = vnNow();
            const todayStr = vnDateStr(today);
            
            // Calculate limit date for "xu_ly" tab based on xu_ly_days config
            const limitDate = new Date(today);
            limitDate.setDate(limitDate.getDate() + xu_ly_days);
            let limitDateStr = vnDateStr(limitDate);

            // Shift limit date forward if it lands on a Sunday or holiday
            while (await isDayOff(limitDateStr)) {
                limitDate.setDate(limitDate.getDate() + 1);
                limitDateStr = vnDateStr(limitDate);
            }

            // Lấy toàn bộ đơn chưa giao + đơn hoàn thành trong hôm nay
            const orders = await db.all(`
                SELECT o.id, o.order_code, o.order_date, o.customer_name, o.customer_phone,
                       o.total_quantity, o.total_amount, o.shipping_status, o.shipping_priority,
                       o.expected_ship_date, o.notes, o.created_at, o.standard_delivery_time, o.shipped_at,
                       o.qlx_expected_date, o.qlx_expected_hour, o.qlx_actual_output_at,
                       o.qlx_rescheduled_date, o.qlx_rescheduled_reason, o.qlx_updated_at,
                       c.name AS category_name,
                       u.full_name AS cskh_name,
                       upd.full_name AS qlx_updated_by_name
                FROM dht_orders o
                LEFT JOIN dht_categories c ON c.id = o.category_id
                LEFT JOIN users u ON u.id = o.cskh_user_id
                LEFT JOIN users upd ON upd.id = o.qlx_updated_by
                WHERE (o.shipping_status IN ('pending','rescheduled') AND o.qlx_actual_output_at IS NULL)
                   OR (o.qlx_actual_output_at IS NOT NULL AND o.qlx_actual_output_at::date = $1::date)
                ORDER BY o.expected_ship_date ASC, o.id DESC
            `, [todayStr]);

            const som = [];
            const xuLy = [];
            const henLai = [];
            const hoanThanh = [];

            for (const o of orders) {
                // Formatting dates safely
                o.created_at_fmt = o.created_at ? vnFormat(o.created_at) : '—';
                o.expected_ship_date_fmt = o.expected_ship_date ? vnDateStr(o.expected_ship_date) : '—';
                o.qlx_expected_date_fmt = o.qlx_expected_date ? vnDateStr(o.qlx_expected_date) : '—';
                o.qlx_rescheduled_date_fmt = o.qlx_rescheduled_date ? vnDateStr(o.qlx_rescheduled_date) : '—';
                o.qlx_actual_output_at_fmt = o.qlx_actual_output_at ? vnFormat(o.qlx_actual_output_at) : '—';

                const expectedDate = o.qlx_expected_date ? vnDateStr(o.qlx_expected_date) : (o.expected_ship_date ? vnDateStr(o.expected_ship_date) : null);

                if (o.qlx_actual_output_at) {
                    const actualDate = vnDateStr(o.qlx_actual_output_at);
                    if (actualDate === todayStr) {
                        hoanThanh.push(o);
                    }
                } else if (o.qlx_rescheduled_date) {
                    const reschedDate = vnDateStr(o.qlx_rescheduled_date);
                    if (reschedDate <= limitDateStr) {
                        xuLy.push(o);
                    } else {
                        henLai.push(o);
                    }
                } else {
                    if (!expectedDate || expectedDate <= limitDateStr) {
                        xuLy.push(o);
                    } else {
                        som.push(o);
                    }
                }
            }

            let hoanThanhCount = 0;
            if (hoan_thanh_mode === 'all') {
                const countRow = await db.get("SELECT COUNT(*)::int AS count FROM dht_orders WHERE qlx_actual_output_at IS NOT NULL");
                hoanThanhCount = countRow ? countRow.count : 0;
            } else {
                hoanThanhCount = hoanThanh.length;
            }

            return {
                tabs: {
                    som: { count: som.length, orders: som },
                    xu_ly: { count: xuLy.length, orders: xuLy },
                    hen_lai: { count: henLai.length, orders: henLai },
                    hoan_thanh: { count: hoanThanhCount, orders: hoanThanh }
                },
                config: {
                    xu_ly_days,
                    hoan_thanh_mode
                }
            };
        } catch (e) {
            console.error('[QLX Orders Summary] Error:', e.message);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST: QLX báo giờ ra đơn hàng (Báo giờ ra)
    fastify.post('/api/qlx-orders/:id/expected-time', { preHandler: [authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const { qlx_expected_date, qlx_expected_hour } = request.body || {};

        if (!qlx_expected_date || !qlx_expected_hour) {
            return reply.code(400).send({ error: 'Vui lòng cung cấp đầy đủ ngày và giờ dự kiến ra đơn' });
        }

        try {
            const order = await db.get('SELECT order_code, qlx_expected_date, qlx_expected_hour FROM dht_orders WHERE id = $1', [id]);
            if (!order) return reply.code(404).send({ error: 'Đơn hàng không tồn tại' });

            const now = vnNow();
            await db.run(`
                UPDATE dht_orders
                SET qlx_expected_date = $1::date,
                    qlx_expected_hour = $2,
                    qlx_updated_by = $3,
                    qlx_updated_at = $4
                WHERE id = $5
            `, [qlx_expected_date, qlx_expected_hour, request.user.id, now, id]);

            // Ghi lịch sử qlx_history
            await db.run(`
                INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                VALUES ($1, 'qlx_expected_time', $2, $3, $4)
            `, [id, `Báo giờ ra đơn: ${qlx_expected_hour} ngày ${qlx_expected_date}`, request.user.id, now]);

            // Ghi audit logs
            const changes = [
                { field: 'qlx_expected_date', label: 'Ngày QLX hẹn ra đơn', old: order.qlx_expected_date, new: qlx_expected_date },
                { field: 'qlx_expected_hour', label: 'Giờ QLX hẹn ra đơn', old: order.qlx_expected_hour, new: qlx_expected_hour }
            ];
            await db.run(`
                INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by, created_at)
                VALUES ($1, 'qlx_update', $2, $3, $4, $5)
            `, [id, 'QLX cập nhật giờ ra đơn', JSON.stringify(changes), request.user.id, now]);

            return { success: true };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST: QLX báo hoàn thành đơn hàng (Báo hoàn thành)
    fastify.post('/api/qlx-orders/:id/complete', { preHandler: [authenticate] }, async (request, reply) => {
        const { id } = request.params;
        try {
            const order = await db.get('SELECT order_code FROM dht_orders WHERE id = $1', [id]);
            if (!order) return reply.code(404).send({ error: 'Đơn hàng không tồn tại' });

            const now = vnNow();
            await db.run(`
                UPDATE dht_orders
                SET qlx_actual_output_at = $1,
                    qlx_updated_by = $2,
                    qlx_updated_at = $3
                WHERE id = $4
            `, [now, request.user.id, now, id]);

            // Ghi lịch sử qlx_history
            await db.run(`
                INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                VALUES ($1, 'qlx_complete', 'Báo hoàn thành đơn hàng (Chờ KT gửi)', $2, $3)
            `, [id, request.user.id, now]);

            // Ghi audit logs
            const changes = [
                { field: 'qlx_actual_output_at', label: 'Thời gian QLX báo hoàn thành', old: null, new: vnFormat(now) }
            ];
            await db.run(`
                INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by, created_at)
                VALUES ($1, 'qlx_update', 'QLX báo hoàn thành đơn hàng', JSON.stringify(changes), request.user.id, now)
            `, [id, request.user.id, now]);

            return { success: true };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST: QLX hẹn lại lịch đơn hàng (Hẹn lại)
    fastify.post('/api/qlx-orders/:id/reschedule', { preHandler: [authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const { qlx_rescheduled_date, qlx_rescheduled_reason } = request.body || {};

        if (!qlx_rescheduled_date || !qlx_rescheduled_reason) {
            return reply.code(400).send({ error: 'Vui lòng điền đầy đủ ngày hẹn mới và lý do hẹn lại' });
        }

        try {
            const order = await db.get('SELECT order_code, qlx_rescheduled_date, qlx_rescheduled_reason FROM dht_orders WHERE id = $1', [id]);
            if (!order) return reply.code(404).send({ error: 'Đơn hàng không tồn tại' });

            const now = vnNow();
            await db.run(`
                UPDATE dht_orders
                SET qlx_rescheduled_date = $1::date,
                    qlx_rescheduled_reason = $2,
                    qlx_updated_by = $3,
                    qlx_updated_at = $4
                WHERE id = $5
            `, [qlx_rescheduled_date, qlx_rescheduled_reason, request.user.id, now, id]);

            // Ghi lịch sử qlx_history
            await db.run(`
                INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                VALUES ($1, 'qlx_reschedule', $2, $3, $4)
            `, [id, `Hẹn lại đơn: Ngày mới ${qlx_rescheduled_date}. Lý do: ${qlx_rescheduled_reason}`, request.user.id, now]);

            // Ghi audit logs
            const changes = [
                { field: 'qlx_rescheduled_date', label: 'Ngày QLX hẹn lại', old: order.qlx_rescheduled_date, new: qlx_rescheduled_date },
                { field: 'qlx_rescheduled_reason', label: 'Lý do QLX hẹn lại', old: order.qlx_rescheduled_reason, new: qlx_rescheduled_reason }
            ];
            await db.run(`
                INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by, created_at)
                VALUES ($1, 'qlx_update', 'QLX hẹn lại đơn hàng', JSON.stringify(changes), request.user.id, now)
            `, [id, request.user.id, now]);

            return { success: true };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });
    // GET: Lấy cấu hình QLX
    fastify.get('/api/qlx-orders/config', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const rows = await db.all("SELECT key, value FROM app_config WHERE key IN ('qlx_xu_ly_days', 'qlx_hoan_thanh_mode')");
            let xu_ly_days = 1;
            let hoan_thanh_mode = 'today';
            for (const r of rows) {
                if (r.key === 'qlx_xu_ly_days') xu_ly_days = parseInt(r.value) || 1;
                if (r.key === 'qlx_hoan_thanh_mode') hoan_thanh_mode = r.value || 'today';
            }
            return { xu_ly_days, hoan_thanh_mode };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST: Cập nhật cấu hình QLX (Chỉ giám đốc)
    fastify.post('/api/qlx-orders/config', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được phép thay đổi cấu hình QLX' });
        }
        const { xu_ly_days, hoan_thanh_mode } = request.body || {};
        try {
            await db.run(`INSERT INTO app_config (key, value) VALUES ('qlx_xu_ly_days', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [String(xu_ly_days || 1)]);
            await db.run(`INSERT INTO app_config (key, value) VALUES ('qlx_hoan_thanh_mode', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [hoan_thanh_mode || 'today']);
            return { success: true };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET: Lấy danh sách các năm - tháng hoàn thành đơn hàng
    fastify.get('/api/qlx-orders/completed-months', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const rows = await db.all(`
                SELECT TO_CHAR(qlx_actual_output_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY') AS year,
                       TO_CHAR(qlx_actual_output_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'MM') AS month,
                       COUNT(*)::int AS count
                FROM dht_orders
                WHERE qlx_actual_output_at IS NOT NULL
                GROUP BY year, month
                ORDER BY year DESC, month DESC
            `);
            const yearMap = {};
            for (const r of rows) {
                if (!yearMap[r.year]) {
                    yearMap[r.year] = { year: r.year, months: [] };
                }
                yearMap[r.year].months.push({ month: r.month, count: r.count });
            }
            return Object.values(yearMap);
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET: Lấy danh sách đơn hoàn thành của 1 tháng cụ thể
    fastify.get('/api/qlx-orders/completed-by-month', { preHandler: [authenticate] }, async (request, reply) => {
        const { month } = request.query || {};
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return reply.code(400).send({ error: 'Định dạng tháng không đúng (YYYY-MM)' });
        }
        try {
            const orders = await db.all(`
                SELECT o.id, o.order_code, o.order_date, o.customer_name, o.customer_phone,
                       o.total_quantity, o.total_amount, o.shipping_status, o.shipping_priority,
                       o.expected_ship_date, o.notes, o.created_at, o.standard_delivery_time, o.shipped_at,
                       o.qlx_expected_date, o.qlx_expected_hour, o.qlx_actual_output_at,
                       o.qlx_rescheduled_date, o.qlx_rescheduled_reason, o.qlx_updated_at,
                       c.name AS category_name,
                       u.full_name AS cskh_name,
                       upd.full_name AS qlx_updated_by_name
                FROM dht_orders o
                LEFT JOIN dht_categories c ON c.id = o.category_id
                LEFT JOIN users u ON u.id = o.cskh_user_id
                LEFT JOIN users upd ON upd.id = o.qlx_updated_by
                WHERE o.qlx_actual_output_at IS NOT NULL
                  AND TO_CHAR(o.qlx_actual_output_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') = $1
                ORDER BY o.qlx_actual_output_at DESC, o.id DESC
            `, [month]);

            for (const o of orders) {
                o.created_at_fmt = o.created_at ? vnFormat(o.created_at) : '—';
                o.expected_ship_date_fmt = o.expected_ship_date ? vnDateStr(o.expected_ship_date) : '—';
                o.qlx_expected_date_fmt = o.qlx_expected_date ? vnDateStr(o.qlx_expected_date) : '—';
                o.qlx_rescheduled_date_fmt = o.qlx_rescheduled_date ? vnDateStr(o.qlx_rescheduled_date) : '—';
                o.qlx_actual_output_at_fmt = o.qlx_actual_output_at ? vnFormat(o.qlx_actual_output_at) : '—';
            }
            return { orders };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET: Lấy lịch sử thay đổi của đơn hàng
    fastify.get('/api/qlx-orders/:id/logs', { preHandler: [authenticate] }, async (request, reply) => {
        const { id } = request.params;
        try {
            const history = await db.all(`
                SELECT qh.action, qh.details, qh.performed_at, u.full_name AS performed_by_name
                FROM qlx_history qh
                LEFT JOIN users u ON u.id = qh.performed_by
                WHERE qh.dht_order_id = $1
                ORDER BY qh.performed_at DESC
            `, [id]);
            return { history };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

};
