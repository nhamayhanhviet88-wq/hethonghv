const db = require('./db/pool');
(async () => {
    // Fix ALL lock_task_completions with stale quantity_done
    // For auto-injected tasks, sync quantity_done with actual daily_link_entries count
    const moduleMap = {
        'sedding': 'sedding', 'bản thân': 'dang_banthan_sp', 'zalo spam': 'tim_gr_zalo',
        'video': 'dang_video', 'content': 'dang_content', 'group': 'dang_group',
        'add/cmt': 'addcmt', 'add cmt': 'addcmt', 'tuyển dụng': 'tuyen_dung'
    };

    const records = await db.all(`
        SELECT ltc.id, ltc.lock_task_id, lt.task_name, lt.min_quantity, ltc.user_id,
               ltc.completion_date::text as d, ltc.quantity_done, ltc.status
        FROM lock_task_completions ltc
        JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
        WHERE ltc.content LIKE '[Tự động]%' AND ltc.redo_count = 0
        ORDER BY ltc.completion_date DESC
    `);

    let fixed = 0;
    for (const r of records) {
        const lower = r.task_name.toLowerCase();
        let modType = null;
        for (const [key, val] of Object.entries(moduleMap)) {
            if (lower.includes(key)) { modType = val; break; }
        }
        if (!modType) continue;

        const cnt = await db.get(
            'SELECT COUNT(*) as c FROM daily_link_entries WHERE user_id = $1 AND entry_date = $2 AND module_type = $3',
            [r.user_id, r.d, modType]
        );
        const actual = parseInt(cnt?.c || 0);

        if (actual !== (r.quantity_done || 0)) {
            await db.run('UPDATE lock_task_completions SET quantity_done = $1 WHERE id = $2', [actual, r.id]);
            console.log(`Fixed: ${r.task_name} ${r.d} user=${r.user_id} qty: ${r.quantity_done || 0} → ${actual} (min=${r.min_quantity})`);
            fixed++;
        }
    }
    console.log(`\n✅ Fixed ${fixed} records`);
    process.exit(0);
})();
