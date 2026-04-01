/**
 * DEADLINE CHECKER — Cron job chạy mỗi 15 phút
 * Kiểm tra pending approvals & support requests quá hạn
 * → Khóa tài khoản quản lý + ghi phạt
 */
const db = require('../db/pool');

let _holidayCache = null;
let _holidayCacheTime = 0;

// ===== HELPERS =====

// Lấy danh sách ngày lễ (cache 1 giờ)
async function getHolidays() {
    const now = Date.now();
    if (_holidayCache && now - _holidayCacheTime < 3600000) return _holidayCache;
    const rows = await db.all("SELECT holiday_date::text as d FROM holidays");
    _holidayCache = new Set(rows.map(r => r.d));
    _holidayCacheTime = now;
    return _holidayCache;
}

// Kiểm tra quản lý có nghỉ ngày X không
async function isManagerOnLeave(managerId, dateStr) {
    const leave = await db.get(
        "SELECT id FROM leave_requests WHERE user_id = $1 AND status = 'active' AND date_from <= $2 AND date_to >= $2",
        [managerId, dateStr]
    );
    return !!leave;
}

// Format date → YYYY-MM-DD
function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Format date → local timestamp string (for PostgreSQL TIMESTAMP WITHOUT TIMEZONE)
function toLocalTimestamp(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

// Kiểm tra ngày có phải nghỉ không (Chủ nhật hoặc ngày lễ)
async function isDayOff(dateStr) {
    const holidays = await getHolidays();
    const d = new Date(dateStr + 'T00:00:00');
    if (d.getDay() === 0) return true; // Chủ nhật
    return holidays.has(dateStr);
}

/**
 * Tính deadline thực tế cho một task
 * - Base: 23:59 ngày làm việc tiếp theo sau created_at
 * - Kéo dài nếu Chủ nhật/lễ/quản lý nghỉ
 */
async function calculateRealDeadline(createdAt, managerId) {
    const created = new Date(createdAt);
    
    // Bắt đầu từ ngày sau created_at
    let deadline = new Date(created);
    deadline.setDate(deadline.getDate() + 1);
    
    // Kéo dài qua Chủ nhật, lễ, và ngày quản lý nghỉ
    let maxIterations = 30; // safety limit
    while (maxIterations-- > 0) {
        const ds = toDateStr(deadline);
        const dayOff = await isDayOff(ds);
        const onLeave = managerId ? await isManagerOnLeave(managerId, ds) : false;
        
        if (!dayOff && !onLeave) break; // Ngày làm việc + quản lý không nghỉ → OK
        deadline.setDate(deadline.getDate() + 1); // Kéo thêm 1 ngày
    }
    
    // Set 23:59:59
    deadline.setHours(23, 59, 59, 0);
    return deadline;
}

// ===== MAIN CHECKER =====
async function runDeadlineCheck() {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Đang kiểm tra deadline...`);
    
    let lockedCount = 0;
    let penaltyCount = 0;

    const nowLocal = toLocalTimestamp(now);

    // ========== 1. CHECK SUPPORT REQUESTS ==========
    const pendingSupport = await db.all(
        "SELECT * FROM task_support_requests WHERE status = 'pending' AND deadline_at IS NOT NULL AND deadline_at < $1",
        [nowLocal]
    );
    
    for (const sr of pendingSupport) {
        if (!sr.manager_id) continue;
        
        // Tính lại deadline thực (có tính nghỉ)
        const realDeadline = await calculateRealDeadline(sr.created_at, sr.manager_id);
        if (now < realDeadline) continue; // Chưa hết hạn thực
        
        // Lấy mức phạt
        let penaltyAmount = 50000; // default 50k
        const config = await db.get(
            "SELECT penalty_amount FROM task_penalty_config WHERE task_name = $1 AND penalty_amount > 0",
            [sr.task_name]
        );
        if (config) penaltyAmount = config.penalty_amount;
        
        // Ghi phạt vào support request
        await db.run(
            "UPDATE task_support_requests SET status = 'expired', penalty_amount = $1, penalty_reason = $2 WHERE id = $3",
            [penaltyAmount, `Không hỗ trợ nhân sự trước hạn: ${sr.task_name}`, sr.id]
        );
        
        // Khóa tài khoản quản lý
        await db.run("UPDATE users SET status = 'locked' WHERE id = $1 AND status = 'active'", [sr.manager_id]);
        
        lockedCount++;
        penaltyCount++;
        console.log(`  🔒 Khóa quản lý id=${sr.manager_id} — Không hỗ trợ: ${sr.task_name} (phạt ${penaltyAmount}đ)`);

        // ===== CHECK NV: Nếu NV cũng không nộp báo cáo → Khóa NV =====
        let nvSubmitted = false;
        if (sr.source_type === 'khoa' && sr.lock_task_id) {
            // CV Khóa: check lock_task_completions
            const comp = await db.get(
                `SELECT id FROM lock_task_completions
                 WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3
                   AND status IN ('pending','approved')`,
                [sr.lock_task_id, sr.user_id, sr.task_date]
            );
            nvSubmitted = !!comp;
            if (!nvSubmitted) {
                // Tạo expired completion record cho NV
                try {
                    await db.run(
                        `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, redo_count, status, penalty_amount, penalty_applied)
                         VALUES ($1, $2, $3, 0, 'expired', $4, true)
                         ON CONFLICT (lock_task_id, user_id, completion_date, redo_count) DO UPDATE SET status = 'expired', penalty_amount = $4, penalty_applied = true, content = COALESCE(lock_task_completions.content, EXCLUDED.content), proof_url = COALESCE(lock_task_completions.proof_url, EXCLUDED.proof_url)`,
                        [sr.lock_task_id, sr.user_id, sr.task_date, penaltyAmount]
                    );
                } catch(e) {}
            }
        } else if (sr.template_id) {
            // CV thường: check task_point_reports
            const report = await db.get(
                'SELECT id FROM task_point_reports WHERE template_id = $1 AND user_id = $2 AND report_date = $3',
                [sr.template_id, sr.user_id, sr.task_date]
            );
            nvSubmitted = !!report;
        }

        if (!nvSubmitted) {
            // Khóa NV vì không nộp trong thời hạn gia hạn
            await db.run("UPDATE users SET status = 'locked' WHERE id = $1 AND status = 'active'", [sr.user_id]);
            lockedCount++;
            console.log(`  🔐 Khóa NV id=${sr.user_id} — Không nộp báo cáo trong hạn hỗ trợ: ${sr.task_name}`);
        }
    }

    // ========== 2. CHECK PENDING APPROVALS ==========
    const pendingReports = await db.all(
        "SELECT r.*, t.task_name FROM task_point_reports r JOIN task_point_templates t ON r.template_id = t.id WHERE r.status = 'pending' AND r.approval_deadline IS NOT NULL AND r.approval_deadline < $1",
        [nowLocal]
    );
    
    // Group by approver (via task_approvers)
    for (const report of pendingReports) {
        // Find which manager should have approved this
        const reporter = await db.get("SELECT department_id FROM users WHERE id = $1", [report.user_id]);
        if (!reporter || !reporter.department_id) continue;
        
        // Walk up department tree to find approver
        let managerId = null;
        let lookupDeptId = reporter.department_id;
        const visited = new Set();
        while (lookupDeptId && !visited.has(lookupDeptId)) {
            visited.add(lookupDeptId);
            const approver = await db.get(
                "SELECT user_id FROM task_approvers WHERE department_id = $1 AND user_id != $2 LIMIT 1",
                [lookupDeptId, report.user_id]
            );
            if (approver) { managerId = approver.user_id; break; }
            const dept = await db.get("SELECT parent_id FROM departments WHERE id = $1", [lookupDeptId]);
            lookupDeptId = dept ? dept.parent_id : null;
        }
        
        if (!managerId) continue;
        
        // Tính deadline thực
        const realDeadline = await calculateRealDeadline(report.created_at, managerId);
        if (now < realDeadline) continue;
        
        // Lấy mức phạt
        let penaltyAmount = 50000;
        const config = await db.get(
            "SELECT penalty_amount FROM task_penalty_config WHERE task_name = $1 AND penalty_amount > 0",
            [report.task_name]
        );
        if (config) penaltyAmount = config.penalty_amount;
        
        // Auto-approve (vì quản lý không duyệt, để NV không bị ảnh hưởng)
        // Giữ pending để quản lý phải xử lý khi unlock
        
        // Tạo penalty record trong task_support_requests
        await db.run(
            `INSERT INTO task_support_requests (user_id, template_id, task_name, task_date, deadline, manager_id, department_id, status, penalty_amount, penalty_reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'expired', $8, $9)
             ON CONFLICT (user_id, template_id, task_date) DO UPDATE SET status = 'expired', penalty_amount = $8, penalty_reason = $9`,
            [report.user_id, report.template_id, report.task_name, report.report_date,
             toDateStr(realDeadline), managerId, reporter.department_id,
             penaltyAmount, `Không duyệt công việc trước hạn: ${report.task_name}`]
        );
        
        // Khóa tài khoản quản lý
        await db.run("UPDATE users SET status = 'locked' WHERE id = $1 AND status = 'active'", [managerId]);
        
        lockedCount++;
        penaltyCount++;
        console.log(`  🔒 Khóa quản lý id=${managerId} — Không duyệt: ${report.task_name} (phạt ${penaltyAmount}đ)`);
    }

    // ========== 3. CHECK CV KHÓA (Lock Tasks) ==========
    // Chỉ chạy vào 00:15 - 00:30: kiểm tra CV hôm qua chưa nộp → khóa NV + phạt
    const hour = now.getHours();
    const minute = now.getMinutes();
    const shouldCheckLockTasks = (hour === 0 && minute >= 15 && minute < 30);

    if (shouldCheckLockTasks) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toDateStr(yesterday);
        const yesterdayDow = yesterday.getDay(); // 0=Sun, 1=Mon...

        const holidays = await getHolidays();
        const isYesterdayHoliday = holidays.has(yesterdayStr);
        const isYesterdaySunday = yesterdayDow === 0;

        // Get all active lock tasks with assignments
        const lockAssignments = await db.all(
            `SELECT lt.id as task_id, lt.task_name, lt.recurrence_type, lt.recurrence_value,
                    lt.requires_approval, lt.penalty_amount, lt.department_id,
                    lta.user_id
             FROM lock_task_assignments lta
             JOIN lock_tasks lt ON lt.id = lta.lock_task_id AND lt.is_active = true`
        );

        for (const la of lockAssignments) {
            // Check if task applies to yesterday based on recurrence
            let applies = false;

            if (la.recurrence_type === 'administrative') {
                // T2-T7 (Mon-Sat), skip Sun + holidays
                applies = yesterdayDow >= 1 && yesterdayDow <= 6 && !isYesterdayHoliday;
            } else if (la.recurrence_type === 'daily') {
                // T2-CN, only skip holidays (Sunday NOT skipped!)
                applies = !isYesterdayHoliday;
            } else if (la.recurrence_type === 'weekly') {
                // Specific day of week
                applies = yesterdayDow === Number(la.recurrence_value) && !isYesterdayHoliday;
                if (isYesterdaySunday && la.recurrence_value !== '0') applies = false;
            } else if (la.recurrence_type === 'monthly') {
                // Specific day of month
                applies = yesterday.getDate() === Number(la.recurrence_value) && !isYesterdayHoliday && !isYesterdaySunday;
            } else if (la.recurrence_type === 'once') {
                // Specific date
                applies = yesterdayStr === la.recurrence_value && !isYesterdayHoliday && !isYesterdaySunday;
            }

            if (!applies) continue;

            // Check if already penalized for this task+date (don't re-lock after acknowledge)
            const alreadyExpired = await db.get(
                `SELECT id FROM lock_task_completions
                 WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3 AND status = 'expired' AND penalty_applied = true`,
                [la.task_id, la.user_id, yesterdayStr]
            );
            if (alreadyExpired) continue; // Already penalized, skip

            // Check if there's a completion
            const completion = await db.get(
                `SELECT id, status FROM lock_task_completions
                 WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3
                 ORDER BY redo_count DESC LIMIT 1`,
                [la.task_id, la.user_id, yesterdayStr]
            );

            if (completion && (completion.status === 'approved' || completion.status === 'pending')) {
                // Đã nộp (hoặc chờ duyệt) → NV an toàn
                continue;
            }

            // Check if NV has a pending/supported support request → skip (deadline extended)
            const activeSR = await db.get(
                `SELECT id, deadline_at FROM task_support_requests
                 WHERE user_id = $1 AND lock_task_id = $2 AND task_date = $3
                   AND source_type = 'khoa' AND status IN ('pending','supported')`,
                [la.user_id, la.task_id, yesterdayStr]
            );
            if (activeSR) {
                console.log(`  ⏭️ [CV Khóa] Skip NV id=${la.user_id} — Có yêu cầu hỗ trợ cho ${la.task_name} (deadline: ${activeSR.deadline_at})`);
                continue; // Deadline extended, will be checked when support expires
            }

            // NV CHƯA NỘP → Khóa TK + Phạt
            const penaltyAmount = la.penalty_amount || 50000;

            // Tạo completion record với status expired (redo_count=0)
            try {
                await db.run(
                    `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, redo_count, status, penalty_amount, penalty_applied)
                     VALUES ($1, $2, $3, 0, 'expired', $4, true)
                     ON CONFLICT (lock_task_id, user_id, completion_date, redo_count) DO UPDATE SET status = 'expired', penalty_amount = $4, penalty_applied = true, content = COALESCE(lock_task_completions.content, EXCLUDED.content), proof_url = COALESCE(lock_task_completions.proof_url, EXCLUDED.proof_url)`,
                    [la.task_id, la.user_id, yesterdayStr, penaltyAmount]
                );
            } catch(e) {
                console.error(`  ❌ Error creating expired record for task ${la.task_id}, user ${la.user_id}:`, e.message);
            }

            // Khóa tài khoản NV
            await db.run("UPDATE users SET status = 'locked' WHERE id = $1 AND status = 'active'", [la.user_id]);

            lockedCount++;
            penaltyCount++;
            console.log(`  🔐 [CV Khóa] Khóa NV id=${la.user_id} — Không nộp: ${la.task_name} ngày ${yesterdayStr} (phạt ${penaltyAmount}đ)`);
        }

        // ========== 3a. PHẠT CHỒNG PHẠT — Expired CV Khóa chưa báo cáo lại ==========
        // Check all expired completions from the past 30 days that haven't been re-reported
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = toDateStr(thirtyDaysAgo);

        const unreportedExpired = await db.all(
            `SELECT ltc.lock_task_id, ltc.user_id, ltc.completion_date::text as completion_date,
                    ltc.penalty_amount, ltc.updated_at, lt.task_name
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.status = 'expired' AND ltc.completion_date >= $1 AND ltc.completion_date < $2`,
            [thirtyDaysAgoStr, yesterdayStr]
        );

        for (const exp of unreportedExpired) {
            // Check if a newer completion (pending/approved) exists for same task+date
            const resubmitted = await db.get(
                `SELECT id FROM lock_task_completions
                 WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3
                   AND status IN ('pending','approved') AND redo_count > 0`,
                [exp.lock_task_id, exp.user_id, exp.completion_date]
            );
            if (resubmitted) continue; // Already re-reported, skip

            // Check if already penalized today for this specific task+date
            const lastPenalty = exp.updated_at ? new Date(exp.updated_at) : null;
            if (lastPenalty && toDateStr(lastPenalty) === toDateStr(now)) continue; // Already penalized today

            // Stack penalty: increase penalty_amount
            const extraPenalty = exp.penalty_amount || 50000;
            try {
                await db.run(
                    `UPDATE lock_task_completions SET penalty_amount = penalty_amount + $1, updated_at = NOW()
                     WHERE lock_task_id = $2 AND user_id = $3 AND completion_date = $4 AND status = 'expired'`,
                    [extraPenalty, exp.lock_task_id, exp.user_id, exp.completion_date]
                );
            } catch(e) {
                console.error(`  ❌ Error stacking penalty for task ${exp.lock_task_id}, user ${exp.user_id}:`, e.message);
            }

            // Lock account again (in case it was unlocked)
            await db.run("UPDATE users SET status = 'locked' WHERE id = $1 AND status = 'active'", [exp.user_id]);

            penaltyCount++;
            console.log(`  🔄 [CV Khóa] Phạt chồng NV id=${exp.user_id} — Chưa báo cáo lại: ${exp.task_name} ngày ${exp.completion_date} (thêm ${extraPenalty}đ)`);
        }
    } else {
        console.log(`  ⏭️ [CV Khóa] Bỏ qua — chỉ check vào 00:15-00:30 (hiện: ${hour}:${String(minute).padStart(2,'0')})`);
    }

    // ========== 3b. CHECK CV KHÓA - QL CHƯA DUYỆT ==========
    // Nếu CV requires_approval, NV đã nộp nhưng QL chưa duyệt → QL bị khóa
    // Deadline: 23:59 ngày làm việc tiếp theo
    const pendingLockReviews = await db.all(
        `SELECT ltc.*, lt.task_name, lt.department_id, u.department_id as user_dept_id
         FROM lock_task_completions ltc
         JOIN lock_tasks lt ON lt.id = ltc.lock_task_id AND lt.requires_approval = true
         JOIN users u ON u.id = ltc.user_id
         WHERE ltc.status = 'pending'`
    );

    for (const pr of pendingLockReviews) {
        // Tính deadline cho QL: 23:59 ngày làm việc tiếp theo sau NV nộp
        const submittedAt = new Date(pr.created_at);

        // Find the manager (approver) for this employee's department
        let managerId = null;
        let lookupDeptId = pr.user_dept_id;
        const visitedDepts = new Set();
        while (lookupDeptId && !visitedDepts.has(lookupDeptId)) {
            visitedDepts.add(lookupDeptId);
            const approver = await db.get(
                "SELECT user_id FROM task_approvers WHERE department_id = $1 AND user_id != $2 LIMIT 1",
                [lookupDeptId, pr.user_id]
            );
            if (approver) { managerId = approver.user_id; break; }
            const dept = await db.get("SELECT parent_id FROM departments WHERE id = $1", [lookupDeptId]);
            lookupDeptId = dept ? dept.parent_id : null;
        }

        if (!managerId) continue;

        // Tính real deadline (kéo dài qua CN/lễ/nghỉ QL)
        const realDeadline = await calculateRealDeadline(submittedAt, managerId);
        if (now < realDeadline) continue; // Chưa hết hạn

        // QL quá hạn → Khóa QL
        const penaltyAmount = pr.penalty_amount || 50000;

        await db.run("UPDATE users SET status = 'locked' WHERE id = $1 AND status = 'active'", [managerId]);

        lockedCount++;
        penaltyCount++;
        console.log(`  🔐 [CV Khóa] Khóa QL id=${managerId} — Không duyệt: ${pr.task_name} (phạt ${penaltyAmount}đ)`);
    }

    if (lockedCount > 0) {
        console.log(`  ✅ Đã khóa ${lockedCount} tài khoản, ${penaltyCount} lỗi vi phạm`);
    }
}

// ===== START CRON =====
function startDeadlineChecker() {
    console.log('⏰ Deadline checker khởi động (mỗi 15 phút)');
    // Run immediately on start
    setTimeout(() => runDeadlineCheck().catch(e => console.error('Deadline check error:', e)), 5000);
    // Then every 15 minutes
    setInterval(() => runDeadlineCheck().catch(e => console.error('Deadline check error:', e)), 15 * 60 * 1000);
}

module.exports = { startDeadlineChecker, calculateRealDeadline, toDateStr, toLocalTimestamp };
