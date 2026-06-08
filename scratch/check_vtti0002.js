const db = require('../db/pool');

async function run() {
    try {
        const order = await db.get(`SELECT id, order_code, category_id, total_quantity FROM dht_orders WHERE order_code ILIKE '%VTTI0002%'`);
        console.log('ORDER:', order);
        if (!order) return;

        const items = await db.all(`SELECT id, description, quantity, material_pairs FROM dht_order_items WHERE dht_order_id = $1`, [order.id]);
        console.log('ITEMS:', items);

        const assignments = await db.all(`SELECT * FROM qlx_assignments WHERE dht_order_id = $1`, [order.id]);
        console.log('ASSIGNMENTS (qlx_assignments):', assignments);

        const printRecs = await db.all(`SELECT id, dht_order_id, order_item_id, is_print_done, print_meters, current_roll, print_field, printer_id FROM printing_records WHERE dht_order_id = $1`, [order.id]);
        console.log('PRINTING RECORDS:', printRecs);

        const cutRecs = await db.all(`SELECT id, order_item_id, is_cut_done, product_name, material_name, fabric_color, cut_quantity FROM cutting_records WHERE order_item_id = ANY($1)`, [items.map(it => it.id)]);
        console.log('CUTTING RECORDS:', cutRecs);

        const pressingRecs = await db.all(`SELECT id, order_item_id, is_reported, press_images FROM pressing_records WHERE order_item_id = ANY($1)`, [items.map(it => it.id)]);
        console.log('PRESSING RECORDS:', pressingRecs);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

run();
