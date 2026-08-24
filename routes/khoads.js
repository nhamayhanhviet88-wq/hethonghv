// ========== KHO VIDEO/ẢNH ADS ROUTES ==========
const path = require('path');
const fs = require('fs');
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'khoads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

module.exports = async function (fastify, opts) {
    // 0. Auto migration tables
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS kho_ads_linh_vuc (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                code VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.run(`ALTER TABLE kho_ads_linh_vuc ADD COLUMN IF NOT EXISTS code VARCHAR(50)`);

        const countRes = await db.get(`SELECT COUNT(*) as count FROM kho_ads_linh_vuc`);
        const count = parseInt((countRes && countRes.count) || 0);
        if (count === 0) {
            await db.run(`INSERT INTO kho_ads_linh_vuc (name, code) VALUES ('Công Ty', 'CT'), ('Áo Lớp', 'AL'), ('Mầm Non', 'MN'), ('Xưởng May', 'XM'), ('Spa / Mỹ Phẩm', 'SPA') ON CONFLICT DO NOTHING`);
        }
        // Gán mã mặc định nếu chưa có
        await db.run(`UPDATE kho_ads_linh_vuc SET code = 'CT' WHERE (name ILIKE '%công ty%') AND (code IS NULL OR code = '' OR code ILIKE 'ADS%')`);
        await db.run(`UPDATE kho_ads_linh_vuc SET code = 'AL' WHERE (name ILIKE '%áo lớp%') AND (code IS NULL OR code = '' OR code ILIKE 'ADS%')`);
        await db.run(`UPDATE kho_ads_linh_vuc SET code = 'MN' WHERE (name ILIKE '%mầm non%') AND (code IS NULL OR code = '' OR code ILIKE 'ADS%')`);
        await db.run(`UPDATE kho_ads_linh_vuc SET code = 'XM' WHERE (name ILIKE '%xưởng%') AND (code IS NULL OR code = '' OR code ILIKE 'ADS%')`);
        await db.run(`UPDATE kho_ads_linh_vuc SET code = 'SPA' WHERE (name ILIKE '%spa%' OR name ILIKE '%mỹ phẩm%' OR name ILIKE '%thẩm mỹ%') AND (code IS NULL OR code = '' OR code ILIKE 'ADS%')`);
        // Loại bỏ tiền tố ADS lặp ở bất kỳ mã nào trong DB
        await db.run(`UPDATE kho_ads_linh_vuc SET code = REGEXP_REPLACE(code, '^ADS', '', 'i') WHERE code ILIKE 'ADS%'`);
    } catch(e) { console.error('[kho_ads_linh_vuc migration]', e); }

    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS kho_ads_items (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                linh_vuc VARCHAR(255) NOT NULL,
                media_type VARCHAR(50) DEFAULT 'video',
                drive_url TEXT,
                thumbnail_url TEXT,
                description TEXT,
                task_id INT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.run(`ALTER TABLE kho_ads_items ADD COLUMN IF NOT EXISTS task_id INT`);
    } catch(e) { console.error('[kho_ads_items migration]', e); }

    try {
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS kho_ads_approved BOOLEAN DEFAULT FALSE`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS kho_ads_approved_by INT`);
        await db.run(`ALTER TABLE board_tasks ADD COLUMN IF NOT EXISTS kho_ads_approved_at TIMESTAMP`);
    } catch(e) { console.error('[board_tasks kho_ads_approved migration]', e); }

    // 1. GET /api/kho-ads/linh-vuc
    fastify.get('/api/kho-ads/linh-vuc', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rows = await db.all(`SELECT * FROM kho_ads_linh_vuc ORDER BY id ASC`);
            return reply.send({ ok: true, linh_vuc_list: rows });
        } catch (e) {
            console.error('[kho-ads linh-vuc GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 1b. GET /api/kho-ads/marketing-tasks — Lấy danh sách task phòng Marketing để chọn liên kết
    fastify.get('/api/kho-ads/marketing-tasks', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            const isDirector = ['giam_doc', 'admin', 'ban_giam_doc'].includes(userRole);

            let permissionClause = '';
            const queryParams = [];

            if (!isDirector) {
                permissionClause = `AND (t.assigned_to = ? OR t.created_by = ? OR (',' || COALESCE(t.assigned_to_ids, '') || ',') LIKE ?)`;
                queryParams.push(userId, userId, `%,${userId},%`);
            }

            const onlyIncomplete = req.query?.only_incomplete === 'true';
            let incompleteClause = '';
            if (onlyIncomplete) {
                incompleteClause = `AND (SELECT COUNT(*) FROM kho_ads_items ki WHERE ki.task_id = t.id) < COALESCE(t.target_quantity, 1)`;
            }

            const rows = await db.all(`
                SELECT t.id, t.title, t.task_code, t.dept_task_no, t.department_id, 
                       t.assigned_to, t.created_by, t.assigned_to_ids,
                       COALESCE(t.ads_linh_vuc, 'Công Ty') as ads_linh_vuc, 
                       COALESCE(t.target_quantity, 1) as target_quantity, 
                       t.created_at, d.name as department_name
                FROM board_tasks t
                LEFT JOIN departments d ON t.department_id = d.id
                WHERE (t.department_id = 2 OR UPPER(d.name) LIKE '%MARKETING%')
                  AND (
                      (t.ads_linh_vuc IS NOT NULL AND TRIM(t.ads_linh_vuc) != '')
                      OR t.guide_link LIKE '%Tư Liệu 5%'
                      OR t.guide_link LIKE '%Video / Ảnh Ads%'
                  )
                  ${incompleteClause}
                  ${permissionClause}
                ORDER BY t.id DESC
                LIMIT 100
            `, queryParams);
            return reply.send({ ok: true, tasks: rows });
        } catch (e) {
            console.error('[marketing-tasks GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 1c. POST /api/kho-ads/upload-file — Upload ảnh Thumbnail (hỗ trợ Ctrl+V dán ảnh & resize nén nhẹ)
    fastify.post('/api/kho-ads/upload-file', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const data = await req.file();
            if (!data) return reply.code(400).send({ error: 'Không tìm thấy file tải lên' });

            const rawOriginalName = data.filename || 'file';
            const ext = path.extname(rawOriginalName).toLowerCase() || '.png';
            const timestamp = Date.now();
            const randStr = Math.random().toString(36).substring(2, 8);

            const origFileName = `ads_orig_${timestamp}_${randStr}${ext}`;
            const webFileName = `ads_thumb_${timestamp}_${randStr}.jpg`;
            const origPath = path.join(UPLOAD_DIR, origFileName);
            const webPath = path.join(UPLOAD_DIR, webFileName);

            const writeStream = fs.createWriteStream(origPath);
            await new Promise((resolve, reject) => {
                data.file.pipe(writeStream);
                data.file.on('end', resolve);
                data.file.on('error', reject);
            });

            // Resize & nén dung lượng nhẹ (Max 600px, quality 80)
            try {
                const sharp = require('sharp');
                await sharp(origPath)
                    .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toFile(webPath);
            } catch (sharpErr) {
                console.error('[sharp resize error, fallback to original copy]', sharpErr);
                fs.copyFileSync(origPath, webPath);
            }

            const url = `/uploads/khoads/${webFileName}`;
            return reply.send({ ok: true, url });
        } catch (e) {
            console.error('[kho-ads upload-file POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 2. POST /api/kho-ads/linh-vuc (Director/Admin only)
    fastify.post('/api/kho-ads/linh-vuc', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const isGiamDoc = req.user.role === 'giam_doc' || req.user.role === 'admin' || !!req.user.is_admin;
            if (!isGiamDoc) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc / Admin mới có quyền cấu hình Lĩnh Vực Ads!' });
            }
            const { name, code } = req.body || {};
            if (!name || !name.trim()) {
                return reply.code(400).send({ error: 'Tên Lĩnh Vực Ads không được để trống' });
            }
            const trimmedName = name.trim();
            const trimmedCode = code ? code.trim().toUpperCase() : null;
            const result = await db.get(
                `INSERT INTO kho_ads_linh_vuc (name, code) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET code=EXCLUDED.code, name=EXCLUDED.name RETURNING *`,
                [trimmedName, trimmedCode]
            );
            return reply.send({ ok: true, item: result });
        } catch (e) {
            console.error('[kho-ads linh-vuc POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 3. PUT /api/kho-ads/linh-vuc/:id (Edit Linh Vuc Name & Code - Director/Admin only)
    fastify.put('/api/kho-ads/linh-vuc/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const isGiamDoc = req.user.role === 'giam_doc' || req.user.role === 'admin' || !!req.user.is_admin;
            if (!isGiamDoc) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc / Admin mới có quyền cấu hình Lĩnh Vực Ads!' });
            }
            const id = req.params.id;
            const { name, code } = req.body || {};
            if (!name || !name.trim()) {
                return reply.code(400).send({ error: 'Tên Lĩnh Vực Ads không được để trống' });
            }
            const trimmedName = name.trim();
            const trimmedCode = code ? code.trim().toUpperCase() : null;

            const existing = await db.get(`SELECT * FROM kho_ads_linh_vuc WHERE id = $1`, [id]);
            if (!existing) return reply.code(404).send({ error: 'Không tìm thấy Lĩnh Vực Ads' });

            const oldName = existing.name;

            const result = await db.get(
                `UPDATE kho_ads_linh_vuc SET name = $1, code = $2 WHERE id = $3 RETURNING *`,
                [trimmedName, trimmedCode, id]
            );

            // Cascade update items using oldName
            if (oldName !== trimmedName) {
                await db.run(`UPDATE kho_ads_items SET linh_vuc = $1 WHERE linh_vuc = $2`, [trimmedName, oldName]);
            }

            return reply.send({ ok: true, item: result });
        } catch (e) {
            console.error('[kho-ads linh-vuc PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 3b. DELETE /api/kho-ads/linh-vuc/:id (Director/Admin only)
    fastify.delete('/api/kho-ads/linh-vuc/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const isGiamDoc = req.user.role === 'giam_doc' || req.user.role === 'admin' || !!req.user.is_admin;
            if (!isGiamDoc) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc / Admin mới có quyền cấu hình Lĩnh Vực Ads!' });
            }
            const id = req.params.id;
            await db.run(`DELETE FROM kho_ads_linh_vuc WHERE id = $1`, [id]);
            return reply.send({ ok: true });
        } catch (e) {
            console.error('[kho-ads linh-vuc DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 4a. GET /api/kho-ads/tasks-grouped (Mục 1: Theo Công Việc - Phân quyền theo Ảnh 1)
    fastify.get('/api/kho-ads/tasks-grouped', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const user = req.user || {};
            const userRole = (user.role || '').toLowerCase();
            const userId = Number(user.id);
            const deptId = user.department_id ? Number(user.department_id) : 0;

            const isGiamDoc = userRole === 'giam_doc' || userRole === 'admin' || userRole === 'ban_giam_doc' || !!user.is_admin;
            const isQuanLy = userRole === 'quan_ly' || userRole === 'quan_ly_cap_cao' || userRole === 'quan_ly_xuong';
            const isTruongPhong = userRole === 'truong_phong' || userRole === 'leader' || userRole === 'truong_nhom';

            let taskPermClause = '';
            const queryParams = [];

            if (isGiamDoc) {
                taskPermClause = '';
            } else if (isQuanLy) {
                taskPermClause = `AND (
                    t.assigned_to IN (SELECT id FROM users WHERE department_id = $1 OR department_id IN (SELECT id FROM departments WHERE parent_id = $1))
                    OR t.created_by IN (SELECT id FROM users WHERE department_id = $1 OR department_id IN (SELECT id FROM departments WHERE parent_id = $1))
                    OR t.assigned_to = $2 OR t.created_by = $2
                )`;
                queryParams.push(deptId, userId);
            } else if (isTruongPhong) {
                taskPermClause = `AND (
                    t.assigned_to IN (SELECT id FROM users WHERE department_id = $1 OR managed_by_user_id = $2)
                    OR t.created_by IN (SELECT id FROM users WHERE department_id = $1 OR managed_by_user_id = $2)
                    OR t.assigned_to = $2 OR t.created_by = $2
                )`;
                queryParams.push(deptId, userId);
            } else {
                taskPermClause = `AND (t.assigned_to = $1 OR t.created_by = $1 OR (',' || COALESCE(t.assigned_to_ids, '') || ',') LIKE $2)`;
                queryParams.push(userId, `%,${userId},%`);
            }

            const sqlTasks = `
                SELECT t.id, t.title, t.task_code, t.target_quantity, t.created_at, t.assigned_to, t.created_by,
                       t.kho_ads_approved, t.kho_ads_approved_by, t.kho_ads_approved_at,
                       u.full_name as assignee_name, u_creator.full_name as creator_name,
                       u_app.full_name as kho_ads_approved_by_name, d.name as department_name
                FROM board_tasks t
                LEFT JOIN users u ON t.assigned_to = u.id
                LEFT JOIN users u_creator ON t.created_by = u_creator.id
                LEFT JOIN users u_app ON t.kho_ads_approved_by = u_app.id
                LEFT JOIN departments d ON t.department_id = d.id
                WHERE (t.ads_linh_vuc IS NOT NULL OR t.guide_link LIKE '%Tư Liệu 5%' OR t.guide_link LIKE '%Video / Ảnh Ads%')
                  AND EXISTS (SELECT 1 FROM kho_ads_items ki WHERE ki.task_id = t.id)
                ${taskPermClause}
                ORDER BY t.id DESC
            `;

            const tasks = await db.all(sqlTasks, queryParams);

            const tasksWithItems = await Promise.all(tasks.map(async (task) => {
                const items = await db.all(`
                    SELECT i.*, u.full_name as created_by_name,
                           c.id as test_campaign_id,
                           c.campaign_name as test_campaign_name,
                           c.channel_name as test_channel_name,
                           c.post_id as test_post_id,
                           c.camp_id as test_camp_id,
                           c.status as test_campaign_status,
                           c.created_at as test_campaign_created_at,
                           (CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END) as has_test_campaign
                    FROM kho_ads_items i
                    LEFT JOIN users u ON i.created_by = u.id
                    LEFT JOIN LATERAL (
                        SELECT id, campaign_name, channel_name, post_id, camp_id, status, created_at
                        FROM ads_campaigns
                        WHERE kho_ads_item_id = i.id
                        ORDER BY id DESC
                        LIMIT 1
                    ) c ON TRUE
                    WHERE i.task_id = $1
                    ORDER BY i.id ASC
                `, [task.id]);
                return { ...task, items };
            }));

            return reply.send({ ok: true, tasks: tasksWithItems });
        } catch (e) {
            console.error('[kho-ads tasks-grouped GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 4c. POST /api/kho-ads/tasks/:taskId/approve — Phê duyệt Tư Liệu Ads Công Việc (Người Giao Việc / Giám Đốc)
    fastify.post('/api/kho-ads/tasks/:taskId/approve', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const taskId = Number(req.params.taskId);
            const user = req.user || {};
            const userId = Number(user.id);
            const userRole = (user.role || '').toLowerCase();

            const task = await db.get(`SELECT * FROM board_tasks WHERE id = $1 LIMIT 1`, [taskId]);
            if (!task) {
                return reply.code(404).send({ error: 'Không tìm thấy công việc!' });
            }

            const isDirector = ['giam_doc', 'admin', 'ban_giam_doc', 'quan_ly_cap_cao'].includes(userRole) || !!user.is_admin;
            const isAssignor = Number(task.created_by) === userId;

            if (!isAssignor && !isDirector) {
                return reply.code(403).send({ error: 'Chỉ CHÍNH NGƯỜI GIAO VIỆC (hoặc Ban Giám Đốc) mới có quyền Phê Duyệt Tư Liệu Ads Công Việc tại Kho Ads!' });
            }

            // Check Condition 1: Must have items in kho_ads_items
            const items = await db.all(`SELECT id FROM kho_ads_items WHERE task_id = $1`, [taskId]);
            if (items.length === 0) {
                return reply.code(400).send({ error: 'Công việc này chưa có bất kỳ Tư Liệu Ads nào được tải lên Kho Ads!' });
            }

            await db.run(`
                UPDATE board_tasks 
                SET kho_ads_approved = TRUE, kho_ads_approved_by = $1, kho_ads_approved_at = NOW(), updated_at = NOW()
                WHERE id = $2
            `, [userId, taskId]);

            const updatedTask = await db.get(`
                SELECT t.*, u.full_name as kho_ads_approved_by_name 
                FROM board_tasks t 
                LEFT JOIN users u ON t.kho_ads_approved_by = u.id 
                WHERE t.id = $1
            `, [taskId]);

            return reply.send({ 
                ok: true, 
                message: '🎉 Đã phê duyệt Tư Liệu Ads Công Việc thành công!',
                kho_ads_approved: true,
                kho_ads_approved_by_name: updatedTask.kho_ads_approved_by_name || user.full_name || user.username
            });
        } catch (e) {
            console.error('[kho-ads task approve POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 4b. GET /api/kho-ads/items (Mục 2: Kho Ads Cá Nhân - Giám Đốc/Admin thấy hết, còn lại CHỈ xem bài CHÍNH MÌNH)
    fastify.get('/api/kho-ads/items', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const user = req.user || {};
            const userRole = (user.role || '').toLowerCase();
            const userId = Number(user.id);

            const isGiamDoc = userRole === 'giam_doc' || userRole === 'admin' || userRole === 'ban_giam_doc' || !!user.is_admin;

            let whereClause = '';
            const queryParams = [];

            if (isGiamDoc) {
                // Giám Đốc / Admin: Xem được TẤT CẢ tư liệu trong Kho Ads
                whereClause = '';
            } else {
                // Tất cả nhân sự còn lại (Quản lý, Trưởng phòng, Nhân viên): CHỈ xem bài do CHÍNH MÌNH tạo
                whereClause = `WHERE i.created_by = $1`;
                queryParams.push(userId);
            }

            const sql = `
                SELECT i.*, 
                       u.full_name as created_by_name, 
                       t.task_code, 
                       t.title as task_title, 
                       t.dept_task_no, 
                       t.kho_ads_approved, 
                       d.name as department_name,
                       c.id as test_campaign_id,
                       c.campaign_name as test_campaign_name,
                       c.channel_name as test_channel_name,
                       c.post_id as test_post_id,
                       c.camp_id as test_camp_id,
                       c.status as test_campaign_status,
                       c.created_at as test_campaign_created_at,
                       (CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END) as has_test_campaign
                FROM kho_ads_items i
                LEFT JOIN users u ON i.created_by = u.id
                LEFT JOIN board_tasks t ON i.task_id = t.id
                LEFT JOIN departments d ON t.department_id = d.id
                LEFT JOIN LATERAL (
                    SELECT id, campaign_name, channel_name, post_id, camp_id, status, created_at
                    FROM ads_campaigns
                    WHERE kho_ads_item_id = i.id
                    ORDER BY id DESC
                    LIMIT 1
                ) c ON TRUE
                ${whereClause}
                ORDER BY i.id DESC
            `;

            const rows = await db.all(sql, queryParams);
            return reply.send({ ok: true, items: rows });
        } catch (e) {
            console.error('[kho-ads items GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

async function checkDriveUrlDuplicate(driveUrl, excludeItemId = null) {
    let cleanUrl = (driveUrl || '').trim();
    if (!cleanUrl) return null;
    if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
    }
    const rawNoProto = cleanUrl.replace(/^https?:\/\//i, '');

    let query = `SELECT id, title, created_by FROM kho_ads_items WHERE (LOWER(TRIM(drive_url)) = LOWER($1) OR LOWER(TRIM(drive_url)) = LOWER($2))`;
    const params = [cleanUrl, rawNoProto];

    if (excludeItemId) {
        query += ` AND id != $3`;
        params.push(Number(excludeItemId));
    }

    return await db.get(query, params);
}

    // 5. POST /api/kho-ads/items (Create new Ads Item)
    fastify.post('/api/kho-ads/items', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { title, linh_vuc, media_type, drive_url, thumbnail_url, description, task_id } = req.body || {};
            if (!title || !title.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập Tiêu đề Tư Liệu Ads' });
            }
            if (!linh_vuc || !linh_vuc.trim()) {
                return reply.code(400).send({ error: 'Vui lòng chọn Lĩnh Vực Ads' });
            }

            let driveLink = (drive_url || '').trim();
            if (driveLink) {
                if (!/^https?:\/\//i.test(driveLink)) {
                    driveLink = 'https://' + driveLink;
                }
                const driveRegex = /^https?:\/\/(?:drive|docs)\.google\.com\/.+/i;
                if (!driveRegex.test(driveLink)) {
                    return reply.code(400).send({ error: 'Đường dẫn phải là link Google Drive hợp lệ (https://drive.google.com/...)' });
                }
                const dup = await checkDriveUrlDuplicate(driveLink);
                if (dup) {
                    return reply.code(400).send({ error: `Link Google Drive đã tồn tại trên hệ thống (đã được sử dụng cho tư liệu "${dup.title}")! Vui lòng nhập link Drive riêng biệt.` });
                }
            }

            const result = await db.get(`
                INSERT INTO kho_ads_items (title, linh_vuc, media_type, drive_url, thumbnail_url, description, created_by, task_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [title.trim(), linh_vuc.trim(), media_type || 'video', driveLink, (thumbnail_url || '').trim(), (description || '').trim(), req.user.id, task_id ? Number(task_id) : null]);

            return reply.send({ ok: true, item: result });
        } catch (e) {
            console.error('[kho-ads items POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 5b. POST /api/kho-ads/items/batch (Create N Ads Items in batch for a task)
    fastify.post('/api/kho-ads/items/batch', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { task_id, items } = req.body || {};
            if (!task_id) {
                return reply.code(400).send({ error: 'Bắt buộc chọn Công Việc liên kết (PHÒNG MARKETING)' });
            }
            if (!Array.isArray(items) || items.length === 0) {
                return reply.code(400).send({ error: 'Danh sách tư liệu ads không được để trống' });
            }

            // Verify task target_quantity & kho_ads_approved status
            const userRole = (req.user?.role || '').toLowerCase();
            const isDirector = ['giam_doc', 'admin', 'ban_giam_doc', 'quan_ly_cap_cao'].includes(userRole) || !!req.user?.is_admin;
            
            const task = await db.get(`SELECT id, target_quantity, kho_ads_approved FROM board_tasks WHERE id = $1`, [task_id]);
            if (task && task.kho_ads_approved && !isDirector) {
                return reply.code(400).send({ error: '⚠️ Tư liệu Ads của công việc này đã được Phê Duyệt. Chỉ Giám Đốc mới có quyền chỉnh sửa!' });
            }

            const targetQty = (task && task.target_quantity) ? Number(task.target_quantity) : 1;
            
            if (items.length < targetQty) {
                return reply.code(400).send({ error: `Công việc này yêu cầu nhập đủ ${targetQty} tư liệu ads! Bạn mới nhập ${items.length}/${targetQty} tư liệu.` });
            }

            const createdItems = [];
            const userId = req.user.id;
            const driveSet = new Set();

            for (let idx = 0; idx < items.length; idx++) {
                const it = items[idx];
                const title = (it.title || '').trim();
                const linh_vuc = (it.linh_vuc || '').trim();
                const media_type = (it.media_type || 'video').trim();
                let drive_url = (it.drive_url || '').trim();
                if (drive_url && !/^https?:\/\//i.test(drive_url)) {
                    drive_url = 'https://' + drive_url;
                }
                const thumbnail_url = (it.thumbnail_url || '').trim();
                const description = (it.description || '').trim();

                if (!title) {
                    return reply.code(400).send({ error: `Tư liệu #${idx + 1} chưa có Tên Video/Ads` });
                }
                if (!thumbnail_url) {
                    return reply.code(400).send({ error: `Tư liệu #${idx + 1} (${title}) chưa dán Ảnh Đại Diện (Ctrl + V)!` });
                }
                if (!description) {
                    return reply.code(400).send({ error: `Tư liệu #${idx + 1} (${title}) chưa có Content Ads` });
                }
                if (!drive_url) {
                    return reply.code(400).send({ error: `Tư liệu #${idx + 1} (${title}) chưa có Link Google Drive` });
                }

                const normLower = drive_url.toLowerCase();
                if (driveSet.has(normLower)) {
                    return reply.code(400).send({ error: `Tư liệu #${idx + 1} (${title}) có Link Google Drive bị TRÙNG LẶP với tư liệu khác trong cùng đợt nhập! Mỗi tư liệu phải có 1 link Drive riêng biệt.` });
                }
                driveSet.add(normLower);

                let resItem;
                if (it.id) {
                    const dup = await checkDriveUrlDuplicate(drive_url, it.id);
                    if (dup) {
                        return reply.code(400).send({ error: `Tư liệu #${idx + 1} (${title}) có Link Google Drive đã tồn tại trên hệ thống (được sử dụng cho tư liệu "${dup.title}")! Vui lòng dán link Drive riêng biệt.` });
                    }
                    resItem = await db.get(`
                        UPDATE kho_ads_items 
                        SET title = $1, linh_vuc = $2, media_type = $3, drive_url = $4, thumbnail_url = $5, description = $6
                        WHERE id = $7 AND task_id = $8
                        RETURNING *
                    `, [title, linh_vuc, media_type, drive_url, thumbnail_url, description, Number(it.id), Number(task_id)]);
                } else {
                    const dup = await checkDriveUrlDuplicate(drive_url);
                    if (dup) {
                        return reply.code(400).send({ error: `Tư liệu #${idx + 1} (${title}) có Link Google Drive đã tồn tại trên hệ thống (được sử dụng cho tư liệu "${dup.title}")! Vui lòng dán link Drive riêng biệt.` });
                    }
                    resItem = await db.get(`
                        INSERT INTO kho_ads_items (title, linh_vuc, media_type, drive_url, thumbnail_url, description, created_by, task_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING *
                    `, [title, linh_vuc, media_type, drive_url, thumbnail_url, description, userId, Number(task_id)]);
                }

                createdItems.push(resItem);
            }

            return reply.send({ ok: true, count: createdItems.length, items: createdItems });
        } catch (e) {
            console.error('[kho-ads items batch POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 6. PUT /api/kho-ads/items/:id (Edit Ads Item)
    fastify.put('/api/kho-ads/items/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const id = req.params.id;
            const existing = await db.get(`SELECT * FROM kho_ads_items WHERE id = $1`, [id]);
            if (!existing) return reply.code(404).send({ error: 'Không tìm thấy Tư Liệu Ads' });

            const isGiamDoc = ['giam_doc', 'admin', 'ban_giam_doc', 'quan_ly_cap_cao'].includes((req.user.role || '').toLowerCase()) || !!req.user.is_admin;
            const isCreator = Number(req.user.id) === Number(existing.created_by);

            if (existing.task_id && !isGiamDoc) {
                const parentTask = await db.get(`SELECT kho_ads_approved FROM board_tasks WHERE id = $1`, [existing.task_id]);
                if (parentTask && parentTask.kho_ads_approved) {
                    return reply.code(400).send({ error: '⚠️ Tư liệu Ads này thuộc công việc đã được Phê Duyệt. Chỉ Giám Đốc mới có quyền chỉnh sửa!' });
                }
            }

            if (!isGiamDoc && !isCreator) {
                return reply.code(403).send({ error: 'Bạn không có quyền chỉnh sửa tư liệu này' });
            }

            const { title, linh_vuc, media_type, drive_url, thumbnail_url, description, task_id } = req.body || {};
            let driveLink = drive_url !== undefined ? drive_url.trim() : existing.drive_url;
            if (driveLink) {
                if (!/^https?:\/\//i.test(driveLink)) {
                    driveLink = 'https://' + driveLink;
                }
                const driveRegex = /^https?:\/\/(?:drive|docs)\.google\.com\/.+/i;
                if (!driveRegex.test(driveLink)) {
                    return reply.code(400).send({ error: 'Đường dẫn phải là link Google Drive hợp lệ (https://drive.google.com/...)' });
                }
                const dup = await checkDriveUrlDuplicate(driveLink, id);
                if (dup) {
                    return reply.code(400).send({ error: `Link Google Drive đã tồn tại trên hệ thống (đã được sử dụng cho tư liệu "${dup.title}")! Vui lòng dán link Drive riêng biệt.` });
                }
            }

            const result = await db.get(`
                UPDATE kho_ads_items
                SET title = $1, linh_vuc = $2, media_type = $3, drive_url = $4, thumbnail_url = $5, description = $6, task_id = $7
                WHERE id = $8
                RETURNING *
            `, [
                title !== undefined ? title.trim() : existing.title,
                linh_vuc !== undefined ? linh_vuc.trim() : existing.linh_vuc,
                media_type !== undefined ? media_type : existing.media_type,
                driveLink,
                thumbnail_url !== undefined ? thumbnail_url.trim() : existing.thumbnail_url,
                description !== undefined ? description.trim() : existing.description,
                task_id !== undefined ? (task_id ? Number(task_id) : null) : existing.task_id,
                id
            ]);

            return reply.send({ ok: true, item: result });
        } catch (e) {
            console.error('[kho-ads items PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // 7. DELETE /api/kho-ads/items/:id (Delete Ads Item)
    fastify.delete('/api/kho-ads/items/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const id = req.params.id;
            const existing = await db.get(`SELECT * FROM kho_ads_items WHERE id = $1`, [id]);
            if (!existing) return reply.code(404).send({ error: 'Không tìm thấy Tư Liệu Ads' });

            const isGiamDoc = ['giam_doc', 'admin', 'ban_giam_doc', 'quan_ly_cap_cao'].includes((req.user.role || '').toLowerCase()) || !!req.user.is_admin;
            const isCreator = Number(req.user.id) === Number(existing.created_by);

            if (existing.task_id && !isGiamDoc) {
                const parentTask = await db.get(`SELECT kho_ads_approved FROM board_tasks WHERE id = $1`, [existing.task_id]);
                if (parentTask && parentTask.kho_ads_approved) {
                    return reply.code(400).send({ error: '⚠️ Tư liệu Ads này thuộc công việc đã được Phê Duyệt. Chỉ Giám Đốc mới có quyền xóa!' });
                }
            }

            if (!isGiamDoc && !isCreator) {
                return reply.code(403).send({ error: 'Bạn không có quyền xóa tư liệu này' });
            }

            await db.run(`DELETE FROM kho_ads_items WHERE id = $1`, [id]);
            return reply.send({ ok: true });
        } catch (e) {
            console.error('[kho-ads items DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });
};
