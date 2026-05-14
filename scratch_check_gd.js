const db = require('./db/pool');

(async () => {
    // Check time override config
    const overrideCfg = await db.get("SELECT value FROM app_config WHERE key = 'system_time_override'");
    console.log('=== Time Override ===');
    console.log(overrideCfg?.value || 'Not set');

    // Get ALL penalty records for user_id = 1
    const allPenalties = await db.all(
        `SELECT * FROM customer_penalty_records WHERE user_id = 1 ORDER BY penalty_date DESC`
    );
    console.log('\n=== ALL penalties for GĐ (user_id=1) ===');
    console.log(JSON.stringify(allPenalties, null, 2));

    // Check what KH are assigned to GĐ with appointment dates
    const khWithDates = await db.all(
        `SELECT c.id, c.customer_name, c.crm_type, c.appointment_date::text as appt, c.order_status
         FROM customers c
         WHERE c.assigned_to_id = 1
           AND c.cancel_approved != 1
           AND c.order_status NOT IN ('hoan_thanh', 'duyet_huy')
           AND c.appointment_date IS NOT NULL
         ORDER BY c.appointment_date DESC`
    );
    console.log('\n=== KH with appointment dates assigned to GĐ ===');
    console.log(JSON.stringify(khWithDates, null, 2));

    process.exit(0);
})();
