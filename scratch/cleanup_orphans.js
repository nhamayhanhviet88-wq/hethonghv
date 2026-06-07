const db = require('../db/pool');

async function cleanup() {
    try {
        const orphans = await db.all(`
            SELECT cr.id, o.order_code, cr.product_name
            FROM cutting_records cr
            LEFT JOIN dht_order_items oi ON cr.order_item_id = oi.id
            LEFT JOIN dht_orders o ON cr.dht_order_id = o.id
            WHERE oi.id IS NULL
        `);
        console.log('Found orphans:', orphans);
        
        if (orphans.length > 0) {
            const ids = orphans.map(r => r.id);
            console.log('Deleting cutting records with IDs:', ids);
            await db.run('DELETE FROM cutting_records WHERE id = ANY($1)', [ids]);
            console.log('Successfully deleted all orphaned cutting records.');
        } else {
            console.log('No orphans found.');
        }
        process.exit(0);
    } catch(e) {
        console.error('Cleanup failed:', e);
        process.exit(1);
    }
}

cleanup();
