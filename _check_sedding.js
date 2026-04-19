const db = require('./db/pool');
setTimeout(async () => {
    try {
        const pattern = '%Sedding%Cộng Đồng%';
        
        // Check task_point_templates
        const t1 = await db.all("SELECT id, task_name, min_quantity, points FROM task_point_templates WHERE task_name ILIKE $1", [pattern]);
        console.log('templates:', JSON.stringify(t1));
        
        // Check task_library
        const t2 = await db.all("SELECT id, task_name, min_quantity, points FROM task_library WHERE task_name ILIKE $1", [pattern]);
        console.log('library:', JSON.stringify(t2));
        
        // Check lock_tasks  
        const t3 = await db.all("SELECT id, task_name, min_quantity, is_active FROM lock_tasks WHERE task_name ILIKE $1", [pattern]);
        console.log('lock_tasks:', JSON.stringify(t3));
        
        // Check with is_active = true
        const t4 = await db.all("SELECT id, task_name, min_quantity FROM lock_tasks WHERE task_name ILIKE $1 AND is_active = true", [pattern]);
        console.log('lock_tasks (active):', JSON.stringify(t4));
    } catch(e) { console.error(e.message); }
    process.exit();
}, 500);
