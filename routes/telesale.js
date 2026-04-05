// ========== TELESALE API ROUTES ==========
const db = require('../db/pool');

async function telesaleRoutes(fastify) {
    const { authenticate } = require('../middleware/auth');

    // ========== SOURCES CRUD ==========
    fastify.get('/api/telesale/sources', { preHandler: authenticate }, async (req, reply) => {
        const sources = await db.all('SELECT * FROM telesale_sources ORDER BY display_order, id');
        return { sources };
    });

    fastify.post('/api/telesale/sources', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ mới thêm được' });
        const { name, icon, crm_type, daily_quota, default_followup_days } = req.body;
        if (!name) return reply.code(400).send({ error: 'Tên nguồn là bắt buộc' });
        const maxOrder = await db.get('SELECT COALESCE(MAX(display_order),0) as mx FROM telesale_sources');
        await db.run('INSERT INTO telesale_sources (name, icon, crm_type, daily_quota, default_followup_days, display_order) VALUES (?,?,?,?,?,?)',
            [name, icon || '📁', crm_type || null, daily_quota || 0, default_followup_days || 3, (maxOrder.mx || 0) + 1]);
        return { success: true, message: 'Đã thêm nguồn gọi điện' };
    });

    fastify.put('/api/telesale/sources/:id', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { name, icon, crm_type, daily_quota, default_followup_days, display_order } = req.body;
        await db.run(`UPDATE telesale_sources SET
            name = COALESCE(?, name), icon = COALESCE(?, icon), crm_type = ?,
            daily_quota = COALESCE(?, daily_quota), default_followup_days = COALESCE(?, default_followup_days),
            display_order = COALESCE(?, display_order)
            WHERE id = ?`, [name, icon, crm_type, daily_quota, default_followup_days, display_order, req.params.id]);
        return { success: true, message: 'Đã cập nhật nguồn' };
    });

    fastify.delete('/api/telesale/sources/:id', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const hasData = await db.get('SELECT COUNT(*) as cnt FROM telesale_data WHERE source_id = ?', [req.params.id]);
        if (hasData && hasData.cnt > 0) return reply.code(400).send({ error: `Không thể xóa: nguồn đang có ${hasData.cnt} data` });
        await db.run('DELETE FROM telesale_sources WHERE id = ?', [req.params.id]);
        return { success: true, message: 'Đã xóa nguồn' };
    });

    // ========== ANSWER STATUSES CRUD ==========
    fastify.get('/api/telesale/answer-statuses', { preHandler: authenticate }, async (req, reply) => {
        const statuses = await db.all('SELECT * FROM telesale_answer_statuses ORDER BY display_order, id');
        return { statuses };
    });

    fastify.post('/api/telesale/answer-statuses', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { name, icon, action_type, default_followup_days, counts_as_answered } = req.body;
        if (!name) return reply.code(400).send({ error: 'Tên tình trạng là bắt buộc' });
        const maxOrder = await db.get('SELECT COALESCE(MAX(display_order),0) as mx FROM telesale_answer_statuses');
        await db.run('INSERT INTO telesale_answer_statuses (name, icon, action_type, default_followup_days, counts_as_answered, display_order) VALUES (?,?,?,?,?,?)',
            [name, icon || '📞', action_type || 'none', default_followup_days || 0, counts_as_answered !== false, (maxOrder.mx || 0) + 1]);
        return { success: true, message: 'Đã thêm tình trạng' };
    });

    fastify.put('/api/telesale/answer-statuses/:id', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { name, icon, action_type, default_followup_days, counts_as_answered } = req.body;
        await db.run(`UPDATE telesale_answer_statuses SET
            name = COALESCE(?, name), icon = COALESCE(?, icon), action_type = COALESCE(?, action_type),
            default_followup_days = COALESCE(?, default_followup_days),
            counts_as_answered = COALESCE(?, counts_as_answered)
            WHERE id = ?`, [name, icon, action_type, default_followup_days, counts_as_answered, req.params.id]);
        return { success: true, message: 'Đã cập nhật tình trạng' };
    });

    fastify.delete('/api/telesale/answer-statuses/:id', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        await db.run('DELETE FROM telesale_answer_statuses WHERE id = ?', [req.params.id]);
        return { success: true, message: 'Đã xóa tình trạng' };
    });

    // ========== DATA POOL ==========
    fastify.get('/api/telesale/data', { preHandler: authenticate }, async (req, reply) => {
        const { source_id, status, search, page = 1, limit = 50 } = req.query;
        let where = 'WHERE 1=1';
        const params = [];
        let paramIdx = 0;
        if (source_id) { paramIdx++; where += ` AND d.source_id = $${paramIdx}`; params.push(source_id); }
        if (status) { paramIdx++; where += ` AND d.status = $${paramIdx}`; params.push(status); }
        if (search) { paramIdx++; where += ` AND (d.phone ILIKE $${paramIdx} OR d.customer_name ILIKE $${paramIdx} OR d.company_name ILIKE $${paramIdx})`; params.push(`%${search}%`); }

        const countRes = await db.get(`SELECT COUNT(*) as total FROM telesale_data d ${where}`, params);
        const offset = (parseInt(page) - 1) * parseInt(limit);
        paramIdx++; const limitParam = paramIdx;
        paramIdx++; const offsetParam = paramIdx;
        params.push(parseInt(limit), offset);

        const data = await db.all(`SELECT d.*, s.name as source_name, s.icon as source_icon,
            u.full_name as last_assigned_user_name
            FROM telesale_data d
            LEFT JOIN telesale_sources s ON s.id = d.source_id
            LEFT JOIN users u ON u.id = d.last_assigned_user_id
            ${where} ORDER BY d.created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`, params);
        return { data, total: countRes.total, page: parseInt(page), limit: parseInt(limit) };
    });

    fastify.get('/api/telesale/data/stats', { preHandler: authenticate }, async (req, reply) => {
        const stats = await db.all(`SELECT s.id, s.name, s.icon, s.daily_quota,
            COUNT(d.id) FILTER (WHERE true) as total,
            COUNT(d.id) FILTER (WHERE d.status = 'available') as available,
            COUNT(d.id) FILTER (WHERE d.status = 'assigned') as assigned,
            COUNT(d.id) FILTER (WHERE d.status = 'answered') as answered,
            COUNT(d.id) FILTER (WHERE d.status = 'cold') as cold,
            COUNT(d.id) FILTER (WHERE d.status = 'invalid') as invalid
            FROM telesale_sources s
            LEFT JOIN telesale_data d ON d.source_id = s.id
            WHERE s.is_active = true
            GROUP BY s.id, s.name, s.icon, s.daily_quota
            ORDER BY s.display_order`);
        return { stats };
    });

    fastify.post('/api/telesale/data', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { source_id, company_name, group_name, post_link, post_content, customer_name, phone, address } = req.body;
        if (!source_id || !phone) return reply.code(400).send({ error: 'Nguồn và SĐT là bắt buộc' });
        // Check duplicate phone in same source
        const exists = await db.get('SELECT id FROM telesale_data WHERE phone = ? AND source_id = ?', [phone, source_id]);
        if (exists) return reply.code(400).send({ error: 'SĐT đã tồn tại trong nguồn này' });
        await db.run('INSERT INTO telesale_data (source_id, company_name, group_name, post_link, post_content, customer_name, phone, address) VALUES (?,?,?,?,?,?,?,?)',
            [source_id, company_name || '', group_name || '', post_link || '', post_content || '', customer_name || '', phone, address || '']);
        return { success: true, message: 'Đã thêm data' };
    });

    // Import CSV/Excel (parse in frontend, send as JSON array)
    fastify.post('/api/telesale/data/import', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { source_id, rows } = req.body;
        if (!source_id || !rows || !Array.isArray(rows) || rows.length === 0)
            return reply.code(400).send({ error: 'Cần source_id và rows[]' });

        // 1. Get all existing phones for this source in ONE query
        const existingRows = await db.all('SELECT phone FROM telesale_data WHERE source_id = ?', [source_id]);
        const existingPhones = new Set(existingRows.map(r => r.phone));

        // 2. Filter new rows (skip empty phone & duplicates)
        const newRows = [];
        const seenPhones = new Set();
        for (const row of rows) {
            const phone = (row.phone || '').toString().trim();
            if (!phone || existingPhones.has(phone) || seenPhones.has(phone)) continue;
            seenPhones.add(phone);
            newRows.push(row);
        }
        const skipped = rows.length - newRows.length;

        // 3. Batch INSERT in chunks of 500
        const BATCH_SIZE = 500;
        let inserted = 0;
        for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
            const chunk = newRows.slice(i, i + BATCH_SIZE);
            const values = [];
            const placeholders = [];
            for (const row of chunk) {
                const phone = (row.phone || '').toString().trim();
                placeholders.push('(?,?,?,?,?,?,?,?,?)');
                values.push(source_id, row.company_name || '', row.group_name || '', row.post_link || '', row.post_content || '', row.customer_name || '', phone, row.address || '', JSON.stringify(row.extra || {}));
            }
            await db.run(`INSERT INTO telesale_data (source_id, company_name, group_name, post_link, post_content, customer_name, phone, address, extra_data) VALUES ${placeholders.join(',')}`, values);
            inserted += chunk.length;
        }
        return { success: true, message: `Import thành công: ${inserted} mới, ${skipped} bỏ qua (trùng/trống)`, inserted, skipped };
    });

    fastify.delete('/api/telesale/data/:id', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        await db.run('DELETE FROM telesale_assignments WHERE data_id = ?', [req.params.id]);
        await db.run('DELETE FROM telesale_data WHERE id = ?', [req.params.id]);
        return { success: true, message: 'Đã xóa data' };
    });

    // ========== ACTIVE MEMBERS ==========
    fastify.get('/api/telesale/active-members', { preHandler: authenticate }, async (req, reply) => {
        const members = await db.all(`SELECT tam.*, u.full_name, u.username, u.role, u.department_id,
            d.name as dept_name, d.parent_id as dept_parent_id
            FROM telesale_active_members tam
            JOIN users u ON u.id = tam.user_id
            LEFT JOIN departments d ON d.id = u.department_id
            WHERE u.status = 'active'
            ORDER BY u.full_name`);
        return { members };
    });

    fastify.post('/api/telesale/active-members', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { user_id, daily_quota } = req.body;
        if (!user_id) return reply.code(400).send({ error: 'user_id là bắt buộc' });
        const existing = await db.get('SELECT id FROM telesale_active_members WHERE user_id = ?', [user_id]);
        if (existing) {
            await db.run('UPDATE telesale_active_members SET is_active = true, daily_quota = COALESCE(?, daily_quota) WHERE user_id = ?', [daily_quota, user_id]);
        } else {
            const defaultQuota = await db.get("SELECT value FROM app_config WHERE key = 'telesale_default_quota'");
            await db.run('INSERT INTO telesale_active_members (user_id, daily_quota) VALUES (?,?)',
                [user_id, daily_quota || parseInt(defaultQuota?.value || '250')]);
        }
        return { success: true, message: 'Đã thêm NV vào Telesale' };
    });

    fastify.put('/api/telesale/active-members/:userId', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { daily_quota, is_active } = req.body;
        await db.run('UPDATE telesale_active_members SET daily_quota = COALESCE(?,daily_quota), is_active = COALESCE(?,is_active) WHERE user_id = ?',
            [daily_quota, is_active, req.params.userId]);
        return { success: true, message: 'Đã cập nhật' };
    });

    fastify.post('/api/telesale/active-members/sync-quota', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { user_ids, daily_quota } = req.body;
        if (!user_ids || !Array.isArray(user_ids) || !daily_quota) return reply.code(400).send({ error: 'Cần user_ids[] và daily_quota' });
        for (const uid of user_ids) {
            await db.run('UPDATE telesale_active_members SET daily_quota = ? WHERE user_id = ?', [daily_quota, uid]);
        }
        return { success: true, message: `Đã đồng bộ ${user_ids.length} NV → ${daily_quota} số/ngày` };
    });

    fastify.delete('/api/telesale/active-members/:userId', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        await db.run('UPDATE telesale_active_members SET is_active = false WHERE user_id = ?', [req.params.userId]);
        return { success: true, message: 'Đã bỏ NV khỏi Telesale' };
    });

    // ========== CALLING (NV thao tác) ==========
    fastify.get('/api/telesale/my-calls', { preHandler: authenticate }, async (req, reply) => {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const userId = req.user.id;
        const calls = await db.all(`SELECT a.*, d.company_name, d.group_name, d.post_link, d.post_content,
            d.customer_name, d.phone, d.address, d.extra_data,
            s.name as source_name, s.icon as source_icon, s.crm_type as source_crm_type,
            ans.name as answer_status_name, ans.icon as answer_status_icon, ans.action_type
            FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            LEFT JOIN telesale_sources s ON s.id = d.source_id
            LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
            WHERE a.user_id = $1 AND a.assigned_date = $2
            ORDER BY a.call_status = 'pending' DESC, a.id`, [userId, date]);
        return { calls, date };
    });

    fastify.get('/api/telesale/user-calls/:userId', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'];
        if (!mgr.includes(req.user.role) && String(req.user.id) !== req.params.userId)
            return reply.code(403).send({ error: 'Không có quyền' });
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const calls = await db.all(`SELECT a.*, d.company_name, d.group_name, d.post_link, d.post_content,
            d.customer_name, d.phone, d.address, d.extra_data,
            s.name as source_name, s.icon as source_icon, s.crm_type as source_crm_type,
            ans.name as answer_status_name, ans.icon as answer_status_icon, ans.action_type
            FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            LEFT JOIN telesale_sources s ON s.id = d.source_id
            LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
            WHERE a.user_id = $1 AND a.assigned_date = $2
            ORDER BY a.call_status = 'pending' DESC, a.id`, [req.params.userId, date]);
        return { calls, date };
    });

    fastify.put('/api/telesale/call/:assignmentId', { preHandler: authenticate }, async (req, reply) => {
        const { call_status, answer_status_id, notes, callback_date, callback_time } = req.body;
        const assign = await db.get('SELECT * FROM telesale_assignments WHERE id = ?', [req.params.assignmentId]);
        if (!assign) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (assign.user_id !== req.user.id && !['giam_doc', 'quan_ly_cap_cao', 'quan_ly'].includes(req.user.role))
            return reply.code(403).send({ error: 'Không có quyền' });

        // Update assignment
        await db.run(`UPDATE telesale_assignments SET call_status = ?, answer_status_id = ?,
            notes = ?, callback_date = ?, callback_time = ?, called_at = NOW(), updated_at = NOW()
            WHERE id = ?`, [call_status, answer_status_id || null, notes || null, callback_date || null, callback_time || null, req.params.assignmentId]);

        // Update data status based on call result
        if (call_status === 'answered') {
            await db.run("UPDATE telesale_data SET status = 'answered', updated_at = NOW() WHERE id = ?", [assign.data_id]);

            // If answer has callback → set data callback info
            if (callback_date) {
                await db.run("UPDATE telesale_data SET last_assigned_user_id = ?, last_assigned_date = ? WHERE id = ?",
                    [assign.user_id, callback_date, assign.data_id]);
            }

            // If answer is "cold" type → set cold_until
            if (answer_status_id) {
                const ansStatus = await db.get('SELECT * FROM telesale_answer_statuses WHERE id = ?', [answer_status_id]);
                if (ansStatus && ansStatus.action_type === 'cold') {
                    const coldMonths = await db.get("SELECT value FROM app_config WHERE key = 'telesale_cold_months'");
                    const months = parseInt(coldMonths?.value || '4');
                    await db.run(`UPDATE telesale_data SET status = 'cold',
                        cold_until = CURRENT_DATE + INTERVAL '${months} months', updated_at = NOW() WHERE id = ?`, [assign.data_id]);
                }
            }
        } else if (call_status === 'invalid') {
            // Increment invalid count
            await db.run("UPDATE telesale_data SET invalid_count = invalid_count + 1, updated_at = NOW() WHERE id = ?", [assign.data_id]);
        }

        return { success: true, message: 'Đã cập nhật trạng thái' };
    });

    fastify.get('/api/telesale/callbacks', { preHandler: authenticate }, async (req, reply) => {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const userId = req.query.user_id || req.user.id;
        const callbacks = await db.all(`SELECT a.*, d.company_name, d.customer_name, d.phone,
            s.name as source_name, s.icon as source_icon
            FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            LEFT JOIN telesale_sources s ON s.id = d.source_id
            WHERE a.callback_date = $1 AND a.user_id = $2
            ORDER BY a.callback_time NULLS LAST`, [date, userId]);
        return { callbacks };
    });

    fastify.get('/api/telesale/daily-stats/:userId', { preHandler: authenticate }, async (req, reply) => {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const stats = await db.get(`SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE call_status = 'pending') as pending,
            COUNT(*) FILTER (WHERE call_status = 'answered') as answered,
            COUNT(*) FILTER (WHERE call_status = 'no_answer') as no_answer,
            COUNT(*) FILTER (WHERE call_status = 'busy') as busy,
            COUNT(*) FILTER (WHERE call_status = 'invalid') as invalid
            FROM telesale_assignments
            WHERE user_id = $1 AND assigned_date = $2`, [req.params.userId, date]);
        return { stats: stats || { total: 0, pending: 0, answered: 0, no_answer: 0, busy: 0, invalid: 0 } };
    });

    // GĐ force recall a number (answered → make available again)
    fastify.post('/api/telesale/force-recall/:dataId', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        await db.run("UPDATE telesale_data SET status = 'available', updated_at = NOW() WHERE id = ?", [req.params.dataId]);
        return { success: true, message: 'Đã yêu cầu gọi lại số này' };
    });

    // ========== PUMP & RECALL ==========
    fastify.post('/api/telesale/pump', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const result = await runTelesalePump();
        return result;
    });

    fastify.post('/api/telesale/recall', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const result = await runTelesaleRecall();
        return result;
    });

    fastify.get('/api/telesale/pump-preview', { preHandler: authenticate }, async (req, reply) => {
        const members = await db.all(`SELECT tam.user_id, tam.daily_quota, u.full_name
            FROM telesale_active_members tam JOIN users u ON u.id = tam.user_id
            WHERE tam.is_active = true AND u.status = 'active'`);
        const sources = await db.all(`SELECT id, name, daily_quota,
            (SELECT COUNT(*) FROM telesale_data WHERE source_id = telesale_sources.id AND status = 'available') as available
            FROM telesale_sources WHERE is_active = true ORDER BY display_order`);
        return { members, sources };
    });

    fastify.get('/api/telesale/source-alerts', { preHandler: authenticate }, async (req, reply) => {
        const alerts = await db.all(`SELECT s.id, s.name, s.icon, s.daily_quota,
            COUNT(d.id) FILTER (WHERE d.status = 'available') as available
            FROM telesale_sources s
            LEFT JOIN telesale_data d ON d.source_id = s.id
            WHERE s.is_active = true
            GROUP BY s.id, s.name, s.icon, s.daily_quota
            HAVING COUNT(d.id) FILTER (WHERE d.status = 'available') < s.daily_quota * 3
            ORDER BY COUNT(d.id) FILTER (WHERE d.status = 'available')`);
        return { alerts };
    });

    // ========== IMPORT COLUMNS ==========
    fastify.get('/api/telesale/import-columns', { preHandler: authenticate }, async (req, reply) => {
        const columns = await db.all('SELECT * FROM telesale_import_columns WHERE is_active = true ORDER BY display_order');
        return { columns };
    });

    fastify.post('/api/telesale/import-columns', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { column_key, column_name } = req.body;
        if (!column_key || !column_name) return reply.code(400).send({ error: 'Cần key và tên cột' });
        const maxOrder = await db.get('SELECT COALESCE(MAX(display_order),0) as mx FROM telesale_import_columns');
        await db.run('INSERT INTO telesale_import_columns (column_key, column_name, display_order) VALUES (?,?,?)',
            [column_key, column_name, (maxOrder.mx || 0) + 1]);
        return { success: true, message: 'Đã thêm cột' };
    });

    fastify.put('/api/telesale/import-columns/:id', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { column_name } = req.body;
        await db.run('UPDATE telesale_import_columns SET column_name = ? WHERE id = ?', [column_name, req.params.id]);
        return { success: true, message: 'Đã sửa cột' };
    });

    fastify.delete('/api/telesale/import-columns/:id', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const col = await db.get('SELECT * FROM telesale_import_columns WHERE id = ?', [req.params.id]);
        if (col && col.is_default) return reply.code(400).send({ error: 'Không thể xóa cột mặc định' });
        await db.run('UPDATE telesale_import_columns SET is_active = false WHERE id = ?', [req.params.id]);
        return { success: true, message: 'Đã xóa cột' };
    });

    // ========== INVALID NUMBERS ==========
    fastify.get('/api/telesale/invalid-numbers', { preHandler: authenticate }, async (req, reply) => {
        const numbers = await db.all(`SELECT inv.*, s.name as source_name, s.icon as source_icon
            FROM telesale_invalid_numbers inv
            LEFT JOIN telesale_sources s ON s.id = inv.source_id
            ORDER BY inv.created_at DESC`);
        return { numbers };
    });

    fastify.post('/api/telesale/invalid-numbers/:id/restore', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const inv = await db.get('SELECT * FROM telesale_invalid_numbers WHERE id = ?', [req.params.id]);
        if (!inv) return reply.code(404).send({ error: 'Không tìm thấy' });
        if (inv.data_id) {
            await db.run("UPDATE telesale_data SET status = 'available', invalid_count = 0, updated_at = NOW() WHERE id = ?", [inv.data_id]);
        }
        await db.run('DELETE FROM telesale_invalid_numbers WHERE id = ?', [req.params.id]);
        return { success: true, message: 'Đã khôi phục số' };
    });
};

