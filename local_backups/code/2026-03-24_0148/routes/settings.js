const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

async function settingsRoutes(fastify, options) {
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
            const items = await db.all('SELECT * FROM settings_job_titles WHERE crm_type = ? ORDER BY name ASC', [crm_type]);
            return { items };
        }
        const items = await db.all('SELECT * FROM settings_job_titles ORDER BY crm_type, name ASC');
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

        const items = await db.all(`SELECT * FROM ${config.table} ORDER BY id ASC`);
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
