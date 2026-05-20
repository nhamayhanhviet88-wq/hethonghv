const db = require('./db/pool');
(async () => {
    try {
        await db.run('ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS deposit_amount_cache NUMERIC DEFAULT 0');
    } catch(e) {}
    await db.run("UPDATE dht_orders SET deposit_amount_cache = 1800000 WHERE order_code = 'AFF-VTTI0006'");
    console.log('Done');
    process.exit(0);
})();
