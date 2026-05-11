// ========== CUSTOMER RETENTION REPORT — Khách Mới vs Khách Cũ Quay Lại ==========
// Logic: Dùng ROW_NUMBER() OVER (PARTITION BY phone) trên consultation_logs (chot_don)
// phone_order_number = 1 → Khách MỚI, > 1 → Khách CŨ quay lại
// Scope: Chỉ P.Kinh Doanh (department id=1 + children)
// ★ Teams = child departments (parent_id = 1), NOT the "teams" table

const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function(fastify) {

    // ===== Helper: Parse period params into date ranges =====
    function parsePeriod(period, dateStr, opts) {
        let current = {}, previous = {};
        const now = new Date();

        // Custom date range: startDate & endDate passed directly
        if (period === 'custom' && opts && opts.startDate && opts.endDate) {
            current.start = opts.startDate;
            // endDate is inclusive — add 1 day for the < comparison
            const endD = new Date(opts.endDate + 'T00:00:00');
            endD.setDate(endD.getDate() + 1);
            current.end = `${endD.getFullYear()}-${String(endD.getMonth()+1).padStart(2,'0')}-${String(endD.getDate()).padStart(2,'0')}`;
            current.label = `${opts.startDate} → ${opts.endDate}`;

            // Previous = same duration before startDate
            const startD = new Date(opts.startDate + 'T00:00:00');
            const durationMs = endD.getTime() - startD.getTime();
            const prevEnd = new Date(startD);
            const prevStart = new Date(startD.getTime() - durationMs);
            previous.start = `${prevStart.getFullYear()}-${String(prevStart.getMonth()+1).padStart(2,'0')}-${String(prevStart.getDate()).padStart(2,'0')}`;
            previous.end = current.start;
            previous.label = `prev`;
            return { current, previous, type: 'custom' };
        }

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
                // ISO week to date
                const jan4 = new Date(y, 0, 4);
                const dayOfWeek = jan4.getDay() || 7;
                dateObj = new Date(jan4);
                dateObj.setDate(jan4.getDate() - dayOfWeek + 1 + (w - 1) * 7);
            } else {
                dateObj = new Date(now);
                const day = dateObj.getDay() || 7;
                dateObj.setDate(dateObj.getDate() - day + 1); // Monday
            }
            dateObj.setHours(0,0,0,0);
            const y = dateObj.getFullYear(), m = dateObj.getMonth()+1, d = dateObj.getDate();
            current.start = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const endDate = new Date(dateObj); endDate.setDate(endDate.getDate() + 7);
            current.end = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,'0')}-${String(endDate.getDate()).padStart(2,'0')}`;
            // ISO week number
            const jan1 = new Date(y, 0, 1);
            const weekNum = Math.ceil(((dateObj - jan1) / 86400000 + jan1.getDay() + 1) / 7);
            current.label = `Tuần ${weekNum}/${y}`;
            current._weekStr = `${y}-W${weekNum}`;

            const prevStart = new Date(dateObj); prevStart.setDate(prevStart.getDate() - 7);
            previous.start = `${prevStart.getFullYear()}-${String(prevStart.getMonth()+1).padStart(2,'0')}-${String(prevStart.getDate()).padStart(2,'0')}`;
            previous.end = current.start;
            previous.label = `Tuần ${weekNum - 1 > 0 ? weekNum - 1 : 52}/${weekNum - 1 > 0 ? y : y - 1}`;
        } else if (period === 'month') {
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
                            c.assigned_to_id,
                            COALESCE(oi_sum.revenue, 0) AS revenue
                        FROM order_codes oc
                        JOIN customers c ON oc.customer_id = c.id
                        LEFT JOIN LATERAL (
                            SELECT COALESCE(SUM(total), 0) AS revenue FROM order_items WHERE order_code_id = oc.id
                        ) oi_sum ON true
                        WHERE c.phone IS NOT NULL AND c.phone != ''
                          AND COALESCE(c.cancel_approved, 0) != 1
                          AND COALESCE(oc.status, 'active') != 'cancelled'
                          AND EXISTS (
                              SELECT 1 FROM consultation_logs cl
                              WHERE cl.customer_id = oc.customer_id
                                AND cl.log_type = 'chot_don'
                          )
                    ),
                    ranked_orders AS (
                        SELECT
                            order_id,
                            customer_id,
                            assigned_to_id,
                            created_at,
                            phone,
                            revenue,
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
                        SUM(CASE WHEN phone_order_number > 1 THEN 1 ELSE 0 END) AS returning_orders,
                        COALESCE(SUM(revenue), 0) AS total_revenue
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
            let total = 0, newO = 0, retO = 0, revenue = 0;
            empIds.forEach(id => {
                const s = statsMap[id];
                if (s) {
                    total += Number(s.total_orders);
                    newO += Number(s.new_orders);
                    retO += Number(s.returning_orders);
                    revenue += Number(s.total_revenue || 0);
                }
            });
            return {
                total, new: newO, returning: retO, revenue,
                rate: total > 0 ? Math.round(1000 * retO / total) / 10 : 0
            };
        }

        function calcTrend(cur, prev) {
            const revPct = prev.revenue > 0 ? Math.round(1000 * (cur.revenue - prev.revenue) / prev.revenue) / 10 : (cur.revenue > 0 ? 100 : 0);
            return {
                total: cur.total - prev.total,
                new: cur.new - prev.new,
                returning: cur.returning - prev.returning,
                rate: Math.round(10 * (cur.rate - prev.rate)) / 10,
                revenue: cur.revenue - prev.revenue,
                revenue_pct: revPct
            };
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
        const _otherManagers = []; // Non-head managers in root dept

        for (const mgr of managers) {
            // Find child depts this manager heads
            const mgrChildDepts = childDepts.filter(d => d.head_user_id === mgr.id);

            // If manager doesn't head any child depts AND doesn't head root dept
            // BUT belongs to root dept → collect to inject into root manager's group later
            if (mgrChildDepts.length === 0 && rootDept.head_user_id !== mgr.id) {
                if (mgr.department_id === rootDept.id) {
                    const mgrPersonalCur = calcGroup([mgr.id], currentMap);
                    const mgrPersonalPrev = calcGroup([mgr.id], previousMap);
                    _otherManagers.push({
                        user_id: mgr.id,
                        name: mgr.full_name,
                        role: mgr.role,
                        current: mgrPersonalCur,
                        previous: mgrPersonalPrev,
                        trend: calcTrend(mgrPersonalCur, mgrPersonalPrev)
                    });
                }
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
                            previous: ep,
                            trend: calcTrend(ec, ep)
                        };
                    })
                });
            }

            // Calc manager-level totals from all their teams' employees + manager's own data
            const allMgrEmpIds = [];
            teamsArr.forEach(t => t.employees.forEach(e => allMgrEmpIds.push(e.user_id)));

            // Include manager's own stats in the totals
            const allMgrEmpIdsWithSelf = [...allMgrEmpIds, mgr.id];

            const mgrCur = calcGroup(allMgrEmpIdsWithSelf, currentMap);
            const mgrPrev = calcGroup(allMgrEmpIdsWithSelf, previousMap);

            // Manager's personal stats (separate from team totals)
            const mgrPersonalCur = calcGroup([mgr.id], currentMap);
            const mgrPersonalPrev = calcGroup([mgr.id], previousMap);

            groups.push({
                type: 'manager',
                user_id: mgr.id,
                name: mgr.full_name,
                dept_name: rootDept.head_user_id === mgr.id ? rootDept.name : (managedDepts[0]?.name || mgr.full_name),
                role: mgr.role,
                current: mgrCur,
                previous: mgrPrev,
                trend: calcTrend(mgrCur, mgrPrev),
                // Manager's own performance data
                personal: {
                    current: mgrPersonalCur,
                    previous: mgrPersonalPrev,
                    trend: calcTrend(mgrPersonalCur, mgrPersonalPrev)
                },
                teams: teamsArr
            });
        }

        // Inject otherManagers into root manager's group and recalc totals
        if (_otherManagers.length > 0) {
            const rootGroup = groups.find(g => g.type === 'manager' && g.user_id === rootDept.head_user_id);
            if (rootGroup) {
                rootGroup.otherManagers = _otherManagers;
                // Recalc root group totals to include other managers' stats
                const otherMgrIds = _otherManagers.map(m => m.user_id);
                const allIds = [];
                rootGroup.teams.forEach(t => t.employees.forEach(e => allIds.push(e.user_id)));
                allIds.push(rootGroup.user_id, ...otherMgrIds);
                rootGroup.current = calcGroup(allIds, currentMap);
                rootGroup.previous = calcGroup(allIds, previousMap);
                rootGroup.trend = calcTrend(rootGroup.current, rootGroup.previous);
            }
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
                        return { user_id: emp.id, name: emp.full_name, role: emp.role, current: ec, previous: ep, trend: calcTrend(ec, ep) };
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

        // ===== PER-EMPLOYEE CONVERSION RATE =====
        // Query: KH được giao per employee in current period
        const assignedPerEmp = allKDIds.length > 0 ? await db.all(`
            SELECT assigned_to_id AS uid, COUNT(DISTINCT id) AS assigned
            FROM customers
            WHERE assigned_to_id IN (${allKDIds.map((_, i) => `$${i + 1}`).join(',')})
              AND created_at >= $${allKDIds.length + 1}::timestamp
              AND created_at < $${allKDIds.length + 2}::timestamp
            GROUP BY assigned_to_id
        `, [...allKDIds, current.start, current.end]) : [];

        // Build conversion map: uid -> { assigned, completed, rate }
        const conversionMap = {};
        assignedPerEmp.forEach(r => {
            const uid = r.uid;
            const assigned = parseInt(r.assigned);
            const completed = currentMap[uid] ? parseInt(currentMap[uid].total_orders) : 0;
            conversionMap[uid] = {
                assigned,
                completed,
                rate: assigned > 0 ? Math.round(1000 * completed / assigned) / 10 : 0
            };
        });
        // Ensure all employees have an entry
        allKDIds.forEach(uid => {
            if (!conversionMap[uid]) {
                const completed = currentMap[uid] ? parseInt(currentMap[uid].total_orders) : 0;
                conversionMap[uid] = { assigned: 0, completed, rate: 0 };
            }
        });

        // ===== LOAD KPI TARGETS for current period =====
        const kpiTargets = await db.all(
            `SELECT target_type, target_id, metric, target_value
             FROM kpi_targets
             WHERE period_type = $1 AND period_value = $2`,
            [type, current.label]
        );
        const kpiMap = {};
        kpiTargets.forEach(k => {
            const key = `${k.target_type}_${k.target_id}_${k.metric}`;
            kpiMap[key] = parseFloat(k.target_value);
        });

        return {
            period: { type, label: current.label, start: current.start, end: current.end },
            previous: { label: previous.label, start: previous.start, end: previous.end },
            summary: {
                current: summCur,
                previous: summPrev,
                trend: calcTrend(summCur, summPrev)
            },
            groups,
            conversionMap,
            kpiMap
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
                    c.assigned_to_id,
                    COALESCE(oi_sum.revenue, 0) AS revenue,
                    ref.full_name AS referrer_name
                FROM order_codes oc
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(SUM(total), 0) AS revenue FROM order_items WHERE order_code_id = oc.id
                ) oi_sum ON true
                LEFT JOIN users ref ON ref.id = c.referrer_id AND ref.role = 'tkaffiliate'
                WHERE c.phone IS NOT NULL AND c.phone != ''
                  AND COALESCE(c.cancel_approved, 0) != 1
                  AND COALESCE(oc.status, 'active') != 'cancelled'
                  AND EXISTS (
                      SELECT 1 FROM consultation_logs cl
                      WHERE cl.customer_id = oc.customer_id
                        AND cl.log_type = 'chot_don'
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
                    revenue,
                    referrer_name,
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
                revenue,
                referrer_name,
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
                revenue: parseFloat(r.revenue || 0),
                order_number: r.phone_order_number,
                type: r.order_type,
                referrer_name: r.referrer_name || null
            }))
        };
    });

    // ===== Chart API: Monthly/Quarterly/Yearly breakdown =====
    fastify.get('/api/reports/customer-retention/chart', { preHandler: [authenticate] }, async (request, reply) => {
        const { year, type = 'all', target_id, chart_period = 'month' } = request.query;
        const yr = parseInt(year) || new Date().getFullYear();

        // Get KD hierarchy for dropdown options
        const allDepts = await db.all(
            "SELECT id, name, parent_id, head_user_id FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id"
        );
        const rootDept = allDepts.find(d => d.id === 1) || allDepts[0];
        const childDepts = allDepts.filter(d => d.parent_id === rootDept?.id);
        const allDeptIds = allDepts.map(d => d.id);

        const users = allDeptIds.length > 0 ? await db.all(
            `SELECT id, full_name, department_id FROM users WHERE department_id IN (${allDeptIds.map((_, i) => `$${i + 1}`).join(',')}) AND status = 'active' ORDER BY full_name`,
            allDeptIds
        ) : [];

        // Build WHERE clause for target
        let employeeFilter = '';
        let filterParams = [];
        if (type === 'employee' && target_id) {
            employeeFilter = `AND c.assigned_to_id = $1`;
            filterParams = [parseInt(target_id)];
        } else if (type === 'team' && target_id) {
            const teamUsers = users.filter(u => u.department_id === parseInt(target_id));
            if (teamUsers.length === 0) return { data: [], options: { teams: childDepts, employees: users } };
            const ph = teamUsers.map((_, i) => `$${i + 1}`).join(',');
            employeeFilter = `AND c.assigned_to_id IN (${ph})`;
            filterParams = teamUsers.map(u => u.id);
        } else {
            if (users.length === 0) return { data: [], options: { teams: childDepts, employees: users } };
            const ph = users.map((_, i) => `$${i + 1}`).join(',');
            employeeFilter = `AND c.assigned_to_id IN (${ph})`;
            filterParams = users.map(u => u.id);
        }

        const pStart = filterParams.length + 1;
        const pEnd = filterParams.length + 2;

        // Determine grouping expression
        let groupExpr, groupAlias;
        if (chart_period === 'quarter') {
            groupExpr = `EXTRACT(QUARTER FROM created_at)::int`;
            groupAlias = 'quarter';
        } else if (chart_period === 'year') {
            groupExpr = `EXTRACT(YEAR FROM created_at)::int`;
            groupAlias = 'yr';
        } else {
            groupExpr = `EXTRACT(MONTH FROM created_at)::int`;
            groupAlias = 'month';
        }

        const rows = await db.all(`
            WITH completed_orders AS (
                SELECT
                    oc.id AS order_id,
                    oc.created_at,
                    c.phone,
                    c.assigned_to_id,
                    COALESCE(oi_sum.revenue, 0) AS revenue
                FROM order_codes oc
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(SUM(total), 0) AS revenue FROM order_items WHERE order_code_id = oc.id
                ) oi_sum ON true
                WHERE c.phone IS NOT NULL AND c.phone != ''
                  AND COALESCE(c.cancel_approved, 0) != 1
                  AND COALESCE(oc.status, 'active') != 'cancelled'
                  ${employeeFilter}
                  AND EXISTS (
                      SELECT 1 FROM consultation_logs cl
                      WHERE cl.customer_id = oc.customer_id
                        AND cl.log_type = 'chot_don'
                  )
            ),
            ranked_orders AS (
                SELECT
                    order_id,
                    created_at,
                    phone,
                    revenue,
                    ROW_NUMBER() OVER (
                        PARTITION BY phone
                        ORDER BY created_at ASC
                    ) AS phone_order_number
                FROM completed_orders
            )
            SELECT
                ${groupExpr} AS bucket,
                COUNT(*) AS total,
                SUM(CASE WHEN phone_order_number = 1 THEN 1 ELSE 0 END) AS new_orders,
                SUM(CASE WHEN phone_order_number > 1 THEN 1 ELSE 0 END) AS returning_orders,
                COALESCE(SUM(revenue), 0) AS total_revenue
            FROM ranked_orders
            WHERE created_at >= $${pStart}::timestamp
              AND created_at < $${pEnd}::timestamp
            GROUP BY ${groupExpr}
            ORDER BY bucket
        `, [...filterParams, `${yr}-01-01`, `${yr + 1}-01-01`]);

        // Fill buckets
        const data = [];
        let bucketCount = 12, labelFn = b => `T${b}`;
        if (chart_period === 'quarter') {
            bucketCount = 4;
            labelFn = b => `Q${b}`;
        } else if (chart_period === 'year') {
            bucketCount = 1;
            labelFn = () => `${yr}`;
        }

        for (let b = 1; b <= bucketCount; b++) {
            const row = rows.find(r => r.bucket === b || (chart_period === 'year' && r.bucket === yr));
            const total = row ? parseInt(row.total) : 0;
            const newO = row ? parseInt(row.new_orders) : 0;
            const retO = row ? parseInt(row.returning_orders) : 0;
            const rev = row ? parseFloat(row.total_revenue) : 0;
            const rate = total > 0 ? Math.round(1000 * retO / total) / 10 : 0;
            data.push({ bucket: b, label: labelFn(b), total, new: newO, returning: retO, rate, revenue: rev });
        }

        // Build structured options: teams with nested employees
        const teamOptions = childDepts.map(d => ({
            id: d.id,
            name: d.name,
            employees: users.filter(u => u.department_id === d.id).map(u => ({ id: u.id, name: u.full_name }))
        }));

        return {
            year: yr,
            chart_period,
            type,
            target_id: target_id ? parseInt(target_id) : null,
            data,
            options: {
                teams: teamOptions,
                employees: users.map(u => ({ id: u.id, name: u.full_name, department_id: u.department_id }))
            }
        };
    });

    // ===== Dashboard Advanced API: Leaderboard, Alerts, Conversion, Cancel, Processing Time, Top Customers =====
    fastify.get('/api/reports/customer-retention/advanced', { preHandler: [authenticate] }, async (request, reply) => {
        const { period = 'month', date, startDate, endDate } = request.query;
        const { current, previous } = parsePeriod(period, date, { startDate, endDate });

        // Get KD hierarchy
        const allDepts = await db.all(
            "SELECT id, name, parent_id FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id"
        );
        const rootDept = allDepts.find(d => d.id === 1) || allDepts[0];
        const childDepts = allDepts.filter(d => d.parent_id === rootDept?.id);
        const allDeptIds = allDepts.map(d => d.id);

        const users = allDeptIds.length > 0 ? await db.all(
            `SELECT id, full_name, department_id, role FROM users WHERE department_id IN (${allDeptIds.map((_, i) => `$${i + 1}`).join(',')}) AND status = 'active' AND role NOT IN ('giam_doc') ORDER BY full_name`,
            allDeptIds
        ) : [];
        const userIds = users.map(u => u.id);
        if (userIds.length === 0) return { leaderboard: [], alerts: [], conversion: {}, cancel: {}, processing: {}, topCustomers: [] };

        const ph = userIds.map((_, i) => `$${i + 1}`).join(',');
        const pStart = userIds.length + 1;
        const pEnd = userIds.length + 2;

        console.log('[ADV-API] period:', period, '| current.start:', current.start, '| current.end:', current.end, '| startDate:', startDate, '| endDate:', endDate);

        // === 1. LEADERBOARD: Top NV by revenue, orders, retention ===
        const leaderRows = await db.all(`
            WITH completed AS (
                SELECT oc.id AS order_id, oc.created_at, c.phone, c.assigned_to_id,
                    COALESCE(oi.rev, 0) AS revenue
                FROM order_codes oc
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN LATERAL (SELECT COALESCE(SUM(total), 0) AS rev FROM order_items WHERE order_code_id = oc.id) oi ON true
                WHERE c.assigned_to_id IN (${ph})
                  AND c.phone IS NOT NULL AND c.phone != ''
                  AND COALESCE(c.cancel_approved, 0) != 1
                  AND COALESCE(oc.status, 'active') != 'cancelled'
                  AND oc.created_at >= $${pStart}::timestamp AND oc.created_at < $${pEnd}::timestamp
                  AND EXISTS (SELECT 1 FROM consultation_logs cl WHERE cl.customer_id = oc.customer_id AND cl.log_type = 'chot_don')
            ),
            ranked AS (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at) AS pn
                FROM completed
            )
            SELECT assigned_to_id AS uid,
                COUNT(*) AS total_orders,
                SUM(CASE WHEN pn = 1 THEN 1 ELSE 0 END) AS new_orders,
                SUM(CASE WHEN pn > 1 THEN 1 ELSE 0 END) AS returning_orders,
                COALESCE(SUM(revenue), 0) AS total_revenue
            FROM ranked
            GROUP BY assigned_to_id
        `, [...userIds, current.start, current.end]);

        const leaderboard = leaderRows.map(r => {
            const u = users.find(u2 => u2.id === r.uid);
            const dept = childDepts.find(d => d.id === u?.department_id);
            const total = parseInt(r.total_orders);
            const ret = parseInt(r.returning_orders);
            return {
                user_id: r.uid,
                name: u?.full_name || '?',
                team: dept?.name || '',
                total_orders: total,
                new_orders: parseInt(r.new_orders),
                returning_orders: ret,
                rate: total > 0 ? Math.round(1000 * ret / total) / 10 : 0,
                revenue: parseFloat(r.total_revenue)
            };
        });

        // Add employees who have NO orders (so they still appear in the list)
        const leaderIds = new Set(leaderboard.map(l => l.user_id));
        users.forEach(u => {
            if (!leaderIds.has(u.id)) {
                const dept = childDepts.find(d => d.id === u.department_id);
                leaderboard.push({
                    user_id: u.id,
                    name: u.full_name || '?',
                    team: dept?.name || '',
                    total_orders: 0, new_orders: 0, returning_orders: 0,
                    rate: 0, revenue: 0
                });
            }
        });

        // === 1b. AFFILIATE NEW: Count actual tkaffiliate accounts managed by each employee ===
        const affRows = await db.all(`
            SELECT u.managed_by_user_id AS uid, COUNT(*) AS aff_new
            FROM users u
            WHERE u.role = 'tkaffiliate'
              AND u.status IN ('active','locked')
              AND u.managed_by_user_id IN (${ph})
              AND u.created_at >= $${pStart}::timestamp AND u.created_at < $${pEnd}::timestamp
            GROUP BY u.managed_by_user_id
        `, [...userIds, current.start, current.end]);
        const affMap = {};
        affRows.forEach(r => { affMap[r.uid] = parseInt(r.aff_new); });
        leaderboard.forEach(l => { l.affiliate_new = affMap[l.user_id] || 0; });

        // === 1c. PREVIOUS PERIOD comparison data ===
        const prevLeaderRows = await db.all(`
            WITH completed AS (
                SELECT oc.id AS order_id, oc.created_at, c.phone, c.assigned_to_id,
                    COALESCE(oi.rev, 0) AS revenue
                FROM order_codes oc
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN LATERAL (SELECT COALESCE(SUM(total), 0) AS rev FROM order_items WHERE order_code_id = oc.id) oi ON true
                WHERE c.assigned_to_id IN (${ph})
                  AND c.phone IS NOT NULL AND c.phone != ''
                  AND COALESCE(c.cancel_approved, 0) != 1
                  AND COALESCE(oc.status, 'active') != 'cancelled'
                  AND oc.created_at >= $${pStart}::timestamp AND oc.created_at < $${pEnd}::timestamp
                  AND EXISTS (SELECT 1 FROM consultation_logs cl WHERE cl.customer_id = oc.customer_id AND cl.log_type = 'chot_don')
            ),
            ranked AS (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at) AS pn
                FROM completed
            )
            SELECT assigned_to_id AS uid,
                COUNT(*) AS total_orders,
                SUM(CASE WHEN pn > 1 THEN 1 ELSE 0 END) AS returning_orders,
                COALESCE(SUM(revenue), 0) AS total_revenue
            FROM ranked
            GROUP BY assigned_to_id
        `, [...userIds, previous.start, previous.end]);

        const prevAffRows = await db.all(`
            SELECT u.managed_by_user_id AS uid, COUNT(*) AS aff_new
            FROM users u
            WHERE u.role = 'tkaffiliate'
              AND u.status IN ('active','locked')
              AND u.managed_by_user_id IN (${ph})
              AND u.created_at >= $${pStart}::timestamp AND u.created_at < $${pEnd}::timestamp
            GROUP BY u.managed_by_user_id
        `, [...userIds, previous.start, previous.end]);

        const prevMap = {};
        prevLeaderRows.forEach(r => {
            const total = parseInt(r.total_orders);
            const ret = parseInt(r.returning_orders);
            prevMap[r.uid] = {
                total_orders: total,
                revenue: parseFloat(r.total_revenue),
                rate: total > 0 ? Math.round(1000 * ret / total) / 10 : 0
            };
        });
        const prevAffMap = {};
        prevAffRows.forEach(r => { prevAffMap[r.uid] = parseInt(r.aff_new); });

        // Merge previous data into leaderboard
        leaderboard.forEach(l => {
            const prev = prevMap[l.user_id] || { total_orders: 0, revenue: 0, rate: 0 };
            const prevAff = prevAffMap[l.user_id] || 0;
            l.prev = {
                total_orders: prev.total_orders,
                revenue: prev.revenue,
                rate: prev.rate,
                affiliate_new: prevAff
            };
        });

        // === 2. ALERTS: NV inactive > 7 days, high cancel rate ===
        const alerts = [];
        const lastOrderRows = await db.all(`
            SELECT c.assigned_to_id AS uid, MAX(oc.created_at) AS last_order
            FROM order_codes oc
            JOIN customers c ON oc.customer_id = c.id
            WHERE c.assigned_to_id IN (${ph})
              AND EXISTS (SELECT 1 FROM consultation_logs cl WHERE cl.customer_id = oc.customer_id AND cl.log_type = 'chot_don')
            GROUP BY c.assigned_to_id
        `, userIds);

        const now = new Date();
        users.forEach(u => {
            const row = lastOrderRows.find(r => r.uid === u.id);
            if (!row || !row.last_order) {
                alerts.push({ type: 'no_order', user_id: u.id, name: u.full_name, team: childDepts.find(d => d.id === u.department_id)?.name || '', message: 'Chưa có đơn nào', severity: 'warning' });
            } else {
                const days = Math.floor((now - new Date(row.last_order)) / 86400000);
                if (days >= 7) {
                    alerts.push({ type: 'inactive', user_id: u.id, name: u.full_name, team: childDepts.find(d => d.id === u.department_id)?.name || '', message: `${days} ngày không có đơn mới`, severity: days >= 14 ? 'danger' : 'warning' });
                }
            }
        });

        // Cancel rate per employee
        const cancelRows = await db.all(`
            SELECT c.assigned_to_id AS uid,
                COUNT(*) AS total,
                SUM(CASE WHEN COALESCE(c.cancel_approved, 0) = 1 THEN 1 ELSE 0 END) AS cancelled
            FROM order_codes oc
            JOIN customers c ON oc.customer_id = c.id
            WHERE c.assigned_to_id IN (${ph})
              AND oc.created_at >= $${pStart}::timestamp AND oc.created_at < $${pEnd}::timestamp
            GROUP BY c.assigned_to_id
        `, [...userIds, current.start, current.end]);

        const cancelData = cancelRows.map(r => {
            const u = users.find(u2 => u2.id === r.uid);
            const total = parseInt(r.total);
            const cancelled = parseInt(r.cancelled);
            const rate = total > 0 ? Math.round(1000 * cancelled / total) / 10 : 0;
            if (rate >= 30) {
                alerts.push({ type: 'high_cancel', user_id: r.uid, name: u?.full_name || '?', team: childDepts.find(d => d.id === u?.department_id)?.name || '', message: `Tỷ lệ hủy ${rate}%`, severity: 'danger' });
            }
            return { user_id: r.uid, name: u?.full_name || '?', team: childDepts.find(d => d.id === u?.department_id)?.name || '', total, cancelled, rate };
        });

        // === 3. CONVERSION RATE: KH được giao vs đơn hoàn thành ===
        const assignedCount = await db.get(`
            SELECT COUNT(DISTINCT c.id) AS cnt FROM customers c
            WHERE c.assigned_to_id IN (${ph})
              AND c.created_at >= $${pStart}::timestamp AND c.created_at < $${pEnd}::timestamp
        `, [...userIds, current.start, current.end]);

        const completedCount = await db.get(`
            SELECT COUNT(DISTINCT oc.id) AS cnt FROM order_codes oc
            JOIN customers c ON oc.customer_id = c.id
            WHERE c.assigned_to_id IN (${ph})
              AND COALESCE(c.cancel_approved, 0) != 1
              AND COALESCE(oc.status, 'active') != 'cancelled'
              AND oc.created_at >= $${pStart}::timestamp AND oc.created_at < $${pEnd}::timestamp
              AND EXISTS (SELECT 1 FROM consultation_logs cl WHERE cl.customer_id = oc.customer_id AND cl.log_type = 'chot_don')
        `, [...userIds, current.start, current.end]);

        const assigned = parseInt(assignedCount?.cnt || 0);
        const completed = parseInt(completedCount?.cnt || 0);
        const conversionRate = assigned > 0 ? Math.round(1000 * completed / assigned) / 10 : 0;

        // === 4. AVG PROCESSING TIME ===
        const avgTimeRow = await db.get(`
            SELECT AVG(EXTRACT(EPOCH FROM (cl.created_at - c.created_at)) / 86400)::numeric(10,1) AS avg_days
            FROM consultation_logs cl
            JOIN customers c ON cl.customer_id = c.id
            WHERE c.assigned_to_id IN (${ph})
              AND cl.log_type = 'chot_don'
              AND cl.created_at >= $${pStart}::timestamp AND cl.created_at < $${pEnd}::timestamp
        `, [...userIds, current.start, current.end]);

        // === 5. TOP CUSTOMERS by revenue ===
        const topCust = await db.all(`
            SELECT c.customer_name, c.phone, c.assigned_to_id,
                COUNT(DISTINCT oc.id) AS order_count,
                COALESCE(SUM(oi.rev), 0) AS total_revenue
            FROM customers c
            JOIN order_codes oc ON oc.customer_id = c.id
            LEFT JOIN LATERAL (SELECT COALESCE(SUM(total), 0) AS rev FROM order_items WHERE order_code_id = oc.id) oi ON true
            WHERE c.assigned_to_id IN (${ph})
              AND c.phone IS NOT NULL AND c.phone != ''
              AND COALESCE(c.cancel_approved, 0) != 1
              AND COALESCE(oc.status, 'active') != 'cancelled'
              AND oc.created_at >= $${pStart}::timestamp AND oc.created_at < $${pEnd}::timestamp
              AND EXISTS (SELECT 1 FROM consultation_logs cl WHERE cl.customer_id = c.id AND cl.log_type = 'chot_don')
            GROUP BY c.id, c.customer_name, c.phone, c.assigned_to_id
            ORDER BY total_revenue DESC
            LIMIT 10
        `, [...userIds, current.start, current.end]);

        // === 6. TEAM COMPARISON ===
        const teamComparison = childDepts.map(dept => {
            const teamUserIds = users.filter(u => u.department_id === dept.id).map(u => u.id);
            const teamLeader = leaderRows.filter(r => teamUserIds.includes(r.uid));
            const totalOrders = teamLeader.reduce((s, r) => s + parseInt(r.total_orders), 0);
            const totalRev = teamLeader.reduce((s, r) => s + parseFloat(r.total_revenue), 0);
            const totalRet = teamLeader.reduce((s, r) => s + parseInt(r.returning_orders), 0);
            const teamAff = leaderboard.filter(l => teamUserIds.includes(l.user_id)).reduce((s, l) => s + (l.affiliate_new || 0), 0);

            // Previous period per team
            const prevTeamLeader = prevLeaderRows.filter(r => teamUserIds.includes(r.uid));
            const prevTotalOrders = prevTeamLeader.reduce((s, r) => s + parseInt(r.total_orders), 0);
            const prevTotalRev = prevTeamLeader.reduce((s, r) => s + parseFloat(r.total_revenue), 0);
            const prevTotalRet = prevTeamLeader.reduce((s, r) => s + parseInt(r.returning_orders), 0);
            const prevTeamAff = teamUserIds.reduce((s, uid) => s + (prevAffMap[uid] || 0), 0);

            return {
                team_id: dept.id,
                name: dept.name,
                total_orders: totalOrders,
                new_orders: totalOrders - totalRet,
                revenue: totalRev,
                returning: totalRet,
                rate: totalOrders > 0 ? Math.round(1000 * totalRet / totalOrders) / 10 : 0,
                affiliate_new: teamAff,
                employee_count: teamUserIds.length,
                prev: {
                    total_orders: prevTotalOrders,
                    new_orders: prevTotalOrders - prevTotalRet,
                    revenue: prevTotalRev,
                    returning: prevTotalRet,
                    rate: prevTotalOrders > 0 ? Math.round(1000 * prevTotalRet / prevTotalOrders) / 10 : 0,
                    affiliate_new: prevTeamAff
                }
            };
        });

        // ===== PER-EMPLOYEE CONVERSION + KPI for Tab 2 =====
        const assignedPerEmpAdv = userIds.length > 0 ? await db.all(`
            SELECT assigned_to_id AS uid, COUNT(DISTINCT id) AS assigned
            FROM customers
            WHERE assigned_to_id IN (${ph})
              AND created_at >= $${pStart}::timestamp AND created_at < $${pEnd}::timestamp
            GROUP BY assigned_to_id
        `, [...userIds, current.start, current.end]) : [];

        const conversionMapAdv = {};
        assignedPerEmpAdv.forEach(r => {
            const uid = r.uid;
            const assigned = parseInt(r.assigned);
            const lbEntry = leaderboard.find(l => l.user_id === uid);
            const completed = lbEntry ? lbEntry.total_orders : 0;
            conversionMapAdv[uid] = { assigned, completed, rate: assigned > 0 ? Math.round(1000 * completed / assigned) / 10 : 0 };
        });
        userIds.forEach(uid => {
            if (!conversionMapAdv[uid]) {
                const lbEntry = leaderboard.find(l => l.user_id === uid);
                conversionMapAdv[uid] = { assigned: 0, completed: lbEntry ? lbEntry.total_orders : 0, rate: 0 };
            }
        });

        // Previous period conversion rate
        const prevAssignedAdv = userIds.length > 0 ? await db.all(`
            SELECT assigned_to_id AS uid, COUNT(DISTINCT id) AS assigned
            FROM customers
            WHERE assigned_to_id IN (${ph})
              AND created_at >= $${pStart}::timestamp AND created_at < $${pEnd}::timestamp
            GROUP BY assigned_to_id
        `, [...userIds, previous.start, previous.end]) : [];

        leaderboard.forEach(l => {
            if (!l.prev) l.prev = { total_orders: 0, revenue: 0, rate: 0, affiliate_new: 0 };
            const prevAssigned = prevAssignedAdv.find(r => r.uid === l.user_id);
            const pAssigned = prevAssigned ? parseInt(prevAssigned.assigned) : 0;
            const pCompleted = l.prev.total_orders;
            l.prev.conversion_rate = pAssigned > 0 ? Math.round(1000 * pCompleted / pAssigned) / 10 : 0;
        });

        const kpiTargetsAdv = await db.all(
            `SELECT target_type, target_id, metric, target_value FROM kpi_targets WHERE period_type = $1 AND period_value = $2`,
            [period, current.label]
        );
        const kpiMapAdv = {};
        kpiTargetsAdv.forEach(k => { kpiMapAdv[`${k.target_type}_${k.target_id}_${k.metric}`] = parseFloat(k.target_value); });

        return {
            leaderboard: {
                by_revenue: [...leaderboard].sort((a, b) => b.revenue - a.revenue),
                by_orders: [...leaderboard].sort((a, b) => b.total_orders - a.total_orders),
                by_affiliate: [...leaderboard].sort((a, b) => b.affiliate_new - a.affiliate_new),
                by_retention: [...leaderboard].sort((a, b) => b.rate - a.rate)
            },
            allEmployees: leaderboard,
            alerts: alerts.sort((a, b) => (a.severity === 'danger' ? 0 : 1) - (b.severity === 'danger' ? 0 : 1)),
            conversion: { assigned, completed, rate: conversionRate },
            cancel: cancelData,
            processing: { avg_days: parseFloat(avgTimeRow?.avg_days || 0) },
            topCustomers: topCust.map(r => {
                const emp = users.find(u => u.id === r.assigned_to_id);
                return { name: r.customer_name, phone: r.phone, assigned_to_id: r.assigned_to_id, orders: parseInt(r.order_count), revenue: parseFloat(r.total_revenue), employee: emp?.full_name || '?' };
            }),
            teamComparison,
            conversionMap: conversionMapAdv,
            kpiMap: kpiMapAdv,
            period: { type: period, label: current.label, start: current.start, end: current.end }
        };
    });
};
