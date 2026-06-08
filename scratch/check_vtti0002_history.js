const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();

    console.log('=== QLX_HISTORY ===');
    const qlxHist = await client.query(`SELECT * FROM qlx_history WHERE dht_order_id = 22 ORDER BY id DESC`);
    console.log(qlxHist.rows);

    console.log('\n=== CUTTING_HISTORY ===');
    const cutHist = await client.query(`
        SELECT ch.* FROM cutting_history ch
        JOIN cutting_records cr ON ch.cutting_id = cr.id
        WHERE cr.dht_order_id = 22 ORDER BY ch.id DESC
    `);
    console.log(cutHist.rows);

    console.log('\n=== OTHER ORDERS WITH CODE VTTI0002 ===');
    const otherOrders = await client.query(`SELECT id, order_code, created_at FROM dht_orders WHERE order_code ILIKE '%VTTI0002%'`);
    console.log(otherOrders.rows);

    await client.end();
}
check();
