const { Pool } = require('pg');
require('dotenv').config();
const p = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  // Check if hop33 exists in any crm_menu
  const r1 = await p.query(`SELECT key, label, section_order, crm_menu, rule_phase, section_group FROM consult_type_configs WHERE key LIKE '%hop%' OR label LIKE '%họp%'`);
  console.log('=== Records containing "hop/họp" ===');
  console.table(r1.rows);

  // Check all CTV sections
  const r2 = await p.query(`SELECT key, label, section_order, rule_phase FROM consult_type_configs WHERE crm_menu = 'ctv' AND section_order > 0 ORDER BY section_order`);
  console.log('\n=== CTV sections (section_order > 0) ===');
  console.table(r2.rows);

  // Check CTV section_order = 0 (hidden/not configured)
  const r3 = await p.query(`SELECT key, label, section_order FROM consult_type_configs WHERE crm_menu = 'ctv' AND section_order = 0`);
  console.log('\n=== CTV hidden sections (section_order = 0) ===');
  console.table(r3.rows);

  // Check nhu_cau for comparison
  const r4 = await p.query(`SELECT key, label, section_order FROM consult_type_configs WHERE crm_menu = 'nhu_cau' AND key LIKE '%hop%'`);
  console.log('\n=== nhu_cau with "hop" ===');
  console.table(r4.rows);

  p.end();
})();
