/**
 * Route báo cáo & chỉ tiêu KPI Marketing
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function(fastify, options) {

    // ===== GET /api/reports/kpi-marketing =====
    fastify.get('/api/reports/kpi-marketing', { preHandler: [authenticate] }, async (request, reply) => {
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

            // 1. Get all unique handler names in system
            const handlerSet = new Set(['Giám Đốc']);
            const catHandlers = await db.all("SELECT DISTINCT ads_handler_name FROM mkt_categories WHERE ads_handler_name IS NOT NULL AND ads_handler_name != ''");
            (catHandlers || []).forEach(h => handlerSet.add(h.ads_handler_name.trim()));

            const savedResources = await db.all("SELECT DISTINCT ads_handler_name FROM mkt_ads_handler_resources WHERE ads_handler_name IS NOT NULL AND ads_handler_name != ''");
            (savedResources || []).forEach(r => handlerSet.add(r.ads_handler_name.trim()));

            // 2. Query marketing budgets for this month grouped by ads_handler_name
            const budgetRows = await db.all(`
                SELECT 
                    COALESCE(NULLIF(TRIM(ads_handler_name), ''), 'Giám Đốc') AS handler_name,
                    SUM(COALESCE(spent_amount, 0)) AS spent_amount,
                    SUM(COALESCE(budget_amount, 0)) AS budget_amount,
                    SUM(COALESCE(lead_count, 0)) AS lead_count,
                    SUM(COALESCE(order_count, 0)) AS order_count,
                    SUM(COALESCE(revenue_amount, 0)) AS revenue_amount
                FROM marketing_budgets
                WHERE budget_year = $1 AND budget_month = $2
                GROUP BY COALESCE(NULLIF(TRIM(ads_handler_name), ''), 'Giám Đốc')
            `, [year, mo]);

            const budgetMap = new Map();
            (budgetRows || []).forEach(b => {
                budgetMap.set(b.handler_name, b);
                handlerSet.add(b.handler_name);
            });

            // 3. Query KPI targets for this month
            const targetRows = await db.all(`
                SELECT * FROM mkt_kpi_targets
                WHERE period_value = $1
            `, [periodValue]);

            const targetMap = new Map();
            (targetRows || []).forEach(t => {
                targetMap.set(t.ads_handler_name, t);
                handlerSet.add(t.ads_handler_name);
            });

            // 4. Build output per handler
            const handlers = [];
            let totalSpent = 0;
            let totalBudget = 0;
            let totalLeads = 0;
            let totalOrders = 0;
            let totalRevenue = 0;
            let totalTargetBudget = 0;
            let totalTargetLeads = 0;
            let totalTargetRevenue = 0;

            const sortedHandlerNames = Array.from(handlerSet).sort((a, b) => a.localeCompare(b, 'vi'));

            sortedHandlerNames.forEach(hName => {
                const b = budgetMap.get(hName) || {};
                const t = targetMap.get(hName) || {};

                const spent = Number(b.spent_amount || 0);
                const budget = Number(b.budget_amount || 0);
                const leads = Number(b.lead_count || 0);
                const orders = Number(b.order_count || 0);
                const revenue = Number(b.revenue_amount || 0);

                const targetBudget = Number(t.target_budget || 0);
                const targetLeads = Number(t.target_leads || 0);
                const targetRevenue = Number(t.target_revenue || 0);
                const targetCpl = Number(t.target_cpl || 0);
                const targetRoas = Number(t.target_roas || 0);

                const cpl = leads > 0 ? Math.round(spent / leads) : 0;
                const cpo = orders > 0 ? Math.round(spent / orders) : 0;
                const roas = spent > 0 ? Math.round((revenue / spent) * 10000) / 100 : 0; // %

                totalSpent += spent;
                totalBudget += budget;
                totalLeads += leads;
                totalOrders += orders;
                totalRevenue += revenue;
                totalTargetBudget += targetBudget;
                totalTargetLeads += targetLeads;
                totalTargetRevenue += targetRevenue;

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
                        roas
                    },
                    targets: {
                        target_budget: targetBudget,
                        target_leads: targetLeads,
                        target_revenue: targetRevenue,
                        target_cpl: targetCpl,
                        target_roas: targetRoas
                    },
                    rate: {
                        leads_pct: targetLeads > 0 ? Math.min(Math.round((leads / targetLeads) * 100), 999) : 0,
                        revenue_pct: targetRevenue > 0 ? Math.min(Math.round((revenue / targetRevenue) * 100), 999) : 0,
                        budget_pct: targetBudget > 0 ? Math.min(Math.round((spent / targetBudget) * 100), 999) : 0
                    }
                });
            });

            const avgCpl = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;
            const avgCpo = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
            const avgRoas = totalSpent > 0 ? Math.round((totalRevenue / totalSpent) * 10000) / 100 : 0;

            reply.send({
                month: {
                    year,
                    month: mo,
                    label: periodLabel,
                    period_value: periodValue,
                    days_in_month: daysInMonth,
                    days_left: daysLeft
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
                    target_budget: totalTargetBudget,
                    target_leads: totalTargetLeads,
                    target_revenue: totalTargetRevenue
                },
                handlers
            });

        } catch (err) {
            fastify.log.error(err);
            reply.status(500).send({ error: 'Internal Server Error', message: err.message });
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
                if (!hName) continue;

                const target_budget = Number(item.target_budget || 0);
                const target_leads = Number(item.target_leads || 0);
                const target_revenue = Number(item.target_revenue || 0);
                const target_cpl = Number(item.target_cpl || 0);
                const target_roas = Number(item.target_roas || 0);

                await db.run(`
                    INSERT INTO mkt_kpi_targets 
                        (ads_handler_name, period_value, target_budget, target_leads, target_revenue, target_cpl, target_roas, created_by, updated_at)
                    VALUES 
                        ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                    ON CONFLICT (ads_handler_name, period_value) DO UPDATE SET
                        target_budget = EXCLUDED.target_budget,
                        target_leads = EXCLUDED.target_leads,
                        target_revenue = EXCLUDED.target_revenue,
                        target_cpl = EXCLUDED.target_cpl,
                        target_roas = EXCLUDED.target_roas,
                        updated_at = NOW()
                `, [hName, period_value, target_budget, target_leads, target_revenue, target_cpl, target_roas, userId]);
            }

            reply.send({ success: true, message: 'Đã lưu chỉ tiêu KPI Marketing thành công!' });
        } catch (err) {
            fastify.log.error(err);
            reply.status(500).send({ error: 'Internal Server Error', message: err.message });
        }
    });

};
