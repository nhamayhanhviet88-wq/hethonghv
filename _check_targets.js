const db = require('./db/pool');
(async () => {
    try {
        const r = await db.all("SELECT id, task_name, min_quantity FROM task_library WHERE task_name ILIKE '%Content%' OR task_name ILIKE '%Sedding%' OR task_name ILIKE '%Đăng%'");
        console.log('task_library:', JSON.stringify(r, null, 2));
    } catch(e) { console.log('Error:', e.message); }
    process.exit();
})();
