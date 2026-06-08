const db = require('../db/pool');

async function check() {
    try {
        console.log("=== CHECKING PRINTING HISTORY FOR ORDER 27 ===");
        const history = await db.all(`
            SELECT h.*, r.print_field, r.product_name, u.full_name AS performer
            FROM printing_history h
            JOIN printing_records r ON h.printing_id = r.id
            LEFT JOIN users u ON h.performed_by = u.id
            WHERE r.dht_order_id = 27
            ORDER BY h.id
        `);
        console.log(history);
    } catch (err) {
        console.error(err);
    } finally {
        await db.close();
    }
}

check();
