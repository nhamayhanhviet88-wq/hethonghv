// ========== PAYMENT RECORDS ROUTES — Sổ Ghi Nhận Tiền ==========
const db = require('../db/pool');
const { vnNow, vnFormat } = require('../utils/timezone');
const { encrypt, decrypt, restartCron, checkEmails } = require('../services/emailChecker');

// ========== DEFAULT PERMISSIONS ==========
const DEFAULT_PR_PERMS = {
    pr_change_source: ['giam_doc', 'quan_ly_cap_cao'],
    pr_delete: ['giam_doc'],
    pr_edit: ['giam_doc', 'quan_ly_cap_cao'],
    pr_update_customer: ['giam_doc', 'quan_ly_cap_cao']
};
async function _checkPrPerm(userRole, action) {
    try {
        const row = await db.get("SELECT value FROM app_config WHERE key = 'pr_action_permissions'");
        const perms = row?.value ? JSON.parse(row.value) : DEFAULT_PR_PERMS;
        return (perms[action] || []).includes(userRole);
    } catch { return (DEFAULT_PR_PERMS[action] || []).includes(userRole); }
}

module.exports = async function(fastify) {

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

    // ========== LIST: Lấy records theo filter ==========
    fastify.get('/api/payment-records', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        const { year, month, day } = request.query;
        let where = "WHERE COALESCE(pr.source, '') != 'cashflow_chi'";
        const params = [];
        let paramIdx = 1;

        if (year) { where += ` AND EXTRACT(YEAR FROM pr.payment_date) = $${paramIdx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM pr.payment_date) = $${paramIdx++}`; params.push(Number(month)); }
        if (day) { where += ` AND EXTRACT(DAY FROM pr.payment_date) = $${paramIdx++}`; params.push(Number(day)); }

        const rows = await db.all(`
            SELECT pr.*,
                   u_cskh.full_name AS cskh_name,
                   u_created.full_name AS created_by_name,
                   u_handover.full_name AS handover_by_name
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
            const result = await db.get(`
                INSERT INTO payment_records (
                    payment_code, payment_method, daily_seq,
                    customer_name, customer_phone, cskh_user_id,
                    amount, payment_type,
                    order_tt_coc, order_ao_mau,
                    transfer_note, money_source, bank_name,
                    total_order_codes, total_cod, shipping_fee,
                    source, payment_date, created_by
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
                RETURNING id, payment_code
            `, [
                code, b.payment_method, seq,
                b.customer_name || null, b.customer_phone || null, b.cskh_user_id || null,
                b.amount, b.payment_type || 'pending',
                b.order_tt_coc || null, b.order_ao_mau || null,
                b.transfer_note || null, b.money_source || 'khach_hang', b.bank_name || null,
                b.total_order_codes || null, b.total_cod || 0, b.shipping_fee || 0,
                'manual', b.payment_date, user.id
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

        // Auto handover logic: CK+thanh_toan→chua_bangiao, CK+dat_coc→thu_quy_nhan, TM→always chua_bangiao
        const record = await db.get('SELECT payment_method FROM payment_records WHERE id = $1', [id]);
        let handoverUpdate = '';
        if (record) {
            const method = record.payment_method;
            const newType = b.payment_type;
            if (method === 'TM') {
                handoverUpdate = ", handover_status = 'chua_bangiao'";
            } else if (method === 'CK' && newType === 'thanh_toan') {
                handoverUpdate = ", handover_status = 'chua_bangiao'";
            } else if (method === 'CK' && newType === 'dat_coc') {
                handoverUpdate = ", handover_status = 'thu_quy_nhan'";
            }
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
            b.transfer_note || null, b.money_source, b.bank_name || null,
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

        return { success: true };
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

        await db.run(`
            UPDATE payment_records SET
                handover_status = $1,
                handover_at = CASE WHEN $1 = 'thu_quy_nhan' THEN NOW() ELSE NULL END,
                handover_by = CASE WHEN $1 = 'thu_quy_nhan' THEN $2::int ELSE NULL END,
                updated_at = NOW()
            WHERE id = $3
        `, [newStatus, user.id, id]);

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
            userPerms[action] = roles.includes(user.role);
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

    // ========== CHANGE SOURCE: Đổi nguồn tiền ==========
    fastify.put('/api/payment-records/:id/source', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        if (!(await _checkPrPerm(user.role, 'pr_change_source'))) {
            return reply.code(403).send({ error: 'Bạn không có quyền đổi nguồn tiền' });
        }

        const { money_source } = request.body || {};
        const validSources = ['khach_hang', 'nha_van_chuyen', 'khach_hang_sll'];
        if (!validSources.includes(money_source)) return reply.code(400).send({ error: 'Nguồn tiền không hợp lệ' });

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
                   o.total_amount, o.order_date,
                   u.full_name AS cskh_name,
                   GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) AS deposit_paid,
                   COALESCE(o.total_amount, 0) - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) AS remaining
            FROM dht_orders o
            LEFT JOIN users u ON o.cskh_user_id = u.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                   OR order_tt_coc = o.order_code
            ) pr_dep ON true
            WHERE COALESCE(o.total_amount, 0) - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) > 0
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
