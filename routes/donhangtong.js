// ========== ĐƠN HÀNG TỔNG (DHT) — Routes ==========
const db = require('../db/pool');
const { authenticate, requireRole, requirePerm } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// ========== HELPERS ==========
function formatDetailedQuantity(items, totalQuantity, orderCode) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return totalQuantity || 0;
    }

    const code = (orderCode || '').toUpperCase();
    const isPetTem = code.indexOf('GCPET') >= 0 || code.indexOf('GCTEM') >= 0 || 
                     code.indexOf('SUAGCPET') >= 0 || code.indexOf('SUAGCTEM') >= 0 || 
                     code.indexOf('SUAPET') >= 0 || code.indexOf('SUATEM') >= 0 || 
                     code.indexOf('PET') >= 0 || code.indexOf('TEM') >= 0;

    const parts = items.map(item => {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) return null;

        // Skip "Thiết Kế"
        const nameLower = (item.product_name || item.description || '').toLowerCase();
        if (nameLower.indexOf('thiết kế') >= 0 || nameLower.indexOf('thiet ke') >= 0) {
            return null;
        }
        if (item.cutting_category_name === 'Thiết Kế') {
            return null;
        }

        if (isPetTem) {
            const prod = (item.product_name || item.description || '').toLowerCase();
            if (prod.indexOf('tờ') >= 0 || prod.indexOf('to') >= 0) {
                return `${qty} Tờ`;
            }
            if (prod.indexOf('mét') >= 0 || prod.indexOf('met') >= 0) {
                return `${qty} Mét`;
            }
            const name = item.product_name || item.description || '';
            const shortName = name.length > 12 ? name.slice(0, 10) + '..' : name;
            return shortName ? `${qty} ${shortName}` : `${qty}`;
        } else {
            let cat = item.cutting_category_name;
            if (!cat) {
                const descLower = (item.product_name || item.description || '').toLowerCase();
                if (descLower.includes('áo gió')) cat = 'Áo Gió';
                else if (descLower.includes('áo')) cat = 'Áo';
                else if (descLower.includes('quần')) cat = 'Quần';
                else if (descLower.includes('váy')) cat = 'Váy';
                else if (descLower.includes('tạp dề')) cat = 'Tạp Dề';
                else if (descLower.includes('túi')) cat = 'Túi';
            }
            if (cat) {
                return `${qty} ${cat}`;
            }
            const name = item.product_name || item.description || '';
            const shortName = name.length > 12 ? name.slice(0, 10) + '..' : name;
            return shortName ? `${qty} ${shortName}` : `${qty}`;
        }
    }).filter(Boolean);

    if (parts.length === 0) {
        return totalQuantity || 0;
    }

    return parts.join(' , ');
}

