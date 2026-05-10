require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv' });

(async () => {
    // Simulate what the API does for Đỗ Văn Doanh (ID=47, role=quan_ly, dept_id=1)
    const userId = 47;
    const myDeptId = 1;
    
    // Get all depts
    const { rows: allDepts } = await pool.query('SELECT id, parent_id FROM departments');
    const childIds = new Set();
    function getChildren(pid) { childIds.add(pid); allDepts.filter(d => d.parent_id === pid).forEach(d => getChildren(d.id)); }
    getChildren(myDeptId);
    console.log('Child dept IDs for Doanh:', [...childIds]);
    
    // Get manager users
    const { rows: mgrUsers } = await pool.query(
        `SELECT id, full_name, role FROM users WHERE department_id = ANY($1) AND role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')`,
        [[...childIds]]
    );
    console.log('Manager users:', mgrUsers.map(u => `${u.id}:${u.full_name}(${u.role})`));
    
    const allowedManagerIds = new Set(mgrUsers.map(u => u.id));
    console.log('Allowed manager IDs:', [...allowedManagerIds]);
    
    // Now simulate the actual query - "Tổng Phòng KD" (no managerId)
    const mgrArr = [...allowedManagerIds];
    const ph = mgrArr.map((_, i) => `$${i+1}`).join(',');
    
    // This is what the API does:
    let whereClauses = ["u.role = 'tkaffiliate'"];
    whereClauses.push(`u.managed_by_user_id IN (${ph})`);
    
    console.log('\nSQL WHERE:', whereClauses.join(' AND '));
    console.log('Params:', mgrArr);
    
    const { rows: affiliates } = await pool.query(
        `SELECT u.id, u.full_name, u.managed_by_user_id FROM users u WHERE ${whereClauses.join(' AND ')}`,
        mgrArr
    );
    console.log(`\nFound ${affiliates.length} affiliates`);
    affiliates.forEach(a => console.log(`  ${a.full_name} (managed_by=${a.managed_by_user_id})`));
    
    await pool.end();
})();
