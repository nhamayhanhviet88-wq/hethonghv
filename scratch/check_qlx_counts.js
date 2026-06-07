const db = require('../db/pool');

async function run() {
    try {
        console.log('--- RUNNING UPDATED ALL FILTER QUERY ---');
        const ordersAll = await db.all(`
            SELECT o.id, o.order_code, o.shipping_status, p.is_completed
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id AND p.item_id IS NULL
            WHERE 1=1 
              AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM') 
              AND o.order_code NOT ILIKE '%TEM%' 
              AND o.order_code NOT ILIKE '%PET%'
              AND (COALESCE(p.is_completed, false) = true OR COALESCE(o.shipping_status, '') != 'shipped')
            ORDER BY o.id
        `);
        console.log('Total Orders returned with updated ALL filter:', ordersAll.length);
        for (const o of ordersAll) {
            console.log(`Order: ${o.order_code}, shipping_status: ${o.shipping_status}, is_completed: ${o.is_completed}`);
        }
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

run();
