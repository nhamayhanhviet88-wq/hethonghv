const { authenticate, requireRole } = require('../middleware/auth');
const { sendTelegramMessage, broadcastTelegram, notifyTelegram } = require('../utils/telegram');
const { getNextWorkingDay, getVNToday, getNextFollowUpDate, getEffectiveWorkingDay, toDateStr, getHolidays } = require('../utils/workingDay');
const { calculateRealDeadline } = require('./deadline-checker');
const { getProductionCutoff, getTestAccountIds, buildProductionFilter } = require('../utils/productionMode');

module.exports = function(fastify, db, getManagedDeptIds) {

    fastify.post('/api/customers/:id/cancel', { preHandler: [authenticate] }, async (request, reply) => {
        const { reason } = request.body || {};
        if (!reason) return reply.code(400).send({ error: 'Vui lòng nhập lý do hủy' });
        const custId = Number(request.params.id);
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [custId]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        // Enforce min 5 consultation logs for Sale CRM (skip for Director/Senior Manager)
        if (customer.crm_type === 'sale' && !['giam_doc', 'quan_ly_cap_cao'].includes(request.user.role)) {
            const countRow = await db.get(`
                WITH last_ht AS (
                    SELECT customer_id, MAX(id) as id
                    FROM consultation_logs
                    WHERE log_type = 'hoan_thanh' AND customer_id = $1
                    GROUP BY customer_id
                )
                SELECT COALESCE(COUNT(cl.id), 0)::int as cnt
                FROM customers c
                LEFT JOIN last_ht lh ON c.id = lh.customer_id
                LEFT JOIN consultation_logs cl ON cl.customer_id = c.id 
                    AND (lh.id IS NULL OR cl.id > lh.id)
                    AND cl.log_type NOT IN ('chuyen_doi_crm', 'tao_tk_affiliate', 'gui_lai_so', 'khong_xu_ly', 'dat_coc', 'chot_don', 'dang_san_xuat', 'hoan_thanh', 'sau_ban_hang', 'huy_coc', 'hoan_thanh_cap_cuu', 'huy', 'cho_duyet_huy', 'duyet_huy', 'huy_don_tra_coc', 'da_huy_don_tra_coc', 'cho_duyet_huy_don', 'gui_hang', 'tu_van_don_tiep', 'cancel_auto_revert')
                    AND (cl.content IS NULL OR (cl.content NOT LIKE '%Pancake%' AND cl.content NOT LIKE '%Đồng bộ%'))
                WHERE c.id = $1
                GROUP BY c.id
            `, [custId]);
            const consultCount = Number(countRow?.cnt || 0);
            if (consultCount < 5) {
                return reply.code(400).send({
                    error: `Yêu cầu chăm sóc đủ 5 lần mới được hủy khách! (Hiện tại: ${consultCount}/5 lần)`
                });
            }
        }

        // Block if pending cancel-order request
        if (customer.order_status === 'cho_duyet_huy_don') {
            return reply.code(400).send({ error: 'Khách đang chờ duyệt hủy đơn trả cọc. Không thể hủy khách.' });
        }

        // Build mã Hủy Khách (STT-ngày-tháng-Ynăm) — đếm theo ngày
        const today = getVNToday();
        const [yy, mm, dd] = today.split('-').map(Number);
        const yLabel = 'Y' + String(yy).slice(-2);

        // Đếm STT hủy khách hôm nay (từ customers.cancel_requested_at — luôn được set)
        const cancelCount = await db.get(
            "SELECT COUNT(*) as cnt FROM customers WHERE cancel_requested_at IS NOT NULL AND cancel_requested_at::timestamptz::date = $1::date",
            [today]
        );
        const cancelSTT = Number(cancelCount?.cnt || 0) + 1;
        const cancelCode = `${cancelSTT}-${dd}-${mm}-${yLabel}`;

        // Helper: next working day (skip CN + lễ + nghỉ phép NV)
        const getNextBizDay = async () => getNextWorkingDay(new Date(), customer.assigned_to_id);

        // ★ Helper: duyệt hủy trực tiếp
        const _directCancel = async () => {
            await db.run(
                `UPDATE customers SET cancel_requested = 1, cancel_reason = ?,
                 cancel_requested_by = ?, cancel_requested_at = NOW()::text,
                 cancel_approved = 1, cancel_approved_by = ?, cancel_approved_at = NOW()::text,
                 order_status = 'duyet_huy',
                 appointment_date = NULL,
                 is_pinned = false, pinned_at = NULL,
                 updated_at = NOW() WHERE id = ?`,
                [reason, request.user.id, request.user.id, custId]
            );

            // Ghi log tư vấn loại hủy để hiển thị lịch sử và nút Hủy Khách chính xác
            await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES (?, 'huy', ?, ?)`,
                [custId, `❌ Hủy khách (duyệt trực tiếp): ${reason}`, request.user.id]);

            const tgMsg = `❌ <b>${cancelCode} : HỦY KHÁCH TRỰC TIẾP</b> ❌\n\nKhách: <code>${customer.customer_name}</code>\nLý do: ${reason}\n\nBởi: ${request.user.full_name}`;
            notifyTelegram(null, 'huy_khach', tgMsg);

            // Khóa tài khoản Affiliate liên kết nếu có
            const linkedUser = await db.get("SELECT id, full_name FROM users WHERE source_customer_id = ? AND status = 'active'", [custId]);
            if (linkedUser) {
                await db.run("UPDATE users SET status = 'locked', updated_at = NOW() WHERE id = ?", [linkedUser.id]);
                notifyTelegram(null, 'huy_khach', `🔒 <b>Tài khoản bị khóa tự động</b>\nAffiliate: ${linkedUser.full_name}\nLý do: Khách hàng nguồn bị hủy`);
            }

            return { success: true, message: 'Khách hàng đã được hủy.' };
        };

        // REPEAT cancel: auto-reverted (cancel_approved = -2), NV pressing Hủy Khách again
        if (customer.cancel_approved === -2 && customer.cancel_requested === 1) {
            if (customer.crm_type === 'sale') {
                return _directCancel();
            }

            // Tìm STT gốc: đếm số hủy trong ngày đầu tiên cancel_requested_at
            const origDateStr = (customer.cancel_requested_at || '').substring(0, 10);
            const origCancelCount = await db.get(
                "SELECT COUNT(*) as cnt FROM consultation_logs WHERE log_type = 'huy' AND created_at::date = $1::date AND id <= (SELECT MIN(id) FROM consultation_logs WHERE customer_id = $2 AND log_type = 'huy')",
                [origDateStr || today, custId]
            );
            const origSTT = Number(origCancelCount?.cnt) || 1;
            const [oy, om, od] = (origDateStr || today).split('-').map(Number);
            const origY = 'Y' + String(oy).slice(-2);
            const cancelCodeRepeat = `${origSTT}-${od}-${om}-${origY}`;

            await db.run(`UPDATE customers SET cancel_requested_at = NOW()::text, cancel_approved = 0, order_status = 'cho_duyet_huy', appointment_date = NULL, updated_at = NOW() WHERE id = ?`,
                [custId]);
            await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES (?, 'huy', ?, ?)`,
                [custId, `❌ Nhắc lại hủy khách: ${reason}`, request.user.id]);
            const tgMsg = `❌ <b>${cancelCodeRepeat} : NHẮC LẠI HỦY KHÁCH</b> ❌\n\nKhách: <code>${customer.customer_name}</code>\nLý do: ${reason}\n\nBởi: ${request.user.full_name}`;
            notifyTelegram(null, 'huy_khach', tgMsg);
            return { success: true, message: 'Đã nhắc lại yêu cầu hủy khách!' };
        }

        // ★ Helper: gửi yêu cầu hủy chờ duyệt
        const _sendCancelRequest = async (msg) => {
            await db.run(
                `UPDATE customers SET cancel_requested = 1, cancel_approved = 0, cancel_reason = ?,
                 cancel_requested_by = ?, cancel_requested_at = NOW()::text,
                 cancel_approved_by = NULL, cancel_approved_at = NULL,
                 order_status = 'cho_duyet_huy',
                 appointment_date = NULL,
                 updated_at = NOW() WHERE id = ?`,
                [reason, request.user.id, custId]
            );
            // Log để đếm STT chính xác
            await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES (?, 'huy', ?, ?)`,
                [custId, `❌ Yêu cầu hủy khách: ${reason}`, request.user.id]);
            const tgMsg = `❌ <b>${cancelCode} : YÊU CẦU HỦY KHÁCH</b> ❌\n\nKhách: <code>${customer.customer_name}</code>\nLý do: ${reason}\n\nBởi: ${request.user.full_name}`;
            notifyTelegram(null, 'huy_khach', tgMsg);
            return { success: true, message: msg || 'Yêu cầu hủy đã được gửi. Chờ duyệt.' };
        };

        // ★ Sale CRM → tự động hủy luôn, không cần chờ duyệt
        if (customer.crm_type === 'sale') {
            return _directCancel();
        }

        // ★ GĐ / QLCC → duyệt trực tiếp mọi khách
        if (['giam_doc', 'quan_ly_cap_cao'].includes(request.user.role)) {
            return _directCancel();
        }

        // ★ QL → duyệt trực tiếp khách của CẤP DƯỚI, chờ duyệt khách của chính mình
        if (request.user.role === 'quan_ly') {
            if (customer.assigned_to_id !== request.user.id) {
                // Khách không phải của QL → kiểm tra NV đó thuộc phòng ban QL quản lý không
                const managedDeptIds = await getManagedDeptIds(request.user.id);
                const assignee = await db.get('SELECT department_id FROM users WHERE id = ?', [customer.assigned_to_id]);
                if (assignee && managedDeptIds.includes(assignee.department_id)) {
                    return _directCancel(); // QL duyệt trực tiếp cho cấp dưới
                }
            }
            // Khách của chính QL hoặc phòng khác → chờ GĐ/QLCC duyệt
            return _sendCancelRequest('Yêu cầu hủy đã được gửi. Chờ Giám Đốc/QLCC duyệt.');
        }

        // ★ NV / TP → gửi yêu cầu chờ duyệt
        if (['nhan_vien', 'truong_phong'].includes(request.user.role)) {
            return _sendCancelRequest('Yêu cầu hủy đã được gửi. Chờ Giám Đốc/QLCC duyệt.');
        }

        return reply.code(403).send({ error: 'Không có quyền hủy' });
    });

    // ========== HỦY ĐƠN TRẢ CỌC (Cancel active order after chot_don) ==========
    fastify.post('/api/customers/:id/cancel-order', { preHandler: [authenticate] }, async (request, reply) => {
        const { reason } = request.body || {};
        if (!reason) return reply.code(400).send({ error: 'Vui lòng nhập lý do hủy đơn trả cọc' });
        const custId = Number(request.params.id);
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [custId]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        // Only allow cancel-order when status is chot_don (or dang_san_xuat)
        if (!['chot_don'].includes(customer.order_status)) {
            return reply.code(400).send({ error: customer.order_status === 'cho_duyet_huy_don' ? 'Đã gửi yêu cầu hủy đơn rồi. Đang chờ duyệt.' : 'Chỉ có thể hủy đơn trả cọc khi đã Chốt Đơn.' });
        }

        // Build mã Hủy Đơn Trả Cọc (STT-ngày-tháng-Ynăm) — đếm riêng theo ngày
        const today = getVNToday();
        const [yy, mm, dd] = today.split('-').map(Number);
        const yLabel = 'Y' + String(yy).slice(-2);
        const hdtcCount = await db.get(
            "SELECT COUNT(*) as cnt FROM consultation_logs WHERE log_type = 'huy_don_tra_coc' AND content LIKE '🚫%' AND created_at::date = $1::date",
            [today]
        );
        const hdtcSTT = Number(hdtcCount?.cnt || 0) + 1;
        const hdtcCode = `${hdtcSTT}-${dd}-${mm}-${yLabel}`;

        // Helper: send cancel-order request (pending)
        const _sendCancelOrderRequest = async (msg) => {
            await db.run(
                `UPDATE customers SET cancel_requested = 1, cancel_approved = 0, cancel_reason = $1,
                 cancel_requested_by = $2, cancel_requested_at = NOW()::text,
                 cancel_approved_by = NULL, cancel_approved_at = NULL,
                 order_status = 'cho_duyet_huy_don',
                 updated_at = NOW() WHERE id = $3`,
                [reason, request.user.id, custId]
            );
            // Log
            await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES ($1, 'huy_don_tra_coc', $2, $3)`,
                [custId, `🚫 Yêu cầu hủy đơn trả cọc: ${reason}`, request.user.id]);
            // Telegram
            const tgMsg = `🚫 <b>${hdtcCode} : YÊU CẦU HỦY ĐƠN TRẢ CỌC</b> 🚫\n\nKhách: <code>${customer.customer_name}</code>\nLý do: ${reason}\n\nBởi: ${request.user.full_name}`;
            notifyTelegram(null, 'huy_don_tra_coc', tgMsg);
            return { success: true, message: msg || 'Yêu cầu hủy đơn trả cọc đã gửi. Chờ duyệt.' };
        };

        // GĐ/QLCC → still requires approval flow (no direct cancel for orders)
        // All roles → send request pending approval
        return _sendCancelOrderRequest('Yêu cầu hủy đơn trả cọc đã gửi. Chờ Giám Đốc/QLCC duyệt.');
    });

    // ★ DUYỆT HỦY ĐƠN TRẢ CỌC — GĐ/QLCC only
    fastify.post('/api/customers/:id/approve-cancel-order', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { approve, manager_note } = request.body || {};
        const custId = Number(request.params.id);
        if (!manager_note) return reply.code(400).send({ error: 'Vui lòng nhập lý do!' });

        const customer = await db.get('SELECT * FROM customers WHERE id = $1', [custId]);
        if (!customer || customer.order_status !== 'cho_duyet_huy_don') {
            return reply.code(400).send({ error: 'Khách hàng không có yêu cầu hủy đơn trả cọc.' });
        }

        // QL cannot approve own request
        if (request.user.role === 'quan_ly') {
            if (Number(customer.cancel_requested_by) === Number(request.user.id)) {
                return reply.code(403).send({ error: 'Không thể tự duyệt yêu cầu hủy đơn của chính mình.' });
            }
        }

        // Build mã STT — tìm STT gốc từ lần yêu cầu đầu tiên
        const today = getVNToday();
        const [yy, mm, dd] = today.split('-').map(Number);
        const yLabel = 'Y' + String(yy).slice(-2);
        const origLog = await db.get(
            "SELECT id, created_at FROM consultation_logs WHERE customer_id = $1 AND log_type = 'huy_don_tra_coc' AND content LIKE '🚫%' ORDER BY id DESC LIMIT 1",
            [custId]
        );
        let hdtcCode = `?-${dd}-${mm}-${yLabel}`;
        if (origLog) {
            const origDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(origLog.created_at));
            const origCnt = await db.get(
                "SELECT COUNT(*) as cnt FROM consultation_logs WHERE log_type = 'huy_don_tra_coc' AND content LIKE '🚫%' AND created_at::date = $1::date AND id <= $2",
                [origDate, origLog.id]
            );
            const stt = Number(origCnt?.cnt) || 1;
            const [oy, om, od] = origDate.split('-').map(Number);
            hdtcCode = `${stt}-${od}-${om}-Y${String(oy).slice(-2)}`;
        }

        const cancelRequester = customer.cancel_requested_by ? await db.get('SELECT full_name FROM users WHERE id = ?', [customer.cancel_requested_by]) : null;
        const reqName = cancelRequester?.full_name || '?';
        const origReason = (customer.cancel_reason || '(không có)').split('\n')[0].replace(/^🚫\s*(Yêu cầu hủy đơn trả cọc:\s*)?/i, '');

        const nextBizDay = await getNextWorkingDay(new Date(), customer.assigned_to_id);

        if (approve) {
            const client = await db.getDB().connect();
            try {
                await client.query('BEGIN');

                await client.query(
                    `UPDATE customers SET 
                     cancel_approved = 0, cancel_requested = 0,
                     cancel_reason = cancel_reason || $1,
                     order_status = 'da_huy_don_tra_coc',
                     appointment_date = $2,
                     is_pinned = false, pinned_at = NULL,
                     updated_at = NOW() WHERE id = $3`,
                    [`\n✅ Duyệt hủy đơn: ${manager_note}`, nextBizDay, custId]
                );

                // Find active orders before cancelling
                const activeOrdersRes = await client.query("SELECT order_code FROM order_codes WHERE customer_id = $1 AND status = 'active'", [custId]);
                const activeOrderCodes = activeOrdersRes.rows.map(r => r.order_code);

                // Cancel all active order_codes for this customer
                await client.query("UPDATE order_codes SET status = 'cancelled' WHERE customer_id = $1 AND status = 'active'", [custId]);

                // Refund allowed slips for restricted fabric colors if order exists in DHT
                if (activeOrderCodes.length > 0) {
                    const { refundSlipsForDeletedOrCancelledOrder } = require('../utils/kv_allowed_slips');
                    const { refundImportSlipsForDeletedOrCancelledOrder } = require('../utils/kv_allowed_imports');
                    for (const code of activeOrderCodes) {
                        const dhtOrderRes = await client.query('SELECT id FROM dht_orders WHERE order_code = $1', [code]);
                        const dhtOrder = dhtOrderRes.rows[0];
                        if (dhtOrder) {
                            await refundSlipsForDeletedOrCancelledOrder(client, dhtOrder.id);
                            await refundImportSlipsForDeletedOrCancelledOrder(client, dhtOrder.id);
                        }
                    }
                }

                // Log
                await client.query(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES ($1, 'huy_don_tra_coc', $2, $3)`,
                    [custId, `✅ Duyệt hủy đơn trả cọc — ${manager_note}`, request.user.id]);

                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                return reply.code(400).send({ error: err.message });
            } finally {
                client.release();
            }
            // Telegram
            const tgMsg = `✅ <b>${hdtcCode} : DUYỆT HỦY ĐƠN TRẢ CỌC</b> ✅\nKhách: <code>${customer.customer_name}</code>\n\nNội dung (${reqName}) Hủy Đơn : ${origReason}\n\nSếp Duyệt Hủy Đơn : <b>${manager_note}</b>\n\nDuyệt bởi: ${request.user.full_name}`;
            notifyTelegram(null, 'huy_don_tra_coc', tgMsg);
            return { success: true, message: 'Đã duyệt hủy đơn trả cọc. Khách quay về chăm sóc lại.' };
        } else {
            // ❌ REJECT: Return to chot_don
            await db.run(
                `UPDATE customers SET 
                 cancel_approved = 0, cancel_requested = 0,
                 cancel_reason = cancel_reason || $1,
                 order_status = 'chot_don',
                 appointment_date = $2,
                 updated_at = NOW() WHERE id = $3`,
                [`\n❌ Từ chối hủy đơn: ${manager_note}`, nextBizDay, custId]
            );
            // Log
            await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES ($1, 'huy_don_tra_coc', $2, $3)`,
                [custId, `❌ Từ chối hủy đơn trả cọc — ${manager_note}`, request.user.id]);
            // Telegram
            const tgMsg = `📋 <b>${hdtcCode} : TỪ CHỐI HỦY ĐƠN TRẢ CỌC</b> 📋\nKhách: <code>${customer.customer_name}</code>\n\nNội dung (${reqName}) Hủy Đơn : ${origReason}\n\nSếp Từ Chối Hủy Đơn : <b>${manager_note}</b>\n\nTừ chối bởi: ${request.user.full_name}`;
            notifyTelegram(null, 'huy_don_tra_coc', tgMsg);
            return { success: true, message: 'Đã từ chối hủy đơn. Khách tiếp tục sản xuất.' };
        }
    });

    // ★ GĐ, QLCC duyệt tất cả. QL duyệt được nhưng KHÔNG tự duyệt của mình.
    fastify.post('/api/customers/:id/approve-cancel', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { approve, manager_note } = request.body || {};
        const custId = Number(request.params.id);
        if (!manager_note) return reply.code(400).send({ error: 'Vui lòng nhập lý do!' });

        // ★ QL không được tự duyệt yêu cầu hủy của chính mình
        if (request.user.role === 'quan_ly') {
            const cust = await db.get('SELECT cancel_requested_by FROM customers WHERE id = ?', [custId]);
            if (cust && Number(cust.cancel_requested_by) === Number(request.user.id)) {
                return reply.code(403).send({ error: 'Không thể tự duyệt yêu cầu hủy của chính mình. Vui lòng chờ Giám Đốc/QLCC duyệt.' });
            }
        }

        // Lấy thông tin khách để build STT + thông báo
        const customer = await db.get('SELECT customer_name, cancel_requested_at, cancel_reason, cancel_requested_by FROM customers WHERE id = ?', [custId]);
        const custName = customer?.customer_name || '?';
        const cancelRequester = customer?.cancel_requested_by ? await db.get('SELECT full_name FROM users WHERE id = ?', [customer.cancel_requested_by]) : null;
        const reqName = cancelRequester?.full_name || '?';
        const origReason = (customer?.cancel_reason || '(không có)').split('\n')[0].replace(/^❌\s*(Yêu cầu hủy khách:\s*|Nhắc lại hủy khách:\s*)?/i, '');

        // Build mã STT gốc từ ngày cancel_requested_at
        let cancelCode = '?';
        if (customer?.cancel_requested_at) {
            const origDateStr = customer.cancel_requested_at.substring(0, 10);
            const origCount = await db.get(
                "SELECT COUNT(*) as cnt FROM consultation_logs WHERE log_type = 'huy' AND created_at::date = $1::date AND id <= (SELECT MIN(id) FROM consultation_logs WHERE customer_id = $2 AND log_type = 'huy')",
                [origDateStr, custId]
            );
            const stt = Number(origCount?.cnt) || 1;
            const [oy, om, od] = origDateStr.split('-').map(Number);
            cancelCode = `${stt}-${od}-${om}-Y${String(oy).slice(-2)}`;
        }

        if (approve) {
            await db.run(
                `UPDATE customers SET cancel_approved = 1, cancel_approved_by = ?,
                 cancel_approved_at = NOW()::text,
                 cancel_reason = cancel_reason || ?,
                 order_status = 'duyet_huy',
                 appointment_date = NULL,
                 is_pinned = false, pinned_at = NULL,
                 updated_at = NOW() WHERE id = ?`,
                [request.user.id, `\n📋 QL: ${manager_note}`, custId]
            );
            const linkedUser = await db.get("SELECT id, full_name FROM users WHERE source_customer_id = ? AND status = 'active'", [custId]);
            if (linkedUser) {
                await db.run("UPDATE users SET status = 'locked', updated_at = NOW() WHERE id = ?", [linkedUser.id]);
                notifyTelegram(null, 'huy_khach', `🔒 <b>Tài khoản bị khóa tự động</b>\nAffiliate: ${linkedUser.full_name}\nLý do: Khách hàng nguồn bị hủy`);
            }

            // ★ Thông báo DUYỆT HỦY lên Telegram
            const tgMsg = `✅ <b>${cancelCode} : DUYỆT HỦY KHÁCH</b> ✅\nKhách: <code>${custName}</code>\n\nNội dung (${reqName}) Hủy : ${origReason}\n\nSếp Duyệt Hủy Khách : <b>${manager_note}</b>\n\nDuyệt bởi: ${request.user.full_name}`;
            notifyTelegram(null, 'huy_khach', tgMsg);

            return { success: true, message: 'Đã duyệt hủy khách hàng.' + (linkedUser ? ` Tài khoản ${linkedUser.full_name} đã bị khóa.` : '') };
        } else {
            // Next working day (skip CN + lễ + nghỉ phép NV)
            const cust = await db.get('SELECT assigned_to_id FROM customers WHERE id = $1', [custId]);
            const nextBizDay = await getNextWorkingDay(new Date(), cust?.assigned_to_id);
            await db.run(
                `UPDATE customers SET cancel_approved = -1, cancel_approved_by = ?,
                 cancel_approved_at = NOW()::text,
                 cancel_reason = cancel_reason || ?,
                 order_status = 'tu_van_lai', appointment_date = ?,
                 updated_at = NOW() WHERE id = ?`,
                [request.user.id, `\n❌ Từ chối: ${manager_note}`, nextBizDay, custId]
            );

            // ★ Thông báo TỪ CHỐI HỦY lên Telegram
            const tgMsg = `📋 <b>${cancelCode} : TỪ CHỐI HỦY KHÁCH</b> 📋\nKhách: <code>${custName}</code>\n\nNội dung (${reqName}) Hủy : ${origReason}\n\nSếp Từ Chối Hủy Khách : <b>${manager_note}</b>\n\nTừ chối bởi: ${request.user.full_name}`;
            notifyTelegram(null, 'huy_khach', tgMsg);

            return { success: true, message: 'Đã từ chối hủy. Khách hàng chuyển sang Tư Vấn Lại.' };
        }
    });

    // ========== AUTO-REVERT EXPIRED CANCELS (smart deadline) ==========
    fastify.post('/api/cancel/auto-revert-expired', { preHandler: [authenticate] }, async (request, reply) => {
        // Find all pending cancel requests — check smart deadline (23:59 next working day, skip CN + lễ)
        const pending = await db.all(
            `SELECT id, customer_name, phone, cancel_requested_by, assigned_to_id, order_status,
                    cancel_requested_at
             FROM customers 
             WHERE cancel_requested = 1 AND cancel_approved = 0 
             AND cancel_requested_at IS NOT NULL 
             AND order_status IN ('cho_duyet_huy', 'cho_duyet_huy_don')`
        );

        const now = new Date();
        const expired = [];
        for (const c of pending) {
            const realDeadline = await calculateRealDeadline(c.cancel_requested_at, null, 23);
            if (now < realDeadline) continue; // Chưa hết hạn
            expired.push(c);
        }

        if (expired.length === 0) return { success: true, reverted: 0, customers: [] };

        for (const c of expired) {
            const nextBizDay = await getNextWorkingDay(new Date(), c.assigned_to_id);
            if (c.order_status === 'cho_duyet_huy_don') {
                // Hủy đơn trả cọc expired → return to chot_don
                await db.run(
                    `UPDATE customers SET cancel_approved = 0, cancel_requested = 0,
                     cancel_reason = cancel_reason || $1,
                     order_status = 'chot_don', appointment_date = $2,
                     updated_at = NOW() WHERE id = $3`,
                    ['\n⏰ Tự động: Quá hạn không phản hồi hủy đơn', nextBizDay, c.id]
                );
            } else {
                // Hủy khách expired → return to tu_van_lai
                await db.run(
                    `UPDATE customers SET cancel_approved = -2,
                     cancel_reason = cancel_reason || $1,
                     order_status = 'tu_van_lai', appointment_date = $2,
                     updated_at = NOW() WHERE id = $3`,
                    ['\n⏰ Tự động: Quá hạn không có phản hồi', nextBizDay, c.id]
                );
            }
        }
        return { success: true, reverted: expired.length, customers: expired };
    });

    // ========== COUNT PENDING CANCEL REQUESTS ==========
    fastify.get('/api/cancel/pending-count', { preHandler: [authenticate] }, async (request, reply) => {
        const result = await db.get(`SELECT COUNT(*) as count FROM customers WHERE cancel_requested = 1 AND cancel_approved = 0`);
        return { count: Number(result?.count) || 0 };
    });

    // ========== COUNT PENDING EMERGENCY REQUESTS ==========
    fastify.get('/api/emergency/pending-count', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        let result;
        if (user.role === 'giam_doc') {
            result = await db.get(`SELECT COUNT(*) as count FROM emergencies WHERE status = 'pending'`);
        } else if (['quan_ly', 'truong_phong'].includes(user.role)) {
            result = await db.get(
                `SELECT COUNT(*) as count FROM emergencies WHERE status = 'pending' AND (handler_id = $1 OR requested_by = $1 OR handover_to = $1)`,
                [user.id]
            );
        } else {
            return { count: 0 };
        }
        return { count: Number(result?.count) || 0 };
    });

    // ========== COUNT RECENTLY AUTO-REVERTED FOR NV ==========
    fastify.get('/api/cancel/reverted-for-me', { preHandler: [authenticate] }, async (request, reply) => {
        // Get customers that were auto-reverted (cancel_approved = -1) and assigned to current user
        const customers = await db.all(
            `SELECT id, customer_name, phone FROM customers 
             WHERE cancel_approved = -1 AND assigned_to_id = $1 
             AND order_status = 'dang_tu_van'
             AND cancel_reason LIKE '%Tự động từ chối%'`, 
            [request.user.id]
        );
        return { count: customers.length, customers };
    });

    // ========== CẤP CỨU SẾP ==========
    fastify.post('/api/emergencies', { preHandler: [authenticate] }, async (request, reply) => {
        const { customer_id, reason, handler_id } = request.body || {};
        if (!reason) return reply.code(400).send({ error: 'Vui lòng nhập lý do cấp cứu' });
        if (!handler_id) return reply.code(400).send({ error: 'Vui lòng chọn người xử lý' });
        if (!customer_id) return reply.code(400).send({ error: 'Vui lòng chọn khách hàng' });

        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [Number(customer_id)]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });
        const handler = await db.get('SELECT * FROM users WHERE id = ?', [Number(handler_id)]);
        if (!handler) return reply.code(404).send({ error: 'Không tìm thấy người xử lý' });

        // Build mã Cấp Cứu riêng (STT-ngày-tháng-Ynăm) — đếm theo ngày VN
        const today = getVNToday();
        const [yy, mm, dd] = today.split('-').map(Number);
        const yLabel = 'Y' + String(yy).slice(-2);

        // Check if there's already a pending emergency for this customer
        const pendingEm = await db.get("SELECT id, created_at FROM emergencies WHERE customer_id = ? AND status = 'pending'", [Number(customer_id)]);

        // Calculate next business day for appointment
        const nextBizDay = await getNextWorkingDay(new Date(), customer_id);

        if (pendingEm) {
            // REPEAT: Tìm STT gốc của emergency này (đếm vị trí trong ngày tạo)
            const origCount = await db.get(
                `SELECT COUNT(*) as cnt FROM emergencies 
                 WHERE created_at::date = (SELECT created_at::date FROM emergencies WHERE id = $1) 
                 AND id <= $1`,
                [pendingEm.id]
            );
            const origSTT = Number(origCount?.cnt) || 0;
            // Lấy ngày VN từ created_at gốc
            const origVNDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(pendingEm.created_at));
            const [oy, om, od] = origVNDate.split('-').map(Number);
            const origY = 'Y' + String(oy).slice(-2);
            const emCode = `${origSTT}-${od}-${om}-${origY}`;

            await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES (?, 'cap_cuu_sep', ?, ?)`,
                [Number(customer_id), `🚨 Nhắc lại cấp cứu sếp: ${reason}`, request.user.id]);
            await db.run(`UPDATE customers SET appointment_date = ? WHERE id = ?`, [nextBizDay, Number(customer_id)]);

            const tgMsg = `🚨 <b>${emCode} : NHẮC LẠI CẤP CỨU SẾP</b> 🚨\n\nKhách: <code>${customer.customer_name}</code>\nLý do: ${reason}\n\nGửi cho: ${handler.full_name}\nBởi: ${request.user.full_name}`;
            notifyTelegram(null, 'cap_cuu_sep', tgMsg);
            return { success: true, id: pendingEm.id, message: 'Đã nhắc lại cấp cứu sếp!' };
        }

        // FIRST TIME: Đếm số emergency hôm nay → STT mới (PG timezone = VN)
        const todayCount = await db.get(
            "SELECT COUNT(*) as cnt FROM emergencies WHERE created_at::date = $1::date",
            [today]
        );
        const emSTT = Number(todayCount?.cnt || 0) + 1;
        const emCode = `${emSTT}-${dd}-${mm}-${yLabel}`;

        const result = await db.run('INSERT INTO emergencies (customer_id, requested_by, reason, handler_id) VALUES (?,?,?,?)',
            [Number(customer_id), request.user.id, reason, Number(handler_id)]);

        // Log consultation so customer appears in 'Đã xử lý hôm nay'
        await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES (?, 'cap_cuu_sep', ?, ?)`,
            [Number(customer_id), `🚨 Cấp cứu sếp: ${reason}`, request.user.id]);

        // Auto-set appointment to next business day
        await db.run(`UPDATE customers SET appointment_date = ? WHERE id = ?`, [nextBizDay, Number(customer_id)]);

        const tgMsg = `🚨 <b>${emCode} : CẤP CỨU SẾP</b> 🚨\n\nKhách: <code>${customer.customer_name}</code>\nLý do: ${reason}\n\nGửi cho: ${handler.full_name}\nBởi: ${request.user.full_name}`;
        notifyTelegram(null, 'cap_cuu_sep', tgMsg);
        return { success: true, id: result.lastInsertRowid, message: 'Đã gửi cấp cứu sếp!' };
    });

    // Check if customer has a pending emergency
    fastify.get('/api/emergencies/pending/:customerId', { preHandler: [authenticate] }, async (request, reply) => {
        const cid = Number(request.params.customerId);
        const pending = await db.get("SELECT id, reason, handler_id FROM emergencies WHERE customer_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1", [cid]);
        return { hasPending: !!pending, emergency: pending || null };
    });

    fastify.get('/api/emergencies/handlers', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const dbUser = await db.get('SELECT department_id FROM users WHERE id = ?', [user.id]);
        const userDept = dbUser ? dbUser.department_id : null;
        const handlers = [];
        const addHandler = (u) => { if (u && !handlers.find(h => h.id === u.id)) handlers.push(u); };

        async function getManagersOfDept(deptId) {
            const byDept = await db.all("SELECT id, full_name, role, department_id FROM users WHERE department_id = ? AND role IN ('quan_ly','giam_doc') AND status = 'active'", [deptId]);
            byDept.forEach(addHandler);
            const dept = await db.get('SELECT head_user_id FROM departments WHERE id = ?', [deptId]);
            if (dept && dept.head_user_id) {
                const head = await db.get("SELECT id, full_name, role, department_id FROM users WHERE id = ? AND status = 'active'", [dept.head_user_id]);
                addHandler(head);
            }
        }

        if (user.role === 'quan_ly') {
            const gds = await db.all("SELECT id, full_name, role, department_id FROM users WHERE role = 'giam_doc' AND status = 'active'");
            return { handlers: gds };
        }
        if (user.role === 'truong_phong') {
            if (userDept) {
                const myDept = await db.get('SELECT parent_id FROM departments WHERE id = ?', [userDept]);
                if (myDept && myDept.parent_id) await getManagersOfDept(myDept.parent_id);
                await getManagersOfDept(userDept);
            }
            const gds = await db.all("SELECT id, full_name, role, department_id FROM users WHERE role = 'giam_doc' AND status = 'active'");
            gds.forEach(addHandler);
            return { handlers: handlers.filter(h => h.id !== user.id) };
        }
        if (userDept) {
            const tps = await db.all("SELECT id, full_name, role, department_id FROM users WHERE department_id = ? AND role = 'truong_phong' AND status = 'active' AND id != ?", [userDept, user.id]);
            tps.forEach(addHandler);
            const myDept = await db.get('SELECT parent_id FROM departments WHERE id = ?', [userDept]);
            if (myDept && myDept.parent_id) await getManagersOfDept(myDept.parent_id);
            await getManagersOfDept(userDept);
        }
        const gds = await db.all("SELECT id, full_name, role, department_id FROM users WHERE role = 'giam_doc' AND status = 'active'");
        gds.forEach(addHandler);
        return { handlers: handlers.filter(h => h.id !== user.id) };
    });

    fastify.get('/api/emergencies', { preHandler: [authenticate] }, async (request, reply) => {
        await db.run(`UPDATE emergencies SET handover_to = NULL, handover_at = NULL, handover_status = NULL
                WHERE handover_status = 'pending'
                AND (handover_at::timestamp + INTERVAL '30 minutes') < NOW()`);

        const { status } = request.query;
        let query = `SELECT e.*,
            u.full_name as requested_by_name, u.role as requested_by_role,
            c.customer_name, c.phone as customer_phone, c.assigned_to_id as customer_assigned_to,
            ru.full_name as resolved_by_name,
            hu.full_name as handler_name,
            htu.full_name as handover_to_name
            FROM emergencies e
            LEFT JOIN users u ON e.requested_by = u.id
            LEFT JOIN customers c ON e.customer_id = c.id
            LEFT JOIN users ru ON e.resolved_by = ru.id
            LEFT JOIN users hu ON e.handler_id = hu.id
            LEFT JOIN users htu ON e.handover_to = htu.id
            WHERE 1=1`;
        const params = [];
        if (status) { query += ' AND e.status = ?'; params.push(status); }

        const user = request.user;
        if (user.role === 'giam_doc') {
            // sees ALL
        } else if (user.role === 'quan_ly') {
            const allDepts = await db.all('SELECT id, parent_id, head_user_id FROM departments');
            const managedRootIds = allDepts.filter(d => d.head_user_id === user.id).map(d => d.id);
            function getChildIds(parentId) {
                let ids = [parentId];
                allDepts.filter(d => d.parent_id === parentId).forEach(c => ids.push(...getChildIds(c.id)));
                return ids;
            }
            let allManagedDeptIds = [];
            managedRootIds.forEach(id => allManagedDeptIds.push(...getChildIds(id)));
            if (allManagedDeptIds.length > 0) {
                const placeholders = allManagedDeptIds.map(() => '?').join(',');
                query += ` AND (e.handler_id = ? OR e.requested_by = ? OR e.handover_to = ? OR e.requested_by IN (SELECT id FROM users WHERE department_id IN (${placeholders})))`;
                params.push(user.id, user.id, user.id, ...allManagedDeptIds);
            } else {
                query += ' AND (e.handler_id = ? OR e.requested_by = ? OR e.handover_to = ?)';
                params.push(user.id, user.id, user.id);
            }
        } else {
            query += ' AND (e.handler_id = ? OR e.requested_by = ? OR e.handover_to = ?)';
            params.push(user.id, user.id, user.id);
        }
        query += ' ORDER BY e.created_at DESC';
        const emergencies = await db.all(query, params);
        // Calculate real deadline_at for pending emergencies (12h noon next working day)
        for (const em of emergencies) {
            if (em.status !== 'resolved' && em.created_at) {
                try {
                    const handlerId = em.handover_to || em.handler_id;
                    const dl = await calculateRealDeadline(em.created_at, handlerId, 12);
                    em.deadline_at = dl.toISOString();
                } catch(e) { em.deadline_at = null; }
            }
        }
        // Mask customer_phone for non-owner viewers
        if (!['giam_doc', 'quan_ly_cap_cao'].includes(user.role)) {
            const { maskPhone } = require('../utils/dataMasking');
            for (const em of emergencies) {
                if (em.customer_assigned_to !== user.id && em.customer_phone) {
                    em.customer_phone = maskPhone(em.customer_phone);
                }
            }
        }
        return { emergencies };
    });

    fastify.put('/api/emergencies/:id/resolve', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'truong_phong')] }, async (request, reply) => {
        const { note, status } = request.body || {};
        const emId = Number(request.params.id);
        const em = await db.get('SELECT * FROM emergencies WHERE id = ?', [emId]);
        if (!em) return reply.code(404).send({ error: 'Không tìm thấy cấp cứu' });

        await db.run(
            `UPDATE emergencies SET status = ?, resolved_by = ?, resolved_note = ?,
             resolved_at = NOW()::text,
             handover_to = NULL, handover_at = NULL, handover_status = NULL
             WHERE id = ?`,
            [status || 'resolved', request.user.id, note || null, emId]
        );

        if (em && em.customer_id) {
            const customer = await db.get('SELECT customer_name FROM customers WHERE id = ?', [em.customer_id]);
            const requester = await db.get('SELECT full_name FROM users WHERE id = ?', [em.requested_by]);
            const nextBizDay = await getNextWorkingDay(new Date(), em.customer_id);
            await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES (?, 'hoan_thanh_cap_cuu', ?, ?)`,
                [em.customer_id, `🏥 Cấp cứu hoàn thành: ${note || ''}`, request.user.id]);
            await db.run(`UPDATE customers SET appointment_date = ? WHERE id = ?`, [nextBizDay, em.customer_id]);

            // Build STT code for this emergency
            const origVNDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(em.created_at));
            const origCount = await db.get(
                "SELECT COUNT(*) as cnt FROM emergencies WHERE created_at::date = $1::date AND id <= $2",
                [origVNDate, em.id]
            );
            const stt = Number(origCount?.cnt) || 1;
            const [oy, om, od] = origVNDate.split('-').map(Number);
            const origY = 'Y' + String(oy).slice(-2);
            const emCode = `${stt}-${od}-${om}-${origY}`;

            const custName = customer?.customer_name || '?';
            const reqName = requester?.full_name || '?';
            const tgMsg = `✅ <b>${emCode} : ĐÃ XỬ LÝ CẤP CỨU SẾP</b> ✅\nKhách: <code>${custName}</code>\n\nNội dung cấp cứu (${reqName}) : ${em.reason || '(không có)'}\n\nTư Vấn của Sếp : ${note || '(không có)'}\n\nXử lý bởi: ${request.user.full_name}`;
            notifyTelegram(null, 'cap_cuu_sep', tgMsg);
        }
        return { success: true, message: 'Đã xử lý cấp cứu!' };
    });

    fastify.post('/api/emergencies/:id/handover', { preHandler: [authenticate, requireRole('truong_phong', 'quan_ly')] }, async (request, reply) => {
        const em = await db.get('SELECT * FROM emergencies WHERE id = ?', [Number(request.params.id)]);
        if (!em) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (em.handler_id !== request.user.id) return reply.code(403).send({ error: 'Bạn không phải người xử lý' });
        if (em.handover_status === 'pending') return reply.code(400).send({ error: 'Đang có bàn giao chờ chấp nhận' });
        const { target_id } = request.body || {};
        if (!target_id) return reply.code(400).send({ error: 'Vui lòng chọn người nhận bàn giao' });
        await db.run(`UPDATE emergencies SET handover_to = ?, handover_at = NOW()::text, handover_status = 'pending' WHERE id = ?`,
            [Number(target_id), em.id]);
        return { success: true, message: 'Đã gửi yêu cầu bàn giao!' };
    });

    fastify.post('/api/emergencies/:id/accept-handover', { preHandler: [authenticate] }, async (request, reply) => {
        const em = await db.get('SELECT * FROM emergencies WHERE id = ?', [Number(request.params.id)]);
        if (!em) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (em.handover_to !== request.user.id) return reply.code(403).send({ error: 'Bạn không phải người được bàn giao' });
        if (em.handover_status !== 'pending') return reply.code(400).send({ error: 'Bàn giao đã hết hiệu lực' });
        const handoverAt = new Date(em.handover_at);
        if (Date.now() - handoverAt.getTime() > 30 * 60 * 1000) {
            await db.run(`UPDATE emergencies SET handover_to = NULL, handover_at = NULL, handover_status = NULL WHERE id = ?`, [em.id]);
            return reply.code(400).send({ error: 'Bàn giao đã hết thời hạn 30 phút' });
        }
        await db.run(`UPDATE emergencies SET handler_id = ?, handover_status = 'accepted', assigned_at = NOW() WHERE id = ?`, [request.user.id, em.id]);
        return { success: true, message: 'Đã chấp nhận bàn giao!' };
    });

    fastify.post('/api/emergencies/:id/cancel-handover', { preHandler: [authenticate] }, async (request, reply) => {
        const em = await db.get('SELECT * FROM emergencies WHERE id = ?', [Number(request.params.id)]);
        if (!em) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (em.handler_id !== request.user.id && em.handover_to !== request.user.id) return reply.code(403).send({ error: 'Bạn không có quyền hủy bàn giao này' });
        await db.run(`UPDATE emergencies SET handover_to = NULL, handover_at = NULL, handover_status = NULL WHERE id = ?`, [em.id]);
        return { success: true, message: 'Đã hủy bàn giao!' };
    });

    // ========== DASHBOARD STATS ==========
    fastify.get('/api/dashboard/stats', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        let whereClause = '';
        let params = [];

        // ★ Production Mode: ẩn dữ liệu test (theo thời gian + tài khoản test)
        const _cutoff = await getProductionCutoff();
        const _testIds = await getTestAccountIds();
        const _prodFilter = buildProductionFilter(_cutoff, _testIds, 'created_at', 'created_by');

        if (user.role === 'nhan_vien') {
            whereClause = 'WHERE assigned_to_id = ?'; params = [user.id];
        } else if (user.role === 'truong_phong') {
            whereClause = `WHERE (assigned_to_id = ? OR assigned_to_id IN (
                SELECT tm.user_id FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.leader_id = ?
            ))`; params = [user.id, user.id];
        }

        // Inject production filter into WHERE
        if (_prodFilter) {
            if (whereClause) { whereClause += _prodFilter; } else { whereClause = 'WHERE 1=1' + _prodFilter; }
        }

        const total = await db.get(`SELECT COUNT(*) as cnt FROM customers ${whereClause}`, params);
        const today = new Date().toISOString().split('T')[0];
        const newToday = await db.get(`SELECT COUNT(*) as cnt FROM customers ${whereClause ? whereClause + ' AND' : 'WHERE'} created_at::date = ?::date`, [...params, today]);

        const totalRevenue = await db.get(`SELECT COALESCE(SUM(sub.rev), 0) as revenue FROM (
            SELECT COALESCE(
                (SELECT SUM(di.item_total) FROM dht_orders d JOIN dht_order_items di ON di.dht_order_id = d.id WHERE d.order_code = oc.order_code),
                (SELECT SUM(oi_f.total) FROM order_items oi_f WHERE oi_f.order_code_id = oc.id),
                0
            ) - COALESCE((SELECT d2.vat_amount FROM dht_orders d2 WHERE d2.order_code = oc.order_code), 0)
              - COALESCE((SELECT d3.discount_amount FROM dht_orders d3 WHERE d3.order_code = oc.order_code), 0) as rev
            FROM order_codes oc
            JOIN customers c ON oc.customer_id = c.id ${whereClause ? whereClause.replace('WHERE', 'AND') : ''}
            WHERE c.order_status IN ('chot_don','san_xuat','giao_hang','hoan_thanh')
            AND (oc.status IS NULL OR oc.status != 'cancelled')
            GROUP BY oc.id, oc.order_code
        ) sub`, params);

        const closed = await db.get(`SELECT COUNT(*) as cnt FROM customers ${whereClause ? whereClause + ' AND' : 'WHERE'} order_status IN ('chot_don','san_xuat','giao_hang','hoan_thanh')`, params);
        const rate = total?.cnt > 0 ? Math.round((closed?.cnt / total?.cnt) * 100) : 0;

        const topEmployees = await db.all(`
            SELECT u.full_name, COUNT(c.id) as customer_count,
            COALESCE(SUM(CASE WHEN c.order_status IN ('chot_don','san_xuat','giao_hang','hoan_thanh') THEN 1 ELSE 0 END), 0) as closed_count
            FROM users u LEFT JOIN customers c ON c.assigned_to_id = u.id
            WHERE u.role = 'nhan_vien' AND u.status = 'active'
            GROUP BY u.id, u.full_name ORDER BY closed_count DESC LIMIT 10
        `);

        const pendingCancel = await db.get("SELECT COUNT(*) as cnt FROM customers WHERE cancel_requested = 1 AND cancel_approved = 0");
        const pendingEmergency = await db.get("SELECT COUNT(*) as cnt FROM emergencies WHERE status = 'pending'");
        const pendingWithdraw = await db.get("SELECT COUNT(*) as cnt FROM withdrawal_requests WHERE status = 'pending'");

        return {
            totalCustomers: total?.cnt || 0, newToday: newToday?.cnt || 0,
            totalRevenue: totalRevenue?.revenue || 0, closeRate: rate,
            topEmployees,
            pendingCancel: pendingCancel?.cnt || 0, pendingEmergency: pendingEmergency?.cnt || 0, pendingWithdraw: pendingWithdraw?.cnt || 0
        };
    });

    // ========== RÚT TIỀN (AFFILIATE) ==========
    fastify.post('/api/withdrawals', { preHandler: [authenticate] }, async (request, reply) => {
        const { amount, bank_name, bank_account, bank_holder } = request.body || {};
        const amountNum = Number(amount);
        if (!amountNum || amountNum < 100000) return reply.code(400).send({ error: 'Số tiền rút tối thiểu 100.000 VNĐ' });
        if (!bank_name || !bank_account || !bank_holder) {
            return reply.code(400).send({ error: 'Vui lòng nhập đầy đủ: Số tài khoản, Tên ngân hàng, Tên thụ hưởng' });
        }

        // Save bank info to user profile for next time
        await db.run('UPDATE users SET bank_name = ?, bank_account = ?, bank_holder = ?, updated_at = NOW() WHERE id = ?',
            [bank_name, bank_account, bank_holder, request.user.id]);

        // Create withdrawal request (NO balance deduction - only deduct when approved)
        const result = await db.run(
            'INSERT INTO withdrawal_requests (user_id, amount, bank_name, bank_account, bank_holder) VALUES (?,?,?,?,?)',
            [request.user.id, amountNum, bank_name, bank_account, bank_holder]
        );

        // Telegram notification
        const userInfo = await db.get('SELECT full_name FROM users WHERE id = ?', [request.user.id]);
        const tgMsg = `💰 <b>Yêu cầu RÚT TIỀN</b>\nCTV: ${userInfo?.full_name || request.user.username}\nSố tiền: <b>${amountNum.toLocaleString('vi-VN')} VNĐ</b>\nNgân hàng: ${bank_name}\nSTK: ${bank_account}\nTên: ${bank_holder}`;
        const globalId = process.env.TELEGRAM_GROUP_ID;
        if (globalId) sendTelegramMessage(globalId, tgMsg);

        return { success: true, message: 'Yêu cầu rút tiền đã được gửi! Vui lòng chờ xác nhận.', withdrawalId: result?.lastID };
    });

    fastify.get('/api/withdrawals', { preHandler: [authenticate] }, async (request, reply) => {
        let query = `SELECT w.*, u.full_name as user_name, u.phone as user_phone, u.username as user_username,
            au.full_name as approved_by_name FROM withdrawal_requests w
            LEFT JOIN users u ON w.user_id = u.id LEFT JOIN users au ON w.approved_by = au.id`;
        const params = [];
        if (request.user.role === 'tkaffiliate' || request.user.role === 'hoa_hong') {
            query += ' WHERE w.user_id = ?'; params.push(request.user.id);
        }
        query += ' ORDER BY w.created_at DESC';
        return { withdrawals: await db.all(query, params) };
    });

    fastify.put('/api/withdrawals/:id/approve', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { approve, transfer_image, reject_reason } = request.body || {};
        const wId = Number(request.params.id);
        const w = await db.get('SELECT w.*, u.full_name, u.username FROM withdrawal_requests w LEFT JOIN users u ON w.user_id = u.id WHERE w.id = ?', [wId]);
        if (!w) return reply.code(404).send({ error: 'Không tìm thấy yêu cầu' });
        if (w.status !== 'pending') return reply.code(400).send({ error: 'Yêu cầu này đã được xử lý' });

        if (approve) {
            if (!transfer_image) return reply.code(400).send({ error: 'Vui lòng paste ảnh chuyển khoản để xác nhận' });
            await db.run(`UPDATE withdrawal_requests SET status = 'approved', approved_by = ?, approved_at = NOW()::text, transfer_image = ? WHERE id = ?`,
                [request.user.id, transfer_image, wId]);
            return { success: true, message: 'Đã duyệt và xác nhận chuyển tiền!' };
        } else {
            if (!reject_reason) return reply.code(400).send({ error: 'Vui lòng nhập lý do từ chối' });
            await db.run(`UPDATE withdrawal_requests SET status = 'rejected', approved_by = ?, approved_at = NOW()::text, reject_reason = ? WHERE id = ?`,
                [request.user.id, reject_reason, wId]);
            return { success: true, message: 'Đã từ chối yêu cầu rút tiền.' };
        }
    });

    // Polling endpoint for GĐ/Trinh to check new pending withdrawals
    fastify.get('/api/withdrawals/pending-alert', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const result = await db.get(`SELECT COUNT(*) as count FROM withdrawal_requests WHERE status = 'pending'`);
        const latest = await db.get(`
            SELECT w.amount, w.bank_account, w.bank_name, u.full_name as user_name
            FROM withdrawal_requests w LEFT JOIN users u ON w.user_id = u.id
            WHERE w.status = 'pending' ORDER BY w.created_at DESC LIMIT 1
        `);
        return { count: result?.count || 0, latest };
    });

    fastify.put('/api/users/:id/reassign', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { assigned_to_user_id } = request.body || {};
        const userId = Number(request.params.id);
        const user = await db.get('SELECT * FROM users WHERE id = ? AND role = ?', [userId, 'hoa_hong']);
        if (!user) return reply.code(404).send({ error: 'Không tìm thấy CTV' });
        await db.run('UPDATE users SET assigned_to_user_id = ? WHERE id = ?',
            [assigned_to_user_id ? Number(assigned_to_user_id) : null, userId]);
        return { success: true, message: 'Đã chuyển CTV thành công!' };
    });

    // ========== CONSULTATION LOGS ==========
    fastify.get('/api/customers/:id/consult', { preHandler: [authenticate] }, async (request, reply) => {
        const logs = await db.all(
            `SELECT cl.*, u.full_name as logged_by_name FROM consultation_logs cl
             LEFT JOIN users u ON cl.logged_by = u.id WHERE cl.customer_id = ?
             ORDER BY cl.created_at DESC, CASE WHEN cl.log_type = 'hoan_thanh_cap_cuu' THEN 0 ELSE 1 END, cl.id DESC`,
            [Number(request.params.id)]
        );
        return { logs };
    });

    fastify.post('/api/customers/:id/consult', { preHandler: [authenticate] }, async (request, reply) => {
        const customerId = Number(request.params.id);
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [customerId]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        let log_type, content, imagePath = null;
        const fields = {};

        const contentType = request.headers['content-type'] || '';
        if (contentType.includes('multipart')) {
            const parts = request.parts();
            for await (const part of parts) {
                if (part.type === 'file' && part.fieldname === 'image') {
                    const fs = require('fs');
                    const path = require('path');
                    const { compressImage } = require('../utils/imageCompressor');
                    const uploadsDir = path.join(__dirname, '..', 'uploads', 'consult');
                    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                    let buf = await part.toBuffer();
                    if (buf && buf.length > 0) {
                        const compressed = await compressImage(buf, { maxWidth: 1200, quality: 80, format: 'jpeg' });
                        const filename = `consult_${customerId}_${Date.now()}.jpg`;
                        const filepath = path.join(uploadsDir, filename);
                        fs.writeFileSync(filepath, compressed.buffer);
                        imagePath = `/uploads/consult/${filename}`;
                    }
                } else { fields[part.fieldname] = part.value; }
            }
        } else {
            Object.assign(fields, request.body || {});
            imagePath = fields.image_path || null;
        }

        log_type = fields.log_type;
        content = fields.content;
        if (!log_type) return reply.code(400).send({ error: 'Vui lòng chọn loại tư vấn' });

        if (log_type === 'huy' && customer.crm_type === 'sale' && !['giam_doc', 'quan_ly_cap_cao'].includes(request.user.role)) {
            const countRow = await db.get(`
                WITH last_ht AS (
                    SELECT customer_id, MAX(id) as id
                    FROM consultation_logs
                    WHERE log_type = 'hoan_thanh' AND customer_id = $1
                    GROUP BY customer_id
                )
                SELECT COALESCE(COUNT(cl.id), 0)::int as cnt
                FROM customers c
                LEFT JOIN last_ht lh ON c.id = lh.customer_id
                LEFT JOIN consultation_logs cl ON cl.customer_id = c.id 
                    AND (lh.id IS NULL OR cl.id > lh.id)
                    AND cl.log_type NOT IN ('chuyen_doi_crm', 'tao_tk_affiliate', 'gui_lai_so', 'khong_xu_ly', 'dat_coc', 'chot_don', 'dang_san_xuat', 'hoan_thanh', 'sau_ban_hang', 'huy_coc', 'hoan_thanh_cap_cuu', 'huy', 'cho_duyet_huy', 'duyet_huy', 'huy_don_tra_coc', 'da_huy_don_tra_coc', 'cho_duyet_huy_don', 'gui_hang', 'tu_van_don_tiep', 'cancel_auto_revert')
                    AND (cl.content IS NULL OR (cl.content NOT LIKE '%Pancake%' AND cl.content NOT LIKE '%Đồng bộ%'))
                WHERE c.id = $1
                GROUP BY c.id
            `, [customerId]);
            const consultCount = Number(countRow?.cnt || 0);
            if (consultCount < 5) {
                return reply.code(400).send({
                    error: `Yêu cầu chăm sóc đủ 5 lần mới được hủy khách! (Hiện tại: ${consultCount}/5 lần)`
                });
            }
        }

        // Enforce Telegram Consultation for new leads of Sale, Affiliate, Nhu Cau CRM today
        if (['sale', 'affiliate', 'nhu_cau'].includes(customer.crm_type) && !['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(request.user.role)) {
            const vnToday = getVNToday();
            const createdToday = customer.created_at && new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(customer.created_at)) === vnToday;
            
            if (createdToday) {
                // Check if there is any manual consultation log today
                const lastLog = await db.get(
                    `SELECT id FROM consultation_logs 
                     WHERE customer_id = ?
                       AND log_type NOT IN ('chuyen_doi_crm', 'tao_tk_affiliate', 'gui_lai_so')
                       AND logged_by IS NOT NULL
                       AND (content IS NULL OR (content NOT LIKE '%Pancake%' AND content NOT LIKE '%Đồng bộ%'))
                       AND created_at::date = ?::date
                     LIMIT 1`,
                    [customerId, vnToday]
                );
                
                if (!lastLog) {
                    return reply.code(400).send({ 
                        error: 'Khách hàng mới nhận hôm nay phải được ghi nhận tư vấn lần đầu qua Telegram (cú pháp: ; [nội dung]) trước khi thao tác trên CRM!' 
                    });
                }
            }
        }

        // ★ Server-side validation: appointment_date constraint for Sale CRM
        if (fields.appointment_date && customer.crm_type === 'sale' && !['huy', 'cap_cuu_sep'].includes(log_type)) {
            const typeConfig = await db.get(
                'SELECT max_appointment_days FROM consult_type_configs WHERE key = ? AND crm_menu = ?',
                [log_type, 'sale']
            );
            if (typeConfig && typeConfig.max_appointment_days > 0) {
                const vnToday = getVNToday();
                if (fields.appointment_date > vnToday) {
                    const apptDate = new Date(fields.appointment_date);
                    const todayDate = new Date(vnToday);
                    const diffTime = apptDate.getTime() - todayDate.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > typeConfig.max_appointment_days) {
                        return reply.code(400).send({
                            error: `Ngày hẹn tiếp theo không được vượt quá ${typeConfig.max_appointment_days} ngày kể từ hôm nay (chọn: ${fields.appointment_date})`
                        });
                    }
                }
            }
        }

        // Update customer details if sent in FormData (unified request optimization)
        const updates = [];
        const params = [];
        
        if (fields.customer_name !== undefined) {
            updates.push('customer_name = ?');
            params.push(fields.customer_name);
            customer.customer_name = fields.customer_name;
        }
        
        if (fields.phone !== undefined) {
            const { normalizePhone, checkPhoneUser } = require('../utils/phoneCheck');
            const normalizedPhone = fields.phone ? normalizePhone(fields.phone) : null;
            if (fields.phone && (!normalizedPhone || !/^0\d{9}$/.test(normalizedPhone))) {
                return reply.code(400).send({ error: 'Số điện thoại phải đúng 10 chữ số và bắt đầu bằng số 0' });
            }
            if (normalizedPhone) {
                const userError = await checkPhoneUser(normalizedPhone);
                if (userError) return reply.code(400).send({ error: userError });
            }
            updates.push('phone = ?');
            params.push(normalizedPhone);
            customer.phone = normalizedPhone;
        }
        
        if (fields.address !== undefined) {
            updates.push('address = ?');
            params.push(fields.address);
            customer.address = fields.address;
        }
        
        if (fields.province !== undefined) {
            updates.push('province = ?');
            params.push(fields.province);
            customer.province = fields.province;
        }
        
        if (fields.job !== undefined) {
            updates.push('job = ?');
            params.push(fields.job);
            customer.job = fields.job;
        }
        
        if (fields.birthday !== undefined) {
            updates.push('birthday = ?');
            params.push(fields.birthday || null);
            customer.birthday = fields.birthday || null;
        }
        
        if (updates.length > 0) {
            updates.push("updated_at = NOW()");
            params.push(customerId);
            await db.run(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        const logTypes = await db.all('SELECT DISTINCT log_type FROM consultation_logs WHERE customer_id = ?', [customerId]);
        const doneTypes = logTypes.map(l => l.log_type);
        if (log_type === 'chot_don' && !doneTypes.includes('dat_coc')) return reply.code(400).send({ error: 'Phải Đặt Cọc trước khi Chốt Đơn!' });

        // Generate Order Code automatically if chot_don (unified request optimization)
        let generatedOrderCode = null;
        if (log_type === 'chot_don') {
            const userId = request.user.id;
            const userRow = await db.get('SELECT order_code_prefix FROM users WHERE id = ?', [userId]);
            const prefix = userRow?.order_code_prefix;
            if (!prefix) return reply.code(400).send({ error: 'Chưa cài đặt mã đơn cho nhân viên này. Vui lòng liên hệ Admin để cài đặt prefix.' });

            // Check if active order code already exists
            const activeOrder = await db.get("SELECT order_code FROM order_codes WHERE customer_id = ? AND status = 'active' LIMIT 1", [customerId]);
            if (!activeOrder) {
                // Generate next order number
                const lastCode = await db.get('SELECT order_code FROM order_codes WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
                let nextNum = 1;
                if (lastCode) {
                    const match = lastCode.order_code.match(/(\d{4})$/);
                    if (match) nextNum = parseInt(match[1]) + 1;
                }

                // Determine CRM prefix
                const CRM_ORDER_PREFIX = { ctv: 'CTV-', ctv_hoa_hong: 'AFF-', koc_tiktok: 'KOC-' };
                let crmPrefix = '';
                if (customer.crm_type && customer.crm_type !== 'nhu_cau') {
                    crmPrefix = CRM_ORDER_PREFIX[customer.crm_type] || '';
                } else if (customer.referrer_customer_id) {
                    const refCustomer = await db.get('SELECT crm_type FROM customers WHERE id = ?', [customer.referrer_customer_id]);
                    if (refCustomer && refCustomer.crm_type && refCustomer.crm_type !== 'nhu_cau') {
                        crmPrefix = CRM_ORDER_PREFIX[refCustomer.crm_type] || '';
                    }
                } else if (customer.referrer_id) {
                    const referrer = await db.get('SELECT source_customer_id, role, source_crm_type FROM users WHERE id = ?', [customer.referrer_id]);
                    if (referrer) {
                        if (referrer.source_customer_id) {
                            const srcCust = await db.get('SELECT crm_type FROM customers WHERE id = ?', [referrer.source_customer_id]);
                            if (srcCust && srcCust.crm_type && srcCust.crm_type !== 'nhu_cau') {
                                crmPrefix = CRM_ORDER_PREFIX[srcCust.crm_type] || '';
                            }
                        } else {
                            const ROLE_TO_CRM = { hoa_hong: 'ctv_hoa_hong', ctv: 'ctv', tkaffiliate: 'ctv_hoa_hong' };
                            const mappedCrm = ROLE_TO_CRM[referrer.role];
                            if (mappedCrm) {
                                crmPrefix = CRM_ORDER_PREFIX[mappedCrm] || '';
                            } else if (referrer.source_crm_type) {
                                crmPrefix = CRM_ORDER_PREFIX[referrer.source_crm_type] || '';
                            }
                        }
                    }
                }

                const orderCode = crmPrefix + prefix + String(nextNum).padStart(4, '0');
                await db.run('INSERT INTO order_codes (customer_id, user_id, order_code, status) VALUES (?, ?, ?, \'active\')', [customerId, userId, orderCode]);

                // Backfill order_tt_coc on deposit records
                if (customer.phone) {
                    await db.run(`
                        UPDATE payment_records SET
                            order_tt_coc = $1,
                            updated_at = NOW()
                        WHERE customer_phone = $2
                          AND payment_type = 'dat_coc'
                          AND (order_tt_coc IS NULL OR order_tt_coc = '')
                    `, [orderCode, customer.phone]);
                }
                generatedOrderCode = orderCode;
            } else {
                generatedOrderCode = activeOrder.order_code;
            }
        }

        // NOTE: Items validation removed — products are now entered in DHT, not CRM

        if (log_type === 'hoan_thanh' && !doneTypes.includes('chot_don')) return reply.code(400).send({ error: 'Phải Chốt Đơn trước khi Hoàn Thành!' });

        // ★ V4.1: Lock payment record BEFORE inserting consultation log
        // NOTE: order_tt_coc is NULL here because order code is created at chot_don (AFTER dat_coc)
        // It will be backfilled in POST /api/order-codes when the order code is created
        if (log_type === 'dat_coc' && fields.payment_record_id) {
            const prId = Number(fields.payment_record_id);
            const lockResult = await db.run(`
                UPDATE payment_records SET
                    payment_type = 'dat_coc',
                    handover_status = 'thu_quy_nhan',
                    customer_name = $1,
                    customer_phone = $2,
                    cskh_user_id = $3,
                    locked_by = $3,
                    locked_at = NOW(),
                    updated_at = NOW()
                WHERE id = $4
                  AND (payment_type IS NULL OR payment_type != 'dat_coc')
            `, [customer.customer_name, customer.phone, request.user.id, prId]);
            if (lockResult.changes === 0) {
                return reply.code(409).send({ error: 'Mã tiền này đã được nhận bởi người khác!' });
            }
        }

        // ★ V4.2: Unlock payment record when Hủy Cọc — atomic reversal
        if (log_type === 'huy_coc') {
            try {
                const unlockResult = await db.run(`
                    UPDATE payment_records SET
                        payment_type = 'tra_lai_coc',
                        locked_by = NULL,
                        locked_at = NULL,
                        updated_at = NOW()
                    WHERE payment_type = 'dat_coc'
                      AND customer_name = $1
                      AND customer_phone = $2
                `, [customer.customer_name, customer.phone]);
                if (unlockResult.changes > 0) {
                    console.log(`[HỦY CỌC] Unlocked ${unlockResult.changes} payment record(s) for customer: ${customer.customer_name} - ${customer.phone}`);
                } else {
                    console.warn(`[HỦY CỌC] No locked payment record found for customer: ${customer.customer_name} - ${customer.phone}`);
                }
            } catch (unlockErr) {
                console.error('[HỦY CỌC] Error unlocking payment record:', unlockErr.message);
            }
        }

        // ★ V4.3: Handle 'gui_mau' draft sample order creation and linking deposit code
        if (log_type === 'gui_mau' && fields.sample_order_code) {
            let depositCode = null;
            if (fields.payment_record_id) {
                const pr = await db.get('SELECT payment_code FROM payment_records WHERE id = ?', [Number(fields.payment_record_id)]);
                if (pr) depositCode = pr.payment_code;
            }

            await db.run(`
                INSERT INTO don_gui_ao_mau (
                    sample_order_code, customer_name, customer_phone, deposit_code,
                    order_status, created_by, order_date
                ) VALUES ($1, $2, $3, $4, 'draft', $5, CURRENT_DATE)
            `, [
                fields.sample_order_code,
                customer.customer_name,
                customer.phone,
                depositCode,
                request.user.id
            ]);

            if (fields.payment_record_id) {
                const prId = Number(fields.payment_record_id);
                const lockResult = await db.run(`
                    UPDATE payment_records SET
                        payment_type = 'dat_coc',
                        order_ao_mau = $1,
                        handover_status = 'thu_quy_nhan',
                        customer_name = $2,
                        customer_phone = $3,
                        cskh_user_id = $4,
                        locked_by = $4,
                        locked_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $5
                      AND (payment_type IS NULL OR payment_type != 'dat_coc')
                `, [fields.sample_order_code, customer.customer_name, customer.phone, request.user.id, prId]);
                if (lockResult.changes === 0) {
                    return reply.code(409).send({ error: 'Mã tiền này đã được nhận bởi người khác!' });
                }
            }
        }

        // Create a binding text inside content for deposit record selection
        let consultContent = content || '';
        const payment_record_id = fields.payment_record_id ? Number(fields.payment_record_id) : null;
        if (payment_record_id) {
            const pr = await db.get('SELECT payment_code, amount FROM payment_records WHERE id = $1', [payment_record_id]);
            if (pr) {
                const amtFmt = Number(pr.amount || 0).toLocaleString('vi-VN');
                const bindingText = `(Đã liên kết mã tiền cọc: ${pr.payment_code} - Số tiền: ${amtFmt}đ)`;
                if (consultContent) {
                    consultContent += '\n' + bindingText;
                } else {
                    consultContent = bindingText;
                }
            }
        }

        const deposit_amount = Number(fields.deposit_amount) || 0;
        const next_consult_type = fields.next_consult_type || null;
        await db.run(
            `INSERT INTO consultation_logs (customer_id, log_type, content, image_path, logged_by, deposit_amount, next_consult_type, payment_record_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [customerId, log_type, consultContent || null, imagePath, request.user.id, deposit_amount, next_consult_type, payment_record_id]
        );

        // ★ Thông báo ĐÃ XỬ LÝ SỐ — lần tư vấn đầu cho số chuyển/gửi lại hôm nay
        if (log_type !== 'khong_xu_ly' && customer.assigned_to_id) {
            try {
                const vnToday = getVNToday();
                const createdToday = customer.created_at && new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(customer.created_at)) === vnToday;
                const isTransferToday = customer.effective_date === vnToday || customer.appointment_date === vnToday || createdToday;
                if (isTransferToday) {
                    // Đếm log thật kể từ lần chuyển/gửi lại (khớp logic reminder-checker)
                    const prevCount = await db.get(
                        `SELECT COUNT(*) as cnt FROM consultation_logs
                         WHERE customer_id = $1 AND log_type NOT IN ('khong_xu_ly', 'chuyen_doi_crm', 'tao_tk_affiliate', 'gui_lai_so')
                           AND (content IS NULL OR (content NOT LIKE '%Pancake%' AND content NOT LIKE '%Đồng bộ%'))
                           AND created_at >= LEAST($2::timestamp, COALESCE($3::timestamp, $2::timestamp)) - INTERVAL '1 minute'`,
                        [customerId, customer.created_at, customer.updated_at]
                    );
                    if (Number(prevCount?.cnt || 0) === 1) {
                        const _crmL = { nhu_cau: 'Nhu Cầu', ctv: 'CTV', ctv_hoa_hong: 'Affiliate', koc_tiktok: 'KOL/KOC Tiktok', sale: 'Sale' };
                        const _conL = { goi_dien: 'Gọi Điện', nhan_tin: 'Nhắn Tin', gap_truc_tiep: 'Gặp Trực Tiếp', gui_bao_gia: 'Gửi Báo Giá', gui_mau: 'Gửi Mẫu', thiet_ke: 'Thiết Kế', bao_sua: 'Báo Sửa', lam_quen_tuong_tac: 'Làm Quen', gui_stk_coc: 'Gửi STK Cọc', giuc_coc: 'Giục Cọc', dat_coc: 'Đặt Cọc', chot_don: 'Chốt Đơn', sau_ban_hang: 'Sau Bán Hàng', hoan_thanh: 'Hoàn Thành', tuong_tac_ket_noi: 'Tương Tác', gui_ct_kh_cu: 'CT KH Cũ', giam_gia: 'Giảm Giá', cap_cuu_sep: 'Cấp Cứu Sếp', huy: 'Hủy KH', huy_don_tra_coc: 'Hủy Đơn TC' };
                        let custCode = '?';
                        if (customer.daily_order_number && customer.effective_date) {
                            const ed = new Date(customer.effective_date);
                            custCode = `${customer.daily_order_number}-${ed.getDate()}-${ed.getMonth()+1}-Y${String(ed.getFullYear()).slice(-2)}`;
                        }
                        const tgMsg = `✅ <b>ĐÃ XỬ LÝ SỐ</b> : ${custCode} : <code>${customer.customer_name}</code> - CRM: ${_crmL[customer.crm_type] || customer.crm_type} - Tư vấn: ${_conL[log_type] || log_type}`;
                        notifyTelegram(customer.assigned_to_id, 'chuyen_so', tgMsg);
                    }
                }
            } catch (e) { console.error('[ĐÃ XỬ LÝ SỐ]', e.message); }
        }

        // Pinned customers: always set appointment to next working day (ignore user input)
        if (customer.is_pinned) {
            const nextWorkDay = await getNextWorkingDay(new Date(), customer.assigned_to_id);
            await db.run('UPDATE customers SET appointment_date = ? WHERE id = ?', [nextWorkDay, customerId]);
        } else if (fields.appointment_date) {
            // ★ VALIDATE: appointment_date must be AFTER today (never today or past)
            const vnToday = getVNToday();
            if (fields.appointment_date <= vnToday) {
                // Auto-correct to next working day
                const nextWorkDay2 = await getNextWorkingDay(new Date(), customer.assigned_to_id);
                await db.run('UPDATE customers SET appointment_date = ? WHERE id = ?', [nextWorkDay2, customerId]);
            } else {
                await db.run('UPDATE customers SET appointment_date = ? WHERE id = ?', [fields.appointment_date, customerId]);
            }
        } else if (log_type === 'chot_don' && customer.crm_type === 'sale') {
            const holidays = await getHolidays();
            const configRow = await db.get("SELECT value FROM app_config WHERE key = 'sale_chot_don_reschedule_days'");
            const rescheduleDays = configRow ? parseInt(configRow.value) : 350;
            const today = new Date();
            const targetDate = new Date(today);
            targetDate.setDate(targetDate.getDate() + rescheduleDays);
            const rawTargetStr = toDateStr(targetDate);
            const finalApptDate = await getEffectiveWorkingDay(rawTargetStr, customer.assigned_to_id, holidays);
            await db.run('UPDATE customers SET appointment_date = ? WHERE id = ?', [finalApptDate, customerId]);
        } else if (customer.crm_type === 'sale' && !['huy', 'cap_cuu_sep', 'chot_don'].includes(log_type)) {
            // SALE CRM: auto-calculate next follow-up date based on rotation cycle (fallback)
            const nextFollowUp = await getNextFollowUpDate(new Date(), customer.assigned_to_id);
            await db.run('UPDATE customers SET appointment_date = ? WHERE id = ?', [nextFollowUp, customerId]);
        }

        // Auto-set appointment to next business day for 'Hoàn thành cấp cứu'
        if (log_type === 'hoan_thanh_cap_cuu' && !fields.appointment_date) {
            const nextBizDay = await getNextWorkingDay(new Date(), customer.assigned_to_id);
            await db.run('UPDATE customers SET appointment_date = ? WHERE id = ?', [nextBizDay, customerId]);
        }

        const statusMap = { 'goi_dien': 'dang_tu_van', 'nhan_tin': 'dang_tu_van', 'gap_truc_tiep': 'dang_tu_van', 'gui_bao_gia': 'bao_gia', 'gui_mau': 'dang_tu_van', 'thiet_ke': 'dang_tu_van', 'bao_sua': 'dang_tu_van', 'lam_quen_tuong_tac': 'lam_quen_tuong_tac', 'gui_stk_coc': 'gui_stk_coc', 'giuc_coc': 'gui_stk_coc', 'dat_coc': 'dat_coc', 'chot_don': 'chot_don', 'dang_san_xuat': 'chot_don', 'hoan_thanh': 'hoan_thanh', 'sau_ban_hang': 'sau_ban_hang', 'tuong_tac_ket_noi': 'tuong_tac_ket_noi', 'gui_ct_kh_cu': 'gui_ct_kh_cu', 'giam_gia': 'giam_gia', 'huy_coc': 'huy_coc', 'da_huy_don_tra_coc': 'da_huy_don_tra_coc' };
        if (statusMap[log_type]) {
            await db.run('UPDATE customers SET order_status = ?, updated_at = NOW() WHERE id = ?', [statusMap[log_type], customerId]);

            // Reset cancel status if customer was cancelled → return to normal flow
            if (customer.cancel_approved === 1 || customer.cancel_approved === -2) {
                await db.run('UPDATE customers SET cancel_requested = 0, cancel_approved = 0, cancel_reason = NULL, cancel_requested_by = NULL, cancel_requested_at = NULL, cancel_approved_by = NULL, cancel_approved_at = NULL WHERE id = ?', [customerId]);
            }
            // Hoàn Thành Đơn → complete ALL active orders + calculate commission per order
            if (log_type === 'hoan_thanh') {
                const activeOrders = await db.all("SELECT id FROM order_codes WHERE customer_id = ? AND status = 'active'", [customerId]);
                for (const ao of activeOrders) {
                    await db.run("UPDATE order_codes SET status = 'completed' WHERE id = ?", [ao.id]);
                    // Calculate commission for this order
                    if (customer.referrer_id) {
                        const grandTotal = await db.get(`SELECT COALESCE(
                            (SELECT SUM(di.item_total) FROM dht_orders d JOIN dht_order_items di ON di.dht_order_id = d.id WHERE d.order_code = oc.order_code),
                            (SELECT SUM(oi_f.total) FROM order_items oi_f WHERE oi_f.order_code_id = oc.id),
                            0
                        ) - COALESCE((SELECT d2.vat_amount FROM dht_orders d2 WHERE d2.order_code = oc.order_code), 0) as t
                        FROM order_codes oc WHERE oc.id = $1`, [ao.id]);
                        if (grandTotal?.t) {
                            // Direct referrer commission
                            const referrer = await db.get('SELECT u.*, ct.percentage, ct.parent_percentage FROM users u LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id WHERE u.id = ?', [customer.referrer_id]);
                            if (referrer?.percentage) {
                                const commission = Math.round(grandTotal.t * referrer.percentage / 100);
                                await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [commission, referrer.id]);
                            }
                            // Parent affiliate commission (2-level)
                            // Find parent: referrer.source_customer_id → customer → referrer_id = parent affiliate
                            if (referrer?.source_customer_id) {
                                const sourceCustomer = await db.get('SELECT referrer_id FROM customers WHERE id = ?', [referrer.source_customer_id]);
                                if (sourceCustomer?.referrer_id) {
                                    const parentAffiliate = await db.get('SELECT u.*, ct.parent_percentage FROM users u LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id WHERE u.id = ?', [sourceCustomer.referrer_id]);
                                    if (parentAffiliate?.parent_percentage) {
                                        const parentCommission = Math.round(grandTotal.t * parentAffiliate.parent_percentage / 100);
                                        await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [parentCommission, parentAffiliate.id]);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        const consultCount = (await db.get("SELECT COUNT(*) as cnt FROM consultation_logs WHERE customer_id = ? AND log_type NOT IN ('chuyen_doi_crm', 'tao_tk_affiliate', 'gui_lai_so', 'khong_xu_ly', 'dat_coc', 'chot_don', 'dang_san_xuat', 'hoan_thanh', 'sau_ban_hang', 'huy_coc', 'hoan_thanh_cap_cuu', 'huy', 'cho_duyet_huy', 'duyet_huy', 'huy_don_tra_coc', 'da_huy_don_tra_coc', 'cho_duyet_huy_don', 'gui_hang', 'tu_van_don_tiep', 'cancel_auto_revert') AND (content IS NULL OR (content NOT LIKE '%Pancake%' AND content NOT LIKE '%Đồng bộ%'))", [customerId]))?.cnt || 0;
        return { success: true, message: 'Đã ghi nhận tư vấn!', consultCount, orderCode: generatedOrderCode };
    });

    fastify.put('/api/customers/:id/appointment', { preHandler: [authenticate] }, async (request, reply) => {
        const { appointment_date } = request.body || {};
        await db.run('UPDATE customers SET appointment_date = ? WHERE id = ?', [appointment_date || null, Number(request.params.id)]);
        return { success: true, message: 'Đã cập nhật ngày hẹn!' };
    });

    fastify.get('/api/customers/referrer-search', { preHandler: [authenticate] }, async (request, reply) => {
        const { q, all } = request.query;
        const userId = request.user.id;
        const allowedTypes = ['nhu_cau', 'ctv', 'ctv_hoa_hong', 'koc_tiktok'];

        if (all === '1') {
            const customers = await db.all(
                `SELECT c.id, c.customer_name, c.phone, c.crm_type, c.daily_order_number, c.created_at
                 FROM customers c WHERE c.assigned_to_id = ?
                 AND c.crm_type IN (${allowedTypes.map(() => '?').join(',')})
                 AND c.cancel_approved = 0 ORDER BY c.customer_name ASC LIMIT 100`,
                [userId, ...allowedTypes]
            );
            return { customers };
        }
        if (!q || q.length < 2) return { customers: [] };
        const customers = await db.all(
            `SELECT c.id, c.customer_name, c.phone, c.crm_type, c.daily_order_number, c.created_at
             FROM customers c WHERE c.assigned_to_id = ?
             AND c.crm_type IN (${allowedTypes.map(() => '?').join(',')})
             AND (c.customer_name LIKE ? OR c.phone LIKE ?)
             AND c.cancel_approved = 0 ORDER BY c.created_at DESC LIMIT 10`,
            [userId, ...allowedTypes, `%${q}%`, `%${q}%`]
        );
        return { customers };
    });

    fastify.put('/api/customers/:id/referrer', { preHandler: [authenticate] }, async (request, reply) => {
        const { referrer_customer_id } = request.body || {};
        const customerId = Number(request.params.id);
        if (referrer_customer_id) {
            const refCustomer = await db.get('SELECT id, customer_name, crm_type FROM customers WHERE id = ?', [Number(referrer_customer_id)]);
            if (!refCustomer) return reply.code(404).send({ error: 'Không tìm thấy KH giới thiệu' });
            await db.run('UPDATE customers SET referrer_customer_id = ? WHERE id = ?', [refCustomer.id, customerId]);
            return { success: true, referrer_name: refCustomer.customer_name, referrer_crm: refCustomer.crm_type };
        } else {
            await db.run('UPDATE customers SET referrer_customer_id = NULL WHERE id = ?', [customerId]);
            return { success: true, message: 'Đã xóa người giới thiệu' };
        }
    });

    fastify.get('/api/customers/consult-stats', { preHandler: [authenticate] }, async (request, reply) => {
        const { customer_ids } = request.query;
        if (!customer_ids) return { stats: {} };
        const ids = customer_ids.split(',').map(Number).filter(n => !isNaN(n));
        if (ids.length === 0) return { stats: {} };

        const stats = {};
        for (const cid of ids) {
            stats[cid] = { consultCount: 0, chotDonCount: 0, lastLog: null, revenue: 0, latestOrderCode: null };
        }

        const placeholders = ids.map(() => '?').join(',');

        try {
            const [consultCounts, chotDons, lastLogs, revenues, latestOrderCodes] = await Promise.all([
                db.all(`
                    WITH last_ht AS (
                        SELECT customer_id, MAX(id) as id
                        FROM consultation_logs
                        WHERE log_type = 'hoan_thanh' AND customer_id IN (${placeholders})
                        GROUP BY customer_id
                    )
                    SELECT 
                        c.id as customer_id,
                        COALESCE(COUNT(cl.id), 0)::int as cnt
                    FROM customers c
                    LEFT JOIN last_ht lh ON c.id = lh.customer_id
                    LEFT JOIN consultation_logs cl ON cl.customer_id = c.id 
                        AND (lh.id IS NULL OR cl.id > lh.id)
                        AND cl.log_type NOT IN ('chuyen_doi_crm', 'tao_tk_affiliate', 'gui_lai_so', 'khong_xu_ly', 'dat_coc', 'chot_don', 'dang_san_xuat', 'hoan_thanh', 'sau_ban_hang', 'huy_coc', 'hoan_thanh_cap_cuu', 'huy', 'cho_duyet_huy', 'duyet_huy', 'huy_don_tra_coc', 'da_huy_don_tra_coc', 'cho_duyet_huy_don', 'gui_hang', 'tu_van_don_tiep', 'cancel_auto_revert')
                        AND (cl.content IS NULL OR (cl.content NOT LIKE '%Pancake%' AND cl.content NOT LIKE '%Đồng bộ%'))
                    WHERE c.id IN (${placeholders})
                    GROUP BY c.id
                `, [...ids, ...ids]),

                db.all(`
                    SELECT customer_id, COUNT(*)::int as cnt
                    FROM order_codes
                    WHERE customer_id IN (${placeholders}) AND status != 'cancelled'
                    GROUP BY customer_id
                `, ids),

                db.all(`
                    WITH ranked_logs AS (
                        SELECT 
                            customer_id, 
                            log_type, 
                            content, 
                            created_at,
                            ROW_NUMBER() OVER (
                                PARTITION BY customer_id 
                                ORDER BY created_at DESC, CASE WHEN log_type = 'hoan_thanh_cap_cuu' THEN 0 ELSE 1 END, id DESC
                            ) as rn
                        FROM consultation_logs
                        WHERE log_type != 'khong_xu_ly' AND customer_id IN (${placeholders})
                    )
                    SELECT customer_id, log_type, content, created_at
                    FROM ranked_logs
                    WHERE rn = 1
                `, ids),

                db.all(`
                    SELECT 
                        sub.customer_id,
                        COALESCE(SUM(sub.rev), 0)::float as total_revenue
                    FROM (
                        SELECT 
                            oc.customer_id,
                            COALESCE(
                                (SELECT SUM(di.item_total) FROM dht_orders d JOIN dht_order_items di ON di.dht_order_id = d.id WHERE d.order_code = oc.order_code),
                                (SELECT SUM(oi_f.total) FROM order_items oi_f WHERE oi_f.order_code_id = oc.id),
                                0
                            ) - COALESCE((SELECT d2.vat_amount FROM dht_orders d2 WHERE d2.order_code = oc.order_code), 0)
                              - COALESCE((SELECT d3.discount_amount FROM dht_orders d3 WHERE d3.order_code = oc.order_code), 0) as rev
                        FROM order_codes oc
                        WHERE oc.customer_id IN (${placeholders}) AND (oc.status IS NULL OR oc.status != 'cancelled')
                        GROUP BY oc.id, oc.order_code, oc.customer_id
                    ) sub
                    GROUP BY sub.customer_id
                `, ids),

                db.all(`
                    WITH ranked_orders AS (
                        SELECT 
                            customer_id,
                            order_code,
                            ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY id DESC) as rn
                        FROM order_codes
                        WHERE customer_id IN (${placeholders})
                    )
                    SELECT customer_id, order_code
                    FROM ranked_orders
                    WHERE rn = 1
                `, ids)
            ]);

            // Populate stats
            for (const row of consultCounts) {
                if (stats[row.customer_id]) {
                    stats[row.customer_id].consultCount = Number(row.cnt) || 0;
                }
            }
            for (const row of chotDons) {
                if (stats[row.customer_id]) {
                    stats[row.customer_id].chotDonCount = Number(row.cnt) || 0;
                }
            }
            for (const row of lastLogs) {
                if (stats[row.customer_id]) {
                    stats[row.customer_id].lastLog = {
                        log_type: row.log_type,
                        content: row.content,
                        created_at: row.created_at
                    };
                }
            }
            for (const row of revenues) {
                if (stats[row.customer_id]) {
                    stats[row.customer_id].revenue = Number(row.total_revenue) || 0;
                }
            }
            for (const row of latestOrderCodes) {
                if (stats[row.customer_id]) {
                    stats[row.customer_id].latestOrderCode = row.order_code || null;
                }
            }
        } catch (error) {
            console.error('Error fetching batch consult stats:', error);
        }

        return { stats };
    });

    // ========== PIN KHÁCH HÀNG ==========
    fastify.patch('/api/customers/:id/pin', { preHandler: [authenticate] }, async (request, reply) => {
        const custId = Number(request.params.id);
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [custId]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        // Cancelled customers cannot be pinned
        if (customer.cancel_approved === 1) {
            return reply.code(400).send({ error: 'Không thể pin khách đã hủy' });
        }

        const newPinned = !customer.is_pinned;

        if (newPinned) {
            // PIN ON: set appointment to next working day
            const nextWorkDay = await getNextWorkingDay(new Date(), customer.assigned_to_id);
            await db.run(
                'UPDATE customers SET is_pinned = true, pinned_at = NOW(), appointment_date = ? WHERE id = ?',
                [nextWorkDay, custId]
            );
            return { success: true, is_pinned: true, next_appointment: nextWorkDay, message: '📌 Đã pin khách hàng!' };
        } else {
            // PIN OFF: keep current appointment_date
            await db.run(
                'UPDATE customers SET is_pinned = false, pinned_at = NULL WHERE id = ?',
                [custId]
            );
            return { success: true, is_pinned: false, message: 'Đã bỏ pin khách hàng' };
        }
    });

    // ========== GET NEXT FOLLOW-UP DATE ==========
    fastify.get('/api/customers/:id/next-followup', { preHandler: [authenticate] }, async (request, reply) => {
        const customerId = Number(request.params.id);
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [customerId]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        let nextFollowUp;
        if (customer.is_pinned) {
            nextFollowUp = await getNextWorkingDay(new Date(), customer.assigned_to_id);
        } else {
            nextFollowUp = await getNextFollowUpDate(new Date(), customer.assigned_to_id);
        }
        return { success: true, nextFollowUp };
    });

    // ========== GET CUSTOMERS STATISTICS TREE (for Sổ Khách Sale) ==========
    fastify.get('/api/customers/statistics-tree', { preHandler: [authenticate] }, async (request, reply) => {
        const { employee_id, crm_type = 'sale' } = request.query;
        const user = request.user;

        let query = `
            SELECT 
                EXTRACT(YEAR FROM created_at)::int as year,
                EXTRACT(MONTH FROM created_at)::int as month,
                EXTRACT(DAY FROM created_at)::int as day,
                COUNT(*)::int as count
            FROM customers
            WHERE crm_type = ?
        `;
        const params = [crm_type];

        // Phân quyền giống y hệt /api/customers
        if (user.role === 'nhan_vien') {
            query += ` AND assigned_to_id = ?`;
            params.push(user.id);
        } else if (employee_id) {
            // Check nếu là trưởng phòng/quản lý có quyền xem employee_id này không
            if (['truong_phong', 'quan_ly'].includes(user.role)) {
                const managedDeptIds = await getManagedDeptIds(user.id);
                const empDept = await db.get('SELECT department_id FROM users WHERE id = ?', [Number(employee_id)]);
                if (!empDept || !managedDeptIds.includes(empDept.department_id)) {
                    return reply.code(403).send({ error: 'Không có quyền truy cập dữ liệu nhân viên này' });
                }
            }
            query += ` AND assigned_to_id = ?`;
            params.push(Number(employee_id));
        } else {
            // Không có employee_id -> Xem tổng bộ phận
            if (user.role === 'truong_phong' || user.role === 'quan_ly') {
                const managedDeptIds = await getManagedDeptIds(user.id);
                if (managedDeptIds.length > 0) {
                    const managedUserIds = (await db.all(
                        `SELECT id FROM users WHERE department_id IN (${managedDeptIds.map(() => '?').join(',')}) AND status = 'active'`,
                        managedDeptIds
                    )).map(u => u.id);
                    if (!managedUserIds.includes(user.id)) managedUserIds.push(user.id);
                    const placeholders = managedUserIds.map(() => '?').join(',');
                    query += ` AND assigned_to_id IN (${placeholders})`;
                    params.push(...managedUserIds);
                } else {
                    query += ` AND assigned_to_id = ?`;
                    params.push(user.id);
                }
            }
        }

        // Production Mode: ẩn dữ liệu test
        const _cutoff = await getProductionCutoff();
        const _testIds = await getTestAccountIds();
        const _prodFilter = buildProductionFilter(_cutoff, _testIds, 'created_at', 'created_by');
        if (_prodFilter) {
            query += _prodFilter;
        }

        query += ` GROUP BY year, month, day ORDER BY year DESC, month DESC, day DESC`;

        const rows = await db.all(query, params);

        // Build tree
        const yearsMap = {};
        for (const r of rows) {
            const y = r.year;
            const m = r.month;
            const d = r.day;
            const cnt = r.count;

            if (!yearsMap[y]) {
                yearsMap[y] = { year: y, count: 0, monthsMap: {} };
            }
            yearsMap[y].count += cnt;

            if (!yearsMap[y].monthsMap[m]) {
                yearsMap[y].monthsMap[m] = { month: m, count: 0, days: [] };
            }
            yearsMap[y].monthsMap[m].count += cnt;
            yearsMap[y].monthsMap[m].days.push({
                day: d,
                count: cnt,
                dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            });
        }

        const tree = Object.values(yearsMap).map(yData => {
            const months = Object.values(yData.monthsMap).map(mData => {
                mData.days.sort((a, b) => b.day - a.day);
                return {
                    month: mData.month,
                    count: mData.count,
                    days: mData.days
                };
            });
            months.sort((a, b) => b.month - a.month);
            return {
                year: yData.year,
                count: yData.count,
                months
            };
        });
        tree.sort((a, b) => b.year - a.year);

        return { success: true, tree };
    });

    fastify.post('/api/customers/:id/quick-recare', { preHandler: [authenticate] }, async (request, reply) => {
        const customerId = Number(request.params.id);
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [customerId]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        const user = request.user;
        const isManager = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(user.role);
        if (customer.assigned_to_id !== user.id && !isManager) {
            return reply.code(403).send({ error: 'Bạn không có quyền xử lý khách hàng này' });
        }

        const vnToday = getVNToday();
        const createdToday = customer.created_at && new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(customer.created_at)) === vnToday;

        if (createdToday && customer.crm_type === 'sale' && !isManager) {
            const lastLog = await db.get(
                `SELECT id FROM consultation_logs 
                 WHERE customer_id = ?
                   AND log_type NOT IN ('chuyen_doi_crm', 'tao_tk_affiliate', 'gui_lai_so')
                   AND logged_by IS NOT NULL
                   AND (content IS NULL OR (content NOT LIKE '%Pancake%' AND content NOT LIKE '%Đồng bộ%'))
                   AND created_at::date = ?::date
                 LIMIT 1`,
                [customerId, vnToday]
            );
            if (!lastLog) {
                return reply.code(400).send({ error: 'Khách mới chuyển hôm nay chưa được tiếp nhận xử lý qua Telegram!' });
            }
        }

        const nextFollowUp = await getNextFollowUpDate(new Date(), customer.assigned_to_id || user.id);

        await db.run(
            `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by)
             VALUES (?, 'lam_quen_tuong_tac', '⭐ Chăm sóc nhanh', ?)`,
            [customerId, user.id]
        );

        await db.run(
            `UPDATE customers 
             SET order_status = 'lam_quen_tuong_tac', 
                 appointment_date = ?, 
                 updated_at = NOW() 
             WHERE id = ?`,
            [nextFollowUp, customerId]
        );

        if (customer.cancel_approved === 1 || customer.cancel_approved === -2) {
            await db.run('UPDATE customers SET cancel_requested = 0, cancel_approved = 0, cancel_reason = NULL, cancel_requested_by = NULL, cancel_requested_at = NULL, cancel_approved_by = NULL, cancel_approved_at = NULL WHERE id = ?', [customerId]);
        }

        return {
            success: true,
            next_appointment_date: nextFollowUp,
            message: `✅ Đã chăm sóc nhanh! Lịch hẹn tiếp theo: ${nextFollowUp}`
        };
    });
};
