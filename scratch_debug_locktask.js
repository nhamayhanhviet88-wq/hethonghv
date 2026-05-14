const db = require('./db/pool');
(async () => {
    // User 52 (nhanvien10):
    // - account created: 2026-05-11
    // - department_joined_at: 2026-05-11
    // - Has completions for task 20 since 2026-05-12
    // - Current assigned_at: 2026-05-14 (wrong!)
    // → Should be 2026-05-11 (match dept joined date)
    
    // User 57 (Đỗ Doanh):
    // - account created: 2026-05-14
    // - department_joined_at: 2026-05-14
    // - Assigned_at: 2026-05-14 → OK, but let's match dept join
    
    // Fix: update assigned_at to match earliest of (dept_joined_at, earliest_completion_date, current assigned_at)
    
    const tasks = [20, 25]; // Sedding & Thông Báo Zalo
    
    for (const taskId of tasks) {
        const assignments = await db.all(
            'SELECT lta.user_id, lta.created_at as assigned_at FROM lock_task_assignments lta WHERE lta.lock_task_id = $1',
            [taskId]
        );
        
        for (const a of assignments) {
            // Find earliest completion date
            const earliest = await db.get(
                'SELECT MIN(completion_date)::text as d FROM lock_task_completions WHERE lock_task_id = $1 AND user_id = $2',
                [taskId, a.user_id]
            );
            
            // Find dept joined date
            const user = await db.get('SELECT department_joined_at FROM users WHERE id = $1', [a.user_id]);
            
            const dates = [];
            if (earliest?.d) dates.push(new Date(earliest.d + 'T00:00:00Z'));
            if (user?.department_joined_at) dates.push(new Date(user.department_joined_at));
            if (a.assigned_at) dates.push(new Date(a.assigned_at));
            
            if (dates.length > 0) {
                const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
                const currentAssigned = new Date(a.assigned_at);
                
                if (earliestDate < currentAssigned) {
                    // Update to earliest
                    await db.run(
                        'UPDATE lock_task_assignments SET created_at = $1 WHERE lock_task_id = $2 AND user_id = $3',
                        [earliestDate.toISOString(), taskId, a.user_id]
                    );
                    console.log(`✅ Task ${taskId}, user ${a.user_id}: ${currentAssigned.toISOString()} → ${earliestDate.toISOString()}`);
                } else {
                    console.log(`⏭️ Task ${taskId}, user ${a.user_id}: already correct (${a.assigned_at})`);
                }
            }
        }
    }
    
    process.exit(0);
})();
