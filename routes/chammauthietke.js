// ========== MAKET & CHẤM MÀU THIẾT KẾ — Backend Router ==========
const db = require('../db/pool');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream/promises');

module.exports = async function (fastify) {
    // 1. GET /api/chammauthietke/config — Lấy cấu hình Maket Store & Chấm Màu
    fastify.get('/api/chammauthietke/config', async (request, reply) => {
        try {
            const maketsRow = await db.get("SELECT value FROM app_config WHERE key = 'cmtk_makets_store'");
            const swatchesRow = await db.get("SELECT value FROM app_config WHERE key = 'cmtk_swatches_store'");

            let maketsData = null;
            let swatches = {};

            if (maketsRow && maketsRow.value) {
                try { maketsData = typeof maketsRow.value === 'string' ? JSON.parse(maketsRow.value) : maketsRow.value; } catch(e) {}
            }
            if (swatchesRow && swatchesRow.value) {
                try { swatches = typeof swatchesRow.value === 'string' ? JSON.parse(swatchesRow.value) : swatchesRow.value; } catch(e) {}
            }

            let makets = [];
            let subtabs = null;
            let departments = null;

            if (Array.isArray(maketsData)) {
                makets = maketsData;
            } else if (maketsData && typeof maketsData === 'object') {
                makets = Array.isArray(maketsData.makets) ? maketsData.makets : [];
                subtabs = maketsData.subtabs || null;
                departments = maketsData.departments || null;
            }

            return {
                success: true,
                makets: makets,
                subtabs: subtabs,
                departments: departments,
                swatches: swatches || {}
            };
        } catch (e) {
            console.error('[CMTK Config GET Error]:', e.message);
            return { success: false, makets: [], swatches: {} };
        }
    });

    // 2. POST /api/chammauthietke/config — Lưu danh sách Maket
    fastify.post('/api/chammauthietke/config', async (request, reply) => {
        try {
            const { value } = request.body || {};
            const strValue = typeof value === 'string' ? value : JSON.stringify(value);
            await db.run(
                `INSERT INTO app_config (key, value, updated_at) VALUES ('cmtk_makets_store', ?, NOW())
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                [strValue]
            );
            return { success: true };
        } catch (e) {
            console.error('[CMTK Config POST Error]:', e.message);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 3. POST /api/chammauthietke/swatches — Cập nhật mã màu HEX & Ảnh chụp mẩu vải
    fastify.post('/api/chammauthietke/swatches', async (request, reply) => {
        try {
            const { swatches } = request.body || {};
            const strValue = typeof swatches === 'string' ? swatches : JSON.stringify(swatches);
            await db.run(
                `INSERT INTO app_config (key, value, updated_at) VALUES ('cmtk_swatches_store', ?, NOW())
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                [strValue]
            );
            return { success: true };
        } catch (e) {
            console.error('[CMTK Swatches POST Error]:', e.message);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 4. GET /api/chammauthietke/fabrics — Lấy toàn bộ Kho Vải, Chất Liệu & Màu Vải
    fastify.get('/api/chammauthietke/fabrics', async (request, reply) => {
        try {
            // Lấy danh sách Kho Vải
            const warehouses = await db.all(`
                SELECT id, name, unit, display_order 
                FROM kv_warehouses 
                WHERE is_active = true 
                ORDER BY display_order, id
            `);

            // Lấy danh sách Chất Liệu Vải
            const materials = await db.all(`
                SELECT id, warehouse_id, name, display_order, location, inventory_type 
                FROM kv_materials 
                WHERE is_active = true 
                ORDER BY display_order, name
            `);

            // Lấy danh sách Màu Vải
            const colors = await db.all(`
                SELECT fc.id, fc.material_id, fc.color_name, fc.price, fc.notes,
                       m.name AS material_name, w.name AS warehouse_name, w.id AS warehouse_id
                FROM kv_fabric_colors fc
                JOIN kv_materials m ON m.id = fc.material_id
                JOIN kv_warehouses w ON w.id = m.warehouse_id
                WHERE fc.is_active = true AND m.is_active = true AND w.is_active = true
                ORDER BY m.name, fc.color_name
            `);

            // Lấy dữ liệu mã màu HEX & ảnh swatch đã lưu trong app_config
            const swatchesRow = await db.get("SELECT value FROM app_config WHERE key = 'cmtk_swatches_store'");
            let swatches = {};
            if (swatchesRow && swatchesRow.value) {
                try { swatches = typeof swatchesRow.value === 'string' ? JSON.parse(swatchesRow.value) : swatchesRow.value; } catch(e) {}
            }

            // Gắn dữ liệu swatch vào từng màu vải
            const colorsWithHex = colors.map(c => {
                const key = `${c.material_id}_${c.id}`;
                const swatchInfo = swatches[key] || swatches[c.id] || swatches[`name_${c.material_name}_${c.color_name}`] || {};
                return {
                    ...c,
                    hex_code: swatchInfo.hex_code || swatchInfo.hex || c.hex_code || null,
                    swatch_image: swatchInfo.swatch_image || swatchInfo.imageUrl || null
                };
            });

            return {
                success: true,
                warehouses: warehouses || [],
                materials: materials || [],
                colors: colorsWithHex || []
            };
        } catch (e) {
            console.error('[CMTK Fabrics GET Error]:', e.message);
            return { success: false, warehouses: [], materials: [], colors: [] };
        }
    });

    // 5. POST /api/chammauthietke/upload-pdf — Upload file PDF nguyên bản trực tiếp vào thư mục uploads/makets/
    fastify.post('/api/chammauthietke/upload-pdf', async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) return reply.code(400).send({ error: 'Không tìm thấy file PDF gửi lên' });

            const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'makets');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            const ext = path.extname(data.filename) || '.pdf';
            const safeName = `maket_pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
            const filePath = path.join(uploadDir, safeName);

            await pipeline(data.file, fs.createWriteStream(filePath));

            const publicUrl = `/uploads/makets/${safeName}`;
            return {
                success: true,
                url: publicUrl,
                originalName: data.filename,
                size: fs.statSync(filePath).size
            };
        } catch (e) {
            console.error('[CMTK PDF Upload Error]:', e.message);
            return reply.code(500).send({ error: 'Lỗi tải file PDF: ' + e.message });
        }
    });

    // 6. POST /api/chammauthietke/upload-image — Stream upload hình ảnh/video nguyên bản trực tiếp vào uploads/makets/
    fastify.post('/api/chammauthietke/upload-image', async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) return reply.code(400).send({ error: 'Không tìm thấy file hình ảnh/video gửi lên' });

            const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'makets');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            const ext = path.extname(data.filename) || '.jpg';
            const safeName = `maket_img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
            const filePath = path.join(uploadDir, safeName);

            await pipeline(data.file, fs.createWriteStream(filePath));

            const publicUrl = `/uploads/makets/${safeName}`;
            return {
                success: true,
                url: publicUrl,
                originalName: data.filename,
                size: fs.statSync(filePath).size
            };
        } catch (e) {
            console.error('[CMTK Image Upload Error]:', e.message);
            return reply.code(500).send({ error: 'Lỗi tải file hình ảnh/video: ' + e.message });
        }
    });
};
