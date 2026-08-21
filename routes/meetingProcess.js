/**
 * Meeting Process — Quy Trình Cuộc Họp
 * Full CRUD for meeting processes, process steps, sessions, notes, and department protocols
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function meetingProcessRoutes(fastify, options) {

    // ========== AUTO-MIGRATE SCHEMA ==========
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS meeting_processes (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            icon VARCHAR(50) DEFAULT '📋',
            display_order INTEGER DEFAULT 1,
            is_active BOOLEAN DEFAULT TRUE,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { console.error('[MeetingProcess] processes migration:', e.message); }

    // Seed default process "Quy Trình Họp Công Ty" if empty
    try {
        const procCount = await db.get('SELECT COUNT(*) AS c FROM meeting_processes');
        if (!procCount || parseInt(procCount.c) === 0) {
            await db.run(
                `INSERT INTO meeting_processes (id, name, description, icon, display_order) VALUES (1, $1, $2, $3, 1)`,
                ['Quy Trình Họp Công Ty', 'Quy trình họp chuẩn dành cho toàn thể công ty', '🏢']
            );
            console.log('[MeetingProcess] ✅ Seeded default process "Quy Trình Họp Công Ty"');
        }
    } catch(e) { console.error('[MeetingProcess] seed process error:', e.message); }

    try {
        await db.run(`CREATE TABLE IF NOT EXISTS meeting_process_steps (
            id SERIAL PRIMARY KEY,
            process_id INTEGER DEFAULT 1,
            step_order INTEGER NOT NULL DEFAULT 1,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            linked_menu VARCHAR(255),
            linked_menu_label VARCHAR(255),
            document_url TEXT,
            icon VARCHAR(50) DEFAULT '📋',
            department_ids TEXT DEFAULT '[]',
            metrics TEXT DEFAULT '[]',
            is_active BOOLEAN DEFAULT TRUE,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`);
        await db.run(`ALTER TABLE meeting_process_steps ADD COLUMN IF NOT EXISTS process_id INTEGER DEFAULT 1`);
        await db.run(`UPDATE meeting_process_steps SET process_id = 1 WHERE process_id IS NULL`);
    } catch(e) { console.error('[MeetingProcess] steps migration:', e.message); }

    try {
        await db.run(`ALTER TABLE meeting_process_steps ADD COLUMN IF NOT EXISTS document_url TEXT`);
        await db.run(`ALTER TABLE meeting_process_steps ADD COLUMN IF NOT EXISTS suggested_questions TEXT`);
        await db.run(`ALTER TABLE meeting_process_steps ALTER COLUMN linked_menu TYPE TEXT`);
        await db.run(`ALTER TABLE meeting_process_steps ALTER COLUMN linked_menu_label TYPE TEXT`);

        // Auto-fix any step_orders corrupted with 999 or gaps
        const processes = await db.all('SELECT id FROM meeting_processes WHERE is_active = TRUE');
        for (const proc of (processes || [])) {
            const steps = await db.all('SELECT id FROM meeting_process_steps WHERE is_active = TRUE AND process_id = $1 ORDER BY step_order ASC, id ASC', [proc.id]);
            for (let i = 0; i < steps.length; i++) {
                await db.run('UPDATE meeting_process_steps SET step_order = $1 WHERE id = $2', [i + 1, steps[i].id]);
            }
        }
    } catch(e) { }

    try {
        await db.run(`CREATE TABLE IF NOT EXISTS meeting_process_sessions (
            id SERIAL PRIMARY KEY,
            process_id INTEGER DEFAULT 1,
            title VARCHAR(500) NOT NULL,
            meeting_date DATE NOT NULL,
            start_time VARCHAR(10),
            end_time VARCHAR(10),
            chairperson_id INTEGER REFERENCES users(id),
            secretary_id INTEGER REFERENCES users(id),
            attendees TEXT DEFAULT '[]',
            status VARCHAR(50) DEFAULT 'dang_dien_ra',
            conclusion TEXT,
            next_actions TEXT,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`);
        await db.run(`ALTER TABLE meeting_process_sessions ADD COLUMN IF NOT EXISTS process_id INTEGER DEFAULT 1`);
        await db.run(`ALTER TABLE meeting_process_sessions ADD COLUMN IF NOT EXISTS collection_id INTEGER`);
        await db.run(`UPDATE meeting_process_sessions SET process_id = 1 WHERE process_id IS NULL`);

        // Auto-repair any sessions whose process_id was accidentally overwritten to 1
        try {
            await db.run(`
                UPDATE meeting_process_sessions s
                SET process_id = sub.process_id
                FROM (
                    SELECT DISTINCT n.session_id, st.process_id
                    FROM meeting_process_notes n
                    JOIN meeting_process_steps st ON st.id = n.step_id
                    WHERE st.process_id IS NOT NULL AND st.process_id > 1
                ) sub
                WHERE s.id = sub.session_id AND (s.process_id IS NULL OR s.process_id = 1)
            `);
            console.log('[MeetingProcess] ✅ Auto-repaired corrupted session process_ids');
        } catch(errRepair) { console.error('[MeetingProcess] repair process_id error:', errRepair.message); }
    } catch(e) { console.error('[MeetingProcess] sessions migration:', e.message); }

    try {
        await db.run(`CREATE TABLE IF NOT EXISTS meeting_process_notes (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES meeting_process_sessions(id) ON DELETE CASCADE,
            step_id INTEGER REFERENCES meeting_process_steps(id),
            step_title VARCHAR(500),
            content TEXT,
            next_actions TEXT,
            noted_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { console.error('[MeetingProcess] notes migration:', e.message); }

    try {
        await db.run(`ALTER TABLE meeting_process_notes ADD COLUMN IF NOT EXISTS next_actions TEXT`);
    } catch(e) {}

    try {
        await db.run(`ALTER TABLE meeting_process_notes ADD COLUMN IF NOT EXISTS item_statuses TEXT DEFAULT '[]'`);
    } catch(e) {}

    try {
        await db.run(`ALTER TABLE meeting_process_notes ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT FALSE`);
    } catch(e) {}

    try {
        await db.run(`CREATE TABLE IF NOT EXISTS meeting_dept_protocols (
            id SERIAL PRIMARY KEY,
            department_id INTEGER REFERENCES departments(id),
            preparation TEXT,
            report_metrics TEXT DEFAULT '[]',
            linked_menu VARCHAR(255),
            linked_menu_label VARCHAR(255),
            notes TEXT,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(department_id)
        )`);
    } catch(e) { console.error('[MeetingProcess] dept_protocols migration:', e.message); }

    // ========== SEED DEFAULT 8 STEPS FOR PROCESS 1 ==========
    try {
        const stepCount = await db.get('SELECT COUNT(*) AS c FROM meeting_process_steps WHERE process_id = 1');
        if (!stepCount || parseInt(stepCount.c) === 0) {
            const defaultSteps = [
                { order: 1, title: 'Mở đầu & Điểm danh', desc: 'Giám đốc / Chủ tọa khai mạc cuộc họp. Thư ký điểm danh thành viên tham dự, ghi nhận vắng mặt.', icon: '📢', menu: '/dashboard', menuLabel: 'Các Chỉ Số Tổng Quan' },
                { order: 2, title: 'Báo cáo chỉ số tổng quan', desc: 'Xem tổng quan các chỉ số kinh doanh: Doanh số, CPO, Tỉ lệ chốt đơn, Số đơn hàng trong kỳ.', icon: '📊', menu: '/dashboard', menuLabel: 'Các Chỉ Số Tổng Quan' },
                { order: 3, title: 'Phòng Kinh Doanh báo cáo', desc: 'Báo cáo KPI Phòng Kinh Doanh: Số đơn hàng, doanh số, tỉ lệ chốt, khách hàng mới tiếp cận.', icon: '🎯', menu: '/kpikdoanh', menuLabel: 'KPI P.Kinh Doanh' },
                { order: 4, title: 'Phòng Sale báo cáo', desc: 'Báo cáo KPI Phòng Sale: Doanh thu bán hàng, khách hàng mới, tỉ lệ chuyển đổi, chăm sóc sau bán.', icon: '💼', menu: '/kpisale', menuLabel: 'KPI P.Sale' },
                { order: 5, title: 'Phòng Marketing báo cáo', desc: 'Báo cáo KPI Marketing: Chi phí quảng cáo, CPL (Cost Per Lead), ROAS, hiệu suất chiến dịch.', icon: '📈', menu: '/kpimarketing', menuLabel: 'KPI Marketing Ads' },
                { order: 6, title: 'Review Bảng Công Việc', desc: 'Xem Bảng Công Việc: Tỉ lệ hoàn thành deadline, task tồn đọng, phân bổ công việc theo phòng ban.', icon: '📋', menu: '/bangcongviec', menuLabel: 'Bảng Công Việc' },
                { order: 7, title: 'Cam kết & Giao việc', desc: 'Cam Kết Cuộc Họp: Phân công nhiệm vụ cụ thể, cam kết từng cá nhân, deadline thực hiện.', icon: '📝', menu: '/camketcuochop', menuLabel: 'Cam Kết Cuộc Họp' },
                { order: 8, title: 'Tổng kết & Kết thúc', desc: 'Thư ký tổng hợp nội dung cuộc họp. Giám đốc chốt phương hướng, kế hoạch hành động tiếp theo.', icon: '🔚', menu: '', menuLabel: '' }
            ];
            for (const s of defaultSteps) {
                await db.run(
                    `INSERT INTO meeting_process_steps (process_id, step_order, title, description, icon, linked_menu, linked_menu_label) VALUES (1, $1, $2, $3, $4, $5, $6)`,
                    [s.order, s.title, s.desc, s.icon, s.menu, s.menuLabel]
                );
            }
            console.log('[MeetingProcess] ✅ Seeded 8 default steps for process 1');
        }
    } catch(e) { console.error('[MeetingProcess] seed error:', e.message); }

    // ========== PERMISSION HELPER ==========
    async function checkPerm(request, permType) {
        const user = request.user;
        if (!user) return false;
        if (user.role === 'giam_doc') return true;
        try {
            const perm = await db.get(
                `SELECT permissions FROM user_permissions WHERE user_id = $1`,
                [user.id]
            );
            if (perm && perm.permissions) {
                const perms = typeof perm.permissions === 'string' ? JSON.parse(perm.permissions) : perm.permissions;
                const feature = perms['quy_trinh_cuoc_hop'];
                if (feature && feature[permType]) return true;
            }
        } catch(e) { /* no perms */ }
        return false;
    }

    // ===================================================================
    // ========== PROCESSES API (CRUD) ==========
    // ===================================================================

    // GET all processes
    fastify.get('/api/meeting-process/processes', { preHandler: [authenticate] }, async (request, reply) => {
        const canView = await checkPerm(request, 'view');
        if (!canView) return reply.code(403).send({ error: 'Không có quyền truy cập' });

        const processes = await db.all('SELECT * FROM meeting_processes WHERE is_active = TRUE ORDER BY display_order ASC, id ASC');
        return { success: true, processes: processes || [] };
    });

    // POST create/update process
    fastify.post('/api/meeting-process/processes', { preHandler: [authenticate] }, async (request, reply) => {
        const canEdit = await checkPerm(request, 'edit');
        if (!canEdit) return reply.code(403).send({ error: 'Không có quyền chỉnh sửa' });

        const { id, name, description, icon, display_order } = request.body;
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Tên quy trình không được để trống' });

        if (id) {
            await db.run(
                `UPDATE meeting_processes SET name = $1, description = $2, icon = $3, display_order = $4, updated_at = NOW() WHERE id = $5`,
                [name.trim(), description || '', icon || '📋', parseInt(display_order) || 1, id]
            );
            return { success: true, message: 'Đã cập nhật quy trình' };
        } else {
            const maxOrd = await db.get('SELECT MAX(display_order) as max_ord FROM meeting_processes WHERE is_active = TRUE');
            const newOrd = (maxOrd && maxOrd.max_ord ? parseInt(maxOrd.max_ord) : 0) + 1;
            const result = await db.run(
                `INSERT INTO meeting_processes (name, description, icon, display_order, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [name.trim(), description || '', icon || '📋', newOrd, request.user.id]
            );
            const createdProcId = result ? (result.lastInsertRowid || result.id) : null;
            return { success: true, message: 'Đã tạo quy trình mới', id: createdProcId };
        }
    });

    // DELETE process
    fastify.delete('/api/meeting-process/processes/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const canDelete = await checkPerm(request, 'delete');
        if (!canDelete) return reply.code(403).send({ error: 'Không có quyền xóa' });

        const processId = parseInt(request.params.id);
        const count = await db.get('SELECT COUNT(*) AS c FROM meeting_processes WHERE is_active = TRUE');
        if (count && parseInt(count.c) <= 1) {
            return reply.code(400).send({ error: 'Hệ thống phải có ít nhất 1 quy trình cuộc họp!' });
        }

        await db.run('UPDATE meeting_processes SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [processId]);
        return { success: true, message: 'Đã xóa quy trình' };
    });

    // ===================================================================
    // ========== STEPS API ==========
    // ===================================================================

    // GET all steps (filtered by process_id)
    fastify.get('/api/meeting-process/steps', { preHandler: [authenticate] }, async (request, reply) => {
        const canView = await checkPerm(request, 'view');
        if (!canView) return reply.code(403).send({ error: 'Không có quyền truy cập' });

        const processId = parseInt(request.query.process_id) || 1;
        const steps = await db.all('SELECT * FROM meeting_process_steps WHERE is_active = TRUE AND process_id = $1 ORDER BY step_order ASC', [processId]);
        return { success: true, steps: steps || [] };
    });

    // POST create/update step
    fastify.post('/api/meeting-process/steps', { preHandler: [authenticate] }, async (request, reply) => {
        const canEdit = await checkPerm(request, 'edit');
        if (!canEdit) return reply.code(403).send({ error: 'Không có quyền chỉnh sửa' });

        const { id, process_id, step_order, title, description, icon, linked_menu, linked_menu_label, document_url, department_ids, metrics, suggested_questions } = request.body;
        const targetProcessId = parseInt(process_id) || 1;

        if (!title) return reply.code(400).send({ error: 'Tiêu đề bước không được để trống' });

        const targetOrder = parseInt(step_order) || 1;

        if (id) {
            // Update step details
            await db.run(
                `UPDATE meeting_process_steps SET process_id = $1, title = $2, description = $3, icon = $4, linked_menu = $5, linked_menu_label = $6, document_url = $7, department_ids = $8, metrics = $9, suggested_questions = $10, updated_at = NOW() WHERE id = $11`,
                [targetProcessId, title, description || '', icon || '📋', linked_menu || '', linked_menu_label || '', document_url || '', JSON.stringify(department_ids || []), JSON.stringify(metrics || []), suggested_questions || '', id]
            );
            // Auto re-sequence steps clean for target process
            await _mpResequenceSteps(id, targetOrder, targetProcessId);
            return { success: true, message: 'Đã cập nhật bước' };
        } else {
            // Create step
            const result = await db.run(
                `INSERT INTO meeting_process_steps (process_id, step_order, title, description, icon, linked_menu, linked_menu_label, document_url, department_ids, metrics, suggested_questions, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
                [targetProcessId, 999, title, description || '', icon || '📋', linked_menu || '', linked_menu_label || '', document_url || '', JSON.stringify(department_ids || []), JSON.stringify(metrics || []), suggested_questions || '', request.user.id]
            );
            const newId = result ? (result.lastInsertRowid || result.id) : null;
            if (newId) {
                await _mpResequenceSteps(newId, targetOrder, targetProcessId);
            }
            return { success: true, message: 'Đã thêm bước mới', id: newId };
        }
    });

    async function _mpResequenceSteps(targetId, targetOrder, processId) {
        const pId = parseInt(processId) || 1;
        const allSteps = await db.all('SELECT id FROM meeting_process_steps WHERE is_active = TRUE AND process_id = $1 ORDER BY step_order ASC, id ASC', [pId]);
        const filtered = allSteps.filter(s => s.id !== parseInt(targetId));
        const newIdx = Math.max(0, Math.min(filtered.length, targetOrder - 1));
        filtered.splice(newIdx, 0, { id: parseInt(targetId) });
        for (let i = 0; i < filtered.length; i++) {
            await db.run('UPDATE meeting_process_steps SET step_order = $1 WHERE id = $2', [i + 1, filtered[i].id]);
        }
    }

    // DELETE step (soft delete)
    fastify.delete('/api/meeting-process/steps/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const canDelete = await checkPerm(request, 'delete');
        if (!canDelete) return reply.code(403).send({ error: 'Không có quyền xóa' });

        const step = await db.get('SELECT process_id FROM meeting_process_steps WHERE id = $1', [request.params.id]);
        await db.run('UPDATE meeting_process_steps SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [request.params.id]);
        if (step && step.process_id) {
            await _mpResequenceSteps(0, 99999, step.process_id);
        }
        return { success: true, message: 'Đã xóa bước' };
    });

    // POST reorder steps
    fastify.post('/api/meeting-process/steps/reorder', { preHandler: [authenticate] }, async (request, reply) => {
        const canEdit = await checkPerm(request, 'edit');
        if (!canEdit) return reply.code(403).send({ error: 'Không có quyền chỉnh sửa' });

        const { order } = request.body; // array of {id, step_order}
        if (!order || !Array.isArray(order)) return reply.code(400).send({ error: 'Dữ liệu không hợp lệ' });

        for (const item of order) {
            await db.run('UPDATE meeting_process_steps SET step_order = $1, updated_at = NOW() WHERE id = $2', [item.step_order, item.id]);
        }
        return { success: true, message: 'Đã sắp xếp lại thứ tự' };
    });

    // ===================================================================
    // ========== SESSIONS API ==========
    // ===================================================================

    // GET sessions (with filters)
    fastify.get('/api/meeting-process/sessions', { preHandler: [authenticate] }, async (request, reply) => {
        const canView = await checkPerm(request, 'view');
        if (!canView) return reply.code(403).send({ error: 'Không có quyền truy cập' });

        const { process_id, month, quarter, year, search, page, limit } = request.query;
        const pageNum = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 20;
        const offset = (pageNum - 1) * pageSize;

        let where = 'WHERE 1=1';
        const params = [];
        let paramIdx = 1;

        if (process_id && process_id !== 'all') {
            where += ` AND s.process_id = $${paramIdx++}`;
            params.push(parseInt(process_id));
        }
        if (year) {
            where += ` AND EXTRACT(YEAR FROM s.meeting_date) = $${paramIdx++}`;
            params.push(parseInt(year));
        }
        if (month) {
            where += ` AND EXTRACT(MONTH FROM s.meeting_date) = $${paramIdx++}`;
            params.push(parseInt(month));
        }
        if (quarter) {
            const q = parseInt(quarter);
            const startMonth = (q - 1) * 3 + 1;
            const endMonth = q * 3;
            where += ` AND EXTRACT(MONTH FROM s.meeting_date) BETWEEN $${paramIdx++} AND $${paramIdx++}`;
            params.push(startMonth, endMonth);
        }
        if (search) {
            where += ` AND (s.title ILIKE $${paramIdx++} OR s.conclusion ILIKE $${paramIdx++})`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        const countQuery = `SELECT COUNT(*) AS total FROM meeting_process_sessions s ${where}`;
        const countResult = await db.get(countQuery, params);
        const total = countResult ? parseInt(countResult.total) : 0;

        const dataQuery = `
                   p.name AS process_name,
                   p.icon AS process_icon,
                   cp.full_name AS chairperson_name,
                   sec.full_name AS secretary_name
            FROM meeting_process_sessions s
            LEFT JOIN meeting_processes p ON p.id = s.process_id
            LEFT JOIN users cp ON cp.id = s.chairperson_id
            LEFT JOIN users sec ON sec.id = s.secretary_id
            ${where}
            ORDER BY s.meeting_date DESC, s.created_at DESC
            LIMIT $${paramIdx++} OFFSET $${paramIdx++}
        `;
        params.push(pageSize, offset);

        const sessions = await db.all(dataQuery, params);
        return {
            success: true,
            sessions: sessions || [],
            total,
            page: pageNum,
            totalPages: Math.ceil(total / pageSize)
        };
    });

    // POST create session
    fastify.post('/api/meeting-process/sessions', { preHandler: [authenticate] }, async (request, reply) => {
        const canCreate = await checkPerm(request, 'create');
        if (!canCreate) return reply.code(403).send({ error: 'Không có quyền tạo phiên họp' });

        const { process_id, collection_id, title, meeting_date, start_time, end_time, chairperson_id, secretary_id, attendees } = request.body;
        if (!title || !meeting_date) return reply.code(400).send({ error: 'Tiêu đề và ngày họp bắt buộc' });

        const targetProcessId = parseInt(process_id) || 1;

        // Check if there is already an active meeting for this process type
        const activeSession = await db.get(
            `SELECT s.id, s.title, p.name AS process_name
             FROM meeting_process_sessions s
             LEFT JOIN meeting_processes p ON p.id = s.process_id
             WHERE COALESCE(s.process_id, 1) = $1 AND s.status = 'dang_dien_ra'
             LIMIT 1`,
            [targetProcessId]
        );

        if (activeSession) {
            const procName = activeSession.process_name || 'quy trình này';
            return reply.code(400).send({
                error: `⚠️ Quy trình "${procName}" hiện đang có 1 cuộc họp đang diễn ra ("${activeSession.title}"). Vui lòng hoàn thành & lưu kết thúc cuộc họp cũ trước khi tạo cuộc họp mới!`
            });
        }

        const result = await db.run(
            `INSERT INTO meeting_process_sessions (process_id, collection_id, title, meeting_date, start_time, end_time, chairperson_id, secretary_id, attendees, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
            [targetProcessId, collection_id ? parseInt(collection_id) : null, title, meeting_date, start_time || '', end_time || '', chairperson_id || request.user.id, secretary_id || null, JSON.stringify(attendees || []), request.user.id]
        );
        return { success: true, message: 'Đã tạo phiên họp mới', id: result ? result.id : null };
    });

    // PUT update session
    fastify.put('/api/meeting-process/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const canEdit = await checkPerm(request, 'edit');
        if (!canEdit) return reply.code(403).send({ error: 'Không có quyền chỉnh sửa' });

        const existing = await db.get(`SELECT * FROM meeting_process_sessions WHERE id = $1`, [request.params.id]);
        if (!existing) return reply.code(404).send({ error: 'Không tìm thấy phiên họp' });

        const { process_id, collection_id, title, meeting_date, start_time, end_time, chairperson_id, secretary_id, attendees, status, conclusion, next_actions } = request.body;

        let targetProcessId = existing.process_id || 1;
        if (process_id !== undefined && process_id !== null && !isNaN(parseInt(process_id))) {
            targetProcessId = parseInt(process_id);
        }

        let parsedAttendees = existing.attendees;
        if (attendees !== undefined && Array.isArray(attendees)) {
            parsedAttendees = JSON.stringify(attendees);
        }

        await db.run(
            `UPDATE meeting_process_sessions SET process_id=$1, collection_id=$2, title=$3, meeting_date=$4, start_time=$5, end_time=$6, chairperson_id=$7, secretary_id=$8, attendees=$9, status=$10, conclusion=$11, next_actions=$12, updated_at=NOW() WHERE id=$13`,
            [
                targetProcessId,
                collection_id !== undefined ? (collection_id ? parseInt(collection_id) : null) : existing.collection_id,
                title || existing.title,
                meeting_date || existing.meeting_date,
                start_time !== undefined ? start_time : existing.start_time,
                end_time !== undefined ? end_time : existing.end_time,
                chairperson_id !== undefined ? chairperson_id : existing.chairperson_id,
                secretary_id !== undefined ? secretary_id : existing.secretary_id,
                parsedAttendees,
                status || existing.status,
                conclusion !== undefined ? conclusion : existing.conclusion,
                next_actions !== undefined ? next_actions : existing.next_actions,
                request.params.id
            ]
        );
        return { success: true, message: 'Đã cập nhật phiên họp' };
    });

    // DELETE session
    fastify.delete('/api/meeting-process/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const canDelete = await checkPerm(request, 'delete');
        if (!canDelete) return reply.code(403).send({ error: 'Không có quyền xóa' });

        await db.run('DELETE FROM meeting_process_sessions WHERE id = $1', [request.params.id]);
        return { success: true, message: 'Đã xóa phiên họp' };
    });

    // ===================================================================
    // ========== NOTES API ==========
    // ===================================================================

    // GET notes for a session
    fastify.get('/api/meeting-process/sessions/:id/notes', { preHandler: [authenticate] }, async (request, reply) => {
        const canView = await checkPerm(request, 'view');
        if (!canView) return reply.code(403).send({ error: 'Không có quyền truy cập' });

        const notes = await db.all(
            `SELECT n.*, u.full_name AS noted_by_name
             FROM meeting_process_notes n
             LEFT JOIN users u ON u.id = n.noted_by
             WHERE n.session_id = $1
             ORDER BY n.step_id ASC, n.created_at ASC`,
            [request.params.id]
        );
        return { success: true, notes: notes || [] };
    });

    // POST add/update note
    fastify.post('/api/meeting-process/sessions/:id/notes', { preHandler: [authenticate] }, async (request, reply) => {
        const canCreate = await checkPerm(request, 'create');
        if (!canCreate) return reply.code(403).send({ error: 'Không có quyền ghi chép' });

        const { note_id, step_id, step_title, content, next_actions, item_statuses, is_skipped } = request.body;
        const sessionId = request.params.id;

        const itemStatusesStr = item_statuses ? (typeof item_statuses === 'string' ? item_statuses : JSON.stringify(item_statuses)) : '[]';
        const isSkippedBool = (is_skipped === true || is_skipped === 'true' || is_skipped === 1);

        if (note_id) {
            // Update existing note
            await db.run(
                `UPDATE meeting_process_notes SET content=$1, step_title=$2, next_actions=$3, item_statuses=$4, is_skipped=$5, updated_at=NOW() WHERE id=$6 AND session_id=$7`,
                [content || '', step_title || '', next_actions || '', itemStatusesStr, isSkippedBool, note_id, sessionId]
            );
            return { success: true, message: 'Đã cập nhật ghi chép' };
        } else {
            // Create new note
            const result = await db.run(
                `INSERT INTO meeting_process_notes (session_id, step_id, step_title, content, next_actions, item_statuses, is_skipped, noted_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
                [sessionId, step_id || null, step_title || '', content || '', next_actions || '', itemStatusesStr, isSkippedBool, request.user.id]
            );
            return { success: true, message: 'Đã thêm ghi chép', id: result ? result.id : null };
        }
    });

    // GET previous session note for a specific step
    fastify.get('/api/meeting-process/sessions/:sessionId/steps/:stepId/previous-note', { preHandler: [authenticate] }, async (request, reply) => {
        const canView = await checkPerm(request, 'view');
        if (!canView) return reply.code(403).send({ error: 'Không có quyền truy cập' });

        const sId = parseInt(request.params.sessionId, 10);
        const stId = parseInt(request.params.stepId, 10);

        const currentSession = await db.get('SELECT * FROM meeting_process_sessions WHERE id = ?', [sId]);
        if (!currentSession) return reply.send({ success: true, note: null, prevSession: null });

        const procId = currentSession.process_id || 1;

        // Find the IMMEDIATELY PRECEDING session (id < current sessionId) of the same process
        const prevSession = await db.get(
            `SELECT id, title, meeting_date FROM meeting_process_sessions WHERE COALESCE(process_id, 1) = ? AND id < ? ORDER BY id DESC LIMIT 1`,
            [procId, sId]
        );

        if (!prevSession) {
            return reply.send({ success: true, note: null, prevSession: null });
        }

        // Find note for that specific step specifically from the immediately preceding session
        let note = null;
        if (stId > 0) {
            note = await db.get(
                `SELECT n.*, u.full_name AS noted_by_name
                 FROM meeting_process_notes n
                 LEFT JOIN users u ON u.id = n.noted_by
                 WHERE n.session_id = ?
                   AND n.step_id = ?
                   AND (n.content IS NOT NULL AND TRIM(n.content) <> '' AND TRIM(n.content) <> '1.')`,
                [prevSession.id, stId]
            );
        }

        return reply.send({
            success: true,
            prevSession: prevSession,
            note: note
        });
    });

    // GET /api/meeting-process/task-history
    fastify.get('/api/meeting-process/task-history', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { process_id } = request.query || {};

            let query = `
                SELECT 
                    n.id AS note_id,
                    n.session_id,
                    n.step_id,
                    n.step_title,
                    n.content,
                    n.item_statuses,
                    n.is_skipped,
                    n.created_at AS note_created_at,
                    n.updated_at AS note_updated_at,
                    s.title AS session_title,
                    s.meeting_date AS session_date,
                    COALESCE(s.process_id, 1) AS process_id,
                    p.name AS process_title,
                    p.icon AS process_icon,
                    st.step_order,
                    (SELECT COUNT(*) FROM meeting_process_steps st2 WHERE st2.process_id = COALESCE(s.process_id, 1)) AS total_steps
                FROM meeting_process_notes n
                JOIN meeting_process_sessions s ON s.id = n.session_id
                LEFT JOIN meeting_processes p ON p.id = COALESCE(s.process_id, 1)
                LEFT JOIN meeting_process_steps st ON st.id = n.step_id
                WHERE ((n.content IS NOT NULL AND TRIM(n.content) <> '' AND TRIM(n.content) <> '1.') OR (n.item_statuses IS NOT NULL AND TRIM(n.item_statuses) <> '' AND TRIM(n.item_statuses) <> '[]'))
            `;

            const params = [];
            if (process_id && process_id !== 'all') {
                params.push(parseInt(process_id, 10));
                query += ` AND COALESCE(s.process_id, 1) = $${params.length}`;
            }

            query += ` ORDER BY s.meeting_date DESC, s.id DESC, st.step_order ASC`;

            const rows = await db.all(query, params);

            const allTasks = [];

            (rows || []).forEach(row => {
                let savedStatuses = [];
                try { savedStatuses = JSON.parse(row.item_statuses || '[]'); } catch(e) {}

                const rawContent = row.content || '';
                const rawLines = rawContent.split('\n');
                const parsedItemsFromContent = [];
                rawLines.forEach(l => {
                    const clean = l.replace(/^\s*\d+[\.\)]\s*/, '').trim();
                    if (clean && 
                        !clean.startsWith('function') && 
                        !clean.startsWith('return') && 
                        !clean.startsWith('//') && 
                        !clean.startsWith('var ') && 
                        !clean.startsWith('const ') && 
                        !clean.startsWith('let ') && 
                        !clean.startsWith('if (') && 
                        !clean.startsWith('html +=') && 
                        !clean.startsWith('alert(') && 
                        !clean.startsWith('window.') && 
                        !clean.endsWith(');') && 
                        !clean.endsWith('{')) {
                        parsedItemsFromContent.push(clean);
                    }
                });

                let finalItems = [];

                if (parsedItemsFromContent.length > 0) {
                    finalItems = parsedItemsFromContent.map((itemText, idx) => {
                        const found = savedStatuses.find(s => s.index === idx || s.text === itemText || String(s.index) === String(idx));
                        return {
                            item_text: itemText,
                            completed: found ? (found.completed !== undefined ? !!found.completed : !!found.done) : false,
                            evidence_link: found ? (found.evidence_link || found.proof || '') : '',
                            evidence_image: found ? (found.evidence_image || '') : '',
                            completed_at: found ? (found.completed_at || '') : '',
                            transferred_to: found ? (found.transferred_to || '') : '',
                            idx: idx
                        };
                    });
                } else if (savedStatuses.length > 0) {
                    finalItems = savedStatuses.map((s, idx) => {
                        return {
                            item_text: s.text || ('Mục ' + (idx + 1)),
                            completed: s.completed !== undefined ? !!s.completed : !!s.done,
                            evidence_link: s.evidence_link || s.proof || '',
                            evidence_image: s.evidence_image || '',
                            completed_at: s.completed_at || '',
                            transferred_to: s.transferred_to || '',
                            idx: s.index !== undefined ? s.index : idx
                        };
                    });
                }

                finalItems.forEach(it => {
                    const isFullyHandled = (it.completed && it.evidence_link && it.evidence_link.trim().length > 0) || (it.transferred_to && it.transferred_to.trim().length > 0);

                    allTasks.push({
                        note_id: row.note_id,
                        session_id: row.session_id,
                        session_title: row.session_title || 'Cuộc Họp',
                        session_date: row.session_date,
                        process_id: row.process_id,
                        process_title: row.process_title || 'Quy Trình Họp',
                        process_icon: row.process_icon || '📋',
                        process_color: row.process_color || '#6366f1',
                        step_id: row.step_id,
                        step_title: row.step_title || ('Bước ' + (row.step_order || '')),
                        step_order: row.step_order || 1,
                        total_steps: row.total_steps || 1,
                        item_index: it.idx,
                        item_text: it.item_text,
                        completed: it.completed,
                        evidence_link: it.evidence_link,
                        evidence_image: it.evidence_image,
                        completed_at: it.completed_at,
                        transferred_to: it.transferred_to,
                        is_handled: isFullyHandled
                    });
                });
            });

            return reply.send({ success: true, tasks: allTasks });
        } catch(e) {
            console.error('[MeetingProcess] task-history error:', e.message);
            return reply.send({ success: false, error: e.message, tasks: [] });
        }
    });

    // POST update item completion statuses for a note
    fastify.post('/api/meeting-process/notes/:noteId/item-status', { preHandler: [authenticate] }, async (request, reply) => {
        const canCreate = await checkPerm(request, 'create');
        if (!canCreate) return reply.code(403).send({ error: 'Không có quyền ghi chép' });

        const { noteId } = request.params;
        const { item_statuses } = request.body;

        const itemStatusesStr = typeof item_statuses === 'string' ? item_statuses : JSON.stringify(item_statuses || []);

        await db.run(
            `UPDATE meeting_process_notes SET item_statuses = $1, updated_at = NOW() WHERE id = $2`,
            [itemStatusesStr, noteId]
        );
        return reply.send({ success: true, message: 'Đã cập nhật trạng thái nhiệm vụ' });
    });

    // ===================================================================
    // ========== DEPT PROTOCOLS API ==========
    // ===================================================================

    // GET all dept protocols
    fastify.get('/api/meeting-process/dept-protocols', { preHandler: [authenticate] }, async (request, reply) => {
        const canView = await checkPerm(request, 'view');
        if (!canView) return reply.code(403).send({ error: 'Không có quyền truy cập' });

        const protocols = await db.all(
            `SELECT dp.*, d.name AS department_name
             FROM meeting_dept_protocols dp
             LEFT JOIN departments d ON d.id = dp.department_id
             ORDER BY d.display_order ASC, d.name ASC`
        );

        // Also get all departments for configuration
        const departments = await db.all(`SELECT id, name, parent_id FROM departments WHERE parent_id IS NOT NULL ORDER BY display_order ASC, name ASC`);

        return { success: true, protocols: protocols || [], departments: departments || [] };
    });

    // POST create/update dept protocol
    fastify.post('/api/meeting-process/dept-protocols', { preHandler: [authenticate] }, async (request, reply) => {
        const canEdit = await checkPerm(request, 'edit');
        if (!canEdit) return reply.code(403).send({ error: 'Không có quyền cấu hình' });

        const { department_id, preparation, report_metrics, linked_menu, linked_menu_label, notes } = request.body;
        if (!department_id) return reply.code(400).send({ error: 'Phòng ban bắt buộc' });

        await db.run(
            `INSERT INTO meeting_dept_protocols (department_id, preparation, report_metrics, linked_menu, linked_menu_label, notes, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (department_id) DO UPDATE SET preparation=$2, report_metrics=$3, linked_menu=$4, linked_menu_label=$5, notes=$6, updated_at=NOW()`,
            [department_id, preparation || '', JSON.stringify(report_metrics || []), linked_menu || '', linked_menu_label || '', notes || '', request.user.id]
        );
        return { success: true, message: 'Đã cập nhật quy trình phòng ban' };
    });

    // ===================================================================
    // ========== GET ALL USERS (for attendees picker) ==========
    // ===================================================================
    fastify.get('/api/meeting-process/users', { preHandler: [authenticate] }, async (request, reply) => {
        const users = await db.all(`SELECT id, full_name, role FROM users WHERE status = 'active' ORDER BY full_name ASC`);
        return { success: true, users: users || [] };
    });
}

module.exports = meetingProcessRoutes;
