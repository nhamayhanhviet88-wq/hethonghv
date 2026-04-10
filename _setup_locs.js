const db = require('./db/pool');
(async () => {
    // Check admin user
    const admin = await db.get("SELECT id, username, role FROM users WHERE role = 'giam_doc' LIMIT 1");
    console.log('Admin user:', admin);
    
    // Create locations directly in DB
    for (const name of ['Facebook', 'Zalo', 'Google Maps', 'Đi thực tế', 'Bạn bè giới thiệu']) {
        await db.run('INSERT INTO self_search_locations (name, created_by) VALUES ($1, $2)', [name, admin?.id || 1]);
    }
    console.log('✅ Created 5 locations');
    
    const locs = await db.all('SELECT * FROM self_search_locations WHERE is_active = true ORDER BY name');
    console.log('Locations:', locs.map(l => `${l.id}:${l.name}`));
    
    process.exit(0);
})();