// ========== PUMP LOGIC (exported for cron) ==========
async function runTelesalePump() {
    const today = new Date().toISOString().split('T')[0];
    const members = await db.all(`SELECT tam.user_id, tam.daily_quota, u.full_name
        FROM telesale_active_members tam JOIN users u ON u.id = tam.user_id
        WHERE tam.is_active = true AND u.status = 'active'`);
    if (members.length === 0) return { success: true, message: 'Không có NV active', pumped: 0 };

    const sources = await db.all('SELECT * FROM telesale_sources WHERE is_active = true ORDER BY display_order');
    if (sources.length === 0) return { success: true, message: 'Không có nguồn', pumped: 0 };

    let totalPumped = 0;
    const alerts = [];

    for (const member of members) {
        let remaining = member.daily_quota;
        // Check if already pumped today
        const existing = await db.get('SELECT COUNT(*) as cnt FROM telesale_assignments WHERE user_id = ? AND assigned_date = ?', [member.user_id, today]);
        if (existing && existing.cnt > 0) continue; // Already pumped

        // Add callbacks due today
        const callbacks = await db.all(`SELECT DISTINCT a.data_id FROM telesale_assignments a
            WHERE a.callback_date = $1 AND a.user_id = $2
            AND NOT EXISTS (SELECT 1 FROM telesale_assignments a2 WHERE a2.data_id = a.data_id AND a2.assigned_date = $1)`,
            [today, member.user_id]);
        for (const cb of callbacks) {
            try {
                await db.run('INSERT INTO telesale_assignments (data_id, user_id, assigned_date) VALUES (?,?,?)',
                    [cb.data_id, member.user_id, today]);
                await db.run("UPDATE telesale_data SET status = 'assigned', last_assigned_date = ?, last_assigned_user_id = ? WHERE id = ?",
                    [today, member.user_id, cb.data_id]);
                totalPumped++;
                remaining--;
            } catch (e) { /* duplicate, skip */ }
        }

        // Distribute from sources proportionally
        const totalQuota = sources.reduce((s, src) => s + (src.daily_quota || 0), 0);
        for (let si = 0; si < sources.length && remaining > 0; si++) {
            const src = sources[si];
            let count = totalQuota > 0 ? Math.round(remaining * (src.daily_quota || 0) / totalQuota) : Math.ceil(remaining / sources.length);
            count = Math.min(count, remaining);
            if (count <= 0) continue;

            const available = await db.all(`SELECT id FROM telesale_data
                WHERE source_id = $1 AND status = 'available'
                ORDER BY RANDOM() LIMIT $2`, [src.id, count]);

            if (available.length < count && available.length < (src.daily_quota || 0)) {
                alerts.push({ source: src.name, needed: count, available: available.length });
            }

            for (const d of available) {
                try {
                    await db.run('INSERT INTO telesale_assignments (data_id, user_id, assigned_date) VALUES (?,?,?)',
                        [d.id, member.user_id, today]);
                    await db.run("UPDATE telesale_data SET status = 'assigned', last_assigned_date = ?, last_assigned_user_id = ? WHERE id = ?",
                        [today, member.user_id, d.id]);
                    totalPumped++;
                    remaining--;
                } catch (e) { /* duplicate */ }
            }
        }

        // If still remaining, try to fill from any source with available data
        if (remaining > 0) {
            const extra = await db.all(`SELECT id FROM telesale_data
                WHERE status = 'available'
                AND id NOT IN (SELECT data_id FROM telesale_assignments WHERE assigned_date = $1 AND user_id = $2)
                ORDER BY RANDOM() LIMIT $3`, [today, member.user_id, remaining]);
            for (const d of extra) {
                try {
                    await db.run('INSERT INTO telesale_assignments (data_id, user_id, assigned_date) VALUES (?,?,?)',
                        [d.id, member.user_id, today]);
                    await db.run("UPDATE telesale_data SET status = 'assigned', last_assigned_date = ?, last_assigned_user_id = ? WHERE id = ?",
                        [today, member.user_id, d.id]);
                    totalPumped++;
                    remaining--;
                } catch (e) { /* skip */ }
            }
        }
    }

    // Save alerts
    if (alerts.length > 0) {
        await db.run("INSERT INTO app_config (key, value, updated_at) VALUES ('telesale_source_alert', ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
            [JSON.stringify(alerts)]);
    }

    return { success: true, message: `Đã bơm ${totalPumped} SĐT cho ${members.length} NV`, pumped: totalPumped, alerts };
}

