// ========== ADD/CMT ĐỐI TÁC KH — BACKEND ==========
const path = require('path');
const fs = require('fs');

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

    function _vnToday() {
        const now = new Date(Date.now() + 7 * 3600000);
        return now.toISOString().split('T')[0];
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
            const dIds = await _getDeptIds(req.user);
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
            const dIds = await _getDeptIds(req.user);
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

    async function _getDeptIds(user) {
        const a = await db.all('SELECT department_id FROM task_approvers WHERE user_id = $1', [user.id]);
        const s = new Set(a.map(x => x.department_id));
        if (user.department_id) s.add(user.department_id);
        return [...s];
    }
};
