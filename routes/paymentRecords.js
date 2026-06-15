// ========== PAYMENT RECORDS ROUTES — Sổ Ghi Nhận Tiền ==========
const db = require('../db/pool');
const { vnNow, vnFormat } = require('../utils/timezone');
const { encrypt, decrypt, restartCron, checkEmails } = require('../services/emailChecker');

// ========== DEFAULT PERMISSIONS ==========
const DEFAULT_PR_PERMS = {
    pr_change_source: ['giam_doc', 'quan_ly_cap_cao'],
    pr_delete: ['giam_doc'],
    pr_edit: ['giam_doc', 'quan_ly_cap_cao'],
    pr_update_customer: ['giam_doc', 'quan_ly_cap_cao'],
    pr_excel_reconcile: ['giam_doc', 'quan_ly_cap_cao', 'nhan_vien']
};
async function _checkPrPerm(userRole, action) {
    try {
        const row = await db.get("SELECT value FROM app_config WHERE key = 'pr_action_permissions'");
        const perms = row?.value ? JSON.parse(row.value) : DEFAULT_PR_PERMS;
        const roles = perms[action];
        return Array.isArray(roles) && roles.includes(userRole);
    } catch {
        const roles = DEFAULT_PR_PERMS[action];
        return Array.isArray(roles) && roles.includes(userRole);
    }
}

// ========== CENTRALIZED HANDOVER STATUS LOGIC ==========
// Chỉ "thanh_toan" và "tt_sll" cần thủ quỹ kiểm tra → chua_bangiao
// Mọi trường hợp khác (pending, dat_coc, tra_lai_coc) → thu_quy_nhan
function computeHandoverStatus(paymentType) {
    if (paymentType === 'thanh_toan' || paymentType === 'tt_sll') {
        return 'chua_bangiao';
    }
    return 'thu_quy_nhan';
}

async function isKeToan(userId) {
    if (!userId) return false;
    try {
        const row = await db.get(
            `SELECT d.name FROM users u 
             LEFT JOIN departments d ON u.department_id = d.id 
             WHERE u.id = $1`, [userId]
        );
        if (!row || !row.name) return false;
        const name = row.name.toLowerCase();
        return name.includes('kế toán') || name.includes('ke toan');
    } catch {
        return false;
    }
}

async function syncCashflowRecord(paymentRecordId, paymentCode, amount, date, note, method, userId) {
    if (method !== 'TM') return;
    try {
        const linked = await db.get('SELECT id FROM cashflow_records WHERE source_record_id = $1', [paymentRecordId]);
        if (linked) {
            await db.run(
                'UPDATE cashflow_records SET amount = $1, description = $2 WHERE source_record_id = $3',
                [Number(amount), note || '', paymentRecordId]
            );
        } else {
            const cfRow = await db.get(
                `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM cashflow_records WHERE cashflow_date = $1`,
                [date]
            );
            const seq = Number(cfRow.max_seq) + 1;
            await db.run(`
                INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, source_record_id, created_by)
                VALUES ($1, 'THU', $2, $3, $4, $5, $6, $7)
            `, [paymentCode, seq, date, note || paymentCode, Number(amount), paymentRecordId, userId]);
        }
    } catch (e) {
        console.error('[Cashflow Sync] Error:', e.message);
    }
}


