const db = require('../db/pool');

async function run() {
    try {
        await db.init();

        const affected = await db.all(`
            WITH old_items AS (
                SELECT 
                    oi.id AS item_id,
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
            ),
            new_items AS (
                SELECT 
                    oi.id AS item_id,
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
            SELECT DISTINCT old_items.order_code 
            FROM old_items
            LEFT JOIN new_items ON old_items.item_id = new_items.item_id
            WHERE new_items.item_id IS NULL
        `);

        console.log("=== AFFECTED ORDERS ===");
        console.table(affected);
    } catch(e) {
        console.error(e);
    } finally {
        await db.close();
    }
}
run();
