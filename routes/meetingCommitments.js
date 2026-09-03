/**
 * Meeting Commitments — Cam Kết Cuộc Họp
 * Only Director (giam_doc) can create/edit/review
 * Employees can view their own commitments
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function meetingCommitmentsRoutes(fastify, options) {

    // Auto-migrate: add source column to meeting_sessions if not exists
    try {
        await db.run(`ALTER TABLE meeting_sessions ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT NULL`);
        // Migrate existing sessions: classify by title
        await db.run(`UPDATE meeting_sessions SET source = 'kpikdoanh' WHERE source IS NULL AND UPPER(title) LIKE '%KINH DOANH%'`);
        await db.run(`UPDATE meeting_sessions SET source = 'kpisale' WHERE source IS NULL AND UPPER(title) LIKE '%SALE%'`);
        await db.run(`UPDATE meeting_sessions SET source = 'kpimarketing' WHERE source IS NULL AND UPPER(title) LIKE '%MARKETING%'`);
    } catch(e) { /* column may already exist */ }

    // Auto-migrate: meeting_session_departments table
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS meeting_session_departments (
            session_id INTEGER NOT NULL REFERENCES meeting_sessions(id) ON DELETE CASCADE,
            department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (session_id, department_id)
        )`);
    } catch(e) { console.error('Migration error meeting_session_departments:', e); }

    // Auto-migrate: meeting_permissions table
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS meeting_permissions (
            id SERIAL PRIMARY KEY,
            source VARCHAR(50) NOT NULL,
            permission_type VARCHAR(50) NOT NULL,
            allowed_roles TEXT NOT NULL DEFAULT 'giam_doc',
            updated_at TIMESTAMP DEFAULT NOW(),
            updated_by INTEGER,
            UNIQUE(source, permission_type)
        )`);
        // Seed defaults if empty or insert missing
        const defaults = [
            ['kpikdoanh', 'create_session', 'giam_doc'],
            ['kpikdoanh', 'setup_personal', 'giam_doc'],
            ['kpikdoanh', 'setup_team', 'giam_doc'],
            ['kpisale', 'create_session', 'giam_doc'],
            ['kpisale', 'setup_personal', 'giam_doc'],
            ['kpisale', 'setup_team', 'giam_doc'],
            ['kpimarketing', 'create_session', 'giam_doc'],
            ['kpimarketing', 'setup_personal', 'giam_doc'],
            ['kpimarketing', 'setup_team', 'giam_doc'],
        ];
        for (const [src, pt, roles] of defaults) {
            await db.run('INSERT INTO meeting_permissions (source, permission_type, allowed_roles) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [src, pt, roles]);
        }
    } catch(e) { console.error('meeting_permissions migration error:', e.message); }


    // Role hierarchy helper: can requester manage target user?
    const EDIT_ROLES = ['giam_doc', 'quan_ly', 'quan_ly_cap_cao'];
    async function canManageUser(requester, targetUserId) {
        if (requester.role === 'giam_doc') return true;
        if (requester.id === targetUserId) return true; // self
        if (EDIT_ROLES.includes(requester.role)) {
            // QL can manage truong_phong + nhan_vien + thu_viec
            const target = await db.get('SELECT role FROM users WHERE id = ?', [targetUserId]);
            if (target && ['truong_phong', 'nhan_vien', 'thu_viec'].includes(target.role)) return true;
        }
        return false;
    }

    // ===== GET commitment templates for a page (MUST be before parametric routes) =====
    fastify.get('/api/meeting-commitments', { preHandler: [authenticate] }, async (request, reply) => {
        const page = request.query.page || request.query.page_key || 'kpimarketing';
        const templates = await db.all(
            'SELECT * FROM meeting_commitment_templates WHERE page_key = ? ORDER BY stt',
            [page]
        );
        return { success: true, templates: templates || [] };
    });

    fastify.get('/api/meeting-commitments/templates', { preHandler: [authenticate] }, async (request, reply) => {
        const page = request.query.page || request.query.page_key;
        if (!page) return reply.code(400).send({ error: 'Thiếu page key' });

        const templates = await db.all(
            'SELECT * FROM meeting_commitment_templates WHERE page_key = ? ORDER BY stt',
            [page]
        );
        return { templates };
    });

    // ===== SAVE commitment templates for a page (GĐ only) =====
    fastify.put('/api/meeting-commitments/templates', { preHandler: [authenticate] }, async (request, reply) => {
        if (!['giam_doc', 'quan_ly_cap_cao', 'quan_ly'].includes(request.user.role)) {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc Quản Lý mới được setup câu hỏi' });
        }

        const { page_key, items } = request.body || {};
        if (!page_key || !Array.isArray(items)) {
            return reply.code(400).send({ error: 'Thiếu thông tin' });
        }

        // Delete old templates for this page, then insert new ones
        await db.run('DELETE FROM meeting_commitment_templates WHERE page_key = ?', [page_key]);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.question_content || !item.question_content.trim()) continue;
            await db.run(
                `INSERT INTO meeting_commitment_templates (page_key, stt, question_content, has_revenue_target, created_by, updated_at)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [page_key, i + 1, item.question_content.trim(), !!item.has_revenue_target, request.user.id]
            );
        }

        return { success: true, count: items.length };
    });

    // ===== GET sessions list (with filters) =====
    fastify.get('/api/meeting-commitments/sessions', { preHandler: [authenticate] }, async (request, reply) => {
        const { month, year, user_id, source } = request.query;
        const isDirector = request.user.role === 'giam_doc';

        let where = 'WHERE 1=1';
        const params = [];

        if (source) {
            where += ` AND (ms.source = ? OR ms.source IS NULL)`;
            params.push(source);
        }

        if (month && year) {
            where += ` AND EXTRACT(MONTH FROM ms.meeting_date) = ? AND EXTRACT(YEAR FROM ms.meeting_date) = ?`;
            params.push(parseInt(month), parseInt(year));
        } else if (year) {
            where += ` AND EXTRACT(YEAR FROM ms.meeting_date) = ?`;
            params.push(parseInt(year));
        }

        // If employee, only show sessions that have their commitments
        if (!isDirector && request.user.role !== 'quan_ly_cap_cao' && request.user.role !== 'quan_ly') {
            where += ` AND ms.id IN (SELECT session_id FROM meeting_commitments WHERE user_id = ?)`;
            params.push(request.user.id);
        }

        const sessions = await db.all(`
            SELECT ms.*, u.full_name AS created_by_name,
                (SELECT COUNT(*) FROM meeting_commitments mc WHERE mc.session_id = ms.id) AS total_items,
                (SELECT COUNT(*) FROM meeting_commitments mc WHERE mc.session_id = ms.id AND mc.is_completed = true) AS completed_items
            FROM meeting_sessions ms
            LEFT JOIN users u ON ms.created_by = u.id
            ${where}
            ORDER BY ms.meeting_date DESC, ms.created_at DESC
        `, params);

        return { sessions };
    });

    // ===== GET single session with all commitments =====
    fastify.get('/api/meeting-commitments/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const sessionId = request.params.id;
        const isDirector = request.user.role === 'giam_doc';

        const session = await db.get('SELECT ms.*, u.full_name AS created_by_name FROM meeting_sessions ms LEFT JOIN users u ON ms.created_by = u.id WHERE ms.id = ?', [sessionId]);
        if (!session) return reply.code(404).send({ error: 'Không tìm thấy cuộc họp' });

        const params = [sessionId];

        const commitments = await db.all(`
            SELECT mc.*, u.full_name AS user_name, u.role AS user_role,
                   CASE WHEN dp.parent_id IS NULL OR dp.parent_id = 0 THEN dt.id ELSE dp.id END AS dept_id,
                   CASE WHEN dp.parent_id IS NULL OR dp.parent_id = 0 THEN dt.name ELSE dp.name END AS dept_name,
                   dt.id AS team_id,
                   dt.name AS team_name,
                   rv.full_name AS reviewed_by_name
            FROM meeting_commitments mc
            JOIN users u ON mc.user_id = u.id AND u.status = 'active'
            LEFT JOIN departments dt ON COALESCE(mc.department_id, u.department_id) = dt.id
            LEFT JOIN departments dp ON dt.parent_id = dp.id
            LEFT JOIN users rv ON mc.reviewed_by = rv.id
            WHERE mc.session_id = ?
            ORDER BY COALESCE(dp.name, dt.name), dt.name, u.full_name, mc.stt
        `, params);

        const registeredDepts = await db.all(`
            SELECT msd.department_id AS id, d.name, d.parent_id
            FROM meeting_session_departments msd
            JOIN departments d ON msd.department_id = d.id
            WHERE msd.session_id = ?
        `, [sessionId]);

        return { session, commitments, registeredDepts };
    });

    // ===== CREATE session (GĐ & QL Cấp Cao) =====
    fastify.post('/api/meeting-commitments/sessions', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc' && request.user.role !== 'quan_ly_cap_cao' && request.user.role !== 'quan_ly' && request.user.role !== 'truong_phong') {
            return reply.code(403).send({ error: 'Chỉ Quản Lý hoặc Trưởng Phòng mới được tạo cuộc họp' });
        }

        const { title, meeting_date, source, start_date, end_date } = request.body || {};
        if (!title || !meeting_date) return reply.code(400).send({ error: 'Thiếu tiêu đề hoặc ngày họp' });

        const todayStr = new Date().toISOString().split('T')[0];
        let activeQuery = `SELECT * FROM meeting_sessions WHERE COALESCE(end_date, meeting_date) >= ?`;
        const activeParams = [todayStr];
        if (source) {
            activeQuery += ` AND source = ?`;
            activeParams.push(source);
        } else {
            activeQuery += ` AND source IS NULL`;
        }
        activeQuery += ` ORDER BY id DESC LIMIT 1`;
        const activeSession = await db.get(activeQuery, activeParams);
        if (activeSession) {
            return reply.code(400).send({
                error: `Cuộc họp "${activeSession.title}" của phòng ban này chưa được đóng. Vui lòng đóng cuộc họp hiện tại trước khi tạo cuộc họp mới!`
            });
        }

        const sDate = start_date || meeting_date;
        let eDate = end_date || '2099-12-31';

        const result = await db.get(
            'INSERT INTO meeting_sessions (title, meeting_date, created_by, source, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
            [title, meeting_date, request.user.id, source || null, sDate, eDate]
        );

        return { success: true, id: result ? result.id : null };
    });

    // ===== REGISTER / SYNC department participation =====
    fastify.post('/api/meeting-commitments/sessions/:id/departments', { preHandler: [authenticate] }, async (request, reply) => {
        const sessionId = parseInt(request.params.id);
        const departmentId = parseInt(request.body.department_id || request.body.dept_id);
        if (!sessionId || !departmentId) return reply.code(400).send({ error: 'Thiếu thông tin' });
        try {
            await db.run(
                'INSERT INTO meeting_session_departments (session_id, department_id) VALUES (?, ?) ON CONFLICT (session_id, department_id) DO NOTHING',
                [sessionId, departmentId]
            );
            return { success: true };
        } catch(e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    fastify.put('/api/meeting-commitments/sessions/:id/departments', { preHandler: [authenticate] }, async (request, reply) => {
        const sessionId = parseInt(request.params.id);
        const { department_ids } = request.body || {};
        if (!sessionId || !Array.isArray(department_ids)) {
            return reply.code(400).send({ error: 'Thiếu danh sách bộ phận' });
        }
        try {
            await db.run('DELETE FROM meeting_session_departments WHERE session_id = ?', [sessionId]);
            for (const deptId of department_ids) {
                const did = parseInt(deptId);
                if (did) {
                    await db.run(
                        'INSERT INTO meeting_session_departments (session_id, department_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
                        [sessionId, did]
                    );
                }
            }
            return { success: true, count: department_ids.length };
        } catch(e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // ===== CLOSE session endpoint =====
    fastify.put('/api/meeting-commitments/sessions/:id/close', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc' && request.user.role !== 'quan_ly_cap_cao') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc Quản Lý Cấp Cao mới được đóng cuộc họp' });
        }
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        await db.run('UPDATE meeting_sessions SET end_date = ? WHERE id = ?', [yesterday, request.params.id]);
        return { success: true };
    });

    // ===== REOPEN session endpoint =====
    fastify.put('/api/meeting-commitments/sessions/:id/reopen', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc' && request.user.role !== 'quan_ly_cap_cao') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc Quản Lý Cấp Cao mới được mở lại cuộc họp' });
        }
        const todayStr = new Date().toISOString().split('T')[0];
        const activeSession = await db.get(
            `SELECT * FROM meeting_sessions WHERE COALESCE(end_date, meeting_date) >= ? AND id != ? ORDER BY id DESC LIMIT 1`,
            [todayStr, request.params.id]
        );
        if (activeSession) {
            return reply.code(400).send({
                error: `Cuộc họp "${activeSession.title}" đang mở. Vui lòng đóng cuộc họp đó trước khi mở lại cuộc họp này!`
            });
        }
        const newEnd = new Date();
        newEnd.setDate(newEnd.getDate() + 7);
        const newEndStr = newEnd.toISOString().split('T')[0];
        await db.run('UPDATE meeting_sessions SET start_date = ?, end_date = ? WHERE id = ?', [todayStr, newEndStr, request.params.id]);
        return { success: true, new_end_date: newEndStr };
    });

    // ===== UPDATE session (GĐ & QL Cấp Cao) =====
    fastify.put('/api/meeting-commitments/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc' && request.user.role !== 'quan_ly_cap_cao') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc Quản Lý Cấp Cao' });
        }
        const { title, meeting_date, start_date, end_date, is_close, is_reopen } = request.body || {};
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        let targetEndDate = end_date;
        let targetStartDate = start_date;

        if (is_close) {
            targetEndDate = yesterday;
        } else if (is_reopen) {
            const activeSession = await db.get(
                `SELECT * FROM meeting_sessions WHERE COALESCE(end_date, meeting_date) >= ? AND id != ? ORDER BY id DESC LIMIT 1`,
                [todayStr, request.params.id]
            );
            if (activeSession) {
                return reply.code(400).send({
                    error: `Cuộc họp "${activeSession.title}" đang mở. Vui lòng đóng cuộc họp đó trước khi mở lại cuộc họp này!`
                });
            }
            targetStartDate = todayStr;
            const newEnd = new Date();
            newEnd.setDate(newEnd.getDate() + 7);
            targetEndDate = newEnd.toISOString().split('T')[0];
        }

        const fields = [];
        const params = [];
        if (title) { fields.push('title = ?'); params.push(title); }
        if (meeting_date) { fields.push('meeting_date = ?'); params.push(meeting_date); }
        if (targetStartDate) { fields.push('start_date = ?'); params.push(targetStartDate); }
        if (targetEndDate) { fields.push('end_date = ?'); params.push(targetEndDate); }

        if (fields.length > 0) {
            params.push(request.params.id);
            await db.run(`UPDATE meeting_sessions SET ${fields.join(', ')} WHERE id = ?`, params);
        }
        return { success: true };
    });

    // ===== DELETE session (GĐ only) =====
    fastify.delete('/api/meeting-commitments/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        }
        await db.run('DELETE FROM meeting_commitments WHERE session_id = ?', [request.params.id]);
        await db.run('DELETE FROM meeting_sessions WHERE id = ?', [request.params.id]);
        return { success: true };
    });

    // ===== ADD commitments for a user OR team (role hierarchy) =====
    fastify.post('/api/meeting-commitments', { preHandler: [authenticate] }, async (request, reply) => {
        const { session_id, user_id, department_id, items } = request.body || {};
        if (!session_id || !Array.isArray(items) || items.length === 0) {
            return reply.code(400).send({ error: 'Thiếu thông tin' });
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const sessRow = await db.get('SELECT end_date, meeting_date FROM meeting_sessions WHERE id = ?', [session_id]);
        if (sessRow) {
            const endDateStr = sessRow.end_date ? sessRow.end_date.split('T')[0] : (sessRow.meeting_date ? sessRow.meeting_date.split('T')[0] : '');
            if (endDateStr < todayStr) {
                return reply.code(400).send({ error: 'Cuộc họp này đã ĐÓNG. Không thể chỉnh sửa cam kết!' });
            }
        }

        // Team commitment
        if (department_id && !user_id) {
            if (!['giam_doc', 'quan_ly', 'quan_ly_cap_cao'].includes(request.user.role)) {
                return reply.code(403).send({ error: 'Bạn không có quyền ghi cam kết cho team' });
            }
            await db.run('DELETE FROM meeting_commitments WHERE session_id = ? AND department_id = ? AND user_id = ?', [session_id, department_id, request.user.id]);
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                await db.run(
                    `INSERT INTO meeting_commitments (session_id, user_id, department_id, stt, content, target_revenue)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [session_id, request.user.id, department_id, i + 1, item.content || '', parseFloat(item.target_revenue) || 0]
                );
            }
            return { success: true, count: items.length };
        }

        // Individual commitment
        const targetUserId = parseInt(user_id);
        const allowed = await canManageUser(request.user, targetUserId);
        if (!allowed) {
            return reply.code(403).send({ error: 'Bạn không có quyền ghi cam kết cho người này' });
        }
        if (!user_id) return reply.code(400).send({ error: 'Thiếu user_id' });

        await db.run('DELETE FROM meeting_commitments WHERE session_id = ? AND user_id = ? AND department_id IS NULL', [session_id, user_id]);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await db.run(
                `INSERT INTO meeting_commitments (session_id, user_id, stt, content, target_revenue)
                 VALUES (?, ?, ?, ?, ?)`,
                [session_id, user_id, i + 1, item.content || '', parseFloat(item.target_revenue) || 0]
            );
        }

        return { success: true, count: items.length };
    });

    // ===== REVIEW/UPDATE commitment (role hierarchy) =====
    fastify.put('/api/meeting-commitments/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const commitment = await db.get('SELECT user_id FROM meeting_commitments WHERE id = ?', [request.params.id]);
        if (!commitment) return reply.code(404).send({ error: 'Không tìm thấy cam kết' });
        const allowed = await canManageUser(request.user, commitment.user_id);
        if (!allowed) {
            return reply.code(403).send({ error: 'Bạn không có quyền review cam kết này' });
        }

        const { is_completed, completion_pct, review_note } = request.body || {};
        await db.run(
            `UPDATE meeting_commitments
             SET is_completed = COALESCE(?, is_completed),
                 completion_pct = COALESCE(?, completion_pct),
                 review_note = COALESCE(?, review_note),
                 reviewed_by = ?, reviewed_at = NOW()
             WHERE id = ?`,
            [is_completed, completion_pct, review_note, request.user.id, request.params.id]
        );

        return { success: true };
    });

    // ===== BATCH REVIEW (role hierarchy) =====
    fastify.put('/api/meeting-commitments/batch-review', { preHandler: [authenticate] }, async (request, reply) => {
        const isDirector = request.user.role === 'giam_doc';
        const isManager = ['quan_ly', 'quan_ly_cap_cao'].includes(request.user.role);

        if (!isDirector && !isManager) {
            // For non-managers, verify all items belong to the current user
            const { reviews } = request.body || {};
            if (Array.isArray(reviews) && reviews.length > 0) {
                const ids = reviews.map(r => r.id);
                const ph = ids.map(() => '?').join(',');
                const owned = await db.all(
                    `SELECT id FROM meeting_commitments WHERE id IN (${ph}) AND user_id = ?`,
                    [...ids, request.user.id]
                );
                if (owned.length !== ids.length) {
                    return reply.code(403).send({ error: 'Bạn chỉ được review cam kết của chính mình' });
                }
            }
        }

        const { reviews } = request.body || {};
        if (!Array.isArray(reviews)) return reply.code(400).send({ error: 'Thiếu reviews' });

        const todayStr = new Date().toISOString().split('T')[0];
        if (reviews.length > 0) {
            const firstCommit = await db.get('SELECT session_id FROM meeting_commitments WHERE id = ?', [reviews[0].id]);
            if (firstCommit) {
                const sessRow = await db.get('SELECT end_date, meeting_date FROM meeting_sessions WHERE id = ?', [firstCommit.session_id]);
                if (sessRow) {
                    const endDateStr = sessRow.end_date ? sessRow.end_date.split('T')[0] : (sessRow.meeting_date ? sessRow.meeting_date.split('T')[0] : '');
                    if (endDateStr < todayStr) {
                        return reply.code(400).send({ error: 'Cuộc họp này đã ĐÓNG. Không thể lưu review!' });
                    }
                }
            }
        }

        for (const r of reviews) {
            const row = await db.get('SELECT target_revenue FROM meeting_commitments WHERE id = ?', [r.id]);
            const targetRev = row ? (parseFloat(row.target_revenue) || 0) : 0;
            const pct = parseInt(r.completion_pct) || 0;
            if (targetRev <= 0 && pct <= 0) {
                return reply.code(400).send({ error: '⚠️ Vui lòng điều chỉnh thanh tiến độ (không được để 0%) trước khi lưu review.' });
            }
        }

        for (const r of reviews) {
            await db.run(
                `UPDATE meeting_commitments
                 SET is_completed = ?, completion_pct = ?, review_note = ?,
                     reviewed_by = ?, reviewed_at = NOW()
                 WHERE id = ?`,
                [!!r.is_completed, parseInt(r.completion_pct) || 0, r.review_note || '', request.user.id, r.id]
            );
        }

        return { success: true, count: reviews.length };
    });

    // ===== GET employees structure (for embed) =====
    fastify.get('/api/meeting-commitments/employees', { preHandler: [authenticate] }, async (request, reply) => {
        const { source, dept_id } = request.query;
        let rootDeptId = 1;
        if (dept_id) {
            rootDeptId = parseInt(dept_id);
        } else if (source === 'kpisale') {
            rootDeptId = 4;
        } else if (source === 'kpimarketing' || source === 'kpimkt') {
            rootDeptId = 6;
        }

        const allDepts = await db.all(
            "SELECT id, name, parent_id FROM departments WHERE (id = ? OR parent_id = ?) AND status = 'active' ORDER BY display_order, id",
            [rootDeptId, rootDeptId]
        );
        const rootDept = allDepts.find(d => d.id === rootDeptId) || allDepts[0];
        if (!rootDept) return { teams: [] };

        const childDepts = allDepts.filter(d => d.parent_id === rootDept.id);
        const allDeptIds = allDepts.map(d => d.id);

        if (allDeptIds.length === 0) return { teams: [] };

        const ph = allDeptIds.map(() => '?').join(',');
        const employees = await db.all(`
            SELECT u.id, u.full_name, u.role, u.department_id, d.name AS dept_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.status = 'active'
              AND u.department_id IN (${ph})
              AND u.role NOT IN ('giam_doc')
            ORDER BY d.name, u.role, u.full_name
        `, allDeptIds);

        // Group by child departments (teams)
        const teams = [];

        // Managers / Leaders at root dept first
        const rootMembers = employees.filter(e => e.department_id === rootDept.id);
        if (rootMembers.length > 0) {
            teams.push({
                id: rootDept.id,
                name: rootDept.id === 4 ? 'QUẢN LÝ SALE' : (rootDept.id === 6 ? 'PHÒNG MARKETING' : 'QUẢN LÝ'),
                members: rootMembers
            });
        }

        // Child dept teams
        for (const dept of childDepts) {
            const members = employees.filter(e => e.department_id === dept.id);
            teams.push({
                id: dept.id,
                name: dept.name,
                members: members
            });
        }

        return { teams };
    });

    // ===== GET all sessions for a month (for accordion view) =====
    fastify.get('/api/meeting-commitments/monthly', { preHandler: [authenticate] }, async (request, reply) => {
        const now = new Date();
        const month = parseInt(request.query.month) || (now.getMonth() + 1);
        const year = parseInt(request.query.year) || now.getFullYear();

        const source = request.query.source || null;
        let sessQuery = `SELECT * FROM meeting_sessions
             WHERE EXTRACT(MONTH FROM meeting_date) = ? AND EXTRACT(YEAR FROM meeting_date) = ?`;
        const sessParams = [month, year];
        if (source) {
            sessQuery += ` AND (source = ? OR source IS NULL)`;
            sessParams.push(source);
        }
        sessQuery += ` ORDER BY meeting_date ASC, created_at ASC`;
        const sessions = await db.all(sessQuery, sessParams);

        if (sessions.length === 0) return { sessions: [], allCommitments: [] };

        const sessionIds = sessions.map(s => s.id);
        const ph = sessionIds.map(() => '?').join(',');
        const allCommitments = await db.all(`
            SELECT mc.*, u.full_name AS user_name, u.role AS user_role,
                   COALESCE(d2.name, d.name) AS dept_name, COALESCE(mc.department_id, d.id) AS dept_id,
                   mc.department_id AS team_dept_id
            FROM meeting_commitments mc
            JOIN users u ON mc.user_id = u.id AND u.status = 'active'
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN departments d2 ON mc.department_id = d2.id
            WHERE mc.session_id IN (${ph})
            ORDER BY d.name, u.full_name, mc.stt
        `, sessionIds);

        return { sessions, allCommitments };
    });

    // ===== GET latest session for embed =====
    fastify.get('/api/meeting-commitments/latest', { preHandler: [authenticate] }, async (request, reply) => {
        const session = await db.get('SELECT * FROM meeting_sessions ORDER BY meeting_date DESC, created_at DESC LIMIT 1');
        if (!session) return { session: null, commitments: [] };

        const commitments = await db.all(`
            SELECT mc.*, u.full_name AS user_name, u.role AS user_role,
                   d.name AS dept_name, d.id AS dept_id
            FROM meeting_commitments mc
            JOIN users u ON mc.user_id = u.id AND u.status = 'active'
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE mc.session_id = ?
            ORDER BY d.name, u.full_name, mc.stt
        `, [session.id]);

        return { session, commitments };
    });

    // ===== GET current user's latest commitments (for topbar button) =====
    fastify.get('/api/meeting-commitments/my-latest', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role === 'giam_doc') {
            return { session: null, commitments: [], sessionTitle: null };
        }
        const userId = request.user.id;
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // Get the latest session of the current month
        const session = await db.get(
            `SELECT * FROM meeting_sessions
             WHERE EXTRACT(MONTH FROM meeting_date) = ? AND EXTRACT(YEAR FROM meeting_date) = ?
             ORDER BY meeting_date DESC, created_at DESC LIMIT 1`,
            [month, year]
        );
        if (!session) return { session: null, commitments: [], sessionTitle: null };

        // Get this user's individual commitments only from that session
        const commitments = await db.all(`
            SELECT mc.*, d.name AS dept_name
            FROM meeting_commitments mc
            LEFT JOIN departments d ON mc.department_id = d.id
            WHERE mc.session_id = ? AND mc.user_id = ? AND mc.department_id IS NULL
            ORDER BY mc.stt
        `, [session.id, userId]);

        return {
            session: { id: session.id, title: session.title, meeting_date: session.meeting_date },
            commitments,
            sessionTitle: session.title
        };
    });

    // ===== OVERVIEW (for redesigned camketcuochop page) =====
    fastify.get('/api/meeting-commitments/overview', { preHandler: [authenticate] }, async (request, reply) => {
        const now = new Date();
        const month = parseInt(request.query.month) || (now.getMonth() + 1);
        const year = parseInt(request.query.year) || now.getFullYear();
        const deptId = request.query.dept_id ? parseInt(request.query.dept_id) : null;

        // 1. Get all sessions for month/year
        const sessions = await db.all(`
            SELECT ms.*, u.full_name AS created_by_name,
                (SELECT COUNT(*) FROM meeting_commitments mc WHERE mc.session_id = ms.id) AS total_items,
                (SELECT COUNT(*) FROM meeting_commitments mc WHERE mc.session_id = ms.id AND mc.is_completed = true) AS completed_items
            FROM meeting_sessions ms
            LEFT JOIN users u ON ms.created_by = u.id
            WHERE EXTRACT(MONTH FROM ms.meeting_date) = ? AND EXTRACT(YEAR FROM ms.meeting_date) = ?
            ORDER BY ms.meeting_date ASC, ms.created_at ASC
        `, [month, year]);

        if (sessions.length === 0) {
            // Still get yearly timeline (Filtered by deptId if provided)
            let rawYearlyTimeline = [];
            if (deptId) {
                const allDeptsForTL = await db.all('SELECT id, parent_id FROM departments');
                const childIdsForTL = [deptId];
                function collectChildrenTL(pid) {
                    allDeptsForTL.forEach(d => { if (d.parent_id === pid) { childIdsForTL.push(d.id); collectChildrenTL(d.id); } });
                }
                collectChildrenTL(deptId);
                const deptPhTL = childIdsForTL.map(() => '?').join(',');
                rawYearlyTimeline = await db.all(`
                    SELECT EXTRACT(MONTH FROM ms.meeting_date)::int AS month,
                           COUNT(DISTINCT ms.id) AS session_count
                    FROM meeting_sessions ms
                    WHERE EXTRACT(YEAR FROM ms.meeting_date) = ?
                      AND (
                        ms.id IN (SELECT session_id FROM meeting_session_departments WHERE department_id IN (${deptPhTL}))
                        OR ms.id IN (
                          SELECT mc.session_id FROM meeting_commitments mc 
                          JOIN users u ON mc.user_id = u.id 
                          WHERE mc.department_id IN (${deptPhTL}) OR u.department_id IN (${deptPhTL})
                        )
                      )
                    GROUP BY EXTRACT(MONTH FROM ms.meeting_date)
                    ORDER BY month
                `, [year, ...childIdsForTL, ...childIdsForTL, ...childIdsForTL]);
            } else {
                rawYearlyTimeline = await db.all(`
                    SELECT EXTRACT(MONTH FROM meeting_date)::int AS month,
                           COUNT(DISTINCT id) AS session_count
                    FROM meeting_sessions
                    WHERE EXTRACT(YEAR FROM meeting_date) = ?
                    GROUP BY EXTRACT(MONTH FROM meeting_date)
                    ORDER BY month
                `, [year]);
            }
            const timeline = [];
            for (let m = 1; m <= 12; m++) {
                const found = rawYearlyTimeline.find(t => t.month === m);
                timeline.push({ month: m, sessionCount: found ? found.session_count : 0, avgPct: 0 });
            }
            return { sessions: [], stats: { totalSessions: 0, totalDepts: 0, totalUsers: 0, avgCompletion: 0 }, deptSummary: [], yearlyTimeline: timeline };
        }

        // 2. Get registered departments for these sessions
        const sessionIds = sessions.map(s => s.id);
        const ph = sessionIds.map(() => '?').join(',');
        const sessionDepts = await db.all(`
            SELECT msd.session_id, msd.department_id AS dept_id, d.name AS dept_name
            FROM meeting_session_departments msd
            JOIN departments d ON msd.department_id = d.id
            WHERE msd.session_id IN (${ph})
        `, sessionIds);

        // 3. Get all commitments for these sessions
        const allCommitments = await db.all(`
            SELECT mc.*, u.full_name AS user_name, u.role AS user_role,
                   CASE WHEN dp.parent_id IS NULL OR dp.parent_id = 0 THEN dt.id ELSE dp.id END AS dept_id,
                   CASE WHEN dp.parent_id IS NULL OR dp.parent_id = 0 THEN dt.name ELSE dp.name END AS dept_name,
                   dt.name AS team_name,
                   mc.department_id AS team_dept_id
            FROM meeting_commitments mc
            JOIN users u ON mc.user_id = u.id AND u.status = 'active'
            LEFT JOIN departments dt ON COALESCE(mc.department_id, u.department_id) = dt.id
            LEFT JOIN departments dp ON dt.parent_id = dp.id
            WHERE mc.session_id IN (${ph})
            ORDER BY COALESCE(dp.name, dt.name), dt.name, u.full_name, mc.stt
        `, sessionIds);

        // 4. Build dept summary
        const deptMap = {};
        const userSet = new Set();

        // Add registered departments to deptMap
        sessionDepts.forEach(sd => {
            if (!deptMap[sd.dept_id]) {
                deptMap[sd.dept_id] = { dept_id: sd.dept_id, dept_name: sd.dept_name, sessions: new Set(), commitCount: 0, doneCount: 0, pctSum: 0, users: new Set() };
            }
            deptMap[sd.dept_id].sessions.add(sd.session_id);
        });

        // Add commitment departments to deptMap
        allCommitments.forEach(c => {
            const did = c.dept_id || 0;
            const dname = c.dept_name || 'Khác';
            if (!deptMap[did]) deptMap[did] = { dept_id: did, dept_name: dname, sessions: new Set(), commitCount: 0, doneCount: 0, pctSum: 0, users: new Set() };
            deptMap[did].sessions.add(c.session_id);
            deptMap[did].commitCount++;
            if (c.is_completed) deptMap[did].doneCount++;
            deptMap[did].pctSum += (c.completion_pct || 0);
            deptMap[did].users.add(c.user_id);
            userSet.add(c.user_id);
        });

        const deptSummary = Object.values(deptMap).map(d => ({
            dept_id: d.dept_id,
            dept_name: d.dept_name,
            sessionCount: d.sessions.size,
            commitCount: d.commitCount,
            doneCount: d.doneCount,
            avgPct: d.commitCount > 0 ? Math.round((d.pctSum / d.commitCount) * 10) / 10 : 0,
            userCount: d.users.size
        })).sort((a, b) => b.avgPct - a.avgPct);

        // 5. Enrich sessions with dept tags
        const enrichedSessions = sessions.map(s => {
            const sCommits = allCommitments.filter(c => c.session_id === s.id);
            const deptSet = {};
            const sUsers = new Set();

            // Registered session departments
            sessionDepts.filter(sd => sd.session_id === s.id).forEach(sd => {
                deptSet[sd.dept_id] = sd.dept_name;
            });

            // Commitment departments
            sCommits.forEach(c => {
                const did = c.dept_id || 0;
                if (!deptSet[did]) deptSet[did] = c.dept_name || 'Khác';
                sUsers.add(c.user_id);
            });

            const pct = s.total_items > 0 ? Math.round(100 * s.completed_items / s.total_items) : 0;
            const masterDeptOrder = [10, 4, 1, 6, 5, 16, 17, 19, 11, 8, 12, 13, 14, 15, 18];
            const sortedDepts = Object.entries(deptSet).map(([id, name]) => ({ id: Number(id), name })).sort((a, b) => {
                let ia = masterDeptOrder.indexOf(a.id);
                let ib = masterDeptOrder.indexOf(b.id);
                if (ia === -1) ia = 999;
                if (ib === -1) ib = 999;
                return ia - ib;
            });
            return {
                ...s,
                pct,
                depts: sortedDepts,
                userCount: sUsers.size
            };
        });

        // 5. Filter by dept if requested (after enrichment)
        let filteredSessions = enrichedSessions;
        if (deptId) {
            // Get all child dept IDs
            const allDepts = await db.all('SELECT id, parent_id FROM departments');
            const childIds = [deptId];
            function collectChildren(pid) {
                allDepts.forEach(d => { if (d.parent_id === pid) { childIds.push(d.id); collectChildren(d.id); } });
            }
            collectChildren(deptId);
            filteredSessions = enrichedSessions.filter(s => s.depts.some(d => childIds.includes(d.id)));
        }

        // 6. Stats
        const totalPct = allCommitments.length > 0 ? Math.round((allCommitments.reduce((s, c) => s + (c.completion_pct || 0), 0) / allCommitments.length) * 10) / 10 : 0;
        const stats = {
            totalSessions: filteredSessions.length,
            totalDepts: Object.keys(deptMap).length,
            totalUsers: userSet.size,
            avgCompletion: totalPct
        };

        // 7. Yearly timeline (Filtered by deptId if provided)
        let rawYearlyTimeline = [];
        let rawMonthlyPct = [];

        if (deptId) {
            const allDeptsForTL = await db.all('SELECT id, parent_id FROM departments');
            const childIdsForTL = [deptId];
            function collectChildrenTL(pid) {
                allDeptsForTL.forEach(d => { if (d.parent_id === pid) { childIdsForTL.push(d.id); collectChildrenTL(d.id); } });
            }
            collectChildrenTL(deptId);
            const deptPhTL = childIdsForTL.map(() => '?').join(',');

            rawYearlyTimeline = await db.all(`
                SELECT EXTRACT(MONTH FROM ms.meeting_date)::int AS month,
                       COUNT(DISTINCT ms.id) AS session_count
                FROM meeting_sessions ms
                WHERE EXTRACT(YEAR FROM ms.meeting_date) = ?
                  AND (
                    ms.id IN (SELECT session_id FROM meeting_session_departments WHERE department_id IN (${deptPhTL}))
                    OR ms.id IN (
                      SELECT mc.session_id FROM meeting_commitments mc 
                      JOIN users u ON mc.user_id = u.id 
                      WHERE mc.department_id IN (${deptPhTL}) OR u.department_id IN (${deptPhTL})
                    )
                  )
                GROUP BY EXTRACT(MONTH FROM ms.meeting_date)
                ORDER BY month
            `, [year, ...childIdsForTL, ...childIdsForTL, ...childIdsForTL]);

            rawMonthlyPct = await db.all(`
                SELECT EXTRACT(MONTH FROM ms.meeting_date)::int AS month,
                       ROUND(AVG(mc.completion_pct)::numeric, 1) AS avg_pct
                FROM meeting_commitments mc
                JOIN meeting_sessions ms ON mc.session_id = ms.id
                JOIN users u ON mc.user_id = u.id
                WHERE EXTRACT(YEAR FROM ms.meeting_date) = ?
                  AND (mc.department_id IN (${deptPhTL}) OR u.department_id IN (${deptPhTL}))
                GROUP BY EXTRACT(MONTH FROM ms.meeting_date)
            `, [year, ...childIdsForTL, ...childIdsForTL]);
        } else {
            rawYearlyTimeline = await db.all(`
                SELECT EXTRACT(MONTH FROM ms.meeting_date)::int AS month,
                       COUNT(DISTINCT ms.id) AS session_count
                FROM meeting_sessions ms
                WHERE EXTRACT(YEAR FROM ms.meeting_date) = ?
                GROUP BY EXTRACT(MONTH FROM ms.meeting_date)
                ORDER BY month
            `, [year]);

            rawMonthlyPct = await db.all(`
                SELECT EXTRACT(MONTH FROM ms.meeting_date)::int AS month,
                       ROUND(AVG(mc.completion_pct)::numeric, 1) AS avg_pct
                FROM meeting_commitments mc
                JOIN meeting_sessions ms ON mc.session_id = ms.id
                WHERE EXTRACT(YEAR FROM ms.meeting_date) = ?
                GROUP BY EXTRACT(MONTH FROM ms.meeting_date)
            `, [year]);
        }

        const timeline = [];
        for (let m = 1; m <= 12; m++) {
            const found = rawYearlyTimeline.find(t => t.month === m);
            const pctFound = rawMonthlyPct.find(t => t.month === m);
            timeline.push({
                month: m,
                sessionCount: found ? found.session_count : 0,
                avgPct: pctFound ? parseFloat(pctFound.avg_pct) : 0
            });
        }

        return {
            sessions: filteredSessions,
            stats,
            deptSummary,
            yearlyTimeline: timeline
        };
    });

    // ===== YEARLY SUMMARY =====
    fastify.get('/api/meeting-commitments/yearly-summary', { preHandler: [authenticate] }, async (request, reply) => {
        const year = parseInt(request.query.year) || new Date().getFullYear();
        const source = request.query.source || null;

        let sessQuery = `SELECT id, meeting_date, title, EXTRACT(MONTH FROM meeting_date)::int AS month_num
             FROM meeting_sessions
             WHERE EXTRACT(YEAR FROM meeting_date) = ?`;
        const sessParams = [year];
        if (source) {
            sessQuery += ` AND (source = ? OR source = 'camketcuochop' OR source IS NULL)`;
            sessParams.push(source);
        }
        sessQuery += ` ORDER BY meeting_date ASC`;

        const sessions = await db.all(sessQuery, sessParams);

        if (sessions.length === 0) return { year, sessions: [], allCommitments: [] };

        const sessionIds = sessions.map(s => s.id);
        const ph = sessionIds.map(() => '?').join(',');
        const allCommitments = await db.all(`
            SELECT mc.id, mc.session_id, mc.user_id, mc.completion_pct, mc.is_completed,
                   mc.target_revenue, mc.department_id AS team_dept_id,
                   u.full_name AS user_name, u.role AS user_role
            FROM meeting_commitments mc
            JOIN users u ON mc.user_id = u.id AND u.status = 'active'
            WHERE mc.session_id IN (${ph})
            ORDER BY mc.session_id, u.full_name
        `, sessionIds);

        return { year, sessions, allCommitments };
    });

    // ===== GET meeting permissions =====
    fastify.get('/api/meeting-commitments/permissions', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all('SELECT * FROM meeting_permissions ORDER BY source, permission_type');
        return { permissions: rows };
    });

    // ===== PUT meeting permissions (GĐ only) =====
    fastify.put('/api/meeting-commitments/permissions', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được cài đặt quyền' });
        }
        const { permissions } = request.body || {};
        if (!Array.isArray(permissions)) return reply.code(400).send({ error: 'Thiếu dữ liệu permissions' });

        for (const p of permissions) {
            if (!p.source || !p.permission_type || !p.allowed_roles) continue;
            await db.run(
                `INSERT INTO meeting_permissions (source, permission_type, allowed_roles, updated_at, updated_by)
                 VALUES (?, ?, ?, NOW(), ?)
                 ON CONFLICT (source, permission_type)
                 DO UPDATE SET allowed_roles = ?, updated_at = NOW(), updated_by = ?`,
                [p.source, p.permission_type, p.allowed_roles, request.user.id, p.allowed_roles, request.user.id]
            );
        }
        return { success: true };
    });

    // ===== GLOBAL SEARCH (search across ALL months & ALL years) =====
    fastify.get('/api/meeting-commitments/search', { preHandler: [authenticate] }, async (request, reply) => {
        const q = (request.query.q || '').trim();
        const userId = request.query.user_id ? parseInt(request.query.user_id) : null;
        if (!q && !userId) return { results: [] };

        let sql = `
            SELECT mc.id AS commit_id, mc.content, mc.target_revenue, mc.completion_pct, mc.stt,
                   ms.id AS session_id, ms.title AS session_title, ms.meeting_date,
                   EXTRACT(MONTH FROM ms.meeting_date)::int AS month,
                   EXTRACT(YEAR FROM ms.meeting_date)::int AS year,
                   u.id AS user_id, u.full_name AS user_name, u.role AS user_role,
                   d.name AS dept_name
            FROM meeting_commitments mc
            JOIN meeting_sessions ms ON mc.session_id = ms.id
            JOIN users u ON mc.user_id = u.id AND u.status = 'active'
            LEFT JOIN departments dt ON COALESCE(mc.department_id, u.department_id) = dt.id
            LEFT JOIN departments dp ON dt.parent_id = dp.id
            LEFT JOIN departments d ON CASE WHEN dp.parent_id IS NULL OR dp.parent_id = 0 THEN dt.id ELSE dp.id END = d.id
            WHERE 1=1
        `;
        const params = [];
        if (q) {
            sql += ` AND (mc.content ILIKE ? OR ms.title ILIKE ? OR u.full_name ILIKE ?)`;
            const searchPattern = `%${q}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }
        if (userId) {
            sql += ` AND mc.user_id = ?`;
            params.push(userId);
        }
        sql += ` ORDER BY ms.meeting_date DESC, mc.id DESC LIMIT 30`;

        const results = await db.all(sql, params);
        return { results };
    });
}

module.exports = meetingCommitmentsRoutes;
