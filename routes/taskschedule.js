const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

async function taskScheduleRoutes(fastify, options) {

    // GET my weekly tasks (NV: own schedule with individual→team fallback)
    fastify.get('/api/schedule/my-tasks', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const deptId = request.user.department_id;

        // Try individual templates first
        let tasks = await db.all(
            'SELECT * FROM task_point_templates WHERE target_type = $1 AND target_id = $2 ORDER BY day_of_week, time_start',
            ['individual', userId]
        );

        // Fallback to team templates
        if (tasks.length === 0 && deptId) {
            tasks = await db.all(
                'SELECT * FROM task_point_templates WHERE target_type = $1 AND target_id = $2 ORDER BY day_of_week, time_start',
                ['team', deptId]
            );
        }

        return { tasks, source: tasks.length > 0 ? (tasks[0]?.target_type || 'none') : 'none' };
    });

    // GET team members for manager (truong_phong sees own team, quan_ly/giam_doc sees managed teams)
    fastify.get('/api/schedule/team-members', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        let members = [];

        if (['giam_doc', 'quan_ly', 'trinh'].includes(user.role)) {
            // All staff in all departments
            members = await db.all(
                `SELECT u.id, u.full_name, u.role, d.name as dept_name, u.department_id
                 FROM users u LEFT JOIN departments d ON u.department_id = d.id
                 WHERE u.status = 'active' AND u.role NOT IN ('giam_doc')
                 ORDER BY d.name, u.full_name`
            );
        } else if (user.role === 'truong_phong') {
            // Staff in same department
            members = await db.all(
                `SELECT u.id, u.full_name, u.role, d.name as dept_name, u.department_id
                 FROM users u LEFT JOIN departments d ON u.department_id = d.id
                 WHERE u.department_id = $1 AND u.status = 'active' AND u.id != $2
                 ORDER BY u.full_name`,
                [user.department_id, user.id]
            );
        }

        return { members };
    });

    // GET user tasks (manager viewing a specific user)
    fastify.get('/api/schedule/user-tasks', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id } = request.query;
        if (!user_id) return reply.code(400).send({ error: 'Thiếu user_id' });

        const targetUser = await db.get('SELECT id, department_id FROM users WHERE id = $1', [Number(user_id)]);
        if (!targetUser) return reply.code(404).send({ error: 'User not found' });

        // Individual first, then team fallback
        let tasks = await db.all(
            'SELECT * FROM task_point_templates WHERE target_type = $1 AND target_id = $2 ORDER BY day_of_week, time_start',
            ['individual', Number(user_id)]
        );
        if (tasks.length === 0 && targetUser.department_id) {
            tasks = await db.all(
                'SELECT * FROM task_point_templates WHERE target_type = $1 AND target_id = $2 ORDER BY day_of_week, time_start',
                ['team', targetUser.department_id]
            );
        }

        return { tasks };
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
