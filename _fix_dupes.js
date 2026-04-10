const db = require('./db/pool');
setTimeout(async () => {
    try {
        // Deactivate old sources (id 1-16) that have 0 data
        const oldSources = await db.all(`
            SELECT s.id, s.name FROM telesale_sources s 
            WHERE s.id <= 16 AND s.crm_type = 'goi_hop_tac'
            AND NOT EXISTS (SELECT 1 FROM telesale_data d WHERE d.source_id = s.id)
        `);
        
        console.log(`Found ${oldSources.length} empty old sources to deactivate:`);
        for (const s of oldSources) {
            await db.run("UPDATE telesale_sources SET is_active = false WHERE id = $1", [s.id]);
            console.log(`  ❌ Deactivated: ${s.id} - ${s.name}`);
        }
        
        // Verify
        const active = await db.all("SELECT id, name FROM telesale_sources WHERE crm_type = 'goi_hop_tac' AND is_active = true ORDER BY id");
        console.log(`\n✅ Active sources remaining: ${active.length}`);
        active.forEach(s => console.log(`  ${s.id} - ${s.name}`));
    } catch(e) { console.error(e); }
    process.exit();
}, 500);
