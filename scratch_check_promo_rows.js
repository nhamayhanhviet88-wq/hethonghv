const db = require('./db/pool');

(async () => {
    try {
        console.log('--- PROMOTION_CODES ROWS IN POSTGRESQL ---');
        const rows = await db.all(`
            SELECT id, code, promo_type, discount_pct, gift_quantity, status, used_count, max_uses, expire_at
            FROM promotion_codes
            ORDER BY id DESC
        `);
        console.log(rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
