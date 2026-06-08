const db = require('../db/pool');
(async () => {
    try {
        // Query columns of import_records
        const importCols = await db.all("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='import_records' ORDER BY ordinal_position");
        console.log('=== import_records columns ===');
        console.log(JSON.stringify(importCols, null, 2));

        // Query columns of kv_rolls
        const rollCols = await db.all("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='kv_rolls' ORDER BY ordinal_position");
        console.log('\n=== kv_rolls columns ===');
        console.log(JSON.stringify(rollCols, null, 2));

        // Query recent fabric import records
        const recentImports = await db.all("SELECT id, fabric_import_code, import_date, source_id, importer_id, cost, total_amount, debt, created_at FROM import_records WHERE record_type='fabric' ORDER BY id DESC LIMIT 5");
        console.log('\n=== recent fabric imports ===');
        console.log(JSON.stringify(recentImports, null, 2));

        // Query active fabric sources
        const fabricSources = await db.all("SELECT id, name, is_active FROM import_sources WHERE source_type='fabric' ORDER BY id");
        console.log('\n=== fabric sources ===');
        console.log(JSON.stringify(fabricSources, null, 2));

    } catch(e) {
        console.error(e.stack || e.message);
    }
    process.exit(0);
})();
