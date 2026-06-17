const db = require('./db/pool');

async function test() {
    try {
        const rows = await db.all(`
            SELECT id, payment_code, amount, payment_type, order_tt_coc, order_ao_mau, total_order_codes, customer_name, customer_phone
            FROM payment_records
            WHERE payment_code = 'CK7-17-6-Y26'
        `);
        console.log('RECORD:', JSON.stringify(rows, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
test();
