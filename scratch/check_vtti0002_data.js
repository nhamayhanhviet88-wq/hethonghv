const { Client } = require('pg');
require('dotenv').config();

async function check() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();
    
    console.log('=== DHT_ORDERS ===');
    const orderRes = await client.query(`SELECT id, order_code, expected_ship_date, standard_delivery_time FROM dht_orders WHERE order_code = 'VTTI0002'`);
    console.log(orderRes.rows);

    if (orderRes.rows.length > 0) {
        const orderId = orderRes.rows[0].id;

        console.log('\n=== DHT_ORDER_ITEMS ===');
        const itemsRes = await client.query(`SELECT id, dht_order_id, product_name, quantity, material_name, color_name FROM dht_order_items WHERE dht_order_id = $1`, [orderId]);
        console.log(itemsRes.rows);

        const itemIds = itemsRes.rows.map(it => it.id);

        console.log('\n=== CUTTING_RECORDS ===');
        const cutRes = await client.query(`SELECT id, order_item_id, product_name, material_name, fabric_color, is_cutting, is_cut_done, cut_quantity FROM cutting_records WHERE order_item_id = ANY($1)`, [itemIds]);
        console.log(cutRes.rows);
    }
    
    await client.end();
}
check();
