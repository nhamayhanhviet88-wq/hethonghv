const db = require('./db/pool');
(async () => {
    try {
        // 1. dht_products — Sản Phẩm, linked to sale_type
        await db.exec(`
            CREATE TABLE IF NOT EXISTS dht_products (
                id SERIAL PRIMARY KEY,
                sale_type_id INTEGER NOT NULL REFERENCES dht_settings_options(id),
                name TEXT NOT NULL,
                display_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ dht_products created');

        // 2. dht_product_materials — Sản Phẩm X dùng Chất Liệu Y
        await db.exec(`
            CREATE TABLE IF NOT EXISTS dht_product_materials (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES dht_products(id),
                material_id INTEGER NOT NULL REFERENCES kv_materials(id),
                is_active BOOLEAN DEFAULT true,
                UNIQUE(product_id, material_id)
            );
        `);
        console.log('✅ dht_product_materials created');

        // 3. dht_process_steps — 8 bước quy trình cố định
        await db.exec(`
            CREATE TABLE IF NOT EXISTS dht_process_steps (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                short_name TEXT,
                display_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true
            );
        `);
        console.log('✅ dht_process_steps created');

        // 4. Insert default process steps
        const steps = [
            { name: 'Chuẩn Bị QLX', short: 'CBQLX', order: 1 },
            { name: 'Cắt', short: 'CẮT', order: 2 },
            { name: 'In', short: 'IN', order: 3 },
            { name: 'Ép', short: 'ÉP', order: 4 },
            { name: 'May', short: 'MAY', order: 5 },
            { name: 'Hoàn Thiện', short: 'HT', order: 6 },
            { name: 'Kiểm Tra Chất Lượng', short: 'KTCL', order: 7 },
            { name: 'Đóng Gói', short: 'ĐG', order: 8 }
        ];
        for (const s of steps) {
            await db.run(`INSERT INTO dht_process_steps (name, short_name, display_order) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`, [s.name, s.short, s.order]);
        }
        console.log('✅ 8 process steps seeded');

        // 5. dht_product_process — Sản Phẩm X đi qua bước nào
        await db.exec(`
            CREATE TABLE IF NOT EXISTS dht_product_process (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL REFERENCES dht_products(id),
                step_id INTEGER NOT NULL REFERENCES dht_process_steps(id),
                is_active BOOLEAN DEFAULT true,
                UNIQUE(product_id, step_id)
            );
        `);
        console.log('✅ dht_product_process created');

        // Verify
        const tbls = await db.all("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'dht%' ORDER BY table_name");
        console.log('\nAll DHT tables:', tbls.map(t => t.table_name).join(', '));

    } catch(e) { console.error('ERROR:', e.message); }
    process.exit(0);
})();
