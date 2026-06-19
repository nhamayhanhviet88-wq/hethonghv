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

// Helper: build TM cashflow code  TM1-15-5-Y26
function _buildTMCode(seq, date) {
    const d = new Date(date);
    const dd = d.getDate();
    const mm = d.getMonth() + 1;
    const yy = d.getFullYear().toString().slice(-2);
    return `TM${seq}-${dd}-${mm}-Y${yy}`;
}

// Helper: get next TM seq (shared with cashflow + payment_records)
async function _getNextTMSeq(cfDate) {
    const prRow = await db.get(
        `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM payment_records WHERE payment_date = $1 AND payment_method = 'TM'`,
        [cfDate]
    );
    const cfRow = await db.get(
        `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM cashflow_records WHERE cashflow_date = $1 AND cashflow_code LIKE 'TM%'`,
        [cfDate]
    );
    return Math.max(Number(prRow.max_seq), Number(cfRow.max_seq)) + 1;
}

// Helper: get item-level progress for orders
async function _getShippingItemsProgress(orderIds) {
    if (!orderIds || !orderIds.length) return [];
    
    const items = await db.all(`
        SELECT 
            oi.id AS item_id,
            oi.dht_order_id,
            oi.product_name,
            oi.description,
            oi.quantity,
            oi.accounting_notes,
            COALESCE(oi.shipping_status, 'pending') AS shipping_status,
            oi.shipped_at,
            oi.shipped_by,
            oi.shipping_date,
            oi.actual_carrier_id,
            oi.tracking_code,
            oi.shipping_bill_link,
            oi.carrier_phone,
            oi.receiver_name,
            oi.shipping_fee,
            oi.shipping_fee_payer,
            oi.shipping_fee_method,
            cr.name AS actual_carrier_name,
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
            ) AS finish_done,
            COALESCE(
                CASE
                    WHEN EXISTS (SELECT 1 FROM sewing_records WHERE order_item_id = oi.id)
                    THEN NOT EXISTS (
                        SELECT 1 FROM sewing_records sr
                        WHERE sr.order_item_id = oi.id
                          AND NOT EXISTS (SELECT 1 FROM qc_checklist_answers qca WHERE qca.sewing_record_id = sr.id)
                    )
                    WHEN NOT EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NOT NULL)
                         AND EXISTS (SELECT 1 FROM sewing_records WHERE dht_order_id = oi.dht_order_id AND order_item_id IS NULL)
                    THEN NOT EXISTS (
                        SELECT 1 FROM sewing_records sr
                        WHERE sr.dht_order_id = oi.dht_order_id AND sr.order_item_id IS NULL
                          AND NOT EXISTS (SELECT 1 FROM qc_checklist_answers qca WHERE qca.sewing_record_id = sr.id)
                    )
                    ELSE false
                END,
                false
            ) AS qc_done
        FROM dht_order_items oi
        LEFT JOIN dht_carriers cr ON oi.actual_carrier_id = cr.id
        WHERE oi.dht_order_id = ANY($1::int[])
          AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiết kế%'
          AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiet ke%'
          AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiết kế%'
          AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiet ke%'
        ORDER BY oi.dht_order_id, oi.id
    `, [orderIds]);

    return items;
}

