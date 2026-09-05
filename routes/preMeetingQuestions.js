const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function preMeetingQuestionsRoutes(fastify, options) {
    // GET /api/pre-meeting-questions — Lấy danh sách câu hỏi trước buổi họp
    fastify.get('/api/pre-meeting-questions', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { status, search } = request.query || {};
            let query = `
                SELECT q.id, q.title, q.content, q.status, q.is_important, q.creator_id, q.created_at, q.updated_at,
                       u.full_name AS creator_name, u.username AS creator_username, u.role AS creator_role,
                       d.name AS creator_department
                FROM pre_meeting_questions q
                LEFT JOIN users u ON q.creator_id = u.id
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE 1=1
            `;
            const params = [];

            if (status && status !== 'all') {
                params.push(status);
                query += ` AND q.status = $${params.length}`;
            }

            if (search && search.trim()) {
                params.push(`%${search.trim()}%`);
                query += ` AND (q.title ILIKE $${params.length} OR q.content ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
            }

            query += ` ORDER BY COALESCE(q.is_important, FALSE) DESC, q.created_at ASC`;

            const questions = await db.all(query, params);
            console.log('API_QUESTIONS_QUERY_RESULT:', questions ? questions.slice(0, 3) : []);
            return { success: true, questions: questions || [] };
        } catch (err) {
            console.error('Error fetching pre-meeting questions:', err);
            return reply.code(500).send({ error: 'Lỗi tải danh sách câu hỏi trước buổi họp' });
        }
    });

    // POST /api/pre-meeting-questions — Tạo mới câu hỏi trước buổi họp
    fastify.post('/api/pre-meeting-questions', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { title, content, status, is_important } = request.body || {};
            if (!title || !title.trim()) {
                return reply.code(400).send({ error: 'Nội dung câu hỏi không được để trống' });
            }

            const creatorId = request.user.id;
            const initStatus = status === 'completed' ? 'completed' : 'pending';
            const isImp = is_important === true || is_important === 'true' || is_important === 1 || is_important === '1';

            const result = await db.run(
                `INSERT INTO pre_meeting_questions (title, content, status, is_important, creator_id, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id`,
                [title.trim(), (content || '').trim(), initStatus, isImp, creatorId]
            );

            return { success: true, id: result?.id || result?.insertId, message: 'Đã thêm câu hỏi mới thành công' };
        } catch (err) {
            console.error('Error creating pre-meeting question:', err);
            return reply.code(500).send({ error: 'Lỗi khi lưu câu hỏi mới' });
        }
    });

    // PUT /api/pre-meeting-questions/:id/status — Cập nhật nhanh trạng thái (Chưa trao đổi / Đã trao đổi)
    fastify.put('/api/pre-meeting-questions/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { status } = request.body || {};

            if (!status || !['pending', 'completed'].includes(status)) {
                return reply.code(400).send({ error: 'Trạng thái không hợp lệ' });
            }

            const existing = await db.get('SELECT id, creator_id FROM pre_meeting_questions WHERE id = $1', [id]);
            if (!existing) {
                return reply.code(404).send({ error: 'Không tìm thấy câu hỏi' });
            }

            if (existing.creator_id !== request.user.id) {
                return reply.code(403).send({ error: 'Bạn chỉ có quyền thay đổi trạng thái câu hỏi do chính mình tạo' });
            }

            await db.run(
                'UPDATE pre_meeting_questions SET status = $1, updated_at = NOW() WHERE id = $2',
                [status, id]
            );

            return { success: true, message: 'Đã cập nhật trạng thái' };
        } catch (err) {
            console.error('Error updating question status:', err);
            return reply.code(500).send({ error: 'Lỗi khi cập nhật trạng thái' });
        }
    });

    // PUT /api/pre-meeting-questions/:id — Cập nhật nội dung câu hỏi
    fastify.put('/api/pre-meeting-questions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { title, content, status, is_important } = request.body || {};

            if (!title || !title.trim()) {
                return reply.code(400).send({ error: 'Nội dung câu hỏi không được để trống' });
            }

            const existing = await db.get('SELECT id, creator_id FROM pre_meeting_questions WHERE id = $1', [id]);
            if (!existing) {
                return reply.code(404).send({ error: 'Không tìm thấy câu hỏi' });
            }

            if (existing.creator_id !== request.user.id) {
                return reply.code(403).send({ error: 'Bạn chỉ có quyền chỉnh sửa câu hỏi do chính mình tạo' });
            }

            const newStatus = status === 'completed' ? 'completed' : 'pending';
            const isImp = is_important === true || is_important === 'true' || is_important === 1 || is_important === '1';

            await db.run(
                'UPDATE pre_meeting_questions SET title = $1, content = $2, status = $3, is_important = $4, updated_at = NOW() WHERE id = $5',
                [title.trim(), (content || '').trim(), newStatus, isImp, id]
            );

            return { success: true, message: 'Đã cập nhật câu hỏi' };
        } catch (err) {
            console.error('Error updating question:', err);
            return reply.code(500).send({ error: 'Lỗi khi cập nhật câu hỏi' });
        }
    });

    // DELETE /api/pre-meeting-questions/:id — Xóa câu hỏi
    fastify.delete('/api/pre-meeting-questions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const existing = await db.get('SELECT id, creator_id FROM pre_meeting_questions WHERE id = $1', [id]);
            if (!existing) {
                return reply.code(404).send({ error: 'Không tìm thấy câu hỏi' });
            }

            if (existing.creator_id !== request.user.id) {
                return reply.code(403).send({ error: 'Bạn chỉ có quyền xóa câu hỏi do chính mình tạo' });
            }

            await db.run('DELETE FROM pre_meeting_questions WHERE id = $1', [id]);
            return { success: true, message: 'Đã xóa câu hỏi thành công' };
        } catch (err) {
            console.error('Error deleting question:', err);
            return reply.code(500).send({ error: 'Lỗi khi xóa câu hỏi' });
        }
    });
}

module.exports = preMeetingQuestionsRoutes;
