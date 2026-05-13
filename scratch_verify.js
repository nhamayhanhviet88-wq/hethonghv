const db = require('./db/pool');
(async () => {
    const yesterday = '2026-05-13';
    
    // Source 1: CV Khóa
    const ltc = await db.all(
        `SELECT ltc.user_id, lt.task_name, ltc.completion_date::text as task_date, ltc.penalty_amount
         FROM lock_task_completions ltc
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         WHERE ltc.status = 'expired' AND ltc.penalty_applied = true
           AND ltc.completion_date = $1::date`, [yesterday]
    );
    console.log('=== Source 1: CV Khóa ===');
    for (const r of ltc) console.log(`  user=${r.user_id} task=${r.task_name} date=${r.task_date} penalty=${r.penalty_amount}`);
    
    // Source 5: KH Chưa XL
    const cp = await db.all(
        `SELECT user_id, crm_type, unhandled_count, penalty_amount, penalty_date::text as task_date
         FROM customer_penalty_records
         WHERE penalty_date = $1::date AND acknowledged = false`, [yesterday]
    );
    console.log('\n=== Source 5: KH Chưa XL ===');
    for (const r of cp) console.log(`  user=${r.user_id} type=${r.crm_type} count=${r.unhandled_count} penalty=${r.penalty_amount}`);
    
    // Emergencies
    const em = await db.all(
        `SELECT COALESCE(e.handover_to, e.handler_id) as user_id, e.reason, e.penalty_amount, e.penalty_applied,
                e.last_penalty_at::text, c.customer_name
         FROM emergencies e
         LEFT JOIN customers c ON c.id = e.customer_id
         WHERE e.penalty_applied = true`, []
    );
    console.log('\n=== Emergencies with penalties ===');
    for (const r of em) console.log(`  user=${r.user_id} name=${r.customer_name} penalty=${r.penalty_amount} last=${r.last_penalty_at}`);
    
    process.exit(0);
})();
