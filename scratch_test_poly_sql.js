const db = require('./db/pool');

async function testPolyQuery() {
    const sql = `
        SELECT m.name as material_name, COUNT(r.id) as roll_count, COALESCE(SUM(r.weight), 0) as total_kg
        FROM kv_rolls r
        JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
        JOIN kv_materials m ON m.id = fc.material_id
        WHERE m.name ILIKE '%poly%' AND (r.is_returned IS NOT TRUE)
        GROUP BY m.name
    `;
    const rows = await db.all(sql);
    console.log('--- TEST POLY SQL EXECUTION RESULT ---');
    console.log(rows);
}

testPolyQuery().then(() => process.exit(0));
