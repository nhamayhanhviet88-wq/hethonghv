const db = require('./db/pool');
setTimeout(async () => {
    try {
        const today = '2026-04-09';
        const tp2 = await db.get("SELECT id FROM users WHERE username = 'truongphong2'");
        const uid = tp2.id;

        const byCRM = await db.all(`
            SELECT s.crm_type, COUNT(*) as cnt
            FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            JOIN telesale_sources s ON s.id = d.source_id
            WHERE a.user_id = $1 AND a.assigned_date = $2
            GROUP BY s.crm_type
        `, [uid, today]);
        console.log('truongphong2 by CRM:', byCRM);

        // Check member config
        const configs = await db.all(`
            SELECT crm_type, daily_quota FROM telesale_active_members 
            WHERE user_id = $1 AND is_active = true
        `, [uid]);
        console.log('Member configs:', configs);

        // Check source quotas per CRM
        for (const c of byCRM) {
            const srcQ = await db.get(`
                SELECT SUM(daily_quota) as total FROM telesale_sources 
                WHERE crm_type = $1 AND is_active = true
            `, [c.crm_type]);
            console.log(`  ${c.crm_type}: assigned=${c.cnt}, source_total=${srcQ.total}`);
        }

    } catch(e) { console.error(e); }
    process.exit();
}, 500);
