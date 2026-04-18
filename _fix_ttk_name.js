const db = require('./db/pool');
(async () => {
    // Check current state
    const rows = await db.all("SELECT id, task_name FROM task_point_templates WHERE task_name ILIKE '%Tự Tìm Kiếm%'");
    console.log('Templates found:', rows.length);
    rows.forEach(r => console.log(`  id=${r.id} name='${r.task_name}'`));

    // Rename old → new
    const result = await db.run(
        "UPDATE task_point_templates SET task_name = 'Tự Tìm Kiếm Telesale' WHERE task_name = 'Tự Tìm Kiếm'"
    );
    console.log(`\nRenamed: ${result.changes || 0} templates`);

    // Verify
    const after = await db.all("SELECT id, task_name FROM task_point_templates WHERE task_name ILIKE '%Tự Tìm Kiếm%'");
    console.log('\nAfter fix:');
    after.forEach(r => console.log(`  id=${r.id} name='${r.task_name}'`));

    process.exit(0);
})();
