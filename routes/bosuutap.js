const path = require('path');
const fs = require('fs');
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'collections');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function getDeptShortCode(deptName) {
    if (!deptName) return 'CHUNG';
    const nameUpper = String(deptName).toUpperCase().trim();
    if (nameUpper.includes('MARKETING')) return 'MKT';
    if (nameUpper.includes('KINH DOANH')) return 'KD';
    if (nameUpper.includes('KẾ TOÁN') || nameUpper.includes('KE TOAN')) return 'KT';
    if (nameUpper.includes('THỦ QUỸ') || nameUpper.includes('THU QUY')) return 'QUY';
    if (nameUpper.includes('THỦ KHO') || nameUpper.includes('THU KHO')) return 'KHO';
    if (nameUpper.includes('NHÂN SỰ') || nameUpper.includes('HÀNH CHÍNH')) return 'NS';
    if (nameUpper.includes('AFFILIATE')) return 'AFF';
    if (nameUpper.includes('ÉP') || nameUpper.includes('EP')) return 'EP';
    if (nameUpper.includes('HOÀN THIỆN') || nameUpper.includes('HOAN THIEN')) return 'HT';
    if (nameUpper.includes('CẮT CÁNH')) return 'CC';
    if (nameUpper.includes('CẮT')) return 'CAT';
    if (nameUpper.includes('XÃ HỘI')) return 'XH';
    if (nameUpper.includes('VĂN PHÒNG')) return 'VP';
    if (nameUpper.includes('XƯỞNG')) return 'XUONG';
    if (nameUpper.includes('THIẾT KẾ') || nameUpper.includes('THIET KE')) return 'TK';
    if (nameUpper.includes('SINH VIÊN')) return 'SVKD';
    if (nameUpper.includes('THỬ VIỆC')) return 'TVKD';
    if (nameUpper.includes('TIÊN PHONG')) return 'MTP';
    if (nameUpper.includes('TINH HOA')) return 'MTH';
    if (nameUpper.includes('MAY')) return 'MAY';
    if (nameUpper.includes('IN')) return 'IN';
    if (nameUpper.includes('SALE')) return 'SALE';

    const stopWords = ['PHÒNG', 'TEAM', 'HỆ', 'THỐNG', 'BAN', 'BỘ', 'PHẬN', 'HV'];
    const words = nameUpper.split(/\s+/).filter(w => w && !stopWords.includes(w));
    if (words.length > 0) {
        const code = words.map(w => w[0]).join('').replace(/[^A-Z0-9]/g, '');
        if (code) return code;
    }
    return 'CV';
}

function formatTaskCode(t) {
    if (!t) return 'CV-000';
    if (t.task_code && t.task_code.trim()) return t.task_code.trim();
    if (t.department_name) {
        const dCode = getDeptShortCode(t.department_name);
        const no = t.dept_task_no ? (t.dept_task_no < 10 ? ('0' + t.dept_task_no) : String(t.dept_task_no)) : String(t.id || 0).padStart(2, '0');
        return `CV-${dCode}-${no}`;
    }
    return 'CV-' + String(t.id || 0).padStart(3, '0');
}

