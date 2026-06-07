const db = require('../db/pool');

async function check() {
    try {
        const rows = await db.all(`
            SELECT cr.id, cr.dht_order_id, cr.order_item_id, cr.product_name, cr.cutter_id, 
                   cr.is_cutting, cr.is_cut_done, cr.created_at, cr.updated_at, cr.cut_warning, cr.is_cut_done
            FROM cutting_records cr
            LEFT JOIN dht_orders o ON cr.dht_order_id = o.id
            WHERE o.order_code = 'AFF-VTTI0019'
        `);
        console.log('Cutting Records for AFF-VTTI0019:');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
