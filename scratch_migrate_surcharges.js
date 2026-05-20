const db = require('./db/pool');
(async () => {
    try {
        await db.run("ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS surcharges JSONB DEFAULT '[]'");
        console.log('OK: surcharges column added');
    } catch (e) {
        console.log('Error:', e.message);
    }
    process.exit(0);
})();
