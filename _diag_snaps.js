// Diagnose: compare templates vs snapshots for nhanvien
const db = require('./db/pool');

(async () => {
    const user = await db.get("SELECT id, full_name, department_id FROM users WHERE username = 'nhanvien'");
    if (!user) { console.log('User not found'); process.exit(1); }
    console.log(`User: ${user.full_name} (id=${user.id}, dept=${user.department_id})`);

    // Get templates (same logic as _getTemplatesForUser)
    const indiv = await db.all('SELECT * FROM task_point_templates WHERE target_type = $1 AND target_id = $2 ORDER BY day_of_week, time_start', ['individual', user.id]);
    const team = await db.all('SELECT * FROM task_point_templates WHERE target_type = $1 AND target_id = $2 ORDER BY day_of_week, time_start', ['team', user.department_id]);
    const all = [...team, ...indiv];
    const mondayTpls = all.filter(t => t.day_of_week === 1);

    console.log(`\n📋 Templates Monday (${mondayTpls.length}):`);
    mondayTpls.forEach(t => console.log(`  id=${t.id} | ${t.time_start}-${t.time_end} | ${t.task_name} | type=${t.target_type}`));

    // Get snapshots for Monday this week
    const now = new Date(Date.now() + 7 * 3600000);
    const today = now.toISOString().split('T')[0];
    const d = new Date(today + 'T00:00:00');
    const dow = d.getDay() || 7;
    const mon = new Date(d); mon.setDate(d.getDate() - dow + 1);
    // Also check next Monday
    const nextMon = new Date(mon); nextMon.setDate(mon.getDate() + 7);
    const monStr = mon.toISOString().split('T')[0];
    const nextMonStr = nextMon.toISOString().split('T')[0];

    for (const dateStr of [monStr, nextMonStr]) {
        const snaps = await db.all(
            'SELECT id, template_id, task_name, time_start, time_end FROM daily_task_snapshots WHERE user_id = $1 AND snapshot_date = $2 ORDER BY time_start',
            [user.id, dateStr]
        );
        console.log(`\n📸 Snapshots ${dateStr} (${snaps.length}):`);
        snaps.forEach(s => {
            const inTpls = mondayTpls.some(t => t.id === s.template_id);
            console.log(`  snap=${s.id} tpl=${s.template_id} | ${s.time_start}-${s.time_end} | ${s.task_name} ${inTpls ? '✅' : '❌ ORPHAN'}`);
        });
    }

    process.exit(0);
})();
