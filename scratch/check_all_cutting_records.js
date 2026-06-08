const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();

    console.log('=== TOTAL COUNT OF CUTTING RECORDS ===');
    const cnt = await client.query(`SELECT COUNT(*)::int AS count FROM cutting_records`);
    console.log(cnt.rows);

    console.log('\n=== LATEST 10 CUTTING RECORDS ===');
    const records = await client.query(`SELECT id, dht_order_id, order_item_id, product_name, material_name, fabric_color, is_cut_done FROM cutting_records ORDER BY id DESC LIMIT 10`);
    console.dir(records.rows, { depth: null });

    await client.end();
}
check();
