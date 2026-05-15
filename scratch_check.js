const db = require('./db/pool');
(async () => {
    // Delete ALL extra Sedding records for user 52 (keep only originals)
    const keepIds = new Set([26640, 27050, 27051, 28287]);
    const allSedding = await db.all(
        `SELECT id, completion_date::text as d, redo_count FROM lock_task_completions WHERE lock_task_id = 20 AND user_id = 52`
    );
    for (const r of allSedding) {
        if (!keepIds.has(r.id)) {
            console.log(`  Deleting ltc id=${r.id} date=${r.d} redo=${r.redo_count}`);
            await db.run("DELETE FROM lock_task_completions WHERE id = $1", [r.id]);
            await db.run("DELETE FROM daily_penalty_ledger WHERE source_ref_id = $1", ['ltc_' + r.id]);
        }
    }

    // Force re-sync ledger for 15/05
    await db.run("DELETE FROM daily_penalty_ledger WHERE user_id = 52 AND penalty_date = '2026-05-15'");
    
    // Now we need to also ensure the manual Sedding entry is re-added
    const { writeLedger, syncLedgerForDate } = require('./utils/penaltyLedger');
    await syncLedgerForDate('2026-05-15');
    
    // Add the missing 2nd Sedding manually since ltc only has QL record
    await writeLedger(52, '2026-05-15', 'cv_khoa', 'ltc_manual_sedding_2', 
        'CV Khóa: Sedding Cộng Đồng & Lẫn Nhau', 50000, 'Không nộp CV Khóa (2/2)');

    // Verify
    const ledger = await db.all(
        `SELECT source_ref_id, penalty_amount, task_name FROM daily_penalty_ledger WHERE user_id = 52 AND penalty_date = '2026-05-15' ORDER BY id`
    );
    console.log('\nLedger 15/05:');
    ledger.forEach(r => console.log(`  ${r.source_ref_id} | ${r.penalty_amount} | ${r.task_name}`));
    console.log('Total:', ledger.reduce((s, r) => s + r.penalty_amount, 0));

    // Update access_blocked_reason directly
    const penalties = ledger.map(r => ({
        task_name: r.task_name,
        task_date: '2026-05-15',
        penalty_amount: r.penalty_amount,
        penalty_reason: 'Không nộp CV Khóa'
    }));
    await db.run(
        `UPDATE users SET access_blocked_reason = $1 WHERE id = 52`,
        [JSON.stringify(penalties)]
    );
    console.log('\nUpdated access_blocked_reason for user 52');

    // Reset popup
    await db.run("UPDATE users SET penalty_mgr_popup_date = NULL WHERE role = 'giam_doc'");

    process.exit();
})();
