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

        // Server-side link format validation per module
        const _linkRules = {
            dang_group: { check: l => l.includes('facebook.com/groups') && (l.includes('/posts/') || l.includes('/pending_posts/')), err: 'Link phải là bài đăng trong Group Facebook (chứa facebook.com/groups và /posts/ hoặc /pending_posts/)' },
            dang_banthan_sp: { check: l => l.includes('facebook.com') && l.includes('/posts/'), err: 'Link phải là bài đăng Facebook (chứa facebook.com và /posts/)' },
            sedding: { check: l => l.includes('facebook.com') && l.includes('/posts/'), err: 'Link phải là bài đăng Facebook (chứa facebook.com và /posts/)' },
            tuyen_dung: { check: l => l.includes('facebook.com/groups') && (l.includes('/posts/') || l.includes('/pending_posts/')), err: 'Link phải là bài đăng trong Group Facebook (chứa facebook.com/groups và /posts/ hoặc /pending_posts/)' },
        };
        if (_linkRules[module_type] && !_linkRules[module_type].check(linkLower)) {
            return reply.code(400).send({ error: _linkRules[module_type].err });
        }
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
        const imgModules = ['addcmt', 'dang_group', 'sedding', 'dang_banthan_sp', 'tuyen_dung'];
        if (imgModules.includes(module_type) && image_data) {
            try {
                const commaIdx = image_data.indexOf(',');
                if (commaIdx > -1) {
                    const header = image_data.substring(0, commaIdx);
                    const extMatch = header.match(/image\/(\w+)/);
                    const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'png';
                    const buffer = Buffer.from(image_data.substring(commaIdx + 1), 'base64');
                    const subDirMap = { addcmt: 'addcmt', sedding: 'sedding', dang_banthan_sp: 'banthansp', tuyen_dung: 'tuyendung' };
                    const subDir = subDirMap[module_type] || 'group';
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
        } else {
            // NV: show own dept members (only those in PHÒNG KINH DOANH tree)
            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [req.user.id]);
            if (user && user.department_id && kdDeptIds.includes(user.department_id)) {
                members = await db.all(`SELECT u.id, u.full_name, u.role, u.username, d.id as dept_id, d.name as dept_name, d.display_order FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.department_id = $1 AND u.status='active' ORDER BY u.full_name`, [user.department_id]);
            }
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

    // ========== ZALO GROUP FINDER — POOL-BASED TASK SYSTEM ==========

    // Helper: get daily quota for tim_gr_zalo from lock_tasks/task_point_templates
    async function _getZaloQuota(userId) {
        const pattern = '%Tìm%Gr%Zalo%';
        let tpl = await db.get(`SELECT id, min_quantity, points FROM task_point_templates WHERE task_name ILIKE $1 LIMIT 1`, [pattern]);
        if (!tpl) tpl = await db.get(`SELECT id, min_quantity, points FROM task_library WHERE task_name ILIKE $1 LIMIT 1`, [pattern]);
        if (!tpl) {
            const lockRow = await db.get(`SELECT min_quantity FROM lock_tasks WHERE task_name ILIKE $1 AND is_active = true LIMIT 1`, [pattern]);
            if (lockRow) tpl = { id: null, min_quantity: lockRow.min_quantity, points: 10 };
        }
        let quota = tpl ? Number(tpl.min_quantity) : 25;
        // Check user override
        if (tpl && tpl.id) {
            const ov = await db.get('SELECT custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3', [userId, 'diem', tpl.id]);
            if (ov && ov.custom_min_quantity != null) quota = Number(ov.custom_min_quantity);
        }
        return quota;
    }

    // ========== ZALO SOURCES CRUD ==========
    fastify.get('/api/zalo-sources', { preHandler: [authenticate] }, async () => {
        const sources = await db.all(`SELECT s.*, COALESCE(p.cnt,0)::int as link_count 
            FROM zalo_sources s LEFT JOIN (SELECT source_id, COUNT(*) as cnt FROM zalo_link_pool GROUP BY source_id) p ON p.source_id = s.id 
            ORDER BY s.sort_order, s.id`);
        return { sources };
    });
    fastify.post('/api/zalo-sources', { preHandler: [authenticate] }, async (req, reply) => {
        if (!['giam_doc','quan_ly_cap_cao','truong_phong'].includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { name, icon } = req.body || {};
        if (!name?.trim()) return reply.code(400).send({ error: 'Tên nguồn không được trống' });
        const maxSort = await db.get('SELECT COALESCE(MAX(sort_order),0)+1 as n FROM zalo_sources');
        const row = await db.get('INSERT INTO zalo_sources (name, icon, sort_order, created_by) VALUES ($1, $2, $3, $4) RETURNING *', [name.trim(), icon || '📂', maxSort.n, req.user.id]);
        return { success: true, source: row };
    });
    fastify.put('/api/zalo-sources/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!['giam_doc','quan_ly_cap_cao','truong_phong'].includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { name, icon } = req.body || {};
        if (!name?.trim()) return reply.code(400).send({ error: 'Tên nguồn không được trống' });
        await db.run('UPDATE zalo_sources SET name=$1, icon=$2, updated_at=NOW() WHERE id=$3', [name.trim(), icon || '📂', Number(req.params.id)]);
        return { success: true };
    });
    fastify.delete('/api/zalo-sources/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!['giam_doc','quan_ly_cap_cao','truong_phong'].includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const id = Number(req.params.id);
        const cnt = await db.get('SELECT COUNT(*) as c FROM zalo_link_pool WHERE source_id=$1', [id]);
        if (Number(cnt.c) > 0) return reply.code(400).send({ error: `Nguồn này có ${cnt.c} link, không thể xóa` });
        await db.run('DELETE FROM zalo_sources WHERE id=$1', [id]);
        return { success: true };
    });

    // GET /api/zalo-fetch-info?url=... — Try to auto-fetch Zalo group name + member count
    fastify.get('/api/zalo-fetch-info', { preHandler: [authenticate] }, async (req, reply) => {
        const { url } = req.query;
        if (!url) return reply.code(400).send({ error: 'URL required' });
        try {
            const https = require('https');
            const http = require('http');
            const mod = url.startsWith('https') ? https : http;
            const html = await new Promise((resolve, reject) => {
                const r = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }, timeout: 5000 }, (res) => {
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        // Follow redirect
                        const rr = (res.headers.location.startsWith('https') ? https : http).get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }, (res2) => {
                            let d = ''; res2.on('data', c => d += c); res2.on('end', () => resolve(d));
                        });
                        rr.on('error', reject); rr.on('timeout', () => { rr.destroy(); reject(new Error('timeout')); });
                        return;
                    }
                    let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
                });
                r.on('error', reject);
                r.on('timeout', () => { r.destroy(); reject(new Error('timeout')); });
            });
            // Parse og:title
            const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
                || html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
            const name = titleMatch ? titleMatch[1].trim() : '';
            const desc = descMatch ? descMatch[1].trim() : '';
            // Try to extract member count from description
            const memberMatch = desc.match(/(\d+)\s*(thành viên|members|tv)/i) || desc.match(/(\d+)/);
            const members = memberMatch ? parseInt(memberMatch[1]) : 0;
            console.log(`[ZaloFetch] url=${url} name="${name}" members=${members}`);
            return { name, members, description: desc };
        } catch(e) {
            console.log(`[ZaloFetch] Failed for ${url}: ${e.message}`);
            return { name: '', members: 0, error: 'Không lấy được thông tin tự động' };
        }
    });

    // POST /api/zalo-pool/bulk — Manager bulk-import links (with source_id)
    fastify.post('/api/zalo-pool/bulk', { preHandler: [authenticate] }, async (req, reply) => {
        if (!['giam_doc', 'quan_ly_cap_cao', 'truong_phong'].includes(req.user.role)) {
            return reply.code(403).send({ error: 'Chỉ quản lý mới được bơm link' });
        }
        const { urls, source_id, user_id } = req.body || {};
        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return reply.code(400).send({ error: 'Vui lòng nhập danh sách link' });
        }
        console.log(`[ZaloPool] Bulk import: ${urls.length} URLs, user_id=${user_id}, source_id=${source_id}`);
        let added = 0, duplicates = 0, errors = 0;
        const dupUrls = [];
        const today = _vnToday();
        for (const rawUrl of urls) {
            const url = rawUrl.trim();
            if (!url) continue;
            try {
                // Check if this URL is already assigned to ANY employee today
                const anyTask = await db.get(`SELECT t.id, u.full_name FROM zalo_daily_tasks t JOIN zalo_link_pool p ON t.pool_id = p.id LEFT JOIN users u ON t.user_id = u.id WHERE p.url = $1 AND t.assigned_date = $2`, [url, today]);
                if (anyTask) {
                    duplicates++;
                    dupUrls.push(`${url.substring(0,50)}... (đã gán cho ${anyTask.full_name || 'NV khác'})`);
                    continue;
                }
                const exists = await db.get('SELECT id FROM zalo_link_pool WHERE url = $1', [url]);
                let poolId;
                if (exists) {
                    poolId = exists.id;
                } else {
                    const inserted = await db.get('INSERT INTO zalo_link_pool (url, status, created_by, source_id) VALUES ($1, $2, $3, $4) RETURNING id', [url, user_id ? 'assigned' : 'available', req.user.id, source_id ? Number(source_id) : null]);
                    poolId = inserted?.id;
                }
                if (user_id && poolId) {
                    await db.run('INSERT INTO zalo_daily_tasks (pool_id, user_id, assigned_date, status) VALUES ($1, $2, $3, $4)', [poolId, Number(user_id), today, 'pending']);
                }
                added++;
                console.log(`[ZaloPool] Added: ${url} -> pool_id=${poolId}, task for user=${user_id}`);
            } catch (urlErr) {
                console.error(`[ZaloPool] Error processing URL "${url}":`, urlErr.message);
                errors++;
            }
        }
        console.log(`[ZaloPool] Bulk result: added=${added}, duplicates=${duplicates}, errors=${errors}`);
        return { success: true, added, duplicates, errors, dupUrls, total: added + duplicates };
    });

    // GET /api/zalo-pool — Get pool stats & list (with source filter)
    fastify.get('/api/zalo-pool', { preHandler: [authenticate] }, async (req) => {
        const { page = 1, limit = 50, status, source_id } = req.query;
        let where = '1=1';
        const params = [];
        let pi = 1;
        if (status) { where += ` AND p.status = $${pi}`; params.push(status); pi++; }
        if (source_id) { where += ` AND p.source_id = $${pi}`; params.push(Number(source_id)); pi++; }
        const countR = await db.get(`SELECT COUNT(*) as c FROM zalo_link_pool p WHERE ${where}`, params);
        const offset = (Number(page) - 1) * Number(limit);
        const rows = await db.all(`SELECT p.*, u.full_name as creator_name, s.name as source_name FROM zalo_link_pool p LEFT JOIN users u ON p.created_by = u.id LEFT JOIN zalo_sources s ON p.source_id = s.id WHERE ${where} ORDER BY p.created_at DESC LIMIT $${pi} OFFSET $${pi+1}`, [...params, Number(limit), offset]);
        const statsR = await db.get(`SELECT 
            COUNT(*) FILTER (WHERE status = 'available') as available,
            COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) as total
            FROM zalo_link_pool`);
        return { pool: rows, stats: statsR, total: Number(countR.c), page: Number(page), limit: Number(limit) };
    });

    // DELETE /api/zalo-pool/:id — Delete pool link (only if available)
    fastify.delete('/api/zalo-pool/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!['giam_doc', 'quan_ly_cap_cao', 'truong_phong'].includes(req.user.role)) {
            return reply.code(403).send({ error: 'Không có quyền' });
        }
        const id = Number(req.params.id);
        const row = await db.get('SELECT * FROM zalo_link_pool WHERE id = $1', [id]);
        if (!row) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (row.status !== 'available') return reply.code(400).send({ error: 'Link đã được phân, không thể xóa' });
        await db.run('DELETE FROM zalo_link_pool WHERE id = $1', [id]);
        return { success: true };
    });

    // GET /api/zalo-tasks/my — Get my tasks for today (auto-assign if needed)
    fastify.get('/api/zalo-tasks/my', { preHandler: [authenticate] }, async (req) => {
        const userId = req.user.id;
        const today = _vnToday();
        const quota = await _getZaloQuota(userId);

        // Check how many tasks already assigned today
        const existing = await db.all(`SELECT t.*, p.url as pool_url FROM zalo_daily_tasks t JOIN zalo_link_pool p ON t.pool_id = p.id WHERE t.user_id = $1 AND t.assigned_date = $2 ORDER BY t.id`, [userId, today]);

        if (existing.length < quota) {
            // Auto-assign more from pool
            const needed = quota - existing.length;
            const available = await db.all(`SELECT id, url FROM zalo_link_pool WHERE status = 'available' ORDER BY id LIMIT $1`, [needed]);
            for (const link of available) {
                await db.run(`INSERT INTO zalo_daily_tasks (pool_id, user_id, assigned_date) VALUES ($1, $2, $3)`, [link.id, userId, today]);
                await db.run(`UPDATE zalo_link_pool SET status = 'assigned' WHERE id = $1`, [link.id]);
            }
            // Re-fetch
            const updated = await db.all(`SELECT t.*, p.url as pool_url FROM zalo_daily_tasks t JOIN zalo_link_pool p ON t.pool_id = p.id WHERE t.user_id = $1 AND t.assigned_date = $2 ORDER BY t.id`, [userId, today]);

            // Get results for each task
            for (const task of updated) {
                task.results = await db.all(`SELECT * FROM zalo_task_results WHERE task_id = $1 ORDER BY id`, [task.id]);
            }
            const doneCount = updated.filter(t => t.status === 'done' || t.status === 'no_result').length;
            return { tasks: updated, quota, done: doneCount, pool_empty: available.length < needed };
        }

        // Get results for each task
        for (const task of existing) {
            task.results = await db.all(`SELECT * FROM zalo_task_results WHERE task_id = $1 ORDER BY id`, [task.id]);
        }
        const doneCount = existing.filter(t => t.status === 'done' || t.status === 'no_result').length;
        return { tasks: existing, quota, done: doneCount, pool_empty: false };
    });

    // POST /api/zalo-tasks/:id/result — Submit zalo group result
    fastify.post('/api/zalo-tasks/:id/result', { preHandler: [authenticate] }, async (req, reply) => {
        const taskId = Number(req.params.id);
        const { zalo_name, zalo_link } = req.body || {};
        if (!zalo_name?.trim() || !zalo_link?.trim()) {
            return reply.code(400).send({ error: 'Vui lòng nhập tên và link nhóm Zalo' });
        }
        // Verify task ownership
        const task = await db.get('SELECT * FROM zalo_daily_tasks WHERE id = $1 AND user_id = $2', [taskId, req.user.id]);
        if (!task) return reply.code(404).send({ error: 'Không tìm thấy task' });

        // Check global zalo_link uniqueness
        const dup = await db.get('SELECT r.id, t.user_id, u.full_name FROM zalo_task_results r JOIN zalo_daily_tasks t ON r.task_id = t.id LEFT JOIN users u ON t.user_id = u.id WHERE r.zalo_link = $1', [zalo_link.trim()]);
        if (dup) return reply.code(400).send({ error: `Link Zalo này đã được nhập bởi ${dup.full_name || 'NV khác'}` });

        await db.run('INSERT INTO zalo_task_results (task_id, zalo_name, zalo_link) VALUES ($1, $2, $3)', [taskId, zalo_name.trim(), zalo_link.trim()]);
        await db.run(`UPDATE zalo_daily_tasks SET status = 'done' WHERE id = $1`, [taskId]);
        return { success: true };
    });

    // POST /api/zalo-tasks/:id/results-bulk — Submit multiple zalo links at once
    fastify.post('/api/zalo-tasks/:id/results-bulk', { preHandler: [authenticate] }, async (req, reply) => {
        const taskId = Number(req.params.id);
        const { items } = req.body || {};
        // Support both old format (links array) and new format (items array of objects)
        const entries = items || (req.body.links || []).map(l => ({ link: l, name: '', members: 0 }));
        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return reply.code(400).send({ error: 'Vui lòng nhập ít nhất 1 link' });
        }
        // Verify task ownership (employee) or manager
        const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(req.user.role);
        const task = isManager
            ? await db.get('SELECT * FROM zalo_daily_tasks WHERE id = $1', [taskId])
            : await db.get('SELECT * FROM zalo_daily_tasks WHERE id = $1 AND user_id = $2', [taskId, req.user.id]);
        if (!task) return reply.code(404).send({ error: 'Không tìm thấy task' });

        // First pass: check ALL links for duplicates across all employees
        let dupMessages = [];
        for (const entry of entries) {
            const link = (entry.link || '').trim();
            if (!link) continue;
            const dup = await db.get('SELECT r.id, t.user_id, u.full_name FROM zalo_task_results r JOIN zalo_daily_tasks t ON r.task_id = t.id LEFT JOIN users u ON t.user_id = u.id WHERE r.zalo_link = $1', [link]);
            if (dup) dupMessages.push({ link, owner: dup.full_name || 'NV khác' });
        }
        // If any duplicates, return error — don't save anything
        if (dupMessages.length > 0) {
            return reply.code(400).send({ error: 'Có link Zalo bị trùng', duplicateLinks: dupMessages });
        }

        // All clean — insert all
        let added = 0;
        for (const entry of entries) {
            const link = (entry.link || '').trim();
            if (!link) continue;
            const name = (entry.name || '').trim() || link.replace(/https?:\/\/(www\.)?/i, '').substring(0, 40);
            const members = parseInt(entry.members) || 0;
            await db.run('INSERT INTO zalo_task_results (task_id, zalo_name, zalo_link, member_count, join_status) VALUES ($1, $2, $3, $4, $5)', [taskId, name, link, members, true]);
            added++;
        }
        if (added > 0) {
            await db.run(`UPDATE zalo_daily_tasks SET status = 'done' WHERE id = $1`, [taskId]);
        }
        return { success: true, added };
    });

    // DELETE /api/zalo-results/:id — Delete a result
    fastify.delete('/api/zalo-results/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const result = await db.get('SELECT r.*, t.user_id FROM zalo_task_results r JOIN zalo_daily_tasks t ON r.task_id = t.id WHERE r.id = $1', [id]);
        if (!result) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (req.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được xóa nhóm' });
        }
        await db.run('DELETE FROM zalo_task_results WHERE id = $1', [id]);
        // Check if task still has results
        const remaining = await db.get('SELECT COUNT(*) as c FROM zalo_task_results WHERE task_id = $1', [result.task_id]);
        if (Number(remaining.c) === 0) {
            await db.run(`UPDATE zalo_daily_tasks SET status = 'pending' WHERE id = $1`, [result.task_id]);
        }
        return { success: true };
    });

    // POST /api/zalo-tasks/:id/no-result — Mark task as no result found
    fastify.post('/api/zalo-tasks/:id/no-result', { preHandler: [authenticate] }, async (req, reply) => {
        const taskId = Number(req.params.id);
        const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(req.user.role);
        // Managers can mark any task; employees can only mark their own
        const task = isManager
            ? await db.get('SELECT * FROM zalo_daily_tasks WHERE id = $1', [taskId])
            : await db.get('SELECT * FROM zalo_daily_tasks WHERE id = $1 AND user_id = $2', [taskId, req.user.id]);
        if (!task) return reply.code(404).send({ error: 'Không tìm thấy task' });
        await db.run(`UPDATE zalo_daily_tasks SET status = 'no_result', updated_at = NOW() WHERE id = $1`, [taskId]);
        return { success: true };
    });

    // === Auto-migrations ===
    // Fix: drop UNIQUE(pool_id) → allow same link to be assigned to multiple users
    try {
        // Find and drop the old unique constraint on pool_id only
        const constraints = await db.all(`SELECT conname FROM pg_constraint WHERE conrelid = 'zalo_daily_tasks'::regclass AND contype = 'u'`);
        for (const c of constraints) {
            if (c.conname.includes('pool_id') && !c.conname.includes('user_id')) {
                await db.run(`ALTER TABLE zalo_daily_tasks DROP CONSTRAINT ${c.conname}`);
                console.log(`[Migration] Dropped old constraint: ${c.conname}`);
            }
        }
        // Add new composite unique constraint (if not exists)
        await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS uq_zalo_tasks_pool_user_date ON zalo_daily_tasks (pool_id, user_id, assigned_date)`);
        console.log('[Migration] zalo_daily_tasks unique constraint updated');
    } catch(e) { console.log('[Migration] constraint already ok:', e.message); }

    // Ensure spam_eligible + join_status + spam_not_eligible columns exist
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS spam_eligible BOOLEAN DEFAULT FALSE`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS join_status BOOLEAN DEFAULT FALSE`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS spam_not_eligible BOOLEAN DEFAULT FALSE`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS pending_join BOOLEAN DEFAULT FALSE`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS marked_at TIMESTAMP`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS spam_reason TEXT`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS spam_image TEXT`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS spam_status TEXT DEFAULT 'pending'`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS spam_screenshot TEXT`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS spam_by INTEGER`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_task_results ADD COLUMN IF NOT EXISTS spam_at TIMESTAMP`); } catch(e) { /* already exists */ }
    try { await db.run(`ALTER TABLE zalo_daily_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`); } catch(e) { /* already exists */ }

    // ========== AUTO-COMPLETE: Thông Báo Gr Zalo Spam Được ==========
    // After each mark, check if ALL results are marked → auto-complete lock task
    async function _autoCompleteZaloSpamTask(userId) {
        try {
            // Get ALL zalo results for this user
            const allResults = await db.all(
                `SELECT r.id, r.spam_eligible, r.spam_not_eligible, r.pending_join, r.marked_at
                 FROM zalo_task_results r
                 JOIN zalo_daily_tasks t ON r.task_id = t.id
                 WHERE t.user_id = $1`, [userId]
            );
            if (allResults.length === 0) return; // No results at all

            // Filter "Group Có Zalo": not yet spam_eligible or spam_not_eligible
            const groupCoZalo = allResults.filter(r => !r.spam_eligible && !r.spam_not_eligible);

            // Calculate start of current week (Monday VN time)
            const nowVN = new Date(Date.now() + 7 * 3600000);
            const dayOfWeek = nowVN.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const weekStart = new Date(nowVN);
            weekStart.setDate(weekStart.getDate() + mondayOffset);
            weekStart.setHours(0, 0, 0, 0);

            // Check if any are still unmarked or outdated
            for (const r of groupCoZalo) {
                if (r.pending_join) {
                    const markedAt = r.marked_at ? new Date(r.marked_at) : null;
                    if (!markedAt || markedAt < weekStart) return; // outdated pending_join
                } else {
                    return; // Not marked at all
                }
            }

            // ALL results are properly marked! Auto-complete the lock task
            const todayStr = nowVN.toISOString().split('T')[0];

            // Find lock task "Thông Báo Gr Zalo Spam Được"
            const lockTask = await db.get(
                `SELECT lt.id, lt.task_name, lt.requires_approval, lt.recurrence_type, lt.recurrence_value
                 FROM lock_tasks lt
                 WHERE lt.is_active = true
                   AND LOWER(lt.task_name) LIKE '%thông báo gr zalo spam%'
                 LIMIT 1`
            );
            if (!lockTask) return; // No matching lock task

            // Determine the completion date: use today if task is scheduled today,
            // otherwise use the nearest scheduled day in the current week
            let completionDate = todayStr;
            if (lockTask.recurrence_type === 'weekly' && lockTask.recurrence_value) {
                const scheduledDays = lockTask.recurrence_value.split(',').map(Number); // e.g. [2,3] = Tue,Wed
                const vnDay = nowVN.getDay(); // 0=Sun
                if (!scheduledDays.includes(vnDay)) {
                    // Find nearest past or future scheduled day in current week
                    let bestDay = scheduledDays[0];
                    let bestDist = 999;
                    for (const sd of scheduledDays) {
                        const dist = Math.abs(sd - vnDay);
                        if (dist < bestDist) { bestDist = dist; bestDay = sd; }
                    }
                    // Calculate that date
                    const diff = bestDay - vnDay;
                    const targetDate = new Date(nowVN);
                    targetDate.setDate(targetDate.getDate() + diff);
                    completionDate = targetDate.toISOString().split('T')[0];
                }
            }

            // Check if user is assigned to this lock task
            const assignment = await db.get(
                `SELECT 1 FROM lock_task_assignments WHERE lock_task_id = $1 AND user_id = $2`,
                [lockTask.id, userId]
            );
            if (!assignment) return; // Not assigned

            // Check if already completed for this scheduled date
            const existing = await db.get(
                `SELECT id, status, redo_count FROM lock_task_completions
                 WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3
                 ORDER BY redo_count DESC LIMIT 1`,
                [lockTask.id, userId, completionDate]
            );
            if (existing && (existing.status === 'approved' || existing.status === 'pending')) return; // Already done

            const redoCount = existing ? existing.redo_count + 1 : 0;
            const status = lockTask.requires_approval ? 'pending' : 'approved';

            // Build summary content
            const spamOk = allResults.filter(r => r.spam_eligible).length;
            const spamNo = allResults.filter(r => r.spam_not_eligible).length;
            const pendingJoin = groupCoZalo.filter(r => r.pending_join).length;
            const autoContent = `✅ Tự động hoàn thành — Đã đánh dấu tất cả ${allResults.length} nhóm: Spam Được (${spamOk}), Không Spam Được (${spamNo}), Chưa Tham Gia (${pendingJoin})`;

            await db.run(
                `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, redo_count, proof_url, content, status, quantity_done)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                 ON CONFLICT (lock_task_id, user_id, completion_date, redo_count) DO UPDATE SET content=$6, status=$7, quantity_done=$8, created_at=NOW()`,
                [lockTask.id, userId, completionDate, redoCount, '', autoContent, status, 1]
            );
            console.log(`[ZaloSpam] Auto-completed lock task for user ${userId} on ${completionDate}`);
        } catch(e) {
            console.error('[ZaloSpam] Auto-complete error:', e.message);
        }
    }

    // POST /api/zalo-results/:id/spam-eligible — Mark spam_eligible with reason + image
    fastify.post('/api/zalo-results/:id/spam-eligible', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const result = await db.get('SELECT r.*, t.user_id FROM zalo_task_results r JOIN zalo_daily_tasks t ON r.task_id = t.id WHERE r.id = $1', [id]);
        if (!result) return reply.code(404).send({ error: 'Không tìm thấy' });
        const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(req.user.role);
        if (result.user_id !== req.user.id && !isManager) return reply.code(403).send({ error: 'Không có quyền' });
        const { reason, image_data } = req.body || {};
        if (!reason || !reason.trim()) return reply.code(400).send({ error: 'Vui lòng nhập lý do' });
        if (!image_data) return reply.code(400).send({ error: 'Vui lòng chụp/chọn hình ảnh minh chứng' });
        // Save image
        let imagePath = null;
        try {
            const commaIdx = image_data.indexOf(',');
            if (commaIdx > -1) {
                const header = image_data.substring(0, commaIdx);
                const extMatch = header.match(/image\/(\w+)/);
                const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'png';
                const buffer = Buffer.from(image_data.substring(commaIdx + 1), 'base64');
                const uploadDir = path.join(__dirname, '..', 'uploads', 'zalo_spam');
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                const filename = `mark_${id}_${Date.now()}.${ext}`;
                fs.writeFileSync(path.join(uploadDir, filename), buffer);
                imagePath = '/uploads/zalo_spam/' + filename;
            }
        } catch(e) { console.error('[ZaloSpam] Image save error:', e); }
        await db.run('UPDATE zalo_task_results SET spam_eligible = TRUE, spam_not_eligible = FALSE, pending_join = FALSE, marked_at = NOW(), spam_reason = $1, spam_image = $2 WHERE id = $3', [reason.trim(), imagePath, id]);
        // Auto-complete check
        await _autoCompleteZaloSpamTask(result.user_id);
        return { success: true, spam_eligible: true };
    });

    // POST /api/zalo-results/:id/spam-not-eligible — Mark as spam NOT eligible with reason + image
    fastify.post('/api/zalo-results/:id/spam-not-eligible', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const result = await db.get('SELECT r.*, t.user_id FROM zalo_task_results r JOIN zalo_daily_tasks t ON r.task_id = t.id WHERE r.id = $1', [id]);
        if (!result) return reply.code(404).send({ error: 'Không tìm thấy' });
        const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(req.user.role);
        if (result.user_id !== req.user.id && !isManager) return reply.code(403).send({ error: 'Không có quyền' });
        const { reason, image_data } = req.body || {};
        if (!reason || !reason.trim()) return reply.code(400).send({ error: 'Vui lòng nhập lý do' });
        if (!image_data) return reply.code(400).send({ error: 'Vui lòng chụp/chọn hình ảnh minh chứng' });
        // Save image
        let imagePath = null;
        try {
            const commaIdx = image_data.indexOf(',');
            if (commaIdx > -1) {
                const header = image_data.substring(0, commaIdx);
                const extMatch = header.match(/image\/(\w+)/);
                const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'png';
                const buffer = Buffer.from(image_data.substring(commaIdx + 1), 'base64');
                const uploadDir = path.join(__dirname, '..', 'uploads', 'zalo_spam');
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                const filename = `mark_${id}_${Date.now()}.${ext}`;
                fs.writeFileSync(path.join(uploadDir, filename), buffer);
                imagePath = '/uploads/zalo_spam/' + filename;
            }
        } catch(e) { console.error('[ZaloSpam] Image save error:', e); }
        await db.run('UPDATE zalo_task_results SET spam_not_eligible = TRUE, spam_eligible = FALSE, pending_join = FALSE, marked_at = NOW(), spam_reason = $1, spam_image = $2 WHERE id = $3', [reason.trim(), imagePath, id]);
        // Auto-complete check
        await _autoCompleteZaloSpamTask(result.user_id);
        return { success: true, spam_not_eligible: true };
    });

    // POST /api/zalo-results/:id/join-status — Toggle join_status on a result
    fastify.post('/api/zalo-results/:id/join-status', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const result = await db.get('SELECT r.*, t.user_id FROM zalo_task_results r JOIN zalo_daily_tasks t ON r.task_id = t.id WHERE r.id = $1', [id]);
        if (!result) return reply.code(404).send({ error: 'Không tìm thấy' });
        const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(req.user.role);
        if (result.user_id !== req.user.id && !isManager) return reply.code(403).send({ error: 'Không có quyền' });
        const newVal = !result.join_status;
        await db.run('UPDATE zalo_task_results SET join_status = $1 WHERE id = $2', [newVal, id]);
        return { success: true, join_status: newVal };
    });

    // POST /api/zalo-results/:id/pending-join — Mark as pending join (can't join group yet)
    fastify.post('/api/zalo-results/:id/pending-join', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id);
        const result = await db.get('SELECT r.*, t.user_id FROM zalo_task_results r JOIN zalo_daily_tasks t ON r.task_id = t.id WHERE r.id = $1', [id]);
        if (!result) return reply.code(404).send({ error: 'Không tìm thấy' });
        const isManager = ['giam_doc','quan_ly_cap_cao','truong_phong'].includes(req.user.role);
        if (result.user_id !== req.user.id && !isManager) return reply.code(403).send({ error: 'Không có quyền' });
        // Set pending_join, clear spam states so it stays in 'Group Có Zalo'
        await db.run('UPDATE zalo_task_results SET pending_join = TRUE, spam_eligible = FALSE, spam_not_eligible = FALSE, marked_at = NOW() WHERE id = $1', [id]);
        // Auto-complete check
        await _autoCompleteZaloSpamTask(result.user_id);
        return { success: true, pending_join: true };
    });

    // GET /api/zalo-tasks/team — Manager view: all tasks with results
    fastify.get('/api/zalo-tasks/team', { preHandler: [authenticate] }, async (req) => {
        const { date, user_id, dept_id, date_from, date_to } = req.query;
        let where = '1=1';
        const params = [];
        let pi = 1;
        if (date_from && date_to) {
            where += ` AND t.assigned_date BETWEEN $${pi} AND $${pi+1}`;
            params.push(date_from, date_to); pi += 2;
        } else if (date !== 'all') {
            const d = date || _vnToday();
            where += ` AND t.assigned_date = $${pi}`; params.push(d); pi++;
        }
        if (user_id) { where += ` AND t.user_id = $${pi}`; params.push(Number(user_id)); pi++; }
        else if (dept_id) {
            const deptIdNum = Number(dept_id);
            const childDepts = await db.all('SELECT id FROM departments WHERE parent_id = $1 AND status = $2', [deptIdNum, 'active']);
            const allDeptIds = [deptIdNum, ...childDepts.map(d => d.id)];
            const ph = allDeptIds.map((_, i) => `$${pi + i}`).join(',');
            where += ` AND u.department_id IN (${ph})`;
            params.push(...allDeptIds); pi += allDeptIds.length;
        }
        const tasks = await db.all(`SELECT t.*, p.url as pool_url, u.full_name as user_name, u.username, d.name as dept_name
            FROM zalo_daily_tasks t JOIN zalo_link_pool p ON t.pool_id = p.id
            LEFT JOIN users u ON t.user_id = u.id LEFT JOIN departments d ON u.department_id = d.id
            WHERE ${where} ORDER BY t.user_id, t.id`, params);
        // Attach results
        for (const task of tasks) {
            task.results = await db.all(`SELECT r.*, su.full_name as spam_user_name FROM zalo_task_results r LEFT JOIN users su ON r.spam_by = su.id WHERE r.task_id = $1 ORDER BY r.id`, [task.id]);
        }
        return { tasks };
    });

    // POST /api/zalo-results/:id/spam — Mark result as spammed with screenshot
    fastify.post('/api/zalo-results/:id/spam', { preHandler: [authenticate] }, async (req, reply) => {
        // Only users assigned "Setup Spam Zalo" lock task can mark spam
        const hasSpamTask = await db.get(
            `SELECT lt.id FROM lock_tasks lt
             JOIN lock_task_assignments lta ON lta.lock_task_id = lt.id
             WHERE lt.is_active = true AND lt.task_name ILIKE '%setup spam zalo%'
               AND lta.user_id = $1 LIMIT 1`, [req.user.id]
        );
        if (!hasSpamTask) {
            return reply.code(403).send({ error: 'Bạn chưa được gán công việc "Setup Spam Zalo" — không có quyền đánh dấu spam' });
        }
        const id = Number(req.params.id);
        const { image_data, reason } = req.body || {};
        if (!image_data) return reply.code(400).send({ error: 'Vui lòng chụp ảnh minh chứng' });

        const result = await db.get('SELECT * FROM zalo_task_results WHERE id = $1', [id]);
        if (!result) return reply.code(404).send({ error: 'Không tìm thấy kết quả' });

        // Save screenshot
        let screenshotPath = null;
        try {
            const commaIdx = image_data.indexOf(',');
            if (commaIdx > -1) {
                const header = image_data.substring(0, commaIdx);
                const extMatch = header.match(/image\/(\w+)/);
                const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'png';
                const buffer = Buffer.from(image_data.substring(commaIdx + 1), 'base64');
                const uploadDir = path.join(__dirname, '..', 'uploads', 'zalo_spam');
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                const filename = `spam_${id}_${Date.now()}.${ext}`;
                fs.writeFileSync(path.join(uploadDir, filename), buffer);
                screenshotPath = '/uploads/zalo_spam/' + filename;
            }
        } catch (e) { console.error('[ZaloSpam] Image save error:', e); }

        await db.run(`UPDATE zalo_task_results SET spam_status = 'done', spam_screenshot = $1, spam_by = $2, spam_at = NOW(), marked_at = NOW(), spam_reason = COALESCE($4, spam_reason) WHERE id = $3`, [screenshotPath, req.user.id, id, reason || null]);

        // Check if all results for this task's pool link are done → mark pool as completed
        const taskR = await db.get('SELECT task_id FROM zalo_task_results WHERE id = $1', [id]);
        if (taskR) {
            const task = await db.get('SELECT pool_id FROM zalo_daily_tasks WHERE id = $1', [taskR.task_id]);
            if (task) {
                const pendingR = await db.get(`SELECT COUNT(*) as c FROM zalo_task_results WHERE task_id = $1 AND spam_status != 'done'`, [taskR.task_id]);
                if (Number(pendingR.c) === 0) {
                    await db.run(`UPDATE zalo_link_pool SET status = 'completed' WHERE id = $1`, [task.pool_id]);
                }
            }
        }

        // ========== AUTO-COMPLETE "Setup Spam Zalo" TASK ==========
        try {
            const remainingCount = await db.get(
                `SELECT COUNT(*) as c FROM zalo_task_results WHERE spam_eligible = true AND spam_status != 'done'`
            );
            if (Number(remainingCount.c) === 0) {
                // All QL Chưa Spam groups are done → auto-complete the task
                const nowVN = new Date(Date.now() + 7 * 3600000);
                const todayStr = nowVN.toISOString().split('T')[0];
                const dayOfWeek = nowVN.getDay(); // 0=Sun...3=Wed
                // Find "Setup Spam Zalo" task assigned to this user
                const spamTask = await db.get(
                    `SELECT lt.id FROM lock_tasks lt
                     JOIN lock_task_assignments lta ON lta.lock_task_id = lt.id
                     WHERE lt.is_active = true AND lt.task_name ILIKE '%setup spam zalo%'
                       AND lta.user_id = $1
                     LIMIT 1`, [req.user.id]
                );
                if (spamTask) {
                    // Check if not already completed today
                    const existing = await db.get(
                        `SELECT id FROM lock_task_completions WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3 AND status IN ('pending','approved')`,
                        [spamTask.id, req.user.id, todayStr]
                    );
                    if (!existing) {
                        await db.run(
                            `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, redo_count, proof_url, content, status, quantity_done)
                             VALUES ($1, $2, $3, 0, $4, $5, 'approved', 0)
                             ON CONFLICT (lock_task_id, user_id, completion_date, redo_count) DO NOTHING`,
                            [spamTask.id, req.user.id, todayStr, screenshotPath || '', 'Tự động hoàn thành — đã spam hết tất cả nhóm QL Chưa Spam']
                        );
                        console.log(`[ZaloSpam] Auto-completed "Setup Spam Zalo" for user ${req.user.id} on ${todayStr}`);
                    }
                }
            }
        } catch (autoErr) { console.error('[ZaloSpam] Auto-complete check error:', autoErr); }
        // ========== END AUTO-COMPLETE ==========

        return { success: true, screenshot: screenshotPath };
    });

    // POST /api/zalo-results/:id/reset-to-group — Reset result back to "Group Có Zalo" (Chưa Join)
    fastify.post('/api/zalo-results/:id/reset-to-group', { preHandler: [authenticate] }, async (req, reply) => {
        // Allow managers OR users assigned "Setup Spam Zalo" lock task
        const managerRoles = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'];
        const isManager = managerRoles.includes(req.user.role);
        if (!isManager) {
            const hasSpamTask = await db.get(
                `SELECT lt.id FROM lock_tasks lt
                 JOIN lock_task_assignments lta ON lta.lock_task_id = lt.id
                 WHERE lt.is_active = true AND lt.task_name ILIKE '%setup spam zalo%'
                   AND lta.user_id = $1 LIMIT 1`, [req.user.id]
            );
            if (!hasSpamTask) {
                return reply.code(403).send({ error: 'Bạn chưa được gán công việc "Setup Spam Zalo"' });
            }
        }

        const id = Number(req.params.id);
        const result = await db.get('SELECT * FROM zalo_task_results WHERE id = $1', [id]);
        if (!result) return reply.code(404).send({ error: 'Không tìm thấy kết quả' });

        console.log(`[ZaloSpam] reset-to-group called for id=${id}, user=${req.user.id}, role=${req.user.role}`);

        // Mark as "not_joined" + reset to "Group Có Zalo" state for NV
        const updateResult = await db.run(
            `UPDATE zalo_task_results SET
                spam_eligible = false,
                spam_not_eligible = false,
                join_status = false,
                pending_join = false,
                spam_status = 'not_joined',
                spam_screenshot = NULL,
                spam_by = NULL,
                spam_at = NULL,
                spam_reason = NULL,
                marked_at = NOW()
             WHERE id = $1`, [id]
        );
        console.log(`[ZaloSpam] UPDATE result:`, updateResult);

        // Verify the update
        const verify = await db.get('SELECT id, spam_status, spam_eligible FROM zalo_task_results WHERE id = $1', [id]);
        console.log(`[ZaloSpam] Result #${id} after update:`, verify);
        return { success: true };
    });

    // GET /api/zalo-tasks/stats — Stats for sidebar display
    fastify.get('/api/zalo-tasks/stats', { preHandler: [authenticate] }, async (req) => {
        const { user_id } = req.query;
        const uid = user_id ? Number(user_id) : req.user.id;
        const today = _vnToday();
        const quota = await _getZaloQuota(uid);

        // Today
        const todayR = await db.get(`SELECT COUNT(*) FILTER (WHERE status IN ('done','no_result')) as done, COUNT(*) as total FROM zalo_daily_tasks WHERE user_id = $1 AND assigned_date = $2`, [uid, today]);
        // Week
        const weekStart = new Date(Date.now() + 7 * 3600000);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const weekStr = weekStart.toISOString().split('T')[0];
        const weekR = await db.get(`SELECT COUNT(*) FILTER (WHERE status IN ('done','no_result')) as done, COUNT(*) as total FROM zalo_daily_tasks WHERE user_id = $1 AND assigned_date BETWEEN $2 AND $3`, [uid, weekStr, today]);
        // Month
        const monthStr = today.substring(0, 7) + '-01';
        const monthR = await db.get(`SELECT COUNT(*) FILTER (WHERE status IN ('done','no_result')) as done, COUNT(*) as total FROM zalo_daily_tasks WHERE user_id = $1 AND assigned_date BETWEEN $2 AND $3`, [uid, monthStr, today]);

        return {
            today: Number(todayR?.done || 0),
            today_total: Number(todayR?.total || 0),
            target: quota,
            week: Number(weekR?.done || 0),
            week_total: Number(weekR?.total || 0),
            month: Number(monthR?.done || 0),
            month_total: Number(monthR?.total || 0),
        };
    });

};


