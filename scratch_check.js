const db = require('./db/pool');
(async () => {
    const cols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name = 'lock_tasks' ORDER BY ordinal_position");
    console.log('lock_tasks columns:', cols.map(c => c.column_name).join(', '));
    const task = await db.get('SELECT * FROM lock_tasks WHERE id = 20');
    console.log('\nTask 20:', JSON.stringify(task, null, 2));

    // Check how the deadline-checker generates assignments for this task
    // The key data: how many "instances" are generated per day for task_id=20
    const compCols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name = 'lock_task_completions' ORDER BY ordinal_position");
    console.log('\nlock_task_completions columns:', compCols.map(c => c.column_name).join(', '));

    // Constraint
    const constr = await db.all(
        `SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'lock_task_completions'::regclass`
    );
    console.log('\nConstraints:');
    constr.forEach(c => console.log(`  ${c.conname}: ${c.def}`));

    process.exit();
})();
