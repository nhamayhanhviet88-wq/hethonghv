const {Pool} = require('pg');
const p = new Pool({connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv'});
p.query("SELECT id, user_id, entry_date, module_type, fb_link, LEFT(links_json::text, 200) as lj FROM daily_link_entries ORDER BY id DESC LIMIT 10")
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); p.end(); })
  .catch(e => { console.error(e); p.end(); });
