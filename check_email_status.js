const db = require('./db/pool');

async function main() {
    try {
        await db.init();
        const rows = await db.all("SELECT id, order_code, design_email_status, design_email_error, design_email_planned_send_at, design_email_recipient FROM dht_orders WHERE design_email_status = 'sending' OR design_email_planned_send_at IS NOT NULL");
        console.log("ORDERS IN SENDING QUEUE:", rows);
    } catch(err) {
        console.error("ERROR:", err);
    } finally {
        await db.close();
    }
}

main();
