const db = require('../db/pool');

async function test() {
    try {
        const search = 'AFF'; // standard search term
        const where = `(cr.product_name ILIKE $1 OR cr.material_name ILIKE $1 OR o.order_code ILIKE $1 OR o.customer_name ILIKE $1 OR u_cutter.full_name ILIKE $1)`;
        const params = [`%${search}%`];
        
        const query = `
            SELECT cr.id, cr.dht_order_id, o.order_code, o.customer_name, u_cutter.full_name as cutter_name
            FROM cutting_records cr
            LEFT JOIN users u_cutter ON cr.cutter_id = u_cutter.id
            LEFT JOIN dht_orders o ON cr.dht_order_id = o.id
            WHERE ${where}
            LIMIT 5
        `;
        
        const records = await db.all(query, params);
        console.log('Search Results:', records);
        process.exit(0);
    } catch(e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
}

test();
