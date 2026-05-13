const db = require('./db/pool');
(async () => {
    const r = await db.get("SELECT access_blocked, access_blocked_reason FROM users WHERE id = 52");
    console.log('blocked:', r.access_blocked);
    const penalties = JSON.parse(r.access_blocked_reason || '[]');
    console.log('penalties count:', penalties.length);
    penalties.forEach(p => console.log(`  ${p.task_name} | date=${p.task_date} | amt=${p.penalty_amount} | reason=${p.penalty_reason}`));
    process.exit();
})();
