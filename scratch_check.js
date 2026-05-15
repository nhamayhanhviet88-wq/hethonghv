const db = require('./db/pool');
(async () => {
    // Delete wrong expired records created by buggy logic
    await db.run("DELETE FROM lock_task_completions WHERE id IN (28566, 28567)");
    console.log('Deleted wrong records 28566, 28567');

    // Delete wrong ledger entries
    await db.run("DELETE FROM daily_penalty_ledger WHERE source_ref_id IN ('ltc_28566', 'ltc_28567')");
    console.log('Deleted wrong ledger entries');

    // Also check and clean ngày 12, 14 if over-created
    const extras12 = await db.all(
        `SELECT id, redo_count FROM lock_task_completions 
         WHERE lock_task_id = 20 AND user_id = 52 AND completion_date IN ('2026-05-12','2026-05-14')
         AND redo_count NOT IN (0, -1, -2) AND status = 'expired'`
    );
    if (extras12.length > 0) {
        console.log('Extra records for 12/14:', extras12.map(r => `id=${r.id} redo=${r.redo_count}`));
        for (const r of extras12) {
            await db.run("DELETE FROM lock_task_completions WHERE id = $1", [r.id]);
            await db.run("DELETE FROM daily_penalty_ledger WHERE source_ref_id = $1", ['ltc_' + r.id]);
        }
        console.log('Cleaned extra records');
    }

    // Reset GĐ popup date
    await db.run("UPDATE users SET penalty_mgr_popup_date = NULL WHERE role = 'giam_doc'");
    console.log('Reset GĐ popup');

    process.exit();
})();
