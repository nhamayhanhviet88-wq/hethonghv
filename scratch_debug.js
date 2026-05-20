const db = require('./db/pool');
(async () => {
    // Link payment_record id=1365 to order AFF-VTTI0006
    await db.run("UPDATE dht_orders SET deposit_payment_id = 1365 WHERE order_code = 'AFF-VTTI0006'");
    // Also update payment_record to link back
    await db.run("UPDATE payment_records SET total_order_codes = 'AFF-VTTI0006' WHERE id = 1365");
    console.log('Linked payment CK20-20-5-Y26 (id=1365) to AFF-VTTI0006');
    process.exit(0);
})();
