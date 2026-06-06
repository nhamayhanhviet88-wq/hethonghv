const db = require('../db/pool');

async function run() {
    try {
        console.log("=== MATERIAL TRANSACTIONS (PET & TEM) ===");
        const txs = await db.all(`
            SELECT id, material_item_id, tx_type, quantity, parent_tx_id, printing_record_id, notes
            FROM material_transactions
            WHERE material_item_id IN (4, 11)
            ORDER BY id ASC
        `);
        console.log(JSON.stringify(txs, null, 2));

        console.log("=== PETTEM ROLLS ===");
        const rolls = await db.all(`
            SELECT id, roll_type, qty_imported, qty_remaining, confirmed_by, notes, material_tx_id
            FROM pettem_rolls
            ORDER BY id ASC
        `);
        console.log(JSON.stringify(rolls, null, 2));

        console.log("=== PRINTING RECORDS LINKED TO ROLLS ===");
        const prs = await db.all(`
            SELECT id, dht_order_id, print_meters, pettem_roll_id, is_print_done, material_tx_id
            FROM printing_records
            WHERE pettem_roll_id IS NOT NULL OR material_tx_id IN (SELECT id FROM material_transactions WHERE material_item_id IN (4, 11))
            ORDER BY id ASC
        `);
        console.log(JSON.stringify(prs, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        await db.close();
    }
}

run();
