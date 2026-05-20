// ========== ĐƠN HÀNG TỔNG (DHT) — Routes ==========
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

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

        // Validate ship date: must be >= today and not a holiday
        if (b.expected_ship_date) {
            const today = new Date().toISOString().split('T')[0];
            if (b.expected_ship_date < today) {
                return reply.code(400).send({ error: 'Ngày gửi hàng không thể là ngày trong quá khứ' });
            }
            const holiday = await db.get('SELECT holiday_name FROM holidays WHERE holiday_date = $1', [b.expected_ship_date]);
            if (holiday) {
                return reply.code(400).send({ error: `Ngày gửi hàng trùng ngày lễ: ${holiday.holiday_name}` });
            }
        }

        // Validate proof image for CHUẨN priority
        let proofPath = null;
        if ((b.shipping_priority || 'CHUẨN') === 'CHUẨN') {
            if (!b.standard_proof_image) {
                return reply.code(400).send({ error: 'Vui lòng dán ảnh chứng minh Tiêu Chuẩn CHUẨN' });
            }
            // Save base64 image to file
            try {
                const match = b.standard_proof_image.match(/^data:image\/(\w+);base64,(.+)$/);
                if (match) {
                    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
                    const buffer = Buffer.from(match[2], 'base64');
                    const dir = path.join(__dirname, '..', 'public', 'uploads', 'dht-proofs');
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    const filename = `proof_${b.order_code.trim()}_${Date.now()}.${ext}`;
                    fs.writeFileSync(path.join(dir, filename), buffer);
                    proofPath = '/uploads/dht-proofs/' + filename;
                }
            } catch(imgErr) {
                console.error('Proof image save error:', imgErr.message);
            }
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
                expected_ship_date, shipping_priority, standard_proof_image, zalo_oa_sent,
                department_id, notes, surcharges, created_by, last_updated_by
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$26)
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
            proofPath,
            b.zalo_oa_sent === true || b.zalo_oa_sent === 'true',
            b.department_id ? Number(b.department_id) : null,
            b.notes || null,
            JSON.stringify(b.surcharges || []),
            request.user.id
        ]);

        // Link deposit permanently
        if (b.deposit_payment_id) {
            await db.run(
                'UPDATE payment_records SET total_order_codes = $1, locked_by = NULL, locked_at = NULL WHERE id = $2',
                [b.order_code.trim(), Number(b.deposit_payment_id)]
            );
        }

        // Insert order items (rich phiếu)
        if (Array.isArray(b.items) && result) {
            for (const item of b.items) {
                await db.run(`
                    INSERT INTO dht_order_items (dht_order_id, description, quantity, unit_price, total,
                        sale_type, product_name, material_id, material_name,
                        color_id, color_name, pattern_name, sewing_techniques,
                        accounting_notes, extra_materials, quantities,
                        extra_product, extra_price, item_total, material_pairs)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
                `, [
                    result.id,
                    item.product_name || '',
                    Number(item.quantity) || 0,
                    Number(item.unit_price) || 0,
                    Number(item.item_total) || 0,
                    item.sale_type || null,
                    item.product_name || null,
                    item.material_id ? Number(item.material_id) : null,
                    item.material_name || null,
                    item.color_id ? Number(item.color_id) : null,
                    item.color_name || null,
                    item.pattern_name || null,
                    JSON.stringify(item.sewing_techniques || []),
                    item.accounting_notes || null,
                    JSON.stringify(item.extra_materials || []),
                    JSON.stringify(item.quantities || []),
                    item.extra_product || null,
                    Number(item.extra_price) || 0,
                    Number(item.item_total) || 0,
                    JSON.stringify(item.material_pairs || [])
                ]);
            }

            // Auto-link TSAM: create tsam_order_links for each pattern_name
            const linkedPatterns = new Set();
            for (const item of b.items) {
                if (item.pattern_name && !linkedPatterns.has(item.pattern_name)) {
                    linkedPatterns.add(item.pattern_name);
                    try {
                        const sample = await db.get('SELECT id FROM tsam_samples WHERE sample_code = $1 AND is_active = true', [item.pattern_name]);
                        if (sample) {
                            await db.run(`INSERT INTO tsam_order_links (sample_id, dht_order_id, dht_order_code, linked_by)
                                VALUES ($1, $2, $3, $4) ON CONFLICT (sample_id, dht_order_id) DO NOTHING`,
                                [sample.id, result.id, b.order_code.trim(), request.user.id]);
                        }
                    } catch(linkErr) { /* ignore link errors */ }
                }
            }
        }

        // ★ Sync address + province back to customers table (if NV edited in DHT)
        if (b.customer_id && (b.address || b.province)) {
            const syncFields = [];
            const syncVals = [];
            let pi = 1;
            if (b.address) { syncFields.push(`address = $${pi++}`); syncVals.push(b.address); }
            if (b.province) { syncFields.push(`province = $${pi++}`); syncVals.push(b.province); }
            if (syncFields.length > 0) {
                syncVals.push(Number(b.customer_id));
                await db.run(
                    `UPDATE customers SET ${syncFields.join(', ')}, updated_at = NOW() WHERE id = $${pi}`,
                    syncVals
                );
            }
        }

        return { success: true, order: result };
    });


    // ========== ORDERS: Detail (full info) ==========
    fastify.get('/api/dht/orders/:id/detail', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);

        // 1. Full order + joined fields
        const order = await db.get(`
            SELECT o.*,
                c.name AS category_name,
                u_cskh.full_name AS cskh_name,
                u_created.full_name AS created_by_name,
                u_updated.full_name AS last_updated_by_name,
                u_designer.full_name AS designer_name,
                cr.name AS carrier_name,
                cr2.name AS actual_carrier_name,
                COALESCE(pr_dep.deposit_total, 0) AS deposit_amount,
                COALESCE(o.total_amount, 0) - COALESCE(pr_dep.deposit_total, 0) AS remaining_amount
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN users u_updated ON o.last_updated_by = u_updated.id
            LEFT JOIN users u_designer ON o.designer_user_id = u_designer.id
            LEFT JOIN dht_carriers cr ON o.carrier_id = cr.id
            LEFT JOIN dht_carriers cr2 ON o.actual_carrier_id = cr2.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
            ) pr_dep ON true
            WHERE o.id = $1
        `, [orderId]);

        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });

        // 2. Order items
        const items = await db.all(`
            SELECT * FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id ASC
        `, [orderId]);

        // 3. Linked payment records (by order_code match OR by deposit_payment_id)
        let payments = await db.all(`
            SELECT id, payment_code, amount, payment_date, payment_method, payment_type, bank_name,
                   customer_name, customer_phone, transfer_note, total_order_codes
            FROM payment_records
            WHERE total_order_codes ILIKE '%' || $1 || '%'
            ORDER BY payment_date DESC
        `, [order.order_code]);

        // Fallback: if no payments found via order_code, try deposit_payment_id
        if (payments.length === 0 && order.deposit_payment_id) {
            const depRecord = await db.get(`
                SELECT id, payment_code, amount, payment_date, payment_method, payment_type, bank_name,
                       customer_name, customer_phone, transfer_note, total_order_codes
                FROM payment_records WHERE id = $1
            `, [order.deposit_payment_id]);
            if (depRecord) {
                payments = [depRecord];
                // Also fix deposit_amount
                order.deposit_amount = Number(depRecord.amount) || 0;
                order.remaining_amount = (Number(order.total_amount) || 0) - order.deposit_amount;
            }
        }

        // 4. Parse surcharges
        let surcharges = [];
        try {
            surcharges = typeof order.surcharges === 'string' ? JSON.parse(order.surcharges) : (order.surcharges || []);
        } catch(e) { surcharges = []; }

        return {
            order,
            items,
            payments,
            surcharges
        };
    });

    // ========== ORDERS: Update (full edit) ==========
    fastify.put('/api/dht/orders/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);
        const b = request.body || {};

        // Build dynamic SET clause
        const allowed = [
            'customer_name', 'customer_phone', 'source', 'province', 'address',
            'cskh_user_id', 'total_quantity', 'total_amount', 'discount_amount',
            'shipping_status', 'shipping_priority', 'shipping_date', 'notes', 'category_id', 'order_date',
            'has_vat', 'vat_amount', 'designer_user_id', 'designer_type', 'carrier_id',
            'expected_ship_date', 'zalo_oa_sent',
            'tracking_code', 'actual_carrier_id', 'actual_ship_datetime', 'delivery_progress'
        ];

        const sets = [];
        const params = [];
        let idx = 1;

        for (const key of allowed) {
            if (b[key] !== undefined) {
                const numericFields = ['cskh_user_id', 'total_quantity', 'total_amount', 'discount_amount', 'category_id', 'vat_amount', 'designer_user_id', 'carrier_id', 'actual_carrier_id'];
                const boolFields = ['has_vat', 'zalo_oa_sent'];
                if (numericFields.includes(key)) {
                    sets.push(`${key} = $${idx++}`);
                    params.push(b[key] === null || b[key] === '' ? null : Number(b[key]));
                } else if (boolFields.includes(key)) {
                    sets.push(`${key} = $${idx++}`);
                    params.push(b[key] === true || b[key] === 'true');
                } else {
                    sets.push(`${key} = $${idx++}`);
                    params.push(b[key] === '' ? null : b[key]);
                }
            }
        }

        // Handle surcharges JSONB
        if (b.surcharges !== undefined) {
            sets.push(`surcharges = $${idx++}`);
            params.push(JSON.stringify(b.surcharges || []));
        }

        // Handle proof image
        if (b.standard_proof_image !== undefined) {
            let proofPath = null;
            if (b.standard_proof_image && b.standard_proof_image.startsWith('data:image')) {
                try {
                    const match = b.standard_proof_image.match(/^data:image\/(\w+);base64,(.+)$/);
                    if (match) {
                        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
                        const buffer = Buffer.from(match[2], 'base64');
                        const dir = path.join(__dirname, '..', 'public', 'uploads', 'dht-proofs');
                        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                        const orderRow = await db.get('SELECT order_code FROM dht_orders WHERE id = $1', [orderId]);
                        const filename = `proof_${(orderRow?.order_code || orderId)}_${Date.now()}.${ext}`;
                        fs.writeFileSync(path.join(dir, filename), buffer);
                        proofPath = '/uploads/dht-proofs/' + filename;
                    }
                } catch(imgErr) { console.error('Proof image save error:', imgErr.message); }
            } else if (b.standard_proof_image) {
                proofPath = b.standard_proof_image; // keep existing path
            }
            sets.push(`standard_proof_image = $${idx++}`);
            params.push(proofPath);
        }

        if (sets.length === 0 && !Array.isArray(b.items)) return reply.code(400).send({ error: 'Không có dữ liệu cập nhật' });

        // Auto-fill shipping_date when marking as shipped
        if (b.shipping_status === 'shipped') {
            const existing = await db.get('SELECT shipping_date FROM dht_orders WHERE id = $1', [orderId]);
            if (!existing?.shipping_date) {
                sets.push(`shipping_date = $${idx++}`);
                const { vnDateStr } = require('../utils/timezone');
                params.push(vnDateStr());
            }
        }

        if (sets.length > 0) {
            sets.push(`last_updated_at = NOW()`);
            sets.push(`last_updated_by = $${idx++}`);
            params.push(request.user.id);
            params.push(orderId);
            await db.run(`UPDATE dht_orders SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        }

        // ★ Replace order items if provided
        if (Array.isArray(b.items)) {
            await db.run('DELETE FROM dht_order_items WHERE dht_order_id = $1', [orderId]);
            for (const item of b.items) {
                await db.run(`
                    INSERT INTO dht_order_items (dht_order_id, description, quantity, unit_price, total,
                        sale_type, product_name, material_id, material_name,
                        color_id, color_name, pattern_name, sewing_techniques,
                        accounting_notes, extra_materials, quantities,
                        extra_product, extra_price, item_total, material_pairs)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
                `, [
                    orderId,
                    item.product_name || '',
                    Number(item.quantity) || 0,
                    Number(item.unit_price) || 0,
                    Number(item.item_total) || 0,
                    item.sale_type || null,
                    item.product_name || null,
                    item.material_id ? Number(item.material_id) : null,
                    item.material_name || null,
                    item.color_id ? Number(item.color_id) : null,
                    item.color_name || null,
                    item.pattern_name || null,
                    JSON.stringify(item.sewing_techniques || []),
                    item.accounting_notes || null,
                    JSON.stringify(item.extra_materials || []),
                    JSON.stringify(item.quantities || []),
                    item.extra_product || null,
                    Number(item.extra_price) || 0,
                    Number(item.item_total) || 0,
                    JSON.stringify(item.material_pairs || [])
                ]);
            }
        }

        // ★ Sync address/province back to customers table when edited in DHT
        if (b.address !== undefined || b.province !== undefined) {
            const order = await db.get(`
                SELECT oc.customer_id FROM dht_orders d
                JOIN order_codes oc ON oc.order_code = d.order_code
                WHERE d.id = $1
            `, [orderId]);
            if (order?.customer_id) {
                const syncSets = [];
                const syncVals = [];
                let si = 1;
                if (b.address !== undefined) { syncSets.push(`address = $${si++}`); syncVals.push(b.address || null); }
                if (b.province !== undefined) { syncSets.push(`province = $${si++}`); syncVals.push(b.province || null); }
                if (syncSets.length > 0) {
                    syncVals.push(order.customer_id);
                    await db.run(`UPDATE customers SET ${syncSets.join(', ')}, updated_at = NOW() WHERE id = $${si}`, syncVals);
                }
            }
        }

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
              AND COALESCE(pr.payment_type, '') != 'dat_coc'
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

    // ★ V4.1: Get deposit amount linked to an order code
    fastify.get('/api/dht/deposit-by-order/:orderCode', { preHandler: [authenticate] }, async (request, reply) => {
        const orderCode = request.params.orderCode;
        const result = await db.get(`
            SELECT COALESCE(SUM(amount), 0) as total_deposit
            FROM payment_records
            WHERE order_tt_coc = $1
              AND payment_type = 'dat_coc'
        `, [orderCode]);
        return { total_deposit: Number(result?.total_deposit || 0) };
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

    // ========== AVAILABLE ORDER CODES (from CRM, not yet linked to DHT) ==========
    fastify.get('/api/dht/available-order-codes', { preHandler: [authenticate] }, async (request, reply) => {
        const codes = await db.all(`
            SELECT oc.id, oc.order_code, oc.customer_id, oc.deposit_amount,
                   c.phone, c.customer_name, c.address, c.province,
                   s.name as source_name
            FROM order_codes oc
            JOIN customers c ON c.id = oc.customer_id
            LEFT JOIN settings_sources s ON c.source_id = s.id
            WHERE oc.user_id = $1
              AND c.assigned_to_id = $1
              AND oc.status = 'active'
              AND NOT EXISTS (
                  SELECT 1 FROM dht_orders d WHERE d.order_code = oc.order_code
              )
            ORDER BY oc.created_at DESC
        `, [request.user.id]);
        return { codes, count: codes.length };
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

    // ========== PHIẾU ĐƠN HÀNG — Dropdown Options ==========
    fastify.get('/api/dht/phieu-options', { preHandler: [authenticate] }, async (request, reply) => {
        // All settings grouped by category
        const opts = await db.all(`SELECT id, category, name FROM dht_settings_options WHERE is_active = true ORDER BY display_order ASC, id ASC`);
        const grouped = {};
        opts.forEach(o => {
            if (!grouped[o.category]) grouped[o.category] = [];
            grouped[o.category].push({ id: o.id, name: o.name });
        });

        // Products from dht_products (linked to sale_type)
        const products = await db.all(`SELECT p.id, p.name, p.sale_type_id, s.name as sale_type_name
            FROM dht_products p JOIN dht_settings_options s ON s.id = p.sale_type_id
            WHERE p.is_active = true ORDER BY p.display_order ASC, p.name ASC`);

        // Materials from Kho Vải
        const materials = await db.all(`SELECT id, name FROM kv_materials WHERE is_active = true ORDER BY display_order ASC, name ASC`);

        return {
            sale_types: grouped['sale_type'] || [],
            products: products,
            patterns: grouped['pattern'] || [],
            sewing_techniques: grouped['sewing_technique'] || [],
            accounting_notes: grouped['accounting_note'] || [],
            extra_materials: grouped['extra_material'] || [],
            materials: materials
        };
    });

    // Cascade: colors by material
    fastify.get('/api/dht/material-colors/:materialId', { preHandler: [authenticate] }, async (request, reply) => {
        const mid = Number(request.params.materialId);
        const colors = await db.all(`SELECT id, color_name as name FROM kv_fabric_colors WHERE material_id = $1 AND is_active = true ORDER BY color_name ASC`, [mid]);
        return { colors };
    });

    // Settings Options CRUD (director only)
    fastify.post('/api/dht/settings-options', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { category, name } = request.body || {};
        if (!category || !name) return reply.code(400).send({ error: 'Thiếu category hoặc name' });
        const mx = await db.get('SELECT COALESCE(MAX(display_order),0) as mx FROM dht_settings_options WHERE category = $1', [category]);
        const r = await db.get('INSERT INTO dht_settings_options (category, name, display_order) VALUES ($1,$2,$3) RETURNING *', [category, name.trim(), (mx?.mx || 0) + 1]);
        return { success: true, option: r };
    });

    fastify.delete('/api/dht/settings-options/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        await db.run('UPDATE dht_settings_options SET is_active = false WHERE id = $1', [Number(request.params.id)]);
        return { success: true };
    });

    // ========== PRODUCT & PROCESS CONFIG ==========

    // GET all products (with sale_type info)
    fastify.get('/api/dht/products', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`SELECT p.id, p.name, p.sale_type_id, p.display_order, s.name as sale_type_name
            FROM dht_products p JOIN dht_settings_options s ON s.id = p.sale_type_id
            WHERE p.is_active = true ORDER BY s.name ASC, p.display_order ASC, p.name ASC`);
        return { products: rows };
    });

    // GET products filtered by sale_type_id
    fastify.get('/api/dht/products-by-sale/:saleTypeId', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`SELECT id, name FROM dht_products WHERE sale_type_id = $1 AND is_active = true ORDER BY display_order ASC, name ASC`, [Number(request.params.saleTypeId)]);
        return { products: rows };
    });

    // CREATE product
    fastify.post('/api/dht/products', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { sale_type_id, name } = request.body || {};
        if (!sale_type_id || !name) return reply.code(400).send({ error: 'Thiếu thông tin' });
        const mx = await db.get('SELECT COALESCE(MAX(display_order),0) as mx FROM dht_products WHERE sale_type_id = $1', [sale_type_id]);
        const r = await db.get('INSERT INTO dht_products (sale_type_id, name, display_order) VALUES ($1,$2,$3) RETURNING *', [sale_type_id, name.trim(), (mx?.mx||0)+1]);
        return { success: true, product: r };
    });

    // DELETE product (soft)
    fastify.delete('/api/dht/products/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        await db.run('UPDATE dht_products SET is_active = false WHERE id = $1', [Number(request.params.id)]);
        return { success: true };
    });

    // GET materials assigned to a product
    fastify.get('/api/dht/product-materials/:productId', { preHandler: [authenticate] }, async (request, reply) => {
        const pid = Number(request.params.productId);
        const rows = await db.all(`SELECT pm.id, pm.material_id, m.name as material_name
            FROM dht_product_materials pm JOIN kv_materials m ON m.id = pm.material_id
            WHERE pm.product_id = $1 AND pm.is_active = true ORDER BY m.name ASC`, [pid]);
        return { materials: rows };
    });

    // SAVE material assignments for a product (bulk replace)
    fastify.put('/api/dht/product-materials/:productId', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const pid = Number(request.params.productId);
        const { material_ids } = request.body || {};
        if (!Array.isArray(material_ids)) return reply.code(400).send({ error: 'material_ids phải là mảng' });
        // Deactivate all
        await db.run('UPDATE dht_product_materials SET is_active = false WHERE product_id = $1', [pid]);
        // Re-activate or insert
        for (const mid of material_ids) {
            await db.run(`INSERT INTO dht_product_materials (product_id, material_id, is_active) VALUES ($1,$2,true)
                ON CONFLICT (product_id, material_id) DO UPDATE SET is_active = true`, [pid, mid]);
        }
        return { success: true };
    });

    // GET all process steps
    fastify.get('/api/dht/process-steps', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all('SELECT id, name, short_name, display_order FROM dht_process_steps WHERE is_active = true ORDER BY display_order ASC');
        return { steps: rows };
    });

    // GET process steps assigned to a product
    fastify.get('/api/dht/product-process/:productId', { preHandler: [authenticate] }, async (request, reply) => {
        const pid = Number(request.params.productId);
        const rows = await db.all(`SELECT pp.step_id, s.name, s.short_name
            FROM dht_product_process pp JOIN dht_process_steps s ON s.id = pp.step_id
            WHERE pp.product_id = $1 AND pp.is_active = true ORDER BY s.display_order ASC`, [pid]);
        return { steps: rows };
    });

    // SAVE process step assignments for a product (bulk replace)
    fastify.put('/api/dht/product-process/:productId', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const pid = Number(request.params.productId);
        const { step_ids } = request.body || {};
        if (!Array.isArray(step_ids)) return reply.code(400).send({ error: 'step_ids phải là mảng' });
        await db.run('UPDATE dht_product_process SET is_active = false WHERE product_id = $1', [pid]);
        for (const sid of step_ids) {
            await db.run(`INSERT INTO dht_product_process (product_id, step_id, is_active) VALUES ($1,$2,true)
                ON CONFLICT (product_id, step_id) DO UPDATE SET is_active = true`, [pid, sid]);
        }
        return { success: true };
    });
};
