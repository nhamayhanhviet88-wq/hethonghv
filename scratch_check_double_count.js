const db = require('./db/pool');

async function checkDoubleCount() {
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
            ),
            filtered_unpaid AS (
                SELECT * FROM unpaid_orders o
            ),
            order_carriers AS (
                SELECT DISTINCT
                    o.id AS order_id,
                    COALESCE(oi.actual_carrier_id, 0) AS carrier_id,
                    CASE 
                        WHEN oi.shipping_status = 'shipped' AND oi.actual_carrier_id IS NOT NULL 
                        THEN COALESCE(oi.shipping_date, o.order_date)
                        ELSE o.order_date
                    END AS assoc_date,
                    o.remaining_amount,
                    o.order_code
                FROM filtered_unpaid o
                JOIN dht_order_items oi ON oi.dht_order_id = CAST(o.id AS integer)
                WHERE o.order_type = 'dht_order'
                  AND o.remaining_amount > 0
                  AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(oi.product_name, '')) NOT LIKE '%thiet ke%'
                  AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiết kế%'
                  AND LOWER(COALESCE(oi.description, '')) NOT LIKE '%thiet ke%'
                
                UNION
                
                SELECT
                    o.id AS order_id,
                    CASE 
                        WHEN o.shipping_status = 'shipped' AND o.actual_carrier_id IS NOT NULL 
                        THEN o.actual_carrier_id 
                        ELSE 0 
                    END AS carrier_id,
                    CASE 
                        WHEN o.shipping_status = 'shipped' AND o.actual_carrier_id IS NOT NULL 
                        THEN COALESCE(o.shipped_at, o.order_date) 
                        ELSE o.order_date 
                    END AS assoc_date,
                    o.remaining_amount,
                    o.order_code
                FROM filtered_unpaid o
                WHERE o.order_type = 'dht_order'
                  AND NOT EXISTS (
                    SELECT 1 FROM dht_order_items 
                    WHERE dht_order_id = CAST(o.id AS integer)
                      AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiết kế%'
                      AND LOWER(COALESCE(product_name, '')) NOT LIKE '%thiet ke%'
                      AND LOWER(COALESCE(description, '')) NOT LIKE '%thiết kế%'
                      AND LOWER(COALESCE(description, '')) NOT LIKE '%thiet ke%'
                )
                  AND o.remaining_amount > 0

                UNION

                SELECT
                    o.id AS order_id,
                    CASE 
                        WHEN o.shipping_status = 'shipped' AND o.actual_carrier_id IS NOT NULL 
                        THEN o.actual_carrier_id 
                        ELSE 0 
                    END AS carrier_id,
                    CASE 
                        WHEN o.shipping_status = 'shipped' AND o.actual_carrier_id IS NOT NULL 
                        THEN COALESCE(o.shipped_at, o.order_date) 
                        ELSE o.order_date 
                    END AS assoc_date,
                    o.remaining_amount,
                    o.order_code
                FROM filtered_unpaid o
                WHERE o.order_type = 'ao_mau'
                  AND o.remaining_amount > 0

                UNION
                
                SELECT DISTINCT
                    o.id AS order_id,
                    -2 AS carrier_id,
                    COALESCE(o.shipped_at, o.order_date) AS assoc_date,
                    o.remaining_amount,
                    o.order_code
                FROM filtered_unpaid o
                WHERE (
                    o.order_type = 'dht_order'
                    AND (SELECT COUNT(*) FROM dht_audit_logs WHERE dht_order_id = CAST(o.id AS integer) AND action = 'ship') >= 2
                ) OR (
                    o.order_type = 'ao_mau'
                    AND EXISTS (
                        SELECT 1 FROM don_gui_ao_mau d 
                        WHERE d.id = CAST(REPLACE(o.id, 'sample_', '') AS integer) 
                          AND d.status_hoan_hang = true
                    )
                )
            )
            SELECT 
                order_id,
                order_code,
                carrier_id,
                EXTRACT(YEAR FROM assoc_date)::int AS year,
                EXTRACT(MONTH FROM assoc_date)::int AS month,
                remaining_amount
            FROM order_carriers
            WHERE EXTRACT(YEAR FROM assoc_date)::int = 2026 AND EXTRACT(MONTH FROM assoc_date)::int = 6
        `);

        // Group by carrier first to see how the client-side grouped them
        const carrierMap = {};
        for (const r of rows) {
            const cid = r.carrier_id;
            if (!carrierMap[cid]) carrierMap[cid] = [];
            carrierMap[cid].push(r);
        }

        console.log('--- OLD CLIENT-SIDE SUM ---');
        let oldTotal = 0;
        let oldCount = 0;
        const countedPairs = [];
        
        for (const cid in carrierMap) {
            console.log(`Carrier ${cid}:`);
            for (const item of carrierMap[cid]) {
                console.log(`  - ${item.order_code} (${item.remaining_amount})`);
                oldTotal += Number(item.remaining_amount);
                oldCount++;
                countedPairs.push({ carrier: cid, order: item.order_code, amt: item.remaining_amount });
            }
        }
        console.log(`Old sum: ${oldTotal.toLocaleString('vi-VN')}đ (Count: ${oldCount})`);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkDoubleCount();
