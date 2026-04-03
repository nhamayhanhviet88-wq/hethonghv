const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function khoaTKNVRoutes(fastify, options) {

    // ========== PENALTY CONFIG ==========

    // GET: Lấy cấu hình phạt theo phòng ban + người chịu trách nhiệm
    fastify.get('/api/penalty/config', { preHandler: [authenticate] }, async (request, reply) => {
        // Get all departments that have active teams
        const departments = await db.all(
            `SELECT d.id, d.name, d.parent_id,
                    COALESCE(pc.penalty_amount, 50000) as penalty_amount
             FROM departments d
             LEFT JOIN dept_penalty_config pc ON pc.department_id = d.id
             ORDER BY d.name`
        );

        // Get approvers for each department
        const approvers = await db.all(
            `SELECT ta.department_id, ta.user_id as approver_id, u.full_name, u.username
             FROM task_approvers ta
             JOIN users u ON u.id = ta.user_id
             ORDER BY ta.department_id`
        );

        // Map approvers by dept
        const approverMap = {};
        approvers.forEach(a => {
            approverMap[a.department_id] = { id: a.approver_id, name: a.full_name, username: a.username };
        });

        const configs = departments.map(d => ({
            department_id: d.id,
            department_name: d.name,
            parent_id: d.parent_id,
            penalty_amount: d.penalty_amount,
            approver: approverMap[d.id] || null
        }));

        return { configs };
    });

    // POST: Set/update mức phạt theo phòng ban
    fastify.post('/api/penalty/config', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ giám đốc được cấu hình mức phạt' });
        }

        const { configs } = request.body || {};
        if (!configs || !Array.isArray(configs)) {
            return reply.code(400).send({ error: 'Thiếu dữ liệu' });
        }

        for (const cfg of configs) {
            if (!cfg.department_id) continue;
            await db.run(
                `INSERT INTO dept_penalty_config (department_id, penalty_amount, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (department_id) DO UPDATE SET penalty_amount = $2, updated_at = NOW()`,
                [cfg.department_id, Number(cfg.penalty_amount) || 50000]
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
        const month = request.query.month; // YYYY-MM format

        if (!month) {
            return reply.code(400).send({ error: 'Thiếu tháng (month=YYYY-MM)' });
        }

        const monthStart = `${month}-01`;
        const [y, m] = month.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

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
                    u.full_name as user_name, u.username,
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
            manager_id: p.user_id,
            manager_name: p.user_name,
            manager_username: p.username,
            acknowledged: p.acknowledged || false
        }));

        // Combine all
        const allPenalties = [...srPenalties, ...ltFormatted];
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

        const items = [...srItems, ...ltItems];
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

        const pending = await db.all(
            `SELECT sr.id, sr.task_name, sr.task_date::text as task_date, sr.penalty_amount, sr.penalty_reason,
                    u.full_name as requested_by
             FROM task_support_requests sr
             LEFT JOIN users u ON sr.user_id = u.id
             WHERE sr.manager_id = $1 AND sr.status = 'expired' AND sr.acknowledged = false
             ORDER BY sr.task_date`,
            [userId]
        );

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

        // Unlock account
        await db.run(
            "UPDATE users SET status = 'active' WHERE id = $1 AND status = 'locked'",
            [user.id]
        );

        return { success: true, message: 'Đã xác nhận. Tài khoản đã được mở khóa.' };
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

        // Unlock account
        await db.run(
            "UPDATE users SET status = 'active' WHERE id = $1 AND status = 'locked'",
            [userId]
        );

        return { success: true, message: 'Đã xác nhận. Tài khoản đã được mở khóa.' };
    });
}

module.exports = khoaTKNVRoutes;
