const db = require('./db/pool');
setTimeout(async () => {
    try {
        const tp1 = await db.get("SELECT id FROM users WHERE username = 'truongphong1'");
        const uid = tp1.id;
        const today = new Date().toISOString().split('T')[0];
        console.log('truongphong1 id:', uid, '| Today:', today);

        // Count assignments by date
        const byDate = await db.all(`
            SELECT a.assigned_date::text as d, COUNT(*) as cnt 
            FROM telesale_assignments a 
            WHERE a.user_id = $1 
            GROUP BY a.assigned_date 
            ORDER BY a.assigned_date DESC LIMIT 10`, [uid]);
        console.log('\nAssignments by date:');
        byDate.forEach(r => console.log(`  ${r.d}: ${r.cnt} assignments`));

        // Count by CRM type for today
        const byCRM = await db.all(`
            SELECT s.crm_type, COUNT(*) as cnt
            FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            JOIN telesale_sources s ON s.id = d.source_id
            WHERE a.user_id = $1 AND a.assigned_date = $2
            GROUP BY s.crm_type`, [uid, today]);
        console.log('\nToday by CRM type:');
        byCRM.forEach(r => console.log(`  ${r.crm_type}: ${r.cnt}`));

        // Count by source for today 
        const bySrc = await db.all(`
            SELECT s.name, s.crm_type, s.daily_quota, COUNT(*) as cnt
            FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            JOIN telesale_sources s ON s.id = d.source_id
            WHERE a.user_id = $1 AND a.assigned_date = $2
            GROUP BY s.name, s.crm_type, s.daily_quota
            ORDER BY s.crm_type, s.name`, [uid, today]);
        console.log('\nToday by source:');
        bySrc.forEach(r => console.log(`  [${r.crm_type}] ${r.name}: ${r.cnt} (quota: ${r.daily_quota})`));

        // Total today
        const total = await db.get(`
            SELECT COUNT(*) as cnt FROM telesale_assignments 
            WHERE user_id = $1 AND assigned_date = $2`, [uid, today]);
        console.log('\nTotal today:', total.cnt);

        // Check status breakdown
        const byStatus = await db.all(`
            SELECT a.call_status, COUNT(*) as cnt
            FROM telesale_assignments a
            WHERE a.user_id = $1 AND a.assigned_date = $2
            GROUP BY a.call_status`, [uid, today]);
        console.log('\nStatus breakdown:');
        byStatus.forEach(r => console.log(`  ${r.call_status}: ${r.cnt}`));

        // Check how many active members exist
        const members = await db.all(`
            SELECT tam.user_id, tam.daily_quota, tam.crm_type, u.full_name
            FROM telesale_active_members tam 
            JOIN users u ON u.id = tam.user_id
            WHERE tam.user_id = $1 AND tam.is_active = true`, [uid]);
        console.log('\nActive member configs:');
        members.forEach(m => console.log(`  [${m.crm_type}] quota: ${m.daily_quota === null ? 'NULL (default)' : m.daily_quota}`));

    } catch(e) { console.error(e); }
    process.exit();
}, 500);
