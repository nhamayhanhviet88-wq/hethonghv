const db = require('./db/pool');
async function migrate() {
  try {
    console.log('Running migrations...');
    await db.exec('ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS is_no_sew BOOLEAN DEFAULT false;');
    await db.exec('ALTER TABLE finishing_records ADD COLUMN IF NOT EXISTS order_item_id INTEGER REFERENCES dht_order_items(id) ON DELETE CASCADE;');
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await db.close();
  }
}
migrate();
