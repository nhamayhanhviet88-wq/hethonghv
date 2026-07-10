// ========== THÔNG SỐ ÁO MẪU (TSAM) — Routes ==========
const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { vnNow, vnFormat } = require('../utils/timezone');

module.exports = async function(fastify) {

    // Auto-migrate: create tsam_sample_products table if not exists
    await db.exec(`
        CREATE TABLE IF NOT EXISTS tsam_sample_products (
            sample_id INTEGER NOT NULL REFERENCES tsam_samples(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES dht_products(id) ON DELETE CASCADE,
            PRIMARY KEY (sample_id, product_id)
        );
        CREATE INDEX IF NOT EXISTS idx_tsam_sample_products_sample ON tsam_sample_products(sample_id);
        CREATE INDEX IF NOT EXISTS idx_tsam_sample_products_product ON tsam_sample_products(product_id);
    `);


    // ========== UPLOAD image (Ctrl+V paste) ==========
    fastify.post('/api/tsam/upload', { preHandler: [authenticate] }, async (request, reply) => {
        const data = await request.file();
        if (!data) return reply.code(400).send({ error: 'Không có file' });
        const path = require('path');
        const { compressAndSave } = require('../utils/imageCompressor');
        const dir = path.join(__dirname, '..', 'uploads', 'tsam');
        const buf = await data.toBuffer();
        const result = await compressAndSave(buf, dir, 'tsam_');
        return { success: true, url: `/uploads/tsam/${result.fileName}` };
    });

    // ========== LIST all samples (with filters) ==========
    fastify.get('/api/tsam/samples', { preHandler: [authenticate] }, async (request, reply) => {
        const { category_id, status, search } = request.query;

        let where = 'WHERE s.is_active = true';
        const params = [];
        let idx = 1;

        if (category_id) { where += ` AND s.category_id = $${idx++}`; params.push(Number(category_id)); }
        if (status) { where += ` AND s.approval_status = $${idx++}`; params.push(status); }
        if (search) {
            where += ` AND (s.sample_code ILIKE $${idx} OR s.collection ILIKE $${idx} OR s.design_market ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        const rows = await db.all(`
            SELECT s.*,
                c.name AS category_name,
                u_created.full_name AS created_by_name,
                u_approved.full_name AS approved_by_name,
                COALESCE((SELECT array_to_json(array_agg(product_id)) FROM tsam_sample_products WHERE sample_id = s.id), '[]'::json) AS product_ids,
                COALESCE((SELECT string_agg(p.name, ', ') FROM tsam_sample_products sp JOIN dht_products p ON sp.product_id = p.id WHERE sp.sample_id = s.id), '') AS product_names,
                (SELECT COUNT(*) FROM tsam_order_links ol WHERE ol.sample_id = s.id) AS order_count
            FROM tsam_samples s
            LEFT JOIN dht_categories c ON s.category_id = c.id
            LEFT JOIN users u_created ON s.created_by = u_created.id
            LEFT JOIN users u_approved ON s.approved_by = u_approved.id
            ${where}
            ORDER BY s.display_order ASC, s.id DESC
        `, params);

        return { samples: rows };
    });

    // ========== GET single sample detail ==========
    fastify.get('/api/tsam/samples/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const row = await db.get(`
            SELECT s.*,
                c.name AS category_name,
                u_created.full_name AS created_by_name,
                u_approved.full_name AS approved_by_name,
                COALESCE((SELECT array_to_json(array_agg(product_id)) FROM tsam_sample_products WHERE sample_id = s.id), '[]'::json) AS product_ids
            FROM tsam_samples s
            LEFT JOIN dht_categories c ON s.category_id = c.id
            LEFT JOIN users u_created ON s.created_by = u_created.id
            LEFT JOIN users u_approved ON s.approved_by = u_approved.id
            WHERE s.id = $1
        `, [id]);
        if (!row) return reply.code(404).send({ error: 'Không tìm thấy mẫu áo' });
        return { sample: row };
    });

    // ========== CREATE sample ==========
    fastify.post('/api/tsam/samples', { preHandler: [authenticate] }, async (request, reply) => {
        const b = request.body || {};
        const urlRegex = /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/.+/i;

        // === All fields required ===
        if (!b.category_id) return reply.code(400).send({ error: 'Chọn Lĩnh Vực' });
        if (!b.sample_code || !b.sample_code.trim()) return reply.code(400).send({ error: 'Nhập Mã Mẫu' });
        if (!b.sample_type) return reply.code(400).send({ error: 'Chọn Loại' });
        if (!['PHA_PHOI', '3D', 'DON'].includes(b.sample_type)) return reply.code(400).send({ error: 'Loại không hợp lệ' });
        if (!b.collection || !b.collection.trim()) return reply.code(400).send({ error: 'Nhập Bộ Sưu Tập' });
        if (!b.product_ids || !Array.isArray(b.product_ids) || b.product_ids.length === 0) return reply.code(400).send({ error: 'Chọn ít nhất 1 sản phẩm bán' });

        // === URL validation for 3 link fields (must be Google Drive folder links) ===
        if (!b.design_market || !b.design_market.trim()) return reply.code(400).send({ error: 'Nhập Market Thiết Kế' });
        if (!urlRegex.test(b.design_market.trim())) return reply.code(400).send({ error: 'Market Thiết Kế phải là link Google Drive folder (https://drive.google.com/drive/folders/...)' });
        if (!b.total_sample || !b.total_sample.trim()) return reply.code(400).send({ error: 'Nhập Tổng Hợp Áo Mẫu' });
        if (!urlRegex.test(b.total_sample.trim())) return reply.code(400).send({ error: 'Tổng Hợp Áo Mẫu phải là link Google Drive folder (https://drive.google.com/drive/folders/...)' });
        if (!b.sample_care || !b.sample_care.trim()) return reply.code(400).send({ error: 'Nhập Dưỡng Áo Mẫu' });
        if (!urlRegex.test(b.sample_care.trim())) return reply.code(400).send({ error: 'Dưỡng Áo Mẫu phải là link Google Drive folder (https://drive.google.com/drive/folders/...)' });

        // === Check duplicate links ===
        const dm = b.design_market.trim().toLowerCase();
        const ts = b.total_sample.trim().toLowerCase();
        const sc = b.sample_care.trim().toLowerCase();
        if (dm === ts || dm === sc || ts === sc) return reply.code(400).send({ error: '3 link (Market TK, Tổng Hợp, Dưỡng) không được trùng nhau' });

        // === Sewing tech required ===
        let sewingArr = b.sewing_tech || [];
        if (typeof sewingArr === 'string') { try { sewingArr = JSON.parse(sewingArr); } catch(e) { sewingArr = []; } }
        if (!Array.isArray(sewingArr) || sewingArr.length === 0) return reply.code(400).send({ error: 'Chọn Kỹ Thuật May' });

        // === Spec image required ===
        if (!b.spec_image || !b.spec_image.trim()) return reply.code(400).send({ error: 'Chưa có Hình Ảnh Thông Số (paste Ctrl+V)' });

        // === SL Màu Phối logic based on type ===
        let mixColorCount;
        if (b.sample_type === 'DON' || b.sample_type === '3D') {
            mixColorCount = 1; // Auto-lock = 1
        } else {
            // PHA_PHOI: must be >= 2
            mixColorCount = Number(b.mix_color_count) || 0;
            if (mixColorCount < 2) return reply.code(400).send({ error: 'Pha Phối phải có ≥ 2 màu' });
        }

        // Check duplicate
        const existing = await db.get('SELECT id FROM tsam_samples WHERE sample_code = $1', [b.sample_code.trim()]);
        if (existing) return reply.code(409).send({ error: `Mã mẫu "${b.sample_code.trim()}" đã tồn tại` });

        const mx = await db.get('SELECT COALESCE(MAX(display_order),0) as mx FROM tsam_samples');
        const result = await db.get(`
            INSERT INTO tsam_samples (
                category_id, sample_code, sample_type,
                mix_positions, mix_color_count, collection,
                design_market, total_sample, sample_care,
                sewing_tech, factory_price, processing_price,
                spec_image, display_order, created_by, sample_details
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
            RETURNING *
        `, [
            Number(b.category_id),
            b.sample_code.trim(),
            b.sample_type,
            JSON.stringify(b.mix_positions || []),
            mixColorCount,
            b.collection.trim(),
            b.design_market.trim(),
            b.total_sample.trim(),
            b.sample_care.trim(),
            JSON.stringify(sewingArr),
            Number(b.factory_price) || 0,
            Number(b.processing_price) || 0,
            b.spec_image.trim(),
            (mx?.mx || 0) + 1,
            request.user.id,
            JSON.stringify(b.sample_details || [])
        ]);

        // Insert product relationships
        for (const pid of b.product_ids) {
            await db.run('INSERT INTO tsam_sample_products (sample_id, product_id) VALUES ($1, $2)', [result.id, Number(pid)]);
        }

        // Log history
        await db.run(`INSERT INTO tsam_history (sample_id, action, changed_fields, changed_by) VALUES ($1, 'CREATE', $2, $3)`,
            [result.id, JSON.stringify({ sample_code: b.sample_code.trim(), product_ids: b.product_ids }), request.user.id]);

        return { success: true, sample: result };
    });

    // ========== UPDATE sample ==========
    fastify.put('/api/tsam/samples/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const b = request.body || {};
        console.log('[PUT /api/tsam/samples/:id] body:', JSON.stringify(b));
        const urlRegex = /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/.+/i;

        const old = await db.get('SELECT * FROM tsam_samples WHERE id = $1', [id]);
        if (!old) return reply.code(404).send({ error: 'Không tìm thấy mẫu' });
        if (old.approval_status === 'APPROVED' && request.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Mẫu đã duyệt, không thể sửa' });

        // === Validate required fields if provided ===
        if (b.category_id !== undefined && !b.category_id) return reply.code(400).send({ error: 'Chọn Lĩnh Vực' });
        if (b.collection !== undefined && (!b.collection || !b.collection.trim())) return reply.code(400).send({ error: 'Nhập Bộ Sưu Tập' });
        if (b.product_ids !== undefined) {
            if (!b.product_ids || !Array.isArray(b.product_ids) || b.product_ids.length === 0) {
                return reply.code(400).send({ error: 'Chọn ít nhất 1 sản phẩm bán' });
            }
        }
        if (b.design_market !== undefined) {
            if (!b.design_market || !b.design_market.trim()) return reply.code(400).send({ error: 'Nhập Market Thiết Kế' });
            if (!urlRegex.test(b.design_market.trim())) return reply.code(400).send({ error: 'Market Thiết Kế phải là link Google Drive folder (https://drive.google.com/drive/folders/...)' });
        }
        if (b.total_sample !== undefined) {
            if (!b.total_sample || !b.total_sample.trim()) return reply.code(400).send({ error: 'Nhập Tổng Hợp Áo Mẫu' });
            if (!urlRegex.test(b.total_sample.trim())) return reply.code(400).send({ error: 'Tổng Hợp Áo Mẫu phải là link Google Drive folder (https://drive.google.com/drive/folders/...)' });
        }
        if (b.sample_care !== undefined) {
            if (!b.sample_care || !b.sample_care.trim()) return reply.code(400).send({ error: 'Nhập Dưỡng Áo Mẫu' });
            if (!urlRegex.test(b.sample_care.trim())) return reply.code(400).send({ error: 'Dưỡng Áo Mẫu phải là link Google Drive folder (https://drive.google.com/drive/folders/...)' });
        }

        // === Check duplicate links (use old values as fallback for unmodified fields) ===
        const effDM = (b.design_market !== undefined ? b.design_market : old.design_market || '').trim().toLowerCase();
        const effTS = (b.total_sample !== undefined ? b.total_sample : old.total_sample || '').trim().toLowerCase();
        const effSC = (b.sample_care !== undefined ? b.sample_care : old.sample_care || '').trim().toLowerCase();
        if (effDM && effTS && effSC && (effDM === effTS || effDM === effSC || effTS === effSC)) {
            return reply.code(400).send({ error: '3 link (Market TK, Tổng Hợp, Dưỡng) không được trùng nhau' });
        }

        // === Auto-enforce mix_color_count when type changes ===
        const effectiveType = b.sample_type || old.sample_type;
        if (effectiveType === 'DON' || effectiveType === '3D') {
            b.mix_color_count = 1; // Force = 1
        } else if (effectiveType === 'PHA_PHOI') {
            const effectiveMix = b.mix_color_count !== undefined ? Number(b.mix_color_count) : old.mix_color_count;
            if (effectiveMix < 2) return reply.code(400).send({ error: 'Pha Phối phải có ≥ 2 màu' });
        }

        // === Sewing tech required if provided ===
        if (b.sewing_tech !== undefined) {
            let sewArr = b.sewing_tech;
            if (typeof sewArr === 'string') { try { sewArr = JSON.parse(sewArr); } catch(e) { sewArr = []; } }
            if (!Array.isArray(sewArr) || sewArr.length === 0) return reply.code(400).send({ error: 'Chọn Kỹ Thuật May' });
        }

        const allowed = [
            'category_id', 'sample_code', 'sample_type',
            'mix_positions', 'mix_color_count', 'collection',
            'design_market', 'total_sample', 'sample_care',
            'sewing_tech', 'factory_price', 'processing_price', 'spec_image', 'sample_details'
        ];

        const sets = [];
        const params = [];
        const changes = {};
        let idx = 1;

        for (const key of allowed) {
            if (b[key] !== undefined) {
                const numericFields = ['category_id', 'mix_color_count', 'factory_price', 'processing_price'];
                const jsonFields = ['mix_positions', 'sewing_tech', 'sample_details'];

                if (jsonFields.includes(key)) {
                    sets.push(`${key} = $${idx++}`);
                    const val = JSON.stringify(b[key] || []);
                    params.push(val);
                    changes[key] = { old: old[key], new: b[key] };
                } else if (numericFields.includes(key)) {
                    sets.push(`${key} = $${idx++}`);
                    const val = b[key] === null || b[key] === '' ? null : Number(b[key]);
                    params.push(val);
                    changes[key] = { old: old[key], new: val };
                } else {
                    sets.push(`${key} = $${idx++}`);
                    params.push(b[key] === '' ? null : b[key]);
                    changes[key] = { old: old[key], new: b[key] };
                }
            }
        }

        if (sets.length > 0) {
            sets.push(`updated_at = NOW()`);
            params.push(id);
            await db.run(`UPDATE tsam_samples SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        }

        if (b.product_ids !== undefined) {
            await db.run('DELETE FROM tsam_sample_products WHERE sample_id = $1', [id]);
            for (const pid of b.product_ids) {
                await db.run('INSERT INTO tsam_sample_products (sample_id, product_id) VALUES ($1, $2)', [id, Number(pid)]);
            }
            changes['product_ids'] = { new: b.product_ids };
        }

        if (sets.length === 0 && b.product_ids === undefined) {
            return reply.code(400).send({ error: 'Không có dữ liệu cập nhật' });
        }

        // Log history
        await db.run(`INSERT INTO tsam_history (sample_id, action, changed_fields, changed_by) VALUES ($1, 'UPDATE', $2, $3)`,
            [id, JSON.stringify(changes), request.user.id]);

        return { success: true };
    });

    // ========== DELETE sample (soft) ==========
    fastify.delete('/api/tsam/samples/:id', { preHandler: [authenticate] }, async (request, reply) => {
        // Permission: giam_doc OR can_approve_tsam
        if (request.user.role !== 'giam_doc') {
            const u = await db.get('SELECT can_approve_tsam FROM users WHERE id = $1', [request.user.id]);
            if (!u?.can_approve_tsam) return reply.code(403).send({ error: 'Không có quyền' });
        }
        const id = Number(request.params.id);
        // Check if any orders linked
        const linkCount = await db.get('SELECT COUNT(*) as cnt FROM tsam_order_links WHERE sample_id = $1', [id]);
        await db.run('UPDATE tsam_samples SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);

        // Log
        await db.run(`INSERT INTO tsam_history (sample_id, action, changed_fields, changed_by) VALUES ($1, 'DELETE', $2, $3)`,
            [id, JSON.stringify({ linked_orders: linkCount?.cnt || 0 }), request.user.id]);

        return { success: true };
    });

    // ========== APPROVE sample ==========
    fastify.put('/api/tsam/samples/:id/approve', { preHandler: [authenticate] }, async (request, reply) => {
        // Permission: giam_doc OR can_approve_tsam
        if (request.user.role !== 'giam_doc') {
            const u = await db.get('SELECT can_approve_tsam FROM users WHERE id = $1', [request.user.id]);
            if (!u?.can_approve_tsam) return reply.code(403).send({ error: 'Không có quyền duyệt' });
        }
        const id = Number(request.params.id);
        const sample = await db.get('SELECT approval_status FROM tsam_samples WHERE id = $1', [id]);
        if (!sample) return reply.code(404).send({ error: 'Không tìm thấy mẫu' });

        await db.run(`UPDATE tsam_samples SET approval_status = 'APPROVED', approved_by = $1, approved_at = NOW(), updated_at = NOW() WHERE id = $2`,
            [request.user.id, id]);

        await db.run(`INSERT INTO tsam_history (sample_id, action, changed_fields, changed_by) VALUES ($1, 'APPROVE', $2, $3)`,
            [id, JSON.stringify({ old: sample.approval_status, new: 'APPROVED' }), request.user.id]);

        return { success: true };
    });

    // ========== REJECT sample ==========
    fastify.put('/api/tsam/samples/:id/reject', { preHandler: [authenticate] }, async (request, reply) => {
        // Permission: giam_doc OR can_approve_tsam
        if (request.user.role !== 'giam_doc') {
            const u = await db.get('SELECT can_approve_tsam FROM users WHERE id = $1', [request.user.id]);
            if (!u?.can_approve_tsam) return reply.code(403).send({ error: 'Không có quyền từ chối' });
        }
        const id = Number(request.params.id);
        const { reason } = request.body || {};
        const sample = await db.get('SELECT approval_status FROM tsam_samples WHERE id = $1', [id]);
        if (!sample) return reply.code(404).send({ error: 'Không tìm thấy mẫu' });

        await db.run(`UPDATE tsam_samples SET approval_status = 'REJECTED', approved_by = $1, approved_at = NOW(), updated_at = NOW() WHERE id = $2`,
            [request.user.id, id]);

        await db.run(`INSERT INTO tsam_history (sample_id, action, changed_fields, changed_by) VALUES ($1, 'REJECT', $2, $3)`,
            [id, JSON.stringify({ old: sample.approval_status, new: 'REJECTED', reason: reason || '' }), request.user.id]);

        return { success: true };
    });

    // ========== GET linked orders for a sample ==========
    fastify.get('/api/tsam/samples/:id/orders', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const rows = await db.all(`
            SELECT ol.id, ol.dht_order_id, ol.dht_order_code, ol.linked_at,
                   o.order_date, o.customer_name, o.total_amount,
                   u.full_name AS linked_by_name
            FROM tsam_order_links ol
            LEFT JOIN dht_orders o ON ol.dht_order_id = o.id
            LEFT JOIN users u ON ol.linked_by = u.id
            WHERE ol.sample_id = $1
            ORDER BY ol.linked_at DESC
        `, [id]);
        return { orders: rows };
    });

    // ========== GET history for a sample ==========
    fastify.get('/api/tsam/samples/:id/history', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const rows = await db.all(`
            SELECT h.*, u.full_name AS changed_by_name
            FROM tsam_history h
            LEFT JOIN users u ON h.changed_by = u.id
            WHERE h.sample_id = $1
            ORDER BY h.changed_at DESC
            LIMIT 50
        `, [id]);
        return { history: rows };
    });

    // ========== DROPDOWN for DHT Phiếu form ==========
    fastify.get('/api/tsam/dropdown', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all(`
            SELECT s.id, s.sample_code AS name, s.sample_type, s.category_id, s.approval_status, s.mix_color_count, s.spec_image,
                   COALESCE((SELECT array_to_json(array_agg(product_id)) FROM tsam_sample_products WHERE sample_id = s.id), '[]'::json) AS product_ids
            FROM tsam_samples s
            WHERE s.is_active = true AND s.approval_status = 'APPROVED'
            ORDER BY s.display_order ASC, s.sample_code ASC
        `);
        return { patterns: rows };
    });

    // ========== SIDEBAR: Category counts for TSAM ==========
    fastify.get('/api/tsam/tree', { preHandler: [authenticate] }, async (request, reply) => {
        // Get all categories with sample counts
        const cats = await db.all(`
            SELECT c.id, c.name, c.display_order,
                COUNT(s.id) FILTER (WHERE s.is_active = true) AS sample_count,
                COUNT(s.id) FILTER (WHERE s.is_active = true AND s.approval_status = 'APPROVED') AS approved_count,
                COUNT(s.id) FILTER (WHERE s.is_active = true AND s.approval_status = 'PENDING') AS pending_count
            FROM dht_categories c
            LEFT JOIN tsam_samples s ON s.category_id = c.id
            WHERE c.is_active = true
            GROUP BY c.id, c.name, c.display_order
            ORDER BY c.display_order ASC, c.id ASC
        `);

        // Total
        const total = await db.get(`
            SELECT COUNT(*) FILTER (WHERE is_active = true) AS total,
                   COUNT(*) FILTER (WHERE is_active = true AND approval_status = 'APPROVED') AS approved,
                   COUNT(*) FILTER (WHERE is_active = true AND approval_status = 'PENDING') AS pending
            FROM tsam_samples
        `);

        return { categories: cats, total: total || { total: 0, approved: 0, pending: 0 } };
    });

    // ========== MIX POSITIONS — Master Data CRUD ==========

    // LIST active mix positions (for dropdown/picker)
    fastify.get('/api/tsam/mix-positions', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all('SELECT * FROM tsam_mix_positions WHERE is_active = true ORDER BY display_order ASC, id ASC');
        return { positions: rows };
    });

    // LIST all mix positions (for admin settings)
    fastify.get('/api/tsam/mix-positions/all', { preHandler: [authenticate] }, async (request, reply) => {
        const rows = await db.all('SELECT * FROM tsam_mix_positions ORDER BY display_order ASC, id ASC');
        return { positions: rows };
    });

    // CREATE mix position
    fastify.post('/api/tsam/mix-positions', { preHandler: [authenticate] }, async (request, reply) => {
        const { name } = request.body || {};
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Nhập tên vị trí phối' });
        const dup = await db.get('SELECT id FROM tsam_mix_positions WHERE LOWER(name) = LOWER($1)', [name.trim()]);
        if (dup) return reply.code(409).send({ error: `"${name.trim()}" đã tồn tại` });
        const mx = await db.get('SELECT COALESCE(MAX(display_order),0) as mx FROM tsam_mix_positions');
        const row = await db.get('INSERT INTO tsam_mix_positions (name, display_order) VALUES ($1, $2) RETURNING *', [name.trim(), (mx?.mx || 0) + 1]);
        return { success: true, position: row };
    });

    // UPDATE mix position
    fastify.put('/api/tsam/mix-positions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        const { name, is_active } = request.body || {};
        const old = await db.get('SELECT * FROM tsam_mix_positions WHERE id = $1', [id]);
        if (!old) return reply.code(404).send({ error: 'Không tìm thấy' });
        const updates = [];
        const params = [];
        let idx = 1;
        if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name.trim()); }
        if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(is_active); }
        if (!updates.length) return reply.code(400).send({ error: 'Không có gì để cập nhật' });
        params.push(id);
        await db.run(`UPDATE tsam_mix_positions SET ${updates.join(', ')} WHERE id = $${idx}`, params);
        return { success: true };
    });

    // DELETE mix position
    fastify.delete('/api/tsam/mix-positions/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const id = Number(request.params.id);
        await db.run('DELETE FROM tsam_mix_positions WHERE id = $1', [id]);
        return { success: true };
    });

    // ========== TSAM APPROVAL PERMISSION MANAGEMENT ==========
    // List users with can_approve_tsam flag
    fastify.get('/api/tsam/approvers', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const users = await db.all("SELECT id, username, full_name, role, can_approve_tsam FROM users WHERE status = 'active' AND role NOT IN ('giam_doc') ORDER BY full_name");
        return { users };
    });

    // Toggle can_approve_tsam for a user
    fastify.put('/api/tsam/approvers/:userId', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const userId = Number(request.params.userId);
        const { can_approve } = request.body || {};
        await db.run('UPDATE users SET can_approve_tsam = $1, updated_at = NOW() WHERE id = $2', [!!can_approve, userId]);
        console.log(`📋 [TSAM] can_approve_tsam = ${!!can_approve} for user #${userId} by ${request.user.username}`);
        return { success: true };
    });
};
