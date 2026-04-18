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
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_addcmt_user_date ON addcmt_entries(user_id, entry_date);
        CREATE INDEX IF NOT EXISTS idx_addcmt_date ON addcmt_entries(entry_date);
    `);

    function _vnToday() {
        const now = new Date(Date.now() + 7 * 3600000);
        return now.toISOString().split('T')[0];
    }

    // GET entries
    fastify.get('/api/addcmt/entries', { preHandler: [authenticate] }, async (req) => {
        const { date, user_id, dept_id } = req.query;
        const targetDate = date || _vnToday();
        const role = req.user.role;
        let where = 'e.entry_date = $1', params = [targetDate], pi = 2;

        if (user_id) { where += ` AND e.user_id = $${pi}`; params.push(Number(user_id)); pi++; }
        else if (role === 'nhan_vien' || role === 'part_time') { where += ` AND e.user_id = $${pi}`; params.push(req.user.id); pi++; }
        else if (dept_id) { where += ` AND u.department_id = $${pi}`; params.push(Number(dept_id)); pi++; }
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

    // POST create
    fastify.post('/api/addcmt/entries', { preHandler: [authenticate] }, async (req, reply) => {
        const { fb_link } = req.body || {};
        if (!fb_link?.trim()) return reply.code(400).send({ error: 'Thiếu link FB' });
        const today = _vnToday();
        // Same user same day same link - block
        const dup = await db.get('SELECT id FROM addcmt_entries WHERE LOWER(fb_link) = $1 AND user_id = $2 AND entry_date = $3', [fb_link.trim().toLowerCase(), req.user.id, today]);
        if (dup) return reply.code(400).send({ error: 'Bạn đã nhập link này hôm nay' });
        // Cross-user dup
        const dupOther = await db.get('SELECT e.id, u.full_name FROM addcmt_entries e JOIN users u ON e.user_id = u.id WHERE LOWER(e.fb_link) = $1 AND e.user_id != $2 LIMIT 1', [fb_link.trim().toLowerCase(), req.user.id]);
        if (dupOther) return reply.code(400).send({ error: `Link đã được nhập bởi ${dupOther.full_name}` });

        await db.run('INSERT INTO addcmt_entries (user_id, entry_date, fb_link) VALUES ($1, $2, $3)', [req.user.id, today, fb_link.trim()]);
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

    async function _getDeptIds(user) {
        const a = await db.all('SELECT department_id FROM task_approvers WHERE user_id = $1', [user.id]);
        const s = new Set(a.map(x => x.department_id));
        if (user.department_id) s.add(user.department_id);
        return [...s];
    }
};
