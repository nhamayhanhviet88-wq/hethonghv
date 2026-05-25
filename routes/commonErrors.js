// ========== COMMON ERRORS — Lỗi Thường Gặp & Xử Lý ==========
const db = require('../db/pool');
const { vnNow } = require('../utils/timezone');

async function routes(fastify) {
    const { authenticate } = require('../middleware/auth');

    // ========== ERROR CATEGORIES ==========

    // GET /api/error-categories — list all
    fastify.get('/api/error-categories', { preHandler: authenticate }, async () => {
        const rows = await db.all('SELECT * FROM error_categories ORDER BY id ASC');
        return { categories: rows };
    });

    // POST /api/error-categories — create new
    fastify.post('/api/error-categories', { preHandler: authenticate }, async (request) => {
        const { name } = request.body;
        if (!name || !name.trim()) return { error: 'Tên loại lỗi không được trống' };
        try {
            const row = await db.get(
                'INSERT INTO error_categories (name) VALUES ($1) RETURNING *',
                [name.trim()]
            );
            return { success: true, category: row };
        } catch (e) {
            if (e.message.includes('unique') || e.message.includes('duplicate')) {
                return { error: 'Loại lỗi đã tồn tại' };
            }
            throw e;
        }
    });

    // DELETE /api/error-categories/:id
    fastify.delete('/api/error-categories/:id', { preHandler: authenticate }, async (request) => {
        const id = request.params.id;
        // Check if used by any common_errors
        const used = await db.get('SELECT COUNT(*)::int AS cnt FROM common_errors WHERE error_category_id = $1', [id]);
        if (used && used.cnt > 0) {
            return { error: 'Không thể xóa — đang được sử dụng bởi ' + used.cnt + ' lỗi' };
        }
        await db.run('DELETE FROM error_categories WHERE id = $1', [id]);
        return { success: true };
    });

    // ========== COMMON ERRORS CRUD ==========

    // GET /api/common-errors-tpl — list all common error templates
    fastify.get('/api/common-errors-tpl', { preHandler: authenticate }, async (request) => {
        const { status, category_id, department } = request.query;
        let where = 'WHERE 1=1';
        const params = [];
        let idx = 1;

        if (status) {
            if (status === 'pending') where += ` AND (ce.status = 'pending' OR ce.status IS NULL)`;
            else { where += ` AND ce.status = $${idx++}`; params.push(status); }
        }
        if (category_id) { where += ` AND ce.error_category_id = $${idx++}`; params.push(Number(category_id)); }
        if (department) { where += ` AND ce.department = $${idx++}`; params.push(department); }

        const items = await db.all(`
            SELECT ce.*, ec.name AS category_name, u.full_name AS created_by_name
            FROM common_errors ce
            LEFT JOIN error_categories ec ON ec.id = ce.error_category_id
            LEFT JOIN users u ON u.id = ce.created_by
            ${where}
            ORDER BY ce.created_at DESC
        `, params);

        return { items };
    });

    // GET /api/common-errors-tpl/stats — aggregate counts
    fastify.get('/api/common-errors-tpl/stats', { preHandler: authenticate }, async () => {
        const row = await db.get(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'pending' OR status IS NULL)::int AS pending,
                COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
                COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved
            FROM common_errors
        `);
        return row || { total: 0, pending: 0, in_progress: 0, resolved: 0 };
    });

    // POST /api/common-errors-tpl — create
    fastify.post('/api/common-errors-tpl', { preHandler: authenticate }, async (request) => {
        const { error_name, error_category_id, department, status, fix_guide, sale_guide, commit_factory, commit_department, commit_sale } = request.body;
        if (!error_name || !error_name.trim()) return { error: 'Tên lỗi không được trống' };

        const row = await db.get(`
            INSERT INTO common_errors (error_name, error_category_id, department, status, fix_guide, sale_guide, commit_factory, commit_department, commit_sale, created_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
        `, [
            error_name.trim(),
            error_category_id || null,
            department || null,
            status || 'pending',
            fix_guide || null,
            sale_guide || null,
            commit_factory || null,
            commit_department || null,
            commit_sale || null,
            request.user.id
        ]);

        return { success: true, item: row };
    });

    // PUT /api/common-errors-tpl/:id — update
    fastify.put('/api/common-errors-tpl/:id', { preHandler: authenticate }, async (request) => {
        const id = request.params.id;
        const { error_name, error_category_id, department, status, fix_guide, sale_guide, commit_factory, commit_department, commit_sale } = request.body;

        const existing = await db.get('SELECT id FROM common_errors WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy lỗi' };

        await db.run(`
            UPDATE common_errors SET
                error_name = $1, error_category_id = $2, department = $3, status = $4,
                fix_guide = $5, sale_guide = $6, commit_factory = $7, commit_department = $8,
                commit_sale = $9, updated_at = NOW()
            WHERE id = $10
        `, [
            error_name || '', error_category_id || null, department || null, status || 'pending',
            fix_guide || null, sale_guide || null, commit_factory || null, commit_department || null,
            commit_sale || null, id
        ]);

        return { success: true };
    });

    // PATCH /api/common-errors-tpl/:id/status — quick status update
    fastify.patch('/api/common-errors-tpl/:id/status', { preHandler: authenticate }, async (request) => {
        const { status } = request.body;
        const id = request.params.id;
        const valid = ['pending', 'in_progress', 'resolved'];
        if (!valid.includes(status)) return { error: 'Trạng thái không hợp lệ' };

        await db.run('UPDATE common_errors SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
        return { success: true };
    });

    // DELETE /api/common-errors-tpl/:id
    fastify.delete('/api/common-errors-tpl/:id', { preHandler: authenticate }, async (request) => {
        await db.run('DELETE FROM common_errors WHERE id = $1', [request.params.id]);
        return { success: true };
    });
}

module.exports = routes;
