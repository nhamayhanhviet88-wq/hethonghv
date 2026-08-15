const db = require('./db/pool');

(async () => {
    try {
        console.log('--- KV_MATERIALS LIST ---');
        const materials = await db.all(`SELECT id, name, location FROM kv_materials WHERE is_active = true`);
        console.log(materials);

        console.log('--- KV_TRANSACTIONS FOR MATERIAL ID 2 (POLY THÁI) ---');
        const txs = await db.all(`
            SELECT tx_type, SUM(total_quantity) as total_qty, COUNT(*) as count
            FROM kv_transactions
            WHERE material_id = 2 OR material_name ILIKE '%poly%'
            GROUP BY tx_type
        `);
        console.log(txs);

        console.log('--- KV_ROLLS / FABRIC ROLLS IN STOCK ---');
        const rolls = await db.all(`
            SELECT material_id, SUM(weight) as total_weight, COUNT(*) as roll_count
            FROM kv_rolls
            WHERE status = 'in_stock' OR is_active = true
            GROUP BY material_id
        `);
        console.log(rolls);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
