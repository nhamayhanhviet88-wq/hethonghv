const db = require('./db/pool');
(async () => {
    // Fix Sedding 14/5 for user 52 — only has 1/2 entries, should be 'pending' not 'approved'
    const res = await db.run(`
        UPDATE lock_task_completions 
        SET status = 'pending', penalty_applied = false
        WHERE lock_task_id = 20 AND user_id = 52 AND completion_date = '2026-05-14' AND redo_count = 0 AND status = 'approved'
    `);
    console.log(`Fixed Sedding 14/5: ${res.rowCount} record(s) → pending`);
    
    // Also check: are there other wrongly-approved completions where entryCount < min_quantity?
    console.log('\n=== Checking ALL auto-approved lock completions with insufficient entries ===');
    const allAutoApproved = await db.all(`
        SELECT ltc.id, ltc.lock_task_id, lt.task_name, lt.min_quantity, ltc.user_id, u.full_name,
               ltc.completion_date::text as d, ltc.status, ltc.content
        FROM lock_task_completions ltc
        JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
        JOIN users u ON u.id = ltc.user_id
        WHERE ltc.status = 'approved' AND ltc.content LIKE '[Tự động]%' AND ltc.redo_count = 0
          AND lt.min_quantity > 1
        ORDER BY ltc.completion_date DESC
    `);
    
    for (const r of allAutoApproved) {
        // Count actual entries
        const moduleMap = {
            'sedding': 'sedding', 'bản thân': 'dang_banthan_sp', 'zalo': 'tim_gr_zalo',
            'video': 'dang_video', 'content': 'dang_content', 'group': 'dang_group',
            'add': 'addcmt', 'tuyển dụng': 'tuyen_dung'
        };
        let modType = null;
        const lower = r.task_name.toLowerCase();
        for (const [key, val] of Object.entries(moduleMap)) {
            if (lower.includes(key)) { modType = val; break; }
        }
        if (!modType) continue;
        
        const cnt = await db.get(
            'SELECT COUNT(*) as c FROM daily_link_entries WHERE user_id = $1 AND entry_date = $2 AND module_type = $3',
            [r.user_id, r.d, modType]
        );
        const entryCount = parseInt(cnt?.c || 0);
        
        if (entryCount < r.min_quantity) {
            console.log(`  ❌ WRONG: ${r.full_name} | ${r.task_name} | ${r.d} | entries=${entryCount}/${r.min_quantity} | status=approved → should be pending`);
            await db.run(`UPDATE lock_task_completions SET status = 'pending' WHERE id = $1`, [r.id]);
            console.log(`     → Fixed to pending`);
        } else {
            console.log(`  ✅ OK: ${r.full_name} | ${r.task_name} | ${r.d} | entries=${entryCount}/${r.min_quantity}`);
        }
    }
    
    process.exit(0);
})();
