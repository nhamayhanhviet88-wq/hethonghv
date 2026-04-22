const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

async function settingsRoutes(fastify, options) {
    // Migration: add sort_order column if missing
    try {
        await db.run(`ALTER TABLE settings_sources ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`);
        // Initialize sort_order for existing rows that have 0
        const rows = await db.all('SELECT id FROM settings_sources WHERE sort_order = 0 OR sort_order IS NULL ORDER BY id ASC');
        for (let i = 0; i < rows.length; i++) {
            await db.run('UPDATE settings_sources SET sort_order = $1 WHERE id = $2', [i + 1, rows[i].id]);
        }
    } catch(e) { /* column may already exist */ }

    const tables = {
        'commission-tiers': { table: 'commission_tiers', fields: ['name', 'percentage', 'parent_percentage'], label: 'Tầng hoa hồng' },
        'sources': { table: 'settings_sources', fields: ['name'], label: 'Nguồn khách' },
        'promotions': { table: 'settings_promotions', fields: ['name'], label: 'Khuyến mãi' },
        'industries': { table: 'settings_industries', fields: ['name'], label: 'Lĩnh vực' }
    };

    // ===== Job Titles per CRM (MUST be before generic :type routes) =====
    fastify.get('/api/settings/job-titles', { preHandler: [authenticate] }, async (request, reply) => {
        const { crm_type } = request.query || {};
        if (crm_type) {
            const items = await db.all('SELECT * FROM settings_job_titles WHERE crm_type = ? ORDER BY id ASC', [crm_type]);
            return { items };
        }
        const items = await db.all('SELECT * FROM settings_job_titles ORDER BY crm_type, id ASC');
        return { items };
    });

    fastify.post('/api/settings/job-titles', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { crm_type, name } = request.body || {};
        if (!crm_type || !name) return reply.code(400).send({ error: 'Thiếu crm_type hoặc tên' });
        const result = await db.run('INSERT INTO settings_job_titles (crm_type, name) VALUES (?, ?)', [crm_type, name]);
        return { success: true, message: 'Thêm Chức Danh thành công', id: result.lastInsertRowid };
    });

    fastify.delete('/api/settings/job-titles/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        await db.run('DELETE FROM settings_job_titles WHERE id = ?', [Number(request.params.id)]);
        return { success: true, message: 'Xóa Chức Danh thành công' };
    });

    // GET all items
    fastify.get('/api/settings/:type', { preHandler: [authenticate] }, async (request, reply) => {
        const config = tables[request.params.type];
        if (!config) return reply.code(404).send({ error: 'Loại cài đặt không tồn tại' });

        const orderCol = config.table === 'settings_sources' ? 'sort_order ASC, id ASC' : 'id ASC';
        const items = await db.all(`SELECT * FROM ${config.table} ORDER BY ${orderCol}`);
        return { items, label: config.label };
    });

    // POST create item
    fastify.post('/api/settings/:type', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const config = tables[request.params.type];
        if (!config) return reply.code(404).send({ error: 'Loại cài đặt không tồn tại' });

        const body = request.body || {};
        if (!body.name) {
            return reply.code(400).send({ error: 'Vui lòng nhập tên' });
        }

        const values = config.fields.map(f => body[f] ?? null);
        const placeholders = config.fields.map(() => '?').join(', ');
        const fieldNames = config.fields.join(', ');

        // For sources, set sort_order = MAX + 1
        if (config.table === 'settings_sources') {
            const maxRow = await db.get('SELECT COALESCE(MAX(sort_order),0) as mx FROM settings_sources');
            const nextOrder = (maxRow?.mx || 0) + 1;
            values.push(nextOrder);
            const result = await db.run(
                `INSERT INTO ${config.table} (${fieldNames}, sort_order) VALUES (${placeholders}, ?)`,
                values
            );
            const item = await db.get(`SELECT * FROM ${config.table} WHERE id = ?`, [result.lastInsertRowid]);
            return { success: true, item, message: `Thêm ${config.label} thành công` };
        }

        const result = await db.run(
            `INSERT INTO ${config.table} (${fieldNames}) VALUES (${placeholders})`,
            values
        );

        const item = await db.get(`SELECT * FROM ${config.table} WHERE id = ?`, [result.lastInsertRowid]);
        return { success: true, item, message: `Thêm ${config.label} thành công` };
    });

    // PUT update item
    fastify.put('/api/settings/:type/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const config = tables[request.params.type];
        if (!config) return reply.code(404).send({ error: 'Loại cài đặt không tồn tại' });

        const body = request.body || {};
        const sets = config.fields.map(f => `${f} = ?`).join(', ');
        const values = config.fields.map(f => body[f] ?? null);
        values.push(Number(request.params.id));

        await db.run(`UPDATE ${config.table} SET ${sets} WHERE id = ?`, values);
        return { success: true, message: `Cập nhật ${config.label} thành công` };
    });

    // DELETE item
    fastify.delete('/api/settings/:type/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const config = tables[request.params.type];
        if (!config) return reply.code(404).send({ error: 'Loại cài đặt không tồn tại' });

        await db.run(`DELETE FROM ${config.table} WHERE id = ?`, [Number(request.params.id)]);
        return { success: true, message: `Xóa ${config.label} thành công` };
    });

    // PUT reorder items (swap sort_order)
    fastify.put('/api/settings/:type/reorder', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const config = tables[request.params.type];
        if (!config) return reply.code(404).send({ error: 'Loại cài đặt không tồn tại' });
        if (config.table !== 'settings_sources') return reply.code(400).send({ error: 'Chỉ hỗ trợ sắp xếp Nguồn Khách' });

        const { id, direction } = request.body || {};
        if (!id || !direction) return reply.code(400).send({ error: 'Thiếu id hoặc direction' });

        const current = await db.get('SELECT id, sort_order FROM settings_sources WHERE id = $1', [id]);
        if (!current) return reply.code(404).send({ error: 'Không tìm thấy' });

        let neighbor;
        if (direction === 'up') {
            neighbor = await db.get('SELECT id, sort_order FROM settings_sources WHERE sort_order < $1 ORDER BY sort_order DESC LIMIT 1', [current.sort_order]);
        } else {
            neighbor = await db.get('SELECT id, sort_order FROM settings_sources WHERE sort_order > $1 ORDER BY sort_order ASC LIMIT 1', [current.sort_order]);
        }
        if (!neighbor) return reply.code(400).send({ error: direction === 'up' ? 'Đã ở đầu danh sách' : 'Đã ở cuối danh sách' });

        // Swap sort_order
        await db.run('UPDATE settings_sources SET sort_order = $1 WHERE id = $2', [neighbor.sort_order, current.id]);
        await db.run('UPDATE settings_sources SET sort_order = $1 WHERE id = $2', [current.sort_order, neighbor.id]);

        return { success: true, message: 'Đã sắp xếp lại' };
    });

    // ===== App Config (generic key-value) =====
    fastify.get('/api/app-config/:key', { preHandler: [authenticate] }, async (request, reply) => {
        const row = await db.get('SELECT value FROM app_config WHERE key = ?', [request.params.key]);
        return { value: row ? row.value : null };
    });

    fastify.put('/api/app-config/:key', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { key } = request.params;
        const { value } = request.body || {};
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, NOW())
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
            [key, typeof value === 'string' ? value : JSON.stringify(value)]
        );
        return { success: true };
    });
}

module.exports = settingsRoutes;
