const db = require('./db/pool');
setTimeout(async () => {
    // Check nhanvien April data specifically
    const april = await db.all(
        `SELECT ltc.completion_date::text as d, lt.task_name, ltc.status, ltc.penalty_applied, ltc.penalty_amount
         FROM lock_task_completions ltc
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         WHERE ltc.user_id = (SELECT id FROM users WHERE username = 'nhanvien')
           AND ltc.completion_date >= '2026-04-01' AND ltc.completion_date <= '2026-04-09'
         ORDER BY ltc.completion_date`
    );
    console.log('nhanvien — Tháng 4/2026 CV Khóa:');
    april.forEach(r => console.log(`  ${r.d} | ${r.task_name.padEnd(25)} | status=${r.status.padEnd(10)} | penalty=${r.penalty_applied} | amt=${r.penalty_amount}`));
    console.log(`  Tổng: ${april.length} records`);
    
    // Also check what tasks are assigned to nhanvien
    const tasks = await db.all(
        `SELECT lt.id, lt.task_name, lt.frequency FROM lock_tasks lt
         JOIN lock_task_assignments lta ON lta.lock_task_id = lt.id
         WHERE lta.user_id = (SELECT id FROM users WHERE username = 'nhanvien')
         ORDER BY lt.task_name`
    );
    console.log('\nnhanvien — Assigned lock tasks:');
    tasks.forEach(t => console.log(`  id=${t.id} | ${t.task_name} | freq=${t.frequency}`));
    
    process.exit();
}, 500);
