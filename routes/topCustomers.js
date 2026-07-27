/**
 * Route: Top Khách Hàng — Thống kê khách hàng lớn/VIP theo thời gian & lĩnh vực
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { getProductionCutoff, getTestAccountIds, buildProductionFilter } = require('../utils/productionMode');

module.exports = async function(fastify, options) {

    // ===== GET /api/reports/top-customers =====
    fastify.get('/api/reports/top-customers', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const {
                period_type = 'month',
                year = new Date().getFullYear(),
                month = new Date().getMonth() + 1,
                quarter = 1,
                field = 'all',
                sort_by = 'revenue',
                limit = 100,
                search = ''
            } = request.query;

            const yr = Number(year) || new Date().getFullYear();
            const mo = Number(month) || (new Date().getMonth() + 1);
            const qt = Number(quarter) || 1;
            const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);

            // 1. Build date range filter
            let startDate = null;
            let endDate = null;
            let periodLabel = '';

            if (period_type === 'month') {
                startDate = `${yr}-${String(mo).padStart(2, '0')}-01 00:00:00`;
                const nextMo = mo === 12 ? 1 : mo + 1;
                const nextYr = mo === 12 ? yr + 1 : yr;
                endDate = `${nextYr}-${String(nextMo).padStart(2, '0')}-01 00:00:00`;
                periodLabel = `Tháng ${mo}/${yr}`;
            } else if (period_type === 'quarter') {
                const qStartMo = (qt - 1) * 3 + 1;
                const qEndMo = qStartMo + 3;
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
                `COALESCE(oc.status, 'active') != 'cancelled'`,
                prodSQL ? prodSQL.replace(/^AND\s+/i, '') : `1=1`
            ];
            const params = [];

            if (startDate && endDate) {
                params.push(startDate, endDate);
                whereConditions.push(`oc.created_at >= $${params.length - 1}::timestamp`);
                whereConditions.push(`oc.created_at < $${params.length}::timestamp`);
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
                ? `COUNT(DISTINCT oc.order_code) DESC, SUM(COALESCE(oi_sum.revenue, 0)) DESC`
                : `SUM(COALESCE(oi_sum.revenue, 0)) DESC, COUNT(DISTINCT oc.order_code) DESC`;

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
                    COUNT(DISTINCT oc.order_code) AS order_count,
                    COALESCE(SUM(oi_sum.revenue - COALESCE((SELECT d3.discount_amount FROM dht_orders d3 WHERE d3.order_code = oc.order_code), 0)), 0) AS total_revenue,
                    MAX(oc.created_at) AS last_order_at
                FROM order_codes oc
                JOIN customers c ON c.id = oc.customer_id
                LEFT JOIN users u ON u.id = c.assigned_to_id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(
                        (SELECT SUM(di.item_total) FROM dht_orders d JOIN dht_order_items di ON di.dht_order_id = d.id WHERE d.order_code = oc.order_code),
                        (SELECT SUM(oi_f.total) FROM order_items oi_f WHERE oi_f.order_code_id = oc.id),
                        0
                    ) - COALESCE((SELECT d2.vat_amount FROM dht_orders d2 WHERE d2.order_code = oc.order_code), 0) AS revenue
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

                if (!champRevenue || rev > champRevenue.revenue) {
                    champRevenue = { customer_name: row.customer_name, phone: row.phone, revenue: rev };
                }
                if (!champOrders || ords > champOrders.orders) {
                    champOrders = { customer_name: row.customer_name, phone: row.phone, orders: ords };
                }

                return {
                    rank: idx + 1,
                    customer_id: row.customer_id,
                    customer_name: row.customer_name || 'Khách Hàng',
                    phone: row.phone || '',
                    crm_type: row.crm_type,
                    field_label: row.crm_type === 'tem_pet' ? 'PET TEM' : 'ĐỒNG PHỤC',
                    province: row.province || '',
                    assigned_to_id: row.assigned_to_id,
                    assigned_to_name: row.assigned_to_name || 'Chưa phân công',
                    assigned_to_role: row.assigned_to_role || '',
                    order_count: ords,
                    total_revenue: rev,
                    avg_order_value: aov,
                    last_order_at: row.last_order_at
                };
            });

            reply.send({
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
                    champion_revenue: champRevenue,
                    champion_orders: champOrders
                },
                customers: formattedCustomers
            });

        } catch (err) {
            fastify.log.error(err);
            reply.status(500).send({ error: 'Internal Server Error', message: err.message });
        }
    });

};
