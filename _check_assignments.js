const db = require('./db/pool');
setTimeout(async () => {
    // Check truongphong1's lock task assignments before
    const tp1 = await db.get("SELECT id FROM users WHERE username = 'truongphong1'");
    console.log('truongphong1 id:', tp1.id);
    
    const assignments = await db.all(
        `SELECT lta.lock_task_id, lt.task_name 
         FROM lock_task_assignments lta
         JOIN lock_tasks lt ON lt.id = lta.lock_task_id AND lt.is_active = true
         WHERE lta.user_id = $1
         ORDER BY lt.task_name`, [tp1.id]
    );
    console.log('\nCV Khóa assignments:');
    assignments.forEach(a => console.log(`  🔐 ${a.task_name} (task_id=${a.lock_task_id})`));
    
    // Check chain task assignments
    const chains = await db.all(
        `SELECT DISTINCT ci.id as instance_id, ci.chain_name
         FROM chain_task_instances ci
         JOIN chain_task_instance_items cii ON cii.chain_instance_id = ci.id
         JOIN chain_task_assignments ca ON ca.chain_item_id = cii.id AND ca.user_id = $1
         WHERE ci.status != 'cancelled'
         ORDER BY ci.chain_name`, [tp1.id]
    );
    console.log('\nCV Chuỗi assignments:');
    chains.forEach(c => console.log(`  🔗 ${c.chain_name} (instance_id=${c.instance_id})`));
    
    process.exit();
}, 500);
