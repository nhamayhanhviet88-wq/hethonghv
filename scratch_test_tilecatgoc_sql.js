const db = require('./db/pool');

async function testTilecatgocQuery() {
    const sql = `
        SELECT m.name as material_name, ct.cutting_category, ct.target_ratio
        FROM kv_material_cutting_targets ct
        JOIN kv_materials m ON m.id = ct.material_id
        WHERE m.name ILIKE '%cotton lite%' AND ct.target_ratio > 0
    `;
    const rows = await db.all(sql);
    console.log('--- TEST TỈ LỆ CẮT GỐC SQL RESULT ---');
    console.log(rows);
}

testTilecatgocQuery().then(() => process.exit(0));
