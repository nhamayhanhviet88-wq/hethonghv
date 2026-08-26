// ========== KPI TỈ LỆ CHẬM ĐƠN ROUTES ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow, vnDateStr } = require('../utils/timezone');

module.exports = async function (fastify, opts) {

    // ========== 0. AUTO MIGRATIONS ==========
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS kpi_delay_targets (
                id SERIAL PRIMARY KEY,
                year INT NOT NULL,
                segment VARCHAR(50) DEFAULT 'all',
                period_type VARCHAR(20) NOT NULL,
                period_value INT NOT NULL,
                target_max_delay_pct DECIMAL(5,2) DEFAULT 5.0,
                target_max_delay_orders INT DEFAULT 0,
                notes TEXT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(year, segment, period_type, period_value)
            )
        `);
    } catch (e) {
        console.error('[Migration] kpi_delay_targets error:', e.message);
    }

    // Helper: Is order Pet/Tem
    function checkIsPetTem(o) {
        const catId = Number(o.category_id);
        if (catId === 8 || catId === 9) return true;
        const code = (o.order_code || '').toUpperCase();
        return code.includes('PET') || code.includes('TEM');
    }

    // ========== 1. GET /api/kpi-delay/stats ==========
    fastify.get('/api/kpi-delay/stats', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const year = parseInt(req.query.year || new Date().getFullYear(), 10);
            const segment = req.query.segment || 'all'; // 'all', 'dongphuc', 'tempet'

            const todayStr = vnDateStr(vnNow());

            // Build WHERE condition for orders
            const conditions = [`o.expected_ship_date IS NOT NULL`];
            const params = [];
            let idx = 1;

            // Date filter for year (based on COALESCE(o.rescheduled_ship_date, o.expected_ship_date))
            conditions.push(`EXTRACT(YEAR FROM COALESCE(o.rescheduled_ship_date, o.expected_ship_date)) = $${idx}`);
            params.push(year);
            idx++;

            // Segment filter
            if (segment === 'dongphuc' || segment === 'dong_phuc') {
                conditions.push(`(
                    (o.category_id IS NULL OR (o.category_id != 8 AND o.category_id != 9))
                    AND UPPER(COALESCE(o.order_code, '')) NOT LIKE '%PET%'
                    AND UPPER(COALESCE(o.order_code, '')) NOT LIKE '%TEM%'
                )`);
            } else if (segment === 'tempet' || segment === 'tem_pet') {
                conditions.push(`(
                    o.category_id = 8 OR o.category_id = 9
                    OR UPPER(COALESCE(o.order_code, '')) LIKE '%PET%'
                    OR UPPER(COALESCE(o.order_code, '')) LIKE '%TEM%'
                )`);
            }

            const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

            const rawOrders = await db.all(`
                SELECT o.id, o.order_code, o.order_date, o.expected_ship_date,
                       o.rescheduled_ship_date, o.shipping_status, o.shipped_at, o.category_id
                FROM dht_orders o
                ${whereClause}
            `, params);

            // Structure monthly counters
            const monthlyData = {};
            for (let m = 1; m <= 12; m++) {
                monthlyData[m] = {
                    month: m,
                    total: 0,
                    early: 0,
                    on_time: 0,
                    late: 0,
                    delay_pct: 0
                };
            }

            // Process orders
            rawOrders.forEach(o => {
                const effDate = o.rescheduled_ship_date || o.expected_ship_date;
                let m = 1;
                try {
                    const dStr = vnDateStr(effDate);
                    m = parseInt(dStr.split('-')[1], 10);
                } catch(e) { return; }
                if (m < 1 || m > 12) return;

                const isShipped = o.shipping_status === 'shipped' || !!o.shipped_at;
                let status = 'on_time';

                const expStr = vnDateStr(effDate);

                if (isShipped) {
                    const shipStr = vnDateStr(o.shipped_at || effDate);
                    if (shipStr < expStr) status = 'early';
                    else if (shipStr > expStr) status = 'late';
                    else status = 'on_time';
                } else {
                    if (todayStr > expStr) {
                        status = 'late';
                    } else {
                        status = 'on_time'; // in progress within deadline
                    }
                }

                monthlyData[m].total++;
                if (status === 'early') monthlyData[m].early++;
                else if (status === 'on_time') monthlyData[m].on_time++;
                else if (status === 'late') monthlyData[m].late++;
            });

            // Compute monthly percentages
            const monthsList = [];
            for (let m = 1; m <= 12; m++) {
                const md = monthlyData[m];
                md.delay_pct = md.total > 0 ? parseFloat((md.late / md.total * 100).toFixed(1)) : 0;
                md.early_pct = md.total > 0 ? parseFloat((md.early / md.total * 100).toFixed(1)) : 0;
                md.on_time_pct = md.total > 0 ? parseFloat((md.on_time / md.total * 100).toFixed(1)) : 0;
                monthsList.push(md);
            }

            // Compute Quarters
            const quartersList = [1, 2, 3, 4].map(q => {
                const startM = (q - 1) * 3 + 1;
                const endM = q * 3;
                let qTotal = 0, qEarly = 0, qOnTime = 0, qLate = 0;
                for (let m = startM; m <= endM; m++) {
                    qTotal += monthlyData[m].total;
                    qEarly += monthlyData[m].early;
                    qOnTime += monthlyData[m].on_time;
                    qLate += monthlyData[m].late;
                }
                const qDelayPct = qTotal > 0 ? parseFloat((qLate / qTotal * 100).toFixed(1)) : 0;
                const qEarlyPct = qTotal > 0 ? parseFloat((qEarly / qTotal * 100).toFixed(1)) : 0;
                const qOnTimePct = qTotal > 0 ? parseFloat((qOnTime / qTotal * 100).toFixed(1)) : 0;
                return {
                    quarter: q,
                    name: `Quý ${q}`,
                    total: qTotal,
                    early: qEarly,
                    on_time: qOnTime,
                    late: qLate,
                    delay_pct: qDelayPct,
                    early_pct: qEarlyPct,
                    on_time_pct: qOnTimePct
                };
            });

            // Compute Full Year
            let yTotal = 0, yEarly = 0, yOnTime = 0, yLate = 0;
            monthsList.forEach(m => {
                yTotal += m.total;
                yEarly += m.early;
                yOnTime += m.on_time;
                yLate += m.late;
            });
            const fullYearData = {
                year,
                total: yTotal,
                early: yEarly,
                on_time: yOnTime,
                late: yLate,
                delay_pct: yTotal > 0 ? parseFloat((yLate / yTotal * 100).toFixed(1)) : 0,
                early_pct: yTotal > 0 ? parseFloat((yEarly / yTotal * 100).toFixed(1)) : 0,
                on_time_pct: yTotal > 0 ? parseFloat((yOnTime / yTotal * 100).toFixed(1)) : 0
            };

            // Query saved KPI targets
            const targetRows = await db.all(`
                SELECT period_type, period_value, target_max_delay_pct, target_max_delay_orders, notes
                FROM kpi_delay_targets
                WHERE year = $1 AND segment = $2
            `, [year, segment]);

            const targetsMap = {};
            targetRows.forEach(r => {
                const key = `${r.period_type}_${r.period_value}`;
                targetsMap[key] = {
                    target_max_delay_pct: parseFloat(r.target_max_delay_pct || 5.0),
                    target_max_delay_orders: parseInt(r.target_max_delay_orders || 0, 10),
                    notes: r.notes || ''
                };
            });

            return reply.send({
                ok: true,
                year,
                segment,
                months: monthsList,
                quarters: quartersList,
                fullYear: fullYearData,
                targets: targetsMap
            });
        } catch (e) {
            console.error('[kpi-delay/stats GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 2. POST /api/kpi-delay/targets ==========
    fastify.post('/api/kpi-delay/targets', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!req.user || !req.user.id) {
                return reply.code(401).send({ error: 'Chưa đăng nhập!' });
            }

            const { year, segment = 'all', targets = [] } = req.body || {};
            if (!year || !Array.isArray(targets)) {
                return reply.code(400).send({ error: 'Dữ liệu không hợp lệ!' });
            }

            for (const t of targets) {
                const { period_type, period_value, target_max_delay_pct, target_max_delay_orders = 0, notes = '' } = t;
                if (!period_type || period_value === undefined) continue;

                await db.run(`
                    INSERT INTO kpi_delay_targets (year, segment, period_type, period_value, target_max_delay_pct, target_max_delay_orders, notes, created_by, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                    ON CONFLICT (year, segment, period_type, period_value)
                    DO UPDATE SET
                        target_max_delay_pct = EXCLUDED.target_max_delay_pct,
                        target_max_delay_orders = EXCLUDED.target_max_delay_orders,
                        notes = EXCLUDED.notes,
                        updated_at = NOW()
                `, [
                    parseInt(year, 10),
                    segment,
                    period_type,
                    parseInt(period_value, 10),
                    parseFloat(target_max_delay_pct || 0),
                    parseInt(target_max_delay_orders || 0, 10),
                    notes,
                    req.user.id
                ]);
            }

            return reply.send({ ok: true, message: 'Đã lưu KPI Mục Tiêu Tỉ Lệ Chậm Đơn thành công!' });
        } catch (e) {
            console.error('[kpi-delay/targets POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

};
