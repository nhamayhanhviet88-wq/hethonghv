const db = require('./db/pool');

(async () => {
    try {
        console.log('--- CALCULATING POLY THÁI (material_id = 2) STOCK FROM DATABASE ---');

        const polyMat = await db.get(`SELECT id, name FROM kv_materials WHERE name ILIKE '%poly%'`);
        console.log('Material Row:', polyMat);

        if (polyMat) {
            const rollsRow = await db.get(`
                SELECT COUNT(*) as roll_count, COALESCE(SUM(r.weight), 0) as total_kg
                FROM kv_rolls r
                JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                WHERE fc.material_id = $1 AND (r.is_returned IS NOT TRUE)
            `, [polyMat.id]);

            console.log(`POLY THÁI IN STOCK: ${rollsRow.total_kg} kg (${rollsRow.roll_count} cây vải)`);
        }
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
