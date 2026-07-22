require('dotenv').config();
const db = require('./db/pool');

async function inspectPayment() {
    await db.init();
    
    // Check payment transaction CK14-20-7-Y26
    const payments = await db.all("SELECT * FROM financial_transactions WHERE transaction_code LIKE '%CK14-20-7-Y26%' OR code LIKE '%CK14-20-7-Y26%'");
    console.log("Payment transactions:", JSON.stringify(payments, null, 2));

    // Check order SVTS0010
    const orders = await db.all("SELECT id, order_code, customer_name, customer_phone, total_amount, deposit_amount FROM dht_orders WHERE order_code = 'SVTS0010'");
    console.log("Order SVTS0010:", JSON.stringify(orders, null, 2));

    // Check payments linked to SVTS0010
    if (orders.length > 0) {
        const orderId = orders[0].id;
        const linkedPayments = await db.all("SELECT * FROM financial_transactions WHERE dht_order_id = $1 OR order_code = 'SVTS0010'", [orderId]);
        console.log("Linked payments to SVTS0010:", JSON.stringify(linkedPayments, null, 2));
    }

    process.exit(0);
}

inspectPayment().catch(e => { console.error(e); process.exit(1); });
