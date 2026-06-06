const db = require('../db/pool');
(async () => {
    try {
        console.log('=== material_transactions schema ===');
        const rows = await db.all("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'material_transactions'");
        console.log(JSON.stringify(rows, null, 2));
    } catch(e) { console.error(e.message); }
    process.exit(0);
})();
