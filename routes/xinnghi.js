const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

async function xinnghiRoutes(fastify, options) {

    // ========== COLLEAGUES (dropdown bàn giao) ==========
    fastify.get('/api/leave/colleagues', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
        if (!user || !user.department_id) return { colleagues: [] };

        // Get users in same department (excluding self)
        const colleagues = await db.all(
            `SELECT id, full_name, username FROM users 
             WHERE department_id = $1 AND id != $2 AND status = 'active'
             ORDER BY full_name`,
            [user.department_id, userId]
        );
        return { colleagues };
    });

    // ========== SUBMIT LEAVE REQUEST ==========
    fastify.post('/api/leave/request', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);

        const parts = request.parts();
        let fields = {};
        let proofPath = '';

        for await (const part of parts) {
            if (part.file) {
                // Save uploaded file (with compression)
                const uploadsDir = path.join(__dirname, '..', 'uploads', 'leave');
                if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                const { compressImage } = require('../utils/imageCompressor');
                const chunks = [];
                for await (const chunk of part.file) chunks.push(chunk);
                let fileBuffer = Buffer.concat(chunks);
                fileBuffer = await compressImage(fileBuffer, { maxWidth: 1200, quality: 80 });
                const filename = `leave_${userId}_${Date.now()}.jpg`;
                const filepath = path.join(uploadsDir, filename);
                fs.writeFileSync(filepath, fileBuffer);
                proofPath = `/uploads/leave/${filename}`;
            } else {
                fields[part.fieldname] = part.value;
            }
        }

        const { date_from, date_to, first_day_session, last_day_session, reason, handover_user_id } = fields;

        if (!date_from || !date_to || !reason) {
            return reply.code(400).send({ error: 'Vui lòng điền đầy đủ thông tin' });
        }
        if (!proofPath) {
            return reply.code(400).send({ error: 'Vui lòng upload ảnh xin phép quản lý' });
        }

        // Calculate total days
        const from = new Date(date_from);
        const to = new Date(date_to);
        if (from > to) {
            return reply.code(400).send({ error: 'Ngày bắt đầu phải trước ngày kết thúc' });
        }

        const diffDays = Math.round((to - from) / (1000 * 60 * 60 * 24));
        let totalDays = 0;

        if (diffDays === 0) {
            // Same day
            const s = first_day_session || 'full';
            totalDays = s === 'full' ? 1 : 0.5;
        } else {
            // First day
            const fs_session = first_day_session || 'full';
            totalDays += fs_session === 'full' ? 1 : 0.5;
            // Middle days
            totalDays += Math.max(0, diffDays - 1);
            // Last day
            const ls_session = last_day_session || 'full';
            totalDays += ls_session === 'full' ? 1 : 0.5;
        }

        const result = await db.get(
            `INSERT INTO leave_requests (user_id, department_id, date_from, date_to, first_day_session, last_day_session, total_days, reason, handover_user_id, proof_image)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [userId, user?.department_id, date_from, date_to,
             first_day_session || 'full', last_day_session || 'full',
             totalDays, reason.trim(),
             handover_user_id ? Number(handover_user_id) : null,
             proofPath]
        );

        return { success: true, id: result.id, total_days: totalDays, message: `Đã gửi đơn xin nghỉ ${totalDays} buổi` };
    });

    // ========== MY HISTORY ==========
    fastify.get('/api/leave/my-history', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const month = request.query.month; // YYYY-MM

        let whereExtra = '';
        let params = [userId];

        if (month) {
            const [y, m] = month.split('-').map(Number);
            const monthStart = `${month}-01`;
            const lastDay = new Date(y, m, 0).getDate();
            const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
            whereExtra = ' AND lr.date_from <= $3 AND lr.date_to >= $2';
            params.push(monthStart, monthEnd);
        }

        const history = await db.all(
            `SELECT lr.*, lr.date_from::text as date_from, lr.date_to::text as date_to,
                    h.full_name as handover_name
             FROM leave_requests lr
             LEFT JOIN users h ON lr.handover_user_id = h.id
             WHERE lr.user_id = $1${whereExtra}
             ORDER BY lr.date_from DESC`,
            params
        );

        const totalActive = history.filter(h => h.status === 'active').reduce((s, h) => s + parseFloat(h.total_days), 0);

        return { history, total_days: totalActive };
    });

    // ========== CANCEL ==========
    fastify.post('/api/leave/cancel/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const leaveId = Number(request.params.id);

        const lr = await db.get('SELECT * FROM leave_requests WHERE id = $1 AND user_id = $2', [leaveId, userId]);
        if (!lr) return reply.code(404).send({ error: 'Không tìm thấy đơn' });
        if (lr.status === 'cancelled') return reply.code(400).send({ error: 'Đơn đã hủy' });

        // Check before leave date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(lr.date_from) <= today) {
            return reply.code(400).send({ error: 'Không thể hủy đơn nghỉ đã qua hoặc trong ngày nghỉ' });
        }

        await db.run(
            "UPDATE leave_requests SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1",
            [leaveId]
        );

        return { success: true, message: 'Đã hủy đơn xin nghỉ' };
    });

    // ========== STATS (GĐ/QL) ==========
    fastify.get('/api/leave/stats', { preHandler: [authenticate] }, async (request, reply) => {
        const userId = request.user.id;
        const userRole = request.user.role;
        const month = request.query.month; // YYYY-MM

        if (!month) return reply.code(400).send({ error: 'Thiếu tháng' });

        const [y, m] = month.split('-').map(Number);
        const monthStart = `${month}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

        let deptFilter = '';
        let params = [monthStart, monthEnd];

        if (userRole === 'giam_doc') {
            // See all
        } else if (['quan_ly', 'truong_phong', 'quan_ly_cap_cao'].includes(userRole)) {
            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            if (!user || !user.department_id) return { stats: [], departments: [] };

            const deptIds = [user.department_id];
            const children = await db.all('SELECT id FROM departments WHERE parent_id = $1', [user.department_id]);
            children.forEach(c => deptIds.push(c.id));
            for (const child of children) {
                const gc = await db.all('SELECT id FROM departments WHERE parent_id = $1', [child.id]);
                gc.forEach(g => deptIds.push(g.id));
            }

            const placeholders = deptIds.map((_, i) => `$${i + 3}`).join(',');
            deptFilter = ` AND lr.department_id IN (${placeholders})`;
            params.push(...deptIds);
        } else {
            return reply.code(403).send({ error: 'Không có quyền' });
        }

        const stats = await db.all(
            `SELECT lr.*, lr.date_from::text as date_from, lr.date_to::text as date_to,
                    u.full_name as user_name, u.username,
                    d.name as dept_name,
                    h.full_name as handover_name
             FROM leave_requests lr
             LEFT JOIN users u ON lr.user_id = u.id
             LEFT JOIN departments d ON lr.department_id = d.id
             LEFT JOIN users h ON lr.handover_user_id = h.id
             WHERE lr.status = 'active' AND lr.date_from <= $2 AND lr.date_to >= $1${deptFilter}
             ORDER BY d.name, u.full_name, lr.date_from`,
            params
        );

        return { stats };
    });
}

module.exports = xinnghiRoutes;
