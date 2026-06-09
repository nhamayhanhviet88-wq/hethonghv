const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();

    console.log('=== SEWING_RECORDS COLUMNS ===');
    const cols = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'sewing_records'
    `);
    console.log(cols.rows);

    await client.end();
}
check();
