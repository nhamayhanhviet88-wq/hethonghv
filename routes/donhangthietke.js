// ========== ĐƠN HÀNG THIẾT KẾ — Routes ==========
// READ-ONLY module: tracks design orders per designer
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function(fastify) {

    // ========== TREE: Sidebar data (Year → Month → Designer) ==========
    fastify.get('/api/dht-design/tree', { preHandler: [authenticate] }, async (request, reply) => {
        // ★ VISIBILITY RULES:
        // GĐ, QLCC → see ALL designers + "Thiết Kế Cũ"
        // NV Thiết Kế → only their own orders (designer_user_id = their id)
        // Others with permission → same as NV Thiết Kế (their own only)
        const FULL_VIEW_ROLES = ['giam_doc', 'quan_ly_cap_cao'];
        const isFullView = FULL_VIEW_ROLES.includes(request.user.role);

        let whereClause = `WHERE o.designer_user_id IS NOT NULL`;
        const params = [];

        if (!isFullView) {
            // Non-admin: only see orders assigned to them as designer
            whereClause += ` AND o.designer_user_id = $1 AND o.designer_type = 'staff'`;
            params.push(request.user.id);
        }

        // Aggregate: year → month → designer
        const rows = await db.all(`
            SELECT
                EXTRACT(YEAR FROM o.order_date)::int AS year,
                EXTRACT(MONTH FROM o.order_date)::int AS month,
                CASE
                    WHEN o.designer_type = 'old_design' THEN 0
                    ELSE o.designer_user_id
                END AS designer_id,
                CASE
                    WHEN o.designer_type = 'old_design' THEN '🎨 Thiết Kế Cũ'
                    ELSE COALESCE(u.full_name, 'Không rõ')
                END AS designer_name,
                COUNT(*)::int AS order_count
            FROM dht_orders o
            LEFT JOIN users u ON o.designer_user_id = u.id
            ${whereClause}
            GROUP BY year, month, designer_id, designer_name
            ORDER BY year DESC, month DESC, designer_name ASC
        `, params);

        // Build tree: year → months → designers
        const yearMap = {};
        for (const r of rows) {
            const y = r.year;
            if (!yearMap[y]) yearMap[y] = { year: y, count: 0, months: {} };

            const m = r.month;
            if (!yearMap[y].months[m]) yearMap[y].months[m] = { month: m, count: 0, designers: [] };

            yearMap[y].months[m].designers.push({
                designer_id: r.designer_id,
                designer_name: r.designer_name,
                count: r.order_count
            });
            yearMap[y].months[m].count += r.order_count;
            yearMap[y].count += r.order_count;
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
                        designers: m.designers.sort((a, b) => {
                            // "Thiết Kế Cũ" (id=0) always last
                            if (a.designer_id === 0) return 1;
                            if (b.designer_id === 0) return -1;
                            return a.designer_name.localeCompare(b.designer_name, 'vi');
                        })
                    }))
            }));

        const grandCount = tree.reduce((s, y) => s + y.count, 0);

        return { tree, grandCount };
    });

    // ========== ORDERS: List with filters ==========
    fastify.get('/api/dht-design/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const { year, month, designer_id } = request.query;

        const FULL_VIEW_ROLES = ['giam_doc', 'quan_ly_cap_cao'];
        const isFullView = FULL_VIEW_ROLES.includes(request.user.role);

        let where = `WHERE o.designer_user_id IS NOT NULL`;
        const params = [];
        let idx = 1;

        // ★ Visibility filter
        if (!isFullView) {
            where += ` AND o.designer_user_id = $${idx++} AND o.designer_type = 'staff'`;
            params.push(request.user.id);
        }

        // Date filters
        if (year) { where += ` AND EXTRACT(YEAR FROM o.order_date) = $${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM o.order_date) = $${idx++}`; params.push(Number(month)); }

        // Designer filter
        if (designer_id !== undefined && designer_id !== '') {
            const did = Number(designer_id);
            if (did === 0) {
                // "Thiết Kế Cũ"
                where += ` AND o.designer_type = 'old_design'`;
            } else {
                where += ` AND o.designer_user_id = $${idx++} AND o.designer_type = 'staff'`;
                params.push(did);
            }
        }

        const orders = await db.all(`
            SELECT
                o.id,
                o.order_date,
                o.order_code,
                o.customer_name,
                o.customer_phone,
                o.designer_type,
                o.designer_user_id,
                c.name AS category_name,
                u_cskh.full_name AS cskh_name,
                u_designer.full_name AS designer_name
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_designer ON o.designer_user_id = u_designer.id
            ${where}
            ORDER BY o.order_date DESC, o.id DESC
        `, params);

        return { orders };
    });
};
