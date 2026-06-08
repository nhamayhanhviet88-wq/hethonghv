const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();

    console.log('=== CUTTING RECORDS FOR ORDER 22 ===');
    const records = await client.query(`SELECT * FROM cutting_records WHERE dht_order_id = 22`);
    console.log(records.rows);

    await client.end();
}
check();
