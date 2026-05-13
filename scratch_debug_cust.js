const db = require('./db/pool');
(async () => {
    // Find chuyendoiafìliate customer
    const cust = await db.all(
        `SELECT c.id, c.customer_name, c.crm_type, c.assigned_to_id, c.appointment_date, 
                c.order_status, c.cancel_approved, c.receiver_id,
                u.full_name as assigned_name
         FROM customers c
         LEFT JOIN users u ON u.id = c.assigned_to_id
         WHERE c.customer_name ILIKE '%chuyendoi%'`
    );
    console.log('=== Customer chuyendoiafìliate ===');
    for (const c of cust) {
        console.log(`  id=${c.id} name=${c.customer_name} crm=${c.crm_type} assigned=${c.assigned_to_id} (${c.assigned_name})`);
        console.log(`    appointment=${c.appointment_date} status=${c.order_status} cancel=${c.cancel_approved} receiver=${c.receiver_id}`);
    }
    
    // Check emergency for this customer
    const em = await db.all(
        `SELECT e.id, e.customer_id, e.status, e.requested_by, e.handler_id, e.handover_to, e.reason,
                e.created_at::text
         FROM emergencies e
         WHERE e.customer_id IN (SELECT id FROM customers WHERE customer_name ILIKE '%chuyendoi%')`
    );
    console.log('\n=== Emergency records ===');
    for (const e of em) {
        console.log(`  id=${e.id} customer=${e.customer_id} status=${e.status} handler=${e.handler_id} handover=${e.handover_to} reason=${e.reason}`);
    }
    
    // Check conversion requests
    const ccr = await db.all(
        `SELECT ccr.* FROM crm_conversion_requests ccr
         WHERE ccr.customer_id IN (SELECT id FROM customers WHERE customer_name ILIKE '%chuyendoi%')`
    );
    console.log('\n=== Conversion requests ===');
    console.log(ccr);
    
    // Check consultation logs today
    const logs = await db.all(
        `SELECT cl.id, cl.customer_id, cl.log_type, cl.logged_by, cl.created_at::text
         FROM consultation_logs cl
         WHERE cl.customer_id IN (SELECT id FROM customers WHERE customer_name ILIKE '%chuyendoi%')
         AND cl.created_at::date = '2026-05-13'`
    );
    console.log('\n=== Consultation logs on 2026-05-13 ===');
    console.log(logs);
    
    // Check penalty records for user 51
    const pr = await db.all(
        `SELECT * FROM customer_penalty_records WHERE user_id = 51 AND penalty_date = '2026-05-13'`
    );
    console.log('\n=== Penalty records for user 51 on 2026-05-13 ===');
    console.log(pr);
    
    process.exit(0);
})();
