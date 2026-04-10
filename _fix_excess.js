const db = require('./db/pool');
setTimeout(async () => {
    try {
        const tp1 = await db.get("SELECT id FROM users WHERE username = 'truongphong1'");
        const uid = tp1.id;
        const today = '2026-04-09';

        // Get source total quota for sinh_vien
        const srcQuota = await db.get(`
            SELECT SUM(daily_quota) as total_quota 
            FROM telesale_sources 
            WHERE crm_type = 'sinh_vien' AND is_active = true
        `);
        console.log('sinh_vien source total quota:', srcQuota.total_quota);

        // Current sinh_vien assignments
        const current = await db.get(`
            SELECT COUNT(*) as cnt FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            JOIN telesale_sources s ON s.id = d.source_id
            WHERE a.user_id = $1 AND a.assigned_date = $2 AND s.crm_type = 'sinh_vien'
        `, [uid, today]);
        console.log('Current sinh_vien assignments:', current.cnt);

        const excess = current.cnt - srcQuota.total_quota;
        console.log('Excess to remove:', excess);

        if (excess > 0) {
            // Get IDs of excess assignments (newest first - remove the extras)
            const toRemove = await db.all(`
                SELECT a.id as assignment_id, a.data_id
                FROM telesale_assignments a
                JOIN telesale_data d ON d.id = a.data_id
                JOIN telesale_sources s ON s.id = d.source_id
                WHERE a.user_id = $1 AND a.assigned_date = $2 AND s.crm_type = 'sinh_vien'
                AND a.call_status = 'pending'
                ORDER BY a.id DESC
                LIMIT $3
            `, [uid, today, excess]);

            console.log(`Removing ${toRemove.length} excess assignments...`);

            for (const r of toRemove) {
                // Delete assignment
                await db.run('DELETE FROM telesale_assignments WHERE id = $1', [r.assignment_id]);
                // Set data back to available
                await db.run("UPDATE telesale_data SET status = 'available', last_assigned_user_id = NULL, last_assigned_date = NULL WHERE id = $1", [r.data_id]);
            }

            // Verify
            const after = await db.get(`
                SELECT COUNT(*) as cnt FROM telesale_assignments a
                JOIN telesale_data d ON d.id = a.data_id
                JOIN telesale_sources s ON s.id = d.source_id
                WHERE a.user_id = $1 AND a.assigned_date = $2 AND s.crm_type = 'sinh_vien'
            `, [uid, today]);
            const total = await db.get(`
                SELECT COUNT(*) as cnt FROM telesale_assignments
                WHERE user_id = $1 AND assigned_date = $2
            `, [uid, today]);
            console.log(`After: sinh_vien = ${after.cnt}, total = ${total.cnt}`);
        }
    } catch(e) { console.error(e); }
    process.exit();
}, 500);
