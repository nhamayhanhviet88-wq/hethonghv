const db = require('./db/pool');
(async () => {
    try {
        // Check before
        const before = await db.all(`SELECT id, name, crm_type FROM telesale_sources WHERE crm_type IS NULL ORDER BY id`);
        console.log(`=== BEFORE: ${before.length} sources with crm_type=NULL ===`);
        before.forEach(s => console.log(`  id=${s.id}: ${s.name}`));

        // Fix: set crm_type = 'nuoi_duong' for all null sources
        const result = await db.run(`UPDATE telesale_sources SET crm_type = 'nuoi_duong' WHERE crm_type IS NULL`);
        console.log(`\n=== UPDATED ${result?.rowCount || result?.changes || 0} rows ===`);

        // Verify after
        const after = await db.all(`SELECT id, name, crm_type FROM telesale_sources WHERE crm_type IS NULL ORDER BY id`);
        console.log(`\n=== AFTER: ${after.length} sources with crm_type=NULL ===`);
        
        // Show all nuoi_duong sources now
        const nuoi = await db.all(`SELECT id, name, daily_quota FROM telesale_sources WHERE crm_type = 'nuoi_duong' ORDER BY id`);
        console.log(`\n=== All nuoi_duong sources (${nuoi.length}) ===`);
        nuoi.forEach(s => console.log(`  id=${s.id}: ${s.name} (quota=${s.daily_quota})`));

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
