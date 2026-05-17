/**
 * Re-sync access_blocked_reason cho nhanvien10 (user 52)
 * từ ledger mới nhất (đã backfill)
 */
const db = require('./db/pool');

(async () => {
    try { await db.initialize?.() || await db._ensurePool?.(); } catch(e) {}

    const nvId = 52;
    const blockTargetDate = '2026-05-16'; // ngày phạt = ngày hôm qua

    // 1. Đọc ledger mới nhất cho ngày 16/05
    const ledgerRows = await db.all(
        `SELECT task_name, penalty_date::text as task_date, penalty_amount, penalty_reason
         FROM daily_penalty_ledger WHERE user_id = $1 AND penalty_date = $2::date
         ORDER BY source_type, id`,
        [nvId, blockTargetDate]
    );

    console.log('=== Ledger entries cho nhanvien10 ngày 16/05 ===');
    ledgerRows.forEach((r, i) => console.log(`  ${i+1}. ${r.task_name} — ${r.penalty_amount.toLocaleString()}đ`));
    const total = ledgerRows.reduce((s, r) => s + r.penalty_amount, 0);
    console.log(`Total: ${total.toLocaleString()}đ (${ledgerRows.length} entries)`);

    // 2. Build penalties array (giống format access block)
    const penalties = ledgerRows.map(r => ({
        task_name: r.task_name,
        task_date: r.task_date,
        penalty_amount: r.penalty_amount,
        penalty_reason: r.penalty_reason
    }));

    // 3. Cập nhật access_blocked_reason
    await db.run(
        `UPDATE users SET access_blocked_reason = $2 WHERE id = $1`,
        [nvId, JSON.stringify(penalties)]
    );

    console.log(`\n✅ Đã cập nhật access_blocked_reason cho nhanvien10 (${penalties.length} entries, ${total.toLocaleString()}đ)`);

    // Verify
    const verify = await db.get('SELECT access_blocked, access_blocked_reason FROM users WHERE id = $1', [nvId]);
    console.log(`\n=== Verify ===`);
    console.log(`blocked: ${verify.access_blocked}`);
    const items = JSON.parse(verify.access_blocked_reason || '[]');
    items.forEach((p, i) => console.log(`  ${i+1}. ${p.task_name} — ${p.penalty_amount.toLocaleString()}đ`));
    console.log(`Total items: ${items.length}, Total amount: ${items.reduce((s,p) => s + p.penalty_amount, 0).toLocaleString()}đ`);

    process.exit(0);
})();
