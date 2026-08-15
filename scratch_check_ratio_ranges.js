const db = require('./db/pool');

(async () => {
    try {
        console.log('--- KV_RATIO_QUANTITY_RANGES ROWS ---');
        const rows = await db.all(`
            SELECT r.id, m.name as mat_name, r.size_segment, r.target_ratio, r.ratio, r.unit
            FROM kv_ratio_quantity_ranges r
            JOIN kv_materials m ON m.id = r.material_id
            WHERE m.name ILIKE '%cotton lite%' OR m.name ILIKE '%mắt chim%'
        `);
        console.log(rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
