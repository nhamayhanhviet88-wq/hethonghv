const db = require('../db/pool');

async function check() {
    try {
        console.log("=== CHECKING QLX HISTORY FOR ORDER 27 ===");
        const history = await db.all(`
            SELECT h.*, u.full_name AS performer
            FROM qlx_history h
            LEFT JOIN users u ON h.performed_by = u.id
            WHERE h.dht_order_id = 27
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
