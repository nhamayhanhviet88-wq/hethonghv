const db = require('./db/pool');

async function checkByOrderDate() {
    try {
        const rows = await db.all(`
            WITH unpaid_orders AS (
                SELECT o.id::text AS id, o.order_code, o.order_date, o.shipping_status, o.actual_carrier_id, o.shipped_at,
                    GREATEST(0, COALESCE(o.total_amount, 0) - COALESCE(o.discount_amount, 0) - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) - COALESCE((SELECT SUM(COALESCE(os.shipping_fee, 0)) FROM dht_order_shipments os WHERE os.dht_order_id = o.id AND os.shipping_fee_payer = 'hv' AND os.shipping_fee_method = 'ck' AND (os.tracking_code IS NULL OR os.tracking_code = '')), CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' AND (o.tracking_code IS NULL OR o.tracking_code = '') THEN COALESCE(o.shipping_fee, 0) ELSE 0 END)) AS remaining_amount,
                    'dht_order' AS order_type,
                    o.created_by
                FROM dht_orders o
                LEFT JOIN LATERAL (
                    SELECT COALESCE(SUM(amount), 0) AS deposit_total
                    FROM payment_records
                    WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                       OR order_tt_coc = o.order_code
                ) pr_dep ON true
                WHERE (COALESCE(o.total_amount, 0) - COALESCE(o.discount_amount, 0) - GREATEST(COALESCE((SELECT COALESCE(SUM(amount), 0) FROM payment_records pr_dep2 WHERE pr_dep2.total_order_codes ILIKE '%' || o.order_code || '%' OR pr_dep2.order_tt_coc = o.order_code), 0), COALESCE(o.deposit_amount_cache, 0)) - COALESCE((SELECT SUM(COALESCE(os.shipping_fee, 0)) FROM dht_order_shipments os WHERE os.dht_order_id = o.id AND os.shipping_fee_payer = 'hv' AND os.shipping_fee_method = 'ck' AND (os.tracking_code IS NULL OR os.tracking_code = '')), CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' AND (o.tracking_code IS NULL OR o.tracking_code = '') THEN COALESCE(o.shipping_fee, 0) ELSE 0 END)) > 0

                UNION ALL

                SELECT 'sample_' || d.id AS id, d.sample_order_code AS order_code, d.order_date,
                    CASE WHEN d.status_gui_don = true OR d.shipped_at IS NOT NULL THEN 'shipped' ELSE 'pending' END AS shipping_status,
                    d.actual_carrier_id, d.shipped_at,
                    GREATEST(0, COALESCE(d.total_amount, 0) - COALESCE(pr_dep.deposit_total, 0) - CASE WHEN d.shipping_fee_payer = 'hv' AND d.shipping_fee_method = 'ck' AND (d.tracking_code IS NULL OR d.tracking_code = '') AND NOT EXISTS (SELECT 1 FROM payment_records pr WHERE pr.order_ao_mau = d.sample_order_code AND pr.money_source = 'nha_van_chuyen') THEN COALESCE(d.shipping_fee, 0) ELSE 0 END) AS remaining_amount,
                    'ao_mau' AS order_type,
                    d.created_by
                FROM don_gui_ao_mau d
                LEFT JOIN LATERAL (
                    SELECT COALESCE(SUM(amount), 0) AS deposit_total
                    FROM payment_records
                    WHERE order_ao_mau = d.sample_order_code
                       OR order_tt_coc = d.sample_order_code
                ) pr_dep ON true
                WHERE COALESCE(d.sample_order_code, '') != '' AND d.order_status != 'draft'
                  AND GREATEST(0, COALESCE(d.total_amount, 0) - COALESCE(pr_dep.deposit_total, 0) - CASE WHEN d.shipping_fee_payer = 'hv' AND d.shipping_fee_method = 'ck' AND (d.tracking_code IS NULL OR d.tracking_code = '') AND NOT EXISTS (SELECT 1 FROM payment_records pr WHERE pr.order_ao_mau = d.sample_order_code AND pr.money_source = 'nha_van_chuyen') THEN COALESCE(d.shipping_fee, 0) ELSE 0 END) > 0
            )
            SELECT 
                EXTRACT(YEAR FROM order_date)::int AS year,
                EXTRACT(MONTH FROM order_date)::int AS month,
                COUNT(*)::int AS count,
                SUM(remaining_amount)::numeric AS total
            FROM unpaid_orders
            GROUP BY year, month
            ORDER BY year DESC, month DESC
        `);

        console.log('--- UNPAID BY ORDER_DATE ---');
        console.log(rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkByOrderDate();
