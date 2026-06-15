const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();

    console.log('=== DISTINCT ROLES ===');
    const roles = await client.query(`SELECT distinct role FROM users`);
    console.log(roles.rows);

    console.log('\n=== USERS NAMED TRINH OR SIMILAR ===');
    const trinh = await client.query(`SELECT id, username, full_name, role, status FROM users WHERE username ILIKE '%trinh%' OR full_name ILIKE '%trinh%'`);
    console.log(trinh.rows);

    console.log('\n=== SOME SAMPLE USERS ===');
    const sample = await client.query(`SELECT id, username, full_name, role, status FROM users LIMIT 20`);
    console.log(sample.rows);

    await client.end();
}
check();
