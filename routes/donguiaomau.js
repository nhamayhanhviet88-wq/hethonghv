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
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dgam_order_date ON don_gui_ao_mau(order_date)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dgam_status ON don_gui_ao_mau(order_status)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_dgam_code ON don_gui_ao_mau(sample_order_code)`);
    } catch(e) { console.error('[DGAM Migration]', e.message); }

    // ========== TREE: Sidebar data (Year → Month) ==========
    fastify.get('/api/don-gui-ao-mau/tree', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`
            SELECT
                EXTRACT(YEAR FROM order_date)::int AS year,
                EXTRACT(MONTH FROM order_date)::int AS month,
                COUNT(*)::int AS order_count
            FROM don_gui_ao_mau
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
        let where = 'WHERE 1=1';

        if (year) { where += ` AND EXTRACT(YEAR FROM d.order_date) = $${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM d.order_date) = $${idx++}`; params.push(Number(month)); }

        const orders = await db.all(`
            SELECT
                d.*,
                u.full_name AS created_by_name
            FROM don_gui_ao_mau d
            LEFT JOIN users u ON d.created_by = u.id
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
        const result = await db.get(`
            INSERT INTO don_gui_ao_mau (
                order_date, remaining_amount, payer, sample_order_code, category,
                customer_name, product_name, customer_phone, shipping_method,
                quantity, price, total_amount, deposit_code, ship_date,
                order_status, payment_method, shipping_fee,
                return_shipping_fee, return_payer, return_payment_method,
                created_by
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9,
                $10, $11, $12, $13, $14,
                $15, $16, $17,
                $18, $19, $20,
                $21
            ) RETURNING id
        `, [
            b.order_date || new Date().toISOString().slice(0, 10),
            b.remaining_amount || 0, b.payer || null, b.sample_order_code || null, b.category || null,
            b.customer_name || null, b.product_name || null, b.customer_phone || null, b.shipping_method || null,
            b.quantity || 0, b.price || 0, b.total_amount || 0, b.deposit_code || null, b.ship_date || null,
            b.order_status || 'cho_duyet', b.payment_method || null, b.shipping_fee || 0,
            b.return_shipping_fee || 0, b.return_payer || null, b.return_payment_method || null,
            request.user.id
        ]);

        return { success: true, id: result.id };
    });
};
