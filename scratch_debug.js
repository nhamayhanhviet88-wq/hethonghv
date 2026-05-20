const db = require('./db/pool');
(async () => {
    const items = await db.all('SELECT id, sale_type, product_name, item_total, quantities FROM dht_order_items LIMIT 5');
    console.log('ITEMS:', JSON.stringify(items, null, 2));
    const pr = await db.all("SELECT id, payment_code, amount, total_order_codes FROM payment_records WHERE total_order_codes ILIKE '%AFF-VTTI0006%'");
    console.log('PAYMENTS:', JSON.stringify(pr, null, 2));
    const order = await db.get("SELECT id, order_code, deposit_payment_id FROM dht_orders WHERE order_code = 'AFF-VTTI0006'");
    console.log('ORDER:', JSON.stringify(order, null, 2));
    if (order && order.deposit_payment_id) {
        const dep = await db.get('SELECT id, payment_code, amount, total_order_codes FROM payment_records WHERE id = $1', [order.deposit_payment_id]);
        console.log('DEPOSIT_RECORD:', JSON.stringify(dep, null, 2));
    }
    process.exit(0);
})();
