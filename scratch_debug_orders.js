const db = require('./db/pool');

async function debug() {
    await db.init();
    
    // Count all order_codes
    const allOC = await db.get('SELECT COUNT(*) as cnt FROM order_codes');
    console.log('Total order_codes:', allOC);

    // Count all order_items
    const allOI = await db.get('SELECT COUNT(*) as cnt FROM order_items');
    console.log('Total order_items:', allOI);

    // Sample order_codes
    const sampleOC = await db.all('SELECT id, customer_id, order_code, status FROM order_codes LIMIT 5');
    console.log('Sample order_codes:', sampleOC);

    // Sample order_items with customer_id
    const sampleOI = await db.all('SELECT id, customer_id, order_code_id FROM order_items LIMIT 5');
    console.log('Sample order_items:', sampleOI);

    // Get referred customers
    const referred = await db.all('SELECT id, customer_name, referrer_id FROM customers WHERE referrer_id IS NOT NULL LIMIT 20');
    console.log('Referred customers:', referred.length, referred.slice(0, 3));

    if (referred.length > 0) {
        const custIds = referred.map(r => r.id);
        const ph = custIds.map((_, i) => '$' + (i + 1)).join(',');
        
        // Count via order_items
        const cnt1 = await db.get(`SELECT COUNT(DISTINCT oc.id) as cnt FROM order_items oi LEFT JOIN order_codes oc ON oi.order_code_id = oc.id WHERE oi.customer_id IN (${ph}) AND (oc.status IS NULL OR oc.status != 'cancelled')`, custIds);
        console.log('Orders via order_items:', cnt1);
        
        // Count via order_codes directly
        const cnt2 = await db.get(`SELECT COUNT(*) as cnt FROM order_codes WHERE customer_id IN (${ph})`, custIds);
        console.log('Orders via order_codes.customer_id:', cnt2);
    }
    
    process.exit(0);
}
debug().catch(e => { console.error(e); process.exit(1); });
