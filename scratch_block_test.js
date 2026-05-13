const db = require('./db/pool');
(async () => {
    const r = await db.get("SELECT access_blocked_reason FROM users WHERE id = 52");
    const penalties = JSON.parse(r.access_blocked_reason || '[]');
    console.log('Total penalties:', penalties.length);
    penalties.forEach((p, i) => console.log(`  ${i+1}. ${p.task_name} | date=${p.task_date} | amt=${p.penalty_amount}`));
    process.exit();
})();
