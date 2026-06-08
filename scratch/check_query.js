const db = require('../db/pool');

async function run() {
    try {
        const item = await db.get(`
            SELECT doi.id, doi.description, 
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
            WHERE doi.id = 46
        `);
        console.log('QUERY RESULT:', item);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

run();
