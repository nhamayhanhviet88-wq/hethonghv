/**
 * Tổng Doanh Số Sale KD — API endpoint
 * All revenue from dht_orders (Đồng phục + PET + TEM + ...) grouped by employee & category
 * Excludes repair orders (parent_order_id IS NOT NULL)
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function(fastify) {

    // ===== Helper: Parse period params into date ranges =====
    function parsePeriod(period, dateStr) {
        let current = {}, previous = {};
        const now = new Date();

        if (period === 'day') {
            let dateObj;
            if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                dateObj = new Date(dateStr + 'T00:00:00');
            } else {
                dateObj = now;
            }
            const y = dateObj.getFullYear(), m = dateObj.getMonth() + 1, d = dateObj.getDate();
            current.start = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const next = new Date(dateObj); next.setDate(next.getDate() + 1);
            current.end = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`;
            current.label = `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;

            const prev = new Date(dateObj); prev.setDate(prev.getDate() - 1);
            previous.start = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}-${String(prev.getDate()).padStart(2,'0')}`;
            previous.end = current.start;
            previous.label = `${String(prev.getDate()).padStart(2,'0')}/${String(prev.getMonth()+1).padStart(2,'0')}/${prev.getFullYear()}`;
        } else if (period === 'week') {
            let dateObj;
            if (dateStr && /^\d{4}-W\d{1,2}$/.test(dateStr)) {
                const [y, w] = dateStr.split('-W').map(Number);
                const jan4 = new Date(y, 0, 4);
                const dayOfWeek = jan4.getDay() || 7;
                dateObj = new Date(jan4);
                dateObj.setDate(jan4.getDate() - dayOfWeek + 1 + (w - 1) * 7);
            } else {
                dateObj = new Date(now);
                const day = dateObj.getDay() || 7;
                dateObj.setDate(dateObj.getDate() - day + 1);
            }
            dateObj.setHours(0,0,0,0);
            const y = dateObj.getFullYear(), m = dateObj.getMonth()+1, d = dateObj.getDate();
            current.start = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const endDate = new Date(dateObj); endDate.setDate(endDate.getDate() + 7);
            current.end = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`;
            const jan1 = new Date(y, 0, 1);
            const weekNum = Math.ceil(((dateObj - jan1) / 86400000 + jan1.getDay() + 1) / 7);
            current.label = `Tuần ${weekNum}/${y}`;

            const prevStart = new Date(dateObj); prevStart.setDate(prevStart.getDate() - 7);
            previous.start = `${prevStart.getFullYear()}-${String(prevStart.getMonth()+1).padStart(2,'0')}-${String(prevStart.getDate()).padStart(2,'0')}`;
            previous.end = current.start;
            previous.label = `Tuần trước`;
        } else if (period === 'quarter') {
            let year, quarter;
            if (dateStr && /^\d{4}-Q[1-4]$/.test(dateStr)) {
                year = parseInt(dateStr.split('-Q')[0]);
                quarter = parseInt(dateStr.split('-Q')[1]);
            } else {
                year = now.getFullYear();
                quarter = Math.ceil((now.getMonth() + 1) / 3);
            }
            const qStartMonth = (quarter - 1) * 3 + 1;
            const qEndMonth = qStartMonth + 3;
            current.start = `${year}-${String(qStartMonth).padStart(2, '0')}-01`;
            if (qEndMonth <= 12) {
                current.end = `${year}-${String(qEndMonth).padStart(2, '0')}-01`;
            } else {
                current.end = `${year + 1}-01-01`;
            }
            current.label = `Q${quarter}/${year}`;

            const prevQ = quarter === 1 ? 4 : quarter - 1;
            const prevY = quarter === 1 ? year - 1 : year;
            const prevStartMonth = (prevQ - 1) * 3 + 1;
            previous.start = `${prevY}-${String(prevStartMonth).padStart(2, '0')}-01`;
            previous.end = current.start;
            previous.label = `Q${prevQ}/${prevY}`;
        } else if (period === 'year') {
            const year = (dateStr && /^\d{4}$/.test(dateStr)) ? parseInt(dateStr) : now.getFullYear();
            current.start = `${year}-01-01`;
            current.end = `${year + 1}-01-01`;
            current.label = `${year}`;

            previous.start = `${year - 1}-01-01`;
            previous.end = current.start;
            previous.label = `${year - 1}`;
        } else {
            // Default: month
            let year, month;
            if (dateStr && /^\d{4}-\d{2}$/.test(dateStr)) {
                [year, month] = dateStr.split('-').map(Number);
            } else {
                year = now.getFullYear();
                month = now.getMonth() + 1;
            }
            current.start = `${year}-${String(month).padStart(2, '0')}-01`;
            const nextMonth = month === 12 ? 1 : month + 1;
            const nextYear = month === 12 ? year + 1 : year;
            current.end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
            current.label = `T${month}/${year}`;

            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            previous.start = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
            previous.end = current.start;
            previous.label = `T${prevMonth}/${prevYear}`;
        }

        return { current, previous, type: period || 'month' };
    }

    // ===== Main API: GET /api/reports/total-sales =====
    fastify.get('/api/reports/total-sales', { preHandler: [authenticate] }, async (request, reply) => {
        const { period = 'month', date, category } = request.query;
        const { current, previous, type } = parsePeriod(period, date);

        // 1. Get KD department tree (id=1 + children)
        const allDepts = await db.all(
            "SELECT id, name, parent_id, head_user_id, display_order FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id"
        );
        if (allDepts.length === 0) {
            return { period: { type, ...current }, previous, categories: [], summary: { current: {}, previous: {} }, employees: [], teams: [] };
        }

        const rootDept = allDepts.find(d => d.id === 1) || allDepts[0];
        const childDepts = allDepts.filter(d => d.parent_id === rootDept.id);
        const allDeptIds = allDepts.map(d => d.id);

        // 2. Get all active users in KD tree (exclude GĐ)
        const kdPh = allDeptIds.map((_, i) => `$${i + 1}`).join(',');
        const users = await db.all(
            `SELECT u.id, u.full_name, u.role, u.department_id, u.username
             FROM users u
             WHERE u.department_id IN (${kdPh}) AND u.status = 'active' AND u.role != 'giam_doc'
             ORDER BY u.full_name`,
            allDeptIds
        );
        const userIds = users.map(u => u.id);
        if (userIds.length === 0) {
            return { period: { type, ...current }, previous, categories: [], summary: { current: {}, previous: {} }, employees: [], teams: [] };
        }

        // 3. Get all categories for filter dropdown
        const categories = await db.all("SELECT id, name FROM dht_categories WHERE is_active = true ORDER BY display_order ASC, id ASC");
        // Identify repair category (ĐƠN SỬA)
        const repairCatId = categories.find(c => c.name === 'ĐƠN SỬA')?.id;

        // 4. Build revenue query
        const buildRevenueQuery = (startDate, endDate) => {
            const userPh = userIds.map((_, i) => `$${i + 1}`).join(',');
            const pStart = userIds.length + 1;
            const pEnd = userIds.length + 2;

            // Category filter
            let catFilter = '';
            const params = [...userIds, startDate, endDate];
            if (category && category !== 'all') {
                catFilter = ` AND o.category_id = $${pEnd + 1}`;
                params.push(parseInt(category));
            }

            return {
                sql: `
                    SELECT
                        o.created_by AS employee_id,
                        o.category_id,
                        cat.name AS category_name,
                        COUNT(*)::int AS order_count,
                        COALESCE(SUM(
                            COALESCE(oi_sum.item_total, 0)
                            - COALESCE(o.discount_amount, 0)
                            - COALESCE(o.vat_amount, 0)
                        ), 0) AS revenue
                    FROM dht_orders o
                    LEFT JOIN dht_categories cat ON o.category_id = cat.id
                    LEFT JOIN LATERAL (
                        SELECT COALESCE(SUM(di.item_total), 0) AS item_total
                        FROM dht_order_items di WHERE di.dht_order_id = o.id
                    ) oi_sum ON true
                    WHERE o.created_by IN (${userPh})
                      AND o.parent_order_id IS NULL
                      ${repairCatId ? `AND (o.category_id IS NULL OR o.category_id != ${repairCatId})` : ''}
                      AND o.order_date >= $${pStart}::date
                      AND o.order_date < $${pEnd}::date
                      ${catFilter}
                    GROUP BY o.created_by, o.category_id, cat.name
                `,
                params
            };
        };

        const curQ = buildRevenueQuery(current.start, current.end);
        const prevQ = buildRevenueQuery(previous.start, previous.end);

        const [currentRows, previousRows] = await Promise.all([
            db.all(curQ.sql, curQ.params),
            db.all(prevQ.sql, prevQ.params)
        ]);

        // 5. Build lookup maps: uid -> { catId -> { revenue, orders } }
        function buildMap(rows) {
            const map = {};
            rows.forEach(r => {
                const uid = r.employee_id;
                const catId = r.category_id || 0;
                if (!map[uid]) map[uid] = {};
                map[uid][catId] = {
                    revenue: parseFloat(r.revenue),
                    orders: parseInt(r.order_count),
                    category_name: r.category_name || 'Chưa phân loại'
                };
            });
            return map;
        }
        const currentMap = buildMap(currentRows);
        const previousMap = buildMap(previousRows);

        // Helper: aggregate employee data
        function calcEmployee(uid, statsMap) {
            const catData = statsMap[uid] || {};
            let totalRevenue = 0, totalOrders = 0;
            const byCategory = {};
            for (const [catId, data] of Object.entries(catData)) {
                totalRevenue += data.revenue;
                totalOrders += data.orders;
                byCategory[catId] = { revenue: data.revenue, orders: data.orders, name: data.category_name };
            }
            return { total_revenue: totalRevenue, total_orders: totalOrders, by_category: byCategory };
        }

        // Helper: merge category data
        function mergeCategories(cat1, cat2) {
            const merged = {};
            const allCatIds = new Set([...Object.keys(cat1), ...Object.keys(cat2)]);
            for (const catId of allCatIds) {
                const c1 = cat1[catId] || { revenue: 0, orders: 0 };
                const c2 = cat2[catId] || { revenue: 0, orders: 0 };
                merged[catId] = {
                    revenue: (c1.revenue || 0) + (c2.revenue || 0),
                    orders: (c1.orders || 0) + (c2.orders || 0),
                    name: c1.name || c2.name || 'Chưa phân loại'
                };
            }
            return merged;
        }

        // 6. Role-based visibility
        const isDirector = ['giam_doc', 'quan_ly_cap_cao'].includes(request.user.role);
        const isManager = ['quan_ly'].includes(request.user.role);
        const isLeader = ['truong_phong'].includes(request.user.role);

        let visibleUserIds;
        if (isDirector) {
            visibleUserIds = new Set(userIds);
        } else if (isManager || isLeader) {
            // See own department + child departments
            const myDept = request.user.department_id;
            const myDeptIds = [myDept, ...childDepts.filter(d => d.head_user_id === request.user.id).map(d => d.id)];
            visibleUserIds = new Set(users.filter(u => myDeptIds.includes(u.department_id)).map(u => u.id));
            visibleUserIds.add(request.user.id);
        } else {
            visibleUserIds = new Set([request.user.id]);
        }

        // 7. Build employee list
        const employees = [];
        for (const user of users) {
            if (!visibleUserIds.has(user.id)) continue;

            const curData = calcEmployee(user.id, currentMap);
            const prevData = calcEmployee(user.id, previousMap);
            const trendPct = prevData.total_revenue > 0
                ? Math.round(1000 * (curData.total_revenue - prevData.total_revenue) / prevData.total_revenue) / 10
                : (curData.total_revenue > 0 ? 100 : 0);

            employees.push({
                user_id: user.id,
                name: user.full_name,
                role: user.role,
                department_id: user.department_id,
                current: curData,
                previous: prevData,
                trend_pct: trendPct
            });
        }

        // Sort employees by total revenue DESC
        employees.sort((a, b) => b.current.total_revenue - a.current.total_revenue);

        // 8. Build team aggregates
        const teams = [];
        const processedDeptIds = new Set();

        // Root dept users (QL group)
        const rootUsers = employees.filter(e => {
            const u = users.find(u2 => u2.id === e.user_id);
            return u && u.department_id === rootDept.id;
        });
        if (rootUsers.length > 0) {
            const teamCurCat = {};
            const teamPrevCat = {};
            let teamCurRev = 0, teamCurOrd = 0, teamPrevRev = 0, teamPrevOrd = 0;
            rootUsers.forEach(e => {
                teamCurRev += e.current.total_revenue;
                teamCurOrd += e.current.total_orders;
                teamPrevRev += e.previous.total_revenue;
                teamPrevOrd += e.previous.total_orders;
                Object.assign(teamCurCat, mergeCategories(teamCurCat, e.current.by_category));
                Object.assign(teamPrevCat, mergeCategories(teamPrevCat, e.previous.by_category));
            });
            const trendPct = teamPrevRev > 0 ? Math.round(1000 * (teamCurRev - teamPrevRev) / teamPrevRev) / 10 : (teamCurRev > 0 ? 100 : 0);
            teams.push({
                dept_id: rootDept.id,
                dept_name: 'QUẢN LÝ',
                member_count: rootUsers.length,
                current: { total_revenue: teamCurRev, total_orders: teamCurOrd, by_category: teamCurCat },
                previous: { total_revenue: teamPrevRev, total_orders: teamPrevOrd, by_category: teamPrevCat },
                trend_pct: trendPct,
                employees: rootUsers
            });
            processedDeptIds.add(rootDept.id);
        }

        // Child departments = Teams
        for (const dept of childDepts) {
            const deptEmps = employees.filter(e => {
                const u = users.find(u2 => u2.id === e.user_id);
                return u && u.department_id === dept.id;
            });
            if (deptEmps.length === 0) continue;
            processedDeptIds.add(dept.id);

            const teamCurCat = {};
            const teamPrevCat = {};
            let teamCurRev = 0, teamCurOrd = 0, teamPrevRev = 0, teamPrevOrd = 0;
            deptEmps.forEach(e => {
                teamCurRev += e.current.total_revenue;
                teamCurOrd += e.current.total_orders;
                teamPrevRev += e.previous.total_revenue;
                teamPrevOrd += e.previous.total_orders;
                Object.assign(teamCurCat, mergeCategories(teamCurCat, e.current.by_category));
                Object.assign(teamPrevCat, mergeCategories(teamPrevCat, e.previous.by_category));
            });
            const trendPct = teamPrevRev > 0 ? Math.round(1000 * (teamCurRev - teamPrevRev) / teamPrevRev) / 10 : (teamCurRev > 0 ? 100 : 0);

            const leaderUser = dept.head_user_id ? users.find(u => u.id === dept.head_user_id) : null;
            teams.push({
                dept_id: dept.id,
                dept_name: dept.name,
                leader_name: leaderUser?.full_name || null,
                member_count: deptEmps.length,
                current: { total_revenue: teamCurRev, total_orders: teamCurOrd, by_category: teamCurCat },
                previous: { total_revenue: teamPrevRev, total_orders: teamPrevOrd, by_category: teamPrevCat },
                trend_pct: trendPct,
                employees: deptEmps
            });
        }

        // Sort teams by revenue DESC
        teams.sort((a, b) => b.current.total_revenue - a.current.total_revenue);

        // 9. Summary (all visible employees)
        const summCurCat = {};
        const summPrevCat = {};
        let summCurRev = 0, summCurOrd = 0, summPrevRev = 0, summPrevOrd = 0;
        employees.forEach(e => {
            summCurRev += e.current.total_revenue;
            summCurOrd += e.current.total_orders;
            summPrevRev += e.previous.total_revenue;
            summPrevOrd += e.previous.total_orders;
            Object.assign(summCurCat, mergeCategories(summCurCat, e.current.by_category));
            Object.assign(summPrevCat, mergeCategories(summPrevCat, e.previous.by_category));
        });
        const summTrendPct = summPrevRev > 0
            ? Math.round(1000 * (summCurRev - summPrevRev) / summPrevRev) / 10
            : (summCurRev > 0 ? 100 : 0);
        const summTrendOrd = summCurOrd - summPrevOrd;

        // Filter out repair category from categories dropdown
        const filteredCategories = categories.filter(c => c.name !== 'ĐƠN SỬA');

        return {
            period: { type, label: current.label, start: current.start, end: current.end },
            previous: { label: previous.label, start: previous.start, end: previous.end },
            categories: filteredCategories,
            summary: {
                current: { total_revenue: summCurRev, total_orders: summCurOrd, by_category: summCurCat },
                previous: { total_revenue: summPrevRev, total_orders: summPrevOrd, by_category: summPrevCat },
                trend_pct: summTrendPct,
                trend_orders: summTrendOrd
            },
            employees,
            teams
        };
    });

    // ===== ORDER DETAIL: GET /api/reports/total-sales/orders =====
    // Returns individual order rows from dht_orders for popup detail view
    fastify.get('/api/reports/total-sales/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const { start_date, end_date, user_id, dept_id, category_id } = request.query;
        if (!start_date || !end_date) return reply.code(400).send({ error: 'Thiếu start_date/end_date' });

        // 1. Get KD department tree
        const allDepts = await db.all(
            "SELECT id, name, parent_id, head_user_id FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id"
        );
        if (allDepts.length === 0) return { orders: [], summary: {} };
        const rootDept = allDepts.find(d => d.id === 1) || allDepts[0];
        const childDepts = allDepts.filter(d => d.parent_id === rootDept.id);
        const allDeptIds = allDepts.map(d => d.id);

        // 2. Get all active users in KD
        const kdPh = allDeptIds.map((_, i) => `$${i + 1}`).join(',');
        const users = await db.all(
            `SELECT u.id, u.full_name, u.role, u.department_id
             FROM users u WHERE u.department_id IN (${kdPh}) AND u.status = 'active' AND u.role != 'giam_doc'`,
            allDeptIds
        );
        const allUserIds = users.map(u => u.id);

        // 3. Role-based visibility
        const isDirector = ['giam_doc', 'quan_ly_cap_cao'].includes(request.user.role);
        const isManager = ['quan_ly'].includes(request.user.role);
        const isLeader = ['truong_phong'].includes(request.user.role);

        let visibleUserIds;
        if (isDirector) {
            visibleUserIds = new Set(allUserIds);
        } else if (isManager || isLeader) {
            const myDept = request.user.department_id;
            const myDeptIds = [myDept, ...childDepts.filter(d => d.head_user_id === request.user.id).map(d => d.id)];
            visibleUserIds = new Set(users.filter(u => myDeptIds.includes(u.department_id)).map(u => u.id));
            visibleUserIds.add(request.user.id);
        } else {
            visibleUserIds = new Set([request.user.id]);
        }

        // 4. Determine which user IDs to query
        let targetUserIds = Array.from(visibleUserIds);

        if (user_id) {
            const uid = parseInt(user_id);
            if (!visibleUserIds.has(uid)) return reply.code(403).send({ error: 'Không có quyền xem' });
            targetUserIds = [uid];
        }
        if (dept_id) {
            const did = parseInt(dept_id);
            const deptUserIds = users.filter(u => u.department_id === did).map(u => u.id);
            targetUserIds = deptUserIds.filter(id => visibleUserIds.has(id));
            if (targetUserIds.length === 0) return { orders: [], summary: { total: 0, new_orders: 0, old_orders: 0 } };
        }

        if (targetUserIds.length === 0) return { orders: [], summary: { total: 0, new_orders: 0, old_orders: 0 } };

        // 5. Identify repair category to exclude
        const repairCat = await db.get("SELECT id FROM dht_categories WHERE name = 'ĐƠN SỬA'");
        const repairCatId = repairCat ? repairCat.id : null;

        // 6. Build query
        const userPh = targetUserIds.map((_, i) => `$${i + 1}`).join(',');
        let paramIdx = targetUserIds.length + 1;
        const params = [...targetUserIds, start_date, end_date];
        let extraWhere = '';

        if (category_id) {
            extraWhere += ` AND o.category_id = $${paramIdx + 2}`;
            params.push(parseInt(category_id));
        }

        const orders = await db.all(`
            SELECT
                o.id,
                o.order_code,
                o.customer_name,
                o.customer_phone,
                COALESCE(oi_sum.item_total, 0) - COALESCE(o.discount_amount, 0) - COALESCE(o.vat_amount, 0) AS revenue,
                o.order_date,
                o.created_by AS employee_id,
                u.full_name AS employee_name,
                cat.name AS category_name,
                -- Determine new/old: check if same phone has prior orders
                CASE
                    WHEN o.customer_phone IS NOT NULL AND o.customer_phone != '' AND EXISTS (
                        SELECT 1 FROM dht_orders prev
                        WHERE prev.customer_phone = o.customer_phone
                          AND prev.id != o.id
                          AND prev.order_date < o.order_date
                          AND prev.parent_order_id IS NULL
                    ) THEN 'cu'
                    ELSE 'moi'
                END AS customer_type,
                -- Order number for this customer phone
                (SELECT COUNT(*) FROM dht_orders prev2
                 WHERE prev2.customer_phone = o.customer_phone
                   AND prev2.customer_phone IS NOT NULL AND prev2.customer_phone != ''
                   AND prev2.order_date <= o.order_date
                   AND prev2.parent_order_id IS NULL
                ) AS order_count,
                -- Affiliate: check if linked via order_codes → customers → referrer
                ref_u.full_name AS referrer_name
            FROM dht_orders o
            LEFT JOIN dht_categories cat ON o.category_id = cat.id
            LEFT JOIN users u ON o.created_by = u.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(di.item_total), 0) AS item_total
                FROM dht_order_items di WHERE di.dht_order_id = o.id
            ) oi_sum ON true
            LEFT JOIN LATERAL (
                SELECT c.referrer_id
                FROM order_codes oc
                JOIN customers c ON oc.customer_id = c.id
                WHERE oc.order_code = o.order_code
                LIMIT 1
            ) ref_link ON true
            LEFT JOIN users ref_u ON ref_u.id = ref_link.referrer_id AND ref_u.role = 'tkaffiliate'
            WHERE o.created_by IN (${userPh})
              AND o.parent_order_id IS NULL
              ${repairCatId ? `AND (o.category_id IS NULL OR o.category_id != ${repairCatId})` : ''}
              AND o.order_date >= $${paramIdx}::date
              AND o.order_date < $${paramIdx + 1}::date
              ${extraWhere}
            ORDER BY o.order_date DESC, o.id DESC
        `, params);

        // 7. Phone masking
        const { maskPhone } = require('../utils/dataMasking');
        const isOwner = (eid) => request.user.id === eid;
        const maskedOrders = orders.map(o => {
            if (isDirector || isOwner(o.employee_id) || request.user.role === 'quan_ly_cap_cao') {
                return o;
            }
            return { ...o, customer_phone: maskPhone(o.customer_phone) };
        });

        // 8. Build summary
        const totalNew = maskedOrders.filter(o => o.customer_type === 'moi').length;
        const totalOld = maskedOrders.filter(o => o.customer_type === 'cu').length;

        // Period label
        const periodLabel = start_date + ' → ' + end_date;

        // Title context
        let title = 'Tất cả';
        if (user_id) {
            const emp = users.find(u => u.id === parseInt(user_id));
            title = emp ? emp.full_name : 'NV #' + user_id;
        } else if (dept_id) {
            const dept = allDepts.find(d => d.id === parseInt(dept_id));
            title = dept ? dept.name : 'Team #' + dept_id;
        }

        return {
            title,
            periodLabel,
            orders: maskedOrders,
            summary: {
                total: maskedOrders.length,
                new_orders: totalNew,
                old_orders: totalOld,
                total_revenue: maskedOrders.reduce((s, o) => s + parseFloat(o.revenue || 0), 0)
            }
        };
    });
};
