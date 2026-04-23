// ========== NHẮN TIN TÌM ĐỐI TÁC KH — BACKEND ==========
const path = require('path');
const fs = require('fs');

module.exports = async function (fastify) {
    const db = require('../db/pool');
    const { authenticate } = require('../middleware/auth');

    // ===== AUTO-CREATE TABLES =====
    await db.exec(`
        CREATE TABLE IF NOT EXISTS partner_outreach_categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#3b82f6',
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS partner_outreach_entries (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
            partner_name TEXT NOT NULL,
            fb_link TEXT NOT NULL,
            phone TEXT,
            category_id INTEGER REFERENCES partner_outreach_categories(id),
            image_path TEXT,
            transferred_to_crm BOOLEAN DEFAULT FALSE,
            transferred_at TIMESTAMP,
            crm_data_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_poe_user_date ON partner_outreach_entries(user_id, entry_date);
        CREATE INDEX IF NOT EXISTS idx_poe_date ON partner_outreach_entries(entry_date);
        CREATE INDEX IF NOT EXISTS idx_poe_fb ON partner_outreach_entries(fb_link);
    `);

    // Add channel column if not exists
    try {
        await db.exec(`ALTER TABLE partner_outreach_entries ADD COLUMN IF NOT EXISTS channel TEXT`);
    } catch(e) { /* column already exists */ }

    // Seed default categories if empty
    const catCount = await db.get('SELECT COUNT(*) as c FROM partner_outreach_categories');
    if (Number(catCount.c) === 0) {
        const defaults = ['Quà Tặng', 'Áo Dài', 'Local Brand', 'Bảo Hộ Lao Động'];
        const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];
        for (let i = 0; i < defaults.length; i++) {
            await db.run(
                'INSERT INTO partner_outreach_categories (name, color, sort_order) VALUES ($1, $2, $3)',
                [defaults[i], colors[i], i]
            );
        }
    }

    // ===== HELPERS =====
    function _vnToday() {
        const now = new Date(Date.now() + 7 * 3600000);
        return now.toISOString().split('T')[0];
    }

    function _isManager(role) {
        return ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(role);
    }

    // ===== CATEGORIES =====

    fastify.get('/api/partner-outreach/categories', { preHandler: [authenticate] }, async (req) => {
        const rows = await db.all('SELECT * FROM partner_outreach_categories WHERE is_active = true ORDER BY sort_order, name');
        return { categories: rows };
    });

    fastify.post('/api/partner-outreach/categories', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { name, color } = req.body || {};
        if (!name?.trim()) return reply.code(400).send({ error: 'Thiếu tên lĩnh vực' });
        const maxOrder = await db.get('SELECT COALESCE(MAX(sort_order), 0) as m FROM partner_outreach_categories');
        await db.run('INSERT INTO partner_outreach_categories (name, color, sort_order) VALUES ($1, $2, $3)', [name.trim(), color || '#3b82f6', (maxOrder.m || 0) + 1]);
        return { success: true };
    });

    fastify.put('/api/partner-outreach/categories/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { name, color } = req.body || {};
        await db.run('UPDATE partner_outreach_categories SET name = COALESCE($1, name), color = COALESCE($2, color) WHERE id = $3', [name, color, Number(req.params.id)]);
        return { success: true };
    });

    fastify.delete('/api/partner-outreach/categories/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        await db.run('UPDATE partner_outreach_categories SET is_active = false WHERE id = $1', [Number(req.params.id)]);
        return { success: true };
    });

    // ===== ENTRIES =====

    // GET entries — with permission filtering
    fastify.get('/api/partner-outreach/entries', { preHandler: [authenticate] }, async (req) => {
        const { date, date_from, date_to, user_id, dept_id } = req.query;
        const role = req.user.role;

        let whereClause, params, paramIdx;
        if (date_from && date_to) {
            whereClause = 'e.entry_date BETWEEN $1 AND $2';
            params = [date_from, date_to]; paramIdx = 3;
        } else {
            const targetDate = date || _vnToday();
            whereClause = 'e.entry_date = $1';
            params = [targetDate]; paramIdx = 2;
        }

        if (user_id) {
            whereClause += ` AND e.user_id = $${paramIdx}`;
            params.push(Number(user_id));
            paramIdx++;
        } else if (role === 'nhan_vien' || role === 'part_time') {
            // NV only sees own
            whereClause += ` AND e.user_id = $${paramIdx}`;
            params.push(req.user.id);
            paramIdx++;
        } else if (dept_id) {
            const deptIdNum = Number(dept_id);
            const childDepts = await db.all('SELECT id FROM departments WHERE parent_id = $1 AND status = $2', [deptIdNum, 'active']);
            const allDeptIds = [deptIdNum, ...childDepts.map(dd => dd.id)];
            const ph = allDeptIds.map((_, i) => `$${paramIdx + i}`).join(',');
            whereClause += ` AND u.department_id IN (${ph})`;
            params.push(...allDeptIds);
            paramIdx += allDeptIds.length;
        } else if (!['giam_doc', 'quan_ly_cap_cao'].includes(role)) {
            // QL/TP see their team
            const deptIds = await _getManagedDeptIds(req.user);
            if (deptIds.length > 0) {
                const ph = deptIds.map((_, i) => `$${paramIdx + i}`).join(',');
                whereClause += ` AND u.department_id IN (${ph})`;
                params.push(...deptIds);
                paramIdx += deptIds.length;
            } else {
                whereClause += ` AND e.user_id = $${paramIdx}`;
                params.push(req.user.id);
                paramIdx++;
            }
        }

        const rows = await db.all(
            `SELECT e.*, e.channel, c.name as category_name, c.color as category_color,
                    u.full_name as user_name, u.username, d.name as dept_name
             FROM partner_outreach_entries e
             LEFT JOIN partner_outreach_categories c ON e.category_id = c.id
             LEFT JOIN users u ON e.user_id = u.id
             LEFT JOIN departments d ON u.department_id = d.id
             WHERE ${whereClause}
             ORDER BY e.entry_date DESC, e.created_at DESC`,
            params
        );
        return { entries: rows };
    });

    // POST create entry
    fastify.post('/api/partner-outreach/entries', { preHandler: [authenticate] }, async (req, reply) => {
        const { partner_name, fb_link, phone, category_id, channel, image_data } = req.body || {};
        if (!fb_link?.trim()) return reply.code(400).send({ error: 'Thiếu link FB' });
        if (!category_id) return reply.code(400).send({ error: 'Vui lòng chọn Lĩnh Vực' });
        if (!channel?.trim()) return reply.code(400).send({ error: 'Vui lòng chọn Kênh Isocal' });

        const today = _vnToday();
        const normalizedFb = fb_link.trim().toLowerCase();

        // Cross-user duplicate check — block if another user already has this fb_link
        const dupFb = await db.get(
            'SELECT e.id, u.full_name FROM partner_outreach_entries e JOIN users u ON e.user_id = u.id WHERE LOWER(e.fb_link) = $1 AND e.user_id != $2 LIMIT 1',
            [normalizedFb, req.user.id]
        );
        if (dupFb) return reply.code(400).send({ error: `Link FB đã được nhập bởi ${dupFb.full_name}` });

        // Same user, same day, same FB link — block
        const dupSelf = await db.get(
            'SELECT id FROM partner_outreach_entries WHERE LOWER(fb_link) = $1 AND user_id = $2 AND entry_date = $3',
            [normalizedFb, req.user.id, today]
        );
        if (dupSelf) return reply.code(400).send({ error: 'Bạn đã nhập link FB này hôm nay' });

        // Phone cross-user duplicate (if provided)
        if (phone?.trim()) {
            const normalizedPhone = phone.trim().replace(/\D/g, '');
            if (normalizedPhone) {
                const dupPhone = await db.get(
                    'SELECT e.id, u.full_name FROM partner_outreach_entries e JOIN users u ON e.user_id = u.id WHERE REPLACE(e.phone, \' \', \'\') = $1 AND e.user_id != $2 LIMIT 1',
                    [normalizedPhone, req.user.id]
                );
                if (dupPhone) return reply.code(400).send({ error: `SĐT đã được nhập bởi ${dupPhone.full_name}` });
            }
        }

        // Save image if provided (base64)
        let imagePath = null;
        if (image_data) {
            imagePath = await _saveImage(image_data, req.user.id);
        }

        const result = await db.run(
            `INSERT INTO partner_outreach_entries (user_id, entry_date, partner_name, fb_link, phone, category_id, channel, image_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [req.user.id, today, partner_name?.trim() || '', fb_link.trim(), phone?.trim() || null, Number(category_id), channel.trim(), imagePath]
        );

        return { success: true, id: result.lastInsertRowid || result.insertId };
    });

    // PUT update entry (only today, only owner)
    fastify.put('/api/partner-outreach/entries/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const entry = await db.get('SELECT * FROM partner_outreach_entries WHERE id = $1', [Number(req.params.id)]);
        if (!entry) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (entry.user_id !== req.user.id) return reply.code(403).send({ error: 'Không phải của bạn' });
        if (entry.entry_date.toISOString?.().split('T')[0] !== _vnToday() && String(entry.entry_date) !== _vnToday()) {
            return reply.code(403).send({ error: 'Chỉ sửa được trong ngày' });
        }

        const { partner_name, fb_link, phone, category_id, image_data } = req.body || {};

        let imagePath = entry.image_path;
        if (image_data) {
            imagePath = await _saveImage(image_data, req.user.id);
        }

        const channel = req.body?.channel;
        await db.run(
            `UPDATE partner_outreach_entries SET partner_name = COALESCE($1, partner_name), fb_link = COALESCE($2, fb_link),
             phone = $3, category_id = $4, channel = COALESCE($5, channel), image_path = COALESCE($6, image_path), updated_at = NOW() WHERE id = $7`,
            [partner_name?.trim(), fb_link?.trim(), phone?.trim() || null, category_id ? Number(category_id) : null, channel?.trim(), imagePath, Number(req.params.id)]
        );
        return { success: true };
    });

    // DELETE entry (only today, only owner)
    fastify.delete('/api/partner-outreach/entries/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const entry = await db.get('SELECT * FROM partner_outreach_entries WHERE id = $1', [Number(req.params.id)]);
        if (!entry) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (entry.user_id !== req.user.id && req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Không phải của bạn' });
        const entryDate = typeof entry.entry_date === 'string' ? entry.entry_date.split('T')[0] : entry.entry_date?.toISOString?.()?.split('T')[0];
        if (entryDate !== _vnToday() && req.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ xóa được trong ngày' });
        }
        await db.run('DELETE FROM partner_outreach_entries WHERE id = $1', [Number(req.params.id)]);
        return { success: true };
    });

    // ===== STATS =====
    fastify.get('/api/partner-outreach/stats', { preHandler: [authenticate] }, async (req) => {
        const { user_id, dept_id } = req.query;
        const today = _vnToday();

        // Get week range (Mon-Sun)
        const d = new Date(today + 'T00:00:00');
        const dow = d.getDay() || 7;
        const mon = new Date(d); mon.setDate(d.getDate() - dow + 1);
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        const weekStart = mon.toISOString().split('T')[0];
        const weekEnd = sun.toISOString().split('T')[0];

        // Month range
        const monthStart = today.substring(0, 7) + '-01';
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const monthEnd = today.substring(0, 7) + '-' + String(lastDay).padStart(2, '0');

        const PATTERN = '%Nhắn%Đối Tác%';

        // Helper: count working days (Mon-Sat)
        function countWorkDays(startStr, endStr) {
            let count = 0;
            const s = new Date(startStr + 'T00:00:00'), e = new Date(endStr + 'T00:00:00');
            for (let cur = new Date(s); cur <= e; cur.setDate(cur.getDate() + 1)) {
                const dw = cur.getDay();
                if (dw >= 1 && dw <= 6) count++;
            }
            return count;
        }
        const wwd = countWorkDays(weekStart, weekEnd);
        const mwd = countWorkDays(monthStart, monthEnd);

        // ===== DEPARTMENT AGGREGATE MODE =====
        if (dept_id) {
            const deptIdNum = Number(dept_id);
            const childDepts = await db.all('SELECT id FROM departments WHERE parent_id = $1 AND status = $2', [deptIdNum, 'active']);
            const allDeptIds = [deptIdNum, ...childDepts.map(dd => dd.id)];
            const ph = allDeptIds.map((_, i) => `$${i + 1}`).join(',');
            const userFilter = `e.user_id IN (SELECT id FROM users WHERE department_id IN (${ph}) AND status = 'active')`;
            const baseParams = [...allDeptIds];
            const pi = allDeptIds.length + 1;
            const [tc, wc, mc, trc] = await Promise.all([
                db.get(`SELECT COUNT(*) as c FROM partner_outreach_entries e WHERE ${userFilter} AND e.entry_date = $${pi}`, [...baseParams, today]),
                db.get(`SELECT COUNT(*) as c FROM partner_outreach_entries e WHERE ${userFilter} AND e.entry_date BETWEEN $${pi} AND $${pi+1}`, [...baseParams, weekStart, weekEnd]),
                db.get(`SELECT COUNT(*) as c FROM partner_outreach_entries e WHERE ${userFilter} AND e.entry_date BETWEEN $${pi} AND $${pi+1}`, [...baseParams, monthStart, monthEnd]),
                db.get(`SELECT COUNT(*) as c FROM partner_outreach_entries e WHERE ${userFilter} AND e.transferred_to_crm = true AND e.entry_date = $${pi}`, [...baseParams, today]),
            ]);

            // Calculate per-user targets and sum
            const users = await db.all(`SELECT id, department_id FROM users WHERE department_id IN (${ph}) AND status = 'active'`, allDeptIds);
            let totalDailyTarget = 0;
            for (const u of users) {
                let uTpl = await db.get(`SELECT id, min_quantity FROM task_point_templates WHERE target_type = 'individual' AND target_id = $1 AND task_name ILIKE $2 LIMIT 1`, [u.id, PATTERN]);
                if (!uTpl && u.department_id) uTpl = await db.get(`SELECT id, min_quantity FROM task_point_templates WHERE target_type = 'team' AND target_id = $1 AND task_name ILIKE $2 LIMIT 1`, [u.department_id, PATTERN]);
                if (!uTpl) uTpl = await db.get(`SELECT id, min_quantity FROM task_point_templates WHERE task_name ILIKE $1 LIMIT 1`, [PATTERN]);
                let uTarget = uTpl ? Number(uTpl.min_quantity) : 20;
                if (uTpl && uTpl.id) {
                    const ov = await db.get('SELECT custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3', [u.id, 'diem', uTpl.id]);
                    if (ov && ov.custom_min_quantity != null) uTarget = Number(ov.custom_min_quantity);
                }
                totalDailyTarget += uTarget;
            }

            return {
                today: Number(tc.c), week: Number(wc.c), month: Number(mc.c),
                transferred: Number(trc.c),
                target: totalDailyTarget,
                week_target: totalDailyTarget * wwd,
                month_target: totalDailyTarget * mwd
            };
        }

        // ===== SINGLE USER MODE =====
        const uid = user_id ? Number(user_id) : req.user.id;
        const [todayCount, weekCount, monthCount, transferredCount, targetResult] = await Promise.all([
            db.get('SELECT COUNT(*) as c FROM partner_outreach_entries WHERE user_id = $1 AND entry_date = $2', [uid, today]),
            db.get('SELECT COUNT(*) as c FROM partner_outreach_entries WHERE user_id = $1 AND entry_date BETWEEN $2 AND $3', [uid, weekStart, weekEnd]),
            db.get('SELECT COUNT(*) as c FROM partner_outreach_entries WHERE user_id = $1 AND entry_date BETWEEN $2 AND $3', [uid, monthStart, monthEnd]),
            db.get('SELECT COUNT(*) as c FROM partner_outreach_entries WHERE user_id = $1 AND transferred_to_crm = true AND entry_date = $2', [uid, today]),
            // Get target from task_point_templates matching "Nhắn" + "Đối Tác" — individual → team → global fallback
            (async () => {
                const user = await db.get('SELECT department_id FROM users WHERE id = $1', [uid]);
                let tpl = await db.get(`SELECT id, min_quantity FROM task_point_templates WHERE target_type = 'individual' AND target_id = $1 AND task_name ILIKE '%Nhắn%Đối Tác%' LIMIT 1`, [uid]);
                if (!tpl && user?.department_id) tpl = await db.get(`SELECT id, min_quantity FROM task_point_templates WHERE target_type = 'team' AND target_id = $1 AND task_name ILIKE '%Nhắn%Đối Tác%' LIMIT 1`, [user.department_id]);
                if (!tpl) tpl = await db.get(`SELECT id, min_quantity FROM task_point_templates WHERE task_name ILIKE '%Nhắn%Đối Tác%' LIMIT 1`);
                return tpl;
            })()
        ]);

        // Check for user override
        let targetVal = targetResult ? Number(targetResult.min_quantity) : 20;
        if (targetResult) {
            const ov = await db.get('SELECT custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3', [uid, 'diem', targetResult.id]);
            if (ov?.custom_min_quantity != null) targetVal = Number(ov.custom_min_quantity);
        }

        return {
            today: Number(todayCount.c),
            week: Number(weekCount.c),
            month: Number(monthCount.c),
            transferred: Number(transferredCount.c),
            target: targetVal,
            week_target: targetVal * wwd,
            month_target: targetVal * mwd
        };
    });

    // ===== SCHEDULE INTEGRATION (Liên kết Lịch Khóa Biểu) =====
    fastify.get('/api/partner-outreach/schedule-info', { preHandler: [authenticate] }, async (req) => {
        const uid = req.query.user_id ? Number(req.query.user_id) : req.user.id;
        const today = _vnToday();
        const d = new Date(today + 'T00:00:00');
        const jsDow = d.getDay();
        const dayOfWeek = jsDow === 0 ? 7 : jsDow; // 1=Mon..7=Sun

        // Find matching template for this user (individual first, then team)
        const user = await db.get('SELECT id, department_id FROM users WHERE id = $1', [uid]);
        if (!user) return { found: false };

        // Search by name pattern: "Nhắn" + "Đối Tác" (case-insensitive)
        let template = await db.get(
            `SELECT * FROM task_point_templates
             WHERE target_type = 'individual' AND target_id = $1
               AND task_name ILIKE '%Nhắn%Đối Tác%' AND day_of_week = $2
             LIMIT 1`,
            [uid, dayOfWeek]
        );
        if (!template && user.department_id) {
            template = await db.get(
                `SELECT * FROM task_point_templates
                 WHERE target_type = 'team' AND target_id = $1
                   AND task_name ILIKE '%Nhắn%Đối Tác%' AND day_of_week = $2
                 LIMIT 1`,
                [user.department_id, dayOfWeek]
            );
        }
        // Global fallback (for GĐ or users without specific template)
        if (!template) {
            template = await db.get(
                `SELECT * FROM task_point_templates
                 WHERE task_name ILIKE '%Nhắn%Đối Tác%' AND day_of_week = $1
                 LIMIT 1`,
                [dayOfWeek]
            );
        }

        if (!template) return { found: false };

        // Count today's entries for this user
        const entryCount = await db.get(
            'SELECT COUNT(*) as c FROM partner_outreach_entries WHERE user_id = $1 AND entry_date = $2',
            [uid, today]
        );

        // Check if report already submitted today
        const existingReport = await db.get(
            `SELECT id, status, quantity, redo_count FROM task_point_reports
             WHERE template_id = $1 AND user_id = $2 AND report_date = $3
             ORDER BY redo_count DESC LIMIT 1`,
            [template.id, uid, today]
        );

        // Check for user override
        let finalMinQty = template.min_quantity || 1;
        let finalPoints = template.points || 0;
        const ov = await db.get('SELECT custom_points, custom_min_quantity FROM task_user_overrides WHERE user_id = $1 AND source_type = $2 AND source_id = $3', [uid, 'diem', template.id]);
        if (ov) {
            if (ov.custom_min_quantity != null) finalMinQty = Number(ov.custom_min_quantity);
            if (ov.custom_points != null) finalPoints = Number(ov.custom_points);
        }

        return {
            found: true,
            template_id: template.id,
            task_name: template.task_name,
            min_quantity: finalMinQty,
            points: finalPoints,
            guide_url: template.guide_url || null,
            requires_approval: template.requires_approval || false,
            today_count: Number(entryCount.c),
            report: existingReport ? {
                id: existingReport.id,
                status: existingReport.status,
                quantity: existingReport.quantity
            } : null
        };
    });

    // ===== LIVE COUNT for Lịch Khóa Biểu integration =====
    fastify.get('/api/partner-outreach/live-count/:userId', { preHandler: [authenticate] }, async (req) => {
        const uid = Number(req.params.userId);
        const date = req.query.date || _vnToday();

        const user = await db.get('SELECT department_id FROM users WHERE id = $1', [uid]);
        const countResult = await db.get('SELECT COUNT(*) as c FROM partner_outreach_entries WHERE user_id = $1 AND entry_date = $2', [uid, date]);

        // Find user-specific template (individual → team → global fallback)
        let tpl = await db.get(`SELECT id, min_quantity, points FROM task_point_templates WHERE target_type = 'individual' AND target_id = $1 AND task_name ILIKE '%Nhắn%Đối Tác%' LIMIT 1`, [uid]);
        if (!tpl && user?.department_id) tpl = await db.get(`SELECT id, min_quantity, points FROM task_point_templates WHERE target_type = 'team' AND target_id = $1 AND task_name ILIKE '%Nhắn%Đối Tác%' LIMIT 1`, [user.department_id]);
        if (!tpl) tpl = await db.get(`SELECT id, min_quantity, points FROM task_point_templates WHERE task_name ILIKE '%Nhắn%Đối Tác%' LIMIT 1`);

        // Check for user override
        let targetVal = tpl ? Number(tpl.min_quantity) : 20;
        let pointsVal = tpl ? Number(tpl.points) : 10;
        if (tpl) {
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

    // ===== TRANSFER TO CRM =====
    fastify.post('/api/partner-outreach/entries/:id/transfer', { preHandler: [authenticate] }, async (req, reply) => {
        const entry = await db.get('SELECT * FROM partner_outreach_entries WHERE id = $1', [Number(req.params.id)]);
        if (!entry) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (entry.transferred_to_crm) return reply.code(400).send({ error: 'Đã chuyển CRM rồi' });

        // Accept target CRM type from frontend (default: nhu_cau)
        const targetCrmType = req.body?.target_crm_type || 'nhu_cau';
        const allowedTypes = ['nhu_cau', 'ctv_hoa_hong'];
        if (!allowedTypes.includes(targetCrmType)) return reply.code(400).send({ error: 'CRM type không hợp lệ' });

        // Find source for telesale_data (use nhu_cau source for data storage)
        const ttkSource = await db.get("SELECT id, crm_type FROM telesale_sources WHERE crm_type = 'nhu_cau' LIMIT 1");
        if (!ttkSource) return reply.code(500).send({ error: 'Chưa có nguồn CRM' });

        const today = _vnToday();
        const now = new Date().toISOString();

        // Check duplicate in CRM
        if (entry.fb_link) {
            const dupFb = await db.get(
                'SELECT id FROM telesale_data WHERE fb_link = $1 AND source_id = $2',
                [entry.fb_link, ttkSource.id]
            );
            if (dupFb) return reply.code(400).send({ error: 'Link FB đã tồn tại trong CRM' });
        }

        // Create telesale_data record
        const result = await db.run(
            `INSERT INTO telesale_data (source_id, customer_name, phone, fb_link, self_searched_by, self_searched_at, status, last_assigned_date, last_assigned_user_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'answered', $7, $5, $6)`,
            [ttkSource.id, entry.partner_name, entry.phone || '', entry.fb_link || null, req.user.id, now, today]
        );

        const newDataId = result.lastInsertRowid || result.insertId;

        // Create assignment
        if (newDataId) {
            await db.run(
                `INSERT INTO telesale_assignments (data_id, user_id, assigned_date, call_status, notes, called_at, created_at)
                 VALUES ($1, $2, $3, 'answered', 'Chuyển từ Nhắn Tin Đối Tác', NOW(), NOW())`,
                [newDataId, req.user.id, today]
            );

            // Also create customer record in target CRM
            const crmLabels = { nhu_cau: 'Chăm Sóc KH Nhu Cầu', ctv_hoa_hong: 'Chăm Sóc Affiliate' };
            // Get category name for Lĩnh Vực
            let catName = null;
            if (entry.category_id) {
                const catRow = await db.get('SELECT name FROM partner_outreach_categories WHERE id = $1', [entry.category_id]);
                if (catRow) catName = catRow.name;
            }
            await db.run(
                `INSERT INTO customers (customer_name, phone, facebook_link, crm_type, assigned_to, source_name, job, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [entry.partner_name, entry.phone || '', entry.fb_link || '', targetCrmType, req.user.id, 'Nhắn Tìm Đối Tác', catName]
            );
        }

        // Mark as transferred
        await db.run(
            'UPDATE partner_outreach_entries SET transferred_to_crm = true, transferred_at = NOW(), crm_data_id = $1 WHERE id = $2',
            [newDataId, Number(req.params.id)]
        );

        return { success: true, crm_data_id: newDataId };
    });

    // ===== TEAM MEMBERS (for sidebar filter — PHÒNG KINH DOANH only) =====
    fastify.get('/api/partner-outreach/members', { preHandler: [authenticate] }, async (req) => {
        const role = req.user.role;
        let members = [];

        // Get PHÒNG KINH DOANH + child team IDs (ordered by display_order)
        const kdDepts = await db.all("SELECT id, name, display_order FROM departments WHERE (id = 1 OR parent_id = 1) AND status = 'active' ORDER BY display_order, id");
        const kdDeptIds = kdDepts.map(d => d.id);
        const kdPh = kdDeptIds.map((_, i) => `$${i + 1}`).join(',');

        if (role === 'giam_doc' || role === 'quan_ly_cap_cao') {
            members = await db.all(
                `SELECT u.id, u.full_name, u.role, u.username, d.id as dept_id, d.name as dept_name, d.display_order
                 FROM users u LEFT JOIN departments d ON u.department_id = d.id
                 WHERE u.status = 'active' AND u.department_id IN (${kdPh})
                 ORDER BY d.display_order, d.id, u.full_name`,
                kdDeptIds
            );
        } else if (['quan_ly', 'truong_phong'].includes(role)) {
            const deptIds = await _getManagedDeptIds(req.user);
            const filtered = deptIds.filter(id => kdDeptIds.includes(id));
            if (filtered.length > 0) {
                const ph = filtered.map((_, i) => `$${i + 1}`).join(',');
                members = await db.all(
                    `SELECT u.id, u.full_name, u.role, u.username, d.id as dept_id, d.name as dept_name, d.display_order
                     FROM users u LEFT JOIN departments d ON u.department_id = d.id
                     WHERE u.department_id IN (${ph}) AND u.status = 'active'
                     ORDER BY d.display_order, d.id, u.full_name`,
                    filtered
                );
            }
        }

        // Build ordered array — always include all KD depts (even empty)
        const deptOrder = kdDepts.map(d => d.id);
        const deptMap = {};
        kdDepts.forEach(d => { deptMap[d.id] = { id: d.id, name: d.name, members: [] }; });
        members.forEach(m => {
            const key = m.dept_id || 0;
            if (deptMap[key]) deptMap[key].members.push(m);
        });
        const ordered = deptOrder.filter(id => deptMap[id]).map(id => deptMap[id]);

        return { departments: ordered };
    });

    // ===== IMAGE UPLOAD (base64 → file, with compression) =====
    const { compressImage } = require('../utils/imageCompressor');
    async function _saveImage(base64Data, userId) {
        try {
            const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
            if (!matches) return null;
            let buffer = Buffer.from(matches[2], 'base64');

            // Max 5MB raw (will be compressed)
            if (buffer.length > 5 * 1024 * 1024) return null;

            // Compress: resize to 1200px max, JPEG 80%
            buffer = await compressImage(buffer, { maxWidth: 1200, quality: 80 });

            const now = new Date(Date.now() + 7 * 3600000);
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const uploadDir = path.join(__dirname, '..', 'uploads', 'partner-outreach', month);
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            const fileName = `po_${userId}_${Date.now()}.jpg`;
            fs.writeFileSync(path.join(uploadDir, fileName), buffer);
            return `/uploads/partner-outreach/${month}/${fileName}`;
        } catch (e) {
            console.error('[PartnerOutreach] Image save error:', e.message);
            return null;
        }
    }

    // ===== HELPER: Get managed department IDs =====
    async function _getManagedDeptIds(user) {
        const assigned = await db.all('SELECT department_id FROM task_approvers WHERE user_id = $1', [user.id]);
        const ids = new Set(assigned.map(a => a.department_id));
        if (user.department_id) ids.add(user.department_id);
        return [...ids];
    }
};
