const db = require('./db/pool');

async function testGetKpiMktInternal() {
    console.time("DB_QUERY");
    try {
        const month = '2026-08';
        const [year, mo] = month.split('-').map(Number);
        const periodValue = `${year}-${String(mo).padStart(2, '0')}`;
        const daysInMonth = new Date(year, mo, 0).getDate();

        // 1. Categories
        const allCats = await db.all(`
            SELECT id, parent_id, group_type, name, icon, ads_handler_name, linked_source_name, pancake_page_id, pancake_page_name
            FROM mkt_categories
            WHERE is_active = TRUE
            ORDER BY group_type ASC, parent_id ASC NULLS FIRST, sort_order ASC, id ASC
        `);

        // 2. Targets
        const targets = await db.all(`
            SELECT * FROM mkt_kpi_targets WHERE period_value = ?
        `, [periodValue]);

        // 3. Daily spent
        const spentRows = await db.all(`
            SELECT spent_date, SUM(spent_amount) as total_spent
            FROM mkt_spent_slips
            WHERE spent_date >= ? AND spent_date <= ?
            GROUP BY spent_date
        `, [`${periodValue}-01`, `${periodValue}-${daysInMonth}`]);

        console.timeEnd("DB_QUERY");
        console.log("Categories:", allCats.length);
        console.log("Targets:", targets.length);
        console.log("Spent rows:", spentRows.length);
    } catch(e) {
        console.timeEnd("DB_QUERY");
        console.error("Error:", e);
    }
}

testGetKpiMktInternal();
