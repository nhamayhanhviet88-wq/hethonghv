// ========== DAILY LINKS — UNIFIED MODULE ==========
// Handles: Add/Cmt, Đăng Video, Đăng Content, Đăng Group, Sedding, Tuyển Dụng
module.exports = async function (fastify) {
    const db = require('../db/pool');
    const { authenticate } = require('../middleware/auth');

    // ===== AUTO-CREATE TABLE =====
    await db.exec(`
        CREATE TABLE IF NOT EXISTS daily_link_entries (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
            module_type TEXT NOT NULL,
            fb_link TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_dle_user_date ON daily_link_entries(user_id, entry_date);
        CREATE INDEX IF NOT EXISTS idx_dle_module ON daily_link_entries(module_type);
        CREATE INDEX IF NOT EXISTS idx_dle_date ON daily_link_entries(entry_date);
    `);

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
    const VALID_TYPES = ['addcmt', 'dang_video', 'dang_content', 'dang_group', 'sedding', 'tuyen_dung', 'tim_gr_zalo'];
    // Task name patterns for target lookup
    const TASK_PATTERNS = {
        addcmt: '%Add%Cmt%Đối Tác%',
        dang_video: '%Đăng%Video%',
        dang_content: '%Đăng%Content%',
        dang_group: '%Đăng%Tìm%KH%Group%',
        sedding: '%Sedding%Cộng Đồng%',
        tuyen_dung: '%Tuyển%Dụng%SV%',
        tim_gr_zalo: '%Tìm%Gr%Zalo%'
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
        else if (dept_id) { where += ` AND u.department_id = $${pi}`; params.push(Number(dept_id)); pi++; }
        else if (!['giam_doc', 'quan_ly_cap_cao'].includes(role)) {
            const dIds = await _getDeptIds(req.user);
            if (dIds.length > 0) { const ph = dIds.map((_, i) => `$${pi + i}`).join(','); where += ` AND u.department_id IN (${ph})`; params.push(...dIds); pi += dIds.length; }
            else { where += ` AND e.user_id = $${pi}`; params.push(req.user.id); pi++; }
        }

        const rows = await db.all(
            `SELECT e.*, u.full_name as user_name, u.username, d.name as dept_name
             FROM daily_link_entries e LEFT JOIN users u ON e.user_id = u.id LEFT JOIN departments d ON u.department_id = d.id
             WHERE ${where} ORDER BY e.entry_date DESC, e.created_at DESC`, params
        );
        return { entries: rows };
    });

    // POST create
    fastify.post('/api/dailylinks/entries', { preHandler: [authenticate] }, async (req, reply) => {
        const { fb_link, module_type } = req.body || {};
        if (!fb_link?.trim()) return reply.code(400).send({ error: 'Thiếu link' });
        if (!module_type || !_validateType(module_type)) return reply.code(400).send({ error: 'Module không hợp lệ' });
        const today = _vnToday();
        const linkLower = fb_link.trim().toLowerCase();
        // Same user same day same link - block
        const dup = await db.get('SELECT id FROM daily_link_entries WHERE LOWER(fb_link) = $1 AND user_id = $2 AND entry_date = $3 AND module_type = $4', [linkLower, req.user.id, today, module_type]);
        if (dup) return reply.code(400).send({ error: 'Bạn đã nhập link này hôm nay' });
        // Cross-user dup (same module)
        const dupOther = await db.get('SELECT e.id, u.full_name FROM daily_link_entries e JOIN users u ON e.user_id = u.id WHERE LOWER(e.fb_link) = $1 AND e.user_id != $2 AND e.module_type = $3 LIMIT 1', [linkLower, req.user.id, module_type]);
        if (dupOther) return reply.code(400).send({ error: `Link đã được nhập bởi ${dupOther.full_name}` });

        await db.run('INSERT INTO daily_link_entries (user_id, entry_date, module_type, fb_link) VALUES ($1, $2, $3, $4)', [req.user.id, today, module_type, fb_link.trim()]);
        return { success: true };
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
        const { module_type } = req.query;
        if (!module_type || !_validateType(module_type)) return { today: 0, week: 0, month: 0, target: 20 };
        const uid = req.query.user_id ? Number(req.query.user_id) : req.user.id;
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
        const [tc, wc, mc, tgt] = await Promise.all([
            db.get('SELECT COUNT(*) as c FROM daily_link_entries WHERE user_id=$1 AND entry_date=$2 AND module_type=$3', [uid, today, module_type]),
            db.get('SELECT COUNT(*) as c FROM daily_link_entries WHERE user_id=$1 AND entry_date BETWEEN $2 AND $3 AND module_type=$4', [uid, ws, we, module_type]),
            db.get('SELECT COUNT(*) as c FROM daily_link_entries WHERE user_id=$1 AND entry_date BETWEEN $2 AND $3 AND module_type=$4', [uid, ms, me, module_type]),
            db.get('SELECT min_quantity FROM (SELECT min_quantity FROM task_point_templates WHERE task_name ILIKE $1 UNION ALL SELECT min_quantity FROM task_library WHERE task_name ILIKE $1) t LIMIT 1', [pattern])
        ]);
        return { today: Number(tc.c), week: Number(wc.c), month: Number(mc.c), target: tgt ? Number(tgt.min_quantity) : 20 };
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

    // GUIDE URL — get guide_url by module_type
    fastify.get('/api/dailylinks/guide-url', { preHandler: [authenticate] }, async (req) => {
        const { module_type } = req.query;
        if (!module_type) return { guide_url: null };
        const pattern = TASK_PATTERNS[module_type];
        if (!pattern) return { guide_url: null };
        const tpl = await db.get('SELECT guide_url, task_name FROM task_point_templates WHERE task_name ILIKE $1 AND guide_url IS NOT NULL LIMIT 1', [pattern]);
        return { guide_url: tpl?.guide_url || null, task_name: tpl?.task_name || null };
    });

    async function _getDeptIds(user) {
        const a = await db.all('SELECT department_id FROM task_approvers WHERE user_id = $1', [user.id]);
        const s = new Set(a.map(x => x.department_id));
        if (user.department_id) s.add(user.department_id);
        return [...s];
    }
};
