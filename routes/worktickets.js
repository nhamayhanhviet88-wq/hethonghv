// ========== WORK TICKETS — Phiếu Yêu Cầu Xử Lý CV ==========
const db = require('../db/pool');
const path = require('path');
const fs = require('fs');
const { vnNow } = require('../utils/timezone');

// Upload directory for ticket images
const TICKET_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'work-tickets');
if (!fs.existsSync(TICKET_UPLOAD_DIR)) fs.mkdirSync(TICKET_UPLOAD_DIR, { recursive: true });

async function routes(fastify) {
    const { authenticate } = require('../middleware/auth');

    // ========== INIT TABLES ==========
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS work_tickets (
            id SERIAL PRIMARY KEY,
            ticket_code VARCHAR(20) UNIQUE NOT NULL,
            type VARCHAR(20) NOT NULL DEFAULT 'custom',
            order_id INTEGER,
            order_code VARCHAR(50),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            priority VARCHAR(20) DEFAULT 'CHUẨN',
            status VARCHAR(20) DEFAULT 'pending',
            created_by INTEGER NOT NULL REFERENCES users(id),
            assigned_to INTEGER NOT NULL REFERENCES users(id),
            resolved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS work_ticket_replies (
            id SERIAL PRIMARY KEY,
            ticket_id INTEGER NOT NULL REFERENCES work_tickets(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id),
            message TEXT NOT NULL,
            attachments JSONB DEFAULT '[]',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
    } catch(e) { /* tables exist */ }

    // Add new columns if missing
    try { await db.exec(`ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS due_date DATE`); } catch(e) {}
    try { await db.exec(`ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS priority_level VARCHAR(20) DEFAULT 'low'`); } catch(e) {}
    try { await db.exec(`ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ`); } catch(e) {}
    try { await db.exec(`ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS ticket_image TEXT`); } catch(e) {}
    try { await db.exec(`ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false`); } catch(e) {}
    try { await db.exec(`ALTER TABLE work_tickets ADD COLUMN IF NOT EXISTS overdue_at TIMESTAMPTZ`); } catch(e) {}

    // Priority settings table
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS priority_settings (
            id SERIAL PRIMARY KEY,
            priority_key VARCHAR(20) UNIQUE NOT NULL,
            label VARCHAR(50) NOT NULL,
            icon VARCHAR(10),
            color VARCHAR(10),
            duration_hours NUMERIC(6,1),
            target_time VARCHAR(5),
            require_image BOOLEAN DEFAULT false,
            penalty_on_late BOOLEAN DEFAULT true,
            is_calendar BOOLEAN DEFAULT false,
            display_order INT DEFAULT 0,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        // Seed default data if empty
        const count = await db.get(`SELECT COUNT(*)::int AS c FROM priority_settings`);
        if (!count || count.c === 0) {
            await db.run(`INSERT INTO priority_settings (priority_key, label, icon, color, duration_hours, target_time, require_image, penalty_on_late, is_calendar, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                ['urgent', 'Khẩn Cấp', '🔴', '#dc2626', 1, null, true, true, false, 1]);
            await db.run(`INSERT INTO priority_settings (priority_key, label, icon, color, duration_hours, target_time, require_image, penalty_on_late, is_calendar, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                ['high', 'Cao', '🟠', '#ea580c', 3, null, false, true, false, 2]);
            await db.run(`INSERT INTO priority_settings (priority_key, label, icon, color, duration_hours, target_time, require_image, penalty_on_late, is_calendar, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                ['medium', 'Trung Bình', '🟡', '#eab308', 6, null, false, true, false, 3]);
            await db.run(`INSERT INTO priority_settings (priority_key, label, icon, color, duration_hours, target_time, require_image, penalty_on_late, is_calendar, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                ['low', 'Thấp', '🟢', '#16a34a', null, '12:00', false, true, false, 4]);
            await db.run(`INSERT INTO priority_settings (priority_key, label, icon, color, duration_hours, target_time, require_image, penalty_on_late, is_calendar, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                ['scheduled', 'Theo Lịch', '⚪', '#6b7280', null, null, false, true, true, 5]);
        }
        // Migration: Add 'medium' if missing from existing DB
        const hasMedium = await db.get(`SELECT 1 FROM priority_settings WHERE priority_key = 'medium'`);
        if (!hasMedium) {
            await db.run(`UPDATE priority_settings SET display_order = display_order + 1 WHERE display_order >= 3`);
            await db.run(`INSERT INTO priority_settings (priority_key, label, icon, color, duration_hours, target_time, require_image, penalty_on_late, is_calendar, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                ['medium', 'Trung Bình', '🟡', '#eab308', 6, null, false, true, false, 3]);
        }
    } catch(e) { console.error('[WT] priority_settings init:', e.message); }

    // Migration: Increase duration_hours precision for minute-level settings
    try { await db.exec(`ALTER TABLE priority_settings ALTER COLUMN duration_hours TYPE NUMERIC(8,2)`); } catch(e) {}

    // ========== Work Schedules Table (configurable work hours) ==========
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS work_schedules (
            id SERIAL PRIMARY KEY,
            role_type VARCHAR(20) NOT NULL DEFAULT 'qlx',
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            display_order INT DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        // Seed defaults if empty
        const wsCount = await db.get(`SELECT COUNT(*)::int AS c FROM work_schedules`);
        if (!wsCount || wsCount.c === 0) {
            await db.run(`INSERT INTO work_schedules (role_type, start_time, end_time, display_order) VALUES ('qlx','10:00','12:30',1)`);
            await db.run(`INSERT INTO work_schedules (role_type, start_time, end_time, display_order) VALUES ('qlx','14:00','18:00',2)`);
            await db.run(`INSERT INTO work_schedules (role_type, start_time, end_time, display_order) VALUES ('nhanvien','08:30','12:00',1)`);
            await db.run(`INSERT INTO work_schedules (role_type, start_time, end_time, display_order) VALUES ('nhanvien','13:30','17:30',2)`);
        }
    } catch(e) { console.error('[WT] work_schedules init:', e.message); }

    // ========== Load Work Sessions from DB ==========
    async function loadWorkSessions(roleType) {
        try {
            const rows = await db.all(`SELECT start_time, end_time FROM work_schedules WHERE role_type = $1 ORDER BY display_order`, [roleType || 'qlx']);
            return rows.map(r => {
                const [sh, sm] = r.start_time.split(':').map(Number);
                const [eh, em] = r.end_time.split(':').map(Number);
                return { start: sh * 60 + (sm || 0), end: eh * 60 + (em || 0) };
            });
        } catch(e) {
            return [{ start: 600, end: 750 }, { start: 840, end: 1080 }]; // fallback
        }
    }

    function getCutoff(sessions) {
        if (!sessions.length) return 18 * 60;
        return Math.max(...sessions.map(s => s.end));
    }

    // Load holidays
    async function loadHolidays() {
        try {
            const rows = await db.all(`SELECT holiday_date FROM holidays`);
            return rows.map(r => {
                const d = r.holiday_date;
                return typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().slice(0, 10);
            });
        } catch(e) { return []; }
    }

    function isHolidayOrSunday(date, holidays) {
        if (date.getDay() === 0) return true;
        const ds = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
        return holidays.includes(ds);
    }

    function getMinuteOfDay(date) {
        return date.getHours() * 60 + date.getMinutes();
    }

    function nextWorkday(date, holidays) {
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        while (isHolidayOrSunday(d, holidays)) {
            d.setDate(d.getDate() + 1);
        }
        return d;
    }

    function isWithinWorkHours(date, holidays, sessions) {
        if (isHolidayOrSunday(date, holidays)) return false;
        const m = getMinuteOfDay(date);
        return sessions.some(s => m >= s.start && m < s.end);
    }

    function isBeforeCutoff(date, holidays, sessions) {
        if (isHolidayOrSunday(date, holidays)) return false;
        return getMinuteOfDay(date) < getCutoff(sessions);
    }

    // Snap to start of next work session from given time
    function snapToNextWorkSession(date, holidays, sessions) {
        let d = new Date(date);
        const m = getMinuteOfDay(d);
        if (!isHolidayOrSunday(d, holidays)) {
            for (const sess of sessions) {
                if (m < sess.start) {
                    d.setHours(Math.floor(sess.start / 60), sess.start % 60, 0, 0);
                    return d;
                }
            }
        }
        d = nextWorkday(d, holidays);
        d.setHours(Math.floor(sessions[0].start / 60), sessions[0].start % 60, 0, 0);
        return d;
    }

    // ========== HELPER: Calculate business deadline (work hours only) ==========
    async function calculateBusinessDeadline(startTime, prioritySetting) {
        const start = new Date(startTime);
        const holidays = await loadHolidays();
        const sessions = await loadWorkSessions('qlx');

        if (prioritySetting.is_calendar) return null;

        if (prioritySetting.target_time) {
            const [tgtH, tgtM] = prioritySetting.target_time.split(':').map(Number);
            let deadline = new Date(start);
            deadline.setDate(deadline.getDate() + 1);
            deadline.setHours(tgtH, tgtM, 0, 0);
            while (isHolidayOrSunday(deadline, holidays)) {
                deadline.setDate(deadline.getDate() + 1);
            }
            return deadline;
        }

        if (prioritySetting.duration_hours && sessions.length) {
            let remainingMin = Math.round(parseFloat(prioritySetting.duration_hours) * 60);
            let cursor = new Date(start);

            if (!isWithinWorkHours(cursor, holidays, sessions)) {
                cursor = snapToNextWorkSession(cursor, holidays, sessions);
            }

            let safety = 0;
            while (remainingMin > 0 && safety < 500) {
                safety++;
                if (isHolidayOrSunday(cursor, holidays)) {
                    cursor = nextWorkday(cursor, holidays);
                    cursor.setHours(Math.floor(sessions[0].start / 60), sessions[0].start % 60, 0, 0);
                    continue;
                }
                const m = getMinuteOfDay(cursor);
                let inSession = false;
                for (const sess of sessions) {
                    if (m >= sess.start && m < sess.end) {
                        const availMin = sess.end - m;
                        if (remainingMin <= availMin) {
                            cursor.setMinutes(cursor.getMinutes() + remainingMin);
                            remainingMin = 0;
                        } else {
                            remainingMin -= availMin;
                            cursor.setHours(Math.floor(sess.end / 60), sess.end % 60, 0, 0);
                        }
                        inSession = true;
                        break;
                    }
                }
                if (!inSession) {
                    let found = false;
                    for (const sess of sessions) {
                        if (m < sess.start) {
                            cursor.setHours(Math.floor(sess.start / 60), sess.start % 60, 0, 0);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        cursor = nextWorkday(cursor, holidays);
                        cursor.setHours(Math.floor(sessions[0].start / 60), sessions[0].start % 60, 0, 0);
                    }
                }
            }
            return cursor;
        }

        return null;
    }

    // ========== HELPER: Determine initial status based on time + priority ==========
    async function determineInitialStatus(prioritySetting, now) {
        const holidays = await loadHolidays();
        const sessions = await loadWorkSessions('qlx');

        if (prioritySetting.target_time || prioritySetting.is_calendar) {
            return 'in_progress';
        }

        if (prioritySetting.duration_hours) {
            if (isBeforeCutoff(now, holidays, sessions)) {
                return 'pending';
            } else {
                return 'in_progress';
            }
        }

        return 'pending';
    }

    // ========== CRON: Auto-promote in_progress → pending when deadline arrives ==========
    setInterval(async () => {
        try {
            const now = vnNow().toISOString();
            const result = await db.run(`
                UPDATE work_tickets SET status = 'pending', updated_at = '${now}'
                WHERE status = 'in_progress' AND deadline_at IS NOT NULL AND deadline_at <= '${now}'
            `);
        } catch(e) {}
    }, 60000); // every 1 minute


    // ========== GET /api/work-tickets/staff — All staff for assignment ==========
    fastify.get('/api/work-tickets/staff', { preHandler: authenticate }, async (request) => {
        const departments = await db.all(`
            SELECT id, name, parent_id, head_user_id
            FROM departments
            ORDER BY display_order, name
        `);
        const users = await db.all(`
            SELECT id, full_name, username, role, department_id
            FROM users
            WHERE status = 'active' AND role != 'hoa_hong'
            ORDER BY full_name
        `);
        return { departments, users };
    });

    // ========== GET /api/work-tickets/factory-manager — Default QLX recipient ==========
    fastify.get('/api/work-tickets/factory-manager', { preHandler: authenticate }, async (request) => {
        // Find "HỆ THỐNG XƯỞNG HV" department
        const allDepts = await db.all(`SELECT id, name, parent_id FROM departments ORDER BY name`);
        const xuongDept = allDepts.find(d => d.name && d.name.toUpperCase().indexOf('XƯỞNG HV') !== -1);
        let xuongDeptIds = [];
        if (xuongDept) {
            xuongDeptIds.push(xuongDept.id);
            function collectChildren(parentId) {
                allDepts.forEach(d => {
                    if (d.parent_id === parentId) {
                        xuongDeptIds.push(d.id);
                        collectChildren(d.id);
                    }
                });
            }
            collectChildren(xuongDept.id);
        }

        let managers = [];
        if (xuongDeptIds.length > 0) {
            const ph = xuongDeptIds.map((_, i) => `$${i + 1}`).join(',');
            managers = await db.all(`
                SELECT id, full_name, username, role, department_id
                FROM users
                WHERE role = 'quan_ly_cap_cao' AND department_id IN (${ph}) AND status = 'active'
                ORDER BY full_name
            `, xuongDeptIds);
        }
        // Fallback: all quan_ly_cap_cao
        if (managers.length === 0) {
            managers = await db.all(`
                SELECT id, full_name, username, role, department_id
                FROM users
                WHERE role = 'quan_ly_cap_cao' AND status = 'active'
                ORDER BY full_name
            `);
        }

        return { managers, default_id: managers.length > 0 ? managers[0].id : null };
    });

    // ========== GET /api/work-tickets/next-code — Preview next ticket code ==========
    fastify.get('/api/work-tickets/next-code', { preHandler: authenticate }, async (request) => {
        // Only count custom tickets (PHIEUHV pattern), ignore order-type tickets
        const last = await db.get(`SELECT ticket_code FROM work_tickets WHERE ticket_code LIKE 'PHIEUHV%' ORDER BY id DESC LIMIT 1`);
        let nextNum = 1;
        if (last && last.ticket_code) {
            const match = last.ticket_code.match(/PHIEUHV(\d+)/);
            if (match) nextNum = parseInt(match[1]) + 1;
        }
        return { next_code: 'PHIEUHV' + String(nextNum).padStart(4, '0') };
    });

    // ========== GET /api/work-tickets/priority-settings — Get priority config ==========
    fastify.get('/api/work-tickets/priority-settings', { preHandler: authenticate }, async (request) => {
        const settings = await db.all(`SELECT * FROM priority_settings ORDER BY display_order`);
        return { settings };
    });

    // ========== PUT /api/work-tickets/priority-settings — Admin update priority config ==========
    fastify.put('/api/work-tickets/priority-settings', { preHandler: authenticate }, async (request) => {
        const role = request.user.role;
        if (!['giam_doc', 'quan_ly_cap_cao'].includes(role)) {
            return { error: 'Không có quyền thay đổi cài đặt' };
        }

        const { settings } = request.body; // Array of { priority_key, duration_hours, target_time, require_image, penalty_on_late }
        if (!settings || !Array.isArray(settings)) return { error: 'Dữ liệu không hợp lệ' };

        for (const s of settings) {
            await db.run(`
                UPDATE priority_settings SET
                    duration_hours = $1,
                    target_time = $2,
                    require_image = $3,
                    penalty_on_late = $4,
                    updated_at = NOW()
                WHERE priority_key = $5
            `, [
                s.duration_hours !== undefined ? s.duration_hours : null,
                s.target_time || null,
                s.require_image === true,
                s.penalty_on_late !== false,
                s.priority_key
            ]);
        }

        return { success: true, message: '✅ Đã lưu cài đặt mức độ' };
    });

    // ========== GET /api/work-tickets/work-schedules — Get work schedules ==========
    fastify.get('/api/work-tickets/work-schedules', { preHandler: authenticate }, async (request) => {
        const schedules = await db.all(`SELECT * FROM work_schedules ORDER BY role_type, display_order`);
        return { schedules };
    });

    // ========== PUT /api/work-tickets/work-schedules — Update work schedules ==========
    fastify.put('/api/work-tickets/work-schedules', { preHandler: authenticate }, async (request) => {
        const role = request.user.role;
        if (!['giam_doc', 'quan_ly_cap_cao'].includes(role)) {
            return { error: 'Không có quyền thay đổi cài đặt' };
        }
        const { schedules } = request.body; // Array of { role_type, start_time, end_time }
        if (!schedules || !Array.isArray(schedules)) return { error: 'Dữ liệu không hợp lệ' };

        // Delete old and re-insert
        await db.run(`DELETE FROM work_schedules`);
        let order = 0;
        for (const s of schedules) {
            if (!s.start_time || !s.end_time || !s.role_type) continue;
            order++;
            await db.run(`INSERT INTO work_schedules (role_type, start_time, end_time, display_order) VALUES ($1,$2,$3,$4)`,
                [s.role_type, s.start_time, s.end_time, order]);
        }

        return { success: true, message: '✅ Đã lưu lịch làm việc' };
    });

    // ========== GET /api/work-tickets/stats — Dashboard stats ==========
    fastify.get('/api/work-tickets/stats', { preHandler: authenticate }, async (request) => {
        const userId = request.user.id;
        const role = request.user.role;
        const isAdmin = ['giam_doc', 'quan_ly_cap_cao'].includes(role);

        let where = isAdmin ? '1=1' : `(t.created_by = ${userId} OR t.assigned_to = ${userId})`;
        const todayVN = vnNow().toISOString().slice(0, 10);

        const stats = await db.get(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress') AND COALESCE(t.due_date, t.created_at::date) = '${todayVN}'::date)::int AS today_due,
                COUNT(*) FILTER (WHERE t.status IN ('resolved','closed') AND (t.resolved_at::date = '${todayVN}'::date OR t.updated_at::date = '${todayVN}'::date))::int AS today_resolved,
                COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress') AND t.is_overdue = true)::int AS overdue,
                COUNT(*) FILTER (WHERE t.status = 'pending')::int AS pending,
                COUNT(*) FILTER (WHERE t.status = 'in_progress')::int AS in_progress,
                COUNT(*) FILTER (WHERE t.status IN ('resolved','closed'))::int AS completed,
                COUNT(*) FILTER (WHERE t.status = 'resolved')::int AS resolved,
                COUNT(*) FILTER (WHERE t.status = 'closed')::int AS closed,
                COUNT(*) FILTER (WHERE t.created_by = ${userId})::int AS my_created,
                COUNT(*) FILTER (WHERE t.assigned_to = ${userId} AND t.status IN ('pending','in_progress'))::int AS my_assigned,
                COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress') AND (t.due_date <= '${todayVN}'::date OR t.due_date IS NULL))::int AS cho_xu_ly,
                COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress') AND t.due_date > '${todayVN}'::date)::int AS cho_ngay_tra_loi,
                COUNT(*) FILTER (WHERE t.status IN ('resolved','closed'))::int AS da_tra_loi
            FROM work_tickets t
            WHERE ${where}
        `);

        // Auto-update overdue flags for pending/in_progress tickets
        try {
            const now = vnNow().toISOString();
            await db.run(`
                UPDATE work_tickets SET is_overdue = true, overdue_at = COALESCE(overdue_at, '${now}')
                WHERE status IN ('pending','in_progress') AND deadline_at IS NOT NULL AND deadline_at < '${now}' AND is_overdue = false
            `);
        } catch(e) {}

        return { stats };
    });

    // ========== GET /api/work-tickets — List tickets ==========
    fastify.get('/api/work-tickets', { preHandler: authenticate }, async (request) => {
        const { status, user_id, search, page = 1 } = request.query;
        const userId = request.user.id;
        const role = request.user.role;
        const isAdmin = ['giam_doc', 'quan_ly_cap_cao'].includes(role);
        const perPage = 50;

        let conditions = [];
        if (!isAdmin) {
            conditions.push(`(t.created_by = ${userId} OR t.assigned_to = ${userId})`);
        }
        if (status && status !== 'all') {
            const todayVN = vnNow().toISOString().slice(0, 10);
            if (status === 'cho_xu_ly') {
                conditions.push(`t.status IN ('pending','in_progress') AND (t.due_date <= '${todayVN}'::date OR t.due_date IS NULL)`);
            } else if (status === 'cho_ngay_tra_loi') {
                conditions.push(`t.status IN ('pending','in_progress') AND t.due_date > '${todayVN}'::date`);
            } else if (status === 'da_tra_loi') {
                conditions.push(`t.status IN ('resolved','closed')`);
            } else if (status === 'today_due') {
                conditions.push(`t.status IN ('pending','in_progress') AND COALESCE(t.due_date, t.created_at::date) = '${todayVN}'::date`);
            } else if (status === 'today_resolved') {
                conditions.push(`t.status IN ('resolved','closed') AND (t.resolved_at::date = '${todayVN}'::date OR t.updated_at::date = '${todayVN}'::date)`);
            } else if (status === 'overdue') {
                conditions.push(`t.status IN ('pending','in_progress') AND t.is_overdue = true`);
            } else if (status === 'completed') {
                conditions.push(`t.status IN ('resolved','closed')`);
            } else {
                conditions.push(`t.status = '${status.replace(/'/g, '')}'`);
            }
        }
        if (user_id) {
            conditions.push(`(t.created_by = ${parseInt(user_id)} OR t.assigned_to = ${parseInt(user_id)})`);
        }
        if (search) {
            const q = search.replace(/'/g, "''").toLowerCase();
            conditions.push(`(LOWER(t.ticket_code) LIKE '%${q}%' OR LOWER(t.title) LIKE '%${q}%' OR LOWER(t.order_code) LIKE '%${q}%')`);
        }

        const where = conditions.length ? conditions.join(' AND ') : '1=1';
        const offset = (parseInt(page) - 1) * perPage;

        // Auto-update overdue flags
        try {
            const now = vnNow().toISOString();
            await db.run(`
                UPDATE work_tickets SET is_overdue = true, overdue_at = COALESCE(overdue_at, '${now}')
                WHERE status IN ('pending','in_progress') AND deadline_at IS NOT NULL AND deadline_at < '${now}' AND is_overdue = false
            `);
        } catch(e) {}

        const tickets = await db.all(`
            SELECT t.*,
                uc.full_name AS created_by_name,
                ua.full_name AS assigned_to_name,
                (SELECT COUNT(*)::int FROM work_ticket_replies r WHERE r.ticket_id = t.id) AS reply_count
            FROM work_tickets t
            LEFT JOIN users uc ON uc.id = t.created_by
            LEFT JOIN users ua ON ua.id = t.assigned_to
            WHERE ${where}
            ORDER BY
                CASE WHEN t.is_overdue = true AND t.status IN ('pending','in_progress') THEN 0 ELSE 1 END,
                CASE t.priority_level WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'low' THEN 2 ELSE 3 END,
                t.created_at DESC
            LIMIT ${perPage} OFFSET ${offset}
        `);

        const countRow = await db.get(`SELECT COUNT(*)::int AS total FROM work_tickets t WHERE ${where}`);

        return { tickets, total: countRow.total, page: parseInt(page), perPage };
    });

    // ========== POST /api/work-tickets — Create ticket ==========
    fastify.post('/api/work-tickets', { preHandler: authenticate }, async (request) => {
        const { type, order_id, order_code, title, description, priority, priority_level, assigned_to, due_date, scheduled_date } = request.body;
        const userId = request.user.id;

        if (!title || !title.trim()) return { error: 'Tiêu đề không được để trống' };
        if (!assigned_to) return { error: 'Vui lòng chọn người nhận' };

        // Validate assigned_to user is active
        const assignee = await db.get(`SELECT id, status FROM users WHERE id = $1`, [parseInt(assigned_to)]);
        if (!assignee || assignee.status !== 'active') return { error: 'Người nhận không hợp lệ hoặc đã bị khóa' };

        // Load priority setting
        const pLevel = priority_level || 'low';
        const pSetting = await db.get(`SELECT * FROM priority_settings WHERE priority_key = $1`, [pLevel]);

        // ===== TICKET CODE LOGIC =====
        let ticketCode = '';
        const ticketType = type || 'custom';

        if (ticketType === 'order' && order_code && order_code.trim()) {
            // ORDER TYPE: ticket_code = order_code (e.g. GCTEM0003)
            ticketCode = order_code.trim();
            // Check: this order already has a ticket?
            const existingOrder = await db.get(`SELECT id, ticket_code FROM work_tickets WHERE order_code = $1`, [ticketCode]);
            if (existingOrder) return { error: 'Đơn hàng ' + ticketCode + ' đã có phiếu xử lý (' + existingOrder.ticket_code + ')! Mỗi đơn chỉ được tạo 1 phiếu.' };
            // Check: ticket_code uniqueness
            const existingCode = await db.get(`SELECT id FROM work_tickets WHERE ticket_code = $1`, [ticketCode]);
            if (existingCode) return { error: 'Mã phiếu ' + ticketCode + ' đã tồn tại!' };
        } else {
            // CUSTOM TYPE: auto PHIEUHV#### (only count PHIEUHV tickets)
            for (let attempt = 0; attempt < 10; attempt++) {
                const last = await db.get(`SELECT ticket_code FROM work_tickets WHERE ticket_code LIKE 'PHIEUHV%' ORDER BY id DESC LIMIT 1`);
                let nextNum = 1;
                if (last && last.ticket_code) {
                    const match = last.ticket_code.match(/PHIEUHV(\d+)/);
                    if (match) nextNum = parseInt(match[1]) + 1 + attempt;
                }
                ticketCode = 'PHIEUHV' + String(nextNum).padStart(4, '0');
                const exists = await db.get(`SELECT id FROM work_tickets WHERE ticket_code = $1`, [ticketCode]);
                if (!exists) break;
            }
        }

        // Calculate deadline
        const now = vnNow();
        let deadlineAt = null;
        let initialStatus = 'pending';

        if (pSetting) {
            if (pSetting.is_calendar && scheduled_date) {
                deadlineAt = new Date(scheduled_date + 'T23:59:00+07:00');
            } else {
                deadlineAt = await calculateBusinessDeadline(now, pSetting);
            }
            initialStatus = await determineInitialStatus(pSetting, now);
        }

        // Calculate due_date from deadline_at
        let computedDueDate = due_date || null;
        if (deadlineAt && !computedDueDate) {
            computedDueDate = deadlineAt.toISOString().slice(0, 10);
        }

        // Map priority_level to display priority
        const priorityDisplay = pLevel === 'urgent' ? 'GẤP' : (priority || 'CHUẨN');

        await db.run(`
            INSERT INTO work_tickets (ticket_code, type, order_id, order_code, title, description, priority, priority_level, status, created_by, assigned_to, due_date, deadline_at, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
        `, [
            ticketCode,
            type || 'custom',
            order_id || null,
            order_code || null,
            title.trim(),
            description || '',
            priorityDisplay,
            pLevel,
            initialStatus,
            userId,
            parseInt(assigned_to),
            computedDueDate,
            deadlineAt ? deadlineAt.toISOString() : null,
            now
        ]);

        // Get newly created ticket ID for image upload
        const newTicket = await db.get(`SELECT id FROM work_tickets WHERE ticket_code = $1`, [ticketCode]);

        return {
            success: true,
            ticket_code: ticketCode,
            ticket_id: newTicket ? newTicket.id : null,
            deadline_at: deadlineAt ? deadlineAt.toISOString() : null,
            message: '✅ Đã tạo phiếu ' + ticketCode
        };
    });

    // ========== POST /api/work-tickets/:id/image — Upload ticket image ==========
    fastify.post('/api/work-tickets/:id/image', { preHandler: authenticate }, async (request) => {
        const id = request.params.id;
        const existing = await db.get('SELECT id, priority_level FROM work_tickets WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy phiếu' };

        const parts = request.parts();
        let imageUrl = null;

        for await (const part of parts) {
            if (part.type === 'file' && part.filename) {
                const ext = path.extname(part.filename).toLowerCase() || '.jpg';
                const fileName = `wt_${id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
                const filePath = path.join(TICKET_UPLOAD_DIR, fileName);

                const chunks = [];
                for await (const chunk of part.file) {
                    chunks.push(chunk);
                }
                const totalSize = chunks.reduce((s, c) => s + c.length, 0);
                if (totalSize > 5 * 1024 * 1024) {
                    return { error: 'Ảnh quá lớn. Tối đa 5MB' };
                }
                fs.writeFileSync(filePath, Buffer.concat(chunks));
                imageUrl = `/uploads/work-tickets/${fileName}`;
                break; // Only 1 image
            }
        }

        if (imageUrl) {
            await db.run('UPDATE work_tickets SET ticket_image = $1, updated_at = NOW() WHERE id = $2', [imageUrl, id]);
        }

        return { success: true, image_url: imageUrl };
    });

    // ========== GET /api/work-tickets/:id — Ticket detail ==========
    fastify.get('/api/work-tickets/:id', { preHandler: authenticate }, async (request) => {
        const { id } = request.params;
        const ticket = await db.get(`
            SELECT t.*,
                uc.full_name AS created_by_name,
                ua.full_name AS assigned_to_name
            FROM work_tickets t
            LEFT JOIN users uc ON uc.id = t.created_by
            LEFT JOIN users ua ON ua.id = t.assigned_to
            WHERE t.id = $1
        `, [id]);
        if (!ticket) return { error: 'Không tìm thấy phiếu' };

        const replies = await db.all(`
            SELECT r.*, u.full_name AS user_name
            FROM work_ticket_replies r
            LEFT JOIN users u ON u.id = r.user_id
            WHERE r.ticket_id = $1
            ORDER BY r.created_at ASC
        `, [id]);

        return { ticket, replies };
    });

    // ========== POST /api/work-tickets/:id/reply — Add reply ==========
    fastify.post('/api/work-tickets/:id/reply', { preHandler: authenticate }, async (request) => {
        const { id } = request.params;
        const { message, priority_level, image_data } = request.body;
        const userId = request.user.id;

        if (!message || !message.trim()) return { error: 'Nội dung không được để trống' };

        // Save reply image if provided (base64)
        let replyImageUrl = null;
        if (image_data && image_data.startsWith('data:image')) {
            try {
                const matches = image_data.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
                if (matches) {
                    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const fileName = `reply_${id}_${Date.now()}.${ext}`;
                    const filePath = path.join(TICKET_UPLOAD_DIR, fileName);
                    fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
                    replyImageUrl = `/uploads/work-tickets/${fileName}`;
                }
            } catch(e) { console.error('[WT Reply] Image save error:', e.message); }
        }

        // Build attachments array
        const attachments = replyImageUrl ? JSON.stringify([{ type: 'image', url: replyImageUrl }]) : '[]';

        await db.run(`
            INSERT INTO work_ticket_replies (ticket_id, user_id, message, attachments, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [id, userId, message.trim(), attachments, vnNow()]);

        // Auto update status to in_progress if still pending (only when no priority change)
        if (!priority_level) {
            await db.run(`UPDATE work_tickets SET status = 'in_progress', updated_at = $2 WHERE id = $1 AND status = 'pending'`, [id, vnNow()]);
        }

        // Update priority_level if changed — FULL RESET: recalculate deadline + status + clear overdue/resolved
        if (priority_level) {
            const pSetting = await db.get(`SELECT * FROM priority_settings WHERE priority_key = $1`, [priority_level]);
            if (pSetting) {
                const nowTime = vnNow();
                const deadline = await calculateBusinessDeadline(nowTime, pSetting);
                const newStatus = await determineInitialStatus(pSetting, nowTime);
                await db.run(`UPDATE work_tickets SET
                    priority_level = $1,
                    deadline_at = $2,
                    due_date = ($2::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
                    status = $3,
                    is_overdue = false,
                    overdue_at = NULL,
                    resolved_at = NULL,
                    updated_at = $4
                    WHERE id = $5`,
                    [priority_level, deadline ? deadline.toISOString() : null, newStatus, nowTime, id]);
            }
        }

        return { success: true, message: '✅ Đã phản hồi' };
    });

    // ========== PUT /api/work-tickets/:id/status — Update status ==========
    fastify.put('/api/work-tickets/:id/status', { preHandler: authenticate }, async (request) => {
        const { id } = request.params;
        const { status, due_date } = request.body;
        const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) return { error: 'Trạng thái không hợp lệ' };

        const now = vnNow().toISOString();
        const updates = [`status = '${status}'`, `updated_at = '${now}'`];
        if (status === 'resolved') {
            updates.push(`resolved_at = '${now}'`);
            updates.push(`is_overdue = false`); // Clear overdue when resolved
        }
        // Support due_date update (null to clear, or date string)
        if (due_date !== undefined) {
            updates.push(due_date ? `due_date = '${due_date}'` : `due_date = NULL`);
        }

        await db.run(`UPDATE work_tickets SET ${updates.join(', ')} WHERE id = $1`, [id]);

        const labels = { pending: 'Chờ Xử Lý', in_progress: 'Đang Xử Lý', resolved: 'Đã Xử Lý', closed: 'Đã Đóng' };
        return { success: true, message: '✅ Đã chuyển: ' + labels[status] };
    });

    // ========== GET /api/work-tickets/search-orders — Search orders for linking ==========
    fastify.get('/api/work-tickets/search-orders', { preHandler: authenticate }, async (request) => {
        const { q } = request.query;
        const userId = request.user.id;
        const role = request.user.role;
        const isAdmin = ['giam_doc', 'quan_ly_cap_cao'].includes(role);

        let where = '';
        if (!isAdmin) {
            where = ` AND o.created_by = ${userId}`;
        }

        // Exclude orders that already have a work ticket (1 order = 1 ticket)
        const excludeUsed = ` AND NOT EXISTS (SELECT 1 FROM work_tickets wt WHERE wt.order_code = o.order_code AND wt.order_code IS NOT NULL)`;

        if (!q || q.length < 1) {
            // Show recent orders for the user
            const orders = await db.all(`
                SELECT o.id, o.order_code, o.customer_name, o.customer_phone
                FROM dht_orders o
                WHERE 1=1 ${where} ${excludeUsed}
                ORDER BY o.id DESC LIMIT 20
            `);
            return { orders };
        }

        const search = q.replace(/'/g, "''").toLowerCase();
        const orders = await db.all(`
            SELECT o.id, o.order_code, o.customer_name, o.customer_phone
            FROM dht_orders o
            WHERE (LOWER(o.order_code) LIKE '%${search}%' OR LOWER(o.customer_name) LIKE '%${search}%') ${where} ${excludeUsed}
            ORDER BY o.id DESC LIMIT 20
        `);
        return { orders };
    });
}

module.exports = routes;
