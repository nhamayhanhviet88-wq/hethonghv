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

// Kiểm tra user (NV/TP/QL) có nghỉ ngày X không
async function isUserOnLeave(userId, dateStr) {
    const leave = await db.get(
        "SELECT id FROM leave_requests WHERE user_id = $1 AND status = 'active' AND date_from <= $2 AND date_to >= $2",
        [userId, dateStr]
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
 * Tính ngày làm việc hiệu lực: nếu ngày gốc rơi vào CN/Lễ/NV nghỉ → dời tới ngày đi làm tiếp theo
 * Dùng cho: CV Khóa monthly + CV Chuỗi
 * @param {Date} originalDate - Ngày gốc
 * @param {number|null} userId - User cần check nghỉ phép
 * @param {Set} holidays - Set ngày lễ
 * @returns {string} - YYYY-MM-DD ngày làm việc hiệu lực
 */
async function getEffectiveWorkingDay(originalDate, userId, holidays) {
    let d = new Date(originalDate);
    let maxIter = 30;
    while (maxIter-- > 0) {
        const ds = toDateStr(d);
        const isSunday = d.getDay() === 0;
        const isHoliday = holidays.has(ds);
        const onLeave = userId ? await isUserOnLeave(userId, ds) : false;
        if (!isSunday && !isHoliday && !onLeave) return ds; // Ngày đi làm → trả về
        d.setDate(d.getDate() + 1); // Dời 1 ngày
    }
    return toDateStr(originalDate); // Fallback
}

/**
 * Tính deadline thực tế cho một task
 * - Base: ngày làm việc tiếp theo sau created_at
 * - Kéo dài nếu Chủ nhật/lễ/user nghỉ phép
 * @param {Date|string} createdAt - Thời gian tạo
 * @param {number|null} userId - User cần check nghỉ phép (null = không check)
 * @param {number} deadlineHour - Giờ deadline (23 = 23:59, 12 = 12:00)
 */
async function calculateRealDeadline(createdAt, userId, deadlineHour = 23) {
    const created = new Date(createdAt);
    
    // Bắt đầu từ ngày sau created_at
    let deadline = new Date(created);
    deadline.setDate(deadline.getDate() + 1);
    
    // Kéo dài qua Chủ nhật, lễ, và ngày user nghỉ
    let maxIterations = 30; // safety limit
    while (maxIterations-- > 0) {
        const ds = toDateStr(deadline);
        const dayOff = await isDayOff(ds);
        const onLeave = userId ? await isUserOnLeave(userId, ds) : false;
        
        if (!dayOff && !onLeave) break; // Ngày làm việc + không nghỉ → OK
        deadline.setDate(deadline.getDate() + 1); // Kéo thêm 1 ngày
    }
    
    // Set deadline hour
    if (deadlineHour === 12) {
        deadline.setHours(12, 0, 0, 0);
    } else {
        deadline.setHours(23, 59, 59, 0);
    }
    return deadline;
}

// ===== MAIN CHECKER =====
async function runDeadlineCheck(forceFullCheck = false) {
    const now = new Date();
    console.log(`⏰ [${now.toISOString()}] Đang kiểm tra deadline...${forceFullCheck ? ' (FULL CHECK - khởi động)' : ''}`);
    
    let penaltyCount = 0;

    const nowLocal = toLocalTimestamp(now);

    // ★ Không khóa tài khoản nữa — chỉ ghi phạt + hiển thị popup thông báo
    const _hour = now.getHours();
    const _minute = now.getMinutes();

    // Load global penalty config
    const _gpcRows = await db.all('SELECT key, amount FROM global_penalty_config');
    const GPC = {};
    _gpcRows.forEach(r => { GPC[r.key] = Number(r.amount) || 0; });
    // Defaults if not in DB
    if (!GPC.cv_diem_ql_khong_duyet) GPC.cv_diem_ql_khong_duyet = 50000;
    if (!GPC.cv_diem_ql_khong_ho_tro) GPC.cv_diem_ql_khong_ho_tro = 50000;
    if (!GPC.cv_khoa_khong_nop) GPC.cv_khoa_khong_nop = 50000;
    if (!GPC.cv_khoa_ql_khong_duyet) GPC.cv_khoa_ql_khong_duyet = 50000;
    if (!GPC.cv_khoa_ql_khong_ho_tro) GPC.cv_khoa_ql_khong_ho_tro = 50000;
    if (!GPC.cv_chuoi_khong_nop) GPC.cv_chuoi_khong_nop = 50000;
    if (!GPC.cv_chuoi_ql_khong_duyet) GPC.cv_chuoi_ql_khong_duyet = 50000;
    if (!GPC.cap_cuu_ql_khong_xu_ly) GPC.cap_cuu_ql_khong_xu_ly = 50000;
    if (!GPC.kh_chua_xu_ly_hom_nay) GPC.kh_chua_xu_ly_hom_nay = 100000;
    if (!GPC.kh_chua_xu_ly_tre) GPC.kh_chua_xu_ly_tre = 100000;

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
        
        // Lấy mức phạt từ global config
        const penaltyAmount = sr.source_type === 'khoa'
            ? GPC.cv_khoa_ql_khong_ho_tro
            : GPC.cv_diem_ql_khong_ho_tro;
        
        // Ghi phạt vào support request
        await db.run(
            "UPDATE task_support_requests SET status = 'expired', penalty_amount = $1, penalty_reason = $2 WHERE id = $3",
            [penaltyAmount, `Không hỗ trợ nhân sự trước hạn: ${sr.task_name}`, sr.id]
        );
        
        // Ghi phạt (không khóa TK)
        penaltyCount++;
        console.log(`  ⚠️ Phạt quản lý id=${sr.manager_id} — Không hỗ trợ: ${sr.task_name} (phạt ${penaltyAmount}đ)`);

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
                // Tạo expired completion record cho NV (dùng GPC NV, không dùng nhầm QL)
                const nvPenalty = GPC.cv_khoa_khong_nop;
                try {
                    await db.run(
                        `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, redo_count, status, penalty_amount, penalty_applied)
                         VALUES ($1, $2, $3, 0, 'expired', $4, true)
                         ON CONFLICT (lock_task_id, user_id, completion_date, redo_count) DO UPDATE SET status = 'expired', penalty_amount = $4, penalty_applied = true, content = COALESCE(lock_task_completions.content, EXCLUDED.content), proof_url = COALESCE(lock_task_completions.proof_url, EXCLUDED.proof_url)`,
                        [sr.lock_task_id, sr.user_id, sr.task_date, nvPenalty]
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
            // Ghi phạt NV (không khóa TK)
            penaltyCount++;
            console.log(`  ⚠️ Phạt NV id=${sr.user_id} — Không nộp báo cáo trong hạn hỗ trợ: ${sr.task_name}`);
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
        
        // Lấy mức phạt từ global config
        const penaltyAmount = GPC.cv_diem_ql_khong_duyet;
        
        // Auto-approve (vì quản lý không duyệt, để NV không bị ảnh hưởng)
        // Giữ pending để quản lý phải xử lý khi unlock
        
        // Tạo penalty record trong task_support_requests
        await db.run(
            `INSERT INTO task_support_requests (user_id, template_id, task_name, task_date, deadline, manager_id, department_id, status, penalty_amount, penalty_reason, acknowledged)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'expired', $8, $9, false)
             ON CONFLICT (user_id, template_id, task_date) DO UPDATE SET status = 'expired', penalty_amount = $8, penalty_reason = $9, acknowledged = false`,
            [report.user_id, report.template_id, report.task_name, report.report_date,
             toDateStr(realDeadline), managerId, reporter.department_id,
             penaltyAmount, `Không duyệt công việc trước hạn: ${report.task_name}`]
        );
        
        // Ghi phạt (không khóa TK)
        penaltyCount++;
        console.log(`  🔒 Phạt quản lý id=${managerId} — Không duyệt: ${report.task_name} (phạt ${penaltyAmount}đ)`);
    }

    // ========== 3. CHECK CV KHÓA (Lock Tasks) ==========
    // Chỉ chạy vào 00:15 - 00:30: kiểm tra 90 ngày qua chưa nộp → ghi phạt
    const shouldCheckLockTasks = forceFullCheck || (_hour === 0 && _minute >= 15 && _minute < 30);

    if (shouldCheckLockTasks) {
        const holidays = await getHolidays();

        // Get all active lock tasks with assignments + user's department_joined_at + assigned_at
        const lockAssignments = await db.all(
            `SELECT lt.id as task_id, lt.task_name, lt.recurrence_type, lt.recurrence_value,
                    lt.requires_approval, lt.penalty_amount, lt.department_id,
                    lta.user_id, lta.created_at as assigned_at, u.department_joined_at
             FROM lock_task_assignments lta
             JOIN lock_tasks lt ON lt.id = lta.lock_task_id AND lt.is_active = true
             JOIN users u ON u.id = lta.user_id AND u.status != 'resigned'`
        );

        // Check past 90 days (to handle long leave periods)
        for (let daysBack = 1; daysBack <= 90; daysBack++) {
            const checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() - daysBack);
            const checkDateStr = toDateStr(checkDate);
            const checkDow = checkDate.getDay();
            const isCheckHoliday = holidays.has(checkDateStr);
            const isCheckSunday = checkDow === 0;

            for (const la of lockAssignments) {
                // Check if task applies to this date based on recurrence
                let applies = false;

                if (la.recurrence_type === 'administrative') {
                    applies = checkDow >= 1 && checkDow <= 6 && !isCheckHoliday; // T2-T7 by design
                } else if (la.recurrence_type === 'daily') {
                    applies = !isCheckHoliday;
                } else if (la.recurrence_type === 'weekly') {
                    const wDays = (la.recurrence_value || '').split(',').map(Number);
                    applies = wDays.includes(checkDow) && !isCheckHoliday;
                } else if (la.recurrence_type === 'monthly') {
                    // Monthly multi-day: check each scheduled day, handle short months
                    const scheduledDays = (la.recurrence_value || '').split(',').map(Number).filter(n => !isNaN(n));
                    const lastDay = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();
                    for (const scheduledDay of scheduledDays) {
                        const effectiveDay = Math.min(scheduledDay, lastDay);
                        const originalMonthlyDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), effectiveDay);
                        if (originalMonthlyDate.getMonth() === checkDate.getMonth()) {
                            const effectiveWorkDay = await getEffectiveWorkingDay(originalMonthlyDate, la.user_id, holidays);
                            if (effectiveWorkDay === checkDateStr) { applies = true; break; }
                        }
                    }
                } else if (la.recurrence_type === 'once') {
                    applies = checkDateStr === la.recurrence_value && !isCheckHoliday;
                }

                if (!applies) continue;

                // ★ Skip if task date is before the task was assigned (ngày giao việc)
                if (la.assigned_at) {
                    const assignedDate = toDateStr(new Date(la.assigned_at));
                    if (checkDateStr < assignedDate) continue;
                }

                // Skip if task date is before user joined their department
                if (la.department_joined_at) {
                    const joinedDate = toDateStr(new Date(la.department_joined_at));
                    if (checkDateStr < joinedDate) continue;
                }

                // Check if already penalized for this task+date
                const alreadyExpired = await db.get(
                    `SELECT id FROM lock_task_completions
                     WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3 AND status = 'expired' AND penalty_applied = true`,
                    [la.task_id, la.user_id, checkDateStr]
                );
                if (alreadyExpired) continue;

                // Check if there's a completion
                const completion = await db.get(
                    `SELECT id, status FROM lock_task_completions
                     WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3
                     ORDER BY redo_count DESC LIMIT 1`,
                    [la.task_id, la.user_id, checkDateStr]
                );
                if (completion && (completion.status === 'approved' || completion.status === 'pending')) continue;

                // Check if NV has a pending/supported support request
                const activeSR = await db.get(
                    `SELECT id FROM task_support_requests
                     WHERE user_id = $1 AND lock_task_id = $2 AND task_date = $3
                       AND source_type = 'khoa' AND status IN ('pending','supported')`,
                    [la.user_id, la.task_id, checkDateStr]
                );
                if (activeSR) continue;

                // ★ CHECK NGHỈ PHÉP: Nếu NV nghỉ ngày đó → tính deadline kéo dài
                const userOnLeave = await isUserOnLeave(la.user_id, checkDateStr);
                if (userOnLeave) {
                    // Tính real deadline: ngày đi làm tiếp theo sau ngày nghỉ
                    const taskDate = new Date(checkDateStr + 'T00:00:00');
                    const realDeadline = await calculateRealDeadline(taskDate, la.user_id);
                    if (now < realDeadline) {
                        // Chưa hết hạn kéo dài → skip, sẽ check lại đêm sau
                        continue;
                    }
                    // Đã hết hạn kéo dài mà vẫn chưa nộp → phạt bên dưới
                }

                // NV CHƯA NỘP + HẾT HẠN → Khóa TK + Phạt
                const penaltyAmount = GPC.cv_khoa_khong_nop;

                try {
                    await db.run(
                        `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, redo_count, status, penalty_amount, penalty_applied, acknowledged)
                         VALUES ($1, $2, $3, 0, 'expired', $4, true, false)
                         ON CONFLICT (lock_task_id, user_id, completion_date, redo_count) DO UPDATE SET status = 'expired', penalty_amount = $4, penalty_applied = true`,
                        [la.task_id, la.user_id, checkDateStr, penaltyAmount]
                    );
                } catch(e) {
                    console.error(`  ❌ Error creating expired record for task ${la.task_id}, user ${la.user_id}:`, e.message);
                }

                // Ghi phạt (không khóa TK)
                penaltyCount++;
                console.log(`  ⚠️ [CV Khóa] Phạt NV id=${la.user_id} — Không nộp: ${la.task_name} ngày ${checkDateStr} (phạt ${penaltyAmount}đ)`);
            }
        }

        // ========== 3a. PHẠT CHỒNG PHẠT HÀNG NGÀY — Expired CV Khóa chưa báo cáo lại ==========
        // Tạo phạt chồng MỖI NGÀY LÀM VIỆC cho mỗi CV Khóa chưa báo cáo lại
        const todayForStack = toDateStr(now);
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const ninetyDaysAgoStr = toDateStr(ninetyDaysAgo);

        const unreportedExpired = await db.all(
            `SELECT ltc.lock_task_id, ltc.user_id, ltc.completion_date::text as completion_date,
                    ltc.penalty_amount, lt.task_name
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id AND lt.is_active = true
             JOIN lock_task_assignments lta ON lta.lock_task_id = ltc.lock_task_id AND lta.user_id = ltc.user_id
             WHERE ltc.status = 'expired' AND ltc.redo_count >= 0 AND ltc.penalty_applied = true
               AND ltc.completion_date >= $1::date AND ltc.completion_date < $2::date`,
            [ninetyDaysAgoStr, todayForStack]
        );

        // Group by (lock_task_id, user_id), filter out resubmitted originals
        const taskUserMap = {};
        for (const exp of unreportedExpired) {
            const resubmitted = await db.get(
                `SELECT id FROM lock_task_completions
                 WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3
                   AND status IN ('pending','approved') AND redo_count > 0`,
                [exp.lock_task_id, exp.user_id, exp.completion_date]
            );
            if (resubmitted) continue;

            const key = `${exp.lock_task_id}_${exp.user_id}`;
            if (!taskUserMap[key]) {
                taskUserMap[key] = {
                    lock_task_id: exp.lock_task_id,
                    user_id: exp.user_id,
                    task_name: exp.task_name,
                    origDates: []
                };
            }
            taskUserMap[key].origDates.push(exp.completion_date);
        }

        const extraPenaltyKhoa = GPC.cv_khoa_khong_nop;
        let stackCountKhoa = 0;

        for (const k of Object.values(taskUserMap)) {
            if (k.origDates.length === 0) continue;
            k.origDates.sort();

            // Stacking bắt đầu từ ngày sau original sớm nhất → đến hôm nay
            const earliestOrig = new Date(k.origDates[0] + 'T00:00:00');
            let stackDate = new Date(earliestOrig);
            stackDate.setDate(stackDate.getDate() + 1);

            const todayDate = new Date(todayForStack + 'T00:00:00');

            while (stackDate < todayDate) {
                const stackDateStr = toDateStr(stackDate);

                // Skip Chủ nhật
                if (stackDate.getDay() === 0) { stackDate.setDate(stackDate.getDate() + 1); continue; }
                // Skip ngày lễ
                if (holidays.has(stackDateStr)) { stackDate.setDate(stackDate.getDate() + 1); continue; }
                // Skip NV nghỉ phép
                const onLeave = await isUserOnLeave(k.user_id, stackDateStr);
                if (onLeave) { stackDate.setDate(stackDate.getDate() + 1); continue; }

                // Đếm bao nhiêu ngày gốc TRƯỚC ngày stacking này
                const countBefore = k.origDates.filter(d => d < stackDateStr).length;
                if (countBefore === 0) { stackDate.setDate(stackDate.getDate() + 1); continue; }

                const totalPenalty = countBefore * extraPenaltyKhoa;

                try {
                    const res = await db.run(
                        `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, redo_count, status, penalty_amount, penalty_applied, content, acknowledged)
                         VALUES ($1, $2, $3, -2, 'expired', $4, true, $5, false)
                         ON CONFLICT (lock_task_id, user_id, completion_date, redo_count) DO NOTHING`,
                        [k.lock_task_id, k.user_id, stackDateStr, totalPenalty,
                         `Phạt chồng: ${k.task_name} (${countBefore} ngày gốc chưa BC)`]
                    );
                    if (res && res.rowCount > 0) {
                        stackCountKhoa++;
                    }
                } catch(e) {
                    console.error(`  ❌ Error stacking penalty for task ${k.lock_task_id}, user ${k.user_id}:`, e.message);
                }

                stackDate.setDate(stackDate.getDate() + 1);
            }
        }

        if (stackCountKhoa > 0) {
            penaltyCount += stackCountKhoa;
            console.log(`  🔄 [CV Khóa] Tạo ${stackCountKhoa} bản ghi phạt chồng hàng ngày`);
        }
    } else {
        console.log(`  ⏭️ [CV Khóa] Bỏ qua — chỉ check vào 00:15-00:30 hoặc lúc khởi động (hiện: ${_hour}:${String(_minute).padStart(2,'0')})`);
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

        // QL quá hạn → Phạt + Khóa QL
        const penaltyAmount = GPC.cv_khoa_ql_khong_duyet;

        // Auto-approve NV's completion (để NV không bị ảnh hưởng)
        await db.run(
            `UPDATE lock_task_completions SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
            [managerId, pr.id]
        );

        // Create penalty record for the MANAGER (redo_count=-1 to distinguish)
        try {
            await db.run(
                `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, redo_count, status, penalty_amount, penalty_applied, content, acknowledged)
                 VALUES ($1, $2, $3, -1, 'expired', $4, true, $5, false)
                 ON CONFLICT (lock_task_id, user_id, completion_date, redo_count) DO UPDATE SET status = 'expired', penalty_amount = $4, penalty_applied = true`,
                [pr.lock_task_id, managerId, pr.completion_date, penaltyAmount, `QL không duyệt CV Khóa: ${pr.task_name}`]
            );
        } catch(e) {}

        // Ghi phạt (không khóa TK)
        penaltyCount++;
        console.log(`  ⚠️ [CV Khóa] Phạt QL id=${managerId} — Không duyệt: ${pr.task_name} (phạt ${penaltyAmount}đ)`);
    }

    // ========== 4. CHECK CV CHUỖI — QL CHƯA DUYỆT ==========
    const pendingChainReviews = await db.all(
        `SELECT cc.*, ci.task_name, ci.chain_instance_id,
                cins.department_id, cins.penalty_amount as chain_penalty, u.department_id as user_dept_id
         FROM chain_task_completions cc
         JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
         JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
         JOIN users u ON u.id = cc.user_id
         WHERE cc.status = 'pending' AND cc.approval_deadline IS NOT NULL`
    );

    for (const pr of pendingChainReviews) {
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

        // QL quá hạn → Phạt + Khóa QL
        const penaltyAmount = GPC.cv_chuoi_ql_khong_duyet;

        // Auto-approve completion (để NV không bị ảnh hưởng)
        await db.run(
            `UPDATE chain_task_completions SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
            [managerId, pr.id]
        );

        // Mark the completion as penalty for the MANAGER
        // Create a separate expired record for the manager penalty tracking
        try {
            await db.run(
                `INSERT INTO chain_task_completions (chain_item_id, user_id, status, penalty_amount, penalty_applied, content, redo_count)
                 VALUES ($1, $2, 'expired', $3, true, $4, -1)
                 ON CONFLICT DO NOTHING`,
                [pr.chain_item_id, managerId, penaltyAmount, `QL không duyệt CV chuỗi: ${pr.task_name}`]
            );
        } catch(e) {}

        // Ghi phạt (không khóa TK)
        penaltyCount++;
        console.log(`  ⚠️ [CV Chuỗi] Phạt QL id=${managerId} — Không duyệt: ${pr.task_name} (phạt ${penaltyAmount}đ)`);
    }

    // ========== 5. CHECK CV CHUỖI — NV KHÔNG NỘP ==========
    // Chạy cùng 00:15-00:30: kiểm tra chain items quá deadline → ghi phạt
    if (shouldCheckLockTasks) {
        const yesterday2 = new Date(now);
        yesterday2.setDate(yesterday2.getDate() - 1);
        const yesterdayStr2 = toDateStr(yesterday2);

        // Get all chain items with deadline = yesterday that are not completed
        const overdueChainItems = await db.all(
            `SELECT cii.id as item_id, cii.task_name, cii.deadline::text as deadline, cii.status as item_status,
                    cii.min_quantity, cii.penalty_amount as item_penalty,
                    ci.id as chain_instance_id, ci.chain_name, ci.penalty_amount as chain_penalty, ci.department_id,
                    ca.user_id
             FROM chain_task_instance_items cii
             JOIN chain_task_instances ci ON ci.id = cii.chain_instance_id AND ci.status != 'cancelled'
             JOIN chain_task_assignments ca ON ca.chain_item_id = cii.id
             WHERE cii.deadline::text <= $1
               AND cii.status NOT IN ('completed')`,
            [yesterdayStr2]
        );

        for (const oci of overdueChainItems) {
            // Check if effectively completed (approved >= min_quantity)
            const approvedCount = await db.get(
                `SELECT COUNT(*) as cnt FROM chain_task_completions WHERE chain_item_id = $1 AND status = 'approved'`,
                [oci.item_id]
            );
            const minQty = oci.min_quantity || 1;
            if (approvedCount && Number(approvedCount.cnt) >= minQty) continue; // Effectively completed

            // Check if this user already has an approved/pending submission
            const userComp = await db.get(
                `SELECT id, status FROM chain_task_completions
                 WHERE chain_item_id = $1 AND user_id = $2 AND status IN ('pending','approved')`,
                [oci.item_id, oci.user_id]
            );
            if (userComp) continue; // NV đã nộp

            // Check if already penalized (don't double-penalize)
            const alreadyPenalized = await db.get(
                `SELECT id FROM chain_task_completions
                 WHERE chain_item_id = $1 AND user_id = $2 AND status = 'expired' AND penalty_applied = true`,
                [oci.item_id, oci.user_id]
            );
            if (alreadyPenalized) continue;

            // ★ Phạt TẤT CẢ bước quá deadline, kể cả bị block bởi sequential mode
            // (User yêu cầu: Phương án A — penalize all steps past deadline)

            // ★ CHECK DỜI LỊCH: Nếu deadline rơi vào CN/Lễ/NV nghỉ → dời sang ngày đi làm
            const chainHolidays = await getHolidays();
            const originalDeadlineDate = new Date(oci.deadline + 'T00:00:00');
            const effectiveChainDeadline = await getEffectiveWorkingDay(originalDeadlineDate, oci.user_id, chainHolidays);
            const effectiveDeadlineDate = new Date(effectiveChainDeadline + 'T23:59:59');
            if (now < effectiveDeadlineDate) continue; // Chưa hết hạn (tính theo ngày đã dời)

            // Mức phạt: ưu tiên item_penalty > chain_penalty > 50000
            const penaltyAmount = GPC.cv_chuoi_khong_nop;

            try {
                await db.run(
                    `INSERT INTO chain_task_completions (chain_item_id, user_id, status, penalty_amount, penalty_applied, content, redo_count, created_at)
                     VALUES ($1, $2, 'expired', $3, true, $4, 0, NOW())`,
                    [oci.item_id, oci.user_id, penaltyAmount,
                     `Không nộp báo cáo CV chuỗi: ${oci.task_name} (${oci.chain_name})`]
                );
            } catch(e) {
                console.error(`  ❌ Error creating chain penalty for item ${oci.item_id}, user ${oci.user_id}:`, e.message);
                continue;
            }

            // Ghi phạt (không khóa TK)
            penaltyCount++;
            console.log(`  ⚠️ [CV Chuỗi] Phạt NV id=${oci.user_id} — Không nộp: ${oci.task_name} (${oci.chain_name}) deadline ${oci.deadline} (phạt ${penaltyAmount}đ)`);
        }

        // ========== 5a. PHẠT CHỒNG PHẠT HÀNG NGÀY — Expired CV Chuỗi chưa báo cáo lại ==========
        // Tạo phạt chồng MỖI NGÀY LÀM VIỆC cho mỗi CV Chuỗi chưa báo cáo lại
        const ninetyDaysAgo2 = new Date(now);
        ninetyDaysAgo2.setDate(ninetyDaysAgo2.getDate() - 90);
        const ninetyDaysAgoStr2 = toDateStr(ninetyDaysAgo2);
        const todayForChainStack = toDateStr(now);
        const chainHolidaysStack = await getHolidays();

        const unreportedChainExpired = await db.all(
            `SELECT cc.id, cc.chain_item_id, cc.user_id, cc.penalty_amount, cc.created_at,
                    ci.task_name, ci.deadline::text as deadline,
                    cins.chain_name
             FROM chain_task_completions cc
             JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
             JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
             WHERE cc.status = 'expired' AND cc.penalty_applied = true AND cc.redo_count >= 0
               AND ci.deadline >= $1::date AND ci.deadline < $2::date`,
            [ninetyDaysAgoStr2, todayForChainStack]
        );

        const extraPenaltyChuoi = GPC.cv_chuoi_khong_nop;
        let stackCountChuoi = 0;

        for (const exp of unreportedChainExpired) {
            const resubmitted = await db.get(
                `SELECT id FROM chain_task_completions
                 WHERE chain_item_id = $1 AND user_id = $2 AND status IN ('pending','approved') AND redo_count > 0`,
                [exp.chain_item_id, exp.user_id]
            );
            if (resubmitted) continue;

            // Stacking từ deadline+1 đến hôm nay
            const origDeadline = new Date(exp.deadline + 'T00:00:00');
            let stackDate = new Date(origDeadline);
            stackDate.setDate(stackDate.getDate() + 1);

            const todayDate = new Date(todayForChainStack + 'T00:00:00');

            while (stackDate < todayDate) {
                const stackDateStr = toDateStr(stackDate);

                // Skip Chủ nhật
                if (stackDate.getDay() === 0) { stackDate.setDate(stackDate.getDate() + 1); continue; }
                // Skip ngày lễ
                if (chainHolidaysStack.has(stackDateStr)) { stackDate.setDate(stackDate.getDate() + 1); continue; }
                // Skip NV nghỉ phép
                const onLeave = await isUserOnLeave(exp.user_id, stackDateStr);
                if (onLeave) { stackDate.setDate(stackDate.getDate() + 1); continue; }

                // Kiểm tra trùng (manual dedup vì chain_task_completions không có unique constraint tương ứng)
                const alreadyStacked = await db.get(
                    `SELECT id FROM chain_task_completions
                     WHERE chain_item_id = $1 AND user_id = $2 AND redo_count = -2
                       AND created_at::date = $3::date`,
                    [exp.chain_item_id, exp.user_id, stackDateStr]
                );
                if (alreadyStacked) { stackDate.setDate(stackDate.getDate() + 1); continue; }

                try {
                    await db.run(
                        `INSERT INTO chain_task_completions (chain_item_id, user_id, status, penalty_amount, penalty_applied, content, redo_count, created_at)
                         VALUES ($1, $2, 'expired', $3, true, $4, -2, $5::timestamp)`,
                        [exp.chain_item_id, exp.user_id, extraPenaltyChuoi,
                         `Phạt chồng: ${exp.task_name} (${exp.chain_name}) (ngày gốc: ${exp.deadline})`,
                         stackDateStr + ' 23:59:00']
                    );
                    stackCountChuoi++;
                } catch(e) {
                    console.error(`  ❌ Error stacking chain penalty for id ${exp.id}:`, e.message);
                }

                stackDate.setDate(stackDate.getDate() + 1);
            }
        }

        if (stackCountChuoi > 0) {
            penaltyCount += stackCountChuoi;
            console.log(`  🔄 [CV Chuỗi] Tạo ${stackCountChuoi} bản ghi phạt chồng hàng ngày`);
        }
    }

    // ========== 6. CHECK CẤP CỨU SẾP — QL KHÔNG XỬ LÝ ==========
    // Deadline: 12h trưa ngày làm việc tiếp theo (skip CN + lễ)
    // Phạt handler hiện tại (hoặc handover_to nếu đã bàn giao)
    // Phạt chồng mỗi ngày nếu vẫn chưa xử lý
    const pendingEmergencies = await db.all(
        `SELECT e.id, e.customer_id, e.handler_id, e.handover_to, e.reason,
                e.created_at, e.penalty_amount, e.penalty_applied, e.last_penalty_at,
                c.customer_name, c.phone as customer_phone,
                COALESCE(e.handover_to, e.handler_id) as current_handler_id
         FROM emergencies e
         LEFT JOIN customers c ON c.id = e.customer_id
         WHERE e.status = 'pending'`
    );

    for (const em of pendingEmergencies) {
        const handlerId = em.current_handler_id;
        if (!handlerId) continue;

        // Tính deadline: 12h trưa ngày làm việc tiếp theo (skip CN/lễ/nghỉ phép handler)
        const deadlineDay = await calculateRealDeadline(em.created_at, handlerId, 12);

        if (now < deadlineDay) continue; // Chưa hết hạn

        // Skip nếu đã phạt hôm nay rồi
        const todayStr6 = toDateStr(now);
        if (em.last_penalty_at && toDateStr(new Date(em.last_penalty_at)) === todayStr6) continue;

        // Lấy mức phạt từ global config
        const penaltyAmount = GPC.cap_cuu_ql_khong_xu_ly;

        // Áp dụng phạt (lần đầu hoặc phạt chồng)
        if (!em.penalty_applied) {
            await db.run(
                `UPDATE emergencies SET penalty_amount = $1, penalty_applied = true, last_penalty_at = NOW() WHERE id = $2`,
                [penaltyAmount, em.id]
            );
            console.log(`  🚨 [Cấp cứu] Phạt QL id=${handlerId} — Không xử lý cấp cứu: ${em.customer_name || em.reason} (phạt ${penaltyAmount}đ)`);
        } else {
            await db.run(
                `UPDATE emergencies SET penalty_amount = penalty_amount + $1, last_penalty_at = NOW() WHERE id = $2`,
                [penaltyAmount, em.id]
            );
            console.log(`  🔄 [Cấp cứu] Phạt chồng QL id=${handlerId} — Vẫn chưa xử lý cấp cứu: ${em.customer_name || em.reason} (thêm ${penaltyAmount}đ)`);
        }

        // Ghi phạt (không khóa TK)
        penaltyCount++;
    }

    // ========== 7. AUTO-REVERT HỦY KHÁCH QUÁ 24H ==========
    // Chuyển từ API thủ công sang cron tự động
    try {
        const expiredCancels = await db.all(
            `SELECT id, customer_name, phone, cancel_requested_by, assigned_to_id FROM customers
             WHERE cancel_requested = 1 AND cancel_approved = 0
             AND cancel_requested_at IS NOT NULL
             AND (NOW() - cancel_requested_at::timestamp) > INTERVAL '24 hours'`
        );

        if (expiredCancels.length > 0) {
            // Tính ngày làm việc tiếp theo (skip CN + lễ + nghỉ phép NV)
            for (const c of expiredCancels) {
                let nextBizDay = new Date(now);
                nextBizDay.setDate(nextBizDay.getDate() + 1);
                let maxIter2 = 30;
                while (maxIter2-- > 0) {
                    const ds2 = toDateStr(nextBizDay);
                    const off2 = await isDayOff(ds2);
                    const nvLeave = c.assigned_to_id ? await isUserOnLeave(c.assigned_to_id, ds2) : false;
                    if (!off2 && !nvLeave) break;
                    nextBizDay.setDate(nextBizDay.getDate() + 1);
                }
                const nextBizDayStr = toDateStr(nextBizDay);

                await db.run(
                    `UPDATE customers SET cancel_approved = -2,
                     cancel_reason = cancel_reason || $1,
                     order_status = 'tu_van_lai', appointment_date = $2,
                     updated_at = NOW() WHERE id = $3`,
                    ['\n⏰ Tự động: Quá 24h không có phản hồi', nextBizDayStr, c.id]
                );
            }
            console.log(`  ⏰ [Hủy khách] Auto-revert ${expiredCancels.length} yêu cầu quá 24h`);
        }
    } catch(e) {
        console.error('  ❌ Error auto-reverting cancels:', e.message);
    }

    // ========== 8. PHẠT KH CHƯA XỬ LÝ HÔM NAY ==========
    // Chỉ chạy lúc 23:45+ — cho NV thời gian xử lý đến gần cuối ngày
    try {
        const hour = now.getHours();
        const minute = now.getMinutes();
        if (hour === 23 && minute >= 45) {
            const today = toDateStr(now);
            const todayOff = await isDayOff(today);

            if (!todayOff) {
                console.log('  📋 [KH Chưa XL] Kiểm tra khách phải xử lý hôm nay...');

                // Lấy tất cả khách có appointment_date = hôm nay, nhóm theo user + crm_type
                const unhandledGroups = await db.all(
                    `SELECT c.assigned_to_id as user_id, c.crm_type, 
                            COUNT(*) as total_customers,
                            COUNT(*) FILTER (WHERE NOT EXISTS (
                                SELECT 1 FROM consultation_logs cl 
                                WHERE cl.customer_id = c.id 
                                AND cl.logged_by = c.assigned_to_id
                                AND cl.created_at::date = $1::date
                            )) as unhandled_count
                     FROM customers c
                     WHERE c.appointment_date = $1::text
                     AND c.assigned_to_id IS NOT NULL
                     AND c.cancel_approved != 1
                     AND c.order_status NOT IN ('hoan_thanh', 'duyet_huy')
                     GROUP BY c.assigned_to_id, c.crm_type
                     HAVING COUNT(*) FILTER (WHERE NOT EXISTS (
                         SELECT 1 FROM consultation_logs cl 
                         WHERE cl.customer_id = c.id 
                         AND cl.logged_by = c.assigned_to_id
                         AND cl.created_at::date = $1::date
                     )) > 0`,
                    [today]
                );

                let custPenaltyCount = 0;
                for (const group of unhandledGroups) {
                    const userId = group.user_id;
                    const crmType = group.crm_type;
                    const unhandled = group.unhandled_count;

                    // Skip nếu user đang nghỉ phép
                    const onLeave = await isUserOnLeave(userId, today);
                    if (onLeave) {
                        console.log(`  ⏭️ [KH Chưa XL] Skip user=${userId} (đang nghỉ phép)`);
                        continue;
                    }

                    // Phạt cố định cho tất cả CRM types
                    const penaltyAmt = GPC.kh_chua_xu_ly_hom_nay;

                    // Insert penalty record (UNIQUE constraint tránh trùng)
                    try {
                        await db.run(
                            `INSERT INTO customer_penalty_records (user_id, penalty_date, crm_type, unhandled_count, penalty_amount)
                             VALUES ($1, $2, $3, $4, $5)
                             ON CONFLICT (user_id, penalty_date, crm_type) DO NOTHING`,
                            [userId, today, crmType, unhandled, penaltyAmt]
                        );

                        // Check nếu đã insert (không bị conflict)
                        const inserted = await db.get(
                            `SELECT id FROM customer_penalty_records 
                             WHERE user_id = $1 AND penalty_date = $2 AND crm_type = $3 AND acknowledged = false`,
                            [userId, today, crmType]
                        );

                        if (inserted) {
                            // Khóa TK (chỉ ở 00:15)
                            // Ghi phạt (không khóa TK)
                            penaltyCount++;
                            custPenaltyCount++;
                            console.log(`  ⚠️ [KH Chưa XL] Phạt user=${userId} — menu ${crmType} (${unhandled} KH chưa xử lý) ${penaltyAmt.toLocaleString()}đ`);
                        }
                    } catch (insertErr) {
                        // Conflict = already penalized today for this menu
                    }
                }

                if (custPenaltyCount > 0) {
                    console.log(`  📋 [KH Chưa XL] Tổng: ${custPenaltyCount} vi phạm`);
                } else if (unhandledGroups.length === 0) {
                    console.log('  ✅ [KH Chưa XL] Không có vi phạm');
                }
            }
        }
    } catch(e) {
        console.error('  ❌ Error checking customer penalties:', e.message);
    }

    if (penaltyCount > 0) {
        console.log(`  ✅ Tổng: ${penaltyCount} lỗi vi phạm (chỉ ghi phạt, không khóa TK)`);
    }

    // ========== 8b. AUTO-LOG "KHÔNG XỬ LÝ" VÀO LỊCH SỬ KH ==========
    // Chạy lúc 23:45+ — ghi dòng lịch sử ⚠️ cho KH có appointment <= hôm nay nhưng không được tư vấn hôm nay
    // Bao gồm CẢ KH hôm nay (appointment_date = today) VÀ KH trễ (appointment_date < today)
    try {
        const _alHour = now.getHours();
        const _alMinute = now.getMinutes();
        if (_alHour === 23 && _alMinute >= 45) {
            const alToday = toDateStr(now);
            const alTodayOff = await isDayOff(alToday);

            if (!alTodayOff) {
                // Lấy tất cả KH có appointment_date <= hôm nay, chưa được tư vấn hôm nay
                const unhandledCustomers = await db.all(
                    `SELECT c.id, c.customer_name, c.phone, c.assigned_to_id, c.appointment_date
                     FROM customers c
                     WHERE c.appointment_date <= $1::text
                     AND c.assigned_to_id IS NOT NULL
                     AND c.cancel_approved != 1
                     AND c.order_status NOT IN ('hoan_thanh', 'duyet_huy')
                     AND NOT EXISTS (
                         SELECT 1 FROM consultation_logs cl
                         WHERE cl.customer_id = c.id
                         AND cl.logged_by = c.assigned_to_id
                         AND cl.created_at::date = $1::date
                     )`,
                    [alToday]
                );

                let autoLogCount = 0;
                for (const uc of unhandledCustomers) {
                    // Skip nếu NV nghỉ phép
                    const onLeave = await isUserOnLeave(uc.assigned_to_id, alToday);
                    if (onLeave) continue;

                    // Kiểm tra đã ghi log "khong_xu_ly" cho ngày này chưa (tránh duplicate)
                    const alreadyLogged = await db.get(
                        `SELECT id FROM consultation_logs
                         WHERE customer_id = $1 AND log_type = 'khong_xu_ly'
                         AND created_at::date = $2::date`,
                        [uc.id, alToday]
                    );
                    if (alreadyLogged) continue;

                    // Format ngày DD/MM/YYYY
                    const parts = alToday.split('-');
                    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

                    await db.run(
                        `INSERT INTO consultation_logs (customer_id, log_type, content, logged_by)
                         VALUES ($1, 'khong_xu_ly', $2, $3)`,
                        [uc.id, `⚠️ Không xử lý tư vấn khách ngày ${formattedDate}`, uc.assigned_to_id]
                    );
                    autoLogCount++;
                }

                if (autoLogCount > 0) {
                    console.log(`  📝 [Auto-Log] Ghi ${autoLogCount} dòng lịch sử "Không xử lý" cho KH chưa được tư vấn hôm nay`);
                }
            }
        }
    } catch(e) {
        console.error('  ❌ Error auto-logging unhandled customers:', e.message);
    }

    // ========== 8c. PHẠT KH XỬ LÝ TRỄ (appointment_date < hôm nay) ==========
    // Chạy lúc 23:45+ — phạt 100k/CRM type nếu NV có KH trễ mà không tư vấn hôm nay
    // Phạt MỖI NGÀY cho đến khi NV xử lý hết KH trễ
    try {
        const _treHour = now.getHours();
        const _treMinute = now.getMinutes();
        if (_treHour === 23 && _treMinute >= 45) {
            const treToday = toDateStr(now);
            const treTodayOff = await isDayOff(treToday);

            if (!treTodayOff) {
                console.log('  📋 [KH Xử Lý Trễ] Kiểm tra khách xử lý trễ...');

                // Lấy tất cả KH có appointment_date < hôm nay (trễ), nhóm theo user + crm_type
                const overdueGroups = await db.all(
                    `SELECT c.assigned_to_id as user_id, c.crm_type,
                            COUNT(*) as total_customers,
                            COUNT(*) FILTER (WHERE NOT EXISTS (
                                SELECT 1 FROM consultation_logs cl
                                WHERE cl.customer_id = c.id
                                AND cl.logged_by = c.assigned_to_id
                                AND cl.created_at::date = $1::date
                            )) as unhandled_count
                     FROM customers c
                     WHERE c.appointment_date < $1::text
                     AND c.assigned_to_id IS NOT NULL
                     AND c.cancel_approved != 1
                     AND c.order_status NOT IN ('hoan_thanh', 'duyet_huy')
                     GROUP BY c.assigned_to_id, c.crm_type
                     HAVING COUNT(*) FILTER (WHERE NOT EXISTS (
                         SELECT 1 FROM consultation_logs cl
                         WHERE cl.customer_id = c.id
                         AND cl.logged_by = c.assigned_to_id
                         AND cl.created_at::date = $1::date
                     )) > 0`,
                    [treToday]
                );

                let trePenaltyCount = 0;
                for (const group of overdueGroups) {
                    const userId = group.user_id;
                    const crmType = group.crm_type;
                    const unhandled = group.unhandled_count;

                    // Skip nếu user đang nghỉ phép
                    const onLeave = await isUserOnLeave(userId, treToday);
                    if (onLeave) {
                        console.log(`  ⏭️ [KH Xử Lý Trễ] Skip user=${userId} (đang nghỉ phép)`);
                        continue;
                    }

                    // Phạt cố định 100k/CRM type (bất kể số lượng KH)
                    const penaltyAmt = GPC.kh_chua_xu_ly_tre;

                    // crm_type prefix 'tre_' để phân biệt với phạt "hôm nay"
                    const treCrmType = 'tre_' + crmType;

                    try {
                        await db.run(
                            `INSERT INTO customer_penalty_records (user_id, penalty_date, crm_type, unhandled_count, penalty_amount)
                             VALUES ($1, $2, $3, $4, $5)
                             ON CONFLICT (user_id, penalty_date, crm_type) DO NOTHING`,
                            [userId, treToday, treCrmType, unhandled, penaltyAmt]
                        );

                        const inserted = await db.get(
                            `SELECT id FROM customer_penalty_records
                             WHERE user_id = $1 AND penalty_date = $2 AND crm_type = $3 AND acknowledged = false`,
                            [userId, treToday, treCrmType]
                        );

                        if (inserted) {
                            penaltyCount++;
                            trePenaltyCount++;
                            console.log(`  ⚠️ [KH Xử Lý Trễ] Phạt user=${userId} — menu ${crmType} (${unhandled} KH trễ chưa xử lý) ${penaltyAmt.toLocaleString()}đ`);
                        }
                    } catch (insertErr) {
                        // Conflict = already penalized today for this CRM type
                    }
                }

                if (trePenaltyCount > 0) {
                    console.log(`  📋 [KH Xử Lý Trễ] Tổng: ${trePenaltyCount} vi phạm`);
                } else if (overdueGroups.length === 0) {
                    console.log('  ✅ [KH Xử Lý Trễ] Không có vi phạm');
                }
            }
        }
    } catch(e) {
        console.error('  ❌ Error checking overdue customer penalties:', e.message);
    }

    // ========== 9. TELESALE — THU HỒI ĐÊM (00:00 - 01:00) ==========
    try {
        const tsHour = now.getHours();
        if (tsHour === 0) {
            console.log('  📞 [Telesale] Chạy thu hồi đêm...');
            const { runTelesaleRecall } = require('./telesale');
            const recallResult = await runTelesaleRecall();
            console.log(`  📞 [Telesale] ${recallResult.message}`);
        }
    } catch(e) {
        console.error('  ❌ [Telesale] Error recall:', e.message);
    }

    // ========== 10. TELESALE — BƠM SÁNG (07:00+) ==========
    // ★ Catch-up: nếu server restart sau 7:00 mà chưa bơm → bơm ngay
    // ★ runTelesalePump() đã có dedup per-user per-CRM bên trong, KHÔNG cần check global
    try {
        const tsHour2 = now.getHours();
        const shouldPump = (tsHour2 === 7 && _minute < 30) || (forceFullCheck && tsHour2 >= 7);
        if (shouldPump) {
            console.log(`  📞 [Telesale] Chạy bơm sáng${forceFullCheck && tsHour2 > 7 ? ' (catch-up sau restart)' : ''}...`);
            const { runTelesalePump } = require('./telesale');
            const pumpResult = await runTelesalePump();
            console.log(`  📞 [Telesale] ${pumpResult.message}`);
            if (pumpResult.alerts && pumpResult.alerts.length > 0) {
                console.log(`  ⚠️ [Telesale] Cảnh báo nguồn hết: ${pumpResult.alerts.map(a => a.source).join(', ')}`);
            }
        }
    } catch(e) {
        console.error('  ❌ [Telesale] Error pump:', e.message);
    }

    // ========== 11. TELESALE — CV ĐIỂM AUTO-SCORING ==========
    try {
        const todayCV = toDateStr(now);
        const todayDow = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon...7=Sun

        // Find all task templates with "Gọi Điện Telesale" in name
        // Templates can be team-level (target_type='team', target_id=dept_id) or individual
        const telesaleTemplates = await db.all(
            "SELECT * FROM task_point_templates WHERE task_name ILIKE '%Gọi Điện Telesale%' AND day_of_week = $1",
            [todayDow]
        );

        // For each template, find applicable users
        const telesaleTasks = [];
        for (const tpl of telesaleTemplates) {
            if (tpl.target_type === 'team') {
                // Find all active users in this department
                const users = await db.all(
                    "SELECT id as user_id, full_name FROM users WHERE department_id = $1 AND status = 'active'",
                    [tpl.target_id]
                );
                for (const u of users) {
                    telesaleTasks.push({ ...tpl, user_id: u.user_id, full_name: u.full_name });
                }
            } else if (tpl.target_type === 'individual') {
                const u = await db.get("SELECT id as user_id, full_name FROM users WHERE id = $1 AND status = 'active'", [tpl.target_id]);
                if (u) telesaleTasks.push({ ...tpl, user_id: u.user_id, full_name: u.full_name });
            }
        }

        if (telesaleTasks.length > 0) {
            // Group by user: sum up target (min_quantity) and points across all matching templates
            const userTargets = {};
            for (const t of telesaleTasks) {
                if (!userTargets[t.user_id]) {
                    userTargets[t.user_id] = { name: t.full_name, totalTarget: 0, totalPoints: 0, templates: [] };
                }
                userTargets[t.user_id].totalTarget += (t.min_quantity || 0);
                userTargets[t.user_id].totalPoints += (t.points || 0);
                userTargets[t.user_id].templates.push(t);
            }

            for (const [userId, info] of Object.entries(userTargets)) {
                // Count answered calls today
                const answered = await db.get(
                    `SELECT COUNT(*) as cnt FROM telesale_assignments
                     WHERE user_id = $1 AND assigned_date = $2 AND call_status = 'answered'`,
                    [userId, todayCV]
                );
                const answeredCount = parseInt(answered?.cnt || 0);
                if (answeredCount === 0) continue;

                // Sequential consumption: sort templates by id, each consumes from pool
                // All-or-nothing per template: if remaining < target → 0 points
                const sortedTemplates = [...info.templates].sort((a, b) => (a.id || 0) - (b.id || 0));
                let remaining = answeredCount;

                for (const tmpl of sortedTemplates) {
                    const tmplTarget = tmpl.min_quantity || 50;
                    const tmplPoints = tmpl.points || 25;
                    const tmplEarned = remaining >= tmplTarget ? tmplPoints : 0;
                    const tmplQty = Math.min(remaining, tmplTarget);
                    if (tmplEarned > 0) remaining -= tmplTarget; // consume from pool

                    const existing = await db.get(
                        "SELECT id, status FROM task_point_reports WHERE template_id = $1 AND user_id = $2 AND report_date = $3",
                        [tmpl.id, userId, todayCV]
                    );

                    if (existing) {
                        await db.run(
                            `UPDATE task_point_reports SET quantity = $1, points_earned = $2,
                             status = 'approved'
                             WHERE id = $3`,
                            [tmplQty, tmplEarned, existing.id]
                        );
                    } else {
                        const status = 'approved';
                        await db.run(
                            `INSERT INTO task_point_reports (template_id, user_id, report_date, quantity, points_earned, status, content, report_type, report_value)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [tmpl.id, userId, todayCV, tmplQty, tmplEarned, status,
                             `[Tự động] ${tmplQty}/${tmplTarget} SĐT bắt máy`, 'link', `${tmplQty}/${tmplTarget}`]
                        );
                    }
                }
            }
        }
    } catch(e) {
        console.error('  ❌ [Telesale CV Điểm] Error:', e.message);
    }

    // ========== 12. TỰ TÌM KIẾM — CV ĐIỂM AUTO-SCORING ==========
    try {
        const todaySS = toDateStr(now);
        const todayDowSS = now.getDay() === 0 ? 7 : now.getDay();

        // Find all task templates with "Tự Tìm Kiếm" in name
        const selfSearchTemplates = await db.all(
            "SELECT * FROM task_point_templates WHERE task_name ILIKE '%Tự Tìm Kiếm%' AND day_of_week = $1",
            [todayDowSS]
        );

        const selfSearchTasks = [];
        for (const tpl of selfSearchTemplates) {
            if (tpl.target_type === 'team') {
                const users = await db.all(
                    "SELECT id as user_id, full_name FROM users WHERE department_id = $1 AND status = 'active'",
                    [tpl.target_id]
                );
                for (const u of users) {
                    selfSearchTasks.push({ ...tpl, user_id: u.user_id, full_name: u.full_name });
                }
            } else if (tpl.target_type === 'individual') {
                const u = await db.get("SELECT id as user_id, full_name FROM users WHERE id = $1 AND status = 'active'", [tpl.target_id]);
                if (u) selfSearchTasks.push({ ...tpl, user_id: u.user_id, full_name: u.full_name });
            }
        }

        if (selfSearchTasks.length > 0) {
            const userTargets = {};
            for (const t of selfSearchTasks) {
                if (!userTargets[t.user_id]) {
                    userTargets[t.user_id] = { name: t.full_name, totalTarget: 0, totalPoints: 0, templates: [] };
                }
                userTargets[t.user_id].totalTarget += (t.min_quantity || 0);
                userTargets[t.user_id].totalPoints += (t.points || 0);
                userTargets[t.user_id].templates.push(t);
            }

            for (const [userId, info] of Object.entries(userTargets)) {
                // Count self-searched records today
                const ssCount = await db.get(
                    `SELECT COUNT(*) as cnt FROM telesale_data WHERE self_searched_by = $1 AND self_searched_at::date = $2`,
                    [userId, todaySS]
                );
                const searchedCount = parseInt(ssCount?.cnt || 0);
                if (searchedCount === 0) continue;

                // Sequential consumption with all-or-nothing
                const sortedSS = [...info.templates].sort((a, b) => (a.id || 0) - (b.id || 0));
                let remainingSS = searchedCount;

                for (const tmpl of sortedSS) {
                    const tmplTarget = tmpl.min_quantity || 20;
                    const tmplPoints = tmpl.points || 10;
                    const tmplEarned = remainingSS >= tmplTarget ? tmplPoints : 0;
                    const tmplQty = Math.min(remainingSS, tmplTarget);
                    if (tmplEarned > 0) remainingSS -= tmplTarget;

                    const existing = await db.get(
                        "SELECT id, status FROM task_point_reports WHERE template_id = $1 AND user_id = $2 AND report_date = $3",
                        [tmpl.id, userId, todaySS]
                    );

                    if (existing) {
                        await db.run(
                            `UPDATE task_point_reports SET quantity = $1, points_earned = $2,
                             status = 'approved'
                             WHERE id = $3`,
                            [tmplQty, tmplEarned, existing.id]
                        );
                    } else {
                        const status = 'approved';
                        await db.run(
                            `INSERT INTO task_point_reports (template_id, user_id, report_date, quantity, points_earned, status, content, report_type, report_value)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [tmpl.id, userId, todaySS, tmplQty, tmplEarned, status,
                             `[Tự động] ${tmplQty}/${tmplTarget} KH tự tìm kiếm`, 'link', `${tmplQty}/${tmplTarget}`]
                        );
                    }
                }
            }
        }
    } catch(e) {
        console.error('  ❌ [Tự Tìm Kiếm CV Điểm] Error:', e.message);
}

    // ========== 13. DAILYLINKS — CV ĐIỂM AUTO-SCORING ==========
    // Auto-score ALL DailyLinks module types: dang_video, dang_content, dang_group,
    // addcmt, sedding, tuyen_dung, tim_gr_zalo, dang_banthan_sp
    // These tasks show progress via _kbInject*Stats() but previously never created
    // task_point_reports entries, causing ĐIỂM NGÀY = 0 despite completion.
    try {
        const todayDL = toDateStr(now);
        const todayDowDL = now.getDay() === 0 ? 7 : now.getDay();

        // Module type → ILIKE pattern for matching task_point_templates
        const DL_MODULES = {
            dang_video:      '%Đăng%Video%',
            dang_content:    '%Đăng%Content%',
            dang_group:      '%Đăng%Tìm%KH%Group%',
            addcmt:          '%Add%Cmt%Đối Tác%',
            sedding:         '%Sedding%Cộng Đồng%',
            tuyen_dung:      '%Tuyển%Dụng%SV%',
            tim_gr_zalo:     '%Tìm%Gr%Zalo%',
            dang_banthan_sp: '%Đăng%Bản Thân%'
        };

        for (const [moduleType, taskPattern] of Object.entries(DL_MODULES)) {
            // Find all matching task_point_templates
            const dlTemplates = await db.all(
                "SELECT * FROM task_point_templates WHERE task_name ILIKE $1 AND day_of_week = $2",
                [taskPattern, todayDowDL]
            );

            // For each template, find applicable users
            const dlTasks = [];
            for (const tpl of dlTemplates) {
                if (tpl.target_type === 'team') {
                    const users = await db.all(
                        "SELECT id as user_id, full_name FROM users WHERE department_id = $1 AND status = 'active'",
                        [tpl.target_id]
                    );
                    for (const u of users) {
                        dlTasks.push({ ...tpl, user_id: u.user_id, full_name: u.full_name });
                    }
                } else if (tpl.target_type === 'individual') {
                    const u = await db.get("SELECT id as user_id, full_name FROM users WHERE id = $1 AND status = 'active'", [tpl.target_id]);
                    if (u) dlTasks.push({ ...tpl, user_id: u.user_id, full_name: u.full_name });
                }
            }

            if (dlTasks.length === 0) continue;

            // Group by user
            const dlUserTargets = {};
            for (const t of dlTasks) {
                if (!dlUserTargets[t.user_id]) {
                    dlUserTargets[t.user_id] = { name: t.full_name, totalTarget: 0, totalPoints: 0, templates: [] };
                }
                dlUserTargets[t.user_id].totalTarget += (t.min_quantity || 0);
                dlUserTargets[t.user_id].totalPoints += (t.points || 0);
                dlUserTargets[t.user_id].templates.push(t);
            }

            for (const [userId, info] of Object.entries(dlUserTargets)) {
                // Count entries in daily_link_entries for today
                const dlCount = await db.get(
                    'SELECT COUNT(*) as cnt FROM daily_link_entries WHERE user_id = $1 AND entry_date = $2 AND module_type = $3',
                    [userId, todayDL, moduleType]
                );
                const entryCount = parseInt(dlCount?.cnt || 0);
                if (entryCount === 0) continue;

                const target = info.totalTarget || 1;
                const maxPoints = info.totalPoints || 10;
                const reachedTarget = entryCount >= target;

                for (const tmpl of info.templates) {
                    // Check for user override
                    let tmplTarget = tmpl.min_quantity || 1;
                    let tmplPoints = tmpl.points || 10;
                    if (tmpl.id) {
                        const ov = await db.get(
                            'SELECT custom_points, custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3',
                            [userId, 'diem', tmpl.id]
                        );
                        if (ov) {
                            if (ov.custom_min_quantity != null) tmplTarget = Number(ov.custom_min_quantity);
                            if (ov.custom_points != null) tmplPoints = Number(ov.custom_points);
                        }
                    }

                    const tmplEarned = entryCount >= tmplTarget ? tmplPoints : 0;  // all-or-nothing
                    const tmplQty = Math.min(entryCount, tmplTarget);

                    const existing = await db.get(
                        "SELECT id, status FROM task_point_reports WHERE template_id = $1 AND user_id = $2 AND report_date = $3",
                        [tmpl.id, userId, todayDL]
                    );

                    if (existing) {
                        // Update existing — always update quantity and points, upgrade status to approved if target met
                        await db.run(
                            `UPDATE task_point_reports SET quantity = $1, points_earned = $2,
                             status = CASE WHEN $3 >= $4 THEN 'approved' ELSE status END,
                             updated_at = NOW()
                             WHERE id = $5`,
                            [tmplQty, tmplEarned, entryCount, tmplTarget, existing.id]
                        );
                    } else {
                        // Create new auto-scored report
                        const status = 'approved';
                        await db.run(
                            `INSERT INTO task_point_reports (template_id, user_id, report_date, quantity, points_earned, status, content, report_type, report_value)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [tmpl.id, userId, todayDL, tmplQty, tmplEarned, status,
                             `[Tự động] ${entryCount}/${tmplTarget} ${moduleType}`, 'link', `${entryCount}/${tmplTarget}`]
                        );
                    }
                }
            }
        }
    } catch(e) {
        console.error('  ❌ [DailyLinks CV Điểm] Error:', e.message);
    }

    // ========== 14. NHẮN TÌM ĐỐI TÁC KH — CV ĐIỂM AUTO-SCORING ==========
    try {
        const todayPO = toDateStr(now);
        const todayDowPO = now.getDay() === 0 ? 7 : now.getDay();

        const poTemplates = await db.all(
            "SELECT * FROM task_point_templates WHERE task_name ILIKE '%Nhắn%Tìm%Đối Tác%' AND day_of_week = $1",
            [todayDowPO]
        );

        const poTasks = [];
        for (const tpl of poTemplates) {
            if (tpl.target_type === 'team') {
                const users = await db.all(
                    "SELECT id as user_id, full_name FROM users WHERE department_id = $1 AND status = 'active'",
                    [tpl.target_id]
                );
                for (const u of users) poTasks.push({ ...tpl, user_id: u.user_id, full_name: u.full_name });
            } else if (tpl.target_type === 'individual') {
                const u = await db.get("SELECT id as user_id, full_name FROM users WHERE id = $1 AND status = 'active'", [tpl.target_id]);
                if (u) poTasks.push({ ...tpl, user_id: u.user_id, full_name: u.full_name });
            }
        }

        if (poTasks.length > 0) {
            const poUserTargets = {};
            for (const t of poTasks) {
                if (!poUserTargets[t.user_id]) {
                    poUserTargets[t.user_id] = { name: t.full_name, totalTarget: 0, totalPoints: 0, templates: [] };
                }
                poUserTargets[t.user_id].totalTarget += (t.min_quantity || 0);
                poUserTargets[t.user_id].totalPoints += (t.points || 0);
                poUserTargets[t.user_id].templates.push(t);
            }

            for (const [userId, info] of Object.entries(poUserTargets)) {
                const poCount = await db.get(
                    'SELECT COUNT(*) as cnt FROM partner_outreach_entries WHERE user_id = $1 AND entry_date = $2',
                    [userId, todayPO]
                );
                const poEntryCount = parseInt(poCount?.cnt || 0);
                if (poEntryCount === 0) continue;

                const target = info.totalTarget || 20;
                const maxPoints = info.totalPoints || 10;
                const reachedTarget = poEntryCount >= target;

                for (const tmpl of info.templates) {
                    let tmplTarget = tmpl.min_quantity || 20;
                    let tmplPoints = tmpl.points || 10;
                    if (tmpl.id) {
                        const ov = await db.get(
                            'SELECT custom_points, custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3',
                            [userId, 'diem', tmpl.id]
                        );
                        if (ov) {
                            if (ov.custom_min_quantity != null) tmplTarget = Number(ov.custom_min_quantity);
                            if (ov.custom_points != null) tmplPoints = Number(ov.custom_points);
                        }
                    }

                    const tmplEarned = poEntryCount >= tmplTarget ? tmplPoints : 0;  // all-or-nothing
                    const tmplQty = Math.min(poEntryCount, tmplTarget);

                    const existing = await db.get(
                        "SELECT id, status FROM task_point_reports WHERE template_id = $1 AND user_id = $2 AND report_date = $3",
                        [tmpl.id, userId, todayPO]
                    );

                    if (existing) {
                        await db.run(
                            `UPDATE task_point_reports SET quantity = $1, points_earned = $2,
                             status = CASE WHEN $3 >= $4 THEN 'approved' ELSE status END,
                             updated_at = NOW()
                             WHERE id = $5`,
                            [tmplQty, tmplEarned, poEntryCount, tmplTarget, existing.id]
                        );
                    } else {
                        const status = 'approved';
                        await db.run(
                            `INSERT INTO task_point_reports (template_id, user_id, report_date, quantity, points_earned, status, content, report_type, report_value)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [tmpl.id, userId, todayPO, tmplQty, tmplEarned, status,
                             `[Tự động] ${poEntryCount}/${tmplTarget} nhắn tin đối tác`, 'link', `${poEntryCount}/${tmplTarget}`]
                        );
                    }
                }
            }
        }
    } catch(e) {
        console.error('  ❌ [Nhắn Tìm ĐT CV Điểm] Error:', e.message);
    }

    const elapsed = Date.now() - now.getTime();
    console.log(`⏰ Deadline check hoàn thành sau ${elapsed}ms (${(elapsed/1000).toFixed(1)}s)`);
}

// ===== START CRON =====
function startDeadlineChecker() {
    console.log('⏰ Deadline checker khởi động (mỗi 15 phút)');
    // Run FULL check immediately on start (forceFullCheck=true) — ensures no penalties missed after restart
    setTimeout(() => runDeadlineCheck(true).catch(e => console.error('Deadline check error:', e)), 5000);
    // Then every 15 minutes (normal mode — CV Khóa only at 00:15)
    setInterval(() => runDeadlineCheck(false).catch(e => console.error('Deadline check error:', e)), 15 * 60 * 1000);
}

module.exports = { startDeadlineChecker, calculateRealDeadline, toDateStr, toLocalTimestamp };

