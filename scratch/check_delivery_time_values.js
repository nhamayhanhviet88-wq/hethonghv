const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();
    const res = await client.query(`
        SELECT id, order_code, expected_ship_date, standard_delivery_time 
        FROM dht_orders 
        WHERE standard_delivery_time IS NOT NULL 
        LIMIT 10
    `);
    console.log('Results:', res.rows);
    await client.end();
}
check();
