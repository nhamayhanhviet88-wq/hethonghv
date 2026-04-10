const db = require('./db/pool');
setTimeout(async () => {
    // Check all lock_task_completions with redo/rejected status
    const lockRedo = await db.all(
        `SELECT ltc.id, ltc.user_id, u.username, lt.task_name, ltc.completion_date::text as d, ltc.status, ltc.redo_count, ltc.penalty_applied, ltc.penalty_amount
         FROM lock_task_completions ltc
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         JOIN users u ON u.id = ltc.user_id
         WHERE ltc.status IN ('redo', 'rejected') AND ltc.completion_date < CURRENT_DATE
         ORDER BY ltc.completion_date DESC`
    );
    console.log(`Lock tasks redo/rejected (past): ${lockRedo.length} records`);
    lockRedo.forEach(r => console.log(`  ${r.username} | ${r.task_name} | ${r.d} | status=${r.status} | redo=${r.redo_count} | penalty=${r.penalty_applied} | amt=${r.penalty_amount}`));

    // Check chain_task_completions with redo/rejected
    let chainRedo = [];
    try {
        chainRedo = await db.all(
            `SELECT cc.id, cc.user_id, u.username, ci.task_name, ci.deadline::text as d, cc.status, cc.penalty_applied, cc.penalty_amount
             FROM chain_task_completions cc
             JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
             JOIN users u ON u.id = cc.user_id
             WHERE cc.status IN ('redo', 'rejected') AND ci.deadline < CURRENT_DATE
             ORDER BY ci.deadline DESC`
        );
    } catch(e) { console.log('Chain table error:', e.message); }
    console.log(`\nChain tasks redo/rejected (past): ${chainRedo.length} records`);
    chainRedo.forEach(r => console.log(`  ${r.username} | ${r.task_name} | ${r.d} | status=${r.status} | penalty=${r.penalty_applied} | amt=${r.penalty_amount}`));

    // Also check all distinct statuses
    const statuses = await db.all("SELECT status, COUNT(*) as cnt FROM lock_task_completions GROUP BY status");
    console.log('\nAll lock_task_completions statuses:');
    statuses.forEach(s => console.log(`  ${s.status}: ${s.cnt}`));

    process.exit();
}, 500);
