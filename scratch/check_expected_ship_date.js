const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();
    const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'dht_orders' AND column_name = 'expected_ship_date'
    `);
    console.log('Column Schema:', res.rows);
    const sample = await client.query(`
        SELECT expected_ship_date 
        FROM dht_orders 
        WHERE expected_ship_date IS NOT NULL 
        LIMIT 5
    `);
    console.log('Sample Values:', sample.rows);
    await client.end();
}
check();
