const db = require('./db/pool');

async function dumpAll() {
    try {
        console.log('--- ALL UNPAID DHT_ORDERS IN SYSTEM ---');
        const orders = await db.all(`
            SELECT o.id, o.order_code, o.order_date, o.shipped_at, o.expected_ship_date, o.rescheduled_ship_date, o.total_amount, o.discount_amount, o.created_by,
                COALESCE((SELECT SUM(amount) FROM payment_records WHERE total_order_codes ILIKE '%' || o.order_code || '%' OR order_tt_coc = o.order_code), 0) AS deposit_total
            FROM dht_orders o
            ORDER BY o.order_date DESC
        `);

        console.log('Total orders:', orders.length);

        console.log('--- FILTERING UNPAID ORDERS ---');
        let unpaidCount = 0;
        for (const o of orders) {
            const shipCkDeduct = 0; // simplify for now
            const remaining = Number(o.total_amount || 0) - Number(o.discount_amount || 0) - Number(o.deposit_total || 0);
            if (remaining > 0) {
                unpaidCount++;
                // Let's get its items
                const items = await db.all("SELECT id, quantity, shipping_status, shipping_date, actual_carrier_id FROM dht_order_items WHERE dht_order_id = $1", [o.id]);
                const hasJune = (o.order_date && o.order_date.includes('2026-06')) || 
                                (o.shipped_at && o.shipped_at.toISOString && o.shipped_at.toISOString().includes('2026-06')) ||
                                items.some(it => it.shipping_date && it.shipping_date.includes('2026-06'));
                
                if (hasJune) {
                    console.log(`Order: ${o.order_code} | id: ${o.id} | created_by: ${o.created_by}`);
                    console.log(`  order_date: ${o.order_date}`);
                    console.log(`  shipped_at: ${o.shipped_at}`);
                    console.log(`  total: ${o.total_amount} | remaining: ${remaining}`);
                    console.log(`  items:`, items);
                }
            }
        }
        console.log('Total unpaid:', unpaidCount);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

dumpAll();
