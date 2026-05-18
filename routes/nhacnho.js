// ========== NHẮC NHỞ CÔNG VIỆC — Reminder Templates API ==========
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== GET ALL reminders (admin view) ==========
    fastify.get('/api/nhacnho/all', { preHandler: [authenticate] }, async (request, reply) => {
        const { category, department } = request.query;
        let where = 'WHERE 1=1';
        const params = [];
        let idx = 1;
        if (category) { where += ` AND r.category = $${idx++}`; params.push(category); }
        if (department) { where += ` AND r.departments::text ILIKE $${idx++}`; params.push(`%${department}%`); }

        const rows = await db.all(`
            SELECT r.*, u.full_name as created_by_name
            FROM reminder_templates r
            LEFT JOIN users u ON u.username = r.created_by OR u.full_name = r.created_by
            ${where}
            ORDER BY r.created_at DESC
        `, params);

        // Get distinct departments for sidebar
        const deptRows = await db.all(`SELECT DISTINCT unnest(string_to_array(departments, ',')) as dept FROM reminder_templates WHERE departments IS NOT NULL AND departments != '' AND departments != '[]'`);
        const departments_list = [...new Set(deptRows.map(d => d.dept.trim()).filter(Boolean))].sort();

        return { reminders: rows, departments: departments_list };
    });

    // ========== GET ACTIVE reminders for form (filtered by category) ==========
    fastify.get('/api/nhacnho/active', { preHandler: [authenticate] }, async (request, reply) => {
        const { category } = request.query;
        let where = 'WHERE is_active = true';
        const params = [];
        if (category) { where += ` AND category = $1`; params.push(category); }

        const rows = await db.all(`SELECT id, content, category, departments FROM reminder_templates ${where} ORDER BY content ASC`, params);
        return { reminders: rows };
    });

    // ========== GET HISTORY for a reminder ==========
    fastify.get('/api/nhacnho/history/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const rid = Number(request.params.id);
        const rows = await db.all(`SELECT * FROM reminder_history WHERE reminder_id = $1 ORDER BY changed_at DESC LIMIT 50`, [rid]);
        return { history: rows };
    });

    // ========== CREATE reminder ==========
    fastify.post('/api/nhacnho', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { content, category, departments, applied_date } = request.body || {};
        if (!content || !content.trim()) return reply.code(400).send({ error: 'Nhập nội dung nhắc nhở' });
        if (!category) return reply.code(400).send({ error: 'Chọn loại (ke_toan hoặc san_xuat)' });

        const deptStr = Array.isArray(departments) ? departments.join(',') : (departments || '');
        const now = vnNow();
        const dateStr = applied_date || (now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0'));

        const result = await db.get(`
            INSERT INTO reminder_templates (content, category, departments, is_active, applied_date, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, true, $4, $5, NOW(), NOW()) RETURNING *
        `, [content.trim(), category, deptStr, dateStr, request.user.full_name || request.user.username]);

        // Log history
        await db.run(`INSERT INTO reminder_history (reminder_id, action, changed_by, changed_at, details)
            VALUES ($1, 'created', $2, NOW(), $3)`,
            [result.id, request.user.full_name || request.user.username, 'Tạo nhắc nhở: ' + content.trim()]);

        return { success: true, reminder: result };
    });

    // ========== UPDATE reminder ==========
    fastify.put('/api/nhacnho/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const rid = Number(request.params.id);
        const { content, category, departments, applied_date } = request.body || {};
        if (!content || !content.trim()) return reply.code(400).send({ error: 'Nhập nội dung' });

        const deptStr = Array.isArray(departments) ? departments.join(',') : (departments || '');
        await db.run(`UPDATE reminder_templates SET content=$1, category=$2, departments=$3, applied_date=$4, updated_at=NOW() WHERE id=$5`,
            [content.trim(), category || 'san_xuat', deptStr, applied_date || null, rid]);

        await db.run(`INSERT INTO reminder_history (reminder_id, action, changed_by, changed_at, details)
            VALUES ($1, 'updated', $2, NOW(), $3)`,
            [rid, request.user.full_name || request.user.username, 'Cập nhật: ' + content.trim()]);

        return { success: true };
    });

    // ========== TOGGLE active/inactive ==========
    fastify.put('/api/nhacnho/:id/toggle', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const rid = Number(request.params.id);
        const { is_active } = request.body || {};
        await db.run(`UPDATE reminder_templates SET is_active=$1, updated_at=NOW() WHERE id=$2`, [is_active, rid]);

        await db.run(`INSERT INTO reminder_history (reminder_id, action, changed_by, changed_at, details)
            VALUES ($1, 'toggled', $2, NOW(), $3)`,
            [rid, request.user.full_name || request.user.username, is_active ? 'Bật áp dụng' : 'Tắt áp dụng']);

        return { success: true };
    });

    // ========== DELETE (soft — just toggle off) ==========
    fastify.delete('/api/nhacnho/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const rid = Number(request.params.id);
        await db.run(`DELETE FROM reminder_history WHERE reminder_id = $1`, [rid]);
        await db.run(`DELETE FROM reminder_templates WHERE id = $1`, [rid]);
        return { success: true };
    });
};
