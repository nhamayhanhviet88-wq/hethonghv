// ========== ĐƠN HÀNG TỔNG (DHT) — Routes ==========
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

module.exports = async function(fastify) {

    // ========== CATEGORIES: CRUD Lĩnh Vực ==========
    fastify.get('/api/dht/categories', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all('SELECT * FROM dht_categories ORDER BY display_order ASC, id ASC');
        return { categories: rows };
    });

    // Reorder categories (must be before :id route)
    fastify.put('/api/dht/categories/reorder', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { ids } = request.body || {};
        if (!Array.isArray(ids) || ids.length === 0) return reply.code(400).send({ error: 'Danh sách không hợp lệ' });
        for (let i = 0; i < ids.length; i++) {
            await db.run('UPDATE dht_categories SET display_order = $1 WHERE id = $2', [i + 1, Number(ids[i])]);
        }
        return { success: true };
    });

    fastify.post('/api/dht/categories', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { name } = request.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Vui lòng nhập tên lĩnh vực' });
        const maxOrder = await db.get('SELECT COALESCE(MAX(display_order), 0) as mx FROM dht_categories');
        const result = await db.get(
            'INSERT INTO dht_categories (name, display_order) VALUES ($1, $2) RETURNING *',
            [name.trim(), (maxOrder?.mx || 0) + 1]
        );
        return { success: true, category: result };
    });

    fastify.put('/api/dht/categories/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { name } = request.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Vui lòng nhập tên' });
        await db.run('UPDATE dht_categories SET name = $1 WHERE id = $2', [name.trim(), Number(request.params.id)]);
        return { success: true };
    });

    fastify.delete('/api/dht/categories/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const catId = Number(request.params.id);
        const used = await db.get('SELECT COUNT(*) as cnt FROM dht_orders WHERE category_id = $1', [catId]);
        if (used && used.cnt > 0) {
            return reply.code(400).send({ error: `Lĩnh vực này đang có ${used.cnt} đơn hàng. Không thể xóa.` });
        }
        await db.run('DELETE FROM dht_categories WHERE id = $1', [catId]);
        return { success: true };
    });

    // ========== STAFF LIST for CSKH dropdown ==========
    fastify.get('/api/dht/staff', { preHandler: [authenticate] }, async (request, reply) => {
        const staff = await db.all(`
            SELECT id, full_name, username, role
            FROM users
            WHERE status = 'active'
              AND role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
            ORDER BY full_name
        `);
        return { staff };
    });

    // ========== TREE: Sidebar data ==========
    fastify.get('/api/dht/tree', { preHandler: [authenticate] }, async (request, reply) => {
        // Group by year → category → month → day with revenue
        const rows = await db.all(`
            SELECT 
                EXTRACT(YEAR FROM o.order_date)::int AS year,
                EXTRACT(MONTH FROM o.order_date)::int AS month,
                EXTRACT(DAY FROM o.order_date)::int AS day,
                o.category_id,
                c.name AS category_name,
                COALESCE(SUM(o.total_amount), 0)::numeric AS revenue,
                COUNT(*)::int AS order_count
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            GROUP BY year, month, day, o.category_id, c.name
            ORDER BY year DESC, month DESC, day DESC
        `);

        // Build tree: year → categories → months → days
        const yearMap = {};
        for (const r of rows) {
            const y = r.year;
            if (!yearMap[y]) yearMap[y] = { year: y, total: 0, count: 0, categories: {} };

            const catId = r.category_id || 0;
            const catName = r.category_name || 'Chưa phân loại';
            if (!yearMap[y].categories[catId]) {
                yearMap[y].categories[catId] = { id: catId, name: catName, total: 0, count: 0, months: {} };
            }

            const m = r.month;
            if (!yearMap[y].categories[catId].months[m]) {
                yearMap[y].categories[catId].months[m] = { month: m, total: 0, count: 0, days: [] };
            }

            const rev = Number(r.revenue);
            const cnt = Number(r.order_count);
            yearMap[y].categories[catId].months[m].days.push({ day: r.day, total: rev, count: cnt });
            yearMap[y].categories[catId].months[m].total += rev;
            yearMap[y].categories[catId].months[m].count += cnt;
            yearMap[y].categories[catId].total += rev;
            yearMap[y].categories[catId].count += cnt;
            yearMap[y].total += rev;
            yearMap[y].count += cnt;
        }

        // Convert to sorted arrays
        const tree = Object.values(yearMap)
            .sort((a, b) => b.year - a.year)
            .map(y => ({
                ...y,
                categories: Object.values(y.categories)
                    .sort((a, b) => b.total - a.total)
                    .map(c => ({
                        ...c,
                        months: Object.values(c.months)
                            .sort((a, b) => b.month - a.month)
                            .map(m => ({ ...m, days: m.days.sort((a, b) => b.day - a.day) }))
                    }))
            }));

        // Grand total
        const grandTotal = tree.reduce((s, y) => s + y.total, 0);
        const grandCount = tree.reduce((s, y) => s + y.count, 0);

        return { tree, grandTotal, grandCount };
    });

    // ========== ORDERS: List with filters ==========
    fastify.get('/api/dht/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const { year, month, day, category_id, search } = request.query;

        let where = 'WHERE 1=1';
        const params = [];
        let idx = 1;

        if (year) { where += ` AND EXTRACT(YEAR FROM o.order_date) = $${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM o.order_date) = $${idx++}`; params.push(Number(month)); }
        if (day) { where += ` AND EXTRACT(DAY FROM o.order_date) = $${idx++}`; params.push(Number(day)); }
        if (category_id) { where += ` AND o.category_id = $${idx++}`; params.push(Number(category_id)); }
        if (search) {
            where += ` AND (o.order_code ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR o.customer_phone ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        const orders = await db.all(`
            SELECT o.*,
                c.name AS category_name,
                u_cskh.full_name AS cskh_name,
                u_created.full_name AS created_by_name,
                u_updated.full_name AS last_updated_by_name,
                COALESCE(pr_dep.deposit_total, 0) AS deposit_amount,
                COALESCE(o.total_amount, 0) - COALESCE(pr_dep.deposit_total, 0) AS remaining_amount
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN users u_updated ON o.last_updated_by = u_updated.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
            ) pr_dep ON true
            ${where}
            ORDER BY o.order_date DESC, o.id DESC
        `, params);

        return { orders };
    });

    // ========== ORDERS: Create ==========
    fastify.post('/api/dht/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const b = request.body || {};

        // Block users without order_code_prefix (Mã Đơn KD)
        const userPrefixCheck = await db.get('SELECT order_code_prefix FROM users WHERE id = $1', [request.user.id]);
        if (!userPrefixCheck?.order_code_prefix) {
            return reply.code(403).send({ error: 'Tài khoản chưa được cấp Mã Đơn KD. Không thể tạo đơn hàng.' });
        }

        if (!b.order_code || !b.order_code.trim()) return reply.code(400).send({ error: 'Vui lòng nhập Mã Đơn' });
        if (!b.order_date) return reply.code(400).send({ error: 'Vui lòng chọn Ngày Lên Đơn' });

        // Validate province against whitelist
        const VALID_PROVINCES = ['An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định','Bình Dương','Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang','Hòa Bình','Hồ Chí Minh','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh','Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'];
        if (b.province && !VALID_PROVINCES.includes(b.province)) {
            return reply.code(400).send({ error: 'Tỉnh/Thành phố không hợp lệ' });
        }

        // Validate customer_id: must exist and belong to this user
        if (b.customer_id) {
            const cust = await db.get(`
                SELECT c.customer_name, s.name as source_name
                FROM customers c
                LEFT JOIN settings_sources s ON c.source_id = s.id
                WHERE c.id = $1 AND c.assigned_to_id = $2
            `, [Number(b.customer_id), request.user.id]);
            if (!cust) {
                return reply.code(400).send({ error: 'Khách hàng không tồn tại hoặc không thuộc về bạn' });
            }
            // Override client values with DB truth
            b.customer_name = cust.customer_name;
            b.source = cust.source_name || b.source;
        } else {
            return reply.code(400).send({ error: 'Vui lòng chọn khách hàng từ danh sách' });
        }

        // Check duplicate
        const existing = await db.get('SELECT id FROM dht_orders WHERE order_code = $1', [b.order_code.trim()]);
        if (existing) return reply.code(409).send({ error: `Mã đơn "${b.order_code.trim()}" đã tồn tại!` });

        const result = await db.get(`
            INSERT INTO dht_orders (
                order_code, order_date, category_id,
                customer_name, customer_phone, source, province, address,
                cskh_user_id, total_quantity, total_amount, discount_amount,
                has_vat, vat_amount, deposit_payment_id,
                designer_user_id, designer_type, carrier_id,
                expected_ship_date, shipping_priority, zalo_oa_sent,
                department_id, notes, created_by, last_updated_by
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$24)
            RETURNING *
        `, [
            b.order_code.trim(),
            b.order_date,
            b.category_id ? Number(b.category_id) : null,
            b.customer_name || null,
            b.customer_phone || null,
            b.source || null,
            b.province || null,
            b.address || null,
            b.cskh_user_id ? Number(b.cskh_user_id) : null,
            Number(b.total_quantity) || 0,
            Number(b.total_amount) || 0,
            Number(b.discount_amount) || 0,
            b.has_vat === true || b.has_vat === 'true',
            Number(b.vat_amount) || 0,
            b.deposit_payment_id ? Number(b.deposit_payment_id) : null,
            b.designer_user_id ? Number(b.designer_user_id) : null,
            b.designer_type || 'staff',
            b.carrier_id ? Number(b.carrier_id) : null,
            b.expected_ship_date || null,
            b.shipping_priority || 'CHUẨN',
            b.zalo_oa_sent === true || b.zalo_oa_sent === 'true',
            b.department_id ? Number(b.department_id) : null,
            b.notes || null,
            request.user.id
        ]);

        // Link deposit permanently
        if (b.deposit_payment_id) {
            await db.run(
                'UPDATE payment_records SET total_order_codes = $1, locked_by = NULL, locked_at = NULL WHERE id = $2',
                [b.order_code.trim(), Number(b.deposit_payment_id)]
            );
        }

        // Insert order items
        if (Array.isArray(b.items) && result) {
            for (const item of b.items) {
                await db.run(`
                    INSERT INTO dht_order_items (order_id, item_name, quantity, unit_price, subtotal)
                    VALUES ($1, $2, $3, $4, $5)
                `, [result.id, item.item_name || '', Number(item.quantity) || 0, Number(item.unit_price) || 0, Number(item.subtotal) || 0]);
            }
        }

        return { success: true, order: result };
    });


    // ========== ORDERS: Update (inline edit) ==========
    fastify.put('/api/dht/orders/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);
        const b = request.body || {};

        // Build dynamic SET clause
        const allowed = [
            'customer_name', 'customer_phone', 'source', 'province',
            'cskh_user_id', 'total_quantity', 'total_amount', 'discount_amount',
            'shipping_status', 'shipping_priority', 'shipping_date', 'notes', 'category_id', 'order_date'
        ];

        const sets = [];
        const params = [];
        let idx = 1;

        for (const key of allowed) {
            if (b[key] !== undefined) {
                const numericFields = ['cskh_user_id', 'total_quantity', 'total_amount', 'discount_amount', 'category_id'];
                if (numericFields.includes(key)) {
                    sets.push(`${key} = $${idx++}`);
                    params.push(b[key] === null || b[key] === '' ? null : Number(b[key]));
                } else {
                    sets.push(`${key} = $${idx++}`);
                    params.push(b[key] === '' ? null : b[key]);
                }
            }
        }

        if (sets.length === 0) return reply.code(400).send({ error: 'Không có dữ liệu cập nhật' });

        // Auto-fill shipping_date when marking as shipped
        if (b.shipping_status === 'shipped') {
            const existing = await db.get('SELECT shipping_date FROM dht_orders WHERE id = $1', [orderId]);
            if (!existing?.shipping_date) {
                sets.push(`shipping_date = $${idx++}`);
                const { vnDateStr } = require('../utils/timezone');
                params.push(vnDateStr());
            }
        }

        sets.push(`last_updated_at = NOW()`);
        sets.push(`last_updated_by = $${idx++}`);
        params.push(request.user.id);
        params.push(orderId);

        await db.run(`UPDATE dht_orders SET ${sets.join(', ')} WHERE id = $${idx}`, params);

        return { success: true };
    });

    // ========== ORDERS: Delete ==========
    fastify.delete('/api/dht/orders/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);
        // Only creator or giam_doc can delete
        const order = await db.get('SELECT created_by FROM dht_orders WHERE id = $1', [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });
        if (order.created_by !== request.user.id && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ người tạo hoặc Giám Đốc mới được xóa' });
        }
        await db.run('DELETE FROM dht_orders WHERE id = $1', [orderId]);
        return { success: true };
    });

    // ========== EXPORT: CSV ==========
    fastify.get('/api/dht/orders/export', { preHandler: [authenticate] }, async (request, reply) => {
        const { year, month, day, category_id } = request.query;

        let where = 'WHERE 1=1';
        const params = [];
        let idx = 1;

        if (year) { where += ` AND EXTRACT(YEAR FROM o.order_date) = $${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM o.order_date) = $${idx++}`; params.push(Number(month)); }
        if (day) { where += ` AND EXTRACT(DAY FROM o.order_date) = $${idx++}`; params.push(Number(day)); }
        if (category_id) { where += ` AND o.category_id = $${idx++}`; params.push(Number(category_id)); }

        const orders = await db.all(`
            SELECT o.*,
                c.name AS category_name,
                u_cskh.full_name AS cskh_name,
                COALESCE(pr_dep.deposit_total, 0) AS deposit_amount,
                COALESCE(o.total_amount, 0) - COALESCE(pr_dep.deposit_total, 0) AS remaining_amount
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
            ) pr_dep ON true
            ${where}
            ORDER BY o.order_date DESC, o.id DESC
        `, params);

        // Build CSV with BOM for Excel UTF-8
        const headers = ['Ngày Lên Đơn','Đã Gửi','Số Tiền Còn Lại','Mã Đơn','Nguồn','Tên Khách','SĐT','CSKH','Thành Phố','Tổng SL','Tổng Tiền','Ưu Đãi','Đặt Cọc','TC Gửi','Ngày Gửi','Lĩnh Vực'];
        const csvRows = [headers.join(',')];

        for (const o of orders) {
            const row = [
                o.order_date || '',
                o.shipping_status === 'shipped' ? 'Đã gửi' : '',
                Number(o.remaining_amount) || 0,
                `"${(o.order_code || '').replace(/"/g, '""')}"`,
                `"${(o.source || '').replace(/"/g, '""')}"`,
                `"${(o.customer_name || '').replace(/"/g, '""')}"`,
                o.customer_phone || '',
                `"${(o.cskh_name || '').replace(/"/g, '""')}"`,
                `"${(o.province || '').replace(/"/g, '""')}"`,
                o.total_quantity || 0,
                Number(o.total_amount) || 0,
                Number(o.discount_amount) || 0,
                Number(o.deposit_amount) || 0,
                o.shipping_priority || '',
                o.shipping_date || '',
                `"${(o.category_name || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        }

        const csv = '\uFEFF' + csvRows.join('\n');
        reply.header('Content-Type', 'text/csv; charset=utf-8');
        reply.header('Content-Disposition', `attachment; filename="DonHangTong_${year || 'all'}.csv"`);
        return csv;
    });

    // ========== UNCLAIMED DEPOSITS from Sổ Ghi Nhận Tiền ==========
    fastify.get('/api/dht/unclaimed-deposits', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`
            SELECT pr.id, pr.payment_code, pr.amount, pr.payment_date, pr.transfer_note,
                   pr.customer_name, pr.customer_phone, pr.payment_method, pr.bank_name,
                   pr.locked_by, pr.locked_at
            FROM payment_records pr
            WHERE COALESCE(pr.source, '') != 'cashflow_chi'
              AND (pr.total_order_codes IS NULL OR pr.total_order_codes = '')
              AND (
                  pr.locked_by IS NULL
                  OR pr.locked_by = $1
                  OR pr.locked_at < NOW() - INTERVAL '10 minutes'
              )
            ORDER BY pr.payment_date DESC, pr.id DESC
        `, [request.user.id]);
        return { deposits: rows };
    });

    // Lock a deposit temporarily
    fastify.put('/api/dht/lock-deposit/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const prId = Number(request.params.id);
        // Check if already locked by someone else (and not expired)
        const existing = await db.get(`
            SELECT locked_by, locked_at FROM payment_records WHERE id = $1
        `, [prId]);
        if (existing && existing.locked_by && existing.locked_by !== request.user.id) {
            const lockAge = existing.locked_at ? (Date.now() - new Date(existing.locked_at).getTime()) / 60000 : 999;
            if (lockAge < 10) {
                return reply.code(409).send({ error: 'Mã tiền này đang được người khác giữ' });
            }
        }
        await db.run('UPDATE payment_records SET locked_by = $1, locked_at = NOW() WHERE id = $2', [request.user.id, prId]);
        return { success: true };
    });

    // Unlock a deposit
    fastify.put('/api/dht/unlock-deposit/:id', { preHandler: [authenticate] }, async (request, reply) => {
        await db.run('UPDATE payment_records SET locked_by = NULL, locked_at = NULL WHERE id = $1 AND locked_by = $2',
            [Number(request.params.id), request.user.id]);
        return { success: true };
    });

    // ========== CUSTOMER SEARCH (from customers table) ==========
    fastify.get('/api/dht/customer-search', { preHandler: [authenticate] }, async (request, reply) => {
        const { q } = request.query;
        if (!q || q.length < 2) return { customers: [] };
        const like = `%${q}%`;
        const rows = await db.all(`
            SELECT c.id, c.phone, c.customer_name, c.address, c.province,
                   s.name as source_name
            FROM customers c
            LEFT JOIN settings_sources s ON c.source_id = s.id
            WHERE (c.phone ILIKE $1 OR c.customer_name ILIKE $1)
              AND c.assigned_to_id = $2
              AND c.phone IS NOT NULL AND c.phone != ''
            ORDER BY c.updated_at DESC
            LIMIT 15
        `, [like, request.user.id]);
        return { customers: rows };
    });

    // ========== NEXT ORDER CODE ==========
    fastify.get('/api/dht/next-order-code', { preHandler: [authenticate] }, async (request, reply) => {
        const user = await db.get('SELECT order_code_prefix FROM users WHERE id = $1', [request.user.id]);
        const prefix = user?.order_code_prefix;
        if (!prefix) {
            return { hasPrefix: false, error: 'Tài khoản chưa được cấp Mã Đơn KD. Liên hệ quản lý để được cấp mã.' };
        }
        const lastOrder = await db.get(
            "SELECT order_code FROM dht_orders WHERE order_code LIKE $1 ORDER BY id DESC LIMIT 1",
            [prefix + '%']
        );
        let nextSeq = 1;
        if (lastOrder && lastOrder.order_code) {
            const match = lastOrder.order_code.match(/(\d+)$/);
            if (match) nextSeq = parseInt(match[1]) + 1;
        }
        return { hasPrefix: true, code: prefix + nextSeq, prefix, seq: nextSeq };
    });

    // ========== DESIGNERS (filter by department/position 'Thiết Kế') ==========
    fastify.get('/api/dht/designers', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`
            SELECT u.id, u.full_name, u.username FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN positions p ON u.position_id = p.id
            WHERE u.status = 'active'
              AND (d.name ILIKE '%thiết kế%' OR p.name ILIKE '%thiết kế%')
            ORDER BY u.full_name
        `);
        return { designers: rows };
    });

    // ========== CARRIERS CRUD ==========
    fastify.get('/api/dht/carriers', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all('SELECT * FROM dht_carriers WHERE is_active = true ORDER BY display_order ASC, id ASC');
        return { carriers: rows };
    });

    fastify.post('/api/dht/carriers', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { name } = request.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Nhập tên NVC' });
        const mx = await db.get('SELECT COALESCE(MAX(display_order),0) as mx FROM dht_carriers');
        const r = await db.get('INSERT INTO dht_carriers (name, display_order) VALUES ($1,$2) RETURNING *', [name.trim(), (mx?.mx||0)+1]);
        return { success: true, carrier: r };
    });

    fastify.put('/api/dht/carriers/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { name } = request.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Nhập tên NVC' });
        await db.run('UPDATE dht_carriers SET name = $1 WHERE id = $2', [name.trim(), Number(request.params.id)]);
        return { success: true };
    });

    fastify.delete('/api/dht/carriers/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        await db.run('UPDATE dht_carriers SET is_active = false WHERE id = $1', [Number(request.params.id)]);
        return { success: true };
    });

    // ========== SOURCES — Reuse from Cài Đặt Phân Tầng (settings_sources) ==========
    fastify.get('/api/dht/sources', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all('SELECT id, name FROM settings_sources ORDER BY sort_order ASC, id ASC');
        return { sources: rows };
    });

    // ========== USER INFO (for create order form) ==========
    fastify.get('/api/dht/my-info', { preHandler: [authenticate] }, async (request, reply) => {
        const user = await db.get(`
            SELECT u.id, u.full_name, u.order_code_prefix, u.department_id,
                   d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = $1
        `, [request.user.id]);
        return { user };
    });
};
