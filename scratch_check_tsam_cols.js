const db = require('./db/pool');

(async () => {
    try {
        const cols = await db.all(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tsam_samples'
            ORDER BY ordinal_position
        `);
        console.log('--- TSAM_SAMPLES COLUMNS ---');
        console.log(cols);

        const rows = await db.all(`
            SELECT id, sample_code, sample_type, collection, home_price, processing_price, sewing_tech
            FROM tsam_samples
            WHERE is_active = true
            LIMIT 10
        `);
        console.log('SAMPLE ROWS IN TSAM_SAMPLES:');
        console.log(rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
