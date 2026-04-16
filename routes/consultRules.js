const db = require('../db/pool');

module.exports = async function (fastify) {
    const { authenticate } = require('../middleware/auth');

    // GET all consult types (public - no auth needed)
    fastify.get('/api/consult-types', async (req, reply) => {
        const crmMenu = req.query.crm_menu || 'nhu_cau';
        const rows = await db.all(
            `SELECT * FROM consult_type_configs WHERE crm_menu = $1 ORDER BY sort_order`, [crmMenu]
        );
        return { types: rows };
    });

    // PATCH batch update sort_order + stage (drag & drop)
    fastify.patch('/api/consult-types/batch/sort-order', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { orders } = req.body;
        const crmMenu = req.body.crm_menu || req.query.crm_menu || 'nhu_cau';
        if (!Array.isArray(orders)) return reply.code(400).send({ error: 'orders must be array' });
        for (const o of orders) {
            if (o.stage !== undefined) {
                await db.run(`UPDATE consult_type_configs SET sort_order=$1, stage=$2 WHERE key=$3 AND crm_menu=$4`, [o.sort_order, o.stage, o.key, crmMenu]);
            } else {
                await db.run(`UPDATE consult_type_configs SET sort_order=$1 WHERE key=$2 AND crm_menu=$3`, [o.sort_order, o.key, crmMenu]);
            }
        }
        return { success: true };
    });

    // PUT update a consult type (GĐ only)
    fastify.put('/api/consult-types/:key', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key } = req.params;
        const { label, icon, color, text_color, is_active, stage } = req.body;
        const crmMenu = req.body.crm_menu || req.query.crm_menu || 'nhu_cau';
        await db.run(
            `UPDATE consult_type_configs SET label=$1, icon=$2, color=$3, text_color=$4, is_active=$5, stage=$6, updated_at=NOW() WHERE key=$7 AND crm_menu=$8`,
            [label, icon, color, text_color || 'white', is_active !== false, stage || null, key, crmMenu]
        );
        return { success: true };
    });

    // POST create new consult type (GĐ only)
    fastify.post('/api/consult-types', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key, label, icon, color, text_color, stage, crm_menu } = req.body;
        const menu = crm_menu || 'nhu_cau';
        if (!key || !label) return reply.code(400).send({ error: 'Key and label required' });
        const max = await db.get(`SELECT COALESCE(MAX(sort_order),0)+1 as next FROM consult_type_configs WHERE crm_menu = $1`, [menu]);
        await db.run(
            `INSERT INTO consult_type_configs (key, label, icon, color, text_color, sort_order, stage, crm_menu) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (key, crm_menu) DO NOTHING`,
            [key, label, icon || '📋', color || '#6b7280', text_color || 'white', max.next, stage || null, menu]
        );
        // ★ Auto-create self-referencing flow rule → tạo section "Khi ấn: [nút mới]"
        await db.run(
            `INSERT INTO consult_flow_rules (from_status, to_type_key, is_default, sort_order, crm_menu)
             VALUES ($1, $1, true, 1, $2)
             ON CONFLICT (from_status, to_type_key, crm_menu) DO NOTHING`,
            [key, menu]
        );
        return { success: true };
    });

    // DELETE a consult type (GĐ only)
    fastify.delete('/api/consult-types/:key', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key } = req.params;
        const crmMenu = req.body?.crm_menu || req.query.crm_menu || 'nhu_cau';
        // Clean up flow rules referencing this key (scoped to crm_menu)
        await db.run(`DELETE FROM consult_flow_rules WHERE to_type_key = $1 AND crm_menu = $2`, [key, crmMenu]);
        await db.run(`DELETE FROM consult_flow_rules WHERE from_status = $1 AND crm_menu = $2`, [key, crmMenu]);
        // Delete the type (scoped to crm_menu)
        await db.run(`DELETE FROM consult_type_configs WHERE key = $1 AND crm_menu = $2`, [key, crmMenu]);
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
        const crmMenu = req.query.crm_menu || 'nhu_cau';
        const rows = await db.all(
            `SELECT cfr.*, ctc.label as to_label, ctc.icon as to_icon, ctc.color as to_color
             FROM consult_flow_rules cfr
             LEFT JOIN consult_type_configs ctc ON ctc.key = cfr.to_type_key AND ctc.crm_menu = cfr.crm_menu
             WHERE cfr.crm_menu = $1
             ORDER BY cfr.from_status, cfr.sort_order`, [crmMenu]
        );
        const grouped = {};
        for (const r of rows) {
            if (!grouped[r.from_status]) grouped[r.from_status] = [];
            grouped[r.from_status].push(r);
        }
        // Add max_appointment_days per from_status (inherit from group leader)
        const maxDaysMap = {};
        const sectionRows = await db.all(`SELECT key, max_appointment_days, section_group FROM consult_type_configs WHERE section_order > 0 AND crm_menu = $1`, [crmMenu]);
        const groupMembers = await db.all(`SELECT key, section_group FROM consult_type_configs WHERE section_group IS NOT NULL AND section_order = 0 AND crm_menu = $1`, [crmMenu]);
        // Build leader max_days by section_group
        const groupMaxDays = {};
        for (const s of sectionRows) {
            maxDaysMap[s.key] = s.max_appointment_days || 0;
            if (s.section_group && s.max_appointment_days > 0) {
                groupMaxDays[s.section_group] = s.max_appointment_days;
            }
        }
        // Propagate to group members
        for (const m of groupMembers) {
            if (m.section_group && groupMaxDays[m.section_group]) {
                maxDaysMap[m.key] = groupMaxDays[m.section_group];
            }
        }
        return { rules: grouped, all: rows, maxDaysPerStatus: maxDaysMap };
    });

    // PUT update flow rules for a specific from_status (GĐ only)
    fastify.put('/api/consult-flow-rules/:fromStatus', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { fromStatus } = req.params;
        const { rules } = req.body;
        if (!Array.isArray(rules)) return reply.code(400).send({ error: 'rules must be array' });

        const crmMenu = req.body.crm_menu || 'nhu_cau';
        await db.run(`DELETE FROM consult_flow_rules WHERE from_status = $1 AND crm_menu = $2`, [fromStatus, crmMenu]);

        for (const r of rules) {
            await db.run(
                `INSERT INTO consult_flow_rules (from_status, to_type_key, delay_days, is_default, sort_order, crm_menu)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [fromStatus, r.to_type_key, r.delay_days || 0, r.is_default || false, r.sort_order || 0, crmMenu]
            );
        }
        return { success: true };
    });

    // DELETE a from_status group (GĐ only)
    fastify.delete('/api/consult-flow-rules/:fromStatus', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const crmMenu = req.body?.crm_menu || req.query.crm_menu || 'nhu_cau';
        await db.run(`DELETE FROM consult_flow_rules WHERE from_status = $1 AND crm_menu = $2`, [req.params.fromStatus, crmMenu]);
        return { success: true };
    });

    // PATCH update section_order for a consult type (GĐ only)
    fastify.patch('/api/consult-types/:key/section-order', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key } = req.params;
        const { section_order } = req.body;
        const crmMenu = req.body.crm_menu || req.query.crm_menu || 'nhu_cau';
        if (section_order === undefined || section_order === null || section_order < 0) return reply.code(400).send({ error: 'Invalid section_order' });

        if (section_order === 0) {
            // Just reset to 0 (remove from sections)
            await db.run(`UPDATE consult_type_configs SET section_order = 0 WHERE key = $1 AND crm_menu = $2`, [key, crmMenu]);
            return { success: true };
        }

        // Shift existing sections at >= this position down by 1
        await db.run(
            `UPDATE consult_type_configs SET section_order = section_order + 1 WHERE section_order >= $1 AND section_order > 0 AND key != $2 AND crm_menu = $3`,
            [section_order, key, crmMenu]
        );
        // Set the new order
        await db.run(
            `UPDATE consult_type_configs SET section_order = $1 WHERE key = $2 AND crm_menu = $3`,
            [section_order, key, crmMenu]
        );
        return { success: true };
    });

    // PATCH update max_appointment_days for a consult type (GĐ only)
    fastify.patch('/api/consult-types/:key/max-appointment-days', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key } = req.params;
        const { max_appointment_days } = req.body;
        const crmMenu = req.body.crm_menu || req.query.crm_menu || 'nhu_cau';
        await db.run(`UPDATE consult_type_configs SET max_appointment_days = $1 WHERE key = $2 AND crm_menu = $3`, [max_appointment_days || 0, key, crmMenu]);
        return { success: true };
    });

    // POST reindex all sections sequentially (1, 2, 3, ..., n) grouped by phase
    fastify.post('/api/consult-sections/reindex', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const crmMenu = req.body.crm_menu || req.query.crm_menu || 'nhu_cau';

        // Get phases sorted by sort_order
        const phaseRow = await db.get(`SELECT value FROM app_config WHERE key = 'consult_rule_phases'`);
        const phases = phaseRow ? JSON.parse(phaseRow.value) : [];
        phases.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        // Get all sections for this crm_menu only
        const allSections = await db.all(`SELECT key, rule_phase FROM consult_type_configs WHERE section_order > 0 AND crm_menu = $1 ORDER BY section_order`, [crmMenu]);

        // Group: phases first (in phase order), then unphased
        const ordered = [];
        for (const phase of phases) {
            const inPhase = allSections.filter(s => s.rule_phase === phase.id);
            ordered.push(...inPhase);
        }
        // Add unphased at end
        const phaseIds = new Set(phases.map(p => p.id));
        const unphased = allSections.filter(s => !s.rule_phase || !phaseIds.has(s.rule_phase));
        ordered.push(...unphased);

        // Assign 1, 2, 3, ..., n
        for (let i = 0; i < ordered.length; i++) {
            await db.run(`UPDATE consult_type_configs SET section_order = $1 WHERE key = $2 AND crm_menu = $3`, [i + 1, ordered[i].key, crmMenu]);
        }
        return { success: true, count: ordered.length };
    });

    // GET sections info (types that have flow rules = have their own "Khi ấn:" section)
    fastify.get('/api/consult-sections', async (req, reply) => {
        const crmMenu = req.query.crm_menu || 'nhu_cau';
        const rows = await db.all(`
            SELECT DISTINCT ctc.key, ctc.label, ctc.icon, ctc.color, ctc.section_order, ctc.rule_phase,
                   ctc.section_group, ctc.section_group_label, ctc.max_appointment_days,
                   (SELECT COUNT(*) FROM consult_flow_rules WHERE from_status = ctc.key AND crm_menu = $1) as rule_count
            FROM consult_type_configs ctc
            INNER JOIN consult_flow_rules cfr ON cfr.from_status = ctc.key AND cfr.crm_menu = $1
            WHERE ctc.section_order > 0 AND ctc.crm_menu = $1
            ORDER BY ctc.section_order
        `, [crmMenu]);
        // Group members: buttons with section_group but section_order = 0
        const groupMembers = await db.all(`
            SELECT key, label, icon, color, section_group
            FROM consult_type_configs
            WHERE section_group IS NOT NULL AND (section_order IS NULL OR section_order = 0) AND is_active = true AND crm_menu = $1
        `, [crmMenu]);
        // Also return types WITHOUT a section (section_order = 0 or NULL, no group)
        const unsectioned = await db.all(`
            SELECT ctc.key, ctc.label, ctc.icon, ctc.color
            FROM consult_type_configs ctc
            WHERE (ctc.section_order IS NULL OR ctc.section_order = 0)
            AND ctc.is_active = true
            AND (ctc.section_group IS NULL OR ctc.section_group = '')
            AND ctc.crm_menu = $1
            ORDER BY ctc.sort_order
        `, [crmMenu]);
        return { sections: rows, unsectioned, groupMembers };
    });

    // GET rule phases config
    fastify.get('/api/consult-rule-phases', async (req, reply) => {
        const row = await db.get(`SELECT value FROM app_config WHERE key = 'consult_rule_phases'`);
        const phases = row ? JSON.parse(row.value) : [];
        phases.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        return { phases };
    });

    // PUT update rule phases config (GĐ only)
    fastify.put('/api/consult-rule-phases', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { phases } = req.body;
        await db.run(
            `INSERT INTO app_config (key, value) VALUES ('consult_rule_phases', $1) ON CONFLICT (key) DO UPDATE SET value = $1`,
            [JSON.stringify(phases)]
        );
        return { success: true };
    });

    // PATCH update a section's rule_phase (GĐ only)
    fastify.patch('/api/consult-types/:key/rule-phase', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { rule_phase } = req.body;
        const crmMenu = req.body.crm_menu || req.query.crm_menu || 'nhu_cau';
        await db.run(`UPDATE consult_type_configs SET rule_phase = $1 WHERE key = $2 AND crm_menu = $3`, [rule_phase || null, req.params.key, crmMenu]);
        return { success: true };
    });

    // PATCH batch update rule_phase for multiple sections (GĐ only)
    fastify.patch('/api/consult-types/batch/rule-phase', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { updates } = req.body; // [{key, rule_phase}]
        const crmMenu = req.body.crm_menu || req.query.crm_menu || 'nhu_cau';
        for (const u of updates) {
            await db.run(`UPDATE consult_type_configs SET rule_phase = $1 WHERE key = $2 AND crm_menu = $3`, [u.rule_phase || null, u.key, crmMenu]);
        }
        return { success: true };
    });

    // PATCH update section_group fields for a consult type (GĐ only)
    fastify.patch('/api/consult-types/:key', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Forbidden' });
        const { key } = req.params;
        const { section_group, section_group_label } = req.body;
        const crmMenu = req.body.crm_menu || req.query.crm_menu || 'nhu_cau';
        const sets = [];
        const vals = [];
        let idx = 1;
        if (section_group !== undefined) { sets.push(`section_group = $${idx++}`); vals.push(section_group); }
        if (section_group_label !== undefined) { sets.push(`section_group_label = $${idx++}`); vals.push(section_group_label); }
        if (sets.length === 0) return reply.code(400).send({ error: 'Nothing to update' });
        vals.push(key);
        vals.push(crmMenu);
        await db.run(`UPDATE consult_type_configs SET ${sets.join(', ')} WHERE key = $${idx} AND crm_menu = $${idx + 1}`, vals);
        return { success: true };
    });
};
