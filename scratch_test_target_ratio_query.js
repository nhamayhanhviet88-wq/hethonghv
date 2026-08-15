const db = require('./db/pool');

async function testTargetRatioQuery() {
    const rows = await db.all(`
        SELECT m.name as material_name, ct.cutting_category, ct.target_ratio
        FROM kv_material_cutting_targets ct
        JOIN kv_materials m ON m.id = ct.material_id
        WHERE m.name ILIKE '%cotton lite%' AND ct.target_ratio > 0
    `);
    console.log('--- TARGET CUT RATIOS FOR COTTON LITE 100% ---');
    console.log(rows);
}

testTargetRatioQuery().then(() => process.exit(0));
