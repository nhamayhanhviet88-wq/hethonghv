// Migration: Reindex section_order per-menu (fix global numbering bug)
// Each crm_menu will get sequential 1, 2, 3... instead of global mixed numbers
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixSectionOrder() {
  const client = await pool.connect();
  try {
    // Get all distinct crm_menus that have sections
    const menus = await client.query(`SELECT DISTINCT crm_menu FROM consult_type_configs WHERE section_order > 0 ORDER BY crm_menu`);
    console.log(`Found ${menus.rows.length} CRM menus with sections:`, menus.rows.map(r => r.crm_menu));

    for (const { crm_menu } of menus.rows) {
      // Get all sections for this menu, ordered by current section_order
      const sections = await client.query(
        `SELECT key, section_order, rule_phase FROM consult_type_configs WHERE section_order > 0 AND crm_menu = $1 ORDER BY section_order`,
        [crm_menu]
      );
      
      console.log(`\n--- ${crm_menu}: ${sections.rows.length} sections ---`);
      console.log(`  Before: [${sections.rows.map(r => `${r.key}=${r.section_order}`).join(', ')}]`);

      // Reindex 1, 2, 3, ...
      for (let i = 0; i < sections.rows.length; i++) {
        const newOrder = i + 1;
        if (sections.rows[i].section_order !== newOrder) {
          await client.query(
            `UPDATE consult_type_configs SET section_order = $1 WHERE key = $2 AND crm_menu = $3`,
            [newOrder, sections.rows[i].key, crm_menu]
          );
        }
      }

      // Verify
      const after = await client.query(
        `SELECT key, section_order FROM consult_type_configs WHERE section_order > 0 AND crm_menu = $1 ORDER BY section_order`,
        [crm_menu]
      );
      console.log(`  After:  [${after.rows.map(r => `${r.key}=${r.section_order}`).join(', ')}]`);
    }

    console.log('\n✅ Done! All menus reindexed successfully.');
  } finally {
    client.release();
    pool.end();
  }
}

fixSectionOrder().catch(e => { console.error('Error:', e); pool.end(); });