function _processShippingOrderItems(order, itemsList, isPetTem) {
    let orderItems = itemsList.filter(item => item.dht_order_id === order.id);
    if (!orderItems.length) {
        orderItems = [{
            item_id: null,
            dht_order_id: order.id,
            product_name: order.order_code,
            description: order.order_code,
            quantity: order.total_quantity || 0,
            accounting_notes: '',
            shipping_status: order.shipping_status === 'shipped' ? 'shipped' : 'pending',
            shipped_at: order.shipped_at,
            shipped_by: order.shipped_by,
            shipping_date: order.shipping_date,
            actual_carrier_id: order.actual_carrier_id,
            actual_carrier_name: order.actual_carrier_name,
            tracking_code: order.tracking_code,
            shipping_bill_link: order.shipping_bill_link,
            carrier_phone: order.carrier_phone,
            receiver_name: order.receiver_name,
            shipping_fee: order.shipping_fee,
            shipping_fee_payer: order.shipping_fee_payer,
            shipping_fee_method: order.shipping_fee_method,
            required_steps: null,
            cut_done: true,
            print_done: true,
            press_done: true,
            sew_done: true,
            finish_done: true,
            qc_done: true
        }];
    }
    
    return orderItems.map(item => {
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
        const qcDone = !needsSew || item.qc_done; // QC is tied to Sewing
        const finishDone = !needsFinishing || item.finish_done;

        const allDone = cutDone && printDone && pressDone && sewDone && qcDone && finishDone;
        
        const missingSteps = [];
        if (!cutDone) missingSteps.push('Cắt');
        if (!printDone) missingSteps.push('In');
        if (!pressDone) missingSteps.push('Ép');
        if (!sewDone) missingSteps.push('May');
        if (!qcDone) missingSteps.push('Kiểm Tra QC');
        if (!finishDone) missingSteps.push('Hoàn Thiện');

        return {
            ...item,
            needs_cut: needsCut,
            needs_print: needsPrint,
            needs_press: needsPress,
            needs_sew: needsSew,
            needs_finishing: needsFinishing,
            cut_done: cutDone,
            print_done: printDone,
            press_done: pressDone,
            sew_done: sewDone,
            qc_done: qcDone,
            finish_done: finishDone,
            all_done: allDone,
            missing_steps: missingSteps
        };
    });
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
            if (!kt && page_type !== 'qlx') {
                visibilityFilter = ` AND (o.created_by = $${idx} OR o.cskh_user_id = $${idx})`;
                params.push(userId);
                idx++;
            }
        }

        // Helper: get the maxDate for QLX today processing orders based on limitVal
        async function getQlxMaxDate(todayStr) {
            let limitVal = 1; // Default is just "Hôm nay"
            const row = await db.get("SELECT value FROM app_config WHERE key = 'qlx_processing_days_limit'");
            if (row && row.value) {
                const parsed = parseInt(row.value, 10);
                if (!isNaN(parsed) && parsed > 0) {
                    limitVal = parsed;
                }
            }
            
            if (limitVal <= 1) return todayStr;
            
            // Fetch all holidays
            const holidaysRows = await db.all("SELECT holiday_date FROM holidays");
            const holidaysSet = new Set(holidaysRows.map(h => {
                if (h.holiday_date instanceof Date) {
                    return vnDateStr(h.holiday_date);
                }
                return String(h.holiday_date).split('T')[0].split(' ')[0];
            }));
            
            const validDates = [];
            let checkDate = new Date(todayStr + 'T00:00:00+07:00');
            let safety = 0;
            while (validDates.length < limitVal && safety < 100) {
                safety++;
                const y = checkDate.getFullYear();
                const m = String(checkDate.getMonth() + 1).padStart(2, '0');
                const d = String(checkDate.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${d}`;
                const dayOfWeek = checkDate.getDay();
                const isSunday = dayOfWeek === 0;
                const isHoliday = holidaysSet.has(dateStr);
                
                if (!isSunday && !isHoliday) {
                    validDates.push(dateStr);
                }
                checkDate.setDate(checkDate.getDate() + 1);
            }
            
            if (validDates.length > 0) {
                return validDates[validDates.length - 1];
            }
            return todayStr;
        }

        // Build filter condition using effective_ship_date
        let filterWhere = '';
        let orderBy = 'o.created_at DESC';

        const todayStr = vnDateStr(vnNow());
        let targetDateStr = todayStr;
        if (page_type === 'qlx') {
            targetDateStr = await getQlxMaxDate(todayStr);
        }

        switch (filter) {
            case 'early':
                if (page_type === 'qlx') {
                    filterWhere = ` AND o.shipping_status = 'pending' AND o.expected_ship_date IS NOT NULL AND o.expected_ship_date > $${idx}::date`;
                } else {
                    filterWhere = ` AND o.shipping_status = 'pending' AND o.expected_ship_date IS NOT NULL AND COALESCE(o.rescheduled_ship_date, o.expected_ship_date) > $${idx}::date`;
                }
                params.push(targetDateStr);
                idx++;
                orderBy = 'COALESCE(o.rescheduled_ship_date, o.expected_ship_date) ASC';
                break;

            case 'today':
                if (page_type === 'qlx') {
                    filterWhere = ` AND (
                        (o.shipping_status = 'pending' AND o.expected_ship_date IS NOT NULL AND o.expected_ship_date <= $${idx}::date)
                        OR
                        (o.shipping_status = 'rescheduled' AND o.rescheduled_ship_date IS NOT NULL AND o.rescheduled_ship_date <= $${idx+1}::date)
                    )`;
                    params.push(targetDateStr, targetDateStr);
                    idx += 2;
                } else {
                    filterWhere = ` AND o.shipping_status IN ('pending','rescheduled') AND o.expected_ship_date IS NOT NULL AND COALESCE(o.rescheduled_ship_date, o.expected_ship_date) <= $${idx}::date`;
                    params.push(targetDateStr);
                    idx++;
                }
                orderBy = 'COALESCE(o.rescheduled_ship_date, o.expected_ship_date) ASC';
                break;

            case 'rescheduled':
                if (page_type === 'qlx') {
                    filterWhere = ` AND o.shipping_status = 'rescheduled' AND o.rescheduled_ship_date > $${idx}::date`;
                    params.push(targetDateStr);
                } else {
                    filterWhere = ` AND o.shipping_status = 'rescheduled' AND o.rescheduled_ship_date > $${idx}::date`;
                    params.push(targetDateStr);
                }
                idx++;
                orderBy = 'o.rescheduled_ship_date ASC';
                break;

            case 'shipped':
                filterWhere = ` AND o.shipping_status = 'shipped'`;
                orderBy = 'o.shipped_at DESC NULLS LAST, o.shipping_date DESC NULLS LAST';
                break;

            case 'all':
                // Return ALL orders (no status/date filter) for client-side filtering
                filterWhere = ``;
                orderBy = 'o.expected_ship_date DESC NULLS LAST, o.created_at DESC';
                break;

            default:
                filterWhere = ` AND o.expected_ship_date IS NOT NULL`;
                orderBy = 'o.expected_ship_date DESC';
        }

        const orders = await db.all(`
            SELECT o.id, o.order_code, o.order_date, o.expected_ship_date,
                o.rescheduled_ship_date, o.rescheduled_ship_hour, o.rescheduled_ship_minute, o.reschedule_reason,
                o.shipping_status, o.shipping_priority, o.delivery_progress,
                o.customer_name, o.customer_phone, o.province, o.address,
                o.tracking_code, o.carrier_phone, o.shipping_bill_link,
                o.completion_images, o.actual_ship_datetime,
                o.shipped_by, o.shipped_at, o.total_amount,
                o.carrier_id, o.actual_carrier_id, o.is_pending_update,
                o.created_by, o.cskh_user_id,
                o.sale_note_for_accountant, o.shipping_fee,
                o.shipping_fee_payer, o.shipping_fee_method, o.receiver_name,
                o.discount_amount, o.has_vat, o.vat_amount,
                o.deposit_amount_cache,
                o.carrier_extra, o.notes, o.standard_delivery_time, o.standard_proof_image, o.category_id,
                cr.name AS carrier_name,
                cr2.name AS actual_carrier_name,
                cr2.tracking_url_template AS actual_carrier_tracking_url,
                u_cskh.full_name AS cskh_name,
                u_created.full_name AS created_by_name,
                u_shipped.full_name AS shipped_by_name,
                COALESCE(o.rescheduled_ship_date, o.expected_ship_date) AS effective_ship_date,
                CASE WHEN o.shipping_status IN ('pending','rescheduled')
                     AND COALESCE(o.rescheduled_ship_date, o.expected_ship_date) < $${idx}::date
                     THEN true ELSE false END AS is_overdue,
                GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) AS deposit_amount,
                GREATEST(0, COALESCE(o.total_amount, 0) - COALESCE(o.discount_amount, 0) - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) - (CASE WHEN EXISTS (SELECT 1 FROM payment_records pr WHERE (pr.total_order_codes ILIKE '%' || o.order_code || '%' OR pr.order_tt_coc = o.order_code) AND pr.money_source = 'nha_van_chuyen') THEN 0 ELSE COALESCE((SELECT SUM(COALESCE(os.shipping_fee, 0)) FROM dht_order_shipments os WHERE os.dht_order_id = o.id AND os.shipping_fee_payer = 'hv' AND os.shipping_fee_method = 'ck' AND (os.tracking_code IS NULL OR os.tracking_code = '')), CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' AND (o.tracking_code IS NULL OR o.tracking_code = '') THEN COALESCE(o.shipping_fee, 0) ELSE 0 END) END)) AS remaining_amount
            FROM dht_orders o
            LEFT JOIN dht_carriers cr ON o.carrier_id = cr.id
            LEFT JOIN dht_carriers cr2 ON o.actual_carrier_id = cr2.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN users u_shipped ON o.shipped_by = u_shipped.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                   OR order_tt_coc = o.order_code
            ) pr_dep ON true
            WHERE o.expected_ship_date IS NOT NULL
            ${visibilityFilter}
            ${filterWhere}
            ORDER BY ${orderBy}
        `, [...params, todayStr]);

        // Fetch item progress and attach to orders
        const orderIds = orders.map(o => o.id);
        const itemsList = await _getShippingItemsProgress(orderIds);
        for (const o of orders) {
            const code = (o.order_code || '').toUpperCase();
            const isPetTem = Number(o.category_id) === 8 || Number(o.category_id) === 9 || code.includes('PET') || code.includes('TEM');
            o.items = _processShippingOrderItems(o, itemsList, isPetTem);
        }

        const todayParam = todayStr;
        // ------------------ SAMPLE ORDERS (don_gui_ao_mau) MERGING ------------------
        let mappedSampleOrders = [];
        if (page_type !== 'qlx') {
            let sampleWhere = '';
            const sampleParams = [];

            if (!FULL_VIEW_ROLES.includes(userRole)) {
                const kt = await isKeToan(userId);
                if (!kt) {
                    sampleWhere += ` AND d.created_by = $1`;
                    sampleParams.push(userId);
                }
            }

        let todayIdx = sampleParams.length + 1;
        if (filter === 'early') {
            sampleWhere += ` AND d.status_gui_don = false AND d.approval_date < d.ship_date AND $${todayIdx}::date < d.ship_date`;
            sampleParams.push(todayParam);
        } else if (filter === 'today') {
            sampleWhere += ` AND d.status_gui_don = false AND (d.approval_date >= d.ship_date OR $${todayIdx}::date >= d.ship_date)`;
            sampleParams.push(todayParam);
        } else if (filter === 'rescheduled') {
            sampleWhere += ` AND 1=0`; // sample orders do not support rescheduling
        } else if (filter === 'shipped') {
            sampleWhere += ` AND d.status_gui_don = true`;
        } else if (filter === 'all') {
            sampleWhere += ``;
        }

        const sampleOrdersRows = await db.all(`
            SELECT 
                d.id,
                d.sample_order_code AS order_code,
                d.order_date,
                d.ship_date AS expected_ship_date,
                d.order_status,
                d.status_gui_don,
                d.shipping_priority,
                d.customer_name,
                d.customer_phone,
                d.province,
                d.address,
                d.tracking_code,
                NULL AS carrier_phone,
                d.shipping_bill_link,
                d.shipped_by,
                d.shipped_at,
                d.total_amount,
                d.actual_carrier_id,
                d.is_pending_update,
                d.created_by,
                d.sale_note_for_accountant,
                d.shipping_fee,
                d.shipping_fee_payer,
                d.shipping_fee_method,
                d.approval_date,
                d.approved_at,
                d.quantity,
                d.product_name,
                d.category,
                d.linh_vuc,
                d.deposit_amount,
                d.price AS price_per_item,
                d.shipping_method,
                d.ship_time,
                cr.name AS actual_carrier_name,
                cr.tracking_url_template AS actual_carrier_tracking_url,
                u_created.full_name AS created_by_name,
                u_shipped.full_name AS shipped_by_name,
                GREATEST(0, COALESCE(d.total_amount, 0) - COALESCE(pr_all.paid_total, 0) - CASE WHEN d.shipping_fee_payer = 'hv' AND d.shipping_fee_method = 'ck' AND (d.tracking_code IS NULL OR d.tracking_code = '') AND NOT EXISTS (SELECT 1 FROM payment_records pr WHERE pr.order_ao_mau = d.sample_order_code AND pr.money_source = 'nha_van_chuyen') THEN COALESCE(d.shipping_fee, 0) ELSE 0 END) AS remaining_amount
            FROM don_gui_ao_mau d
            LEFT JOIN dht_carriers cr ON d.actual_carrier_id = cr.id
            LEFT JOIN users u_created ON d.created_by = u_created.id
            LEFT JOIN users u_shipped ON d.shipped_by = u_shipped.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS paid_total
                FROM payment_records
                WHERE order_ao_mau = d.sample_order_code
            ) pr_all ON true
            WHERE d.status_duyet = true AND (d.status_hoan_hang IS NOT TRUE OR d.status_hoan_hang = false)
            ${sampleWhere}
            ORDER BY d.ship_date DESC NULLS LAST, d.created_at DESC
        `, sampleParams);

         const mappedSampleOrders = sampleOrdersRows.map(row => {
             const isShipped = row.status_gui_don === true || row.order_status === 'da_gui' || row.order_status === 'hoan_thanh';
             return {
                 id: 'sample_' + row.id,
                 order_code: row.order_code,
                 order_date: row.order_date,
                 expected_ship_date: row.expected_ship_date,
                 rescheduled_ship_date: null,
                 reschedule_reason: null,
                 shipping_status: isShipped ? 'shipped' : 'pending',
                 shipping_priority: row.shipping_priority || 'Chuẩn',
                 delivery_progress: null,
                 customer_name: row.customer_name,
                 customer_phone: row.customer_phone,
                 province: row.province,
                 address: row.address,
                 tracking_code: row.tracking_code,
                 carrier_phone: row.carrier_phone,
                 shipping_bill_link: row.shipping_bill_link,
                 shipped_by: row.shipped_by,
                 shipped_at: row.shipped_at,
                 total_amount: row.total_amount,
                 carrier_id: null,
                 actual_carrier_id: row.actual_carrier_id,
                 created_by: row.created_by,
                 cskh_user_id: row.created_by,
                 sale_note_for_accountant: row.sale_note_for_accountant,
                 shipping_fee: row.shipping_fee,
                 shipping_fee_payer: row.shipping_fee_payer,
                 shipping_fee_method: row.shipping_fee_method,
                 receiver_name: row.customer_name,
                 discount_amount: 0,
                 has_vat: false,
                 vat_amount: 0,
                 deposit_amount_cache: row.deposit_amount,
                 carrier_extra: null,
                 notes: row.sale_note_for_accountant,
                 standard_delivery_time: row.ship_time || null,
                 standard_proof_image: null,
                 category_id: null,
                 carrier_name: row.shipping_method || null,
                 actual_carrier_name: row.actual_carrier_name,
                 actual_carrier_tracking_url: row.actual_carrier_tracking_url,
                 cskh_name: row.created_by_name,
                 created_by_name: row.created_by_name,
                 shipped_by_name: row.shipped_by_name,
                 effective_ship_date: row.expected_ship_date,
                 is_overdue: !isShipped && row.expected_ship_date && new Date(row.expected_ship_date) < new Date(todayStr),
                 deposit_amount: row.deposit_amount || 0,
                 remaining_amount: row.remaining_amount,
                 is_pending_update: !!row.is_pending_update,
                 items: [{
                     item_id: 'sample_item_' + row.id,
                     dht_order_id: 'sample_' + row.id,
                     product_name: row.product_name || 'Áo mẫu',
                     description: `Lĩnh vực: ${row.linh_vuc || '—'} | Thể loại: ${row.category || '—'}`,
                     category: row.category || 'Gửi mẫu áo',
                     linh_vuc: row.linh_vuc || '—',
                     quantity: row.quantity || 1,
                     price_per_item: row.price_per_item || 0,
                     total_amount: row.total_amount || 0,
                     accounting_notes: '',
                     shipping_status: isShipped ? 'shipped' : 'pending',
                     shipped_at: row.shipped_at,
                     shipped_by: row.shipped_by,
                     shipping_date: row.expected_ship_date,
                     actual_carrier_id: row.actual_carrier_id,
                     actual_carrier_name: row.actual_carrier_name,
                     tracking_code: row.tracking_code,
                     shipping_bill_link: row.shipping_bill_link,
                     carrier_phone: row.carrier_phone,
                     receiver_name: row.customer_name,
                     shipping_fee: row.shipping_fee,
                     shipping_fee_payer: row.shipping_fee_payer,
                     shipping_fee_method: row.shipping_fee_method,
                     cut_done: true,
                     print_done: true,
                     press_done: true,
                     sew_done: true,
                     qc_done: true,
                     finish_done: true,
                     all_done: true,
                     missing_steps: []
                 }]
             };
         });
        }

         // ------------------ RETURN SAMPLE ORDERS ------------------
         let mappedHoanSampleOrders = [];
         if (page_type !== 'qlx') {
             let hoanWhere = '';
             const hoanParams = [];
             if (!FULL_VIEW_ROLES.includes(userRole)) {
                 const kt = await isKeToan(userId);
                 if (!kt) {
                     hoanWhere += ` AND d.created_by = $1`;
                     hoanParams.push(userId);
                 }
             }
         let hoanTodayIdx = hoanParams.length + 1;
         if (filter === 'early') {
             hoanWhere += ` AND d.status_hoan_hang = true AND d.status_gui_don_hoan = false AND $${hoanTodayIdx}::date < d.hoan_hang_ship_date`;
             hoanParams.push(todayParam);
         } else if (filter === 'today') {
             hoanWhere += ` AND d.status_hoan_hang = true AND d.status_gui_don_hoan = false AND $${hoanTodayIdx}::date >= d.hoan_hang_ship_date`;
             hoanParams.push(todayParam);
         } else if (filter === 'rescheduled') {
             hoanWhere += ` AND 1=0`;
         } else if (filter === 'shipped') {
             hoanWhere += ` AND d.status_gui_don_hoan = true`;
         } else if (filter === 'all') {
             hoanWhere += ` AND d.status_hoan_hang = true`;
         }

         let hoanSampleOrdersRows = [];
         if (filter !== 'rescheduled') {
             hoanSampleOrdersRows = await db.all(`
                 SELECT 
                     d.id,
                     d.sample_order_code AS order_code,
                     d.order_date,
                     d.hoan_hang_ship_date AS expected_ship_date,
                     d.order_status,
                     d.status_gui_don_hoan,
                     d.hoan_hang_shipping_priority AS shipping_priority,
                     d.customer_name,
                     d.customer_phone,
                     d.province,
                     d.address,
                     d.hoan_hang_tracking_code AS tracking_code,
                     NULL AS carrier_phone,
                     d.hoan_hang_shipping_bill_link AS shipping_bill_link,
                     d.hoan_hang_shipped_by AS shipped_by,
                     d.hoan_hang_shipped_at AS shipped_at,
                     d.total_amount,
                     d.hoan_hang_actual_carrier_id AS actual_carrier_id,
                     d.hoan_hang_is_pending_update AS is_pending_update,
                     d.created_by,
                     d.hoan_hang_sale_note AS sale_note_for_accountant,
                     d.return_shipping_fee AS shipping_fee,
                     d.return_payer AS shipping_fee_payer,
                     d.return_payment_method AS shipping_fee_method,
                     d.approval_date,
                     d.approved_at,
                     d.quantity,
                     d.product_name,
                     d.category,
                     d.linh_vuc,
                     d.deposit_amount,
                     d.price AS price_per_item,
                     d.hoan_hang_shipping_method AS shipping_method,
                     d.hoan_hang_ship_time AS ship_time,
                     d.hoan_hang_chuan_proof_image AS standard_proof_image,
                     cr.name AS actual_carrier_name,
                     cr.tracking_url_template AS actual_carrier_tracking_url,
                     u_created.full_name AS created_by_name,
                     u_shipped.full_name AS shipped_by_name,
                     GREATEST(0, COALESCE(d.total_amount, 0) - COALESCE(pr_all.paid_total, 0) - CASE WHEN d.return_payer = 'hv' AND d.return_payment_method = 'ck' AND NOT EXISTS (SELECT 1 FROM payment_records pr WHERE pr.order_ao_mau = d.sample_order_code AND pr.money_source = 'nha_van_chuyen') THEN COALESCE(d.return_shipping_fee, 0) ELSE 0 END) AS remaining_amount
                 FROM don_gui_ao_mau d
                 LEFT JOIN dht_carriers cr ON d.hoan_hang_actual_carrier_id = cr.id
                 LEFT JOIN users u_created ON d.created_by = u_created.id
                 LEFT JOIN users u_shipped ON d.hoan_hang_shipped_by = u_shipped.id
                 LEFT JOIN LATERAL (
                     SELECT COALESCE(SUM(amount), 0) AS paid_total
                     FROM payment_records
                     WHERE order_ao_mau = d.sample_order_code
                 ) pr_all ON true
                 WHERE d.status_hoan_hang = true
                 ${hoanWhere}
                 ORDER BY d.hoan_hang_ship_date DESC NULLS LAST, d.created_at DESC
             `, hoanParams);
         }

         const mappedHoanSampleOrders = hoanSampleOrdersRows.map(row => {
             const isShipped = row.status_gui_don_hoan === true;
             return {
                 id: 'sample_hoan_' + row.id,
                 order_code: row.order_code,
                 order_date: row.order_date,
                 expected_ship_date: row.expected_ship_date,
                 rescheduled_ship_date: null,
                 reschedule_reason: null,
                 shipping_status: isShipped ? 'shipped' : 'pending',
                 shipping_priority: row.shipping_priority || 'Chuẩn',
                 delivery_progress: null,
                 customer_name: row.customer_name,
                 customer_phone: row.customer_phone,
                 province: row.province,
                 address: row.address,
                 tracking_code: row.tracking_code,
                 carrier_phone: row.carrier_phone,
                 shipping_bill_link: row.shipping_bill_link,
                 shipped_by: row.shipped_by,
                 shipped_at: row.shipped_at,
                 total_amount: row.total_amount,
                 carrier_id: null,
                 actual_carrier_id: row.actual_carrier_id,
                 created_by: row.created_by,
                 cskh_user_id: row.created_by,
                 sale_note_for_accountant: row.sale_note_for_accountant,
                 shipping_fee: row.shipping_fee,
                 shipping_fee_payer: row.shipping_fee_payer,
                 shipping_fee_method: row.shipping_fee_method,
                 receiver_name: row.customer_name,
                 discount_amount: 0,
                 has_vat: false,
                 vat_amount: 0,
                 deposit_amount_cache: row.deposit_amount,
                 carrier_extra: null,
                 notes: row.sale_note_for_accountant,
                 standard_delivery_time: row.ship_time || null,
                 standard_proof_image: row.standard_proof_image || null,
                 category_id: null,
                 carrier_name: row.shipping_method || null,
                 actual_carrier_name: row.actual_carrier_name,
                 actual_carrier_tracking_url: row.actual_carrier_tracking_url,
                 cskh_name: row.created_by_name,
                 created_by_name: row.created_by_name,
                 shipped_by_name: row.shipped_by_name,
                 effective_ship_date: row.expected_ship_date,
                 is_overdue: !isShipped && row.expected_ship_date && new Date(row.expected_ship_date) < new Date(todayStr),
                 deposit_amount: row.deposit_amount || 0,
                 remaining_amount: row.remaining_amount,
                 is_pending_update: !!row.is_pending_update,
                 is_hoan_hang: true,
                 items: [{
                     item_id: 'sample_hoan_item_' + row.id,
                     dht_order_id: 'sample_hoan_' + row.id,
                     product_name: '🔄 [HOÀN] ' + (row.product_name || 'Áo mẫu'),
                     description: `Lĩnh vực: ${row.linh_vuc || '—'} | Thể loại: ${row.category || '—'}`,
                     category: row.category || 'Gửi mẫu áo',
                     linh_vuc: row.linh_vuc || '—',
                     quantity: row.quantity || 1,
                     price_per_item: row.price_per_item || 0,
                     total_amount: row.total_amount || 0,
                     accounting_notes: '',
                     shipping_status: isShipped ? 'shipped' : 'pending',
                     shipped_at: row.shipped_at,
                     shipped_by: row.shipped_by,
                     shipping_date: row.expected_ship_date,
                     actual_carrier_id: row.actual_carrier_id,
                     actual_carrier_name: row.actual_carrier_name,
                     tracking_code: row.tracking_code,
                     shipping_bill_link: row.shipping_bill_link,
                     carrier_phone: row.carrier_phone,
                     receiver_name: row.customer_name,
                     shipping_fee: row.shipping_fee,
                     shipping_fee_payer: row.shipping_fee_payer,
                     shipping_fee_method: row.shipping_fee_method,
                     cut_done: true,
                     print_done: true,
                     press_done: true,
                     sew_done: true,
                     qc_done: true,
                     finish_done: true,
                     all_done: true,
                     missing_steps: []
                 }]
             };
         });
         }
 
         const combinedOrders = [...orders, ...mappedSampleOrders, ...mappedHoanSampleOrders];

        // Sort combined list: if filter is early/today, sort by expected_ship_date ASC, else by shipped_at DESC
        if (filter === 'early' || filter === 'today') {
            combinedOrders.sort((a, b) => {
                const dateA = a.effective_ship_date ? new Date(a.effective_ship_date) : new Date(0);
                const dateB = b.effective_ship_date ? new Date(b.effective_ship_date) : new Date(0);
                return dateA - dateB;
            });
        } else if (filter === 'shipped') {
            combinedOrders.sort((a, b) => {
                const dateA = a.shipped_at ? new Date(a.shipped_at) : new Date(0);
                const dateB = b.shipped_at ? new Date(b.shipped_at) : new Date(0);
                return dateB - dateA;
            });
        }

        // Count for each filter (for sidebar badges)
        const countTargetDate = page_type === 'qlx' ? targetDateStr : todayParam;
        
        let countVisibilityFilterDht = '';
        const countParamsDht = [countTargetDate];
        const countParamsOverdueDht = [todayParam];
        if (!FULL_VIEW_ROLES.includes(userRole)) {
            const kt = await isKeToan(userId);
            if (!kt) {
                countVisibilityFilterDht = ` AND (created_by = $2 OR cskh_user_id = $2)`;
                countParamsDht.push(userId);
                countParamsOverdueDht.push(userId);
            }
        }

        let counts;
        if (page_type === 'qlx') {
            const paramsList = [countTargetDate];
            let qlxVisibilityFilter = '';
            counts = await db.get(`
                SELECT
                    COUNT(*) FILTER (WHERE shipping_status = 'pending' AND expected_ship_date > $1::date) AS early_count,
                    COUNT(*) FILTER (WHERE 
                        (shipping_status = 'pending' AND expected_ship_date <= $1::date)
                        OR
                        (shipping_status = 'rescheduled' AND rescheduled_ship_date <= $1::date)
                    ) AS today_count,
                    COUNT(*) FILTER (WHERE shipping_status = 'rescheduled' AND rescheduled_ship_date > $1::date) AS rescheduled_count,
                    COUNT(*) FILTER (WHERE shipping_status = 'shipped') AS shipped_count
                FROM dht_orders
                WHERE expected_ship_date IS NOT NULL
                ${qlxVisibilityFilter}
            `, paramsList);
        } else {
            counts = await db.get(`
                SELECT
                    COUNT(*) FILTER (WHERE shipping_status = 'pending' AND COALESCE(rescheduled_ship_date, expected_ship_date) > $1::date) AS early_count,
                    COUNT(*) FILTER (WHERE shipping_status IN ('pending','rescheduled') AND COALESCE(rescheduled_ship_date, expected_ship_date) <= $1::date) AS today_count,
                    COUNT(*) FILTER (WHERE shipping_status = 'rescheduled' AND rescheduled_ship_date > $1::date) AS rescheduled_count,
                    COUNT(*) FILTER (WHERE shipping_status = 'shipped') AS shipped_count
                FROM dht_orders
                WHERE expected_ship_date IS NOT NULL
                ${countVisibilityFilterDht}
            `, countParamsDht);
        }

        let sampleCounts = null;
        let sampleHoanCounts = null;
        let sampleOverdueCount = null;

        if (page_type !== 'qlx') {
            let countVisibilityFilter = '';
            const countParams = [todayParam];
            if (!FULL_VIEW_ROLES.includes(userRole)) {
                const kt = await isKeToan(userId);
                if (!kt) {
                    countVisibilityFilter = ` AND d.created_by = $2`;
                    countParams.push(userId);
                }
            }
            
            sampleCounts = await db.get(`
                SELECT
                    COUNT(*) FILTER (WHERE d.status_gui_don = false AND d.approval_date < d.ship_date AND $1::date < d.ship_date) AS early_count,
                    COUNT(*) FILTER (WHERE d.status_gui_don = false AND (d.approval_date >= d.ship_date OR $1::date >= d.ship_date)) AS today_count,
                    COUNT(*) FILTER (WHERE d.status_gui_don = true) AS shipped_count
                FROM don_gui_ao_mau d
                WHERE d.status_duyet = true AND (d.status_hoan_hang IS NOT TRUE OR d.status_hoan_hang = false)
                ${countVisibilityFilter}
            `, countParams);

            sampleHoanCounts = await db.get(`
                SELECT
                    COUNT(*) FILTER (WHERE d.status_hoan_hang = true AND d.status_gui_don_hoan = false AND $1::date < d.hoan_hang_ship_date) AS early_count,
                    COUNT(*) FILTER (WHERE d.status_hoan_hang = true AND d.status_gui_don_hoan = false AND $1::date >= d.hoan_hang_ship_date) AS today_count,
                    COUNT(*) FILTER (WHERE d.status_gui_don_hoan = true) AS shipped_count
                FROM don_gui_ao_mau d
                WHERE d.status_hoan_hang = true
                ${countVisibilityFilter}
            `, countParams);

            sampleOverdueCount = await db.get(`
                SELECT COUNT(*) AS cnt FROM don_gui_ao_mau d
                WHERE (
                    (d.status_duyet = true AND d.status_gui_don = false AND (d.status_hoan_hang IS NOT TRUE OR d.status_hoan_hang = false) AND d.ship_date < $1::date)
                    OR
                    (d.status_hoan_hang = true AND d.status_gui_don_hoan = false AND d.hoan_hang_ship_date < $1::date)
                )
                ${countVisibilityFilter}
            `, countParams);
        }
        
        const overdueCount = await db.get(`
            SELECT COUNT(*) AS cnt FROM dht_orders
            WHERE shipping_status IN ('pending','rescheduled')
              AND expected_ship_date IS NOT NULL
              AND COALESCE(rescheduled_ship_date, expected_ship_date) < $1::date
              ${countVisibilityFilterDht}
        `, countParamsOverdueDht);

        return {
            orders: combinedOrders,
            counts: {
                early: (Number(counts?.early_count) || 0) + (Number(sampleCounts?.early_count) || 0) + (Number(sampleHoanCounts?.early_count) || 0),
                today: (Number(counts?.today_count) || 0) + (Number(sampleCounts?.today_count) || 0) + (Number(sampleHoanCounts?.today_count) || 0),
                rescheduled: Number(counts?.rescheduled_count) || 0,
                shipped: (Number(counts?.shipped_count) || 0) + (Number(sampleCounts?.shipped_count) || 0) + (Number(sampleHoanCounts?.shipped_count) || 0),
                overdue: (Number(overdueCount?.cnt) || 0) + (Number(sampleOverdueCount?.cnt) || 0)
            },
            max_date: page_type === 'qlx' ? targetDateStr : todayStr
        };
    });

    // ========== CHECK DUP TRACKING CODE ==========
    fastify.get('/api/shipping/check-tracking-dup', { preHandler: [authenticate] }, async (request, reply) => {
        const { code, excludeOrderId } = request.query;
        if (!code) return { duplicate: false };
        const trackingCode = String(code).trim();
        if (!trackingCode) return { duplicate: false };

        let isSample = false;
        let sampleId = 0;
        let dhtOrderId = 0;
        if (excludeOrderId) {
            const excludeStr = String(excludeOrderId);
            if (excludeStr.startsWith('sample_')) {
                isSample = true;
                sampleId = Number(excludeStr.replace('sample_', '')) || 0;
            } else {
                dhtOrderId = Number(excludeStr) || 0;
            }
        }

        let dup = null;
        if (isSample) {
            dup = await db.get(`
                SELECT order_code FROM (
                    SELECT order_code FROM dht_orders WHERE tracking_code = $1
                    UNION
                    SELECT o.order_code FROM dht_order_shipments s
                    JOIN dht_orders o ON s.dht_order_id = o.id
                    WHERE s.tracking_code = $1
                    UNION
                    SELECT sample_order_code AS order_code FROM don_gui_ao_mau WHERE (tracking_code = $1 OR hoan_hang_tracking_code = $1) AND id <> $2
                ) LIMIT 1
            `, [trackingCode, sampleId]);
        } else {
            dup = await db.get(`
                SELECT order_code FROM (
                    SELECT order_code FROM dht_orders WHERE tracking_code = $1 AND id <> $2
                    UNION
                    SELECT o.order_code FROM dht_order_shipments s
                    JOIN dht_orders o ON s.dht_order_id = o.id
                    WHERE s.tracking_code = $1 AND s.dht_order_id <> $2
                    UNION
                    SELECT sample_order_code AS order_code FROM don_gui_ao_mau WHERE (tracking_code = $1 OR hoan_hang_tracking_code = $1)
                ) LIMIT 1
            `, [trackingCode, dhtOrderId]);
        }

        if (dup) {
            return { duplicate: true, order_code: dup.order_code };
        }
        return { duplicate: false };
    });

    // ========== SHIP — Xác nhận gửi hàng (FULL MODAL) ==========
    fastify.post('/api/shipping/orders/:id/ship', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;

        // Only KT + GĐ can ship
        if (userRole !== 'giam_doc') {
            const kt = await isKeToan(userId);
            if (!kt) return reply.code(403).send({ error: '🔒 Chỉ Kế Toán mới được xác nhận gửi hàng' });
        }

        const rawId = String(request.params.id);
        if (rawId.startsWith('sample_hoan_')) {
            const sampleId = Number(rawId.replace('sample_hoan_', ''));
            const order = await db.get('SELECT id, sample_order_code AS order_code, total_amount, deposit_amount, customer_name, customer_phone, created_by FROM don_gui_ao_mau WHERE id = $1', [sampleId]);
            if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng mẫu' });

            const b = request.body || {};
            const isPendingUpdate = !!b.is_pending_update;

            if (isPendingUpdate) {
                const carrier = await db.get('SELECT allow_update_later FROM dht_carriers WHERE id = $1', [Number(b.actual_carrier_id)]);
                if (!carrier || !carrier.allow_update_later) {
                    return reply.code(400).send({ error: 'Nhà vận chuyển này không hỗ trợ cập nhật phí/bill sau' });
                }
            }

            if (!isPendingUpdate && b.tracking_code) {
                const trackingCode = String(b.tracking_code).trim();
                if (trackingCode) {
                    const dup = await db.get(`
                        SELECT order_code FROM (
                            SELECT order_code FROM dht_orders WHERE tracking_code = $1
                            UNION
                            SELECT o.order_code FROM dht_order_shipments s
                            JOIN dht_orders o ON s.dht_order_id = o.id
                            WHERE s.tracking_code = $1
                            UNION
                            SELECT sample_order_code AS order_code FROM don_gui_ao_mau WHERE (tracking_code = $1 OR hoan_hang_tracking_code = $1) AND id <> $2
                        ) LIMIT 1
                    `, [trackingCode, sampleId]);
                    if (dup) {
                        return reply.code(400).send({ error: `⚠️ Mã Vận Đơn * này đã bị trùng với đơn ${dup.order_code}` });
                    }
                }
            }

            if (!b.actual_carrier_id) return reply.code(400).send({ error: 'Vui lòng chọn Nhà Vận Chuyển' });

            const isNoFeeCarrier = !!b.no_fee_carrier;
            if (!isPendingUpdate && !isNoFeeCarrier) {
                if (b.shipping_fee === undefined || b.shipping_fee === null || b.shipping_fee === '') {
                    return reply.code(400).send({ error: 'Vui lòng nhập phí gửi hàng' });
                }
            }
            const shipFee = (isPendingUpdate || isNoFeeCarrier) ? 0 : Number(b.shipping_fee);
            if (!isPendingUpdate && !isNoFeeCarrier) {
                if (isNaN(shipFee) || shipFee < 0) return reply.code(400).send({ error: 'Phí gửi hàng không hợp lệ' });
            }

            if (!isPendingUpdate && !isNoFeeCarrier) {
                if (!b.shipping_fee_payer || !['hv', 'khach'].includes(b.shipping_fee_payer)) {
                    return reply.code(400).send({ error: 'Vui lòng chọn Người trả phí' });
                }
                if (!b.shipping_fee_method || !['ck', 'tm'].includes(b.shipping_fee_method)) {
                    return reply.code(400).send({ error: 'Vui lòng chọn Hình thức trả' });
                }
            }

            const now = vnNow();
            const todayStr = vnDateStr(now);

            // Update database for sample return order
            const sets = [];
            const params = [];
            let idx = 1;

            sets.push(`status_gui_don_hoan = true`);
            sets.push(`hoan_hang_shipped_by = $${idx++}`); params.push(userId);
            sets.push(`hoan_hang_shipped_at = $${idx++}`); params.push(now.toISOString());
            sets.push(`hoan_hang_actual_carrier_id = $${idx++}`); params.push(Number(b.actual_carrier_id));
            sets.push(`hoan_hang_is_pending_update = $${idx++}`); params.push(isPendingUpdate);

            if (!isPendingUpdate && b.tracking_code) { sets.push(`hoan_hang_tracking_code = $${idx++}`); params.push(b.tracking_code); }
            if (!isPendingUpdate && b.shipping_bill_link) { sets.push(`hoan_hang_shipping_bill_link = $${idx++}`); params.push(b.shipping_bill_link); }

            sets.push(`return_shipping_fee = $${idx++}`); params.push(shipFee);
            sets.push(`return_payer = $${idx++}`); params.push(isPendingUpdate ? null : b.shipping_fee_payer);
            sets.push(`return_payment_method = $${idx++}`); params.push(isPendingUpdate ? null : b.shipping_fee_method);

            let cashflowResult = null;
            let cfDescription = null;
            if (!isPendingUpdate && b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'tm' && shipFee > 0) {
                try {
                    const seq = await _getNextTMSeq(todayStr);
                    const cfCode = _buildTMCode(seq, todayStr);
                    cfDescription = `Gửi ship lần 2 đơn mẫu hoàn ${order.order_code}`;
                    const cfImageUrl = b.shipping_bill_link || null;

                    await db.run(`
                        INSERT INTO payment_records (payment_code, payment_method, daily_seq, amount, payment_type, transfer_note, money_source, source, payment_date, created_by)
                        VALUES ($1, 'TM', $2, $3, 'chi', $4, 'congty', 'cashflow_chi', $5, $6)
                    `, [cfCode, seq, shipFee, cfDescription, todayStr, userId]);

                    cashflowResult = await db.get(`
                        INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, order_code, image_url, money_source, created_by)
                        VALUES ($1, 'CHI', $2, $3, $4, $5, $6, $7, 'congty', $8)
                        RETURNING id, cashflow_code
                    `, [cfCode, seq, todayStr, cfDescription, shipFee, order.order_code, cfImageUrl, userId]);

                    sets.push(`hoan_hang_shipping_cashflow_id = $${idx++}`);
                    params.push(cashflowResult.id);
                } catch (cfErr) {
                    console.error('[Ship Return Sample Cashflow] Error:', cfErr.message);
                    return reply.code(500).send({ error: 'Lỗi tạo phiếu chi tiền ship hoàn: ' + cfErr.message });
                }
            }

            if (!isPendingUpdate && b.selected_payment_id) {
                sets.push(`hoan_hang_shipping_payment_id = $${idx++}`);
                params.push(Number(b.selected_payment_id));
            }

            params.push(sampleId);
            await db.run(`UPDATE don_gui_ao_mau SET ${sets.join(', ')} WHERE id = $${idx}`, params);

            await db.run(
                `INSERT INTO don_gui_ao_mau_logs (sample_order_id, action, summary, performed_by) VALUES ($1, $2, $3, $4)`,
                [sampleId, 'ship_hoan', `Xác nhận gửi hàng hoàn. Phí ship: ${shipFee}đ, NVC: ${b.actual_carrier_id}`, userId]
            );

            return { success: true };
        } else if (rawId.startsWith('sample_')) {
            const sampleId = Number(rawId.replace('sample_', ''));
            const order = await db.get('SELECT id, sample_order_code AS order_code, total_amount, deposit_amount, customer_name, customer_phone, created_by FROM don_gui_ao_mau WHERE id = $1', [sampleId]);
            if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng mẫu' });

            const b = request.body || {};
            const isPendingUpdate = !!b.is_pending_update;

            if (isPendingUpdate) {
                // Validate carrier allows update later
                const carrier = await db.get('SELECT allow_update_later FROM dht_carriers WHERE id = $1', [Number(b.actual_carrier_id)]);
                if (!carrier || !carrier.allow_update_later) {
                    return reply.code(400).send({ error: 'Nhà vận chuyển này không hỗ trợ cập nhật phí/bill sau' });
                }
            }

            if (!isPendingUpdate && b.tracking_code) {
                const trackingCode = String(b.tracking_code).trim();
                if (trackingCode) {
                    const dup = await db.get(`
                        SELECT order_code FROM (
                            SELECT order_code FROM dht_orders WHERE tracking_code = $1
                            UNION
                            SELECT o.order_code FROM dht_order_shipments s
                            JOIN dht_orders o ON s.dht_order_id = o.id
                            WHERE s.tracking_code = $1
                            UNION
                            SELECT sample_order_code AS order_code FROM don_gui_ao_mau WHERE (tracking_code = $1 OR hoan_hang_tracking_code = $1) AND id <> $2
                        ) LIMIT 1
                    `, [trackingCode, sampleId]);
                    if (dup) {
                        return reply.code(400).send({ error: `⚠️ Mã Vận Đơn * này đã bị trùng với đơn ${dup.order_code}` });
                    }
                }
            }

            // Validate carrier
            if (!b.actual_carrier_id) return reply.code(400).send({ error: 'Vui lòng chọn Nhà Vận Chuyển' });

            // Validate shipping fee
            const isNoFeeCarrier = !!b.no_fee_carrier;
            if (!isPendingUpdate && !isNoFeeCarrier) {
                if (b.shipping_fee === undefined || b.shipping_fee === null || b.shipping_fee === '') {
                    return reply.code(400).send({ error: 'Vui lòng nhập phí gửi hàng' });
                }
            }
            const shipFee = (isPendingUpdate || isNoFeeCarrier) ? 0 : Number(b.shipping_fee);
            if (!isPendingUpdate && !isNoFeeCarrier) {
                if (isNaN(shipFee) || shipFee < 0) return reply.code(400).send({ error: 'Phí gửi hàng không hợp lệ' });
            }

            if (!isPendingUpdate && !isNoFeeCarrier) {
                if (!b.shipping_fee_payer || !['hv', 'khach'].includes(b.shipping_fee_payer)) {
                    return reply.code(400).send({ error: 'Vui lòng chọn Người trả phí' });
                }
                if (!b.shipping_fee_method || !['ck', 'tm'].includes(b.shipping_fee_method)) {
                    return reply.code(400).send({ error: 'Vui lòng chọn Hình thức trả' });
                }
            }

            const now = vnNow();
            const todayStr = vnDateStr(now);

            // Update database for sample order
            const sets = [];
            const params = [];
            let idx = 1;

            sets.push(`status_gui_don = true`);
            sets.push(`order_status = 'da_gui'`);
            sets.push(`shipped_by = $${idx++}`); params.push(userId);
            sets.push(`shipped_at = $${idx++}`); params.push(now.toISOString());
            sets.push(`actual_carrier_id = $${idx++}`); params.push(Number(b.actual_carrier_id));
            sets.push(`is_pending_update = $${idx++}`); params.push(isPendingUpdate);

            if (!isPendingUpdate && b.tracking_code) { sets.push(`tracking_code = $${idx++}`); params.push(b.tracking_code); }
            if (!isPendingUpdate && b.shipping_bill_link) { sets.push(`shipping_bill_link = $${idx++}`); params.push(b.shipping_bill_link); }

            sets.push(`shipping_fee = $${idx++}`); params.push(shipFee);
            sets.push(`shipping_fee_payer = $${idx++}`); params.push(isPendingUpdate ? null : b.shipping_fee_payer);
            sets.push(`shipping_fee_method = $${idx++}`); params.push(isPendingUpdate ? null : b.shipping_fee_method);

            sets.push(`updated_at = NOW()`);
            sets.push(`updated_by = $${idx++}`); params.push(userId);

            let cashflowResult = null;
            let cfDescription = null;
            if (!isPendingUpdate && b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'tm' && shipFee > 0) {
                try {
                    const seq = await _getNextTMSeq(todayStr);
                    const cfCode = _buildTMCode(seq, todayStr);
                    cfDescription = `Tiền ship gửi mẫu đơn ${order.order_code}`;
                    const cfImageUrl = b.shipping_bill_link || null;

                    // Reserve TM code in payment_records
                    await db.run(`
                        INSERT INTO payment_records (payment_code, payment_method, daily_seq, amount, payment_type, transfer_note, money_source, source, payment_date, created_by)
                        VALUES ($1, 'TM', $2, $3, 'chi', $4, 'congty', 'cashflow_chi', $5, $6)
                    `, [cfCode, seq, shipFee, cfDescription, todayStr, userId]);

                    // Create CHI in cashflow_records
                    cashflowResult = await db.get(`
                        INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, order_code, image_url, money_source, created_by)
                        VALUES ($1, 'CHI', $2, $3, $4, $5, $6, $7, 'congty', $8)
                        RETURNING id, cashflow_code
                    `, [cfCode, seq, todayStr, cfDescription, shipFee, order.order_code, cfImageUrl, userId]);

                    sets.push(`shipping_cashflow_id = $${idx++}`);
                    params.push(cashflowResult.id);
                } catch (cfErr) {
                    console.error('[Ship Sample Cashflow] Error:', cfErr.message);
                    return reply.code(500).send({ error: 'Lỗi tạo phiếu chi tiền ship: ' + cfErr.message });
                }
            }

            if (!isPendingUpdate && b.selected_payment_id) {
                sets.push(`shipping_payment_id = $${idx++}`);
                params.push(Number(b.selected_payment_id));
            }

            params.push(sampleId);
            await db.run(`UPDATE don_gui_ao_mau SET ${sets.join(', ')} WHERE id = $${idx}`, params);

            // Link payment record for sample order settlement (if selected)
            let paymentLinkResult = null;
            if (!isPendingUpdate && b.selected_payment_id) {
                const prId = Number(b.selected_payment_id);
                try {
                    const pr = await db.get('SELECT * FROM payment_records WHERE id = $1', [prId]);
                    if (pr) {
                        const childSumRow = await db.get(`
                            SELECT COALESCE(SUM(amount), 0) AS child_sum
                            FROM payment_records
                            WHERE payment_type = 'child_sll' AND (parent_id = $1 OR source_ref_id = $1::text)
                        `, [prId]);
                        
                        const paidRow = await db.get(
                            `SELECT COALESCE(SUM(amount), 0) AS paid_total
                             FROM payment_records
                             WHERE order_ao_mau = $1`,
                            [order.order_code]
                        );
                        const paidTotal = Number(paidRow?.paid_total) || 0;
                        const isCarrier = pr.money_source === 'nha_van_chuyen';
                        const parentShipFee = isCarrier ? (Number(pr.shipping_fee || 0)) : 0;
                        const remainingDebt = Math.max(0, (Number(order.total_amount) || 0) - paidTotal - ((!isCarrier && b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'ck' && b.selected_payment_id) ? shipFee : 0));

                        const remainingBalance = pr.amount + parentShipFee - Number(childSumRow.child_sum || 0);
                        const allocAmount = Math.min(remainingBalance, remainingDebt);

                        if (allocAmount > 0) {
                            const childCountRow = await db.get(`
                                SELECT COUNT(*) AS cnt FROM payment_records
                                WHERE payment_type = 'child_sll' AND (parent_id = $1 OR source_ref_id = $1::text)
                            `, [prId]);
                            const childIdx = Number(childCountRow.cnt) + 1;

                            if (childIdx === 1 && allocAmount === Number(pr.amount) && pr.money_source !== 'nha_van_chuyen') {
                                // Update parent directly to be a simple thanh_toan
                                await db.run(`
                                    UPDATE payment_records SET
                                        payment_type = 'thanh_toan',
                                        order_tt_coc = NULL,
                                        order_ao_mau = $1,
                                        customer_name = $2,
                                        customer_phone = $3,
                                        cskh_user_id = $4,
                                        money_source = 'khach_hang',
                                        transfer_note = $5,
                                        updated_at = NOW()
                                    WHERE id = $6
                                `, [
                                    order.order_code,
                                    order.customer_name || null,
                                    order.customer_phone || null,
                                    order.created_by || null,
                                    (pr.transfer_note || '') + ' (Thanh toán đơn mẫu ' + order.order_code + ' khi gửi hàng)',
                                    prId
                                ]);
                                paymentLinkResult = { id: prId, payment_code: pr.payment_code, amount: allocAmount };
                            } else {
                                const splitCode = `${pr.payment_code}-S${childIdx}`;

                                // Insert child record
                                await db.run(`
                                    INSERT INTO payment_records (
                                        payment_code, payment_method, daily_seq,
                                        customer_name, customer_phone, cskh_user_id,
                                        amount, payment_type,
                                        order_tt_coc, order_ao_mau,
                                        transfer_note, money_source, bank_name,
                                        total_order_codes, total_cod, shipping_fee,
                                        handover_status, handover_at, handover_by,
                                        source, source_ref_id, payment_date, created_by,
                                        parent_id
                                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
                                `, [
                                    splitCode, pr.payment_method, pr.daily_seq,
                                    order.customer_name || null, order.customer_phone || null, order.created_by || null,
                                    allocAmount, 'child_sll',
                                    null, order.order_code,
                                    (pr.transfer_note || '') + ' (Thanh toán đơn mẫu ' + order.order_code + ' khi gửi hàng)',
                                    'khach_hang', pr.bank_name || null,
                                    null, 0, 0,
                                    'chua_bangiao',
                                    pr.handover_at || null,
                                    pr.handover_by || null,
                                    pr.source, null, pr.payment_date, userId,
                                    prId
                                ]);

                                // Update parent
                                const totalAllocationsCount = childIdx;
                                const moneySource = totalAllocationsCount >= 2 ? 'khach_hang_sll' : 'khach_hang';

                                await db.run(`
                                    UPDATE payment_records SET
                                        payment_type = 'parent_sll',
                                        order_tt_coc = NULL,
                                        total_order_codes = NULL,
                                        customer_name = COALESCE(customer_name, $1),
                                        customer_phone = COALESCE(customer_phone, $2),
                                        cskh_user_id = COALESCE(cskh_user_id, $3),
                                        money_source = $4,
                                        updated_at = NOW()
                                    WHERE id = $5
                                `, [
                                    order.customer_name || null,
                                    order.customer_phone || null,
                                    order.created_by || null,
                                    moneySource,
                                    prId
                                ]);

                                paymentLinkResult = { id: prId, payment_code: pr.payment_code, amount: allocAmount };
                            }
                        }
                    }
                } catch (prErr) {
                    console.error('[Ship Sample Payment] Link error:', prErr.message);
                }
            }

            // Log
            let logSummary = isPendingUpdate 
                ? `Kế toán đã gửi hàng mẫu (NVC: ${b.actual_carrier_id}, Cập nhật phí/bill sau)`
                : `Kế toán đã xác nhận gửi hàng mẫu (NVC: ${b.actual_carrier_id}, Ship fee: ${shipFee})`;
            if (paymentLinkResult) {
                logSummary += ` — Thanh toán: ${paymentLinkResult.payment_code} (${Number(paymentLinkResult.amount).toLocaleString('vi-VN')}đ)`;
            }
            await db.run(
                `INSERT INTO don_gui_ao_mau_logs (sample_order_id, action, summary, performed_by) VALUES ($1, $2, $3, $4)`,
                [sampleId, 'ship', logSummary, userId]
            );

            // Send Telegram message to notifications or cashflow channel if there was a CHI
            if (cashflowResult && b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'tm' && shipFee > 0) {
                try {
                    const tgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cashflow_group'");
                    if (tgRow && tgRow.value) {
                        const { sendTelegramMessage } = require('../utils/telegram');
                        const amtStr = shipFee.toLocaleString('vi-VN');
                        const thuSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='THU' AND is_closed=false AND NOT (money_source='cophanmay' AND cashflow_code LIKE 'CPMAY-%')");
                        const chiSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='CHI' AND is_closed=false");
                        const runBal = Number(thuSum.t) - Number(chiSum.t);
                        const balStr = runBal.toLocaleString('vi-VN');
                        const msg = `🔴CHI TM <b>CÔNG TY</b> :\n💰${cashflowResult.cashflow_code} : <b>${amtStr}đ</b> ${cfDescription} 👤 ${request.user.full_name || request.user.username}\n\n🔗Tổng Kế Toán Cầm : <b>${balStr}đ</b>`;
                        await sendTelegramMessage(tgRow.value, msg);
                    }
                } catch (tgErr) { console.error('[Ship TG] Error:', tgErr.message); }
            }

            // Build result message
            let resultMsgParts = [`✅ Đã gửi đơn mẫu ${order.order_code}`];
            if (isPendingUpdate) resultMsgParts = [`✅ Đã gửi đơn mẫu ${order.order_code} (chờ cập nhật phí/bill)`];
            if (cashflowResult) resultMsgParts.push(`Phiếu chi ship: ${cashflowResult.cashflow_code}`);
            if (paymentLinkResult) resultMsgParts.push(`Thanh toán: ${paymentLinkResult.payment_code} (${Number(paymentLinkResult.amount).toLocaleString('vi-VN')}đ)`);
            const resultMsg = resultMsgParts.join(' — ');

            return { success: true, message: resultMsg, cashflow_code: cashflowResult?.cashflow_code || null, payment_linked: paymentLinkResult?.payment_code || null };
        }

        const orderId = Number(request.params.id);
        const order = await db.get('SELECT id, shipping_status, order_code, total_amount, discount_amount, deposit_amount_cache, customer_name, customer_phone, cskh_user_id FROM dht_orders WHERE id = $1', [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });
        // Allow reshipping: do not check if shipping_status is already 'shipped'
        // if (order.shipping_status === 'shipped') return reply.code(400).send({ error: 'Đơn hàng đã được gửi rồi' });

        const b = request.body || {};
        const isPendingUpdate = !!b.is_pending_update;

        if (isPendingUpdate) {
            // Validate carrier allows update later
            const carrier = await db.get('SELECT allow_update_later FROM dht_carriers WHERE id = $1', [Number(b.actual_carrier_id)]);
            if (!carrier || !carrier.allow_update_later) {
                return reply.code(400).send({ error: 'Nhà vận chuyển này không hỗ trợ cập nhật phí/bill sau' });
            }
        }

        if (!isPendingUpdate && b.tracking_code) {
            const trackingCode = String(b.tracking_code).trim();
            if (trackingCode) {
                const dup = await db.get(`
                    SELECT order_code FROM (
                        SELECT order_code FROM dht_orders WHERE tracking_code = $1 AND id <> $2
                        UNION
                        SELECT o.order_code FROM dht_order_shipments s
                        JOIN dht_orders o ON s.dht_order_id = o.id
                        WHERE s.tracking_code = $1 AND s.dht_order_id <> $2
                        UNION
                        SELECT sample_order_code AS order_code FROM don_gui_ao_mau WHERE (tracking_code = $1 OR hoan_hang_tracking_code = $1)
                    ) LIMIT 1
                `, [trackingCode, orderId]);
                if (dup) {
                    return reply.code(400).send({ error: `⚠️ Mã Vận Đơn * này đã bị trùng với đơn ${dup.order_code}` });
                }
            }
        }

        // Validate carrier
        if (!b.actual_carrier_id) return reply.code(400).send({ error: 'Vui lòng chọn Nhà Vận Chuyển' });

        // Validate shipping fee
        const isNoFeeCarrier = !!b.no_fee_carrier;
        if (!isPendingUpdate && !isNoFeeCarrier) {
            if (b.shipping_fee === undefined || b.shipping_fee === null || b.shipping_fee === '') {
                return reply.code(400).send({ error: 'Vui lòng nhập phí gửi hàng' });
            }
        }
        const shipFee = (isPendingUpdate || isNoFeeCarrier) ? 0 : Number(b.shipping_fee);
        if (!isPendingUpdate && !isNoFeeCarrier) {
            if (isNaN(shipFee) || shipFee < 0) return reply.code(400).send({ error: 'Phí gửi hàng không hợp lệ' });
        }

        if (!isPendingUpdate && !isNoFeeCarrier) {
            if (!b.shipping_fee_payer || !['hv', 'khach'].includes(b.shipping_fee_payer)) {
                return reply.code(400).send({ error: 'Vui lòng chọn Người trả phí' });
            }
            if (!b.shipping_fee_method || !['ck', 'tm'].includes(b.shipping_fee_method)) {
                return reply.code(400).send({ error: 'Vui lòng chọn Hình thức trả' });
            }
        }

        const now = vnNow();
        const todayStr = vnDateStr(now);

        const itemId = b.item_id ? Number(b.item_id) : null;
        const itemIds = Array.isArray(b.item_ids) ? b.item_ids.map(Number) : [];
        if (itemId && !itemIds.includes(itemId)) {
            itemIds.push(itemId);
        }

        // If itemIds are provided, check and validate items
        let itemsToShip = [];
        if (itemIds.length > 0) {
            itemsToShip = await db.all(`
                SELECT id, dht_order_id, shipping_status, product_name, description, quantity 
                FROM dht_order_items 
                WHERE id = ANY($1::int[]) AND dht_order_id = $2
            `, [itemIds, orderId]);
            if (itemsToShip.length !== itemIds.length) {
                return reply.code(404).send({ error: 'Không tìm thấy đầy đủ các phiếu/sản phẩm được chọn' });
            }
        }

        // Build update SET
        const sets = [];
        const params = [];
        let idx = 1;

        // Core shipping fields
        sets.push(`shipping_status = 'shipped'`);
        sets.push(`shipped_by = $${idx++}`); params.push(userId);
        sets.push(`shipped_at = $${idx++}`); params.push(now.toISOString());
        sets.push(`shipping_date = $${idx++}`); params.push(todayStr);
        sets.push(`actual_ship_datetime = $${idx++}`); params.push(now.toISOString());
        sets.push(`actual_carrier_id = $${idx++}`); params.push(Number(b.actual_carrier_id));
        sets.push(`is_pending_update = $${idx++}`); params.push(isPendingUpdate);
        // ★ Clear reschedule data — no longer relevant after shipping
        sets.push(`rescheduled_ship_date = NULL`);
        sets.push(`reschedule_reason = NULL`);
        sets.push(`ship_count = COALESCE(ship_count, 0) + 1`);

        // Tracking fields (conditional, from modal)
        if (!isPendingUpdate && b.tracking_code) { sets.push(`tracking_code = $${idx++}`); params.push(b.tracking_code); }
        if (!isPendingUpdate && b.shipping_bill_link) { sets.push(`shipping_bill_link = $${idx++}`); params.push(b.shipping_bill_link); }
        if (!isPendingUpdate && b.carrier_phone) { sets.push(`carrier_phone = $${idx++}`); params.push(b.carrier_phone); }
        if (!isPendingUpdate && b.receiver_name) { sets.push(`receiver_name = $${idx++}`); params.push(b.receiver_name); }

        // Fee fields
        sets.push(`shipping_fee = $${idx++}`); params.push(shipFee);
        sets.push(`shipping_fee_payer = $${idx++}`); params.push(isPendingUpdate ? null : b.shipping_fee_payer);
        sets.push(`shipping_fee_method = $${idx++}`); params.push(isPendingUpdate ? null : b.shipping_fee_method);
        if (!isPendingUpdate && b.selected_payment_id) {
            sets.push(`shipping_payment_id = $${idx++}`); params.push(Number(b.selected_payment_id));
        }

        sets.push(`last_updated_by = $${idx++}`); params.push(userId);
        sets.push(`last_updated_at = NOW()`);

        // Handle "HV trả + TM" → Auto create CHI in Sổ Thu Chi
        let cashflowResult = null;
        let cfDescription = null;
        if (!isPendingUpdate && b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'tm' && shipFee > 0) {
            try {
                const seq = await _getNextTMSeq(todayStr);
                const cfCode = _buildTMCode(seq, todayStr);
                
                const existingShipments = await db.all(`
                    SELECT id FROM dht_order_shipments WHERE dht_order_id = $1
                `, [orderId]);
                const shipmentCount = existingShipments.length + 1;
                
                if (shipmentCount > 1) {
                    cfDescription = `Gửi ship lần ${shipmentCount} đơn ${order.order_code}`;
                } else {
                    cfDescription = `Tiền ship đơn ${order.order_code}`;
                    if (itemsToShip.length > 0) {
                        const names = itemsToShip.map(it => it.product_name).join(', ');
                        cfDescription = `Tiền ship phiếu (${names}) đơn ${order.order_code}`;
                    }
                }
                const cfImageUrl = b.shipping_bill_link || null;

                // Reserve TM code in payment_records (same as cashflow.js pattern)
                await db.run(`
                    INSERT INTO payment_records (payment_code, payment_method, daily_seq, amount, payment_type, transfer_note, money_source, source, payment_date, created_by)
                    VALUES ($1, 'TM', $2, $3, 'chi', $4, 'congty', 'cashflow_chi', $5, $6)
                `, [cfCode, seq, shipFee, cfDescription, todayStr, userId]);

                // Create CHI in cashflow_records
                cashflowResult = await db.get(`
                    INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, order_code, image_url, money_source, created_by)
                    VALUES ($1, 'CHI', $2, $3, $4, $5, $6, $7, 'congty', $8)
                    RETURNING id, cashflow_code
                `, [cfCode, seq, todayStr, cfDescription, shipFee, order.order_code, cfImageUrl, userId]);

                // Link cashflow to order
                sets.push(`shipping_cashflow_id = $${idx++}`);
                params.push(cashflowResult.id);

                // Send Telegram for CHI
                try {
                    const tgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cashflow_group'");
                    if (tgRow && tgRow.value) {
                        const { sendTelegramMessage } = require('../utils/telegram');
                        const amtStr = shipFee.toLocaleString('vi-VN');
                        const thuSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='THU' AND is_closed=false AND NOT (money_source='cophanmay' AND cashflow_code LIKE 'CPMAY-%')");
                        const chiSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='CHI' AND is_closed=false");
                        const runBal = Number(thuSum.t) - Number(chiSum.t);
                        const balStr = runBal.toLocaleString('vi-VN');
                        const msg = `🔴CHI TM <b>CÔNG TY</b> :\n💰${cfCode} : <b>${amtStr}đ</b> ${cfDescription} 👤 ${request.user.full_name || request.user.username}\n\n🔗Tổng Kế Toán Cầm : <b>${balStr}đ</b>`;
                        await sendTelegramMessage(tgRow.value, msg);
                    }
                } catch (tgErr) { console.error('[Ship TG] Error:', tgErr.message); }
            } catch (cfErr) {
                console.error('[Ship Cashflow] Error:', cfErr.message);
                return reply.code(500).send({ error: 'Lỗi tạo phiếu chi tiền ship: ' + cfErr.message });
            }
        }

        // Update database
        if (itemIds.length > 0) {
            const itemSets = [];
            const itemParams = [];
            let itemIdx = 1;
            
            itemSets.push(`shipping_status = 'shipped'`);
            itemSets.push(`shipped_by = $${itemIdx++}`); itemParams.push(userId);
            itemSets.push(`shipped_at = $${itemIdx++}`); itemParams.push(now.toISOString());
            itemSets.push(`shipping_date = $${itemIdx++}`); itemParams.push(todayStr);
            itemSets.push(`actual_ship_datetime = $${itemIdx++}`); itemParams.push(now.toISOString());
            itemSets.push(`actual_carrier_id = $${itemIdx++}`); itemParams.push(Number(b.actual_carrier_id));
            itemSets.push(`is_pending_update = $${itemIdx++}`); itemParams.push(isPendingUpdate);
            
            if (!isPendingUpdate && b.tracking_code) { itemSets.push(`tracking_code = $${itemIdx++}`); itemParams.push(b.tracking_code); }
            if (!isPendingUpdate && b.shipping_bill_link) { itemSets.push(`shipping_bill_link = $${itemIdx++}`); itemParams.push(b.shipping_bill_link); }
            if (!isPendingUpdate && b.carrier_phone) { itemSets.push(`carrier_phone = $${itemIdx++}`); itemParams.push(b.carrier_phone); }
            if (!isPendingUpdate && b.receiver_name) { itemSets.push(`receiver_name = $${itemIdx++}`); itemParams.push(b.receiver_name); }

            itemSets.push(`shipping_fee = $${itemIdx++}`); itemParams.push(shipFee);
            itemSets.push(`shipping_fee_payer = $${itemIdx++}`); itemParams.push(isPendingUpdate ? null : b.shipping_fee_payer);
            itemSets.push(`shipping_fee_method = $${itemIdx++}`); itemParams.push(isPendingUpdate ? null : b.shipping_fee_method);
            if (cashflowResult) {
                itemSets.push(`shipping_cashflow_id = $${itemIdx++}`); itemParams.push(cashflowResult.id);
            }
            if (!isPendingUpdate && b.selected_payment_id) {
                itemSets.push(`shipping_payment_id = $${itemIdx++}`); itemParams.push(Number(b.selected_payment_id));
            }
            
            itemParams.push(itemIds);
            await db.run(`UPDATE dht_order_items SET ${itemSets.join(', ')} WHERE id = ANY($${itemIdx}::int[])`, itemParams);

            // Check if all items in order are now shipped
            const unshipped = await db.get(`
                SELECT COUNT(*) AS cnt FROM dht_order_items 
                WHERE dht_order_id = $1 
                  AND shipping_status = 'pending'
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%'
            `, [orderId]);
            if (Number(unshipped?.cnt || 0) === 0) {
                // All items are shipped! Update order status to shipped.
                const orderSets = [];
                const orderParams = [];
                let orderIdx = 1;
                
                orderSets.push(`shipping_status = 'shipped'`);
                orderSets.push(`shipped_by = $${orderIdx++}`); orderParams.push(userId);
                orderSets.push(`shipped_at = $${orderIdx++}`); orderParams.push(now.toISOString());
                orderSets.push(`shipping_date = $${orderIdx++}`); orderParams.push(todayStr);
                orderSets.push(`actual_ship_datetime = $${orderIdx++}`); orderParams.push(now.toISOString());
                orderSets.push(`actual_carrier_id = $${orderIdx++}`); orderParams.push(Number(b.actual_carrier_id));
                orderSets.push(`is_pending_update = $${orderIdx++}`); orderParams.push(isPendingUpdate);
                orderSets.push(`rescheduled_ship_date = NULL`);
                orderSets.push(`reschedule_reason = NULL`);
                orderSets.push(`ship_count = COALESCE(ship_count, 0) + 1`);
                
                if (!isPendingUpdate && b.tracking_code) { orderSets.push(`tracking_code = $${orderIdx++}`); orderParams.push(b.tracking_code); }
                if (!isPendingUpdate && b.shipping_bill_link) { orderSets.push(`shipping_bill_link = $${orderIdx++}`); orderParams.push(b.shipping_bill_link); }
                if (!isPendingUpdate && b.carrier_phone) { orderSets.push(`carrier_phone = $${orderIdx++}`); orderParams.push(b.carrier_phone); }
                if (!isPendingUpdate && b.receiver_name) { orderSets.push(`receiver_name = $${orderIdx++}`); orderParams.push(b.receiver_name); }
                
                orderSets.push(`shipping_fee = $${orderIdx++}`); orderParams.push(shipFee);
                orderSets.push(`shipping_fee_payer = $${orderIdx++}`); orderParams.push(isPendingUpdate ? null : b.shipping_fee_payer);
                orderSets.push(`shipping_fee_method = $${orderIdx++}`); orderParams.push(isPendingUpdate ? null : b.shipping_fee_method);
                if (cashflowResult) {
                    orderSets.push(`shipping_cashflow_id = $${orderIdx++}`); orderParams.push(cashflowResult.id);
                }
                if (!isPendingUpdate && b.selected_payment_id) {
                    orderSets.push(`shipping_payment_id = $${orderIdx++}`); orderParams.push(Number(b.selected_payment_id));
                }
                
                orderSets.push(`last_updated_by = $${orderIdx++}`); orderParams.push(userId);
                orderSets.push(`last_updated_at = NOW()`);
                
                orderParams.push(orderId);
                await db.run(`UPDATE dht_orders SET ${orderSets.join(', ')} WHERE id = $${orderIdx}`, orderParams);
            }
        } else {
            params.push(orderId);
            await db.run(`UPDATE dht_orders SET ${sets.join(', ')} WHERE id = $${idx}`, params);

            // Also mark all items as shipped
            await db.run(`
                UPDATE dht_order_items SET
                    shipping_status = 'shipped',
                    shipped_by = $1,
                    shipped_at = $2,
                    shipping_date = $3,
                    actual_ship_datetime = $2,
                    actual_carrier_id = $4,
                    tracking_code = $5,
                    shipping_bill_link = $6,
                    carrier_phone = $7,
                    receiver_name = $8,
                    shipping_fee = $9,
                    shipping_fee_payer = $10,
                    shipping_fee_method = $11,
                    shipping_cashflow_id = $12,
                    shipping_payment_id = $14,
                    is_pending_update = $15
                WHERE dht_order_id = $13
            `, [
                userId, now.toISOString(), todayStr, Number(b.actual_carrier_id),
                (isPendingUpdate ? null : b.tracking_code) || null, (isPendingUpdate ? null : b.shipping_bill_link) || null, (isPendingUpdate ? null : b.carrier_phone) || null,
                (isPendingUpdate ? null : b.receiver_name) || null, shipFee, isPendingUpdate ? null : (b.shipping_fee_payer || null),
                isPendingUpdate ? null : (b.shipping_fee_method || null), cashflowResult?.id || null, orderId,
                (!isPendingUpdate && b.selected_payment_id) ? Number(b.selected_payment_id) : null,
                isPendingUpdate
            ]);
        }

        // Record shipment in dht_order_shipments
        try {
            const allOrderItems = await db.all(`
                SELECT id, product_name, quantity, description FROM dht_order_items 
                WHERE dht_order_id = $1 
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%'
                ORDER BY id ASC
            `, [orderId]);
            let shippedItemIds = [];
            let shippedItemsList = [];
            if (itemIds.length > 0) {
                shippedItemIds = itemIds;
                shippedItemsList = itemsToShip;
            } else {
                shippedItemIds = allOrderItems.map(it => it.id);
                shippedItemsList = allOrderItems;
            }

            const labelsArray = shippedItemsList.map(it => {
                const idxInOrder = allOrderItems.findIndex(x => x.id === it.id);
                const labelName = `Phiếu ${idxInOrder !== -1 ? idxInOrder + 1 : 1}`;
                return {
                    label: labelName,
                    name: it.product_name || it.description || 'Sản phẩm',
                    qty: it.quantity || 0
                };
            });
            const itemLabelsJson = JSON.stringify(labelsArray);

            await db.run(`
                INSERT INTO dht_order_shipments (
                    dht_order_id, shipped_by, shipped_at, shipping_date, actual_ship_datetime,
                    actual_carrier_id, tracking_code, shipping_bill_link, carrier_phone, receiver_name,
                    shipping_fee, shipping_fee_payer, shipping_fee_method, shipping_cashflow_id, shipping_payment_id,
                    item_ids, item_labels, is_pending_update
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            `, [
                orderId, userId, now.toISOString(), todayStr, now.toISOString(),
                Number(b.actual_carrier_id), isPendingUpdate ? null : (b.tracking_code || null), isPendingUpdate ? null : (b.shipping_bill_link || null),
                isPendingUpdate ? null : (b.carrier_phone || null), isPendingUpdate ? null : (b.receiver_name || null), shipFee,
                (isPendingUpdate || isNoFeeCarrier) ? null : b.shipping_fee_payer, (isPendingUpdate || isNoFeeCarrier) ? null : b.shipping_fee_method,
                cashflowResult ? cashflowResult.id : null, (!isPendingUpdate && b.selected_payment_id) ? Number(b.selected_payment_id) : null,
                shippedItemIds.join(','), itemLabelsJson, isPendingUpdate
            ]);
        } catch (shipErr) {
            console.error('[Shipments Log] Error inserting shipment:', shipErr.message);
        }

        // ★ Link payment record for order settlement (if selected)
        let paymentLinkResult = null;
        if (!isPendingUpdate && b.selected_payment_id) {
            const prId = Number(b.selected_payment_id);
            try {
                const pr = await db.get('SELECT * FROM payment_records WHERE id = $1', [prId]);
                if (pr) {
                    const childSumRow = await db.get(`
                        SELECT COALESCE(SUM(amount), 0) AS child_sum
                        FROM payment_records
                        WHERE payment_type = 'child_sll' AND (parent_id = $1 OR source_ref_id = $1::text)
                    `, [prId]);
                    
                    const depRow = await db.get(
                        `SELECT COALESCE(SUM(amount), 0) AS deposit_total
                         FROM payment_records
                         WHERE total_order_codes ILIKE '%' || $1 || '%'
                            OR order_tt_coc = $1`,
                        [order.order_code]
                    );
                    const depositTotal = Number(depRow?.deposit_total) || 0;
                    const isCarrier = pr.money_source === 'nha_van_chuyen';
                    const parentShipFee = isCarrier ? (Number(pr.shipping_fee || 0)) : 0;
                    const remainingDebt = Math.max(0, (Number(order.total_amount) || 0)
                        - (Number(order.discount_amount) || 0)
                        - Math.max(depositTotal, Number(order.deposit_amount_cache) || 0)
                        - ((!isCarrier && b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'ck' && b.selected_payment_id) ? shipFee : 0));

                    const remainingBalance = pr.amount + parentShipFee - Number(childSumRow.child_sum || 0);
                    const allocAmount = Math.min(remainingBalance, remainingDebt);

                    if (allocAmount > 0) {
                        const childCountRow = await db.get(`
                            SELECT COUNT(*) AS cnt FROM payment_records
                            WHERE payment_type = 'child_sll' AND (parent_id = $1 OR source_ref_id = $1::text)
                        `, [prId]);
                        const childIdx = Number(childCountRow.cnt) + 1;

                        if (childIdx === 1 && allocAmount === Number(pr.amount) && pr.money_source !== 'nha_van_chuyen') {
                            // Update parent directly to be a simple thanh_toan
                            await db.run(`
                                UPDATE payment_records SET
                                    payment_type = 'thanh_toan',
                                    order_tt_coc = $1,
                                    order_ao_mau = NULL,
                                    customer_name = $2,
                                    customer_phone = $3,
                                    cskh_user_id = $4,
                                    money_source = 'khach_hang',
                                    transfer_note = $5,
                                    updated_at = NOW()
                                WHERE id = $6
                            `, [
                                order.order_code,
                                order.customer_name || null,
                                order.customer_phone || null,
                                order.cskh_user_id || null,
                                (pr.transfer_note || '') + ' (Thanh toán đơn ' + order.order_code + ' khi gửi hàng)',
                                prId
                            ]);
                            paymentLinkResult = { id: prId, payment_code: pr.payment_code, amount: allocAmount };
                        } else {
                            const splitCode = `${pr.payment_code}-S${childIdx}`;

                            // Insert child record
                            await db.run(`
                                INSERT INTO payment_records (
                                    payment_code, payment_method, daily_seq,
                                    customer_name, customer_phone, cskh_user_id,
                                    amount, payment_type,
                                    order_tt_coc, order_ao_mau,
                                    transfer_note, money_source, bank_name,
                                    total_order_codes, total_cod, shipping_fee,
                                    handover_status, handover_at, handover_by,
                                    source, source_ref_id, payment_date, created_by,
                                    parent_id
                                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
                            `, [
                                splitCode, pr.payment_method, pr.daily_seq,
                                order.customer_name || null, order.customer_phone || null, order.cskh_user_id || null,
                                allocAmount, 'child_sll',
                                order.order_code, null,
                                (pr.transfer_note || '') + ' (Thanh toán đơn ' + order.order_code + ' khi gửi hàng)',
                                'khach_hang', pr.bank_name || null,
                                null, 0, 0,
                                'chua_bangiao',
                                pr.handover_at || null,
                                pr.handover_by || null,
                                pr.source, null, pr.payment_date, userId,
                                prId
                            ]);

                            // Update parent
                            const totalAllocationsCount = childIdx;
                            const moneySource = totalAllocationsCount >= 2 ? 'khach_hang_sll' : 'khach_hang';

                            await db.run(`
                                UPDATE payment_records SET
                                    payment_type = 'parent_sll',
                                    order_tt_coc = NULL,
                                    total_order_codes = NULL,
                                    customer_name = COALESCE(customer_name, $1),
                                    customer_phone = COALESCE(customer_phone, $2),
                                    cskh_user_id = COALESCE(cskh_user_id, $3),
                                    money_source = $4,
                                    updated_at = NOW()
                                WHERE id = $5
                            `, [
                                order.customer_name || null,
                                order.customer_phone || null,
                                order.cskh_user_id || null,
                                moneySource,
                                prId
                            ]);

                            paymentLinkResult = { id: prId, payment_code: pr.payment_code, amount: allocAmount };
                        }
                    }
                }
            } catch (prErr) {
                console.error('[Ship Payment] Link error:', prErr.message);
            }
        }

        // Build result message
        let resultMsgParts = [];
        if (itemsToShip.length > 0) {
            const names = itemsToShip.map(it => it.product_name).join(', ');
            resultMsgParts.push(isPendingUpdate ? `✅ Đã gửi phiếu (${names}) của đơn ${order.order_code} (chờ cập nhật phí/bill)` : `✅ Đã gửi phiếu (${names}) của đơn ${order.order_code}`);
        } else {
            resultMsgParts.push(isPendingUpdate ? `✅ Đã gửi đơn ${order.order_code} (chờ cập nhật phí/bill)` : `✅ Đã gửi đơn ${order.order_code}`);
        }
        if (cashflowResult) resultMsgParts.push(`Phiếu chi ship: ${cashflowResult.cashflow_code}`);
        if (paymentLinkResult) resultMsgParts.push(`Thanh toán: ${paymentLinkResult.payment_code} (${Number(paymentLinkResult.amount).toLocaleString('vi-VN')}đ)`);
        const resultMsg = resultMsgParts.join(' — ');

        // ★ Audit log: Gửi hàng
        try {
            const carrierRow = await db.get('SELECT name FROM dht_carriers WHERE id = $1', [Number(b.actual_carrier_id)]);
            const carrierName = carrierRow?.name || b.actual_carrier_id;
            const payerLabel = b.shipping_fee_payer === 'hv' ? ((b.tracking_code && b.tracking_code.trim()) ? 'HV trả cước vận chuyển' : (b.shipping_fee_method === 'ck' ? 'HV trả CK' : (b.shipping_fee_method === 'tm' ? 'HV trả TM' : 'HV trả cước vận chuyển'))) : 'Khách trả';
            const changes = [
                { field: 'actual_carrier', label: 'Nhà vận chuyển', old: null, new: carrierName },
                { field: 'shipping_fee', label: 'Phí gửi hàng', old: null, new: String(shipFee) },
                { field: 'fee_payer', label: 'Người trả', old: null, new: payerLabel }
            ];
            if (b.tracking_code) changes.push({ field: 'tracking_code', label: 'Mã vận đơn', old: null, new: b.tracking_code });
            if (b.carrier_phone) changes.push({ field: 'carrier_phone', label: 'SĐT Nhà Xe', old: null, new: b.carrier_phone });
            if (b.receiver_name) changes.push({ field: 'receiver_name', label: 'Người nhận', old: null, new: b.receiver_name });
            
            let summary = `Đã gửi hàng qua ${carrierName} — Phí ${Number(shipFee).toLocaleString('vi-VN')}đ — ${payerLabel}`;
            if (itemsToShip.length > 0) {
                const names = itemsToShip.map(it => it.product_name).join(', ');
                summary = `Đã gửi phiếu (${names}) qua ${carrierName} — Phí ${Number(shipFee).toLocaleString('vi-VN')}đ — ${payerLabel}`;
            }
            await db.run(`INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by) VALUES ($1,$2,$3,$4,$5)`, [
                orderId, 'ship', summary, JSON.stringify(changes), request.user.id
            ]);

            // ★ Audit log: Auto CHI for HV+TM shipping fee
            if (cashflowResult && shipFee > 0) {
                const chiChanges = [
                    { field: 'payment_code', label: 'Mã phiếu CHI', old: null, new: cashflowResult.cashflow_code },
                    { field: 'payment_amount', label: 'Số tiền CHI', old: null, new: String(shipFee) },
                    { field: 'payment_method', label: 'Hình thức', old: null, new: 'Tiền Mặt' },
                    { field: 'transfer_note', label: 'Nội dung', old: null, new: cfDescription || `Tiền ship đơn ${order.order_code}` }
                ];
                const chiSummary = `🔴 Phí ship (CHI tự động): ${Number(shipFee).toLocaleString('vi-VN')}đ — Mã phiếu: ${cashflowResult.cashflow_code}`;
                await db.run(`INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by) VALUES ($1,$2,$3,$4,$5)`, [
                    orderId, 'payment', chiSummary, JSON.stringify(chiChanges), request.user.id
                ]);
            }

            // ★ Audit log: Payment linked during shipment
            if (paymentLinkResult) {
                const prAmt = Number(paymentLinkResult.amount) || 0;
                const prChanges = [
                    { field: 'payment_code', label: 'Mã tiền', old: null, new: paymentLinkResult.payment_code },
                    { field: 'payment_amount', label: 'Số tiền', old: null, new: String(prAmt) },
                    { field: 'transfer_note', label: 'Nội dung', old: null, new: 'Liên kết thanh toán khi gửi hàng' }
                ];
                // Calculate remaining after this payment
                const depRow2 = await db.get(
                    `SELECT COALESCE(SUM(amount), 0) AS dep FROM payment_records WHERE total_order_codes ILIKE '%' || $1 || '%' OR order_tt_coc = $1`,
                    [order.order_code]
                );
                const depTotal2 = Number(depRow2?.dep) || 0;
                const totalAmt = Number(order.total_amount) || 0;
                const shipCk2 = 0;
                const rem2 = totalAmt - discAmt - Math.max(depTotal2, Number(order.deposit_amount_cache) || 0);
                prChanges.push({ field: 'remaining', label: 'Còn lại sau GD', old: null, new: String(rem2) });
                const prSummary = `💰 Thanh toán khi gửi hàng: ${prAmt.toLocaleString('vi-VN')}đ — Mã tiền: ${paymentLinkResult.payment_code}`;
                await db.run(`INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by) VALUES ($1,$2,$3,$4,$5)`, [
                    orderId, 'payment', prSummary, JSON.stringify(prChanges), request.user.id
                ]);
            }
        } catch(auditErr) { console.error('[AuditLog] ship:', auditErr.message); }

        return { success: true, message: resultMsg, cashflow_code: cashflowResult?.cashflow_code || null, payment_linked: paymentLinkResult?.payment_code || null };
    });

    // ========== RESCHEDULE — Hẹn lại ngày gửi ==========
    fastify.post('/api/shipping/orders/:id/reschedule', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;

        const { new_date, reason, page_type, image_base64, reschedule_hour, reschedule_minute } = request.body || {};
        if (!new_date) return reply.code(400).send({ error: 'Vui lòng chọn ngày gửi mới' });
        if (!reason || !reason.trim()) return reply.code(400).send({ error: 'Vui lòng nhập lý do' });

        if (page_type === 'qlx') {
            if (!image_base64) {
                return reply.code(400).send({ error: '⚠️ Hình Ảnh Nhắn Sale báo thời gian lùi đơn là bắt buộc' });
            }
            if (reschedule_hour === undefined || reschedule_hour === null || reschedule_hour === '') {
                return reply.code(400).send({ error: '⚠️ Vui lòng chọn giờ hẹn' });
            }
            if (reschedule_minute === undefined || reschedule_minute === null || reschedule_minute === '') {
                return reply.code(400).send({ error: '⚠️ Vui lòng chọn phút hẹn' });
            }
        }

        if (userRole !== 'giam_doc') {
            const kt = await isKeToan(userId);
            if (!kt) {
                if (page_type === 'qlx') {
                    // Check if they have don_hang_hom_nay_qlx permission
                    let hasAccess = false;
                    const userPerm = await db.get(
                        `SELECT can_view FROM user_permissions WHERE user_id = $1 AND feature_key = 'don_hang_hom_nay_qlx'`,
                        [userId]
                    );
                    if (userPerm) {
                        if (userPerm.can_view === 1) hasAccess = true;
                        else if (userPerm.can_view === -1) hasAccess = false;
                    }
                    if (!hasAccess && (!userPerm || userPerm.can_view === 0)) {
                        const deptPerm = await db.get(
                            `SELECT dp.can_view FROM department_permissions dp
                             JOIN users u ON u.department_id = dp.department_id
                             WHERE u.id = $1 AND dp.feature_key = 'don_hang_hom_nay_qlx'`,
                            [userId]
                        );
                        if (deptPerm && deptPerm.can_view > 0) hasAccess = true;
                    }
                    if (!hasAccess) {
                        return reply.code(403).send({ error: '🔒 Bạn không có quyền thực hiện thao tác này' });
                    }
                } else {
                    return reply.code(403).send({ error: '🔒 Chỉ Kế Toán mới được hẹn lại ngày gửi' });
                }
            }
        }

        const todayStr = vnDateStr(vnNow());
        if (new_date <= todayStr) return reply.code(400).send({ error: 'Ngày gửi mới phải sau hôm nay' });

        // Sunday check
        const dObj = new Date(new_date + 'T00:00:00+07:00');
        const vnTimeMs = dObj.getTime();
        const utcd = new Date(vnTimeMs + 7 * 3600 * 1000);
        if (utcd.getUTCDay() === 0) {
            return reply.code(400).send({ error: '⚠️ Theo quy định không được hẹn vào ngày Chủ Nhật' });
        }

        // ★ Holiday check: cannot reschedule to a public holiday
        const holidayRow = await db.get('SELECT holiday_name FROM holidays WHERE holiday_date = $1', [new_date]);
        if (holidayRow) {
            return reply.code(400).send({ error: `⚠️ Không được hẹn vào ngày lễ: ${holidayRow.holiday_name}` });
        }

        // Limit days check
        try {
            const configKey = page_type === 'qlx' ? 'reschedule_limit_days_qlx' : 'reschedule_limit_days';
            const limitRow = await db.get("SELECT value FROM app_config WHERE key = ?", [configKey]);
            if (limitRow && limitRow.value) {
                const limitVal = parseInt(limitRow.value, 10);
                if (limitVal > 0) {
                    // Fetch holidays
                    const holidaysRows = await db.all("SELECT holiday_date FROM holidays");
                    const holidaysSet = new Set(holidaysRows.map(h => {
                        if (h.holiday_date instanceof Date) {
                            return vnDateStr(h.holiday_date);
                        }
                        return String(h.holiday_date).split('T')[0].split(' ')[0];
                    }));
                    
                    const validDates = [];
                    let checkDate = new Date(todayStr + 'T00:00:00+07:00');
                    let safety = 0;
                    while (validDates.length < limitVal && safety < 100) {
                        safety++;
                        checkDate.setDate(checkDate.getDate() + 1);
                        const y = checkDate.getFullYear();
                        const m = String(checkDate.getMonth() + 1).padStart(2, '0');
                        const d = String(checkDate.getDate()).padStart(2, '0');
                        const dateStr = `${y}-${m}-${d}`;
                        const dayOfWeek = checkDate.getDay();
                        const isSunday = dayOfWeek === 0;
                        const isHoliday = holidaysSet.has(dateStr);
                        if (!isSunday && !isHoliday) {
                            validDates.push(dateStr);
                        }
                    }
                    
                    if (!validDates.includes(new_date)) {
                        return reply.code(400).send({ error: `⚠️ Ngày hẹn phải nằm trong giới hạn ${limitVal} ngày làm việc gần nhất (${validDates.join(', ')})` });
                    }
                }
            }
        } catch(cfgErr) {
            console.error('[Reschedule limit check error]', cfgErr);
        }

        const orderId = Number(request.params.id);
        const order = await db.get('SELECT id, shipping_status, expected_ship_date, rescheduled_ship_date, order_code FROM dht_orders WHERE id = $1', [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });
        if (order.shipping_status === 'shipped') return reply.code(400).send({ error: 'Đơn hàng đã gửi, không thể hẹn lại' });

        const oldDate = order.rescheduled_ship_date || order.expected_ship_date;

        let image_url = null;
        if (image_base64) {
            try {
                const fs = require('fs');
                const path = require('path');
                const uploadDir = path.join(__dirname, '..', 'uploads', 'reschedule');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const filename = `resched_${Date.now()}_${Math.random().toString(36).substring(2,8)}.jpg`;
                const filePath = path.join(uploadDir, filename);
                fs.writeFileSync(filePath, buffer);
                image_url = `/uploads/reschedule/${filename}`;
            } catch(imgErr) {
                console.error('[Reschedule image upload error]', imgErr);
            }
        }

        // Save history
        await db.run(`
            INSERT INTO dht_shipping_reschedules (dht_order_id, old_date, new_date, reason, rescheduled_by, image_url, reschedule_hour, reschedule_minute)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [orderId, oldDate, new_date, reason.trim(), userId, image_url, reschedule_hour !== undefined ? Number(reschedule_hour) : null, reschedule_minute !== undefined ? Number(reschedule_minute) : null]);

        // Update order
        await db.run(`
            UPDATE dht_orders SET
                shipping_status = 'rescheduled',
                rescheduled_ship_date = $1,
                reschedule_reason = $2,
                last_updated_by = $3,
                last_updated_at = NOW(),
                rescheduled_ship_hour = $4,
                rescheduled_ship_minute = $5
            WHERE id = $6
        `, [new_date, reason.trim(), userId, reschedule_hour !== undefined ? Number(reschedule_hour) : null, reschedule_minute !== undefined ? Number(reschedule_minute) : null, orderId]);

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

        if (b.tracking_code) {
            const trackingCode = String(b.tracking_code).trim();
            if (trackingCode) {
                const dup = await db.get(`
                    SELECT order_code FROM (
                        SELECT order_code FROM dht_orders WHERE tracking_code = $1 AND id <> $2
                        UNION
                        SELECT o.order_code FROM dht_order_shipments s
                        JOIN dht_orders o ON s.dht_order_id = o.id
                        WHERE s.tracking_code = $1 AND s.dht_order_id <> $2
                        UNION
                        SELECT sample_order_code AS order_code FROM don_gui_ao_mau WHERE (tracking_code = $1 OR hoan_hang_tracking_code = $1)
                    ) LIMIT 1
                `, [trackingCode, orderId]);
                if (dup) {
                    return reply.code(400).send({ error: `⚠️ Mã Vận Đơn * này đã bị trùng với đơn ${dup.order_code}` });
                }
            }
        }
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

    // ========== HISTORY — Lịch sử hẹn lại ==========
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

    // ========== MATCHING PAYMENTS — Tìm mã tiền phù hợp để thanh toán khi gửi hàng ==========
    fastify.get('/api/shipping/matching-payments', { preHandler: [authenticate] }, async (request, reply) => {
        const { order_code, target_amount } = request.query;
        if (!order_code || !target_amount) return reply.code(400).send({ error: 'Missing order_code or target_amount' });

        const target = Number(target_amount);
        if (isNaN(target) || target <= 0) return { payments: [], target_amount: 0 };

        const payments = await db.all(`
            SELECT pr.id, pr.payment_code, pr.payment_type,
                   pr.amount AS original_amount,
                   CASE 
                       WHEN pr.payment_type IN ('pending', 'parent_sll') THEN GREATEST(0, pr.amount - COALESCE(pr_child.child_sum, 0))
                       ELSE 0 
                   END AS amount,
                   pr.payment_date,
                   pr.payment_method, pr.bank_name, pr.transfer_note,
                   pr.customer_name, pr.customer_phone,
                   ABS((CASE 
                       WHEN pr.payment_type IN ('pending', 'parent_sll') THEN GREATEST(0, pr.amount - COALESCE(pr_child.child_sum, 0))
                       ELSE 0 
                   END) - $1) AS diff,
                   CASE 
                       WHEN pr.payment_type IN ('pending', 'parent_sll') THEN GREATEST(0, pr.amount - COALESCE(pr_child.child_sum, 0))
                       ELSE 0 
                   END AS surplus
            FROM payment_records pr
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS child_sum
                FROM payment_records
                WHERE payment_type = 'child_sll' AND (parent_id = pr.id OR source_ref_id = pr.id::text)
            ) pr_child ON true
            WHERE COALESCE(pr.payment_type, '') NOT IN ('tra_lai_coc', 'child_sll')
              AND COALESCE(pr.source, '') != 'cashflow_chi'
              AND COALESCE(pr.money_source, 'khach_hang') != 'nha_van_chuyen'
            ORDER BY ABS((CASE 
                       WHEN pr.payment_type IN ('pending', 'parent_sll') THEN GREATEST(0, pr.amount - COALESCE(pr_child.child_sum, 0))
                       ELSE 0 
                   END) - $1) ASC
        `, [target]);

        // Add match_level for UI styling
        for (const p of payments) {
            const d = Number(p.diff);
            if (d === 0) p.match_level = 'exact';
            else if (d <= 50000) p.match_level = 'close';
            else if (d <= 500000) p.match_level = 'approximate';
            else p.match_level = 'far';
        }

        return { payments, target_amount: target };
    });

    // ========== CARRIERS — Lấy danh sách NVC ==========
    fastify.get('/api/shipping/carriers', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all('SELECT id, name, allow_update_later FROM dht_carriers WHERE is_active = true ORDER BY display_order ASC, id ASC');
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

    // ========== Image Proxy: Resolve prnt.sc / lightshot to direct image URL ==========
    fastify.get('/api/shipping/resolve-image', { preHandler: [authenticate] }, async (request, reply) => {
        const url = request.query.url;
        if (!url) return reply.code(400).send({ error: 'Missing url' });
        try {
            // For prnt.sc links, fetch the page and extract og:image
            if (url.includes('prnt.sc') || url.includes('prntscr.com')) {
                const https = require('https');
                const http = require('http');
                const fetchPage = (u) => new Promise((resolve, reject) => {
                    const mod = u.startsWith('https') ? https : http;
                    mod.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (res) => {
                        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                            return fetchPage(res.headers.location).then(resolve).catch(reject);
                        }
                        let body = '';
                        res.on('data', c => body += c);
                        res.on('end', () => resolve(body));
                    }).on('error', reject);
                });
                const html = await fetchPage(url);
                // Extract og:image meta tag
                const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
                if (ogMatch && ogMatch[1]) {
                    return { direct_url: ogMatch[1] };
                }
                // Fallback: look for image in screenshot-image id
                const imgMatch = html.match(/<img[^>]*id=["']screenshot-image["'][^>]*src=["']([^"']+)["']/i);
                if (imgMatch && imgMatch[1]) {
                    return { direct_url: imgMatch[1] };
                }
                return { direct_url: null, fallback: url };
            }
            // For other URLs, just return as-is
            return { direct_url: url };
        } catch(e) {
            console.error('[ImageProxy]', e.message);
            return { direct_url: null, fallback: url };
        }
    });

    fastify.post('/api/shipping/orders/:id/update-shipment-details', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;

        if (userRole !== 'giam_doc') {
            const kt = await isKeToan(userId);
            if (!kt) return reply.code(403).send({ error: '🔒 Chỉ Kế Toán mới được cập nhật thông tin gửi hàng' });
        }

        const rawId = String(request.params.id);
        const b = request.body || {};

        const shipFee = Number(b.shipping_fee) || 0;
        if (isNaN(shipFee) || shipFee < 0) return reply.code(400).send({ error: 'Phí gửi hàng không hợp lệ' });

        if (!b.shipping_fee_payer || !['hv', 'khach'].includes(b.shipping_fee_payer)) {
            return reply.code(400).send({ error: 'Vui lòng chọn Người trả phí' });
        }
        if (!b.shipping_fee_method || !['ck', 'tm'].includes(b.shipping_fee_method)) {
            return reply.code(400).send({ error: 'Vui lòng chọn Hình thức trả' });
        }

        const now = vnNow();
        const todayStr = vnDateStr(now);

        if (rawId.startsWith('sample_hoan_')) {
            const sampleId = Number(rawId.replace('sample_hoan_', ''));
            const order = await db.get('SELECT id, sample_order_code AS order_code, total_amount, deposit_amount, actual_carrier_id, customer_name, customer_phone, created_by FROM don_gui_ao_mau WHERE id = $1', [sampleId]);
            if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng mẫu' });

            if (b.tracking_code) {
                const trackingCode = String(b.tracking_code).trim();
                if (trackingCode) {
                    const dup = await db.get(`
                        SELECT order_code FROM (
                            SELECT order_code FROM dht_orders WHERE tracking_code = $1
                            UNION
                            SELECT o.order_code FROM dht_order_shipments s
                            JOIN dht_orders o ON s.dht_order_id = o.id
                            WHERE s.tracking_code = $1
                            UNION
                            SELECT sample_order_code AS order_code FROM don_gui_ao_mau WHERE (tracking_code = $1 OR hoan_hang_tracking_code = $1) AND id <> $2
                        ) LIMIT 1
                    `, [trackingCode, sampleId]);
                    if (dup) {
                        return reply.code(400).send({ error: `⚠️ Mã Vận Đơn * này đã bị trùng với đơn ${dup.order_code}` });
                    }
                }
            }

            const sets = [
                `hoan_hang_is_pending_update = false`,
                `return_shipping_fee = $1`,
                `return_payer = $2`,
                `return_payment_method = $3`,
                `updated_at = NOW()`,
                `updated_by = $4`
            ];
            const params = [shipFee, b.shipping_fee_payer, b.shipping_fee_method, userId];
            let idx = 5;

            if (b.tracking_code) { sets.push(`hoan_hang_tracking_code = $${idx++}`); params.push(b.tracking_code); }
            if (b.shipping_bill_link) { sets.push(`hoan_hang_shipping_bill_link = $${idx++}`); params.push(b.shipping_bill_link); }

            let cashflowResult = null;
            let cfDescription = null;
            if (b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'tm' && shipFee > 0) {
                try {
                    const seq = await _getNextTMSeq(todayStr);
                    const cfCode = _buildTMCode(seq, todayStr);
                    cfDescription = `Gửi ship lần 2 đơn mẫu hoàn ${order.order_code} (cập nhật sau)`;
                    const cfImageUrl = b.shipping_bill_link || null;

                    await db.run(`
                        INSERT INTO payment_records (payment_code, payment_method, daily_seq, amount, payment_type, transfer_note, money_source, source, payment_date, created_by)
                        VALUES ($1, 'TM', $2, $3, 'chi', $4, 'congty', 'cashflow_chi', $5, $6)
                    `, [cfCode, seq, shipFee, cfDescription, todayStr, userId]);

                    cashflowResult = await db.get(`
                        INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, order_code, image_url, money_source, created_by)
                        VALUES ($1, 'CHI', $2, $3, $4, $5, $6, $7, 'congty', $8)
                        RETURNING id, cashflow_code
                    `, [cfCode, seq, todayStr, cfDescription, shipFee, order.order_code, cfImageUrl, userId]);

                    sets.push(`hoan_hang_shipping_cashflow_id = $${idx++}`);
                    params.push(cashflowResult.id);
                } catch (cfErr) {
                    console.error('[Update Return Sample Cashflow] Error:', cfErr.message);
                    return reply.code(500).send({ error: 'Lỗi tạo phiếu chi tiền ship hoàn: ' + cfErr.message });
                }
            }

            if (b.selected_payment_id) {
                sets.push(`hoan_hang_shipping_payment_id = $${idx++}`);
                params.push(Number(b.selected_payment_id));
            }

            params.push(sampleId);
            await db.run(`UPDATE don_gui_ao_mau SET ${sets.join(', ')} WHERE id = $${idx}`, params);

            await db.run(
                `INSERT INTO don_gui_ao_mau_logs (sample_order_id, action, summary, performed_by) VALUES ($1, $2, $3, $4)`,
                [sampleId, 'update_ship_hoan', `Cập nhật thông tin gửi hàng hoàn. Phí ship: ${shipFee}đ`, userId]
            );

            return { success: true };
        } else if (rawId.startsWith('sample_')) {
            const sampleId = Number(rawId.replace('sample_', ''));
            const order = await db.get('SELECT id, sample_order_code AS order_code, total_amount, deposit_amount, actual_carrier_id, customer_name, customer_phone, created_by FROM don_gui_ao_mau WHERE id = $1', [sampleId]);
            if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng mẫu' });

            if (b.tracking_code) {
                const trackingCode = String(b.tracking_code).trim();
                if (trackingCode) {
                    const dup = await db.get(`
                        SELECT order_code FROM (
                            SELECT order_code FROM dht_orders WHERE tracking_code = $1
                            UNION
                            SELECT o.order_code FROM dht_order_shipments s
                            JOIN dht_orders o ON s.dht_order_id = o.id
                            WHERE s.tracking_code = $1
                            UNION
                            SELECT sample_order_code AS order_code FROM don_gui_ao_mau WHERE (tracking_code = $1 OR hoan_hang_tracking_code = $1) AND id <> $2
                        ) LIMIT 1
                    `, [trackingCode, sampleId]);
                    if (dup) {
                        return reply.code(400).send({ error: `⚠️ Mã Vận Đơn * này đã bị trùng với đơn ${dup.order_code}` });
                    }
                }
            }

            const sets = [
                `is_pending_update = false`,
                `shipping_fee = $1`,
                `shipping_fee_payer = $2`,
                `shipping_fee_method = $3`,
                `updated_at = NOW()`,
                `updated_by = $4`
            ];
            const params = [shipFee, b.shipping_fee_payer, b.shipping_fee_method, userId];
            let idx = 5;

            if (b.tracking_code) { sets.push(`tracking_code = $${idx++}`); params.push(b.tracking_code); }
            if (b.shipping_bill_link) { sets.push(`shipping_bill_link = $${idx++}`); params.push(b.shipping_bill_link); }

            let cashflowResult = null;
            let cfDescription = null;
            if (b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'tm' && shipFee > 0) {
                try {
                    const seq = await _getNextTMSeq(todayStr);
                    const cfCode = _buildTMCode(seq, todayStr);
                    cfDescription = `Tiền ship gửi mẫu đơn ${order.order_code} (cập nhật sau)`;
                    const cfImageUrl = b.shipping_bill_link || null;

                    await db.run(`
                        INSERT INTO payment_records (payment_code, payment_method, daily_seq, amount, payment_type, transfer_note, money_source, source, payment_date, created_by)
                        VALUES ($1, 'TM', $2, $3, 'chi', $4, 'congty', 'cashflow_chi', $5, $6)
                    `, [cfCode, seq, shipFee, cfDescription, todayStr, userId]);

                    cashflowResult = await db.get(`
                        INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, order_code, image_url, money_source, created_by)
                        VALUES ($1, 'CHI', $2, $3, $4, $5, $6, $7, 'congty', $8)
                        RETURNING id, cashflow_code
                    `, [cfCode, seq, todayStr, cfDescription, shipFee, order.order_code, cfImageUrl, userId]);

                    sets.push(`shipping_cashflow_id = $${idx++}`);
                    params.push(cashflowResult.id);
                } catch (cfErr) {
                    console.error('[Update Sample Cashflow] Error:', cfErr.message);
                    return reply.code(500).send({ error: 'Lỗi tạo phiếu chi tiền ship: ' + cfErr.message });
                }
            }

            if (b.selected_payment_id) {
                sets.push(`shipping_payment_id = $${idx++}`);
                params.push(Number(b.selected_payment_id));
            }

            params.push(sampleId);
            await db.run(`UPDATE don_gui_ao_mau SET ${sets.join(', ')} WHERE id = $${idx}`, params);

            let paymentLinkResult = null;
            if (b.selected_payment_id) {
                const prId = Number(b.selected_payment_id);
                try {
                    const pr = await db.get('SELECT * FROM payment_records WHERE id = $1', [prId]);
                    if (pr) {
                        const childSumRow = await db.get(`
                            SELECT COALESCE(SUM(amount), 0) AS child_sum
                            FROM payment_records
                            WHERE payment_type = 'child_sll' AND (parent_id = $1 OR source_ref_id = $1::text)
                        `, [prId]);
                        
                        const paidRow = await db.get(
                            `SELECT COALESCE(SUM(amount), 0) AS paid_total
                             FROM payment_records
                             WHERE order_ao_mau = $1`,
                            [order.order_code]
                        );
                        const paidTotal = Number(paidRow?.paid_total) || 0;
                        const isCarrier = pr.money_source === 'nha_van_chuyen';
                        const parentShipFee = isCarrier ? (Number(pr.shipping_fee || 0)) : 0;
                        const remainingDebt = Math.max(0, (Number(order.total_amount) || 0) - paidTotal - ((!isCarrier && b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'ck' && b.selected_payment_id) ? shipFee : 0));

                        const remainingBalance = pr.amount + parentShipFee - Number(childSumRow.child_sum || 0);
                        const allocAmount = Math.min(remainingBalance, remainingDebt);

                        if (allocAmount > 0) {
                            const childCountRow = await db.get(`
                                SELECT COUNT(*) AS cnt FROM payment_records
                                WHERE payment_type = 'child_sll' AND (parent_id = $1 OR source_ref_id = $1::text)
                            `, [prId]);
                            const childIdx = Number(childCountRow.cnt) + 1;

                            if (childIdx === 1 && allocAmount === Number(pr.amount) && pr.money_source !== 'nha_van_chuyen') {
                                await db.run(`
                                    UPDATE payment_records SET
                                        payment_type = 'thanh_toan',
                                        order_tt_coc = NULL,
                                        order_ao_mau = $1,
                                        customer_name = $2,
                                        customer_phone = $3,
                                        cskh_user_id = $4,
                                        money_source = 'khach_hang',
                                        transfer_note = $5,
                                        updated_at = NOW()
                                    WHERE id = $6
                                `, [
                                    order.order_code,
                                    order.customer_name || null,
                                    order.customer_phone || null,
                                    order.created_by || null,
                                    (pr.transfer_note || '') + ' (Thanh toán đơn mẫu ' + order.order_code + ' khi gửi hàng)',
                                    prId
                                ]);
                                paymentLinkResult = { id: prId, payment_code: pr.payment_code, amount: allocAmount };
                            } else {
                                const splitCode = `${pr.payment_code}-S${childIdx}`;
                                await db.run(`
                                    INSERT INTO payment_records (
                                        payment_code, payment_method, daily_seq,
                                        customer_name, customer_phone, cskh_user_id,
                                        amount, payment_type,
                                        order_tt_coc, order_ao_mau,
                                        transfer_note, money_source, bank_name,
                                        total_order_codes, total_cod, shipping_fee,
                                        handover_status, handover_at, handover_by,
                                        source, source_ref_id, payment_date, created_by,
                                        parent_id
                                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
                                `, [
                                    splitCode, pr.payment_method, pr.daily_seq,
                                    order.customer_name || null, order.customer_phone || null, order.created_by || null,
                                    allocAmount, 'child_sll',
                                    null, order.order_code,
                                    (pr.transfer_note || '') + ' (Thanh toán đơn mẫu ' + order.order_code + ' khi gửi hàng)',
                                    'khach_hang', pr.bank_name || null,
                                    null, 0, 0,
                                    'chua_bangiao',
                                    pr.handover_at || null,
                                    pr.handover_by || null,
                                    pr.source, null, pr.payment_date, userId,
                                    prId
                                ]);

                                const totalAllocationsCount = childIdx;
                                const moneySource = totalAllocationsCount >= 2 ? 'khach_hang_sll' : 'khach_hang';
                                await db.run(`
                                    UPDATE payment_records SET
                                        payment_type = 'parent_sll',
                                        order_tt_coc = NULL,
                                        total_order_codes = NULL,
                                        customer_name = COALESCE(customer_name, $1),
                                        customer_phone = COALESCE(customer_phone, $2),
                                        cskh_user_id = COALESCE(cskh_user_id, $3),
                                        money_source = $4,
                                        updated_at = NOW()
                                    WHERE id = $5
                                `, [
                                    order.customer_name || null,
                                    order.customer_phone || null,
                                    order.created_by || null,
                                    moneySource,
                                    prId
                                ]);

                                paymentLinkResult = { id: prId, payment_code: pr.payment_code, amount: allocAmount };
                            }
                        }
                    }
                } catch (prErr) {
                    console.error('[Update Sample Payment] Link error:', prErr.message);
                }
            }

            let logSummary = `Kế toán đã cập nhật phí/bill cho đơn hàng mẫu (NVC: ${order.actual_carrier_id}, Ship fee: ${shipFee})`;
            if (paymentLinkResult) {
                logSummary += ` — Thanh toán: ${paymentLinkResult.payment_code} (${Number(paymentLinkResult.amount).toLocaleString('vi-VN')}đ)`;
            }
            await db.run(
                `INSERT INTO don_gui_ao_mau_logs (sample_order_id, action, summary, performed_by) VALUES ($1, $2, $3, $4)`,
                [sampleId, 'update_shipment', logSummary, userId]
            );

            if (cashflowResult && b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'tm' && shipFee > 0) {
                try {
                    const tgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cashflow_group'");
                    if (tgRow && tgRow.value) {
                        const { sendTelegramMessage } = require('../utils/telegram');
                        const amtStr = shipFee.toLocaleString('vi-VN');
                        const thuSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='THU' AND is_closed=false AND NOT (money_source='cophanmay' AND cashflow_code LIKE 'CPMAY-%')");
                        const chiSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='CHI' AND is_closed=false");
                        const runBal = Number(thuSum.t) - Number(chiSum.t);
                        const balStr = runBal.toLocaleString('vi-VN');
                        const msg = `🔴CHI TM <b>CÔNG TY</b> :\n💰${cashflowResult.cashflow_code} : <b>${amtStr}đ</b> ${cfDescription} 👤 ${request.user.full_name || request.user.username}\n\n🔗Tổng Kế Toán Cầm : <b>${balStr}đ</b>`;
                        await sendTelegramMessage(tgRow.value, msg);
                    }
                } catch (tgErr) { console.error('[Ship TG] Error:', tgErr.message); }
            }

            let resultMsgParts = [`✅ Đã cập nhật thông tin đơn mẫu ${order.order_code}`];
            if (cashflowResult) resultMsgParts.push(`Phiếu chi ship: ${cashflowResult.cashflow_code}`);
            if (paymentLinkResult) resultMsgParts.push(`Thanh toán: ${paymentLinkResult.payment_code} (${Number(paymentLinkResult.amount).toLocaleString('vi-VN')}đ)`);
            return { success: true, message: resultMsgParts.join(' | ') };

        } else {
            const orderId = Number(rawId);
            const order = await db.get('SELECT id, shipping_status, order_code, total_amount, discount_amount, deposit_amount_cache, actual_carrier_id, customer_name, customer_phone, cskh_user_id FROM dht_orders WHERE id = $1', [orderId]);
            if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });

            if (b.tracking_code) {
                const trackingCode = String(b.tracking_code).trim();
                if (trackingCode) {
                    const dup = await db.get(`
                        SELECT order_code FROM (
                            SELECT order_code FROM dht_orders WHERE tracking_code = $1 AND id <> $2
                            UNION
                            SELECT o.order_code FROM dht_order_shipments s
                            JOIN dht_orders o ON s.dht_order_id = o.id
                            WHERE s.tracking_code = $1 AND s.dht_order_id <> $2
                            UNION
                            SELECT sample_order_code AS order_code FROM don_gui_ao_mau WHERE (tracking_code = $1 OR hoan_hang_tracking_code = $1)
                        ) LIMIT 1
                    `, [trackingCode, orderId]);
                    if (dup) {
                        return reply.code(400).send({ error: `⚠️ Mã Vận Đơn * này đã bị trùng với đơn ${dup.order_code}` });
                    }
                }
            }

            let cashflowResult = null;
            let cfDescription = null;
            if (b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'tm' && shipFee > 0) {
                try {
                    const seq = await _getNextTMSeq(todayStr);
                    const cfCode = _buildTMCode(seq, todayStr);
                    
                    const existingShipments = await db.all(`
                        SELECT id FROM dht_order_shipments WHERE dht_order_id = $1
                    `, [orderId]);
                    const shipmentCount = existingShipments.length;
                    
                    cfDescription = `Cập nhật tiền ship đơn ${order.order_code}`;
                    if (shipmentCount > 1) {
                        cfDescription = `Cập nhật tiền ship lần ${shipmentCount} đơn ${order.order_code}`;
                    }
                    const cfImageUrl = b.shipping_bill_link || null;

                    await db.run(`
                        INSERT INTO payment_records (payment_code, payment_method, daily_seq, amount, payment_type, transfer_note, money_source, source, payment_date, created_by)
                        VALUES ($1, 'TM', $2, $3, 'chi', $4, 'congty', 'cashflow_chi', $5, $6)
                    `, [cfCode, seq, shipFee, cfDescription, todayStr, userId]);

                    cashflowResult = await db.get(`
                        INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, order_code, image_url, money_source, created_by)
                        VALUES ($1, 'CHI', $2, $3, $4, $5, $6, $7, 'congty', $8)
                        RETURNING id, cashflow_code
                    `, [cfCode, seq, todayStr, cfDescription, shipFee, order.order_code, cfImageUrl, userId]);

                    try {
                        const tgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cashflow_group'");
                        if (tgRow && tgRow.value) {
                            const { sendTelegramMessage } = require('../utils/telegram');
                            const amtStr = shipFee.toLocaleString('vi-VN');
                            const thuSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='THU' AND is_closed=false AND NOT (money_source='cophanmay' AND cashflow_code LIKE 'CPMAY-%')");
                            const chiSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='CHI' AND is_closed=false");
                            const runBal = Number(thuSum.t) - Number(chiSum.t);
                            const balStr = runBal.toLocaleString('vi-VN');
                            const msg = `🔴CHI TM <b>CÔNG TY</b> :\n💰${cfCode} : <b>${amtStr}đ</b> ${cfDescription} 👤 ${request.user.full_name || request.user.username}\n\n🔗Tổng Kế Toán Cầm : <b>${balStr}đ</b>`;
                            await sendTelegramMessage(tgRow.value, msg);
                        }
                    } catch (tgErr) { console.error('[Ship TG] Error:', tgErr.message); }
                } catch (cfErr) {
                    console.error('[Update Cashflow] Error:', cfErr.message);
                    return reply.code(500).send({ error: 'Lỗi tạo phiếu chi tiền ship: ' + cfErr.message });
                }
            }

            const orderSets = [
                `is_pending_update = false`,
                `shipping_fee = $1`,
                `shipping_fee_payer = $2`,
                `shipping_fee_method = $3`,
                `last_updated_by = $4`,
                `last_updated_at = NOW()`
            ];
            const orderParams = [shipFee, b.shipping_fee_payer, b.shipping_fee_method, userId];
            let oIdx = 5;

            if (b.tracking_code) { orderSets.push(`tracking_code = $${oIdx++}`); orderParams.push(b.tracking_code); }
            if (b.shipping_bill_link) { orderSets.push(`shipping_bill_link = $${oIdx++}`); orderParams.push(b.shipping_bill_link); }
            if (b.carrier_phone) { orderSets.push(`carrier_phone = $${oIdx++}`); orderParams.push(b.carrier_phone); }
            if (b.receiver_name) { orderSets.push(`receiver_name = $${oIdx++}`); orderParams.push(b.receiver_name); }
            if (cashflowResult) { orderSets.push(`shipping_cashflow_id = $${oIdx++}`); orderParams.push(cashflowResult.id); }
            if (b.selected_payment_id) { orderSets.push(`shipping_payment_id = $${oIdx++}`); orderParams.push(Number(b.selected_payment_id)); }

            orderParams.push(orderId);
            await db.run(`UPDATE dht_orders SET ${orderSets.join(', ')} WHERE id = $${oIdx}`, orderParams);

            const itemSets = [
                `is_pending_update = false`,
                `shipping_fee = $1`,
                `shipping_fee_payer = $2`,
                `shipping_fee_method = $3`
            ];
            const itemParams = [shipFee, b.shipping_fee_payer, b.shipping_fee_method];
            let itemIdx = 4;

            if (b.tracking_code) { itemSets.push(`tracking_code = $${itemIdx++}`); itemParams.push(b.tracking_code); }
            if (b.shipping_bill_link) { itemSets.push(`shipping_bill_link = $${itemIdx++}`); itemParams.push(b.shipping_bill_link); }
            if (b.carrier_phone) { itemSets.push(`carrier_phone = $${itemIdx++}`); itemParams.push(b.carrier_phone); }
            if (b.receiver_name) { itemSets.push(`receiver_name = $${itemIdx++}`); itemParams.push(b.receiver_name); }
            if (cashflowResult) { itemSets.push(`shipping_cashflow_id = $${itemIdx++}`); itemParams.push(cashflowResult.id); }
            if (b.selected_payment_id) { itemSets.push(`shipping_payment_id = $${itemIdx++}`); itemParams.push(Number(b.selected_payment_id)); }

            itemParams.push(orderId);
            await db.run(`UPDATE dht_order_items SET ${itemSets.join(', ')} WHERE dht_order_id = $${itemIdx} AND is_pending_update = true`, itemParams);

            const shipSets = [
                `is_pending_update = false`,
                `shipping_fee = $1`,
                `shipping_fee_payer = $2`,
                `shipping_fee_method = $3`
            ];
            const shipParams = [shipFee, b.shipping_fee_payer, b.shipping_fee_method];
            let sIdx = 4;

            if (b.tracking_code) { shipSets.push(`tracking_code = $${sIdx++}`); shipParams.push(b.tracking_code); }
            if (b.shipping_bill_link) { shipSets.push(`shipping_bill_link = $${sIdx++}`); shipParams.push(b.shipping_bill_link); }
            if (b.carrier_phone) { shipSets.push(`carrier_phone = $${sIdx++}`); shipParams.push(b.carrier_phone); }
            if (b.receiver_name) { shipSets.push(`receiver_name = $${sIdx++}`); shipParams.push(b.receiver_name); }
            if (cashflowResult) { shipSets.push(`shipping_cashflow_id = $${sIdx++}`); shipParams.push(cashflowResult.id); }
            if (b.selected_payment_id) { shipSets.push(`shipping_payment_id = $${sIdx++}`); shipParams.push(Number(b.selected_payment_id)); }

            shipParams.push(orderId);
            await db.run(`UPDATE dht_order_shipments SET ${shipSets.join(', ')} WHERE dht_order_id = $${sIdx} AND is_pending_update = true`, shipParams);

            let paymentLinkResult = null;
            if (b.selected_payment_id) {
                const prId = Number(b.selected_payment_id);
                try {
                    const pr = await db.get('SELECT * FROM payment_records WHERE id = $1', [prId]);
                    if (pr) {
                        const childSumRow = await db.get(`
                            SELECT COALESCE(SUM(amount), 0) AS child_sum
                            FROM payment_records
                            WHERE payment_type = 'child_sll' AND (parent_id = $1 OR source_ref_id = $1::text)
                        `, [prId]);
                        
                        const depRow = await db.get(
                            `SELECT COALESCE(SUM(amount), 0) AS deposit_total
                             FROM payment_records
                             WHERE total_order_codes ILIKE '%' || $1 || '%'
                                OR order_tt_coc = $1`,
                            [order.order_code]
                        );
                        const depositTotal = Number(depRow?.deposit_total) || 0;
                        const isCarrier = pr.money_source === 'nha_van_chuyen';
                        const parentShipFee = isCarrier ? (Number(pr.shipping_fee || 0)) : 0;
                        const remainingDebt = Math.max(0, (Number(order.total_amount) || 0)
                            - (Number(order.discount_amount) || 0)
                            - Math.max(depositTotal, Number(order.deposit_amount_cache) || 0)
                            - ((!isCarrier && b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'ck' && b.selected_payment_id) ? shipFee : 0));

                        const remainingBalance = pr.amount + parentShipFee - Number(childSumRow.child_sum || 0);
                        const allocAmount = Math.min(remainingBalance, remainingDebt);

                        if (allocAmount > 0) {
                            const childCountRow = await db.get(`
                                SELECT COUNT(*) AS cnt FROM payment_records
                                WHERE payment_type = 'child_sll' AND (parent_id = $1 OR source_ref_id = $1::text)
                            `, [prId]);
                            const childIdx = Number(childCountRow.cnt) + 1;

                            if (childIdx === 1 && allocAmount === Number(pr.amount) && pr.money_source !== 'nha_van_chuyen') {
                                await db.run(`
                                    UPDATE payment_records SET
                                        payment_type = 'thanh_toan',
                                        order_tt_coc = $1,
                                        order_ao_mau = NULL,
                                        customer_name = $2,
                                         customer_phone = $3,
                                         cskh_user_id = $4,
                                         money_source = 'khach_hang',
                                        transfer_note = $5,
                                        updated_at = NOW()
                                    WHERE id = $6
                                `, [
                                     order.order_code,
                                     order.customer_name || null,
                                     order.customer_phone || null,
                                     order.cskh_user_id || null,
                                     (pr.transfer_note || '') + ' (Thanh toán đơn ' + order.order_code + ' khi gửi hàng)',
                                     prId
                                 ]);
                                paymentLinkResult = { id: prId, payment_code: pr.payment_code, amount: allocAmount };
                            } else {
                                const splitCode = `${pr.payment_code}-S${childIdx}`;
                                await db.run(`
                                    INSERT INTO payment_records (
                                        payment_code, payment_method, daily_seq,
                                        customer_name, customer_phone, cskh_user_id,
                                        amount, payment_type,
                                        order_tt_coc, order_ao_mau,
                                        transfer_note, money_source, bank_name,
                                        total_order_codes, total_cod, shipping_fee,
                                        handover_status, handover_at, handover_by,
                                        source, source_ref_id, payment_date, created_by,
                                        parent_id
                                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
                                `, [
                                    splitCode, pr.payment_method, pr.daily_seq,
                                    order.customer_name || null, order.customer_phone || null, order.cskh_user_id || null,
                                    allocAmount, 'child_sll',
                                    order.order_code, null,
                                    (pr.transfer_note || '') + ' (Thanh toán đơn ' + order.order_code + ' khi gửi hàng)',
                                    'khach_hang', pr.bank_name || null,
                                    null, 0, 0,
                                    'chua_bangiao',
                                    pr.handover_at || null,
                                    pr.handover_by || null,
                                    pr.source, null, pr.payment_date, userId,
                                    prId
                                ]);

                                const totalAllocationsCount = childIdx;
                                const moneySource = totalAllocationsCount >= 2 ? 'khach_hang_sll' : 'khach_hang';
                                await db.run(`
                                    UPDATE payment_records SET
                                        payment_type = 'parent_sll',
                                        order_tt_coc = NULL,
                                        total_order_codes = NULL,
                                        customer_name = COALESCE(customer_name, $1),
                                         customer_phone = COALESCE(customer_phone, $2),
                                         cskh_user_id = COALESCE(cskh_user_id, $3),
                                         money_source = $4,
                                        updated_at = NOW()
                                    WHERE id = $5
                                `, [
                                     order.customer_name || null,
                                     order.customer_phone || null,
                                     order.cskh_user_id || null,
                                     moneySource,
                                     prId
                                 ]);

                                paymentLinkResult = { id: prId, payment_code: pr.payment_code, amount: allocAmount };
                            }
                        }
                    }
                } catch (prErr) {
                    console.error('[Update Payment] Link error:', prErr.message);
                }
            }

            try {
                let logSummary = `Kế toán đã cập nhật phí/bill cho đơn hàng (NVC: ${order.actual_carrier_id}, Ship fee: ${shipFee})`;
                if (paymentLinkResult) {
                    logSummary += ` — Thanh toán: ${paymentLinkResult.payment_code} (${Number(paymentLinkResult.amount).toLocaleString('vi-VN')}đ)`;
                }
                await db.run(`
                    INSERT INTO dht_order_logs (dht_order_id, action, summary, performed_by)
                    VALUES ($1, 'update_shipment', $2, $3)
                `, [orderId, logSummary, userId]);
            } catch(logErr) {}

            let resultMsgParts = [`✅ Đã cập nhật thông tin đơn hàng ${order.order_code}`];
            if (cashflowResult) resultMsgParts.push(`Phiếu chi ship: ${cashflowResult.cashflow_code}`);
            if (paymentLinkResult) resultMsgParts.push(`Thanh toán: ${paymentLinkResult.payment_code} (${Number(paymentLinkResult.amount).toLocaleString('vi-VN')}đ)`);
            return { success: true, message: resultMsgParts.join(' | ') };
        }
    });

    fastify.post('/api/shipping/carriers/update-settings', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;

        if (userRole !== 'giam_doc') {
            const kt = await isKeToan(userId);
            if (!kt) return reply.code(403).send({ error: '🔒 Chỉ Kế Toán/Giám Đốc mới được thay đổi cấu hình nhà vận chuyển' });
        }

        const b = request.body || {};
        const settings = b.settings || {};

        for (const [carrierId, allow] of Object.entries(settings)) {
            await db.run('UPDATE dht_carriers SET allow_update_later = $1 WHERE id = $2', [!!allow, Number(carrierId)]);
        }

        return { success: true, message: 'Đã cập nhật cấu hình nhà vận chuyển thành công' };
    });
};
