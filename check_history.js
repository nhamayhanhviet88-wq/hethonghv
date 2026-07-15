const db = require('./db/pool');

async function main() {
    try {
        const logs = await db.all("SELECT * FROM dht_audit_logs WHERE dht_order_id = 133 ORDER BY id DESC LIMIT 50");
        console.log('Logs count:', logs.length);
        console.log(JSON.stringify(logs, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main();
