const db = require('./db/pool');
(async () => {
    const r = await db.get(`SELECT id, customer_name, appointment_date, effective_date FROM customers WHERE customer_name ILIKE '%doanhhv2323%'`);
    console.log(JSON.stringify(r, null, 2));
    
    // Fix: set appointment_date for this customer too
    if (r && !r.appointment_date && r.effective_date) {
        await db.run('UPDATE customers SET appointment_date = effective_date WHERE id = $1', [r.id]);
        console.log('Fixed: appointment_date set to', r.effective_date);
    }
    process.exit(0);
})();
