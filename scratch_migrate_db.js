const db = require('./db/pool');

async function main() {
    try {
        console.log("Adding columns to sewing_records...");
        await db.exec(`ALTER TABLE sewing_records ADD COLUMN IF NOT EXISTS order_item_id INTEGER REFERENCES dht_order_items(id) ON DELETE CASCADE`);
        await db.exec(`ALTER TABLE sewing_records ADD COLUMN IF NOT EXISTS sewing_team_id INTEGER REFERENCES departments(id)`);
        
        console.log("Creating indexes...");
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_sr_order_item ON sewing_records(order_item_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_sr_sewing_team ON sewing_records(sewing_team_id)`);
        
        console.log("Migration successful!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}

main();
