// ========== ĐƠN HÀNG HÔM NAY QLX — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow, vnDateStr, vnFormat } = require('../utils/timezone');
const { isDayOff } = require('../utils/ledgerDayOff');
const fs = require('fs');
const path = require('path');

const QLX_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'qlx');
if (!fs.existsSync(QLX_UPLOAD_DIR)) {
    fs.mkdirSync(QLX_UPLOAD_DIR, { recursive: true });
}

async function shiftIfDayOff(dateObj) {
    let currentStr = dateObj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
    while (await isDayOff(currentStr)) {
        dateObj.setDate(dateObj.getDate() + 1);
        currentStr = dateObj.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
    }
    return dateObj;
}

async function propagateSchedules(schedule) {
    // 1. Shift Cut if it falls on Day Off
    if (schedule.cut_expected_at) {
        const d = new Date(schedule.cut_expected_at);
        await shiftIfDayOff(d);
        schedule.cut_expected_at = d.toISOString();
    }

    // 2. Shift In if it falls on Day Off
    if (schedule.in_expected_at) {
        const d = new Date(schedule.in_expected_at);
        await shiftIfDayOff(d);
        schedule.in_expected_at = d.toISOString();
    }

    // 3. Shift Ep: must be >= max(Cut, In) + 15 mins, and not on Day Off
    if (schedule.ep_expected_at) {
        let d = new Date(schedule.ep_expected_at);
        let minTime = null;
        if (schedule.cut_expected_at) {
            const cutVal = new Date(schedule.cut_expected_at).getTime() + 15 * 60 * 1000;
            if (!minTime || cutVal > minTime) minTime = cutVal;
        }
        if (schedule.in_expected_at) {
            const inVal = new Date(schedule.in_expected_at).getTime() + 15 * 60 * 1000;
            if (!minTime || inVal > minTime) minTime = inVal;
        }

        if (minTime && d.getTime() < minTime) {
            d = new Date(minTime);
        }

        await shiftIfDayOff(d);
        schedule.ep_expected_at = d.toISOString();
    }

    // 4. Shift May/QC/HT: must be >= Ep + 15 mins, and not on Day Off
    if (schedule.may_qc_ht_expected_at) {
        let d = new Date(schedule.may_qc_ht_expected_at);
        if (schedule.ep_expected_at) {
            const epVal = new Date(schedule.ep_expected_at).getTime() + 15 * 60 * 1000;
            if (d.getTime() < epVal) {
                d = new Date(epVal);
            }
        }

        await shiftIfDayOff(d);
        schedule.may_qc_ht_expected_at = d.toISOString();
    }

    // 5. Shift Gửi: must be >= May/QC/HT + 15 mins, and not on Day Off
    if (schedule.gui_expected_at) {
        let d = new Date(schedule.gui_expected_at);
        if (schedule.may_qc_ht_expected_at) {
            const mayVal = new Date(schedule.may_qc_ht_expected_at).getTime() + 15 * 60 * 1000;
            if (d.getTime() < mayVal) {
                d = new Date(mayVal);
            }
        }

        await shiftIfDayOff(d);
        schedule.gui_expected_at = d.toISOString();
    }

    return schedule;
}

async function validateExpectedDate(expectedAt) {
    if (!expectedAt) return null;
    const dateObj = new Date(expectedAt);
    if (isNaN(dateObj.getTime())) {
        return 'Thời gian dự kiến không hợp lệ';
    }
    
    // 1. Check if past date/time (with 1 minute leeway)
    if (dateObj.getTime() < Date.now() - 60000) {
        return 'Thời gian dự kiến không được ở trong quá khứ';
    }
    
    // 2. Check if holiday
    const vnISO = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const Y = vnISO.getFullYear();
    const M = String(vnISO.getMonth() + 1).padStart(2, '0');
    const D = String(vnISO.getDate()).padStart(2, '0');
    const vnDate = `${Y}-${M}-${D}`;
    
    const isHoliday = await db.get(`SELECT 1 FROM holidays WHERE holiday_date = $1::date`, [vnDate]);
    if (isHoliday) {
        return `Không được hẹn lịch vào ngày lễ (${vnDate})`;
    }
    
    return null;
}


