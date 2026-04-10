const db = require('./db/pool');
setTimeout(async () => {
    const cols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name = 'leave_requests' ORDER BY ordinal_position");
    console.log(cols.map(c => c.column_name).join(', '));
    process.exit();
}, 500);
