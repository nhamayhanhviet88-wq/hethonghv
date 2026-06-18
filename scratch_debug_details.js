const db = require('./db/pool');

async function debugDetails() {
    try {
        const orderCodes = ['GCPET0009', 'VTTI0029', 'VTTI0027', 'GCPET0007', 'VTTI0018', 'VTTI0003', 'GCTEM0003'];
        for (const code of orderCodes) {
            const row = await db.get(`
                SELECT o.id, o.order_code, o.total_amount, o.discount_amount, o.deposit_amount_cache,
                    o.shipping_fee_payer, o.shipping_fee_method, o.shipping_fee, o.tracking_code,
                    (SELECT COALESCE(SUM(amount), 0) FROM payment_records WHERE total_order_codes ILIKE '%' || o.order_code || '%' OR order_tt_coc = o.order_code) AS deposit_total
                FROM dht_orders o
                WHERE o.order_code = $1
            `, [code]);
            if (!row) {
                console.log(`Order ${code} not found`);
                continue;
            }

            const shipCkDeductSql = `COALESCE((SELECT SUM(COALESCE(os.shipping_fee, 0)) FROM dht_order_shipments os WHERE os.dht_order_id = ${row.id} AND os.shipping_fee_payer = 'hv' AND os.shipping_fee_method = 'ck' AND (os.tracking_code IS NULL OR os.tracking_code = '')), CASE WHEN '${row.shipping_fee_payer}' = 'hv' AND '${row.shipping_fee_method}' = 'ck' AND ('${row.tracking_code || ''}' = '') THEN COALESCE(${row.shipping_fee}, 0) ELSE 0 END)`;
            const shipCkDeductVal = await db.get(`SELECT ${shipCkDeductSql} AS val`);

            const remainingSql = `
                GREATEST(0, COALESCE(${row.total_amount}, 0) - COALESCE(${row.discount_amount}, 0) - GREATEST(COALESCE(${row.deposit_total}, 0), COALESCE(${row.deposit_amount_cache}, 0)) - ${shipCkDeductVal.val})
            `;
            const remainingVal = await db.get(`SELECT ${remainingSql} AS val`);

            console.log(`Order: ${row.order_code}`);
            console.log(`  total: ${row.total_amount}`);
            console.log(`  discount: ${row.discount_amount}`);
            console.log(`  deposit_total (payment_records): ${row.deposit_total}`);
            console.log(`  deposit_amount_cache: ${row.deposit_amount_cache}`);
            console.log(`  ship_ck_deduct: ${shipCkDeductVal.val}`);
            console.log(`  calculated remaining: ${remainingVal.val}`);
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

debugDetails();
