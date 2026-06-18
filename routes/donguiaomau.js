// ========== ĐƠN GỬI ÁO MẪU — Routes ==========
// Module quản lý đơn gửi áo mẫu cho bộ phận văn phòng
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow, vnDateStr } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== MIGRATION: Create table ==========
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS don_gui_ao_mau (
            id                  SERIAL PRIMARY KEY,
            order_date          DATE NOT NULL DEFAULT CURRENT_DATE,
            remaining_amount    NUMERIC DEFAULT 0,
            payer               TEXT,
            sample_order_code   TEXT,
            category            TEXT,
            customer_name       TEXT,
            product_name        TEXT,
            customer_phone      TEXT,
            shipping_method     TEXT,
            quantity            INTEGER DEFAULT 0,
            price               NUMERIC DEFAULT 0,
            total_amount        NUMERIC DEFAULT 0,
            deposit_code        TEXT,
            ship_date           DATE,
            order_status        TEXT DEFAULT 'cho_duyet',
            payment_method      TEXT,
            shipping_fee        NUMERIC DEFAULT 0,
            return_shipping_fee NUMERIC DEFAULT 0,
            return_payer        TEXT,
            return_payment_method TEXT,
            status_duyet        BOOLEAN DEFAULT false,
            status_gui_don      BOOLEAN DEFAULT false,
            status_hoan_hang    BOOLEAN DEFAULT false,
            status_kiem_tra     BOOLEAN DEFAULT false,
            created_by          INTEGER REFERENCES users(id),
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS address TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS province TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS linh_vuc TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS sample_image TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS shipping_priority TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS zalo_oa_sent BOOLEAN DEFAULT false`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS sale_note_for_accountant TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS ship_time TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id)`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS approval_date DATE`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS actual_carrier_id INTEGER`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS tracking_code TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS shipping_bill_link TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS shipped_by INTEGER`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS shipping_fee_payer TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS shipping_fee_method TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS shipping_cashflow_id INTEGER`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS shipping_payment_id INTEGER`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS chuan_proof_image TEXT`);

        // Return shipping columns
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_ship_date DATE`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_shipping_priority TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_shipping_method TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_sale_note TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_ship_time TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_chuan_proof_image TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS status_gui_don_hoan BOOLEAN DEFAULT false`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_actual_carrier_id INTEGER`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_tracking_code TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_shipping_bill_link TEXT`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_shipped_at TIMESTAMPTZ`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_shipped_by INTEGER`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_is_pending_update BOOLEAN DEFAULT false`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_shipping_cashflow_id INTEGER`);
        await db.exec(`ALTER TABLE don_gui_ao_mau ADD COLUMN IF NOT EXISTS hoan_hang_shipping_payment_id INTEGER`);

        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dgam_order_date ON don_gui_ao_mau(order_date)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dgam_status ON don_gui_ao_mau(order_status)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dgam_code ON don_gui_ao_mau(sample_order_code)`);

        await db.exec(`CREATE TABLE IF NOT EXISTS don_gui_ao_mau_logs (
            id                  SERIAL PRIMARY KEY,
            sample_order_id     INTEGER REFERENCES don_gui_ao_mau(id) ON DELETE CASCADE,
            action              TEXT,
            summary             TEXT,
            performed_by        INTEGER REFERENCES users(id),
            created_at          TIMESTAMPTZ DEFAULT NOW()
        )`);
    } catch(e) { console.error('[DGAM Migration]', e.message); }

    // ========== NEXT SAMPLE ORDER CODE ==========
    fastify.get('/api/don-gui-ao-mau/next-code', { preHandler: [authenticate] }, async (request, reply) => {
        const username = request.user.username.toUpperCase();
        const userRow = await db.get('SELECT order_code_prefix FROM users WHERE id = $1', [request.user.id]);
        const orderCodePrefix = userRow?.order_code_prefix ? userRow.order_code_prefix.toUpperCase() : null;
        
        const prefix = orderCodePrefix ? `${orderCodePrefix}-GUIMAU` : `${username}-GUIMAU`;
        const rows = await db.all(`
            SELECT sample_order_code 
            FROM don_gui_ao_mau 
            WHERE sample_order_code LIKE $1
        `, [`${prefix}%`]);

        let maxSeq = 0;
        for (const row of rows) {
            if (row.sample_order_code && row.sample_order_code.startsWith(prefix)) {
                const suffix = row.sample_order_code.substring(prefix.length);
                const seqNum = parseInt(suffix, 10);
                if (!isNaN(seqNum) && seqNum > maxSeq) {
                    maxSeq = seqNum;
                }
            }
        }

        const nextSeq = maxSeq + 1;
        const nextCode = `${prefix}${String(nextSeq).padStart(4, '0')}`;
        return { sample_order_code: nextCode };
    });

    // ========== DRAFT ORDERS LIST ==========
    fastify.get('/api/don-gui-ao-mau/drafts', { preHandler: [authenticate] }, async (request, reply) => {
        const drafts = await db.all(`
            SELECT d.id, d.sample_order_code, d.customer_name, d.customer_phone, d.deposit_code,
                   c.address, c.province, COALESCE(pr.amount, 0) AS deposit_amount
            FROM don_gui_ao_mau d
            LEFT JOIN customers c ON c.phone = d.customer_phone
            LEFT JOIN payment_records pr ON pr.payment_code = d.deposit_code
            WHERE d.order_status = 'draft'
            ORDER BY d.id DESC
        `);
        return { drafts };
    });

    // ========== TREE: Sidebar data (Year → Month) ==========
    fastify.get('/api/don-gui-ao-mau/tree', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`
            SELECT
                EXTRACT(YEAR FROM order_date)::int AS year,
                EXTRACT(MONTH FROM order_date)::int AS month,
                COUNT(*)::int AS order_count
            FROM don_gui_ao_mau
            WHERE order_status != 'draft'
            GROUP BY year, month
            ORDER BY year DESC, month DESC
        `);

        // Build tree: year → months
        const yearMap = {};
        for (const r of rows) {
            if (!yearMap[r.year]) yearMap[r.year] = { year: r.year, count: 0, months: [] };
            yearMap[r.year].months.push({ month: r.month, count: r.order_count });
            yearMap[r.year].count += r.order_count;
        }

        const tree = Object.values(yearMap).sort((a, b) => b.year - a.year);
        const grandCount = tree.reduce((s, y) => s + y.count, 0);

        return { tree, grandCount };
    });

    // ========== ORDERS: List with filters ==========
    fastify.get('/api/don-gui-ao-mau/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const { year, month } = request.query;
        const params = [];
        let idx = 1;
        let where = "WHERE d.order_status != 'draft'";

        if (year) { where += ` AND EXTRACT(YEAR FROM d.order_date) = $${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM d.order_date) = $${idx++}`; params.push(Number(month)); }

        const orders = await db.all(`
            SELECT
                d.*,
                COALESCE(pr_dep.deposit_total, 0) AS deposit_amount,
                GREATEST(0, COALESCE(d.total_amount, 0) - COALESCE(pr_all.paid_total, 0) - CASE WHEN d.shipping_fee_payer = 'hv' AND d.shipping_fee_method = 'ck' AND NOT EXISTS (SELECT 1 FROM payment_records pr WHERE pr.order_ao_mau = d.sample_order_code AND pr.money_source = 'nha_van_chuyen') THEN COALESCE(d.shipping_fee, 0) ELSE 0 END) AS remaining_amount,
                u.full_name AS created_by_name,
                uu.full_name AS updated_by_name,
                o_codes.closed_order_codes
            FROM don_gui_ao_mau d
            LEFT JOIN users u ON d.created_by = u.id
            LEFT JOIN users uu ON d.updated_by = uu.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE order_ao_mau = d.sample_order_code
                  AND payment_type = 'dat_coc'
            ) pr_dep ON true
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS paid_total
                FROM payment_records
                WHERE order_ao_mau = d.sample_order_code
            ) pr_all ON true
            LEFT JOIN LATERAL (
                SELECT STRING_AGG(DISTINCT o.order_code, '<br>') AS closed_order_codes
                FROM dht_orders o
                LEFT JOIN dht_categories c ON o.category_id = c.id
                WHERE o.customer_phone = d.customer_phone
                  AND o.customer_phone IS NOT NULL AND o.customer_phone != ''
                  AND o.created_by = d.created_by
                  AND (c.name IS NULL OR LOWER(c.name) NOT IN ('đơn hủy', 'đơn huỷ', 'hủy', 'huỷ'))
            ) o_codes ON true
            ${where}
            ORDER BY d.order_date DESC, d.id DESC
        `, params);

        return { orders };
    });

    fastify.patch('/api/don-gui-ao-mau/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const { field, value } = request.body;

        const allowedFields = ['status_duyet', 'status_gui_don', 'status_hoan_hang', 'status_kiem_tra'];
        if (!allowedFields.includes(field)) {
            return reply.code(400).send({ error: 'Trường không hợp lệ' });
        }

        const now = vnNow();
        const todayStr = vnDateStr(now);

        if (field === 'status_duyet') {
            const isGiamDoc = request.user.role === 'giam_doc';
            const isLeCongThuc = request.user.username === 'quanlyxuong' || request.user.full_name === 'Lê Công Thực';
            if (!isGiamDoc && !isLeCongThuc) {
                return reply.code(403).send({ error: '🔒 Chỉ Giám đốc và Quản lý xưởng Lê Công Thực mới được duyệt gửi!' });
            }

            const status = value ? 'dang_gui_hang' : 'cho_duyet';
            await db.run(
                `UPDATE don_gui_ao_mau 
                 SET status_duyet = $1, 
                     order_status = $2, 
                     approved_at = $3, 
                     approval_date = $4, 
                     updated_at = NOW(), 
                     updated_by = $5 
                 WHERE id = $6`,
                [value, status, value ? now.toISOString() : null, value ? todayStr : null, request.user.id, id]
            );
        } else if (field === 'status_gui_don') {
            const status = value ? 'da_gui' : 'dang_gui_hang';
            await db.run(
                `UPDATE don_gui_ao_mau 
                 SET status_gui_don = $1, 
                     order_status = $2, 
                     updated_at = NOW(), 
                     updated_by = $3 
                 WHERE id = $4`,
                [value, status, request.user.id, id]
            );
        } else if (field === 'status_kiem_tra') {
            const u = await db.get('SELECT full_name FROM users WHERE id=$1', [request.user.id]);
            const isLeVietTrinh = u && u.full_name && (u.full_name.includes('Lê Việt Trinh') || u.full_name.includes('Le Viet Trinh'));
            const isGiamDoc = request.user.role === 'giam_doc';
            if (!isLeVietTrinh && !isGiamDoc) {
                return reply.code(403).send({ error: '🔒 Chỉ tài khoản Lê Việt Trinh và Giám đốc mới có quyền kiểm tra đơn mẫu!' });
            }
            await db.run(`UPDATE don_gui_ao_mau SET status_kiem_tra = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`, [value, request.user.id, id]);
        } else {
            await db.run(`UPDATE don_gui_ao_mau SET ${field} = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`, [value, request.user.id, id]);
        }

        const actionLabels = {
            status_duyet: value ? 'duyệt đơn' : 'bỏ duyệt đơn',
            status_gui_don: value ? 'gửi đơn' : 'bỏ gửi đơn',
            status_hoan_hang: value ? 'hoàn hàng' : 'bỏ hoàn hàng',
            status_kiem_tra: value ? 'kiểm tra' : 'bỏ kiểm tra'
        };
        const actionLabel = actionLabels[field] || field;
        const summary = `Đã thay đổi trạng thái: ${actionLabel.toUpperCase()}`;
        await db.run(
            `INSERT INTO don_gui_ao_mau_logs (sample_order_id, action, summary, performed_by) VALUES ($1, $2, $3, $4)`,
            [id, 'status', summary, request.user.id]
        );

        return { success: true };
    });

    // ========== ORDERS: Detail ==========
    fastify.get('/api/don-gui-ao-mau/:id/detail', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);

        const order = await db.get(`
            SELECT
                d.*,
                u.full_name AS created_by_name,
                uu.full_name AS updated_by_name,
                u_shipped.full_name AS shipped_by_name,
                u_shipped_hoan.full_name AS hoan_shipped_by_name,
                cr.name AS actual_carrier_name,
                cr_hoan.name AS hoan_actual_carrier_name,
                cr.tracking_url_template AS actual_carrier_tracking_url,
                cf_ship.cashflow_code AS shipping_cashflow_code,
                COALESCE(pr_dep.deposit_total, 0) AS deposit_amount,
                GREATEST(0, COALESCE(d.total_amount, 0) - COALESCE(pr_all.paid_total, 0) - CASE WHEN d.shipping_fee_payer = 'hv' AND d.shipping_fee_method = 'ck' AND NOT EXISTS (SELECT 1 FROM payment_records pr WHERE pr.order_ao_mau = d.sample_order_code AND pr.money_source = 'nha_van_chuyen') THEN COALESCE(d.shipping_fee, 0) ELSE 0 END) AS remaining_amount
            FROM don_gui_ao_mau d
            LEFT JOIN users u ON d.created_by = u.id
            LEFT JOIN users uu ON d.updated_by = uu.id
            LEFT JOIN users u_shipped ON d.shipped_by = u_shipped.id
            LEFT JOIN users u_shipped_hoan ON d.hoan_hang_shipped_by = u_shipped_hoan.id
            LEFT JOIN dht_carriers cr ON d.actual_carrier_id = cr.id
            LEFT JOIN dht_carriers cr_hoan ON d.hoan_hang_actual_carrier_id = cr_hoan.id
            LEFT JOIN cashflow_records cf_ship ON d.shipping_cashflow_id = cf_ship.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE order_ao_mau = d.sample_order_code
                  AND payment_type = 'dat_coc'
            ) pr_dep ON true
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS paid_total
                FROM payment_records
                WHERE order_ao_mau = d.sample_order_code
            ) pr_all ON true
            WHERE d.id = $1
        `, [orderId]);

        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });

        const payments = await db.all(`
            SELECT id, payment_code, amount, payment_date, payment_method, payment_type, bank_name,
                   customer_name, customer_phone, transfer_note, created_at, created_by, money_source
            FROM payment_records
            WHERE order_ao_mau = $1
            ORDER BY payment_date DESC, id DESC
        `, [order.sample_order_code]);

        const logs = await db.all(`
            SELECT l.*, u.full_name AS performer_name
            FROM don_gui_ao_mau_logs l
            LEFT JOIN users u ON l.performed_by = u.id
            WHERE l.sample_order_id = $1
            ORDER BY l.created_at DESC
        `, [orderId]);

        const closedOrders = await db.all(`
            SELECT o.order_code, o.total_quantity, o.total_amount, o.order_date
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            WHERE o.customer_phone = $1
              AND o.customer_phone IS NOT NULL AND o.customer_phone != ''
              AND o.created_by = $2
              AND (c.name IS NULL OR LOWER(c.name) NOT IN ('đơn hủy', 'đơn huỷ', 'hủy', 'huỷ'))
            ORDER BY o.order_date DESC, o.id DESC
        `, [order.customer_phone, order.created_by]);

        return { order, payments, logs, closedOrders };
    });

    // ========== CREATE ORDER ==========
    fastify.post('/api/don-gui-ao-mau', { preHandler: [authenticate] }, async (request, reply) => {
        const b = request.body;

        // Sync to customers table
        if (b.customer_phone && (b.address || b.province)) {
            try {
                if (b.address && b.province) {
                    await db.run(`UPDATE customers SET address = $1, province = $2, updated_at = NOW() WHERE phone = $3`, [b.address, b.province, b.customer_phone]);
                } else if (b.address) {
                    await db.run(`UPDATE customers SET address = $1, updated_at = NOW() WHERE phone = $2`, [b.address, b.customer_phone]);
                } else if (b.province) {
                    await db.run(`UPDATE customers SET province = $1, updated_at = NOW() WHERE phone = $2`, [b.province, b.customer_phone]);
                }
            } catch (err) {
                console.error('[Sync Customer Address Error]', err.message);
            }
        }

        // Check if there is an existing draft with the same sample_order_code
        if (b.sample_order_code) {
            const existingDraft = await db.get(
                `SELECT id FROM don_gui_ao_mau WHERE sample_order_code = $1 AND order_status = 'draft'`,
                [b.sample_order_code]
            );

            if (existingDraft) {
                await db.run(`
                    UPDATE don_gui_ao_mau SET
                        order_date = $1,
                        remaining_amount = $2,
                        payer = $3,
                        category = $4,
                        customer_name = $5,
                        product_name = $6,
                        customer_phone = $7,
                        shipping_method = $8,
                        quantity = $9,
                        price = $10,
                        total_amount = $11,
                        deposit_code = $12,
                        ship_date = $13,
                        order_status = $14,
                        payment_method = $15,
                        shipping_fee = $16,
                        return_shipping_fee = $17,
                        return_payer = $18,
                        return_payment_method = $19,
                        address = $20,
                        province = $21,
                        linh_vuc = $22,
                        sample_image = $23,
                        shipping_priority = $24,
                        zalo_oa_sent = $25,
                        sale_note_for_accountant = $26,
                        deposit_amount = $27,
                        ship_time = $28,
                        updated_by = $29,
                        chuan_proof_image = $30,
                        updated_at = NOW()
                    WHERE id = $31
                `, [
                    b.order_date || new Date().toISOString().slice(0, 10),
                    b.remaining_amount || 0, b.payer || null, b.category || null,
                    b.customer_name || null, b.product_name || null, b.customer_phone || null, b.shipping_method || null,
                    b.quantity || 0, b.price || 0, b.total_amount || 0, b.deposit_code || null, b.ship_date || null,
                    b.order_status || 'cho_duyet', b.payment_method || null, b.shipping_fee || 0,
                    b.return_shipping_fee || 0, b.return_payer || null, b.return_payment_method || null,
                    b.address || null, b.province || null,
                    b.linh_vuc || null, b.sample_image || null, b.shipping_priority || null,
                    b.zalo_oa_sent || false, b.sale_note_for_accountant || null, b.deposit_amount || 0,
                    b.ship_time || null,
                    request.user.id,
                    b.chuan_proof_image || null,
                    existingDraft.id
                ]);
                const summary = b.order_status === 'draft' ? 'Đã cập nhật nháp đơn mẫu' : 'Đã xác nhận tạo đơn mẫu';
                await db.run(
                    `INSERT INTO don_gui_ao_mau_logs (sample_order_id, action, summary, performed_by) VALUES ($1, $2, $3, $4)`,
                    [existingDraft.id, 'update', summary, request.user.id]
                );
                return { success: true, id: existingDraft.id };
            }
        }

        const result = await db.get(`
            INSERT INTO don_gui_ao_mau (
                order_date, remaining_amount, payer, sample_order_code, category,
                customer_name, product_name, customer_phone, shipping_method,
                quantity, price, total_amount, deposit_code, ship_date,
                order_status, payment_method, shipping_fee,
                return_shipping_fee, return_payer, return_payment_method,
                created_by, address, province,
                linh_vuc, sample_image, shipping_priority,
                zalo_oa_sent, sale_note_for_accountant, deposit_amount, ship_time,
                updated_by, chuan_proof_image
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9,
                $10, $11, $12, $13, $14,
                $15, $16, $17,
                $18, $19, $20,
                $21, $22, $23,
                $24, $25, $26,
                $27, $28, $29, $30,
                $31, $32
            ) RETURNING id
        `, [
            b.order_date || new Date().toISOString().slice(0, 10),
            b.remaining_amount || 0, b.payer || null, b.sample_order_code || null, b.category || null,
            b.customer_name || null, b.product_name || null, b.customer_phone || null, b.shipping_method || null,
            b.quantity || 0, b.price || 0, b.total_amount || 0, b.deposit_code || null, b.ship_date || null,
            b.order_status || 'cho_duyet', b.payment_method || null, b.shipping_fee || 0,
            b.return_shipping_fee || 0, b.return_payer || null, b.return_payment_method || null,
            request.user.id, b.address || null, b.province || null,
            b.linh_vuc || null, b.sample_image || null, b.shipping_priority || null,
            b.zalo_oa_sent || false, b.sale_note_for_accountant || null, b.deposit_amount || 0, b.ship_time || null,
            request.user.id,
            b.chuan_proof_image || null
        ]);

        const summary = b.order_status === 'draft' ? 'Đã tạo nháp đơn mẫu' : 'Đã tạo đơn mẫu mới';
        await db.run(
            `INSERT INTO don_gui_ao_mau_logs (sample_order_id, action, summary, performed_by) VALUES ($1, $2, $3, $4)`,
            [result.id, 'create', summary, request.user.id]
        );

        return { success: true, id: result.id };
    });

    fastify.post('/api/don-gui-ao-mau/:id/hoan-hang', { preHandler: [authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const b = request.body || {};

        if (!b.hoan_hang_ship_date) return reply.code(400).send({ error: 'Vui lòng chọn Ngày gửi hàng' });
        if (!b.hoan_hang_shipping_priority) return reply.code(400).send({ error: 'Vui lòng chọn Tiêu chuẩn gửi' });
        if (!b.hoan_hang_shipping_method) return reply.code(400).send({ error: 'Vui lòng chọn Nhà vận chuyển' });
        if (!b.hoan_hang_sale_note || !b.hoan_hang_sale_note.trim()) return reply.code(400).send({ error: 'Vui lòng nhập nội dung sale dặn kế toán' });

        if (b.hoan_hang_shipping_priority === 'CHUẨN') {
            if (!b.hoan_hang_ship_time) return reply.code(400).send({ error: 'Vui lòng chọn Giờ hàng ra' });
            if (!b.hoan_hang_chuan_proof_image) return reply.code(400).send({ error: 'Vui lòng tải lên hoặc dán Ảnh chứng minh chuẩn' });
        }

        await db.run(
            `UPDATE don_gui_ao_mau 
             SET status_hoan_hang = true,
                 status_gui_don_hoan = false,
                 hoan_hang_ship_date = $1,
                 hoan_hang_shipping_priority = $2,
                 hoan_hang_shipping_method = $3,
                 hoan_hang_sale_note = $4,
                 hoan_hang_ship_time = $5,
                 hoan_hang_chuan_proof_image = $6,
                 updated_at = NOW(),
                 updated_by = $7
             WHERE id = $8`,
            [
                b.hoan_hang_ship_date,
                b.hoan_hang_shipping_priority,
                b.hoan_hang_shipping_method,
                b.hoan_hang_sale_note.trim(),
                b.hoan_hang_shipping_priority === 'CHUẨN' ? b.hoan_hang_ship_time : null,
                b.hoan_hang_shipping_priority === 'CHUẨN' ? b.hoan_hang_chuan_proof_image : null,
                request.user.id,
                id
            ]
        );

        await db.run(
            `INSERT INTO don_gui_ao_mau_logs (sample_order_id, action, summary, performed_by) VALUES ($1, $2, $3, $4)`,
            [id, 'hoan_hang', `Báo hoàn hàng. Tiêu chuẩn: ${b.hoan_hang_shipping_priority}, Ngày gửi: ${b.hoan_hang_ship_date}`, request.user.id]
        );

        return { success: true };
    });
};
