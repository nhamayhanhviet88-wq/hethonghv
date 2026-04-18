const db = require('./db/pool');
(async () => {
    // Check table columns
    const cols = await db.all("SELECT column_name FROM information_schema.columns WHERE table_name = 'departments' ORDER BY ordinal_position");
    console.log('Columns:', cols.map(c => c.column_name).join(', '));

    // Get all departments under PHÒNG KINH DOANH
    const all = await db.all("SELECT * FROM departments WHERE parent_id = 1 ORDER BY id");
    console.log('\nTeams under PHÒNG KINH DOANH:');
    all.forEach(d => console.log(`  id=${d.id} status=${d.status} name="${d.name}"`, JSON.stringify(d)));

    // Search for SINH VIÊN
    const svkd = await db.all("SELECT * FROM departments WHERE name ILIKE '%sinh vi%'");
    console.log('\nSINH VIÊN search:', JSON.stringify(svkd));

    process.exit(0);
})();
