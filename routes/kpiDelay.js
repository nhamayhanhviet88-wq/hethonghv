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
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS company_supports TEXT DEFAULT '[]'`);
        // === Phase 2: Quy Trình KPI Tuần Tự ===
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS commitment_evals TEXT DEFAULT '[]'`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS company_support_evals TEXT DEFAULT '[]'`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS commitment_completion_pct DECIMAL(5,2) DEFAULT 0`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS final_reward_granted BOOLEAN DEFAULT FALSE`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS completed_by INT`);
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS actual_total_errors INT DEFAULT NULL`);
        try {
            await db.run(`UPDATE kpi_delay_targets SET actual_total_errors = NULL WHERE actual_total_errors = 0 AND (commitment_evals IS NULL OR commitment_evals = '[]' OR commitment_evals = '' OR commitment_evals = 'null')`);
        } catch(e){}
        // === Phase 4: KPI Tổng Đơn Tối Thiểu ===
        await db.run(`ALTER TABLE kpi_delay_targets ADD COLUMN IF NOT EXISTS target_min_total_orders INT DEFAULT 0`);
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
                     // Date filter for year (based on COALESCE(o.rescheduled_ship_date, o.expected_ship_date))
            conditions.push(`EXTRACT(YEAR FROM COALESCE(o.rescheduled_ship_date, o.expected_ship_date)) = ?`);
            params.push(year);

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

            // Query saved KPI targets first
            const targetRows = await db.all(`
                SELECT period_type, period_value, target_max_delay_pct, target_max_delay_orders,
                       target_max_internal_errors, target_max_customer_errors, target_max_total_errors, notes,
                       eval_rule, reward_text, commitments, company_supports,
                       status, commitment_evals, company_support_evals, commitment_completion_pct, final_reward_granted, completed_at, completed_by,
                       actual_total_errors, target_min_total_orders
                FROM kpi_delay_targets
                WHERE year = ? AND segment = ?
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
                let parsedCompanySupports = [];
                try {
                    parsedCompanySupports = typeof r.company_supports === 'string' ? JSON.parse(r.company_supports || '[]') : (r.company_supports || []);
                } catch (err) {
                    parsedCompanySupports = [];
                }
                let parsedEvals = [];
                try {
                    parsedEvals = typeof r.commitment_evals === 'string' ? JSON.parse(r.commitment_evals || '[]') : (r.commitment_evals || []);
                } catch (err) {
                    parsedEvals = [];
                }
                let parsedSupportEvals = [];
                try {
                    parsedSupportEvals = typeof r.company_support_evals === 'string' ? JSON.parse(r.company_support_evals || '[]') : (r.company_support_evals || []);
                } catch (err) {
                    parsedSupportEvals = [];
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
                    company_supports: Array.isArray(parsedCompanySupports) ? parsedCompanySupports : [],
                    status: r.status || 'active',
                    commitment_evals: Array.isArray(parsedEvals) ? parsedEvals : [],
                    company_support_evals: Array.isArray(parsedSupportEvals) ? parsedSupportEvals : [],
                    commitment_completion_pct: parseFloat(r.commitment_completion_pct || 0),
                    final_reward_granted: !!r.final_reward_granted,
                    completed_at: r.completed_at || null,
                    completed_by: r.completed_by || null,
                    actual_total_errors: (r.actual_total_errors !== null && r.actual_total_errors !== undefined) ? parseInt(r.actual_total_errors, 10) : null,
                    target_min_total_orders: parseInt(r.target_min_total_orders || 0, 10)
                };
            });

            // Populate monthly errors from manually entered actual_total_errors
            for (let m = 1; m <= 12; m++) {
                const t = targetsMap[`month_${m}`];
                monthlyData[m].internal_errors = 0;
                monthlyData[m].customer_errors = 0;
                monthlyData[m].total_errors = (t && t.actual_total_errors !== null && t.actual_total_errors !== undefined) ? t.actual_total_errors : null;
                monthlyData[m].internal_error_qty = 0;
                monthlyData[m].customer_error_qty = 0;
                monthlyData[m].total_error_qty = 0;
            }

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
            const canCreate = userRole === 'giam_doc';
            if (!canCreate) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền tạo/sửa KPI.' });
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
                    target_min_total_orders = 0,
                    notes = '',
                    eval_rule = 'ALL',
                    reward_text = '',
                    commitments = [],
                    company_supports = []
                } = t;
                if (!period_type || period_value === undefined) continue;

                // === Sequential check: month N requires month N-1 completed (except month 1) ===
                if (period_type === 'month') {
                    const pv = parseInt(period_value, 10);
                    // Check if this month already exists
                    const existing = await db.get(
                        `SELECT status FROM kpi_delay_targets WHERE year=? AND segment=? AND period_type='month' AND period_value=?`,
                        [parseInt(year, 10), segment, pv]
                    );
                    if (!existing && pv > 1) {
                        // Creating new month — check previous month KPI target exists
                        const prev = await db.get(
                            `SELECT status FROM kpi_delay_targets WHERE year=? AND segment=? AND period_type='month' AND period_value=?`,
                            [parseInt(year, 10), segment, pv - 1]
                        );
                        if (!prev) {
                            return reply.code(400).send({ error: `Phải khởi tạo KPI Tháng ${pv - 1} trước khi tạo KPI Tháng ${pv}!` });
                        }
                    }
                }

                // Fetch existing row first if present to preserve fields if omitted in payload
                const existingRow = await db.get(
                    `SELECT commitments, company_supports, eval_rule, reward_text FROM kpi_delay_targets WHERE year=? AND segment=? AND period_type=? AND period_value=?`,
                    [parseInt(year, 10), segment, period_type, parseInt(period_value, 10)]
                );

                let commitmentsJson;
                let companySupportsJson;

                if (canCreate) {
                    if (t.commitments !== undefined) {
                        commitmentsJson = typeof commitments === 'string' ? commitments : JSON.stringify(Array.isArray(commitments) ? commitments : []);
                    } else {
                        commitmentsJson = existingRow ? (existingRow.commitments || '[]') : '[]';
                    }

                    if (t.company_supports !== undefined) {
                        companySupportsJson = typeof company_supports === 'string' ? company_supports : JSON.stringify(Array.isArray(company_supports) ? company_supports : []);
                    } else {
                        companySupportsJson = existingRow ? (existingRow.company_supports || '[]') : '[]';
                    }
                } else {
                    commitmentsJson = existingRow ? (existingRow.commitments || '[]') : '[]';
                    companySupportsJson = existingRow ? (existingRow.company_supports || '[]') : '[]';
                }

                const finalEvalRule = t.eval_rule !== undefined ? eval_rule : (existingRow ? (existingRow.eval_rule || 'ALL') : 'ALL');
                const finalRewardText = t.reward_text !== undefined ? reward_text : (existingRow ? (existingRow.reward_text || '') : '');

                await db.run(`
                    INSERT INTO kpi_delay_targets (year, segment, period_type, period_value, target_max_delay_pct, target_max_delay_orders, target_max_internal_errors, target_max_customer_errors, target_max_total_errors, target_min_total_orders, notes, eval_rule, reward_text, commitments, company_supports, created_by, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ON CONFLICT (year, segment, period_type, period_value)
                    DO UPDATE SET
                        target_max_delay_pct = EXCLUDED.target_max_delay_pct,
                        target_max_delay_orders = EXCLUDED.target_max_delay_orders,
                        target_max_internal_errors = EXCLUDED.target_max_internal_errors,
                        target_max_customer_errors = EXCLUDED.target_max_customer_errors,
                        target_max_total_errors = EXCLUDED.target_max_total_errors,
                        target_min_total_orders = EXCLUDED.target_min_total_orders,
                        notes = EXCLUDED.notes,
                        eval_rule = EXCLUDED.eval_rule,
                        reward_text = EXCLUDED.reward_text,
                        commitments = EXCLUDED.commitments,
                        company_supports = EXCLUDED.company_supports,
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
                    parseInt(target_min_total_orders || 0, 10),
                    notes,
                    finalEvalRule,
                    finalRewardText,
                    commitmentsJson,
                    companySupportsJson,
                    req.user.id
                ]);
            }

            return reply.send({ ok: true, message: 'Đã lưu KPI Mục Tiêu Tỉ Lệ Chậm Đơn & Chỉ Tiêu Lỗi thành công!' });
        } catch (e) {
            console.error('[kpi-delay/targets POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 3. POST /api/kpi-delay/evaluate — GĐ Đánh Giá Cam Kết & Số Đơn Lỗi ==========
    fastify.post('/api/kpi-delay/evaluate', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!req.user || req.user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền nhập số đơn lỗi và đánh giá cam kết!' });
            }
            const { year, segment = 'all', period_type, period_value, commitment_evals, company_support_evals, actual_total_errors } = req.body || {};
            if (!year || !period_type || period_value === undefined) {
                return reply.code(400).send({ error: 'Dữ liệu không hợp lệ!' });
            }

            const existingRow = await db.get(
                `SELECT commitment_evals, company_support_evals, actual_total_errors FROM kpi_delay_targets WHERE year=? AND segment=? AND period_type=? AND period_value=?`,
                [parseInt(year, 10), segment, period_type, parseInt(period_value, 10)]
            );

            const evalsJson = commitment_evals !== undefined
                ? JSON.stringify(Array.isArray(commitment_evals) ? commitment_evals : [])
                : (existingRow ? (existingRow.commitment_evals || '[]') : '[]');

            const supportEvalsJson = company_support_evals !== undefined
                ? JSON.stringify(Array.isArray(company_support_evals) ? company_support_evals : [])
                : (existingRow ? (existingRow.company_support_evals || '[]') : '[]');

            let parsedCommitments = [];
            try { parsedCommitments = JSON.parse(evalsJson); } catch (e) {}
            const totalEvals = parsedCommitments.length;
            const passedCount = parsedCommitments.filter(e => e.passed).length;
            const completionPct = totalEvals > 0 ? parseFloat((passedCount / totalEvals * 100).toFixed(1)) : 0;
            const actualErrorsNum = actual_total_errors !== undefined
                ? parseInt(actual_total_errors || 0, 10)
                : (existingRow ? (parseInt(existingRow.actual_total_errors, 10) || 0) : 0);

            const targetStatus = totalEvals > 0 ? 'evaluating' : (existingRow ? (existingRow.status || 'active') : 'active');

            await db.run(`
                UPDATE kpi_delay_targets
                SET commitment_evals = ?, company_support_evals = ?, commitment_completion_pct = ?, actual_total_errors = ?, status = ?, updated_at = NOW()
                WHERE year = ? AND segment = ? AND period_type = ? AND period_value = ?
            `, [evalsJson, supportEvalsJson, completionPct, actualErrorsNum, targetStatus, parseInt(year, 10), segment, period_type, parseInt(period_value, 10)]);

            return reply.send({ ok: true, message: `Đã lưu đánh giá & số đơn lỗi thành công!` });
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
                `SELECT commitments, commitment_evals, eval_rule, target_max_delay_pct, target_max_total_errors FROM kpi_delay_targets WHERE year=? AND segment=? AND period_type=? AND period_value=?`,
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
                SET status = 'completed', completed_at = NOW(), completed_by = ?, updated_at = NOW()
                WHERE year = ? AND segment = ? AND period_type = ? AND period_value = ?
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
                WHERE year = ? AND segment = ? AND period_type = ? AND period_value = ?
            `, [parseInt(year, 10), segment, period_type, parseInt(period_value, 10)]);

            return reply.send({ ok: true, message: `🔓 Đã mở lại KPI ${period_type === 'month' ? 'Tháng ' + period_value : period_type}!` });
        } catch (e) {
            console.error('[kpi-delay/reopen POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 6. GET /api/kpi-delay/historical-benchmarks — Lấy chỉ số thực tế các năm trước ==========
    fastify.get('/api/kpi-delay/historical-benchmarks', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const targetYear = parseInt(req.query.year || new Date().getFullYear(), 10);
            const segment = req.query.segment || 'all';
            const periodType = req.query.period_type || 'month';
            const periodValue = parseInt(req.query.period_value || 1, 10);

            const pastYears = [targetYear - 1, targetYear - 2, targetYear - 3].filter(y => y >= 2025);
            const benchmarks = [];

            // Determine target months for single period summary
            let targetMonths = [];
            if (periodType === 'month') {
                targetMonths = [periodValue];
            } else if (periodType === 'quarter') {
                const startM = (periodValue - 1) * 3 + 1;
                targetMonths = [startM, startM + 1, startM + 2];
            } else {
                targetMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            }

            for (const pYear of pastYears) {
                // Segment condition
                const conditions = [`o.expected_ship_date IS NOT NULL`];
                const params = [];
                conditions.push(`EXTRACT(YEAR FROM COALESCE(o.rescheduled_ship_date, o.expected_ship_date)) = ?`);
                params.push(pYear);

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

                const whereClause = 'WHERE ' + conditions.join(' AND ');
                const rawOrders = await db.all(`
                    SELECT o.id, o.expected_ship_date, o.rescheduled_ship_date, o.shipping_status, o.shipped_at
                    FROM dht_orders o
                    ${whereClause}
                `, params);

                // Fetch all actual errors for the year
                const errRows = await db.all(`
                    SELECT period_value, actual_total_errors
                    FROM kpi_delay_targets
                    WHERE year = ? AND segment = ? AND period_type = 'month'
                `, [pYear, segment]);

                const monthErrorsMap = {};
                errRows.forEach(r => {
                    if (r.actual_total_errors !== null && r.actual_total_errors !== undefined) {
                        monthErrorsMap[r.period_value] = parseInt(r.actual_total_errors, 10);
                    }
                });

                // Compute 4 Quarters breakdown
                const quarters = {
                    1: { total: 0, early: 0, on_time: 0, late: 0, delay_pct: 0, total_errors: 0 },
                    2: { total: 0, early: 0, on_time: 0, late: 0, delay_pct: 0, total_errors: 0 },
                    3: { total: 0, early: 0, on_time: 0, late: 0, delay_pct: 0, total_errors: 0 },
                    4: { total: 0, early: 0, on_time: 0, late: 0, delay_pct: 0, total_errors: 0 }
                };

                let yearTotal = 0, yearEarly = 0, yearOnTime = 0, yearLate = 0;

                rawOrders.forEach(o => {
                    const effDate = o.rescheduled_ship_date || o.expected_ship_date;
                    let m = 1;
                    try {
                        const dStr = vnDateStr(effDate);
                        m = parseInt(dStr.split('-')[1], 10);
                    } catch(e) { return; }

                    if (m < 1 || m > 12) return;
                    const q = Math.ceil(m / 3);

                    const isShipped = o.shipping_status === 'shipped' || !!o.shipped_at;
                    const expStr = vnDateStr(effDate);
                    yearTotal++;
                    quarters[q].total++;

                    if (isShipped) {
                        const shipStr = vnDateStr(o.shipped_at || effDate);
                        if (shipStr < expStr) { yearEarly++; quarters[q].early++; }
                        else if (shipStr > expStr) { yearLate++; quarters[q].late++; }
                        else { yearOnTime++; quarters[q].on_time++; }
                    } else {
                        yearOnTime++;
                        quarters[q].on_time++;
                    }
                });

                // Populate delay_pct and errors for each quarter
                [1, 2, 3, 4].forEach(q => {
                    const qMs = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, q * 3];
                    quarters[q].delay_pct = quarters[q].total > 0 ? parseFloat((quarters[q].late / quarters[q].total * 100).toFixed(1)) : 0;
                    let qErrSum = 0;
                    qMs.forEach(m => {
                        if (monthErrorsMap[m] !== undefined) qErrSum += monthErrorsMap[m];
                    });
                    quarters[q].total_errors = qErrSum;
                });

                // Compute quarter ratios (tỷ trọng)
                const q_ratios = {};
                [1, 2, 3, 4].forEach(q => {
                    q_ratios[q] = yearTotal > 0 ? parseFloat((quarters[q].total / yearTotal).toFixed(3)) : 0;
                });

                // Selected period summary
                let periodTotal = 0, periodEarly = 0, periodOnTime = 0, periodLate = 0, periodErrors = 0;
                targetMonths.forEach(m => {
                    const q = Math.ceil(m / 3);
                    if (monthErrorsMap[m] !== undefined) periodErrors += monthErrorsMap[m];
                });

                rawOrders.forEach(o => {
                    const effDate = o.rescheduled_ship_date || o.expected_ship_date;
                    let m = 1;
                    try {
                        const dStr = vnDateStr(effDate);
                        m = parseInt(dStr.split('-')[1], 10);
                    } catch(e) { return; }
                    if (!targetMonths.includes(m)) return;

                    periodTotal++;
                    const isShipped = o.shipping_status === 'shipped' || !!o.shipped_at;
                    const expStr = vnDateStr(effDate);
                    if (isShipped) {
                        const shipStr = vnDateStr(o.shipped_at || effDate);
                        if (shipStr < expStr) periodEarly++;
                        else if (shipStr > expStr) periodLate++;
                        else periodOnTime++;
                    } else {
                        periodOnTime++;
                    }
                });

                const periodDelayPct = periodTotal > 0 ? parseFloat((periodLate / periodTotal * 100).toFixed(1)) : 0;

                benchmarks.push({
                    year: pYear,
                    total: periodTotal,
                    early: periodEarly,
                    on_time: periodOnTime,
                    late: periodLate,
                    delay_pct: periodDelayPct,
                    total_errors: periodErrors,
                    quarters: quarters,
                    q_ratios: q_ratios
                });
            }

            return reply.send({
                ok: true,
                period_type: periodType,
                period_value: periodValue,
                target_year: targetYear,
                benchmarks: benchmarks
            });
        } catch (e) {
            console.error('[kpi-delay/historical-benchmarks GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

};


