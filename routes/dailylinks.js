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
            `SELECT e.*, e.links_json, u.full_name as user_name, u.username, d.name as dept_name
             FROM daily_link_entries e LEFT JOIN users u ON e.user_id = u.id LEFT JOIN departments d ON u.department_id = d.id
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
        const today = _vnToday();
        const linkLower = fb_link.trim().toLowerCase();
        // Skip single-link dup check for addcmt and multi-link modules
        const isMultiLink = ['dang_video', 'dang_content'].includes(module_type);
        // Modules that require GLOBAL uniqueness (no date filter)
        const globalUnique = ['dang_group'];
        if (module_type !== 'addcmt' && !isMultiLink) {
            if (globalUnique.includes(module_type)) {
                // Global dup: check across ALL users and ALL dates
                const dupGlobal = await db.get(
                    `SELECT e.id, e.user_id, u.full_name FROM daily_link_entries e JOIN users u ON e.user_id = u.id
                     WHERE LOWER(e.fb_link) = $1 AND e.module_type = $2 LIMIT 1`, [linkLower, module_type]
                );
                if (dupGlobal) {
                    const who = dupGlobal.user_id === req.user.id ? 'chính bạn' : dupGlobal.full_name;
                    return reply.code(400).send({ error: `Link này đã được nhập bởi ${who}. Mỗi link Group chỉ được nhập 1 lần duy nhất!` });
                }
            } else {
                const dup = await db.get('SELECT id FROM daily_link_entries WHERE LOWER(fb_link) = $1 AND user_id = $2 AND entry_date = $3 AND module_type = $4', [linkLower, req.user.id, today, module_type]);
                if (dup) return reply.code(400).send({ error: 'Bạn đã nhập link này hôm nay' });
                const dupOther = await db.get('SELECT e.id, u.full_name FROM daily_link_entries e JOIN users u ON e.user_id = u.id WHERE LOWER(e.fb_link) = $1 AND e.user_id != $2 AND e.module_type = $3 LIMIT 1', [linkLower, req.user.id, module_type]);
                if (dupOther) return reply.code(400).send({ error: `Link đã được nhập bởi ${dupOther.full_name}` });
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

        // Handle image upload for addcmt module
        let imagePath = null;
        if (module_type === 'addcmt' && image_data) {
            try {
                const commaIdx = image_data.indexOf(',');
                if (commaIdx > -1) {
                    const header = image_data.substring(0, commaIdx);
                    const extMatch = header.match(/image\/(\w+)/);
                    const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'png';
                    const buffer = Buffer.from(image_data.substring(commaIdx + 1), 'base64');
                    const uploadDir = path.join(__dirname, '..', 'uploads', 'addcmt');
                    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                    const filename = `${req.user.id}_${Date.now()}.${ext}`;
                    const filePath = path.join(uploadDir, filename);
                    try {
                        const sharp = require('sharp');
                        await sharp(buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(filePath.replace(/\.[^.]+$/, '.jpg'));
                        imagePath = '/uploads/addcmt/' + filename.replace(/\.[^.]+$/, '.jpg');
                    } catch(sharpErr) {
                        fs.writeFileSync(filePath, buffer);
                        imagePath = '/uploads/addcmt/' + filename;
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

        await db.run('INSERT INTO daily_link_entries (user_id, entry_date, module_type, fb_link, image_path, links_json) VALUES ($1, $2, $3, $4, $5, $6)',
            [req.user.id, today, module_type, fb_link.trim(), imagePath, linksJsonFinal ? JSON.stringify(linksJsonFinal) : null]);
        console.log(`[DailyLinks POST] STAGE 4 — INSERT SUCCESS for ${module_type}, user ${req.user.id}`);
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

    async function _getDeptIds(user) {
        const a = await db.all('SELECT department_id FROM task_approvers WHERE user_id = $1', [user.id]);
        const s = new Set(a.map(x => x.department_id));
        if (user.department_id) s.add(user.department_id);
        return [...s];
    }
};
