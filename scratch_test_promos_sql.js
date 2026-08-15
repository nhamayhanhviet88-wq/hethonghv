const db = require('./db/pool');

async function testPromos() {
    const promoRows = await db.all(`
        SELECT code, promo_type, discount_pct, gift_quantity, used_count, max_uses, status, expire_at
        FROM promotion_codes
        ORDER BY id DESC LIMIT 20
    `);
    console.log('--- PROMOTION CODES RESULT FROM CSDL ---');
    console.log(promoRows);
}

testPromos().then(() => process.exit(0));
