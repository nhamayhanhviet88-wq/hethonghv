const db = require('./db/pool');
(async () => {
    // 1. Check if template 185 should be deleted
    const tpl = await db.get('SELECT * FROM task_point_templates WHERE id = 185');
    console.log('Template 185:', tpl ? `"${tpl.task_name}" target=${tpl.target_type}/${tpl.target_id}` : 'NOT FOUND');

    // 2. Delete ALL "Đăng bài MXH" templates
    const result = await db.run("DELETE FROM task_point_templates WHERE task_name ILIKE '%Đăng bài MXH%' OR task_name ILIKE '%Đăng Bài MXH%'");
    console.log('Templates deleted:', result.changes || 'done');

    // 3. Delete ALL orphan snapshots (template_id is NULL)
    const r2 = await db.run('DELETE FROM daily_task_snapshots WHERE template_id IS NULL');
    console.log('Null-template snapshots deleted:', r2.changes || 'done');

    // 4. Delete ALL "Đăng bài MXH" snapshots  
    const r3 = await db.run("DELETE FROM daily_task_snapshots WHERE task_name ILIKE '%Đăng bài MXH%' OR task_name ILIKE '%Đăng Bài MXH%'");
    console.log('MXH snapshots deleted:', r3.changes || 'done');

    // 5. Delete ALL snapshots whose template_id no longer exists in task_point_templates
    const r4 = await db.run(`
        DELETE FROM daily_task_snapshots 
        WHERE template_id IS NOT NULL 
        AND template_id NOT IN (SELECT id FROM task_point_templates)
    `);
    console.log('Orphan snapshots (deleted templates) deleted:', r4.changes || 'done');

    console.log('\n✅ Full cleanup done!');
    process.exit(0);
})();
