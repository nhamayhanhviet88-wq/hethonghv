const db = require('./db/pool');
(async () => {
    try {
        // Check when assignments for task 5 were created
        const assignments = await db.all(
            `SELECT lta.*, lta.created_at::text as created_at
             FROM lock_task_assignments lta
             WHERE lta.lock_task_id = 5
             ORDER BY lta.created_at`
        );
        console.log('=== Assignments for "Lặp lại 29" (task_id=5) ===');
        assignments.forEach(a => {
            console.log(`  user_id=${a.user_id} | created_at=${a.created_at}`);
        });
        
        // Also check lock_task_assignments table structure
        const cols = await db.all(
            `SELECT column_name, data_type FROM information_schema.columns 
             WHERE table_name = 'lock_task_assignments' ORDER BY ordinal_position`
        );
        console.log('\n=== lock_task_assignments columns ===');
        cols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
