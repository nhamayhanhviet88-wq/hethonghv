// Step 1: Delete individual templates that duplicate team templates
// Step 2: Delete all future snapshots to force regeneration
const db = require('./db/pool');

(async () => {
    console.log('=== STEP 1: Find & delete duplicate individual templates ===');
    
    // Get all users with their departments
    const users = await db.all("SELECT id, full_name, department_id FROM users WHERE status = 'active' AND department_id IS NOT NULL");
    
    let totalDeleted = 0;
    for (const user of users) {
        // Get team templates for this user's department
        const teamTpls = await db.all(
            "SELECT id, task_name, day_of_week FROM task_point_templates WHERE target_type = 'team' AND target_id = $1",
            [user.department_id]
        );
        if (teamTpls.length === 0) continue;

        // Get individual templates for this user
        const indivTpls = await db.all(
            "SELECT id, task_name, day_of_week, time_start, time_end FROM task_point_templates WHERE target_type = 'individual' AND target_id = $1",
            [user.id]
        );
        if (indivTpls.length === 0) continue;

        // Find duplicates: individual task with same task_name + day_of_week as a team task
        for (const indiv of indivTpls) {
            const teamMatch = teamTpls.find(t => t.task_name === indiv.task_name && t.day_of_week === indiv.day_of_week);
            if (teamMatch) {
                console.log(`  ❌ Delete indiv tpl=${indiv.id} "${indiv.task_name}" day=${indiv.day_of_week} ${indiv.time_start}-${indiv.time_end} (user: ${user.full_name}) — already in team tpl=${teamMatch.id}`);
                await db.run('DELETE FROM task_point_templates WHERE id = $1', [indiv.id]);
                totalDeleted++;
            }
        }
    }
    console.log(`  Deleted ${totalDeleted} duplicate individual templates\n`);

    console.log('=== STEP 2: Delete all snapshots from today onward (force regeneration) ===');
    const now = new Date(Date.now() + 7 * 3600000);
    const today = now.toISOString().split('T')[0];
    
    // Delete snapshots from today onward that have no reports
    const result = await db.run(`
        DELETE FROM daily_task_snapshots 
        WHERE snapshot_date >= $1 
        AND id NOT IN (
            SELECT DISTINCT s.id FROM daily_task_snapshots s 
            INNER JOIN task_point_reports r ON r.template_id = s.template_id AND r.user_id = s.user_id AND r.report_date = s.snapshot_date
            WHERE s.snapshot_date >= $1
        )
    `, [today]);
    console.log(`  Deleted future snapshots: ${result.changes || 'done'}`);

    // Also delete past week snapshots without reports
    const d = new Date(today + 'T00:00:00');
    const dow = d.getDay() || 7;
    const mon = new Date(d); mon.setDate(d.getDate() - dow + 1);
    const weekStart = mon.toISOString().split('T')[0];

    const result2 = await db.run(`
        DELETE FROM daily_task_snapshots 
        WHERE snapshot_date >= $1 AND snapshot_date < $2
        AND id NOT IN (
            SELECT DISTINCT s.id FROM daily_task_snapshots s 
            INNER JOIN task_point_reports r ON r.template_id = s.template_id AND r.user_id = s.user_id AND r.report_date = s.snapshot_date
            WHERE s.snapshot_date >= $1 AND s.snapshot_date < $2
        )
    `, [weekStart, today]);
    console.log(`  Deleted this-week past snapshots (no reports): ${result2.changes || 'done'}`);

    console.log('\n✅ Done! Refresh Lịch Khóa Biểu to see clean results.');
    process.exit(0);
})();
