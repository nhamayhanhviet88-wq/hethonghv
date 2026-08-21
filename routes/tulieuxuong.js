const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

let ffmpeg = null;
try {
    const ffmpegPath = require('ffmpeg-static');
    ffmpeg = require('fluent-ffmpeg');
    if (ffmpegPath) {
        ffmpeg.setFfmpegPath(ffmpegPath);
    }
} catch(err) {
    console.error('[TLXVP] Warning: FFmpeg module not initialized:', err.message);
}

let sharp = null;
try {
    sharp = require('sharp');
} catch(err) {
    console.error('[TLXVP] Warning: Sharp module not initialized:', err.message);
}

function isGD(req) { return req.user && req.user.role === 'giam_doc'; }

module.exports = async function(fastify) {
    // ========== MIGRATION ==========
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS tlxvp_boards (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            columns JSONB DEFAULT '[]',
            display_order INTEGER DEFAULT 0,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS tlxvp_sources (
            id SERIAL PRIMARY KEY,
            board_id INTEGER NOT NULL REFERENCES tlxvp_boards(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS tlxvp_items (
            id SERIAL PRIMARY KEY,
            board_id INTEGER NOT NULL REFERENCES tlxvp_boards(id) ON DELETE CASCADE,
            source_id INTEGER NOT NULL REFERENCES tlxvp_sources(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            data JSONB DEFAULT '{}',
            display_order INTEGER DEFAULT 0,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        // Migration: thêm columns vào tlxvp_sources (Bảng Phụ) và tlxvp_boards (Bảng Chính)
        try {
            await db.exec(`ALTER TABLE tlxvp_sources ADD COLUMN IF NOT EXISTS columns JSONB DEFAULT '[]'`);
            await db.exec(`ALTER TABLE tlxvp_boards ADD COLUMN IF NOT EXISTS columns JSONB DEFAULT '[]'`);
            // Sync columns from sources to board if board columns are empty
            const boards = await db.all(`SELECT id, columns FROM tlxvp_boards`);
            for (const b of boards) {
                const bCols = typeof b.columns === 'string' ? JSON.parse(b.columns) : (b.columns || []);
                if (bCols.length === 0) {
                    const src = await db.get(`SELECT columns FROM tlxvp_sources WHERE board_id = $1 AND columns != '[]'::jsonb LIMIT 1`, [b.id]);
                    if (src && src.columns) {
                        await db.run(`UPDATE tlxvp_boards SET columns = $1 WHERE id = $2`, [JSON.stringify(src.columns), b.id]);
                    }
                }
            }
        } catch(e2) { /* column already exists */ }
        // Migration: thêm updated_by vào tlxvp_items
        try {
            await db.exec(`ALTER TABLE tlxvp_items ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id)`);
        } catch(e3) { /* column already exists */ }
    } catch(e) { console.error('[TLXVP Migration]', e.message); }

    // ===== UPLOAD image (Lưu file raw gốc + Nén bản WebP hiển thị siêu nhẹ) =====
    fastify.post('/api/tlxvp/upload', { preHandler: [authenticate] }, async (request, reply) => {
        const data = await request.file();
        if (!data) return reply.code(400).send({ error: 'Không có file' });
        const dir = path.join(__dirname, '..', 'uploads', 'tlxvp');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        let ext = path.extname(data.filename || '').toLowerCase();
        if (!ext) {
            if (data.mimetype === 'image/jpeg') ext = '.jpg';
            else if (data.mimetype === 'image/png') ext = '.png';
            else if (data.mimetype === 'image/webp') ext = '.webp';
            else if (data.mimetype === 'image/gif') ext = '.gif';
            else ext = '.png';
        }

        const timeStamp = Date.now();
        const rand = Math.random().toString(36).substring(2, 7);
        const rawFileName = `raw_tlxvp_${timeStamp}_${rand}${ext}`;
        const rawFilePath = path.join(dir, rawFileName);
        const buf = await data.toBuffer();

        // 1. Lưu file ảnh gốc 100% không nén (để phục vụ tải ảnh gốc sắc nét)
        fs.writeFileSync(rawFilePath, buf);

        let optFileName = `tlxvp_${timeStamp}_${rand}.webp`;
        let optFilePath = path.join(dir, optFileName);

        // 2. Nén ảnh bản hiển thị WebP siêu nhẹ (giảm 70-90% dung lượng)
        if (sharp && ext !== '.gif') {
            try {
                await sharp(buf)
                    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toFile(optFilePath);
            } catch(e) {
                console.error('[TLXVP Sharp Compress Error]', e.message);
                optFileName = rawFileName;
            }
        } else {
            optFileName = rawFileName;
        }

        return { 
            success: true, 
            url: `/uploads/tlxvp/${optFileName}`,
            raw_url: `/uploads/tlxvp/${rawFileName}` 
        };
    });

    // ===== UPLOAD & COMPRESS video (H.264 MP4, CRF 23, FastStart) =====
    fastify.post('/api/tlxvp/upload-video', { preHandler: [authenticate] }, async (request, reply) => {
        const data = await request.file();
        if (!data) return reply.code(400).send({ error: 'Không có file video' });

        const dir = path.join(__dirname, '..', 'uploads', 'tlxvp', 'videos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const ext = path.extname(data.filename || '.mp4') || '.mp4';
        const rawFileName = `raw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
        const rawFilePath = path.join(dir, rawFileName);

        const optFileName = `video_opt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp4`;
        const optFilePath = path.join(dir, optFileName);

        const buf = await data.toBuffer();
        fs.writeFileSync(rawFilePath, buf);

        // Nén video bằng FFmpeg nếu có thư viện
        if (ffmpeg) {
            try {
                await new Promise((resolve, reject) => {
                    ffmpeg(rawFilePath)
                        .outputOptions([
                            '-c:v libx264',
                            '-crf 23',
                            '-preset fast',
                            '-vf scale=min(1920\\,iw):-2',
                            '-c:a aac',
                            '-b:a 128k',
                            '-movflags +faststart'
                        ])
                        .toFormat('mp4')
                        .on('end', () => resolve())
                        .on('error', (err) => reject(err))
                        .save(optFilePath);
                });

                // Xóa file tạm gốc sau khi nén thành công
                if (fs.existsSync(rawFilePath)) {
                    try { fs.unlinkSync(rawFilePath); } catch(e) {}
                }

                console.log(`[TLXVP] Video compressed successfully: ${optFileName}`);
                return { success: true, url: `/uploads/tlxvp/videos/${optFileName}` };
            } catch(err) {
                console.error('[TLXVP Video Compress Error]', err.message);
                // Fallback nếu nén bị lỗi
                return { success: true, url: `/uploads/tlxvp/videos/${rawFileName}` };
            }
        } else {
            return { success: true, url: `/uploads/tlxvp/videos/${rawFileName}` };
        }
    });

    // ===== GET boards + sources (bảng phụ) + counts =====
    fastify.get('/api/tlxvp/boards', { preHandler: [authenticate] }, async (req) => {
        const boards = await db.all(`
            SELECT b.*, 
                (SELECT COUNT(*)::int FROM tlxvp_items WHERE board_id = b.id) AS item_count
            FROM tlxvp_boards b ORDER BY b.display_order, b.id
        `);
        for (const b of boards) {
            b.columns = typeof b.columns === 'string' ? JSON.parse(b.columns) : (b.columns || []);
            b.sources = await db.all(`
                SELECT s.*, (SELECT COUNT(*)::int FROM tlxvp_items WHERE source_id = s.id) AS item_count
                FROM tlxvp_sources s WHERE s.board_id = $1 ORDER BY s.display_order, s.id
            `, [b.id]);
            for (const s of b.sources) {
                s.columns = typeof s.columns === 'string' ? JSON.parse(s.columns) : (s.columns || []);
            }
        }
        return { boards };
    });

    // ===== CREATE board / Bảng Chính (GĐ only) =====
    fastify.post('/api/tlxvp/boards', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { name, columns } = req.body;
        if (!name || !name.trim()) return reply.code(400).send({ error: 'Tên bảng chính bắt buộc' });
        const maxOrder = await db.get(`SELECT COALESCE(MAX(display_order),0)+1 AS next FROM tlxvp_boards`);
        const row = await db.get(`INSERT INTO tlxvp_boards (name, columns, display_order, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
            [name.trim(), JSON.stringify(columns || []), maxOrder.next, req.user.id]);
        return { success: true, id: row.id };
    });

    // ===== UPDATE board / Bảng Chính (GĐ only) — đổi tên & sửa cột =====
    fastify.patch('/api/tlxvp/boards/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { name, columns } = req.body;
        const sets = []; const params = []; let idx = 1;
        if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name.trim()); }
        if (columns !== undefined) { sets.push(`columns = $${idx++}`); params.push(JSON.stringify(columns)); }
        if (sets.length === 0) return reply.code(400).send({ error: 'Không có dữ liệu' });
        sets.push(`updated_at = NOW()`);
        params.push(req.params.id);
        await db.run(`UPDATE tlxvp_boards SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        return { success: true };
    });

    // ===== DELETE board / Bảng Chính (GĐ only) =====
    fastify.delete('/api/tlxvp/boards/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        await db.run(`DELETE FROM tlxvp_boards WHERE id = $1`, [req.params.id]);
        return { success: true };
    });

    // ===== REORDER boards / Bảng Chính (GĐ only) =====
    fastify.post('/api/tlxvp/boards/reorder', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { order } = req.body;
        if (!Array.isArray(order)) return reply.code(400).send({ error: 'order phải là mảng id' });
        for (let i = 0; i < order.length; i++) {
            await db.run('UPDATE tlxvp_boards SET display_order = $1 WHERE id = $2', [i + 1, Number(order[i])]);
        }
        return { success: true };
    });

    // ===== REORDER items (GĐ only) =====
    fastify.post('/api/tlxvp/items/reorder', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { id, direction, order } = req.body;
        if (Array.isArray(order)) {
            for (let i = 0; i < order.length; i++) {
                await db.run('UPDATE tlxvp_items SET display_order = $1 WHERE id = $2', [i + 1, Number(order[i])]);
            }
            return { success: true };
        }
        if (id && direction) {
            const currItem = await db.get('SELECT * FROM tlxvp_items WHERE id = $1', [id]);
            if (!currItem) return reply.code(404).send({ error: 'Không tìm thấy item' });
            const groupItems = await db.all('SELECT id, display_order FROM tlxvp_items WHERE source_id = $1 ORDER BY COALESCE(display_order, 0) ASC, id ASC', [currItem.source_id]);
            const currIdx = groupItems.findIndex(x => Number(x.id) === Number(id));
            if (currIdx !== -1) {
                let targetIdx = direction === 'up' ? currIdx - 1 : currIdx + 1;
                if (targetIdx >= 0 && targetIdx < groupItems.length) {
                    const temp = groupItems[currIdx];
                    groupItems[currIdx] = groupItems[targetIdx];
                    groupItems[targetIdx] = temp;
                    for (let i = 0; i < groupItems.length; i++) {
                        await db.run('UPDATE tlxvp_items SET display_order = $1 WHERE id = $2', [i + 1, Number(groupItems[i].id)]);
                    }
                }
            }
            return { success: true };
        }
        return reply.code(400).send({ error: 'Tham số không hợp lệ' });
    });

    // ===== CREATE source / Bảng Phụ (GĐ only) — chỉ cần tên =====
    fastify.post('/api/tlxvp/sources', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { board_id, name } = req.body;
        if (!board_id || !name || !name.trim()) return reply.code(400).send({ error: 'Thiếu thông tin' });
        const maxOrder = await db.get(`SELECT COALESCE(MAX(display_order),0)+1 AS next FROM tlxvp_sources WHERE board_id=$1`, [board_id]);
        const row = await db.get(`INSERT INTO tlxvp_sources (board_id, name, columns, display_order) VALUES ($1, $2, '[]', $3) RETURNING id`,
            [board_id, name.trim(), maxOrder.next]);
        return { success: true, id: row.id };
    });

    // ===== UPDATE source / Bảng Phụ (GĐ only) — tên + columns =====
    fastify.patch('/api/tlxvp/sources/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { name, columns } = req.body;
        const sets = []; const params = []; let idx = 1;
        if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name.trim()); }
        if (columns !== undefined) { sets.push(`columns = $${idx++}`); params.push(JSON.stringify(columns)); }
        if (sets.length === 0) return reply.code(400).send({ error: 'Không có dữ liệu' });
        params.push(req.params.id);
        await db.run(`UPDATE tlxvp_sources SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        return { success: true };
    });

    // ===== DELETE source / Bảng Phụ (GĐ only) =====
    fastify.delete('/api/tlxvp/sources/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        await db.run(`DELETE FROM tlxvp_sources WHERE id = $1`, [req.params.id]);
        return { success: true };
    });

    // ===== GET items =====
    fastify.get('/api/tlxvp/items', { preHandler: [authenticate] }, async (req) => {
        const { board_id, source_id } = req.query;
        let where = 'WHERE 1=1'; const params = []; let idx = 1;
        if (board_id) { where += ` AND i.board_id = $${idx++}`; params.push(Number(board_id)); }
        if (source_id) { where += ` AND i.source_id = $${idx++}`; params.push(Number(source_id)); }
        const items = await db.all(`
            SELECT i.*, s.name AS source_name,
                u_created.full_name AS created_by_name,
                u_updated.full_name AS updated_by_name
            FROM tlxvp_items i
            LEFT JOIN tlxvp_sources s ON i.source_id = s.id
            LEFT JOIN users u_created ON i.created_by = u_created.id
            LEFT JOIN users u_updated ON i.updated_by = u_updated.id
            ${where} ORDER BY s.display_order, s.id, i.display_order, i.id
        `, params);
        items.forEach(function(it) { it.data = typeof it.data === 'string' ? JSON.parse(it.data) : (it.data || {}); });
        return { items };
    });

    // ===== CREATE item (GĐ only) =====
    fastify.post('/api/tlxvp/items', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { board_id, source_id, name, data } = req.body;
        if (!board_id || !source_id || !name || !name.trim()) return reply.code(400).send({ error: 'Thiếu thông tin' });
        const maxOrder = await db.get(`SELECT COALESCE(MAX(display_order),0)+1 AS next FROM tlxvp_items WHERE source_id=$1`, [source_id]);
        const row = await db.get(`INSERT INTO tlxvp_items (board_id, source_id, name, data, display_order, created_by, updated_by, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$6,NOW()) RETURNING id`,
            [board_id, source_id, name.trim(), JSON.stringify(data || {}), maxOrder.next, req.user.id]);
        return { success: true, id: row.id };
    });

    // Helper trích xuất danh sách file ảnh trong data item
    function extractImageUrls(obj) {
        const urls = [];
        if (!obj) return urls;
        Object.values(obj).forEach(v => {
            if (typeof v === 'string' && v.startsWith('/uploads/tlxvp/')) {
                urls.push(v);
            } else if (Array.isArray(v)) {
                v.forEach(item => { if (typeof item === 'string' && item.startsWith('/uploads/tlxvp/')) urls.push(item); });
            } else if (typeof v === 'string' && v.startsWith('[')) {
                try {
                    const arr = JSON.parse(v);
                    if (Array.isArray(arr)) arr.forEach(item => { if (typeof item === 'string' && item.startsWith('/uploads/tlxvp/')) urls.push(item); });
                } catch(e) {}
            }
        });
        return urls;
    }

    // Helper xóa file trên server khi không sử dụng
    function deleteFileIfLocal(url) {
        if (!url || typeof url !== 'string' || !url.startsWith('/uploads/tlxvp/')) return;
        const relativePath = url.replace(/^\/uploads\/tlxvp\//, '');
        const dirPath = path.join(__dirname, '..', 'uploads', 'tlxvp');
        const filePath = path.join(dirPath, relativePath);
        if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); console.log('[TLXVP] Deleted unused file:', relativePath); } catch (e) {}
        }
        // Xóa luôn file raw_ gốc tương ứng nếu có
        if (!relativePath.startsWith('raw_') && relativePath.startsWith('tlxvp_')) {
            const idPart = relativePath.replace(/^tlxvp_/, '').replace(/\.webp$/i, '');
            try {
                if (fs.existsSync(dirPath)) {
                    const files = fs.readdirSync(dirPath);
                    files.forEach(f => {
                        if (f.startsWith('raw_tlxvp_' + idPart)) {
                            try { fs.unlinkSync(path.join(dirPath, f)); console.log('[TLXVP] Deleted unused raw file:', f); } catch(e){}
                        }
                    });
                }
            } catch(e){}
        }
    }

    // ===== UPDATE item (GĐ only) =====
    fastify.patch('/api/tlxvp/items/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { name, data } = req.body;
        const sets = []; const params = []; let idx = 1;
        if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name.trim()); }
        if (data !== undefined) {
            // Tự động xóa file ảnh cũ khỏi server nếu bị thay thế hoặc xóa
            const oldItem = await db.get('SELECT data FROM tlxvp_items WHERE id = $1', [req.params.id]);
            if (oldItem && oldItem.data) {
                const oldData = typeof oldItem.data === 'string' ? JSON.parse(oldItem.data) : (oldItem.data || {});
                const oldUrls = extractImageUrls(oldData);
                const newUrls = extractImageUrls(data);
                oldUrls.forEach(url => {
                    if (!newUrls.includes(url)) {
                        deleteFileIfLocal(url);
                    }
                });
            }
            sets.push(`data = $${idx++}`); params.push(JSON.stringify(data));
        }
        if (sets.length === 0) return reply.code(400).send({ error: 'Không có dữ liệu' });
        sets.push(`updated_at = NOW()`);
        sets.push(`updated_by = $${idx++}`); params.push(req.user.id);
        params.push(req.params.id);
        await db.run(`UPDATE tlxvp_items SET ${sets.join(', ')} WHERE id = $${idx}`, params);
        return { success: true };
    });

    // ===== DELETE item (GĐ only) =====
    fastify.delete('/api/tlxvp/items/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!isGD(req)) return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        // Xóa tất cả file ảnh của item này trên server
        const oldItem = await db.get('SELECT data FROM tlxvp_items WHERE id = $1', [req.params.id]);
        if (oldItem && oldItem.data) {
            const oldData = typeof oldItem.data === 'string' ? JSON.parse(oldItem.data) : (oldItem.data || {});
            const oldUrls = extractImageUrls(oldData);
            oldUrls.forEach(url => deleteFileIfLocal(url));
        }
        await db.run(`DELETE FROM tlxvp_items WHERE id = $1`, [req.params.id]);
        return { success: true };
    });
};
