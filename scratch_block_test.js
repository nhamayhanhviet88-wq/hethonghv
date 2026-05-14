const db = require('./db/pool');
(async () => {
    // nhanvien10 = user 52, check department
    const user = await db.get('SELECT id, department_id, full_name FROM users WHERE id = 52');
    console.log('User:', user);

    // Templates target team for this user's dept
    const templates = await db.all(
        `SELECT id, task_name, day_of_week, target_type, target_id
         FROM task_point_templates 
         WHERE task_name IN ('Đăng Video Isocal', 'Nhắn Tìm Đối Tác KH KOL TikTok')
         ORDER BY task_name, day_of_week`
    );
    console.log('\nAll templates for these tasks:');
    templates.forEach(t => console.log(`  id=${t.id} name=${t.task_name} dow=${t.day_of_week} target=${t.target_type}:${t.target_id}`));

    // Check reports for user 52 for Monday 12/5 (day_of_week = 1)
    // Monday 12/5 → templates with dow=1
    const mondayTemplates = templates.filter(t => t.day_of_week === 1);
    console.log('\nMonday templates:', mondayTemplates.map(t => `${t.id}:${t.task_name}`));

    for (const t of mondayTemplates) {
        const reports = await db.all(
            `SELECT r.id, r.report_date::text, r.status
             FROM task_point_reports r
             WHERE r.template_id = $1 AND r.user_id = 52
             AND r.report_date >= '2026-05-10'
             ORDER BY r.report_date`,
            [t.id]
        );
        console.log(`  Reports for "${t.task_name}" (template=${t.id}):`);
        if (reports.length === 0) console.log('    (none)');
        reports.forEach(r => console.log(`    date=${r.report_date} status=${r.status}`));
    }

    // Support requests for user 52 on these tasks
    const srs = await db.all(
        `SELECT sr.id, sr.task_name, sr.task_date::text, sr.status, sr.template_id, sr.source_type
         FROM task_support_requests sr
         WHERE sr.user_id = 52 
         AND sr.task_name IN ('Đăng Video Isocal', 'Nhắn Tìm Đối Tác KH KOL TikTok')
         ORDER BY sr.task_date`
    );
    console.log('\nSupport requests for user 52:');
    srs.forEach(r => console.log(`  id=${r.id} task=${r.task_name} date=${r.task_date} status=${r.status} template=${r.template_id}`));

    // Check the schedule page route - what does it query?
    // The schedule page shows task completions per day
    // For Wednesday 14/5 (dow=3), which templates?
    const wednesdayTemplates = templates.filter(t => t.day_of_week === 3);
    console.log('\nWednesday (dow=3) templates:', wednesdayTemplates.map(t => `${t.id}:${t.task_name}`));

    // What about schedule page and lock tasks?
    const lockTasks = await db.all(
        `SELECT lt.id, lt.task_name, lt.day_of_week, lt.target_type, lt.target_id
         FROM lock_tasks lt
         WHERE lt.task_name IN ('Đăng Video Isocal', 'Nhắn Tìm Đối Tác KH KOL TikTok')
         ORDER BY lt.task_name, lt.day_of_week`
    );
    console.log('\nLock tasks for these names:', lockTasks.length);
    lockTasks.forEach(t => console.log(`  id=${t.id} name=${t.task_name} dow=${t.day_of_week} target=${t.target_type}:${t.target_id}`));

    process.exit();
})();