async function runTelesaleRecall() {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let recalled = 0, invalidated = 0;

    // 1. Pending (not called) → return to pool
    const pendingAssigns = await db.all(`SELECT a.data_id FROM telesale_assignments a
        WHERE a.assigned_date <= $1 AND a.call_status = 'pending'`, [yesterday]);
    for (const a of pendingAssigns) {
        await db.run("UPDATE telesale_data SET status = 'available', updated_at = NOW() WHERE id = ? AND status = 'assigned'", [a.data_id]);
        recalled++;
    }

    // 2. No answer + busy → return to pool
    const recallAssigns = await db.all(`SELECT a.data_id FROM telesale_assignments a
        WHERE a.assigned_date <= $1 AND a.call_status IN ('no_answer', 'busy')`, [yesterday]);
    for (const a of recallAssigns) {
        await db.run("UPDATE telesale_data SET status = 'available', updated_at = NOW() WHERE id = ? AND status != 'available'", [a.data_id]);
        recalled++;
    }

    // 3. Invalid → check count
    const invalidAssigns = await db.all(`SELECT a.data_id, d.invalid_count, d.phone, d.customer_name, d.company_name, d.source_id, a.user_id
        FROM telesale_assignments a JOIN telesale_data d ON d.id = a.data_id
        WHERE a.assigned_date <= $1 AND a.call_status = 'invalid'`, [yesterday]);
    for (const a of invalidAssigns) {
        if ((a.invalid_count || 0) >= 2) {
            // Move to invalid numbers store
            await db.run('INSERT INTO telesale_invalid_numbers (data_id, phone, source_id, customer_name, company_name, invalid_count, last_reported_by) VALUES (?,?,?,?,?,?,?)',
                [a.data_id, a.phone, a.source_id, a.customer_name, a.company_name, a.invalid_count, a.user_id]);
            await db.run("UPDATE telesale_data SET status = 'invalid', updated_at = NOW() WHERE id = ?", [a.data_id]);
            invalidated++;
        } else {
            // Return to pool for one more try
            await db.run("UPDATE telesale_data SET status = 'available', updated_at = NOW() WHERE id = ?", [a.data_id]);
            recalled++;
        }
    }

    // 4. Unfreeze cold data that has passed cold_until
    const unfrozen = await db.run("UPDATE telesale_data SET status = 'available', cold_until = NULL, updated_at = NOW() WHERE status = 'cold' AND cold_until <= CURRENT_DATE");

    return { success: true, message: `Thu hồi: ${recalled} SĐT, ${invalidated} chuyển kho không tồn tại, ${unfrozen?.changes || 0} giải đông`, recalled, invalidated };
}

module.exports = telesaleRoutes;
module.exports.runTelesalePump = runTelesalePump;
module.exports.runTelesaleRecall = runTelesaleRecall;
