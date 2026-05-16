const db = require('./db/pool');
(async () => {
    const nvId = 52; // nhanvien10

    // 1. nhanvien10's pending lock task completions
    const pendingLtc = await db.all(
        `SELECT ltc.id, ltc.lock_task_id, ltc.completion_date::text as d, ltc.status, ltc.redo_count,
                ltc.reviewed_by, lt.task_name, lt.requires_approval
         FROM lock_task_completions ltc JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         WHERE ltc.user_id = $1 AND ltc.status = 'pending' AND ltc.redo_count >= 0
         ORDER BY ltc.completion_date DESC`,
        [nvId]
    );
    console.log('=== nhanvien10 pending LTC ===');
    pendingLtc.forEach(r => console.log(`  ltc.id=${r.id} | ${r.d} | ${r.task_name} | requires=${r.requires_approval} | redo=${r.redo_count}`));
    console.log('Count:', pendingLtc.length);

    // 2. ALL pending LTC system-wide
    const allPending = await db.all(
        `SELECT ltc.id, ltc.lock_task_id, ltc.user_id, ltc.completion_date::text as d, ltc.status,
                ltc.redo_count, lt.task_name, u.full_name
         FROM lock_task_completions ltc 
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         JOIN users u ON u.id = ltc.user_id
         WHERE ltc.status = 'pending' AND ltc.redo_count >= 0
         ORDER BY ltc.completion_date DESC`,
        []
    );
    console.log('\n=== ALL pending LTC (system-wide) ===');
    allPending.forEach(r => console.log(`  ltc.id=${r.id} | NV=${r.full_name}(${r.user_id}) | ${r.d} | redo=${r.redo_count} | ${r.task_name}`));
    console.log('Count:', allPending.length);

    // 3. nhanvien10 reviewer config
    const nvUser = await db.get('SELECT force_approval_reviewer_id, department_id FROM users WHERE id = $1', [nvId]);
    console.log('\nnhanvien10 force_approval_reviewer_id:', nvUser?.force_approval_reviewer_id);
    console.log('nhanvien10 department_id:', nvUser?.department_id);

    // 4. Task approvers
    const approvers = await db.all(`SELECT * FROM task_approvers WHERE department_id = $1`, [nvUser?.department_id]);
    console.log('\nTask approvers for dept', nvUser?.department_id + ':', approvers.map(r => `user=${r.approver_id}`));

    // 5. Check the "Công Việc Khóa Duyệt" — this is likely a support request for lock task approval
    // or it could be about the lock task review panel
    const srKhoa = await db.all(
        `SELECT sr.id, sr.user_id, sr.task_name, sr.task_date::text as d, sr.status, sr.source_type,
                sr.lock_task_id, u.full_name
         FROM task_support_requests sr JOIN users u ON u.id = sr.user_id
         WHERE sr.manager_id = 47 AND sr.source_type = 'khoa'
         ORDER BY sr.task_date DESC LIMIT 10`
    );
    console.log('\n=== SR source=khoa for dovandoanh ===');
    srKhoa.forEach(r => console.log(`  sr.id=${r.id} | ${r.d} | NV=${r.full_name}(${r.user_id}) | ${r.task_name} | status=${r.status}`));

    process.exit();
})();
