// ========== BỘ PHẬN CẮT — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow, vnFormat } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS cutting_records (
            id              SERIAL PRIMARY KEY,
            dht_order_id    INTEGER REFERENCES dht_orders(id) ON DELETE CASCADE,
            order_item_id   INTEGER,
            -- Trạng thái icon
            is_cutting      BOOLEAN DEFAULT false,
            cutting_at      TIMESTAMPTZ,
            cutting_by      INTEGER REFERENCES users(id),
            is_cut_done     BOOLEAN DEFAULT false,
            cut_done_at     TIMESTAMPTZ,
            cut_done_by     INTEGER REFERENCES users(id),
            salary_approved BOOLEAN DEFAULT false,
            salary_approved_at TIMESTAMPTZ,
            salary_approved_by INTEGER REFERENCES users(id),
            wash_reported   BOOLEAN DEFAULT false,
            wash_reported_at TIMESTAMPTZ,
            wash_reported_by INTEGER REFERENCES users(id),
            error_reported  BOOLEAN DEFAULT false,
            error_order_id  INTEGER,
            -- Thông tin cắt
            cut_date        DATE,
            cutter_id       INTEGER REFERENCES users(id),
            product_name    TEXT,
            material_name   TEXT,
            fabric_color    TEXT,
            order_quantity  INTEGER DEFAULT 0,
            cut_quantity    INTEGER DEFAULT 0,
            kg_cut          NUMERIC DEFAULT 0,
            cut_ratio       NUMERIC DEFAULT 0,
            ratio_reason    TEXT,
            kg_start        NUMERIC DEFAULT 0,
            kg_end          NUMERIC DEFAULT 0,
            cut_warning     TEXT,
            cut_shared      TEXT,
            created_by      INTEGER REFERENCES users(id),
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_cutting_order ON cutting_records(dht_order_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_cutting_cutter ON cutting_records(cutter_id)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_cutting_date ON cutting_records(cut_date)`);
    } catch(e) { console.error('[BPC] cutting_records:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS cutting_history (
            id              SERIAL PRIMARY KEY,
            cutting_id      INTEGER NOT NULL REFERENCES cutting_records(id) ON DELETE CASCADE,
            action          TEXT NOT NULL,
            details         TEXT,
            performed_by    INTEGER REFERENCES users(id),
            performed_at    TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_cutting_hist ON cutting_history(cutting_id)`);
    } catch(e) { console.error('[BPC] cutting_history:', e.message); }

    // ========== ACCESS CHECK ==========
    const CUT_MGMT_ROLES = ['giam_doc', 'quan_ly_cap_cao'];

    async function isCutManager(request) {
        if (CUT_MGMT_ROLES.includes(request.user.role)) return true;
        const dept = await db.get(
            `SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = $1`,
            [request.user.id]
        );
        if (dept && dept.name) {
            const n = dept.name.toLowerCase();
            if (n.includes('quản lý xưởng') || n.includes('quan ly xuong') || n.includes('qlx') || n.includes('cắt')) return true;
        }
        return false;
    }

    async function isCutter(request) {
        const dept = await db.get(
            `SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = $1`,
            [request.user.id]
        );
        if (dept && dept.name) {
            const n = dept.name.toLowerCase();
            if (n.includes('cắt') || n.includes('cat')) return true;
        }
        return false;
    }

    // ========== TREE: Sidebar data ==========
    fastify.get('/api/cutting/tree', { preHandler: [authenticate] }, async (request, reply) => {
        const isManager = await isCutManager(request);

        let where = '';
        const params = [];
        // NV chỉ xem đơn mình cắt
        if (!isManager && !['quan_ly', 'truong_phong'].includes(request.user.role)) {
            where = ' AND cr.cutter_id = $1';
            params.push(request.user.id);
        }

        const rows = await db.all(`
            SELECT
                EXTRACT(YEAR FROM COALESCE(cr.cut_date, cr.created_at))::int AS year,
                EXTRACT(MONTH FROM COALESCE(cr.cut_date, cr.created_at))::int AS month,
                cr.cutter_id,
                u.full_name AS cutter_name,
                COUNT(*)::int AS count
            FROM cutting_records cr
            LEFT JOIN users u ON cr.cutter_id = u.id
            WHERE 1=1 ${where}
            GROUP BY year, month, cr.cutter_id, u.full_name
            ORDER BY year DESC, month DESC, u.full_name
        `, params);

        const total = rows.reduce((s, r) => s + r.count, 0);

        // Build tree: year → month → cutter
        const yearMap = {};
        for (const r of rows) {
            if (!yearMap[r.year]) yearMap[r.year] = { year: r.year, count: 0, months: {} };
            if (!yearMap[r.year].months[r.month]) yearMap[r.year].months[r.month] = { month: r.month, count: 0, cutters: [] };
            yearMap[r.year].months[r.month].cutters.push({
                id: r.cutter_id,
                name: r.cutter_name || 'Chưa phân công',
                count: r.count
            });
            yearMap[r.year].months[r.month].count += r.count;
            yearMap[r.year].count += r.count;
        }

        // Convert to arrays
        const tree = Object.values(yearMap).map(y => ({
            ...y,
            months: Object.values(y.months)
        }));

        // Count stats
        const stats = await db.get(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE cr.is_cutting AND NOT cr.is_cut_done)::int AS cutting,
                COUNT(*) FILTER (WHERE cr.is_cut_done)::int AS done,
                COUNT(*) FILTER (WHERE cr.salary_approved)::int AS approved
            FROM cutting_records cr
            WHERE 1=1 ${where}
        `, params);

        return { tree, total, stats: stats || { total: 0, cutting: 0, done: 0, approved: 0 } };
    });

    // ========== LIST: Records with filters ==========
    fastify.get('/api/cutting/records', { preHandler: [authenticate] }, async (request, reply) => {
        const isManager = await isCutManager(request);
        const { year, month, cutter_id, status, search } = request.query;

        let where = 'WHERE 1=1';
        const params = [];
        let idx = 1;

        // NV chỉ xem đơn mình
        if (!isManager && !['quan_ly', 'truong_phong'].includes(request.user.role)) {
            where += ` AND cr.cutter_id = $${idx++}`;
            params.push(request.user.id);
        }

        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(cr.cut_date, cr.created_at)) = $${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(cr.cut_date, cr.created_at)) = $${idx++}`; params.push(Number(month)); }
        if (cutter_id) { where += ` AND cr.cutter_id = $${idx++}`; params.push(Number(cutter_id)); }
        if (status === 'cutting') { where += ` AND cr.is_cutting = true AND cr.is_cut_done = false`; }
        else if (status === 'done') { where += ` AND cr.is_cut_done = true`; }
        else if (status === 'approved') { where += ` AND cr.salary_approved = true`; }
        if (search) {
            where += ` AND (cr.product_name ILIKE $${idx} OR cr.material_name ILIKE $${idx} OR o.order_code ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        const records = await db.all(`
            SELECT cr.*,
                   u_cutter.full_name AS cutter_name,
                   u_done.full_name AS cut_done_by_name,
                   u_salary.full_name AS salary_approved_by_name,
                   u_wash.full_name AS wash_reported_by_name,
                   o.order_code,
                   -- Last history
                   lh.details AS last_update_detail,
                   lh.performed_at AS last_update_at,
                   lh_user.full_name AS last_update_by
            FROM cutting_records cr
            LEFT JOIN users u_cutter ON cr.cutter_id = u_cutter.id
            LEFT JOIN users u_done ON cr.cut_done_by = u_done.id
            LEFT JOIN users u_salary ON cr.salary_approved_by = u_salary.id
            LEFT JOIN users u_wash ON cr.wash_reported_by = u_wash.id
            LEFT JOIN dht_orders o ON cr.dht_order_id = o.id
            LEFT JOIN LATERAL (
                SELECT h.details, h.performed_at, h.performed_by
                FROM cutting_history h WHERE h.cutting_id = cr.id
                ORDER BY h.performed_at DESC LIMIT 1
            ) lh ON true
            LEFT JOIN users lh_user ON lh.performed_by = lh_user.id
            ${where}
            ORDER BY cr.cut_date DESC NULLS LAST, cr.created_at DESC
        `, params);

        return { records };
    });

    // ========== CREATE: Tạo record cắt mới ==========
    fastify.post('/api/cutting/records', { preHandler: [authenticate] }, async (request, reply) => {
        const b = request.body || {};
        const now = vnNow();

        const result = await db.get(`
            INSERT INTO cutting_records (
                dht_order_id, order_item_id, cut_date, cutter_id,
                product_name, material_name, fabric_color,
                order_quantity, cut_quantity, kg_cut, cut_ratio,
                ratio_reason, kg_start, kg_end, cut_warning, cut_shared,
                created_by, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
            RETURNING id
        `, [
            b.dht_order_id || null,
            b.order_item_id || null,
            b.cut_date || null,
            b.cutter_id || request.user.id,
            b.product_name || null,
            b.material_name || null,
            b.fabric_color || null,
            Number(b.order_quantity) || 0,
            Number(b.cut_quantity) || 0,
            Number(b.kg_cut) || 0,
            Number(b.cut_ratio) || 0,
            b.ratio_reason || null,
            Number(b.kg_start) || 0,
            Number(b.kg_end) || 0,
            b.cut_warning || null,
            b.cut_shared || null,
            request.user.id,
            now
        ]);

        await db.run(`INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [result.id, 'create', 'Tạo record cắt mới', request.user.id, now]);

        return { success: true, id: result.id };
    });

    // ========== TOGGLE: Toggle icon states ==========
    fastify.post('/api/cutting/toggle/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const { action } = request.body || {};
        const now = vnNow();

        const rec = await db.get('SELECT * FROM cutting_records WHERE id = $1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });

        let detail = '';

        if (action === 'start_cutting') {
            await db.run(`UPDATE cutting_records SET is_cutting = true, cutting_at = $1, cutting_by = $2, updated_at = $1 WHERE id = $3`,
                [now, request.user.id, id]);
            detail = '✂️ Bắt đầu cắt';
        } else if (action === 'undo_cutting') {
            await db.run(`UPDATE cutting_records SET is_cutting = false, cutting_at = NULL, cutting_by = NULL, updated_at = $1 WHERE id = $2`,
                [now, id]);
            detail = '↩️ Hoàn tác bắt đầu cắt';
        } else if (action === 'cut_done') {
            await db.run(`UPDATE cutting_records SET is_cut_done = true, cut_done_at = $1, cut_done_by = $2, is_cutting = true, cutting_at = COALESCE(cutting_at, $1), updated_at = $1 WHERE id = $3`,
                [now, request.user.id, id]);
            detail = '✅ Cắt xong';
        } else if (action === 'undo_cut_done') {
            await db.run(`UPDATE cutting_records SET is_cut_done = false, cut_done_at = NULL, cut_done_by = NULL, updated_at = $1 WHERE id = $2`,
                [now, id]);
            detail = '↩️ Hoàn tác cắt xong';
        } else if (action === 'approve_salary') {
            const isManager = await isCutManager(request);
            if (!isManager) return reply.code(403).send({ error: 'Chỉ QLX/GĐ mới duyệt lương' });
            await db.run(`UPDATE cutting_records SET salary_approved = true, salary_approved_at = $1, salary_approved_by = $2, updated_at = $1 WHERE id = $3`,
                [now, request.user.id, id]);
            detail = '💰 Duyệt lương cắt';
        } else if (action === 'undo_approve_salary') {
            const isManager = await isCutManager(request);
            if (!isManager) return reply.code(403).send({ error: 'Không có quyền' });
            await db.run(`UPDATE cutting_records SET salary_approved = false, salary_approved_at = NULL, salary_approved_by = NULL, updated_at = $1 WHERE id = $2`,
                [now, id]);
            detail = '↩️ Hoàn tác duyệt lương';
        } else if (action === 'report_wash') {
            await db.run(`UPDATE cutting_records SET wash_reported = true, wash_reported_at = $1, wash_reported_by = $2, updated_at = $1 WHERE id = $3`,
                [now, request.user.id, id]);
            detail = '🫧 Báo giặt vải';
        } else if (action === 'undo_wash') {
            await db.run(`UPDATE cutting_records SET wash_reported = false, wash_reported_at = NULL, wash_reported_by = NULL, updated_at = $1 WHERE id = $2`,
                [now, id]);
            detail = '↩️ Hoàn tác báo giặt';
        } else if (action === 'report_error') {
            await db.run(`UPDATE cutting_records SET error_reported = true, error_order_id = $1, updated_at = $2 WHERE id = $3`,
                [request.body.error_order_id || null, now, id]);
            detail = '⚠️ Báo đơn lỗi nội bộ';
        } else {
            return reply.code(400).send({ error: 'Action không hợp lệ' });
        }

        await db.run(`INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, action, detail, request.user.id, now]);

        return { success: true };
    });

    // ========== UPDATE: Cập nhật thông tin cắt ==========
    fastify.put('/api/cutting/records/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const b = request.body || {};
        const now = vnNow();

        const rec = await db.get('SELECT * FROM cutting_records WHERE id = $1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });

        // Auto-calculate kg_cut from kg_start - kg_end
        const kgStart = Number(b.kg_start) || 0;
        const kgEnd = Number(b.kg_end) || 0;
        const kgCut = kgStart > 0 && kgEnd >= 0 ? kgStart - kgEnd : (Number(b.kg_cut) || 0);

        // Auto-calculate cut_ratio
        const cutQty = Number(b.cut_quantity) || 0;
        const cutRatio = cutQty > 0 && kgCut > 0 ? Number((kgCut / cutQty).toFixed(2)) : (Number(b.cut_ratio) || 0);

        await db.run(`
            UPDATE cutting_records SET
                cut_date = $1, cutter_id = $2, product_name = $3,
                material_name = $4, fabric_color = $5, order_quantity = $6,
                cut_quantity = $7, kg_cut = $8, cut_ratio = $9,
                ratio_reason = $10, kg_start = $11, kg_end = $12,
                cut_warning = $13, cut_shared = $14, updated_at = $15
            WHERE id = $16
        `, [
            b.cut_date || rec.cut_date,
            b.cutter_id || rec.cutter_id,
            b.product_name !== undefined ? b.product_name : rec.product_name,
            b.material_name !== undefined ? b.material_name : rec.material_name,
            b.fabric_color !== undefined ? b.fabric_color : rec.fabric_color,
            Number(b.order_quantity) || rec.order_quantity,
            cutQty || rec.cut_quantity,
            kgCut,
            cutRatio,
            b.ratio_reason !== undefined ? b.ratio_reason : rec.ratio_reason,
            kgStart || rec.kg_start,
            kgEnd !== undefined ? kgEnd : rec.kg_end,
            b.cut_warning !== undefined ? b.cut_warning : rec.cut_warning,
            b.cut_shared !== undefined ? b.cut_shared : rec.cut_shared,
            now, id
        ]);

        // Build change detail
        const changes = [];
        if (b.cut_quantity && Number(b.cut_quantity) !== rec.cut_quantity) changes.push(`SL cắt: ${rec.cut_quantity}→${b.cut_quantity}`);
        if (b.kg_start && Number(b.kg_start) !== Number(rec.kg_start)) changes.push(`Kg đầu: ${rec.kg_start}→${b.kg_start}`);
        if (b.kg_end !== undefined && Number(b.kg_end) !== Number(rec.kg_end)) changes.push(`Kg cuối: ${rec.kg_end}→${b.kg_end}`);
        const changeStr = changes.length > 0 ? changes.join(', ') : 'Cập nhật thông tin cắt';

        await db.run(`INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', changeStr, request.user.id, now]);

        return { success: true, kg_cut: kgCut, cut_ratio: cutRatio };
    });

    // ========== INLINE: Quick field update (mobile) ==========
    fastify.patch('/api/cutting/records/:id/field', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const { field, value } = request.body || {};
        const now = vnNow();

        const ALLOWED = [
            'cut_date', 'cutter_id', 'product_name', 'material_name', 'fabric_color',
            'order_quantity', 'cut_quantity', 'kg_cut', 'cut_ratio', 'ratio_reason',
            'kg_start', 'kg_end', 'cut_warning', 'cut_shared'
        ];
        if (!ALLOWED.includes(field)) return reply.code(400).send({ error: 'Trường không hợp lệ' });

        const numericFields = ['order_quantity', 'cut_quantity', 'kg_cut', 'cut_ratio', 'kg_start', 'kg_end', 'cutter_id'];
        const finalValue = numericFields.includes(field) ? (Number(value) || 0) : (value || null);

        await db.run(`UPDATE cutting_records SET ${field} = $1, updated_at = $2 WHERE id = $3`, [finalValue, now, id]);

        // If kg_start or kg_end changed, recalculate kg_cut and cut_ratio
        if (field === 'kg_start' || field === 'kg_end') {
            const rec = await db.get('SELECT kg_start, kg_end, cut_quantity FROM cutting_records WHERE id = $1', [id]);
            if (rec) {
                const kgCut = Number(rec.kg_start) - Number(rec.kg_end);
                const cutRatio = rec.cut_quantity > 0 && kgCut > 0 ? Number((kgCut / rec.cut_quantity).toFixed(2)) : 0;
                await db.run(`UPDATE cutting_records SET kg_cut = $1, cut_ratio = $2 WHERE id = $3`, [kgCut > 0 ? kgCut : 0, cutRatio, id]);
            }
        }

        await db.run(`INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'inline_update', `${field}: ${value}`, request.user.id, now]);

        return { success: true };
    });

    // ========== DELETE: Xóa record ==========
    fastify.delete('/api/cutting/records/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const isManager = await isCutManager(request);
        if (!isManager) return reply.code(403).send({ error: 'Chỉ QLX/GĐ mới xóa được' });

        await db.run('DELETE FROM cutting_records WHERE id = $1', [Number(request.params.id)]);
        return { success: true };
    });

    // ========== HISTORY: Lịch sử cập nhật ==========
    fastify.get('/api/cutting/history/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`
            SELECT h.*, u.full_name AS performer_name
            FROM cutting_history h
            LEFT JOIN users u ON h.performed_by = u.id
            WHERE h.cutting_id = $1
            ORDER BY h.performed_at DESC
            LIMIT 50
        `, [Number(request.params.id)]);

        return { history: rows };
    });

    // ========== STAFF: DS nhân viên phòng cắt ==========
    fastify.get('/api/cutting/staff', { preHandler: [authenticate] }, async (request, reply) => {
        const staff = await db.all(`
            SELECT u.id, u.full_name, u.username, d.name AS dept_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.status = 'active'
              AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
            ORDER BY u.full_name
        `);
        return { staff };
    });

    // ========== MOBILE: Serve standalone mobile page ==========
    fastify.get('/m/bophancat', async (request, reply) => {
        return reply.type('text/html').sendFile('mobile-bophancat.html');
    });
};
