const db = require('./db/pool');
(async () => {
    const r = await db.all("SELECT id, customer_name, appointment_date FROM customers WHERE appointment_date = '2026-05-06'");
    console.log(JSON.stringify(r, null, 2));
    // Fix all to 2026-05-05
    if (r.length > 0) {
        await db.run("UPDATE customers SET appointment_date = '2026-05-05' WHERE appointment_date = '2026-05-06'");
        console.log('Fixed', r.length, 'rows to 2026-05-05');
    }
    process.exit(0);
})();
