const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { calculateRealDeadline, toDateStr, toLocalTimestamp } = require('./deadline-checker');

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
    // Smart sync: if templates changed and no reports filed yet, regenerate snapshots
    async function _ensureSnapshots(userId, dateStr, dayOfWeek, weekStart) {
        const existing = await db.all(
            'SELECT id, template_id, task_name, time_start FROM daily_task_snapshots WHERE user_id = $1 AND snapshot_date = $2',
            [userId, dateStr]
        );

        const templates = await _getTemplatesForUser(userId, weekStart);
        const dayTasks = templates.filter(t => t.day_of_week === dayOfWeek);

        if (existing.length > 0) {
            // Fix null template_ids first: match by task_name + time_start
            const hasNulls = existing.some(s => !s.template_id);
            if (hasNulls) {
                for (const snap of existing) {
                    if (snap.template_id) continue; // already has valid id
                    // Find matching template by task_name + time_start
                    const match = dayTasks.find(t => t.task_name === snap.task_name && t.time_start === snap.time_start);
                    if (match) {
                        await db.run(
                            'UPDATE daily_task_snapshots SET template_id = $1 WHERE id = $2',
                            [match.id, snap.id]
                        );
                        snap.template_id = match.id; // update in-memory too
                    } else {
                        // Try matching by task_name only (time may differ slightly)
                        const nameMatch = dayTasks.find(t => t.task_name === snap.task_name);
                        if (nameMatch) {
                            await db.run(
                                'UPDATE daily_task_snapshots SET template_id = $1 WHERE id = $2',
                                [nameMatch.id, snap.id]
                            );
                            snap.template_id = nameMatch.id;
                        }
                    }
                }
            }

            // Check if snapshots match current templates
            const snapTemplateIds = new Set(existing.map(s => s.template_id).filter(Boolean));
            const currTemplateIds = new Set(dayTasks.map(t => t.id));

            // Update existing snapshots that match current templates (refresh content)
            for (const t of dayTasks) {
                if (snapTemplateIds.has(t.id)) {
                    await db.run(
                        `UPDATE daily_task_snapshots SET input_requirements=$1, output_requirements=$2, guide_url=$3, points=$4, min_quantity=$5, requires_approval=$6, task_name=$7 WHERE user_id=$8 AND snapshot_date=$9 AND template_id=$10`,
                        [t.input_requirements || '[]', t.output_requirements || '[]', t.guide_url, t.points, t.min_quantity, t.requires_approval || false, t.task_name, userId, dateStr, t.id]
                    );
                }
            }

            // ADDITIVE: only add new templates not yet in snapshots (never delete old ones)
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

        // Create fresh snapshots from current templates
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

        // Run ALL queries in parallel
        const templates = await _getTemplatesForUser(uid, week_start);

        const [reportsResult, weeklySummary, monthlySummary, weekHolidays, yearHolidays] = await Promise.all([
            // Reports
            db.all(
                `SELECT r.*, r.report_date::text as report_date, t.task_name, t.points as template_points, t.requires_approval
                 FROM task_point_reports r LEFT JOIN task_point_templates t ON r.template_id = t.id
                 WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3 ORDER BY r.report_date`,
                [uid, monStr, sunStr]
            ),
            // Weekly summary
            db.all(
                `SELECT report_date::text as report_date, SUM(points_earned) as total_points, COUNT(*) as report_count
                 FROM task_point_reports WHERE user_id = $1 AND report_date BETWEEN $2 AND $3 AND status = 'approved'
                 GROUP BY report_date ORDER BY report_date`,
                [uid, monStr, sunStr]
            ),
            // Monthly summary
            db.all(
                `SELECT report_date::text as report_date, SUM(points_earned) as total_points, COUNT(*) as report_count
                 FROM task_point_reports WHERE user_id = $1 AND report_date BETWEEN $2 AND $3 AND status = 'approved'
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
            )
        ]);

        // Build tasks (snapshot logic — inline)
        let allTasks = [];
        for (let d = 0; d < 7; d++) {
            const colDate = new Date(monDate);
            colDate.setDate(monDate.getDate() + d);
            const dateStr = _localDateStr(colDate);
            const jsDow = colDate.getDay();
            const dayOfWeek = jsDow === 0 ? 7 : jsDow;

            if (dateStr <= todayStr) {
                await _ensureSnapshots(uid, dateStr, dayOfWeek, week_start);
                const snaps = await db.all(
                    'SELECT * FROM daily_task_snapshots WHERE user_id = $1 AND snapshot_date = $2 ORDER BY time_start',
                    [uid, dateStr]
                );
                snaps.forEach(s => { allTasks.push({ ...s, _source: 'snapshot', _date: dateStr }); });
            } else {
                const dayTasks = templates.filter(t => t.day_of_week === dayOfWeek);
                dayTasks.forEach(t => { allTasks.push({ ...t, _source: 'template', _date: dateStr }); });
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

        return {
            tasks: allTasks,
            reports: reportsResult,
            weekly_summary: weeklySummary,
            monthly_summary: monthlySummary,
            holidays_week: holidayMap,
            holidays_year: yearHolidays,
            month_start: monthStart,
            month_end: monthEnd
        };
    });

    fastify.get('/api/schedule/week-tasks', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, week_start } = request.query;
        const uid = Number(user_id) || request.user.id;

        if (!week_start) return reply.code(400).send({ error: 'Thiếu week_start' });

        const today = new Date(); today.setHours(0,0,0,0);
        const todayStr = _localDateStr(today);
        const monDate = new Date(week_start + 'T00:00:00');

        // Get templates for future days
        const templates = await _getTemplatesForUser(uid, week_start);

        let allTasks = [];

        for (let d = 0; d < 7; d++) {
            const colDate = new Date(monDate);
            colDate.setDate(monDate.getDate() + d);
            const dateStr = _localDateStr(colDate);
            const jsDow = colDate.getDay(); // 0=Sun
            const dayOfWeek = jsDow === 0 ? 7 : jsDow; // 1=Mon..7=Sun

            if (dateStr <= todayStr) {
                // Past or today → use snapshots
                await _ensureSnapshots(uid, dateStr, dayOfWeek, week_start);
                const snaps = await db.all(
                    'SELECT * FROM daily_task_snapshots WHERE user_id = $1 AND snapshot_date = $2 ORDER BY time_start',
                    [uid, dateStr]
                );
                // Add snapshot data with _date field for frontend
                snaps.forEach(s => {
                    allTasks.push({ ...s, _source: 'snapshot', _date: dateStr });
                });
            } else {
                // Future → live templates
                const dayTasks = templates.filter(t => t.day_of_week === dayOfWeek);
                dayTasks.forEach(t => {
                    allTasks.push({ ...t, _source: 'template', _date: dateStr });
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

        if (['giam_doc', 'quan_ly', 'trinh'].includes(user.role)) {
            members = await db.all(
                `SELECT u.id, u.full_name, u.role, d.name as dept_name, u.department_id
                 FROM users u LEFT JOIN departments d ON u.department_id = d.id
                 WHERE u.status = 'active' AND u.role NOT IN ('giam_doc')
                 ORDER BY d.name, u.full_name`
            );
        } else if (user.role === 'truong_phong') {
            // Get all departments where this user is head + own department + children
            const headDepts = await db.all('SELECT id FROM departments WHERE head_user_id = $1 AND status = $2', [user.id, 'active']);
            const allDeptIds = new Set();
            const queue = headDepts.map(d => d.id);
            if (user.department_id) queue.push(user.department_id);
            while (queue.length > 0) {
                const dId = queue.shift();
                if (allDeptIds.has(dId)) continue;
                allDeptIds.add(dId);
                const children = await db.all('SELECT id FROM departments WHERE parent_id = $1 AND status = $2', [dId, 'active']);
                children.forEach(c => queue.push(c.id));
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
        
        // Include head_user_id users in their managed departments
        const deptsWithHeads = await db.all(
            "SELECT d.id, d.name, d.head_user_id FROM departments d WHERE d.head_user_id IS NOT NULL AND d.status = 'active'"
        );
        for (const dept of deptsWithHeads) {
            const alreadyInDept = members.some(m => m.id === dept.head_user_id && m.dept_name === dept.name);
            if (!alreadyInDept) {
                const headUser = await db.get(
                    "SELECT id, full_name, role, department_id FROM users WHERE id = $1 AND status = 'active'",
                    [dept.head_user_id]
                );
                if (headUser) {
                    members.push({
                        id: headUser.id,
                        full_name: headUser.full_name,
                        role: headUser.role,
                        dept_name: dept.name,
                        department_id: headUser.department_id,
                        _is_dept_head: true
                    });
                }
            }
        }
        
        return { members };
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

            // Save image if present
            if (fileBuffer && fileBuffer.length > 0) {
                const fileName = `report_${request.user.id}_${Date.now()}${fileExt}`;
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
        const todayLocal = _localDateStr(new Date());
        const isManagerRole = ['giam_doc','quan_ly','truong_phong'].includes(request.user.role);
        if (report_date !== todayLocal && !isManagerRole) {
            return reply.code(403).send({ error: 'Chỉ được phép báo cáo ngày hôm nay. Liên hệ Quản lý để được báo cáo bù.' });
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

        const status = template.requires_approval ? 'pending' : 'approved';
        const points = template.requires_approval ? 0 : (template.points || 0);

        try {
            // Calculate approval deadline if pending
            let approvalDeadline = null;
            if (status === 'pending') {
                try {
                    approvalDeadline = toLocalTimestamp(await calculateRealDeadline(new Date(), null));
                } catch(e2) { /* fallback: no deadline */ }
            }

            await db.run(
                `INSERT INTO task_point_reports (template_id, user_id, report_date, report_type, report_value, report_image, quantity, content, status, points_earned, approval_deadline)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 ON CONFLICT (template_id, user_id, report_date) DO UPDATE SET
                 report_type = $4, report_value = $5, report_image = $6, quantity = $7, content = $8, status = $9, points_earned = $10, approval_deadline = $11`,
                [Number(template_id), request.user.id, report_date, report_type, report_value || null, report_image || null, Number(quantity) || 0, content || null, status, points, approvalDeadline]
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

    // ========== HELPER: Check if user can approve for a department (cascade up) ==========
    async function _canApproveForDept(userId, deptId) {
        // Giám đốc auto-approve all
        const u = await db.get('SELECT role FROM users WHERE id = $1', [userId]);
        if (u && u.role === 'giam_doc') return true;

        // Check direct assignment
        const direct = await db.get('SELECT id FROM task_approvers WHERE user_id = $1 AND department_id = $2', [userId, deptId]);
        if (direct) return true;

        // Check cascade: if assigned to parent department
        const dept = await db.get('SELECT parent_id FROM departments WHERE id = $1', [deptId]);
        if (dept && dept.parent_id) {
            return _canApproveForDept(userId, dept.parent_id);
        }
        return false;
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
        await db.run('DELETE FROM task_approvers WHERE id = $1', [Number(request.params.id)]);
        return { success: true };
    });

    // ========== PENDING APPROVALS ==========

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
            const assigned = await db.all('SELECT department_id FROM task_approvers WHERE user_id = $1', [userId]);
            const directIds = assigned.map(a => a.department_id);
            // Expand: include child departments (cascade)
            for (const did of directIds) {
                deptIds.push(did);
                const children = await db.all('SELECT id FROM departments WHERE parent_id = $1', [did]);
                children.forEach(c => { if (!deptIds.includes(c.id)) deptIds.push(c.id); });
                // 3rd level (grandchildren)
                for (const child of children) {
                    const grandchildren = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
                    grandchildren.forEach(gc => { if (!deptIds.includes(gc.id)) deptIds.push(gc.id); });
                }
            }
        }

        if (deptIds.length === 0) return { pending: [], redo: [] };

        const placeholders = deptIds.map((_, i) => `$${i + 1}`).join(',');

        // Pending reports (status = 'pending') from users in these departments
        const pending = await db.all(
            `SELECT r.id, r.template_id, r.user_id, r.report_date::text as report_date, r.report_type, r.report_value, r.report_image, r.quantity, r.content, r.status, r.redo_count,
                    r.approval_deadline, r.created_at,
                    t.task_name, t.points as template_points, t.requires_approval,
                    u.full_name as user_name, u.username
             FROM task_point_reports r
             JOIN task_point_templates t ON r.template_id = t.id
             JOIN users u ON r.user_id = u.id
             WHERE r.status = 'pending' AND u.department_id IN (${placeholders}) AND r.user_id != $${deptIds.length + 1}
             ORDER BY r.report_date DESC, u.full_name`,
            [...deptIds, userId]
        );

        // Redo reports (status = 'rejected' but still within deadline — waiting for resubmission)
        // Actually these are just info for the manager — the NV needs to fix them

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
            const assigned = await db.all('SELECT department_id FROM task_approvers WHERE user_id = $1', [userId]);
            const directIds = assigned.map(a => a.department_id);
            for (const did of directIds) {
                deptIds.push(did);
                const children = await db.all('SELECT id FROM departments WHERE parent_id = $1', [did]);
                children.forEach(c => { if (!deptIds.includes(c.id)) deptIds.push(c.id); });
                for (const child of children) {
                    const gc = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
                    gc.forEach(g => { if (!deptIds.includes(g.id)) deptIds.push(g.id); });
                }
            }
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
            supportCount = await db.get(
                `SELECT COUNT(*) as c FROM task_support_requests
                 WHERE status = 'pending' AND (manager_id = $1 OR manager_id IN (
                     SELECT id FROM users WHERE department_id IN (${placeholders})
                 ))`,
                [userId, ...deptIds]
            );
        }

        const total = Number(reportCount.c) + Number(supportCount.c);
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

        // Check permission
        const canApprove = await _canApproveForDept(request.user.id, report.department_id);
        if (!canApprove) return reply.code(403).send({ error: 'Bạn không có quyền duyệt phòng này' });

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

        const { report_value, report_image, quantity, content } = request.body;
        const hasLink = report_value && report_value.trim();
        const hasImage = !!report_image;
        if (!hasLink && !hasImage) return reply.code(400).send({ error: 'Phải có link hoặc hình ảnh' });

        const report_type = hasLink && hasImage ? 'both' : (hasLink ? 'link' : 'image');

        await db.run(
            `UPDATE task_point_reports SET status = 'pending', report_type = $1, report_value = $2, report_image = $3, quantity = $4, content = $5, redo_count = redo_count + 1, reject_reason = NULL WHERE id = $6`,
            [report_type, report_value || null, report_image || null, Number(quantity) || 0, content || null, id]
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

        return {
            user_info: userInfo,
            templates,
            reports,
            snapshots,
            holidays,
            month,
            from_date: fromDate,
            to_date: toDate
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

    // ========== AUTO-LOCK CRON (check every 30 min) ==========
    setInterval(async () => {
        try {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            // Find expired pending requests
            const expired = await db.all(
                `SELECT sr.id, sr.manager_id, sr.task_name, sr.template_id, sr.user_id, u.full_name as user_name
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

                // Mark as expired + set penalty
                await db.run(
                    `UPDATE task_support_requests SET status = 'expired', penalty_amount = $1, penalty_reason = $2 WHERE id = $3`,
                    [penaltyAmount, penaltyReason, req.id]
                );
                // Lock manager account
                await db.run("UPDATE users SET status = 'locked' WHERE id = $1 AND status = 'active'", [req.manager_id]);
                console.log(`🔒 Auto-locked manager ${req.manager_id} for not supporting task "${req.task_name}" for ${req.user_name} — Fine: ${penaltyAmount.toLocaleString()}đ`);
            }
        } catch(e) {
            console.error('Auto-lock cron error:', e.message);
        }
    }, 30 * 60 * 1000); // every 30 minutes
}

module.exports = taskScheduleRoutes;
