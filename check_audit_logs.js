const db = require('./db/pool');

async function main() {
    try {
        const rows = await db.all("SELECT * FROM dht_audit_logs WHERE dht_order_id = 133 ORDER BY id DESC");
        console.log('Total audit logs:', rows.length);
        rows.forEach(r => {
            console.log(`ID: ${r.id}, Action: ${r.action}, Created At: ${r.created_at}`);
            console.log(`Summary: ${r.summary}`);
            console.log(`Changes:`, JSON.stringify(r.changes));
            console.log('----------------------------------------------------');
        });
    } catch (e) {
        console.error(e);
    }
}

main();
