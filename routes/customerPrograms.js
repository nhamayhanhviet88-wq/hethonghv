const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function customerProgramsRoutes(fastify, options) {

    // Auto-create program tables & fields table
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS customer_program_fields (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL UNIQUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS customer_programs (
            id              SERIAL PRIMARY KEY,
            title           VARCHAR(500) NOT NULL,
            program_type     VARCHAR(50) NOT NULL DEFAULT 'khach_hang',
            field_name      VARCHAR(200) DEFAULT '',
            content         TEXT DEFAULT '',
            image_url       TEXT DEFAULT '',
            valid_from      DATE,
            valid_to        DATE,
            valid_type      VARCHAR(50) DEFAULT 'date_range',
            valid_days      INT,
            include_customer_name BOOLEAN DEFAULT false,
            is_active       BOOLEAN DEFAULT true,
            display_order   INT DEFAULT 0,
            created_by      INTEGER REFERENCES users(id),
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`ALTER TABLE customer_programs ADD COLUMN IF NOT EXISTS valid_type VARCHAR(50) DEFAULT 'date_range'`);
        await db.exec(`ALTER TABLE customer_programs ADD COLUMN IF NOT EXISTS valid_days INT`);
        await db.exec(`ALTER TABLE customer_programs ADD COLUMN IF NOT EXISTS include_customer_name BOOLEAN DEFAULT false`);
        await db.exec(`ALTER TABLE customer_programs ADD COLUMN IF NOT EXISTS theme_color VARCHAR(50) DEFAULT 'gold'`);
        await db.exec(`CREATE TABLE IF NOT EXISTS customer_program_tiers (
            id              SERIAL PRIMARY KEY,
            program_id      INTEGER NOT NULL REFERENCES customer_programs(id) ON DELETE CASCADE,
            tier_order      INT DEFAULT 1,
            condition_label VARCHAR(300) DEFAULT '',
            min_quantity    INT,
            max_quantity    INT,
            min_value       NUMERIC,
            max_value       NUMERIC,
            benefit_text    TEXT DEFAULT ''
        )`);
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

    // GET /api/customer-programs — List all programs
    fastify.get('/api/customer-programs', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { type, field, search, active_only } = request.query;
            let where = 'WHERE 1=1';
            const params = [];
            let idx = 1;

            if (type && type !== 'all') {
                where += ` AND cp.program_type = $${idx++}`;
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

            const programs = await db.all(`
                SELECT cp.*, u.full_name AS creator_name,
                    (SELECT COUNT(*) FROM customer_program_tiers t WHERE t.program_id = cp.id) AS tier_count
                FROM customer_programs cp
                LEFT JOIN users u ON u.id = cp.created_by
                ${where}
                ORDER BY cp.display_order ASC, cp.created_at DESC
            `, params);

            return { success: true, programs: programs || [] };
        } catch (e) {
            console.error('[customer-programs GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/customer-programs/fields — List fields
    fastify.get('/api/customer-programs/fields', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const fields = await db.all(`SELECT id, name FROM customer_program_fields ORDER BY name ASC`);
            return { success: true, fields: fields || [] };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/customer-programs/fields — Create field (Director/Admin/Trinh)
    fastify.post('/api/customer-programs/fields', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isDirector(request.user)) return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền tạo lĩnh vực' });
        try {
            const { name } = request.body;
            if (!name || !name.trim()) return reply.code(400).send({ error: 'Vui lòng nhập tên lĩnh vực' });
            const exists = await db.get(`SELECT id FROM customer_program_fields WHERE LOWER(name) = LOWER($1)`, [name.trim()]);
            if (exists) return reply.code(400).send({ error: 'Lĩnh vực này đã tồn tại' });
            const result = await db.run(`INSERT INTO customer_program_fields (name) VALUES ($1) RETURNING id`, [name.trim()]);
            return { success: true, id: result.id, name: name.trim() };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/customer-programs/fields/:id — Update field (Director only)
    fastify.put('/api/customer-programs/fields/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isDirector(request.user)) return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền sửa lĩnh vực' });
        try {
            const { name } = request.body;
            const fieldId = request.params.id;
            if (!name || !name.trim()) return reply.code(400).send({ error: 'Vui lòng nhập tên lĩnh vực' });
            
            const oldField = await db.get(`SELECT name FROM customer_program_fields WHERE id = $1`, [fieldId]);
            if (!oldField) return reply.code(404).send({ error: 'Không tìm thấy lĩnh vực' });
            
            const exists = await db.get(`SELECT id FROM customer_program_fields WHERE LOWER(name) = LOWER($1) AND id != $2`, [name.trim(), fieldId]);
            if (exists) return reply.code(400).send({ error: 'Lĩnh vực này đã tồn tại' });
            
            await db.run(`UPDATE customer_program_fields SET name = $1 WHERE id = $2`, [name.trim(), fieldId]);
            await db.run(`UPDATE customer_programs SET field_name = $1 WHERE field_name = $2`, [name.trim(), oldField.name]);
            
            return { success: true, id: fieldId, name: name.trim() };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/customer-programs/fields/:id — Delete field
    fastify.delete('/api/customer-programs/fields/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isDirector(request.user)) return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa lĩnh vực' });
        try {
            await db.run(`DELETE FROM customer_program_fields WHERE id = $1`, [request.params.id]);
            return { success: true };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/customer-programs/:id — Get single program
    fastify.get('/api/customer-programs/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const program = await db.get(`
                SELECT cp.*, u.full_name AS creator_name
                FROM customer_programs cp
                LEFT JOIN users u ON u.id = cp.created_by
                WHERE cp.id = $1
            `, [request.params.id]);

            if (!program) return reply.code(404).send({ error: 'Không tìm thấy chương trình' });

            const tiers = await db.all(`
                SELECT * FROM customer_program_tiers
                WHERE program_id = $1
                ORDER BY tier_order ASC
            `, [program.id]);

            program.tiers = tiers || [];
            return { success: true, program };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/customer-programs — Create program
    fastify.post('/api/customer-programs', { preHandler: [authenticate] }, async (request, reply) => {
        if (!canEdit(request.user)) return reply.code(403).send({ error: 'Không có quyền tạo chương trình' });

        try {
            let { title, program_type, field_name, content, image_url, valid_type, valid_days, valid_from, valid_to, include_customer_name, theme_color, is_active, display_order, tiers } = request.body;
            if (!title) return reply.code(400).send({ error: 'Vui lòng nhập tên chương trình' });

            valid_type = valid_type || 'date_range';
            let vDays = (valid_days !== undefined && valid_days !== null && valid_days !== '') ? parseInt(valid_days, 10) : null;
            if (isNaN(vDays)) vDays = null;
            let themeColor = (theme_color === 'red') ? 'red' : 'gold';

            let finalFrom = valid_from || null;
            let finalTo = valid_to || null;

            if (valid_type === 'days_from_sent' || valid_type === 'auto_days') {
                finalFrom = null;
                finalTo = null;
            } else {
                if (finalFrom && finalTo && finalTo < finalFrom) {
                    return reply.code(400).send({ error: '📅 Đến Ngày phải lớn hơn hoặc bằng ngày 📅 Áp Dụng Từ!' });
                }
            }

            const result = await db.run(`
                INSERT INTO customer_programs (title, program_type, field_name, content, image_url, valid_from, valid_to, valid_type, valid_days, include_customer_name, theme_color, is_active, display_order, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING id
            `, [
                title,
                program_type || 'khach_hang',
                field_name || '',
                content || '',
                image_url || '',
                finalFrom,
                finalTo,
                valid_type,
                vDays,
                include_customer_name === true,
                themeColor,
                is_active !== false,
                display_order || 0,
                request.user.id
            ]);

            const programId = result.id;

            if (tiers && Array.isArray(tiers) && tiers.length > 0) {
                for (let i = 0; i < tiers.length; i++) {
                    const t = tiers[i];
                    await db.run(`
                        INSERT INTO customer_program_tiers (program_id, tier_order, condition_label, min_quantity, max_quantity, min_value, max_value, benefit_text)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        programId,
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

            return { success: true, id: programId };
        } catch (e) {
            console.error('[customer-programs POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/customer-programs/:id — Update program
    fastify.put('/api/customer-programs/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!canEdit(request.user)) return reply.code(403).send({ error: 'Không có quyền sửa chương trình' });

        try {
            let { title, program_type, field_name, content, image_url, valid_type, valid_days, valid_from, valid_to, include_customer_name, theme_color, is_active, display_order, tiers } = request.body;
            const id = request.params.id;
            if (!title) return reply.code(400).send({ error: 'Vui lòng nhập tên chương trình' });

            valid_type = valid_type || 'date_range';
            let vDays = (valid_days !== undefined && valid_days !== null && valid_days !== '') ? parseInt(valid_days, 10) : null;
            if (isNaN(vDays)) vDays = null;
            let themeColor = (theme_color === 'red') ? 'red' : 'gold';

            let finalFrom = valid_from || null;
            let finalTo = valid_to || null;

            if (valid_type === 'days_from_sent' || valid_type === 'auto_days') {
                finalFrom = null;
                finalTo = null;
            } else {
                if (finalFrom && finalTo && finalTo < finalFrom) {
                    return reply.code(400).send({ error: '📅 Đến Ngày phải lớn hơn hoặc bằng ngày 📅 Áp Dụng Từ!' });
                }
            }

            await db.run(`
                UPDATE customer_programs
                SET title = $1, program_type = $2, field_name = $3, content = $4, image_url = $5,
                    valid_from = $6, valid_to = $7, valid_type = $8, valid_days = $9, include_customer_name = $10, theme_color = $11, is_active = $12, display_order = $13, updated_at = NOW()
                WHERE id = $14
            `, [
                title, program_type || 'khach_hang', field_name || '', content || '', image_url || '',
                finalFrom, finalTo, valid_type, vDays, include_customer_name === true, themeColor, is_active !== false, display_order || 0, id
            ]);

            await db.run(`DELETE FROM customer_program_tiers WHERE program_id = $1`, [id]);
            if (tiers && Array.isArray(tiers) && tiers.length > 0) {
                for (let i = 0; i < tiers.length; i++) {
                    const t = tiers[i];
                    await db.run(`
                        INSERT INTO customer_program_tiers (program_id, tier_order, condition_label, min_quantity, max_quantity, min_value, max_value, benefit_text)
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
            console.error('[customer-programs PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/customer-programs/:id — Delete program
    fastify.delete('/api/customer-programs/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!canEdit(request.user)) return reply.code(403).send({ error: 'Không có quyền xóa chương trình' });

        try {
            await db.run(`DELETE FROM customer_program_tiers WHERE program_id = $1`, [request.params.id]);
            await db.run(`DELETE FROM customer_programs WHERE id = $1`, [request.params.id]);
            return { success: true };
        } catch (e) {
            return reply.code(500).send({ error: e.message });
        }
    });

    // PATCH /api/customer-programs/:id/toggle-active — Toggle active
    fastify.patch('/api/customer-programs/:id/toggle-active', { preHandler: [authenticate] }, async (request, reply) => {
        if (!canEdit(request.user)) return reply.code(403).send({ error: 'Không có quyền thay đổi trạng thái chương trình' });

        try {
            const id = request.params.id;
            await db.run(`
                UPDATE customer_programs
                SET is_active = NOT is_active, updated_at = NOW()
                WHERE id = $1
            `, [id]);
            const p = await db.get(`SELECT is_active FROM customer_programs WHERE id = $1`, [id]);
            return { success: true, is_active: p ? p.is_active : false };
        } catch (e) {
            console.error('[customer-programs PATCH toggle-active]', e);
            return reply.code(500).send({ error: e.message });
        }
    });
}

module.exports = customerProgramsRoutes;
