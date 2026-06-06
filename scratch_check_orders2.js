const db = require('./db/pool');

async function main() {
    await db.init();
    try {
        console.log('Querying roll 1...');
        const orders1 = await db.all(`
            SELECT pr.id, o.order_code, pr.order_quantity, pr.print_meters, pr.print_done_at,
                   u.full_name AS printer_name, c.name AS contractor_name
            FROM printing_records pr
            LEFT JOIN dht_orders o ON pr.dht_order_id = o.id
            LEFT JOIN users u ON pr.printer_id = u.id
            LEFT JOIN printing_contractors c ON pr.contractor_id = c.id
            WHERE pr.pettem_roll_id = $1
            ORDER BY pr.print_done_at DESC, pr.id DESC
        `, [1]);
        console.log('Roll 1 orders:', orders1);

        console.log('Querying roll 3...');
        const orders3 = await db.all(`
            SELECT pr.id, o.order_code, pr.order_quantity, pr.print_meters, pr.print_done_at,
                   u.full_name AS printer_name, c.name AS contractor_name
            FROM printing_records pr
            LEFT JOIN dht_orders o ON pr.dht_order_id = o.id
            LEFT JOIN users u ON pr.printer_id = u.id
            LEFT JOIN printing_contractors c ON pr.contractor_id = c.id
            WHERE pr.pettem_roll_id = $1
            ORDER BY pr.print_done_at DESC, pr.id DESC
        `, [3]);
        console.log('Roll 3 orders:', orders3);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
