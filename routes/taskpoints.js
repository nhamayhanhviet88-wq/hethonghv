const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

async function taskPointRoutes(fastify, options) {

    // GET all templates for a target (team or individual)
    fastify.get('/api/task-points', { preHandler: [authenticate] }, async (request, reply) => {
        const { target_type, target_id } = request.query;
        if (!target_type || !target_id) return reply.code(400).send({ error: 'Thiếu target_type hoặc target_id' });
        const tasks = await db.all(
            'SELECT * FROM task_point_templates WHERE target_type = ? AND target_id = ? ORDER BY day_of_week, sort_order, time_start',
            [target_type, Number(target_id)]
        );
        return { tasks };
    });

    // CREATE a new task
    fastify.post('/api/task-points', { preHandler: [authenticate] }, async (request, reply) => {
        const { target_type, target_id, day_of_week, task_name, points, min_quantity, time_start, time_end, guide_url, sort_order } = request.body || {};
        if (!target_type || !target_id || !day_of_week || !task_name || !time_start || !time_end) {
            return reply.code(400).send({ error: 'Thiếu thông tin bắt buộc' });
        }
        const result = await db.run(
            `INSERT INTO task_point_templates (target_type, target_id, day_of_week, task_name, points, min_quantity, time_start, time_end, guide_url, sort_order, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [target_type, Number(target_id), Number(day_of_week), task_name, Number(points) || 0, Number(min_quantity) || 1, time_start, time_end, guide_url || null, Number(sort_order) || 0, request.user.id]
        );
        return { success: true, id: result.lastInsertRowid };
    });

    // UPDATE a task
    fastify.put('/api/task-points/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const { task_name, points, min_quantity, time_start, time_end, guide_url, sort_order, day_of_week } = request.body || {};
        await db.run(
            `UPDATE task_point_templates SET task_name=?, points=?, min_quantity=?, time_start=?, time_end=?, guide_url=?, sort_order=?, day_of_week=?, updated_at=NOW() WHERE id=?`,
            [task_name, Number(points) || 0, Number(min_quantity) || 1, time_start, time_end, guide_url || null, Number(sort_order) || 0, Number(day_of_week), id]
        );
        return { success: true };
    });

    // DELETE a task
    fastify.delete('/api/task-points/:id', { preHandler: [authenticate] }, async (request, reply) => {
        await db.run('DELETE FROM task_point_templates WHERE id = ?', [Number(request.params.id)]);
        return { success: true };
    });

    // COPY team template to individual
    fastify.post('/api/task-points/copy-to-individual', { preHandler: [authenticate] }, async (request, reply) => {
        const { team_id, user_id } = request.body || {};
        if (!team_id || !user_id) return reply.code(400).send({ error: 'Thiếu team_id hoặc user_id' });

        // Delete existing individual tasks
        await db.run('DELETE FROM task_point_templates WHERE target_type = ? AND target_id = ?', ['individual', Number(user_id)]);

        // Copy from team
        const teamTasks = await db.all('SELECT * FROM task_point_templates WHERE target_type = ? AND target_id = ?', ['team', Number(team_id)]);
        for (const t of teamTasks) {
            await db.run(
                `INSERT INTO task_point_templates (target_type, target_id, day_of_week, task_name, points, min_quantity, time_start, time_end, guide_url, sort_order, created_by)
                 VALUES ('individual',?,?,?,?,?,?,?,?,?,?)`,
                [Number(user_id), t.day_of_week, t.task_name, t.points, t.min_quantity, t.time_start, t.time_end, t.guide_url, t.sort_order, request.user.id]
            );
        }
        return { success: true, copied: teamTasks.length };
    });

    // GET departments list for dropdown (with template status)
    fastify.get('/api/task-points/departments', { preHandler: [authenticate] }, async (request, reply) => {
        const depts = await db.all("SELECT id, name FROM departments WHERE status = 'active' ORDER BY display_order, name");
        const activeIds = await db.all("SELECT DISTINCT target_id FROM task_point_templates WHERE target_type = 'team'");
        const activeSet = new Set(activeIds.map(r => r.target_id));
        return { departments: depts, active_dept_ids: [...activeSet] };
    });

    // GET users in a department
    fastify.get('/api/task-points/users', { preHandler: [authenticate] }, async (request, reply) => {
        const { department_id } = request.query;
        if (!department_id) return reply.code(400).send({ error: 'Thiếu department_id' });
        const users = await db.all(
            "SELECT id, full_name, role FROM users WHERE department_id = ? AND status = 'active' ORDER BY full_name",
            [Number(department_id)]
        );
        return { users };
    });
}

module.exports = taskPointRoutes;
