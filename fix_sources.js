const db = require('./db/pool');
(async () => {
    await db.run("UPDATE telesale_sources SET crm_type = 'nuoi_duong' WHERE id IN (134, 137)");
    const r = await db.all('SELECT id, name, crm_type FROM telesale_sources WHERE id IN (134, 137)');
    console.log('Restored:', JSON.stringify(r, null, 2));
    process.exit(0);
})();
