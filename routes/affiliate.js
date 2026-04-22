const { authenticate, requireRole } = require('../middleware/auth');

const AFFILIATE_ROLES = ['hoa_hong', 'ctv', 'nuoi_duong', 'sinh_vien'];

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

        if (from) { affQuery += ` AND u.created_at >= ?`; affParams.push(from); }
        if (to) { affQuery += ` AND u.created_at <= ?`; affParams.push(to + ' 23:59:59'); }
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
        
        // Get user's commission tier rates from DB (NOT from JWT which doesn't have commission_tier_id)
        let directRate = 0.10, parentRate = 0.05;
        const freshUser = await db.get('SELECT commission_tier_id FROM users WHERE id = ?', [user.id]);
        if (freshUser && freshUser.commission_tier_id) {
            const tier = await db.get('SELECT percentage, parent_percentage FROM commission_tiers WHERE id = ?', [freshUser.commission_tier_id]);
            if (tier) {
                directRate = (tier.percentage || 10) / 100;
                parentRate = (tier.parent_percentage || 5) / 100;
            }
        }

        // Get child affiliate IDs via assigned_to_user_id (Gán cho TK Affiliate nào?)
        const childAffiliates = await db.all(
            `SELECT id, full_name FROM users
             WHERE assigned_to_user_id = ?
             AND role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')`,
            [user.id]
        );
        const childIds = childAffiliates.map(a => a.id);
        const allIds = [user.id, ...childIds];
        const ph = allIds.map(() => '?').join(',');

        // Get customers referred by these affiliates
        const customers = await db.all(`
            SELECT c.id, c.customer_name, c.phone, c.order_status, c.referrer_id, c.created_at, c.appointment_date
            FROM customers c
            WHERE c.referrer_id IN (${ph})
            ORDER BY c.created_at DESC
        `, allIds);

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
                ORDER BY customer_id, created_at DESC
            `, customerIds);
            logs.forEach(l => { consultMap[l.customer_id] = l; });
        }

        let totalCommission = 0;
        const items = customers.map(c => {
            const isDirect = c.referrer_id === user.id;
            const rate = isDirect ? directRate : parentRate;
            const completedRevenue = completedRevenueMap[c.id] || 0;
            const commission = completedRevenue > 0 ? Math.round(completedRevenue * rate) : 0;
            totalCommission += commission;
            
            // Mask phone for child referrals
            let displayPhone = c.phone;
            if (!isDirect && c.phone && c.phone.length >= 4) {
                displayPhone = c.phone.substring(0, 2) + 'xx xxx xx' + c.phone.substring(c.phone.length - 1);
            }

            const lastLog = consultMap[c.id] || null;
            const lastContactDate = lastLog?.created_at || c.created_at;
            
            return {
                ...c,
                phone: displayPhone,
                is_direct: isDirect,
                rate: rate * 100,
                total_revenue: totalRevenueMap[c.id] || 0,
                completed_revenue: completedRevenue,
                commission,
                referrer_name: isDirect ? 'Trực tiếp' : (childAffiliates.find(a => a.id === c.referrer_id)?.full_name || 'Con'),
                last_log_type: lastLog?.log_type || null,
                last_log_content: lastLog?.content || null,
                last_contact_date: lastContactDate
            };
        });

        // Sort by last_contact_date DESC (most recent first)
        items.sort((a, b) => new Date(b.last_contact_date) - new Date(a.last_contact_date));

        // Build referrer names list for filter dropdown
        const referrerNames = [...new Set(items.map(i => i.referrer_name))];

        return { success: true, items, totalCommission, referrerNames };
    });

    // Auto-calculated balance for affiliate withdrawal
    fastify.get('/api/affiliate/balance', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        
        // Calculate total commission (reuse commission logic)
        let directRate = 0.10, parentRate = 0.05;
        const freshUser = await db.get('SELECT commission_tier_id, bank_name, bank_account, bank_holder, full_name FROM users WHERE id = ?', [user.id]);
        if (freshUser && freshUser.commission_tier_id) {
            const tier = await db.get('SELECT percentage, parent_percentage FROM commission_tiers WHERE id = ?', [freshUser.commission_tier_id]);
            if (tier) {
                directRate = (tier.percentage || 10) / 100;
                parentRate = (tier.parent_percentage || 5) / 100;
            }
        }

        // Get child affiliates
        const childAffiliates = await db.all(
            `SELECT id FROM users WHERE assigned_to_user_id = ? AND role IN ('hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate')`,
            [user.id]
        );
        const childIds = childAffiliates.map(a => a.id);
        const allIds = [user.id, ...childIds];
        const ph = allIds.map(() => '?').join(',');

        // Get customers
        const customers = await db.all(`SELECT c.id, c.referrer_id FROM customers c WHERE c.referrer_id IN (${ph})`, allIds);
        const customerIds = customers.map(c => c.id);

        // Get completed revenue
        let totalCommission = 0;
        if (customerIds.length > 0) {
            const cph = customerIds.map(() => '?').join(',');
            const revenueRows = await db.all(`
                SELECT oc.customer_id, COALESCE(SUM(oi.total), 0) as completed_revenue
                FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'
                GROUP BY oc.customer_id
            `, customerIds);
            revenueRows.forEach(r => {
                const cust = customers.find(c => c.id === r.customer_id);
                const isDirect = cust && cust.referrer_id === user.id;
                const rate = isDirect ? directRate : parentRate;
                totalCommission += Math.round(r.completed_revenue * rate);
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
            for (const aff of affiliates) {
                const tier = aff.commission_tier_id ? tierMap[aff.commission_tier_id] : null;
                const directRate = tier ? (tier.percentage || 10) / 100 : 0.10;
                const parentRate = tier ? (tier.parent_percentage || 5) / 100 : 0.05;

                const childIds = allChildren.filter(c => c.assigned_to_user_id === aff.id).map(c => c.id);
                const allIds = [aff.id, ...childIds];
                const ph = allIds.map(() => '?').join(',');

                const customers = await db.all(`SELECT c.id, c.referrer_id FROM customers c WHERE c.referrer_id IN (${ph})`, allIds);
                const customerIds = customers.map(c => c.id);

                let totalCommission = 0;
                let affFilteredCommission = 0;
                if (customerIds.length > 0) {
                    const cph = customerIds.map(() => '?').join(',');
                    // All-time commission
                    const revenueRows = await db.all(`
                        SELECT oc.customer_id, COALESCE(SUM(oi.total), 0) as completed_revenue
                        FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                        WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'
                        GROUP BY oc.customer_id
                    `, customerIds);
                    revenueRows.forEach(r => {
                        const cust = customers.find(c => c.id === r.customer_id);
                        const isDirect = cust && cust.referrer_id === aff.id;
                        totalCommission += Math.round(r.completed_revenue * (isDirect ? directRate : parentRate));
                    });

                    // Filtered commission by date
                    if (dateFrom && dateTo) {
                        const filteredRows = await db.all(`
                            SELECT oc.customer_id, COALESCE(SUM(oi.total), 0) as completed_revenue
                            FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                            WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'
                            AND oc.created_at >= ? AND oc.created_at <= ?
                            GROUP BY oc.customer_id
                        `, [...customerIds, dateFrom, dateTo + ' 23:59:59']);
                        filteredRows.forEach(r => {
                            const cust = customers.find(c => c.id === r.customer_id);
                            const isDirect = cust && cust.referrer_id === aff.id;
                            affFilteredCommission += Math.round(r.completed_revenue * (isDirect ? directRate : parentRate));
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

        const customers = await db.all(`SELECT c.id, c.customer_name, c.phone, c.referrer_id, c.assigned_to_id FROM customers c WHERE c.referrer_id IN (${ph})`, allIds);
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
            const cph = customerIds.map(() => '?').join(',');
            const rows = await db.all(`
                SELECT oc.id, oc.order_code, oc.customer_id, oc.status, oc.created_at,
                       COALESCE(SUM(oi.total), 0) as revenue
                FROM order_codes oc LEFT JOIN order_items oi ON oi.order_code_id = oc.id
                WHERE oc.customer_id IN (${cph}) AND oc.status = 'completed'
                GROUP BY oc.id, oc.order_code, oc.customer_id, oc.status, oc.created_at
                ORDER BY oc.created_at DESC
            `, customerIds);
            rows.forEach(r => {
                const cust = customers.find(c => c.id === r.customer_id);
                const isDirect = cust && cust.referrer_id === aff.id;
                const rate = isDirect ? directRate : parentRate;
                const nvName = cust?.assigned_to_id ? (nvMap[cust.assigned_to_id] || '—') : '—';
                orders.push({
                    order_code: r.order_code, customer_name: cust?.customer_name || '-',
                    nv_quan_ly: nvName,
                    revenue: Number(r.revenue), rate: rate * 100, commission: Math.round(Number(r.revenue) * rate),
                    type: isDirect ? 'Trực tiếp' : 'Gián tiếp', completed_at: r.created_at
                });
            });
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
}

module.exports = affiliateRoutes;
