const db = require('./db/pool');
(async () => {
    await db.init();
    // Delete wrong task_library entries — lock_tasks already has correct min_quantity
    await db.run("DELETE FROM task_library WHERE task_name = 'Đăng Bản Thân & Sản Phẩm'");
    console.log('Deleted Đăng Bản Thân from task_library');
    await db.run("DELETE FROM task_library WHERE task_name = 'Sedding Cộng Đồng & Lẫn Nhau'");
    console.log('Deleted Sedding from task_library');
    
    // Verify lock_tasks has correct data
    const lt = await db.all("SELECT task_name, min_quantity FROM lock_tasks WHERE task_name ILIKE '%Bản Thân%' OR task_name ILIKE '%Sedding%'");
    console.log('lock_tasks (source of truth):', JSON.stringify(lt, null, 2));
    process.exit();
})();
