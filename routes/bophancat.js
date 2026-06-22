// ========== BỘ PHẬN CẮT — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow, vnFormat } = require('../utils/timezone');

module.exports = async function(fastify) {

    async function createCompensationTicket(rec, cutQty, performedBy, timeStr) {
        const remQty = Number(rec.order_quantity) - Number(cutQty);
        if (remQty <= 0) return;
        const newRec = await db.get(`
            INSERT INTO cutting_records (
                dht_order_id, order_item_id, phoi_index, cut_date, cutter_id,
                product_name, material_name, fabric_color,
                order_quantity, cut_quantity, kg_cut, cut_ratio,
                ratio_reason, kg_start, kg_end, cut_warning, cut_shared,
                created_by, created_at, cutting_category, selected_roll_ids
            ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, 0, 0, 0, NULL, 0, 0, $9, NULL, $10, $11, $12, '[]')
            RETURNING id
        `, [
            rec.dht_order_id, rec.order_item_id, rec.phoi_index || 0, rec.cutter_id, rec.product_name, rec.material_name, rec.fabric_color,
            remQty, `Cắt bù phần thiếu: ${remQty} áo`, performedBy, timeStr, rec.cutting_category
        ]);
        await db.run(`INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [newRec.id, 'create', `Tạo phiếu cắt bù cho đơn thiếu (${remQty} áo)`, performedBy, timeStr]);
    }

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
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_cutting_order_item ON cutting_records(order_item_id)`);
    } catch(e) { console.error('[BPC] cutting_records:', e.message); }
    // Add cutting_category column if not exists
    try { await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS cutting_category TEXT`); } catch(e) {}
    // Add selected_roll_ids JSONB for storing which rolls were selected for cutting
    try { await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS selected_roll_ids JSONB DEFAULT '[]'`); } catch(e) {}
    // Add locked_by_cutting_id to kv_rolls for hard-locking rolls during cutting
    try { await db.exec(`ALTER TABLE kv_rolls ADD COLUMN IF NOT EXISTS locked_by_cutting_id INTEGER REFERENCES cutting_records(id) ON DELETE SET NULL`); } catch(e) {}
    // Add multi_cut_group_id for grouping records that are cut together
    try { await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS multi_cut_group_id TEXT`); } catch(e) {}
    // Add phoi_index to cutting_records for coordinating specific pieces
    try { await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS phoi_index INTEGER`); } catch(e) {}
    // Add target_cut_ratio to kv_materials
    try { await db.exec(`ALTER TABLE kv_materials ADD COLUMN IF NOT EXISTS target_cut_ratio NUMERIC DEFAULT 0`); } catch(e) {}
    // Add kv_material_cutting_targets table
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS kv_material_cutting_targets (
            id SERIAL PRIMARY KEY,
            material_id INTEGER REFERENCES kv_materials(id) ON DELETE CASCADE,
            cutting_category TEXT NOT NULL,
            target_ratio NUMERIC DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(material_id, cutting_category)
        )`);
    } catch(e) { console.error('[BPC] kv_material_cutting_targets:', e.message); }
    // Add ratio_image to cutting_records
    try { await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS ratio_image TEXT`); } catch(e) {}
    // Add wash_items and wash_market_image to cutting_records
    try { await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS wash_items JSONB DEFAULT '[]'`); } catch(e) {}
    try { await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS wash_market_image TEXT`); } catch(e) {}
    // Backfill cutting_category for existing records
    try {
        await db.exec(`
            UPDATE cutting_records cr
            SET cutting_category = cc.name
            FROM dht_order_items oi
            JOIN dht_products p ON p.name = TRIM(oi.description) AND p.is_active = true
            JOIN dht_settings_options cc ON cc.id = p.cutting_category_id
            WHERE cr.order_item_id = oi.id
              AND cr.cutting_category IS NULL
              AND cc.name IS NOT NULL
        `);
    } catch(e) { console.log('[BPC] backfill cutting_category:', e.message); }

    // Backfill selected_roll_ids with label for existing records
    try {
        const recs = await db.all(`SELECT id, selected_roll_ids FROM cutting_records WHERE selected_roll_ids IS NOT NULL AND selected_roll_ids != '[]'`);
        for (const rec of recs) {
            let rolls = typeof rec.selected_roll_ids === 'string' ? JSON.parse(rec.selected_roll_ids) : (rec.selected_roll_ids || []);
            if (!rolls.length || rolls[0].label) continue; // skip if empty or already has label
            const rollIds = rolls.map(r => r.roll_id);
            const details = await db.all(`
                SELECT r.id, r.weight, m.name AS material_name, fc.color_name
                FROM kv_rolls r
                JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                JOIN kv_materials m ON m.id = fc.material_id
                WHERE r.id = ANY($1)
            `, [rollIds]);
            const detailMap = {};
            details.forEach(d => { detailMap[d.id] = d; });
            const updated = rolls.map(r => {
                const d = detailMap[r.roll_id];
                return { ...r, label: d ? (d.material_name + ' - ' + d.color_name + ' - ' + Number(d.weight) + 'kg') : r.roll_code };
            });
            await db.run(`UPDATE cutting_records SET selected_roll_ids = $1 WHERE id = $2`, [JSON.stringify(updated), rec.id]);
        }
    } catch(e) { console.log('[BPC] backfill roll labels:', e.message); }

    // Backfill phoi_index for existing records
    try {
        const recs = await db.all(`
            SELECT cr.id, cr.order_item_id, cr.material_name, cr.fabric_color, oi.material_pairs
            FROM cutting_records cr
            JOIN dht_order_items oi ON cr.order_item_id = oi.id
            WHERE cr.phoi_index IS NULL
        `);
        for (const rec of recs) {
            let pairs = [];
            try { pairs = typeof rec.material_pairs === 'string' ? JSON.parse(rec.material_pairs) : (rec.material_pairs || []); } catch(e) {}
            let matchedIdx = 0;
            if (pairs.length > 0) {
                const targetMat = (rec.material_name || '').trim().toLowerCase();
                const targetCol = (rec.fabric_color || '').trim().toLowerCase();
                const pi = pairs.findIndex(p => 
                    (p.material_name || '').trim().toLowerCase() === targetMat &&
                    (p.color_name || '').trim().toLowerCase() === targetCol
                );
                if (pi >= 0) {
                    matchedIdx = pi;
                }
            }
            await db.run(`UPDATE cutting_records SET phoi_index = $1 WHERE id = $2`, [matchedIdx, rec.id]);
        }
    } catch(e) { console.log('[BPC] backfill phoi_index:', e.message); }

    // Cleanup invalid claimed records where fabric hasn't arrived/fulfilled
    try {
        const records = await db.all(`
            SELECT cr.id, cr.order_item_id, cr.phoi_index, cr.product_name
            FROM cutting_records cr
            WHERE cr.is_cutting = false AND cr.is_cut_done = false AND cr.cutter_id IS NOT NULL
        `);
        let releasedCount = 0;
        for (const r of records) {
            const reservations = await db.all(`
                SELECT status FROM qlx_fabric_reservations
                WHERE item_id = $1 AND phoi_index = $2 AND status != 'released'
            `, [r.order_item_id, r.phoi_index]);
            const hasRes = reservations.length > 0;
            const allArrived = hasRes && reservations.every(res => res.status === 'arrived' || res.status === 'fulfilled');
            if (!allArrived) {
                console.log(`[BPC Startup Cleanup] Releasing invalid claim: ${r.product_name} (ID: ${r.id})`);
                await db.run(`DELETE FROM cutting_records WHERE id = $1`, [r.id]);
                releasedCount++;
            }
        }
        if (releasedCount > 0) {
            console.log(`[BPC Startup Cleanup] Released ${releasedCount} invalid claimed cutting records.`);
        }
    } catch(e) { console.error('[BPC Startup Cleanup] Error:', e.message); }

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

    // ========== MIGRATION: Update old PHỐI names to Phiếu X — PY format ==========
    try {
        const oldRecords = await db.all(`
            SELECT DISTINCT cr.dht_order_id
            FROM cutting_records cr
            WHERE cr.product_name LIKE '%PHỐI%'
        `);
        if (oldRecords.length > 0) {
            console.log('[BPC] Migrating', oldRecords.length, 'orders from PHỐI to Phiếu format...');
            for (const ord of oldRecords) {
                const order = await db.get('SELECT order_code FROM dht_orders WHERE id = $1', [ord.dht_order_id]);
                if (!order) continue;
                const items = await db.all('SELECT id, description, material_pairs FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id', [ord.dht_order_id]);
                // Calculate total phối
                let totalPhoi = 0;
                const phoiList = [];
                let itemIdx = 0;
                for (const it of items) {
                    itemIdx++;
                    let pairs = [];
                    try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}
                    if (pairs.length > 0) {
                        for (let pi = 0; pi < pairs.length; pi++) {
                            totalPhoi++;
                            phoiList.push({ item_id: it.id, itemIdx, phoiInItem: pi + 1, desc: it.description });
                        }
                    } else {
                        totalPhoi++;
                        phoiList.push({ item_id: it.id, itemIdx, phoiInItem: 1, desc: it.description });
                    }
                }
                // Get cutting records for this order, ordered by id (creation order matches phối order)
                const crs = await db.all('SELECT id, order_item_id FROM cutting_records WHERE dht_order_id = $1 ORDER BY id', [ord.dht_order_id]);
                for (let ci = 0; ci < crs.length && ci < phoiList.length; ci++) {
                    const p = phoiList[ci];
                    const newName = totalPhoi > 1
                        ? order.order_code + ' — Phiếu ' + p.itemIdx + ' — P' + p.phoiInItem + (p.desc ? ' — ' + p.desc : '')
                        : order.order_code + (p.desc ? ' — ' + p.desc : '');
                    await db.run('UPDATE cutting_records SET product_name = $1 WHERE id = $2', [newName, crs[ci].id]);
                }
            }
            console.log('[BPC] Migration complete.');
        }
    } catch(e) { console.error('[BPC] migration PHỐI→Phiếu:', e.message); }

    // ========== MIGRATION: Release stale reservations for already-cut orders/items ==========
    try {
        const releasedCount = await db.run(`
            UPDATE qlx_fabric_reservations res
            SET status = 'released', updated_at = NOW()
            FROM cutting_records cr
            WHERE res.dht_order_id = cr.dht_order_id
              AND res.item_id = cr.order_item_id
              AND cr.is_cut_done = TRUE
              AND res.status IN ('reserved', 'arrived')
        `);
        if (releasedCount && releasedCount.changes > 0) {
            console.log('[BPC] Released', releasedCount.changes, 'stale reservations for completed cuts.');
        }
    } catch(e) { console.error('[BPC] migration release stale reservations:', e.message); }


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
            if (n.includes('quản lý xưởng') || n.includes('quan ly xuong') || n.includes('qlx')) return true;
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

    async function calculateCutterSalary(cutterId, productType, quantity) {
        if (!cutterId || !productType || !quantity) return { unit_price: 0, salary: 0 };
        const assignment = await db.get(`
            SELECT tier_id FROM user_cutting_salary_tiers 
            WHERE user_id = $1 AND product_type = $2
        `, [cutterId, productType]);
        if (!assignment) return { unit_price: 0, salary: 0 };

        const tier = await db.get(`
            SELECT rules FROM cutting_salary_tiers WHERE id = $1
        `, [assignment.tier_id]);
        if (!tier || !tier.rules) return { unit_price: 0, salary: 0 };

        let rules = [];
        try {
            rules = typeof tier.rules === 'string' ? JSON.parse(tier.rules) : tier.rules;
        } catch(e) {
            console.error('[BPC] Error parsing rules:', e);
            return { unit_price: 0, salary: 0 };
        }

        const qty = Number(quantity) || 0;
        let price = 0;
        for (const rule of rules) {
            const min = rule.min_qty !== null && rule.min_qty !== undefined ? Number(rule.min_qty) : 0;
            const max = rule.max_qty !== null && rule.max_qty !== undefined ? Number(rule.max_qty) : Infinity;
            if (qty >= min && qty <= max) {
                price = Number(rule.price) || 0;
                break;
            }
        }
        return { unit_price: price, salary: price * qty };
    }

    // ========== TREE: Sidebar data (V2 — Year→Cutter→{Incomplete, Month}) ==========
    fastify.get('/api/cutting/tree', { preHandler: [authenticate] }, async (request, reply) => {
        const isManager = await isCutManager(request);

        let where = '';
        const params = [];
        // NV chỉ xem đơn mình cắt
        if (!isManager && !['quan_ly', 'truong_phong'].includes(request.user.role)) {
            where = ' AND cr.cutter_id = $1';
            params.push(request.user.id);
        }

        // ── Cutting records grouped: year → cutter → done/incomplete ──
        const rows = await db.all(`
            SELECT
                EXTRACT(YEAR FROM COALESCE(cr.cut_date, cr.created_at))::int AS year,
                cr.cutter_id,
                u.full_name AS cutter_name,
                cr.is_cut_done,
                CASE WHEN cr.is_cut_done THEN
                    EXTRACT(MONTH FROM COALESCE(cr.cut_done_at, cr.cut_date, cr.created_at))::int
                ELSE NULL END AS done_month,
                COUNT(*)::int AS cnt
            FROM cutting_records cr
            LEFT JOIN users u ON cr.cutter_id = u.id
            WHERE 1=1 ${where}
            GROUP BY year, cr.cutter_id, u.full_name, cr.is_cut_done, done_month
            ORDER BY year DESC, u.full_name, done_month DESC
        `, params);

        const total = rows.reduce((s, r) => s + r.cnt, 0);

        // Build tree: year → cutter → { incomplete_count, months: [{month, count}] }
        const yearMap = {};
        for (const r of rows) {
            if (!yearMap[r.year]) yearMap[r.year] = { year: r.year, count: 0, cutters: {} };
            const cutKey = r.cutter_id || 0;
            if (!yearMap[r.year].cutters[cutKey]) {
                yearMap[r.year].cutters[cutKey] = {
                    id: r.cutter_id, name: r.cutter_name || 'Chưa phân công',
                    total: 0, incomplete_count: 0, months: {}
                };
            }
            const cutter = yearMap[r.year].cutters[cutKey];
            cutter.total += r.cnt;
            yearMap[r.year].count += r.cnt;
            if (r.is_cut_done && r.done_month) {
                if (!cutter.months[r.done_month]) cutter.months[r.done_month] = { month: r.done_month, count: 0 };
                cutter.months[r.done_month].count += r.cnt;
            } else {
                cutter.incomplete_count += r.cnt;
            }
        }

        // Convert to arrays
        const yearTree = Object.values(yearMap).map(y => ({
            year: y.year, count: y.count,
            cutters: Object.values(y.cutters).map(c => ({
                ...c, months: Object.values(c.months).sort((a, b) => b.month - a.month)
            }))
        })).sort((a, b) => b.year - a.year);

        // ── Unassigned count — coordination (phối) level ──
        const isManagerOrStaff = isManager || ['quan_ly', 'truong_phong'].includes(request.user.role);
        const unassignedItems = await db.all(`
            SELECT
                i.id,
                i.material_pairs,
                COALESCE(p.fabric_arrived, false) AS fabric_arrived,
                EXISTS (
                    SELECT 1 FROM qlx_assignments qa 
                    WHERE qa.dht_order_id = o.id 
                      AND qa.assignment_type = 'in' 
                      AND (qa.assigned_user_id IS NOT NULL OR qa.assigned_contractor_id IS NOT NULL)
                ) AS has_pc_in
            FROM dht_orders o
            JOIN dht_order_items i ON i.dht_order_id = o.id
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id AND p.item_id IS NULL
            LEFT JOIN dht_categories c ON o.category_id = c.id
            WHERE (
                (
                    COALESCE(jsonb_array_length(i.material_pairs), 0) = 0
                    AND NOT EXISTS (
                        SELECT 1 FROM cutting_records cr 
                        WHERE cr.order_item_id = i.id AND cr.cutter_id IS NOT NULL
                    )
                )
                OR
                (
                    COALESCE(jsonb_array_length(i.material_pairs), 0) > 0
                    AND (
                        SELECT COUNT(*)::int FROM cutting_records cr 
                        WHERE cr.order_item_id = i.id AND cr.cutter_id IS NOT NULL
                    ) < jsonb_array_length(i.material_pairs)
                )
            )
              AND EXISTS (SELECT 1 FROM qlx_preparation pp WHERE pp.dht_order_id = o.id)
              AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
              AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
              AND COALESCE(o.shipping_status, '') != 'shipped'
        `);

        const unassignedItemIds = unassignedItems.map(it => it.id);
        let claimedRecs = [];
        if (unassignedItemIds.length > 0) {
            claimedRecs = await db.all(`
                SELECT id, order_item_id, material_name, fabric_color, cutter_id, is_cut_done, cut_warning 
                FROM cutting_records 
                WHERE order_item_id = ANY($1)
            `, [unassignedItemIds]);
        }

        let totalUnassigned = 0;
        let readyUnassigned = 0;
        let pendingUnassigned = 0;

        for (const it of unassignedItems) {
            let pairs = [];
            try {
                pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []);
            } catch(e) {}

            const itemRecords = claimedRecs.filter(r => r.order_item_id === it.id);
            const originalCutterId = (itemRecords.find(r => r.is_cut_done === true) || {}).cutter_id || null;

            let cnt = 0;
            if (pairs.length > 0) {
                // Track which pairs have been claimed
                const claimedPairs = [];
                for (const r of itemRecords) {
                    if (r.cutter_id !== null) {
                        claimedPairs.push({
                            material: (r.material_name || '').trim().toLowerCase(),
                            color: (r.fabric_color || '').trim().toLowerCase()
                        });
                    }
                }

                for (let pi = 0; pi < pairs.length; pi++) {
                    const phoi = pairs[pi];
                    const pMat = (phoi.material_name || '').trim().toLowerCase();
                    const pCol = (phoi.color_name || '').trim().toLowerCase();

                    // Check if claimed
                    const isClaimed = claimedPairs.some(cp => cp.material === pMat && cp.color === pCol);
                    
                    // Check if there is an unclaimed record (compensation)
                    const unclaimedRec = itemRecords.find(r => 
                        r.cutter_id === null && !r.is_cut_done &&
                        (r.material_name || '').trim().toLowerCase() === pMat &&
                        (r.fabric_color || '').trim().toLowerCase() === pCol
                    );

                    if (!isClaimed || unclaimedRec) {
                        if (unclaimedRec && unclaimedRec.cut_warning && unclaimedRec.cut_warning.indexOf('Cắt bù') >= 0) {
                            if (!isManagerOrStaff && originalCutterId && originalCutterId !== request.user.id) {
                                continue;
                            }
                        }
                        cnt++;
                    }
                }
            } else {
                const hasClaimed = itemRecords.some(r => r.cutter_id !== null);
                const unclaimedRec = itemRecords.find(r => r.cutter_id === null && !r.is_cut_done);

                if (!hasClaimed || unclaimedRec) {
                    if (unclaimedRec && unclaimedRec.cut_warning && unclaimedRec.cut_warning.indexOf('Cắt bù') >= 0) {
                        if (!isManagerOrStaff && originalCutterId && originalCutterId !== request.user.id) {
                            continue;
                        }
                    }
                    cnt++;
                }
            }

            totalUnassigned += cnt;
            if (it.fabric_arrived && it.has_pc_in) {
                readyUnassigned += cnt;
            } else {
                pendingUnassigned += cnt;
            }
        }
        const unassigned = { total: totalUnassigned, ready: readyUnassigned, pending: pendingUnassigned };

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

        return {
            yearTree,
            total,
            stats: stats || { total: 0, cutting: 0, done: 0, approved: 0 },
            unassigned: unassigned || { total: 0, ready: 0, pending: 0 }
        };
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
        else if (status === 'incomplete') { where += ` AND cr.is_cut_done = false`; }
        if (search) {
            where += ` AND (cr.product_name ILIKE $${idx} OR cr.material_name ILIKE $${idx} OR o.order_code ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR u_cutter.full_name ILIKE $${idx} OR u_cskh.full_name ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        const records = await db.all(`
            SELECT cr.id, cr.dht_order_id, cr.order_item_id, cr.phoi_index, cr.is_cutting, cr.cutting_at, cr.cutting_by,
                   cr.is_cut_done, cr.cut_done_at, cr.cut_done_by, cr.salary_approved, cr.salary_approved_at,
                   cr.salary_approved_by, cr.wash_reported, cr.wash_reported_at, cr.wash_reported_by,
                   cr.error_reported, cr.error_order_id, cr.cut_date, cr.cutter_id, cr.product_name,
                   cr.material_name, cr.fabric_color, cr.order_quantity, cr.cut_quantity, cr.kg_cut,
                   cr.cut_ratio, cr.ratio_reason, cr.kg_start, cr.kg_end, cr.cut_warning, cr.cut_shared,
                   cr.created_by, cr.created_at, cr.updated_at, cr.cutting_category, cr.selected_roll_ids,
                   cr.multi_cut_group_id, cr.unit_price, cr.salary, cr.wash_items, cr.wash_market_image,
                   COALESCE(NULLIF(fc.location, ''), NULLIF(m.location, '')) AS warehouse_location,
                   (
                       SELECT sub.cut_quantity 
                       FROM cutting_records sub 
                       WHERE sub.dht_order_id = cr.dht_order_id 
                         AND sub.order_item_id = cr.order_item_id 
                         AND sub.is_cut_done = true 
                         AND sub.id != cr.id
                         AND (
                             (COALESCE(cr.cut_warning, '') LIKE '%Cắt bù%') = (COALESCE(sub.cut_warning, '') LIKE '%Cắt bù%')
                         )
                       LIMIT 1
                   ) AS ticket_completed_quantity,
                   (
                       SELECT EXISTS (
                           SELECT 1 FROM cutting_records sub 
                           WHERE sub.order_item_id = cr.order_item_id 
                             AND sub.cut_warning LIKE '%Cắt bù%'
                       )
                   )::boolean AS has_compensation_ticket,
                   u_cutter.full_name AS cutter_name,
                   u_done.full_name AS cut_done_by_name,
                   u_salary.full_name AS salary_approved_by_name,
                   u_wash.full_name AS wash_reported_by_name,
                   o.order_code, o.shipping_priority,
                   o.customer_name,
                   u_cskh.full_name AS cskh_name,
                   u_created.full_name AS created_by_name,
                   -- Last history
                   lh.details AS last_update_detail,
                   lh.performed_at AS last_update_at,
                   lh_user.full_name AS last_update_by,
                   t.target_ratio AS target_cut_ratio,
                   w.unit AS fabric_unit,
                   sch.cut_expected_at
             FROM cutting_records cr
             LEFT JOIN users u_cutter ON cr.cutter_id = u_cutter.id
             LEFT JOIN users u_done ON cr.cut_done_by = u_done.id
             LEFT JOIN users u_salary ON cr.salary_approved_by = u_salary.id
             LEFT JOIN users u_wash ON cr.wash_reported_by = u_wash.id
             LEFT JOIN dht_orders o ON cr.dht_order_id = o.id
             LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
             LEFT JOIN users u_created ON o.created_by = u_created.id
             LEFT JOIN kv_materials m ON m.name = cr.material_name AND m.is_active = true
             LEFT JOIN kv_fabric_colors fc ON fc.material_id = m.id AND fc.color_name = cr.fabric_color AND fc.is_active = true
             LEFT JOIN kv_warehouses w ON m.warehouse_id = w.id
             LEFT JOIN kv_material_cutting_targets t ON t.material_id = m.id AND t.cutting_category = cr.cutting_category
             LEFT JOIN qlx_item_schedules sch ON sch.dht_order_id = cr.dht_order_id AND (sch.order_item_id = cr.order_item_id OR (sch.order_item_id IS NULL AND cr.order_item_id IS NULL))
             LEFT JOIN LATERAL (
                 SELECT h.details, h.performed_at, h.performed_by
                 FROM cutting_history h WHERE h.cutting_id = cr.id
                 ORDER BY h.performed_at DESC LIMIT 1
             ) lh ON true
             LEFT JOIN users lh_user ON lh.performed_by = lh_user.id
             ${where}
             ORDER BY cr.is_cutting DESC, COALESCE(cr.multi_cut_group_id, 'ZZZ') ASC, o.order_code ASC NULLS LAST, (CASE WHEN COALESCE(cr.cut_warning, '') LIKE '%Cắt bù%' THEN 1 ELSE 0 END) ASC, cr.product_name ASC, cr.created_at DESC
        `, params);

        return { records };
    });

    // ========== GET SINGLE RECORD: Chi tiết một đơn cắt ==========
    fastify.get('/api/cutting/records/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const record = await db.get(`
            SELECT cr.id, cr.dht_order_id, cr.order_item_id, cr.phoi_index, cr.is_cutting, cr.cutting_at, cr.cutting_by,
                   cr.is_cut_done, cr.cut_done_at, cr.cut_done_by, cr.salary_approved, cr.salary_approved_at,
                   cr.salary_approved_by, cr.wash_reported, cr.wash_reported_at, cr.wash_reported_by,
                   cr.error_reported, cr.error_order_id, cr.cut_date, cr.cutter_id, cr.product_name,
                   cr.material_name, cr.fabric_color, cr.order_quantity, cr.cut_quantity, cr.kg_cut,
                   cr.cut_ratio, cr.ratio_reason, cr.kg_start, cr.kg_end, cr.cut_warning, cr.cut_shared,
                   cr.created_by, cr.created_at, cr.updated_at, cr.cutting_category, cr.selected_roll_ids,
                   cr.multi_cut_group_id, cr.unit_price, cr.salary, cr.wash_items, cr.wash_market_image,
                   COALESCE(NULLIF(fc.location, ''), NULLIF(m.location, '')) AS warehouse_location,
                   (
                       SELECT sub.cut_quantity 
                       FROM cutting_records sub 
                       WHERE sub.dht_order_id = cr.dht_order_id 
                         AND sub.order_item_id = cr.order_item_id 
                         AND sub.is_cut_done = true 
                         AND sub.id != cr.id
                         AND (
                             (COALESCE(cr.cut_warning, '') LIKE '%Cắt bù%') = (COALESCE(sub.cut_warning, '') LIKE '%Cắt bù%')
                         )
                       LIMIT 1
                   ) AS ticket_completed_quantity,
                   (
                       SELECT EXISTS (
                           SELECT 1 FROM cutting_records sub 
                           WHERE sub.order_item_id = cr.order_item_id 
                             AND sub.cut_warning LIKE '%Cắt bù%'
                       )
                   )::boolean AS has_compensation_ticket,
                   (cr.ratio_image IS NOT NULL AND cr.ratio_image != '') AS has_ratio_image,
                   u_cutter.full_name AS cutter_name,
                   u_done.full_name AS cut_done_by_name,
                   u_salary.full_name AS salary_approved_by_name,
                   u_wash.full_name AS wash_reported_by_name,
                   o.order_code, o.shipping_priority,
                   o.customer_name,
                   u_cskh.full_name AS cskh_name,
                   u_created.full_name AS created_by_name,
                   t.target_ratio AS target_cut_ratio,
                   w.unit AS fabric_unit,
                   ceo.report_date AS error_report_date,
                   ceo.created_at AS error_reported_at,
                   ceo.cskh_name AS error_reporter_name,
                   ceo.error_quantity AS error_quantity_reported,
                   ceo.error_content AS error_content_reported,
                   ceo.common_error_type AS error_common_type,
                   ceo.error_images AS error_images_json,
                   sch.cut_expected_at
            FROM cutting_records cr
            LEFT JOIN users u_cutter ON cr.cutter_id = u_cutter.id
            LEFT JOIN users u_done ON cr.cut_done_by = u_done.id
            LEFT JOIN users u_salary ON cr.salary_approved_by = u_salary.id
            LEFT JOIN users u_wash ON cr.wash_reported_by = u_wash.id
            LEFT JOIN dht_orders o ON cr.dht_order_id = o.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN kv_materials m ON m.name = cr.material_name AND m.is_active = true
            LEFT JOIN kv_fabric_colors fc ON fc.material_id = m.id AND fc.color_name = cr.fabric_color AND fc.is_active = true
            LEFT JOIN kv_warehouses w ON m.warehouse_id = w.id
            LEFT JOIN kv_material_cutting_targets t ON t.material_id = m.id AND t.cutting_category = cr.cutting_category
            LEFT JOIN qlx_item_schedules sch ON sch.dht_order_id = cr.dht_order_id AND (sch.order_item_id = cr.order_item_id OR (sch.order_item_id IS NULL AND cr.order_item_id IS NULL))
            LEFT JOIN customer_error_orders ceo ON cr.error_order_id = ceo.id
            WHERE cr.id = $1
        `, [Number(request.params.id)]);

        if (!record) return reply.code(404).send({ error: 'Không tìm thấy đơn cắt' });
        return { record };
    });

    // ========== GET RECORD IMAGE: Lấy hình ảnh chứng minh sai ==========
    fastify.get('/api/cutting/records/:id/image', { preHandler: [authenticate] }, async (request, reply) => {
        const row = await db.get(`
            SELECT ratio_image FROM cutting_records WHERE id = $1
        `, [Number(request.params.id)]);
        if (!row) return reply.code(404).send({ error: 'Không tìm thấy đơn cắt' });
        return { ratio_image: row.ratio_image };
    });

    // ========== CREATE: Tạo record cắt mới ==========
    fastify.post('/api/cutting/records', { preHandler: [authenticate] }, async (request, reply) => {
        const b = request.body || {};
        const now = vnNow();

        const result = await db.get(`
            INSERT INTO cutting_records (
                dht_order_id, order_item_id, phoi_index, cut_date, cutter_id,
                product_name, material_name, fabric_color,
                order_quantity, cut_quantity, kg_cut, cut_ratio,
                ratio_reason, kg_start, kg_end, cut_warning, cut_shared,
                created_by, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
            RETURNING id
        `, [
            b.dht_order_id || null,
            b.order_item_id || null,
            b.phoi_index !== undefined ? Number(b.phoi_index) : 0,
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
        const b = request.body || {};
        const { action } = b;
        const now = vnNow();

        const rec = await db.get('SELECT * FROM cutting_records WHERE id = $1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });

        let detail = '';

        if (action === 'start_cutting') {
            if (rec.is_cut_done) return reply.code(400).send({ error: 'Đơn đã báo cắt xong, không thể bắt đầu cắt' });
            if (rec.is_cutting) return reply.code(400).send({ error: 'Đơn đang trong quá trình cắt' });
            // === NEW: Require selected_roll_ids for locking rolls ===
            const selectedRollIds = request.body.selected_roll_ids;
            if (!selectedRollIds || !Array.isArray(selectedRollIds) || selectedRollIds.length === 0) {
                return reply.code(400).send({ error: 'Vui lòng chọn ít nhất 1 cây vải' });
            }
            // Atomic lock: only lock rolls that are not yet locked
            const locked = await db.all(
                `UPDATE kv_rolls SET locked_by_cutting_id = $1
                 WHERE id = ANY($2) AND locked_by_cutting_id IS NULL
                 RETURNING id, weight, roll_code`,
                [id, selectedRollIds]
            );
            if (locked.length !== selectedRollIds.length) {
                // Rollback any that were locked in this attempt
                if (locked.length > 0) {
                    await db.run(`UPDATE kv_rolls SET locked_by_cutting_id = NULL WHERE locked_by_cutting_id = $1`, [id]);
                }
                return reply.code(409).send({ error: 'Có cây vải đã bị thợ khác chọn, vui lòng tải lại và chọn lại' });
            }
            // Fetch full label (material + color) for snapshot
            const rollDetails = await db.all(`
                SELECT r.id, r.weight, r.roll_code, m.name AS material_name, fc.color_name
                FROM kv_rolls r
                JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                JOIN kv_materials m ON m.id = fc.material_id
                WHERE r.id = ANY($1)
            `, [locked.map(r => r.id)]);
            // Calculate kg_start from locked rolls
            const kgStart = locked.reduce((sum, r) => sum + Number(r.weight), 0);
            const rollSnapshot = rollDetails.map(r => ({
                roll_id: r.id, weight: Number(r.weight), roll_code: r.roll_code,
                label: (r.material_name || '') + ' - ' + (r.color_name || '') + ' - ' + Number(r.weight) + 'kg'
            }));
            await db.run(
                `UPDATE cutting_records SET is_cutting = true, cutting_at = $1, cutting_by = $2, kg_start = $3, selected_roll_ids = $4, updated_at = $1 WHERE id = $5`,
                [now, request.user.id, kgStart, JSON.stringify(rollSnapshot), id]
            );

            // Release unselected reservations for this coordination part
            if (rec.dht_order_id && rec.order_item_id && rec.material_name && rec.fabric_color) {
                await db.run(
                    `UPDATE qlx_fabric_reservations
                     SET status = 'released', updated_at = $1
                     WHERE dht_order_id = $2
                       AND item_id = $3
                       AND material_name = $4
                       AND color_name = $5
                       AND roll_id IS NOT NULL
                       AND roll_id != ALL($6)
                       AND status IN ('reserved', 'arrived')`,
                    [now, rec.dht_order_id, rec.order_item_id, rec.material_name, rec.fabric_color, selectedRollIds]
                );
            }

            detail = '✂️ Bắt đầu cắt — ' + locked.length + ' cây, ' + kgStart.toFixed(2) + 'kg';
        } else if (action === 'undo_cutting') {
            if (rec.is_cut_done) return reply.code(400).send({ error: 'Đơn đã báo cắt xong, không thể hoàn tác bắt đầu cắt' });
            if (!rec.is_cutting) return reply.code(400).send({ error: 'Đơn chưa bắt đầu cắt, không thể hoàn tác' });
            // Multi-cut group handling
            if (rec.multi_cut_group_id) {
                const groupMembers = await db.all(
                    `SELECT id FROM cutting_records WHERE multi_cut_group_id = $1 AND id != $2 AND is_cutting = true`,
                    [rec.multi_cut_group_id, id]
                );
                if (groupMembers.length > 0) {
                    // Transfer lock if this record owns the lock
                    const lockOwned = await db.get(`SELECT id FROM kv_rolls WHERE locked_by_cutting_id = $1 LIMIT 1`, [id]);
                    if (lockOwned) {
                        await db.run(`UPDATE kv_rolls SET locked_by_cutting_id = $1 WHERE locked_by_cutting_id = $2`, [groupMembers[0].id, id]);
                    }
                    // Update cut_shared for remaining members
                    const remaining = await db.all(`SELECT product_name FROM cutting_records WHERE multi_cut_group_id = $1 AND id != $2 AND is_cutting = true`, [rec.multi_cut_group_id, id]);
                    const newShared = 'Cắt chung ' + remaining.length + ' đơn: ' + remaining.map(r => r.product_name).join(', ');
                    await db.run(`UPDATE cutting_records SET cut_shared = $1, updated_at = $2 WHERE multi_cut_group_id = $3 AND id != $4 AND is_cutting = true`, [newShared, now, rec.multi_cut_group_id, id]);
                } else {
                    // Last member — unlock rolls
                    await db.run(`UPDATE kv_rolls SET locked_by_cutting_id = NULL WHERE locked_by_cutting_id = $1`, [id]);
                }
                await db.run(
                    `UPDATE cutting_records SET is_cutting = false, cutting_at = NULL, cutting_by = NULL, kg_start = 0, selected_roll_ids = '[]', multi_cut_group_id = NULL, cut_shared = NULL, updated_at = $1 WHERE id = $2`,
                    [now, id]
                );
                detail = '↩️ Hoàn tác cắt chung — ' + (groupMembers.length > 0 ? 'rời nhóm, ' + groupMembers.length + ' đơn còn lại' : 'đã unlock cây vải');
            } else {
                // Normal single-cut undo
                await db.run(`UPDATE kv_rolls SET locked_by_cutting_id = NULL WHERE locked_by_cutting_id = $1`, [id]);
                await db.run(
                    `UPDATE cutting_records SET is_cutting = false, cutting_at = NULL, cutting_by = NULL, kg_start = 0, selected_roll_ids = '[]', updated_at = $1 WHERE id = $2`,
                    [now, id]
                );
                detail = '↩️ Hoàn tác bắt đầu cắt — đã unlock cây vải';
            }
        } else if (action === 'cut_done') {
            if (!rec.is_cutting) return reply.code(400).send({ error: 'Chưa bấm Cắt — không thể bấm Cắt Xong' });
            if (rec.is_cut_done) return reply.code(400).send({ error: 'Đơn đã báo cắt xong' });
            const { cut_quantity, roll_remains, ratio_reason, ratio_image, need_compensate } = b;
            let cutQty = Number(cut_quantity);

            if (rec.dht_order_id && rec.order_item_id) {
                const sibling = await db.get(
                    `SELECT cut_quantity FROM cutting_records 
                     WHERE dht_order_id = $1 AND order_item_id = $2 
                       AND is_cut_done = true AND id != $3
                       AND ((COALESCE($4, '') LIKE '%Cắt bù%') = (COALESCE(cut_warning, '') LIKE '%Cắt bù%'))
                     LIMIT 1`,
                    [rec.dht_order_id, rec.order_item_id, id, rec.cut_warning]
                );
                if (sibling && sibling.cut_quantity !== null) {
                    cutQty = Number(sibling.cut_quantity);
                }
            }

            if (!cutQty) return reply.code(400).send({ error: 'Thiếu SL Cắt' });
            if (rec.order_quantity && cutQty > Number(rec.order_quantity))
                return reply.code(400).send({ error: 'SL Cắt (' + cutQty + ') không thể lớn hơn SL Đơn (' + rec.order_quantity + ')' });

            let snapshot = [];
            try { snapshot = typeof rec.selected_roll_ids === 'string' ? JSON.parse(rec.selected_roll_ids) : (rec.selected_roll_ids || []); } catch(e) {}

            const targetRatio = await getTargetCutRatio(rec.material_name, rec.cutting_category, snapshot);

            // Check if this is a multi-cut group
            if (rec.multi_cut_group_id) {
                const otherNotDone = await db.all(
                    `SELECT id FROM cutting_records WHERE multi_cut_group_id = $1 AND id != $2 AND is_cut_done = false`,
                    [rec.multi_cut_group_id, id]
                );
                const isLastInGroup = otherNotDone.length === 0;

                if (!isLastInGroup) {
                    // NOT last: only save cut_quantity, no roll weight changes
                    const salInfo = await calculateCutterSalary(rec.cutter_id, rec.cutting_category, cutQty);
                    await db.run(`UPDATE cutting_records SET is_cut_done = true, cut_done_at = $1, cut_done_by = $2,
                        cut_quantity = $3, ratio_reason = $4, ratio_image = $5, unit_price = $6, salary = $7, updated_at = $1 WHERE id = $8`,
                        [now, request.user.id, cutQty, ratio_reason || null, ratio_image || null, salInfo.unit_price, salInfo.salary, id]);
                    if (need_compensate) {
                        await createCompensationTicket(rec, cutQty, request.user.id, now);
                    }
                    detail = '✅ Cắt xong (nhóm, chờ đơn cuối) — SL: ' + cutQty;
                } else {
                    // LAST in group: handle roll weights + distribute kg proportionally
                    const remainsMap = {};
                    if (roll_remains && Array.isArray(roll_remains)) {
                        for (const rm of roll_remains) {
                            const rem = Number(rm.remaining_weight);
                            if (isNaN(rem) || rem < 0) return reply.code(400).send({ error: 'Kg còn lại không hợp lệ' });
                            const orig = snapshot.find(s => s.roll_id === rm.roll_id);
                            if (orig && rem > Number(orig.weight)) return reply.code(400).send({ error: 'Kg còn lại > kg ban đầu (' + orig.label + ')' });
                            remainsMap[rm.roll_id] = rem;
                        }
                    }
                    const kgStart = Number(rec.kg_start) || 0;
                    let kgEnd = 0;
                    for (const s of snapshot) { kgEnd += remainsMap[s.roll_id] !== undefined ? remainsMap[s.roll_id] : 0; }
                    const totalKgCut = kgStart - kgEnd;

                    // Get all done records in group to distribute kg
                    const allGroupDone = await db.all(
                        `SELECT id, cut_quantity FROM cutting_records WHERE multi_cut_group_id = $1 AND id != $2 AND is_cut_done = true`,
                        [rec.multi_cut_group_id, id]
                    );
                    const totalQtyOthers = allGroupDone.reduce((s, r) => s + (Number(r.cut_quantity) || 0), 0);
                    const totalQtyAll = totalQtyOthers + cutQty;

                    // Update this (last) record
                    const myKgCut = totalQtyAll > 0 ? (cutQty / totalQtyAll) * totalKgCut : totalKgCut;
                    const myRatio = myKgCut > 0 ? Math.round((cutQty / myKgCut) * 100) / 100 : 0;

                    // VALIDATION TỈ LỆ
                    if (targetRatio > 0 && myRatio < targetRatio) {
                        if (!ratio_reason || ratio_reason.trim().length < 2) {
                            return reply.code(400).send({ error: 'Tỉ lệ cắt của nhóm (' + myRatio + ' sp/kg) thấp hơn định lượng (' + targetRatio + '). Vui lòng nhập lý do!' });
                        }
                        if (!ratio_image || ratio_image.trim().length === 0) {
                            return reply.code(400).send({ error: 'Tỉ lệ cắt của nhóm (' + myRatio + ' sp/kg) thấp hơn định lượng (' + targetRatio + '). Vui lòng chụp/chọn ảnh minh chứng!' });
                        }
                    }

                    const myUpdatedSnapshot = snapshot.map(s => {
                        const rem = remainsMap[s.roll_id] !== undefined ? remainsMap[s.roll_id] : 0;
                        const consumed = Math.max(0, (Number(s.weight) || 0) - rem);
                        const rollKgCut = totalQtyAll > 0 ? (cutQty / totalQtyAll) * consumed : consumed;
                        return {
                            ...s,
                            weight_end: rem,
                            kg_cut: Math.round(rollKgCut * 100) / 100
                        };
                    });

                    const salInfo = await calculateCutterSalary(rec.cutter_id, rec.cutting_category, cutQty);
                    await db.run(`UPDATE cutting_records SET is_cut_done = true, cut_done_at = $1, cut_done_by = $2,
                        kg_end = $3, kg_cut = $4, cut_quantity = $5, cut_ratio = $6,
                        ratio_reason = $7, ratio_image = $8, unit_price = $9, salary = $10,
                        selected_roll_ids = $11, updated_at = $1 WHERE id = $12`,
                        [now, request.user.id, kgEnd, myKgCut, cutQty, myRatio, ratio_reason || null, ratio_image || null, salInfo.unit_price, salInfo.salary, JSON.stringify(myUpdatedSnapshot), id]);
                    if (need_compensate) {
                        await createCompensationTicket(rec, cutQty, request.user.id, now);
                    }

                    // Distribute kg to other group members
                    for (const gr of allGroupDone) {
                        const grQty = Number(gr.cut_quantity) || 0;
                        const grKgCut = totalQtyAll > 0 ? (grQty / totalQtyAll) * totalKgCut : 0;
                        const grRatio = grKgCut > 0 ? Math.round((grQty / grKgCut) * 100) / 100 : 0;
                        
                        // Fetch individual member's snapshot and update
                        const grRec = await db.get('SELECT selected_roll_ids FROM cutting_records WHERE id = $1', [gr.id]);
                        let grSnapshot = [];
                        if (grRec && grRec.selected_roll_ids) {
                            try {
                                grSnapshot = typeof grRec.selected_roll_ids === 'string' ? JSON.parse(grRec.selected_roll_ids) : (grRec.selected_roll_ids || []);
                            } catch(e) {}
                        }
                        if (!grSnapshot || grSnapshot.length === 0) {
                            grSnapshot = snapshot;
                        }
                        
                        const grUpdatedSnapshot = grSnapshot.map(s => {
                            const rem = remainsMap[s.roll_id] !== undefined ? remainsMap[s.roll_id] : 0;
                            const consumed = Math.max(0, (Number(s.weight) || 0) - rem);
                            const rollKgCut = totalQtyAll > 0 ? (grQty / totalQtyAll) * consumed : consumed;
                            return {
                                ...s,
                                weight_end: rem,
                                kg_cut: Math.round(rollKgCut * 100) / 100
                            };
                        });

                        await db.run(`UPDATE cutting_records SET kg_end = $1, kg_cut = $2, cut_ratio = $3, selected_roll_ids = $4, updated_at = $5 WHERE id = $6`,
                            [kgEnd, grKgCut, grRatio, JSON.stringify(grUpdatedSnapshot), now, gr.id]);
                    }

                    const groupOrderIds = [rec.dht_order_id, ...allGroupDone.map(r => r.dht_order_id)].filter(Boolean);
                    // Update rolls + unlock
                    for (const s of snapshot) {
                        const rem = remainsMap[s.roll_id] !== undefined ? remainsMap[s.roll_id] : 0;
                        const finalWeight = rem <= 0 ? 0 : rem;
                        await db.run(`UPDATE kv_rolls SET weight = $1, locked_by_cutting_id = NULL WHERE id = $2`, [finalWeight, s.roll_id]);
                        if (groupOrderIds.length > 0) {
                            await db.run(`
                                UPDATE qlx_fabric_reservations 
                                SET status = 'released', updated_at = $1 
                                WHERE roll_id = $2 AND dht_order_id = ANY($3) AND status IN ('reserved', 'arrived')
                            `, [now, s.roll_id, groupOrderIds]);
                        }
                        if (finalWeight === 0) {
                            if (groupOrderIds.length > 0) {
                                await db.run(`
                                    UPDATE qlx_fabric_reservations 
                                    SET status = 'released', updated_at = $1 
                                    WHERE roll_id = $2 AND dht_order_id != ALL($3) AND status IN ('reserved', 'arrived')
                                `, [now, s.roll_id, groupOrderIds]);
                            } else {
                                await db.run(`
                                    UPDATE qlx_fabric_reservations 
                                    SET status = 'released', updated_at = $1 
                                    WHERE roll_id = $2 AND status IN ('reserved', 'arrived')
                                `, [now, s.roll_id]);
                            }
                        }
                    }
                    detail = '✅ Cắt xong (đơn cuối nhóm) — Kg cắt tổng: ' + totalKgCut.toFixed(2) + ', SL: ' + cutQty;
                }
            } else {
                // Normal single-cut done (existing logic)
                const remainsMap = {};
                if (roll_remains && Array.isArray(roll_remains)) {
                    for (const rm of roll_remains) {
                        const rem = Number(rm.remaining_weight);
                        if (isNaN(rem) || rem < 0) return reply.code(400).send({ error: 'Kg còn lại không hợp lệ' });
                        const orig = snapshot.find(s => s.roll_id === rm.roll_id);
                        if (orig && rem > Number(orig.weight)) return reply.code(400).send({ error: 'Kg còn lại > kg ban đầu (' + orig.label + ')' });
                        remainsMap[rm.roll_id] = rem;
                    }
                }
                const kgStart = Number(rec.kg_start) || 0;
                let kgEnd = 0;
                for (const s of snapshot) { kgEnd += remainsMap[s.roll_id] !== undefined ? remainsMap[s.roll_id] : 0; }
                const kgCut = kgStart - kgEnd;
                const cutRatio = kgCut > 0 ? Math.round((cutQty / kgCut) * 100) / 100 : 0;

                // VALIDATION TỈ LỆ
                if (targetRatio > 0 && cutRatio < targetRatio) {
                    if (!ratio_reason || ratio_reason.trim().length < 2) {
                        return reply.code(400).send({ error: 'Tỉ lệ cắt (' + cutRatio + ' sp/kg) thấp hơn định lượng (' + targetRatio + '). Vui lòng nhập lý do!' });
                    }
                    if (!ratio_image || ratio_image.trim().length === 0) {
                        return reply.code(400).send({ error: 'Tỉ lệ cắt (' + cutRatio + ' sp/kg) thấp hơn định lượng (' + targetRatio + '). Vui lòng chụp/chọn ảnh minh chứng!' });
                    }
                }

                const updatedSnapshot = snapshot.map(s => {
                    const rem = remainsMap[s.roll_id] !== undefined ? remainsMap[s.roll_id] : 0;
                    const rollKgCut = Math.max(0, (Number(s.weight) || 0) - rem);
                    return {
                        ...s,
                        weight_end: rem,
                        kg_cut: Math.round(rollKgCut * 100) / 100
                    };
                });

                const salInfo = await calculateCutterSalary(rec.cutter_id, rec.cutting_category, cutQty);
                await db.run(`UPDATE cutting_records SET is_cut_done = true, cut_done_at = $1, cut_done_by = $2,
                    kg_end = $3, kg_cut = $4, cut_quantity = $5, cut_ratio = $6,
                    ratio_reason = $7, ratio_image = $8, unit_price = $9, salary = $10,
                    selected_roll_ids = $11, updated_at = $1 WHERE id = $12`,
                    [now, request.user.id, kgEnd, kgCut, cutQty, cutRatio, ratio_reason || null, ratio_image || null, salInfo.unit_price, salInfo.salary, JSON.stringify(updatedSnapshot), id]);
                if (need_compensate) {
                    await createCompensationTicket(rec, cutQty, request.user.id, now);
                }
                for (const s of snapshot) {
                    const rem = remainsMap[s.roll_id] !== undefined ? remainsMap[s.roll_id] : 0;
                    const finalWeight = rem <= 0 ? 0 : rem;
                    await db.run(`UPDATE kv_rolls SET weight = $1, locked_by_cutting_id = NULL WHERE id = $2`, [finalWeight, s.roll_id]);
                    // Release the reservation for the current order on this roll since it's cut
                    await db.run(`
                        UPDATE qlx_fabric_reservations 
                        SET status = 'released', updated_at = $1 
                        WHERE roll_id = $2 AND dht_order_id = $3 AND status IN ('reserved', 'arrived')
                    `, [now, s.roll_id, rec.dht_order_id]);
                    if (finalWeight === 0) {
                        await db.run(`
                            UPDATE qlx_fabric_reservations 
                            SET status = 'released', updated_at = $1 
                            WHERE roll_id = $2 AND status IN ('reserved', 'arrived')
                        `, [now, s.roll_id]);
                    } else {
                        // Adjust other active reservations on this roll if their sum exceeds finalWeight
                        const otherRes = await db.all(`
                            SELECT id, kg_reserved, dht_order_id
                            FROM qlx_fabric_reservations
                            WHERE roll_id = $1 AND status IN ('reserved', 'arrived')
                            ORDER BY created_at ASC
                        `, [s.roll_id]);
                        
                        let remainingLimit = finalWeight;
                        for (const r of otherRes) {
                            if (r.kg_reserved > remainingLimit) {
                                if (remainingLimit <= 0) {
                                    await db.run(`
                                        UPDATE qlx_fabric_reservations
                                        SET status = 'released', updated_at = $1
                                        WHERE id = $2
                                    `, [now, r.id]);
                                    
                                    await db.run(`
                                        INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                                        VALUES ($1, 'fabric_release', $2, $3, $4)
                                    `, [r.dht_order_id, `Hủy giữ vải do cây vải đã bị cắt hết/hụt cân (Cân dư thực tế: ${finalWeight}kg)`, request.user.id, now]);
                                } else {
                                    await db.run(`
                                        UPDATE qlx_fabric_reservations
                                        SET kg_reserved = $1, updated_at = $2
                                        WHERE id = $3
                                    `, [remainingLimit, now, r.id]);
                                    
                                    await db.run(`
                                        INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                                        VALUES ($1, 'fabric_reserve_update', $2, $3, $4)
                                    `, [r.dht_order_id, `Giảm số kg giữ xuống ${remainingLimit}kg do cây vải bị cắt hụt cân (Cân dư thực tế: ${finalWeight}kg)`, request.user.id, now]);
                                    
                                    remainingLimit = 0;
                                }
                            } else {
                                remainingLimit -= r.kg_reserved;
                            }
                        }
                    }
                }
                detail = '✅ Cắt xong — Kg cắt: ' + kgCut.toFixed(2) + ', SL: ' + cutQty + ', Tỉ lệ: ' + cutRatio;
            }
        } else if (action === 'undo_cut_done') {
            if (request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền hoàn tác cắt xong!' });
            if (!rec.is_cut_done) return reply.code(400).send({ error: 'Đơn chưa cắt xong — không cần hoàn tác' });
            let snapshot = [];
            try { snapshot = typeof rec.selected_roll_ids === 'string' ? JSON.parse(rec.selected_roll_ids) : (rec.selected_roll_ids || []); } catch(e) {}

            if (rec.multi_cut_group_id) {
                // Check if this was the last record that completed (rolls were unlocked)
                const othersStillDone = await db.all(
                    `SELECT id FROM cutting_records WHERE multi_cut_group_id = $1 AND id != $2 AND is_cut_done = true`,
                    [rec.multi_cut_group_id, id]
                );
                const othersNotDone = await db.all(
                    `SELECT id FROM cutting_records WHERE multi_cut_group_id = $1 AND id != $2 AND is_cutting = true AND is_cut_done = false`,
                    [rec.multi_cut_group_id, id]
                );
                const wasLastDone = othersNotDone.length === 0 && othersStillDone.length > 0;
                // If rolls were already unlocked (this was last done), re-lock and restore
                if (wasLastDone || (othersStillDone.length === 0 && othersNotDone.length === 0)) {
                    if (snapshot.length > 0) {
                        const rollIds = snapshot.map(s => s.roll_id);
                        const conflicts = await db.all(`SELECT id FROM kv_rolls WHERE id = ANY($1) AND locked_by_cutting_id IS NOT NULL`, [rollIds]);
                        if (conflicts.length > 0) return reply.code(409).send({ error: 'Không thể hoàn tác — cây vải đã bị đơn khác chọn' });
                        for (const s of snapshot) {
                            await db.run(`UPDATE kv_rolls SET weight = $1, locked_by_cutting_id = $2 WHERE id = $3`, [s.weight, id, s.roll_id]);
                        }
                    }
                    // Reset kg for all group members that were done
                    for (const gr of othersStillDone) {
                        await db.run(`UPDATE cutting_records SET kg_end = 0, kg_cut = 0, cut_ratio = 0, updated_at = $1 WHERE id = $2`, [now, gr.id]);
                    }
                }
                await db.run(`UPDATE cutting_records SET is_cut_done = false, cut_done_at = NULL, cut_done_by = NULL,
                    kg_end = 0, kg_cut = 0, cut_quantity = 0, cut_ratio = 0, unit_price = 0, salary = 0, updated_at = $1 WHERE id = $2`, [now, id]);
                detail = '↩️ Hoàn tác cắt xong (nhóm) — đã khôi phục';
            } else {
                // Normal single undo
                if (snapshot.length > 0) {
                    const rollIds = snapshot.map(s => s.roll_id);
                    const conflicts = await db.all(`SELECT id, locked_by_cutting_id FROM kv_rolls WHERE id = ANY($1) AND locked_by_cutting_id IS NOT NULL`, [rollIds]);
                    if (conflicts.length > 0) return reply.code(409).send({ error: 'Không thể hoàn tác — ' + conflicts.length + ' cây vải đã bị đơn khác chọn' });
                    for (const s of snapshot) {
                        await db.run(`UPDATE kv_rolls SET weight = $1, locked_by_cutting_id = $2 WHERE id = $3`, [s.weight, id, s.roll_id]);
                    }
                }
                await db.run(`UPDATE cutting_records SET is_cut_done = false, cut_done_at = NULL, cut_done_by = NULL,
                    kg_end = 0, kg_cut = 0, cut_quantity = 0, cut_ratio = 0, unit_price = 0, salary = 0, updated_at = $1 WHERE id = $2`, [now, id]);
                detail = '↩️ Hoàn tác cắt xong — đã khôi phục ' + snapshot.length + ' cây vải';
            }
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
            const { wash_items, wash_market_image } = request.body || {};
            if (!wash_items || !Array.isArray(wash_items) || wash_items.length === 0) {
                return reply.code(400).send({ error: 'Bắt buộc chọn ít nhất 1 bộ phận cần giặt!' });
            }
            await db.run(`UPDATE cutting_records SET wash_reported = true, wash_reported_at = $1, wash_reported_by = $2, wash_items = $3, wash_market_image = $4, updated_at = $1 WHERE id = $5`,
                [now, request.user.id, JSON.stringify(wash_items), wash_market_image || null, id]);
            detail = '🫧 Báo giặt vải: ' + wash_items.join(', ');
        } else if (action === 'undo_wash') {
            await db.run(`UPDATE cutting_records SET wash_reported = false, wash_reported_at = NULL, wash_reported_by = NULL, wash_items = '[]', wash_market_image = NULL, updated_at = $1 WHERE id = $2`,
                [now, id]);
            detail = '↩️ Hoàn tác báo giặt';
        } else if (action === 'report_error') {
            await db.run(`UPDATE cutting_records SET error_reported = true, error_order_id = $1, updated_at = $2 WHERE id = $3`,
                [request.body.error_order_id || null, now, id]);
            detail = '⚠️ Báo đơn lỗi nội bộ';
        } else if (action === 'cancel_compensation') {
            if (rec.is_cutting || rec.is_cut_done) {
                return reply.code(400).send({ error: 'Đơn đang cắt hoặc đã cắt xong, không thể hủy!' });
            }
            if (!rec.cut_warning || !rec.cut_warning.includes('Cắt bù')) {
                return reply.code(400).send({ error: 'Đây không phải là đơn cắt bù!' });
            }
            const isManager = ['giam_doc', 'quan_ly', 'truong_phong'].includes(request.user.role);
            if (!isManager && rec.cutter_id !== request.user.id) {
                return reply.code(403).send({ error: 'Chỉ thợ cắt của đơn này hoặc Quản lý mới có quyền hủy cắt bù!' });
            }
            await db.run('DELETE FROM cutting_records WHERE id = $1', [id]);
            return { success: true };
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
        const cutRatio = cutQty > 0 && kgCut > 0 ? Number((cutQty / kgCut).toFixed(2)) : (Number(b.cut_ratio) || 0);

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
                const cutRatio = rec.cut_quantity > 0 && kgCut > 0 ? Number((rec.cut_quantity / kgCut).toFixed(2)) : 0;
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

        const cutId = Number(request.params.id);
        const cut = await db.get('SELECT is_cut_done, selected_roll_ids, kg_cut FROM cutting_records WHERE id = $1', [cutId]);
        if (cut) {
            const { restoreRollWeightsForCuts } = require('../utils/kv_restore_roll');
            await restoreRollWeightsForCuts(db, [cut]);
        }

        await db.run('DELETE FROM cutting_records WHERE id = $1', [cutId]);
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

    // ========== ADD ROLL: Thêm cây vải vào đơn đang cắt ==========
    fastify.post('/api/cutting/records/:id/add-roll', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const { roll_id } = request.body || {};
        if (!roll_id) return reply.code(400).send({ error: 'Thiếu ID cây vải' });
        const now = vnNow();

        const rec = await db.get('SELECT * FROM cutting_records WHERE id = $1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (!rec.is_cutting) return reply.code(400).send({ error: 'Đơn chưa bắt đầu cắt, không thể thêm cây vải' });
        if (rec.is_cut_done) return reply.code(400).send({ error: 'Đơn đã báo cắt xong, không thể thêm cây vải' });

        const roll = await db.get(`
            SELECT r.id, r.roll_code, r.weight, r.is_returned, r.locked_by_cutting_id,
                   m.name AS material_name, fc.color_name
            FROM kv_rolls r
            JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
            JOIN kv_materials m ON m.id = fc.material_id
            WHERE r.id = $1
        `, [roll_id]);
        if (!roll) return reply.code(404).send({ error: 'Không tìm thấy cây vải trong kho' });
        if (roll.is_returned || Number(roll.weight) <= 0) return reply.code(400).send({ error: 'Cây vải không khả dụng (đã trả hoặc hết vải)' });
        if (roll.locked_by_cutting_id) return reply.code(409).send({ error: 'Cây vải đã bị đơn khác chọn' });

        // Option A: Only allow rolls with matching material and color
        if (
            (roll.material_name || '').trim().toLowerCase() !== (rec.material_name || '').trim().toLowerCase() ||
            (roll.color_name || '').trim().toLowerCase() !== (rec.fabric_color || '').trim().toLowerCase()
        ) {
            return reply.code(400).send({ error: 'Cây vải không đúng chất liệu hoặc màu sắc của đơn gốc' });
        }

        let targetIds = [id];
        let lockId = id;
        if (rec.multi_cut_group_id) {
            const groupMembers = await db.all('SELECT id FROM cutting_records WHERE multi_cut_group_id = $1', [rec.multi_cut_group_id]);
            if (groupMembers.length > 0) {
                targetIds = groupMembers.map(m => m.id);
                lockId = groupMembers[0].id;
            }
        }

        const lockResult = await db.run(
            `UPDATE kv_rolls SET locked_by_cutting_id = $1 WHERE id = $2 AND locked_by_cutting_id IS NULL`,
            [lockId, roll_id]
        );
        if (lockResult.changes === 0) {
            return reply.code(409).send({ error: 'Cây vải đã bị đơn khác chọn' });
        }

        let snapshot = [];
        try {
            snapshot = typeof rec.selected_roll_ids === 'string' ? JSON.parse(rec.selected_roll_ids) : (rec.selected_roll_ids || []);
        } catch (e) {}

        const newRollSnapshot = {
            roll_id: roll.id,
            weight: Number(roll.weight),
            roll_code: roll.roll_code,
            label: (roll.material_name || '') + ' - ' + (roll.color_name || '') + ' - ' + Number(roll.weight) + 'kg'
        };
        snapshot.push(newRollSnapshot);
        const newKgStart = Number(rec.kg_start) + Number(roll.weight);

        await db.run(
            `UPDATE cutting_records SET selected_roll_ids = $1, kg_start = $2, updated_at = $3 WHERE id = ANY($4)`,
            [JSON.stringify(snapshot), newKgStart, now, targetIds]
        );

        const historyDetail = `➕ Thêm cây vải khác: ${newRollSnapshot.label}`;
        for (const tId of targetIds) {
            await db.run(
                `INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at)
                 VALUES ($1, $2, $3, $4, $5)`,
                [tId, 'add_roll', historyDetail, request.user.id, now]
            );
        }

        return { success: true, selected_roll_ids: snapshot, kg_start: newKgStart };
    });

    // ========== REMOVE ROLL: Xóa cây vải khỏi đơn đang cắt ==========
    fastify.post('/api/cutting/records/:id/remove-roll', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const { roll_id } = request.body || {};
        if (!roll_id) return reply.code(400).send({ error: 'Thiếu ID cây vải' });
        const now = vnNow();

        const rec = await db.get('SELECT * FROM cutting_records WHERE id = $1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (!rec.is_cutting) return reply.code(400).send({ error: 'Đơn chưa bắt đầu cắt' });
        if (rec.is_cut_done) return reply.code(400).send({ error: 'Đơn đã báo cắt xong, không thể xóa cây vải' });

        let snapshot = [];
        try {
            snapshot = typeof rec.selected_roll_ids === 'string' ? JSON.parse(rec.selected_roll_ids) : (rec.selected_roll_ids || []);
        } catch (e) {}

        const idx = snapshot.findIndex(r => r.roll_id === roll_id);
        if (idx === -1) return reply.code(400).send({ error: 'Cây vải không thuộc đơn đang cắt này' });

        // Option A constraint check: Must keep at least 1 roll
        if (snapshot.length <= 1) {
            return reply.code(400).send({ error: 'Đơn cắt phải có ít nhất 1 cây vải, không thể xóa cây vải duy nhất.' });
        }

        let targetIds = [id];
        let lockId = id;
        if (rec.multi_cut_group_id) {
            const groupMembers = await db.all('SELECT id FROM cutting_records WHERE multi_cut_group_id = $1', [rec.multi_cut_group_id]);
            if (groupMembers.length > 0) {
                targetIds = groupMembers.map(m => m.id);
                lockId = groupMembers[0].id;
            }
        }

        const removedRoll = snapshot[idx];
        await db.run(
            `UPDATE kv_rolls SET locked_by_cutting_id = NULL WHERE id = $1 AND locked_by_cutting_id = $2`,
            [roll_id, lockId]
        );

        snapshot.splice(idx, 1);
        const newKgStart = Math.max(0, Number(rec.kg_start) - Number(removedRoll.weight));

        await db.run(
            `UPDATE cutting_records SET selected_roll_ids = $1, kg_start = $2, updated_at = $3 WHERE id = ANY($4)`,
            [JSON.stringify(snapshot), newKgStart, now, targetIds]
        );

        const historyDetail = `🗑️ Xóa cây vải: ${removedRoll.roll_code || removedRoll.roll_id} (${removedRoll.weight}kg)`;
        for (const tId of targetIds) {
            await db.run(
                `INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at)
                 VALUES ($1, $2, $3, $4, $5)`,
                [tId, 'remove_roll', historyDetail, request.user.id, now]
            );
        }

        return { success: true, selected_roll_ids: snapshot, kg_start: newKgStart };
    });

    // ========== AVAILABLE ROLLS: Cây vải khả dụng theo chất liệu + màu ==========
    fastify.get('/api/cutting/available-rolls', { preHandler: [authenticate] }, async (request, reply) => {
        const { material_name, color_name, order_id, order_item_id, phoi_index } = request.query;
        if (!material_name || !color_name) return { rolls: [], message: 'Thiếu chất liệu hoặc màu' };

        const orderId = order_id ? Number(order_id) : null;
        const orderItemId = order_item_id ? Number(order_item_id) : null;
        const phoiIdx = phoi_index !== undefined && phoi_index !== null ? Number(phoi_index) : 0;

        const rolls = await db.all(`
            SELECT r.id, r.roll_code, r.weight, r.original_weight, r.locked_by_cutting_id,
                   m.name AS material_name, fc.color_name,
                   u_lock.full_name AS locked_by_name,
                   cr_lock.product_name AS locked_product,
                   do_lock.order_code AS locked_order_code,
                   (r.weight = r.original_weight AND r.weight >= COALESCE(m.original_tree_threshold, w.original_tree_threshold, 10)) AS is_original_tree,
                   EXISTS (
                       SELECT 1 FROM qlx_fabric_reservations res
                       WHERE res.roll_id = r.id
                         AND res.dht_order_id = $3
                         AND COALESCE(res.item_id, 0) = COALESCE($4, 0)
                         AND COALESCE(res.phoi_index, 0) = COALESCE($5, 0)
                         AND res.status = 'arrived'
                         AND res.reservation_type = 'from_stock'
                   ) AS is_reserved_for_this_order,
                   (
                       SELECT res.kg_reserved FROM qlx_fabric_reservations res
                       WHERE res.roll_id = r.id
                         AND res.dht_order_id = $3
                         AND COALESCE(res.item_id, 0) = COALESCE($4, 0)
                         AND COALESCE(res.phoi_index, 0) = COALESCE($5, 0)
                         AND res.status = 'arrived'
                         AND res.reservation_type = 'from_stock'
                       LIMIT 1
                   ) AS kg_reserved
            FROM kv_rolls r
            JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
            JOIN kv_materials m ON m.id = fc.material_id
            JOIN kv_warehouses w ON w.id = m.warehouse_id
            LEFT JOIN cutting_records cr_lock ON cr_lock.id = r.locked_by_cutting_id
            LEFT JOIN users u_lock ON u_lock.id = cr_lock.cutter_id
            LEFT JOIN dht_orders do_lock ON do_lock.id = cr_lock.dht_order_id
            WHERE r.is_returned = false
              AND r.weight > 0
              AND TRIM(m.name) ILIKE $1
              AND TRIM(fc.color_name) ILIKE $2
            ORDER BY
              (CASE WHEN EXISTS (
                  SELECT 1 FROM qlx_fabric_reservations res
                  WHERE res.roll_id = r.id
                    AND res.dht_order_id = $3
                    AND COALESCE(res.item_id, 0) = COALESCE($4, 0)
                    AND COALESCE(res.phoi_index, 0) = COALESCE($5, 0)
                    AND res.status = 'arrived'
                    AND res.reservation_type = 'from_stock'
              ) THEN 0 ELSE 1 END) ASC,
              r.weight ASC
        `, ['%' + material_name.trim() + '%', '%' + color_name.trim() + '%', orderId, orderItemId, phoiIdx]);

        return {
            rolls: rolls.map(r => ({
                id: r.id,
                roll_code: r.roll_code,
                weight: Number(r.weight),
                locked: !!r.locked_by_cutting_id,
                locked_by: r.locked_by_name || null,
                locked_order: r.locked_order_code || null,
                is_original_tree: !!r.is_original_tree,
                is_reserved_for_this_order: !!r.is_reserved_for_this_order,
                kg_reserved: r.kg_reserved !== null ? Number(r.kg_reserved) : null,
                label: r.material_name + ' - ' + r.color_name + ' - ' + Number(r.weight) + 'kg'
            }))
        };
    });

    // ========== STAFF: DS nhân viên phòng cắt ==========
    fastify.get('/api/cutting/staff', { preHandler: [authenticate] }, async (request, reply) => {
        const staff = await db.all(`
            SELECT u.id, u.full_name, u.username, d.name AS dept_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.status = 'active'
              AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien')
              AND (LOWER(d.name) LIKE '%cắt%' OR LOWER(d.name) LIKE '%cat%'
                   OR LOWER(d.name) LIKE '%quản lý xưởng%' OR LOWER(d.name) LIKE '%qlx%')
            ORDER BY u.full_name
        `);
        return { staff };
    });

    // ========== UNASSIGNED: Đơn chưa cắt (pool) ==========
    fastify.get('/api/cutting/unassigned', { preHandler: [authenticate] }, async (request, reply) => {
        // Orders that have at least 1 unclaimed item (phiếu) or unassigned coordinate part
        const orders = await db.all(`
            SELECT o.id, o.order_code, o.customer_name, o.customer_phone,
                   o.total_quantity, o.order_date, o.expected_ship_date, o.shipping_priority,
                   c.name AS category_name,
                   u_cskh.full_name AS cskh_name,
                   u_created.full_name AS created_by_name,
                   COALESCE(p.fabric_arrived, false) AS fabric_arrived,
                   EXISTS(
                       SELECT 1 FROM qlx_assignments qa
                       WHERE qa.dht_order_id = o.id AND qa.assignment_type = 'in' AND (qa.assigned_user_id IS NOT NULL OR qa.assigned_contractor_id IS NOT NULL)
                   ) AS has_pc_in,
                   COALESCE(a_in.full_name, pc_in.name) AS nguoi_in
            FROM dht_orders o
            JOIN qlx_preparation p ON p.dht_order_id = o.id AND p.item_id IS NULL
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN qlx_assignments qa_in ON qa_in.dht_order_id = o.id AND qa_in.assignment_type = 'in' AND qa_in.item_id IS NULL
            LEFT JOIN users a_in ON qa_in.assigned_user_id = a_in.id
            LEFT JOIN printing_contractors pc_in ON qa_in.assigned_contractor_id = pc_in.id
            WHERE EXISTS (
                SELECT 1 FROM dht_order_items oi
                WHERE oi.dht_order_id = o.id
                AND (
                    (
                        COALESCE(jsonb_array_length(oi.material_pairs), 0) = 0
                        AND NOT EXISTS (
                            SELECT 1 FROM cutting_records cr 
                            WHERE cr.order_item_id = oi.id AND cr.cutter_id IS NOT NULL
                        )
                    )
                    OR
                    (
                        COALESCE(jsonb_array_length(oi.material_pairs), 0) > 0
                        AND (
                            SELECT COUNT(*)::int FROM cutting_records cr 
                            WHERE cr.order_item_id = oi.id AND cr.cutter_id IS NOT NULL
                        ) < jsonb_array_length(oi.material_pairs)
                    )
                )
            )
              AND EXISTS (SELECT 1 FROM qlx_preparation pp WHERE pp.dht_order_id = o.id)
              AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
              AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
              AND COALESCE(o.shipping_status, '') != 'shipped'
            ORDER BY
                CASE WHEN COALESCE(p.fabric_arrived, false) = true
                     AND EXISTS (SELECT 1 FROM qlx_assignments qa2 WHERE qa2.dht_order_id = o.id AND qa2.assignment_type = 'in' AND (qa2.assigned_user_id IS NOT NULL OR qa2.assigned_contractor_id IS NOT NULL))
                THEN 0 ELSE 1 END,
                CASE WHEN COALESCE(o.shipping_priority, 'CHUẨN') NOT IN ('GẤP','GỬI') THEN 0
                     WHEN o.shipping_priority = 'GẤP' THEN 1
                     WHEN o.shipping_priority = 'GỬI' THEN 2
                     ELSE 3 END,
                o.expected_ship_date ASC NULLS LAST, o.order_date DESC
        `);

        const orderIds = orders.map(o => o.id);
        let items = [], allItemCounts = {}, orderItemIdsMap = {}, cuttingRecords = [], reservations = [];
        if (orderIds.length > 0) {
            items = await db.all(`
                SELECT 
                    doi.dht_order_id, 
                    doi.id, 
                    doi.description, 
                    doi.material_pairs,
                    doi.quantity,
                    cc.name AS cutting_category_name,
                    EXISTS(
                        SELECT 1 FROM qlx_assignments qa
                        WHERE qa.assignment_type = 'in'
                          AND (qa.assigned_user_id IS NOT NULL OR qa.assigned_contractor_id IS NOT NULL)
                          AND (qa.item_id = doi.id OR (qa.dht_order_id = doi.dht_order_id AND qa.item_id IS NULL))
                    ) AS has_pc_in,
                    sch.cut_expected_at
                FROM dht_order_items doi
                LEFT JOIN dht_products p ON p.name = TRIM(COALESCE(doi.product_name, doi.description)) AND p.is_active = true
                LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id AND cc.category = 'cutting_category'
                LEFT JOIN qlx_item_schedules sch ON sch.order_item_id = doi.id
                WHERE doi.dht_order_id = ANY($1)
                ORDER BY doi.dht_order_id, doi.id
            `, [orderIds]);

            cuttingRecords = await db.all(`
                SELECT id, order_item_id, phoi_index, material_name, fabric_color, cutter_id, is_cut_done, cut_warning, order_quantity
                FROM cutting_records 
                WHERE dht_order_id = ANY($1)
            `, [orderIds]);

            reservations = await db.all(`
                SELECT id, dht_order_id, item_id, phoi_index, status
                FROM qlx_fabric_reservations
                WHERE dht_order_id = ANY($1) AND status != 'released'
            `, [orderIds]);

            // Total items in order (including already claimed) for display logic
            const countRows = await db.all(`
                SELECT dht_order_id, COUNT(*)::int AS cnt
                FROM dht_order_items WHERE dht_order_id = ANY($1)
                GROUP BY dht_order_id
            `, [orderIds]);
            for (const c of countRows) allItemCounts[c.dht_order_id] = c.cnt;

            // Fetch absolute order of all items to determine correct absolute item_index
            const allItems = await db.all(`
                SELECT id, dht_order_id
                FROM dht_order_items
                WHERE dht_order_id = ANY($1)
                ORDER BY dht_order_id, id
            `, [orderIds]);
            allItems.forEach(it => {
                if (!orderItemIdsMap[it.dht_order_id]) orderItemIdsMap[it.dht_order_id] = [];
                orderItemIdsMap[it.dht_order_id].push(it.id);
            });
        }
        
        const itemMap = {};
        for (const it of items) {
            if (!itemMap[it.dht_order_id]) itemMap[it.dht_order_id] = [];
            itemMap[it.dht_order_id].push(it);
        }

        // Build flat rows: 1 row per phối, grouped by item (phiếu)
        const rows = [];
        for (const o of orders) {
            const itsArr = itemMap[o.id] || [];
            const totalItemsInOrder = allItemCounts[o.id] || 1;
            if (!itsArr.length) {
                rows.push({ ...o, item_id: null, item_desc: null, phoi_index: 0, item_index: 0, phoi_in_item: 0, total_phoi: 0, total_items_in_order: totalItemsInOrder, material_name: null, color_name: null, item_qty: o.total_quantity, cutting_category_name: null, cutting_record_id: null, cut_expected_at: null });
                continue;
            }
            // Calculate total phối for this order (for naming)
            let totalPhoi = 0;
            for (const it2 of itsArr) {
                let pp = [];
                try { pp = typeof it2.material_pairs === 'string' ? JSON.parse(it2.material_pairs) : (it2.material_pairs || []); } catch(e) {}
                totalPhoi += pp.length > 0 ? pp.length : 1;
            }
            for (const it of itsArr) {
                const itemIdsInOrder = orderItemIdsMap[it.dht_order_id] || [];
                const itemIdx = itemIdsInOrder.indexOf(it.id) + 1;
                let pairs = [];
                try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}

                const itemRecords = cuttingRecords.filter(r => r.order_item_id === it.id);
                const originalCutterId = (itemRecords.find(r => r.is_cut_done === true) || {}).cutter_id || null;

                if (pairs.length > 0) {
                    const unclaimedRecs = itemRecords.filter(r => r.cutter_id === null && !r.is_cut_done);
                    const claimedPhois = itemRecords.filter(r => r.cutter_id !== null).map(r => r.phoi_index);

                    for (let pi = 0; pi < pairs.length; pi++) {
                        const phoi = pairs[pi];
                        const isClaimed = claimedPhois.includes(pi);
                        const matchingUnclaimed = unclaimedRecs.find(ur => ur.phoi_index === pi);

                        if (!isClaimed || matchingUnclaimed) {
                            const cut_warning = matchingUnclaimed ? matchingUnclaimed.cut_warning : null;
                            if (cut_warning && cut_warning.indexOf('Cắt bù') >= 0) {
                                const isManager = await isCutManager(request) || ['quan_ly', 'truong_phong'].includes(request.user.role);
                                if (!isManager && originalCutterId && originalCutterId !== request.user.id) {
                                    continue;
                                }
                            }
                            
                            // Calculate coordinate-level fabric_arrived
                            const phoiRes = reservations.filter(r => r.item_id === it.id && r.phoi_index === pi);
                            const isPhoiFabricArrived = phoiRes.length > 0 && phoiRes.every(r => r.status === 'arrived' || r.status === 'fulfilled');
                            const fabric_status = phoiRes.length === 0 ? 'chua_goi' : (isPhoiFabricArrived ? 'arrived' : 'chua_ve');

                            rows.push({
                                ...o, item_id: it.id, item_desc: it.description,
                                phoi_index: pi, phoi_pair_index: pi,
                                item_index: itemIdx, phoi_in_item: pi + 1, total_phoi: totalPhoi,
                                total_items_in_order: totalItemsInOrder,
                                material_name: phoi.material_name || null,
                                color_name: phoi.color_name || null,
                                item_qty: matchingUnclaimed ? matchingUnclaimed.order_quantity : it.quantity,
                                cutting_category_name: it.cutting_category_name || null,
                                cut_warning: cut_warning,
                                cutting_record_id: matchingUnclaimed ? matchingUnclaimed.id : null,
                                original_cutter_id: originalCutterId,
                                has_pc_in: it.has_pc_in,
                                fabric_arrived: isPhoiFabricArrived,
                                fabric_status: fabric_status,
                                cut_expected_at: it.cut_expected_at
                            });
                        }
                    }
                } else {
                    const hasClaimed = itemRecords.some(r => r.cutter_id !== null && r.phoi_index === 0);
                    const unclaimedRec = itemRecords.find(r => r.cutter_id === null && !r.is_cut_done && r.phoi_index === 0);

                    if (!hasClaimed || unclaimedRec) {
                        const cut_warning = unclaimedRec ? unclaimedRec.cut_warning : null;
                        if (cut_warning && cut_warning.indexOf('Cắt bù') >= 0) {
                            const isManager = await isCutManager(request) || ['quan_ly', 'truong_phong'].includes(request.user.role);
                            if (!isManager && originalCutterId && originalCutterId !== request.user.id) {
                                continue;
                            }
                        }
                        
                        // Calculate coordinate-level fabric_arrived for phoi_index = 0
                        const phoiRes = reservations.filter(r => r.item_id === it.id && r.phoi_index === 0);
                        const isPhoiFabricArrived = phoiRes.length > 0 && phoiRes.every(r => r.status === 'arrived' || r.status === 'fulfilled');
                        const fabric_status = phoiRes.length === 0 ? 'chua_goi' : (isPhoiFabricArrived ? 'arrived' : 'chua_ve');

                        rows.push({
                            ...o, item_id: it.id, item_desc: it.description,
                            phoi_index: 0, phoi_pair_index: 0,
                            item_index: itemIdx, phoi_in_item: 1, total_phoi: totalPhoi,
                            total_items_in_order: totalItemsInOrder,
                            material_name: null, color_name: null, 
                            item_qty: unclaimedRec ? unclaimedRec.order_quantity : it.quantity,
                            cutting_category_name: it.cutting_category_name || null,
                            cut_warning: cut_warning,
                            cutting_record_id: unclaimedRec ? unclaimedRec.id : null,
                            original_cutter_id: originalCutterId,
                            has_pc_in: it.has_pc_in,
                            fabric_arrived: isPhoiFabricArrived,
                            fabric_status: fabric_status,
                            cut_expected_at: it.cut_expected_at
                        });
                    }
                }
            }
        }

        return { orders: rows };
    });

    // ========== CLAIM: Thợ cắt nhận đơn (per-phối) ==========
    fastify.post('/api/cutting/claim', { preHandler: [authenticate] }, async (request, reply) => {
        const { dht_order_id, order_item_id, phoi_index } = request.body || {};
        if (!dht_order_id) return reply.code(400).send({ error: 'Thiếu mã đơn hàng' });
        if (!order_item_id) return reply.code(400).send({ error: 'Thiếu mã sản phẩm (phiếu)' });
        if (phoi_index === undefined) return reply.code(400).send({ error: 'Thiếu vị trí phối' });

        const now = vnNow();
        const userId = request.user.id;

        // Verify conditions
        const order = await db.get(`
            SELECT o.id, o.order_code, o.total_quantity, o.shipping_status
            FROM dht_orders o
            WHERE o.id = $1
        `, [dht_order_id]);
        if (!order) return reply.code(404).send({ error: 'Đơn không tồn tại' });
        if (order.shipping_status === 'shipped') return reply.code(400).send({ error: 'Đơn hàng đã gửi đi rồi — không thể nhận đơn cắt!' });

        // Check coordinator-level fabric arrival
        const reservations = await db.all(`
            SELECT status FROM qlx_fabric_reservations
            WHERE item_id = $1 AND phoi_index = $2 AND status != 'released'
        `, [order_item_id, phoi_index]);
        if (reservations.length === 0) {
            return reply.code(400).send({ error: 'Vải phối này chưa được gọi — không thể nhận cắt!' });
        }
        const allArrived = reservations.every(r => r.status === 'arrived' || r.status === 'fulfilled');
        if (!allArrived) {
            return reply.code(400).send({ error: 'Vải phối này chưa về đủ — không thể nhận cắt!' });
        }

        const hasPcIn = await db.get(`
            SELECT 1 FROM qlx_assignments
            WHERE assignment_type = 'in'
              AND (assigned_user_id IS NOT NULL OR assigned_contractor_id IS NOT NULL)
              AND (
                  (item_id = $1)
                  OR (dht_order_id = $2 AND item_id IS NULL)
              )
        `, [Number(order_item_id), dht_order_id]);
        if (!hasPcIn) return reply.code(400).send({ error: 'Chưa Phân Công In — không thể nhận đơn cắt' });

        // Check if already claimed by another user
        const existing = await db.get(`
            SELECT id FROM cutting_records 
            WHERE order_item_id = $1 AND phoi_index = $2 AND cutter_id IS NOT NULL AND cutter_id != $3 AND is_cut_done = false 
            LIMIT 1
        `, [order_item_id, phoi_index, userId]);
        if (existing) return reply.code(409).send({ error: 'Phối này đã được nhận bởi người khác' });

        const items = await db.all(`SELECT id, description, material_pairs, quantity FROM dht_order_items WHERE id = $1`, [order_item_id]);
        if (items.length === 0) return reply.code(404).send({ error: 'Phiếu không tồn tại' });
        const it = items[0];

        // Lookup cutting category from product config
        let cuttingCategory = null;
        const itemDesc = it.description || '';
        if (itemDesc) {
            const productMatch = await db.get(`
                SELECT cc.name AS cutting_category_name
                FROM dht_products p
                LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id
                WHERE p.name = $1 AND p.is_active = true
                LIMIT 1
            `, [itemDesc.trim()]);
            if (productMatch && productMatch.cutting_category_name) {
                cuttingCategory = productMatch.cutting_category_name;
            }
        }

        // Count total items in order for naming logic
        const allItems = await db.all(`SELECT id, description, material_pairs, quantity FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id`, [dht_order_id]);
        let totalPhoi = 0;
        for (const it2 of allItems) {
            let pp = [];
            try { pp = typeof it2.material_pairs === 'string' ? JSON.parse(it2.material_pairs) : (it2.material_pairs || []); } catch(e) {}
            totalPhoi += pp.length > 0 ? pp.length : 1;
        }

        const itemIdx = allItems.findIndex(a => a.id === it.id) + 1;
        let pairs = [];
        try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}

        // Check if there is an existing unassigned ticket for this koordinat
        const unassignedRec = await db.get(`
            SELECT id FROM cutting_records 
            WHERE order_item_id = $1 AND phoi_index = $2 AND cutter_id IS NULL AND is_cut_done = false
            LIMIT 1
        `, [it.id, phoi_index]);

        let createdId;
        let isCompensation = false;

        if (unassignedRec) {
            await db.run(`
                UPDATE cutting_records 
                SET cutter_id = $1, created_by = $1, created_at = $2 
                WHERE id = $3
            `, [userId, now, unassignedRec.id]);
            createdId = unassignedRec.id;
            isCompensation = true;
        } else {
            if (pairs.length > 0) {
                const phoi = pairs[phoi_index];
                if (!phoi) return reply.code(400).send({ error: 'Không tìm thấy cấu hình phối tương ứng' });
                const productName = totalPhoi > 1
                    ? order.order_code + ' — Phiếu ' + itemIdx + ' — P' + (phoi_index + 1) + (it.description ? ' — ' + it.description : '')
                    : order.order_code + (it.description ? ' — ' + it.description : '');
                const result = await db.get(`
                    INSERT INTO cutting_records (
                        dht_order_id, order_item_id, phoi_index, cutter_id, cut_date,
                        product_name, material_name, fabric_color,
                        order_quantity, cutting_category, created_by, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $4, $11)
                    RETURNING id
                `, [dht_order_id, it.id, phoi_index, userId, now, productName, phoi.material_name || null, phoi.color_name || null, it.quantity || 0, cuttingCategory, now]);
                if (result) createdId = result.id;
            } else {
                const productName = totalPhoi > 1
                    ? order.order_code + ' — Phiếu ' + itemIdx + ' — P1' + (it.description ? ' — ' + it.description : '')
                    : order.order_code + (it.description ? ' — ' + it.description : '');
                const result = await db.get(`
                    INSERT INTO cutting_records (
                        dht_order_id, order_item_id, phoi_index, cutter_id, cut_date,
                        product_name, material_name, fabric_color,
                        order_quantity, cutting_category, created_by, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, $7, $8, $4, $9)
                    RETURNING id
                `, [dht_order_id, it.id, 0, userId, now, productName, it.quantity || 0, cuttingCategory, now]);
                if (result) createdId = result.id;
            }
        }

        if (createdId) {
            const actionText = isCompensation ? 'Thợ cắt nhận đơn bù' : 'Thợ cắt nhận đơn (phối)';
            await db.run(`INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [createdId, 'claim', actionText, userId, now]);
        }

        return { success: true, created: 1, ids: [createdId] };
    });

    // ========== AVAILABLE MATERIALS: Chất liệu + màu từ sổ kho ==========
    fastify.get('/api/cutting/available-materials', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`
            SELECT m.name AS material_name, fc.color_name,
                   COUNT(CASE WHEN r.weight > 0 AND r.locked_by_cutting_id IS NULL THEN 1 END)::int AS roll_count,
                   COALESCE(SUM(CASE WHEN r.weight > 0 AND r.locked_by_cutting_id IS NULL THEN r.weight ELSE 0 END), 0)::numeric AS total_weight
            FROM kv_materials m
            JOIN kv_fabric_colors fc ON fc.material_id = m.id
            LEFT JOIN kv_rolls r ON r.fabric_color_id = fc.id AND r.is_returned = false
            WHERE m.is_active = true AND fc.is_active = true
            GROUP BY m.name, fc.color_name
            HAVING COUNT(CASE WHEN r.weight > 0 AND r.locked_by_cutting_id IS NULL THEN 1 END) > 0
            ORDER BY m.name, fc.color_name
        `);
        return { materials: rows };
    });

    // ========== MULTI-CUT CANDIDATES: Đơn CHƯA NHẬN có thể gộp ==========
    fastify.get('/api/cutting/multi-cut/candidates', { preHandler: [authenticate] }, async (request, reply) => {
        const { material_name, fabric_color } = request.query;
        if (!material_name || !fabric_color) return { candidates: [] };

        // Find unclaimed order_items whose material_pairs match the selected material+color
        const allItems = await db.all(`
            SELECT oi.id AS order_item_id, oi.description, 
                   oi.quantity, 
                   oi.material_pairs,
                   o.id AS dht_order_id, o.order_code, o.customer_name,
                   COALESCE(p.fabric_arrived, false) AS fabric_arrived,
                   EXISTS(SELECT 1 FROM qlx_assignments qa
                          WHERE qa.dht_order_id = o.id AND qa.assignment_type = 'in'
                          AND (qa.assigned_user_id IS NOT NULL OR qa.assigned_contractor_id IS NOT NULL)
                   ) AS has_print
            FROM dht_order_items oi
            JOIN dht_orders o ON o.id = oi.dht_order_id
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id AND p.item_id IS NULL
            LEFT JOIN dht_categories c ON o.category_id = c.id
            WHERE (
                (
                    COALESCE(jsonb_array_length(oi.material_pairs), 0) = 0
                    AND NOT EXISTS (
                        SELECT 1 FROM cutting_records cr 
                        WHERE cr.order_item_id = oi.id AND cr.cutter_id IS NOT NULL
                    )
                )
                OR
                (
                    COALESCE(jsonb_array_length(oi.material_pairs), 0) > 0
                    AND (
                        SELECT COUNT(*)::int FROM cutting_records cr 
                        WHERE cr.order_item_id = oi.id AND cr.cutter_id IS NOT NULL
                    ) < jsonb_array_length(oi.material_pairs)
                )
            )
              AND COALESCE(o.shipping_status, '') != 'shipped'
              AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
              AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
            ORDER BY o.created_at DESC
        `);

        const matQ = material_name.trim().toLowerCase();
        const colQ = fabric_color.trim().toLowerCase();
        const candidates = [];

        // Pre-fetch all order items for candidate orders to determine ticket and coordinate index
        const orderIds = [...new Set(allItems.map(it => it.dht_order_id))];
        const orderItemsMap = {};
        let claimedRecs = [];
        if (orderIds.length > 0) {
            const allOrderItems = await db.all(`
                SELECT id, dht_order_id, description, material_pairs
                FROM dht_order_items
                WHERE dht_order_id = ANY($1)
                ORDER BY dht_order_id, id
            `, [orderIds]);
            for (const item of allOrderItems) {
                if (!orderItemsMap[item.dht_order_id]) {
                    orderItemsMap[item.dht_order_id] = [];
                }
                orderItemsMap[item.dht_order_id].push(item);
            }

            const candidateItemIds = allItems.map(it => it.order_item_id);
            if (candidateItemIds.length > 0) {
                claimedRecs = await db.all(`
                    SELECT id, order_item_id, material_name, fabric_color, cutter_id, is_cut_done, cut_warning, order_quantity
                    FROM cutting_records 
                    WHERE order_item_id = ANY($1)
                `, [candidateItemIds]);
            }
        }

        for (const it of allItems) {
            let pairs = [];
            try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}
            // Check if any pair matches the selected material+color
            const matchingPair = pairs.find(p =>
                (p.material_name || '').trim().toLowerCase() === matQ &&
                (p.color_name || '').trim().toLowerCase() === colQ
            );
            if (!matchingPair) continue;

            const itemRecords = claimedRecs.filter(r => r.order_item_id === it.order_item_id);
            if (pairs.length > 0) {
                // Find if the matching pair is claimed
                const isClaimed = itemRecords.some(r => 
                    r.cutter_id !== null &&
                    (r.material_name || '').trim().toLowerCase() === matQ &&
                    (r.fabric_color || '').trim().toLowerCase() === colQ
                );
                
                // If it is claimed, check if there is an unclaimed (compensation) record for this pair
                const unclaimedRec = itemRecords.find(r => 
                    r.cutter_id === null && !r.is_cut_done &&
                    (r.material_name || '').trim().toLowerCase() === matQ &&
                    (r.fabric_color || '').trim().toLowerCase() === colQ
                );

                if (isClaimed && !unclaimedRec) {
                    continue; // Skip because it is already claimed/cut!
                }
                
                if (unclaimedRec) {
                    it.quantity = unclaimedRec.order_quantity;
                }
            } else {
                // No pairs
                const hasClaimed = itemRecords.some(r => r.cutter_id !== null);
                const unclaimedRec = itemRecords.find(r => r.cutter_id === null && !r.is_cut_done);
                if (hasClaimed && !unclaimedRec) {
                    continue;
                }
                if (unclaimedRec) {
                    it.quantity = unclaimedRec.order_quantity;
                }
            }

            const itsForOrder = orderItemsMap[it.dht_order_id] || [];
            const itemIds = itsForOrder.map(item => item.id);
            const itemIdx = itemIds.indexOf(it.order_item_id) + 1;

            let totalPhoi = 0;
            for (const item of itsForOrder) {
                let pp = [];
                try { pp = typeof item.material_pairs === 'string' ? JSON.parse(item.material_pairs) : (item.material_pairs || []); } catch(e) {}
                totalPhoi += pp.length > 0 ? pp.length : 1;
            }

            const pairIdx = pairs.findIndex(p =>
                (p.material_name || '').trim().toLowerCase() === matQ &&
                (p.color_name || '').trim().toLowerCase() === colQ
            );
            const phoi_in_item = pairIdx >= 0 ? pairIdx + 1 : 1;

            let fullDesc = '';
            if (totalPhoi > 1) {
                fullDesc = 'Phiếu ' + itemIdx + ' — P' + phoi_in_item + (it.description ? ' — ' + it.description : '');
            } else {
                fullDesc = it.description || '';
            }

            let status = 'ready';
            let statusLabel = '✅ Sẵn sàng';
            let canSelect = true;
            if (!it.fabric_arrived && !it.has_print) {
                status = 'missing_both'; statusLabel = '🔒 Thiếu Vải + PC In'; canSelect = false;
            } else if (!it.fabric_arrived) {
                status = 'missing_fabric'; statusLabel = '🔒 Thiếu Vải'; canSelect = false;
            } else if (!it.has_print) {
                status = 'missing_print'; statusLabel = '🔒 Thiếu PC In'; canSelect = false;
            }

            candidates.push({
                order_item_id: it.order_item_id,
                dht_order_id: it.dht_order_id,
                order_code: it.order_code,
                customer_name: it.customer_name,
                description: fullDesc,
                quantity: it.quantity,
                material_name: matchingPair.material_name,
                color_name: matchingPair.color_name,
                phoi_pair_index: pairIdx >= 0 ? pairIdx : 0,
                status, statusLabel, canSelect
            });
        }
        return { candidates };
    });

    // ========== MULTI-CUT DONE: Hoàn thành cả nhóm cắt chung 1 lần ==========
    fastify.post('/api/cutting/multi-cut/done', { preHandler: [authenticate] }, async (request, reply) => {
        const { group_id, items, roll_remains, ratio_reason, ratio_image } = request.body || {};
        // items = [{ record_id, cut_quantity }, ...]
        if (!group_id) return reply.code(400).send({ error: 'Thiếu group_id' });
        if (!items || !Array.isArray(items) || items.length < 2)
            return reply.code(400).send({ error: 'Cần ít nhất 2 đơn trong nhóm' });

        const now = vnNow();
        const userId = request.user.id;

        const groupRecords = await db.all(
            `SELECT id, dht_order_id, order_quantity, kg_start, selected_roll_ids, is_cut_done, product_name, cutter_id, cutting_category FROM cutting_records WHERE multi_cut_group_id = $1 ORDER BY id`,
            [group_id]
        );
        if (groupRecords.length < 2) return reply.code(400).send({ error: 'Nhóm không hợp lệ hoặc chỉ có 1 đơn' });

        // Check if any record in the group is already finalized
        const alreadyDone = groupRecords.filter(r => r.is_cut_done);
        if (alreadyDone.length > 0) return reply.code(400).send({ error: 'Một số đơn trong nhóm đã báo cắt xong, không thể gửi lại!' });

        // Validate all items match group records
        for (const it of items) {
            const rec = groupRecords.find(r => r.id === it.record_id);
            if (!rec) return reply.code(400).send({ error: 'Record ' + it.record_id + ' không thuộc nhóm này' });
            if (!it.cut_quantity || Number(it.cut_quantity) <= 0) return reply.code(400).send({ error: 'SL Cắt phải > 0' });
            if (rec.order_quantity && Number(it.cut_quantity) > Number(rec.order_quantity))
                return reply.code(400).send({ error: 'SL Cắt (' + it.cut_quantity + ') > SL Đơn (' + rec.order_quantity + ') cho ' + (rec.product_name || rec.id) });
        }

        // Get roll snapshot from the first record (all records share same rolls)
        let snapshot = [];
        try { snapshot = typeof groupRecords[0].selected_roll_ids === 'string' ? JSON.parse(groupRecords[0].selected_roll_ids) : (groupRecords[0].selected_roll_ids || []); } catch(e) {}

        // Process roll remains
        const remainsMap = {};
        if (roll_remains && Array.isArray(roll_remains)) {
            for (const rm of roll_remains) {
                const rem = Number(rm.remaining_weight);
                if (isNaN(rem) || rem < 0) return reply.code(400).send({ error: 'Kg còn lại không hợp lệ' });
                const orig = snapshot.find(s => s.roll_id === rm.roll_id);
                if (orig && rem > Number(orig.weight)) return reply.code(400).send({ error: 'Kg còn lại > kg ban đầu (' + (orig.label || orig.roll_id) + ')' });
                remainsMap[rm.roll_id] = rem;
            }
        }

        const kgStart = Number(groupRecords[0].kg_start) || 0;
        let kgEnd = 0;
        for (const s of snapshot) { kgEnd += remainsMap[s.roll_id] !== undefined ? remainsMap[s.roll_id] : 0; }
        const totalKgCut = kgStart - kgEnd;

        // Calculate total SL across all items
        const totalQty = items.reduce((s, it) => s + Number(it.cut_quantity), 0);

        // VALIDATION TỈ LỆ
        const targetRatio = await getTargetCutRatio(groupRecords[0].material_name, groupRecords[0].cutting_category, snapshot);
        const combinedRatio = totalKgCut > 0 ? Math.round((totalQty / totalKgCut) * 100) / 100 : 0;
        if (targetRatio > 0 && combinedRatio < targetRatio) {
            if (!ratio_reason || ratio_reason.trim().length < 2) {
                return reply.code(400).send({ error: 'Tỉ lệ cắt của nhóm (' + combinedRatio + ' sp/kg) thấp hơn định lượng (' + targetRatio + '). Vui lòng nhập lý do!' });
            }
            if (!ratio_image || ratio_image.trim().length === 0) {
                return reply.code(400).send({ error: 'Tỉ lệ cắt của nhóm (' + combinedRatio + ' sp/kg) thấp hơn định lượng (' + targetRatio + '). Vui lòng chụp/chọn ảnh minh chứng!' });
            }
        }

        // Update each record with proportional kg
        for (const it of items) {
            const qty = Number(it.cut_quantity);
            const myKgCut = totalQty > 0 ? (qty / totalQty) * totalKgCut : 0;
            const myRatio = myKgCut > 0 ? Math.round((qty / myKgCut) * 100) / 100 : 0;

            const rec = groupRecords.find(r => r.id === it.record_id);
            const salInfo = await calculateCutterSalary(rec.cutter_id, rec.cutting_category, qty);

            await db.run(`UPDATE cutting_records SET is_cut_done = true, cut_done_at = $1, cut_done_by = $2,
                kg_end = $3, kg_cut = $4, cut_quantity = $5, cut_ratio = $6,
                ratio_reason = $7, ratio_image = $8, unit_price = $9, salary = $10, updated_at = $1 WHERE id = $11`,
                [now, userId, kgEnd, myKgCut, qty, myRatio, ratio_reason || null, ratio_image || null, salInfo.unit_price, salInfo.salary, it.record_id]);

            if (it.need_compensate) {
                await createCompensationTicket(rec, qty, userId, now);
            }

            await db.run(`INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [it.record_id, 'multi_cut_done', '✅ Cắt xong nhóm — SL: ' + qty + ', Kg: ' + myKgCut.toFixed(2) + ', TL: ' + myRatio, userId, now]);
        }

        const groupOrderIds = groupRecords.map(r => r.dht_order_id).filter(Boolean);
        // Unlock rolls + update weight + release other reservations if depleted
        for (const s of snapshot) {
            const rem = remainsMap[s.roll_id] !== undefined ? remainsMap[s.roll_id] : 0;
            const finalWeight = rem <= 0 ? 0 : rem;
            await db.run(`UPDATE kv_rolls SET weight = $1, locked_by_cutting_id = NULL WHERE id = $2`, [finalWeight, s.roll_id]);
            if (groupOrderIds.length > 0) {
                await db.run(`
                    UPDATE qlx_fabric_reservations 
                    SET status = 'released', updated_at = $1 
                    WHERE roll_id = $2 AND dht_order_id = ANY($3) AND status IN ('reserved', 'arrived')
                `, [now, s.roll_id, groupOrderIds]);
            }
            if (finalWeight === 0) {
                if (groupOrderIds.length > 0) {
                    await db.run(`
                        UPDATE qlx_fabric_reservations 
                        SET status = 'released', updated_at = $1 
                        WHERE roll_id = $2 AND dht_order_id != ALL($3) AND status IN ('reserved', 'arrived')
                    `, [now, s.roll_id, groupOrderIds]);
                } else {
                    await db.run(`
                        UPDATE qlx_fabric_reservations 
                        SET status = 'released', updated_at = $1 
                        WHERE roll_id = $2 AND status IN ('reserved', 'arrived')
                    `, [now, s.roll_id]);
                }
            }
        }

        return {
            success: true,
            total_kg_cut: totalKgCut,
            total_qty: totalQty,
            records: items.map(it => {
                const qty = Number(it.cut_quantity);
                const myKgCut = totalQty > 0 ? (qty / totalQty) * totalKgCut : 0;
                const myRatio = myKgCut > 0 ? Math.round((qty / myKgCut) * 100) / 100 : 0;
                return { record_id: it.record_id, kg_cut: myKgCut, cut_ratio: myRatio };
            })
        };
    });

    // ========== MULTI-CUT: Auto-claim + gộp cắt nhiều đơn ==========
    fastify.post('/api/cutting/multi-cut', { preHandler: [authenticate] }, async (request, reply) => {
        const { selected_roll_ids, selected_order_item_ids, material_name: reqMaterial, fabric_color: reqColor } = request.body || {};
        if (!selected_roll_ids || !Array.isArray(selected_roll_ids) || !selected_roll_ids.length)
            return reply.code(400).send({ error: 'Chọn ít nhất 1 cây vải' });
        if (!selected_order_item_ids || !Array.isArray(selected_order_item_ids) || selected_order_item_ids.length < 2)
            return reply.code(400).send({ error: 'Chọn ít nhất 2 đơn để cắt chung' });

        const now = vnNow();
        const userId = request.user.id;

        // Re-validate: all items must be unclaimed + have preconditions met
        const items = await db.all(`
            SELECT oi.id AS order_item_id, oi.description, oi.quantity, oi.material_pairs,
                   o.id AS dht_order_id, o.order_code, o.shipping_status,
                   COALESCE(p.fabric_arrived, false) AS fabric_arrived,
                   EXISTS(SELECT 1 FROM qlx_assignments qa
                          WHERE qa.dht_order_id = o.id AND qa.assignment_type = 'in'
                          AND (qa.assigned_user_id IS NOT NULL OR qa.assigned_contractor_id IS NOT NULL)
                   ) AS has_print
            FROM dht_order_items oi
            JOIN dht_orders o ON o.id = oi.dht_order_id
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id AND p.item_id IS NULL
            WHERE oi.id = ANY($1)
        `, [selected_order_item_ids]);

        if (items.length !== selected_order_item_ids.length)
            return reply.code(400).send({ error: 'Một số phiếu không tồn tại' });

        for (const it of items) {
            // Check not already claimed by someone else
            const existing = await db.get(`SELECT id FROM cutting_records WHERE order_item_id = $1 AND cutter_id IS NOT NULL AND is_cut_done = false LIMIT 1`, [it.order_item_id]);
            if (existing) return reply.code(409).send({ error: 'Phiếu "' + (it.description || it.order_code) + '" đã được nhận bởi người khác' });
            if (it.shipping_status === 'shipped') return reply.code(400).send({ error: 'Phiếu thuộc đơn hàng "' + it.order_code + '" đã được gửi đi rồi' });
            if (!it.fabric_arrived) return reply.code(400).send({ error: 'Phiếu "' + it.order_code + '" chưa có vải về' });
            if (!it.has_print) return reply.code(400).send({ error: 'Phiếu "' + it.order_code + '" chưa Phân Công In' });
        }

        // Lookup cutting_category from product config (use first item's description)
        let cuttingCategory = null;
        if (items.length > 0 && items[0].description) {
            const productMatch = await db.get(`
                SELECT cc.name AS cutting_category_name
                FROM dht_products p
                LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id
                WHERE p.name = $1 AND p.is_active = true LIMIT 1
            `, [items[0].description.trim()]);
            if (productMatch) cuttingCategory = productMatch.cutting_category_name;
        }

        // Auto-claim: create/update cutting_records for each item
        const createdIds = [];
        for (const it of items) {
            // Check if there is an existing unassigned ticket for this item
            const unassignedRecs = await db.all(`
                SELECT id FROM cutting_records 
                WHERE order_item_id = $1 AND cutter_id IS NULL AND is_cut_done = false
            `, [it.order_item_id]);

            if (unassignedRecs.length > 0) {
                for (const ur of unassignedRecs) {
                    await db.run(`
                        UPDATE cutting_records 
                        SET cutter_id = $1, created_by = $1, created_at = $2
                        WHERE id = $3
                    `, [userId, now, ur.id]);
                    createdIds.push(ur.id);
                }
                continue;
            }

            let pairs = [];
            try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}

            // Build product_name
            const allOrderItems = await db.all(`SELECT id, material_pairs FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id`, [it.dht_order_id]);
            const itemIdx = allOrderItems.findIndex(a => a.id === it.order_item_id) + 1;
            let totalPhoi = 0;
            for (const ait of allOrderItems) {
                let pp = [];
                try { pp = typeof ait.material_pairs === 'string' ? JSON.parse(ait.material_pairs) : (ait.material_pairs || []); } catch(e) {}
                totalPhoi += pp.length > 0 ? pp.length : 1;
            }

            if (pairs.length > 0) {
                // MULTI-CUT: Only create records for pairs matching the selected material+color
                const matFilter = (reqMaterial || '').trim().toLowerCase();
                const colFilter = (reqColor || '').trim().toLowerCase();
                for (let pi = 0; pi < pairs.length; pi++) {
                    const phoi = pairs[pi];
                    // If material+color filter provided, skip non-matching pairs
                    if (matFilter && colFilter) {
                        const pMat = (phoi.material_name || '').trim().toLowerCase();
                        const pCol = (phoi.color_name || '').trim().toLowerCase();
                        if (pMat !== matFilter || pCol !== colFilter) continue;
                    }
                    const productName = totalPhoi > 1
                        ? it.order_code + ' — Phiếu ' + itemIdx + ' — P' + (pi + 1) + (it.description ? ' — ' + it.description : '')
                        : it.order_code + (it.description ? ' — ' + it.description : '');
                    const result = await db.get(`
                        INSERT INTO cutting_records (
                            dht_order_id, order_item_id, phoi_index, cutter_id, cut_date,
                            product_name, material_name, fabric_color,
                            order_quantity, cutting_category, created_by, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $4, $11)
                        RETURNING id
                    `, [it.dht_order_id, it.order_item_id, pi, userId, now, productName,
                        phoi.material_name || null, phoi.color_name || null,
                        it.quantity || 0, cuttingCategory, now]);
                    if (result) createdIds.push(result.id);
                }
            } else {
                const productName = it.order_code + (it.description ? ' — ' + it.description : '');
                const result = await db.get(`
                    INSERT INTO cutting_records (
                        dht_order_id, order_item_id, phoi_index, cutter_id, cut_date,
                        product_name, order_quantity, cutting_category, created_by, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $4, $9)
                    RETURNING id
                `, [it.dht_order_id, it.order_item_id, 0, userId, now, productName,
                    it.quantity || 0, cuttingCategory, now]);
                if (result) createdIds.push(result.id);
            }
        }

        if (createdIds.length < 2) {
            // Cleanup if something went wrong
            if (createdIds.length > 0) await db.run(`DELETE FROM cutting_records WHERE id = ANY($1)`, [createdIds]);
            return reply.code(400).send({ error: 'Không tạo được đủ đơn cắt' });
        }

        // Atomic lock rolls
        const primaryId = createdIds[0];
        const locked = await db.all(
            `UPDATE kv_rolls SET locked_by_cutting_id = $1
             WHERE id = ANY($2) AND locked_by_cutting_id IS NULL
             RETURNING id, weight, roll_code`,
            [primaryId, selected_roll_ids]
        );
        if (locked.length !== selected_roll_ids.length) {
            if (locked.length > 0) await db.run(`UPDATE kv_rolls SET locked_by_cutting_id = NULL WHERE locked_by_cutting_id = $1`, [primaryId]);
            await db.run(`DELETE FROM cutting_records WHERE id = ANY($1)`, [createdIds]);
            return reply.code(409).send({ error: 'Có cây vải đã bị thợ khác chọn, vui lòng tải lại' });
        }

        // Fetch roll labels
        const rollDetails = await db.all(`
            SELECT r.id, r.weight, r.roll_code, m.name AS material_name, fc.color_name
            FROM kv_rolls r JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
            JOIN kv_materials m ON m.id = fc.material_id WHERE r.id = ANY($1)
        `, [locked.map(r => r.id)]);
        const kgStart = locked.reduce((s, r) => s + Number(r.weight), 0);
        const rollSnapshot = rollDetails.map(r => ({
            roll_id: r.id, weight: Number(r.weight), roll_code: r.roll_code,
            label: (r.material_name||'') + ' - ' + (r.color_name||'') + ' - ' + Number(r.weight) + 'kg'
        }));

        // Generate group ID + update all records
        const groupId = 'MCG_' + Date.now() + '_' + userId;
        const records = await db.all(`SELECT id, product_name FROM cutting_records WHERE id = ANY($1)`, [createdIds]);
        const productNames = records.map(r => r.product_name).filter(Boolean);
        const cutShared = 'Cắt chung ' + records.length + ' đơn:\n' + productNames.join('\n');

        for (const rid of createdIds) {
            await db.run(`UPDATE cutting_records SET
                is_cutting = true, cutting_at = $1, cutting_by = $2,
                kg_start = $3, selected_roll_ids = $4,
                multi_cut_group_id = $5, cut_shared = $6, updated_at = $1
                WHERE id = $7`,
                [now, userId, kgStart, JSON.stringify(rollSnapshot), groupId, cutShared, rid]);
            await db.run(`INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [rid, 'multi_cut_start', '✂️ Cắt chung ' + records.length + ' đơn — ' + locked.length + ' cây, ' + kgStart.toFixed(2) + 'kg', userId, now]);

            // Release unselected reservations for this coordination part
            const fullRec = await db.get(`SELECT dht_order_id, order_item_id, material_name, fabric_color FROM cutting_records WHERE id = $1`, [rid]);
            if (fullRec && fullRec.dht_order_id && fullRec.order_item_id && fullRec.material_name && fullRec.fabric_color) {
                await db.run(
                    `UPDATE qlx_fabric_reservations
                     SET status = 'released', updated_at = $1
                     WHERE dht_order_id = $2
                       AND item_id = $3
                       AND material_name = $4
                       AND color_name = $5
                       AND roll_id IS NOT NULL
                       AND roll_id != ALL($6)
                       AND status IN ('reserved', 'arrived')`,
                    [now, fullRec.dht_order_id, fullRec.order_item_id, fullRec.material_name, fullRec.fabric_color, selected_roll_ids]
                );
            }
        }

        return { success: true, group_id: groupId, count: createdIds.length, kg_start: kgStart };
    });

    // ========== UNCLAIM: Trả đơn cắt (per-phiếu supported) ==========
    fastify.post('/api/cutting/unclaim', { preHandler: [authenticate] }, async (request, reply) => {
        const { dht_order_id, order_item_id, phoi_index } = request.body || {};
        if (!dht_order_id) return reply.code(400).send({ error: 'Thiếu mã đơn hàng' });

        let whereClause = 'dht_order_id = $1';
        let params = [dht_order_id];
        if (order_item_id) {
            whereClause += ' AND order_item_id = $2';
            params.push(order_item_id);
            if (phoi_index !== undefined) {
                whereClause += ' AND phoi_index = $3';
                params.push(phoi_index);
            }
        }

        const started = await db.get(`
            SELECT id FROM cutting_records WHERE ${whereClause} AND (is_cutting = true OR is_cut_done = true) LIMIT 1
        `, params);
        if (started) return reply.code(400).send({ error: 'Đơn đã bắt đầu cắt — không thể trả lại' });

        const isManager = await isCutManager(request);
        if (!isManager) {
            const owned = await db.get(`
                SELECT id FROM cutting_records WHERE ${whereClause} AND cutter_id = $${params.length + 1} LIMIT 1
            `, [...params, request.user.id]);
            if (!owned) return reply.code(403).send({ error: 'Chỉ người nhận đơn hoặc quản lý mới trả được' });
        }

        await db.run(`DELETE FROM cutting_records WHERE ${whereClause}`, params);

        return { success: true };
    });

    async function getTargetCutRatio(materialName, cuttingCategory, snapshot) {
        let matName = materialName;
        if (!matName && snapshot && snapshot.length > 0) {
            const rollId = snapshot[0].roll_id || snapshot[0].id;
            if (rollId) {
                const rollDb = await db.get(`
                    SELECT m.name AS material_name
                    FROM kv_rolls r
                    JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                    JOIN kv_materials m ON m.id = fc.material_id
                    WHERE r.id = $1 LIMIT 1
                `, [rollId]);
                if (rollDb) matName = rollDb.material_name;
            }
        }
        if (matName && cuttingCategory) {
            const target = await db.get(`
                SELECT t.target_ratio
                FROM kv_material_cutting_targets t
                JOIN kv_materials m ON m.id = t.material_id
                WHERE m.name = $1 AND t.cutting_category = $2 AND m.is_active = true LIMIT 1
            `, [matName.trim(), cuttingCategory.trim()]);
            return target ? Number(target.target_ratio) || 0 : 0;
        }
        return 0;
    }

    // ========== GET TARGET RATIOS: Lấy tỉ lệ định lượng (Director/Setup) ==========
    fastify.get('/api/cutting/target-ratios', { preHandler: [authenticate] }, async (request, reply) => {
        const materials = await db.all(`
            SELECT m.id, m.name, w.name as warehouse_name, w.unit
            FROM kv_materials m
            JOIN kv_warehouses w ON m.warehouse_id = w.id
            WHERE m.is_active = true
            ORDER BY w.display_order, m.display_order, m.name
        `);
        let categories = await db.all(`
            SELECT name FROM dht_settings_options
            WHERE category = 'cutting_category' AND name IS NOT NULL
            ORDER BY name
        `);
        if (!categories.length) {
            categories = [{ name: 'Áo' }, { name: 'Áo Gió' }, { name: 'Quần' }, { name: 'Váy' }, { name: 'Tạp Dề' }, { name: 'Túi' }, { name: 'Quà' }];
        }
        const targets = await db.all(`
            SELECT material_id, cutting_category, target_ratio
            FROM kv_material_cutting_targets
        `);
        return { materials, categories, targets };
    });

    // ========== POST TARGET RATIOS: Thiết lập tỉ lệ định lượng (Director Only) ==========
    fastify.post('/api/cutting/target-ratios', { preHandler: [authenticate] }, async (request, reply) => {
        if (request.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền thiết lập tỉ lệ định lượng!' });
        }
        const { ratios } = request.body || {};
        if (!ratios || !Array.isArray(ratios)) {
            return reply.code(400).send({ error: 'Dữ liệu không hợp lệ!' });
        }
        for (const item of ratios) {
            const val = Number(item.target_ratio);
            if (isNaN(val) || val < 0) {
                return reply.code(400).send({ error: 'Tỉ lệ định lượng phải là số >= 0!' });
            }
            if (!item.material_id || !item.cutting_category) continue;
            await db.run(`
                INSERT INTO kv_material_cutting_targets (material_id, cutting_category, target_ratio, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (material_id, cutting_category)
                DO UPDATE SET target_ratio = EXCLUDED.target_ratio, updated_at = NOW()
            `, [item.material_id, item.cutting_category.trim(), val]);
        }
        return { success: true };
    });

    // ========== GET ACTIVE ROLLS: Cây vải đang cắt (Xuất vải để cắt) ==========
    fastify.get('/api/cutting/active-rolls', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const rolls = await db.all(`
                SELECT r.id AS roll_id, r.roll_code, r.weight AS roll_weight, r.original_weight,
                       COALESCE(NULLIF(fc.location, ''), NULLIF(m.location, '')) AS location,
                       m.name AS material_name, fc.color_name,
                       cr.id AS cutting_id, cr.product_name, cr.order_quantity,
                       u_cutter.full_name AS cutter_name, cr.cutting_at,
                       o.order_code, u_cskh.full_name AS cskh_name
                FROM kv_rolls r
                JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                JOIN kv_materials m ON m.id = fc.material_id
                JOIN cutting_records cr ON cr.id = r.locked_by_cutting_id
                LEFT JOIN users u_cutter ON u_cutter.id = cr.cutter_id
                LEFT JOIN dht_orders o ON o.id = cr.dht_order_id
                LEFT JOIN users u_cskh ON u_cskh.id = o.cskh_user_id
                WHERE cr.is_cutting = true 
                  AND cr.is_cut_done = false 
                  AND r.is_returned = false 
                  AND r.weight > 0
                ORDER BY cr.cutting_at DESC, r.roll_code ASC
            `);
            return { rolls };
        } catch (e) {
            console.error('[API Active Rolls] Error:', e.message);
            return reply.code(500).send({ error: e.message });
        }
    });
};
