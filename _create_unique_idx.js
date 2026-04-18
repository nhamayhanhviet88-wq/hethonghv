const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv' });
(async () => {
    // Delete assignments for empty-phone records first
    const emptyIds = await p.query(`SELECT id FROM telesale_data WHERE phone IS NULL OR phone = ''`);
    if (emptyIds.rows.length > 0) {
        const ids = emptyIds.rows.map(r => r.id);
        await p.query(`DELETE FROM telesale_assignments WHERE data_id = ANY($1::int[])`, [ids]);
        const del = await p.query(`DELETE FROM telesale_data WHERE id = ANY($1::int[])`, [ids]);
        console.log(`Deleted ${del.rowCount} empty-phone records (+ their assignments)`);
    } else {
        console.log('No empty phone records');
    }
    
    // Now create the UNIQUE INDEX
    try {
        await p.query(`DROP INDEX IF EXISTS idx_telesale_data_phone`);
        await p.query(`DROP INDEX IF EXISTS idx_telesale_data_phone_unique`);
        await p.query(`CREATE UNIQUE INDEX idx_telesale_data_phone_unique ON telesale_data(phone)`);
        console.log('✅ UNIQUE INDEX created successfully!');
    } catch (e) {
        console.error('❌ UNIQUE INDEX failed:', e.message);
    }
    
    // Verify
    const verify = await p.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'telesale_data' AND indexname LIKE '%phone%'`);
    console.log('Phone indexes:', verify.rows);
    
    await p.end();
})();
