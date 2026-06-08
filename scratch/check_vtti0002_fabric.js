const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();

    console.log('=== FABRIC CALLS ===');
    const calls = await client.query(`SELECT * FROM order_fabric_calls WHERE dht_order_id = 22`);
    console.log(calls.rows);

    console.log('\n=== WAREHOUSE STOCK ASSIGNMENTS ===');
    const stock = await client.query(`SELECT * FROM order_warehouse_fabric WHERE dht_order_id = 22`);
    console.log(stock.rows);

    await client.end();
}
check();
