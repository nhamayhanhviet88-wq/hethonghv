const db = require('./db/pool');
(async () => {
    // 1. Check current state
    const comp = await db.get(`
        SELECT id, status, quantity_done, content 
        FROM lock_task_completions 
        WHERE lock_task_id = 20 AND user_id = 52 AND completion_date = '2026-05-14' AND redo_count = 0
    `);
    console.log('Current state:', comp);
    
    if (comp && comp.status === 'approved') {
        // Still approved — force fix
        await db.run(`UPDATE lock_task_completions SET status = 'pending', quantity_done = 1 WHERE id = $1`, [comp.id]);
        console.log(`✅ Fixed id=${comp.id} → pending (1/2)`);
    } else {
        console.log('Already fixed or not found');
    }
    
    // Verify
    const after = await db.get(`SELECT id, status, quantity_done FROM lock_task_completions WHERE id = $1`, [comp?.id]);
    console.log('After fix:', after);
    
    process.exit(0);
})();
