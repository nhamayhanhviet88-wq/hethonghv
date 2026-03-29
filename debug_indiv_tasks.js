const db = require('./db/pool');
(async () => {
    // Check individual fixed tasks
    const indiv = await db.all(
        "SELECT id, target_type, target_id, day_of_week, task_name, week_only, time_start, time_end, points FROM task_point_templates WHERE target_type = 'individual' ORDER BY target_id, day_of_week"
    );
    console.log('=== Individual tasks ===');
    indiv.forEach(t => {
        console.log(`  ID:${t.id} user:${t.target_id} d${t.day_of_week} "${t.task_name}" week_only=${t.week_only} ${t.time_start}-${t.time_end} ${t.points}pts`);
    });
    console.log(`Total: ${indiv.length}`);

    // Check what comes back for user with individual tasks
    if (indiv.length > 0) {
        const userId = indiv[0].target_id;
        const nextWeek = '2026-03-30';
        const result = await db.all(
            "SELECT *, 'individual' as _source FROM task_point_templates WHERE target_type = 'individual' AND target_id = ? AND (week_only IS NULL OR week_only = ?) ORDER BY day_of_week",
            [userId, nextWeek]
        );
        console.log(`\n=== Query for user ${userId}, week_start=${nextWeek} ===`);
        result.forEach(t => {
            console.log(`  ID:${t.id} d${t.day_of_week} "${t.task_name}" week_only=${t.week_only}`);
        });
        console.log(`Total: ${result.length}`);
    }
    process.exit();
})();
