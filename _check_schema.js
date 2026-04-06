const db = require('./db/pool');
(async () => {
    // telesale_assignments schema
    const cols = await db.all("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='telesale_assignments' ORDER BY ordinal_position");
    console.log('telesale_assignments columns:');
    cols.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));
    
    // Sample assignment
    const sample = await db.get('SELECT * FROM telesale_assignments LIMIT 1');
    console.log('\nSample:', JSON.stringify(sample, null, 2));
    
    // Count
    const count = await db.get('SELECT COUNT(*) as cnt FROM telesale_assignments');
    console.log('\nTotal assignments:', count.cnt);
    
    // telesale_data columns
    const dcols = await db.all("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='telesale_data' ORDER BY ordinal_position");
    console.log('\ntelesale_data columns:');
    dcols.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));
    
    process.exit(0);
})();
