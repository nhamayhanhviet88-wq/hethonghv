const db = require('./db/pool');
setTimeout(async () => {
    // Check nhanvien 08/04 penalties (both regular and stacked)
    const res = await db.all(
        `SELECT ltc.completion_date::text as d, lt.task_name, ltc.redo_count, ltc.penalty_amount, ltc.content
         FROM lock_task_completions ltc
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         WHERE ltc.user_id = (SELECT id FROM users WHERE username = 'nhanvien')
           AND ltc.completion_date = '2026-04-08'
           AND ltc.status = 'expired' AND ltc.penalty_applied = true
         ORDER BY ltc.redo_count, lt.task_name`
    );
    console.log(`nhanvien - Penalties ngày 08/04: ${res.length} records`);
    res.forEach(r => {
        const type = r.redo_count === -2 ? '🔄CHỒNG' : r.redo_count === -1 ? '👔QL' : '⚠️GỐC';
        console.log(`  ${type} | ${r.task_name} | ${r.penalty_amount}đ | ${r.content || ''}`);
    });
    
    const total = res.reduce((s, r) => s + Number(r.penalty_amount), 0);
    console.log(`  TỔNG: ${total.toLocaleString()}đ`);
    
    // Also check "Hôm qua" total for all users
    const allHq = await db.all(
        `SELECT u.username, COUNT(*) as cnt, SUM(ltc.penalty_amount) as total
         FROM lock_task_completions ltc
         JOIN users u ON u.id = ltc.user_id
         WHERE ltc.completion_date = '2026-04-08' AND ltc.status = 'expired' AND ltc.penalty_applied = true
         GROUP BY u.username ORDER BY total DESC`
    );
    console.log('\nTất cả users - Penalties ngày 08/04 (Hôm qua):');
    let grandTotal = 0;
    allHq.forEach(r => { console.log(`  ${r.username}: ${r.cnt} lần, ${Number(r.total).toLocaleString()}đ`); grandTotal += Number(r.total); });
    console.log(`  TỔNG CỘng: ${grandTotal.toLocaleString()}đ`);
    
    process.exit();
}, 500);
