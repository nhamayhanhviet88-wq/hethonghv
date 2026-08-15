const db = require('./db/pool');

(async () => {
    try {
        console.log('--- INSPECTING BOARD_TASKS ---');

        const cols = await db.all(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'board_tasks'
            ORDER BY ordinal_position
        `);
        console.log('BOARD_TASKS COLUMNS:');
        console.log(cols.map(c => c.column_name));

        const rows = await db.all(`
            SELECT id, title, task_code, status, deadline, created_by, assign_type
            FROM board_tasks
            LIMIT 10
        `);
        console.log('BOARD_TASKS SAMPLE ROWS:');
        console.log(rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
