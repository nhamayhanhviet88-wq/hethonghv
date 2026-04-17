const db = require('./db/pool');
(async () => {
    // quanly1 has department_id = 1
    // Check what departments exist
    const depts = await db.all('SELECT id, name, parent_id FROM departments ORDER BY id');
    console.log('All departments:', depts);

    // Check which users are in dept 1 tree
    const dept1 = await db.get('SELECT id, parent_id FROM departments WHERE id = 1');
    console.log('Dept 1:', dept1);
    const rootId = dept1?.parent_id || 1;
    const childDepts = await db.all('SELECT id FROM departments WHERE id = $1 OR parent_id = $1', [rootId]);
    console.log('Child depts of root', rootId, ':', childDepts);
    const deptIds = childDepts.map(d => d.id);
    const usersInDept = await db.all(`SELECT id, full_name, role, department_id FROM users WHERE department_id IN (${deptIds.map((_, i) => `$${i + 1}`).join(',')}) AND status = 'active'`, deptIds);
    console.log('Users in dept tree:', usersInDept);

    // Active members user_ids (is_active=true)
    const activeMembers = await db.all('SELECT DISTINCT user_id FROM telesale_active_members WHERE is_active = true');
    console.log('Active member user_ids:', activeMembers.map(m => m.user_id));

    // Check user_id 2,3,6,7 details
    const memberUsers = await db.all('SELECT id, full_name, role, department_id FROM users WHERE id IN (2,3,6,7)');
    console.log('Member user details:', memberUsers);

    process.exit();
})();
