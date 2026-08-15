const db = require('./db/pool');

async function getFullSystemSnapshot() {
    const year = 2026;
    const month = 8;
    const todayStr = '2026-08-15';

    // 1. Orders breakdown
    const dongPhuc = await db.get(`
        SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue
        FROM dht_orders
        WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2
          AND (is_draft IS NOT TRUE) AND (category_id != 9 OR category_id IS NULL)
    `, [year, month]);

    const temPet = await db.get(`
        SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue
        FROM dht_orders
        WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2
          AND (is_draft IS NOT TRUE) AND category_id = 9
    `, [year, month]);

    const totalCompany = await db.get(`
        SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as revenue
        FROM dht_orders
        WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2
          AND (is_draft IS NOT TRUE)
    `, [year, month]);

    // 2. Marketing Breakdown by Channel
    const mktChannels = await db.all(`
        SELECT channel_name, COALESCE(SUM(spent_amount), 0) as spent, COALESCE(SUM(lead_count), 0) as leads
        FROM marketing_budgets
        WHERE budget_year = $1 AND budget_month = $2
        GROUP BY channel_name
    `, [year, String(month)]);

    // 3. Overall Marketing Total
    const mktTotal = await db.get(`
        SELECT COALESCE(SUM(spent_amount), 0) as spent, COALESCE(SUM(lead_count), 0) as leads
        FROM marketing_budgets
        WHERE budget_year = $1 AND budget_month = $2
    `, [year, String(month)]);

    // 4. Delayed Orders
    const delayedOrders = await db.get(`
        SELECT COUNT(*) as count
        FROM dht_orders
        WHERE (is_draft IS NOT TRUE)
          AND created_at < NOW() - INTERVAL '48 hours'
    `);

    // 5. Active Staff Count
    const activeStaff = await db.get(`SELECT COUNT(*) as count FROM users`);

    const dpOrders = Number(dongPhuc?.orders || 0);
    const dpRev = Number(dongPhuc?.revenue || 0);
    const petOrders = Number(temPet?.orders || 0);
    const petRev = Number(temPet?.revenue || 0);
    const totOrders = Number(totalCompany?.orders || 0);
    const totRev = Number(totalCompany?.revenue || 0);
    const totalLeads = Number(mktTotal?.leads || 0);
    const totalSpent = Number(mktTotal?.spent || 0);

    const dpConvRate = totalLeads > 0 ? ((dpOrders / totalLeads) * 100).toFixed(2) : '0.00';
    const petConvRate = totalLeads > 0 ? ((petOrders / totalLeads) * 100).toFixed(2) : '0.00';
    const totConvRate = totalLeads > 0 ? ((totOrders / totalLeads) * 100).toFixed(2) : '0.00';
    const cpl = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;

    return {
        month: `${month}/${year}`,
        dong_phuc: { orders: dpOrders, revenue: dpRev, conv_rate: `${dpConvRate}%` },
        tem_pet: { orders: petOrders, revenue: petRev, conv_rate: `${petConvRate}%` },
        tong_cong_ty: { orders: totOrders, revenue: totRev, conv_rate: `${totConvRate}%` },
        marketing: { spent: totalSpent, leads: totalLeads, cpl: cpl, channels: mktChannels },
        delayed_orders_48h: Number(delayedOrders?.count || 0),
        active_staff_count: Number(activeStaff?.count || 0)
    };
}

(async () => {
    try {
        console.log('--- FULL SYSTEM SNAPSHOT ---');
        console.log(JSON.stringify(await getFullSystemSnapshot(), null, 2));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
