/**
 * Meeting Commitments — Cam Kết Cuộc Họp
 * Only Director (giam_doc) can create/edit/review
 * Employees can view their own commitments
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function meetingCommitmentsRoutes(fastify, options) {

    // Role hierarchy helper: can requester manage target user?
    const EDIT_ROLES = ['giam_doc', 'quan_ly', 'quan_ly_cap_cao'];
    async function canManageUser(requester, targetUserId) {
        if (requester.role === 'giam_doc') return true;
        if (requester.id === targetUserId) return true; // self
        if (EDIT_ROLES.includes(requester.role)) {
            // QL can manage truong_phong + nhan_vien + thu_viec
            const target = await db.get('SELECT role FROM users WHERE id = $1', [targetUserId]);
            if (target && ['truong_phong', 'nhan_vien', 'thu_viec'].includes(target.role)) return true;
        }
        return false;
    }

    // ===== GET commitment templates for a page (MUST be before parametric routes) =====
    fastify.get('/api/meeting-commitments/templates', { preHandler: [authenticate] }, async (request, reply) => {
        const { page } = request.query;
        if (!page) return reply.code(400).send({ error: 'Thiếu page key' });

        const templates = await db.all(
            'SELECT * FROM meeting_commitment_templates WHERE page_key = $1 ORDER BY stt',
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
        await db.run('DELETE FROM meeting_commitment_templates WHERE page_key = $1', [page_key]);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.question_content || !item.question_content.trim()) continue;
            await db.run(
                `INSERT INTO meeting_commitment_templates (page_key, stt, question_content, has_revenue_target, created_by, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
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
        let pIdx = 1;

        if (month && year) {
            where += ` AND EXTRACT(MONTH FROM ms.meeting_date) = $${pIdx++} AND EXTRACT(YEAR FROM ms.meeting_date) = $${pIdx++}`;
            params.push(parseInt(month), parseInt(year));
        } else if (year) {
            where += ` AND EXTRACT(YEAR FROM ms.meeting_date) = $${pIdx++}`;
            params.push(parseInt(year));
        }

        // If employee, only show sessions that have their commitments
        if (!isDirector && request.user.role !== 'quan_ly_cap_cao' && request.user.role !== 'quan_ly') {
            where += ` AND ms.id IN (SELECT session_id FROM meeting_commitments WHERE user_id = $${pIdx++})`;
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

        const session = await db.get('SELECT ms.*, u.full_name AS created_by_name FROM meeting_sessions ms LEFT JOIN users u ON ms.created_by = u.id WHERE ms.id = $1', [sessionId]);
        if (!session) return reply.code(404).send({ error: 'Không tìm thấy cuộc họp' });

        let commitFilter = '';
        const params = [sessionId];
        if (!isDirector && request.user.role !== 'quan_ly_cap_cao' && request.user.role !== 'quan_ly') {
            commitFilter = ' AND mc.user_id = $2';
            params.push(request.user.id);
        }

        const commitments = await db.all(`
            SELECT mc.*, u.full_name AS user_name, u.role AS user_role,
                   d.name AS dept_name, d.id AS dept_id,
                   rv.full_name AS reviewed_by_name
            FROM meeting_commitments mc
            JOIN users u ON mc.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN users rv ON mc.reviewed_by = rv.id
            WHERE mc.session_id = $1 ${commitFilter}
            ORDER BY d.name, u.full_name, mc.stt
        `, params);

        return { session, commitments };
    });

    // ===== CREATE session (GĐ only) =====
    fastify.post('/api/meeting-commitments/sessions', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được tạo cuộc họp' });
        }

        const { title, meeting_date } = request.body || {};
        if (!title || !meeting_date) return reply.code(400).send({ error: 'Thiếu tiêu đề hoặc ngày họp' });

        const result = await db.get(
            'INSERT INTO meeting_sessions (title, meeting_date, created_by) VALUES ($1, $2, $3) RETURNING id',
            [title, meeting_date, request.user.id]
        );

        return { success: true, id: result.id };
    });

    // ===== UPDATE session (GĐ only) =====
    fastify.put('/api/meeting-commitments/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        }
        const { title, meeting_date } = request.body || {};
        await db.run('UPDATE meeting_sessions SET title = COALESCE($1, title), meeting_date = COALESCE($2, meeting_date) WHERE id = $3',
            [title, meeting_date, request.params.id]);
        return { success: true };
    });

    // ===== DELETE session (GĐ only) =====
    fastify.delete('/api/meeting-commitments/sessions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        }
        await db.run('DELETE FROM meeting_commitments WHERE session_id = $1', [request.params.id]);
        await db.run('DELETE FROM meeting_sessions WHERE id = $1', [request.params.id]);
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
            await db.run('DELETE FROM meeting_commitments WHERE session_id = $1 AND department_id = $2 AND user_id = $3', [session_id, department_id, request.user.id]);
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                await db.run(
                    `INSERT INTO meeting_commitments (session_id, user_id, department_id, stt, content, target_revenue)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
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

        await db.run('DELETE FROM meeting_commitments WHERE session_id = $1 AND user_id = $2 AND department_id IS NULL', [session_id, user_id]);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await db.run(
                `INSERT INTO meeting_commitments (session_id, user_id, stt, content, target_revenue)
                 VALUES ($1, $2, $3, $4, $5)`,
                [session_id, user_id, i + 1, item.content || '', parseFloat(item.target_revenue) || 0]
            );
        }

        return { success: true, count: items.length };
    });

    // ===== REVIEW/UPDATE commitment (role hierarchy) =====
    fastify.put('/api/meeting-commitments/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const commitment = await db.get('SELECT user_id FROM meeting_commitments WHERE id = $1', [request.params.id]);
        if (!commitment) return reply.code(404).send({ error: 'Không tìm thấy cam kết' });
        const allowed = await canManageUser(request.user, commitment.user_id);
        if (!allowed) {
            return reply.code(403).send({ error: 'Bạn không có quyền review cam kết này' });
        }

        const { is_completed, completion_pct, review_note } = request.body || {};
        await db.run(
            `UPDATE meeting_commitments
             SET is_completed = COALESCE($1, is_completed),
                 completion_pct = COALESCE($2, completion_pct),
                 review_note = COALESCE($3, review_note),
                 reviewed_by = $4, reviewed_at = NOW()
             WHERE id = $5`,
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
                const ph = ids.map((_, i) => `$${i + 1}`).join(',');
                const owned = await db.all(
                    `SELECT id FROM meeting_commitments WHERE id IN (${ph}) AND user_id = $${ids.length + 1}`,
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
                 SET is_completed = $1, completion_pct = $2, review_note = $3,
                     reviewed_by = $4, reviewed_at = NOW()
                 WHERE id = $5`,
                [!!r.is_completed, parseInt(r.completion_pct) || 0, r.review_note || '', request.user.id, r.id]
            );
        }

        return { success: true, count: reviews.length };
    });

    // ===== GET employees structure (for embed) =====
    fastify.get('/api/meeting-commitments/employees', { preHandler: [authenticate] }, async (request, reply) => {
        // Use same dept logic as KPI: root dept id=1, children are teams
        const allDepts = await db.all(
            "SELECT id, name, parent_id FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id"
        );
        const rootDept = allDepts.find(d => d.id === 1) || allDepts[0];
        const childDepts = allDepts.filter(d => d.parent_id === rootDept?.id);
        const allDeptIds = allDepts.map(d => d.id);

        if (allDeptIds.length === 0) return { teams: [], managers: [] };

        const ph = allDeptIds.map((_, i) => `$${i + 1}`).join(',');
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

        // Managers at root dept first
        const rootMembers = employees.filter(e => e.department_id === rootDept?.id);
        if (rootMembers.length > 0) {
            teams.push({
                id: rootDept.id,
                name: 'QUẢN LÝ',
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

        const sessions = await db.all(
            `SELECT * FROM meeting_sessions
             WHERE EXTRACT(MONTH FROM meeting_date) = $1 AND EXTRACT(YEAR FROM meeting_date) = $2
             ORDER BY meeting_date ASC, created_at ASC`,
            [month, year]
        );

        if (sessions.length === 0) return { sessions: [], allCommitments: [] };

        const sessionIds = sessions.map(s => s.id);
        const ph = sessionIds.map((_, i) => `$${i + 1}`).join(',');
        const allCommitments = await db.all(`
            SELECT mc.*, u.full_name AS user_name, u.role AS user_role,
                   COALESCE(d2.name, d.name) AS dept_name, COALESCE(mc.department_id, d.id) AS dept_id,
                   mc.department_id AS team_dept_id
            FROM meeting_commitments mc
            JOIN users u ON mc.user_id = u.id
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
            JOIN users u ON mc.user_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE mc.session_id = $1
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
             WHERE EXTRACT(MONTH FROM meeting_date) = $1 AND EXTRACT(YEAR FROM meeting_date) = $2
             ORDER BY meeting_date DESC, created_at DESC LIMIT 1`,
            [month, year]
        );
        if (!session) return { session: null, commitments: [], sessionTitle: null };

        // Get this user's commitments from that session
        const commitments = await db.all(`
            SELECT mc.*, d.name AS dept_name
            FROM meeting_commitments mc
            LEFT JOIN departments d ON mc.department_id = d.id
            WHERE mc.session_id = $1 AND mc.user_id = $2
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
             WHERE EXTRACT(YEAR FROM meeting_date) = $1
             ORDER BY meeting_date ASC`,
            [year]
        );

        if (sessions.length === 0) return { year, sessions: [], allCommitments: [] };

        const sessionIds = sessions.map(s => s.id);
        const ph = sessionIds.map((_, i) => `$${i + 1}`).join(',');
        const allCommitments = await db.all(`
            SELECT mc.id, mc.session_id, mc.user_id, mc.completion_pct, mc.is_completed,
                   mc.target_revenue, mc.department_id AS team_dept_id,
                   u.full_name AS user_name, u.role AS user_role
            FROM meeting_commitments mc
            JOIN users u ON mc.user_id = u.id
            WHERE mc.session_id IN (${ph})
            ORDER BY mc.session_id, u.full_name
        `, sessionIds);

        return { year, sessions, allCommitments };
    });
}

module.exports = meetingCommitmentsRoutes;
