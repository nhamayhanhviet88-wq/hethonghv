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
                visibilityFilter = ` AND (o.created_by = $${idx} OR o.cskh_user_id = $${idx})`;
                params.push(userId);
                idx++;
            } else if (!kt) {
                visibilityFilter = ` AND (o.created_by = $${idx} OR o.cskh_user_id = $${idx})`;
                params.push(userId);
                idx++;
            }
        }

        // Build filter condition using effective_ship_date
        let filterWhere = '';
        let orderBy = 'o.created_at DESC';

        const todayStr = vnDateStr(vnNow());

        switch (filter) {
            case 'early':
                filterWhere = ` AND o.shipping_status = 'pending' AND o.expected_ship_date IS NOT NULL AND COALESCE(o.rescheduled_ship_date, o.expected_ship_date) > $${idx}::date`;
                params.push(todayStr);
                idx++;
                orderBy = 'COALESCE(o.rescheduled_ship_date, o.expected_ship_date) ASC';
                break;

            case 'today':
                filterWhere = ` AND o.shipping_status IN ('pending','rescheduled') AND o.expected_ship_date IS NOT NULL AND COALESCE(o.rescheduled_ship_date, o.expected_ship_date) <= $${idx}::date`;
                params.push(todayStr);
                idx++;
                orderBy = 'COALESCE(o.rescheduled_ship_date, o.expected_ship_date) ASC';
                break;

            case 'rescheduled':
                filterWhere = ` AND o.shipping_status = 'rescheduled' AND o.rescheduled_ship_date > $${idx}::date`;
                params.push(todayStr);
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
                o.rescheduled_ship_date, o.reschedule_reason,
                o.shipping_status, o.shipping_priority, o.delivery_progress,
                o.customer_name, o.customer_phone, o.province, o.address,
                o.tracking_code, o.carrier_phone, o.shipping_bill_link,
                o.completion_images, o.actual_ship_datetime,
                o.shipped_by, o.shipped_at, o.total_amount,
                o.carrier_id, o.actual_carrier_id,
                o.created_by, o.cskh_user_id,
                o.sale_note_for_accountant, o.shipping_fee,
                o.shipping_fee_payer, o.shipping_fee_method, o.receiver_name,
                o.discount_amount, o.has_vat, o.vat_amount,
                o.deposit_amount_cache,
                o.carrier_extra, o.notes, o.standard_delivery_time, o.standard_proof_image,
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
                GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) AS deposit_amount
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

        // Overdue count
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

    // ========== SHIP — Xác nhận gửi hàng (FULL MODAL) ==========
    fastify.post('/api/shipping/orders/:id/ship', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;

        // Only KT + GĐ can ship
        if (userRole !== 'giam_doc') {
            const kt = await isKeToan(userId);
            if (!kt) return reply.code(403).send({ error: '🔒 Chỉ Kế Toán mới được xác nhận gửi hàng' });
        }

        const orderId = Number(request.params.id);
        const order = await db.get('SELECT id, shipping_status, order_code, total_amount, discount_amount, deposit_amount_cache FROM dht_orders WHERE id = $1', [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });
        if (order.shipping_status === 'shipped') return reply.code(400).send({ error: 'Đơn hàng đã được gửi rồi' });

        const b = request.body || {};

        // Validate carrier
        if (!b.actual_carrier_id) return reply.code(400).send({ error: 'Vui lòng chọn Nhà Vận Chuyển' });

        // Validate shipping fee
        const isNoFeeCarrier = !!b.no_fee_carrier;
        if (!isNoFeeCarrier) {
            if (b.shipping_fee === undefined || b.shipping_fee === null || b.shipping_fee === '') {
                return reply.code(400).send({ error: 'Vui lòng nhập phí gửi hàng' });
            }
        }
        const shipFee = isNoFeeCarrier ? 0 : Number(b.shipping_fee);
        if (isNaN(shipFee) || shipFee < 0) return reply.code(400).send({ error: 'Phí gửi hàng không hợp lệ' });

        if (!isNoFeeCarrier) {
            if (!b.shipping_fee_payer || !['hv', 'khach'].includes(b.shipping_fee_payer)) {
                return reply.code(400).send({ error: 'Vui lòng chọn Người trả phí' });
            }
            if (!b.shipping_fee_method || !['ck', 'tm'].includes(b.shipping_fee_method)) {
                return reply.code(400).send({ error: 'Vui lòng chọn Hình thức trả' });
            }
        }

        // ★ Block HV+CK when remaining_amount <= 0 (nothing to deduct from)
        if (b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'ck') {
            const depRow = await db.get(
                `SELECT COALESCE(SUM(amount), 0) AS deposit_total
                 FROM payment_records
                 WHERE total_order_codes ILIKE '%' || $1 || '%'
                    OR order_tt_coc = $1`,
                [order.order_code]
            );
            const depositTotal = Number(depRow?.deposit_total) || 0;
            const remaining = (Number(order.total_amount) || 0)
                - (Number(order.discount_amount) || 0)
                - Math.max(depositTotal, Number(order.deposit_amount_cache) || 0);
            if (remaining <= 0) {
                return reply.code(400).send({
                    error: '⚠️ Tiền đơn còn lại = 0đ — Không thể chọn HV trả CK. Vui lòng chọn TM.'
                });
            }
        }

        const now = vnNow();
        const todayStr = vnDateStr(now);

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
        // ★ Clear reschedule data — no longer relevant after shipping
        sets.push(`rescheduled_ship_date = NULL`);
        sets.push(`reschedule_reason = NULL`);

        // Tracking fields (conditional, from modal)
        if (b.tracking_code) { sets.push(`tracking_code = $${idx++}`); params.push(b.tracking_code); }
        if (b.shipping_bill_link) { sets.push(`shipping_bill_link = $${idx++}`); params.push(b.shipping_bill_link); }
        if (b.carrier_phone) { sets.push(`carrier_phone = $${idx++}`); params.push(b.carrier_phone); }
        if (b.receiver_name) { sets.push(`receiver_name = $${idx++}`); params.push(b.receiver_name); }

        // Fee fields
        sets.push(`shipping_fee = $${idx++}`); params.push(shipFee);
        sets.push(`shipping_fee_payer = $${idx++}`); params.push(b.shipping_fee_payer);
        sets.push(`shipping_fee_method = $${idx++}`); params.push(b.shipping_fee_method);

        sets.push(`last_updated_by = $${idx++}`); params.push(userId);
        sets.push(`last_updated_at = NOW()`);

        // Handle "HV trả + TM" → Auto create CHI in Sổ Thu Chi
        let cashflowResult = null;
        if (b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'tm' && shipFee > 0) {
            try {
                const seq = await _getNextTMSeq(todayStr);
                const cfCode = _buildTMCode(seq, todayStr);
                const cfDescription = `Tiền ship đơn ${order.order_code}`;
                const cfImageUrl = b.shipping_bill_link || null;

                // Reserve TM code in payment_records (same as cashflow.js pattern)
                await db.run(`
                    INSERT INTO payment_records (payment_code, payment_method, daily_seq, amount, payment_type, transfer_note, money_source, source, payment_date, created_by)
                    VALUES ($1, 'TM', $2, $3, 'chi', $4, 'congty', 'shipping_chi', $5, $6)
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

        // Update order
        params.push(orderId);
        await db.run(`UPDATE dht_orders SET ${sets.join(', ')} WHERE id = $${idx}`, params);

        // ★ Link payment record for order settlement (if selected)
        let paymentLinkResult = null;
        if (b.selected_payment_id) {
            const prId = Number(b.selected_payment_id);
            try {
                // Atomic: only link if not already linked (prevents race condition)
                const linked = await db.get(
                    `UPDATE payment_records SET order_tt_coc = $1, payment_type = 'thanh_toan', updated_at = NOW()
                     WHERE id = $2 AND (order_tt_coc IS NULL OR order_tt_coc = '')
                     RETURNING id, payment_code, amount`,
                    [order.order_code, prId]
                );
                if (linked) {
                    paymentLinkResult = linked;
                } else {
                    console.warn(`[Ship Payment] PR #${prId} already linked, skipping`);
                }
            } catch (prErr) {
                console.error('[Ship Payment] Link error:', prErr.message);
                // Don't fail shipment — payment linking is best-effort
            }
        }

        // Build result message
        let resultMsgParts = [`✅ Đã gửi đơn ${order.order_code}`];
        if (cashflowResult) resultMsgParts.push(`Phiếu chi ship: ${cashflowResult.cashflow_code}`);
        if (paymentLinkResult) resultMsgParts.push(`Thanh toán: ${paymentLinkResult.payment_code} (${Number(paymentLinkResult.amount).toLocaleString('vi-VN')}đ)`);
        const resultMsg = resultMsgParts.join(' — ');

        // ★ Audit log: Gửi hàng
        try {
            const carrierRow = await db.get('SELECT name FROM dht_carriers WHERE id = $1', [Number(b.actual_carrier_id)]);
            const carrierName = carrierRow?.name || b.actual_carrier_id;
            const payerLabel = b.shipping_fee_payer === 'hv' ? 'HV trả' : 'Khách trả';
            const methodLabel = b.shipping_fee_method === 'ck' ? 'CK' : 'TM';
            const changes = [
                { field: 'actual_carrier', label: 'Nhà vận chuyển', old: null, new: carrierName },
                { field: 'shipping_fee', label: 'Phí gửi hàng', old: null, new: String(shipFee) },
                { field: 'fee_payer', label: 'Người trả', old: null, new: payerLabel + ' — ' + methodLabel }
            ];
            if (b.tracking_code) changes.push({ field: 'tracking_code', label: 'Mã vận đơn', old: null, new: b.tracking_code });
            if (b.carrier_phone) changes.push({ field: 'carrier_phone', label: 'SĐT Nhà Xe', old: null, new: b.carrier_phone });
            if (b.receiver_name) changes.push({ field: 'receiver_name', label: 'Người nhận', old: null, new: b.receiver_name });
            const summary = `Đã gửi hàng qua ${carrierName} — Phí ${Number(shipFee).toLocaleString('vi-VN')}đ ${payerLabel} ${methodLabel}`;
            await db.run(`INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by) VALUES ($1,$2,$3,$4,$5)`, [
                orderId, 'ship', summary, JSON.stringify(changes), request.user.id
            ]);

            // ★ Audit log: Auto CHI for HV+TM shipping fee
            if (cashflowResult && shipFee > 0) {
                const chiChanges = [
                    { field: 'payment_code', label: 'Mã phiếu CHI', old: null, new: cashflowResult.cashflow_code },
                    { field: 'payment_amount', label: 'Số tiền CHI', old: null, new: String(shipFee) },
                    { field: 'payment_method', label: 'Hình thức', old: null, new: 'Tiền Mặt' },
                    { field: 'transfer_note', label: 'Nội dung', old: null, new: `Tiền ship đơn ${order.order_code}` }
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
                const discAmt = Number(order.discount_amount) || 0;
                const shipCk2 = (b.shipping_fee_payer === 'hv' && b.shipping_fee_method === 'ck') ? shipFee : 0;
                const rem2 = totalAmt - discAmt - Math.max(depTotal2, Number(order.deposit_amount_cache) || 0) - shipCk2;
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

        if (userRole !== 'giam_doc') {
            const kt = await isKeToan(userId);
            if (!kt) return reply.code(403).send({ error: '🔒 Chỉ Kế Toán mới được hẹn lại ngày gửi' });
        }

        const { new_date, reason } = request.body || {};
        if (!new_date) return reply.code(400).send({ error: 'Vui lòng chọn ngày gửi mới' });
        if (!reason || !reason.trim()) return reply.code(400).send({ error: 'Vui lòng nhập lý do hẹn lại' });

        const todayStr = vnDateStr(vnNow());
        if (new_date <= todayStr) return reply.code(400).send({ error: 'Ngày gửi mới phải sau hôm nay' });

        // ★ Holiday check: cannot reschedule to a public holiday
        const holidayRow = await db.get('SELECT holiday_name FROM holidays WHERE holiday_date = $1', [new_date]);
        if (holidayRow) {
            return reply.code(400).send({ error: `⚠️ Không được hẹn vào ngày lễ: ${holidayRow.holiday_name}` });
        }

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
            SELECT pr.id, pr.payment_code, pr.amount, pr.payment_date,
                   pr.payment_method, pr.bank_name, pr.transfer_note,
                   pr.customer_name, pr.customer_phone,
                   ABS(pr.amount - $1) AS diff
            FROM payment_records pr
            WHERE (pr.order_tt_coc IS NULL OR pr.order_tt_coc = '')
              AND (pr.total_order_codes IS NULL OR pr.total_order_codes = '')
              AND pr.payment_type IN ('pending', 'thanh_toan', 'dat_coc')
              AND COALESCE(pr.source, '') != 'cashflow_chi'
              AND pr.amount > 0
            ORDER BY ABS(pr.amount - $1) ASC
            LIMIT 15
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
};
