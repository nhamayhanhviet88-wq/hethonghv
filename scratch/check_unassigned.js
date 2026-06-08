const db = require('../db/pool');

async function run() {
    try {
        // Run the unassigned query logic exactly as bophanep.js does:
        const orders = await db.all(`
            SELECT o.id, o.order_code, o.customer_name, o.customer_phone,
                   o.total_quantity, o.order_date, o.expected_ship_date, o.shipping_priority,
                   c.name AS category_name,
                   u_cskh.full_name AS cskh_name,
                   u_created.full_name AS created_by_name
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            WHERE EXISTS (
                SELECT 1 FROM dht_order_items oi
                WHERE oi.dht_order_id = o.id
                  AND NOT EXISTS (SELECT 1 FROM pressing_records pr WHERE pr.order_item_id = oi.id)
            )
              AND EXISTS (SELECT 1 FROM qlx_preparation pp WHERE pp.dht_order_id = o.id)
              AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
              AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
              AND COALESCE(o.shipping_status, '') NOT IN ('shipped', 'cancelled')
        `);

        const orderIds = orders.map(o => o.id);
        let items = [], allItemCounts = {};
        if (orderIds.length > 0) {
            items = await db.all(`
                SELECT 
                    doi.dht_order_id, 
                    doi.id, 
                    doi.description, 
                    doi.material_pairs,
                    doi.quantity AS quantity,
                    EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = doi.id) AS has_cut_records,
                    NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = doi.id AND cr.is_cut_done = false) AS all_cuts_done,
                    EXISTS(
                        SELECT 1 FROM qlx_assignments qa 
                        WHERE qa.assignment_type = 'in' AND (qa.assigned_user_id IS NOT NULL OR qa.assigned_contractor_id IS NOT NULL)
                          AND (qa.item_id = doi.id OR (qa.dht_order_id = doi.dht_order_id AND qa.item_id IS NULL))
                    ) AS has_pc_in,
                    (
                        EXISTS (
                            SELECT 1 FROM printing_records pr 
                            WHERE (pr.order_item_id = doi.id OR (pr.dht_order_id = doi.dht_order_id AND pr.order_item_id IS NULL))
                        ) AND NOT EXISTS (
                            SELECT 1 FROM printing_records pr 
                            WHERE (pr.order_item_id = doi.id OR (pr.dht_order_id = doi.dht_order_id AND pr.order_item_id IS NULL))
                              AND NOT (pr.is_print_done = true OR pr.contractor_id IS NOT NULL)
                        )
                    ) AS is_print_done_rec
                FROM dht_order_items doi
                WHERE doi.dht_order_id = ANY($1)
                  AND NOT EXISTS (SELECT 1 FROM pressing_records pr WHERE pr.order_item_id = doi.id)
                ORDER BY doi.dht_order_id, doi.id
            `, [orderIds]);
        }

        const targetOrder = orders.find(o => o.order_code === 'VTTI0002');
        console.log('TARGET ORDER:', targetOrder);
        const targetItems = items.filter(it => it.dht_order_id === targetOrder.id);
        console.log('TARGET ITEMS:', targetItems);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

run();
