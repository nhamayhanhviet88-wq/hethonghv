const db = require('./db/pool');
(async () => {
    // Check departments table
    const depts = await db.all('SELECT id, name, code, parent_id, head_user_id FROM departments ORDER BY id');
    console.log('=== DEPARTMENTS ===');
    depts.forEach(d => console.log(`  [${d.id}] ${d.name} (code: ${d.code}, parent: ${d.parent_id})`));
    
    // Now match users with departments
    const users = await db.all(`SELECT u.id, u.full_name, u.username, u.department_id, 
        d.name as dept_name, d.code as dept_code
        FROM users u LEFT JOIN departments d ON d.id = u.department_id
        WHERE u.status = 'active'
        ORDER BY d.name NULLS LAST, u.full_name`);
    
    const groups = {};
    users.forEach(u => {
        const key = u.dept_name || 'Chưa phân phòng';
        if (!groups[key]) groups[key] = [];
        groups[key].push(`[${u.id}] ${u.full_name || u.username}`);
    });
    
    console.log('\n=== NV THEO PHÒNG BAN ===');
    Object.entries(groups).forEach(([dept, members]) => {
        console.log(`\n📁 ${dept} (${members.length})`);
        members.forEach(m => console.log(`  - ${m}`));
    });
    
    process.exit(0);
})();
