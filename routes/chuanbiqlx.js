// ========== CHUẨN BỊ QLX — Routes ==========
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS qlx_preparation (
            id SERIAL PRIMARY KEY,
            dht_order_id INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            fabric_called BOOLEAN DEFAULT FALSE,
            fabric_called_at TIMESTAMPTZ,
            fabric_called_by INTEGER REFERENCES users(id),
            fabric_arrived BOOLEAN DEFAULT FALSE,
            fabric_arrived_at TIMESTAMPTZ,
            fabric_arrived_by INTEGER REFERENCES users(id),
            material_called BOOLEAN DEFAULT FALSE,
            material_called_at TIMESTAMPTZ,
            material_called_by INTEGER REFERENCES users(id),
            material_arrived BOOLEAN DEFAULT FALSE,
            material_arrived_at TIMESTAMPTZ,
            material_arrived_by INTEGER REFERENCES users(id),
            is_completed BOOLEAN DEFAULT FALSE,
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(dht_order_id)
        )`);
    } catch(e) { console.error('[QLX] prep table:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS qlx_assignments (
            id SERIAL PRIMARY KEY,
            dht_order_id INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            assignment_type TEXT NOT NULL,
            assigned_user_id INTEGER REFERENCES users(id),
            assigned_by INTEGER REFERENCES users(id),
            assigned_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(dht_order_id, assignment_type)
        )`);
    } catch(e) { console.error('[QLX] assignments table:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS qlx_history (
            id SERIAL PRIMARY KEY,
            dht_order_id INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            details TEXT,
            performed_by INTEGER REFERENCES users(id),
            performed_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_qlx_hist_order ON qlx_history(dht_order_id)`);
    } catch(e) { console.error('[QLX] history table:', e.message); }

    // ========== ACCESS CHECK ==========
    const QLX_ROLES = ['giam_doc', 'quan_ly_cap_cao'];

    async function isQLXUser(request) {
        if (QLX_ROLES.includes(request.user.role)) return true;
        // Check if user's department is QLX
        const dept = await db.get(
            `SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = $1`,
            [request.user.id]
        );
        if (dept && dept.name) {
            const n = dept.name.toLowerCase();
            if (n.includes('quản lý xưởng') || n.includes('quan ly xuong') || n.includes('qlx')) return true;
        }
        return false;
    }

    // ========== TREE: Sidebar data ==========
    fastify.get('/api/qlx/tree', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền truy cập' });

        // Chưa hoàn thành: orders where qlx_preparation.is_completed = false or not yet created
        const incomplete = await db.all(`
            SELECT
                EXTRACT(YEAR FROM COALESCE(o.shipping_date, o.order_date))::int AS year,
                EXTRACT(MONTH FROM COALESCE(o.shipping_date, o.order_date))::int AS month,
                o.category_id,
                c.name AS category_name,
                COUNT(*)::int AS order_count
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id
            WHERE COALESCE(p.is_completed, false) = false
              AND o.shipping_status != 'shipped'
            GROUP BY year, month, o.category_id, c.name
            ORDER BY year DESC, month DESC
        `);

        const complete = await db.all(`
            SELECT
                EXTRACT(YEAR FROM COALESCE(o.shipping_date, o.order_date))::int AS year,
                EXTRACT(MONTH FROM COALESCE(o.shipping_date, o.order_date))::int AS month,
                COUNT(*)::int AS order_count
            FROM dht_orders o
            JOIN qlx_preparation p ON p.dht_order_id = o.id
            WHERE p.is_completed = true
            GROUP BY year, month
            ORDER BY year DESC, month DESC
        `);

        // Build incomplete tree: category → months
        const incompleteTotal = incomplete.reduce((s, r) => s + r.order_count, 0);
        const catMap = {};
        for (const r of incomplete) {
            const catId = r.category_id || 0;
            const catName = r.category_name || 'Chưa phân loại';
            if (!catMap[catId]) catMap[catId] = { id: catId, name: catName, count: 0, months: [] };
            catMap[catId].months.push({ year: r.year, month: r.month, count: r.order_count });
            catMap[catId].count += r.order_count;
        }

        const completeTotal = complete.reduce((s, r) => s + r.order_count, 0);

        return {
            incomplete: {
                total: incompleteTotal,
                categories: Object.values(catMap)
            },
            complete: {
                total: completeTotal,
                months: complete.map(r => ({ year: r.year, month: r.month, count: r.order_count }))
            }
        };
    });

    // ========== ORDERS: List with filters ==========
    fastify.get('/api/qlx/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền truy cập' });

        const { status, year, month, category_id, search } = request.query;

        let where = 'WHERE 1=1';
        const params = [];
        let idx = 1;

        // Status filter
        if (status === 'complete') {
            where += ` AND COALESCE(p.is_completed, false) = true`;
        } else if (status === 'incomplete' || !status) {
            where += ` AND COALESCE(p.is_completed, false) = false AND o.shipping_status != 'shipped'`;
        }
        // else status === 'all' → no filter

        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(o.shipping_date, o.order_date)) = $${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(o.shipping_date, o.order_date)) = $${idx++}`; params.push(Number(month)); }
        if (category_id) { where += ` AND o.category_id = $${idx++}`; params.push(Number(category_id)); }
        if (search) {
            where += ` AND (o.order_code ILIKE $${idx} OR o.customer_name ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        const orders = await db.all(`
            SELECT o.id, o.order_code, o.order_date, o.customer_name, o.customer_phone,
                o.total_quantity, o.shipping_date, o.shipping_priority,
                o.category_id, c.name AS category_name,
                u_cskh.full_name AS cskh_name,
                u_created.full_name AS created_by_name,
                -- Preparation status
                COALESCE(p.fabric_called, false) AS fabric_called,
                COALESCE(p.fabric_arrived, false) AS fabric_arrived,
                COALESCE(p.material_called, false) AS material_called,
                COALESCE(p.material_arrived, false) AS material_arrived,
                COALESCE(p.is_completed, false) AS is_completed,
                -- Assignments
                a_cat.full_name AS nguoi_cat,
                a_in.full_name AS nguoi_in,
                a_ep.full_name AS nguoi_ep,
                a_may.full_name AS nguoi_may,
                -- Last history
                lh.details AS last_update_detail,
                lh.performed_at AS last_update_at,
                lh_user.full_name AS last_update_by
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id
            -- Assignments join
            LEFT JOIN qlx_assignments qa_cat ON qa_cat.dht_order_id = o.id AND qa_cat.assignment_type = 'cat'
            LEFT JOIN users a_cat ON qa_cat.assigned_user_id = a_cat.id
            LEFT JOIN qlx_assignments qa_in ON qa_in.dht_order_id = o.id AND qa_in.assignment_type = 'in'
            LEFT JOIN users a_in ON qa_in.assigned_user_id = a_in.id
            LEFT JOIN qlx_assignments qa_ep ON qa_ep.dht_order_id = o.id AND qa_ep.assignment_type = 'ep'
            LEFT JOIN users a_ep ON qa_ep.assigned_user_id = a_ep.id
            LEFT JOIN qlx_assignments qa_may ON qa_may.dht_order_id = o.id AND qa_may.assignment_type = 'may'
            LEFT JOIN users a_may ON qa_may.assigned_user_id = a_may.id
            -- Last history entry
            LEFT JOIN LATERAL (
                SELECT h.details, h.performed_at, h.performed_by
                FROM qlx_history h WHERE h.dht_order_id = o.id
                ORDER BY h.performed_at DESC LIMIT 1
            ) lh ON true
            LEFT JOIN users lh_user ON lh.performed_by = lh_user.id
            ${where}
            ORDER BY o.shipping_date ASC NULLS LAST, o.order_date DESC, o.id DESC
        `, params);

        // Fetch items for each order (for phối breakdown)
        const orderIds = orders.map(o => o.id);
        let items = [];
        if (orderIds.length > 0) {
            items = await db.all(`
                SELECT dht_order_id, id, description, material_pairs, quantity
                FROM dht_order_items
                WHERE dht_order_id = ANY($1)
                ORDER BY dht_order_id, id
            `, [orderIds]);
        }

        // Group items by order_id
        const itemMap = {};
        for (const it of items) {
            if (!itemMap[it.dht_order_id]) itemMap[it.dht_order_id] = [];
            itemMap[it.dht_order_id].push(it);
        }

        // Attach items to orders
        for (const o of orders) {
            o.items = itemMap[o.id] || [];
        }

        return { orders };
    });

    // ========== FABRIC: Toggle gọi vải / vải về ==========
    fastify.post('/api/qlx/fabric/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const orderId = Number(request.params.orderId);
        const { action } = request.body || {}; // 'call' or 'arrive'
        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        // Ensure prep row exists
        await db.run(`INSERT INTO qlx_preparation (dht_order_id) VALUES ($1) ON CONFLICT (dht_order_id) DO NOTHING`, [orderId]);

        if (action === 'call') {
            await db.run(`UPDATE qlx_preparation SET fabric_called = true, fabric_called_at = $1, fabric_called_by = $2, updated_at = $1 WHERE dht_order_id = $3`,
                [now, request.user.id, orderId]);
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, 'fabric_called', 'Đã gọi vải', $2, $3)`,
                [orderId, request.user.id, now]);
        } else if (action === 'arrive') {
            await db.run(`UPDATE qlx_preparation SET fabric_arrived = true, fabric_arrived_at = $1, fabric_arrived_by = $2, updated_at = $1 WHERE dht_order_id = $3`,
                [now, request.user.id, orderId]);
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, 'fabric_arrived', 'Vải đã về', $2, $3)`,
                [orderId, request.user.id, now]);
        } else if (action === 'reset_call') {
            await db.run(`UPDATE qlx_preparation SET fabric_called = false, fabric_called_at = NULL, fabric_called_by = NULL, fabric_arrived = false, fabric_arrived_at = NULL, fabric_arrived_by = NULL, updated_at = $1 WHERE dht_order_id = $2`,
                [now, orderId]);
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, 'fabric_reset', 'Đã reset trạng thái vải', $2, $3)`,
                [orderId, request.user.id, now]);
        } else if (action === 'reset_arrive') {
            await db.run(`UPDATE qlx_preparation SET fabric_arrived = false, fabric_arrived_at = NULL, fabric_arrived_by = NULL, updated_at = $1 WHERE dht_order_id = $2`,
                [now, orderId]);
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, 'fabric_arrive_reset', 'Đã reset vải về', $2, $3)`,
                [orderId, request.user.id, now]);
        }

        return { success: true };
    });

    // ========== MATERIAL: Toggle gọi vật liệu / VL về ==========
    fastify.post('/api/qlx/material/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const orderId = Number(request.params.orderId);
        const { action } = request.body || {};
        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        await db.run(`INSERT INTO qlx_preparation (dht_order_id) VALUES ($1) ON CONFLICT (dht_order_id) DO NOTHING`, [orderId]);

        if (action === 'call') {
            await db.run(`UPDATE qlx_preparation SET material_called = true, material_called_at = $1, material_called_by = $2, updated_at = $1 WHERE dht_order_id = $3`,
                [now, request.user.id, orderId]);
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, 'material_called', 'Đã gọi vật liệu', $2, $3)`,
                [orderId, request.user.id, now]);
        } else if (action === 'arrive') {
            await db.run(`UPDATE qlx_preparation SET material_arrived = true, material_arrived_at = $1, material_arrived_by = $2, updated_at = $1 WHERE dht_order_id = $3`,
                [now, request.user.id, orderId]);
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, 'material_arrived', 'Vật liệu đã về', $2, $3)`,
                [orderId, request.user.id, now]);
        } else if (action === 'reset_call') {
            await db.run(`UPDATE qlx_preparation SET material_called = false, material_called_at = NULL, material_called_by = NULL, material_arrived = false, material_arrived_at = NULL, material_arrived_by = NULL, updated_at = $1 WHERE dht_order_id = $2`,
                [now, orderId]);
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, 'material_reset', 'Đã reset trạng thái vật liệu', $2, $3)`,
                [orderId, request.user.id, now]);
        } else if (action === 'reset_arrive') {
            await db.run(`UPDATE qlx_preparation SET material_arrived = false, material_arrived_at = NULL, material_arrived_by = NULL, updated_at = $1 WHERE dht_order_id = $2`,
                [now, orderId]);
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, 'material_arrive_reset', 'Đã reset vật liệu về', $2, $3)`,
                [orderId, request.user.id, now]);
        }

        return { success: true };
    });

    // ========== ASSIGN: Phân công người ==========
    fastify.post('/api/qlx/assign/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const orderId = Number(request.params.orderId);
        const { type, user_id } = request.body || {};
        const validTypes = ['cat', 'in', 'ep', 'may'];
        if (!validTypes.includes(type)) return reply.code(400).send({ error: 'Loại phân công không hợp lệ' });

        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        const typeLabels = { cat: 'Cắt', in: 'In', ep: 'Ép', may: 'May' };

        if (user_id) {
            const staff = await db.get('SELECT full_name FROM users WHERE id = $1', [Number(user_id)]);
            await db.run(`
                INSERT INTO qlx_assignments (dht_order_id, assignment_type, assigned_user_id, assigned_by, assigned_at)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (dht_order_id, assignment_type)
                DO UPDATE SET assigned_user_id = $3, assigned_by = $4, assigned_at = $5
            `, [orderId, type, Number(user_id), request.user.id, now]);

            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5)`,
                [orderId, 'assign_' + type, `Phân công ${typeLabels[type]}: ${staff?.full_name || 'N/A'}`, request.user.id, now]);
        } else {
            // Remove assignment
            await db.run(`DELETE FROM qlx_assignments WHERE dht_order_id = $1 AND assignment_type = $2`, [orderId, type]);
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5)`,
                [orderId, 'unassign_' + type, `Gỡ phân công ${typeLabels[type]}`, request.user.id, now]);
        }

        return { success: true };
    });

    // ========== STAFF: Lấy DS nhân viên theo bộ phận ==========
    fastify.get('/api/qlx/staff', { preHandler: [authenticate] }, async (request, reply) => {
        const { dept } = request.query;
        let where = `WHERE u.status = 'active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')`;
        const params = [];

        if (dept) {
            where += ` AND LOWER(d.name) LIKE $1`;
            params.push('%' + dept.toLowerCase() + '%');
        }

        const staff = await db.all(`
            SELECT u.id, u.full_name, u.username, d.name AS dept_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            ${where}
            ORDER BY u.full_name
        `, params);

        return { staff };
    });

    // ========== HISTORY: Lịch sử cập nhật ==========
    fastify.get('/api/qlx/history/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.orderId);
        const rows = await db.all(`
            SELECT h.*, u.full_name AS performer_name
            FROM qlx_history h
            LEFT JOIN users u ON h.performed_by = u.id
            WHERE h.dht_order_id = $1
            ORDER BY h.performed_at DESC
            LIMIT 50
        `, [orderId]);

        return { history: rows };
    });

    // ========== COMPLETE: Toggle hoàn thành ==========
    fastify.post('/api/qlx/complete/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const orderId = Number(request.params.orderId);
        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        await db.run(`INSERT INTO qlx_preparation (dht_order_id) VALUES ($1) ON CONFLICT (dht_order_id) DO NOTHING`, [orderId]);

        const prep = await db.get('SELECT is_completed FROM qlx_preparation WHERE dht_order_id = $1', [orderId]);
        const newVal = !prep?.is_completed;

        await db.run(`UPDATE qlx_preparation SET is_completed = $1, completed_at = $2, updated_at = $2 WHERE dht_order_id = $3`,
            [newVal, newVal ? now : null, orderId]);

        const label = newVal ? 'Đánh dấu Hoàn Thành chuẩn bị' : 'Mở lại chuẩn bị (chưa hoàn thành)';
        await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5)`,
            [orderId, newVal ? 'complete' : 'reopen', label, request.user.id, now]);

        return { success: true, is_completed: newVal };
    });
};
