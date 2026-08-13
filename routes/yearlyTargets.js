const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function yearlyTargetsRoutes(fastify, options) {

    // GET /api/yearly-targets?year=2026&category=sale_kd
    fastify.get('/api/yearly-targets', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const year = Number(request.query.year) || new Date().getFullYear();
            const category = request.query.category || 'sale_kd';
            
            const rows = await db.all(
                `SELECT month, target_revenue, target_orders, target_notes, updated_at
                 FROM yearly_targets
                 WHERE year = $1 AND category = $2
                 ORDER BY month`,
                [year, category]
            );

            // Map 1..12
            const targetsMap = {};
            for (let m = 1; m <= 12; m++) {
                targetsMap[m] = { month: m, target_revenue: 0, target_orders: 0, target_notes: '' };
            }
            rows.forEach(r => {
                targetsMap[r.month] = {
                    month: r.month,
                    target_revenue: Number(r.target_revenue) || 0,
                    target_orders: Number(r.target_orders) || 0,
                    target_notes: r.target_notes || ''
                };
            });

            return { success: true, year, category, targets: Object.values(targetsMap) };
        } catch (e) {
            console.error('[yearly-targets GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/yearly-targets
    fastify.post('/api/yearly-targets', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const user = request.user;
            if (!['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(user.role)) {
                return reply.code(403).send({ error: 'Chỉ Quản lý hoặc Giám đốc mới có quyền thiết lập Mục Tiêu Năm' });
            }

            const { year, category, items } = request.body || {};
            if (!year || !category || !Array.isArray(items)) {
                return reply.code(400).send({ error: 'Thiếu dữ liệu năm hoặc danh mục' });
            }

            for (const item of items) {
                const month = Number(item.month);
                if (!month || month < 1 || month > 12) continue;
                const revenue = Number(item.target_revenue) || 0;
                const orders = Number(item.target_orders) || 0;
                const notes = item.target_notes || null;

                await db.run(
                    `INSERT INTO yearly_targets (year, category, month, target_revenue, target_orders, target_notes, updated_by, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                     ON CONFLICT (year, category, month)
                     DO UPDATE SET target_revenue = $4, target_orders = $5, target_notes = $6, updated_by = $7, updated_at = NOW()`,
                    [Number(year), category, month, revenue, orders, notes, user.id]
                );
            }

            return { success: true, message: 'Đã lưu Mục Tiêu Năm thành công' };
        } catch (e) {
            console.error('[yearly-targets POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });
}

module.exports = yearlyTargetsRoutes;
