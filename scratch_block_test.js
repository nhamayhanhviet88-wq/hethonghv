const db = require('./db/pool');
(async () => {
    const userId = 51;
    const targetDate = '2026-05-13'; // Chỉ ngày hôm qua (13/5)
    const CRM_TYPE_LABELS = {
        'nhu_cau': 'Chăm Sóc Nhu Cầu',
        'ctv': 'Chăm Sóc CTV',
        'ctv_hoa_hong': 'Chăm Sóc Affiliate',
        'kol_koc': 'Chăm Sóc KOC/KOL'
    };
    function crmLabel(code) {
        if (!code) return code;
        const raw = code.startsWith('tre_') ? code.replace('tre_', '') : code;
        return CRM_TYPE_LABELS[raw] || raw;
    }
    
    const penalties = [];
    
    // Source 1: CV Khóa — CHỈ ngày 13/5
    try {
        const rows = await db.all(
            `SELECT ltc.user_id, lt.task_name, ltc.penalty_amount, ltc.completion_date::text as task_date
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.user_id = $1 AND ltc.status = 'expired' AND ltc.penalty_applied = true
               AND ltc.completion_date = $2::date`, [userId, targetDate]);
        for (const r of rows) penalties.push({ task_name: `CV Khóa: ${r.task_name}`, task_date: r.task_date, penalty_amount: r.penalty_amount, penalty_reason: 'Không nộp CV Khóa' });
        console.log(`Source 1 (CV Khóa): ${rows.length}`);
    } catch(e) { console.log('Source 1 err:', e.message); }
    
    // Source 2: CV Chuỗi — CHỈ ngày 13/5
    try {
        const rows = await db.all(
            `SELECT cc.user_id, ci.task_name, cc.penalty_amount, ci.deadline::text as task_date, cins.chain_name
             FROM chain_task_completions cc
             JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
             JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
             WHERE cc.user_id = $1 AND cc.status = 'expired' AND cc.penalty_applied = true
               AND (CASE WHEN cc.redo_count = -2 THEN cc.created_at::date ELSE ci.deadline END) = $2::date`, [userId, targetDate]);
        for (const r of rows) penalties.push({ task_name: `CV Chuỗi: ${r.task_name} (${r.chain_name})`, task_date: r.task_date, penalty_amount: r.penalty_amount, penalty_reason: 'Không nộp CV Chuỗi' });
        console.log(`Source 2 (CV Chuỗi): ${rows.length}`);
    } catch(e) { console.log('Source 2 err:', e.message); }
    
    // Source 3: Cấp Cứu Sếp — CHỈ ngày 13/5
    try {
        const rows = await db.all(
            `SELECT e.id, c.customer_name, e.penalty_amount, e.created_at::text as task_date
             FROM emergencies e JOIN customers c ON c.id = e.customer_id
             WHERE (e.handler_id = $1 OR e.handover_to = $1) AND e.status = 'pending' AND e.penalty_applied = true
               AND e.created_at::date <= $2::date`, [userId, targetDate]);
        for (const r of rows) penalties.push({ task_name: `Cấp Cứu Sếp: ${r.customer_name}`, task_date: r.task_date, penalty_amount: r.penalty_amount, penalty_reason: 'Không xử lý cấp cứu' });
        console.log(`Source 3 (Cấp Cứu): ${rows.length}`);
    } catch(e) { console.log('Source 3 err:', e.message); }
    
    // Source 4: Hỗ Trợ NV — CHỈ ngày 13/5
    try {
        const rows = await db.all(
            `SELECT tsr.id, tsr.penalty_amount, tsr.created_at::text as task_date, tsr.source_type, tsr.task_name
             FROM task_support_requests tsr
             WHERE tsr.manager_id = $1 AND tsr.status = 'expired'
               AND tsr.created_at::date = $2::date`, [userId, targetDate]);
        for (const r of rows) penalties.push({ task_name: `Hỗ Trợ NV: ${r.task_name || r.source_type}`, task_date: r.task_date, penalty_amount: r.penalty_amount, penalty_reason: 'Không hỗ trợ NV' });
        console.log(`Source 4 (Hỗ Trợ NV): ${rows.length}`);
    } catch(e) { console.log('Source 4 err:', e.message); }
    
    // Source 5: KH Chưa XL — CHỈ ngày 13/5
    try {
        const rows = await db.all(
            `SELECT user_id, crm_type, unhandled_count, penalty_amount, penalty_date::text as task_date
             FROM customer_penalty_records WHERE user_id = $1 AND penalty_date = $2::date AND acknowledged = false`, [userId, targetDate]);
        for (const r of rows) {
            const isTre = r.crm_type.startsWith('tre_');
            const label = isTre ? `KH xử lý trễ: ${crmLabel(r.crm_type)}` : `KH chưa xử lý: ${crmLabel(r.crm_type)}`;
            penalties.push({ task_name: `${label} (${r.unhandled_count} KH)`, task_date: r.task_date, penalty_amount: r.penalty_amount, penalty_reason: isTre ? 'Không xử lý khách trễ' : 'Không xử lý khách hôm nay' });
        }
        console.log(`Source 5 (KH Chưa XL): ${rows.length}`);
    } catch(e) { console.log('Source 5 err:', e.message); }
    
    console.log('\n=== PENALTY LIST (chỉ 13/5) ===');
    let total = 0;
    penalties.forEach((p, i) => {
        console.log(`  ${i+1}. ${p.task_name} | ${p.task_date} | ${p.penalty_amount?.toLocaleString()}đ`);
        total += p.penalty_amount || 0;
    });
    console.log(`\n  TỔNG: ${total.toLocaleString()}đ (${penalties.length} vi phạm)`);
    
    // Block account
    await db.run(`UPDATE users SET access_blocked = true, access_blocked_reason = $1 WHERE id = $2`,
        [JSON.stringify(penalties), userId]);
    console.log(`\n✅ Đã khóa TK truongphongtest3`);
    
    process.exit(0);
})();
