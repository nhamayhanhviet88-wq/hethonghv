const db = require('./db/pool');
(async()=>{
  const cols = await db.all(`SELECT column_name FROM information_schema.columns WHERE table_name = 'consult_flow_rules' ORDER BY ordinal_position`);
  console.log('Flow rules columns:', cols.map(c=>c.column_name));
  
  const rules = await db.all(`SELECT * FROM consult_flow_rules WHERE crm_menu = 'nhu_cau' AND type_key IN ('cap_cuu_sep','pending_emergency','hoan_thanh_cap_cuu','cho_duyet_huy','huy','duyet_huy','tu_van_lai') ORDER BY type_key, sort_order`);
  console.log('NHU CAU flow rules:', JSON.stringify(rules, null, 2));
  process.exit(0);
})();
