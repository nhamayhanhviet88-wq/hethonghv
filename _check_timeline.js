const db = require('./db/pool');
(async () => {
    try {
        // Check task config 
        const task = await db.get('SELECT id, task_name, recurrence_type, recurrence_value, created_at::text FROM lock_tasks WHERE id = 5');
        console.log('=== Task "Lặp lại 29 hàng tháng" ===');
        console.log(JSON.stringify(task, null, 2));
        console.log(`\nrecurrence_value = "${task.recurrence_value}"`);
        console.log(`→ Hệ thống check: checkDate.getDate() === ${Number(task.recurrence_value)}`);
        console.log(`→ Nghĩa là task chỉ áp dụng vào NGÀY ${task.recurrence_value} hàng tháng`);
        
        // Check which date it would have matched
        console.log('\n=== Kiểm tra ngày nào match ===');
        for (let d = 1; d <= 8; d++) {
            const date = new Date(`2026-04-${String(d).padStart(2,'0')}T00:00:00`);
            const dayOfMonth = date.getDate();
            const dow = date.getDay();
            const isSunday = dow === 0;
            const applies = dayOfMonth === Number(task.recurrence_value) && !isSunday;
            console.log(`  ${d}/04: dayOfMonth=${dayOfMonth} | dow=${dow}(${['CN','T2','T3','T4','T5','T6','T7'][dow]}) | sunday=${isSunday} | applies=${applies}`);
        }

        // Task was created on 2026-04-01 09:04:52
        // Deadline checker runs at 00:15
        console.log('\n=== Timeline ===');
        console.log('Task created: 2026-04-01 09:04:52 (sau 00:15 → deadline-checker ĐÃ CHẠY ngày 01/04)');
        console.log('Deadline checker runs at 00:15 daily, checks daysBack = 1-90');
        console.log('');
        console.log('02/04 00:15: checker checks 01/04 (daysBack=1)');
        console.log('  → checkDate.getDate() = 1');
        console.log('  → recurrence_value = 1');
        console.log('  → 1 === 1 → applies = TRUE');
        console.log('  → BUT: was the task ALREADY created before the check?');
        console.log(`  → Task created: ${task.created_at}`);
        
        // Check if task was created AFTER 00:15 on 04/01
        const createdAt = new Date(task.created_at);
        console.log(`  → Created at hour: ${createdAt.getHours()}:${String(createdAt.getMinutes()).padStart(2,'0')}`);
        console.log(`  → Task created at ${createdAt.toISOString()} - AFTER 00:15 on 01/04`);
        console.log('  → So on 02/04 00:15, the task EXISTS and assignment should match');
        
        // Check lock_task_assignments
        const assignments = await db.all(
            'SELECT * FROM lock_task_assignments WHERE lock_task_id = 5'
        );
        console.log(`\n=== Assignments for task 5 === (${assignments.length})`);
        assignments.forEach(a => console.log(`  user_id=${a.user_id}`));
        
        // Check if user 6 is assigned
        const hasUser6 = assignments.some(a => a.user_id === 6);
        console.log(`\ntruongphong2 (id=6) assigned: ${hasUser6}`);

        // IMPORTANT: created_at = 2026-04-04 00:15:29 is the COMPLETION record's created_at
        // NOT the task's created_at
        const taskCreated = new Date(task.created_at);
        console.log(`\n=== KEY FINDING ===`);
        console.log(`Task (lock_tasks) created: ${task.created_at}`);
        console.log(`Expired record (lock_task_completions) created: 2026-04-04 00:15:29`);
        console.log('→ The TASK existed since 01/04, but the expired RECORD was only created on 04/04');
        console.log('→ This means the deadline checker MISSED it on 02/04 and 03/04');
        
        // Check: was there a server restart or was the checker not running?
        // Check other records created around 02/04 and 03/04
        const records0204 = await db.all(
            `SELECT ltc.id, lt.task_name, ltc.user_id, ltc.completion_date::text as date, 
                    ltc.status, ltc.created_at::text as created_at
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.created_at >= '2026-04-02' AND ltc.created_at < '2026-04-04'
             ORDER BY ltc.created_at`
        );
        console.log(`\n=== Records created between 02/04 and 04/04 === (${records0204.length})`);
        records0204.forEach(r => console.log(`  ${r.created_at} | user=${r.user_id} | ${r.task_name} | date=${r.date} | status=${r.status}`));

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
