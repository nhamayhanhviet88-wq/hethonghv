const db = require('./db/pool');
setTimeout(async () => {
    // Check lock_task_completions with redo status
    const redo = await db.all(
        "SELECT ltc.user_id, u.username, lt.task_name, ltc.completion_date::text, ltc.status, ltc.redo_count, ltc.penalty_applied, ltc.penalty_amount FROM lock_task_completions ltc JOIN lock_tasks lt ON lt.id = ltc.lock_task_id JOIN users u ON u.id = ltc.user_id WHERE ltc.completion_date >= '2026-04-08' ORDER BY ltc.completion_date, ltc.user_id"
    );
    console.log('All lock completions (04/08+):');
    redo.forEach(r => console.log(`  ${r.username} | ${r.task_name} | ${r.completion_date} | status=${r.status} | redo=${r.redo_count} | penalty=${r.penalty_applied} | amt=${r.penalty_amount}`));

    // Check chain_task_completions
    const chains = await db.all(
        "SELECT cc.user_id, u.username, ci.task_name, ci.deadline::text, cc.status, cc.penalty_applied, cc.penalty_amount FROM chain_task_completions cc JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id JOIN users u ON u.id = cc.user_id WHERE ci.deadline >= '2026-04-08' ORDER BY ci.deadline"
    );
    console.log('\nAll chain completions (04/08+):');
    chains.forEach(r => console.log(`  ${r.username} | ${r.task_name} | ${r.deadline} | status=${r.status} | penalty=${r.penalty_applied} | amt=${r.penalty_amount}`));
    
    // Check task_support_requests
    const support = await db.all(
        "SELECT sr.manager_id, m.username, sr.task_name, sr.task_date::text, sr.status, sr.penalty_amount FROM task_support_requests sr LEFT JOIN users m ON sr.manager_id = m.id WHERE sr.task_date >= '2026-04-08' ORDER BY sr.task_date"
    );
    console.log('\nAll support requests (04/08+):');
    support.forEach(r => console.log(`  ${r.username} | ${r.task_name} | ${r.task_date} | status=${r.status} | amt=${r.penalty_amount}`));

    process.exit();
}, 500);
