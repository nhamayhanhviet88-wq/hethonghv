/**
 * Mobile Executive Dashboard Summary API
 * Dedicated consolidated endpoint for http://localhost:11000/m/dashboard
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { getProductionCutoff, getTestAccountIds, buildProductionFilter } = require('../utils/productionMode');

module.exports = async function(fastify, options) {

    fastify.get('/api/m/dashboard/summary', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { period = 'today', mode = 'dong_phuc', year: reqYear, date_from, date_to } = request.query;
            const now = new Date();

            let startDate, endDate, periodLabel;
            const selYear = parseInt(reqYear) || now.getFullYear();

            // Format YYYY-MM-DD helper without mutating date objects
            function formatDateStr(y, m, d) {
                return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }

            const curY = now.getFullYear();
            const curM = now.getMonth() + 1;
            const curD = now.getDate();

            if (period === 'today') {
                const todayStr = formatDateStr(curY, curM, curD);
                startDate = `${todayStr} 00:00:00`;
                endDate = `${todayStr} 23:59:59`;
                periodLabel = `Hôm nay (${curD}/${curM}/${curY})`;
            } else if (period === 'yesterday') {
                const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                const yestStr = formatDateStr(yest.getFullYear(), yest.getMonth() + 1, yest.getDate());
                startDate = `${yestStr} 00:00:00`;
                endDate = `${yestStr} 23:59:59`;
                periodLabel = `Hôm qua (${yest.getDate()}/${yest.getMonth() + 1}/${yest.getFullYear()})`;
            } else if (period === 'first_10_days') {
                const firstDayStr = formatDateStr(curY, curM, 1);
                const tenthDayStr = formatDateStr(curY, curM, 10);
                startDate = `${firstDayStr} 00:00:00`;
                endDate = `${tenthDayStr} 23:59:59`;
                periodLabel = `10 ngày đầu (01/${curM} - 10/${curM}/${curY})`;
            } else if (period === 'middle_10_days') {
                const eleventhDayStr = formatDateStr(curY, curM, 11);
                const twentiethDayStr = formatDateStr(curY, curM, 20);
                startDate = `${eleventhDayStr} 00:00:00`;
                endDate = `${twentiethDayStr} 23:59:59`;
                periodLabel = `10 ngày giữa (11/${curM} - 20/${curM}/${curY})`;
            } else if (period === 'last_10_days') {
                const twentyFirstStr = formatDateStr(curY, curM, 21);
                const lastDay = new Date(curY, curM, 0).getDate();
                const lastDayStr = formatDateStr(curY, curM, lastDay);
                startDate = `${twentyFirstStr} 00:00:00`;
                endDate = `${lastDayStr} 23:59:59`;
                periodLabel = `10 ngày cuối (21/${curM} - ${lastDay}/${curM}/${curY})`;
            } else if (period === 'day_before_yesterday') {
                const dby = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
                const dbyStr = formatDateStr(dby.getFullYear(), dby.getMonth() + 1, dby.getDate());
                startDate = `${dbyStr} 00:00:00`;
                endDate = `${dbyStr} 23:59:59`;
                periodLabel = `Hôm kia (${dby.getDate()}/${dby.getMonth() + 1}/${dby.getFullYear()})`;
            } else if (period === 'this_week') {
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
                const monday = new Date(now.getFullYear(), now.getMonth(), diff);
                const mondayStr = formatDateStr(monday.getFullYear(), monday.getMonth() + 1, monday.getDate());
                const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
                const sundayStr = formatDateStr(sunday.getFullYear(), sunday.getMonth() + 1, sunday.getDate());
                startDate = `${mondayStr} 00:00:00`;
                endDate = `${sundayStr} 23:59:59`;
                periodLabel = `Tuần này (${monday.getDate()}/${monday.getMonth()+1} - ${sunday.getDate()}/${sunday.getMonth()+1})`;
            } else if (period === 'last_week') {
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
                const lastMonday = new Date(now.getFullYear(), now.getMonth(), diff);
                const mondayStr = formatDateStr(lastMonday.getFullYear(), lastMonday.getMonth() + 1, lastMonday.getDate());
                const lastSunday = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + 6);
                const sundayStr = formatDateStr(lastSunday.getFullYear(), lastSunday.getMonth() + 1, lastSunday.getDate());
                startDate = `${mondayStr} 00:00:00`;
                endDate = `${sundayStr} 23:59:59`;
                periodLabel = `Tuần trước (${lastMonday.getDate()}/${lastMonday.getMonth()+1} - ${lastSunday.getDate()}/${lastSunday.getMonth()+1})`;
            } else if (period === 'this_month') {
                const firstDayStr = formatDateStr(curY, curM, 1);
                const lastDay = new Date(curY, curM, 0).getDate();
                const lastDayStr = formatDateStr(curY, curM, lastDay);
                startDate = `${firstDayStr} 00:00:00`;
                endDate = `${lastDayStr} 23:59:59`;
                periodLabel = `Tháng ${curM}/${curY}`;
            } else if (period === 'q1') {
                startDate = `${selYear}-01-01 00:00:00`;
                endDate = `${selYear}-03-31 23:59:59`;
                periodLabel = `Quý 1/${selYear}`;
            } else if (period === 'q2') {
                startDate = `${selYear}-04-01 00:00:00`;
                endDate = `${selYear}-06-30 23:59:59`;
                periodLabel = `Quý 2/${selYear}`;
            } else if (period === 'q3') {
                startDate = `${selYear}-07-01 00:00:00`;
                endDate = `${selYear}-09-30 23:59:59`;
                periodLabel = `Quý 3/${selYear}`;
            } else if (period === 'q4') {
                startDate = `${selYear}-10-01 00:00:00`;
                endDate = `${selYear}-12-31 23:59:59`;
                periodLabel = `Quý 4/${selYear}`;
            } else if (period.startsWith('year_')) {
                const yr = period.replace('year_', '');
                startDate = `${yr}-01-01 00:00:00`;
                endDate = `${yr}-12-31 23:59:59`;
                periodLabel = `Năm ${yr}`;
            } else if (period.startsWith('month_')) {
                const cleanVal = period.replace('month_', '');
                let yr = curY, m = curM;
                if (cleanVal.includes('-')) {
                    const parts = cleanVal.split('-');
                    yr = parseInt(parts[0]) || curY;
                    m = parseInt(parts[1]) || curM;
                } else {
                    m = parseInt(cleanVal) || curM;
                }
                const firstDayStr = formatDateStr(yr, m, 1);
                const lastDay = new Date(yr, m, 0).getDate();
                const lastDayStr = formatDateStr(yr, m, lastDay);
                startDate = `${firstDayStr} 00:00:00`;
                endDate = `${lastDayStr} 23:59:59`;
                periodLabel = `Tháng ${m}/${yr}`;
            } else if (period.startsWith('monthrange_')) {
                const [fromStr, toStr] = period.replace('monthrange_', '').split('_');
                const [fY, fM] = (fromStr || '').split('-').map(Number);
                const [tY, tM] = (toStr || '').split('-').map(Number);
                const fYear = fY || curY, fMonth = fM || 1;
                const tYear = tY || curY, tMonth = tM || 12;
                const firstDayStr = formatDateStr(fYear, fMonth, 1);
                const lastDay = new Date(tYear, tMonth, 0).getDate();
                const lastDayStr = formatDateStr(tYear, tMonth, lastDay);
                startDate = `${firstDayStr} 00:00:00`;
                endDate = `${lastDayStr} 23:59:59`;
                periodLabel = `Từ Tháng ${fMonth}/${fYear} đến Tháng ${tMonth}/${tYear}`;
            } else if (period.startsWith('daterange_')) {
                const rawDates = period.replace('daterange_', '').split('_');
                const fDate = rawDates[0] || formatDateStr(curY, curM, curD);
                const tDate = rawDates[1] || fDate;

                startDate = `${fDate} 00:00:00`;
                endDate = `${tDate} 23:59:59`;

                const fParts = fDate.split('-');
                const tParts = tDate.split('-');

                const fFormatted = fParts.length === 3 ? `${fParts[2]}/${fParts[1]}/${fParts[0]}` : fDate;
                const tFormatted = tParts.length === 3 ? `${tParts[2]}/${tParts[1]}/${tParts[0]}` : tDate;

                if (fDate === tDate) {
                    periodLabel = `Ngày ${fFormatted}`;
                } else {
                    periodLabel = `Từ ${fFormatted} đến ${tFormatted}`;
                }
            } else if (date_from && date_to) {
                startDate = `${date_from} 00:00:00`;
                endDate = `${date_to} 23:59:59`;
                periodLabel = `Từ ${date_from} đến ${date_to}`;
            } else {
                const todayStr = formatDateStr(curY, curM, curD);
                startDate = `${todayStr} 00:00:00`;
                endDate = `${todayStr} 23:59:59`;
                periodLabel = `Hôm nay (${curD}/${curM}/${curY})`;
            }

            // Production Mode filter
            const _cutoff = await getProductionCutoff();
            const _testIds = await getTestAccountIds();
            const _prodCustSQL = buildProductionFilter(_cutoff, _testIds, 'c.created_at', 'c.created_by');
            const _prodDhtSQL = buildProductionFilter(_cutoff, _testIds, 'd.created_at', 'd.created_by', { assignedToCol: 'c.assigned_to_id' });

            // 1. Executive Orders & Revenue Stats (from dht_orders & order_codes)
            const execOrders = await db.get(`
                SELECT
                    COUNT(DISTINCT d.id) AS total_orders,
                    COALESCE(SUM(oi_sum.revenue - COALESCE(d.discount_amount, 0)), 0) AS total_revenue,

                    COUNT(DISTINCT CASE WHEN (
                        UPPER(COALESCE(d.order_code, '')) LIKE 'GCPET%' 
                        OR UPPER(COALESCE(d.order_code, '')) LIKE 'GCTEM%'
                    ) THEN d.id END) AS tem_pet_orders,

                    COALESCE(SUM(CASE WHEN (
                        UPPER(COALESCE(d.order_code, '')) LIKE 'GCPET%' 
                        OR UPPER(COALESCE(d.order_code, '')) LIKE 'GCTEM%'
                    ) THEN (oi_sum.revenue - COALESCE(d.discount_amount, 0)) END), 0) AS tem_pet_revenue,

                    COUNT(DISTINCT CASE WHEN NOT (
                        UPPER(COALESCE(d.order_code, '')) LIKE 'GCPET%' 
                        OR UPPER(COALESCE(d.order_code, '')) LIKE 'GCTEM%'
                    ) THEN d.id END) AS dong_phuc_orders,

                    COALESCE(SUM(CASE WHEN NOT (
                        UPPER(COALESCE(d.order_code, '')) LIKE 'GCPET%' 
                        OR UPPER(COALESCE(d.order_code, '')) LIKE 'GCTEM%'
                    ) THEN (oi_sum.revenue - COALESCE(d.discount_amount, 0)) END), 0) AS dong_phuc_revenue

                FROM dht_orders d
                JOIN order_codes oc ON oc.order_code = d.order_code
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(
                        (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id),
                        0
                    ) - COALESCE(d.vat_amount, 0) AS revenue
                ) oi_sum ON true
                WHERE COALESCE(c.cancel_approved, 0) != 1
                  AND COALESCE(d.is_draft, false) = false
                  AND d.created_at >= $1::timestamp
                  AND d.created_at <= $2::timestamp
                  AND COALESCE(oc.status, 'active') != 'cancelled'
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%SUA%'
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%MAU%'
                  ${_prodDhtSQL}
            `, [startDate, endDate]);

            const totalOrders = parseInt(execOrders?.total_orders || 0);
            const totalRevenue = parseFloat(execOrders?.total_revenue || 0);
            const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

            // 2. Marketing Ads Stats (from marketing_budgets)
            const startDateOnly = startDate.split(' ')[0];
            const endDateOnly = endDate.split(' ')[0];

            const mktStats = await db.get(`
                SELECT
                    COALESCE(SUM(mb.spent_amount), 0) AS total_spent,

                    COALESCE(SUM(CASE WHEN (
                        UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ĐỒNG PHỤC%'
                        OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%DONG PHUC%'
                        OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ÁO%'
                        OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%AO%'
                    ) AND NOT (
                        UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                        OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                    ) THEN mb.spent_amount END), 0) AS dong_phuc_spent,

                    COALESCE(SUM(CASE WHEN (
                        UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                        OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                    ) THEN mb.spent_amount END), 0) AS tem_pet_spent,

                    COALESCE(SUM(CASE WHEN (
                        UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ĐỒNG PHỤC%'
                        OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%DONG PHUC%'
                        OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ÁO%'
                        OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%AO%'
                    ) AND NOT (
                        UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                        OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                    ) THEN mb.lead_count END), 0) AS dong_phuc_leads,

                    COALESCE(SUM(CASE WHEN (
                        UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                        OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                    ) THEN mb.lead_count END), 0) AS tem_pet_leads,

                    COALESCE(SUM(mb.order_count), 0) AS total_orders,
                    COALESCE(SUM(mb.revenue_amount), 0) AS total_revenue,
                    COALESCE(SUM(mb.lead_count), 0) AS total_leads
                FROM marketing_budgets mb
                LEFT JOIN mkt_categories c ON mb.category_id = c.id
                WHERE mb.budget_date >= $1 AND mb.budget_date <= $2
            `, [startDateOnly, endDateOnly]);

            let spent = parseFloat(mktStats?.total_spent || 0);
            let dongPhucSpent = parseFloat(mktStats?.dong_phuc_spent || 0);
            let temPetSpent = parseFloat(mktStats?.tem_pet_spent || 0);
            let dpLeadsCount = parseInt(mktStats?.dong_phuc_leads || 0);
            let petLeadsCount = parseInt(mktStats?.tem_pet_leads || 0);

            // Merge with synced Meta Ads insights from ads_stats_daily
            try {
                const adsStatsRes = await db.get(`
                    SELECT
                        COALESCE(SUM(d.spend), 0) AS total_spent,
                        COALESCE(SUM(CASE WHEN NOT (
                            UPPER(COALESCE(a.account_name, d.campaign_name, '')) LIKE '%PET%'
                            OR UPPER(COALESCE(a.account_name, d.campaign_name, '')) LIKE '%TEM%'
                        ) THEN d.spend END), 0) AS dong_phuc_spent,
                        COALESCE(SUM(CASE WHEN (
                            UPPER(COALESCE(a.account_name, d.campaign_name, '')) LIKE '%PET%'
                            OR UPPER(COALESCE(a.account_name, d.campaign_name, '')) LIKE '%TEM%'
                        ) THEN d.spend END), 0) AS tem_pet_spent,

                        COALESCE(SUM(d.messages), 0) AS total_leads,
                        COALESCE(SUM(CASE WHEN NOT (
                            UPPER(COALESCE(a.account_name, d.campaign_name, '')) LIKE '%PET%'
                            OR UPPER(COALESCE(a.account_name, d.campaign_name, '')) LIKE '%TEM%'
                        ) THEN d.messages END), 0) AS dong_phuc_leads,
                        COALESCE(SUM(CASE WHEN (
                            UPPER(COALESCE(a.account_name, d.campaign_name, '')) LIKE '%PET%'
                            OR UPPER(COALESCE(a.account_name, d.campaign_name, '')) LIKE '%TEM%'
                        ) THEN d.messages END), 0) AS tem_pet_leads
                    FROM ads_stats_daily d
                    LEFT JOIN ads_stats_accounts a ON d.account_id = a.id
                    WHERE d.report_date >= $1::date AND d.report_date <= $2::date
                `, [startDateOnly, endDateOnly]);

                const adsSpent = parseFloat(adsStatsRes?.total_spent || 0);
                const adsDpSpent = parseFloat(adsStatsRes?.dong_phuc_spent || 0);
                const adsPetSpent = parseFloat(adsStatsRes?.tem_pet_spent || 0);
                const adsDpLeads = parseInt(adsStatsRes?.dong_phuc_leads || 0);
                const adsPetLeads = parseInt(adsStatsRes?.tem_pet_leads || 0);

                if (adsSpent > 0) {
                    if (spent === 0 || adsSpent > spent) {
                        spent = Math.max(spent, adsSpent);
                        dongPhucSpent = Math.max(dongPhucSpent, adsDpSpent);
                        temPetSpent = Math.max(temPetSpent, adsPetSpent);
                    }
                }

                if (adsDpLeads > 0 || adsPetLeads > 0) {
                    if (dpLeadsCount === 0 && petLeadsCount === 0) {
                        dpLeadsCount = adsDpLeads;
                        petLeadsCount = adsPetLeads;
                    } else {
                        dpLeadsCount = Math.max(dpLeadsCount, adsDpLeads);
                        petLeadsCount = Math.max(petLeadsCount, adsPetLeads);
                    }
                }
            } catch(e) {
                console.error('[Dashboard] Error merging ads_stats_daily:', e.message);
            }

            // Query MKT Ads New Customer Orders (Global History Partition: Only true first-time orders in all history)
            const mktAdsOrdersRes = await db.get(`
                WITH ActiveSources AS (
                    SELECT LOWER(TRIM(REGEXP_REPLACE(linked_source_name, '\\s*\\/\\s*', '/', 'g'))) as clean_src
                    FROM mkt_categories
                    WHERE is_active = TRUE AND linked_source_name IS NOT NULL AND TRIM(linked_source_name) <> ''
                    UNION
                    SELECT LOWER(TRIM(REGEXP_REPLACE(channel_name, '\\s*\\/\\s*', '/', 'g'))) as clean_src
                    FROM marketing_budgets
                    WHERE channel_name IS NOT NULL AND TRIM(channel_name) <> ''
                ),
                NormalizedOrders AS (
                    SELECT 
                        o.id,
                        o.order_code,
                        o.created_at,
                        TO_CHAR(o.created_at, 'YYYY-MM-DD') as dt_str,
                        TRIM(o.source) as source,
                        LOWER(TRIM(REGEXP_REPLACE(o.source, '\\s*\\/\\s*', '/', 'g'))) as clean_source_key,
                        oi_sum.revenue as total_amount,
                        RIGHT(REGEXP_REPLACE(COALESCE(c.phone, ''), '\\D', '', 'g'), 9) as norm_phone,
                        COALESCE(c.customer_type, 'moi') as customer_type
                    FROM dht_orders o
                    JOIN order_codes oc ON oc.order_code = o.order_code
                    JOIN customers c ON oc.customer_id = c.id
                    LEFT JOIN LATERAL (
                        SELECT COALESCE(
                            (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = o.id), 0
                        ) - COALESCE(o.vat_amount, 0) AS revenue
                    ) oi_sum ON true
                    WHERE UPPER(COALESCE(o.order_code, '')) NOT LIKE '%SUA%'
                      AND UPPER(COALESCE(o.order_code, '')) NOT LIKE '%MAU%'
                      AND NULLIF(TRIM(o.source), '') IS NOT NULL
                      AND LOWER(TRIM(REGEXP_REPLACE(o.source, '\\s*\\/\\s*', '/', 'g'))) IN (SELECT clean_src FROM ActiveSources)
                ),
                RankedOrders AS (
                    SELECT 
                        *,
                        ROW_NUMBER() OVER (
                            PARTITION BY norm_phone 
                            ORDER BY created_at ASC, id ASC
                        ) as global_rn
                    FROM NormalizedOrders
                )
                SELECT 
                    COUNT(*)::int AS total_mkt_ads_orders,
                    COUNT(CASE WHEN (
                        UPPER(COALESCE(order_code, '')) NOT LIKE '%GCPET%'
                        AND UPPER(COALESCE(order_code, '')) NOT LIKE '%GCTEM%'
                        AND UPPER(COALESCE(order_code, '')) NOT LIKE '%PET%'
                        AND UPPER(COALESCE(order_code, '')) NOT LIKE '%TEM%'
                    ) THEN 1 END)::int AS dong_phuc_mkt_ads_orders,
                    COUNT(CASE WHEN (
                        UPPER(COALESCE(order_code, '')) LIKE '%GCPET%'
                        OR UPPER(COALESCE(order_code, '')) LIKE '%GCTEM%'
                        OR UPPER(COALESCE(order_code, '')) LIKE '%PET%'
                        OR UPPER(COALESCE(order_code, '')) LIKE '%TEM%'
                    ) THEN 1 END)::int AS tem_pet_mkt_ads_orders,
                    COALESCE(SUM(total_amount), 0)::numeric AS total_mkt_ads_revenue,
                    COALESCE(SUM(CASE WHEN (
                        UPPER(COALESCE(order_code, '')) NOT LIKE '%GCPET%'
                        AND UPPER(COALESCE(order_code, '')) NOT LIKE '%GCTEM%'
                        AND UPPER(COALESCE(order_code, '')) NOT LIKE '%PET%'
                        AND UPPER(COALESCE(order_code, '')) NOT LIKE '%TEM%'
                    ) THEN total_amount END), 0)::numeric AS dong_phuc_mkt_ads_revenue,
                    COALESCE(SUM(CASE WHEN (
                        UPPER(COALESCE(order_code, '')) LIKE '%GCPET%'
                        OR UPPER(COALESCE(order_code, '')) LIKE '%GCTEM%'
                        OR UPPER(COALESCE(order_code, '')) LIKE '%PET%'
                        OR UPPER(COALESCE(order_code, '')) LIKE '%TEM%'
                    ) THEN total_amount END), 0)::numeric AS tem_pet_mkt_ads_revenue
                FROM RankedOrders
                WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp
                  AND global_rn = 1 AND COALESCE(customer_type, 'moi') <> 'cu'
            `, [startDate, endDate]);

            // Query Returning / Old Customer Orders
            const oldCustOrdersRes = await db.get(`
                SELECT 
                    COUNT(*)::int AS total_old_orders,
                    COUNT(CASE WHEN (
                        UPPER(COALESCE(d.order_code, '')) NOT LIKE '%GCPET%'
                        AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%GCTEM%'
                        AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%PET%'
                        AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%TEM%'
                    ) THEN 1 END)::int AS dp_old_orders,
                    COUNT(CASE WHEN (
                        UPPER(COALESCE(d.order_code, '')) LIKE '%GCPET%'
                        OR UPPER(COALESCE(d.order_code, '')) LIKE '%GCTEM%'
                        OR UPPER(COALESCE(d.order_code, '')) LIKE '%PET%'
                        OR UPPER(COALESCE(d.order_code, '')) LIKE '%TEM%'
                    ) THEN 1 END)::int AS pet_old_orders
                FROM dht_orders d
                JOIN order_codes oc ON oc.order_code = d.order_code
                JOIN customers c ON oc.customer_id = c.id
                WHERE d.created_at >= $1::timestamp AND d.created_at <= $2::timestamp
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%SUA%'
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%MAU%'
                  AND COALESCE(c.cancel_approved, 0) != 1
                  AND COALESCE(d.is_draft, false) = false
                  AND COALESCE(oc.status, 'active') != 'cancelled'
                  AND (
                      COALESCE(c.customer_type, 'moi') = 'cu'
                      OR (
                          SELECT MIN(d2.created_at) 
                          FROM dht_orders d2 
                          JOIN order_codes oc2 ON oc2.order_code = d2.order_code 
                          WHERE oc2.customer_id = c.id 
                            AND COALESCE(d2.is_draft, false) = false
                      ) < d.created_at
                  )
            `, [startDate, endDate]);

            const totalOldOrders = parseInt(oldCustOrdersRes?.total_old_orders || 0);
            const dpOldOrders = parseInt(oldCustOrdersRes?.dp_old_orders || 0);
            const petOldOrders = parseInt(oldCustOrdersRes?.pet_old_orders || 0);

            const mktAdsOrders = parseInt(mktAdsOrdersRes?.total_mkt_ads_orders || 0);
            const dongPhucMktAdsOrders = parseInt(mktAdsOrdersRes?.dong_phuc_mkt_ads_orders || 0);
            const temPetMktAdsOrders = parseInt(mktAdsOrdersRes?.tem_pet_mkt_ads_orders || 0);

            const mktAdsRevenue = parseFloat(mktAdsOrdersRes?.total_mkt_ads_revenue || 0);
            const dongPhucMktAdsRevenue = parseFloat(mktAdsOrdersRes?.dong_phuc_mkt_ads_revenue || 0);
            const temPetMktAdsRevenue = parseFloat(mktAdsOrdersRes?.tem_pet_mkt_ads_revenue || 0);

            // Fallback: If marketing_budgets doesn't have order_count/revenue filled, fallback to totalOrders / totalRevenue
            const mktOrders = mktAdsOrders || parseInt(mktStats?.total_orders || 0) || totalOrders;
            const mktRevenue = parseFloat(mktStats?.total_revenue || 0) || totalRevenue;
            const leads = parseInt(mktStats?.total_leads || 0);

            const dpOrdersCount = parseInt(execOrders?.dong_phuc_orders || 0);
            const petOrdersCount = parseInt(execOrders?.tem_pet_orders || 0);
            const dpRevAmount = parseFloat(execOrders?.dong_phuc_revenue || 0);
            const petRevAmount = parseFloat(execOrders?.tem_pet_revenue || 0);

            const cpoAds = mktAdsOrders > 0 ? Math.round(spent / mktAdsOrders) : 0;
            const dongPhucCpoAds = dongPhucMktAdsOrders > 0 ? Math.round(dongPhucSpent / dongPhucMktAdsOrders) : 0;
            const temPetCpoAds = temPetMktAdsOrders > 0 ? Math.round(temPetSpent / temPetMktAdsOrders) : 0;

            const dongPhucCPO = dpOrdersCount > 0 ? Math.round(dongPhucSpent / dpOrdersCount) : 0;
            const temPetCPO = petOrdersCount > 0 ? Math.round(temPetSpent / petOrdersCount) : 0;

            const costRatioAds = mktAdsRevenue > 0 ? parseFloat(((spent / mktAdsRevenue) * 100).toFixed(2)) : 0;
            const dongPhucCostRatioAds = dongPhucMktAdsRevenue > 0 ? parseFloat(((dongPhucSpent / dongPhucMktAdsRevenue) * 100).toFixed(2)) : 0;
            const temPetCostRatioAds = temPetMktAdsRevenue > 0 ? parseFloat(((temPetSpent / temPetMktAdsRevenue) * 100).toFixed(2)) : 0;

            const dongPhucCostRatio = dpRevAmount > 0 ? parseFloat(((dongPhucSpent / dpRevAmount) * 100).toFixed(2)) : 0;
            const temPetCostRatio = petRevAmount > 0 ? parseFloat(((temPetSpent / petRevAmount) * 100).toFixed(2)) : 0;

            const dongPhucCPL = dpLeadsCount > 0 ? Math.round(dongPhucSpent / dpLeadsCount) : 0;
            const temPetCPL = petLeadsCount > 0 ? Math.round(temPetSpent / petLeadsCount) : 0;

            const dongPhucCloseRate = dpLeadsCount > 0 ? parseFloat(((dpOrdersCount / dpLeadsCount) * 100).toFixed(2)) : 0;
            const temPetCloseRate = petLeadsCount > 0 ? parseFloat(((petOrdersCount / petLeadsCount) * 100).toFixed(2)) : 0;

            const mktAdsCloseRate = leads > 0 ? parseFloat(((mktAdsOrders / leads) * 100).toFixed(2)) : 0;
            const dongPhucAdsCloseRate = dpLeadsCount > 0 ? parseFloat(((dongPhucMktAdsOrders / dpLeadsCount) * 100).toFixed(2)) : 0;
            const temPetAdsCloseRate = petLeadsCount > 0 ? parseFloat(((temPetMktAdsOrders / petLeadsCount) * 100).toFixed(2)) : 0;

            // Aggregate Retention Stats across all P.Sale & P.Kinh Doanh employees
            let totalOldDpPool = 0, totalRetDpCust = 0;
            let totalOldPetPool = 0, totalRetPetCust = 0;

            try {
                const targetDepts = await db.all("SELECT id FROM departments WHERE (id IN (1, 4) OR parent_id IN (1, 4)) AND status = 'active'");
                const targetDeptIds = targetDepts.map(d => d.id);
                if (targetDeptIds.length > 0) {
                    const ph = targetDeptIds.map((_, i) => `$${i + 1}`).join(',');
                    const targetUsers = await db.all(`SELECT id, role FROM users WHERE department_id IN (${ph}) AND status = 'active'`, targetDeptIds);
                    const targetEmpIds = targetUsers.filter(u => u.role !== 'giam_doc').map(u => u.id);

                    if (targetEmpIds.length > 0) {
                        const retRows = await db.all(`
                            WITH valid_orders AS (
                                SELECT 
                                    d.id AS order_id, d.created_at, c.assigned_to_id,
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
                                WHERE c.assigned_to_id IN (${targetEmpIds.join(',')})
                                  AND c.phone IS NOT NULL AND c.phone != ''
                                  AND COALESCE(c.cancel_approved, 0) != 1
                                  AND COALESCE(d.is_draft, false) = false
                                  AND COALESCE(oc.status, 'active') NOT IN ('cancelled', 'canceled')
                            ),
                            prior_cust AS (
                                SELECT DISTINCT assigned_to_id, business_area, customer_key
                                FROM valid_orders
                                WHERE created_at < $1::timestamp
                                   OR (customer_created_at < $1::timestamp AND cust_table_type = 'cu')
                            ),
                            current_orders AS (
                                SELECT assigned_to_id, business_area, customer_key, COUNT(DISTINCT order_id) AS order_cnt
                                FROM valid_orders
                                WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp
                                GROUP BY assigned_to_id, business_area, customer_key
                            ),
                            old_pool AS (
                                SELECT assigned_to_id, business_area, customer_key FROM prior_cust
                                UNION
                                SELECT assigned_to_id, business_area, customer_key FROM current_orders WHERE order_cnt >= 2
                            ),
                            returning_cust AS (
                                SELECT DISTINCT c.assigned_to_id, c.business_area, c.customer_key
                                FROM current_orders c
                                JOIN old_pool p ON p.customer_key = c.customer_key AND p.business_area = c.business_area AND p.assigned_to_id = c.assigned_to_id
                            )
                            SELECT
                                (SELECT COUNT(DISTINCT (assigned_to_id || '_' || customer_key)) FROM old_pool WHERE business_area = 'dp')::int AS old_dp_total,
                                (SELECT COUNT(DISTINCT (assigned_to_id || '_' || customer_key)) FROM returning_cust WHERE business_area = 'dp')::int AS ret_dp_cust,
                                (SELECT COUNT(DISTINCT (assigned_to_id || '_' || customer_key)) FROM old_pool WHERE business_area = 'pettem')::int AS old_pettem_total,
                                (SELECT COUNT(DISTINCT (assigned_to_id || '_' || customer_key)) FROM returning_cust WHERE business_area = 'pettem')::int AS ret_pettem_cust
                        `, [startDate, endDate]);

                        const retRes = retRows[0] || {};
                        totalOldDpPool = parseInt(retRes.old_dp_total || 0);
                        totalRetDpCust = parseInt(retRes.ret_dp_cust || 0);
                        totalOldPetPool = parseInt(retRes.old_pettem_total || 0);
                        totalRetPetCust = parseInt(retRes.ret_pettem_cust || 0);
                    }
                }
            } catch(err) {
                console.error('[Dashboard] Retention aggregation error:', err.message);
            }

            const totalOldPool = totalOldDpPool + totalOldPetPool;
            const totalRetCust = totalRetDpCust + totalRetPetCust;

            const oldCustomerRate = totalOldPool > 0 ? parseFloat(((totalRetCust / totalOldPool) * 100).toFixed(2)) : 0;
            const dongPhucOldCustRate = totalOldDpPool > 0 ? parseFloat(((totalRetDpCust / totalOldDpPool) * 100).toFixed(2)) : 0;
            const temPetOldCustRate = totalOldPetPool > 0 ? parseFloat(((totalRetPetCust / totalOldPetPool) * 100).toFixed(2)) : 0;

            const cpo = totalOrders > 0 ? Math.round(spent / totalOrders) : 0;
            const costRatio = totalRevenue > 0 ? parseFloat(((spent / totalRevenue) * 100).toFixed(2)) : 0;
            const cpl = leads > 0 ? Math.round(spent / leads) : 0;
            const mktCloseRate = leads > 0 ? parseFloat(((mktOrders / leads) * 100).toFixed(2)) : 0;

            // Customers count
            const custStats = await db.get(`
                SELECT
                    COUNT(*) AS total_customers,
                    COUNT(CASE WHEN order_status IN ('chot_don','san_xuat','giao_hang','hoan_thanh') THEN 1 END) AS closed_customers
                FROM customers c
                WHERE c.created_at >= $1::timestamp AND c.created_at <= $2::timestamp
                ${_prodCustSQL}
            `, [startDate, endDate]);

            const totalCust = parseInt(custStats?.total_customers || 0);
            const closedCust = parseInt(custStats?.closed_customers || 0);
            const conversionRate = totalCust > 0 ? parseFloat(((closedCust / totalCust) * 100).toFixed(1)) : 0;

            // Pending Withdrawals
            const pendingWithdraw = await db.get("SELECT COUNT(*) as cnt FROM withdrawal_requests WHERE status = 'pending'");

            // 3. KPI Phòng Sale Data
            let kpiSaleRes = null;
            try {
                const monthParam = startDateOnly.substring(0, 7);
                const periodLabelSale = `T${parseInt(monthParam.split('-')[1])}/${monthParam.split('-')[0]}`;
                
                const saleDepts = await db.all("SELECT id FROM departments WHERE (id = 4 OR parent_id = 4) AND status = 'active'");
                const saleDeptIds = saleDepts.map(d => d.id);
                if (saleDeptIds.length > 0) {
                    const ph = saleDeptIds.map((_, i) => `$${i + 1}`).join(',');
                    const saleUsers = await db.all(`SELECT id, full_name, role FROM users WHERE department_id IN (${ph}) AND status = 'active'`, saleDeptIds);
                    const saleEmpIds = saleUsers.filter(u => u.role !== 'giam_doc').map(u => u.id);

                    if (saleEmpIds.length > 0) {
                        const sPh = saleEmpIds.map((_, i) => `$${i + 1}`).join(',');
                        const mStart = `${monthParam}-01 00:00:00`;
                        const mEndDate = new Date(parseInt(monthParam.split('-')[0]), parseInt(monthParam.split('-')[1]), 0);
                        const mEnd = `${formatDateStr(mEndDate.getFullYear(), mEndDate.getMonth() + 1, mEndDate.getDate())} 23:59:59`;

                        const revRow = await db.get(`
                            SELECT COALESCE(SUM(oi_sum.revenue - COALESCE(d.discount_amount, 0)), 0) AS rev
                            FROM dht_orders d
                            JOIN order_codes oc ON oc.order_code = d.order_code
                            JOIN customers c ON oc.customer_id = c.id
                            LEFT JOIN LATERAL (
                                SELECT COALESCE((SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id), 0) - COALESCE(d.vat_amount, 0) AS revenue
                            ) oi_sum ON true
                            WHERE c.assigned_to_id IN (${sPh})
                              AND COALESCE(c.cancel_approved, 0) != 1
                              AND COALESCE(d.is_draft, false) = false
                              AND d.created_at >= $${saleEmpIds.length + 1}::timestamp
                              AND d.created_at <= $${saleEmpIds.length + 2}::timestamp
                              AND COALESCE(oc.status, 'active') != 'cancelled'
                        `, [...saleEmpIds, mStart, mEnd]);

                        const saleRev = parseFloat(revRow?.rev || 0);

                        // Load KPI Targets
                        const targetRows = await db.all(`
                            SELECT metric, target_value, target_bonus_m1, target_bonus_m120
                            FROM kpi_targets
                            WHERE period_type = 'month' AND period_value = $1
                        `, [periodLabelSale]);

                        let targetM1 = 1200000000;
                        let bonusM1 = 20000000;
                        let targetM2 = 1440000000;
                        let bonusM2 = 30000000;

                        targetRows.forEach(t => {
                            if (t.metric === 'revenue_sale') {
                                targetM1 = parseFloat(t.target_value || targetM1);
                                bonusM1 = parseFloat(t.target_bonus_m1 || bonusM1);
                                targetM2 = parseFloat(t.target_bonus_m120 || targetM2);
                            }
                        });

                        const compM1 = targetM1 > 0 ? parseFloat(((saleRev / targetM1) * 100).toFixed(1)) : 0;
                        const compM2 = targetM2 > 0 ? parseFloat(((saleRev / targetM2) * 100).toFixed(1)) : 0;
                        const remainingM1 = Math.max(0, targetM1 - saleRev);

                        kpiSaleRes = {
                            month: periodLabelSale,
                            revenue_actual: saleRev,
                            target_m1: targetM1,
                            bonus_m1: bonusM1,
                            target_m2: targetM2,
                            bonus_m2: bonusM2,
                            completion_m1: compM1,
                            completion_m2: compM2,
                            remaining_m1: remainingM1
                        };
                    }
                }
            } catch(e) {
                console.error('[Mobile Dashboard] KPI Sale Calc Error:', e.message);
            }

            // 4. KPI Phòng Kinh Doanh Data
            let kpiKdRes = null;
            try {
                const monthParam = startDateOnly.substring(0, 7);
                const periodLabelKd = `T${parseInt(monthParam.split('-')[1])}/${monthParam.split('-')[0]}`;
                const daysInMonth = new Date(parseInt(monthParam.split('-')[0]), parseInt(monthParam.split('-')[1]), 0).getDate();
                const daysLeft = Math.max(0, daysInMonth - (now.getMonth() + 1 === parseInt(monthParam.split('-')[1]) ? now.getDate() : 0));

                const kdDepts = await db.all("SELECT id FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active'");
                const kdDeptIds = kdDepts.map(d => d.id);
                if (kdDeptIds.length > 0) {
                    const ph = kdDeptIds.map((_, i) => `$${i + 1}`).join(',');
                    const kdUsers = await db.all(`SELECT id, full_name, role FROM users WHERE department_id IN (${ph}) AND status = 'active'`, kdDeptIds);
                    const kdEmpIds = kdUsers.filter(u => u.role !== 'giam_doc').map(u => u.id);

                    if (kdEmpIds.length > 0) {
                        const kPh = kdEmpIds.map((_, i) => `$${i + 1}`).join(',');
                        const mStart = `${monthParam}-01 00:00:00`;
                        const mEndDate = new Date(parseInt(monthParam.split('-')[0]), parseInt(monthParam.split('-')[1]), 0);
                        const mEnd = `${formatDateStr(mEndDate.getFullYear(), mEndDate.getMonth() + 1, mEndDate.getDate())} 23:59:59`;

                        const revRow = await db.get(`
                            SELECT COALESCE(SUM(oi_sum.revenue - COALESCE(d.discount_amount, 0)), 0) AS rev
                            FROM dht_orders d
                            JOIN order_codes oc ON oc.order_code = d.order_code
                            JOIN customers c ON oc.customer_id = c.id
                            LEFT JOIN LATERAL (
                                SELECT COALESCE((SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id), 0) - COALESCE(d.vat_amount, 0) AS revenue
                            ) oi_sum ON true
                            WHERE c.assigned_to_id IN (${kPh})
                              AND COALESCE(c.cancel_approved, 0) != 1
                              AND COALESCE(d.is_draft, false) = false
                              AND d.created_at >= $${kdEmpIds.length + 1}::timestamp
                              AND d.created_at <= $${kdEmpIds.length + 2}::timestamp
                              AND COALESCE(oc.status, 'active') != 'cancelled'
                        `, [...kdEmpIds, mStart, mEnd]);

                        const kdRev = parseFloat(revRow?.rev || 0);
                        let targetM1 = 25000000;
                        let targetM120 = 30000000;

                        const compM1 = targetM1 > 0 ? parseFloat(((kdRev / targetM1) * 100).toFixed(1)) : 0;
                        const compM120 = targetM120 > 0 ? parseFloat(((kdRev / targetM120) * 100).toFixed(1)) : 0;

                        kpiKdRes = {
                            month: periodLabelKd,
                            days_left: daysLeft,
                            revenue_actual: kdRev,
                            target_m1: targetM1,
                            target_m120: targetM120,
                            exceeded_m1: Math.max(0, kdRev - targetM1),
                            completion_m1: compM1,
                            completion_m120: compM120
                        };
                    }
                }
            } catch(e) {
                console.error('[Mobile Dashboard] KPI KD Calc Error:', e.message);
            }

            // 5. Visual Charts Data (Image 5 inspired)
            let segmentSQL = '';
            const isPetCondition = `(
                UPPER(COALESCE(d.order_code, '')) LIKE '%PET%' 
                OR UPPER(COALESCE(d.order_code, '')) LIKE '%TEM%' 
                OR d.category_id IN (8, 9) 
                OR UPPER(COALESCE(cat.name, '')) IN ('PET', 'TEM')
            )`;
            if (mode === 'tem_pet') {
                segmentSQL = ` AND ${isPetCondition}`;
            } else if (mode === 'dong_phuc') {
                segmentSQL = ` AND NOT ${isPetCondition}`;
            }

            // Revenue & Order Trend chart (by Date / Month depending on period)
            const isMonthlyGrouping = period.startsWith('year_') || period.startsWith('monthrange_') || period.startsWith('q');

            // Query marketing spent & leads grouped by month/date with category filtering
            let spentGroupMap = {};
            let leadGroupMap = {};
            let totalPeriodSegmentSpent = 0;
            let totalPeriodSegmentLeads = 0;

            try {
                if (isMonthlyGrouping) {
                    const mbRows = await db.all(`
                        SELECT
                            SUBSTRING(mb.budget_date FROM 1 FOR 7) AS key_val,
                            COALESCE(SUM(CASE WHEN (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ĐỒNG PHỤC%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%DONG PHUC%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ÁO%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%AO%'
                            ) AND NOT (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                            ) THEN mb.spent_amount END), 0) AS dp_spent,
                            COALESCE(SUM(CASE WHEN (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                            ) THEN mb.spent_amount END), 0) AS pet_spent,
                            COALESCE(SUM(CASE WHEN (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ĐỒNG PHỤC%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%DONG PHUC%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ÁO%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%AO%'
                            ) AND NOT (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                            ) THEN mb.lead_count END), 0) AS dp_leads,
                            COALESCE(SUM(CASE WHEN (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                            ) THEN mb.lead_count END), 0) AS pet_leads,
                            COALESCE(SUM(mb.spent_amount), 0) AS total_spent,
                            COALESCE(SUM(mb.lead_count), 0) AS total_leads
                        FROM marketing_budgets mb
                        LEFT JOIN mkt_categories c ON mb.category_id = c.id
                        WHERE mb.budget_date >= $1 AND mb.budget_date <= $2
                        GROUP BY key_val
                    `, [startDate.substring(0, 10), endDate.substring(0, 10)]);

                    mbRows.forEach(sr => {
                        const valSpent = mode === 'dong_phuc' ? parseFloat(sr.dp_spent || 0) : (mode === 'tem_pet' ? parseFloat(sr.pet_spent || 0) : parseFloat(sr.total_spent || 0));
                        const valLeads = mode === 'dong_phuc' ? parseInt(sr.dp_leads || 0) : (mode === 'tem_pet' ? parseInt(sr.pet_leads || 0) : parseInt(sr.total_leads || 0));
                        spentGroupMap[sr.key_val] = valSpent;
                        leadGroupMap[sr.key_val] = valLeads;
                        totalPeriodSegmentSpent += valSpent;
                        totalPeriodSegmentLeads += valLeads;
                    });
                } else {
                    const mbRows = await db.all(`
                        SELECT
                            mb.budget_date AS key_val,
                            COALESCE(SUM(CASE WHEN (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ĐỒNG PHỤC%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%DONG PHUC%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ÁO%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%AO%'
                            ) AND NOT (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                            ) THEN mb.spent_amount END), 0) AS dp_spent,
                            COALESCE(SUM(CASE WHEN (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                            ) THEN mb.spent_amount END), 0) AS pet_spent,
                            COALESCE(SUM(CASE WHEN (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ĐỒNG PHỤC%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%DONG PHUC%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%ÁO%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%AO%'
                            ) AND NOT (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                            ) THEN mb.lead_count END), 0) AS dp_leads,
                            COALESCE(SUM(CASE WHEN (
                                UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%PET%'
                                OR UPPER(COALESCE(c.name, mb.channel, '')) LIKE '%TEM%'
                            ) THEN mb.lead_count END), 0) AS pet_leads,
                            COALESCE(SUM(mb.spent_amount), 0) AS total_spent,
                            COALESCE(SUM(mb.lead_count), 0) AS total_leads
                        FROM marketing_budgets mb
                        LEFT JOIN mkt_categories c ON mb.category_id = c.id
                        WHERE mb.budget_date >= $1 AND mb.budget_date <= $2
                        GROUP BY mb.budget_date
                    `, [startDate.substring(0, 10), endDate.substring(0, 10)]);

                    mbRows.forEach(sr => {
                        const valSpent = mode === 'dong_phuc' ? parseFloat(sr.dp_spent || 0) : (mode === 'tem_pet' ? parseFloat(sr.pet_spent || 0) : parseFloat(sr.total_spent || 0));
                        const valLeads = mode === 'dong_phuc' ? parseInt(sr.dp_leads || 0) : (mode === 'tem_pet' ? parseInt(sr.pet_leads || 0) : parseInt(sr.total_leads || 0));
                        spentGroupMap[sr.key_val] = valSpent;
                        leadGroupMap[sr.key_val] = valLeads;
                        totalPeriodSegmentSpent += valSpent;
                        totalPeriodSegmentLeads += valLeads;
                    });
                }
            } catch (err) {
                console.error('[Dashboard] Spent & Lead trend group query error:', err.message);
            }

            let trendRows = [];
            if (isMonthlyGrouping) {
                trendRows = await db.all(`
                    SELECT
                        TO_CHAR(d.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS month_val,
                        COUNT(DISTINCT d.id) AS order_cnt,
                        COALESCE(SUM(oi_sum.revenue - COALESCE(d.discount_amount, 0)), 0) AS rev_val,
                        COUNT(DISTINCT CASE WHEN LOWER(COALESCE(d.source, '')) IN (SELECT LOWER(TRIM(linked_source_name)) FROM mkt_categories WHERE linked_source_name IS NOT NULL AND TRIM(linked_source_name) <> '') OR LOWER(COALESCE(d.source, '')) IN ('ads', 'marketing', 'facebook', 'fb', 'google', 'tiktok') THEN d.id END) AS mkt_ads_orders,
                        COUNT(DISTINCT CASE WHEN c.customer_type = 'cu' THEN d.id END) AS old_cust_orders
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
                    WHERE COALESCE(c.cancel_approved, 0) != 1
                      AND COALESCE(d.is_draft, false) = false
                      AND d.created_at >= $1::timestamp
                      AND d.created_at <= $2::timestamp
                      AND COALESCE(oc.status, 'active') != 'cancelled'
                      AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%SUA%'
                      AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%MAU%'
                      ${segmentSQL}
                    GROUP BY month_val
                    ORDER BY month_val ASC
                `, [startDate, endDate]);
            } else {
                trendRows = await db.all(`
                    SELECT
                        DATE(d.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::text AS date_val,
                        COUNT(DISTINCT d.id) AS order_cnt,
                        COALESCE(SUM(oi_sum.revenue - COALESCE(d.discount_amount, 0)), 0) AS rev_val,
                        COUNT(DISTINCT CASE WHEN LOWER(COALESCE(d.source, '')) IN (SELECT LOWER(TRIM(linked_source_name)) FROM mkt_categories WHERE linked_source_name IS NOT NULL AND TRIM(linked_source_name) <> '') OR LOWER(COALESCE(d.source, '')) IN ('ads', 'marketing', 'facebook', 'fb', 'google', 'tiktok') THEN d.id END) AS mkt_ads_orders,
                        COUNT(DISTINCT CASE WHEN c.customer_type = 'cu' THEN d.id END) AS old_cust_orders
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
                    WHERE COALESCE(c.cancel_approved, 0) != 1
                      AND COALESCE(d.is_draft, false) = false
                      AND d.created_at >= $1::timestamp
                      AND d.created_at <= $2::timestamp
                      AND COALESCE(oc.status, 'active') != 'cancelled'
                      AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%SUA%'
                      AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%MAU%'
                      ${segmentSQL}
                    GROUP BY date_val
                    ORDER BY date_val ASC
                `, [startDate, endDate]);
            }

            let orderDataMap = {};
            let totalPeriodSegmentOrders = 0;
            let totalPeriodSegmentRevenue = 0;
            let totalPeriodSegmentAdsOrders = 0;
            let totalPeriodSegmentOldOrders = 0;

            trendRows.forEach(r => {
                const k = isMonthlyGrouping ? String(r.month_val || '') : String(r.date_val || '').substring(0, 10);
                const o = parseInt(r.order_cnt || 0);
                const rev = parseFloat(r.rev_val || 0);
                const ads = parseInt(r.mkt_ads_orders || 0);
                const old = parseInt(r.old_cust_orders || 0);

                orderDataMap[k] = { order_cnt: o, rev_val: rev, mkt_ads_orders: ads, old_cust_orders: old };

                totalPeriodSegmentOrders += o;
                totalPeriodSegmentRevenue += rev;
                totalPeriodSegmentAdsOrders += ads;
                totalPeriodSegmentOldOrders += old;
            });

            // Generate full time-series keys (Zero-filling missing dates/months)
            let allTimeKeys = [];
            if (isMonthlyGrouping) {
                let curr = new Date(startDate);
                const end = new Date(endDate);
                while (curr <= end) {
                    const yyyy = curr.getFullYear();
                    const mm = String(curr.getMonth() + 1).padStart(2, '0');
                    const k = `${yyyy}-${mm}`;
                    if (!allTimeKeys.includes(k)) allTimeKeys.push(k);
                    curr.setMonth(curr.getMonth() + 1);
                }
            } else {
                let curr = new Date(startDate.substring(0, 10) + 'T00:00:00');
                const end = new Date(endDate.substring(0, 10) + 'T00:00:00');
                while (curr <= end) {
                    const yyyy = curr.getFullYear();
                    const mm = String(curr.getMonth() + 1).padStart(2, '0');
                    const dd = String(curr.getDate()).padStart(2, '0');
                    const k = `${yyyy}-${mm}-${dd}`;
                    if (!allTimeKeys.includes(k)) allTimeKeys.push(k);
                    curr.setDate(curr.getDate() + 1);
                }
            }

            const trendLabels = [];
            const trendRevenue = [];
            const trendOrders = [];
            const trendCpo = [];
            const trendCpoAds = [];
            const trendCloseRate = [];
            const trendAdsCloseRate = [];
            const trendOldCustRate = [];
            const trendMktAdsOrders = [];
            const trendOldCustOrders = [];
            const trendMonthKeys = [];

            allTimeKeys.forEach(k => {
                if (isMonthlyGrouping) {
                    const parts = k.split('-');
                    const mNum = parts.length === 2 ? parseInt(parts[1]) : k;
                    trendLabels.push(`Tháng ${mNum}`);
                    trendMonthKeys.push(`month_${k}`);
                } else {
                    const dateParts = k.split('-');
                    const label = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : k;
                    trendLabels.push(label);
                    trendMonthKeys.push('');
                }

                const oData = orderDataMap[k] || { order_cnt: 0, rev_val: 0, mkt_ads_orders: 0, old_cust_orders: 0 };
                const ordCnt = oData.order_cnt;
                const revVal = oData.rev_val;
                const adsOrdCnt = oData.mkt_ads_orders;
                const oldCustOrdCnt = oData.old_cust_orders;

                const bucketSpent = spentGroupMap[k] || 0;
                const bucketLeads = leadGroupMap[k] || 0;

                const bucketCpo = ordCnt > 0 && bucketSpent > 0 ? Math.round(bucketSpent / ordCnt) : 0;
                const bucketCpoAds = adsOrdCnt > 0 && bucketSpent > 0 ? Math.round(bucketSpent / adsOrdCnt) : 0;
                const bucketCloseRate = bucketLeads > 0 ? parseFloat(((ordCnt / bucketLeads) * 100).toFixed(2)) : 0;
                const bucketAdsCloseRate = bucketLeads > 0 ? parseFloat(((adsOrdCnt / bucketLeads) * 100).toFixed(2)) : 0;
                const bucketOldCustRate = ordCnt > 0 ? parseFloat(((oldCustOrdCnt / ordCnt) * 100).toFixed(2)) : 0;

                trendRevenue.push(revVal);
                trendOrders.push(ordCnt);
                trendCpo.push(bucketCpo);
                trendCpoAds.push(bucketCpoAds);
                trendCloseRate.push(bucketCloseRate);
                trendAdsCloseRate.push(bucketAdsCloseRate);
                trendOldCustRate.push(bucketOldCustRate);
                trendMktAdsOrders.push(adsOrdCnt);
                trendOldCustOrders.push(oldCustOrdCnt);
            });

            // Map exact Section 1 & Section 2 overall values according to segment mode
            let overallCpo = cpo;
            let overallCpoAds = cpoAds;
            let overallCloseRate = mktCloseRate;
            let overallAdsCloseRate = mktAdsCloseRate;
            let overallOldCustRate = oldCustomerRate;

            if (mode === 'dong_phuc') {
                overallCpo = dongPhucCPO;
                overallCpoAds = dongPhucCpoAds;
                overallCloseRate = dongPhucCloseRate;
                overallAdsCloseRate = dongPhucAdsCloseRate;
                overallOldCustRate = dongPhucOldCustRate;
            } else if (mode === 'tem_pet') {
                overallCpo = temPetCPO;
                overallCpoAds = temPetCpoAds;
                overallCloseRate = temPetCloseRate;
                overallAdsCloseRate = temPetAdsCloseRate;
                overallOldCustRate = temPetOldCustRate;
            }

            // Order Status Breakdown (Per Order Status Aggregation)
            const statusRows = await db.all(`
                SELECT
                    CASE
                        WHEN d.official_save_clicked = true OR oi_sum.revenue > 0 THEN 'chot_don'
                        WHEN COALESCE(d.deposit_amount_cache, 0) > 0 OR d.deposit_payment_id IS NOT NULL THEN 'dat_coc'
                        ELSE COALESCE(c.order_status, 'chot_don')
                    END AS order_status,
                    COUNT(DISTINCT d.id) AS cnt
                FROM dht_orders d
                JOIN order_codes oc ON oc.order_code = d.order_code
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN dht_categories cat ON cat.id = d.category_id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(
                        (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id), 0
                    ) - COALESCE(d.vat_amount, 0) AS revenue
                ) oi_sum ON true
                WHERE d.created_at >= $1::timestamp AND d.created_at <= $2::timestamp
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%SUA%'
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%MAU%'
                  ${segmentSQL}
                GROUP BY 1
            `, [startDate, endDate]);

            const STATUS_MAP = {
                'chot_don': 'Chốt đơn',
                'dat_coc': 'Đặt cọc',
                'gui_stk_coc': 'Gửi STK cọc',
                'giuc_coc': 'Giục cọc',
                'moi': 'Mới',
                'dang_tu_van': 'Đang tư vấn',
                'tu_van_lai': 'Tư vấn lại',
                'lam_quen_tuong_tac': 'Làm quen tương tác',
                'gui_ct_kh_cu': 'Gửi CT KH cũ',
                'sau_ban_hang': 'Sau bán hàng',
                'dang_tien_hanh': 'Đang tiến hành',
                'da_huy_don_tra_coc': 'Đã hủy đơn trả cọc',
                'duyet_huy': 'Duyệt hủy',
                'huy_coc': 'Hủy cọc',
                'da_huy_don': 'Đã hủy đơn',
                'huy_don': 'Hủy đơn',
                'bao_gia': 'Báo giá',
                'gui_bao_gia': 'Gửi báo giá',
                'goi_dien': 'Gọi điện',
                'nhan_tin': 'Nhắn tin',
                'gap_truc_tiep': 'Gặp trực tiếp',
                'gui_mau': 'Gửi mẫu',
                'thiet_ke': 'Thiết kế',
                'bao_sua': 'Báo sửa',
                'cap_cuu_sep': 'Cấp cứu sếp',
                'giam_gia': 'Giảm giá',
                'tuong_tac_ket_noi': 'Tương tác kết nối',
                'san_xuat': 'Đang sản xuất',
                'giao_hang': 'Đang giao hàng',
                'hoan_thanh': 'Hoàn thành',
                'chua_chot': 'Chưa chốt',
                'huy': 'Đã hủy'
            };

            function formatStatusLabel(st) {
                if (!st) return 'Chưa chốt';
                if (STATUS_MAP[st]) return STATUS_MAP[st];
                return st.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }

            const orderStatuses = (statusRows || []).map(r => ({
                status: r.order_status || 'chua_chot',
                label: formatStatusLabel(r.order_status),
                count: parseInt(r.cnt || 0)
            }));

            // Top Products
            const topProducts = await db.all(`
                SELECT
                    COALESCE(di.product_name, 'Sản phẩm khác') AS name,
                    SUM(COALESCE(di.quantity, 1)) AS quantity,
                    SUM(COALESCE(di.item_total, 0)) AS revenue
                FROM dht_order_items di
                JOIN dht_orders d ON di.dht_order_id = d.id
                LEFT JOIN dht_categories cat ON cat.id = d.category_id
                WHERE d.created_at >= $1::timestamp AND d.created_at <= $2::timestamp
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%SUA%'
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%MAU%'
                  AND COALESCE(d.is_draft, false) = false
                  ${segmentSQL}
                GROUP BY di.product_name
                ORDER BY revenue DESC
                LIMIT 5
            `, [startDate, endDate]);

            // Top Customers (VIP)
            const topCustomers = await db.all(`
                SELECT
                    COALESCE(c.customer_name, 'Khách hàng') AS name,
                    COALESCE(SUM(oi_sum.revenue - COALESCE(d.discount_amount, 0)), 0) AS revenue
                FROM dht_orders d
                JOIN order_codes oc ON oc.order_code = d.order_code
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN dht_categories cat ON cat.id = d.category_id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(
                        (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id), 0
                    ) - COALESCE(d.vat_amount, 0) AS revenue
                ) oi_sum ON true
                WHERE d.created_at >= $1::timestamp AND d.created_at <= $2::timestamp
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%SUA%'
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%MAU%'
                  AND COALESCE(c.cancel_approved, 0) != 1
                  AND COALESCE(d.is_draft, false) = false
                  AND COALESCE(oc.status, 'active') != 'cancelled'
                  ${segmentSQL}
                GROUP BY c.id, c.customer_name
                ORDER BY revenue DESC
                LIMIT 5
            `, [startDate, endDate]);

            // Top Sales Staff
            const topSales = await db.all(`
                SELECT
                    u.full_name AS name,
                    COUNT(DISTINCT d.id) AS closed_orders,
                    COALESCE(SUM(oi_sum.revenue - COALESCE(d.discount_amount, 0)), 0) AS revenue
                FROM dht_orders d
                JOIN order_codes oc ON oc.order_code = d.order_code
                JOIN customers c ON oc.customer_id = c.id
                JOIN users u ON c.assigned_to_id = u.id
                LEFT JOIN dht_categories cat ON cat.id = d.category_id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(
                        (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id), 0
                    ) - COALESCE(d.vat_amount, 0) AS revenue
                ) oi_sum ON true
                WHERE d.created_at >= $1::timestamp AND d.created_at <= $2::timestamp
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%SUA%'
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%MAU%'
                  AND COALESCE(c.cancel_approved, 0) != 1
                  AND COALESCE(d.is_draft, false) = false
                  AND COALESCE(oc.status, 'active') != 'cancelled'
                  ${segmentSQL}
                GROUP BY u.id, u.full_name
                ORDER BY revenue DESC
                LIMIT 5
            `, [startDate, endDate]);

            // 6. Recent 10 Orders
            const recentOrders = await db.all(`
                SELECT
                    d.order_code,
                    COALESCE(c.customer_name, 'Khách hàng') AS customer_name,
                    CASE
                        WHEN d.official_save_clicked = true OR oi_sum.revenue > 0 THEN 'chot_don'
                        WHEN COALESCE(d.deposit_amount_cache, 0) > 0 OR d.deposit_payment_id IS NOT NULL THEN 'dat_coc'
                        ELSE COALESCE(c.order_status, 'chot_don')
                    END AS status,
                    (oi_sum.revenue - COALESCE(d.discount_amount, 0)) AS total
                FROM dht_orders d
                JOIN order_codes oc ON oc.order_code = d.order_code
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN users u ON c.assigned_to_id = u.id
                LEFT JOIN dht_categories cat ON cat.id = d.category_id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(
                        (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id), 0
                    ) - COALESCE(d.vat_amount, 0) AS revenue
                ) oi_sum ON true
                WHERE d.created_at >= $1::timestamp AND d.created_at <= $2::timestamp
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%SUA%'
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%MAU%'
                  AND COALESCE(c.cancel_approved, 0) != 1
                  AND COALESCE(d.is_draft, false) = false
                  AND COALESCE(oc.status, 'active') != 'cancelled'
                  ${segmentSQL}
                ORDER BY d.created_at DESC
                LIMIT 10
            `, [startDate, endDate]);

            return reply.send({
                period: {
                    key: period,
                    label: periodLabel,
                    date_from: startDate,
                    date_to: endDate,
                    has_data: totalOrders > 0 || spent > 0
                },
                marketing: {
                    spent_amount: spent,
                    dong_phuc_spent: dongPhucSpent,
                    tem_pet_spent: temPetSpent,
                    closed_orders: mktOrders,
                    mkt_ads_orders: mktAdsOrders,
                    dong_phuc_mkt_ads_orders: dongPhucMktAdsOrders,
                    tem_pet_mkt_ads_orders: temPetMktAdsOrders,
                    revenue: mktRevenue,
                    mkt_ads_revenue: mktAdsRevenue,
                    dong_phuc_mkt_ads_revenue: dongPhucMktAdsRevenue,
                    tem_pet_mkt_ads_revenue: temPetMktAdsRevenue,
                    cpo: cpo,
                    dong_phuc_cpo: dongPhucCPO,
                    tem_pet_cpo: temPetCPO,
                    cpo_ads: cpoAds,
                    dong_phuc_cpo_ads: dongPhucCpoAds,
                    tem_pet_cpo_ads: temPetCpoAds,
                    cost_ratio: costRatio,
                    dong_phuc_cost_ratio: dongPhucCostRatio,
                    tem_pet_cost_ratio: temPetCostRatio,
                    cost_ratio_ads: costRatioAds,
                    dong_phuc_cost_ratio_ads: dongPhucCostRatioAds,
                    tem_pet_cost_ratio_ads: temPetCostRatioAds,
                    lead_count: leads,
                    dong_phuc_leads: dpLeadsCount,
                    tem_pet_leads: petLeadsCount,
                    cpl: cpl,
                    dong_phuc_cpl: dongPhucCPL,
                    tem_pet_cpl: temPetCPL,
                    close_rate: mktCloseRate,
                    dong_phuc_close_rate: dongPhucCloseRate,
                    tem_pet_close_rate: temPetCloseRate,
                    mkt_ads_close_rate: mktAdsCloseRate,
                    dong_phuc_ads_close_rate: dongPhucAdsCloseRate,
                    tem_pet_ads_close_rate: temPetAdsCloseRate,
                    old_customer_rate: oldCustomerRate,
                    dong_phuc_old_cust_rate: dongPhucOldCustRate,
                    tem_pet_old_cust_rate: temPetOldCustRate,
                    total_old_orders: totalOldOrders,
                    dong_phuc_old_orders: dpOldOrders,
                    tem_pet_old_orders: petOldOrders,
                    total_old_pool: totalOldPool,
                    total_ret_cust: totalRetCust,
                    dong_phuc_old_pool: totalOldDpPool,
                    dong_phuc_ret_cust: totalRetDpCust,
                    tem_pet_old_pool: totalOldPetPool,
                    tem_pet_ret_cust: totalRetPetCust
                },
                executive: {
                    total_revenue: totalRevenue,
                    total_orders: totalOrders,
                    total_old_orders: totalOldOrders,
                    dong_phuc_old_orders: dpOldOrders,
                    tem_pet_old_orders: petOldOrders,
                    total_old_pool: totalOldPool,
                    total_ret_cust: totalRetCust,
                    dong_phuc_old_pool: totalOldDpPool,
                    dong_phuc_ret_cust: totalRetDpCust,
                    tem_pet_old_pool: totalOldPetPool,
                    tem_pet_ret_cust: totalRetPetCust,
                    dong_phuc_orders: parseInt(execOrders?.dong_phuc_orders || 0),
                    dong_phuc_revenue: parseFloat(execOrders?.dong_phuc_revenue || 0),
                    tem_pet_orders: parseInt(execOrders?.tem_pet_orders || 0),
                    tem_pet_revenue: parseFloat(execOrders?.tem_pet_revenue || 0),
                    aov: aov,
                    conversion_rate: conversionRate,
                    pending_withdrawals: pendingWithdraw?.cnt || 0
                },
                kpi_sale: kpiSaleRes,
                kpi_kdoanh: kpiKdRes,
                charts: {
                    revenue_trend: {
                        labels: trendLabels,
                        revenue: trendRevenue,
                        orders: trendOrders,
                        cpo: trendCpo,
                        cpo_ads: trendCpoAds,
                        close_rate: trendCloseRate,
                        ads_close_rate: trendAdsCloseRate,
                        old_cust_rate: trendOldCustRate,
                        mkt_ads_orders: trendMktAdsOrders,
                        old_cust_orders: trendOldCustOrders,
                        month_keys: trendMonthKeys,
                        is_monthly: isMonthlyGrouping,
                        overall_summary: {
                            spent: totalPeriodSegmentSpent,
                            leads: totalPeriodSegmentLeads,
                            orders: totalPeriodSegmentOrders,
                            revenue: totalPeriodSegmentRevenue,
                            ads_orders: totalPeriodSegmentAdsOrders,
                            old_orders: totalPeriodSegmentOldOrders,
                            cpo: overallCpo,
                            cpo_ads: overallCpoAds,
                            close_rate: overallCloseRate,
                            ads_close_rate: overallAdsCloseRate,
                            old_customer_rate: overallOldCustRate
                        }
                    },
                    order_statuses: orderStatuses,
                    top_products: topProducts.map(p => ({ name: p.name, quantity: parseInt(p.quantity || 0), revenue: parseFloat(p.revenue || 0) })),
                    top_customers: topCustomers.map(c => ({ name: c.name, revenue: parseFloat(c.revenue || 0) })),
                    top_sales: topSales.map(s => ({ name: s.name, closed_orders: parseInt(s.closed_orders || 0), revenue: parseFloat(s.revenue || 0) }))
                },
                recent_orders: (recentOrders || []).map(o => ({
                    order_code: o.order_code,
                    customer_name: o.customer_name,
                    staff_name: o.staff_name,
                    created_at: o.created_at,
                    status: o.status,
                    total: parseFloat(o.total || 0)
                }))
            });

        } catch (error) {
            console.error('[Mobile Dashboard Summary Error]:', error);
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });

    // GET /api/m/dashboard/orders - Fetch detailed orders for Executive Dashboard charts & modal
    fastify.get('/api/m/dashboard/orders', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { period, date_from, date_to, startDate: reqStartDate, endDate: reqEndDate, mode } = request.query;

            let startDate = reqStartDate || date_from;
            let endDate = reqEndDate || date_to;

            if (!startDate || !endDate) {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
                startDate = `${year}-${month}-01 00:00:00`;
                endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')} 23:59:59`;
            }

            let segmentSQL = '';
            const isPetCondition = `(
                UPPER(COALESCE(d.order_code, '')) LIKE '%PET%' 
                OR UPPER(COALESCE(d.order_code, '')) LIKE '%TEM%' 
                OR d.category_id IN (8, 9) 
                OR UPPER(COALESCE(cat.name, '')) IN ('PET', 'TEM')
            )`;
            if (mode === 'tem_pet' || mode === 'pettem') {
                segmentSQL = ` AND ${isPetCondition}`;
            } else if (mode === 'dong_phuc' || mode === 'dp') {
                segmentSQL = ` AND NOT ${isPetCondition}`;
            }

            const orders = await db.all(`
                SELECT
                    d.id,
                    d.order_code,
                    TO_CHAR(d.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') as order_time_str,
                    TO_CHAR(d.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') as dt_str,
                    COALESCE(c.customer_name, 'Khách hàng') as customer_name,
                    COALESCE(u.full_name, u.username, '—') as sale_name,
                    COALESCE(c.customer_type, 'moi') as customer_type,
                    COALESCE(d.source, 'Khách Trực Tiếp') as source,
                    COALESCE(d.total_quantity, 0) as total_quantity,
                    COALESCE(d.deposit_amount_cache, 0) as deposit_amount,
                    (oi_sum.revenue - COALESCE(d.discount_amount, 0)) AS total_amount
                FROM dht_orders d
                JOIN order_codes oc ON oc.order_code = d.order_code
                JOIN customers c ON oc.customer_id = c.id
                JOIN users u ON c.assigned_to_id = u.id
                LEFT JOIN dht_categories cat ON cat.id = d.category_id
                LEFT JOIN LATERAL (
                    SELECT COALESCE(
                        (SELECT SUM(di.item_total) FROM dht_order_items di WHERE di.dht_order_id = d.id), 0
                    ) - COALESCE(d.vat_amount, 0) AS revenue
                ) oi_sum ON true
                WHERE d.created_at >= $1::timestamp AND d.created_at <= $2::timestamp
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%SUA%'
                  AND UPPER(COALESCE(d.order_code, '')) NOT LIKE '%MAU%'
                  ${segmentSQL}
                ORDER BY d.created_at DESC
            `, [startDate, endDate]);

            return reply.send({
                success: true,
                orders: (orders || []).map(o => ({
                    id: o.id,
                    order_code: o.order_code,
                    order_time_str: o.order_time_str,
                    dt_str: o.dt_str,
                    customer_name: o.customer_name,
                    sale_name: o.sale_name,
                    customer_type: o.customer_type,
                    source: o.source,
                    total_quantity: parseFloat(o.total_quantity || 0),
                    deposit_amount: parseFloat(o.deposit_amount || 0),
                    total_amount: parseFloat(o.total_amount || 0)
                }))
            });
        } catch (error) {
            console.error('[Mobile Dashboard Orders Error]:', error);
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    });
};
