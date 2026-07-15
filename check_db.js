const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv'
    });
    await client.connect();

    try {
        console.log('--- Checking backups for SVTS0005 ---');
        const backupsRes = await client.query(`
            SELECT b.*, o.order_code 
            FROM dht_order_session_backups b
            JOIN dht_orders o ON b.order_id = o.id
            WHERE o.order_code = 'SVTS0005'
        `);
        console.log('Backups found:', backupsRes.rows.length);
        if (backupsRes.rows.length > 0) {
            console.log(JSON.stringify(backupsRes.rows, null, 2));
        }

        console.log('--- Checking item details in dht_order_items for SVTS0005 ---');
        const itemsRes = await client.query(`
            SELECT i.id, i.product_name, i.quantity, i.mockup_image, i.print_details, i.custom_layout
            FROM dht_order_items i
            JOIN dht_orders o ON i.dht_order_id = o.id
            WHERE o.order_code = 'SVTS0005'
            ORDER BY i.id ASC
        `);
        for (const row of itemsRes.rows) {
            console.log(`Item ID: ${row.id}, Product: ${row.product_name}, Qty: ${row.quantity}`);
            console.log(`Mockup exists: ${!!row.mockup_image}`);
            console.log(`Print details: ${JSON.stringify(row.print_details)}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

main();
