const db = require('./db/pool');
(async () => {
    // Check full dept tree
    const all = await db.all("SELECT id,name,parent_id,status FROM departments ORDER BY parent_id, id");
    console.log('All depts:');
    all.forEach(d => console.log(`  id=${d.id} parent=${d.parent_id} name=${d.name} status=${d.status}`));
    
    const active = await db.all("SELECT team_id FROM task_schedule_active_teams");
    console.log('\nActive team IDs:', active.map(x => x.team_id));
    
    // Check who has templates
    const tpls = await db.all("SELECT DISTINCT target_id FROM task_point_templates WHERE target_type='team'");
    console.log('Teams with templates:', tpls.map(x => x.target_id));
    
    // Check members in PHÒNG KINH DOANH hierarchy
    const members = await db.all("SELECT id, full_name, department_id FROM users WHERE department_id IN (1, 22) AND status='active'");
    console.log('\nMembers in PHÒNG KD (1) + TEAM THỬ VIỆC KD (22):', members);
    
    process.exit(0);
})();
