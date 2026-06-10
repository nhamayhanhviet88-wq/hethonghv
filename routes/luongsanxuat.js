// ========== LƯƠNG SẢN XUẤT — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try {
        // 1. cutting_records
        await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS salary NUMERIC DEFAULT 0`);

        // 2. pressing_records
        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS salary NUMERIC DEFAULT 0`);

        // Sync press_salary to salary for pressing
        await db.exec(`UPDATE pressing_records SET salary = COALESCE(press_salary, 0) WHERE salary IS NULL OR salary = 0`);
    } catch(e) {
        console.error('[LSX] Migration error:', e.message);
    }

    // ========== HELPERS ==========
    const MGMT_ROLES = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
    async function isSalaryManager(req) {
        if (MGMT_ROLES.includes(req.user.role)) return true;
        const u = await db.get(`
            SELECT u.id, d.name AS dept_name, d.code AS dept_code
            FROM users u 
            LEFT JOIN departments d ON u.department_id = d.id 
            WHERE u.id = $1
        `, [req.user.id]);
        if (u && u.dept_name) {
            const n = u.dept_name.toLowerCase();
            const c = (u.dept_code || '').toLowerCase();
            if (
                n.includes('kế toán') || c.includes('ketoan') ||
                n.includes('thủ quỹ') || c.includes('thuquy') ||
                n.includes('quản lý xưởng') || n.includes('qlx') ||
                n.includes('nhân sự') || n.includes('hành chính')
            ) return true;
        }
        return false;
    }

    // ========== TREE ==========
    fastify.get('/api/production-salary/tree', { preHandler: [authenticate] }, async (req) => {
        const isMgr = await isSalaryManager(req);
        let whereCutting = '1=1', wherePressing = '1=1', whereSewing = '1=1';
        const params = [];
        
        // Non-managers only see their own records
        if (!isMgr && !['quan_ly', 'truong_phong'].includes(req.user.role)) {
            params.push(req.user.id);
            whereCutting = 'cr.cutter_id = $1';
            wherePressing = 'pr.presser_id = $1';
            whereSewing = 'sr.sewer_id = $1';
        }

        const query = `
            SELECT 
                EXTRACT(YEAR FROM work_date)::int AS year,
                EXTRACT(MONTH FROM work_date)::int AS month,
                dept,
                worker_id,
                contractor_id,
                worker_name,
                contractor_name,
                COUNT(*)::int AS count,
                SUM(salary)::numeric AS total_salary
            FROM (
                SELECT 
                    'cutting' AS dept,
                    COALESCE(cr.cut_date, cr.created_at::date) AS work_date,
                    cr.cutter_id AS worker_id,
                    NULL::integer AS contractor_id,
                    u.full_name AS worker_name,
                    NULL::text AS contractor_name,
                    COALESCE(cr.salary, 0) AS salary
                FROM cutting_records cr
                LEFT JOIN users u ON cr.cutter_id = u.id
                WHERE ${whereCutting}
                  AND cr.is_cut_done = true
                  AND cr.id = (
                      SELECT sub.id FROM cutting_records sub
                      WHERE sub.order_item_id = cr.order_item_id
                        AND sub.is_cut_done = true
                        AND ((COALESCE(sub.cut_warning, '') LIKE '%Cắt bù%') = (COALESCE(cr.cut_warning, '') LIKE '%Cắt bù%'))
                      ORDER BY COALESCE(NULLIF(SUBSTRING(sub.product_name FROM '— P([0-9]+)'), ''), '1')::integer ASC, sub.id ASC
                      LIMIT 1
                  )

                UNION ALL

                SELECT 
                    'pressing' AS dept,
                    COALESCE(pr.press_date, pr.created_at::date) AS work_date,
                    pr.presser_id AS worker_id,
                    NULL::integer AS contractor_id,
                    u.full_name AS worker_name,
                    NULL::text AS contractor_name,
                    COALESCE(pr.salary, 0) AS salary
                FROM pressing_records pr
                LEFT JOIN users u ON pr.presser_id = u.id
                WHERE ${wherePressing}
                  AND pr.is_reported = true

                UNION ALL

                SELECT 
                    'sewing' AS dept,
                    COALESCE(sr.handover_date, sr.created_at::date) AS work_date,
                    sr.sewing_team_id AS worker_id,
                    sr.contractor_id,
                    dt.name AS worker_name,
                    c.name AS contractor_name,
                    COALESCE(sr.salary, 0) AS salary
                FROM sewing_records sr
                LEFT JOIN departments dt ON sr.sewing_team_id = dt.id
                LEFT JOIN sewing_contractors c ON sr.contractor_id = c.id
                WHERE ${whereSewing}
                  AND sr.done_date IS NOT NULL
                  AND (sr.sewing_team_id IS NOT NULL OR sr.contractor_id IS NOT NULL)
            ) sub
            GROUP BY year, month, dept, worker_id, contractor_id, worker_name, contractor_name
            ORDER BY year DESC, month DESC, dept, worker_name, contractor_name
        `;

        const rows = await db.all(query, params);

        // Group rows into hierarchical tree format
        const yearMap = {};
        let grandTotal = 0;
        let grandApproved = 0;
        let grandPending = 0;

        for (const r of rows) {
            const yr = r.year || 2026;
            const mo = r.month || 1;
            
            if (!yearMap[yr]) {
                yearMap[yr] = { year: yr, count: 0, total_salary: 0, depts: {} };
            }
            
            const yNode = yearMap[yr];
            yNode.count += r.count;
            yNode.total_salary += Number(r.total_salary) || 0;
            grandTotal += Number(r.total_salary) || 0;

            if (!yNode.depts[r.dept]) {
                yNode.depts[r.dept] = { dept: r.dept, count: 0, total_salary: 0, workers: [] };
            }

            const dNode = yNode.depts[r.dept];
            dNode.count += r.count;
            dNode.total_salary += Number(r.total_salary) || 0;

            // Worker ID can be user or contractor
            const isContractor = !!r.contractor_id;
            const wId = isContractor ? r.contractor_id : r.worker_id;
            const wName = isContractor ? (r.contractor_name || 'Gia công') : (r.worker_name || 'Chưa PC');
            
            let wNode = dNode.workers.find(x => x.id === wId && x.is_contractor === isContractor);
            if (!wNode) {
                wNode = { id: wId, name: wName, is_contractor: isContractor, count: 0, total_salary: 0, months: {} };
                dNode.workers.push(wNode);
            }
            wNode.count += r.count;
            wNode.total_salary += Number(r.total_salary) || 0;

            const mKey = `${yr}_${mo}`;
            if (!wNode.months[mKey]) {
                wNode.months[mKey] = { year: yr, month: mo, count: 0, total_salary: 0 };
            }
            wNode.months[mKey].count += r.count;
            wNode.months[mKey].total_salary += Number(r.total_salary) || 0;
        }

        // Convert structures to arrays
        const tree = Object.values(yearMap).map(y => {
            const deptsArr = Object.values(y.depts).map(d => {
                const workersArr = d.workers.map(w => {
                    return {
                        ...w,
                        months: Object.values(w.months).sort((a,b) => b.month - a.month)
                    };
                }).sort((a,b) => a.name.localeCompare(b.name));
                return { ...d, workers: workersArr };
            });
            return { ...y, depts: deptsArr };
        });

        // Compute grand status stats
        let statusWhere = 'WHERE 1=1';
        const statusParams = [];
        if (!isMgr && !['quan_ly', 'truong_phong'].includes(req.user.role)) {
            statusParams.push(req.user.id);
            statusWhere = 'WHERE worker_id = $1';
        }

        const stats = await db.get(`
            SELECT 
                COALESCE(SUM(salary), 0)::numeric AS total,
                COALESCE(SUM(salary) FILTER (WHERE is_approved), 0)::numeric AS approved,
                COALESCE(SUM(salary) FILTER (WHERE NOT is_approved), 0)::numeric AS pending,
                COUNT(*)::int AS count
            FROM (
                SELECT cutter_id AS worker_id, salary, salary_approved AS is_approved 
                FROM cutting_records cr
                WHERE cr.is_cut_done = true
                  AND cr.id = (
                    SELECT sub.id FROM cutting_records sub
                    WHERE sub.order_item_id = cr.order_item_id
                      AND sub.is_cut_done = true
                      AND ((COALESCE(sub.cut_warning, '') LIKE '%Cắt bù%') = (COALESCE(cr.cut_warning, '') LIKE '%Cắt bù%'))
                    ORDER BY COALESCE(NULLIF(SUBSTRING(sub.product_name FROM '— P([0-9]+)'), ''), '1')::integer ASC, sub.id ASC
                    LIMIT 1
                )
                UNION ALL
                SELECT presser_id AS worker_id, salary, salary_approved AS is_approved FROM pressing_records WHERE is_reported = true
                UNION ALL
                SELECT sewer_id AS worker_id, salary, salary_approved AS is_approved FROM sewing_records WHERE done_date IS NOT NULL AND (sewing_team_id IS NOT NULL OR contractor_id IS NOT NULL)
            ) sub
            ${statusWhere}
        `, statusParams);

        return { tree, stats: stats || { total: 0, approved: 0, pending: 0, count: 0 }, is_manager: isMgr };
    });

    // ========== LIST ==========
    fastify.get('/api/production-salary/records', { preHandler: [authenticate] }, async (req) => {
        const isMgr = await isSalaryManager(req);
        const { year, month, dept, worker_id, contractor_id, status, search } = req.query;

        let whereCutting = '1=1', wherePressing = '1=1', whereSewing = '1=1';
        const params = [];
        let idx = 1;

        // Force non-managers to only see themselves
        if (!isMgr && !['quan_ly', 'truong_phong'].includes(req.user.role)) {
            const userId = req.user.id;
            whereCutting += ` AND cr.cutter_id = $${idx}`;
            wherePressing += ` AND pr.presser_id = $${idx}`;
            whereSewing += ` AND sr.sewer_id = $${idx}`;
            params.push(userId);
            idx++;
        } else {
            // Managers can filter by worker
            if (worker_id) {
                const wId = Number(worker_id);
                whereCutting += ` AND cr.cutter_id = $${idx}`;
                wherePressing += ` AND pr.presser_id = $${idx}`;
                whereSewing += ` AND sr.sewing_team_id = $${idx}`;
                params.push(wId);
                idx++;
            }
            if (contractor_id) {
                const cId = Number(contractor_id);
                whereCutting += ` AND 1=0`; // cutting has no contractors
                wherePressing += ` AND 1=0`; // pressing has no contractors
                whereSewing += ` AND sr.contractor_id = $${idx}`;
                params.push(cId);
                idx++;
            }
        }

        // Filter by Year
        if (year) {
            const yr = Number(year);
            whereCutting += ` AND EXTRACT(YEAR FROM COALESCE(cr.cut_date, cr.created_at)) = $${idx}`;
            wherePressing += ` AND EXTRACT(YEAR FROM COALESCE(pr.press_date, pr.created_at)) = $${idx}`;
            whereSewing += ` AND EXTRACT(YEAR FROM COALESCE(sr.handover_date, sr.created_at)) = $${idx}`;
            params.push(yr);
            idx++;
        }

        // Filter by Month
        if (month) {
            const mo = Number(month);
            whereCutting += ` AND EXTRACT(MONTH FROM COALESCE(cr.cut_date, cr.created_at)) = $${idx}`;
            wherePressing += ` AND EXTRACT(MONTH FROM COALESCE(pr.press_date, pr.created_at)) = $${idx}`;
            whereSewing += ` AND EXTRACT(MONTH FROM COALESCE(sr.handover_date, sr.created_at)) = $${idx}`;
            params.push(mo);
            idx++;
        }

        // Filter by approval status
        if (status === 'approved') {
            whereCutting += ` AND cr.salary_approved = true`;
            wherePressing += ` AND pr.salary_approved = true`;
            whereSewing += ` AND sr.salary_approved = true`;
        } else if (status === 'pending') {
            whereCutting += ` AND cr.salary_approved = false`;
            wherePressing += ` AND pr.salary_approved = false`;
            whereSewing += ` AND sr.salary_approved = false`;
        }

        // Filter by search string
        if (search) {
            const sStr = `%${search}%`;
            whereCutting += ` AND (cr.product_name ILIKE $${idx} OR o.order_code ILIKE $${idx})`;
            wherePressing += ` AND (pr.product_name ILIKE $${idx} OR o.order_code ILIKE $${idx})`;
            whereSewing += ` AND (sr.product_name ILIKE $${idx} OR o.order_code ILIKE $${idx})`;
            params.push(sStr);
            idx++;
        }

        const positions = await db.all(`SELECT key_code FROM pressing_positions ORDER BY display_order ASC, id ASC`);
        let selectColsCutting = '';
        let selectColsPressing = '';
        let selectColsSewing = '';

        positions.forEach(pos => {
            const qtyCol = pos.key_code;
            const prcCol = qtyCol.startsWith('pos_') && !['pos_chest_arm', 'pos_back_belly', 'pos_protective', 'pos_packaging', 'pos_other'].includes(qtyCol)
                ? 'price_' + qtyCol
                : qtyCol.replace('pos_', 'price_');

            if (qtyCol === 'pos_other') {
                selectColsCutting += `, NULL::text AS ${qtyCol}, 0::numeric AS ${prcCol}`;
                selectColsSewing += `, NULL::text AS ${qtyCol}, 0::numeric AS ${prcCol}`;
                selectColsPressing += `, pr.${qtyCol}::text AS ${qtyCol}, COALESCE(pr.${prcCol}, 0) AS ${prcCol}`;
            } else {
                selectColsCutting += `, NULL::numeric AS ${qtyCol}, 0::numeric AS ${prcCol}`;
                selectColsSewing += `, NULL::numeric AS ${qtyCol}, 0::numeric AS ${prcCol}`;
                selectColsPressing += `, pr.${qtyCol}::numeric AS ${qtyCol}, COALESCE(pr.${prcCol}, 0) AS ${prcCol}`;
            }
        });

        const queryParts = [];

        if (!dept || dept === 'cutting') {
            queryParts.push(`
                SELECT 
                    'cutting' AS dept,
                    cr.id,
                    COALESCE(cr.cut_date, cr.created_at::date) AS work_date,
                    cr.is_cut_done AS is_completed,
                    COALESCE(cr.cut_done_at, cr.created_at) AS completion_time,
                    cr.cutter_id AS worker_id,
                    NULL::integer AS contractor_id,
                    u.full_name AS worker_name,
                    NULL::text AS contractor_name,
                    o.order_code,
                    COALESCE(cr.order_quantity, 0) AS order_quantity,
                    cr.cut_quantity AS quantity,
                    cr.product_name,
                    COALESCE(cr.unit_price, 0) AS unit_price,
                    COALESCE(cr.salary, 0) AS salary,
                    cr.salary_approved AS is_approved,
                    cr.salary_approved_at AS approved_at,
                    u_app.full_name AS approved_by_name,
                    lh.details AS last_update_detail,
                    lh.performed_at AS last_update_at,
                    lh_u.full_name AS last_update_by,
                    cr.created_at,
                    cr.cut_warning,
                    cr.cutting_category
                    ${selectColsCutting}
                FROM cutting_records cr
                LEFT JOIN users u ON cr.cutter_id = u.id
                LEFT JOIN dht_orders o ON cr.dht_order_id = o.id
                LEFT JOIN users u_app ON cr.salary_approved_by = u_app.id
                LEFT JOIN LATERAL (
                    SELECT h.details, h.performed_at, h.performed_by 
                    FROM cutting_history h WHERE h.cutting_id = cr.id 
                    ORDER BY h.performed_at DESC LIMIT 1
                ) lh ON true
                LEFT JOIN users lh_u ON lh.performed_by = lh_u.id
                WHERE ${whereCutting}
                  AND cr.is_cut_done = true
                  AND cr.id = (
                      SELECT sub.id FROM cutting_records sub
                      WHERE sub.order_item_id = cr.order_item_id
                        AND sub.is_cut_done = true
                        AND ((COALESCE(sub.cut_warning, '') LIKE '%Cắt bù%') = (COALESCE(cr.cut_warning, '') LIKE '%Cắt bù%'))
                      ORDER BY COALESCE(NULLIF(SUBSTRING(sub.product_name FROM '— P([0-9]+)'), ''), '1')::integer ASC, sub.id ASC
                      LIMIT 1
                  )
            `);
        }

        if (!dept || dept === 'pressing') {
            queryParts.push(`
                SELECT 
                    'pressing' AS dept,
                    pr.id,
                    COALESCE(pr.press_date, pr.created_at::date) AS work_date,
                    pr.is_reported AS is_completed,
                    COALESCE(pr.reported_at, pr.created_at) AS completion_time,
                    pr.presser_id AS worker_id,
                    NULL::integer AS contractor_id,
                    u.full_name AS worker_name,
                    NULL::text AS contractor_name,
                    o.order_code,
                    COALESCE(pr.order_quantity, 0) AS order_quantity,
                    pr.press_quantity AS quantity,
                    pr.product_name,
                    COALESCE(pr.unit_price, 0) AS unit_price,
                    COALESCE(pr.salary, 0) AS salary,
                    pr.salary_approved AS is_approved,
                    pr.salary_approved_at AS approved_at,
                    u_app.full_name AS approved_by_name,
                    lh.details AS last_update_detail,
                    lh.performed_at AS last_update_at,
                    lh_u.full_name AS last_update_by,
                    pr.created_at,
                    NULL::text AS cut_warning,
                    NULL::text AS cutting_category
                    ${selectColsPressing}
                FROM pressing_records pr
                LEFT JOIN users u ON pr.presser_id = u.id
                LEFT JOIN dht_orders o ON pr.dht_order_id = o.id
                LEFT JOIN users u_app ON pr.salary_approved_by = u_app.id
                LEFT JOIN LATERAL (
                    SELECT h.details, h.performed_at, h.performed_by 
                    FROM pressing_history h WHERE h.pressing_id = pr.id 
                    ORDER BY h.performed_at DESC LIMIT 1
                ) lh ON true
                LEFT JOIN users lh_u ON lh.performed_by = lh_u.id
                WHERE ${wherePressing}
                  AND pr.is_reported = true
            `);
        }

        if (!dept || dept === 'sewing') {
            queryParts.push(`
                SELECT 
                    'sewing' AS dept,
                    sr.id,
                    COALESCE(sr.handover_date, sr.created_at::date) AS work_date,
                    CASE WHEN sr.done_date IS NOT NULL THEN true ELSE false END AS is_completed,
                    COALESCE(sr.reported_at, sr.updated_at, sr.created_at) AS completion_time,
                    sr.sewing_team_id AS worker_id,
                    sr.contractor_id,
                    dt.name AS worker_name,
                    c.name AS contractor_name,
                    o.order_code,
                    COALESCE(sr.quantity, 0) AS order_quantity,
                    sr.quantity AS quantity,
                    sr.product_name,
                    COALESCE(CASE WHEN sr.checked_price > 0 THEN sr.checked_price ELSE sr.base_price END, 0) AS unit_price,
                    COALESCE(sr.salary, 0) AS salary,
                    sr.salary_approved AS is_approved,
                    sr.salary_approved_at AS approved_at,
                    u_app.full_name AS approved_by_name,
                    lh.details AS last_update_detail,
                    lh.performed_at AS last_update_at,
                    lh_u.full_name AS last_update_by,
                    sr.created_at,
                    NULL::text AS cut_warning,
                    NULL::text AS cutting_category
                    ${selectColsSewing}
                FROM sewing_records sr
                LEFT JOIN departments dt ON sr.sewing_team_id = dt.id
                LEFT JOIN sewing_contractors c ON sr.contractor_id = c.id
                LEFT JOIN dht_orders o ON sr.dht_order_id = o.id
                LEFT JOIN users u_app ON sr.salary_approved_by = u_app.id
                LEFT JOIN LATERAL (
                    SELECT h.details, h.performed_at, h.performed_by 
                    FROM sewing_history h WHERE h.sewing_id = sr.id 
                    ORDER BY h.performed_at DESC LIMIT 1
                ) lh ON true
                LEFT JOIN users lh_u ON lh.performed_by = lh_u.id
                WHERE ${whereSewing}
                  AND sr.done_date IS NOT NULL
                  AND (sr.sewing_team_id IS NOT NULL OR sr.contractor_id IS NOT NULL)
            `);
        }

        const query = queryParts.join('\n UNION ALL \n') + '\n ORDER BY work_date DESC, created_at DESC';

        const records = await db.all(query, params);
        return { records, is_manager: isMgr };
    });

    // ========== BULK APPROVAL ==========
    fastify.post('/api/production-salary/approve-bulk', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền duyệt lương' });
        }

        const { records } = req.body || {}; // array of { id, dept }
        if (!Array.isArray(records) || records.length === 0) {
            return { success: true, count: 0 };
        }

        const now = vnNow();
        
        // Group by department to run updates efficiently
        const cuttingIds = [];
        const pressingIds = [];
        const sewingIds = [];

        for (const r of records) {
            const id = Number(r.id);
            if (!id) continue;
            if (r.dept === 'cutting') cuttingIds.push(id);
            else if (r.dept === 'pressing') pressingIds.push(id);
            else if (r.dept === 'sewing') sewingIds.push(id);
        }

        let updatedCount = 0;

        if (cuttingIds.length > 0) {
            // For cutting, we need to approve all coordinates in the same cycle for these ids.
            const items = await db.all(`
                SELECT DISTINCT order_item_id, cut_warning 
                FROM cutting_records 
                WHERE id IN (${cuttingIds.join(',')})
            `);
            
            for (const item of items) {
                await db.run(`
                    UPDATE cutting_records 
                    SET 
                        salary_approved = true, 
                        salary_approved_at = $1, 
                        salary_approved_by = $2, 
                        updated_at = $1 
                    WHERE order_item_id = $3
                      AND ((COALESCE(cut_warning, '') LIKE '%Cắt bù%') = (COALESCE($4, '') LIKE '%Cắt bù%'))
                `, [now, req.user.id, item.order_item_id, item.cut_warning]);
            }

            // Insert into history
            for (const id of cuttingIds) {
                await db.run(`
                    INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at)
                    VALUES ($1, 'approve_salary', '💰 Duyệt lương sản xuất (Hàng loạt)', $2, $3)
                `, [id, req.user.id, now]);
            }
            updatedCount += cuttingIds.length;
        }

        if (pressingIds.length > 0) {
            await db.run(`
                UPDATE pressing_records 
                SET 
                    salary_approved = true, 
                    salary_approved_at = $1, 
                    salary_approved_by = $2, 
                    updated_at = $1 
                WHERE id IN (${pressingIds.join(',')})
            `, [now, req.user.id]);

            for (const id of pressingIds) {
                await db.run(`
                    INSERT INTO pressing_history (pressing_id, action, details, performed_by, performed_at)
                    VALUES ($1, 'approve_salary', '💰 Duyệt lương sản xuất (Hàng loạt)', $2, $3)
                `, [id, req.user.id, now]);
            }
            updatedCount += pressingIds.length;
        }

        if (sewingIds.length > 0) {
            const flagged = await db.all(`
                SELECT id, order_code, product_name 
                FROM sewing_records 
                WHERE id IN (${sewingIds.join(',')}) 
                  AND notes LIKE '[THIẾU GIÁ CHI TIẾT]%'
            `);
            if (flagged.length > 0) {
                const names = flagged.map(f => `${f.order_code || ''} (${f.product_name || ''})`).join(', ');
                return reply.code(400).send({ 
                    error: `Không thể duyệt lương hàng loạt vì có đơn hàng đang bị gắn cờ "Thiếu Kỹ Thuật May": ${names}. Vui lòng sửa lại đơn giá/kỹ thuật trước khi duyệt!` 
                });
            }

            await db.run(`
                UPDATE sewing_records 
                SET 
                    salary_approved = true, 
                    salary_approved_at = $1, 
                    salary_approved_by = $2, 
                    updated_at = $1 
                WHERE id IN (${sewingIds.join(',')})
            `, [now, req.user.id]);

            for (const id of sewingIds) {
                await db.run(`
                    INSERT INTO sewing_history (sewing_id, action, details, performed_by, performed_at)
                    VALUES ($1, 'approve_salary', '💰 Duyệt lương sản xuất (Hàng loạt)', $2, $3)
                `, [id, req.user.id, now]);
            }
            updatedCount += sewingIds.length;
        }

        return { success: true, count: updatedCount };
    });

    // ========== TOGGLE APPROVAL ==========
    fastify.post('/api/production-salary/toggle/:dept/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền duyệt lương' });
        }

        const { dept, id } = req.params;
        const recordId = Number(id);
        const now = vnNow();

        let table = '';
        let histTable = '';
        let histFk = '';

        if (dept === 'cutting') {
            table = 'cutting_records';
            histTable = 'cutting_history';
            histFk = 'cutting_id';
        } else if (dept === 'pressing') {
            table = 'pressing_records';
            histTable = 'pressing_history';
            histFk = 'pressing_id';
        } else if (dept === 'sewing') {
            table = 'sewing_records';
            histTable = 'sewing_history';
            histFk = 'sewing_id';
        } else {
            return reply.code(400).send({ error: 'Bộ phận không hợp lệ' });
        }

        const rec = await db.get(`SELECT salary_approved, order_item_id, cut_warning, notes FROM ${table} WHERE id = $1`, [recordId]);
        if (!rec) {
            return reply.code(404).send({ error: 'Không tìm thấy bản ghi' });
        }

        const newApproved = !rec.salary_approved;
        
        if (newApproved && dept === 'sewing' && rec.notes && rec.notes.startsWith('[THIẾU GIÁ CHI TIẾT]')) {
            return reply.code(400).send({ error: 'Chưa thể duyệt lương vì đơn hàng đang bị gắn cờ "Thiếu Kỹ Thuật May". Vui lòng sửa lại đơn hàng trước khi duyệt!' });
        }
        
        if (dept === 'cutting') {
            await db.run(`
                UPDATE cutting_records 
                SET 
                    salary_approved = $1, 
                    salary_approved_at = $2, 
                    salary_approved_by = $3, 
                    updated_at = $2 
                WHERE order_item_id = $4
                  AND ((COALESCE(cut_warning, '') LIKE '%Cắt bù%') = (COALESCE($5, '') LIKE '%Cắt bù%'))
            `, [newApproved, now, req.user.id, rec.order_item_id, rec.cut_warning]);
        } else {
            await db.run(`
                UPDATE ${table} 
                SET 
                    salary_approved = $1, 
                    salary_approved_at = $2, 
                    salary_approved_by = $3, 
                    updated_at = $2 
                WHERE id = $4
            `, [newApproved, now, req.user.id, recordId]);
        }

        const action = newApproved ? 'approve_salary' : 'undo_approve_salary';
        const details = newApproved ? '💰 Duyệt lương sản xuất' : '↩️ Hoàn tác duyệt lương sản xuất';
        
        await db.run(`
            INSERT INTO ${histTable} (${histFk}, action, details, performed_by, performed_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [recordId, action, details, req.user.id, now]);

        return { success: true, is_approved: newApproved };
    });

    // ========== UPDATE RECORD (UNIT PRICE / SALARY) ==========
    fastify.put('/api/production-salary/record/:dept/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền cập nhật đơn giá' });
        }

        const { dept, id } = req.params;
        const recordId = Number(id);
        const { unit_price, salary } = req.body || {};
        const now = vnNow();

        const newPrice = Number(unit_price) || 0;
        const newSalary = Number(salary) || 0;

        if (dept === 'cutting') {
            const rec = await db.get('SELECT cut_quantity, order_item_id, cut_warning FROM cutting_records WHERE id = $1', [recordId]);
            if (!rec) return reply.code(404).send({ error: 'Không tìm thấy bản ghi' });
            
            const calcSal = newSalary > 0 ? newSalary : (Number(rec.cut_quantity) || 0) * newPrice;

            await db.run(`
                UPDATE cutting_records 
                SET unit_price = $1, salary = $2, updated_at = $3 
                WHERE order_item_id = $4
                  AND ((COALESCE(cut_warning, '') LIKE '%Cắt bù%') = (COALESCE($5, '') LIKE '%Cắt bù%'))
            `, [newPrice, calcSal, now, rec.order_item_id, rec.cut_warning]);

            await db.run(`
                INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [recordId, 'update_salary_price', `Cập nhật lương - Đơn giá: ${newPrice}, Lương: ${calcSal}`, req.user.id, now]);

            return { success: true, salary: calcSal };

        } else if (dept === 'pressing') {
            const rec = await db.get('SELECT press_quantity FROM pressing_records WHERE id = $1', [recordId]);
            if (!rec) return reply.code(404).send({ error: 'Không tìm thấy bản ghi' });

            const calcSal = newSalary > 0 ? newSalary : (Number(rec.press_quantity) || 0) * newPrice;

            await db.run(`
                UPDATE pressing_records 
                SET unit_price = $1, salary = $2, press_salary = $2, updated_at = $3 
                WHERE id = $4
            `, [newPrice, calcSal, now, recordId]);

            await db.run(`
                INSERT INTO pressing_history (pressing_id, action, details, performed_by, performed_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [recordId, 'update_salary_price', `Cập nhật lương - Đơn giá: ${newPrice}, Lương: ${calcSal}`, req.user.id, now]);

            return { success: true, salary: calcSal };

        } else if (dept === 'sewing') {
            const rec = await db.get('SELECT quantity FROM sewing_records WHERE id = $1', [recordId]);
            if (!rec) return reply.code(404).send({ error: 'Không tìm thấy bản ghi' });

            // In sewing: checked_price is unit price. If not set, it falls back to base_price.
            // When updating unit price, we write to checked_price.
            const calcSal = newSalary > 0 ? newSalary : (Number(rec.quantity) || 0) * newPrice;

            await db.run(`
                UPDATE sewing_records 
                SET checked_price = $1, salary = $2, updated_at = $3 
                WHERE id = $4
            `, [newPrice, calcSal, now, recordId]);

            await db.run(`
                INSERT INTO sewing_history (sewing_id, action, details, performed_by, performed_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [recordId, 'update_salary_price', `Cập nhật lương - Đơn giá: ${newPrice}, Lương: ${calcSal}`, req.user.id, now]);

            return { success: true, salary: calcSal };

        } else {
            return reply.code(400).send({ error: 'Bộ phận không hợp lệ' });
        }
    });
};
