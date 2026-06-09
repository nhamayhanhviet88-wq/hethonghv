require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    try {
        console.log('--- Checking Printing Records for VTTI0009 ---');
        const printRes = await pool.query(`
            SELECT id, dht_order_id, order_item_id, product_name, print_field 
            FROM printing_records 
            WHERE product_name LIKE '%VTTI0009%' OR product_name LIKE '%P2%'
            ORDER BY id DESC LIMIT 20
        `);
        console.log(printRes.rows);

        console.log('--- Checking Pressing Records for VTTI0009 ---');
        const pressRes = await pool.query(`
            SELECT id, dht_order_id, order_item_id, product_name 
            FROM pressing_records 
            WHERE product_name LIKE '%VTTI0009%' OR product_name LIKE '%P2%'
            ORDER BY id DESC LIMIT 20
        `);
        console.log(pressRes.rows);

        console.log('--- Checking Cutting Records for VTTI0009 ---');
        const cutRes = await pool.query(`
            SELECT id, dht_order_id, order_item_id, product_name, material_name, fabric_color 
            FROM cutting_records 
            WHERE product_name LIKE '%VTTI0009%' OR product_name LIKE '%P2%'
            ORDER BY id DESC LIMIT 20
        `);
        console.log(cutRes.rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

main();