module.exports = async function(fastify) {

    // Auto-migrate: add ship_count if not exists
    try { await db.run(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS ship_count INTEGER DEFAULT 0`); } catch(e) {}
    try { await db.run(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE`); } catch(e) {}
    try { await db.run(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS carrier_extra JSONB DEFAULT NULL`); } catch(e) {}
    try { await db.run(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS standard_delivery_time TEXT DEFAULT NULL`); } catch(e) {}
    try { await db.run(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS sale_note_for_accountant TEXT DEFAULT NULL`); } catch(e) {}
    try { await db.run(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS sx_print_confirmed BOOLEAN DEFAULT FALSE`); } catch(e) {}
    try { await db.run(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS sx_print_confirmed_at TIMESTAMP DEFAULT NULL`); } catch(e) {}
    try { await db.run(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS sx_print_confirmed_by INTEGER DEFAULT NULL`); } catch(e) {}
    // ★ Migration: backfill old orders as "đã in" so they don't flood "Chưa In Phiếu" filter
    try {
        const backfill = await db.run(`UPDATE dht_orders SET sx_print_confirmed = TRUE WHERE sx_print_confirmed = FALSE AND sx_print_confirmed_at IS NULL AND order_date < '2026-06-03'`);
        if (backfill?.changes > 0) console.log(`[Migration] Backfilled ${backfill.changes} old orders as sx_print_confirmed`);
    } catch(e) {}
    // Smart Customer: link orders to free customer record
    try { await db.run(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS free_customer_id INTEGER DEFAULT NULL`); } catch(e) {}
    try { await db.run(`ALTER TABLE dht_carriers ADD COLUMN IF NOT EXISTS tracking_url_template TEXT DEFAULT NULL`); } catch(e) {}
    // ★ Repair Order: link repair order back to parent order
    try { await db.run(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS parent_order_id INTEGER DEFAULT NULL`); } catch(e) {}
    try { await db.run(`ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS repair_source_code TEXT DEFAULT NULL`); } catch(e) {}
    // Auto-seed "ĐƠN SỬA" category if not exists
    try { await db.run(`INSERT INTO dht_categories (name, display_order) SELECT 'ĐƠN SỬA', COALESCE(MAX(display_order),0)+1 FROM dht_categories WHERE NOT EXISTS (SELECT 1 FROM dht_categories WHERE name = 'ĐƠN SỬA')`); } catch(e) {}
    // Auto-seed J&T tracking URL if not set
    try { await db.run(`UPDATE dht_carriers SET tracking_url_template = 'https://jtexpress.vn/vi/tracking?type=track&billcode={code}' WHERE name ILIKE '%J&T%' AND tracking_url_template IS NULL`); } catch(e) {}
    try { await db.run(`UPDATE dht_carriers SET tracking_url_template = 'https://nascoexpress.com/tra-cuu-van-don.html?s={code}' WHERE name ILIKE '%Nasco%' AND tracking_url_template IS NULL`); } catch(e) {}

    // ★ PET/TEM free order: sequences + source tables
    try { await db.run(`CREATE SEQUENCE IF NOT EXISTS gcpet_seq`); } catch(e) {}
    try { await db.run(`CREATE SEQUENCE IF NOT EXISTS gctem_seq`); } catch(e) {}
    // Sync sequences to current max if orders already exist
    try {
        const maxPet = await db.get("SELECT order_code FROM dht_orders WHERE order_code LIKE 'GCPET%' ORDER BY id DESC LIMIT 1");
        if (maxPet) { const m = maxPet.order_code.match(/(\d+)$/); if (m) await db.run(`SELECT setval('gcpet_seq', $1)`, [parseInt(m[1])]); }
    } catch(e) {}
    try {
        const maxTem = await db.get("SELECT order_code FROM dht_orders WHERE order_code LIKE 'GCTEM%' ORDER BY id DESC LIMIT 1");
        if (maxTem) { const m = maxTem.order_code.match(/(\d+)$/); if (m) await db.run(`SELECT setval('gctem_seq', $1)`, [parseInt(m[1])]); }
    } catch(e) {}
    try { await db.run(`CREATE TABLE IF NOT EXISTS dht_pet_sources (id SERIAL PRIMARY KEY, name TEXT NOT NULL, sort_order INTEGER DEFAULT 0)`); } catch(e) {}
    try { await db.run(`CREATE TABLE IF NOT EXISTS dht_tem_sources (id SERIAL PRIMARY KEY, name TEXT NOT NULL, sort_order INTEGER DEFAULT 0)`); } catch(e) {}
    // ★ Free customers for PET/TEM
    try { await db.run(`CREATE TABLE IF NOT EXISTS dht_free_customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        province TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    )`); } catch(e) {}
    try { await db.run(`CREATE INDEX IF NOT EXISTS idx_dht_free_cust_phone ON dht_free_customers(phone)`); } catch(e) {}
    try { await db.run(`CREATE INDEX IF NOT EXISTS idx_dht_free_cust_name ON dht_free_customers(name)`); } catch(e) {}
    // Smart Priority: categories column (TEXT[] array)
    try { await db.run(`ALTER TABLE dht_free_customers ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}'`); } catch(e) {}
    // ★ Cutting Category: link products to a cutting product type
    try { await db.run(`ALTER TABLE dht_products ADD COLUMN IF NOT EXISTS cutting_category_id INTEGER REFERENCES dht_settings_options(id)`); } catch(e) {}
    try { await db.run(`CREATE INDEX IF NOT EXISTS idx_dht_products_name ON dht_products(name)`); } catch(e) {}
    // Seed default cutting categories if none exist
    try {
        const ccCount = await db.get(`SELECT COUNT(*)::int AS cnt FROM dht_settings_options WHERE category = 'cutting_category' AND is_active = true`);
        if (!ccCount || ccCount.cnt === 0) {
            const cats = ['Áo', 'Áo Gió', 'Quần', 'Váy', 'Tạp Dề', 'Túi'];
            for (let i = 0; i < cats.length; i++) {
                await db.run(`INSERT INTO dht_settings_options (category, name, display_order) VALUES ('cutting_category', $1, $2) ON CONFLICT DO NOTHING`, [cats[i], i + 1]);
            }
            console.log('[DHT] Seeded', cats.length, 'cutting categories');
        }
    } catch(e) { console.error('[DHT] seed cutting_category:', e.message); }
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
        const { unpaid } = request.query;
        // ★ TREE VISIBILITY: Same rules as /api/dht/orders
        let treeWhere = '';
        const treeParams = [];
        const FULL_VIEW_ROLES = ['giam_doc', 'quan_ly_cap_cao'];
        const isFullView = FULL_VIEW_ROLES.includes(request.user.role);

        // Check department ONCE — reused for both tree filter and summary visibility
        let isKeToan = false;
        if (!isFullView) {
            const userDept = await db.get(
                'SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = $1',
                [request.user.id]
            );
            isKeToan = userDept && userDept.name && (userDept.name.toLowerCase().includes('kế toán') || userDept.name.toLowerCase().includes('ke toan'));
            if (!isKeToan) {
                treeWhere = 'o.created_by = $1';
                treeParams.push(request.user.id);
            }
        }

        const summaryVisibility = isFullView ? 'full' : (isKeToan ? 'limited' : 'self');

        if (unpaid === 'true') {
            // New Carrier -> Year -> Month grouping for unpaid orders
            let whereClause = 'WHERE o.parent_order_id IS NULL';
            const queryParams = [];
            let paramIdx = 1;
            if (!isFullView && !isKeToan) {
                whereClause += ` AND o.created_by = $${paramIdx++}`;
                queryParams.push(request.user.id);
            }
            whereClause += ` AND (COALESCE(o.total_amount, 0) - COALESCE(o.discount_amount, 0) - GREATEST(COALESCE((SELECT COALESCE(SUM(amount), 0) FROM payment_records pr_dep WHERE pr_dep.total_order_codes ILIKE '%' || o.order_code || '%' OR pr_dep.order_tt_coc = o.order_code), 0), COALESCE(o.deposit_amount_cache, 0)) - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END) > 0`;

            const unpaidTreeRows = await db.all(`
                WITH unpaid_orders AS (
                    SELECT o.id, o.order_code, o.order_date, o.shipping_status, o.actual_carrier_id, o.shipped_at,
                        (COALESCE(o.total_amount, 0) - COALESCE(o.discount_amount, 0) - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END) AS remaining_amount
                    FROM dht_orders o
                    LEFT JOIN LATERAL (
                        SELECT COALESCE(SUM(amount), 0) AS deposit_total
                        FROM payment_records
                        WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                           OR order_tt_coc = o.order_code
                    ) pr_dep ON true
                    ${whereClause}
                ),
                order_carriers AS (
                    SELECT DISTINCT
                        o.id AS order_id,
                        COALESCE(oi.actual_carrier_id, 0) AS carrier_id,
                        CASE 
                            WHEN oi.shipping_status = 'shipped' AND oi.actual_carrier_id IS NOT NULL 
                            THEN COALESCE(oi.shipping_date, o.order_date)
                            ELSE o.order_date
                        END AS assoc_date,
                        o.remaining_amount
                    FROM unpaid_orders o
                    JOIN dht_order_items oi ON oi.dht_order_id = o.id
                    
                    UNION
                    
                    SELECT
                        o.id AS order_id,
                        CASE 
                            WHEN o.shipping_status = 'shipped' AND o.actual_carrier_id IS NOT NULL 
                            THEN o.actual_carrier_id 
                            ELSE 0 
                        END AS carrier_id,
                        CASE 
                            WHEN o.shipping_status = 'shipped' AND o.actual_carrier_id IS NOT NULL 
                            THEN COALESCE(o.shipped_at, o.order_date) 
                            ELSE o.order_date 
                        END AS assoc_date,
                        o.remaining_amount
                    FROM unpaid_orders o
                    WHERE NOT EXISTS (SELECT 1 FROM dht_order_items WHERE dht_order_id = o.id)
                )
                SELECT 
                    oc.carrier_id,
                    COALESCE(c.name, 'Chưa Gửi Đơn Hàng') AS carrier_name,
                    oc.year,
                    oc.month,
                    COALESCE(SUM(oc.remaining_amount), 0)::numeric AS revenue,
                    COUNT(*)::int AS order_count
                FROM (
                    SELECT DISTINCT
                        order_id,
                        carrier_id,
                        EXTRACT(YEAR FROM assoc_date)::int AS year,
                        EXTRACT(MONTH FROM assoc_date)::int AS month,
                        remaining_amount
                    FROM order_carriers
                ) oc
                LEFT JOIN dht_carriers c ON oc.carrier_id = c.id
                GROUP BY oc.carrier_id, c.name, oc.year, oc.month
                ORDER BY oc.carrier_id, oc.year DESC, oc.month DESC
            `, queryParams);

            const carrierMap = {};
            for (const r of unpaidTreeRows) {
                const cid = r.carrier_id;
                const cname = r.carrier_name;
                if (!carrierMap[cid]) {
                    carrierMap[cid] = {
                        carrier_id: cid,
                        carrier_name: cname,
                        total: 0,
                        count: 0,
                        years: {}
                    };
                }

                const y = r.year;
                if (!carrierMap[cid].years[y]) {
                    carrierMap[cid].years[y] = {
                        year: y,
                        total: 0,
                        count: 0,
                        months: {}
                    };
                }

                const m = r.month;
                if (!carrierMap[cid].years[y].months[m]) {
                    carrierMap[cid].years[y].months[m] = {
                        month: m,
                        total: 0,
                        count: 0
                    };
                }

                const rev = Number(r.revenue);
                const cnt = Number(r.order_count);
                
                carrierMap[cid].years[y].months[m].total += rev;
                carrierMap[cid].years[y].months[m].count += cnt;
                
                carrierMap[cid].years[y].total += rev;
                carrierMap[cid].years[y].count += cnt;
                
                carrierMap[cid].total += rev;
                carrierMap[cid].count += cnt;
            }

            const tree = Object.values(carrierMap)
                .sort((a, b) => {
                    if (a.carrier_id === 0) return -1;
                    if (b.carrier_id === 0) return 1;
                    return a.carrier_name.localeCompare(b.carrier_name, 'vi');
                })
                .map(c => ({
                    ...c,
                    years: Object.values(c.years)
                        .sort((a, b) => b.year - a.year)
                        .map(y => ({
                            ...y,
                            months: Object.values(y.months)
                                .sort((a, b) => b.month - a.month)
                        }))
                }));

            const grandInfo = await db.get(`
                SELECT 
                    COALESCE(SUM(remaining_amount), 0)::numeric AS total,
                    COUNT(*)::int AS count
                FROM (
                    SELECT 
                        (COALESCE(o.total_amount, 0) - COALESCE(o.discount_amount, 0) - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END) AS remaining_amount
                    FROM dht_orders o
                    LEFT JOIN LATERAL (
                        SELECT COALESCE(SUM(amount), 0) AS deposit_total
                        FROM payment_records
                        WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                           OR order_tt_coc = o.order_code
                    ) pr_dep ON true
                    ${whereClause}
                ) sub
            `, queryParams);

            const grandTotal = summaryVisibility === 'full' ? Number(grandInfo.total) : 0;
            const grandCount = Number(grandInfo.count);

            if (summaryVisibility !== 'full') {
                for (const c of tree) {
                    c.total = 0;
                    for (const y of c.years) {
                        y.total = 0;
                        for (const m of y.months) {
                            m.total = 0;
                        }
                    }
                }
            }

            return { tree, grandTotal, grandCount, summaryVisibility };
        } else {
            // Original Year -> Category -> Month -> Day grouping
            let whereClause = treeWhere ? (treeWhere + ' AND o.parent_order_id IS NULL') : 'WHERE o.parent_order_id IS NULL';

            let revenueExpr = 'COALESCE(SUM(o.total_amount), 0)::numeric AS revenue';
            const rows = await db.all(`
                SELECT 
                    EXTRACT(YEAR FROM o.order_date)::int AS year,
                    EXTRACT(MONTH FROM o.order_date)::int AS month,
                    EXTRACT(DAY FROM o.order_date)::int AS day,
                    o.category_id,
                    c.name AS category_name,
                    ${revenueExpr},
                    COUNT(*)::int AS order_count
                FROM dht_orders o
                LEFT JOIN dht_categories c ON o.category_id = c.id
                ${whereClause}
                GROUP BY year, month, day, o.category_id, c.name
                ORDER BY year DESC, month DESC, day DESC
            `, treeParams);

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

            const grandTotal = summaryVisibility === 'full' ? tree.reduce((s, y) => s + y.total, 0) : 0;
            const grandCount = tree.reduce((s, y) => s + y.count, 0);

            if (summaryVisibility !== 'full') {
                for (const yr of tree) {
                    yr.total = 0;
                    for (const cat of yr.categories) {
                        cat.total = 0;
                        for (const mo of cat.months) {
                            mo.total = 0;
                            for (const d of mo.days) d.total = 0;
                        }
                    }
                }
            }

            return { tree, grandTotal, grandCount, summaryVisibility };
        }
    });

    // ========== ORDERS: List with filters ==========
    fastify.get('/api/dht/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const { year, month, day, category_id, search, unpaid, carrier_id } = request.query;

        let where = 'WHERE 1=1';
        const params = [];
        let idx = 1;

        if (unpaid === 'true' && carrier_id !== undefined) {
            const carrierId = Number(carrier_id);
            if (carrierId === 0) {
                where += ` AND (
                    (NOT EXISTS (SELECT 1 FROM dht_order_items WHERE dht_order_id = o.id) AND (COALESCE(o.shipping_status, 'pending') != 'shipped' OR o.actual_carrier_id IS NULL OR o.actual_carrier_id = 0))
                    OR
                    EXISTS (SELECT 1 FROM dht_order_items WHERE dht_order_id = o.id AND (COALESCE(shipping_status, 'pending') != 'shipped' OR actual_carrier_id IS NULL OR actual_carrier_id = 0))
                )`;
                if (year) { where += ` AND EXTRACT(YEAR FROM o.order_date) = $${idx++}`; params.push(Number(year)); }
                if (month) { where += ` AND EXTRACT(MONTH FROM o.order_date) = $${idx++}`; params.push(Number(month)); }
                if (day) { where += ` AND EXTRACT(DAY FROM o.order_date) = $${idx++}`; params.push(Number(day)); }
            } else {
                const carrierParamIdx = idx++;
                params.push(carrierId);
                let carrierDateCond = '';
                if (year) {
                    carrierDateCond += ` AND EXTRACT(YEAR FROM COALESCE(shipping_date, o.order_date)) = $${idx++}`;
                    params.push(Number(year));
                }
                if (month) {
                    carrierDateCond += ` AND EXTRACT(MONTH FROM COALESCE(shipping_date, o.order_date)) = $${idx++}`;
                    params.push(Number(month));
                }
                if (day) {
                    carrierDateCond += ` AND EXTRACT(DAY FROM COALESCE(shipping_date, o.order_date)) = $${idx++}`;
                    params.push(Number(day));
                }

                let orderCarrierDateCond = '';
                if (year) {
                    orderCarrierDateCond += ` AND EXTRACT(YEAR FROM COALESCE(o.shipped_at, o.order_date)) = $${idx++}`;
                    params.push(Number(year));
                }
                if (month) {
                    orderCarrierDateCond += ` AND EXTRACT(MONTH FROM COALESCE(o.shipped_at, o.order_date)) = $${idx++}`;
                    params.push(Number(month));
                }
                if (day) {
                    orderCarrierDateCond += ` AND EXTRACT(DAY FROM COALESCE(o.shipped_at, o.order_date)) = $${idx++}`;
                    params.push(Number(day));
                }

                where += ` AND (
                    (NOT EXISTS (SELECT 1 FROM dht_order_items WHERE dht_order_id = o.id) 
                        AND COALESCE(o.shipping_status, 'pending') = 'shipped' 
                        AND o.actual_carrier_id = $${carrierParamIdx}
                        ${orderCarrierDateCond})
                    OR
                    EXISTS (SELECT 1 FROM dht_order_items 
                        WHERE dht_order_id = o.id 
                        AND COALESCE(shipping_status, 'pending') = 'shipped' 
                        AND actual_carrier_id = $${carrierParamIdx}
                        ${carrierDateCond})
                )`;
            }
        } else {
            if (year) { where += ` AND EXTRACT(YEAR FROM o.order_date) = $${idx++}`; params.push(Number(year)); }
            if (month) { where += ` AND EXTRACT(MONTH FROM o.order_date) = $${idx++}`; params.push(Number(month)); }
            if (day) { where += ` AND EXTRACT(DAY FROM o.order_date) = $${idx++}`; params.push(Number(day)); }
        }

        if (category_id) { where += ` AND o.category_id = $${idx++}`; params.push(Number(category_id)); }
        if (unpaid === 'true') {
            where += ` AND (COALESCE(o.total_amount, 0) - COALESCE(o.discount_amount, 0) - GREATEST(COALESCE((SELECT COALESCE(SUM(amount), 0) FROM payment_records pr_dep WHERE pr_dep.total_order_codes ILIKE '%' || o.order_code || '%' OR pr_dep.order_tt_coc = o.order_code), 0), COALESCE(o.deposit_amount_cache, 0)) - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END) > 0`;
        }
        if (search) {
            where += ` AND (o.order_code ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR o.customer_phone ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        // ★ ORDER VISIBILITY: Only GĐ, QLCC, and Phòng Kế Toán see all orders
        const FULL_VIEW_ROLES = ['giam_doc', 'quan_ly_cap_cao'];
        if (!FULL_VIEW_ROLES.includes(request.user.role)) {
            // Check if user is in Phòng Kế Toán
            const userDept = await db.get(
                'SELECT d.name FROM users u JOIN departments d ON u.department_id = d.id WHERE u.id = $1',
                [request.user.id]
            );
            const isKeToan = userDept && userDept.name && (userDept.name.toLowerCase().includes('kế toán') || userDept.name.toLowerCase().includes('ke toan'));
            if (!isKeToan) {
                where += ` AND o.created_by = $${idx++}`;
                params.push(request.user.id);
            }
        }

        const orders = await db.all(`
            SELECT o.*, COALESCE(o.ship_count, 0) AS ship_count, COALESCE(o.is_edited, FALSE) AS is_edited,
                c.name AS category_name,
                u_cskh.full_name AS cskh_name,
                u_created.full_name AS created_by_name,
                u_updated.full_name AS last_updated_by_name,
                GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) AS deposit_amount,
                COALESCE(o.total_amount, 0) - COALESCE(o.discount_amount, 0) - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END AS remaining_amount,
                COALESCE(prod_progress.done_steps, 0) AS prod_done,
                COALESCE(prod_progress.total_steps, 0) AS prod_total,
                prod_progress.current_step_short AS prod_current,
                prod_progress.next_step_name AS next_step_name,
                COALESCE(err_check.error_count, 0) > 0 AS has_error,
                COALESCE(repair_check.repair_count, 0) > 0 AS has_repair_order,
                COALESCE((SELECT op_in.is_completed FROM dht_order_production op_in WHERE op_in.dht_order_id = o.id AND op_in.step_id = 3), false) AS is_print_done,
                order_items.items AS items
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN users u_updated ON o.last_updated_by = u_updated.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                   OR order_tt_coc = o.order_code
            ) pr_dep ON true
            LEFT JOIN LATERAL (
                SELECT 
                    COUNT(*) FILTER (WHERE op.is_completed) AS done_steps,
                    (SELECT COUNT(*)::int FROM dht_process_steps WHERE is_active = true) AS total_steps,
                    (SELECT ps2.short_name FROM dht_order_production op2
                     JOIN dht_process_steps ps2 ON op2.step_id = ps2.id
                     WHERE op2.dht_order_id = o.id AND op2.is_completed
                     ORDER BY ps2.display_order DESC LIMIT 1) AS current_step_short,
                    (SELECT ps3.name FROM dht_process_steps ps3
                     LEFT JOIN dht_order_production op3 ON op3.step_id = ps3.id AND op3.dht_order_id = o.id
                     WHERE ps3.is_active = true AND COALESCE(op3.is_completed, false) = false
                     ORDER BY ps3.display_order ASC LIMIT 1) AS next_step_name
                FROM dht_order_production op
                WHERE op.dht_order_id = o.id
            ) prod_progress ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS error_count
                FROM customer_error_orders ceo
                WHERE ceo.dht_order_id = o.id
            ) err_check ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS repair_count
                FROM dht_orders ro
                WHERE ro.parent_order_id = o.id
            ) repair_check ON true
            LEFT JOIN LATERAL (
                SELECT json_agg(json_build_object(
                    'product_name', i.product_name,
                    'description', i.description,
                    'quantity', i.quantity,
                    'actual_carrier_id', i.actual_carrier_id,
                    'shipping_status', COALESCE(i.shipping_status, 'pending'),
                    'shipping_date', i.shipping_date,
                    'cutting_category_name', cc.name
                )) AS items
                FROM dht_order_items i
                LEFT JOIN dht_products p ON p.name = TRIM(COALESCE(i.product_name, i.description)) AND p.is_active = true
                LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id
                WHERE i.dht_order_id = o.id
            ) order_items ON true
            ${where}
            ORDER BY o.order_date DESC, o.id DESC
        `, params);

        const processedOrders = orders.map(o => {
            const code = (o.order_code || '').toUpperCase();
            const catName = (o.category_name || '').toUpperCase();
            const isPetTem = catName === 'PET' || catName === 'TEM' ||
                             code.includes('PET') || code.includes('TEM');
            if (isPetTem) {
                const isShipped = o.shipping_status === 'shipped' || !!o.shipped_at;
                o.prod_total = 2;
                if (isShipped) {
                    o.prod_done = 2;
                    o.next_step_name = '';
                } else if (o.is_print_done) {
                    o.prod_done = 1;
                    o.next_step_name = 'Kế toán gửi hàng';
                } else {
                    o.prod_done = 0;
                    o.next_step_name = 'Chờ in';
                }
            }
            return o;
        });

        return { orders: processedOrders };
    });

    // ========== ORDERS: Create ==========
    // ★ FREE_ORDER categories: PET=8, TEM=9 → auto-generate order code
    const FREE_CAT_MAP = { 8: { prefix: 'GCPET', seq: 'gcpet_seq' }, 9: { prefix: 'GCTEM', seq: 'gctem_seq' } };

    fastify.post('/api/dht/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const b = request.body || {};
        const catId = b.category_id ? Number(b.category_id) : null;
        const isFreeOrder = !!FREE_CAT_MAP[catId];
        const isRepairOrder = b.is_repair === true;

        // ★ REPAIR orders: auto-generate code, skip prefix check
        if (isRepairOrder) {
            if (!b.parent_order_id) return reply.code(400).send({ error: 'Thiếu thông tin đơn gốc' });
            if (!b.repair_source_code) return reply.code(400).send({ error: 'Thiếu mã đơn gốc' });
        }

        // ★ NORMAL orders: require order_code_prefix
        if (!isFreeOrder && !isRepairOrder) {
            const userPrefixCheck = await db.get('SELECT order_code_prefix FROM users WHERE id = $1', [request.user.id]);
            if (!userPrefixCheck?.order_code_prefix) {
                return reply.code(403).send({ error: 'Tài khoản chưa được cấp Mã Đơn KD. Không thể tạo đơn hàng.' });
            }
            if (!b.order_code || !b.order_code.trim()) return reply.code(400).send({ error: 'Vui lòng nhập Mã Đơn' });
        }

        if (!b.order_date) return reply.code(400).send({ error: 'Vui lòng chọn Ngày Lên Đơn' });

        // Validate province against whitelist
        const VALID_PROVINCES = ['An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định','Bình Dương','Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương','Hải Phòng','Hậu Giang','Hòa Bình','Hồ Chí Minh','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh','Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh','Trà Vinh','Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái'];
        if (b.province && !VALID_PROVINCES.includes(b.province)) {
            return reply.code(400).send({ error: 'Tỉnh/Thành phố không hợp lệ' });
        }

        // ★ Customer validation: different for free vs normal vs repair
        if (isRepairOrder || isFreeOrder) {
            // Repair/PET/TEM: customer entered manually, no CRM customer required
            if (!b.customer_name || !b.customer_name.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập Tên Khách Hàng' });
            }
        } else {
            // Normal: require CRM customer
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
                b.customer_name = cust.customer_name;
                b.source = cust.source_name || b.source;
            } else {
                return reply.code(400).send({ error: 'Vui lòng chọn khách hàng từ danh sách' });
            }
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

        // ★ Generate order code for PET/TEM via sequence (atomic), or repair order
        let orderCode;
        if (isRepairOrder) {
            // Repair: SUA + original code. If already exists, try SUA2, SUA3, etc.
            const srcCode = b.repair_source_code.trim();
            let repairCode = 'SUA' + srcCode;
            let existCheck = await db.get('SELECT id FROM dht_orders WHERE order_code = $1', [repairCode]);
            if (existCheck) {
                // Find next available SUA number
                let n = 2;
                while (n <= 99) {
                    repairCode = 'SUA' + n + srcCode;
                    existCheck = await db.get('SELECT id FROM dht_orders WHERE order_code = $1', [repairCode]);
                    if (!existCheck) break;
                    n++;
                }
            }
            orderCode = repairCode;
        } else if (isFreeOrder) {
            const cfg = FREE_CAT_MAP[catId];
            const seqRow = await db.get(`SELECT nextval('${cfg.seq}') as seq`);
            orderCode = cfg.prefix + String(seqRow.seq).padStart(4, '0');
        } else {
            orderCode = b.order_code.trim();
        }

        // Validate proof image for CHUẨN priority (skip for free/repair orders)
        let proofPath = null;
        if (!isFreeOrder && !isRepairOrder && (b.shipping_priority || 'CHUẨN') === 'CHUẨN') {
            if (!b.standard_proof_image) {
                return reply.code(400).send({ error: 'Vui lòng dán ảnh chứng minh Tiêu Chuẩn CHUẨN' });
            }
            try {
                const match = b.standard_proof_image.match(/^data:image\/(\w+);base64,(.+)$/);
                if (match) {
                    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
                    const buffer = Buffer.from(match[2], 'base64');
                    const dir = path.join(__dirname, '..', 'uploads', 'dht-proofs');
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    const filename = `proof_${orderCode}_${Date.now()}.${ext}`;
                    fs.writeFileSync(path.join(dir, filename), buffer);
                    proofPath = '/uploads/dht-proofs/' + filename;
                }
            } catch(imgErr) {
                console.error('Proof image save error:', imgErr.message);
            }
        }

        // Check duplicate (safety net — sequence should prevent this)
        const existing = await db.get('SELECT id FROM dht_orders WHERE order_code = $1', [orderCode]);
        if (existing) return reply.code(409).send({ error: `Mã đơn "${orderCode}" đã tồn tại!` });

        const result = await db.get(`
            INSERT INTO dht_orders (
                order_code, order_date, category_id,
                customer_name, customer_phone, source, province, address,
                cskh_user_id, total_quantity, total_amount, discount_amount,
                has_vat, vat_amount, deposit_payment_id, deposit_amount_cache,
                designer_user_id, designer_type, carrier_id, carrier_extra,
                expected_ship_date, shipping_priority, standard_proof_image, standard_delivery_time, zalo_oa_sent,
                sale_note_for_accountant, department_id, notes, surcharges, free_customer_id,
                parent_order_id, repair_source_code,
                created_by, last_updated_by
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$33)
            RETURNING *
        `, [
            orderCode,
            b.order_date,
            catId,
            b.customer_name || null,
            b.customer_phone || null,
            b.source || null,
            b.province || null,
            b.address || null,
            (isFreeOrder || isRepairOrder) ? request.user.id : (b.cskh_user_id ? Number(b.cskh_user_id) : null),
            Number(b.total_quantity) || 0,
            Number(b.total_amount) || 0,
            Number(b.discount_amount) || 0,
            b.has_vat === true || b.has_vat === 'true',
            Number(b.vat_amount) || 0,
            b.deposit_payment_id ? Number(b.deposit_payment_id) : null,
            Number(b.deposit_amount) || 0,
            b.designer_user_id ? Number(b.designer_user_id) : null,
            b.designer_type || 'staff',
            b.carrier_id ? Number(b.carrier_id) : null,
            b.carrier_extra ? JSON.stringify(b.carrier_extra) : null,
            b.expected_ship_date || null,
            (isFreeOrder || isRepairOrder) ? (b.shipping_priority || 'GẤP') : (b.shipping_priority || 'CHUẨN'),
            proofPath,
            b.standard_delivery_time || null,
            b.zalo_oa_sent === true || b.zalo_oa_sent === 'true',
            b.sale_note_for_accountant || null,
            b.department_id ? Number(b.department_id) : null,
            b.notes || null,
            JSON.stringify(b.surcharges || []),
            b.free_customer_id ? parseInt(b.free_customer_id) : null,
            isRepairOrder ? Number(b.parent_order_id) : null,
            isRepairOrder ? b.repair_source_code : null,
            request.user.id
        ]);

        // Link deposit permanently
        if (b.deposit_payment_id) {
            await db.run(
                'UPDATE payment_records SET order_tt_coc = $1, locked_by = NULL, locked_at = NULL WHERE id = $2',
                [orderCode, Number(b.deposit_payment_id)]
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
                                [sample.id, result.id, orderCode, request.user.id]);
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
        // ★ Sync discount_amount to CRM order_codes (doanh số = items - discount)
        if ((Number(b.discount_amount) || 0) > 0) {
            try { await db.run(`UPDATE order_codes SET discount_amount = $1 WHERE order_code = $2`, [Number(b.discount_amount) || 0, orderCode]); } catch(e) { /* order_code may not exist in CRM yet */ }
        }

        // ★ Audit log: Tạo đơn
        if (result) {
            try {
                await db.run(`INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by) VALUES ($1, $2, $3, $4, $5)`, [
                    result.id, 'create', 'Đã tạo đơn ' + orderCode,
                    JSON.stringify([
                        { field: 'order_code', label: 'Mã đơn', old: null, new: orderCode },
                        { field: 'total_amount', label: 'Tổng tiền', old: null, new: String(Number(b.total_amount) || 0) },
                        { field: 'total_quantity', label: 'Tổng SL', old: null, new: String(Number(b.total_quantity) || 0) },
                        ...(Number(b.deposit_amount) > 0 ? [{ field: 'deposit', label: 'Tiền cọc', old: null, new: String(Number(b.deposit_amount)) }] : []),
                        ...(Number(b.discount_amount) > 0 ? [{ field: 'discount', label: 'Giảm giá', old: null, new: String(Number(b.discount_amount)) }] : [])
                    ]),
                    request.user.id
                ]);
            } catch(auditErr) { console.error('[AuditLog] create:', auditErr.message); }
        }

        // ★ Auto-save free customer for PET/TEM reuse
        if (isFreeOrder && b.customer_name) {
            try {
                const phone = (b.customer_phone || '').trim();
                const catRow = catId ? await db.get('SELECT name FROM dht_categories WHERE id=$1', [catId]) : null;
                const catName = catRow ? catRow.name : '';
                const freeCustId = b.free_customer_id ? parseInt(b.free_customer_id) : null;
                const custAction = b.free_customer_action || null;

                if (freeCustId && custAction === 'update') {
                    // User chose "Đổi SĐT cho KH cũ" → update by ID including phone
                    const existing = await db.get('SELECT categories FROM dht_free_customers WHERE id=$1', [freeCustId]);
                    const existCats = existing?.categories || [];
                    const newCats = catName && !existCats.includes(catName) ? [...existCats, catName] : existCats;
                    await db.run('UPDATE dht_free_customers SET name=$1, phone=$2, address=$3, province=$4, categories=$5, updated_at=NOW() WHERE id=$6',
                        [b.customer_name.trim(), phone || null, b.address || null, b.province || null, newCats, freeCustId]);
                    // ★ CASCADE: Update ALL orders linked to this customer
                    await db.run('UPDATE dht_orders SET customer_name=$1, customer_phone=$2, address=$3, province=$4 WHERE free_customer_id=$5',
                        [b.customer_name.trim(), phone || null, b.address || null, b.province || null, freeCustId]);
                } else if (custAction === 'create_new') {
                    // User chose "Tạo KH mới" → always insert
                    await db.run('INSERT INTO dht_free_customers (name, phone, address, province, categories, created_by) VALUES ($1,$2,$3,$4,$5,$6)',
                        [b.customer_name.trim(), phone || null, b.address || null, b.province || null, catName ? [catName] : [], request.user.id]);
                } else if (freeCustId) {
                    // Selected existing customer, no phone change → update by ID
                    const existing = await db.get('SELECT categories FROM dht_free_customers WHERE id=$1', [freeCustId]);
                    const existCats = existing?.categories || [];
                    const newCats = catName && !existCats.includes(catName) ? [...existCats, catName] : existCats;
                    await db.run('UPDATE dht_free_customers SET name=$1, address=$2, province=$3, categories=$4, updated_at=NOW() WHERE id=$5',
                        [b.customer_name.trim(), b.address || null, b.province || null, newCats, freeCustId]);
                } else if (phone) {
                    // No selected customer, typed new → phone-based upsert (own records only)
                    const existing = await db.get('SELECT id, categories FROM dht_free_customers WHERE phone=$1 AND created_by=$2', [phone, request.user.id]);
                    if (existing) {
                        const existCats = existing.categories || [];
                        const newCats = catName && !existCats.includes(catName) ? [...existCats, catName] : existCats;
                        await db.run('UPDATE dht_free_customers SET name=$1, address=$2, province=$3, categories=$4, updated_at=NOW() WHERE id=$5',
                            [b.customer_name.trim(), b.address || null, b.province || null, newCats, existing.id]);
                    } else {
                        await db.run('INSERT INTO dht_free_customers (name, phone, address, province, categories, created_by) VALUES ($1,$2,$3,$4,$5,$6)',
                            [b.customer_name.trim(), phone, b.address || null, b.province || null, catName ? [catName] : [], request.user.id]);
                    }
                } else {
                    await db.run('INSERT INTO dht_free_customers (name, phone, address, province, categories, created_by) VALUES ($1,$2,$3,$4,$5,$6)',
                        [b.customer_name.trim(), null, b.address || null, b.province || null, catName ? [catName] : [], request.user.id]);
                }
            } catch(custErr) { console.error('[FreeCust] save:', custErr.message); }
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
                cr2.tracking_url_template AS actual_carrier_tracking_url,
                u_shipped.full_name AS shipped_by_name,
                GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) AS deposit_amount,
                COALESCE(o.total_amount, 0) - COALESCE(o.discount_amount, 0) - GREATEST(COALESCE(pr_dep.deposit_total, 0), COALESCE(o.deposit_amount_cache, 0)) - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END AS remaining_amount,
                COALESCE(err_check.error_count, 0) > 0 AS has_error,
                CASE WHEN COALESCE(err_check.error_count, 0) > 0
                     THEN COALESCE(err_check.error_count, 0) = COALESCE(err_handover.handed_count, 0)
                     ELSE FALSE END AS all_errors_handed_over
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN users u_updated ON o.last_updated_by = u_updated.id
            LEFT JOIN users u_designer ON o.designer_user_id = u_designer.id
            LEFT JOIN dht_carriers cr ON o.carrier_id = cr.id
            LEFT JOIN dht_carriers cr2 ON o.actual_carrier_id = cr2.id
            LEFT JOIN users u_shipped ON o.shipped_by = u_shipped.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                   OR order_tt_coc = o.order_code
            ) pr_dep ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS error_count
                FROM customer_error_orders ceo
                WHERE ceo.dht_order_id = o.id
            ) err_check ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::int AS handed_count
                FROM customer_error_orders ceo2
                WHERE ceo2.dht_order_id = o.id AND ceo2.error_return_handed_over = TRUE
            ) err_handover ON true
            WHERE o.id = $1
        `, [orderId]);

        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });

        // 2. Order items (with TSAM base prices and shipping details)
        const items = await db.all(`
            SELECT i.*, 
                   ts.factory_price AS tsam_factory_price, 
                   ts.processing_price AS tsam_processing_price,
                   cr.name AS actual_carrier_name,
                   cr.tracking_url_template AS actual_carrier_tracking_url,
                   u.full_name AS shipped_by_name
            FROM dht_order_items i
            LEFT JOIN tsam_samples ts ON ts.sample_code = i.pattern_name
            LEFT JOIN dht_carriers cr ON i.actual_carrier_id = cr.id
            LEFT JOIN users u ON i.shipped_by = u.id
            WHERE i.dht_order_id = $1 ORDER BY i.id ASC
        `, [orderId]);

        // 3. Linked payment records (by order_code match OR by deposit_payment_id)
        let payments = await db.all(`
            SELECT id, payment_code, amount, payment_date, payment_method, payment_type, bank_name,
                   customer_name, customer_phone, transfer_note, total_order_codes, created_at, created_by
            FROM payment_records
            WHERE total_order_codes ILIKE '%' || $1 || '%'
               OR order_tt_coc = $1
            ORDER BY payment_date DESC
        `, [order.order_code]);

        // Fallback: if no payments found via order_code, try deposit_payment_id
        if (payments.length === 0 && order.deposit_payment_id) {
            const depRecord = await db.get(`
                SELECT id, payment_code, amount, payment_date, payment_method, payment_type, bank_name,
                       customer_name, customer_phone, transfer_note, total_order_codes, created_at, created_by
                FROM payment_records WHERE id = $1
            `, [order.deposit_payment_id]);
            if (depRecord) {
                payments = [depRecord];
                // Also fix deposit_amount
                order.deposit_amount = Number(depRecord.amount) || 0;
                var _shipCkDeduct = (order.shipping_fee_payer === 'hv' && order.shipping_fee_method === 'ck') ? (Number(order.shipping_fee) || 0) : 0;
                order.remaining_amount = (Number(order.total_amount) || 0) - (Number(order.discount_amount) || 0) - order.deposit_amount - _shipCkDeduct;
            }
        }

        // 4. Parse surcharges
        let surcharges = [];
        try {
            surcharges = typeof order.surcharges === 'string' ? JSON.parse(order.surcharges) : (order.surcharges || []);
        } catch(e) { surcharges = []; }

        // 5. Audit logs
        const audit_logs = await db.all(`
            SELECT al.*, u.full_name AS performer_name
            FROM dht_audit_logs al
            LEFT JOIN users u ON al.performed_by = u.id
            WHERE al.dht_order_id = $1
            ORDER BY al.created_at ASC
        `, [orderId]);

        // 6. ★ Merge payment records into audit timeline as virtual 'payment' entries
        // This gives full cash flow visibility: every deposit, payment, refund shows in history
        const paymentLogs = [];
        const typeLabelsVN = {
            dat_coc: 'Đặt cọc', thanh_toan: 'Thanh toán', tt_sll: 'Thanh toán SLL',
            tra_lai_coc: 'Trả lại cọc', chi: 'Chi', pending: 'Chờ xử lý'
        };
        const methodLabelsVN = { CK: 'Chuyển Khoản', TM: 'Tiền Mặt' };

        // Calculate running total for remaining balance display
        const totalOrderAmount = Number(order.total_amount) || 0;
        const discountAmount = Number(order.discount_amount) || 0;
        const shipCkDeduct = (order.shipping_fee_payer === 'hv' && order.shipping_fee_method === 'ck') ? (Number(order.shipping_fee) || 0) : 0;
        const netTotal = totalOrderAmount - discountAmount;
        // Surcharges
        let surTotal = 0;
        for (const s of surcharges) surTotal += Number(s.amount) || 0;
        const grandTotal = netTotal + surTotal;

        let runningPaid = 0;
        // Sort payments by date ascending for running balance
        const sortedPayments = payments.slice().sort((a, b) => new Date(a.created_at || a.payment_date) - new Date(b.created_at || b.payment_date));

        for (const p of sortedPayments) {
            const amt = Number(p.amount) || 0;
            const pType = p.payment_type || 'thanh_toan';
            const isOutflow = pType === 'tra_lai_coc' || pType === 'chi';
            if (!isOutflow) runningPaid += amt;
            else runningPaid -= amt;

            const remaining = grandTotal - runningPaid - shipCkDeduct;
            const typeLabel = typeLabelsVN[pType] || pType;
            const methodLabel = methodLabelsVN[(p.payment_method || '').toUpperCase()] || p.payment_method || '—';
            const fmtAmt = Number(amt).toLocaleString('vi-VN');

            const changes = [
                { field: 'payment_code', label: 'Mã tiền', old: null, new: p.payment_code || '—' },
                { field: 'payment_amount', label: 'Số tiền', old: null, new: String(amt) },
                { field: 'payment_method', label: 'Hình thức', old: null, new: methodLabel },
            ];
            if (p.transfer_note) {
                changes.push({ field: 'transfer_note', label: 'Nội dung', old: null, new: p.transfer_note });
            }
            if (p.bank_name) {
                changes.push({ field: 'bank_name', label: 'Ngân hàng', old: null, new: p.bank_name });
            }
            changes.push({ field: 'remaining', label: 'Còn lại sau GD', old: null, new: String(remaining) });

            const summaryIcon = isOutflow ? '🔴 ' : '💰 ';
            const summary = `${summaryIcon}${typeLabel}: ${fmtAmt}đ — Mã tiền: ${p.payment_code || '—'}`;

            paymentLogs.push({
                id: 'pr_' + p.id,
                dht_order_id: orderId,
                action: 'payment',
                summary: summary,
                changes: JSON.stringify(changes),
                performed_by: p.created_by || null,
                performer_name: p.customer_name || '—',
                created_at: p.created_at || p.payment_date || order.created_at,
                _is_virtual: true,
                _payment_type: pType,
                _is_outflow: isOutflow,
                _amount: amt,
                _remaining: remaining
            });
        }

        // Merge and sort by created_at
        const merged_logs = [...audit_logs, ...paymentLogs].sort((a, b) =>
            new Date(a.created_at) - new Date(b.created_at)
        );

        return {
            order,
            items,
            payments,
            surcharges,
            audit_logs: merged_logs
        };
    });

    // ========== ORDERS: Print Shipping Receipt ==========
    fastify.get('/api/dht/orders/:id/print', { preHandler: [authenticate] }, async (request, reply) => {
      try {
        console.log('[PRINT] Request for order:', request.params.id);
        const orderId = Number(request.params.id);
        const order = await db.get('SELECT * FROM dht_orders WHERE id = $1', [orderId]);
        if (!order) return reply.code(404).type('text/html').send('<h1>Không tìm thấy đơn hàng</h1>');

        const items = await db.all(`
            SELECT i.*, ts.factory_price AS tsam_factory_price, ts.processing_price AS tsam_processing_price
            FROM dht_order_items i
            LEFT JOIN tsam_samples ts ON ts.sample_code = i.pattern_name
            WHERE i.dht_order_id = $1 ORDER BY i.id ASC
        `, [orderId]);

        // Calculate financials from items
        const fmt = n => Number(n || 0).toLocaleString('vi-VN');
        let calcBase = 0, calcVat = 0;
        for (const it of items) {
            let quantities = [];
            try { quantities = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities || []); } catch(e){}
            const base = quantities.reduce((s, x) => s + (Number(x.qty)||0) * (Number(x.price)||0), 0);
            calcBase += base;
            calcVat += (Number(it.item_total) || 0) - base;
        }
        // Deposit
        const payments = await db.all("SELECT COALESCE(SUM(amount),0) as total FROM payment_records WHERE total_order_codes ILIKE '%' || $1 || '%' OR order_tt_coc = $1", [order.order_code]);
        const depositFromPayments = Number(payments[0]?.total) || 0;
        const deposit = Math.max(depositFromPayments, Number(order.deposit_amount_cache) || 0);
        const discount = Number(order.discount_amount) || 0;
        const grandTotal = calcBase + calcVat;
        const needToPay = grandTotal - discount - deposit;

        // Surcharges
        let surcharges = [];
        try { surcharges = typeof order.surcharges === 'string' ? JSON.parse(order.surcharges) : (order.surcharges || []); } catch(e){}
        const surTotal = surcharges.reduce((s, x) => s + (Number(x.amount) || 0), 0);

        // Build items HTML
        let itemRows = '';
        let idx = 0;
        for (const it of items) {
            idx++;
            let quantities = [];
            try { quantities = typeof it.quantities === 'string' ? JSON.parse(it.quantities) : (it.quantities || []); } catch(e){}
            const base = quantities.reduce((s, x) => s + (Number(x.qty)||0) * (Number(x.price)||0), 0);
            const vatAmt = (Number(it.item_total) || 0) - base;
            const vatPct = base > 0 && vatAmt > 0 ? Math.round(vatAmt / base * 100) : 0;
            const matColor = (it.material_name || '') + (it.color_name ? ' - ' + it.color_name : '');
            const saleLabel = (it.sale_type || '').toLowerCase() === 'bán' || (it.sale_type || '').toLowerCase() === 'ban' ? 'Bán' : 'Quà';
            itemRows += `<tr>
                <td style="text-align:center">${idx}</td>
                <td>${saleLabel}</td>
                <td style="font-weight:700">${it.product_name || it.description || '—'}</td>
                <td>${matColor}</td>
                <td style="text-align:center;font-weight:700">${it.quantity || 0}</td>
                <td style="text-align:right">${fmt(it.unit_price)}</td>
                <td style="text-align:center">${vatPct}%</td>
                <td style="text-align:right;font-weight:700">${fmt(it.item_total)}</td>
            </tr>`;
        }

        const orderDate = order.order_date ? new Date(order.order_date).toLocaleDateString('vi-VN') : '—';
        const printDate = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

        const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Phiếu Giao Hàng - ${order.order_code}</title>
<style>
    @page { size: A4; margin: 10mm 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; }
    .page { max-width: 750px; margin: 0 auto; padding: 20px; }

    /* Header */
    .header { display: flex; align-items: center; gap: 16px; padding-bottom: 12px; border-bottom: 3px solid #1a1a2e; margin-bottom: 16px; }
    .header img { width: 70px; height: 70px; border-radius: 12px; object-fit: contain; }
    .header-info { flex: 1; }
    .header-info .brand { font-size: 22px; font-weight: 900; color: #1a1a2e; letter-spacing: 1px; }
    .header-info .company { font-size: 11px; font-weight: 600; color: #4a4a6a; margin-top: 2px; }
    .header-info .contact { font-size: 10px; color: #6b7280; margin-top: 4px; }

    /* Title */
    .title { text-align: center; margin: 16px 0; }
    .title h1 { font-size: 24px; font-weight: 900; color: #1a1a2e; letter-spacing: 2px; text-transform: uppercase; }
    .title .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }

    /* Info blocks */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .info-box { background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
    .info-box .label { font-size: 10px; font-weight: 800; color: #1a1a2e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
    .info-box .row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; }
    .info-box .row .key { color: #6b7280; }
    .info-box .row .val { font-weight: 700; color: #1a1a2e; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    table thead th { background: #1a1a2e; color: #fff; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    table tbody td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
    table tbody tr:nth-child(even) { background: #f8f9fa; }

    /* Financial */
    .finance { background: linear-gradient(135deg, #fefce8, #fef9c3); border: 2px solid #fbbf24; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
    .finance .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .finance .row .key { color: #78350f; }
    .finance .row .val { font-weight: 700; }
    .finance .total-row { border-top: 2px solid #f59e0b; margin-top: 6px; padding-top: 8px; }
    .finance .total-row .key { font-size: 16px; font-weight: 900; color: #1a1a2e; }
    .finance .total-row .val { font-size: 18px; font-weight: 900; color: #dc2626; }

    /* Signatures */
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; text-align: center; }
    .signatures .sig { padding-top: 8px; }
    .signatures .sig .title-sig { font-weight: 800; font-size: 13px; color: #1a1a2e; margin-bottom: 4px; }
    .signatures .sig .note { font-size: 10px; color: #9ca3af; font-style: italic; }
    .signatures .sig .line { border-bottom: 1px dotted #9ca3af; height: 60px; margin-top: 8px; }

    /* Footer */
    .footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 20px; padding-top: 8px; border-top: 1px solid #e5e7eb; }

    @media print {
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .no-print { display: none !important; }
    }
    @media screen {
        body { background: #e5e7eb; }
        .page { margin: 20px auto; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border-radius: 8px; }
    }

    .print-btn { position: fixed; top: 16px; right: 16px; background: #7c3aed; color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(124,58,237,0.4); z-index: 100; }
    .print-btn:hover { background: #6d28d9; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨️ In Phiếu</button>
<div class="page">
    <!-- Header -->
    <div class="header">
        <img src="/images/logo.png" alt="Logo Đồng Phục HV">
        <div class="header-info">
            <div class="brand">ĐỒNG PHỤC HV</div>
            <div class="company">Công Ty TNHH Sản Xuất & Thương Mại Quốc Tế Trương Tùng</div>
            <div class="contact">📞 0939 845 956 &nbsp;|&nbsp; 📍 LK02-21 Khu Đô Thị Đô Nghĩa, Hà Đông, Hà Nội</div>
        </div>
    </div>

    <!-- Title -->
    <div class="title">
        <h1>📄 Phiếu Giao Hàng</h1>
        <div class="subtitle">Ngày in: ${printDate}</div>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">
        <div class="info-box">
            <div class="label">📋 Thông tin đơn hàng</div>
            <div class="row"><span class="key">Mã đơn:</span><span class="val">${order.order_code}</span></div>
            <div class="row"><span class="key">Ngày lên đơn:</span><span class="val">${orderDate}</span></div>
            <div class="row"><span class="key">Ưu tiên:</span><span class="val">${order.shipping_priority || 'CHUẨN'}</span></div>
        </div>
        <div class="info-box">
            <div class="label">👤 Thông tin khách hàng</div>
            <div class="row"><span class="key">Họ tên:</span><span class="val">${order.customer_name || '—'}</span></div>
            <div class="row"><span class="key">SĐT:</span><span class="val">${order.customer_phone || '—'}</span></div>
            <div class="row"><span class="key">Địa chỉ:</span><span class="val">${order.address || '—'}</span></div>
            <div class="row"><span class="key">Tỉnh/TP:</span><span class="val">${order.province || '—'}</span></div>
        </div>
    </div>

    <!-- Items table -->
    <table>
        <thead>
            <tr>
                <th style="text-align:center;width:30px">#</th>
                <th>Loại</th>
                <th>Sản phẩm</th>
                <th>Vải - Màu</th>
                <th style="text-align:center">SL</th>
                <th style="text-align:right">Đơn giá</th>
                <th style="text-align:center">VAT</th>
                <th style="text-align:right">Thành tiền</th>
            </tr>
        </thead>
        <tbody>
            ${itemRows}
        </tbody>
    </table>

    <!-- Financial Summary -->
    <div class="finance">
        <div class="row"><span class="key">Tổng tiền hàng (trước VAT):</span><span class="val">${fmt(calcBase)}đ</span></div>
        ${surTotal > 0 ? `<div class="row"><span class="key">Phụ phí:</span><span class="val">${fmt(surTotal)}đ</span></div>` : ''}
        <div class="row"><span class="key">VAT:</span><span class="val" style="color:#6366f1">${fmt(calcVat)}đ</span></div>
        ${discount > 0 ? `<div class="row"><span class="key">Giảm giá:</span><span class="val" style="color:#059669">-${fmt(discount)}đ</span></div>` : ''}
        <div class="row"><span class="key">Đã đặt cọc:</span><span class="val" style="color:#2563eb">${fmt(deposit)}đ</span></div>
        <div class="row total-row">
            <span class="key">💰 CẦN THANH TOÁN:</span>
            <span class="val">${fmt(needToPay)}đ</span>
        </div>
    </div>

    <!-- Signatures -->
    <div class="signatures">
        <div class="sig">
            <div class="title-sig">BÊN GIAO HÀNG</div>
            <div class="note">(Ký, ghi rõ họ tên)</div>
            <div class="line"></div>
        </div>
        <div class="sig">
            <div class="title-sig">BÊN NHẬN HÀNG</div>
            <div class="note">(Ký, ghi rõ họ tên)</div>
            <div class="line"></div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        Đồng Phục HV — Chất lượng tạo nên thương hiệu &nbsp;|&nbsp; dongphuchv.com
</div>
</div>
</body>
</html>`;

        reply.type('text/html').send(html);
      } catch(err) {
        console.error('[PRINT ERROR]', err);
        reply.type('text/html').code(500).send(`<h1 style="color:red">Lỗi: ${err.message}</h1><pre>${err.stack}</pre>`);
      }
    });

    // ========== ORDERS: Confirm SX Print (GĐ + Phòng Kế Toán) ==========
    // ★ Dedicated endpoint — does NOT require dht_sua_don permission
    fastify.post('/api/dht/orders/:id/confirm-sx-print', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.id);
        // Check permission: GĐ or Phòng Kế Toán
        let allowed = request.user.role === 'giam_doc';
        if (!allowed) {
            const dept = await db.get('SELECT d.name FROM users u JOIN departments d ON u.department_id = d.id WHERE u.id = $1', [request.user.id]);
            if (dept && dept.name) {
                const n = dept.name.toLowerCase();
                allowed = n.includes('kế toán') || n.includes('ke toan');
            }
        }
        if (!allowed) return reply.code(403).send({ error: '🔒 Chỉ GĐ hoặc Phòng Kế Toán mới được xác nhận in phiếu SX' });

        const order = await db.get('SELECT id, order_code, sx_print_confirmed FROM dht_orders WHERE id = $1', [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });
        if (order.sx_print_confirmed) return reply.code(400).send({ error: 'Đơn hàng đã được xác nhận in phiếu SX rồi' });

        const { vnISOString } = require('../utils/timezone');
        await db.run(
            `UPDATE dht_orders SET sx_print_confirmed = TRUE, sx_print_confirmed_at = $1, sx_print_confirmed_by = $2, last_updated_at = NOW() WHERE id = $3`,
            [vnISOString(), request.user.id, orderId]
        );

        // Audit log
        try {
            await db.run(
                `INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by) VALUES ($1,$2,$3,$4,$5)`,
                [orderId, 'sx_print', '✅ Xác nhận In Phiếu Sản Xuất', JSON.stringify([{ field: 'sx_print_confirmed', label: 'In Phiếu SX', old: 'false', new: 'true' }]), request.user.id]
            );
        } catch(e) { console.error('[AuditLog] sx_print:', e.message); }

        return { success: true };
    });

    // ========== ORDERS: Update (full edit) ==========
    // ★ Requires “Sửa Đơn” permission
    fastify.put('/api/dht/orders/:id', { preHandler: [authenticate, requirePerm('dht_sua_don', 'view')] }, async (request, reply) => {
        const orderId = Number(request.params.id);
        const b = request.body || {};

        // ★ Layer 2: If updating discount, require "Giảm Giá" permission
        if (b.discount_amount !== undefined || b.discount_reason !== undefined) {
            if (request.user.role !== 'giam_doc') {
                const uP = await db.get(`SELECT can_view FROM user_permissions WHERE user_id = $1 AND feature_key = 'dht_giam_gia'`, [request.user.id]);
                let hasGGPerm = false;
                if (uP) {
                    hasGGPerm = uP.can_view > 0;
                } else {
                    const dP = await db.get(`SELECT dp.can_view FROM department_permissions dp JOIN users u ON u.department_id = dp.department_id WHERE u.id = $1 AND dp.feature_key = 'dht_giam_gia'`, [request.user.id]);
                    hasGGPerm = dP && dP.can_view > 0;
                }
                if (!hasGGPerm) {
                    return reply.code(403).send({ error: '🔒 Bạn không có quyền Giảm Giá' });
                }
            }
            // ★ Discount limit: only GĐ and QLCC can discount unlimited
            if (request.user.role !== 'giam_doc' && request.user.role !== 'quan_ly_cap_cao') {
                const discAmt = Number(b.discount_amount) || 0;
                if (discAmt > 5000) {
                    return reply.code(403).send({ error: '⛔ Bạn chỉ được giảm tối đa 5.000đ' });
                }
            }
        }
        // ★ EDIT RESTRICTIONS: Non-GĐ cannot change critical fields
        if (request.user.role !== 'giam_doc') {
            const restrictedFields = ['category_id', 'expected_ship_date', 'shipping_priority', 'standard_delivery_time'];
            for (const rf of restrictedFields) {
                if (b[rf] !== undefined) {
                    // Check if value actually changed
                    const existing = await db.get(`SELECT ${rf} FROM dht_orders WHERE id = $1`, [orderId]);
                    if (existing && String(b[rf]) !== String(existing[rf])) {
                        return reply.code(403).send({ error: '🔒 Bạn không có quyền thay đổi ' + rf });
                    }
                }
            }
        }

        // ★ Fetch old data for audit log diff
        const oldOrder = await db.get('SELECT * FROM dht_orders WHERE id = $1', [orderId]);
        if (!oldOrder) return reply.code(404).send({ error: 'Không tìm thấy đơn' });

        // Build dynamic SET clause
        const allowed = [
            'customer_name', 'customer_phone', 'source', 'province', 'address',
            'cskh_user_id', 'total_quantity', 'total_amount', 'discount_amount',
            'shipping_status', 'shipping_priority', 'shipping_date', 'notes', 'category_id', 'order_date',
            'has_vat', 'vat_amount', 'designer_user_id', 'designer_type', 'carrier_id',
            'expected_ship_date', 'zalo_oa_sent',
            'tracking_code', 'actual_carrier_id', 'actual_ship_datetime', 'delivery_progress',
            'deposit_amount_cache', 'standard_delivery_time', 'sale_note_for_accountant',
            'discount_reason',
            'sx_print_confirmed', 'sx_print_confirmed_at', 'sx_print_confirmed_by'
        ];

        const sets = [];
        const params = [];
        let idx = 1;

        for (const key of allowed) {
            if (b[key] !== undefined) {
                const numericFields = ['cskh_user_id', 'total_quantity', 'total_amount', 'discount_amount', 'category_id', 'vat_amount', 'designer_user_id', 'carrier_id', 'actual_carrier_id', 'deposit_amount_cache'];
                const boolFields = ['has_vat', 'zalo_oa_sent', 'sx_print_confirmed'];
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

        // Handle carrier_extra JSONB
        if (b.carrier_extra !== undefined) {
            sets.push(`carrier_extra = $${idx++}`);
            params.push(b.carrier_extra ? JSON.stringify(b.carrier_extra) : null);
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
                        const dir = path.join(__dirname, '..', 'uploads', 'dht-proofs');
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
            const existing = await db.get('SELECT shipping_date, ship_count FROM dht_orders WHERE id = $1', [orderId]);
            if (!existing?.shipping_date) {
                sets.push(`shipping_date = $${idx++}`);
                const { vnDateStr } = require('../utils/timezone');
                params.push(vnDateStr());
            }
            // Increment ship_count
            sets.push(`ship_count = COALESCE(ship_count, 0) + 1`);
        }

        if (sets.length > 0) {
            sets.push(`last_updated_at = NOW()`);
            sets.push(`last_updated_by = $${idx++}`);
            params.push(request.user.id);
            params.push(orderId);
            await db.run(`UPDATE dht_orders SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        }

        // ★ Smart Update/Replace order items if provided (= full edit via Sửa Đơn)
        if (Array.isArray(b.items)) {
            // Mark as edited
            await db.run('UPDATE dht_orders SET is_edited = TRUE WHERE id = $1', [orderId]);
            
            const oldItems = await db.all('SELECT id FROM dht_order_items WHERE dht_order_id = $1', [orderId]);
            const oldItemIds = oldItems.map(it => Number(it.id));

            // Extract IDs of items sent from frontend
            const sentItemIds = b.items
                .map(item => Number(item.id))
                .filter(id => !isNaN(id) && id > 0);

            // 1. Identify deleted items
            const deletedItemIds = oldItemIds.filter(id => !sentItemIds.includes(id));
            if (deletedItemIds.length > 0) {
                // Fetch cutting records to restore roll weights first
                const cuts = await db.all('SELECT is_cut_done, selected_roll_ids, kg_cut FROM cutting_records WHERE order_item_id = ANY($1)', [deletedItemIds]);
                const { restoreRollWeightsForCuts } = require('../utils/kv_restore_roll');
                await restoreRollWeightsForCuts(db, cuts);

                // Delete cutting records for deleted items
                await db.run('DELETE FROM cutting_records WHERE order_item_id = ANY($1)', [deletedItemIds]);
                // Delete the items (will cascade delete sewing_records, etc.)
                await db.run('DELETE FROM dht_order_items WHERE id = ANY($1)', [deletedItemIds]);
            }

            // 2. Insert or update items
            for (const item of b.items) {
                const itemId = Number(item.id);
                if (itemId && oldItemIds.includes(itemId)) {
                    // Update existing item
                    await db.run(`
                        UPDATE dht_order_items
                        SET description = $1, quantity = $2, unit_price = $3, total = $4,
                            sale_type = $5, product_name = $6, material_id = $7, material_name = $8,
                            color_id = $9, color_name = $10, pattern_name = $11, sewing_techniques = $12,
                            accounting_notes = $13, extra_materials = $14, quantities = $15,
                            extra_product = $16, extra_price = $17, item_total = $18, material_pairs = $19
                        WHERE id = $20 AND dht_order_id = $21
                    `, [
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
                        JSON.stringify(item.material_pairs || []),
                        itemId,
                        orderId
                    ]);

                    // Sync updated product name, material name, and color display to related cutting/sewing records
                    const colorDisplay = (item.material_pairs || []).map(p => p.color_name).join('+') || item.color_name || '';
                    const matDisplay = (item.material_pairs || []).map(p => p.material_name).join('+') || item.material_name || '';
                    const prodName = item.product_name || '';

                    await db.run(`
                        UPDATE cutting_records
                        SET product_name = $1, material_name = $2, fabric_color = $3
                        WHERE order_item_id = $4
                    `, [prodName, matDisplay, colorDisplay, itemId]);

                    await db.run(`
                        UPDATE sewing_records
                        SET product_name = $1
                        WHERE order_item_id = $2
                    `, [prodName, itemId]);
                } else {
                    // Insert new item
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
        // ★ Sync discount_amount to CRM order_codes (doanh số = items - discount)
        if (b.discount_amount !== undefined) {
            try {
                const orderForSync = await db.get('SELECT order_code FROM dht_orders WHERE id = $1', [orderId]);
                if (orderForSync) {
                    await db.run(`UPDATE order_codes SET discount_amount = $1 WHERE order_code = $2`, [Number(b.discount_amount) || 0, orderForSync.order_code]);
                }
            } catch(e) { /* order_code may not exist in CRM */ }
        }

        // ★ Audit log: Cập nhật đơn (diff old vs new)
        try {
            const _labels = {
                customer_name: 'Tên KH', customer_phone: 'SĐT KH', source: 'Nguồn', province: 'Tỉnh/TP', address: 'Địa chỉ',
                total_quantity: 'Tổng SL', total_amount: 'Tổng tiền', discount_amount: 'Giảm giá', discount_reason: 'Lý do GG',
                vat_amount: 'VAT', has_vat: 'Có VAT', shipping_priority: 'TC Gửi', expected_ship_date: 'Ngày gửi DK',
                notes: 'Ghi chú', sale_note_for_accountant: 'Dặn KT', standard_delivery_time: 'Yêu cầu giờ',
                category_id: 'Danh mục', designer_type: 'Loại TK', carrier_id: 'NVC YC',
                deposit_amount_cache: 'Tiền cọc', zalo_oa_sent: 'Zalo OA'
            };
            const changes = [];
            for (const key of Object.keys(_labels)) {
                if (b[key] !== undefined) {
                    const oldVal = oldOrder[key] === null || oldOrder[key] === undefined ? '' : String(oldOrder[key]);
                    const newVal = b[key] === null || b[key] === undefined || b[key] === '' ? '' : String(b[key]);
                    if (oldVal !== newVal) {
                        changes.push({ field: key, label: _labels[key], old: oldVal || '(trống)', new: newVal || '(trống)' });
                    }
                }
            }
            // Smart items comparison — only log if actually changed
            if (Array.isArray(b.items)) {
                const oldItems = await db.all('SELECT product_name, quantity, item_total FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id', [orderId]);
                const oldKey = oldItems.map(i => `${i.product_name}|${i.quantity}|${i.item_total}`).sort().join(';;');
                const newKey = b.items.map(i => `${i.product_name}|${i.quantity}|${i.item_total}`).sort().join(';;');
                if (oldKey !== newKey) {
                    if (oldItems.length !== b.items.length) {
                        changes.push({ field: 'items', label: 'Số lượng phiếu', old: oldItems.length + ' phiếu', new: b.items.length + ' phiếu' });
                    } else {
                        changes.push({ field: 'items', label: 'Sản phẩm', old: '(cũ)', new: 'Đã sửa nội dung ' + b.items.length + ' phiếu' });
                    }
                }
            }
            // Smart surcharges comparison — log specific adds/removes
            if (b.surcharges !== undefined) {
                let oldSur = [];
                try { oldSur = typeof oldOrder.surcharges === 'string' ? JSON.parse(oldOrder.surcharges) : (oldOrder.surcharges || []); } catch(e) {}
                const newSur = b.surcharges || [];
                const oldMap = {};
                oldSur.forEach(s => { oldMap[s.name] = Number(s.amount) || 0; });
                const newMap = {};
                newSur.forEach(s => { newMap[s.name] = Number(s.amount) || 0; });
                // Find added
                for (const s of newSur) {
                    if (oldMap[s.name] === undefined) {
                        changes.push({ field: 'surcharge_add', label: 'Thêm phụ phí "' + s.name + '"', old: null, new: String(Number(s.amount) || 0) });
                    } else if (oldMap[s.name] !== (Number(s.amount) || 0)) {
                        changes.push({ field: 'surcharge_edit', label: 'Phụ phí "' + s.name + '"', old: String(oldMap[s.name]), new: String(Number(s.amount) || 0) });
                    }
                }
                // Find removed
                for (const s of oldSur) {
                    if (newMap[s.name] === undefined) {
                        changes.push({ field: 'surcharge_del', label: 'Xóa phụ phí "' + s.name + '"', old: String(Number(s.amount) || 0), new: null });
                    }
                }
            }
            if (changes.length > 0) {
                const summary = changes.length === 1
                    ? 'Đã thay đổi ' + changes[0].label
                    : 'Đã cập nhật ' + changes.length + ' thông tin';
                await db.run(`INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by) VALUES ($1,$2,$3,$4,$5)`, [
                    orderId, 'update', summary, JSON.stringify(changes), request.user.id
                ]);
            }
        } catch(auditErr) { console.error('[AuditLog] update:', auditErr.message); }

        return { success: true };
    });

    // ========== ORDERS: Delete ==========
    // ★ Requires “Xóa Đơn” permission
    fastify.delete('/api/dht/orders/:id', { preHandler: [authenticate, requirePerm('dht_xoa_don', 'view')] }, async (request, reply) => {
        const orderId = Number(request.params.id);
        // Only creator or giam_doc can delete
        const order = await db.get('SELECT created_by FROM dht_orders WHERE id = $1', [orderId]);
        if (!order) return reply.code(404).send({ error: 'Không tìm thấy đơn hàng' });
        if (order.created_by !== request.user.id && request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ người tạo hoặc Giám Đốc mới được xóa' });
        }

        // Fetch cutting records to restore roll weights first
        const cuts = await db.all('SELECT is_cut_done, selected_roll_ids, kg_cut FROM cutting_records WHERE dht_order_id = $1', [orderId]);
        const { restoreRollWeightsForCuts } = require('../utils/kv_restore_roll');
        await restoreRollWeightsForCuts(db, cuts);

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

        // ★ EXPORT VISIBILITY: Same rules as /api/dht/orders
        const FULL_VIEW_ROLES_EXP = ['giam_doc', 'quan_ly_cap_cao'];
        if (!FULL_VIEW_ROLES_EXP.includes(request.user.role)) {
            const userDeptExp = await db.get(
                'SELECT d.name FROM users u JOIN departments d ON u.department_id = d.id WHERE u.id = $1',
                [request.user.id]
            );
            const isKeToanExp = userDeptExp && userDeptExp.name && (userDeptExp.name.toLowerCase().includes('kế toán') || userDeptExp.name.toLowerCase().includes('ke toan'));
            if (!isKeToanExp) {
                where += ` AND o.created_by = $${idx++}`;
                params.push(request.user.id);
            }
        }

        const orders = await db.all(`
            SELECT o.*,
                c.name AS category_name,
                u_cskh.full_name AS cskh_name,
                COALESCE(pr_dep.deposit_total, 0) AS deposit_amount,
                COALESCE(o.total_amount, 0) - COALESCE(o.discount_amount, 0) - COALESCE(pr_dep.deposit_total, 0) - CASE WHEN o.shipping_fee_payer = 'hv' AND o.shipping_fee_method = 'ck' THEN COALESCE(o.shipping_fee, 0) ELSE 0 END AS remaining_amount,
                order_items.items AS items
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(amount), 0) AS deposit_total
                FROM payment_records
                WHERE total_order_codes ILIKE '%' || o.order_code || '%'
                   OR order_tt_coc = o.order_code
            ) pr_dep ON true
            LEFT JOIN LATERAL (
                SELECT json_agg(json_build_object(
                    'product_name', i.product_name,
                    'description', i.description,
                    'quantity', i.quantity,
                    'cutting_category_name', cc.name
                )) AS items
                FROM dht_order_items i
                LEFT JOIN dht_products p ON p.name = TRIM(COALESCE(i.product_name, i.description)) AND p.is_active = true
                LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id
                WHERE i.dht_order_id = o.id
            ) order_items ON true
            ${where}
            ORDER BY o.order_date DESC, o.id DESC
        `, params);

        // Build CSV with BOM for Excel UTF-8
        const headers = ['Ngày Lên Đơn','Đã Gửi','Số Tiền Còn Lại','Mã Đơn','Nguồn','Tên Khách','SĐT','CSKH','Thành Phố','Tổng SL','Tổng Tiền','Ưu Đãi','Đặt Cọc','TC Gửi','Ngày Gửi','Lĩnh Vực'];
        const csvRows = [headers.join(',')];

        for (const o of orders) {
            let qtyDisplay = o.total_quantity || 0;
            if (o.items) {
                let itemsList = o.items;
                if (typeof itemsList === 'string') {
                    try { itemsList = JSON.parse(itemsList); } catch(e) {}
                }
                qtyDisplay = formatDetailedQuantity(itemsList, o.total_quantity, o.order_code);
            }

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
                `"${String(qtyDisplay).replace(/"/g, '""')}"`,
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
              AND COALESCE(pr.payment_type, '') NOT IN ('dat_coc', 'tra_lai_coc', 'thanh_toan', 'tt_sll')
              AND (pr.total_order_codes IS NULL OR pr.total_order_codes = '')
              AND (pr.order_tt_coc IS NULL OR pr.order_tt_coc = '')
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
        const { name, tracking_url_template } = request.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Nhập tên NVC' });
        await db.run('UPDATE dht_carriers SET name = $1, tracking_url_template = $2 WHERE id = $3', [
            name.trim(),
            (tracking_url_template && tracking_url_template.trim()) ? tracking_url_template.trim() : null,
            Number(request.params.id)
        ]);
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
                   d.name as department_name,
                   pd.name as parent_department_name,
                   COALESCE(pd.name, d.name) as phong_ban,
                   t.name as team_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN departments pd ON d.parent_id = pd.id
            LEFT JOIN team_members tm ON tm.user_id = u.id
            LEFT JOIN teams t ON t.id = tm.team_id
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
        const products = await db.all(`SELECT p.id, p.name, p.sale_type_id, s.name as sale_type_name,
                p.cutting_category_id, cc.name as cutting_category_name
            FROM dht_products p JOIN dht_settings_options s ON s.id = p.sale_type_id
            LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id
            WHERE p.is_active = true ORDER BY p.display_order ASC, p.name ASC`);

        // Materials from Kho Vải
        const materials = await db.all(`SELECT id, name FROM kv_materials WHERE is_active = true ORDER BY display_order ASC, name ASC`);

        return {
            sale_types: grouped['sale_type'] || [],
            cutting_categories: grouped['cutting_category'] || [],
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

    // GET all products (with sale_type + cutting_category info)
    fastify.get('/api/dht/products', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`SELECT p.id, p.name, p.sale_type_id, p.display_order, s.name as sale_type_name,
                p.cutting_category_id, cc.name as cutting_category_name
            FROM dht_products p JOIN dht_settings_options s ON s.id = p.sale_type_id
            LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id
            WHERE p.is_active = true ORDER BY s.name ASC, p.display_order ASC, p.name ASC`);
        return { products: rows };
    });

    // GET products filtered by sale_type_id
    fastify.get('/api/dht/products-by-sale/:saleTypeId', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`SELECT id, name FROM dht_products WHERE sale_type_id = $1 AND is_active = true ORDER BY display_order ASC, name ASC`, [Number(request.params.saleTypeId)]);
        return { products: rows };
    });

    // CREATE product (with optional cutting_category_id)
    fastify.post('/api/dht/products', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { sale_type_id, name, cutting_category_id } = request.body || {};
        if (!sale_type_id || !name) return reply.code(400).send({ error: 'Thiếu thông tin' });
        const mx = await db.get('SELECT COALESCE(MAX(display_order),0) as mx FROM dht_products WHERE sale_type_id = $1', [sale_type_id]);
        const r = await db.get('INSERT INTO dht_products (sale_type_id, name, display_order, cutting_category_id) VALUES ($1,$2,$3,$4) RETURNING *',
            [sale_type_id, name.trim(), (mx?.mx||0)+1, cutting_category_id ? Number(cutting_category_id) : null]);
        return { success: true, product: r };
    });

    // UPDATE product cutting_category
    fastify.put('/api/dht/products/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const pid = Number(request.params.id);
        const { cutting_category_id } = request.body || {};
        await db.run('UPDATE dht_products SET cutting_category_id = $1 WHERE id = $2',
            [cutting_category_id ? Number(cutting_category_id) : null, pid]);
        return { success: true };
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
        const rows = await db.all('SELECT id, name, short_name, display_order, page_link FROM dht_process_steps WHERE is_active = true ORDER BY display_order ASC');
        return { steps: rows };
    });

    // GET process steps assigned to a product
    fastify.get('/api/dht/product-process/:productId', { preHandler: [authenticate] }, async (request, reply) => {
        const pid = Number(request.params.productId);
        const rows = await db.all(`SELECT pp.step_id, s.name, s.short_name, s.page_link
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

    // ========== PRODUCTION WORKFLOW — Quy Trình Sản Xuất ==========

    function getOrderStepsHelper(order, opSteps, stepsList) {
        const code = (order.order_code || '').toUpperCase();
        const catName = (order.category_name || '').toUpperCase();
        const isPetTem = catName === 'PET' || catName === 'TEM' ||
                         code.includes('PET') || code.includes('TEM');

        if (isPetTem) {
            const opPrint = opSteps.find(s => s.step_id === 3);
            return [
                {
                    step_id: 3,
                    name: 'Chờ in',
                    short_name: 'IN',
                    display_order: 1,
                    page_link: '/bophaninhv',
                    is_completed: opPrint ? opPrint.is_completed : false,
                    completed_at: opPrint ? opPrint.completed_at : null,
                    completed_by: opPrint ? opPrint.completed_by : null,
                    completed_by_name: opPrint ? opPrint.completed_by_name : null
                },
                {
                    step_id: -1,
                    name: 'Kế toán gửi hàng',
                    short_name: 'GỬI',
                    display_order: 2,
                    page_link: null,
                    is_completed: order.shipping_status === 'shipped' || !!order.shipped_at,
                    completed_at: order.shipped_at,
                    completed_by: order.shipped_by,
                    completed_by_name: order.shipped_by_name
                }
            ];
        }

        return stepsList;
    }

    // GET production status for a specific order
    fastify.get('/api/dht/orders/:orderId/production', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.orderId);
        const order = await db.get(`
            SELECT o.id, o.order_code, o.shipping_status, o.shipped_at, o.shipped_by,
                   c.name AS category_name,
                   u_shipped.full_name AS shipped_by_name
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_shipped ON o.shipped_by = u_shipped.id
            WHERE o.id = $1
        `, [orderId]);
        if (!order) return reply.code(404).send({ error: 'Đơn hàng không tồn tại' });

        const stepsList = await db.all(`
            SELECT ps.id AS step_id, ps.name, ps.short_name, ps.display_order, ps.page_link,
                   COALESCE(op.is_completed, false) AS is_completed,
                   op.completed_at, op.completed_by, op.notes,
                   u.full_name AS completed_by_name
            FROM dht_process_steps ps
            LEFT JOIN dht_order_production op ON op.step_id = ps.id AND op.dht_order_id = $1
            LEFT JOIN users u ON op.completed_by = u.id
            WHERE ps.is_active = true
            ORDER BY ps.display_order
        `, [orderId]);

        const steps = getOrderStepsHelper(order, stepsList, stepsList);
        return { steps };
    });

    // POST toggle a production step for an order
    fastify.post('/api/dht/orders/:orderId/production/:stepId', { preHandler: [authenticate] }, async (request, reply) => {
        const orderId = Number(request.params.orderId);
        const stepId = Number(request.params.stepId);
        const userId = request.user.id;
        const { vnNow } = require('./utils/timezone');
        const now = vnNow();

        const order = await db.get(`
            SELECT o.id, o.order_code, o.shipping_status, o.shipped_at, o.shipped_by,
                   c.name AS category_name,
                   u_shipped.full_name AS shipped_by_name
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_shipped ON o.shipped_by = u_shipped.id
            WHERE o.id = $1
        `, [orderId]);
        if (!order) return reply.code(404).send({ error: 'Đơn hàng không tồn tại' });

        if (stepId === -1) {
            const isShipped = order.shipping_status === 'shipped';
            if (isShipped) {
                await db.run(`
                    UPDATE dht_orders 
                    SET shipping_status = 'pending', shipped_at = NULL, shipped_by = NULL 
                    WHERE id = $1
                `, [orderId]);
            } else {
                await db.run(`
                    UPDATE dht_orders 
                    SET shipping_status = 'shipped', shipped_at = $1, shipped_by = $2 
                    WHERE id = $3
                `, [now, userId, orderId]);
            }
        } else {
            // Check if record exists
            const existing = await db.get('SELECT * FROM dht_order_production WHERE dht_order_id = $1 AND step_id = $2', [orderId, stepId]);

            if (existing) {
                // Toggle: if completed → uncomplete, if not → complete
                if (existing.is_completed) {
                    await db.run('UPDATE dht_order_production SET is_completed = false, completed_at = NULL, completed_by = NULL WHERE id = $1', [existing.id]);
                } else {
                    await db.run('UPDATE dht_order_production SET is_completed = true, completed_at = $1, completed_by = $2 WHERE id = $3', [now, userId, existing.id]);
                }
            } else {
                // Create new as completed
                await db.run(`INSERT INTO dht_order_production (dht_order_id, step_id, is_completed, completed_at, completed_by)
                    VALUES ($1, $2, true, $3, $4)`, [orderId, stepId, now, userId]);
            }
        }

        const updatedOrder = await db.get(`
            SELECT o.id, o.order_code, o.shipping_status, o.shipped_at, o.shipped_by,
                   c.name AS category_name,
                   u_shipped.full_name AS shipped_by_name
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_shipped ON o.shipped_by = u_shipped.id
            WHERE o.id = $1
        `, [orderId]);

        // Return updated steps
        const stepsList = await db.all(`
            SELECT ps.id AS step_id, ps.name, ps.short_name, ps.display_order, ps.page_link,
                   COALESCE(op.is_completed, false) AS is_completed,
                   op.completed_at, op.completed_by, op.notes,
                   u.full_name AS completed_by_name
            FROM dht_process_steps ps
            LEFT JOIN dht_order_production op ON op.step_id = ps.id AND op.dht_order_id = $1
            LEFT JOIN users u ON op.completed_by = u.id
            WHERE ps.is_active = true
            ORDER BY ps.display_order
        `, [orderId]);

        const steps = getOrderStepsHelper(updatedOrder, stepsList, stepsList);
        return { success: true, steps };
    });

    // ========== PET/TEM: Available Deposits (from Sổ Ghi Nhận Tiền) ==========
    fastify.get('/api/dht/available-deposits', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`
            SELECT pr.id, pr.payment_code, pr.amount, pr.customer_name, pr.customer_phone,
                   pr.payment_date, pr.bank_name, pr.transfer_note as description, pr.payment_method
            FROM payment_records pr
            WHERE (pr.order_tt_coc IS NULL OR pr.order_tt_coc = '')
              AND COALESCE(pr.payment_type, '') NOT IN ('tra_lai_coc', 'thanh_toan', 'tt_sll')
              AND (pr.locked_by IS NULL OR pr.locked_by = $1
                   OR pr.locked_at < NOW() - INTERVAL '10 minutes')
              AND NOT EXISTS (
                  SELECT 1 FROM dht_orders d WHERE d.deposit_payment_id = pr.id
              )
            ORDER BY pr.payment_date DESC, pr.id DESC
            LIMIT 100
        `, [request.user.id]);
        return { deposits: rows };
    });

    // ========== PET/TEM: Source Settings ==========
    // PET sources
    fastify.get('/api/dht/pet-sources', { preHandler: [authenticate] }, async (request, reply) => {
        const items = await db.all('SELECT * FROM dht_pet_sources ORDER BY sort_order ASC, id ASC');
        return { items };
    });
    fastify.post('/api/dht/pet-sources', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { name } = request.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Nhập tên nguồn PET' });
        const mx = await db.get('SELECT COALESCE(MAX(sort_order),0) as mx FROM dht_pet_sources');
        const r = await db.get('INSERT INTO dht_pet_sources (name, sort_order) VALUES ($1, $2) RETURNING *', [name.trim(), (mx?.mx || 0) + 1]);
        return { success: true, item: r };
    });
    fastify.delete('/api/dht/pet-sources/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        await db.run('DELETE FROM dht_pet_sources WHERE id = $1', [Number(request.params.id)]);
        return { success: true };
    });

    // TEM sources
    fastify.get('/api/dht/tem-sources', { preHandler: [authenticate] }, async (request, reply) => {
        const items = await db.all('SELECT * FROM dht_tem_sources ORDER BY sort_order ASC, id ASC');
        return { items };
    });
    fastify.post('/api/dht/tem-sources', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { name } = request.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Nhập tên nguồn TEM' });
        const mx = await db.get('SELECT COALESCE(MAX(sort_order),0) as mx FROM dht_tem_sources');
        const r = await db.get('INSERT INTO dht_tem_sources (name, sort_order) VALUES ($1, $2) RETURNING *', [name.trim(), (mx?.mx || 0) + 1]);
        return { success: true, item: r };
    });
    fastify.delete('/api/dht/tem-sources/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        await db.run('DELETE FROM dht_tem_sources WHERE id = $1', [Number(request.params.id)]);
        return { success: true };
    });

    // ========== PET/TEM: Free Customer Search ==========
    fastify.get('/api/dht/free-customers/search', { preHandler: [authenticate] }, async (request, reply) => {
        const q = (request.query.q || '').trim();
        const cat = (request.query.cat || '').trim();
        const role = request.user.role || '';
        const userId = request.user.id;

        // GĐ + QLCC see all, others see only their own
        const seeAll = (role === 'giam_doc' || role === 'quan_ly_cap_cao');
        const ownerFilter = seeAll ? '' : ' AND created_by = ' + parseInt(userId);

        let rows;
        if (!q) {
            rows = await db.all(`
                SELECT id, name, phone, address, province, categories
                FROM dht_free_customers
                WHERE 1=1 ${ownerFilter}
                ORDER BY
                    CASE WHEN $1 != '' AND $1 = ANY(categories) THEN 0 ELSE 1 END,
                    updated_at DESC
                LIMIT 30
            `, [cat]);
        } else {
            rows = await db.all(`
                SELECT id, name, phone, address, province, categories
                FROM dht_free_customers
                WHERE (name ILIKE $1 OR phone ILIKE $1) ${ownerFilter}
                ORDER BY
                    CASE WHEN $2 != '' AND $2 = ANY(categories) THEN 0 ELSE 1 END,
                    updated_at DESC
                LIMIT 15
            `, ['%' + q + '%', cat]);
        }
        return { customers: rows };
    });
};
