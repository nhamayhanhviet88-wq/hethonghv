// ========== CUSTOMER RETENTION REPORT — Khách Mới vs Khách Cũ Quay Lại ==========
// Logic: Dùng ROW_NUMBER() OVER (PARTITION BY phone) trên consultation_logs (hoan_thanh)
// phone_order_number = 1 → Khách MỚI, > 1 → Khách CŨ quay lại
// Scope: Chỉ P.Kinh Doanh (department id=1 + children)

const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function(fastify) {

    // ===== Helper: Get all department IDs in P.Kinh Doanh tree =====
    async function getKDDeptIds() {
        const depts = await db.all(
            "SELECT id FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active'"
        );
        return depts.map(d => d.id);
    }

    // ===== Helper: Parse period params into date ranges =====
    function parsePeriod(period, dateStr) {
        let current = {}, previous = {};
        const now = new Date();

        if (period === 'month') {
            // dateStr = '2026-05' or auto
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

            // Previous month
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            previous.start = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
            previous.end = current.start;
            previous.label = `T${prevMonth}/${prevYear}`;
        } else if (period === 'quarter') {
            // dateStr = '2026-Q2' or auto
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

            // Previous quarter
            const prevQ = quarter === 1 ? 4 : quarter - 1;
            const prevY = quarter === 1 ? year - 1 : year;
            const prevStartMonth = (prevQ - 1) * 3 + 1;
            previous.start = `${prevY}-${String(prevStartMonth).padStart(2, '0')}-01`;
            previous.end = current.start;
            previous.label = `Q${prevQ}/${prevY}`;
        } else {
            // year — dateStr = '2026' or auto
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

        // Parse period
        const { current, previous, type } = parsePeriod(period, date);

        // Get KD department tree
        const kdDeptIds = await getKDDeptIds();
        if (kdDeptIds.length === 0) {
            return { period: { type, ...current }, previous, summary: { current: {}, previous: {} }, groups: [] };
        }

        const kdPh = kdDeptIds.map((_, i) => `$${i + 1}`).join(',');

        // ===== Core Query: ROW_NUMBER by phone (all-time) =====
        // Then filter by period + KD departments
        const buildStatsQuery = (startDate, endDate) => {
            const paramOffset = kdDeptIds.length;
            return {
                sql: `
                    WITH all_hoan_thanh AS (
                        SELECT
                            cl.id,
                            cl.customer_id,
                            c.assigned_to_id,
                            cl.created_at,
                            c.phone,
                            ROW_NUMBER() OVER (
                                PARTITION BY c.phone
                                ORDER BY cl.created_at ASC
                            ) AS phone_order_number
                        FROM consultation_logs cl
                        JOIN customers c ON cl.customer_id = c.id
                        WHERE cl.log_type = 'hoan_thanh'
                          AND c.phone IS NOT NULL AND c.phone != ''
                          AND COALESCE(c.cancel_approved, 0) != 1
                    )
                    SELECT
                        assigned_to_id AS employee_id,
                        COUNT(*) AS total_orders,
                        SUM(CASE WHEN phone_order_number = 1 THEN 1 ELSE 0 END) AS new_orders,
                        SUM(CASE WHEN phone_order_number > 1 THEN 1 ELSE 0 END) AS returning_orders
                    FROM all_hoan_thanh
                    WHERE created_at >= $${paramOffset + 1}::timestamp
                      AND created_at < $${paramOffset + 2}::timestamp
                      AND assigned_to_id IN (
                          SELECT id FROM users WHERE department_id IN (${kdPh}) AND status = 'active'
                      )
                    GROUP BY assigned_to_id
                `,
                params: [...kdDeptIds, startDate, endDate]
            };
        };

        // Run both current and previous period queries in parallel
        const currentQ = buildStatsQuery(current.start, current.end);
        const previousQ = buildStatsQuery(previous.start, previous.end);

        const [currentStats, previousStats, orgData] = await Promise.all([
            db.all(currentQ.sql, currentQ.params),
            db.all(previousQ.sql, previousQ.params),
            // Get org structure: departments + users + teams
            (async () => {
                const departments = await db.all(
                    `SELECT d.id, d.name, d.parent_id, d.head_user_id, d.display_order
                     FROM departments d
                     WHERE d.id IN (${kdPh}) AND d.status = 'active'
                     ORDER BY d.display_order, d.id`,
                    kdDeptIds
                );

                const users = await db.all(
                    `SELECT u.id, u.full_name, u.role, u.department_id, u.username
                     FROM users u
                     WHERE u.department_id IN (${kdPh}) AND u.status = 'active'
                     ORDER BY u.full_name`,
                    kdDeptIds
                );

                const teams = await db.all(
                    `SELECT t.id, t.name, t.leader_id, t.manager_id,
                            tm.user_id
                     FROM teams t
                     LEFT JOIN team_members tm ON tm.team_id = t.id
                     ORDER BY t.id`
                );

                return { departments, users, teams };
            })()
        ]);

        // Build lookup maps
        const currentMap = {};
        currentStats.forEach(s => { currentMap[s.employee_id] = s; });

        const previousMap = {};
        previousStats.forEach(s => { previousMap[s.employee_id] = s; });

        // Helper: calc stats for a set of employee IDs
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

        // Build team membership map
        const teamMap = {}; // team_id → { id, name, leader_id, manager_id, member_ids: [] }
        const userTeam = {}; // user_id → team_id
        orgData.teams.forEach(t => {
            if (!teamMap[t.id]) {
                teamMap[t.id] = { id: t.id, name: t.name, leader_id: t.leader_id, manager_id: t.manager_id, member_ids: [] };
            }
            if (t.user_id) {
                teamMap[t.id].member_ids.push(t.user_id);
                userTeam[t.user_id] = t.id;
            }
        });

        // Build org hierarchy: Root dept (P.Kinh Doanh) → child depts (teams/phòng)
        const rootDept = orgData.departments.find(d => d.id === 1) || orgData.departments[0];
        const childDepts = orgData.departments.filter(d => d.parent_id === (rootDept ? rootDept.id : 1));

        // Find managers (head_user_id of child depts OR users with role 'quan_ly' in KD tree)
        const managers = orgData.users.filter(u =>
            ['quan_ly', 'quan_ly_cap_cao'].includes(u.role)
        );

        // Group users under managers → teams → employees
        const groups = [];
        const processedUserIds = new Set();

        for (const mgr of managers) {
            // Find departments this manager heads
            const mgrDepts = orgData.departments.filter(d => d.head_user_id === mgr.id);
            const mgrDeptIds = new Set(mgrDepts.map(d => d.id));
            // Also include child departments
            orgData.departments.forEach(d => {
                if (d.parent_id && mgrDeptIds.has(d.parent_id)) mgrDeptIds.add(d.id);
            });

            // Get employees in this manager's departments
            const mgrEmployees = orgData.users.filter(u =>
                u.id !== mgr.id && mgrDeptIds.has(u.department_id) &&
                !['quan_ly', 'quan_ly_cap_cao', 'giam_doc'].includes(u.role)
            );

            // Group by teams
            const teamGroups = {};
            const noTeam = [];

            mgrEmployees.forEach(emp => {
                const tId = userTeam[emp.id];
                if (tId && teamMap[tId]) {
                    if (!teamGroups[tId]) teamGroups[tId] = [];
                    teamGroups[tId].push(emp);
                } else {
                    noTeam.push(emp);
                }
                processedUserIds.add(emp.id);
            });

            // Build teams array
            const teamsArr = [];
            for (const [tId, members] of Object.entries(teamGroups)) {
                const team = teamMap[tId];
                const empIds = members.map(m => m.id);
                // Include leader in stats if they're in KD
                const leaderUser = team.leader_id ? orgData.users.find(u => u.id === team.leader_id) : null;

                teamsArr.push({
                    team_id: Number(tId),
                    name: team.name,
                    leader_id: team.leader_id,
                    leader_name: leaderUser ? leaderUser.full_name : null,
                    current: calcGroup(empIds, currentMap),
                    previous: calcGroup(empIds, previousMap),
                    employees: members.map(emp => ({
                        user_id: emp.id,
                        name: emp.full_name,
                        role: emp.role,
                        current: calcGroup([emp.id], currentMap),
                        previous: calcGroup([emp.id], previousMap)
                    }))
                });
            }

            // Add trend to each team
            teamsArr.forEach(t => {
                t.trend = { rate: Math.round(10 * (t.current.rate - t.previous.rate)) / 10 };
            });

            // Unassigned employees (no team)
            if (noTeam.length > 0) {
                const noTeamIds = noTeam.map(e => e.id);
                teamsArr.push({
                    team_id: null,
                    name: 'Chưa phân Team',
                    leader_id: null,
                    leader_name: null,
                    current: calcGroup(noTeamIds, currentMap),
                    previous: calcGroup(noTeamIds, previousMap),
                    trend: { rate: 0 },
                    employees: noTeam.map(emp => ({
                        user_id: emp.id,
                        name: emp.full_name,
                        role: emp.role,
                        current: calcGroup([emp.id], currentMap),
                        previous: calcGroup([emp.id], previousMap)
                    }))
                });
                const lt = teamsArr[teamsArr.length - 1];
                lt.trend = { rate: Math.round(10 * (lt.current.rate - lt.previous.rate)) / 10 };
            }

            // Add manager's own stats too
            processedUserIds.add(mgr.id);
            const allMgrEmpIds = mgrEmployees.map(e => e.id);

            const group = {
                type: 'manager',
                user_id: mgr.id,
                name: mgr.full_name,
                role: mgr.role,
                current: calcGroup(allMgrEmpIds, currentMap),
                previous: calcGroup(allMgrEmpIds, previousMap),
                teams: teamsArr
            };
            group.trend = { rate: Math.round(10 * (group.current.rate - group.previous.rate)) / 10 };

            groups.push(group);
        }

        // Handle users not under any manager
        const unprocessed = orgData.users.filter(u =>
            !processedUserIds.has(u.id) &&
            !['quan_ly', 'quan_ly_cap_cao', 'giam_doc'].includes(u.role)
        );
        if (unprocessed.length > 0) {
            const ids = unprocessed.map(u => u.id);
            groups.push({
                type: 'unassigned',
                user_id: null,
                name: 'Chưa phân Quản Lý',
                role: null,
                current: calcGroup(ids, currentMap),
                previous: calcGroup(ids, previousMap),
                trend: { rate: 0 },
                teams: [{
                    team_id: null,
                    name: 'Chưa phân Team',
                    leader_id: null,
                    leader_name: null,
                    current: calcGroup(ids, currentMap),
                    previous: calcGroup(ids, previousMap),
                    trend: { rate: 0 },
                    employees: unprocessed.map(emp => ({
                        user_id: emp.id,
                        name: emp.full_name,
                        role: emp.role,
                        current: calcGroup([emp.id], currentMap),
                        previous: calcGroup([emp.id], previousMap)
                    }))
                }]
            });
        }

        // Summary (all KD employees)
        const allKDIds = orgData.users
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
};
