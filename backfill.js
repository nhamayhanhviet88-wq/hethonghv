require('dotenv').config();
const pg = require('pg');
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
    // Get current customer data for fc:2
    const cust = await p.query('SELECT * FROM dht_free_customers WHERE id = 2');
    console.log('Customer fc:2:', cust.rows[0]);

    // Sync ALL linked orders to match current customer data
    const result = await p.query(`
        UPDATE dht_orders 
        SET customer_phone = fc.phone, 
            address = fc.address, 
            province = fc.province,
            customer_name = fc.name
        FROM dht_free_customers fc 
        WHERE dht_orders.free_customer_id = fc.id 
          AND dht_orders.free_customer_id IS NOT NULL
        RETURNING dht_orders.order_code, dht_orders.customer_phone, dht_orders.address, dht_orders.province
    `);
    console.log('\nSynced', result.rows.length, 'orders:');
    result.rows.forEach(r => console.log(r.order_code, '|', r.customer_phone, '|', r.address, '|', r.province));
    await p.end();
})();
