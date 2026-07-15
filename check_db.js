const db = require('./db/pool');

async function main() {
    try {
        const order = await db.get('SELECT * FROM dht_orders WHERE order_code = $1', ['SVTS0005']);
        if (!order) {
            console.log('Order SVTS0005 not found');
            return;
        }
        console.log('--- ORDER ---');
        console.log(JSON.stringify(order, null, 2));

        const items = await db.all('SELECT * FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id', [order.id]);
        console.log('--- ITEMS ---');
        console.log(JSON.stringify(items, null, 2));

        const prep = await db.all('SELECT * FROM qlx_preparation WHERE dht_order_id = $1', [order.id]);
        console.log('--- PREPARATION ---');
        console.log(JSON.stringify(prep, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main();
