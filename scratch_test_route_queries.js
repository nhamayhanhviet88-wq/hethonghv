const db = require('./db/pool');

async function testFullRouteQueries() {
    try {
        const year = 2026;
        const mo = 8;
        const periodValue = '2026-08';

        console.time("QUERY_1_CATS");
        const allCats = await db.all(`
            SELECT id, parent_id, group_type, name, icon, ads_handler_name, linked_source_name, pancake_page_id, pancake_page_name
            FROM mkt_categories
            WHERE is_active = TRUE
            ORDER BY group_type ASC, parent_id ASC NULLS FIRST, sort_order ASC, id ASC
        `);
        console.timeEnd("QUERY_1_CATS");

        console.time("QUERY_2_RESOURCES");
        const savedResources = await db.all("SELECT DISTINCT ads_handler_name FROM mkt_ads_handler_resources WHERE ads_handler_name IS NOT NULL AND ads_handler_name != ''");
        console.timeEnd("QUERY_2_RESOURCES");

        console.time("QUERY_3_BUDGETS");
        const budgetRows = await db.all(`
            SELECT 
                id, category_id,
                COALESCE(NULLIF(TRIM(ads_handler_name), ''), 'Giám Đốc') AS handler_name,
                linked_source_name, pancake_page_name,
                budget_date,
                spent_amount, budget_amount, lead_count, order_count, revenue_amount
            FROM marketing_budgets
            WHERE budget_year = ? AND budget_month = ?
        `, [year, mo]);
        console.timeEnd("QUERY_3_BUDGETS");

        console.time("QUERY_4_TARGETS");
        const targetRows = await db.all(`
            SELECT * FROM mkt_kpi_targets
            WHERE period_value = ?
        `, [periodValue]);
        console.timeEnd("QUERY_4_TARGETS");

        console.time("QUERY_5_PAGES");
        const pageRows = await db.all(`
            SELECT DISTINCT NULLIF(TRIM(pancake_page_name), '') AS page_name
            FROM mkt_categories
            WHERE is_active = TRUE AND NULLIF(TRIM(pancake_page_name), '') IS NOT NULL
            ORDER BY page_name ASC
        `);
        console.timeEnd("QUERY_5_PAGES");

        console.log("=== SUCCESS! ===");
        console.log("Cats:", allCats.length, "Resources:", savedResources.length, "Budgets:", budgetRows.length, "Targets:", targetRows.length, "Pages:", pageRows.length);

    } catch(e) {
        console.error("QUERY ERROR:", e);
    }
}

testFullRouteQueries();
