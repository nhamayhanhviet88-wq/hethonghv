/**
 * Bảng Công Việc — Task Board (Kanban)
 * Routes: /api/board-tasks, /api/board-config
 * Auto-migrate: board_config, board_tasks, board_task_comments, board_task_attachments, board_task_checklist
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'board');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

async function bangcongviecRoutes(fastify, options) {

    // ========== AUTO-MIGRATE ==========
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS board_config (
            id SERIAL PRIMARY KEY,
            department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
            is_enabled BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(department_id)
        )`);
    } catch(e) { /* already exists */ }

    try {
        await db.run(`CREATE TABLE IF NOT EXISTS board_tasks (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'can_lam'
                CHECK (status IN ('can_lam','dang_lam','cho_duyet','hoan_thanh')),
            priority TEXT NOT NULL DEFAULT 'trung_binh'
                CHECK (priority IN ('cao','trung_binh','thap')),
            task_type TEXT NOT NULL DEFAULT 'chinh'
                CHECK (task_type IN ('chinh','phu')),
            progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
            department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
            assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_by INTEGER NOT NULL REFERENCES users(id),
            deadline DATE,
            completed_at TIMESTAMP,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* already exists */ }

    try {
        await db.run(`CREATE TABLE IF NOT EXISTS board_task_comments (
            id SERIAL PRIMARY KEY,
            task_id INTEGER NOT NULL REFERENCES board_tasks(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id),
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* already exists */ }

    try {
        await db.run(`CREATE TABLE IF NOT EXISTS board_task_attachments (
            id SERIAL PRIMARY KEY,
            task_id INTEGER NOT NULL REFERENCES board_tasks(id) ON DELETE CASCADE,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            uploaded_by INTEGER NOT NULL REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* already exists */ }

    // board_task_checklist
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS board_task_checklist (
            id SERIAL PRIMARY KEY,
            task_id INTEGER NOT NULL REFERENCES board_tasks(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            is_done BOOLEAN DEFAULT FALSE,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* already exists */ }

    // Add task_link column if not exists
    try {
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS task_link TEXT`);
    } catch(e) { /* already exists */ }

    // Add report columns if not exists
    try {
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS report_content TEXT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS report_link TEXT`);
    } catch(e) { /* already exists */ }

    // Add accepted_at column if not exists
    try {
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP`);
    } catch(e) { /* already exists */ }

    // ========== HELPERS ==========

    // Check if user's department is enabled for board
    async function isUserDeptEnabled(user) {
        if (user.role === 'giam_doc') return true; // Director sees all
        if (!user.department_id) return false;
        const row = await db.get(`SELECT is_enabled FROM board_config WHERE department_id = $1`, [user.department_id]);
        return row && row.is_enabled;
    }

    // Get list of enabled department IDs (always numbers)
    async function getEnabledDeptIds() {
        const rows = await db.all(`SELECT department_id FROM board_config WHERE is_enabled = TRUE`);
        return rows.map(r => Number(r.department_id));
    }

    // Get user's department ID reliably (fetches from DB if missing on user object)
    async function getUserDeptId(user) {
        let dId = user.department_id;
        if (dId === undefined || dId === null) {
            const u = await db.get(`SELECT department_id FROM users WHERE id = $1`, [user.id]);
            dId = u ? u.department_id : null;
        }
        return dId ? Number(dId) : null;
    }

    // Check if user can manage tasks (create/assign/delete)
    function canManageTasks(user) {
        return ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(user.role);
    }

    // ========== BOARD CONFIG ==========

    // GET /api/board-config — List all departments with their board status
    fastify.get('/api/board-config', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            if (user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ Giám đốc mới xem được cài đặt' });
            }

            const departments = await db.all(`
                SELECT d.id, d.name, d.code, d.status,
                       COALESCE(bc.is_enabled, FALSE) as board_enabled
                FROM departments d
                LEFT JOIN board_config bc ON bc.department_id = d.id
                WHERE d.status = 'active'
                ORDER BY d.name ASC
            `);

            return reply.send({ departments });
        } catch(e) {
            console.error('[board-config GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/board-config — Enable/disable department for board
    fastify.post('/api/board-config', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            if (user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ Giám đốc mới cài đặt được' });
            }

            const { department_id, is_enabled } = request.body;
            if (!department_id) return reply.code(400).send({ error: 'Thiếu department_id' });

            await db.run(`
                INSERT INTO board_config (department_id, is_enabled)
                VALUES ($1, $2)
                ON CONFLICT (department_id)
                DO UPDATE SET is_enabled = $2
            `, [department_id, is_enabled !== false]);

            return reply.send({ ok: true });
        } catch(e) {
            console.error('[board-config POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== BOARD TASKS ==========

    // GET /api/board-tasks — List tasks (with filters)
    fastify.get('/api/board-tasks', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            const { status, priority, assigned_to, department_id, search, tab } = request.query;

            // Check department access
            const enabledDepts = await getEnabledDeptIds();
            const userDeptId = await getUserDeptId(user);

            if (enabledDepts.length === 0 && user.role !== 'giam_doc') {
                return reply.send({ tasks: [] });
            }

            let where = ['1=1'];
            let params = [];
            let pIdx = 0;

            // Department isolation & tab filtering
            if (user.role === 'giam_doc') {
                if (department_id) {
                    pIdx++; where.push(`t.department_id = $${pIdx}`); params.push(Number(department_id));
                }
                if (tab === 'me') {
                    pIdx++; where.push(`t.assigned_to = $${pIdx}`); params.push(user.id);
                } else if (tab === 'ban_giao' || tab === 'phong') {
                    pIdx++; where.push(`t.created_by = $${pIdx} AND (t.assigned_to IS NULL OR t.assigned_to != $${pIdx})`); params.push(user.id);
                }
            } else {
                if (userDeptId && enabledDepts.includes(userDeptId)) {
                    pIdx++; where.push(`t.department_id = $${pIdx}`); params.push(userDeptId);
                }
                if (tab === 'me') {
                    pIdx++; where.push(`t.assigned_to = $${pIdx}`); params.push(user.id);
                } else if (tab === 'ban_giao' || tab === 'phong') {
                    pIdx++; where.push(`t.created_by = $${pIdx} AND (t.assigned_to IS NULL OR t.assigned_to != $${pIdx})`); params.push(user.id);
                }
            }

            // Status filter
            if (status) {
                pIdx++; where.push(`t.status = $${pIdx}`); params.push(status);
            }

            // Priority filter
            if (priority) {
                pIdx++; where.push(`t.priority = $${pIdx}`); params.push(priority);
            }

            // Assigned to filter
            if (assigned_to) {
                pIdx++; where.push(`t.assigned_to = $${pIdx}`); params.push(assigned_to);
            }

            // Search filter
            if (search) {
                pIdx++; where.push(`(t.title ILIKE $${pIdx} OR t.description ILIKE $${pIdx})`);
                params.push(`%${search}%`);
            }

            const tasks = await db.all(`
                SELECT t.*,
                       u_assign.full_name as assigned_to_name,
                       u_assign.role as assigned_to_role,
                       u_create.full_name as created_by_name,
                       d.name as department_name,
                       d.code as department_code,
                       COALESCE(cc.comment_count, 0) as comment_count
                FROM board_tasks t
                LEFT JOIN users u_assign ON u_assign.id = t.assigned_to
                LEFT JOIN users u_create ON u_create.id = t.created_by
                LEFT JOIN departments d ON d.id = t.department_id
                LEFT JOIN (
                    SELECT task_id, COUNT(*) as comment_count
                    FROM board_task_comments
                    GROUP BY task_id
                ) cc ON cc.task_id = t.id
                WHERE ${where.join(' AND ')}
                ORDER BY
                    CASE t.status
                        WHEN 'can_lam' THEN 1
                        WHEN 'dang_lam' THEN 2
                        WHEN 'cho_duyet' THEN 3
                        WHEN 'hoan_thanh' THEN 4
                    END,
                    CASE t.priority
                        WHEN 'cao' THEN 1
                        WHEN 'trung_binh' THEN 2
                        WHEN 'thap' THEN 3
                    END,
                    t.sort_order ASC,
                    t.created_at DESC
            `, params);

            return reply.send({ tasks });
        } catch(e) {
            console.error('[board-tasks GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/board-tasks — Create task
    fastify.post('/api/board-tasks', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            if (!canManageTasks(user)) {
                return reply.code(403).send({ error: 'Bạn không có quyền tạo task' });
            }

            const { title, description, priority, task_type, assigned_to, department_id, deadline, task_link, checklist } = request.body;
            if (!title || !title.trim()) {
                return reply.code(400).send({ error: 'Tiêu đề không được để trống' });
            }

            // Department validation
            let deptId = department_id;
            if (user.role !== 'giam_doc' || !deptId) {
                deptId = await getUserDeptId(user);
            }
            if (!deptId && assigned_to) {
                const assignee = await db.get(`SELECT department_id FROM users WHERE id = $1`, [assigned_to]);
                if (assignee) deptId = assignee.department_id;
            }

            // Validate assignment hierarchy permission rules:
            if (assigned_to && Number(assigned_to) !== user.id && user.role !== 'giam_doc') {
                const targetUser = await db.get(`SELECT id, role FROM users WHERE id = $1`, [assigned_to]);
                if (targetUser) {
                    if (['quan_ly_cap_cao', 'quan_ly', 'quan_ly_xuong'].includes(user.role)) {
                        if (!['truong_phong', 'nhan_vien'].includes(targetUser.role)) {
                            return reply.code(403).send({ error: 'Quản lý chỉ được giao việc cho chính mình, Trưởng phòng và Nhân viên' });
                        }
                    } else if (user.role === 'truong_phong') {
                        if (targetUser.role !== 'nhan_vien') {
                            return reply.code(403).send({ error: 'Trưởng phòng chỉ được giao việc cho chính mình và Nhân viên' });
                        }
                    } else {
                        return reply.code(403).send({ error: 'Nhân viên chỉ được giao việc cho chính mình' });
                    }
                }
            }

            if (deptId) {
                const enabledDepts = await getEnabledDeptIds();
                if (!enabledDepts.includes(Number(deptId))) {
                    return reply.code(400).send({ error: 'Phòng ban này chưa được bật Bảng Công Việc' });
                }
            }

            const result = await db.get(`
                INSERT INTO board_tasks (title, description, status, priority, task_type, department_id, assigned_to, created_by, deadline, task_link)
                VALUES ($1, $2, 'can_lam', $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `, [
                title.trim(),
                description || null,
                priority || 'trung_binh',
                task_type || 'chinh',
                deptId || null,
                assigned_to || null,
                user.id,
                deadline || null,
                task_link || null
            ]);

            // Create checklist items if provided
            if (checklist && Array.isArray(checklist) && checklist.length > 0) {
                for (let i = 0; i < checklist.length; i++) {
                    const item = checklist[i];
                    if (item && item.trim()) {
                        await db.run(`INSERT INTO board_task_checklist (task_id, title, sort_order) VALUES ($1, $2, $3)`,
                            [result.id, item.trim(), i]);
                    }
                }
            }

            return reply.send({ ok: true, task: result });
        } catch(e) {
            console.error('[board-tasks POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/board-tasks/:id — Update task
    fastify.put('/api/board-tasks/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            const taskId = request.params.id;

            const task = await db.get(`SELECT * FROM board_tasks WHERE id = $1`, [taskId]);
            if (!task) return reply.code(404).send({ error: 'Không tìm thấy task' });

            // Permission check
            const isManager = canManageTasks(user);
            const isAssignee = task.assigned_to === user.id;
            const isCreator = task.created_by === user.id;

            if (!isManager && !isAssignee && !isCreator) {
                return reply.code(403).send({ error: 'Bạn không có quyền sửa task này' });
            }

            const b = request.body;
            const updates = [];
            const vals = [];
            let idx = 0;

            if (isManager || isCreator) {
                // Full edit for managers and creator
                if (b.title !== undefined) { idx++; updates.push(`title = $${idx}`); vals.push(b.title.trim()); }
                if (b.description !== undefined) { idx++; updates.push(`description = $${idx}`); vals.push(b.description); }
                if (b.priority !== undefined) { idx++; updates.push(`priority = $${idx}`); vals.push(b.priority); }
                if (b.task_type !== undefined) { idx++; updates.push(`task_type = $${idx}`); vals.push(b.task_type); }
                if (b.assigned_to !== undefined) { idx++; updates.push(`assigned_to = $${idx}`); vals.push(b.assigned_to || null); }
                if (b.deadline !== undefined) { idx++; updates.push(`deadline = $${idx}`); vals.push(b.deadline || null); }
                if (b.department_id !== undefined) { idx++; updates.push(`department_id = $${idx}`); vals.push(b.department_id || null); }
                if (b.task_link !== undefined) { idx++; updates.push(`task_link = $${idx}`); vals.push(b.task_link || null); }
            }

            // Assignee, manager, or creator can update status & progress
            if (b.status !== undefined) {
                idx++; updates.push(`status = $${idx}`); vals.push(b.status);
                if (b.status === 'hoan_thanh') {
                    updates.push(`completed_at = NOW()`);
                    updates.push(`progress = 100`);
                } else {
                    updates.push(`completed_at = NULL`);
                }
            }
            if (b.progress !== undefined) {
                idx++; updates.push(`progress = $${idx}`); vals.push(Math.max(0, Math.min(100, Number(b.progress))));
            }

            // Anyone assigned/manager/creator can update report fields
            if (b.report_content !== undefined) {
                idx++; updates.push(`report_content = $${idx}`); vals.push(b.report_content || null);
            }
            if (b.report_link !== undefined) {
                idx++; updates.push(`report_link = $${idx}`); vals.push(b.report_link || null);
            }

            if (updates.length === 0) {
                return reply.send({ ok: true, task });
            }

            updates.push(`updated_at = NOW()`);
            idx++; vals.push(taskId);

            const updated = await db.get(`
                UPDATE board_tasks SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *
            `, vals);

            return reply.send({ ok: true, task: updated });
        } catch(e) {
            console.error('[board-tasks PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PATCH /api/board-tasks/:id/status — Drag & drop status change
    fastify.patch('/api/board-tasks/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            const taskId = request.params.id;
            const { status } = request.body;

            if (!['can_lam', 'dang_lam', 'cho_duyet', 'hoan_thanh'].includes(status)) {
                return reply.code(400).send({ error: 'Trạng thái không hợp lệ' });
            }

            const task = await db.get(`SELECT * FROM board_tasks WHERE id = $1`, [taskId]);
            if (!task) return reply.code(404).send({ error: 'Không tìm thấy task' });

            // Permission: manager, creator, or assignee
            const isManager = canManageTasks(user);
            const isAssignee = task.assigned_to === user.id;
            const isCreator = task.created_by === user.id;
            if (!isManager && !isAssignee && !isCreator) {
                return reply.code(403).send({ error: 'Bạn không có quyền đổi trạng thái task này' });
            }

            let extraSql = '';
            if (status === 'hoan_thanh') {
                extraSql = ', completed_at = NOW(), progress = 100';
            } else if (status === 'dang_lam' && task.status === 'can_lam') {
                // Chuyển từ CẦN LÀM → ĐANG LÀM: ghi thời gian nhận việc
                extraSql = ', completed_at = NULL, accepted_at = NOW()';
            } else {
                extraSql = ', completed_at = NULL';
            }

            const updated = await db.get(`
                UPDATE board_tasks SET status = $1, updated_at = NOW() ${extraSql} WHERE id = $2 RETURNING *
            `, [status, taskId]);

            return reply.send({ ok: true, task: updated });
        } catch(e) {
            console.error('[board-tasks PATCH status]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/board-tasks/:id — Delete task
    fastify.delete('/api/board-tasks/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            const taskId = request.params.id;

            const task = await db.get(`SELECT * FROM board_tasks WHERE id = $1`, [taskId]);
            if (!task) return reply.code(404).send({ error: 'Không tìm thấy task' });

            // Delete permission rules:
            // 1. If status is 'can_lam': allowed for director or creator (assignor).
            // 2. If status is NOT 'can_lam' (dang_lam, cho_duyet, hoan_thanh): ONLY director can delete.
            if (task.status === 'can_lam') {
                if (user.role !== 'giam_doc' && task.created_by !== user.id) {
                    return reply.code(403).send({ error: 'Ở mục Cần Làm, chỉ Người giao việc hoặc Giám đốc mới có quyền xóa' });
                }
            } else {
                if (user.role !== 'giam_doc') {
                    return reply.code(403).send({ error: 'Công việc đã nhận làm, chỉ Giám đốc mới có quyền xóa' });
                }
            }

            await db.run(`DELETE FROM board_tasks WHERE id = $1`, [taskId]);
            return reply.send({ ok: true });
        } catch(e) {
            console.error('[board-tasks DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== COMMENTS ==========

    // GET /api/board-tasks/:id/comments
    fastify.get('/api/board-tasks/:id/comments', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const taskId = request.params.id;
            const comments = await db.all(`
                SELECT c.*, u.full_name as user_name, u.role as user_role
                FROM board_task_comments c
                LEFT JOIN users u ON u.id = c.user_id
                WHERE c.task_id = $1
                ORDER BY c.created_at ASC
            `, [taskId]);

            return reply.send({ comments });
        } catch(e) {
            console.error('[board-task-comments GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/board-tasks/:id/comments
    fastify.post('/api/board-tasks/:id/comments', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            const taskId = request.params.id;
            const { content } = request.body;

            if (!content || !content.trim()) {
                return reply.code(400).send({ error: 'Nội dung bình luận không được trống' });
            }

            const task = await db.get(`SELECT * FROM board_tasks WHERE id = $1`, [taskId]);
            if (!task) return reply.code(404).send({ error: 'Không tìm thấy task' });

            const comment = await db.get(`
                INSERT INTO board_task_comments (task_id, user_id, content)
                VALUES ($1, $2, $3) RETURNING *
            `, [taskId, user.id, content.trim()]);

            // Attach user info
            comment.user_name = user.full_name;
            comment.user_role = user.role;

            return reply.send({ ok: true, comment });
        } catch(e) {
            console.error('[board-task-comments POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== USERS FOR DROPDOWN ==========
    // GET /api/board-tasks/users — List users for assignment dropdown
    fastify.get('/api/board-tasks/users', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            const { department_id } = request.query;

            let where = [`u.status = 'active'`];
            let params = [];
            let pIdx = 0;

            // Always filter by enabled departments
            const enabledDepts = await getEnabledDeptIds();

            if (department_id) {
                pIdx++; where.push(`u.department_id = $${pIdx}`); params.push(department_id);
            } else if (user.role === 'giam_doc') {
                // Director: show users from all enabled departments only
                if (enabledDepts.length > 0) {
                    where.push(`u.department_id IN (${enabledDepts.map((_, i) => `$${pIdx + i + 1}`).join(',')})`);
                    enabledDepts.forEach(d => { pIdx++; params.push(d); });
                } else {
                    return reply.send({ users: [] });
                }
            } else {
                const userDeptId = await getUserDeptId(user);
                if (userDeptId) {
                    pIdx++; where.push(`u.department_id = $${pIdx}`); params.push(userDeptId);
                }
            }

            // Role hierarchy filtering for assignment dropdown:
            // 1. Giám đốc (giam_doc): can assign to ALL active users.
            // 2. Quản lý (quan_ly_cap_cao, quan_ly, quan_ly_xuong): self OR truong_phong OR nhan_vien.
            // 3. Trưởng phòng (truong_phong): self OR nhan_vien.
            // 4. Nhân viên (nhan_vien) & others: self ONLY.
            if (user.role === 'giam_doc') {
                // Director: no role restriction
            } else if (['quan_ly_cap_cao', 'quan_ly', 'quan_ly_xuong'].includes(user.role)) {
                pIdx++;
                where.push(`(u.id = $${pIdx} OR u.role IN ('truong_phong', 'nhan_vien'))`);
                params.push(user.id);
            } else if (user.role === 'truong_phong') {
                pIdx++;
                where.push(`(u.id = $${pIdx} OR u.role = 'nhan_vien')`);
                params.push(user.id);
            } else {
                pIdx++;
                where.push(`u.id = $${pIdx}`);
                params.push(user.id);
            }

            const users = await db.all(`
                SELECT u.id, u.full_name, u.role, u.department_id, d.name as department_name
                FROM users u
                LEFT JOIN departments d ON d.id = u.department_id
                WHERE ${where.join(' AND ')}
                ORDER BY u.full_name ASC
            `, params);

            return reply.send({ users });
        } catch(e) {
            console.error('[board-tasks/users GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });
    // ========== CHECKLIST ==========

    // GET /api/board-tasks/:id/checklist
    fastify.get('/api/board-tasks/:id/checklist', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const items = await db.all(`
                SELECT * FROM board_task_checklist WHERE task_id = $1 ORDER BY sort_order ASC, id ASC
            `, [request.params.id]);
            return reply.send({ checklist: items });
        } catch(e) {
            console.error('[board-task-checklist GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/board-tasks/:id/checklist — Add item
    fastify.post('/api/board-tasks/:id/checklist', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { title } = request.body;
            if (!title || !title.trim()) return reply.code(400).send({ error: 'Nội dung không được trống' });
            const item = await db.get(`
                INSERT INTO board_task_checklist (task_id, title, sort_order)
                VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order),0)+1 FROM board_task_checklist WHERE task_id = $1))
                RETURNING *
            `, [request.params.id, title.trim()]);
            return reply.send({ ok: true, item });
        } catch(e) {
            console.error('[board-task-checklist POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PATCH /api/board-tasks/:taskId/checklist/:itemId — Toggle done + record completed_at
    fastify.patch('/api/board-tasks/:taskId/checklist/:itemId', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { is_done } = request.body;
            const done = is_done !== false;
            const completedAt = done ? 'NOW()' : 'NULL';
            const item = await db.get(`
                UPDATE board_task_checklist
                SET is_done = $1, completed_at = ${completedAt}
                WHERE id = $2 AND task_id = $3 RETURNING *
            `, [done, request.params.itemId, request.params.taskId]);
            return reply.send({ ok: true, item });
        } catch(e) {
            console.error('[board-task-checklist PATCH]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PATCH /api/board-tasks/:taskId/checklist/:itemId/detail — Save content + link for checklist item
    fastify.patch('/api/board-tasks/:taskId/checklist/:itemId/detail', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { content, link } = request.body;
            const item = await db.get(`
                UPDATE board_task_checklist
                SET content = $1, link = $2
                WHERE id = $3 AND task_id = $4 RETURNING *
            `, [content || null, link || null, request.params.itemId, request.params.taskId]);
            return reply.send({ ok: true, item });
        } catch(e) {
            console.error('[board-task-checklist PATCH detail]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/board-tasks/:taskId/checklist/:itemId
    fastify.delete('/api/board-tasks/:taskId/checklist/:itemId', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            await db.run(`DELETE FROM board_task_checklist WHERE id = $1 AND task_id = $2`, [request.params.itemId, request.params.taskId]);
            return reply.send({ ok: true });
        } catch(e) {
            console.error('[board-task-checklist DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== FILE ATTACHMENTS ==========

    // GET /api/board-tasks/:id/attachments
    fastify.get('/api/board-tasks/:id/attachments', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const files = await db.all(`
                SELECT a.*, u.full_name as uploaded_by_name
                FROM board_task_attachments a
                LEFT JOIN users u ON u.id = a.uploaded_by
                WHERE a.task_id = $1 ORDER BY a.created_at DESC
            `, [request.params.id]);
            return reply.send({ attachments: files });
        } catch(e) {
            console.error('[board-task-attachments GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/board-tasks/:id/attachments — Upload file
    fastify.post('/api/board-tasks/:id/attachments', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            const taskId = request.params.id;
            const data = await request.file();
            if (!data) return reply.code(400).send({ error: 'Không có file' });

            const ext = path.extname(data.filename) || '';
            const safeName = 'task' + taskId + '_' + Date.now() + ext;
            const filePath = path.join(UPLOAD_DIR, safeName);

            // Save file
            const writeStream = fs.createWriteStream(filePath);
            await new Promise((resolve, reject) => {
                data.file.pipe(writeStream);
                data.file.on('end', resolve);
                data.file.on('error', reject);
            });

            const webPath = '/uploads/board/' + safeName;
            const attachment = await db.get(`
                INSERT INTO board_task_attachments (task_id, file_name, file_path, uploaded_by)
                VALUES ($1, $2, $3, $4) RETURNING *
            `, [taskId, data.filename, webPath, user.id]);

            attachment.uploaded_by_name = user.full_name;
            return reply.send({ ok: true, attachment });
        } catch(e) {
            console.error('[board-task-attachments POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/board-tasks/:taskId/attachments/:attId
    fastify.delete('/api/board-tasks/:taskId/attachments/:attId', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const att = await db.get(`SELECT * FROM board_task_attachments WHERE id = $1 AND task_id = $2`, [request.params.attId, request.params.taskId]);
            if (att) {
                // Delete file from disk
                const fullPath = path.join(__dirname, '..', 'public', att.file_path);
                try { fs.unlinkSync(fullPath); } catch(e) { /* file may not exist */ }
                await db.run(`DELETE FROM board_task_attachments WHERE id = $1`, [request.params.attId]);
            }
            return reply.send({ ok: true });
        } catch(e) {
            console.error('[board-task-attachments DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });
}

module.exports = bangcongviecRoutes;
