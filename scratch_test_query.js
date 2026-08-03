const db = require('./db/pool');

async function testKpiMktQuery() {
    try {
        const year = 2026;
        const mo = 8;
        const periodValue = '2026-08';

        const allCats = await db.all(`
            SELECT id, parent_id, group_type, name, icon, ads_handler_name, linked_source_name, pancake_page_id, pancake_page_name
            FROM mkt_categories
            WHERE is_active = TRUE
            ORDER BY group_type ASC, parent_id ASC NULLS FIRST, sort_order ASC, id ASC
        `);

        console.log("=== ALL CATS ===");
        console.log(JSON.stringify(allCats, null, 2));

        const dbParents = allCats.filter(c => !c.parent_id || c.parent_id === 0 || c.parent_id === 'null' || c.parent_id === null);
        console.log("=== DB PARENTS ===");
        console.log(dbParents.map(p => ({ id: p.id, name: p.name })));

        const allSubCats = allCats.filter(c => c.parent_id && c.parent_id != 0 && c.parent_id != 'null');
        console.log("=== ALL SUB CATS ===");
        console.log(allSubCats.map(s => ({ id: s.id, parent_id: s.parent_id, name: s.name })));

    } catch(e) {
        console.error("Error:", e.message);
    }
}

testKpiMktQuery();
