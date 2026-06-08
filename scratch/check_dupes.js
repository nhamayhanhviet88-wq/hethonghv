const { Client } = require('pg');
require('dotenv').config();

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    
    // Check all unreported duplicate pressing records
    const res = await client.query(`
        SELECT order_item_id, COUNT(*), ARRAY_AGG(id) as ids, ARRAY_AGG(product_name) as names 
        FROM pressing_records 
        WHERE is_reported = false 
        GROUP BY order_item_id 
        HAVING COUNT(*) > 1
    `);
    
    console.log('Duplicate unreported pressing records:', res.rows);
    await client.end();
}

main().catch(console.error);
