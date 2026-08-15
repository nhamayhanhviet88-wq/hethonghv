const db = require('./db/pool');

(async () => {
    try {
        const rows = await db.all(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.log('--- ALL PUBLIC POSTGRESQL TABLES ---');
        console.log(rows.map(r => r.table_name));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
