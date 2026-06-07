const db = require('../db/pool');

async function check() {
    try {
        const orphans = await db.all(`
            SELECT cr.id, o.order_code, cr.product_name, cr.order_item_id
            FROM cutting_records cr
            LEFT JOIN dht_order_items oi ON cr.order_item_id = oi.id
            LEFT JOIN dht_orders o ON cr.dht_order_id = o.id
            WHERE oi.id IS NULL
        `);
        console.log('Orphaned Cutting Records (no matching order_item):');
        console.log(JSON.stringify(orphans, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
