const db = require('./db/pool');
(async () => {
    const r = await db.run(
        "UPDATE customers SET appointment_date = '2026-05-05' WHERE appointment_date = '2026-05-04' AND crm_type = 'ctv_hoa_hong'"
    );
    console.log('Updated rows:', r.changes);
    process.exit(0);
})();
