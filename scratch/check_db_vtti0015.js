const db = require('../db/pool');

async function check() {
    try {
        console.log("=== CHECKING ORDER ===");
        const order = await db.get("SELECT * FROM dht_orders WHERE order_code = 'AFF-VTTI0015'");
        console.log("Order:", order);

        if (!order) {
            console.log("Order not found!");
            return;
        }

        console.log("\n=== CHECKING ORDER ITEMS ===");
        const items = await db.all("SELECT * FROM dht_order_items WHERE dht_order_id = $1", [order.id]);
        console.log("Items:", items);

        for (const item of items) {
            console.log(`\n=== CHECKING ITEM ID ${item.id} (${item.description}) ===`);
            
            const printAssignments = await db.all(
                "SELECT qa.*, pf.name AS field_name FROM qlx_order_print_assignments qa JOIN printing_fields pf ON qa.field_id = pf.id WHERE qa.item_id = $1 OR (qa.item_id IS NULL AND qa.dht_order_id = $2)",
                [item.id, order.id]
            );
            console.log("Print Assignments:", printAssignments);

            const printRecords = await db.all(
                "SELECT * FROM printing_records WHERE order_item_id = $1 OR (order_item_id IS NULL AND dht_order_id = $2)",
                [item.id, order.id]
            );
            console.log("Print Records:", printRecords);

            const cuttingRecords = await db.all(
                "SELECT * FROM cutting_records WHERE order_item_id = $1",
                [item.id]
            );
            console.log("Cutting Records:", cuttingRecords);

            const pressingRecords = await db.all(
                "SELECT * FROM pressing_records WHERE order_item_id = $1",
                [item.id]
            );
            console.log("Pressing Records:", pressingRecords);

            // Let's run the exact check SQL queries from routes/bophanep.js
            const has_pc_in = await db.get(`
                SELECT EXISTS (
                    SELECT 1 FROM qlx_order_print_assignments qa
                    JOIN printing_fields pf ON qa.field_id = pf.id
                    WHERE (
                        qa.item_id = $1 
                        OR (
                            qa.item_id IS NULL 
                            AND qa.dht_order_id = $2 
                            AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = $1)
                        )
                    )
                      AND pf.name IN ('IN PET', 'IN DECAL')
                      AND qa.operator_type = 'user'
                ) AS val
            `, [item.id, order.id]);
            console.log("has_pc_in check:", has_pc_in.val);

            const is_print_done_rec = await db.get(`
                SELECT (
                    EXISTS (
                        SELECT 1 FROM printing_records pr 
                        WHERE (
                            pr.order_item_id = $1 
                            OR (
                                pr.order_item_id IS NULL 
                                AND pr.dht_order_id = $2 
                                AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = $1)
                            )
                        )
                          AND pr.print_field IN ('IN PET', 'IN DECAL')
                          AND pr.printer_id IS NOT NULL
                    ) AND NOT EXISTS (
                        SELECT 1 FROM printing_records pr 
                        WHERE (
                            pr.order_item_id = $1 
                            OR (
                                pr.order_item_id IS NULL 
                                AND pr.dht_order_id = $2 
                                AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = $1)
                            )
                        )
                          AND pr.print_field IN ('IN PET', 'IN DECAL')
                          AND pr.printer_id IS NOT NULL
                          AND pr.is_print_done = false
                    )
                ) AS val
            `, [item.id, order.id]);
            console.log("is_print_done_rec check:", is_print_done_rec.val);

            const pending_print_types = await db.get(`
                SELECT (
                    SELECT string_agg(pf.name, ', ')
                    FROM qlx_order_print_assignments qa
                    JOIN printing_fields pf ON qa.field_id = pf.id
                    WHERE (
                        qa.item_id = $1 
                        OR (
                            qa.item_id IS NULL 
                            AND qa.dht_order_id = $2 
                            AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = $1)
                        )
                    )
                      AND pf.name IN ('IN PET', 'IN DECAL')
                      AND qa.operator_type = 'user'
                      AND NOT EXISTS (
                          SELECT 1 FROM printing_records pr
                          WHERE (
                              pr.order_item_id = $1
                              OR (
                                  pr.order_item_id IS NULL
                                  AND pr.dht_order_id = $2
                                  AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = $1)
                              )
                          )
                            AND pr.print_field = pf.name
                            AND pr.is_print_done = true
                      )
                ) AS val
            `, [item.id, order.id]);
            console.log("pending_print_types check:", pending_print_types.val);
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await db.close();
    }
}

check();
