const db = require('../db/pool');

async function check() {
    try {
        const rows = await db.all(`
            SELECT id, dht_order_id, description, quantity, material_pairs, created_at
            FROM dht_order_items
            WHERE dht_order_id = 39
        `);
        console.log('Order Items for Order ID 39:');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
