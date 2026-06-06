const db = require('./db/pool');

async function main() {
    await db.init();
    try {
        const pr = await db.all(`
            SELECT pr.id, pr.pettem_roll_id, o.order_code, pr.order_quantity, pr.print_meters, pr.print_done_at
            FROM printing_records pr
            LEFT JOIN dht_orders o ON pr.dht_order_id = o.id
            WHERE o.order_code IN ('GCPET0002', 'GCPET0003')
        `);
        console.log('Printing records for GCPET0002/3:', pr);

        const rolls = await db.all(`
            SELECT id, roll_type, qty_imported, qty_printed, qty_remaining, material_tx_id, notes
            FROM pettem_rolls
            ORDER BY id
        `);
        console.log('Pettem Rolls:', rolls);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
