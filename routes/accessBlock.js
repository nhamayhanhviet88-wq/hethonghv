const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// ========== CONSTANTS ==========
const ROLE_RANK = {
    giam_doc: 5, quan_ly_cap_cao: 4, quan_ly: 3, truong_phong: 2,
    nhan_vien: 1, thu_viec: 0, part_time: 0, hoa_hong: 0, tkaffiliate: 0
};

// ========== HELPERS ==========

// Lấy tất cả department IDs mà user quản lý (head_user_id + children đệ quy)
async function _getManagedDeptIds(userId) {
    const allDepts = await db.all('SELECT id, parent_id, head_user_id FROM departments');
    const headDepts = allDepts.filter(d => d.head_user_id === userId);
    function getChildren(parentId) {
        let ids = [parentId];
        allDepts.filter(d => d.parent_id === parentId).forEach(c => ids.push(...getChildren(c.id)));
        return ids;
    }
    let result = [];
    headDepts.forEach(d => result.push(...getChildren(d.id)));
    return [...new Set(result)];
}

// Kiểm tra user có phải Nhân Sự Toàn Quyền (GĐ chỉ định)
async function _isDesignatedHR(userId) {
    try {
        const cfg = await db.get("SELECT value FROM app_config WHERE key = 'access_unblock_managers'");
        if (cfg && cfg.value) return JSON.parse(cfg.value).includes(userId);
    } catch(e) {}
    return false;
}

// Kiểm tra user A có được mở khóa user B không
async function _canUnlockUser(unlocker, target) {
    if (unlocker.id === target.id) return false; // Không tự mở
    if (unlocker.role === 'giam_doc') return true;
    if (await _isDesignatedHR(unlocker.id)) return true; // HR toàn quyền (trừ self)
    const uRank = ROLE_RANK[unlocker.role] || 0;
    const tRank = ROLE_RANK[target.role] || 0;
    if (uRank <= tRank) return false; // Chỉ mở cấp dưới
    if (uRank <= 2) return false; // TP trở xuống không có quyền mở
    const managedDepts = await _getManagedDeptIds(unlocker.id);
    return managedDepts.includes(target.department_id);
}

// Kiểm tra user có quyền vào trang /mokhoatkphat
async function _canAccessPage(userId, userRole) {
    if (['giam_doc', 'quan_ly_cap_cao', 'quan_ly'].includes(userRole)) return true;
    return await _isDesignatedHR(userId);
}

// Tìm quản lý trong cơ cấu tổ chức để NV bị chặn liên hệ
async function _getMyManagers(userId) {
    const user = await db.get('SELECT id, role, department_id FROM users WHERE id = $1', [userId]);
    if (!user || !user.department_id) return [];
    const userRank = ROLE_RANK[user.role] || 0;
    const managers = [];
    const seen = new Set();
    let currentDeptId = user.department_id;
    const visited = new Set();
    while (currentDeptId && !visited.has(currentDeptId)) {
        visited.add(currentDeptId);
        const dept = await db.get('SELECT id, name, parent_id, head_user_id FROM departments WHERE id = $1', [currentDeptId]);
        if (!dept) break;
        if (dept.head_user_id && dept.head_user_id !== userId && !seen.has(dept.head_user_id)) {
            const head = await db.get("SELECT id, full_name, role, phone FROM users WHERE id = $1 AND status = 'active'", [dept.head_user_id]);
            if (head && (ROLE_RANK[head.role] || 0) > userRank) {
                seen.add(head.id);
                managers.push({ id: head.id, full_name: head.full_name, role: head.role, phone: head.phone, department: dept.name });
            }
        }
        currentDeptId = dept.parent_id;
    }
    // Thêm GĐ làm fallback
    const gds = await db.all("SELECT id, full_name, role, phone FROM users WHERE role = 'giam_doc' AND status = 'active'");
    gds.forEach(gd => { if (!seen.has(gd.id)) managers.push({ ...gd, department: 'Giám Đốc' }); });
    // Thêm HR toàn quyền
    try {
        const cfg = await db.get("SELECT value FROM app_config WHERE key = 'access_unblock_managers'");
        if (cfg && cfg.value) {
            const hrIds = JSON.parse(cfg.value).filter(id => id !== userId && !seen.has(id));
            if (hrIds.length > 0) {
                const phs = hrIds.map((_, i) => `$${i + 1}`).join(',');
                const hrs = await db.all(`SELECT id, full_name, role, phone FROM users WHERE id IN (${phs}) AND status = 'active'`, hrIds);
                hrs.forEach(h => managers.push({ ...h, department: 'Nhân Sự Toàn Quyền' }));
            }
        }
    } catch(e) {}
    return managers;
}

