const db = require('../db/pool');

(async () => {
    try {
        console.log('--- Initializing DB ---');
        const pool = db.getDB();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            console.log('Creating partial unique index...');
            await client.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS idx_qlx_prep_order_null_item 
                ON qlx_preparation(dht_order_id) 
                WHERE item_id IS NULL
            `);
            console.log('Index created successfully.');

            // Let's get a valid order id
            const order = await db.get("SELECT id FROM dht_orders LIMIT 1");
            if (!order) {
                console.log('No order found to test.');
                await client.query('ROLLBACK');
                process.exit(0);
            }
            const ordId = order.id;
            console.log('Testing with order id:', ordId);

            // Test INSERT ... ON CONFLICT (dht_order_id) WHERE item_id IS NULL
            console.log('Running INSERT ... ON CONFLICT ...');
            const result = await client.query(`
                INSERT INTO qlx_preparation (dht_order_id, fabric_arrived, fabric_arrived_at, fabric_arrived_by)
                VALUES ($1, true, NOW(), 1)
                ON CONFLICT (dht_order_id) WHERE item_id IS NULL 
                DO UPDATE SET fabric_arrived=true, fabric_arrived_at=NOW(), fabric_arrived_by=1, updated_at=NOW()
                RETURNING id
            `, [ordId]);

            console.log('Result:', result.rows);
            console.log('ON CONFLICT query executed successfully!');

            await client.query('ROLLBACK');
            console.log('Transaction rolled back successfully.');
        } catch(err) {
            await client.query('ROLLBACK');
            console.error('ERROR during testing:', err.message);
            console.error(err.stack);
        } finally {
            client.release();
        }

    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
