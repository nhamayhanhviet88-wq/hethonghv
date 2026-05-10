const db = require('./db/pool');
(async () => {
    await db.init();
    await db.run("UPDATE settings_sources SET name = 'AFFILIATE GIỚI THIỆU AFFILIATE' WHERE id = 11");
    const r = await db.get('SELECT * FROM settings_sources WHERE id = 11');
    console.log('Updated:', r);
    process.exit(0);
})();
