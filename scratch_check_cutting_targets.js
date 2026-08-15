const db = require('./db/pool');

(async () => {
    try {
        console.log('--- ALL ROWS IN KV_MATERIAL_CUTTING_TARGETS ---');
        const rows = await db.all(`
            SELECT ct.id, m.name as material_name, ct.cutting_category, ct.target_ratio
            FROM kv_material_cutting_targets ct
            JOIN kv_materials m ON m.id = ct.material_id
            WHERE ct.target_ratio > 0
        `);
        console.log(rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
