require('dotenv').config();
const db = require('./db/pool');

async function run() {
    await db.init();

    // Check order SVTS0010
    const order = await db.get("SELECT * FROM dht_orders WHERE order_code = 'SVTS0010'");
    console.log("Order SVTS0010:", JSON.stringify(order, null, 2));

    // Check all payment records linked to SVTS0010
    const linkedPayments = await db.all("SELECT id, payment_code, customer_name, amount, payment_type, order_tt_coc, transfer_note FROM payment_records WHERE order_tt_coc LIKE '%SVTS0010%'");
    console.log("Linked payments to SVTS0010:", JSON.stringify(linkedPayments, null, 2));

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
