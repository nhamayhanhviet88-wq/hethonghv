/**
 * Backfill script: Tạo lại phạt chồng bị thiếu cho nhanvien10 (user 52)
 * và tất cả users bị ảnh hưởng bởi bug redo_count=-2 cố định
 */
const db = require('./db/pool');

// Copy helpers from deadline-checker
function toDateStr(d) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

async function isUserOnLeave(userId, dateStr) {
    const leave = await db.get(
        "SELECT id FROM leave_requests WHERE user_id = $1 AND status = 'active' AND date_from <= $2 AND date_to >= $2",
        [userId, dateStr]
    );
    return !!leave;
}

(async () => {
    try { await db.initialize?.() || await db._ensurePool?.(); } catch(e) {}

    const VN_OFFSET = 7 * 60 * 60 * 1000;
    const now = new Date(Date.now() + VN_OFFSET);
    const todayStr = toDateStr(now);

    // Get holidays
    const holidayRows = await db.all("SELECT holiday_date::text as d FROM holidays");
    const holidays = new Set(holidayRows.map(r => r.d));

    // Load GPC
    const gpcRows = await db.all('SELECT key, amount FROM global_penalty_config');
    const GPC = {};
    gpcRows.forEach(r => GPC[r.key] = Number(r.amount) || 0);
    const extraPenalty = GPC.cv_khoa_khong_nop || 50000;

    // Get all expired lock task completions (original, redo_count >= 0) in last 90 days
    const ninetyAgo = new Date(now);
    ninetyAgo.setUTCDate(ninetyAgo.getUTCDate() - 90);
    const ninetyAgoStr = toDateStr(ninetyAgo);

    const unreportedExpired = await db.all(
        `SELECT ltc.lock_task_id, ltc.user_id, ltc.completion_date::text as completion_date,
                ltc.penalty_amount, lt.task_name
         FROM lock_task_completions ltc
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id AND lt.is_active = true
         JOIN lock_task_assignments lta ON lta.lock_task_id = ltc.lock_task_id AND lta.user_id = ltc.user_id
         WHERE ltc.status = 'expired' AND ltc.redo_count >= 0 AND ltc.penalty_applied = true
           AND ltc.completion_date >= $1::date AND ltc.completion_date < $2::date`,
        [ninetyAgoStr, todayStr]
    );

    // Group by (lock_task_id, user_id) → collect ALL origDates
    const taskUserGroupMap = {};
    for (const exp of unreportedExpired) {
        // Skip if resubmitted
        const resubmitted = await db.get(
            `SELECT id FROM lock_task_completions
             WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3
               AND status IN ('pending','approved') AND redo_count > 0`,
            [exp.lock_task_id, exp.user_id, exp.completion_date]
        );
        if (resubmitted) continue;

        const groupKey = `${exp.lock_task_id}_${exp.user_id}`;
        if (!taskUserGroupMap[groupKey]) {
            taskUserGroupMap[groupKey] = {
                lock_task_id: exp.lock_task_id,
                user_id: exp.user_id,
                task_name: exp.task_name,
                origDates: new Set()
            };
        }
        taskUserGroupMap[groupKey].origDates.add(exp.completion_date);
    }

    let totalCreated = 0;

    for (const group of Object.values(taskUserGroupMap)) {
        const sortedOrigDates = Array.from(group.origDates).sort();
        if (sortedOrigDates.length <= 1) continue; // Single origDate → redo_count=-2 already works fine

        console.log(`\n📋 Task: ${group.task_name} | User: ${group.user_id} | OrigDates: ${sortedOrigDates.join(', ')}`);

        // origIdx=0 already covered by existing redo_count=-2 records
        // Need to create records for origIdx >= 1 (redo_count = -3, -4, ...)
        for (let origIdx = 1; origIdx < sortedOrigDates.length; origIdx++) {
            const origDate = sortedOrigDates[origIdx];
            const earliestOrig = new Date(origDate + 'T00:00:00Z');
            let stackDate = new Date(earliestOrig);
            stackDate.setUTCDate(stackDate.getUTCDate() + 1);

            const todayDate = new Date(todayStr + 'T00:00:00Z');
            const origParts = origDate.split('-');
            const origLabel = `${origParts[2]}/${origParts[1]}`;
            const redoVal = -(2 + origIdx);

            while (stackDate < todayDate) {
                const stackDateStr = toDateStr(stackDate);

                if (stackDate.getUTCDay() === 0) { stackDate.setUTCDate(stackDate.getUTCDate() + 1); continue; }
                if (holidays.has(stackDateStr)) { stackDate.setUTCDate(stackDate.getUTCDate() + 1); continue; }
                const onLeave = await isUserOnLeave(group.user_id, stackDateStr);
                if (onLeave) { stackDate.setUTCDate(stackDate.getUTCDate() + 1); continue; }

                try {
                    const res = await db.run(
                        `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, redo_count, status, penalty_amount, penalty_applied, content, acknowledged)
                         VALUES ($1, $2, $3, $4, 'expired', $5, true, $6, false)
                         ON CONFLICT (lock_task_id, user_id, completion_date, redo_count) DO NOTHING`,
                        [group.lock_task_id, group.user_id, stackDateStr, redoVal, extraPenalty,
                         `Phạt chồng: ${group.task_name} ngày ${origLabel} chưa BC`]
                    );
                    if (res && res.rowCount > 0) {
                        totalCreated++;
                        console.log(`  ✅ Created: ${stackDateStr} redo=${redoVal} → ${group.task_name} gốc ${origLabel}`);
                    }
                } catch(e) {
                    console.error(`  ❌ Error: ${e.message}`);
                }

                stackDate.setUTCDate(stackDate.getUTCDate() + 1);
            }
        }
    }

    console.log(`\n✅ Backfill complete. Created ${totalCreated} new stacking penalty records.`);

    // Now sync ledger for affected dates
    console.log('\n📒 Syncing ledger for recent dates...');
    const { syncLedgerForDate } = require('./utils/penaltyLedger');
    const dates = [];
    let d = new Date(ninetyAgo);
    while (d < now) {
        dates.push(toDateStr(d));
        d.setUTCDate(d.getUTCDate() + 1);
    }
    for (const dateStr of dates) {
        await syncLedgerForDate(dateStr);
    }
    console.log('📒 Ledger sync done.');

    // Verify nhanvien10 (user 52)
    console.log('\n=== Verification: nhanvien10 stacking for today (2026-05-16 + 2026-05-17) ===');
    const verify = await db.all(
        `SELECT ltc.completion_date::text as d, ltc.redo_count, ltc.penalty_amount, ltc.content, lt.task_name
         FROM lock_task_completions ltc JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
         WHERE ltc.user_id = 52 AND ltc.redo_count <= -2 AND ltc.completion_date >= '2026-05-16'::date
         ORDER BY ltc.completion_date, lt.task_name, ltc.redo_count`,
        []
    );
    console.log(JSON.stringify(verify, null, 2));

    // Verify ledger for nhanvien10 on 2026-05-16
    console.log('\n=== Ledger for nhanvien10 on 2026-05-16 ===');
    const ledger = await db.all(
        `SELECT task_name, source_type, penalty_amount FROM daily_penalty_ledger
         WHERE user_id = 52 AND penalty_date = '2026-05-16'::date ORDER BY task_name`,
        []
    );
    console.log(JSON.stringify(ledger, null, 2));
    console.log(`Total for 2026-05-16: ${ledger.reduce((s,r) => s + r.penalty_amount, 0)}đ`);

    process.exit(0);
})();
