const db = require('./db/pool');
(async () => {
    // truongphongtest3 = id 51
    const uid = 51;
    
    // Check lock_task_completions for truongphongtest3
    const ltc = await db.all(
        `SELECT ltc.*, lt.task_name 
         FROM lock_task_completions ltc 
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         WHERE ltc.user_id = $1 ORDER BY ltc.completion_date DESC LIMIT 20`, [uid]
    );
    console.log('=== CV Khóa completions ===');
    for (const r of ltc) {
        console.log(`  [${r.status}] ${r.task_name} date=${r.completion_date} redo=${r.redo_count} penalty=${r.penalty_amount} applied=${r.penalty_applied}`);
    }
    
    // Check customer_penalty_records  
    const cpr = await db.all(
        `SELECT * FROM customer_penalty_records WHERE user_id = $1 ORDER BY penalty_date DESC`, [uid]
    );
    console.log('\n=== Customer Penalty Records ===');
    console.log(JSON.stringify(cpr, null, 2));
    
    // Check affiliate customer
    const aff = await db.all(
        `SELECT id, customer_name, crm_type, appointment_date, order_status, cancel_approved
         FROM customers WHERE assigned_to_id = $1 AND crm_type = 'ctv_hoa_hong'`, [uid]
    );
    console.log('\n=== Affiliate Customers ===');
    console.log(JSON.stringify(aff, null, 2));
    
    // Check all customers assigned to this user
    const allKH = await db.all(
        `SELECT id, customer_name, crm_type, appointment_date, order_status
         FROM customers WHERE assigned_to_id = $1 ORDER BY appointment_date DESC`, [uid]
    );
    console.log('\n=== All Customers ===');
    for (const c of allKH) {
        console.log(`  [${c.crm_type}] ${c.customer_name} appt=${c.appointment_date} status=${c.order_status}`);
    }
    
    process.exit(0);
})();
