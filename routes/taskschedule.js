const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { calculateRealDeadline, toDateStr, toLocalTimestamp } = require('./deadline-checker');
const { canApproveByRole, isAutoApproveRole } = require('../utils/approvalHierarchy');

async function taskScheduleRoutes(fastify, options) {

    // Fix 4: Ensure performance indexes exist
    try {
        await db.run('CREATE INDEX IF NOT EXISTS idx_snapshots_user_date ON daily_task_snapshots(user_id, snapshot_date)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_reports_user_date ON task_point_reports(user_id, report_date)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_reports_status ON task_point_reports(status)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_templates_target ON task_point_templates(target_type, target_id)');
    } catch(e) { /* indexes may already exist */ }

    // GET single template by ID
    fastify.get('/api/task-points/template/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const template = await db.get('SELECT * FROM task_point_templates WHERE id = $1', [Number(request.params.id)]);
        if (!template) return reply.code(404).send({ error: 'Template not found' });
        return { template };
    });

    // Helper: get templates for a user (individual→team fallback, with week_only filter)
    async function _getTemplatesForUser(userId, weekStart) {
        const user = await db.get('SELECT id, department_id FROM users WHERE id = $1', [userId]);
        if (!user) return [];

        // Get individual tasks
        let indivTasks = await db.all(
            'SELECT * FROM task_point_templates WHERE target_type = $1 AND target_id = $2 AND (week_only IS NULL OR week_only = $3) ORDER BY day_of_week, time_start',
            ['individual', userId, weekStart || null]
        );

        // Get team tasks — from own dept + managed depts
        let teamTasks = [];
        const deptIds = new Set();
        if (user.department_id) deptIds.add(user.department_id);
        const headDepts = await db.all('SELECT id FROM departments WHERE head_user_id = ? AND status = ?', [userId, 'active']);
        headDepts.forEach(d => deptIds.add(d.id));
        if (deptIds.size > 0) {
            const ids = [...deptIds];
            const ph = ids.map((_, i) => `$${i + 1}`).join(',');
            const weekParam = `$${ids.length + 1}`;
            teamTasks = await db.all(
                `SELECT * FROM task_point_templates WHERE target_type = 'team' AND target_id IN (${ph}) AND (week_only IS NULL OR week_only = ${weekParam}) ORDER BY day_of_week, time_start`,
                [...ids, weekStart || null]
            );
        }

        // Merge: team tasks + individual tasks (individual view always gets both)
        // Filter out exempted team tasks
        const exemptions = await db.all(
            'SELECT template_id, exempt_type, week_start FROM task_exemptions WHERE user_id = $1',
            [userId]
        );
        if (exemptions.length > 0) {
            teamTasks = teamTasks.filter(t => {
                return !exemptions.some(e => {
                    if (e.template_id !== t.id) return false;
                    if (e.exempt_type === 'permanent') return true;
                    if (e.exempt_type === 'week' && e.week_start === (weekStart || null)) return true;
                    return false;
                });
            });
        }

        return [...teamTasks, ...indivTasks];
    }

    // Helper: ensure snapshots exist for a user + date
    // FULL SYNC: snapshots always match current templates exactly
    async function _ensureSnapshots(userId, dateStr, dayOfWeek, weekStart) {
        const existing = await db.all(
            'SELECT id, template_id, task_name, time_start FROM daily_task_snapshots WHERE user_id = $1 AND snapshot_date = $2',
            [userId, dateStr]
        );

        const templates = await _getTemplatesForUser(userId, weekStart);
        const dayTasks = templates.filter(t => t.day_of_week === dayOfWeek);
        const currTemplateIds = new Set(dayTasks.map(t => t.id));

        if (existing.length > 0) {
            const snapTemplateIds = new Set();

            for (const snap of existing) {
                if (currTemplateIds.has(snap.template_id)) {
                    // Template still valid → update all fields to match current template
                    snapTemplateIds.add(snap.template_id);
                    const t = dayTasks.find(x => x.id === snap.template_id);
                    await db.run(
                        `UPDATE daily_task_snapshots SET task_name=$1, points=$2, min_quantity=$3, time_start=$4, time_end=$5, guide_url=$6, requires_approval=$7, input_requirements=$8, output_requirements=$9 WHERE id=$10`,
                        [t.task_name, t.points, t.min_quantity, t.time_start, t.time_end, t.guide_url, t.requires_approval || false, t.input_requirements || '[]', t.output_requirements || '[]', snap.id]
                    );
                } else {
                    // Orphan: template no longer in current list → delete if no report filed
                    const hasReport = await db.get(
                        'SELECT id FROM task_point_reports WHERE template_id = $1 AND user_id = $2 AND report_date = $3 LIMIT 1',
                        [snap.template_id, userId, dateStr]
                    );
                    if (!hasReport) {
                        await db.run('DELETE FROM daily_task_snapshots WHERE id = $1', [snap.id]);
                    }
                }
            }

            // Add new templates not yet snapshotted
            for (const t of dayTasks) {
                if (!snapTemplateIds.has(t.id)) {
                    await db.run(
                        `INSERT INTO daily_task_snapshots (user_id, snapshot_date, template_id, day_of_week, task_name, points, min_quantity, time_start, time_end, guide_url, requires_approval, input_requirements, output_requirements)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING`,
                        [userId, dateStr, t.id, t.day_of_week, t.task_name, t.points, t.min_quantity, t.time_start, t.time_end, t.guide_url, t.requires_approval || false, t.input_requirements || '[]', t.output_requirements || '[]']
                    );
                }
            }
            return;
        }

        // No existing snapshots → create fresh from templates
        for (const t of dayTasks) {
            await db.run(
                `INSERT INTO daily_task_snapshots (user_id, snapshot_date, template_id, day_of_week, task_name, points, min_quantity, time_start, time_end, guide_url, requires_approval, input_requirements, output_requirements)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING`,
                [userId, dateStr, t.id, t.day_of_week, t.task_name, t.points, t.min_quantity, t.time_start, t.time_end, t.guide_url, t.requires_approval || false, t.input_requirements || '[]', t.output_requirements || '[]']
            );
        }
    }

    // GET weekly tasks with snapshot logic
    // Past+today → snapshots (auto-create if needed), future → live templates
    // Helper: format date as YYYY-MM-DD using LOCAL timezone (not UTC!)
    function _localDateStr(d) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    // ===== CONSOLIDATED DASHBOARD API (Fix 2: single request instead of 6) =====
    fastify.get('/api/schedule/dashboard', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, week_start } = request.query;
        const uid = Number(user_id) || request.user.id;
        if (!week_start) return reply.code(400).send({ error: 'Thiếu week_start' });

        const today = new Date(); today.setHours(0,0,0,0);
        const todayStr = _localDateStr(today);
        const monDate = new Date(week_start + 'T00:00:00');
        const sunDate = new Date(monDate); sunDate.setDate(monDate.getDate() + 6);
        const monStr = week_start;
        const sunStr = _localDateStr(sunDate);

        // Monthly range
        const viewMonth = monDate.getMonth();
        const viewYear = monDate.getFullYear();
        const monthStart = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-01`;
        const lastDay = new Date(viewYear, viewMonth+1, 0).getDate();
        const monthEnd = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

        // Get user's department_joined_at for filtering
        const userInfo = await db.get('SELECT department_joined_at FROM users WHERE id = $1', [uid]);
        const deptJoinedStr = userInfo?.department_joined_at ? _localDateStr(new Date(userInfo.department_joined_at)) : null;

        // Run ALL queries in parallel
        const templates = await _getTemplatesForUser(uid, week_start);

        const [reportsResult, weeklySummary, monthlySummary, weekHolidays, yearHolidays, userOverrides] = await Promise.all([
            // Reports — latest redo per task+date
            db.all(
                `SELECT DISTINCT ON (r.template_id, r.report_date)
                     r.*, r.report_date::text as report_date, t.task_name, t.points as template_points, t.requires_approval
                 FROM task_point_reports r LEFT JOIN task_point_templates t ON r.template_id = t.id
                 WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
                 ORDER BY r.template_id, r.report_date, r.redo_count DESC`,
                [uid, monStr, sunStr]
            ),
            // Weekly summary
            db.all(
                `SELECT report_date, SUM(points_earned) as total_points, COUNT(*) as report_count FROM (
                    SELECT DISTINCT ON (template_id, report_date) report_date::text as report_date, points_earned
                    FROM task_point_reports WHERE user_id = $1 AND report_date BETWEEN $2 AND $3
                    ORDER BY template_id, report_date, redo_count DESC
                 ) latest WHERE latest.points_earned > 0
                 GROUP BY report_date ORDER BY report_date`,
                [uid, monStr, sunStr]
            ),
            // Monthly summary
            db.all(
                `SELECT report_date, SUM(points_earned) as total_points, COUNT(*) as report_count FROM (
                    SELECT DISTINCT ON (template_id, report_date) report_date::text as report_date, points_earned
                    FROM task_point_reports WHERE user_id = $1 AND report_date BETWEEN $2 AND $3
                    ORDER BY template_id, report_date, redo_count DESC
                 ) latest WHERE latest.points_earned > 0
                 GROUP BY report_date ORDER BY report_date`,
                [uid, monthStart, monthEnd]
            ),
            // Week holidays
            db.all(
                "SELECT * FROM holidays WHERE holiday_date BETWEEN $1 AND $2 ORDER BY holiday_date",
                [monStr, sunStr]
            ),
            // Year holidays
            db.all(
                "SELECT * FROM holidays WHERE EXTRACT(YEAR FROM holiday_date) = $1 ORDER BY holiday_date",
                [viewYear]
            ),
            // User overrides for both CV Điểm and CV Khóa
            db.all(
                'SELECT * FROM task_user_overrides WHERE user_id = $1',
                [uid]
            )
        ]);

        // Build override lookup maps
        const overrideDiem = {}; // key: template_id → { custom_points, custom_min_quantity }
        const overrideKhoa = {}; // key: lock_task_id → { custom_points, custom_min_quantity }
        (userOverrides || []).forEach(o => {
            const map = o.source_type === 'diem' ? overrideDiem : overrideKhoa;
            map[o.source_id] = o;
        });

        // Build tasks: today+future → live templates, past → existing snapshots
        let allTasks = [];
        for (let d = 0; d < 7; d++) {
            const colDate = new Date(monDate);
            colDate.setDate(monDate.getDate() + d);
            const dateStr = _localDateStr(colDate);
            const jsDow = colDate.getDay();
            const dayOfWeek = jsDow === 0 ? 7 : jsDow;

            // Skip dates before user joined their department
            if (deptJoinedStr && dateStr < deptJoinedStr) continue;

            if (dateStr >= todayStr) {
                // Today + Future: use live templates with user overrides applied
                const dayTasks = templates.filter(t => t.day_of_week === dayOfWeek);
                dayTasks.forEach(t => {
                    const ov = overrideDiem[t.id];
                    const taskData = { ...t, _source: 'template', _date: dateStr };
                    if (ov) {
                        if (ov.custom_points != null) { taskData._orig_points = t.points; taskData.points = ov.custom_points; }
                        if (ov.custom_min_quantity != null) { taskData._orig_min_quantity = t.min_quantity; taskData.min_quantity = ov.custom_min_quantity; }
                        taskData._has_override = true;
                    }
                    allTasks.push(taskData);
                });
                // For today: also sync snapshots in background (for penalty/deadline system)
                if (dateStr === todayStr) {
                    _ensureSnapshots(uid, dateStr, dayOfWeek, week_start).catch(() => {});
                }
            } else {
                // Past: only show existing snapshots (historical record)
                const snaps = await db.all(
                    'SELECT * FROM daily_task_snapshots WHERE user_id = $1 AND snapshot_date = $2 ORDER BY time_start',
                    [uid, dateStr]
                );
                snaps.forEach(s => { allTasks.push({ ...s, _source: 'snapshot', _date: dateStr }); });
            }
        }

        // Build holiday map
        const holidayMap = {};
        weekHolidays.forEach(h => {
            const hd = new Date(h.holiday_date);
            const dow = hd.getDay();
            const mapped = dow === 0 ? 7 : dow;
            if (mapped >= 1 && mapped <= 7) holidayMap[mapped] = h.holiday_name;
        });

        // Force approval data for the user being viewed
        const _faUser = await db.get('SELECT force_approval, force_approval_reviewer_id FROM users WHERE id = $1', [uid]);
        const _faTasks = await db.all('SELECT task_type, task_ref_id FROM user_force_approvals WHERE user_id = $1', [uid]);
        const forceScheduleIds = _faTasks.filter(t => t.task_type === 'schedule').map(t => t.task_ref_id);
        const forceLockIds = _faTasks.filter(t => t.task_type === 'lock').map(t => t.task_ref_id);
        const forceChainIds = _faTasks.filter(t => t.task_type === 'chain').map(t => t.task_ref_id);

        return {
            tasks: allTasks,
            reports: reportsResult,
            weekly_summary: weeklySummary,
            monthly_summary: monthlySummary,
            holidays_week: holidayMap,
            holidays_year: yearHolidays,
            month_start: monthStart,
            month_end: monthEnd,
            overrides_diem: overrideDiem,
            overrides_khoa: overrideKhoa,
            force_approval: _faUser?.force_approval || false,
            force_schedule_ids: forceScheduleIds,
            force_lock_ids: forceLockIds,
            force_chain_ids: forceChainIds
        };
    });

    // ===== ONE-TIME BACKFILL: Create task_point_reports for historical DailyLinks entries =====
    fastify.get('/api/schedule/backfill-scores', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });

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

        let created = 0, updated = 0, errors = 0;

        for (const [moduleType, taskPattern] of Object.entries(DL_MODULES)) {
            // Find all templates
            const templates = await db.all("SELECT * FROM task_point_templates WHERE task_name ILIKE $1", [taskPattern]);
            if (templates.length === 0) continue;

            // Find all dates+users with entries for this module
            const entries = await db.all(
                `SELECT user_id, entry_date::text as entry_date, COUNT(*) as cnt
                 FROM daily_link_entries WHERE module_type = $1
                 GROUP BY user_id, entry_date ORDER BY entry_date`,
                [moduleType]
            );

            for (const entry of entries) {
                const uid = entry.user_id;
                const dateStr = entry.entry_date.slice(0,10);
                const entryCount = Number(entry.cnt);
                const user = await db.get('SELECT department_id FROM users WHERE id = $1', [uid]);
                
                // Calculate day_of_week for this entry date (1=Mon...7=Sun)
                const entryDate = new Date(dateStr + 'T00:00:00');
                const entryDow = entryDate.getDay() === 0 ? 7 : entryDate.getDay();

                // Find matching template for this user AND this day_of_week
                let tpl = null;
                for (const t of templates) {
                    if (t.day_of_week !== entryDow) continue; // must match day
                    if (t.target_type === 'individual' && t.target_id === uid) { tpl = t; break; }
                    if (t.target_type === 'team' && user?.department_id === t.target_id) { tpl = t; break; }
                }
                if (!tpl) continue; // no template for this day
                if (!tpl?.id) continue;

                // Check override
                let tmplTarget = tpl.min_quantity || 1;
                let tmplPoints = tpl.points || 10;
                const ov = await db.get('SELECT custom_points, custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3', [uid, 'diem', tpl.id]);
                if (ov) {
                    if (ov.custom_min_quantity != null) tmplTarget = Number(ov.custom_min_quantity);
                    if (ov.custom_points != null) tmplPoints = Number(ov.custom_points);
                }

                const tmplEarned = entryCount >= tmplTarget ? tmplPoints : 0;  // all-or-nothing
                const tmplQty = Math.min(entryCount, tmplTarget);

                try {
                    // Check force_approval
                    const _faBf1 = await db.get('SELECT force_approval FROM users WHERE id = $1', [uid]);
                    const _ftBf1 = await db.get('SELECT id FROM user_force_approvals WHERE user_id = $1 AND task_type = $2 AND task_ref_id = $3', [uid, 'schedule', tpl.id]);
                    const needsBf1 = tpl.requires_approval || _faBf1?.force_approval || !!_ftBf1;

                    const existing = await db.get("SELECT id, status FROM task_point_reports WHERE template_id = $1 AND user_id = $2 AND report_date = $3", [tpl.id, uid, dateStr]);
                    if (existing) {
                        if (existing.status === 'pending') {
                            await db.run(`UPDATE task_point_reports SET quantity = $1, updated_at = NOW() WHERE id = $2`, [tmplQty, existing.id]);
                        } else {
                            const sBf1 = needsBf1 ? 'pending' : 'approved';
                            const pBf1 = needsBf1 ? 0 : tmplEarned;
                            await db.run(
                                `UPDATE task_point_reports SET quantity = $1, points_earned = $2, status = $3, updated_at = NOW() WHERE id = $4`,
                                [tmplQty, pBf1, sBf1, existing.id]
                            );
                        }
                        updated++;
                    } else {
                        const status = needsBf1 ? 'pending' : 'approved';
                        const earnedBf1 = needsBf1 ? 0 : tmplEarned;
                        await db.run(
                            `INSERT INTO task_point_reports (template_id, user_id, report_date, quantity, points_earned, status, content, report_type, report_value)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [tpl.id, uid, dateStr, tmplQty, earnedBf1, status, `[Backfill] ${entryCount}/${tmplTarget} ${moduleType}`, 'link', `${entryCount}/${tmplTarget}`]
                        );
                        created++;
                    }
                } catch(e) { errors++; }
            }
        }

        // Also backfill partner_outreach_entries
        try {
            const poTemplates = await db.all("SELECT * FROM task_point_templates WHERE task_name ILIKE '%Nhắn%Tìm%Đối Tác%'");
            if (poTemplates.length > 0) {
                const poEntries = await db.all(
                    `SELECT user_id, entry_date::text as entry_date, COUNT(*) as cnt
                     FROM partner_outreach_entries GROUP BY user_id, entry_date`
                );
                for (const entry of poEntries) {
                    const uid = entry.user_id;
                    const dateStr = entry.entry_date.slice(0,10);
                    const entryCount = Number(entry.cnt);
                    const user = await db.get('SELECT department_id FROM users WHERE id = $1', [uid]);
                    
                    // Calculate day_of_week for this entry date
                    const entryDate = new Date(dateStr + 'T00:00:00');
                    const entryDow = entryDate.getDay() === 0 ? 7 : entryDate.getDay();

                    let tpl = null;
                    for (const t of poTemplates) {
                        if (t.day_of_week !== entryDow) continue;
                        if (t.target_type === 'individual' && t.target_id === uid) { tpl = t; break; }
                        if (t.target_type === 'team' && user?.department_id === t.target_id) { tpl = t; break; }
                    }
                    if (!tpl) continue; // no template for this day
                    if (!tpl?.id) continue;

                    let tmplTarget = tpl.min_quantity || 20;
                    let tmplPoints = tpl.points || 10;
                    const ov = await db.get('SELECT custom_points, custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3', [uid, 'diem', tpl.id]);
                    if (ov) {
                        if (ov.custom_min_quantity != null) tmplTarget = Number(ov.custom_min_quantity);
                        if (ov.custom_points != null) tmplPoints = Number(ov.custom_points);
                    }

                    const tmplEarned = entryCount >= tmplTarget ? tmplPoints : 0;  // all-or-nothing
                    const tmplQty = Math.min(entryCount, tmplTarget);

                    try {
                        // Check force_approval
                        const _faBf2 = await db.get('SELECT force_approval FROM users WHERE id = $1', [uid]);
                        const _ftBf2 = await db.get('SELECT id FROM user_force_approvals WHERE user_id = $1 AND task_type = $2 AND task_ref_id = $3', [uid, 'schedule', tpl.id]);
                        const needsBf2 = tpl.requires_approval || _faBf2?.force_approval || !!_ftBf2;

                        const existing = await db.get("SELECT id, status FROM task_point_reports WHERE template_id = $1 AND user_id = $2 AND report_date = $3", [tpl.id, uid, dateStr]);
                        if (existing) {
                            if (existing.status === 'pending') {
                                await db.run(`UPDATE task_point_reports SET quantity = $1, updated_at = NOW() WHERE id = $2`, [tmplQty, existing.id]);
                            } else {
                                const sBf2 = needsBf2 ? 'pending' : 'approved';
                                const pBf2 = needsBf2 ? 0 : tmplEarned;
                                await db.run(
                                    `UPDATE task_point_reports SET quantity = $1, points_earned = $2, status = $3, updated_at = NOW() WHERE id = $4`,
                                    [tmplQty, pBf2, sBf2, existing.id]
                                );
                            }
                            updated++;
                        } else {
                            const status = needsBf2 ? 'pending' : 'approved';
                            const earnedBf2 = needsBf2 ? 0 : tmplEarned;
                            await db.run(
                                `INSERT INTO task_point_reports (template_id, user_id, report_date, quantity, points_earned, status, content, report_type, report_value)
                                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                                [tpl.id, uid, dateStr, tmplQty, earnedBf2, status, `[Backfill] ${entryCount}/${tmplTarget} nhắn tin đối tác`, 'link', `${entryCount}/${tmplTarget}`]
                            );
                            created++;
                        }
                    } catch(e) { errors++; }
                }
            }
        } catch(e) { errors++; }

        return { success: true, created, updated, errors, message: `Backfill hoàn thành: ${created} tạo mới, ${updated} cập nhật, ${errors} lỗi` };
    });

    fastify.get('/api/schedule/week-tasks', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, week_start } = request.query;
        const uid = Number(user_id) || request.user.id;

        if (!week_start) return reply.code(400).send({ error: 'Thiếu week_start' });

        const today = new Date(); today.setHours(0,0,0,0);
        const todayStr = _localDateStr(today);
        const monDate = new Date(week_start + 'T00:00:00');

        // Get user's department_joined_at for filtering
        const userInfo = await db.get('SELECT department_joined_at FROM users WHERE id = $1', [uid]);
        const deptJoinedStr = userInfo?.department_joined_at ? _localDateStr(new Date(userInfo.department_joined_at)) : null;

        // Get templates for future days
        const templates = await _getTemplatesForUser(uid, week_start);

        let allTasks = [];

        // Build tasks: today+future → live templates, past → existing snapshots
        for (let d = 0; d < 7; d++) {
            const colDate = new Date(monDate);
            colDate.setDate(monDate.getDate() + d);
            const dateStr = _localDateStr(colDate);
            const jsDow = colDate.getDay(); // 0=Sun
            const dayOfWeek = jsDow === 0 ? 7 : jsDow; // 1=Mon..7=Sun

            // Skip dates before user joined their department
            if (deptJoinedStr && dateStr < deptJoinedStr) continue;

            if (dateStr >= todayStr) {
                // Today + Future: use live templates
                const dayTasks = templates.filter(t => t.day_of_week === dayOfWeek);
                dayTasks.forEach(t => {
                    allTasks.push({ ...t, _source: 'template', _date: dateStr });
                });
                // For today: also sync snapshots in background (for penalty/deadline system)
                if (dateStr === todayStr) {
                    _ensureSnapshots(uid, dateStr, dayOfWeek, week_start).catch(() => {});
                }
            } else {
                // Past: only show existing snapshots (historical record)
                const snaps = await db.all(
                    'SELECT * FROM daily_task_snapshots WHERE user_id = $1 AND snapshot_date = $2 ORDER BY time_start',
                    [uid, dateStr]
                );
                snaps.forEach(s => {
                    allTasks.push({ ...s, _source: 'snapshot', _date: dateStr });
                });
            }
        }

        return { tasks: allTasks };
    });

    // GET my weekly tasks (legacy — still used for schedule)
    fastify.get('/api/schedule/my-tasks', { preHandler: [authenticate] }, async (request, reply) => {
        const tasks = await _getTemplatesForUser(request.user.id);
        return { tasks, source: tasks.length > 0 ? (tasks[0]?.target_type || 'none') : 'none' };
    });

    // GET user tasks (manager viewing a specific user — legacy)
    fastify.get('/api/schedule/user-tasks', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id } = request.query;
        if (!user_id) return reply.code(400).send({ error: 'Thiếu user_id' });
        const tasks = await _getTemplatesForUser(Number(user_id));
        return { tasks };
    });

    // GET team members for manager — only those with task templates
    fastify.get('/api/schedule/team-members', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        let members = [];

        const deptWithTemplates = await db.all("SELECT DISTINCT target_id FROM task_point_templates WHERE target_type = 'team'");
        const deptIds = deptWithTemplates.map(r => r.target_id);
        const usersWithTemplates = await db.all("SELECT DISTINCT target_id FROM task_point_templates WHERE target_type = 'individual'");
        const userIds = usersWithTemplates.map(r => r.target_id);

        if (['giam_doc'].includes(user.role)) {
            members = await db.all(
                `SELECT u.id, u.full_name, u.role, d.name as dept_name, u.department_id
                 FROM users u LEFT JOIN departments d ON u.department_id = d.id
                 WHERE u.status = 'active' AND u.role NOT IN ('giam_doc')
                 ORDER BY d.name, u.full_name`
            );
        } else if (['quan_ly', 'truong_phong', 'quan_ly_cap_cao'].includes(user.role)) {
            // Get departments from task_approvers + their child sub-teams
            const assigned = await db.all('SELECT department_id FROM task_approvers WHERE user_id = $1', [user.id]);
            const allDeptIds = new Set(assigned.map(a => a.department_id));
            // Also include own department
            if (user.department_id) allDeptIds.add(user.department_id);
            // Recursive: include ALL descendant departments (children, grandchildren, etc.)
            let toExpand = [...allDeptIds];
            while (toExpand.length > 0) {
                const ph = toExpand.map((_, i) => `$${i + 1}`).join(',');
                const children = await db.all(`SELECT id FROM departments WHERE parent_id IN (${ph}) AND status = 'active'`, toExpand);
                toExpand = [];
                for (const c of children) {
                    if (!allDeptIds.has(c.id)) {
                        allDeptIds.add(c.id);
                        toExpand.push(c.id);
                    }
                }
            }
            if (allDeptIds.size > 0) {
                const ids = [...allDeptIds];
                const ph = ids.map((_, i) => `$${i + 1}`).join(',');
                members = await db.all(
                    `SELECT u.id, u.full_name, u.role, d.name as dept_name, u.department_id
                     FROM users u LEFT JOIN departments d ON u.department_id = d.id
                     WHERE u.department_id IN (${ph}) AND u.status = 'active' AND u.id != $${ids.length + 1}
                     ORDER BY d.name, u.full_name`,
                    [...ids, user.id]
                );
            }
        }

        members = members.filter(m => userIds.includes(m.id) || deptIds.includes(m.department_id));
        
        // NOTE: head_user_id injection removed — only department_id + task_approvers control sidebar membership

        // Get user IDs that have at least one override (for ✏️ badge in sidebar)
        const overrideRows = await db.all('SELECT DISTINCT user_id FROM task_user_overrides');
        const overrideUserIds = overrideRows.map(r => r.user_id);

        return { members, override_user_ids: overrideUserIds };
    });

    // GET reports for a user + date range
    fastify.get('/api/schedule/reports', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, from, to } = request.query;
        const uid = Number(user_id) || request.user.id;

        if (!from || !to) return reply.code(400).send({ error: 'Thiếu from/to' });

        const reports = await db.all(
            `SELECT r.*, r.report_date::text as report_date, t.task_name, t.points as template_points, t.requires_approval
             FROM task_point_reports r
             LEFT JOIN task_point_templates t ON r.template_id = t.id
             WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
             ORDER BY r.report_date`,
            [uid, from, to]
        );

        return { reports };
    });

    // SUBMIT a report (multipart with optional image paste)
    fastify.post('/api/schedule/report', { preHandler: [authenticate] }, async (request, reply) => {
        const contentType = request.headers['content-type'] || '';

        let template_id, report_date, report_value, report_image, quantity, content;

        if (contentType.includes('multipart')) {
            const parts = request.parts();
            let fileBuffer = null, fileExt = '.png';

            for await (const part of parts) {
                if (part.type === 'file' && part.fieldname === 'report_image') {
                    const chunks = [];
                    for await (const chunk of part.file) chunks.push(chunk);
                    fileBuffer = Buffer.concat(chunks);
                    fileExt = path.extname(part.filename) || '.png';
                } else if (part.type === 'field') {
                    if (part.fieldname === 'template_id') template_id = part.value;
                    if (part.fieldname === 'report_date') report_date = part.value;
                    if (part.fieldname === 'report_value') report_value = part.value;
                    if (part.fieldname === 'quantity') quantity = part.value;
                    if (part.fieldname === 'content') content = part.value;
                }
            }

            // Save image if present (with compression)
            if (fileBuffer && fileBuffer.length > 0) {
                const { compressImage } = require('../utils/imageCompressor');
                fileBuffer = await compressImage(fileBuffer, { maxWidth: 1200, quality: 80 });
                const fileName = `report_${request.user.id}_${Date.now()}.jpg`;
                const uploadDir = path.join(__dirname, '..', 'uploads', 'reports');
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                fs.writeFileSync(path.join(uploadDir, fileName), fileBuffer);
                report_image = `/uploads/reports/${fileName}`;
            }
        } else {
            const body = request.body || {};
            template_id = body.template_id;
            report_date = body.report_date;
            report_value = body.report_value;
            report_image = body.report_image;
            quantity = body.quantity;
            content = body.content;
        }

        // Validate: at least link or image required
        const hasLink = report_value && report_value.trim();
        const hasImage = !!report_image;
        if (!template_id || !report_date) {
            return reply.code(400).send({ error: 'Thiếu thông tin bắt buộc' });
        }
        if (!hasLink && !hasImage) {
            return reply.code(400).send({ error: 'Phải có ít nhất link hoặc hình ảnh' });
        }

        // Only allow reporting for TODAY — managers/directors can bypass
        // Also allow past dates if user has a valid support request
        const todayLocal = _localDateStr(new Date());
        const isManagerRole = ['giam_doc','quan_ly','truong_phong'].includes(request.user.role);
        if (report_date !== todayLocal && !isManagerRole) {
            // Check for support request that extends deadline
            const sr = await db.get(
                `SELECT id, deadline_at FROM task_support_requests
                 WHERE user_id = $1 AND template_id = $2 AND task_date = $3
                   AND status IN ('pending','supported') AND source_type IS DISTINCT FROM 'khoa'`,
                [request.user.id, Number(template_id), report_date]
            );
            const now = new Date();
            const srDeadline = sr ? new Date(sr.deadline_at) : null;
            if (!sr || (srDeadline && now > srDeadline)) {
                return reply.code(403).send({ error: 'Chỉ được phép báo cáo ngày hôm nay. Liên hệ Quản lý để được báo cáo bù.' });
            }
        }

        const report_type = hasLink && hasImage ? 'both' : (hasLink ? 'link' : 'image');

        let template = await db.get('SELECT * FROM task_point_templates WHERE id = $1', [Number(template_id)]);
        // Fallback: if template was deleted, check snapshot for task data
        if (!template) {
            const snap = await db.get('SELECT * FROM daily_task_snapshots WHERE template_id = $1 AND user_id = $2 AND snapshot_date = $3', [Number(template_id), request.user.id, report_date]);
            if (snap) {
                template = { id: snap.template_id, points: snap.points, requires_approval: snap.requires_approval, task_name: snap.task_name };
            } else {
                return reply.code(404).send({ error: 'Template not found' });
            }
        }

        // Check force_approval: ép duyệt CV cho NV yếu kém
        const _forceUser = await db.get('SELECT force_approval FROM users WHERE id = $1', [request.user.id]);
        const _forceTask = await db.get(
            'SELECT id FROM user_force_approvals WHERE user_id = $1 AND task_type = $2 AND task_ref_id = $3',
            [request.user.id, 'schedule', Number(template_id)]
        );
        const needsApproval = template.requires_approval || _forceUser?.force_approval || !!_forceTask;
        const shouldAutoApprove = !needsApproval || isAutoApproveRole(request.user.role);
        const status = shouldAutoApprove ? 'approved' : 'pending';
        const points = shouldAutoApprove ? (template.points || 0) : 0;

        try {
            // Check if already submitted (prevent duplicates)
            const existing = await db.get(
                `SELECT id, status, redo_count FROM task_point_reports
                 WHERE template_id = $1 AND user_id = $2 AND report_date = $3
                 ORDER BY redo_count DESC LIMIT 1`,
                [Number(template_id), request.user.id, report_date]
            );
            if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
                return reply.code(400).send({ error: 'Đã nộp báo cáo rồi, đang chờ duyệt hoặc đã duyệt' });
            }

            // Calculate approval deadline if pending
            let approvalDeadline = null;
            if (status === 'pending') {
                try {
                    approvalDeadline = toLocalTimestamp(await calculateRealDeadline(new Date(), null));
                } catch(e2) { /* fallback: no deadline */ }
            }

            const redoCount = existing ? existing.redo_count + 1 : 0;

            await db.run(
                `INSERT INTO task_point_reports (template_id, user_id, report_date, report_type, report_value, report_image, quantity, content, status, points_earned, approval_deadline, redo_count)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [Number(template_id), request.user.id, report_date, report_type, report_value || '', report_image || '', Number(quantity) || 0, content || '', status, points, approvalDeadline, redoCount]
            );

            // Auto-resolve support request if NV submitted report (QL no longer penalized)
            await db.run(
                `UPDATE task_support_requests SET status = 'resolved'
                 WHERE user_id = $1 AND template_id = $2 AND task_date = $3
                   AND status IN ('pending','supported') AND source_type IS DISTINCT FROM 'khoa'`,
                [request.user.id, Number(template_id), report_date]
            );

            return { success: true, status, points_earned: points };
        } catch(e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // (old approve/reject moved below with full permission checks)

    // GET daily point summary for a user across a date range
    fastify.get('/api/schedule/summary', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, from, to } = request.query;
        const uid = Number(user_id) || request.user.id;

        if (!from || !to) return reply.code(400).send({ error: 'Thiếu from/to' });

        const rows = await db.all(
            `SELECT report_date::text as report_date, SUM(points_earned) as total_points, COUNT(*) as report_count
             FROM task_point_reports
             WHERE user_id = $1 AND report_date BETWEEN $2 AND $3 AND status = 'approved'
             GROUP BY report_date
             ORDER BY report_date`,
            [uid, from, to]
        );

        return { summary: rows };
    });

    // ========== HELPER: Check if user can approve for a department (direct only) ==========
    async function _canApproveForDept(userId, deptId) {
        // Giám đốc auto-approve all
        const u = await db.get('SELECT role FROM users WHERE id = $1', [userId]);
        if (u && u.role === 'giam_doc') return true;

        // Check direct assignment only (no cascade to parent)
        const direct = await db.get('SELECT id FROM task_approvers WHERE user_id = $1 AND department_id = $2', [userId, deptId]);
        return !!direct;
    }

    // ========== HELPER: Auto-expire overdue redo deadlines ==========
    async function _autoExpireRedos() {
        const now = new Date();
        const overdue = await db.all(
            `SELECT id FROM task_point_reports WHERE status = 'rejected' AND redo_deadline IS NOT NULL AND redo_deadline < $1`,
            [now.toISOString()]
        );
        for (const r of overdue) {
            await db.run(
                `UPDATE task_point_reports SET status = 'expired', points_earned = 0 WHERE id = $1`,
                [r.id]
            );
        }
        return overdue.length;
    }

    // ========== APPROVER MANAGEMENT (GĐ only) ==========

    // GET all approvers
    fastify.get('/api/schedule/approvers', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(
            `SELECT ta.id, ta.user_id, ta.department_id, u.full_name as user_name, u.role as user_role, d.name as dept_name
             FROM task_approvers ta
             JOIN users u ON ta.user_id = u.id
             JOIN departments d ON ta.department_id = d.id
             ORDER BY d.name, u.full_name`
        );
        return { approvers: rows };
    });

    // POST add approver
    fastify.post('/api/schedule/approvers', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được setup' });
        const { user_id, department_id } = request.body;
        if (!user_id || !department_id) return reply.code(400).send({ error: 'Thiếu user_id hoặc department_id' });
        try {
            await db.run('INSERT INTO task_approvers (user_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user_id, department_id]);
            return { success: true };
        } catch(e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE remove approver
    fastify.delete('/api/schedule/approvers/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được setup' });
        // Get approver info before deleting
        const approver = await db.get('SELECT user_id, department_id FROM task_approvers WHERE id = $1', [Number(request.params.id)]);
        await db.run('DELETE FROM task_approvers WHERE id = $1', [Number(request.params.id)]);
        // Also clear head_user_id if this user was head of the department
        if (approver) {
            await db.run(
                'UPDATE departments SET head_user_id = NULL WHERE id = $1 AND head_user_id = $2',
                [approver.department_id, approver.user_id]
            );
        }
        return { success: true };
    });

    // ========== PENDING APPROVALS ==========

    // GET my own pending reports (for employee notification)
    fastify.get('/api/schedule/my-pending', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const reports = await db.all(
            `SELECT r.id, r.template_id, r.report_date::text as report_date, r.status, r.created_at,
                    t.task_name, t.points as template_points
             FROM task_point_reports r
             JOIN task_point_templates t ON r.template_id = t.id
             WHERE r.user_id = $1 AND r.status = 'pending'
             ORDER BY r.report_date DESC`,
            [userId]
        );
        const lockPending = await db.all(
            `SELECT c.id, c.lock_task_id, c.completion_date::text as completion_date, c.status,
                    t.task_name
             FROM lock_task_completions c
             JOIN lock_tasks t ON c.lock_task_id = t.id
             WHERE c.user_id = $1 AND c.status = 'pending'
             ORDER BY c.completion_date DESC`,
            [userId]
        );
        const chainPending = await db.all(
            `SELECT cc.id, cc.chain_item_id, cc.status, cc.created_at,
                    cii.task_name, cins.chain_name
             FROM chain_task_completions cc
             JOIN chain_task_instance_items cii ON cc.chain_item_id = cii.id
             JOIN chain_task_instances cins ON cins.id = cii.chain_instance_id
             WHERE cc.user_id = $1 AND cc.status = 'pending'
             ORDER BY cc.created_at DESC`,
            [userId]
        );
        return { reports, lockPending, chainPending };
    });


    // GET pending reports for current user's approval scope
    fastify.get('/api/schedule/pending-approvals', { preHandler: [authenticate] }, async (request, reply) => {
        // Auto-expire overdue first
        await _autoExpireRedos();

        const userId = request.user.id;
        const isGD = request.user.role === 'giam_doc';

        // Get departments this user can approve for
        let deptIds = [];
        if (isGD) {
            const allDepts = await db.all('SELECT id FROM departments');
            deptIds = allDepts.map(d => d.id);
        } else {
            // Direct assignment only (no cascade to children)
            const assigned = await db.all('SELECT department_id FROM task_approvers WHERE user_id = $1', [userId]);
            deptIds = assigned.map(a => a.department_id);
        }

        if (deptIds.length === 0 && !isGD) {
            // Still check if user is a force_approval_reviewer
            const forceUsers = await db.all(
                'SELECT id FROM users WHERE force_approval_reviewer_id = $1 AND status = \'active\'', [userId]
            );
            if (forceUsers.length === 0) return { pending: [] };
        }

        // Pending reports from departments + force_approval_reviewer scope
        let pending = [];
        if (deptIds.length > 0) {
            const placeholders = deptIds.map((_, i) => `$${i + 1}`).join(',');
            pending = await db.all(
                `SELECT r.id, r.template_id, r.user_id, r.report_date::text as report_date, r.report_type, r.report_value, r.report_image, r.quantity, r.content, r.status, r.redo_count,
                        r.approval_deadline, r.created_at,
                        t.task_name, t.points as template_points, t.requires_approval, t.guide_url, t.input_requirements, t.output_requirements, t.min_quantity,
                        u.full_name as user_name, u.username
                 FROM task_point_reports r
                 JOIN task_point_templates t ON r.template_id = t.id
                 JOIN users u ON r.user_id = u.id
                 WHERE r.status = 'pending' AND u.department_id IN (${placeholders}) AND r.user_id != $${deptIds.length + 1}
                 AND (u.force_approval_reviewer_id IS NULL OR u.force_approval_reviewer_id = $${deptIds.length + 1})
                 ORDER BY r.report_date DESC, u.full_name`,
                [...deptIds, userId]
            );
        }

        // Also include reports from users where current user is force_approval_reviewer
        const forcePending = await db.all(
            `SELECT r.id, r.template_id, r.user_id, r.report_date::text as report_date, r.report_type, r.report_value, r.report_image, r.quantity, r.content, r.status, r.redo_count,
                    r.approval_deadline, r.created_at,
                    t.task_name, t.points as template_points, t.requires_approval, t.guide_url, t.input_requirements, t.output_requirements, t.min_quantity,
                    u.full_name as user_name, u.username
             FROM task_point_reports r
             JOIN task_point_templates t ON r.template_id = t.id
             JOIN users u ON r.user_id = u.id
             WHERE r.status = 'pending' AND u.force_approval_reviewer_id = $1
             ORDER BY r.report_date DESC, u.full_name`,
            [userId]
        );

        // Merge and deduplicate by id
        const seenIds = new Set(pending.map(p => p.id));
        forcePending.forEach(fp => { if (!seenIds.has(fp.id)) pending.push(fp); });

        return { pending };
    });

    // GET pending count (for sidebar badge)
    fastify.get('/api/schedule/pending-count', { preHandler: [authenticate] }, async (request, reply) => {
        await _autoExpireRedos();

        const userId = request.user.id;
        const isGD = request.user.role === 'giam_doc';

        let deptIds = [];
        if (isGD) {
            const allDepts = await db.all('SELECT id FROM departments');
            deptIds = allDepts.map(d => d.id);
        } else {
            // Direct assignment only (no cascade to children)
            const assigned = await db.all('SELECT department_id FROM task_approvers WHERE user_id = $1', [userId]);
            deptIds = assigned.map(a => a.department_id);
        }

        if (deptIds.length === 0) return { count: 0 };

        const placeholders = deptIds.map((_, i) => `$${i + 1}`).join(',');

        // Count 1: Pending task reports (CV Chờ Duyệt)
        const reportCount = await db.get(
            `SELECT COUNT(*) as c FROM task_point_reports r
             JOIN users u ON r.user_id = u.id
             WHERE r.status = 'pending' AND u.department_id IN (${placeholders}) AND r.user_id != $${deptIds.length + 1}`,
            [...deptIds, userId]
        );

        // Count 2: Pending support requests (Hỗ Trợ Nhân Sự)
        // giam_doc sees all, others see where they are the manager
        let supportCount;
        if (isGD) {
            supportCount = await db.get(
                `SELECT COUNT(*) as c FROM task_support_requests WHERE status = 'pending'`
            );
        } else {
            const supportPh = deptIds.map((_, i) => `$${i + 2}`).join(',');
            supportCount = await db.get(
                `SELECT COUNT(*) as c FROM task_support_requests
                 WHERE status = 'pending' AND (manager_id = $1 OR manager_id IN (
                     SELECT id FROM users WHERE department_id IN (${supportPh})
                 ))`,
                [userId, ...deptIds]
            );
        }

        // Count 3: Pending lock task completions (CV Khóa chờ duyệt)
        let lockCount;
        if (isGD) {
            lockCount = await db.get(
                `SELECT COUNT(*) as c FROM lock_task_completions ltc
                 JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
                 WHERE ltc.status = 'pending'`
            );
        } else {
            // QLCC/TP: see pending from their dept + children
            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            const lockDeptIds = [user?.department_id].filter(Boolean);
            if (user?.department_id) {
                const children = await db.all('SELECT id FROM departments WHERE parent_id = $1', [user.department_id]);
                children.forEach(c => lockDeptIds.push(c.id));
            }
            if (lockDeptIds.length > 0) {
                const lkPh = lockDeptIds.map((_, i) => `$${i + 1}`).join(',');
                lockCount = await db.get(
                    `SELECT COUNT(*) as c FROM lock_task_completions ltc
                     JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
                     JOIN users u ON u.id = ltc.user_id
                     WHERE ltc.status = 'pending'
                     AND u.department_id IN (${lkPh})`,
                    lockDeptIds
                );
            } else {
                lockCount = { c: 0 };
            }
        }

        const total = Number(reportCount.c) + Number(supportCount.c) + Number(lockCount.c);
        return { count: total };
    });

    // ========== APPROVE / REJECT with full logic ==========

    // APPROVE / REJECT a report (permission-checked)
    fastify.put('/api/schedule/report/:id/approve', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const { action, reject_reason } = request.body || {};

        if (!['approve', 'reject'].includes(action)) {
            return reply.code(400).send({ error: 'action phải là approve hoặc reject' });
        }

        const report = await db.get(
            `SELECT r.*, t.points as template_points, t.task_name, u.department_id
             FROM task_point_reports r
             JOIN task_point_templates t ON r.template_id = t.id
             JOIN users u ON r.user_id = u.id
             WHERE r.id = $1`,
            [id]
        );
        if (!report) return reply.code(404).send({ error: 'Report not found' });

        // Check department permission (also allow designated force_approval reviewer)
        const canApproveDept = await _canApproveForDept(request.user.id, report.department_id);
        const _isForceReviewer = await db.get(
            'SELECT id FROM users WHERE id = $1 AND force_approval_reviewer_id = $2',
            [report.user_id, request.user.id]
        );
        if (!canApproveDept && !_isForceReviewer) return reply.code(403).send({ error: 'Bạn không có quyền duyệt phòng này' });

        // Check approval hierarchy: get reporter's role
        const reporterUser = await db.get('SELECT role FROM users WHERE id = $1', [report.user_id]);
        if (reporterUser && !canApproveByRole(request.user.role, reporterUser.role)) {
            return reply.code(403).send({ error: 'Bạn không đủ cấp bậc để duyệt báo cáo của người này' });
        }

        if (action === 'approve') {
            const pts = report.template_points || 0;
            await db.run(
                'UPDATE task_point_reports SET status = $1, points_earned = $2, approved_by = $3 WHERE id = $4',
                ['approved', pts, request.user.id, id]
            );
            return { success: true, status: 'approved', points_earned: pts };
        } else {
            // REJECT
            if (!reject_reason || !reject_reason.trim()) {
                return reply.code(400).send({ error: 'Phải nhập lý do từ chối' });
            }

            // Get redo config
            const redoConfig = await db.get("SELECT value FROM app_config WHERE key = 'task_redo_max'");
            const maxRedo = Number(redoConfig?.value) || 1;
            const currentRedo = report.redo_count || 0;

            if (currentRedo >= maxRedo) {
                // Already used all redo attempts → final reject → 0 points
                await db.run(
                    `UPDATE task_point_reports SET status = 'expired', points_earned = 0, approved_by = $1, reject_reason = $2, rejected_at = NOW() WHERE id = $3`,
                    [request.user.id, reject_reason, id]
                );
                return { success: true, status: 'expired', message: 'Đã hết lượt làm lại' };
            }

            // Set redo deadline: 23:59 next day
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(23, 59, 59, 0);

            await db.run(
                `UPDATE task_point_reports SET status = 'rejected', points_earned = 0, approved_by = $1, reject_reason = $2, rejected_at = NOW(), redo_deadline = $3 WHERE id = $4`,
                [request.user.id, reject_reason, tomorrow.toISOString(), id]
            );

            return { success: true, status: 'rejected', redo_deadline: tomorrow.toISOString(), redo_remaining: maxRedo - currentRedo };
        }
    });

    // ========== REDO: Employee resubmits after rejection ==========
    fastify.put('/api/schedule/report/:id/redo', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const report = await db.get('SELECT * FROM task_point_reports WHERE id = $1', [id]);
        if (!report) return reply.code(404).send({ error: 'Report not found' });
        if (report.user_id !== request.user.id) return reply.code(403).send({ error: 'Chỉ chính chủ mới được nộp lại' });
        if (report.status !== 'rejected') return reply.code(400).send({ error: 'Report không ở trạng thái bị từ chối' });

        // Check deadline
        if (report.redo_deadline && new Date(report.redo_deadline) < new Date()) {
            return reply.code(400).send({ error: 'Đã quá hạn nộp lại' });
        }

        const contentType = request.headers['content-type'] || '';
        let report_value, report_image, quantity, content;

        if (contentType.includes('multipart')) {
            const parts = request.parts();
            let fileBuffer = null, fileExt = '.png';
            for await (const part of parts) {
                if (part.type === 'file' && part.fieldname === 'report_image') {
                    const chunks = [];
                    for await (const chunk of part.file) chunks.push(chunk);
                    fileBuffer = Buffer.concat(chunks);
                    fileExt = path.extname(part.filename) || '.png';
                } else if (part.type === 'field') {
                    if (part.fieldname === 'report_value') report_value = part.value;
                    if (part.fieldname === 'quantity') quantity = part.value;
                    if (part.fieldname === 'content') content = part.value;
                }
            }
            if (fileBuffer && fileBuffer.length > 0) {
                const { compressImage } = require('../utils/imageCompressor');
                fileBuffer = await compressImage(fileBuffer, { maxWidth: 1200, quality: 80 });
                const fileName = `redo_${request.user.id}_${Date.now()}.jpg`;
                const uploadDir = path.join(__dirname, '..', 'uploads', 'reports');
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                fs.writeFileSync(path.join(uploadDir, fileName), fileBuffer);
                report_image = `/uploads/reports/${fileName}`;
            }
        } else {
            ({ report_value, report_image, quantity, content } = request.body || {});
        }

        const hasLink = report_value && report_value.trim();
        const hasImage = !!report_image;
        if (!hasLink && !hasImage) return reply.code(400).send({ error: 'Phải có link hoặc hình ảnh' });

        const report_type = hasLink && hasImage ? 'both' : (hasLink ? 'link' : 'image');
        const newRedoCount = (report.redo_count || 0) + 1;

        // Calculate approval deadline
        let approvalDeadline = null;
        try {
            approvalDeadline = toLocalTimestamp(await calculateRealDeadline(new Date(), null));
        } catch(e2) {}

        // Insert NEW row (preserve history)
        await db.run(
            `INSERT INTO task_point_reports (template_id, user_id, report_date, report_type, report_value, report_image, quantity, content, status, points_earned, redo_count, approval_deadline)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 0, $9, $10)`,
            [report.template_id, report.user_id, report.report_date, report_type, report_value || '', report_image || '', Number(quantity) || 0, content || '', newRedoCount, approvalDeadline]
        );

        return { success: true, status: 'pending' };
    });

    // ========== GET rejected reports for current user (for popup) ==========
    fastify.get('/api/schedule/my-rejected', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(
            `SELECT r.id, r.template_id, r.report_date::text as report_date, r.reject_reason, r.redo_deadline, r.redo_count,
                    t.task_name, t.points
             FROM task_point_reports r
             JOIN task_point_templates t ON r.template_id = t.id
             WHERE r.user_id = $1 AND r.status = 'rejected' AND r.redo_deadline IS NOT NULL AND r.redo_deadline > NOW()
             ORDER BY r.redo_deadline ASC`,
            [request.user.id]
        );
        return { rejected: rows };
    });

    // ========== GET report history (all versions) for a task+date ==========
    fastify.get('/api/schedule/report-history', { preHandler: [authenticate] }, async (request, reply) => {
        const { template_id, report_date, user_id } = request.query;
        const uid = Number(user_id) || request.user.id;
        const rows = await db.all(
            `SELECT r.*, r.report_date::text as report_date, t.task_name, t.points as template_points,
                    t.guide_url, t.input_requirements, t.output_requirements, t.min_quantity
             FROM task_point_reports r LEFT JOIN task_point_templates t ON r.template_id = t.id
             WHERE r.template_id = $1 AND r.user_id = $2 AND r.report_date = $3
             ORDER BY r.redo_count DESC`,
            [Number(template_id), uid, report_date]
        );
        return { history: rows };
    });

    // ========== CONFIG: redo limit ==========
    fastify.get('/api/schedule/config', { preHandler: [authenticate] }, async (request, reply) => {
        const row = await db.get("SELECT value FROM app_config WHERE key = 'task_redo_max'");
        return { task_redo_max: Number(row?.value) || 1 };
    });

    fastify.post('/api/schedule/config', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { task_redo_max } = request.body;
        if (task_redo_max != null) {
            await db.run("INSERT INTO app_config (key, value) VALUES ('task_redo_max', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()", [String(task_redo_max)]);
        }
        return { success: true };
    });
    // ========== REPORT HISTORY API ==========
    fastify.get('/api/report-history/user/:userId', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = Number(request.params.userId);
        const month = request.query.month; // YYYY-MM
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return reply.code(400).send({ error: 'Thiếu hoặc sai format month (YYYY-MM)' });
        }

        // Calculate date range for the month
        const [year, mon] = month.split('-').map(Number);
        const lastDay = new Date(year, mon, 0).getDate();
        const fromDate = `${month}-01`;
        const toDate = `${month}-${String(lastDay).padStart(2, '0')}`;

        // Get user info
        const userInfo = await db.get(
            'SELECT u.id, u.full_name, u.role, u.department_id, d.name as dept_name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = $1',
            [userId]
        );
        if (!userInfo) return reply.code(404).send({ error: 'User not found' });

        // Run all queries in parallel
        const [templates, reports, snapshots, holidays] = await Promise.all([
            // Active task templates for this user (team + individual)
            (async () => {
                const indiv = await db.all(
                    "SELECT *, 'individual' as _source FROM task_point_templates WHERE target_type = 'individual' AND target_id = $1 AND week_only IS NULL ORDER BY day_of_week, time_start",
                    [userId]
                );
                // Get team tasks from user's department
                let team = [];
                if (userInfo.department_id) {
                    team = await db.all(
                        "SELECT *, 'team' as _source FROM task_point_templates WHERE target_type = 'team' AND target_id = $1 AND week_only IS NULL ORDER BY day_of_week, time_start",
                        [userInfo.department_id]
                    );
                }
                // Also check departments where user is head
                const headDepts = await db.all('SELECT id FROM departments WHERE head_user_id = $1 AND status = $2', [userId, 'active']);
                for (const hd of headDepts) {
                    if (hd.id !== userInfo.department_id) {
                        const hdTasks = await db.all(
                            "SELECT *, 'team' as _source FROM task_point_templates WHERE target_type = 'team' AND target_id = $1 AND week_only IS NULL ORDER BY day_of_week, time_start",
                            [hd.id]
                        );
                        team = team.concat(hdTasks);
                    }
                }
                return [...team, ...indiv];
            })(),
            // All reports in this month
            db.all(
                `SELECT r.*, r.report_date::text as report_date, 
                 t.task_name as template_task_name, t.points as template_points,
                 t.guide_url as template_guide_url, t.min_quantity as template_min_quantity,
                 t.time_start as template_time_start, t.time_end as template_time_end,
                 t.requires_approval as template_requires_approval,
                 t.input_requirements as template_input_requirements,
                 t.output_requirements as template_output_requirements
                 FROM task_point_reports r
                 LEFT JOIN task_point_templates t ON r.template_id = t.id
                 WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
                 ORDER BY r.report_date`,
                [userId, fromDate, toDate]
            ),
            // All snapshots in this month (for seeing which tasks were assigned on which days)
            db.all(
                `SELECT *, snapshot_date::text as snapshot_date_str FROM daily_task_snapshots
                 WHERE user_id = $1 AND snapshot_date BETWEEN $2 AND $3
                 ORDER BY daily_task_snapshots.snapshot_date, time_start`,
                [userId, fromDate, toDate]
            ),
            // Holidays in this month
            db.all(
                "SELECT holiday_date::text as holiday_date, holiday_name FROM holidays WHERE holiday_date BETWEEN $1 AND $2 ORDER BY holiday_date",
                [fromDate, toDate]
            )
        ]);

        // Lock task completions in this month (only for tasks still assigned to user)
        const lock_completions = await db.all(
            `SELECT ltc.id, ltc.lock_task_id, ltc.completion_date::text as completion_date,
                    ltc.redo_count, ltc.proof_url, ltc.content, ltc.status,
                    ltc.reject_reason, ltc.reviewed_at, ltc.created_at,
                    ltc.quantity_done,
                    lt.task_name, lt.guide_link,
                    lt.input_requirements, lt.output_requirements, lt.requires_approval, lt.min_quantity
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             JOIN lock_task_assignments lta ON lta.lock_task_id = lt.id AND lta.user_id = ltc.user_id
             WHERE ltc.user_id = $1 AND ltc.completion_date BETWEEN $2 AND $3
             ORDER BY ltc.completion_date DESC, ltc.created_at DESC`,
            [userId, fromDate, toDate]
        );

        // Also get active lock tasks assigned to user (to detect missed ones)
        const lock_tasks = await db.all(
            `SELECT lt.id, lt.task_name, lt.guide_link,
                    lt.input_requirements, lt.output_requirements, lt.requires_approval,
                    lt.min_quantity,
                    lta.user_id
             FROM lock_task_assignments lta
             JOIN lock_tasks lt ON lt.id = lta.lock_task_id
             WHERE lta.user_id = $1 AND lt.is_active = true
             ORDER BY lt.task_name`,
            [userId]
        );

        return {
            user_info: userInfo,
            templates,
            reports,
            snapshots,
            holidays,
            lock_completions,
            lock_tasks,
            month,
            from_date: fromDate,
            to_date: toDate
        };
    });

    // ========== DEPARTMENT-LEVEL REPORT AGGREGATION ==========
    fastify.get('/api/report-history/department/:deptId', { preHandler: [authenticate] }, async (request, reply) => {
        const deptId = Number(request.params.deptId);
        const month = request.query.month;
        const includeChildren = request.query.include_children === 'true';
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return reply.code(400).send({ error: 'Thiếu hoặc sai format month (YYYY-MM)' });
        }

        const [year, mon] = month.split('-').map(Number);
        const lastDay = new Date(year, mon, 0).getDate();
        const fromDate = `${month}-01`;
        const toDate = `${month}-${String(lastDay).padStart(2, '0')}`;

        // Get department info
        const dept = await db.get('SELECT id, name, parent_id FROM departments WHERE id = $1', [deptId]);
        if (!dept) return reply.code(404).send({ error: 'Phòng ban không tồn tại' });

        // Get all dept IDs to include
        let deptIds = [deptId];
        if (includeChildren) {
            const children = await db.all('SELECT id FROM departments WHERE parent_id = $1 AND status = $2', [deptId, 'active']);
            children.forEach(c => deptIds.push(c.id));
            // Also get grandchildren
            if (children.length > 0) {
                const childIds = children.map(c => c.id);
                const ph = childIds.map((_, i) => `$${i + 1}`).join(',');
                const grandchildren = await db.all(`SELECT id FROM departments WHERE parent_id IN (${ph}) AND status = $${childIds.length + 1}`, [...childIds, 'active']);
                grandchildren.forEach(c => deptIds.push(c.id));
            }
        }

        // Get all user IDs in these departments
        const deptPh = deptIds.map((_, i) => `$${i + 1}`).join(',');
        const users = await db.all(
            `SELECT id, department_id FROM users WHERE department_id IN (${deptPh}) AND status = 'active'`,
            deptIds
        );
        const userIds = users.map(u => u.id);
        const userDeptMap = new Map(users.map(u => [u.id, u.department_id]));
        if (userIds.length === 0) {
            return {
                dept_name: dept.name, member_count: 0,
                point_tasks: [], point_summary: { total: 0, completed: 0, points: 0, missed: 0, pending: 0 },
                lock_tasks: [], lock_summary: { total: 0, approved: 0, pending: 0, rejected: 0 },
                month
            };
        }

        const userPh = userIds.map((_, i) => `$${i + 1}`).join(',');
        const dateOffset = userIds.length + 1;

        // Parallel queries — CV ĐIỂM
        const [snapshots, reports, holidays] = await Promise.all([
            db.all(
                `SELECT task_name, points, snapshot_date::text as snapshot_date_str, user_id, template_id, requires_approval
                 FROM daily_task_snapshots
                 WHERE user_id IN (${userPh}) AND snapshot_date BETWEEN $${dateOffset} AND $${dateOffset + 1}
                 ORDER BY task_name`,
                [...userIds, fromDate, toDate]
            ),
            db.all(
                `SELECT r.template_id, r.report_date::text as report_date, r.status, r.points_earned, r.user_id,
                        t.task_name as template_task_name
                 FROM task_point_reports r
                 LEFT JOIN task_point_templates t ON r.template_id = t.id
                 WHERE r.user_id IN (${userPh}) AND r.report_date BETWEEN $${dateOffset} AND $${dateOffset + 1}`,
                [...userIds, fromDate, toDate]
            ),
            db.all(
                "SELECT holiday_date::text as holiday_date FROM holidays WHERE holiday_date BETWEEN $1 AND $2",
                [fromDate, toDate]
            )
        ]);

        // Build working days (exclude holidays and future)
        const holidaySet = new Set(holidays.map(h => h.holiday_date));
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const workingDaySet = new Set();
        for (let d = 1; d <= lastDay; d++) {
            const ds = `${month}-${String(d).padStart(2, '0')}`;
            if (!holidaySet.has(ds) && ds <= todayStr) workingDaySet.add(ds);
        }

        // Build report lookup
        const reportMap = {};
        reports.forEach(r => { reportMap[`${r.user_id}_${r.template_id}_${r.report_date}`] = r; });

        // Aggregate CV Điểm by task_name
        const pointGroupMap = new Map();
        snapshots.forEach(s => {
            if (!workingDaySet.has(s.snapshot_date_str)) return;
            const name = s.task_name;
            if (!pointGroupMap.has(name)) {
                pointGroupMap.set(name, { task_name: name, total: 0, completed: 0, pending: 0, missed: 0, points: 0 });
            }
            const g = pointGroupMap.get(name);
            g.total++;
            const rKey = `${s.user_id}_${s.template_id}_${s.snapshot_date_str}`;
            const report = reportMap[rKey];
            if (report) {
                if (report.status === 'approved') { g.completed++; g.points += (report.points_earned || 0); }
                else if (report.status === 'pending') { g.pending++; }
                else { g.missed++; }
            } else {
                if (s.snapshot_date_str < todayStr) g.missed++;
            }
        });

        // Inject today's templates that don't have snapshots yet (matching frontend logic)
        if (workingDaySet.has(todayStr)) {
            const todayDow = today.getDay() === 0 ? 7 : today.getDay();
            const snapshotTodayKeys = new Set(
                snapshots.filter(s => s.snapshot_date_str === todayStr).map(s => `${s.user_id}_${s.template_id}`)
            );
            // Get all active templates for these users (team + individual)
            const tUserPh = userIds.map((_, i) => `$${i + 2}`).join(',');
            const tDeptPh = deptIds.map((_, i) => `$${i + 2 + userIds.length}`).join(',');
            const todayTemplates = await db.all(
                `SELECT id, task_name, points, target_type, target_id, day_of_week
                 FROM task_point_templates
                 WHERE day_of_week = $1 AND week_only IS NULL
                 AND ((target_type = 'individual' AND target_id IN (${tUserPh}))
                   OR (target_type = 'team' AND target_id IN (${tDeptPh})))`,
                [todayDow, ...userIds, ...deptIds]
            );
            todayTemplates.forEach(t => {
                // For team tasks, inject ONLY for users in the matching dept
                const affectedUsers = t.target_type === 'team'
                    ? userIds.filter(uid => userDeptMap.get(uid) === t.target_id)
                    : [t.target_id];
                affectedUsers.forEach(uid => {
                    const key = `${uid}_${t.id}`;
                    if (!snapshotTodayKeys.has(key)) {
                        snapshotTodayKeys.add(key);
                        const name = t.task_name;
                        if (!pointGroupMap.has(name)) {
                            pointGroupMap.set(name, { task_name: name, total: 0, completed: 0, pending: 0, missed: 0, points: 0 });
                        }
                        const g = pointGroupMap.get(name);
                        g.total++;
                        const rKey = `${uid}_${t.id}_${todayStr}`;
                        const report = reportMap[rKey];
                        if (report) {
                            if (report.status === 'approved') { g.completed++; g.points += (report.points_earned || 0); }
                            else if (report.status === 'pending') { g.pending++; }
                        }
                    }
                });
            });
        }

        const point_tasks = [...pointGroupMap.values()].sort((a, b) => a.task_name.localeCompare(b.task_name));
        const point_summary = { total: 0, completed: 0, points: 0, missed: 0, pending: 0 };
        point_tasks.forEach(t => {
            point_summary.total += t.total;
            point_summary.completed += t.completed;
            point_summary.points += t.points;
            point_summary.missed += t.missed;
            point_summary.pending += t.pending;
        });

        // CV KHÓA — lock_task_completions
        const lock_completions = await db.all(
            `SELECT ltc.status, lt.task_name
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.user_id IN (${userPh}) AND ltc.completion_date BETWEEN $${dateOffset} AND $${dateOffset + 1}`,
            [...userIds, fromDate, toDate]
        );

        const lockGroupMap = new Map();
        lock_completions.forEach(c => {
            const name = c.task_name;
            if (!lockGroupMap.has(name)) {
                lockGroupMap.set(name, { task_name: name, total: 0, approved: 0, pending: 0, rejected: 0 });
            }
            const g = lockGroupMap.get(name);
            g.total++;
            if (c.status === 'approved') g.approved++;
            else if (c.status === 'pending') g.pending++;
            else g.rejected++;
        });

        const lock_tasks_agg = [...lockGroupMap.values()].sort((a, b) => a.task_name.localeCompare(b.task_name));
        const lock_summary = { total: 0, approved: 0, pending: 0, rejected: 0 };
        lock_tasks_agg.forEach(t => {
            lock_summary.total += t.total;
            lock_summary.approved += t.approved;
            lock_summary.pending += t.pending;
            lock_summary.rejected += t.rejected;
        });

        return {
            dept_name: dept.name,
            member_count: userIds.length,
            point_tasks,
            point_summary,
            lock_tasks: lock_tasks_agg,
            lock_summary,
            month
        };
    });

    // ========== SẾP HỖ TRỢ APIs ==========


    // NV: Gửi yêu cầu hỗ trợ
    fastify.post('/api/task-support/request', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const { template_id, task_date, task_name } = request.body || {};

        if (!template_id || !task_date || !task_name) {
            return reply.code(400).send({ error: 'Thiếu thông tin' });
        }

        // Get user info + department
        const user = await db.get('SELECT id, department_id FROM users WHERE id = $1', [userId]);
        if (!user || !user.department_id) {
            return reply.code(400).send({ error: 'Không tìm thấy phòng ban' });
        }

        // Find approver from task_approvers (Setup Người Duyệt Công Việc)
        // Walk up department tree: user dept → parent dept → grandparent etc.
        let managerId = null;
        let lookupDeptId = user.department_id;
        const visited = new Set();
        while (lookupDeptId && !visited.has(lookupDeptId)) {
            visited.add(lookupDeptId);
            // Check if there's an approver assigned to this dept (not self)
            const approver = await db.get(
                'SELECT user_id FROM task_approvers WHERE department_id = $1 AND user_id != $2 LIMIT 1',
                [lookupDeptId, userId]
            );
            if (approver) {
                managerId = approver.user_id;
                break;
            }
            // Go up
            const dept = await db.get('SELECT parent_id FROM departments WHERE id = $1', [lookupDeptId]);
            lookupDeptId = dept ? dept.parent_id : null;
        }

        if (!managerId) {
            return reply.code(400).send({ error: 'Chưa có người duyệt công việc trong Setup. Liên hệ giám đốc.' });
        }

        // Calculate deadline with holidays, leave, Sunday awareness
        let realDeadline;
        try {
            realDeadline = await calculateRealDeadline(new Date(), managerId);
        } catch(e2) {
            // Fallback: simple tomorrow
            realDeadline = new Date();
            realDeadline.setDate(realDeadline.getDate() + 1);
            realDeadline.setHours(23, 59, 59, 0);
        }
        const deadlineStr = toDateStr(realDeadline);
        const deadlineAt = toLocalTimestamp(realDeadline);

        // Check limit: 1 per CV per day
        const existing = await db.get(
            'SELECT id FROM task_support_requests WHERE user_id = $1 AND template_id = $2 AND task_date = $3',
            [userId, template_id, task_date]
        );
        if (existing) {
            return reply.code(400).send({ error: 'Bạn đã gửi yêu cầu hỗ trợ cho công việc này hôm nay rồi' });
        }

        await db.run(
            `INSERT INTO task_support_requests (user_id, template_id, task_name, task_date, deadline, deadline_at, manager_id, department_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
            [userId, template_id, task_name, task_date, deadlineStr, deadlineAt, managerId, user.department_id]
        );

        return { success: true, message: 'Đã gửi yêu cầu hỗ trợ đến quản lý', deadline: deadlineStr };
    });

    // QL: Lấy danh sách chờ hỗ trợ
    fastify.get('/api/task-support/pending', { preHandler: [authenticate] }, async (request, reply) => {
        const managerId = request.user.id;
        const isGD = request.user.role === 'giam_doc';

        let pending;
        if (isGD) {
            // GĐ sees all pending support requests
            pending = await db.all(
                `SELECT sr.*, sr.task_date::text as task_date, sr.deadline::text as deadline,
                        u.full_name as user_name, d.name as dept_name,
                        m.full_name as manager_name
                 FROM task_support_requests sr
                 LEFT JOIN users u ON sr.user_id = u.id
                 LEFT JOIN departments d ON sr.department_id = d.id
                 LEFT JOIN users m ON sr.manager_id = m.id
                 WHERE sr.status = 'pending'
                 ORDER BY sr.created_at DESC`
            );
        } else {
            pending = await db.all(
                `SELECT sr.*, sr.task_date::text as task_date, sr.deadline::text as deadline,
                        u.full_name as user_name, d.name as dept_name
                 FROM task_support_requests sr
                 LEFT JOIN users u ON sr.user_id = u.id
                 LEFT JOIN departments d ON sr.department_id = d.id
                 WHERE sr.manager_id = $1 AND sr.status = 'pending'
                 ORDER BY sr.created_at DESC`,
                [managerId]
            );
        }

        return { pending };
    });

    // QL: Đánh dấu "Đã hỗ trợ"
    fastify.post('/api/task-support/respond/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const requestId = Number(request.params.id);
        const managerId = request.user.id;
        const { note } = request.body || {};

        if (!note || !note.trim()) {
            return reply.code(400).send({ error: 'Vui lòng nhập ghi chú hỗ trợ (bắt buộc)' });
        }

        let sr;
        if (request.user.role === 'giam_doc') {
            sr = await db.get('SELECT * FROM task_support_requests WHERE id = $1', [requestId]);
        } else {
            sr = await db.get('SELECT * FROM task_support_requests WHERE id = $1 AND manager_id = $2', [requestId, managerId]);
        }
        if (!sr) {
            return reply.code(404).send({ error: 'Không tìm thấy yêu cầu hỗ trợ hoặc bạn không có quyền' });
        }
        if (sr.status !== 'pending') {
            return reply.code(400).send({ error: 'Yêu cầu này đã được xử lý' });
        }

        await db.run(
            `UPDATE task_support_requests SET status = 'supported', manager_note = $1, supported_at = NOW() WHERE id = $2`,
            [note.trim(), requestId]
        );

        return { success: true, message: 'Đã đánh dấu hỗ trợ thành công' };
    });

    // NV: Lấy requests của mình (cho hiện status trên card)
    fastify.get('/api/task-support/my-requests', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = Number(request.query.user_id || request.user.id);
        const weekStart = request.query.week_start;
        const weekEnd = request.query.week_end;

        if (!weekStart || !weekEnd) {
            return reply.code(400).send({ error: 'Thiếu week_start/week_end' });
        }

        const requests = await db.all(
            `SELECT sr.*, sr.task_date::text as task_date, sr.deadline::text as deadline,
                    m.full_name as manager_name
             FROM task_support_requests sr
             LEFT JOIN users m ON sr.manager_id = m.id
             WHERE sr.user_id = $1 AND sr.task_date BETWEEN $2 AND $3
             ORDER BY sr.task_date`,
            [userId, weekStart, weekEnd]
        );

        return { requests };
    });

    // ========== AUTO-LOCK CRON — ĐÃ CHUYỂN SANG deadline-checker.js (access_blocked) ==========
    // Logic khóa tài khoản cũ đã được thay thế bằng hệ thống "Chặn Truy Cập" (access_blocked)
    // trong deadline-checker.js. Xem routes/accessBlock.js để biết chi tiết.
    // Giữ setInterval để xử lý expired support requests (không khóa TK nữa)
    setInterval(async () => {
        try {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            // Find expired pending requests — chỉ mark expired, KHÔNG khóa TK
            const expired = await db.all(
                `SELECT sr.id, sr.manager_id, sr.task_name, sr.template_id, sr.user_id,
                        sr.source_type, sr.lock_task_id, sr.task_date::text as task_date,
                        u.full_name as user_name
                 FROM task_support_requests sr
                 LEFT JOIN users u ON sr.user_id = u.id
                 WHERE sr.status = 'pending' AND sr.deadline < $1`,
                [todayStr]
            );

            for (const req of expired) {
                // Get penalty amount from config
                const penaltyConfig = await db.get(
                    'SELECT penalty_amount FROM task_penalty_config WHERE template_id = $1',
                    [req.template_id]
                );
                const penaltyAmount = penaltyConfig ? penaltyConfig.penalty_amount : 0;
                const penaltyReason = `Không hỗ trợ công việc "${req.task_name}" cho nhân viên ${req.user_name} trong thời hạn quy định`;

                // Mark as expired + set penalty (KHÔNG khóa TK)
                await db.run(
                    `UPDATE task_support_requests SET status = 'expired', penalty_amount = $1, penalty_reason = $2 WHERE id = $3`,
                    [penaltyAmount, penaltyReason, req.id]
                );
                // ★ REMOVED: Không còn khóa TK ở đây — deadline-checker.js xử lý access_blocked
                console.log(`⚠️ [TaskSchedule] Expired support request #${req.id}: ${req.task_name} — Fine: ${penaltyAmount.toLocaleString()}đ (KHÔNG khóa TK)`);
            }
        } catch(e) {
            console.error('Auto-lock cron error:', e.message);
        }
    }, 30 * 60 * 1000); // every 30 minutes

    // ========== TASK USER OVERRIDES (GĐ only) ==========

    // GET overrides for a user
    fastify.get('/api/schedule/user-overrides', { preHandler: [authenticate] }, async (req) => {
        const uid = Number(req.query.user_id) || req.user.id;
        const rows = await db.all('SELECT * FROM task_user_overrides WHERE user_id = $1', [uid]);
        return { overrides: rows };
    });

    // POST create/update override — BULK: applies to ALL templates with the same task_name for this user
    fastify.post('/api/schedule/user-override', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được tùy chỉnh' });
        const { user_id, source_type, source_id, custom_points, custom_min_quantity } = req.body;
        if (!user_id || !source_type || !source_id) return reply.code(400).send({ error: 'Thiếu thông tin bắt buộc' });
        if (!['diem', 'khoa'].includes(source_type)) return reply.code(400).send({ error: 'source_type phải là diem hoặc khoa' });

        const cpVal = custom_points != null ? Number(custom_points) : null;
        const cmqVal = custom_min_quantity != null ? Number(custom_min_quantity) : null;

        if (source_type === 'diem') {
            // Find the task_name from the source template
            const srcTemplate = await db.get('SELECT task_name FROM task_point_templates WHERE id = $1', [Number(source_id)]);
            if (!srcTemplate) return reply.code(404).send({ error: 'Template không tồn tại' });

            // Find ALL templates with the same task_name assigned to this user
            const allTemplates = await _getTemplatesForUser(Number(user_id), null);
            const sameNameTemplates = allTemplates.filter(t => t.task_name === srcTemplate.task_name);

            // Bulk upsert overrides for ALL matching templates
            const results = [];
            for (const tpl of sameNameTemplates) {
                // Merge with existing override for this template (preserve fields not being edited)
                const existing = await db.get(
                    'SELECT * FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3',
                    [user_id, 'diem', tpl.id]
                );
                const finalCp = cpVal !== null ? cpVal : (existing?.custom_points ?? null);
                const finalCmq = cmqVal !== null ? cmqVal : (existing?.custom_min_quantity ?? null);

                const row = await db.get(
                    `INSERT INTO task_user_overrides (user_id, source_type, source_id, custom_points, custom_min_quantity, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (user_id, source_type, source_id)
                     DO UPDATE SET custom_points = $4, custom_min_quantity = $5, updated_at = NOW()
                     RETURNING *`,
                    [user_id, 'diem', tpl.id, finalCp, finalCmq, req.user.id]
                );
                results.push(row);
            }
            return { success: true, override: results[0], total_updated: results.length };
        } else {
            // For 'khoa' type — single override (lock tasks don't repeat by name)
            const result = await db.get(
                `INSERT INTO task_user_overrides (user_id, source_type, source_id, custom_points, custom_min_quantity, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (user_id, source_type, source_id)
                 DO UPDATE SET custom_points = $4, custom_min_quantity = $5, updated_at = NOW()
                 RETURNING *`,
                [user_id, source_type, Number(source_id), cpVal, cmqVal, req.user.id]
            );
            return { success: true, override: result };
        }
    });

    // DELETE remove override (restore default) — BULK: removes ALL overrides with same task_name
    fastify.delete('/api/schedule/user-override', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được xóa tùy chỉnh' });
        const { user_id, source_type, source_id } = req.query;
        if (!user_id || !source_type || !source_id) return reply.code(400).send({ error: 'Thiếu thông tin' });

        if (source_type === 'diem') {
            // Find task_name from source template, then delete ALL overrides with same task_name
            const srcTemplate = await db.get('SELECT task_name FROM task_point_templates WHERE id = $1', [Number(source_id)]);
            if (srcTemplate) {
                const allTemplates = await _getTemplatesForUser(Number(user_id), null);
                const sameNameIds = allTemplates.filter(t => t.task_name === srcTemplate.task_name).map(t => t.id);
                if (sameNameIds.length > 0) {
                    const ph = sameNameIds.map((_, i) => `$${i + 3}`).join(',');
                    await db.run(
                        `DELETE FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id IN (${ph})`,
                        [Number(user_id), 'diem', ...sameNameIds]
                    );
                }
            }
        } else {
            await db.run(
                'DELETE FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3',
                [Number(user_id), source_type, Number(source_id)]
            );
        }
        return { success: true };
    });

    // GET all users who have overrides (for sidebar badge)
    fastify.get('/api/schedule/override-users', { preHandler: [authenticate] }, async (req) => {
        const rows = await db.all('SELECT DISTINCT user_id FROM task_user_overrides');
        return { user_ids: rows.map(r => r.user_id) };
    });

    // GET task names with overrides for current user (for sidebar menu badges)
    fastify.get('/api/schedule/my-override-tasks', { preHandler: [authenticate] }, async (req) => {
        const uid = req.user.id;
        const rows = await db.all(
            `SELECT o.source_type, o.source_id, o.custom_points, o.custom_min_quantity,
                    t.task_name, t.points as orig_points, t.min_quantity as orig_min_quantity
             FROM task_user_overrides o
             LEFT JOIN task_point_templates t ON o.source_type = 'diem' AND o.source_id = t.id
             WHERE o.user_id = $1`,
            [uid]
        );
        return { overrides: rows };
    });

    // ========== FORCE APPROVAL NOTIFICATION: pending for designated reviewer ==========
    fastify.get('/api/schedule/force-approval-pending', { preHandler: [authenticate] }, async (request, reply) => {
        const reviewerId = Number(request.query.reviewer_id) || request.user.id;

        // Find users who have this person as force_approval_reviewer_id
        const users = await db.all(
            `SELECT id, full_name FROM users WHERE force_approval_reviewer_id = $1 AND status = 'active'`,
            [reviewerId]
        );
        if (users.length === 0) return { pending: [] };

        const results = [];
        for (const u of users) {
            // Count pending CV Điểm reports
            const diemCount = await db.get(
                `SELECT COUNT(*) as c FROM task_point_reports WHERE user_id = $1 AND status = 'pending'`, [u.id]
            );
            // Count pending CV Khóa
            const khoaCount = await db.get(
                `SELECT COUNT(*) as c FROM lock_task_completions WHERE user_id = $1 AND status = 'pending'`, [u.id]
            );
            // Count pending CV Chuỗi
            const chuoiCount = await db.get(
                `SELECT COUNT(*) as c FROM chain_task_completions WHERE user_id = $1 AND status = 'pending'`, [u.id]
            );
            const total = Number(diemCount?.c || 0) + Number(khoaCount?.c || 0) + Number(chuoiCount?.c || 0);
            if (total > 0) {
                results.push({ user_id: u.id, full_name: u.full_name, count: total });
            }
        }

        return { pending: results };
    });
}

module.exports = taskScheduleRoutes;
