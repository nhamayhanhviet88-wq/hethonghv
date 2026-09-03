const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function yearlyTargetsRoutes(fastify, options) {

    // GET /api/yearly-targets?year=2026&category=sale_kd&segment=all
    fastify.get('/api/yearly-targets', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const year = Number(request.query.year) || new Date().getFullYear();
            const category = request.query.category || 'sale_kd';
            const segment = request.query.segment || 'all'; // 'dong_phuc', 'tem_pet', 'all'

            // Determine target category keys to query
            let dbCatKeys = [category];
            if (category === 'sale_kd') {
                if (segment === 'dong_phuc' || segment === 'dongphuc') dbCatKeys = ['sale_kd_dp', 'sale_kd'];
                else if (segment === 'tem_pet' || segment === 'tempet') dbCatKeys = ['sale_kd_pet'];
                else dbCatKeys = ['sale_kd_dp', 'sale_kd_pet', 'sale_kd'];
            } else if (category === 'marketing') {
                if (segment === 'dong_phuc' || segment === 'dongphuc') dbCatKeys = ['marketing_dp', 'marketing'];
                else if (segment === 'tem_pet' || segment === 'tempet') dbCatKeys = ['marketing_pet'];
                else dbCatKeys = ['marketing_dp', 'marketing_pet', 'marketing'];
            }

            const placeholders = dbCatKeys.map((_, i) => `$${i + 2}`).join(',');
            const rows = await db.all(
                `SELECT category, month, target_revenue, target_orders, target_notes, is_locked, updated_at
                 FROM yearly_targets
                 WHERE year = $1 AND category IN (${placeholders})
                 ORDER BY month`,
                [year, ...dbCatKeys]
            );

            const actualMap = {};

            if (category === 'marketing') {
                const activeSegment = (segment === 'dong_phuc' || segment === 'dongphuc') ? 'dongphuc' 
                                    : (segment === 'tem_pet' || segment === 'tempet') ? 'tempet' 
                                    : 'all';

                const allSystemCats = await db.all(`
                    SELECT id, parent_id, group_type, name, icon, ads_handler_name, linked_source_name, pancake_page_id, pancake_page_name, channel_link, show_in_kpi_mkt, COALESCE(business_segment, 'dongphuc') AS business_segment
                    FROM mkt_categories
                    WHERE is_active = TRUE
                `);

                let allCats = (allSystemCats || []).filter(c => c.show_in_kpi_mkt === true || c.show_in_kpi_mkt === 'true' || c.parent_id === null || c.parent_id === undefined);
                if (activeSegment !== 'all') {
                    allCats = allCats.filter(c => c.parent_id === null || c.parent_id === undefined || c.business_segment === activeSegment);
                }
                const segmentCatIds = new Set((allCats || []).map(c => Number(c.id)).filter(id => !isNaN(id) && id > 0));

                // Batch fetch marketing budgets for all 12 months in 1 query
                const allBudgetRows = await db.all(`
                    SELECT id, category_id, linked_source_name, pancake_page_name, spent_amount, budget_amount, lead_count, order_count, revenue_amount,
                           COALESCE(NULLIF(budget_month::text, ''), '0')::int as m_num
                    FROM marketing_budgets
                    WHERE budget_year::text = $1
                `, [String(year)]);

                const budgetsByMonth = {};
                for (let m = 1; m <= 12; m++) budgetsByMonth[m] = [];
                (allBudgetRows || []).forEach(b => {
                    const m = Number(b.m_num);
                    if (m >= 1 && m <= 12) budgetsByMonth[m].push(b);
                });

                // Batch fetch active source orders for all 12 months in 1 CTE query
                const allDhtOrders = await db.all(`
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
                            o.order_date,
                            EXTRACT(MONTH FROM o.order_date)::int as m_num,
                            TO_CHAR(o.order_date, 'YYYY-MM-DD') as dt_str,
                            TRIM(o.source) as source,
                            LOWER(TRIM(REGEXP_REPLACE(o.source, '\\s*\\/\\s*', '/', 'g'))) as clean_source_key,
                            o.total_amount,
                            RIGHT(REGEXP_REPLACE(COALESCE(c.phone, o.customer_phone, ''), '\\D', '', 'g'), 9) as norm_phone,
                            COALESCE(c.customer_type, 'moi') as customer_type
                        FROM dht_orders o
                        LEFT JOIN customers c ON c.id = o.customer_id OR (
                            RIGHT(REGEXP_REPLACE(c.phone, '\\D', '', 'g'), 9) = RIGHT(REGEXP_REPLACE(o.customer_phone, '\\D', '', 'g'), 9)
                            AND RIGHT(REGEXP_REPLACE(o.customer_phone, '\\D', '', 'g'), 9) <> ''
                        )
                        WHERE o.order_date IS NOT NULL 
                          AND COALESCE(o.is_draft, false) = false
                          AND NULLIF(TRIM(o.source), '') IS NOT NULL
                          AND LOWER(TRIM(REGEXP_REPLACE(o.source, '\\s*\\/\\s*', '/', 'g'))) IN (SELECT clean_src FROM ActiveSources)
                          AND EXTRACT(YEAR FROM o.order_date) = $1
                    ),
                    RankedOrders AS (
                        SELECT 
                            *,
                            ROW_NUMBER() OVER (
                                PARTITION BY norm_phone 
                                ORDER BY order_date ASC, id ASC
                            ) as rn
                        FROM NormalizedOrders
                    )
                    SELECT 
                        id, order_code, source, total_amount, m_num, dt_str
                    FROM RankedOrders
                    WHERE rn = 1 
                      AND COALESCE(customer_type, 'moi') <> 'cu'
                `, [year]);

                const ordersByMonth = {};
                for (let m = 1; m <= 12; m++) ordersByMonth[m] = [];
                (allDhtOrders || []).forEach(o => {
                    const m = Number(o.m_num);
                    if (m >= 1 && m <= 12) ordersByMonth[m].push(o);
                });

                for (let m = 1; m <= 12; m++) {
                    const budgetRows = budgetsByMonth[m] || [];
                    let totalSpent = 0;
                    let totalLeads = 0;
                    budgetRows.forEach(b => {
                        let matchedCatIds = [];
                        if (b.category_id && segmentCatIds.has(Number(b.category_id))) {
                            matchedCatIds.push(Number(b.category_id));
                        }
                        if (matchedCatIds.length === 0 && b.linked_source_name) {
                            const bSrc = b.linked_source_name.trim().toLowerCase();
                            (allCats || []).forEach(c => {
                                if (c.parent_id !== null) {
                                    const cSrcs = [
                                        ...(c.linked_source_name || '').split(','),
                                        ...(c.pancake_page_name || '').split(',')
                                    ].map(s => s.trim().toLowerCase()).filter(Boolean);
                                    const cName = (c.name || '').trim().toLowerCase();
                                    if (cSrcs.includes(bSrc) || (cName && cName.includes(bSrc))) {
                                        matchedCatIds.push(c.id);
                                    }
                                }
                            });
                        }
                        if (activeSegment !== 'all' && matchedCatIds.length === 0) return;
                        totalSpent += Number(b.spent_amount || 0);
                        totalLeads += Number(b.lead_count || 0);
                    });

                    const dhtOrders = ordersByMonth[m] || [];
                    let totalOrders = 0;
                    let totalRevenue = 0;
                    dhtOrders.forEach(o => {
                        let matchedCatIds = [];
                        const oSrc = (o.source || '').trim().toLowerCase();
                        (allCats || []).forEach(c => {
                            if (c.parent_id !== null) {
                                const cSrcs = [
                                    ...(c.linked_source_name || '').split(','),
                                    ...(c.pancake_page_name || '').split(',')
                                ].map(s => s.trim().toLowerCase()).filter(Boolean);
                                if (cSrcs.includes(oSrc)) {
                                    matchedCatIds.push(c.id);
                                }
                            }
                        });
                        if (activeSegment !== 'all' && matchedCatIds.length === 0) return;
                        totalOrders++;
                        totalRevenue += Number(o.total_amount || 0);
                    });

                    const costRatio = totalRevenue > 0 ? (totalSpent / totalRevenue) * 100 : 0;
                    const cpo = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
                    const cpl = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;

                    actualMap[m] = {
                        actual_revenue: Math.round(costRatio * 100) / 100,
                        actual_orders: cpo,
                        actual_spent: totalSpent,
                        actual_revenue_ads: totalRevenue,
                        actual_orders_ads: totalOrders,
                        actual_leads: totalLeads,
                        actual_cost_ratio: Math.round(costRatio * 100) / 100,
                        actual_cpo: cpo,
                        actual_cpl: cpl
                    };
                }
            } else {
                // Build SQL segment filter for actual sales
                let segFilter = '';
                if (segment === 'dong_phuc' || segment === 'dongphuc') {
                    segFilter = ` AND NOT (
                        UPPER(COALESCE(cat.name, '')) IN ('PET', 'TEM')
                        OR UPPER(COALESCE(d.order_code, '')) LIKE '%PET%'
                        OR UPPER(COALESCE(d.order_code, '')) LIKE '%TEM%'
                        OR d.category_id IN (8, 9)
                    )`;
                } else if (segment === 'tem_pet' || segment === 'tempet') {
                    segFilter = ` AND (
                        UPPER(COALESCE(cat.name, '')) IN ('PET', 'TEM')
                        OR UPPER(COALESCE(d.order_code, '')) LIKE '%PET%'
                        OR UPPER(COALESCE(d.order_code, '')) LIKE '%TEM%'
                        OR d.category_id IN (8, 9)
                    )`;
                }

                const yearStart = `${year}-01-01`;
                const yearEnd = `${year + 1}-01-01`;
                
                const actualRows = await db.all(`
                    SELECT 
                        EXTRACT(MONTH FROM d.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS mo,
                        COALESCE(SUM(
                            COALESCE(oi_sum.item_total, 0) 
                            - COALESCE(d.discount_amount, 0) 
                            - COALESCE(d.vat_amount, 0)
                        ), 0) AS actual_revenue,
                        COUNT(DISTINCT d.id)::int AS actual_orders
                    FROM dht_orders d
                    JOIN order_codes oc ON oc.order_code = d.order_code
                    JOIN customers c ON oc.customer_id = c.id
                    LEFT JOIN dht_categories cat ON cat.id = d.category_id
                    LEFT JOIN LATERAL (
                        SELECT SUM(di.item_total) AS item_total 
                        FROM dht_order_items di 
                        WHERE di.dht_order_id = d.id
                    ) oi_sum ON true
                    WHERE COALESCE(c.cancel_approved, 0) != 1
                      AND COALESCE(d.is_draft, false) = false
                      AND COALESCE(oc.status, 'active') NOT IN ('cancelled', 'canceled')
                      AND d.created_at >= $1::timestamp 
                      AND d.created_at < $2::timestamp
                      ${segFilter}
                    GROUP BY mo
                    ORDER BY mo
                `, [yearStart, yearEnd]);

                actualRows.forEach(a => {
                    actualMap[a.mo] = {
                        actual_revenue: Number(a.actual_revenue) || 0,
                        actual_orders: Number(a.actual_orders) || 0
                    };
                });
            }

            // Map targets 1..12
            const targetsMap = {};
            for (let m = 1; m <= 12; m++) {
                const act = actualMap[m] || { actual_revenue: 0, actual_orders: 0 };
                targetsMap[m] = { 
                    month: m, 
                    target_revenue: 0, 
                    target_orders: 0, 
                    target_notes: '', 
                    is_locked: 0,
                    actual_revenue: act.actual_revenue,
                    actual_orders: act.actual_orders,
                    actual_spent: act.actual_spent || 0,
                    actual_revenue_ads: act.actual_revenue_ads || 0,
                    actual_orders_ads: act.actual_orders_ads || 0,
                    actual_leads: act.actual_leads || 0,
                    actual_cpl: act.actual_cpl || 0
                };
            }

            if (segment === 'all') {
                const monthDp = {};
                const monthPet = {};
                const monthBase = {};

                const dpKey = category === 'marketing' ? 'marketing_dp' : 'sale_kd_dp';
                const petKey = category === 'marketing' ? 'marketing_pet' : 'sale_kd_pet';
                const baseKey = category;

                rows.forEach(r => {
                    if (r.category === dpKey) monthDp[r.month] = r;
                    else if (r.category === petKey) monthPet[r.month] = r;
                    else if (r.category === baseKey) monthBase[r.month] = r;
                });

                const cleanNoteText = (raw) => {
                    if (!raw) return '';
                    const str = String(raw).trim();
                    if (!str) return '';
                    if (str.startsWith('{') && str.endsWith('}')) {
                        try {
                            const parsed = JSON.parse(str);
                            if (parsed && typeof parsed === 'object') {
                                return parsed.notes !== undefined ? String(parsed.notes).trim() : '';
                            }
                        } catch(e) {}
                    }
                    return str;
                };

                for (let m = 1; m <= 12; m++) {
                    const dp = monthDp[m];
                    const pet = monthPet[m];
                    const base = monthBase[m];

                    if (dp || pet) {
                        const dpRev = dp ? (Number(dp.target_revenue) || 0) : 0;
                        const petRev = pet ? (Number(pet.target_revenue) || 0) : 0;
                        const dpOrd = dp ? (Number(dp.target_orders) || 0) : 0;
                        const petOrd = pet ? (Number(pet.target_orders) || 0) : 0;

                        targetsMap[m].target_revenue = dpRev + petRev;
                        targetsMap[m].target_orders = dpOrd + petOrd;
                        const notesArr = [];
                        const dpNoteClean = cleanNoteText(dp?.target_notes);
                        const petNoteClean = cleanNoteText(pet?.target_notes);
                        if (dpNoteClean) {
                            notesArr.push(`👔 Chiến Lược LV Đồng Phục - Tháng ${m}:\n${dpNoteClean}`);
                        }
                        if (petNoteClean) {
                            notesArr.push(`🏷️ Chiến Lược LV TEM/PET - Tháng ${m}:\n${petNoteClean}`);
                        }
                        targetsMap[m].target_notes = notesArr.join('\n\n');
                        targetsMap[m].is_locked = 1;
                        targetsMap[m].is_readonly = true;
                    } else if (base) {
                        targetsMap[m].target_revenue = Number(base.target_revenue) || 0;
                        targetsMap[m].target_orders = Number(base.target_orders) || 0;
                        targetsMap[m].target_notes = cleanNoteText(base.target_notes);
                        targetsMap[m].is_locked = 1;
                        targetsMap[m].is_readonly = true;
                    } else {
                        targetsMap[m].is_readonly = true;
                    }
                }
            } else {
                rows.forEach(r => {
                    targetsMap[r.month].target_revenue = Number(r.target_revenue) || 0;
                    targetsMap[r.month].target_orders = Number(r.target_orders) || 0;
                    targetsMap[r.month].target_notes = r.target_notes || '';
                    targetsMap[r.month].is_locked = Number(r.is_locked) || 0;
                });
            }

            return { success: true, year, category, segment, targets: Object.values(targetsMap) };
        } catch (e) {
            console.error('[yearly-targets GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/yearly-targets/benchmark?year=2026&category=sale_kd&segment=dong_phuc
    // Returns previous year actual + target data for wizard suggestions
    fastify.get('/api/yearly-targets/benchmark', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const year = Number(request.query.year) || new Date().getFullYear();
            const category = request.query.category || 'sale_kd';
            const segment = request.query.segment || 'dong_phuc';
            const prevYear = year - 1;

            // ---- 1. Get previous year ACTUAL data from dht_orders ----
            const prevActual = { months: {}, quarters: {}, total: { revenue: 0, orders: 0 } };

            if (category === 'marketing') {
                for (let m = 1; m <= 12; m++) {
                    prevActual.months[m] = { revenue: 0, orders: 0 };
                }
                const prevMktBudgets = await db.all(`
                    SELECT spent_amount, COALESCE(NULLIF(budget_month::text, ''), '0')::int as m_num
                    FROM marketing_budgets
                    WHERE budget_year::text = $1
                `, [String(prevYear)]);
                (prevMktBudgets || []).forEach(b => {
                    const m = Number(b.m_num);
                    if (m >= 1 && m <= 12) {
                        prevActual.months[m].revenue += Number(b.spent_amount) || 0;
                    }
                });
            } else {
                // Sale/KD or San Xuat — get actual revenue & orders from dht_orders
                let segFilter = '';
                if (segment === 'dong_phuc' || segment === 'dongphuc') {
                    segFilter = ` AND NOT (
                        UPPER(COALESCE(cat.name, '')) IN ('PET', 'TEM')
                        OR UPPER(COALESCE(d.order_code, '')) LIKE '%PET%'
                        OR UPPER(COALESCE(d.order_code, '')) LIKE '%TEM%'
                        OR d.category_id IN (8, 9)
                    )`;
                } else if (segment === 'tem_pet' || segment === 'tempet') {
                    segFilter = ` AND (
                        UPPER(COALESCE(cat.name, '')) IN ('PET', 'TEM')
                        OR UPPER(COALESCE(d.order_code, '')) LIKE '%PET%'
                        OR UPPER(COALESCE(d.order_code, '')) LIKE '%TEM%'
                        OR d.category_id IN (8, 9)
                    )`;
                }

                const yearStart = `${prevYear}-01-01`;
                const yearEnd = `${prevYear + 1}-01-01`;

                const actualRows = await db.all(`
                    SELECT 
                        EXTRACT(MONTH FROM d.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS mo,
                        COALESCE(SUM(
                            COALESCE(oi_sum.item_total, 0) 
                            - COALESCE(d.discount_amount, 0) 
                            - COALESCE(d.vat_amount, 0)
                        ), 0) AS actual_revenue,
                        COUNT(DISTINCT d.id)::int AS actual_orders
                    FROM dht_orders d
                    JOIN order_codes oc ON oc.order_code = d.order_code
                    JOIN customers c ON oc.customer_id = c.id
                    LEFT JOIN dht_categories cat ON cat.id = d.category_id
                    LEFT JOIN LATERAL (
                        SELECT SUM(di.item_total) AS item_total 
                        FROM dht_order_items di 
                        WHERE di.dht_order_id = d.id
                    ) oi_sum ON true
                    WHERE COALESCE(c.cancel_approved, 0) != 1
                      AND COALESCE(d.is_draft, false) = false
                      AND COALESCE(oc.status, 'active') NOT IN ('cancelled', 'canceled')
                      AND d.created_at >= $1::timestamp 
                      AND d.created_at < $2::timestamp
                      ${segFilter}
                    GROUP BY mo
                    ORDER BY mo
                `, [yearStart, yearEnd]);

                for (let m = 1; m <= 12; m++) {
                    prevActual.months[m] = { revenue: 0, orders: 0 };
                }
                actualRows.forEach(a => {
                    prevActual.months[a.mo] = {
                        revenue: Number(a.actual_revenue) || 0,
                        orders: Number(a.actual_orders) || 0
                    };
                });
            }

            // Calculate quarters and total from monthly actuals
            for (let q = 1; q <= 4; q++) {
                const qMonths = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
                let qRev = 0, qOrd = 0;
                qMonths.forEach(m => {
                    qRev += (prevActual.months[m]?.revenue || 0);
                    qOrd += (prevActual.months[m]?.orders || 0);
                });
                prevActual.quarters[q] = { revenue: qRev, orders: qOrd };
                prevActual.total.revenue += qRev;
                prevActual.total.orders += qOrd;
            }

            // ---- 2. Get previous year TARGET data from yearly_targets ----
            const prevTarget = { months: {}, quarters: {}, total: { revenue: 0, orders: 0 } };

            let targetCatKeys = [category];
            if (category === 'sale_kd') {
                if (segment === 'dong_phuc' || segment === 'dongphuc') targetCatKeys = ['sale_kd_dp', 'sale_kd'];
                else if (segment === 'tem_pet' || segment === 'tempet') targetCatKeys = ['sale_kd_pet'];
            } else if (category === 'marketing') {
                if (segment === 'dong_phuc' || segment === 'dongphuc') targetCatKeys = ['marketing_dp', 'marketing'];
                else if (segment === 'tem_pet' || segment === 'tempet') targetCatKeys = ['marketing_pet'];
            }

            const tPlaceholders = targetCatKeys.map((_, i) => `$${i + 2}`).join(',');
            const targetRows = await db.all(
                `SELECT month, target_revenue, target_orders FROM yearly_targets WHERE year = $1 AND category IN (${tPlaceholders}) ORDER BY month`,
                [prevYear, ...targetCatKeys]
            );

            for (let m = 1; m <= 12; m++) {
                prevTarget.months[m] = { revenue: 0, orders: 0 };
            }
            targetRows.forEach(r => {
                const m = r.month;
                if (m >= 1 && m <= 12) {
                    prevTarget.months[m].revenue += Number(r.target_revenue) || 0;
                    prevTarget.months[m].orders += Number(r.target_orders) || 0;
                }
            });

            for (let q = 1; q <= 4; q++) {
                const qMonths = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
                let qRev = 0, qOrd = 0;
                qMonths.forEach(m => {
                    qRev += (prevTarget.months[m]?.revenue || 0);
                    qOrd += (prevTarget.months[m]?.orders || 0);
                });
                prevTarget.quarters[q] = { revenue: qRev, orders: qOrd };
                prevTarget.total.revenue += qRev;
                prevTarget.total.orders += qOrd;
            }

            return {
                success: true,
                year,
                prev_year: prevYear,
                category,
                segment,
                prev_actual: prevActual,
                prev_target: prevTarget
            };
        } catch (e) {
            console.error('[yearly-targets benchmark]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/yearly-targets
    fastify.post('/api/yearly-targets', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            if (!['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(user.role)) {
                return reply.code(403).send({ error: 'Chỉ Quản lý hoặc Giám đốc mới có quyền thiết lập Mục Tiêu Năm' });
            }

            const { year, category, segment = 'all', items } = request.body || {};
            if (!year || !category || !Array.isArray(items)) {
                return reply.code(400).send({ error: 'Thiếu dữ liệu năm hoặc danh mục' });
            }

            if (category === 'sale_kd' && (segment === 'all' || !segment)) {
                return reply.code(400).send({ error: 'Mục tiêu Tất Cả được tự động tính từ 2 Lĩnh Vực. Vui lòng chọn Lĩnh Vực Đồng Phục hoặc Lĩnh Vực TEM/PET để nhập liệu.' });
            }

            let saveCategory = category;
            if (category === 'sale_kd') {
                if (segment === 'dong_phuc' || segment === 'dongphuc') saveCategory = 'sale_kd_dp';
                else if (segment === 'tem_pet' || segment === 'tempet') saveCategory = 'sale_kd_pet';
            } else if (category === 'marketing') {
                if (segment === 'dong_phuc' || segment === 'dongphuc') saveCategory = 'marketing_dp';
                else if (segment === 'tem_pet' || segment === 'tempet') saveCategory = 'marketing_pet';
            }

            for (const item of items) {
                const month = Number(item.month);
                if (!month || month < 1 || month > 12) continue;
                const revenue = Number(item.target_revenue) || 0;
                const orders = Number(item.target_orders) || 0;
                const notes = item.target_notes || null;
                const isLocked = (item.is_locked === 1 || item.is_locked === true || item.is_locked === '1') ? 1 : 0;

                await db.run(
                    `INSERT INTO yearly_targets (year, category, month, target_revenue, target_orders, target_notes, is_locked, updated_by, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                     ON CONFLICT (year, category, month)
                     DO UPDATE SET target_revenue = $4, target_orders = $5, target_notes = $6, is_locked = $7, updated_by = $8, updated_at = NOW()`,
                    [Number(year), saveCategory, month, revenue, orders, notes, isLocked, user.id]
                );
            }

            return { success: true, message: 'Đã lưu Mục Tiêu Năm thành công' };
        } catch (e) {
            console.error('[yearly-targets POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/yearly-targets/month-note (Director strategy note update)
    fastify.post('/api/yearly-targets/month-note', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            if (!['giam_doc', 'admin'].includes(user.role)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền chỉnh sửa Nội dung Chiến lược' });
            }

            const { year, category, segment = 'all', month, target_notes } = request.body || {};
            if (!year || !category || !month) {
                return reply.code(400).send({ error: 'Thiếu thông tin năm, danh mục hoặc tháng' });
            }

            let saveCategory = category;
            if (category === 'sale_kd') {
                if (segment === 'dong_phuc' || segment === 'dongphuc') saveCategory = 'sale_kd_dp';
                else if (segment === 'tem_pet' || segment === 'tempet') saveCategory = 'sale_kd_pet';
            } else if (category === 'marketing') {
                if (segment === 'dong_phuc' || segment === 'dongphuc') saveCategory = 'marketing_dp';
                else if (segment === 'tem_pet' || segment === 'tempet') saveCategory = 'marketing_pet';
            }

            await db.run(
                `UPDATE yearly_targets
                 SET target_notes = $1, updated_by = $2, updated_at = NOW()
                 WHERE year = $3 AND category = $4 AND month = $5`,
                [target_notes, user.id, Number(year), saveCategory, Number(month)]
            );

            return reply.send({ success: true, message: 'Đã lưu chiến lược thành công' });
        } catch(e) {
            console.error('Err save month note:', e);
            return reply.code(500).send({ error: e.message });
        }
    });
}

module.exports = yearlyTargetsRoutes;
