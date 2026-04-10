const db = require('./db/pool');
async function main() {
    await new Promise(r => setTimeout(r, 500));
    
    // Read penalty config
    const configRows = await db.all('SELECT key, amount FROM global_penalty_config');
    const GPC = {};
    configRows.forEach(r => { GPC[r.key] = Number(r.amount) || 0; });
    const cvKhoaAmt = GPC.cv_khoa_khong_nop || 50000;
    const cvChuoiAmt = GPC.cv_chuoi_khong_nop || 50000;
    
    console.log('========== BACKFILL REDO/REJECTED ==========');
    let count = 0;
    
    // Fix lock_task_completions: redo/rejected + past deadline
    const lockRedo = await db.all(
        `SELECT ltc.id, ltc.user_id, u.username, lt.task_name, ltc.completion_date::text as d, ltc.status
         FROM lock_task_completions ltc
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         JOIN users u ON u.id = ltc.user_id
         WHERE ltc.status IN ('redo', 'rejected') AND ltc.completion_date < CURRENT_DATE
         ORDER BY ltc.completion_date`
    );
    
    for (const r of lockRedo) {
        await db.run(
            'UPDATE lock_task_completions SET status = $1, penalty_applied = true, penalty_amount = $2 WHERE id = $3',
            ['expired', cvKhoaAmt, r.id]
        );
        console.log(`  ✅ CV Khóa | ${r.username} | ${r.task_name} | ${r.d} | ${r.status} → expired | ${cvKhoaAmt}đ`);
        count++;
    }
    
    // Fix chain_task_completions: redo/rejected + past deadline
    try {
        const chainRedo = await db.all(
            `SELECT cc.id, cc.user_id, u.username, ci.task_name, ci.deadline::text as d, cc.status
             FROM chain_task_completions cc
             JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
             JOIN users u ON u.id = cc.user_id
             WHERE cc.status IN ('redo', 'rejected') AND ci.deadline < CURRENT_DATE
             ORDER BY ci.deadline`
        );
        for (const r of chainRedo) {
            await db.run(
                'UPDATE chain_task_completions SET status = $1, penalty_applied = true, penalty_amount = $2 WHERE id = $3',
                ['expired', cvChuoiAmt, r.id]
            );
            console.log(`  ✅ CV Chuỗi | ${r.username} | ${r.task_name} | ${r.d} | ${r.status} → expired | ${cvChuoiAmt}đ`);
            count++;
        }
    } catch(e) {}
    
    console.log(`\nTổng: ${count} records đã fix`);
    process.exit();
}
main().catch(e => { console.error(e); process.exit(1); });
