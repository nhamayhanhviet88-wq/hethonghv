const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const DAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

async function taskPointRoutes(fastify, options) {

    // Ensure active teams registry table exists
    await db.run(`CREATE TABLE IF NOT EXISTS task_schedule_active_teams (
        team_id INTEGER PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW()
    )`);

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

        // Filter out exempted team tasks
        const exemptions = await db.all(
            `SELECT template_id, exempt_type, week_start FROM task_exemptions WHERE user_id = ?`,
            [Number(user_id)]
        );
        if (exemptions.length > 0) {
            teamTasks = teamTasks.filter(t => {
                return !exemptions.some(e => {
                    if (e.template_id !== t.id) return false;
                    if (e.exempt_type === 'permanent') return true;
                    if (e.exempt_type === 'week' && e.week_start === (week_start || null)) return true;
                    return false;
                });
            });
        }

        // Individual tasks (_source='individual')
        const indivTasks = await db.all(
            `SELECT *, 'individual' as _source FROM task_point_templates WHERE target_type = 'individual' AND target_id = ? AND (week_only IS NULL OR week_only = ?) ORDER BY day_of_week, sort_order, time_start`,
            [Number(user_id), week_start || null]
        );

        // Get permanently exempted team tasks (for showing restore cards)
        const permExemptions = await db.all(
            `SELECT e.id as exemption_id, e.exempt_type, e.week_start as exempt_week, t.* FROM task_exemptions e JOIN task_point_templates t ON t.id = e.template_id WHERE e.user_id = ? AND e.exempt_type = 'permanent' AND t.target_type = 'team'`,
            [Number(user_id)]
        );

        return { tasks: [...teamTasks, ...indivTasks], exempted_tasks: permExemptions };
    });

    // CREATE a new task
    fastify.post('/api/task-points', { preHandler: [authenticate] }, async (request, reply) => {
        const { target_type, target_id, day_of_week, task_name, points, min_quantity, time_start, time_end, guide_url, sort_order, requires_approval, week_only, input_requirements, output_requirements } = request.body || {};
        if (!target_type || !target_id || !day_of_week || !task_name || !time_start || !time_end) {
            return reply.code(400).send({ error: 'Thiếu thông tin bắt buộc' });
        }
        // Only giam_doc can create fixed (non-week_only) tasks in schedule
        if (!week_only && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được tạo CV cố định vào lịch' });
        }
        const result = await db.run(
            `INSERT INTO task_point_templates (target_type, target_id, day_of_week, task_name, points, min_quantity, time_start, time_end, guide_url, sort_order, requires_approval, week_only, input_requirements, output_requirements, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [target_type, Number(target_id), Number(day_of_week), task_name, Number(points) || 0, Number(min_quantity) || 1, time_start, time_end, guide_url || null, Number(sort_order) || 0, requires_approval ? true : false, week_only || null, JSON.stringify(input_requirements || []), JSON.stringify(output_requirements || []), request.user.id]
        );
        return { success: true, id: result.lastInsertRowid };
    });

    // UPDATE a task
    fastify.put('/api/task-points/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const { task_name, points, min_quantity, time_start, time_end, guide_url, sort_order, day_of_week, requires_approval, week_only, input_requirements, output_requirements } = request.body || {};
        // Only giam_doc can edit fixed tasks
        const existing = await db.get('SELECT week_only FROM task_point_templates WHERE id = ?', [id]);
        if (existing && !existing.week_only && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được sửa CV cố định' });
        }
        await db.run(
            `UPDATE task_point_templates SET task_name=?, points=?, min_quantity=?, time_start=?, time_end=?, guide_url=?, sort_order=?, day_of_week=?, requires_approval=?, week_only=?, input_requirements=?, output_requirements=?, updated_at=NOW() WHERE id=?`,
            [task_name, Number(points) || 0, Number(min_quantity) || 1, time_start, time_end, guide_url || null, Number(sort_order) || 0, Number(day_of_week), requires_approval ? true : false, week_only || null, JSON.stringify(input_requirements || []), JSON.stringify(output_requirements || []), id]
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
        const registeredIds = await db.all("SELECT team_id FROM task_schedule_active_teams");
        const activeSet = new Set([...activeIds.map(r => r.target_id), ...registeredIds.map(r => r.team_id)]);
        return { departments: depts, active_dept_ids: [...activeSet] };
    });

    // Register a team as active (persist even without tasks)
    fastify.post('/api/task-points/activate-team', { preHandler: [authenticate] }, async (request, reply) => {
        const { team_id } = request.body || {};
        if (!team_id) return reply.code(400).send({ error: 'Thiếu team_id' });
        await db.run('INSERT INTO task_schedule_active_teams (team_id) VALUES ($1) ON CONFLICT DO NOTHING', [Number(team_id)]);
        return { success: true };
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
        const { task_name, points, min_quantity, guide_url, requires_approval, department_id, is_weekly, input_requirements, output_requirements } = request.body || {};
        if (!task_name) return reply.code(400).send({ error: 'Thiếu tên công việc' });
        // Only giam_doc can create fixed (non-weekly) tasks
        if (!is_weekly && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được tạo CV cố định' });
        }
        const result = await db.run(
            `INSERT INTO task_library (task_name, points, min_quantity, guide_url, requires_approval, department_id, is_weekly, input_requirements, output_requirements, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [task_name, Number(points) || 0, Number(min_quantity) || 1, guide_url || null, requires_approval ? true : false, department_id ? Number(department_id) : null, is_weekly ? true : false, JSON.stringify(input_requirements || []), JSON.stringify(output_requirements || []), request.user.id]
        );
        return { success: true, id: result.lastInsertRowid };
    });

    // UPDATE a library task
    fastify.put('/api/task-library/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const { task_name, points, min_quantity, guide_url, requires_approval, department_id, is_weekly, input_requirements, output_requirements } = request.body || {};
        // Check if target task is fixed — only giam_doc can edit
        const existing = await db.get('SELECT is_weekly, task_name FROM task_library WHERE id = $1', [Number(request.params.id)]);
        if (existing && !existing.is_weekly && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được sửa CV cố định' });
        }
        await db.run(
            `UPDATE task_library SET task_name=$1, points=$2, min_quantity=$3, guide_url=$4, requires_approval=$5, department_id=$6, is_weekly=$7, input_requirements=$8, output_requirements=$9 WHERE id=$10`,
            [task_name, Number(points) || 0, Number(min_quantity) || 1, guide_url || null, requires_approval ? true : false, department_id ? Number(department_id) : null, is_weekly ? true : false, JSON.stringify(input_requirements || []), JSON.stringify(output_requirements || []), Number(request.params.id)]
        );

        // Sync to all task_point_templates with the same name (old or new name)
        const oldName = existing ? existing.task_name : task_name;
        const namesToSync = [oldName];
        if (task_name !== oldName) namesToSync.push(task_name);
        for (const n of namesToSync) {
            await db.run(
                `UPDATE task_point_templates SET input_requirements=$1, output_requirements=$2, guide_url=$3, points=$4, min_quantity=$5, requires_approval=$6 WHERE task_name=$7`,
                [JSON.stringify(input_requirements || []), JSON.stringify(output_requirements || []), guide_url || null, Number(points) || 0, Number(min_quantity) || 1, requires_approval ? true : false, n]
            );
        }

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

    // POST move or clone a task to a different day/time slot (director only)
    fastify.post('/api/task-points/move-task', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { task_id, new_day, new_time_start, new_time_end, clone } = request.body;
        if (!task_id || !new_day || !new_time_start || !new_time_end) {
            return reply.code(400).send({ error: 'Thiếu thông tin' });
        }
        const task = await db.get('SELECT * FROM task_point_templates WHERE id = ?', [task_id]);
        if (!task) return reply.code(404).send({ error: 'Không tìm thấy công việc' });

        if (clone) {
            // Clone: insert new task
            await db.run(
                `INSERT INTO task_point_templates (target_type, target_id, task_name, points, min_quantity, time_start, time_end, day_of_week, guide_url, sort_order, requires_approval, week_only, input_requirements, output_requirements)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [task.target_type, task.target_id, task.task_name, task.points, task.min_quantity, new_time_start, new_time_end, new_day, task.guide_url, task.sort_order, task.requires_approval, task.week_only, task.input_requirements, task.output_requirements]
            );
            return { ok: true, message: `Đã nhân bản "${task.task_name}" sang ${DAY_NAMES[new_day] || 'ngày ' + new_day}` };
        } else {
            // Move: update existing
            await db.run(
                'UPDATE task_point_templates SET day_of_week = ?, time_start = ?, time_end = ? WHERE id = ?',
                [new_day, new_time_start, new_time_end, task_id]
            );
            return { ok: true, message: `Đã di chuyển "${task.task_name}" sang ${DAY_NAMES[new_day] || 'ngày ' + new_day}` };
        }
    });

    // POST clone tasks from one team to another (director only)
    fastify.post('/api/task-points/clone-from-team', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { source_team_id, target_team_id, mode } = request.body;
        if (!source_team_id || !target_team_id) {
            return reply.code(400).send({ error: 'Thiếu source hoặc target team' });
        }
        if (source_team_id === target_team_id) {
            return reply.code(400).send({ error: 'Không thể clone từ chính team này' });
        }
        if (!['replace', 'merge'].includes(mode)) {
            return reply.code(400).send({ error: 'Mode phải là replace hoặc merge' });
        }

        // Get source tasks
        const sourceTasks = await db.all(
            'SELECT * FROM task_point_templates WHERE target_type = ? AND target_id = ?',
            ['team', source_team_id]
        );
        if (sourceTasks.length === 0) {
            return reply.code(400).send({ error: 'Team nguồn không có công việc nào' });
        }

        // If replace mode, delete all existing tasks in target team
        if (mode === 'replace') {
            await db.run(
                'DELETE FROM task_point_templates WHERE target_type = ? AND target_id = ?',
                ['team', target_team_id]
            );
        }

        // Clone tasks
        let cloned = 0;
        for (const t of sourceTasks) {
            await db.run(
                `INSERT INTO task_point_templates (target_type, target_id, task_name, points, min_quantity, time_start, time_end, day_of_week, guide_url, sort_order, requires_approval, week_only, input_requirements, output_requirements)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                ['team', target_team_id, t.task_name, t.points, t.min_quantity, t.time_start, t.time_end, t.day_of_week, t.guide_url, t.sort_order, t.requires_approval, t.week_only, t.input_requirements, t.output_requirements]
            );
            cloned++;
        }

        return { ok: true, message: `Đã clone ${cloned} công việc từ team nguồn`, cloned };
    });

    // POST exempt a team task for a specific user (director only)
    fastify.post('/api/task-points/exempt', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { user_id, template_id, exempt_type, week_start } = request.body;
        if (!user_id || !template_id || !exempt_type) {
            return reply.code(400).send({ error: 'Thiếu thông tin' });
        }
        if (!['permanent', 'week'].includes(exempt_type)) {
            return reply.code(400).send({ error: 'exempt_type phải là permanent hoặc week' });
        }
        if (exempt_type === 'week' && !week_start) {
            return reply.code(400).send({ error: 'Thiếu week_start cho xóa tạm' });
        }

        // Check template exists and is a team task
        const tpl = await db.get('SELECT * FROM task_point_templates WHERE id = ?', [template_id]);
        if (!tpl || tpl.target_type !== 'team') {
            return reply.code(400).send({ error: 'Chỉ có thể miễn trừ CV team' });
        }

        // Avoid duplicate
        const existing = await db.get(
            'SELECT id FROM task_exemptions WHERE user_id = ? AND template_id = ? AND exempt_type = ? AND (week_start IS NOT DISTINCT FROM ?)',
            [user_id, template_id, exempt_type, week_start || null]
        );
        if (existing) {
            return { ok: true, message: 'Đã miễn trừ trước đó' };
        }

        // If permanent, remove any existing week exemptions for this pair
        if (exempt_type === 'permanent') {
            await db.run('DELETE FROM task_exemptions WHERE user_id = ? AND template_id = ?', [user_id, template_id]);
        }

        await db.run(
            'INSERT INTO task_exemptions (user_id, template_id, exempt_type, week_start, created_by) VALUES (?, ?, ?, ?, ?)',
            [user_id, template_id, exempt_type, week_start || null, request.user.id]
        );

        return { ok: true, message: exempt_type === 'permanent' ? 'Đã xóa vĩnh viễn cho nhân viên này' : 'Đã bỏ qua tuần này cho nhân viên' };
    });

    // DELETE restore an exemption (director only)
    fastify.delete('/api/task-points/exempt/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const id = Number(request.params.id);
        const exemption = await db.get('SELECT * FROM task_exemptions WHERE id = ?', [id]);
        if (!exemption) {
            return reply.code(404).send({ error: 'Không tìm thấy miễn trừ' });
        }
        await db.run('DELETE FROM task_exemptions WHERE id = ?', [id]);
        return { ok: true, message: 'Đã khôi phục CV cho nhân viên' };
    });
}

module.exports = taskPointRoutes;
