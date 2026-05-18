const db = require('./db/pool');
(async () => {
  // 1. Add new columns to dht_order_items
  const cols = [
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS sale_type TEXT',           // Bán/Quà
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS product_name TEXT',         // Sản Phẩm
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS material_id INTEGER',      // Chất Liệu
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS material_name TEXT',        // Tên chất liệu (snapshot)
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS color_id INTEGER',          // Màu
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS color_name TEXT',           // Tên màu (snapshot)
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS pattern_name TEXT',         // Mẫu Áo
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS sewing_techniques TEXT',    // Kỹ Thuật May (JSON array)
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS accounting_notes TEXT',     // Nhắc nhở KT/HT (JSON array)
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS extra_materials TEXT',      // Vật Liệu Kèm (JSON array)
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS quantities TEXT',           // JSON: [{qty, price, subtotal}]
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS extra_product TEXT',        // SP Khác
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS extra_price DOUBLE PRECISION DEFAULT 0', // Giá Khác
    'ALTER TABLE dht_order_items ADD COLUMN IF NOT EXISTS item_total DOUBLE PRECISION DEFAULT 0',  // Tổng Phiếu
  ];
  for (const sql of cols) {
    try { await db.run(sql); } catch(e) { console.log('Skip:', e.message); }
  }

  // 2. Create settings tables for "setup later" fields
  await db.run(`CREATE TABLE IF NOT EXISTS dht_settings_options (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  )`);

  // Seed default Bán/Quà options
  await db.run(`INSERT INTO dht_settings_options (category, name, display_order) VALUES ('sale_type', 'Bán', 1) ON CONFLICT DO NOTHING`);
  await db.run(`INSERT INTO dht_settings_options (category, name, display_order) VALUES ('sale_type', 'Quà', 2) ON CONFLICT DO NOTHING`);

  // Add unique constraint if not exists
  try {
    await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_dht_settings_cat_name ON dht_settings_options(category, name)`);
  } catch(e) {}

  // Re-seed with conflict handling
  try {
    await db.run(`INSERT INTO dht_settings_options (category, name, display_order) VALUES ('sale_type', 'Bán', 1) ON CONFLICT (category, name) DO NOTHING`);
    await db.run(`INSERT INTO dht_settings_options (category, name, display_order) VALUES ('sale_type', 'Quà', 2) ON CONFLICT (category, name) DO NOTHING`);
  } catch(e) {}

  console.log('✅ Migration complete');
  process.exit();
})();
