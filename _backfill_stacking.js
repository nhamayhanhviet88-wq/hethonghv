const db = require('./db/pool');

async function main() {
    await new Promise(r => setTimeout(r, 500));
    
    const configRows = await db.all('SELECT key, amount FROM global_penalty_config');
    const GPC = {};
    configRows.forEach(r => { GPC[r.key] = Number(r.amount) || 0; });
    const cvKhoaAmt = GPC.cv_khoa_khong_nop || 50000;
    const cvChuoiAmt = GPC.cv_chuoi_khong_nop || 50000;
    
    console.log('========== BACKFILL PHẠT CHỒNG (BATCH SQL) ==========');
    
    // Get holidays set
    const holidays = await db.all("SELECT holiday_date::text as d FROM holidays");
    const holidaySet = new Set(holidays.map(h => h.d));
    
    // Get approved leaves
    const leaves = await db.all("SELECT user_id, date_from::text as df, date_to::text as dt FROM leave_requests WHERE status = 'approved'");
    
    function isOnLeave(userId, dateStr) {
        return leaves.some(l => l.user_id === userId && l.df <= dateStr && l.dt >= dateStr);
    }
    
    function isWorkingDay(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        if (d.getDay() === 0) return false; // Sunday
        if (holidaySet.has(dateStr)) return false;
        return true;
    }
    
    function addDays(ds, n) {
        const d = new Date(ds + 'T12:00:00');
        d.setDate(d.getDate() + n);
        return d.toISOString().split('T')[0];
    }
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = addDays(today, -1);
    
    // ========== CV KHÓA ==========
    console.log('\n--- CV KHÓA ---');
    
    // Get all expired lock tasks (original, not stacked)
    const lockExpired = await db.all(
        `SELECT ltc.lock_task_id, ltc.user_id, ltc.completion_date::text as orig_date,
                lt.task_name, u.username
         FROM lock_task_completions ltc
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         JOIN users u ON u.id = ltc.user_id
         WHERE ltc.status = 'expired' AND ltc.redo_count >= 0 AND ltc.penalty_applied = true
           AND ltc.completion_date < $1::date
           AND ltc.completion_date >= (CURRENT_DATE - INTERVAL '90 days')
         ORDER BY ltc.completion_date`,
        [yesterday]
    );
    
    // For each, check if re-submitted
    let lockToStack = [];
    for (const exp of lockExpired) {
        const resub = await db.get(
            `SELECT id FROM lock_task_completions
             WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3
               AND status IN ('pending','approved') AND redo_count > 0`,
            [exp.lock_task_id, exp.user_id, exp.orig_date]
        );
        if (!resub) lockToStack.push(exp);
    }
    
    console.log(`  Expired chưa báo cáo lại: ${lockToStack.length} tasks`);
    
    // Get existing stacked records to avoid duplicates
    const existingStacked = await db.all(
        `SELECT lock_task_id, user_id, completion_date::text as d FROM lock_task_completions WHERE redo_count = -2`
    );
    const existingSet = new Set(existingStacked.map(e => `${e.lock_task_id}-${e.user_id}-${e.d}`));
    
    // Build batch inserts
    let lockInserts = [];
    for (const exp of lockToStack) {
        let checkDate = addDays(exp.orig_date, 1);
        while (checkDate <= yesterday) {
            if (isWorkingDay(checkDate) && !isOnLeave(exp.user_id, checkDate)) {
                const key = `${exp.lock_task_id}-${exp.user_id}-${checkDate}`;
                if (!existingSet.has(key)) {
                    lockInserts.push({
                        lock_task_id: exp.lock_task_id,
                        user_id: exp.user_id,
                        completion_date: checkDate,
                        penalty_amount: cvKhoaAmt,
                        content: `Chưa báo cáo lại: ${exp.task_name} (ngày gốc: ${exp.orig_date})`,
                        username: exp.username,
                        task_name: exp.task_name,
                        orig_date: exp.orig_date
                    });
                    existingSet.add(key);
                }
            }
            checkDate = addDays(checkDate, 1);
        }
    }
    
    console.log(`  Records cần tạo: ${lockInserts.length}`);
    
    // Batch insert in chunks of 50
    let lockCreated = 0;
    for (let i = 0; i < lockInserts.length; i += 50) {
        const chunk = lockInserts.slice(i, i + 50);
        for (const ins of chunk) {
            try {
                await db.run(
                    `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, redo_count, status, penalty_amount, penalty_applied, content, acknowledged)
                     VALUES ($1, $2, $3, -2, 'expired', $4, true, $5, false)
                     ON CONFLICT (lock_task_id, user_id, completion_date, redo_count) DO NOTHING`,
                    [ins.lock_task_id, ins.user_id, ins.completion_date, ins.penalty_amount, ins.content]
                );
                lockCreated++;
            } catch(e) {}
        }
        if (i % 200 === 0) console.log(`  ... inserted ${Math.min(i + 50, lockInserts.length)}/${lockInserts.length}`);
    }
    
    console.log(`  ✅ Đã tạo ${lockCreated} records phạt chồng CV Khóa`);
    
    // ========== CV CHUỖI ==========
    console.log('\n--- CV CHUỖI ---');
    
    let chainCreated = 0;
    try {
        const chainExpired = await db.all(
            `SELECT cc.id, cc.chain_item_id, cc.user_id,
                    ci.task_name, ci.deadline::text as orig_date,
                    cins.chain_name, u.username
             FROM chain_task_completions cc
             JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
             JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
             JOIN users u ON u.id = cc.user_id
             WHERE cc.status = 'expired' AND cc.penalty_applied = true AND cc.redo_count >= 0
               AND ci.deadline < $1::date
               AND ci.deadline >= (CURRENT_DATE - INTERVAL '90 days')
             ORDER BY ci.deadline`,
            [yesterday]
        );
        
        let chainToStack = [];
        for (const exp of chainExpired) {
            const resub = await db.get(
                `SELECT id FROM chain_task_completions
                 WHERE chain_item_id = $1 AND user_id = $2 AND status IN ('pending','approved') AND redo_count > 0`,
                [exp.chain_item_id, exp.user_id]
            );
            if (!resub) chainToStack.push(exp);
        }
        
        console.log(`  Expired chưa báo cáo lại: ${chainToStack.length} tasks`);
        
        const existingChainStacked = await db.all(
            `SELECT chain_item_id, user_id, created_at::date::text as d FROM chain_task_completions WHERE redo_count = -2`
        );
        const existingChainSet = new Set(existingChainStacked.map(e => `${e.chain_item_id}-${e.user_id}-${e.d}`));
        
        let chainInserts = [];
        for (const exp of chainToStack) {
            let checkDate = addDays(exp.orig_date, 1);
            while (checkDate <= yesterday) {
                if (isWorkingDay(checkDate) && !isOnLeave(exp.user_id, checkDate)) {
                    const key = `${exp.chain_item_id}-${exp.user_id}-${checkDate}`;
                    if (!existingChainSet.has(key)) {
                        chainInserts.push({
                            chain_item_id: exp.chain_item_id,
                            user_id: exp.user_id,
                            date: checkDate,
                            penalty_amount: cvChuoiAmt,
                            content: `Chưa báo cáo lại: ${exp.task_name} (${exp.chain_name}) (ngày gốc: ${exp.orig_date})`
                        });
                        existingChainSet.add(key);
                    }
                }
                checkDate = addDays(checkDate, 1);
            }
        }
        
        console.log(`  Records cần tạo: ${chainInserts.length}`);
        
        for (const ins of chainInserts) {
            try {
                await db.run(
                    `INSERT INTO chain_task_completions (chain_item_id, user_id, status, penalty_amount, penalty_applied, content, redo_count, created_at)
                     VALUES ($1, $2, 'expired', $3, true, $4, -2, $5::timestamp)`,
                    [ins.chain_item_id, ins.user_id, ins.penalty_amount, ins.content, ins.date + ' 23:59:00']
                );
                chainCreated++;
            } catch(e) {}
        }
        
        console.log(`  ✅ Đã tạo ${chainCreated} records phạt chồng CV Chuỗi`);
    } catch(e) {
        console.log('  Lỗi:', e.message);
    }
    
    // ========== KẾT QUẢ ==========
    console.log('\n========== KẾT QUẢ ==========');
    console.log(`CV Khóa phạt chồng: ${lockCreated} records`);
    console.log(`CV Chuỗi phạt chồng: ${chainCreated} records`);
    console.log(`Tổng: ${lockCreated + chainCreated} records`);
    console.log('=============================');
    
    process.exit();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
