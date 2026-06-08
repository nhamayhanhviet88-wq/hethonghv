const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();

    console.log('=== DHT_ORDER_ITEMS COLS ===');
    const itemsRes = await client.query(`SELECT * FROM dht_order_items WHERE dht_order_id = 22`);
    console.dir(itemsRes.rows, { depth: null });

    await client.end();
}
check();
