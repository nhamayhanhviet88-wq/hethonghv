// ========== KPI SẢN XUẤT — Production KPI Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function (fastify, opts) {

    // ========== 0. AUTO MIGRATIONS ==========
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS kpi_production_targets (
                id SERIAL PRIMARY KEY,
                year INT NOT NULL,
                month INT NOT NULL,
                department VARCHAR(50) DEFAULT 'cutting',
                user_id INT REFERENCES users(id),
                total_minutes INT DEFAULT 0,
                target_rate DECIMAL(10,6) DEFAULT 0,
                error_count INT DEFAULT 0,
                target_products INT DEFAULT 0,
                target_errors INT DEFAULT 0,
                notes TEXT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(year, month, department, user_id)
            )
        `);

        try {
            await db.run(`ALTER TABLE kpi_production_targets ADD COLUMN IF NOT EXISTS error_count INT DEFAULT 0`);
            await db.run(`ALTER TABLE kpi_production_targets ADD COLUMN IF NOT EXISTS target_products INT DEFAULT 0`);
            await db.run(`ALTER TABLE kpi_production_targets ADD COLUMN IF NOT EXISTS target_errors INT DEFAULT 0`);
            await db.run(`ALTER TABLE kpi_production_targets ADD COLUMN IF NOT EXISTS reward_text TEXT`);
            await db.run(`ALTER TABLE kpi_production_targets DROP CONSTRAINT IF EXISTS kpi_production_targets_user_id_fkey`);
        } catch(e) {}

        await db.run(`
            CREATE TABLE IF NOT EXISTS kpi_production_dept_configs (
                id SERIAL PRIMARY KEY,
                year INT NOT NULL,
                month INT NOT NULL DEFAULT 0,
                department VARCHAR(50) DEFAULT 'cutting',
                target_rate DECIMAL(10,6) DEFAULT 0,
                target_products INT DEFAULT 0,
                eval_rule VARCHAR(20) DEFAULT 'ALL',
                reward_text TEXT,
                commitments JSONB DEFAULT '[]'::jsonb,
                supports JSONB DEFAULT '[]'::jsonb,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(year, month, department)
            )
        `);
        try {
            await db.run(`ALTER TABLE kpi_production_dept_configs ADD COLUMN IF NOT EXISTS target_errors INT DEFAULT 0`);
        } catch(e) {}

        // Evaluations table for commitment/support reviews
        await db.run(`
            CREATE TABLE IF NOT EXISTS kpi_production_evaluations (
                id SERIAL PRIMARY KEY,
                year INT NOT NULL,
                month INT NOT NULL,
                department VARCHAR(50) DEFAULT 'cutting',
                item_type VARCHAR(20) NOT NULL,
                item_index INT NOT NULL DEFAULT 0,
                passed BOOLEAN DEFAULT false,
                note TEXT DEFAULT '',
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(year, month, department, item_type, item_index)
            )
        `);
    } catch (e) {
        console.error('[Migration] kpi_production error:', e.message);
    }

    // ========== 1. GET /api/kpi-production/stats ==========
    fastify.get('/api/kpi-production/stats', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const year = parseInt(req.query.year || new Date().getFullYear(), 10);
            const department = req.query.department || 'cutting';

            // 1. Get staff list for the department
            let staff = [];
            const deptIdMapping = {
                cutting: [8],
                printing: [12],
                pressing: [13],
                sewing: [14, 24, 26],
                qc: [15],
                finishing: [15]
            };
            const deptIds = deptIdMapping[department] || [8];

            if (department === 'sewing') {
                // Sewing: staff = sewing teams (each team is a "staff member")
                staff = await db.all(`
                    SELECT d.id, d.name AS full_name, '' AS username, 'team' AS role, d.name AS dept_name
                    FROM departments d
                    WHERE d.id IN (24, 26)
                    ORDER BY d.name
                `);
            } else {
                staff = await db.all(`
                    SELECT u.id, u.full_name, u.username, u.role, d.name AS dept_name
                    FROM users u
                    LEFT JOIN departments d ON u.department_id = d.id
                    WHERE u.status = 'active' AND d.id = ANY($1::int[])
                    ORDER BY u.full_name
                `, [deptIds]);
            }

            // 2. Get monthly production data per staff/team per month
            let productionData = [];
            if (department === 'cutting') {
                productionData = await db.all(`
                    SELECT 
                        cr.cutter_id,
                        EXTRACT(MONTH FROM COALESCE(cr.cut_done_at, cr.cut_date, cr.created_at))::int AS month,
                        SUM(COALESCE(cr.cut_quantity, 0))::int AS products_done,
                        SUM(COALESCE(cr.cut_quantity, 0))::int AS total_quantity
                    FROM cutting_records cr
                    WHERE cr.is_cut_done = true
                      AND cr.cutter_id IS NOT NULL
                      AND COALESCE(cr.phoi_index, 0) = 0
                      AND EXTRACT(YEAR FROM COALESCE(cr.cut_done_at, cr.cut_date, cr.created_at)) = $1
                    GROUP BY cr.cutter_id, month
                    ORDER BY cr.cutter_id, month
                `, [year]);
            } else if (department === 'printing') {
                productionData = await db.all(`
                    SELECT 
                        pr.printer_id AS cutter_id,
                        EXTRACT(MONTH FROM COALESCE(pr.print_done_at, pr.print_date, pr.created_at))::int AS month,
                        SUM(CASE
                            WHEN COALESCE(pr.is_discarded, false) = true THEN 0
                            WHEN COALESCE(oi.production_cancelled, false) = true THEN 0
                            WHEN UPPER(COALESCE(o.order_code, '')) LIKE '%GCPET%' 
                              OR UPPER(COALESCE(o.order_code, '')) LIKE '%GCTEM%' THEN 0
                            ELSE COALESCE(pr.order_quantity, 0)
                        END)::int AS products_done,
                        SUM(CASE
                            WHEN COALESCE(pr.is_discarded, false) = true THEN 0
                            WHEN COALESCE(oi.production_cancelled, false) = true THEN 0
                            WHEN UPPER(COALESCE(o.order_code, '')) LIKE '%GCPET%' 
                              OR UPPER(COALESCE(o.order_code, '')) LIKE '%GCTEM%' THEN 0
                            ELSE COALESCE(pr.order_quantity, 0)
                        END)::int AS total_quantity
                    FROM printing_records pr
                    LEFT JOIN dht_orders o ON pr.dht_order_id = o.id
                    LEFT JOIN dht_order_items oi ON oi.id = pr.order_item_id
                    WHERE pr.is_print_done = true
                      AND pr.printer_id IS NOT NULL
                      AND EXTRACT(YEAR FROM COALESCE(pr.print_done_at, pr.print_date, pr.created_at)) = $1
                    GROUP BY pr.printer_id, month
                    ORDER BY pr.printer_id, month
                `, [year]);
            } else if (department === 'pressing') {
                productionData = await db.all(`
                    SELECT 
                        pr.presser_id AS cutter_id,
                        EXTRACT(MONTH FROM COALESCE(pr.press_date, pr.created_at))::int AS month,
                        SUM(CASE
                            WHEN COALESCE(oi.production_cancelled, false) = true THEN 0
                            WHEN COALESCE(pr.is_discarded, false) = true THEN 0
                            ELSE COALESCE(pr.order_quantity, 0)
                        END)::int AS products_done,
                        SUM(CASE
                            WHEN COALESCE(oi.production_cancelled, false) = true THEN 0
                            WHEN COALESCE(pr.is_discarded, false) = true THEN 0
                            ELSE COALESCE(pr.order_quantity, 0)
                        END)::int AS total_quantity
                    FROM pressing_records pr
                    LEFT JOIN dht_order_items oi ON oi.id = pr.order_item_id
                    WHERE pr.is_reported = true
                      AND pr.presser_id IS NOT NULL
                      AND EXTRACT(YEAR FROM COALESCE(pr.press_date, pr.created_at)) = $1
                    GROUP BY pr.presser_id, month
                    ORDER BY pr.presser_id, month
                `, [year]);
            } else if (department === 'sewing') {
                // Sewing: group by sewing_team_id (= departments.id for teams)
                productionData = await db.all(`
                    SELECT 
                        sr.sewing_team_id AS cutter_id,
                        EXTRACT(MONTH FROM COALESCE(sr.done_date, sr.handover_date, sr.created_at))::int AS month,
                        SUM(CASE
                            WHEN COALESCE(oi.production_cancelled, false) = true THEN 0
                            WHEN sr.notes LIKE '%[HỦY BỎ - BÙ PHÍ]%' OR sr.notes LIKE '%[ĐÃ HỦY - BÙ PHÍ]%' THEN 0
                            ELSE COALESCE(sr.quantity, 0)
                        END)::int AS products_done,
                        SUM(CASE
                            WHEN COALESCE(oi.production_cancelled, false) = true THEN 0
                            WHEN sr.notes LIKE '%[HỦY BỎ - BÙ PHÍ]%' OR sr.notes LIKE '%[ĐÃ HỦY - BÙ PHÍ]%' THEN 0
                            ELSE COALESCE(sr.quantity, 0)
                        END)::int AS total_quantity
                    FROM sewing_records sr
                    LEFT JOIN dht_order_items oi ON oi.id = sr.order_item_id
                    WHERE sr.done_date IS NOT NULL
                      AND sr.sewing_team_id IS NOT NULL
                      AND EXTRACT(YEAR FROM COALESCE(sr.done_date, sr.handover_date, sr.created_at)) = $1
                    GROUP BY sr.sewing_team_id, month
                    ORDER BY sr.sewing_team_id, month
                `, [year]);
            } else if (department === 'finishing') {
                productionData = await db.all(`
                    SELECT 
                        fr.finisher_id AS cutter_id,
                        EXTRACT(MONTH FROM COALESCE(fr.expected_date, fr.created_at))::int AS month,
                        SUM(CASE
                            WHEN COALESCE(oi_f.production_cancelled, false) = true THEN 0
                            ELSE COALESCE(NULLIF(fr.quantity, 0), oi_f.quantity, 0)
                        END)::int AS products_done,
                        SUM(CASE
                            WHEN COALESCE(oi_f.production_cancelled, false) = true THEN 0
                            ELSE COALESCE(NULLIF(fr.quantity, 0), oi_f.quantity, 0)
                        END)::int AS total_quantity
                    FROM finishing_records fr
                    LEFT JOIN sewing_records sr ON fr.sewing_record_id = sr.id
                    LEFT JOIN dht_order_items oi_f ON oi_f.id = COALESCE(fr.order_item_id, sr.order_item_id)
                    WHERE fr.finisher_id IS NOT NULL
                      AND EXTRACT(YEAR FROM COALESCE(fr.expected_date, fr.created_at)) = $1
                    GROUP BY fr.finisher_id, month
                    ORDER BY fr.finisher_id, month
                `, [year]);
            }
            // QC: no auto production data — user inputs manually via targets

            // 3. Get saved KPI targets per user per month
            const targetRows = await db.all(`
                SELECT user_id, month, total_minutes, target_rate, error_count, target_products, target_errors, reward_text, notes
                FROM kpi_production_targets
                WHERE year = $1 AND department = $2
            `, [year, department]);

            // 3b. Get department configs
            const configRows = await db.all(`
                SELECT month, target_rate, target_products, target_errors, eval_rule, reward_text, commitments, supports
                FROM kpi_production_dept_configs
                WHERE year = $1 AND department = $2
            `, [year, department]);

            const deptConfigsMap = {};
            configRows.forEach(c => {
                let commitments = [];
                let supports = [];
                try {
                    commitments = typeof c.commitments === 'string' ? JSON.parse(c.commitments) : (c.commitments || []);
                } catch(e) {}
                try {
                    supports = typeof c.supports === 'string' ? JSON.parse(c.supports) : (c.supports || []);
                } catch(e) {}

                deptConfigsMap[c.month] = {
                    month: c.month,
                    target_rate: parseFloat(c.target_rate || 0),
                    target_products: parseInt(c.target_products || 0, 10),
                    target_errors: parseInt(c.target_errors || 0, 10),
                    eval_rule: c.eval_rule || 'ALL',
                    reward_text: c.reward_text || '',
                    commitments: Array.isArray(commitments) ? commitments : [],
                    supports: Array.isArray(supports) ? supports : [],
                    commitment_evals: [],
                    support_evals: []
                };
            });

            // 3c. Get evaluations per month
            const evalRows = await db.all(`
                SELECT month, item_type, item_index, passed, note
                FROM kpi_production_evaluations
                WHERE year = $1 AND department = $2
                ORDER BY item_index
            `, [year, department]);

            evalRows.forEach(ev => {
                const cfg = deptConfigsMap[ev.month];
                if (!cfg) return;
                const entry = { index: ev.item_index, passed: ev.passed, note: ev.note || '' };
                if (ev.item_type === 'commitment') {
                    cfg.commitment_evals[ev.item_index] = entry;
                } else if (ev.item_type === 'support') {
                    cfg.support_evals[ev.item_index] = entry;
                }
            });

            // Build lookup maps
            const prodMap = {}; // key: `${staff_id}_${month}` → { products_done, total_quantity }
            productionData.forEach(r => {
                const key = `${r.cutter_id}_${r.month}`;
                prodMap[key] = {
                    products_done: r.products_done || 0,
                    total_quantity: r.total_quantity || 0
                };
            });

            const targetMap = {}; // key: `${user_id}_${month}` → { total_minutes, target_rate, error_count, target_products, target_errors, notes }
            targetRows.forEach(r => {
                const key = `${r.user_id}_${r.month}`;
                targetMap[key] = {
                    total_minutes: parseInt(r.total_minutes || 0, 10),
                    target_rate: parseFloat(r.target_rate || 0),
                    error_count: parseInt(r.error_count || 0, 10),
                    target_products: parseInt(r.target_products || 0, 10),
                    target_errors: parseInt(r.target_errors || 0, 10),
                    reward_text: r.reward_text || '',
                    notes: r.notes || ''
                };
            });

            // 4. Build monthly_data structure: 12 months × each staff member
            const monthlyData = {};
            for (let m = 1; m <= 12; m++) {
                const cfg = deptConfigsMap[m] || deptConfigsMap[0] || {};
                const evalRule = cfg.eval_rule || 'ALL';

                const staffData = staff.map(s => {
                    const prodKey = `${s.id}_${m}`;
                    const targetKey = `${s.id}_${m}`;
                    const prod = prodMap[prodKey] || { products_done: 0, total_quantity: 0 };
                    const target = targetMap[targetKey] || { total_minutes: 0, target_rate: 0, error_count: 0, target_products: 0, target_errors: 0, reward_text: '', notes: '' };

                    // Individual team target values (return 0 if unconfigured so UI shows '—' until configured)
                    const effectiveTargetProducts = target.target_products > 0 ? target.target_products : 0;
                    const effectiveTargetErrors = target.target_errors > 0 ? target.target_errors : 0;
                    const effectiveTargetRate = target.target_rate > 0 ? target.target_rate : 0;

                    const actualRate = target.total_minutes > 0 ? prod.products_done / target.total_minutes : 0;
                    
                    // Evaluate 3 KPI criteria using effective targets ONLY if staff has logged working minutes (> 0)
                    let achieved = null;
                    if (target.total_minutes > 0) {
                        const rateAchieved = effectiveTargetRate > 0 ? actualRate >= effectiveTargetRate : null;
                        const prodAchieved = effectiveTargetProducts > 0 ? prod.products_done >= effectiveTargetProducts : null;
                        const errAchieved = effectiveTargetErrors > 0 ? target.error_count <= effectiveTargetErrors : null;

                        if (evalRule === 'ANY') {
                            achieved = (rateAchieved === true || prodAchieved === true || errAchieved === true);
                        } else {
                            // ALL rule: any explicit false means overall false
                            if (rateAchieved === false || prodAchieved === false || errAchieved === false) {
                                achieved = false;
                            } else if (rateAchieved === true || prodAchieved === true || errAchieved === true) {
                                achieved = true;
                            }
                        }
                    }

                    return {
                        user_id: s.id,
                        full_name: s.full_name,
                        products_done: prod.products_done,
                        total_quantity: prod.total_quantity,
                        total_minutes: target.total_minutes,
                        target_rate: effectiveTargetRate,
                        error_count: target.error_count || 0,
                        target_products: effectiveTargetProducts,
                        target_errors: effectiveTargetErrors,
                        actual_rate: Math.round(actualRate * 1000000) / 1000000, // 6 decimal places
                        achieved: achieved,
                        reward_text: target.reward_text || cfg.reward_text || '',
                        notes: target.notes
                    };
                });

                // Monthly totals
                const totalProducts = staffData.reduce((sum, s) => sum + s.products_done, 0);
                const totalMinutes = staffData.reduce((sum, s) => sum + s.total_minutes, 0);
                const totalErrors = staffData.reduce((sum, s) => sum + (s.error_count || 0), 0);
                const totalTargetProducts = staffData.reduce((sum, s) => sum + (s.target_products || 0), 0) || (deptConfigsMap[m]?.target_products || 0);
                const totalTargetErrors = staffData.reduce((sum, s) => sum + (s.target_errors || 0), 0) || (deptConfigsMap[m]?.target_errors || 0);
                const targetRates = staffData.map(s => s.target_rate).filter(r => r > 0);
                const avgTargetRate = targetRates.length > 0 ? (targetRates.reduce((a, b) => a + b, 0) / targetRates.length) : (deptConfigsMap[m]?.target_rate || 0);
                const avgRate = totalMinutes > 0 ? totalProducts / totalMinutes : 0;
                const achievedCount = staffData.filter(s => s.achieved === true).length;
                const notAchievedCount = staffData.filter(s => s.achieved === false).length;
                const pendingCount = staffData.filter(s => s.achieved === null).length;

                monthlyData[m] = {
                    month: m,
                    staff: staffData,
                    totals: {
                        total_products: totalProducts,
                        total_minutes: totalMinutes,
                        total_errors: totalErrors,
                        total_target_products: totalTargetProducts,
                        total_target_errors: totalTargetErrors,
                        avg_target_rate: Math.round(avgTargetRate * 1000000) / 1000000,
                        avg_rate: Math.round(avgRate * 1000000) / 1000000,
                        achieved_count: achievedCount,
                        not_achieved_count: notAchievedCount,
                        pending_count: pendingCount
                    },
                    config: deptConfigsMap[m] || null
                };
            }

            // 5. Yearly summary
            let yearlyAchieved = 0;
            let yearlyNotAchieved = 0;
            let yearlyPending = 0;
            let yearlyProducts = 0;
            let yearlyMinutes = 0;
            let yearlyErrors = 0;
            let yearlyTargetProducts = 0;
            let yearlyTargetErrors = 0;
            let yearlyTargetRateSum = 0;
            let yearlyTargetRateCount = 0;

            for (let m = 1; m <= 12; m++) {
                const t = monthlyData[m].totals;
                yearlyAchieved += t.achieved_count;
                yearlyNotAchieved += t.not_achieved_count;
                yearlyPending += t.pending_count;
                yearlyProducts += t.total_products;
                yearlyMinutes += t.total_minutes;
                yearlyErrors += t.total_errors;
                yearlyTargetProducts += t.total_target_products;
                yearlyTargetErrors += t.total_target_errors;
                if (t.avg_target_rate > 0) {
                    yearlyTargetRateSum += t.avg_target_rate;
                    yearlyTargetRateCount++;
                }
            }

            const yearlyAvgTargetRate = yearlyTargetRateCount > 0 ? (yearlyTargetRateSum / yearlyTargetRateCount) : 0;

            return {
                year,
                department,
                staff,
                dept_configs: deptConfigsMap,
                target_rows: targetRows,
                monthly_data: monthlyData,
                yearly_summary: {
                    total_products: yearlyProducts,
                    total_minutes: yearlyMinutes,
                    total_errors: yearlyErrors,
                    total_target_products: yearlyTargetProducts,
                    total_target_errors: yearlyTargetErrors,
                    avg_target_rate: Math.round(yearlyAvgTargetRate * 1000000) / 1000000,
                    avg_rate: yearlyMinutes > 0 ? Math.round((yearlyProducts / yearlyMinutes) * 1000000) / 1000000 : 0,
                    achieved_count: yearlyAchieved,
                    not_achieved_count: yearlyNotAchieved,
                    pending_count: yearlyPending
                }
            };
        } catch (err) {
            console.error('[KPI Production] Stats error:', err);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ========== 2. POST /api/kpi-production/targets ==========
    fastify.post('/api/kpi-production/targets', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            // Check permission: giam_doc, admin OR user permission for kpi_san_xuat (can_create = 1)
            const uId = req.user.id;
            const uRole = req.user.role;

            let hasPerm = ['giam_doc', 'admin'].includes(uRole);
            if (!hasPerm) {
                const userPermRow = await db.get(`
                    SELECT can_create, can_edit FROM permissions 
                    WHERE target_type = 'user' AND target_id = $1 AND feature = 'kpi_san_xuat'
                    LIMIT 1
                `, [uId]);
                
                if (userPermRow) {
                    // Allow if user has can_create OR can_edit permission
                    hasPerm = userPermRow.can_create === 1 || userPermRow.can_create === true
                          || userPermRow.can_edit === 1 || userPermRow.can_edit === true;
                } else {
                    hasPerm = ['quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(uRole);
                }
            }

            if (!hasPerm) {
                return reply.code(403).send({ error: 'Bạn không có quyền điền hoặc chỉnh sửa Phút Làm và Số Lỗi' });
            }

            const { year, month, department, targets } = req.body;
            // targets = [{ user_id, total_minutes, target_rate, error_count, target_products, target_errors, notes }]
            console.log(`[KPI Prod TARGETS] POST received: year=${year}, month=${month}, dept=${department}, targets_count=${targets?.length}, targets=`, JSON.stringify(targets?.map(t => ({uid: t.user_id, rate: t.target_rate, reward: t.reward_text}))));

            if (!year || month === undefined || month === null || !targets || !Array.isArray(targets)) {
                console.log(`[KPI Prod TARGETS] VALIDATION FAILED: year=${year}, month=${month}, targets_is_array=${Array.isArray(targets)}`);
                return reply.code(400).send({ error: 'Dữ liệu không hợp lệ' });
            }

            // Lock input updates if month is already evaluated
            const hasEvalsRow = await db.get(`
                SELECT id FROM kpi_production_evaluations 
                WHERE year = $1 AND month = $2 AND department = $3 LIMIT 1
            `, [year, month, department || 'cutting']);

            if (hasEvalsRow) {
                return reply.code(400).send({ error: 'Tháng này đã hoàn tất đánh giá cam kết, không thể chỉnh sửa chỉ số nữa!' });
            }

            let saved = 0;
            for (const t of targets) {
                if (!t.user_id) continue;
                await db.run(`
                    INSERT INTO kpi_production_targets (year, month, department, user_id, total_minutes, target_rate, error_count, target_products, target_errors, reward_text, notes, created_by, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
                    ON CONFLICT (year, month, department, user_id) 
                    DO UPDATE SET 
                        total_minutes = EXCLUDED.total_minutes,
                        target_rate = EXCLUDED.target_rate,
                        error_count = EXCLUDED.error_count,
                        target_products = EXCLUDED.target_products,
                        target_errors = EXCLUDED.target_errors,
                        reward_text = EXCLUDED.reward_text,
                        notes = EXCLUDED.notes,
                        updated_at = NOW()
                `, [
                    year,
                    month,
                    department || 'cutting',
                    t.user_id,
                    parseInt(t.total_minutes || 0, 10),
                    parseFloat(t.target_rate || 0),
                    parseInt(t.error_count || 0, 10),
                    parseInt(t.target_products || 0, 10),
                    parseInt(t.target_errors || 0, 10),
                    t.reward_text || '',
                    t.notes || '',
                    req.user.id
                ]);
                saved++;
            }

            return { success: true, saved };
        } catch (err) {
            console.error('[KPI Production] Save targets error:', err);
            return reply.code(500).send({ error: err.message });
        }
    });

    fastify.get('/api/kpi-production/benchmark', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const year = parseInt(req.query.year || new Date().getFullYear(), 10);
            const department = req.query.department || 'cutting';

            const startBaseYear = 2023;
            const recentYears = [];
            for (let y = year - 1; y >= startBaseYear; y--) {
                recentYears.push(y);
            }
            if (recentYears.length === 0) recentYears.push(year - 1);
            const yearsData = {};

            for (const y of recentYears) {
                // 1. Query actual products done by month for department in year y
                let prodRows = [];
                if (department === 'cutting') {
                    prodRows = await db.all(`
                        SELECT EXTRACT(MONTH FROM COALESCE(cut_done_at, cut_date, created_at))::int AS month,
                               SUM(COALESCE(cut_quantity, 0))::int AS products_done
                        FROM cutting_records
                        WHERE is_cut_done = true AND COALESCE(phoi_index, 0) = 0
                          AND EXTRACT(YEAR FROM COALESCE(cut_done_at, cut_date, created_at)) = ?
                        GROUP BY month
                    `, [y]);
                } else if (department === 'printing') {
                    prodRows = await db.all(`
                        SELECT EXTRACT(MONTH FROM COALESCE(pr.print_done_at, pr.print_date, pr.created_at))::int AS month,
                               SUM(CASE
                                   WHEN COALESCE(pr.is_discarded, false) = true THEN 0
                                   WHEN COALESCE(oi.production_cancelled, false) = true THEN 0
                                   WHEN UPPER(COALESCE(o.order_code, '')) LIKE '%GCPET%' 
                                     OR UPPER(COALESCE(o.order_code, '')) LIKE '%GCTEM%' THEN 0
                                   ELSE COALESCE(pr.order_quantity, 0)
                               END)::int AS products_done
                        FROM printing_records pr
                        LEFT JOIN dht_orders o ON pr.dht_order_id = o.id
                        LEFT JOIN dht_order_items oi ON oi.id = pr.order_item_id
                        WHERE pr.is_print_done = true
                          AND EXTRACT(YEAR FROM COALESCE(pr.print_done_at, pr.print_date, pr.created_at)) = ?
                        GROUP BY month
                    `, [y]);
                } else if (department === 'pressing') {
                    prodRows = await db.all(`
                        SELECT EXTRACT(MONTH FROM COALESCE(pr.press_date, pr.created_at))::int AS month,
                               SUM(CASE
                                   WHEN COALESCE(oi.production_cancelled, false) = true THEN 0
                                   WHEN COALESCE(pr.is_discarded, false) = true THEN 0
                                   ELSE COALESCE(pr.order_quantity, 0)
                               END)::int AS products_done
                        FROM pressing_records pr
                        LEFT JOIN dht_order_items oi ON oi.id = pr.order_item_id
                        WHERE pr.is_reported = true
                          AND EXTRACT(YEAR FROM COALESCE(pr.press_date, pr.created_at)) = ?
                        GROUP BY month
                    `, [y]);
                } else if (department === 'sewing') {
                    prodRows = await db.all(`
                        SELECT EXTRACT(MONTH FROM COALESCE(sr.done_date, sr.handover_date, sr.created_at))::int AS month,
                               SUM(CASE
                                   WHEN COALESCE(oi.production_cancelled, false) = true THEN 0
                                   WHEN sr.notes LIKE '%[HỦY BỎ - BÙ PHÍ]%' OR sr.notes LIKE '%[ĐÃ HỦY - BÙ PHÍ]%' THEN 0
                                   ELSE COALESCE(sr.quantity, 0)
                               END)::int AS products_done
                        FROM sewing_records sr
                        LEFT JOIN dht_order_items oi ON oi.id = sr.order_item_id
                        WHERE sr.done_date IS NOT NULL
                          AND EXTRACT(YEAR FROM COALESCE(sr.done_date, sr.handover_date, sr.created_at)) = ?
                        GROUP BY month
                    `, [y]);
                } else if (department === 'finishing') {
                    prodRows = await db.all(`
                        SELECT EXTRACT(MONTH FROM COALESCE(fr.expected_date, fr.created_at))::int AS month,
                               SUM(CASE
                                   WHEN COALESCE(oi_f.production_cancelled, false) = true THEN 0
                                   ELSE COALESCE(NULLIF(fr.quantity, 0), oi_f.quantity, 0)
                               END)::int AS products_done
                        FROM finishing_records fr
                        LEFT JOIN sewing_records sr ON fr.sewing_record_id = sr.id
                        LEFT JOIN dht_order_items oi_f ON oi_f.id = COALESCE(fr.order_item_id, sr.order_item_id)
                        WHERE fr.finisher_id IS NOT NULL
                          AND EXTRACT(YEAR FROM COALESCE(fr.expected_date, fr.created_at)) = ?
                        GROUP BY month
                    `, [y]);
                }

                // 2. Query actual minutes & actual errors & target products from kpi_production_targets for year y
                const actualTargets = await db.all(`
                    SELECT month, SUM(total_minutes)::int AS total_minutes, SUM(error_count)::int AS error_count, SUM(target_products)::int AS target_products
                    FROM kpi_production_targets
                    WHERE year = ? AND department = ? AND month >= 1 AND month <= 12
                    GROUP BY month
                `, [y, department]);

                // Map actuals by month
                const months = {};
                for (let m = 1; m <= 12; m++) months[m] = 0;
                let totalActualProducts = 0;
                let totalActualErrors = 0;
                let totalActualMinutes = 0;

                prodRows.forEach(pr => {
                    const m = pr.month;
                    if (m >= 1 && m <= 12) {
                        months[m] = parseInt(pr.products_done || 0, 10);
                        totalActualProducts += months[m];
                    }
                });

                const monthErrors = {};
                const monthMinutes = {};
                const monthRates = {};
                for (let m = 1; m <= 12; m++) {
                    monthErrors[m] = 0;
                    monthMinutes[m] = 0;
                    monthRates[m] = 0;
                }

                actualTargets.forEach(at => {
                    const m = at.month;
                    if (m >= 1 && m <= 12) {
                        const err = parseInt(at.error_count || 0, 10);
                        const mins = parseInt(at.total_minutes || 0, 10);
                        monthErrors[m] = err;
                        monthMinutes[m] = mins;
                        totalActualErrors += err;
                        totalActualMinutes += mins;
                    }
                });

                for (let m = 1; m <= 12; m++) {
                    if (monthMinutes[m] > 0 && months[m] > 0) {
                        monthRates[m] = months[m] / monthMinutes[m];
                    }
                }

                // Fallback 1: If actual production done is 0 for year y, check targets of year y
                if (totalActualProducts === 0 && actualTargets.length > 0) {
                    actualTargets.forEach(at => {
                        const m = at.month;
                        if (m >= 1 && m <= 12) {
                            months[m] = parseInt(at.target_products || 0, 10);
                            totalActualProducts += months[m];
                        }
                    });
                }

                // Fallback 2: Check if year y itself has a department configuration in kpi_production_dept_configs
                if (totalActualProducts === 0) {
                    const yCfg = await db.get(`
                        SELECT target_products, target_errors, target_rate
                        FROM kpi_production_dept_configs
                        WHERE year = $1 AND department = $2 AND month = 0
                    `, [y, department]);
                    if (yCfg && yCfg.target_products > 0) {
                        totalActualProducts = parseInt(yCfg.target_products || 0, 10);
                        if (totalActualErrors === 0) totalActualErrors = parseInt(yCfg.target_errors || 0, 10);
                        const mBase = Math.floor(totalActualProducts / 12);
                        const mRem = totalActualProducts % 12;
                        for (let m = 1; m <= 12; m++) {
                            months[m] = mBase + (m <= mRem ? 1 : 0);
                        }
                    }
                }

                const quarters = { 1: 0, 2: 0, 3: 0, 4: 0 };
                for (let m = 1; m <= 12; m++) {
                    const q = Math.ceil(m / 3);
                    quarters[q] += months[m];
                }

                const qSum = quarters[1] + quarters[2] + quarters[3] + quarters[4];
                let qRatios = { 1: 0.25, 2: 0.25, 3: 0.25, 4: 0.25 };
                if (qSum > 0) {
                    qRatios = {
                        1: quarters[1] / qSum,
                        2: quarters[2] / qSum,
                        3: quarters[3] / qSum,
                        4: quarters[4] / qSum
                    };
                }

                const actualRate = totalActualMinutes > 0 ? (totalActualProducts / totalActualMinutes) : 0;

                yearsData[y] = {
                    year: y,
                    target_products: totalActualProducts,
                    target_errors: totalActualErrors,
                    target_rate: actualRate,
                    quarters: quarters,
                    q_ratios: qRatios,
                    months: months,
                    month_errors: monthErrors,
                    month_rates: monthRates
                };
            }

            const prevYear = year - 1;
            const prevYearData = yearsData[prevYear] || {};

            return {
                year,
                prev_year: prevYear,
                department,
                history_years: recentYears,
                years_data: yearsData,
                prev_config: prevYearData.cfg || null,
                prev_year_target_products: prevYearData.target_products || 0,
                prev_year_target_errors: prevYearData.target_errors || 0,
                prev_year_target_rate: prevYearData.target_rate || 0,
                prev_quarters: prevYearData.quarters || { 1: 0, 2: 0, 3: 0, 4: 0 },
                q_ratios: prevYearData.q_ratios || { 1: 0.25, 2: 0.25, 3: 0.25, 4: 0.25 },
                prev_months: prevYearData.months || {}
            };
        } catch(err) {
            console.error('[KPI Production] Benchmark error:', err);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ========== 3. GET /api/kpi-production/config ==========
    fastify.get('/api/kpi-production/config', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const year = parseInt(req.query.year || new Date().getFullYear(), 10);
            const month = parseInt(req.query.month || 0, 10);
            const department = req.query.department || 'cutting';

            const config = await db.get(`
                SELECT year, month, department, target_rate, target_products, target_errors, eval_rule, reward_text, commitments, supports
                FROM kpi_production_dept_configs
                WHERE year = $1 AND month = $2 AND department = $3
            `, [year, month, department]);

            if (!config) {
                return {
                    year,
                    month,
                    department,
                    target_rate: 0,
                    target_products: 0,
                    target_errors: 0,
                    eval_rule: 'ALL',
                    reward_text: '',
                    commitments: [],
                    supports: []
                };
            }

            let commitments = [];
            let supports = [];
            try {
                commitments = typeof config.commitments === 'string' ? JSON.parse(config.commitments) : (config.commitments || []);
            } catch(e) {}
            try {
                supports = typeof config.supports === 'string' ? JSON.parse(config.supports) : (config.supports || []);
            } catch(e) {}

            return {
                year: config.year,
                month: config.month,
                department: config.department,
                target_rate: parseFloat(config.target_rate || 0),
                target_products: parseInt(config.target_products || 0, 10),
                target_errors: parseInt(config.target_errors || 0, 10),
                eval_rule: config.eval_rule || 'ALL',
                reward_text: config.reward_text || '',
                commitments: Array.isArray(commitments) ? commitments : [],
                supports: Array.isArray(supports) ? supports : []
            };
        } catch (err) {
            console.error('[KPI Production] Get config error:', err);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ========== 4. POST /api/kpi-production/config ==========
    fastify.post('/api/kpi-production/config', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const allowedRoles = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'];
            if (!allowedRoles.includes(req.user.role)) {
                return reply.code(403).send({ error: 'Bạn không có quyền cấu hình KPI sản xuất' });
            }

            const {
                year,
                month = 0,
                department = 'cutting',
                target_rate = 0,
                target_products = 0,
                target_errors = 0,
                eval_rule = 'ALL',
                reward_text = '',
                commitments = [],
                supports = [],
                apply_to_all_staff = false
            } = req.body;

            if (!year) {
                return reply.code(400).send({ error: 'Năm không hợp lệ' });
            }

            const commitmentsJson = JSON.stringify(Array.isArray(commitments) ? commitments : []);
            const supportsJson = JSON.stringify(Array.isArray(supports) ? supports : []);

            // Safety guards: ensure numeric values are never NaN
            const safeTargetRate = parseFloat(target_rate) || 0;
            const safeTargetProducts = parseInt(target_products) || 0;
            const safeTargetErrors = parseInt(target_errors) || 0;
            const safeMonth = parseInt(month) || 0;
            console.log(`[KPI Prod CONFIG] POST: year=${year}, month=${safeMonth}, dept=${department}, rate=${safeTargetRate}, products=${safeTargetProducts}, errors=${safeTargetErrors}`);

            const configMonths = [safeMonth];
            for (const mVal of configMonths) {
                await db.run(`
                    INSERT INTO kpi_production_dept_configs (year, month, department, target_rate, target_products, target_errors, eval_rule, reward_text, commitments, supports, created_by, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
                    ON CONFLICT (year, month, department)
                    DO UPDATE SET
                        target_rate = EXCLUDED.target_rate,
                        target_products = EXCLUDED.target_products,
                        target_errors = EXCLUDED.target_errors,
                        eval_rule = EXCLUDED.eval_rule,
                        reward_text = EXCLUDED.reward_text,
                        commitments = EXCLUDED.commitments,
                        supports = EXCLUDED.supports,
                        updated_at = NOW()
                `, [
                    year,
                    mVal,
                    department,
                    safeTargetRate,
                    safeTargetProducts,
                    safeTargetErrors,
                    eval_rule,
                    reward_text || '',
                    commitmentsJson,
                    supportsJson,
                    req.user.id
                ]);
            }

            // Bulk apply target_rate, target_products, target_errors to staff if requested
            if (apply_to_all_staff) {
                let staff = [];
                if (department === 'cutting') {
                    staff = await db.all(`
                        SELECT u.id
                        FROM users u
                        LEFT JOIN departments d ON u.department_id = d.id
                        WHERE u.status = 'active'
                          AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
                          AND (LOWER(d.name) LIKE '%cắt%' OR LOWER(d.name) LIKE '%cat%')
                    `);
                }

                const targetRateNum = safeTargetRate;
                const targetProductsNum = safeTargetProducts;
                const targetErrorsNum = safeTargetErrors;
                const targetMonths = safeMonth > 0 ? [safeMonth] : [1,2,3,4,5,6,7,8,9,10,11,12];

                for (const s of staff) {
                    for (const m of targetMonths) {
                        await db.run(`
                            INSERT INTO kpi_production_targets (year, month, department, user_id, total_minutes, target_rate, target_products, target_errors, notes, created_by, updated_at)
                            VALUES ($1, $2, $3, $4, 0, $5, $6, $7, '', $8, NOW())
                            ON CONFLICT (year, month, department, user_id)
                            DO UPDATE SET
                                target_rate = EXCLUDED.target_rate,
                                target_products = EXCLUDED.target_products,
                                target_errors = EXCLUDED.target_errors,
                                updated_at = NOW()
                        `, [year, m, department, s.id, targetRateNum, targetProductsNum, targetErrorsNum, req.user.id]);
                    }
                }
            }

            return { success: true, message: 'Đã lưu cấu hình KPI & Cam kết thành công' };
        } catch (err) {
            console.error('[KPI Production] Save config error:', err);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ========== 5. POST /api/kpi-production/evaluations ==========
    fastify.post('/api/kpi-production/evaluations', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { year, month, department, reviews } = req.body;
            if (!year || !month || !Array.isArray(reviews)) {
                return reply.code(400).send({ error: 'Missing year, month, or reviews array' });
            }

            for (const r of reviews) {
                await db.run(`
                    INSERT INTO kpi_production_evaluations (year, month, department, item_type, item_index, passed, note, created_by, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                    ON CONFLICT (year, month, department, item_type, item_index)
                    DO UPDATE SET
                        passed = EXCLUDED.passed,
                        note = EXCLUDED.note,
                        created_by = EXCLUDED.created_by,
                        updated_at = NOW()
                `, [
                    year,
                    month,
                    department || 'cutting',
                    r.item_type,
                    r.item_index,
                    r.passed || false,
                    r.note || '',
                    req.user.id
                ]);
            }

            return { success: true, message: 'Đã lưu đánh giá cam kết thành công' };
        } catch (err) {
            console.error('[KPI Production] Save evaluations error:', err);
            return reply.code(500).send({ error: err.message });
        }
    });
};
