const db = require('./db/pool');

(async () => {
    try {
        console.log('--- SEARCHING FOR "5.21" OR "40.00" OR CUT RATIO TABLES ---');

        // Check kv_material_cutting_targets or kv_materials or kv_ratio_quantity_ranges
        const targetCols = await db.all(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_name LIKE '%cut%' OR table_name LIKE '%target%' OR table_name LIKE '%ratio%' OR table_name LIKE '%kv_%'
            ORDER BY table_name
        `);
        console.log('RELEVANT TABLES & COLS:', targetCols);

        // Search kv_material_cutting_targets
        try {
            const targets = await db.all(`SELECT * FROM kv_material_cutting_targets LIMIT 10`);
            console.log('kv_material_cutting_targets:', targets);
        } catch(e) { console.log('kv_material_cutting_targets err:', e.message); }

        // Search kv_materials columns
        const matCols = await db.all(`SELECT id, name, target_cut_ratio FROM kv_materials WHERE name ILIKE '%cotton lite%'`);
        console.log('kv_materials target_cut_ratio:', matCols);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
