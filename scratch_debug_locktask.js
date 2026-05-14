const db = require('./db/pool');
(async () => {
    // Get ALL active lock tasks and their assignments
    const allTasks = await db.all(`
        SELECT lt.id, lt.task_name, lt.recurrence_type, lt.recurrence_value, lt.created_at as task_created,
               lta.user_id, lta.created_at as assigned_at,
               u.full_name, u.department_joined_at, u.created_at as user_created
        FROM lock_task_assignments lta
        JOIN lock_tasks lt ON lt.id = lta.lock_task_id AND lt.is_active = true
        JOIN users u ON u.id = lta.user_id AND u.status = 'active'
        ORDER BY lt.id, lta.user_id
    `);

    console.log('=== ALL Active Lock Task Assignments ===\n');
    
    let fixCount = 0;
    
    for (const t of allTasks) {
        const assignedAt = new Date(t.assigned_at);
        const deptJoined = t.department_joined_at ? new Date(t.department_joined_at) : null;
        const userCreated = t.user_created ? new Date(t.user_created) : null;
        
        // Find earliest completion for this user+task
        const earliest = await db.get(
            'SELECT MIN(completion_date)::text as d FROM lock_task_completions WHERE lock_task_id = $1 AND user_id = $2',
            [t.id, t.user_id]
        );
        const earliestComp = earliest?.d ? new Date(earliest.d + 'T00:00:00Z') : null;
        
        // Determine the correct start date
        const candidates = [assignedAt];
        if (deptJoined) candidates.push(deptJoined);
        if (earliestComp) candidates.push(earliestComp);
        
        const correctStart = new Date(Math.min(...candidates.map(d => d.getTime())));
        
        const needsFix = correctStart < assignedAt;
        const flag = needsFix ? '❌ NEEDS FIX' : '✅ OK';
        
        console.log(`  Task ${t.id} "${t.task_name}" | user=${t.user_id} (${t.full_name})`);
        console.log(`    assigned_at: ${assignedAt.toISOString().slice(0,10)} | dept_joined: ${deptJoined?.toISOString().slice(0,10) || 'N/A'} | earliest_comp: ${earliestComp?.toISOString().slice(0,10) || 'N/A'} | ${flag}`);
        
        if (needsFix) {
            await db.run(
                'UPDATE lock_task_assignments SET created_at = $1 WHERE lock_task_id = $2 AND user_id = $3',
                [correctStart.toISOString(), t.id, t.user_id]
            );
            console.log(`    → FIXED: ${assignedAt.toISOString().slice(0,10)} → ${correctStart.toISOString().slice(0,10)}`);
            fixCount++;
        }
    }
    
    console.log(`\n=== Total fixed: ${fixCount} assignments ===`);
    
    process.exit(0);
})();
