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
                o.parent_order_id, o.shipping_priority,
                c.name AS category_name,
                u_cskh.full_name AS cskh_name,
                u_created.full_name AS created_by_name,
                cr2.name AS carrier_name,
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
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN dht_carriers cr2 ON o.actual_carrier_id = cr2.id
            ${where}
            ORDER BY o.expected_ship_date DESC NULLS LAST, o.created_at DESC
        `, params);

        const orders = rows.map(o => _processOrder(o, todayStr));

        // Post-query filters (computed fields)
        let filtered = orders;
        if (status && status !== 'all') filtered = filtered.filter(o => o.deviation_class === status);
        if (current_step) filtered = filtered.filter(o => o.current_step_name === current_step);

        const totalCount = filtered.length;
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 30;
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

        // Build timeline
        const code = (order.order_code || '').toUpperCase();
        const catName = (order.category_name || '').toUpperCase();
        const isPetTem = catName === 'PET' || catName === 'TEM' || code.includes('PET') || code.includes('TEM');
        const isShipped = order.shipping_status === 'shipped' || !!order.shipped_at;

        // Determine print completion from printing_records
        // contractor_id != null → considered done (same as bophanin.js)
        const isPrintRecDone = p => p.contractor_id ? true : p.is_print_done;
        const allPrintDone = printing.length > 0 && printing.every(isPrintRecDone);
        const completedPrints = printing
            .filter(isPrintRecDone)
            .map(p => ({
                time: p.contractor_id ? p.created_at : p.print_done_at,
                worker: p.contractor_id ? 'In Gia Công' : p.printer_name
            }));
        const lastPrint = completedPrints.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))[0];
        const printWorker = lastPrint ? lastPrint.worker : null;
        const printTime = lastPrint ? lastPrint.time : null;
        const printFields = [...new Set(printing.map(p => p.print_field).filter(Boolean))].join(', ') || null;
        const printDoneCount = printing.filter(isPrintRecDone).length;
        const printTotalCount = printing.length;
        const printProgress = printTotalCount > 0 ? `${printDoneCount}/${printTotalCount}` : null;

        // Determine pressing completion from pressing_records
        const pressDoneCount = pressing.filter(p => p.is_reported).length;
        const pressTotalCount = pressing.length;
        const pressProgress = pressTotalCount > 0 ? `${pressDoneCount}/${pressTotalCount}` : null;
        const allPressDone = pressTotalCount > 0 && pressing.every(p => p.is_reported);
        const donePresses = pressing.filter(p => p.is_reported && p.reported_at);
        const pressTime = donePresses.length > 0 ? new Date(Math.max(...donePresses.map(p => new Date(p.reported_at).getTime()))) : null;
        const pressWorker = [...new Set(pressing.map(p => p.presser_name).filter(Boolean))].join(', ') || null;

        let timeline;
        if (isPetTem) {
            const printStep = prodSteps.find(s => s.step_id === 3);
            const printDone = allPrintDone || (printStep?.is_completed || false);
            timeline = [
                { name: 'In', short: 'IN', done: printDone, time: printTime || printStep?.completed_at, worker: printWorker || printStep?.completed_by_name, extra: printFields, progress: printProgress },
                { name: 'Gửi Hàng', short: 'GỬI', done: isShipped, time: order.shipped_at, worker: order.shipped_by_name }
            ];
        } else {
            const cutDoneCount = cutting.filter(c => c.is_cut_done).length;
            const cutTotalCount = cutting.length;
            const cutProgress = cutTotalCount > 0 ? `${cutDoneCount}/${cutTotalCount}` : null;
            const allCutDone = cutTotalCount > 0 && cutting.every(c => c.is_cut_done);

            const doneCuts = cutting.filter(c => c.is_cut_done && c.cut_done_at);
            const cutTime = doneCuts.length > 0 ? new Date(Math.max(...doneCuts.map(c => new Date(c.cut_done_at).getTime()))) : null;
            const cutWorker = [...new Set(cutting.map(c => c.cutter_name).filter(Boolean))].join(', ') || null;

            const printStep = prodSteps.find(s => s.step_id === 3);
            const pressStep = prodSteps.find(s => s.step_id === 4);
            const sewRec = sewing.find(s => s.done_date);
            const finRec = finishing.find(f => f.is_completed);

            const printDone = allPrintDone || (printStep?.is_completed || false);
            const pressDone = pressTotalCount > 0 ? allPressDone : (pressStep?.is_completed || false);
            const pressDisplayTime = pressTotalCount > 0 ? pressTime : pressStep?.completed_at;
            const pressDisplayWorker = pressTotalCount > 0 ? pressWorker : pressStep?.completed_by_name;

            // May calculations
            // Apply custom done_date logic: internal sewing uses finishing completed time; contractor sewing uses QC time.
            for (const s of sewing) {
                if (s.contractor_id === null) {
                    const finishRow = finishing.find(f => f.sewing_record_id === s.id && f.is_completed);
                    s.done_date = finishRow ? finishRow.completed_at : null;
                } else {
                    s.done_date = s.qc_date;
                }
            }

            const sewDoneCount = sewing.filter(s => s.done_date).length;
            const sewTotalCount = sewing.length;
            const sewProgress = sewTotalCount > 0 ? `${sewDoneCount}/${sewTotalCount}` : null;
            const allSewDone = sewTotalCount > 0 && sewing.every(s => s.done_date);
            const doneSewings = sewing.filter(s => s.done_date);
            const sewTime = doneSewings.length > 0 ? new Date(Math.max(...doneSewings.map(s => new Date(s.done_date).getTime()))) : null;
            const sewWorker = [...new Set(sewing.map(s => s.sewer_name || s.contractor_name || s.team_name).filter(Boolean))].join(', ') || null;

            const sewDone = sewTotalCount > 0 ? allSewDone : (sewRec ? true : false);
            const sewDisplayTime = sewTotalCount > 0 ? sewTime : sewRec?.done_date;
            const sewDisplayWorker = sewTotalCount > 0 ? sewWorker : (sewRec?.sewer_name || sewRec?.contractor_name || sewRec?.team_name);

            // QC calculations
            const qcDoneCount = sewing.filter(s => s.qc_count > 0).length;
            const qcTotalCount = sewing.length;
            const qcProgress = qcTotalCount > 0 ? `${qcDoneCount}/${qcTotalCount}` : null;
            const allQcDone = qcTotalCount > 0 && sewing.every(s => s.qc_count > 0);
            const lastQcDone = sewing.filter(s => s.qc_count > 0).sort((a,b) => new Date(b.qc_date || 0) - new Date(a.qc_date || 0))[0];
            const qcTime = lastQcDone ? lastQcDone.qc_date : null;
            const qcWorker = [...new Set(sewing.map(s => s.qc_by_name).filter(Boolean))].join(', ') || null;

            const qcDone = qcTotalCount > 0 ? allQcDone : false;
            const qcDisplayTime = qcTotalCount > 0 ? qcTime : null;
            const qcDisplayWorker = qcTotalCount > 0 ? qcWorker : null;

            // HT calculations
            const isOrderShipped = !!order.delivery_date;
            const checkFDone = f => {
                if (isOrderShipped) return f.is_completed;
                const isQcDone = f.qc_count > 0;
                const isOutsourced = f.contractor_id !== null;
                return isOutsourced ? isQcDone : (isQcDone && f.is_completed);
            };

            const htDoneCount = finishing.filter(checkFDone).length;
            const htTotalCount = finishing.length;
            const htProgress = htTotalCount > 0 ? `${htDoneCount}/${htTotalCount}` : null;
            const allHtDone = htTotalCount > 0 && finishing.every(checkFDone);
            const lastHtDone = finishing.filter(checkFDone).sort((a,b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))[0];
            const htTime = lastHtDone ? lastHtDone.completed_at : null;
            const htWorker = [...new Set(finishing.map(f => f.finisher_name).filter(Boolean))].join(', ') || null;

            const htDone = htTotalCount > 0 ? allHtDone : (finRec?.is_completed || false);
            const htDisplayTime = htTotalCount > 0 ? htTime : finRec?.completed_at;
            const htDisplayWorker = htTotalCount > 0 ? htWorker : finRec?.finisher_name;

            timeline = [
                { name: 'Cắt', short: 'CẮT', done: allCutDone, time: cutTime, worker: cutWorker, progress: cutProgress },
                { name: 'In', short: 'IN', done: printDone, time: printTime || printStep?.completed_at, worker: printWorker || printStep?.completed_by_name, extra: printFields, progress: printProgress },
                { name: 'Ép', short: 'ÉP', done: pressDone, time: pressDisplayTime, worker: pressDisplayWorker, progress: pressProgress },
                { name: 'May', short: 'MAY', done: sewDone, time: sewDisplayTime, worker: sewDisplayWorker, progress: sewProgress },
                { name: 'Kiểm Tra CL', short: 'QC', done: qcDone, time: qcDisplayTime, worker: qcDisplayWorker, progress: qcProgress },
                { name: 'Hoàn Thiện', short: 'HT', done: htDone, time: htDisplayTime, worker: htDisplayWorker, progress: htProgress },
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
        const { year, month } = request.query;
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

        let overallMonthFilter = '';
        const overallParams = [...permParams, todayStr, targetYear];
        if (month) {
            overallMonthFilter = `AND EXTRACT(MONTH FROM expected_ship_date) = $${pIdx + 2}`;
            overallParams.push(Number(month));
        }

        // Overall stats (filtered by year and optionally month)
        const stats = await db.get(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE shipping_status = 'shipped' AND shipped_at::date < COALESCE(rescheduled_ship_date, expected_ship_date)) AS early,
                COUNT(*) FILTER (
                    WHERE (shipping_status = 'shipped' AND shipped_at::date = COALESCE(rescheduled_ship_date, expected_ship_date))
                       OR (shipping_status != 'shipped' AND COALESCE(rescheduled_ship_date, expected_ship_date) >= $${pIdx}::date)
                ) AS on_time,
                COUNT(*) FILTER (
                    WHERE (shipping_status = 'shipped' AND shipped_at::date > COALESCE(rescheduled_ship_date, expected_ship_date))
                       OR (shipping_status != 'shipped' AND COALESCE(rescheduled_ship_date, expected_ship_date) < $${pIdx}::date)
                ) AS late
            FROM dht_orders
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
                    WHERE (shipping_status = 'shipped' AND shipped_at::date = COALESCE(rescheduled_ship_date, expected_ship_date))
                       OR (shipping_status != 'shipped' AND COALESCE(rescheduled_ship_date, expected_ship_date) >= $${pIdx}::date)
                ) AS on_time,
                COUNT(*) FILTER (
                    WHERE (shipping_status = 'shipped' AND shipped_at::date > COALESCE(rescheduled_ship_date, expected_ship_date))
                       OR (shipping_status != 'shipped' AND COALESCE(rescheduled_ship_date, expected_ship_date) < $${pIdx}::date)
                ) AS late
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
                late: Number(row?.late) || 0
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
                SELECT cr.*, u.full_name AS cutter_name, doi.description AS item_description
                FROM cutting_records cr
                LEFT JOIN users u ON cr.cutter_id = u.id
                LEFT JOIN dht_order_items doi ON cr.order_item_id = doi.id
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
                    ptr.qty_remaining AS pettem_roll_remaining,
                    doi.description AS item_description
                FROM printing_records pr
                LEFT JOIN users u ON pr.printer_id = u.id
                LEFT JOIN users u_done ON pr.print_done_by = u_done.id
                LEFT JOIN pettem_rolls ptr ON pr.pettem_roll_id = ptr.id
                LEFT JOIN dht_order_items doi ON pr.order_item_id = doi.id
                WHERE pr.dht_order_id = $1 ORDER BY pr.id ASC
            `, [orderId]);
            return { step: 'in', order_code: order.order_code, cskh_name: order.cskh_name, records };
        }

        if (step === 'ep') {
            const records = await db.all(`
                SELECT pr.*, u.full_name AS presser_name, o2.order_code, doi.description AS item_description
                FROM pressing_records pr
                LEFT JOIN users u ON pr.presser_id = u.id
                LEFT JOIN dht_orders o2 ON pr.dht_order_id = o2.id
                LEFT JOIN dht_order_items doi ON pr.order_item_id = doi.id
                WHERE pr.dht_order_id = $1 ORDER BY pr.id ASC
            `, [orderId]);
            return { step: 'ep', order_code: order.order_code, cskh_name: order.cskh_name, records };
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
                WHERE sr.dht_order_id = $1 ORDER BY sr.id ASC
            `, [orderId]);

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
                WHERE sr.dht_order_id = $1 ORDER BY sr.id ASC
            `, [orderId]);
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
            return { step: 'qc', order_code: order.order_code, cskh_name: order.cskh_name, records };
        }

        if (step === 'ht') {
            const records = await db.all(`
                SELECT fr.*, u.full_name AS finisher_name, doi.description AS item_description,
                    COALESCE(u_sew.full_name, c.name, dt.name) AS sewer_name,
                    sr.contractor_id,
                    sr.handover_date,
                    (SELECT COUNT(*)::int FROM qc_checklist_answers qca WHERE qca.sewing_record_id = fr.sewing_record_id) AS qc_count
                FROM finishing_records fr
                LEFT JOIN users u ON fr.finisher_id = u.id
                LEFT JOIN sewing_records sr ON fr.sewing_record_id = sr.id
                LEFT JOIN users u_sew ON sr.sewer_id = u_sew.id
                LEFT JOIN sewing_contractors c ON sr.contractor_id = c.id
                LEFT JOIN departments dt ON sr.sewing_team_id = dt.id
                LEFT JOIN dht_order_items doi ON sr.order_item_id = doi.id
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
            return { step: 'ht', order_code: order.order_code, cskh_name: order.cskh_name, is_order_shipped: !!order.delivery_date, records };
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
                shipping_fee_payer: order.shipping_fee_payer,
                done_order_at
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
    const isShipped = o.shipping_status === 'shipped' || !!o.shipped_at;

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
        else if (!o.finish_done) currentStepName = 'Đang May / QC / HT';
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
        deviation_days: deviationDays, deviation_label: deviationLabel, deviation_class: deviationClass,
        shipping_priority: o.shipping_priority
    };
}
