const db = require('./db/pool');
(async () => {
    const rows = await db.all(`
        SELECT sr.id, sr.user_id, sr.manager_id, sr.task_name, sr.task_date::text as task_date, sr.status, sr.source_type,
               u.username as user_name, m.username as mgr_name
        FROM task_support_requests sr
        LEFT JOIN users u ON sr.user_id = u.id
        LEFT JOIN users m ON sr.manager_id = m.id
        WHERE sr.status = 'pending'
        ORDER BY sr.created_at DESC
    `);
    console.log('Pending support requests:', JSON.stringify(rows, null, 2));
    process.exit();
})();
