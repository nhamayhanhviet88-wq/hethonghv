// ========== WORK TICKETS — Phiếu Yêu Cầu Xử Lý CV ==========
const db = require('../db/pool');
const { vnNow } = require('../utils/timezone');

async function routes(fastify) {
    const { authenticate } = require('../middleware/auth');

    // ========== INIT TABLE ==========
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS work_tickets (
            id SERIAL PRIMARY KEY,
            ticket_code VARCHAR(20) UNIQUE NOT NULL,
            type VARCHAR(20) NOT NULL DEFAULT 'custom',
            order_id INTEGER,
            order_code VARCHAR(50),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            priority VARCHAR(20) DEFAULT 'CHUẨN',
            status VARCHAR(20) DEFAULT 'pending',
            created_by INTEGER NOT NULL REFERENCES users(id),
            assigned_to INTEGER NOT NULL REFERENCES users(id),
            resolved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS work_ticket_replies (
            id SERIAL PRIMARY KEY,
            ticket_id INTEGER NOT NULL REFERENCES work_tickets(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id),
            message TEXT NOT NULL,
            attachments JSONB DEFAULT '[]',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
    } catch(e) { /* tables exist */ }
    // Add due_date column if missing
    try { await db.exec(`ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS due_date DATE`); } catch(e) {}

    // ========== GET /api/work-tickets/staff — All staff for sidebar ==========
    fastify.get('/api/work-tickets/staff', { preHandler: authenticate }, async (request) => {
        const departments = await db.all(`
            SELECT id, name, parent_id, head_user_id
            FROM departments
            ORDER BY display_order, name
        `);
        const users = await db.all(`
            SELECT id, full_name, username, role, department_id
            FROM users
            WHERE status = 'active' AND role != 'hoa_hong'
            ORDER BY full_name
        `);
        return { departments, users };
    });

    // ========== GET /api/work-tickets/stats — Dashboard stats ==========
    fastify.get('/api/work-tickets/stats', { preHandler: authenticate }, async (request) => {
        const userId = request.user.id;
        const role = request.user.role;
        const isAdmin = ['giam_doc', 'quan_ly_cap_cao'].includes(role);

        let where = isAdmin ? '1=1' : `(t.created_by = ${userId} OR t.assigned_to = ${userId})`;
        const todayVN = vnNow().toISOString().slice(0, 10);

        const stats = await db.get(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress') AND COALESCE(t.due_date, t.created_at::date) = '${todayVN}'::date)::int AS today_due,
                COUNT(*) FILTER (WHERE t.status IN ('resolved','closed') AND (t.resolved_at::date = '${todayVN}'::date OR t.updated_at::date = '${todayVN}'::date))::int AS today_resolved,
                COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress') AND COALESCE(t.due_date, t.created_at::date) < '${todayVN}'::date)::int AS overdue,
                COUNT(*) FILTER (WHERE t.status = 'pending')::int AS pending,
                COUNT(*) FILTER (WHERE t.status = 'in_progress')::int AS in_progress,
                COUNT(*) FILTER (WHERE t.status IN ('resolved','closed'))::int AS completed,
                COUNT(*) FILTER (WHERE t.status = 'resolved')::int AS resolved,
                COUNT(*) FILTER (WHERE t.status = 'closed')::int AS closed,
                COUNT(*) FILTER (WHERE t.created_by = ${userId})::int AS my_created,
                COUNT(*) FILTER (WHERE t.assigned_to = ${userId} AND t.status IN ('pending','in_progress'))::int AS my_assigned
            FROM work_tickets t
            WHERE ${where}
        `);
        return { stats };
    });

    // ========== GET /api/work-tickets — List tickets ==========
    fastify.get('/api/work-tickets', { preHandler: authenticate }, async (request) => {
        const { status, user_id, search, page = 1 } = request.query;
        const userId = request.user.id;
        const role = request.user.role;
        const isAdmin = ['giam_doc', 'quan_ly_cap_cao'].includes(role);
        const perPage = 50;

        let conditions = [];
        if (!isAdmin) {
            conditions.push(`(t.created_by = ${userId} OR t.assigned_to = ${userId})`);
        }
        if (status && status !== 'all') {
            const todayVN = vnNow().toISOString().slice(0, 10);
            if (status === 'today_due') {
                // Phiếu pending/in_progress được tạo hôm nay
                conditions.push(`t.status IN ('pending','in_progress') AND COALESCE(t.due_date, t.created_at::date) = '${todayVN}'::date`);
            } else if (status === 'today_resolved') {
                // Phiếu đã xử lý/đóng trong ngày hôm nay
                conditions.push(`t.status IN ('resolved','closed') AND (t.resolved_at::date = '${todayVN}'::date OR t.updated_at::date = '${todayVN}'::date)`);
            } else if (status === 'overdue') {
                // Phiếu pending/in_progress tạo trước hôm nay → trễ
                conditions.push(`t.status IN ('pending','in_progress') AND COALESCE(t.due_date, t.created_at::date) < '${todayVN}'::date`);
            } else if (status === 'completed') {
                // Tổng phiếu đã resolved hoặc closed
                conditions.push(`t.status IN ('resolved','closed')`);
            } else {
                conditions.push(`t.status = '${status.replace(/'/g, '')}'`);
            }
        }
        if (user_id) {
            conditions.push(`(t.created_by = ${parseInt(user_id)} OR t.assigned_to = ${parseInt(user_id)})`);
        }
        if (search) {
            const q = search.replace(/'/g, "''").toLowerCase();
            conditions.push(`(LOWER(t.ticket_code) LIKE '%${q}%' OR LOWER(t.title) LIKE '%${q}%' OR LOWER(t.order_code) LIKE '%${q}%')`);
        }

        const where = conditions.length ? conditions.join(' AND ') : '1=1';
        const offset = (parseInt(page) - 1) * perPage;

        const tickets = await db.all(`
            SELECT t.*,
                uc.full_name AS created_by_name,
                ua.full_name AS assigned_to_name,
                (SELECT COUNT(*)::int FROM work_ticket_replies r WHERE r.ticket_id = t.id) AS reply_count
            FROM work_tickets t
            LEFT JOIN users uc ON uc.id = t.created_by
            LEFT JOIN users ua ON ua.id = t.assigned_to
            WHERE ${where}
            ORDER BY
                CASE t.status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'resolved' THEN 2 ELSE 3 END,
                CASE t.priority WHEN 'GẤP' THEN 0 ELSE 1 END,
                t.created_at DESC
            LIMIT ${perPage} OFFSET ${offset}
        `);

        const countRow = await db.get(`SELECT COUNT(*)::int AS total FROM work_tickets t WHERE ${where}`);

        return { tickets, total: countRow.total, page: parseInt(page), perPage };
    });

    // ========== POST /api/work-tickets — Create ticket ==========
    fastify.post('/api/work-tickets', { preHandler: authenticate }, async (request) => {
        const { type, order_id, order_code, title, description, priority, assigned_to, due_date } = request.body;
        const userId = request.user.id;

        if (!title || !title.trim()) return { error: 'Tiêu đề không được để trống' };
        if (!assigned_to) return { error: 'Vui lòng chọn người nhận' };

        // Generate ticket code
        const last = await db.get(`SELECT ticket_code FROM work_tickets ORDER BY id DESC LIMIT 1`);
        let nextNum = 1;
        if (last && last.ticket_code) {
            const match = last.ticket_code.match(/PHIEUHV(\d+)/);
            if (match) nextNum = parseInt(match[1]) + 1;
        }
        const ticketCode = 'PHIEUHV' + String(nextNum).padStart(4, '0');

        await db.run(`
            INSERT INTO work_tickets (ticket_code, type, order_id, order_code, title, description, priority, status, created_by, assigned_to, due_date, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11,$11)
        `, [ticketCode, type || 'custom', order_id || null, order_code || null, title.trim(), description || '', priority || 'CHUẨN', userId, parseInt(assigned_to), due_date || null, vnNow()]);

        return { success: true, ticket_code: ticketCode, message: '✅ Đã tạo phiếu ' + ticketCode };
    });

    // ========== GET /api/work-tickets/:id — Ticket detail ==========
    fastify.get('/api/work-tickets/:id', { preHandler: authenticate }, async (request) => {
        const { id } = request.params;
        const ticket = await db.get(`
            SELECT t.*,
                uc.full_name AS created_by_name,
                ua.full_name AS assigned_to_name
            FROM work_tickets t
            LEFT JOIN users uc ON uc.id = t.created_by
            LEFT JOIN users ua ON ua.id = t.assigned_to
            WHERE t.id = $1
        `, [id]);
        if (!ticket) return { error: 'Không tìm thấy phiếu' };

        const replies = await db.all(`
            SELECT r.*, u.full_name AS user_name
            FROM work_ticket_replies r
            LEFT JOIN users u ON u.id = r.user_id
            WHERE r.ticket_id = $1
            ORDER BY r.created_at ASC
        `, [id]);

        return { ticket, replies };
    });

    // ========== POST /api/work-tickets/:id/reply — Add reply ==========
    fastify.post('/api/work-tickets/:id/reply', { preHandler: authenticate }, async (request) => {
        const { id } = request.params;
        const { message } = request.body;
        const userId = request.user.id;

        if (!message || !message.trim()) return { error: 'Nội dung không được để trống' };

        await db.run(`
            INSERT INTO work_ticket_replies (ticket_id, user_id, message, created_at)
            VALUES ($1, $2, $3, $4)
        `, [id, userId, message.trim(), vnNow()]);

        // Auto update status to in_progress if still pending
        await db.run(`UPDATE work_tickets SET status = 'in_progress', updated_at = $2 WHERE id = $1 AND status = 'pending'`, [id, vnNow()]);

        return { success: true, message: '✅ Đã phản hồi' };
    });

    // ========== PUT /api/work-tickets/:id/status — Update status ==========
    fastify.put('/api/work-tickets/:id/status', { preHandler: authenticate }, async (request) => {
        const { id } = request.params;
        const { status, due_date } = request.body;
        const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) return { error: 'Trạng thái không hợp lệ' };

        const now = vnNow().toISOString();
        const updates = [`status = '${status}'`, `updated_at = '${now}'`];
        if (status === 'resolved') updates.push(`resolved_at = '${now}'`);
        // Support due_date update (null to clear, or date string)
        if (due_date !== undefined) {
            updates.push(due_date ? `due_date = '${due_date}'` : `due_date = NULL`);
        }

        await db.run(`UPDATE work_tickets SET ${updates.join(', ')} WHERE id = $1`, [id]);

        const labels = { pending: 'Chờ Xử Lý', in_progress: 'Đang Xử Lý', resolved: 'Đã Xử Lý', closed: 'Đã Đóng' };
        return { success: true, message: '✅ Đã chuyển: ' + labels[status] };
    });

    // ========== GET /api/work-tickets/search-orders — Search orders for linking ==========
    fastify.get('/api/work-tickets/search-orders', { preHandler: authenticate }, async (request) => {
        const { q } = request.query;
        if (!q || q.length < 2) return { orders: [] };
        const search = q.replace(/'/g, "''").toLowerCase();
        const orders = await db.all(`
            SELECT id, order_code, customer_name, customer_phone
            FROM orders
            WHERE LOWER(order_code) LIKE '%${search}%' OR LOWER(customer_name) LIKE '%${search}%'
            ORDER BY id DESC LIMIT 20
        `);
        return { orders };
    });
}

module.exports = routes;
