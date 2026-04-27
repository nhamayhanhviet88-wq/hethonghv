const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function authRoutes(fastify, options) {
    // Đăng nhập
    fastify.post('/api/auth/login', async (request, reply) => {
        const { username, password } = request.body || {};
        if (!username || !password) {
            return reply.code(400).send({ error: 'Vui lòng nhập tài khoản và mật khẩu' });
        }

        const user = await db.get(
            'SELECT id, username, password_hash, full_name, role, status, order_code_prefix, department_id, department_joined_at FROM users WHERE username = ?',
            [username]
        );

        if (!user) {
            return reply.code(401).send({ error: 'Tài khoản hoặc mật khẩu không đúng' });
        }

        if (user.status === 'resigned') {
            return reply.code(403).send({ error: 'Tài khoản đã bị vô hiệu hóa' });
        }

        // Nếu TK thử việc bị khóa (hết hạn) → CHẶN, không tự mở khóa
        if (user.status === 'probation_locked') {
            return reply.code(403).send({ error: 'Tài khoản thử việc đã hết hạn. Vui lòng liên hệ Giám Đốc hoặc Quản Lý Cấp Cao để ký hợp đồng mới.' });
        }

        // Double-check: Nếu thu_viec + active + quá hạn → khóa ngay tại login
        if (user.role === 'thu_viec' && user.status === 'active') {
            const probRow = await db.get('SELECT probation_end_date FROM users WHERE id = ?', [user.id]);
            if (probRow && probRow.probation_end_date && new Date(probRow.probation_end_date) <= new Date()) {
                await db.run("UPDATE users SET status = 'probation_locked' WHERE id = $1", [user.id]);
                return reply.code(403).send({ error: 'Tài khoản thử việc đã hết hạn. Vui lòng liên hệ Giám Đốc hoặc Quản Lý Cấp Cao để ký hợp đồng mới.' });
            }
        }

        // Nếu TK bị locked (từ dữ liệu cũ) → tự mở khóa, cho login bình thường
        // Popup thông báo phạt sẽ hiện sau khi login (xử lý trong app.js)
        if (user.status === 'locked') {
            await db.run("UPDATE users SET status = 'active' WHERE id = $1", [user.id]);
        }

        // Check if user's department (or any parent dept) is inactive
        if (user.department_id) {
            let deptId = user.department_id;
            while (deptId) {
                const dept = await db.get('SELECT id, parent_id, status FROM departments WHERE id = ?', [deptId]);
                if (!dept) break;
                if (dept.status === 'inactive') {
                    return reply.code(403).send({ error: 'Đơn vị của bạn đã ngưng hoạt động. Vui lòng liên hệ quản lý.' });
                }
                deptId = dept.parent_id;
            }
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return reply.code(401).send({ error: 'Tài khoản hoặc mật khẩu không đúng' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        reply.setCookie('token', token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60
        });

        return { success: true, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } };
    });

    // Đăng xuất
    fastify.post('/api/auth/logout', async (request, reply) => {
        reply.clearCookie('token', { path: '/' });
        return { success: true };
    });

    // Lấy thông tin user hiện tại + effective permissions
    fastify.get('/api/auth/me', { preHandler: authenticate }, async (request, reply) => {
        const user = await db.get(
            'SELECT id, username, full_name, phone, role, status, telegram_group_id, order_code_prefix, department_id, managed_by_user_id FROM users WHERE id = ?',
            [request.user.id]
        );

        if (!user) {
            return reply.code(404).send({ error: 'Không tìm thấy tài khoản' });
        }

        // Compute effective permissions
        // IMPORTANT: These keys must match PERM_FEATURES in permissions.js AND MENU_PERM_MAP in app.js
        // Any key here that is NOT in PERM_FEATURES will always resolve to {can_view:0,...} (harmless but dead code)
        // Any key in MENU_PERM_MAP that is NOT here will cause the menu to be HIDDEN for non-giam_doc users
        const ALL_FEATURES = [
            'tong_quan','so_hom_nay','crm_nhu_cau','crm_ctv',
            'crm_affiliate','crm_koc_kol',
            'huy_khach',
            'nhan_vien','co_cau_to_chuc','phan_quyen','cap_cuu_sep','chuyen_so','cai_dat',
            'lich_su_bao_cao','trao_giai_thuong'
        ];

        let permissions = {};

        if (user.role === 'giam_doc') {
            ALL_FEATURES.forEach(f => {
                permissions[f] = { can_view: 1, can_create: 1, can_edit: 1, can_delete: 1 };
            });
        } else {
            const deptPerms = {};
            if (user.department_id) {
                const rows = await db.all(
                    "SELECT feature, can_view, can_create, can_edit, can_delete FROM permissions WHERE target_type='department' AND target_id=?",
                    [user.department_id]
                );
                rows.forEach(r => { deptPerms[r.feature] = r; });
            }

            const userPerms = {};
            const uRows = await db.all(
                "SELECT feature, can_view, can_create, can_edit, can_delete FROM permissions WHERE target_type='user' AND target_id=?",
                [user.id]
            );
            uRows.forEach(r => { userPerms[r.feature] = r; });

            const PERM_KEYS = ['can_view','can_create','can_edit','can_delete'];
            ALL_FEATURES.forEach(f => {
                const d = deptPerms[f] || {};
                const u = userPerms[f] || {};
                const result = {};
                PERM_KEYS.forEach(pk => {
                    if (u[pk] === -1) {
                        result[pk] = 0;
                    } else {
                        result[pk] = (d[pk] > 0 || u[pk] > 0) ? 1 : 0;
                    }
                });
                permissions[f] = result;
            });
        }

        // Fetch manager info for affiliate users
        if (user.role === 'tkaffiliate' && user.managed_by_user_id) {
            const manager = await db.get('SELECT full_name, phone FROM users WHERE id = ?', [user.managed_by_user_id]);
            if (manager) {
                user.manager_phone = manager.phone;
                user.manager_name = manager.full_name;
            }
        }

        user.permissions = permissions;
        return { user };
    });

    // Đổi mật khẩu (tự đổi)
    fastify.post('/api/auth/change-password', { preHandler: authenticate }, async (request, reply) => {
        const { currentPassword, newPassword } = request.body || {};
        if (!currentPassword || !newPassword) {
            return reply.code(400).send({ error: 'Vui lòng nhập mật khẩu cũ và mới' });
        }
        if (newPassword.length < 4) {
            return reply.code(400).send({ error: 'Mật khẩu mới phải ít nhất 4 ký tự' });
        }

        const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [request.user.id]);
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return reply.code(400).send({ error: 'Mật khẩu cũ không đúng' });
        }

        const hash = await bcrypt.hash(newPassword, 10);
        await db.run("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [hash, request.user.id]);

        return { success: true, message: 'Đổi mật khẩu thành công' };
    });
}

module.exports = authRoutes;
