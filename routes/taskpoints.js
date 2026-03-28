const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

async function taskPointRoutes(fastify, options) {

    // GET all templates for a target (team or individual)
    // Optional: ?week_start=YYYY-MM-DD to filter week_only templates
    fastify.get('/api/task-points', { preHandler: [authenticate] }, async (request, reply) => {
        const { target_type, target_id, week_start } = request.query;
        if (!target_type || !target_id) return reply.code(400).send({ error: 'Thiếu target_type hoặc target_id' });
        const tasks = await db.all(
            `SELECT * FROM task_point_templates WHERE target_type = ? AND target_id = ? AND (week_only IS NULL OR week_only = ?) ORDER BY day_of_week, sort_order, time_start`,
            [target_type, Number(target_id), week_start || null]
        );
        return { tasks };
    });

    // GET merged view: team tasks + individual tasks for a specific user
    fastify.get('/api/task-points/individual', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, week_start } = request.query;
        if (!user_id) return reply.code(400).send({ error: 'Thiếu user_id' });

        const user = await db.get('SELECT id, department_id FROM users WHERE id = ?', [Number(user_id)]);
        if (!user) return reply.code(404).send({ error: 'Không tìm thấy user' });

        // Team tasks (read-only, _source='team')
        let teamTasks = [];
        if (user.department_id) {
            teamTasks = await db.all(
                `SELECT *, 'team' as _source FROM task_point_templates WHERE target_type = 'team' AND target_id = ? AND (week_only IS NULL OR week_only = ?) ORDER BY day_of_week, sort_order, time_start`,
                [user.department_id, week_start || null]
            );
        }

        // Individual tasks (_source='individual')
        const indivTasks = await db.all(
            `SELECT *, 'individual' as _source FROM task_point_templates WHERE target_type = 'individual' AND target_id = ? AND (week_only IS NULL OR week_only = ?) ORDER BY day_of_week, sort_order, time_start`,
            [Number(user_id), week_start || null]
        );

        return { tasks: [...teamTasks, ...indivTasks] };
    });

    // CREATE a new task
    fastify.post('/api/task-points', { preHandler: [authenticate] }, async (request, reply) => {
        const { target_type, target_id, day_of_week, task_name, points, min_quantity, time_start, time_end, guide_url, sort_order, requires_approval, week_only } = request.body || {};
        if (!target_type || !target_id || !day_of_week || !task_name || !time_start || !time_end) {
            return reply.code(400).send({ error: 'Thiếu thông tin bắt buộc' });
        }
        // Only giam_doc can create fixed (non-week_only) tasks in schedule
        if (!week_only && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được tạo CV cố định vào lịch' });
        }
        const result = await db.run(
            `INSERT INTO task_point_templates (target_type, target_id, day_of_week, task_name, points, min_quantity, time_start, time_end, guide_url, sort_order, requires_approval, week_only, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [target_type, Number(target_id), Number(day_of_week), task_name, Number(points) || 0, Number(min_quantity) || 1, time_start, time_end, guide_url || null, Number(sort_order) || 0, requires_approval ? true : false, week_only || null, request.user.id]
        );
        return { success: true, id: result.lastInsertRowid };
    });

    // UPDATE a task
    fastify.put('/api/task-points/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const { task_name, points, min_quantity, time_start, time_end, guide_url, sort_order, day_of_week, requires_approval, week_only } = request.body || {};
        // Only giam_doc can edit fixed tasks
        const existing = await db.get('SELECT week_only FROM task_point_templates WHERE id = ?', [id]);
        if (existing && !existing.week_only && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được sửa CV cố định' });
        }
        await db.run(
            `UPDATE task_point_templates SET task_name=?, points=?, min_quantity=?, time_start=?, time_end=?, guide_url=?, sort_order=?, day_of_week=?, requires_approval=?, week_only=?, updated_at=NOW() WHERE id=?`,
            [task_name, Number(points) || 0, Number(min_quantity) || 1, time_start, time_end, guide_url || null, Number(sort_order) || 0, Number(day_of_week), requires_approval ? true : false, week_only || null, id]
        );
        return { success: true };
    });

    // DELETE a task
    fastify.delete('/api/task-points/:id', { preHandler: [authenticate] }, async (request, reply) => {
        // Only giam_doc can delete fixed tasks
        const existing = await db.get('SELECT week_only FROM task_point_templates WHERE id = ?', [Number(request.params.id)]);
        if (existing && !existing.week_only && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được xóa CV cố định' });
        }
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
                `INSERT INTO task_point_templates (target_type, target_id, day_of_week, task_name, points, min_quantity, time_start, time_end, guide_url, sort_order, requires_approval, created_by)
                 VALUES ('individual',?,?,?,?,?,?,?,?,?,?,?)`,
                [Number(user_id), t.day_of_week, t.task_name, t.points, t.min_quantity, t.time_start, t.time_end, t.guide_url, t.sort_order, t.requires_approval || false, request.user.id]
            );
        }
        return { success: true, copied: teamTasks.length };
    });

    // GET departments list for dropdown (with template status)
    fastify.get('/api/task-points/departments', { preHandler: [authenticate] }, async (request, reply) => {
        const depts = await db.all("SELECT id, name, parent_id, display_order FROM departments WHERE status = 'active' ORDER BY display_order, name");
        const activeIds = await db.all("SELECT DISTINCT target_id FROM task_point_templates WHERE target_type = 'team'");
        const activeSet = new Set(activeIds.map(r => r.target_id));
        return { departments: depts, active_dept_ids: [...activeSet] };
    });

    // GET users in a department (with username for search)
    fastify.get('/api/task-points/users', { preHandler: [authenticate] }, async (request, reply) => {
        const { department_id } = request.query;
        if (!department_id) return reply.code(400).send({ error: 'Thiếu department_id' });
        const users = await db.all(
            "SELECT id, full_name, username, role FROM users WHERE department_id = ? AND status = 'active' ORDER BY full_name",
            [Number(department_id)]
        );
        return { users };
    });

    // ===== KHO CÔNG VIỆC (TASK LIBRARY) =====

    // Helper: get all ancestor department IDs (recursive via parent_id)
    async function _getAncestorDeptIds(deptId) {
        const ids = [];
        let currentId = deptId;
        const visited = new Set(); // prevent infinite loop
        while (currentId && !visited.has(currentId)) {
            visited.add(currentId);
            const dept = await db.get('SELECT id, parent_id FROM departments WHERE id = $1', [currentId]);
            if (!dept || !dept.parent_id) break;
            ids.push(dept.parent_id);
            currentId = dept.parent_id;
        }
        return ids;
    }

    // GET all library tasks (optionally filter by department_id)
    // ?include_ancestors=true → also include tasks from parent departments
    fastify.get('/api/task-library', { preHandler: [authenticate] }, async (request, reply) => {
        const { department_id, include_ancestors } = request.query;
        let tasks;
        if (department_id) {
            if (include_ancestors === 'true') {
                // Get ancestor chain: team → parent dept → grandparent → ...
                const ancestorIds = await _getAncestorDeptIds(Number(department_id));
                const allDeptIds = [Number(department_id), ...ancestorIds];
                const placeholders = allDeptIds.map((_, i) => `$${i + 1}`).join(',');
                tasks = await db.all(
                    `SELECT tl.*, d.name as dept_name FROM task_library tl LEFT JOIN departments d ON tl.department_id = d.id WHERE tl.department_id IN (${placeholders}) ORDER BY d.name, tl.task_name`,
                    allDeptIds
                );
            } else {
                tasks = await db.all(
                    'SELECT tl.*, d.name as dept_name FROM task_library tl LEFT JOIN departments d ON tl.department_id = d.id WHERE tl.department_id = $1 ORDER BY tl.task_name',
                    [Number(department_id)]
                );
            }
        } else {
            tasks = await db.all(
                'SELECT tl.*, d.name as dept_name FROM task_library tl LEFT JOIN departments d ON tl.department_id = d.id ORDER BY d.name, tl.task_name'
            );
        }
        return { tasks };
    });

    // CREATE a library task
    fastify.post('/api/task-library', { preHandler: [authenticate] }, async (request, reply) => {
        const { task_name, points, min_quantity, guide_url, requires_approval, department_id, is_weekly } = request.body || {};
        if (!task_name) return reply.code(400).send({ error: 'Thiếu tên công việc' });
        // Only giam_doc can create fixed (non-weekly) tasks
        if (!is_weekly && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được tạo CV cố định' });
        }
        const result = await db.run(
            `INSERT INTO task_library (task_name, points, min_quantity, guide_url, requires_approval, department_id, is_weekly, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [task_name, Number(points) || 0, Number(min_quantity) || 1, guide_url || null, requires_approval ? true : false, department_id ? Number(department_id) : null, is_weekly ? true : false, request.user.id]
        );
        return { success: true, id: result.lastInsertRowid };
    });

    // UPDATE a library task
    fastify.put('/api/task-library/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const { task_name, points, min_quantity, guide_url, requires_approval, department_id, is_weekly } = request.body || {};
        // Check if target task is fixed — only giam_doc can edit
        const existing = await db.get('SELECT is_weekly FROM task_library WHERE id = $1', [Number(request.params.id)]);
        if (existing && !existing.is_weekly && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được sửa CV cố định' });
        }
        await db.run(
            `UPDATE task_library SET task_name=$1, points=$2, min_quantity=$3, guide_url=$4, requires_approval=$5, department_id=$6, is_weekly=$7 WHERE id=$8`,
            [task_name, Number(points) || 0, Number(min_quantity) || 1, guide_url || null, requires_approval ? true : false, department_id ? Number(department_id) : null, is_weekly ? true : false, Number(request.params.id)]
        );
        return { success: true };
    });

    // DELETE a library task
    fastify.delete('/api/task-library/:id', { preHandler: [authenticate] }, async (request, reply) => {
        // Check if target task is fixed — only giam_doc can delete
        const existing = await db.get('SELECT is_weekly FROM task_library WHERE id = $1', [Number(request.params.id)]);
        if (existing && !existing.is_weekly && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được xóa CV cố định' });
        }
        await db.run('DELETE FROM task_library WHERE id = $1', [Number(request.params.id)]);
        return { success: true };
    });

    // ===== HOLIDAYS =====

    // GET all holidays (optionally filter by year)
    fastify.get('/api/holidays', { preHandler: [authenticate] }, async (request, reply) => {
        const year = request.query.year || new Date().getFullYear();
        const holidays = await db.all(
            "SELECT * FROM holidays WHERE EXTRACT(YEAR FROM holiday_date) = $1 ORDER BY holiday_date",
            [Number(year)]
        );
        return { holidays };
    });

    // GET holidays for a specific week (given any date in that week)
    fastify.get('/api/holidays/week', { preHandler: [authenticate] }, async (request, reply) => {
        const { date } = request.query; // e.g. 2026-03-28
        if (!date) return reply.code(400).send({ error: 'Thiếu date' });
        // Calculate Mon-Sat of that week
        const d = new Date(date);
        const dayOfWeek = d.getDay(); // 0=Sun,1=Mon...6=Sat
        const mon = new Date(d);
        mon.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        const monStr = mon.toISOString().slice(0, 10);
        const sunStr = sun.toISOString().slice(0, 10);
        const holidays = await db.all(
            "SELECT * FROM holidays WHERE holiday_date BETWEEN $1 AND $2 ORDER BY holiday_date",
            [monStr, sunStr]
        );
        // Map: day_of_week (1=Mon..6=Sat) => holiday_name
        const map = {};
        holidays.forEach(h => {
            const hd = new Date(h.holiday_date);
            const dow = hd.getDay(); // 0=Sun
            const mapped = dow === 0 ? 7 : dow; // 1=Mon..6=Sat,7=Sun
            if (mapped >= 1 && mapped <= 7) map[mapped] = h.holiday_name;
        });
        return { holidays: map, week_start: monStr, week_end: sunStr };
    });

    // CREATE a holiday
    fastify.post('/api/holidays', { preHandler: [authenticate] }, async (request, reply) => {
        const { holiday_date, holiday_name } = request.body || {};
        if (!holiday_date || !holiday_name) return reply.code(400).send({ error: 'Thiếu thông tin' });
        try {
            await db.run(
                "INSERT INTO holidays (holiday_date, holiday_name, created_by) VALUES ($1, $2, $3)",
                [holiday_date, holiday_name, request.user.id]
            );
            return { success: true };
        } catch(e) {
            return reply.code(409).send({ error: 'Ngày này đã tồn tại' });
        }
    });

    // DELETE a holiday
    fastify.delete('/api/holidays/:id', { preHandler: [authenticate] }, async (request, reply) => {
        await db.run('DELETE FROM holidays WHERE id = $1', [Number(request.params.id)]);
        return { success: true };
    });
}

module.exports = taskPointRoutes;
