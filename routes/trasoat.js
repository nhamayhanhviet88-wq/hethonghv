// ========== TRA SOÁT ĐƠN HÀNG — Read-only Order Tracking Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow, vnDateStr } = require('../utils/timezone');

const FULL_VIEW_ROLES = ['giam_doc', 'quan_ly_cap_cao'];

module.exports = async function(fastify) {

    // ========== LIST — Danh sách đơn hàng + tiến độ ==========
    fastify.get('/api/trasoat/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const { search, month, year, status, current_step, page = 1, limit = 30 } = request.query;
        const userId = request.user.id;
        const userRole = request.user.role;

        const conditions = ['o.expected_ship_date IS NOT NULL'];
        const params = [];
        let idx = 1;

        // Permission: NV chỉ xem đơn mình tạo/CSKH
        if (!FULL_VIEW_ROLES.includes(userRole)) {
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
        if (month) { conditions.push(`EXTRACT(MONTH FROM o.expected_ship_date) = $${idx}`); params.push(Number(month)); idx++; }

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const todayStr = vnDateStr(vnNow());

        const rows = await db.all(`
            SELECT o.id, o.order_code, o.order_date, o.expected_ship_date,
                o.rescheduled_ship_date, o.shipping_status,
                o.customer_name, o.customer_phone, o.province,
                o.shipped_at, o.tracking_code, o.total_amount,
                o.parent_order_id,
                c.name AS category_name,
                u_cskh.full_name AS cskh_name,
                u_created.full_name AS created_by_name,
                cr2.name AS carrier_name,
                COALESCE((SELECT true FROM cutting_records cr WHERE cr.dht_order_id = o.id AND cr.is_cut_done = true LIMIT 1), false) AS cut_done,
                COALESCE((SELECT op.is_completed FROM dht_order_production op WHERE op.dht_order_id = o.id AND op.step_id = 3 LIMIT 1), false) AS print_done,
                COALESCE((SELECT op.is_completed FROM dht_order_production op WHERE op.dht_order_id = o.id AND op.step_id = 4 LIMIT 1), false) AS press_done,
                COALESCE((SELECT true FROM sewing_records sr WHERE sr.dht_order_id = o.id AND sr.done_date IS NOT NULL LIMIT 1), false) AS sew_done,
                COALESCE((SELECT true FROM finishing_records fr WHERE fr.dht_order_id = o.id AND fr.is_completed = true LIMIT 1), false) AS finish_done,
                COUNT(*) OVER() AS total_count
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN dht_carriers cr2 ON o.actual_carrier_id = cr2.id
            ${where}
            ORDER BY o.expected_ship_date DESC NULLS LAST, o.created_at DESC
            LIMIT $${idx++} OFFSET $${idx++}
        `, [...params, Number(limit), (Number(page) - 1) * Number(limit)]);

        const orders = rows.map(o => _processOrder(o, todayStr));

        // Post-query filters (computed fields)
        let filtered = orders;
        if (status && status !== 'all') filtered = filtered.filter(o => o.deviation_class === status);
        if (current_step) filtered = filtered.filter(o => o.current_step_name === current_step);

        return { orders: filtered, totalCount: rows.length > 0 ? Number(rows[0].total_count) : 0 };
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
                ct.name AS contractor_name
            FROM sewing_records sr
            LEFT JOIN users u ON sr.sewer_id = u.id
            LEFT JOIN sewing_contractors ct ON sr.contractor_id = ct.id
            WHERE sr.dht_order_id = $1 ORDER BY sr.created_at DESC
        `, [orderId]);

        // Finishing records
        const finishing = await db.all(`
            SELECT fr.*, u.full_name AS finisher_name
            FROM finishing_records fr LEFT JOIN users u ON fr.finisher_id = u.id
            WHERE fr.dht_order_id = $1 ORDER BY fr.created_at DESC
        `, [orderId]);

        // Printing records
        const printing = await db.all(`
            SELECT pr.*, u.full_name AS printer_name, c.name AS contractor_name
            FROM printing_records pr
            LEFT JOIN users u ON pr.printer_id = u.id
            LEFT JOIN printing_contractors c ON pr.contractor_id = c.id
            WHERE pr.dht_order_id = $1 ORDER BY pr.id ASC
        `, [orderId]);

        // Build timeline
        const code = (order.order_code || '').toUpperCase();
        const catName = (order.category_name || '').toUpperCase();
        const isPetTem = catName === 'PET' || catName === 'TEM' || code.includes('PET') || code.includes('TEM');
        const isShipped = order.shipping_status === 'shipped';

        // Determine print completion from printing_records
        // contractor_id != null → considered done (same as bophanin.js)
        const isPrintRecDone = p => p.contractor_id ? true : p.is_print_done;
        const allPrintDone = printing.length > 0 && printing.every(isPrintRecDone);
        const lastPrintDone = printing.filter(p => p.is_print_done).sort((a,b) => new Date(b.print_done_at||0) - new Date(a.print_done_at||0))[0];
        const contractorRec = printing.find(p => p.contractor_id);
        // Worker: show contractor name (🏭 prefix) or printer name
        const printWorker = contractorRec
            ? '🏭 ' + (contractorRec.contractor_name || 'Gia Công')
            : (lastPrintDone ? lastPrintDone.printer_name : (printing[0]?.printer_name || null));
        // Time: for contractor show created_at (bàn giao time), for normal show print_done_at
        const printTime = contractorRec
            ? contractorRec.created_at
            : (lastPrintDone?.print_done_at || null);
        const printFields = [...new Set(printing.map(p => p.print_field).filter(Boolean))].join(', ') || null;
        const printDoneCount = printing.filter(isPrintRecDone).length;
        const printTotalCount = printing.length;
        const printProgress = printTotalCount > 0 ? `${printDoneCount}/${printTotalCount}` : null;

        let timeline;
        if (isPetTem) {
            const printStep = prodSteps.find(s => s.step_id === 3);
            const printDone = allPrintDone || (printStep?.is_completed || false);
            timeline = [
                { name: 'In', short: 'IN', done: printDone, time: printTime || printStep?.completed_at, worker: printWorker || printStep?.completed_by_name, extra: printFields, progress: printProgress },
                { name: 'Gửi Hàng', short: 'GỬI', done: isShipped, time: order.shipped_at, worker: order.shipped_by_name }
            ];
        } else {
            const cutRec = cutting.find(c => c.is_cut_done);
            const printStep = prodSteps.find(s => s.step_id === 3);
            const pressStep = prodSteps.find(s => s.step_id === 4);
            const sewRec = sewing.find(s => s.done_date);
            const finRec = finishing.find(f => f.is_completed);

            const printDone = allPrintDone || (printStep?.is_completed || false);

            timeline = [
                { name: 'Cắt', short: 'CẮT', done: !!cutRec, time: cutRec?.cut_done_at || cutRec?.cutting_at, worker: cutRec?.cutter_name },
                { name: 'In', short: 'IN', done: printDone, time: printTime || printStep?.completed_at, worker: printWorker || printStep?.completed_by_name, extra: printFields, progress: printProgress },
                { name: 'Ép', short: 'ÉP', done: pressStep?.is_completed || false, time: pressStep?.completed_at, worker: pressStep?.completed_by_name },
                { name: 'May', short: 'MAY', done: !!sewRec, time: sewRec?.done_date, worker: sewRec?.sewer_name || sewRec?.contractor_name },
                { name: 'Kiểm Tra CL', short: 'QC', done: finRec ? true : false, time: null, worker: null },
                { name: 'Hoàn Thiện', short: 'HT', done: finRec?.is_completed || false, time: finRec?.completed_at, worker: finRec?.finisher_name },
                { name: 'Gửi Hàng', short: 'GỬI', done: isShipped, time: order.shipped_at, worker: order.shipped_by_name }
            ];
        }

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
                category_name: order.category_name
            },
            timeline,
            cutting: cutting.map(c => ({ cutter: c.cutter_name, fabric: c.fabric_name, kg: c.kg_cut, ratio: c.cut_ratio, started: c.cutting_at, done: c.cut_done_at, is_done: c.is_cut_done })),
            sewing: sewing.map(s => ({ worker: s.sewer_name || s.contractor_name, qty: s.quantity, handover: s.handover_date, done: s.done_date, note: s.note })),
            finishing: finishing.map(f => ({ worker: f.finisher_name, done: f.completed_at, is_done: f.is_completed }))
        };
    });

    // ========== STATS — Thống kê cho biểu đồ ==========
    fastify.get('/api/trasoat/stats', { preHandler: [authenticate] }, async (request, reply) => {
        const { year } = request.query;
        const userId = request.user.id;
        const userRole = request.user.role;
        const targetYear = Number(year) || new Date().getFullYear();
        const todayStr = vnDateStr(vnNow());

        let permFilter = '';
        const permParams = [];
        let pIdx = 1;
        if (!FULL_VIEW_ROLES.includes(userRole)) {
            permFilter = `AND (created_by = $${pIdx} OR cskh_user_id = $${pIdx})`;
            permParams.push(userId); pIdx++;
        }

        // Overall stats for the year
        const stats = await db.get(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE shipping_status = 'shipped' AND shipped_at::date < COALESCE(rescheduled_ship_date, expected_ship_date)) AS early,
                COUNT(*) FILTER (WHERE shipping_status = 'shipped' AND shipped_at::date = COALESCE(rescheduled_ship_date, expected_ship_date)) AS on_time,
                COUNT(*) FILTER (WHERE shipping_status = 'shipped' AND shipped_at::date > COALESCE(rescheduled_ship_date, expected_ship_date)) AS late_shipped,
                COUNT(*) FILTER (WHERE shipping_status != 'shipped' AND COALESCE(rescheduled_ship_date, expected_ship_date) < $${pIdx}::date) AS late_pending
            FROM dht_orders
            WHERE expected_ship_date IS NOT NULL
                AND EXTRACT(YEAR FROM expected_ship_date) = $${pIdx + 1}
                ${permFilter}
        `, [...permParams, todayStr, targetYear]);

        const total = Number(stats.total) || 0;
        const early = Number(stats.early) || 0;
        const onTime = Number(stats.on_time) || 0;
        const late = (Number(stats.late_shipped) || 0) + (Number(stats.late_pending) || 0);

        // Monthly breakdown for bar chart
        const monthly = await db.all(`
            SELECT
                EXTRACT(MONTH FROM expected_ship_date)::int AS month,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE shipping_status = 'shipped' AND shipped_at::date < COALESCE(rescheduled_ship_date, expected_ship_date)) AS early,
                COUNT(*) FILTER (WHERE shipping_status = 'shipped' AND shipped_at::date = COALESCE(rescheduled_ship_date, expected_ship_date)) AS on_time,
                COUNT(*) FILTER (WHERE shipping_status = 'shipped' AND shipped_at::date > COALESCE(rescheduled_ship_date, expected_ship_date)) AS late_shipped,
                COUNT(*) FILTER (WHERE shipping_status != 'shipped' AND COALESCE(rescheduled_ship_date, expected_ship_date) < $${pIdx}::date) AS late_pending
            FROM dht_orders
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
                late: (Number(row?.late_shipped) || 0) + (Number(row?.late_pending) || 0)
            });
        }

        return {
            year: targetYear,
            total, early, on_time: onTime, late,
            early_pct: total ? Math.round(early / total * 1000) / 10 : 0,
            on_time_pct: total ? Math.round(onTime / total * 1000) / 10 : 0,
            late_pct: total ? Math.round(late / total * 1000) / 10 : 0,
            months
        };
    });

    // ========== STEP DETAIL — Chi tiết từng bộ phận ==========
    fastify.get('/api/trasoat/orders/:id/step/:step', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);
        const step = request.params.step; // cat, in, ep, may, qc, ht, gui

        const order = await db.get(`
            SELECT o.id, o.order_code, o.customer_name, o.customer_phone, o.province, o.address,
                o.order_date, o.expected_ship_date, o.rescheduled_ship_date,
                o.shipping_status, o.shipped_at, o.tracking_code,
                o.total_quantity, o.total_amount, o.shipping_fee, o.shipping_fee_payer,
                o.carrier_phone,
                c.name AS category_name,
                u_cskh.full_name AS cskh_name, u_created.full_name AS created_by_name,
                u_shipped.full_name AS shipped_by_name,
                cr2.name AS carrier_name, cr2.tracking_url_template AS carrier_tracking_url
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN users u_shipped ON o.shipped_by = u_shipped.id
            LEFT JOIN dht_carriers cr2 ON o.actual_carrier_id = cr2.id
            WHERE o.id = $1
        `, [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });

        if (step === 'cat') {
            const records = await db.all(`
                SELECT cr.*, u.full_name AS cutter_name
                FROM cutting_records cr LEFT JOIN users u ON cr.cutter_id = u.id
                WHERE cr.dht_order_id = $1 ORDER BY cr.id ASC
            `, [orderId]);
            // Get selected rolls for each record
            for (const r of records) {
                try {
                    const rollIds = JSON.parse(r.selected_roll_ids || '[]');
                    if (rollIds.length > 0) {
                        r.rolls = await db.all(`SELECT id, material_name, color, kg FROM kv_rolls WHERE id = ANY($1::int[])`, [rollIds]);
                    } else { r.rolls = []; }
                } catch(e) { r.rolls = []; }
            }
            return { step: 'cat', order_code: order.order_code, customer_name: order.customer_name, records };
        }

        if (step === 'in') {
            const records = await db.all(`
                SELECT pr.*, u.full_name AS printer_name,
                    u_done.full_name AS done_by_name,
                    ptr.roll_type AS pettem_roll_type,
                    ptr.qty_remaining AS pettem_roll_remaining
                FROM printing_records pr
                LEFT JOIN users u ON pr.printer_id = u.id
                LEFT JOIN users u_done ON pr.print_done_by = u_done.id
                LEFT JOIN pettem_rolls ptr ON pr.pettem_roll_id = ptr.id
                WHERE pr.dht_order_id = $1 ORDER BY pr.id ASC
            `, [orderId]);
            return { step: 'in', order_code: order.order_code, cskh_name: order.cskh_name, records };
        }

        if (step === 'ep') {
            const records = await db.all(`
                SELECT pr.*, u.full_name AS presser_name, o2.order_code
                FROM pressing_records pr
                LEFT JOIN users u ON pr.presser_id = u.id
                LEFT JOIN dht_orders o2 ON pr.dht_order_id = o2.id
                WHERE pr.dht_order_id = $1 ORDER BY pr.id ASC
            `, [orderId]);
            return { step: 'ep', order_code: order.order_code, cskh_name: order.cskh_name, records };
        }

        if (step === 'may') {
            const records = await db.all(`
                SELECT sr.*, u.full_name AS sewer_name, ct.name AS contractor_name,
                    st.name AS team_name
                FROM sewing_records sr
                LEFT JOIN users u ON sr.sewer_id = u.id
                LEFT JOIN sewing_contractors ct ON sr.contractor_id = ct.id
                LEFT JOIN sewing_teams st ON sr.sewing_team_id = st.id
                WHERE sr.dht_order_id = $1 ORDER BY sr.id ASC
            `, [orderId]);
            return {
                step: 'may', order_code: order.order_code, cskh_name: order.cskh_name,
                expected_ship_date: order.expected_ship_date,
                records
            };
        }

        if (step === 'qc') {
            const records = await db.all(`
                SELECT sr.*, u.full_name AS sewer_name, ct.name AS contractor_name,
                    st.name AS team_name
                FROM sewing_records sr
                LEFT JOIN users u ON sr.sewer_id = u.id
                LEFT JOIN sewing_contractors ct ON sr.contractor_id = ct.id
                LEFT JOIN sewing_teams st ON sr.sewing_team_id = st.id
                WHERE sr.dht_order_id = $1 ORDER BY sr.id ASC
            `, [orderId]);
            return { step: 'qc', order_code: order.order_code, cskh_name: order.cskh_name, records };
        }

        if (step === 'ht') {
            const records = await db.all(`
                SELECT fr.*, u.full_name AS finisher_name
                FROM finishing_records fr LEFT JOIN users u ON fr.finisher_id = u.id
                WHERE fr.dht_order_id = $1 ORDER BY fr.id ASC
            `, [orderId]);
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
            return { step: 'ht', order_code: order.order_code, cskh_name: order.cskh_name, records };
        }

        if (step === 'gui') {
            return {
                step: 'gui',
                order_code: order.order_code,
                customer_name: order.customer_name,
                customer_phone: order.customer_phone,
                province: order.province,
                address: order.address,
                cskh_name: order.cskh_name,
                order_date: order.order_date,
                shipped_by_name: order.shipped_by_name,
                shipped_at: order.shipped_at,
                carrier_name: order.carrier_name,
                tracking_code: order.tracking_code,
                carrier_tracking_url: order.carrier_tracking_url,
                carrier_phone: order.carrier_phone,
                shipping_fee: order.shipping_fee,
                shipping_fee_payer: order.shipping_fee_payer
            };
        }

        return reply.code(400).send({ error: 'Step không hợp lệ' });
    });
};

// ========== Helper: Process order row → add progress fields ==========
function _processOrder(o, todayStr) {
    const code = (o.order_code || '').toUpperCase();
    const catName = (o.category_name || '').toUpperCase();
    const isPetTem = catName === 'PET' || catName === 'TEM' || code.includes('PET') || code.includes('TEM');
    const isShipped = o.shipping_status === 'shipped';

    let totalSteps, doneSteps, currentStepName;
    if (isPetTem) {
        totalSteps = 2;
        const flags = [o.print_done, isShipped];
        doneSteps = flags.filter(Boolean).length;
        currentStepName = !o.print_done ? 'Chờ In' : !isShipped ? 'Chờ Gửi' : 'Hoàn thành';
    } else {
        totalSteps = 7;
        const flags = [o.cut_done, o.print_done, o.press_done, o.sew_done, o.finish_done, o.finish_done, isShipped];
        doneSteps = flags.filter(Boolean).length;
        if (!o.cut_done) currentStepName = 'Chờ Cắt';
        else if (!o.print_done) currentStepName = 'Chờ In';
        else if (!o.press_done) currentStepName = 'Chờ Ép';
        else if (!o.sew_done) currentStepName = 'Chờ May';
        else if (!o.finish_done) currentStepName = 'Chờ QC/HT';
        else if (!isShipped) currentStepName = 'Chờ Gửi';
        else currentStepName = 'Hoàn thành';
    }

    // Deviation calculation
    const expectedDate = o.rescheduled_ship_date || o.expected_ship_date;
    let deviationDays = 0, deviationLabel = 'Đúng lịch', deviationClass = 'on_time';

    if (expectedDate) {
        const exp = new Date(expectedDate); exp.setHours(0,0,0,0);
        if (isShipped && o.shipped_at) {
            const ship = new Date(o.shipped_at); ship.setHours(0,0,0,0);
            deviationDays = Math.round((ship - exp) / 86400000);
        } else if (!isShipped) {
            const td = new Date(todayStr); td.setHours(0,0,0,0);
            const diff = Math.round((td - exp) / 86400000);
            deviationDays = diff > 0 ? diff : 0;
        }
        if (deviationDays < 0) { deviationLabel = `Sớm ${Math.abs(deviationDays)} ngày`; deviationClass = 'early'; }
        else if (deviationDays > 0) { deviationLabel = `Trễ ${deviationDays} ngày`; deviationClass = 'late'; }
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
        total_steps: totalSteps, done_steps: doneSteps,
        current_step_name: currentStepName,
        progress_percent: Math.round(doneSteps / totalSteps * 100),
        deviation_days: deviationDays, deviation_label: deviationLabel, deviation_class: deviationClass
    };
}
