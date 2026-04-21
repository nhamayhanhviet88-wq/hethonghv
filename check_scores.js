const db = require('./db/pool');
(async () => {
    // Fix all auto-scored reports that are 'pending' but template doesn't require approval
    const result = await db.run(
        `UPDATE task_point_reports SET status = 'approved'
         WHERE status = 'pending' 
           AND content LIKE '[Tự động]%' 
           AND template_id IN (SELECT id FROM task_point_templates WHERE requires_approval = false)`
    );
    console.log('Fixed auto-scored pending→approved:', result?.rowCount || 'done');
    
    // Also fix backfill reports
    const result2 = await db.run(
        `UPDATE task_point_reports SET status = 'approved'
         WHERE status = 'pending'
           AND content LIKE '[Backfill]%'
           AND template_id IN (SELECT id FROM task_point_templates WHERE requires_approval = false)`
    );
    console.log('Fixed backfill pending→approved:', result2?.rowCount || 'done');
    
    // Verify no more phantom pending
    const pending = await db.all(
        `SELECT r.id, r.report_date::text as dt, t.task_name, r.status, r.points_earned, t.requires_approval
         FROM task_point_reports r LEFT JOIN task_point_templates t ON r.template_id = t.id
         WHERE r.status = 'pending' AND (r.content LIKE '[Tự động]%' OR r.content LIKE '[Backfill]%')`
    );
    console.log(`\nRemaining auto-pending: ${pending.length}`);
    pending.forEach(p => console.log(`  ${p.dt} "${p.task_name}" requires_approval=${p.requires_approval}`));
    
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
