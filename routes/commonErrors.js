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

    // ========== ERROR DEPARTMENTS ==========

    fastify.get('/api/error-departments', { preHandler: authenticate }, async () => {
        const rows = await db.all('SELECT * FROM error_departments ORDER BY id ASC');
        return { departments: rows };
    });

    fastify.post('/api/error-departments', { preHandler: authenticate }, async (request) => {
        const { name } = request.body;
        if (!name || !name.trim()) return { error: 'Tên bộ phận không được trống' };
        try {
            const row = await db.get('INSERT INTO error_departments (name) VALUES ($1) RETURNING *', [name.trim()]);
            return { success: true, department: row };
        } catch (e) {
            if (e.message.includes('unique') || e.message.includes('duplicate')) return { error: 'Bộ phận đã tồn tại' };
            throw e;
        }
    });

    fastify.delete('/api/error-departments/:id', { preHandler: authenticate }, async (request) => {
        await db.run('DELETE FROM error_departments WHERE id = $1', [request.params.id]);
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
        if (department) { where += ` AND ce.departments @> $${idx++}::jsonb`; params.push(JSON.stringify([department])); }

        const items = await db.all(`
            SELECT ce.*, ec.name AS category_name, u.full_name AS created_by_name,
                COALESCE((SELECT COUNT(*) FROM customer_error_orders ceo WHERE ceo.common_error_type = ce.error_name), 0)::int AS linked_order_count,
                COALESCE((SELECT json_agg(json_build_object('id', ceo2.id, 'order_code', ceo2.order_code, 'report_date', ceo2.report_date) ORDER BY ceo2.report_date DESC)
                    FROM customer_error_orders ceo2 WHERE ceo2.common_error_type = ce.error_name), '[]'::json) AS linked_orders
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
        const { error_name, error_category_id, departments, status, fix_guide, sale_guide, commit_factory, commit_department, commit_sale } = request.body;
        if (!error_name || !error_name.trim()) return { error: 'Tên lỗi không được trống' };

        const deptJson = JSON.stringify(departments || []);
        const row = await db.get(`
            INSERT INTO common_errors (error_name, error_category_id, departments, status, fix_guide, sale_guide, commit_factory, commit_department, commit_sale, created_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
        `, [
            error_name.trim(),
            error_category_id || null,
            deptJson,
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
        const { error_name, error_category_id, departments, status, fix_guide, sale_guide, commit_factory, commit_department, commit_sale } = request.body;

        const existing = await db.get('SELECT id, error_name FROM common_errors WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy lỗi' };

        const oldName = existing.error_name;
        const newName = (error_name || '').trim();

        const deptJson = JSON.stringify(departments || []);
        await db.run(`
            UPDATE common_errors SET
                error_name = $1, error_category_id = $2, departments = $3, status = $4,
                fix_guide = $5, sale_guide = $6, commit_factory = $7, commit_department = $8,
                commit_sale = $9, updated_at = NOW()
            WHERE id = $10
        `, [
            newName || '', error_category_id || null, deptJson, status || 'pending',
            fix_guide || null, sale_guide || null, commit_factory || null, commit_department || null,
            commit_sale || null, id
        ]);

        // ★ Auto-sync: If error_name changed, update all linked customer_error_orders
        if (oldName && newName && oldName !== newName) {
            const updated = await db.run(
                'UPDATE customer_error_orders SET common_error_type = $1 WHERE common_error_type = $2',
                [newName, oldName]
            );
            console.log(`[CommonErrors] ✅ Renamed "${oldName}" → "${newName}" — synced customer_error_orders`);
        }

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

    // ========== GET /:id/linked-orders — detailed linked orders for drill-down ==========
    fastify.get('/api/common-errors-tpl/:id/linked-orders', { preHandler: authenticate }, async (request) => {
        const ce = await db.get('SELECT error_name FROM common_errors WHERE id = $1', [request.params.id]);
        if (!ce) return { error: 'Không tìm thấy lỗi', items: [] };

        const items = await db.all(`
            SELECT ceo.*, u.full_name AS created_by_name
            FROM customer_error_orders ceo
            LEFT JOIN users u ON u.id = ceo.created_by
            WHERE ceo.common_error_type = $1
            ORDER BY ceo.report_date DESC, ceo.id DESC
        `, [ce.error_name]);

        return { items, error_name: ce.error_name };
    });

    // ========== IMAGE UPLOAD ==========
    const path = require('path');
    const fs = require('fs');
    const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'common-errors');
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    // POST /api/common-errors-tpl/:id/images — upload images
    fastify.post('/api/common-errors-tpl/:id/images', { preHandler: authenticate }, async (request) => {
        const id = request.params.id;
        const existing = await db.get('SELECT id, error_images FROM common_errors WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy' };

        const parts = request.parts();
        let imgs = [];
        try { imgs = typeof existing.error_images === 'string' ? JSON.parse(existing.error_images || '[]') : (existing.error_images || []); } catch(e) {}

        for await (const part of parts) {
            if (part.file) {
                const ext = path.extname(part.filename || '.jpg').toLowerCase();
                const fname = 'ce_' + id + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) + ext;
                const fpath = path.join(UPLOAD_DIR, fname);
                const buf = await part.toBuffer();
                fs.writeFileSync(fpath, buf);
                imgs.push('/uploads/common-errors/' + fname);
            }
        }

        await db.run('UPDATE common_errors SET error_images = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(imgs), id]);
        return { success: true, images: imgs };
    });

    // POST /api/common-errors-tpl/:id/video — upload video
    fastify.post('/api/common-errors-tpl/:id/video', { preHandler: authenticate }, async (request) => {
        const id = request.params.id;
        const existing = await db.get('SELECT id FROM common_errors WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy' };

        const parts = request.parts();
        let videoUrl = null;
        for await (const part of parts) {
            if (part.file) {
                const ext = path.extname(part.filename || '.mp4').toLowerCase();
                const fname = 'cev_' + id + '_' + Date.now() + ext;
                const fpath = path.join(UPLOAD_DIR, fname);
                const buf = await part.toBuffer();
                fs.writeFileSync(fpath, buf);
                videoUrl = '/uploads/common-errors/' + fname;
            }
        }
        if (videoUrl) {
            await db.run('UPDATE common_errors SET error_video = $1, updated_at = NOW() WHERE id = $2', [videoUrl, id]);
        }
        return { success: true, video: videoUrl };
    });
}

module.exports = routes;
