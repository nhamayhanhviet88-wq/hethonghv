const db = require('./db/pool');

async function test() {
    try {
        const rows = await db.all(`
            SELECT ceo.id, ceo.order_code, ceo.error_type, ceo.cskh_name,
                   u.full_name AS created_by_name,
                   d.name AS created_by_dept_name
            FROM customer_error_orders ceo
            LEFT JOIN users u ON u.id = ceo.created_by
            LEFT JOIN departments d ON d.id = u.department_id
            WHERE ceo.error_type = 'Nội Bộ' OR ceo.dht_order_id IS NULL
            ORDER BY ceo.id DESC
            LIMIT 10
        `);
        console.log(JSON.stringify(rows, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
