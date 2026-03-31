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
        if (!['giam_doc','trinh'].includes(request.user.role)) {
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
        if (!['giam_doc','trinh'].includes(request.user.role)) {
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

        let whereClause = '';
        let params = [monthStart, monthEnd];

        if (userRole === 'giam_doc') {
            // See all
            whereClause = `WHERE sr.status = 'expired' AND sr.task_date BETWEEN $1 AND $2`;
        } else if (['quan_ly', 'truong_phong', 'trinh'].includes(userRole)) {
            // See users in their dept scope
            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            if (!user || !user.department_id) return { penalties: [], total: 0 };

            // Get all depts under this user's dept
            const deptIds = [user.department_id];
            const children = await db.all('SELECT id FROM departments WHERE parent_id = $1', [user.department_id]);
            children.forEach(c => deptIds.push(c.id));
            for (const child of children) {
                const grandchildren = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
                grandchildren.forEach(gc => deptIds.push(gc.id));
            }

            const placeholders = deptIds.map((_, i) => `$${i + 3}`).join(',');
            whereClause = `WHERE sr.status = 'expired' AND sr.task_date BETWEEN $1 AND $2 AND sr.department_id IN (${placeholders})`;
            params.push(...deptIds);
        } else {
            // NV: only self (as manager who got locked, OR as user who requested)
            whereClause = `WHERE sr.status = 'expired' AND sr.task_date BETWEEN $1 AND $2 AND (sr.manager_id = $3 OR sr.user_id = $3)`;
            params.push(userId);
        }

        const penalties = await db.all(
            `SELECT sr.*, sr.task_date::text as task_date, sr.deadline::text as deadline,
                    u.full_name as user_name, u.username,
                    m.full_name as manager_name, m.username as manager_username,
                    d.name as dept_name
             FROM task_support_requests sr
             LEFT JOIN users u ON sr.user_id = u.id
             LEFT JOIN users m ON sr.manager_id = m.id
             LEFT JOIN departments d ON sr.department_id = d.id
             ${whereClause}
             ORDER BY sr.task_date DESC, m.full_name`,
            params
        );

        const total = penalties.reduce((s, p) => s + (p.penalty_amount || 0), 0);

        return { penalties, total };
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

        const items = await db.all(
            `SELECT sr.task_name, sr.task_date::text as task_date, sr.penalty_amount, sr.penalty_reason,
                    u.full_name as requested_by
             FROM task_support_requests sr
             LEFT JOIN users u ON sr.user_id = u.id
             WHERE sr.manager_id = $1 AND sr.status = 'expired' AND sr.task_date BETWEEN $2 AND $3
             ORDER BY sr.task_date`,
            [managerId, monthStart, monthEnd]
        );

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

        // Acknowledge CV Khóa penalties (set penalty_amount to 0 so they won't show again)
        await db.run(
            `UPDATE lock_task_completions SET penalty_amount = 0
             WHERE user_id = $1 AND status = 'expired' AND penalty_applied = true AND penalty_amount > 0`,
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
            `UPDATE lock_task_completions SET penalty_amount = 0
             WHERE user_id = $1 AND status = 'expired' AND penalty_applied = true AND penalty_amount > 0`,
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
