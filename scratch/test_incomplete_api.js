const db = require('../db/pool');

async function test() {
    try {
        const year = 2026;
        const query = `
            SELECT cr.id, o.order_code, cr.product_name, cr.is_cut_done, u.full_name as cutter_name
            FROM cutting_records cr
            LEFT JOIN users u ON cr.cutter_id = u.id
            LEFT JOIN dht_orders o ON cr.dht_order_id = o.id
            WHERE EXTRACT(YEAR FROM COALESCE(cr.cut_date, cr.created_at)) = $1
              AND cr.is_cut_done = false
            LIMIT 5
        `;
        const records = await db.all(query, [year]);
        console.log('Incomplete Records for 2026:', records);
        process.exit(0);
    } catch(e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
}

test();
