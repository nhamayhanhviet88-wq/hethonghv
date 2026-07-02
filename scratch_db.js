const db = require('./db/pool');

async function run() {
    try {
        console.log("--- WAREHOUSES ---");
        const warehouses = await db.all("SELECT * FROM material_warehouses");
        console.log(warehouses);

        console.log("--- MATERIAL ITEMS ---");
        const items = await db.all("SELECT * FROM material_items WHERE name ILIKE '%tem%' OR name ILIKE '%pet%'");
        console.log(items);

        console.log("--- APPROVED PRICES ---");
        const prices = await db.all("SELECT * FROM approved_import_prices LIMIT 20");
        console.log(prices);
    } catch(e) {
        console.error(e);
    } finally {
        await db.close();
    }
}
run();
