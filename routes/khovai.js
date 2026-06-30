// ========== KHO VẢI — Fabric Warehouse Management ==========
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function genRollCode() {
    return 'KV' + crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 10);
}

function isGdOrTrinh(user) {
    if (!user) return false;
    const name = user.full_name || '';
    const uname = user.username || '';
    const role = user.role || '';
    if (role === 'giam_doc') return true;
    if (name.includes('Lê Việt Trinh') || name.includes('Le Viet Trinh') || uname === 'leviettrinh' || uname === 'trinh.lvt' || uname === 'trinh') {
        return true;
    }
    return false;
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

    fastify.put('/api/khovai/warehouses/:id', { preHandler: [authenticate] }, async (request) => {
        const { name, unit, display_order, original_tree_threshold } = request.body || {};
        const updates = [];
        const params = [];
        let idx = 1;
        if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name.trim()); }
        if (unit !== undefined) { updates.push(`unit = $${idx++}`); params.push(unit.trim()); }
        if (display_order !== undefined) { updates.push(`display_order = $${idx++}`); params.push(display_order); }
        if (original_tree_threshold !== undefined) { updates.push(`original_tree_threshold = $${idx++}`); params.push(original_tree_threshold); }
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
        const { warehouse_id, name, location } = request.body || {};
        const wId = Number(warehouse_id);
        if (!warehouse_id || isNaN(wId) || !Number.isInteger(wId)) return { error: 'Vui lòng chọn một kho vải cụ thể' };
        if (!name || !name.trim()) return { error: 'Tên chất liệu không được trống' };

        const maxOrder = await db.get('SELECT COALESCE(MAX(display_order),0)+1 AS next FROM kv_materials WHERE warehouse_id=$1', [wId]);
        const row = await db.get(
            `INSERT INTO kv_materials (warehouse_id, name, display_order, location) VALUES ($1, $2, $3, $4) RETURNING *`,
            [wId, name.trim(), maxOrder.next, location ? location.trim() : null]
        );
        return { success: true, material: row };
    });

    // PUT /api/khovai/materials/:id — Update material
    fastify.put('/api/khovai/materials/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const { name, display_order, original_tree_threshold, location, stop_import } = request.body || {};
        if (stop_import !== undefined) {
            if (!isGdOrTrinh(request.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc quản lý Lê Việt Trinh mới có quyền dừng/nhập chất liệu!' });
            }
        }
        const updates = []; const params = []; let idx = 1;
        if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name.trim()); }
        if (display_order !== undefined) { updates.push(`display_order = $${idx++}`); params.push(display_order); }
        if (original_tree_threshold !== undefined) { updates.push(`original_tree_threshold = $${idx++}`); params.push(original_tree_threshold); }
        if (location !== undefined) { updates.push(`location = $${idx++}`); params.push(location ? location.trim() : null); }
        if (stop_import !== undefined) { updates.push(`stop_import = $${idx++}`); params.push(!!stop_import); }
        if (!updates.length) return { error: 'Không có gì cần cập nhật' };
        updates.push('updated_at = NOW()');
        params.push(request.params.id);
        await db.run(`UPDATE kv_materials SET ${updates.join(', ')} WHERE id = $${idx}`, params);

        if (stop_import !== undefined) {
            // Cascade stop_import status to all colors under this material
            await db.run(`UPDATE kv_fabric_colors SET stop_import = $1 WHERE material_id = $2`, [!!stop_import, request.params.id]);
        }

        if (location !== undefined) {
            // Cascade to colors and rolls under this material to inherit (NULL location)
            await db.run('UPDATE kv_fabric_colors SET location = NULL WHERE material_id = $1', [request.params.id]);
            await db.run('UPDATE kv_rolls SET location = NULL WHERE fabric_color_id IN (SELECT id FROM kv_fabric_colors WHERE material_id = $1)', [request.params.id]);

            if (location) {
                const locRecord = await db.get(
                    `SELECT id, is_restricted, restricted_material_id
                     FROM kv_locations
                     WHERE LOWER(name) = LOWER($1)`,
                    [location.trim()]
                );
                if (locRecord && locRecord.is_restricted) {
                    await db.run('UPDATE kv_locations SET restricted_material_id = $1 WHERE id = $2', [request.params.id, locRecord.id]);
                }
            } else {
                await db.run('UPDATE kv_locations SET restricted_material_id = NULL WHERE restricted_material_id = $1', [request.params.id]);
            }
        }
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
        const { mid, include_inactive } = request.query;
        let sql = `SELECT fc.id, fc.material_id, fc.color_name, fc.price, fc.original_tree_threshold, fc.notes, fc.location, fc.created_at, fc.updated_at,
                          fc.stop_import, fc.allowed_slips, fc.allowed_import_slips,
                          (fc.is_active AND m.is_active) AS is_active,
                          m.name AS material_name, w.name AS warehouse_name, w.unit
                   FROM kv_fabric_colors fc
                   JOIN kv_materials m ON m.id = fc.material_id
                   JOIN kv_warehouses w ON w.id = m.warehouse_id
                   WHERE w.is_active = true`;
        const params = [];
        if (include_inactive !== 'true') {
            sql += ' AND m.is_active = true AND fc.is_active = true';
        }
        if (mid) {
            sql += ` AND fc.material_id = $${params.length + 1}`;
            params.push(Number(mid));
        }
        sql += ' ORDER BY fc.color_name';
        const rows = await db.all(sql, params);
        return { colors: rows };
    });

    // POST /api/khovai/colors — Create color
    fastify.post('/api/khovai/colors', { preHandler: [authenticate] }, async (request) => {
        const { material_id, color_name, price, original_tree_threshold, location } = request.body || {};
        if (!material_id) return { error: 'Chưa chọn chất liệu' };
        if (!color_name || !color_name.trim()) return { error: 'Tên màu không được trống' };

        if (location) {
            const locRecord = await db.get(
                `SELECT id, is_restricted
                 FROM kv_locations
                 WHERE LOWER(name) = LOWER($1)`,
                [location.trim()]
            );
            if (locRecord && locRecord.is_restricted) {
                const isAssigned = await db.get(
                    `SELECT COUNT(*)::int AS count
                     FROM kv_materials
                     WHERE LOWER(location) = LOWER($1) AND id = $2`,
                    [location.trim(), material_id]
                );
                if (!isAssigned || isAssigned.count === 0) {
                    return { error: 'Kệ này giới hạn chất liệu khác, không thể xếp loại vải này vào!' };
                }
            }
        }

        const mat = await db.get(`SELECT stop_import FROM kv_materials WHERE id = $1`, [material_id]);
        const stopImport = mat ? !!mat.stop_import : false;

        const row = await db.get(
            `INSERT INTO kv_fabric_colors (material_id, color_name, price, original_tree_threshold, location, stop_import)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [material_id, color_name.trim(), price || 0, original_tree_threshold || 10, location ? location.trim() : null, stopImport]
        );
        return { success: true, color: row };
    });

    fastify.put('/api/khovai/colors/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const { color_name, price, original_tree_threshold, notes, location, stop_import, allowed_import_slips } = request.body || {};
        if (stop_import !== undefined || allowed_import_slips !== undefined) {
            if (!isGdOrTrinh(request.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc quản lý Lê Việt Trinh mới có quyền dừng/nhập màu vải!' });
            }
            const color = await db.get('SELECT is_active, allowed_slips FROM kv_fabric_colors WHERE id = $1', [request.params.id]);
            if (!color) {
                return reply.code(404).send({ error: 'Không tìm thấy màu vải!' });
            }
            if (!color.is_active || color.allowed_slips !== null) {
                return reply.code(400).send({ error: 'Màu vải đang ở trạng thái ẩn bán hoặc giới hạn bán. Vui lòng mở bán vĩnh viễn trước khi thay đổi trạng thái nhập!' });
            }
        }
        const updates = []; const params = []; let idx = 1;
        if (color_name !== undefined) { updates.push(`color_name = $${idx++}`); params.push(color_name.trim()); }
        if (price !== undefined) { updates.push(`price = $${idx++}`); params.push(price); }
        if (original_tree_threshold !== undefined) { updates.push(`original_tree_threshold = $${idx++}`); params.push(original_tree_threshold); }
        if (notes !== undefined) { updates.push(`notes = $${idx++}`); params.push(notes); }
        if (stop_import !== undefined) {
            updates.push(`stop_import = $${idx++}`); params.push(!!stop_import);
            if (stop_import) {
                updates.push(`allowed_import_slips = $${idx++}`); params.push(null);
                // Rule B: if stopped import (stop_import = true), it cannot be hidden for sales (is_active = true, allowed_slips = null)
                updates.push(`is_active = $${idx++}`); params.push(true);
                updates.push(`allowed_slips = $${idx++}`); params.push(null);
            } else {
                let parsedImportSlips = null;
                if (allowed_import_slips !== undefined && allowed_import_slips !== null) {
                    const val = parseInt(allowed_import_slips, 10);
                    if (!isNaN(val) && val >= 0) {
                        parsedImportSlips = val;
                    }
                }
                updates.push(`allowed_import_slips = $${idx++}`); params.push(parsedImportSlips);
            }
        }
        if (location !== undefined) {
            if (location) {
                const colorRecord = await db.get('SELECT material_id FROM kv_fabric_colors WHERE id = $1', [request.params.id]);
                if (colorRecord) {
                    const locRecord = await db.get(
                        `SELECT id, is_restricted
                         FROM kv_locations
                         WHERE LOWER(name) = LOWER($1)`,
                        [location.trim()]
                    );
                    if (locRecord && locRecord.is_restricted) {
                        const isAssigned = await db.get(
                            `SELECT COUNT(*)::int AS count
                             FROM kv_materials
                             WHERE LOWER(location) = LOWER($1) AND id = $2`,
                            [location.trim(), colorRecord.material_id]
                        );
                        if (!isAssigned || isAssigned.count === 0) {
                            return { error: 'Kệ này giới hạn chất liệu khác, không thể xếp loại vải này vào!' };
                        }
                    }
                }
            }
            updates.push(`location = $${idx++}`); params.push(location ? location.trim() : null);
        }
        if (!updates.length) return { error: 'Không có gì cần cập nhật' };
        updates.push('updated_at = NOW()');
        params.push(request.params.id);
        await db.run(`UPDATE kv_fabric_colors SET ${updates.join(', ')} WHERE id = $${idx}`, params);

        if (location) {
            const colorRecord = await db.get('SELECT material_id FROM kv_fabric_colors WHERE id = $1', [request.params.id]);
            if (colorRecord) {
                const locRecord = await db.get(
                    `SELECT id, is_restricted, restricted_material_id
                     FROM kv_locations
                     WHERE LOWER(name) = LOWER($1)`,
                    [location.trim()]
                );
                if (locRecord && locRecord.is_restricted && !locRecord.restricted_material_id) {
                    await db.run('UPDATE kv_locations SET restricted_material_id = $1 WHERE id = $2', [colorRecord.material_id, locRecord.id]);
                }
            }
        }

        // Log history
        const user = request.user;
        const changes = [];
        if (color_name !== undefined) changes.push('Đổi tên màu: ' + color_name);
        if (price !== undefined) changes.push('Đổi giá: ' + price);
        if (original_tree_threshold !== undefined) changes.push('Đổi ngưỡng cây nguyên: ' + original_tree_threshold);
        if (location !== undefined) changes.push('Đổi vị trí kho: ' + (location || 'Trống'));
        if (stop_import !== undefined) changes.push('Đổi trạng thái dừng nhập: ' + (stop_import ? 'Bật' : 'Tắt'));
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

    // GET /api/khovai/rolls/requested-returns — List all rolls requested for return but not yet completed
    fastify.get('/api/khovai/rolls/requested-returns', { preHandler: [authenticate] }, async (request) => {
        const rows = await db.all(
            `SELECT r.id, r.weight, r.roll_code, r.created_at, r.return_requested_at,
                    fc.color_name, m.name AS material_name, u.full_name AS requester_name
             FROM kv_rolls r
             JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
             JOIN kv_materials m ON m.id = fc.material_id
             LEFT JOIN users u ON u.id = r.return_requested_by
             WHERE r.return_requested = true AND r.return_tx_id IS NULL AND r.is_returned = false
             ORDER BY r.return_requested_at DESC`
        );
        return { rolls: rows };
    });

    // POST /api/khovai/rolls/:id/request-return — Request return for a roll
    fastify.post('/api/khovai/rolls/:id/request-return', { preHandler: [authenticate] }, async (request, reply) => {
        const canReturn = request.user && (
            request.user.role === 'giam_doc' || 
            request.user.username === 'trinh' || 
            (request.user.full_name && request.user.full_name.includes('Lê Việt Trinh'))
        );
        if (!canReturn) {
            return reply.code(403).send({ error: 'Bạn không có quyền yêu cầu hoàn cây nguyên.' });
        }
        const id = Number(request.params.id);
        const roll = await db.get('SELECT id, location, original_location FROM kv_rolls WHERE id = $1', [id]);
        if (!roll) return reply.code(404).send({ error: 'Cục vải không tồn tại' });
        
        const origLoc = roll.location !== '📍 Kệ Dự Định Hoàn Vải' ? (roll.location || null) : roll.original_location;
        await db.run(
            `UPDATE kv_rolls 
             SET return_requested = true, return_requested_by = $1, return_requested_at = NOW(),
                 location = '📍 Kệ Dự Định Hoàn Vải', original_location = $2
             WHERE id = $3`,
            [request.user.id, origLoc, id]
        );
        return { success: true };
    });

    // POST /api/khovai/rolls/:id/cancel-return-request — Cancel return request for a roll
    fastify.post('/api/khovai/rolls/:id/cancel-return-request', { preHandler: [authenticate] }, async (request, reply) => {
        const canReturn = request.user && (
            request.user.role === 'giam_doc' || 
            request.user.username === 'trinh' || 
            (request.user.full_name && request.user.full_name.includes('Lê Việt Trinh'))
        );
        if (!canReturn) {
            return reply.code(403).send({ error: 'Bạn không có quyền hủy yêu cầu hoàn cây nguyên.' });
        }
        const id = Number(request.params.id);
        const roll = await db.get('SELECT id, location, original_location FROM kv_rolls WHERE id = $1', [id]);
        if (!roll) return reply.code(404).send({ error: 'Cục vải không tồn tại' });
        
        const nextLoc = roll.location === '📍 Kệ Dự Định Hoàn Vải' ? roll.original_location : roll.location;
        await db.run(
            `UPDATE kv_rolls 
             SET return_requested = false, return_requested_by = NULL, return_requested_at = NULL,
                 location = $1, original_location = NULL
             WHERE id = $2`,
            [nextLoc, id]
        );
        return { success: true };
    });

    // GET /api/khovai/rolls?fcid= — List rolls for a fabric color
    fastify.get('/api/khovai/rolls', { preHandler: [authenticate] }, async (request) => {
        const { fcid } = request.query;
        if (!fcid) return { rolls: [] };
        const rows = await db.all(
            `SELECT r.*,
                    COALESCE(m.original_tree_threshold, w.original_tree_threshold, 10) AS original_tree_threshold,
                    (r.weight = r.original_weight) AS is_original_tree,
                    cr.product_name AS cutting_order_name,
                    u_cut.full_name AS cutting_by_name
             FROM kv_rolls r
             JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
             JOIN kv_materials m ON m.id = fc.material_id
             JOIN kv_warehouses w ON w.id = m.warehouse_id
             LEFT JOIN cutting_records cr ON cr.id = r.locked_by_cutting_id
             LEFT JOIN users u_cut ON u_cut.id = cr.cutter_id
             LEFT JOIN import_records ir ON ir.id = r.source_import_id
             WHERE r.fabric_color_id = $1 AND r.is_returned = false AND r.weight > 0
               AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)
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

    fastify.put('/api/khovai/rolls/batch', { preHandler: [authenticate] }, async (request, reply) => {
        const { roll_ids, location, reset_original_weight } = request.body || {};
        if (!Array.isArray(roll_ids) || roll_ids.length === 0) {
            return reply.code(400).send({ error: 'Danh sách cuộn vải trống hoặc không hợp lệ' });
        }

        for (const rollId of roll_ids) {
            const oldRoll = await db.get('SELECT * FROM kv_rolls WHERE id = $1', [rollId]);
            if (!oldRoll) continue;

            // Check if this is a recall (moving from partner shelf to non-partner shelf or null)
            let bypassPhoto = false;
            const currentLocName = oldRoll.location;
            if (currentLocName) {
                const currentLoc = await db.get('SELECT printing_contractor_id, name FROM kv_locations WHERE LOWER(name) = LOWER($1)', [currentLocName.trim()]);
                const isCurrentPartner = currentLoc && currentLoc.printing_contractor_id !== null;
                
                let isTargetPartner = false;
                if (location) {
                    const targetLoc = await db.get('SELECT printing_contractor_id, name FROM kv_locations WHERE LOWER(name) = LOWER($1)', [location.trim()]);
                    isTargetPartner = targetLoc && targetLoc.printing_contractor_id !== null;
                }
                
                if (isCurrentPartner && !isTargetPartner) {
                    // Check if current partner belongs to 'IN 3D - IN CẮT'
                    const is3DCutPartner = await db.get(`
                        SELECT 1 FROM printing_field_operators pfo
                        JOIN printing_fields pf ON pf.id = pfo.field_id
                        WHERE pfo.operator_type = 'contractor'
                          AND pfo.operator_id = $1
                          AND LOWER(pf.name) = 'in 3d - in cắt'
                        LIMIT 1
                    `, [currentLoc.printing_contractor_id]);
                    
                    if (is3DCutPartner) {
                        bypassPhoto = true;
                    }

                    // Check if roll has active reservations or cuts
                    const activeRes = await db.get(`
                        SELECT 1 FROM qlx_fabric_reservations
                        WHERE roll_id = $1 AND status IN ('reserved', 'arrived')
                        LIMIT 1
                    `, [rollId]);
                    const activeCut = await db.get(`
                        SELECT 1 FROM kv_rolls
                        WHERE id = $1 AND locked_by_cutting_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM cutting_records WHERE id = locked_by_cutting_id AND is_cut_done = false
                        )
                    `, [rollId]);

                    if (activeRes || activeCut) {
                        return reply.code(400).send({ error: `Không thể thu hồi cây vải ${oldRoll.roll_code || oldRoll.id} về kho công ty vì cây đang được đánh dấu hoặc đang chờ cắt cho đơn hàng!` });
                    }
                }
            }

            if (location) {
                if (oldRoll.needs_photo && !bypassPhoto) {
                    return reply.code(400).send({ error: `Cây vải ${oldRoll.roll_code || oldRoll.id} đã bị cắt thay đổi khối lượng. Bạn bắt buộc phải chụp lại ảnh thực tế mới của cây vải này trước khi xếp lên kệ!` });
                }
                const rollMat = await db.get(
                    `SELECT c.material_id
                     FROM kv_rolls r
                     JOIN kv_fabric_colors c ON r.fabric_color_id = c.id
                     WHERE r.id = $1`,
                     [rollId]
                );
                if (rollMat) {
                    const locRecord = await db.get(
                        `SELECT id, is_restricted
                         FROM kv_locations
                         WHERE LOWER(name) = LOWER($1)`,
                        [location.trim()]
                    );
                    if (locRecord && locRecord.is_restricted) {
                        const isAssigned = await db.get(
                            `SELECT COUNT(*)::int AS count
                             FROM kv_materials
                             WHERE LOWER(location) = LOWER($1) AND id = $2`,
                            [location.trim(), rollMat.material_id]
                        );
                        if (!isAssigned || isAssigned.count === 0) {
                            return reply.code(400).send({ error: `Kệ này giới hạn chất liệu khác, không thể xếp cuộn vải ${oldRoll.roll_code || rollId} này vào!` });
                        }
                    }
                }
            }

            const targetLoc = location === null ? null : (typeof location === 'string' ? location.trim() : null);
            if (reset_original_weight) {
                await db.run('UPDATE kv_rolls SET location = $1, original_weight = weight, updated_at = NOW() WHERE id = $2', [targetLoc, rollId]);
            } else {
                await db.run('UPDATE kv_rolls SET location = $1, updated_at = NOW() WHERE id = $2', [targetLoc, rollId]);
            }

            // Auto-assign material restriction to location if not yet set
            if (location) {
                const rollMat = await db.get(
                    `SELECT c.material_id
                     FROM kv_rolls r
                     JOIN kv_fabric_colors c ON r.fabric_color_id = c.id
                     WHERE r.id = $1`,
                    [rollId]
                );
                if (rollMat) {
                    const locRecord = await db.get(
                        `SELECT id, is_restricted, restricted_material_id
                         FROM kv_locations
                         WHERE LOWER(name) = LOWER($1)`,
                        [location.trim()]
                    );
                    if (locRecord && locRecord.is_restricted && !locRecord.restricted_material_id) {
                        await db.run('UPDATE kv_locations SET restricted_material_id = $1 WHERE id = $2', [rollMat.material_id, locRecord.id]);
                    }
                }
            }
        }
        return { success: true };
    });

    // PUT /api/khovai/rolls/:id — Update roll weight & location
    fastify.put('/api/khovai/rolls/:id', { preHandler: [authenticate] }, async (request) => {
        const { weight, note, is_returned, location, image_path, return_tx_id } = request.body || {};
        const user = request.user;

        const oldRoll = await db.get('SELECT * FROM kv_rolls WHERE id = $1', [request.params.id]);
        if (!oldRoll) return { error: 'Cục vải không tồn tại' };

        const updates = []; const params = []; let idx = 1;
        if (weight !== undefined) { updates.push(`weight = $${idx++}`); params.push(Number(weight)); }
        if (note !== undefined) { updates.push(`note = $${idx++}`); params.push(note); }
        if (is_returned !== undefined) { updates.push(`is_returned = $${idx++}`); params.push(is_returned); }
        if (image_path !== undefined) { updates.push(`image_path = $${idx++}`); params.push(image_path); }
        if (return_tx_id !== undefined) { updates.push(`return_tx_id = $${idx++}`); params.push(return_tx_id ? Number(return_tx_id) : null); }
        if (location !== undefined) {
            const cleanLoc = location === null ? null : (typeof location === 'string' ? location.trim() : null);

            // Check if this is a recall (moving from partner shelf to non-partner shelf or null)
            const currentLocName = oldRoll.location;
            if (currentLocName) {
                const currentLoc = await db.get('SELECT printing_contractor_id, name FROM kv_locations WHERE LOWER(name) = LOWER($1)', [currentLocName.trim()]);
                const isCurrentPartner = currentLoc && currentLoc.printing_contractor_id !== null;
                
                let isTargetPartner = false;
                if (cleanLoc) {
                    const targetLoc = await db.get('SELECT printing_contractor_id, name FROM kv_locations WHERE LOWER(name) = LOWER($1)', [cleanLoc.trim()]);
                    isTargetPartner = targetLoc && targetLoc.printing_contractor_id !== null;
                }
                
                if (isCurrentPartner && !isTargetPartner) {
                    // Check if roll has active reservations or cuts
                    const activeRes = await db.get(`
                        SELECT 1 FROM qlx_fabric_reservations
                        WHERE roll_id = $1 AND status IN ('reserved', 'arrived')
                        LIMIT 1
                    `, [oldRoll.id]);
                    const activeCut = await db.get(`
                        SELECT 1 FROM kv_rolls
                        WHERE id = $1 AND locked_by_cutting_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM cutting_records WHERE id = locked_by_cutting_id AND is_cut_done = false
                        )
                    `, [oldRoll.id]);

                    if (activeRes || activeCut) {
                        return { error: `Không thể thu hồi cây vải ${oldRoll.roll_code || oldRoll.id} về kho công ty vì cây đang được đánh dấu hoặc đang chờ cắt cho đơn hàng!` };
                    }
                }
            }

            if (cleanLoc === '📍 Kệ Dự Định Hoàn Vải') {
                if (oldRoll.location !== '📍 Kệ Dự Định Hoàn Vải') {
                    updates.push(`original_location = $${idx++}`);
                    params.push(oldRoll.location || null);
                }
            } else if (oldRoll.location === '📍 Kệ Dự Định Hoàn Vải') {
                updates.push(`original_location = NULL`);
                updates.push(`return_tx_id = NULL`);
            }

            if (cleanLoc) {
                const rollMat = await db.get(
                    `SELECT c.material_id
                     FROM kv_rolls r
                     JOIN kv_fabric_colors c ON r.fabric_color_id = c.id
                     WHERE r.id = $1`,
                    [request.params.id]
                );
                if (rollMat) {
                    const locRecord = await db.get(
                        `SELECT id, is_restricted
                         FROM kv_locations
                         WHERE LOWER(name) = LOWER($1)`,
                        [cleanLoc]
                    );
                    if (locRecord && locRecord.is_restricted) {
                        const isAssigned = await db.get(
                            `SELECT COUNT(*)::int AS count
                             FROM kv_materials
                             WHERE LOWER(location) = LOWER($1) AND id = $2`,
                            [cleanLoc, rollMat.material_id]
                        );
                        if (!isAssigned || isAssigned.count === 0) {
                            return { error: 'Kệ này giới hạn chất liệu khác, không thể xếp cuộn vải này vào!' };
                        }
                    }
                }
            }
            updates.push(`location = $${idx++}`);
            params.push(cleanLoc);

            if (cleanLoc) {
                const rollMat = await db.get(
                    `SELECT c.material_id
                     FROM kv_rolls r
                     JOIN kv_fabric_colors c ON r.fabric_color_id = c.id
                     WHERE r.id = $1`,
                    [request.params.id]
                );
                if (rollMat) {
                    const locRecord = await db.get(
                        `SELECT id, is_restricted, restricted_material_id
                         FROM kv_locations
                         WHERE LOWER(name) = LOWER($1)`,
                        [cleanLoc]
                    );
                    if (locRecord && locRecord.is_restricted && !locRecord.restricted_material_id) {
                        await db.run('UPDATE kv_locations SET restricted_material_id = $1 WHERE id = $2', [rollMat.material_id, locRecord.id]);
                    }
                }
            }
        }
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

        const isLostOrReturned = (weight !== undefined && Number(weight) === 0) || (is_returned === true && !oldRoll.is_returned);
        if (isLostOrReturned) {
            try {
                const { releaseReservationsForRoll } = require('../utils/qlx_fabric_helper');
                await releaseReservationsForRoll(request.params.id, user.id);
            } catch (e) {
                console.error('[QLX FABRIC RELEASE] Error in PUT /api/khovai/rolls/:id:', e);
            }
        } else if (weight !== undefined && Number(weight) !== Number(oldRoll.weight)) {
            try {
                const { recalculateOrderFabricStatus } = require('../utils/qlx_fabric_helper');
                const affectedOrders = await db.all('SELECT DISTINCT dht_order_id FROM qlx_fabric_reservations WHERE roll_id = $1', [request.params.id]);
                for (const ord of affectedOrders) {
                    await recalculateOrderFabricStatus(ord.dht_order_id);
                }
            } catch (e) {
                console.error('[QLX FABRIC RECALC] Error in PUT /api/khovai/rolls/:id:', e);
            }
        }

        return { success: true };
    });

    // POST /api/khovai/rolls/:id/split — Split X kg from a roll to create a new roll at a target location
    fastify.post('/api/khovai/rolls/:id/split', { preHandler: [authenticate] }, async (request, reply) => {
        const rollId = Number(request.params.id);
        const { split_weight, target_location } = request.body || {};
        const user = request.user;

        if (!split_weight || Number(split_weight) <= 0) {
            return reply.code(400).send({ error: 'Trọng lượng tách phải > 0' });
        }

        const originalRoll = await db.get('SELECT * FROM kv_rolls WHERE id = $1', [rollId]);
        if (!originalRoll) {
            return reply.code(404).send({ error: 'Cây vải không tồn tại' });
        }

        // Check if roll has active reservations or cuts
        const hasActiveRes = await db.get(`
            SELECT 1 FROM qlx_fabric_reservations
            WHERE roll_id = $1 AND status IN ('reserved', 'arrived')
            LIMIT 1
        `, [rollId]);
        const hasActiveCut = await db.get(`
            SELECT 1 FROM kv_rolls
            WHERE id = $1 AND locked_by_cutting_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM cutting_records WHERE id = locked_by_cutting_id AND is_cut_done = false
            )
        `, [rollId]);

        if (hasActiveRes || hasActiveCut) {
            return reply.code(400).send({ error: 'Không thể tách cây vải này vì cây đang được đánh dấu hoặc đang chờ cắt cho đơn hàng!' });
        }

        const currentW = Number(originalRoll.weight);
        const splitW = Number(split_weight);

        if (splitW >= currentW) {
            return reply.code(400).send({ error: `Trọng lượng tách phải nhỏ hơn trọng lượng hiện tại của cây (${currentW} kg)` });
        }

        const newWeight = currentW - splitW;
        const cleanLoc = target_location === null ? null : (typeof target_location === 'string' ? target_location.trim() : null);

        // Validate target location constraints (restricted material)
        if (cleanLoc) {
            const locRecord = await db.get(
                `SELECT id, is_restricted, restricted_material_id
                 FROM kv_locations
                 WHERE LOWER(name) = LOWER($1)`,
                [cleanLoc]
            );
            if (locRecord && locRecord.is_restricted) {
                const rollMat = await db.get(
                    `SELECT c.material_id
                     FROM kv_rolls r
                     JOIN kv_fabric_colors c ON r.fabric_color_id = c.id
                     WHERE r.id = $1`,
                    [rollId]
                );
                if (rollMat) {
                    const isAssigned = await db.get(
                        `SELECT COUNT(*)::int AS count
                         FROM kv_materials
                         WHERE LOWER(location) = LOWER($1) AND id = $2`,
                        [cleanLoc, rollMat.material_id]
                    );
                    if (!isAssigned || isAssigned.count === 0) {
                        return reply.code(400).send({ error: 'Kệ này giới hạn chất liệu khác, không thể xếp cuộn vải này vào!' });
                    }

                    // Auto assign material to restricted shelf if not set
                    if (!locRecord.restricted_material_id) {
                        await db.run('UPDATE kv_locations SET restricted_material_id = $1 WHERE id = $2', [rollMat.material_id, locRecord.id]);
                    }
                }
            }
        }

        // Generate split roll code
        const shortRand = crypto.randomBytes(2).toString('hex').toUpperCase();
        const newCode = `${originalRoll.roll_code}-T${shortRand}`;

        // 1. Update original roll weight
        await db.run(
            `UPDATE kv_rolls SET weight = $1, updated_at = NOW() WHERE id = $2`,
            [newWeight, rollId]
        );

        // 2. Log XUAT transaction for original roll
        await db.run(
            `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
             VALUES ($1, 'XUAT', $2, $3, $4)`,
            [originalRoll.fabric_color_id, splitW, `Tách chiết ${splitW}kg sang cây mới ${newCode} để thu hồi`, user.id]
        );

        // 3. Create new roll
        const newRoll = await db.get(
            `INSERT INTO kv_rolls (fabric_color_id, roll_code, weight, original_weight, source, note, created_by, location, source_import_id)
             VALUES ($1, $2, $3, $3, 'cat_du', $4, $5, $6, $7) RETURNING *`,
            [originalRoll.fabric_color_id, newCode, splitW, `Tách chiết từ cây ${originalRoll.roll_code}`, user.id, cleanLoc, originalRoll.source_import_id]
        );

        // 4. Log NHAP transaction for new roll
        await db.run(
            `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by)
             VALUES ($1, 'NHAP', $2, $3, $4)`,
            [originalRoll.fabric_color_id, splitW, `Tách chiết thu hồi ${splitW}kg từ cây gốc ${originalRoll.roll_code}`, user.id]
        );

        // 5. Self-Healing reservations
        let remainingCapacity = newWeight;
        const activeRes = await db.all(`
            SELECT id, kg_reserved, dht_order_id
            FROM qlx_fabric_reservations
            WHERE roll_id = $1 AND status IN ('reserved', 'arrived')
            ORDER BY id ASC
        `, [rollId]);

        const affectedOrderIds = new Set();
        for (const res of activeRes) {
            affectedOrderIds.add(res.dht_order_id);
            const kg = Number(res.kg_reserved);
            if (remainingCapacity <= 0) {
                await db.run("UPDATE qlx_fabric_reservations SET status = 'released', updated_at = NOW() WHERE id = $1", [res.id]);
                await db.run(`
                    INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                    VALUES ($1, 'fabric_release', $2, $3, NOW())
                `, [res.dht_order_id, `Tự động hủy giữ phần vải vượt quá trọng lượng còn lại của cây do tách/cắt thu hồi`, user.id]);
            } else if (kg > remainingCapacity) {
                await db.run("UPDATE qlx_fabric_reservations SET kg_reserved = $1, updated_at = NOW() WHERE id = $2", [remainingCapacity, res.id]);
                await db.run(`
                    INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                    VALUES ($1, 'fabric_reserve_update', $2, $3, NOW())
                `, [res.dht_order_id, `Tự động giảm khối lượng giữ vải từ ${kg}kg xuống ${remainingCapacity}kg do tách/cắt thu hồi`, user.id]);
                remainingCapacity = 0;
            } else {
                remainingCapacity -= kg;
            }
        }

        // 6. Recalculate preparation statuses
        try {
            const { recalculateOrderFabricStatus } = require('../utils/qlx_fabric_helper');
            for (const orderId of affectedOrderIds) {
                await recalculateOrderFabricStatus(orderId);
            }
        } catch (e) {
            console.error('[QLX FABRIC RECALC SPLIT] Error:', e);
        }

        return { success: true, original_weight: newWeight, new_roll: newRoll };
    });

    // POST /api/khovai/rolls/:id/upload-image — Upload roll image (base64)
    fastify.post('/api/khovai/rolls/:id/upload-image', { preHandler: [authenticate] }, async (request, reply) => {
        const rollId = Number(request.params.id);
        const { image_data } = request.body || {};
        if (!image_data) return reply.code(400).send({ error: 'Thiếu dữ liệu ảnh' });

        const roll = await db.get('SELECT id, weight FROM kv_rolls WHERE id = $1', [rollId]);
        if (!roll) return reply.code(404).send({ error: 'Cục vải không tồn tại' });

        try {
            const { compressImage } = require('../utils/imageCompressor');
            const matches = image_data.match(/^data:image\/(\w+);base64,(.+)$/);
            if (!matches) return reply.code(400).send({ error: 'Định dạng ảnh không hợp lệ' });
            let buffer = Buffer.from(matches[2], 'base64');

            // Max 10MB raw (will be compressed)
            if (buffer.length > 10 * 1024 * 1024) return reply.code(400).send({ error: 'Ảnh quá lớn (tối đa 10MB)' });

            // Compress: resize to 800px max, webp format, quality 75%
            const compressed = await compressImage(buffer, { maxWidth: 800, quality: 75, format: 'webp' });

            const uploadDir = path.join(__dirname, '..', 'uploads', 'khovai');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            const fileName = `roll_${rollId}_${Date.now()}.webp`;
            fs.writeFileSync(path.join(uploadDir, fileName), compressed.buffer);
            const imagePath = `/uploads/khovai/${fileName}`;

            await db.run('UPDATE kv_rolls SET image_path = $1, needs_photo = false, updated_at = NOW() WHERE id = $2', [imagePath, rollId]);
            await db.run('INSERT INTO kv_roll_images (roll_id, image_path, weight, created_at) VALUES ($1, $2, $3, NOW())', [rollId, imagePath, Number(roll.weight) || 0]);

            return { success: true, image_path: imagePath };
        } catch (e) {
            console.error('[KhoVai] Image upload error:', e.message);
            return reply.code(500).send({ error: 'Lưu ảnh thất bại: ' + e.message });
        }
    });

    // POST /api/khovai/rolls/:id/image — Upload roll image (multipart FormData)
    fastify.post('/api/khovai/rolls/:id/image', { preHandler: [authenticate] }, async (request, reply) => {
        const rollId = Number(request.params.id);
        const roll = await db.get('SELECT id, weight FROM kv_rolls WHERE id = $1', [rollId]);
        if (!roll) return reply.code(404).send({ error: 'Cục vải không tồn tại' });

        try {
            const parts = request.parts();
            const uploadDir = path.join(__dirname, '..', 'uploads', 'khovai');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            let imagePath = null;

            for await (const part of parts) {
                if (part.file) {
                    const { compressImage } = require('../utils/imageCompressor');
                    const chunks = [];
                    for await (const chunk of part.file) {
                        chunks.push(chunk);
                    }
                    let fileBuffer = Buffer.concat(chunks);

                    // Max 10MB raw
                    if (fileBuffer.length > 10 * 1024 * 1024) {
                        return reply.code(400).send({ error: 'Ảnh quá lớn (tối đa 10MB)' });
                    }

                    // Compress: resize to 800px max, webp format, quality 75%
                    const compressed = await compressImage(fileBuffer, { maxWidth: 800, quality: 75, format: 'webp' });

                    const fileName = `roll_${rollId}_${Date.now()}.webp`;
                    fs.writeFileSync(path.join(uploadDir, fileName), compressed.buffer);
                    imagePath = `/uploads/khovai/${fileName}`;
                }
            }

            if (!imagePath) {
                return reply.code(400).send({ error: 'Thiếu dữ liệu ảnh hoặc không tìm thấy file' });
            }

            await db.run('UPDATE kv_rolls SET image_path = $1, needs_photo = false, updated_at = NOW() WHERE id = $2', [imagePath, rollId]);
            await db.run('INSERT INTO kv_roll_images (roll_id, image_path, weight, created_at) VALUES ($1, $2, $3, NOW())', [rollId, imagePath, Number(roll.weight) || 0]);

            return { success: true, image_path: imagePath };
        } catch (e) {
            console.error('[KhoVai] Multipart image upload error:', e.message);
            return reply.code(500).send({ error: 'Lưu ảnh thất bại: ' + e.message });
        }
    });

    // GET /api/khovai/rolls/:id/images — Get roll photo history
    fastify.get('/api/khovai/rolls/:id/images', { preHandler: [authenticate] }, async (request) => {
        const rollId = Number(request.params.id);
        const images = await db.all(
            `SELECT image_path, weight, created_at
             FROM kv_roll_images
             WHERE roll_id = $1
             ORDER BY created_at DESC`,
            [rollId]
        );
        return { images };
    });

    // DELETE /api/khovai/rolls/:id — Delete roll + log XUAT
    fastify.delete('/api/khovai/rolls/:id', { preHandler: [authenticate] }, async (request) => {
        const user = request.user;
        const roll = await db.get('SELECT * FROM kv_rolls WHERE id = $1', [request.params.id]);
        if (!roll) return { error: 'Cục vải không tồn tại' };

        // Release reservations first, which will also recalculate affected orders
        try {
            const { releaseReservationsForRoll } = require('../utils/qlx_fabric_helper');
            await releaseReservationsForRoll(request.params.id, user.id);
        } catch (e) {
            console.error('[QLX FABRIC DELETE RELEASE] Error in DELETE /api/khovai/rolls/:id:', e);
        }

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
            `SELECT COUNT(*)::int AS total FROM kv_rolls r
             LEFT JOIN import_records ir ON ir.id = r.source_import_id
             WHERE r.fabric_color_id = $1 AND r.is_returned = false AND r.weight = 0
               AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)`,
            [fcid]
        );
        const total = countRow ? countRow.total : 0;

        const rolls = await db.all(
            `SELECT r.*,
                    u.full_name AS created_by_name
             FROM kv_rolls r
             LEFT JOIN users u ON u.id = r.created_by
             LEFT JOIN import_records ir ON ir.id = r.source_import_id
             WHERE r.fabric_color_id = $1 AND r.is_returned = false AND r.weight = 0
               AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)
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
                    u_cut.full_name AS cutting_by_name,
                    (SELECT session_id FROM stockcheck_session_items WHERE roll_id = r.id ORDER BY session_id DESC LIMIT 1) AS stockcheck_session_id
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

        if (roll.source_import_id) {
            const ir = await db.get('SELECT requires_price_approval, price_approved_at FROM import_records WHERE id = $1', [roll.source_import_id]);
            if (ir && ir.requires_price_approval && !ir.price_approved_at) {
                return { error: 'Cuộn vải này chưa được phê duyệt đơn giá nhập gốc' };
            }
        }

        if (!roll.source_import_id && roll.note && roll.note.startsWith('Nhập vải từ bill ')) {
            const code = roll.note.replace('Nhập vải từ bill ', '').trim();
            const imp = await db.get('SELECT id FROM import_records WHERE fabric_import_code = $1', [code]);
            if (imp) {
                roll.source_import_id = imp.id;
                await db.run('UPDATE kv_rolls SET source_import_id = $1 WHERE id = $2', [imp.id, roll.id]);
                const ir = await db.get('SELECT requires_price_approval, price_approved_at FROM import_records WHERE id = $1', [imp.id]);
                if (ir && ir.requires_price_approval && !ir.price_approved_at) {
                    return { error: 'Cuộn vải này chưa được phê duyệt đơn giá nhập gốc' };
                }
            }
        }

        // Cut history from cutting_records
        const cutHistory = await db.all(
            `SELECT cr.id AS cutting_record_id, cr.cut_date, cr.product_name,
                    cr.order_quantity, cr.cut_quantity, cr.kg_cut, cr.selected_roll_ids,
                    u.full_name AS cutter_name
             FROM cutting_records cr
             LEFT JOIN users u ON u.id = cr.cutter_id
             WHERE cr.is_cut_done = true
               AND cr.selected_roll_ids @> jsonb_build_array(jsonb_build_object('roll_id', $1::int))
             ORDER BY cr.cut_date DESC`, [request.params.id]
        );

        const targetRollId = Number(request.params.id);
        const mappedHistory = cutHistory.map(cr => {
            let rollKgCut = Number(cr.kg_cut);

            if (cr.selected_roll_ids) {
                let rolls = [];
                try {
                    rolls = typeof cr.selected_roll_ids === 'string' ? JSON.parse(cr.selected_roll_ids) : (cr.selected_roll_ids || []);
                } catch(e) {}

                const rollObj = rolls.find(r => Number(r.roll_id) === targetRollId);
                if (rollObj) {
                    if (rollObj.kg_cut !== undefined && rollObj.kg_cut !== null) {
                        rollKgCut = Number(rollObj.kg_cut);
                    } else if (rollObj.kg_used !== undefined && rollObj.kg_used !== null) {
                        rollKgCut = Number(rollObj.kg_used);
                    } else if (rolls.length > 1) {
                        // Proportional fallback for older multi-roll records
                        const totalStartWeight = rolls.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
                        if (totalStartWeight > 0) {
                            const ratio = (Number(rollObj.weight) || 0) / totalStartWeight;
                            rollKgCut = Number(cr.kg_cut) * ratio;
                        }
                    }
                }
            }

            rollKgCut = Math.round(rollKgCut * 100) / 100;

            return {
                cutting_record_id: cr.cutting_record_id,
                cut_date: cr.cut_date,
                product_name: cr.product_name,
                order_quantity: cr.order_quantity,
                cut_quantity: cr.cut_quantity,
                kg_cut: rollKgCut,
                cutter_name: cr.cutter_name
            };
        });

        return { roll, cutHistory: mappedHistory };
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

        // 1. Fetch fabric color details to get material and color name for matching cuts/nx
        const colorInfo = await db.get(
            `SELECT fc.color_name, m.name AS material_name
             FROM kv_fabric_colors fc
             JOIN kv_materials m ON m.id = fc.material_id
             WHERE fc.id = $1`,
            [fcid]
        );
        if (!colorInfo) return { history: [] };
        const colorName = (colorInfo.color_name || '').trim();
        const materialName = (colorInfo.material_name || '').trim();

        // 2. Fetch direct warehouse transactions (kv_transactions)
        const kvTx = await db.all(
            `SELECT t.tx_type, t.quantity, t.description, t.created_at,
                    u.full_name AS created_by_name, u.role AS created_by_role
             FROM kv_transactions t
             LEFT JOIN users u ON u.id = t.created_by
             WHERE t.fabric_color_id = $1`,
            [fcid]
        );

        // 3. Fetch completed cuts (cutting_records)
        const cuts = await db.all(
            `SELECT cr.product_name, cr.cut_quantity, cr.kg_cut AS quantity,
                    COALESCE(cr.cut_done_at, cr.updated_at, cr.created_at) AS created_at,
                    u.full_name AS created_by_name, u.role AS created_by_role
             FROM cutting_records cr
             LEFT JOIN users u ON u.id = cr.cut_done_by
             WHERE cr.is_cut_done = true
               AND TRIM(cr.material_name) ILIKE $1
               AND TRIM(cr.fabric_color) ILIKE $2`,
            [materialName, colorName]
        );

        // 4. Fetch returns, KK, and external transactions (fabric_transactions)
        const externalTx = await db.all(
            `SELECT ft.tx_type, ft.total_quantity AS quantity, ft.notes AS description, ft.is_approved,
                    COALESCE(ft.approved_at, ft.created_at) AS created_at,
                    u.full_name AS created_by_name, u.role AS created_by_role
             FROM fabric_transactions ft
             LEFT JOIN users u ON u.id = COALESCE(ft.approved_by, ft.created_by)
             WHERE TRIM(ft.material_name) ILIKE $1
               AND TRIM(ft.color_name) ILIKE $2`,
            [materialName, colorName]
        );

        // 5. Merge all history logs
        const merged = [];

        // Add kv_transactions
        for (const t of kvTx) {
            merged.push({
                created_at: t.created_at,
                tx_type: t.tx_type,
                quantity: Number(t.quantity),
                description: t.description || '',
                created_by_name: t.created_by_name || '—'
            });
        }

        // Add completed cutting records
        for (const c of cuts) {
            merged.push({
                created_at: c.created_at,
                tx_type: 'CAT',
                quantity: Number(c.quantity),
                description: `Cắt đơn hàng: ${c.product_name || '—'} (SL: ${c.cut_quantity || 0} cái)`,
                created_by_name: c.created_by_name || '—'
            });
        }

        // Add external fabric transactions
        const TX_LABELS = { HOAN: 'Hoàn', NHAP_KK: 'Nhập Kiểm Kê', XUAT_KK: 'Xuất Kiểm Kê', NHAP: 'Nhập Vải', XUAT: 'Xuất Vải' };
        for (const ft of externalTx) {
            let label = TX_LABELS[ft.tx_type] || ft.tx_type;
            let desc = ft.description || '';
            if (ft.is_approved === false) {
                desc = '[Chờ duyệt] ' + desc;
            }
            merged.push({
                created_at: ft.created_at,
                tx_type: ft.tx_type,
                quantity: Number(ft.quantity),
                description: `[NXHV ${label}] ${desc}`.trim(),
                created_by_name: ft.created_by_name || '—'
            });
        }

        // Sort descending by created_at
        merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const page = Math.max(1, Number(request.query.page) || 1);
        const limit = Math.max(1, Number(request.query.limit) || 20);
        const offset = (page - 1) * limit;

        const total = merged.length;
        const sliced = merged.slice(offset, offset + limit);

        return { history: sliced, total, page, limit };
    });

    // ========== SUMMARY (Bảng chính) ==========

    // GET /api/khovai/summary?wid=&mid= — Main table data
    fastify.get('/api/khovai/summary', { preHandler: [authenticate] }, async (request) => {
        const { wid, mid } = request.query;
        let sql = `
            SELECT fc.id, fc.color_name, fc.price, fc.is_active, fc.allowed_slips, fc.allowed_import_slips, fc.pending_stop_active,
                   COALESCE(m.original_tree_threshold, w.original_tree_threshold, 10) AS original_tree_threshold,
                   fc.notes, fc.material_id, fc.updated_at,
                   fc.stop_import AS color_stop_import, m.stop_import AS material_stop_import,
                   m.name AS material_name, m.warehouse_id,
                   w.name AS warehouse_name, w.unit,
                   fc.location AS color_location,
                   m.location AS material_location,
                   COALESCE(NULLIF(fc.location, ''), NULLIF(m.location, '')) AS location,
                   COALESCE((SELECT SUM(t.quantity) FROM kv_transactions t
                             WHERE t.fabric_color_id = fc.id AND t.tx_type = 'NHAP'), 0) AS dau_ky,
                   GREATEST(0, COALESCE((SELECT SUM(t.quantity) FROM kv_transactions t
                             WHERE t.fabric_color_id = fc.id AND t.tx_type = 'NHAP'), 0) - COALESCE((SELECT SUM(r.weight) FROM kv_rolls r
                             LEFT JOIN import_records ir ON ir.id = r.source_import_id
                             WHERE r.fabric_color_id = fc.id AND r.is_returned = false
                               AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)), 0)) AS xuat,
                    COALESCE((SELECT SUM(r.weight) FROM kv_rolls r
                              LEFT JOIN import_records ir ON ir.id = r.source_import_id
                              WHERE r.fabric_color_id = fc.id AND r.is_returned = false
                                AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)), 0) AS cuoi_ky,
                   COALESCE((SELECT COUNT(*) FROM kv_rolls r
                             LEFT JOIN import_records ir ON ir.id = r.source_import_id
                             WHERE r.fabric_color_id = fc.id AND r.is_returned = false AND r.weight > 0
                               AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)), 0) AS so_cuc,
                   COALESCE((SELECT COUNT(*) FROM kv_rolls r
                             LEFT JOIN import_records ir ON ir.id = r.source_import_id
                             WHERE r.fabric_color_id = fc.id AND r.is_returned = false
                               AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)
                             AND r.weight = r.original_weight), 0) AS cay_nguyen,
                         COALESCE((
                        SELECT json_agg(json_build_object(
                            'id', r.id,
                            'w', r.weight,
                            'ow', r.original_weight,
                            'loc', r.location,
                            'code', r.roll_code,
                            'img', r.image_path,
                            'needs_photo', COALESCE(r.needs_photo, false),
                            'return_requested', COALESCE(r.return_requested, false),
                            'locked_by_cutting_id', r.locked_by_cutting_id,
                            'source_import_id', r.source_import_id,
                            'return_tx_id', r.return_tx_id,
                            'import_price', COALESCE((
                                SELECT COALESCE(NULLIF(elem->>'unit_price', ''), '0')::numeric
                                FROM import_records ir,
                                jsonb_array_elements(ir.fabric_items) AS elem
                                WHERE ir.id = r.source_import_id
                                  AND elem->'roll_ids_created' @> jsonb_build_array(r.id)
                                LIMIT 1
                            ), fc.price, 0),
                            'source_name', (
                                SELECT s.name FROM import_records ir
                                LEFT JOIN import_sources s ON ir.source_id = s.id
                                WHERE ir.id = r.source_import_id
                            ),
                            'active_cut', (
                                SELECT json_build_object(
                                    'id', cr.id,
                                    'product_name', cr.product_name,
                                    'order_code', o.order_code,
                                    'is_cut_done', cr.is_cut_done,
                                    'phoi_index', COALESCE(cr.phoi_index, 0),
                                    'item_index', COALESCE((SELECT COUNT(*)::int FROM dht_order_items it2 WHERE it2.dht_order_id = cr.dht_order_id AND it2.id <= cr.order_item_id), 1)
                                )
                                FROM cutting_records cr
                                LEFT JOIN dht_orders o ON o.id = cr.dht_order_id
                                WHERE cr.id = r.locked_by_cutting_id AND cr.is_cut_done = false
                            ),
                            'active_cuts', (
                                SELECT json_agg(json_build_object(
                                    'id', cr2.id,
                                    'product_name', cr2.product_name,
                                    'order_code', o2.order_code,
                                    'is_cut_done', cr2.is_cut_done,
                                    'phoi_index', COALESCE(cr2.phoi_index, 0),
                                    'item_index', COALESCE((SELECT COUNT(*)::int FROM dht_order_items it3 WHERE it3.dht_order_id = cr2.dht_order_id AND it3.id <= cr2.order_item_id), 1)
                                ) ORDER BY cr2.id)
                                FROM cutting_records cr
                                LEFT JOIN cutting_records cr2 ON (
                                    cr2.id = cr.id OR 
                                    (cr.multi_cut_group_id IS NOT NULL AND cr2.multi_cut_group_id = cr.multi_cut_group_id)
                                )
                                LEFT JOIN dht_orders o2 ON o2.id = cr2.dht_order_id
                                WHERE cr.id = r.locked_by_cutting_id AND cr.is_cut_done = false AND cr2.is_cut_done = false
                            ),
                            'active_reservations', (
                                SELECT json_agg(json_build_object(
                                    'order_id', res.dht_order_id,
                                    'order_code', o.order_code,
                                    'status', res.status,
                                    'res_id', res.id,
                                    'phoi_index', COALESCE(res.phoi_index, 0),
                                    'item_index', COALESCE((SELECT COUNT(*)::int FROM dht_order_items it2 WHERE it2.dht_order_id = res.dht_order_id AND it2.id <= res.item_id), 1),
                                    'target_shelf', (
                                         SELECT loc.name 
                                         FROM qlx_order_print_assignments pa
                                         JOIN printing_fields pf ON pa.field_id = pf.id
                                         JOIN kv_locations loc ON (
                                             (loc.printing_contractor_id = pa.operator_id AND pa.operator_type = 'contractor')
                                             OR (loc.user_id = pa.operator_id AND pa.operator_type = 'user')
                                         )
                                         WHERE (pa.item_id = res.item_id
                                            OR (pa.dht_order_id = res.dht_order_id AND pa.item_id IS NULL AND NOT EXISTS (
                                                SELECT 1 FROM qlx_order_print_assignments pa2 WHERE pa2.item_id = res.item_id
                                            )))
                                           AND (LOWER(pf.name) LIKE '%3d%' OR LOWER(pf.name) LIKE '%cắt%')
                                           AND LOWER(pf.name) NOT LIKE '%hv cắt%'
                                         LIMIT 1
                                     )
                                ))
                                FROM qlx_fabric_reservations res
                                LEFT JOIN dht_orders o ON o.id = res.dht_order_id
                                WHERE res.roll_id = r.id AND res.status IN ('reserved', 'arrived')
                            )
                        ) ORDER BY r.weight DESC)
                        FROM kv_rolls r
                        LEFT JOIN import_records ir ON ir.id = r.source_import_id
                        WHERE r.fabric_color_id = fc.id AND r.is_returned = false AND r.weight > 0
                          AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)
                    ), '[]') AS roll_weights,
                    (
                       SELECT json_agg(json_build_object(
                           'id', 'call_' || res.id,
                           'w', COALESCE(res.call_amount, 0),
                           'ow', 0,
                           'loc', 'Chờ về',
                           'code', 'Yêu cầu gọi vải (' || COALESCE(res.call_trees, 0) || ' cây)',
                           'is_called', true,
                           'active_reservations', (
                               SELECT json_agg(json_build_object(
                                   'order_id', r_all.dht_order_id,
                                   'order_code', o_all.order_code,
                                   'status', r_all.status,
                                   'res_id', r_all.id,
                                   'phoi_index', COALESCE(r_all.phoi_index, 0),
                                   'item_index', COALESCE((SELECT COUNT(*)::int FROM dht_order_items it2 WHERE it2.dht_order_id = r_all.dht_order_id AND it2.id <= r_all.item_id), 1)
                                ))
                                FROM qlx_fabric_reservations r_all
                                JOIN dht_orders o_all ON o_all.id = r_all.dht_order_id
                                WHERE (r_all.id = res.id OR r_all.linked_call_id = res.id)
                                  AND r_all.status = 'reserved'
                            )
                       ))
                       FROM qlx_fabric_reservations res
                       LEFT JOIN dht_orders o ON o.id = res.dht_order_id
                       WHERE res.roll_id IS NULL
                         AND res.status = 'reserved'
                         AND res.reservation_type = 'new_call'
                         AND UPPER(res.material_name) = UPPER(m.name)
                         AND UPPER(res.color_name) = UPPER(fc.color_name)
                    ) AS pending_calls
            FROM kv_fabric_colors fc
            JOIN kv_materials m ON m.id = fc.material_id
            JOIN kv_warehouses w ON w.id = m.warehouse_id
            WHERE m.is_active = true AND w.is_active = true
        `;
        const params = [];
        let idx = 1;
        if (wid) { sql += ` AND w.id = $${idx++}`; params.push(wid); }
        if (mid) { sql += ` AND m.id = $${idx++}`; params.push(mid); }
        sql += ' ORDER BY m.display_order, m.name, (CASE WHEN fc.stop_import = true OR fc.is_active = false THEN 0 ELSE 1 END) ASC, fc.color_name';

        const rows = await db.all(sql, params);

        // Fetch active uncut order items
        const otherItems = await db.all(`
            SELECT oi.id, oi.dht_order_id, oi.quantity, oi.product_name, oi.material_id, oi.color_id, oi.material_pairs,
                   o.order_code,
                   cc.name AS cutting_category_name
            FROM dht_order_items oi
            JOIN dht_orders o ON o.id = oi.dht_order_id
            LEFT JOIN cutting_records cr ON cr.order_item_id = oi.id
            LEFT JOIN order_codes oc ON oc.order_code = o.order_code
            LEFT JOIN customers cust ON cust.id = o.customer_id
            LEFT JOIN dht_products p ON p.name = oi.product_name AND p.is_active = true
            LEFT JOIN dht_settings_options cc ON cc.id = p.cutting_category_id
            WHERE (cr.id IS NULL OR cr.is_cut_done = false)
              AND (oc.id IS NULL OR oc.status <> 'cancelled')
              AND (cust.id IS NULL OR cust.order_status <> 'da_huy_don_tra_coc')
        `);

        // Fetch target ratios
        const ratioRows = await db.all(`
            SELECT material_id, cutting_category, target_ratio
            FROM kv_material_cutting_targets
        `);
        const ratioMap = {};
        for (const row of ratioRows) {
            const cat = (row.cutting_category || '').trim();
            ratioMap[row.material_id + '_' + cat] = Number(row.target_ratio) || 0;
        }

        // Fetch consumed slips
        const slipRows = await db.all(`
            SELECT order_id, color_id FROM kv_order_consumed_slips
        `);
        const slipSet = new Set();
        for (const row of slipRows) {
            slipSet.add(row.order_id + '_' + row.color_id);
        }

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

            if (r.pending_calls && typeof r.pending_calls === 'string') {
                try { r.pending_calls = JSON.parse(r.pending_calls); } catch(e) { r.pending_calls = []; }
            }
            if (!Array.isArray(r.pending_calls)) r.pending_calls = [];

            // Calculate held orders if stopped from importing
            r.held_orders = [];
            if (r.color_stop_import || r.material_stop_import) {
                const orderGroups = {};
                for (const oi of otherItems) {
                    let matches = false;
                    if (Number(oi.color_id) === Number(r.id)) {
                        matches = true;
                    } else if (oi.material_pairs) {
                        let pairs = [];
                        try {
                            pairs = typeof oi.material_pairs === 'string' ? JSON.parse(oi.material_pairs) : oi.material_pairs;
                        } catch (e) {}
                        if (Array.isArray(pairs) && pairs.some(p => Number(p.color_id) === Number(r.id))) {
                            matches = true;
                        }
                    }

                    if (!matches) continue;

                    // Skip if a slip has been consumed for this order and color
                    if (slipSet.has(oi.dht_order_id + '_' + r.id)) {
                        continue;
                    }

                    const oiMatId = Number(oi.material_id);
                    const oiCutCat = (oi.cutting_category_name || '').trim();
                    const ratio = ratioMap[oiMatId + '_' + oiCutCat] || 0;

                    const orderCode = oi.order_code || `Đơn #${oi.dht_order_id}`;
                    if (!orderGroups[orderCode]) {
                        orderGroups[orderCode] = { qty: 0, weight: 0, hasRatio: false };
                    }

                    const itemQty = Number(oi.quantity) || 0;
                    orderGroups[orderCode].qty += itemQty;
                    if (ratio > 0) {
                        orderGroups[orderCode].weight += itemQty / ratio;
                        orderGroups[orderCode].hasRatio = true;
                    }
                }

                for (const code in orderGroups) {
                    const grp = orderGroups[code];
                    let displayText = '';
                    if (grp.hasRatio && grp.weight > 0) {
                        displayText = `${code} giữ ${parseFloat(grp.weight.toFixed(2))} ${r.unit}`;
                    } else {
                        displayText = `${code} giữ ${grp.qty} sp (chưa cấu hình tỉ lệ)`;
                    }
                    r.held_orders.push({
                        order_code: code,
                        qty: grp.qty,
                        weight: grp.weight,
                        has_ratio: grp.hasRatio,
                        display_text: displayText
                    });
                }

                r.held_orders.sort((a, b) => a.order_code.localeCompare(b.order_code));
            }
        });

        return { summary: rows };
    });

    // ========== SIDEBAR TREE ==========

    // GET /api/khovai/tree — Sidebar tree data
    fastify.get('/api/khovai/tree', { preHandler: [authenticate] }, async (request) => {
        const warehouses = await db.all(`
            SELECT w.id, w.name, w.unit, w.display_order,
                   COALESCE((
                       SELECT SUM(r.weight)
                       FROM kv_rolls r
                       JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                       JOIN kv_materials mat ON mat.id = fc.material_id
                       LEFT JOIN import_records ir ON ir.id = r.source_import_id
                       WHERE mat.warehouse_id = w.id AND mat.is_active = true AND r.is_returned = false
                         AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)
                   ), 0) AS total_balance,
                   COALESCE((
                       SELECT COUNT(r.id)
                       FROM kv_rolls r
                       JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                       JOIN kv_materials mat ON mat.id = fc.material_id
                       LEFT JOIN import_records ir ON ir.id = r.source_import_id
                       WHERE mat.warehouse_id = w.id AND mat.is_active = true AND r.is_returned = false AND r.weight > 0
                         AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)
                   ), 0)::int AS total_rolls
            FROM kv_warehouses w
            WHERE w.is_active = true
            ORDER BY w.display_order, w.id
        `);

        for (const w of warehouses) {
            w.materials = await db.all(`
                SELECT m.id, m.name, m.display_order, m.stop_import,
                       COALESCE((
                           SELECT SUM(r.weight)
                           FROM kv_rolls r
                           JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                           LEFT JOIN import_records ir ON ir.id = r.source_import_id
                           WHERE fc.material_id = m.id AND r.is_returned = false
                             AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)
                       ), 0) AS total_balance,
                       COALESCE((
                           SELECT COUNT(r.id)
                           FROM kv_rolls r
                           JOIN kv_fabric_colors fc ON fc.id = r.fabric_color_id
                           LEFT JOIN import_records ir ON ir.id = r.source_import_id
                           WHERE fc.material_id = m.id AND r.is_returned = false AND r.weight > 0
                             AND (r.source_import_id IS NULL OR ir.id IS NULL OR ir.requires_price_approval = false OR ir.price_approved_at IS NOT NULL)
                       ), 0)::int AS total_rolls
                FROM kv_materials m
                WHERE m.warehouse_id = $1 AND m.is_active = true
                ORDER BY m.display_order, m.name
            `, [w.id]);
        }

        return { tree: warehouses };
    });

    // ========== TOGGLE (Bật/Tắt) ==========

    // PUT /api/khovai/materials/:id/toggle — Toggle material + cascade to all colors
    fastify.put('/api/khovai/materials/:id/toggle', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isGdOrTrinh(request.user)) {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc quản lý Lê Việt Trinh mới có quyền ẩn/bán chất liệu!' });
        }
        const { is_active } = request.body || {};
        await db.run('UPDATE kv_materials SET is_active = $1, updated_at = NOW() WHERE id = $2', [!!is_active, request.params.id]);
        // Cascade: toggle all colors in this material
        await db.run('UPDATE kv_fabric_colors SET is_active = $1, updated_at = NOW() WHERE material_id = $2', [!!is_active, request.params.id]);
        return { success: true };
    });

    // PUT /api/khovai/colors/:id/toggle — Toggle color is_active
    fastify.put('/api/khovai/colors/:id/toggle', { preHandler: [authenticate] }, async (request, reply) => {
        if (!isGdOrTrinh(request.user)) {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc quản lý Lê Việt Trinh mới có quyền ẩn/bán màu vải!' });
        }
        const { is_active, allowed_slips, pending_stop_active } = request.body || {};
        const color = await db.get('SELECT stop_import, allowed_import_slips FROM kv_fabric_colors WHERE id = $1', [request.params.id]);
        if (!color) {
            return reply.code(404).send({ error: 'Không tìm thấy màu vải!' });
        }
        if ((allowed_slips === undefined || allowed_slips === null) && (color.stop_import || color.allowed_import_slips !== null)) {
            return reply.code(400).send({ error: 'Màu vải đang ở trạng thái dừng nhập hoặc giới hạn nhập. Vui lòng mở nhập vĩnh viễn trước khi thay đổi trạng thái bán!' });
        }

        if (is_active) {
            let parsedSlips = null;
            if (allowed_slips !== undefined && allowed_slips !== null) {
                const val = parseInt(allowed_slips, 10);
                if (!isNaN(val) && val >= 0) {
                    parsedSlips = val;
                }
            }
            await db.run('UPDATE kv_fabric_colors SET is_active = true, pending_stop_active = false, allowed_slips = $1, updated_at = NOW() WHERE id = $2', [parsedSlips, request.params.id]);
        } else {
            // Check for active uncut orders first
            const otherItems = await db.all(`
                SELECT oi.id, oi.dht_order_id, oi.quantity, oi.product_name, oi.material_id, oi.color_id, oi.material_pairs,
                       o.order_code
                FROM dht_order_items oi
                JOIN dht_orders o ON o.id = oi.dht_order_id
                LEFT JOIN cutting_records cr ON cr.order_item_id = oi.id
                LEFT JOIN order_codes oc ON oc.order_code = o.order_code
                LEFT JOIN customers cust ON cust.id = o.customer_id
                WHERE (cr.id IS NULL OR cr.is_cut_done = false)
                  AND (oc.id IS NULL OR oc.status <> 'cancelled')
                  AND (cust.id IS NULL OR cust.order_status <> 'da_huy_don_tra_coc')
            `);

            const colId = Number(request.params.id);
            const uncutOrders = [];
            for (const oi of otherItems) {
                let matches = false;
                if (Number(oi.color_id) === colId) {
                    matches = true;
                } else if (oi.material_pairs) {
                    let pairs = [];
                    try {
                        pairs = typeof oi.material_pairs === 'string' ? JSON.parse(oi.material_pairs) : oi.material_pairs;
                    } catch (e) {}
                    if (Array.isArray(pairs) && pairs.some(p => Number(p.color_id) === colId)) {
                        matches = true;
                    }
                }
                if (matches) {
                    uncutOrders.push(oi.order_code + ' — ' + oi.product_name);
                }
            }

            if (uncutOrders.length > 0) {
                if (pending_stop_active) {
                    // Schedule auto-stop when all cuts are done
                    await db.run('UPDATE kv_fabric_colors SET pending_stop_active = true, updated_at = NOW() WHERE id = $1', [colId]);
                    return { success: true, pending: true };
                } else {
                    return reply.send({
                        success: false,
                        hasUncutOrders: true,
                        uncutOrders: [...new Set(uncutOrders)]
                    });
                }
            }

            // Rule A: if hidden for sales (is_active = false), it cannot be stopped import (stop_import = false, allowed_import_slips = null)
            await db.run(
                'UPDATE kv_fabric_colors SET is_active = false, pending_stop_active = false, allowed_slips = NULL, stop_import = false, allowed_import_slips = NULL, updated_at = NOW() WHERE id = $1',
                [request.params.id]
            );
        }
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
    fastify.put('/api/khovai/warehouses/:id/toggle', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request) => {
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

    // ========== LOCATIONS (Khu vực / Vị trí) ==========

    fastify.get('/api/khovai/locations', { preHandler: [authenticate] }, async (request) => {
        const { all } = request.query;
        let filterSql = '';
        if (all !== 'true') {
            filterSql = `
              AND (
                  (l.printing_contractor_id IS NULL AND l.user_id IS NULL)
                  OR EXISTS (
                      SELECT 1 FROM qlx_order_print_assignments pa
                      JOIN dht_orders o ON o.id = pa.dht_order_id
                      LEFT JOIN order_codes oc ON oc.order_code = o.order_code
                      LEFT JOIN customers cust ON cust.id = o.customer_id
                      WHERE (oc.id IS NULL OR oc.status <> 'cancelled')
                        AND (cust.id IS NULL OR cust.order_status <> 'da_huy_don_tra_coc')
                        AND pa.field_id = 4
                        AND (
                            (pa.operator_type = 'contractor' AND pa.operator_id = l.printing_contractor_id)
                            OR (pa.operator_type = 'user' AND pa.operator_id = l.user_id)
                        )
                        AND (
                            CASE 
                                WHEN pa.item_id IS NOT NULL THEN NOT EXISTS (
                                    SELECT 1 FROM cutting_records cr 
                                    WHERE cr.order_item_id = pa.item_id AND cr.is_cut_done = true
                                )
                                ELSE EXISTS (
                                    SELECT 1 FROM dht_order_items oi
                                    WHERE oi.dht_order_id = pa.dht_order_id
                                      AND NOT EXISTS (
                                          SELECT 1 FROM cutting_records cr2
                                          WHERE cr2.order_item_id = oi.id AND cr2.is_cut_done = true
                                      )
                                )
                            END
                        )
                  )
                  OR EXISTS (
                      SELECT 1 FROM kv_rolls r
                      WHERE LOWER(TRIM(r.location)) = LOWER(TRIM(l.name))
                        AND r.weight > 0
                        AND r.is_returned = false
                  )
              )
            `;
        }

        const rows = await db.all(`
            SELECT l.*, m.name AS restricted_material_name
            FROM kv_locations l
            LEFT JOIN kv_materials m ON m.id = l.restricted_material_id
            JOIN kv_warehouses w ON w.id = l.warehouse_id
            WHERE w.is_active = true
              ${filterSql}
            ORDER BY l.name
        `);
        return { locations: rows };
    });

    fastify.get('/api/khovai/operators', { preHandler: [authenticate] }, async (request) => {
        const contractors = await db.all(`
            SELECT id, name FROM printing_contractors WHERE is_active=true ORDER BY display_order, name
        `);
        const users = await db.all(`
            SELECT id, full_name FROM users WHERE status='active' ORDER BY full_name
        `);
        return { contractors, users };
    });

    // POST /api/khovai/locations — Create location
    fastify.post('/api/khovai/locations', { preHandler: [authenticate] }, async (request) => {
        const { warehouse_id, name, description, is_restricted, restricted_material_id, shelf_position, printing_contractor_id, user_id } = request.body || {};
        const wId = Number(warehouse_id);
        if (!warehouse_id || isNaN(wId) || !Number.isInteger(wId)) return { error: 'Vui lòng chọn một kho vải cụ thể để tạo vị trí!' };
        if (!name || !name.trim()) return { error: 'Tên vị trí không được trống' };

        const exists = await db.get('SELECT id FROM kv_locations WHERE warehouse_id = $1 AND LOWER(name) = LOWER($2)', [wId, name.trim()]);
        if (exists) return { error: 'Tên vị trí này đã tồn tại trong kho' };

        const row = await db.get(
            `INSERT INTO kv_locations (warehouse_id, name, description, is_restricted, restricted_material_id, shelf_position, printing_contractor_id, user_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [wId, name.trim(), description ? description.trim() : null, is_restricted ? true : false, (!is_restricted) ? null : (restricted_material_id ? Number(restricted_material_id) : null), shelf_position ? shelf_position.trim() : null, printing_contractor_id ? Number(printing_contractor_id) : null, user_id ? Number(user_id) : null]
        );
        return { success: true, location: row };
    });

    // PUT /api/khovai/locations/:id — Update location
    fastify.put('/api/khovai/locations/:id', { preHandler: [authenticate] }, async (request) => {
        const { name, description, is_restricted, restricted_material_id, shelf_position, printing_contractor_id, user_id } = request.body || {};
        const id = request.params.id;

        const oldLoc = await db.get('SELECT * FROM kv_locations WHERE id = $1', [id]);
        if (!oldLoc) return { error: 'Không tìm thấy vị trí' };

        const updates = []; const params = []; let idx = 1;
        if (name !== undefined) {
            const newName = name.trim();
            if (!newName) return { error: 'Tên vị trí không được trống' };
            const duplicate = await db.get('SELECT id FROM kv_locations WHERE warehouse_id = $1 AND LOWER(name) = LOWER($2) AND id <> $3', [oldLoc.warehouse_id, newName, id]);
            if (duplicate) return { error: 'Tên vị trí này đã tồn tại trong kho' };
            updates.push(`name = $${idx++}`);
            params.push(newName);
        }
        if (description !== undefined) {
            updates.push(`description = $${idx++}`);
            params.push(description ? description.trim() : null);
        }
        if (is_restricted !== undefined) {
            updates.push(`is_restricted = $${idx++}`);
            params.push(is_restricted ? true : false);
        }
        if (restricted_material_id !== undefined) {
            updates.push(`restricted_material_id = $${idx++}`);
            params.push(restricted_material_id ? Number(restricted_material_id) : null);
        } else if (is_restricted === false) {
            // If explicitly toggled to multipurpose, clear restriction
            updates.push(`restricted_material_id = NULL`);
        }
        if (shelf_position !== undefined) {
            updates.push(`shelf_position = $${idx++}`);
            params.push(shelf_position ? shelf_position.trim() : null);
        }
        if (printing_contractor_id !== undefined) {
            updates.push(`printing_contractor_id = $${idx++}`);
            params.push(printing_contractor_id ? Number(printing_contractor_id) : null);
        }
        if (user_id !== undefined) {
            updates.push(`user_id = $${idx++}`);
            params.push(user_id ? Number(user_id) : null);
        }

        if (!updates.length) return { error: 'Không có gì thay đổi' };

        params.push(id);
        await db.run(`UPDATE kv_locations SET ${updates.join(', ')} WHERE id = $${idx}`, params);

        if (name !== undefined && name.trim() !== oldLoc.name) {
            const newName = name.trim();
            await db.run('UPDATE kv_materials SET location = $1 WHERE warehouse_id = $2 AND location = $3', [newName, oldLoc.warehouse_id, oldLoc.name]);
            await db.run('UPDATE kv_fabric_colors SET location = $1 WHERE material_id IN (SELECT id FROM kv_materials WHERE warehouse_id = $2) AND location = $3', [newName, oldLoc.warehouse_id, oldLoc.name]);
            await db.run('UPDATE kv_rolls SET location = $1 WHERE fabric_color_id IN (SELECT fc.id FROM kv_fabric_colors fc JOIN kv_materials m ON m.id = fc.material_id WHERE m.warehouse_id = $2) AND location = $3', [newName, oldLoc.warehouse_id, oldLoc.name]);
        }

        return { success: true };
    });


    // DELETE /api/khovai/locations/:id — Delete location
    fastify.delete('/api/khovai/locations/:id', { preHandler: [authenticate] }, async (request) => {
        const id = request.params.id;
        const oldLoc = await db.get('SELECT * FROM kv_locations WHERE id = $1', [id]);
        if (!oldLoc) return { error: 'Vị trí không tồn tại' };

        await db.run('UPDATE kv_materials SET location = NULL WHERE warehouse_id = $1 AND location = $2', [oldLoc.warehouse_id, oldLoc.name]);
        await db.run('UPDATE kv_fabric_colors SET location = NULL WHERE material_id IN (SELECT id FROM kv_materials WHERE warehouse_id = $1) AND location = $2', [oldLoc.warehouse_id, oldLoc.name]);
        await db.run('UPDATE kv_rolls SET location = NULL WHERE fabric_color_id IN (SELECT fc.id FROM kv_fabric_colors fc JOIN kv_materials m ON m.id = fc.material_id WHERE m.warehouse_id = $1) AND location = $2', [oldLoc.warehouse_id, oldLoc.name]);

        await db.run('DELETE FROM kv_locations WHERE id = $1', [id]);
        return { success: true };
    });
};
