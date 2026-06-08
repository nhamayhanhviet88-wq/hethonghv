const db = require('../db/pool');

async function main() {
    await db.init();
    try {
        console.log('--- Order Items for order_item_id = 52 or order_code LIKE %CTV-VTTI0016% ---');
        const items = await db.all(`
            SELECT doi.id, doi.dht_order_id, doi.description, doi.quantity, doi.material_pairs, o.order_code, o.shipping_priority
            FROM dht_order_items doi
            JOIN dht_orders o ON doi.dht_order_id = o.id
            WHERE o.order_code LIKE '%CTV-VTTI0016%'
        `);
        console.log('Items:', JSON.stringify(items, null, 2));

        if (items.length > 0) {
            const itemIds = items.map(it => it.id);
            console.log('\n--- Cutting Records ---');
            const cuts = await db.all(`
                SELECT id, order_item_id, material_name, fabric_color, cut_quantity, is_cut_done, created_at
                FROM cutting_records
                WHERE order_item_id IN (${itemIds.join(',')})
            `);
            console.log('Cutting Records:', JSON.stringify(cuts, null, 2));

            console.log('\n--- Pressing Records ---');
            const presses = await db.all(`
                SELECT id, dht_order_id, order_item_id, product_name, material_name, fabric_color, order_quantity, press_quantity, is_reported
                FROM pressing_records
                WHERE order_item_id IN (${itemIds.join(',')})
            `);
            console.log('Pressing Records:', JSON.stringify(presses, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

main();
