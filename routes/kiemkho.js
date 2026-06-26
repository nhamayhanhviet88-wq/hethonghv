// ========== KIỂM KHO — Routes (Sync từ Kho Vải kv_*) ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');
const crypto = require('crypto');
const { clearStockcheckLockCache } = require('../utils/stockcheckLock');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try { await db.exec(`CREATE TABLE IF NOT EXISTS stockcheck_records (
        id SERIAL PRIMARY KEY,
        roll_id INTEGER REFERENCES kv_rolls(id) ON DELETE CASCADE,
        fabric_color_id INTEGER,
        system_weight NUMERIC DEFAULT 0, actual_weight NUMERIC, difference NUMERIC DEFAULT 0,
        is_checked BOOLEAN DEFAULT false, checked_at TIMESTAMPTZ, checked_by INTEGER REFERENCES users(id),
        notes TEXT, created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sc_roll ON stockcheck_records(roll_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sc_fcid ON stockcheck_records(fabric_color_id)`);
    } catch(e) { console.error('[KK] records:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS stockcheck_history (
        id SERIAL PRIMARY KEY, stockcheck_id INTEGER NOT NULL REFERENCES stockcheck_records(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sch_sid ON stockcheck_history(stockcheck_id)`);
    } catch(e) { console.error('[KK] history:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS stockcheck_sessions (
            id SERIAL PRIMARY KEY,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            started_by INTEGER REFERENCES users(id),
            finished_at TIMESTAMPTZ,
            finished_by INTEGER REFERENCES users(id),
            status TEXT NOT NULL DEFAULT 'active',
            total_rolls INTEGER DEFAULT 0,
            total_weight NUMERIC DEFAULT 0,
            checked_rolls INTEGER DEFAULT 0,
            missing_rolls INTEGER DEFAULT 0,
            missing_weight NUMERIC DEFAULT 0,
            surplus_rolls INTEGER DEFAULT 0,
            surplus_weight NUMERIC DEFAULT 0,
            net_difference NUMERIC DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS stockcheck_session_items (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES stockcheck_sessions(id) ON DELETE CASCADE,
            roll_id INTEGER,
            roll_code TEXT,
            material_name TEXT,
            color_name TEXT,
            warehouse_name TEXT,
            unit TEXT,
            system_weight NUMERIC DEFAULT 0,
            actual_weight NUMERIC DEFAULT 0,
            difference NUMERIC DEFAULT 0,
            type TEXT,
            notes TEXT,
            checked_at TIMESTAMPTZ,
            checked_by INTEGER REFERENCES users(id)
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_sc_sess_id ON stockcheck_session_items(session_id)`);
    } catch(e) { console.error('[KK] sessions schema:', e.message); }

    // ========== HELPERS ==========
    const MGMT = ['giam_doc', 'quan_ly_cap_cao'];
    async function isKhoManager(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) { const n = d.name.toLowerCase(); if (n.includes('qlx') || n.includes('kho') || n.includes('quản lý xưởng')) return true; }
        return false;
    }

    // ========== SESSION STATUS ==========
    fastify.get('/api/stockcheck/session-status', { preHandler: [authenticate] }, async (req) => {
        const activeRow = await db.get("SELECT value FROM app_config WHERE key = 'stockcheck_active_session'");
        let session = null;
        if (activeRow && activeRow.value) {
            try { session = JSON.parse(activeRow.value); } catch(e) {}
        }

        // Count rolls currently locked by active cuts
        const activeCutsCount = await db.get(`
            SELECT COUNT(*)::int AS cnt
            FROM kv_rolls r
            JOIN cutting_records cr ON cr.id = r.locked_by_cutting_id
            WHERE cr.is_cut_done = false
        `);

        return {
            active: !!(session && session.status === 'active'),
            session,
            active_cuts_count: activeCutsCount ? activeCutsCount.cnt : 0
        };
    });

    // ========== START SESSION (LOCK WAREHOUSE) ==========
    fastify.post('/api/stockcheck/start-session', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isKhoManager(req))) return reply.code(403).send({ error: 'Chỉ Quản lý kho hoặc Giám đốc mới có quyền bắt đầu đợt kiểm kê.' });

        // Check if there are active cutting records blocking
        const activeCuts = await db.all(`
            SELECT DISTINCT cr.id AS cut_id, cr.dht_order_id,
                            o.order_code, r.roll_code, r.location,
                            r.weight, fc.color_name, m.name AS material_name
            FROM kv_rolls r
            JOIN cutting_records cr ON cr.id = r.locked_by_cutting_id
            LEFT JOIN dht_orders o ON o.id = cr.dht_order_id
            LEFT JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
            LEFT JOIN kv_materials m ON m.id = fc.material_id
            WHERE cr.is_cut_done = false
        `);

        if (activeCuts.length > 0) {
            return reply.code(409).send({
                error: 'Không thể bắt đầu kiểm kê vì còn đơn hàng đang cắt dở ở xưởng!',
                active_cuts: activeCuts
            });
        }

        // Count current warehouse statistics to store in the session
        const stats = await db.get(`
            SELECT COUNT(*)::int AS total_rolls,
                   COALESCE(SUM(r.weight), 0)::numeric AS total_weight
            FROM kv_rolls r
            JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
            JOIN kv_materials m ON m.id = fc.material_id
            WHERE r.is_returned = false AND fc.is_active = true AND m.is_active = true AND r.weight > 0
        `);

        // Create session entry in database
        const sessResult = await db.run(`
            INSERT INTO stockcheck_sessions (started_at, started_by, status, total_rolls, total_weight)
            VALUES ($1, $2, 'active', $3, $4)
        `, [vnNow(), req.user.id, stats.total_rolls, stats.total_weight]);

        const sessionId = sessResult.lastInsertRowid;

        const sessionValue = JSON.stringify({
            status: 'active',
            session_id: sessionId,
            started_at: vnNow(),
            started_by: req.user.id,
            started_by_name: req.user.full_name
        });

        // Set session active in app_config (locks warehouse mutations)
        await db.run(`
            INSERT INTO app_config (key, value, updated_at) VALUES ('stockcheck_active_session', $1, NOW())
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `, [sessionValue]);

        // Reset previous audit temp data
        await db.run('DELETE FROM stockcheck_history');
        await db.run('DELETE FROM stockcheck_records');

        clearStockcheckLockCache();

        return { success: true, session_id: sessionId };
    });

    // ========== ABORT SESSION (UNLOCK WAREHOUSE) ==========
    fastify.post('/api/stockcheck/abort-session', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isKhoManager(req))) return reply.code(403).send({ error: 'Chỉ Quản lý kho hoặc Giám đốc mới có quyền hủy đợt kiểm kê.' });

        const activeRow = await db.get("SELECT value FROM app_config WHERE key = 'stockcheck_active_session'");
        if (!activeRow || !activeRow.value) return reply.code(400).send({ error: 'Không có phiên kiểm kê nào đang hoạt động.' });

        let sessionInfo = {};
        try { sessionInfo = JSON.parse(activeRow.value); } catch(e) {}

        if (sessionInfo.session_id) {
            await db.run(`
                UPDATE stockcheck_sessions
                SET status = 'aborted', finished_at = $1, finished_by = $2
                WHERE id = $3
            `, [vnNow(), req.user.id, sessionInfo.session_id]);
        }

        // Clean up temp tables
        await db.run('DELETE FROM stockcheck_history');
        await db.run('DELETE FROM stockcheck_records');

        // Delete session key
        await db.run("DELETE FROM app_config WHERE key = 'stockcheck_active_session'");

        clearStockcheckLockCache();

        return { success: true };
    });

    // ========== SHELVES LIST ==========
    fastify.get('/api/stockcheck/shelves', { preHandler: [authenticate] }, async (req) => {
        const whParam = req.query.warehouse_id;
        const isAll = !whParam || whParam === 'all' || whParam === '0';

        const search = req.query.search;
        let rollFilter = 'r.is_returned = false AND fc.is_active = true AND m.is_active = true AND r.weight > 0';
        let params = [];
        let idx = 1;
        if (search && search.trim()) {
            rollFilter += ` AND (fc.color_name ILIKE $${idx} OR m.name ILIKE $${idx} OR r.roll_code ILIKE $${idx})`;
            params.push(`%${search.trim()}%`);
            idx++;
        }

        // 1. Get real shelves with stats
        let sqlReal = `
            SELECT l.id, l.name, l.description, l.warehouse_id, l.shelf_position, l.is_restricted,
                   (SELECT string_agg(m.id::text, ',') FROM kv_materials m WHERE LOWER(REGEXP_REPLACE(m.location, '^📍\\s*', '')) = LOWER(REGEXP_REPLACE(l.name, '^📍\\s*', '')) AND m.is_active = true) AS allowed_material_ids,
                   (SELECT string_agg(DISTINCT m.name, ', ') FROM kv_materials m WHERE LOWER(REGEXP_REPLACE(m.location, '^📍\\s*', '')) = LOWER(REGEXP_REPLACE(l.name, '^📍\\s*', '')) AND m.is_active = true) AS allowed_materials,
                   COALESCE((SELECT COUNT(*)::int FROM kv_rolls r
                       JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                       JOIN kv_materials m ON m.id = fc.material_id
                       WHERE m.warehouse_id = l.warehouse_id AND LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) = LOWER(REGEXP_REPLACE(l.name, '^📍\\s*', '')) AND ${rollFilter}), 0) AS roll_count,
                   COALESCE((SELECT SUM(r.weight)::numeric FROM kv_rolls r
                       JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                       JOIN kv_materials m ON m.id = fc.material_id
                       WHERE m.warehouse_id = l.warehouse_id AND LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) = LOWER(REGEXP_REPLACE(l.name, '^📍\\s*', '')) AND ${rollFilter}), 0) AS total_weight,
                   (SELECT string_agg(DISTINCT m.name, ', ') FROM kv_rolls r
                       JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                       JOIN kv_materials m ON m.id = fc.material_id
                       WHERE m.warehouse_id = l.warehouse_id AND LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) = LOWER(REGEXP_REPLACE(l.name, '^📍\\s*', ''))
                         AND r.is_returned = false AND fc.is_active = true AND m.is_active = true AND r.weight > 0) AS materials_list
            FROM kv_locations l
        `;

        if (isAll) {
            sqlReal += ` WHERE l.warehouse_id IN (SELECT id FROM kv_warehouses WHERE is_active = true) `;
        } else {
            sqlReal += ` WHERE l.warehouse_id = $${idx} `;
            params.push(Number(whParam));
            idx++;
        }
        sqlReal += ` ORDER BY l.name `;

        const shelves = await db.all(sqlReal, params);

        // 2. Get unassigned rolls count and weight
        let sqlUnassigned = `
            SELECT r.weight, r.original_weight, m.name AS material_name
            FROM kv_rolls r
            JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
            JOIN kv_materials m ON m.id = fc.material_id
        `;
        let unassignedParams = [...params];
        let uIdx = params.length + 1;

        if (isAll) {
            sqlUnassigned += `
                JOIN kv_warehouses w ON w.id = m.warehouse_id
                WHERE w.is_active = true
                  AND r.is_returned = false
                  AND fc.is_active = true
                  AND m.is_active = true
                  AND (r.location IS NULL OR TRIM(r.location) = '' OR LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) NOT IN (SELECT LOWER(REGEXP_REPLACE(name, '^📍\\s*', '')) FROM kv_locations WHERE warehouse_id = m.warehouse_id))
                  AND ${rollFilter}
            `;
        } else {
            sqlUnassigned += `
                WHERE m.warehouse_id = $${uIdx}
                  AND r.is_returned = false
                  AND fc.is_active = true
                  AND m.is_active = true
                  AND (r.location IS NULL OR TRIM(r.location) = '' OR LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) NOT IN (SELECT LOWER(REGEXP_REPLACE(name, '^📍\\s*', '')) FROM kv_locations WHERE warehouse_id = $${uIdx}))
                  AND ${rollFilter}
            `;
            unassignedParams.push(Number(whParam));
        }

        const unassignedRolls = await db.all(sqlUnassigned, unassignedParams);

        let nguyenCount = 0, nguyenWeight = 0;
        let leCount = 0, leWeight = 0;
        for (const r of unassignedRolls) {
            const w = Number(r.weight);
            const ow = Number(r.original_weight);
            if (w >= ow) {
                nguyenCount++;
                nguyenWeight += w;
            } else {
                leCount++;
                leWeight += w;
            }
        }

        // Get complete materials list for unassigned rolls (without search filter)
        let sqlUnassignedAll = `
            SELECT r.weight, r.original_weight, m.name AS material_name
            FROM kv_rolls r
            JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
            JOIN kv_materials m ON m.id = fc.material_id
        `;
        let unassignedAllParams = [];
        let uaIdx = 1;
        if (isAll) {
            sqlUnassignedAll += `
                JOIN kv_warehouses w ON w.id = m.warehouse_id
                WHERE w.is_active = true
                  AND r.is_returned = false
                  AND fc.is_active = true
                  AND m.is_active = true
                  AND (r.location IS NULL OR TRIM(r.location) = '' OR LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) NOT IN (SELECT LOWER(REGEXP_REPLACE(name, '^📍\\s*', '')) FROM kv_locations WHERE warehouse_id = m.warehouse_id))
                  AND r.weight > 0
            `;
        } else {
            sqlUnassignedAll += `
                WHERE m.warehouse_id = $${uaIdx}
                  AND r.is_returned = false
                  AND fc.is_active = true
                  AND m.is_active = true
                  AND (r.location IS NULL OR TRIM(r.location) = '' OR LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) NOT IN (SELECT LOWER(REGEXP_REPLACE(name, '^📍\\s*', '')) FROM kv_locations WHERE warehouse_id = $${uaIdx}))
                  AND r.weight > 0
            `;
            unassignedAllParams.push(Number(whParam));
        }

        const unassignedRollsAll = await db.all(sqlUnassignedAll, unassignedAllParams);
        const nguyenMaterials = new Set();
        const leMaterials = new Set();
        for (const r of unassignedRollsAll) {
            const w = Number(r.weight);
            const ow = Number(r.original_weight);
            if (w >= ow) {
                if (r.material_name) nguyenMaterials.add(r.material_name);
            } else {
                if (r.material_name) leMaterials.add(r.material_name);
            }
        }

        // 3. Append virtual shelves
        shelves.push({
            id: 'unassigned_nguyen',
            name: 'Chưa xếp kệ - Cây Nguyên',
            description: 'Các cây nguyên chưa xếp vị trí',
            roll_count: nguyenCount,
            total_weight: nguyenWeight,
            materials_list: Array.from(nguyenMaterials).join(', '),
            warehouse_id: isAll ? null : Number(whParam)
        });
        shelves.push({
            id: 'unassigned_le',
            name: 'Chưa xếp kệ - Cây Lẻ',
            description: 'Các cây lẻ chưa xếp vị trí',
            roll_count: leCount,
            total_weight: leWeight,
            materials_list: Array.from(leMaterials).join(', '),
            warehouse_id: isAll ? null : Number(whParam)
        });

        return { shelves };
    });

    // ========== TREE — Sync from kv_* ==========
    fastify.get('/api/stockcheck/tree', { preHandler: [authenticate] }, async () => {
        const warehouses = await db.all(`
            SELECT w.id, w.name, w.unit,
                   COALESCE((SELECT COUNT(*) FROM kv_rolls r
                       JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id
                       JOIN kv_materials m ON m.id=fc.material_id
                       WHERE m.warehouse_id=w.id AND r.is_returned=false AND fc.is_active=true AND m.is_active=true AND r.weight > 0),0)::int AS roll_count,
                   COALESCE((SELECT SUM(r.weight) FROM kv_rolls r
                       JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id
                       JOIN kv_materials m ON m.id=fc.material_id
                       WHERE m.warehouse_id=w.id AND r.is_returned=false AND fc.is_active=true AND m.is_active=true AND r.weight > 0),0)::numeric AS total_weight
            FROM kv_warehouses w WHERE w.is_active=true ORDER BY w.display_order, w.id`);
        for (const w of warehouses) {
            w.materials = await db.all(`
                SELECT m.id, m.name,
                       COALESCE((SELECT COUNT(*) FROM kv_rolls r JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id
                           WHERE fc.material_id=m.id AND r.is_returned=false AND fc.is_active=true AND r.weight > 0),0)::int AS roll_count,
                       COALESCE((SELECT SUM(r.weight) FROM kv_rolls r JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id
                           WHERE fc.material_id=m.id AND r.is_returned=false AND fc.is_active=true AND r.weight > 0),0)::numeric AS total_weight
                FROM kv_materials m WHERE m.warehouse_id=$1 AND m.is_active=true ORDER BY m.display_order, m.name`, [w.id]);
        }
        const totals = await db.get(`SELECT
            COALESCE((SELECT COUNT(*) FROM kv_rolls r JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id JOIN kv_materials m ON m.id=fc.material_id JOIN kv_warehouses w ON w.id=m.warehouse_id WHERE r.is_returned=false AND fc.is_active=true AND m.is_active=true AND w.is_active=true AND r.weight > 0),0)::int AS total_rolls,
            COALESCE((SELECT SUM(r.weight) FROM kv_rolls r JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id JOIN kv_materials m ON m.id=fc.material_id JOIN kv_warehouses w ON w.id=m.warehouse_id WHERE r.is_returned=false AND fc.is_active=true AND m.is_active=true AND w.is_active=true AND r.weight > 0),0)::numeric AS total_weight`);
        const checked = await db.get(`SELECT COUNT(*)::int AS cnt FROM stockcheck_records WHERE is_checked=true`);
        return { tree: warehouses, totals: totals || {total_rolls:0,total_weight:0}, checked_count: (checked||{}).cnt||0 };
    });

    // ========== LIST — Rolls per shelf/material with stockcheck data ==========
    fastify.get('/api/stockcheck/rolls', { preHandler: [authenticate] }, async (req) => {
        const { material_id, warehouse_id, search, location } = req.query;
        let where = 'WHERE r.is_returned=false AND fc.is_active=true AND m.is_active=true AND w.is_active=true AND r.weight > 0', params = [], idx = 1;

        if (location) {
            const locClean = location.trim();
            const isAllWh = !warehouse_id || warehouse_id === 'all' || warehouse_id === '0';

            if (locClean === 'unassigned_nguyen' || locClean === 'Chưa xếp kệ - Cây Nguyên') {
                if (isAllWh) {
                    where += ` AND (r.location IS NULL OR TRIM(r.location) = '' OR LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) NOT IN (SELECT LOWER(REGEXP_REPLACE(name, '^📍\\s*', '')) FROM kv_locations WHERE warehouse_id = m.warehouse_id)) AND r.weight >= r.original_weight`;
                } else {
                    where += ` AND m.warehouse_id=$${idx++} AND (r.location IS NULL OR TRIM(r.location) = '' OR LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) NOT IN (SELECT LOWER(REGEXP_REPLACE(name, '^📍\\s*', '')) FROM kv_locations WHERE warehouse_id = m.warehouse_id)) AND r.weight >= r.original_weight`;
                    params.push(Number(warehouse_id));
                }
            } else if (locClean === 'unassigned_le' || locClean === 'Chưa xếp kệ - Cây Lẻ') {
                if (isAllWh) {
                    where += ` AND (r.location IS NULL OR TRIM(r.location) = '' OR LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) NOT IN (SELECT LOWER(REGEXP_REPLACE(name, '^📍\\s*', '')) FROM kv_locations WHERE warehouse_id = m.warehouse_id)) AND r.weight < r.original_weight`;
                } else {
                    where += ` AND m.warehouse_id=$${idx++} AND (r.location IS NULL OR TRIM(r.location) = '' OR LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) NOT IN (SELECT LOWER(REGEXP_REPLACE(name, '^📍\\s*', '')) FROM kv_locations WHERE warehouse_id = m.warehouse_id)) AND r.weight < r.original_weight`;
                    params.push(Number(warehouse_id));
                }
            } else {
                if (isAllWh) {
                    where += ` AND LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) = LOWER(REGEXP_REPLACE($${idx++}, '^📍\\s*', ''))`;
                    params.push(locClean);
                } else {
                    where += ` AND m.warehouse_id=$${idx++} AND LOWER(REGEXP_REPLACE(r.location, '^📍\\s*', '')) = LOWER(REGEXP_REPLACE($${idx++}, '^📍\\s*', ''))`;
                    params.push(Number(warehouse_id), locClean);
                }
            }
        } else if (material_id) {
            where += ` AND fc.material_id=$${idx++}`;
            params.push(Number(material_id));
        } else if (warehouse_id && warehouse_id !== 'all' && warehouse_id !== '0') {
            where += ` AND m.warehouse_id=$${idx++}`;
            params.push(Number(warehouse_id));
        }

        if (search) {
            where += ` AND (fc.color_name ILIKE $${idx} OR m.name ILIKE $${idx} OR r.roll_code ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        const rows = await db.all(`
            SELECT r.id AS roll_id, r.roll_code, r.weight AS system_weight, r.original_weight, r.source, r.note AS roll_note, r.image_path AS roll_img, r.location,
                   fc.id AS fabric_color_id, fc.color_name, m.id AS material_id, m.name AS material_name,
                   w.name AS warehouse_name, w.unit,
                   sc.id AS sc_id, sc.actual_weight, sc.difference, sc.is_checked, sc.checked_at, sc.notes AS sc_notes,
                   u_ck.full_name AS checked_by_name,
                   lh.details AS last_update_detail, lh.performed_at AS last_update_at, lhu.full_name AS last_update_by,
                   r.locked_by_cutting_id,
                   (
                       SELECT o.order_code || ' - P' || 
                              COALESCE((SELECT COUNT(*)::int FROM dht_order_items it2 WHERE it2.dht_order_id = res.dht_order_id AND it2.id <= res.item_id), 1) || '.' || 
                              (COALESCE(res.phoi_index, 0) + 1)
                       FROM qlx_fabric_reservations res 
                       JOIN dht_orders o ON o.id = res.dht_order_id 
                       WHERE res.roll_id = r.id AND res.status IN ('reserved', 'arrived') 
                       LIMIT 1
                   ) AS reserved_order_code,
                   (SELECT order_code FROM dht_orders JOIN cutting_records cr ON cr.dht_order_id = dht_orders.id WHERE cr.id = r.locked_by_cutting_id) AS locked_order_code
            FROM kv_rolls r
            JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id
            JOIN kv_materials m ON m.id=fc.material_id
            JOIN kv_warehouses w ON w.id=m.warehouse_id
            LEFT JOIN stockcheck_records sc ON sc.roll_id=r.id
            LEFT JOIN users u_ck ON sc.checked_by=u_ck.id
            LEFT JOIN LATERAL (SELECT h.details, h.performed_at, h.performed_by FROM stockcheck_history h WHERE h.stockcheck_id=sc.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY m.display_order, m.name, fc.color_name, r.weight DESC`, params);
        return { rolls: rows };
    });

    // ========== CHECK / UPDATE ==========
    fastify.post('/api/stockcheck/check/:rollId', { preHandler: [authenticate] }, async (req) => {
        const rollId = Number(req.params.rollId), { actual_weight, notes, action } = req.body || {}, now = vnNow();
        const roll = await db.get('SELECT r.*, fc.id AS fcid FROM kv_rolls r JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id WHERE r.id=$1', [rollId]);
        if (!roll) return { error: 'Cây vải không tồn tại' };
        const existing = await db.get('SELECT * FROM stockcheck_records WHERE roll_id=$1', [rollId]);

        if (action === 'toggle_check') {
            if (existing) {
                const newState = !existing.is_checked;
                // If checking, set actual_weight to system_weight by default if not set
                const aw = newState ? (existing.actual_weight !== null ? existing.actual_weight : Number(roll.weight)) : null;
                const diff = newState ? (Number(roll.weight) - aw) : 0;

                await db.run(`UPDATE stockcheck_records SET is_checked=$1, actual_weight=$2, difference=$3, checked_at=$4, checked_by=$5, updated_at=$4 WHERE id=$6`,
                    [newState, aw, diff, newState?now:null, newState?req.user.id:null, existing.id]);
                await db.run(`INSERT INTO stockcheck_history (stockcheck_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                    [existing.id, newState?'check':'uncheck', newState?'📋 Đã kiểm tra':'↩️ Hoàn tác kiểm', req.user.id, now]);
            } else {
                const sc = await db.get(`INSERT INTO stockcheck_records (roll_id,fabric_color_id,system_weight,actual_weight,difference,is_checked,checked_at,checked_by,created_by,created_at)
                    VALUES ($1,$2,$3,$3,0,true,$4,$5,$5,$4) RETURNING id`, [rollId, roll.fcid, Number(roll.weight), now, req.user.id]);
                await db.run(`INSERT INTO stockcheck_history (stockcheck_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                    [sc.id, 'check', '📋 Đã kiểm tra', req.user.id, now]);
            }
            return { success: true };
        }

        // Update actual weight
        const aw = actual_weight !== undefined ? Number(actual_weight) : null;
        const sw = Number(roll.weight);
        const diff = aw !== null ? (sw - aw) : 0;

        if (existing) {
            await db.run(`UPDATE stockcheck_records SET system_weight=$1, actual_weight=$2, difference=$3, notes=$4, is_checked=true, checked_at=$5, checked_by=$6, updated_at=$5 WHERE id=$7`,
                [sw, aw, diff, notes!==undefined?notes:existing.notes, now, req.user.id, existing.id]);
            await db.run(`INSERT INTO stockcheck_history (stockcheck_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [existing.id, 'update', `Kiểm: ${aw} (Tồn: ${sw}, Lệch: ${diff})`, req.user.id, now]);
        } else {
            const sc = await db.get(`INSERT INTO stockcheck_records (roll_id,fabric_color_id,system_weight,actual_weight,difference,notes,is_checked,checked_at,checked_by,created_by,created_at)
                VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$8,$7) RETURNING id`, [rollId, roll.fcid, sw, aw, diff, notes||null, now, req.user.id]);
            await db.run(`INSERT INTO stockcheck_history (stockcheck_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [sc.id, 'create', `Kiểm: ${aw} (Tồn: ${sw}, Lệch: ${diff})`, req.user.id, now]);
        }
        return { success: true, difference: diff };
    });

    // ========== ADD SURPLUS FULL (SUPPORT CREATE MAT/COLOR ON THE FLY) ==========
    fastify.post('/api/stockcheck/add-surplus-full', { preHandler: [authenticate] }, async (req, reply) => {
        const { warehouse_id, material_id, new_material_name, color_id, new_color_name, weight, roll_count, location, note, roll_type } = req.body || {};
        const now = vnNow();

        if (!warehouse_id) return reply.code(400).send({ error: 'Thiếu kho vải.' });
        if (!weight || Number(weight) <= 0) return reply.code(400).send({ error: 'Trọng lượng/Số lượng cây phải lớn hơn 0.' });
        const count = roll_count ? Math.max(1, Number(roll_count)) : 1;

        let finalMaterialId = material_id;
        let finalColorId = color_id;

        // 1. Check or create material
        if (material_id === '[new]') {
            if (!new_material_name || !new_material_name.trim()) return reply.code(400).send({ error: 'Tên chất liệu mới không được để trống.' });
            const matRes = await db.run(`
                INSERT INTO kv_materials (warehouse_id, name, is_active, created_by)
                VALUES ($1, $2, true, $3)
            `, [Number(warehouse_id), new_material_name.trim(), req.user.id]);
            finalMaterialId = matRes.lastInsertRowid;
        }

        // 2. Check or create color
        if (color_id === '[new]') {
            if (!new_color_name || !new_color_name.trim()) return reply.code(400).send({ error: 'Tên màu mới không được để trống.' });
            const colRes = await db.run(`
                INSERT INTO kv_fabric_colors (material_id, color_name, is_active, created_by)
                VALUES ($1, $2, true, $3)
            `, [Number(finalMaterialId), new_color_name.trim(), req.user.id]);
            finalColorId = colRes.lastInsertRowid;
        }

        const rollsCreated = [];

        // 3. Create rolls and checked records
        for (let i = 0; i < count; i++) {
            const rollCode = 'KK' + crypto.randomBytes(5).toString('hex').toUpperCase().slice(0,10);
            const origWeight = roll_type === 'le' ? Number(weight) + 1.0 : Number(weight);
            
            const rollResult = await db.run(`
                INSERT INTO kv_rolls (fabric_color_id, roll_code, weight, original_weight, location, source, note, created_by)
                VALUES ($1, $2, $3, $4, $5, 'kiem_kho_du', $6, $7)
            `, [Number(finalColorId), rollCode, Number(weight), origWeight, location || '', note || 'Nhập từ kiểm kho (Cây thừa)', req.user.id]);
            
            const rollId = rollResult.lastInsertRowid;

            // Log Transaction
            await db.run(`
                INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
                VALUES ($1, 'NHAP', $2, $3, $4)
            `, [Number(finalColorId), Number(weight), `Kiểm kho thừa tại kệ ${location || 'Chưa xếp'}: ${weight} (${rollCode})`, req.user.id]);

            // Auto-check record
            const scResult = await db.run(`
                INSERT INTO stockcheck_records (roll_id, fabric_color_id, system_weight, actual_weight, difference, is_checked, checked_at, checked_by, created_by, created_at)
                VALUES ($1, $2, $3, $3, 0, true, $4, $5, $5, $4)
            `, [rollId, Number(finalColorId), Number(weight), now, req.user.id]);

            await db.run(`
                INSERT INTO stockcheck_history (stockcheck_id, action, details, performed_by, performed_at)
                VALUES ($1, 'create', $2, $3, $4)
            `, [scResult.lastInsertRowid, `📋 Phát hiện cây thừa (${roll_type === 'le' ? 'Cây lẻ' : 'Cây nguyên'}): ${weight} (Kệ: ${location || 'Chưa xếp'})`, req.user.id, now]);

            rollsCreated.push({ id: rollId, code: rollCode });
        }

        return { success: true, rolls: rollsCreated };
    });

    // ========== GET/PUT PHOTO CAPTURE SETTING ==========
    fastify.get('/api/stockcheck/settings', { preHandler: [authenticate] }, async () => {
        const row = await db.get("SELECT value FROM app_config WHERE key = 'stockcheck_photo_mode'");
        return { photo_mode: row ? row.value : 'none' };
    });

    fastify.put('/api/stockcheck/settings', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền thay đổi cấu hình chụp ảnh minh chứng.' });
        }
        const { photo_mode } = req.body || {};
        if (!['none', 'all', 'missing_only'].includes(photo_mode)) {
            return reply.code(400).send({ error: 'Cấu hình chế độ chụp ảnh không hợp lệ.' });
        }

        await db.run(`
            INSERT INTO app_config (key, value, updated_at) VALUES ('stockcheck_photo_mode', $1, NOW())
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `, [photo_mode]);

        return { success: true };
    });

    // ========== FINISH SESSION (APPLY DIFFERENCES + HISTORY) ==========
    fastify.post('/api/stockcheck/finish-session', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isKhoManager(req))) return reply.code(403).send({ error: 'Chỉ Quản lý kho hoặc Giám đốc mới có quyền chốt sổ kiểm kê.' });

        const activeRow = await db.get("SELECT value FROM app_config WHERE key = 'stockcheck_active_session'");
        if (!activeRow || !activeRow.value) return reply.code(400).send({ error: 'Không có phiên kiểm kê nào đang hoạt động.' });

        let sessionInfo = {};
        try { sessionInfo = JSON.parse(activeRow.value); } catch(e) {}
        const sessionId = sessionInfo.session_id;

        // Verify all expected rolls are audited
        const expectedCount = await db.get(`
            SELECT COUNT(*)::int AS cnt FROM kv_rolls r
            JOIN kv_fabric_colors fc ON fc.id=r.fabric_color_id
            JOIN kv_materials m ON m.id=fc.material_id
            WHERE r.is_returned=false AND fc.is_active=true AND m.is_active=true
        `);
        const checkedCount = await db.get(`
            SELECT COUNT(*)::int AS cnt FROM stockcheck_records WHERE is_checked=true
        `);

        if (checkedCount.cnt < expectedCount.cnt) {
            return reply.code(400).send({
                error: `Chưa kiểm kê hết toàn bộ các cây vải trong kho! Đã kiểm: ${checkedCount.cnt} / ${expectedCount.cnt} cây.`
            });
        }

        // Load all checked records
        const records = await db.all(`
            SELECT sc.*, r.roll_code, r.weight AS old_weight, r.source, r.location,
                   fc.color_name, fc.id AS color_id, m.name AS material_name, w.name AS warehouse_name, w.unit
            FROM stockcheck_records sc
            JOIN kv_rolls r ON r.id = sc.roll_id
            JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
            JOIN kv_materials m ON m.id = fc.material_id
            JOIN kv_warehouses w ON w.id = m.warehouse_id
            WHERE sc.is_checked = true
        `);

        let missingRolls = 0, missingWeight = 0;
        let surplusRolls = 0, surplusWeight = 0;
        let netDiff = 0;
        const now = vnNow();

        // Run updates inside a transaction
        await db.run('BEGIN TRANSACTION');

        try {
            for (const rec of records) {
                const oldW = Number(rec.old_weight);
                const newW = Number(rec.actual_weight !== null ? rec.actual_weight : rec.old_weight);
                const diff = oldW - newW; // positive means loss, negative means surplus

                let type = 'match';

                if (rec.source === 'kiem_kho_du') {
                    // Added as surplus during audit
                    surplusRolls++;
                    surplusWeight += newW;
                    type = 'surplus';
                } else if (newW === 0) {
                    // Missing roll (Loss 100%)
                    missingRolls++;
                    missingWeight += oldW;
                    type = 'missing';

                    // Update weight in catalog
                    await db.run('UPDATE kv_rolls SET weight = 0, note = $1 WHERE id = $2', [`Báo mất khi kiểm kê đợt ${now.split('T')[0]}`, rec.roll_id]);

                    // Add XUAT transaction
                    await db.run(`
                        INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
                        VALUES ($1, 'XUAT', $2, $3, $4)
                    `, [rec.color_id, oldW, `Thất thoát kiểm kê (Báo mất cây: ${rec.roll_code})`, req.user.id]);
                } else if (diff !== 0) {
                    netDiff += diff;
                    type = 'difference';

                    // Update weight in catalog
                    await db.run('UPDATE kv_rolls SET weight = $1 WHERE id = $2', [newW, rec.roll_id]);

                    if (diff > 0) {
                        // Loss (Shortage) -> XUAT
                        await db.run(`
                            INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
                            VALUES ($1, 'XUAT', $2, $3, $4)
                        `, [rec.color_id, diff, `Hao hụt kiểm kê (Cây: ${rec.roll_code})`, req.user.id]);
                    } else {
                        // Gain (Surplus) -> NHAP
                        await db.run(`
                            INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
                            VALUES ($1, 'NHAP', $2, $3, $4)
                        `, [rec.color_id, Math.abs(diff), `Dư kiểm kê (Cây: ${rec.roll_code})`, req.user.id]);
                    }
                }

                // Insert snapshot to permanent items table
                await db.run(`
                    INSERT INTO stockcheck_session_items (session_id, roll_id, roll_code, material_name, color_name, warehouse_name, unit, system_weight, actual_weight, difference, type, notes, checked_at, checked_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                `, [sessionId, rec.roll_id, rec.roll_code, rec.material_name, rec.color_name, rec.warehouse_name, rec.unit, oldW, newW, diff, type, rec.notes || null, rec.checked_at, rec.checked_by]);
            }

            // Update session overview stats
            await db.run(`
                UPDATE stockcheck_sessions
                SET status = 'completed', finished_at = $1, finished_by = $2,
                    checked_rolls = $3, missing_rolls = $4, missing_weight = $5,
                    surplus_rolls = $6, surplus_weight = $7, net_difference = $8
                WHERE id = $9
            `, [now, req.user.id, checkedCount.cnt, missingRolls, missingWeight, surplusRolls, surplusWeight, netDiff, sessionId]);

            // Clear active session flag (unlocks warehouse)
            await db.run("DELETE FROM app_config WHERE key = 'stockcheck_active_session'");

            // Clear temp audit tables
            await db.run('DELETE FROM stockcheck_history');
            await db.run('DELETE FROM stockcheck_records');

            await db.run('COMMIT');
            
            clearStockcheckLockCache();

            return { success: true, session_id: sessionId };
        } catch (e) {
            await db.run('ROLLBACK');
            console.error('[KK Finish error]', e);
            return reply.code(500).send({ error: 'Đã xảy ra lỗi hệ thống: ' + e.message });
        }
    });

    // ========== LIST COMPLETED SESSIONS ==========
    fastify.get('/api/stockcheck/sessions', { preHandler: [authenticate] }, async () => {
        return {
            sessions: await db.all(`
                SELECT s.*, u1.full_name AS started_by_name, u2.full_name AS finished_by_name
                FROM stockcheck_sessions s
                LEFT JOIN users u1 ON s.started_by = u1.id
                LEFT JOIN users u2 ON s.finished_by = u2.id
                ORDER BY s.finished_at DESC, s.id DESC
            `)
        };
    });

    // ========== GET COMPLETED SESSION DETAIL ==========
    fastify.get('/api/stockcheck/sessions/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const session = await db.get(`
            SELECT s.*, u1.full_name AS started_by_name, u2.full_name AS finished_by_name
            FROM stockcheck_sessions s
            LEFT JOIN users u1 ON s.started_by = u1.id
            LEFT JOIN users u2 ON s.finished_by = u2.id
            WHERE s.id = $1
        `, [id]);

        if (!session) return reply.code(404).send({ error: 'Phiên kiểm kê không tồn tại.' });

        const items = await db.all(`
            SELECT i.*, u.full_name AS checked_by_name
            FROM stockcheck_session_items i
            LEFT JOIN users u ON i.checked_by = u.id
            WHERE i.session_id = $1
            ORDER BY i.material_name, i.color_name, i.roll_code
        `, [id]);

        return { session, items };
    });

    // ========== YEARLY SUMMARY ==========
    fastify.get('/api/stockcheck/yearly-summary', { preHandler: [authenticate] }, async (req) => {
        const year = Number(req.query.year) || new Date().getFullYear();
        
        // Group differences by month for the specified year
        const query = `
            SELECT EXTRACT(MONTH FROM finished_at)::int AS month,
                   COUNT(*)::int AS audit_count,
                   SUM(missing_rolls)::int AS missing_rolls,
                   SUM(missing_weight)::numeric AS missing_weight,
                   SUM(surplus_rolls)::int AS surplus_rolls,
                   SUM(surplus_weight)::numeric AS surplus_weight,
                   SUM(net_difference)::numeric AS net_difference
            FROM stockcheck_sessions
            WHERE status = 'completed' AND EXTRACT(YEAR FROM finished_at) = $1
            GROUP BY EXTRACT(MONTH FROM finished_at)
            ORDER BY month ASC
        `;
        
        const rows = await db.all(query, [year]);
        
        // Format to a 12-month array
        const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            audit_count: 0,
            missing_rolls: 0,
            missing_weight: 0,
            surplus_rolls: 0,
            surplus_weight: 0,
            net_difference: 0
        }));

        for (const row of rows) {
            if (row.month >= 1 && row.month <= 12) {
                monthlyStats[row.month - 1] = {
                    month: row.month,
                    audit_count: row.audit_count,
                    missing_rolls: row.missing_rolls,
                    missing_weight: Number(row.missing_weight),
                    surplus_rolls: row.surplus_rolls,
                    surplus_weight: Number(row.surplus_weight),
                    net_difference: Number(row.net_difference)
                };
            }
        }

        return { year, stats: monthlyStats };
    });

    // ========== HISTORY ==========
    fastify.get('/api/stockcheck/history/:scId', { preHandler: [authenticate] }, async (req) => {
        return { history: await db.all(`SELECT h.*, u.full_name AS performer_name FROM stockcheck_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.stockcheck_id=$1 ORDER BY h.performed_at DESC LIMIT 50`, [Number(req.params.scId)]) };
    });

    // ========== RESET KIỂM KHO ==========
    fastify.delete('/api/stockcheck/reset', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isKhoManager(req))) return reply.code(403).send({ error: 'Chỉ QLX/GĐ' });
        await db.run('DELETE FROM stockcheck_history');
        await db.run('DELETE FROM stockcheck_records');
        return { success: true };
    });
};
