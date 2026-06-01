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

    // Checklist templates
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS qlx_checklist_templates (
            id SERIAL PRIMARY KEY,
            type VARCHAR(20) DEFAULT 'question',
            content TEXT NOT NULL,
            sort_order INT DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
    } catch(e) { console.error('[QLX] checklist templates:', e.message); }

    // Checklist responses per order
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS qlx_checklist_responses (
            id SERIAL PRIMARY KEY,
            dht_order_id INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            template_id INTEGER NOT NULL REFERENCES qlx_checklist_templates(id) ON DELETE CASCADE,
            is_checked BOOLEAN DEFAULT FALSE,
            checked_at TIMESTAMPTZ,
            checked_by INTEGER REFERENCES users(id),
            UNIQUE(dht_order_id, template_id)
        )`);
    } catch(e) { console.error('[QLX] checklist responses:', e.message); }

    // Add qlx_reviewed columns to qlx_preparation
    try {
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS qlx_reviewed BOOLEAN DEFAULT FALSE`);
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS qlx_reviewed_at TIMESTAMPTZ`);
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS qlx_reviewed_by INTEGER REFERENCES users(id)`);
    } catch(e) { console.error('[QLX] qlx_reviewed columns:', e.message); }

    // Add qlx_received_phieu columns (QLX confirms received printed production ticket)
    try {
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS qlx_received_phieu BOOLEAN DEFAULT FALSE`);
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS qlx_received_phieu_at TIMESTAMPTZ`);
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS qlx_received_phieu_by INTEGER REFERENCES users(id)`);
    } catch(e) { console.error('[QLX] qlx_received_phieu columns:', e.message); }

    // Add assigned_contractor_id to qlx_assignments (for Gia Công In)
    try {
        await db.exec(`ALTER TABLE qlx_assignments ADD COLUMN IF NOT EXISTS assigned_contractor_id INTEGER`);
    } catch(e) { console.error('[QLX] contractor col:', e.message); }

    // In/Thêu Chung table (multi-select)
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS qlx_in_theu_chung (
            id SERIAL PRIMARY KEY,
            dht_order_id INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            target_type VARCHAR(20) NOT NULL DEFAULT 'user',
            target_id INTEGER NOT NULL,
            assigned_by INTEGER REFERENCES users(id),
            assigned_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(dht_order_id, target_type, target_id)
        )`);
    } catch(e) { console.error('[QLX] in_theu_chung table:', e.message); }

    // Fabric reservations table
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS qlx_fabric_reservations (
            id SERIAL PRIMARY KEY,
            dht_order_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            phoi_index INTEGER DEFAULT 0,
            material_name TEXT,
            color_name TEXT,
            unit TEXT DEFAULT 'kg',
            roll_id INTEGER,
            roll_code TEXT,
            kg_reserved NUMERIC(10,2) DEFAULT 0,
            roll_note TEXT,
            call_trees INTEGER DEFAULT 0,
            call_amount NUMERIC(10,2) DEFAULT 0,
            call_note TEXT,
            call_date DATE,
            call_content TEXT,
            reservation_type VARCHAR(20) DEFAULT 'from_stock',
            status VARCHAR(20) DEFAULT 'reserved',
            created_by INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_qlx_fab_res_order ON qlx_fabric_reservations(dht_order_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_qlx_fab_res_roll ON qlx_fabric_reservations(roll_id)`);
    } catch(e) { console.error('[QLX] fabric reservations:', e.message); }

    // Fabric reservation arrival tracking
    try {
        await db.exec(`ALTER TABLE qlx_fabric_reservations ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ`);
        await db.exec(`ALTER TABLE qlx_fabric_reservations ADD COLUMN IF NOT EXISTS arrived_by INTEGER`);
    } catch(e) { console.error('[QLX] fabric arrival columns:', e.message); }

    // Linked call support
    try {
        await db.exec(`ALTER TABLE qlx_fabric_reservations ADD COLUMN IF NOT EXISTS linked_call_id INTEGER REFERENCES qlx_fabric_reservations(id)`);
    } catch(e) { /* column likely exists */ }

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
              AND COALESCE(o.shipping_status, '') != 'shipped'
              AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
              AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
            GROUP BY year, month, o.category_id, c.name
            ORDER BY year DESC, month DESC
        `);

        // Count orders pending KT confirmation (sx_print_confirmed = false)
        const pendingKT = await db.get(`
            SELECT COUNT(*)::int AS cnt FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id
            WHERE COALESCE(p.is_completed, false) = false
              AND COALESCE(o.shipping_status, '') != 'shipped'
              AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
              AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
              AND COALESCE(o.sx_print_confirmed, false) = false
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
            },
            pending_kt_count: pendingKT ? pendingKT.cnt : 0
        };
    });

    // ========== ORDERS: List with filters ==========
    fastify.get('/api/qlx/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền truy cập' });

        const { status, year, month, category_id, search } = request.query;

        let where = `WHERE 1=1 AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM') AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'`;
        const params = [];
        let idx = 1;

        // Status filter
        if (status === 'complete') {
            where += ` AND COALESCE(p.is_completed, false) = true`;
        } else if (status === 'incomplete' || !status) {
            where += ` AND COALESCE(p.is_completed, false) = false AND COALESCE(o.shipping_status, '') != 'shipped'`;
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
                o.total_quantity, o.expected_ship_date, o.shipping_priority,
                o.category_id, c.name AS category_name,
                COALESCE(o.sx_print_confirmed, false) AS sx_print_confirmed,
                COALESCE(p.qlx_reviewed, false) AS qlx_reviewed,
                COALESCE(p.qlx_received_phieu, false) AS qlx_received_phieu,
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
                COALESCE(a_in.full_name, pc_in.name) AS nguoi_in,
                (SELECT string_agg(
                    CASE WHEN itc.target_type = 'user' THEN u_itc.full_name ELSE pc_itc.name END, ', ')
                 FROM qlx_in_theu_chung itc
                 LEFT JOIN users u_itc ON itc.target_type = 'user' AND u_itc.id = itc.target_id
                 LEFT JOIN printing_contractors pc_itc ON itc.target_type = 'contractor' AND pc_itc.id = itc.target_id
                 WHERE itc.dht_order_id = o.id
                ) AS in_theu_chung_names,
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
            LEFT JOIN printing_contractors pc_in ON qa_in.assigned_contractor_id = pc_in.id
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

        // Fetch per-phoi fabric reservation statuses
        let phoiFabRows = [];
        if (orderIds.length > 0) {
            phoiFabRows = await db.all(`
                SELECT dht_order_id, item_id, phoi_index,
                       COUNT(*)::int AS total,
                       COUNT(*) FILTER (WHERE status IN ('arrived', 'fulfilled'))::int AS arrived,
                       COUNT(*) FILTER (WHERE status = 'reserved')::int AS pending
                FROM qlx_fabric_reservations
                WHERE dht_order_id = ANY($1) AND status NOT IN ('released')
                GROUP BY dht_order_id, item_id, phoi_index
            `, [orderIds]);
        }
        const phoiFabStatus = {};
        for (const r of phoiFabRows) {
            phoiFabStatus[`${r.dht_order_id}_${r.item_id}_${r.phoi_index}`] = {
                total: r.total, arrived: r.arrived, pending: r.pending
            };
        }

        return { orders, phoi_fab_status: phoiFabStatus };
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

        // Block PC In/May if production ticket not printed or not received by QLX
        if (type === 'in' || type === 'may') {
            const orderStatus = await db.get(`
                SELECT COALESCE(o.sx_print_confirmed, false) AS sx_print_confirmed,
                       COALESCE(p.qlx_received_phieu, false) AS qlx_received_phieu
                FROM dht_orders o LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id
                WHERE o.id = $1
            `, [orderId]);
            if (!orderStatus || !orderStatus.sx_print_confirmed) {
                return reply.code(400).send({ error: 'Chưa In Phiếu SX. Không thể phân công In/May.' });
            }
            if (!orderStatus.qlx_received_phieu) {
                return reply.code(400).send({ error: 'QLX chưa xác nhận nhận Phiếu SX.' });
            }
        }

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

    // ========== PRINT ASSIGNMENT: Combined modal data ==========
    fastify.get('/api/qlx/print-assignment/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });
        const orderId = Number(request.params.orderId);

        // Order info
        const order = await db.get(`SELECT o.id, o.order_code, o.customer_name FROM dht_orders o WHERE o.id = $1`, [orderId]);
        if (!order) return reply.code(404).send({ error: 'Đơn không tồn tại' });
        const items = await db.all(`SELECT id, description, quantity FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id`, [orderId]);
        const itemDesc = items.map(it => it.description || '').filter(Boolean).join(', ');

        // Current print assignment
        const qa = await db.get(`SELECT assigned_user_id, assigned_contractor_id FROM qlx_assignments WHERE dht_order_id = $1 AND assignment_type = 'in'`, [orderId]);
        let currentPrinter = null;
        if (qa) {
            if (qa.assigned_user_id) {
                const u = await db.get('SELECT full_name FROM users WHERE id=$1', [qa.assigned_user_id]);
                currentPrinter = { type: 'user', id: qa.assigned_user_id, name: u ? u.full_name : '' };
            } else if (qa.assigned_contractor_id) {
                const c = await db.get('SELECT name FROM printing_contractors WHERE id=$1', [qa.assigned_contractor_id]);
                currentPrinter = { type: 'contractor', id: qa.assigned_contractor_id, name: c ? c.name : '' };
            }
        }

        // Current In/Thêu Chung
        const itcRows = await db.all(`
            SELECT itc.target_type, itc.target_id,
                   CASE WHEN itc.target_type='user' THEN u.full_name ELSE pc.name END AS name
            FROM qlx_in_theu_chung itc
            LEFT JOIN users u ON itc.target_type='user' AND u.id=itc.target_id
            LEFT JOIN printing_contractors pc ON itc.target_type='contractor' AND pc.id=itc.target_id
            WHERE itc.dht_order_id = $1
        `, [orderId]);
        const currentITC = itcRows.map(r => ({ type: r.target_type, id: r.target_id, name: r.name }));

        // Available staff (Phòng In) — exact match to avoid "KINH DOANH" false positive
        const staff = await db.all(`
            SELECT u.id, u.full_name FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.status='active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
              AND (d.code = 'phongin' OR UPPER(COALESCE(d.name,'')) = 'PHONG IN')
            ORDER BY u.full_name
        `);

        // Available contractors (Gia Công In)
        const contractors = await db.all(`SELECT id, name FROM printing_contractors WHERE is_active=true ORDER BY display_order, name`);

        return {
            order: { id: order.id, order_code: order.order_code, customer_name: order.customer_name, items_desc: itemDesc },
            current_printer: currentPrinter,
            current_itc: currentITC,
            staff,
            contractors
        };
    });

    fastify.post('/api/qlx/print-assignment/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const orderId = Number(request.params.orderId);
        const { printer_type, printer_id, in_theu_chung } = request.body || {};
        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        // Validate mutual exclusion
        if (printer_type && printer_id && Array.isArray(in_theu_chung)) {
            const conflict = in_theu_chung.some(itc => itc.type === printer_type && itc.id === printer_id);
            if (conflict) return reply.code(400).send({ error: 'Người In chính không thể đồng thời ở In/Thêu Chung!' });
        }

        // Save Phân Công In
        if (printer_type && printer_id) {
            const userId = printer_type === 'user' ? Number(printer_id) : null;
            const conId = printer_type === 'contractor' ? Number(printer_id) : null;
            await db.run(`
                INSERT INTO qlx_assignments (dht_order_id, assignment_type, assigned_user_id, assigned_contractor_id, assigned_by, assigned_at)
                VALUES ($1, 'in', $2, $3, $4, $5)
                ON CONFLICT (dht_order_id, assignment_type)
                DO UPDATE SET assigned_user_id = $2, assigned_contractor_id = $3, assigned_by = $4, assigned_at = $5
            `, [orderId, userId, conId, request.user.id, now]);

            let pName = '';
            if (userId) { const u = await db.get('SELECT full_name FROM users WHERE id=$1', [userId]); pName = u ? u.full_name : ''; }
            else if (conId) { const c = await db.get('SELECT name FROM printing_contractors WHERE id=$1', [conId]); pName = c ? '🏭 ' + c.name : ''; }
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [orderId, 'assign_in', 'Phân công In: ' + pName, request.user.id, now]);
        } else {
            // Remove assignment
            await db.run(`DELETE FROM qlx_assignments WHERE dht_order_id = $1 AND assignment_type = 'in'`, [orderId]);
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [orderId, 'unassign_in', 'Gỡ phân công In', request.user.id, now]);
        }

        // Save In/Thêu Chung (replace all)
        await db.run(`DELETE FROM qlx_in_theu_chung WHERE dht_order_id = $1`, [orderId]);
        const itcList = Array.isArray(in_theu_chung) ? in_theu_chung : [];
        const itcNames = [];
        for (const itc of itcList) {
            if (!itc.type || !itc.id) continue;
            await db.run(`INSERT INTO qlx_in_theu_chung (dht_order_id, target_type, target_id, assigned_by, assigned_at) VALUES ($1,$2,$3,$4,$5)
                ON CONFLICT (dht_order_id, target_type, target_id) DO NOTHING`,
                [orderId, itc.type, Number(itc.id), request.user.id, now]);
            if (itc.type === 'user') { const u = await db.get('SELECT full_name FROM users WHERE id=$1', [itc.id]); itcNames.push(u ? u.full_name : ''); }
            else { const c = await db.get('SELECT name FROM printing_contractors WHERE id=$1', [itc.id]); itcNames.push(c ? '🏭 ' + c.name : ''); }
        }
        if (itcNames.length) {
            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [orderId, 'assign_itc', 'In/Thêu Chung: ' + itcNames.join(', '), request.user.id, now]);
        }

        return { success: true };
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

    // ========== CHECKLIST TEMPLATES CRUD ==========
    // GET all active templates
    fastify.get('/api/qlx/checklist/templates', { preHandler: [authenticate] }, async (request, reply) => {
        const templates = await db.all(`SELECT * FROM qlx_checklist_templates WHERE is_active = true ORDER BY sort_order, id`);
        return { templates };
    });

    // GET all templates (including inactive) for admin
    fastify.get('/api/qlx/checklist/templates/all', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const templates = await db.all(`SELECT t.*, u.full_name AS created_by_name FROM qlx_checklist_templates t LEFT JOIN users u ON t.created_by = u.id ORDER BY t.sort_order, t.id`);
        return { templates };
    });

    // POST create template
    fastify.post('/api/qlx/checklist/templates', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { type, content, sort_order } = request.body;
        if (!content || !content.trim()) return reply.code(400).send({ error: 'Nội dung không được trống' });
        const row = await db.get(`INSERT INTO qlx_checklist_templates (type, content, sort_order, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
            [type || 'question', content.trim(), sort_order || 0, request.user.id]);
        return { success: true, template: row };
    });

    // PUT update template
    fastify.put('/api/qlx/checklist/templates/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { content, sort_order, is_active, type } = request.body;
        await db.run(`UPDATE qlx_checklist_templates SET content = COALESCE($1, content), sort_order = COALESCE($2, sort_order), is_active = COALESCE($3, is_active), type = COALESCE($4, type) WHERE id = $5`,
            [content, sort_order, is_active, type, request.params.id]);
        return { success: true };
    });

    // DELETE template
    fastify.delete('/api/qlx/checklist/templates/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        await db.run(`DELETE FROM qlx_checklist_responses WHERE template_id = $1`, [request.params.id]);
        await db.run(`DELETE FROM qlx_checklist_templates WHERE id = $1`, [request.params.id]);
        return { success: true };
    });

    // ========== CHECKLIST PER ORDER ==========
    // GET checklist status for an order
    fastify.get('/api/qlx/checklist/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = parseInt(request.params.orderId);
        const templates = await db.all(`SELECT * FROM qlx_checklist_templates WHERE is_active = true ORDER BY sort_order, id`);
        const responses = await db.all(`SELECT r.*, u.full_name AS checked_by_name FROM qlx_checklist_responses r LEFT JOIN users u ON r.checked_by = u.id WHERE r.dht_order_id = $1`, [orderId]);
        const prep = await db.get(`SELECT qlx_reviewed, qlx_reviewed_at, qlx_reviewed_by FROM qlx_preparation WHERE dht_order_id = $1`, [orderId]);
        const reviewer = prep && prep.qlx_reviewed_by ? await db.get(`SELECT full_name FROM users WHERE id = $1`, [prep.qlx_reviewed_by]) : null;
        return { templates, responses, reviewed: prep ? prep.qlx_reviewed : false, reviewed_at: prep ? prep.qlx_reviewed_at : null, reviewed_by: reviewer ? reviewer.full_name : null };
    });

    // POST confirm checklist for an order
    fastify.post('/api/qlx/checklist/:orderId/confirm', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = parseInt(request.params.orderId);
        const { checks } = request.body; // [{template_id, is_checked}]
        const now = new Date().toISOString();

        // Ensure prep row exists
        await db.run(`INSERT INTO qlx_preparation (dht_order_id) VALUES ($1) ON CONFLICT (dht_order_id) DO NOTHING`, [orderId]);

        // Save individual checks
        if (checks && checks.length) {
            for (const c of checks) {
                await db.run(`INSERT INTO qlx_checklist_responses (dht_order_id, template_id, is_checked, checked_at, checked_by)
                    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (dht_order_id, template_id)
                    DO UPDATE SET is_checked = $3, checked_at = $4, checked_by = $5`,
                    [orderId, c.template_id, true, now, request.user.id]);
            }
        }

        // Mark as reviewed
        await db.run(`UPDATE qlx_preparation SET qlx_reviewed = true, qlx_reviewed_at = $1, qlx_reviewed_by = $2, updated_at = $1 WHERE dht_order_id = $3`,
            [now, request.user.id, orderId]);

        await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5)`,
            [orderId, 'checklist_confirmed', 'QLX xác nhận đã kiểm tra checklist', request.user.id, now]);

        return { success: true };
    });

    // POST reset checklist for an order (Giám Đốc only)
    fastify.post('/api/qlx/checklist/:orderId/reset', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const orderId = parseInt(request.params.orderId);
        const now = new Date().toISOString();

        await db.run(`DELETE FROM qlx_checklist_responses WHERE dht_order_id = $1`, [orderId]);
        await db.run(`UPDATE qlx_preparation SET qlx_reviewed = false, qlx_reviewed_at = NULL, qlx_reviewed_by = NULL, updated_at = $1 WHERE dht_order_id = $2`,
            [now, orderId]);

        await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5)`,
            [orderId, 'checklist_reset', 'Giám Đốc reset checklist', request.user.id, now]);

        return { success: true };
    });

    // ========== FABRIC RESERVATION: Smart Gọi Vải ==========

    // GET lookup: find matching rolls for a phoi
    fastify.get('/api/qlx/fabric-lookup/:orderId/:itemId/:phoiIndex', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const { orderId, itemId, phoiIndex } = request.params;
        const pi = parseInt(phoiIndex) || 0;

        // Get order + item
        const order = await db.get('SELECT id, order_code, customer_name, COALESCE(sx_print_confirmed, false) AS sx_print_confirmed FROM dht_orders WHERE id = $1', [orderId]);
        if (!order) return reply.code(404).send({ error: 'Đơn không tồn tại' });

        const item = await db.get('SELECT id, description, material_pairs, quantity FROM dht_order_items WHERE id = $1 AND dht_order_id = $2', [itemId, orderId]);
        if (!item) return reply.code(404).send({ error: 'Item không tồn tại' });

        let pairs = [];
        try { pairs = typeof item.material_pairs === 'string' ? JSON.parse(item.material_pairs) : (item.material_pairs || []); } catch(e) {}
        const phoi = pairs[pi] || null;
        if (!phoi || !phoi.material_name) return { order, item: { id: item.id, description: item.description }, phoi: null, rolls: [], warehouse: null, existing: [] };

        // Fuzzy match: find kv_fabric_colors matching material + color
        const matches = await db.all(`
            SELECT fc.id AS fabric_color_id, fc.color_name, fc.material_id,
                   m.name AS material_name, m.warehouse_id,
                   w.name AS warehouse_name, w.unit
            FROM kv_fabric_colors fc
            JOIN kv_materials m ON m.id = fc.material_id
            JOIN kv_warehouses w ON w.id = m.warehouse_id
            WHERE fc.is_active = true AND m.is_active = true AND w.is_active = true
              AND UPPER(m.name) = UPPER($1)
              AND UPPER(fc.color_name) = UPPER($2)
            LIMIT 5
        `, [phoi.material_name.trim(), phoi.color_name.trim()]);

        if (!matches.length) {
            // Try ILIKE fuzzy
            const fuzzy = await db.all(`
                SELECT fc.id AS fabric_color_id, fc.color_name, fc.material_id,
                       m.name AS material_name, m.warehouse_id,
                       w.name AS warehouse_name, w.unit
                FROM kv_fabric_colors fc
                JOIN kv_materials m ON m.id = fc.material_id
                JOIN kv_warehouses w ON w.id = m.warehouse_id
                WHERE fc.is_active = true AND m.is_active = true AND w.is_active = true
                  AND m.name ILIKE $1
                  AND fc.color_name ILIKE $2
                LIMIT 5
            `, ['%' + phoi.material_name.trim() + '%', '%' + phoi.color_name.trim() + '%']);
            if (fuzzy.length) matches.push(...fuzzy);
        }

        let rolls = [];
        let warehouse = null;
        if (matches.length > 0) {
            const fc = matches[0];
            warehouse = { unit: fc.unit, warehouse_name: fc.warehouse_name, fabric_color_id: fc.fabric_color_id };

            // Get all rolls for this fabric_color
            rolls = await db.all(`
                SELECT r.id, r.roll_code, r.weight, r.original_weight, r.note,
                       r.called_for_orders, r.created_at AS roll_created_at,
                       COALESCE((
                           SELECT SUM(res.kg_reserved)
                           FROM qlx_fabric_reservations res
                           WHERE res.roll_id = r.id AND res.status IN ('reserved', 'arrived')
                       ), 0) AS reserved_total
                FROM kv_rolls r
                WHERE r.fabric_color_id = $1 AND r.is_returned = false
                ORDER BY r.weight DESC
            `, [fc.fabric_color_id]);

            // Add reservation details for each roll
            for (const roll of rolls) {
                roll.reserved_total = Number(roll.reserved_total);
                roll.available = Number(roll.weight) - roll.reserved_total;
                roll.reservations = await db.all(`
                    SELECT res.id, res.kg_reserved, res.dht_order_id,
                           o.order_code, res.phoi_index, res.item_id,
                           it.description AS product_name,
                           res.arrived_at, res.status AS res_status
                    FROM qlx_fabric_reservations res
                    LEFT JOIN dht_orders o ON o.id = res.dht_order_id
                    LEFT JOIN dht_order_items it ON it.id = res.item_id
                    WHERE res.roll_id = $1 AND res.status IN ('reserved', 'arrived')
                    ORDER BY res.created_at
                `, [roll.id]);
            }
        }

        // Get existing reservations for this order+item+phoi
        const existing = await db.all(`
            SELECT res.*, r.weight AS roll_weight, r.roll_code AS current_roll_code,
                   u_create.full_name AS created_by_name,
                   u_arrive.full_name AS arrived_by_name,
                   parent_o.order_code AS linked_from_order_code,
                   (SELECT string_agg(DISTINCT lo.order_code, ', ')
                    FROM qlx_fabric_reservations lk
                    JOIN dht_orders lo ON lo.id = lk.dht_order_id
                    WHERE lk.linked_call_id = res.id AND lk.status != 'released'
                   ) AS linked_order_codes,
                   (SELECT COUNT(*)::int FROM qlx_fabric_reservations lk WHERE lk.linked_call_id = res.id AND lk.status != 'released') AS linked_count
            FROM qlx_fabric_reservations res
            LEFT JOIN kv_rolls r ON r.id = res.roll_id
            LEFT JOIN users u_create ON u_create.id = res.created_by
            LEFT JOIN users u_arrive ON u_arrive.id = res.arrived_by
            LEFT JOIN qlx_fabric_reservations parent_res ON parent_res.id = res.linked_call_id
            LEFT JOIN dht_orders parent_o ON parent_o.id = parent_res.dht_order_id
            WHERE res.dht_order_id = $1 AND res.item_id = $2 AND res.phoi_index = $3
              AND res.status NOT IN ('released', 'fulfilled')
            ORDER BY res.reservation_type, res.created_at
        `, [orderId, itemId, pi]);

        // Fetch pending new_call reservations from OTHER orders with same material/color
        let pendingCalls = [];
        if (phoi.material_name && phoi.color_name) {
            pendingCalls = await db.all(`
                SELECT res.id, res.dht_order_id, res.item_id, res.phoi_index,
                       res.material_name, res.color_name, res.call_trees, res.call_amount,
                       res.call_content, res.call_note, res.call_date, res.status,
                       o.order_code, it.description AS product_name,
                       u.full_name AS created_by_name,
                       (SELECT COUNT(*)::int FROM qlx_fabric_reservations lk WHERE lk.linked_call_id = res.id AND lk.status != 'released') AS linked_count
                FROM qlx_fabric_reservations res
                LEFT JOIN dht_orders o ON o.id = res.dht_order_id
                LEFT JOIN dht_order_items it ON it.id = res.item_id
                LEFT JOIN users u ON u.id = res.created_by
                WHERE res.reservation_type = 'new_call'
                  AND res.status = 'reserved'
                  AND res.dht_order_id != $1
                  AND UPPER(res.material_name) = UPPER($2)
                  AND UPPER(res.color_name) = UPPER($3)
                ORDER BY res.created_at DESC
            `, [orderId, phoi.material_name.trim(), phoi.color_name.trim()]);
        }

        // Check if this order already linked to any call
        const myLinked = await db.all(`
            SELECT linked_call_id FROM qlx_fabric_reservations
            WHERE dht_order_id = $1 AND item_id = $2 AND phoi_index = $3
              AND reservation_type = 'linked_call' AND status != 'released'
        `, [orderId, itemId, pi]);
        const myLinkedIds = myLinked.map(r => r.linked_call_id);

        return {
            order: { id: order.id, order_code: order.order_code, customer_name: order.customer_name },
            item: { id: item.id, description: item.description, quantity: item.quantity },
            phoi: { material_name: phoi.material_name, color_name: phoi.color_name, phoi_index: pi },
            warehouse,
            rolls,
            existing,
            pendingCalls,
            myLinkedIds
        };
    });

    // POST reserve: save fabric reservation (from_stock or new_call)
    fastify.post('/api/qlx/fabric-reserve', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const { dht_order_id, item_id, phoi_index, material_name, color_name, unit,
                reservation_type, roll_id, roll_code, kg_reserved, roll_note,
                call_trees, call_amount, call_note, call_date, call_content } = request.body || {};

        if (!dht_order_id || !item_id) return reply.code(400).send({ error: 'Thiếu thông tin đơn hàng' });

        // Fabric reservation no longer blocked by sx_print_confirmed (QLX can prepare fabric early)

        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        if (reservation_type === 'from_stock') {
            if (!roll_id || !kg_reserved || Number(kg_reserved) <= 0) return reply.code(400).send({ error: 'Chọn cây vải và nhập số kg' });

            // Validate: check available
            const roll = await db.get('SELECT weight FROM kv_rolls WHERE id = $1 AND is_returned = false', [roll_id]);
            if (!roll) return reply.code(400).send({ error: 'Cây vải không tồn tại hoặc đã trả NCC' });

            // Also count 'arrived' from_stock reservations (they don't reduce available for other orders)
            const reservedSum = await db.get('SELECT COALESCE(SUM(kg_reserved),0) AS total FROM qlx_fabric_reservations WHERE roll_id = $1 AND status IN ($2,$3)', [roll_id, 'reserved', 'arrived']);
            const available = Number(roll.weight) - Number(reservedSum.total);
            if (Number(kg_reserved) > available) return reply.code(400).send({ error: `Không đủ! Cây này còn ${available} ${unit || 'kg'} khả dụng. Hãy sửa kg (✏️) các đơn khác trước.` });

            // from_stock = vải đã ở xưởng → auto status='arrived'
            // Check if reservation already exists for this roll+order+phoi (prevent duplicate key)
            const existingRes = await db.get(
                'SELECT id FROM qlx_fabric_reservations WHERE roll_id = $1 AND dht_order_id = $2 AND phoi_index = $3 AND status IN ($4,$5)',
                [roll_id, dht_order_id, phoi_index||0, 'reserved', 'arrived']
            );
            if (existingRes) {
                return reply.code(400).send({ error: 'Đơn này đã đánh dấu cây vải này rồi! Hãy dùng ✏️ để sửa kg.' });
            }

            await db.run(`
                INSERT INTO qlx_fabric_reservations (dht_order_id, item_id, phoi_index, material_name, color_name, unit,
                    reservation_type, roll_id, roll_code, kg_reserved, roll_note, status, arrived_at, arrived_by, created_by)
                VALUES ($1,$2,$3,$4,$5,$6,'from_stock',$7,$8,$9,$10,'arrived',$11,$12,$13)
            `, [dht_order_id, item_id, phoi_index||0, material_name, color_name, unit||'kg',
                roll_id, roll_code, Number(kg_reserved), roll_note||null, now, request.user.id, request.user.id]);

            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                VALUES ($1, 'fabric_reserve', $2, $3, $4)`,
                [dht_order_id, `Lấy từ kho cây ${roll_code}: ${kg_reserved}${unit||'kg'} cho Phối ${(phoi_index||0)+1} (auto vải về)`, request.user.id, now]);

        } else if (reservation_type === 'new_call') {
            if ((!call_trees || call_trees <= 0) && (!call_amount || Number(call_amount) <= 0))
                return reply.code(400).send({ error: 'Nhập số cây hoặc số lượng gọi vải' });

            await db.run(`
                INSERT INTO qlx_fabric_reservations (dht_order_id, item_id, phoi_index, material_name, color_name, unit,
                    reservation_type, call_trees, call_amount, call_note, call_date, call_content, status, created_by)
                VALUES ($1,$2,$3,$4,$5,$6,'new_call',$7,$8,$9,$10,$11,'reserved',$12)
            `, [dht_order_id, item_id, phoi_index||0, material_name, color_name, unit||'kg',
                call_trees||0, Number(call_amount)||0, call_note||null, call_date||null, call_content||null, request.user.id]);

            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                VALUES ($1, 'fabric_call', $2, $3, $4)`,
                [dht_order_id, `Gọi vải: ${call_content || (material_name+' - '+color_name)}`, request.user.id, now]);
        } else if (reservation_type === 'linked_call') {
            const { linked_call_id } = request.body || {};
            if (!linked_call_id) return reply.code(400).send({ error: 'Thiếu linked_call_id' });

            // Verify parent call exists and is still pending
            const parent = await db.get('SELECT * FROM qlx_fabric_reservations WHERE id = $1 AND reservation_type = $2 AND status = $3',
                [linked_call_id, 'new_call', 'reserved']);
            if (!parent) return reply.code(400).send({ error: 'Cuộc gọi vải gốc không tồn tại hoặc đã xử lý' });

            // Check if already linked
            const alreadyLinked = await db.get(
                'SELECT id FROM qlx_fabric_reservations WHERE dht_order_id=$1 AND linked_call_id=$2 AND status!=$3',
                [dht_order_id, linked_call_id, 'released']);
            if (alreadyLinked) return reply.code(400).send({ error: 'Đã liên kết rồi!' });

            await db.run(`
                INSERT INTO qlx_fabric_reservations (dht_order_id, item_id, phoi_index, material_name, color_name, unit,
                    reservation_type, call_trees, call_amount, call_content, linked_call_id, status, created_by)
                VALUES ($1,$2,$3,$4,$5,$6,'linked_call',$7,$8,$9,$10,'reserved',$11)
            `, [dht_order_id, item_id, phoi_index||0, parent.material_name, parent.color_name, parent.unit||'kg',
                parent.call_trees, parent.call_amount, parent.call_content, linked_call_id, request.user.id]);

            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                VALUES ($1, 'fabric_link', $2, $3, $4)`,
                [dht_order_id, `Liên kết gọi vải: ${parent.call_content || parent.material_name+' - '+parent.color_name} (từ đơn khác)`, request.user.id, now]);
        }

        // Update fabric_called status
        await db.run(`INSERT INTO qlx_preparation (dht_order_id, fabric_called, fabric_called_at, fabric_called_by)
            VALUES ($1, true, $2, $3)
            ON CONFLICT (dht_order_id) DO UPDATE SET fabric_called = true, fabric_called_at = $2, fabric_called_by = $3, updated_at = $2`,
            [dht_order_id, now, request.user.id]);

        // Auto-check: if ALL reservations for this order are 'arrived' → set fabric_arrived = true
        const pending = await db.get(`SELECT COUNT(*)::int AS cnt FROM qlx_fabric_reservations WHERE dht_order_id = $1 AND status = 'reserved'`, [dht_order_id]);
        if (pending && pending.cnt === 0) {
            await db.run(`INSERT INTO qlx_preparation (dht_order_id, fabric_arrived, fabric_arrived_at, fabric_arrived_by)
                VALUES ($1, true, $2, $3)
                ON CONFLICT (dht_order_id) DO UPDATE SET fabric_arrived = true, fabric_arrived_at = $2, fabric_arrived_by = $3, updated_at = $2`,
                [dht_order_id, now, request.user.id]);
        }

        return { success: true };
    });

    // GET all reservations for an order
    fastify.get('/api/qlx/fabric-reservations/:orderId', { preHandler: [authenticate] }, async (request) => {
        const orderId = Number(request.params.orderId);
        const rows = await db.all(`
            SELECT res.*, r.weight AS roll_weight, u.full_name AS created_by_name,
                   it.description AS product_name
            FROM qlx_fabric_reservations res
            LEFT JOIN kv_rolls r ON r.id = res.roll_id
            LEFT JOIN users u ON u.id = res.created_by
            LEFT JOIN dht_order_items it ON it.id = res.item_id
            WHERE res.dht_order_id = $1
            ORDER BY res.phoi_index, res.reservation_type, res.created_at
        `, [orderId]);
        return { reservations: rows };
    });

    // PUT: Update kg_reserved on a from_stock reservation
    fastify.put('/api/qlx/fabric-reserve/:id/update-kg', { preHandler: [authenticate] }, async (request, reply) => {
        const isQLX = await isQLXUser(request);
        if (!isQLX) return reply.code(403).send({ error: 'Không có quyền' });

        const resId = request.params.id;
        const { kg_reserved } = request.body || {};
        const newKg = Number(kg_reserved);
        if (!newKg || newKg <= 0) return reply.code(400).send({ error: 'Số kg phải lớn hơn 0' });

        const res = await db.get('SELECT * FROM qlx_fabric_reservations WHERE id = $1', [resId]);
        if (!res) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (res.reservation_type !== 'from_stock') return reply.code(400).send({ error: 'Chỉ sửa được loại lấy từ kho' });

        const oldKg = Number(res.kg_reserved);

        // Validate: new total must not exceed roll weight
        if (res.roll_id) {
            const roll = await db.get('SELECT weight FROM kv_rolls WHERE id = $1', [res.roll_id]);
            if (roll) {
                const otherSum = await db.get(
                    'SELECT COALESCE(SUM(kg_reserved),0) AS total FROM qlx_fabric_reservations WHERE roll_id = $1 AND id != $2 AND status IN ($3,$4)',
                    [res.roll_id, resId, 'reserved', 'arrived']
                );
                const maxAllowed = Number(roll.weight) - Number(otherSum.total);
                if (newKg > maxAllowed) {
                    return reply.code(400).send({ error: `Tối đa ${maxAllowed} ${res.unit||'kg'}! (Cây ${Number(roll.weight)}${res.unit||'kg'} - đơn khác ${Number(otherSum.total)}${res.unit||'kg'})` });
                }
            }
        }

        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        await db.run('UPDATE qlx_fabric_reservations SET kg_reserved = $1 WHERE id = $2', [newKg, resId]);

        await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
            VALUES ($1, 'fabric_update_kg', $2, $3, $4)`,
            [res.dht_order_id, `Sửa kg cây ${res.roll_code}: ${oldKg} → ${newKg} ${res.unit||'kg'} (Phối ${(res.phoi_index||0)+1})`, request.user.id, now]);

        return { success: true, old_kg: oldKg, new_kg: newKg };
    });

    // PUT: Mark fabric reservation as arrived
    fastify.put('/api/qlx/fabric-reserve/:id/arrive', { preHandler: [authenticate] }, async (request, reply) => {
        const isQLX = await isQLXUser(request);
        if (!isQLX) return reply.code(403).send({ error: 'Không có quyền' });

        const res = await db.get('SELECT * FROM qlx_fabric_reservations WHERE id = $1', [request.params.id]);
        if (!res) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (res.status === 'arrived') return reply.code(400).send({ error: 'Đã xác nhận rồi' });

        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        await db.run('UPDATE qlx_fabric_reservations SET status = $1, arrived_at = $2, arrived_by = $3, updated_at = $2 WHERE id = $4',
            ['arrived', now, request.user.id, request.params.id]);

        const label = res.reservation_type === 'from_stock'
            ? `Vải đã về: Cây ${res.roll_code || ''} (${res.kg_reserved}${res.unit})`
            : `Vải đã về: ${res.call_content || res.material_name + ' - ' + res.color_name}`;
        await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, 'fabric_item_arrived', $2, $3, $4)`,
            [res.dht_order_id, label, request.user.id, now]);

        // ===== CASCADE ARRIVE (2-way) =====
        // Determine the root call ID for cascade
        let rootCallId = null;
        if (res.reservation_type === 'new_call') rootCallId = res.id;
        else if (res.reservation_type === 'linked_call' && res.linked_call_id) rootCallId = res.linked_call_id;

        const affectedOrderIds = [res.dht_order_id];
        if (rootCallId) {
            // Arrive the root call (if not this one)
            if (rootCallId !== res.id) {
                await db.run('UPDATE qlx_fabric_reservations SET status=$1, arrived_at=$2, arrived_by=$3, updated_at=$2 WHERE id=$4 AND status=$5',
                    ['arrived', now, request.user.id, rootCallId, 'reserved']);
                const rootRes = await db.get('SELECT dht_order_id FROM qlx_fabric_reservations WHERE id=$1', [rootCallId]);
                if (rootRes && !affectedOrderIds.includes(rootRes.dht_order_id)) affectedOrderIds.push(rootRes.dht_order_id);
            }
            // Arrive all linked children
            const linkedRows = await db.all(
                'SELECT id, dht_order_id FROM qlx_fabric_reservations WHERE linked_call_id=$1 AND status=$2',
                [rootCallId, 'reserved']);
            for (const lk of linkedRows) {
                await db.run('UPDATE qlx_fabric_reservations SET status=$1, arrived_at=$2, arrived_by=$3, updated_at=$2 WHERE id=$4',
                    ['arrived', now, request.user.id, lk.id]);
                if (!affectedOrderIds.includes(lk.dht_order_id)) affectedOrderIds.push(lk.dht_order_id);
            }
            // Log cascade for linked orders
            for (const oid of affectedOrderIds) {
                if (oid === res.dht_order_id) continue;
                await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, 'fabric_item_arrived', $2, $3, $4)`,
                    [oid, `[Cascade] ${label}`, request.user.id, now]);
            }
        }

        // Auto-update order-level fabric_arrived for ALL affected orders
        for (const oid of affectedOrderIds) {
            const pending = await db.get(`SELECT COUNT(*)::int AS cnt FROM qlx_fabric_reservations WHERE dht_order_id = $1 AND status = 'reserved'`, [oid]);
            if (pending && pending.cnt === 0) {
                await db.run(`INSERT INTO qlx_preparation (dht_order_id, fabric_arrived, fabric_arrived_at, fabric_arrived_by)
                    VALUES ($1, true, $2, $3)
                    ON CONFLICT (dht_order_id) DO UPDATE SET fabric_arrived = true, fabric_arrived_at = $2, fabric_arrived_by = $3, updated_at = $2`,
                    [oid, now, request.user.id]);
            }
        }

        return { success: true };
    });

    // DELETE (release) a reservation
    fastify.delete('/api/qlx/fabric-reserve/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const isGD = user.role === 'giam_doc';
        const isQLX = await isQLXUser(request);
        if (!isGD && !isQLX) return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc QLX' });

        const res = await db.get('SELECT * FROM qlx_fabric_reservations WHERE id = $1', [request.params.id]);
        if (!res) return reply.code(404).send({ error: 'Không tìm thấy' });

        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        await db.run('UPDATE qlx_fabric_reservations SET status = $1, updated_at = $2 WHERE id = $3', ['released', now, request.params.id]);

        await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
            VALUES ($1, 'fabric_release', $2, $3, $4)`,
            [res.dht_order_id, `Giải phóng: ${res.roll_code || 'Gọi vải'} (${res.kg_reserved || res.call_amount}${res.unit})`, user.id, now]);

        // ===== CASCADE RELEASE for new_call =====
        const affectedOrderIds = [res.dht_order_id];
        if (res.reservation_type === 'new_call') {
            // Release all linked children
            const linkedRows = await db.all(
                'SELECT id, dht_order_id FROM qlx_fabric_reservations WHERE linked_call_id=$1 AND status!=$2',
                [res.id, 'released']);
            for (const lk of linkedRows) {
                await db.run('UPDATE qlx_fabric_reservations SET status=$1, updated_at=$2 WHERE id=$3', ['released', now, lk.id]);
                if (!affectedOrderIds.includes(lk.dht_order_id)) affectedOrderIds.push(lk.dht_order_id);
                await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                    VALUES ($1, 'fabric_release', $2, $3, $4)`,
                    [lk.dht_order_id, `[Cascade hủy] Cuộc gọi vải gốc đã bị hủy`, user.id, now]);
            }
        }

        // Recheck order-level fabric_arrived for ALL affected orders
        for (const oid of affectedOrderIds) {
            const remaining = await db.get(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'reserved')::int AS pending FROM qlx_fabric_reservations WHERE dht_order_id = $1 AND status != 'released'`, [oid]);
            if (remaining && remaining.total > 0 && remaining.pending === 0) {
                await db.run(`UPDATE qlx_preparation SET fabric_arrived = true, fabric_arrived_at = $1, fabric_arrived_by = $2, updated_at = $1 WHERE dht_order_id = $3`,
                    [now, user.id, oid]);
            } else {
                await db.run(`UPDATE qlx_preparation SET fabric_arrived = false, fabric_arrived_at = NULL, fabric_arrived_by = NULL, updated_at = $1 WHERE dht_order_id = $2`,
                    [now, oid]);
            }
        }

        return { success: true };
    });

    // ========== RECEIVE PHIEU SX: QLX xác nhận đã nhận phiếu ==========
    fastify.post('/api/qlx/receive-phieu/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const orderId = Number(request.params.orderId);
        const order = await db.get('SELECT COALESCE(sx_print_confirmed, false) AS sx_print_confirmed FROM dht_orders WHERE id = $1', [orderId]);
        if (!order || !order.sx_print_confirmed) {
            return reply.code(400).send({ error: 'Phiếu SX chưa được in. Không thể xác nhận nhận phiếu.' });
        }

        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        await db.run(`INSERT INTO qlx_preparation (dht_order_id) VALUES ($1) ON CONFLICT (dht_order_id) DO NOTHING`, [orderId]);
        await db.run(`UPDATE qlx_preparation SET qlx_received_phieu = true, qlx_received_phieu_at = $1, qlx_received_phieu_by = $2, updated_at = $1 WHERE dht_order_id = $3`,
            [now, request.user.id, orderId]);

        await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5)`,
            [orderId, 'receive_phieu', 'QLX xác nhận đã nhận Phiếu Sản Xuất', request.user.id, now]);

        return { success: true };
    });
};
