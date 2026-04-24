'use strict';
const db = require('../db/pool');

module.exports = async function(fastify) {
    // ==================== INIT TABLE ====================
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            type TEXT NOT NULL DEFAULT 'feedback',
            title TEXT NOT NULL,
            content TEXT,
            ref_task_name TEXT,
            ref_date TEXT,
            ref_task_type TEXT,
            created_by INTEGER REFERENCES users(id),
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { /* exists */ }

    // ==================== SEND FEEDBACK (Manager → Employee) ====================
    fastify.post('/api/notifications/feedback', async (request, reply) => {
        const mgr = request.user;
        if (!mgr || !['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(mgr.role)) {
            return reply.code(403).send({ error: 'Không có quyền' });
        }

        const { user_id, task_name, task_date, task_type, content } = request.body || {};
        if (!user_id || !task_name || !content) {
            return reply.code(400).send({ error: 'Thiếu thông tin' });
        }

        // Get manager name
        const mgrInfo = await db.get('SELECT full_name FROM users WHERE id = $1', [mgr.id]);
        const mgrName = mgrInfo?.full_name || 'Quản lý';

        // Get employee name
        const empInfo = await db.get('SELECT full_name FROM users WHERE id = $1', [user_id]);
        const empName = empInfo?.full_name || 'Nhân viên';

        const title = `💬 Góp ý từ ${mgrName}: ${task_name}`;

        await db.run(
            `INSERT INTO notifications (user_id, type, title, content, ref_task_name, ref_date, ref_task_type, created_by)
             VALUES ($1, 'feedback', $2, $3, $4, $5, $6, $7)`,
            [user_id, title, content, task_name, task_date || null, task_type || 'schedule', mgr.id]
        );

        return { success: true, message: `Đã gửi góp ý cho ${empName}` };
    });

    // ==================== GET MY NOTIFICATIONS ====================
    fastify.get('/api/notifications/my', async (request, reply) => {
        const user = request.user;
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const notifications = await db.all(
            `SELECT n.*, u.full_name as sender_name
             FROM notifications n
             LEFT JOIN users u ON u.id = n.created_by
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [user.id]
        );

        const unreadCount = await db.get(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
            [user.id]
        );

        return { notifications, unread_count: parseInt(unreadCount?.count || 0) };
    });

    // ==================== GET UNREAD COUNT ====================
    fastify.get('/api/notifications/unread-count', async (request, reply) => {
        const user = request.user;
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const result = await db.get(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
            [user.id]
        );

        return { count: parseInt(result?.count || 0) };
    });

    // ==================== MARK AS READ ====================
    fastify.put('/api/notifications/:id/read', async (request, reply) => {
        const user = request.user;
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        await db.run(
            'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
            [request.params.id, user.id]
        );

        return { success: true };
    });

    // ==================== MARK ALL AS READ ====================
    fastify.put('/api/notifications/read-all', async (request, reply) => {
        const user = request.user;
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        await db.run(
            'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
            [user.id]
        );

        return { success: true };
    });

    // ==================== GET FEEDBACKS FOR A TASK (for schedule card badge) ====================
    fastify.get('/api/notifications/task-feedbacks', async (request, reply) => {
        const user = request.user;
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const { user_id, date } = request.query;
        const targetUserId = user_id || user.id;

        const feedbacks = await db.all(
            `SELECT n.id, n.ref_task_name, n.ref_date, n.content, n.is_read, n.created_at, u.full_name as sender_name
             FROM notifications n
             LEFT JOIN users u ON u.id = n.created_by
             WHERE n.user_id = $1 AND n.type = 'feedback' AND ($2::text IS NULL OR n.ref_date = $2)
             ORDER BY n.created_at DESC`,
            [targetUserId, date || null]
        );

        return { feedbacks };
    });
};
