// ========== TRA SOÁT ĐƠN HÀNG — Read-only Order Tracking Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow, vnDateStr } = require('../utils/timezone');

const FULL_VIEW_ROLES = ['giam_doc', 'quan_ly_cap_cao'];

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
    // Run database migrations/indexes if not exist to speed up queries
    try {
        await db.run(`CREATE INDEX IF NOT EXISTS idx_printing_records_dht_order_id ON printing_records (dht_order_id)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_pressing_records_dht_order_id ON pressing_records (dht_order_id)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_sewing_records_dht_order_id ON sewing_records (dht_order_id)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_finishing_records_dht_order_id ON finishing_records (dht_order_id)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_finishing_records_sewing_record_id ON finishing_records (sewing_record_id)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_qc_checklist_answers_sewing_record_id ON qc_checklist_answers (sewing_record_id)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_finishing_checklist_answers_finishing_record_id ON finishing_checklist_answers (finishing_record_id)`);
    } catch (e) {
        console.error('[Migration] Lỗi khởi tạo index cho Tra Soát:', e.message);
    }

    // ========== LIST — Danh sách đơn hàng + tiến độ ==========
    fastify.get('/api/trasoat/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const { search, month, year, status, current_step, page = 1, limit = 50 } = request.query;
        const userId = request.user.id;
        const userRole = request.user.role;

        const conditions = ['o.expected_ship_date IS NOT NULL'];
        const params = [];
        let idx = 1;

        // Permission: NV chỉ xem đơn mình tạo/CSKH, ngoại trừ Kế Toán và GĐ/QLCC
        let isFullView = FULL_VIEW_ROLES.includes(userRole);
        if (!isFullView) {
            const kt = await isKeToan(userId);
            if (kt) isFullView = true;
        }

        if (!isFullView) {
            conditions.push(`(o.created_by = $${idx} OR o.cskh_user_id = $${idx})`);
            params.push(userId); idx++;
        }

        // Search: mã đơn, tên KH, SĐT
        if (search && search.trim()) {
            conditions.push(`(o.order_code ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR o.customer_phone ILIKE $${idx})`);
            params.push(`%${search.trim()}%`); idx++;
        }

        // Date filters
        if (year) { conditions.push(`EXTRACT(YEAR FROM o.expected_ship_date) = $${idx}`); params.push(Number(year)); idx++; }
        if (month) {
            const mStr = String(month).toUpperCase();
            if (mStr.startsWith('Q')) {
                const qNum = Number(mStr.substring(1));
                if (qNum === 1) {
                    conditions.push(`EXTRACT(MONTH FROM o.expected_ship_date) IN (1, 2, 3)`);
                } else if (qNum === 2) {
                    conditions.push(`EXTRACT(MONTH FROM o.expected_ship_date) IN (4, 5, 6)`);
                } else if (qNum === 3) {
                    conditions.push(`EXTRACT(MONTH FROM o.expected_ship_date) IN (7, 8, 9)`);
                } else if (qNum === 4) {
                    conditions.push(`EXTRACT(MONTH FROM o.expected_ship_date) IN (10, 11, 12)`);
                }
            } else {
                conditions.push(`EXTRACT(MONTH FROM o.expected_ship_date) = $${idx}`);
                params.push(Number(month));
                idx++;
            }
        }

        if (current_step) {
            conditions.push(`o.shipping_status != 'shipped'`);
            conditions.push(`o.shipped_at IS NULL`);
        }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const todayStr = vnDateStr(vnNow());

                const rows = await db.all(`
            SELECT o.id, o.order_code, o.order_date, o.expected_ship_date,
                o.rescheduled_ship_date, o.shipping_status,
                o.customer_name, o.customer_phone, o.province,
                o.shipped_at, o.tracking_code, o.total_amount,
                o.parent_order_id, o.shipping_priority, o.standard_delivery_time,
                o.qlx_expected_date, o.qlx_expected_hour, o.qlx_actual_output_at,
                o.qlx_rescheduled_date, o.qlx_rescheduled_reason,
                c.name AS category_name,
                u_cskh.full_name AS cskh_name,
                u_created.full_name AS created_by_name,
                cr2.name AS carrier_name,
                req.required_steps,
                (
                    EXISTS (
                        SELECT 1 FROM qlx_order_print_assignments qa
                        JOIN printing_fields pf ON qa.field_id = pf.id
                        WHERE qa.dht_order_id = o.id AND qa.item_id IS NULL
                          AND pf.name IN ('IN PET', 'IN DECAL')
                    ) OR EXISTS (
                        SELECT 1 FROM printing_records pr
                        WHERE pr.dht_order_id = o.id AND pr.order_item_id IS NULL
                          AND pr.print_field IN ('IN PET', 'IN DECAL')
                    )
                ) AS has_press_printing,
                (
                    EXISTS (
                        SELECT 1 FROM qlx_order_print_assignments qa
                        WHERE qa.dht_order_id = o.id AND qa.item_id IS NULL
                    ) OR EXISTS (
                        SELECT 1 FROM printing_records pr
                        WHERE pr.dht_order_id = o.id AND pr.order_item_id IS NULL
                    )
                ) AS has_any_printing,
                COALESCE(
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = o.id) 
                        THEN NOT EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = o.id AND is_cut_done = false)
                        ELSE false
                    END,
                    false
                ) AS cut_done,
                COALESCE(
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM printing_records WHERE dht_order_id = o.id) 
                        THEN NOT EXISTS (SELECT 1 FROM printing_records WHERE dht_order_id = o.id AND is_print_done = false AND contractor_id IS NULL)
                        ELSE (SELECT op.is_completed FROM dht_order_production op WHERE op.dht_order_id = o.id AND op.step_id = 3 LIMIT 1)
                    END,
                    false
                ) AS print_done,
                COALESCE(
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM pressing_records WHERE dht_order_id = o.id) 
                        THEN NOT EXISTS (SELECT 1 FROM pressing_records WHERE dht_order_id = o.id AND is_reported = false)
                        ELSE (SELECT op.is_completed FROM dht_order_production op WHERE op.dht_order_id = o.id AND op.step_id = 4 LIMIT 1)
                    END,
                    false
                ) AS press_done,
                COALESCE(
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = o.id) 
                        THEN NOT EXISTS (
                            SELECT 1 FROM sewing_records sr
                            WHERE sr.dht_order_id = o.id
                              AND (
                                  (sr.contractor_id IS NULL AND NOT EXISTS (
                                      SELECT 1 FROM finishing_records fr 
                                      WHERE fr.sewing_record_id = sr.id AND fr.is_completed = true
                                  ))
                                  OR
                                  (sr.contractor_id IS NOT NULL AND NOT EXISTS (
                                      SELECT 1 FROM qc_checklist_answers qca 
                                      WHERE qca.sewing_record_id = sr.id
                                  ))
                              )
                        )
                        ELSE false
                    END,
                    false
                ) AS sew_done,
                COALESCE(
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM finishing_records WHERE dht_order_id = o.id) 
                        THEN NOT EXISTS (
                            SELECT 1 FROM finishing_records fr 
                            JOIN sewing_records sr ON fr.sewing_record_id = sr.id 
                            WHERE fr.dht_order_id = o.id
                              AND (
                                  NOT EXISTS (
                                      SELECT 1 FROM qc_checklist_answers qca 
                                      WHERE qca.sewing_record_id = fr.sewing_record_id
                                  )
                                  OR
                                  (sr.contractor_id IS NULL AND fr.is_completed = false)
                              )
                        )
                        ELSE (
                            CASE 
                                WHEN EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = o.id)
                                THEN NOT EXISTS (
                                    SELECT 1 FROM sewing_records sr
                                    WHERE sr.dht_order_id = o.id
                                      AND (
                                          (sr.contractor_id IS NULL AND NOT EXISTS (
                                              SELECT 1 FROM finishing_records fr 
                                              WHERE fr.sewing_record_id = sr.id AND fr.is_completed = true
                                          ))
                                          OR
                                          (sr.contractor_id IS NOT NULL AND NOT EXISTS (
                                              SELECT 1 FROM qc_checklist_answers qca 
                                              WHERE qca.sewing_record_id = sr.id
                                          ))
                                      )
                                )
                                ELSE false
                            END
                        )
                    END,
                    false
                ) AS finish_done
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN dht_carriers cr2 ON o.actual_carrier_id = cr2.id
            LEFT JOIN (
                SELECT oi.dht_order_id, string_agg(pp.step_id::text, ',') AS required_steps
                FROM dht_order_items oi
                JOIN dht_products p ON (p.name = oi.product_name OR p.name = TRIM(oi.description) OR oi.product_name LIKE '%' || p.name)
                JOIN dht_product_process pp ON pp.product_id = p.id
                WHERE pp.is_active = true
                  AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiet ke%'
                  AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiet ke%'
                GROUP BY oi.dht_order_id
            ) req ON o.id = req.dht_order_id
            ${where}
            ORDER BY o.expected_ship_date DESC NULLS LAST, o.created_at DESC
        `, params);

        const orders = await _getOrdersWithItemsProgress(rows, todayStr);

        // Post-query filters (computed fields)
        let filtered = orders;
        if (status && status !== 'all') filtered = filtered.filter(o => o.deviation_class === status);
        if (current_step) filtered = filtered.filter(o => o.current_step_name === current_step);

        const totalCount = filtered.length;
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 50;
        const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        return { orders: paginated, totalCount };
    });

    // ========== DETAIL — Chi tiết timeline 1 đơn ==========
    fastify.get('/api/trasoat/orders/:id/detail', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);

        const order = await db.get(`
            SELECT o.*, c.name AS category_name,
                u_cskh.full_name AS cskh_name, u_created.full_name AS created_by_name,
                u_shipped.full_name AS shipped_by_name, cr2.name AS carrier_name,
                cr2.tracking_url_template AS carrier_tracking_url
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN users u_shipped ON o.shipped_by = u_shipped.id
            LEFT JOIN dht_carriers cr2 ON o.actual_carrier_id = cr2.id
            WHERE o.id = $1
        `, [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });

        // Production steps
        const prodSteps = await db.all(`
            SELECT ps.id AS step_id, ps.name, ps.short_name, ps.display_order,
                COALESCE(op.is_completed, false) AS is_completed,
                op.completed_at, u.full_name AS completed_by_name
            FROM dht_process_steps ps
            LEFT JOIN dht_order_production op ON op.step_id = ps.id AND op.dht_order_id = $1
            LEFT JOIN users u ON op.completed_by = u.id
            WHERE ps.is_active = true ORDER BY ps.display_order
        `, [orderId]);

        // Cutting records
        const cutting = await db.all(`
            SELECT cr.*, u.full_name AS cutter_name
            FROM cutting_records cr LEFT JOIN users u ON cr.cutter_id = u.id
            WHERE cr.dht_order_id = $1 ORDER BY cr.cutting_at DESC
        `, [orderId]);

        // Sewing records
        const sewing = await db.all(`
            SELECT sr.*, u.full_name AS sewer_name,
                ct.name AS contractor_name,
                dt.name AS team_name,
                (SELECT COUNT(*)::int FROM qc_checklist_answers qca WHERE qca.sewing_record_id = sr.id) AS qc_count,
                (SELECT MAX(answered_at) FROM qc_checklist_answers qca WHERE qca.sewing_record_id = sr.id) AS qc_date,
                (SELECT u2.full_name FROM qc_checklist_answers qca JOIN users u2 ON qca.answered_by = u2.id WHERE qca.sewing_record_id = sr.id LIMIT 1) AS qc_by_name
            FROM sewing_records sr
            LEFT JOIN users u ON sr.sewer_id = u.id
            LEFT JOIN sewing_contractors ct ON sr.contractor_id = ct.id
            LEFT JOIN departments dt ON sr.sewing_team_id = dt.id
            WHERE sr.dht_order_id = $1 ORDER BY sr.id ASC
        `, [orderId]);

        // Finishing records (aggregates checklist status & completion details)
        const finishing = await db.all(`
            SELECT fr.*, u.full_name AS finisher_name,
                sr.contractor_id,
                (SELECT COUNT(*)::int FROM qc_checklist_answers qca WHERE qca.sewing_record_id = fr.sewing_record_id) AS qc_count,
                (SELECT COUNT(*)::int FROM finishing_checklist_answers fca WHERE fca.finishing_record_id = fr.id) AS checklist_count,
                (SELECT MAX(answered_at) FROM finishing_checklist_answers fca WHERE fca.finishing_record_id = fr.id) AS qc_done_at
            FROM finishing_records fr 
            LEFT JOIN users u ON fr.finisher_id = u.id
            LEFT JOIN sewing_records sr ON fr.sewing_record_id = sr.id
            WHERE fr.dht_order_id = $1 ORDER BY fr.id ASC
        `, [orderId]);

        // Printing records
        const printing = await db.all(`
            SELECT pr.*, u.full_name AS printer_name, c.name AS contractor_name
            FROM printing_records pr
            LEFT JOIN users u ON pr.printer_id = u.id
            LEFT JOIN printing_contractors c ON pr.contractor_id = c.id
            WHERE pr.dht_order_id = $1 ORDER BY pr.id ASC
        `, [orderId]);

        // Pressing records
        const pressing = await db.all(`
            SELECT pr.*, u.full_name AS presser_name
            FROM pressing_records pr LEFT JOIN users u ON pr.presser_id = u.id
            WHERE pr.dht_order_id = $1 ORDER BY pr.id ASC
        `, [orderId]);

        // Load QLX schedules and reports
        const schedules = await db.all(`
            SELECT * FROM qlx_item_schedules WHERE dht_order_id = $1
        `, [orderId]);
        const reports = await db.all(`
            SELECT r.*, u.full_name AS reporter_name 
            FROM qlx_step_reports r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.dht_order_id = $1 ORDER BY r.created_at ASC
        `, [orderId]);


        // Build timeline
        const code = (order.order_code || '').toUpperCase();
        const catName = (order.category_name || '').toUpperCase();
        const isPetTem = catName === 'PET' || catName === 'TEM' || code.includes('PET') || code.includes('TEM');
        const isShipped = order.shipping_status === 'shipped' || !!order.shipped_at;

        // Get order items
        const items = await db.all(`
            SELECT 
                oi.id, 
                oi.product_name, 
                oi.description, 
                oi.quantity,
                (
                    SELECT string_agg(pp.step_id::text, ',') 
                    FROM dht_product_process pp 
                    JOIN dht_products p ON pp.product_id = p.id 
                    WHERE (p.name = oi.product_name OR p.name = TRIM(oi.description) OR oi.product_name LIKE '%' || p.name)
                      AND pp.is_active = true
                ) AS required_steps,
                (
                    EXISTS (
                        SELECT 1 FROM qlx_order_print_assignments qa
                        JOIN printing_fields pf ON qa.field_id = pf.id
                        WHERE (qa.item_id = oi.id OR (qa.item_id IS NULL AND qa.dht_order_id = oi.dht_order_id AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = oi.id)))
                          AND pf.name IN ('IN PET', 'IN DECAL')
                    ) OR EXISTS (
                        SELECT 1 FROM printing_records pr
                        WHERE (pr.order_item_id = oi.id OR (pr.order_item_id IS NULL AND pr.dht_order_id = oi.dht_order_id AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = oi.id)))
                          AND pr.print_field IN ('IN PET', 'IN DECAL')
                    )
                ) AS has_press_printing,
                (
                    EXISTS (
                        SELECT 1 FROM qlx_order_print_assignments qa
                        WHERE (qa.item_id = oi.id OR (qa.item_id IS NULL AND qa.dht_order_id = oi.dht_order_id AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = oi.id)))
                    ) OR EXISTS (
                        SELECT 1 FROM printing_records pr
                        WHERE (pr.order_item_id = oi.id OR (pr.order_item_id IS NULL AND pr.dht_order_id = oi.dht_order_id AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = oi.id)))
                    )
                ) AS has_any_printing
            FROM dht_order_items oi
            WHERE oi.dht_order_id = $1
              AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiết kế%'
              AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiet ke%'
              AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiết kế%'
              AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiet ke%'
            ORDER BY oi.id
        `, [orderId]);

        if (!items.length) {
            const pressPrintAssign = await db.get(`
                SELECT 1 FROM qlx_order_print_assignments qa
                JOIN printing_fields pf ON qa.field_id = pf.id
                WHERE qa.dht_order_id = $1 AND qa.item_id IS NULL
                  AND pf.name IN ('IN PET', 'IN DECAL')
                LIMIT 1
            `, [orderId]);
            const hasPressPrinting = !!pressPrintAssign || await db.get(`
                SELECT 1 FROM printing_records WHERE dht_order_id = $1 AND order_item_id IS NULL AND print_field IN ('IN PET', 'IN DECAL') LIMIT 1
            `, [orderId]);

            const anyPrintAssign = await db.get(`
                SELECT 1 FROM qlx_order_print_assignments qa WHERE qa.dht_order_id = $1 AND qa.item_id IS NULL LIMIT 1
            `, [orderId]);
            const hasAnyPrinting = !!anyPrintAssign || await db.get(`
                SELECT 1 FROM printing_records WHERE dht_order_id = $1 AND order_item_id IS NULL LIMIT 1
            `, [orderId]);

            items.push({
                id: null,
                product_name: order.order_code,
                description: order.order_code,
                quantity: order.total_quantity || 0,
                required_steps: null,
                has_press_printing: !!hasPressPrinting,
                has_any_printing: !!hasAnyPrinting
            });
        }

        const hasItemSpecificCutting = cutting.some(c => c.order_item_id !== null);
        const hasItemSpecificPrinting = printing.some(p => p.order_item_id !== null);
        const hasItemSpecificPressing = pressing.some(p => p.order_item_id !== null);
        const hasItemSpecificSewing = sewing.some(s => s.order_item_id !== null);

        const itemsTimeline = items.map((item, idx) => {
            const isFirst = idx === 0;
            const itemCutting = cutting.filter(c => c.order_item_id === item.id || (c.order_item_id === null && isFirst && !hasItemSpecificCutting));
            const itemPrinting = printing.filter(p => p.order_item_id === item.id || (p.order_item_id === null && isFirst && !hasItemSpecificPrinting));
            const itemPressing = pressing.filter(p => p.order_item_id === item.id || (p.order_item_id === null && isFirst && !hasItemSpecificPressing));
            const itemSewing = sewing.filter(s => s.order_item_id === item.id || (s.order_item_id === null && isFirst && !hasItemSpecificSewing));
            const itemSewingIds = new Set(itemSewing.map(s => s.id));
            const itemFinishing = finishing.filter(f => itemSewingIds.has(f.sewing_record_id));

            const itemSchedule = schedules.find(s => s.order_item_id === item.id || (s.order_item_id === null && item.id === null));
            const itemReports = reports.filter(r => r.order_item_id === item.id || (r.order_item_id === null && item.id === null));

            const timeline = _buildItemTimeline(
                item, isShipped, order, 
                itemCutting, itemPrinting, itemPressing, itemSewing, itemFinishing, 
                prodSteps, itemSchedule, itemReports
            );

            return {
                id: item.id,
                product_name: item.product_name,
                description: item.description,
                quantity: item.quantity,
                timeline,
                qlx_schedule: itemSchedule || null,
                qlx_reports: itemReports || []
            };
        });

        const shipments = await db.all(`
            SELECT os.*, 
                   cr.name AS actual_carrier_name,
                   cr.tracking_url_template AS actual_carrier_tracking_url,
                   u.full_name AS shipped_by_name,
                   pr_ship.payment_code AS shipping_payment_code,
                   pr_ship.amount AS shipping_payment_amount
            FROM dht_order_shipments os
            LEFT JOIN dht_carriers cr ON os.actual_carrier_id = cr.id
            LEFT JOIN users u ON os.shipped_by = u.id
            LEFT JOIN payment_records pr_ship ON os.shipping_payment_id = pr_ship.id
            WHERE os.dht_order_id = $1 ORDER BY os.id ASC
        `, [orderId]);

        return {
            order: {
                id: order.id, order_code: order.order_code,
                customer_name: order.customer_name, customer_phone: order.customer_phone,
                province: order.province, address: order.address,
                order_date: order.order_date, expected_ship_date: order.expected_ship_date,
                rescheduled_ship_date: order.rescheduled_ship_date,
                shipping_status: order.shipping_status, shipped_at: order.shipped_at,
                tracking_code: order.tracking_code, carrier_name: order.carrier_name,
                carrier_phone: order.carrier_phone, shipping_bill_link: order.shipping_bill_link,
                carrier_tracking_url: order.carrier_tracking_url,
                total_amount: order.total_amount, cskh_name: order.cskh_name,
                created_by_name: order.created_by_name, shipped_by_name: order.shipped_by_name,
                is_pet_tem: isPetTem, parent_order_id: order.parent_order_id,
                category_name: order.category_name, standard_delivery_time: order.standard_delivery_time
            },
            items: itemsTimeline,
            cutting: cutting.map(c => ({ item_id: c.order_item_id, cutter: c.cutter_name, fabric: c.fabric_name, kg: c.kg_cut, ratio: c.cut_ratio, started: c.cutting_at, done: c.cut_done_at, is_done: c.is_cut_done })),
            sewing: sewing.map(s => ({ item_id: s.order_item_id, worker: s.sewer_name || s.contractor_name, qty: s.quantity, handover: s.handover_date, done: s.done_date, note: s.note })),
            finishing: finishing.map(f => ({ item_id: f.sewing_record_id ? sewing.find(s => s.id === f.sewing_record_id)?.order_item_id : null, worker: f.finisher_name, done: f.completed_at, is_done: f.is_completed })),
            shipments
        };
    });

    // ========== STATS — Thống kê cho biểu đồ ==========
    fastify.get('/api/trasoat/stats', { preHandler: [authenticate] }, async (request, reply) => {
        const { year, month } = request.query;
        const userId = request.user.id;
        const userRole = request.user.role;
        const targetYear = Number(year) || new Date().getFullYear();
        const todayStr = vnDateStr(vnNow());

        let isFullView = FULL_VIEW_ROLES.includes(userRole);
        if (!isFullView) {
            const kt = await isKeToan(userId);
            if (kt) isFullView = true;
        }

        let permFilter = '';
        const permParams = [];
        let pIdx = 1;
        if (!isFullView) {
            permFilter = `AND (created_by = $${pIdx} OR cskh_user_id = $${pIdx})`;
            permParams.push(userId); pIdx++;
        }

        let overallMonthFilter = '';
        const overallParams = [...permParams, todayStr, targetYear];
        if (month) {
            const mStr = String(month).toUpperCase();
            if (mStr.startsWith('Q')) {
                const qNum = Number(mStr.substring(1));
                if (qNum === 1) {
                    overallMonthFilter = `AND EXTRACT(MONTH FROM expected_ship_date) IN (1, 2, 3)`;
                } else if (qNum === 2) {
                    overallMonthFilter = `AND EXTRACT(MONTH FROM expected_ship_date) IN (4, 5, 6)`;
                } else if (qNum === 3) {
                    overallMonthFilter = `AND EXTRACT(MONTH FROM expected_ship_date) IN (7, 8, 9)`;
                } else if (qNum === 4) {
                    overallMonthFilter = `AND EXTRACT(MONTH FROM expected_ship_date) IN (10, 11, 12)`;
                }
            } else {
                overallMonthFilter = `AND EXTRACT(MONTH FROM expected_ship_date) = $${pIdx + 2}`;
                overallParams.push(Number(month));
            }
        }

        // Overall stats (filtered by year and optionally month)
        const stats = await db.get(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE shipping_status = 'shipped' AND shipped_at::date < COALESCE(rescheduled_ship_date, expected_ship_date)) AS early,
                COUNT(*) FILTER (
                    WHERE shipping_status = 'shipped' AND shipped_at::date = COALESCE(rescheduled_ship_date, expected_ship_date)
                ) AS on_time,
                COUNT(*) FILTER (
                    WHERE (shipping_status = 'shipped' AND shipped_at::date > COALESCE(rescheduled_ship_date, expected_ship_date))
                       OR (shipping_status != 'shipped' AND COALESCE(rescheduled_ship_date, expected_ship_date) < $${pIdx}::date)
                ) AS late
            FROM dht_orders o
            WHERE expected_ship_date IS NOT NULL
                AND EXTRACT(YEAR FROM expected_ship_date) = $${pIdx + 1}
                ${overallMonthFilter}
                ${permFilter}
        `, overallParams);

        const total = Number(stats.total) || 0;
        const early = Number(stats.early) || 0;
        const onTime = Number(stats.on_time) || 0;
        const late = Number(stats.late) || 0;

        // Monthly breakdown for bar chart (always whole year)
        const monthly = await db.all(`
            SELECT
                EXTRACT(MONTH FROM expected_ship_date)::int AS month,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE shipping_status = 'shipped' AND shipped_at::date < COALESCE(rescheduled_ship_date, expected_ship_date)) AS early,
                COUNT(*) FILTER (
                    WHERE shipping_status = 'shipped' AND shipped_at::date = COALESCE(rescheduled_ship_date, expected_ship_date)
                ) AS on_time,
                COUNT(*) FILTER (
                    WHERE (shipping_status = 'shipped' AND shipped_at::date > COALESCE(rescheduled_ship_date, expected_ship_date))
                       OR (shipping_status != 'shipped' AND COALESCE(rescheduled_ship_date, expected_ship_date) < $${pIdx}::date)
                ) AS late
            FROM dht_orders o
            WHERE expected_ship_date IS NOT NULL
                AND EXTRACT(YEAR FROM expected_ship_date) = $${pIdx + 1}
                ${permFilter}
            GROUP BY EXTRACT(MONTH FROM expected_ship_date)
            ORDER BY month
        `, [...permParams, todayStr, targetYear]);

        const months = [];
        for (let m = 1; m <= 12; m++) {
            const row = monthly.find(r => r.month === m);
            months.push({
                month: m, label: `T${m}`,
                total: Number(row?.total) || 0,
                early: Number(row?.early) || 0,
                on_time: Number(row?.on_time) || 0,
                late: Number(row?.late) || 0
            });
        }

        // Calculate backlog counts (unshipped orders)
        let backlogFilter = '';
        const backlogParams = [];
        if (!isFullView) {
            backlogFilter = `AND (o.created_by = $1 OR o.cskh_user_id = $1)`;
            backlogParams.push(userId);
        }

        const backlogOrders = await db.all(`
            SELECT o.id, o.order_code, o.shipping_status, o.shipped_at,
                   c.name AS category_name,
                   req.required_steps,
                   COALESCE(
                       CASE 
                           WHEN EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = o.id) 
                           THEN NOT EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = o.id AND is_cut_done = false)
                           ELSE false
                       END,
                       false
                   ) AS cut_done,
                   COALESCE(
                       CASE 
                           WHEN EXISTS (SELECT 1 FROM printing_records WHERE dht_order_id = o.id) 
                           THEN NOT EXISTS (SELECT 1 FROM printing_records WHERE dht_order_id = o.id AND is_print_done = false AND contractor_id IS NULL)
                           ELSE (SELECT op.is_completed FROM dht_order_production op WHERE op.dht_order_id = o.id AND op.step_id = 3 LIMIT 1)
                       END,
                       false
                   ) AS print_done,
                   COALESCE(
                       CASE 
                           WHEN EXISTS (SELECT 1 FROM pressing_records WHERE dht_order_id = o.id) 
                           THEN NOT EXISTS (SELECT 1 FROM pressing_records WHERE dht_order_id = o.id AND is_reported = false)
                           ELSE (SELECT op.is_completed FROM dht_order_production op WHERE op.dht_order_id = o.id AND op.step_id = 4 LIMIT 1)
                       END,
                       false
                   ) AS press_done,
                   COALESCE(
                       CASE 
                           WHEN EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = o.id) 
                           THEN NOT EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = o.id AND done_date IS NULL)
                           ELSE false
                       END,
                       false
                   ) AS sew_done,
                   COALESCE(
                       CASE 
                           WHEN EXISTS (SELECT 1 FROM finishing_records WHERE dht_order_id = o.id) 
                           THEN NOT EXISTS (SELECT 1 FROM finishing_records WHERE dht_order_id = o.id AND is_completed = false)
                           ELSE (
                               CASE 
                                   WHEN EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = o.id)
                                   THEN NOT EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = o.id AND done_date IS NULL)
                                   ELSE false
                               END
                           )
                       END,
                       false
                   ) AS finish_done
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN (
                SELECT oi.dht_order_id, string_agg(pp.step_id::text, ',') AS required_steps
                FROM dht_order_items oi
                JOIN dht_products p ON (p.name = oi.product_name OR p.name = TRIM(oi.description) OR oi.product_name LIKE '%' || p.name)
                JOIN dht_product_process pp ON pp.product_id = p.id
                WHERE pp.is_active = true
                  AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiet ke%'
                  AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiet ke%'
                GROUP BY oi.dht_order_id
            ) req ON o.id = req.dht_order_id
            WHERE o.expected_ship_date IS NOT NULL
              AND o.shipping_status != 'shipped'
              AND o.shipped_at IS NULL
              ${backlogFilter}
        `, backlogParams);

        let cho_cat = 0, cho_in = 0, cho_ep = 0, dang_may_qc_ht = 0, cho_gui = 0;
        for (const bo of backlogOrders) {
            const processed = _processOrder(bo, todayStr);
            if (processed.current_step_name === 'Chờ Cắt') cho_cat++;
            else if (processed.current_step_name === 'Chờ In') cho_in++;
            else if (processed.current_step_name === 'Chờ Ép') cho_ep++;
            else if (processed.current_step_name === 'Đang May / QC / HT') dang_may_qc_ht++;
            else if (processed.current_step_name === 'Chờ Gửi') cho_gui++;
        }

        return {
            year: targetYear,
            total, early, on_time: onTime, late,
            early_pct: total ? Math.round(early / total * 1000) / 10 : 0,
            on_time_pct: total ? Math.round(onTime / total * 1000) / 10 : 0,
            late_pct: total ? Math.round(late / total * 1000) / 10 : 0,
            months,
            backlog: {
                cho_cat,
                cho_in,
                cho_ep,
                dang_may_qc_ht,
                cho_gui
            }
        };
    });

    // ========== STEP DETAIL — Chi tiết từng bộ phận ==========
    fastify.get('/api/trasoat/orders/:id/step/:step', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);
        const step = request.params.step; // cat, in, ep, may, qc, ht, gui
        const itemId = request.query.item_id ? Number(request.query.item_id) : null;

        const order = await db.get(`
            SELECT o.id, o.order_code, o.customer_name, o.customer_phone, o.province, o.address,
                o.order_date, o.expected_ship_date, o.rescheduled_ship_date,
                o.shipping_status, o.shipped_at, o.tracking_code,
                o.total_quantity, o.total_amount, o.shipping_fee, o.shipping_fee_payer,
                o.carrier_phone, o.shipping_priority, o.standard_delivery_time, o.standard_proof_image,
                o.actual_ship_datetime, cr2.name AS actual_carrier_name, o.shipping_bill_link, o.receiver_name, o.shipping_fee_method,
                c.name AS category_name,
                u_cskh.full_name AS cskh_name, u_created.full_name AS created_by_name,
                u_shipped.full_name AS shipped_by_name,
                cr2.name AS carrier_name, cr2.tracking_url_template AS carrier_tracking_url,
                pr_ship.payment_code AS shipping_payment_code,
                pr_ship.amount AS shipping_payment_amount
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN users u_shipped ON o.shipped_by = u_shipped.id
            LEFT JOIN dht_carriers cr2 ON o.actual_carrier_id = cr2.id
            LEFT JOIN payment_records pr_ship ON o.shipping_payment_id = pr_ship.id
            WHERE o.id = $1
        `, [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });

        if (step === 'cat') {
            const records = await db.all(`
                SELECT cr.*, u.full_name AS cutter_name, doi.description AS item_description
                FROM cutting_records cr
                LEFT JOIN users u ON cr.cutter_id = u.id
                LEFT JOIN dht_order_items doi ON cr.order_item_id = doi.id
                WHERE cr.dht_order_id = $1
                  AND (
                      $2::int IS NULL 
                      OR cr.order_item_id = $2 
                      OR (
                          cr.order_item_id IS NULL 
                          AND $2 = (SELECT MIN(id) FROM dht_order_items WHERE dht_order_id = $1 AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%')
                          AND NOT EXISTS (SELECT 1 FROM cutting_records cr2 WHERE cr2.dht_order_id = $1 AND cr2.order_item_id IS NOT NULL)
                      )
                  )
                ORDER BY cr.id ASC
            `, [orderId, itemId]);
            // Get selected rolls for each record
            for (const r of records) {
                try {
                    const rollIds = JSON.parse(r.selected_roll_ids || '[]');
                    if (rollIds.length > 0) {
                        r.rolls = await db.all(`SELECT id, material_name, color, kg FROM kv_rolls WHERE id = ANY($1::int[])`, [rollIds]);
                    } else { r.rolls = []; }
                } catch(e) { r.rolls = []; }
            }

            // Get preparation and assignment status for all items in the order
            const items = await db.all(`
                SELECT id, description, quantity FROM dht_order_items 
                WHERE dht_order_id = $1 
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%'
                ORDER BY id
            `, [orderId]);

            const itemsStatus = [];
            for (const item of items) {
                const hasCuttingRecord = records.some(r => r.order_item_id === item.id);

                const prep = await db.get(`
                    SELECT fabric_arrived FROM qlx_preparation
                    WHERE dht_order_id = $1 AND (item_id = $2 OR item_id IS NULL)
                    ORDER BY item_id DESC NULLS LAST LIMIT 1
                `, [orderId, item.id]);
                const fabricArrived = prep ? !!prep.fabric_arrived : false;

                const assignment = await db.get(`
                    SELECT 1 FROM qlx_assignments
                    WHERE assignment_type = 'in'
                      AND (assigned_user_id IS NOT NULL OR assigned_contractor_id IS NOT NULL)
                      AND (item_id = $1 OR (dht_order_id = $2 AND item_id IS NULL))
                    LIMIT 1
                `, [item.id, orderId]);
                const hasPrintAssignment = !!assignment;

                itemsStatus.push({
                    item_id: item.id,
                    description: item.description,
                    quantity: item.quantity,
                    fabric_arrived: fabricArrived,
                    has_print_assignment: hasPrintAssignment,
                    has_cutter_claimed: hasCuttingRecord
                });
            }

            if (items.length === 0) {
                const prep = await db.get(`
                    SELECT fabric_arrived FROM qlx_preparation
                    WHERE dht_order_id = $1 AND item_id IS NULL
                    LIMIT 1
                `, [orderId]);
                const fabricArrived = prep ? !!prep.fabric_arrived : false;

                const assignment = await db.get(`
                    SELECT 1 FROM qlx_assignments
                    WHERE dht_order_id = $1 AND assignment_type = 'in' AND item_id IS NULL
                      AND (assigned_user_id IS NOT NULL OR assigned_contractor_id IS NOT NULL)
                    LIMIT 1
                `, [orderId]);
                const hasPrintAssignment = !!assignment;

                const hasCuttingRecord = records.length > 0;

                itemsStatus.push({
                    item_id: null,
                    description: order.order_code,
                    quantity: order.total_quantity || 0,
                    fabric_arrived: fabricArrived,
                    has_print_assignment: hasPrintAssignment,
                    has_cutter_claimed: hasCuttingRecord
                });
            }

            return {
                step: 'cat',
                order_code: order.order_code,
                customer_name: order.customer_name,
                records,
                items_status: itemsStatus
            };
        }

        if (step === 'in') {
            const records = await db.all(`
                SELECT pr.*, u.full_name AS printer_name,
                    u_done.full_name AS done_by_name,
                    ptr.roll_type AS pettem_roll_type,
                    ptr.qty_remaining AS pettem_roll_remaining,
                    doi.description AS item_description,
                    c.name AS contractor_name
                FROM printing_records pr
                LEFT JOIN users u ON pr.printer_id = u.id
                LEFT JOIN users u_done ON pr.print_done_by = u_done.id
                LEFT JOIN pettem_rolls ptr ON pr.pettem_roll_id = ptr.id
                LEFT JOIN dht_order_items doi ON pr.order_item_id = doi.id
                LEFT JOIN printing_contractors c ON pr.contractor_id = c.id
                WHERE pr.dht_order_id = $1
                  AND (
                      $2::int IS NULL 
                      OR pr.order_item_id = $2 
                      OR (
                          pr.order_item_id IS NULL 
                          AND $2 = (SELECT MIN(id) FROM dht_order_items WHERE dht_order_id = $1 AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%')
                          AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.dht_order_id = $1 AND pr2.order_item_id IS NOT NULL)
                      )
                  )
                ORDER BY pr.id ASC
            `, [orderId, itemId]);
            return { step: 'in', order_code: order.order_code, cskh_name: order.cskh_name, records };
        }

        if (step === 'ep') {
            const records = await db.all(`
                SELECT pr.*, u.full_name AS presser_name, o2.order_code, doi.description AS item_description
                FROM pressing_records pr
                LEFT JOIN users u ON pr.presser_id = u.id
                LEFT JOIN dht_orders o2 ON pr.dht_order_id = o2.id
                LEFT JOIN dht_order_items doi ON pr.order_item_id = doi.id
                WHERE pr.dht_order_id = $1
                  AND (
                      $2::int IS NULL 
                      OR pr.order_item_id = $2 
                      OR (
                          pr.order_item_id IS NULL 
                          AND $2 = (SELECT MIN(id) FROM dht_order_items WHERE dht_order_id = $1 AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%')
                          AND NOT EXISTS (SELECT 1 FROM pressing_records pr2 WHERE pr2.dht_order_id = $1 AND pr2.order_item_id IS NOT NULL)
                      )
                  )
                ORDER BY pr.id ASC
            `, [orderId, itemId]);

            let items = await db.all(`
                SELECT id, description, quantity FROM dht_order_items 
                WHERE dht_order_id = $1 
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%'
                ORDER BY id
            `, [orderId]);
            if (itemId) {
                items = items.filter(item => item.id === itemId);
            }

            const itemsStatus = [];
            for (const item of items) {
                const hasPresserClaimed = records.some(r => r.order_item_id === item.id);

                // Check cutting status
                const cuts = await db.all(`SELECT is_cut_done FROM cutting_records WHERE order_item_id = $1`, [item.id]);
                const isCutDone = cuts.length > 0 && cuts.every(c => c.is_cut_done);

                // Check print status
                const printAssign = await db.get(`
                    SELECT 1 FROM qlx_order_print_assignments qa
                    JOIN printing_fields pf ON qa.field_id = pf.id
                    WHERE (qa.item_id = $1 OR (qa.item_id IS NULL AND qa.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = $1)))
                      AND pf.name IN ('IN PET', 'IN DECAL')
                      AND qa.operator_type = 'user'
                    LIMIT 1
                `, [item.id, orderId]);
                const hasPrintAssignment = !!printAssign;

                let isPrintDone = true;
                if (hasPrintAssignment) {
                    const pendingPrint = await db.get(`
                        SELECT 1 FROM printing_records pr
                        WHERE (pr.order_item_id = $1 OR (pr.order_item_id IS NULL AND pr.dht_order_id = $2 AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = $1)))
                          AND pr.print_field IN ('IN PET', 'IN DECAL')
                          AND (pr.is_print_done = false AND pr.contractor_id IS NULL)
                        LIMIT 1
                    `, [item.id, orderId]);
                    isPrintDone = !pendingPrint;
                }

                itemsStatus.push({
                    item_id: item.id,
                    description: item.description,
                    quantity: item.quantity,
                    is_cut_done: isCutDone,
                    is_print_done: isPrintDone,
                    has_print_assignment: hasPrintAssignment,
                    has_presser_claimed: hasPresserClaimed
                });
            }

            if (items.length === 0) {
                const hasPresserClaimed = records.length > 0;

                const cuts = await db.all(`SELECT is_cut_done FROM cutting_records WHERE dht_order_id = $1 AND order_item_id IS NULL`, [orderId]);
                const isCutDone = cuts.length > 0 && cuts.every(c => c.is_cut_done);

                const printAssign = await db.get(`
                    SELECT 1 FROM qlx_order_print_assignments qa
                    JOIN printing_fields pf ON qa.field_id = pf.id
                    WHERE qa.dht_order_id = $1 AND qa.item_id IS NULL
                      AND pf.name IN ('IN PET', 'IN DECAL')
                      AND qa.operator_type = 'user'
                    LIMIT 1
                `, [orderId]);
                const hasPrintAssignment = !!printAssign;

                let isPrintDone = true;
                if (hasPrintAssignment) {
                    const pendingPrint = await db.get(`
                        SELECT 1 FROM printing_records pr
                        WHERE pr.dht_order_id = $1 AND pr.order_item_id IS NULL
                          AND pr.print_field IN ('IN PET', 'IN DECAL')
                          AND (pr.is_print_done = false AND pr.contractor_id IS NULL)
                        LIMIT 1
                    `, [orderId]);
                    isPrintDone = !pendingPrint;
                }

                itemsStatus.push({
                    item_id: null,
                    description: order.order_code,
                    quantity: order.total_quantity || 0,
                    is_cut_done: isCutDone,
                    is_print_done: isPrintDone,
                    has_print_assignment: hasPrintAssignment,
                    has_presser_claimed: hasPresserClaimed
                });
            }

            return { step: 'ep', order_code: order.order_code, cskh_name: order.cskh_name, records, items_status: itemsStatus };
        }

        if (step === 'may') {
            const records = await db.all(`
                SELECT sr.*, u.full_name AS sewer_name, ct.name AS contractor_name,
                    dt.name AS team_name, doi.description AS item_description,
                    doi.quantity AS order_quantity, doi.material_pairs,
                    doi.material_name, doi.color_name AS fabric_color,
                    (SELECT MAX(answered_at) FROM qc_checklist_answers WHERE sewing_record_id = sr.id) AS qc_date,
                    (SELECT completed_at FROM finishing_records WHERE sewing_record_id = sr.id AND is_completed = true LIMIT 1) AS finishing_completed_at
                FROM sewing_records sr
                LEFT JOIN users u ON sr.sewer_id = u.id
                LEFT JOIN sewing_contractors ct ON sr.contractor_id = ct.id
                LEFT JOIN departments dt ON sr.sewing_team_id = dt.id
                LEFT JOIN dht_order_items doi ON sr.order_item_id = doi.id
                WHERE sr.dht_order_id = $1
                  AND (
                      $2::int IS NULL 
                      OR sr.order_item_id = $2 
                      OR (
                          sr.order_item_id IS NULL 
                          AND $2 = (SELECT MIN(id) FROM dht_order_items WHERE dht_order_id = $1 AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%')
                          AND NOT EXISTS (SELECT 1 FROM sewing_records sr2 WHERE sr2.dht_order_id = $1 AND sr2.order_item_id IS NOT NULL)
                      )
                  )
                ORDER BY sr.id ASC
            `, [orderId, itemId]);

            const formatCombinedString = (str) => {
                if (!str) return '—';
                const parts = str.split('+').map(s => s.trim()).filter(Boolean);
                const uniqueParts = [...new Set(parts)];
                return uniqueParts.join(' + ');
            };

            for (const r of records) {
                r.material_name = formatCombinedString(r.material_name);
                r.fabric_color = formatCombinedString(r.fabric_color);

                if (r.contractor_id === null) {
                    r.done_date = r.finishing_completed_at;
                } else {
                    r.done_date = r.qc_date;
                }

                if (r.order_item_id) {
                    const cutQtyRow = await db.get(`
                        SELECT COALESCE(SUM(cut_quantity), 0)::int AS cut_qty
                        FROM cutting_records
                        WHERE order_item_id = $1 AND is_cut_done = true
                    `, [r.order_item_id]);
                    const rawCutQty = cutQtyRow ? cutQtyRow.cut_qty : 0;
                    let numPhois = 1;
                    try {
                        const pairs = typeof r.material_pairs === 'string' ? JSON.parse(r.material_pairs) : (r.material_pairs || []);
                        if (Array.isArray(pairs) && pairs.length > 0) {
                            numPhois = pairs.length;
                        }
                    } catch(e) {}
                    r.actual_quantity = Math.round(rawCutQty / numPhois);
                } else {
                    r.actual_quantity = 0;
                }
            }

            return {
                step: 'may', order_code: order.order_code, cskh_name: order.cskh_name,
                expected_ship_date: order.expected_ship_date,
                records
            };
        }

        if (step === 'qc') {
            const records = await db.all(`
                SELECT sr.*, doi.description AS item_description,
                    COALESCE(u.full_name, c.name, dt.name) AS sewer_name,
                    qc_u.full_name AS finisher_name,
                    (SELECT MAX(answered_at) FROM qc_checklist_answers WHERE sewing_record_id = sr.id) AS qc_date
                FROM sewing_records sr
                LEFT JOIN users u ON sr.sewer_id = u.id
                LEFT JOIN sewing_contractors c ON sr.contractor_id = c.id
                LEFT JOIN departments dt ON sr.sewing_team_id = dt.id
                LEFT JOIN dht_order_items doi ON sr.order_item_id = doi.id
                LEFT JOIN (
                    SELECT DISTINCT ON (sewing_record_id) sewing_record_id, answered_by
                    FROM qc_checklist_answers
                ) qca ON sr.id = qca.sewing_record_id
                LEFT JOIN users qc_u ON qca.answered_by = qc_u.id
                WHERE sr.dht_order_id = $1
                  AND (
                      $2::int IS NULL 
                      OR sr.order_item_id = $2 
                      OR (
                          sr.order_item_id IS NULL 
                          AND $2 = (SELECT MIN(id) FROM dht_order_items WHERE dht_order_id = $1 AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%')
                          AND NOT EXISTS (SELECT 1 FROM sewing_records sr2 WHERE sr2.dht_order_id = $1 AND sr2.order_item_id IS NOT NULL)
                      )
                  )
                ORDER BY sr.id ASC
            `, [orderId, itemId]);
            // Get checklist answers for each record
            for (const r of records) {
                r.answers = await db.all(`
                    SELECT qca.answer_value, qct.content, qct.type
                    FROM qc_checklist_answers qca
                    JOIN qc_checklist_templates qct ON qca.template_id = qct.id
                    WHERE qca.sewing_record_id = $1
                    ORDER BY qct.sort_order
                `, [r.id]);
            }

            let items = await db.all(`
                SELECT id, description, quantity FROM dht_order_items 
                WHERE dht_order_id = $1 
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%'
                ORDER BY id
            `, [orderId]);
            if (itemId) {
                items = items.filter(item => item.id === itemId);
            }

            const itemsStatus = [];
            for (const item of items) {
                const sewRec = await db.get(`SELECT id, done_date FROM sewing_records WHERE order_item_id = $1 LIMIT 1`, [item.id]);
                const hasSewingRecord = !!sewRec;
                const isSewingDone = sewRec ? !!sewRec.done_date : false;

                let isQcDone = false;
                if (sewRec) {
                    const qcAns = await db.get(`SELECT 1 FROM qc_checklist_answers WHERE sewing_record_id = $1 LIMIT 1`, [sewRec.id]);
                    isQcDone = !!qcAns;
                }

                itemsStatus.push({
                    item_id: item.id,
                    description: item.description,
                    quantity: item.quantity,
                    has_sewing_record: hasSewingRecord,
                    is_sewing_done: isSewingDone,
                    is_qc_done: isQcDone
                });
            }

            if (items.length === 0) {
                const sewRec = await db.get(`SELECT id, done_date FROM sewing_records WHERE dht_order_id = $1 AND order_item_id IS NULL LIMIT 1`, [orderId]);
                const hasSewingRecord = !!sewRec;
                const isSewingDone = sewRec ? !!sewRec.done_date : false;

                let isQcDone = false;
                if (sewRec) {
                    const qcAns = await db.get(`SELECT 1 FROM qc_checklist_answers WHERE sewing_record_id = $1 LIMIT 1`, [sewRec.id]);
                    isQcDone = !!qcAns;
                }

                itemsStatus.push({
                    item_id: null,
                    description: order.order_code,
                    quantity: order.total_quantity || 0,
                    has_sewing_record: hasSewingRecord,
                    is_sewing_done: isSewingDone,
                    is_qc_done: isQcDone
                });
            }

            return { step: 'qc', order_code: order.order_code, cskh_name: order.cskh_name, records, items_status: itemsStatus };
        }

        if (step === 'ht') {
            const records = await db.all(`
                SELECT fr.*, u.full_name AS finisher_name, doi.description AS item_description,
                    COALESCE(u_sew.full_name, c.name, dt.name) AS sewer_name,
                    sr.contractor_id,
                    sr.handover_date,
                    sr.order_item_id,
                    o.expected_ship_date AS order_expected_ship_date,
                    o.standard_delivery_time AS order_standard_delivery_time,
                    (SELECT COUNT(*)::int FROM qc_checklist_answers qca WHERE qca.sewing_record_id = fr.sewing_record_id) AS qc_count
                FROM finishing_records fr
                LEFT JOIN users u ON fr.finisher_id = u.id
                LEFT JOIN sewing_records sr ON fr.sewing_record_id = sr.id
                LEFT JOIN users u_sew ON sr.sewer_id = u_sew.id
                LEFT JOIN sewing_contractors c ON sr.contractor_id = c.id
                LEFT JOIN departments dt ON sr.sewing_team_id = dt.id
                LEFT JOIN dht_order_items doi ON sr.order_item_id = doi.id
                LEFT JOIN dht_orders o ON fr.dht_order_id = o.id
                WHERE fr.dht_order_id = $1
                  AND (
                      $2::int IS NULL 
                      OR sr.order_item_id = $2 
                      OR (
                          sr.order_item_id IS NULL 
                          AND $2 = (SELECT MIN(id) FROM dht_order_items WHERE dht_order_id = $1 AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%' AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%')
                          AND NOT EXISTS (SELECT 1 FROM finishing_records fr2 JOIN sewing_records sr2 ON fr2.sewing_record_id = sr2.id WHERE fr2.dht_order_id = $1 AND sr2.order_item_id IS NOT NULL)
                      )
                  )
                ORDER BY fr.id ASC
            `, [orderId, itemId]);
            // Get checklist answers for each record
            for (const r of records) {
                r.checklist = await db.all(`
                    SELECT fca.answer_value, fct.content AS question, fct.type
                    FROM finishing_checklist_answers fca
                    JOIN finishing_checklist_templates fct ON fca.template_id = fct.id
                    WHERE fca.finishing_record_id = $1
                    ORDER BY fct.sort_order
                `, [r.id]);
            }

            let items = await db.all(`
                SELECT id, description, quantity FROM dht_order_items 
                WHERE dht_order_id = $1 
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%'
                ORDER BY id
            `, [orderId]);
            if (itemId) {
                items = items.filter(item => item.id === itemId);
            }

            const itemsStatus = [];
            for (const item of items) {
                const sewRec = await db.get(`SELECT id, done_date FROM sewing_records WHERE order_item_id = $1 LIMIT 1`, [item.id]);
                const hasSewingRecord = !!sewRec;
                const isSewingDone = sewRec ? !!sewRec.done_date : false;

                let isQcDone = false;
                if (sewRec) {
                    const qcAns = await db.get(`SELECT 1 FROM qc_checklist_answers WHERE sewing_record_id = $1 LIMIT 1`, [sewRec.id]);
                    isQcDone = !!qcAns;
                }

                // Check if it has CCHT process step
                const prodName = item.description;
                const hasCCHT = await db.get(`
                    SELECT 1 FROM dht_product_process pp
                    JOIN dht_process_steps ps ON pp.step_id = ps.id
                    JOIN dht_products p ON pp.product_id = p.id
                    LEFT JOIN dht_settings_options so ON so.category = 'sale_type' AND so.name = (SELECT sale_type FROM dht_order_items WHERE id = $2)
                    WHERE ps.short_name = 'CCHT' AND pp.is_active = true AND ps.is_active = true
                      AND (p.sale_type_id = so.id OR (so.id IS NULL AND p.sale_type_id = 1))
                      AND (p.name = $1 OR p.name = $3 OR $1 LIKE '%' || p.name)
                    LIMIT 1
                `, [prodName, item.id, prodName ? prodName.trim() : '']);

                itemsStatus.push({
                    item_id: item.id,
                    description: item.description,
                    quantity: item.quantity,
                    has_sewing_record: hasSewingRecord,
                    is_sewing_done: isSewingDone,
                    is_qc_done: isQcDone,
                    has_ccht: !!hasCCHT
                });
            }

            if (items.length === 0) {
                const sewRec = await db.get(`SELECT id, done_date FROM sewing_records WHERE dht_order_id = $1 AND order_item_id IS NULL LIMIT 1`, [orderId]);
                const hasSewingRecord = !!sewRec;
                const isSewingDone = sewRec ? !!sewRec.done_date : false;

                let isQcDone = false;
                if (sewRec) {
                    const qcAns = await db.get(`SELECT 1 FROM qc_checklist_answers WHERE sewing_record_id = $1 LIMIT 1`, [sewRec.id]);
                    isQcDone = !!qcAns;
                }

                const hasCCHT = await db.get(`
                    SELECT 1 FROM dht_product_process pp
                    JOIN dht_process_steps ps ON pp.step_id = ps.id
                    JOIN dht_products p ON pp.product_id = p.id
                    WHERE ps.short_name = 'CCHT' AND pp.is_active = true AND ps.is_active = true
                      AND p.sale_type_id = 1
                      AND (p.name = $1 OR $1 LIKE '%' || p.name)
                    LIMIT 1
                `, [order.category_name]);

                itemsStatus.push({
                    item_id: null,
                    description: order.order_code,
                    quantity: order.total_quantity || 0,
                    has_sewing_record: hasSewingRecord,
                    is_sewing_done: isSewingDone,
                    is_qc_done: isQcDone,
                    has_ccht: !!hasCCHT
                });
            }

            return { step: 'ht', order_code: order.order_code, cskh_name: order.cskh_name, is_order_shipped: !!order.delivery_date, records, items_status: itemsStatus };
        }

        if (step === 'gui') {
            const code = (order.order_code || '').toUpperCase();
            const catName = (order.category_name || '').toUpperCase();
            const isPetTem = catName === 'PET' || catName === 'TEM' || code.includes('PET') || code.includes('TEM');

            let done_order_at = null;
            if (isPetTem) {
                const printRow = await db.get(`
                    SELECT MAX(
                        CASE 
                            WHEN contractor_id IS NOT NULL THEN created_at 
                            ELSE print_done_at 
                        END
                    ) AS max_print_time
                    FROM printing_records
                    WHERE dht_order_id = $1 AND (contractor_id IS NOT NULL OR is_print_done = true)
                `, [orderId]);
                done_order_at = printRow ? printRow.max_print_time : null;
            } else {
                const finishRow = await db.get(`
                    SELECT MAX(completed_at) AS finishing_completed_at
                    FROM finishing_records
                    WHERE dht_order_id = $1 AND is_completed = true
                `, [orderId]);
                done_order_at = finishRow ? finishRow.finishing_completed_at : null;
            }

            const items = await db.all(`
                SELECT i.*, 
                       cr.name AS actual_carrier_name,
                       cr.tracking_url_template AS actual_carrier_tracking_url,
                       u.full_name AS shipped_by_name,
                       pr.payment_code AS shipping_payment_code,
                       pr.amount AS shipping_payment_amount
                FROM dht_order_items i
                LEFT JOIN dht_carriers cr ON i.actual_carrier_id = cr.id
                LEFT JOIN users u ON i.shipped_by = u.id
                LEFT JOIN payment_records pr ON i.shipping_payment_id = pr.id
                WHERE i.dht_order_id = $1 
                  AND LOWER(COALESCE(i.product_name, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(i.product_name, '')) NOT LIKE '%thiet ke%'
                  AND LOWER(COALESCE(i.description, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(i.description, '')) NOT LIKE '%thiet ke%'
                ORDER BY i.id ASC
            `, [orderId]);

            const shipments = await db.all(`
                SELECT os.*, 
                       cr.name AS actual_carrier_name,
                       cr.tracking_url_template AS actual_carrier_tracking_url,
                       u.full_name AS shipped_by_name,
                       pr_ship.payment_code AS shipping_payment_code,
                       pr_ship.amount AS shipping_payment_amount
                FROM dht_order_shipments os
                LEFT JOIN dht_carriers cr ON os.actual_carrier_id = cr.id
                LEFT JOIN users u ON os.shipped_by = u.id
                LEFT JOIN payment_records pr_ship ON os.shipping_payment_id = pr_ship.id
                WHERE os.dht_order_id = $1 ORDER BY os.id ASC
            `, [orderId]);

            return {
                step: 'gui',
                order_code: order.order_code,
                customer_name: order.customer_name,
                customer_phone: order.customer_phone,
                province: order.province,
                address: order.address,
                cskh_name: order.cskh_name,
                order_date: order.order_date,
                expected_ship_date: order.expected_ship_date,
                shipping_priority: order.shipping_priority,
                standard_delivery_time: order.standard_delivery_time,
                standard_proof_image: order.standard_proof_image,
                actual_ship_datetime: order.actual_ship_datetime,
                actual_carrier_name: order.actual_carrier_name,
                shipping_bill_link: order.shipping_bill_link,
                receiver_name: order.receiver_name,
                shipping_fee_method: order.shipping_fee_method,
                shipped_by_name: order.shipped_by_name,
                shipped_at: order.shipped_at,
                carrier_name: order.carrier_name,
                tracking_code: order.tracking_code,
                carrier_tracking_url: order.carrier_tracking_url,
                carrier_phone: order.carrier_phone,
                shipping_fee: order.shipping_fee,
                shipping_fee_payer: order.shipping_fee_payer,
                done_order_at,
                items,
                shipments
            };
        }

        return reply.code(400).send({ error: 'Step không hợp lệ' });
    });
};

// ========== Helper: Process order row → add progress fields ==========
function _processOrder(o, todayStr) {
    return _processOrderWithItems(o, [], todayStr);
}

function _processOrderWithItems(o, items, todayStr) {
    const code = (o.order_code || '').toUpperCase();
    const catName = (o.category_name || '').toUpperCase();
    const isPetTem = catName === 'PET' || catName === 'TEM' || code.includes('PET') || code.includes('TEM');
    const isShipped = o.shipping_status === 'shipped' || !!o.shipped_at;

    let orderItems = items;
    if (!orderItems || !orderItems.length) {
        orderItems = [{
            item_id: null,
            dht_order_id: o.id,
            product_name: o.order_code,
            description: o.order_code,
            quantity: o.total_quantity || 0,
            required_steps: o.required_steps,
            cut_done: o.cut_done,
            print_done: o.print_done,
            press_done: o.press_done,
            sew_done: o.sew_done,
            finish_done: o.finish_done,
            has_press_printing: o.has_press_printing,
            has_any_printing: o.has_any_printing
        }];
    }

    let orderTotalSteps = 0;
    let orderDoneSteps = 0;

    const STEP_PRIORITY = {
        'Chờ Cắt': 1,
        'Chờ In': 2,
        'Chờ Ép': 3,
        'Đang May / QC / HT': 4,
        'Chờ Gửi': 5,
        'Hoàn thành': 6
    };

    let slowestStepPriority = 999;
    let slowestStepName = 'Hoàn thành';

    const processedItems = orderItems.map(item => {
        let requiredStepIds = null;
        if (item.required_steps) {
            requiredStepIds = new Set(item.required_steps.split(',').map(Number));
        }

        if (!requiredStepIds) {
            if (isPetTem) {
                requiredStepIds = new Set([3]);
            } else {
                requiredStepIds = new Set([1, 2, 3, 4, 5, 6, 7]);
            }
        }

        const needsCut = requiredStepIds.has(2);
        const needsPrint = requiredStepIds.has(3);
        let needsPress = requiredStepIds.has(4);
        if (item.has_any_printing && !isPetTem) {
            needsPress = !!item.has_press_printing;
        }
        const needsSew = requiredStepIds.has(5);
        const needsFinishing = requiredStepIds.has(6) || requiredStepIds.has(7);

        const cutDone = !needsCut || item.cut_done;
        const printDone = !needsPrint || item.print_done;
        const pressDone = !needsPress || item.press_done;
        const sewDone = !needsSew || item.sew_done;
        const finishDone = !needsFinishing || item.finish_done;

        let totalSteps = 1; // Always has Gửi
        if (needsCut) totalSteps++;
        if (needsPrint) totalSteps++;
        if (needsPress) totalSteps++;
        if (needsSew) totalSteps++;
        if (needsFinishing) totalSteps++;

        let doneSteps = 0;
        if (needsCut && item.cut_done) doneSteps++;
        if (needsPrint && item.print_done) doneSteps++;
        if (needsPress && item.press_done) doneSteps++;
        if (needsSew && item.sew_done) doneSteps++;
        if (needsFinishing && item.finish_done) doneSteps++;
        if (isShipped) {
            doneSteps = totalSteps;
        } else if (doneSteps === totalSteps) {
            doneSteps = totalSteps - 1; // Not shipped yet
        }

        let currentStepName = 'Hoàn thành';
        if (isShipped) {
            currentStepName = 'Hoàn thành';
            doneSteps = totalSteps;
        } else if (!cutDone) {
            currentStepName = 'Chờ Cắt';
        } else if (!printDone) {
            currentStepName = 'Chờ In';
        } else if (!pressDone) {
            currentStepName = 'Chờ Ép';
        } else if (!finishDone) {
            currentStepName = 'Đang May / QC / HT';
        } else {
            currentStepName = 'Chờ Gửi';
        }

        orderTotalSteps += totalSteps;
        orderDoneSteps += doneSteps;

        const pri = STEP_PRIORITY[currentStepName] || 6;
        if (pri < slowestStepPriority) {
            slowestStepPriority = pri;
            slowestStepName = currentStepName;
        }

        return {
            item_id: item.item_id,
            product_name: item.product_name,
            description: item.description,
            quantity: item.quantity,
            total_steps: totalSteps,
            done_steps: doneSteps,
            current_step_name: currentStepName,
            progress_percent: totalSteps ? Math.round(doneSteps / totalSteps * 100) : 0
        };
    });

    // Deviation calculation
    const expectedDate = o.rescheduled_ship_date || o.expected_ship_date;
    let deviationDays = 0;
    let deviationLabel = 'Trong hạn';
    let deviationClass = 'pending';

    if (expectedDate) {
        const exp = new Date(expectedDate); exp.setHours(0,0,0,0);
        if (isShipped) {
            const ship = new Date(o.shipped_at || todayStr); ship.setHours(0,0,0,0);
            deviationDays = Math.round((ship - exp) / 86400000);
            if (deviationDays < 0) {
                deviationLabel = `Sớm ${Math.abs(deviationDays)} ngày`;
                deviationClass = 'early';
            } else if (deviationDays > 0) {
                deviationLabel = `Trễ ${deviationDays} ngày`;
                deviationClass = 'late';
            } else {
                deviationLabel = 'Đúng lịch';
                deviationClass = 'on_time';
            }
        } else {
            const td = new Date(todayStr); td.setHours(0,0,0,0);
            const diff = Math.round((td - exp) / 86400000);
            if (diff > 0) {
                deviationDays = diff;
                deviationLabel = `Trễ ${deviationDays} ngày`;
                deviationClass = 'late';
            } else {
                deviationDays = 0;
                deviationLabel = 'Trong hạn';
                deviationClass = 'pending';
            }
        }
    }

    return {
        id: o.id, order_code: o.order_code, customer_name: o.customer_name,
        customer_phone: o.customer_phone, province: o.province,
        order_date: o.order_date, expected_ship_date: o.expected_ship_date,
        rescheduled_ship_date: o.rescheduled_ship_date,
        shipping_status: o.shipping_status, shipped_at: o.shipped_at,
        tracking_code: o.tracking_code, carrier_name: o.carrier_name,
        cskh_name: o.cskh_name, created_by_name: o.created_by_name,
        total_amount: o.total_amount, category_name: o.category_name,
        is_pet_tem: isPetTem, is_repair: !!o.parent_order_id,
        total_steps: orderTotalSteps, done_steps: orderDoneSteps,
        current_step_name: slowestStepName,
        progress_percent: orderTotalSteps ? Math.round(orderDoneSteps / orderTotalSteps * 100) : 0,
        deviation_days: deviationDays, deviation_label: deviationLabel, deviation_class: deviationClass,
        shipping_priority: o.shipping_priority,
        standard_delivery_time: o.standard_delivery_time,
        items: processedItems
    };
}

async function _getOrdersWithItemsProgress(orders, todayStr) {
    if (!orders.length) return [];
    const orderIds = orders.map(o => o.id);

    const items = await db.all(`
        SELECT 
            oi.id AS item_id,
            oi.dht_order_id,
            oi.product_name,
            oi.description,
            oi.quantity,
            (
                SELECT string_agg(pp.step_id::text, ',') 
                FROM dht_product_process pp 
                JOIN dht_products p ON pp.product_id = p.id 
                WHERE (p.name = oi.product_name OR p.name = TRIM(oi.description) OR oi.product_name LIKE '%' || p.name)
                  AND pp.is_active = true
            ) AS required_steps,
            (
                EXISTS (
                    SELECT 1 FROM qlx_order_print_assignments qa
                    JOIN printing_fields pf ON qa.field_id = pf.id
                    WHERE (qa.item_id = oi.id OR (qa.item_id IS NULL AND qa.dht_order_id = oi.dht_order_id AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = oi.id)))
                      AND pf.name IN ('IN PET', 'IN DECAL')
                ) OR EXISTS (
                    SELECT 1 FROM printing_records pr
                    WHERE (pr.order_item_id = oi.id OR (pr.order_item_id IS NULL AND pr.dht_order_id = oi.dht_order_id AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = oi.id)))
                      AND pr.print_field IN ('IN PET', 'IN DECAL')
                )
            ) AS has_press_printing,
            (
                EXISTS (
                    SELECT 1 FROM qlx_order_print_assignments qa
                    WHERE (qa.item_id = oi.id OR (qa.item_id IS NULL AND qa.dht_order_id = oi.dht_order_id AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = oi.id)))
                ) OR EXISTS (
                    SELECT 1 FROM printing_records pr
                    WHERE (pr.order_item_id = oi.id OR (pr.order_item_id IS NULL AND pr.dht_order_id = oi.dht_order_id AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = oi.id)))
                )
            ) AS has_any_printing,
            COALESCE(
                CASE 
                    WHEN EXISTS (SELECT 1 FROM cutting_records WHERE order_item_id = oi.id) 
                    THEN NOT EXISTS (SELECT 1 FROM cutting_records WHERE order_item_id = oi.id AND is_cut_done = false)
                    WHEN NOT EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NOT NULL)
                         AND EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NULL)
                    THEN NOT EXISTS (SELECT 1 FROM cutting_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NULL AND is_cut_done = false)
                    ELSE false
                END,
                false
            ) AS cut_done,
            COALESCE(
                CASE 
                    WHEN EXISTS (SELECT 1 FROM printing_records WHERE order_item_id = oi.id) 
                    THEN NOT EXISTS (SELECT 1 FROM printing_records WHERE order_item_id = oi.id AND is_print_done = false AND contractor_id IS NULL)
                    WHEN NOT EXISTS (SELECT 1 FROM printing_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NOT NULL)
                         AND EXISTS (SELECT 1 FROM printing_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NULL)
                    THEN NOT EXISTS (SELECT 1 FROM printing_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NULL AND is_print_done = false AND contractor_id IS NULL)
                    ELSE false
                END,
                false
            ) AS print_done,
            COALESCE(
                CASE 
                    WHEN EXISTS (SELECT 1 FROM pressing_records WHERE order_item_id = oi.id) 
                    THEN NOT EXISTS (SELECT 1 FROM pressing_records WHERE order_item_id = oi.id AND is_reported = false)
                    WHEN NOT EXISTS (SELECT 1 FROM pressing_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NOT NULL)
                         AND EXISTS (SELECT 1 FROM pressing_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NULL)
                    THEN NOT EXISTS (SELECT 1 FROM pressing_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NULL AND is_reported = false)
                    ELSE false
                END,
                false
            ) AS press_done,
            COALESCE(
                CASE 
                    WHEN EXISTS (SELECT 1 FROM sewing_records WHERE order_item_id = oi.id) 
                    THEN NOT EXISTS (
                        SELECT 1 FROM sewing_records sr
                        WHERE sr.order_item_id = oi.id
                          AND (
                              (sr.contractor_id IS NULL AND NOT EXISTS (
                                  SELECT 1 FROM finishing_records fr 
                                  WHERE fr.sewing_record_id = sr.id AND fr.is_completed = true
                              ))
                              OR
                              (sr.contractor_id IS NOT NULL AND NOT EXISTS (
                                  SELECT 1 FROM qc_checklist_answers qca 
                                  WHERE qca.sewing_record_id = sr.id
                              ))
                          )
                    )
                    WHEN NOT EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NOT NULL)
                         AND EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NULL)
                    THEN NOT EXISTS (
                        SELECT 1 FROM sewing_records sr
                        WHERE sr.dht_order_id = oi.dht_order_id AND sr.order_item_id IS NULL
                          AND (
                              (sr.contractor_id IS NULL AND NOT EXISTS (
                                  SELECT 1 FROM finishing_records fr 
                                  WHERE fr.sewing_record_id = sr.id AND fr.is_completed = true
                              ))
                              OR
                              (sr.contractor_id IS NOT NULL AND NOT EXISTS (
                                  SELECT 1 FROM qc_checklist_answers qca 
                                  WHERE qca.sewing_record_id = sr.id
                              ))
                          )
                    )
                    ELSE false
                END,
                false
            ) AS sew_done,
            COALESCE(
                CASE 
                    WHEN EXISTS (SELECT 1 FROM finishing_records fr JOIN sewing_records sr ON fr.sewing_record_id = sr.id WHERE sr.order_item_id = oi.id) 
                    THEN NOT EXISTS (
                        SELECT 1 FROM finishing_records fr 
                        JOIN sewing_records sr ON fr.sewing_record_id = sr.id 
                        WHERE sr.order_item_id = oi.id
                          AND (
                              NOT EXISTS (
                                  SELECT 1 FROM qc_checklist_answers qca 
                                  WHERE qca.sewing_record_id = fr.sewing_record_id
                              )
                              OR
                              (sr.contractor_id IS NULL AND fr.is_completed = false)
                          )
                    )
                    WHEN NOT EXISTS (SELECT 1 FROM finishing_records fr JOIN sewing_records sr ON fr.sewing_record_id = sr.id WHERE fr.dht_order_id = oi.dht_order_id AND sr.order_item_id IS NOT NULL)
                         AND EXISTS (SELECT 1 FROM finishing_records fr JOIN sewing_records sr ON fr.sewing_record_id = sr.id WHERE fr.dht_order_id = oi.dht_order_id AND sr.order_item_id IS NULL)
                    THEN NOT EXISTS (
                        SELECT 1 FROM finishing_records fr 
                        JOIN sewing_records sr ON fr.sewing_record_id = sr.id 
                        WHERE fr.dht_order_id = oi.dht_order_id AND sr.order_item_id IS NULL
                          AND (
                              NOT EXISTS (
                                  SELECT 1 FROM qc_checklist_answers qca 
                                  WHERE qca.sewing_record_id = fr.sewing_record_id
                              )
                              OR
                              (sr.contractor_id IS NULL AND fr.is_completed = false)
                          )
                    )
                    ELSE false
                END,
                false
            ) AS finish_done
        FROM dht_order_items oi
        WHERE oi.dht_order_id = ANY($1::int[])
          AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiết kế%'
          AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiet ke%'
          AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiết kế%'
          AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiet ke%'
    `, [orderIds]);

    const itemsByOrderId = {};
    for (const item of items) {
        if (!itemsByOrderId[item.dht_order_id]) {
            itemsByOrderId[item.dht_order_id] = [];
        }
        itemsByOrderId[item.dht_order_id].push(item);
    }

    return orders.map(o => _processOrderWithItems(o, itemsByOrderId[o.id] || [], todayStr));
}

function _buildItemTimeline(item, isShipped, order, itemCutting, itemPrinting, itemPressing, itemSewing, itemFinishing, prodSteps, itemSchedule = null, itemReports = []) {
    const isPrintRecDone = p => p.contractor_id ? true : p.is_print_done;
    const allPrintDone = itemPrinting.length > 0 && itemPrinting.every(isPrintRecDone);
    const completedPrints = itemPrinting
        .filter(isPrintRecDone)
        .map(p => ({
            time: p.contractor_id ? p.created_at : p.print_done_at,
            worker: p.contractor_id ? 'In Gia Công' : p.printer_name
        }));
    const lastPrint = completedPrints.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))[0];
    const printWorker = lastPrint ? lastPrint.worker : null;
    const printTime = lastPrint ? lastPrint.time : null;
    const printFields = [...new Set(itemPrinting.map(p => p.print_field).filter(Boolean))].join(', ') || null;
    const printDoneCount = itemPrinting.filter(isPrintRecDone).length;
    const printTotalCount = itemPrinting.length;
    const printProgress = printTotalCount > 0 ? `${printDoneCount}/${printTotalCount}` : null;

    const pressDoneCount = itemPressing.filter(p => p.is_reported).length;
    const pressTotalCount = itemPressing.length;
    const pressProgress = pressTotalCount > 0 ? `${pressDoneCount}/${pressTotalCount}` : null;
    const allPressDone = pressTotalCount > 0 && itemPressing.every(p => p.is_reported);
    const donePresses = itemPressing.filter(p => p.is_reported && p.reported_at);
    const pressTime = donePresses.length > 0 ? new Date(Math.max(...donePresses.map(p => new Date(p.reported_at).getTime()))) : null;
    const pressWorker = [...new Set(itemPressing.map(p => p.presser_name).filter(Boolean))].join(', ') || null;

    let requiredStepIds = null;
    if (item.required_steps) {
        requiredStepIds = new Set(item.required_steps.split(',').map(Number));
    }
    const catName = (order.category_name || '').toUpperCase();
    const code = (order.order_code || '').toUpperCase();
    const isPetTem = catName === 'PET' || catName === 'TEM' || code.includes('PET') || code.includes('TEM');

    if (!requiredStepIds) {
        if (isPetTem) {
            requiredStepIds = new Set([3]);
        } else {
            requiredStepIds = new Set([1, 2, 3, 4, 5, 6, 7]);
        }
    }

    const needsCut = requiredStepIds.has(2);
    const needsPrint = requiredStepIds.has(3);
    let needsPress = requiredStepIds.has(4);
    if (item.has_any_printing && !isPetTem) {
        needsPress = !!item.has_press_printing;
    }
    const needsSew = requiredStepIds.has(5);
    const needsFinishing = requiredStepIds.has(6) || requiredStepIds.has(7);

    let timeline;
    if (isPetTem) {
        const printStep = prodSteps.find(s => s.step_id === 3);
        const printDone = allPrintDone || (printStep?.is_completed || false);
        timeline = [
            { name: 'In', short: 'IN', done: printDone, time: printTime || printStep?.completed_at, worker: printWorker || printStep?.completed_by_name, extra: printFields, progress: printProgress },
            { name: 'Gửi Hàng', short: 'GỬI', done: isShipped, time: order.shipped_at, worker: order.shipped_by_name }
        ];
    } else {
        const cutDoneCount = itemCutting.filter(c => c.is_cut_done).length;
        const cutTotalCount = itemCutting.length;
        const cutProgress = cutTotalCount > 0 ? `${cutDoneCount}/${cutTotalCount}` : null;
        const allCutDone = cutTotalCount > 0 && itemCutting.every(c => c.is_cut_done);

        const doneCuts = itemCutting.filter(c => c.is_cut_done && c.cut_done_at);
        const cutTime = doneCuts.length > 0 ? new Date(Math.max(...doneCuts.map(c => new Date(c.cut_done_at).getTime()))) : null;
        const cutWorker = [...new Set(itemCutting.map(c => c.cutter_name).filter(Boolean))].join(', ') || null;

        const printStep = prodSteps.find(s => s.step_id === 3);
        const pressStep = prodSteps.find(s => s.step_id === 4);
        const sewRec = itemSewing.find(s => s.done_date);
        const finRec = itemFinishing.find(f => f.is_completed);

        const printDone = allPrintDone || (printStep?.is_completed || false);
        const pressDone = pressTotalCount > 0 ? allPressDone : (pressStep?.is_completed || false);
        const pressDisplayTime = pressTotalCount > 0 ? pressTime : pressStep?.completed_at;
        const pressDisplayWorker = pressTotalCount > 0 ? pressWorker : pressStep?.completed_by_name;

        for (const s of itemSewing) {
            if (s.contractor_id === null) {
                const finishRow = itemFinishing.find(f => f.sewing_record_id === s.id && f.is_completed);
                s.done_date = finishRow ? finishRow.completed_at : null;
            } else {
                s.done_date = s.qc_date;
            }
        }

        const sewDoneCount = itemSewing.filter(s => s.done_date).length;
        const sewTotalCount = itemSewing.length;
        const sewProgress = sewTotalCount > 0 ? `${sewDoneCount}/${sewTotalCount}` : null;
        const allSewDone = sewTotalCount > 0 && itemSewing.every(s => s.done_date);
        const doneSewings = itemSewing.filter(s => s.done_date);
        const sewTime = doneSewings.length > 0 ? new Date(Math.max(...doneSewings.map(s => new Date(s.done_date).getTime()))) : null;
        const sewWorker = [...new Set(itemSewing.map(s => s.sewer_name || s.contractor_name || s.team_name).filter(Boolean))].join(', ') || null;

        const sewDone = sewTotalCount > 0 ? allSewDone : (sewRec ? true : false);
        const sewDisplayTime = sewTotalCount > 0 ? sewTime : sewRec?.done_date;
        const sewDisplayWorker = sewTotalCount > 0 ? sewWorker : (sewRec?.sewer_name || sewRec?.contractor_name || sewRec?.team_name);

        const qcDoneCount = itemSewing.filter(s => s.qc_count > 0).length;
        const qcTotalCount = itemSewing.length;
        const qcProgress = qcTotalCount > 0 ? `${qcDoneCount}/${qcTotalCount}` : null;
        const allQcDone = qcTotalCount > 0 && itemSewing.every(s => s.qc_count > 0);
        const lastQcDone = itemSewing.filter(s => s.qc_count > 0).sort((a,b) => new Date(b.qc_date || 0) - new Date(a.qc_date || 0))[0];
        const qcTime = lastQcDone ? lastQcDone.qc_date : null;
        const qcWorker = [...new Set(itemSewing.map(s => s.qc_by_name).filter(Boolean))].join(', ') || null;

        const qcDone = qcTotalCount > 0 ? allQcDone : false;
        const qcDisplayTime = qcTotalCount > 0 ? qcTime : null;
        const qcDisplayWorker = qcTotalCount > 0 ? qcWorker : null;

        const isOrderShipped = !!order.delivery_date;
        const checkFDone = f => {
            if (isOrderShipped) return f.is_completed;
            const isQcDone = f.qc_count > 0;
            const isOutsourced = f.contractor_id !== null;
            return isOutsourced ? isQcDone : (isQcDone && f.is_completed);
        };

        const htDoneCount = itemFinishing.filter(checkFDone).length;
        const htTotalCount = itemFinishing.length;
        const htProgress = htTotalCount > 0 ? `${htDoneCount}/${htTotalCount}` : null;
        const allHtDone = htTotalCount > 0 && itemFinishing.every(checkFDone);
        const lastHtDone = itemFinishing.filter(checkFDone).sort((a,b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))[0];
        const htTime = lastHtDone ? lastHtDone.completed_at : null;
        const htWorker = [...new Set(itemFinishing.map(f => f.finisher_name).filter(Boolean))].join(', ') || null;

        const htDone = htTotalCount > 0 ? allHtDone : (finRec?.is_completed || false);
        const htDisplayTime = htTotalCount > 0 ? htTime : finRec?.completed_at;
        const htDisplayWorker = htTotalCount > 0 ? htWorker : finRec?.finisher_name;

        timeline = [];
        if (needsCut) timeline.push({ name: 'Cắt', short: 'CẮT', done: allCutDone, time: cutTime, worker: cutWorker, progress: cutProgress });
        if (needsPrint) timeline.push({ name: 'In', short: 'IN', done: printDone, time: printTime || printStep?.completed_at, worker: printWorker || printStep?.completed_by_name, extra: printFields, progress: printProgress });
        if (needsPress) timeline.push({ name: 'Ép', short: 'ÉP', done: pressDone, time: pressDisplayTime, worker: pressDisplayWorker, progress: pressProgress });
        if (needsSew) timeline.push({ name: 'May', short: 'MAY', done: sewDone, time: sewDisplayTime, worker: sewDisplayWorker, progress: sewProgress });
        timeline.push({ name: 'Kiểm Tra CL', short: 'QC', done: qcDone, time: qcDisplayTime, worker: qcDisplayWorker, progress: qcProgress });
        if (needsFinishing) timeline.push({ name: 'Hoàn Thiện', short: 'HT', done: htDone, time: htDisplayTime, worker: htDisplayWorker, progress: htProgress });
        timeline.push({ name: 'Gửi Hàng', short: 'GỬI', done: isShipped, time: order.shipped_at, worker: order.shipped_by_name });
    }

    if (timeline) {
        timeline.forEach(step => {
            let stepNameKey = null;
            if (step.name === 'Cắt') stepNameKey = 'cat';
            else if (step.name === 'In') stepNameKey = 'in';
            else if (step.name === 'Ép') stepNameKey = 'ep';
            else if (step.name === 'May' || step.name === 'Kiểm Tra CL' || step.name === 'Hoàn Thiện') stepNameKey = 'may_qc_ht';
            else if (step.name === 'Gửi Hàng') stepNameKey = 'gui';

            if (stepNameKey) {
                if (itemSchedule) {
                    if (stepNameKey === 'cat') step.schedule_at = itemSchedule.cut_expected_at;
                    else if (stepNameKey === 'in') step.schedule_at = itemSchedule.in_expected_at;
                    else if (stepNameKey === 'ep') step.schedule_at = itemSchedule.ep_expected_at;
                    else if (stepNameKey === 'may_qc_ht') step.schedule_at = itemSchedule.may_qc_ht_expected_at;
                    else if (stepNameKey === 'gui') step.schedule_at = itemSchedule.gui_expected_at;
                }
                
                if (itemReports && itemReports.length > 0) {
                    step.reports = itemReports.filter(r => r.step_name === stepNameKey);
                } else {
                    step.reports = [];
                }
            } else {
                step.reports = [];
            }
        });
    }

    return timeline;
}

