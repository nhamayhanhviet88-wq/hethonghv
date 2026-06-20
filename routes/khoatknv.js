const db = require('../db/pool');
const { runTelesalePumpForUser } = require('./telesale');
const { getTestAccountIds } = require('../utils/productionMode');
const { authenticate } = require('../middleware/auth');

// Mapping crm_type code → tên hiển thị tiếng Việt
const CRM_TYPE_LABELS = {
    'nhu_cau': 'Chăm Sóc Nhu Cầu',
    'ctv': 'Chăm Sóc CTV',
    'ctv_hoa_hong': 'Chăm Sóc Affiliate',
    'kol_koc': 'Chăm Sóc KOC/KOL'
};
function crmLabel(code) {
    if (!code) return code;
    const raw = code.startsWith('tre_') ? code.replace('tre_', '') : code;
    return CRM_TYPE_LABELS[raw] || raw;
}

async function khoaTKNVRoutes(fastify, options) {

    // ========== TIME OVERRIDE (Chỉ GĐ — test hệ thống phạt) ==========

    // GET: Lấy time override hiện tại
    fastify.get('/api/admin/time-override', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const row = await db.get("SELECT value FROM app_config WHERE key = 'system_time_override'");
        if (row?.value) {
            return JSON.parse(row.value);
        }
        return { enabled: false, datetime: null };
    });

    // POST: Set/Reset time override
    fastify.post('/api/admin/time-override', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { enabled, datetime } = request.body || {};
        const value = JSON.stringify({ enabled: !!enabled, datetime: enabled ? datetime : null });
        await db.run(
            `INSERT INTO app_config (key, value) VALUES ('system_time_override', $1)
             ON CONFLICT (key) DO UPDATE SET value = $1`, [value]
        );
        return { success: true, enabled: !!enabled, datetime: enabled ? datetime : null };
    });

    // POST: Trigger manual deadline check (dùng với time override)
    fastify.post('/api/admin/trigger-deadline-check', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        // Import and run
        const { startDeadlineChecker, ...checker } = require('./deadline-checker');
        // We need runDeadlineCheck — add it to exports
        try {
            const mod = require('./deadline-checker');
            if (mod.runDeadlineCheck) {
                mod.runDeadlineCheck(true).catch(e => console.error('Manual check error:', e));
            }
        } catch(e) {}
        return { success: true, message: 'Deadline check đã được kích hoạt' };
    });

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

        // Label map cho các key đã biết (dùng khi INSERT mới)
        const LABELS = {
            cv_diem_ql_khong_duyet: 'CV Điểm — QL không duyệt',
            cv_diem_ql_khong_ho_tro: 'CV Điểm — QL không hỗ trợ',
            cv_khoa_khong_nop: 'CV Khóa — NV không nộp',
            cv_khoa_ql_khong_duyet: 'CV Khóa — QL không duyệt',
            cv_khoa_ql_khong_ho_tro: 'CV Khóa — QL không hỗ trợ',
            cv_chuoi_khong_nop: 'CV Chuỗi — NV không nộp',
            cv_chuoi_ql_khong_duyet: 'CV Chuỗi — QL không duyệt',
            cap_cuu_ql_khong_xu_ly: 'Cấp cứu — QL không xử lý',
            kh_chua_xu_ly_hom_nay: 'KH chưa xử lý hôm nay',
            kh_chua_xu_ly_tre: 'KH chưa xử lý trễ',
            gui_hang_tre: 'Gửi hàng trễ — KT chưa gửi đơn hôm nay',
            phieu_qlx_qua_han: 'Phiếu QLX quá hạn — QLX không xử lý',
            phat_qlx_tre_don_hom_nay: 'Quản Lý Xưởng — Xử Lý Đơn Hàng Hôm Nay',
            qlx_cutoff_time: 'Giờ nghỉ chốt nhận đơn của Quản Lý Xưởng',
            kt_cutoff_time: 'Giờ kết thúc ca làm của Kế Toán'
        };

        for (const cfg of configs) {
            if (!cfg.key) continue;
            const label = LABELS[cfg.key] || cfg.key;
            await db.run(
                `INSERT INTO global_penalty_config (key, label, amount) VALUES ($1, $2, $3)
                 ON CONFLICT (key) DO UPDATE SET amount = $3, updated_at = NOW()`,
                [cfg.key, label, Number(cfg.amount) || 0]
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

    // GET: Thống kê phạt theo tháng — reads from ledger (single source of truth)
    fastify.get('/api/penalty/list', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;
        let monthStart, monthEnd;
        if (request.query.dateFrom) {
            monthStart = request.query.dateFrom;
            monthEnd = request.query.dateTo || request.query.dateFrom;
        } else if (request.query.monthFrom) {
            const mFrom = request.query.monthFrom;
            const mTo = request.query.monthTo || mFrom;
            monthStart = `${mFrom}-01`;
            const [yTo, mToNum] = mTo.split('-').map(Number);
            const lastDay = new Date(yTo, mToNum, 0).getDate();
            monthEnd = `${mTo}-${String(lastDay).padStart(2, '0')}`;
        } else {
            const month = request.query.month;
            if (!month) return reply.code(400).send({ error: 'Thiếu tham số lọc ngày' });
            monthStart = `${month}-01`;
            const [y, m] = month.split('-').map(Number);
            const lastDay = new Date(y, m, 0).getDate();
            monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
        }

        // Cap tối đa = ngày hôm qua (VN)
        const { vnNow, vnDateStr } = require('../utils/timezone');
        const vnYesterday = vnNow(); vnYesterday.setDate(vnYesterday.getDate() - 1);
        const maxDate = vnDateStr(vnYesterday);
        if (monthEnd > maxDate) monthEnd = maxDate;
        if (monthStart > maxDate) monthStart = maxDate;

        // Sync ledger for today
        try { const { syncLedgerForDate } = require('../utils/penaltyLedger'); await syncLedgerForDate(vnDateStr(vnNow())); } catch(e) {}

        // Build department scope
        let scopeFilter = '';
        let params = [monthStart, monthEnd];

        if (userRole === 'giam_doc') {
            scopeFilter = '';
        } else if (['quan_ly', 'truong_phong', 'quan_ly_cap_cao'].includes(userRole)) {
            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            if (!user || !user.department_id) return { penalties: [], total: 0 };
            async function getChildIds(pid) {
                let ids = [pid];
                for (const c of await db.all('SELECT id FROM departments WHERE parent_id = $1', [pid]))
                    ids.push(...await getChildIds(c.id));
                return ids;
            }
            const deptIds = await getChildIds(user.department_id);
            const ph = deptIds.map((_, i) => `$${i + 3}`).join(',');
            scopeFilter = ` AND u.department_id IN (${ph})`;
            params.push(...deptIds);
        } else {
            scopeFilter = ' AND dpl.user_id = $3';
            params.push(userId);
        }

        // Read from ledger — single query replaces 5 source queries
        const rows = await db.all(
            `SELECT dpl.*, u.full_name, u.username, u.department_id, u.role, d.name as dept_name
             FROM daily_penalty_ledger dpl
             JOIN users u ON u.id = dpl.user_id
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE dpl.penalty_date BETWEEN $1::date AND $2::date AND u.role != 'giam_doc'${scopeFilter}
             ORDER BY dpl.penalty_date DESC, u.full_name`,
            params
        );

        const sourceMap = {
            'cv_khoa': 'khoa', 'ql_khoa': 'khoa', 'ql_khoa_chong': 'khoa',
            'cv_chuoi': 'chuoi', 'ql_chuoi': 'chuoi', 'ql_chuoi_chong': 'chuoi',
            'ho_tro_nv': 'support', 'ho_tro_chong': 'support',
            'cv_diem': 'diem', 'cap_cuu': 'emergency',
            'kh_chua_xl': 'customer_unhandled', 'kh_tre': 'customer_overdue',
            'gui_hang_tre': 'gui_hang_tre',
            'phieu_qlx_qua_han': 'phieu_qlx_qua_han'
        };

        const testAccountIds = await getTestAccountIds();
        const testSet = new Set(testAccountIds.map(Number));

        const allPenalties = rows.filter(p => !testSet.has(Number(p.user_id))).map(p => ({
            penalized_user_id: p.user_id, penalized_name: p.full_name, penalized_username: p.username,
            penalized_dept_id: p.department_id, penalized_role: p.role,
            manager_id: p.user_id, manager_name: p.full_name, manager_username: p.username,
            task_name: p.task_name, task_date: p.penalty_date,
            penalty_amount: p.penalty_amount || 0,
            penalty_reason: p.penalty_reason || '',
            source_type: sourceMap[p.source_type] || p.source_type,
            dept_name: p.dept_name || ''
        }));

        const total = allPenalties.reduce((s, p) => s + (p.penalty_amount || 0), 0);
        return { penalties: allPenalties, total };
    });

    // GET: Phiếu phạt cho NV cụ thể — reads from ledger (single source of truth)
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

        // ★ Cap tối đa = ngày hôm qua (phạt chỉ chốt khi ngày kết thúc)
        const { vnNow, vnDateStr } = require('../utils/timezone');
        const vnYesterday = vnNow(); vnYesterday.setDate(vnYesterday.getDate() - 1);
        const maxDate = vnDateStr(vnYesterday);
        const cappedEnd = monthEnd > maxDate ? maxDate : monthEnd;
        const cappedStart = monthStart > maxDate ? maxDate : monthStart;

        // Read from ledger — single query replaces 5 source queries
        const { getLedgerForUserRange } = require('../utils/penaltyLedger');
        const rows = await getLedgerForUserRange(managerId, cappedStart, cappedEnd);

        const sourceMap = {
            'cv_khoa': 'khoa', 'ql_khoa': 'khoa', 'ql_khoa_chong': 'khoa',
            'cv_chuoi': 'chuoi', 'ql_chuoi': 'chuoi', 'ql_chuoi_chong': 'chuoi',
            'ho_tro_nv': 'support', 'ho_tro_chong': 'support',
            'cv_diem': 'diem', 'cap_cuu': 'emergency',
            'kh_chua_xl': 'customer_unhandled', 'kh_tre': 'customer_overdue',
            'gui_hang_tre': 'gui_hang_tre',
            'phieu_qlx_qua_han': 'phieu_qlx_qua_han'
        };
        const items = rows.map(r => ({
            task_name: r.task_name, task_date: r.penalty_date,
            penalty_amount: r.penalty_amount, penalty_reason: r.penalty_reason || '',
            source_type: sourceMap[r.source_type] || r.source_type
        }));
        const total = items.reduce((s, i) => s + (i.penalty_amount || 0), 0);
        return {
            manager: { id: managerId, name: manager.full_name, username: manager.username, dept: dept?.name || '' },
            month, items, total
        };
    });

    // GET: Check pending penalties for login popup — reads from ledger
    fastify.get('/api/penalty/my-pending', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const { vnNow, vnDateStr } = require('../utils/timezone');
        const todayStr = vnDateStr(vnNow());

        const testAccountIds = await getTestAccountIds();
        if (testAccountIds.map(Number).includes(Number(userId)))
            return { pending: [], total: 0 };

        const userCheck = await db.get('SELECT penalty_popup_date FROM users WHERE id = $1', [userId]);
        if (userCheck && userCheck.penalty_popup_date === todayStr)
            return { pending: [], total: 0, shownToday: true };

        const vnYesterday = vnNow(); vnYesterday.setDate(vnYesterday.getDate() - 1);
        const yesterdayStr = vnDateStr(vnYesterday);

        // Sync + read from ledger
        try { const { syncLedgerForDate } = require('../utils/penaltyLedger'); await syncLedgerForDate(yesterdayStr); } catch(e) {}
        const { getLedgerForUser } = require('../utils/penaltyLedger');
        const rows = await getLedgerForUser(userId, yesterdayStr);

        const pending = rows.map(r => ({
            task_name: r.task_name, task_date: r.penalty_date,
            penalty_amount: r.penalty_amount, penalty_reason: r.penalty_reason
        }));
        const total = pending.reduce((s, p) => s + (p.penalty_amount || 0), 0);
        return { pending, total, penaltyDate: yesterdayStr };
    });

    // POST: Acknowledge penalties (NV bấm "Tôi đã biết" → mở khóa)
    // No auth required since user is locked and can't login
    fastify.post('/api/penalty/acknowledge', async (request, reply) => {
        let { username, password } = request.body || {};
        if (!username || !password) {
            return reply.code(400).send({ error: 'Thiếu thông tin' });
        }

        const cleanUsername = username.trim().toLowerCase();

        const bcrypt = require('bcrypt');
        const user = await db.get('SELECT id, password_hash, status FROM users WHERE username = $1', [cleanUsername]);
        if (!user) return reply.code(400).send({ error: 'Không tìm thấy tài khoản' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return reply.code(400).send({ error: 'Mật khẩu không đúng' });

        // Only unlock account — penalties remain until NV submits reports
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
        const { vnNow, vnDateStr } = require('../utils/timezone');
        const todayStr = vnDateStr(vnNow());

        // Mark popup as shown today (server-side) + unlock account
        await db.run(
            "UPDATE users SET status = CASE WHEN status = 'locked' THEN 'active' ELSE status END, penalty_popup_date = $2 WHERE id = $1",
            [userId, todayStr]
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

    // GET: Today's penalties for manager popup — reads from ledger (single source of truth)
    fastify.get('/api/penalty/team-today', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;
        const { vnNow, vnDateStr } = require('../utils/timezone');
        const todayStr = vnDateStr(vnNow());

        if (!['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(userRole))
            return { penalties: [], total: 0 };

        const userCheck = await db.get('SELECT penalty_mgr_popup_date, department_id FROM users WHERE id = $1', [userId]);
        if (userCheck && userCheck.penalty_mgr_popup_date === todayStr)
            return { penalties: [], total: 0, shownToday: true };

        let scopeDeptIds = [];
        if (userRole === 'giam_doc') {
            scopeDeptIds = (await db.all('SELECT id FROM departments')).map(d => d.id);
        } else {
            const myDeptId = userCheck?.department_id;
            if (!myDeptId) return { penalties: [], total: 0 };
            async function getChildIds(pid) {
                let ids = [pid];
                for (const c of await db.all('SELECT id FROM departments WHERE parent_id = $1', [pid]))
                    ids.push(...await getChildIds(c.id));
                return ids;
            }
            scopeDeptIds = await getChildIds(myDeptId);
        }
        if (!scopeDeptIds.length) return { penalties: [], total: 0 };

        const vnYesterday = vnNow(); vnYesterday.setDate(vnYesterday.getDate() - 1);
        const yesterdayStr = vnDateStr(vnYesterday);

        // Sync + read from ledger
        try { const { syncLedgerForDate } = require('../utils/penaltyLedger'); await syncLedgerForDate(yesterdayStr); } catch(e) {}
        const { getLedgerForDate } = require('../utils/penaltyLedger');
        const rows = await getLedgerForDate(yesterdayStr, userId, scopeDeptIds);

        const testAccountIds = await getTestAccountIds();
        const testSet = new Set(testAccountIds.map(Number));
        const allPenalties = rows.filter(p => !testSet.has(Number(p.user_id))).map(p => ({
            penalized_user_id: p.user_id, penalized_name: p.full_name, penalized_username: p.username,
            penalized_dept_id: p.department_id, penalized_role: p.role,
            task_name: p.task_name, task_date: p.penalty_date,
            penalty_amount: p.penalty_amount || 0, reason: p.penalty_reason || '', source: p.source_type
        }));

        const total = allPenalties.reduce((s, p) => s + (p.penalty_amount || 0), 0);
        let departments = [];
        if (allPenalties.length > 0) departments = await db.all('SELECT id, name, parent_id FROM departments');
        return { penalties: allPenalties, total, departments, penaltyDate: yesterdayStr };
    });

    // POST: Mark manager popup as shown today
    fastify.post('/api/penalty/team-today/acknowledge', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const { vnNow, vnDateStr } = require('../utils/timezone');
        const todayStr = vnDateStr(vnNow());
        await db.run('UPDATE users SET penalty_mgr_popup_date = $1 WHERE id = $2', [todayStr, userId]);
        return { success: true };
    });
}

module.exports = khoaTKNVRoutes;
