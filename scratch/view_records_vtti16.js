const { Client } = require('pg');
require('dotenv').config();

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    
    const res = await client.query(`
        SELECT * FROM pressing_records WHERE product_name LIKE '%CTV-VTTI0016%'
    `);
    console.log(res.rows);
    await client.end();
}

main().catch(console.error);
