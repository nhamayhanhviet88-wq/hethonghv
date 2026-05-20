const db = require('./db/pool');
(async () => {
    const orders = await db.all("SELECT id, order_code FROM dht_orders ORDER BY id ASC LIMIT 5");
    console.log('Orders:', JSON.stringify(orders, null, 2));
    process.exit(0);
})();
