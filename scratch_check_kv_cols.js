const db = require('./db/pool');

(async () => {
    try {
        const kvCols = await db.all(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('kv_transactions', 'kv_rolls', 'kv_cut_orders')
            ORDER BY table_name, ordinal_position
        `);
        console.log('--- KV TABLES COLUMNS ---');
        console.log(kvCols);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
