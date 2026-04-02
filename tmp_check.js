const db = require('./db/pool');
setTimeout(async () => {
    try {
        // All users
        const r = await db.all("SELECT u.id, u.full_name, u.role, u.status, d.name as dept_name FROM users u LEFT JOIN departments d ON d.id = u.department_id ORDER BY u.status, d.name, u.full_name");
        console.log('=== ALL USERS ===');
        r.forEach(x => console.log(x.status, '|', x.dept_name, '|', x.full_name, '|', x.role, '| id='+x.id));
        
        // Dept hierarchy
        console.log('\n=== DEPTS ===');
        const d2 = await db.all("SELECT id, name, parent_id FROM departments ORDER BY parent_id, name");
        d2.forEach(x => console.log('id='+x.id, 'parent='+x.parent_id, '|', x.name));
    } catch(e) { console.error(e.message); }
    process.exit(0);
}, 2000);
