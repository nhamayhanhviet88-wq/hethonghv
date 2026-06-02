// ========== KHO VẢI — Fabric Warehouse Management ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');

function genRollCode() {
    return 'KV' + crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 10);
}

module.exports = async function (fastify) {
    // ========== WAREHOUSES (Kho Vải) ==========

    // GET /api/khovai/warehouses — List all warehouses
    fastify.get('/api/khovai/warehouses', { preHandler: [authenticate] }, async (request) => {
        const rows = await db.all(`
            SELECT w.*,
                   (SELECT COALESCE(SUM(
                       (SELECT COALESCE(SUM(CASE WHEN t.tx_type='NHAP' THEN t.quantity ELSE -t.quantity END),0)
                        FROM kv_transactions t WHERE t.fabric_color_id = fc.id)
                   ),0) FROM kv_fabric_colors fc
                   JOIN kv_materials m ON m.id = fc.material_id
                   WHERE m.warehouse_id = w.id) AS total_balance
            FROM kv_warehouses w
            WHERE w.is_active = true
            ORDER BY w.display_order, w.id
        `);
        return { warehouses: rows };
    });

    // POST /api/khovai/warehouses — Create warehouse
    fastify.post('/api/khovai/warehouses', { preHandler: [authenticate] }, async (request) => {
        const { name, unit } = request.body || {};
        if (!name || !name.trim()) return { error: 'Tên kho không được trống' };
        if (!unit || !unit.trim()) return { error: 'Đơn vị tính không được trống' };

        const maxOrder = await db.get('SELECT COALESCE(MAX(display_order),0)+1 AS next FROM kv_warehouses');
        const row = await db.get(
            `INSERT INTO kv_warehouses (name, unit, display_order) VALUES ($1, $2, $3) RETURNING *`,
            [name.trim(), unit.trim(), maxOrder.next]
        );
        return { success: true, warehouse: row };
    });

    // PUT /api/khovai/warehouses/:id — Update warehouse
    fastify.put('/api/khovai/warehouses/:id', { preHandler: [authenticate] }, async (request) => {
        const { name, unit, display_order } = request.body || {};
        const updates = [];
        const params = [];
        let idx = 1;
        if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name.trim()); }
        if (unit !== undefined) { updates.push(`unit = $${idx++}`); params.push(unit.trim()); }
        if (display_order !== undefined) { updates.push(`display_order = $${idx++}`); params.push(display_order); }
        if (!updates.length) return { error: 'Không có gì cần cập nhật' };
        updates.push(`updated_at = NOW()`);
        params.push(request.params.id);
        await db.run(`UPDATE kv_warehouses SET ${updates.join(', ')} WHERE id = $${idx}`, params);
        return { success: true };
    });

    // DELETE /api/khovai/warehouses/:id — Hard delete warehouse + cascade
    fastify.delete('/api/khovai/warehouses/:id', { preHandler: [authenticate] }, async (request) => {
        const id = request.params.id;
        // Cascade: delete transactions → rolls → colors → materials → warehouse
        await db.run('DELETE FROM kv_transactions WHERE fabric_color_id IN (SELECT fc.id FROM kv_fabric_colors fc JOIN kv_materials m ON m.id = fc.material_id WHERE m.warehouse_id = $1)', [id]);
        await db.run('DELETE FROM kv_rolls WHERE fabric_color_id IN (SELECT fc.id FROM kv_fabric_colors fc JOIN kv_materials m ON m.id = fc.material_id WHERE m.warehouse_id = $1)', [id]);
        await db.run('DELETE FROM kv_fabric_colors WHERE material_id IN (SELECT id FROM kv_materials WHERE warehouse_id = $1)', [id]);
        await db.run('DELETE FROM kv_materials WHERE warehouse_id = $1', [id]);
        await db.run('DELETE FROM kv_warehouses WHERE id = $1', [id]);
        return { success: true };
    });

    // ========== MATERIALS (Chất Liệu) ==========

    // GET /api/khovai/materials?wid= — List materials for a warehouse
    fastify.get('/api/khovai/materials', { preHandler: [authenticate] }, async (request) => {
        const { wid } = request.query;
        let sql = `SELECT m.*,
                          w.name AS warehouse_name, w.unit,
                          (SELECT COALESCE(SUM(
                              (SELECT COALESCE(SUM(CASE WHEN t.tx_type='NHAP' THEN t.quantity ELSE -t.quantity END),0)
                               FROM kv_transactions t WHERE t.fabric_color_id = fc.id)
                          ),0) FROM kv_fabric_colors fc WHERE fc.material_id = m.id) AS total_balance
                   FROM kv_materials m
                   JOIN kv_warehouses w ON w.id = m.warehouse_id
                   WHERE m.is_active = true AND w.is_active = true`;
        const params = [];
        if (wid) { sql += ' AND m.warehouse_id = $1'; params.push(wid); }
        sql += ' ORDER BY m.display_order, m.name';
        const rows = await db.all(sql, params);
        return { materials: rows };
    });

    // POST /api/khovai/materials — Create material
    fastify.post('/api/khovai/materials', { preHandler: [authenticate] }, async (request) => {
        const { warehouse_id, name } = request.body || {};
        if (!warehouse_id) return { error: 'Chưa chọn kho' };
        if (!name || !name.trim()) return { error: 'Tên chất liệu không được trống' };

        const maxOrder = await db.get('SELECT COALESCE(MAX(display_order),0)+1 AS next FROM kv_materials WHERE warehouse_id=$1', [warehouse_id]);
        const row = await db.get(
            `INSERT INTO kv_materials (warehouse_id, name, display_order) VALUES ($1, $2, $3) RETURNING *`,
            [warehouse_id, name.trim(), maxOrder.next]
        );
        return { success: true, material: row };
    });

    // PUT /api/khovai/materials/:id — Update material
    fastify.put('/api/khovai/materials/:id', { preHandler: [authenticate] }, async (request) => {
        const { name, display_order } = request.body || {};
        const updates = []; const params = []; let idx = 1;
        if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name.trim()); }
        if (display_order !== undefined) { updates.push(`display_order = $${idx++}`); params.push(display_order); }
        if (!updates.length) return { error: 'Không có gì cần cập nhật' };
        updates.push('updated_at = NOW()');
        params.push(request.params.id);
        await db.run(`UPDATE kv_materials SET ${updates.join(', ')} WHERE id = $${idx}`, params);
        return { success: true };
    });

    // DELETE /api/khovai/materials/:id — Hard delete material + cascade
    fastify.delete('/api/khovai/materials/:id', { preHandler: [authenticate] }, async (request) => {
        const id = request.params.id;
        await db.run('DELETE FROM kv_transactions WHERE fabric_color_id IN (SELECT id FROM kv_fabric_colors WHERE material_id = $1)', [id]);
        await db.run('DELETE FROM kv_rolls WHERE fabric_color_id IN (SELECT id FROM kv_fabric_colors WHERE material_id = $1)', [id]);
        await db.run('DELETE FROM kv_fabric_colors WHERE material_id = $1', [id]);
        await db.run('DELETE FROM kv_materials WHERE id = $1', [id]);
        return { success: true };
    });

    // ========== COLORS (Màu Vải) ==========

    // GET /api/khovai/colors?mid= — List colors for a material
    fastify.get('/api/khovai/colors', { preHandler: [authenticate] }, async (request) => {
        const { mid } = request.query;
        let sql = `SELECT fc.*, m.name AS material_name, w.name AS warehouse_name, w.unit
                   FROM kv_fabric_colors fc
                   JOIN kv_materials m ON m.id = fc.material_id
                   JOIN kv_warehouses w ON w.id = m.warehouse_id
                   WHERE fc.is_active = true AND m.is_active = true`;
        const params = [];
        if (mid) { sql += ' AND fc.material_id = $1'; params.push(mid); }
        sql += ' ORDER BY fc.color_name';
        const rows = await db.all(sql, params);
        return { colors: rows };
    });

    // POST /api/khovai/colors — Create color
    fastify.post('/api/khovai/colors', { preHandler: [authenticate] }, async (request) => {
        const { material_id, color_name, price, original_tree_threshold } = request.body || {};
        if (!material_id) return { error: 'Chưa chọn chất liệu' };
        if (!color_name || !color_name.trim()) return { error: 'Tên màu không được trống' };

        const row = await db.get(
            `INSERT INTO kv_fabric_colors (material_id, color_name, price, original_tree_threshold)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [material_id, color_name.trim(), price || 0, original_tree_threshold || 10]
        );
        return { success: true, color: row };
    });

    // PUT /api/khovai/colors/:id — Update color (name, price, threshold)
    fastify.put('/api/khovai/colors/:id', { preHandler: [authenticate] }, async (request) => {
        const { color_name, price, original_tree_threshold, notes } = request.body || {};
        const updates = []; const params = []; let idx = 1;
        if (color_name !== undefined) { updates.push(`color_name = $${idx++}`); params.push(color_name.trim()); }
        if (price !== undefined) { updates.push(`price = $${idx++}`); params.push(price); }
        if (original_tree_threshold !== undefined) { updates.push(`original_tree_threshold = $${idx++}`); params.push(original_tree_threshold); }
        if (notes !== undefined) { updates.push(`notes = $${idx++}`); params.push(notes); }
        if (!updates.length) return { error: 'Không có gì cần cập nhật' };
        updates.push('updated_at = NOW()');
        params.push(request.params.id);
        await db.run(`UPDATE kv_fabric_colors SET ${updates.join(', ')} WHERE id = $${idx}`, params);

        // Log history
        const user = request.user;
        const changes = [];
        if (color_name !== undefined) changes.push('Đổi tên màu: ' + color_name);
        if (price !== undefined) changes.push('Đổi giá: ' + price);
        if (original_tree_threshold !== undefined) changes.push('Đổi ngưỡng cây nguyên: ' + original_tree_threshold);
        if (changes.length) {
            await db.run(
                `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
                 VALUES ($1, 'UPDATE', 0, $2, $3)`,
                [request.params.id, changes.join('; '), user.id]
            );
        }
        return { success: true };
    });

    // DELETE /api/khovai/colors/:id — Hard delete color + cascade
    fastify.delete('/api/khovai/colors/:id', { preHandler: [authenticate] }, async (request) => {
        const id = request.params.id;
        await db.run('DELETE FROM kv_transactions WHERE fabric_color_id = $1', [id]);
        await db.run('DELETE FROM kv_rolls WHERE fabric_color_id = $1', [id]);
        await db.run('DELETE FROM kv_fabric_colors WHERE id = $1', [id]);
        return { success: true };
    });

    // ========== ROLLS (Cục Vải) ==========

    // GET /api/khovai/rolls?fcid= — List rolls for a fabric color
    fastify.get('/api/khovai/rolls', { preHandler: [authenticate] }, async (request) => {
        const { fcid } = request.query;
        if (!fcid) return { rolls: [] };
        const rows = await db.all(
            `SELECT r.*, fc.original_tree_threshold,
                    (r.weight >= fc.original_tree_threshold) AS is_original_tree,
                    cr.product_name AS cutting_order_name,
                    u_cut.full_name AS cutting_by_name
             FROM kv_rolls r
             JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
             LEFT JOIN cutting_records cr ON cr.id = r.locked_by_cutting_id
             LEFT JOIN users u_cut ON u_cut.id = cr.cutter_id
             WHERE r.fabric_color_id = $1 AND r.is_returned = false AND r.weight > 0
             ORDER BY r.created_at DESC`,
            [fcid]
        );
        return { rolls: rows };
    });

    // POST /api/khovai/rolls — Add roll + auto-create NHAP transaction
    fastify.post('/api/khovai/rolls', { preHandler: [authenticate] }, async (request) => {
        const { fabric_color_id, weight, source, note } = request.body || {};
        if (!fabric_color_id) return { error: 'Chưa chọn loại vải' };
        if (!weight || Number(weight) <= 0) return { error: 'Trọng lượng phải > 0' };

        const user = request.user;
        const src = source || 'nhap_moi';

        // Insert roll
        const rollCode = genRollCode();
        const roll = await db.get(
            `INSERT INTO kv_rolls (fabric_color_id, roll_code, weight, original_weight, source, note, created_by)
             VALUES ($1, $2, $3, $3, $4, $5, $6) RETURNING *`,
            [fabric_color_id, rollCode, Number(weight), src, note || null, user.id]
        );

        // Create NHAP transaction
        await db.run(
            `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
             VALUES ($1, 'NHAP', $2, $3, $4)`,
            [fabric_color_id, Number(weight), `Thêm cục ${Number(weight)} (${src === 'nhap_moi' ? 'Nhập mới' : 'Cắt dư'})`, user.id]
        );

        return { success: true, roll };
    });

    // PUT /api/khovai/rolls/:id — Update roll weight
    fastify.put('/api/khovai/rolls/:id', { preHandler: [authenticate] }, async (request) => {
        const { weight, note, is_returned } = request.body || {};
        const user = request.user;

        const oldRoll = await db.get('SELECT * FROM kv_rolls WHERE id = $1', [request.params.id]);
        if (!oldRoll) return { error: 'Cục vải không tồn tại' };

        const updates = []; const params = []; let idx = 1;
        if (weight !== undefined) { updates.push(`weight = $${idx++}`); params.push(Number(weight)); }
        if (note !== undefined) { updates.push(`note = $${idx++}`); params.push(note); }
        if (is_returned !== undefined) { updates.push(`is_returned = $${idx++}`); params.push(is_returned); }
        if (!updates.length) return { error: 'Không có gì cần cập nhật' };
        updates.push(`updated_at = NOW()`);
        params.push(request.params.id);
        await db.run(`UPDATE kv_rolls SET ${updates.join(', ')} WHERE id = $${idx}`, params);

        // Log weight change as transaction
        if (weight !== undefined && Number(weight) !== Number(oldRoll.weight)) {
            const diff = Number(weight) - Number(oldRoll.weight);
            const txType = diff > 0 ? 'NHAP' : 'XUAT';
            await db.run(
                `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
                 VALUES ($1, $2, $3, $4, $5)`,
                [oldRoll.fabric_color_id, txType, Math.abs(diff),
                 `Sửa cục: ${oldRoll.weight} → ${weight}`, user.id]
            );
        }

        // Log return
        if (is_returned === true && !oldRoll.is_returned) {
            await db.run(
                `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
                 VALUES ($1, 'XUAT', $2, $3, $4)`,
                [oldRoll.fabric_color_id, Number(oldRoll.weight),
                 `Trả NCC: cục ${oldRoll.weight}`, user.id]
            );
        }

        return { success: true };
    });

    // DELETE /api/khovai/rolls/:id — Delete roll + log XUAT
    fastify.delete('/api/khovai/rolls/:id', { preHandler: [authenticate] }, async (request) => {
        const user = request.user;
        const roll = await db.get('SELECT * FROM kv_rolls WHERE id = $1', [request.params.id]);
        if (!roll) return { error: 'Cục vải không tồn tại' };

        await db.run('DELETE FROM kv_rolls WHERE id = $1', [request.params.id]);

        // Log
        await db.run(
            `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
             VALUES ($1, 'XUAT', $2, $3, $4)`,
            [roll.fabric_color_id, Number(roll.weight), `Xóa cục ${roll.weight}`, user.id]
        );

        return { success: true };
    });

    // ========== COMPLETED ROLLS ==========

    // GET /api/khovai/completed-rolls — Paginated completed rolls (weight = 0)
    fastify.get('/api/khovai/completed-rolls', { preHandler: [authenticate] }, async (request) => {
        const { fcid, page, limit } = request.query;
        if (!fcid) return { rolls: [], total: 0 };
        const p = Math.max(1, Number(page) || 1);
        const l = Math.max(1, Number(limit) || 10);
        const offset = (p - 1) * l;

        const countRow = await db.get(
            `SELECT COUNT(*)::int AS total FROM kv_rolls
             WHERE fabric_color_id = $1 AND is_returned = false AND weight = 0`,
            [fcid]
        );
        const total = countRow ? countRow.total : 0;

        const rolls = await db.all(
            `SELECT r.*,
                    u.full_name AS created_by_name
             FROM kv_rolls r
             LEFT JOIN users u ON u.id = r.created_by
             WHERE r.fabric_color_id = $1 AND r.is_returned = false AND r.weight = 0
             ORDER BY r.updated_at DESC NULLS LAST, r.id DESC
             LIMIT $2 OFFSET $3`,
            [fcid, l, offset]
        );
        return { rolls, total, page: p, limit: l };
    });

    // ========== ROLL DETAIL ==========

    // GET /api/khovai/rolls/:id/detail — Full roll detail with cut history
    fastify.get('/api/khovai/rolls/:id/detail', { preHandler: [authenticate] }, async (request) => {
        const roll = await db.get(
            `SELECT r.*, fc.color_name, m.name AS material_name, w.name AS warehouse_name, w.unit,
                    u.full_name AS created_by_name,
                    cr.product_name AS cutting_order_name,
                    u_cut.full_name AS cutting_by_name
             FROM kv_rolls r
             JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
             JOIN kv_materials m ON m.id = fc.material_id
             JOIN kv_warehouses w ON w.id = m.warehouse_id
             LEFT JOIN users u ON u.id = r.created_by
             LEFT JOIN cutting_records cr ON cr.id = r.locked_by_cutting_id
             LEFT JOIN users u_cut ON u_cut.id = cr.cutter_id
             WHERE r.id = $1`, [request.params.id]
        );
        if (!roll) return { error: 'Không tìm thấy cuộn vải' };

        if (!roll.source_import_id && roll.note && roll.note.startsWith('Nhập vải từ bill ')) {
            const code = roll.note.replace('Nhập vải từ bill ', '').trim();
            const imp = await db.get('SELECT id FROM import_records WHERE fabric_import_code = $1', [code]);
            if (imp) {
                roll.source_import_id = imp.id;
                await db.run('UPDATE kv_rolls SET source_import_id = $1 WHERE id = $2', [imp.id, roll.id]);
            }
        }

        // Cut history from cutting_records
        const cutHistory = await db.all(
            `SELECT cr.id AS cutting_record_id, cr.cut_date, cr.product_name,
                    cr.order_quantity, cr.cut_quantity, cr.kg_cut,
                    u.full_name AS cutter_name
             FROM cutting_records cr
             LEFT JOIN users u ON u.id = cr.cutter_id
             WHERE cr.is_cut_done = true
               AND cr.selected_roll_ids @> jsonb_build_array(jsonb_build_object('roll_id', $1::int))
             ORDER BY cr.cut_date DESC`, [request.params.id]
        );

        return { roll, cutHistory };
    });

    // ========== TRANSACTIONS ==========

    // POST /api/khovai/transactions — Roll-centric import/export
    fastify.post('/api/khovai/transactions', { preHandler: [authenticate] }, async (request) => {
        const { fabric_color_id, tx_type, quantity, description } = request.body || {};
        if (!fabric_color_id) return { error: 'Chưa chọn loại vải' };
        if (!tx_type || !['NHAP', 'XUAT'].includes(tx_type)) return { error: 'Loại giao dịch không hợp lệ' };
        if (!quantity || Number(quantity) <= 0) return { error: 'Số lượng phải > 0' };

        const user = request.user;
        const qty = Number(quantity);

        if (tx_type === 'NHAP') {
            // NHAP: Create a new roll
            const rollCode = genRollCode();
            await db.run(
                `INSERT INTO kv_rolls (fabric_color_id, roll_code, weight, original_weight, source, note, created_by)
                 VALUES ($1, $2, $3, $3, 'nhap_moi', $4, $5)`,
                [fabric_color_id, rollCode, qty, description || 'Nhập mới', user.id]
            );
            await db.run(
                `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
                 VALUES ($1, 'NHAP', $2, $3, $4)`,
                [fabric_color_id, qty, description || `Nhập 1 cục ${qty}`, user.id]
            );
        } else {
            // XUAT: Auto-deduct from largest rolls first
            const totalStock = await db.get(
                'SELECT COALESCE(SUM(weight), 0) AS total FROM kv_rolls WHERE fabric_color_id = $1 AND is_returned = false',
                [fabric_color_id]
            );
            if (Number(totalStock.total) < qty) {
                return { error: `Không đủ tồn kho! Hiện có: ${totalStock.total}, cần xuất: ${qty}` };
            }

            const rolls = await db.all(
                'SELECT * FROM kv_rolls WHERE fabric_color_id = $1 AND is_returned = false ORDER BY weight DESC',
                [fabric_color_id]
            );

            let remaining = qty;
            const details = [];
            for (const roll of rolls) {
                if (remaining <= 0) break;
                const rw = Number(roll.weight);
                if (rw <= remaining) {
                    // Consume entire roll
                    await db.run('DELETE FROM kv_rolls WHERE id = $1', [roll.id]);
                    remaining -= rw;
                    details.push(`Hết cục ${rw}`);
                } else {
                    // Partial cut
                    const newWeight = rw - remaining;
                    await db.run('UPDATE kv_rolls SET weight = $1, updated_at = NOW() WHERE id = $2', [newWeight, roll.id]);
                    details.push(`Cắt cục ${rw}→${newWeight}`);
                    remaining = 0;
                }
            }

            await db.run(
                `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
                 VALUES ($1, 'XUAT', $2, $3, $4)`,
                [fabric_color_id, qty, (description ? description + ' | ' : '') + details.join(', '), user.id]
            );
        }

        return { success: true };
    });

    // GET /api/khovai/history?fcid= — Transaction history for a fabric color
    fastify.get('/api/khovai/history', { preHandler: [authenticate] }, async (request) => {
        const { fcid } = request.query;
        if (!fcid) return { history: [] };
        const rows = await db.all(
            `SELECT t.*, u.full_name AS created_by_name, u.role AS created_by_role
             FROM kv_transactions t
             LEFT JOIN users u ON u.id = t.created_by
             WHERE t.fabric_color_id = $1
             ORDER BY t.created_at DESC
             LIMIT 50`,
            [fcid]
        );
        return { history: rows };
    });

    // ========== SUMMARY (Bảng chính) ==========

    // GET /api/khovai/summary?wid=&mid= — Main table data
    fastify.get('/api/khovai/summary', { preHandler: [authenticate] }, async (request) => {
        const { wid, mid } = request.query;
        let sql = `
            SELECT fc.id, fc.color_name, fc.price, fc.original_tree_threshold, fc.notes,
                   fc.material_id, fc.updated_at,
                   m.name AS material_name, m.warehouse_id,
                   w.name AS warehouse_name, w.unit,
                   COALESCE((SELECT SUM(t.quantity) FROM kv_transactions t
                             WHERE t.fabric_color_id = fc.id AND t.tx_type = 'NHAP'), 0) AS dau_ky,
                   GREATEST(0, COALESCE((SELECT SUM(t.quantity) FROM kv_transactions t
                             WHERE t.fabric_color_id = fc.id AND t.tx_type = 'NHAP'), 0) - COALESCE((SELECT SUM(r.weight) FROM kv_rolls r
                             WHERE r.fabric_color_id = fc.id AND r.is_returned = false), 0)) AS xuat,
                   COALESCE((SELECT COUNT(*) FROM kv_rolls r
                             WHERE r.fabric_color_id = fc.id AND r.is_returned = false AND r.weight > 0), 0) AS so_cuc,
                   COALESCE((SELECT COUNT(*) FROM kv_rolls r
                             WHERE r.fabric_color_id = fc.id AND r.is_returned = false
                             AND r.weight >= fc.original_tree_threshold), 0) AS cay_nguyen,
                   COALESCE((SELECT SUM(r.weight) FROM kv_rolls r
                             WHERE r.fabric_color_id = fc.id AND r.is_returned = false), 0) AS cuoi_ky,
                   (SELECT json_build_object('name', u.full_name, 'role', u.role, 'at', t2.created_at)
                    FROM kv_transactions t2
                    LEFT JOIN users u ON u.id = t2.created_by
                    WHERE t2.fabric_color_id = fc.id
                    ORDER BY t2.created_at DESC LIMIT 1) AS last_update,
                   COALESCE((SELECT json_agg(json_build_object('w', r.weight, 'ow', r.original_weight) ORDER BY r.weight DESC)
                    FROM kv_rolls r WHERE r.fabric_color_id = fc.id AND r.is_returned = false AND r.weight > 0), '[]') AS roll_weights
            FROM kv_fabric_colors fc
            JOIN kv_materials m ON m.id = fc.material_id
            JOIN kv_warehouses w ON w.id = m.warehouse_id
            WHERE fc.is_active = true AND m.is_active = true AND w.is_active = true
        `;
        const params = [];
        let idx = 1;
        if (wid) { sql += ` AND w.id = $${idx++}`; params.push(wid); }
        if (mid) { sql += ` AND m.id = $${idx++}`; params.push(mid); }
        sql += ' ORDER BY m.display_order, m.name, fc.color_name';

        const rows = await db.all(sql, params);

        // Parse last_update JSON
        rows.forEach(r => {
            r.cuoi_ky = Number(r.cuoi_ky); // Roll-based: SUM(roll weights)
            r.label = r.material_name + ' - ' + r.color_name;
            if (r.last_update && typeof r.last_update === 'string') {
                try { r.last_update = JSON.parse(r.last_update); } catch(e) { r.last_update = null; }
            }
            if (r.roll_weights && typeof r.roll_weights === 'string') {
                try { r.roll_weights = JSON.parse(r.roll_weights); } catch(e) { r.roll_weights = []; }
            }
            if (!Array.isArray(r.roll_weights)) r.roll_weights = [];
        });

        return { summary: rows };
    });

    // ========== SIDEBAR TREE ==========

    // GET /api/khovai/tree — Sidebar tree data
    fastify.get('/api/khovai/tree', { preHandler: [authenticate] }, async (request) => {
        const warehouses = await db.all(`
            SELECT w.id, w.name, w.unit, w.display_order,
                   COALESCE((
                       SELECT SUM(
                           COALESCE((SELECT SUM(CASE WHEN t.tx_type='NHAP' THEN t.quantity ELSE -t.quantity END)
                                     FROM kv_transactions t WHERE t.fabric_color_id = fc.id), 0)
                       ) FROM kv_fabric_colors fc
                       JOIN kv_materials mat ON mat.id = fc.material_id
                       WHERE mat.warehouse_id = w.id AND fc.is_active = true AND mat.is_active = true
                   ), 0) AS total_balance
            FROM kv_warehouses w
            WHERE w.is_active = true
            ORDER BY w.display_order, w.id
        `);

        for (const w of warehouses) {
            w.materials = await db.all(`
                SELECT m.id, m.name, m.display_order,
                       COALESCE((
                           SELECT SUM(
                               COALESCE((SELECT SUM(CASE WHEN t.tx_type='NHAP' THEN t.quantity ELSE -t.quantity END)
                                         FROM kv_transactions t WHERE t.fabric_color_id = fc.id), 0)
                           ) FROM kv_fabric_colors fc
                           WHERE fc.material_id = m.id AND fc.is_active = true
                       ), 0) AS total_balance
                FROM kv_materials m
                WHERE m.warehouse_id = $1 AND m.is_active = true
                ORDER BY m.display_order, m.name
            `, [w.id]);
        }

        return { tree: warehouses };
    });

    // ========== TOGGLE (Bật/Tắt) ==========

    // PUT /api/khovai/materials/:id/toggle — Toggle material + cascade to all colors
    fastify.put('/api/khovai/materials/:id/toggle', { preHandler: [authenticate] }, async (request) => {
        const { is_active } = request.body || {};
        await db.run('UPDATE kv_materials SET is_active = $1, updated_at = NOW() WHERE id = $2', [!!is_active, request.params.id]);
        // Cascade: toggle all colors in this material
        await db.run('UPDATE kv_fabric_colors SET is_active = $1, updated_at = NOW() WHERE material_id = $2', [!!is_active, request.params.id]);
        return { success: true };
    });

    // PUT /api/khovai/colors/:id/toggle — Toggle color is_active
    fastify.put('/api/khovai/colors/:id/toggle', { preHandler: [authenticate] }, async (request) => {
        const { is_active } = request.body || {};
        await db.run('UPDATE kv_fabric_colors SET is_active = $1, updated_at = NOW() WHERE id = $2', [!!is_active, request.params.id]);
        return { success: true };
    });

    // GET /api/khovai/warehouses/all — List ALL warehouses including inactive (for settings)
    fastify.get('/api/khovai/warehouses/all', { preHandler: [authenticate] }, async () => {
        return { warehouses: await db.all('SELECT * FROM kv_warehouses ORDER BY display_order, id') };
    });

    // GET /api/khovai/materials/all?wid= — List ALL materials including inactive
    fastify.get('/api/khovai/materials/all', { preHandler: [authenticate] }, async (request) => {
        const { wid } = request.query;
        if (!wid) return { materials: [] };
        return { materials: await db.all('SELECT * FROM kv_materials WHERE warehouse_id = $1 ORDER BY display_order, name', [wid]) };
    });

    // GET /api/khovai/colors/all?mid= — List ALL colors including inactive
    fastify.get('/api/khovai/colors/all', { preHandler: [authenticate] }, async (request) => {
        const { mid } = request.query;
        if (!mid) return { colors: [] };
        return { colors: await db.all('SELECT * FROM kv_fabric_colors WHERE material_id = $1 ORDER BY color_name', [mid]) };
    });

    // PUT /api/khovai/warehouses/:id/toggle — Toggle warehouse is_active
    fastify.put('/api/khovai/warehouses/:id/toggle', { preHandler: [authenticate] }, async (request) => {
        const { is_active } = request.body || {};
        await db.run('UPDATE kv_warehouses SET is_active = $1, updated_at = NOW() WHERE id = $2', [!!is_active, request.params.id]);
        return { success: true };
    });

    // ========== BULK OPERATIONS (selective by IDs) ==========

    // POST /api/khovai/warehouses/bulk-delete — Delete selected warehouses by IDs + cascade
    fastify.post('/api/khovai/warehouses/bulk-delete', { preHandler: [authenticate] }, async (request) => {
        const { ids } = request.body || {};
        if (!ids || !Array.isArray(ids) || !ids.length) return { error: 'Chưa chọn kho nào' };
        for (const id of ids) {
            await db.run('DELETE FROM kv_transactions WHERE fabric_color_id IN (SELECT fc.id FROM kv_fabric_colors fc JOIN kv_materials m ON m.id = fc.material_id WHERE m.warehouse_id = $1)', [id]);
            await db.run('DELETE FROM kv_rolls WHERE fabric_color_id IN (SELECT fc.id FROM kv_fabric_colors fc JOIN kv_materials m ON m.id = fc.material_id WHERE m.warehouse_id = $1)', [id]);
            await db.run('DELETE FROM kv_fabric_colors WHERE material_id IN (SELECT id FROM kv_materials WHERE warehouse_id = $1)', [id]);
            await db.run('DELETE FROM kv_materials WHERE warehouse_id = $1', [id]);
            await db.run('DELETE FROM kv_warehouses WHERE id = $1', [id]);
        }
        return { success: true, deleted: ids.length };
    });

    // POST /api/khovai/materials/bulk-delete — Delete selected materials by IDs + cascade
    fastify.post('/api/khovai/materials/bulk-delete', { preHandler: [authenticate] }, async (request) => {
        const { ids } = request.body || {};
        if (!ids || !Array.isArray(ids) || !ids.length) return { error: 'Chưa chọn chất liệu nào' };
        for (const id of ids) {
            await db.run('DELETE FROM kv_transactions WHERE fabric_color_id IN (SELECT id FROM kv_fabric_colors WHERE material_id = $1)', [id]);
            await db.run('DELETE FROM kv_rolls WHERE fabric_color_id IN (SELECT id FROM kv_fabric_colors WHERE material_id = $1)', [id]);
            await db.run('DELETE FROM kv_fabric_colors WHERE material_id = $1', [id]);
            await db.run('DELETE FROM kv_materials WHERE id = $1', [id]);
        }
        return { success: true, deleted: ids.length };
    });

    // POST /api/khovai/colors/bulk-delete — Delete selected colors by IDs + cascade
    fastify.post('/api/khovai/colors/bulk-delete', { preHandler: [authenticate] }, async (request) => {
        const { ids } = request.body || {};
        if (!ids || !Array.isArray(ids) || !ids.length) return { error: 'Chưa chọn màu nào' };
        for (const id of ids) {
            await db.run('DELETE FROM kv_transactions WHERE fabric_color_id = $1', [id]);
            await db.run('DELETE FROM kv_rolls WHERE fabric_color_id = $1', [id]);
            await db.run('DELETE FROM kv_fabric_colors WHERE id = $1', [id]);
        }
        return { success: true, deleted: ids.length };
    });
};
