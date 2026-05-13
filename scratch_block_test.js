const db = require('./db/pool');
(async () => {
    const r = await db.get("SELECT access_blocked_reason FROM users WHERE id = 52");
    const penalties = JSON.parse(r.access_blocked_reason || '[]');
    console.log('Total:', penalties.length);
    penalties.forEach((p, i) => console.log(`  ${i+1}. ${p.task_name} | ${p.task_date} | ${p.penalty_amount}đ`));
    const total = penalties.reduce((s, p) => s + p.penalty_amount, 0);
    console.log(`\nTổng: ${total.toLocaleString()}đ`);
    process.exit();
})();
