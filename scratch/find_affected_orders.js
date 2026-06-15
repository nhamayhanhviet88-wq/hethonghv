const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv"
});

async function main() {
    await client.connect();
    
    const res = await client.query(`
        SELECT o.id, o.order_code, o.shipping_status, o.shipped_at, o.actual_carrier_id,
               (SELECT COUNT(*) FROM dht_order_items WHERE dht_order_id = o.id) AS total_items,
               (SELECT COUNT(*) FROM dht_order_items WHERE dht_order_id = o.id AND shipping_status = 'pending') AS pending_items
        FROM dht_orders o
        WHERE o.shipping_status = 'shipped'
          AND EXISTS (SELECT 1 FROM dht_order_items WHERE dht_order_id = o.id AND shipping_status = 'pending')
        ORDER BY o.shipped_at DESC
    `);
    
    console.log(`Found ${res.rows.length} affected orders:`);
    console.log(res.rows);

    await client.end();
}

main().catch(console.error);
