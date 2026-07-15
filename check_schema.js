const db = require('./db/pool');

async function main() {
    try {
        const row = await db.get("SELECT * FROM dht_order_items LIMIT 1");
        console.log('Columns:');
        console.log(Object.keys(row).join(', '));
    } catch (e) {
        console.error(e);
    }
}

main();
