// ========== BẢNG GIÁ MAY (BGM) — Sewing Price List Routes ==========
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { vnNow, vnFormat } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== LIST all items (with filters) ==========
    fastify.get('/api/bgm/items', { preHandler: [authenticate] }, async (request, reply) => {
        const { group_name, search } = request.query;
        let where = 'WHERE i.is_active = true';
        const params = [];
        let idx = 1;

        if (group_name) { where += ` AND i.group_name = $${idx++}`; params.push(group_name); }
        if (search) {
            where += ` AND (i.name ILIKE $${idx} OR i.group_name ILIKE $${idx})`;
            params.push(`%${search}%`); idx++;
        }

        const rows = await db.all(`
            SELECT i.*,
                u_created.full_name AS created_by_name
            FROM bgm_items i
            LEFT JOIN users u_created ON i.created_by = u_created.id
            ${where}
            ORDER BY i.group_name ASC, i.display_order ASC, i.id ASC
        `, params);

        return { items: rows };
    });

    // ========== GET distinct groups ==========
    fastify.get('/api/bgm/groups', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`
            SELECT group_name, COUNT(*) AS item_count
            FROM bgm_items
            WHERE is_active = true
            GROUP BY group_name
            ORDER BY group_name ASC
        `);
        const total = await db.get('SELECT COUNT(*) AS cnt FROM bgm_items WHERE is_active = true');
        return { groups: rows, total: Number(total?.cnt || 0) };
    });

    // ========== CREATE item ==========
    fastify.post('/api/bgm/items', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const b = request.body || {};

        if (!b.name || !b.name.trim()) return reply.code(400).send({ error: 'Nhập Tên chi tiết' });
        if (!b.group_name || !b.group_name.trim()) return reply.code(400).send({ error: 'Nhập Nhóm' });
        if (!b.add_type || !['once','multi'].includes(b.add_type)) return reply.code(400).send({ error: 'Chọn Loại thêm' });
        if (b.factory_price === undefined || b.factory_price === '') return reply.code(400).send({ error: 'Nhập Giá May Nhà' });
        if (b.processing_price === undefined || b.processing_price === '') return reply.code(400).send({ error: 'Nhập Giá May Gia Công' });

        // Allowed roles
        let allowedRoles = b.allowed_roles || [];
        if (typeof allowedRoles === 'string') { try { allowedRoles = JSON.parse(allowedRoles); } catch(e) { allowedRoles = []; } }
        if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return reply.code(400).send({ error: 'Chọn Phân Quyền' });

        // Check duplicate name
        const existing = await db.get('SELECT id FROM bgm_items WHERE name = $1 AND is_active = true', [b.name.trim()]);
        if (existing) return reply.code(409).send({ error: `Tên "${b.name.trim()}" đã tồn tại` });

        const mx = await db.get('SELECT COALESCE(MAX(display_order),0) as mx FROM bgm_items');
        const result = await db.get(`
            INSERT INTO bgm_items (name, group_name, allowed_roles, add_type, factory_price, processing_price, display_order, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
        `, [
            b.name.trim(),
            b.group_name.trim(),
            JSON.stringify(allowedRoles),
            b.add_type,
            Number(b.factory_price) || 0,
            Number(b.processing_price) || 0,
            (mx?.mx || 0) + 1,
            request.user.id
        ]);

        // Log history
        await db.run(`INSERT INTO bgm_history (item_id, action, changed_fields, changed_by) VALUES ($1, 'CREATE', $2, $3)`,
            [result.id, JSON.stringify({ name: b.name.trim() }), request.user.id]);

        return { success: true, item: result };
    });

    // ========== UPDATE item ==========
    fastify.put('/api/bgm/items/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const id = Number(request.params.id);
        const b = request.body || {};

        const old = await db.get('SELECT * FROM bgm_items WHERE id = $1', [id]);
        if (!old) return reply.code(404).send({ error: 'Không tìm thấy' });

        // Validate if provided
        if (b.name !== undefined && (!b.name || !b.name.trim())) return reply.code(400).send({ error: 'Nhập Tên chi tiết' });
        if (b.group_name !== undefined && (!b.group_name || !b.group_name.trim())) return reply.code(400).send({ error: 'Nhập Nhóm' });
        if (b.add_type !== undefined && !['once','multi'].includes(b.add_type)) return reply.code(400).send({ error: 'Loại thêm không hợp lệ' });

        if (b.allowed_roles !== undefined) {
            let ar = b.allowed_roles;
            if (typeof ar === 'string') { try { ar = JSON.parse(ar); } catch(e) { ar = []; } }
            if (!Array.isArray(ar) || ar.length === 0) return reply.code(400).send({ error: 'Chọn Phân Quyền' });
            b.allowed_roles = ar;
        }

        const allowed = ['name', 'group_name', 'allowed_roles', 'add_type', 'factory_price', 'processing_price'];
        const sets = [];
        const params = [];
        const changes = {};
        let idx = 1;

        for (const key of allowed) {
            if (b[key] !== undefined) {
                const numericFields = ['factory_price', 'processing_price'];
                const jsonFields = ['allowed_roles'];

                if (jsonFields.includes(key)) {
                    sets.push(`${key} = $${idx++}`);
                    params.push(JSON.stringify(b[key]));
                    changes[key] = { old: old[key], new: b[key] };
                } else if (numericFields.includes(key)) {
                    sets.push(`${key} = $${idx++}`);
                    params.push(Number(b[key]) || 0);
                    changes[key] = { old: old[key], new: Number(b[key]) };
                } else {
                    sets.push(`${key} = $${idx++}`);
                    params.push(typeof b[key] === 'string' ? b[key].trim() : b[key]);
                    changes[key] = { old: old[key], new: b[key] };
                }
            }
        }

        if (sets.length === 0) return reply.code(400).send({ error: 'Không có dữ liệu cập nhật' });

        sets.push(`updated_at = NOW()`);
        params.push(id);

        await db.run(`UPDATE bgm_items SET ${sets.join(', ')} WHERE id = $${idx}`, params);

        // Log history
        await db.run(`INSERT INTO bgm_history (item_id, action, changed_fields, changed_by) VALUES ($1, 'UPDATE', $2, $3)`,
            [id, JSON.stringify(changes), request.user.id]);

        return { success: true };
    });

    // ========== DELETE item (soft) ==========
    fastify.delete('/api/bgm/items/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const id = Number(request.params.id);
        await db.run('UPDATE bgm_items SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
        await db.run(`INSERT INTO bgm_history (item_id, action, changed_fields, changed_by) VALUES ($1, 'DELETE', '{}', $2)`,
            [id, request.user.id]);
        return { success: true };
    });

    // ========== GET history for an item ==========
    fastify.get('/api/bgm/items/:id/history', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const rows = await db.all(`
            SELECT h.*, u.full_name AS changed_by_name
            FROM bgm_history h
            LEFT JOIN users u ON h.changed_by = u.id
            WHERE h.item_id = $1
            ORDER BY h.changed_at DESC
            LIMIT 50
        `, [id]);
        return { history: rows };
    });

    // ========== DROPDOWN for TSAM picker (role-filtered) ==========
    fastify.get('/api/bgm/dropdown', { preHandler: [authenticate] }, async (request, reply) => {
        const userRole = request.user.role;
        const rows = await db.all(`
            SELECT id, name, group_name, add_type, factory_price, processing_price, allowed_roles
            FROM bgm_items
            WHERE is_active = true
            ORDER BY group_name ASC, display_order ASC, name ASC
        `);

        // Filter by user role
        const filtered = rows.filter(r => {
            let roles = r.allowed_roles;
            if (typeof roles === 'string') { try { roles = JSON.parse(roles); } catch(e) { roles = []; } }
            return Array.isArray(roles) && (roles.includes(userRole) || roles.includes('all'));
        });

        return { items: filtered };
    });
};
