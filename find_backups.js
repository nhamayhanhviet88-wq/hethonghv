const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function main() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    console.log('--- Checking backups ---');
    const backups = await db.all('SELECT * FROM dht_order_session_backups WHERE order_id = 133 OR order_id IN (SELECT id FROM dht_orders WHERE order_code = \'SVTS0005\')');
    console.log('Backups found:', backups.length);
    if (backups.length > 0) {
        console.log(JSON.stringify(backups, null, 2));
    }

    console.log('--- Checking audit logs ---');
    const logs = await db.all('SELECT * FROM dht_audit_logs WHERE dht_order_id = 133 OR dht_order_id IN (SELECT id FROM dht_orders WHERE order_code = \'SVTS0005\') ORDER BY id DESC LIMIT 10');
    console.log('Audit logs found:', logs.length);
    for (const log of logs) {
        console.log(`Action: ${log.action}, Performed By: ${log.performed_by}, Summary: ${log.summary}`);
        if (log.changes) {
            console.log(`Changes: ${log.changes}`);
        }
    }
}

main();
