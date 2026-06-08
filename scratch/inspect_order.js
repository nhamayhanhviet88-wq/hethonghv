const db = require('../db/pool');

async function run() {
    try {
        await db.init();
        
        const order = await db.get(`SELECT id, order_code FROM dht_orders WHERE order_code = 'AFF-VTTI0010'`);
        if (!order) {
            console.log("Order not found!");
            return;
        }
        console.log("=== ORDER ===");
        console.log(order);

        const items = await db.all(`SELECT id, description, quantity FROM dht_order_items WHERE dht_order_id = $1`, [order.id]);
        console.log("=== ITEMS ===");
        console.table(items);

        const assignments = await db.all(`
            SELECT qa.*, pf.name AS field_name
            FROM qlx_order_print_assignments qa
            JOIN printing_fields pf ON qa.field_id = pf.id
            WHERE qa.dht_order_id = $1
        `, [order.id]);
        console.log("=== ASSIGNMENTS ===");
        console.table(assignments);

        const printRecords = await db.all(`
            SELECT id, order_item_id, print_field, printer_id, contractor_id, is_print_done, product_name
            FROM printing_records
            WHERE dht_order_id = $1
        `, [order.id]);
        console.log("=== PRINT RECORDS ===");
        console.table(printRecords);

    } catch (e) {
        console.error(e);
    } finally {
        await db.close();
    }
}

run();
