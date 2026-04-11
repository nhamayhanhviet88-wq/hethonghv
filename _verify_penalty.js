const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv' });

(async () => {
  const today = '2026-04-11';
  const nv = await pool.query("SELECT id FROM users WHERE username = 'nhanvien'");
  const nvId = nv.rows[0].id;

  // Only self-searched customers
  console.log('=== 3 KH Tự Tìm Kiếm của nhanvien hôm nay ===');
  const assigns = await pool.query(
    "SELECT a.id, a.call_status, a.answer_status_id, a.callback_date, a.callback_time, " +
    "d.id as data_id, d.customer_name, d.phone, d.status as data_status, d.cold_until::text, " +
    "s.name as source_name, s.crm_type, " +
    "ans.name as answer_name, ans.action_type " +
    "FROM telesale_assignments a " +
    "JOIN telesale_data d ON d.id = a.data_id " +
    "LEFT JOIN telesale_sources s ON s.id = d.source_id " +
    "LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id " +
    "WHERE a.user_id = $1 AND a.assigned_date = $2 AND d.self_searched_by IS NOT NULL " +
    "ORDER BY a.id",
    [nvId, today]
  );
  
  assigns.rows.forEach((r, i) => {
    console.log('\n--- KH ' + (i+1) + ': ' + r.customer_name + ' ---');
    console.log('  call_status: ' + r.call_status);
    console.log('  answer: ' + (r.answer_name || 'chưa gọi') + ' (action_type: ' + (r.action_type || '-') + ')');
    console.log('  data_status: ' + r.data_status);
    console.log('  cold_until: ' + (r.cold_until || '-'));
    console.log('  callback_date: ' + (r.callback_date || '-'));
    console.log('  source: ' + r.source_name + ' (' + r.crm_type + ')');
  });

  // Answer statuses reference
  console.log('\n=== Bảng trạng thái (action_type quyết định luồng) ===');
  const sts = await pool.query("SELECT id, name, action_type FROM telesale_answer_statuses ORDER BY id");
  sts.rows.forEach(r => console.log('  ' + r.name + ' → ' + (r.action_type || 'none (chỉ đánh dấu)')));

  // Cold settings
  console.log('\n=== Cấu hình đóng băng ===');
  const cold = await pool.query("SELECT key, value FROM app_config WHERE key IN ('telesale_cold_months','telesale_ncc_cold_months','telesale_cold_no_repump','telesale_ncc_no_repump')");
  cold.rows.forEach(r => console.log('  ' + r.key + ' = ' + r.value));

  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
