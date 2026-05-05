/**
 * KPI Targets — CRUD API
 * Only Director (giam_doc) can set/edit/delete KPI targets
 * Metrics: revenue, orders, conversion_rate, retention_rate
 */
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function kpiTargetsRoutes(fastify, options) {

    // ===== GET all KPI targets for a period =====
    fastify.get('/api/kpi-targets', { preHandler: [authenticate] }, async (request, reply) => {
        const { period_type = 'month', period_value } = request.query;
        if (!period_value) return reply.code(400).send({ error: 'Thiếu period_value' });

        const targets = await db.all(
            `SELECT kt.*, u.full_name AS target_name, d.name AS dept_name,
                    cr.full_name AS created_by_name
             FROM kpi_targets kt
             LEFT JOIN users u ON kt.target_type = 'user' AND kt.target_id = u.id
             LEFT JOIN departments d ON kt.target_type = 'team' AND kt.target_id = d.id
             LEFT JOIN users cr ON kt.created_by = cr.id
             WHERE kt.period_type = $1 AND kt.period_value = $2
             ORDER BY kt.target_type, kt.metric`,
            [period_type, period_value]
        );

        return { targets };
    });

    // ===== SET/UPDATE KPI target =====
    fastify.post('/api/kpi-targets', { preHandler: [authenticate] }, async (request, reply) => {
        // Only director can set KPI
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được đặt KPI' });
        }

        const { target_type, target_id, metric, period_type, period_value, target_value } = request.body || {};

        if (!target_type || !target_id || !metric || !period_type || !period_value || target_value == null) {
            return reply.code(400).send({ error: 'Thiếu thông tin' });
        }

        const validTypes = ['user', 'team'];
        const validMetrics = ['revenue', 'orders', 'conversion_rate', 'retention_rate'];
        const validPeriods = ['month', 'quarter', 'year'];

        if (!validTypes.includes(target_type)) return reply.code(400).send({ error: 'target_type không hợp lệ' });
        if (!validMetrics.includes(metric)) return reply.code(400).send({ error: 'metric không hợp lệ' });
        if (!validPeriods.includes(period_type)) return reply.code(400).send({ error: 'period_type không hợp lệ' });

        // Upsert: if target already exists for this combination, update it
        const existing = await db.get(
            `SELECT id FROM kpi_targets
             WHERE target_type = $1 AND target_id = $2 AND metric = $3
               AND period_type = $4 AND period_value = $5`,
            [target_type, target_id, metric, period_type, period_value]
        );

        if (existing) {
            await db.run(
                `UPDATE kpi_targets SET target_value = $1, updated_at = NOW()
                 WHERE id = $2`,
                [target_value, existing.id]
            );
            return { success: true, action: 'updated', id: existing.id };
        } else {
            const result = await db.run(
                `INSERT INTO kpi_targets (target_type, target_id, metric, period_type, period_value, target_value, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [target_type, target_id, metric, period_type, period_value, target_value, request.user.id]
            );
            return { success: true, action: 'created', id: result.lastInsertRowid };
        }
    });

    // ===== BATCH SET KPI for all employees in a period =====
    fastify.post('/api/kpi-targets/batch', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được đặt KPI' });
        }

        const { targets } = request.body || {};
        if (!Array.isArray(targets) || targets.length === 0) {
            return reply.code(400).send({ error: 'Thiếu danh sách targets' });
        }

        let created = 0, updated = 0;
        for (const t of targets) {
            const existing = await db.get(
                `SELECT id FROM kpi_targets
                 WHERE target_type = $1 AND target_id = $2 AND metric = $3
                   AND period_type = $4 AND period_value = $5`,
                [t.target_type, t.target_id, t.metric, t.period_type, t.period_value]
            );

            if (existing) {
                await db.run(
                    `UPDATE kpi_targets SET target_value = $1, updated_at = NOW() WHERE id = $2`,
                    [t.target_value, existing.id]
                );
                updated++;
            } else {
                await db.run(
                    `INSERT INTO kpi_targets (target_type, target_id, metric, period_type, period_value, target_value, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [t.target_type, t.target_id, t.metric, t.period_type, t.period_value, t.target_value, request.user.id]
                );
                created++;
            }
        }

        return { success: true, created, updated };
    });

    // ===== DELETE KPI target =====
    fastify.delete('/api/kpi-targets/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được xóa KPI' });
        }

        await db.run('DELETE FROM kpi_targets WHERE id = $1', [request.params.id]);
        return { success: true };
    });
}

module.exports = kpiTargetsRoutes;
