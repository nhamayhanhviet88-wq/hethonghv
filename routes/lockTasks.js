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

        // Get departments (exclude affiliate system)
        const departments = await db.all("SELECT id, name, parent_id FROM departments WHERE LOWER(name) NOT LIKE '%affiliate%' ORDER BY name");

        // Get users with their departments
        let usersQuery = '';
        let usersParams = [];

        if (userRole === 'giam_doc' || userRole === 'trinh') {
            usersQuery = `SELECT u.id, u.full_name, u.username, u.role, u.department_id, u.status
                         FROM users u WHERE u.status = 'active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
                         ORDER BY u.full_name`;
        } else {
            // Check if user is head_user of a HỆ THỐNG (system-level manager)
            const systemDepts = await db.all(
                "SELECT id FROM departments WHERE head_user_id = $1 AND name LIKE 'HỆ THỐNG%'",
                [userId]
            );

            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            if (!user || (!user.department_id && systemDepts.length === 0)) return { departments: [], users: [] };

            const deptIds = new Set();
            // Add user's own dept + children
            if (user.department_id) {
                deptIds.add(user.department_id);
                const children = await db.all('SELECT id FROM departments WHERE parent_id = $1', [user.department_id]);
                children.forEach(c => { deptIds.add(c.id); });
                for (const child of children) {
                    const gc = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
                    gc.forEach(g => deptIds.add(g.id));
                }
            }
            // Add ALL depts under each HỆ THỐNG where user is head
            for (const sys of systemDepts) {
                deptIds.add(sys.id);
                const sysChildren = await db.all('SELECT id FROM departments WHERE parent_id = $1', [sys.id]);
                sysChildren.forEach(c => { deptIds.add(c.id); });
                for (const child of sysChildren) {
                    const gc = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
                    gc.forEach(g => deptIds.add(g.id));
                }
            }

            const deptIdsArr = [...deptIds];
            const placeholders = deptIdsArr.map((_, i) => `$${i + 1}`).join(',');
            usersQuery = `SELECT u.id, u.full_name, u.username, u.role, u.department_id, u.status
                         FROM users u WHERE u.department_id IN (${placeholders}) AND u.status = 'active'
                         AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
                         ORDER BY u.full_name`;
            usersParams = deptIdsArr;
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

        // Check if this is a sub-team (child of a parent dept)
        const dept = await db.get('SELECT id, parent_id, name FROM departments WHERE id = $1', [deptId]);
        const parentDept = dept?.parent_id ? await db.get('SELECT id, parent_id FROM departments WHERE id = $1', [dept.parent_id]) : null;
        // A dept is a sub-team if its parent is NOT a system dept (system depts have their own parent or are top-level)
        const isSubTeam = parentDept && parentDept.parent_id; // parent has a parent → this is a sub-team

        let tasks;
        if (isSubTeam) {
            // Sub-team: show tasks from parent dept where at least one assigned user belongs to this team
            tasks = await db.all(
                `SELECT DISTINCT lt.*, u.full_name as created_by_name,
                        COUNT(DISTINCT lta.user_id) as assigned_count
                 FROM lock_tasks lt
                 LEFT JOIN users u ON u.id = lt.created_by
                 LEFT JOIN lock_task_assignments lta ON lta.lock_task_id = lt.id
                 LEFT JOIN users au ON au.id = lta.user_id
                 WHERE lt.department_id = $1 AND lt.is_active = true AND au.department_id = $2
                 GROUP BY lt.id, u.full_name
                 ORDER BY lt.recurrence_type, lt.task_name`,
                [dept.parent_id, deptId]
            );
        } else {
            tasks = await db.all(
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
        }

        // Get users assigned to each task (with dept info)
        const taskIds = tasks.map(t => t.id);
        let assignedUsers = [];
        if (taskIds.length > 0) {
            const placeholders = taskIds.map((_, i) => `$${i + 1}`).join(',');
            assignedUsers = await db.all(
                `SELECT lta.lock_task_id, u.id as user_id, u.full_name, u.username, u.department_id as user_dept_id, d.name as user_dept_name
                 FROM lock_task_assignments lta
                 JOIN users u ON u.id = lta.user_id
                 LEFT JOIN departments d ON d.id = u.department_id
                 WHERE lta.lock_task_id IN (${placeholders})
                 ORDER BY d.name, u.full_name`,
                taskIds
            );
        }

        // Map users to tasks
        const userMap = {};
        assignedUsers.forEach(au => {
            if (!userMap[au.lock_task_id]) userMap[au.lock_task_id] = [];
            userMap[au.lock_task_id].push({ id: au.user_id, name: au.full_name, username: au.username, dept_name: au.user_dept_name, dept_id: au.user_dept_id });
        });

        tasks.forEach(t => { t.assigned_users = userMap[t.id] || []; });

        // Also fetch chain task instances for this dept
        const chain_instances = await db.all(`
            SELECT ci.*, u.full_name as creator_name,
                   (SELECT COUNT(*) FROM chain_task_instance_items WHERE chain_instance_id = ci.id) as total_items,
                   (SELECT COUNT(*) FROM chain_task_instance_items WHERE chain_instance_id = ci.id AND status = 'completed') as completed_items,
                   (SELECT string_agg(DISTINCT u2.full_name, ', ' ORDER BY u2.full_name)
                    FROM chain_task_instance_items cii2
                    JOIN users u2 ON u2.id = cii2.assigned_user_id
                    WHERE cii2.chain_instance_id = ci.id) as assigned_users_str
            FROM chain_task_instances ci
            LEFT JOIN users u ON u.id = ci.created_by
            WHERE ci.department_id = $1 AND ci.status != 'cancelled'
            ORDER BY ci.created_at DESC
        `, [deptId]);

        return { tasks, chain_instances };
    });

    // POST: Tạo CV khóa mới
    fastify.post('/api/lock-tasks', { preHandler: [authenticate] }, async (request, reply) => {
        const userRole = request.user.role;
        if (!['giam_doc', 'quan_ly', 'truong_phong', 'trinh'].includes(userRole)) {
            return reply.code(403).send({ error: 'Không có quyền tạo công việc' });
        }

        const { task_name, task_content, guide_link, input_requirements, output_requirements,
                recurrence_type, recurrence_value, requires_approval, penalty_amount, max_redo_count, min_quantity
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
                                     recurrence_type, recurrence_value, requires_approval, max_redo_count, penalty_amount,
                                     created_by, department_id, min_quantity)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING id`,
            [task_name, task_content || null, guide_link || null, input_requirements || null, output_requirements || null,
             recurrence_type, recurrence_value || null, requires_approval || false, max_redo_count || 3, penalty_amount || 50000,
             request.user.id, departmentId || null, min_quantity || 1]
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
                recurrence_type, recurrence_value, requires_approval, penalty_amount, max_redo_count, min_quantity } = request.body || {};

        await db.run(
            `UPDATE lock_tasks SET task_name=$1, task_content=$2, guide_link=$3, input_requirements=$4,
             output_requirements=$5, recurrence_type=$6, recurrence_value=$7, requires_approval=$8, penalty_amount=$9, max_redo_count=$10, min_quantity=$11
             WHERE id=$12`,
            [task_name, task_content, guide_link, input_requirements, output_requirements,
             recurrence_type, recurrence_value, requires_approval || false, penalty_amount || 50000, max_redo_count || 3, min_quantity || 1, taskId]
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

    // POST: NV upload proof (supports redo)
    fastify.post('/api/lock-tasks/:id/submit', { preHandler: [authenticate] }, async (request, reply) => {
        const taskId = Number(request.params.id);
        const userId = request.user.id;

        // Support date param for calendar submission
        const dateParam = request.query?.date;
        const today = dateParam ? new Date(dateParam + 'T00:00:00') : new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // Handle multipart upload (file is optional if proof_url is provided)
        let fileData = null;
        let proofUrlField = '';
        let contentField = '';
        let quantityDoneField = 0;

        try {
            const parts = request.parts();
            for await (const part of parts) {
                if (part.file) {
                    // It's a file field - collect buffer
                    const uploadsDir = path.join(__dirname, '..', 'uploads', 'lock-tasks');
                    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                    const ext = path.extname(part.filename) || '.jpg';
                    const filename = `lt_${taskId}_${userId}_${todayStr}_${Date.now()}${ext}`;
                    const filePath = path.join(uploadsDir, filename);
                    const chunks = [];
                    for await (const chunk of part.file) { chunks.push(chunk); }
                    fs.writeFileSync(filePath, Buffer.concat(chunks));
                    fileData = `/uploads/lock-tasks/${filename}`;
                } else {
                    // It's a regular field
                    const val = part.value;
                    if (part.fieldname === 'proof_url') proofUrlField = val || '';
                    if (part.fieldname === 'content') contentField = val || '';
                    if (part.fieldname === 'quantity_done') quantityDoneField = parseInt(val) || 0;
                }
            }
        } catch(e) {
            // If multipart parsing fails, try regular body
            proofUrlField = request.body?.proof_url || '';
            contentField = request.body?.content || '';
            quantityDoneField = parseInt(request.body?.quantity_done) || 0;
        }

        // Validate: content is required
        if (!contentField.trim()) {
            return reply.code(400).send({ error: 'Vui lòng nhập nội dung hoàn thành' });
        }

        // Validate: at least link or file
        if (!proofUrlField.trim() && !fileData) {
            return reply.code(400).send({ error: 'Phải có ít nhất link báo cáo hoặc hình ảnh' });
        }

        // Check redo count
        const task = await db.get('SELECT requires_approval, max_redo_count FROM lock_tasks WHERE id = $1', [taskId]);
        const lastCompletion = await db.get(
            `SELECT redo_count, status FROM lock_task_completions
             WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3
             ORDER BY redo_count DESC LIMIT 1`,
            [taskId, userId, todayStr]
        );

        let redoCount = 0;
        if (lastCompletion) {
            if (lastCompletion.status === 'rejected') {
                redoCount = lastCompletion.redo_count + 1;
                const maxRedo = task?.max_redo_count || 3;
                if (redoCount > maxRedo) {
                    return reply.code(400).send({ error: `Đã vượt quá số lần nộp lại (${maxRedo} lần)` });
                }
            } else if (lastCompletion.status === 'pending' || lastCompletion.status === 'approved') {
                return reply.code(400).send({ error: 'Bài đã nộp, đang chờ duyệt hoặc đã duyệt' });
            } else {
                redoCount = lastCompletion.redo_count + 1;
            }
        }

        const proofUrl = fileData || proofUrlField.trim();
        const status = task?.requires_approval ? 'pending' : 'approved';

        // Calculate approval deadline if requires_approval
        let approvalDeadline = null;
        if (status === 'pending') {
            try {
                const { calculateRealDeadline, toLocalTimestamp } = require('./deadline-checker');
                approvalDeadline = toLocalTimestamp(await calculateRealDeadline(new Date(), null));
            } catch(e2) { /* fallback: no deadline */ }
        }

        await db.run(
            `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, redo_count, proof_url, content, status, approval_deadline, quantity_done)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT (lock_task_id, user_id, completion_date, redo_count) DO UPDATE SET proof_url=$5, content=$6, status=$7, approval_deadline=$8, quantity_done=$9, created_at=NOW()`,
            [taskId, userId, todayStr, redoCount, proofUrl, contentField.trim(), status, approvalDeadline, quantityDoneField]
        );

        // Auto-resolve support request if NV submitted (QL no longer penalized)
        await db.run(
            `UPDATE task_support_requests SET status = 'resolved'
             WHERE user_id = $1 AND lock_task_id = $2 AND task_date = $3
               AND status IN ('pending','supported') AND source_type = 'khoa'`,
            [userId, taskId, todayStr]
        );

        return { success: true, status, proofUrl, redo_count: redoCount };
    });

    // POST: QL duyệt/từ chối
    fastify.post('/api/lock-tasks/:id/review', { preHandler: [authenticate] }, async (request, reply) => {
        const completionId = Number(request.params.id);
        const { action, reject_reason } = request.body || {};

        if (!['approve', 'reject'].includes(action)) {
            return reply.code(400).send({ error: 'Action phải là approve hoặc reject' });
        }

        const status = action === 'approve' ? 'approved' : 'rejected';

        // If rejecting, calculate redo_deadline (23:59 next working day for NV)
        let redoDeadline = null;
        if (action === 'reject') {
            const comp = await db.get('SELECT user_id, lock_task_id FROM lock_task_completions WHERE id = $1', [completionId]);
            if (comp) {
                const { calculateRealDeadline } = require('./deadline-checker');
                const deadline = await calculateRealDeadline(new Date(), comp.user_id);
                redoDeadline = `${deadline.getFullYear()}-${String(deadline.getMonth()+1).padStart(2,'0')}-${String(deadline.getDate()).padStart(2,'0')} 23:59:59`;
            }
        }

        await db.run(
            `UPDATE lock_task_completions SET status=$1, reviewed_by=$2, reviewed_at=NOW(), reject_reason=$3, redo_deadline=$4
             WHERE id=$5`,
            [status, request.user.id, action === 'reject' ? (reject_reason || 'Không đạt yêu cầu') : null, redoDeadline, completionId]
        );

        return { success: true, status };
    });

    // GET: Task detail for popup
    fastify.get('/api/lock-tasks/:id/detail', { preHandler: [authenticate] }, async (request, reply) => {
        const taskId = Number(request.params.id);
        const task = await db.get('SELECT lt.*, d.name as dept_name FROM lock_tasks lt LEFT JOIN departments d ON d.id = lt.department_id WHERE lt.id = $1', [taskId]);
        if (!task) return reply.code(404).send({ error: 'Không tìm thấy' });
        return { task };
    });

    // POST: Support request (🆘 Sếp HT) for CV Khóa
    fastify.post('/api/lock-tasks/:id/support', { preHandler: [authenticate] }, async (request, reply) => {
        const lockTaskId = Number(request.params.id);
        const userId = request.user.id;
        const { task_date } = request.body || {};

        if (!task_date) return reply.code(400).send({ error: 'Thiếu ngày' });

        const task = await db.get('SELECT * FROM lock_tasks WHERE id = $1', [lockTaskId]);
        if (!task) return reply.code(404).send({ error: 'Không tìm thấy CV' });

        // Find manager
        const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
        let managerId = null;
        let lookupDeptId = user?.department_id;
        const visited = new Set();
        while (lookupDeptId && !visited.has(lookupDeptId)) {
            visited.add(lookupDeptId);
            const approver = await db.get('SELECT user_id FROM task_approvers WHERE department_id = $1 AND user_id != $2 LIMIT 1', [lookupDeptId, userId]);
            if (approver) { managerId = approver.user_id; break; }
            const dept = await db.get('SELECT parent_id FROM departments WHERE id = $1', [lookupDeptId]);
            lookupDeptId = dept ? dept.parent_id : null;
        }

        // Calc deadline
        const { calculateRealDeadline, toLocalTimestamp } = require('./deadline-checker');
        const deadlineDate = await calculateRealDeadline(new Date(), managerId);
        const deadlineDateStr = `${deadlineDate.getFullYear()}-${String(deadlineDate.getMonth()+1).padStart(2,'0')}-${String(deadlineDate.getDate()).padStart(2,'0')}`;

        // Check existing
        const existing = await db.get(
            "SELECT id FROM task_support_requests WHERE user_id = $1 AND lock_task_id = $2 AND task_date = $3 AND source_type = 'khoa'",
            [userId, lockTaskId, task_date]
        );
        if (existing) return reply.code(400).send({ error: 'Đã gửi yêu cầu hỗ trợ cho CV này rồi' });

        await db.run(
            `INSERT INTO task_support_requests (user_id, template_id, lock_task_id, task_name, task_date, deadline, deadline_at, manager_id, department_id, status, source_type)
             VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, 'pending', 'khoa')`,
            [userId, lockTaskId, task.task_name, task_date, deadlineDateStr, toLocalTimestamp(deadlineDate), managerId, user?.department_id]
        );

        return { success: true };
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
        // Get ALL completions per task per day (all redo versions for history)
        const completions = await db.all(
            `SELECT ltc.*, ltc.completion_date::text as completion_date
             FROM lock_task_completions ltc
             WHERE ltc.user_id = $1 AND ltc.completion_date BETWEEN $2 AND $3
             ORDER BY ltc.lock_task_id, ltc.completion_date, ltc.redo_count DESC`,
            [targetUserId, week_start, weekEnd]
        );

        // Get holidays
        const holidays = await db.all(
            `SELECT holiday_date::text as holiday_date FROM holidays WHERE holiday_date BETWEEN $1 AND $2`,
            [week_start, weekEnd]
        );
        const holidaySet = new Set(holidays.map(h => h.holiday_date));

        // Get CV Khóa support requests for this week
        const supportRequests = await db.all(
            `SELECT *, task_date::text as task_date FROM task_support_requests
             WHERE user_id = $1 AND task_date BETWEEN $2 AND $3 AND source_type = 'khoa'`,
            [targetUserId, week_start, weekEnd]
        );

        return { tasks, completions, dates, holidays: Array.from(holidaySet), supportRequests };
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
                        lt.task_name, lt.guide_link, lt.input_requirements, lt.output_requirements,
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
                    lt.task_name, lt.guide_link, lt.input_requirements, lt.output_requirements,
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
            `SELECT u.id, u.full_name, u.username, u.department_id, u.role, d.name as dept_name
             FROM users u
             LEFT JOIN departments d ON d.id = u.department_id
             WHERE u.department_id IN (${placeholders}) AND u.status = 'active'
             AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
             ORDER BY u.full_name`,
            deptIds
        );

        return { users };
    });

    // ========== GET single lock task detail (for approval modal) ==========
    fastify.get('/api/lock-tasks/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const task = await db.get('SELECT * FROM lock_tasks WHERE id = $1', [id]);
        if (!task) return reply.code(404).send({ error: 'Not found' });
        return { task };
    });

    // ========== GET completions history for a lock task (for approval modal) ==========
    fastify.get('/api/lock-tasks/:id/completions', { preHandler: [authenticate] }, async (request, reply) => {
        const lockTaskId = Number(request.params.id);
        const { user_id, date } = request.query;
        const uid = Number(user_id);
        if (!uid || !date) return reply.code(400).send({ error: 'Missing user_id or date' });

        const completions = await db.all(
            `SELECT * FROM lock_task_completions
             WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3
             ORDER BY redo_count DESC`,
            [lockTaskId, uid, date]
        );
        return { completions };
    });
}

module.exports = lockTaskRoutes;
