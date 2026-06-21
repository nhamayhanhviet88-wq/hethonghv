const db = require('./db/pool');

async function run() {
    try {
        await db.init();
        console.log('Running migration...');
        
        // Add location to kv_materials
        await db.exec('ALTER TABLE kv_materials ADD COLUMN IF NOT EXISTS location TEXT');
        console.log('Added location to kv_materials');
        
        // Add location to kv_fabric_colors
        await db.exec('ALTER TABLE kv_fabric_colors ADD COLUMN IF NOT EXISTS location TEXT');
        console.log('Added location to kv_fabric_colors');
        
        console.log('Migration completed successfully!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await db.close();
    }
}

run();
