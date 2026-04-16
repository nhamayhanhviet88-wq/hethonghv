const { Pool } = require('pg');
require('dotenv').config();
const p = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  await p.query("DELETE FROM consult_type_configs WHERE key='di_hopban2323'");
  await p.query("DELETE FROM consult_flow_rules WHERE from_status='di_hopban2323' OR to_type_key='di_hopban2323'");
  console.log('Deleted di_hopban2323 test button');
  p.end();
})();
