const db = require('./db/pool');
(async () => {
    // Fix the 2 customers that got 2026-05-06 instead of 2026-05-05
    const r = await db.run(
        "UPDATE customers SET appointment_date = '2026-05-05' WHERE appointment_date = '2026-05-06' AND id IN (99, 103)"
    );
    console.log('Updated rows:', r.changes);
    process.exit(0);
})();
