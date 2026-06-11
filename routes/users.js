const bcrypt = require('bcrypt');
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { checkPhoneDuplicate } = require('../utils/phoneCheck');
const { runTelesalePumpForUser } = require('./telesale');
const { sendTelegramMessage } = require('../utils/telegram');
const { getVNToday } = require('../utils/workingDay');
const { maskPhone } = require('../utils/dataMasking');
const path = require('path');
const fs = require('fs');

async function usersRoutes(fastify, options) {
    // Danh sách users
    fastify.get('/api/users', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { role, status } = request.query;
        let query = `SELECT u.id, u.username, u.full_name, u.phone, u.address, u.role, u.status,
                     u.contract_info, u.start_date, u.birth_date, u.id_card_front, u.id_card_back,
                     u.telegram_group_id, u.commission_tier_id, u.assigned_to_user_id, u.managed_by_user_id,
                     u.balance, u.bank_name, u.bank_account, u.bank_holder, u.order_code_prefix,
                     u.contract_file, u.rules_file, u.source_crm_type, u.position_id, u.department_id,
                     u.probation_end_date, u.probation_days, u.probation_contract_file,
                     p.name as position_name,
                     u.created_at, u.updated_at,
                     ct.name as tier_name, ct.percentage as tier_percentage, ct.parent_percentage as tier_parent_percentage,
                     au.full_name as assigned_to_name,
                     mgr.full_name as manager_name
                     FROM users u
                     LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id
                     LEFT JOIN users au ON u.assigned_to_user_id = au.id
                     LEFT JOIN users mgr ON u.managed_by_user_id = mgr.id
                     LEFT JOIN positions p ON u.position_id = p.id
                     WHERE 1=1`;
        const params = [];

        if (role) { query += ` AND u.role = ?`; params.push(role); }
        if (status) { query += ` AND u.status = ?`; params.push(status); }
        else { query += ` AND u.status NOT IN ('deleted', 'test_hidden')`; }

        query += ' ORDER BY u.created_at DESC';
        const users = await db.all(query, params);
        return { users };
    });

    // Sinh nhật hôm nay
    fastify.get('/api/users/birthdays-today', { preHandler: [authenticate] }, async (request, reply) => {
        // Block affiliate accounts from seeing birthday popups
        const AFFILIATE_ROLES = ['tkaffiliate', 'hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];
        if (AFFILIATE_ROLES.includes(request.user.role)) {
            return { users: [] };
        }
        const users = await db.all(
            `SELECT id, full_name, role, birth_date FROM users 
             WHERE status = 'active' AND birth_date IS NOT NULL AND birth_date != ''
             AND EXTRACT(DAY FROM birth_date::date) = EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')) 
             AND EXTRACT(MONTH FROM birth_date::date) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'))`
        );
        return { users };
    });

    // Lấy danh sách dropdown
    fastify.get('/api/users/dropdown', { preHandler: [authenticate] }, async (request, reply) => {
        // Affiliate users: only return their manager (for chuyển số)
        const AFFILIATE_ROLES = ['tkaffiliate', 'hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];
        if (AFFILIATE_ROLES.includes(request.user.role)) {
            const me = await db.get('SELECT managed_by_user_id FROM users WHERE id = ?', [request.user.id]);
            if (me && me.managed_by_user_id) {
                const mgr = await db.get("SELECT id, full_name, role, department_id, source_crm_type, managed_by_user_id FROM users WHERE id = ? AND status = 'active'", [me.managed_by_user_id]);
                return { users: mgr ? [mgr] : [] };
            }
            return { users: [] };
        }
        const { role } = request.query;
        let query = "SELECT id, username, full_name, phone, role, department_id, source_crm_type, managed_by_user_id FROM users WHERE status = 'active'";
        const params = [];
        if (role) { query += ' AND role = ?'; params.push(role); }
        query += ' ORDER BY full_name';
        const users = await db.all(query, params);
        return { users };
    });

    // Chi tiết user
    fastify.get('/api/users/:id', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong', 'nhan_vien')] }, async (request, reply) => {
        const user = await db.get(
            `SELECT u.*, ct.name as tier_name, ct.percentage as tier_percentage, ct.parent_percentage as tier_parent_percentage,
             au.full_name as assigned_to_name,
             mgr.full_name as manager_name,
             sc.customer_name as source_customer_name
             FROM users u
             LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id
             LEFT JOIN users au ON u.assigned_to_user_id = au.id
             LEFT JOIN users mgr ON u.managed_by_user_id = mgr.id
             LEFT JOIN customers sc ON u.source_customer_id = sc.id
             WHERE u.id = ?`,
            [Number(request.params.id)]
        );

        if (!user) {
            return reply.code(404).send({ error: 'Không tìm thấy tài khoản' });
        }
        delete user.password_hash;

        // Mask phone for QL/TP viewing any affiliate user — QL/TP không được xem SĐT affiliate
        const requester = request.user;
        const AFFILIATE_USER_ROLES = ['tkaffiliate', 'hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];
        if (['quan_ly', 'truong_phong'].includes(requester.role) && AFFILIATE_USER_ROLES.includes(user.role)) {
            user.phone = maskPhone(user.phone);
        }

        return { user };
    });

    // Tạo tài khoản
    fastify.post('/api/users', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        let { username, password, full_name, phone, address, role, contract_info,
                start_date, telegram_group_id, commission_tier_id, assigned_to_user_id,
                bank_name, bank_account, bank_holder, order_code_prefix, department_id, birth_date,
                managed_by_user_id, source_customer_id, province, source_crm_type, position_id,
                probation_days } = request.body || {};

        if (!username || !password || !full_name || !role) {
            return reply.code(400).send({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
        }

        username = username.trim().toLowerCase();

        if (phone && !/^\d{10}$/.test(phone)) {
            return reply.code(400).send({ error: 'Số điện thoại phải đúng 10 chữ số' });
        }

        if (request.user.role === 'quan_ly' && (role === 'giam_doc' || role === 'quan_ly')) {
            return reply.code(403).send({ error: 'Không có quyền tạo tài khoản này' });
        }

        const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            return reply.code(400).send({ error: 'Tên đăng nhập đã tồn tại' });
        }

        if (order_code_prefix) {
            const existingPrefix = await db.get('SELECT id FROM users WHERE order_code_prefix = ?', [order_code_prefix.toUpperCase()]);
            if (existingPrefix) return reply.code(400).send({ error: `Mã đơn "${order_code_prefix}" đã được sử dụng bởi nhân viên khác` });
        }

        // Check phone uniqueness across system (skip source customer's phone for affiliate)
        if (phone) {
            const excludeOpts = {};
            if (source_customer_id) excludeOpts.customerId = Number(source_customer_id);
            const phoneError = await checkPhoneDuplicate(phone, excludeOpts);
            if (phoneError) return reply.code(400).send({ error: phoneError });
        }

        const hash = await bcrypt.hash(password, 10);

        // Tính probation_end_date nếu role = thu_viec
        let probationEndDate = null;
        let probDays = null;
        if (role === 'thu_viec') {
            probDays = Math.max(7, Math.min(180, Number(probation_days) || 30));
            const startD = new Date(start_date || Date.now());
            startD.setDate(startD.getDate() + probDays);
            probationEndDate = startD.toISOString();
        }

        const result = await db.run(
             `INSERT INTO users (username, password_hash, full_name, phone, address, role,
             contract_info, start_date, telegram_group_id, commission_tier_id,
             assigned_to_user_id, bank_name, bank_account, bank_holder, order_code_prefix, department_id, birth_date,
             managed_by_user_id, source_customer_id, province, source_crm_type, position_id, department_joined_at,
             probation_end_date, probation_days)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [username, hash, full_name, phone || null, address || null, role,
             contract_info || null, start_date || null, telegram_group_id || null,
             commission_tier_id ? Number(commission_tier_id) : null,
             assigned_to_user_id ? Number(assigned_to_user_id) : null,
             bank_name || null, bank_account || null, bank_holder || null,
             order_code_prefix ? order_code_prefix.toUpperCase() : null,
             department_id ? Number(department_id) : null,
             birth_date || null,
             managed_by_user_id ? Number(managed_by_user_id) : null,
             source_customer_id ? Number(source_customer_id) : null,
             province || null,
             source_crm_type || null,
             position_id ? Number(position_id) : null,
             department_id ? new Date().toISOString() : null,
             probationEndDate,
             probDays]
        );

        // Track department history for new user
        if (department_id && result.lastInsertRowid) {
            try {
                await db.run(
                    'INSERT INTO department_history (user_id, department_id, joined_at) VALUES ($1, $2, NOW())',
                    [Number(result.lastInsertRowid), Number(department_id)]
                );
            } catch(e) { console.error('[DEPT-HISTORY] Error:', e.message); }
        }

        // Sync phone/address/province/birthday to source customer (affiliate = same person)
        console.log('[SYNC-CREATE] sync_source:', request.body.sync_source, 'source_customer_id:', source_customer_id);
        if (source_customer_id && request.body.sync_source === true) {
            try {
                const updates = [];
                const params = [];
                if (phone) { updates.push('phone = ?'); params.push(phone); }
                if (address) { updates.push('address = ?'); params.push(address); }
                if (province) { updates.push('province = ?'); params.push(province); }
                if (birth_date) { updates.push('birthday = ?'); params.push(birth_date); }
                if (updates.length > 0) {
                    params.push(Number(source_customer_id));
                    const sql = `UPDATE customers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
                    console.log('[SYNC-CREATE] SQL:', sql, 'PARAMS:', params);
                    const syncResult = await db.run(sql, params);
                    console.log('[SYNC-CREATE] Result:', syncResult);
                }
            } catch (syncErr) {
                console.error('[SYNC-CREATE] ERROR:', syncErr);
            }
        }

        // ========== AUTO-CREATE AFFILIATE CUSTOMER ==========
        // When creating a tkaffiliate user, auto-create a customer with crm_type='affiliate'
        if (role === 'tkaffiliate' && result.lastInsertRowid) {
            try {
                const { nanoid } = require('nanoid');
                const newUserId = Number(result.lastInsertRowid);
                const affUid = 'K' + nanoid(19);
                const custResult = await db.run(
                    `INSERT INTO customers (customer_uid, customer_name, phone, address, crm_type, order_status, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, 'affiliate', 'moi', NOW(), NOW())
                     RETURNING id`,
                    [affUid, full_name || username, phone || '', address || '']
                );
                // Link user to new affiliate customer
                const newCustId = custResult?.rows?.[0]?.id;
                if (newCustId) {
                    await db.run('UPDATE users SET source_customer_id = $1 WHERE id = $2', [newCustId, newUserId]);
                    console.log(`[AUTO-AFF] Created affiliate customer #${newCustId} for user #${newUserId}`);
                }
            } catch (affErr) {
                console.error('[AUTO-AFF] Error:', affErr.message);
            }
        }

        return { success: true, id: result.lastInsertRowid, message: 'Tạo tài khoản thành công' };
    });

    // Sửa tài khoản
    fastify.put('/api/users/:id', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { full_name, phone, address, role, status, contract_info,
                start_date, telegram_group_id, commission_tier_id, assigned_to_user_id,
                bank_name, bank_account, bank_holder, order_code_prefix, department_id, birth_date,
                managed_by_user_id, source_customer_id, source_crm_type, province, position_id } = request.body || {};

        const userId = Number(request.params.id);
        const target = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
        if (!target) {
            return reply.code(404).send({ error: 'Không tìm thấy tài khoản' });
        }
        if (target.role === 'giam_doc' && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Không có quyền sửa tài khoản Giám Đốc' });
        }

        if (phone && !/^\d{10}$/.test(phone)) {
            return reply.code(400).send({ error: 'Số điện thoại phải đúng 10 chữ số' });
        }

        if (order_code_prefix) {
            const existingPrefix = await db.get('SELECT id FROM users WHERE order_code_prefix = ? AND id != ?', [order_code_prefix.toUpperCase(), userId]);
            if (existingPrefix) return reply.code(400).send({ error: `Mã đơn "${order_code_prefix}" đã được sử dụng bởi nhân viên khác` });
        }

        // Check phone uniqueness across system (skip source customer for affiliate)
        if (phone) {
            const excludeOpts = { userId };
            // Get source_customer_id from existing user or request body
            const srcCustId = source_customer_id || (await db.get('SELECT source_customer_id FROM users WHERE id = ?', [userId]))?.source_customer_id;
            if (srcCustId) excludeOpts.customerId = Number(srcCustId);
            const phoneError = await checkPhoneDuplicate(phone, excludeOpts);
            if (phoneError) return reply.code(400).send({ error: phoneError });
        }

        // Check if department changed
        const oldUser = await db.get('SELECT department_id FROM users WHERE id = ?', [userId]);
        const oldDeptId = oldUser?.department_id;
        const newDeptId = department_id !== undefined ? (department_id ? Number(department_id) : null) : oldDeptId;
        const deptChanged = department_id !== undefined && newDeptId !== oldDeptId;

        await db.run(
            `UPDATE users SET 
             full_name = COALESCE(?, full_name), phone = COALESCE(?, phone),
             address = COALESCE(?, address), role = COALESCE(?, role), status = COALESCE(?, status),
             contract_info = COALESCE(?, contract_info), start_date = COALESCE(?, start_date),
             telegram_group_id = COALESCE(?, telegram_group_id),
             commission_tier_id = ?, assigned_to_user_id = ?,
             bank_name = COALESCE(?, bank_name), bank_account = COALESCE(?, bank_account),
             bank_holder = COALESCE(?, bank_holder),
             order_code_prefix = COALESCE(?, order_code_prefix),
             department_id = ?,
             birth_date = COALESCE(?, birth_date),
             managed_by_user_id = ?,
             source_customer_id = ?,
             source_crm_type = COALESCE(?, source_crm_type),
             province = COALESCE(?, province),
             position_id = COALESCE(?, position_id),
             department_joined_at = CASE WHEN ?::boolean THEN NOW() ELSE department_joined_at END,
             updated_at = NOW()
             WHERE id = ?`,
            [full_name || null, phone || null, address || null, role || null, status || null,
             contract_info || null, start_date || null, telegram_group_id || null,
             commission_tier_id ? Number(commission_tier_id) : null,
             assigned_to_user_id ? Number(assigned_to_user_id) : null,
             bank_name || null, bank_account || null, bank_holder || null,
             order_code_prefix ? order_code_prefix.toUpperCase() : null,
             department_id !== undefined ? (department_id ? Number(department_id) : null) : null,
             birth_date || null,
             managed_by_user_id ? Number(managed_by_user_id) : null,
             source_customer_id ? Number(source_customer_id) : null,
             source_crm_type || null,
             province || null,
             position_id ? Number(position_id) : null,
             deptChanged,
             userId]
        );

        // Track department history if changed
        if (deptChanged) {
            try {
                // Close old department record
                if (oldDeptId) {
                    await db.run(
                        'UPDATE department_history SET left_at = NOW() WHERE user_id = $1 AND department_id = $2 AND left_at IS NULL',
                        [userId, oldDeptId]
                    );
                }
                // Create new department record
                if (newDeptId) {
                    await db.run(
                        'INSERT INTO department_history (user_id, department_id, joined_at) VALUES ($1, $2, NOW())',
                        [userId, newDeptId]
                    );
                }
            } catch(e) { console.error('[DEPT-HISTORY] Error:', e.message); }
        }

        // Sync phone/address/province/birthday/name to source customer (affiliate = same person)
        if (request.body.sync_source === true) {
            const srcId = source_customer_id || (await db.get('SELECT source_customer_id FROM users WHERE id = ?', [userId]))?.source_customer_id;
            if (srcId) {
                const updates = [];
                const params = [];
                if (full_name) { updates.push('customer_name = ?'); params.push(full_name); }
                if (phone) { updates.push('phone = ?'); params.push(phone); }
                if (address) { updates.push('address = ?'); params.push(address); }
                if (province) { updates.push('province = ?'); params.push(province); }
                if (birth_date) { updates.push('birthday = ?'); params.push(birth_date); }
                if (updates.length > 0) {
                    params.push(Number(srcId));
                    await db.run(`UPDATE customers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
                    console.log(`[SYNC] Updated source customer ${srcId}: ${updates.join(', ')}`);
                }
            }
        }

        return { success: true, message: 'Cập nhật tài khoản thành công' };
    });

    // Đổi mật khẩu cho user khác
    fastify.put('/api/users/:id/change-password', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { newPassword } = request.body || {};
        if (!newPassword || newPassword.length < 4) {
            return reply.code(400).send({ error: 'Mật khẩu mới phải ít nhất 4 ký tự' });
        }
        const hash = await bcrypt.hash(newPassword, 10);
        await db.run("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [hash, Number(request.params.id)]);
        return { success: true, message: 'Đổi mật khẩu thành công' };
    });

    // Xóa tài khoản (Smart Delete)
    fastify.delete('/api/users/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const id = Number(request.params.id);
        const target = await db.get('SELECT id, role, full_name FROM users WHERE id = ?', [id]);
        if (!target) {
            return reply.code(404).send({ error: 'Không tìm thấy tài khoản' });
        }
        if (target.role === 'giam_doc') {
            return reply.code(403).send({ error: 'Không thể xóa tài khoản Giám Đốc' });
        }

        // Check foreign key dependencies
        const referralCount = await db.get('SELECT COUNT(*) as cnt FROM customers WHERE referrer_id = ?', [id]);
        const childAffCount = await db.get('SELECT COUNT(*) as cnt FROM users WHERE assigned_to_user_id = ?', [id]);
        const managedCount = await db.get('SELECT COUNT(*) as cnt FROM users WHERE managed_by_user_id = ?', [id]);

        const hasReferrals = (referralCount?.cnt || 0) > 0;
        const hasChildren = (childAffCount?.cnt || 0) > 0;
        const hasManaged = (managedCount?.cnt || 0) > 0;

        if (!hasReferrals && !hasChildren && !hasManaged) {
            // ★ XÓA CỨNG — không có dữ liệu liên kết
            await db.run('DELETE FROM team_members WHERE user_id = ?', [id]);
            await db.run('DELETE FROM department_history WHERE user_id = ?', [id]);
            await db.run('DELETE FROM user_force_approvals WHERE user_id = ?', [id]);
            await db.run('DELETE FROM users WHERE id = ?', [id]);
            console.log(`🗑️ [HARD DELETE] User #${id} (${target.full_name}) — no dependencies`);
            return { success: true, message: `Đã xóa hoàn toàn tài khoản "${target.full_name}"`, deleteType: 'hard' };
        } else {
            // ★ XÓA MỀM — có dữ liệu liên kết, bảo toàn integrity
            await db.run("UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = ?", [id]);
            const reasons = [];
            if (hasReferrals) reasons.push(`${referralCount.cnt} KH giới thiệu`);
            if (hasChildren) reasons.push(`${childAffCount.cnt} affiliate con`);
            if (hasManaged) reasons.push(`${managedCount.cnt} TK quản lý`);
            console.log(`🔴 [SOFT DELETE] User #${id} (${target.full_name}) — deps: ${reasons.join(', ')}`);
            return {
                success: true,
                message: `Đã vô hiệu hóa tài khoản "${target.full_name}". Dữ liệu được giữ lại (${reasons.join(', ')}).`,
                deleteType: 'soft'
            };
        }
    });

    // Upload CCCD
    fastify.post('/api/users/:id/upload-idcard', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const parts = request.parts();
        const userId = Number(request.params.id);
        const uploadDir = path.join(__dirname, '..', 'uploads', 'idcards');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        let frontPath = null;
        let backPath = null;

        for await (const part of parts) {
            if (part.file) {
                const { compressImage } = require('../utils/imageCompressor');
                const chunks = [];
                for await (const chunk of part.file) {
                    chunks.push(chunk);
                }
                let fileBuffer = Buffer.concat(chunks);
                const compressed = await compressImage(fileBuffer, { maxWidth: 1600, quality: 85 });
                const fileName = `${userId}_${part.fieldname}_${Date.now()}.jpeg`;
                const filePath = path.join(uploadDir, fileName);
                fs.writeFileSync(filePath, compressed.buffer);

                if (part.fieldname === 'id_card_front') {
                    frontPath = `/uploads/idcards/${fileName}`;
                } else if (part.fieldname === 'id_card_back') {
                    backPath = `/uploads/idcards/${fileName}`;
                }
            }
        }

        if (frontPath) {
            await db.run("UPDATE users SET id_card_front = ?, updated_at = NOW() WHERE id = ?", [frontPath, userId]);
        }
        if (backPath) {
            await db.run("UPDATE users SET id_card_back = ?, updated_at = NOW() WHERE id = ?", [backPath, userId]);
        }

        return { success: true, message: 'Upload CCCD thành công', frontPath, backPath };
    });

    // Đổi trạng thái
    fastify.put('/api/users/:id/status', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { status } = request.body || {};
        if (!['active', 'resigned', 'locked'].includes(status)) {
            return reply.code(400).send({ error: 'Trạng thái không hợp lệ' });
        }

        const userId = Number(request.params.id);
        const user = await db.get('SELECT status, role FROM users WHERE id = ?', [userId]);
        if (!user) return reply.code(404).send({ error: 'Không tìm thấy tài khoản' });

        // 🔒 CHẶN: Không cho đổi status của TK probation_locked bằng API thường
        // Phải dùng /unlock-probation (upload HĐ) để mở khóa
        if (user.status === 'probation_locked') {
            return reply.code(403).send({ error: 'Tài khoản thử việc hết hạn. Phải dùng chức năng "Ký HĐ" để mở khóa (upload hợp đồng bắt buộc).' });
        }

        await db.run("UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?", [status, userId]);
        return { success: true, message: `Đã chuyển trạng thái thành ${status === 'active' ? 'Đi làm' : status === 'locked' ? 'Bị khóa' : 'Nghỉ việc'}` };
    });

    // 🔓 Mở khóa tài khoản affiliate (chỉ Giám Đốc)
    fastify.put('/api/users/:id/unlock', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const userId = Number(request.params.id);
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) return reply.code(404).send({ error: 'Không tìm thấy tài khoản' });
        if (user.status !== 'locked') return reply.code(400).send({ error: 'Tài khoản không bị khóa' });

        await db.run("UPDATE users SET status = 'active', updated_at = NOW() WHERE id = ?", [userId]);

        if (user.source_customer_id) {
            const today = getVNToday();
            await db.run(
                `UPDATE customers SET 
                 cancel_requested = 0, cancel_reason = NULL,
                 cancel_requested_by = NULL, cancel_requested_at = NULL,
                 cancel_approved = 0, cancel_approved_by = NULL, cancel_approved_at = NULL,
                 order_status = 'dang_tu_van',
                 appointment_date = ?,
                 updated_at = NOW()
                 WHERE id = ?`,
                [today, user.source_customer_id]
            );
        }

        // Auto-pump telesale SĐT sau khi mở khóa
        let pumpMsg = '';
        try {
            const pumpResult = await runTelesalePumpForUser(userId);
            if (pumpResult.pumped > 0) pumpMsg = ` 📞 ${pumpResult.message}.`;
            else if (pumpResult.skipped) pumpMsg = ` ${pumpResult.message}.`;
        } catch (e) { console.error('[Telesale] Auto-pump error:', e.message); }

        return { success: true, message: `Đã mở khóa tài khoản ${user.full_name}. Khách hàng nguồn đã được phục hồi với lịch tư vấn hôm nay.${pumpMsg}` };
    });

    // 📝 Mở khóa thử việc + Ký hợp đồng mới → Chuyển thành Nhân Viên
    fastify.post('/api/users/:id/unlock-probation', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const userId = Number(request.params.id);
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) return reply.code(404).send({ error: 'Không tìm thấy tài khoản' });
        if (user.status !== 'probation_locked') return reply.code(400).send({ error: 'Tài khoản không ở trạng thái hết hạn thử việc' });
        if (user.role !== 'thu_viec') return reply.code(400).send({ error: 'Tài khoản không phải vai trò Thử Việc' });

        // Parse multipart form (contract file)
        const parts = request.parts();
        const uploadDir = path.join(__dirname, '..', 'uploads', 'contracts');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        let newContractPath = null;
        for await (const part of parts) {
            if (part.file && part.fieldname === 'contract_file') {
                const ext = path.extname(part.filename) || '.pdf';
                const fileName = `${userId}_contract_official_${Date.now()}${ext}`;
                const filePath = path.join(uploadDir, fileName);
                const chunks = [];
                for await (const chunk of part.file) chunks.push(chunk);
                fs.writeFileSync(filePath, Buffer.concat(chunks));
                newContractPath = `/uploads/contracts/${fileName}`;
            }
        }

        if (!newContractPath) {
            return reply.code(400).send({ error: 'Vui lòng upload Hợp Đồng chính thức (PDF) để mở khóa' });
        }

        // Giữ lại HĐ thử việc cũ → probation_contract_file
        // Lưu HĐ mới → contract_file
        // Chuyển role → nhan_vien, status → active
        await db.run(
            `UPDATE users SET 
             probation_contract_file = COALESCE(contract_file, probation_contract_file),
             contract_file = $1,
             role = 'nhan_vien',
             status = 'active',
             probation_end_date = NULL,
             probation_warned = false,
             updated_at = NOW()
             WHERE id = $2`,
            [newContractPath, userId]
        );

        console.log(`📝 [PROBATION] Unlocked user #${userId} (${user.full_name}) — thu_viec → nhan_vien by ${request.user.username}`);

        // Telegram notification
        if (user.telegram_group_id) {
            sendTelegramMessage(user.telegram_group_id,
                `✅ <b>Chúc mừng!</b>\nBạn đã được ký hợp đồng chính thức.\nVai trò: <b>Nhân Viên</b>\n\nChúc bạn làm việc hiệu quả! 🎉`
            );
        }

        return { success: true, message: `✅ Đã ký hợp đồng và chuyển ${user.full_name} thành Nhân Viên chính thức!` };
    });

    // Upload hợp đồng PDF
    fastify.post('/api/users/:id/upload-contract', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const parts = request.parts();
        const userId = Number(request.params.id);
        const uploadDir = path.join(__dirname, '..', 'uploads', 'contracts');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        for await (const part of parts) {
            if (part.file) {
                const ext = path.extname(part.filename) || '.pdf';
                const fileName = `${userId}_${part.fieldname}_${Date.now()}${ext}`;
                const filePath = path.join(uploadDir, fileName);
                const chunks = [];
                for await (const chunk of part.file) chunks.push(chunk);
                fs.writeFileSync(filePath, Buffer.concat(chunks));

                const webPath = `/uploads/contracts/${fileName}`;
                if (part.fieldname === 'contract_file') {
                    await db.run("UPDATE users SET contract_file = ?, updated_at = NOW() WHERE id = ?", [webPath, userId]);
                } else if (part.fieldname === 'rules_file') {
                    await db.run("UPDATE users SET rules_file = ?, updated_at = NOW() WHERE id = ?", [webPath, userId]);
                }
            }
        }
        return { success: true, message: 'Upload file thành công' };
    });

    // ========== HANDOVER CRUD ==========
    fastify.get('/api/users/:id/social-handovers', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const items = await db.all('SELECT * FROM social_handovers WHERE user_id = ? ORDER BY id', [Number(request.params.id)]);
        return { items };
    });

    fastify.put('/api/users/:id/social-handovers', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const userId = Number(request.params.id);
        const { items } = request.body || {};
        await db.run('DELETE FROM social_handovers WHERE user_id = ?', [userId]);
        if (items && items.length > 0) {
            for (const item of items) {
                if (item.platform) {
                    await db.run('INSERT INTO social_handovers (user_id, platform, account_name, acc, pass, two_fa, link, note) VALUES (?,?,?,?,?,?,?,?)',
                        [userId, item.platform, item.account_name || null, item.acc || null, item.pass || null, item.two_fa || null, item.link || null, item.note || null]);
                }
            }
        }
        return { success: true, message: 'Lưu bàn giao MXH thành công' };
    });

    fastify.get('/api/users/:id/tool-handovers', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const items = await db.all('SELECT * FROM tool_handovers WHERE user_id = ? ORDER BY id', [Number(request.params.id)]);
        return { items };
    });

    fastify.put('/api/users/:id/tool-handovers', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const userId = Number(request.params.id);
        const { items } = request.body || {};
        await db.run('DELETE FROM tool_handovers WHERE user_id = ?', [userId]);
        if (items && items.length > 0) {
            for (const item of items) {
                if (item.tool_name) {
                    await db.run('INSERT INTO tool_handovers (user_id, tool_name, quantity, handover_date) VALUES (?,?,?,?)',
                        [userId, item.tool_name, item.quantity || 1, item.handover_date || null]);
                }
            }
        }
        return { success: true, message: 'Lưu bàn giao công cụ thành công' };
    });

    // ========== TRANSFER MANAGEMENT ==========

    // Get count of managed customers + affiliates for a user
    fastify.get('/api/users/:id/managed-count', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = Number(request.params.id);
        const customers = await db.all('SELECT id, customer_name, phone FROM customers WHERE assigned_to_id = ?', [userId]);
        const affiliates = await db.all('SELECT id, full_name, phone, role FROM users WHERE managed_by_user_id = ? AND role IN (\'hoa_hong\',\'ctv\',\'nuoi_duong\',\'sinh_vien\',\'tkaffiliate\')', [userId]);
        return { success: true, customers, affiliates, customerCount: customers.length, affiliateCount: affiliates.length };
    });

    // 1A: Single transfer - transfer one affiliate or customer to new manager
    fastify.put('/api/users/:id/transfer', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong')] }, async (request, reply) => {
        const userId = Number(request.params.id);
        const { newManagerId, type } = request.body || {};
        if (!newManagerId) return reply.code(400).send({ error: 'Chưa chọn nhân viên nhận' });

        if (type === 'customer') {
            await db.run('UPDATE customers SET assigned_to_id = ?, updated_at = NOW() WHERE id = ?', [newManagerId, userId]);
        } else {
            // affiliate
            await db.run('UPDATE users SET managed_by_user_id = ?, updated_at = NOW() WHERE id = ?', [newManagerId, userId]);
        }

        const newManager = await db.get('SELECT full_name FROM users WHERE id = ?', [newManagerId]);
        return { success: true, message: `✅ Đã chuyển sang ${newManager?.full_name || 'NV mới'}` };
    });

    // 1B: Bulk handover - transfer ALL customers + affiliates from one user to another
    fastify.post('/api/users/:id/handover', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const fromUserId = Number(request.params.id);
        const { newManagerId } = request.body || {};
        if (!newManagerId) return reply.code(400).send({ error: 'Chưa chọn nhân viên nhận' });

        const custResult = await db.run('UPDATE customers SET assigned_to_id = ?, updated_at = NOW() WHERE assigned_to_id = ?', [newManagerId, fromUserId]);
        const affResult = await db.run('UPDATE users SET managed_by_user_id = ?, updated_at = NOW() WHERE managed_by_user_id = ? AND role IN (\'hoa_hong\',\'ctv\',\'nuoi_duong\',\'sinh_vien\',\'tkaffiliate\')', [newManagerId, fromUserId]);

        const custCount = custResult?.changes || 0;
        const affCount = affResult?.changes || 0;
        const newManager = await db.get('SELECT full_name FROM users WHERE id = ?', [newManagerId]);

        return { success: true, message: `✅ Đã bàn giao ${custCount} KH + ${affCount} affiliate sang ${newManager?.full_name || 'NV mới'}`, custCount, affCount };
    });

    // 1C: Selective handover - transfer specific items to specific managers
    fastify.post('/api/users/:id/handover-selective', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { transfers } = request.body || {};
        if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
            return reply.code(400).send({ error: 'Không có mục nào để chuyển' });
        }

        let custCount = 0, affCount = 0;
        for (const t of transfers) {
            if (t.type === 'customer') {
                await db.run('UPDATE customers SET assigned_to_id = ?, updated_at = NOW() WHERE id = ?', [t.newManagerId, t.id]);
                custCount++;
            } else if (t.type === 'affiliate') {
                await db.run('UPDATE users SET managed_by_user_id = ?, updated_at = NOW() WHERE id = ?', [t.newManagerId, t.id]);
                affCount++;
            }
        }

        return { success: true, message: `✅ Đã chuyển ${custCount} KH + ${affCount} affiliate`, custCount, affCount };
    });

    // ========== FORCE APPROVAL — Kiểm soát CV nhân viên ==========

    const FORCE_APPROVAL_ROLES = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'];

    // GET: Lấy trạng thái force approval của 1 NV
    fastify.get('/api/users/:id/force-approval', { preHandler: [authenticate] }, async (request, reply) => {
        if (!FORCE_APPROVAL_ROLES.includes(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền' });
        }
        const userId = Number(request.params.id);

        const user = await db.get(
            'SELECT force_approval, force_approval_reviewer_id FROM users WHERE id = $1', [userId]
        );
        if (!user) return reply.code(404).send({ error: 'Không tìm thấy NV' });

        // Lấy reviewer info
        let reviewer = null;
        if (user.force_approval_reviewer_id) {
            reviewer = await db.get(
                'SELECT id, full_name, username, role FROM users WHERE id = $1',
                [user.force_approval_reviewer_id]
            );
        }

        // Lấy danh sách CV bị force riêng lẻ
        const tasks = await db.all(
            'SELECT * FROM user_force_approvals WHERE user_id = $1 ORDER BY task_type, task_ref_id',
            [userId]
        );

        return {
            force_approval: user.force_approval || false,
            force_approval_reviewer_id: user.force_approval_reviewer_id,
            reviewer,
            tasks
        };
    });

    // PUT: Bật/tắt force_approval (tất cả CV) + set reviewer
    fastify.put('/api/users/:id/force-approval', { preHandler: [authenticate] }, async (request, reply) => {
        if (!FORCE_APPROVAL_ROLES.includes(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền' });
        }
        const userId = Number(request.params.id);
        const { force_approval, reviewer_id } = request.body || {};

        // Validate reviewer role if provided
        if (reviewer_id) {
            const rev = await db.get('SELECT role FROM users WHERE id = $1', [reviewer_id]);
            if (!rev || !FORCE_APPROVAL_ROLES.includes(rev.role)) {
                return reply.code(400).send({ error: 'Người kiểm duyệt phải là TP/QL/QLCC/GĐ' });
            }
        }

        await db.run(
            `UPDATE users SET force_approval = $1, force_approval_reviewer_id = $2, updated_at = NOW() WHERE id = $3`,
            [force_approval || false, reviewer_id || null, userId]
        );

        console.log(`🔒 Force approval ${force_approval ? 'BẬT' : 'TẮT'} cho user #${userId} bởi ${request.user.username}${reviewer_id ? ` — reviewer: #${reviewer_id}` : ''}`);
        return { success: true };
    });

    // POST: Thêm/xóa CV bị ép duyệt riêng lẻ (Cấp 1)
    fastify.post('/api/users/:id/force-approval/tasks', { preHandler: [authenticate] }, async (request, reply) => {
        if (!FORCE_APPROVAL_ROLES.includes(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền' });
        }
        const userId = Number(request.params.id);
        const { tasks } = request.body || {};
        // tasks = [{ task_type: 'schedule'|'lock'|'chain', task_ref_id: 123 }]

        if (!Array.isArray(tasks)) {
            return reply.code(400).send({ error: 'tasks phải là mảng' });
        }

        // Xóa tất cả force riêng lẻ cũ → insert lại mới (replace strategy)
        await db.run('DELETE FROM user_force_approvals WHERE user_id = $1', [userId]);

        for (const t of tasks) {
            if (!t.task_type || !t.task_ref_id) continue;
            if (!['schedule', 'lock', 'chain'].includes(t.task_type)) continue;

            await db.run(
                `INSERT INTO user_force_approvals (user_id, task_type, task_ref_id, created_by)
                 VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, task_type, task_ref_id) DO NOTHING`,
                [userId, t.task_type, t.task_ref_id, request.user.id]
            );
        }

        console.log(`🔒 Force tasks cập nhật cho user #${userId}: ${tasks.length} CV bởi ${request.user.username}`);
        return { success: true, count: tasks.length };
    });

    // ========== PROMOTION ENGINE — Thăng / Giáng Chức ==========

    const PROMO_ROLE_LEVEL = {
        part_time: 0, thu_viec: 0, nhan_vien: 1, truong_phong: 2,
        quan_ly: 3, quan_ly_cap_cao: 4, giam_doc: 5
    };
    const PROMO_ROLE_LABELS = {
        part_time: 'Part Time', thu_viec: 'Thử Việc', nhan_vien: 'Nhân Viên',
        truong_phong: 'Trưởng Phòng', quan_ly: 'Quản Lý',
        quan_ly_cap_cao: 'Quản Lý Cấp Cao', giam_doc: 'Giám Đốc'
    };

    // POST /api/users/:id/promote — Atomic promotion/demotion
    fastify.post('/api/users/:id/promote', {
        preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao')]
    }, async (request, reply) => {
        const userId = Number(request.params.id);
        const { new_role, department_id, notes } = request.body || {};

        if (!new_role) return reply.code(400).send({ error: 'Chưa chọn vai trò mới' });

        // Fetch current user
        const user = await db.get(
            'SELECT id, full_name, role, department_id, telegram_group_id, token_version FROM users WHERE id = $1',
            [userId]
        );
        if (!user) return reply.code(404).send({ error: 'Không tìm thấy tài khoản' });

        const oldRole = user.role;
        if (oldRole === new_role) return reply.code(400).send({ error: 'Vai trò mới giống vai trò hiện tại' });

        // Cannot promote to or demote from giam_doc
        if (oldRole === 'giam_doc' || new_role === 'giam_doc') {
            return reply.code(403).send({ error: 'Không thể thay đổi vai trò Giám Đốc' });
        }

        // Requester must have higher level than BOTH old and new role
        const requesterLevel = PROMO_ROLE_LEVEL[request.user.role] || 0;
        const oldLevel = PROMO_ROLE_LEVEL[oldRole] || 0;
        const newLevel = PROMO_ROLE_LEVEL[new_role] || 0;
        if (requesterLevel <= oldLevel || requesterLevel <= newLevel) {
            return reply.code(403).send({ error: 'Bạn không đủ quyền để thay đổi vai trò này' });
        }

        const direction = newLevel > oldLevel ? 'promote' : 'demote';
        const targetDeptId = department_id ? Number(department_id) : user.department_id;

        // Manager roles that need department head assignment
        const MANAGER_ROLES = ['truong_phong', 'quan_ly', 'quan_ly_cap_cao'];
        const isNewManager = MANAGER_ROLES.includes(new_role);

        // ★ Validate: manager roles MUST have a department
        if (isNewManager && !targetDeptId) {
            return reply.code(400).send({ error: 'Vai trò quản lý bắt buộc phải chọn đơn vị quản lý' });
        }

        const wasManager = MANAGER_ROLES.includes(oldRole);

        // ① Update role + increment token_version (force re-login)
        const newTokenVersion = (user.token_version || 0) + 1;
        await db.run(
            `UPDATE users SET role = $1, token_version = $2, updated_at = NOW() WHERE id = $3`,
            [new_role, newTokenVersion, userId]
        );

        // ② Update department head if becoming manager
        if (isNewManager && targetDeptId) {
            // Set this user as head of target department
            await db.run(
                'UPDATE departments SET head_user_id = $1 WHERE id = $2',
                [userId, targetDeptId]
            );

            // ③ Sync task_approvers — add this user as approver for the department
            const existingApprover = await db.get(
                'SELECT id FROM task_approvers WHERE user_id = $1 AND department_id = $2',
                [userId, targetDeptId]
            );
            if (!existingApprover) {
                await db.run(
                    'INSERT INTO task_approvers (user_id, department_id) VALUES ($1, $2)',
                    [userId, targetDeptId]
                );
            }
        }

        // ④ If demoted from manager role → remove as department head (only for dept they were heading)
        if (wasManager && !isNewManager) {
            await db.run(
                'UPDATE departments SET head_user_id = NULL WHERE head_user_id = $1',
                [userId]
            );
            // Remove from task_approvers
            await db.run(
                'DELETE FROM task_approvers WHERE user_id = $1',
                [userId]
            );
        }

        // ⑤ Sync permissions — copy department permissions to user for new role
        if (targetDeptId) {
            const deptPerms = await db.all(
                'SELECT feature, can_view, can_create, can_edit, can_delete FROM permissions WHERE target_type = $1 AND target_id = $2',
                ['department', targetDeptId]
            );
            if (deptPerms.length > 0) {
                // Delete old user perms and re-apply from dept
                await db.run(
                    'DELETE FROM permissions WHERE target_type = $1 AND target_id = $2',
                    ['user', userId]
                );
                for (const p of deptPerms) {
                    const cv = p.can_view || 0, cc = p.can_create || 0, ce = p.can_edit || 0, cd = p.can_delete || 0;
                    if (cv !== 0 || cc !== 0 || ce !== 0 || cd !== 0) {
                        await db.run(
                            'INSERT INTO permissions (target_type, target_id, feature, can_view, can_create, can_edit, can_delete) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                            ['user', userId, p.feature, cv, cc, ce, cd]
                        );
                    }
                }
            }
        }

        // ⑥ Audit log
        await db.run(
            `INSERT INTO promotion_log (user_id, old_role, new_role, direction, department_id, notes, promoted_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, oldRole, new_role, direction, targetDeptId || null, notes || null, request.user.id]
        );

        // ⑦ Telegram notification
        const dirLabel = direction === 'promote' ? '⬆️ THĂNG CHỨC' : '⬇️ GIÁNG CHỨC';
        const oldLabel = PROMO_ROLE_LABELS[oldRole] || oldRole;
        const newLabel = PROMO_ROLE_LABELS[new_role] || new_role;

        if (user.telegram_group_id) {
            sendTelegramMessage(user.telegram_group_id,
                `${dirLabel}\n\n` +
                `👤 <b>${user.full_name}</b>\n` +
                `📋 ${oldLabel} → <b>${newLabel}</b>\n` +
                `${notes ? `📝 Lý do: ${notes}\n` : ''}` +
                `\n👔 Quyết định bởi: <b>${request.user.full_name || request.user.username}</b>\n` +
                `📅 ${new Date().toLocaleDateString('vi-VN')}`
            );
        }

        const emoji = direction === 'promote' ? '⬆️' : '⬇️';
        console.log(`${emoji} [PROMOTION] ${user.full_name}: ${oldRole} → ${new_role} by ${request.user.username}`);

        return {
            success: true,
            message: `${emoji} Đã ${direction === 'promote' ? 'thăng chức' : 'giáng chức'} ${user.full_name}: ${oldLabel} → ${newLabel}`,
            direction,
            old_role: oldRole,
            new_role
        };
    });

    // GET /api/users/:id/promotion-history — Lịch sử thăng/giáng chức
    fastify.get('/api/users/:id/promotion-history', {
        preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao', 'quan_ly')]
    }, async (request, reply) => {
        const userId = Number(request.params.id);
        const logs = await db.all(
            `SELECT pl.*, u.full_name as promoted_by_name, d.name as department_name
             FROM promotion_log pl
             LEFT JOIN users u ON pl.promoted_by = u.id
             LEFT JOIN departments d ON pl.department_id = d.id
             WHERE pl.user_id = $1
             ORDER BY pl.created_at DESC`,
            [userId]
        );
        return { logs };
    });
}

module.exports = usersRoutes;
