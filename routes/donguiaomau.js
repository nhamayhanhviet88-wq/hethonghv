// ========== ĐƠN GỬI ÁO MẪU — Routes ==========
// Module quản lý đơn gửi áo mẫu cho bộ phận văn phòng
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

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
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dgam_order_date ON don_gui_ao_mau(order_date)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dgam_status ON don_gui_ao_mau(order_status)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dgam_code ON don_gui_ao_mau(sample_order_code)`);
    } catch(e) { console.error('[DGAM Migration]', e.message); }

    // ========== NEXT SAMPLE ORDER CODE ==========
    fastify.get('/api/don-gui-ao-mau/next-code', { preHandler: [authenticate] }, async (request, reply) => {
        const username = request.user.username.toUpperCase();
        const prefix = `${username}-MAU`;
        const rows = await db.all(`
            SELECT sample_order_code 
            FROM don_gui_ao_mau 
            WHERE sample_order_code LIKE $1
        `, [`${prefix}%`]);

        let maxSeq = 0;
        for (const row of rows) {
            if (row.sample_order_code) {
                const parts = row.sample_order_code.split('-MAU');
                if (parts.length === 2) {
                    const seqNum = parseInt(parts[1], 10);
                    if (!isNaN(seqNum) && seqNum > maxSeq) {
                        maxSeq = seqNum;
                    }
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
                (COALESCE(d.total_amount, 0) - COALESCE(pr_dep.deposit_total, 0)) AS remaining_amount,
                u.full_name AS created_by_name
            FROM don_gui_ao_mau d
            LEFT JOIN users u ON d.created_by = u.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE order_ao_mau = d.sample_order_code
            ) pr_dep ON true
            ${where}
            ORDER BY d.order_date DESC, d.id DESC
        `, params);

        return { orders };
    });

    // ========== UPDATE STATUS ICONS ==========
    fastify.patch('/api/don-gui-ao-mau/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const { field, value } = request.body;

        const allowedFields = ['status_duyet', 'status_gui_don', 'status_hoan_hang', 'status_kiem_tra'];
        if (!allowedFields.includes(field)) {
            return reply.code(400).send({ error: 'Trường không hợp lệ' });
        }

        await db.run(`UPDATE don_gui_ao_mau SET ${field} = $1, updated_at = NOW() WHERE id = $2`, [value, id]);
        return { success: true };
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
                        updated_at = NOW()
                    WHERE id = $28
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
                    existingDraft.id
                ]);
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
                zalo_oa_sent, sale_note_for_accountant, deposit_amount
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9,
                $10, $11, $12, $13, $14,
                $15, $16, $17,
                $18, $19, $20,
                $21, $22, $23,
                $24, $25, $26,
                $27, $28, $29
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
            b.zalo_oa_sent || false, b.sale_note_for_accountant || null, b.deposit_amount || 0
        ]);

        return { success: true, id: result.id };
    });
};
