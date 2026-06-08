const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();
    const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'dht_orders' AND (column_name LIKE '%time%' OR column_name LIKE '%date%' OR column_name LIKE '%hour%' OR column_name LIKE '%expected%')
    `);
    console.log('Columns:', res.rows);
    await client.end();
}
check();
