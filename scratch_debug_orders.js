const db = require('./db/pool');

async function debug() {
    await db.init();
    
    // Find CTV1 user
    const ctv1 = await db.get("SELECT id, full_name, assigned_to_user_id FROM users WHERE full_name LIKE '%CTV1%'");
    console.log('CTV1:', ctv1);
    
    // Find KHÁCH 1 (the parent affiliate)
    const khach1 = await db.get("SELECT id, full_name FROM users WHERE id = 13");
    console.log('KHÁCH 1 (parent):', khach1);
    
    // Get CTV1's referred customers
    const ctv1Customers = await db.all('SELECT id, customer_name, referrer_id FROM customers WHERE referrer_id = ?', [ctv1.id]);
    console.log('\nCTV1 referred customers:', ctv1Customers);
    
    // Check orders for CTV1's customers
    if (ctv1Customers.length > 0) {
        const custIds = ctv1Customers.map(c => c.id);
        const ph = custIds.map((_, i) => '$' + (i + 1)).join(',');
        const orders = await db.all(`
            SELECT oc.id, oc.order_code, oc.status, oi.customer_id, c.customer_name,
                   COALESCE(oi.total, 0) as total
            FROM order_items oi
            LEFT JOIN order_codes oc ON oi.order_code_id = oc.id
            LEFT JOIN customers c ON oi.customer_id = c.id
            WHERE oi.customer_id IN (${ph})
        `, custIds);
        console.log('\nOrders for CTV1 customers:', orders);
    }
    
    // Now check what KHÁCH 1 sees (allIds = [13, ...childIds])
    const children = await db.all("SELECT id, full_name FROM users WHERE assigned_to_user_id = 13");
    console.log('\nKHÁCH 1 children:', children);
    
    const allIds = [13, ...children.map(c => c.id)];
    console.log('allIds for totalOrders query:', allIds);
    
    // Count orders for ALL referred customers (same as API)
    const allCustomers = await db.all(`SELECT id, customer_name, referrer_id FROM customers WHERE referrer_id IN (${allIds.map((_, i) => '$' + (i + 1)).join(',')})`, allIds);
    console.log('\nAll referred customers count:', allCustomers.length);
    
    if (allCustomers.length > 0) {
        const custIds = allCustomers.map(c => c.id);
        const ph = custIds.map((_, i) => '$' + (i + 1)).join(',');
        const cnt = await db.get(`SELECT COUNT(DISTINCT oc.id) as cnt FROM order_items oi LEFT JOIN order_codes oc ON oi.order_code_id = oc.id WHERE oi.customer_id IN (${ph}) AND (oc.status IS NULL OR oc.status != 'cancelled')`, custIds);
        console.log('Total orders (same as API):', cnt);
    }
    
    process.exit(0);
}
debug().catch(e => { console.error(e); process.exit(1); });
