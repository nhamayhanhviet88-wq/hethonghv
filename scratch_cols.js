const db = require('./db/pool');
(async () => {
    await db.init();
    const r = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name = 'customers' ORDER BY ordinal_position");
    console.log(r.map(c => c.column_name).join(', '));
    process.exit();
})();