async function collectionsRoutes(fastify, options) {

    // Migration: add cover_image, linh_vuc, is_approved & video_bst columns
    try {
        await db.run(`ALTER TABLE product_collections ADD COLUMN IF NOT EXISTS cover_image TEXT`);
        await db.run(`ALTER TABLE product_collections ADD COLUMN IF NOT EXISTS linh_vuc TEXT`);
        await db.run(`ALTER TABLE product_collections ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE`);
        await db.run(`ALTER TABLE product_collections ADD COLUMN IF NOT EXISTS approved_by INT`);
        await db.run(`ALTER TABLE product_collections ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`);
        await db.run(`ALTER TABLE product_collections ADD COLUMN IF NOT EXISTS video_bst TEXT`);
    } catch(e) { /* column may already exist */ }

    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS bsut_linh_vuc (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        const countRes = await db.get(`SELECT COUNT(*) as count FROM bsut_linh_vuc`);
        const count = parseInt((countRes && countRes.count) || 0);
        if (count === 0) {
            await db.run(`INSERT INTO bsut_linh_vuc (name) VALUES ('Công Ty'), ('Áo Lớp'), ('Mầm Non') ON CONFLICT DO NOTHING`);
        }
    } catch(e) {
        console.error('[bsut_linh_vuc migration error]', e);
    }

    // 0a. GET /api/collections/linh-vuc
    fastify.get('/api/collections/linh-vuc', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rows = await db.all(`SELECT * FROM bsut_linh_vuc ORDER BY id ASC`);
            return reply.send({ ok: true, linh_vuc_list: rows });
        } catch (e) {
            console.error('[linh-vuc GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 0b. POST /api/collections/linh-vuc (Only Director)
    fastify.post('/api/collections/linh-vuc', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (req.user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền quản lý Cấu hình Lĩnh Vực!' });
            }
            const { name } = req.body || {};
            if (!name || !name.trim()) {
                return reply.code(400).send({ error: 'Tên Lĩnh Vực không được để trống' });
            }
            const trimmedName = name.trim();
            const result = await db.get(
                `INSERT INTO bsut_linh_vuc (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *`,
                [trimmedName]
            );
            return reply.send({ ok: true, item: result });
        } catch (e) {
            console.error('[linh-vuc POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 0c. DELETE /api/collections/linh-vuc/:id (Only Director)
    fastify.delete('/api/collections/linh-vuc/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (req.user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền quản lý Cấu hình Lĩnh Vực!' });
            }
            const id = req.params.id;
            await db.run(`DELETE FROM bsut_linh_vuc WHERE id = $1`, [id]);
            return reply.send({ ok: true });
        } catch (e) {
            console.error('[linh-vuc DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 1. GET /api/collections
    fastify.get('/api/collections', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const [rows, completedSessions] = await Promise.all([
                db.all(`
                    SELECT c.*, 
                           t.title as task_title,
                           t.task_code as task_code,
                           t.dept_task_no as dept_task_no,
                           t.status as task_status,
                           t.deadline as task_deadline,
                           t.created_by as task_created_by,
                           u2.full_name as task_created_by_name,
                           d.name as department_name,
                           u.full_name as created_by_name
                    FROM product_collections c
                    LEFT JOIN board_tasks t ON c.task_id = t.id
                    LEFT JOIN departments d ON d.id = t.department_id
                    LEFT JOIN users u ON c.created_by = u.id
                    LEFT JOIN users u2 ON t.created_by = u2.id
                    ORDER BY c.id DESC
                `),
                db.all(`
                    SELECT s.id, s.process_id, s.collection_id, s.title, s.meeting_date, s.status, s.conclusion,
                           cp.full_name AS chairperson_name
                    FROM meeting_process_sessions s
                    LEFT JOIN users cp ON cp.id = s.chairperson_id
                    WHERE s.status = 'da_ket_thuc'
                    ORDER BY s.id DESC
                `)
            ]);

            rows.forEach(col => {
                if (col.task_id) {
                    col.task_code = formatTaskCode({
                        id: col.task_id,
                        task_code: col.task_code,
                        dept_task_no: col.dept_task_no,
                        department_name: col.department_name
                    });
                }
                const matchedSession = (completedSessions || []).find(s => 
                    (s.collection_id && Number(s.collection_id) === Number(col.id)) ||
                    (s.title && col.name && s.title.trim().toLowerCase() === col.name.trim().toLowerCase())
                );
                col.completed_meeting = matchedSession || null;
            });
            return reply.send({ ok: true, collections: rows });
        } catch (e) {
            console.error('[collections GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 2. GET /api/collections/eligible-tasks
    fastify.get('/api/collections/eligible-tasks', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const [allTasks, existingCols] = await Promise.all([
                db.all(`
                    SELECT t.id, t.title, t.status, t.guide_link, t.department_id, t.task_code, t.dept_task_no, d.name as department_name
                    FROM board_tasks t
                    LEFT JOIN departments d ON d.id = t.department_id
                    ORDER BY t.id DESC
                `),
                db.all(`SELECT task_id FROM product_collections WHERE task_id IS NOT NULL`)
            ]);
            
            const existingTaskIds = new Set(existingCols.map(c => Number(c.task_id)));
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
                    const cvCode = formatTaskCode(task);
                    eligibleTasks.push({
                        id: task.id,
                        cv_code: cvCode,
                        title: task.title,
                        status: task.status,
                        is_created: existingTaskIds.has(Number(task.id))
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

            const rawOriginalName = data.filename || 'file';
            const ext = path.extname(rawOriginalName).toLowerCase() || '.png';

            if (ext === '.url' || ext === '.lnk') {
                return reply.code(400).send({ error: 'Không hỗ trợ upload file shortcut (.url / .lnk)! Vui lòng upload trực tiếp file PDF hoặc Hình Ảnh thực sự từ máy tính.' });
            }

            const baseNameNoExt = path.basename(rawOriginalName, path.extname(rawOriginalName))
                .replace(/[^a-zA-Z0-9_\-\s]/g, '_')
                .substring(0, 50);

            const timestamp = Date.now();
            const randStr = Math.random().toString(36).substring(2, 8);
            const isImage = (data.mimetype && data.mimetype.startsWith('image/')) || ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext);

            if (isImage) {
                const origFileName = `col_orig_${timestamp}_${randStr}_${baseNameNoExt}${ext}`;
                const webFileName = `col_web_${timestamp}_${randStr}_${baseNameNoExt}.jpg`;

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
                const safeName = `col_${timestamp}_${randStr}_${baseNameNoExt}${ext}`;
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

            if (!body.linh_vuc || !body.linh_vuc.trim()) {
                return reply.code(400).send({ error: 'Lĩnh Vực Bộ Sưu Tập là bắt buộc!' });
            }
            const linh_vuc = body.linh_vuc.trim();

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

            const driveRegex = /^https?:\/\/(?:drive|docs)\.google\.com\/.+/i;
            let video_bst = body.video_bst || {};
            let videoLink = '';
            if (typeof video_bst === 'string') {
                try { video_bst = JSON.parse(video_bst); } catch(e){}
            }
            if (typeof video_bst === 'object' && video_bst !== null) {
                videoLink = Array.isArray(video_bst) ? (video_bst[0] || '') : (video_bst.link || '');
            } else if (typeof video_bst === 'string') {
                videoLink = video_bst;
            }
            if (videoLink && !driveRegex.test(String(videoLink).trim())) {
                return reply.code(400).send({ error: 'Link Video Bộ Sưu Tập phải là đường link Google Drive hợp lệ (https://drive.google.com/...)' });
            }

            const result = await db.get(`
                INSERT INTO product_collections (
                    name, release_date, created_mode, task_id,
                    market_mau, market_co_botay, phieu_ban_don, thong_so_mau_ao,
                    chup_anh_mau_bst, gia_san_pham, ban_giao_maket, hop_voi_sale,
                    created_by, cover_image, linh_vuc, video_bst
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, $8,
                    $9, $10, $11, $12,
                    $13, $14, $15, $16
                ) RETURNING *
            `, [
                body.name.trim(), release_date, created_mode, task_id,
                JSON.stringify(market_mau), JSON.stringify(market_co_botay),
                JSON.stringify(phieu_ban_don), JSON.stringify(thong_so_mau_ao),
                JSON.stringify(chup_anh_mau_bst), body.gia_san_pham.trim(),
                null, JSON.stringify({}), user.id, cover_image, linh_vuc, JSON.stringify(video_bst)
            ]);

            return reply.send({ ok: true, collection: result });
        } catch (e) {
            console.error('[collections POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 5. PUT /api/collections/:id (Edit Collection - Creator or Giám Đốc)
    fastify.put('/api/collections/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const id = req.params.id;
            const existing = await db.get(`SELECT * FROM product_collections WHERE id = $1`, [id]);
            if (!existing) return reply.code(404).send({ error: 'Không tìm thấy Bộ Sưu Tập' });

            const isGiamDoc = req.user.role === 'giam_doc' || req.user.role === 'admin' || !!req.user.is_admin;
            const isCreator = Number(req.user.id) === Number(existing.created_by);
            if (!isGiamDoc && !isCreator) {
                return reply.code(403).send({ error: 'Bạn không có quyền chỉnh sửa Bộ Sưu Tập này!' });
            }

            const body = req.body || {};

            // If collection is ALREADY APPROVED and user is NOT Giám Đốc/Admin: ONLY allow updating chup_anh_mau_bst (Item 8)!
            if (existing.is_approved && !isGiamDoc) {
                const chup_anh_mau_bst = Array.isArray(body.chup_anh_mau_bst) ? body.chup_anh_mau_bst : [];
                const result = await db.get(`
                    UPDATE product_collections
                    SET chup_anh_mau_bst = $1
                    WHERE id = $2
                    RETURNING *
                `, [JSON.stringify(chup_anh_mau_bst), id]);

                return reply.send({ ok: true, collection: result, locked_notice: 'Bộ Sưu Tập đã duyệt: Chỉ cập nhật Mục 8 (Chụp Ảnh Mẫu BST).' });
            }

            if (!body.name || !body.name.trim()) {
                return reply.code(400).send({ error: 'Tên Bộ Sưu Tập không được để trống' });
            }
            if (!body.linh_vuc || !body.linh_vuc.trim()) {
                return reply.code(400).send({ error: 'Lĩnh Vực Bộ Sưu Tập là bắt buộc' });
            }
            if (!body.cover_image || !body.cover_image.trim()) {
                return reply.code(400).send({ error: 'Ảnh đại diện Bộ Sưu Tập không được để trống' });
            }
            if (!body.gia_san_pham || !body.gia_san_pham.trim()) {
                return reply.code(400).send({ error: 'Giá Sản Phẩm không được để trống' });
            }

            const created_mode = body.created_mode === 'task_linked' ? 'task_linked' : 'free';
            let task_id = created_mode === 'task_linked' ? (body.task_id ? Number(body.task_id) : null) : null;
            const release_date = body.release_date || new Date().toISOString().slice(0, 10);
            const cover_image = body.cover_image.trim();
            const linh_vuc = body.linh_vuc.trim();

            const market_mau = body.market_mau || {};
            const market_co_botay = body.market_co_botay || {};
            const phieu_ban_don = body.phieu_ban_don || {};
            const thong_so_mau_ao = body.thong_so_mau_ao || {};
            const chup_anh_mau_bst = Array.isArray(body.chup_anh_mau_bst) ? body.chup_anh_mau_bst : [];

            let video_bst = body.video_bst || {};
            let videoLink = '';
            if (typeof video_bst === 'string') {
                try { video_bst = JSON.parse(video_bst); } catch(e){}
            }
            if (typeof video_bst === 'object' && video_bst !== null) {
                videoLink = Array.isArray(video_bst) ? (video_bst[0] || '') : (video_bst.link || '');
            } else if (typeof video_bst === 'string') {
                videoLink = video_bst;
            }
            if (videoLink && !driveRegex.test(String(videoLink).trim())) {
                return reply.code(400).send({ error: 'Link Video Bộ Sưu Tập phải là đường link Google Drive hợp lệ (https://drive.google.com/...)' });
            }

            const result = await db.get(`
                UPDATE product_collections
                SET name = $1,
                    release_date = $2,
                    created_mode = $3,
                    task_id = $4,
                    market_mau = $5,
                    market_co_botay = $6,
                    phieu_ban_don = $7,
                    thong_so_mau_ao = $8,
                    chup_anh_mau_bst = $9,
                    gia_san_pham = $10,
                    cover_image = $11,
                    linh_vuc = $12,
                    video_bst = $13
                WHERE id = $14
                RETURNING *
            `, [
                body.name.trim(), release_date, created_mode, task_id,
                JSON.stringify(market_mau), JSON.stringify(market_co_botay),
                JSON.stringify(phieu_ban_don), JSON.stringify(thong_so_mau_ao),
                JSON.stringify(chup_anh_mau_bst), body.gia_san_pham.trim(),
                cover_image, linh_vuc, JSON.stringify(video_bst), id
            ]);

            return reply.send({ ok: true, collection: result });
        } catch (e) {
            console.error('[collections PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 6. DELETE /api/collections/:id (Director only)
    fastify.delete('/api/collections/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (req.user.role !== 'giam_doc') {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa Bộ Sưu Tập!' });
            }
            const id = req.params.id;
            await db.run(`DELETE FROM product_collections WHERE id = $1`, [id]);
            return reply.send({ ok: true });
        } catch (e) {
            console.error('[collections DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 7. PATCH /api/collections/:id/approve (Assignor or Director only)
    fastify.patch('/api/collections/:id/approve', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const user = req.user;
            const id = req.params.id;

            const col = await db.get(`SELECT * FROM product_collections WHERE id = $1`, [id]);
            if (!col) return reply.code(404).send({ error: 'Không tìm thấy Bộ Sưu Tập' });

            let canApprove = (user.role === 'giam_doc');
            if (!canApprove && col.task_id) {
                const task = await db.get(`SELECT t.created_by, u.full_name as created_by_name FROM board_tasks t LEFT JOIN users u ON t.created_by = u.id WHERE t.id = $1`, [col.task_id]);
                if (task && (Number(task.created_by) === Number(user.id) || (task.created_by_name && user.full_name && task.created_by_name.trim() === user.full_name.trim()))) {
                    canApprove = true;
                }
            }

            if (!canApprove) {
                return reply.code(403).send({ error: 'Chỉ Người bàn giao việc (Người tạo task) hoặc Giám Đốc mới có quyền duyệt Bộ Sưu Tập này!' });
            }

            const updated = await db.get(`
                UPDATE product_collections
                SET is_approved = TRUE, approved_by = $1, approved_at = NOW()
                WHERE id = $2
                RETURNING *
            `, [user.id, id]);

            return reply.send({ ok: true, collection: updated });
        } catch(e) {
            console.error('[collections approve error]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/collections/:id/download-chup-anh-zip — Download all Section 8 original HD photos as ZIP
    fastify.get('/api/collections/:id/download-chup-anh-zip', async (req, reply) => {
        try {
            const col = await db.get(`SELECT * FROM product_collections WHERE id = $1`, [req.params.id]);
            if (!col) return reply.code(404).send({ error: 'Không tìm thấy Bộ Sưu Tập' });

            const chupRaw = typeof col.chup_anh_mau_bst === 'string' ? JSON.parse(col.chup_anh_mau_bst) : (col.chup_anh_mau_bst || []);
            if (!Array.isArray(chupRaw) || chupRaw.length === 0) {
                return reply.code(400).send({ error: 'Bộ Sưu Tập này chưa có hình ảnh mẫu nào ở Mục 8!' });
            }

            const cleanName = (col.name || 'Bo_Suu_Tap')
                .replace(/[^a-zA-Z0-9_\-]/g, '_')
                .replace(/_+/g, '_')
                .substring(0, 40);

            const zipFilename = `Anh_Mau_BST_${cleanName}_Full.zip`;

            reply.raw.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFilename)}"; filename*=UTF-8''${encodeURIComponent(zipFilename)}`
            });

            const archiverModule = require('archiver');
            const archive = new archiverModule.ZipArchive({ zlib: { level: 9 } });
            archive.pipe(reply.raw);

            let addedCount = 0;
            chupRaw.forEach((item, index) => {
                let imgUrl = typeof item === 'object' ? (item.original_url || item.url) : item;
                if (!imgUrl) return;

                const fileName = path.basename(imgUrl.split('?')[0]);
                const filePathOnDisk = path.join(UPLOAD_DIR, fileName);

                if (fs.existsSync(filePathOnDisk)) {
                    const ext = path.extname(fileName) || '.jpg';
                    const fileInZipName = `Anh_Mau_BST_${cleanName}_${index + 1}${ext}`;
                    archive.file(filePathOnDisk, { name: fileInZipName });
                    addedCount++;
                }
            });

            if (addedCount === 0) {
                archive.append('Khong tim thay file anh goc tren he thong.', { name: 'Thong_Bao.txt' });
            }

            await archive.finalize();
        } catch(e) {
            console.error('[download-chup-anh-zip GET]', e);
            if (!reply.raw.headersSent) {
                return reply.code(500).send({ error: e.message });
            }
        }
    });
}

module.exports = collectionsRoutes;
