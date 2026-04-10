const db = require('./db/pool');
setTimeout(async () => {
    for (const crm of ['goi_ban_hang', 'tu_tim_kiem']) {
        const sources = await db.all(`
            SELECT s.id, s.name, s.is_active, s.daily_quota,
                (SELECT COUNT(*) FROM telesale_data d WHERE d.source_id = s.id) as data_count
            FROM telesale_sources s WHERE s.crm_type = $1 ORDER BY s.id
        `, [crm]);
        console.log(`\n=== ${crm} (${sources.length} sources) ===`);
        sources.forEach(s => {
            console.log(`  ${s.is_active ? '✅' : '❌'} ID ${s.id}: ${s.name} | quota=${s.daily_quota} | data=${s.data_count}`);
        });
        
        // Check for empty sources
        const empty = sources.filter(s => s.data_count === 0 && s.is_active);
        if (empty.length > 0) {
            console.log(`  ⚠️ ${empty.length} active sources with 0 data!`);
        }
    }
    process.exit();
}, 500);