async function accessBlockRoutes(fastify, options) {

    // ========== GET: Trạng thái chặn + quản lý cần liên hệ ==========
    fastify.get('/api/access-block/status', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const user = await db.get('SELECT access_blocked, access_blocked_at, access_blocked_reason FROM users WHERE id = $1', [userId]);
        if (!user || !user.access_blocked) return { blocked: false };

        // Tìm quản lý từ cơ cấu tổ chức (thay vì config cũ)
        const unlockers = await _getMyManagers(userId);

        let penalties = [];
        try { penalties = user.access_blocked_reason ? JSON.parse(user.access_blocked_reason) : []; }
        catch(e) { penalties = [{ task_name: user.access_blocked_reason || 'Vi phạm quy định', penalty_amount: 0 }]; }

        return { blocked: true, blocked_at: user.access_blocked_at, penalties, unlockers };
    });

    // ========== GET: Danh sách bị chặn (SCOPED theo cơ cấu) ==========
    fastify.get('/api/access-block/blocked-list', { preHandler: [authenticate] }, async (request, reply) => {
        if (!(await _canAccessPage(request.user.id, request.user.role)))
            return reply.code(403).send({ error: 'Không có quyền truy cập' });

        const allBlocked = await db.all(
            `SELECT u.id, u.username, u.full_name, u.role, u.phone,
                    u.department_id, u.access_blocked_at, u.access_blocked_reason,
                    d.name as dept_name
             FROM users u LEFT JOIN departments d ON d.id = u.department_id
             WHERE u.access_blocked = true AND u.status = 'active'
             ORDER BY u.access_blocked_at DESC`
        );

        // Lọc theo quyền mở khóa của người xem
        let filtered;
        const me = request.user;
        if (me.role === 'giam_doc') {
            filtered = allBlocked;
        } else if (await _isDesignatedHR(me.id)) {
            filtered = allBlocked.filter(u => u.id !== me.id);
        } else {
            const managedDepts = await _getManagedDeptIds(me.id);
            const myRank = ROLE_RANK[me.role] || 0;
            filtered = allBlocked.filter(u => {
                if (u.id === me.id) return false;
                if ((ROLE_RANK[u.role] || 0) >= myRank) return false;
                return managedDepts.includes(u.department_id);
            });
        }

        const result = filtered.map(u => {
            let penalties = [];
            try { penalties = u.access_blocked_reason ? JSON.parse(u.access_blocked_reason) : []; }
            catch(e) { penalties = [{ task_name: u.access_blocked_reason || 'Vi phạm', penalty_amount: 0 }]; }
            return {
                id: u.id, username: u.username, full_name: u.full_name, role: u.role,
                phone: u.phone, department_id: u.department_id, dept_name: u.dept_name,
                blocked_at: u.access_blocked_at, penalties,
                penalty_total: penalties.reduce((s, p) => s + (p.penalty_amount || 0), 0)
            };
        });
        return { blocked: result, count: result.length };
    });

    // ========== POST: Mở khóa 1 user (kiểm tra quyền theo cơ cấu) ==========
    fastify.post('/api/access-block/unblock', { preHandler: [authenticate] }, async (request, reply) => {
        const { user_id } = request.body || {};
        if (!user_id) return reply.code(400).send({ error: 'Thiếu user_id' });

        const target = await db.get('SELECT id, full_name, role, department_id, access_blocked, access_blocked_reason FROM users WHERE id = $1', [user_id]);
        if (!target) return reply.code(404).send({ error: 'Không tìm thấy tài khoản' });
        if (!target.access_blocked) return { success: true, message: 'Tài khoản không bị chặn' };

        const me = { id: request.user.id, role: request.user.role };
        if (!(await _canUnlockUser(me, target)))
            return reply.code(403).send({ error: 'Bạn không có quyền mở khóa tài khoản này' });

        let penaltyTotal = 0;
        try { penaltyTotal = JSON.parse(target.access_blocked_reason || '[]').reduce((s, p) => s + (p.penalty_amount || 0), 0); } catch(e) {}

        await db.run('UPDATE users SET access_blocked = false, access_blocked_at = NULL, access_blocked_reason = NULL WHERE id = $1', [user_id]);
        await db.run('INSERT INTO access_unblock_logs (user_id, unblocked_by, blocked_reason, penalty_total) VALUES ($1, $2, $3, $4)',
            [user_id, request.user.id, target.access_blocked_reason || '', penaltyTotal]);

        console.log(`🔓 [Access Block] Mở khóa ${target.full_name} (id=${user_id}) bởi ${request.user.full_name} (id=${request.user.id})`);
        return { success: true, message: `Đã mở khóa cho ${target.full_name}` };
    });

    // ========== POST: Mở khóa tất cả (SCOPED) ==========
    fastify.post('/api/access-block/unblock-all', { preHandler: [authenticate] }, async (request, reply) => {
        if (!(await _canAccessPage(request.user.id, request.user.role)))
            return reply.code(403).send({ error: 'Không có quyền' });

        const allBlocked = await db.all("SELECT id, full_name, role, department_id, access_blocked_reason FROM users WHERE access_blocked = true AND status = 'active'");
        let count = 0;
        const me = { id: request.user.id, role: request.user.role };

        for (const u of allBlocked) {
            if (!(await _canUnlockUser(me, u))) continue;
            let pt = 0;
            try { pt = JSON.parse(u.access_blocked_reason || '[]').reduce((s, p) => s + (p.penalty_amount || 0), 0); } catch(e) {}
            await db.run('UPDATE users SET access_blocked = false, access_blocked_at = NULL, access_blocked_reason = NULL WHERE id = $1', [u.id]);
            await db.run('INSERT INTO access_unblock_logs (user_id, unblocked_by, blocked_reason, penalty_total) VALUES ($1, $2, $3, $4)',
                [u.id, request.user.id, u.access_blocked_reason || '', pt]);
            count++;
        }
        console.log(`🔓 [Access Block] Mở khóa ${count} người bởi ${request.user.full_name}`);
        return { success: true, message: `Đã mở khóa ${count} tài khoản`, count };
    });

    // ========== GET: Lịch sử mở khóa ==========
    fastify.get('/api/access-block/logs', { preHandler: [authenticate] }, async (request, reply) => {
        if (!(await _canAccessPage(request.user.id, request.user.role)))
            return reply.code(403).send({ error: 'Không có quyền' });
        const dateFilter = request.query.date || new Date().toISOString().split('T')[0];
        const logs = await db.all(
            `SELECT al.id, al.user_id, al.unblocked_by, al.blocked_reason, al.penalty_total, al.created_at,
                    u.full_name as user_name, u.username as user_username,
                    ub.full_name as unblocked_by_name
             FROM access_unblock_logs al
             LEFT JOIN users u ON u.id = al.user_id
             LEFT JOIN users ub ON ub.id = al.unblocked_by
             WHERE al.created_at::date = $1::date ORDER BY al.created_at DESC`, [dateFilter]);
        return { logs };
    });

    // ========== CÀI ĐẶT NHÂN SỰ TOÀN QUYỀN (GĐ only) ==========
    fastify.get('/api/access-block/settings', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc được cài đặt' });
        const cfg = await db.get("SELECT value FROM app_config WHERE key = 'access_unblock_managers'");
        const ids = cfg && cfg.value ? JSON.parse(cfg.value) : [];
        let managers = [];
        if (ids.length > 0) {
            const phs = ids.map((_, i) => `$${i + 1}`).join(',');
            managers = await db.all(`SELECT id, username, full_name, role, phone FROM users WHERE id IN (${phs})`, ids);
        }
        return { manager_ids: ids, managers };
    });

    fastify.post('/api/access-block/settings', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc được cài đặt' });
        const { manager_ids } = request.body || {};
        if (!Array.isArray(manager_ids)) return reply.code(400).send({ error: 'manager_ids phải là mảng' });
        for (const id of manager_ids) {
            const u = await db.get('SELECT id FROM users WHERE id = $1', [id]);
            if (!u) return reply.code(400).send({ error: `User id=${id} không tồn tại` });
        }
        await db.run(`INSERT INTO app_config (key, value) VALUES ('access_unblock_managers', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [JSON.stringify(manager_ids)]);
        return { success: true, message: 'Đã lưu cài đặt', manager_ids };
    });

    fastify.get('/api/access-block/user-list', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Không có quyền' });
        const users = await db.all("SELECT id, username, full_name, role FROM users WHERE status = 'active' AND role != 'giam_doc' ORDER BY full_name");
        return { users };
    });
}

module.exports = accessBlockRoutes;
