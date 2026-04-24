const db = require('./db/pool');
(async () => {
    const dates = ['2026-04-21','2026-04-23','2026-04-24','2026-04-25'];
    for (const d of dates) {
        const r = await db.get(
            `SELECT ltc.status FROM lock_task_completions ltc
             WHERE ltc.user_id = 2 AND ltc.lock_task_id = 21 AND ltc.completion_date = $1
             ORDER BY ltc.id DESC LIMIT 1`, [d]
        );
        console.log(d, '->', r ? r.status : 'NO RECORD');
    }
    process.exit();
})().catch(e => { console.error(e.message); process.exit(1); });
