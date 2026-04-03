const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

async function positionsRolesRoutes(fastify, options) {

    // ========== POSITIONS CRUD ==========

    // GET all positions
    fastify.get('/api/positions', { preHandler: [authenticate] }, async (request, reply) => {
        const positions = await db.all('SELECT * FROM positions ORDER BY name');
        return { positions };
    });

    // POST create position
    fastify.post('/api/positions', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { name } = request.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Tên vị trí không được trống' });
        
        const existing = await db.get('SELECT id FROM positions WHERE name = $1', [name.trim()]);
        if (existing) return reply.code(400).send({ error: 'Vị trí này đã tồn tại' });

        const result = await db.get('INSERT INTO positions (name) VALUES ($1) RETURNING *', [name.trim()]);
        return { success: true, position: result };
    });

    // DELETE position
    fastify.delete('/api/positions/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const id = Number(request.params.id);
        
        // Check if any users use this position
        const usersCount = await db.get('SELECT COUNT(*) as cnt FROM users WHERE position_id = $1', [id]);
        if (usersCount && usersCount.cnt > 0) {
            return reply.code(400).send({ error: `Không thể xóa — ${usersCount.cnt} nhân viên đang sử dụng vị trí này` });
        }

        await db.run('DELETE FROM positions WHERE id = $1', [id]);
        return { success: true };
    });

    // ========== SYSTEM ROLES CRUD ==========

    // GET all system roles
    fastify.get('/api/system-roles', { preHandler: [authenticate] }, async (request, reply) => {
        const roles = await db.all('SELECT * FROM system_roles ORDER BY level DESC');
        return { roles };
    });

    // POST create role
    fastify.post('/api/system-roles', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { name, slug, level } = request.body || {};
        if (!name || !slug) return reply.code(400).send({ error: 'Tên và slug không được trống' });
        
        const existing = await db.get('SELECT id FROM system_roles WHERE slug = $1', [slug.trim()]);
        if (existing) return reply.code(400).send({ error: 'Slug này đã tồn tại' });

        const result = await db.get(
            'INSERT INTO system_roles (name, slug, level) VALUES ($1, $2, $3) RETURNING *',
            [name.trim(), slug.trim(), level || 0]
        );
        return { success: true, role: result };
    });

    // PUT update role level
    fastify.put('/api/system-roles/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const id = Number(request.params.id);
        const { name, level } = request.body || {};
        
        const updates = [];
        const params = [];
        if (name) { updates.push(`name = $${params.length + 1}`); params.push(name.trim()); }
        if (level !== undefined) { updates.push(`level = $${params.length + 1}`); params.push(level); }
        
        if (updates.length === 0) return reply.code(400).send({ error: 'Không có gì để cập nhật' });
        
        params.push(id);
        await db.run(`UPDATE system_roles SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
        return { success: true };
    });

    // DELETE role
    fastify.delete('/api/system-roles/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const id = Number(request.params.id);
        
        const role = await db.get('SELECT * FROM system_roles WHERE id = $1', [id]);
        if (!role) return reply.code(404).send({ error: 'Không tìm thấy vai trò' });
        
        // Protect core roles
        const coreRoles = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong', 'nhan_vien', 'part_time'];
        if (coreRoles.includes(role.slug)) {
            return reply.code(400).send({ error: 'Không thể xóa vai trò hệ thống mặc định' });
        }

        // Check if any users use this role
        const usersCount = await db.get('SELECT COUNT(*) as cnt FROM users WHERE role = $1', [role.slug]);
        if (usersCount && usersCount.cnt > 0) {
            return reply.code(400).send({ error: `Không thể xóa — ${usersCount.cnt} nhân viên đang sử dụng vai trò này` });
        }

        await db.run('DELETE FROM system_roles WHERE id = $1', [id]);
        return { success: true };
    });

    // ========== COMBINED DROPDOWN ==========
    fastify.get('/api/roles-positions', { preHandler: [authenticate] }, async (request, reply) => {
        const [roles, positions] = await Promise.all([
            db.all('SELECT * FROM system_roles ORDER BY level DESC'),
            db.all('SELECT * FROM positions ORDER BY name')
        ]);
        return { roles, positions };
    });
}

module.exports = positionsRolesRoutes;
