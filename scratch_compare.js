const db = require('./db/pool');
(async () => {
    // Test the FIXED query: appointment_date::date = '2026-05-13'::date
    const results = await db.all(
        `SELECT c.assigned_to_id as user_id, c.crm_type, 
                COUNT(*) as total_customers,
                COUNT(*) FILTER (WHERE NOT EXISTS (
                    SELECT 1 FROM consultation_logs cl 
                    WHERE cl.customer_id = c.id 
                    AND cl.logged_by = c.assigned_to_id
                    AND cl.created_at::date = $1::date
                )) as unhandled_count
         FROM customers c
         WHERE c.appointment_date::date = $1::date
         AND c.assigned_to_id IS NOT NULL
         AND c.cancel_approved != 1
         AND c.order_status NOT IN ('hoan_thanh', 'duyet_huy')
         AND NOT EXISTS (SELECT 1 FROM crm_conversion_requests ccr WHERE ccr.customer_id = c.id AND ccr.status = 'pending')
         GROUP BY c.assigned_to_id, c.crm_type
         HAVING COUNT(*) FILTER (WHERE NOT EXISTS (
             SELECT 1 FROM consultation_logs cl 
             WHERE cl.customer_id = c.id 
             AND cl.logged_by = c.assigned_to_id
             AND cl.created_at::date = $1::date
         )) > 0`,
        ['2026-05-13']
    );
    console.log('=== FIXED query results (appointment_date::date) ===');
    for (const r of results) {
        console.log(`  user=${r.user_id} crm=${r.crm_type} total=${r.total_customers} unhandled=${r.unhandled_count}`);
    }
    
    // Compare with OLD query
    const oldResults = await db.all(
        `SELECT c.assigned_to_id as user_id, c.crm_type, 
                COUNT(*) as total_customers,
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
         AND NOT EXISTS (SELECT 1 FROM crm_conversion_requests ccr WHERE ccr.customer_id = c.id AND ccr.status = 'pending')
         GROUP BY c.assigned_to_id, c.crm_type
         HAVING COUNT(*) FILTER (WHERE NOT EXISTS (
             SELECT 1 FROM consultation_logs cl 
             WHERE cl.customer_id = c.id 
             AND cl.logged_by = c.assigned_to_id
             AND cl.created_at::date = $1::date
         )) > 0`,
        ['2026-05-13']
    );
    console.log('\n=== OLD query results (appointment_date = text) ===');
    for (const r of oldResults) {
        console.log(`  user=${r.user_id} crm=${r.crm_type} total=${r.total_customers} unhandled=${r.unhandled_count}`);
    }
    
    process.exit(0);
})();
