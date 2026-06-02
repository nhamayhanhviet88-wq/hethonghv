const db = require('./pool');
require('dotenv').config();

async function run() {
    await db.init();
    console.log('Starting backfill for kv_rolls.source_import_id...');

    // 1. Backfill based on note "Nhập vải từ bill CODE"
    const rolls = await db.all('SELECT id, note FROM kv_rolls WHERE source_import_id IS NULL');
    console.log(`Found ${rolls.length} rolls with null source_import_id. Checking notes...`);
    let noteUpdated = 0;
    for (const r of rolls) {
        if (r.note && r.note.startsWith('Nhập vải từ bill ')) {
            const code = r.note.replace('Nhập vải từ bill ', '').trim();
            const imp = await db.get('SELECT id FROM import_records WHERE fabric_import_code = $1', [code]);
            if (imp) {
                await db.run('UPDATE kv_rolls SET source_import_id = $1 WHERE id = $2', [imp.id, r.id]);
                noteUpdated++;
            }
        }
    }
    console.log(`Updated ${noteUpdated} rolls via note matching.`);

    // 2. Backfill based on import_records fabric_items.roll_ids_created JSON scanning
    const imports = await db.all("SELECT id, fabric_items FROM import_records WHERE record_type = 'fabric'");
    console.log(`Scanning ${imports.length} fabric import records for roll associations...`);
    let jsonUpdated = 0;
    for (const imp of imports) {
        let items = [];
        try {
            items = typeof imp.fabric_items === 'string' ? JSON.parse(imp.fabric_items) : imp.fabric_items;
        } catch (e) {
            console.error(`Error parsing fabric_items for import ID ${imp.id}:`, e.message);
        }
        if (!Array.isArray(items)) continue;
        for (const item of items) {
            const created = item.roll_ids_created || [];
            for (const rollId of created) {
                // Only update if it is still null
                const res = await db.run('UPDATE kv_rolls SET source_import_id = $1 WHERE id = $2 AND source_import_id IS NULL', [imp.id, rollId]);
                if (res.changes > 0) {
                    jsonUpdated++;
                }
            }
        }
    }
    console.log(`Updated ${jsonUpdated} rolls via import JSON scanning.`);
    console.log('Backfill migration complete!');
    await db.close();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
