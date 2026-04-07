const db = require('../db/pool');
const { runTelesalePumpForUser } = require('./telesale');
const { authenticate } = require('../middleware/auth');

async function khoaTKNVRoutes(fastify, options) {

    // ========== PENALTY CONFIG ==========

    // GET: Lấy cấu hình phạt chung (global)
    fastify.get('/api/penalty/config', { preHandler: [authenticate] }, async (request, reply) => {
        const configs = await db.all('SELECT key, label, amount FROM global_penalty_config ORDER BY key');
        return { configs };
    });

    // POST: Cập nhật mức phạt chung (chỉ GĐ)
    fastify.post('/api/penalty/config', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ giám đốc được cấu hình mức phạt' });
        }

        const { configs } = request.body || {};
        if (!configs || !Array.isArray(configs)) {
            return reply.code(400).send({ error: 'Thiếu dữ liệu' });
        }

        for (const cfg of configs) {
            if (!cfg.key) continue;
            await db.run(
                `UPDATE global_penalty_config SET amount = $1, updated_at = NOW() WHERE key = $2`,
                [Number(cfg.amount) || 0, cfg.key]
            );
        }

        return { success: true, message: 'Đã lưu mức phạt' };
    });

    // ========== HOLIDAYS CRUD ==========

    // GET: Lấy danh sách ngày lễ
    fastify.get('/api/penalty/holidays', { preHandler: [authenticate] }, async (request, reply) => {
        const holidays = await db.all('SELECT id, holiday_date::text as holiday_date, holiday_name FROM holidays ORDER BY holiday_date');
        return { holidays };
    });

    // POST: Thêm ngày lễ (GĐ + trinh)
    fastify.post('/api/penalty/holidays', { preHandler: [authenticate] }, async (request, reply) => {
        if (!['giam_doc','quan_ly_cap_cao'].includes(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền' });
        }
        const { holiday_date, holiday_name } = request.body || {};
        if (!holiday_date || !holiday_name) return reply.code(400).send({ error: 'Thiếu thông tin' });
        try {
            await db.run('INSERT INTO holidays (holiday_date, holiday_name) VALUES ($1, $2)', [holiday_date, holiday_name]);
            return { success: true };
        } catch(e) {
            return reply.code(400).send({ error: 'Ngày lễ đã tồn tại' });
        }
    });

    // DELETE: Xóa ngày lễ (GĐ + trinh)
    fastify.delete('/api/penalty/holidays/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!['giam_doc','quan_ly_cap_cao'].includes(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền' });
        }
        await db.run('DELETE FROM holidays WHERE id = $1', [Number(request.params.id)]);
        return { success: true };
    });

    // ========== PENALTY STATISTICS ==========

    // GET: Thống kê phạt theo tháng
    fastify.get('/api/penalty/list', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;
        // Support both single month and range: ?month=YYYY-MM or ?monthFrom=YYYY-MM&monthTo=YYYY-MM
        let monthStart, monthEnd;
        if (request.query.monthFrom) {
            const mFrom = request.query.monthFrom; // YYYY-MM
            const mTo = request.query.monthTo || mFrom;
            monthStart = `${mFrom}-01`;
            const [yTo, mToNum] = mTo.split('-').map(Number);
            const lastDay = new Date(yTo, mToNum, 0).getDate();
            monthEnd = `${mTo}-${String(lastDay).padStart(2, '0')}`;
        } else {
            const month = request.query.month;
            if (!month) {
                return reply.code(400).send({ error: 'Thiếu tháng (month=YYYY-MM)' });
            }
            monthStart = `${month}-01`;
            const [y, m] = month.split('-').map(Number);
            const lastDay = new Date(y, m, 0).getDate();
            monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
        }

        // ===== SOURCE 1: task_support_requests (CV Điểm + Hỗ trợ NV) =====
        let srWhere = '';
        let srParams = [monthStart, monthEnd];

        if (userRole === 'giam_doc') {
            srWhere = `WHERE sr.status = 'expired' AND sr.task_date BETWEEN $1 AND $2`;
        } else if (['quan_ly', 'truong_phong', 'quan_ly_cap_cao'].includes(userRole)) {
            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            if (!user || !user.department_id) {
                srWhere = `WHERE sr.status = 'expired' AND sr.task_date BETWEEN $1 AND $2 AND 1=0`;
            } else {
                const deptIds = [user.department_id];
                const children = await db.all('SELECT id FROM departments WHERE parent_id = $1', [user.department_id]);
                children.forEach(c => deptIds.push(c.id));
                for (const child of children) {
                    const grandchildren = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
                    grandchildren.forEach(gc => deptIds.push(gc.id));
                }
                const placeholders = deptIds.map((_, i) => `$${i + 3}`).join(',');
                srWhere = `WHERE sr.status = 'expired' AND sr.task_date BETWEEN $1 AND $2 AND sr.department_id IN (${placeholders})`;
                srParams.push(...deptIds);
            }
        } else {
            srWhere = `WHERE sr.status = 'expired' AND sr.task_date BETWEEN $1 AND $2 AND (sr.manager_id = $3 OR sr.user_id = $3)`;
            srParams.push(userId);
        }

        const srPenalties = await db.all(
            `SELECT sr.*, sr.task_date::text as task_date, sr.deadline::text as deadline,
                    u.full_name as user_name, u.username,
                    m.full_name as manager_name, m.username as manager_username,
                    m.department_id as manager_dept_id, m.role as manager_role,
                    d.name as dept_name
             FROM task_support_requests sr
             LEFT JOIN users u ON sr.user_id = u.id
             LEFT JOIN users m ON sr.manager_id = m.id
             LEFT JOIN departments d ON sr.department_id = d.id
             ${srWhere}
             ORDER BY sr.task_date DESC, m.full_name`,
            srParams
        );

        // Tag source type
        srPenalties.forEach(p => {
            if (p.penalty_reason && p.penalty_reason.includes('Không duyệt')) {
                p.source_type = 'diem';
                p.source_label = '📊 CV Điểm — QL không duyệt';
            } else {
                p.source_type = 'support';
                p.source_label = '🆘 Hỗ trợ NV — QL không hỗ trợ';
            }
            // For display: the person being penalized is the manager
            p.penalized_user_id = p.manager_id;
            p.penalized_name = p.manager_name;
            p.penalized_username = p.manager_username;
            p.penalized_dept_id = p.manager_dept_id;
            p.penalized_role = p.manager_role;
        });

        // ===== SOURCE 2: lock_task_completions (CV Khóa — NV không nộp) =====
        let ltWhere = '';
        let ltParams = [monthStart, monthEnd];

        if (userRole === 'giam_doc') {
            ltWhere = `WHERE ltc.status = 'expired' AND ltc.penalty_applied = true AND ltc.completion_date BETWEEN $1::date AND $2::date`;
        } else if (['quan_ly', 'truong_phong', 'quan_ly_cap_cao'].includes(userRole)) {
            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            if (!user || !user.department_id) {
                ltWhere = `WHERE ltc.status = 'expired' AND ltc.penalty_applied = true AND ltc.completion_date BETWEEN $1::date AND $2::date AND 1=0`;
            } else {
                const deptIds = [user.department_id];
                const children = await db.all('SELECT id FROM departments WHERE parent_id = $1', [user.department_id]);
                children.forEach(c => deptIds.push(c.id));
                for (const child of children) {
                    const grandchildren = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
                    grandchildren.forEach(gc => deptIds.push(gc.id));
                }
                const placeholders = deptIds.map((_, i) => `$${i + 3}`).join(',');
                ltWhere = `WHERE ltc.status = 'expired' AND ltc.penalty_applied = true AND ltc.completion_date BETWEEN $1::date AND $2::date AND u.department_id IN (${placeholders})`;
                ltParams.push(...deptIds);
            }
        } else {
            ltWhere = `WHERE ltc.status = 'expired' AND ltc.penalty_applied = true AND ltc.completion_date BETWEEN $1::date AND $2::date AND ltc.user_id = $3`;
            ltParams.push(userId);
        }

        const ltPenalties = await db.all(
            `SELECT ltc.id, ltc.lock_task_id, ltc.user_id, ltc.completion_date::text as task_date, 
                    ltc.penalty_amount, ltc.penalty_applied, ltc.acknowledged, ltc.created_at,
                    lt.task_name, lt.department_id,
                    u.full_name as user_name, u.username, u.department_id as user_dept_id, u.role as user_role,
                    d.name as dept_name
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             JOIN users u ON u.id = ltc.user_id
             LEFT JOIN departments d ON u.department_id = d.id
             ${ltWhere}
             ORDER BY ltc.completion_date DESC`,
            ltParams
        );

        // Tag and format
        const ltFormatted = ltPenalties.map(p => ({
            ...p,
            source_type: 'khoa',
            source_label: '🔒 CV Khóa — NV không nộp',
            penalty_reason: 'Không nộp báo cáo: ' + p.task_name,
            penalized_user_id: p.user_id,
            penalized_name: p.user_name,
            penalized_username: p.username,
            penalized_dept_id: p.user_dept_id,
            penalized_role: p.user_role,
            manager_id: p.user_id,
            manager_name: p.user_name,
            manager_username: p.username,
            acknowledged: p.acknowledged || false
        }));

        // ===== SOURCE 3: chain_task_completions (CV Chuỗi — NV/QL phạt) =====
        let ctWhere = '';
        let ctParams = [monthStart, monthEnd];

        if (userRole === 'giam_doc') {
            ctWhere = `WHERE cc.status = 'expired' AND cc.penalty_applied = true AND ci.deadline BETWEEN $1::date AND $2::date`;
        } else if (['quan_ly', 'truong_phong', 'quan_ly_cap_cao'].includes(userRole)) {
            const user3 = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            if (!user3 || !user3.department_id) {
                ctWhere = `WHERE cc.status = 'expired' AND cc.penalty_applied = true AND ci.deadline BETWEEN $1::date AND $2::date AND 1=0`;
            } else {
                const deptIds3 = [user3.department_id];
                const children3 = await db.all('SELECT id FROM departments WHERE parent_id = $1', [user3.department_id]);
                children3.forEach(c => deptIds3.push(c.id));
                for (const child of children3) {
                    const gc3 = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
                    gc3.forEach(gc => deptIds3.push(gc.id));
                }
                const ph3 = deptIds3.map((_, i) => `$${i + 3}`).join(',');
                ctWhere = `WHERE cc.status = 'expired' AND cc.penalty_applied = true AND ci.deadline BETWEEN $1::date AND $2::date AND cins.department_id IN (${ph3})`;
                ctParams.push(...deptIds3);
            }
        } else {
            ctWhere = `WHERE cc.status = 'expired' AND cc.penalty_applied = true AND ci.deadline BETWEEN $1::date AND $2::date AND cc.user_id = $3`;
            ctParams.push(userId);
        }

        const ctPenalties = await db.all(
            `SELECT cc.id, cc.chain_item_id, cc.user_id, ci.deadline::text as task_date,
                    cc.penalty_amount, cc.penalty_applied, cc.acknowledged, cc.content as penalty_reason,
                    ci.task_name, cins.chain_name, cins.department_id,
                    u.full_name as user_name, u.username, u.department_id as user_dept_id, u.role as user_role,
                    d.name as dept_name
             FROM chain_task_completions cc
             JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
             JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
             JOIN users u ON u.id = cc.user_id
             LEFT JOIN departments d ON cins.department_id = d.id
             ${ctWhere}
             ORDER BY ci.deadline DESC`,
            ctParams
        );

        const ctFormatted = ctPenalties.map(p => ({
            ...p,
            source_type: 'chuoi',
            source_label: '🔗 CV Chuỗi',
            task_name: p.task_name + (p.chain_name ? ` (${p.chain_name})` : ''),
            penalty_reason: p.penalty_reason || 'Không nộp báo cáo CV chuỗi: ' + p.task_name,
            penalized_user_id: p.user_id,
            penalized_name: p.user_name,
            penalized_username: p.username,
            penalized_dept_id: p.user_dept_id,
            penalized_role: p.user_role,
            manager_id: p.user_id,
            manager_name: p.user_name,
            manager_username: p.username,
            acknowledged: p.acknowledged || false
        }));

        // ===== SOURCE 4: emergencies (Cấp cứu sếp — QL không xử lý) =====
        let emWhere = '';
        let emParams = [monthStart, monthEnd];

        if (userRole === 'giam_doc') {
            emWhere = `WHERE e.penalty_applied = true AND e.created_at::date BETWEEN $1::date AND $2::date`;
        } else if (['quan_ly', 'truong_phong', 'quan_ly_cap_cao'].includes(userRole)) {
            emWhere = `WHERE e.penalty_applied = true AND e.created_at::date BETWEEN $1::date AND $2::date AND (e.handler_id = $3 OR e.handover_to = $3)`;
            emParams.push(userId);
        } else {
            emWhere = `WHERE e.penalty_applied = true AND e.created_at::date BETWEEN $1::date AND $2::date AND 1=0`;
        }

        const emPenalties = await db.all(
            `SELECT e.id, e.customer_id, e.handler_id, e.handover_to, e.reason,
                    e.created_at::text as created_at, e.penalty_amount, e.acknowledged,
                    e.created_at::date::text as task_date,
                    c.customer_name, c.phone as customer_phone,
                    COALESCE(hu.full_name, '') as handler_name, COALESCE(hu.username, '') as handler_username,
                    hu.department_id as handler_dept_id, hu.role as handler_role
             FROM emergencies e
             LEFT JOIN customers c ON c.id = e.customer_id
             LEFT JOIN users hu ON hu.id = COALESCE(e.handover_to, e.handler_id)
             ${emWhere}
             ORDER BY e.created_at DESC`,
            emParams
        );

        const emFormatted = emPenalties.map(p => ({
            ...p,
            source_type: 'emergency',
            source_label: '🚨 Cấp cứu sếp — QL không xử lý',
            task_name: `Cấp cứu: ${p.customer_name || 'Khách hàng'}`,
            penalty_reason: `Không xử lý cấp cứu: ${p.reason}`,
            penalized_user_id: p.handover_to || p.handler_id,
            penalized_name: p.handler_name,
            penalized_username: p.handler_username,
            penalized_dept_id: p.handler_dept_id,
            penalized_role: p.handler_role,
            manager_id: p.handover_to || p.handler_id,
            manager_name: p.handler_name,
            manager_username: p.handler_username,
            acknowledged: p.acknowledged || false
        }));

        // ===== SOURCE 5: customer_penalty_records (KH chưa xử lý hôm nay) =====
        let cpWhere = '';
        let cpParams = [monthStart, monthEnd];

        if (userRole === 'giam_doc') {
            cpWhere = `WHERE cpr.penalty_date BETWEEN $1::date AND $2::date`;
        } else if (['quan_ly', 'truong_phong', 'quan_ly_cap_cao'].includes(userRole)) {
            const user5 = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            if (!user5 || !user5.department_id) {
                cpWhere = `WHERE cpr.penalty_date BETWEEN $1::date AND $2::date AND 1=0`;
            } else {
                const deptIds5 = [user5.department_id];
                const children5 = await db.all('SELECT id FROM departments WHERE parent_id = $1', [user5.department_id]);
                children5.forEach(c => deptIds5.push(c.id));
                for (const child of children5) {
                    const gc5 = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
                    gc5.forEach(gc => deptIds5.push(gc.id));
                }
                const ph5 = deptIds5.map((_, i) => `$${i + 3}`).join(',');
                cpWhere = `WHERE cpr.penalty_date BETWEEN $1::date AND $2::date AND u.department_id IN (${ph5})`;
                cpParams.push(...deptIds5);
            }
        } else {
            cpWhere = `WHERE cpr.penalty_date BETWEEN $1::date AND $2::date AND cpr.user_id = $3`;
            cpParams.push(userId);
        }

        const cpPenalties = await db.all(
            `SELECT cpr.id, cpr.user_id, cpr.penalty_date::text as task_date, cpr.crm_type,
                    cpr.unhandled_count, cpr.penalty_amount, cpr.acknowledged,
                    u.full_name as user_name, u.username, u.department_id, u.role,
                    d.name as dept_name
             FROM customer_penalty_records cpr
             JOIN users u ON u.id = cpr.user_id
             LEFT JOIN departments d ON u.department_id = d.id
             ${cpWhere}
             ORDER BY cpr.penalty_date DESC`,
            cpParams
        );

        const cpFormatted = cpPenalties.map(p => ({
            ...p,
            source_type: 'customer_unhandled',
            source_label: '❌ KH Chưa XL — Không xử lý KH phải XL hôm nay',
            task_name: `KH chưa xử lý: ${p.crm_type} (${p.unhandled_count} KH)`,
            penalty_reason: `Không xử lý ${p.unhandled_count} khách phải xử lý hôm nay (${p.crm_type})`,
            penalized_user_id: p.user_id,
            penalized_name: p.user_name,
            penalized_username: p.username,
            penalized_dept_id: p.department_id,
            penalized_role: p.role || 'nhan_vien',
            manager_id: p.user_id,
            manager_name: p.user_name,
            manager_username: p.username,
            acknowledged: p.acknowledged || false
        }));

        // Combine all
        const allPenalties = [...srPenalties, ...ltFormatted, ...ctFormatted, ...emFormatted, ...cpFormatted];
        const total = allPenalties.reduce((s, p) => s + (p.penalty_amount || 0), 0);

        return { penalties: allPenalties, total };
    });

    // GET: Phiếu phạt cho NV cụ thể
    fastify.get('/api/penalty/slip/:managerId/:month', { preHandler: [authenticate] }, async (request, reply) => {
        const managerId = Number(request.params.managerId);
        const month = request.params.month;

        const monthStart = `${month}-01`;
        const [y, m] = month.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

        const manager = await db.get('SELECT full_name, username, department_id FROM users WHERE id = $1', [managerId]);
        if (!manager) return reply.code(404).send({ error: 'Không tìm thấy nhân viên' });

        const dept = await db.get('SELECT name FROM departments WHERE id = $1', [manager.department_id]);

        // Source 1: task_support_requests (CV Điểm + Hỗ trợ NV)
        const srItems = await db.all(
            `SELECT sr.task_name, sr.task_date::text as task_date, sr.penalty_amount, sr.penalty_reason,
                    u.full_name as requested_by
             FROM task_support_requests sr
             LEFT JOIN users u ON sr.user_id = u.id
             WHERE sr.manager_id = $1 AND sr.status = 'expired' AND sr.task_date BETWEEN $2 AND $3
             ORDER BY sr.task_date`,
            [managerId, monthStart, monthEnd]
        );
        srItems.forEach(item => {
            item.source_type = (item.penalty_reason && item.penalty_reason.includes('Không duyệt')) ? 'diem' : 'support';
        });

        // Source 2: lock_task_completions (CV Khóa)
        const ltItems = await db.all(
            `SELECT lt.task_name, ltc.completion_date::text as task_date, ltc.penalty_amount, ltc.acknowledged
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.user_id = $1 AND ltc.status = 'expired' AND ltc.penalty_applied = true
               AND ltc.completion_date BETWEEN $2::date AND $3::date
             ORDER BY ltc.completion_date`,
            [managerId, monthStart, monthEnd]
        );
        ltItems.forEach(item => {
            item.source_type = 'khoa';
            item.penalty_reason = 'Không nộp báo cáo';
        });

        // Source 3: chain_task_completions (CV Chuỗi)
        const ctItems = await db.all(
            `SELECT ci.task_name, ci.deadline::text as task_date, cc.penalty_amount, cc.acknowledged,
                    cins.chain_name, cc.content as penalty_reason
             FROM chain_task_completions cc
             JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
             JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
             WHERE cc.user_id = $1 AND cc.status = 'expired' AND cc.penalty_applied = true
               AND ci.deadline BETWEEN $2::date AND $3::date
             ORDER BY ci.deadline`,
            [managerId, monthStart, monthEnd]
        );
        ctItems.forEach(item => {
            item.source_type = 'chuoi';
            item.task_name = item.task_name + (item.chain_name ? ` (${item.chain_name})` : '');
            item.penalty_reason = item.penalty_reason || 'Không nộp báo cáo CV chuỗi';
        });

        // Source 4: emergencies (Cấp cứu sếp)
        const emItems = await db.all(
            `SELECT e.reason as task_name, e.created_at::date::text as task_date, e.penalty_amount, e.acknowledged,
                    c.customer_name
             FROM emergencies e
             LEFT JOIN customers c ON c.id = e.customer_id
             WHERE COALESCE(e.handover_to, e.handler_id) = $1 AND e.penalty_applied = true
               AND e.created_at::date BETWEEN $2::date AND $3::date
             ORDER BY e.created_at`,
            [managerId, monthStart, monthEnd]
        );
        emItems.forEach(item => {
            item.source_type = 'emergency';
            item.task_name = `Cấp cứu: ${item.customer_name || 'Khách hàng'}`;
            item.penalty_reason = `Không xử lý cấp cứu: ${item.task_name}`;
        });

        // Source 5: customer_penalty_records (KH chưa xử lý)
        const cpItems = await db.all(
            `SELECT cpr.crm_type as task_name, cpr.penalty_date::text as task_date, cpr.penalty_amount, cpr.acknowledged,
                    cpr.unhandled_count, cpr.crm_type
             FROM customer_penalty_records cpr
             WHERE cpr.user_id = $1 AND cpr.penalty_date BETWEEN $2::date AND $3::date
             ORDER BY cpr.penalty_date`,
            [managerId, monthStart, monthEnd]
        );
        cpItems.forEach(item => {
            item.source_type = 'customer_unhandled';
            item.task_name = `KH chưa XL: ${item.crm_type} (${item.unhandled_count} KH)`;
            item.penalty_reason = `Không xử lý ${item.unhandled_count} khách phải xử lý hôm nay`;
        });

        const items = [...srItems, ...ltItems, ...ctItems, ...emItems, ...cpItems];
        const total = items.reduce((s, i) => s + (i.penalty_amount || 0), 0);

        return {
            manager: { id: managerId, name: manager.full_name, username: manager.username, dept: dept?.name || '' },
            month,
            items,
            total
        };
    });

    // GET: Check pending penalties for login popup
    fastify.get('/api/penalty/my-pending', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;

        // Load penalty config
        const _gpcRows = await db.all('SELECT key, amount FROM global_penalty_config');
        const GPC = {};
        _gpcRows.forEach(r => { GPC[r.key] = Number(r.amount) || 0; });
        const todayPenaltyKhoa = GPC.cv_khoa_khong_nop || 50000;
        const todayPenaltyChuoi = GPC.cv_chuoi_khong_nop || 50000;
        const todayStr = new Date().toISOString().split('T')[0];

        // Source 1: Support requests (for managers)
        const supportPending = await db.all(
            `SELECT sr.id, sr.task_name, sr.task_date::text as task_date, sr.penalty_amount, sr.penalty_reason,
                    u.full_name as requested_by
             FROM task_support_requests sr
             LEFT JOIN users u ON sr.user_id = u.id
             WHERE sr.manager_id = $1 AND sr.status = 'expired' AND sr.acknowledged = false
             ORDER BY sr.task_date`,
            [userId]
        );

        // Source 2: CV Khóa unreported (for NV)
        const lockExpired = await db.all(
            `SELECT ltc.lock_task_id, lt.task_name, ltc.completion_date::text as task_date
             FROM lock_task_completions ltc
             JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.user_id = $1 AND ltc.status = 'expired' AND ltc.penalty_applied = true
               AND ltc.redo_count >= 0 AND ltc.acknowledged = false
             ORDER BY ltc.completion_date DESC`,
            [userId]
        );
        const khoaPending = [];
        for (const lp of lockExpired) {
            const resub = await db.get(
                `SELECT id FROM lock_task_completions
                 WHERE lock_task_id = $1 AND user_id = $2 AND completion_date::text = $3
                   AND status IN ('pending','approved') AND redo_count > 0`,
                [lp.lock_task_id, userId, lp.task_date]
            );
            if (!resub) {
                khoaPending.push({
                    task_name: lp.task_name, task_date: lp.task_date,
                    penalty_amount: todayPenaltyKhoa,
                    penalty_reason: `Chưa báo cáo lại đến ${todayStr.split('-').reverse().join('/')}`
                });
            }
        }

        // Source 3: CV Chuỗi unreported (for NV)
        const chainPending = [];
        try {
            const chainExpired = await db.all(
                `SELECT cc.chain_item_id, ci.task_name, ci.deadline::text as task_date,
                        cins.chain_name
                 FROM chain_task_completions cc
                 JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
                 JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
                 WHERE cc.user_id = $1 AND cc.status = 'expired' AND cc.penalty_applied = true
                   AND cc.redo_count >= 0 AND cc.acknowledged = false
                 ORDER BY ci.deadline DESC`,
                [userId]
            );
            for (const ce of chainExpired) {
                const resub = await db.get(
                    `SELECT id FROM chain_task_completions
                     WHERE chain_item_id = $1 AND user_id = $2
                       AND status IN ('pending','approved') AND redo_count > 0`,
                    [ce.chain_item_id, userId]
                );
                if (!resub) {
                    chainPending.push({
                        task_name: `${ce.chain_name} — ${ce.task_name}`,
                        task_date: ce.task_date,
                        penalty_amount: todayPenaltyChuoi,
                        penalty_reason: `Chưa nộp đến ${todayStr.split('-').reverse().join('/')}`
                    });
                }
            }
        } catch(e) {}

        const pending = [...supportPending, ...khoaPending, ...chainPending];
        const total = pending.reduce((s, p) => s + (p.penalty_amount || 0), 0);
        return { pending, total };
    });

    // POST: Acknowledge penalties (NV bấm "Tôi đã biết" → mở khóa)
    // No auth required since user is locked and can't login
    fastify.post('/api/penalty/acknowledge', async (request, reply) => {
        const { username, password } = request.body || {};
        if (!username || !password) {
            return reply.code(400).send({ error: 'Thiếu thông tin' });
        }

        const bcrypt = require('bcrypt');
        const user = await db.get('SELECT id, password_hash, status FROM users WHERE username = $1', [username]);
        if (!user) return reply.code(400).send({ error: 'Không tìm thấy tài khoản' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return reply.code(400).send({ error: 'Mật khẩu không đúng' });

        // Acknowledge support request penalties (CV Điểm + Hỗ trợ NV)
        await db.run(
            `UPDATE task_support_requests SET acknowledged = true, acknowledged_at = NOW()
             WHERE manager_id = $1 AND status = 'expired' AND acknowledged = false`,
            [user.id]
        );

        // Acknowledge CV Khóa penalties
        await db.run(
            `UPDATE lock_task_completions SET acknowledged = true
             WHERE user_id = $1 AND status = 'expired' AND penalty_applied = true AND acknowledged = false`,
            [user.id]
        );

        // Acknowledge CV Chuỗi penalties
        await db.run(
            `UPDATE chain_task_completions SET acknowledged = true
             WHERE user_id = $1 AND status = 'expired' AND penalty_applied = true AND acknowledged = false`,
            [user.id]
        );

        // Acknowledge Cấp cứu sếp penalties
        await db.run(
            `UPDATE emergencies SET acknowledged = true
             WHERE (handler_id = $1 OR handover_to = $1) AND penalty_applied = true AND acknowledged = false`,
            [user.id]
        );

        // Acknowledge KH chưa xử lý penalties
        await db.run(
            `UPDATE customer_penalty_records SET acknowledged = true
             WHERE user_id = $1 AND acknowledged = false`,
            [user.id]
        );

        // Unlock account
        await db.run(
            "UPDATE users SET status = 'active' WHERE id = $1 AND status = 'locked'",
            [user.id]
        );

        // Auto-pump telesale SĐT sau khi mở khóa
        let pumpMsg = '';
        try {
            const pumpResult = await runTelesalePumpForUser(user.id);
            if (pumpResult.pumped > 0) pumpMsg = ` ${pumpResult.message}.`;
            else if (pumpResult.skipped) pumpMsg = ` ${pumpResult.message}.`;
        } catch (e) { console.error('[Telesale] Auto-pump error:', e.message); }

        return { success: true, message: `Đã xác nhận. Tài khoản đã được mở khóa.${pumpMsg}`, telesalePumped: pumpMsg ? true : false };
    });

    // POST: Self-acknowledge (authenticated - when popup shows after login)
    fastify.post('/api/penalty/acknowledge-self', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;

        // Acknowledge support request penalties (CV Điểm + Hỗ trợ NV)
        await db.run(
            `UPDATE task_support_requests SET acknowledged = true, acknowledged_at = NOW()
             WHERE manager_id = $1 AND status = 'expired' AND acknowledged = false`,
            [userId]
        );

        // Acknowledge CV Khóa penalties
        await db.run(
            `UPDATE lock_task_completions SET acknowledged = true
             WHERE user_id = $1 AND status = 'expired' AND penalty_applied = true AND acknowledged = false`,
            [userId]
        );

        // Acknowledge CV Chuỗi penalties
        await db.run(
            `UPDATE chain_task_completions SET acknowledged = true
             WHERE user_id = $1 AND status = 'expired' AND penalty_applied = true AND acknowledged = false`,
            [userId]
        );

        // Acknowledge Cấp cứu sếp penalties
        await db.run(
            `UPDATE emergencies SET acknowledged = true
             WHERE (handler_id = $1 OR handover_to = $1) AND penalty_applied = true AND acknowledged = false`,
            [userId]
        );

        // Acknowledge KH chưa xử lý penalties
        await db.run(
            `UPDATE customer_penalty_records SET acknowledged = true
             WHERE user_id = $1 AND acknowledged = false`,
            [userId]
        );

        // Unlock account
        await db.run(
            "UPDATE users SET status = 'active' WHERE id = $1 AND status = 'locked'",
            [userId]
        );

        // Auto-pump telesale SĐT sau khi mở khóa
        let pumpMsg = '';
        try {
            const pumpResult = await runTelesalePumpForUser(userId);
            if (pumpResult.pumped > 0) pumpMsg = ` ${pumpResult.message}.`;
            else if (pumpResult.skipped) pumpMsg = ` ${pumpResult.message}.`;
        } catch (e) { console.error('[Telesale] Auto-pump error:', e.message); }

        return { success: true, message: `Đã xác nhận. Tài khoản đã được mở khóa.${pumpMsg}`, telesalePumped: pumpMsg ? true : false };
    });
}

module.exports = khoaTKNVRoutes;
