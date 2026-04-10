const db = require('./db/pool');
setTimeout(async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    console.log('Today:', todayStr);
    
    // Check lock task completions
    const locks = await db.all(
        "SELECT ltc.user_id, u.username, lt.task_name, ltc.completion_date::text as task_date, ltc.penalty_amount, ltc.status FROM lock_task_completions ltc JOIN lock_tasks lt ON lt.id = ltc.lock_task_id JOIN users u ON u.id = ltc.user_id WHERE ltc.status = 'expired' AND ltc.penalty_applied = true ORDER BY ltc.completion_date DESC LIMIT 10"
    );
    console.log('Lock penalties (latest 10):', JSON.stringify(locks, null, 2));
    
    // Check support requests
    const srs = await db.all(
        "SELECT sr.manager_id, m.username, sr.task_name, sr.task_date::text, sr.penalty_amount, sr.status FROM task_support_requests sr LEFT JOIN users m ON sr.manager_id = m.id WHERE sr.status = 'expired' ORDER BY sr.task_date DESC LIMIT 10"
    );
    console.log('Support penalties (latest 10):', JSON.stringify(srs, null, 2));
    
    process.exit();
}, 500);