module.exports = async function(fastify) {

    // ========== COMPARE WAYBILLS: So sánh mã vận đơn từ Excel ==========
    fastify.post('/api/payment-records/compare-waybills', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const hasPerm = await _checkPrPerm(user.role, 'pr_excel_reconcile');
        if (!hasPerm) return reply.code(403).send({ error: 'Bạn không có quyền đối soát file excel nhà vận chuyển' });

        const { waybills } = request.body || {};
        if (!waybills || !Array.isArray(waybills) || waybills.length === 0) {
            return reply.code(400).send({ error: 'Danh sách mã vận đơn trống hoặc không hợp lệ' });
        }

        const trackingCodes = waybills.map(w => String(w.code || '').trim()).filter(Boolean);
        if (trackingCodes.length === 0) {
            return { orders: [] };
        }

        const placeholders1 = trackingCodes.map((_, i) => `$${i + 1}`).join(',');
        const placeholders2 = trackingCodes.map((_, i) => `$${i + 1 + trackingCodes.length}`).join(',');
        
        const query = `
            SELECT DISTINCT ON (o.order_code)
                o.id, o.order_code, o.customer_name, o.customer_phone,
                o.shipping_status, o.total_amount, o.discount_amount,
                COALESCE(oi.tracking_code, o.tracking_code) AS tracking_code,
                u.full_name AS cskh_name,
                GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) AS deposit_paid,
                COALESCE(o.total_amount, 0)
                  - COALESCE(o.discount_amount, 0)
                  - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0))
                  - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END
                  AS remaining
            FROM dht_orders o
            LEFT JOIN dht_order_items oi ON oi.dht_order_id = o.id
            LEFT JOIN users u ON o.cskh_user_id = u.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                   OR order_tt_coc = o.order_code
            ) pr_dep ON true
            WHERE o.tracking_code IN (${placeholders1}) OR oi.tracking_code IN (${placeholders2})
        `;
        const orders = await db.all(query, [...trackingCodes, ...trackingCodes]);
        return { orders };
    });

    // ========== TREE: Năm → Tháng → Ngày + tổng tiền ==========
    fastify.get('/api/payment-records/tree', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const rows = await db.all(`
            SELECT 
                EXTRACT(YEAR FROM payment_date)::int AS year,
                EXTRACT(MONTH FROM payment_date)::int AS month,
                EXTRACT(DAY FROM payment_date)::int AS day,
                COALESCE(SUM(amount), 0)::numeric AS total
            FROM payment_records
            WHERE COALESCE(source, '') != 'cashflow_chi'
              AND COALESCE(payment_type, '') != 'child_sll'
            GROUP BY year, month, day
            ORDER BY year DESC, month DESC, day DESC
        `);

        // Build tree structure
        const yearMap = {};
        for (const r of rows) {
            if (!yearMap[r.year]) yearMap[r.year] = { year: r.year, total: 0, months: {} };
            if (!yearMap[r.year].months[r.month]) yearMap[r.year].months[r.month] = { month: r.month, total: 0, days: [] };
            yearMap[r.year].months[r.month].days.push({ day: r.day, total: Number(r.total) });
            yearMap[r.year].months[r.month].total += Number(r.total);
            yearMap[r.year].total += Number(r.total);
        }

        // Convert to sorted arrays
        const tree = Object.values(yearMap)
            .sort((a, b) => b.year - a.year)
            .map(y => ({
                ...y,
                months: Object.values(y.months)
                    .sort((a, b) => b.month - a.month)
                    .map(m => ({
                        ...m,
                        days: m.days.sort((a, b) => b.day - a.day)
                    }))
            }));

        return { tree };
    });

    fastify.get('/api/payment-records/parent/:id/children', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        try { jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const { id } = request.params;
        const rows = await db.all(
            `SELECT pr.*,
                    o.deposit_payment_id,
                    COALESCE(o.total_amount, 0)
                      - COALESCE(o.discount_amount, 0)
                      - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0))
                      - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END
                      AS order_remaining
             FROM payment_records pr
             LEFT JOIN dht_orders o ON pr.order_tt_coc = o.order_code
             LEFT JOIN LATERAL (
                 SELECT COALESCE(SUM(amount), 0) AS deposit_total
                 FROM payment_records
                 WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                    OR order_tt_coc = o.order_code
             ) pr_dep ON true
             WHERE pr.payment_type = 'child_sll' AND (pr.parent_id = $1 OR pr.source_ref_id = $1::text)
             ORDER BY pr.id ASC`,
            [Number(id)]
        );
        if (rows.length === 0) {
            const parentRec = await db.get(
                `SELECT pr.*,
                        o.deposit_payment_id,
                        COALESCE(o.total_amount, 0)
                          - COALESCE(o.discount_amount, 0)
                          - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0))
                          - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END
                          AS order_remaining
                 FROM payment_records pr
                 LEFT JOIN dht_orders o ON pr.order_tt_coc = o.order_code
                 LEFT JOIN LATERAL (
                     SELECT COALESCE(SUM(amount), 0) AS deposit_total
                     FROM payment_records
                     WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                        OR order_tt_coc = o.order_code
                 ) pr_dep ON true
                 WHERE pr.id = $1 AND pr.order_tt_coc IS NOT NULL AND pr.order_tt_coc != ''`,
                [Number(id)]
            );
            if (parentRec) {
                rows.push(parentRec);
            }
        }
        const splitRows = await db.all(
            `SELECT payment_code, amount, payment_type FROM payment_records WHERE parent_id = $1 AND payment_type != 'child_sll' ORDER BY id ASC`,
            [Number(id)]
        );
        return { children: rows, splitRecords: splitRows };
    });

    // ========== LIST: Lấy records theo filter ==========
    fastify.get('/api/payment-records', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const { year, month, day } = request.query;
        let where = "WHERE COALESCE(pr.source, '') != 'cashflow_chi' AND COALESCE(pr.payment_type, '') != 'child_sll'";
        const params = [];
        let paramIdx = 1;

        if (year) { where += ` AND EXTRACT(YEAR FROM pr.payment_date) = $${paramIdx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM pr.payment_date) = $${paramIdx++}`; params.push(Number(month)); }
        if (day) { where += ` AND EXTRACT(DAY FROM pr.payment_date) = $${paramIdx++}`; params.push(Number(day)); }

        const rows = await db.all(`
            SELECT pr.*,
                   u_cskh.full_name AS cskh_name,
                   u_created.full_name AS created_by_name,
                   u_handover.full_name AS handover_by_name,
                   (
                       SELECT string_agg(DISTINCT c.customer_name, ', ')
                       FROM payment_records c
                       WHERE c.payment_type = 'child_sll' AND (c.parent_id = pr.id OR c.source_ref_id = pr.id::text)
                   ) AS sll_customer_names,
                   (
                       SELECT string_agg(c.order_tt_coc, ', ')
                       FROM payment_records c
                       WHERE c.payment_type = 'child_sll' AND (c.parent_id = pr.id OR c.source_ref_id = pr.id::text)
                   ) AS sll_order_codes,
                   (
                       SELECT COALESCE(SUM(c.amount::numeric), 0)
                       FROM payment_records c
                       WHERE c.payment_type = 'child_sll' AND (c.parent_id = pr.id OR c.source_ref_id = pr.id::text)
                   ) AS sll_children_sum
            FROM payment_records pr
            LEFT JOIN users u_cskh ON pr.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON pr.created_by = u_created.id
            LEFT JOIN users u_handover ON pr.handover_by = u_handover.id
            ${where}
            ORDER BY pr.payment_date DESC, pr.id DESC
        `, params);

        return { records: rows };
    });

    // ========== NEXT SEQ: Lấy STT tiếp theo ==========
    fastify.get('/api/payment-records/next-seq', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        try { jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const { method, date } = request.query;
        if (!method || !date) return reply.code(400).send({ error: 'Thiếu method hoặc date' });

        const row = await db.get(
            `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq
             FROM payment_records
             WHERE payment_method = $1 AND payment_date = $2`,
            [method, date]
        );
        let seq = Number(row.max_seq) + 1;
        // TM: check cả cashflow_records để tránh trùng với CHI
        if (method === 'TM') {
            const cfRow = await db.get(
                `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM cashflow_records WHERE cashflow_date = $1`,
                [date]
            );
            seq = Math.max(seq, Number(cfRow.max_seq) + 1);
        }

        // Build code preview
        const d = new Date(date);
        const dd = d.getDate();
        const mm = d.getMonth() + 1;
        const yy = d.getFullYear().toString().slice(-2);
        const code = `${method}${seq}-${dd}-${mm}-Y${yy}`;

        return { next_seq: seq, code };
    });

    // ========== CREATE: Tạo mã thanh toán mới ==========
    fastify.post('/api/payment-records', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const b = request.body;
        if (!b.payment_method || !b.payment_date || !b.amount) {
            return reply.code(400).send({ error: 'Thiếu thông tin bắt buộc' });
        }

        let moneySource = b.money_source || 'khach_hang';
        if (b.bank_name === 'Nhà Vận Chuyển') {
            const isGD = user.role === 'giam_doc';
            const isTrinh = user.role === 'quan_ly_cap_cao' && user.username === 'trinh';
            if (!isGD && !isTrinh) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc và Quản lý cấp cao Trinh mới được tạo mã tiền với ngân hàng Nhà Vận Chuyển' });
            }
            moneySource = 'nha_van_chuyen';
        }

        // Get next STT (check cả payment_records + cashflow_records cho TM)
        const seqRow = await db.get(
            `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq
             FROM payment_records
             WHERE payment_method = $1 AND payment_date = $2`,
            [b.payment_method, b.payment_date]
        );
        let seq = Number(seqRow.max_seq) + 1;
        if (b.payment_method === 'TM') {
            const cfRow = await db.get(
                `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM cashflow_records WHERE cashflow_date = $1`,
                [b.payment_date]
            );
            seq = Math.max(seq, Number(cfRow.max_seq) + 1);
        }

        // Build payment code
        const d = new Date(b.payment_date);
        const dd = d.getDate();
        const mm = d.getMonth() + 1;
        const yy = d.getFullYear().toString().slice(-2);
        const code = `${b.payment_method}${seq}-${dd}-${mm}-Y${yy}`;

        try {
            // Handover logic: chỉ thanh_toan/tt_sll → chua_bangiao, còn lại → thu_quy_nhan
            const autoHandover = computeHandoverStatus(b.payment_type || 'pending');
            const result = await db.get(`
                INSERT INTO payment_records (
                    payment_code, payment_method, daily_seq,
                    customer_name, customer_phone, cskh_user_id,
                    amount, payment_type,
                    order_tt_coc, order_ao_mau,
                    transfer_note, money_source, bank_name,
                    total_order_codes, total_cod, shipping_fee,
                    handover_status, source, payment_date, created_by
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
                RETURNING id, payment_code
            `, [
                code, b.payment_method, seq,
                b.customer_name || null, b.customer_phone || null, b.cskh_user_id || null,
                b.amount, b.payment_type || 'pending',
                b.order_tt_coc || null, b.order_ao_mau || null,
                b.transfer_note || null, moneySource, b.bank_name || null,
                b.total_order_codes || null, b.total_cod || 0, b.shipping_fee || 0,
                autoHandover, 'manual', b.payment_date, user.id
            ]);

            // === Send Telegram notification ===
            try {
                const tgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_payment_notify_group'");
                if (tgRow && tgRow.value) {
                    const { sendTelegramMessage } = require('../utils/telegram');
                    const icon = b.payment_method === 'TM' ? '💰' : '🏦';
                    const amtStr = Number(b.amount).toLocaleString('vi-VN');
                    const bankStr = b.bank_name ? ' ' + b.bank_name : '';
                    const noteStr = b.transfer_note ? ' ' + b.transfer_note : '';
                    const creatorName = user.full_name || user.username || '';
                    const msg = `${icon}${code} : ${amtStr}đ${bankStr}${noteStr} 👤 ${creatorName}`;
                    await sendTelegramMessage(tgRow.value, msg);
                }
            } catch (tgErr) {
                console.error('[TG Manual] Lỗi gửi Telegram:', tgErr.message);
            }

            // === Auto-sync TM → Sổ Thu Chi (THU) ===
            if (b.payment_method === 'TM') {
                try {
                    const cfDate = b.payment_date;
                    // Use same payment_code as cashflow_code (TM5-15-5-Y26)
                    await db.run(`
                        INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, source_record_id, created_by)
                        VALUES ($1, 'THU', $2, $3, $4, $5, $6, $7)
                    `, [code, seq, cfDate, b.transfer_note || code, Number(b.amount), result.id, user.id]);
                    console.log('[Cashflow] Auto THU:', code, Number(b.amount));

                    // Send Telegram for THU to cashflow group
                    try {
                        const cfTgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cashflow_group'");
                        if (cfTgRow && cfTgRow.value) {
                            const { sendTelegramMessage: sendCfTg } = require('../utils/telegram');
                            const cfAmtStr = Number(b.amount).toLocaleString('vi-VN');
                            // Calculate running balance
                            const thuSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='THU' AND is_closed=false AND NOT (money_source='cophanmay' AND cashflow_code LIKE 'CPMAY-%')");
                            const chiSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='CHI' AND is_closed=false");
                            const runBal = Number(thuSum.t) - Number(chiSum.t);
                            const balStr = runBal.toLocaleString('vi-VN');
                            const cfMsg = `🟢THU TIỀN MẶT CÔNG TY :\n💰${code} : <b>${cfAmtStr}đ</b> ${b.transfer_note || ''} 👤 ${user.full_name || user.username}\n\n🔗Tổng Kế Toán Cầm : <b>${balStr}đ</b>`;
                            await sendCfTg(cfTgRow.value, cfMsg);
                        }
                    } catch (cfTgErr) { console.error('[CF TG] Error:', cfTgErr.message); }

                } catch (cfErr) {
                    console.error('[Cashflow] Lỗi sync THU:', cfErr.message);
                }
            }

            return { success: true, id: result.id, payment_code: result.payment_code };
        } catch (err) {
            if (err.message && err.message.includes('unique')) {
                return reply.code(409).send({ error: 'Mã thanh toán đã tồn tại. Vui lòng thử lại.' });
            }
            throw err;
        }
    });

    // ========== UPDATE: Cập nhật record ==========
    fastify.put('/api/payment-records/:id', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const { id } = request.params;
        const b = request.body;

        const existing = await db.get('SELECT * FROM payment_records WHERE id = $1', [id]);
        if (!existing) return reply.code(404).send({ error: 'Không tìm thấy' });

        if (existing.payment_type === 'child_sll') {
            return reply.code(403).send({ error: 'Không thể chỉnh sửa trực tiếp mã tiền con' });
        }

        const isGD = user.role === 'giam_doc';
        const isTrinh = user.role === 'quan_ly_cap_cao' && user.username === 'trinh';

        if (existing.payment_type === 'parent_sll') {
            if (!isGD && !isTrinh) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc và Quản lý cấp cao Trinh mới được sửa/hủy liên kết mã tiền SLL' });
            }
            // Kiểm tra xem có mã tiền thừa nào được tách ra đã được nhận đơn/cọc chưa
            const claimedSplit = await db.get(
                `SELECT payment_code FROM payment_records 
                 WHERE parent_id = $1 AND payment_type != 'child_sll' AND (
                     (payment_type = 'dat_coc') OR 
                     (payment_type = 'tra_lai_coc') OR 
                     (total_order_codes IS NOT NULL AND total_order_codes != '') OR 
                     (order_tt_coc IS NOT NULL AND order_tt_coc != '')
                 )`, [Number(id)]
            );
            if (claimedSplit) {
                return reply.code(400).send({ 
                    error: `Không thể hủy liên kết SLL vì mã tiền thừa ${claimedSplit.payment_code} đã được nhận đơn hoặc đặt cọc!` 
                });
            }

            // Xóa toàn bộ các mã con SLL và các mã tiền thừa pending chưa sử dụng
            await db.run("DELETE FROM payment_records WHERE parent_id = $1 OR (source_ref_id = $1::text AND payment_type = 'child_sll')", [Number(id)]);
            
            // Khôi phục mã cha về trạng thái chưa liên kết (pending) và xóa liên kết đơn
            await db.run("UPDATE payment_records SET payment_type = 'pending', order_tt_coc = NULL, total_order_codes = NULL, updated_at = NOW() WHERE id = $1", [id]);
            existing.payment_type = 'pending';
            existing.order_tt_coc = null;
            existing.total_order_codes = null;
        }

        const isAlreadyClaimed = (existing.payment_type === 'dat_coc') || (existing.payment_type === 'tra_lai_coc') || (existing.total_order_codes && existing.total_order_codes.trim() !== '') || (existing.order_tt_coc && existing.order_tt_coc.trim() !== '');
        if (isAlreadyClaimed) {
            return reply.code(400).send({ error: 'Mã tiền đã nhận tiền/liên kết đơn hàng, không thể chỉnh sửa!' });
        }

        let moneySource = b.money_source;
        if (b.bank_name === 'Nhà Vận Chuyển') {
            const isGD = user.role === 'giam_doc';
            const isTrinh = user.role === 'quan_ly_cap_cao' && user.username === 'trinh';
            if (!isGD && !isTrinh) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc và Quản lý cấp cao Trinh mới được sửa mã tiền thành ngân hàng Nhà Vận Chuyển' });
            }
            moneySource = 'nha_van_chuyen';
        } else if (b.money_source === 'nha_van_chuyen') {
            const isGD = user.role === 'giam_doc';
            const isTrinh = user.role === 'quan_ly_cap_cao' && user.username === 'trinh';
            if (!isGD && !isTrinh) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc và Quản lý cấp cao Trinh mới được sửa nguồn tiền thành Nhà Vận Chuyển' });
            }
        }

        if (b.is_sll) {
            const isUserGD = user.role === 'giam_doc';
            const isUserTrinh = user.role === 'quan_ly_cap_cao' && user.username === 'trinh';
            const isUserKT = await isKeToan(user.id);
            if (!isUserGD && !isUserTrinh && !isUserKT) {
                return reply.code(403).send({ error: 'Bạn không có quyền thực hiện chức năng này' });
            }

            const allocations = b.allocations || [];
            if (allocations.length < 1) {
                return reply.code(400).send({ error: 'Yêu cầu phải chọn ít nhất 1 đơn hàng để liên kết.' });
            }

            const pr = await db.get('SELECT * FROM payment_records WHERE id = $1', [id]);
            if (!pr) {
                return reply.code(404).send({ error: 'Không tìm thấy giao dịch thanh toán' });
            }

            const totalAllocated = allocations.reduce((sum, item) => sum + Number(item.amount), 0);
            const maxAllowedAmount = pr.money_source === 'nha_van_chuyen' ? (Number(pr.amount) + Number(b.shipping_fee || pr.shipping_fee || 0)) : Number(pr.amount);
            if (totalAllocated > maxAllowedAmount) {
                return reply.code(400).send({ error: `Tổng tiền phân bổ (${totalAllocated.toLocaleString('vi-VN')}đ) vượt quá giới hạn tối đa cho phép (${maxAllowedAmount.toLocaleString('vi-VN')}đ)` });
            }

            if (pr.money_source === 'nha_van_chuyen' && b.total_cod !== undefined && b.shipping_fee !== undefined) {
                const limitRow = await db.get("SELECT value FROM app_config WHERE key = 'pr_action_permissions'");
                const perms = limitRow?.value ? JSON.parse(limitRow.value) : DEFAULT_PR_PERMS;
                const limit = perms.pr_excel_reconcile_limit !== undefined ? Number(perms.pr_excel_reconcile_limit) : 50000;
                
                const totalNet = Number(b.total_cod) - Number(b.shipping_fee);
                const absDiff = Math.abs(totalNet - Number(pr.amount));
                
                if (limit === 0) {
                    if (absDiff >= 1) {
                        return reply.code(400).send({ error: `Số tiền chênh lệch (${absDiff.toLocaleString('vi-VN')}đ) vượt quá giới hạn cho phép (Chỉ cho phép khớp 100%)` });
                    }
                } else if (absDiff > limit) {
                    return reply.code(400).send({ error: `Số tiền chênh lệch (${absDiff.toLocaleString('vi-VN')}đ) vượt quá giới hạn lệch tối đa cho phép (${limit.toLocaleString('vi-VN')}đ)` });
                }
            }

            const moneySource = pr.money_source === 'nha_van_chuyen' ? 'nha_van_chuyen' : (allocations.length >= 2 ? 'khach_hang_sll' : 'khach_hang');
            const parentHandover = computeHandoverStatus('tt_sll');

            // 1. Update the parent record (keep original amount, set type = parent_sll, set order_tt_coc = NULL)
            await db.run(`
                UPDATE payment_records SET
                    payment_type = 'parent_sll',
                    order_tt_coc = NULL,
                    total_order_codes = NULL,
                    transfer_note = $1,
                    money_source = $2,
                    handover_status = $3,
                    total_cod = COALESCE($4, total_cod),
                    shipping_fee = COALESCE($5, shipping_fee),
                    updated_at = NOW()
                WHERE id = $6
            `, [
                (pr.transfer_note || '') + ' (Gốc: Liên kết đơn: ' + allocations.map(a => a.order_code).join(', ') + ')',
                moneySource,
                parentHandover,
                b.total_cod !== undefined ? Number(b.total_cod) : null,
                b.shipping_fee !== undefined ? Number(b.shipping_fee) : null,
                id
            ]);

            if (pr.payment_method === 'TM') {
                await syncCashflowRecord(id, pr.payment_code, pr.amount, pr.payment_date, (pr.transfer_note || '') + ' (Liên kết: ' + allocations.map(a => a.order_code).join(', ') + ')', 'TM', user.id);
            }

            const autoCompletedOrders = [];
            const processAutoComplete = async (orderCode) => {
                try {
                    const dhtOrder = await db.get(
                        'SELECT id, order_code FROM dht_orders WHERE order_code = $1', [orderCode]
                    );
                    if (dhtOrder) {
                        const remainRow = await db.get(`
                            SELECT
                                COALESCE(o.total_amount, 0)
                                - COALESCE(o.discount_amount, 0)
                                - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0))
                                - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck'
                                       THEN COALESCE(o.shipping_fee, 0) ELSE 0 END
                                AS remaining
                            FROM dht_orders o
                            LEFT JOIN LATERAL (
                                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                                FROM payment_records
                                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                                   OR order_tt_coc = o.order_code
                            ) pr_dep ON true
                            WHERE o.order_code = $1
                        `, [orderCode]);

                        if (remainRow && remainRow.remaining <= 0) {
                            const oc = await db.get(
                                `SELECT oc.*, c.referrer_id, c.id as cust_id
                                 FROM order_codes oc
                                 JOIN customers c ON c.id = oc.customer_id
                                 WHERE oc.order_code = $1`,
                                [orderCode]
                            );
                            if (oc && oc.status !== 'completed') {
                                await db.run("UPDATE order_codes SET status = 'completed' WHERE id = $1", [oc.id]);
                                autoCompletedOrders.push(orderCode);

                                if (oc.referrer_id) {
                                    const grandTotalRow = await db.get(`
                                        SELECT COALESCE(
                                            (SELECT SUM(di.item_total) FROM dht_orders d JOIN dht_order_items di ON di.dht_order_id = d.id WHERE d.order_code = oc.order_code),
                                            (SELECT SUM(oi_f.total) FROM order_items oi_f WHERE oi_f.order_code_id = oc.id),
                                            0
                                        ) - COALESCE((SELECT d2.vat_amount FROM dht_orders d2 WHERE d2.order_code = oc.order_code), 0)
                                          - COALESCE((SELECT d3.discount_amount FROM dht_orders d3 WHERE d3.order_code = oc.order_code), 0) as t
                                        FROM order_codes oc WHERE oc.id = $1
                                    `, [oc.id]);
                                    const grandTotal = grandTotalRow?.t || 0;

                                    if (grandTotal > 0) {
                                        const referrer = await db.get(
                                            'SELECT u.*, ct.percentage FROM users u LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id WHERE u.id = $1',
                                            [oc.referrer_id]
                                        );
                                        if (referrer?.percentage) {
                                            let skipComm = false;
                                            try {
                                                const fooCfg = await db.get("SELECT value FROM app_config WHERE key = 'commission_first_order_cutoff'");
                                                if (fooCfg?.value && new Date() >= new Date(fooCfg.value)) {
                                                    const isSelfCust = referrer.source_customer_id && referrer.source_customer_id === oc.cust_id;
                                                    if (!isSelfCust) {
                                                        const orderCount = await db.get("SELECT COUNT(*) as cnt FROM order_codes WHERE customer_id = $1 AND status != 'cancelled'", [oc.cust_id]);
                                                        if (orderCount && orderCount.cnt > 1) skipComm = true;
                                                    }
                                                }
                                            } catch(e) {}

                                            if (!skipComm) {
                                                const commAmount = Math.round(grandTotal * (referrer.percentage / 100));
                                                if (commAmount > 0) {
                                                    const nowVnStr = vnFormat(vnNow(), 'yyyy-MM-dd HH:mm:ss');
                                                    await db.run(`
                                                        INSERT INTO commissions (
                                                            referrer_id, order_code_id, order_code,
                                                            base_amount, percentage, commission_amount,
                                                            status, created_at, updated_at
                                                        ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$7)
                                                        ON CONFLICT(order_code_id) DO UPDATE SET
                                                            commission_amount = EXCLUDED.commission_amount,
                                                            updated_at = NOW()
                                                    `, [oc.referrer_id, oc.id, oc.order_code, grandTotal, referrer.percentage, commAmount, nowVnStr]);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('[SLL AutoComplete] Error for order ' + orderCode + ':', err.message);
                }
            };

            const processAutoCompleteAoMau = async (sampleOrderCode) => {
                try {
                    const sampleOrder = await db.get(
                        'SELECT id, total_amount, sample_order_code FROM don_gui_ao_mau WHERE sample_order_code = $1', [sampleOrderCode]
                    );
                    if (sampleOrder) {
                        const remainRow = await db.get(`
                            SELECT (COALESCE(d.total_amount, 0) - COALESCE(pr_dep.deposit_total, 0)) AS remaining
                            FROM don_gui_ao_mau d
                            LEFT JOIN LATERAL (
                                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                                FROM payment_records
                                WHERE order_ao_mau = d.sample_order_code
                            ) pr_dep ON true
                            WHERE d.sample_order_code = $1
                        `, [sampleOrderCode]);

                        if (remainRow && remainRow.remaining <= 0) {
                            await db.run("UPDATE don_gui_ao_mau SET order_status = 'hoan_thanh', updated_at = NOW() WHERE id = $1", [sampleOrder.id]);
                        }
                    }
                } catch (err) {
                    console.error('[AoMau AutoComplete] Error for sample order ' + sampleOrderCode + ':', err.message);
                }
            };

            // 2. Create child records for ALL allocations (from 0 to allocations.length - 1)
            for (let i = 0; i < allocations.length; i++) {
                const alloc = allocations[i];
                const splitCode = `${pr.payment_code}-S${i + 1}`;
                const isAoMau = alloc.order_type === 'ao_mau';
                
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
                    alloc.customer_name || null, alloc.customer_phone || null, pr.cskh_user_id || null,
                    alloc.amount, 'child_sll',
                    isAoMau ? null : alloc.order_code,
                    isAoMau ? alloc.order_code : null,
                    (pr.transfer_note || '') + ' (Phân bổ từ ' + pr.payment_code + ')',
                    moneySource, pr.bank_name || null,
                    null, 0, 0,
                    parentHandover,
                    pr.handover_at || null,
                    pr.handover_by || null,
                    pr.source, null, pr.payment_date, user.id,
                    Number(id)
                ]);

                if (isAoMau) {
                    await processAutoCompleteAoMau(alloc.order_code);
                } else {
                    await processAutoComplete(alloc.order_code);
                }
            }

            return { success: true, auto_completed_orders: autoCompletedOrders };
        }

        // Auto handover logic: chỉ thanh_toan/tt_sll → chua_bangiao, còn lại → thu_quy_nhan
        let handoverUpdate = '';
        if (b.payment_type) {
            const newHandover = computeHandoverStatus(b.payment_type);
            handoverUpdate = `, handover_status = '${newHandover}'`;
        }

        await db.run(`
            UPDATE payment_records SET
                customer_name = COALESCE($1, customer_name),
                customer_phone = COALESCE($2, customer_phone),
                cskh_user_id = $3,
                amount = COALESCE($4, amount),
                payment_type = COALESCE($5, payment_type),
                order_tt_coc = $6,
                order_ao_mau = $7,
                transfer_note = $8,
                money_source = COALESCE($9, money_source),
                bank_name = $10,
                total_order_codes = $11,
                total_cod = COALESCE($12, total_cod),
                shipping_fee = COALESCE($13, shipping_fee),
                updated_at = NOW()
                ${handoverUpdate}
            WHERE id = $14
        `, [
            b.customer_name, b.customer_phone, b.cskh_user_id || null,
            b.amount, b.payment_type,
            b.order_tt_coc || null, b.order_ao_mau || null,
            b.transfer_note || null, moneySource, b.bank_name || null,
            b.total_order_codes || null, b.total_cod, b.shipping_fee,
            id
        ]);

        // Sync amount + description to linked cashflow_record (Sổ Thu Chi)
        try {
            const linked = await db.get('SELECT id FROM cashflow_records WHERE source_record_id = $1', [id]);
            if (linked) {
                await db.run(
                    'UPDATE cashflow_records SET amount = $1, description = $2 WHERE source_record_id = $3',
                    [Number(b.amount), b.transfer_note || '', id]
                );
                console.log('[PR Edit] Synced cashflow_record for payment_record #' + id + ' → ' + b.amount);
            }
        } catch (e) { console.error('[PR Edit] Sync error:', e.message); }

        // ★ AUTO-COMPLETE: Khi thanh toán đủ → tự động hoàn thành đơn DHT + tính hoa hồng
        let autoCompleted = false;
        let autoCommission = 0;
        const orderCode = b.order_tt_coc;
        if (orderCode) {
            try {
                // 1. Kiểm tra đơn có trong DHT không (chỉ áp dụng cho đơn DHT)
                const dhtOrder = await db.get(
                    'SELECT id, order_code FROM dht_orders WHERE order_code = $1', [orderCode]
                );

                if (dhtOrder) {
                    // 2. Tính remaining_amount (cùng công thức chuẩn DHT — Source of Truth)
                    const remainRow = await db.get(`
                        SELECT
                            COALESCE(o.total_amount, 0)
                            - COALESCE(o.discount_amount, 0)
                            - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0))
                            - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck'
                                   THEN COALESCE(o.shipping_fee, 0) ELSE 0 END
                            AS remaining
                        FROM dht_orders o
                        LEFT JOIN LATERAL (
                            SELECT COALESCE(SUM(amount), 0) AS deposit_total
                            FROM payment_records
                            WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                               OR order_tt_coc = o.order_code
                        ) pr_dep ON true
                        WHERE o.order_code = $1
                    `, [orderCode]);

                    if (remainRow && remainRow.remaining <= 0) {
                        // 3. Tìm order_code record + customer referrer
                        const oc = await db.get(
                            `SELECT oc.*, c.referrer_id, c.id as cust_id
                             FROM order_codes oc
                             JOIN customers c ON c.id = oc.customer_id
                             WHERE oc.order_code = $1`,
                            [orderCode]
                        );

                        if (oc && oc.status !== 'completed') {
                            // 4a. Mark order completed
                            await db.run("UPDATE order_codes SET status = 'completed' WHERE id = $1", [oc.id]);
                            console.log(`[AutoComplete] ✅ Order ${orderCode} marked completed (remaining=${remainRow.remaining})`);

                            // 4b. Tính hoa hồng cho affiliate (nếu có referrer)
                            if (oc.referrer_id) {
                                const grandTotalRow = await db.get(`
                                    SELECT COALESCE(
                                        (SELECT SUM(di.item_total) FROM dht_orders d JOIN dht_order_items di ON di.dht_order_id = d.id WHERE d.order_code = oc.order_code),
                                        (SELECT SUM(oi_f.total) FROM order_items oi_f WHERE oi_f.order_code_id = oc.id),
                                        0
                                    ) - COALESCE((SELECT d2.vat_amount FROM dht_orders d2 WHERE d2.order_code = oc.order_code), 0)
                                      - COALESCE((SELECT d3.discount_amount FROM dht_orders d3 WHERE d3.order_code = oc.order_code), 0) as t
                                    FROM order_codes oc WHERE oc.id = $1
                                `, [oc.id]);
                                const grandTotal = grandTotalRow?.t || 0;

                                if (grandTotal > 0) {
                                    const referrer = await db.get(
                                        'SELECT u.*, ct.percentage FROM users u LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id WHERE u.id = $1',
                                        [oc.referrer_id]
                                    );
                                    if (referrer?.percentage) {
                                        // ★ FIRST-ORDER-ONLY: check if this is a repeat order
                                        let skipComm = false;
                                        try {
                                            const fooCfg = await db.get("SELECT value FROM app_config WHERE key = 'commission_first_order_cutoff'");
                                            if (fooCfg?.value && new Date() >= new Date(fooCfg.value)) {
                                                const isSelfCust = referrer.source_customer_id && referrer.source_customer_id === oc.cust_id;
                                                if (!isSelfCust) {
                                                    const orderCount = await db.get("SELECT COUNT(*) as cnt FROM order_codes WHERE customer_id = $1 AND status != 'cancelled'", [oc.cust_id]);
                                                    if (orderCount && orderCount.cnt > 1) skipComm = true;
                                                }
                                            }
                                        } catch(e) { /* fallback: allow commission */ }

                                        if (!skipComm) {
                                            autoCommission = Math.round(grandTotal * referrer.percentage / 100);
                                            await db.run('UPDATE users SET balance = balance + $1 WHERE id = $2', [autoCommission, referrer.id]);
                                            console.log(`[AutoComplete] 💰 Commission ${autoCommission.toLocaleString()} → affiliate #${referrer.id} (${referrer.full_name})`);
                                        }
                                    }
                                }
                            }

                            // 4c. Cập nhật customer status (nếu là đơn mới nhất)
                            const latestOrder = await db.get(
                                'SELECT id FROM order_codes WHERE customer_id = $1 ORDER BY id DESC LIMIT 1',
                                [oc.cust_id]
                            );
                            if (latestOrder && latestOrder.id === oc.id) {
                                await db.run("UPDATE customers SET order_status = 'hoan_thanh', updated_at = NOW() WHERE id = $1", [oc.cust_id]);
                                console.log(`[AutoComplete] 🏆 Customer #${oc.cust_id} → hoan_thanh`);
                            }

                            autoCompleted = true;
                        }
                    }
                }
            } catch (e) {
                console.error('[AutoComplete] Error:', e.message);
                // Không throw — payment đã update thành công, auto-complete là bonus
            }
        }

        return { success: true, auto_completed: autoCompleted, auto_commission: autoCommission };
    });

    // ========== HANDOVER: Bàn giao thủ quỹ ==========
    fastify.put('/api/payment-records/:id/handover', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const { id } = request.params;
        const { status } = request.body;
        const newStatus = status === 'thu_quy_nhan' ? 'thu_quy_nhan' : 'chua_bangiao';

        if (newStatus === 'thu_quy_nhan') {
            await db.run(`
                UPDATE payment_records SET
                    handover_status = 'thu_quy_nhan',
                    handover_at = NOW(),
                    handover_by = $1::int,
                    updated_at = NOW()
                WHERE id = $2 OR (payment_type = 'child_sll' AND (parent_id = $2 OR source_ref_id = $2::text))
            `, [user.id, Number(id)]);
        } else {
            await db.run(`
                UPDATE payment_records SET
                    handover_status = 'chua_bangiao',
                    handover_at = NULL,
                    handover_by = NULL,
                    updated_at = NOW()
                WHERE id = $1 OR (payment_type = 'child_sll' AND (parent_id = $1 OR source_ref_id = $1::text))
            `, [Number(id)]);
        }

        return { success: true };
    });

    // ========== IMPACT CHECK: Kiểm tra ảnh hưởng trước khi xóa ==========
    fastify.get('/api/payment-records/:id/impact', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        try { jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const rec = await db.get('SELECT * FROM payment_records WHERE id = $1', [request.params.id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });

        const impacts = [];
        // Check linked cashflow_records (Sổ Thu Chi)
        const linked = await db.get('SELECT id, cashflow_code, cashflow_type, amount FROM cashflow_records WHERE source_record_id = $1', [rec.id]);
        if (linked) {
            impacts.push({
                module: '📒 Sổ Thu Chi',
                detail: 'Mã ' + linked.cashflow_code + ' (' + linked.cashflow_type + ' ' + Number(linked.amount).toLocaleString('vi-VN') + 'đ) sẽ bị XÓA theo',
                effect: 'Số dư Kế Toán Cầm sẽ thay đổi'
            });
        }

        return {
            record: { code: rec.payment_code, amount: Number(rec.amount), method: rec.payment_method, type: rec.payment_type },
            impacts
        };
    });

    // ========== DELETE: Xóa record (chỉ GĐ) ==========
    fastify.delete('/api/payment-records/:id', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        if (!(await _checkPrPerm(user.role, 'pr_delete'))) {
            return reply.code(403).send({ error: 'Bạn không có quyền xóa mã tiền' });
        }

        const recId = request.params.id;

        // Xóa record liên kết bên cashflow_records (Sổ Thu Chi) nếu có
        try {
            const linked = await db.get('SELECT id FROM cashflow_records WHERE source_record_id = $1', [recId]);
            if (linked) {
                await db.run('DELETE FROM cashflow_records WHERE source_record_id = $1', [recId]);
                console.log(`[PR Delete] Cascade deleted cashflow_record linked to payment_record #${recId}`);
            }
        } catch (e) { console.error('[PR Delete] Cascade error:', e.message); }

        // Xóa child records nếu có
        try {
            await db.run("DELETE FROM payment_records WHERE payment_type = 'child_sll' AND (parent_id = $1 OR source_ref_id = $1::text)", [Number(recId)]);
        } catch (e) {
            console.error('[PR Delete] Cascade children error:', e.message);
        }

        await db.run('DELETE FROM payment_records WHERE id = $1', [recId]);
        return { success: true };
    });

    // ========== STAFF LIST: cho dropdown CSKH ==========
    fastify.get('/api/payment-records/staff', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        try { jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const staff = await db.all(`
            SELECT id, full_name, username, role
            FROM users
            WHERE status = 'active'
              AND role NOT IN ('tkaffiliate','hoa_hong')
            ORDER BY full_name
        `);

        return { staff };
    });

    // ========== BANK LIST (public for all users) ==========
    fastify.get('/api/payment-records/bank-list', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        // Merge: email bank parsers + custom banks from app_config
        const emailBanks = await db.all('SELECT bank_name FROM email_bank_parsers ORDER BY id');
        let customBanks = [];
        try {
            const row = await db.get("SELECT value FROM app_config WHERE key = 'pr_custom_banks'");
            if (row && row.value) customBanks = JSON.parse(row.value);
        } catch {}
        let allNames = emailBanks.map(b => b.bank_name);
        customBanks.forEach(b => { if (!allNames.includes(b)) allNames.push(b); });

        // Filter out "Nhà Vận Chuyển" if user is not Giám đốc or Trinh
        const isUserGD = user.role === 'giam_doc';
        const isUserTrinh = user.role === 'quan_ly_cap_cao' && user.username === 'trinh';
        if (!isUserGD && !isUserTrinh) {
            allNames = allNames.filter(b => b !== 'Nhà Vận Chuyển');
        }
        return { banks: allNames };
    });

    // ========== CUSTOM BANKS: Add ==========
    fastify.post('/api/payment-records/custom-banks', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { bank_name } = request.body || {};
        if (!bank_name || !bank_name.trim()) return reply.code(400).send({ error: 'Tên ngân hàng không được trống' });
        let customBanks = [];
        try {
            const row = await db.get("SELECT value FROM app_config WHERE key = 'pr_custom_banks'");
            if (row && row.value) customBanks = JSON.parse(row.value);
        } catch {}
        const name = bank_name.trim();
        if (customBanks.includes(name)) return reply.code(400).send({ error: 'Ngân hàng đã tồn tại' });
        customBanks.push(name);
        await db.run("INSERT INTO app_config (key, value) VALUES ('pr_custom_banks', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [JSON.stringify(customBanks)]);
        return { success: true, banks: customBanks };
    });

    // ========== CUSTOM BANKS: Delete ==========
    fastify.delete('/api/payment-records/custom-banks', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { bank_name } = request.body || {};
        if (!bank_name) return reply.code(400).send({ error: 'Thiếu tên ngân hàng' });
        let customBanks = [];
        try {
            const row = await db.get("SELECT value FROM app_config WHERE key = 'pr_custom_banks'");
            if (row && row.value) customBanks = JSON.parse(row.value);
        } catch {}
        customBanks = customBanks.filter(b => b !== bank_name);
        await db.run("UPDATE app_config SET value = $1 WHERE key = 'pr_custom_banks'", [JSON.stringify(customBanks)]);
        return { success: true, banks: customBanks };
    });

    // ========== CUSTOM BANKS: List (custom only) ==========
    fastify.get('/api/payment-records/custom-banks-list', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        try { jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        let customBanks = [];
        try {
            const row = await db.get("SELECT value FROM app_config WHERE key = 'pr_custom_banks'");
            if (row && row.value) customBanks = JSON.parse(row.value);
        } catch {}
        return { banks: customBanks };
    });

    // ========== EMAIL BANK NAMES (from parsers only) ==========
    fastify.get('/api/payment-records/email-bank-names', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        try { jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        const banks = await db.all('SELECT bank_name FROM email_bank_parsers ORDER BY id');
        return { banks: banks.map(b => b.bank_name) };
    });

    // ========== EMAIL CONFIG: Get ==========
    fastify.get('/api/payment-records/email-config', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const config = await db.get('SELECT * FROM email_import_config WHERE id = 1');
        const banks = await db.all('SELECT * FROM email_bank_parsers ORDER BY id');
        const totalImported = await db.get("SELECT COUNT(*) as cnt FROM payment_records WHERE source = 'email_auto'");

        return {
            config: config ? {
                gmail_user: config.gmail_user || '',
                has_password: !!config.gmail_pass,
                check_interval: config.check_interval || 2,
                is_active: config.is_active || false,
                last_check_at: config.last_check_at,
                last_import_count: config.last_import_count || 0,
                last_error: config.last_error
            } : null,
            banks,
            total_imported: totalImported?.cnt || 0
        };
    });

    // ========== EMAIL CONFIG: Save ==========
    fastify.put('/api/payment-records/email-config', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const b = request.body;
        let passUpdate = '';
        const params = [b.gmail_user || '', b.check_interval || 2, !!b.is_active, user.id];

        if (b.gmail_pass) {
            passUpdate = ', gmail_pass = $5';
            params.push(encrypt(b.gmail_pass));
        }

        await db.run(`
            UPDATE email_import_config SET
                gmail_user = $1,
                check_interval = $2,
                is_active = $3,
                updated_by = $4,
                updated_at = NOW(),
                last_error = NULL
                ${passUpdate}
            WHERE id = 1
        `, params);

        // Restart cron with new interval
        await restartCron();

        return { success: true };
    });

    // ========== BANK PARSERS: Add ==========
    fastify.post('/api/payment-records/banks', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const { bank_name, sender_filter } = request.body;
        if (!bank_name || !sender_filter) return reply.code(400).send({ error: 'Thiếu thông tin' });

        const result = await db.get(
            'INSERT INTO email_bank_parsers (bank_name, sender_filter) VALUES ($1, $2) RETURNING id',
            [bank_name, sender_filter]
        );
        return { success: true, id: result.id };
    });

    // ========== BANK PARSERS: Toggle ==========
    fastify.put('/api/payment-records/banks/:id', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const { is_active } = request.body;
        await db.run('UPDATE email_bank_parsers SET is_active = $1 WHERE id = $2', [!!is_active, request.params.id]);
        return { success: true };
    });

    // ========== BANK PARSERS: Delete ==========
    fastify.delete('/api/payment-records/banks/:id', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        await db.run('DELETE FROM email_bank_parsers WHERE id = $1', [request.params.id]);
        return { success: true };
    });

    // ========== MANUAL TRIGGER: Force check now ==========
    fastify.post('/api/payment-records/check-email', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        checkEmails();
        return { success: true, message: 'Đang kiểm tra email...' };
    });
    // ========== TELEGRAM NOTIFY CONFIG: Get ==========
    fastify.get('/api/payment-records/tg-config', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const row = await db.get("SELECT value FROM app_config WHERE key = 'tg_payment_notify_group'");
        return { group_id: row?.value || '' };
    });

    // ========== TELEGRAM NOTIFY CONFIG: Save ==========
    fastify.put('/api/payment-records/tg-config', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const { group_id } = request.body || {};
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('tg_payment_notify_group', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [(group_id || '').trim()]
        );
        return { success: true };
    });

    // ========== TELEGRAM NOTIFY: Test ==========
    fastify.post('/api/payment-records/tg-test', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const { group_id } = request.body || {};
        if (!group_id) return reply.code(400).send({ error: 'Chưa nhập Group ID' });

        const { sendTelegramMessage } = require('../utils/telegram');
        const now = new Date();
        const dd = now.getDate(), mm = now.getMonth() + 1, yy = now.getFullYear().toString().slice(-2);
        const testMsg = `🏦CK_TEST-${dd}-${mm}-Y${yy} : 180.000đ Sacombank 🧪 TEST - Sổ Ghi Nhận Tiền hoạt động!`;
        const ok = await sendTelegramMessage(group_id.trim(), testMsg);
        if (ok) return { success: true };
        return reply.code(400).send({ error: 'Gửi thất bại! Kiểm tra Bot Token và Group ID.' });
    });

    // ========== DAILY REPORT: Config Get ==========
    fastify.get('/api/payment-records/report-config', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const grp = await db.get("SELECT value FROM app_config WHERE key = 'pr_report_tg_group'");
        const time = await db.get("SELECT value FROM app_config WHERE key = 'pr_report_time'");
        return {
            group_id: grp?.value || '',
            report_time: time?.value || '21:00'
        };
    });

    // ========== DAILY REPORT: Config Save ==========
    fastify.put('/api/payment-records/report-config', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const { group_id, report_time } = request.body || {};
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('pr_report_tg_group', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [(group_id || '').trim()]
        );
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('pr_report_time', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [(report_time || '21:00').trim()]
        );
        return { success: true };
    });

    // ========== DAILY REPORT: Generate Message ==========
    async function _generateDailyReport(dateStr) {
        // dateStr: 'YYYY-MM-DD'
        const { vnNow } = require('../utils/timezone');
        const targetDate = dateStr || vnNow().toISOString().split('T')[0];

        const rows = await db.all(`
            SELECT payment_method, COALESCE(SUM(amount), 0)::numeric AS total
            FROM payment_records
            WHERE payment_date = $1
              AND COALESCE(source, '') != 'cashflow_chi'
              AND payment_type != 'chi'
            GROUP BY payment_method
        `, [targetDate]);

        let totalCK = 0, totalTM = 0;
        for (const r of rows) {
            if (r.payment_method === 'CK') totalCK = Number(r.total);
            else if (r.payment_method === 'TM') totalTM = Number(r.total);
        }
        const totalAll = totalCK + totalTM;

        const parts = targetDate.split('-');
        const dateLabel = parts[2] + '/' + parts[1] + '/' + parts[0];

        const fmtVN = (n) => Number(n).toLocaleString('vi-VN') + 'đ';

        let msg = `<b>TỔNG SỐ TIỀN THU</b> ngày ${dateLabel}:\n`;
        msg += `<b>${fmtVN(totalCK)}</b> CK + <b>${fmtVN(totalTM)}</b> TM = <b>${fmtVN(totalAll)}</b>`;

        return { message: msg, totalCK, totalTM, totalAll, dateLabel };
    }

    // ========== DAILY REPORT: Manual Send ==========
    fastify.post('/api/payment-records/report-send', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        // Accept from body (test) or fallback to saved config
        const bodyGroupId = (request.body?.group_id || '').trim();
        let groupId = bodyGroupId;
        if (!groupId) {
            const grp = await db.get("SELECT value FROM app_config WHERE key = 'pr_report_tg_group'");
            groupId = grp?.value?.trim();
        }
        if (!groupId) return reply.code(400).send({ error: 'Chưa cài đặt Group ID Telegram' });

        const report = await _generateDailyReport();
        const { sendTelegramMessage } = require('../utils/telegram');
        const ok = await sendTelegramMessage(groupId, report.message);
        if (ok) return { success: true, message: report.message };
        return reply.code(400).send({ error: 'Gửi thất bại! Kiểm tra Bot Token và Group ID.' });
    });

    // Export helper for cron
    fastify.decorate('_prGenerateDailyReport', _generateDailyReport);

    // ========== PERMISSIONS: Get ==========
    fastify.get('/api/payment-records/permissions', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const row = await db.get("SELECT value FROM app_config WHERE key = 'pr_action_permissions'");
        const perms = row?.value ? JSON.parse(row.value) : DEFAULT_PR_PERMS;
        // Return user's allowed actions
        const userPerms = {};
        for (const [action, roles] of Object.entries(perms)) {
            if (Array.isArray(roles)) {
                userPerms[action] = roles.includes(user.role);
            }
        }
        return { permissions: perms, user_permissions: userPerms };
    });

    // ========== PERMISSIONS: Save (GĐ only) ==========
    fastify.put('/api/payment-records/permissions', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const { permissions } = request.body || {};
        if (!permissions) return reply.code(400).send({ error: 'Thiếu dữ liệu' });
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('pr_action_permissions', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [JSON.stringify(permissions)]
        );
        return { success: true };
    });

    // ========== SEARCH RECONCILE ORDERS: Tìm kiếm đơn đối soát ==========
    fastify.get('/api/payment-records/search-reconcile-orders', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const q = String(request.query.q || '').trim();
        const cod = Number(request.query.cod) || 0;

        let dhtOrders = [];
        let sampleOrders = [];

        // 1. Query dht_orders
        let dhtQuery = `
            SELECT DISTINCT ON (o.order_code)
                'dht_order' AS order_type,
                o.id,
                o.order_code,
                o.customer_name,
                o.customer_phone,
                o.order_date,
                (COALESCE(o.total_amount, 0)
                 - COALESCE(o.discount_amount, 0)
                 - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0))
                 - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END) AS remaining
            FROM dht_orders o
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                   OR order_tt_coc = o.order_code
            ) pr_dep ON true
        `;
        let dhtParams = [];
        if (q) {
            dhtQuery += ` WHERE (o.order_code ILIKE $1 OR o.customer_name ILIKE $1 OR o.customer_phone ILIKE $1)`;
            dhtParams.push(`%${q}%`);
        }
        
        dhtQuery = `SELECT * FROM (${dhtQuery}) sub WHERE remaining > 0 LIMIT 100`;
        dhtOrders = await db.all(dhtQuery, dhtParams);

        // 2. Query don_gui_ao_mau
        let sampleQuery = `
            SELECT 
                'ao_mau' AS order_type,
                d.id,
                d.sample_order_code AS order_code,
                d.customer_name,
                d.customer_phone,
                d.order_date,
                (COALESCE(d.total_amount, 0) - COALESCE(pr_dep.deposit_total, 0)) AS remaining
            FROM don_gui_ao_mau d
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE order_ao_mau = d.sample_order_code
            ) pr_dep ON true
            WHERE COALESCE(d.sample_order_code, '') != ''
        `;
        let sampleParams = [];
        if (q) {
            sampleQuery += ` AND (d.sample_order_code ILIKE $1 OR d.customer_name ILIKE $1 OR d.customer_phone ILIKE $1)`;
            sampleParams.push(`%${q}%`);
        }

        sampleQuery = `SELECT * FROM (${sampleQuery}) sub WHERE remaining > 0 LIMIT 100`;
        sampleOrders = await db.all(sampleQuery, sampleParams);

        // Combine
        let combined = [...dhtOrders, ...sampleOrders];

        // Sort
        if (cod > 0) {
            combined.sort((a, b) => {
                const diffA = Math.abs(Number(a.remaining) - cod);
                const diffB = Math.abs(Number(b.remaining) - cod);
                if (Math.abs(diffA - diffB) < 1) {
                    return new Date(b.order_date) - new Date(a.order_date);
                }
                return diffA - diffB;
            });
        } else {
            combined.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
        }

        return { orders: combined.slice(0, 50) };
    });

    // ========== CHANGE SOURCE: Đổi nguồn tiền ==========
    fastify.put('/api/payment-records/:id/source', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const isUserGD = user.role === 'giam_doc';
        const isUserTrinh = user.role === 'quan_ly_cap_cao' && user.username === 'trinh';
        const isUserKT = await isKeToan(user.id);
        const hasGeneralPerm = await _checkPrPerm(user.role, 'pr_change_source');

        if (!isUserGD && !isUserTrinh && !isUserKT && !hasGeneralPerm) {
            return reply.code(403).send({ error: 'Bạn không có quyền đổi nguồn tiền' });
        }

        const existing = await db.get('SELECT * FROM payment_records WHERE id = $1', [request.params.id]);
        if (!existing) return reply.code(404).send({ error: 'Không tìm thấy' });

        const isAlreadyClaimed = (existing.payment_type === 'dat_coc') || (existing.payment_type === 'tra_lai_coc') || (existing.total_order_codes && existing.total_order_codes.trim() !== '') || (existing.order_tt_coc && existing.order_tt_coc.trim() !== '');
        if (isAlreadyClaimed) {
            return reply.code(400).send({ error: 'Mã tiền đã nhận tiền/liên kết đơn hàng, không thể đổi nguồn tiền!' });
        }

        if (existing.money_source === 'nha_van_chuyen' && isUserKT) {
            return reply.code(403).send({ error: 'Kế toán không được phép đổi nguồn tiền của Nhà Vận Chuyển' });
        }

        const { money_source } = request.body || {};
        const validSources = ['khach_hang', 'nha_van_chuyen', 'khach_hang_sll'];
        if (!validSources.includes(money_source)) return reply.code(400).send({ error: 'Nguồn tiền không hợp lệ' });

        if (money_source === 'khach_hang_sll') {
            if (!isUserGD && !isUserTrinh && !isUserKT) {
                return reply.code(403).send({ error: 'Bạn không có quyền đổi nguồn tiền thành Khách Hàng SLL' });
            }
        } else if (money_source === 'nha_van_chuyen') {
            if (!isUserGD && !isUserTrinh) {
                return reply.code(403).send({ error: 'Bạn không có quyền đổi nguồn tiền thành Nhà Vận Chuyển' });
            }
        }

        await db.run('UPDATE payment_records SET money_source = $1, updated_at = NOW() WHERE id = $2', [money_source, request.params.id]);
        return { success: true };
    });

    // ========== UNPAID DHT ORDERS: Tìm đơn chưa thanh toán hết ==========
    fastify.get('/api/payment-records/unpaid-orders', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        try { jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const { q } = request.query;
        let searchWhere = '';
        const params = [];
        if (q && q.trim().length >= 2) {
            searchWhere = ` AND (o.order_code ILIKE $1 OR o.customer_name ILIKE $1 OR o.customer_phone ILIKE $1)`;
            params.push(`%${q.trim()}%`);
        }

        const orders = await db.all(`
            SELECT o.id, o.order_code, o.customer_name, o.customer_phone,
                   o.total_amount, o.discount_amount, o.order_date,
                   o.shipping_fee_payer, o.shipping_fee_method, o.shipping_fee,
                   u.full_name AS cskh_name,
                   GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) AS deposit_paid,
                   COALESCE(o.total_amount, 0)
                     - COALESCE(o.discount_amount, 0)
                     - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0))
                     - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END
                     AS remaining
            FROM dht_orders o
            LEFT JOIN users u ON o.cskh_user_id = u.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                   OR order_tt_coc = o.order_code
            ) pr_dep ON true
            WHERE COALESCE(o.total_amount, 0)
                    - COALESCE(o.discount_amount, 0)
                    - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0))
                    - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END
                    > 0
            ${searchWhere}
            ORDER BY o.order_date DESC, o.id DESC
            LIMIT 30
        `, params);

        return { orders };
    });

    // ========== APPSHEET SYNC CONFIG: Get ==========
    fastify.get('/api/payment-records/appsheet-config', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        try { jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const row = await db.get("SELECT value FROM app_config WHERE key = 'appsheet_sync_enabled'");
        return { enabled: row?.value === 'true' };
    });

    // ========== APPSHEET SYNC CONFIG: Toggle (GĐ only) ==========
    fastify.put('/api/payment-records/appsheet-config', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const { enabled } = request.body || {};
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('appsheet_sync_enabled', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [enabled ? 'true' : 'false']
        );
        return { success: true, enabled: !!enabled };
    });
};
