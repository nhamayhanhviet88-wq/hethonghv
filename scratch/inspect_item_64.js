const db = require('../db/pool');

async function check() {
    try {
        const item = await db.get(`
            SELECT id, dht_order_id, description, quantity, material_pairs, created_at
            FROM dht_order_items
            WHERE id = 64
        `);
        console.log('Order Item 64:', item);
        
        if (item) {
            const order = await db.get(`
                SELECT id, order_code, customer_name, created_at
                FROM dht_orders
                WHERE id = $1
            `, [item.dht_order_id]);
            console.log('Linked Order:', order);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
