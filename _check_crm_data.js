require('dotenv').config();
const db = require('./db/pool');
(async () => {
    await db.init();
    
    // Check what yesterday is
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    console.log('Yesterday:', yesterday);
    console.log('Today:', today);
    
    // Check assigned records by date
    const byDate = await db.all(`
        SELECT a.assigned_date, COUNT(*) as cnt, 
            COUNT(*) FILTER (WHERE a.call_status = 'pending') as pending,
            COUNT(*) FILTER (WHERE a.call_status = 'answered') as answered,
            COUNT(*) FILTER (WHERE a.call_status = 'invalid') as invalid,
            COUNT(*) FILTER (WHERE a.call_status IN ('no_answer','busy')) as no_answer_busy
        FROM telesale_assignments a
        JOIN telesale_data d ON d.id = a.data_id
        WHERE d.status = 'assigned'
        GROUP BY a.assigned_date
        ORDER BY a.assigned_date DESC
        LIMIT 5
    `);
    console.log('\n=== ASSIGNMENTS of still-assigned data BY DATE ===');
    console.table(byDate);

    // Check how many assigned data have NO assignment at all
    const orphans = await db.get(`
        SELECT COUNT(*) as cnt FROM telesale_data d
        WHERE d.status = 'assigned' 
        AND NOT EXISTS (SELECT 1 FROM telesale_assignments a WHERE a.data_id = d.id)
    `);
    console.log('\nOrphan assigned (no assignment):', orphans.cnt);

    process.exit(0);
})();