module.exports = async function(fastify) {
    // Migrations for schedules and step reports
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS qlx_item_schedules (
                id SERIAL PRIMARY KEY,
                dht_order_id INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
                order_item_id INTEGER REFERENCES dht_order_items(id) ON DELETE CASCADE,
                cut_expected_at TIMESTAMPTZ,
                in_expected_at TIMESTAMPTZ,
                ep_expected_at TIMESTAMPTZ,
                may_qc_ht_expected_at TIMESTAMPTZ,
                gui_expected_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                created_by INTEGER REFERENCES users(id),
                CONSTRAINT unique_qlx_item_schedule UNIQUE(dht_order_id, order_item_id)
            );
        `);
        await db.exec(`
            CREATE TABLE IF NOT EXISTS qlx_step_reports (
                id SERIAL PRIMARY KEY,
                dht_order_id INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
                order_item_id INTEGER REFERENCES dht_order_items(id) ON DELETE CASCADE,
                step_name TEXT NOT NULL,
                expected_at TIMESTAMPTZ,
                notes TEXT NOT NULL,
                image_url TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                created_by INTEGER REFERENCES users(id)
            );
        `);
    } catch (e) {
        console.error('[QLX Migration Error]:', e.message);
    }


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

            // Sắp xếp các tab theo thứ tự ngày tăng dần (đơn cũ nhất, trễ nhất lên trước)
            const getEffectiveDateStr = (o) => {
                const d = o.qlx_rescheduled_date || o.qlx_expected_date || o.expected_ship_date;
                if (!d) return '9999-12-31';
                if (d instanceof Date) return vnDateStr(d);
                return d.toString().split(' ')[0];
            };

            const sortAsc = (a, b) => {
                const dateA = getEffectiveDateStr(a);
                const dateB = getEffectiveDateStr(b);
                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;
                return b.id - a.id;
            };

            som.sort(sortAsc);
            xuLy.sort(sortAsc);
            henLai.sort(sortAsc);

            // Sắp xếp đơn hoàn thành hôm nay theo thời gian hoàn thành giảm dần (mới nhất lên trước)
            hoanThanh.sort((a, b) => {
                const timeA = a.qlx_actual_output_at ? new Date(a.qlx_actual_output_at).getTime() : 0;
                const timeB = b.qlx_actual_output_at ? new Date(b.qlx_actual_output_at).getTime() : 0;
                return timeB - timeA;
            });

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

    // POST: Tải ảnh báo cáo chặng QLX
    fastify.post('/api/qlx/upload-image', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const parts = request.parts();
            let imageUrl = null;
            for await (const part of parts) {
                if (part.type === 'file' && part.filename) {
                    const ext = path.extname(part.filename).toLowerCase() || '.jpg';
                    const fileName = `qlx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
                    const filePath = path.join(QLX_UPLOAD_DIR, fileName);

                    const chunks = [];
                    for await (const chunk of part.file) {
                        chunks.push(chunk);
                    }
                    const totalSize = chunks.reduce((s, c) => s + c.length, 0);
                    if (totalSize > 10 * 1024 * 1024) {
                        return reply.code(400).send({ error: 'Ảnh quá lớn. Tối đa 10MB' });
                    }
                    fs.writeFileSync(filePath, Buffer.concat(chunks));
                    imageUrl = `/uploads/qlx/${fileName}`;
                    break;
                }
            }
            return { success: true, image_url: imageUrl };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET: Lấy lịch trình sản xuất của 1 sản phẩm/đơn hàng
    fastify.get('/api/qlx-orders/schedule', { preHandler: [authenticate] }, async (request, reply) => {
        const { dht_order_id, order_item_id } = request.query;
        if (!dht_order_id) {
            return reply.code(400).send({ error: 'Thiếu dht_order_id' });
        }
        try {
            const item_id = order_item_id ? parseInt(order_item_id) : null;
            const order_id = parseInt(dht_order_id);
            const schedule = await db.get(`
                SELECT * FROM qlx_item_schedules
                WHERE dht_order_id = $1 AND (order_item_id = $2 OR (order_item_id IS NULL AND $2 IS NULL))
            `, [order_id, item_id]);
            return { schedule };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST: Thiết lập/Cập nhật lịch trình sản xuất
    fastify.post('/api/qlx-orders/schedule', { preHandler: [authenticate] }, async (request, reply) => {
        const { dht_order_id, order_item_id, cut_expected_at, in_expected_at, ep_expected_at, may_qc_ht_expected_at, gui_expected_at } = request.body || {};
        if (!dht_order_id) {
            return reply.code(400).send({ error: 'Thiếu mã đơn hàng dht_order_id' });
        }
        try {
            const item_id = order_item_id ? parseInt(order_item_id) : null;
            const order_id = parseInt(dht_order_id);

            const datesToValidate = [
                { name: 'Cắt', val: cut_expected_at },
                { name: 'In', val: in_expected_at },
                { name: 'Ép', val: ep_expected_at },
                { name: 'May/QC/HT', val: may_qc_ht_expected_at },
                { name: 'Gửi Hàng', val: gui_expected_at }
            ];

            for (const item of datesToValidate) {
                if (item.val) {
                    const err = await validateExpectedDate(item.val);
                    if (err) {
                        return reply.code(400).send({ error: `Chặng ${item.name}: ${err}` });
                    }
                }
            }


            // Construct raw schedule object
            let scheduleObj = {
                cut_expected_at: cut_expected_at || null,
                in_expected_at: in_expected_at || null,
                ep_expected_at: ep_expected_at || null,
                may_qc_ht_expected_at: may_qc_ht_expected_at || null,
                gui_expected_at: gui_expected_at || null
            };

            // Run Sunday & Holiday Shifting + Chronological Shifting + Gap propagation
            const propagated = await propagateSchedules(scheduleObj);

            // Upsert into qlx_item_schedules
            const existing = await db.get(`
                SELECT id FROM qlx_item_schedules WHERE dht_order_id = $1 AND (order_item_id = $2 OR (order_item_id IS NULL AND $2 IS NULL))
            `, [order_id, item_id]);

            const now = vnNow();
            if (existing) {
                await db.run(`
                    UPDATE qlx_item_schedules
                    SET cut_expected_at = $1,
                        in_expected_at = $2,
                        ep_expected_at = $3,
                        may_qc_ht_expected_at = $4,
                        gui_expected_at = $5,
                        updated_at = $6
                    WHERE id = $7
                `, [
                    propagated.cut_expected_at,
                    propagated.in_expected_at,
                    propagated.ep_expected_at,
                    propagated.may_qc_ht_expected_at,
                    propagated.gui_expected_at,
                    now,
                    existing.id
                ]);
            } else {
                await db.run(`
                    INSERT INTO qlx_item_schedules (
                        dht_order_id, order_item_id,
                        cut_expected_at, in_expected_at, ep_expected_at, may_qc_ht_expected_at, gui_expected_at,
                        created_by, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
                `, [
                    order_id, item_id,
                    propagated.cut_expected_at,
                    propagated.in_expected_at,
                    propagated.ep_expected_at,
                    propagated.may_qc_ht_expected_at,
                    propagated.gui_expected_at,
                    request.user.id,
                    now
                ]);
            }

            // Sync with dht_orders: update expected date of the order to match scheduled gui_expected_at
            if (propagated.gui_expected_at) {
                const guiDateStr = propagated.gui_expected_at.split('T')[0];
                const guiTimeStr = new Date(propagated.gui_expected_at).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
                
                await db.run(`
                    UPDATE dht_orders
                    SET qlx_expected_date = $1::date,
                        qlx_expected_hour = $2,
                        qlx_updated_by = $3,
                        qlx_updated_at = $4
                    WHERE id = $5
                `, [guiDateStr, guiTimeStr, request.user.id, now, order_id]);
            }

            // Save step reports if provided
            const { reports } = request.body || {};
            if (reports && typeof reports === 'object') {
                const stepLabels = { cat: 'Cắt', in: 'In', ep: 'Ép', may_qc_ht: 'May/QC/HT', gui: 'Gửi' };
                for (const [stepKey, r] of Object.entries(reports)) {
                    if (r && (r.notes || r.image_url)) {
                        let stepExpected = null;
                        if (stepKey === 'cat') stepExpected = propagated.cut_expected_at;
                        else if (stepKey === 'in') stepExpected = propagated.in_expected_at;
                        else if (stepKey === 'ep') stepExpected = propagated.ep_expected_at;
                        else if (stepKey === 'may_qc_ht') stepExpected = propagated.may_qc_ht_expected_at;
                        else if (stepKey === 'gui') stepExpected = propagated.gui_expected_at;

                        await db.run(`
                            INSERT INTO qlx_step_reports (
                                dht_order_id, order_item_id, step_name, expected_at, notes, image_url, created_by, created_at
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        `, [
                            order_id, item_id, stepKey,
                            stepExpected || null,
                            r.notes || '',
                            r.image_url || null,
                            request.user.id,
                            now
                        ]);

                        // Ghi lịch sử riêng cho báo cáo chặng này
                        const label = stepLabels[stepKey] || stepKey;
                        await db.run(`
                            INSERT INTO qlx_history (dht_order_id, item_id, action, details, performed_by, performed_at)
                            VALUES ($1, $2, 'qlx_step_report', $3, $4, $5)
                        `, [
                            order_id,
                            item_id,
                            `Báo cáo tiến độ chặng [${label}]: Hẹn lại ${stepExpected ? vnFormat(stepExpected) : 'chưa có'}. Nội dung: ${r.notes || ''}`,
                            request.user.id,
                            now
                        ]);
                    }
                }
            }

            // Ghi lịch sử qlx_history
            await db.run(`
                INSERT INTO qlx_history (dht_order_id, item_id, action, details, performed_by, performed_at)
                VALUES ($1, $2, 'qlx_schedule_set', 'Đã cập nhật lịch trình sản xuất các bộ phận', $3, $4)
            `, [order_id, item_id, request.user.id, now]);

            return { success: true, schedule: propagated };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST: Báo cáo chặng sản xuất (đúng tiến độ hoặc báo chậm chặng)
    fastify.post('/api/qlx-orders/step-report', { preHandler: [authenticate] }, async (request, reply) => {
        const { dht_order_id, order_item_id, step_name, expected_at, notes, image_url } = request.body || {};
        if (!dht_order_id || !step_name) {
            return reply.code(400).send({ error: 'Thiếu dht_order_id hoặc step_name' });
        }
        if (expected_at && step_name !== 'on_track') {
            const err = await validateExpectedDate(expected_at);
            if (err) {
                return reply.code(400).send({ error: err });
            }
        }
        try {
            const item_id = order_item_id ? parseInt(order_item_id) : null;
            const order_id = parseInt(dht_order_id);
            const now = vnNow();

            // Insert into qlx_step_reports
            await db.run(`
                INSERT INTO qlx_step_reports (
                    dht_order_id, order_item_id, step_name, expected_at, notes, image_url, created_by, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                order_id, item_id, step_name,
                expected_at || null,
                notes || '',
                image_url || null,
                request.user.id,
                now
            ]);

            const stepLabels = { cat: 'Cắt', in: 'In', ep: 'Ép', may_qc_ht: 'May/QC/HT', gui: 'Gửi', on_track: 'Đúng tiến độ' };

            // If it is a delay report, update schedule of this step and propagate downstream
            if (expected_at && step_name !== 'on_track') {
                let schedule = await db.get(`
                    SELECT * FROM qlx_item_schedules
                    WHERE dht_order_id = $1 AND (order_item_id = $2 OR (order_item_id IS NULL AND $2 IS NULL))
                `, [order_id, item_id]);

                if (!schedule) {
                    schedule = {
                        cut_expected_at: null,
                        in_expected_at: null,
                        ep_expected_at: null,
                        may_qc_ht_expected_at: null,
                        gui_expected_at: null
                    };
                }

                // Update the reported step's expected_at
                if (step_name === 'cat') schedule.cut_expected_at = expected_at;
                else if (step_name === 'in') schedule.in_expected_at = expected_at;
                else if (step_name === 'ep') schedule.ep_expected_at = expected_at;
                else if (step_name === 'may_qc_ht') schedule.may_qc_ht_expected_at = expected_at;
                else if (step_name === 'gui') schedule.gui_expected_at = expected_at;

                // Propagate and save
                const propagated = await propagateSchedules(schedule);

                if (schedule.id) {
                    await db.run(`
                        UPDATE qlx_item_schedules
                        SET cut_expected_at = $1,
                            in_expected_at = $2,
                            ep_expected_at = $3,
                            may_qc_ht_expected_at = $4,
                            gui_expected_at = $5,
                            updated_at = $6
                        WHERE id = $7
                    `, [
                        propagated.cut_expected_at,
                        propagated.in_expected_at,
                        propagated.ep_expected_at,
                        propagated.may_qc_ht_expected_at,
                        propagated.gui_expected_at,
                        now,
                        schedule.id
                    ]);
                } else {
                    await db.run(`
                        INSERT INTO qlx_item_schedules (
                            dht_order_id, order_item_id,
                            cut_expected_at, in_expected_at, ep_expected_at, may_qc_ht_expected_at, gui_expected_at,
                            created_by, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
                    `, [
                        order_id, item_id,
                        propagated.cut_expected_at,
                        propagated.in_expected_at,
                        propagated.ep_expected_at,
                        propagated.may_qc_ht_expected_at,
                        propagated.gui_expected_at,
                        request.user.id,
                        now
                    ]);
                }

                // Sync with dht_orders: update rescheduled_date of the order to match rescheduled gui_expected_at
                if (propagated.gui_expected_at) {
                    const guiDateStr = propagated.gui_expected_at.split('T')[0];
                    await db.run(`
                        UPDATE dht_orders
                        SET qlx_rescheduled_date = $1::date,
                            qlx_rescheduled_reason = $2,
                            qlx_updated_by = $3,
                            qlx_updated_at = $4
                        WHERE id = $5
                    `, [guiDateStr, `Báo chậm tiến độ chặng ${stepLabels[step_name] || step_name}: ${notes}`, request.user.id, now, order_id]);
                }
            }

            // Ghi lịch sử qlx_history
            const detailText = step_name === 'on_track'
                ? 'Báo cáo: Xác nhận đúng tiến độ theo lịch sắp xếp'
                : `Báo cáo chậm tiến độ chặng [${stepLabels[step_name] || step_name}]: Hẹn lại ${expected_at ? vnFormat(expected_at) : 'chưa có'}. Lý do: ${notes || ''}`;

            await db.run(`
                INSERT INTO qlx_history (dht_order_id, item_id, action, details, performed_by, performed_at)
                VALUES ($1, $2, 'qlx_step_report', $3, $4, $5)
            `, [order_id, item_id, detailText, request.user.id, now]);

            return { success: true };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

};

