require('dotenv').config();
const db = require('./db/pool');

async function fixCurrentRecord() {
    await db.init();

    const res = await db.run(`
        UPDATE payment_records 
        SET order_tt_coc = 'SVTS0010',
            payment_type = 'dat_coc',
            updated_at = NOW()
        WHERE payment_code = 'CK14-20-7-Y26'
    `);

    console.log("Updated payment_records count:", res.changes);

    // Also update order deposit cache or link if needed
    const orderRes = await db.run(`
        UPDATE dht_orders 
        SET deposit_payment_id = (SELECT id FROM payment_records WHERE payment_code = 'CK14-20-7-Y26' LIMIT 1),
            deposit_amount_cache = '300000'
        WHERE order_code = 'SVTS0010'
    `);
    console.log("Updated dht_orders count:", orderRes.changes);

    process.exit(0);
}

fixCurrentRecord().catch(e => { console.error(e); process.exit(1); });
