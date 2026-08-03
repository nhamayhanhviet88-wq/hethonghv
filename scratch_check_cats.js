const db = require('./db/pool');

async function checkCats() {
    try {
        const rows = await db.all("SELECT id, parent_id, group_type, name, icon, ads_handler_name, linked_source_name, pancake_page_name FROM mkt_categories WHERE is_active = TRUE");
        console.log("=== MKT CATEGORIES ===");
        console.log(JSON.stringify(rows, null, 2));
    } catch(e) {
        console.error("Error:", e.message);
    }
}

checkCats();
