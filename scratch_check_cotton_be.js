const db = require('./db/pool');

(async () => {
    try {
        console.log('--- INSPECTING COTTON LITE BE IN KV_ROLLS ---');
        
        const rows = await db.all(`
            SELECT r.id, r.roll_code, r.weight, r.is_returned, r.is_cutting, fc.color_name, m.name as mat_name
            FROM kv_rolls r
            JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
            JOIN kv_materials m ON m.id = fc.material_id
            WHERE m.name ILIKE '%cotton lite%' AND fc.color_name ILIKE '%be%'
        `);
        console.log(rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
