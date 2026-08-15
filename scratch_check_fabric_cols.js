const db = require('./db/pool');

(async () => {
    try {
        const matCols = await db.all(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('kv_materials', 'kv_fabric_colors', 'fabric_transactions', 'kv_locations')
            ORDER BY table_name, ordinal_position
        `);
        console.log('--- INVENTORY TABLE COLUMNS ---');
        console.log(matCols);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
