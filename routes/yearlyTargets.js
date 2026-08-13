const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function yearlyTargetsRoutes(fastify, options) {

    // GET /api/yearly-targets?year=2026&category=sale_kd&segment=all
    fastify.get('/api/yearly-targets', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const year = Number(request.query.year) || new Date().getFullYear();
            const category = request.query.category || 'sale_kd';
            const segment = request.query.segment || 'all'; // 'dong_phuc', 'tem_pet', 'all'

            // Determine target category keys to query
            let dbCatKeys = [category];
            if (category === 'sale_kd') {
                if (segment === 'dong_phuc') dbCatKeys = ['sale_kd_dp', 'sale_kd'];
                else if (segment === 'tem_pet') dbCatKeys = ['sale_kd_pet'];
                else dbCatKeys = ['sale_kd_dp', 'sale_kd_pet', 'sale_kd'];
            }

            const placeholders = dbCatKeys.map((_, i) => `$${i + 2}`).join(',');
            const rows = await db.all(
                `SELECT category, month, target_revenue, target_orders, target_notes, is_locked, updated_at
                 FROM yearly_targets
                 WHERE year = $1 AND category IN (${placeholders})
                 ORDER BY month`,
                [year, ...dbCatKeys]
            );

            // Build SQL segment filter for actual sales
            let segFilter = '';
            if (segment === 'dong_phuc') {
                segFilter = ` AND NOT (
                    UPPER(COALESCE(cat.name, '')) IN ('PET', 'TEM')
                    OR UPPER(COALESCE(d.order_code, '')) LIKE '%PET%'
                    OR UPPER(COALESCE(d.order_code, '')) LIKE '%TEM%'
                    OR d.category_id IN (8, 9)
                )`;
            } else if (segment === 'tem_pet') {
                segFilter = ` AND (
                    UPPER(COALESCE(cat.name, '')) IN ('PET', 'TEM')
                    OR UPPER(COALESCE(d.order_code, '')) LIKE '%PET%'
                    OR UPPER(COALESCE(d.order_code, '')) LIKE '%TEM%'
                    OR d.category_id IN (8, 9)
                )`;
            }

            const yearStart = `${year}-01-01`;
            const yearEnd = `${year + 1}-01-01`;
            
            const actualRows = await db.all(`
                SELECT 
                    EXTRACT(MONTH FROM d.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS mo,
                    COALESCE(SUM(
                        COALESCE(oi_sum.item_total, 0) 
                        - COALESCE(d.discount_amount, 0) 
                        - COALESCE(d.vat_amount, 0)
                    ), 0) AS actual_revenue,
                    COUNT(DISTINCT d.id)::int AS actual_orders
                FROM dht_orders d
                JOIN order_codes oc ON oc.order_code = d.order_code
                JOIN customers c ON oc.customer_id = c.id
                LEFT JOIN dht_categories cat ON cat.id = d.category_id
                LEFT JOIN LATERAL (
                    SELECT SUM(di.item_total) AS item_total 
                    FROM dht_order_items di 
                    WHERE di.dht_order_id = d.id
                ) oi_sum ON true
                WHERE COALESCE(c.cancel_approved, 0) != 1
                  AND COALESCE(d.is_draft, false) = false
                  AND COALESCE(oc.status, 'active') NOT IN ('cancelled', 'canceled')
                  AND d.created_at >= $1::timestamp 
                  AND d.created_at < $2::timestamp
                  ${segFilter}
                GROUP BY mo
                ORDER BY mo
            `, [yearStart, yearEnd]);

            const actualMap = {};
            actualRows.forEach(a => {
                actualMap[a.mo] = {
                    actual_revenue: Number(a.actual_revenue) || 0,
                    actual_orders: Number(a.actual_orders) || 0
                };
            });

            // Map targets 1..12
            const targetsMap = {};
            for (let m = 1; m <= 12; m++) {
                const act = actualMap[m] || { actual_revenue: 0, actual_orders: 0 };
                targetsMap[m] = { 
                    month: m, 
                    target_revenue: 0, 
                    target_orders: 0, 
                    target_notes: '', 
                    is_locked: 0,
                    actual_revenue: act.actual_revenue,
                    actual_orders: act.actual_orders
                };
            }

            if (segment === 'all') {
                const monthDp = {};
                const monthPet = {};
                const monthBase = {};

                rows.forEach(r => {
                    if (r.category === 'sale_kd_dp') monthDp[r.month] = r;
                    else if (r.category === 'sale_kd_pet') monthPet[r.month] = r;
                    else if (r.category === 'sale_kd') monthBase[r.month] = r;
                });

                for (let m = 1; m <= 12; m++) {
                    const dp = monthDp[m];
                    const pet = monthPet[m];
                    const base = monthBase[m];

                    if (dp || pet) {
                        const dpRev = dp ? (Number(dp.target_revenue) || 0) : 0;
                        const petRev = pet ? (Number(pet.target_revenue) || 0) : 0;
                        const dpOrd = dp ? (Number(dp.target_orders) || 0) : 0;
                        const petOrd = pet ? (Number(pet.target_orders) || 0) : 0;

                        targetsMap[m].target_revenue = dpRev + petRev;
                        targetsMap[m].target_orders = dpOrd + petOrd;
                        const notesArr = [];
                        if (dp?.target_notes && dp.target_notes.trim()) {
                            notesArr.push(`👔 Chiến Lược LV Đồng Phục - Tháng ${m}:\n${dp.target_notes.trim()}`);
                        }
                        if (pet?.target_notes && pet.target_notes.trim()) {
                            notesArr.push(`🏷️ Chiến Lược LV TEM/PET - Tháng ${m}:\n${pet.target_notes.trim()}`);
                        }
                        targetsMap[m].target_notes = notesArr.join('\n\n');
                        targetsMap[m].is_locked = 1;
                        targetsMap[m].is_readonly = true;
                    } else if (base) {
                        targetsMap[m].target_revenue = Number(base.target_revenue) || 0;
                        targetsMap[m].target_orders = Number(base.target_orders) || 0;
                        if (base.target_notes && base.target_notes.includes('|')) {
                            const parts = base.target_notes.split('|');
                            targetsMap[m].target_notes = `👔 Chiến Lược LV Đồng Phục - Tháng ${m}:\n${parts[0].trim()}\n\n🏷️ Chiến Lược LV TEM/PET - Tháng ${m}:\n${parts[1].trim()}`;
                        } else {
                            targetsMap[m].target_notes = base.target_notes || '';
                        }
                        targetsMap[m].is_locked = 1;
                        targetsMap[m].is_readonly = true;
                    } else {
                        targetsMap[m].is_readonly = true;
                    }
                }
            } else {
                rows.forEach(r => {
                    targetsMap[r.month].target_revenue = Number(r.target_revenue) || 0;
                    targetsMap[r.month].target_orders = Number(r.target_orders) || 0;
                    targetsMap[r.month].target_notes = r.target_notes || '';
                    targetsMap[r.month].is_locked = Number(r.is_locked) || 0;
                });
            }

            return { success: true, year, category, segment, targets: Object.values(targetsMap) };
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

            const { year, category, segment = 'all', items } = request.body || {};
            if (!year || !category || !Array.isArray(items)) {
                return reply.code(400).send({ error: 'Thiếu dữ liệu năm hoặc danh mục' });
            }

            if (category === 'sale_kd' && (segment === 'all' || !segment)) {
                return reply.code(400).send({ error: 'Mục tiêu Tất Cả được tự động tính từ 2 Lĩnh Vực. Vui lòng chọn Lĩnh Vực Đồng Phục hoặc Lĩnh Vực TEM/PET để nhập liệu.' });
            }

            let saveCategory = category;
            if (category === 'sale_kd') {
                if (segment === 'dong_phuc') saveCategory = 'sale_kd_dp';
                else if (segment === 'tem_pet') saveCategory = 'sale_kd_pet';
            }

            for (const item of items) {
                const month = Number(item.month);
                if (!month || month < 1 || month > 12) continue;
                const revenue = Number(item.target_revenue) || 0;
                const orders = Number(item.target_orders) || 0;
                const notes = item.target_notes || null;
                const isLocked = (item.is_locked === 1 || item.is_locked === true || item.is_locked === '1') ? 1 : 0;

                await db.run(
                    `INSERT INTO yearly_targets (year, category, month, target_revenue, target_orders, target_notes, is_locked, updated_by, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                     ON CONFLICT (year, category, month)
                     DO UPDATE SET target_revenue = $4, target_orders = $5, target_notes = $6, is_locked = $7, updated_by = $8, updated_at = NOW()`,
                    [Number(year), saveCategory, month, revenue, orders, notes, isLocked, user.id]
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
