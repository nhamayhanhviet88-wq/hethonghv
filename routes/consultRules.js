const db = require('../db/pool');

module.exports = async function (fastify) {
    const { authenticate } = require('../middleware/auth');

    // GET all consult types (public - no auth needed)
    fastify.get('/api/consult-types', async (req, reply) => {
        const rows = await db.all(
            `SELECT * FROM consult_type_configs ORDER BY sort_order`
        );
        return { types: rows };
    });

    // PATCH batch update sort_order + stage (drag & drop)
    fastify.patch('/api/consult-types/batch/sort-order', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { orders } = req.body;
        if (!Array.isArray(orders)) return reply.code(400).send({ error: 'orders must be array' });
        for (const o of orders) {
            if (o.stage !== undefined) {
                await db.run(`UPDATE consult_type_configs SET sort_order=$1, stage=$2 WHERE key=$3`, [o.sort_order, o.stage, o.key]);
            } else {
                await db.run(`UPDATE consult_type_configs SET sort_order=$1 WHERE key=$2`, [o.sort_order, o.key]);
            }
        }
        return { success: true };
    });

    // PUT update a consult type (GĐ only)
    fastify.put('/api/consult-types/:key', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key } = req.params;
        const { label, icon, color, text_color, is_active, stage } = req.body;
        await db.run(
            `UPDATE consult_type_configs SET label=$1, icon=$2, color=$3, text_color=$4, is_active=$5, stage=$6, updated_at=NOW() WHERE key=$7`,
            [label, icon, color, text_color || 'white', is_active !== false, stage || null, key]
        );
        return { success: true };
    });

    // POST create new consult type (GĐ only)
    fastify.post('/api/consult-types', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key, label, icon, color, text_color, stage } = req.body;
        if (!key || !label) return reply.code(400).send({ error: 'Key and label required' });
        const max = await db.get(`SELECT COALESCE(MAX(sort_order),0)+1 as next FROM consult_type_configs`);
        await db.run(
            `INSERT INTO consult_type_configs (key, label, icon, color, text_color, sort_order, stage) VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (key) DO NOTHING`,
            [key, label, icon || '📋', color || '#6b7280', text_color || 'white', max.next, stage || null]
        );
        // ★ Auto-create self-referencing flow rule → tạo section "Khi ấn: [nút mới]"
        await db.run(
            `INSERT INTO consult_flow_rules (from_status, to_type_key, is_default, sort_order)
             VALUES ($1, $1, true, 1)
             ON CONFLICT (from_status, to_type_key) DO NOTHING`,
            [key]
        );
        return { success: true };
    });

    // DELETE a consult type (GĐ only)
    fastify.delete('/api/consult-types/:key', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key } = req.params;
        // Clean up flow rules referencing this key
        await db.run(`DELETE FROM consult_flow_rules WHERE to_type_key = $1`, [key]);
        await db.run(`DELETE FROM consult_flow_rules WHERE from_status = $1`, [key]);
        // Delete the type
        await db.run(`DELETE FROM consult_type_configs WHERE key = $1`, [key]);
        return { success: true };
    });

    // ========== CONSULT STAGES (giai đoạn) ==========
    // GET stages config (public)
    fastify.get('/api/consult-stages', async (req, reply) => {
        const row = await db.get(`SELECT value FROM app_config WHERE key='consult_stages'`);
        let stages = [];
        try { stages = JSON.parse(row?.value || '[]'); } catch(e) {}
        return { stages };
    });

    // PUT save stages config (GĐ only)
    fastify.put('/api/consult-stages', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { stages } = req.body;
        if (!Array.isArray(stages)) return reply.code(400).send({ error: 'stages must be array' });
        await db.run(
            `INSERT INTO app_config (key, value) VALUES ('consult_stages', $1) ON CONFLICT (key) DO UPDATE SET value=$1`,
            [JSON.stringify(stages)]
        );
        return { success: true };
    });

    // ========== FLOW RULES ==========
    // GET all flow rules (public)
    fastify.get('/api/consult-flow-rules', async (req, reply) => {
        const rows = await db.all(
            `SELECT cfr.*, ctc.label as to_label, ctc.icon as to_icon, ctc.color as to_color
             FROM consult_flow_rules cfr
             LEFT JOIN consult_type_configs ctc ON ctc.key = cfr.to_type_key
             ORDER BY cfr.from_status, cfr.sort_order`
        );
        const grouped = {};
        for (const r of rows) {
            if (!grouped[r.from_status]) grouped[r.from_status] = [];
            grouped[r.from_status].push(r);
        }
        return { rules: grouped, all: rows };
    });

    // PUT update flow rules for a specific from_status (GĐ only)
    fastify.put('/api/consult-flow-rules/:fromStatus', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { fromStatus } = req.params;
        const { rules } = req.body;
        if (!Array.isArray(rules)) return reply.code(400).send({ error: 'rules must be array' });

        await db.run(`DELETE FROM consult_flow_rules WHERE from_status = $1`, [fromStatus]);

        for (const r of rules) {
            await db.run(
                `INSERT INTO consult_flow_rules (from_status, to_type_key, delay_days, is_default, sort_order)
                 VALUES ($1, $2, $3, $4, $5)`,
                [fromStatus, r.to_type_key, r.delay_days || 0, r.is_default || false, r.sort_order || 0]
            );
        }
        return { success: true };
    });

    // DELETE a from_status group (GĐ only)
    fastify.delete('/api/consult-flow-rules/:fromStatus', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        await db.run(`DELETE FROM consult_flow_rules WHERE from_status = $1`, [req.params.fromStatus]);
        return { success: true };
    });

    // PATCH update section_order for a consult type (GĐ only)
    fastify.patch('/api/consult-types/:key/section-order', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key } = req.params;
        const { section_order } = req.body;
        if (!section_order || section_order < 1) return reply.code(400).send({ error: 'Invalid section_order' });

        // Shift existing sections at >= this position down by 1
        await db.run(
            `UPDATE consult_type_configs SET section_order = section_order + 1 WHERE section_order >= $1 AND section_order > 0 AND key != $2`,
            [section_order, key]
        );
        // Set the new order
        await db.run(
            `UPDATE consult_type_configs SET section_order = $1 WHERE key = $2`,
            [section_order, key]
        );
        return { success: true };
    });

    // GET sections info (types that have flow rules = have their own "Khi ấn:" section)
    fastify.get('/api/consult-sections', async (req, reply) => {
        const rows = await db.all(`
            SELECT DISTINCT ctc.key, ctc.label, ctc.icon, ctc.color, ctc.section_order,
                   (SELECT COUNT(*) FROM consult_flow_rules WHERE from_status = ctc.key) as rule_count
            FROM consult_type_configs ctc
            INNER JOIN consult_flow_rules cfr ON cfr.from_status = ctc.key
            WHERE ctc.section_order > 0
            ORDER BY ctc.section_order
        `);
        // Also return types WITHOUT a section (section_order = 0 or NULL)
        const unsectioned = await db.all(`
            SELECT ctc.key, ctc.label, ctc.icon, ctc.color
            FROM consult_type_configs ctc
            WHERE (ctc.section_order IS NULL OR ctc.section_order = 0)
            AND ctc.is_active = true
            ORDER BY ctc.sort_order
        `);
        return { sections: rows, unsectioned };
    });
};
