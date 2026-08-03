/**
 * Route báo cáo & chỉ tiêu KPI Marketing
 * Thống kê chi tiết theo Cây Mục Marketing (Ảnh 2) & Nhân sự Marketing
 * Hỗ trợ Timeline 31 ngày, 3 mốc Giai đoạn, Mốc 1, Mốc 120% & Bộ 5 chỉ số KPI linh hoạt (Ảnh 3)
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function(fastify, options) {

    // Ensure database migration for mkt_kpi_targets
    try {
        await db.run('ALTER TABLE mkt_kpi_targets ADD COLUMN IF NOT EXISTS target_leads_m120 INT DEFAULT 0');
        await db.run('ALTER TABLE mkt_kpi_targets ADD COLUMN IF NOT EXISTS target_revenue_m120 NUMERIC DEFAULT 0');
        await db.run('ALTER TABLE mkt_kpi_targets ADD COLUMN IF NOT EXISTS category_id INT');
        await db.run('ALTER TABLE mkt_kpi_targets ADD COLUMN IF NOT EXISTS target_cpl NUMERIC DEFAULT 0');
        await db.run('ALTER TABLE mkt_kpi_targets ADD COLUMN IF NOT EXISTS target_roas NUMERIC DEFAULT 0');
        await db.run('ALTER TABLE mkt_kpi_targets ADD COLUMN IF NOT EXISTS target_cpo NUMERIC DEFAULT 0');
        await db.run('ALTER TABLE mkt_kpi_targets ADD COLUMN IF NOT EXISTS target_cost_ratio NUMERIC DEFAULT 0');
        await db.run('ALTER TABLE mkt_kpi_targets ADD COLUMN IF NOT EXISTS target_close_rate NUMERIC DEFAULT 0');
        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS show_in_kpi_mkt BOOLEAN DEFAULT FALSE');

        // Initial default: enable show_in_kpi_mkt for existing core initial categories (excluding newly added ones like 'Tờ Rơi')
        await db.run(`
            UPDATE mkt_categories 
            SET show_in_kpi_mkt = TRUE 
            WHERE show_in_kpi_mkt IS NULL OR (is_active = TRUE AND parent_id IS NOT NULL AND LOWER(name) IN ('đồng phục hv - đồng phục công ty, nhà hàng', 'xưởng in hv - xưởng in pet , in tem eco gia công', 'seo web', 'tiktok test'))
        `);
    } catch(e) {
        console.error('Migration mkt_kpi_targets error:', e.message);
    }

    // ===== GET /api/reports/kpi-marketing =====
    fastify.get('/api/reports/kpi-marketing', async (request, reply) => {
        try {
            const { month } = request.query; // Format: YYYY-MM
            const now = new Date();
            let year, mo;
            if (month && /^\d{4}-\d{2}$/.test(month)) {
                [year, mo] = month.split('-').map(Number);
            } else {
                year = now.getFullYear();
                mo = now.getMonth() + 1;
            }

            const periodValue = `${year}-${String(mo).padStart(2, '0')}`;
            const daysInMonth = new Date(year, mo, 0).getDate();
            let daysLeft = 0;
            if (year === now.getFullYear() && mo === now.getMonth() + 1) {
                daysLeft = daysInMonth - now.getDate();
            } else if (new Date(year, mo - 1, 1) > now) {
                daysLeft = daysInMonth;
            }
            const periodLabel = `T${mo}/${year}`;

            // Current Phase (1: 1-10, 2: 11-20, 3: 21-31)
            let currentPhase = 1;
            const currentDay = (year === now.getFullYear() && mo === now.getMonth() + 1) ? now.getDate() : 31;
            if (currentDay <= 10) currentPhase = 1;
            else if (currentDay <= 20) currentPhase = 2;
            else currentPhase = 3;

            // 1. Get all active system categories tree from mkt_categories
            const allSystemCats = await db.all(`
                SELECT id, parent_id, group_type, name, icon, ads_handler_name, linked_source_name, pancake_page_id, pancake_page_name, show_in_kpi_mkt
                FROM mkt_categories
                WHERE is_active = TRUE
                ORDER BY CASE WHEN group_type = 'online' THEN 1 ELSE 2 END ASC, parent_id ASC NULLS FIRST, sort_order ASC, id ASC
            `);

            // Filter allCats for KPI Marketing Ads: must have show_in_kpi_mkt = TRUE or be a parent category
            const allCats = (allSystemCats || []).filter(c => c.show_in_kpi_mkt === true || c.show_in_kpi_mkt === 'true' || c.parent_id === null || c.parent_id === undefined);

            const catMap = new Map();
            (allCats || []).forEach(c => catMap.set(c.id, c));

            // Map handler to categories
            const handlerSet = new Set(['Giám Đốc']);
            (allCats || []).forEach(c => {
                if (c.ads_handler_name && c.ads_handler_name.trim()) {
                    handlerSet.add(c.ads_handler_name.trim());
                }
            });

            const savedResources = await db.all("SELECT DISTINCT ads_handler_name FROM mkt_ads_handler_resources WHERE ads_handler_name IS NOT NULL AND ads_handler_name != ''");
            (savedResources || []).forEach(r => handlerSet.add(r.ads_handler_name.trim()));

            // 2. Fetch daily spent & metrics from marketing_budgets
            const budgetRows = await db.all(`
                SELECT 
                    id, category_id,
                    COALESCE(NULLIF(TRIM(ads_handler_name), ''), 'Giám Đốc') AS handler_name,
                    linked_source_name, pancake_page_name,
                    budget_date,
                    spent_amount, budget_amount, lead_count, order_count, revenue_amount
                FROM marketing_budgets
                WHERE budget_year::text = ? AND (budget_month::text = ? OR budget_month::text = ?)
            `, [String(year), String(mo), String(mo).padStart(2, '0')]);

            const dhtOrders = await db.all(`
                WITH ActiveSources AS (
                    SELECT DISTINCT 
                        LOWER(TRIM(REGEXP_REPLACE(unnest(string_to_array(linked_source_name, ',')), '\\s*\\/\\s*', '/', 'g'))) as clean_src
                    FROM mkt_categories 
                    WHERE is_active = TRUE AND NULLIF(TRIM(linked_source_name), '') IS NOT NULL
                ),
                NormalizedOrders AS (
                    SELECT 
                        o.id,
                        o.order_code,
                        TO_CHAR(o.order_date, 'YYYY-MM-DD') as dt_str,
                        TRIM(o.source) as source,
                        LOWER(TRIM(REGEXP_REPLACE(o.source, '\\s*\\/\\s*', '/', 'g'))) as clean_source_key,
                        o.total_amount,
                        RIGHT(REGEXP_REPLACE(COALESCE(c.phone, o.customer_phone, ''), '\\D', '', 'g'), 9) as norm_phone
                    FROM dht_orders o
                    LEFT JOIN customers c ON c.id = o.customer_id OR (
                        RIGHT(REGEXP_REPLACE(c.phone, '\\D', '', 'g'), 9) = RIGHT(REGEXP_REPLACE(o.customer_phone, '\\D', '', 'g'), 9)
                        AND RIGHT(REGEXP_REPLACE(o.customer_phone, '\\D', '', 'g'), 9) <> ''
                    )
                    WHERE o.order_date IS NOT NULL 
                      AND COALESCE(o.is_draft, false) = false
                      AND EXTRACT(YEAR FROM o.order_date) = $1
                      AND EXTRACT(MONTH FROM o.order_date) = $2
                      AND NULLIF(TRIM(o.source), '') IS NOT NULL
                      AND LOWER(TRIM(REGEXP_REPLACE(o.source, '\\s*\\/\\s*', '/', 'g'))) IN (SELECT clean_src FROM ActiveSources)
                ),
                RankedOrders AS (
                    SELECT 
                        *,
                        ROW_NUMBER() OVER (
                            PARTITION BY norm_phone 
                            ORDER BY dt_str ASC, id ASC
                        ) as rn
                    FROM NormalizedOrders
                )
                SELECT 
                    id, order_code, source, total_amount, dt_str
                FROM RankedOrders
                WHERE rn = 1
            `, [year, mo]);

            // Daily map per handler: { handler_name -> { day -> { spent, leads, orders, revenue } } }
            const handlerDailyMap = {};
            // Daily map per category item: { cat_id -> { day -> { spent, leads, orders, revenue } } }
            const catDailyMap = {};

            (budgetRows || []).forEach(b => {
                const hName = b.handler_name;
                handlerSet.add(hName);

                let dayNum = 1;
                if (b.budget_date && b.budget_date.length >= 10) {
                    dayNum = parseInt(b.budget_date.substring(8, 10), 10);
                }
                if (isNaN(dayNum) || dayNum < 1 || dayNum > daysInMonth) dayNum = 1;

                if (!handlerDailyMap[hName]) handlerDailyMap[hName] = {};
                if (!handlerDailyMap[hName][dayNum]) {
                    handlerDailyMap[hName][dayNum] = { spent: 0, budget: 0, leads: 0, orders: 0, revenue: 0 };
                }
                handlerDailyMap[hName][dayNum].spent += Number(b.spent_amount || 0);
                handlerDailyMap[hName][dayNum].budget += Number(b.budget_amount || 0);
                handlerDailyMap[hName][dayNum].leads += Number(b.lead_count || 0);
                handlerDailyMap[hName][dayNum].orders += Number(b.order_count || 0);
                handlerDailyMap[hName][dayNum].revenue += Number(b.revenue_amount || 0);

                let matchedCatIds = [];
                if (b.category_id) {
                    matchedCatIds.push(Number(b.category_id));
                }
                
                if (matchedCatIds.length === 0 && b.linked_source_name) {
                    const bSrc = b.linked_source_name.trim().toLowerCase();
                    (allCats || []).forEach(c => {
                        if (c.parent_id !== null) {
                            const cSrc1 = (c.linked_source_name || '').trim().toLowerCase();
                            const cSrc2 = (c.pancake_page_name || '').trim().toLowerCase();
                            if (cSrc1 === bSrc || cSrc2 === bSrc || (c.name && c.name.trim().toLowerCase().includes(bSrc))) {
                                matchedCatIds.push(c.id);
                            }
                        }
                    });
                }

                const uniqueCids = Array.from(new Set(matchedCatIds));
                uniqueCids.forEach(cid => {
                    if (!catDailyMap[cid]) catDailyMap[cid] = {};
                    if (!catDailyMap[cid][dayNum]) {
                        catDailyMap[cid][dayNum] = { spent: 0, budget: 0, leads: 0, orders: 0, revenue: 0 };
                    }
                    catDailyMap[cid][dayNum].spent += Number(b.spent_amount || 0);
                    catDailyMap[cid][dayNum].budget += Number(b.budget_amount || 0);
                    catDailyMap[cid][dayNum].leads += Number(b.lead_count || 0);
                    catDailyMap[cid][dayNum].orders += Number(b.order_count || 0);
                    catDailyMap[cid][dayNum].revenue += Number(b.revenue_amount || 0);
                });
            });

            // Map dht_orders into handlerDailyMap & catDailyMap
            (dhtOrders || []).forEach(o => {
                const src = (o.source || '').trim().toLowerCase();
                if (!src) return;
                let dayNum = 1;
                if (o.dt_str && o.dt_str.length >= 10) {
                    dayNum = parseInt(o.dt_str.substring(8, 10), 10);
                }
                if (isNaN(dayNum) || dayNum < 1 || dayNum > daysInMonth) dayNum = 1;

                let matched = false;
                (allCats || []).forEach(c => {
                    if (matched) return;
                    if (c.parent_id !== null) {
                        const cSrc1 = (c.linked_source_name || '').trim().toLowerCase();
                        const cSrc2 = (c.pancake_page_name || '').trim().toLowerCase();
                        const cName = (c.name || '').trim().toLowerCase();
                        if ((cSrc1 && cSrc1 === src) || (cSrc2 && cSrc2 === src) || (cName && cName.includes(src))) {
                            matched = true;
                            if (!catDailyMap[c.id]) catDailyMap[c.id] = {};
                            if (!catDailyMap[c.id][dayNum]) {
                                catDailyMap[c.id][dayNum] = { spent: 0, budget: 0, leads: 0, orders: 0, revenue: 0 };
                            }
                            catDailyMap[c.id][dayNum].orders += 1;
                            catDailyMap[c.id][dayNum].revenue += Number(o.total_amount || 0);

                            const hName = c.ads_handler_name || 'Giám Đốc';
                            if (!handlerDailyMap[hName]) handlerDailyMap[hName] = {};
                            if (!handlerDailyMap[hName][dayNum]) {
                                handlerDailyMap[hName][dayNum] = { spent: 0, budget: 0, leads: 0, orders: 0, revenue: 0 };
                            }
                            handlerDailyMap[hName][dayNum].orders += 1;
                            handlerDailyMap[hName][dayNum].revenue += Number(o.total_amount || 0);
                        }
                    }
                });
            });

            // 3. Query KPI targets for this month
            const targetRows = await db.all(`
                SELECT * FROM mkt_kpi_targets
                WHERE period_value = ?
            `, [periodValue]);

            const targetMap = new Map();
            (targetRows || []).forEach(t => {
                targetMap.set(t.ads_handler_name, t);
                if (t.category_id) {
                    targetMap.set(`cat_${t.category_id}`, t);
                }
                if (t.ads_handler_name) {
                    handlerSet.add(t.ads_handler_name);
                }
            });

            // Helper: calculate stages (Phase 1: 1-10, Phase 2: 11-20, Phase 3: 21-end)
            function calcStages(dailySpentArr, dailyLeadsArr, dailyRevArr, tBudget, tLeads1, tLeads120, tRev1, tRev120) {
                const s1Days = 10;
                const s2Days = 10;
                const s3Days = Math.max(1, daysInMonth - 20);

                const ratio1 = s1Days / daysInMonth;
                const ratio2 = s2Days / daysInMonth;
                const ratio3 = s3Days / daysInMonth;

                // Stage 1
                let s1Spent = 0, s1Leads = 0, s1Rev = 0;
                for (let d = 1; d <= 10; d++) {
                    s1Spent += dailySpentArr[d - 1] || 0;
                    s1Leads += dailyLeadsArr[d - 1] || 0;
                    s1Rev += dailyRevArr[d - 1] || 0;
                }

                // Stage 2
                let s2Spent = 0, s2Leads = 0, s2Rev = 0;
                for (let d = 11; d <= 20; d++) {
                    s2Spent += dailySpentArr[d - 1] || 0;
                    s2Leads += dailyLeadsArr[d - 1] || 0;
                    s2Rev += dailyRevArr[d - 1] || 0;
                }

                // Stage 3
                let s3Spent = 0, s3Leads = 0, s3Rev = 0;
                for (let d = 21; d <= daysInMonth; d++) {
                    s3Spent += dailySpentArr[d - 1] || 0;
                    s3Leads += dailyLeadsArr[d - 1] || 0;
                    s3Rev += dailyRevArr[d - 1] || 0;
                }

                return {
                    stage1: {
                        label: 'GIAI ĐOẠN 1 (1-10)',
                        days: s1Days,
                        spent: s1Spent,
                        leads: s1Leads,
                        revenue: s1Rev,
                        cpl: s1Leads > 0 ? Math.round(s1Spent / s1Leads) : 0,
                        target_leads_1: Math.round(tLeads1 * ratio1),
                        target_leads_120: Math.round(tLeads120 * ratio1),
                        target_rev_1: Math.round(tRev1 * ratio1),
                        target_rev_120: Math.round(tRev120 * ratio1),
                        target_leads_per_day: Math.round((tLeads1 * ratio1) / s1Days),
                        target_rev_per_day: Math.round((tRev1 * ratio1) / s1Days),
                        missing_leads_1: Math.max(0, Math.round(tLeads1 * ratio1) - s1Leads),
                        missing_rev_1: Math.max(0, Math.round(tRev1 * ratio1) - s1Rev)
                    },
                    stage2: {
                        label: 'GIAI ĐOẠN 2 (11-20)',
                        days: s2Days,
                        spent: s2Spent,
                        leads: s2Leads,
                        revenue: s2Rev,
                        cpl: s2Leads > 0 ? Math.round(s2Spent / s2Leads) : 0,
                        target_leads_1: Math.round(tLeads1 * ratio2),
                        target_leads_120: Math.round(tLeads120 * ratio2),
                        target_rev_1: Math.round(tRev1 * ratio2),
                        target_rev_120: Math.round(tRev120 * ratio2),
                        target_leads_per_day: Math.round((tLeads1 * ratio2) / s2Days),
                        target_rev_per_day: Math.round((tRev1 * ratio2) / s2Days),
                        missing_leads_1: Math.max(0, Math.round(tLeads1 * ratio2) - s2Leads),
                        missing_rev_1: Math.max(0, Math.round(tRev1 * ratio2) - s2Rev)
                    },
                    stage3: {
                        label: `GIAI ĐOẠN 3 (21-${daysInMonth})`,
                        days: s3Days,
                        spent: s3Spent,
                        leads: s3Leads,
                        revenue: s3Rev,
                        cpl: s3Leads > 0 ? Math.round(s3Spent / s3Leads) : 0,
                        target_leads_1: Math.round(tLeads1 * ratio3),
                        target_leads_120: Math.round(tLeads120 * ratio3),
                        target_rev_1: Math.round(tRev1 * ratio3),
                        target_rev_120: Math.round(tRev120 * ratio3),
                        target_leads_per_day: Math.round((tLeads1 * ratio3) / s3Days),
                        target_rev_per_day: Math.round((tRev1 * ratio3) / s3Days),
                        missing_leads_1: Math.max(0, Math.round(tLeads1 * ratio3) - s3Leads),
                        missing_rev_1: Math.max(0, Math.round(tRev1 * ratio3) - s3Rev)
                    }
                };
            }

            // 4. Build output per handler & nested categories
            const handlers = [];
            let totalSpent = 0;
            let totalBudget = 0;
            let totalLeads = 0;
            let totalOrders = 0;
            let totalRevenue = 0;
            let totalTargetBudget = 0;
            let totalTargetLeadsM1 = 0;
            let totalTargetLeadsM120 = 0;
            let totalTargetRevM1 = 0;
            let totalTargetRevM120 = 0;

            const overallDailySpent = new Array(daysInMonth).fill(0);
            const overallDailyLeads = new Array(daysInMonth).fill(0);
            const overallDailyOrders = new Array(daysInMonth).fill(0);
            const overallDailyRevenue = new Array(daysInMonth).fill(0);

            const sortedHandlerNames = Array.from(handlerSet)
                .filter(n => n && typeof n === 'string' && n.trim().length > 0)
                .map(n => n.trim())
                .sort((a, b) => a.localeCompare(b, 'vi'));

            sortedHandlerNames.forEach(hName => {
                const t = targetMap.get(hName) || {};

                const dailySpent = new Array(daysInMonth).fill(0);
                const dailyLeads = new Array(daysInMonth).fill(0);
                const dailyOrders = new Array(daysInMonth).fill(0);
                const dailyRevenue = new Array(daysInMonth).fill(0);
                const dailyCpl = new Array(daysInMonth).fill(0);
                const dailyCpo = new Array(daysInMonth).fill(0);
                const dailyRoas = new Array(daysInMonth).fill(0);
                const dailyCloseRate = new Array(daysInMonth).fill(0);

                const dMap = handlerDailyMap[hName] || {};
                let spent = 0, budget = 0, leads = 0, orders = 0, revenue = 0;

                for (let d = 1; d <= daysInMonth; d++) {
                    const dm = dMap[d] || { spent: 0, budget: 0, leads: 0, orders: 0, revenue: 0 };
                    dailySpent[d - 1] = dm.spent;
                    dailyLeads[d - 1] = dm.leads;
                    dailyOrders[d - 1] = dm.orders;
                    dailyRevenue[d - 1] = dm.revenue;
                    dailyCpl[d - 1] = dm.leads > 0 ? Math.round(dm.spent / dm.leads) : 0;
                    dailyCpo[d - 1] = dm.orders > 0 ? Math.round(dm.spent / dm.orders) : 0;
                    dailyRoas[d - 1] = dm.spent > 0 ? Math.round((dm.revenue / dm.spent) * 10000) / 100 : 0;
                    dailyCloseRate[d - 1] = dm.leads > 0 ? Math.round((dm.orders / dm.leads) * 1000) / 10 : 0;

                    spent += dm.spent;
                    budget += dm.budget;
                    leads += dm.leads;
                    orders += dm.orders;
                    revenue += dm.revenue;

                    overallDailySpent[d - 1] += dm.spent;
                    overallDailyLeads[d - 1] += dm.leads;
                    overallDailyOrders[d - 1] += dm.orders;
                    overallDailyRevenue[d - 1] += dm.revenue;
                }

                const targetBudget = Number(t.target_budget || 0);
                const targetLeads1 = Number(t.target_leads || 0);
                const targetLeads120 = Number(t.target_leads_m120 || Math.round(targetLeads1 * 1.2));
                const targetRev1 = Number(t.target_revenue || 0);
                const targetRev120 = Number(t.target_revenue_m120 || Math.round(targetRev1 * 1.2));
                const targetCpl = Number(t.target_cpl || 0);
                const targetRoas = Number(t.target_roas || 0);
                const targetCpo = Number(t.target_cpo || 0);
                const targetCostRatio = Number(t.target_cost_ratio || 0);
                const targetCloseRate = Number(t.target_close_rate || 0);

                const cpl = leads > 0 ? Math.round(spent / leads) : 0;
                const cpo = orders > 0 ? Math.round(spent / orders) : 0;
                const roas = spent > 0 ? Math.round((revenue / spent) * 10000) / 100 : 0;
                const costRatio = revenue > 0 ? Math.round((spent / revenue) * 10000) / 100 : 0;
                const closeRate = leads > 0 ? Math.round((orders / leads) * 10000) / 100 : 0;

                totalSpent += spent;
                totalBudget += budget;
                totalLeads += leads;
                totalOrders += orders;
                totalRevenue += revenue;
                totalTargetBudget += targetBudget;
                totalTargetLeadsM1 += targetLeads1;
                totalTargetLeadsM120 += targetLeads120;
                totalTargetRevM1 += targetRev1;
                totalTargetRevM120 += targetRev120;

                const stages = calcStages(dailySpent, dailyLeads, dailyRevenue, targetBudget, targetLeads1, targetLeads120, targetRev1, targetRev120);

                // Build child category items managed by this handler
                const childItems = [];
                (allCats || []).forEach(cat => {
                    const isHandlerCat = (cat.ads_handler_name && cat.ads_handler_name.trim() === hName) ||
                                         (hName === 'Giám Đốc' && (!cat.ads_handler_name || !cat.ads_handler_name.trim()));
                    if (isHandlerCat && cat.parent_id !== null) {
                        const parentCat = catMap.get(cat.parent_id);
                        const cTarget = targetMap.get(`cat_${cat.id}`) || {};

                        const cDailySpent = new Array(daysInMonth).fill(0);
                        const cDailyLeads = new Array(daysInMonth).fill(0);
                        const cDailyOrders = new Array(daysInMonth).fill(0);
                        const cDailyRev = new Array(daysInMonth).fill(0);
                        const cDailyCpl = new Array(daysInMonth).fill(0);
                        const cDailyCpo = new Array(daysInMonth).fill(0);
                        const cDailyRoas = new Array(daysInMonth).fill(0);
                        const cDailyCloseRate = new Array(daysInMonth).fill(0);

                        const cdMap = catDailyMap[cat.id] || {};
                        let cSpent = 0, cLeads = 0, cOrders = 0, cRev = 0;

                        for (let d = 1; d <= daysInMonth; d++) {
                            const cdm = cdMap[d] || { spent: 0, budget: 0, leads: 0, orders: 0, revenue: 0 };
                            cDailySpent[d - 1] = cdm.spent;
                            cDailyLeads[d - 1] = cdm.leads;
                            cDailyOrders[d - 1] = cdm.orders;
                            cDailyRev[d - 1] = cdm.revenue;
                            cDailyCpl[d - 1] = cdm.leads > 0 ? Math.round(cdm.spent / cdm.leads) : 0;
                            cDailyCpo[d - 1] = cdm.orders > 0 ? Math.round(cdm.spent / cdm.orders) : 0;
                            cDailyRoas[d - 1] = cdm.spent > 0 ? Math.round((cdm.revenue / cdm.spent) * 10000) / 100 : 0;
                            cDailyCloseRate[d - 1] = cdm.leads > 0 ? Math.round((cdm.orders / cdm.leads) * 10000) / 100 : 0;

                            cSpent += cdm.spent;
                            cLeads += cdm.leads;
                            cOrders += cdm.orders;
                            cRev += cdm.revenue;
                        }

                        const cRevM1 = Number(cTarget.target_revenue || 0);
                        const cRevM120 = Number(cTarget.target_revenue_m120 || Math.round(cRevM1 * 1.2));
                        const cTargetCpl = Number(cTarget.target_cpl || 0);
                        const cTargetCpo = Number(cTarget.target_cpo || 0);
                        const cTargetCostRatio = Number(cTarget.target_cost_ratio || 0);
                        const cTargetCloseRate = Number(cTarget.target_close_rate || 0);

                        const cCpl = cLeads > 0 ? Math.round(cSpent / cLeads) : 0;
                        const cCpo = cOrders > 0 ? Math.round(cSpent / cOrders) : 0;
                        const cRoas = cSpent > 0 ? Math.round((cRev / cSpent) * 10000) / 100 : 0;
                        const cCostRatio = cRev > 0 ? Math.round((cSpent / cRev) * 10000) / 100 : 0;
                        const cCloseRate = cLeads > 0 ? Math.round((cOrders / cLeads) * 10000) / 100 : 0;

                        const cStages = calcStages(cDailySpent, cDailyLeads, cDailyRev, 0, 0, 0, cRevM1, cRevM120);

                        childItems.push({
                            category_id: cat.id,
                            category_name: cat.name,
                            channel_name: parentCat ? parentCat.name : 'Khác',
                            icon: cat.icon || (parentCat ? parentCat.icon : '📌'),
                            linked_source_name: cat.linked_source_name || '',
                            pancake_page_name: cat.pancake_page_name || '',
                            spent: cSpent,
                            leads: cLeads,
                            orders: cOrders,
                            revenue: cRev,
                            cpl: cCpl,
                            cpo: cCpo,
                            roas: cRoas,
                            cost_ratio: cCostRatio,
                            close_rate: cCloseRate,
                            targets: {
                                target_revenue_m1: cRevM1,
                                target_revenue_m120: cRevM120,
                                target_cpl: cTargetCpl,
                                target_cpo: cTargetCpo,
                                target_cost_ratio: cTargetCostRatio,
                                target_close_rate: cTargetCloseRate
                            },
                            efficiency: {
                                cpl: { actual: cCpl, target: cTargetCpl, is_ok: (cTargetCpl === 0 || cCpl <= cTargetCpl) },
                                cpo: { actual: cCpo, target: cTargetCpo, is_ok: (cTargetCpo === 0 || cCpo <= cTargetCpo) },
                                cost_ratio: { actual: cCostRatio, target: cTargetCostRatio, is_ok: (cTargetCostRatio === 0 || cCostRatio <= cTargetCostRatio) },
                                close_rate: { actual: cCloseRate, target: cTargetCloseRate, is_ok: (cTargetCloseRate === 0 || cCloseRate >= cTargetCloseRate) }
                            },
                            stages: cStages,
                            daily_spent: cDailySpent,
                            daily_leads: cDailyLeads,
                            daily_orders: cDailyOrders,
                            daily_revenue: cDailyRev,
                            daily_cpl: cDailyCpl,
                            daily_cpo: cDailyCpo,
                            daily_roas: cDailyRoas,
                            daily_close_rate: cDailyCloseRate
                        });
                    }
                });

                handlers.push({
                    ads_handler_name: hName,
                    actual: {
                        spent,
                        budget,
                        leads,
                        orders,
                        revenue,
                        cpl,
                        cpo,
                        roas,
                        cost_ratio: costRatio,
                        close_rate: closeRate
                    },
                    targets: {
                        target_budget: targetBudget,
                        target_leads_m1: targetLeads1,
                        target_leads_m120: targetLeads120,
                        target_revenue_m1: targetRev1,
                        target_revenue_m120: targetRev120,
                        target_cpl: targetCpl,
                        target_roas: targetRoas,
                        target_cpo: targetCpo,
                        target_cost_ratio: targetCostRatio,
                        target_close_rate: targetCloseRate
                    },
                    efficiency: {
                        cpl: { actual: cpl, target: targetCpl, is_ok: (targetCpl === 0 || cpl <= targetCpl) },
                        roas: { actual: roas, target: targetRoas, is_ok: (targetRoas === 0 || roas >= targetRoas) },
                        cpo: { actual: cpo, target: targetCpo, is_ok: (targetCpo === 0 || cpo <= targetCpo) },
                        cost_ratio: { actual: costRatio, target: targetCostRatio, is_ok: (targetCostRatio === 0 || costRatio <= targetCostRatio) },
                        close_rate: { actual: closeRate, target: targetCloseRate, is_ok: (targetCloseRate === 0 || closeRate >= targetCloseRate) }
                    },
                    rate: {
                        leads_pct_m1: targetLeads1 > 0 ? Math.round((leads / targetLeads1) * 1000) / 10 : 0,
                        leads_pct_m120: targetLeads120 > 0 ? Math.round((leads / targetLeads120) * 1000) / 10 : 0,
                        revenue_pct_m1: targetRev1 > 0 ? Math.round((revenue / targetRev1) * 1000) / 10 : 0,
                        revenue_pct_m120: targetRev120 > 0 ? Math.round((revenue / targetRev120) * 1000) / 10 : 0,
                        budget_pct: targetBudget > 0 ? Math.round((spent / targetBudget) * 1000) / 10 : 0
                    },
                    missing: {
                        leads_m1: targetLeads1 - leads,
                        leads_m120: targetLeads120 - leads,
                        revenue_m1: targetRev1 - revenue,
                        revenue_m120: targetRev120 - revenue
                    },
                    stages,
                    daily: {
                        spent: dailySpent,
                        leads: dailyLeads,
                        orders: dailyOrders,
                        revenue: dailyRevenue,
                        cpl: dailyCpl,
                        cpo: dailyCpo,
                        roas: dailyRoas,
                        close_rate: dailyCloseRate
                    },
                    items: childItems
                });
            });

            const overallDailyCpl = overallDailyLeads.map((l, i) => l > 0 ? Math.round(overallDailySpent[i] / l) : 0);
            const overallDailyCpo = overallDailyOrders.map((o, i) => o > 0 ? Math.round(overallDailySpent[i] / o) : 0);
            const overallDailyRoas = overallDailySpent.map((s, i) => s > 0 ? Math.round((overallDailyRevenue[i] / s) * 10000) / 100 : 0);
            const overallDailyCloseRate = overallDailyLeads.map((l, i) => l > 0 ? Math.round((overallDailyOrders[i] / l) * 10000) / 100 : 0);

            const summaryStages = calcStages(
                overallDailySpent, overallDailyLeads, overallDailyRevenue,
                totalTargetBudget, totalTargetLeadsM1, totalTargetLeadsM120, totalTargetRevM1, totalTargetRevM120
            );

            const avgCpl = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;
            const avgCpo = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
            const avgRoas = totalSpent > 0 ? Math.round((totalRevenue / totalSpent) * 10000) / 100 : 0;
            const avgCostRatio = totalRevenue > 0 ? Math.round((totalSpent / totalRevenue) * 10000) / 100 : 0;
            const avgCloseRate = totalLeads > 0 ? Math.round((totalOrders / totalLeads) * 10000) / 100 : 0;

            const pageRows = await db.all(`
                SELECT DISTINCT page_name FROM (
                    SELECT NULLIF(TRIM(pancake_page_name), '') AS page_name FROM mkt_categories WHERE is_active = TRUE
                    UNION
                    SELECT NULLIF(TRIM(linked_source_name), '') AS page_name FROM mkt_categories WHERE is_active = TRUE
                    UNION
                    SELECT NULLIF(TRIM(linked_source_name), '') AS page_name FROM marketing_budgets
                ) sub
                WHERE page_name IS NOT NULL
                ORDER BY page_name ASC
            `);
            const availablePages = (pageRows || []).map(p => p.page_name).filter(Boolean);

            return reply.send({
                month: {
                    year,
                    month: mo,
                    label: periodLabel,
                    period_value: periodValue,
                    days_in_month: daysInMonth,
                    days_left: daysLeft,
                    current_phase: currentPhase
                },
                summary: {
                    total_spent: totalSpent,
                    total_budget: totalBudget,
                    total_leads: totalLeads,
                    total_orders: totalOrders,
                    total_revenue: totalRevenue,
                    avg_cpl: avgCpl,
                    avg_cpo: avgCpo,
                    avg_roas: avgRoas,
                    avg_cost_ratio: avgCostRatio,
                    avg_close_rate: avgCloseRate,
                    target_budget: totalTargetBudget,
                    target_leads_m1: totalTargetLeadsM1,
                    target_leads_m120: totalTargetLeadsM120,
                    target_revenue_m1: totalTargetRevM1,
                    target_revenue_m120: totalTargetRevM120,
                    rate_leads_m1: totalTargetLeadsM1 > 0 ? Math.round((totalLeads / totalTargetLeadsM1) * 1000) / 10 : 0,
                    rate_leads_m120: totalTargetLeadsM120 > 0 ? Math.round((totalLeads / totalTargetLeadsM120) * 1000) / 10 : 0,
                    rate_revenue_m1: totalTargetRevM1 > 0 ? Math.round((totalRevenue / totalTargetRevM1) * 1000) / 10 : 0,
                    rate_revenue_m120: totalTargetRevM120 > 0 ? Math.round((totalRevenue / totalTargetRevM120) * 1000) / 10 : 0,
                    missing_leads_m1: totalTargetLeadsM1 - totalLeads,
                    missing_leads_m120: totalTargetLeadsM120 - totalLeads,
                    missing_revenue_m1: totalTargetRevM1 - totalRevenue,
                    missing_revenue_m120: totalTargetRevM120 - totalRevenue,
                    daily: {
                        spent: overallDailySpent,
                        leads: overallDailyLeads,
                        revenue: overallDailyRevenue,
                        cpl: overallDailyCpl,
                        cpo: overallDailyCpo,
                        roas: overallDailyRoas,
                        close_rate: overallDailyCloseRate
                    },
                    stages: summaryStages
                },
                categories: allCats || [],
                all_system_categories: allSystemCats || [],
                handlers,
                available_pages: availablePages,
                available_handlers: sortedHandlerNames
            });

        } catch (err) {
            fastify.log.error(err);
            reply.status(500).send({ error: 'Internal Server Error', message: err.message });
        }
    });

    // ===== POST /api/reports/kpi-marketing/categories ===== (Tạo mục con / mã nguồn)
    const saveCategoryHandler = async (request, reply) => {
        try {
            const { parent_id, name, ads_handler_name, linked_source_name, pancake_page_name } = request.body || {};
            if (!name || !name.trim()) {
                return reply.status(400).send({ error: 'Tên mục không được để trống' });
            }

            let realParentId = null;
            let parentCat = null;
            if (parent_id) {
                if (!isNaN(Number(parent_id)) && Number(parent_id) > 0) {
                    realParentId = Number(parent_id);
                    parentCat = await db.get('SELECT * FROM mkt_categories WHERE id = ?', [realParentId]);
                } else if (typeof parent_id === 'string' && parent_id.trim()) {
                    parentCat = await db.get('SELECT * FROM mkt_categories WHERE LOWER(name) LIKE ? AND parent_id IS NULL AND is_active = TRUE', [`%${parent_id.toLowerCase().trim()}%`]);
                    if (parentCat) {
                        realParentId = parentCat.id;
                    } else {
                        const resP = await db.run("INSERT INTO mkt_categories (group_type, name, icon, sort_order, is_active) VALUES ('online', ?, '📘', 1)", [parent_id.trim()]);
                        realParentId = resP.lastInsertRowid;
                        parentCat = { id: realParentId, group_type: 'online', icon: '📘' };
                    }
                }
            }

            const group_type = parentCat ? parentCat.group_type : 'online';
            const icon = parentCat ? parentCat.icon : '📌';

            const maxOrderRow = await db.get('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM mkt_categories WHERE parent_id = ?', [realParentId]);
            const sort_order = (maxOrderRow?.max_order || 0) + 1;

            const existingCat = await db.get('SELECT * FROM mkt_categories WHERE LOWER(name) = LOWER(?) AND is_active = TRUE', [name.trim()]);
            if (existingCat) {
                await db.run(`
                    UPDATE mkt_categories 
                    SET show_in_kpi_mkt = TRUE,
                        parent_id = COALESCE(?, parent_id),
                        pancake_page_name = CASE WHEN ? != '' THEN ? ELSE pancake_page_name END,
                        linked_source_name = CASE WHEN ? != '' THEN ? ELSE linked_source_name END,
                        ads_handler_name = CASE WHEN ? != '' THEN ? ELSE ads_handler_name END
                    WHERE id = ?
                `, [realParentId, pancake_page_name || '', pancake_page_name || '', linked_source_name || pancake_page_name || '', linked_source_name || pancake_page_name || '', ads_handler_name || '', ads_handler_name || '', existingCat.id]);

                return reply.send({ success: true, message: 'Đã thêm mục Marketing vào KPI Marketing Ads thành công!', id: existingCat.id });
            }

            const res = await db.run(`
                INSERT INTO mkt_categories 
                    (parent_id, group_type, name, icon, sort_order, linked_source_type, linked_source_name, pancake_page_name, ads_handler_name, is_active, show_in_kpi_mkt)
                VALUES 
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)
            `, [realParentId, group_type, name.trim(), icon, sort_order, 'facebook', linked_source_name || '', pancake_page_name || '', ads_handler_name || 'Giám Đốc']);

            reply.send({ success: true, message: 'Đã tạo mục Marketing mới thành công!', id: res.lastInsertRowid });
        } catch (err) {
            fastify.log.error(err);
            reply.status(500).send({ error: 'Internal Server Error', message: err.message });
        }
    };

    fastify.post('/api/reports/kpi-marketing/categories', { preHandler: [authenticate] }, saveCategoryHandler);

    // ===== DELETE /api/reports/kpi-marketing/categories/:id ===== (Chỉ Giám Đốc được Xóa / Ẩn mục con khỏi KPI Marketing Ads)
    fastify.delete('/api/reports/kpi-marketing/categories/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user || {};
            const isGiamDoc = user.role === 'giam_doc' || user.role === 'admin' || (user.full_name || user.name || user.username || '').toLowerCase().includes('giám đốc') || user.is_admin === true || user.username === 'admin';
            
            if (!isGiamDoc) {
                return reply.status(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa mục con!' });
            }

            const { id } = request.params;
            if (!id) return reply.status(400).send({ error: 'ID không hợp lệ' });

            const catId = Number(id);
            if (isNaN(catId) || catId === 0) {
                const rawName = decodeURIComponent(id).trim();
                await db.run('UPDATE mkt_categories SET show_in_kpi_mkt = FALSE WHERE LOWER(name) = LOWER(?) OR LOWER(name) LIKE ?', [rawName, `%${rawName.toLowerCase()}%`]);
            } else {
                await db.run('UPDATE mkt_categories SET show_in_kpi_mkt = FALSE WHERE id = ? OR parent_id = ?', [catId, catId]);
            }

            return reply.send({ success: true, message: 'Đã xóa mục con thành công!' });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
        }
    });

    // ===== POST /api/reports/kpi-marketing/targets =====
    fastify.post('/api/reports/kpi-marketing/targets', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { period_value, targets } = request.body || {};
            if (!period_value || !/^\d{4}-\d{2}$/.test(period_value) || !Array.isArray(targets)) {
                return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });
            }

            const userId = request.user ? request.user.id : null;

            for (const item of targets) {
                const hName = item.ads_handler_name ? item.ads_handler_name.trim() : '';
                const catId = item.category_id ? Number(item.category_id) : null;
                if (!hName && !catId) continue;

                const target_budget = Number(item.target_budget || 0);
                const target_leads_m1 = Number(item.target_leads_m1 || item.target_leads || 0);
                const target_leads_m120 = Number(item.target_leads_m120 || Math.round(target_leads_m1 * 1.2));
                const target_revenue_m1 = Number(item.target_revenue_m1 || item.target_revenue || 0);
                const target_revenue_m120 = Number(item.target_revenue_m120 || Math.round(target_revenue_m1 * 1.2));
                const target_cpl = Number(item.target_cpl || 0);
                const target_roas = Number(item.target_roas || 0);
                const target_cpo = Number(item.target_cpo || 0);
                const target_cost_ratio = Number(item.target_cost_ratio || 0);
                const target_close_rate = Number(item.target_close_rate || 0);

                if (catId) {
                    await db.run(`
                        INSERT INTO mkt_kpi_targets 
                            (category_id, ads_handler_name, period_value, target_budget, target_leads, target_leads_m120, target_revenue, target_revenue_m120, target_cpl, target_roas, target_cpo, target_cost_ratio, target_close_rate, created_by, updated_at)
                        VALUES 
                            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
                        ON CONFLICT (ads_handler_name, period_value) DO UPDATE SET
                            category_id = EXCLUDED.category_id,
                            target_budget = EXCLUDED.target_budget,
                            target_leads = EXCLUDED.target_leads,
                            target_leads_m120 = EXCLUDED.target_leads_m120,
                            target_revenue = EXCLUDED.target_revenue,
                            target_revenue_m120 = EXCLUDED.target_revenue_m120,
                            target_cpl = EXCLUDED.target_cpl,
                            target_roas = EXCLUDED.target_roas,
                            target_cpo = EXCLUDED.target_cpo,
                            target_cost_ratio = EXCLUDED.target_cost_ratio,
                            target_close_rate = EXCLUDED.target_close_rate,
                            updated_at = NOW()
                    `, [catId, hName || 'Mục Con', period_value, target_budget, target_leads_m1, target_leads_m120, target_revenue_m1, target_revenue_m120, target_cpl, target_roas, target_cpo, target_cost_ratio, target_close_rate, userId]);
                } else {
                    await db.run(`
                        INSERT INTO mkt_kpi_targets 
                            (ads_handler_name, period_value, target_budget, target_leads, target_leads_m120, target_revenue, target_revenue_m120, target_cpl, target_roas, target_cpo, target_cost_ratio, target_close_rate, created_by, updated_at)
                        VALUES 
                            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
                        ON CONFLICT (ads_handler_name, period_value) DO UPDATE SET
                            target_budget = EXCLUDED.target_budget,
                            target_leads = EXCLUDED.target_leads,
                            target_leads_m120 = EXCLUDED.target_leads_m120,
                            target_revenue = EXCLUDED.target_revenue,
                            target_revenue_m120 = EXCLUDED.target_revenue_m120,
                            target_cpl = EXCLUDED.target_cpl,
                            target_roas = EXCLUDED.target_roas,
                            target_cpo = EXCLUDED.target_cpo,
                            target_cost_ratio = EXCLUDED.target_cost_ratio,
                            target_close_rate = EXCLUDED.target_close_rate,
                            updated_at = NOW()
                    `, [hName, period_value, target_budget, target_leads_m1, target_leads_m120, target_revenue_m1, target_revenue_m120, target_cpl, target_roas, target_cpo, target_cost_ratio, target_close_rate, userId]);
                }
            }

            reply.send({ success: true, message: 'Đã lưu chỉ tiêu KPI Marketing thành công!' });
        } catch (err) {
            fastify.log.error(err);
            reply.status(500).send({ error: 'Internal Server Error', message: err.message });
        }
    });

};
