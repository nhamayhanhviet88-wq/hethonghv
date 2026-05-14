const db = require('./db/pool');
(async () => {
    await db.run(`DELETE FROM lock_task_completions WHERE lock_task_id = 20 AND user_id = 52 AND completion_date = '2026-05-14' AND redo_count = 0 AND status = 'pending'`);
    console.log('✅ Deleted Sedding 14/5 pending record');
    // Also clean 25/4
    await db.run(`DELETE FROM lock_task_completions WHERE lock_task_id = 20 AND user_id = 2 AND completion_date = '2026-04-25' AND redo_count = 0 AND status = 'pending'`);
    console.log('✅ Deleted Sedding 25/4 pending record');
    process.exit(0);
})();
