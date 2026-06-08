const db = require('../db/pool');

async function run() {
    try {
        console.log("=== PRESSING_RECORDS COLUMNS ===");
        const cols = await db.all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pressing_records'");
        console.log(cols.filter(c => ['created_at', 'updated_at', 'reported_at'].includes(c.column_name)));

        console.log("\n=== QLX_ORDER_PRINT_ASSIGNMENTS COLUMNS ===");
        const cols2 = await db.all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'qlx_order_print_assignments'");
        console.log(cols2.filter(c => ['assigned_at'].includes(c.column_name)));

        console.log("\n=== RAW VALUES FOR PRESSING RECORD 5 ===");
        const rawPress = await db.get("SELECT id, created_at::text, updated_at::text, reported_at::text FROM pressing_records WHERE id = 5");
        console.log(rawPress);

        console.log("\n=== RAW VALUES FOR PRINT ASSIGNMENTS ===");
        const rawAssignments = await db.all("SELECT id, assigned_at::text, item_id FROM qlx_order_print_assignments WHERE dht_order_id = 27");
        console.log(rawAssignments);
    } catch(e) {
        console.error(e);
    } finally {
        await db.close();
    }
}
run();
