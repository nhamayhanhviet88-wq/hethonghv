const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
(async () => {
  const r = await p.query(`SELECT key, label, section_order, crm_menu, rule_phase FROM consult_type_configs WHERE section_order > 0 ORDER BY section_order`);
  console.log('=== ALL sections with section_order > 0 (ALL crm_menus mixed!) ===');
  console.table(r.rows);
  console.log('\nTotal:', r.rows.length);
  // Group by crm_menu
  const byMenu = {};
  r.rows.forEach(row => { (byMenu[row.crm_menu] = byMenu[row.crm_menu] || []).push(row); });
  for (const [menu, items] of Object.entries(byMenu)) {
    console.log(`\n--- ${menu}: ${items.length} items, orders: [${items.map(i=>i.section_order).join(',')}]`);
  }
  p.end();
})();
