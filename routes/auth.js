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

        if (user.status === 'locked') {
            // Load global penalty config for today's per-task penalty amount
            const _gpcRows = await db.all('SELECT key, amount FROM global_penalty_config');
            const GPC = {};
            _gpcRows.forEach(r => { GPC[r.key] = Number(r.amount) || 0; });
            const todayPenaltyKhoa = GPC.cv_khoa_khong_nop || 50000;
            const todayPenaltyChuoi = GPC.cv_chuoi_khong_nop || 50000;

            const todayStr = new Date().toISOString().split('T')[0];

            // Source 1: CV Khóa — ALL unreported expired (not just latest date)
            const lockPenalties = await db.all(
                `SELECT ltc.completion_date::text as task_date, lt.task_name
                 FROM lock_task_completions ltc
                 JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
                 WHERE ltc.user_id = $1 AND ltc.status = 'expired' AND ltc.penalty_applied = true
                   AND ltc.redo_count >= 0 AND ltc.completion_date >= NOW() - INTERVAL '90 days'
                   AND ($2::timestamp IS NULL OR ltc.completion_date >= $2::date)
                 ORDER BY ltc.completion_date DESC`,
                [user.id, user.department_joined_at]
            );
            // Filter: only include if NV hasn't re-submitted
            const khoaPenalties = [];
            for (const lp of lockPenalties) {
                const resubmitted = await db.get(
                    `SELECT id FROM lock_task_completions
                     WHERE lock_task_id = (SELECT id FROM lock_tasks WHERE task_name = $1 LIMIT 1)
                       AND user_id = $2 AND completion_date::text = $3
                       AND status IN ('pending','approved') AND redo_count > 0`,
                    [lp.task_name, user.id, lp.task_date]
                );
                if (!resubmitted) {
                    khoaPenalties.push({
                        task_name: lp.task_name, task_date: lp.task_date,
                        penalty_amount: todayPenaltyKhoa,
                        reason: `Chưa báo cáo lại đến ${todayStr.split('-').reverse().join('/')}`,
                        source: 'khoa'
                    });
                }
            }

            // Source 2: CV Chuỗi — ALL unreported expired
            const chainPenalties = [];
            try {
                const chainExpired = await db.all(
                    `SELECT cc.chain_item_id, ci.task_name, ci.deadline::text as task_date,
                            cins.chain_name
                     FROM chain_task_completions cc
                     JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
                     JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
                     WHERE cc.user_id = $1 AND cc.status = 'expired' AND cc.penalty_applied = true
                       AND cc.redo_count >= 0 AND ci.deadline >= NOW() - INTERVAL '90 days'
                       AND ($2::timestamp IS NULL OR ci.deadline >= $2::date)
                     ORDER BY ci.deadline DESC`,
                    [user.id, user.department_joined_at]
                );
                for (const ce of chainExpired) {
                    const resubmitted = await db.get(
                        `SELECT id FROM chain_task_completions
                         WHERE chain_item_id = $1 AND user_id = $2
                           AND status IN ('pending','approved') AND redo_count > 0`,
                        [ce.chain_item_id, user.id]
                    );
                    if (!resubmitted) {
                        chainPenalties.push({
                            task_name: `${ce.chain_name} — ${ce.task_name}`,
                            task_date: ce.task_date,
                            penalty_amount: todayPenaltyChuoi,
                            reason: `Chưa nộp đến ${todayStr.split('-').reverse().join('/')}`,
                            source: 'chuoi'
                        });
                    }
                }
            } catch(e) {}

            // Source 3: Support requests (QL không hỗ trợ NV) — ALL unreported
            const supportPenalties = await db.all(
                `SELECT sr.task_name, sr.task_date::text as task_date, sr.penalty_amount, sr.penalty_reason,
                        u.full_name as employee_name
                 FROM task_support_requests sr
                 LEFT JOIN users u ON u.id = sr.user_id
                 WHERE sr.manager_id = $1 AND sr.status = 'expired' AND sr.task_date >= NOW() - INTERVAL '90 days'
                 ORDER BY sr.task_date DESC`,
                [user.id]
            );

            const htPenalties = [];
            const diemPenalties = [];
            for (const sp of supportPenalties) {
                const item = {
                    task_name: sp.task_name, task_date: sp.task_date,
                    penalty_amount: sp.penalty_amount || 0,
                    reason: sp.penalty_reason, employee_name: sp.employee_name
                };
                if (sp.penalty_reason && sp.penalty_reason.includes('Không duyệt')) {
                    diemPenalties.push({ ...item, source: 'diem' });
                } else {
                    htPenalties.push({ ...item, source: 'support' });
                }
            }

            // Total = today's penalty per task × number of unreported tasks
            const totalFine = khoaPenalties.length * todayPenaltyKhoa
                + chainPenalties.length * todayPenaltyChuoi
                + [...htPenalties, ...diemPenalties].reduce((s, p) => s + (p.penalty_amount || 0), 0);

            return reply.code(403).send({
                error: 'locked',
                locked: true,
                penaltyDate: todayStr,
                penaltyGroups: {
                    khoa: khoaPenalties,
                    chuoi: chainPenalties,
                    diem: diemPenalties,
                    support: htPenalties
                },
                penalties: [...khoaPenalties, ...chainPenalties, ...diemPenalties, ...htPenalties],
                totalFine,
                userId: user.id,
                username: user.username,
                fullName: user.full_name
            });
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
        const ALL_FEATURES = [
            'tong_quan','so_hom_nay','crm_nhu_cau','crm_ctv','crm_hoa_hong',
            'crm_nuoi_duong','crm_sinh_vien','affiliate_hv','huy_khach',
            'nhan_vien','co_cau_to_chuc','phan_quyen','cap_cuu_sep','chuyen_so','cai_dat'
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
