// One-time: Clean stale snapshots for today (force regeneration)
const db = require('./db/pool');

(async () => {
    const now = new Date(Date.now() + 7 * 3600000);
    const today = now.toISOString().split('T')[0];

    console.log(`🧹 Cleaning stale snapshots for today: ${today}`);

    // Get all snapshots for today
    const snaps = await db.all(
        'SELECT s.id, s.user_id, s.template_id, s.task_name, s.time_start FROM daily_task_snapshots s WHERE s.snapshot_date = $1',
        [today]
    );
    console.log(`  Found ${snaps.length} snapshots for today`);

    // Get all current templates
    const templates = await db.all('SELECT id, task_name, time_start, time_end, day_of_week FROM task_point_templates');
    const templateMap = new Map(templates.map(t => [t.id, t]));

    let deleted = 0, updated = 0;
    for (const snap of snaps) {
        const tpl = templateMap.get(snap.template_id);
        if (!tpl) {
            // Template no longer exists — check if there's a report
            const hasReport = await db.get(
                'SELECT id FROM task_point_reports WHERE template_id = $1 AND user_id = $2 AND report_date = $3 LIMIT 1',
                [snap.template_id, snap.user_id, today]
            );
            if (!hasReport) {
                await db.run('DELETE FROM daily_task_snapshots WHERE id = $1', [snap.id]);
                deleted++;
                console.log(`  ❌ Deleted orphan: "${snap.task_name}" (template ${snap.template_id})`);
            }
        } else if (tpl.time_start !== snap.time_start) {
            await db.run(
                'UPDATE daily_task_snapshots SET time_start = $1, time_end = $2, task_name = $3 WHERE id = $4',
                [tpl.time_start, tpl.time_end, tpl.task_name, snap.id]
            );
            updated++;
            console.log(`  ✏️ Updated time: "${snap.task_name}" ${snap.time_start} → ${tpl.time_start}`);
        }
    }

    console.log(`\n✅ Done! Deleted: ${deleted}, Updated: ${updated}`);
    process.exit(0);
})();
