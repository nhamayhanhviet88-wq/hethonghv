const { authenticate, requireRole } = require('../middleware/auth');
const { sendTelegramMessage, broadcastTelegram } = require('../utils/telegram');

module.exports = function(fastify, db, getManagedDeptIds) {

    fastify.post('/api/customers/:id/cancel', { preHandler: [authenticate] }, async (request, reply) => {
        const { reason } = request.body || {};
        if (!reason) return reply.code(400).send({ error: 'Vui lòng nhập lý do hủy' });
        const custId = Number(request.params.id);
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [custId]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        // Helper: next business day (skip Sunday)
        const getNextBizDay = () => {
            const vnNow = new Date(Date.now() + 7*3600000);
            const nextDay = new Date(vnNow);
            nextDay.setDate(nextDay.getDate() + 1);
            if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1);
            return nextDay.toISOString().split('T')[0];
        };

        // REPEAT cancel: auto-reverted (cancel_approved = -2), NV pressing Hủy Khách again
        if (customer.cancel_approved === -2 && customer.cancel_requested === 1) {
            const nextBizDay = getNextBizDay();
            await db.run(`UPDATE customers SET cancel_requested_at = NOW()::text, appointment_date = ?, updated_at = NOW() WHERE id = ?`,
                [nextBizDay, custId]);
            await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES (?, 'huy', ?, ?)`,
                [custId, `❌ Nhắc lại hủy khách: ${reason}`, request.user.id]);
            const tgMsg = `❌ <b>NHẮC LẠI YÊU CẦU HỦY KHÁCH</b>\\nKhách: ${customer.customer_name} - ${customer.phone}\\nLý do: ${reason}\\nBởi: ${request.user.full_name}`;
            const globalId = process.env.TELEGRAM_GROUP_ID;
            if (globalId) sendTelegramMessage(globalId, tgMsg);
            return { success: true, message: 'Đã nhắc lại yêu cầu hủy khách!' };
        }

        if (['nhan_vien', 'truong_phong'].includes(request.user.role)) {
            await db.run(
                `UPDATE customers SET cancel_requested = 1, cancel_reason = ?,
                 cancel_requested_by = ?, cancel_requested_at = NOW()::text,
                 updated_at = NOW() WHERE id = ?`,
                [reason, request.user.id, custId]
            );
            const tgMsg = `❌ <b>Yêu cầu HỦY khách hàng</b>\nKhách: ${customer.customer_name} - ${customer.phone}\nLý do: ${reason}\nBởi: ${request.user.full_name}`;
            const globalId = process.env.TELEGRAM_GROUP_ID;
            if (globalId) sendTelegramMessage(globalId, tgMsg);
            return { success: true, message: 'Yêu cầu hủy đã được gửi. Chờ Quản Lý/Giám Đốc duyệt.' };
        }

        if (['giam_doc', 'quan_ly'].includes(request.user.role)) {
            await db.run(
                `UPDATE customers SET cancel_requested = 1, cancel_reason = ?,
                 cancel_requested_by = ?, cancel_requested_at = NOW()::text,
                 cancel_approved = 1, cancel_approved_by = ?, cancel_approved_at = NOW()::text,
                 updated_at = NOW() WHERE id = ?`,
                [reason, request.user.id, request.user.id, custId]
            );
            return { success: true, message: 'Khách hàng đã được hủy.' };
        }
        return reply.code(403).send({ error: 'Không có quyền hủy' });
    });

    fastify.post('/api/customers/:id/approve-cancel', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'trinh')] }, async (request, reply) => {
        const { approve, manager_note } = request.body || {};
        const custId = Number(request.params.id);
        if (!manager_note) return reply.code(400).send({ error: 'Vui lòng nhập lý do!' });

        if (approve) {
            await db.run(
                `UPDATE customers SET cancel_approved = 1, cancel_approved_by = ?,
                 cancel_approved_at = NOW()::text,
                 cancel_reason = cancel_reason || ?,
                 order_status = 'duyet_huy',
                 updated_at = NOW() WHERE id = ?`,
                [request.user.id, `\n📋 QL: ${manager_note}`, custId]
            );
            const linkedUser = await db.get("SELECT id, full_name FROM users WHERE source_customer_id = ? AND status = 'active'", [custId]);
            if (linkedUser) {
                await db.run("UPDATE users SET status = 'locked', updated_at = NOW() WHERE id = ?", [linkedUser.id]);
                const globalId = process.env.TELEGRAM_GROUP_ID;
                if (globalId) sendTelegramMessage(globalId, `🔒 <b>Tài khoản bị khóa tự động</b>\nAffiliate: ${linkedUser.full_name}\nLý do: Khách hàng nguồn bị hủy`);
            }
            return { success: true, message: 'Đã duyệt hủy khách hàng.' + (linkedUser ? ` Tài khoản ${linkedUser.full_name} đã bị khóa.` : '') };
        } else {
            // Next business day (skip Sunday)
            const vnNow = new Date(Date.now() + 7*3600000);
            const nextDay = new Date(vnNow);
            nextDay.setDate(nextDay.getDate() + 1);
            if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1);
            const nextBizDay = nextDay.toISOString().split('T')[0];
            await db.run(
                `UPDATE customers SET cancel_approved = -1, cancel_approved_by = ?,
                 cancel_approved_at = NOW()::text,
                 cancel_reason = cancel_reason || ?,
                 order_status = 'tu_van_lai', appointment_date = ?,
                 updated_at = NOW() WHERE id = ?`,
                [request.user.id, `\n❌ Từ chối: ${manager_note}`, nextBizDay, custId]
            );
            return { success: true, message: 'Đã từ chối hủy. Khách hàng chuyển sang Tư Vấn Lại.' };
        }
    });

    // ========== AUTO-REVERT EXPIRED CANCELS (24h) ==========
    fastify.post('/api/cancel/auto-revert-expired', { preHandler: [authenticate] }, async (request, reply) => {
        // Find all pending cancel requests older than 24h
        const expired = await db.all(
            `SELECT id, customer_name, phone, cancel_requested_by FROM customers 
             WHERE cancel_requested = 1 AND cancel_approved = 0 
             AND cancel_requested_at IS NOT NULL 
             AND (NOW() - cancel_requested_at::timestamp) > INTERVAL '24 hours'`
        );
        if (expired.length === 0) return { success: true, reverted: 0, customers: [] };

        // Next business day (skip Sunday)
        const vnNow = new Date(Date.now() + 7*3600000);
        const nextDay = new Date(vnNow);
        nextDay.setDate(nextDay.getDate() + 1);
        if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1);
        const nextBizDay = nextDay.toISOString().split('T')[0];
        for (const c of expired) {
            await db.run(
                `UPDATE customers SET cancel_approved = -2,
                 cancel_reason = cancel_reason || $1,
                 order_status = 'dang_tu_van', appointment_date = $2,
                 updated_at = NOW() WHERE id = $3`,
                ['\n⏰ Tự động: Quá 24h không có phản hồi', nextBizDay, c.id]
            );
        }
        return { success: true, reverted: expired.length, customers: expired };
    });

    // ========== COUNT PENDING CANCEL REQUESTS ==========
    fastify.get('/api/cancel/pending-count', { preHandler: [authenticate] }, async (request, reply) => {
        const result = await db.get(`SELECT COUNT(*) as count FROM customers WHERE cancel_requested = 1 AND cancel_approved = 0`);
        return { count: Number(result?.count) || 0 };
    });

    // ========== COUNT PENDING EMERGENCY REQUESTS ==========
    fastify.get('/api/emergency/pending-count', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        let result;
        if (user.role === 'giam_doc') {
            result = await db.get(`SELECT COUNT(*) as count FROM emergencies WHERE status = 'pending'`);
        } else if (['quan_ly', 'truong_phong'].includes(user.role)) {
            result = await db.get(
                `SELECT COUNT(*) as count FROM emergencies WHERE status = 'pending' AND (handler_id = $1 OR requested_by = $1 OR handover_to = $1)`,
                [user.id]
            );
        } else {
            return { count: 0 };
        }
        return { count: Number(result?.count) || 0 };
    });

    // ========== COUNT RECENTLY AUTO-REVERTED FOR NV ==========
    fastify.get('/api/cancel/reverted-for-me', { preHandler: [authenticate] }, async (request, reply) => {
        // Get customers that were auto-reverted (cancel_approved = -1) and assigned to current user
        const customers = await db.all(
            `SELECT id, customer_name, phone FROM customers 
             WHERE cancel_approved = -1 AND assigned_to = $1 
             AND order_status = 'dang_tu_van'
             AND cancel_reason LIKE '%Tự động từ chối%'`, 
            [request.user.id]
        );
        return { count: customers.length, customers };
    });

    // ========== CẤP CỨU SẾP ==========
    fastify.post('/api/emergencies', { preHandler: [authenticate] }, async (request, reply) => {
        const { customer_id, reason, handler_id } = request.body || {};
        if (!reason) return reply.code(400).send({ error: 'Vui lòng nhập lý do cấp cứu' });
        if (!handler_id) return reply.code(400).send({ error: 'Vui lòng chọn người xử lý' });
        if (!customer_id) return reply.code(400).send({ error: 'Vui lòng chọn khách hàng' });

        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [Number(customer_id)]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });
        const handler = await db.get('SELECT * FROM users WHERE id = ?', [Number(handler_id)]);
        if (!handler) return reply.code(404).send({ error: 'Không tìm thấy người xử lý' });

        // Check if there's already a pending emergency for this customer
        const pendingEm = await db.get("SELECT id FROM emergencies WHERE customer_id = ? AND status = 'pending'", [Number(customer_id)]);

        // Calculate next business day for appointment
        const vnNow = new Date(Date.now() + 7*3600000);
        const nextDay = new Date(vnNow);
        nextDay.setDate(nextDay.getDate() + 1);
        if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1); // Skip Sunday
        const nextBizDay = nextDay.toISOString().split('T')[0];

        if (pendingEm) {
            // REPEAT: Don't create new emergency, just log + send Telegram reminder
            await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES (?, 'cap_cuu_sep', ?, ?)`,
                [Number(customer_id), `🚨 Nhắc lại cấp cứu sếp: ${reason}`, request.user.id]);
            // Update appointment to next business day
            await db.run(`UPDATE customers SET appointment_date = ? WHERE id = ?`, [nextBizDay, Number(customer_id)]);

            const tgMsg = `🚨 <b>NHẮC LẠI CẤP CỨU SẾP</b>\nKhách: ${customer.customer_name} - ${customer.phone}\nLý do: ${reason}\nGửi cho: ${handler.full_name}\nBởi: ${request.user.full_name}`;
            if (handler.telegram_group_id) sendTelegramMessage(handler.telegram_group_id, tgMsg);
            const globalId = process.env.TELEGRAM_GROUP_ID;
            if (globalId) sendTelegramMessage(globalId, tgMsg);
            return { success: true, id: pendingEm.id, message: 'Đã nhắc lại cấp cứu sếp!' };
        }

        // FIRST TIME: Create new emergency
        const result = await db.run('INSERT INTO emergencies (customer_id, requested_by, reason, handler_id) VALUES (?,?,?,?)',
            [Number(customer_id), request.user.id, reason, Number(handler_id)]);

        // Log consultation so customer appears in 'Đã xử lý hôm nay'
        await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES (?, 'cap_cuu_sep', ?, ?)`,
            [Number(customer_id), `🚨 Cấp cứu sếp: ${reason}`, request.user.id]);

        // Auto-set appointment to next business day
        await db.run(`UPDATE customers SET appointment_date = ? WHERE id = ?`, [nextBizDay, Number(customer_id)]);

        const tgMsg = `🚨 <b>CẤP CỨU SẾP</b>\nKhách: ${customer.customer_name} - ${customer.phone}\nLý do: ${reason}\nGửi cho: ${handler.full_name}\nBởi: ${request.user.full_name}`;
        if (handler.telegram_group_id) sendTelegramMessage(handler.telegram_group_id, tgMsg);
        const globalId = process.env.TELEGRAM_GROUP_ID;
        if (globalId) sendTelegramMessage(globalId, tgMsg);
        return { success: true, id: result.lastInsertRowid, message: 'Đã gửi cấp cứu sếp!' };
    });

    // Check if customer has a pending emergency
    fastify.get('/api/emergencies/pending/:customerId', { preHandler: [authenticate] }, async (request, reply) => {
        const cid = Number(request.params.customerId);
        const pending = await db.get("SELECT id, reason, handler_id FROM emergencies WHERE customer_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1", [cid]);
        return { hasPending: !!pending, emergency: pending || null };
    });

    fastify.get('/api/emergencies/handlers', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        const dbUser = await db.get('SELECT department_id FROM users WHERE id = ?', [user.id]);
        const userDept = dbUser ? dbUser.department_id : null;
        const handlers = [];
        const addHandler = (u) => { if (u && !handlers.find(h => h.id === u.id)) handlers.push(u); };

        async function getManagersOfDept(deptId) {
            const byDept = await db.all("SELECT id, full_name, role, department_id FROM users WHERE department_id = ? AND role IN ('quan_ly','giam_doc') AND status = 'active'", [deptId]);
            byDept.forEach(addHandler);
            const dept = await db.get('SELECT head_user_id FROM departments WHERE id = ?', [deptId]);
            if (dept && dept.head_user_id) {
                const head = await db.get("SELECT id, full_name, role, department_id FROM users WHERE id = ? AND status = 'active'", [dept.head_user_id]);
                addHandler(head);
            }
        }

        if (user.role === 'quan_ly') {
            const gds = await db.all("SELECT id, full_name, role, department_id FROM users WHERE role = 'giam_doc' AND status = 'active'");
            return { handlers: gds };
        }
        if (user.role === 'truong_phong') {
            if (userDept) {
                const myDept = await db.get('SELECT parent_id FROM departments WHERE id = ?', [userDept]);
                if (myDept && myDept.parent_id) await getManagersOfDept(myDept.parent_id);
                await getManagersOfDept(userDept);
            }
            const gds = await db.all("SELECT id, full_name, role, department_id FROM users WHERE role = 'giam_doc' AND status = 'active'");
            gds.forEach(addHandler);
            return { handlers: handlers.filter(h => h.id !== user.id) };
        }
        if (userDept) {
            const tps = await db.all("SELECT id, full_name, role, department_id FROM users WHERE department_id = ? AND role = 'truong_phong' AND status = 'active' AND id != ?", [userDept, user.id]);
            tps.forEach(addHandler);
            const myDept = await db.get('SELECT parent_id FROM departments WHERE id = ?', [userDept]);
            if (myDept && myDept.parent_id) await getManagersOfDept(myDept.parent_id);
            await getManagersOfDept(userDept);
        }
        const gds = await db.all("SELECT id, full_name, role, department_id FROM users WHERE role = 'giam_doc' AND status = 'active'");
        gds.forEach(addHandler);
        return { handlers: handlers.filter(h => h.id !== user.id) };
    });

    fastify.get('/api/emergencies', { preHandler: [authenticate] }, async (request, reply) => {
        await db.run(`UPDATE emergencies SET handover_to = NULL, handover_at = NULL, handover_status = NULL
                WHERE handover_status = 'pending'
                AND (handover_at::timestamp + INTERVAL '30 minutes') < NOW()`);

        const { status } = request.query;
        let query = `SELECT e.*,
            u.full_name as requested_by_name, u.role as requested_by_role,
            c.customer_name, c.phone as customer_phone,
            ru.full_name as resolved_by_name,
            hu.full_name as handler_name,
            htu.full_name as handover_to_name
            FROM emergencies e
            LEFT JOIN users u ON e.requested_by = u.id
            LEFT JOIN customers c ON e.customer_id = c.id
            LEFT JOIN users ru ON e.resolved_by = ru.id
            LEFT JOIN users hu ON e.handler_id = hu.id
            LEFT JOIN users htu ON e.handover_to = htu.id
            WHERE 1=1`;
        const params = [];
        if (status) { query += ' AND e.status = ?'; params.push(status); }

        const user = request.user;
        if (user.role === 'giam_doc') {
            // sees ALL
        } else if (user.role === 'quan_ly') {
            const allDepts = await db.all('SELECT id, parent_id, head_user_id FROM departments');
            const managedRootIds = allDepts.filter(d => d.head_user_id === user.id).map(d => d.id);
            function getChildIds(parentId) {
                let ids = [parentId];
                allDepts.filter(d => d.parent_id === parentId).forEach(c => ids.push(...getChildIds(c.id)));
                return ids;
            }
            let allManagedDeptIds = [];
            managedRootIds.forEach(id => allManagedDeptIds.push(...getChildIds(id)));
            if (allManagedDeptIds.length > 0) {
                const placeholders = allManagedDeptIds.map(() => '?').join(',');
                query += ` AND (e.handler_id = ? OR e.requested_by = ? OR e.handover_to = ? OR e.requested_by IN (SELECT id FROM users WHERE department_id IN (${placeholders})))`;
                params.push(user.id, user.id, user.id, ...allManagedDeptIds);
            } else {
                query += ' AND (e.handler_id = ? OR e.requested_by = ? OR e.handover_to = ?)';
                params.push(user.id, user.id, user.id);
            }
        } else {
            query += ' AND (e.handler_id = ? OR e.requested_by = ? OR e.handover_to = ?)';
            params.push(user.id, user.id, user.id);
        }
        query += ' ORDER BY e.created_at DESC';
        return { emergencies: await db.all(query, params) };
    });

    fastify.put('/api/emergencies/:id/resolve', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'truong_phong')] }, async (request, reply) => {
        const { note, status } = request.body || {};
        const emId = Number(request.params.id);
        const em = await db.get('SELECT * FROM emergencies WHERE id = ?', [emId]);
        await db.run(
            `UPDATE emergencies SET status = ?, resolved_by = ?, resolved_note = ?,
             resolved_at = NOW()::text,
             handover_to = NULL, handover_at = NULL, handover_status = NULL
             WHERE id = ?`,
            [status || 'resolved', request.user.id, note || null, emId]
        );
        if (em && em.customer_id) {
        const vnNow = new Date(Date.now() + 7*3600000);
        const nextDay = new Date(vnNow);
        nextDay.setDate(nextDay.getDate() + 1);
        // Skip Sunday (0 = Sunday)
        if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1);
        const nextBizDay = nextDay.toISOString().split('T')[0];
            await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, logged_by) VALUES (?, 'hoan_thanh_cap_cuu', ?, ?)`,
                [em.customer_id, `🏥 Cấp cứu hoàn thành: ${note || ''}`, request.user.id]);
            await db.run(`UPDATE customers SET appointment_date = ? WHERE id = ?`, [nextBizDay, em.customer_id]);
        }
        return { success: true, message: 'Đã xử lý cấp cứu!' };
    });

    fastify.post('/api/emergencies/:id/handover', { preHandler: [authenticate, requireRole('truong_phong', 'quan_ly')] }, async (request, reply) => {
        const em = await db.get('SELECT * FROM emergencies WHERE id = ?', [Number(request.params.id)]);
        if (!em) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (em.handler_id !== request.user.id) return reply.code(403).send({ error: 'Bạn không phải người xử lý' });
        if (em.handover_status === 'pending') return reply.code(400).send({ error: 'Đang có bàn giao chờ chấp nhận' });
        const { target_id } = request.body || {};
        if (!target_id) return reply.code(400).send({ error: 'Vui lòng chọn người nhận bàn giao' });
        await db.run(`UPDATE emergencies SET handover_to = ?, handover_at = NOW()::text, handover_status = 'pending' WHERE id = ?`,
            [Number(target_id), em.id]);
        return { success: true, message: 'Đã gửi yêu cầu bàn giao!' };
    });

    fastify.post('/api/emergencies/:id/accept-handover', { preHandler: [authenticate] }, async (request, reply) => {
        const em = await db.get('SELECT * FROM emergencies WHERE id = ?', [Number(request.params.id)]);
        if (!em) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (em.handover_to !== request.user.id) return reply.code(403).send({ error: 'Bạn không phải người được bàn giao' });
        if (em.handover_status !== 'pending') return reply.code(400).send({ error: 'Bàn giao đã hết hiệu lực' });
        const handoverAt = new Date(em.handover_at);
        if (Date.now() - handoverAt.getTime() > 30 * 60 * 1000) {
            await db.run(`UPDATE emergencies SET handover_to = NULL, handover_at = NULL, handover_status = NULL WHERE id = ?`, [em.id]);
            return reply.code(400).send({ error: 'Bàn giao đã hết thời hạn 30 phút' });
        }
        await db.run(`UPDATE emergencies SET handler_id = ?, handover_status = 'accepted', assigned_at = NOW() WHERE id = ?`, [request.user.id, em.id]);
        return { success: true, message: 'Đã chấp nhận bàn giao!' };
    });

    fastify.post('/api/emergencies/:id/cancel-handover', { preHandler: [authenticate] }, async (request, reply) => {
        const em = await db.get('SELECT * FROM emergencies WHERE id = ?', [Number(request.params.id)]);
        if (!em) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (em.handler_id !== request.user.id && em.handover_to !== request.user.id) return reply.code(403).send({ error: 'Bạn không có quyền hủy bàn giao này' });
        await db.run(`UPDATE emergencies SET handover_to = NULL, handover_at = NULL, handover_status = NULL WHERE id = ?`, [em.id]);
        return { success: true, message: 'Đã hủy bàn giao!' };
    });

    // ========== DASHBOARD STATS ==========
    fastify.get('/api/dashboard/stats', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user;
        let whereClause = '';
        let params = [];

        if (user.role === 'nhan_vien') {
            whereClause = 'WHERE assigned_to_id = ?'; params = [user.id];
        } else if (user.role === 'truong_phong') {
            whereClause = `WHERE (assigned_to_id = ? OR assigned_to_id IN (
                SELECT tm.user_id FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.leader_id = ?
            ))`; params = [user.id, user.id];
        }

        const total = await db.get(`SELECT COUNT(*) as cnt FROM customers ${whereClause}`, params);
        const today = new Date().toISOString().split('T')[0];
        const newToday = await db.get(`SELECT COUNT(*) as cnt FROM customers ${whereClause ? whereClause + ' AND' : 'WHERE'} created_at::date = ?::date`, [...params, today]);

        const totalRevenue = await db.get(`SELECT COALESCE(SUM(oi.total), 0) as revenue FROM order_items oi
            JOIN customers c ON oi.customer_id = c.id ${whereClause ? whereClause.replace('WHERE', 'AND') : ''}
            WHERE c.order_status IN ('chot_don','san_xuat','giao_hang','hoan_thanh')`, params);

        const closed = await db.get(`SELECT COUNT(*) as cnt FROM customers ${whereClause ? whereClause + ' AND' : 'WHERE'} order_status IN ('chot_don','san_xuat','giao_hang','hoan_thanh')`, params);
        const rate = total?.cnt > 0 ? Math.round((closed?.cnt / total?.cnt) * 100) : 0;

        const topEmployees = await db.all(`
            SELECT u.full_name, COUNT(c.id) as customer_count,
            COALESCE(SUM(CASE WHEN c.order_status IN ('chot_don','san_xuat','giao_hang','hoan_thanh') THEN 1 ELSE 0 END), 0) as closed_count
            FROM users u LEFT JOIN customers c ON c.assigned_to_id = u.id
            WHERE u.role = 'nhan_vien' AND u.status = 'active'
            GROUP BY u.id, u.full_name ORDER BY closed_count DESC LIMIT 10
        `);

        const pendingCancel = await db.get("SELECT COUNT(*) as cnt FROM customers WHERE cancel_requested = 1 AND cancel_approved = 0");
        const pendingEmergency = await db.get("SELECT COUNT(*) as cnt FROM emergencies WHERE status = 'pending'");
        const pendingWithdraw = await db.get("SELECT COUNT(*) as cnt FROM withdrawal_requests WHERE status = 'pending'");

        return {
            totalCustomers: total?.cnt || 0, newToday: newToday?.cnt || 0,
            totalRevenue: totalRevenue?.revenue || 0, closeRate: rate,
            topEmployees,
            pendingCancel: pendingCancel?.cnt || 0, pendingEmergency: pendingEmergency?.cnt || 0, pendingWithdraw: pendingWithdraw?.cnt || 0
        };
    });

    // ========== RÚT TIỀN (AFFILIATE) ==========
    fastify.post('/api/withdrawals', { preHandler: [authenticate] }, async (request, reply) => {
        const { amount, bank_name, bank_account, bank_holder } = request.body || {};
        const amountNum = Number(amount);
        if (!amountNum || amountNum < 100000) return reply.code(400).send({ error: 'Số tiền rút tối thiểu 100.000 VNĐ' });
        if (!bank_name || !bank_account || !bank_holder) {
            return reply.code(400).send({ error: 'Vui lòng nhập đầy đủ: Số tài khoản, Tên ngân hàng, Tên thụ hưởng' });
        }

        // Save bank info to user profile for next time
        await db.run('UPDATE users SET bank_name = ?, bank_account = ?, bank_holder = ?, updated_at = NOW() WHERE id = ?',
            [bank_name, bank_account, bank_holder, request.user.id]);

        // Create withdrawal request (NO balance deduction - only deduct when approved)
        const result = await db.run(
            'INSERT INTO withdrawal_requests (user_id, amount, bank_name, bank_account, bank_holder) VALUES (?,?,?,?,?)',
            [request.user.id, amountNum, bank_name, bank_account, bank_holder]
        );

        // Telegram notification
        const userInfo = await db.get('SELECT full_name FROM users WHERE id = ?', [request.user.id]);
        const tgMsg = `💰 <b>Yêu cầu RÚT TIỀN</b>\nCTV: ${userInfo?.full_name || request.user.username}\nSố tiền: <b>${amountNum.toLocaleString('vi-VN')} VNĐ</b>\nNgân hàng: ${bank_name}\nSTK: ${bank_account}\nTên: ${bank_holder}`;
        const globalId = process.env.TELEGRAM_GROUP_ID;
        if (globalId) sendTelegramMessage(globalId, tgMsg);

        return { success: true, message: 'Yêu cầu rút tiền đã được gửi! Vui lòng chờ xác nhận.', withdrawalId: result?.lastID };
    });

    fastify.get('/api/withdrawals', { preHandler: [authenticate] }, async (request, reply) => {
        let query = `SELECT w.*, u.full_name as user_name, u.phone as user_phone, u.username as user_username,
            au.full_name as approved_by_name FROM withdrawal_requests w
            LEFT JOIN users u ON w.user_id = u.id LEFT JOIN users au ON w.approved_by = au.id`;
        const params = [];
        if (request.user.role === 'tkaffiliate' || request.user.role === 'hoa_hong') {
            query += ' WHERE w.user_id = ?'; params.push(request.user.id);
        }
        query += ' ORDER BY w.created_at DESC';
        return { withdrawals: await db.all(query, params) };
    });

    fastify.put('/api/withdrawals/:id/approve', { preHandler: [authenticate, requireRole('giam_doc', 'trinh')] }, async (request, reply) => {
        const { approve, transfer_image, reject_reason } = request.body || {};
        const wId = Number(request.params.id);
        const w = await db.get('SELECT w.*, u.full_name, u.username FROM withdrawal_requests w LEFT JOIN users u ON w.user_id = u.id WHERE w.id = ?', [wId]);
        if (!w) return reply.code(404).send({ error: 'Không tìm thấy yêu cầu' });
        if (w.status !== 'pending') return reply.code(400).send({ error: 'Yêu cầu này đã được xử lý' });

        if (approve) {
            if (!transfer_image) return reply.code(400).send({ error: 'Vui lòng paste ảnh chuyển khoản để xác nhận' });
            await db.run(`UPDATE withdrawal_requests SET status = 'approved', approved_by = ?, approved_at = NOW()::text, transfer_image = ? WHERE id = ?`,
                [request.user.id, transfer_image, wId]);
            return { success: true, message: 'Đã duyệt và xác nhận chuyển tiền!' };
        } else {
            if (!reject_reason) return reply.code(400).send({ error: 'Vui lòng nhập lý do từ chối' });
            await db.run(`UPDATE withdrawal_requests SET status = 'rejected', approved_by = ?, approved_at = NOW()::text, reject_reason = ? WHERE id = ?`,
                [request.user.id, reject_reason, wId]);
            return { success: true, message: 'Đã từ chối yêu cầu rút tiền.' };
        }
    });

    // Polling endpoint for GĐ/Trinh to check new pending withdrawals
    fastify.get('/api/withdrawals/pending-alert', { preHandler: [authenticate, requireRole('giam_doc', 'trinh')] }, async (request, reply) => {
        const result = await db.get(`SELECT COUNT(*) as count FROM withdrawal_requests WHERE status = 'pending'`);
        const latest = await db.get(`
            SELECT w.amount, w.bank_account, w.bank_name, u.full_name as user_name
            FROM withdrawal_requests w LEFT JOIN users u ON w.user_id = u.id
            WHERE w.status = 'pending' ORDER BY w.created_at DESC LIMIT 1
        `);
        return { count: result?.count || 0, latest };
    });

    fastify.put('/api/users/:id/reassign', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'trinh')] }, async (request, reply) => {
        const { assigned_to_user_id } = request.body || {};
        const userId = Number(request.params.id);
        const user = await db.get('SELECT * FROM users WHERE id = ? AND role = ?', [userId, 'hoa_hong']);
        if (!user) return reply.code(404).send({ error: 'Không tìm thấy CTV' });
        await db.run('UPDATE users SET assigned_to_user_id = ? WHERE id = ?',
            [assigned_to_user_id ? Number(assigned_to_user_id) : null, userId]);
        return { success: true, message: 'Đã chuyển CTV thành công!' };
    });

    // ========== CONSULTATION LOGS ==========
    fastify.get('/api/customers/:id/consult', { preHandler: [authenticate] }, async (request, reply) => {
        const logs = await db.all(
            `SELECT cl.*, u.full_name as logged_by_name FROM consultation_logs cl
             LEFT JOIN users u ON cl.logged_by = u.id WHERE cl.customer_id = ?
             ORDER BY cl.created_at DESC, CASE WHEN cl.log_type = 'hoan_thanh_cap_cuu' THEN 0 ELSE 1 END, cl.id DESC`,
            [Number(request.params.id)]
        );
        return { logs };
    });

    fastify.post('/api/customers/:id/consult', { preHandler: [authenticate] }, async (request, reply) => {
        const customerId = Number(request.params.id);
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [customerId]);
        if (!customer) return reply.code(404).send({ error: 'Không tìm thấy khách hàng' });

        let log_type, content, imagePath = null;
        const parts = request.parts();
        const fields = {};
        for await (const part of parts) {
            if (part.type === 'file' && part.fieldname === 'image') {
                const fs = require('fs');
                const path = require('path');
                const uploadsDir = path.join(__dirname, '..', 'uploads', 'consult');
                if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                const filename = `consult_${customerId}_${Date.now()}.png`;
                const filepath = path.join(uploadsDir, filename);
                const buf = await part.toBuffer();
                fs.writeFileSync(filepath, buf);
                imagePath = `/uploads/consult/${filename}`;
            } else { fields[part.fieldname] = part.value; }
        }

        log_type = fields.log_type;
        content = fields.content;
        if (!log_type) return reply.code(400).send({ error: 'Vui lòng chọn loại tư vấn' });

        const logTypes = await db.all('SELECT DISTINCT log_type FROM consultation_logs WHERE customer_id = ?', [customerId]);
        const doneTypes = logTypes.map(l => l.log_type);
        if (log_type === 'chot_don' && !doneTypes.includes('dat_coc')) return reply.code(400).send({ error: 'Phải Đặt Cọc trước khi Chốt Đơn!' });
        if (log_type === 'hoan_thanh' && !doneTypes.includes('chot_don')) return reply.code(400).send({ error: 'Phải Chốt Đơn trước khi Hoàn Thành!' });
        if (log_type === 'sau_ban_hang' && !doneTypes.includes('hoan_thanh')) return reply.code(400).send({ error: 'Phải Hoàn Thành Đơn trước khi Sau Bán Hàng!' });

        const deposit_amount = Number(fields.deposit_amount) || 0;
        const next_consult_type = fields.next_consult_type || null;
        await db.run(`INSERT INTO consultation_logs (customer_id, log_type, content, image_path, logged_by, deposit_amount, next_consult_type) VALUES (?,?,?,?,?,?,?)`,
            [customerId, log_type, content || null, imagePath, request.user.id, deposit_amount, next_consult_type]);

        if (fields.birthday) await db.run('UPDATE customers SET birthday = ? WHERE id = ?', [fields.birthday, customerId]);
        if (fields.address) await db.run('UPDATE customers SET address = ? WHERE id = ?', [fields.address, customerId]);
        if (fields.appointment_date) await db.run('UPDATE customers SET appointment_date = ? WHERE id = ?', [fields.appointment_date, customerId]);

        // Auto-set appointment to next business day for 'Hoàn thành cấp cứu'
        if (log_type === 'hoan_thanh_cap_cuu' && !fields.appointment_date) {
            const vnNow = new Date(Date.now() + 7*3600000);
            const nextDay = new Date(vnNow);
            nextDay.setDate(nextDay.getDate() + 1);
            if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1); // Skip Sunday
            const nextBizDay = nextDay.toISOString().split('T')[0];
            await db.run('UPDATE customers SET appointment_date = ? WHERE id = ?', [nextBizDay, customerId]);
        }

        const statusMap = { 'goi_dien': 'dang_tu_van', 'nhan_tin': 'dang_tu_van', 'gap_truc_tiep': 'dang_tu_van', 'gui_bao_gia': 'bao_gia', 'gui_mau': 'dang_tu_van', 'thiet_ke': 'dang_tu_van', 'bao_sua': 'dang_tu_van', 'lam_quen_tuong_tac': 'lam_quen_tuong_tac', 'gui_stk_coc': 'gui_stk_coc', 'giuc_coc': 'gui_stk_coc', 'dat_coc': 'dat_coc', 'chot_don': 'chot_don', 'dang_san_xuat': 'chot_don', 'hoan_thanh': 'hoan_thanh', 'sau_ban_hang': 'sau_ban_hang', 'tuong_tac_ket_noi': 'tuong_tac_ket_noi', 'gui_ct_kh_cu': 'gui_ct_kh_cu', 'giam_gia': 'giam_gia', 'huy_coc': 'huy_coc' };
        if (statusMap[log_type]) {
            await db.run('UPDATE customers SET order_status = ?, updated_at = NOW() WHERE id = ?', [statusMap[log_type], customerId]);

            // Reset cancel status if customer was cancelled → return to normal flow
            if (customer.cancel_approved === 1 || customer.cancel_approved === -2) {
                await db.run('UPDATE customers SET cancel_requested = 0, cancel_approved = 0, cancel_reason = NULL, cancel_requested_by = NULL, cancel_requested_at = NULL, cancel_approved_by = NULL, cancel_approved_at = NULL WHERE id = ?', [customerId]);
            }
            // Hoàn Thành Đơn → complete ALL active orders + calculate commission per order
            if (log_type === 'hoan_thanh') {
                const activeOrders = await db.all("SELECT id FROM order_codes WHERE customer_id = ? AND status = 'active'", [customerId]);
                for (const ao of activeOrders) {
                    await db.run("UPDATE order_codes SET status = 'completed' WHERE id = ?", [ao.id]);
                    // Calculate commission for this order
                    if (customer.referrer_id) {
                        const grandTotal = await db.get('SELECT COALESCE(SUM(total), 0) as t FROM order_items WHERE order_code_id = ?', [ao.id]);
                        if (grandTotal?.t) {
                            // Direct referrer commission
                            const referrer = await db.get('SELECT u.*, ct.percentage, ct.parent_percentage FROM users u LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id WHERE u.id = ?', [customer.referrer_id]);
                            if (referrer?.percentage) {
                                const commission = Math.round(grandTotal.t * referrer.percentage / 100);
                                await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [commission, referrer.id]);
                            }
                            // Parent affiliate commission (2-level)
                            // Find parent: referrer.source_customer_id → customer → referrer_id = parent affiliate
                            if (referrer?.source_customer_id) {
                                const sourceCustomer = await db.get('SELECT referrer_id FROM customers WHERE id = ?', [referrer.source_customer_id]);
                                if (sourceCustomer?.referrer_id) {
                                    const parentAffiliate = await db.get('SELECT u.*, ct.parent_percentage FROM users u LEFT JOIN commission_tiers ct ON u.commission_tier_id = ct.id WHERE u.id = ?', [sourceCustomer.referrer_id]);
                                    if (parentAffiliate?.parent_percentage) {
                                        const parentCommission = Math.round(grandTotal.t * parentAffiliate.parent_percentage / 100);
                                        await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [parentCommission, parentAffiliate.id]);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        const consultCount = (await db.get('SELECT COUNT(*) as cnt FROM consultation_logs WHERE customer_id = ?', [customerId]))?.cnt || 0;
        return { success: true, message: 'Đã ghi nhận tư vấn!', consultCount };
    });

    fastify.put('/api/customers/:id/appointment', { preHandler: [authenticate] }, async (request, reply) => {
        const { appointment_date } = request.body || {};
        await db.run('UPDATE customers SET appointment_date = ? WHERE id = ?', [appointment_date || null, Number(request.params.id)]);
        return { success: true, message: 'Đã cập nhật ngày hẹn!' };
    });

    fastify.get('/api/customers/referrer-search', { preHandler: [authenticate] }, async (request, reply) => {
        const { q, all } = request.query;
        const userId = request.user.id;
        const allowedTypes = ['nuoi_duong', 'sinh_vien', 'ctv', 'hoa_hong_crm', 'ctv_hoa_hong'];

        if (all === '1') {
            const customers = await db.all(
                `SELECT c.id, c.customer_name, c.phone, c.crm_type, c.daily_order_number, c.created_at
                 FROM customers c WHERE c.assigned_to_id = ?
                 AND c.crm_type IN (${allowedTypes.map(() => '?').join(',')})
                 AND c.cancel_approved = 0 ORDER BY c.customer_name ASC LIMIT 100`,
                [userId, ...allowedTypes]
            );
            return { customers };
        }
        if (!q || q.length < 2) return { customers: [] };
        const customers = await db.all(
            `SELECT c.id, c.customer_name, c.phone, c.crm_type, c.daily_order_number, c.created_at
             FROM customers c WHERE c.assigned_to_id = ?
             AND c.crm_type IN (${allowedTypes.map(() => '?').join(',')})
             AND (c.customer_name LIKE ? OR c.phone LIKE ?)
             AND c.cancel_approved = 0 ORDER BY c.created_at DESC LIMIT 10`,
            [userId, ...allowedTypes, `%${q}%`, `%${q}%`]
        );
        return { customers };
    });

    fastify.put('/api/customers/:id/referrer', { preHandler: [authenticate] }, async (request, reply) => {
        const { referrer_customer_id } = request.body || {};
        const customerId = Number(request.params.id);
        if (referrer_customer_id) {
            const refCustomer = await db.get('SELECT id, customer_name, crm_type FROM customers WHERE id = ?', [Number(referrer_customer_id)]);
            if (!refCustomer) return reply.code(404).send({ error: 'Không tìm thấy KH giới thiệu' });
            await db.run('UPDATE customers SET referrer_customer_id = ? WHERE id = ?', [refCustomer.id, customerId]);
            return { success: true, referrer_name: refCustomer.customer_name, referrer_crm: refCustomer.crm_type };
        } else {
            await db.run('UPDATE customers SET referrer_customer_id = NULL WHERE id = ?', [customerId]);
            return { success: true, message: 'Đã xóa người giới thiệu' };
        }
    });

    fastify.get('/api/customers/consult-stats', { preHandler: [authenticate] }, async (request, reply) => {
        const { customer_ids } = request.query;
        if (!customer_ids) return { stats: {} };
        const ids = customer_ids.split(',').map(Number).filter(n => !isNaN(n));
        if (ids.length === 0) return { stats: {} };

        const stats = {};
        for (const cid of ids) {
            const lastHoanThanh = await db.get("SELECT id FROM consultation_logs WHERE customer_id = ? AND log_type = 'hoan_thanh' ORDER BY id DESC LIMIT 1", [cid]);
            let consultCount;
            if (lastHoanThanh) {
                consultCount = (await db.get("SELECT COUNT(*) as cnt FROM consultation_logs WHERE customer_id = ? AND id > ?", [cid, lastHoanThanh.id]))?.cnt || 0;
            } else {
                consultCount = (await db.get('SELECT COUNT(*) as cnt FROM consultation_logs WHERE customer_id = ?', [cid]))?.cnt || 0;
            }
            const chotDon = (await db.get("SELECT COUNT(*) as cnt FROM order_codes WHERE customer_id = ? AND status != 'cancelled'", [cid]))?.cnt || 0;
            const lastLog = await db.get(`SELECT log_type, content, created_at FROM consultation_logs WHERE customer_id = ?
                ORDER BY created_at DESC, CASE WHEN log_type = 'hoan_thanh_cap_cuu' THEN 0 ELSE 1 END, id DESC LIMIT 1`, [cid]);
            const revenue = (await db.get("SELECT COALESCE(SUM(oi.total), 0) as t FROM order_items oi LEFT JOIN order_codes oc ON oi.order_code_id = oc.id WHERE oi.customer_id = ? AND (oc.status IS NULL OR oc.status != 'cancelled')", [cid]))?.t || 0;
            const latestOrderCode = await db.get('SELECT order_code FROM order_codes WHERE customer_id = ? ORDER BY id DESC LIMIT 1', [cid]);
            stats[cid] = { consultCount, chotDonCount: chotDon, lastLog, revenue, latestOrderCode: latestOrderCode?.order_code || null };
        }
        return { stats };
    });
};
