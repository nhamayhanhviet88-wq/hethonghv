const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv' });

(async () => {
  const nv3 = await pool.query("SELECT id FROM users WHERE username = 'nhanvien3'");
  if (nv3.rows.length === 0) { console.log('nhanvien3 not found'); return; }
  const nv3Id = nv3.rows[0].id;

  // Get ALL chain penalties with full detail
  const chains = await pool.query(
    "SELECT cc.id, cc.chain_item_id, cc.user_id, cc.penalty_amount, cc.status, " +
    "cc.penalty_applied, cc.redo_count, cc.created_at::text as created_at, cc.content, " +
    "ci.task_name, ci.deadline::text as deadline, cins.chain_name " +
    "FROM chain_task_completions cc " +
    "JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id " +
    "JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id " +
    "WHERE cc.user_id = $1 AND cc.status = 'expired' AND cc.penalty_applied = true " +
    "ORDER BY ci.deadline DESC, cc.created_at DESC",
    [nv3Id]
  );

  console.log('nhanvien3 ALL chain penalties:');
  chains.rows.forEach(r => {
    console.log('  ID=' + r.id + ' | chain_item=' + r.chain_item_id + 
      ' | redo_count=' + r.redo_count +
      ' | deadline=' + r.deadline + 
      ' | created=' + r.created_at +
      ' | amount=' + r.penalty_amount +
      ' | task=' + r.chain_name + ' - ' + r.task_name +
      ' | content=' + (r.content || '').substring(0, 60));
  });

  console.log('\n--- From /api/penalty/list for "hom qua" (2026-04-10) ---');
  // This simulates the list query for "hom qua"
  const listResult = await pool.query(
    "SELECT cc.id, ci.task_name, ci.deadline::text as task_date, " +
    "cc.penalty_amount, cins.chain_name, cc.redo_count, cc.created_at::text " +
    "FROM chain_task_completions cc " +
    "JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id " +
    "JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id " +
    "JOIN users u ON u.id = cc.user_id " +
    "WHERE cc.status = 'expired' AND cc.penalty_applied = true " +
    "AND ci.deadline BETWEEN '2026-04-10'::date AND '2026-04-10'::date " +
    "AND cc.user_id = $1 ORDER BY ci.deadline DESC",
    [nv3Id]
  );
  console.log('Results (filtered by ci.deadline = 2026-04-10):');
  listResult.rows.forEach(r => {
    console.log('  ' + r.chain_name + ' - ' + r.task_name + ' | deadline=' + r.task_date + ' | amount=' + r.penalty_amount + ' | redo=' + r.redo_count);
  });

  console.log('\n--- Stacked penalties (redo_count=-2) created on 2026-04-10 but deadline!=2026-04-10 ---');
  const stacked = await pool.query(
    "SELECT cc.id, ci.task_name, ci.deadline::text, cc.created_at::text, " +
    "cc.penalty_amount, cins.chain_name, cc.redo_count " +
    "FROM chain_task_completions cc " +
    "JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id " +
    "JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id " +
    "WHERE cc.user_id = $1 AND cc.redo_count = -2 " +
    "ORDER BY cc.created_at DESC",
    [nv3Id]
  );
  console.log('Stacked records:');
  stacked.rows.forEach(r => {
    console.log('  ' + r.chain_name + ' - ' + r.task_name + ' | deadline=' + r.deadline + ' | created=' + r.created_at + ' | amount=' + r.penalty_amount);
  });

  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
