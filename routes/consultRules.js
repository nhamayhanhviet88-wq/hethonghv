const db = require('../db/pool');

module.exports = async function (fastify) {
    // GET all consult types
    fastify.get('/api/consult-types', async (req, reply) => {
        const rows = await db.all(
            `SELECT * FROM consult_type_configs ORDER BY sort_order`
        );
        return { types: rows };
    });

    // PATCH batch update sort_order (drag & drop)
    fastify.patch('/api/consult-types/batch/sort-order', async (req, reply) => {
        if (req.session.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { orders } = req.body; // Array of { key, sort_order }
        if (!Array.isArray(orders)) return reply.code(400).send({ error: 'orders must be array' });
        for (const o of orders) {
            await db.run(`UPDATE consult_type_configs SET sort_order=$1 WHERE key=$2`, [o.sort_order, o.key]);
        }
        return { success: true };
    });


    // PUT update a consult type (GĐ only)
    fastify.put('/api/consult-types/:key', async (req, reply) => {
        if (req.session.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key } = req.params;
        const { label, icon, color, text_color, is_active } = req.body;
        await db.run(
            `UPDATE consult_type_configs SET label=$1, icon=$2, color=$3, text_color=$4, is_active=$5, updated_at=NOW() WHERE key=$6`,
            [label, icon, color, text_color || 'white', is_active !== false, key]
        );
        return { success: true };
    });

    // POST create new consult type (GĐ only)
    fastify.post('/api/consult-types', async (req, reply) => {
        if (req.session.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key, label, icon, color, text_color } = req.body;
        if (!key || !label) return reply.code(400).send({ error: 'Key and label required' });
        // Get max sort_order
        const max = await db.get(`SELECT COALESCE(MAX(sort_order),0)+1 as next FROM consult_type_configs`);
        await db.run(
            `INSERT INTO consult_type_configs (key, label, icon, color, text_color, sort_order) VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (key) DO NOTHING`,
            [key, label, icon || '📋', color || '#6b7280', text_color || 'white', max.next]
        );
        return { success: true };
    });

    // GET all flow rules (grouped by from_status)
    fastify.get('/api/consult-flow-rules', async (req, reply) => {
        const rows = await db.all(
            `SELECT cfr.*, ctc.label as to_label, ctc.icon as to_icon, ctc.color as to_color
             FROM consult_flow_rules cfr
             LEFT JOIN consult_type_configs ctc ON ctc.key = cfr.to_type_key
             ORDER BY cfr.from_status, cfr.sort_order`
        );
        // Group by from_status
        const grouped = {};
        for (const r of rows) {
            if (!grouped[r.from_status]) grouped[r.from_status] = [];
            grouped[r.from_status].push(r);
        }
        return { rules: grouped, all: rows };
    });

    // PUT update flow rules for a specific from_status (GĐ only)
    fastify.put('/api/consult-flow-rules/:fromStatus', async (req, reply) => {
        if (req.session.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { fromStatus } = req.params;
        const { rules } = req.body; // Array of { to_type_key, delay_days, is_default, sort_order }
        if (!Array.isArray(rules)) return reply.code(400).send({ error: 'rules must be array' });

        // Delete existing rules for this from_status
        await db.run(`DELETE FROM consult_flow_rules WHERE from_status = $1`, [fromStatus]);

        // Insert new rules
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
    fastify.delete('/api/consult-flow-rules/:fromStatus', async (req, reply) => {
        if (req.session.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        await db.run(`DELETE FROM consult_flow_rules WHERE from_status = $1`, [req.params.fromStatus]);
        return { success: true };
    });
};
