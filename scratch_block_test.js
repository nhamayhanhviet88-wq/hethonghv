const db = require('./db/pool');
(async () => {
    const u = await db.get("SELECT id FROM users WHERE username = 'nhanvien10'");
    console.log('User:', u);
    
    // Overdue customers (appointment_date < today)
    const rows = await db.all(
        `SELECT id, customer_name, crm_type, appointment_date::text, cancel_approved, order_status
         FROM customers
         WHERE assigned_to_id = $1
           AND appointment_date::date < CURRENT_DATE
           AND cancel_approved != 1
           AND order_status NOT IN ('hoan_thanh', 'duyet_huy')`,
        [u.id]
    );
    console.log(`\nOverdue customers: ${rows.length}`);
    rows.forEach(c => console.log(`  id=${c.id} name=${c.customer_name} crm=${c.crm_type} appt=${c.appointment_date} cancel=${c.cancel_approved} status=${c.order_status}`));
    
    // Check existing penalties today
    const penalties = await db.all(
        `SELECT * FROM customer_penalty_records WHERE user_id = $1 AND penalty_date >= '2026-05-13'`,
        [u.id]
    );
    console.log(`\nPenalties:`, penalties.length);
    penalties.forEach(p => console.log(`  date=${p.penalty_date} crm=${p.crm_type} count=${p.unhandled_count} amt=${p.penalty_amount} ack=${p.acknowledged}`));
    
    process.exit();
})();
