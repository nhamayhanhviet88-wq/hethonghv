const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function customerPoliciesRoutes(fastify, options) {

    // Auto-create fields table & add image_url column
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS customer_policy_fields (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL UNIQUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`ALTER TABLE customer_policies ADD COLUMN IF NOT EXISTS image_url TEXT`);
    } catch(e) { /* already exists */ }

    function isTrinhUser(user) {
        if (!user) return false;
        const uname = String(user.username || '').toLowerCase().trim();
        const name = String(user.full_name || '').toLowerCase().trim();
        return uname === 'trinh' || uname === 'leviettrinh' || uname === 'trinh.lvt' || name.includes('lê việt trinh') || name.includes('le viet trinh');
    }

    function canEdit(user) {
        if (!user) return false;
        if (['giam_doc', 'admin'].includes(user.role)) return true;
        if (user.role === 'quan_ly_cap_cao' && isTrinhUser(user)) return true;
        return false;
    }

    function isDirector(user) {
        return canEdit(user);
    }

    // GET /api/customer-policies — List all policies
    fastify.get('/api/customer-policies', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { type, field, search, active_only } = request.query;
            let where = 'WHERE 1=1';
            const params = [];
            let idx = 1;

            if (type && type !== 'all') {
                where += ` AND cp.policy_type = $${idx++}`;
                params.push(type);
            }
            if (field && field !== 'all') {
                where += ` AND cp.field_name = $${idx++}`;
                params.push(field);
            }
            if (search) {
                where += ` AND (cp.title ILIKE $${idx++} OR cp.content ILIKE $${idx++})`;
                const s = `%${search}%`;
                params.push(s, s);
            }
            if (active_only === 'true') {
                where += ` AND cp.is_active = true`;
            }

            const policies = await db.all(`
                SELECT cp.*, u.full_name AS creator_name,
                    (SELECT COUNT(*) FROM customer_policy_tiers t WHERE t.policy_id = cp.id) AS tier_count
                FROM customer_policies cp
                LEFT JOIN users u ON u.id = cp.created_by
                ${where}
                ORDER BY cp.display_order ASC, cp.created_at DESC
            `, params);

            return { success: true, policies: policies || [] };
        } catch (e) {
            console.error('[customer-policies GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/customer-policies/fields — List all field names from dedicated table
    fastify.get('/api/customer-policies/fields', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const fields = await db.all(`SELECT id, name FROM customer_policy_fields ORDER BY name ASC`);
            return { success: true, fields: fields || [] };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/customer-policies/fields — Create new field (Director only)
    fastify.post('/api/customer-policies/fields', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isDirector(request.user)) return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền tạo lĩnh vực' });
        try {
            const { name } = request.body;
            if (!name || !name.trim()) return reply.code(400).send({ error: 'Vui lòng nhập tên lĩnh vực' });
            const exists = await db.get(`SELECT id FROM customer_policy_fields WHERE LOWER(name) = LOWER($1)`, [name.trim()]);
            if (exists) return reply.code(400).send({ error: 'Lĩnh vực này đã tồn tại' });
            const result = await db.run(`INSERT INTO customer_policy_fields (name) VALUES ($1) RETURNING id`, [name.trim()]);
            return { success: true, id: result.id, name: name.trim() };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/customer-policies/fields/:id — Update field (Director only)
    fastify.put('/api/customer-policies/fields/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isDirector(request.user)) return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền sửa lĩnh vực' });
        try {
            const { name } = request.body;
            const fieldId = request.params.id;
            if (!name || !name.trim()) return reply.code(400).send({ error: 'Vui lòng nhập tên lĩnh vực' });
            
            const oldField = await db.get(`SELECT name FROM customer_policy_fields WHERE id = $1`, [fieldId]);
            if (!oldField) return reply.code(404).send({ error: 'Không tìm thấy lĩnh vực' });
            
            const exists = await db.get(`SELECT id FROM customer_policy_fields WHERE LOWER(name) = LOWER($1) AND id != $2`, [name.trim(), fieldId]);
            if (exists) return reply.code(400).send({ error: 'Lĩnh vực này đã tồn tại' });
            
            await db.run(`UPDATE customer_policy_fields SET name = $1 WHERE id = $2`, [name.trim(), fieldId]);
            await db.run(`UPDATE customer_policies SET field_name = $1 WHERE field_name = $2`, [name.trim(), oldField.name]);
            
            return { success: true, id: fieldId, name: name.trim() };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/customer-policies/fields/:id — Delete field (Director only)
    fastify.delete('/api/customer-policies/fields/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isDirector(request.user)) return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa lĩnh vực' });
        try {
            await db.run(`DELETE FROM customer_policy_fields WHERE id = $1`, [request.params.id]);
            return { success: true };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/customer-policies/:id — Get single policy with tiers
    fastify.get('/api/customer-policies/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const policy = await db.get(`
                SELECT cp.*, u.full_name AS creator_name
                FROM customer_policies cp
                LEFT JOIN users u ON u.id = cp.created_by
                WHERE cp.id = $1
            `, [request.params.id]);

            if (!policy) return reply.code(404).send({ error: 'Không tìm thấy chính sách' });

            const tiers = await db.all(`
                SELECT * FROM customer_policy_tiers
                WHERE policy_id = $1
                ORDER BY tier_order ASC
            `, [policy.id]);

            policy.tiers = tiers || [];
            return { success: true, policy };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/customer-policies — Create new policy
    fastify.post('/api/customer-policies', { preHandler: [authenticate] }, async (request, reply) => {
        if (!canEdit(request.user)) return reply.code(403).send({ error: 'Không có quyền tạo chính sách' });

        try {
            const { title, policy_type, field_name, content, image_url, valid_from, valid_to, is_active, display_order, tiers } = request.body;
            if (!title) return reply.code(400).send({ error: 'Vui lòng nhập tên chính sách' });
            if (valid_from && valid_to && valid_to < valid_from) {
                return reply.code(400).send({ error: '📅 Đến Ngày phải lớn hơn hoặc bằng ngày 📅 Áp Dụng Từ!' });
            }

            const result = await db.run(`
                INSERT INTO customer_policies (title, policy_type, field_name, content, image_url, valid_from, valid_to, is_active, display_order, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            `, [
                title,
                policy_type || 'khach_hang',
                field_name || '',
                content || '',
                image_url || '',
                valid_from || null,
                valid_to || null,
                is_active !== false,
                display_order || 0,
                request.user.id
            ]);

            const policyId = result.id;

            // Insert tiers
            if (tiers && Array.isArray(tiers) && tiers.length > 0) {
                for (let i = 0; i < tiers.length; i++) {
                    const t = tiers[i];
                    await db.run(`
                        INSERT INTO customer_policy_tiers (policy_id, tier_order, condition_label, min_quantity, max_quantity, min_value, max_value, benefit_text)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        policyId,
                        t.tier_order || (i + 1),
                        t.condition_label || '',
                        t.min_quantity || null,
                        t.max_quantity || null,
                        t.min_value || null,
                        t.max_value || null,
                        t.benefit_text || ''
                    ]);
                }
            }

            return { success: true, id: policyId };
        } catch (e) {
            console.error('[customer-policies POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/customer-policies/:id — Update policy
    fastify.put('/api/customer-policies/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!canEdit(request.user)) return reply.code(403).send({ error: 'Không có quyền sửa chính sách' });

        try {
            const { title, policy_type, field_name, content, image_url, valid_from, valid_to, is_active, display_order, tiers } = request.body;
            const id = request.params.id;

            if (valid_from && valid_to && valid_to < valid_from) {
                return reply.code(400).send({ error: '📅 Đến Ngày phải lớn hơn hoặc bằng ngày 📅 Áp Dụng Từ!' });
            }

            await db.run(`
                UPDATE customer_policies
                SET title = $1, policy_type = $2, field_name = $3, content = $4, image_url = $5,
                    valid_from = $6, valid_to = $7, is_active = $8, display_order = $9, updated_at = NOW()
                WHERE id = $10
            `, [
                title, policy_type || 'khach_hang', field_name || '', content || '', image_url || '',
                valid_from || null, valid_to || null, is_active !== false, display_order || 0, id
            ]);

            // Replace tiers
            await db.run(`DELETE FROM customer_policy_tiers WHERE policy_id = $1`, [id]);
            if (tiers && Array.isArray(tiers) && tiers.length > 0) {
                for (let i = 0; i < tiers.length; i++) {
                    const t = tiers[i];
                    await db.run(`
                        INSERT INTO customer_policy_tiers (policy_id, tier_order, condition_label, min_quantity, max_quantity, min_value, max_value, benefit_text)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        id,
                        t.tier_order || (i + 1),
                        t.condition_label || '',
                        t.min_quantity || null,
                        t.max_quantity || null,
                        t.min_value || null,
                        t.max_value || null,
                        t.benefit_text || ''
                    ]);
                }
            }

            return { success: true };
        } catch (e) {
            console.error('[customer-policies PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/customer-policies/:id — Delete policy
    fastify.delete('/api/customer-policies/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!canEdit(request.user)) return reply.code(403).send({ error: 'Không có quyền xóa chính sách' });

        try {
            await db.run(`DELETE FROM customer_policy_tiers WHERE policy_id = $1`, [request.params.id]);
            await db.run(`DELETE FROM customer_policies WHERE id = $1`, [request.params.id]);
            return { success: true };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // PATCH /api/customer-policies/:id/toggle-active — Toggle active/pause status
    fastify.patch('/api/customer-policies/:id/toggle-active', { preHandler: [authenticate] }, async (request, reply) => {
        if (!canEdit(request.user)) return reply.code(403).send({ error: 'Không có quyền thay đổi trạng thái chính sách' });

        try {
            const id = request.params.id;
            await db.run(`
                UPDATE customer_policies
                SET is_active = NOT is_active, updated_at = NOW()
                WHERE id = $1
            `, [id]);
            const p = await db.get(`SELECT is_active FROM customer_policies WHERE id = $1`, [id]);
            return { success: true, is_active: p ? p.is_active : false };
        } catch (e) {
            console.error('[customer-policies PATCH toggle-active]', e);
            return reply.code(500).send({ error: e.message });
        }
    });
}

module.exports = customerPoliciesRoutes;
