const db = require('./db/pool');

(async () => {
    // Delete ALL auto-generated reports (content starts with [Tự động])
    // These were created with wrong template matching (no day_of_week filter)
    const result = await db.run(
        `DELETE FROM task_point_reports WHERE content LIKE '[Tự động]%'`
    );
    console.log('Deleted auto-generated reports:', result?.rowCount || 'done');
    
    // Also delete backfill reports
    const result2 = await db.run(
        `DELETE FROM task_point_reports WHERE content LIKE '[Backfill]%'`
    );
    console.log('Deleted backfill reports:', result2?.rowCount || 'done');
    
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
