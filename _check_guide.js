const db = require('./db/pool');
(async () => {
    await db.init();
    const r1 = await db.all("SELECT task_name, guide_url FROM task_point_templates WHERE task_name ILIKE '%Sedding%' OR task_name ILIKE '%Bản Thân%' OR task_name ILIKE '%Tìm%Gr%Zalo%'");
    console.log('templates with guide:', JSON.stringify(r1, null, 2));
    const r2 = await db.all("SELECT task_name, guide_url FROM task_library WHERE task_name ILIKE '%Sedding%' OR task_name ILIKE '%Bản Thân%' OR task_name ILIKE '%Tìm%Gr%Zalo%'");
    console.log('library with guide:', JSON.stringify(r2, null, 2));
    // Check if lock_tasks has guide_url
    try {
        const r3 = await db.all("SELECT task_name, guide_url FROM lock_tasks WHERE task_name ILIKE '%Sedding%' LIMIT 3");
        console.log('lock_tasks:', JSON.stringify(r3, null, 2));
    } catch(e) { console.log('lock_tasks has no guide_url column:', e.message); }
    process.exit();
})();
