const { getProductionCutoff, getTestAccountIds, buildProductionFilter } = require('../utils/productionMode');
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function (fastify, opts) {

    /**
     * GET /api/reports/top-customers
     * Báo cáo thống kê Top Khách Hàng VIP (doanh số, số lượng đơn)
     * Filters:
     *   - period_type: 'month', 'quarter', 'year', 'all'
     *   - year: YYYY (e.g. 2026)
     *   - month: 1-12
     *   - quarter: 1-4
     *   - field: 'all', 'tem_pet', 'dong_phuc'
     *   - sort_by: 'revenue' | 'order_count'
     *   - search: string (tên / SĐT)
     *   - limit: number (default 100)
     */
    fastify.get('/api/reports/top-customers', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const {
                period_type = 'month',
                year = new Date().getFullYear(),
                month = new Date().getMonth() + 1,
                quarter = Math.ceil((new Date().getMonth() + 1) / 3),
                field = 'all',
                sort_by = 'revenue',
                search = '',
                limit = 100
            } = request.query;

            const yr = parseInt(year) || new Date().getFullYear();
            const mo = parseInt(month) || (new Date().getMonth() + 1);
            const qt = parseInt(quarter) || 1;
            const lim = Math.min(parseInt(limit) || 100, 500);

            // 1. Determine Date Range
            let startDate = null;
            let endDate = null;
            let periodLabel = 'Tất Cả Thời Gian';

            if (period_type === 'month') {
                startDate = `${yr}-${String(mo).padStart(2, '0')}-01 00:00:00`;
                const nextMo = mo === 12 ? 1 : mo + 1;
                const nextYr = mo === 12 ? yr + 1 : yr;
                endDate = `${nextYr}-${String(nextMo).padStart(2, '0')}-01 00:00:00`;
                periodLabel = `Tháng ${mo}/${yr}`;
            } else if (period_type === 'quarter') {
                const qStartMo = (qt - 1) * 3 + 1;
                const qEndMo = qt * 3 + 1;
                startDate = `${yr}-${String(qStartMo).padStart(2, '0')}-01 00:00:00`;
                if (qEndMo > 12) {
                    endDate = `${yr + 1}-01-01 00:00:00`;
                } else {
                    endDate = `${yr}-${String(qEndMo).padStart(2, '0')}-01 00:00:00`;
                }
                periodLabel = `Quý ${qt}/${yr}`;
            } else if (period_type === 'year') {
                startDate = `${yr}-01-01 00:00:00`;
                endDate = `${yr + 1}-01-01 00:00:00`;
                periodLabel = `Năm ${yr}`;
            } else {
                periodLabel = `Tất Cả Thời Gian`;
            }

            // Production Mode filter
            const cutoff = await getProductionCutoff();
            const testIds = await getTestAccountIds();
            const prodSQL = buildProductionFilter(cutoff, testIds, 'c.created_at', 'c.created_by');

            // 2. Build SQL conditions
            const whereConditions = [
                `COALESCE(c.cancel_approved, 0) != 1`,
                `COALESCE(o.is_draft, false) = false`,
                `o.parent_order_id IS NULL`
            ];
            if (prodSQL) {
                whereConditions.push(`(${prodSQL.replace(/^\s*AND\s+/i, '')})`);
            }
            const params = [];

            if (startDate && endDate) {
                params.push(startDate, endDate);
                whereConditions.push(`o.created_at >= $1::timestamp`);
                whereConditions.push(`o.created_at < $2::timestamp`);
            }

            // Field Filter: tem_pet vs dong_phuc
            if (field === 'tem_pet') {
                whereConditions.push(`c.crm_type = 'tem_pet'`);
            } else if (field === 'dong_phuc') {
                whereConditions.push(`c.crm_type != 'tem_pet'`);
            }

            // Search Filter
            if (search && search.trim()) {
                params.push(`%${search.trim()}%`);
                whereConditions.push(`(c.customer_name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
            }

            const whereSQL = whereConditions.join(' AND ');

            // Sort clause
            const orderBySQL = sort_by === 'order_count' 
                ? `COUNT(DISTINCT o.id) DESC, SUM(COALESCE(oi_sum.item_total, 0) - COALESCE(o.discount_amount, 0) - COALESCE(o.vat_amount, 0)) DESC`
                : `SUM(COALESCE(oi_sum.item_total, 0) - COALESCE(o.discount_amount, 0) - COALESCE(o.vat_amount, 0)) DESC, COUNT(DISTINCT o.id) DESC`;

            params.push(lim);
            const limitParamIdx = params.length;

            const querySQL = `
                SELECT
                    c.id AS customer_id,
                    c.customer_name,
                    c.phone,
                    c.crm_type,
                    c.province,
                    c.assigned_to_id,
                    u.full_name AS assigned_to_name,
                    u.role AS assigned_to_role,
                    COUNT(DISTINCT o.id) AS order_count,
                    COALESCE(SUM(
                        GREATEST(0, COALESCE(oi_sum.item_total, 0) - COALESCE(o.discount_amount, 0) - COALESCE(o.vat_amount, 0))
                    ), 0) AS total_revenue,
                    MAX(o.created_at) AS last_order_at
                FROM dht_orders o
                JOIN customers c ON c.id = o.customer_id
                LEFT JOIN users u ON u.id = c.assigned_to_id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(SUM(di.item_total), 0) AS item_total
                    FROM dht_order_items di WHERE di.dht_order_id = o.id
                ) oi_sum ON true
                WHERE ${whereSQL}
                GROUP BY c.id, c.customer_name, c.phone, c.crm_type, c.province, c.assigned_to_id, u.full_name, u.role
                ORDER BY ${orderBySQL}
                LIMIT $${limitParamIdx}
            `;

            const rows = await db.all(querySQL, params);

            // Calculate overall summary for top list
            let totalRevenue = 0;
            let totalOrders = 0;
            let champRevenue = null;
            let champOrders = null;

            const formattedCustomers = (rows || []).map((row, idx) => {
                const rev = parseFloat(row.total_revenue || 0);
                const ords = parseInt(row.order_count || 0);
                const aov = ords > 0 ? Math.round(rev / ords) : 0;

                totalRevenue += rev;
                totalOrders += ords;

                const custObj = {
                    rank: idx + 1,
                    customer_id: row.customer_id,
                    customer_name: row.customer_name || 'Khách Hàng Chưa Đặt Tên',
                    phone: row.phone || '',
                    crm_type: row.crm_type,
                    field_label: row.crm_type === 'tem_pet' ? 'PET TEM' : 'Đồng Phục',
                    province: row.province || '',
                    assigned_to_id: row.assigned_to_id,
                    assigned_to_name: row.assigned_to_name || 'Chưa Phân Công',
                    order_count: ords,
                    total_revenue: rev,
                    avg_order_value: aov,
                    last_order_at: row.last_order_at
                };

                if (idx === 0) champRevenue = custObj;
                if (!champOrders || ords > champOrders.order_count) champOrders = custObj;

                return custObj;
            });

            reply.send({
                success: true,
                filter: {
                    period_type,
                    year: yr,
                    month: mo,
                    quarter: qt,
                    field,
                    sort_by,
                    period_label: periodLabel
                },
                summary: {
                    total_customers: formattedCustomers.length,
                    total_revenue: totalRevenue,
                    total_orders: totalOrders,
                    avg_revenue_per_cust: formattedCustomers.length > 0 ? Math.round(totalRevenue / formattedCustomers.length) : 0,
                    champion_revenue: champRevenue ? {
                        customer_name: champRevenue.customer_name,
                        phone: champRevenue.phone,
                        revenue: champRevenue.total_revenue
                    } : null,
                    champion_orders: champOrders ? {
                        customer_name: champOrders.customer_name,
                        phone: champOrders.phone,
                        orders: champOrders.order_count
                    } : null
                },
                customers: formattedCustomers
            });

        } catch (error) {
            request.log.error(error);
            reply.status(500).send({ error: 'Lỗi tải dữ liệu Top Khách Hàng', detail: error.message });
        }
    });
};
