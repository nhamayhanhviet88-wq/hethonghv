const db = require('./db/pool');
setTimeout(async () => {
    try {
        await db.run(
            "UPDATE telesale_active_members SET daily_quota = NULL WHERE user_id = (SELECT id FROM users WHERE username = 'truongphong1') AND crm_type = 'sinh_vien'"
        );
        const r = await db.get(
            "SELECT daily_quota, crm_type FROM telesale_active_members WHERE user_id = (SELECT id FROM users WHERE username = 'truongphong1') AND crm_type = 'sinh_vien'"
        );
        console.log('Updated sinh_vien quota:', r);

        // Verify all quotas
        const all = await db.all(
            "SELECT crm_type, daily_quota FROM telesale_active_members WHERE user_id = (SELECT id FROM users WHERE username = 'truongphong1')"
        );
        console.log('All quotas for truongphong1:', all);
    } catch(e) { console.error(e); }
    process.exit();
}, 500);
