const db = require('./db/pool');

async function backfillPenalties() {
    await new Promise(r => setTimeout(r, 500));
    
    console.log('========== BACKFILL PENALTIES ==========');
    console.log('Ngày chạy:', new Date().toISOString().split('T')[0]);
    
    // 1. Read penalty config
    const configRows = await db.all('SELECT key, amount FROM global_penalty_config');
    const GPC = {};
    configRows.forEach(r => { GPC[r.key] = Number(r.amount) || 0; });
    
    const cvKhoaAmt = GPC.cv_khoa_khong_nop || 50000;
    const cvChuoiAmt = GPC.cv_chuoi_khong_nop || 50000;
    const capCuuAmt = GPC.cap_cuu_ql_khong_xu_ly || 50000;
    
    console.log(`\nMức phạt: CV Khóa=${cvKhoaAmt}đ, CV Chuỗi=${cvChuoiAmt}đ, Cấp Cứu=${capCuuAmt}đ`);
    
    let totalFixed = 0;
    let totalAmount = 0;
    
    // ========== CV KHÓA ==========
    console.log('\n--- CV KHÓA ---');
    
    // Case 1: expired but penalty not applied
    const lockExpired = await db.all(
        `SELECT ltc.id, ltc.user_id, u.username, lt.task_name, ltc.completion_date::text as task_date, ltc.penalty_applied, ltc.penalty_amount
         FROM lock_task_completions ltc
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         JOIN users u ON u.id = ltc.user_id
         WHERE ltc.status = 'expired' AND (ltc.penalty_applied = false OR ltc.penalty_applied IS NULL)
         ORDER BY ltc.completion_date`
    );
    
    for (const r of lockExpired) {
        await db.run(
            'UPDATE lock_task_completions SET penalty_applied = true, penalty_amount = $1 WHERE id = $2',
            [cvKhoaAmt, r.id]
        );
        console.log(`  ✅ ${r.username} | ${r.task_name} | ${r.task_date} | ${cvKhoaAmt}đ (expired, chưa phạt)`);
        totalFixed++;
        totalAmount += cvKhoaAmt;
    }
    
    // Case 2: redo but deadline passed (completion_date < today)
    const lockRedo = await db.all(
        `SELECT ltc.id, ltc.user_id, u.username, lt.task_name, ltc.completion_date::text as task_date, ltc.redo_count
         FROM lock_task_completions ltc
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         JOIN users u ON u.id = ltc.user_id
         WHERE ltc.status = 'redo' AND ltc.completion_date < CURRENT_DATE
         ORDER BY ltc.completion_date`
    );
    
    for (const r of lockRedo) {
        await db.run(
            'UPDATE lock_task_completions SET status = $1, penalty_applied = true, penalty_amount = $2 WHERE id = $3',
            ['expired', cvKhoaAmt, r.id]
        );
        console.log(`  ✅ ${r.username} | ${r.task_name} | ${r.task_date} | ${cvKhoaAmt}đ (redo quá hạn → expired)`);
        totalFixed++;
        totalAmount += cvKhoaAmt;
    }
    
    if (lockExpired.length === 0 && lockRedo.length === 0) {
        console.log('  Không có CV Khóa nào cần backfill');
    }
    
    // ========== CV CHUỖI ==========
    console.log('\n--- CV CHUỖI ---');
    
    // Case 1: expired but penalty not applied
    let chainExpired = [];
    try {
        chainExpired = await db.all(
            `SELECT cc.id, cc.user_id, u.username, ci.task_name, ci.deadline::text as task_date, cc.penalty_applied, cc.penalty_amount,
                    cins.chain_name
             FROM chain_task_completions cc
             JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
             JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
             JOIN users u ON u.id = cc.user_id
             WHERE cc.status = 'expired' AND (cc.penalty_applied = false OR cc.penalty_applied IS NULL)
             ORDER BY ci.deadline`
        );
    } catch(e) { console.log('  (Bảng chain không tồn tại hoặc lỗi)'); }
    
    for (const r of chainExpired) {
        await db.run(
            'UPDATE chain_task_completions SET penalty_applied = true, penalty_amount = $1 WHERE id = $2',
            [cvChuoiAmt, r.id]
        );
        console.log(`  ✅ ${r.username} | ${r.chain_name} — ${r.task_name} | ${r.task_date} | ${cvChuoiAmt}đ (expired, chưa phạt)`);
        totalFixed++;
        totalAmount += cvChuoiAmt;
    }
    
    // Case 2: redo but deadline passed
    let chainRedo = [];
    try {
        chainRedo = await db.all(
            `SELECT cc.id, cc.user_id, u.username, ci.task_name, ci.deadline::text as task_date,
                    cins.chain_name
             FROM chain_task_completions cc
             JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
             JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
             JOIN users u ON u.id = cc.user_id
             WHERE cc.status = 'redo' AND ci.deadline < CURRENT_DATE
             ORDER BY ci.deadline`
        );
    } catch(e) {}
    
    for (const r of chainRedo) {
        await db.run(
            'UPDATE chain_task_completions SET status = $1, penalty_applied = true, penalty_amount = $2 WHERE id = $3',
            ['expired', cvChuoiAmt, r.id]
        );
        console.log(`  ✅ ${r.username} | ${r.chain_name} — ${r.task_name} | ${r.task_date} | ${cvChuoiAmt}đ (redo quá hạn → expired)`);
        totalFixed++;
        totalAmount += cvChuoiAmt;
    }
    
    if (chainExpired.length === 0 && chainRedo.length === 0) {
        console.log('  Không có CV Chuỗi nào cần backfill');
    }
    
    // ========== CẤP CỨU SẾP ==========
    console.log('\n--- CẤP CỨU SẾP ---');
    
    const srExpired = await db.all(
        `SELECT sr.id, sr.manager_id, m.username, sr.task_name, sr.task_date::text, sr.penalty_amount, sr.penalty_reason,
                u.full_name as requested_by
         FROM task_support_requests sr
         LEFT JOIN users m ON sr.manager_id = m.id
         LEFT JOIN users u ON sr.user_id = u.id
         WHERE sr.status = 'expired' AND (sr.penalty_amount = 0 OR sr.penalty_amount IS NULL)
         ORDER BY sr.task_date`
    );
    
    for (const r of srExpired) {
        await db.run(
            'UPDATE task_support_requests SET penalty_amount = $1 WHERE id = $2',
            [capCuuAmt, r.id]
        );
        console.log(`  ✅ ${r.username} (QL) | ${r.task_name} | ${r.task_date} | ${capCuuAmt}đ | Yêu cầu từ: ${r.requested_by}`);
        totalFixed++;
        totalAmount += capCuuAmt;
    }
    
    if (srExpired.length === 0) {
        console.log('  Không có Cấp Cứu Sếp nào cần backfill');
    }
    
    // ========== SUMMARY ==========
    console.log('\n========== KẾT QUẢ ==========');
    console.log(`Tổng penalties đã tạo: ${totalFixed}`);
    console.log(`Tổng tiền phạt: ${totalAmount.toLocaleString()}đ`);
    console.log('=============================');
    
    process.exit();
}

backfillPenalties().catch(e => { console.error('FATAL:', e); process.exit(1); });
