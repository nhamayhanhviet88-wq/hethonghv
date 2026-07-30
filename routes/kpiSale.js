const { getCustomerTypeSql } = require('../utils/customerTypeHelper');
/**
 * KPI Phòng Sale — API endpoint
 * Revenue from chốt đơn, daily breakdown, KPI targets with 2 milestones for PHÒNG SALE (Dept ID = 4)
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { getProductionCutoff, getTestAccountIds, buildProductionFilter } = require('../utils/productionMode');

module.exports = async function(fastify) {

    // ===== GET /api/reports/kpi-sale =====
    fastify.get('/api/reports/kpi-sale', { preHandler: [authenticate] }, async (request, reply) => {
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
            daysLeft = daysInMonth;
        }

        const periodLabel = `T${mo}/${year}`;

        // 1. Get Sale department tree (id = 4 OR parent_id = 4)
        const allDepts = await db.all(
            "SELECT id, name, parent_id, head_user_id, display_order FROM departments WHERE (id = 4 OR parent_id = 4) AND status = 'active' ORDER BY display_order, id"
        );
        const rootDept = allDepts.find(d => d.id === 4) || allDepts[0];
        if (!rootDept) {
            return { month: { year, month: mo, label: periodLabel, days_in_month: daysInMonth, days_left: daysLeft }, teams: [], summary: {} };
        }
        const childDepts = allDepts.filter(d => d.parent_id === rootDept.id);
        const allDeptIds = allDepts.map(d => d.id);
        if (allDeptIds.length === 0) return { month: { year, month: mo, label: periodLabel, days_in_month: daysInMonth, days_left: daysLeft }, teams: [], summary: {} };

        // 2. Get all active users in Sale
        const salePh = allDeptIds.map((_, i) => `$${i + 1}`).join(',');
        const users = await db.all(
            `SELECT u.id, u.full_name, u.role, u.department_id, u.username
             FROM users u
             WHERE u.department_id IN (${salePh}) AND u.status = 'active'
             ORDER BY u.full_name`,
            allDeptIds
        );

        // 3. Get daily revenue breakdown per employee (based on chốt đơn)
        const empIds = users.filter(u => !['giam_doc'].includes(u.role)).map(u => u.id);
        if (empIds.length === 0) return { month: { year, month: mo, label: periodLabel, days_in_month: daysInMonth, days_left: daysLeft }, teams: [], summary: {} };

        const empPh = empIds.map((_, i) => `$${i + 1}`).join(',');

        // Production Mode: dual filter
        const _cutoff = await getProductionCutoff();
        const _testIds = await getTestAccountIds();
        const _prodSQL = buildProductionFilter(_cutoff, _testIds, 'c.created_at', 'c.created_by');

        const cPS = empIds.length + 1;
        const cPE = empIds.length + 2;

        const dailyRows = await db.all(`
            SELECT
                c.assigned_to_id AS uid,
                EXTRACT(DAY FROM d.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS day_num,
                COALESCE(SUM(oi_sum.revenue - COALESCE(d.discount_amount, 0)), 0) AS daily_rev
            FROM dht_orders d
            JOIN order_codes oc ON oc.order_code = d.order_code
            JOIN customers c ON oc.customer_id = c.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(
                    (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id),
                    0
                ) - COALESCE(d.vat_amount, 0) AS revenue
            ) oi_sum ON true
            WHERE c.assigned_to_id IN (${empPh})
              AND COALESCE(c.cancel_approved, 0) != 1
              AND COALESCE(d.is_draft, false) = false
              AND d.created_at >= $${cPS}::timestamp
              AND d.created_at < $${cPE}::timestamp
              AND COALESCE(oc.status, 'active') != 'cancelled'
              ${_prodSQL}
            GROUP BY c.assigned_to_id, day_num
            ORDER BY uid, day_num
        `, [...empIds, monthStart, monthEnd]);

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

        // Find manager(s) — employees at root dept who are QL/QL cap cao / truong_phong
        const managers = users.filter(u => ['quan_ly', 'quan_ly_cap_cao', 'truong_phong'].includes(u.role));

        // Root dept users (not GD)
        const rootUsers = users.filter(u =>
            u.department_id === rootDept.id &&
            !['quan_ly', 'quan_ly_cap_cao', 'giam_doc'].includes(u.role)
        );

        const tpGroupMembers = [...rootUsers];
        managers.forEach(m => {
            if (m.department_id === rootDept.id && !tpGroupMembers.some(x => x.id === m.id)) {
                tpGroupMembers.push(m);
            }
        });

        tpGroupMembers.forEach(u => processedUserIds.add(u.id));

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
                    daily,
                    stages: buildStages(daily, target, daysInMonth)
                };
            });
            const teamDaily = sumDailyArrays(empData.map(e => e.daily));
            const teamActual = teamDaily.reduce((s, v) => s + v, 0);
            const teamTarget = empData.reduce((s, e) => s + e.target, 0);
            teams.push({
                dept_id: rootDept.id,
                dept_name: 'TRƯỞNG PHÒNG SALE',
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
                    daily,
                    stages: buildStages(daily, target, daysInMonth)
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

        // Calculate retention data for all employees & teams
        const monthStartStr = `${year}-${String(mo).padStart(2, '0')}-01 00:00:00+07`;
        const nextM = mo === 12 ? 1 : mo + 1;
        const nextY = mo === 12 ? year + 1 : year;
        const monthEndStr = `${nextY}-${String(nextM).padStart(2, '0')}-01 00:00:00+07`;

        const allEmps = [];
        teams.forEach(t => (t.employees || []).forEach(e => allEmps.push(e)));
        if (allEmps.length > 0) {
            const uIds = allEmps.map(e => e.user_id);
            const ph = uIds.map((_, i) => `$${i + 1}`).join(',');
            const pStartIdx = uIds.length + 1;
            const pEndIdx = uIds.length + 2;

            const retSql = `
                WITH valid_orders AS (
                    SELECT 
                        d.id AS order_id, d.created_at,
                        c.assigned_to_id AS uid,
                        COALESCE(c.id::text, REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g')) AS customer_key,
                        c.customer_type AS cust_table_type,
                        c.created_at AS customer_created_at,
                        CASE 
                            WHEN UPPER(COALESCE(cat.name, '')) IN ('PET', 'TEM')
                              OR UPPER(COALESCE(d.order_code, '')) LIKE 'GCPET%'
                              OR UPPER(COALESCE(d.order_code, '')) LIKE 'GCTEM%'
                              OR d.category_id IN (8, 9)
                            THEN 'pettem'
                            ELSE 'dp'
                        END AS business_area
                    FROM dht_orders d
                    JOIN order_codes oc ON oc.order_code = d.order_code
                    JOIN customers c ON oc.customer_id = c.id
                    LEFT JOIN dht_categories cat ON cat.id = d.category_id
                    WHERE c.assigned_to_id IN (${ph})
                      AND c.phone IS NOT NULL AND c.phone != ''
                      AND COALESCE(c.cancel_approved, 0) != 1
                      AND COALESCE(d.is_draft, false) = false
                      AND COALESCE(oc.status, 'active') NOT IN ('cancelled', 'canceled')
                ),
                prior_cust AS (
                    SELECT DISTINCT uid, business_area, customer_key
                    FROM valid_orders
                    WHERE created_at < $${pStartIdx}::timestamp 
                       OR customer_created_at < $${pStartIdx}::timestamp 
                       OR cust_table_type = 'cu'
                ),
                current_orders AS (
                    SELECT uid, business_area, customer_key, COUNT(DISTINCT order_id) AS order_cnt
                    FROM valid_orders
                    WHERE created_at >= $${pStartIdx}::timestamp AND created_at < $${pEndIdx}::timestamp
                    GROUP BY uid, business_area, customer_key
                ),
                old_pool AS (
                    SELECT uid, business_area, customer_key FROM prior_cust
                    UNION
                    SELECT uid, business_area, customer_key FROM current_orders WHERE order_cnt >= 2
                ),
                returning_cust AS (
                    SELECT DISTINCT c.uid, c.business_area, c.customer_key
                    FROM current_orders c
                    JOIN old_pool p ON p.uid = c.uid AND p.customer_key = c.customer_key AND p.business_area = c.business_area
                )
                SELECT 
                    u.id AS uid,
                    COALESCE((SELECT COUNT(DISTINCT customer_key) FROM old_pool WHERE uid = u.id AND business_area = 'dp'), 0) AS old_dp_total,
                    COALESCE((SELECT COUNT(DISTINCT customer_key) FROM returning_cust WHERE uid = u.id AND business_area = 'dp'), 0) AS ret_dp_cust,
                    COALESCE((SELECT COUNT(DISTINCT customer_key) FROM old_pool WHERE uid = u.id AND business_area = 'pettem'), 0) AS old_pettem_total,
                    COALESCE((SELECT COUNT(DISTINCT customer_key) FROM returning_cust WHERE uid = u.id AND business_area = 'pettem'), 0) AS ret_pettem_cust
                FROM (SELECT unnest(ARRAY[${ph}]::int[]) AS id) u
            `;

            const retRows = await db.all(retSql, [...uIds, monthStartStr, monthEndStr]);
            const rowMap = {};
            retRows.forEach(r => {
                rowMap[Number(r.uid)] = {
                    old_dp_total: parseInt(r.old_dp_total || 0),
                    ret_dp_cust: parseInt(r.ret_dp_cust || 0),
                    old_pettem_total: parseInt(r.old_pettem_total || 0),
                    ret_pettem_cust: parseInt(r.ret_pettem_cust || 0)
                };
            });

            teams.forEach(team => {
                let teamOldDp = 0, teamRetDp = 0, teamOldPetTem = 0, teamRetPetTem = 0;
                (team.employees || []).forEach(emp => {
                    const st = rowMap[emp.user_id] || { old_dp_total: 0, ret_dp_cust: 0, old_pettem_total: 0, ret_pettem_cust: 0 };
                    emp.old_dp_total = st.old_dp_total;
                    emp.ret_dp_cust = st.ret_dp_cust;
                    emp.rate_dp = emp.old_dp_total > 0 ? Math.round(1000 * emp.ret_dp_cust / emp.old_dp_total) / 10 : null;

                    emp.old_pettem_total = st.old_pettem_total;
                    emp.ret_pettem_cust = st.ret_pettem_cust;
                    emp.rate_pettem = emp.old_pettem_total > 0 ? Math.round(1000 * emp.ret_pettem_cust / emp.old_pettem_total) / 10 : null;

                    teamOldDp += emp.old_dp_total;
                    teamRetDp += emp.ret_dp_cust;
                    teamOldPetTem += emp.old_pettem_total;
                    teamRetPetTem += emp.ret_pettem_cust;
                });

                team.old_dp_total = teamOldDp;
                team.ret_dp_cust = teamRetDp;
                team.rate_dp = teamOldDp > 0 ? Math.round(1000 * teamRetDp / teamOldDp) / 10 : null;

                team.old_pettem_total = teamOldPetTem;
                team.ret_pettem_cust = teamRetPetTem;
                team.rate_pettem = teamOldPetTem > 0 ? Math.round(1000 * teamRetPetTem / teamOldPetTem) / 10 : null;
            });
        }

        // Summary (TỔNG)
        const totalTarget = teams.reduce((s, t) => s + t.target_1, 0);
        const totalTarget120 = Math.round(totalTarget * 1.2);
        const totalActual = teams.reduce((s, t) => s + t.actual, 0);
        const totalDaily = sumDailyArrays(teams.map(t => t.daily));

        const sumOldDp = teams.reduce((s, t) => s + (t.old_dp_total || 0), 0);
        const sumRetDp = teams.reduce((s, t) => s + (t.ret_dp_cust || 0), 0);
        const sumOldPetTem = teams.reduce((s, t) => s + (t.old_pettem_total || 0), 0);
        const sumRetPetTem = teams.reduce((s, t) => s + (t.ret_pettem_cust || 0), 0);

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
                daily: totalDaily,
                old_dp_total: sumOldDp,
                ret_dp_cust: sumRetDp,
                rate_dp: sumOldDp > 0 ? Math.round(1000 * sumRetDp / sumOldDp) / 10 : null,
                old_pettem_total: sumOldPetTem,
                ret_pettem_cust: sumRetPetTem,
                rate_pettem: sumOldPetTem > 0 ? Math.round(1000 * sumRetPetTem / sumOldPetTem) / 10 : null
            },
            teams
        };
    });

    // ===== POST /api/kpi-targets/kpi-sale =====
    fastify.post('/api/kpi-targets/kpi-sale', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc' && request.user.role !== 'admin' && request.user.username !== 'admin') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được đặt KPI' });
        }
        const { targets, period_value } = request.body || {};
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
        const s1Days = 10, s2Days = 10, s3Days = daysInMonth - 20;
        let s1Actual = 0, s2Actual = 0, s3Actual = 0;
        for (let i = 0; i < daysInMonth; i++) {
            if (i < 10) s1Actual += dailyArr[i] || 0;
            else if (i < 20) s2Actual += dailyArr[i] || 0;
            else s3Actual += dailyArr[i] || 0;
        }
        const s1Target = totalTarget > 0 ? Math.round(totalTarget * s1Days / daysInMonth) : 0;
        const s2Target = totalTarget > 0 ? Math.round(totalTarget * s2Days / daysInMonth) : 0;
        const s3Target = totalTarget > 0 ? totalTarget - s1Target - s2Target : 0;

        return {
            stage1: { target: s1Target, actual: s1Actual, avg_per_day: s1Days > 0 ? Math.round(s1Actual / s1Days) : 0, missing: s1Target - s1Actual },
            stage2: { target: s2Target, actual: s2Actual, avg_per_day: s2Days > 0 ? Math.round(s2Actual / s2Days) : 0, missing: s2Target - s2Actual },
            stage3: { target: s3Target, actual: s3Actual, avg_per_day: s3Days > 0 ? Math.round(s3Actual / s3Days) : 0, missing: s3Target - s3Actual }
        };
    }

    // ===== GET /api/kpi-sale/employee-orders =====
    fastify.get('/api/kpi-sale/employee-orders', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, month, startDate, endDate } = request.query;
        if (!user_id) return reply.code(400).send({ error: 'Thiếu user_id' });

        let monthStart, monthEnd, periodLabel;

        if (startDate && endDate) {
            monthStart = startDate + ' 00:00:00+07';
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

        const emp = await db.get('SELECT id, full_name FROM users WHERE id = $1', [user_id]);
        if (!emp) return reply.code(404).send({ error: 'Không tìm thấy NV Sale' });

        const isDirector = request.user.role === 'giam_doc' || request.user.role === 'admin';
        const isOwner = request.user.id === parseInt(user_id);

        const orders = await db.all(`
            SELECT
                d.id AS order_id,
                d.category_id,
                cat.name AS category_name,
                d.order_code,
                COALESCE(NULLIF(c.customer_name, ''), d.customer_name) AS customer_name,
                COALESCE(NULLIF(c.phone, ''), d.customer_phone) AS customer_phone,
                u.full_name AS sale_name,
                s.name AS source_name,
                COALESCE(oi_sum.revenue, 0) AS revenue,
                d.created_at,
                ${getCustomerTypeSql('d', 'c')}
            FROM dht_orders d
            JOIN order_codes oc ON oc.order_code = d.order_code
            JOIN customers c ON oc.customer_id = c.id
            LEFT JOIN users u ON u.id = c.assigned_to_id
            LEFT JOIN settings_sources s ON s.id = c.source_id
            LEFT JOIN dht_categories cat ON cat.id = d.category_id
            LEFT JOIN LATERAL (
                SELECT COALESCE(
                    (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id),
                    0
                ) - COALESCE(d.vat_amount, 0) AS revenue
            ) oi_sum ON true
            LEFT JOIN users ref ON ref.id = c.referrer_id AND ref.role = 'tkaffiliate'
            WHERE c.assigned_to_id = $1
              AND COALESCE(c.cancel_approved, 0) != 1
              AND COALESCE(d.is_draft, false) = false
              AND d.created_at >= $2::timestamptz
              AND d.created_at < $3::timestamptz
              AND COALESCE(oc.status, 'active') != 'cancelled'
              ${buildProductionFilter(await getProductionCutoff(), await getTestAccountIds(), 'c.created_at', 'c.created_by')}
            ORDER BY d.created_at DESC
        `, [parseInt(user_id), monthStart, monthEnd]);

        const { maskPhone: _kpiMaskPhone } = require('../utils/dataMasking');
        const maskedOrders = orders.map(o => {
            if (isDirector || isOwner || request.user.role === 'quan_ly_cap_cao') {
                return o;
            } else {
                return { ...o, customer_phone: _kpiMaskPhone(o.customer_phone) };
            }
        });

        const _isPetTem = (o) => {
            const cat = (o.category_name || '').toUpperCase();
            const code = (o.order_code || '').toUpperCase();
            return cat === 'PET' || cat === 'TEM' || code.startsWith('GCPET') || code.startsWith('GCTEM') || [8, 9].includes(Number(o.category_id));
        };
        const enrichedOrders = maskedOrders.map(o => ({ ...o, is_pet_tem: _isPetTem(o) }));
        const totalNew = enrichedOrders.filter(o => o.customer_type === 'moi').length;
        const totalOldDp = enrichedOrders.filter(o => o.customer_type === 'cu' && !o.is_pet_tem).length;
        const totalOldPetTem = enrichedOrders.filter(o => o.customer_type === 'cu' && o.is_pet_tem).length;
        const retentionRow = await db.get(`
            WITH valid_orders AS (
                SELECT 
                    d.id AS order_id, d.created_at,
                    COALESCE(c.id::text, REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g')) AS customer_key,
                    c.customer_type AS cust_table_type,
                    c.created_at AS customer_created_at,
                    CASE 
                        WHEN UPPER(COALESCE(cat.name, '')) IN ('PET', 'TEM')
                          OR UPPER(COALESCE(d.order_code, '')) LIKE 'GCPET%'
                          OR UPPER(COALESCE(d.order_code, '')) LIKE 'GCTEM%'
                          OR d.category_id IN (8, 9)
                        THEN 'pettem'
                        ELSE 'dp'
                    END AS business_area
                FROM dht_orders d
                JOIN order_codes oc ON oc.order_code = d.order_code
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN dht_categories cat ON cat.id = d.category_id
                WHERE c.assigned_to_id = $1
                  AND c.phone IS NOT NULL AND c.phone != ''
                  AND COALESCE(c.cancel_approved, 0) != 1
                  AND COALESCE(d.is_draft, false) = false
                  AND COALESCE(oc.status, 'active') NOT IN ('cancelled', 'canceled')
            ),
            prior_cust AS (
                SELECT DISTINCT business_area, customer_key
                FROM valid_orders
                WHERE created_at < $2::timestamp
                   OR customer_created_at < $2::timestamp
                   OR cust_table_type = 'cu'
            ),
            current_orders AS (
                SELECT business_area, customer_key, COUNT(DISTINCT order_id) AS order_cnt
                FROM valid_orders
                WHERE created_at >= $2::timestamp AND created_at < $3::timestamp
                GROUP BY business_area, customer_key
            ),
            old_pool AS (
                SELECT business_area, customer_key FROM prior_cust
                UNION
                SELECT business_area, customer_key FROM current_orders WHERE order_cnt >= 2
            ),
            returning_cust AS (
                SELECT DISTINCT c.business_area, c.customer_key
                FROM current_orders c
                JOIN old_pool p ON p.customer_key = c.customer_key AND p.business_area = c.business_area
            )
            SELECT
                (SELECT COUNT(DISTINCT customer_key) FROM old_pool WHERE business_area = 'dp') AS old_dp_total,
                (SELECT COUNT(DISTINCT customer_key) FROM returning_cust WHERE business_area = 'dp') AS ret_dp_cust,
                (SELECT COUNT(DISTINCT customer_key) FROM old_pool WHERE business_area = 'pettem') AS old_pettem_total,
                (SELECT COUNT(DISTINCT customer_key) FROM returning_cust WHERE business_area = 'pettem') AS ret_pettem_cust
        `, [parseInt(user_id), monthStart, monthEnd]);

        const oldDpTotal = parseInt(retentionRow?.old_dp_total || 0);
        const retDpCust = parseInt(retentionRow?.ret_dp_cust || 0);
        const oldPetTemTotal = parseInt(retentionRow?.old_pettem_total || 0);
        const retPetTemCust = parseInt(retentionRow?.ret_pettem_cust || 0);

        return {
            employee: emp,
            month: month,
            periodLabel: periodLabel,
            orders: enrichedOrders,
            summary: {
                total: enrichedOrders.length,
                new_orders: totalNew,
                old_orders_dp: totalOldDp,
                old_orders_pettem: totalOldPetTem,
                total_lv_dp: enrichedOrders.filter(o => !o.is_pet_tem).length,
                total_lv_pettem: enrichedOrders.filter(o => o.is_pet_tem).length,
                old_orders: totalOldDp + totalOldPetTem,
                old_dp_total: oldDpTotal,
                ret_dp_cust: retDpCust,
                old_pettem_total: oldPetTemTotal,
                ret_pettem_cust: retPetTemCust,
                rate_dp: oldDpTotal > 0 ? Math.round(1000 * retDpCust / oldDpTotal) / 10 : null,
                rate_pettem: oldPetTemTotal > 0 ? Math.round(1000 * retPetTemCust / oldPetTemTotal) / 10 : null,
                total_revenue: enrichedOrders.reduce((s, o) => s + parseFloat(o.revenue || 0), 0)
            }
        };
    });

    // ===== GET /api/kpi-sale/employee-retention-detail =====
    fastify.get('/api/kpi-sale/employee-retention-detail', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, month, startDate, endDate } = request.query;
        if (!user_id) return reply.code(400).send({ error: 'Thiếu user_id' });

        let monthStart, monthEnd, periodLabel;
        if (startDate && endDate) {
            monthStart = startDate + ' 00:00:00+07';
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

        const emp = await db.get('SELECT id, full_name FROM users WHERE id = $1', [user_id]);
        if (!emp) return reply.code(404).send({ error: 'Không tìm thấy NV' });

        const isDirector = request.user.role === 'giam_doc';
        const isOwner = request.user.id === parseInt(user_id);
        const canSeePhone = isDirector || isOwner || request.user.role === 'quan_ly_cap_cao';
        const { maskPhone } = require('../utils/dataMasking');

        const orders = await db.all(`
            SELECT 
                d.id AS order_id, d.order_code, d.created_at,
                c.id AS customer_id,
                COALESCE(NULLIF(c.customer_name, ''), d.customer_name) AS customer_name,
                COALESCE(NULLIF(c.phone, ''), d.customer_phone) AS customer_phone,
                c.customer_type,
                c.created_at AS customer_created_at,
                CASE 
                    WHEN UPPER(COALESCE(cat.name, '')) IN ('PET', 'TEM')
                      OR UPPER(COALESCE(d.order_code, '')) LIKE 'GCPET%'
                      OR UPPER(COALESCE(d.order_code, '')) LIKE 'GCTEM%'
                      OR d.category_id IN (8, 9)
                    THEN 'pettem'
                    ELSE 'dp'
                END AS business_area,
                COALESCE(oi_sum.revenue, 0) AS revenue
            FROM dht_orders d
            JOIN order_codes oc ON oc.order_code = d.order_code
            JOIN customers c ON oc.customer_id = c.id
            LEFT JOIN dht_categories cat ON cat.id = d.category_id
            LEFT JOIN LATERAL (
                SELECT COALESCE(
                    (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id),
                    0
                ) - COALESCE(d.vat_amount, 0) AS revenue
            ) oi_sum ON true
            WHERE c.assigned_to_id = $1
              AND COALESCE(c.cancel_approved, 0) != 1
              AND COALESCE(d.is_draft, false) = false
              AND COALESCE(oc.status, 'active') NOT IN ('cancelled', 'canceled')
              AND d.created_at < $2::timestamptz
            ORDER BY d.created_at ASC
        `, [parseInt(user_id), monthEnd]);

        const custMap = {};
        for (const o of orders) {
            const key = `${o.customer_id}_${o.business_area}`;
            if (!custMap[key]) {
                custMap[key] = {
                    customer_id: o.customer_id,
                    customer_name: o.customer_name,
                    customer_phone: canSeePhone ? o.customer_phone : maskPhone(o.customer_phone),
                    business_area: o.business_area,
                    customer_created_at: o.customer_created_at,
                    first_order_date: o.created_at,
                    prior_orders_cnt: 0,
                    month_orders_cnt: 0,
                    month_revenue: 0,
                    total_orders_cnt: 0
                };
            }
            custMap[key].total_orders_cnt++;
            const isPrior = new Date(o.created_at) < new Date(monthStart);
            const isMonth = new Date(o.created_at) >= new Date(monthStart) && new Date(o.created_at) < new Date(monthEnd);

            if (isPrior) {
                custMap[key].prior_orders_cnt++;
            }
            if (isMonth) {
                custMap[key].month_orders_cnt++;
                custMap[key].month_revenue += parseFloat(o.revenue || 0);
            }
        }

        const allCusts = Object.values(custMap);
        
        const prior_old_customers = allCusts.filter(c => {
            return c.prior_orders_cnt > 0 || 
                   (c.customer_created_at && new Date(c.customer_created_at) < new Date(monthStart)) ||
                   c.customer_type === 'cu';
        });

        const returning_old_customers = allCusts.filter(c => {
            const isPriorOld = c.prior_orders_cnt > 0 || 
                               (c.customer_created_at && new Date(c.customer_created_at) < new Date(monthStart)) ||
                               c.customer_type === 'cu';
            if (isPriorOld) {
                return c.month_orders_cnt > 0;
            } else {
                return c.month_orders_cnt >= 2;
            }
        });

        const new_customers = allCusts.filter(c => {
            const isPriorOld = c.prior_orders_cnt > 0 || 
                               (c.customer_created_at && new Date(c.customer_created_at) < new Date(monthStart)) ||
                               c.customer_type === 'cu';
            return (!isPriorOld) && c.month_orders_cnt > 0;
        });

        return {
            employee: emp,
            periodLabel: periodLabel,
            prior_old_customers,
            returning_old_customers,
            new_customers
        };
    });

    // ===== GET /api/kpi-sale/team-orders =====
    fastify.get('/api/kpi-sale/team-orders', { preHandler: [authenticate] }, async (request, reply) => {
        const { dept_id, month, startDate, endDate } = request.query;
        if (!dept_id) return reply.code(400).send({ error: 'Thiếu dept_id' });

        let monthStart, monthEnd, periodLabel;

        if (startDate && endDate) {
            monthStart = startDate + ' 00:00:00+07';
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

        const dept = await db.get('SELECT id, name FROM departments WHERE id = $1', [dept_id]);
        if (!dept) return reply.code(404).send({ error: 'Không tìm thấy phòng/team' });

        const isDirector = request.user.role === 'giam_doc' || request.user.role === 'admin' || request.user.role === 'quan_ly_cap_cao';

        const orders = await db.all(`
            SELECT
                d.id AS order_id,
                d.category_id,
                cat.name AS category_name,
                d.order_code,
                COALESCE(NULLIF(c.customer_name, ''), d.customer_name) AS customer_name,
                COALESCE(NULLIF(c.phone, ''), d.customer_phone) AS customer_phone,
                u.full_name AS sale_name,
                s.name AS source_name,
                COALESCE(oi_sum.revenue, 0) AS revenue,
                d.created_at,
                ${getCustomerTypeSql('d', 'c')}
            FROM dht_orders d
            JOIN order_codes oc ON oc.order_code = d.order_code
            JOIN customers c ON oc.customer_id = c.id
            LEFT JOIN users u ON u.id = c.assigned_to_id
            LEFT JOIN settings_sources s ON s.id = c.source_id
            LEFT JOIN dht_categories cat ON cat.id = d.category_id
            LEFT JOIN LATERAL (
                SELECT COALESCE(
                    (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id),
                    0
                ) - COALESCE(d.vat_amount, 0) AS revenue
            ) oi_sum ON true
            LEFT JOIN users ref ON ref.id = c.referrer_id AND ref.role = 'tkaffiliate'
            WHERE (c.assigned_to_id IN (SELECT id FROM users WHERE (department_id = $1 OR department_id IN (SELECT id FROM departments WHERE parent_id = $1)) AND status = 'active'))
              AND COALESCE(c.cancel_approved, 0) != 1
              AND COALESCE(d.is_draft, false) = false
              AND d.created_at >= $2::timestamptz
              AND d.created_at < $3::timestamptz
              AND COALESCE(oc.status, 'active') != 'cancelled'
              ${buildProductionFilter(await getProductionCutoff(), await getTestAccountIds(), 'c.created_at', 'c.created_by')}
            ORDER BY d.created_at DESC
        `, [parseInt(dept_id), monthStart, monthEnd]);

        const { maskPhone: _kpiMaskPhone } = require('../utils/dataMasking');
        const maskedOrders = orders.map(o => {
            if (isDirector) {
                return o;
            } else {
                return { ...o, customer_phone: _kpiMaskPhone(o.customer_phone) };
            }
        });

        const _isPetTem = (o) => {
            const cat = (o.category_name || '').toUpperCase();
            const code = (o.order_code || '').toUpperCase();
            return cat === 'PET' || cat === 'TEM' || code.startsWith('GCPET') || code.startsWith('GCTEM') || [8, 9].includes(Number(o.category_id));
        };
        const enrichedOrders = maskedOrders.map(o => ({ ...o, is_pet_tem: _isPetTem(o) }));
        const totalNew = enrichedOrders.filter(o => o.customer_type === 'moi').length;
        const totalOldDp = enrichedOrders.filter(o => o.customer_type === 'cu' && !o.is_pet_tem).length;
        const totalOldPetTem = enrichedOrders.filter(o => o.customer_type === 'cu' && o.is_pet_tem).length;

        return {
            dept: dept,
            month: month,
            periodLabel: periodLabel,
            orders: enrichedOrders,
            summary: {
                total: enrichedOrders.length,
                new_orders: totalNew,
                old_orders_dp: totalOldDp,
                old_orders_pettem: totalOldPetTem,
                total_lv_dp: enrichedOrders.filter(o => !o.is_pet_tem).length,
                total_lv_pettem: enrichedOrders.filter(o => o.is_pet_tem).length,
                old_orders: totalOldDp + totalOldPetTem,
                total_revenue: enrichedOrders.reduce((s, o) => s + parseFloat(o.revenue || 0), 0)
            }
        };
    });

    // ===== GET /api/reports/kpi-sale-achievement — yearly achievement summary for Sale =====
    fastify.get('/api/reports/kpi-sale-achievement', { preHandler: [authenticate] }, async (request, reply) => {
        const year = parseInt(request.query.year) || new Date().getFullYear();

        // 1. Get Sale department tree
        const allDepts = await db.all(
            "SELECT id, name, parent_id, head_user_id FROM departments WHERE (id = 4 OR parent_id = 4) AND status = 'active' ORDER BY display_order, id"
        );
        const rootDept = allDepts.find(d => d.id === 4) || allDepts[0];
        if (!rootDept) return { users: [], teams: [], year };
        const childDepts = allDepts.filter(d => d.parent_id === rootDept.id);
        const allDeptIds = allDepts.map(d => d.id);
        if (allDeptIds.length === 0) return { users: [], teams: [], year };

        // 2. Get all active users in Sale
        const salePh = allDeptIds.map((_, i) => `$${i + 1}`).join(',');
        const users = await db.all(
            `SELECT u.id, u.full_name, u.role, u.department_id, u.username
             FROM users u WHERE u.department_id IN (${salePh}) AND u.status = 'active' AND u.role != 'giam_doc'`,
            allDeptIds
        );

        // 3. Get ALL kpi_targets for this year (monthly)
        const targets = await db.all(
            `SELECT target_type, target_id, metric, period_value, target_value
             FROM kpi_targets WHERE period_type = 'month' AND period_value LIKE $1`,
            [`T%/${year}`]
        );
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
                EXTRACT(MONTH FROM d.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS mo,
                COALESCE(SUM(oi_sum.revenue - COALESCE(d.discount_amount, 0)), 0) AS revenue
            FROM dht_orders d
            JOIN order_codes oc ON oc.order_code = d.order_code
            JOIN customers c ON oc.customer_id = c.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(
                    (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id),
                    0
                ) - COALESCE(d.vat_amount, 0) AS revenue
            ) oi_sum ON true
            WHERE c.assigned_to_id IN (${empPh})
              AND COALESCE(c.cancel_approved, 0) != 1
              AND COALESCE(d.is_draft, false) = false
              AND d.created_at >= $${empIds.length + 1}::timestamp
              AND d.created_at < $${empIds.length + 2}::timestamp
              AND COALESCE(oc.status, 'active') != 'cancelled'
              ${buildProductionFilter(await getProductionCutoff(), await getTestAccountIds(), 'c.created_at', 'c.created_by')}
            GROUP BY c.assigned_to_id, mo
        `, [...empIds, yearStart, yearEnd]);

        const revMap = {};
        monthlyRevRows.forEach(r => {
            if (!revMap[r.uid]) revMap[r.uid] = {};
            revMap[r.uid][r.mo] = parseFloat(r.revenue);
        });

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

        const teamList = [];
        const mgrUsers = userResults.filter(u => ['quan_ly', 'quan_ly_cap_cao'].includes(u.role));
        const rootNonMgr = userResults.filter(u => u.department_id === rootDept.id && !['quan_ly', 'quan_ly_cap_cao'].includes(u.role));
        const qlGroup = [...mgrUsers, ...rootNonMgr];
        if (qlGroup.length > 0) teamList.push(buildTeamAgg('QUẢN LÝ SALE', rootDept.id, qlGroup, currentMonth));

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
