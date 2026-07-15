const db = require('./db/pool');
async function run() {
    await db.init();
    const order = await db.get(`SELECT id, order_code, is_locked, locked_at FROM dht_orders WHERE order_code = 'SVTS0001'`);
    console.log('Order locked_at:', order.locked_at, 'Type:', typeof order.locked_at);
    const now = new Date();
    const lockedAt = new Date(order.locked_at);
    const diffMinutes = (now - lockedAt) / (1000 * 60);
    console.log('now:', now);
    console.log('diffMinutes:', diffMinutes);
    console.log('is_locked_active:', (order.is_locked && diffMinutes < 10));
    await db.close();
}
run();
