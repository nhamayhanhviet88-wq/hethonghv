const db = require('./db/pool');
(async () => {
    try {
        // 1. Check the actual record
        const record = await db.all(
            `SELECT ltc.id, ltc.lock_task_id, lt.task_name, 
                    ltc.completion_date::text as date, ltc.status, 
                    ltc.penalty_applied, ltc.penalty_amount,
                    ltc.redo_count, ltc.created_at::text as created_at,
                    lt.penalty_amount as task_penalty_amount
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.user_id = 6 AND lt.task_name = 'Lặp lại 29 hàng tháng'
             ORDER BY ltc.completion_date DESC`,
            []
        );
        console.log('=== "Lặp lại 29 hàng tháng" records ===');
        record.forEach(r => {
            console.log(`  id=${r.id} | date=${r.date} | status=${r.status} | penalty_applied=${r.penalty_applied} | DB_penalty=${r.penalty_amount}đ | task_config=${r.task_penalty_amount}đ | redo=${r.redo_count} | created=${r.created_at}`);
        });

        // 2. Check the task config
        const task = await db.get('SELECT * FROM lock_tasks WHERE id = 5');
        console.log('\n=== Task config (id=5) ===');
        console.log(JSON.stringify(task, null, 2));

        // 3. Check global penalty config
        const gpc = await db.all('SELECT * FROM global_penalty_config');
        console.log('\n=== Global penalty config ===');
        gpc.forEach(g => console.log(`  ${g.key} = ${g.amount}đ (${g.label})`));

        // 4. Check all lock_tasks penalty_amount column
        const allTasks = await db.all('SELECT id, task_name, penalty_amount FROM lock_tasks ORDER BY id');
        console.log('\n=== All lock_tasks penalty_amount ===');
        allTasks.forEach(t => console.log(`  id=${t.id}: ${t.task_name} → penalty_amount=${t.penalty_amount}đ`));

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
