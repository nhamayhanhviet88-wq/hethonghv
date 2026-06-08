const db = require('../db/pool');

async function main() {
    await db.init();
    try {
        console.log('Querying dht_orders for VTTI0002...');
        const orders = await db.all(`
            SELECT id, order_code, category_id, total_quantity, parent_order_id, order_date, expected_ship_date, notes
            FROM dht_orders
            WHERE order_code ILIKE '%VTTI0002%'
        `);
        console.log('DHT Orders count:', orders.length);
        console.log('DHT Orders:', JSON.stringify(orders, null, 2));

        if (orders.length > 0) {
            const orderIds = orders.map(o => o.id);
            console.log('\nQuerying dht_order_items for orderIds:', orderIds);
            const items = await db.all(`
                SELECT id, dht_order_id, description, quantity, material_pairs
                FROM dht_order_items
                WHERE dht_order_id IN (${orderIds.join(',')})
            `);
            console.log('Order Items:', JSON.stringify(items, null, 2));

            console.log('\nQuerying qlx_order_print_assignments for orderIds:', orderIds);
            const assigns = await db.all(`
                SELECT id, dht_order_id, item_id, field_id, operator_type, operator_id, assigned_by, assigned_at
                FROM qlx_order_print_assignments
                WHERE dht_order_id IN (${orderIds.join(',')})
            `);
            console.log('Assignments:', JSON.stringify(assigns, null, 2));

            console.log('\nQuerying qlx_history for orderIds:', orderIds);
            const history = await db.all(`
                SELECT id, dht_order_id, item_id, action, details, performed_by, performed_at
                FROM qlx_history
                WHERE dht_order_id IN (${orderIds.join(',')})
                ORDER BY performed_at DESC
            `);
            console.log('QLX History:', JSON.stringify(history, null, 2));

            console.log('\nQuerying printing_records for orderIds:', orderIds);
            const printRecs = await db.all(`
                SELECT id, dht_order_id, order_item_id, print_field, printer_id, contractor_id, 
                       product_name, cskh_name, order_quantity, print_meters, is_print_done, print_done_at
                FROM printing_records
                WHERE dht_order_id IN (${orderIds.join(',')})
            `);
            console.log('Printing Records:', JSON.stringify(printRecs, null, 2));
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
