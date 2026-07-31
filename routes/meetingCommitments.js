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
    } catch(e) { /* column may already exist */ }

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
        // Seed defaults if empty
        const cnt = await db.get('SELECT COUNT(*) AS c FROM meeting_permissions');
        if (!cnt || cnt.c == 0) {
            const defaults = [
                ['kpikdoanh', 'create_session', 'giam_doc'],
                ['kpikdoanh', 'setup_personal', 'giam_doc'],
                ['kpikdoanh', 'setup_team', 'giam_doc'],
                ['kpisale', 'create_session', 'giam_doc'],
                ['kpisale', 'setup_personal', 'giam_doc'],
                ['kpisale', 'setup_team', 'giam_doc'],
            ];
            for (const [src, pt, roles] of defaults) {
                await db.run('INSERT INTO meeting_permissions (source, permission_type, allowed_roles) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [src, pt, roles]);
            }
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
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được setup câu hỏi' });
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
        const { month, year, user_id } = request.query;
        const isDirector = request.user.role === 'giam_doc';

        let where = 'WHERE 1=1';
        const params = [];

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

        let commitFilter = '';
        const params = [sessionId];
        if (!isDirector && request.user.role !== 'quan_ly_cap_cao' && request.user.role !== 'quan_ly') {
            commitFilter = ' AND mc.user_id = ?';
            params.push(request.user.id);
        }

        const commitments = await db.all(`
            SELECT mc.*, u.full_name AS user_name, u.role AS user_role,
                   d.name AS dept_name, d.id AS dept_id,
                   rv.full_name AS reviewed_by_name
            FROM meeting_commitments mc
            JOIN users u ON mc.user_id = u.id AND u.status = 'active'
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN users rv ON mc.reviewed_by = rv.id
            WHERE mc.session_id = ? ${commitFilter}
            ORDER BY d.name, u.full_name, mc.stt
        `, params);

        return { session, commitments };
    });

    // ===== CREATE session (GĐ only) =====
    fastify.post('/api/meeting-commitments/sessions', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được tạo cuộc họp' });
        }

        const { title, meeting_date, source } = request.body || {};
        if (!title || !meeting_date) return reply.code(400).send({ error: 'Thiếu tiêu đề hoặc ngày họp' });

        const result = await db.get(
            'INSERT INTO meeting_sessions (title, meeting_date, created_by, source) VALUES (?, ?, ?, ?) RETURNING id',
            [title, meeting_date, request.user.id, source || null]
        );

        return { success: true, id: result ? result.id : null };
    });

    // ===== UPDATE session (GĐ only) =====
    fastify.put('/api/meeting-commitments/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        }
        const { title, meeting_date } = request.body || {};
        await db.run('UPDATE meeting_sessions SET title = COALESCE(?, title), meeting_date = COALESCE(?, meeting_date) WHERE id = ?',
            [title, meeting_date, request.params.id]);
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
                name: rootDept.id === 4 ? 'QUẢN LÝ SALE' : 'QUẢN LÝ',
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
            sessQuery += ` AND source = ?`;
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

        // Get this user's commitments from that session
        const commitments = await db.all(`
            SELECT mc.*, d.name AS dept_name
            FROM meeting_commitments mc
            LEFT JOIN departments d ON mc.department_id = d.id
            WHERE mc.session_id = ? AND mc.user_id = ?
            ORDER BY mc.stt
        `, [session.id, userId]);

        return {
            session: { id: session.id, title: session.title, meeting_date: session.meeting_date },
            commitments,
            sessionTitle: session.title
        };
    });

    // ===== YEARLY SUMMARY =====
    fastify.get('/api/meeting-commitments/yearly-summary', { preHandler: [authenticate] }, async (request, reply) => {
        const year = parseInt(request.query.year) || new Date().getFullYear();

        const sessions = await db.all(
            `SELECT id, meeting_date, title, EXTRACT(MONTH FROM meeting_date)::int AS month_num
             FROM meeting_sessions
             WHERE EXTRACT(YEAR FROM meeting_date) = ?
             ORDER BY meeting_date ASC`,
            [year]
        );

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
}

module.exports = meetingCommitmentsRoutes;
