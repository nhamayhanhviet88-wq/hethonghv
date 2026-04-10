const db = require('./db/pool');
(async () => {
    try {
        const userId = 6; // truongphong2

        // 1. Find the lock task "Lặp lại 29 hàng tháng"
        const tasks = await db.all(
            `SELECT id, task_name, department_id, recurrence_type, recurrence_value 
             FROM lock_tasks 
             WHERE task_name ILIKE '%29%' OR task_name ILIKE '%lặp lại%'
             ORDER BY id`
        );
        console.log('=== Lock tasks matching "29" or "lặp lại" ===');
        console.log(JSON.stringify(tasks, null, 2));

        // 2. All lock_task_completions for truongphong2 in April 2026
        const completions = await db.all(
            `SELECT ltc.id, ltc.lock_task_id, lt.task_name, 
                    ltc.completion_date::text as completion_date,
                    ltc.status, ltc.penalty_applied, ltc.penalty_amount,
                    ltc.acknowledged, ltc.redo_count, ltc.content,
                    ltc.created_at::text as created_at
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.user_id = $1 
               AND ltc.completion_date >= '2026-04-01'
               AND ltc.completion_date <= '2026-04-09'
             ORDER BY ltc.completion_date, lt.task_name, ltc.redo_count`,
            [userId]
        );
        console.log(`\n=== truongphong2 completions (April 1-9) === (${completions.length} records)`);
        completions.forEach(c => {
            const penalty = c.penalty_applied ? `⚠️ PHẠT ${c.penalty_amount}đ` : '✅ OK';
            const ack = c.acknowledged ? '(đã xác nhận)' : '';
            console.log(`  ${c.completion_date} | ${c.task_name} | status=${c.status} | redo=${c.redo_count} | ${penalty} ${ack}`);
        });

        // 3. Specifically check "Lặp lại 29" task
        const task29 = tasks.find(t => t.task_name.includes('29'));
        if (task29) {
            console.log(`\n=== Detail for task: "${task29.task_name}" (id=${task29.id}) ===`);
            const detail = await db.all(
                `SELECT ltc.id, ltc.completion_date::text as date, ltc.status, 
                        ltc.penalty_applied, ltc.penalty_amount, ltc.redo_count,
                        ltc.acknowledged, ltc.content,
                        ltc.created_at::text as created_at
                 FROM lock_task_completions ltc
                 WHERE ltc.user_id = $1 AND ltc.lock_task_id = $2
                   AND ltc.completion_date >= '2026-04-01'
                 ORDER BY ltc.completion_date, ltc.redo_count`,
                [userId, task29.id]
            );
            detail.forEach(d => {
                console.log(`  ${d.date} | status=${d.status} | redo=${d.redo_count} | penalty=${d.penalty_applied} (${d.penalty_amount}đ) | ack=${d.acknowledged} | content=${(d.content||'').substring(0,50)}`);
            });
        }

        // 4. Check penalty popup data (what my-pending API returns)
        const _gpcRows = await db.all('SELECT key, amount FROM global_penalty_config');
        const GPC = {};
        _gpcRows.forEach(r => { GPC[r.key] = Number(r.amount) || 0; });
        const todayPenaltyKhoa = GPC.cv_khoa_khong_nop || 50000;
        console.log(`\n=== Penalty config: cv_khoa_khong_nop = ${todayPenaltyKhoa}đ ===`);

        // 5. Check user status and department_joined_at
        const userInfo = await db.get(
            'SELECT id, full_name, status, department_joined_at::text as dept_joined FROM users WHERE id = $1', 
            [userId]
        );
        console.log(`\n=== User info ===`);
        console.log(`  ${userInfo.full_name} | status=${userInfo.status} | dept_joined=${userInfo.dept_joined}`);

        // 6. Simulate what my-pending returns (the penalty check)
        const deptJoinedAt = userInfo.dept_joined || null;
        const lockExpired = await db.all(
            `SELECT ltc.lock_task_id, lt.task_name, ltc.completion_date::text as task_date
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.user_id = $1 AND ltc.status = 'expired' AND ltc.penalty_applied = true
               AND ltc.redo_count >= 0 AND ltc.completion_date >= NOW() - INTERVAL '90 days'
               AND ($2::timestamp IS NULL OR ltc.completion_date >= $2::date)
             ORDER BY ltc.completion_date DESC`,
            [userId, deptJoinedAt]
        );
        
        console.log(`\n=== Expired penalties (before re-submit check) === (${lockExpired.length})`);
        const pending = [];
        for (const lp of lockExpired) {
            const resub = await db.get(
                `SELECT id FROM lock_task_completions
                 WHERE lock_task_id = $1 AND user_id = $2 AND completion_date::text = $3
                   AND status IN ('pending','approved') AND redo_count > 0`,
                [lp.lock_task_id, userId, lp.task_date]
            );
            const resubStatus = resub ? '✅ Đã nộp lại' : '❌ CHƯA nộp lại → PHẠT';
            console.log(`  ${lp.task_date} | ${lp.task_name} | ${resubStatus}`);
            if (!resub) pending.push(lp);
        }
        
        console.log(`\n=== TỔNG KẾT ===`);
        console.log(`  Tổng CV chưa nộp lại: ${pending.length}`);
        console.log(`  Tổng phạt: ${pending.length * todayPenaltyKhoa}đ`);
        pending.forEach(p => console.log(`  ❌ ${p.task_date} — ${p.task_name}`));

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message, e.stack);
        process.exit(1);
    }
})();
