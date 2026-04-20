const {Pool} = require('pg');
const p = new Pool({connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv'});
p.query("ALTER TABLE daily_link_entries ADD COLUMN IF NOT EXISTS category_id INTEGER")
  .then(() => { console.log('OK: category_id added'); p.end(); })
  .catch(e => { console.error(e.message); p.end(); });
