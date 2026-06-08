const db = require('../db/pool');

async function run() {
    try {
        await db.init();

        console.log("--- RUNNING WITH OLD QUERY FOR AFF-VTTI0010 ---");
        const oldQueryRes = await db.get(`
            WITH item_status AS (
                SELECT 
                    oi.id AS item_id,
                    (
                        EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = oi.id)
                        AND NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = oi.id AND cr.is_cut_done = false)
                    ) AS is_cut_done,
                    (
                        EXISTS (
                            SELECT 1 FROM printing_records pr 
                            WHERE (pr.order_item_id = oi.id OR (pr.dht_order_id = o.id AND pr.order_item_id IS NULL))
                              AND pr.print_field IN ('IN PET', 'IN DECAL')
                              AND pr.printer_id IS NOT NULL
                        ) AND NOT EXISTS (
                            SELECT 1 FROM printing_records pr 
                            WHERE (pr.order_item_id = oi.id OR (pr.dht_order_id = o.id AND pr.order_item_id IS NULL))
                              AND pr.print_field IN ('IN PET', 'IN DECAL')
                              AND pr.printer_id IS NOT NULL
                              AND pr.is_print_done = false
                        )
                    ) AS is_print_done,
                    o.order_code
                FROM dht_order_items oi
                JOIN dht_orders o ON oi.dht_order_id = o.id
                LEFT JOIN dht_categories c ON o.category_id = c.id
                WHERE EXISTS (SELECT 1 FROM qlx_preparation pp WHERE pp.dht_order_id = o.id)
                  AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
                  AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
                  AND COALESCE(o.shipping_status, '') NOT IN ('shipped', 'cancelled')
                  AND NOT EXISTS (SELECT 1 FROM pressing_records pr WHERE pr.order_item_id = oi.id)
                  AND EXISTS (
                      SELECT 1 FROM qlx_order_print_assignments qa
                      JOIN printing_fields pf ON qa.field_id = pf.id
                      WHERE (qa.item_id = oi.id OR (qa.dht_order_id = o.id AND qa.item_id IS NULL))
                        AND pf.name IN ('IN PET', 'IN DECAL')
                        AND qa.operator_type = 'user'
                  )
            )
            SELECT COUNT(*)::int AS total FROM item_status WHERE order_code = 'AFF-VTTI0010'
        `);
        console.log("Old Query Count for AFF-VTTI0010:", oldQueryRes);

        console.log("\n--- RUNNING WITH NEW FALLBACK QUERY FOR AFF-VTTI0010 ---");
        const newQueryRes = await db.get(`
            WITH item_status AS (
                SELECT 
                    oi.id AS item_id,
                    (
                        EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = oi.id)
                        AND NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = oi.id AND cr.is_cut_done = false)
                    ) AS is_cut_done,
                    (
                        EXISTS (
                            SELECT 1 FROM printing_records pr 
                            WHERE (
                                pr.order_item_id = oi.id 
                                OR (
                                    pr.order_item_id IS NULL 
                                    AND pr.dht_order_id = o.id 
                                    AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = oi.id)
                                )
                            )
                            AND pr.print_field IN ('IN PET', 'IN DECAL')
                            AND pr.printer_id IS NOT NULL
                        ) AND NOT EXISTS (
                            SELECT 1 FROM printing_records pr 
                            WHERE (
                                pr.order_item_id = oi.id 
                                OR (
                                    pr.order_item_id IS NULL 
                                    AND pr.dht_order_id = o.id 
                                    AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = oi.id)
                                )
                            )
                            AND pr.print_field IN ('IN PET', 'IN DECAL')
                            AND pr.printer_id IS NOT NULL
                            AND pr.is_print_done = false
                        )
                    ) AS is_print_done,
                    o.order_code
                FROM dht_order_items oi
                JOIN dht_orders o ON oi.dht_order_id = o.id
                LEFT JOIN dht_categories c ON o.category_id = c.id
                WHERE EXISTS (SELECT 1 FROM qlx_preparation pp WHERE pp.dht_order_id = o.id)
                  AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
                  AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
                  AND COALESCE(o.shipping_status, '') NOT IN ('shipped', 'cancelled')
                  AND NOT EXISTS (SELECT 1 FROM pressing_records pr WHERE pr.order_item_id = oi.id)
                  AND EXISTS (
                      SELECT 1 FROM qlx_order_print_assignments qa
                      JOIN printing_fields pf ON qa.field_id = pf.id
                      WHERE (
                          qa.item_id = oi.id 
                          OR (
                              qa.item_id IS NULL 
                              AND qa.dht_order_id = o.id 
                              AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = oi.id)
                          )
                      )
                      AND pf.name IN ('IN PET', 'IN DECAL')
                      AND qa.operator_type = 'user'
                  )
            )
            SELECT COUNT(*)::int AS total FROM item_status WHERE order_code = 'AFF-VTTI0010'
        `);
        console.log("New Query Count for AFF-VTTI0010:", newQueryRes);

        const orders = await db.all(`
            SELECT o.id, o.order_code
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            WHERE EXISTS (
                SELECT 1 FROM dht_order_items oi
                WHERE oi.dht_order_id = o.id
                  AND NOT EXISTS (SELECT 1 FROM pressing_records pr WHERE pr.order_item_id = oi.id)
                  AND EXISTS (
                      SELECT 1 FROM qlx_order_print_assignments qa
                      JOIN printing_fields pf ON qa.field_id = pf.id
                      WHERE (
                          qa.item_id = oi.id 
                          OR (
                              qa.item_id IS NULL 
                              AND qa.dht_order_id = o.id 
                              AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = oi.id)
                          )
                      )
                      AND pf.name IN ('IN PET', 'IN DECAL')
                      AND qa.operator_type = 'user'
                  )
            )
              AND EXISTS (SELECT 1 FROM qlx_preparation pp WHERE pp.dht_order_id = o.id)
              AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
              AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
              AND COALESCE(o.shipping_status, '') NOT IN ('shipped', 'cancelled')
              AND o.order_code = 'AFF-VTTI0010'
        `);
        console.log("Unassigned orders for AFF-VTTI0010 with new query:", orders);

    } catch (e) {
        console.error(e);
    } finally {
        await db.close();
    }
}

run();
