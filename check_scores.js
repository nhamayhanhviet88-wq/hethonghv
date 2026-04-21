const db = require('./db/pool');
(async () => {
    const cols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name='lock_task_completions' ORDER BY ordinal_position");
    console.log('Columns:', cols.map(c => c.column_name).join(', '));
    process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
