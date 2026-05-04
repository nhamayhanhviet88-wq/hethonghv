require('dotenv').config();
const db = require('./db/pool');
(async () => {
    await db.init();
    const cust = await db.get("SELECT id, customer_name, crm_type, referrer_id, created_at FROM customers WHERE customer_name LIKE '%khnhucaunv3%'");
    console.log('Customer:', JSON.stringify(cust, null, 2));
    if (cust) {
        const conv = await db.all('SELECT * FROM crm_conversion_requests WHERE customer_id = $1', [cust.id]);
        console.log('Conversion records:', JSON.stringify(conv, null, 2));
        
        const orders = await db.all("SELECT oc.id, oc.created_at, oc.status, COALESCE(SUM(oi.total),0) as revenue FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id WHERE oc.customer_id = $1 GROUP BY oc.id, oc.created_at, oc.status", [cust.id]);
        console.log('Orders:', JSON.stringify(orders, null, 2));
    }
    process.exit(0);
})();
