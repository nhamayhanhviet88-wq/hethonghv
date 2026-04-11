const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'dongphuchv_secret_key_2024_change_this';
const token = jwt.sign({ id: 1, username: 'admin', full_name: 'Admin', role: 'giam_doc' }, JWT_SECRET, { expiresIn: '1d' });

function apiCall(path, method, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 11000, path, method: method || 'GET',
      headers: { Cookie: 'token=' + token, 'Content-Type': 'application/json' } };
    const req = http.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, data: d })); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  // 1. Check current state
  console.log('=== Check assignments today ===');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv' });
  
  const today = '2026-04-11';
  const asg = await pool.query("SELECT COUNT(*) as cnt FROM telesale_assignments WHERE assigned_date = $1", [today]);
  console.log('Assignments today:', asg.rows[0].cnt);
  
  // Check available data by source
  const avail = await pool.query(
    "SELECT ts.name, ts.crm_type, ts.daily_quota, COUNT(td.id) as available " +
    "FROM telesale_sources ts " +
    "LEFT JOIN telesale_data td ON td.source_id = ts.id AND td.status = 'available' " +
    "WHERE ts.is_active = true " +
    "GROUP BY ts.id, ts.name, ts.crm_type, ts.daily_quota " +
    "ORDER BY ts.display_order"
  );
  console.log('\nSources:');
  avail.rows.forEach(r => console.log('  ' + r.name + ' (CRM: ' + r.crm_type + ') | quota: ' + r.daily_quota + '/day | available: ' + r.available));
  
  // Check active members
  const members = await pool.query(
    "SELECT tam.user_id, tam.daily_quota, tam.crm_type, tam.is_active, u.username, u.full_name, u.status " +
    "FROM telesale_active_members tam " +
    "JOIN users u ON u.id = tam.user_id " +
    "ORDER BY tam.crm_type, u.username"
  );
  console.log('\nActive members:');
  members.rows.forEach(r => console.log('  ' + r.username + ' (' + r.full_name + ') | CRM: ' + r.crm_type + ' | quota: ' + (r.daily_quota || 'DEFAULT') + ' | active: ' + r.is_active + ' | user_status: ' + r.status));
  
  await pool.end();
  
  // 2. Trigger pump manually via API
  console.log('\n=== Triggering manual pump ===');
  const pumpRes = await apiCall('/api/telesale/pump', 'POST', {});
  console.log('Pump result:', pumpRes.status, pumpRes.data);
})().catch(e => console.error(e));
