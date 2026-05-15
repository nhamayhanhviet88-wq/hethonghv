const db = require('./db/pool');
(async () => {
    // Sync ledger for 14/05
    const { syncLedgerForDate } = require('./utils/penaltyLedger');
    await syncLedgerForDate('2026-05-14');

    // Check dovandoanh's ledger on 14/05
    const ledger14 = await db.all(
        `SELECT source_type, source_ref_id, penalty_amount, task_name
         FROM daily_penalty_ledger WHERE user_id = 47 AND penalty_date = '2026-05-14' ORDER BY id`
    );
    console.log('=== dovandoanh Ledger 14/05 ===');
    ledger14.forEach((r, i) => console.log(`  ${i+1}. [${r.source_type}] ${r.source_ref_id} | ${r.penalty_amount} | ${r.task_name}`));
    console.log('Total:', ledger14.reduce((s, r) => s + r.penalty_amount, 0));

    // Also check: what should dovandoanh's 15/05 penalties actually be?
    // The original request said dovandoanh should have 600k on 15/05
    // Let's see if there's a ql_khoa penalty that should exist
    
    // Check: did truongphongtest3 submit any lock task that dovandoanh should have approved?
    // sr_1228 is a SUPPORT request (source_type='khoa'), NOT an approval request
    // But user says "duyệt công việc khóa" = QL should approve CV Khóa
    // Check if there's a ql_khoa penalty source that should be created
    
    // Check the ledger sync logic for ql_khoa
    const qlKhoaAll = await db.all(
        `SELECT ltc.id, ltc.user_id, lt.task_name, ltc.completion_date::text as d, ltc.penalty_amount, ltc.redo_count
         FROM lock_task_completions ltc JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         WHERE ltc.status = 'expired' AND ltc.penalty_applied = true AND ltc.redo_count = -1
         AND ltc.completion_date >= '2026-05-14' AND ltc.completion_date <= '2026-05-15'`
    );
    console.log('\n=== redo=-1 (QL not approve) records ===');
    qlKhoaAll.forEach(r => console.log(`  ltc.id=${r.id} | user=${r.user_id} | ${r.d} | redo=${r.redo_count} | amt=${r.penalty_amount} | ${r.task_name}`));
    
    // Check: sr_1228 stacking - the ORIGINAL ql_expired penalty for dovandoanh
    // This is source_type='ho_tro_nv' in ledger, NOT ql_khoa
    // The issue: sr_1228 (status=ql_expired, amt=100k) is the ORIGINAL penalty on 14/05
    // But ledger 14/05 may not have it synced
    
    // Check all support requests that would generate penalties for dovandoanh
    const allSR = await db.all(
        `SELECT sr.id, sr.user_id, sr.task_name, sr.task_date::text as d, sr.status, sr.penalty_amount,
                sr.source_type, sr.stacking_source, u.full_name
         FROM task_support_requests sr JOIN users u ON u.id = sr.user_id
         WHERE sr.manager_id = 47 AND sr.status IN ('expired', 'ql_expired') 
         AND sr.task_date >= '2026-05-12' AND sr.task_date <= '2026-05-15'
         ORDER BY sr.task_date, sr.id`
    );
    console.log('\n=== ALL expired/ql_expired SR for dovandoanh 12-15/05 ===');
    allSR.forEach(r => console.log(`  sr.id=${r.id} | ${r.d} | NV=${r.full_name}(${r.user_id}) | ${r.task_name} | status=${r.status} | amt=${r.penalty_amount} | src=${r.source_type} | stack=${r.stacking_source}`));

    process.exit();
})();
