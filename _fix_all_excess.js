const db = require('./db/pool');
setTimeout(async () => {
    try {
        const today = '2026-04-09';
        
        // Get sinh_vien source total quota
        const srcQuota = await db.get(`
            SELECT SUM(daily_quota) as total_quota 
            FROM telesale_sources 
            WHERE crm_type = 'sinh_vien' AND is_active = true
        `);
        const correctQuota = parseInt(srcQuota.total_quota);
        console.log('sinh_vien correct quota:', correctQuota);

        // Find ALL users with excess sinh_vien assignments today
        const users = await db.all(`
            SELECT a.user_id, u.username, u.full_name, COUNT(*) as cnt, 
                   tam.daily_quota as member_quota
            FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            JOIN telesale_sources s ON s.id = d.source_id
            JOIN users u ON u.id = a.user_id
            LEFT JOIN telesale_active_members tam ON tam.user_id = a.user_id AND tam.crm_type = 'sinh_vien'
            WHERE a.assigned_date = $1 AND s.crm_type = 'sinh_vien'
            GROUP BY a.user_id, u.username, u.full_name, tam.daily_quota
            HAVING COUNT(*) > $2
        `, [today, correctQuota]);

        if (users.length === 0) {
            console.log('No users with excess assignments!');
        }

        for (const user of users) {
            const excess = user.cnt - correctQuota;
            console.log(`\n${user.username} (${user.full_name}): ${user.cnt} assigned, excess: ${excess}, member_quota: ${user.member_quota}`);
            
            // Fix member quota to NULL if set
            if (user.member_quota !== null) {
                await db.run("UPDATE telesale_active_members SET daily_quota = NULL WHERE user_id = $1 AND crm_type = 'sinh_vien'", [user.user_id]);
                console.log(`  → Fixed member quota to NULL`);
            }

            // Remove excess pending assignments
            const toRemove = await db.all(`
                SELECT a.id as assignment_id, a.data_id
                FROM telesale_assignments a
                JOIN telesale_data d ON d.id = a.data_id
                JOIN telesale_sources s ON s.id = d.source_id
                WHERE a.user_id = $1 AND a.assigned_date = $2 AND s.crm_type = 'sinh_vien'
                AND a.call_status = 'pending'
                ORDER BY a.id DESC
                LIMIT $3
            `, [user.user_id, today, excess]);

            for (const r of toRemove) {
                await db.run('DELETE FROM telesale_assignments WHERE id = $1', [r.assignment_id]);
                await db.run("UPDATE telesale_data SET status = 'available', last_assigned_user_id = NULL, last_assigned_date = NULL WHERE id = $1", [r.data_id]);
            }
            console.log(`  → Removed ${toRemove.length} excess`);
        }

        // Final check: all users today
        const summary = await db.all(`
            SELECT a.user_id, u.username, COUNT(*) as total
            FROM telesale_assignments a
            JOIN users u ON u.id = a.user_id
            WHERE a.assigned_date = $1
            GROUP BY a.user_id, u.username
            ORDER BY u.username
        `, [today]);
        console.log('\n=== Final counts ===');
        summary.forEach(r => console.log(`  ${r.username}: ${r.total}`));

    } catch(e) { console.error(e); }
    process.exit();
}, 500);
