const db = require('./db/pool');
(async () => {
    try {
        // 1. Check the exact record with updated_at
        const record = await db.get(
            `SELECT ltc.id, ltc.completion_date::text as date, ltc.status, 
                    ltc.penalty_amount, ltc.penalty_applied,
                    ltc.created_at::text as created_at,
                    ltc.updated_at::text as updated_at,
                    ltc.redo_count
             FROM lock_task_completions ltc
             WHERE ltc.user_id = 6 AND ltc.lock_task_id = 5
             ORDER BY ltc.completion_date DESC LIMIT 1`
        );
        console.log('=== Record detail ===');
        console.log(JSON.stringify(record, null, 2));

        // 2. Check if server deadline-checker ran on 7/4 and 8/4
        // Look at other penalties that DID stack on those days
        const allExpired = await db.all(
            `SELECT ltc.id, lt.task_name, ltc.completion_date::text as date,
                    ltc.penalty_amount, ltc.updated_at::text as updated_at,
                    ltc.user_id
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.status = 'expired' AND ltc.penalty_applied = true
               AND ltc.updated_at >= '2026-04-07' AND ltc.updated_at < '2026-04-09'
             ORDER BY ltc.updated_at DESC`
        );
        console.log(`\n=== All stacked penalties on 7/4 and 8/4 === (${allExpired.length} records)`);
        allExpired.forEach(r => {
            console.log(`  updated=${r.updated_at} | user=${r.user_id} | ${r.task_name} | date=${r.date} | amount=${r.penalty_amount}đ`);
        });

        // 3. Check holidays for 7/4 and 8/4
        const holidays = await db.all(
            `SELECT holiday_date::text, holiday_name FROM holidays 
             WHERE holiday_date >= '2026-04-06' AND holiday_date <= '2026-04-08'`
        );
        console.log('\n=== Holidays 6-8 April ===');
        console.log(holidays.length > 0 ? JSON.stringify(holidays) : 'No holidays');

        // 4. Check leave for user 6 on 7/4, 8/4
        const leaves = await db.all(
            `SELECT * FROM employee_leave_requests 
             WHERE user_id = 6 AND status = 'approved'
               AND leave_date >= '2026-04-06' AND leave_date <= '2026-04-08'`
        );
        console.log('\n=== Leave requests user=6 on 6-8 April ===');
        console.log(leaves.length > 0 ? JSON.stringify(leaves) : 'No leaves');

        // 5. Check the stacking condition more carefully
        // The condition is: completion_date >= 90daysAgo AND completion_date < yesterday
        // On 07/04: yesterday = 06/04 → completion_date(01/04) < 06/04 ✅ should work
        // On 08/04: yesterday = 07/04 → completion_date(01/04) < 07/04 ✅ should work
        
        // 6. Check if the deadline checker time window matters
        // It only runs at 00:15-00:30
        console.log('\n=== Checking deadline checker run window ===');
        console.log('Phạt chồng chỉ chạy lúc 00:15-00:30');
        console.log('→ Nếu server restart/down lúc đó → miss stacking');
        
        // 7. Check updated_at to determine WHEN the last stack happened
        console.log(`\n=== Last updated_at for the "Lặp lại 29" record ===`);
        console.log(`  updated_at: ${record?.updated_at}`);
        if (record?.updated_at) {
            const dt = new Date(record.updated_at);
            console.log(`  → Last stacking happened on: ${dt.toISOString().split('T')[0]}`);
            console.log(`  → Time: ${dt.toISOString().split('T')[1]}`);
        }

        // 8. Double check: count how many 50k increments to reach 300k
        const increments = record?.penalty_amount / 50000;
        console.log(`\n=== Math check ===`);
        console.log(`  300,000 / 50,000 = ${increments} stacks`);
        console.log(`  If started 01/04: 01→02→03→04→05→06 = 6 stacking events`);
        console.log(`  Missing: 07/04 and 08/04 → should be 400,000đ`);

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
