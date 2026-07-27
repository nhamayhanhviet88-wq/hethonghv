const { getProductionCutoff, getTestAccountIds, buildProductionFilter } = require('../utils/productionMode');
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function (fastify, opts) {

    /**
     * GET /api/reports/top-customers
     * Báo cáo thống kê 👑 Top Khách Hàng & Sale KD (doanh số, số lượng đơn)
     * Filters:
     *   - period_type: 'month', 'quarter', 'year', 'all'
     *   - year: YYYY (e.g. 2026)
     *   - month: 1-12
     *   - quarter: 1-4
     *   - field: 'all', 'tem_pet', 'dong_phuc'
     *   - sort_by: 'revenue' | 'order_count'
     *   - search: string (tên KH / SĐT / Tên Sale)
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

            // 2. Build SQL conditions for Customers
            const custWhereConditions = [
                `COALESCE(c.cancel_approved, 0) != 1`,
                `COALESCE(o.is_draft, false) = false`,
                `o.parent_order_id IS NULL`
            ];
            if (prodSQL) {
                custWhereConditions.push(`(${prodSQL.replace(/^\s*AND\s+/i, '')})`);
            }
            const custParams = [];

            if (startDate && endDate) {
                custParams.push(startDate, endDate);
                custWhereConditions.push(`o.created_at >= $1::timestamp`);
                custWhereConditions.push(`o.created_at < $2::timestamp`);
            }

            // Field Filter: tem_pet vs dong_phuc
            if (field === 'tem_pet') {
                custWhereConditions.push(`c.crm_type = 'tem_pet'`);
            } else if (field === 'dong_phuc') {
                custWhereConditions.push(`c.crm_type != 'tem_pet'`);
            }

            // Search Filter
            if (search && search.trim()) {
                custParams.push(`%${search.trim()}%`);
                custWhereConditions.push(`(c.customer_name ILIKE $${custParams.length} OR c.phone ILIKE $${custParams.length})`);
            }

            const custWhereSQL = custWhereConditions.join(' AND ');

            // Sort clause for Customers
            const custOrderBySQL = sort_by === 'order_count' 
                ? `COUNT(DISTINCT o.id) DESC, SUM(COALESCE(oi_sum.item_total, 0) - COALESCE(o.discount_amount, 0) - COALESCE(o.vat_amount, 0)) DESC`
                : `SUM(COALESCE(oi_sum.item_total, 0) - COALESCE(o.discount_amount, 0) - COALESCE(o.vat_amount, 0)) DESC, COUNT(DISTINCT o.id) DESC`;

            custParams.push(lim);
            const custLimitIdx = custParams.length;

            const custQuerySQL = `
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
                WHERE ${custWhereSQL}
                GROUP BY c.id, c.customer_name, c.phone, c.crm_type, c.province, c.assigned_to_id, u.full_name, u.role
                ORDER BY ${custOrderBySQL}
                LIMIT $${custLimitIdx}
            `;

            // 3. Build SQL conditions for Sales Staff
            const staffWhereConditions = [
                `COALESCE(c.cancel_approved, 0) != 1`,
                `COALESCE(o.is_draft, false) = false`,
                `o.parent_order_id IS NULL`,
                `u.id IS NOT NULL`
            ];
            if (prodSQL) {
                staffWhereConditions.push(`(${prodSQL.replace(/^\s*AND\s+/i, '')})`);
            }
            const staffParams = [];

            if (startDate && endDate) {
                staffParams.push(startDate, endDate);
                staffWhereConditions.push(`o.created_at >= $1::timestamp`);
                staffWhereConditions.push(`o.created_at < $2::timestamp`);
            }

            if (field === 'tem_pet') {
                staffWhereConditions.push(`c.crm_type = 'tem_pet'`);
            } else if (field === 'dong_phuc') {
                staffWhereConditions.push(`c.crm_type != 'tem_pet'`);
            }

            if (search && search.trim()) {
                staffParams.push(`%${search.trim()}%`);
                staffWhereConditions.push(`(u.full_name ILIKE $${staffParams.length} OR u.username ILIKE $${staffParams.length})`);
            }

            const staffWhereSQL = staffWhereConditions.join(' AND ');

            const staffOrderBySQL = sort_by === 'order_count'
                ? `COUNT(DISTINCT o.id) DESC, SUM(COALESCE(oi_sum.item_total, 0) - COALESCE(o.discount_amount, 0) - COALESCE(o.vat_amount, 0)) DESC`
                : `SUM(COALESCE(oi_sum.item_total, 0) - COALESCE(o.discount_amount, 0) - COALESCE(o.vat_amount, 0)) DESC, COUNT(DISTINCT o.id) DESC`;

            staffParams.push(lim);
            const staffLimitIdx = staffParams.length;

            const staffQuerySQL = `
                SELECT
                    u.id AS user_id,
                    u.full_name AS staff_name,
                    u.username,
                    u.role AS staff_role,
                    d.name AS department_name,
                    COUNT(DISTINCT o.id) AS order_count,
                    COUNT(DISTINCT c.id) AS customer_count,
                    COALESCE(SUM(
                        GREATEST(0, COALESCE(oi_sum.item_total, 0) - COALESCE(o.discount_amount, 0) - COALESCE(o.vat_amount, 0))
                    ), 0) AS total_revenue,
                    MAX(o.created_at) AS last_order_at
                FROM dht_orders o
                JOIN customers c ON c.id = o.customer_id
                JOIN users u ON u.id = COALESCE(o.created_by, c.assigned_to_id)
                LEFT JOIN departments d ON d.id = u.department_id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(SUM(di.item_total), 0) AS item_total
                    FROM dht_order_items di WHERE di.dht_order_id = o.id
                ) oi_sum ON true
                WHERE ${staffWhereSQL}
                GROUP BY u.id, u.full_name, u.username, u.role, d.name
                ORDER BY ${staffOrderBySQL}
                LIMIT $${staffLimitIdx}
            `;

            const [custRows, staffRows] = await Promise.all([
                db.all(custQuerySQL, custParams),
                db.all(staffQuerySQL, staffParams)
            ]);

            // Calculate overall summary for Top Customers
            let custTotalRevenue = 0;
            let custTotalOrders = 0;
            let champCustRevenue = null;
            let champCustOrders = null;

            const formattedCustomers = (custRows || []).map((row, idx) => {
                const rev = parseFloat(row.total_revenue || 0);
                const ords = parseInt(row.order_count || 0);
                const aov = ords > 0 ? Math.round(rev / ords) : 0;

                custTotalRevenue += rev;
                custTotalOrders += ords;

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

                if (idx === 0) champCustRevenue = custObj;
                if (!champCustOrders || ords > champCustOrders.order_count) champCustOrders = custObj;

                return custObj;
            });

            // Calculate overall summary for Top Sale KD
            let staffTotalRevenue = 0;
            let staffTotalOrders = 0;
            let champStaffRevenue = null;
            let champStaffOrders = null;

            const formattedStaff = (staffRows || []).map((row, idx) => {
                const rev = parseFloat(row.total_revenue || 0);
                const ords = parseInt(row.order_count || 0);
                const custs = parseInt(row.customer_count || 0);
                const aov = ords > 0 ? Math.round(rev / ords) : 0;

                staffTotalRevenue += rev;
                staffTotalOrders += ords;

                const staffObj = {
                    rank: idx + 1,
                    user_id: row.user_id,
                    staff_name: row.staff_name || row.username || 'N/A',
                    username: row.username,
                    staff_role: row.staff_role,
                    department_name: row.department_name || 'Khối KD & Sale',
                    order_count: ords,
                    customer_count: custs,
                    total_revenue: rev,
                    avg_order_value: aov,
                    last_order_at: row.last_order_at
                };

                if (idx === 0) champStaffRevenue = staffObj;
                if (!champStaffOrders || ords > champStaffOrders.order_count) champStaffOrders = staffObj;

                return staffObj;
            });

            return reply.send({
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
                    customers: {
                        total_customers: formattedCustomers.length,
                        total_revenue: custTotalRevenue,
                        total_orders: custTotalOrders,
                        avg_revenue_per_cust: formattedCustomers.length > 0 ? Math.round(custTotalRevenue / formattedCustomers.length) : 0,
                        champion_revenue: champCustRevenue ? {
                            customer_name: champCustRevenue.customer_name,
                            phone: champCustRevenue.phone,
                            revenue: champCustRevenue.total_revenue
                        } : null,
                        champion_orders: champCustOrders ? {
                            customer_name: champCustOrders.customer_name,
                            phone: champCustOrders.phone,
                            orders: champCustOrders.order_count
                        } : null
                    },
                    staff: {
                        total_staff: formattedStaff.length,
                        total_revenue: staffTotalRevenue,
                        total_orders: staffTotalOrders,
                        avg_revenue_per_staff: formattedStaff.length > 0 ? Math.round(staffTotalRevenue / formattedStaff.length) : 0,
                        champion_revenue: champStaffRevenue ? {
                            staff_name: champStaffRevenue.staff_name,
                            department_name: champStaffRevenue.department_name,
                            revenue: champStaffRevenue.total_revenue
                        } : null,
                        champion_orders: champStaffOrders ? {
                            staff_name: champStaffOrders.staff_name,
                            department_name: champStaffOrders.department_name,
                            orders: champStaffOrders.order_count
                        } : null
                    }
                },
                customers: formattedCustomers,
                sales_staff: formattedStaff
            });

        } catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Lỗi tải dữ liệu Top Khách & Sale KD', detail: error.message });
        }
    });
};
