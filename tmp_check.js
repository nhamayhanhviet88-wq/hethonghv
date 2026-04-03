const db = require('./db/pool');
db.init().then(async () => {
    const cols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name = 'departments' ORDER BY ordinal_position");
    console.log('departments columns:', JSON.stringify(cols.map(c => c.column_name)));
    process.exit();
});
