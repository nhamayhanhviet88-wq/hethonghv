const db = require('./db/pool');
(async () => {
    // Find ctvtruogphong3 customer
    const cust = await db.all(
        `SELECT c.id, c.customer_name, c.crm_type, c.assigned_to_id, c.appointment_date, 
                c.order_status, c.cancel_approved, c.receiver_id,
                u.full_name as assigned_name, u.username
         FROM customers c
         LEFT JOIN users u ON u.id = c.assigned_to_id
         WHERE c.customer_name ILIKE '%ctvtruog%'`
    );
    console.log('=== Customer ctvtruogphong3 ===');
    for (const c of cust) {
        console.log(`  id=${c.id} name=${c.customer_name} crm=${c.crm_type} assigned=${c.assigned_to_id} (${c.username})`);
        console.log(`    appointment=${c.appointment_date} status=${c.status} order_status=${c.order_status} cancel=${c.cancel_approved}`);
    }
    
    // Check consultation logs
    const logs = await db.all(
        `SELECT cl.id, cl.customer_id, cl.log_type, cl.logged_by, cl.created_at::text
         FROM consultation_logs cl
         WHERE cl.customer_id IN (SELECT id FROM customers WHERE customer_name ILIKE '%ctvtruog%')
         AND cl.created_at::date = '2026-05-13'`
    );
    console.log('\n=== Consultation logs on 2026-05-13 ===');
    console.log(logs);

    // Check conversion requests
    const ccr = await db.all(
        `SELECT * FROM crm_conversion_requests
         WHERE customer_id IN (SELECT id FROM customers WHERE customer_name ILIKE '%ctvtruog%')`
    );
    console.log('\n=== Conversion requests ===');
    console.log(ccr);

    // Check ALL customer_penalty_records for user 51 
    const pr = await db.all(
        `SELECT * FROM customer_penalty_records WHERE user_id = 51 ORDER BY penalty_date DESC`
    );
    console.log('\n=== ALL penalty records for user 51 ===');
    console.log(pr);

    // Check ALL distinct crm_types in customers assigned to user 51 with appointment 2026-05-13
    const types = await db.all(
        `SELECT c.id, c.customer_name, c.crm_type, c.appointment_date, c.order_status, c.cancel_approved
         FROM customers c
         WHERE c.assigned_to_id = 51 AND c.appointment_date = '2026-05-13'`
    );
    console.log('\n=== ALL user 51 customers with appointment 2026-05-13 ===');
    for (const t of types) console.log(`  id=${t.id} name=${t.customer_name} crm=${t.crm_type} status=${t.order_status} cancel=${t.cancel_approved}`);
    
    process.exit(0);
})();
