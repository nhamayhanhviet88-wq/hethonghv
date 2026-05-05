const db = require('./db/pool');
(async () => {
    await db.init();

    // 1. All orders this month
    const r1 = await db.all("SELECT COUNT(*) as cnt FROM order_codes WHERE created_at >= '2026-05-01' AND created_at < '2026-06-01'");
    console.log('ALL ORDERS T5:', JSON.stringify(r1));

    // 2. Completed orders with hoan_thanh this month
    const r2 = await db.all(`SELECT COUNT(*) as cnt FROM order_codes oc
        JOIN customers c ON oc.customer_id = c.id
        WHERE oc.created_at >= '2026-05-01' AND oc.created_at < '2026-06-01'
        AND EXISTS (SELECT 1 FROM consultation_logs cl WHERE cl.customer_id = oc.customer_id AND cl.log_type = 'hoan_thanh')`);
    console.log('COMPLETED T5:', JSON.stringify(r2));

    // 3. Check cancel_approved filter
    const r3 = await db.all(`SELECT COUNT(*) as cnt FROM order_codes oc
        JOIN customers c ON oc.customer_id = c.id
        WHERE oc.created_at >= '2026-05-01' AND oc.created_at < '2026-06-01'
        AND COALESCE(c.cancel_approved, 0) != 1
        AND c.phone IS NOT NULL AND c.phone != ''
        AND EXISTS (SELECT 1 FROM consultation_logs cl WHERE cl.customer_id = oc.customer_id AND cl.log_type = 'hoan_thanh')`);
    console.log('WITH PHONE+NOT CANCELLED T5:', JSON.stringify(r3));

    // 4. KD Users
    const r4 = await db.all("SELECT id, full_name, department_id FROM users WHERE department_id IN (SELECT id FROM departments WHERE id=1 OR parent_id=1) AND status = 'active' AND role NOT IN ('giam_doc')");
    console.log('KD USERS:', r4.length, r4.map(u => u.full_name + '('+u.id+')'));

    // 5. Leaderboard query
    const userIds = r4.map(u => u.id);
    if (userIds.length > 0) {
        const ph = userIds.map((_, i) => `$${i + 1}`).join(',');
        const pStart = userIds.length + 1;
        const pEnd = userIds.length + 2;
        const r5 = await db.all(`
            SELECT c.assigned_to_id AS uid, COUNT(*) AS total_orders
            FROM order_codes oc
            JOIN customers c ON oc.customer_id = c.id
            WHERE c.assigned_to_id IN (${ph})
              AND c.phone IS NOT NULL AND c.phone != ''
              AND COALESCE(c.cancel_approved, 0) != 1
              AND oc.created_at >= $${pStart}::timestamp AND oc.created_at < $${pEnd}::timestamp
              AND EXISTS (SELECT 1 FROM consultation_logs cl WHERE cl.customer_id = oc.customer_id AND cl.log_type = 'hoan_thanh')
            GROUP BY c.assigned_to_id
        `, [...userIds, '2026-05-01', '2026-06-01']);
        console.log('LEADERBOARD RESULT:', JSON.stringify(r5));
    }

    // 6. Customers assigned this month
    if (userIds.length > 0) {
        const ph = userIds.map((_, i) => `$${i + 1}`).join(',');
        const pStart = userIds.length + 1;
        const pEnd = userIds.length + 2;
        const r6 = await db.get(`
            SELECT COUNT(DISTINCT c.id) AS cnt FROM customers c
            WHERE c.assigned_to_id IN (${ph})
              AND c.created_at >= $${pStart}::timestamp AND c.created_at < $${pEnd}::timestamp
        `, [...userIds, '2026-05-01', '2026-06-01']);
        console.log('ASSIGNED T5:', JSON.stringify(r6));
    }

    process.exit();
})().catch(e => { console.error(e); process.exit(1); });
