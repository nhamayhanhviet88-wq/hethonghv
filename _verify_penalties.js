const db = require('./db/pool');
setTimeout(async () => {
    // Verify: all statuses now
    const statuses = await db.all("SELECT status, COUNT(*) as cnt, SUM(penalty_amount) as total FROM lock_task_completions GROUP BY status");
    console.log('Lock task statuses:');
    statuses.forEach(s => console.log(`  ${s.status}: ${s.cnt} records, total=${s.total}đ`));
    
    // Check April penalties breakdown
    const april = await db.all(
        `SELECT ltc.completion_date::text as d, COUNT(*) as cnt, SUM(ltc.penalty_amount) as total
         FROM lock_task_completions ltc
         WHERE ltc.status = 'expired' AND ltc.penalty_applied = true
           AND ltc.completion_date >= '2026-04-01' AND ltc.completion_date <= '2026-04-09'
         GROUP BY ltc.completion_date ORDER BY ltc.completion_date`
    );
    console.log('\nApril penalties by date:');
    april.forEach(r => console.log(`  ${r.d}: ${r.cnt} penalties, ${r.total}đ`));
    
    // Summary for "Hôm qua" (04/08)
    const hq = april.find(r => r.d === '2026-04-08');
    console.log(`\nHôm qua (04/08): ${hq ? hq.cnt + ' penalties, ' + hq.total + 'đ' : 'không có'}`);
    
    // Summary for "7 ngày" (04/03 - 04/09)
    const d7 = april.filter(r => r.d >= '2026-04-03');
    const d7total = d7.reduce((s, r) => s + Number(r.total), 0);
    const d7cnt = d7.reduce((s, r) => s + Number(r.cnt), 0);
    console.log(`7 ngày (04/03-04/09): ${d7cnt} penalties, ${d7total}đ`);
    
    // Summary for "Tháng này"
    const mTotal = april.reduce((s, r) => s + Number(r.total), 0);
    const mCnt = april.reduce((s, r) => s + Number(r.cnt), 0);
    console.log(`Tháng 4: ${mCnt} penalties, ${mTotal}đ`);
    
    process.exit();
}, 500);
