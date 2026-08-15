const db = require('./db/pool');

async function testWeightFilter() {
    const rows = await db.all(`
        SELECT fc.color_name, 
               COUNT(CASE WHEN r.weight > 0 THEN 1 END) as active_roll_count, 
               COALESCE(SUM(r.weight), 0) as total_kg
        FROM kv_rolls r
        JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
        JOIN kv_materials m ON m.id = fc.material_id
        WHERE m.name ILIKE '%cotton lite%' AND fc.color_name ILIKE '%be%' AND (r.is_returned IS NOT TRUE)
        GROUP BY fc.color_name
    `);
    console.log('--- COTTON LITE BE ACTIVE ROLLS (WEIGHT > 0) ---');
    console.log(rows);
}

testWeightFilter().then(() => process.exit(0));
