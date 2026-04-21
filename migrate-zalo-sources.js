const db = require('./db/pool');
db.init().then(async () => {
    try {
        // 1. Create zalo_sources table
        await db.run(`CREATE TABLE IF NOT EXISTS zalo_sources (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            icon VARCHAR(10) DEFAULT '📂',
            sort_order INT DEFAULT 0,
            created_by INT REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        console.log('✅ zalo_sources table created');

        // 2. Add source_id column to zalo_link_pool
        try {
            await db.run('ALTER TABLE zalo_link_pool ADD COLUMN source_id INT REFERENCES zalo_sources(id)');
            console.log('✅ source_id column added to zalo_link_pool');
        } catch(e) { console.log('source_id already exists or error:', e.message); }

        console.log('✅ Migration complete');
        process.exit(0);
    } catch(e) { console.error('Migration error:', e); process.exit(1); }
});
