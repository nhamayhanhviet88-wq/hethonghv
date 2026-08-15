const db = require('./db/pool');

(async () => {
    try {
        const cols = await db.all(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'kv_ratio_quantity_ranges'
        `);
        console.log('--- KV_RATIO_QUANTITY_RANGES COLUMNS ---');
        console.log(cols);

        const rows = await db.all(`SELECT * FROM kv_ratio_quantity_ranges LIMIT 10`);
        console.log('SAMPLE ROWS:', rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
