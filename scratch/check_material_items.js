const db = require('../db/pool');

async function run() {
    try {
        const rows = await db.all("SELECT id, name, warehouse_id, unit FROM material_items WHERE is_active=true");
        console.log(JSON.stringify(rows, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        await db.close();
    }
}
run();
