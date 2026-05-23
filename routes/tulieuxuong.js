// ========== TƯ LIỆU XƯỞNG & VP — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

function isGD(req) { return req.user && req.user.role === 'giam_doc'; }

module.exports = async function(fastify) {
    // ========== MIGRATION ==========
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS tlxvp_boards (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            columns JSONB DEFAULT '[]',
            display_order INTEGER DEFAULT 0,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS tlxvp_sources (
            id SERIAL PRIMARY KEY,
            board_id INTEGER NOT NULL REFERENCES tlxvp_boards(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS tlxvp_items (
            id SERIAL PRIMARY KEY,
            board_id INTEGER NOT NULL REFERENCES tlxvp_boards(id) ON DELETE CASCADE,
            source_id INTEGER NOT NULL REFERENCES tlxvp_sources(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            data JSONB DEFAULT '{}',
            display_order INTEGER DEFAULT 0,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
    } catch(e) { console.error('[TLXVP Migration]', e.message); }

    // ===== GET boards + sources + counts =====
    fastify.get('/api/tlxvp/boards', { preHandler: [authenticate] }, async (req) => {
        const boards = await db.all(`
            SELECT b.*, 
                (SELECT COUNT(*)::int FROM tlxvp_items WHERE board_id = b.id) AS item_count
            FROM tlxvp_boards b ORDER BY b.display_order, b.id
        `);
        for (const b of boards) {
            b.columns = typeof b.columns === 'string' ? JSON.parse(b.columns) : (b.columns || []);
            b.sources = await db.all(`
                SELECT s.*, (SELECT COUNT(*)::int FROM tlxvp_items WHERE source_id = s.id) AS item_count
                FROM tlxvp_sources s WHERE s.board_id = $1 ORDER BY s.display_order, s.id
            `, [b.id]);
        }
        return { boards };
    });

    // ===== CREATE board (GĐ only) =====
    fastify.post('/api/tlxvp/boards', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { name, columns } = req.body;
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Tên bảng bắt buộc' });
        const maxOrder = await db.get(`SELECT COALESCE(MAX(display_order),0)+1 AS next FROM tlxvp_boards`);
        const row = await db.get(`INSERT INTO tlxvp_boards (name, columns, display_order, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
            [name.trim(), JSON.stringify(columns || []), maxOrder.next, req.user.id]);
        return { success: true, id: row.id };
    });

    // ===== UPDATE board (GĐ only) =====
    fastify.patch('/api/tlxvp/boards/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { name, columns } = req.body;
        const sets = []; const params = []; let idx = 1;
        if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name.trim()); }
        if (columns !== undefined) { sets.push(`columns = $${idx++}`); params.push(JSON.stringify(columns)); }
        if (sets.length === 0) return reply.code(400).send({ error: 'Không có dữ liệu' });
        sets.push(`updated_at = NOW()`);
        params.push(req.params.id);
        await db.run(`UPDATE tlxvp_boards SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        return { success: true };
    });

    // ===== DELETE board (GĐ only) =====
    fastify.delete('/api/tlxvp/boards/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        await db.run(`DELETE FROM tlxvp_boards WHERE id = $1`, [req.params.id]);
        return { success: true };
    });

    // ===== CREATE source (GĐ only) =====
    fastify.post('/api/tlxvp/sources', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { board_id, name } = req.body;
        if (!board_id || !name || !name.trim()) return reply.code(400).send({ error: 'Thiếu thông tin' });
        const maxOrder = await db.get(`SELECT COALESCE(MAX(display_order),0)+1 AS next FROM tlxvp_sources WHERE board_id=$1`, [board_id]);
        const row = await db.get(`INSERT INTO tlxvp_sources (board_id, name, display_order) VALUES ($1, $2, $3) RETURNING id`,
            [board_id, name.trim(), maxOrder.next]);
        return { success: true, id: row.id };
    });

    // ===== DELETE source (GĐ only) =====
    fastify.delete('/api/tlxvp/sources/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        await db.run(`DELETE FROM tlxvp_sources WHERE id = $1`, [req.params.id]);
        return { success: true };
    });

    // ===== RENAME source (GĐ only) =====
    fastify.patch('/api/tlxvp/sources/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { name } = req.body;
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Tên bắt buộc' });
        await db.run(`UPDATE tlxvp_sources SET name = $1 WHERE id = $2`, [name.trim(), req.params.id]);
        return { success: true };
    });

    // ===== GET items =====
    fastify.get('/api/tlxvp/items', { preHandler: [authenticate] }, async (req) => {
        const { board_id, source_id } = req.query;
        let where = 'WHERE 1=1'; const params = []; let idx = 1;
        if (board_id) { where += ` AND i.board_id = $${idx++}`; params.push(Number(board_id)); }
        if (source_id) { where += ` AND i.source_id = $${idx++}`; params.push(Number(source_id)); }
        const items = await db.all(`
            SELECT i.*, s.name AS source_name FROM tlxvp_items i
            LEFT JOIN tlxvp_sources s ON i.source_id = s.id
            ${where} ORDER BY s.display_order, s.id, i.display_order, i.id
        `, params);
        items.forEach(function(it) { it.data = typeof it.data === 'string' ? JSON.parse(it.data) : (it.data || {}); });
        return { items };
    });

    // ===== CREATE item (GĐ only) =====
    fastify.post('/api/tlxvp/items', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { board_id, source_id, name, data } = req.body;
        if (!board_id || !source_id || !name || !name.trim()) return reply.code(400).send({ error: 'Thiếu thông tin' });
        const maxOrder = await db.get(`SELECT COALESCE(MAX(display_order),0)+1 AS next FROM tlxvp_items WHERE source_id=$1`, [source_id]);
        const row = await db.get(`INSERT INTO tlxvp_items (board_id, source_id, name, data, display_order, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
            [board_id, source_id, name.trim(), JSON.stringify(data || {}), maxOrder.next, req.user.id]);
        return { success: true, id: row.id };
    });

    // ===== UPDATE item (GĐ only) =====
    fastify.patch('/api/tlxvp/items/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { name, data } = req.body;
        const sets = []; const params = []; let idx = 1;
        if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name.trim()); }
        if (data !== undefined) { sets.push(`data = $${idx++}`); params.push(JSON.stringify(data)); }
        if (sets.length === 0) return reply.code(400).send({ error: 'Không có dữ liệu' });
        sets.push(`updated_at = NOW()`);
        params.push(req.params.id);
        await db.run(`UPDATE tlxvp_items SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        return { success: true };
    });

    // ===== DELETE item (GĐ only) =====
    fastify.delete('/api/tlxvp/items/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        await db.run(`DELETE FROM tlxvp_items WHERE id = $1`, [req.params.id]);
        return { success: true };
    });
};
