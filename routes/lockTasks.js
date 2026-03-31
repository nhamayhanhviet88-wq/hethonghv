const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

async function lockTaskRoutes(fastify, options) {

    // ========== ORG TREE ==========
    // GET: Cây tổ chức cho sidebar trái
    fastify.get('/api/lock-tasks/tree', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;

        // Get departments
        const departments = await db.all('SELECT id, name, parent_id FROM departments ORDER BY name');

        // Get users with their departments
        let usersQuery = '';
        let usersParams = [];

        if (userRole === 'giam_doc' || userRole === 'trinh') {
            usersQuery = `SELECT u.id, u.full_name, u.username, u.role, u.department_id, u.status
                         FROM users u WHERE u.status = 'active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
                         ORDER BY u.full_name`;
        } else {
            // QL/TP: only see users in their dept scope
            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            if (!user || !user.department_id) return { departments: [], users: [] };

            const deptIds = [user.department_id];
            const children = await db.all('SELECT id FROM departments WHERE parent_id = $1', [user.department_id]);
            children.forEach(c => deptIds.push(c.id));
            for (const child of children) {
                const gc = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
                gc.forEach(g => deptIds.push(g.id));
            }

            const placeholders = deptIds.map((_, i) => `$${i + 1}`).join(',');
            usersQuery = `SELECT u.id, u.full_name, u.username, u.role, u.department_id, u.status
                         FROM users u WHERE u.department_id IN (${placeholders}) AND u.status = 'active'
                         AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
                         ORDER BY u.full_name`;
            usersParams = deptIds;
        }

        const users = await db.all(usersQuery, usersParams);

        // Get today's completion status for each user
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const completions = await db.all(
            `SELECT lta.user_id, COUNT(lt.id) as total_tasks,
                    COUNT(ltc.id) FILTER (WHERE ltc.status IN ('pending','approved')) as completed_tasks
             FROM lock_task_assignments lta
             JOIN lock_tasks lt ON lt.id = lta.lock_task_id AND lt.is_active = true
             LEFT JOIN lock_task_completions ltc ON ltc.lock_task_id = lt.id AND ltc.user_id = lta.user_id AND ltc.completion_date = $1
             GROUP BY lta.user_id`,
            [todayStr]
        );

        const statusMap = {};
        completions.forEach(c => {
            statusMap[c.user_id] = { total: c.total_tasks, done: c.completed_tasks };
        });

        return { departments, users, statusMap };
    });

    // ========== TASK CRUD ==========

    // GET: CV của 1 NV cụ thể
    fastify.get('/api/lock-tasks/user/:userId', { preHandler: [authenticate] }, async (request, reply) => {
        const targetUserId = Number(request.params.userId);
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const tasks = await db.all(
            `SELECT lt.*, lta.id as assignment_id, u.full_name as created_by_name,
                    ltc.id as completion_id, ltc.status as completion_status, ltc.proof_url, ltc.reject_reason,
                    ltc.reviewed_by, reviewer.full_name as reviewer_name, ltc.reviewed_at
             FROM lock_task_assignments lta
             JOIN lock_tasks lt ON lt.id = lta.lock_task_id AND lt.is_active = true
             LEFT JOIN users u ON u.id = lt.created_by
             LEFT JOIN lock_task_completions ltc ON ltc.lock_task_id = lt.id AND ltc.user_id = $1 AND ltc.completion_date = $2
             LEFT JOIN users reviewer ON reviewer.id = ltc.reviewed_by
             WHERE lta.user_id = $1
             ORDER BY lt.recurrence_type, lt.task_name`,
            [targetUserId, todayStr]
        );

        return { tasks };
    });

    // GET: CV của phòng ban (tổng hợp)
    fastify.get('/api/lock-tasks/dept/:deptId', { preHandler: [authenticate] }, async (request, reply) => {
        const deptId = Number(request.params.deptId);

        const tasks = await db.all(
            `SELECT lt.*, u.full_name as created_by_name,
                    COUNT(DISTINCT lta.user_id) as assigned_count
             FROM lock_tasks lt
             LEFT JOIN users u ON u.id = lt.created_by
             LEFT JOIN lock_task_assignments lta ON lta.lock_task_id = lt.id
             WHERE lt.department_id = $1 AND lt.is_active = true
             GROUP BY lt.id, u.full_name
             ORDER BY lt.recurrence_type, lt.task_name`,
            [deptId]
        );

        // Get users assigned to each task
        const taskIds = tasks.map(t => t.id);
        let assignedUsers = [];
        if (taskIds.length > 0) {
            const placeholders = taskIds.map((_, i) => `$${i + 1}`).join(',');
            assignedUsers = await db.all(
                `SELECT lta.lock_task_id, u.id as user_id, u.full_name, u.username
                 FROM lock_task_assignments lta
                 JOIN users u ON u.id = lta.user_id
                 WHERE lta.lock_task_id IN (${placeholders})
                 ORDER BY u.full_name`,
                taskIds
            );
        }

        // Map users to tasks
        const userMap = {};
        assignedUsers.forEach(au => {
            if (!userMap[au.lock_task_id]) userMap[au.lock_task_id] = [];
            userMap[au.lock_task_id].push({ id: au.user_id, name: au.full_name, username: au.username });
        });

        tasks.forEach(t => { t.assigned_users = userMap[t.id] || []; });

        return { tasks };
    });

    // POST: Tạo CV khóa mới
    fastify.post('/api/lock-tasks', { preHandler: [authenticate] }, async (request, reply) => {
        const userRole = request.user.role;
        if (!['giam_doc', 'quan_ly', 'truong_phong', 'trinh'].includes(userRole)) {
            return reply.code(403).send({ error: 'Không có quyền tạo công việc' });
        }

        const { task_name, task_content, guide_link, input_requirements, output_requirements,
                recurrence_type, recurrence_value, requires_approval, penalty_amount
        } = request.body || {};

        if (!task_name || !recurrence_type) {
            return reply.code(400).send({ error: 'Thiếu tên công việc hoặc loại lặp lại' });
        }

        // Determine department
        let departmentId = request.body.department_id;
        if (!departmentId && userRole !== 'giam_doc') {
            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [request.user.id]);
            departmentId = user?.department_id;
        }

        const result = await db.get(
            `INSERT INTO lock_tasks (task_name, task_content, guide_link, input_requirements, output_requirements,
                                     recurrence_type, recurrence_value, requires_approval, penalty_amount,
                                     created_by, department_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING id`,
            [task_name, task_content || null, guide_link || null, input_requirements || null, output_requirements || null,
             recurrence_type, recurrence_value || null, requires_approval || false, penalty_amount || 50000,
             request.user.id, departmentId || null]
        );

        // Assign users if provided
        const user_ids = request.body.user_ids || [];
        for (const uid of user_ids) {
            try {
                await db.run(
                    'INSERT INTO lock_task_assignments (lock_task_id, user_id, assigned_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
                    [result.id, uid, request.user.id]
                );
            } catch(e) {}
        }

        return { success: true, task_id: result.id };
    });

    // PUT: Sửa CV
    fastify.put('/api/lock-tasks/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const taskId = Number(request.params.id);
        const userRole = request.user.role;
        if (!['giam_doc', 'quan_ly', 'truong_phong', 'trinh'].includes(userRole)) {
            return reply.code(403).send({ error: 'Không có quyền' });
        }

        const { task_name, task_content, guide_link, input_requirements, output_requirements,
                recurrence_type, recurrence_value, requires_approval, penalty_amount } = request.body || {};

        await db.run(
            `UPDATE lock_tasks SET task_name=$1, task_content=$2, guide_link=$3, input_requirements=$4,
             output_requirements=$5, recurrence_type=$6, recurrence_value=$7, requires_approval=$8, penalty_amount=$9
             WHERE id=$10`,
            [task_name, task_content, guide_link, input_requirements, output_requirements,
             recurrence_type, recurrence_value, requires_approval || false, penalty_amount || 50000, taskId]
        );

        // Update assignments if provided
        if (request.body.user_ids) {
            await db.run('DELETE FROM lock_task_assignments WHERE lock_task_id = $1', [taskId]);
            for (const uid of request.body.user_ids) {
                try {
                    await db.run(
                        'INSERT INTO lock_task_assignments (lock_task_id, user_id, assigned_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
                        [taskId, uid, request.user.id]
                    );
                } catch(e) {}
            }
        }

        return { success: true };
    });

    // DELETE: Xóa CV (soft delete)
    fastify.delete('/api/lock-tasks/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const taskId = Number(request.params.id);
        await db.run('UPDATE lock_tasks SET is_active = false WHERE id = $1', [taskId]);
        return { success: true };
    });

    // ========== SUBMISSIONS ==========

    // POST: NV upload proof
    fastify.post('/api/lock-tasks/:id/submit', { preHandler: [authenticate] }, async (request, reply) => {
        const taskId = Number(request.params.id);
        const userId = request.user.id;

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // Handle multipart upload
        const data = await request.file();
        if (!data) {
            return reply.code(400).send({ error: 'Vui lòng upload file chứng minh' });
        }

        // Save file
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'lock-tasks');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const ext = path.extname(data.filename) || '.jpg';
        const filename = `lt_${taskId}_${userId}_${todayStr}${ext}`;
        const filePath = path.join(uploadsDir, filename);
        const writeStream = fs.createWriteStream(filePath);
        await data.file.pipe(writeStream);
        await new Promise((resolve, reject) => { writeStream.on('finish', resolve); writeStream.on('error', reject); });

        const proofUrl = `/uploads/lock-tasks/${filename}`;

        // Check if task requires approval
        const task = await db.get('SELECT requires_approval FROM lock_tasks WHERE id = $1', [taskId]);
        const status = task?.requires_approval ? 'pending' : 'approved';

        await db.run(
            `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, proof_url, status)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (lock_task_id, user_id, completion_date) DO UPDATE SET proof_url=$4, status=$5, created_at=NOW()`,
            [taskId, userId, todayStr, proofUrl, status]
        );

        return { success: true, status, proofUrl };
    });

    // POST: QL duyệt/từ chối
    fastify.post('/api/lock-tasks/:id/review', { preHandler: [authenticate] }, async (request, reply) => {
        const completionId = Number(request.params.id);
        const { action, reject_reason } = request.body || {};

        if (!['approve', 'reject'].includes(action)) {
            return reply.code(400).send({ error: 'Action phải là approve hoặc reject' });
        }

        const status = action === 'approve' ? 'approved' : 'rejected';

        await db.run(
            `UPDATE lock_task_completions SET status=$1, reviewed_by=$2, reviewed_at=NOW(), reject_reason=$3
             WHERE id=$4`,
            [status, request.user.id, action === 'reject' ? (reject_reason || 'Không đạt yêu cầu') : null, completionId]
        );

        return { success: true, status };
    });

    // ========== CALENDAR DATA ==========

    // GET: Dữ liệu cho lịch tuần (CV Khóa)
    fastify.get('/api/lock-tasks/calendar', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id, week_start } = request.query;
        if (!user_id || !week_start) {
            return reply.code(400).send({ error: 'Thiếu user_id hoặc week_start' });
        }

        const targetUserId = Number(user_id);

        // Get all active tasks assigned to this user
        const tasks = await db.all(
            `SELECT lt.*
             FROM lock_task_assignments lta
             JOIN lock_tasks lt ON lt.id = lta.lock_task_id AND lt.is_active = true
             WHERE lta.user_id = $1
             ORDER BY lt.task_name`,
            [targetUserId]
        );

        // Get completions for this week
        const ws = new Date(week_start + 'T00:00:00');
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(ws);
            d.setDate(d.getDate() + i);
            const yy = d.getFullYear();
            const mm2 = String(d.getMonth() + 1).padStart(2, '0');
            const dd2 = String(d.getDate()).padStart(2, '0');
            dates.push(`${yy}-${mm2}-${dd2}`);
        }

        const weekEnd = dates[6];
        const completions = await db.all(
            `SELECT ltc.*, ltc.completion_date::text as completion_date
             FROM lock_task_completions ltc
             WHERE ltc.user_id = $1 AND ltc.completion_date BETWEEN $2 AND $3`,
            [targetUserId, week_start, weekEnd]
        );

        // Get holidays
        const holidays = await db.all(
            `SELECT holiday_date::text as holiday_date FROM holidays WHERE holiday_date BETWEEN $1 AND $2`,
            [week_start, weekEnd]
        );
        const holidaySet = new Set(holidays.map(h => h.holiday_date));

        return { tasks, completions, dates, holidays: Array.from(holidaySet) };
    });

    // GET: Pending reviews for QL
    fastify.get('/api/lock-tasks/pending-reviews', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;

        if (!['giam_doc', 'quan_ly', 'truong_phong', 'trinh'].includes(userRole)) {
            return { reviews: [] };
        }

        // Get user's department scope
        const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
        const deptIds = [user?.department_id].filter(Boolean);
        if (user?.department_id) {
            const children = await db.all('SELECT id FROM departments WHERE parent_id = $1', [user.department_id]);
            children.forEach(c => deptIds.push(c.id));
        }

        if (userRole === 'giam_doc') {
            // GĐ sees all
            const reviews = await db.all(
                `SELECT ltc.*, ltc.completion_date::text as completion_date,
                        lt.task_name, lt.guide_link,
                        u.full_name as user_name, u.username,
                        d.name as dept_name
                 FROM lock_task_completions ltc
                 JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
                 JOIN users u ON u.id = ltc.user_id
                 LEFT JOIN departments d ON d.id = u.department_id
                 WHERE ltc.status = 'pending' AND lt.requires_approval = true
                 ORDER BY ltc.created_at DESC`
            );
            return { reviews };
        }

        if (deptIds.length === 0) return { reviews: [] };

        const placeholders = deptIds.map((_, i) => `$${i + 1}`).join(',');
        const reviews = await db.all(
            `SELECT ltc.*, ltc.completion_date::text as completion_date,
                    lt.task_name, lt.guide_link,
                    u.full_name as user_name, u.username,
                    d.name as dept_name
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             JOIN users u ON u.id = ltc.user_id
             LEFT JOIN departments d ON d.id = u.department_id
             WHERE ltc.status = 'pending' AND lt.requires_approval = true
             AND u.department_id IN (${placeholders})
             ORDER BY ltc.created_at DESC`,
            deptIds
        );

        return { reviews };
    });

    // GET: Dept users for assignment modal
    fastify.get('/api/lock-tasks/dept-users/:deptId', { preHandler: [authenticate] }, async (request, reply) => {
        const deptId = Number(request.params.deptId);

        // Get all users in dept and sub-depts
        const deptIds = [deptId];
        const children = await db.all('SELECT id FROM departments WHERE parent_id = $1', [deptId]);
        children.forEach(c => deptIds.push(c.id));
        for (const child of children) {
            const gc = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
            gc.forEach(g => deptIds.push(g.id));
        }

        const placeholders = deptIds.map((_, i) => `$${i + 1}`).join(',');
        const users = await db.all(
            `SELECT u.id, u.full_name, u.username, u.department_id, d.name as dept_name
             FROM users u
             LEFT JOIN departments d ON d.id = u.department_id
             WHERE u.department_id IN (${placeholders}) AND u.status = 'active'
             AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
             ORDER BY u.full_name`,
            deptIds
        );

        return { users };
    });
}

module.exports = lockTaskRoutes;
