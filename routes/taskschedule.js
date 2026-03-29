const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

async function taskScheduleRoutes(fastify, options) {

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
            'SELECT id, template_id FROM daily_task_snapshots WHERE user_id = $1 AND snapshot_date = $2',
            [userId, dateStr]
        );

        const templates = await _getTemplatesForUser(userId, weekStart);
        const dayTasks = templates.filter(t => t.day_of_week === dayOfWeek);

        if (existing.length > 0) {
            // Check if snapshots match current templates
            const snapTemplateIds = new Set(existing.map(s => s.template_id).filter(Boolean));
            const currTemplateIds = new Set(dayTasks.map(t => t.id));
            const isStale = snapTemplateIds.size !== currTemplateIds.size ||
                [...currTemplateIds].some(id => !snapTemplateIds.has(id));

            if (!isStale) {
                // IDs match, but content may have changed (e.g. library sync updated requirements)
                // Update snapshot content from current templates (safe — doesn't affect reports)
                for (const t of dayTasks) {
                    await db.run(
                        `UPDATE daily_task_snapshots SET input_requirements=$1, output_requirements=$2, guide_url=$3, points=$4, min_quantity=$5, requires_approval=$6, task_name=$7 WHERE user_id=$8 AND snapshot_date=$9 AND template_id=$10`,
                        [t.input_requirements || '[]', t.output_requirements || '[]', t.guide_url, t.points, t.min_quantity, t.requires_approval || false, t.task_name, userId, dateStr, t.id]
                    );
                }
                return;
            }

            // Snapshots are stale — check if any reports exist for this date
            const reports = await db.all(
                'SELECT id FROM task_point_reports WHERE user_id = $1 AND report_date = $2 LIMIT 1',
                [userId, dateStr]
            );
            if (reports.length > 0) return; // has reports, don't touch

            // No reports → safe to regenerate snapshots
            await db.run(
                'DELETE FROM daily_task_snapshots WHERE user_id = $1 AND snapshot_date = $2',
                [userId, dateStr]
            );
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

        const template = await db.get('SELECT * FROM task_point_templates WHERE id = $1', [Number(template_id)]);
        if (!template) return reply.code(404).send({ error: 'Template not found' });

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

    // APPROVE / REJECT a report (manager only)
    fastify.put('/api/schedule/report/:id/approve', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const { action } = request.body || {}; // 'approve' or 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return reply.code(400).send({ error: 'action phải là approve hoặc reject' });
        }

        const report = await db.get(
            `SELECT r.*, t.points as template_points FROM task_point_reports r
             JOIN task_point_templates t ON r.template_id = t.id WHERE r.id = $1`,
            [id]
        );
        if (!report) return reply.code(404).send({ error: 'Report not found' });

        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        const pts = action === 'approve' ? (report.template_points || 0) : 0;

        await db.run(
            'UPDATE task_point_reports SET status = $1, points_earned = $2, approved_by = $3 WHERE id = $4',
            [newStatus, pts, request.user.id, id]
        );

        return { success: true, status: newStatus, points_earned: pts };
    });

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
}

module.exports = taskScheduleRoutes;
