const db = require('./db/pool');
(async () => {
    const assigns = await db.all("SELECT la.user_id, u.full_name FROM lock_task_assignments la JOIN users u ON la.user_id = u.id WHERE la.lock_task_id = 25");
    console.log('Assignments for task 25:', assigns);
    
    // Check user zalo results
    for (const a of assigns) {
        const results = await db.all("SELECT r.id, r.spam_eligible, r.spam_not_eligible, r.pending_join, r.marked_at FROM zalo_task_results r JOIN zalo_daily_tasks t ON r.task_id = t.id WHERE t.user_id = $1", [a.user_id]);
        const unmarked = results.filter(r => !r.spam_eligible && !r.spam_not_eligible && !r.pending_join);
        console.log(`  User ${a.user_id} (${a.full_name}): ${results.length} total, ${unmarked.length} unmarked`);
    }
    process.exit(0);
})();
