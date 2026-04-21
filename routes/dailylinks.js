// ========== DAILY LINKS — UNIFIED MODULE ==========
// Handles: Add/Cmt, Đăng Video, Đăng Content, Đăng Group, Sedding, Tuyển Dụng
module.exports = async function (fastify) {
    const db = require('../db/pool');
    const { authenticate } = require('../middleware/auth');
    const fs = require('fs');
    const path = require('path');

    // ===== AUTO-CREATE TABLE =====
    await db.exec(`
        CREATE TABLE IF NOT EXISTS daily_link_entries (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
            module_type TEXT NOT NULL,
            fb_link TEXT NOT NULL,
            image_path TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_dle_user_date ON daily_link_entries(user_id, entry_date);
        CREATE INDEX IF NOT EXISTS idx_dle_module ON daily_link_entries(module_type);
        CREATE INDEX IF NOT EXISTS idx_dle_date ON daily_link_entries(entry_date);
    `);
    // Add columns if missing
    try { await db.exec('ALTER TABLE daily_link_entries ADD COLUMN IF NOT EXISTS image_path TEXT'); } catch(e) {}
    try { await db.exec('ALTER TABLE daily_link_entries ADD COLUMN IF NOT EXISTS links_json JSONB'); } catch(e) {}

    // Migrate old addcmt_entries if exists
    try {
        const hasOld = await db.get("SELECT to_regclass('public.addcmt_entries') as t");
        if (hasOld && hasOld.t) {
            const oldCount = await db.get('SELECT COUNT(*) as c FROM addcmt_entries');
            const newCount = await db.get("SELECT COUNT(*) as c FROM daily_link_entries WHERE module_type = 'addcmt'");
            if (Number(oldCount.c) > 0 && Number(newCount.c) === 0) {
                await db.exec("INSERT INTO daily_link_entries (user_id, entry_date, module_type, fb_link, created_at) SELECT user_id, entry_date, 'addcmt', fb_link, created_at FROM addcmt_entries");
                console.log(`[DailyLinks] Migrated ${oldCount.c} addcmt entries`);
            }
        }
    } catch(e) { /* ignore */ }

    // Valid module types
    const VALID_TYPES = ['addcmt', 'dang_video', 'dang_content', 'dang_group', 'sedding', 'tuyen_dung', 'tim_gr_zalo', 'dang_banthan_sp'];
    // Task name patterns for target lookup
    const TASK_PATTERNS = {
        addcmt: '%Add%Cmt%Đối Tác%',
        dang_video: '%Đăng%Video%',
        dang_content: '%Đăng%Content%',
        dang_group: '%Đăng%Tìm%KH%Group%',
        sedding: '%Sedding%Cộng Đồng%',
        tuyen_dung: '%Tuyển%Dụng%SV%',
        tim_gr_zalo: '%Tìm%Gr%Zalo%',
        dang_banthan_sp: '%Đăng%Bản Thân%Sản Phẩm%'
    };

    function _vnToday() { const n = new Date(Date.now() + 7 * 3600000); return n.toISOString().split('T')[0]; }

    function _validateType(t) { return VALID_TYPES.includes(t); }

    // GET entries
    fastify.get('/api/dailylinks/entries', { preHandler: [authenticate] }, async (req) => {
        const { date, date_from, date_to, user_id, dept_id, module_type } = req.query;
        if (!module_type || !_validateType(module_type)) return { entries: [] };
        const role = req.user.role;
        let where, params, pi;
        if (date_from && date_to) {
            where = 'e.entry_date BETWEEN $1 AND $2 AND e.module_type = $3';
            params = [date_from, date_to, module_type]; pi = 4;
        } else {
            const targetDate = date || _vnToday();
            where = 'e.entry_date = $1 AND e.module_type = $2';
            params = [targetDate, module_type]; pi = 3;
        }

        if (user_id) { where += ` AND e.user_id = $${pi}`; params.push(Number(user_id)); pi++; }
        else if (role === 'nhan_vien' || role === 'part_time') { where += ` AND e.user_id = $${pi}`; params.push(req.user.id); pi++; }
        else if (dept_id) {
            // Expand parent dept to include all child departments
            const deptIdNum = Number(dept_id);
            const childDepts = await db.all('SELECT id FROM departments WHERE parent_id = $1 AND status = $2', [deptIdNum, 'active']);
            const allDeptIds = [deptIdNum, ...childDepts.map(d => d.id)];
            const ph = allDeptIds.map((_, i) => `$${pi + i}`).join(',');
            where += ` AND u.department_id IN (${ph})`;
            params.push(...allDeptIds);
            pi += allDeptIds.length;
        }
        else if (!['giam_doc', 'quan_ly_cap_cao'].includes(role)) {
            const dIds = await _getDeptIds(req.user);
            if (dIds.length > 0) { const ph = dIds.map((_, i) => `$${pi + i}`).join(','); where += ` AND u.department_id IN (${ph})`; params.push(...dIds); pi += dIds.length; }
            else { where += ` AND e.user_id = $${pi}`; params.push(req.user.id); pi++; }
        }

        const rows = await db.all(
            `SELECT e.*, e.links_json, u.full_name as user_name, u.username, d.name as dept_name,
             c.name as category_name, c.color as category_color
             FROM daily_link_entries e LEFT JOIN users u ON e.user_id = u.id LEFT JOIN departments d ON u.department_id = d.id
             LEFT JOIN partner_outreach_categories c ON e.category_id = c.id
             WHERE ${where} ORDER BY e.entry_date DESC, e.created_at DESC`, params
        );
        return { entries: rows };
    });

    // POST create
    fastify.post('/api/dailylinks/entries', { preHandler: [authenticate] }, async (req, reply) => {
      try {
        const { fb_link, module_type, image_data } = req.body || {};
        console.log(`[DailyLinks POST] module=${module_type}, fb_link=${fb_link?.substring(0,50)}, has_links_json=${!!req.body?.links_json}, has_content_images=${!!req.body?.content_images}`);
        if (!fb_link?.trim()) return reply.code(400).send({ error: 'Thiếu link' });
        if (!module_type || !_validateType(module_type)) return reply.code(400).send({ error: 'Module không hợp lệ' });
        const today = req.body?.backfill_date || _vnToday();
        // If backfill_date is provided, validate it's in the past
        if (req.body?.backfill_date) {
            const bfDate = req.body.backfill_date;
            if (bfDate >= _vnToday()) return reply.code(400).send({ error: 'Ngày báo cáo bù phải là ngày trong quá khứ' });
            console.log(`[DailyLinks POST] BACKFILL mode: saving to ${bfDate} instead of today`);
        }
        const linkLower = fb_link.trim().toLowerCase();
        // Skip single-link dup check for addcmt and multi-link modules
        const isMultiLink = ['dang_video', 'dang_content'].includes(module_type);
        // ALL modules (except addcmt & multi-link) use GLOBAL uniqueness: no date filter
        if (module_type !== 'addcmt' && !isMultiLink) {
            // Global dup: check across ALL users and ALL dates
            const dupGlobal = await db.get(
                `SELECT e.id, e.user_id, u.full_name FROM daily_link_entries e JOIN users u ON e.user_id = u.id
                 WHERE LOWER(e.fb_link) = $1 AND e.module_type = $2 LIMIT 1`, [linkLower, module_type]
            );
            if (dupGlobal) {
                const who = dupGlobal.user_id === req.user.id ? 'chính bạn' : dupGlobal.full_name;
                return reply.code(400).send({ error: `Link này đã được nhập bởi ${who}. Mỗi link chỉ được nhập 1 lần duy nhất!` });
            }
        }
        console.log('[DailyLinks POST] STAGE 1 — basic validation passed');

        // ===== MULTI-LINK: Cross-user + self duplicate check for all links =====
        if (isMultiLink && req.body?.links_json) {
            const lj = req.body.links_json;
            // Only check non-image links (skip __IMAGE__ placeholders)
            const allLinks = Object.values(lj).map(v => v?.trim()?.toLowerCase()).filter(v => v && v !== '__image__');
            // Check for duplicates within same submission
            const seen = new Set();
            for (const [key, val] of Object.entries(lj)) {
                const lower = val?.trim()?.toLowerCase();
                if (!lower || lower === '__image__') continue;
                if (seen.has(lower)) {
                    return reply.code(400).send({ error: `Link bị trùng trong cùng 1 lần báo cáo: ${val}` });
                }
                seen.add(lower);
            }
            // Check against ALL existing entries of same module_type (cross-user + self)
            if (allLinks.length > 0) {
                const existing = await db.all(
                    `SELECT e.links_json, e.user_id, u.full_name FROM daily_link_entries e
                     JOIN users u ON e.user_id = u.id
                     WHERE e.module_type = $1 AND e.links_json IS NOT NULL`, [module_type]
                );
                for (const row of existing) {
                    let eLj = row.links_json;
                    if (typeof eLj === 'string') try { eLj = JSON.parse(eLj); } catch(e) { continue; }
                    if (!eLj) continue;
                    for (const [eKey, eVal] of Object.entries(eLj)) {
                        const eLower = eVal?.trim()?.toLowerCase();
                        if (!eLower || eLower === '__image__') continue;
                        if (allLinks.includes(eLower)) {
                            const who = row.user_id === req.user.id ? 'chính bạn' : row.full_name;
                            return reply.code(400).send({ error: `Link "${eVal}" đã được nhập bởi ${who}` });
                        }
                    }
                }
            }
        }
        console.log('[DailyLinks POST] STAGE 2 — dup check passed');

        // Handle image upload (addcmt, dang_group, sedding, etc.)
        let imagePath = null;
        const imgModules = ['addcmt', 'dang_group', 'sedding'];
        if (imgModules.includes(module_type) && image_data) {
            try {
                const commaIdx = image_data.indexOf(',');
                if (commaIdx > -1) {
                    const header = image_data.substring(0, commaIdx);
                    const extMatch = header.match(/image\/(\w+)/);
                    const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'png';
                    const buffer = Buffer.from(image_data.substring(commaIdx + 1), 'base64');
                    const subDir = module_type === 'addcmt' ? 'addcmt' : module_type === 'sedding' ? 'sedding' : 'group';
                    const uploadDir = path.join(__dirname, '..', 'uploads', subDir);
                    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                    const filename = `${req.user.id}_${Date.now()}.${ext}`;
                    const filePath = path.join(uploadDir, filename);
                    try {
                        const sharp = require('sharp');
                        await sharp(buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(filePath.replace(/\.[^.]+$/, '.jpg'));
                        imagePath = `/uploads/${subDir}/` + filename.replace(/\.[^.]+$/, '.jpg');
                    } catch(sharpErr) {
                        fs.writeFileSync(filePath, buffer);
                        imagePath = `/uploads/${subDir}/` + filename;
                    }
                }
            } catch(imgErr) { console.error('[DailyLinks] Image save error:', imgErr.message); }
        }

        // Handle content_images for multi-link modules (e.g., Zalo Ảnh in dang_content)
        let linksJsonFinal = req.body?.links_json;
        if (isMultiLink && req.body?.content_images) {
            const ci = req.body.content_images;
            const uploadDir = path.join(__dirname, '..', 'uploads', 'content');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            for (const [key, dataUrl] of Object.entries(ci)) {
                try {
                    console.log(`[DailyLinks] Processing image for key=${key}, dataLen=${dataUrl?.length}`);
                    const commaIdx = dataUrl.indexOf(',');
                    if (commaIdx === -1) continue;
                    const header = dataUrl.substring(0, commaIdx);
                    const b64 = dataUrl.substring(commaIdx + 1);
                    const extMatch = header.match(/image\/(\w+)/);
                    const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'png';
                    const buffer = Buffer.from(b64, 'base64');
                    const filename = `${req.user.id}_${key}_${Date.now()}.${ext}`;
                    const filePath = path.join(uploadDir, filename);
                    try {
                        const sharp = require('sharp');
                        const outName = filename.replace(/\.[^.]+$/, '.jpg');
                        await sharp(buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(path.join(uploadDir, outName));
                        linksJsonFinal[key] = '/uploads/content/' + outName;
                    } catch(sharpErr) {
                        console.log(`[DailyLinks] Sharp failed, saving raw: ${sharpErr.message}`);
                        fs.writeFileSync(filePath, buffer);
                        linksJsonFinal[key] = '/uploads/content/' + filename;
                    }
                    console.log(`[DailyLinks] Image saved: ${linksJsonFinal[key]}`);
                } catch(imgErr) { console.error('[DailyLinks] Content image save error:', imgErr.message); }
            }
        }
        console.log('[DailyLinks POST] STAGE 3 — images processed');

        const categoryId = req.body?.category_id ? Number(req.body.category_id) : null;
        if (module_type === 'dang_group' && !categoryId) {
            return reply.code(400).send({ error: 'Vui lòng chọn lĩnh vực!' });
        }

        await db.run('INSERT INTO daily_link_entries (user_id, entry_date, module_type, fb_link, image_path, links_json, category_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.user.id, today, module_type, fb_link.trim(), imagePath, linksJsonFinal ? JSON.stringify(linksJsonFinal) : null, categoryId]);
        console.log(`[DailyLinks POST] STAGE 4 — INSERT SUCCESS for ${module_type}, user ${req.user.id}`);

        // ===== IMMEDIATE AUTO-SCORING — update task_point_reports right away =====
        try {
            const pattern = TASK_PATTERNS[module_type];
            if (pattern) {
                const uid = req.user.id;
                const user = await db.get('SELECT department_id FROM users WHERE id = $1', [uid]);
                const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1=Mon...7=Sun

                // Find matching template for TODAY's day_of_week (individual → team → global)
                let tpl = await db.get(`SELECT id, min_quantity, points FROM task_point_templates WHERE target_type = 'individual' AND target_id = $1 AND task_name ILIKE $2 AND day_of_week = $3 LIMIT 1`, [uid, pattern, todayDow]);
                if (!tpl && user?.department_id) tpl = await db.get(`SELECT id, min_quantity, points FROM task_point_templates WHERE target_type = 'team' AND target_id = $1 AND task_name ILIKE $2 AND day_of_week = $3 LIMIT 1`, [user.department_id, pattern, todayDow]);
                if (!tpl) tpl = await db.get(`SELECT id, min_quantity, points FROM task_point_templates WHERE task_name ILIKE $1 AND day_of_week = $2 LIMIT 1`, [pattern, todayDow]);

                if (tpl && tpl.id) {
                    // Check for user override
                    let tmplTarget = tpl.min_quantity || 1;
                    let tmplPoints = tpl.points || 10;
                    const ov = await db.get('SELECT custom_points, custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3', [uid, 'diem', tpl.id]);
                    if (ov) {
                        if (ov.custom_min_quantity != null) tmplTarget = Number(ov.custom_min_quantity);
                        if (ov.custom_points != null) tmplPoints = Number(ov.custom_points);
                    }

                    // Count total entries today
                    const countRes = await db.get('SELECT COUNT(*) as cnt FROM daily_link_entries WHERE user_id = $1 AND entry_date = $2 AND module_type = $3', [uid, today, module_type]);
                    const entryCount = parseInt(countRes?.cnt || 0);
                    const tmplEarned = entryCount >= tmplTarget ? tmplPoints : 0;  // all-or-nothing
                    const tmplQty = Math.min(entryCount, tmplTarget);

                    const existing = await db.get("SELECT id, status FROM task_point_reports WHERE template_id = $1 AND user_id = $2 AND report_date = $3", [tpl.id, uid, today]);
                    if (existing) {
                        await db.run(
                            `UPDATE task_point_reports SET quantity = $1, points_earned = $2,
                             content = $3, report_value = $4,
                             status = CASE WHEN $5 >= $6 THEN 'approved' ELSE status END
                             WHERE id = $7`,
                            [tmplQty, tmplEarned, `[Tự động] ${entryCount}/${tmplTarget} ${module_type}`, `${entryCount}/${tmplTarget}`, entryCount, tmplTarget, existing.id]
                        );
                    } else {
                        const status = 'approved';
                        await db.run(
                            `INSERT INTO task_point_reports (template_id, user_id, report_date, quantity, points_earned, status, content, report_type, report_value)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [tpl.id, uid, today, tmplQty, tmplEarned, status, `[Tự động] ${entryCount}/${tmplTarget} ${module_type}`, 'link', `${entryCount}/${tmplTarget}`]
                        );
                    }
                    console.log(`[DailyLinks] Auto-scored: user=${uid}, module=${module_type}, count=${entryCount}/${tmplTarget}, pts=${tmplEarned}/${tmplPoints}`);
                }
            }
        } catch(scoreErr) {
            console.error('[DailyLinks] Auto-score error (non-fatal):', scoreErr.message);
        }

        // ===== BACKFILL: update lock_task_completions so penalty is cleared =====
        if (req.body?.backfill_date) {
            try {
                const bfDate = req.body.backfill_date;
                const uid = req.user.id;
                const LOCK_PATTERNS = {
                    addcmt: /add.*cmt.*đối.*tác/i, dang_video: /đăng.*video/i,
                    dang_content: /đăng.*content/i, dang_group: /đăng.*tìm.*kh.*group/i,
                    sedding: /sedding.*cộng.*đồng/i, dang_banthan_sp: /đăng.*bản.*thân/i,
                    tim_gr_zalo: /tìm.*gr.*zalo/i, tuyen_dung: /tuyển.*dụng.*sv/i,
                };
                const ltPattern = LOCK_PATTERNS[module_type];
                if (ltPattern) {
                    const lockTasks = await db.all("SELECT id, task_name FROM lock_tasks WHERE is_active = true");
                    const matchLTs = lockTasks.filter(lt => ltPattern.test(lt.task_name));
                    for (const lt of matchLTs) {
                        const comp = await db.get(
                            "SELECT id, status FROM lock_task_completions WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3 ORDER BY id DESC LIMIT 1",
                            [lt.id, uid, bfDate]
                        );
                        if (comp && comp.status !== 'approved') {
                            await db.run(
                                "UPDATE lock_task_completions SET status = 'approved', proof_url = $1, updated_at = NOW() WHERE id = $2",
                                [fb_link.trim(), comp.id]
                            );
                            console.log(`[DailyLinks BACKFILL] Updated lock_task_completion id=${comp.id} to approved for ${bfDate}`);
                        } else if (!comp) {
                            await db.run(
                                "INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, proof_url, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'approved', NOW(), NOW())",
                                [lt.id, uid, bfDate, fb_link.trim()]
                            );
                            console.log(`[DailyLinks BACKFILL] Created approved lock_task_completion for ${bfDate}`);
                        }
                    }
                }
            } catch(bfErr) {
                console.error('[DailyLinks BACKFILL] Error updating lock completion (non-fatal):', bfErr.message);
            }
        }

        return { success: true };
      } catch(globalErr) {
        console.error(`[DailyLinks POST] GLOBAL ERROR:`, globalErr.message, globalErr.stack);
        return reply.code(500).send({ error: 'Lỗi hệ thống: ' + globalErr.message });
      }
    });

    // DELETE
    fastify.delete('/api/dailylinks/entries/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const e = await db.get('SELECT * FROM daily_link_entries WHERE id = $1', [Number(req.params.id)]);
        if (!e) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (e.user_id !== req.user.id && req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Không phải của bạn' });
        const ed = typeof e.entry_date === 'string' ? e.entry_date.split('T')[0] : e.entry_date?.toISOString?.()?.split('T')[0];
        if (ed !== _vnToday() && req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ xóa được trong ngày' });
        await db.run('DELETE FROM daily_link_entries WHERE id = $1', [Number(req.params.id)]);
        return { success: true };
    });

    // ===== CATEGORIES (reuse partner_outreach_categories) =====
    fastify.get('/api/dailylinks/categories', { preHandler: [authenticate] }, async () => {
        const rows = await db.all('SELECT * FROM partner_outreach_categories WHERE is_active = true ORDER BY sort_order, name');
        return { categories: rows };
    });

    fastify.post('/api/dailylinks/categories', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { name, color } = req.body || {};
        if (!name?.trim()) return reply.code(400).send({ error: 'Thiếu tên lĩnh vực' });
        const maxOrder = await db.get('SELECT COALESCE(MAX(sort_order), 0) as m FROM partner_outreach_categories');
        await db.run('INSERT INTO partner_outreach_categories (name, color, sort_order) VALUES ($1, $2, $3)', [name.trim(), color || '#3b82f6', (maxOrder.m || 0) + 1]);
        return { success: true };
    });

    fastify.delete('/api/dailylinks/categories/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        await db.run('UPDATE partner_outreach_categories SET is_active = false WHERE id = $1', [Number(req.params.id)]);
        return { success: true };
    });

    // STATS
    fastify.get('/api/dailylinks/stats', { preHandler: [authenticate] }, async (req) => {
        const { module_type, dept_id } = req.query;
        if (!module_type || !_validateType(module_type)) return { today: 0, week: 0, month: 0, target: 20 };
        const today = _vnToday();
        const d = new Date(today + 'T00:00:00');
        const dow = d.getDay() || 7;
        const mon = new Date(d); mon.setDate(d.getDate() - dow + 1);
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        const ws = mon.toISOString().split('T')[0], we = sun.toISOString().split('T')[0];
        const ms = today.substring(0, 7) + '-01';
        const ld = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const me = today.substring(0, 7) + '-' + String(ld).padStart(2, '0');

        const pattern = TASK_PATTERNS[module_type] || '%';

        // ===== DEPARTMENT AGGREGATE MODE =====
        if (dept_id) {
            const deptIdNum = Number(dept_id);
            const childDepts = await db.all('SELECT id FROM departments WHERE parent_id = $1 AND status = $2', [deptIdNum, 'active']);
            const allDeptIds = [deptIdNum, ...childDepts.map(d => d.id)];
            const ph = allDeptIds.map((_, i) => `$${i + 1}`).join(',');
            const userFilter = `e.user_id IN (SELECT id FROM users WHERE department_id IN (${ph}) AND status = 'active')`;
            const baseParams = [...allDeptIds];
            const pi = allDeptIds.length + 1;
            const [tc, wc, mc] = await Promise.all([
                db.get(`SELECT COUNT(*) as c FROM daily_link_entries e WHERE ${userFilter} AND e.entry_date = $${pi} AND e.module_type = $${pi+1}`, [...baseParams, today, module_type]),
                db.get(`SELECT COUNT(*) as c FROM daily_link_entries e WHERE ${userFilter} AND e.entry_date BETWEEN $${pi} AND $${pi+1} AND e.module_type = $${pi+2}`, [...baseParams, ws, we, module_type]),
                db.get(`SELECT COUNT(*) as c FROM daily_link_entries e WHERE ${userFilter} AND e.entry_date BETWEEN $${pi} AND $${pi+1} AND e.module_type = $${pi+2}`, [...baseParams, ms, me, module_type]),
            ]);

            // Calculate per-user targets and sum them
            const users = await db.all(`SELECT id, department_id FROM users WHERE department_id IN (${ph}) AND status = 'active'`, allDeptIds);
            let totalDailyTarget = 0;
            for (const u of users) {
                let uTpl = null;
                if (pattern) {
                    uTpl = await db.get("SELECT id, min_quantity FROM task_point_templates WHERE target_type = 'individual' AND target_id = $1 AND task_name ILIKE $2 LIMIT 1", [u.id, pattern]);
                    if (!uTpl && u.department_id) uTpl = await db.get("SELECT id, min_quantity FROM task_point_templates WHERE target_type = 'team' AND target_id = $1 AND task_name ILIKE $2 LIMIT 1", [u.department_id, pattern]);
                    if (!uTpl) uTpl = await db.get("SELECT id, min_quantity FROM task_point_templates WHERE task_name ILIKE $1 LIMIT 1", [pattern]);
                    if (!uTpl) uTpl = await db.get("SELECT id, min_quantity FROM task_library WHERE task_name ILIKE $1 LIMIT 1", [pattern]);
                    if (!uTpl) { const lr = await db.get("SELECT min_quantity FROM lock_tasks WHERE task_name ILIKE $1 AND is_active = true LIMIT 1", [pattern]); if (lr) uTpl = { id: null, min_quantity: lr.min_quantity }; }
                }
                let uTarget = uTpl ? Number(uTpl.min_quantity) : 20;
                if (uTpl && uTpl.id) {
                    const ov = await db.get('SELECT custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3', [u.id, 'diem', uTpl.id]);
                    if (ov && ov.custom_min_quantity != null) uTarget = Number(ov.custom_min_quantity);
                }
                totalDailyTarget += uTarget;
            }

            // Calculate working days (Mon-Sat) for week and month
            function countWorkingDays(startStr, endStr) {
                let count = 0;
                const s = new Date(startStr + 'T00:00:00'), e = new Date(endStr + 'T00:00:00');
                for (let cur = new Date(s); cur <= e; cur.setDate(cur.getDate() + 1)) {
                    const dow = cur.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                    if (dow >= 1 && dow <= 6) count++;
                }
                return count;
            }
            const weekWorkDays = countWorkingDays(ws, we);
            const monthWorkDays = countWorkingDays(ms, me);

            return {
                today: Number(tc.c), week: Number(wc.c), month: Number(mc.c),
                target: totalDailyTarget,
                week_target: totalDailyTarget * weekWorkDays,
                month_target: totalDailyTarget * monthWorkDays
            };
        }

        // ===== SINGLE USER MODE =====
        const uid = req.query.user_id ? Number(req.query.user_id) : req.user.id;
        const [tc, wc, mc] = await Promise.all([
            db.get('SELECT COUNT(*) as c FROM daily_link_entries WHERE user_id=$1 AND entry_date=$2 AND module_type=$3', [uid, today, module_type]),
            db.get('SELECT COUNT(*) as c FROM daily_link_entries WHERE user_id=$1 AND entry_date BETWEEN $2 AND $3 AND module_type=$4', [uid, ws, we, module_type]),
            db.get('SELECT COUNT(*) as c FROM daily_link_entries WHERE user_id=$1 AND entry_date BETWEEN $2 AND $3 AND module_type=$4', [uid, ms, me, module_type]),
        ]);

        // Find target: individual → team → global template → library → lock_tasks (same logic as live-count)
        const user = await db.get('SELECT department_id FROM users WHERE id = $1', [uid]);
        let tpl = null;
        if (pattern) {
            tpl = await db.get("SELECT id, min_quantity FROM task_point_templates WHERE target_type = 'individual' AND target_id = $1 AND task_name ILIKE $2 LIMIT 1", [uid, pattern]);
            if (!tpl && user?.department_id) tpl = await db.get("SELECT id, min_quantity FROM task_point_templates WHERE target_type = 'team' AND target_id = $1 AND task_name ILIKE $2 LIMIT 1", [user.department_id, pattern]);
            if (!tpl) tpl = await db.get("SELECT id, min_quantity FROM task_point_templates WHERE task_name ILIKE $1 LIMIT 1", [pattern]);
            if (!tpl) tpl = await db.get("SELECT id, min_quantity FROM task_library WHERE task_name ILIKE $1 LIMIT 1", [pattern]);
            if (!tpl) {
                const lockRow = await db.get("SELECT min_quantity FROM lock_tasks WHERE task_name ILIKE $1 AND is_active = true LIMIT 1", [pattern]);
                if (lockRow) tpl = { id: null, min_quantity: lockRow.min_quantity };
            }
        }

        // Check for user override
        let targetVal = tpl ? Number(tpl.min_quantity) : 20;
        if (tpl && tpl.id) {
            const ov = await db.get('SELECT custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3', [uid, 'diem', tpl.id]);
            if (ov && ov.custom_min_quantity != null) targetVal = Number(ov.custom_min_quantity);
        }

        // Calculate working days (Mon-Sat) for week and month targets
        function countWorkDays(startStr, endStr) {
            let count = 0;
            const s = new Date(startStr + 'T00:00:00'), e = new Date(endStr + 'T00:00:00');
            for (let cur = new Date(s); cur <= e; cur.setDate(cur.getDate() + 1)) {
                const dow = cur.getDay();
                if (dow >= 1 && dow <= 6) count++;
            }
            return count;
        }
        const wwd = countWorkDays(ws, we);
        const mwd = countWorkDays(ms, me);

        return { today: Number(tc.c), week: Number(wc.c), month: Number(mc.c), target: targetVal, week_target: targetVal * wwd, month_target: targetVal * mwd };
    });

    // MEMBERS — PHÒNG KINH DOANH only
    fastify.get('/api/dailylinks/members', { preHandler: [authenticate] }, async (req) => {
        const role = req.user.role;
        let members = [];

        // Get PHÒNG KINH DOANH + child team IDs (ordered by display_order)
        const kdDepts = await db.all("SELECT id, name, display_order FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id");
        const kdDeptIds = kdDepts.map(d => d.id);
        const kdPh = kdDeptIds.map((_, i) => `$${i + 1}`).join(',');

        if (role === 'giam_doc' || role === 'quan_ly_cap_cao') {
            members = await db.all(`SELECT u.id, u.full_name, u.role, u.username, d.id as dept_id, d.name as dept_name, d.display_order FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.status='active' AND u.department_id IN (${kdPh}) ORDER BY d.display_order, d.id, u.full_name`, kdDeptIds);
        } else if (['quan_ly', 'truong_phong'].includes(role)) {
            const dIds = await _getDeptIds(req.user);
            const filtered = dIds.filter(id => kdDeptIds.includes(id));
            if (filtered.length > 0) { const ph = filtered.map((_, i) => `$${i + 1}`).join(','); members = await db.all(`SELECT u.id, u.full_name, u.role, u.username, d.id as dept_id, d.name as dept_name, d.display_order FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.department_id IN (${ph}) AND u.status='active' ORDER BY d.display_order, d.id, u.full_name`, filtered); }
        }
        // Build ordered array — always include all KD depts (even empty)
        const deptOrder = kdDepts.map(d => d.id);
        const deptMap = {};
        kdDepts.forEach(d => { deptMap[d.id] = { id: d.id, name: d.name, members: [] }; });
        members.forEach(m => { const k = m.dept_id || 0; if (deptMap[k]) deptMap[k].members.push(m); });
        const ordered = deptOrder.filter(id => deptMap[id]).map(id => deptMap[id]);
        return { departments: ordered };
    });

    // GUIDE URL — get guide_url by module_type (templates first, then library fallback)
    fastify.get('/api/dailylinks/guide-url', { preHandler: [authenticate] }, async (req) => {
        const { module_type } = req.query;
        if (!module_type) return { guide_url: null };
        const pattern = TASK_PATTERNS[module_type];
        if (!pattern) return { guide_url: null };
        let tpl = await db.get('SELECT guide_url, task_name FROM task_point_templates WHERE task_name ILIKE $1 AND guide_url IS NOT NULL LIMIT 1', [pattern]);
        if (!tpl) tpl = await db.get('SELECT guide_url, task_name FROM task_library WHERE task_name ILIKE $1 AND guide_url IS NOT NULL LIMIT 1', [pattern]);
        return { guide_url: tpl?.guide_url || null, task_name: tpl?.task_name || null };
    });

    // LIVE COUNT — for Lịch Khóa Biểu integration (mirrors partner-outreach/live-count)
    fastify.get('/api/dailylinks/live-count/:userId', { preHandler: [authenticate] }, async (req) => {
        const uid = Number(req.params.userId);
        const date = req.query.date || _vnToday();
        const moduleType = req.query.module_type;
        if (!moduleType) return { count: 0, target: 20, total_points: 5 };

        const pattern = TASK_PATTERNS[moduleType];
        const countResult = await db.get(
            'SELECT COUNT(*) as c FROM daily_link_entries WHERE user_id = $1 AND entry_date = $2 AND module_type = $3',
            [uid, date, moduleType]
        );

        // Find target: individual → team → global template → library → lock_tasks
        const user = await db.get('SELECT department_id FROM users WHERE id = $1', [uid]);
        let tpl = null;
        if (pattern) {
            tpl = await db.get(`SELECT id, min_quantity, points FROM task_point_templates WHERE target_type = 'individual' AND target_id = $1 AND task_name ILIKE $2 LIMIT 1`, [uid, pattern]);
            if (!tpl && user?.department_id) tpl = await db.get(`SELECT id, min_quantity, points FROM task_point_templates WHERE target_type = 'team' AND target_id = $1 AND task_name ILIKE $2 LIMIT 1`, [user.department_id, pattern]);
            if (!tpl) tpl = await db.get(`SELECT id, min_quantity, points FROM task_point_templates WHERE task_name ILIKE $1 LIMIT 1`, [pattern]);
            if (!tpl) tpl = await db.get(`SELECT id, min_quantity, points FROM task_library WHERE task_name ILIKE $1 LIMIT 1`, [pattern]);
            // Fallback: lock_tasks (CV Khóa) — for tasks like Sedding that live there
            if (!tpl) {
                const lockRow = await db.get(`SELECT min_quantity FROM lock_tasks WHERE task_name ILIKE $1 AND is_active = true LIMIT 1`, [pattern]);
                if (lockRow) tpl = { id: null, min_quantity: lockRow.min_quantity, points: 10 };
            }
        }

        // Check for user override
        let targetVal = tpl ? Number(tpl.min_quantity) : 20;
        let pointsVal = tpl ? Number(tpl.points) : 5;
        if (tpl && tpl.id) {
            const ov = await db.get('SELECT custom_points, custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3', [uid, 'diem', tpl.id]);
            if (ov) {
                if (ov.custom_min_quantity != null) targetVal = Number(ov.custom_min_quantity);
                if (ov.custom_points != null) pointsVal = Number(ov.custom_points);
            }
        }

        return {
            count: Number(countResult.c),
            target: targetVal,
            total_points: pointsVal
        };
    });

    // ===== GET MISSING DATES for backfill (CV Khóa only) =====
    fastify.get('/api/dailylinks/missing-dates', { preHandler: [authenticate] }, async (req) => {
        const { module_type } = req.query;
        if (!module_type || !_validateType(module_type)) return { dates: [] };
        const uid = req.user.id;
        const todayStr = _vnToday();

        // Map module_type to lock_task name pattern
        const LOCK_PATTERNS = {
            addcmt: /add.*cmt.*đối.*tác/i,
            dang_video: /đăng.*video/i,
            dang_content: /đăng.*content/i,
            dang_group: /đăng.*tìm.*kh.*group/i,
            sedding: /sedding.*cộng.*đồng/i,
            dang_banthan_sp: /đăng.*bản.*thân/i,
            tim_gr_zalo: /tìm.*gr.*zalo/i,
            tuyen_dung: /tuyển.*dụng.*sv/i,
        };
        const pattern = LOCK_PATTERNS[module_type];
        if (!pattern) return { dates: [] };

        // Find matching lock tasks
        const lockTasks = await db.all("SELECT * FROM lock_tasks WHERE is_active = true");
        const matchingLTs = lockTasks.filter(lt => pattern.test(lt.task_name));
        if (matchingLTs.length === 0) return { dates: [] };

        // Get holidays
        const holidays = new Set();
        try {
            const hRows = await db.all("SELECT holiday_date::text as d FROM lock_task_holidays WHERE holiday_date >= CURRENT_DATE - INTERVAL '30 days'");
            hRows.forEach(h => holidays.add(h.d.slice(0, 10)));
        } catch(e) { /* table may not exist */ }

        // Check last 30 days
        const missingDates = [];
        // Use _vnToday-style: subtract days from todayStr string
        function _localDateStr(date) {
            return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        }
        
        for (let i = 1; i <= 30; i++) {
            // Parse todayStr as local components to avoid timezone shift
            const [y, m, dd] = todayStr.split('-').map(Number);
            const d = new Date(y, m - 1, dd - i);
            const dateStr = _localDateStr(d);
            const dow = d.getDay(); // 0=Sun

            if (holidays.has(dateStr)) continue;

            // Check if any lock task applies to this day
            let applies = false;
            for (const lt of matchingLTs) {
                if (lt.created_at) {
                    const ca = new Date(lt.created_at);
                    const caStr = _localDateStr(ca);
                    if (dateStr < caStr) continue;
                }
                if (lt.recurrence_type === 'administrative') {
                    applies = dow >= 1 && dow <= 6;
                } else if (lt.recurrence_type === 'daily') {
                    applies = true;
                } else if (lt.recurrence_type === 'weekly') {
                    const wDays = (lt.recurrence_value || '').split(',').map(Number);
                    applies = wDays.includes(dow);
                }
                if (applies) break;
            }
            if (!applies) continue;

            // Check if user already has enough entries for this date
            const lt = matchingLTs[0];
            const minQty = lt.min_quantity || 1;
            const count = await db.get(
                'SELECT COUNT(*) as cnt FROM daily_link_entries WHERE user_id = $1 AND entry_date = $2 AND module_type = $3',
                [uid, dateStr, module_type]
            );
            const current = Number(count?.cnt || 0);
            if (current >= minQty) continue;

            // Check lock_task_completions status
            let compStatus = null;
            for (const lt2 of matchingLTs) {
                const comp = await db.get(
                    "SELECT status FROM lock_task_completions WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3 ORDER BY id DESC LIMIT 1",
                    [lt2.id, uid, dateStr]
                );
                if (comp) { compStatus = comp.status; break; }
            }
            // Skip if already approved
            if (compStatus === 'approved') continue;

            const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            missingDates.push({
                date: dateStr,
                day_name: dayNames[dow],
                current_count: current,
                target: minQty,
                status: compStatus || 'missing'
            });
        }

        return { dates: missingDates };
    });

    async function _getDeptIds(user) {
        const a = await db.all('SELECT department_id FROM task_approvers WHERE user_id = $1', [user.id]);
        const s = new Set(a.map(x => x.department_id));
        if (user.department_id) s.add(user.department_id);
        return [...s];
    }

    // ========== COMMUNITY PAGES — Trang cộng đồng gợi ý cho Sedding ==========
    await db.exec(`
        CREATE TABLE IF NOT EXISTS community_pages (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            sort_order INTEGER DEFAULT 0,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `);

    // GET all community pages (all users can read)
    fastify.get('/api/community-pages', { preHandler: [authenticate] }, async (req) => {
        const rows = await db.all(`SELECT cp.*, u.full_name as creator_name FROM community_pages cp LEFT JOIN users u ON cp.created_by = u.id WHERE cp.is_active = true ORDER BY cp.sort_order ASC, cp.name ASC`);
        return { pages: rows };
    });

    // POST create (all users can add)
    fastify.post('/api/community-pages', { preHandler: [authenticate] }, async (req, reply) => {
        const { name, url } = req.body || {};
        if (!name?.trim() || !url?.trim()) return reply.code(400).send({ error: 'Thiếu tên hoặc link' });
        // Check duplicate URL
        const dup = await db.get('SELECT id FROM community_pages WHERE LOWER(url) = $1', [url.trim().toLowerCase()]);
        if (dup) return reply.code(400).send({ error: 'Link trang cộng đồng này đã tồn tại' });
        const maxOrder = await db.get('SELECT COALESCE(MAX(sort_order), 0) as m FROM community_pages');
        await db.run('INSERT INTO community_pages (name, url, is_active, sort_order, created_by) VALUES ($1, $2, true, $3, $4)',
            [name.trim(), url.trim(), (maxOrder?.m || 0) + 1, req.user.id]);
        return { success: true };
    });

    // PUT update (owner or giam_doc only)
    fastify.put('/api/community-pages/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const existing = await db.get('SELECT * FROM community_pages WHERE id = $1', [id]);
        if (!existing) return reply.code(404).send({ error: 'Không tìm thấy' });
        // Only owner or giam_doc can edit
        if (existing.created_by !== req.user.id && req.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Bạn chỉ được sửa trang do chính mình tạo' });
        }
        const { name, url } = req.body || {};
        if (name !== undefined && !name?.trim()) return reply.code(400).send({ error: 'Tên không được trống' });
        const newName = name?.trim() || existing.name;
        const newUrl = url?.trim() || existing.url;
        // Check duplicate URL (exclude self)
        if (url) {
            const dup = await db.get('SELECT id FROM community_pages WHERE LOWER(url) = $1 AND id != $2', [newUrl.toLowerCase(), id]);
            if (dup) return reply.code(400).send({ error: 'Link trang cộng đồng này đã tồn tại' });
        }
        await db.run('UPDATE community_pages SET name = $1, url = $2, updated_at = NOW() WHERE id = $3',
            [newName, newUrl, id]);
        return { success: true };
    });

    // DELETE (owner or giam_doc only)
    fastify.delete('/api/community-pages/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const existing = await db.get('SELECT * FROM community_pages WHERE id = $1', [id]);
        if (!existing) return reply.code(404).send({ error: 'Không tìm thấy' });
        // Only owner or giam_doc can delete
        if (existing.created_by !== req.user.id && req.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Bạn chỉ được xóa trang do chính mình tạo' });
        }
        await db.run('DELETE FROM community_pages WHERE id = $1', [id]);
        return { success: true };
    });
};
