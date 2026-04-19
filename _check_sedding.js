const db = require('./db/pool');
setTimeout(async () => {
    try {
        const cols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name='lock_tasks' ORDER BY ordinal_position");
        console.log('lock_tasks columns:', cols.map(c => c.column_name).join(', '));

        const s = await db.all("SELECT id, task_name, min_quantity FROM lock_tasks WHERE task_name ILIKE '%sedding%'");
        console.log('sedding lock_tasks:', JSON.stringify(s, null, 2));

        // Check task_point_templates for sedding
        const t = await db.all("SELECT id, task_name, min_quantity, points FROM task_point_templates WHERE task_name ILIKE '%sedding%'");
        console.log('sedding templates:', JSON.stringify(t, null, 2));

        // Check task_library for sedding
        const l = await db.all("SELECT id, task_name, min_quantity, points FROM task_library WHERE task_name ILIKE '%sedding%'");
        console.log('sedding library:', JSON.stringify(l, null, 2));
    } catch(e) { console.error(e.message); }
    process.exit();
}, 500);
