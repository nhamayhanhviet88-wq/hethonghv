const db = require('./db/pool');
(async () => {
    try {
        // 1. Create self_search_locations table
        await db.run(`
            CREATE TABLE IF NOT EXISTS self_search_locations (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Created self_search_locations table');

        // 2. Add columns to telesale_data
        const cols = ['fb_link TEXT', 'search_location_id INTEGER', 'self_searched_by INTEGER', 'self_searched_at TIMESTAMP'];
        for (const col of cols) {
            const name = col.split(' ')[0];
            const exists = await db.get(`SELECT column_name FROM information_schema.columns WHERE table_name='telesale_data' AND column_name='${name}'`);
            if (!exists) {
                await db.run(`ALTER TABLE telesale_data ADD COLUMN ${col}`);
                console.log(`✅ Added column ${name} to telesale_data`);
            } else {
                console.log(`⏭️ Column ${name} already exists`);
            }
        }

        console.log('\n✅ Migration complete!');
    } catch (e) {
        console.error('❌ Migration error:', e.message);
    }
    process.exit(0);
})();
