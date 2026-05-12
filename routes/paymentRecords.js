// ========== PAYMENT RECORDS ROUTES — Sổ Ghi Nhận Tiền ==========
const db = require('../db/pool');
const { vnNow, vnFormat } = require('../utils/timezone');

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
        let where = 'WHERE 1=1';
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
            ORDER BY pr.payment_date DESC, pr.daily_seq DESC
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
            `SELECT COALESCE(MAX(daily_seq), 0) + 1 AS next_seq
             FROM payment_records
             WHERE payment_method = $1 AND payment_date = $2`,
            [method, date]
        );

        // Build code preview
        const d = new Date(date);
        const dd = d.getDate();
        const mm = d.getMonth() + 1;
        const yy = d.getFullYear().toString().slice(-2);
        const code = `${method}${row.next_seq}-${dd}-${mm}-Y${yy}`;

        return { next_seq: row.next_seq, code };
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

        // Get next STT (atomic with INSERT to prevent race condition)
        const seqRow = await db.get(
            `SELECT COALESCE(MAX(daily_seq), 0) + 1 AS next_seq
             FROM payment_records
             WHERE payment_method = $1 AND payment_date = $2`,
            [b.payment_method, b.payment_date]
        );
        const seq = seqRow.next_seq;

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
                b.amount, b.payment_type || 'thanh_toan',
                b.order_tt_coc || null, b.order_ao_mau || null,
                b.transfer_note || null, b.money_source || 'khach_hang', b.bank_name || null,
                b.total_order_codes || null, b.total_cod || 0, b.shipping_fee || 0,
                'manual', b.payment_date, user.id
            ]);

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
            WHERE id = $14
        `, [
            b.customer_name, b.customer_phone, b.cskh_user_id || null,
            b.amount, b.payment_type,
            b.order_tt_coc || null, b.order_ao_mau || null,
            b.transfer_note || null, b.money_source, b.bank_name || null,
            b.total_order_codes || null, b.total_cod, b.shipping_fee,
            id
        ]);

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
                handover_by = CASE WHEN $1 = 'thu_quy_nhan' THEN $2 ELSE NULL END,
                updated_at = NOW()
            WHERE id = $3
        `, [newStatus, user.id, id]);

        return { success: true };
    });

    // ========== DELETE: Xóa record (chỉ GĐ) ==========
    fastify.delete('/api/payment-records/:id', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }

        if (user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được xóa' });
        }

        await db.run('DELETE FROM payment_records WHERE id = $1', [request.params.id]);
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
};
