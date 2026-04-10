const db = require('./db/pool');
setTimeout(async () => {
    // Get all goi_hop_tac sources with data counts
    const sources = await db.all(`
        SELECT s.id, s.name, s.crm_type, s.daily_quota,
            (SELECT COUNT(*) FROM telesale_data d WHERE d.source_id = s.id) as data_count,
            (SELECT COUNT(*) FROM telesale_assignments a 
             JOIN telesale_data d ON d.id = a.data_id 
             WHERE d.source_id = s.id AND a.assigned_date = '2026-04-09') as today_assigned
        FROM telesale_sources s
        WHERE s.crm_type = 'goi_hop_tac' AND s.is_active = true
        ORDER BY s.id
    `);
    
    console.log('=== All goi_hop_tac sources ===');
    console.log('ID  | Name                          | Quota | Data   | Today');
    console.log('----|-------------------------------|-------|--------|------');
    sources.forEach(s => {
        console.log(`${String(s.id).padEnd(4)}| ${s.name.padEnd(30)}| ${String(s.daily_quota).padEnd(6)}| ${String(s.data_count).padEnd(7)}| ${s.today_assigned}`);
    });
    
    // Identify duplicates
    const nameMap = {};
    sources.forEach(s => {
        const key = s.name.toLowerCase().trim();
        if (!nameMap[key]) nameMap[key] = [];
        nameMap[key].push(s);
    });
    
    console.log('\n=== Duplicates ===');
    for (const [name, srcs] of Object.entries(nameMap)) {
        if (srcs.length > 1) {
            console.log(`"${name}": IDs ${srcs.map(s => `${s.id}(${s.data_count} data)`).join(' vs ')}`);
        }
    }
    
    process.exit();
}, 500);
