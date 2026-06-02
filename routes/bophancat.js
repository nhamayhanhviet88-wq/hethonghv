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
    // Add cutting_category column if not exists
    try { await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS cutting_category TEXT`); } catch(e) {}
    // Add selected_roll_ids JSONB for storing which rolls were selected for cutting
    try { await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS selected_roll_ids JSONB DEFAULT '[]'`); } catch(e) {}
    // Add locked_by_cutting_id to kv_rolls for hard-locking rolls during cutting
    try { await db.exec(`ALTER TABLE kv_rolls ADD COLUMN IF NOT EXISTS locked_by_cutting_id INTEGER REFERENCES cutting_records(id) ON DELETE SET NULL`); } catch(e) {}
    // Add multi_cut_group_id for grouping records that are cut together
    try { await db.exec(`ALTER TABLE cutting_records ADD COLUMN IF NOT EXISTS multi_cut_group_id TEXT`); } catch(e) {}
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

        // ── Unassigned count — per-item (phiếu) level ──
        const unassigned = await db.get(`
            SELECT
                COUNT(i.id)::int AS total,
                COUNT(i.id) FILTER (
                    WHERE COALESCE(p.fabric_arrived, false) = true
                      AND EXISTS (SELECT 1 FROM qlx_assignments qa WHERE qa.dht_order_id = o.id AND qa.assignment_type = 'in' AND (qa.assigned_user_id IS NOT NULL OR qa.assigned_contractor_id IS NOT NULL))
                )::int AS ready,
                COUNT(i.id) FILTER (
                    WHERE COALESCE(p.fabric_arrived, false) = false
                       OR NOT EXISTS (SELECT 1 FROM qlx_assignments qa WHERE qa.dht_order_id = o.id AND qa.assignment_type = 'in' AND (qa.assigned_user_id IS NOT NULL OR qa.assigned_contractor_id IS NOT NULL))
                )::int AS pending
            FROM dht_orders o
            JOIN dht_order_items i ON i.dht_order_id = o.id
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id
            LEFT JOIN dht_categories c ON o.category_id = c.id
            WHERE NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = i.id)
              AND EXISTS (SELECT 1 FROM qlx_preparation pp WHERE pp.dht_order_id = o.id)
              AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
              AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
              AND COALESCE(o.shipping_status, '') != 'shipped'
        `);

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
            detail = '✂️ Bắt đầu cắt — ' + locked.length + ' cây, ' + kgStart.toFixed(2) + 'kg';
        } else if (action === 'undo_cutting') {
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
            const { cut_quantity, roll_remains, ratio_reason, ratio_image } = b;
            if (!cut_quantity) return reply.code(400).send({ error: 'Thiếu SL Cắt' });
            const cutQty = Number(cut_quantity);
            if (rec.order_quantity && cutQty > Number(rec.order_quantity))
                return reply.code(400).send({ error: 'SL Cắt (' + cutQty + ') không thể lớn hơn SL Đơn (' + rec.order_quantity + ')' });

            let snapshot = [];
            try { snapshot = typeof rec.selected_roll_ids === 'string' ? JSON.parse(rec.selected_roll_ids) : (rec.selected_roll_ids || []); } catch(e) {}

            // Check if this is a multi-cut group
            if (rec.multi_cut_group_id) {
                const otherNotDone = await db.all(
                    `SELECT id FROM cutting_records WHERE multi_cut_group_id = $1 AND id != $2 AND is_cut_done = false`,
                    [rec.multi_cut_group_id, id]
                );
                const isLastInGroup = otherNotDone.length === 0;

                if (!isLastInGroup) {
                    // NOT last: only save cut_quantity, no roll weight changes
                    await db.run(`UPDATE cutting_records SET is_cut_done = true, cut_done_at = $1, cut_done_by = $2,
                        cut_quantity = $3, ratio_reason = $4, ratio_image = $5, updated_at = $1 WHERE id = $6`,
                        [now, request.user.id, cutQty, ratio_reason || null, ratio_image || null, id]);
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
                    const myRatio = cutQty > 0 ? Math.round((myKgCut / cutQty) * 100) / 100 : 0;
                    await db.run(`UPDATE cutting_records SET is_cut_done = true, cut_done_at = $1, cut_done_by = $2,
                        kg_end = $3, kg_cut = $4, cut_quantity = $5, cut_ratio = $6,
                        ratio_reason = $7, ratio_image = $8, updated_at = $1 WHERE id = $9`,
                        [now, request.user.id, kgEnd, myKgCut, cutQty, myRatio, ratio_reason || null, ratio_image || null, id]);

                    // Distribute kg to other group members
                    for (const gr of allGroupDone) {
                        const grQty = Number(gr.cut_quantity) || 0;
                        const grKgCut = totalQtyAll > 0 ? (grQty / totalQtyAll) * totalKgCut : 0;
                        const grRatio = grQty > 0 ? Math.round((grKgCut / grQty) * 100) / 100 : 0;
                        await db.run(`UPDATE cutting_records SET kg_end = $1, kg_cut = $2, cut_ratio = $3, updated_at = $4 WHERE id = $5`,
                            [kgEnd, grKgCut, grRatio, now, gr.id]);
                    }

                    // Update rolls + unlock
                    for (const s of snapshot) {
                        const rem = remainsMap[s.roll_id] !== undefined ? remainsMap[s.roll_id] : 0;
                        await db.run(`UPDATE kv_rolls SET weight = $1, locked_by_cutting_id = NULL WHERE id = $2`, [rem <= 0 ? 0 : rem, s.roll_id]);
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
                const cutRatio = cutQty > 0 ? Math.round((kgCut / cutQty) * 100) / 100 : 0;
                await db.run(`UPDATE cutting_records SET is_cut_done = true, cut_done_at = $1, cut_done_by = $2,
                    kg_end = $3, kg_cut = $4, cut_quantity = $5, cut_ratio = $6,
                    ratio_reason = $7, ratio_image = $8, updated_at = $1 WHERE id = $9`,
                    [now, request.user.id, kgEnd, kgCut, cutQty, cutRatio, ratio_reason || null, ratio_image || null, id]);
                for (const s of snapshot) {
                    const rem = remainsMap[s.roll_id] !== undefined ? remainsMap[s.roll_id] : 0;
                    await db.run(`UPDATE kv_rolls SET weight = $1, locked_by_cutting_id = NULL WHERE id = $2`, [rem <= 0 ? 0 : rem, s.roll_id]);
                }
                detail = '✅ Cắt xong — Kg cắt: ' + kgCut.toFixed(2) + ', SL: ' + cutQty + ', Tỉ lệ: ' + cutRatio;
            }
        } else if (action === 'undo_cut_done') {
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
                    kg_end = 0, kg_cut = 0, cut_quantity = 0, cut_ratio = 0, updated_at = $1 WHERE id = $2`, [now, id]);
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
                    kg_end = 0, kg_cut = 0, cut_quantity = 0, cut_ratio = 0, updated_at = $1 WHERE id = $2`, [now, id]);
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

    // ========== AVAILABLE ROLLS: Cây vải khả dụng theo chất liệu + màu ==========
    fastify.get('/api/cutting/available-rolls', { preHandler: [authenticate] }, async (request, reply) => {
        const { material_name, color_name } = request.query;
        if (!material_name || !color_name) return { rolls: [], message: 'Thiếu chất liệu hoặc màu' };

        const rolls = await db.all(`
            SELECT r.id, r.roll_code, r.weight, r.locked_by_cutting_id,
                   m.name AS material_name, fc.color_name,
                   u_lock.full_name AS locked_by_name,
                   cr_lock.product_name AS locked_product,
                   do_lock.order_code AS locked_order_code
            FROM kv_rolls r
            JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
            JOIN kv_materials m ON m.id = fc.material_id
            LEFT JOIN cutting_records cr_lock ON cr_lock.id = r.locked_by_cutting_id
            LEFT JOIN users u_lock ON u_lock.id = cr_lock.cutter_id
            LEFT JOIN dht_orders do_lock ON do_lock.id = cr_lock.dht_order_id
            WHERE r.is_returned = false
              AND TRIM(m.name) ILIKE $1
              AND TRIM(fc.color_name) ILIKE $2
            ORDER BY r.weight ASC
        `, ['%' + material_name.trim() + '%', '%' + color_name.trim() + '%']);

        return {
            rolls: rolls.map(r => ({
                id: r.id,
                roll_code: r.roll_code,
                weight: Number(r.weight),
                locked: !!r.locked_by_cutting_id,
                locked_by: r.locked_by_name || null,
                locked_order: r.locked_order_code || null,
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
        // Orders that have at least 1 unclaimed item (phiếu)
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
            JOIN qlx_preparation p ON p.dht_order_id = o.id
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            LEFT JOIN qlx_assignments qa_in ON qa_in.dht_order_id = o.id AND qa_in.assignment_type = 'in'
            LEFT JOIN users a_in ON qa_in.assigned_user_id = a_in.id
            LEFT JOIN printing_contractors pc_in ON qa_in.assigned_contractor_id = pc_in.id
            WHERE EXISTS (
                SELECT 1 FROM dht_order_items oi
                WHERE oi.dht_order_id = o.id
                AND NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = oi.id)
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

        // Fetch UNCLAIMED items only + total items count per order
        const orderIds = orders.map(o => o.id);
        let items = [], allItemCounts = {};
        if (orderIds.length > 0) {
            items = await db.all(`
                SELECT dht_order_id, id, description, material_pairs, quantity
                FROM dht_order_items WHERE dht_order_id = ANY($1)
                AND NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = dht_order_items.id)
                ORDER BY dht_order_id, id
            `, [orderIds]);
            // Total items in order (including already claimed) for display logic
            const countRows = await db.all(`
                SELECT dht_order_id, COUNT(*)::int AS cnt
                FROM dht_order_items WHERE dht_order_id = ANY($1)
                GROUP BY dht_order_id
            `, [orderIds]);
            for (const c of countRows) allItemCounts[c.dht_order_id] = c.cnt;
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
                rows.push({ ...o, item_id: null, item_desc: null, phoi_index: 0, item_index: 0, phoi_in_item: 0, total_phoi: 0, total_items_in_order: totalItemsInOrder, material_name: null, color_name: null, item_qty: o.total_quantity });
                continue;
            }
            // Calculate total phối for this order (for naming)
            let totalPhoi = 0;
            for (const it2 of itsArr) {
                let pp = [];
                try { pp = typeof it2.material_pairs === 'string' ? JSON.parse(it2.material_pairs) : (it2.material_pairs || []); } catch(e) {}
                totalPhoi += pp.length > 0 ? pp.length : 1;
            }
            let itemIdx = 0;
            for (const it of itsArr) {
                itemIdx++;
                let pairs = [];
                try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}
                if (pairs.length > 0) {
                    for (let pi = 0; pi < pairs.length; pi++) {
                        rows.push({
                            ...o, item_id: it.id, item_desc: it.description,
                            phoi_index: 0, phoi_pair_index: pi,
                            item_index: itemIdx, phoi_in_item: pi + 1, total_phoi: totalPhoi,
                            total_items_in_order: totalItemsInOrder,
                            material_name: pairs[pi].material_name || null,
                            color_name: pairs[pi].color_name || null,
                            item_qty: it.quantity
                        });
                    }
                } else {
                    rows.push({
                        ...o, item_id: it.id, item_desc: it.description,
                        phoi_index: 0, phoi_pair_index: 0,
                        item_index: itemIdx, phoi_in_item: 1, total_phoi: totalPhoi,
                        total_items_in_order: totalItemsInOrder,
                        material_name: null, color_name: null, item_qty: it.quantity
                    });
                }
            }
        }

        return { orders: rows };
    });

    // ========== CLAIM: Thợ cắt nhận đơn (per-phiếu) ==========
    fastify.post('/api/cutting/claim', { preHandler: [authenticate] }, async (request, reply) => {
        const { dht_order_id, order_item_id } = request.body || {};
        if (!dht_order_id) return reply.code(400).send({ error: 'Thiếu mã đơn hàng' });

        const now = vnNow();
        const userId = request.user.id;

        // Verify conditions
        const order = await db.get(`
            SELECT o.id, o.order_code, o.total_quantity,
                   COALESCE(p.fabric_arrived, false) AS fabric_arrived
            FROM dht_orders o
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id
            WHERE o.id = $1
        `, [dht_order_id]);
        if (!order) return reply.code(404).send({ error: 'Đơn không tồn tại' });
        if (!order.fabric_arrived) return reply.code(400).send({ error: 'Chưa có vải về — không thể nhận đơn cắt' });

        const hasPcIn = await db.get(`
            SELECT 1 FROM qlx_assignments WHERE dht_order_id = $1 AND assignment_type = 'in' AND (assigned_user_id IS NOT NULL OR assigned_contractor_id IS NOT NULL)
        `, [dht_order_id]);
        if (!hasPcIn) return reply.code(400).send({ error: 'Chưa Phân Công In — không thể nhận đơn cắt' });

        // Lookup product's cutting_category for each item
        let items;
        if (order_item_id) {
            // Per-phiếu: check this specific item not already claimed
            const existing = await db.get(`SELECT id FROM cutting_records WHERE order_item_id = $1 LIMIT 1`, [order_item_id]);
            if (existing) return reply.code(409).send({ error: 'Phiếu này đã được nhận bởi người khác' });
            items = await db.all(`SELECT id, description, material_pairs, quantity FROM dht_order_items WHERE id = $1`, [order_item_id]);
        } else {
            // Legacy: claim all unclaimed items
            const existing = await db.get(`SELECT id FROM cutting_records WHERE dht_order_id = $1 LIMIT 1`, [dht_order_id]);
            if (existing) return reply.code(409).send({ error: 'Đơn này đã được nhận bởi người khác' });
            items = await db.all(`SELECT id, description, material_pairs, quantity FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id`, [dht_order_id]);
        }

        // Lookup cutting category from product config
        // dht_order_items.description contains the product name (e.g. "ÁO CỔ BẺ")
        let cuttingCategory = null;
        if (items.length > 0) {
            const itemDesc = items[0].description || '';
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
        }

        // Count total items in order for naming logic
        const allItems = await db.all(`SELECT id, description, material_pairs, quantity FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id`, [dht_order_id]);
        let totalPhoi = 0;
        for (const it2 of allItems) {
            let pp = [];
            try { pp = typeof it2.material_pairs === 'string' ? JSON.parse(it2.material_pairs) : (it2.material_pairs || []); } catch(e) {}
            totalPhoi += pp.length > 0 ? pp.length : 1;
        }

        const createdIds = [];
        if (items.length > 0) {
            for (const it of items) {
                const itemIdx = allItems.findIndex(a => a.id === it.id) + 1;
                let pairs = [];
                try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}

                if (pairs.length > 0) {
                    for (let pi = 0; pi < pairs.length; pi++) {
                        const phoi = pairs[pi];
                        const productName = totalPhoi > 1
                            ? order.order_code + ' — Phiếu ' + itemIdx + ' — P' + (pi + 1) + (it.description ? ' — ' + it.description : '')
                            : order.order_code + (it.description ? ' — ' + it.description : '');
                        const result = await db.get(`
                            INSERT INTO cutting_records (
                                dht_order_id, order_item_id, cutter_id, cut_date,
                                product_name, material_name, fabric_color,
                                order_quantity, cutting_category, created_by, created_at
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $3, $10)
                            RETURNING id
                        `, [dht_order_id, it.id, userId, now, productName, phoi.material_name || null, phoi.color_name || null, it.quantity || 0, cuttingCategory, now]);
                        if (result) createdIds.push(result.id);
                    }
                } else {
                    const productName = totalPhoi > 1
                        ? order.order_code + ' — Phiếu ' + itemIdx + ' — P1' + (it.description ? ' — ' + it.description : '')
                        : order.order_code + (it.description ? ' — ' + it.description : '');
                    const result = await db.get(`
                        INSERT INTO cutting_records (
                            dht_order_id, order_item_id, cutter_id, cut_date,
                            product_name, material_name, fabric_color,
                            order_quantity, cutting_category, created_by, created_at
                        ) VALUES ($1, $2, $3, $4, $5, NULL, NULL, $6, $7, $3, $8)
                        RETURNING id
                    `, [dht_order_id, it.id, userId, now, productName, it.quantity || 0, cuttingCategory, now]);
                    if (result) createdIds.push(result.id);
                }
            }
        } else {
            const result = await db.get(`
                INSERT INTO cutting_records (
                    dht_order_id, cutter_id, cut_date,
                    product_name, order_quantity, cutting_category, created_by, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $2, $7)
                RETURNING id
            `, [dht_order_id, userId, now, order.order_code, order.total_quantity || 0, cuttingCategory, now]);
            if (result) createdIds.push(result.id);
        }

        for (const cid of createdIds) {
            await db.run(`INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [cid, 'claim', 'Thợ cắt nhận đơn' + (order_item_id ? ' (phiếu)' : ''), userId, now]);
        }

        return { success: true, created: createdIds.length, ids: createdIds };
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
            SELECT oi.id AS order_item_id, oi.description, oi.quantity, oi.material_pairs,
                   o.id AS dht_order_id, o.order_code, o.customer_name,
                   COALESCE(p.fabric_arrived, false) AS fabric_arrived,
                   EXISTS(SELECT 1 FROM qlx_assignments qa
                          WHERE qa.dht_order_id = o.id AND qa.assignment_type = 'in'
                          AND (qa.assigned_user_id IS NOT NULL OR qa.assigned_contractor_id IS NOT NULL)
                   ) AS has_print
            FROM dht_order_items oi
            JOIN dht_orders o ON o.id = oi.dht_order_id
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id
            WHERE NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = oi.id)
            ORDER BY o.created_at DESC
        `);

        const matQ = material_name.trim().toLowerCase();
        const colQ = fabric_color.trim().toLowerCase();
        const candidates = [];

        for (const it of allItems) {
            let pairs = [];
            try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}
            // Check if any pair matches the selected material+color
            const matchingPair = pairs.find(p =>
                (p.material_name || '').trim().toLowerCase() === matQ &&
                (p.color_name || '').trim().toLowerCase() === colQ
            );
            if (!matchingPair) continue;

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
                description: it.description,
                quantity: it.quantity,
                material_name: matchingPair.material_name,
                color_name: matchingPair.color_name,
                status, statusLabel, canSelect
            });
        }
        return { candidates };
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
                   o.id AS dht_order_id, o.order_code,
                   COALESCE(p.fabric_arrived, false) AS fabric_arrived,
                   EXISTS(SELECT 1 FROM qlx_assignments qa
                          WHERE qa.dht_order_id = o.id AND qa.assignment_type = 'in'
                          AND (qa.assigned_user_id IS NOT NULL OR qa.assigned_contractor_id IS NOT NULL)
                   ) AS has_print
            FROM dht_order_items oi
            JOIN dht_orders o ON o.id = oi.dht_order_id
            LEFT JOIN qlx_preparation p ON p.dht_order_id = o.id
            WHERE oi.id = ANY($1)
        `, [selected_order_item_ids]);

        if (items.length !== selected_order_item_ids.length)
            return reply.code(400).send({ error: 'Một số phiếu không tồn tại' });

        for (const it of items) {
            // Check not already claimed
            const existing = await db.get(`SELECT id FROM cutting_records WHERE order_item_id = $1 LIMIT 1`, [it.order_item_id]);
            if (existing) return reply.code(409).send({ error: 'Phiếu "' + (it.description || it.order_code) + '" đã được nhận bởi người khác' });
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

        // Auto-claim: create cutting_records for each item
        const createdIds = [];
        for (const it of items) {
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
                            dht_order_id, order_item_id, cutter_id, cut_date,
                            product_name, material_name, fabric_color,
                            order_quantity, cutting_category, created_by, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $3, $10)
                        RETURNING id
                    `, [it.dht_order_id, it.order_item_id, userId, now, productName,
                        phoi.material_name || null, phoi.color_name || null,
                        it.quantity || 0, cuttingCategory, now]);
                    if (result) createdIds.push(result.id);
                }
            } else {
                const productName = it.order_code + (it.description ? ' — ' + it.description : '');
                const result = await db.get(`
                    INSERT INTO cutting_records (
                        dht_order_id, order_item_id, cutter_id, cut_date,
                        product_name, order_quantity, cutting_category, created_by, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $3, $8)
                    RETURNING id
                `, [it.dht_order_id, it.order_item_id, userId, now, productName,
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
        const cutShared = 'Cắt chung ' + records.length + ' đơn: ' + productNames.join(', ');

        for (const rid of createdIds) {
            await db.run(`UPDATE cutting_records SET
                is_cutting = true, cutting_at = $1, cutting_by = $2,
                kg_start = $3, selected_roll_ids = $4,
                multi_cut_group_id = $5, cut_shared = $6, updated_at = $1
                WHERE id = $7`,
                [now, userId, kgStart, JSON.stringify(rollSnapshot), groupId, cutShared, rid]);
            await db.run(`INSERT INTO cutting_history (cutting_id, action, details, performed_by, performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [rid, 'multi_cut_start', '✂️ Cắt chung ' + records.length + ' đơn — ' + locked.length + ' cây, ' + kgStart.toFixed(2) + 'kg', userId, now]);
        }

        return { success: true, group_id: groupId, count: createdIds.length, kg_start: kgStart };
    });

    // ========== UNCLAIM: Trả đơn cắt (per-phiếu supported) ==========
    fastify.post('/api/cutting/unclaim', { preHandler: [authenticate] }, async (request, reply) => {
        const { dht_order_id, order_item_id } = request.body || {};
        if (!dht_order_id) return reply.code(400).send({ error: 'Thiếu mã đơn hàng' });

        const whereClause = order_item_id
            ? 'dht_order_id = $1 AND order_item_id = $2'
            : 'dht_order_id = $1';
        const params = order_item_id ? [dht_order_id, order_item_id] : [dht_order_id];

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
};
