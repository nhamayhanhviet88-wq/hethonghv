const db = require('./db/pool');
setTimeout(async () => {
    try {
        const today = '2026-04-09';
        const tp2 = await db.get("SELECT id FROM users WHERE username = 'truongphong2'");
        const uid = tp2.id;

        // Get correct quota for nuoi_duong
        const srcQuota = await db.get(`
            SELECT SUM(daily_quota) as total FROM telesale_sources 
            WHERE crm_type = 'nuoi_duong' AND is_active = true
        `);
        const correctQuota = parseInt(srcQuota.total);

        const current = await db.get(`
            SELECT COUNT(*) as cnt FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            JOIN telesale_sources s ON s.id = d.source_id
            WHERE a.user_id = $1 AND a.assigned_date = $2 AND s.crm_type = 'nuoi_duong'
        `, [uid, today]);

        const excess = parseInt(current.cnt) - correctQuota;
        console.log(`nuoi_duong: current=${current.cnt}, correct=${correctQuota}, excess=${excess}`);

        if (excess > 0) {
            const toRemove = await db.all(`
                SELECT a.id as assignment_id, a.data_id
                FROM telesale_assignments a
                JOIN telesale_data d ON d.id = a.data_id
                JOIN telesale_sources s ON s.id = d.source_id
                WHERE a.user_id = $1 AND a.assigned_date = $2 AND s.crm_type = 'nuoi_duong'
                AND a.call_status = 'pending'
                ORDER BY a.id DESC
                LIMIT $3
            `, [uid, today, excess]);

            for (const r of toRemove) {
                await db.run('DELETE FROM telesale_assignments WHERE id = $1', [r.assignment_id]);
                await db.run("UPDATE telesale_data SET status = 'available', last_assigned_user_id = NULL, last_assigned_date = NULL WHERE id = $1", [r.data_id]);
            }
            console.log(`Removed ${toRemove.length} excess`);
        }

        // Final
        const total = await db.get(`SELECT COUNT(*) as cnt FROM telesale_assignments WHERE user_id = $1 AND assigned_date = $2`, [uid, today]);
        console.log(`truongphong2 final total: ${total.cnt}`);

    } catch(e) { console.error(e); }
    process.exit();
}, 500);
