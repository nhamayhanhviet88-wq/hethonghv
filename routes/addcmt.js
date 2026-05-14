// ========== ADD/CMT ĐỐI TÁC KH — BACKEND ==========
const path = require('path');
const fs = require('fs');
const { getManagedDeptIds } = require('../utils/getManagedDeptIds');
const { getVNToday } = require('../utils/workingDay');

module.exports = async function (fastify) {
    const db = require('../db/pool');
    const { authenticate } = require('../middleware/auth');

    // ===== AUTO-CREATE TABLE =====
    await db.exec(`
        CREATE TABLE IF NOT EXISTS addcmt_entries (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
            fb_link TEXT NOT NULL,
            image_path TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_addcmt_user_date ON addcmt_entries(user_id, entry_date);
        CREATE INDEX IF NOT EXISTS idx_addcmt_date ON addcmt_entries(entry_date);
    `);

    // Add image_path column if not exists
    try { await db.exec('ALTER TABLE addcmt_entries ADD COLUMN IF NOT EXISTS image_path TEXT'); } catch(e) {}

    // ★ BACKFILL: Migrate existing addcmt_entries → daily_link_entries (one-time sync)
    try {
        const missingRows = await db.all(`
            SELECT a.user_id, a.entry_date, a.fb_link
            FROM addcmt_entries a
            WHERE NOT EXISTS (
                SELECT 1 FROM daily_link_entries d
                WHERE d.user_id = a.user_id AND d.entry_date = a.entry_date AND d.module_type = 'addcmt' AND d.fb_link = a.fb_link
            )
            ORDER BY a.entry_date, a.user_id
        `);
        if (missingRows.length > 0) {
            console.log(`[AddCmt BACKFILL] Found ${missingRows.length} entries to sync to daily_link_entries...`);
            const syncedPairs = new Set(); // track user+date pairs for scoring sync
            for (const row of missingRows) {
                const ed = typeof row.entry_date === 'string' ? row.entry_date.split('T')[0] : row.entry_date?.toISOString?.()?.split('T')[0];
                await db.run(
                    'INSERT INTO daily_link_entries (user_id, entry_date, fb_link, module_type) VALUES ($1, $2, $3, $4)',
                    [row.user_id, ed, row.fb_link, 'addcmt']
                );
                syncedPairs.add(`${row.user_id}_${ed}`);
            }
            console.log(`[AddCmt BACKFILL] Inserted ${missingRows.length} records. Running scoring sync...`);
            // Defer scoring sync to after route registration (non-blocking)
            setTimeout(async () => {
                for (const pair of syncedPairs) {
                    const [uid, date] = pair.split('_');
                    try { await _syncAddCmtScoring(Number(uid), date); } catch(e) {}
                }
                console.log(`[AddCmt BACKFILL] Scoring sync done for ${syncedPairs.size} user-date pairs.`);
            }, 3000);
        }
    } catch(bfErr) {
        console.error('[AddCmt BACKFILL] Error (non-fatal):', bfErr.message);
    }

    function _vnToday() {
        return getVNToday();
    }

    // ★ HELPER: Sync addcmt scoring to CV Điểm (task_point_reports) + CV Khóa (lock_task_completions)
    // Called after INSERT/DELETE on daily_link_entries to keep both systems in sync
    async function _syncAddCmtScoring(userId, date) {
        const MODULE = 'addcmt';
        const PATTERN = '%Add%Cmt%Đối Tác%';
        const PATTERN_RE = /add.*cmt.*đối.*tác/i;

        try {
            // 1. Count current entries in daily_link_entries
            const countRes = await db.get(
                'SELECT COUNT(*) as cnt FROM daily_link_entries WHERE user_id = $1 AND entry_date = $2 AND module_type = $3',
                [userId, date, MODULE]
            );
            const entryCount = parseInt(countRes?.cnt || 0);

            // 2. Auto-score CV Điểm → task_point_reports
            const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
            let tpl = await db.get("SELECT id, min_quantity, points, requires_approval FROM task_point_templates WHERE target_type = 'individual' AND target_id = $1 AND task_name ILIKE $2 LIMIT 1", [userId, PATTERN]);
            if (!tpl && user?.department_id) tpl = await db.get("SELECT id, min_quantity, points, requires_approval FROM task_point_templates WHERE target_type = 'team' AND target_id = $1 AND task_name ILIKE $2 LIMIT 1", [user.department_id, PATTERN]);
            if (!tpl) tpl = await db.get("SELECT id, min_quantity, points, requires_approval FROM task_point_templates WHERE task_name ILIKE $1 LIMIT 1", [PATTERN]);

            if (tpl) {
                // Check user override
                let target = Number(tpl.min_quantity);
                let points = Number(tpl.points);
                const ov = await db.get('SELECT custom_points, custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3', [userId, 'diem', tpl.id]);
                if (ov?.custom_min_quantity != null) target = Number(ov.custom_min_quantity);
                if (ov?.custom_points != null) points = Number(ov.custom_points);

                const metTarget = entryCount >= target;
                const qty = metTarget ? target : entryCount;

                // Check force_approval
                const faUser = await db.get('SELECT force_approval FROM users WHERE id = $1', [userId]);
                const faForce = await db.get('SELECT id FROM user_force_approvals WHERE user_id = $1 AND task_type = $2 AND task_ref_id = $3', [userId, 'diem', tpl.id]);
                const needsApproval = tpl.requires_approval || faUser?.force_approval || !!faForce;
                const shouldAutoApprove = !needsApproval;

                // Upsert task_point_reports
                const existing = await db.get(
                    'SELECT id, status FROM task_point_reports WHERE template_id = $1 AND user_id = $2 AND report_date = $3 ORDER BY redo_count DESC LIMIT 1',
                    [tpl.id, userId, date]
                );

                if (existing) {
                    if (existing.status !== 'approved') {
                        await db.run(
                            `UPDATE task_point_reports SET quantity = $1, points_earned = 0, content = $2, report_value = $3, status = 'pending' WHERE id = $4`,
                            [qty, `[Tự động] ${entryCount}/${target} addcmt`, `${entryCount}/${target}`, existing.id]
                        );
                    }
                } else if (entryCount > 0) {
                    const status = shouldAutoApprove ? 'approved' : 'pending';
                    const earned = shouldAutoApprove ? (metTarget ? points : 0) : 0;
                    await db.run(
                        `INSERT INTO task_point_reports (template_id, user_id, report_date, quantity, points_earned, status, content, report_type, report_value) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [tpl.id, userId, date, qty, earned, status, `[Tự động] ${entryCount}/${target} addcmt`, 'link', `${entryCount}/${target}`]
                    );
                }
                console.log(`[AddCmt] Auto-scored CV Điểm: user=${userId}, count=${entryCount}/${target}, pts=${points}`);
            }

            // 3. Sync CV Khóa → lock_task_completions
            const lockTasks = await db.all("SELECT id, task_name, requires_approval, min_quantity FROM lock_tasks WHERE is_active = true");
            const matchLTs = lockTasks.filter(lt => PATTERN_RE.test(lt.task_name));
            for (const lt of matchLTs) {
                const comp = await db.get(
                    "SELECT id, status FROM lock_task_completions WHERE lock_task_id = $1 AND user_id = $2 AND completion_date = $3 ORDER BY id DESC LIMIT 1",
                    [lt.id, userId, date]
                );

                const minQty = lt.min_quantity || 1;
                const metLockTarget = entryCount >= minQty;

                // Check force_approval for lock
                const fuUser = await db.get('SELECT force_approval FROM users WHERE id = $1', [userId]);
                const fuForce = await db.get('SELECT id FROM user_force_approvals WHERE user_id = $1 AND task_type = $2 AND task_ref_id = $3', [userId, 'lock', lt.id]);
                const fuNeedsApproval = lt.requires_approval || fuUser?.force_approval || !!fuForce;

                if (!comp) {
                    if (!metLockTarget && !fuNeedsApproval) continue; // Chưa đủ SL, không cần duyệt → skip
                    const status = (!metLockTarget || fuNeedsApproval) ? 'pending' : 'approved';
                    let deadline = null;
                    if (status === 'pending') {
                        try {
                            const { calculateRealDeadline, toLocalTimestamp } = require('./deadline-checker');
                            deadline = toLocalTimestamp(await calculateRealDeadline(new Date(), null));
                        } catch(e2) {}
                    }
                    await db.run(
                        `INSERT INTO lock_task_completions (lock_task_id, user_id, completion_date, content, status, approval_deadline, quantity_done, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
                        [lt.id, userId, date, `[Tự động] addcmt`, status, deadline, entryCount]
                    );
                    console.log(`[AddCmt] Created ${status} lock_task_completion for ${date}, task=${lt.task_name} (${entryCount}/${minQty})`);
                } else if (comp.status !== 'approved') {
                    const status = (!metLockTarget || fuNeedsApproval) ? 'pending' : 'approved';
                    await db.run(
                        `UPDATE lock_task_completions SET status = $1, quantity_done = $2, updated_at = NOW() WHERE id = $3`,
                        [status, entryCount, comp.id]
                    );
                    console.log(`[AddCmt] Updated lock_task_completion id=${comp.id} to ${status} (${entryCount}/${minQty})`);
                }
            }
        } catch(err) {
            console.error('[AddCmt] Scoring sync error:', err.message);
        }
    }

    // GET entries
    fastify.get('/api/addcmt/entries', { preHandler: [authenticate] }, async (req) => {
        const { date, date_from, date_to, user_id, dept_id } = req.query;
        const role = req.user.role;
        let where, params, pi;
        if (date_from && date_to) {
            where = 'e.entry_date >= $1 AND e.entry_date <= $2'; params = [date_from, date_to]; pi = 3;
        } else {
            const targetDate = date || _vnToday();
            where = 'e.entry_date = $1'; params = [targetDate]; pi = 2;
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
        else if (!['giam_doc','quan_ly_cap_cao'].includes(role)) {
            const dIds = await getManagedDeptIds(db, req.user.id);
            if (dIds.length > 0) { const ph = dIds.map((_,i)=>`$${pi+i}`).join(','); where += ` AND u.department_id IN (${ph})`; params.push(...dIds); pi += dIds.length; }
            else { where += ` AND e.user_id = $${pi}`; params.push(req.user.id); pi++; }
        }

        const rows = await db.all(
            `SELECT e.*, u.full_name as user_name, u.username, d.name as dept_name
             FROM addcmt_entries e LEFT JOIN users u ON e.user_id = u.id LEFT JOIN departments d ON u.department_id = d.id
             WHERE ${where} ORDER BY e.created_at DESC`, params
        );
        return { entries: rows };
    });

    // POST create (supports multipart image upload)
    fastify.post('/api/addcmt/entries', { preHandler: [authenticate] }, async (req, reply) => {
        const ct = req.headers['content-type'] || '';
        let fb_link = '';
        let imagePath = '';

        if (ct.includes('multipart')) {
            const parts = req.parts();
            let fileBuffer = null;
            for await (const part of parts) {
                if (part.file) {
                    const chunks = [];
                    for await (const chunk of part.file) chunks.push(chunk);
                    fileBuffer = Buffer.concat(chunks);
                } else {
                    if (part.fieldname === 'fb_link') fb_link = part.value || '';
                    if (part.fieldname === 'image_data') {
                        // base64 image from paste
                        const base64 = part.value;
                        if (base64 && base64.startsWith('data:image')) {
                            const matches = base64.match(/^data:image\/\w+;base64,(.+)$/);
                            if (matches) fileBuffer = Buffer.from(matches[1], 'base64');
                        }
                    }
                }
            }
            // Compress and save image
            if (fileBuffer && fileBuffer.length > 0) {
                const { compressImage } = require('../utils/imageCompressor');
                fileBuffer = await compressImage(fileBuffer, { maxWidth: 1200, quality: 80 });
                const uploadDir = path.join(__dirname, '..', 'uploads', 'addcmt');
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                const fileName = `addcmt_${req.user.id}_${Date.now()}.jpg`;
                fs.writeFileSync(path.join(uploadDir, fileName), fileBuffer);
                imagePath = `/uploads/addcmt/${fileName}`;
            }
        } else {
            // JSON body
            fb_link = req.body?.fb_link || '';
            // Handle base64 image from JSON
            const imageData = req.body?.image_data;
            if (imageData && imageData.startsWith('data:image')) {
                const matches = imageData.match(/^data:image\/\w+;base64,(.+)$/);
                if (matches) {
                    const { compressImage } = require('../utils/imageCompressor');
                    let buf = Buffer.from(matches[1], 'base64');
                    buf = await compressImage(buf, { maxWidth: 1200, quality: 80 });
                    const uploadDir = path.join(__dirname, '..', 'uploads', 'addcmt');
                    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                    const fileName = `addcmt_${req.user.id}_${Date.now()}.jpg`;
                    fs.writeFileSync(path.join(uploadDir, fileName), buf);
                    imagePath = `/uploads/addcmt/${fileName}`;
                }
            }
        }

        if (!fb_link?.trim()) fb_link = 'addcmt_' + Date.now(); // auto-generate if empty
        const today = _vnToday();

        await db.run('INSERT INTO addcmt_entries (user_id, entry_date, fb_link, image_path) VALUES ($1, $2, $3, $4)', [req.user.id, today, fb_link.trim(), imagePath || null]);

        // ★ DUAL-WRITE: Sync to daily_link_entries → enables CV Điểm + CV Khóa linkage in Lịch Khóa Biểu
        try {
            await db.run(
                'INSERT INTO daily_link_entries (user_id, entry_date, fb_link, module_type) VALUES ($1, $2, $3, $4)',
                [req.user.id, today, fb_link.trim(), 'addcmt']
            );
            await _syncAddCmtScoring(req.user.id, today);
            console.log(`[AddCmt] Dual-write OK: user=${req.user.id}, date=${today}, fb_link=${fb_link.trim()}`);
        } catch(syncErr) {
            console.error('[AddCmt] Dual-write error (non-fatal):', syncErr.message);
        }

        return { success: true };
    });

    // DELETE (only today, only owner)
    fastify.delete('/api/addcmt/entries/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const e = await db.get('SELECT * FROM addcmt_entries WHERE id = $1', [Number(req.params.id)]);
        if (!e) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (e.user_id !== req.user.id && req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Không phải của bạn' });
        const ed = typeof e.entry_date === 'string' ? e.entry_date.split('T')[0] : e.entry_date?.toISOString?.()?.split('T')[0];
        if (ed !== _vnToday() && req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ xóa được trong ngày' });
        await db.run('DELETE FROM addcmt_entries WHERE id = $1', [Number(req.params.id)]);

        // ★ DUAL-DELETE: Remove matching record from daily_link_entries + re-sync scoring
        try {
            const ed2 = typeof e.entry_date === 'string' ? e.entry_date.split('T')[0] : e.entry_date?.toISOString?.()?.split('T')[0];
            // Delete ONE matching daily_link_entries record (by fb_link + date + module)
            const dlMatch = await db.get(
                'SELECT id FROM daily_link_entries WHERE user_id = $1 AND entry_date = $2 AND module_type = $3 AND fb_link = $4 LIMIT 1',
                [e.user_id, ed2, 'addcmt', e.fb_link]
            );
            if (dlMatch) {
                await db.run('DELETE FROM daily_link_entries WHERE id = $1', [dlMatch.id]);
                console.log(`[AddCmt] Dual-delete OK: daily_link_entries id=${dlMatch.id}`);
            }
            await _syncAddCmtScoring(e.user_id, ed2);
        } catch(syncErr) {
            console.error('[AddCmt] Dual-delete sync error (non-fatal):', syncErr.message);
        }

        return { success: true };
    });

    // STATS
    fastify.get('/api/addcmt/stats', { preHandler: [authenticate] }, async (req) => {
        const uid = req.query.user_id ? Number(req.query.user_id) : req.user.id;
        const today = _vnToday();
        const d = new Date(today + 'T00:00:00');
        const dow = d.getDay() || 7;
        const mon = new Date(d); mon.setDate(d.getDate() - dow + 1);
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        const ws = mon.toISOString().split('T')[0], we = sun.toISOString().split('T')[0];
        const ms = today.substring(0,7)+'-01';
        const ld = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
        const me = today.substring(0,7)+'-'+String(ld).padStart(2,'0');

        const [tc, wc, mc, tgt] = await Promise.all([
            db.get('SELECT COUNT(*) as c FROM addcmt_entries WHERE user_id=$1 AND entry_date=$2', [uid, today]),
            db.get('SELECT COUNT(*) as c FROM addcmt_entries WHERE user_id=$1 AND entry_date BETWEEN $2 AND $3', [uid, ws, we]),
            db.get('SELECT COUNT(*) as c FROM addcmt_entries WHERE user_id=$1 AND entry_date BETWEEN $2 AND $3', [uid, ms, me]),
            db.get(`SELECT min_quantity FROM task_point_templates WHERE task_name ILIKE '%Add%Cmt%Đối Tác%' LIMIT 1`)
        ]);
        return { today: Number(tc.c), week: Number(wc.c), month: Number(mc.c), target: tgt ? Number(tgt.min_quantity) : 20 };
    });

    // MEMBERS (reuse same pattern)
    fastify.get('/api/addcmt/members', { preHandler: [authenticate] }, async (req) => {
        const role = req.user.role;
        let members = [];
        if (role === 'giam_doc' || role === 'quan_ly_cap_cao') {
            members = await db.all(`SELECT u.id, u.full_name, u.role, u.username, d.id as dept_id, d.name as dept_name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.status='active' AND u.role NOT IN ('giam_doc','hoa_hong','tkaffiliate') ORDER BY d.name, u.full_name`);
        } else if (['quan_ly','truong_phong'].includes(role)) {
            const dIds = await getManagedDeptIds(db, req.user.id);
            if (dIds.length > 0) { const ph = dIds.map((_,i)=>`$${i+1}`).join(','); members = await db.all(`SELECT u.id, u.full_name, u.role, u.username, d.id as dept_id, d.name as dept_name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.department_id IN (${ph}) AND u.status='active' ORDER BY d.name, u.full_name`, dIds); }
        }
        const depts = {};
        members.forEach(m => { const k = m.dept_id||0; if(!depts[k]) depts[k]={id:k,name:m.dept_name||'Chưa phân phòng',members:[]}; depts[k].members.push(m); });
        return { departments: Object.values(depts) };
    });

    // SCHEDULE INFO for report integration
    fastify.get('/api/addcmt/schedule-info', { preHandler: [authenticate] }, async (req) => {
        const uid = req.query.user_id ? Number(req.query.user_id) : req.user.id;
        const today = _vnToday();
        // Find schedule template matching this task
        const tmpl = await db.get(`SELECT * FROM task_point_templates WHERE task_name ILIKE '%Add%Cmt%Đối Tác%' LIMIT 1`);
        if (!tmpl) return { found: false };

        const todayCount = await db.get('SELECT COUNT(*) as c FROM addcmt_entries WHERE user_id=$1 AND entry_date=$2', [uid, today]);
        // Check existing report
        const report = await db.get(
            `SELECT * FROM task_point_reports WHERE template_id=$1 AND user_id=$2 AND report_date=$3 ORDER BY id DESC LIMIT 1`,
            [tmpl.id, uid, today]
        );
        return {
            found: true,
            template_id: tmpl.id,
            min_quantity: tmpl.min_quantity || 20,
            today_count: Number(todayCount.c),
            points: tmpl.points,
            report: report || null
        };
    });

    // _getDeptIds removed — now using centralized getManagedDeptIds from utils/
};
