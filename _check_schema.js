const db = require('./db/pool');
setTimeout(async () => {
    try {
        // Check columns of chain_task_completions
        const cols = await db.all(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'chain_task_completions'
            ORDER BY ordinal_position
        `);
        console.log('chain_task_completions columns:');
        cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

        // Also check lock_task_completions
        const lcols = await db.all(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'lock_task_completions'
            ORDER BY ordinal_position
        `);
        console.log('\nlock_task_completions columns:');
        lcols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
    } catch(e) {
        console.error(e);
    }
    process.exit();
}, 500);
