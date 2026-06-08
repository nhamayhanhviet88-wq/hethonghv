const http = require('http');

async function run() {
    // We can query the database directly to verify the output of our query!
    const pg = require('pg');
    require('dotenv').config();
    
    // Let's connect using the DB environment variables
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    
    // Let's run a query to get the pending orders
    const ordersRes = await client.query(`
        SELECT o.id, o.order_code, o.shipping_priority
        FROM dht_orders o
        WHERE o.shipping_status NOT IN ('shipped', 'cancelled')
          AND EXISTS (
              SELECT 1 FROM dht_order_items doi
              WHERE doi.dht_order_id = o.id
                AND NOT EXISTS (SELECT 1 FROM pressing_records pr WHERE pr.order_item_id = doi.id)
                AND EXISTS (
                    SELECT 1 FROM qlx_order_print_assignments qa
                    JOIN printing_fields pf ON qa.field_id = pf.id
                    WHERE (
                        qa.item_id = doi.id 
                        OR (
                            qa.item_id IS NULL 
                            AND qa.dht_order_id = doi.dht_order_id 
                            AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = doi.id)
                        )
                    )
                      AND pf.name IN ('IN PET', 'IN DECAL')
                      AND qa.operator_type = 'user'
                )
          )
        LIMIT 10
    `);
    
    const orderIds = ordersRes.rows.map(o => o.id);
    if (orderIds.length === 0) {
        console.log("No orders found.");
        await client.end();
        return;
    }
    
    const itemsRes = await client.query(`
        SELECT 
            doi.dht_order_id, 
            doi.id, 
            doi.description, 
            doi.material_pairs,
            doi.quantity AS quantity,
            (
                SELECT COUNT(*)::int 
                FROM dht_order_items doi2 
                WHERE doi2.dht_order_id = doi.dht_order_id AND doi2.id <= doi.id
            ) AS real_item_index,
            EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = doi.id) AS has_cut_records,
            NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = doi.id AND cr.is_cut_done = false) AS all_cuts_done,
            EXISTS (
                SELECT 1 FROM qlx_order_print_assignments qa
                JOIN printing_fields pf ON qa.field_id = pf.id
                WHERE (
                    qa.item_id = doi.id 
                    OR (
                        qa.item_id IS NULL 
                        AND qa.dht_order_id = doi.dht_order_id 
                        AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = doi.id)
                    )
                )
                  AND pf.name IN ('IN PET', 'IN DECAL')
                  AND qa.operator_type = 'user'
            ) AS has_pc_in,
            (
                EXISTS (
                    SELECT 1 FROM printing_records pr 
                    WHERE (
                        pr.order_item_id = doi.id 
                        OR (
                            pr.order_item_id IS NULL 
                            AND pr.dht_order_id = doi.dht_order_id 
                            AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = doi.id)
                        )
                    )
                      AND pr.print_field IN ('IN PET', 'IN DECAL')
                      AND pr.printer_id IS NOT NULL
                ) AND NOT EXISTS (
                    SELECT 1 FROM printing_records pr 
                    WHERE (
                        pr.order_item_id = doi.id 
                        OR (
                            pr.order_item_id IS NULL 
                            AND pr.dht_order_id = doi.dht_order_id 
                            AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = doi.id)
                        )
                    )
                      AND pr.print_field IN ('IN PET', 'IN DECAL')
                      AND pr.printer_id IS NOT NULL
                      AND pr.is_print_done = false
                )
            ) AS is_print_done_rec,
            (
                SELECT string_agg(pf.name, ', ')
                FROM qlx_order_print_assignments qa
                JOIN printing_fields pf ON qa.field_id = pf.id
                WHERE (
                    qa.item_id = doi.id 
                    OR (
                        qa.item_id IS NULL 
                        AND qa.dht_order_id = doi.dht_order_id 
                        AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = doi.id)
                    )
                )
                  AND pf.name IN ('IN PET', 'IN DECAL')
                  AND qa.operator_type = 'user'
                  AND NOT EXISTS (
                      SELECT 1 FROM printing_records pr
                      WHERE (
                          pr.order_item_id = doi.id
                          OR (
                              pr.order_item_id IS NULL
                              AND pr.dht_order_id = doi.dht_order_id
                              AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = doi.id)
                          )
                      )
                        AND pr.print_field = pf.name
                        AND pr.is_print_done = true
                  )
            ) AS pending_print_types
        FROM dht_order_items doi
        WHERE doi.dht_order_id = ANY($1)
          AND NOT EXISTS (SELECT 1 FROM pressing_records pr WHERE pr.order_item_id = doi.id)
          AND EXISTS (
              SELECT 1 FROM qlx_order_print_assignments qa
              JOIN printing_fields pf ON qa.field_id = pf.id
              WHERE (
                  qa.item_id = doi.id 
                  OR (
                      qa.item_id IS NULL 
                      AND qa.dht_order_id = doi.dht_order_id 
                      AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = doi.id)
                  )
              )
                AND pf.name IN ('IN PET', 'IN DECAL')
                AND qa.operator_type = 'user'
          )
    `, [orderIds]);

    for (const it of itemsRes.rows) {
        const order = ordersRes.rows.find(o => o.id === it.dht_order_id);
        const isCutReady = it.has_cut_records && it.all_cuts_done;
        const isPrintReady = it.is_print_done_rec;
        
        const warnings = [];
        if (!isCutReady) warnings.push('Chưa cắt');
        if (!isPrintReady) {
            if (it.pending_print_types) {
                const types = it.pending_print_types.split(', ').map(t => t.trim());
                if (types.includes('IN PET') && types.includes('IN DECAL')) {
                    warnings.push('Chưa In Pet + Decal');
                } else if (types.includes('IN PET')) {
                    warnings.push('Chưa In Pet');
                } else if (types.includes('IN DECAL')) {
                    warnings.push('Chưa In Decal');
                } else {
                    warnings.push('Chưa in');
                }
            } else {
                warnings.push('Chưa in');
            }
        }
        const warningMsg = warnings.length > 0 ? warnings.join(' + ') : null;
        console.log(`Order: ${order.order_code}, Item ID: ${it.id}, Pending Print Types: ${it.pending_print_types}, Warning Msg: ${warningMsg}`);
    }

    await client.end();
}

run().catch(console.error);
