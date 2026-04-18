const db = require('./db/pool');
(async () => {
    const r = await db.all("SELECT id, task_name, target_type, target_id FROM task_point_templates WHERE task_name ILIKE '%Đăng Bài%' OR task_name ILIKE '%MXH%'");
    console.log('Templates:', r.length, JSON.stringify(r, null, 2));

    const s = await db.all("SELECT id, template_id, task_name, snapshot_date, user_id FROM daily_task_snapshots WHERE task_name ILIKE '%Đăng Bài%' OR task_name ILIKE '%MXH%' ORDER BY snapshot_date");
    console.log('Snapshots:', s.length);
    s.forEach(x => console.log(`  snap=${x.id} tpl=${x.template_id} user=${x.user_id} date=${x.snapshot_date} "${x.task_name}"`));

    // Check if those template_ids exist
    if (s.length > 0) {
        const tplIds = [...new Set(s.map(x => x.template_id))];
        for (const tid of tplIds) {
            const exists = await db.get('SELECT id, task_name FROM task_point_templates WHERE id = $1', [tid]);
            console.log(`  tpl_id=${tid}: ${exists ? 'EXISTS: ' + exists.task_name : '❌ DELETED'}`);
        }
    }

    process.exit(0);
})();
