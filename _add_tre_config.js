const { Pool, types } = require('pg');
types.setTypeParser(1082, val => val);
const pool = new Pool({
    connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
});

(async () => {
    const today = '2026-04-18';
    
    // === Section 8: KH chưa xử lý hôm nay ===
    const todayGroups = await pool.query(
        `SELECT c.assigned_to_id as user_id, c.crm_type,
                COUNT(*) FILTER (WHERE NOT EXISTS (
                    SELECT 1 FROM consultation_logs cl 
                    WHERE cl.customer_id = c.id 
                    AND cl.logged_by = c.assigned_to_id
                    AND cl.created_at::date = $1::date
                )) as unhandled_count
         FROM customers c
         WHERE c.appointment_date = $1::text
         AND c.assigned_to_id IS NOT NULL
         AND c.cancel_approved != 1
         AND c.order_status NOT IN ('hoan_thanh', 'duyet_huy')
         GROUP BY c.assigned_to_id, c.crm_type
         HAVING COUNT(*) FILTER (WHERE NOT EXISTS (
             SELECT 1 FROM consultation_logs cl 
             WHERE cl.customer_id = c.id 
             AND cl.logged_by = c.assigned_to_id
             AND cl.created_at::date = $1::date
         )) > 0`,
        [today]
    );
    console.log('=== Section 8: KH chưa XL hôm nay ===');
    console.log('Groups found:', todayGroups.rows.length);
    for (const g of todayGroups.rows) {
        console.log(`  user=${g.user_id} crm=${g.crm_type} unhandled=${g.unhandled_count}`);
        await pool.query(
            `INSERT INTO customer_penalty_records (user_id, penalty_date, crm_type, unhandled_count, penalty_amount)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, penalty_date, crm_type) DO NOTHING`,
            [g.user_id, today, g.crm_type, g.unhandled_count, 100000]
        );
    }

    // === Section 8c: KH xử lý trễ ===
    const overdueGroups = await pool.query(
        `SELECT c.assigned_to_id as user_id, c.crm_type,
                COUNT(*) FILTER (WHERE NOT EXISTS (
                    SELECT 1 FROM consultation_logs cl 
                    WHERE cl.customer_id = c.id 
                    AND cl.logged_by = c.assigned_to_id
                )) as unhandled_count
         FROM customers c
         WHERE c.appointment_date < $1::text
         AND c.assigned_to_id IS NOT NULL
         AND c.cancel_approved != 1
         AND c.order_status NOT IN ('hoan_thanh', 'duyet_huy')
         GROUP BY c.assigned_to_id, c.crm_type
         HAVING COUNT(*) FILTER (WHERE NOT EXISTS (
             SELECT 1 FROM consultation_logs cl 
             WHERE cl.customer_id = c.id 
             AND cl.logged_by = c.assigned_to_id
         )) > 0`,
        [today]
    );
    console.log('\n=== Section 8c: KH xử lý trễ ===');
    console.log('Groups found:', overdueGroups.rows.length);
    for (const g of overdueGroups.rows) {
        const treType = 'tre_' + g.crm_type;
        console.log(`  user=${g.user_id} crm=${treType} unhandled=${g.unhandled_count}`);
        await pool.query(
            `INSERT INTO customer_penalty_records (user_id, penalty_date, crm_type, unhandled_count, penalty_amount)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, penalty_date, crm_type) DO NOTHING`,
            [g.user_id, today, treType, g.unhandled_count, 100000]
        );
    }

    // Verify
    const all = await pool.query(
        "SELECT * FROM customer_penalty_records WHERE penalty_date = $1 ORDER BY user_id, crm_type",
        [today]
    );
    console.log('\n=== All penalty records for today ===');
    console.log(JSON.stringify(all.rows, null, 2));

    await pool.end();
})();
