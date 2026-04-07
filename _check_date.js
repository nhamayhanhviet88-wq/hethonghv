const db = require('./db/pool');
(async () => {
    const r = await db.get("SELECT MAX(completion_date::text) as last_date FROM lock_task_completions WHERE user_id=4 AND status='expired'");
    console.log('Last expired date:', r?.last_date);
    const now = new Date();
    const y = new Date(now); y.setDate(y.getDate()-1);
    const yesterdayStr = y.toISOString().split('T')[0];
    console.log('Yesterday:', yesterdayStr);
    console.log('Match:', r?.last_date === yesterdayStr);
    process.exit(0);
})();
