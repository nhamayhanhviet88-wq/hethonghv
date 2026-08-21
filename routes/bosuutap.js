const path = require('path');
const fs = require('fs');
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'collections');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function collectionsRoutes(fastify, options) {

    // Migration: add cover_image column
    try {
        await db.run(`ALTER TABLE product_collections ADD COLUMN IF NOT EXISTS cover_image TEXT`);
    } catch(e) { /* column may already exist */ }

    // 1. GET /api/collections
    fastify.get('/api/collections', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rows = await db.all(`
                SELECT c.*, 
                       t.title as task_title,
                       t.task_code as task_code,
                       u.full_name as created_by_name
                FROM product_collections c
                LEFT JOIN board_tasks t ON c.task_id = t.id
                LEFT JOIN users u ON c.created_by = u.id
                ORDER BY c.id DESC
            `);
            return reply.send({ ok: true, collections: rows });
        } catch (e) {
            console.error('[collections GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 2. GET /api/collections/eligible-tasks
    fastify.get('/api/collections/eligible-tasks', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const allTasks = await db.all(`
                SELECT id, title, status, guide_link, department_id, task_code
                FROM board_tasks 
                ORDER BY id DESC
            `);
            
            const eligibleTasks = [];
            allTasks.forEach(task => {
                let guides = [];
                try {
                    guides = typeof task.guide_link === 'string' ? JSON.parse(task.guide_link) : (task.guide_link || []);
                } catch(e){}
                
                let isMatched = false;
                if (Array.isArray(guides)) {
                    isMatched = guides.some(g => {
                        const gMain = (g.mainCat || '').toLowerCase();
                        const gSub = (g.subCat || g.title || '').toLowerCase();
                        return gMain.includes('thiết kế mẫu bộ sưu tập') || gMain.includes('thiết kế bst') || gSub.includes('thiết kế mẫu');
                    });
                }
                
                if (isMatched || (task.title && task.title.toLowerCase().includes('thiết kế mẫu'))) {
                    const cvCode = (task.task_code && task.task_code.trim()) ? task.task_code.trim() : ('CV-' + String(task.id).padStart(3, '0'));
                    eligibleTasks.push({
                        id: task.id,
                        cv_code: cvCode,
                        title: task.title,
                        status: task.status
                    });
                }
            });

            return reply.send({ ok: true, tasks: eligibleTasks });
        } catch (e) {
            console.error('[eligible-tasks GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 3. POST /api/collections/upload-file
    fastify.post('/api/collections/upload-file', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const data = await req.file();
            if (!data) return reply.code(400).send({ error: 'Không tìm thấy file tải lên' });

            const ext = path.extname(data.filename).toLowerCase() || '.png';
            const timestamp = Date.now();
            const randStr = Math.random().toString(36).substring(2, 8);
            const isImage = (data.mimetype && data.mimetype.startsWith('image/')) || ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext);

            if (isImage) {
                const origFileName = `col_orig_${timestamp}_${randStr}${ext}`;
                const webFileName = `col_web_${timestamp}_${randStr}.jpg`;

                const origPath = path.join(UPLOAD_DIR, origFileName);
                const webPath = path.join(UPLOAD_DIR, webFileName);

                const writeStream = fs.createWriteStream(origPath);
                await new Promise((resolve, reject) => {
                    data.file.pipe(writeStream);
                    data.file.on('end', resolve);
                    data.file.on('error', reject);
                });

                // Generate compressed web version using Sharp
                try {
                    const sharp = require('sharp');
                    await sharp(origPath)
                        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
                        .jpeg({ quality: 80 })
                        .toFile(webPath);
                } catch (sharpErr) {
                    console.error('[sharp resize error, fallback to original copy]', sharpErr);
                    fs.copyFileSync(origPath, webPath);
                }

                const url = `/uploads/collections/${webFileName}`;
                const original_url = `/uploads/collections/${origFileName}`;
                return reply.send({ ok: true, url, original_url, filename: data.filename });
            } else {
                // PDF or non-image file
                const safeName = `col_${timestamp}_${randStr}${ext}`;
                const filePath = path.join(UPLOAD_DIR, safeName);
                const writeStream = fs.createWriteStream(filePath);
                await new Promise((resolve, reject) => {
                    data.file.pipe(writeStream);
                    data.file.on('end', resolve);
                    data.file.on('error', reject);
                });

                const url = `/uploads/collections/${safeName}`;
                return reply.send({ ok: true, url, original_url: url, filename: data.filename });
            }
        } catch (e) {
            console.error('[collections upload-file POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 4. POST /api/collections (Create Collection)
    fastify.post('/api/collections', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const user = req.user;
            const body = req.body || {};

            if (!body.name || !body.name.trim()) {
                return reply.code(400).send({ error: 'Tên Bộ Sưu Tập không được để trống' });
            }

            if (!body.cover_image || !body.cover_image.trim()) {
                return reply.code(400).send({ error: 'Ảnh đại diện Bộ Sưu Tập là bắt buộc!' });
            }
            const cover_image = body.cover_image.trim();

            const created_mode = body.created_mode === 'task_linked' ? 'task_linked' : 'free';
            let task_id = null;

            if (created_mode === 'task_linked') {
                if (!body.task_id) {
                    return reply.code(400).send({ error: 'Chế độ 1 yêu cầu chọn 1 mã công việc thuộc Tư Liệu 2' });
                }
                task_id = Number(body.task_id);
            }

            const parseUrls = (groupData, key) => {
                if (!groupData || typeof groupData !== 'object') return [];
                if (Array.isArray(groupData[key]) && groupData[key].length > 0) {
                    return groupData[key].filter(Boolean);
                }
                const singleKey = key === 'image_urls' ? 'image_url' : 'pdf_url';
                if (groupData[singleKey]) return [groupData[singleKey]];
                return [];
            };

            const parseOriginalUrls = (groupData, key) => {
                if (!groupData || typeof groupData !== 'object') return [];
                const origKey = key === 'image_urls' ? 'original_image_urls' : 'original_pdf_urls';
                if (Array.isArray(groupData[origKey]) && groupData[origKey].length > 0) {
                    return groupData[origKey].filter(Boolean);
                }
                const singleOrigKey = key === 'image_urls' ? 'original_image_url' : 'original_pdf_url';
                if (groupData[singleOrigKey]) return [groupData[singleOrigKey]];
                return parseUrls(groupData, key);
            };

            // Section 3 (Market Mẫu) benchmark N
            const mmImages = parseUrls(body.market_mau, 'image_urls');
            const mmPdfs = parseUrls(body.market_mau, 'pdf_urls');

            if (mmImages.length === 0 || mmPdfs.length === 0) {
                return reply.code(400).send({ error: 'Mục 3 (Market Mẫu) bắt buộc phải có ít nhất 1 file Hình Ảnh và 1 file PDF!' });
            }
            if (mmImages.length !== mmPdfs.length) {
                return reply.code(400).send({ error: `Mục 3 (Market Mẫu): Số lượng file Hình Ảnh (${mmImages.length}) và file PDF (${mmPdfs.length}) phải bằng nhau!` });
            }

            const targetN = mmImages.length; // Target benchmark N from Section 3!

            // Section 4 (Market Cổ / Bo Tay)
            const mcImages = parseUrls(body.market_co_botay, 'image_urls');
            const mcPdfs = parseUrls(body.market_co_botay, 'pdf_urls');
            if (mcImages.length === 0 || mcPdfs.length === 0) {
                return reply.code(400).send({ error: 'Mục 4 (Market Cổ / Bo Tay) bắt buộc phải có ít nhất 1 file Hình Ảnh và 1 file PDF!' });
            }
            if (mcImages.length !== mcPdfs.length) {
                return reply.code(400).send({ error: `Mục 4 (Market Cổ / Bo Tay): Số lượng file Hình Ảnh (${mcImages.length}) và file PDF (${mcPdfs.length}) phải bằng nhau!` });
            }

            // Section 5 (Phiếu Bắn Đơn) - Must match N!
            const pbImages = parseUrls(body.phieu_ban_don, 'image_urls');
            const pbPdfs = parseUrls(body.phieu_ban_don, 'pdf_urls');
            if (pbImages.length !== targetN || pbPdfs.length !== targetN) {
                return reply.code(400).send({ error: `Mục 5 (Phiếu Bắn Đơn): Bắt buộc phải có đúng ${targetN} file Hình Ảnh và ${targetN} file PDF để khớp với Mục 3 (Market Mẫu)! (Hiện tại: ${pbImages.length} Ảnh, ${pbPdfs.length} PDF)` });
            }

            // Section 6 (Thông Số Mẫu Áo) - Must match N!
            const tsImages = parseUrls(body.thong_so_mau_ao, 'image_urls');
            if (tsImages.length !== targetN) {
                return reply.code(400).send({ error: `Mục 6 (Thông Số Mẫu Áo): Bắt buộc phải có đúng ${targetN} file Hình Ảnh để khớp với Mục 3 (Market Mẫu)! (Hiện tại: ${tsImages.length} Ảnh)` });
            }

            const buildGroupObj = (groupData, groupName) => {
                const imgUrls = parseUrls(groupData, 'image_urls');
                const pdfUrls = parseUrls(groupData, 'pdf_urls');
                const origImgUrls = parseOriginalUrls(groupData, 'image_urls');
                const origPdfUrls = parseOriginalUrls(groupData, 'pdf_urls');
                return {
                    image_urls: imgUrls,
                    pdf_urls: pdfUrls,
                    original_image_urls: origImgUrls,
                    original_pdf_urls: origPdfUrls,
                    image_url: imgUrls[0] || '',
                    pdf_url: pdfUrls[0] || '',
                    original_image_url: origImgUrls[0] || imgUrls[0] || '',
                    original_pdf_url: origPdfUrls[0] || pdfUrls[0] || ''
                };
            };

            const market_mau = buildGroupObj(body.market_mau, 'Market Mẫu');
            const market_co_botay = buildGroupObj(body.market_co_botay, 'Market Cổ / Bo Tay');
            const phieu_ban_don = buildGroupObj(body.phieu_ban_don, 'Phiếu Bắn Đơn');
            const thong_so_mau_ao = buildGroupObj(body.thong_so_mau_ao, 'Thông Số Mẫu Áo');

            if (!body.gia_san_pham || !body.gia_san_pham.trim()) {
                return reply.code(400).send({ error: 'Giá Sản Phẩm không được để trống' });
            }

            const release_date = body.release_date || new Date().toISOString().slice(0, 10);
            const chup_anh_mau_bst = Array.isArray(body.chup_anh_mau_bst) ? body.chup_anh_mau_bst : [];

            const result = await db.get(`
                INSERT INTO product_collections (
                    name, release_date, created_mode, task_id,
                    market_mau, market_co_botay, phieu_ban_don, thong_so_mau_ao,
                    chup_anh_mau_bst, gia_san_pham, ban_giao_maket, hop_voi_sale,
                    created_by, cover_image
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, $8,
                    $9, $10, $11, $12,
                    $13, $14
                ) RETURNING *
            `, [
                body.name.trim(), release_date, created_mode, task_id,
                JSON.stringify(market_mau), JSON.stringify(market_co_botay),
                JSON.stringify(phieu_ban_don), JSON.stringify(thong_so_mau_ao),
                JSON.stringify(chup_anh_mau_bst), body.gia_san_pham.trim(),
                null, JSON.stringify({}), user.id, cover_image
            ]);

            return reply.send({ ok: true, collection: result });
        } catch (e) {
            console.error('[collections POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 5. DELETE /api/collections/:id
    fastify.delete('/api/collections/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const id = req.params.id;
            await db.run(`DELETE FROM product_collections WHERE id = $1`, [id]);
            return reply.send({ ok: true });
        } catch (e) {
            console.error('[collections DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });
}

module.exports = collectionsRoutes;
