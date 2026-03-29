const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

async function taskScheduleRoutes(fastify, options) {

    // Fix 4: Ensure performance indexes exist
    try {
        await db.run('CREATE INDEX IF NOT EXISTS idx_snapshots_user_date ON daily_task_snapshots(user_id, snapshot_date)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_reports_user_date ON task_point_reports(user_id, report_date)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_reports_status ON task_point_reports(status)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_templates_target ON task_point_templates(target_type, target_id)');
    } catch(e) { /* indexes may already exist */ }

    // Helper: get templates for a user (individual→team fallback, with week_only filter)
    async function _getTemplatesForUser(userId, weekStart) {
        const user = await db.get('SELECT id, department_id FROM users WHERE id = $1', [userId]);
        if (!user) return [];

        // Get individual tasks
        let indivTasks = await db.all(
            'SELECT * FROM task_point_templates WHERE target_type = $1 AND target_id = $2 AND (week_only IS NULL OR week_only = $3) ORDER BY day_of_week, time_start',
            ['individual', userId, weekStart || null]
        );

        // Get team tasks
        let teamTasks = [];
        if (user.department_id) {
            teamTasks = await db.all(
                'SELECT * FROM task_point_templates WHERE target_type = $1 AND target_id = $2 AND (week_only IS NULL OR week_only = $3) ORDER BY day_of_week, time_start',
                ['team', user.department_id, weekStart || null]
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
            members = await db.all(
                `SELECT u.id, u.full_name, u.role, d.name as dept_name, u.department_id
                 FROM users u LEFT JOIN departments d ON u.department_id = d.id
                 WHERE u.department_id = $1 AND u.status = 'active' AND u.id != $2
                 ORDER BY u.full_name`,
                [user.department_id, user.id]
            );
        }

        members = members.filter(m => userIds.includes(m.id) || deptIds.includes(m.department_id));
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
            await db.run(
                `INSERT INTO task_point_reports (template_id, user_id, report_date, report_type, report_value, report_image, quantity, content, status, points_earned)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (template_id, user_id, report_date) DO UPDATE SET
                 report_type = $4, report_value = $5, report_image = $6, quantity = $7, content = $8, status = $9, points_earned = $10`,
                [Number(template_id), request.user.id, report_date, report_type, report_value || null, report_image || null, Number(quantity) || 0, content || null, status, points]
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
        const result = await db.get(
            `SELECT COUNT(*) as c FROM task_point_reports r
             JOIN users u ON r.user_id = u.id
             WHERE r.status = 'pending' AND u.department_id IN (${placeholders}) AND r.user_id != $${deptIds.length + 1}`,
            [...deptIds, userId]
        );

        return { count: Number(result.c) };
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
}

module.exports = taskScheduleRoutes;
