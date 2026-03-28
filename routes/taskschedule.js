const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

async function taskScheduleRoutes(fastify, options) {

    // Helper: get templates for a user (individual→team fallback)
    async function _getTemplatesForUser(userId) {
        const user = await db.get('SELECT id, department_id FROM users WHERE id = $1', [userId]);
        if (!user) return [];
        let tasks = await db.all(
            'SELECT * FROM task_point_templates WHERE target_type = $1 AND target_id = $2 ORDER BY day_of_week, time_start',
            ['individual', userId]
        );
        if (tasks.length === 0 && user.department_id) {
            tasks = await db.all(
                'SELECT * FROM task_point_templates WHERE target_type = $1 AND target_id = $2 ORDER BY day_of_week, time_start',
                ['team', user.department_id]
            );
        }
        return tasks;
    }

    // Helper: ensure snapshots exist for a user + date
    async function _ensureSnapshots(userId, dateStr, dayOfWeek) {
        const existing = await db.all(
            'SELECT id FROM daily_task_snapshots WHERE user_id = $1 AND snapshot_date = $2 LIMIT 1',
            [userId, dateStr]
        );
        if (existing.length > 0) return; // already snapshotted

        const templates = await _getTemplatesForUser(userId);
        const dayTasks = templates.filter(t => t.day_of_week === dayOfWeek);
        for (const t of dayTasks) {
            await db.run(
                `INSERT INTO daily_task_snapshots (user_id, snapshot_date, template_id, day_of_week, task_name, points, min_quantity, time_start, time_end, guide_url, requires_approval)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
                [userId, dateStr, t.id, t.day_of_week, t.task_name, t.points, t.min_quantity, t.time_start, t.time_end, t.guide_url, t.requires_approval || false]
            );
        }
    }

    // GET weekly tasks with snapshot logic
    // Past+today → snapshots (auto-create if needed), future → live templates
    fastify.get('/api/schedule/week-tasks', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, week_start } = request.query;
        const uid = Number(user_id) || request.user.id;

        if (!week_start) return reply.code(400).send({ error: 'Thiếu week_start' });

        const today = new Date(); today.setHours(0,0,0,0);
        const todayStr = today.toISOString().slice(0,10);
        const monDate = new Date(week_start + 'T00:00:00');

        // Get templates for future days
        const templates = await _getTemplatesForUser(uid);

        let allTasks = [];

        for (let d = 0; d < 7; d++) {
            const colDate = new Date(monDate);
            colDate.setDate(monDate.getDate() + d);
            const dateStr = colDate.toISOString().slice(0,10);
            const jsDow = colDate.getDay(); // 0=Sun
            const dayOfWeek = jsDow === 0 ? 7 : jsDow; // 1=Mon..7=Sun

            if (dateStr <= todayStr) {
                // Past or today → use snapshots
                await _ensureSnapshots(uid, dateStr, dayOfWeek);
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
            `SELECT r.*, t.task_name, t.points as template_points, t.requires_approval
             FROM task_point_reports r
             JOIN task_point_templates t ON r.template_id = t.id
             WHERE r.user_id = $1 AND r.report_date BETWEEN $2 AND $3
             ORDER BY r.report_date, t.time_start`,
            [uid, from, to]
        );

        return { reports };
    });

    // SUBMIT a report (link or image)
    fastify.post('/api/schedule/report', { preHandler: [authenticate] }, async (request, reply) => {
        const contentType = request.headers['content-type'] || '';

        let template_id, report_date, report_type, report_value;

        if (contentType.includes('multipart')) {
            // Image upload
            const data = await request.file();
            if (!data) return reply.code(400).send({ error: 'Không có file' });

            template_id = data.fields.template_id?.value;
            report_date = data.fields.report_date?.value;
            report_type = 'image';

            // Save file
            const ext = path.extname(data.filename) || '.jpg';
            const fileName = `report_${request.user.id}_${Date.now()}${ext}`;
            const uploadDir = path.join(__dirname, '..', 'uploads', 'reports');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            const filePath = path.join(uploadDir, fileName);
            const writeStream = fs.createWriteStream(filePath);
            await data.file.pipe(writeStream);
            await new Promise((resolve, reject) => { writeStream.on('finish', resolve); writeStream.on('error', reject); });

            report_value = `/uploads/reports/${fileName}`;
        } else {
            // JSON body — link
            const body = request.body || {};
            template_id = body.template_id;
            report_date = body.report_date;
            report_type = 'link';
            report_value = body.report_value;
        }

        if (!template_id || !report_date || !report_value) {
            return reply.code(400).send({ error: 'Thiếu thông tin bắt buộc' });
        }

        // Get template info
        const template = await db.get('SELECT * FROM task_point_templates WHERE id = $1', [Number(template_id)]);
        if (!template) return reply.code(404).send({ error: 'Template not found' });

        const status = template.requires_approval ? 'pending' : 'approved';
        const points = template.requires_approval ? 0 : (template.points || 0);

        try {
            await db.run(
                `INSERT INTO task_point_reports (template_id, user_id, report_date, report_type, report_value, status, points_earned)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (template_id, user_id, report_date) DO UPDATE SET
                 report_type = $4, report_value = $5, status = $6, points_earned = $7`,
                [Number(template_id), request.user.id, report_date, report_type, report_value, status, points]
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
            `SELECT report_date, SUM(points_earned) as total_points, COUNT(*) as report_count
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
