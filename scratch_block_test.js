const db = require('./db/pool');
(async () => {
    const userId = 47;
    
    // ALL emergencies for dovandoanh
    const emergencies = await db.all(
        `SELECT e.id, e.customer_id, e.handler_id, e.handover_to, e.reason, e.status,
                e.penalty_applied, e.penalty_amount, e.created_at::text,
                e.resolved_at::text,
                c.customer_name
         FROM emergencies e
         LEFT JOIN customers c ON c.id = e.customer_id
         WHERE e.handler_id = $1 OR e.handover_to = $1
         ORDER BY e.created_at DESC`,
        [userId]
    );
    console.log(`Emergencies for dovandoanh (id=${userId}): ${emergencies.length}`);
    emergencies.forEach(e => {
        console.log(`  id=${e.id} customer=${e.customer_name} status=${e.status} penalty=${e.penalty_applied} amt=${e.penalty_amount} handler=${e.handler_id} handover=${e.handover_to} created=${e.created_at}`);
    });

    // Check penalty dashboard: emergencies with penalty_applied for 13/5
    const penOn13 = await db.all(
        `SELECT e.id, e.penalty_amount, e.created_at::date::text as task_date
         FROM emergencies e
         WHERE (e.handler_id = $1 OR e.handover_to = $1)
         AND e.penalty_applied = true
         AND e.created_at::date = '2026-05-13'::date`,
        [userId]
    );
    console.log(`\nPenalty emergencies for 13/5: ${penOn13.length}`);
    penOn13.forEach(r => console.log(`  id=${r.id} amt=${r.penalty_amount} date=${r.task_date}`));
    
    // Also all dates
    const penAll = await db.all(
        `SELECT e.id, e.penalty_amount, e.created_at::date::text as task_date
         FROM emergencies e
         WHERE (e.handler_id = $1 OR e.handover_to = $1)
         AND e.penalty_applied = true`,
        [userId]
    );
    console.log(`\nALL penalty emergencies: ${penAll.length}`);
    penAll.forEach(r => console.log(`  id=${r.id} amt=${r.penalty_amount} date=${r.task_date}`));
    
    process.exit();
})();
