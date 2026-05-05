// ========== CUSTOMER RETENTION REPORT — Khách Mới vs Khách Cũ Quay Lại ==========
// Logic: Dùng ROW_NUMBER() OVER (PARTITION BY phone) trên consultation_logs (hoan_thanh)
// phone_order_number = 1 → Khách MỚI, > 1 → Khách CŨ quay lại
// Scope: Chỉ P.Kinh Doanh (department id=1 + children)
// ★ Teams = child departments (parent_id = 1), NOT the "teams" table

const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function(fastify) {

    // ===== Helper: Parse period params into date ranges =====
    function parsePeriod(period, dateStr) {
        let current = {}, previous = {};
        const now = new Date();

        if (period === 'month') {
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
        } else {
            const year = (dateStr && /^\d{4}$/.test(dateStr)) ? parseInt(dateStr) : now.getFullYear();
            current.start = `${year}-01-01`;
            current.end = `${year + 1}-01-01`;
            current.label = `${year}`;

            previous.start = `${year - 1}-01-01`;
            previous.end = current.start;
            previous.label = `${year - 1}`;
        }

        return { current, previous, type: period };
    }

    // ===== Main API =====
    fastify.get('/api/reports/customer-retention', { preHandler: [authenticate] }, async (request, reply) => {
        const { period = 'month', date } = request.query;
        const { current, previous, type } = parsePeriod(period, date);

        // ===== 1. Get KD department tree =====
        // Root = P.Kinh Doanh (id=1), Children = Team departments (parent_id=1)
        const allDepts = await db.all(
            "SELECT id, name, parent_id, head_user_id, display_order FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id"
        );
        if (allDepts.length === 0) {
            return { period: { type, ...current }, previous, summary: { current: { total: 0, new: 0, returning: 0, rate: 0 }, previous: { total: 0, new: 0, returning: 0, rate: 0 }, trend: { total: 0, new: 0, returning: 0, rate: 0 } }, groups: [] };
        }

        const rootDept = allDepts.find(d => d.id === 1) || allDepts[0];
        const childDepts = allDepts.filter(d => d.parent_id === rootDept.id); // These are "teams"
        const allDeptIds = allDepts.map(d => d.id);
        const kdPh = allDeptIds.map((_, i) => `$${i + 1}`).join(',');

        // ===== 2. Get all active users in KD tree =====
        const users = await db.all(
            `SELECT u.id, u.full_name, u.role, u.department_id, u.username
             FROM users u
             WHERE u.department_id IN (${kdPh}) AND u.status = 'active'
             ORDER BY u.full_name`,
            allDeptIds
        );

        // ===== 3. Core Query: count by ORDER_CODES, rank by phone =====
        const buildStatsQuery = (startDate, endDate) => {
            const paramOffset = allDeptIds.length;
            return {
                sql: `
                    WITH completed_orders AS (
                        SELECT
                            oc.id AS order_id,
                            oc.customer_id,
                            oc.created_at,
                            c.phone,
                            c.assigned_to_id
                        FROM order_codes oc
                        JOIN customers c ON oc.customer_id = c.id
                        WHERE c.phone IS NOT NULL AND c.phone != ''
                          AND COALESCE(c.cancel_approved, 0) != 1
                          AND EXISTS (
                              SELECT 1 FROM consultation_logs cl
                              WHERE cl.customer_id = oc.customer_id
                                AND cl.log_type = 'hoan_thanh'
                          )
                    ),
                    ranked_orders AS (
                        SELECT
                            order_id,
                            customer_id,
                            assigned_to_id,
                            created_at,
                            phone,
                            ROW_NUMBER() OVER (
                                PARTITION BY phone
                                ORDER BY created_at ASC
                            ) AS phone_order_number
                        FROM completed_orders
                    )
                    SELECT
                        assigned_to_id AS employee_id,
                        COUNT(*) AS total_orders,
                        SUM(CASE WHEN phone_order_number = 1 THEN 1 ELSE 0 END) AS new_orders,
                        SUM(CASE WHEN phone_order_number > 1 THEN 1 ELSE 0 END) AS returning_orders
                    FROM ranked_orders
                    WHERE created_at >= $${paramOffset + 1}::timestamp
                      AND created_at < $${paramOffset + 2}::timestamp
                      AND assigned_to_id IN (
                          SELECT id FROM users WHERE department_id IN (${kdPh}) AND status = 'active'
                      )
                    GROUP BY assigned_to_id
                `,
                params: [...allDeptIds, startDate, endDate]
            };
        };

        const currentQ = buildStatsQuery(current.start, current.end);
        const previousQ = buildStatsQuery(previous.start, previous.end);

        const [currentStats, previousStats] = await Promise.all([
            db.all(currentQ.sql, currentQ.params),
            db.all(previousQ.sql, previousQ.params)
        ]);

        // ===== 4. Build lookup maps =====
        const currentMap = {};
        currentStats.forEach(s => { currentMap[s.employee_id] = s; });
        const previousMap = {};
        previousStats.forEach(s => { previousMap[s.employee_id] = s; });

        function calcGroup(empIds, statsMap) {
            let total = 0, newO = 0, retO = 0;
            empIds.forEach(id => {
                const s = statsMap[id];
                if (s) {
                    total += Number(s.total_orders);
                    newO += Number(s.new_orders);
                    retO += Number(s.returning_orders);
                }
            });
            return {
                total, new: newO, returning: retO,
                rate: total > 0 ? Math.round(1000 * retO / total) / 10 : 0
            };
        }

        function calcTrend(cur, prev) {
            return { rate: Math.round(10 * (cur.rate - prev.rate)) / 10 };
        }

        // ===== 5. Build org hierarchy using DEPARTMENTS =====
        // Manager = head_user_id of root dept (P.Kinh Doanh) OR users with role quan_ly/quan_ly_cap_cao
        // Teams = child departments (parent_id = root)
        // Employees = users whose department_id = child dept id

        const managers = users.filter(u =>
            ['quan_ly', 'quan_ly_cap_cao'].includes(u.role)
        );

        // For each manager, find which child departments they manage
        // A manager "manages" a child dept if: dept.head_user_id = manager.id
        // OR: the child dept doesn't have a specific head and falls under the root managed by this manager
        const groups = [];
        const processedDeptIds = new Set();

        for (const mgr of managers) {
            // Find child depts this manager heads
            const mgrChildDepts = childDepts.filter(d => d.head_user_id === mgr.id);

            // If manager doesn't head any child depts, check if they head the root
            if (mgrChildDepts.length === 0 && rootDept.head_user_id !== mgr.id) {
                // This manager has no departments — skip or put in unassigned
                continue;
            }

            // If manager is head of root, they manage ALL child depts not headed by another manager
            let managedDepts;
            if (rootDept.head_user_id === mgr.id) {
                // Root manager → manages all unassigned child depts + their own child depts
                managedDepts = childDepts.filter(d =>
                    d.head_user_id === mgr.id ||
                    !d.head_user_id ||
                    !managers.some(m => m.id === d.head_user_id && m.id !== mgr.id)
                );
            } else {
                managedDepts = mgrChildDepts;
            }

            const teamsArr = [];
            for (const dept of managedDepts) {
                processedDeptIds.add(dept.id);

                // Find employees in this team/dept (excluding managers)
                const deptEmployees = users.filter(u =>
                    u.department_id === dept.id &&
                    !['quan_ly', 'quan_ly_cap_cao', 'giam_doc'].includes(u.role)
                );

                // Find team leader (truong_phong in this dept, or dept.head_user_id)
                const leaderUser = dept.head_user_id ? users.find(u => u.id === dept.head_user_id) : null;
                const leaderName = leaderUser ? leaderUser.full_name : null;

                const empIds = deptEmployees.map(e => e.id);
                const curStats = calcGroup(empIds, currentMap);
                const prevStats = calcGroup(empIds, previousMap);

                teamsArr.push({
                    team_id: dept.id,
                    name: dept.name,
                    leader_id: dept.head_user_id,
                    leader_name: leaderName,
                    current: curStats,
                    previous: prevStats,
                    trend: calcTrend(curStats, prevStats),
                    employees: deptEmployees.map(emp => {
                        const ec = calcGroup([emp.id], currentMap);
                        const ep = calcGroup([emp.id], previousMap);
                        return {
                            user_id: emp.id,
                            name: emp.full_name,
                            role: emp.role,
                            current: ec,
                            previous: ep
                        };
                    })
                });
            }

            // Calc manager-level totals from all their teams' employees
            const allMgrEmpIds = [];
            teamsArr.forEach(t => t.employees.forEach(e => allMgrEmpIds.push(e.user_id)));

            const mgrCur = calcGroup(allMgrEmpIds, currentMap);
            const mgrPrev = calcGroup(allMgrEmpIds, previousMap);

            groups.push({
                type: 'manager',
                user_id: mgr.id,
                name: mgr.full_name,
                role: mgr.role,
                current: mgrCur,
                previous: mgrPrev,
                trend: calcTrend(mgrCur, mgrPrev),
                teams: teamsArr
            });
        }

        // Handle child depts not assigned to any manager
        const unprocessedDepts = childDepts.filter(d => !processedDeptIds.has(d.id));
        if (unprocessedDepts.length > 0) {
            const teamsArr = [];
            for (const dept of unprocessedDepts) {
                const deptEmployees = users.filter(u =>
                    u.department_id === dept.id &&
                    !['quan_ly', 'quan_ly_cap_cao', 'giam_doc'].includes(u.role)
                );
                const leaderUser = dept.head_user_id ? users.find(u => u.id === dept.head_user_id) : null;
                const empIds = deptEmployees.map(e => e.id);
                const curStats = calcGroup(empIds, currentMap);
                const prevStats = calcGroup(empIds, previousMap);

                teamsArr.push({
                    team_id: dept.id,
                    name: dept.name,
                    leader_id: dept.head_user_id,
                    leader_name: leaderUser ? leaderUser.full_name : null,
                    current: curStats,
                    previous: prevStats,
                    trend: calcTrend(curStats, prevStats),
                    employees: deptEmployees.map(emp => {
                        const ec = calcGroup([emp.id], currentMap);
                        const ep = calcGroup([emp.id], previousMap);
                        return { user_id: emp.id, name: emp.full_name, role: emp.role, current: ec, previous: ep };
                    })
                });
            }

            const allIds = [];
            teamsArr.forEach(t => t.employees.forEach(e => allIds.push(e.user_id)));
            const uCur = calcGroup(allIds, currentMap);
            const uPrev = calcGroup(allIds, previousMap);

            groups.push({
                type: 'unassigned',
                user_id: null,
                name: 'Chưa phân Quản Lý',
                role: null,
                current: uCur,
                previous: uPrev,
                trend: calcTrend(uCur, uPrev),
                teams: teamsArr
            });
        }

        // Handle users in root dept (department_id = 1) who are not managers — "Chưa phân Team"
        const rootDeptUsers = users.filter(u =>
            u.department_id === rootDept.id &&
            !['quan_ly', 'quan_ly_cap_cao', 'giam_doc'].includes(u.role)
        );
        if (rootDeptUsers.length > 0) {
            const empIds = rootDeptUsers.map(e => e.id);
            const curStats = calcGroup(empIds, currentMap);
            const prevStats = calcGroup(empIds, previousMap);

            // Add to first manager group, or create a separate one
            const noTeamEntry = {
                team_id: null,
                name: 'Chưa phân Team',
                leader_id: null,
                leader_name: null,
                current: curStats,
                previous: prevStats,
                trend: calcTrend(curStats, prevStats),
                employees: rootDeptUsers.map(emp => {
                    const ec = calcGroup([emp.id], currentMap);
                    const ep = calcGroup([emp.id], previousMap);
                    return { user_id: emp.id, name: emp.full_name, role: emp.role, current: ec, previous: ep };
                })
            };

            if (groups.length > 0 && groups[0].type === 'manager') {
                groups[0].teams.push(noTeamEntry);
                // Recalc manager totals
                const allIds = [];
                groups[0].teams.forEach(t => t.employees.forEach(e => allIds.push(e.user_id)));
                groups[0].current = calcGroup(allIds, currentMap);
                groups[0].previous = calcGroup(allIds, previousMap);
                groups[0].trend = calcTrend(groups[0].current, groups[0].previous);
            } else {
                groups.push({
                    type: 'unassigned',
                    user_id: null,
                    name: 'Chưa phân Quản Lý',
                    role: null,
                    current: curStats,
                    previous: prevStats,
                    trend: calcTrend(curStats, prevStats),
                    teams: [noTeamEntry]
                });
            }
        }

        // Summary (all KD employees, excluding GĐ)
        const allKDIds = users
            .filter(u => !['giam_doc'].includes(u.role))
            .map(u => u.id);
        const summCur = calcGroup(allKDIds, currentMap);
        const summPrev = calcGroup(allKDIds, previousMap);

        return {
            period: { type, label: current.label, start: current.start, end: current.end },
            previous: { label: previous.label, start: previous.start, end: previous.end },
            summary: {
                current: summCur,
                previous: summPrev,
                trend: {
                    total: summCur.total - summPrev.total,
                    new: summCur.new - summPrev.new,
                    returning: summCur.returning - summPrev.returning,
                    rate: Math.round(10 * (summCur.rate - summPrev.rate)) / 10
                }
            },
            groups
        };
    });

    // ===== Detail API: Get individual orders for an employee =====
    fastify.get('/api/reports/customer-retention/detail', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, period = 'month', date } = request.query;
        if (!user_id) return { error: 'Thiếu user_id' };

        const { current } = parsePeriod(period, date);

        const rows = await db.all(`
            WITH completed_orders AS (
                SELECT
                    oc.id AS order_id,
                    oc.order_code,
                    oc.customer_id,
                    oc.created_at,
                    c.phone,
                    c.customer_name,
                    c.assigned_to_id
                FROM order_codes oc
                JOIN customers c ON oc.customer_id = c.id
                WHERE c.phone IS NOT NULL AND c.phone != ''
                  AND COALESCE(c.cancel_approved, 0) != 1
                  AND EXISTS (
                      SELECT 1 FROM consultation_logs cl
                      WHERE cl.customer_id = oc.customer_id
                        AND cl.log_type = 'hoan_thanh'
                  )
            ),
            ranked_orders AS (
                SELECT
                    order_id,
                    order_code,
                    customer_id,
                    assigned_to_id,
                    created_at,
                    phone,
                    customer_name,
                    ROW_NUMBER() OVER (
                        PARTITION BY phone
                        ORDER BY created_at ASC
                    ) AS phone_order_number
                FROM completed_orders
            )
            SELECT
                order_id,
                order_code,
                customer_id,
                customer_name,
                phone,
                created_at,
                phone_order_number,
                CASE WHEN phone_order_number = 1 THEN 'new' ELSE 'returning' END AS order_type
            FROM ranked_orders
            WHERE assigned_to_id = $1
              AND created_at >= $2::timestamp
              AND created_at < $3::timestamp
            ORDER BY created_at DESC
        `, [user_id, current.start, current.end]);

        return {
            period: current,
            user_id: Number(user_id),
            total: rows.length,
            new_count: rows.filter(r => r.order_type === 'new').length,
            returning_count: rows.filter(r => r.order_type === 'returning').length,
            orders: rows.map(r => ({
                order_id: r.order_id,
                customer_id: r.customer_id,
                customer_name: r.customer_name,
                phone: r.phone,
                order_code: r.order_code || '-',
                date: r.created_at,
                order_number: r.phone_order_number,
                type: r.order_type
            }))
        };
    });
};
