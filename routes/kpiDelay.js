// ========== KPI TỈ LỆ CHẬM ĐƠN & ĐƠN LỖI ROUTES ==========
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
                target_max_internal_errors INT DEFAULT 0,
                target_max_customer_errors INT DEFAULT 0,
                target_max_total_errors INT DEFAULT 0,
                notes TEXT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(year, segment, period_type, period_value)
            )
        `);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS target_max_internal_errors INT DEFAULT 0`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS target_max_customer_errors INT DEFAULT 0`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS target_max_total_errors INT DEFAULT 0`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS eval_rule VARCHAR(20) DEFAULT 'ALL'`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS reward_text TEXT DEFAULT ''`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS commitments TEXT DEFAULT '[]'`);
        // === Phase 2: Quy Trình KPI Tuần Tự ===
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS commitment_evals TEXT DEFAULT '[]'`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS commitment_completion_pct DECIMAL(5,2) DEFAULT 0`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS final_reward_granted BOOLEAN DEFAULT FALSE`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS completed_by INT`);
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
                    delay_pct: 0,
                    internal_errors: 0,
                    customer_errors: 0,
                    total_errors: 0,
                    internal_error_qty: 0,
                    customer_error_qty: 0,
                    total_error_qty: 0
                };
            }

            // Process orders for delay stats
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

            // Query Error Orders from customer_error_orders for the same year and segment
            const errorConditions = [`EXTRACT(YEAR FROM ceo.report_date) = $1`];
            const errorParams = [year];

            if (segment === 'dongphuc' || segment === 'dong_phuc') {
                errorConditions.push(`(
                    (COALESCE(cat.id, o.category_id) IS NULL OR (COALESCE(cat.id, o.category_id) != 8 AND COALESCE(cat.id, o.category_id) != 9))
                    AND UPPER(COALESCE(ceo.order_code, '')) NOT LIKE '%PET%'
                    AND UPPER(COALESCE(ceo.order_code, '')) NOT LIKE '%TEM%'
                )`);
            } else if (segment === 'tempet' || segment === 'tem_pet') {
                errorConditions.push(`(
                    COALESCE(cat.id, o.category_id) = 8 OR COALESCE(cat.id, o.category_id) = 9
                    OR UPPER(COALESCE(ceo.order_code, '')) LIKE '%PET%'
                    OR UPPER(COALESCE(ceo.order_code, '')) LIKE '%TEM%'
                )`);
            }

            const errorWhere = errorConditions.length ? 'WHERE ' + errorConditions.join(' AND ') : '';

            const rawErrors = await db.all(`
                SELECT ceo.id, ceo.report_date, ceo.error_type, ceo.error_quantity, ceo.dht_order_id, ceo.order_code
                FROM customer_error_orders ceo
                LEFT JOIN dht_orders o ON (o.id = ceo.dht_order_id OR (ceo.dht_order_id IS NULL AND o.order_code = ceo.order_code))
                LEFT JOIN dht_categories cat ON o.category_id = cat.id
                ${errorWhere}
            `, errorParams);

            // Process error orders
            rawErrors.forEach(err => {
                if (!err.report_date) return;
                let m = 1;
                try {
                    const dStr = vnDateStr(err.report_date);
                    m = parseInt(dStr.split('-')[1], 10);
                } catch(e) { return; }
                if (m < 1 || m > 12) return;

                const qty = Number(err.error_quantity) || 0;
                const errType = err.error_type || (err.dht_order_id ? 'Khách Hàng' : 'Nội Bộ');
                if (errType === 'Nội Bộ') {
                    monthlyData[m].internal_errors++;
                    monthlyData[m].internal_error_qty += qty;
                } else {
                    monthlyData[m].customer_errors++;
                    monthlyData[m].customer_error_qty += qty;
                }
                monthlyData[m].total_errors++;
                monthlyData[m].total_error_qty += qty;
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
                let qInternalErr = 0, qCustomerErr = 0, qTotalErr = 0;
                let qInternalErrQty = 0, qCustomerErrQty = 0, qTotalErrQty = 0;
                for (let m = startM; m <= endM; m++) {
                    qTotal += monthlyData[m].total;
                    qEarly += monthlyData[m].early;
                    qOnTime += monthlyData[m].on_time;
                    qLate += monthlyData[m].late;

                    qInternalErr += monthlyData[m].internal_errors;
                    qCustomerErr += monthlyData[m].customer_errors;
                    qTotalErr += monthlyData[m].total_errors;
                    qInternalErrQty += monthlyData[m].internal_error_qty;
                    qCustomerErrQty += monthlyData[m].customer_error_qty;
                    qTotalErrQty += monthlyData[m].total_error_qty;
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
                    on_time_pct: qOnTimePct,
                    internal_errors: qInternalErr,
                    customer_errors: qCustomerErr,
                    total_errors: qTotalErr,
                    internal_error_qty: qInternalErrQty,
                    customer_error_qty: qCustomerErrQty,
                    total_error_qty: qTotalErrQty
                };
            });

            // Compute Full Year
            let yTotal = 0, yEarly = 0, yOnTime = 0, yLate = 0;
            let yInternalErr = 0, yCustomerErr = 0, yTotalErr = 0;
            let yInternalErrQty = 0, yCustomerErrQty = 0, yTotalErrQty = 0;
            monthsList.forEach(m => {
                yTotal += m.total;
                yEarly += m.early;
                yOnTime += m.on_time;
                yLate += m.late;

                yInternalErr += m.internal_errors;
                yCustomerErr += m.customer_errors;
                yTotalErr += m.total_errors;
                yInternalErrQty += m.internal_error_qty;
                yCustomerErrQty += m.customer_error_qty;
                yTotalErrQty += m.total_error_qty;
            });
            const fullYearData = {
                year,
                total: yTotal,
                early: yEarly,
                on_time: yOnTime,
                late: yLate,
                delay_pct: yTotal > 0 ? parseFloat((yLate / yTotal * 100).toFixed(1)) : 0,
                early_pct: yTotal > 0 ? parseFloat((yEarly / yTotal * 100).toFixed(1)) : 0,
                on_time_pct: yTotal > 0 ? parseFloat((yOnTime / yTotal * 100).toFixed(1)) : 0,
                internal_errors: yInternalErr,
                customer_errors: yCustomerErr,
                total_errors: yTotalErr,
                internal_error_qty: yInternalErrQty,
                customer_error_qty: yCustomerErrQty,
                total_error_qty: yTotalErrQty
            };

            // Query saved KPI targets
            const targetRows = await db.all(`
                SELECT period_type, period_value, target_max_delay_pct, target_max_delay_orders,
                       target_max_internal_errors, target_max_customer_errors, target_max_total_errors, notes,
                       eval_rule, reward_text, commitments,
                       status, commitment_evals, commitment_completion_pct, final_reward_granted, completed_at, completed_by
                FROM kpi_delay_targets
                WHERE year = $1 AND segment = $2
            `, [year, segment]);

            const targetsMap = {};
            targetRows.forEach(r => {
                const key = `${r.period_type}_${r.period_value}`;
                let parsedCommitments = [];
                try {
                    parsedCommitments = typeof r.commitments === 'string' ? JSON.parse(r.commitments || '[]') : (r.commitments || []);
                } catch (err) {
                    parsedCommitments = [];
                }
                let parsedEvals = [];
                try {
                    parsedEvals = typeof r.commitment_evals === 'string' ? JSON.parse(r.commitment_evals || '[]') : (r.commitment_evals || []);
                } catch (err) {
                    parsedEvals = [];
                }
                targetsMap[key] = {
                    target_max_delay_pct: parseFloat(r.target_max_delay_pct || 5.0),
                    target_max_delay_orders: parseInt(r.target_max_delay_orders || 0, 10),
                    target_max_internal_errors: parseInt(r.target_max_internal_errors || 0, 10),
                    target_max_customer_errors: parseInt(r.target_max_customer_errors || 0, 10),
                    target_max_total_errors: parseInt(r.target_max_total_errors || 0, 10),
                    notes: r.notes || '',
                    eval_rule: r.eval_rule || 'ALL',
                    reward_text: r.reward_text || '',
                    commitments: Array.isArray(parsedCommitments) ? parsedCommitments : [],
                    status: r.status || 'active',
                    commitment_evals: Array.isArray(parsedEvals) ? parsedEvals : [],
                    commitment_completion_pct: parseFloat(r.commitment_completion_pct || 0),
                    final_reward_granted: !!r.final_reward_granted,
                    completed_at: r.completed_at || null,
                    completed_by: r.completed_by || null
                };
            });

            return reply.send({
                ok: true,
                year,
                segment,
                months: monthsList,
                quarters: quartersList,
                fullYear: fullYearData,
                targets: targetsMap,
                userRole: req.user ? req.user.role : 'unknown'
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

            const userRole = req.user.role || '';
            const canCreate = ['giam_doc', 'quan_ly', 'quan_ly_cap_cao'].includes(userRole);
            if (!canCreate) {
                return reply.code(403).send({ error: 'Bạn không có quyền tạo/sửa KPI.' });
            }

            const { year, segment = 'all', targets = [] } = req.body || {};
            if (!year || !Array.isArray(targets)) {
                return reply.code(400).send({ error: 'Dữ liệu không hợp lệ!' });
            }

            for (const t of targets) {
                const {
                    period_type,
                    period_value,
                    target_max_delay_pct,
                    target_max_delay_orders = 0,
                    target_max_internal_errors = 0,
                    target_max_customer_errors = 0,
                    target_max_total_errors = 0,
                    notes = '',
                    eval_rule = 'ALL',
                    reward_text = '',
                    commitments = []
                } = t;
                if (!period_type || period_value === undefined) continue;

                // === Sequential check: month N requires month N-1 completed (except month 1) ===
                if (period_type === 'month') {
                    const pv = parseInt(period_value, 10);
                    // Check if this month already exists
                    const existing = await db.get(
                        `SELECT status FROM kpi_delay_targets WHERE year=$1 AND segment=$2 AND period_type='month' AND period_value=$3`,
                        [parseInt(year, 10), segment, pv]
                    );
                    if (!existing && pv > 1) {
                        // Creating new month — check previous month is completed
                        const prev = await db.get(
                            `SELECT status FROM kpi_delay_targets WHERE year=$1 AND segment=$2 AND period_type='month' AND period_value=$3`,
                            [parseInt(year, 10), segment, pv - 1]
                        );
                        if (!prev || prev.status !== 'completed') {
                            return reply.code(400).send({ error: `Phải hoàn thành KPI Tháng ${pv - 1} trước khi tạo KPI Tháng ${pv}!` });
                        }
                    }
                    // Block editing completed months
                    if (existing && existing.status === 'completed') {
                        return reply.code(400).send({ error: `KPI Tháng ${pv} đã Hoàn Thành! Giám Đốc cần Mở Lại trước khi chỉnh sửa.` });
                    }
                }

                // Commitments: chỉ GĐ mới được sửa cam kết
                let commitmentsJson;
                if (userRole === 'giam_doc') {
                    commitmentsJson = typeof commitments === 'string' ? commitments : JSON.stringify(Array.isArray(commitments) ? commitments : []);
                } else {
                    // Non-GD: keep existing commitments, don't overwrite
                    const existingRow = await db.get(
                        `SELECT commitments FROM kpi_delay_targets WHERE year=$1 AND segment=$2 AND period_type=$3 AND period_value=$4`,
                        [parseInt(year, 10), segment, period_type, parseInt(period_value, 10)]
                    );
                    commitmentsJson = existingRow ? existingRow.commitments : '[]';
                }

                await db.run(`
                    INSERT INTO kpi_delay_targets (year, segment, period_type, period_value, target_max_delay_pct, target_max_delay_orders, target_max_internal_errors, target_max_customer_errors, target_max_total_errors, notes, eval_rule, reward_text, commitments, created_by, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
                    ON CONFLICT (year, segment, period_type, period_value)
                    DO UPDATE SET
                        target_max_delay_pct = EXCLUDED.target_max_delay_pct,
                        target_max_delay_orders = EXCLUDED.target_max_delay_orders,
                        target_max_internal_errors = EXCLUDED.target_max_internal_errors,
                        target_max_customer_errors = EXCLUDED.target_max_customer_errors,
                        target_max_total_errors = EXCLUDED.target_max_total_errors,
                        notes = EXCLUDED.notes,
                        eval_rule = EXCLUDED.eval_rule,
                        reward_text = EXCLUDED.reward_text,
                        commitments = EXCLUDED.commitments,
                        updated_at = NOW()
                `, [
                    parseInt(year, 10),
                    segment,
                    period_type,
                    parseInt(period_value, 10),
                    parseFloat(target_max_delay_pct || 0),
                    parseInt(target_max_delay_orders || 0, 10),
                    parseInt(target_max_internal_errors || 0, 10),
                    parseInt(target_max_customer_errors || 0, 10),
                    parseInt(target_max_total_errors || 0, 10),
                    notes,
                    eval_rule || 'ALL',
                    reward_text || '',
                    commitmentsJson,
                    req.user.id
                ]);
            }

            return reply.send({ ok: true, message: 'Đã lưu KPI Mục Tiêu Tỉ Lệ Chậm Đơn & Chỉ Tiêu Lỗi thành công!' });
        } catch (e) {
            console.error('[kpi-delay/targets POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 3. POST /api/kpi-delay/evaluate — GĐ Đánh Giá Cam Kết ==========
    fastify.post('/api/kpi-delay/evaluate', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!req.user || req.user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền đánh giá cam kết!' });
            }
            const { year, segment = 'all', period_type, period_value, commitment_evals = [] } = req.body || {};
            if (!year || !period_type || period_value === undefined) {
                return reply.code(400).send({ error: 'Dữ liệu không hợp lệ!' });
            }

            const evalsJson = JSON.stringify(Array.isArray(commitment_evals) ? commitment_evals : []);
            const totalEvals = Array.isArray(commitment_evals) ? commitment_evals.length : 0;
            const passedCount = Array.isArray(commitment_evals) ? commitment_evals.filter(e => e.passed).length : 0;
            const completionPct = totalEvals > 0 ? parseFloat((passedCount / totalEvals * 100).toFixed(1)) : 0;

            await db.run(`
                UPDATE kpi_delay_targets
                SET commitment_evals = $1, commitment_completion_pct = $2, status = 'evaluating', updated_at = NOW()
                WHERE year = $3 AND segment = $4 AND period_type = $5 AND period_value = $6
            `, [evalsJson, completionPct, parseInt(year, 10), segment, period_type, parseInt(period_value, 10)]);

            return reply.send({ ok: true, message: `Đã lưu đánh giá cam kết! Tỉ lệ hoàn thành: ${completionPct}%` });
        } catch (e) {
            console.error('[kpi-delay/evaluate POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 4. POST /api/kpi-delay/complete — GĐ Hoàn Thành KPI Tháng ==========
    fastify.post('/api/kpi-delay/complete', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!req.user || req.user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền hoàn thành KPI!' });
            }
            const { year, segment = 'all', period_type, period_value } = req.body || {};
            if (!year || !period_type || period_value === undefined) {
                return reply.code(400).send({ error: 'Dữ liệu không hợp lệ!' });
            }

            // Check all commitments have been evaluated
            const row = await db.get(
                `SELECT commitments, commitment_evals, eval_rule, target_max_delay_pct, target_max_total_errors FROM kpi_delay_targets WHERE year=$1 AND segment=$2 AND period_type=$3 AND period_value=$4`,
                [parseInt(year, 10), segment, period_type, parseInt(period_value, 10)]
            );
            if (!row) {
                return reply.code(404).send({ error: 'Không tìm thấy KPI kỳ này!' });
            }

            let parsedCommitments = [];
            try { parsedCommitments = JSON.parse(row.commitments || '[]'); } catch (e) {}
            let parsedEvals = [];
            try { parsedEvals = JSON.parse(row.commitment_evals || '[]'); } catch (e) {}

            if (parsedCommitments.length > 0 && parsedEvals.length < parsedCommitments.length) {
                return reply.code(400).send({ error: `Cần đánh giá hết ${parsedCommitments.length} cam kết trước khi hoàn thành! Hiện mới đánh giá ${parsedEvals.length}.` });
            }

            // Auto-determine reward based on KPI Trễ + KPI Lỗi (cam kết chỉ tham khảo)
            // We set final_reward_granted = true for now; frontend will show real result based on actual data
            await db.run(`
                UPDATE kpi_delay_targets
                SET status = 'completed', completed_at = NOW(), completed_by = $1, updated_at = NOW()
                WHERE year = $2 AND segment = $3 AND period_type = $4 AND period_value = $5
            `, [req.user.id, parseInt(year, 10), segment, period_type, parseInt(period_value, 10)]);

            return reply.send({ ok: true, message: `✅ Đã hoàn thành KPI ${period_type === 'month' ? 'Tháng ' + period_value : period_type}!` });
        } catch (e) {
            console.error('[kpi-delay/complete POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 5. POST /api/kpi-delay/reopen — GĐ Mở Lại KPI ==========
    fastify.post('/api/kpi-delay/reopen', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!req.user || req.user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền mở lại KPI!' });
            }
            const { year, segment = 'all', period_type, period_value } = req.body || {};
            if (!year || !period_type || period_value === undefined) {
                return reply.code(400).send({ error: 'Dữ liệu không hợp lệ!' });
            }

            await db.run(`
                UPDATE kpi_delay_targets
                SET status = 'active', completed_at = NULL, completed_by = NULL, updated_at = NOW()
                WHERE year = $1 AND segment = $2 AND period_type = $3 AND period_value = $4
            `, [parseInt(year, 10), segment, period_type, parseInt(period_value, 10)]);

            return reply.send({ ok: true, message: `🔓 Đã mở lại KPI ${period_type === 'month' ? 'Tháng ' + period_value : period_type}!` });
        } catch (e) {
            console.error('[kpi-delay/reopen POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

};


