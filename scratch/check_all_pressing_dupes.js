const db = require('../db/pool');

async function check() {
    await db.init();
    try {
        console.log("=== CHECKING ALL PRESSING DUPES ===");
        const dupes = await db.all(`
            SELECT order_item_id, COUNT(*), ARRAY_AGG(id) as ids, ARRAY_AGG(product_name) as names 
            FROM pressing_records 
            GROUP BY order_item_id 
            HAVING COUNT(*) > 1
        `);
        console.log("Dupes:", JSON.stringify(dupes, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
