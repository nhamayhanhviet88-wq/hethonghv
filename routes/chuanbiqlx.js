// ========== CHUẨN BỊ QLX — Routes ==========
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { syncFinishingRecord } = require('../utils/finishingSync');
const { vnNow } = require('../utils/timezone');

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

    try {
        await db.exec(`ALTER TABLE qlx_fabric_reservations ADD COLUMN IF NOT EXISTS linked_call_id INTEGER REFERENCES qlx_fabric_reservations(id)`);
    } catch(e) { /* column likely exists */ }

    try {
        await db.exec(`ALTER TABLE qlx_fabric_reservations ADD COLUMN IF NOT EXISTS phoi_index INTEGER DEFAULT 0`);
    } catch(e) { console.error('[QLX] phoi_index column:', e.message); }

    // Ticket-level (phiếu) migration updates
    try {
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES dht_order_items(id) ON DELETE CASCADE`);
        await db.exec(`ALTER TABLE qlx_preparation DROP CONSTRAINT IF EXISTS qlx_preparation_dht_order_id_key`);
        await db.exec(`DROP INDEX IF EXISTS idx_qlx_prep_item_id`);
        await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_qlx_prep_item_id ON qlx_preparation(item_id)`);
        await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_qlx_prep_order_null_item ON qlx_preparation(dht_order_id) WHERE item_id IS NULL`);
    } catch(e) { console.error('[QLX] migration qlx_preparation:', e.message); }

    try {
        await db.exec(`ALTER TABLE qlx_assignments ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES dht_order_items(id) ON DELETE CASCADE`);
        await db.exec(`ALTER TABLE qlx_assignments DROP CONSTRAINT IF EXISTS qlx_assignments_dht_order_id_assignment_type_key`);
        await db.exec(`DROP INDEX IF EXISTS idx_qlx_assign_item_type`);
        await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_qlx_assign_item_type ON qlx_assignments(item_id, assignment_type)`);
    } catch(e) { console.error('[QLX] migration qlx_assignments:', e.message); }

    try {
        await db.exec(`ALTER TABLE qlx_order_print_assignments ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES dht_order_items(id) ON DELETE CASCADE`);
        // Drop old unique constraint (PostgreSQL auto-truncated the name — try both variants)
        await db.exec(`ALTER TABLE qlx_order_print_assignments DROP CONSTRAINT IF EXISTS qlx_order_print_assignments_dht_order_id_field_id_operat_key`);
        await db.exec(`ALTER TABLE qlx_order_print_assignments DROP CONSTRAINT IF EXISTS qlx_order_print_assignments_dht_order_id_field_id_operator__key`);
        await db.exec(`DROP INDEX IF EXISTS idx_qlx_print_assign_item_field`);
        await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_qlx_print_assign_item_field ON qlx_order_print_assignments(item_id, field_id, operator_type, operator_id)`);
    } catch(e) { console.error('[QLX] migration qlx_order_print_assignments:', e.message); }

    try {
        await db.exec(`ALTER TABLE printing_records ADD COLUMN IF NOT EXISTS order_item_id INTEGER REFERENCES dht_order_items(id) ON DELETE CASCADE`);
    } catch(e) { console.error('[QLX] migration printing_records:', e.message); }

    try {
        await db.exec(`ALTER TABLE qlx_history ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES dht_order_items(id) ON DELETE CASCADE`);
    } catch(e) { console.error('[QLX] migration qlx_history:', e.message); }

    // Reminders Table and Columns
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS qlx_reminders (
            id SERIAL PRIMARY KEY,
            dht_order_id INTEGER NOT NULL REFERENCES dht_orders(id) ON DELETE CASCADE,
            item_id INTEGER REFERENCES dht_order_items(id) ON DELETE CASCADE,
            dept VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            created_by INTEGER REFERENCES users(id)
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_qlx_reminders_order ON qlx_reminders(dht_order_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_qlx_reminders_item ON qlx_reminders(item_id)`);
        await db.exec(`ALTER TABLE qlx_reminders ADD COLUMN IF NOT EXISTS phoi_index INTEGER DEFAULT 0`);
        // Table to track which reminders have been viewed by workers
        await db.exec(`CREATE TABLE IF NOT EXISTS qlx_reminder_views (
            id SERIAL PRIMARY KEY,
            reminder_id INTEGER NOT NULL REFERENCES qlx_reminders(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id),
            record_type VARCHAR(20) NOT NULL,
            record_id INTEGER,
            viewed_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_qlx_reminder_views_unique ON qlx_reminder_views(reminder_id, user_id, record_type, COALESCE(record_id, 0))`);
    } catch(e) { console.error('[QLX] reminders table:', e.message); }

    try {
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS print_remind_choice VARCHAR(20)`);
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS press_remind_choice VARCHAR(20)`);
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS cut_remind_choice VARCHAR(20)`);
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS may_remind_choice VARCHAR(20)`);
        await db.exec(`ALTER TABLE qlx_preparation ADD COLUMN IF NOT EXISTS hoanthien_remind_choice VARCHAR(20)`);
    } catch(e) { console.error('[QLX] print/press/cut/may/hoanthien choice columns:', e.message); }

    // ========== HELPERS FOR PREPARATION ROWS ==========
    async function ensureOrderPrepRow(orderId) {
        const row = await db.get('SELECT 1 FROM qlx_preparation WHERE dht_order_id = $1 AND item_id IS NULL', [orderId]);
        if (!row) {
            try {
                await db.run('INSERT INTO qlx_preparation (dht_order_id) VALUES ($1)', [orderId]);
            } catch(e) { /* parallel safety */ }
        }
    }

    async function ensureItemPrepRow(orderId, itemId) {
        const row = await db.get('SELECT 1 FROM qlx_preparation WHERE item_id = $1', [itemId]);
        if (!row) {
            try {
                await db.run('INSERT INTO qlx_preparation (dht_order_id, item_id) VALUES ($1, $2)', [orderId, itemId]);
            } catch(e) { /* parallel safety */ }
        }
    }

    async function checkItemCuttingDone(itemId) {
        if (!itemId) return false;

        const item = await db.get(`SELECT material_pairs FROM dht_order_items WHERE id = $1`, [itemId]);
        if (!item) return false;

        let pairs = [];
        try {
            pairs = typeof item.material_pairs === 'string' ? JSON.parse(item.material_pairs) : (item.material_pairs || []);
        } catch(e) {}

        if (pairs.length > 0) {
            for (let i = 0; i < pairs.length; i++) {
                const row = await db.get(`
                    SELECT 1 FROM cutting_records 
                    WHERE order_item_id = $1 
                      AND phoi_index = $2
                      AND is_cut_done = true 
                    LIMIT 1
                `, [itemId, i]);
                
                if (!row) {
                    return false;
                }
            }
            return true;
        } else {
            const hasCuts = await db.get(`SELECT EXISTS (SELECT 1 FROM cutting_records WHERE order_item_id = $1) AS has_cuts`, [itemId]);
            if (!hasCuts || !hasCuts.has_cuts) {
                return false;
            }
            const cutsPending = await db.get(`SELECT EXISTS (SELECT 1 FROM cutting_records WHERE order_item_id = $1 AND is_cut_done = false) AS pending`, [itemId]);
            return !cutsPending?.pending;
        }
    }

    async function checkItemProductionDone(itemId, orderId) {
        if (!itemId) return false;

        // 1. Check Cutting status
        const isCutDone = await checkItemCuttingDone(itemId);
        if (!isCutDone) {
            return false;
        }

        // 2. Check Printing status
        const needsPrint = await db.get(`
            SELECT EXISTS (
                SELECT 1 FROM qlx_order_print_assignments qa
                JOIN printing_fields pf ON qa.field_id = pf.id
                WHERE (qa.item_id = $1 OR (qa.item_id IS NULL AND qa.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = $1)))
                  AND qa.operator_type = 'user'
            ) AS needs_print
        `, [itemId, orderId]);

        if (needsPrint && needsPrint.needs_print) {
            const hasPrintRecs = await db.get(`
                SELECT EXISTS (
                    SELECT 1 FROM printing_records 
                    WHERE order_item_id = $1 OR (order_item_id IS NULL AND dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records WHERE order_item_id = $1))
                ) AS has_recs
            `, [itemId, orderId]);
            if (!hasPrintRecs || !hasPrintRecs.has_recs) {
                return false;
            }
            const printPending = await db.get(`
                SELECT EXISTS (
                    SELECT 1 FROM printing_records pr
                    WHERE (pr.order_item_id = $1 OR (pr.order_item_id IS NULL AND pr.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = $1)))
                      AND pr.is_print_done = false AND pr.contractor_id IS NULL
                ) AS pending
            `, [itemId, orderId]);
            if (printPending && printPending.pending) {
                return false;
            }
        }

        // 3. Check Pressing status
        const needsPress = await db.get(`
            SELECT EXISTS (
                SELECT 1 FROM qlx_order_print_assignments qa
                JOIN printing_fields pf ON qa.field_id = pf.id
                WHERE (qa.item_id = $1 OR (qa.item_id IS NULL AND qa.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = $1)))
                  AND pf.name IN ('IN PET', 'IN DECAL')
                  AND qa.operator_type = 'user'
            ) AS needs_press
        `, [itemId, orderId]);

        if (needsPress && needsPress.needs_press) {
            const hasPressRecs = await db.get(`
                SELECT EXISTS (SELECT 1 FROM pressing_records WHERE order_item_id = $1) AS has_recs
            `, [itemId]);
            if (!hasPressRecs || !hasPressRecs.has_recs) {
                return false;
            }
            const pressPending = await db.get(`
                SELECT EXISTS (SELECT 1 FROM pressing_records WHERE order_item_id = $1 AND is_reported = false) AS pending
            `, [itemId]);
            if (pressPending && pressPending.pending) {
                return false;
            }
        }

        return true;
    }

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
        } else if (status === 'all') {
            where += ` AND (COALESCE(p.is_completed, false) = true OR COALESCE(o.shipping_status, '') != 'shipped')`;
        }

        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(o.shipping_date, o.order_date)) = $${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(o.shipping_date, o.order_date)) = $${idx++}`; params.push(Number(month)); }
        if (category_id) { where += ` AND o.category_id = $${idx++}`; params.push(Number(category_id)); }
        if (search) {
            where += ` AND (o.order_code ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR u_cskh.full_name ILIKE $${idx} OR u_created.full_name ILIKE $${idx})`;
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
                COALESCE(
                    (SELECT string_agg(DISTINCT u_c.full_name, ', ')
                     FROM cutting_records cr_c
                     JOIN users u_c ON cr_c.cutter_id = u_c.id
                     WHERE cr_c.dht_order_id = o.id
                    ),
                    a_cat.full_name
                ) AS nguoi_cat,
                COALESCE(
                    (SELECT string_agg(pf.name || ': ' || op_names.names, '; ' ORDER BY pf.display_order)
                     FROM (
                         SELECT opa.dht_order_id, opa.field_id,
                                string_agg(CASE WHEN opa.operator_type = 'user' THEN u.full_name ELSE pc.name END, ', ') AS names
                         FROM qlx_order_print_assignments opa
                         LEFT JOIN users u ON opa.operator_type = 'user' AND opa.operator_id = u.id
                         LEFT JOIN printing_contractors pc ON opa.operator_type = 'contractor' AND opa.operator_id = pc.id
                         WHERE opa.item_id IS NULL
                         GROUP BY opa.dht_order_id, opa.field_id
                     ) op_names
                     JOIN printing_fields pf ON op_names.field_id = pf.id
                     WHERE op_names.dht_order_id = o.id
                    ),
                    COALESCE(a_in.full_name, pc_in.name)
                ) AS nguoi_in,
                CASE WHEN EXISTS (SELECT 1 FROM qlx_order_print_assignments WHERE dht_order_id = o.id AND item_id IS NULL) THEN NULL
                     ELSE (SELECT string_agg(
                        CASE WHEN itc.target_type = 'user' THEN u_itc.full_name ELSE pc_itc.name END, ', ')
                      FROM qlx_in_theu_chung itc
                      LEFT JOIN users u_itc ON itc.target_type = 'user' AND u_itc.id = itc.target_id
                      LEFT JOIN printing_contractors pc_itc ON itc.target_type = 'contractor' AND pc_itc.id = itc.target_id
                      WHERE itc.dht_order_id = o.id
                     )
                END AS in_theu_chung_names,
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
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id AND p.item_id IS NULL
            -- Assignments join
            LEFT JOIN qlx_assignments qa_cat ON qa_cat.dht_order_id = o.id AND qa_cat.assignment_type = 'cat' AND qa_cat.item_id IS NULL
            LEFT JOIN users a_cat ON qa_cat.assigned_user_id = a_cat.id
            LEFT JOIN qlx_assignments qa_in ON qa_in.dht_order_id = o.id AND qa_in.assignment_type = 'in' AND qa_in.item_id IS NULL
            LEFT JOIN users a_in ON qa_in.assigned_user_id = a_in.id
            LEFT JOIN printing_contractors pc_in ON qa_in.assigned_contractor_id = pc_in.id
            LEFT JOIN qlx_assignments qa_ep ON qa_ep.dht_order_id = o.id AND qa_ep.assignment_type = 'ep' AND qa_ep.item_id IS NULL
            LEFT JOIN users a_ep ON qa_ep.assigned_user_id = a_ep.id
            LEFT JOIN qlx_assignments qa_may ON qa_may.dht_order_id = o.id AND qa_may.assignment_type = 'may' AND qa_may.item_id IS NULL
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
                SELECT doi.dht_order_id, doi.id, doi.description, doi.material_pairs, doi.quantity,
                       cc.name AS cutting_category_name,
                       COALESCE(p_item.material_called, p_order.material_called, false) AS material_called,
                       COALESCE(p_item.material_arrived, p_order.material_arrived, false) AS material_arrived,
                       COALESCE(
                           (SELECT string_agg(DISTINCT u_c.full_name, ', ')
                            FROM cutting_records cr_c
                            JOIN users u_c ON cr_c.cutter_id = u_c.id
                            WHERE cr_c.order_item_id = doi.id
                           ),
                           a_cat_item.full_name, a_cat_ord.full_name
                       ) AS nguoi_cat,
                       COALESCE(
                           (SELECT string_agg(pf.name || ': ' || op_names.names, '; ' ORDER BY pf.display_order)
                            FROM (
                                SELECT opa.item_id, opa.field_id,
                                       string_agg(CASE WHEN opa.operator_type = 'user' THEN u.full_name ELSE pc.name END, ', ') AS names
                                FROM qlx_order_print_assignments opa
                                LEFT JOIN users u ON opa.operator_type = 'user' AND opa.operator_id = u.id
                                LEFT JOIN printing_contractors pc ON opa.operator_type = 'contractor' AND opa.operator_id = pc.id
                                GROUP BY opa.item_id, opa.field_id
                            ) op_names
                            JOIN printing_fields pf ON op_names.field_id = pf.id
                            WHERE op_names.item_id = doi.id
                           ),
                           COALESCE(a_in_item_u.full_name, pc_in_item.name),
                           COALESCE(a_in_ord_u.full_name, pc_in_ord.name)
                       ) AS nguoi_in,
                       COALESCE(
                           (SELECT string_agg(COALESCE(c.name, 'May nhà') || ' (' || sr.quantity || ')', ', ')
                            FROM sewing_records sr
                            LEFT JOIN sewing_contractors c ON sr.contractor_id = c.id
                            WHERE sr.order_item_id = doi.id
                           ),
                           a_may_item_u.full_name, a_may_ord_u.full_name
                       ) AS nguoi_may
                FROM dht_order_items doi
                -- Item-level joins
                LEFT JOIN qlx_preparation p_item ON p_item.item_id = doi.id
                LEFT JOIN qlx_assignments qa_cat_item ON qa_cat_item.item_id = doi.id AND qa_cat_item.assignment_type = 'cat'
                LEFT JOIN users a_cat_item ON qa_cat_item.assigned_user_id = a_cat_item.id
                LEFT JOIN qlx_assignments qa_in_item ON qa_in_item.item_id = doi.id AND qa_in_item.assignment_type = 'in'
                LEFT JOIN users a_in_item_u ON qa_in_item.assigned_user_id = a_in_item_u.id
                LEFT JOIN printing_contractors pc_in_item ON qa_in_item.assigned_contractor_id = pc_in_item.id
                LEFT JOIN qlx_assignments qa_may_item ON qa_may_item.item_id = doi.id AND qa_may_item.assignment_type = 'may'
                LEFT JOIN users a_may_item_u ON qa_may_item.assigned_user_id = a_may_item_u.id
                -- Order-level joins (fallback for legacy)
                LEFT JOIN qlx_preparation p_order ON p_order.dht_order_id = doi.dht_order_id AND p_order.item_id IS NULL
                LEFT JOIN qlx_assignments qa_cat_ord ON qa_cat_ord.dht_order_id = doi.dht_order_id AND qa_cat_ord.assignment_type = 'cat' AND qa_cat_ord.item_id IS NULL
                LEFT JOIN users a_cat_ord ON qa_cat_ord.assigned_user_id = a_cat_ord.id
                LEFT JOIN qlx_assignments qa_in_ord ON qa_in_ord.dht_order_id = doi.dht_order_id AND qa_in_ord.assignment_type = 'in' AND qa_in_ord.item_id IS NULL
                LEFT JOIN users a_in_ord_u ON qa_in_ord.assigned_user_id = a_in_ord_u.id
                LEFT JOIN printing_contractors pc_in_ord ON qa_in_ord.assigned_contractor_id = pc_in_ord.id
                LEFT JOIN qlx_assignments qa_may_ord ON qa_may_ord.dht_order_id = doi.dht_order_id AND qa_may_ord.assignment_type = 'may' AND qa_may_ord.item_id IS NULL
                LEFT JOIN users a_may_ord_u ON qa_may_ord.assigned_user_id = a_may_ord_u.id
                LEFT JOIN dht_products p ON p.name = TRIM(COALESCE(doi.product_name, doi.description)) AND p.is_active = true
                LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id AND cc.category = 'cutting_category'
                WHERE doi.dht_order_id = ANY($1)
                ORDER BY doi.dht_order_id, doi.id
            `, [orderIds]);
        }

        // Group items by order_id
        const itemMap = {};
        for (const it of items) {
            if (!itemMap[it.dht_order_id]) itemMap[it.dht_order_id] = [];
            itemMap[it.dht_order_id].push(it);
        }

        // Fetch cutting records to mark already cut or cutting items as arrived
        let cuttingRows = [];
        if (orderIds.length > 0) {
            cuttingRows = await db.all(`
                SELECT dht_order_id, order_item_id, material_name, fabric_color, is_cutting, is_cut_done
                FROM cutting_records
                WHERE dht_order_id = ANY($1)
            `, [orderIds]);
        }

        const orderHasCuts = {};
        for (const c of cuttingRows) {
            if (c.is_cutting || c.is_cut_done) {
                orderHasCuts[c.dht_order_id] = true;
            }
        }

        // Attach items to orders and dynamically update order-level fabric flags
        for (const o of orders) {
            o.items = itemMap[o.id] || [];
            if (orderHasCuts[o.id]) {
                o.fabric_called = true;
                o.fabric_arrived = true;
            }
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

        // Match cutting records with items to override status if cut/cutting
        for (const item of items) {
            let pairs = [];
            try {
                pairs = typeof item.material_pairs === 'string' ? JSON.parse(item.material_pairs) : (item.material_pairs || []);
            } catch(e) {}
            if (!Array.isArray(pairs)) pairs = [];

            const itemCuts = cuttingRows.filter(c => c.order_item_id === item.id);
            const hasCuts = itemCuts.length > 0;
            const allCutDone = hasCuts && itemCuts.every(c => c.is_cut_done === true);
            item.is_cut_done = allCutDone;
            item.is_material_done = !!(item.material_called || item.material_arrived);

            pairs.forEach((p, pIdx) => {
                const pMat = (p.material_name || '').trim().toLowerCase();
                const pColor = (p.color_name || '').trim().toLowerCase();

                const match = itemCuts.find(c => {
                    const cMat = (c.material_name || '').trim().toLowerCase();
                    const cColor = (c.fabric_color || '').trim().toLowerCase();
                    return cMat === pMat && cColor === pColor;
                });

                if (match && (match.is_cutting || match.is_cut_done)) {
                    const key = `${item.dht_order_id}_${item.id}_${pIdx}`;
                    phoiFabStatus[key] = {
                        total: 1,
                        arrived: 1,
                        pending: 0
                    };
                }
            });
        }

        for (const o of orders) {
            const oItems = itemMap[o.id] || [];
            if (oItems.length > 0) {
                o.is_cut_done = oItems.every(it => it.is_cut_done);
                o.is_material_done = oItems.every(it => it.is_material_done);
            } else {
                o.is_cut_done = false;
                o.is_material_done = !!(o.material_called || o.material_arrived);
            }
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
        await ensureOrderPrepRow(orderId);

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
        const { action, item_id } = request.body || {};
        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        if (item_id) {
            const itemId = Number(item_id);
            await ensureItemPrepRow(orderId, itemId);

            if (action === 'call') {
                await db.run(`UPDATE qlx_preparation SET material_called = true, material_called_at = $1, material_called_by = $2, updated_at = $1 WHERE item_id = $3`,
                    [now, request.user.id, itemId]);
                await db.run(`INSERT INTO qlx_history (dht_order_id, item_id, action, details, performed_by, performed_at) VALUES ($1, $2, 'material_called', 'Đã gọi vật liệu (theo phiếu)', $3, $4)`,
                    [orderId, itemId, request.user.id, now]);
            } else if (action === 'arrive') {
                await db.run(`UPDATE qlx_preparation SET material_arrived = true, material_arrived_at = $1, material_arrived_by = $2, updated_at = $1 WHERE item_id = $3`,
                    [now, request.user.id, itemId]);
                await db.run(`INSERT INTO qlx_history (dht_order_id, item_id, action, details, performed_by, performed_at) VALUES ($1, $2, 'material_arrived', 'Vật liệu đã về (theo phiếu)', $3, $4)`,
                    [orderId, itemId, request.user.id, now]);
            } else if (action === 'reset_call') {
                await db.run(`UPDATE qlx_preparation SET material_called = false, material_called_at = NULL, material_called_by = NULL, material_arrived = false, material_arrived_at = NULL, material_arrived_by = NULL, updated_at = $1 WHERE item_id = $2`,
                    [now, itemId]);
                await db.run(`INSERT INTO qlx_history (dht_order_id, item_id, action, details, performed_by, performed_at) VALUES ($1, $2, 'material_reset', 'Đã reset trạng thái vật liệu (theo phiếu)', $3, $4)`,
                    [orderId, itemId, request.user.id, now]);
            } else if (action === 'reset_arrive') {
                await db.run(`UPDATE qlx_preparation SET material_arrived = false, material_arrived_at = NULL, material_arrived_by = NULL, updated_at = $1 WHERE item_id = $2`,
                    [now, itemId]);
                await db.run(`INSERT INTO qlx_history (dht_order_id, item_id, action, details, performed_by, performed_at) VALUES ($1, $2, 'material_arrive_reset', 'Đã reset vật liệu về (theo phiếu)', $3, $4)`,
                    [orderId, itemId, request.user.id, now]);
            }
        } else {
            await ensureOrderPrepRow(orderId);

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
        }

        return { success: true };
    });

    async function checkSewingPrerequisites(orderId, itemId) {
        let isCutDone = true;
        let isMatDone = true;

        if (itemId) {
            isCutDone = await checkItemCuttingDone(itemId);

            const matStatus = await db.get(`
                SELECT 
                    COALESCE(
                        (SELECT material_called OR material_arrived FROM qlx_preparation WHERE item_id = $1),
                        (SELECT material_called OR material_arrived FROM qlx_preparation WHERE dht_order_id = $2 AND item_id IS NULL),
                        false
                    ) AS material_done
            `, [itemId, orderId]);

            isMatDone = !!(matStatus && matStatus.material_done);
        } else {
            const items = await db.all(`SELECT id FROM dht_order_items WHERE dht_order_id = $1`, [orderId]);
            if (items.length > 0) {
                for (const item of items) {
                    const cutDone = await checkItemCuttingDone(item.id);
                    if (!cutDone) {
                        isCutDone = false;
                    }

                    const mat = await db.get(`
                        SELECT 
                            COALESCE(
                                (SELECT material_called OR material_arrived FROM qlx_preparation WHERE item_id = $1),
                                (SELECT material_called OR material_arrived FROM qlx_preparation WHERE dht_order_id = $2 AND item_id IS NULL),
                                false
                            ) AS material_done
                    `, [item.id, orderId]);
                    if (!mat || !mat.material_done) {
                        isMatDone = false;
                    }
                }
            } else {
                const cut = await db.get(`
                    SELECT 
                        EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = $1) AS has_cut_records,
                        NOT EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = $1 AND is_cut_done = false) AS all_cuts_done
                `, [orderId]);
                isCutDone = !!(cut && cut.has_cut_records && cut.all_cuts_done);

                const mat = await db.get(`
                    SELECT material_called OR material_arrived AS material_done FROM qlx_preparation WHERE dht_order_id = $1 AND item_id IS NULL
                `, [orderId]);
                isMatDone = !!(mat && mat.material_done);
            }
        }

        return { isCutDone, isMatDone };
    }

    fastify.get('/api/qlx/assign-check/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const orderId = Number(request.params.orderId);
        const { type, item_id } = request.query || {};

        if (type === 'may') {
            const itemId = item_id ? Number(item_id) : 0;
            return await checkSewingPrerequisites(orderId, itemId);
        }

        return { isCutDone: true, isMatDone: true };
    });

    fastify.post('/api/qlx/assign/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const orderId = Number(request.params.orderId);
        const { type, user_id, item_id } = request.body || {};
        const validTypes = ['cat', 'in', 'ep', 'may'];
        if (!validTypes.includes(type)) return reply.code(400).send({ error: 'Loại phân công không hợp lệ' });

        // Block PC In/May if production ticket not printed or not received by QLX
        if (type === 'in' || type === 'may') {
            const orderStatus = await db.get(`
                SELECT COALESCE(o.sx_print_confirmed, false) AS sx_print_confirmed,
                       COALESCE(p.qlx_reviewed, false) AS qlx_reviewed,
                       COALESCE(p.qlx_received_phieu, false) AS qlx_received_phieu
                FROM dht_orders o LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id AND p.item_id IS NULL
                WHERE o.id = $1
            `, [orderId]);
            if (!orderStatus || !orderStatus.sx_print_confirmed) {
                return reply.code(400).send({ error: 'Chưa In Phiếu SX. Không thể phân công In/May.' });
            }
            if (!orderStatus.qlx_reviewed) {
                return reply.code(400).send({ error: 'Chưa duyệt checklist. Không thể phân công In/May.' });
            }
            if (!orderStatus.qlx_received_phieu) {
                return reply.code(400).send({ error: 'QLX chưa xác nhận nhận Phiếu SX.' });
            }

            if (type === 'may' && user_id) {
                const itemId = item_id ? Number(item_id) : 0;
                const { isCutDone, isMatDone } = await checkSewingPrerequisites(orderId, itemId);
                if (!isCutDone || !isMatDone) {
                    let errMsg = '';
                    if (!isCutDone && !isMatDone) {
                        errMsg = 'Cắt chưa xong và Gọi vật liệu chưa xong';
                    } else if (!isCutDone) {
                        errMsg = 'Cắt chưa xong';
                    } else {
                        errMsg = 'Gọi vật liệu chưa xong';
                    }
                    return reply.code(400).send({ error: errMsg });
                }
            }
        }

        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        const typeLabels = { cat: 'Cắt', in: 'In', ep: 'Ép', may: 'May' };

        if (item_id) {
            const itemId = Number(item_id);
            if (user_id) {
                const staff = await db.get('SELECT full_name FROM users WHERE id = $1', [Number(user_id)]);
                await db.run(`
                    INSERT INTO qlx_assignments (dht_order_id, item_id, assignment_type, assigned_user_id, assigned_by, assigned_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (item_id, assignment_type)
                    DO UPDATE SET assigned_user_id = $4, assigned_by = $5, assigned_at = $6
                `, [orderId, itemId, type, Number(user_id), request.user.id, now]);

                await db.run(`INSERT INTO qlx_history (dht_order_id, item_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [orderId, itemId, 'assign_' + type, `Phân công ${typeLabels[type]} (theo phiếu): ${staff?.full_name || 'N/A'}`, request.user.id, now]);
            } else {
                await db.run(`DELETE FROM qlx_assignments WHERE item_id = $1 AND assignment_type = $2`, [itemId, type]);
                await db.run(`INSERT INTO qlx_history (dht_order_id, item_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [orderId, itemId, 'unassign_' + type, `Gỡ phân công ${typeLabels[type]} (theo phiếu)`, request.user.id, now]);
            }
        } else {
            if (user_id) {
                const staff = await db.get('SELECT full_name FROM users WHERE id = $1', [Number(user_id)]);
                await db.run(`DELETE FROM qlx_assignments WHERE dht_order_id = $1 AND assignment_type = $2 AND item_id IS NULL`, [orderId, type]);
                await db.run(`
                    INSERT INTO qlx_assignments (dht_order_id, assignment_type, assigned_user_id, assigned_by, assigned_at)
                    VALUES ($1, $2, $3, $4, $5)
                `, [orderId, type, Number(user_id), request.user.id, now]);

                await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5)`,
                    [orderId, 'assign_' + type, `Phân công ${typeLabels[type]}: ${staff?.full_name || 'N/A'}`, request.user.id, now]);
            } else {
                // Remove assignment
                await db.run(`DELETE FROM qlx_assignments WHERE dht_order_id = $1 AND assignment_type = $2 AND item_id IS NULL`, [orderId, type]);
                await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5)`,
                    [orderId, 'unassign_' + type, `Gỡ phân công ${typeLabels[type]}`, request.user.id, now]);
            }
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

    // ========== GET REMINDERS FOR DEPARTMENTS ==========
    fastify.get('/api/qlx/reminders', { preHandler: [authenticate] }, async (request, reply) => {
        const { order_id, item_id, dept, phoi_index } = request.query || {};
        if (!order_id) return reply.code(400).send({ error: 'Thiếu order_id' });
        
        const orderId = Number(order_id);
        const deptFilter = dept ? ` AND dept = '${dept.replace(/'/g, "''")}'` : '';
        const phoiFilter = (dept === 'cat' && phoi_index !== undefined && phoi_index !== null) ? ` AND phoi_index = ${parseInt(phoi_index)}` : '';
        
        let reminders = [];
        
        if (item_id) {
            // Item-level: only show reminders for this specific item and coordinate
            reminders = await db.all(
                `SELECT id, content, dept, item_id, phoi_index FROM qlx_reminders WHERE dht_order_id = $1 AND item_id = $2${deptFilter}${phoiFilter} ORDER BY id`,
                [orderId, Number(item_id)]
            );
            // Fallback to order-level reminders (item_id IS NULL) only if this item/phoi has none
            if (reminders.length === 0) {
                reminders = await db.all(
                    `SELECT id, content, dept, item_id, phoi_index FROM qlx_reminders WHERE dht_order_id = $1 AND item_id IS NULL${deptFilter}${phoiFilter} ORDER BY id`,
                    [orderId]
                );
            }
        } else {
            // Order-level: show order-level reminders first
            reminders = await db.all(
                `SELECT id, content, dept, item_id, phoi_index FROM qlx_reminders WHERE dht_order_id = $1 AND item_id IS NULL${deptFilter}${phoiFilter} ORDER BY id`,
                [orderId]
            );
            // Fallback: if no order-level reminders, show ALL reminders for this order (optionally matching phoi)
            if (reminders.length === 0) {
                reminders = await db.all(
                    `SELECT id, content, dept, item_id, phoi_index FROM qlx_reminders WHERE dht_order_id = $1${deptFilter}${phoiFilter} ORDER BY id`,
                    [orderId]
                );
            }
        }
        
        // Check which reminders have been viewed by any user
        let viewedIds = [];
        if (reminders.length > 0) {
            const reminderIds = reminders.map(r => r.id);
            const { record_type, record_id } = request.query || {};
            let views;
            if (record_type) {
                const rId = record_id ? Number(record_id) : null;
                if (record_type === 'sewing_qc') {
                    views = await db.all(
                        `SELECT DISTINCT reminder_id FROM qlx_reminder_views 
                         WHERE reminder_id = ANY($1) 
                           AND record_type = 'sewing_qc' 
                           AND COALESCE(record_id, 0) = COALESCE($2, 0)`,
                        [reminderIds, rId]
                    );
                } else {
                    views = await db.all(
                        `SELECT DISTINCT reminder_id FROM qlx_reminder_views 
                         WHERE reminder_id = ANY($1) 
                           AND (
                               (record_type = $2 AND COALESCE(record_id, 0) = COALESCE($3, 0))
                               OR (record_type = 'sewing_records' AND COALESCE(record_id, 0) = COALESCE($3, 0))
                           )`,
                        [reminderIds, record_type, rId]
                    );
                }
            } else {
                views = await db.all(
                    `SELECT DISTINCT reminder_id FROM qlx_reminder_views WHERE reminder_id = ANY($1)`,
                    [reminderIds]
                );
            }
            viewedIds = views.map(v => v.reminder_id);
            
            // Auto-view if task is completed
            for (const r of reminders) {
                if (viewedIds.includes(r.id)) continue;
                if (r.dept === 'in') {
                    const row = record_id
                        ? await db.get(`SELECT 1 FROM printing_records WHERE id = $1 AND (is_print_done = true OR contractor_id IS NOT NULL) LIMIT 1`, [Number(record_id)])
                        : (r.item_id 
                            ? await db.get(`SELECT 1 FROM printing_records WHERE dht_order_id = $1 AND order_item_id = $2 AND (is_print_done = true OR contractor_id IS NOT NULL) LIMIT 1`, [orderId, r.item_id])
                            : await db.get(`SELECT 1 FROM printing_records WHERE dht_order_id = $1 AND (is_print_done = true OR contractor_id IS NOT NULL) LIMIT 1`, [orderId]));
                    if (row) viewedIds.push(r.id);
                } else if (r.dept === 'ep') {
                    const row = record_id
                        ? await db.get(`SELECT 1 FROM pressing_records WHERE id = $1 AND is_reported = true LIMIT 1`, [Number(record_id)])
                        : (r.item_id
                            ? await db.get(`SELECT 1 FROM pressing_records WHERE dht_order_id = $1 AND order_item_id = $2 AND is_reported = true LIMIT 1`, [orderId, r.item_id])
                            : await db.get(`SELECT 1 FROM pressing_records WHERE dht_order_id = $1 AND is_reported = true LIMIT 1`, [orderId]));
                    if (row) viewedIds.push(r.id);
                } else if (r.dept === 'cat') {
                    const row = record_id
                        ? await db.get(`SELECT 1 FROM cutting_records WHERE id = $1 AND is_cut_done = true LIMIT 1`, [Number(record_id)])
                        : (r.item_id
                            ? (r.phoi_index !== null && r.phoi_index !== undefined
                                ? await db.get(`SELECT 1 FROM cutting_records WHERE dht_order_id = $1 AND order_item_id = $2 AND phoi_index = $3 AND is_cut_done = true LIMIT 1`, [orderId, r.item_id, r.phoi_index])
                                : await db.get(`SELECT 1 FROM cutting_records WHERE dht_order_id = $1 AND order_item_id = $2 AND is_cut_done = true LIMIT 1`, [orderId, r.item_id])
                              )
                            : await db.get(`SELECT 1 FROM cutting_records WHERE dht_order_id = $1 AND is_cut_done = true LIMIT 1`, [orderId]));
                    if (row) viewedIds.push(r.id);
                } else if (r.dept === 'may') {
                    const row = record_id
                        ? await db.get(`SELECT 1 FROM sewing_records WHERE id = $1 AND done_date IS NOT NULL LIMIT 1`, [Number(record_id)])
                        : (r.item_id
                            ? await db.get(`SELECT 1 FROM sewing_records WHERE dht_order_id = $1 AND order_item_id = $2 AND done_date IS NOT NULL LIMIT 1`, [orderId, r.item_id])
                            : await db.get(`SELECT 1 FROM sewing_records WHERE dht_order_id = $1 AND done_date IS NOT NULL LIMIT 1`, [orderId]));
                    if (row) viewedIds.push(r.id);
                } else if (r.dept === 'hoanthien') {
                    const row = record_id
                        ? await db.get(`SELECT 1 FROM finishing_records WHERE id = $1 AND (is_completed = true OR done_date IS NOT NULL) LIMIT 1`, [Number(record_id)])
                        : (r.item_id
                            ? await db.get(`SELECT 1 FROM finishing_records fr JOIN sewing_records sr ON fr.sewing_record_id = sr.id WHERE fr.dht_order_id = $1 AND sr.order_item_id = $2 AND (fr.is_completed = true OR fr.done_date IS NOT NULL) LIMIT 1`, [orderId, r.item_id])
                            : await db.get(`SELECT 1 FROM finishing_records WHERE dht_order_id = $1 AND (is_completed = true OR done_date IS NOT NULL) LIMIT 1`, [orderId]));
                    if (row) viewedIds.push(r.id);
                }
            }
        }
        
        return {
            reminders: reminders.map(r => r.content),
            reminder_ids: reminders.map(r => r.id),
            viewed_ids: viewedIds
        };
    });

    // ========== MARK REMINDERS AS VIEWED ==========
    fastify.post('/api/qlx/reminders/viewed', { preHandler: [authenticate] }, async (request, reply) => {
        const { reminder_ids, record_type, record_id } = request.body || {};
        if (!Array.isArray(reminder_ids) || reminder_ids.length === 0) {
            return reply.code(400).send({ error: 'Thiếu reminder_ids' });
        }
        if (!record_type) {
            return reply.code(400).send({ error: 'Thiếu record_type' });
        }
        
        const userId = request.user.id;
        const now = vnNow();
        
        for (const remId of reminder_ids) {
            const rId = record_id ? Number(record_id) : null;
            await db.run(
                `INSERT INTO qlx_reminder_views (reminder_id, user_id, record_type, record_id, viewed_at)
                 SELECT $1::integer, $2::integer, $3::text, $4::integer, $5::timestamptz
                 WHERE NOT EXISTS (
                     SELECT 1 FROM qlx_reminder_views
                     WHERE reminder_id = $1::integer AND user_id = $2::integer AND record_type = $3::text AND COALESCE(record_id, 0) = COALESCE($4::integer, 0)
                 )`,
                [Number(remId), userId, record_type, rId, now]
            );
        }
        
        return { success: true };
    });

    // ========== PRINT ASSIGNMENT: Combined modal data ==========
    fastify.get('/api/qlx/print-assignment/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });
        const orderId = Number(request.params.orderId);
        const { item_id } = request.query || {};
        const itemId = item_id ? Number(item_id) : null;

        // Order info
        const order = await db.get(`SELECT o.id, o.order_code, o.customer_name FROM dht_orders o WHERE o.id = $1`, [orderId]);
        if (!order) return reply.code(404).send({ error: 'Đơn không tồn tại' });
        
        let itemDesc = '';
        if (itemId) {
            const it = await db.get(`SELECT description, quantity FROM dht_order_items WHERE id = $1`, [itemId]);
            if (it) itemDesc = (it.description || '') + ' (SL: ' + (it.quantity || 0) + ')';
        } else {
            const items = await db.all(`SELECT id, description, quantity FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id`, [orderId]);
            itemDesc = items.map(it => (it.description || '') + ' (SL: ' + (it.quantity || 0) + ')').filter(Boolean).join(', ');
        }

        // Active print fields
        const activeFields = await db.all(`SELECT id, name FROM printing_fields WHERE is_active=true ORDER BY display_order, name`);
        
        // Mapped operators per field
        const opMappings = await db.all(`
            SELECT fo.field_id, fo.operator_type, fo.operator_id,
                   CASE WHEN fo.operator_type = 'user' THEN u.full_name ELSE c.name END AS name
            FROM printing_field_operators fo
            LEFT JOIN users u ON fo.operator_type = 'user' AND fo.operator_id = u.id
            LEFT JOIN printing_contractors c ON fo.operator_type = 'contractor' AND fo.operator_id = c.id
            WHERE (fo.operator_type = 'user' AND u.status = 'active') OR (fo.operator_type = 'contractor' AND c.is_active = true)
        `);
        
        // Group mappings by field_id
        const mappingsByField = {};
        for (const f of activeFields) {
            mappingsByField[f.id] = { staff: [], contractors: [] };
        }
        for (const op of opMappings) {
            if (mappingsByField[op.field_id]) {
                if (op.operator_type === 'user') {
                    mappingsByField[op.field_id].staff.push({ id: op.operator_id, name: op.name });
                } else {
                    mappingsByField[op.field_id].contractors.push({ id: op.operator_id, name: op.name });
                }
            }
        }

        const fieldsWithOps = activeFields.map(f => ({
            id: f.id,
            name: f.name,
            staff: mappingsByField[f.id].staff,
            contractors: mappingsByField[f.id].contractors
        }));

        // Current assignments for this order/item
        let currentAssigns = [];
        if (itemId) {
            currentAssigns = await db.all(`
                SELECT field_id, operator_type, operator_id
                FROM qlx_order_print_assignments
                WHERE item_id = $1
            `, [itemId]);
        } else {
            currentAssigns = await db.all(`
                SELECT field_id, operator_type, operator_id
                FROM qlx_order_print_assignments
                WHERE dht_order_id = $1 AND item_id IS NULL
            `, [orderId]);
        }

        // Fetch choices & reminders
        if (itemId) {
            await ensureItemPrepRow(orderId, itemId);
        } else {
            await ensureOrderPrepRow(orderId);
        }
        
        let prep = null;
        if (itemId) {
            prep = await db.get(`SELECT print_remind_choice, press_remind_choice FROM qlx_preparation WHERE item_id = $1`, [itemId]);
        } else {
            prep = await db.get(`SELECT print_remind_choice, press_remind_choice FROM qlx_preparation WHERE dht_order_id = $1 AND item_id IS NULL`, [orderId]);
        }
        const printChoice = prep ? prep.print_remind_choice : null;
        const pressChoice = prep ? prep.press_remind_choice : null;

        let reminders = [];
        if (itemId) {
            reminders = await db.all(`SELECT id, dept, content FROM qlx_reminders WHERE item_id = $1 ORDER BY id`, [itemId]);
        } else {
            reminders = await db.all(`SELECT id, dept, content FROM qlx_reminders WHERE dht_order_id = $1 AND item_id IS NULL ORDER BY id`, [orderId]);
        }

        const reminderIds = reminders.map(r => r.id);
        let viewedIds = [];
        if (reminderIds.length > 0) {
            const views = await db.all(
                `SELECT DISTINCT reminder_id FROM qlx_reminder_views WHERE reminder_id = ANY($1)`,
                [reminderIds]
            );
            viewedIds = views.map(v => v.reminder_id);

            // Auto-view if task is completed
            for (const r of reminders) {
                if (viewedIds.includes(r.id)) continue;
                if (r.dept === 'in') {
                    const row = itemId 
                        ? await db.get(`SELECT 1 FROM printing_records WHERE dht_order_id = $1 AND order_item_id = $2 AND (is_print_done = true OR contractor_id IS NOT NULL) LIMIT 1`, [orderId, itemId])
                        : await db.get(`SELECT 1 FROM printing_records WHERE dht_order_id = $1 AND (is_print_done = true OR contractor_id IS NOT NULL) LIMIT 1`, [orderId]);
                    if (row) viewedIds.push(r.id);
                } else if (r.dept === 'ep') {
                    const row = itemId
                        ? await db.get(`SELECT 1 FROM pressing_records WHERE dht_order_id = $1 AND order_item_id = $2 AND is_reported = true LIMIT 1`, [orderId, itemId])
                        : await db.get(`SELECT 1 FROM pressing_records WHERE dht_order_id = $1 AND is_reported = true LIMIT 1`, [orderId]);
                    if (row) viewedIds.push(r.id);
                }
            }
        }

        let isProdDone = false;
        if (itemId) {
            isProdDone = await checkItemProductionDone(itemId, orderId);
        } else {
            const items = await db.all(`SELECT id FROM dht_order_items WHERE dht_order_id = $1`, [orderId]);
            if (items.length > 0) {
                let allItemsDone = true;
                for (const item of items) {
                    const done = await checkItemProductionDone(item.id, orderId);
                    if (!done) {
                        allItemsDone = false;
                        break;
                    }
                }
                isProdDone = allItemsDone;
            }
        }

        // Check if print or press is done
        let isPrintDone = false;
        let isPressDone = false;
        if (itemId) {
            const printRecs = await db.all(`SELECT is_print_done, contractor_id FROM printing_records WHERE dht_order_id = $1 AND order_item_id = $2`, [orderId, itemId]);
            isPrintDone = printRecs.length > 0 && printRecs.every(r => r.is_print_done || r.contractor_id !== null);

            const pressRecs = await db.all(`SELECT is_reported FROM pressing_records WHERE dht_order_id = $1 AND order_item_id = $2`, [orderId, itemId]);
            isPressDone = pressRecs.length > 0 && pressRecs.every(r => r.is_reported);
        } else {
            const printRecs = await db.all(`SELECT is_print_done, contractor_id FROM printing_records WHERE dht_order_id = $1 AND order_item_id IS NULL`, [orderId]);
            isPrintDone = printRecs.length > 0 && printRecs.every(r => r.is_print_done || r.contractor_id !== null);

            const pressRecs = await db.all(`SELECT is_reported FROM pressing_records WHERE dht_order_id = $1 AND order_item_id IS NULL`, [orderId]);
            isPressDone = pressRecs.length > 0 && pressRecs.every(r => r.is_reported);
        }

        return {
            order: { id: order.id, order_code: order.order_code, customer_name: order.customer_name, items_desc: itemDesc },
            fields: fieldsWithOps,
            assignments: currentAssigns,
            print_remind_choice: printChoice,
            press_remind_choice: pressChoice,
            reminders: reminders.map(r => ({
                id: r.id,
                dept: r.dept,
                content: r.content,
                is_viewed: viewedIds.includes(r.id)
            })),
            is_production_done: isProdDone,
            is_print_done: isPrintDone,
            is_press_done: isPressDone
        };
    });

    fastify.post('/api/qlx/print-assignment/:orderId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const orderId = Number(request.params.orderId);
        const { 
            assignments, 
            item_id, 
            print_remind_choice, 
            press_remind_choice, 
            print_reminders, 
            press_reminders 
        } = request.body || {}; // array of { field_id, operator_type, operator_id }
        const itemId = item_id ? Number(item_id) : null;

        // Check if production is completed
        let isProdDone = false;
        if (itemId) {
            isProdDone = await checkItemProductionDone(itemId, orderId);
        } else {
            const items = await db.all(`SELECT id FROM dht_order_items WHERE dht_order_id = $1`, [orderId]);
            if (items.length > 0) {
                let allItemsDone = true;
                for (const item of items) {
                    const done = await checkItemProductionDone(item.id, orderId);
                    if (!done) {
                        allItemsDone = false;
                        break;
                    }
                }
                isProdDone = allItemsDone;
            }
        }

        if (isProdDone) {
            return reply.code(400).send({ error: 'Phiếu này đã hoàn thành sản xuất, không thể chỉnh sửa nhắc nhở bộ phận in/ép!' });
        }

        const { vnNow, vnDateStr } = require('../utils/timezone');
        const now = vnNow();
        const todayStr = vnDateStr();

        // Check if print or press is done
        let isPrintDone = false;
        let isPressDone = false;
        if (itemId) {
            const printRecs = await db.all(`SELECT is_print_done, contractor_id FROM printing_records WHERE dht_order_id = $1 AND order_item_id = $2`, [orderId, itemId]);
            isPrintDone = printRecs.length > 0 && printRecs.every(r => r.is_print_done || r.contractor_id !== null);

            const pressRecs = await db.all(`SELECT is_reported FROM pressing_records WHERE dht_order_id = $1 AND order_item_id = $2`, [orderId, itemId]);
            isPressDone = pressRecs.length > 0 && pressRecs.every(r => r.is_reported);
        } else {
            const printRecs = await db.all(`SELECT is_print_done, contractor_id FROM printing_records WHERE dht_order_id = $1 AND order_item_id IS NULL`, [orderId]);
            isPrintDone = printRecs.length > 0 && printRecs.every(r => r.is_print_done || r.contractor_id !== null);

            const pressRecs = await db.all(`SELECT is_reported FROM pressing_records WHERE dht_order_id = $1 AND order_item_id IS NULL`, [orderId]);
            isPressDone = pressRecs.length > 0 && pressRecs.every(r => r.is_reported);
        }

        // Fetch existing qlx_preparation to preserve choices
        let existingPrep = null;
        if (itemId) {
            existingPrep = await db.get(`SELECT print_remind_choice, press_remind_choice FROM qlx_preparation WHERE item_id = $1`, [itemId]);
        } else {
            existingPrep = await db.get(`SELECT print_remind_choice, press_remind_choice FROM qlx_preparation WHERE dht_order_id = $1 AND item_id IS NULL`, [orderId]);
        }

        const finalPrintChoice = isPrintDone ? (existingPrep ? existingPrep.print_remind_choice : 'none') : print_remind_choice;
        const finalPressChoice = isPressDone ? (existingPrep ? existingPrep.press_remind_choice : 'none') : press_remind_choice;

        if (!isPrintDone) {
            if (!Array.isArray(assignments) || assignments.length === 0) {
                return reply.code(400).send({ error: 'Bắt buộc chọn ít nhất một Lĩnh Vực In!' });
            }
            if (!['yes', 'none'].includes(print_remind_choice)) {
                return reply.code(400).send({ error: 'Vui lòng chọn trạng thái nhắc nhở cho bộ phận in!' });
            }
            if (print_remind_choice === 'yes') {
                if (!Array.isArray(print_reminders) || print_reminders.length === 0) {
                    return reply.code(400).send({ error: 'Vui lòng nhập nội dung nhắc nhở bộ phận in!' });
                }
                for (const content of print_reminders) {
                    if (!content || !content.trim()) {
                        return reply.code(400).send({ error: 'Nội dung nhắc nhở bộ phận in không được để trống!' });
                    }
                }
            }
        }

        if (!isPressDone) {
            if (!['yes', 'none'].includes(press_remind_choice)) {
                return reply.code(400).send({ error: 'Vui lòng chọn trạng thái nhắc nhở cho bộ phận ép!' });
            }
            if (press_remind_choice === 'yes') {
                if (!Array.isArray(press_reminders) || press_reminders.length === 0) {
                    return reply.code(400).send({ error: 'Vui lòng nhập nội dung nhắc nhở bộ phận ép!' });
                }
                for (const content of press_reminders) {
                    if (!content || !content.trim()) {
                        return reply.code(400).send({ error: 'Nội dung nhắc nhở bộ phận ép không được để trống!' });
                    }
                }
            }
        }

        // Update choices in qlx_preparation
        if (itemId) {
            await ensureItemPrepRow(orderId, itemId);
            await db.run(`
                UPDATE qlx_preparation 
                SET print_remind_choice = $1, press_remind_choice = $2, updated_at = $3
                WHERE item_id = $4
            `, [finalPrintChoice, finalPressChoice, now, itemId]);
        } else {
            await ensureOrderPrepRow(orderId);
            await db.run(`
                UPDATE qlx_preparation 
                SET print_remind_choice = $1, press_remind_choice = $2, updated_at = $3
                WHERE dht_order_id = $4 AND item_id IS NULL
            `, [finalPrintChoice, finalPressChoice, now, orderId]);
        }

        // Delete and insert reminders for print/press department if not completed
        const deptsToDelete = [];
        if (!isPrintDone) deptsToDelete.push('in');
        if (!isPressDone) deptsToDelete.push('ep');

        if (deptsToDelete.length > 0) {
            if (itemId) {
                await db.run(`DELETE FROM qlx_reminders WHERE item_id = $1 AND dept = ANY($2)`, [itemId, deptsToDelete]);
            } else {
                await db.run(`DELETE FROM qlx_reminders WHERE dht_order_id = $1 AND item_id IS NULL AND dept = ANY($2)`, [orderId, deptsToDelete]);
            }
        }

        // Insert new reminders
        if (!isPrintDone && print_remind_choice === 'yes' && Array.isArray(print_reminders)) {
            for (const content of print_reminders) {
                await db.run(`
                    INSERT INTO qlx_reminders (dht_order_id, item_id, dept, content, created_by, created_at)
                    VALUES ($1, $2, 'in', $3, $4, $5)
                `, [orderId, itemId, content.trim(), request.user.id, now]);
            }
        }

        if (!isPressDone && press_remind_choice === 'yes' && Array.isArray(press_reminders)) {
            for (const content of press_reminders) {
                await db.run(`
                    INSERT INTO qlx_reminders (dht_order_id, item_id, dept, content, created_by, created_at)
                    VALUES ($1, $2, 'ep', $3, $4, $5)
                `, [orderId, itemId, content.trim(), request.user.id, now]);
            }
        }

        // De-duplicate assignments in JS
        const seen = new Set();
        const uniqueAssignments = [];
        for (const assign of assignments) {
            const key = `${assign.field_id}_${assign.operator_type}_${assign.operator_id}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueAssignments.push(assign);
            }
        }

        // Validate that there is at most 1 operator per field_id
        const fieldsChecked = {};
        for (const assign of uniqueAssignments) {
            const fid = Number(assign.field_id);
            if (fieldsChecked[fid]) {
                return reply.code(400).send({ error: 'Mỗi lĩnh vực in chỉ được chọn tối đa 1 người thực hiện!' });
            }
            fieldsChecked[fid] = true;
        }

        if (!isPrintDone) {
            // Save order print assignments (replace all for this order/item)
            if (itemId) {
                await db.run(`DELETE FROM qlx_order_print_assignments WHERE item_id = $1`, [itemId]);
                // Clean up any stale order-level assignments since we are now assigning at the item level
                await db.run(`DELETE FROM qlx_order_print_assignments WHERE dht_order_id = $1 AND item_id IS NULL`, [orderId]);
            } else {
                await db.run(`DELETE FROM qlx_order_print_assignments WHERE dht_order_id = $1 AND item_id IS NULL`, [orderId]);
            }

            // Keep legacy qlx_assignments / qlx_in_theu_chung populated for compatibility
            let firstOp = null;
            const otherOps = [];

            for (const assign of uniqueAssignments) {
                const fieldId = Number(assign.field_id);
                const opType = assign.operator_type;
                const opId = Number(assign.operator_id);

                if (fieldId && ['user', 'contractor'].includes(opType) && opId) {
                    if (itemId) {
                        await db.run(`
                            INSERT INTO qlx_order_print_assignments (dht_order_id, item_id, field_id, operator_type, operator_id, assigned_by, assigned_at)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                        `, [orderId, itemId, fieldId, opType, opId, request.user.id, now]);
                    } else {
                        await db.run(`
                            INSERT INTO qlx_order_print_assignments (dht_order_id, field_id, operator_type, operator_id, assigned_by, assigned_at)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `, [orderId, fieldId, opType, opId, request.user.id, now]);
                    }

                    if (!firstOp) {
                        firstOp = { type: opType, id: opId };
                    } else {
                        if (!otherOps.some(o => o.type === opType && o.id === opId)) {
                            otherOps.push({ type: opType, id: opId });
                        }
                    }
                }
            }

            // Sync to legacy qlx_assignments (type = 'in')
            if (firstOp) {
                const userId = firstOp.type === 'user' ? Number(firstOp.id) : null;
                const conId = firstOp.type === 'contractor' ? Number(firstOp.id) : null;
                if (itemId) {
                    await db.run(`
                        INSERT INTO qlx_assignments (dht_order_id, item_id, assignment_type, assigned_user_id, assigned_contractor_id, assigned_by, assigned_at)
                        VALUES ($1, $2, 'in', $3, $4, $5, $6)
                        ON CONFLICT (item_id, assignment_type)
                        DO UPDATE SET assigned_user_id = $3, assigned_contractor_id = $4, assigned_by = $5, assigned_at = $6
                    `, [orderId, itemId, userId, conId, request.user.id, now]);
                } else {
                    await db.run(`DELETE FROM qlx_assignments WHERE dht_order_id = $1 AND assignment_type = 'in' AND item_id IS NULL`, [orderId]);
                    await db.run(`
                        INSERT INTO qlx_assignments (dht_order_id, assignment_type, assigned_user_id, assigned_contractor_id, assigned_by, assigned_at)
                        VALUES ($1, 'in', $2, $3, $4, $5)
                    `, [orderId, userId, conId, request.user.id, now]);
                }
            } else {
                if (itemId) {
                    await db.run(`DELETE FROM qlx_assignments WHERE item_id = $1 AND assignment_type = 'in'`, [itemId]);
                } else {
                    await db.run(`DELETE FROM qlx_assignments WHERE dht_order_id = $1 AND assignment_type = 'in' AND item_id IS NULL`, [orderId]);
                }
            }

            // Sync to legacy qlx_in_theu_chung
            if (itemId) {
                // For ticket-level, we don't necessarily sync multiple operators to legacy qlx_in_theu_chung
                // or we can optionally delete existing and recreate
            } else {
                await db.run(`DELETE FROM qlx_in_theu_chung WHERE dht_order_id = $1`, [orderId]);
                for (const op of otherOps) {
                    await db.run(`
                        INSERT INTO qlx_in_theu_chung (dht_order_id, target_type, target_id, assigned_by, assigned_at)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (dht_order_id, target_type, target_id) DO NOTHING
                    `, [orderId, op.type, Number(op.id), request.user.id, now]);
                }
            }

            // Sync to printing_records
            const orderInfo = await db.get(`
                SELECT o.total_quantity, o.category_id, o.order_code, o.order_date, u.full_name AS cskh_name
                FROM dht_orders o
                LEFT JOIN users u ON o.cskh_user_id = u.id
                WHERE o.id = $1
            `, [orderId]);
            
            let prodName = 'Sản phẩm';
            let orderQty = 0;

            const isPetOrTem = orderInfo && (orderInfo.category_id === 8 || orderInfo.category_id === 9 ||
                               (orderInfo.order_code && (orderInfo.order_code.includes('GCPET') || orderInfo.order_code.includes('GCTEM'))));

            if (itemId) {
                const it = await db.get(`SELECT description, quantity FROM dht_order_items WHERE id = $1`, [itemId]);
                if (it) {
                    orderQty = it.quantity || 0;
                    if (isPetOrTem) {
                        const descLower = (it.description || '').toLowerCase().trim();
                        if (descLower.includes('thiết kế') || descLower.includes('thiet ke') || descLower === 'tk') {
                            prodName = '';
                        } else {
                            let desc = (it.description || '').trim();
                            if (/tờ|to/i.test(desc)) desc = 'Tờ';
                            else if (/mét|met/i.test(desc)) desc = 'Mét';
                            prodName = `${it.quantity || 0} ${desc}`;
                        }
                    } else {
                        const items = await db.all(`SELECT id, material_pairs FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id`, [orderId]);
                        const itemIdx = items.findIndex(item => item.id === itemId) + 1;
                        let totalRows = 0;
                        for (const item of items) {
                            let pairs = [];
                            try { pairs = typeof item.material_pairs === 'string' ? JSON.parse(item.material_pairs) : (item.material_pairs || []); } catch(e) {}
                            totalRows += pairs.length > 0 ? pairs.length : 1;
                        }
                        if (totalRows > 1) {
                            prodName = `${orderInfo.order_code || ''} — Phiếu ${itemIdx} — P1 — ${it.description || ''}`;
                        } else {
                            prodName = `${orderInfo.order_code || ''} — ${it.description || ''}`;
                        }
                    }
                }
            } else {
                const items = await db.all(`SELECT description, quantity FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id`, [orderId]);
                orderQty = orderInfo ? orderInfo.total_quantity : 0;
                if (isPetOrTem) {
                    const filteredItems = items.filter(it => {
                        const desc = (it.description || '').toLowerCase().trim();
                        return !desc.includes('thiết kế') && !desc.includes('thiet ke') && desc !== 'tk';
                    });
                    prodName = filteredItems.map(it => {
                        let desc = (it.description || '').trim();
                        if (/tờ|to/i.test(desc)) desc = 'Tờ';
                        else if (/mét|met/i.test(desc)) desc = 'Mét';
                        return `${it.quantity || 0} ${desc}`;
                    }).join('; ') || 'Sản phẩm';
                } else {
                    prodName = items.map(it => (it.description || '') + ' (SL: ' + (it.quantity || 0) + ')').filter(Boolean).join(', ') || 'Sản phẩm';
                }
            }
            
            const cskhName = orderInfo ? orderInfo.cskh_name : '';

            const allUsers = await db.all(`SELECT id, full_name FROM users`);
            const allContractors = await db.all(`SELECT id, name FROM printing_contractors`);
            const userMap = {}; allUsers.forEach(u => userMap[u.id] = u.full_name);
            const conMap = {}; allContractors.forEach(c => conMap[c.id] = c.name);

            const getOpName = (type, id) => {
                return type === 'user' ? (userMap[id] || '') : (conMap[id] ? '🏭 ' + conMap[id] : '');
            };

            const fieldAssignments = {};
            for (const assign of assignments) {
                const fid = Number(assign.field_id);
                if (!fieldAssignments[fid]) fieldAssignments[fid] = [];
                fieldAssignments[fid].push(assign);
            }

            const allFields = await db.all(`SELECT id, name FROM printing_fields`);
            const fieldNameMap = {}; allFields.forEach(f => fieldNameMap[f.id] = f.name);

            let existingRecs = [];
            if (itemId) {
                existingRecs = await db.all(`SELECT id, print_field FROM printing_records WHERE order_item_id = $1`, [itemId]);
                // Clean up any stale order-level printing records since we are now assigning at the item level
                await db.run(`DELETE FROM printing_records WHERE dht_order_id = $1 AND order_item_id IS NULL`, [orderId]);
            } else {
                existingRecs = await db.all(`SELECT id, print_field FROM printing_records WHERE dht_order_id = $1 AND order_item_id IS NULL`, [orderId]);
            }
            const existingFMap = {}; existingRecs.forEach(r => existingFMap[r.print_field] = r.id);

            const currentFieldNames = [];
            try {
                for (const fid of Object.keys(fieldAssignments)) {
                    const fieldName = fieldNameMap[fid];
                    if (!fieldName) { console.warn('[QLX] fieldNameMap missing for fid:', fid); continue; }
                    currentFieldNames.push(fieldName);

                    const ops = fieldAssignments[fid];
                    const primaryOp = ops[0];
                    const printerId = primaryOp.operator_type === 'user' ? primaryOp.operator_id : null;
                    const contractorId = primaryOp.operator_type === 'contractor' ? primaryOp.operator_id : null;
                    const sharedNames = ops.slice(1).map(o => getOpName(o.operator_type, o.operator_id)).filter(Boolean).join(', ');

                    const existingId = existingFMap[fieldName];
                    const pDate = contractorId ? now : (orderInfo?.order_date || now);
                    if (existingId) {
                        await db.run(`
                            UPDATE printing_records
                            SET printer_id = $1, contractor_id = $2, shared_process = $3, print_date = $4, updated_at = $5
                            WHERE id = $6
                        `, [printerId, contractorId, sharedNames || null, pDate, now, existingId]);
                    } else {
                        if (itemId) {
                            await db.run(`
                                INSERT INTO printing_records (
                                    dht_order_id, order_item_id, printer_id, contractor_id, shared_process, print_field,
                                    product_name, cskh_name, order_quantity, print_date, created_by, created_at, updated_at
                                )
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
                            `, [
                                orderId, itemId, printerId, contractorId, sharedNames || null, fieldName,
                                prodName, cskhName, orderQty, pDate, request.user.id, now
                            ]);
                        } else {
                            await db.run(`
                                INSERT INTO printing_records (
                                    dht_order_id, printer_id, contractor_id, shared_process, print_field,
                                    product_name, cskh_name, order_quantity, print_date, created_by, created_at, updated_at
                                )
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
                            `, [
                                orderId, printerId, contractorId, sharedNames || null, fieldName,
                                prodName, cskhName, orderQty, pDate, request.user.id, now
                            ]);
                        }
                    }
                    console.log('[QLX] printing_records synced: order=%d item=%s field=%s', orderId, itemId || 'NULL', fieldName);
                }
            } catch (syncErr) {
                console.error('[QLX] CRITICAL: printing_records sync FAILED for order=%d item=%s:', orderId, itemId || 'NULL', syncErr.message, syncErr.stack);
                throw new Error('Lỗi đồng bộ bản ghi in: ' + syncErr.message);
            }

            for (const rec of existingRecs) {
                if (!currentFieldNames.includes(rec.print_field)) {
                    await db.run(`DELETE FROM printing_records WHERE id = $1`, [rec.id]);
                }
            }

            // QLX audit history
            const assignedDetails = [];
            for (const fid of Object.keys(fieldAssignments)) {
                const fieldName = fieldNameMap[fid];
                const ops = fieldAssignments[fid];
                const opNames = ops.map(o => getOpName(o.operator_type, o.operator_id)).join(', ');
                assignedDetails.push(`${fieldName}: ${opNames}`);
            }
            
            const historyDetails = (itemId ? `[Phiếu ID: ${itemId}] ` : '') + 'Phân công In mới - ' + assignedDetails.join('; ');
            if (itemId) {
                await db.run(`
                    INSERT INTO qlx_history (dht_order_id, item_id, action, details, performed_by, performed_at)
                    VALUES ($1, $2, 'assign_in_new', $3, $4, $5)
                `, [orderId, itemId, historyDetails, request.user.id, now]);
            } else {
                await db.run(`
                    INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                    VALUES ($1, 'assign_in_new', $2, $3, $4)
                `, [orderId, historyDetails, request.user.id, now]);
            }
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

        await ensureOrderPrepRow(orderId);

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
        await ensureOrderPrepRow(orderId);

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
                       r.locked_by_cutting_id,
                       cr_lock.product_name AS cutting_order_name,
                       u_lock.full_name AS cutting_by_name,
                       (r.weight = r.original_weight AND r.weight >= COALESCE(m.original_tree_threshold, w.original_tree_threshold, 10)) AS is_original_tree,
                       COALESCE((
                           SELECT SUM(res.kg_reserved)
                           FROM qlx_fabric_reservations res
                           WHERE res.roll_id = r.id AND res.status IN ('reserved', 'arrived')
                       ), 0) AS reserved_total
                FROM kv_rolls r
                JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                JOIN kv_materials m ON m.id = fc.material_id
                JOIN kv_warehouses w ON w.id = m.warehouse_id
                LEFT JOIN cutting_records cr_lock ON cr_lock.id = r.locked_by_cutting_id
                LEFT JOIN users u_lock ON u_lock.id = cr_lock.cutter_id
                WHERE r.fabric_color_id = $1 AND r.is_returned = false AND r.weight > 0
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

        await ensureItemPrepRow(orderId, itemId);
        const cutReminders = await db.all("SELECT id, content FROM qlx_reminders WHERE item_id = $1 AND dept = 'cat' AND phoi_index = $2 ORDER BY id", [itemId, pi]);
        const cutRemindChoice = cutReminders.length > 0 ? 'yes' : 'none';

        const reminderIds = cutReminders.map(r => r.id);
        let viewedIds = [];
        if (reminderIds.length > 0) {
            const views = await db.all(
                `SELECT DISTINCT reminder_id FROM qlx_reminder_views WHERE reminder_id = ANY($1)`,
                [reminderIds]
            );
            viewedIds = views.map(v => v.reminder_id);
            
            // Auto-view if coordinate cutting is completed
            const row = await db.get(`SELECT 1 FROM cutting_records WHERE dht_order_id = $1 AND order_item_id = $2 AND phoi_index = $3 AND is_cut_done = true LIMIT 1`, [orderId, itemId, pi]);
            if (row) {
                for (const rId of reminderIds) {
                    if (!viewedIds.includes(rId)) {
                        viewedIds.push(rId);
                    }
                }
            }
        }

        const cuttingRecord = await db.get(`
            SELECT 1 FROM cutting_records 
            WHERE order_item_id = $1 AND phoi_index = $2 AND is_cut_done = true
            LIMIT 1
        `, [itemId, pi]);
        const isPhoiCutDone = !!cuttingRecord;

        let isPrintDone = true;
        const needsPrint = await db.get(`
            SELECT EXISTS (
                SELECT 1 FROM qlx_order_print_assignments qa
                JOIN printing_fields pf ON qa.field_id = pf.id
                WHERE (qa.item_id = $1 OR (qa.item_id IS NULL AND qa.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = $1)))
                  AND qa.operator_type = 'user'
            ) AS needs_print
        `, [itemId, orderId]);

        if (needsPrint && needsPrint.needs_print) {
            const hasPrintRecs = await db.get(`
                SELECT EXISTS (
                    SELECT 1 FROM printing_records 
                    WHERE order_item_id = $1 OR (order_item_id IS NULL AND dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records WHERE order_item_id = $1))
                ) AS has_recs
            `, [itemId, orderId]);
            if (!hasPrintRecs || !hasPrintRecs.has_recs) {
                isPrintDone = false;
            } else {
                const printPending = await db.get(`
                    SELECT EXISTS (
                        SELECT 1 FROM printing_records pr
                        WHERE (pr.order_item_id = $1 OR (pr.order_item_id IS NULL AND pr.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = $1)))
                          AND pr.is_print_done = false AND pr.contractor_id IS NULL
                    ) AS pending
                `, [itemId, orderId]);
                if (printPending && printPending.pending) {
                    isPrintDone = false;
                }
            }
        }
        const isPhoiProdDone = isPhoiCutDone && isPrintDone;

        return {
            order: { id: order.id, order_code: order.order_code, customer_name: order.customer_name },
            item: { id: item.id, description: item.description, quantity: item.quantity },
            phoi: { material_name: phoi.material_name, color_name: phoi.color_name, phoi_index: pi },
            warehouse,
            rolls,
            existing,
            pendingCalls,
            myLinkedIds,
            cut_remind_choice: cutRemindChoice,
            cut_reminders: cutReminders.map(r => ({
                id: r.id,
                content: r.content,
                is_viewed: viewedIds.includes(r.id)
            })),
            is_production_done: isPhoiProdDone,
            is_cut_done: isPhoiCutDone
        };
    });

    // POST reserve: save fabric reservation (from_stock or new_call)
    fastify.post('/api/qlx/fabric-reserve', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const { dht_order_id, item_id, phoi_index, material_name, color_name, unit,
                reservation_type, roll_id, roll_code, kg_reserved, roll_note,
                call_trees, call_amount, call_note, call_date, call_content,
                cut_remind_choice, cut_reminders } = request.body || {};

        if (!dht_order_id || !item_id) return reply.code(400).send({ error: 'Thiếu thông tin đơn hàng' });

        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        const pi = phoi_index !== undefined && phoi_index !== null ? parseInt(phoi_index) : 0;
        const cuttingRecord = await db.get(`
            SELECT 1 FROM cutting_records 
            WHERE order_item_id = $1 AND phoi_index = $2 AND is_cut_done = true
            LIMIT 1
        `, [item_id, pi]);
        const isPhoiCutDone = !!cuttingRecord;

        let isPrintDone = true;
        const needsPrint = await db.get(`
            SELECT EXISTS (
                SELECT 1 FROM qlx_order_print_assignments qa
                JOIN printing_fields pf ON qa.field_id = pf.id
                WHERE (qa.item_id = $1 OR (qa.item_id IS NULL AND qa.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = $1)))
                  AND qa.operator_type = 'user'
            ) AS needs_print
        `, [item_id, dht_order_id]);

        if (needsPrint && needsPrint.needs_print) {
            const hasPrintRecs = await db.get(`
                SELECT EXISTS (
                    SELECT 1 FROM printing_records 
                    WHERE order_item_id = $1 OR (order_item_id IS NULL AND dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records WHERE order_item_id = $1))
                ) AS has_recs
            `, [item_id, dht_order_id]);
            if (!hasPrintRecs || !hasPrintRecs.has_recs) {
                isPrintDone = false;
            } else {
                const printPending = await db.get(`
                    SELECT EXISTS (
                        SELECT 1 FROM printing_records pr
                        WHERE (pr.order_item_id = $1 OR (pr.order_item_id IS NULL AND pr.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = $1)))
                          AND pr.is_print_done = false AND pr.contractor_id IS NULL
                    ) AS pending
                `, [item_id, dht_order_id]);
                if (printPending && printPending.pending) {
                    isPrintDone = false;
                }
            }
        }
        const isPhoiProdDone = isPhoiCutDone && isPrintDone;

        if (isPhoiProdDone || isPhoiCutDone) {
            return reply.code(400).send({ error: isPhoiProdDone ? 'Phối này đã hoàn thành sản xuất, không thể thay đổi dữ liệu vải!' : 'Phối này đã hoàn thành cắt, không thể thay đổi dữ liệu vải!' });
        }

        // Validate cutting reminders choice and content (required for reservation POST)
        if (!cut_remind_choice) {
            return reply.code(400).send({ error: 'Vui lòng chọn Trạng thái Nhắc Nhở cho Bộ Phận Cắt!' });
        }
        if (!['yes', 'none'].includes(cut_remind_choice)) {
            return reply.code(400).send({ error: 'Trạng thái Nhắc Nhở cho Bộ Phận Cắt không hợp lệ!' });
        }

        if (cut_remind_choice === 'yes') {
            if (!Array.isArray(cut_reminders) || cut_reminders.length === 0) {
                return reply.code(400).send({ error: 'Vui lòng nhập nội dung nhắc nhở bộ phận cắt!' });
            }
            for (const content of cut_reminders) {
                if (!content || !content.trim()) {
                    return reply.code(400).send({ error: 'Nội dung nhắc nhở bộ phận cắt không được để trống!' });
                }
            }
        }

        // Persist cutting reminders choice
        await ensureItemPrepRow(dht_order_id, item_id);
        await db.run(`
            UPDATE qlx_preparation
            SET cut_remind_choice = $1, updated_at = $2
            WHERE item_id = $3
        `, [cut_remind_choice, now, item_id]);

        // Delete existing cutting reminders for this item and phoi
        await db.run(`DELETE FROM qlx_reminders WHERE item_id = $1 AND dept = 'cat' AND phoi_index = $2`, [item_id, pi]);

        // Insert new cutting reminders
        if (cut_remind_choice === 'yes' && Array.isArray(cut_reminders)) {
            for (const content of cut_reminders) {
                await db.run(`
                    INSERT INTO qlx_reminders (dht_order_id, item_id, dept, content, created_by, created_at, phoi_index)
                    VALUES ($1, $2, 'cat', $3, $4, $5, $6)
                `, [dht_order_id, item_id, content.trim(), request.user.id, now, pi]);
            }
        }

        if (reservation_type === 'from_stock') {
            if (!roll_id || !kg_reserved || Number(kg_reserved) <= 0) return reply.code(400).send({ error: 'Chọn cây vải và nhập số kg' });

            // Validate: check available
            const roll = await db.get('SELECT weight, locked_by_cutting_id FROM kv_rolls WHERE id = $1 AND is_returned = false', [roll_id]);
            if (!roll) return reply.code(400).send({ error: 'Cây vải không tồn tại hoặc đã trả NCC' });
            // Allow reserving even if locked by cutting, per user request

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
        await ensureOrderPrepRow(dht_order_id);
        await db.run(`UPDATE qlx_preparation SET fabric_called = true, fabric_called_at = $1, fabric_called_by = $2, updated_at = $1 WHERE dht_order_id = $3`,
            [now, request.user.id, dht_order_id]);

        // Auto-check: if ALL reservations for this order are 'arrived' → set fabric_arrived = true
        const pending = await db.get(`SELECT COUNT(*)::int AS cnt FROM qlx_fabric_reservations WHERE dht_order_id = $1 AND status = 'reserved'`, [dht_order_id]);
        const cuttingDone = await db.get(`SELECT EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = $1 AND (is_cutting = true OR is_cut_done = true)) AS has_cut`, [dht_order_id]);
        const hasActive = await db.get(`SELECT EXISTS (SELECT 1 FROM qlx_fabric_reservations WHERE dht_order_id = $1 AND status IN ('arrived', 'fulfilled')) AS has_active`, [dht_order_id]);
        const isArrived = (pending && pending.cnt === 0) && (hasActive.has_active || cuttingDone.has_cut);

        await ensureOrderPrepRow(dht_order_id);
        if (isArrived) {
            await db.run(`UPDATE qlx_preparation SET fabric_arrived = true, fabric_arrived_at = $1, fabric_arrived_by = $2, updated_at = $1 WHERE dht_order_id = $3`,
                [now, request.user.id, dht_order_id]);
        } else {
            await db.run(`UPDATE qlx_preparation SET fabric_arrived = false, fabric_arrived_at = NULL, fabric_arrived_by = NULL, updated_at = $1 WHERE dht_order_id = $2`,
                [now, dht_order_id]);
        }

        return { success: true };
    });

    // PUT /api/qlx/fabric-reserve/reminders: update only cutting reminders for an item
    fastify.put('/api/qlx/fabric-reserve/reminders', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const { dht_order_id, item_id, phoi_index, cut_remind_choice, cut_reminders } = request.body || {};
        if (!dht_order_id || !item_id) return reply.code(400).send({ error: 'Thiếu thông tin đơn hàng' });

        const pi = phoi_index !== undefined && phoi_index !== null ? parseInt(phoi_index) : 0;
        const cuttingRecord = await db.get(`
            SELECT 1 FROM cutting_records 
            WHERE order_item_id = $1 AND phoi_index = $2 AND is_cut_done = true
            LIMIT 1
        `, [item_id, pi]);
        const isPhoiCutDone = !!cuttingRecord;

        let isPrintDone = true;
        const needsPrint = await db.get(`
            SELECT EXISTS (
                SELECT 1 FROM qlx_order_print_assignments qa
                JOIN printing_fields pf ON qa.field_id = pf.id
                WHERE (qa.item_id = $1 OR (qa.item_id IS NULL AND qa.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = $1)))
                  AND qa.operator_type = 'user'
            ) AS needs_print
        `, [item_id, dht_order_id]);

        if (needsPrint && needsPrint.needs_print) {
            const hasPrintRecs = await db.get(`
                SELECT EXISTS (
                    SELECT 1 FROM printing_records 
                    WHERE order_item_id = $1 OR (order_item_id IS NULL AND dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records WHERE order_item_id = $1))
                ) AS has_recs
            `, [item_id, dht_order_id]);
            if (!hasPrintRecs || !hasPrintRecs.has_recs) {
                isPrintDone = false;
            } else {
                const printPending = await db.get(`
                    SELECT EXISTS (
                        SELECT 1 FROM printing_records pr
                        WHERE (pr.order_item_id = $1 OR (pr.order_item_id IS NULL AND pr.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = $1)))
                          AND pr.is_print_done = false AND pr.contractor_id IS NULL
                    ) AS pending
                `, [item_id, dht_order_id]);
                if (printPending && printPending.pending) {
                    isPrintDone = false;
                }
            }
        }
        const isPhoiProdDone = isPhoiCutDone && isPrintDone;

        if (isPhoiProdDone || isPhoiCutDone) {
            return reply.code(400).send({ error: isPhoiProdDone ? 'Phối này đã hoàn thành sản xuất, không thể chỉnh sửa nhắc nhở bộ phận cắt!' : 'Phối này đã hoàn thành cắt, không thể chỉnh sửa nhắc nhở bộ phận cắt!' });
        }

        if (!cut_remind_choice) {
            return reply.code(400).send({ error: 'Vui lòng chọn Trạng thái Nhắc Nhở cho Bộ Phận Cắt!' });
        }
        if (!['yes', 'none'].includes(cut_remind_choice)) {
            return reply.code(400).send({ error: 'Trạng thái Nhắc Nhở cho Bộ Phận Cắt không hợp lệ!' });
        }

        if (cut_remind_choice === 'yes') {
            if (!Array.isArray(cut_reminders) || cut_reminders.length === 0) {
                return reply.code(400).send({ error: 'Vui lòng nhập nội dung nhắc nhở bộ phận cắt!' });
            }
            for (const content of cut_reminders) {
                if (!content || !content.trim()) {
                    return reply.code(400).send({ error: 'Nội dung nhắc nhở bộ phận cắt không được để trống!' });
                }
            }
        }

        const { vnNow } = require('../utils/timezone');
        const now = vnNow();

        await ensureItemPrepRow(dht_order_id, item_id);
        await db.run(`
            UPDATE qlx_preparation
            SET cut_remind_choice = $1, updated_at = $2
            WHERE item_id = $3
        `, [cut_remind_choice, now, item_id]);

        // Delete existing cutting reminders for this item and phoi
        await db.run(`DELETE FROM qlx_reminders WHERE item_id = $1 AND dept = 'cat' AND phoi_index = $2`, [item_id, pi]);

        // Insert new cutting reminders
        if (cut_remind_choice === 'yes' && Array.isArray(cut_reminders)) {
            for (const content of cut_reminders) {
                await db.run(`
                    INSERT INTO qlx_reminders (dht_order_id, item_id, dept, content, created_by, created_at, phoi_index)
                    VALUES ($1, $2, 'cat', $3, $4, $5, $6)
                `, [dht_order_id, item_id, content.trim(), request.user.id, now, pi]);
            }
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

        const pi = res.phoi_index !== undefined && res.phoi_index !== null ? res.phoi_index : 0;
        const cuttingRecord = await db.get(`
            SELECT 1 FROM cutting_records 
            WHERE order_item_id = $1 AND phoi_index = $2 AND is_cut_done = true
            LIMIT 1
        `, [res.item_id, pi]);
        const isPhoiCutDone = !!cuttingRecord;

        let isPrintDone = true;
        const needsPrint = await db.get(`
            SELECT EXISTS (
                SELECT 1 FROM qlx_order_print_assignments qa
                JOIN printing_fields pf ON qa.field_id = pf.id
                WHERE (qa.item_id = $1 OR (qa.item_id IS NULL AND qa.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = $1)))
                  AND qa.operator_type = 'user'
            ) AS needs_print
        `, [res.item_id, res.dht_order_id]);

        if (needsPrint && needsPrint.needs_print) {
            const hasPrintRecs = await db.get(`
                SELECT EXISTS (
                    SELECT 1 FROM printing_records 
                    WHERE order_item_id = $1 OR (order_item_id IS NULL AND dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records WHERE order_item_id = $1))
                ) AS has_recs
            `, [res.item_id, res.dht_order_id]);
            if (!hasPrintRecs || !hasPrintRecs.has_recs) {
                isPrintDone = false;
            } else {
                const printPending = await db.get(`
                    SELECT EXISTS (
                        SELECT 1 FROM printing_records pr
                        WHERE (pr.order_item_id = $1 OR (pr.order_item_id IS NULL AND pr.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = $1)))
                          AND pr.is_print_done = false AND pr.contractor_id IS NULL
                    ) AS pending
                `, [res.item_id, res.dht_order_id]);
                if (printPending && printPending.pending) {
                    isPrintDone = false;
                }
            }
        }
        const isPhoiProdDone = isPhoiCutDone && isPrintDone;

        if (isPhoiProdDone || isPhoiCutDone) {
            return reply.code(400).send({ error: isPhoiProdDone ? 'Phối này đã hoàn thành sản xuất, không thể sửa số kg!' : 'Phối này đã hoàn thành cắt, không thể sửa số kg!' });
        }

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

        const pi = res.phoi_index !== undefined && res.phoi_index !== null ? res.phoi_index : 0;
        const cuttingRecord = await db.get(`
            SELECT 1 FROM cutting_records 
            WHERE order_item_id = $1 AND phoi_index = $2 AND is_cut_done = true
            LIMIT 1
        `, [res.item_id, pi]);
        const isPhoiCutDone = !!cuttingRecord;

        let isPrintDone = true;
        const needsPrint = await db.get(`
            SELECT EXISTS (
                SELECT 1 FROM qlx_order_print_assignments qa
                JOIN printing_fields pf ON qa.field_id = pf.id
                WHERE (qa.item_id = $1 OR (qa.item_id IS NULL AND qa.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = $1)))
                  AND qa.operator_type = 'user'
            ) AS needs_print
        `, [res.item_id, res.dht_order_id]);

        if (needsPrint && needsPrint.needs_print) {
            const hasPrintRecs = await db.get(`
                SELECT EXISTS (
                    SELECT 1 FROM printing_records 
                    WHERE order_item_id = $1 OR (order_item_id IS NULL AND dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records WHERE order_item_id = $1))
                ) AS has_recs
            `, [res.item_id, res.dht_order_id]);
            if (!hasPrintRecs || !hasPrintRecs.has_recs) {
                isPrintDone = false;
            } else {
                const printPending = await db.get(`
                    SELECT EXISTS (
                        SELECT 1 FROM printing_records pr
                        WHERE (pr.order_item_id = $1 OR (pr.order_item_id IS NULL AND pr.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = $1)))
                          AND pr.is_print_done = false AND pr.contractor_id IS NULL
                    ) AS pending
                `, [res.item_id, res.dht_order_id]);
                if (printPending && printPending.pending) {
                    isPrintDone = false;
                }
            }
        }
        const isPhoiProdDone = isPhoiCutDone && isPrintDone;

        if (isPhoiProdDone || isPhoiCutDone) {
            return reply.code(400).send({ error: isPhoiProdDone ? 'Phối này đã hoàn thành sản xuất, không thể xác nhận vải về!' : 'Phối này đã hoàn thành cắt, không thể xác nhận vải về!' });
        }

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
            const cuttingDone = await db.get(`SELECT EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = $1 AND (is_cutting = true OR is_cut_done = true)) AS has_cut`, [oid]);
            const hasActive = await db.get(`SELECT EXISTS (SELECT 1 FROM qlx_fabric_reservations WHERE dht_order_id = $1 AND status IN ('arrived', 'fulfilled')) AS has_active`, [oid]);
            const isArrived = (pending && pending.cnt === 0) && (hasActive.has_active || cuttingDone.has_cut);

            await ensureOrderPrepRow(oid);
            if (isArrived) {
                await db.run(`UPDATE qlx_preparation SET fabric_arrived = true, fabric_arrived_at = $1, fabric_arrived_by = $2, updated_at = $1 WHERE dht_order_id = $3`,
                    [now, request.user.id, oid]);
            } else {
                await db.run(`UPDATE qlx_preparation SET fabric_arrived = false, fabric_arrived_at = NULL, fabric_arrived_by = NULL, updated_at = $1 WHERE dht_order_id = $2`,
                    [now, oid]);
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

        const pi = res.phoi_index !== undefined && res.phoi_index !== null ? res.phoi_index : 0;
        const cuttingRecord = await db.get(`
            SELECT 1 FROM cutting_records 
            WHERE order_item_id = $1 AND phoi_index = $2 AND is_cut_done = true
            LIMIT 1
        `, [res.item_id, pi]);
        const isPhoiCutDone = !!cuttingRecord;

        let isPrintDone = true;
        const needsPrint = await db.get(`
            SELECT EXISTS (
                SELECT 1 FROM qlx_order_print_assignments qa
                JOIN printing_fields pf ON qa.field_id = pf.id
                WHERE (qa.item_id = $1 OR (qa.item_id IS NULL AND qa.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = $1)))
                  AND qa.operator_type = 'user'
            ) AS needs_print
        `, [res.item_id, res.dht_order_id]);

        if (needsPrint && needsPrint.needs_print) {
            const hasPrintRecs = await db.get(`
                SELECT EXISTS (
                    SELECT 1 FROM printing_records 
                    WHERE order_item_id = $1 OR (order_item_id IS NULL AND dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records WHERE order_item_id = $1))
                ) AS has_recs
            `, [res.item_id, res.dht_order_id]);
            if (!hasPrintRecs || !hasPrintRecs.has_recs) {
                isPrintDone = false;
            } else {
                const printPending = await db.get(`
                    SELECT EXISTS (
                        SELECT 1 FROM printing_records pr
                        WHERE (pr.order_item_id = $1 OR (pr.order_item_id IS NULL AND pr.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = $1)))
                          AND pr.is_print_done = false AND pr.contractor_id IS NULL
                    ) AS pending
                `, [res.item_id, res.dht_order_id]);
                if (printPending && printPending.pending) {
                    isPrintDone = false;
                }
            }
        }
        const isPhoiProdDone = isPhoiCutDone && isPrintDone;

        if (isPhoiProdDone || isPhoiCutDone) {
            return reply.code(400).send({ error: isPhoiProdDone ? 'Phối này đã hoàn thành sản xuất, không thể hủy giữ vải!' : 'Phối này đã hoàn thành cắt, không thể hủy giữ vải!' });
        }

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
            const pending = await db.get(`SELECT COUNT(*)::int AS cnt FROM qlx_fabric_reservations WHERE dht_order_id = $1 AND status = 'reserved'`, [oid]);
            const cuttingDone = await db.get(`SELECT EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = $1 AND (is_cutting = true OR is_cut_done = true)) AS has_cut`, [oid]);
            const hasActive = await db.get(`SELECT EXISTS (SELECT 1 FROM qlx_fabric_reservations WHERE dht_order_id = $1 AND status IN ('arrived', 'fulfilled')) AS has_active`, [oid]);
            const isArrived = (pending && pending.cnt === 0) && (hasActive.has_active || cuttingDone.has_cut);

            await ensureOrderPrepRow(oid);
            if (isArrived) {
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

        await ensureOrderPrepRow(orderId);
        await db.run(`UPDATE qlx_preparation SET qlx_received_phieu = true, qlx_received_phieu_at = $1, qlx_received_phieu_by = $2, updated_at = $1 WHERE dht_order_id = $3`,
            [now, request.user.id, orderId]);

        await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5)`,
            [orderId, 'receive_phieu', 'QLX xác nhận đã nhận Phiếu Sản Xuất', request.user.id, now]);

        return { success: true };
    });

    // ========== GET SEWING ASSIGNMENT DETAIL AND PRICING ==========
    fastify.get('/api/qlx/sewing-assignment/:itemId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const itemId = Number(request.params.itemId);

        // 1. Get order item and order info
        const item = await db.get(`
            SELECT doi.id, doi.dht_order_id, doi.product_name, doi.description, doi.pattern_name, doi.sewing_techniques, doi.material_pairs, o.order_code, o.expected_ship_date, o.shipping_priority, o.standard_delivery_time
            FROM dht_order_items doi
            JOIN dht_orders o ON doi.dht_order_id = o.id
            WHERE doi.id = $1
        `, [itemId]);
        if (!item) return reply.code(404).send({ error: 'Không tìm thấy chi tiết sản phẩm' });

        // 2. Get total completed cut quantity
        const cutQtyRow = await db.get(`
            SELECT COALESCE(SUM(cut_quantity), 0)::int AS cut_qty
            FROM cutting_records
            WHERE order_item_id = $1 AND is_cut_done = true
        `, [itemId]);
        const rawCutQty = cutQtyRow ? cutQtyRow.cut_qty : 0;
        let numPhois = 1;
        try {
            const pairs = typeof item.material_pairs === 'string' ? JSON.parse(item.material_pairs) : (item.material_pairs || []);
            if (Array.isArray(pairs) && pairs.length > 0) {
                numPhois = pairs.length;
            }
        } catch(e) {}
        const cut_qty = Math.round(rawCutQty / numPhois);

        // 3. Get existing sewing records
        const rawAssignments = await db.all(`
            SELECT id, contractor_id, quantity, expected_date, notes, is_reported, salary_approved, done_date
            FROM sewing_records
            WHERE order_item_id = $1
            ORDER BY id ASC
        `, [itemId]);

        // Gộp các bản ghi May Nhà (contractor_id IS NULL) thành 1 dòng duy nhất
        const assignments = [];
        let mayNhaRow = null;
        for (const a of rawAssignments) {
            if (a.contractor_id === null) {
                if (!mayNhaRow) {
                    mayNhaRow = {
                        id: a.id,
                        contractor_id: null,
                        quantity: Number(a.quantity) || 0,
                        expected_date: a.expected_date,
                        notes: a.notes,
                        is_reported: a.is_reported,
                        salary_approved: a.salary_approved,
                        done_date: a.done_date
                    };
                    assignments.push(mayNhaRow);
                } else {
                    mayNhaRow.quantity += Number(a.quantity) || 0;
                    // Lấy ngày hẹn ra sớm nhất
                    if (a.expected_date) {
                        const aTime = new Date(a.expected_date).getTime();
                        const currentMinTime = mayNhaRow.expected_date ? new Date(mayNhaRow.expected_date).getTime() : Infinity;
                        if (aTime < currentMinTime) {
                            mayNhaRow.expected_date = a.expected_date;
                        }
                    }
                    // Giữ lại ghi chú đầu tiên có nội dung
                    if (a.notes && !mayNhaRow.notes) {
                        mayNhaRow.notes = a.notes;
                    }
                    if (a.is_reported) mayNhaRow.is_reported = true;
                    if (a.salary_approved) mayNhaRow.salary_approved = true;
                    if (a.done_date) mayNhaRow.done_date = a.done_date;
                }
            } else {
                assignments.push({
                    id: a.id,
                    contractor_id: a.contractor_id,
                    quantity: Number(a.quantity) || 0,
                    expected_date: a.expected_date,
                    notes: a.notes,
                    is_reported: a.is_reported,
                    salary_approved: a.salary_approved,
                    done_date: a.done_date
                });
            }
        }

        // 4. Get active sewing contractors
        const contractors = await db.all(`
            SELECT id, name
            FROM sewing_contractors
            WHERE is_active = true
            ORDER BY name ASC
        `);

        // 5. Get pricing from tsam_samples based on pattern_name
        let pricing = { factory_price: 0, processing_price: 0, spec_image: '', sewing_tech: '' };
        if (item.pattern_name) {
            const tsam = await db.get(`
                SELECT factory_price, processing_price, spec_image, sewing_tech
                FROM tsam_samples
                WHERE sample_code = $1 AND is_active = true
            `, [item.pattern_name]);
            if (tsam) {
                pricing.factory_price = Number(tsam.factory_price) || 0;
                pricing.processing_price = Number(tsam.processing_price) || 0;
                pricing.spec_image = tsam.spec_image || '';
                pricing.sewing_tech = tsam.sewing_tech || '';
            }
        }

        // 6. Get reminders and choice
        const prep = await db.get(`SELECT may_remind_choice, hoanthien_remind_choice FROM qlx_preparation WHERE item_id = $1`, [itemId]);
        const mayRemindChoice = prep ? prep.may_remind_choice : 'none';
        const hoanthienRemindChoice = prep ? prep.hoanthien_remind_choice : 'none';

        const mayReminders = await db.all(`SELECT id, content FROM qlx_reminders WHERE item_id = $1 AND dept = 'may' ORDER BY id`, [itemId]);
        const hoanthienReminders = await db.all(`SELECT id, content FROM qlx_reminders WHERE item_id = $1 AND dept = 'hoanthien' ORDER BY id`, [itemId]);

        let viewedIds = [];
        const allRems = [...mayReminders, ...hoanthienReminders];
        if (allRems.length > 0) {
            const reminderIds = allRems.map(r => r.id);
            const views = await db.all(
                `SELECT DISTINCT reminder_id FROM qlx_reminder_views WHERE reminder_id = ANY($1::integer[])`,
                [reminderIds]
            );
            viewedIds = views.map(v => v.reminder_id);
        }

        const isSewingDone = rawAssignments.length > 0 && rawAssignments.every(a => a.done_date !== null || a.salary_approved === true);
        const fRec = await db.get(`SELECT fr.is_completed FROM finishing_records fr JOIN sewing_records sr ON fr.sewing_record_id = sr.id WHERE sr.order_item_id = $1 LIMIT 1`, [itemId]);
        const isFinishingDone = fRec ? fRec.is_completed : false;

        return {
            item,
            cut_qty,
            assignments,
            contractors,
            pricing,
            may_remind_choice: mayRemindChoice,
            may_reminders: mayReminders.map(r => ({
                id: r.id,
                content: r.content,
                is_viewed: viewedIds.includes(r.id)
            })),
            hoanthien_remind_choice: hoanthienRemindChoice,
            hoanthien_reminders: hoanthienReminders.map(r => ({
                id: r.id,
                content: r.content,
                is_viewed: viewedIds.includes(r.id)
            })),
            is_sewing_done: isSewingDone,
            is_finishing_done: isFinishingDone
        };
    });

    // ========== POST SEWING ASSIGNMENT (SPLIT / DIRECT ASSIGNMENT) ==========
    fastify.post('/api/qlx/sewing-assignment/:itemId', { preHandler: [authenticate] }, async (request, reply) => {
        const allowed = await isQLXUser(request);
        if (!allowed) return reply.code(403).send({ error: 'Không có quyền' });

        const itemId = Number(request.params.itemId);
        const { assignments, may_remind_choice, may_reminders, hoanthien_remind_choice, hoanthien_reminders } = request.body || {};
        if (assignments && !Array.isArray(assignments)) {
            return reply.code(400).send({ error: 'Dữ liệu phân công không hợp lệ' });
        }

        const { vnNow, vnDateStr } = require('../utils/timezone');
        const now = vnNow();

        // 1. Fetch item and order info
        const item = await db.get(`
            SELECT doi.dht_order_id, doi.product_name, doi.description, doi.pattern_name, doi.material_pairs, o.order_code, doi.sewing_techniques
            FROM dht_order_items doi
            JOIN dht_orders o ON doi.dht_order_id = o.id
            WHERE doi.id = $1
        `, [itemId]);
        if (!item) return reply.code(404).send({ error: 'Không tìm thấy chi tiết sản phẩm' });

        const productName = item.product_name || item.description || 'N/A';

        // 2. Load existing sewing records to determine locking status
        const existingRecords = await db.all(`
            SELECT id, done_date, salary_approved
            FROM sewing_records
            WHERE order_item_id = $1
        `, [itemId]);
        const lockedIds = existingRecords
            .filter(r => r.done_date !== null || r.salary_approved === true)
            .map(r => r.id);
        const isSewingDone = existingRecords.length > 0 && existingRecords.length === lockedIds.length;

        const fRec = await db.get(`SELECT fr.is_completed FROM finishing_records fr JOIN sewing_records sr ON fr.sewing_record_id = sr.id WHERE sr.order_item_id = $1 LIMIT 1`, [itemId]);
        const isFinishingDone = fRec ? fRec.is_completed : false;

        // Fetch existing prep row to preserve choices if done
        let existingPrep = await db.get(`SELECT may_remind_choice, hoanthien_remind_choice FROM qlx_preparation WHERE item_id = $1`, [itemId]);
        const finalMayChoice = isSewingDone ? (existingPrep ? existingPrep.may_remind_choice : 'none') : (may_remind_choice || 'none');
        const finalHoanthienChoice = isFinishingDone ? (existingPrep ? existingPrep.hoanthien_remind_choice : 'none') : (hoanthien_remind_choice || 'none');

        // Reminders validation
        if (!isSewingDone && may_remind_choice) {
            if (!['yes', 'none'].includes(may_remind_choice)) {
                return reply.code(400).send({ error: 'Trạng thái Nhắc Nhở cho Bộ Phận May không hợp lệ!' });
            }
            if (may_remind_choice === 'yes') {
                if (!Array.isArray(may_reminders) || may_reminders.length === 0) {
                    return reply.code(400).send({ error: 'Vui lòng nhập nội dung nhắc nhở bộ phận may!' });
                }
                for (const content of may_reminders) {
                    if (!content || !content.trim()) {
                        return reply.code(400).send({ error: 'Nội dung nhắc nhở bộ phận may không được để trống!' });
                    }
                }
            }
        }

        if (!isFinishingDone && hoanthien_remind_choice) {
            if (!['yes', 'none'].includes(hoanthien_remind_choice)) {
                return reply.code(400).send({ error: 'Trạng thái Nhắc Nhở cho Bộ Phận Hoàn Thiện không hợp lệ!' });
            }
            if (hoanthien_remind_choice === 'yes') {
                if (!Array.isArray(hoanthien_reminders) || hoanthien_reminders.length === 0) {
                    return reply.code(400).send({ error: 'Vui lòng nhập nội dung nhắc nhở bộ phận hoàn thiện!' });
                }
                for (const content of hoanthien_reminders) {
                    if (!content || !content.trim()) {
                        return reply.code(400).send({ error: 'Nội dung nhắc nhở bộ phận hoàn thiện không được để trống!' });
                    }
                }
            }
        }

        // Save prep choices
        await ensureItemPrepRow(item.dht_order_id, itemId);
        await db.run(`
            UPDATE qlx_preparation
            SET may_remind_choice = $1, hoanthien_remind_choice = $2, updated_at = $3
            WHERE item_id = $4
        `, [finalMayChoice, finalHoanthienChoice, now, itemId]);

        // Save reminders
        if (!isSewingDone && may_remind_choice) {
            await db.run(`DELETE FROM qlx_reminders WHERE item_id = $1 AND dept = 'may'`, [itemId]);
            if (may_remind_choice === 'yes' && Array.isArray(may_reminders)) {
                for (const content of may_reminders) {
                    await db.run(`
                        INSERT INTO qlx_reminders (dht_order_id, item_id, dept, content, created_by, created_at)
                        VALUES ($1, $2, 'may', $3, $4, $5)
                    `, [item.dht_order_id, itemId, content.trim(), request.user.id, now]);
                }
            }
        }

        if (!isFinishingDone && hoanthien_remind_choice) {
            await db.run(`DELETE FROM qlx_reminders WHERE item_id = $1 AND dept = 'hoanthien'`, [itemId]);
            if (hoanthien_remind_choice === 'yes' && Array.isArray(hoanthien_reminders)) {
                for (const content of hoanthien_reminders) {
                    await db.run(`
                        INSERT INTO qlx_reminders (dht_order_id, item_id, dept, content, created_by, created_at)
                        VALUES ($1, $2, 'hoanthien', $3, $4, $5)
                    `, [item.dht_order_id, itemId, content.trim(), request.user.id, now]);
                }
            }
        }

        if (isSewingDone) {
            return { success: true };
        }

        if (!assignments) {
            return reply.code(400).send({ error: 'Dữ liệu phân công không hợp lệ' });
        }

        // 3. Get total completed cut quantity
        const cutQtyRow = await db.get(`
            SELECT COALESCE(SUM(cut_quantity), 0)::int AS cut_qty
            FROM cutting_records
            WHERE order_item_id = $1 AND is_cut_done = true
        `, [itemId]);
        const rawCutQty = cutQtyRow ? cutQtyRow.cut_qty : 0;
        let numPhois = 1;
        try {
            const pairs = typeof item.material_pairs === 'string' ? JSON.parse(item.material_pairs) : (item.material_pairs || []);
            if (Array.isArray(pairs) && pairs.length > 0) {
                numPhois = pairs.length;
            }
        } catch(e) {}
        const cut_qty = Math.round(rawCutQty / numPhois);

        if (cut_qty <= 0) {
            return reply.code(400).send({ error: 'Sản phẩm này chưa được cắt xong. Không thể phân công May!' });
        }

        // Fetch holidays from DB
        const holidayRows = await db.all('SELECT holiday_date::text as holiday_date, holiday_name FROM holidays');
        const holidayMap = {};
        for (const h of holidayRows) {
            holidayMap[h.holiday_date] = h.holiday_name;
        }
        const todayStr = vnDateStr(now);

        // 4. Validate total assignment quantity matches cut quantity exactly
        let totalAssignQty = 0;
        for (const ass of assignments) {
            const qty = Number(ass.quantity);
            if (isNaN(qty) || qty <= 0) {
                return reply.code(400).send({ error: 'Số lượng phân công phải lớn hơn 0!' });
            }
            totalAssignQty += qty;

            const expectedDate = ass.expected_date || ass.due_date;
            if (qty > 0) {
                if (!expectedDate) {
                    return reply.code(400).send({ error: 'Vui lòng chọn QLX Hẹn Ra!' });
                }
                if (expectedDate < todayStr) {
                    return reply.code(400).send({ error: 'QLX Hẹn Ra không được ở quá khứ!' });
                }
                if (holidayMap[expectedDate]) {
                    const dateFormatted = expectedDate.split('-').reverse().join('/');
                    return reply.code(400).send({ error: `Ngày ${dateFormatted} là ngày lễ (${holidayMap[expectedDate]}), không thể chọn!` });
                }
            }
        }

        if (assignments.length > 0 && totalAssignQty !== cut_qty) {
            return reply.code(400).send({ error: `Tổng số lượng phân công (${totalAssignQty}) phải khớp chính xác 100% với số lượng đã cắt xong (${cut_qty})!` });
        }

        let factoryPrice = 0;
        let processingPrice = 0;
        if (assignments.length > 0) {
            // 5. Fetch pricing from tsam_samples
            if (!item.pattern_name) {
                return reply.code(400).send({ error: 'Phiếu chưa được thiết lập Mã rập/Mẫu áo. Vui lòng cập nhật thông tin đơn hàng trước!' });
            }
            const tsam = await db.get(`
                SELECT factory_price, processing_price
                FROM tsam_samples
                WHERE sample_code = $1 AND is_active = true
            `, [item.pattern_name]);
            if (!tsam) {
                return reply.code(400).send({ error: `Mã rập/Mẫu áo "${item.pattern_name}" chưa được khai báo trong hệ thống. Vui lòng liên hệ Giám Đốc!` });
            }

            factoryPrice = Number(tsam.factory_price) || 0;
            processingPrice = Number(tsam.processing_price) || 0;

            // 6. Validate price existence for each assignment target
            for (const ass of assignments) {
                const isGiaCong = !!ass.contractor_id;
                const price = isGiaCong ? processingPrice : factoryPrice;
                if (price <= 0) {
                    return reply.code(400).send({
                        error: `Sản phẩm "${productName}" (Mẫu áo: "${item.pattern_name}") chưa được thiết lập Đơn Giá May [${isGiaCong ? 'Gia công' : 'Trong nhà'}]. Vui lòng liên hệ Giám Đốc để tạo bảng giá trước khi phân công!`
                    });
                }
            }
        }

        // 7. Perform save operations
        // Delete only the unlocked sewing records for this item
        await db.run(`
            DELETE FROM sewing_records
            WHERE order_item_id = $1
              AND done_date IS NULL
              AND COALESCE(salary_approved, false) = false
        `, [itemId]);

        // Also clean up any legacy qlx_assignments for sewing on this item
        await db.run("DELETE FROM qlx_assignments WHERE item_id = $1 AND assignment_type = 'may'", [itemId]);

        // Insert new records
        const descParts = [];

        // Calculate extra technique pricing
        let extraFactory = 0;
        let extraProcessing = 0;
        try {
            const extraTechs = typeof item.sewing_techniques === 'string' ? JSON.parse(item.sewing_techniques) : (item.sewing_techniques || []);
            if (Array.isArray(extraTechs)) {
                for (let i = 0; i < extraTechs.length; i++) {
                    extraFactory += (Number(extraTechs[i].fp) || 0) * (Number(extraTechs[i].qty) || 1);
                    extraProcessing += (Number(extraTechs[i].pp) || 0) * (Number(extraTechs[i].qty) || 1);
                }
            }
        } catch (e) {
            console.error('[QLX Sewing Assignment] Parse sewing techniques error:', e);
        }

        const totalFactoryPrice = factoryPrice + extraFactory;
        const totalProcessingPrice = processingPrice + extraProcessing;

        for (const ass of assignments) {
            // Check if this assignment corresponds to an existing locked record
            if (ass.id && lockedIds.includes(Number(ass.id))) {
                const isGiaCong = !!ass.contractor_id;
                let contractorName = 'May Nhà';
                if (isGiaCong) {
                    const cNameRow = await db.get('SELECT name FROM sewing_contractors WHERE id = $1', [Number(ass.contractor_id)]);
                    contractorName = cNameRow ? cNameRow.name : `Gia công #${ass.contractor_id}`;
                }
                descParts.push(`${contractorName} (${ass.quantity})`);
                continue;
            }

            const isGiaCong = !!ass.contractor_id;
            const price = isGiaCong ? totalProcessingPrice : totalFactoryPrice;

            let contractorName = 'May Nhà';
            if (isGiaCong) {
                const cNameRow = await db.get('SELECT name FROM sewing_contractors WHERE id = $1', [Number(ass.contractor_id)]);
                contractorName = cNameRow ? cNameRow.name : `Gia công #${ass.contractor_id}`;
            }
            descParts.push(`${contractorName} (${ass.quantity})`);

            const r = await db.get(`
                INSERT INTO sewing_records (
                    dht_order_id, order_item_id, product_name, contractor_id, quantity,
                    base_price, salary, expected_date, notes, created_by, created_at, handover_date
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
            `, [
                item.dht_order_id,
                itemId,
                productName,
                ass.contractor_id ? Number(ass.contractor_id) : null,
                Number(ass.quantity),
                price,
                0,
                ass.expected_date || ass.due_date || null,
                ass.notes || null,
                request.user.id,
                now,
                isGiaCong ? now : null
            ]);
            await syncFinishingRecord(r.id, request.user.id, now);
        }

        // Write to qlx_history
        const historyDetails = `Phân công May (bàn giao số lượng): ${descParts.join(', ')}`;
        await db.run(`
            INSERT INTO qlx_history (dht_order_id, item_id, action, details, performed_by, performed_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [item.dht_order_id, itemId, 'assign_may', historyDetails, request.user.id, now]);

        return { success: true };
    });
};
