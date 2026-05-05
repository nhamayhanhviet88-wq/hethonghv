const db = require('./db/pool');
(async () => {
    const d = await db.all("SELECT id, name, parent_id, head_user_id FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id");
    console.log('DEPTS:', JSON.stringify(d, null, 2));
    const ids = d.map(x => x.id);
    const ph = ids.map((_, i) => `$${i+1}`).join(',');
    const u = await db.all(`SELECT id, full_name, role, department_id, username FROM users WHERE department_id IN (${ph}) AND status = 'active' ORDER BY department_id, role, full_name`, ids);
    console.log('USERS:', JSON.stringify(u, null, 2));
    process.exit(0);
})();
