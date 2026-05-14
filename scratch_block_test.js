const db = require('./db/pool');
(async () => {
    // All support requests where dovandoanh (id=47) is the manager
    const all = await db.all(
        `SELECT sr.id, sr.user_id, sr.manager_id, sr.task_name, sr.task_date::text,
                sr.source_type, sr.status, sr.penalty_amount, sr.stacking_source,
                sr.created_at::text as created_at
         FROM task_support_requests sr
         WHERE sr.manager_id = 47
         ORDER BY sr.task_date, sr.id`
    );
    console.log(`ALL support requests for manager=47: ${all.length}`);
    all.forEach(r => {
        console.log(`  id=${r.id} task=${r.task_name} date=${r.task_date} status=${r.status} amt=${r.penalty_amount} stack=${r.stacking_source || '-'} src=${r.source_type}`);
    });

    // Check specifically for stacking entries on 13/5
    const stacking13 = all.filter(r => r.task_date === '2026-05-13' && r.stacking_source);
    console.log(`\nStacking entries for 13/5: ${stacking13.length}`);
    
    // Check expired originals that should have stacked
    const expired = all.filter(r => r.status === 'expired' && !r.stacking_source);
    console.log(`\nExpired originals (should stack): ${expired.length}`);
    expired.forEach(r => {
        console.log(`  id=${r.id} task=${r.task_name} date=${r.task_date} amt=${r.penalty_amount}`);
    });
    
    process.exit();
})();
