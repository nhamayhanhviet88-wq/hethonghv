const db = require('./db/pool');
setTimeout(async () => {
    // Check ALL lock_task_completions for nhanvien
    const all = await db.all(
        `SELECT ltc.id, ltc.user_id, u.username, lt.task_name, ltc.completion_date::text as task_date, ltc.status, ltc.penalty_applied, ltc.penalty_amount, ltc.redo_count
         FROM lock_task_completions ltc
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         JOIN users u ON u.id = ltc.user_id
         WHERE u.username = 'nhanvien'
         ORDER BY ltc.completion_date DESC`
    );
    console.log(`nhanvien — ${all.length} total lock_task_completions:`);
    all.forEach(r => console.log(`  ${r.task_date} | ${r.task_name} | status=${r.status} | redo=${r.redo_count} | penalty=${r.penalty_applied} | amt=${r.penalty_amount}`));
    
    process.exit();
}, 500);
