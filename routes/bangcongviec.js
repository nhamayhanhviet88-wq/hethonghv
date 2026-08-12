/**
 * Bảng Công Việc — Task Board (Kanban)
 * Routes: /api/board-tasks, /api/board-config
 * Auto-migrate: board_config, board_tasks, board_task_comments, board_task_attachments, board_task_checklist
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'board');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DOC_UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'board_docs');
if (!fs.existsSync(DOC_UPLOAD_DIR)) fs.mkdirSync(DOC_UPLOAD_DIR, { recursive: true });

// Auto-sync old uploads to public/uploads/board_docs
const OLD_DOC_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'board_docs');
if (fs.existsSync(OLD_DOC_UPLOAD_DIR)) {
    try {
        const files = fs.readdirSync(OLD_DOC_UPLOAD_DIR);
        for (const f of files) {
            const src = path.join(OLD_DOC_UPLOAD_DIR, f);
            const dest = path.join(DOC_UPLOAD_DIR, f);
            if (!fs.existsSync(dest) && fs.statSync(src).isFile()) {
                fs.copyFileSync(src, dest);
            }
        }
    } catch(e) {}
}

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

    // Add task_link & assigned_to_ids column if not exists
    try {
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS task_link TEXT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS guide_link TEXT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS assigned_to_ids TEXT`);
    } catch(e) { /* already exists */ }

    // Add report columns if not exists
    try {
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS report_content TEXT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS report_link TEXT`);
    } catch(e) { /* already exists */ }

    // board_documents
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS board_documents (
            id SERIAL PRIMARY KEY,
            department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
            department_name TEXT,
            main_category TEXT NOT NULL,
            sub_category TEXT NOT NULL,
            title TEXT,
            content TEXT,
            links JSONB DEFAULT '[]',
            created_by INTEGER REFERENCES users(id),
            created_by_name TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* already exists */ }

    // board_document_attachments
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS board_document_attachments (
            id SERIAL PRIMARY KEY,
            document_id INTEGER NOT NULL REFERENCES board_documents(id) ON DELETE CASCADE,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            uploaded_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* already exists */ }

    // board_task_feedbacks (Lịch sử yêu cầu sửa lại)
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS board_task_feedbacks (
            id SERIAL PRIMARY KEY,
            task_id INTEGER NOT NULL REFERENCES board_tasks(id) ON DELETE CASCADE,
            reviewer_id INTEGER REFERENCES users(id),
            reviewer_name TEXT,
            feedback_content TEXT NOT NULL,
            feedback_link TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`);
    } catch(e) { /* already exists */ }

    // Add accepted_at column if not exists
    try {
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS review_comment TEXT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS feedback_content TEXT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS feedback_link TEXT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`);
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
            if (!['giam_doc', 'quan_ly_cap_cao'].includes(user.role)) {
                return reply.code(403).send({ error: 'Bạn không có quyền xem cài đặt phòng ban' });
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
            if (!['giam_doc', 'quan_ly_cap_cao'].includes(user.role)) {
                return reply.code(403).send({ error: 'Bạn không có quyền cài đặt phòng ban' });
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
            const { status, priority, assigned_to, department_id, search, tab, hoan_thanh_from, hoan_thanh_to } = request.query;

            // Check department access
            const enabledDepts = await getEnabledDeptIds();
            const userDeptId = await getUserDeptId(user);

            if (enabledDepts.length === 0 && user.role !== 'giam_doc') {
                return reply.send({ tasks: [] });
            }

            let where = ['1=1'];
            let params = [];
            let pIdx = 0;

            // Date range filter strictly for status = 'hoan_thanh'
            if (hoan_thanh_from && hoan_thanh_to) {
                pIdx++; const pFrom = pIdx; params.push(hoan_thanh_from);
                pIdx++; const pTo = pIdx; params.push(hoan_thanh_to);
                where.push(`(t.status != 'hoan_thanh' OR COALESCE(t.completed_at, t.updated_at, t.created_at) BETWEEN $${pFrom}::timestamp AND $${pTo}::timestamp)`);
            } else if (hoan_thanh_from) {
                pIdx++; params.push(hoan_thanh_from);
                where.push(`(t.status != 'hoan_thanh' OR COALESCE(t.completed_at, t.updated_at, t.created_at) >= $${pIdx}::timestamp)`);
            } else if (hoan_thanh_to) {
                pIdx++; params.push(hoan_thanh_to);
                where.push(`(t.status != 'hoan_thanh' OR COALESCE(t.completed_at, t.updated_at, t.created_at) <= $${pIdx}::timestamp)`);
            }

            // Department isolation & tab filtering
            if (user.role === 'giam_doc') {
                if (department_id) {
                    pIdx++; where.push(`t.department_id = $${pIdx}`); params.push(Number(department_id));
                }
                if (tab === 'me') {
                    pIdx++; where.push(`(t.assigned_to = $${pIdx} OR (t.assigned_to_ids IS NOT NULL AND $${pIdx}::text = ANY(string_to_array(t.assigned_to_ids, ','))))`); params.push(user.id);
                } else if (tab === 'ban_giao' || tab === 'phong') {
                    pIdx++; where.push(`(t.assigned_to IS NULL OR (t.assigned_to != $${pIdx} AND (t.assigned_to_ids IS NULL OR NOT ($${pIdx}::text = ANY(string_to_array(t.assigned_to_ids, ','))))))`); params.push(user.id);
                }
            } else if (user.role === 'quan_ly_cap_cao') {
                if (department_id) {
                    pIdx++; where.push(`t.department_id = $${pIdx}`); params.push(Number(department_id));
                }
                if (tab === 'me') {
                    pIdx++; where.push(`(t.assigned_to = $${pIdx} OR (t.assigned_to_ids IS NOT NULL AND $${pIdx}::text = ANY(string_to_array(t.assigned_to_ids, ','))))`); params.push(user.id);
                } else if (tab === 'ban_giao' || tab === 'phong') {
                    pIdx++; where.push(`t.created_by = $${pIdx}`); params.push(user.id);
                } else {
                    pIdx++; where.push(`(t.created_by = $${pIdx} OR t.assigned_to = $${pIdx} OR (t.assigned_to_ids IS NOT NULL AND $${pIdx}::text = ANY(string_to_array(t.assigned_to_ids, ','))))`); params.push(user.id);
                }
            } else {
                if (userDeptId && enabledDepts.includes(userDeptId)) {
                    pIdx++; where.push(`t.department_id = $${pIdx}`); params.push(userDeptId);
                }
                if (tab === 'me') {
                    pIdx++; where.push(`(t.assigned_to = $${pIdx} OR (t.assigned_to_ids IS NOT NULL AND $${pIdx}::text = ANY(string_to_array(t.assigned_to_ids, ','))))`); params.push(user.id);
                } else if (tab === 'ban_giao' || tab === 'phong') {
                    pIdx++; where.push(`(t.created_by = $${pIdx} OR t.department_id = $${pIdx + 1}) AND (t.assigned_to IS NULL OR (t.assigned_to != $${pIdx} AND (t.assigned_to_ids IS NULL OR NOT ($${pIdx}::text = ANY(string_to_array(t.assigned_to_ids, ','))))))`);
                    params.push(user.id);
                    params.push(userDeptId);
                    pIdx++;
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
                pIdx++; where.push(`(t.assigned_to = $${pIdx} OR (t.assigned_to_ids IS NOT NULL AND $${pIdx}::text = ANY(string_to_array(t.assigned_to_ids, ','))))`); params.push(assigned_to);
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

            // Enrich assigned_to_name for tasks with multiple assignees
            for (const task of tasks) {
                if (task.assigned_to_ids) {
                    const ids = task.assigned_to_ids.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
                    if (ids.length > 0) {
                        const assignees = await db.all(`SELECT full_name FROM users WHERE id = ANY($1::int[])`, [ids]);
                        if (assignees && assignees.length > 0) {
                            task.assigned_to_name = assignees.map(a => a.full_name).join(', ');
                        }
                    }
                }
            }

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

            const { title, description, priority, task_type, assigned_to, assigned_to_ids, department_id, deadline, task_link, guide_link, checklist } = request.body;
            if (!title || !title.trim()) {
                return reply.code(400).send({ error: 'Tiêu đề không được để trống' });
            }

            let assignedToPrimary = assigned_to;
            let assignedToIdsStr = null;

            if (Array.isArray(assigned_to_ids) && assigned_to_ids.length > 0) {
                assignedToPrimary = Number(assigned_to_ids[0]);
                assignedToIdsStr = assigned_to_ids.map(id => String(id).trim()).filter(Boolean).join(',');
            } else if (typeof assigned_to_ids === 'string' && assigned_to_ids.trim()) {
                assignedToIdsStr = assigned_to_ids.trim();
                const parts = assignedToIdsStr.split(',');
                if (parts[0]) assignedToPrimary = Number(parts[0]);
            } else if (assigned_to) {
                assignedToPrimary = Number(assigned_to);
                assignedToIdsStr = String(assigned_to);
            }

            // Department validation
            let deptId = department_id;
            if (!['giam_doc', 'quan_ly_cap_cao'].includes(user.role) || !deptId) {
                deptId = await getUserDeptId(user);
            }
            if (!deptId && assignedToPrimary) {
                const assignee = await db.get(`SELECT department_id FROM users WHERE id = $1`, [assignedToPrimary]);
                if (assignee) deptId = assignee.department_id;
            }

            // Validate assignment hierarchy permission rules:
            if (assignedToPrimary && Number(assignedToPrimary) !== user.id && !['giam_doc', 'quan_ly_cap_cao'].includes(user.role)) {
                const targetUser = await db.get(`SELECT id, role FROM users WHERE id = $1`, [assignedToPrimary]);
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
                INSERT INTO board_tasks (title, description, status, priority, task_type, department_id, assigned_to, assigned_to_ids, created_by, deadline, task_link, guide_link)
                VALUES ($1, $2, 'can_lam', $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                title.trim(),
                description || null,
                priority || 'trung_binh',
                task_type || 'chinh',
                deptId || null,
                assignedToPrimary || null,
                assignedToIdsStr || null,
                user.id,
                deadline || null,
                task_link || null,
                guide_link || null
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
            if (isAssignee && !isManager && !isCreator && ['cho_duyet', 'hoan_thanh'].includes(task.status)) {
                return reply.code(403).send({ error: 'Công việc đã nộp hoặc hoàn thành, bạn không thể chỉnh sửa!' });
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
                if (b.guide_link !== undefined) { idx++; updates.push(`guide_link = $${idx}`); vals.push(b.guide_link || null); }
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
    
    // PATCH /api/board-tasks/:id/review — Approve or Reject task
    fastify.patch('/api/board-tasks/:id/review', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            const taskId = request.params.id;
            const { action, review_comment, feedback_content, feedback_link } = request.body;

            const task = await db.get(`SELECT * FROM board_tasks WHERE id = $1`, [taskId]);
            if (!task) return reply.code(404).send({ error: 'Không tìm thấy task' });

            const isManager = canManageTasks(user);
            const isCreator = task.created_by === user.id;

            if (!isManager && !isCreator && user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Bạn không có quyền duyệt task này' });
            }

            if (action === 'approve') {
                const updated = await db.get(`
                    UPDATE board_tasks 
                    SET status = 'hoan_thanh', progress = 100, completed_at = NOW(), 
                        review_comment = $1, reviewed_at = NOW(), updated_at = NOW()
                    WHERE id = $2 RETURNING *
                `, [review_comment || null, taskId]);

                return reply.send({ ok: true, task: updated });
            } else if (action === 'reject') {
                if (!feedback_content || !feedback_content.trim()) {
                    return reply.code(400).send({ error: 'Vui lòng nhập nội dung Feedback yêu cầu sửa!' });
                }

                let cleanFeedbackLink = feedback_link ? feedback_link.trim() : null;
                if (cleanFeedbackLink) {
                    var isUrl = /^https?:\/\/.+/i.test(cleanFeedbackLink) || /^([\w\-]+\.)+[\w\-]+(\/.*)?$/i.test(cleanFeedbackLink);
                    if (!isUrl) {
                        return reply.code(400).send({ error: 'Đường link Feedback sửa phải là một đường link hợp lệ (ví dụ: https://... hoặc http://...)' });
                    }
                    if (!/^https?:\/\//i.test(cleanFeedbackLink)) {
                        cleanFeedbackLink = 'http://' + cleanFeedbackLink;
                    }
                }

                // 1. Tự động sao lưu feedback cũ trong board_tasks nếu chưa có bản ghi lịch sử nào
                try {
                    const existingFbs = await db.all(`SELECT id FROM board_task_feedbacks WHERE task_id = $1`, [taskId]);
                    if (existingFbs.length === 0 && task.feedback_content && task.feedback_content.trim()) {
                        const oldTime = task.reviewed_at || task.updated_at || new Date(Date.now() - 5000);
                        await db.run(`
                            INSERT INTO board_task_feedbacks (task_id, reviewer_id, reviewer_name, feedback_content, feedback_link, created_at)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `, [taskId, task.created_by || user.id, 'Quản Lý', task.feedback_content.trim(), task.feedback_link || null, oldTime]);
                    }
                } catch(eOld) {
                    console.error('[board_task_feedbacks old backup error]', eOld);
                }

                // 2. Lưu feedback mới vào bảng lịch sử board_task_feedbacks
                try {
                    await db.run(`
                        INSERT INTO board_task_feedbacks (task_id, reviewer_id, reviewer_name, feedback_content, feedback_link, created_at)
                        VALUES ($1, $2, $3, $4, $5, NOW())
                    `, [taskId, user.id, user.full_name || user.username, feedback_content.trim(), cleanFeedbackLink]);
                } catch(errFB) {
                    console.error('[board_task_feedbacks insert error]', errFB);
                }

                // 3. Cập nhật task
                const updated = await db.get(`
                    UPDATE board_tasks 
                    SET status = 'dang_lam', feedback_content = $1, feedback_link = $2, 
                        reviewed_at = NOW(), updated_at = NOW()
                    WHERE id = $3 RETURNING *
                `, [feedback_content.trim(), cleanFeedbackLink, taskId]);

                return reply.send({ ok: true, task: updated });
            } else {
                return reply.code(400).send({ error: 'Hành động không hợp lệ' });
            }
        } catch(e) {
            console.error('[board-tasks PATCH review]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/board-tasks/:id/feedbacks — Fetch full revision history
    fastify.get('/api/board-tasks/:id/feedbacks', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const taskId = request.params.id;
            let feedbacks = await db.all(`
                SELECT f.*, u.full_name as reviewer_name
                FROM board_task_feedbacks f
                LEFT JOIN users u ON u.id = f.reviewer_id
                WHERE f.task_id = $1
                ORDER BY f.created_at DESC, f.id DESC
            `, [taskId]);

            // Fallback: If no historical records exist yet in board_task_feedbacks, check board_tasks.feedback_content
            if (feedbacks.length === 0) {
                const task = await db.get(`SELECT feedback_content, feedback_link, reviewed_at FROM board_tasks WHERE id = $1`, [taskId]);
                if (task && task.feedback_content && task.feedback_content.trim()) {
                    feedbacks = [{
                        id: 'legacy',
                        task_id: taskId,
                        reviewer_name: 'Quản Lý',
                        feedback_content: task.feedback_content,
                        feedback_link: task.feedback_link,
                        created_at: task.reviewed_at || new Date()
                    }];
                }
            }

            return reply.send({ ok: true, feedbacks });
        } catch(e) {
            console.error('[board-tasks GET feedbacks]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

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

            // Delete permission rule: ONLY Director can delete tasks across all columns
            if (user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ Giám đốc mới có quyền xóa công việc!' });
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
            } else if (['giam_doc', 'quan_ly_cap_cao'].includes(user.role)) {
                // Director & Senior Manager: show users from all enabled departments only
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
            // 1. Giám đốc (giam_doc) & Quản lý cấp cao (quan_ly_cap_cao): can assign to ALL active users.
            // 2. Quản lý (quan_ly, quan_ly_xuong): self OR truong_phong OR nhan_vien.
            // 3. Trưởng phòng (truong_phong): self OR nhan_vien.
            // 4. Nhân viên (nhan_vien) & others: self ONLY.
            if (['giam_doc', 'quan_ly_cap_cao'].includes(user.role)) {
                // Director & Senior Manager: no role restriction
            } else if (['quan_ly', 'quan_ly_xuong'].includes(user.role)) {
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
                SET content = $1, link = $2,
                    completed_at = CASE WHEN is_done = TRUE THEN NOW() ELSE completed_at END
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

    // ========== TƯ LIỆU (BOARD DOCUMENTS) ROUTES ==========

    // Static route to serve document attachments
    fastify.get('/uploads/board_docs/:filename', async (request, reply) => {
        try {
            const filename = request.params.filename;
            let filePath = path.join(DOC_UPLOAD_DIR, filename);
            if (!fs.existsSync(filePath)) {
                filePath = path.join(__dirname, '..', 'uploads', 'board_docs', filename);
            }
            if (!fs.existsSync(filePath)) {
                return reply.code(404).send({ error: 'File not found' });
            }
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp' };
            reply.type(mimeMap[ext] || 'application/octet-stream');
            return fs.createReadStream(filePath);
        } catch(e) {
            return reply.code(404).send({ error: 'File not found' });
        }
    });

    // GET /api/board-documents
    fastify.get('/api/board-documents', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const user = req.user;
            const userDeptId = await getUserDeptId(user);
            const { department_id, main_category, search } = req.query;
            let query = `
                SELECT d.*, u.full_name as created_by_name
                FROM board_documents d
                LEFT JOIN users u ON d.created_by = u.id
                WHERE 1=1
            `;
            const params = [];
            let idx = 1;

            // Department permission check:
            if (['giam_doc', 'quan_ly_cap_cao'].includes(user.role)) {
                if (department_id) {
                    query += ` AND d.department_id = $${idx++}`;
                    params.push(Number(department_id));
                }
            } else {
                // Non-directors/non-senior-managers: strictly locked to their own department
                if (userDeptId) {
                    query += ` AND d.department_id = $${idx++}`;
                    params.push(userDeptId);
                } else {
                    query += ` AND 1=0`;
                }
            }
            if (main_category) {
                query += ` AND d.main_category = $${idx++}`;
                params.push(main_category);
            }
            if (search && search.trim()) {
                query += ` AND (d.main_category ILIKE $${idx} OR d.sub_category ILIKE $${idx} OR d.title ILIKE $${idx} OR d.content ILIKE $${idx})`;
                params.push('%' + search.trim() + '%');
                idx++;
            }

            query += ` ORDER BY d.main_category ASC, d.sub_category ASC, d.created_at DESC`;

            const documents = await db.all(query, params);

            // Fetch all tasks with guide_link to match linked tasks
            const allTasksWithGuides = await db.all(`
                SELECT id, title, guide_link FROM board_tasks 
                WHERE guide_link IS NOT NULL AND guide_link != '' AND guide_link != '[]'
            `);

            // Fetch attachments & linked tasks for each document
            for (const doc of documents) {
                doc.links = typeof doc.links === 'string' ? JSON.parse(doc.links) : (doc.links || []);
                const atts = await db.all(`SELECT * FROM board_document_attachments WHERE document_id = $1 ORDER BY id ASC`, [doc.id]);
                doc.attachments = atts;

                const linked = [];
                const docSub = (doc.sub_category || '').trim().toLowerCase();
                const docTaskCode = (doc.task_code || '').trim().toUpperCase();

                allTasksWithGuides.forEach(task => {
                    const cvCode = 'CV-' + String(task.id).padStart(3, '0');
                    if (docTaskCode && (docTaskCode === cvCode || docTaskCode === String(task.id))) {
                        if (!linked.some(x => x.id === task.id)) linked.push({ id: task.id, cv_code: cvCode, title: task.title });
                        return;
                    }

                    let guides = [];
                    try {
                        guides = typeof task.guide_link === 'string' ? JSON.parse(task.guide_link) : (task.guide_link || []);
                    } catch(e){}

                    if (Array.isArray(guides)) {
                        const isMatched = guides.some(g => {
                            const gSub = (g.subCat || '').trim().toLowerCase();
                            const gPrefix = (g.prefix || '').trim().toLowerCase();
                            return gSub === docSub || gPrefix.includes(docSub) || docSub.includes(gSub);
                        });
                        if (isMatched && !linked.some(x => x.id === task.id)) {
                            linked.push({ id: task.id, cv_code: cvCode, title: task.title });
                        }
                    }
                });

                doc.linked_tasks = linked;
            }

            return reply.send({ ok: true, documents });
        } catch(e) {
            console.error('[board-documents GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/board-documents
    fastify.post('/api/board-documents', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const user = req.user;
            const { department_id, main_category, sub_category, title, content, links, task_code } = req.body;

            if (!main_category || !main_category.trim()) {
                return reply.code(400).send({ error: 'Tên mục chính là bắt buộc' });
            }
            if (!sub_category || !sub_category.trim()) {
                return reply.code(400).send({ error: 'Tên mục phụ là bắt buộc' });
            }

            let deptName = '';
            if (department_id) {
                const dept = await db.get(`SELECT name FROM departments WHERE id = $1`, [department_id]);
                if (dept) deptName = dept.name;
            }

            const linksJson = JSON.stringify(Array.isArray(links) ? links : []);

            const doc = await db.get(`
                INSERT INTO board_documents (department_id, department_name, main_category, sub_category, title, content, links, task_code, created_by, created_by_name)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `, [
                department_id || null,
                deptName,
                main_category.trim(),
                sub_category.trim(),
                (title || sub_category).trim(),
                content || '',
                linksJson,
                (task_code || '').trim(),
                user.id,
                user.full_name || user.username
            ]);

            return reply.send({ ok: true, document: doc });
        } catch(e) {
            console.error('[board-documents POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/board-documents/:id
    fastify.put('/api/board-documents/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const docId = req.params.id;
            const { department_id, main_category, sub_category, title, content, links, task_code } = req.body;

            let deptName = '';
            if (department_id) {
                const dept = await db.get(`SELECT name FROM departments WHERE id = $1`, [department_id]);
                if (dept) deptName = dept.name;
            }

            const linksJson = JSON.stringify(Array.isArray(links) ? links : []);

            await db.run(`
                UPDATE board_documents
                SET department_id = $1, department_name = $2, main_category = $3, sub_category = $4, title = $5, content = $6, links = $7, task_code = $8, updated_at = NOW()
                WHERE id = $9
            `, [
                department_id || null,
                deptName,
                (main_category || '').trim(),
                (sub_category || '').trim(),
                (title || sub_category || '').trim(),
                content || '',
                linksJson,
                (task_code || '').trim(),
                docId
            ]);

            const doc = await db.get(`SELECT * FROM board_documents WHERE id = $1`, [docId]);
            return reply.send({ ok: true, document: doc });
        } catch(e) {
            console.error('[board-documents PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/board-documents/:id
    fastify.delete('/api/board-documents/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const docId = req.params.id;
            const atts = await db.all(`SELECT file_path FROM board_document_attachments WHERE document_id = $1`, [docId]);
            for (const att of atts) {
                const fullPath = path.join(__dirname, '..', 'public', att.file_path);
                try { fs.unlinkSync(fullPath); } catch(e) {}
            }
            await db.run(`DELETE FROM board_documents WHERE id = $1`, [docId]);
            return reply.send({ ok: true });
        } catch(e) {
            console.error('[board-documents DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/board-documents/:id/attachments
    fastify.post('/api/board-documents/:id/attachments', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const docId = req.params.id;
            const user = req.user;
            const data = await req.file();
            if (!data) return reply.code(400).send({ error: 'No file uploaded' });

            const ext = path.extname(data.filename) || '.png';
            const safeName = `doc_${docId}_${Date.now()}${ext}`;
            const filePath = path.join(DOC_UPLOAD_DIR, safeName);

            const writeStream = fs.createWriteStream(filePath);
            await new Promise((resolve, reject) => {
                data.file.pipe(writeStream);
                data.file.on('end', resolve);
                data.file.on('error', reject);
            });

            const webPath = '/uploads/board_docs/' + safeName;
            const attachment = await db.get(`
                INSERT INTO board_document_attachments (document_id, file_name, file_path, uploaded_by)
                VALUES ($1, $2, $3, $4) RETURNING *
            `, [docId, data.filename, webPath, user.id]);

            return reply.send({ ok: true, attachment });
        } catch(e) {
            console.error('[board-document-attachments POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/board-documents/attachments/:attId
    fastify.delete('/api/board-documents/attachments/:attId', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const att = await db.get(`SELECT * FROM board_document_attachments WHERE id = $1`, [req.params.attId]);
            if (att) {
                const fullPath = path.join(__dirname, '..', 'public', att.file_path);
                try { fs.unlinkSync(fullPath); } catch(e) {}
                await db.run(`DELETE FROM board_document_attachments WHERE id = $1`, [req.params.attId]);
            }
            return reply.send({ ok: true });
        } catch(e) {
            console.error('[board-document-attachments DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });
}

module.exports = bangcongviecRoutes;
