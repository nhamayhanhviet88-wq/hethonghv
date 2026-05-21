/**
 * KPI Kinh Doanh — API endpoint
 * Revenue from chốt đơn, daily breakdown, KPI targets with 2 milestones
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { getProductionCutoff, getTestAccountIds, buildProductionFilter } = require('../utils/productionMode');

module.exports = async function(fastify) {

    // ===== GET /api/reports/kpi-kdoanh =====
    fastify.get('/api/reports/kpi-kdoanh', { preHandler: [authenticate] }, async (request, reply) => {
        const { month } = request.query; // format: 2026-05
        const now = new Date();
        let year, mo;
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            [year, mo] = month.split('-').map(Number);
        } else {
            year = now.getFullYear();
            mo = now.getMonth() + 1;
        }

        const monthStart = `${year}-${String(mo).padStart(2,'0')}-01`;
        const nextMo = mo === 12 ? 1 : mo + 1;
        const nextYr = mo === 12 ? year + 1 : year;
        const monthEnd = `${nextYr}-${String(nextMo).padStart(2,'0')}-01`;
        const daysInMonth = new Date(year, mo, 0).getDate();

        // Days left in month (including today)
        let daysLeft = 0;
        if (year === now.getFullYear() && mo === now.getMonth() + 1) {
            daysLeft = daysInMonth - now.getDate();
        } else if (new Date(year, mo - 1, 1) > now) {
            daysLeft = daysInMonth; // future month
        }

        const periodLabel = `T${mo}/${year}`;

        // 1. Get KD department tree
        const allDepts = await db.all(
            "SELECT id, name, parent_id, head_user_id, display_order FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id"
        );
        const rootDept = allDepts.find(d => d.id === 1) || allDepts[0];
        const childDepts = allDepts.filter(d => d.parent_id === rootDept?.id);
        const allDeptIds = allDepts.map(d => d.id);
        if (allDeptIds.length === 0) return { month: { year, month: mo, label: periodLabel, days_in_month: daysInMonth, days_left: daysLeft }, teams: [], summary: {} };

        // 2. Get all active users in KD
        const kdPh = allDeptIds.map((_, i) => `$${i + 1}`).join(',');
        const users = await db.all(
            `SELECT u.id, u.full_name, u.role, u.department_id, u.username
             FROM users u
             WHERE u.department_id IN (${kdPh}) AND u.status = 'active'
             ORDER BY u.full_name`,
            allDeptIds
        );

        // 3. Get daily revenue breakdown per employee (based on chốt đơn)
        const empIds = users.filter(u => !['giam_doc'].includes(u.role)).map(u => u.id);
        if (empIds.length === 0) return { month: { year, month: mo, label: periodLabel, days_in_month: daysInMonth, days_left: daysLeft }, teams: [], summary: {} };

        const empPh = empIds.map((_, i) => `$${i + 1}`).join(',');


        // ★ Production Mode: dual filter (cutoff + test accounts)
        const _cutoff = await getProductionCutoff();
        const _testIds = await getTestAccountIds();
        const _prodSQL = buildProductionFilter(_cutoff, _testIds, 'c.created_at', 'c.created_by');

        // Step 3a: Get customer IDs that have chot_don log
        const chotDonCusts = await db.all(`
            SELECT DISTINCT cl.customer_id
            FROM consultation_logs cl
            JOIN customers c ON c.id = cl.customer_id
            WHERE cl.log_type = 'chot_don'
              AND c.assigned_to_id IN (${empPh})
              AND COALESCE(c.cancel_approved, 0) != 1
              ${_prodSQL}
        `, empIds);


        let dailyRows = [];
        if (chotDonCusts.length > 0) {
            const custIds = chotDonCusts.map(r => r.customer_id);
            const custPh = custIds.map((_, i) => `$${i + 1}`).join(',');
            const cPS = custIds.length + 1;
            const cPE = custIds.length + 2;

            // Step 3b: Get daily revenue for those customers
            dailyRows = await db.all(`
                SELECT
                    c.assigned_to_id AS uid,
                    EXTRACT(DAY FROM oc.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS day_num,
                    COALESCE(SUM(oi_sum.revenue - COALESCE(oc.discount_amount, 0)), 0) AS daily_rev
                FROM order_codes oc
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(
                        (SELECT SUM(di.item_total) FROM dht_orders d JOIN dht_order_items di ON di.dht_order_id = d.id WHERE d.order_code = oc.order_code),
                        (SELECT SUM(oi_f.total) FROM order_items oi_f WHERE oi_f.order_code_id = oc.id),
                        0
                    ) - COALESCE((SELECT d2.vat_amount FROM dht_orders d2 WHERE d2.order_code = oc.order_code), 0) AS revenue
                ) oi_sum ON true
                WHERE oc.customer_id IN (${custPh})
                  AND oc.created_at >= $${cPS}::timestamp
                  AND oc.created_at < $${cPE}::timestamp
                  AND COALESCE(oc.status, 'active') != 'cancelled'
                GROUP BY c.assigned_to_id, day_num
                ORDER BY uid, day_num
            `, [...custIds, monthStart, monthEnd]);
        }


        // Build daily map: uid -> { 1: revenue, 2: revenue, ... }
        const dailyMap = {};
        dailyRows.forEach(r => {
            if (!dailyMap[r.uid]) dailyMap[r.uid] = {};
            dailyMap[r.uid][r.day_num] = parseFloat(r.daily_rev);
        });

        // Helper: build daily array for a user
        function buildDaily(uid) {
            const arr = [];
            const m = dailyMap[uid] || {};
            for (let d = 1; d <= daysInMonth; d++) arr.push(m[d] || 0);
            return arr;
        }

        // Helper: sum daily arrays
        function sumDailyArrays(arrays) {
            const result = new Array(daysInMonth).fill(0);
            arrays.forEach(arr => { for (let i = 0; i < daysInMonth; i++) result[i] += arr[i]; });
            return result;
        }

        // 4. Load KPI targets for this month
        const kpiTargets = await db.all(
            `SELECT target_type, target_id, metric, target_value
             FROM kpi_targets
             WHERE period_type = 'month' AND period_value = $1`,
            [periodLabel]
        );
        const kpiMap = {};
        kpiTargets.forEach(k => {
            kpiMap[`${k.target_type}_${k.target_id}_${k.metric}`] = parseFloat(k.target_value);
        });

        // 5. Build team structure
        const teams = [];
        const processedUserIds = new Set();

        // Find manager(s) — employees at root dept who are QL/QL cap cao
        const managers = users.filter(u => ['quan_ly', 'quan_ly_cap_cao'].includes(u.role));

        // "TRƯỞNG PHÒNG" group — users at root dept (not managers, not GD)
        const rootUsers = users.filter(u =>
            u.department_id === rootDept.id &&
            !['quan_ly', 'quan_ly_cap_cao', 'giam_doc'].includes(u.role)
        );

        // Add TP group if it has members — also include managers' personal data
        const tpGroupMembers = [...rootUsers];
        managers.forEach(m => { tpGroupMembers.push(m); processedUserIds.add(m.id); });
        rootUsers.forEach(u => processedUserIds.add(u.id));

        if (tpGroupMembers.length > 0) {
            const empData = tpGroupMembers.map(emp => {
                const daily = buildDaily(emp.id);
                const actual = daily.reduce((s, v) => s + v, 0);
                const target = kpiMap[`user_${emp.id}_revenue`] || 0;
                return {
                    user_id: emp.id,
                    username: emp.username,
                    full_name: emp.full_name,
                    role: emp.role,
                    target,
                    actual,
                    rate: target > 0 ? Math.round(1000 * actual / target) / 10 : 0,
                    missing: target - actual,
                    daily
                };
            });
            const teamDaily = sumDailyArrays(empData.map(e => e.daily));
            const teamActual = teamDaily.reduce((s, v) => s + v, 0);
            const teamTarget = empData.reduce((s, e) => s + e.target, 0);
            teams.push({
                dept_id: rootDept.id,
                dept_name: 'QUẢN LÝ',
                leader_name: managers[0]?.full_name || null,
                target_1: teamTarget,
                target_120: Math.round(teamTarget * 1.2),
                actual: teamActual,
                rate_1: teamTarget > 0 ? Math.round(1000 * teamActual / teamTarget) / 10 : 0,
                rate_120: teamTarget > 0 ? Math.round(1000 * teamActual / (teamTarget * 1.2)) / 10 : 0,
                missing_1: teamTarget - teamActual,
                missing_120: Math.round(teamTarget * 1.2) - teamActual,
                daily: teamDaily,
                stages: buildStages(teamDaily, teamTarget, daysInMonth),
                employees: empData
            });
        }

        // Child departments = Teams
        for (const dept of childDepts) {
            const deptEmps = users.filter(u =>
                u.department_id === dept.id &&
                !['giam_doc'].includes(u.role) &&
                !processedUserIds.has(u.id)
            );
            deptEmps.forEach(u => processedUserIds.add(u.id));

            const leaderUser = dept.head_user_id ? users.find(u => u.id === dept.head_user_id) : null;

            const empData = deptEmps.map(emp => {
                const daily = buildDaily(emp.id);
                const actual = daily.reduce((s, v) => s + v, 0);
                const target = kpiMap[`user_${emp.id}_revenue`] || 0;
                return {
                    user_id: emp.id,
                    username: emp.username,
                    full_name: emp.full_name,
                    role: emp.role,
                    target,
                    actual,
                    rate: target > 0 ? Math.round(1000 * actual / target) / 10 : 0,
                    missing: target - actual,
                    daily
                };
            });

            // Sort: truong_phong first, then nhan_vien
            empData.sort((a, b) => {
                const p = { truong_phong: 0, quan_ly: 1, quan_ly_cap_cao: 1, nhan_vien: 2 };
                const pa = p[a.role] !== undefined ? p[a.role] : 9;
                const pb = p[b.role] !== undefined ? p[b.role] : 9;
                return pa - pb;
            });

            const teamDaily = sumDailyArrays(empData.map(e => e.daily));
            const teamActual = teamDaily.reduce((s, v) => s + v, 0);
            const teamTarget = empData.reduce((s, e) => s + e.target, 0);

            teams.push({
                dept_id: dept.id,
                dept_name: dept.name,
                leader_name: leaderUser?.full_name || null,
                target_1: teamTarget,
                target_120: Math.round(teamTarget * 1.2),
                actual: teamActual,
                rate_1: teamTarget > 0 ? Math.round(1000 * teamActual / teamTarget) / 10 : 0,
                rate_120: teamTarget > 0 ? Math.round(1000 * teamActual / (teamTarget * 1.2)) / 10 : 0,
                missing_1: teamTarget - teamActual,
                missing_120: Math.round(teamTarget * 1.2) - teamActual,
                daily: teamDaily,
                stages: buildStages(teamDaily, teamTarget, daysInMonth),
                employees: empData
            });
        }

        // Summary (TỔNG)
        const totalTarget = teams.reduce((s, t) => s + t.target_1, 0);
        const totalTarget120 = Math.round(totalTarget * 1.2);
        const totalActual = teams.reduce((s, t) => s + t.actual, 0);
        const totalDaily = sumDailyArrays(teams.map(t => t.daily));

        return {
            month: { year, month: mo, label: periodLabel, days_in_month: daysInMonth, days_left: daysLeft },
            summary: {
                target_1: totalTarget,
                target_120: totalTarget120,
                actual: totalActual,
                rate_1: totalTarget > 0 ? Math.round(1000 * totalActual / totalTarget) / 10 : 0,
                rate_120: totalTarget120 > 0 ? Math.round(1000 * totalActual / totalTarget120) / 10 : 0,
                missing_1: totalTarget - totalActual,
                missing_120: totalTarget120 - totalActual,
                stages: buildStages(totalDaily, totalTarget, daysInMonth),
                daily: totalDaily
            },
            teams
        };
    });

    // ===== POST /api/kpi-targets/kpi-kdoanh — batch set targets for all employees =====
    fastify.post('/api/kpi-targets/kpi-kdoanh', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được đặt KPI' });
        }
        const { targets, period_value } = request.body || {};
        // targets: [{ user_id, target_value }]
        if (!Array.isArray(targets) || !period_value) {
            return reply.code(400).send({ error: 'Thiếu thông tin' });
        }

        let created = 0, updated = 0;
        for (const t of targets) {
            if (!t.user_id || t.target_value == null) continue;
            const existing = await db.get(
                `SELECT id FROM kpi_targets WHERE target_type = 'user' AND target_id = $1 AND metric = 'revenue' AND period_type = 'month' AND period_value = $2`,
                [t.user_id, period_value]
            );
            if (existing) {
                await db.run(`UPDATE kpi_targets SET target_value = $1, updated_at = NOW() WHERE id = $2`, [t.target_value, existing.id]);
                updated++;
            } else {
                await db.run(
                    `INSERT INTO kpi_targets (target_type, target_id, metric, period_type, period_value, target_value, created_by) VALUES ('user', $1, 'revenue', 'month', $2, $3, $4)`,
                    [t.user_id, period_value, t.target_value, request.user.id]
                );
                created++;
            }
        }
        return { success: true, created, updated };
    });

    // Helper: build stage breakdown
    function buildStages(dailyArr, totalTarget, daysInMonth) {
        // Stage 1: day 1-10, Stage 2: day 11-20, Stage 3: day 21-end
        const s1Days = 10, s2Days = 10, s3Days = daysInMonth - 20;
        let s1Actual = 0, s2Actual = 0, s3Actual = 0;
        for (let i = 0; i < daysInMonth; i++) {
            if (i < 10) s1Actual += dailyArr[i] || 0;
            else if (i < 20) s2Actual += dailyArr[i] || 0;
            else s3Actual += dailyArr[i] || 0;
        }
        // Proportional targets
        const s1Target = totalTarget > 0 ? Math.round(totalTarget * s1Days / daysInMonth) : 0;
        const s2Target = totalTarget > 0 ? Math.round(totalTarget * s2Days / daysInMonth) : 0;
        const s3Target = totalTarget > 0 ? totalTarget - s1Target - s2Target : 0;

        return {
            stage1: { target: s1Target, actual: s1Actual, avg_per_day: s1Days > 0 ? Math.round(s1Actual / s1Days) : 0, missing: s1Target - s1Actual },
            stage2: { target: s2Target, actual: s2Actual, avg_per_day: s2Days > 0 ? Math.round(s2Actual / s2Days) : 0, missing: s2Target - s2Actual },
            stage3: { target: s3Target, actual: s3Actual, avg_per_day: s3Days > 0 ? Math.round(s3Actual / s3Days) : 0, missing: s3Target - s3Actual }
        };
    }

    // ===== GET employee order details for a month =====
    fastify.get('/api/kpi-kdoanh/employee-orders', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, month, startDate, endDate } = request.query;
        if (!user_id) return reply.code(400).send({ error: 'Thiếu user_id' });

        let monthStart, monthEnd, periodLabel;

        // Custom date range takes priority
        if (startDate && endDate) {
            monthStart = startDate + ' 00:00:00+07';
            // endDate inclusive — add 1 day
            const endD = new Date(endDate + 'T00:00:00');
            endD.setDate(endD.getDate() + 1);
            monthEnd = `${endD.getFullYear()}-${String(endD.getMonth()+1).padStart(2,'0')}-${String(endD.getDate()).padStart(2,'0')} 00:00:00+07`;
            periodLabel = startDate + ' → ' + endDate;
        } else if (month) {
            const [year, mo] = month.split('-').map(Number);
            monthStart = `${year}-${String(mo).padStart(2,'0')}-01 00:00:00+07`;
            const nextMo = mo === 12 ? 1 : mo + 1;
            const nextYear = mo === 12 ? year + 1 : year;
            monthEnd = `${nextYear}-${String(nextMo).padStart(2,'0')}-01 00:00:00+07`;
            periodLabel = `T${mo}/${year}`;
        } else {
            return reply.code(400).send({ error: 'Thiếu month hoặc startDate/endDate' });
        }

        // Get employee info
        const emp = await db.get('SELECT id, full_name FROM users WHERE id = $1', [user_id]);
        if (!emp) return reply.code(404).send({ error: 'Không tìm thấy NV' });

        // Phone visibility: GĐ sees all, employee sees own customers only
        const isDirector = request.user.role === 'giam_doc';
        const isOwner = request.user.id === parseInt(user_id);

        // Get orders: customers with chot_don log in this date range, assigned to this user
        const orders = await db.all(`
            SELECT
                oc.id AS order_id,
                oc.order_code,
                c.customer_name AS customer_name,
                c.phone AS customer_phone,
                COALESCE(oi_sum.revenue, 0) - COALESCE(oc.discount_amount, 0) AS revenue,
                oc.created_at,
                ref.full_name AS referrer_name,
                (SELECT COUNT(*) FROM order_codes oc2
                 WHERE oc2.customer_id = c.id
                   AND oc2.created_at < oc.created_at) + 1 AS order_count,
                CASE
                    WHEN (SELECT COUNT(*) FROM order_codes oc3
                          WHERE oc3.customer_id = c.id
                            AND oc3.created_at < oc.created_at) > 0
                    THEN 'cu'
                    ELSE 'moi'
                END AS customer_type
            FROM order_codes oc
            JOIN customers c ON oc.customer_id = c.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(
                    (SELECT SUM(di.item_total) FROM dht_orders d JOIN dht_order_items di ON di.dht_order_id = d.id WHERE d.order_code = oc.order_code),
                    (SELECT SUM(oi_f.total) FROM order_items oi_f WHERE oi_f.order_code_id = oc.id),
                    0
                ) - COALESCE((SELECT d2.vat_amount FROM dht_orders d2 WHERE d2.order_code = oc.order_code), 0) AS revenue
            ) oi_sum ON true
            LEFT JOIN users ref ON ref.id = c.referrer_id AND ref.role = 'tkaffiliate'
            WHERE c.assigned_to_id = $1
              AND COALESCE(c.cancel_approved, 0) != 1
              AND EXISTS (SELECT 1 FROM consultation_logs cl WHERE cl.customer_id = c.id AND cl.log_type = 'chot_don')
              AND oc.created_at >= $2::timestamptz
              AND oc.created_at < $3::timestamptz
              AND COALESCE(oc.status, 'active') != 'cancelled'
              ${buildProductionFilter(await getProductionCutoff(), await getTestAccountIds(), 'c.created_at', 'c.created_by')}
            ORDER BY oc.created_at DESC
        `, [parseInt(user_id), monthStart, monthEnd]);

        // Mask phone if not authorized — also allow QLCC to see all
        const { maskPhone: _kpiMaskPhone } = require('../utils/dataMasking');
        const maskedOrders = orders.map(o => {
            if (isDirector || isOwner || request.user.role === 'quan_ly_cap_cao') {
                return o;
            } else {
                return { ...o, customer_phone: _kpiMaskPhone(o.customer_phone) };
            }
        });

        const totalNew = maskedOrders.filter(o => o.customer_type === 'moi').length;
        const totalOld = maskedOrders.filter(o => o.customer_type === 'cu').length;

        return {
            employee: emp,
            month: month,
            periodLabel: periodLabel,
            orders: maskedOrders,
            summary: {
                total: maskedOrders.length,
                new_orders: totalNew,
                old_orders: totalOld,
                total_revenue: maskedOrders.reduce((s, o) => s + parseFloat(o.revenue || 0), 0)
            }
        };
    });

    // ===== GET /api/reports/kpi-achievement — yearly achievement summary =====
    fastify.get('/api/reports/kpi-achievement', { preHandler: [authenticate] }, async (request, reply) => {
        const year = parseInt(request.query.year) || new Date().getFullYear();

        // 1. Get KD department tree
        const allDepts = await db.all(
            "SELECT id, name, parent_id, head_user_id FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id"
        );
        const rootDept = allDepts.find(d => d.id === 1) || allDepts[0];
        const childDepts = allDepts.filter(d => d.parent_id === rootDept?.id);
        const allDeptIds = allDepts.map(d => d.id);
        if (allDeptIds.length === 0) return { users: [], teams: [], year };

        // 2. Get all active users in KD
        const kdPh = allDeptIds.map((_, i) => `$${i + 1}`).join(',');
        const users = await db.all(
            `SELECT u.id, u.full_name, u.role, u.department_id, u.username
             FROM users u WHERE u.department_id IN (${kdPh}) AND u.status = 'active' AND u.role != 'giam_doc'`,
            allDeptIds
        );

        // 3. Get ALL kpi_targets for this year (monthly)
        const targets = await db.all(
            `SELECT target_type, target_id, metric, period_value, target_value
             FROM kpi_targets WHERE period_type = 'month' AND period_value LIKE $1`,
            [`T%/${year}`]
        );
        // Build target map: "user_<id>_T<m>/<year>" -> value
        const targetMap = {};
        targets.forEach(t => {
            targetMap[`${t.target_type}_${t.target_id}_${t.period_value}`] = parseFloat(t.target_value);
        });

        // 4. Get monthly revenue per user for the year
        const empIds = users.map(u => u.id);
        if (empIds.length === 0) return { users: [], teams: [], year };

        const empPh = empIds.map((_, i) => `$${i + 1}`).join(',');
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year + 1}-01-01`;

        const monthlyRevRows = await db.all(`
            SELECT
                c.assigned_to_id AS uid,
                EXTRACT(MONTH FROM oc.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS mo,
                COALESCE(SUM(oi_sum.revenue - COALESCE(oc.discount_amount, 0)), 0) AS revenue
            FROM order_codes oc
            JOIN customers c ON oc.customer_id = c.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(
                    (SELECT SUM(di.item_total) FROM dht_orders d JOIN dht_order_items di ON di.dht_order_id = d.id WHERE d.order_code = oc.order_code),
                    (SELECT SUM(oi_f.total) FROM order_items oi_f WHERE oi_f.order_code_id = oc.id),
                    0
                ) - COALESCE((SELECT d2.vat_amount FROM dht_orders d2 WHERE d2.order_code = oc.order_code), 0) AS revenue
            ) oi_sum ON true
            WHERE c.assigned_to_id IN (${empPh})
              AND COALESCE(c.cancel_approved, 0) != 1
              AND EXISTS (SELECT 1 FROM consultation_logs cl WHERE cl.customer_id = c.id AND cl.log_type = 'chot_don')
              AND oc.created_at >= $${empIds.length + 1}::timestamp
              AND oc.created_at < $${empIds.length + 2}::timestamp
              AND COALESCE(oc.status, 'active') != 'cancelled'
              ${buildProductionFilter(await getProductionCutoff(), await getTestAccountIds(), 'c.created_at', 'c.created_by')}
            GROUP BY c.assigned_to_id, mo
        `, [...empIds, yearStart, yearEnd]);

        // Build revenue map: uid -> { 1: rev, 2: rev, ... }
        const revMap = {};
        monthlyRevRows.forEach(r => {
            if (!revMap[r.uid]) revMap[r.uid] = {};
            revMap[r.uid][r.mo] = parseFloat(r.revenue);
        });

        // 5. Build per-user monthly breakdown
        const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() + 1 : 12;
        const userResults = users.map(u => {
            const months = {};
            let yearTarget = 0, yearActual = 0, monthsAchieved = 0, monthsWithTarget = 0;
            for (let m = 1; m <= currentMonth; m++) {
                const periodKey = `T${m}/${year}`;
                const target = targetMap[`user_${u.id}_${periodKey}`] || 0;
                const actual = (revMap[u.id] && revMap[u.id][m]) || 0;
                const rate = target > 0 ? Math.round(1000 * actual / target) / 10 : (actual > 0 ? 999 : 0);
                const missing = target - actual;
                const exceeded = actual > target ? actual - target : 0;
                const exceededPct = target > 0 ? Math.round(1000 * exceeded / target) / 10 : 0;
                months[m] = { target, actual, rate, missing, exceeded, exceeded_pct: exceededPct };
                yearTarget += target;
                yearActual += actual;
                if (target > 0) { monthsWithTarget++; if (actual >= target) monthsAchieved++; }
            }
            const yearRate = yearTarget > 0 ? Math.round(1000 * yearActual / yearTarget) / 10 : 0;
            const yearMissing = yearTarget - yearActual;
            const yearExceeded = yearActual > yearTarget ? yearActual - yearTarget : 0;
            const yearExceededPct = yearTarget > 0 ? Math.round(1000 * yearExceeded / yearTarget) / 10 : 0;
            return {
                user_id: u.id, username: u.username, full_name: u.full_name, role: u.role, department_id: u.department_id,
                months,
                yearly: { target: yearTarget, actual: yearActual, rate: yearRate, missing: yearMissing, exceeded: yearExceeded, exceeded_pct: yearExceededPct, months_achieved: monthsAchieved, months_total: monthsWithTarget }
            };
        });

        // 6. Build per-team aggregates
        const teamList = [];
        // Manager group
        const mgrUsers = userResults.filter(u => ['quan_ly', 'quan_ly_cap_cao'].includes(u.role));
        const rootNonMgr = userResults.filter(u => u.department_id === rootDept.id && !['quan_ly', 'quan_ly_cap_cao'].includes(u.role));
        const qlGroup = [...mgrUsers, ...rootNonMgr];
        if (qlGroup.length > 0) teamList.push(buildTeamAgg('QUẢN LÝ', rootDept.id, qlGroup, currentMonth));

        for (const dept of childDepts) {
            const deptUsers = userResults.filter(u => u.department_id === dept.id && !mgrUsers.find(m => m.user_id === u.user_id));
            if (deptUsers.length > 0) teamList.push(buildTeamAgg(dept.name, dept.id, deptUsers, currentMonth));
        }

        return { users: userResults, teams: teamList, year, current_month: currentMonth };
    });

    function buildTeamAgg(name, deptId, members, currentMonth) {
        const months = {};
        let yearTarget = 0, yearActual = 0, monthsAchieved = 0, monthsWithTarget = 0;
        for (let m = 1; m <= currentMonth; m++) {
            let mTarget = 0, mActual = 0;
            members.forEach(u => { if (u.months[m]) { mTarget += u.months[m].target; mActual += u.months[m].actual; } });
            const rate = mTarget > 0 ? Math.round(1000 * mActual / mTarget) / 10 : 0;
            const missing = mTarget - mActual;
            const exceeded = mActual > mTarget ? mActual - mTarget : 0;
            const exceededPct = mTarget > 0 ? Math.round(1000 * exceeded / mTarget) / 10 : 0;
            months[m] = { target: mTarget, actual: mActual, rate, missing, exceeded, exceeded_pct: exceededPct };
            yearTarget += mTarget; yearActual += mActual;
            if (mTarget > 0) { monthsWithTarget++; if (mActual >= mTarget) monthsAchieved++; }
        }
        const yearRate = yearTarget > 0 ? Math.round(1000 * yearActual / yearTarget) / 10 : 0;
        return {
            dept_id: deptId, dept_name: name, member_count: members.length,
            months,
            yearly: { target: yearTarget, actual: yearActual, rate: yearRate, missing: yearTarget - yearActual,
                exceeded: yearActual > yearTarget ? yearActual - yearTarget : 0,
                exceeded_pct: yearTarget > 0 ? Math.round(1000 * Math.max(0, yearActual - yearTarget) / yearTarget) / 10 : 0,
                months_achieved: monthsAchieved, months_total: monthsWithTarget }
        };
    }
};
