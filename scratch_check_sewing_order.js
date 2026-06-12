const db = require('./db/pool');

async function check() {
    try {
        await db.init();
        const order = await db.get("SELECT id, order_code FROM dht_orders WHERE order_code = 'AFF-VTTI0013'");
        console.log("Order:", order);
        if (order) {
            const items = await db.all("SELECT id, product_name, quantity, description FROM dht_order_items WHERE dht_order_id = $1", [order.id]);
            console.log("\nDHT Order Items:");
            console.log(items);

            const sewing = await db.all("SELECT id, order_item_id, quantity, sewer_id, contractor_id, sewing_team_id, product_name FROM sewing_records WHERE dht_order_id = $1", [order.id]);
            console.log("\nSewing Records:");
            console.log(sewing);
        }
    } catch(e) {
        console.error(e);
    } finally {
        await db.close();
    }
}
check();
