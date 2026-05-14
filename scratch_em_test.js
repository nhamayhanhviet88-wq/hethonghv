const db = require('./db/pool');
(async () => {
    const rows = await db.all(
        `SELECT e.id, e.status, e.penalty_applied,
                e.last_penalty_at,
                e.last_penalty_at::date::text as lp_date,
                e.created_at::date::text as c_date
         FROM emergencies e
         WHERE e.id = 20`
    );
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
})();
