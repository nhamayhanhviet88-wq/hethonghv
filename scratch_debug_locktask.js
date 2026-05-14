const db = require('./db/pool');
(async () => {
    // Check task 21 (Đăng Bản Thân) for user 52 (nhanvien10) — verify stacking is now individual records
    const records = await db.all(`
        SELECT id, completion_date::text as d, redo_count, status, penalty_amount, content
        FROM lock_task_completions 
        WHERE lock_task_id = 21 AND user_id = 52
        ORDER BY completion_date, redo_count
    `);
    
    console.log('=== Task 21 (Đăng Bản Thân) - User 52 (nhanvien10) ===\n');
    let total = 0;
    for (const r of records) {
        const type = r.redo_count === 0 ? 'GỐC   ' : r.redo_count <= -2 ? 'CHỒNG ' : `redo=${r.redo_count}`;
        console.log(`  ${r.d} | ${type} | redo=${r.redo_count} | ${r.penalty_amount}đ | ${(r.content||'không nộp BC').substring(0,70)}`);
        total += r.penalty_amount;
    }
    console.log(`\n  TỔNG: ${total.toLocaleString()}đ (${records.length} records)`);
    
    process.exit(0);
})();
