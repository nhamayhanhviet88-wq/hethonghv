const db = require('./db/pool');
(async () => {
    // Check for test/junk templates
    const r = await db.all(`
        SELECT id, task_name, points, day_of_week, target_type, target_id, week_only
        FROM task_point_templates
        WHERE task_name ILIKE '%test%' OR task_name ILIKE '%Gặp Khách%' OR task_name ILIKE '%GẶP KHÁCH%'
        ORDER BY id
    `);
    console.log('Test/junk templates:', JSON.stringify(r, null, 2));

    // Also check library items
    const lib = await db.all(`
        SELECT id, task_name, points, is_weekly
        FROM task_point_library
        WHERE task_name ILIKE '%test%' OR task_name ILIKE '%Gặp Khách%' OR task_name ILIKE '%GẶP KHÁCH%'
        ORDER BY id
    `);
    console.log('\nLibrary test items:', JSON.stringify(lib, null, 2));

    process.exit(0);
})();
