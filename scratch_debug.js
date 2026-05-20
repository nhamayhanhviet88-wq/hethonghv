const db = require('./db/pool');
(async () => {
    // Fix total_amount for existing order: base 11,500,000 + VAT 800,000 = 12,300,000
    await db.run("UPDATE dht_orders SET total_amount = 12300000 WHERE order_code = 'AFF-VTTI0006'");
    console.log('Fixed total_amount for AFF-VTTI0006');
    process.exit(0);
})();
