const db = require('./db/pool');
(async()=>{
    const cols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name='telesale_data' ORDER BY ordinal_position");
    cols.forEach((c,i) => console.log(`  ${i+1}. ${c.column_name}`));
    process.exit(0);
})();
