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
    try {
        await db.run(`ALTER TABLE board_task_checklist ADD COLUMN IF NOT EXISTS report_content TEXT`);
        await db.run(`ALTER TABLE board_task_checklist ADD COLUMN IF NOT EXISTS report_link TEXT`);
    } catch(e) { /* already exists */ }

    // Add task_link & assigned_to_ids column if not exists
    try {
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS task_link TEXT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS guide_link TEXT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS assigned_to_ids TEXT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS collection_id INT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS ads_linh_vuc VARCHAR(255)`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS target_quantity INT`);
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
        await db.run(`ALTER TABLE board_documents ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`);
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
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS director_read BOOLEAN DEFAULT FALSE`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS director_read_at TIMESTAMP`);
    } catch(e) { /* already exists */ }

    try {
        await db.run(`CREATE TABLE IF NOT EXISTS board_task_reads (
            id SERIAL PRIMARY KEY,
            task_id INTEGER NOT NULL REFERENCES board_tasks(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT uq_btr_task_user UNIQUE(task_id, user_id)
        )`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_btr_task_user ON board_task_reads(task_id, user_id)`);
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

    // GET /api/board-tasks/deadline-stats — Thống kê Tỉ lệ hoàn thành Deadline phân tầng theo Phòng Ban & Nhân Sự
    fastify.get('/api/board-tasks/deadline-stats', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            const { mode = 'thang', month, quarter, year, fromDate, toDate, department_id } = request.query;

            const enabledDepts = await getEnabledDeptIds();
            const userDeptId = await getUserDeptId(user);

            // Determine target date range
            let startDate, endDate, timeLabel;
            const now = new Date();
            const curYear = year ? parseInt(year, 10) : now.getFullYear();
            const curMonth = month ? parseInt(month, 10) : (now.getMonth() + 1);

            if (mode === 'quy') {
                const q = quarter ? parseInt(quarter, 10) : Math.floor((curMonth - 1) / 3) + 1;
                const startM = (q - 1) * 3 + 1;
                const endM = q * 3;
                startDate = `${curYear}-${String(startM).padStart(2, '0')}-01 00:00:00`;
                const lastDay = new Date(curYear, endM, 0).getDate();
                endDate = `${curYear}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`;
                timeLabel = `Quý ${q}/${curYear}`;
            } else if (mode === 'nam') {
                startDate = `${curYear}-01-01 00:00:00`;
                endDate = `${curYear}-12-31 23:59:59`;
                timeLabel = `Năm ${curYear}`;
            } else if (mode === 'ngay' && fromDate && toDate) {
                startDate = `${fromDate} 00:00:00`;
                endDate = `${toDate} 23:59:59`;
                timeLabel = `Từ ${fromDate} đến ${toDate}`;
            } else {
                // Default: thang
                startDate = `${curYear}-${String(curMonth).padStart(2, '0')}-01 00:00:00`;
                const lastDay = new Date(curYear, curMonth, 0).getDate();
                endDate = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`;
                timeLabel = `Tháng ${curMonth}/${curYear}`;
            }

            // Fetch departments
            if (enabledDepts.length === 0 && user.role !== 'giam_doc') {
                return reply.send({ ok: true, time_label: timeLabel, summary: { total_tasks: 0, on_time_count: 0, late_count: 0, overdue_count: 0, on_time_rate: 100 }, departments: [] });
            }

            let deptWhere = [];
            let deptParams = [];
            if (user.role !== 'giam_doc' && user.role !== 'quan_ly_cap_cao') {
                if (userDeptId) {
                    deptWhere.push(`id = $1`);
                    deptParams.push(userDeptId);
                } else {
                    deptWhere.push(`id = ANY($1::int[])`);
                    deptParams.push(enabledDepts);
                }
            } else if (department_id) {
                deptWhere.push(`id = $1`);
                deptParams.push(parseInt(department_id, 10));
            } else {
                deptWhere.push(`id = ANY($1::int[])`);
                deptParams.push(enabledDepts);
            }

            const depts = await db.all(`SELECT id, name FROM departments WHERE ${deptWhere.join(' AND ')} ORDER BY id ASC`, deptParams);

            // Fetch users for these departments
            const deptIds = depts.map(d => d.id);
            if (deptIds.length === 0) {
                return reply.send({ ok: true, time_label: timeLabel, summary: { total_tasks: 0, on_time_count: 0, late_count: 0, overdue_count: 0, on_time_rate: 100 }, departments: [] });
            }

            const deptUsers = await db.all(`
                SELECT id, username, full_name, role, department_id 
                FROM users 
                WHERE department_id = ANY($1::int[])
                ORDER BY CASE role WHEN 'truong_phong' THEN 1 WHEN 'quan_ly' THEN 2 ELSE 3 END, full_name ASC
            `, [deptIds]);

            // Fetch tasks in range
            const tasks = await db.all(`
                SELECT t.id, t.title, t.status, t.priority, t.department_id, t.assigned_to, t.assigned_to_ids, t.created_by, t.deadline, t.completed_at, t.updated_at, t.created_at
                FROM board_tasks t
                WHERE t.department_id = ANY($1::int[])
                  AND (
                      (t.status = 'hoan_thanh' AND COALESCE(t.completed_at, t.updated_at, t.created_at) BETWEEN $2::timestamp AND $3::timestamp)
                      OR (t.status != 'hoan_thanh' AND (t.deadline BETWEEN $2::date AND $3::date OR t.created_at BETWEEN $2::timestamp AND $3::timestamp))
                  )
            `, [deptIds, startDate, endDate]);

            // Process stats per department and per user
            let grandTotal = 0;
            let grandOnTime = 0;
            let grandLate = 0;
            let grandOverdue = 0;
            let grandInProgress = 0;

            const nowTime = new Date().getTime();

            const deptResults = depts.map(dept => {
                const deptTasks = tasks.filter(t => t.department_id === dept.id);
                const usersInDept = deptUsers.filter(u => u.department_id === dept.id);

                let dTotal = 0, dOnTime = 0, dLate = 0, dOverdue = 0, dInProgress = 0;

                const userResults = usersInDept.map(u => {
                    const uTasks = deptTasks.filter(t => {
                        if (t.assigned_to === u.id) return true;
                        if (t.assigned_to_ids) {
                            const ids = t.assigned_to_ids.split(',');
                            return ids.includes(String(u.id));
                        }
                        return false;
                    });

                    let uOnTime = 0, uLate = 0, uOverdue = 0, uInProgress = 0;
                    uTasks.forEach(t => {
                        const dlStr = t.deadline ? t.deadline + 'T23:59:59+07:00' : null;
                        const dlTime = dlStr ? new Date(dlStr).getTime() : null;

                        if (t.status === 'hoan_thanh') {
                            const compTime = t.completed_at ? new Date(t.completed_at).getTime() : new Date(t.updated_at || t.created_at).getTime();
                            if (dlTime && compTime > dlTime) {
                                uLate++;
                            } else {
                                uOnTime++;
                            }
                        } else {
                            if (dlTime && nowTime > dlTime) {
                                uOverdue++;
                            } else {
                                uInProgress++;
                            }
                        }
                    });

                    const uTotal = uTasks.length;
                    const uEvaluated = uOnTime + uLate + uOverdue;
                    const uRate = uEvaluated > 0 ? Math.round((uOnTime / uEvaluated) * 1000) / 10 : 100;

                    let roleTitle = 'Nhân Viên';
                    if (u.role === 'truong_phong') roleTitle = 'Trưởng Phòng';
                    else if (u.role === 'quan_ly') roleTitle = 'Quản Lý';
                    else if (u.role === 'giam_doc') roleTitle = 'Giám Đốc';

                    return {
                        id: u.id,
                        username: u.username,
                        full_name: u.full_name || u.username,
                        role: u.role,
                        role_name: roleTitle,
                        total_tasks: uTotal,
                        on_time_count: uOnTime,
                        late_completed_count: uLate,
                        overdue_pending_count: uOverdue,
                        in_progress_count: uInProgress,
                        on_time_rate: uRate
                    };
                });

                // Sum up user assignments for department summary so header badges match table rows sum 100%
                userResults.forEach(u => {
                    dTotal += u.total_tasks;
                    dOnTime += u.on_time_count;
                    dLate += u.late_completed_count;
                    dOverdue += u.overdue_pending_count;
                    dInProgress += u.in_progress_count;
                });

                // Also account for any unassigned tasks in the department
                const unassignedTasks = deptTasks.filter(t => !t.assigned_to && !t.assigned_to_ids);
                unassignedTasks.forEach(t => {
                    const dlStr = t.deadline ? t.deadline + 'T23:59:59+07:00' : null;
                    const dlTime = dlStr ? new Date(dlStr).getTime() : null;

                    if (t.status === 'hoan_thanh') {
                        const compTime = t.completed_at ? new Date(t.completed_at).getTime() : new Date(t.updated_at || t.created_at).getTime();
                        if (dlTime && compTime > dlTime) {
                            dLate++;
                        } else {
                            dOnTime++;
                        }
                    } else {
                        if (dlTime && nowTime > dlTime) {
                            dOverdue++;
                        } else {
                            dInProgress++;
                        }
                    }
                    dTotal++;
                });

                const dEvaluated = dOnTime + dLate + dOverdue;
                const dRate = dEvaluated > 0 ? Math.round((dOnTime / dEvaluated) * 1000) / 10 : 100;

                grandTotal += dTotal;
                grandOnTime += dOnTime;
                grandLate += dLate;
                grandOverdue += dOverdue;
                grandInProgress += dInProgress;

                return {
                    id: dept.id,
                    name: dept.name,
                    total_tasks: dTotal,
                    on_time_count: dOnTime,
                    late_completed_count: dLate,
                    overdue_pending_count: dOverdue,
                    in_progress_count: dInProgress,
                    on_time_rate: dRate,
                    users: userResults
                };
            });

            const grandEvaluated = grandOnTime + grandLate + grandOverdue;
            const grandRate = grandEvaluated > 0 ? Math.round((grandOnTime / grandEvaluated) * 1000) / 10 : 100;

            return reply.send({
                ok: true,
                time_label: timeLabel,
                summary: {
                    total_tasks: grandTotal,
                    on_time_count: grandOnTime,
                    late_count: grandLate,
                    overdue_count: grandOverdue,
                    in_progress_count: grandInProgress,
                    on_time_rate: grandRate
                },
                departments: deptResults
            });
        } catch(e) {
            console.error('[deadline-stats GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

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
                    pIdx++; const uDeptParam = pIdx; params.push(userDeptId);
                    pIdx++; const uIdParam = pIdx; params.push(user.id);
                    where.push(`t.created_by IN (SELECT id FROM users WHERE department_id = $${uDeptParam} AND role IN ('truong_phong', 'quan_ly', 'quan_ly_cap_cao')) AND (t.assigned_to IS NULL OR (t.assigned_to != $${uIdParam} AND (t.assigned_to_ids IS NULL OR NOT ($${uIdParam}::text = ANY(string_to_array(t.assigned_to_ids, ','))))))`);
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

            pIdx++; const myUserIdx = pIdx; params.push(user.id);

            const tasks = await db.all(`
                SELECT t.*,
                       u_assign.full_name as assigned_to_name,
                       u_assign.role as assigned_to_role,
                       u_create.full_name as created_by_name,
                       d.name as department_name,
                       d.code as department_code,
                       col.name as collection_name,
                       COALESCE(cc.comment_count, 0) as comment_count,
                       (CASE WHEN btr.id IS NOT NULL THEN TRUE ELSE FALSE END) as my_read,
                       btr.read_at as my_read_at
                FROM board_tasks t
                LEFT JOIN users u_assign ON u_assign.id = t.assigned_to
                LEFT JOIN users u_create ON u_create.id = t.created_by
                LEFT JOIN departments d ON d.id = t.department_id
                LEFT JOIN product_collections col ON col.id = t.collection_id
                LEFT JOIN (
                    SELECT task_id, COUNT(*) as comment_count
                    FROM board_task_comments
                    GROUP BY task_id
                ) cc ON cc.task_id = t.id
                LEFT JOIN board_task_reads btr ON btr.task_id = t.id AND btr.user_id = $${myUserIdx}
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

            // Fetch read_by_users list for all tasks
            if (tasks.length > 0) {
                const taskIds = tasks.map(t => t.id);
                const allReads = await db.all(`
                    SELECT btr.task_id, btr.user_id, btr.read_at, u.full_name, u.role
                    FROM board_task_reads btr
                    JOIN users u ON u.id = btr.user_id
                    WHERE btr.task_id = ANY($1::int[])
                    ORDER BY btr.read_at ASC
                `, [taskIds]);

                const readsMap = {};
                for (const r of allReads) {
                    if (!readsMap[r.task_id]) readsMap[r.task_id] = [];
                    readsMap[r.task_id].push({
                        user_id: r.user_id,
                        full_name: r.full_name,
                        role: r.role,
                        read_at: r.read_at
                    });
                }

                for (const task of tasks) {
                    task.read_by_users = readsMap[task.id] || [];
                }
            }

            // Enrich linked_campaigns for Test Ads tasks
            const taskIds = tasks.map(t => t.id);
            if (taskIds.length > 0) {
                const linkedCamps = await db.all(`
                    SELECT id, board_task_id, kho_ads_item_id, channel_name, campaign_name, post_id, camp_id, status, created_at
                    FROM ads_campaigns
                    WHERE board_task_id = ANY($1::int[])
                    ORDER BY id ASC
                `, [taskIds]);

                const campMap = {};
                for (const camp of linkedCamps) {
                    if (!campMap[camp.board_task_id]) campMap[camp.board_task_id] = [];
                    campMap[camp.board_task_id].push(camp);
                }

                for (const task of tasks) {
                    task.linked_campaigns = campMap[task.id] || [];
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

            const { title, description, priority, task_type, assigned_to, assigned_to_ids, department_id, deadline, task_link, guide_link, checklist, collection_id, ads_linh_vuc, target_quantity } = request.body;
            if (!title || !title.trim()) {
                return reply.code(400).send({ error: 'Tiêu đề không được để trống' });
            }

            // Quy tắc: Không được phép giao việc cho chính mình
            let rawAssigneeIds = [];
            if (Array.isArray(assigned_to_ids) && assigned_to_ids.length > 0) {
                rawAssigneeIds = assigned_to_ids.map(id => Number(id)).filter(id => !isNaN(id));
            } else if (typeof assigned_to_ids === 'string' && assigned_to_ids.trim()) {
                rawAssigneeIds = assigned_to_ids.split(',').map(s => Number(s.trim())).filter(id => !isNaN(id));
            } else if (assigned_to) {
                rawAssigneeIds = [Number(assigned_to)];
            }

            // Filter out current user ID
            const cleanAssigneeIds = rawAssigneeIds.filter(id => id !== user.id);
            if (cleanAssigneeIds.length === 0) {
                return reply.code(400).send({ error: 'Không được phép giao việc cho chính mình! Vui lòng chọn nhân sự khác trong phòng ban.' });
            }

            let assignedToPrimary = cleanAssigneeIds[0];
            let assignedToIdsStr = cleanAssigneeIds.join(',');

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
            if (assignedToPrimary && !['giam_doc', 'quan_ly_cap_cao'].includes(user.role)) {
                const targetUser = await db.get(`SELECT id, role FROM users WHERE id = $1`, [assignedToPrimary]);
                if (targetUser) {
                    if (['quan_ly_cap_cao', 'quan_ly', 'quan_ly_xuong'].includes(user.role)) {
                        if (!['truong_phong', 'nhan_vien'].includes(targetUser.role)) {
                            return reply.code(403).send({ error: 'Quản lý chỉ được giao việc cho Trưởng phòng và Nhân viên' });
                        }
                    } else if (user.role === 'truong_phong') {
                        if (targetUser.role !== 'nhan_vien') {
                            return reply.code(403).send({ error: 'Trưởng phòng chỉ được giao việc cho Nhân viên' });
                        }
                    }
                }
            }

            if (deptId) {
                const enabledDepts = await getEnabledDeptIds();
                if (!enabledDepts.includes(Number(deptId))) {
                    return reply.code(400).send({ error: 'Phòng ban này chưa được bật Bảng Công Việc' });
                }
            }

            if (deadline) {
                const holiday = await db.get("SELECT holiday_name FROM holidays WHERE holiday_date = $1::date", [deadline]);
                if (holiday) {
                    return reply.code(400).send({ error: `Hạn chót ${deadline} rơi vào ngày nghỉ lễ "${holiday.holiday_name}" (trang Setup Ngày Lễ). Vui lòng chọn ngày làm việc khác!` });
                }
            }

            // Calculate department task code & sequence number
            let taskCode = null;
            let deptTaskNo = null;
            if (deptId) {
                const dept = await db.get(`SELECT name FROM departments WHERE id = $1`, [deptId]);
                const deptCode = getDeptShortCode(dept ? dept.name : '');
                const maxRow = await db.get(`SELECT MAX(dept_task_no) as max_no FROM board_tasks WHERE department_id = $1`, [deptId]);
                deptTaskNo = (maxRow && maxRow.max_no ? Number(maxRow.max_no) : 0) + 1;
                const numStr = deptTaskNo < 10 ? ('0' + deptTaskNo) : String(deptTaskNo);
                taskCode = 'CV-' + deptCode + '-' + numStr;
            }

            const result = await db.get(`
                INSERT INTO board_tasks (title, description, status, priority, task_type, department_id, assigned_to, assigned_to_ids, created_by, deadline, task_link, guide_link, task_code, dept_task_no, collection_id, ads_linh_vuc, target_quantity)
                VALUES ($1, $2, 'can_lam', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
                guide_link || null,
                taskCode,
                deptTaskNo,
                collection_id ? Number(collection_id) : null,
                ads_linh_vuc ? String(ads_linh_vuc).trim() : null,
                target_quantity ? Number(target_quantity) : null
            ]);

            // Create checklist items if provided
            if (checklist && Array.isArray(checklist) && checklist.length > 0) {
                for (let i = 0; i < checklist.length; i++) {
                    const item = checklist[i];
                    if (typeof item === 'string' && item.trim()) {
                        await db.run(`INSERT INTO board_task_checklist (task_id, title, sort_order) VALUES ($1, $2, $3)`,
                            [result.id, item.trim(), i]);
                    } else if (typeof item === 'object' && item && item.title != null) {
                        const itemTitle = String(item.title).trim();
                        if (itemTitle) {
                            const itemContent = item.content != null ? String(item.content).trim() : null;
                            let itemLink = null;
                            if (typeof item.link === 'string') {
                                itemLink = item.link.trim() || null;
                            } else if (item.link && typeof item.link === 'object') {
                                itemLink = item.link.url || (item.link.title ? String(item.link.title) : String(item.link));
                            } else if (item.link != null) {
                                itemLink = String(item.link).trim() || null;
                            }
                            await db.run(`INSERT INTO board_task_checklist (task_id, title, content, link, sort_order) VALUES ($1, $2, $3, $4, $5)`,
                                [result.id, itemTitle, itemContent || null, itemLink || null, i]);
                        }
                    }
                }
            }

            return reply.send({ ok: true, task: result });
        } catch(e) {
            console.error('[board-tasks POST ERROR]', e);
            return reply.code(500).send({ error: e.message || 'Lỗi hệ thống khi tạo task' });
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
            const isDirector = user.role === 'giam_doc';
            const isCreator = task.created_by === user.id;

            if (!isDirector && !isCreator) {
                return reply.code(403).send({ error: 'Chỉ người giao việc mới có quyền chỉnh sửa công việc này!' });
            }

            const b = request.body;
            const updates = [];
            const vals = [];
            let idx = 0;

            if (isDirector || isCreator) {
                // Full edit for managers and creator
                if (b.title !== undefined) { idx++; updates.push(`title = $${idx}`); vals.push(b.title.trim()); }
                if (b.description !== undefined) { idx++; updates.push(`description = $${idx}`); vals.push(b.description); }
                if (b.priority !== undefined) { idx++; updates.push(`priority = $${idx}`); vals.push(b.priority); }
                if (b.task_type !== undefined) { idx++; updates.push(`task_type = $${idx}`); vals.push(b.task_type); }
                if (b.assigned_to !== undefined) { idx++; updates.push(`assigned_to = $${idx}`); vals.push(b.assigned_to || null); }
                if (b.deadline !== undefined) {
                    if (b.deadline) {
                        const holiday = await db.get("SELECT holiday_name FROM holidays WHERE holiday_date = $1::date", [b.deadline]);
                        if (holiday) {
                            return reply.code(400).send({ error: `Hạn chót ${b.deadline} rơi vào ngày nghỉ lễ "${holiday.holiday_name}" (trang Setup Ngày Lễ). Vui lòng chọn ngày làm việc khác!` });
                        }
                    }
                    idx++; updates.push(`deadline = $${idx}`); vals.push(b.deadline || null);
                }
                if (b.department_id !== undefined) { idx++; updates.push(`department_id = $${idx}`); vals.push(b.department_id || null); }
                if (b.task_link !== undefined) { idx++; updates.push(`task_link = $${idx}`); vals.push(b.task_link || null); }
                if (b.guide_link !== undefined) { idx++; updates.push(`guide_link = $${idx}`); vals.push(b.guide_link || null); }
                if (b.collection_id !== undefined) { idx++; updates.push(`collection_id = $${idx}`); vals.push(b.collection_id ? Number(b.collection_id) : null); }
                if (b.ads_linh_vuc !== undefined) { idx++; updates.push(`ads_linh_vuc = $${idx}`); vals.push(b.ads_linh_vuc ? String(b.ads_linh_vuc).trim() : null); }
                if (b.target_quantity !== undefined) { idx++; updates.push(`target_quantity = $${idx}`); vals.push(b.target_quantity ? Number(b.target_quantity) : null); }
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
                // Check if task belongs to "Tư Liệu 2 : Thiết Kế Mẫu - BST"
                let guides = [];
                try {
                    guides = typeof task.guide_link === 'string' ? JSON.parse(task.guide_link) : (task.guide_link || []);
                } catch(e){}
                let isTuLieu2Task = false;
                if (Array.isArray(guides)) {
                    isTuLieu2Task = guides.some(g => {
                        const gMain = (g.mainCat || '').toLowerCase();
                        const gSub = (g.subCat || g.title || '').toLowerCase();
                        const fullStr = (gMain + ' ' + gSub).toLowerCase();
                        if (fullStr.includes('tư liệu 3') || fullStr.includes('chụp ảnh') || fullStr.includes('tạo ai')) {
                            return false;
                        }
                        return fullStr.includes('tư liệu 2') || fullStr.includes('thiết kế mẫu');
                    });
                }
                if (!isTuLieu2Task && task.title) {
                    const tLower = task.title.toLowerCase();
                    if ((tLower.includes('thiết kế mẫu') || tLower.includes('tư liệu 2')) && !tLower.includes('chụp ảnh') && !tLower.includes('tạo ai') && !tLower.includes('tư liệu 3')) {
                        isTuLieu2Task = true;
                    }
                }

                if (isTuLieu2Task) {
                    // Query linked collection in product_collections
                    const linkedCollection = await db.get(`SELECT * FROM product_collections WHERE task_id = $1 LIMIT 1`, [taskId]);
                    
                    // Condition 1: Collection must be created!
                    if (!linkedCollection) {
                        return reply.code(400).send({ 
                            ok: false,
                            condition1_met: false,
                            condition2_met: false,
                            error: '⚠️ KHÔNG THỂ DUYỆT CÔNG VIỆC!\n\nCông việc thuộc "Tư Liệu 2 : Thiết Kế Mẫu - BST" yêu cầu bắt buộc 2 điều kiện:\n\n1. Người nhận việc phải Tạo Bộ Sưu Tập cho công việc này tại menu "Bộ Sưu Tập / BST" (❌ Chưa tạo).\n2. Người giao việc phải vào menu "Bộ Sưu Tập / BST", xem chi tiết và bấm "✅ Duyệt Bộ Sưu Tập" (❌ Chưa duyệt).' 
                        });
                    }

                    // Condition 2: Assignor must have clicked "Duyệt Bộ Sưu Tập" (is_approved === true)!
                    if (!linkedCollection.is_approved) {
                        return reply.code(400).send({ 
                            ok: false,
                            condition1_met: true,
                            condition2_met: false,
                            collection_name: linkedCollection.name,
                            collection_id: linkedCollection.id,
                            error: `⚠️ KHÔNG THỂ DUYỆT CÔNG VIỆC!\n\nBộ Sưu Tập "${linkedCollection.name}" đã được tạo (✅ Đã đạt ĐK1), nhưng NGƯỜI GIAO VIỆC chưa bấm Duyệt Bộ Sưu Tập này (❌ Chưa đạt ĐK2)!\n\nVui lòng sang menu "Bộ Sưu Tập / BST", bấm "👁️ Xem Chi Tiết" bộ sưu tập này và bấm nút "✅ Duyệt Bộ Sưu Tập" trước khi quay lại duyệt công việc.` 
                        });
                    }
                }

                // Check if task belongs to "Tư Liệu 3 : Chụp Ảnh / Tạo AI - BST"
                let isTuLieu3Task = false;
                if (Array.isArray(guides)) {
                    isTuLieu3Task = guides.some(g => {
                        const gMain = (g.mainCat || '').toLowerCase();
                        const gSub = (g.subCat || g.title || '').toLowerCase();
                        const fullStr = (gMain + ' ' + gSub).toLowerCase();
                        if (fullStr.includes('quay video') || fullStr.includes('tư liệu 4')) return false;
                        return fullStr.includes('tư liệu 3') || fullStr.includes('chụp ảnh');
                    });
                }
                if (!isTuLieu3Task && task.title) {
                    const tLower = task.title.toLowerCase();
                    if ((tLower.includes('chụp ảnh') || tLower.includes('tư liệu 3')) && !tLower.includes('quay video') && !tLower.includes('tư liệu 4')) {
                        isTuLieu3Task = true;
                    }
                }

                if (isTuLieu3Task) {
                    let linkedCol = null;
                    if (task.collection_id) {
                        linkedCol = await db.get(`SELECT * FROM product_collections WHERE id = $1 LIMIT 1`, [task.collection_id]);
                    }
                    if (!linkedCol) {
                        linkedCol = await db.get(`SELECT * FROM product_collections WHERE task_id = $1 LIMIT 1`, [taskId]);
                    }

                    if (!linkedCol) {
                        return reply.code(400).send({
                            ok: false,
                            condition1_met: false,
                            condition2_met: false,
                            error: '⚠️ KHÔNG THỂ DUYỆT CÔNG VIỆC!\n\nCông việc thuộc "Tư Liệu 3 : Chụp Ảnh / Tạo AI - BST" chưa chọn Bộ Sưu Tập liên kết.'
                        });
                    }

                    // Check Condition 1: Section 8 photos exist (chup_anh_mau_bst)
                    let chupRaw = typeof linkedCol.chup_anh_mau_bst === 'string' ? JSON.parse(linkedCol.chup_anh_mau_bst) : (linkedCol.chup_anh_mau_bst || []);
                    let chupPhotoCount = 0;
                    if (Array.isArray(chupRaw)) {
                        chupPhotoCount = chupRaw.length;
                    } else if (chupRaw && typeof chupRaw === 'object') {
                        let urls = Array.isArray(chupRaw.image_urls) ? chupRaw.image_urls : (chupRaw.image_url ? [chupRaw.image_url] : []);
                        chupPhotoCount = urls.filter(Boolean).length;
                    }
                    const cond1Met = chupPhotoCount > 0;

                    // Check Condition 2: Section 9 & 10 meeting completed
                    let meetingSession = null;
                    try {
                        meetingSession = await db.get(`
                            SELECT id FROM meeting_sessions 
                            WHERE status = 'da_ket_thuc' AND (collection_id = $1 OR collection_name = $2) 
                            LIMIT 1
                        `, [linkedCol.id, linkedCol.name]);
                    } catch(e){}

                    const cond2Met = Boolean(meetingSession || linkedCol.completed_meeting || (linkedCol.hop_voi_sale && (linkedCol.hop_voi_sale.status === 'da_ket_thuc' || (typeof linkedCol.hop_voi_sale === 'string' && linkedCol.hop_voi_sale.includes('da_ket_thuc')))));

                    if (!cond1Met || !cond2Met) {
                        return reply.code(400).send({
                            ok: false,
                            condition1_met: cond1Met,
                            condition2_met: cond2Met,
                            collection_name: linkedCol.name,
                            collection_id: linkedCol.id,
                            error: `⚠️ KHÔNG THỂ DUYỆT CÔNG VIỆC!\n\nCông việc "Tư Liệu 3 : Chụp Ảnh / Tạo AI - BST" liên kết với "${linkedCol.name}" yêu cầu đủ 2 điều kiện:\n\n1. 📷 Đã thêm ảnh mẫu BST tại Mục 8 (${cond1Met ? '✅ Đã có' : '❌ Chưa có'}).\n2. 🤝 Đã họp hoàn thành tại Quy trình cuộc họp ở Mục 9 & 10 (${cond2Met ? '✅ Đã họp' : '❌ Chưa họp'}).`
                        });
                    }
                }

                // Check if task belongs to "Tư Liệu 4 : Quay Video / Tạo AI - BST"
                let isTuLieu4Task = false;
                if (Array.isArray(guides)) {
                    isTuLieu4Task = guides.some(g => {
                        const gMain = (g.mainCat || '').toLowerCase();
                        const gSub = (g.subCat || g.title || '').toLowerCase();
                        const fullStr = (gMain + ' ' + gSub).toLowerCase();
                        return fullStr.includes('tư liệu 4') || fullStr.includes('quay video');
                    });
                }
                if (!isTuLieu4Task && task.title) {
                    const tLower = task.title.toLowerCase();
                    if (tLower.includes('quay video') || tLower.includes('tư liệu 4')) {
                        isTuLieu4Task = true;
                    }
                }

                if (isTuLieu4Task) {
                    let linkedCol = null;
                    if (task.collection_id) {
                        linkedCol = await db.get(`SELECT * FROM product_collections WHERE id = $1 LIMIT 1`, [task.collection_id]);
                    }
                    if (!linkedCol) {
                        linkedCol = await db.get(`SELECT * FROM product_collections WHERE task_id = $1 LIMIT 1`, [taskId]);
                    }

                    if (!linkedCol) {
                        return reply.code(400).send({
                            ok: false,
                            condition_video_met: false,
                            error: '⚠️ KHÔNG THỂ DUYỆT CÔNG VIỆC!\n\nCông việc thuộc "Tư Liệu 4 : Quay Video / Tạo AI - BST" chưa chọn Bộ Sưu Tập liên kết.'
                        });
                    }

                    let video_bst = linkedCol.video_bst || {};
                    let videoLink = '';
                    if (typeof video_bst === 'string') {
                        try { video_bst = JSON.parse(video_bst); } catch(e){}
                    }
                    if (typeof video_bst === 'object' && video_bst !== null) {
                        videoLink = Array.isArray(video_bst) ? (video_bst[0] || '') : (video_bst.link || '');
                    } else if (typeof video_bst === 'string') {
                        videoLink = video_bst;
                    }

                    const hasVideoLink = Boolean(videoLink && String(videoLink).trim());

                    if (!hasVideoLink) {
                        return reply.code(400).send({
                            ok: false,
                            condition_video_met: false,
                            collection_name: linkedCol.name,
                            collection_id: linkedCol.id,
                            error: `⚠️ KHÔNG THỂ DUYỆT CÔNG VIỆC!\n\nCông việc "Tư Liệu 4 : Quay Video / Tạo AI - BST" liên kết với "${linkedCol.name}" yêu cầu phải hoàn thành mục VIDEO BỘ SƯU TẬP (Google Drive):\n\n❌ Chưa có link video nào cho bộ sưu tập này.`
                        });
                    }
                }

                // Check if task belongs to "Tư Liệu 5 : Video / Ảnh Ads"
                let isTuLieu5Task = false;
                if (Array.isArray(guides)) {
                    isTuLieu5Task = guides.some(g => {
                        const gMain = (g.mainCat || '').toLowerCase();
                        const gSub = (g.subCat || g.title || '').toLowerCase();
                        const fullStr = (gMain + ' ' + gSub).toLowerCase();
                        return fullStr.includes('tư liệu 5') || fullStr.includes('video / ảnh ads') || fullStr.includes('video/ảnh ads');
                    });
                }
                if (!isTuLieu5Task) {
                    const tLower = (task.title || '').toLowerCase();
                    const gLinkLower = (task.guide_link || '').toLowerCase();
                    if (tLower.includes('tư liệu 5') || tLower.includes('video / ảnh ads') || tLower.includes('video/ảnh ads') ||
                        gLinkLower.includes('tư liệu 5') || gLinkLower.includes('video / ảnh ads') || gLinkLower.includes('video/ảnh ads')) {
                        isTuLieu5Task = true;
                    }
                }

                if (isTuLieu5Task) {
                    const adsItems = await db.all(`SELECT id FROM kho_ads_items WHERE task_id = $1`, [taskId]);
                    const targetQty = task.target_quantity || 1;
                    const cond1Met = (adsItems.length >= targetQty && adsItems.length > 0);
                    const cond2Met = Boolean(task.kho_ads_approved);

                    const assignerUser = await db.get(`SELECT full_name, username FROM users WHERE id = $1 LIMIT 1`, [task.created_by || 0]);
                    const assignerName = (assignerUser && (assignerUser.full_name || assignerUser.username)) || 'Người giao việc';

                    if (!cond1Met || !cond2Met) {
                        return reply.code(400).send({
                            ok: false,
                            is_tulieu5: true,
                            condition1_met: cond1Met,
                            condition2_met: cond2Met,
                            current_items: adsItems.length,
                            target_qty: targetQty,
                            assigner_name: assignerName,
                            error: `⚠️ CHƯA ĐỦ ĐIỀU KIỆN DUYỆT CÔNG VIỆC!\n\nCông việc thuộc "Tư Liệu 5: Video / Ảnh Ads" yêu cầu bắt buộc đủ 2 điều kiện:\n\n1. 📦 Tạo và nộp đủ Tư Liệu Ads ở Kho Ads (${adsItems.length}/${targetQty} tư liệu): ${cond1Met ? '✅ Đã đủ' : '❌ Chưa đủ'}.\n2. 👑 Người Giao Việc (${assignerName}) đã bấm Duyệt ở Kho Ads: ${cond2Met ? '✅ Đã duyệt' : '❌ Chưa duyệt'}.\n\nVui lòng đáp ứng đầy đủ các điều kiện trên trước khi duyệt công việc!`
                        });
                    }
                }

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
                const rContent = (task.report_content || '').trim();
                const rLink = (task.report_link || '').trim();
                if (!rContent || !rLink) {
                    return reply.code(400).send({ error: 'Bạn phải điền đầy đủ Nội dung báo cáo toàn bộ công việc và Đường link nộp báo cáo tổng thể trước khi chuyển sang trạng thái Hoàn Thành!' });
                }

                // Check if task belongs to "Tư Liệu 2 : Thiết Kế Mẫu Bộ Sưu Tập / BST (New)"
                let guides = [];
                try {
                    guides = typeof task.guide_link === 'string' ? JSON.parse(task.guide_link) : (task.guide_link || []);
                } catch(e){}
                let isTuLieu2Task = false;
                if (Array.isArray(guides)) {
                    isTuLieu2Task = guides.some(g => {
                        const gMain = (g.mainCat || '').toLowerCase();
                        const gSub = (g.subCat || g.title || '').toLowerCase();
                        return gMain.includes('thiết kế mẫu bộ sưu tập') || gMain.includes('thiết kế bst') || gSub.includes('thiết kế mẫu');
                    });
                }
                if (!isTuLieu2Task && task.title && task.title.toLowerCase().includes('thiết kế mẫu')) {
                    isTuLieu2Task = true;
                }

                if (isTuLieu2Task) {
                    const linkedCollection = await db.get(`SELECT id FROM product_collections WHERE task_id = $1 LIMIT 1`, [taskId]);
                    if (!linkedCollection) {
                        return reply.code(400).send({ 
                            error: 'Công việc thuộc "Tư Liệu 2 : Thiết Kế Mẫu Bộ Sưu Tập / BST (New)" bắt buộc phải tạo 1 Bộ Sưu Tập tại Menu Bộ Sưu Tập / BST trước khi chuyển sang Hoàn Thành!' 
                        });
                    }
                }

                const uncompletedChecklist = await db.get(`
                    SELECT COUNT(*) as count FROM board_task_checklist
                    WHERE task_id = $1 AND is_done = FALSE
                `, [taskId]);
                if (uncompletedChecklist && Number(uncompletedChecklist.count) > 0) {
                    return reply.code(400).send({ error: `Còn ${uncompletedChecklist.count} mục checklist chưa được tích hoàn thành!` });
                }
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

    // PATCH /api/board-tasks/:id/director-read — Toggle director_read status (Director only)
    fastify.patch('/api/board-tasks/:id/director-read', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            if (!user || user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ tài khoản Giám đốc mới có quyền sử dụng tính năng này!' });
            }
            const taskId = Number(request.params.id);
            const { director_read } = request.body || {};
            const isRead = typeof director_read === 'boolean' ? director_read : true;

            const task = await db.get(`SELECT id FROM board_tasks WHERE id = $1`, [taskId]);
            if (!task) return reply.code(404).send({ error: 'Không tìm thấy công việc' });

            const updated = await db.get(`
                UPDATE board_tasks 
                SET director_read = $1, 
                    director_read_at = CASE WHEN $1 = TRUE THEN NOW() ELSE NULL END,
                    updated_at = NOW() 
                WHERE id = $2 
                RETURNING *
            `, [isRead, taskId]);

            return reply.send({ ok: true, task: updated });
        } catch(e) {
            console.error('[board-tasks PATCH director-read]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PATCH /api/board-tasks/:id/read — Toggle current user's read status for a task
    fastify.patch('/api/board-tasks/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            const taskId = Number(request.params.id);
            const { is_read } = request.body || {};

            if (isNaN(taskId)) {
                return reply.code(400).send({ error: 'ID công việc không hợp lệ' });
            }

            const task = await db.get(`SELECT id FROM board_tasks WHERE id = $1`, [taskId]);
            if (!task) return reply.code(404).send({ error: 'Không tìm thấy công việc' });

            let newReadState = false;
            let readAt = null;

            if (is_read === undefined || is_read === null) {
                const existing = await db.get(`SELECT id FROM board_task_reads WHERE task_id = $1 AND user_id = $2`, [taskId, user.id]);
                if (existing) {
                    await db.run(`DELETE FROM board_task_reads WHERE task_id = $1 AND user_id = $2`, [taskId, user.id]);
                    newReadState = false;
                } else {
                    readAt = new Date().toISOString();
                    await db.run(`INSERT INTO board_task_reads (task_id, user_id, read_at) VALUES ($1, $2, $3) ON CONFLICT (task_id, user_id) DO UPDATE SET read_at = $3`, [taskId, user.id, readAt]);
                    newReadState = true;
                }
            } else if (is_read) {
                readAt = new Date().toISOString();
                await db.run(`INSERT INTO board_task_reads (task_id, user_id, read_at) VALUES ($1, $2, $3) ON CONFLICT (task_id, user_id) DO UPDATE SET read_at = $3`, [taskId, user.id, readAt]);
                newReadState = true;
            } else {
                await db.run(`DELETE FROM board_task_reads WHERE task_id = $1 AND user_id = $2`, [taskId, user.id]);
                newReadState = false;
            }

            // Sync with legacy director_read column if Director
            if (user.role === 'giam_doc') {
                await db.run(`UPDATE board_tasks SET director_read = $1, director_read_at = $2 WHERE id = $3`, [newReadState, newReadState ? (readAt || new Date().toISOString()) : null, taskId]);
            }

            const readers = await db.all(`
                SELECT btr.user_id, btr.read_at, u.full_name, u.role
                FROM board_task_reads btr
                JOIN users u ON u.id = btr.user_id
                WHERE btr.task_id = $1
                ORDER BY btr.read_at ASC
            `, [taskId]);

            return reply.send({ ok: true, task_id: taskId, my_read: newReadState, my_read_at: readAt, read_by_users: readers });
        } catch(e) {
            console.error('[board-tasks PATCH read]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

function getDeptShortCode(deptName) {
    if (!deptName) return 'CHUNG';
    const nameUpper = String(deptName).toUpperCase().trim();
    if (nameUpper.includes('MARKETING')) return 'MKT';
    if (nameUpper.includes('KINH DOANH')) return 'KD';
    if (nameUpper.includes('KẾ TOÁN') || nameUpper.includes('KE TOAN')) return 'KT';
    if (nameUpper.includes('THỦ QUỸ') || nameUpper.includes('THU QUY')) return 'QUY';
    if (nameUpper.includes('THỦ KHO') || nameUpper.includes('THU KHO')) return 'KHO';
    if (nameUpper.includes('NHÂN SỰ') || nameUpper.includes('HÀNH CHÍNH')) return 'NS';
    if (nameUpper.includes('AFFILIATE')) return 'AFF';
    if (nameUpper.includes('ÉP') || nameUpper.includes('EP')) return 'EP';
    if (nameUpper.includes('HOÀN THIỆN') || nameUpper.includes('HOAN THIEN')) return 'HT';
    if (nameUpper.includes('CẮT CÁNH')) return 'CC';
    if (nameUpper.includes('CẮT')) return 'CAT';
    if (nameUpper.includes('XÃ HỘI')) return 'XH';
    if (nameUpper.includes('VĂN PHÒNG')) return 'VP';
    if (nameUpper.includes('XƯỞNG')) return 'XUONG';
    if (nameUpper.includes('THIẾT KẾ') || nameUpper.includes('THIET KE')) return 'TK';
    if (nameUpper.includes('SINH VIÊN')) return 'SVKD';
    if (nameUpper.includes('THỬ VIỆC')) return 'TVKD';
    if (nameUpper.includes('TIÊN PHONG')) return 'MTP';
    if (nameUpper.includes('TINH HOA')) return 'MTH';
    if (nameUpper.includes('MAY')) return 'MAY';
    if (nameUpper.includes('IN')) return 'IN';
    if (nameUpper.includes('SALE')) return 'SALE';

    const stopWords = ['PHÒNG', 'TEAM', 'HỆ', 'THỐNG', 'BAN', 'BỘ', 'PHẬN', 'HV'];
    const words = nameUpper.split(/\s+/).filter(w => w && !stopWords.includes(w));
    if (words.length > 0) {
        const code = words.map(w => w[0]).join('').replace(/[^A-Z0-9]/g, '');
        if (code) return code;
    }
    return 'CV';
}

    // GET /api/board-tasks/next-id — Lấy mã task chuẩn bị tạo tiếp theo theo phòng ban
    fastify.get('/api/board-tasks/next-id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const deptId = request.query.department_id || request.query.dept_id;
            if (!deptId) {
                return reply.send({ nextId: 0, nextCode: '— Chọn phòng ban —' });
            }
            const dept = await db.get(`SELECT name FROM departments WHERE id = $1`, [deptId]);
            const deptName = dept ? dept.name : '';
            const deptCode = getDeptShortCode(deptName);
            const row = await db.get(`SELECT MAX(dept_task_no) as max_no FROM board_tasks WHERE department_id = $1`, [deptId]);
            const maxNo = row && row.max_no ? Number(row.max_no) : 0;
            const nextNo = maxNo + 1;
            const numStr = nextNo < 10 ? ('0' + nextNo) : String(nextNo);
            const nextCode = 'CV-' + deptCode + '-' + numStr;
            return reply.send({ nextId: nextNo, nextCode, deptCode });
        } catch(e) {
            return reply.send({ nextId: 1, nextCode: 'CV-CHUNG-01' });
        }
    });

    // GET /api/board-tasks/next-ads-code — Lấy mã tự tăng tiếp theo theo Lĩnh Vực Ads (VD: ADSCT001, ADSAL001)
    fastify.get('/api/board-tasks/next-ads-code', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const linhVuc = (request.query.linh_vuc || '').trim();
            let rawCode = (request.query.code || '').trim().toUpperCase();
            let cleanCode = rawCode.replace(/^ADS/i, '').trim();

            // Nếu không truyền code thì thử tìm trong kho_ads_linh_vuc
            if (!cleanCode && linhVuc) {
                const lvRow = await db.get(`SELECT code FROM kho_ads_linh_vuc WHERE name = $1`, [linhVuc]);
                if (lvRow && lvRow.code) cleanCode = lvRow.code.trim().toUpperCase().replace(/^ADS/i, '').trim();
            }

            // Nếu vẫn không có code, tự trích xuất chữ cái viết tắt
            if (!cleanCode && linhVuc) {
                cleanCode = linhVuc.split(/\s+/).map(w => w[0]).join('').replace(/[^A-Z0-9]/gi, '').replace(/^ADS/i, '').toUpperCase() || 'CT';
            }
            if (!cleanCode) cleanCode = 'CT';

            const prefix = 'ADS' + cleanCode;

            // Tìm số lớn nhất trong tiêu đề có định dạng ADS[CODE][NUMBER]
            const rows = await db.all(
                `SELECT title FROM board_tasks WHERE (ads_linh_vuc = $1 OR title LIKE $2) AND title LIKE $3`,
                [linhVuc, prefix + '%', prefix + '%']
            );

            let maxSeq = 0;
            const regex = new RegExp('^' + prefix + '(\\d+)', 'i');
            (rows || []).forEach(r => {
                if (r.title) {
                    const match = r.title.match(regex);
                    if (match && match[1]) {
                        const num = parseInt(match[1], 10);
                        if (!isNaN(num) && num > maxSeq) maxSeq = num;
                    }
                }
            });

            const nextSeq = maxSeq + 1;
            const seqStr = String(nextSeq).padStart(3, '0');
            const formattedCode = prefix + seqStr;

            return reply.send({ ok: true, code: cleanCode, seq: nextSeq, formattedCode });
        } catch(e) {
            console.error('[next-ads-code error]', e);
            return reply.send({ ok: false, formattedCode: 'ADSCT001' });
        }
    });

    // GET /api/board-tasks/next-design-code — Lấy mã tự tăng tiếp theo theo Lĩnh Vực Thiết Kế Mẫu - BST (VD: CT001, AL001, MN001)
    fastify.get('/api/board-tasks/next-design-code', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const linhVuc = (request.query.linh_vuc || '').trim();
            let rawCode = (request.query.code || '').trim().toUpperCase();
            let cleanCode = rawCode.replace(/^ADS/i, '').trim();

            if (!cleanCode && linhVuc) {
                const lvRow = await db.get(`SELECT code FROM bsut_linh_vuc WHERE name = $1`, [linhVuc]) ||
                              await db.get(`SELECT code FROM kho_ads_linh_vuc WHERE name = $1`, [linhVuc]);
                if (lvRow && lvRow.code) cleanCode = lvRow.code.trim().toUpperCase().replace(/^ADS/i, '').trim();
            }

            if (!cleanCode && linhVuc) {
                cleanCode = linhVuc.split(/\s+/).map(w => w[0]).join('').replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'CT';
            }
            if (!cleanCode) cleanCode = 'CT';

            // Tìm số lớn nhất trong tiêu đề board_tasks hoặc mã product_collections có chứa [CODE][NUMBER] (VD: CT001, CT002, CT1001, TT301)
            const tasks = await db.all(
                `SELECT title FROM board_tasks WHERE title ILIKE '%Thiết Kế Mẫu%' OR title ILIKE $1`,
                ['%' + cleanCode + '%']
            );

            const collections = await db.all(
                `SELECT name, code FROM product_collections WHERE linh_vuc = $1 OR name ILIKE $2 OR code ILIKE $2`,
                [linhVuc, '%' + cleanCode + '%']
            );

            let maxSeq = 0;
            const regex = new RegExp('\\b' + cleanCode + '(\\d+)\\b', 'i');

            const checkText = (txt) => {
                if (!txt) return;
                const match = txt.match(regex);
                if (match && match[1]) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxSeq) maxSeq = num;
                }
            };

            (tasks || []).forEach(t => checkText(t.title));
            (collections || []).forEach(c => { checkText(c.name); checkText(c.code); });

            const nextSeq = maxSeq + 1;
            const seqStr = String(nextSeq).padStart(3, '0');
            const formattedCode = cleanCode + seqStr;

            return reply.send({ ok: true, code: cleanCode, seq: nextSeq, formattedCode });
        } catch(e) {
            console.error('[next-design-code error]', e);
            return reply.send({ ok: false, formattedCode: 'CT001' });
        }
    });

    // DELETE /api/board-tasks/:id — Delete task
    fastify.delete('/api/board-tasks/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            const taskId = request.params.id;

            const task = await db.get(`SELECT * FROM board_tasks WHERE id = $1`, [taskId]);
            if (!task) return reply.code(404).send({ error: 'Không tìm thấy task' });

            const isDirector = user.role === 'giam_doc' ||
                (user.username && (user.username.toLowerCase().includes('giamdoc') || user.username.toLowerCase() === 'admin')) ||
                Boolean(user.is_admin);

            if (!isDirector) {
                return reply.code(403).send({ error: 'Chỉ Giám đốc mới có quyền xóa công việc!' });
            }

            // Xóa sạch dữ liệu liên quan ở các bảng con trước khi xóa task chính
            await db.run(`DELETE FROM board_task_checklist WHERE task_id = $1`, [taskId]);
            await db.run(`DELETE FROM board_task_comments WHERE task_id = $1`, [taskId]);
            await db.run(`DELETE FROM board_task_attachments WHERE task_id = $1`, [taskId]);
            await db.run(`DELETE FROM board_task_feedbacks WHERE task_id = $1`, [taskId]);
            await db.run(`DELETE FROM board_task_reads WHERE task_id = $1`, [taskId]);

            await db.run(`DELETE FROM board_tasks WHERE id = $1`, [taskId]);
            return reply.send({ ok: true });
        } catch(e) {
            console.error('[board-tasks DELETE]', e);
            return reply.code(500).send({ error: e.message || 'Lỗi khi xóa công việc' });
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
            if (is_done === undefined) {
                return reply.code(400).send({ error: 'Thiếu trường is_done' });
            }
            const done = !!is_done;

            if (done) {
                const currentItem = await db.get(`SELECT * FROM board_task_checklist WHERE id = $1 AND task_id = $2`, [request.params.itemId, request.params.taskId]);
                const rContent = (currentItem && currentItem.report_content ? currentItem.report_content.trim() : '');
                const rLink = (currentItem && currentItem.report_link ? currentItem.report_link.trim() : '');
                if (!rContent || !rLink) {
                    return reply.code(400).send({ error: 'Bạn phải nhập đầy đủ Nội dung báo cáo kết quả và Link dẫn chứng hoàn thành cho mục checklist này trước khi tích chọn hoàn thành!' });
                }

                const isUrl = /^https?:\/\/.+/i.test(rLink) || /^([\w\-]+\.)+[a-z]{2,}(\/.*)?$/i.test(rLink);
                if (!isUrl) {
                    return reply.code(400).send({ error: '⚠️ Link dẫn chứng hoàn thành phải là một đường link liên kết hợp lệ (ví dụ: https://... hoặc http://...) chứ không được nhập chữ/số thông thường!' });
                }
            }

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

    // PATCH /api/board-tasks/:taskId/checklist/:itemId/detail — Save title, content, link for checklist item
    fastify.patch('/api/board-tasks/:taskId/checklist/:itemId/detail', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { title, content, link } = request.body;
            const item = await db.get(`
                UPDATE board_task_checklist
                SET title = COALESCE($1, title),
                    content = $2,
                    link = $3,
                    completed_at = CASE WHEN is_done = TRUE THEN NOW() ELSE completed_at END
                WHERE id = $4 AND task_id = $5 RETURNING *
            `, [title != null ? String(title).trim() : null, content != null ? String(content).trim() : null, link != null ? String(link).trim() : null, request.params.itemId, request.params.taskId]);
            return reply.send({ ok: true, item });
        } catch(e) {
            console.error('[board-task-checklist PATCH detail]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PATCH /api/board-tasks/:taskId/checklist/:itemId/report — Auto-save report_content + report_link for checklist item
    fastify.patch('/api/board-tasks/:taskId/checklist/:itemId/report', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { report_content, report_link } = request.body;
            const item = await db.get(`
                UPDATE board_task_checklist
                SET report_content = $1, report_link = $2
                WHERE id = $3 AND task_id = $4 RETURNING *
            `, [report_content != null ? String(report_content).trim() : null, report_link != null ? String(report_link).trim() : null, request.params.itemId, request.params.taskId]);
            return reply.send({ ok: true, item });
        } catch(e) {
            console.error('[board-task-checklist PATCH report]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PATCH /api/board-tasks/:taskId/report-overall — Auto-save report_content + report_link for overall task report
    fastify.patch('/api/board-tasks/:taskId/report-overall', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { report_content, report_link } = request.body || {};
            await db.run(`
                UPDATE board_tasks
                SET report_content = $1, report_link = $2, updated_at = NOW()
                WHERE id = $3
            `, [report_content != null ? String(report_content).trim() : null, report_link != null ? String(report_link).trim() : null, request.params.taskId]);
            return reply.send({ ok: true });
        } catch (e) {
            console.error('[board-tasks PATCH report-overall]', e);
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
                SELECT d.*, u.full_name as created_by_name,
                MIN(d.id) OVER (PARTITION BY d.main_category) AS first_cat_id
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

            query += ` ORDER BY first_cat_id ASC, COALESCE(d.sort_order, 0) ASC, d.id ASC`;

            const documents = await db.all(query, params);

            // Helper function định dạng Mã công việc cho danh mục Tư Liệu Hướng Dẫn
            function formatDocTaskCode(t) {
                if (!t) return 'CV-000';
                if (t.task_code && t.task_code.trim()) return t.task_code.trim();
                if (t.department_name) {
                    let dCode = 'CV';
                    const name = t.department_name.trim();
                    if (name.toLowerCase().includes('marketing')) dCode = 'MKT';
                    else {
                        const clean = name.replace(/^PHÒNG\s+/i, '').replace(/^BỘ PHẬN\s+/i, '').trim();
                        const words = clean.split(/\s+/).filter(Boolean);
                        if (words.length === 1) dCode = words[0].substring(0, 3).toUpperCase();
                        else dCode = words.map(w => w[0]).join('').replace(/[^A-Z0-9]/g, '');
                    }
                    const no = t.dept_task_no ? (t.dept_task_no < 10 ? ('0' + t.dept_task_no) : String(t.dept_task_no)) : String(t.id || 0).padStart(2, '0');
                    return `CV-${dCode}-${no}`;
                }
                return 'CV-' + String(t.id || 0).padStart(3, '0');
            }

            // Fetch all tasks with guide_link to match linked tasks
            const allTasksWithGuides = await db.all(`
                SELECT t.id, t.title, t.guide_link, t.task_code, t.dept_task_no, t.department_id, d.name as department_name 
                FROM board_tasks t
                LEFT JOIN departments d ON d.id = t.department_id
                WHERE t.guide_link IS NOT NULL AND t.guide_link != '' AND t.guide_link != '[]'
            `);

            // Fetch attachments & linked tasks for each document
            for (const doc of documents) {
                doc.links = typeof doc.links === 'string' ? JSON.parse(doc.links) : (doc.links || []);
                const atts = await db.all(`SELECT * FROM board_document_attachments WHERE document_id = $1 ORDER BY id ASC`, [doc.id]);
                doc.attachments = atts;

                const linked = [];
                const docSub = (doc.sub_category || '').trim().toLowerCase();
                const docMain = (doc.main_category || '').replace(/^Tư Liệu \d+\s*:\s*/i, '').replace(/^\d+[\.\s\-]*/, '').trim().toLowerCase();
                const docTaskCode = (doc.task_code || '').trim().toUpperCase();

                allTasksWithGuides.forEach(task => {
                    const cvCode = formatDocTaskCode(task);
                    const rawIdCode = 'CV-' + String(task.id).padStart(3, '0');
                    if (docTaskCode && (docTaskCode === cvCode || docTaskCode === rawIdCode || docTaskCode === String(task.id))) {
                        if (!linked.some(x => x.id === task.id)) linked.push({ id: task.id, cv_code: cvCode, title: task.title });
                        return;
                    }

                    let guides = [];
                    try {
                        guides = typeof task.guide_link === 'string' ? JSON.parse(task.guide_link) : (task.guide_link || []);
                    } catch(e){}

                    if (Array.isArray(guides) && docSub.length > 0) {
                        const isMatched = guides.some(g => {
                            const gSub = (g.subCat || g.title || '').trim().toLowerCase();
                            const gPrefix = (g.prefix || '').trim().toLowerCase();
                            const gMain = (g.mainCat || '').replace(/^Tư Liệu \d+\s*:\s*/i, '').replace(/^\d+[\.\s\-]*/, '').trim().toLowerCase();
                            
                            const matchSub = !!(docSub && gSub && (gSub === docSub || gSub.includes(docSub) || docSub.includes(gSub)));
                            const matchPrefix = !!(docSub && gPrefix && gPrefix.includes(docSub));
                            const matchMain = !!(docMain && gMain && (gMain === docMain || gMain.includes(docMain) || docMain.includes(gMain)));
                            
                            return (matchSub || matchPrefix) && (gMain ? matchMain : true);
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

    // POST /api/board-documents/reorder & PUT /api/board-documents/reorder
    const handleDocReorder = async (req, reply) => {
        try {
            const user = req.user || {};
            if (!['giam_doc', 'quan_ly_cap_cao'].includes(user.role)) {
                return reply.code(403).send({ error: 'Bạn không có quyền sắp xếp lại tư liệu' });
            }
            const { id, direction, ids } = req.body;

            if (Array.isArray(ids) && ids.length > 0) {
                for (let i = 0; i < ids.length; i++) {
                    await db.run(`UPDATE board_documents SET sort_order = $1 WHERE id = $2`, [i + 1, Number(ids[i])]);
                }
                return reply.send({ ok: true });
            }

            if (!id || !direction) {
                return reply.code(400).send({ error: 'Thiếu id hoặc direction' });
            }

            const currDoc = await db.get(`SELECT * FROM board_documents WHERE id = $1`, [id]);
            if (!currDoc) {
                return reply.code(404).send({ error: 'Không tìm thấy tư liệu' });
            }

            let query = `SELECT id, sort_order FROM board_documents WHERE main_category = $1`;
            const params = [currDoc.main_category];
            if (currDoc.department_id) {
                query += ` AND department_id = $2`;
                params.push(currDoc.department_id);
            } else {
                query += ` AND department_id IS NULL`;
            }
            query += ` ORDER BY COALESCE(sort_order, 0) ASC, id ASC`;

            const groupDocs = await db.all(query, params);
            const currIdx = groupDocs.findIndex(d => Number(d.id) === Number(id));
            if (currIdx === -1) {
                return reply.code(400).send({ error: 'Không tìm thấy tư liệu trong danh mục' });
            }

            let targetIdx = currIdx;
            if (direction === 'up') targetIdx = currIdx - 1;
            else if (direction === 'down') targetIdx = currIdx + 1;

            if (targetIdx >= 0 && targetIdx < groupDocs.length) {
                const temp = groupDocs[currIdx];
                groupDocs[currIdx] = groupDocs[targetIdx];
                groupDocs[targetIdx] = temp;

                for (let i = 0; i < groupDocs.length; i++) {
                    await db.run(`UPDATE board_documents SET sort_order = $1 WHERE id = $2`, [i + 1, Number(groupDocs[i].id)]);
                }
            }

            return reply.send({ ok: true });
        } catch(e) {
            console.error('[board-documents reorder]', e);
            return reply.code(500).send({ error: e.message });
        }
    };
    fastify.post('/api/board-documents/reorder', { preHandler: [authenticate] }, handleDocReorder);
    fastify.put('/api/board-documents/reorder', { preHandler: [authenticate] }, handleDocReorder);

    // PUT /api/board-documents/category/rename — Rename main_category (Director only)
    fastify.put('/api/board-documents/category/rename', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const user = req.user;
            if (user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ tài khoản Giám Đốc mới có quyền sửa tên tư liệu!' });
            }

            const { department_id, old_main_category, new_main_category } = req.body || {};

            if (!old_main_category || !old_main_category.trim()) {
                return reply.code(400).send({ error: 'Thiếu tên tư liệu cũ' });
            }
            if (!new_main_category || !new_main_category.trim()) {
                return reply.code(400).send({ error: 'Tên tư liệu mới không được để trống' });
            }

            const oldCat = old_main_category.trim();
            const newCat = new_main_category.trim();
            const deptId = department_id ? Number(department_id) : null;

            if (deptId) {
                await db.run(`
                    UPDATE board_documents
                    SET main_category = $1, updated_at = NOW()
                    WHERE main_category = $2 AND department_id = $3
                `, [newCat, oldCat, deptId]);
            } else {
                await db.run(`
                    UPDATE board_documents
                    SET main_category = $1, updated_at = NOW()
                    WHERE main_category = $2 AND department_id IS NULL
                `, [newCat, oldCat]);
            }

            return reply.send({ ok: true, old_category: oldCat, new_category: newCat });
        } catch(e) {
            console.error('[board-documents category rename]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/board-documents
    fastify.post('/api/board-documents', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const user = req.user;
            if (!['giam_doc', 'quan_ly_cap_cao'].includes(user.role)) {
                return reply.code(403).send({ error: 'Bạn không có quyền tạo tư liệu mới' });
            }
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

            const maxSortRow = await db.get(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM board_documents WHERE main_category = $1`, [main_category.trim()]);
            const nextSort = (maxSortRow && maxSortRow.next) ? maxSortRow.next : 1;

            const doc = await db.get(`
                INSERT INTO board_documents (department_id, department_name, main_category, sub_category, title, content, links, task_code, created_by, created_by_name, sort_order)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
                user.full_name || user.username,
                nextSort
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
            const user = req.user;
            if (!['giam_doc', 'quan_ly_cap_cao'].includes(user.role)) {
                return reply.code(403).send({ error: 'Bạn không có quyền chỉnh sửa tư liệu' });
            }
            const docId = req.params.id;
            if (isNaN(Number(docId))) {
                return reply.code(400).send({ error: 'ID tư liệu không hợp lệ' });
            }
            const { department_id, main_category, sub_category, title, content, links, task_code } = req.body;

            const existingDoc = await db.get(`SELECT * FROM board_documents WHERE id = $1`, [docId]);
            if (!existingDoc) {
                return reply.code(404).send({ error: 'Không tìm thấy tư liệu' });
            }

            const newMainCat = (main_category || '').trim();
            if (newMainCat && existingDoc.main_category !== newMainCat && user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ tài khoản Giám Đốc mới có quyền sửa tên tư liệu (mục chính)!' });
            }

            let deptName = '';
            const targetDeptId = department_id !== undefined ? (department_id || null) : existingDoc.department_id;
            if (targetDeptId) {
                const dept = await db.get(`SELECT name FROM departments WHERE id = $1`, [targetDeptId]);
                if (dept) deptName = dept.name;
            }

            const linksJson = JSON.stringify(Array.isArray(links) ? links : []);

            await db.run(`
                UPDATE board_documents
                SET department_id = $1, department_name = $2, main_category = $3, sub_category = $4, title = $5, content = $6, links = $7, task_code = $8, updated_at = NOW()
                WHERE id = $9
            `, [
                targetDeptId,
                deptName,
                newMainCat || existingDoc.main_category,
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
