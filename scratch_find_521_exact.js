const db = require('./db/pool');

(async () => {
    try {
        console.log('--- SEARCHING FOR 5.21 IN ALL TABLES AND JSONB COLUMNS ---');

        const rows1 = await db.all(`
            SELECT * FROM cutting_records 
            WHERE cut_ratio > 0 OR ratio_approved IS NOT NULL
            LIMIT 10
        `);
        console.log('cutting_records:', rows1);

        const rows2 = await db.all(`
            SELECT * FROM kv_material_cutting_targets
        `);
        console.log('kv_material_cutting_targets:', rows2);

        // Check if there is another table with target ratio
        const rows3 = await db.all(`
            SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%ratio%' OR table_name LIKE '%target%' OR table_name LIKE '%tile%' OR table_name LIKE '%dinh_muc%'
        `);
        console.log('matching tables:', rows3);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
