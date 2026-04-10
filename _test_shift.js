const db = require('./db/pool');

// Copy logic from deadline-checker
async function getHolidays() {
    const rows = await db.all("SELECT holiday_date::text as d FROM holidays");
    return new Set(rows.map(r => r.d));
}
async function isUserOnLeave(userId, dateStr) {
    const leave = await db.get(
        "SELECT id FROM leave_requests WHERE user_id = $1 AND status = 'active' AND date_from <= $2 AND date_to >= $2",
        [userId, dateStr]
    );
    return !!leave;
}
function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
async function getEffectiveWorkingDay(originalDate, userId, holidays) {
    let d = new Date(originalDate);
    let maxIter = 30;
    while (maxIter-- > 0) {
        const ds = toDateStr(d);
        const isSunday = d.getDay() === 0;
        const isHoliday = holidays.has(ds);
        const onLeave = userId ? await isUserOnLeave(userId, ds) : false;
        if (!isSunday && !isHoliday && !onLeave) return ds;
        d.setDate(d.getDate() + 1);
    }
    return toDateStr(originalDate);
}

(async () => {
    try {
        const holidays = await getHolidays();
        console.log('=== TEST: getEffectiveWorkingDay ===\n');
        
        // Test 1: Ngày 5/4 = Chủ nhật → dời sang 6/4 (Thứ 2)
        const test1 = await getEffectiveWorkingDay(new Date(2026, 3, 5), null, holidays);
        console.log(`5/4 (CN) → ${test1} (expected: 2026-04-06 T2)`);
        
        // Test 2: Ngày 12/4 = Chủ nhật → dời sang 13/4 (Thứ 2)
        const test2 = await getEffectiveWorkingDay(new Date(2026, 3, 12), null, holidays);
        console.log(`12/4 (CN) → ${test2} (expected: 2026-04-13 T2)`);
        
        // Test 3: Ngày 8/4 = Thứ 4 → giữ nguyên
        const test3 = await getEffectiveWorkingDay(new Date(2026, 3, 8), null, holidays);
        console.log(`8/4 (T4) → ${test3} (expected: 2026-04-08 giữ nguyên)`);
        
        // Test 4: Monthly task "Lặp lại ngày 5 hàng tháng" - tháng 4
        console.log('\n=== TEST: Monthly task "ngày 5 hàng tháng" ===');
        const scheduledDay = 5;
        const checkDates = [];
        for (let d = 1; d <= 15; d++) {
            const checkDate = new Date(2026, 3, d); // April
            const originalMonthlyDate = new Date(2026, 3, scheduledDay);
            if (originalMonthlyDate.getMonth() === checkDate.getMonth()) {
                const effectiveDay = await getEffectiveWorkingDay(originalMonthlyDate, null, holidays);
                const checkDateStr = toDateStr(checkDate);
                const applies = effectiveDay === checkDateStr;
                if (applies) {
                    const dow = ['CN','T2','T3','T4','T5','T6','T7'][checkDate.getDay()];
                    console.log(`  ✅ ${d}/4 (${dow}): applies=TRUE (effective=${effectiveDay})`);
                }
            }
        }
        
        // Test 5: Chain task deadline 5/4 (CN)
        console.log('\n=== TEST: Chain task deadline 5/4 (CN) ===');
        const chainDeadline = '2026-04-05';
        const originalDeadlineDate = new Date(chainDeadline + 'T00:00:00');
        const effectiveChainDeadline = await getEffectiveWorkingDay(originalDeadlineDate, null, holidays);
        console.log(`  Deadline gốc: ${chainDeadline} (CN)`);
        console.log(`  Effective deadline: ${effectiveChainDeadline}`);
        console.log(`  → NV phải nộp trước 23:59 ngày ${effectiveChainDeadline}`);
        
        process.exit(0);
    } catch(e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
