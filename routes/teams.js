const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

async function teamsRoutes(fastify, options) {

    // ========== CƠ CẤU TỔ CHỨC (DEPARTMENTS) ==========

    fastify.get('/api/departments', { preHandler: [authenticate] }, async (request, reply) => {
        // Ensure display_order column exists (safe migration)
        try { await db.exec('ALTER TABLE departments ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0'); } catch(e) {}

        let departments;
        try {
            departments = await db.all(`
                WITH RECURSIVE dept_tree AS (
                    SELECT id, id as root_id FROM departments
                    UNION ALL
                    SELECT d.id, dt.root_id FROM departments d JOIN dept_tree dt ON d.parent_id = dt.id
                )
                SELECT d.*, 
                       p.name as parent_name,
                       u.full_name as head_name,
                       (SELECT COUNT(*) FROM users WHERE department_id IN (SELECT id FROM dept_tree WHERE root_id = d.id)) as member_count
                FROM departments d
                LEFT JOIN departments p ON d.parent_id = p.id
                LEFT JOIN users u ON d.head_user_id = u.id
                ORDER BY d.parent_id IS NULL DESC, d.parent_id, d.display_order, d.name
            `);
        } catch(e) {
            // Fallback without display_order if column still missing
            departments = await db.all(`
                WITH RECURSIVE dept_tree AS (
                    SELECT id, id as root_id FROM departments
                    UNION ALL
                    SELECT d.id, dt.root_id FROM departments d JOIN dept_tree dt ON d.parent_id = dt.id
                )
                SELECT d.*, 
                       p.name as parent_name,
                       u.full_name as head_name,
                       (SELECT COUNT(*) FROM users WHERE department_id IN (SELECT id FROM dept_tree WHERE root_id = d.id)) as member_count
                FROM departments d
                LEFT JOIN departments p ON d.parent_id = p.id
                LEFT JOIN users u ON d.head_user_id = u.id
                ORDER BY d.parent_id IS NULL DESC, d.parent_id, d.name
            `);
        }
        return { departments };
    });

    fastify.get('/api/departments/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const dept = await db.get(`
            SELECT d.*, p.name as parent_name, u.full_name as head_name
            FROM departments d
            LEFT JOIN departments p ON d.parent_id = p.id
            LEFT JOIN users u ON d.head_user_id = u.id
            WHERE d.id = ?
        `, [Number(request.params.id)]);
        if (!dept) return reply.code(404).send({ error: 'Không tìm thấy đơn vị' });

        const members = await db.all(`
            SELECT id, full_name, phone, role, status, birth_date
            FROM users WHERE department_id = ?
            ORDER BY full_name
        `, [Number(request.params.id)]);

        return { department: dept, members };
    });

    fastify.post('/api/departments', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'trinh')] }, async (request, reply) => {
        const { name, code, parent_id, status } = request.body || {};
        if (!name || !code) return reply.code(400).send({ error: 'Tên đơn vị và mã đơn vị là bắt buộc' });

        const existing = await db.get('SELECT id FROM departments WHERE code = ?', [code]);
        if (existing) return reply.code(400).send({ error: 'Mã đơn vị đã tồn tại' });

        const result = await db.run(
            'INSERT INTO departments (name, code, parent_id, status) VALUES (?, ?, ?, ?)',
            [name, code, parent_id ? Number(parent_id) : null, status || 'active']
        );
        return { success: true, id: Number(result.lastInsertRowid), message: 'Tạo đơn vị thành công' };
    });

    fastify.put('/api/departments/:id', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'trinh')] }, async (request, reply) => {
        const { name, code, parent_id, head_user_id, status, display_order } = request.body || {};
        const id = Number(request.params.id);

        if (parent_id && Number(parent_id) === id) {
            return reply.code(400).send({ error: 'Đơn vị không thể thuộc chính nó' });
        }

        const updates = [];
        const params = [];
        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (code !== undefined) { updates.push('code = ?'); params.push(code); }
        if (parent_id !== undefined) { updates.push('parent_id = ?'); params.push(parent_id ? Number(parent_id) : null); }
        if (head_user_id !== undefined) { updates.push('head_user_id = ?'); params.push(head_user_id ? Number(head_user_id) : null); }
        if (status !== undefined) { updates.push('status = ?'); params.push(status); }
        if (display_order !== undefined) { updates.push('display_order = ?'); params.push(Number(display_order)); }

        if (updates.length > 0) {
            params.push(id);
            await db.run(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        // Auto-sync: when setting head_user_id, also add to task_approvers for approval system
        if (head_user_id !== undefined && head_user_id) {
            const huid = Number(head_user_id);
            // Upsert into task_approvers (department approver for task schedule)
            const existing = await db.get('SELECT id FROM task_approvers WHERE user_id = ? AND department_id = ?', [huid, id]);
            if (!existing) {
                await db.run('INSERT INTO task_approvers (user_id, department_id) VALUES (?, ?)', [huid, id]);
            }
        }

        if (status === 'active' || status === 'inactive') {
            const userStatus = status === 'active' ? 'active' : 'resigned';
            const deptIds = [id];
            async function collectChildren(parentId) {
                const children = await db.all('SELECT id FROM departments WHERE parent_id = ?', [parentId]);
                for (const c of children) { deptIds.push(c.id); await collectChildren(c.id); }
            }
            await collectChildren(id);
            for (const did of deptIds) {
                if (did !== id) {
                    await db.run('UPDATE departments SET status = ? WHERE id = ?', [status, did]);
                }
                await db.run('UPDATE users SET status = ? WHERE department_id = ?', [userStatus, did]);
            }
        }

        return { success: true, message: 'Cập nhật đơn vị thành công' };
    });

    fastify.delete('/api/departments/:id', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'trinh')] }, async (request, reply) => {
        const id = Number(request.params.id);
        await db.run('UPDATE departments SET parent_id = NULL WHERE parent_id = ?', [id]);
        await db.run('UPDATE users SET department_id = NULL WHERE department_id = ?', [id]);
        await db.run('DELETE FROM departments WHERE id = ?', [id]);
        return { success: true, message: 'Xóa đơn vị thành công' };
    });

    fastify.post('/api/departments/:id/assign', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'trinh')] }, async (request, reply) => {
        const { user_id } = request.body || {};
        if (!user_id) return reply.code(400).send({ error: 'Chọn nhân viên' });
        const deptId = Number(request.params.id);
        const userId = Number(user_id);

        // Validate: user must not be assigned to another department
        const user = await db.get('SELECT id, full_name, department_id FROM users WHERE id = ?', [userId]);
        if (!user) return reply.code(404).send({ error: 'Không tìm thấy nhân viên' });
        if (user.department_id && user.department_id !== deptId) {
            const currentDept = await db.get('SELECT name FROM departments WHERE id = ?', [user.department_id]);
            return reply.code(400).send({ error: `${user.full_name} đang thuộc đơn vị "${currentDept?.name || user.department_id}". Phải gỡ ra trước.` });
        }

        await db.run('UPDATE users SET department_id = ? WHERE id = ?', [deptId, userId]);
        return { success: true, message: 'Đã gán nhân viên vào đơn vị' };
    });

    fastify.post('/api/departments/:id/unassign', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'trinh')] }, async (request, reply) => {
        const { user_id } = request.body || {};
        if (!user_id) return reply.code(400).send({ error: 'Chọn nhân viên' });
        await db.run('UPDATE users SET department_id = NULL WHERE id = ? AND department_id = ?', [Number(user_id), Number(request.params.id)]);
        return { success: true, message: 'Đã gỡ nhân viên khỏi đơn vị' };
    });

    // ========== LEGACY TEAMS ==========

    fastify.get('/api/teams', { preHandler: [authenticate] }, async (request, reply) => {
        const teams = await db.all(`
            SELECT t.id, t.name, t.manager_id, t.leader_id, t.created_at,
                   m.full_name as manager_name, l.full_name as leader_name,
                   (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
            FROM teams t
            LEFT JOIN users m ON t.manager_id = m.id
            LEFT JOIN users l ON t.leader_id = l.id
            ORDER BY t.created_at DESC
        `);
        return { teams };
    });

    fastify.get('/api/teams/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const team = await db.get(`
            SELECT t.*, m.full_name as manager_name, l.full_name as leader_name
            FROM teams t LEFT JOIN users m ON t.manager_id = m.id LEFT JOIN users l ON t.leader_id = l.id
            WHERE t.id = ?
        `, [Number(request.params.id)]);
        if (!team) return reply.code(404).send({ error: 'Không tìm thấy team' });
        const members = await db.all(`
            SELECT u.id, u.full_name, u.phone, u.role, u.status
            FROM team_members tm JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = ? ORDER BY u.full_name
        `, [Number(request.params.id)]);
        return { team, members };
    });

    // ========== PERMISSIONS API ==========

    fastify.get('/api/permissions/org-tree', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'trinh')] }, async (request, reply) => {
        const departments = await db.all(`
            SELECT d.id, d.name, d.code, d.parent_id, d.head_user_id
            FROM departments d ORDER BY d.parent_id IS NULL DESC, d.parent_id, d.name
        `);
        const users = await db.all(`
            SELECT u.id, u.full_name, u.department_id, u.role
            FROM users u WHERE u.status = 'active'
            ORDER BY u.full_name
        `);
        return { departments, users };
    });

    fastify.get('/api/permissions/:targetType/:targetId', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'trinh')] }, async (request, reply) => {
        const { targetType, targetId } = request.params;
        const perms = await db.all(
            'SELECT * FROM permissions WHERE target_type = ? AND target_id = ?',
            [targetType, Number(targetId)]
        );
        return { permissions: perms };
    });

    fastify.post('/api/permissions/:targetType/:targetId', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'trinh')] }, async (request, reply) => {
        const { targetType, targetId } = request.params;
        const { permissions } = request.body || {};
        if (!permissions || !Array.isArray(permissions)) {
            return reply.code(400).send({ error: 'Dữ liệu không hợp lệ' });
        }

        await db.run('DELETE FROM permissions WHERE target_type = ? AND target_id = ?', [targetType, Number(targetId)]);
        for (const p of permissions) {
            const cv = typeof p.can_view === 'number' ? p.can_view : 0;
            const cc = typeof p.can_create === 'number' ? p.can_create : 0;
            const ce = typeof p.can_edit === 'number' ? p.can_edit : 0;
            const cd = typeof p.can_delete === 'number' ? p.can_delete : 0;
            if (cv !== 0 || cc !== 0 || ce !== 0 || cd !== 0) {
                await db.run(`INSERT INTO permissions (target_type, target_id, feature, can_view, can_create, can_edit, can_delete)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [targetType, Number(targetId), p.feature, cv, cc, ce, cd]
                );
            }
        }

        if (targetType === 'department') {
            const childDeptIds = [];
            async function collectChildren(parentId) {
                const children = await db.all('SELECT id FROM departments WHERE parent_id = ?', [parentId]);
                for (const c of children) { childDeptIds.push(c.id); await collectChildren(c.id); }
            }
            await collectChildren(Number(targetId));

            async function cascadePerms(tType, tId) {
                await db.run('DELETE FROM permissions WHERE target_type = ? AND target_id = ?', [tType, tId]);
                for (const p of permissions) {
                    const cv = typeof p.can_view === 'number' ? p.can_view : 0;
                    const cc = typeof p.can_create === 'number' ? p.can_create : 0;
                    const ce = typeof p.can_edit === 'number' ? p.can_edit : 0;
                    const cd = typeof p.can_delete === 'number' ? p.can_delete : 0;
                    if (cv !== 0 || cc !== 0 || ce !== 0 || cd !== 0) {
                        await db.run('INSERT INTO permissions (target_type, target_id, feature, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [tType, tId, p.feature, cv, cc, ce, cd]);
                    }
                }
            }

            for (const childId of childDeptIds) {
                await cascadePerms('department', childId);
            }

            const allDeptIds = [Number(targetId), ...childDeptIds];
            for (const deptId of allDeptIds) {
                const usersInDept = await db.all('SELECT id FROM users WHERE department_id = ? AND status = ?', [deptId, 'active']);
                for (const u of usersInDept) {
                    await cascadePerms('user', u.id);
                }
            }
        }

        return { success: true, message: 'Đã lưu phân quyền' };
    });
}

module.exports = teamsRoutes;
