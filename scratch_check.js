const db = require('./db/pool');
(async () => {
    const rows = await db.all(
        "SELECT penalty_date, source_type, task_name, penalty_amount FROM daily_penalty_ledger WHERE user_id=47 AND penalty_date='2026-05-15' ORDER BY source_type"
    );
    console.log('dovandoanh (id=47) 15/05 ledger:');
    rows.forEach(r => console.log(' ', r.source_type, '|', r.task_name, '|', r.penalty_amount));
    console.log('Total:', rows.reduce((s, r) => s + r.penalty_amount, 0));
    process.exit();
})();
