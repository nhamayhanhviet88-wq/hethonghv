const { authenticate, requireRole } = require('../middleware/auth');

const AFFILIATE_ROLES = ['hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];

// ★ CHUẨN HÓA: Luôn dùng helper này để lấy customers trong mọi API affiliate
// → Đảm bảo KHÔNG BAO GIỜ thiếu field (crm_type, referrer_id, etc.)
const _AFF_CUST_FIELDS = 'c.id, c.customer_name, c.phone, c.referrer_id, c.crm_type, c.cancel_approved, c.appointment_date, c.created_at, c.assigned_to_id, c.order_status';
const _AFF_CUST_FIELDS_LIGHT = 'c.id, c.customer_name, c.referrer_id, c.crm_type'; // Cho API nhẹ (all-orders, balance)

// ★ Helper: lấy ngày chuyển CRM sang Affiliate cho các KH
// Trả về Map { customerId: 'YYYY-MM-DD HH:MM:SS' }
async function _getAffConversionMap(db, customerIds) {
    const map = {};
    if (!customerIds || customerIds.length === 0) return map;
    const ph = customerIds.map(() => '?').join(',');
    const rows = await db.all(`
        SELECT customer_id, COALESCE(processed_at, created_at) as conv_date
        FROM crm_conversion_requests
        WHERE customer_id IN (${ph})
        AND to_crm_type = 'ctv_hoa_hong'
        AND status IN ('approved', 'pending')
        ORDER BY created_at ASC
    `, customerIds);
    // Chỉ lấy lần chuyển ĐẦU TIÊN cho mỗi KH
    rows.forEach(r => { if (!map[r.customer_id]) map[r.customer_id] = r.conv_date; });
    return map;
}

// ★ Helper: tính rate cho 1 đơn dựa trên isDirect + ngày chuyển Affiliate
// customerCrmType: fallback cho KH legacy đã ở ctv_hoa_hong nhưng không có conversion record
function _calcOrderRate(isDirect, directRate, parentRate, orderDate, conversionDate, customerCrmType) {
    if (!isDirect) return parentRate; // Gián tiếp → luôn 5%
    if (conversionDate) {
        // Có mốc chuyển → so sánh ngày đơn vs ngày chuyển
        return new Date(orderDate) < new Date(conversionDate) ? directRate : parentRate;
    }
    // Không có conversion record nhưng KH đã ở Affiliate (legacy) → 5%
    if (customerCrmType === 'ctv_hoa_hong') return parentRate;
    return directRate; // Chưa chuyển → 10%
}

// ★ CHUẨN HÓA: Loại KH gián tiếp "sinh ra đã là affiliate" (cháu) khỏi danh sách
// Quy tắc: !isDirect + crm_type=ctv_hoa_hong + KHÔNG có convDate → LOẠI
// Dùng helper này cho MỌI API → không bao giờ lọt cháu vào dashboard ông
function _excludeBornAsAffiliateIndirect(customers, userId, affConvMap, selfCustId) {
    return customers.filter(c => {
        // ★ KH gốc (chính bản thân affiliate) → luôn giữ
        if (selfCustId && c.id === selfCustId) return true;
        const isDirect = c.referrer_id === userId;
        if (!isDirect && c.crm_type === 'ctv_hoa_hong' && !affConvMap[c.id]) return false;
        return true;
    });
}

// ★ FIRST-ORDER-ONLY: Lấy ID đơn đầu tiên (non-cancelled) per customer
// Trả về Map { customerId: firstOrderId }
async function _getFirstOrderMap(db, customerIds) {
    if (!customerIds || customerIds.length === 0) return {};
    const ph = customerIds.map(() => '?').join(',');
    const rows = await db.all(`
        SELECT DISTINCT ON (customer_id) customer_id, id as first_order_id
        FROM order_codes
        WHERE customer_id IN (${ph}) AND status != 'cancelled'
        ORDER BY customer_id, created_at ASC
    `, customerIds);
    const map = {};
    rows.forEach(r => { map[r.customer_id] = r.first_order_id; });
    return map;
}

// ★ FIRST-ORDER-ONLY: Load cutoff date from app_config
let _fooCutoffCache = undefined; // undefined = not loaded, null = no cutoff
async function _getCommissionCutoffDate(db) {
    if (_fooCutoffCache !== undefined) return _fooCutoffCache;
    const row = await db.get("SELECT value FROM app_config WHERE key = 'commission_first_order_cutoff'");
    _fooCutoffCache = row?.value ? new Date(row.value) : null;
    return _fooCutoffCache;
}

// Helper: parse period_type + value into dateFrom/dateTo
function _parsePeriodDateRange(periodType, value) {
    let dateFrom = null, dateTo = null;
    if (!value) return { dateFrom, dateTo };
    if (periodType === 'daily') {
        dateFrom = value;
        dateTo = value + ' 23:59:59';
    } else if (periodType === 'weekly') {
        const [wy, wn] = value.split('-W');
        const jan1 = new Date(Number(wy), 0, 1);
        const jan1Day = jan1.getDay() || 7;
        const mon = new Date(jan1);
        mon.setDate(jan1.getDate() + (Number(wn) - 1) * 7 - jan1Day + 2);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        dateFrom = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
        dateTo = `${sun.getFullYear()}-${String(sun.getMonth()+1).padStart(2,'0')}-${String(sun.getDate()).padStart(2,'0')} 23:59:59`;
    } else if (periodType === 'monthly' || periodType === 'month') {
        const parts = value.split('-');
        const y = parts[0], m = parts[1];
        dateFrom = `${y}-${m.padStart(2,'0')}-01`;
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        dateTo = `${y}-${m.padStart(2,'0')}-${lastDay} 23:59:59`;
    } else if (periodType === 'quarterly' || periodType === 'quarter') {
        const [y, q] = value.split('-Q');
        const startMonth = (Number(q) - 1) * 3 + 1;
        const endMonth = startMonth + 2;
        dateFrom = `${y}-${String(startMonth).padStart(2,'0')}-01`;
        const lastDay = new Date(Number(y), endMonth, 0).getDate();
        dateTo = `${y}-${String(endMonth).padStart(2,'0')}-${lastDay} 23:59:59`;
    } else {
        // Fallback: treat as monthly
        const parts = value.split('-');
        if (parts.length === 2) {
            const y = parts[0], m = parts[1];
            dateFrom = `${y}-${m.padStart(2,'0')}-01`;
            const lastDay = new Date(Number(y), Number(m), 0).getDate();
            dateTo = `${y}-${m.padStart(2,'0')}-${lastDay} 23:59:59`;
        }
    }
    return { dateFrom, dateTo };
}

async function affiliateRoutes(fastify) {
    const db = require('../db/pool');

    // ★ MIGRATION: FIRST-ORDER-ONLY cutoff date
    try {
        await db.run(`INSERT INTO app_config (key, value) VALUES ('commission_first_order_cutoff', '2026-05-07') ON CONFLICT(key) DO NOTHING`);
    } catch(e) { /* already exists */ }

    // ★ MIGRATION: Index for first-order lookup performance
    try {
        await db.run(`CREATE INDEX IF NOT EXISTS idx_oc_customer_created ON order_codes(customer_id, created_at)`);
    } catch(e) { /* already exists */ }

    fastify.get('/api/affiliate/org-tree', { preHandler: [authenticate] }, async (request, reply) => {
        const { from, to } = request.query;
        const user = request.user;
        const dbUser = await db.get('SELECT id, role, department_id, managed_by_user_id FROM users WHERE id = ?', [user.id]);

        // Block affiliate users from seeing internal org tree
        const AFFILIATE_BLOCK_ROLES = ['tkaffiliate', 'hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];
        if (AFFILIATE_BLOCK_ROLES.includes(user.role)) {
            return { departments: [], employees: [], affiliates: [] };
        }

        const departments = await db.all(`
            SELECT d.id, d.name, d.code, d.parent_id, d.status, d.head_user_id
            FROM departments d WHERE d.status = 'active'
            ORDER BY d.name
        `);

        const employees = await db.all(`
            SELECT u.id, u.full_name, u.phone, u.role, u.department_id, u.status
            FROM users u
            WHERE u.role IN ('nhan_vien','truong_phong','quan_ly','part_time','quan_ly_cap_cao')
            AND u.status = 'active'
            ORDER BY u.full_name
        `);

        let affQuery = `
            SELECT u.id, u.username, u.full_name, u.phone, u.role, u.status,
                   u.managed_by_user_id, u.source_customer_id, u.created_at,
                   u.department_id, u.source_crm_type, u.assigned_to_user_id,
                   u.commission_tier_id,
                   mgr.full_name as manager_name,
                   sc.customer_name as source_customer_name,
                   ct.name as tier_name, ct.percentage as tier_percentage, ct.parent_percentage as tier_parent_percentage,
                   (SELECT COUNT(*) FROM customers c WHERE c.referrer_id = u.id) as referral_count
            FROM users u
            LEFT JOIN users mgr ON mgr.id = u.managed_by_user_id
            LEFT JOIN customers sc ON sc.id = u.source_customer_id
            LEFT JOIN commission_tiers ct ON ct.id = u.commission_tier_id
            WHERE u.role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')
            AND u.status IN ('active','locked')
            AND u.managed_by_user_id IS NOT NULL`;
        const affParams = [];

        if (user.role === 'nhan_vien' || user.role === 'part_time' || user.role === 'truong_phong') {
            affQuery += ` AND u.managed_by_user_id = ?`;
            affParams.push(user.id);
        } else if (user.role === 'quan_ly') {
            const managedDeptIds = [];
            async function collectManagedDepts(parentId) {
                managedDeptIds.push(parentId);
                const children = await db.all('SELECT id FROM departments WHERE parent_id = ?', [parentId]);
                for (const c of children) await collectManagedDepts(c.id);
            }
            const headDepts = await db.all('SELECT id FROM departments WHERE head_user_id = ?', [user.id]);
            for (const d of headDepts) await collectManagedDepts(d.id);
            if (dbUser && dbUser.department_id) {
                await collectManagedDepts(dbUser.department_id);
            }
            const uniqueDepts = [...new Set(managedDeptIds)];
            if (uniqueDepts.length > 0) {
                const placeholders = uniqueDepts.map(() => '?').join(',');
                affQuery += ` AND u.managed_by_user_id IN (SELECT id FROM users WHERE department_id IN (${placeholders}) OR id = ?)`;
                affParams.push(...uniqueDepts, user.id);
            } else {
                affQuery += ` AND u.managed_by_user_id = ?`;
                affParams.push(user.id);
            }
        }

        // NOTE: from/to are intentionally NOT applied to affiliate list query.
        // They only filter stats (customers, orders, revenue) below.
        affQuery += ` ORDER BY u.full_name`;
        const affiliates = await db.all(affQuery, affParams);

        if (user.role === 'quan_ly') {
            affiliates.forEach(a => {
                if (a.managed_by_user_id !== user.id) a.phone = '***';
            });
        }

        const affiliateIds = affiliates.map(a => a.id);
        let stats = {};
        if (affiliateIds.length > 0) {
            const placeholders = affiliateIds.map(() => '?').join(',');
            // Count customers referred by affiliates
            let custQuery = `
                SELECT c.referrer_id,
                       COUNT(DISTINCT c.id) as total_customers
                FROM customers c
                WHERE c.referrer_id IN (${placeholders})`;
            const custParams = [...affiliateIds];
            if (from) { custQuery += ` AND c.created_at >= ?`; custParams.push(from); }
            if (to) { custQuery += ` AND c.created_at <= ?`; custParams.push(to + ' 23:59:59'); }
            custQuery += ` GROUP BY c.referrer_id`;
            const custRows = await db.all(custQuery, custParams);
            custRows.forEach(s => { stats[s.referrer_id] = { total_customers: s.total_customers, total_orders: 0, total_revenue: 0 }; });

            // Count only COMPLETED orders and their revenue
            let orderQuery = `
                SELECT c.referrer_id,
                       COUNT(DISTINCT oc.id) as total_orders,
                       COALESCE(SUM(oi.total), 0) as total_revenue
                FROM customers c
                JOIN order_codes oc ON oc.customer_id = c.id AND oc.status = 'completed'
                LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                WHERE c.referrer_id IN (${placeholders})`;
            const orderParams = [...affiliateIds];
            if (from) { orderQuery += ` AND oc.created_at >= ?`; orderParams.push(from); }
            if (to) { orderQuery += ` AND oc.created_at <= ?`; orderParams.push(to + ' 23:59:59'); }
            orderQuery += ` GROUP BY c.referrer_id`;
            const orderRows = await db.all(orderQuery, orderParams);
            orderRows.forEach(s => {
                if (!stats[s.referrer_id]) stats[s.referrer_id] = { total_customers: 0, total_orders: 0, total_revenue: 0 };
                stats[s.referrer_id].total_orders = s.total_orders;
                stats[s.referrer_id].total_revenue = s.total_revenue;
            });
        }

        affiliates.forEach(a => {
            const s = stats[a.id] || {};
            a.total_customers = Number(s.total_customers) || 0;
            a.total_orders = Number(s.total_orders) || 0;
            a.total_revenue = Number(s.total_revenue) || 0;
        });

        return { departments, employees, affiliates };
    });

    fastify.get('/api/affiliate/customers-for-assign', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { q, employee_id } = request.query;
        if (!employee_id) return { customers: [] };

        let query = `SELECT c.id, c.customer_name, c.phone, c.address, c.province, c.crm_type, c.birthday FROM customers c
            WHERE c.assigned_to_id = ?
            AND c.id NOT IN (SELECT source_customer_id FROM users WHERE source_customer_id IS NOT NULL)`;
        const params = [Number(employee_id)];
        if (q) {
            query += ` AND (c.customer_name LIKE ? OR c.phone LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }
        query += ` ORDER BY c.customer_name LIMIT 30`;
        return { customers: await db.all(query, params) };
    });

    fastify.post('/api/affiliate/assign', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { affiliate_user_id, employee_user_id } = request.body || {};
        if (!affiliate_user_id || !employee_user_id) return reply.code(400).send({ error: 'Thiếu thông tin' });

        const affiliate = await db.get('SELECT id, role FROM users WHERE id = ?', [Number(affiliate_user_id)]);
        if (!affiliate || !AFFILIATE_ROLES.includes(affiliate.role)) return reply.code(400).send({ error: 'Tài khoản không phải affiliate' });

        const employee = await db.get('SELECT id, department_id FROM users WHERE id = ?', [Number(employee_user_id)]);
        if (!employee) return reply.code(400).send({ error: 'Không tìm thấy nhân viên' });

        await db.run('UPDATE users SET managed_by_user_id = ?, department_id = ? WHERE id = ?',
            [Number(employee_user_id), employee.department_id, Number(affiliate_user_id)]);
        return { success: true, message: 'Đã gán affiliate cho nhân viên' };
    });

    fastify.post('/api/affiliate/unassign', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { affiliate_user_id } = request.body || {};
        if (!affiliate_user_id) return reply.code(400).send({ error: 'Thiếu thông tin' });
        await db.run('UPDATE users SET managed_by_user_id = NULL WHERE id = ?', [Number(affiliate_user_id)]);
        return { success: true, message: 'Đã bỏ gán affiliate' };
    });

    fastify.get('/api/affiliate/unassigned', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const affiliates = await db.all(`
            SELECT id, full_name, phone, role, created_at
            FROM users
            WHERE role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien')
            AND managed_by_user_id IS NULL
            AND status = 'active'
            ORDER BY full_name
        `);
        return { affiliates };
    });

    // Commission report for affiliate users
    fastify.get('/api/affiliate/commission', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const { crm_filter } = request.query;
        
        // Get user's commission tier rates from DB (NOT from JWT which doesn't have commission_tier_id)
        let directRate = 0.10, parentRate = 0.05;
        const freshUser = await db.get('SELECT commission_tier_id, source_customer_id, created_at FROM users WHERE id = ?', [user.id]);
        if (freshUser && freshUser.commission_tier_id) {
            const tier = await db.get('SELECT percentage, parent_percentage FROM commission_tiers WHERE id = ?', [freshUser.commission_tier_id]);
            if (tier) {
                directRate = (tier.percentage || 10) / 100;
                parentRate = (tier.parent_percentage || 5) / 100;
            }
        }

        // ★ KH gốc (chính bản thân affiliate) — hưởng directRate cho đơn của mình
        // Fallback: nếu source_customer_id chưa được set (TK tạo trước khi có logic), tra ngược affiliate_account_requests
        let selfCustId = freshUser?.source_customer_id || null;
        if (!selfCustId) {
            const fallback = await db.get(
                `SELECT customer_id FROM affiliate_account_requests WHERE created_user_id = ? AND status = 'approved' LIMIT 1`,
                [user.id]
            );
            if (fallback?.customer_id) {
                selfCustId = fallback.customer_id;
                // Auto-repair: cập nhật source_customer_id để lần sau không cần tra ngược
                await db.run('UPDATE users SET source_customer_id = ? WHERE id = ? AND source_customer_id IS NULL', [selfCustId, user.id]);
                console.log(`[Commission API] Auto-repaired source_customer_id=${selfCustId} for user ${user.id}`);
            }
        }
        // ★ Mốc thời gian tạo TK Affiliate — đơn tự mua chỉ tính SAU ngày này
        const selfCreatedAt = freshUser?.created_at ? new Date(freshUser.created_at) : null;

        // Get child affiliate IDs via assigned_to_user_id (Gán cho TK Affiliate nào?)
        const childAffiliates = await db.all(
            `SELECT id, full_name FROM users
             WHERE assigned_to_user_id = ?
             AND role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')`,
            [user.id]
        );
        const childIds = childAffiliates.map(a => a.id);
        // ★ Trang Affiliate (ctv_hoa_hong): chỉ hiển thị khách TRỰC TIẾP, không gộp con
        // → Affiliate cha không thấy/hưởng hoa hồng khách affiliate của con
        const allIds = (crm_filter === 'ctv_hoa_hong') ? [user.id] : [user.id, ...childIds];
        const ph = allIds.map(() => '?').join(',');

        // Get customers referred by these affiliates (optionally filtered by crm_type)
        // ★ nhu_cau filter: cũng bao gồm KH đã chuyển sang ctv_hoa_hong (có conversion record từ nhu_cau)
        // ★ Thêm KH gốc (source_customer_id) để tính HH cho đơn của chính mình
        // ★ KH gốc BYPASS crm_type filter (luôn hiện bất kể crm_type)
        let crmFilterClause = '';
        if (crm_filter === 'nhu_cau') {
            // Lấy cả KH đang ở nhu_cau + KH đã chuyển từ nhu_cau sang ctv_hoa_hong (approved hoặc pending)
            crmFilterClause = ` AND (c.crm_type = 'nhu_cau' OR (c.crm_type = 'ctv_hoa_hong' AND c.id IN (
                SELECT customer_id FROM crm_conversion_requests WHERE from_crm_type = 'nhu_cau' AND to_crm_type = 'ctv_hoa_hong' AND status IN ('approved', 'pending')
            )))`;
        } else if (crm_filter) {
            crmFilterClause = ` AND c.crm_type = ?`;
        }
        // ★ KH gốc chỉ hiện ở trang Khách (nhu_cau), KHÔNG hiện ở trang Affiliate (ctv_hoa_hong)
        const showSelf = selfCustId && crm_filter !== 'ctv_hoa_hong';
        let custQuery = `
            SELECT c.id, c.customer_name, c.phone, c.order_status, c.referrer_id, c.created_at, c.appointment_date,
                   c.cancel_requested, c.cancel_approved, c.crm_type
            FROM customers c
            WHERE (c.referrer_id IN (${ph})${crmFilterClause})${showSelf ? ' OR c.id = ?' : ''}`;
        const custParams = [...allIds];
        if (crm_filter && crm_filter !== 'nhu_cau') {
            custParams.push(crm_filter);
        }
        if (showSelf) custParams.push(selfCustId);
        custQuery += ` ORDER BY c.created_at DESC`;
        console.log(`[Commission API] crm_filter=${crm_filter || 'NONE'}, userId=${user.id}, totalAffIds=${allIds.length}, selfCustId=${selfCustId || 'NONE'}`);
        const customers = await db.all(custQuery, custParams);
        console.log(`[Commission API] Found ${customers.length} customers (selfCustId=${selfCustId || 'NONE'}, found_self=${selfCustId ? customers.some(c => c.id === selfCustId) : 'N/A'}). CRM types: ${[...new Set(customers.map(c => c.crm_type))].join(', ')}`);

        // Get completed order revenue per customer
        const customerIds = customers.map(c => c.id);
        let completedRevenueMap = {};
        if (customerIds.length > 0) {
            const cph2 = customerIds.map(() => '?').join(',');
            const revenueRows = await db.all(`
                SELECT oc.customer_id,
                       COALESCE(SUM(oi.total), 0) as completed_revenue
                FROM order_codes oc
                LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                WHERE oc.customer_id IN (${cph2})
                AND oc.status = 'completed'
                GROUP BY oc.customer_id
            `, customerIds);
            revenueRows.forEach(r => { completedRevenueMap[r.customer_id] = r.completed_revenue; });
        }

        // Get total revenue (all orders) per customer for display
        let totalRevenueMap = {};
        if (customerIds.length > 0) {
            const cph3 = customerIds.map(() => '?').join(',');
            const totalRows = await db.all(`
                SELECT oi.customer_id,
                       COALESCE(SUM(oi.total), 0) as total_revenue
                FROM order_items oi
                LEFT JOIN order_codes oc ON oi.order_code_id = oc.id
                WHERE oi.customer_id IN (${cph3})
                AND (oc.status IS NULL OR oc.status != 'cancelled')
                GROUP BY oi.customer_id
            `, customerIds);
            totalRows.forEach(r => { totalRevenueMap[r.customer_id] = r.total_revenue; });
        }

        // Get latest consultation log per customer (including date)
        let consultMap = {};
        if (customerIds.length > 0) {
            const cph = customerIds.map(() => '?').join(',');
            const logs = await db.all(`
                SELECT DISTINCT ON (customer_id) customer_id, log_type, content, created_at
                FROM consultation_logs
                WHERE customer_id IN (${cph})
                ORDER BY customer_id, created_at DESC, id DESC
            `, customerIds);
            logs.forEach(l => { consultMap[l.customer_id] = l; });
        }

        // ★ Lấy ngày chuyển Affiliate cho TẤT CẢ KH (cả gián tiếp) để split rate + silent freeze
        const affConvMap = await _getAffConversionMap(db, customerIds);

        // ★ CHUẨN HÓA: Loại "cháu sinh ra đã là affiliate" → không bao giờ lọt vào dashboard ông
        const filteredCustomers = _excludeBornAsAffiliateIndirect(customers, user.id, affConvMap, selfCustId);
        const filteredIds = filteredCustomers.map(c => c.id);

        // ★ Tính commission per-order (split trước/sau chuyển CRM)
        let perOrderCommMap = {}; // { customerId: { commission, displayRate } }
        let _affPostRevMap = {}; // Doanh thu post-conversion cho trang Affiliate
        let _nhuCauPreRevMap = {}; // Doanh thu pre-conversion cho trang Khách
        let _selfQualifyingRev = 0; // ★ Doanh thu self-customer chỉ từ đơn SAU ngày tạo TK
        let _fooQualifyingRevMap = {}; // ★ FIRST-ORDER-ONLY: Doanh thu chỉ từ đơn qualifying (đơn đầu tiên)
        // ★ FIRST-ORDER-ONLY: Load cutoff + first order map
        const _fooCutoff = await _getCommissionCutoffDate(db);
        const _fooFirstMap = await _getFirstOrderMap(db, filteredIds);

        // ★ FIRST-ORDER-ONLY: Batch-fetch first COMPLETED order per customer (for status freeze)
        let _fooFirstCompletedMap = {}; // { customerId: { id, created_at } }
        if (_fooCutoff && filteredIds.length > 0) {
            const _fcPh = filteredIds.map(() => '?').join(',');
            const _fcRows = await db.all(`
                SELECT DISTINCT ON (customer_id) customer_id, id, created_at
                FROM order_codes
                WHERE customer_id IN (${_fcPh}) AND status = 'completed'
                ORDER BY customer_id, created_at ASC
            `, filteredIds);
            _fcRows.forEach(r => { _fooFirstCompletedMap[r.customer_id] = r; });
        }

        if (filteredIds.length > 0) {
            const cphOrd2 = filteredIds.map(() => '?').join(',');
            const allOrders = await db.all(`
                SELECT oc.id as order_id, oc.customer_id, oc.created_at as order_date,
                       COALESCE(SUM(oi.total), 0) as revenue
                FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                WHERE oc.customer_id IN (${cphOrd2}) AND oc.status = 'completed'
                GROUP BY oc.id, oc.customer_id, oc.created_at
            `, filteredIds);
            allOrders.forEach(o => {
                const cust = filteredCustomers.find(c => c.id === o.customer_id);
                const isSelf = selfCustId && o.customer_id === selfCustId;
                // ★ Đơn tự mua TRƯỚC khi tạo TK Affiliate → bỏ qua
                if (isSelf && selfCreatedAt && new Date(o.order_date) < selfCreatedAt) return;
                const isDirect = isSelf || (cust && cust.referrer_id === user.id);
                // ★ FIRST-ORDER-ONLY: Sau cutoff, chỉ đơn đầu tiên mới có commission
                const _fooIsAfterCutoff = _fooCutoff && new Date(o.order_date) >= _fooCutoff;
                if (_fooIsAfterCutoff && _fooFirstMap[o.customer_id] !== o.order_id) {
                    // Đơn lặp: self-order exempt cho bản thân, nhưng skip cho parent view
                    if (!isSelf) return; // Không phải self → 0%
                    // isSelf + repeat + afterCutoff → bản thân vẫn hưởng directRate
                    // (tiếp tục xuống dưới, rate = directRate vì isSelf)
                }
                const convDate = affConvMap[o.customer_id] || null;
                
                const isPreConversion = convDate && new Date(o.order_date) < new Date(convDate);
                const isPostConversion = convDate && !isPreConversion;
                
                // ★ Trang Affiliate: chỉ tính đơn SAU ngày chuyển
                if (crm_filter === 'ctv_hoa_hong' && isPreConversion) {
                    return;
                }
                // ★ Trang Khách: chỉ tính đơn TRƯỚC ngày chuyển (đơn mới thuộc trang Affiliate)
                // ★ NGOẠI TRỪ: KH gốc (is_self) → tính TẤT CẢ đơn (không split)
                if (crm_filter === 'nhu_cau' && isPostConversion && !isSelf) {
                    return;
                }
                // ★ Silent Freeze: KH gián tiếp đã chuyển affiliate → chỉ tính đơn TRƯỚC ngày chuyển
                // ★ NGOẠI TRỪ: KH gốc (is_self)
                const custObj = filteredCustomers.find(cc => cc.id === o.customer_id);
                const isIndirectFrozen = !isSelf && custObj && custObj.referrer_id !== user.id && convDate;
                if (crm_filter !== 'ctv_hoa_hong' && isIndirectFrozen && !isPreConversion) {
                    return;
                }
                
                // ★ KH gốc (chính mình) → luôn directRate (10%)
                const rate = isSelf ? directRate : _calcOrderRate(isDirect, directRate, parentRate, o.order_date, convDate, cust?.crm_type);
                if (!perOrderCommMap[o.customer_id]) perOrderCommMap[o.customer_id] = { commission: 0, hasConversion: !!convDate };
                perOrderCommMap[o.customer_id].commission += Math.round(Number(o.revenue) * rate);
                // ★ Track doanh thu qualifying cho self-customer
                if (isSelf) _selfQualifyingRev += Number(o.revenue);
                // ★ FIRST-ORDER-ONLY: Track doanh thu qualifying (chỉ từ đơn đầu tiên)
                if (!isSelf) {
                    if (!_fooQualifyingRevMap[o.customer_id]) _fooQualifyingRevMap[o.customer_id] = 0;
                    _fooQualifyingRevMap[o.customer_id] += Number(o.revenue);
                }
                
                // ★ Track doanh thu theo trang
                if (crm_filter === 'ctv_hoa_hong') {
                    if (!_affPostRevMap[o.customer_id]) _affPostRevMap[o.customer_id] = 0;
                    _affPostRevMap[o.customer_id] += Number(o.revenue);
                }
                if (crm_filter === 'nhu_cau' && convDate) {
                    if (!_nhuCauPreRevMap[o.customer_id]) _nhuCauPreRevMap[o.customer_id] = 0;
                    _nhuCauPreRevMap[o.customer_id] += Number(o.revenue);
                }
            });
            
            // ★ Trang Affiliate: ghi đè revenue maps bằng doanh thu post-conversion
            if (crm_filter === 'ctv_hoa_hong') {
                for (const custId of customerIds) {
                    const convDate = affConvMap[custId];
                    if (convDate) {
                        completedRevenueMap[custId] = _affPostRevMap[custId] || 0;
                        totalRevenueMap[custId] = _affPostRevMap[custId] || 0;
                    }
                }
            }
            // ★ Trang Khách: ghi đè revenue maps bằng doanh thu pre-conversion
            if (crm_filter === 'nhu_cau') {
                for (const custId of customerIds) {
                    const convDate = affConvMap[custId];
                    if (convDate) {
                        completedRevenueMap[custId] = _nhuCauPreRevMap[custId] || 0;
                        totalRevenueMap[custId] = _nhuCauPreRevMap[custId] || 0;
                    }
                }
            }
            // ★ KH gốc: ghi đè revenue bằng doanh thu qualifying (chỉ đơn SAU ngày tạo TK)
            if (selfCustId) {
                completedRevenueMap[selfCustId] = _selfQualifyingRev;
                totalRevenueMap[selfCustId] = _selfQualifyingRev;
            }
            // ★ FIRST-ORDER-ONLY: Ghi đè doanh thu cho KH frozen (chỉ tính đơn đầu tiên)
            // VD: CTV-VTA0012 (100tr) hoàn thành → doanh thu = 100tr, không cộng CTV-VTA0013 (50tr)
            if (_fooCutoff) {
                for (const custId of filteredIds) {
                    if (custId === selfCustId) continue; // Self đã xử lý ở trên
                    if (_fooQualifyingRevMap.hasOwnProperty(custId)) {
                        completedRevenueMap[custId] = _fooQualifyingRevMap[custId];
                        totalRevenueMap[custId] = _fooQualifyingRevMap[custId];
                    }
                }
            }
        }

        let totalCommission = 0;
        const items = await Promise.all(filteredCustomers.map(async c => {
            const isSelf = selfCustId && c.id === selfCustId;
            const isDirect = isSelf || c.referrer_id === user.id;
            const convDate = affConvMap[c.id] || null;
            const baseRate = isSelf ? directRate : (isDirect ? directRate : parentRate);
            const completedRevenue = completedRevenueMap[c.id] || 0;
            const commission = perOrderCommMap[c.id]?.commission || 0;
            // ★ displayRate: phụ thuộc vào trang đang xem
            // - Trang Affiliate (ctv_hoa_hong): luôn hiện tỷ lệ hiện hành (parentRate = 5%)
            // - Trang Khách (nhu_cau): hiện tỷ lệ thực tế từ commission/revenue
            let displayRate;
            if (isSelf) {
                // ★ KH gốc (chính mình) → luôn directRate (10%)
                displayRate = directRate;
            } else if (crm_filter === 'ctv_hoa_hong') {
                // Trang Affiliate → tỷ lệ hiện tại
                displayRate = isDirect ? parentRate : parentRate;
            } else if (completedRevenue > 0) {
                // Có doanh thu → tính tỷ lệ thực tế
                displayRate = commission / completedRevenue;
            } else {
                // Chưa có doanh thu → hiện tỷ lệ mặc định
                displayRate = (isDirect && (convDate || c.crm_type === 'ctv_hoa_hong')) ? parentRate : baseRate;
            }
            
            // Mask phone for child referrals (not for self)
            let displayPhone = c.phone;
            if (!isDirect && !isSelf && c.phone && c.phone.length >= 4) {
                displayPhone = c.phone.substring(0, 2) + 'xx xxx xx' + c.phone.substring(c.phone.length - 1);
            }

            const lastLog = consultMap[c.id] || null;
            const lastContactDate = lastLog?.created_at || c.created_at;
            
            // ★ Flag: KH đã chuyển từ nhu_cau sang ctv_hoa_hong
            const isConverted = (c.crm_type === 'ctv_hoa_hong' && (!!convDate || !!perOrderCommMap[c.id]?.hasConversion));

            // ★ Silent Freeze: KH gián tiếp đã chuyển affiliate → đóng băng dữ liệu tại thời điểm chuyển
            // Affiliate cha (ông) sẽ thấy bình thường nhưng dữ liệu không cập nhật
            const isSilentlyFrozen = !isDirect && !isSelf && !!convDate && crm_filter !== 'ctv_hoa_hong';

            // Nếu frozen: lấy log tư vấn TRƯỚC ngày chuyển (không hiện hoạt động sau)
            let frozenLog = lastLog;
            let frozenContactDate = lastContactDate;
            let frozenAppointmentDate = c.appointment_date || null;
            if (isSilentlyFrozen && convDate) {
                // Tìm log cuối cùng TRƯỚC ngày chuyển
                const preConvLogs = await db.all(`
                    SELECT log_type, content, created_at FROM consultation_logs
                    WHERE customer_id = ? AND created_at < ?
                    ORDER BY created_at DESC, id DESC LIMIT 1
                `, [c.id, convDate]);
                if (preConvLogs.length > 0) {
                    frozenLog = preConvLogs[0];
                    frozenContactDate = preConvLogs[0].created_at;
                }
                // Ngày hẹn: nếu sau ngày chuyển thì ẩn
                if (frozenAppointmentDate && new Date(frozenAppointmentDate) > new Date(convDate)) {
                    frozenAppointmentDate = null;
                }
            }

            // ★ FIRST-ORDER-ONLY: Đóng băng hiển thị khi KH đã có đơn hoàn thành
            // Sau cutoff: KH có completed order → freeze status = "hoàn thành đơn"
            let isFirstOrderFrozen = false;
            if (!isSelf && _fooCutoff && completedRevenue > 0) {
                const _fooCompletedOrder = _fooFirstCompletedMap[c.id];
                if (_fooCompletedOrder && new Date(_fooCompletedOrder.created_at) >= _fooCutoff) {
                    isFirstOrderFrozen = true;
                    // Override status → "hoàn thành đơn"
                    frozenLog = { log_type: '_hoan_thanh_don', content: 'Đơn hàng đã hoàn thành', created_at: _fooCompletedOrder.created_at };
                    frozenContactDate = _fooCompletedOrder.created_at;
                    frozenAppointmentDate = null; // Không hiện ngày hẹn sau khi hoàn thành
                }
            }

            return {
                ...c,
                phone: displayPhone,
                is_direct: isDirect,
                is_self: isSelf,
                rate: Math.round(displayRate * 100 * 10) / 10,
                total_revenue: totalRevenueMap[c.id] || 0,
                completed_revenue: completedRevenue,
                commission,
                is_converted_to_affiliate: isConverted,
                is_silently_frozen: isSilentlyFrozen,
                is_first_order_frozen: isFirstOrderFrozen,
                referrer_name: isSelf ? 'Đơn Của Tôi' : (isDirect ? 'Trực tiếp' : (childAffiliates.find(a => a.id === c.referrer_id)?.full_name || 'Con')),
                last_log_type: frozenLog?.log_type || null,
                last_log_content: frozenLog?.content || null,
                last_contact_date: frozenContactDate,
                appointment_date: frozenAppointmentDate
            };
        }));

        // Tính tổng commission sau khi resolve tất cả
        items.forEach(item => { totalCommission += item.commission; });

        // Sort by last_contact_date DESC (most recent first)
        items.sort((a, b) => new Date(b.last_contact_date) - new Date(a.last_contact_date));

        // Build referrer names list for filter dropdown
        const referrerNames = [...new Set(items.map(i => i.referrer_name))];

        // Count orders per customer + total (date-aware for converted customers)
        let orderCountMap = {};
        let totalOrders = 0;
        if (filteredIds.length > 0) {
            const cphOrd = filteredIds.map(() => '?').join(',');
            // ★ Query từng đơn với ngày tạo để filter theo conversion date
            const ordRows = await db.all(`
                SELECT DISTINCT oc.id, oc.created_at, oi.customer_id
                FROM order_items oi
                LEFT JOIN order_codes oc ON oi.order_code_id = oc.id
                WHERE oi.customer_id IN (${cphOrd})
                AND (oc.status IS NULL OR oc.status != 'cancelled')
            `, filteredIds);
            ordRows.forEach(r => {
                const convDate = affConvMap[r.customer_id] || null;
                const isSelfOrder = selfCustId && r.customer_id === selfCustId;
                // ★ Đơn tự mua TRƯỚC khi tạo TK → bỏ qua (INDEPENDENT of convDate)
                if (isSelfOrder && selfCreatedAt && new Date(r.created_at) < selfCreatedAt) return;
                // ★ FIRST-ORDER-ONLY: Sau cutoff, chỉ đếm đơn đầu tiên (self exempt)
                const _fooIsAfterCutoff2 = _fooCutoff && new Date(r.created_at) >= _fooCutoff;
                if (_fooIsAfterCutoff2 && _fooFirstMap[r.customer_id] !== r.id && !isSelfOrder) return;
                
                if (convDate) {
                    const isPreConversion = new Date(r.created_at) < new Date(convDate);
                    // Trang Affiliate: chỉ đếm đơn SAU chuyển
                    if (crm_filter === 'ctv_hoa_hong' && isPreConversion) return;
                    // Trang Khách: chỉ đếm đơn TRƯỚC chuyển (NGOẠI TRỪ KH gốc)
                    if (crm_filter === 'nhu_cau' && !isPreConversion && !isSelfOrder) return;
                    // ★ Silent Freeze: KH gián tiếp đã chuyển → chỉ đếm đơn TRƯỚC chuyển (NGOẠI TRỪ KH gốc)
                    const cObj = filteredCustomers.find(cc => cc.id === r.customer_id);
                    if (!isSelfOrder && crm_filter !== 'ctv_hoa_hong' && cObj && cObj.referrer_id !== user.id && !isPreConversion) return;
                }
                
                if (!orderCountMap[r.customer_id]) orderCountMap[r.customer_id] = 0;
                orderCountMap[r.customer_id]++;
                totalOrders++;
            });
        }

        items.forEach(item => { item.order_count = orderCountMap[item.id] || 0; });

        // Include filter diagnostic in response
        const crmTypesFound = [...new Set(customers.map(c => c.crm_type))];
        return { success: true, items, totalCommission, referrerNames, totalOrders, crm_filter_applied: crm_filter || null, crm_types_found: crmTypesFound, selfCreatedAt: selfCreatedAt?.toISOString() || null };
    });

    // All orders popup — single API for "Tổng Đơn Đặt Hàng" detail
    fastify.get('/api/affiliate/all-orders', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const { crm_filter } = request.query;

        // Get commission rates
        let directRate = 0.10, parentRate = 0.05;
        const freshUser = await db.get('SELECT commission_tier_id, source_customer_id, created_at FROM users WHERE id = ?', [user.id]);
        if (freshUser && freshUser.commission_tier_id) {
            const tier = await db.get('SELECT percentage, parent_percentage FROM commission_tiers WHERE id = ?', [freshUser.commission_tier_id]);
            if (tier) {
                directRate = (tier.percentage || 10) / 100;
                parentRate = (tier.parent_percentage || 5) / 100;
            }
        }

        // ★ KH gốc (chính bản thân affiliate)
        let selfCustId2 = freshUser?.source_customer_id || null;
        if (!selfCustId2) {
            const fb2 = await db.get(`SELECT customer_id FROM affiliate_account_requests WHERE created_user_id = ? AND status = 'approved' LIMIT 1`, [user.id]);
            if (fb2?.customer_id) selfCustId2 = fb2.customer_id;
        }
        const selfCreatedAt2 = freshUser?.created_at ? new Date(freshUser.created_at) : null;

        // Get child affiliates
        const childAffiliates = await db.all(
            `SELECT id, full_name FROM users
             WHERE assigned_to_user_id = ?
             AND role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')`,
            [user.id]
        );
        const childIds = childAffiliates.map(a => a.id);
        // ★ Trang Affiliate: chỉ hiển thị đơn của khách TRỰC TIẾP
        const allIds = (crm_filter === 'ctv_hoa_hong') ? [user.id] : [user.id, ...childIds];
        const ph = allIds.map(() => '?').join(',');

        // Get customers referred by these affiliates (optionally filtered by crm_type)
        // ★ Cùng logic filter đặc biệt với main API + KH gốc BYPASS crm_type filter
        let allCustCrmClause = '';
        if (crm_filter === 'nhu_cau') {
            // Lấy cả KH đang ở nhu_cau + KH đã chuyển từ nhu_cau sang ctv_hoa_hong
            allCustCrmClause = ` AND (c.crm_type = 'nhu_cau' OR (c.crm_type = 'ctv_hoa_hong' AND c.id IN (
                SELECT customer_id FROM crm_conversion_requests WHERE from_crm_type = 'nhu_cau' AND to_crm_type = 'ctv_hoa_hong' AND status IN ('approved', 'pending')
            )))`;
        } else if (crm_filter) {
            allCustCrmClause = ` AND c.crm_type = ?`;
        }
        // ★ KH gốc chỉ hiện ở trang Khách (nhu_cau), KHÔNG hiện ở trang Affiliate
        const showSelf2 = selfCustId2 && crm_filter !== 'ctv_hoa_hong';
        let allCustQuery = `
            SELECT ${_AFF_CUST_FIELDS_LIGHT}
            FROM customers c
            WHERE (c.referrer_id IN (${ph})${allCustCrmClause})${showSelf2 ? ' OR c.id = ?' : ''}`;
        const allCustParams = [...allIds];
        if (crm_filter && crm_filter !== 'nhu_cau') {
            allCustParams.push(crm_filter);
        }
        if (showSelf2) allCustParams.push(selfCustId2);
        const customers = await db.all(allCustQuery, allCustParams);

        if (customers.length === 0) {
            return { success: true, orders: [] };
        }

        const customerIds = customers.map(c => c.id);

        // ★ Lấy ngày chuyển Affiliate cho TẤT CẢ KH (cả gián tiếp) — silent freeze
        const affConvMap2 = await _getAffConversionMap(db, customerIds);

        // ★ CHUẨN HÓA: Loại "cháu sinh ra đã là affiliate"
        const filteredCust2 = _excludeBornAsAffiliateIndirect(customers, user.id, affConvMap2, selfCustId2);
        if (filteredCust2.length === 0) {
            return { success: true, orders: [] };
        }
        const filteredIds2 = filteredCust2.map(c => c.id);
        const cph = filteredIds2.map(() => '?').join(',');

        // ★ FIRST-ORDER-ONLY: Load cutoff + first order map
        const _fooCutoff3 = await _getCommissionCutoffDate(db);
        const _fooFirstMap3 = await _getFirstOrderMap(db, filteredIds2);

        // Get all non-cancelled orders with revenue
        const orders = await db.all(`
            SELECT oc.id as order_id, oc.order_code, oc.status, oc.created_at,
                   oi.customer_id, COALESCE(SUM(oi.total), 0) as revenue
            FROM order_items oi
            LEFT JOIN order_codes oc ON oi.order_code_id = oc.id
            WHERE oi.customer_id IN (${cph})
            AND (oc.status IS NULL OR oc.status != 'cancelled')
            GROUP BY oc.id, oc.order_code, oc.status, oc.created_at, oi.customer_id
            ORDER BY oc.created_at DESC
        `, filteredIds2);

        // Build customer map and referrer name map
        const custMap = {};
        filteredCust2.forEach(c => { custMap[c.id] = c; });

        const result = orders
            .filter(o => {
                // ★ Đơn tự mua TRƯỚC khi tạo TK → bỏ qua (INDEPENDENT of convDate)
                const isSelfOrd = selfCustId2 && o.customer_id === selfCustId2;
                if (isSelfOrd && selfCreatedAt2 && new Date(o.created_at) < selfCreatedAt2) return false;

                // ★ FIRST-ORDER-ONLY: Sau cutoff, lọc đơn lặp (self exempt)
                const _fooAC3 = _fooCutoff3 && new Date(o.created_at) >= _fooCutoff3;
                if (_fooAC3 && _fooFirstMap3[o.customer_id] !== o.order_id && !isSelfOrd) return false;

                const convDate = affConvMap2[o.customer_id] || null;
                if (!convDate) return true;
                
                const isPreConversion = new Date(o.created_at) < new Date(convDate);
                // ★ Trang Affiliate: loại bỏ đơn TRƯỚC ngày chuyển
                if (crm_filter === 'ctv_hoa_hong' && isPreConversion) return false;
                // ★ Trang Khách: loại bỏ đơn SAU ngày chuyển (NGOẠI TRỪ KH gốc)
                if (crm_filter === 'nhu_cau' && !isPreConversion && !isSelfOrd) return false;
                // ★ Silent Freeze: KH gián tiếp đã chuyển affiliate → loại bỏ đơn SAU ngày chuyển
                const cust2 = custMap[o.customer_id];
                const isSelfOrder = selfCustId2 && o.customer_id === selfCustId2;
                if (!isSelfOrder && crm_filter !== 'ctv_hoa_hong' && cust2 && cust2.referrer_id !== user.id && !isPreConversion) return false;
                
                return true;
            })
            .map(o => {
            const cust = custMap[o.customer_id] || {};
            const isSelf = selfCustId2 && o.customer_id === selfCustId2;
            const isDirect = isSelf || cust.referrer_id === user.id;
            const convDate = affConvMap2[o.customer_id] || null;
            // ★ FIRST-ORDER-ONLY: Zero rate cho đơn lặp sau cutoff (self exempt cho bản thân)
            const _fooAC3b = _fooCutoff3 && new Date(o.created_at) >= _fooCutoff3;
            const _fooIsRepeat3 = _fooAC3b && _fooFirstMap3[o.customer_id] !== o.order_id;
            let rate;
            if (_fooIsRepeat3) {
                rate = isSelf ? directRate : 0; // Self vẫn hưởng, non-self đã bị filter ở trên
            } else {
                rate = isSelf ? directRate : _calcOrderRate(isDirect, directRate, parentRate, o.created_at, convDate, cust?.crm_type);
            }
            const revenue = Number(o.revenue) || 0;
            const commission = o.status === 'completed' ? Math.round(revenue * rate) : 0;
            const referrerName = isSelf
                ? 'Đơn Của Tôi'
                : (isDirect
                    ? 'Trực tiếp'
                    : (childAffiliates.find(a => a.id === cust.referrer_id)?.full_name || 'Gián tiếp'));

            return {
                order_code: o.order_code,
                status: o.status,
                created_at: o.created_at,
                customer_name: cust.customer_name || '',
                referrer_name: referrerName,
                is_direct: isDirect,
                is_self: isSelf,
                rate: rate * 100,
                revenue,
                commission
            };
        });

        return { success: true, orders: result };
    });

    // Auto-calculated balance for affiliate withdrawal
    fastify.get('/api/affiliate/balance', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        
        // Calculate total commission (reuse commission logic)
        let directRate = 0.10, parentRate = 0.05;
        const freshUser = await db.get('SELECT commission_tier_id, source_customer_id, created_at, bank_name, bank_account, bank_holder, full_name FROM users WHERE id = ?', [user.id]);
        if (freshUser && freshUser.commission_tier_id) {
            const tier = await db.get('SELECT percentage, parent_percentage FROM commission_tiers WHERE id = ?', [freshUser.commission_tier_id]);
            if (tier) {
                directRate = (tier.percentage || 10) / 100;
                parentRate = (tier.parent_percentage || 5) / 100;
            }
        }

        // ★ KH gốc (chính bản thân affiliate)
        let selfCustIdB = freshUser?.source_customer_id || null;
        if (!selfCustIdB) {
            const fbB = await db.get(`SELECT customer_id FROM affiliate_account_requests WHERE created_user_id = ? AND status = 'approved' LIMIT 1`, [user.id]);
            if (fbB?.customer_id) selfCustIdB = fbB.customer_id;
        }
        const selfCreatedAtB = freshUser?.created_at ? new Date(freshUser.created_at) : null;

        // Get child affiliates
        const childAffiliates = await db.all(
            `SELECT id FROM users WHERE assigned_to_user_id = ? AND role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')`,
            [user.id]
        );
        const childIds = childAffiliates.map(a => a.id);
        const allIds = [user.id, ...childIds];
        const ph = allIds.map(() => '?').join(',');

        // Get customers (including self)
        let balCustQuery = `SELECT ${_AFF_CUST_FIELDS_LIGHT} FROM customers c WHERE (c.referrer_id IN (${ph})${selfCustIdB ? ' OR c.id = ?' : ''})`;
        const balCustParams = [...allIds];
        if (selfCustIdB) balCustParams.push(selfCustIdB);
        const customers = await db.all(balCustQuery, balCustParams);
        const customerIds = customers.map(c => c.id);

        // ★ Get completed revenue — per-order split (trước/sau chuyển CRM)
        const affConvMapB = await _getAffConversionMap(db, customerIds);

        // ★ CHUẨN HÓA: Loại "cháu sinh ra đã là affiliate"
        const filteredCustB = _excludeBornAsAffiliateIndirect(customers, user.id, affConvMapB, selfCustIdB);
        const filteredIdsB = filteredCustB.map(c => c.id);

        let totalCommission = 0;
        // ★ FIRST-ORDER-ONLY: Load cutoff + first order map for balance
        const _fooCutoff4 = await _getCommissionCutoffDate(db);
        const _fooFirstMap4 = await _getFirstOrderMap(db, filteredIdsB);

        if (filteredIdsB.length > 0) {
            const cph = filteredIdsB.map(() => '?').join(',');
            const orderRows = await db.all(`
                SELECT oc.id as order_id, oc.customer_id, oc.created_at as order_date,
                       COALESCE(SUM(oi.total), 0) as revenue
                FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'
                GROUP BY oc.id, oc.customer_id, oc.created_at
            `, filteredIdsB);
            orderRows.forEach(r => {
                const cust = filteredCustB.find(c => c.id === r.customer_id);
                const isSelfB = selfCustIdB && r.customer_id === selfCustIdB;
                // ★ Đơn tự mua TRƯỚC khi tạo TK → bỏ qua
                if (isSelfB && selfCreatedAtB && new Date(r.order_date) < selfCreatedAtB) return;
                // ★ FIRST-ORDER-ONLY: Sau cutoff, chỉ đơn đầu tiên (self exempt cho bản thân)
                const _fooAC4 = _fooCutoff4 && new Date(r.order_date) >= _fooCutoff4;
                if (_fooAC4 && _fooFirstMap4[r.customer_id] !== r.order_id && !isSelfB) return;
                const isDirect = isSelfB || (cust && cust.referrer_id === user.id);
                const convDate = affConvMapB[r.customer_id] || null;
                // ★ Silent Freeze: KH gián tiếp đã chuyển affiliate → chỉ tính đơn TRƯỚC chuyển
                if (!isDirect && !isSelfB && cust?.crm_type === 'ctv_hoa_hong') {
                    if (!convDate) return;
                    const isPreConversion = new Date(r.order_date) < new Date(convDate);
                    if (!isPreConversion) return;
                }
                const rate = isSelfB ? directRate : _calcOrderRate(isDirect, directRate, parentRate, r.order_date, convDate, cust?.crm_type);
                totalCommission += Math.round(Number(r.revenue) * rate);
            });
        }

        // Get total approved withdrawals
        const withdrawnRow = await db.get(`SELECT COALESCE(SUM(amount), 0) as total_withdrawn FROM withdrawal_requests WHERE user_id = ? AND status = 'approved'`, [user.id]);
        const totalWithdrawn = withdrawnRow?.total_withdrawn || 0;

        // Get pending withdrawals
        const pendingRow = await db.get(`SELECT COALESCE(SUM(amount), 0) as total_pending FROM withdrawal_requests WHERE user_id = ? AND status = 'pending'`, [user.id]);
        const totalPending = pendingRow?.total_pending || 0;

        const balance = totalCommission - totalWithdrawn - totalPending;

        return {
            success: true,
            balance: Math.max(0, balance),
            totalCommission,
            totalWithdrawn,
            totalPending,
            bankInfo: {
                bank_name: freshUser?.bank_name || '',
                bank_account: freshUser?.bank_account || '',
                bank_holder: freshUser?.bank_holder || ''
            }
        };
    });

    // Admin: Get all affiliate stats for dashboard
    fastify.get('/api/affiliate/stats-all', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao')] }, async (request, reply) => {
        try {
            const { dateFrom, dateTo } = request.query;
            const affiliates = await db.all(`SELECT id, full_name, phone, commission_tier_id FROM users WHERE role = 'tkaffiliate'`);
            if (!affiliates || affiliates.length === 0) {
                return { success: true, affiliates: [], grandTotalCommission: 0, grandTotalWithdrawn: 0, grandTotalBalance: 0, filteredCommission: 0, filteredWithdrawn: 0 };
            }

            const allTiers = await db.all('SELECT * FROM commission_tiers');
            const tierMap = {};
            allTiers.forEach(t => { tierMap[t.id] = t; });

            const allWithdrawn = await db.all(`SELECT user_id, status, COALESCE(SUM(amount), 0) as total FROM withdrawal_requests GROUP BY user_id, status`);
            const withdrawnMap = {}, pendingMap = {};
            allWithdrawn.forEach(w => {
                if (w.status === 'approved') withdrawnMap[w.user_id] = (withdrawnMap[w.user_id] || 0) + w.total;
                if (w.status === 'pending') pendingMap[w.user_id] = (pendingMap[w.user_id] || 0) + w.total;
            });

            const allChildren = await db.all(`SELECT id, assigned_to_user_id FROM users WHERE role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate') AND assigned_to_user_id IS NOT NULL`);

            // Filtered withdrawn (by approved_at date)
            let filteredWithdrawn = 0;
            if (dateFrom && dateTo) {
                const fwRow = await db.get(`SELECT COALESCE(SUM(amount), 0) as total FROM withdrawal_requests WHERE status = 'approved' AND approved_at >= ? AND approved_at <= ?`, [dateFrom, dateTo + ' 23:59:59']);
                filteredWithdrawn = fwRow?.total || 0;
            }

            const results = [];
            let filteredCommission = 0;
            // ★ FIRST-ORDER-ONLY: Load cutoff once
            const _fooCutoff5 = await _getCommissionCutoffDate(db);

            for (const aff of affiliates) {
                const tier = aff.commission_tier_id ? tierMap[aff.commission_tier_id] : null;
                const directRate = tier ? (tier.percentage || 10) / 100 : 0.10;
                const parentRate = tier ? (tier.parent_percentage || 5) / 100 : 0.05;

                const childIds = allChildren.filter(c => c.assigned_to_user_id === aff.id).map(c => c.id);
                const allIds = [aff.id, ...childIds];
                const ph = allIds.map(() => '?').join(',');

                const customers = await db.all(`SELECT ${_AFF_CUST_FIELDS_LIGHT} FROM customers c WHERE c.referrer_id IN (${ph})`, allIds);
                const customerIds = customers.map(c => c.id);

                let totalCommission = 0;
                let affFilteredCommission = 0;
                // ★ Per-order split (trước/sau chuyển CRM)
                // ★ CHUẨN HÓA: convMap cho TẤT CẢ KH + loại cháu born-as-affiliate
                const affConvMapS = await _getAffConversionMap(db, customerIds);
                const filteredCustS = _excludeBornAsAffiliateIndirect(customers, aff.id, affConvMapS);
                const filteredIdsS = filteredCustS.map(c => c.id);
                if (filteredIdsS.length > 0) {
                    const cph = filteredIdsS.map(() => '?').join(',');
                    // ★ FIRST-ORDER-ONLY: firstOrderMap per affiliate
                    const _fooFirstMap5 = await _getFirstOrderMap(db, filteredIdsS);

                    // All-time commission — per-order
                    const orderRowsS = await db.all(`
                        SELECT oc.id as order_id, oc.customer_id, oc.created_at as order_date,
                               COALESCE(SUM(oi.total), 0) as revenue
                        FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                        WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'
                        GROUP BY oc.id, oc.customer_id, oc.created_at
                    `, filteredIdsS);
                    orderRowsS.forEach(r => {
                        const cust = filteredCustS.find(c => c.id === r.customer_id);
                        const isDirect = cust && cust.referrer_id === aff.id;
                        const convDate = affConvMapS[r.customer_id] || null;
                        // ★ FIRST-ORDER-ONLY: skip repeat orders after cutoff
                        const _fooAC5 = _fooCutoff5 && new Date(r.order_date) >= _fooCutoff5;
                        if (_fooAC5 && _fooFirstMap5[r.customer_id] !== r.order_id) return;
                        const rate = _calcOrderRate(isDirect, directRate, parentRate, r.order_date, convDate, cust?.crm_type);
                        totalCommission += Math.round(Number(r.revenue) * rate);
                    });

                    // Filtered commission by date — per-order
                    if (dateFrom && dateTo) {
                        const filteredRowsS = await db.all(`
                            SELECT oc.id as order_id, oc.customer_id, oc.created_at as order_date,
                                   COALESCE(SUM(oi.total), 0) as revenue
                            FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                            WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'
                            AND oc.created_at >= ? AND oc.created_at <= ?
                            GROUP BY oc.id, oc.customer_id, oc.created_at
                        `, [...filteredIdsS, dateFrom, dateTo + ' 23:59:59']);
                        filteredRowsS.forEach(r => {
                            const cust = filteredCustS.find(c => c.id === r.customer_id);
                            const isDirect = cust && cust.referrer_id === aff.id;
                            const convDate = affConvMapS[r.customer_id] || null;
                            // ★ FIRST-ORDER-ONLY: skip repeat orders after cutoff
                            const _fooAC5b = _fooCutoff5 && new Date(r.order_date) >= _fooCutoff5;
                            if (_fooAC5b && _fooFirstMap5[r.customer_id] !== r.order_id) return;
                            const rate = _calcOrderRate(isDirect, directRate, parentRate, r.order_date, convDate, cust?.crm_type);
                            affFilteredCommission += Math.round(Number(r.revenue) * rate);
                        });
                    }
                }

                filteredCommission += affFilteredCommission;
                const totalWithdrawn = withdrawnMap[aff.id] || 0;
                const totalPending = pendingMap[aff.id] || 0;
                results.push({
                    id: aff.id, name: aff.full_name, phone: aff.phone,
                    totalCommission, totalWithdrawn, totalPending,
                    balance: Math.max(0, totalCommission - totalWithdrawn - totalPending)
                });
            }

            return {
                success: true, affiliates: results,
                grandTotalCommission: results.reduce((s, r) => s + r.totalCommission, 0),
                grandTotalWithdrawn: results.reduce((s, r) => s + r.totalWithdrawn, 0),
                grandTotalBalance: results.reduce((s, r) => s + r.balance, 0),
                filteredCommission,
                filteredWithdrawn
            };
        } catch (e) {
            console.error('stats-all error:', e);
            return reply.code(500).send({ error: 'Lỗi tải thống kê', success: false });
        }
    });

    // Admin: Get commission orders for a specific affiliate
    fastify.get('/api/affiliate/:id/commission-orders', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const affId = Number(request.params.id);
        const aff = await db.get('SELECT id, full_name, commission_tier_id FROM users WHERE id = ?', [affId]);
        if (!aff) return reply.code(404).send({ error: 'Không tìm thấy' });

        let directRate = 0.10, parentRate = 0.05;
        if (aff.commission_tier_id) {
            const tier = await db.get('SELECT percentage, parent_percentage FROM commission_tiers WHERE id = ?', [aff.commission_tier_id]);
            if (tier) { directRate = (tier.percentage || 10) / 100; parentRate = (tier.parent_percentage || 5) / 100; }
        }

        const childAffiliates = await db.all(`SELECT id FROM users WHERE assigned_to_user_id = ? AND role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')`, [aff.id]);
        const childIds = childAffiliates.map(a => a.id);
        const allIds = [aff.id, ...childIds];
        const ph = allIds.map(() => '?').join(',');

        const customers = await db.all(`SELECT c.id, c.customer_name, c.phone, c.referrer_id, c.assigned_to_id, c.crm_type FROM customers c WHERE c.referrer_id IN (${ph})`, allIds);
        const customerIds = customers.map(c => c.id);

        // Get NV quản lý names
        const assignedIds = [...new Set(customers.map(c => c.assigned_to_id).filter(Boolean))];
        let nvMap = {};
        if (assignedIds.length > 0) {
            const aph = assignedIds.map(() => '?').join(',');
            const nvRows = await db.all(`SELECT id, full_name FROM users WHERE id IN (${aph})`, assignedIds);
            nvRows.forEach(r => { nvMap[r.id] = r.full_name; });
        }

        const orders = [];
        if (customerIds.length > 0) {
            // ★ CHUẨN HÓA: convMap cho TẤT CẢ KH + loại cháu born-as-affiliate
            const affConvMapA = await _getAffConversionMap(db, customerIds);
            const filteredCustA = _excludeBornAsAffiliateIndirect(customers, aff.id, affConvMapA);
            const filteredIdsA = filteredCustA.map(c => c.id);

            if (filteredIdsA.length > 0) {
                const cph = filteredIdsA.map(() => '?').join(',');
                // ★ FIRST-ORDER-ONLY: Load cutoff + first order map
                const _fooCutoff6 = await _getCommissionCutoffDate(db);
                const _fooFirstMap6 = await _getFirstOrderMap(db, filteredIdsA);
                const rows = await db.all(`
                    SELECT oc.id, oc.order_code, oc.customer_id, oc.status, oc.created_at,
                           COALESCE(SUM(oi.total), 0) as revenue
                    FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                    WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'
                    GROUP BY oc.id, oc.order_code, oc.customer_id, oc.status, oc.created_at
                    ORDER BY oc.created_at DESC
                `, filteredIdsA);
                rows.forEach(r => {
                    const cust = filteredCustA.find(c => c.id === r.customer_id);
                    const isDirect = cust && cust.referrer_id === aff.id;
                    const convDate = affConvMapA[r.customer_id] || null;
                    // ★ FIRST-ORDER-ONLY: skip repeat orders after cutoff
                    const _fooAC6 = _fooCutoff6 && new Date(r.created_at) >= _fooCutoff6;
                    if (_fooAC6 && _fooFirstMap6[r.customer_id] !== r.id) return;
                    const rate = _calcOrderRate(isDirect, directRate, parentRate, r.created_at, convDate, cust?.crm_type);
                    const nvName = cust?.assigned_to_id ? (nvMap[cust.assigned_to_id] || '—') : '—';
                    orders.push({
                        order_code: r.order_code, customer_name: cust?.customer_name || '-',
                        nv_quan_ly: nvName,
                        revenue: Number(r.revenue), rate: rate * 100, commission: Math.round(Number(r.revenue) * rate),
                        type: isDirect ? 'Trực tiếp' : 'Gián tiếp', completed_at: r.created_at
                    });
                });
            }
        }

        return { success: true, name: aff.full_name, orders };
    });

    // ===== LEADERBOARD (4 boards) =====
    fastify.get('/api/affiliate/leaderboard', { preHandler: [authenticate] }, async (request, reply) => {
        const { period, value } = request.query;

        // Check role access
        const configRow = await db.get("SELECT value FROM app_config WHERE key = 'leaderboard_allowed_roles'");
        const allowedRoles = configRow ? JSON.parse(configRow.value) : ['giam_doc','quan_ly','quan_ly_cap_cao'];
        if (!allowedRoles.includes(request.user.role)) {
            return reply.code(403).send({ error: 'Bạn không có quyền xem trang này' });
        }

        // Build date range
        let dateFrom = null, dateTo = null;
        if (period === 'daily' && value) {
            // value = "2026-03-25"
            dateFrom = value;
            dateTo = value + ' 23:59:59';
        } else if (period === 'weekly' && value) {
            // value = "2026-W13" → find Monday-Sunday of ISO week
            const [wy, wn] = value.split('-W');
            const jan1 = new Date(Number(wy), 0, 1);
            const jan1Day = jan1.getDay() || 7; // Mon=1..Sun=7
            const mon = new Date(jan1);
            mon.setDate(jan1.getDate() + (Number(wn) - 1) * 7 - jan1Day + 2);
            const sun = new Date(mon);
            sun.setDate(mon.getDate() + 6);
            dateFrom = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
            dateTo = `${sun.getFullYear()}-${String(sun.getMonth()+1).padStart(2,'0')}-${String(sun.getDate()).padStart(2,'0')} 23:59:59`;
        } else if ((period === 'month' || period === 'monthly') && value) {
            const [y, m] = value.split('-');
            dateFrom = `${y}-${m.padStart(2,'0')}-01`;
            const lastDay = new Date(Number(y), Number(m), 0).getDate();
            dateTo = `${y}-${m.padStart(2,'0')}-${lastDay} 23:59:59`;
        } else if ((period === 'quarter' || period === 'quarterly') && value) {
            const [y, q] = value.split('-Q');
            const startMonth = (Number(q) - 1) * 3 + 1;
            const endMonth = startMonth + 2;
            dateFrom = `${y}-${String(startMonth).padStart(2,'0')}-01`;
            const lastDay = new Date(Number(y), endMonth, 0).getDate();
            dateTo = `${y}-${String(endMonth).padStart(2,'0')}-${lastDay} 23:59:59`;
        } else if (period === 'year' && value) {
            dateFrom = `${value}-01-01`;
            dateTo = `${value}-12-31 23:59:59`;
        }

        // ====== Shared data: all affiliates, children, customers, orders ======
        const allAffiliates = await db.all(`SELECT id, full_name, phone, managed_by_user_id FROM users WHERE role = 'tkaffiliate' AND status = 'active'`);
        const allChildrenRaw = await db.all(`SELECT id, assigned_to_user_id FROM users WHERE role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate') AND assigned_to_user_id IS NOT NULL`);

        // Build affiliate → [self + children ids] map
        const affIdMap = {};
        for (const aff of allAffiliates) {
            const childIds = allChildrenRaw.filter(c => c.assigned_to_user_id === aff.id).map(c => c.id);
            affIdMap[aff.id] = [aff.id, ...childIds];
        }

        // Get all referrer IDs we need
        const allReferrerIds = [...new Set(Object.values(affIdMap).flat())];
        if (allReferrerIds.length === 0) {
            return { success: true, affiliateRevenue: [], employeeRevenue: [], employeeOrders: [], teamRevenue: [] };
        }

        const rph = allReferrerIds.map(() => '?').join(',');
        const allCustomers = await db.all(`SELECT id, referrer_id FROM customers c WHERE c.referrer_id IN (${rph})`, allReferrerIds);
        const allCustomerIds = allCustomers.map(c => c.id);

        // Get order stats per customer
        let customerStatsMap = {};
        if (allCustomerIds.length > 0) {
            const cph = allCustomerIds.map(() => '?').join(',');
            let q = `SELECT oc.customer_id, COUNT(DISTINCT oc.id) as total_orders, COALESCE(SUM(oi.total), 0) as total_revenue
                FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'`;
            const params = [...allCustomerIds];
            if (dateFrom) { q += ` AND oc.created_at >= ?`; params.push(dateFrom); }
            if (dateTo) { q += ` AND oc.created_at <= ?`; params.push(dateTo); }
            q += ` GROUP BY oc.customer_id`;
            const rows = await db.all(q, params);
            rows.forEach(r => { customerStatsMap[r.customer_id] = { revenue: Number(r.total_revenue) || 0, orders: Number(r.total_orders) || 0 }; });
        }

        // Helper: sum stats for a set of referrer IDs
        function sumStatsForReferrers(referrerIds) {
            let totalRevenue = 0, totalOrders = 0, totalCustomers = 0;
            for (const c of allCustomers) {
                if (referrerIds.includes(c.referrer_id)) {
                    totalCustomers++;
                    const s = customerStatsMap[c.id];
                    if (s) { totalRevenue += s.revenue; totalOrders += s.orders; }
                }
            }
            return { totalRevenue, totalOrders, totalCustomers };
        }

        // ====== BOARD 1: Ngôi Sao Doanh Số (Affiliate revenue) ======
        const affiliateRevenue = [];
        for (const aff of allAffiliates) {
            const ids = affIdMap[aff.id];
            const stats = sumStatsForReferrers(ids);
            affiliateRevenue.push({
                id: aff.id, name: aff.full_name, phone: aff.phone,
                total_revenue: stats.totalRevenue, total_customers: stats.totalCustomers, total_orders: stats.totalOrders
            });
        }
        affiliateRevenue.sort((a, b) => b.total_revenue - a.total_revenue);
        affiliateRevenue.splice(10);
        affiliateRevenue.forEach((r, i) => { r.rank = i + 1; });

        // ====== BOARD 2 & 3: Employee rankings ======
        // Get all employees who manage affiliates
        const employeeIds = [...new Set(allAffiliates.map(a => a.managed_by_user_id).filter(Boolean))];
        const employees = employeeIds.length > 0
            ? await db.all(`SELECT id, full_name, phone FROM users WHERE id IN (${employeeIds.map(() => '?').join(',')})`, employeeIds)
            : [];

        const employeeRevenue = [];
        const employeeOrders = [];
        for (const emp of employees) {
            // Get all affiliates managed by this employee
            const empAffs = allAffiliates.filter(a => a.managed_by_user_id === emp.id);
            let empTotalRevenue = 0, empTotalOrders = 0, empTotalCustomers = 0;
            for (const aff of empAffs) {
                const ids = affIdMap[aff.id];
                const stats = sumStatsForReferrers(ids);
                empTotalRevenue += stats.totalRevenue;
                empTotalOrders += stats.totalOrders;
                empTotalCustomers += stats.totalCustomers;
            }
            const affCount = empAffs.length;
            employeeRevenue.push({
                id: emp.id, name: emp.full_name, phone: emp.phone,
                total_revenue: empTotalRevenue, total_customers: empTotalCustomers,
                total_orders: empTotalOrders, affiliate_count: affCount
            });
            employeeOrders.push({
                id: emp.id, name: emp.full_name, phone: emp.phone,
                total_revenue: empTotalRevenue, total_customers: empTotalCustomers,
                total_orders: empTotalOrders, affiliate_count: affCount
            });
        }
        employeeRevenue.sort((a, b) => b.total_revenue - a.total_revenue);
        employeeRevenue.splice(10);
        employeeRevenue.forEach((r, i) => { r.rank = i + 1; });

        employeeOrders.sort((a, b) => b.total_orders - a.total_orders);
        employeeOrders.splice(10);
        employeeOrders.forEach((r, i) => { r.rank = i + 1; });

        // ====== BOARD 4: Team revenue (Đội Hình Vàng) ======
        // Use departments table — employees belong to departments via department_id
        let deptRows = [];
        try { deptRows = await db.all(`SELECT id, name, parent_id FROM departments WHERE status = 'active' ORDER BY name`); } catch(e) {}

        // Get all employees (who manage affiliates) with their department_id
        const allEmployeeIds = [...new Set(allAffiliates.map(a => a.managed_by_user_id).filter(Boolean))];
        let employeeDeptsMap = {};
        if (allEmployeeIds.length > 0) {
            const eph = allEmployeeIds.map(() => '?').join(',');
            const empRows = await db.all(`SELECT id, department_id FROM users WHERE id IN (${eph})`, allEmployeeIds);
            empRows.forEach(e => { employeeDeptsMap[e.id] = e.department_id; });
        }

        const teamRevenue = [];
        for (const dept of deptRows) {
            // Find employees in this department
            const deptEmployeeIds = allEmployeeIds.filter(eid => employeeDeptsMap[eid] === dept.id);
            if (deptEmployeeIds.length === 0) continue;
            // Get affiliates managed by employees in this department
            const deptAffs = allAffiliates.filter(a => deptEmployeeIds.includes(a.managed_by_user_id));
            if (deptAffs.length === 0) continue;
            let deptTotalRevenue = 0, deptTotalOrders = 0, deptTotalCustomers = 0;
            for (const aff of deptAffs) {
                const ids = affIdMap[aff.id];
                const stats = sumStatsForReferrers(ids);
                deptTotalRevenue += stats.totalRevenue;
                deptTotalOrders += stats.totalOrders;
                deptTotalCustomers += stats.totalCustomers;
            }
            teamRevenue.push({
                id: dept.id, name: dept.name,
                total_revenue: deptTotalRevenue, total_customers: deptTotalCustomers,
                total_orders: deptTotalOrders, affiliate_count: deptAffs.length,
                member_count: deptEmployeeIds.length
            });
        }
        teamRevenue.sort((a, b) => b.total_revenue - a.total_revenue);
        teamRevenue.splice(10);
        teamRevenue.forEach((r, i) => { r.rank = i + 1; });

        // ====== BOARD 5: Thợ Săn Tài Năng (NV tạo affiliate nhiều nhất) ======
        // Count affiliates created per managed_by_user_id, filtered by affiliate created_at
        let affCreatedQuery = `SELECT managed_by_user_id, COUNT(*) as aff_count
            FROM users WHERE role = 'tkaffiliate' AND status = 'active' AND managed_by_user_id IS NOT NULL`;
        const affCreatedParams = [];
        if (dateFrom) { affCreatedQuery += ` AND created_at >= ?`; affCreatedParams.push(dateFrom); }
        if (dateTo) { affCreatedQuery += ` AND created_at <= ?`; affCreatedParams.push(dateTo); }
        affCreatedQuery += ` GROUP BY managed_by_user_id ORDER BY aff_count DESC LIMIT 10`;
        const hunterRows = await db.all(affCreatedQuery, affCreatedParams);

        const hunterRanking = [];
        if (hunterRows.length > 0) {
            const hIds = hunterRows.map(h => h.managed_by_user_id);
            const hph = hIds.map(() => '?').join(',');
            const hunterUsers = await db.all(`SELECT id, full_name, phone FROM users WHERE id IN (${hph})`, hIds);
            const hunterMap = {};
            hunterUsers.forEach(u => { hunterMap[u.id] = u; });
            hunterRows.forEach((h, i) => {
                const u = hunterMap[h.managed_by_user_id];
                if (u) hunterRanking.push({
                    rank: i + 1, id: u.id, name: u.full_name, phone: u.phone,
                    affiliate_count: Number(h.aff_count)
                });
            });
        }

        // ====== BOARD 6: Nam Châm Khách Hàng (NV có affiliate giới thiệu KH nhiều nhất) ======
        const magnetRanking = [];
        for (const emp of employees) {
            const empAffs = allAffiliates.filter(a => a.managed_by_user_id === emp.id);
            let empTotalCustomers = 0;
            for (const aff of empAffs) {
                const ids = affIdMap[aff.id];
                const stats = sumStatsForReferrers(ids);
                empTotalCustomers += stats.totalCustomers;
            }
            magnetRanking.push({
                id: emp.id, name: emp.full_name, phone: emp.phone,
                total_customers: empTotalCustomers, affiliate_count: empAffs.length
            });
        }
        magnetRanking.sort((a, b) => b.total_customers - a.total_customers);
        magnetRanking.splice(10);
        magnetRanking.forEach((r, i) => { r.rank = i + 1; });

        return { success: true, affiliateRevenue, employeeRevenue, employeeOrders, teamRevenue, hunterRanking, magnetRanking };
    });

    // ===== LEADERBOARD DETAIL DRILL-DOWN =====
    fastify.get('/api/affiliate/leaderboard-detail', { preHandler: [authenticate] }, async (request) => {
        const { board_key, person_id, month, period_type } = request.query;
        if (!board_key || !person_id || !month) return { success: false, error: 'Missing params' };

        const { dateFrom, dateTo } = _parsePeriodDateRange(period_type || 'monthly', month);
        if (!dateFrom || !dateTo) return { success: false, error: 'Invalid period' };

        // Hunter ranking: list affiliates created by this employee
        if (board_key === 'hunterRanking') {
            let q = `SELECT u.id, u.full_name, u.phone, u.created_at 
                FROM users u WHERE u.role = 'tkaffiliate' AND u.status = 'active' AND u.managed_by_user_id = ?`;
            const params = [Number(person_id)];
            q += ` AND u.created_at >= ? AND u.created_at <= ?`;
            params.push(dateFrom, dateTo);
            q += ` ORDER BY u.created_at DESC`;
            const affiliates = await db.all(q, params);
            return { success: true, type: 'affiliates', items: affiliates };
        }

        // For other boards: get order details
        // First determine which referrer IDs to look at
        let referrerIds = [];
        if (board_key === 'affiliateRevenue') {
            // person_id is an affiliate — get self + children
            const children = await db.all(`SELECT id FROM users WHERE assigned_to_user_id = ? AND role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')`, [Number(person_id)]);
            referrerIds = [Number(person_id), ...children.map(c => c.id)];
        } else if (board_key === 'employeeRevenue' || board_key === 'employeeOrders' || board_key === 'magnetRanking') {
            // person_id is an employee — get all affiliates managed by this employee, then their referrer IDs
            const affs = await db.all(`SELECT id FROM users WHERE role = 'tkaffiliate' AND status = 'active' AND managed_by_user_id = ?`, [Number(person_id)]);
            for (const aff of affs) {
                referrerIds.push(aff.id);
                const children = await db.all(`SELECT id FROM users WHERE assigned_to_user_id = ? AND role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')`, [aff.id]);
                referrerIds.push(...children.map(c => c.id));
            }
        } else if (board_key === 'teamRevenue') {
            // person_id is a department — get employees in dept, then their affiliates
            const empRows = await db.all(`SELECT id FROM users WHERE department_id = ? AND status = 'active'`, [Number(person_id)]);
            for (const emp of empRows) {
                const affs = await db.all(`SELECT id FROM users WHERE role = 'tkaffiliate' AND status = 'active' AND managed_by_user_id = ?`, [emp.id]);
                for (const aff of affs) {
                    referrerIds.push(aff.id);
                    const children = await db.all(`SELECT id FROM users WHERE assigned_to_user_id = ? AND role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')`, [aff.id]);
                    referrerIds.push(...children.map(c => c.id));
                }
            }
        }
        referrerIds = [...new Set(referrerIds)];

        if (board_key === 'magnetRanking') {
            // Return customers referred
            if (referrerIds.length === 0) return { success: true, type: 'customers', items: [] };
            const rph = referrerIds.map(() => '?').join(',');
            const customers = await db.all(
                `SELECT c.id, c.customer_name, c.phone, c.created_at, c.order_status,
                    u.full_name as referrer_name
                FROM customers c 
                LEFT JOIN users u ON u.id = c.referrer_id
                WHERE c.referrer_id IN (${rph}) AND c.created_at >= ? AND c.created_at <= ?
                ORDER BY c.created_at DESC`,
                [...referrerIds, dateFrom, dateTo]
            );
            return { success: true, type: 'customers', items: customers };
        }

        // Orders detail for revenue/orders boards
        if (referrerIds.length === 0) return { success: true, type: 'orders', items: [] };
        const rph = referrerIds.map(() => '?').join(',');
        
        // Get customers of these referrers
        const custs = await db.all(`SELECT id, customer_name, phone, referrer_id FROM customers WHERE referrer_id IN (${rph})`, referrerIds);
        if (custs.length === 0) return { success: true, type: 'orders', items: [] };

        const custIds = custs.map(c => c.id);
        const custMap = {};
        custs.forEach(c => { custMap[c.id] = c; });

        // Get referrer names
        const refIds = [...new Set(custs.map(c => c.referrer_id).filter(Boolean))];
        const refMap = {};
        if (refIds.length > 0) {
            const refRows = await db.all(`SELECT id, full_name FROM users WHERE id IN (${refIds.map(() => '?').join(',')})`, refIds);
            refRows.forEach(r => { refMap[r.id] = r.full_name; });
        }

        // Get completed orders with items
        const cph = custIds.map(() => '?').join(',');
        const orders = await db.all(
            `SELECT oc.id, oc.order_code, oc.customer_id, oc.created_at, oc.deposit_amount,
                COALESCE(SUM(oi.total), 0) as order_total, COUNT(oi.id) as item_count
            FROM order_codes oc 
            LEFT JOIN order_items oi ON oi.order_code_id = oc.id
            WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'
                AND oc.created_at >= ? AND oc.created_at <= ?
            GROUP BY oc.id
            ORDER BY oc.created_at DESC`,
            [...custIds, dateFrom, dateTo]
        );

        const items = orders.map(o => {
            const cust = custMap[o.customer_id] || {};
            return {
                order_code: o.order_code,
                customer_name: cust.customer_name || '',
                customer_phone: cust.phone || '',
                referrer_name: refMap[cust.referrer_id] || '',
                order_total: Number(o.order_total) || 0,
                deposit_amount: Number(o.deposit_amount) || 0,
                item_count: o.item_count,
                created_at: o.created_at
            };
        });

        return { success: true, type: 'orders', items: items };
    });

    // ===== PRIZES API =====
    // Get prizes for a period
    fastify.get('/api/affiliate/prizes', { preHandler: [authenticate] }, async (request) => {
        const { month, period_type } = request.query;
        const pt = period_type || 'monthly';
        const prizes = await db.all(
            `SELECT * FROM leaderboard_prizes WHERE month = ? AND period_type = ? AND is_active = true ORDER BY board_key, top_rank`,
            [month || '', pt]
        );
        return { success: true, prizes };
    });

    // Save/update prizes (giam_doc only)
    fastify.post('/api/affiliate/prizes', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc được phép' });
        const { month, board_key, prizes, conditions, departments, min_orders, min_revenue, min_count, period_type } = request.body;
        if (!month || !board_key || !prizes) return reply.code(400).send({ error: 'Thiếu thông tin' });
        const pt = period_type || 'monthly';

        // Delete old prizes for this board+period
        await db.run(`DELETE FROM leaderboard_prizes WHERE board_key = ? AND month = ? AND period_type = ?`, [board_key, month, pt]);

        // Insert new
        const condStr = conditions || '';
        const deptStr = departments ? JSON.stringify(departments) : '[]';
        const minOrd = Number(min_orders) || 0;
        const minRev = Number(min_revenue) || 0;
        const minCnt = Number(min_count) || 0;
        for (const p of prizes) {
            if (!p.top_rank || !p.prize_amount) continue;
            await db.run(
                `INSERT INTO leaderboard_prizes (board_key, month, top_rank, prize_amount, prize_description, conditions, departments, is_active, created_by, min_orders, min_revenue, min_count, period_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?, true, ?, ?, ?, ?, ?)`,
                [board_key, month, p.top_rank, p.prize_amount, p.prize_description || '', condStr, deptStr, request.user.id, minOrd, minRev, minCnt, pt]
            );
        }
        return { success: true, message: 'Đã lưu giải thưởng' };
    });

    // Delete all prizes for a board+month
    fastify.delete('/api/affiliate/prizes', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc được phép' });
        const { month, board_key, period_type } = request.query;
        const pt = period_type || 'monthly';
        await db.run(`DELETE FROM leaderboard_prizes WHERE board_key = ? AND month = ? AND period_type = ?`, [board_key, month, pt]);
        return { success: true, message: 'Đã xóa giải thưởng' };
    });

    // ===== PRIZE AWARDS API =====

    // Get all awards for a month (or all months for history)
    fastify.get('/api/affiliate/awards', { preHandler: [authenticate] }, async (request) => {
        const { month, year, period_type } = request.query;
        let query = `SELECT pa.*, u.full_name as awarded_by_name FROM prize_awards pa LEFT JOIN users u ON pa.awarded_by = u.id`;
        let params = [];
        const conditions = [];
        if (month) {
            conditions.push('pa.month = ?');
            params.push(month);
        } else if (year) {
            conditions.push('pa.month LIKE ?');
            params.push(year + '-%');
        }
        if (period_type) {
            conditions.push('pa.period_type = ?');
            params.push(period_type);
        }
        if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
        query += ` ORDER BY pa.month DESC, pa.board_key, pa.top_rank`;
        const awards = await db.all(query, params);
        return { success: true, awards };
    });

    // Check if previous period is fully awarded (for blocking new setup)
    fastify.get('/api/affiliate/awards/check', { preHandler: [authenticate] }, async (request) => {
        const { month, period_type } = request.query; // month = period_value to check
        if (!month) return { success: true, complete: true };
        const pt = period_type || 'monthly';

        // Get all prizes set for that period
        const prizes = await db.all(
            `SELECT DISTINCT board_key, top_rank FROM leaderboard_prizes WHERE month = ? AND period_type = ? AND is_active = true`,
            [month, pt]
        );
        if (prizes.length === 0) return { success: true, complete: true, message: 'Không có giải nào cần trao' };

        // Get all awards for that period
        const awards = await db.all(
            `SELECT board_key, top_rank FROM prize_awards WHERE month = ? AND period_type = ?`,
            [month, pt]
        );

        const awardSet = new Set(awards.map(a => a.board_key + '_' + a.top_rank));
        const missing = prizes.filter(p => !awardSet.has(p.board_key + '_' + p.top_rank));

        return {
            success: true,
            complete: missing.length === 0,
            total: prizes.length,
            awarded: awards.length,
            missing: missing.length,
            missingItems: missing
        };
    });

    // Create award (with photo upload)
    fastify.post('/api/affiliate/awards', { preHandler: [authenticate] }, async (request, reply) => {
        if (!['giam_doc','quan_ly','quan_ly_cap_cao'].includes(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền' });
        }

        const parts = request.parts();
        const fields = {};
        const files = {};

        for await (const part of parts) {
            if (part.type === 'file' && part.file) {
                const chunks = [];
                for await (const chunk of part.file) { chunks.push(chunk); }
                let buffer = Buffer.concat(chunks);
                if (buffer.length > 0) {
                    const { compressImage } = require('../utils/imageCompressor');
                    buffer = await compressImage(buffer, { maxWidth: 1200, quality: 80 });
                    const fs = require('fs');
                    const path = require('path');
                    const dir = path.join(__dirname, '..', 'uploads', 'prizes');
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    const filename = `${part.fieldname}_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
                    fs.writeFileSync(path.join(dir, filename), buffer);
                    files[part.fieldname] = `/uploads/prizes/${filename}`;
                }
            } else {
                fields[part.fieldname] = part.value;
            }
        }

        const { board_key, month, top_rank, winner_type, winner_user_id, winner_team_id, winner_name, prize_amount, prize_description } = fields;
        if (!board_key || !month || !top_rank || !winner_name) {
            return reply.code(400).send({ error: 'Thiếu thông tin bắt buộc' });
        }
        if (!files.photo_winner || !files.photo_certificate) {
            return reply.code(400).send({ error: 'Bắt buộc upload ảnh người nhận giải và ảnh bằng khen' });
        }

        const pt = fields.period_type || 'monthly';

        // Check if already awarded
        const existing = await db.get(
            `SELECT id FROM prize_awards WHERE board_key = ? AND month = ? AND top_rank = ? AND period_type = ?`,
            [board_key, month, parseInt(top_rank), pt]
        );
        if (existing) {
            return reply.code(400).send({ error: 'Giải này đã được trao rồi' });
        }

        await db.run(
            `INSERT INTO prize_awards (board_key, month, top_rank, winner_type, winner_user_id, winner_team_id, winner_name, prize_amount, prize_description, photo_winner, photo_certificate, awarded_by, period_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [board_key, month, parseInt(top_rank), winner_type || 'individual',
             winner_user_id ? parseInt(winner_user_id) : null,
             winner_team_id ? parseInt(winner_team_id) : null,
             winner_name, parseFloat(prize_amount) || 0, prize_description || '',
             files.photo_winner, files.photo_certificate, request.user.id, pt]
        );

        return { success: true, message: 'Đã trao giải thưởng!' };
    });

    // Delete award
    fastify.delete('/api/affiliate/awards/:id', { preHandler: [authenticate] }, async (request, reply) => {
        if (!['giam_doc','quan_ly','quan_ly_cap_cao'].includes(request.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền' });
        }
        const id = parseInt(request.params.id);
        await db.run(`DELETE FROM prize_awards WHERE id = ?`, [id]);
        return { success: true, message: 'Đã xóa giải thưởng' };
    });

    // Get users by department IDs (for winner selection) - admin only
    fastify.get('/api/affiliate/awards/users-by-dept', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request) => {
        const { dept_ids } = request.query; // comma-separated
        if (!dept_ids) return { users: [] };
        const ids = dept_ids.split(',').map(d => parseInt(d)).filter(d => d);
        if (ids.length === 0) return { users: [] };
        const placeholders = ids.map(() => '?').join(',');
        const users = await db.all(
            `SELECT id, full_name, department_id, role FROM users WHERE department_id IN (${placeholders}) AND status = 'active' ORDER BY full_name`,
            ids
        );
        return { users };
    });

    // ===== PRIZE CELEBRATION POPUP API =====

    // Get pending popup awards for current user
    fastify.get('/api/affiliate/awards/popup', { preHandler: [authenticate] }, async (request) => {
        // Block affiliate accounts from seeing prize popups
        const AFFILIATE_ROLES = ['tkaffiliate', 'hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];
        if (AFFILIATE_ROLES.includes(request.user.role)) {
            return { awards: [], popup: null };
        }
        const userId = request.user.id;

        // Get settings from app_config
        const startHourRow = await db.get("SELECT value FROM app_config WHERE key = 'prize_popup_start_hour'");
        const startMinuteRow = await db.get("SELECT value FROM app_config WHERE key = 'prize_popup_start_minute'");
        const daysRow = await db.get("SELECT value FROM app_config WHERE key = 'prize_popup_days'");
        const intervalRow = await db.get("SELECT value FROM app_config WHERE key = 'prize_popup_interval_minutes'");

        const startHour = startHourRow ? parseInt(startHourRow.value) : 10;
        const startMinute = startMinuteRow ? parseInt(startMinuteRow.value) : 0;
        const days = daysRow ? parseInt(daysRow.value) : 3;
        const intervalMinutes = intervalRow ? parseInt(intervalRow.value) : 10;

        // Get all awards that were awarded in the last N+1 days (they show starting next day)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (days + 1));
        const cutoffStr = cutoffDate.toISOString();

        const awards = await db.all(
            `SELECT pa.*, u.full_name as awarded_by_name
             FROM prize_awards pa
             LEFT JOIN users u ON pa.awarded_by = u.id
             WHERE pa.awarded_at >= ?
             ORDER BY pa.awarded_at ASC, pa.top_rank ASC`,
            [cutoffStr]
        );

        if (awards.length === 0) return { awards: [], popup: null };

        // Filter: exclude awards where user has commented
        const commented = await db.all(
            `SELECT award_id FROM prize_award_views WHERE user_id = ? AND has_commented = true`,
            [userId]
        );
        const commentedSet = new Set(commented.map(c => c.award_id));

        // Filter awards: must be at least 1 day after awarded_at, within N days window, not commented
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const totalMinutesSinceStart = (currentHour * 60 + currentMinutes) - (startHour * 60 + startMinute);

        const eligibleAwards = awards.filter(a => {
            // Must be at least 1 day after award date
            const awardedDate = new Date(a.awarded_at);
            const startDate = new Date(awardedDate);
            startDate.setDate(startDate.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + days);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Must be within the display window
            if (today < startDate || today >= endDate) return false;

            // Exclude if user already commented
            if (commentedSet.has(a.id)) return false;

            return true;
        });

        if (eligibleAwards.length === 0) return { awards: [], popup: null };

        // Determine which award to show based on time interval
        // Only show if current time >= startHour
        if (totalMinutesSinceStart < 0) return { awards: eligibleAwards, popup: null };

        const awardIndex = Math.floor(totalMinutesSinceStart / intervalMinutes);
        if (awardIndex >= eligibleAwards.length) {
            // All awards have been shown for today, pick the last one if user hasn't seen any
            const unseen = [];
            for (const a of eligibleAwards) {
                const viewed = await db.get(
                    `SELECT id FROM prize_award_views WHERE award_id = ? AND user_id = ?`,
                    [a.id, userId]
                );
                if (!viewed) unseen.push(a);
            }
            if (unseen.length > 0) {
                const comments = await db.all(
                    `SELECT * FROM prize_award_comments WHERE award_id = ? ORDER BY created_at ASC`,
                    [unseen[0].id]
                );
                return { awards: eligibleAwards, popup: { ...unseen[0], comments } };
            }
            return { awards: eligibleAwards, popup: null };
        }

        const currentAward = eligibleAwards[awardIndex];

        // Check if user already viewed this specific award today
        const todayStr = new Date().toISOString().split('T')[0];
        const viewedToday = await db.get(
            `SELECT id FROM prize_award_views WHERE award_id = ? AND user_id = ? AND CAST(viewed_at AS DATE) = ?`,
            [currentAward.id, userId, todayStr]
        );

        if (viewedToday) return { awards: eligibleAwards, popup: null };

        // Get comments for this award
        const comments = await db.all(
            `SELECT * FROM prize_award_comments WHERE award_id = ? ORDER BY created_at ASC`,
            [currentAward.id]
        );

        return { awards: eligibleAwards, popup: { ...currentAward, comments } };
    });

    // Post a congratulation comment
    fastify.post('/api/affiliate/awards/:id/comment', { preHandler: [authenticate] }, async (request, reply) => {
        const awardId = parseInt(request.params.id);
        const { comment_text } = request.body || {};
        if (!comment_text || !comment_text.trim()) {
            return reply.code(400).send({ error: 'Vui lòng nhập lời chúc mừng' });
        }

        await db.run(
            `INSERT INTO prize_award_comments (award_id, user_id, user_name, comment_text) VALUES (?, ?, ?, ?)`,
            [awardId, request.user.id, request.user.full_name || request.user.username, comment_text.trim()]
        );

        // Mark as commented in views
        await db.run(
            `INSERT INTO prize_award_views (award_id, user_id, has_commented) VALUES (?, ?, true)
             ON CONFLICT(award_id, user_id) DO UPDATE SET has_commented = true`,
            [awardId, request.user.id]
        );

        return { success: true, message: 'Đã gửi lời chúc mừng! 🎉' };
    });

    // Get comments for an award
    fastify.get('/api/affiliate/awards/:id/comments', { preHandler: [authenticate] }, async (request) => {
        const awardId = parseInt(request.params.id);
        const comments = await db.all(
            `SELECT * FROM prize_award_comments WHERE award_id = ? ORDER BY created_at ASC`,
            [awardId]
        );
        return { comments };
    });

    // Mark popup as viewed (without comment — will still show next day)
    fastify.post('/api/affiliate/awards/:id/view', { preHandler: [authenticate] }, async (request) => {
        const awardId = parseInt(request.params.id);
        await db.run(
            `INSERT INTO prize_award_views (award_id, user_id, has_commented) VALUES (?, ?, false)
             ON CONFLICT(award_id, user_id) DO UPDATE SET viewed_at = NOW()`,
            [awardId, request.user.id]
        );
        return { success: true };
    });

    // ========== THỐNG KÊ AFFILIATE THEO TỔ CHỨC (cho GĐ) ==========
    fastify.get('/api/affiliate/org-stats', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { from, to } = request.query;

        // 1. Lấy tất cả affiliate + NV quản lý + phòng ban
        const affiliates = await db.all(`
            SELECT u.id, u.full_name, u.phone, u.role, u.status, u.created_at,
                   u.managed_by_user_id,
                   mgr.full_name as manager_name, mgr.role as manager_role, mgr.department_id as manager_dept_id,
                   p.full_name as parent_affiliate_name
            FROM users u
            LEFT JOIN users mgr ON mgr.id = u.managed_by_user_id
            LEFT JOIN users p ON p.id = u.assigned_to_user_id
            WHERE u.role = 'tkaffiliate'
            ORDER BY u.created_at DESC
        `);

        // 2. Lấy stats KH + doanh số cho mỗi affiliate
        const affIds = affiliates.map(a => a.id);
        let custMap = {}, refRevenueMap = {};
        if (affIds.length > 0) {
            const ph = affIds.map(() => '?').join(',');
            let custDateFilter = '';
            const custParams = [...affIds];
            if (from) { custDateFilter += ' AND c.created_at >= ?'; custParams.push(from + ' 00:00:00'); }
            if (to) { custDateFilter += ' AND c.created_at <= ?'; custParams.push(to + ' 23:59:59'); }
            const custRows = await db.all(`
                SELECT c.referrer_id,
                       COUNT(*) as total_customers,
                       COUNT(CASE WHEN c.order_status IN ('chot_don','san_xuat','giao_hang','hoan_thanh') THEN 1 END) as closed_count
                FROM customers c WHERE c.referrer_id IN (${ph})${custDateFilter} GROUP BY c.referrer_id
            `, custParams);
            custRows.forEach(r => { custMap[r.referrer_id] = { total_customers: Number(r.total_customers), closed_count: Number(r.closed_count) }; });

            const customersByRef = await db.all(`SELECT id, referrer_id FROM customers WHERE referrer_id IN (${ph})`, affIds);
            const allCustIds = customersByRef.map(c => c.id);
            if (allCustIds.length > 0) {
                const cph = allCustIds.map(() => '?').join(',');
                let revDateFilter = '';
                const revParams = [...allCustIds];
                if (from) { revDateFilter += ' AND oc.created_at >= ?'; revParams.push(from + ' 00:00:00'); }
                if (to) { revDateFilter += ' AND oc.created_at <= ?'; revParams.push(to + ' 23:59:59'); }
                const revRows = await db.all(`
                    SELECT oc.customer_id, COALESCE(SUM(oi.total), 0) as revenue
                    FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                    WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'${revDateFilter}
                    GROUP BY oc.customer_id
                `, revParams);
                const revenueMap = {};
                revRows.forEach(r => { revenueMap[r.customer_id] = Number(r.revenue); });
                customersByRef.forEach(c => {
                    const rev = revenueMap[c.id] || 0;
                    if (rev > 0) refRevenueMap[c.referrer_id] = (refRevenueMap[c.referrer_id] || 0) + rev;
                });
            }
        }

        // Gắn stats vào mỗi affiliate
        affiliates.forEach(a => {
            const cs = custMap[a.id] || { total_customers: 0, closed_count: 0 };
            a.total_customers = cs.total_customers;
            a.closed_count = cs.closed_count;
            a.total_revenue = refRevenueMap[a.id] || 0;
        });

        // 3. Lấy cấu trúc phòng ban
        const depts = await db.all(`SELECT id, name, parent_id, display_order FROM departments WHERE status = 'active' ORDER BY display_order, name`);
        const deptMap = {};
        depts.forEach(d => { deptMap[d.id] = d; });

        // 4. Group affiliates theo employee
        const empMap = {};
        affiliates.forEach(a => {
            const empId = a.managed_by_user_id || 0;
            if (!empMap[empId]) {
                empMap[empId] = {
                    id: empId,
                    name: a.manager_name || 'Chưa gán NV',
                    role: a.manager_role || '',
                    dept_id: a.manager_dept_id || null,
                    affiliates: []
                };
            }
            empMap[empId].affiliates.push(a);
        });

        // 5. Thêm NV ở PHÒNG KD trực tiếp (không manage affiliate) nhưng có role quản lý
        const mgrRoles = ['quan_ly', 'quan_ly_cap_cao'];
        // Lấy tất cả NV trong PHÒNG KINH DOANH tree
        const kdDept = depts.find(d => d.name && d.name.includes('KINH DOANH'));
        if (kdDept) {
            const kdChildIds = depts.filter(d => d.parent_id === kdDept.id).map(d => d.id);
            const allKdDeptIds = [kdDept.id, ...kdChildIds];
            const phStr = allKdDeptIds.map(() => '?').join(',');
            const allStaff = await db.all(`SELECT id, full_name, role, department_id FROM users WHERE department_id IN (${phStr}) AND status = 'active' AND role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')`, allKdDeptIds);
            // Add staff not yet in empMap
            allStaff.forEach(s => {
                if (!empMap[s.id]) {
                    empMap[s.id] = { id: s.id, name: s.full_name, role: s.role, dept_id: s.department_id, affiliates: [] };
                }
            });
        }

        // 5b. Group employees theo team/phòng ban
        const orgTree = {};
        Object.values(empMap).forEach(emp => {
            let teamId = emp.dept_id;
            let teamName = 'Chưa xác định';
            let parentId = null;

            if (teamId && deptMap[teamId]) {
                const team = deptMap[teamId];
                teamName = team.name;
                parentId = team.parent_id;
            }

            // Structure: HE THONG(10) > PHONG KD(1) > TEAM(*)
            let phongId, phongName, isPhongLevel = false;

            if (kdDept && teamId === kdDept.id) {
                // NV ở trực tiếp PHÒNG KD (quanly1)
                phongId = kdDept.id;
                phongName = kdDept.name;
                isPhongLevel = true;
            } else if (kdDept && parentId === kdDept.id) {
                // NV ở sub-team của PHÒNG KD
                phongId = kdDept.id;
                phongName = kdDept.name;
            } else if (parentId && deptMap[parentId]) {
                phongId = parentId;
                phongName = deptMap[parentId].name;
            } else {
                phongId = teamId || 0;
                phongName = teamName;
                isPhongLevel = true;
            }

            if (!orgTree[phongId]) {
                orgTree[phongId] = { id: phongId, name: phongName, teams: {}, phongEmployees: [] };
            }

            if (isPhongLevel) {
                // NV cấp phòng (quanly1) → phongEmployees
                orgTree[phongId].phongEmployees.push(emp);
            } else {
                // NV trong sub-team
                if (!orgTree[phongId].teams[teamId]) {
                    orgTree[phongId].teams[teamId] = { id: teamId, name: teamName, employees: [] };
                }
                orgTree[phongId].teams[teamId].employees.push(emp);
            }
        });

        // 6. Build response with computed stats at each level
        const departments = Object.values(orgTree).map(phong => {
            // Phong-level employees (quanly at phong level)
            const phongEmployees = (phong.phongEmployees || []).map(emp => {
                const s = { affiliates: emp.affiliates.length, customers: 0, revenue: 0, closed: 0 };
                emp.affiliates.forEach(a => { s.customers += a.total_customers; s.revenue += a.total_revenue; s.closed += a.closed_count; });
                return { id: emp.id, name: emp.name, role: emp.role, stats: s, affiliates: emp.affiliates };
            });
            phongEmployees.sort((a, b) => b.stats.revenue - a.stats.revenue);

            const teams = Object.values(phong.teams).map(team => {
                const employees = team.employees.map(emp => {
                    const s = { affiliates: emp.affiliates.length, customers: 0, revenue: 0, closed: 0 };
                    emp.affiliates.forEach(a => { s.customers += a.total_customers; s.revenue += a.total_revenue; s.closed += a.closed_count; });
                    return { id: emp.id, name: emp.name, role: emp.role, stats: s, affiliates: emp.affiliates };
                });
                employees.sort((a, b) => b.stats.revenue - a.stats.revenue);
                const ts = { affiliates: 0, customers: 0, revenue: 0, closed: 0 };
                employees.forEach(e => { ts.affiliates += e.stats.affiliates; ts.customers += e.stats.customers; ts.revenue += e.stats.revenue; ts.closed += e.stats.closed; });
                return { id: team.id, name: team.name, stats: ts, employees };
            });
            teams.sort((a, b) => b.stats.revenue - a.stats.revenue);
            const ps = { affiliates: 0, customers: 0, revenue: 0, closed: 0 };
            teams.forEach(t => { ps.affiliates += t.stats.affiliates; ps.customers += t.stats.customers; ps.revenue += t.stats.revenue; ps.closed += t.stats.closed; });
            phongEmployees.forEach(e => { ps.affiliates += e.stats.affiliates; ps.customers += e.stats.customers; ps.revenue += e.stats.revenue; ps.closed += e.stats.closed; });
            return { id: phong.id, name: phong.name, stats: ps, teams, phongEmployees };
        });
        departments.sort((a, b) => b.stats.revenue - a.stats.revenue);

        return { success: true, departments };
    });

    // ========== QUẢN LÝ HỆ THỐNG AFFILIATE (cho tkaffiliate xem con) ==========
    fastify.get('/api/affiliate/my-system', { preHandler: [authenticate, requireRole('tkaffiliate', 'giam_doc')] }, async (request, reply) => {
        const userId = request.user.id;


        // ★ GOD VIEW: Giám Đốc xem toàn bộ hệ thống affiliate
        if (request.user.role === 'giam_doc') {
            const { managerId, from, to } = request.query;

            // Build dynamic WHERE clause
            let whereClauses = ["u.role = 'tkaffiliate'"];
            let whereParams = [];
            if (managerId) { whereClauses.push("u.managed_by_user_id = ?"); whereParams.push(Number(managerId)); }
            if (from) { whereClauses.push("u.created_at >= ?"); whereParams.push(from + ' 00:00:00'); }
            if (to) { whereClauses.push("u.created_at <= ?"); whereParams.push(to + ' 23:59:59'); }

            const children = await db.all(`
                SELECT u.id, u.full_name, u.phone, u.role, u.status, u.created_at,
                       ct.name as tier_name, ct.percentage as tier_percentage,
                       p.full_name as parent_affiliate_name,
                       mgr.full_name as manager_name
                FROM users u
                LEFT JOIN commission_tiers ct ON ct.id = u.commission_tier_id
                LEFT JOIN users p ON p.id = u.assigned_to_user_id
                LEFT JOIN users mgr ON mgr.id = u.managed_by_user_id
                WHERE ${whereClauses.join(' AND ')}
                ORDER BY u.created_at DESC
            `, whereParams);

            const allIds = children.map(c => c.id);
            let totalCustomers = 0, totalRevenue = 0, closedCount = 0;

            if (allIds.length > 0) {
                const ph = allIds.map(() => '?').join(',');
                const custRows = await db.all(`
                    SELECT c.referrer_id,
                           COUNT(*) as total_customers,
                           COUNT(CASE WHEN c.order_status IN ('chot_don','san_xuat','giao_hang','hoan_thanh') THEN 1 END) as closed_count
                    FROM customers c WHERE c.referrer_id IN (${ph})${from ? ' AND c.created_at >= \'' + from + ' 00:00:00\'' : ''}${to ? ' AND c.created_at <= \'' + to + ' 23:59:59\'' : ''} GROUP BY c.referrer_id
                `, allIds);
                const custMap = {};
                custRows.forEach(r => { custMap[r.referrer_id] = { total_customers: Number(r.total_customers), closed_count: Number(r.closed_count) }; });

                const customersByRef = await db.all(`SELECT id, referrer_id FROM customers WHERE referrer_id IN (${ph})`, allIds);
                const allCustIds = customersByRef.map(c => c.id);
                let revenueMap = {};
                if (allCustIds.length > 0) {
                    const cph = allCustIds.map(() => '?').join(',');
                    const revRows = await db.all(`
                        SELECT oc.customer_id, COALESCE(SUM(oi.total), 0) as revenue
                        FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                        WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'
                        GROUP BY oc.customer_id
                    `, allCustIds);
                    revRows.forEach(r => { revenueMap[r.customer_id] = Number(r.revenue); });
                }
                const refRevenueMap = {};
                customersByRef.forEach(c => { const rev = revenueMap[c.id] || 0; if (rev > 0) refRevenueMap[c.referrer_id] = (refRevenueMap[c.referrer_id] || 0) + rev; });

                children.forEach(child => {
                    const cs = custMap[child.id] || { total_customers: 0, closed_count: 0 };
                    child.total_customers = cs.total_customers;
                    child.closed_count = cs.closed_count;
                    child.total_revenue = refRevenueMap[child.id] || 0;
                    totalCustomers += cs.total_customers;
                    totalRevenue += child.total_revenue;
                    closedCount += cs.closed_count;
                });
            }

            return {
                success: true, children,
                selfStats: { total_customers: 0, closed_count: 0, total_revenue: 0 },
                stats: { totalChildren: children.length, totalCustomers, totalRevenue, closedCount }
            };
        }

        // Lấy tất cả con affiliate (managed_by_user_id = userId)
        const children = await db.all(`
            SELECT u.id, u.full_name, u.phone, u.role, u.status, u.created_at,
                   ct.name as tier_name, ct.percentage as tier_percentage
            FROM users u
            LEFT JOIN commission_tiers ct ON ct.id = u.commission_tier_id
            WHERE u.assigned_to_user_id = ?
            AND u.role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')
            ORDER BY u.created_at DESC
        `, [userId]);

        if (children.length === 0) {
            // Vẫn tính stats bản thân dù không có con
            const selfCust = await db.all(`
                SELECT COUNT(*) as total_customers,
                       COUNT(CASE WHEN order_status IN ('chot_don','san_xuat','giao_hang','hoan_thanh') THEN 1 END) as closed_count
                FROM customers WHERE referrer_id = ?
            `, [userId]);
            const sc = selfCust[0] || { total_customers: 0, closed_count: 0 };

            // Self revenue
            const selfCustIds = await db.all('SELECT id FROM customers WHERE referrer_id = ?', [userId]);
            let selfRevenue = 0;
            if (selfCustIds.length > 0) {
                const scph = selfCustIds.map(() => '?').join(',');
                const revRow = await db.get(`
                    SELECT COALESCE(SUM(oi.total), 0) as revenue
                    FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                    WHERE oc.customer_id IN (${scph}) AND oc.status = 'completed'
                `, selfCustIds.map(c => c.id));
                selfRevenue = Number(revRow?.revenue) || 0;
            }

            return {
                success: true, children: [],
                selfStats: { total_customers: Number(sc.total_customers), closed_count: Number(sc.closed_count), total_revenue: selfRevenue },
                stats: { totalChildren: 0, totalCustomers: 0, totalRevenue: 0, closedCount: 0 }
            };
        }

        const childIds = children.map(c => c.id);
        const allIds = [userId, ...childIds]; // bao gồm cả bản thân
        const ph = allIds.map(() => '?').join(',');

        // Đếm KH giới thiệu theo từng referrer
        const custRows = await db.all(`
            SELECT c.referrer_id,
                   COUNT(*) as total_customers,
                   COUNT(CASE WHEN c.order_status IN ('chot_don','san_xuat','giao_hang','hoan_thanh') THEN 1 END) as closed_count
            FROM customers c
            WHERE c.referrer_id IN (${ph})
            GROUP BY c.referrer_id
        `, allIds);

        const custMap = {};
        custRows.forEach(r => {
            custMap[r.referrer_id] = { total_customers: Number(r.total_customers), closed_count: Number(r.closed_count) };
        });

        // Lấy doanh số (completed orders) theo từng referrer
        const customersByRef = await db.all(`SELECT id, referrer_id FROM customers WHERE referrer_id IN (${ph})`, allIds);
        const allCustIds = customersByRef.map(c => c.id);

        let revenueMap = {};
        if (allCustIds.length > 0) {
            const cph = allCustIds.map(() => '?').join(',');
            const revRows = await db.all(`
                SELECT oc.customer_id, COALESCE(SUM(oi.total), 0) as revenue
                FROM order_codes oc
                LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'
                GROUP BY oc.customer_id
            `, allCustIds);
            revRows.forEach(r => { revenueMap[r.customer_id] = Number(r.revenue); });
        }

        // Tính doanh số theo referrer
        const refRevenueMap = {};
        customersByRef.forEach(c => {
            const rev = revenueMap[c.id] || 0;
            if (rev > 0) {
                refRevenueMap[c.referrer_id] = (refRevenueMap[c.referrer_id] || 0) + rev;
            }
        });

        // Gắn stats vào children
        let totalCustomers = 0, totalRevenue = 0, closedCount = 0;
        children.forEach(child => {
            const cs = custMap[child.id] || { total_customers: 0, closed_count: 0 };
            child.total_customers = cs.total_customers;
            child.closed_count = cs.closed_count;
            child.total_revenue = refRevenueMap[child.id] || 0;
            totalCustomers += cs.total_customers;
            totalRevenue += child.total_revenue;
            closedCount += cs.closed_count;
        });

        // Stats bản thân (self)
        const selfStats = custMap[userId] || { total_customers: 0, closed_count: 0 };
        const selfRevenue = refRevenueMap[userId] || 0;

        return {
            success: true,
            children,
            selfStats: {
                total_customers: selfStats.total_customers,
                closed_count: selfStats.closed_count,
                total_revenue: selfRevenue
            },
            stats: {
                totalChildren: children.length,
                totalCustomers: totalCustomers,
                totalRevenue: totalRevenue,
                closedCount: closedCount
            }
        };
    });

    // ========== COMMISSION CAP ALERT (Giám Đốc only) ==========
    // Scans completed orders in last 30 days, flags any with total commission > 15%
    fastify.get('/api/admin/commission-cap-check', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        if (user.role !== 'giam_doc') return { success: false, error: 'Unauthorized' };

        const CAP_PERCENT = 15; // Maximum allowed commission %
        const DAYS = 30;

        // Get all completed orders in last N days
        const orders = await db.all(`
            SELECT oc.id, oc.order_code, oc.status, oc.created_at, oc.customer_id,
                   COALESCE(SUM(oi.total), 0) as revenue
            FROM order_codes oc
            LEFT JOIN order_items oi ON oi.order_code_id = oc.id
            WHERE oc.status = 'completed'
            AND oc.created_at >= NOW() - INTERVAL '${DAYS} days'
            GROUP BY oc.id, oc.order_code, oc.status, oc.created_at, oc.customer_id
            HAVING COALESCE(SUM(oi.total), 0) > 0
            ORDER BY oc.created_at DESC
        `);

        if (orders.length === 0) return { success: true, alerts: [], total: 0 };

        // Get all affiliate users with their source_customer_id and assigned_to
        const affUsers = await db.all(`
            SELECT id, username, full_name, source_customer_id, assigned_to_user_id, created_at,
                   commission_tier_id
            FROM users WHERE role = 'tkaffiliate' AND status = 'active'
        `);

        // Get all commission tiers
        const tiers = await db.all('SELECT id, percentage, parent_percentage FROM commission_tiers');
        const tierMap = {};
        tiers.forEach(t => { tierMap[t.id] = t; });

        // Get all customers with referrer_id
        const custIds = [...new Set(orders.map(o => o.customer_id))];
        const cph = custIds.map(() => '?').join(',');
        const customers = custIds.length > 0 
            ? await db.all(`SELECT id, customer_name, referrer_id FROM customers WHERE id IN (${cph})`, custIds)
            : [];
        const custMap = {};
        customers.forEach(c => { custMap[c.id] = c; });

        // Build affiliate user maps
        const affByUserId = {};
        const affBySourceCustId = {};
        affUsers.forEach(u => {
            affByUserId[u.id] = u;
            if (u.source_customer_id) affBySourceCustId[u.source_customer_id] = u;
        });

        const alerts = [];

        // ★ FIRST-ORDER-ONLY: Load cutoff + first order map
        const _fooCutoff7 = await _getCommissionCutoffDate(db);
        const _fooFirstMap7 = await _getFirstOrderMap(db, custIds);

        for (const order of orders) {
            const cust = custMap[order.customer_id];
            if (!cust) continue;

            const revenue = Number(order.revenue);
            if (revenue <= 0) continue;

            // ★ FIRST-ORDER-ONLY: skip repeat orders after cutoff (no commission = no cap issue)
            const _fooAC7 = _fooCutoff7 && new Date(order.created_at) >= _fooCutoff7;
            const _fooIsFirst7 = _fooFirstMap7[order.customer_id] === order.id;
            if (_fooAC7 && !_fooIsFirst7) {
                // Check if self-order only — self still gets commission so still check cap
                const selfAffCheck = affBySourceCustId[order.customer_id];
                if (!selfAffCheck) continue; // No self-affiliate = no commission = skip
            }

            let totalCommPercent = 0;
            const commDetails = [];

            // Find who earns commission on this order
            // 1. Self-commission: if the customer IS the affiliate (source_customer_id match)
            const selfAff = affBySourceCustId[order.customer_id];
            if (selfAff) {
                const tier = tierMap[selfAff.commission_tier_id];
                const rate = tier ? (tier.percentage || 10) : 10;
                // Check if order is after TK creation
                if (new Date(order.created_at) >= new Date(selfAff.created_at)) {
                    totalCommPercent += rate;
                    commDetails.push({ name: selfAff.full_name, username: selfAff.username, type: 'Tự mua', rate });
                }
            }

            // 2. Direct referrer commission
            if (cust.referrer_id) {
                const refAff = affByUserId[cust.referrer_id];
                if (refAff && !(selfAff && selfAff.id === refAff.id)) {
                    // Not the same as self
                    const tier = tierMap[refAff.commission_tier_id];
                    const rate = tier ? (tier.percentage || 10) : 10;
                    totalCommPercent += rate;
                    commDetails.push({ name: refAff.full_name, username: refAff.username, type: 'Trực tiếp', rate });

                    // 3. Parent (indirect) commission
                    if (refAff.assigned_to_user_id) {
                        const parentAff = affByUserId[refAff.assigned_to_user_id];
                        if (parentAff) {
                            const parentTier = tierMap[parentAff.commission_tier_id];
                            const parentRate = parentTier ? (parentTier.parent_percentage || 5) : 5;
                            totalCommPercent += parentRate;
                            commDetails.push({ name: parentAff.full_name, username: parentAff.username, type: 'Gián tiếp', rate: parentRate });
                        }
                    }
                }
            }

            if (totalCommPercent > CAP_PERCENT) {
                const totalCommAmount = Math.round(revenue * totalCommPercent / 100);
                alerts.push({
                    order_code: order.order_code,
                    order_date: order.created_at,
                    customer_name: cust.customer_name,
                    revenue,
                    total_percent: totalCommPercent,
                    total_amount: totalCommAmount,
                    cap_percent: CAP_PERCENT,
                    excess_percent: totalCommPercent - CAP_PERCENT,
                    excess_amount: Math.round(revenue * (totalCommPercent - CAP_PERCENT) / 100),
                    details: commDetails
                });
            }
        }

        return { success: true, alerts, total: alerts.length };
    });
}

module.exports = affiliateRoutes;
