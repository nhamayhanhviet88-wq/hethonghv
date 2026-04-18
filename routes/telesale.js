// ========== TELESALE API ROUTES ==========
const db = require('../db/pool');

async function telesaleRoutes(fastify) {
    const { authenticate } = require('../middleware/auth');

    // ========== PERF: Stats cache (30s TTL) ==========
    const _statsCache = new Map();
    const _CACHE_TTL = 30000; // 30 seconds
    function _getCached(key) { const c = _statsCache.get(key); if (c && Date.now() - c.ts < _CACHE_TTL) return c.data; return null; }
    function _setCache(key, data) { _statsCache.set(key, { data, ts: Date.now() }); }
    // Invalidate cache on data mutations
    function _invalidateStatsCache() { _statsCache.clear(); }

    // ========== ROLE-BASED VISIBILITY ==========
    // Returns array of user IDs that the requesting user is allowed to view
    async function _getVisibleUserIds(user) {
        const role = user.role;
        // GĐ + QLCC: see everyone
        if (['giam_doc', 'quan_ly_cap_cao'].includes(role)) {
            const all = await db.all("SELECT id FROM users WHERE status = 'active'");
            return all.map(u => u.id);
        }
        // NV: only self
        if (role === 'nhan_vien') return [user.id];
        // Fetch department_id from DB (JWT doesn't include it)
        const dbUser = await db.get('SELECT department_id FROM users WHERE id = $1', [user.id]);
        const userDeptId = dbUser?.department_id;
        // QL/TP without department_id: QL sees all, TP sees self
        if (!userDeptId) {
            if (role === 'quan_ly') {
                const all = await db.all("SELECT id FROM users WHERE status = 'active'");
                return all.map(u => u.id);
            }
            return [user.id];
        }
        // QL: entire phòng (root dept + all descendants, including grandchildren)
        if (role === 'quan_ly') {
            // Find root dept: if user's dept has parent_id, use parent; else use dept itself
            const dept = await db.get('SELECT id, parent_id FROM departments WHERE id = $1', [userDeptId]);
            const rootDeptId = dept?.parent_id || userDeptId;
            // Get ALL descendants recursively (root → children → grandchildren)
            const allDescendants = await db.all(
                `WITH RECURSIVE dept_tree AS (
                    SELECT id FROM departments WHERE id = $1
                    UNION ALL
                    SELECT d.id FROM departments d INNER JOIN dept_tree dt ON d.parent_id = dt.id
                ) SELECT id FROM dept_tree`,
                [rootDeptId]
            );
            const deptIds = allDescendants.map(d => d.id);
            if (deptIds.length === 0) return [user.id];
            const placeholders = deptIds.map((_, i) => `$${i + 1}`).join(',');
            const users = await db.all(`SELECT id FROM users WHERE department_id IN (${placeholders}) AND status = 'active'`, deptIds);
            const ids = users.map(u => u.id);
            if (!ids.includes(user.id)) ids.push(user.id);
            return ids;
        }
        // TP: same team (same department_id)
        if (role === 'truong_phong') {
            const users = await db.all("SELECT id FROM users WHERE department_id = $1 AND status = 'active'", [userDeptId]);
            const ids = users.map(u => u.id);
            if (!ids.includes(user.id)) ids.push(user.id);
            return ids;
        }
        // Default: self only
        return [user.id];
    }

    // Check if requester can view target user
    async function _canViewUser(requester, targetUserId) {
        const ids = await _getVisibleUserIds(requester);
        return ids.includes(Number(targetUserId));
    }

    // ========== SALARY FILTER (hide salary info from employees) ==========
    const _SALARY_VISIBLE_ROLES = ['giam_doc', 'quan_ly_cap_cao'];
    function _filterSalaryLines(text) {
        if (!text) return text;
        return text.split('\n').filter(line => {
            const l = line.toLowerCase().replace(/[\s]+/g, ' ').trim();
            if (!l) return true; // keep empty lines
            // Keywords that indicate salary/income lines
            if (/l[uư][oơ]ng/.test(l)) return false; // lương, luong, lươn
            if (/thu nh[aậ]p/.test(l)) return false; // thu nhập, thu nhap
            if (/m[uứ]c l[uư][oơ]ng/.test(l)) return false; // mức lương
            if (/lcb/.test(l)) return false; // LCB (lương cơ bản)
            if (/bao ti[eề]n/.test(l)) return false; // bao tiền
            if (/\d+[.,]?\d*\s*(tri[eệ]u|tr)(?:\b|[/\s])/.test(l)) return false; // X triệu, X tr
            if (/\d{1,3}([.]\d{3}){1,}\s*(vn[dđ]|đ[oồ]ng|đ\b)/i.test(l)) return false; // X.XXX.XXX vnđ/đồng
            if (/\d{1,3}([.]\d{3}){2,}/.test(l) && /vn[dđ]|đ[oồ]ng|l[uư][oơ]ng|thu nh|tr\b|tri[eệ]u/.test(l)) return false; // combo number + salary keyword
            if (/\d+[.,]?\d*k\s*[\/]/.test(l)) return false; // 300k/, 52.000k/1h
            if (/\d+[.,]?\d*k\b/.test(l) && /th[uư][oởỏõóọả]?ng|t[aă]ng ca|ph[uụ]\s*c[aấ]p/.test(l)) return false; // Xk + thưởng/tăng ca/phụ cấp
            if (/\d{2,3}[.]\d{3}\s*[\/]\s*\d*\s*h/.test(l)) return false; // 45.000/1h, 60.000/h
            if (/\d{2,3}[.]\d{3}\s*[\/]\s*(gi[oờ]|ca|ng[aà]y|th[aá]ng)/.test(l)) return false; // 45.000/giờ, 45.000/ca
            if (/th[uư][oởỏõóọả]?ng/.test(l) && /\d+[.,]?\d*\s*k\b|\d+[.,]?\d*\s*(tri[eệ]u|tr\b|đ\b|vn[dđ])/.test(l)) return false; // thưởng + số tiền (500k, 2 triệu)
            if (/th[uư][oởỏõóọả]?ng/.test(l) && /(cu[oố]i n[aă]m|l[eễ]|t[eế]t|th[aá]ng\s*1[3-9]|kpi|doanh s[oố])/.test(l)) return false; // thưởng cuối năm, thưởng lễ Tết, thưởng KPI
            return true;
        }).join('\n');
    }

    // ========== SOURCES CRUD ==========
    fastify.get('/api/telesale/sources', { preHandler: authenticate }, async (req, reply) => {
        const { crm_type } = req.query;
        let sql = 'SELECT * FROM telesale_sources WHERE is_active = true';
        const params = [];
        if (crm_type) { sql += ' AND crm_type = ?'; params.push(crm_type); }
        sql += ' ORDER BY display_order, id';
        const sources = await db.all(sql, params);
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
        const { name, icon, crm_type, daily_quota, default_followup_days, display_order, column_mapping, skip_header, carrier_priority, distribution_mode } = req.body;
        await db.run(`UPDATE telesale_sources SET
            name = COALESCE(?, name), icon = COALESCE(?, icon), crm_type = COALESCE(?, crm_type),
            daily_quota = COALESCE(?, daily_quota), default_followup_days = COALESCE(?, default_followup_days),
            display_order = COALESCE(?, display_order),
            column_mapping = COALESCE(?::jsonb, column_mapping),
            skip_header = COALESCE(?, skip_header),
            carrier_priority = COALESCE(?::jsonb, carrier_priority),
            distribution_mode = COALESCE(?, distribution_mode)
            WHERE id = ?`, [name, icon, crm_type, daily_quota, default_followup_days, display_order, column_mapping ? JSON.stringify(column_mapping) : null, skip_header !== undefined ? skip_header : null, carrier_priority ? JSON.stringify(carrier_priority) : null, distribution_mode || null, req.params.id]);
        return { success: true, message: 'Đã cập nhật nguồn' };
    });

    // Sync quota for all sources in a CRM type
    fastify.put('/api/telesale/sources/sync-quota', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { crm_type, daily_quota } = req.body;
        if (!crm_type || daily_quota === undefined) return reply.code(400).send({ error: 'Cần crm_type và daily_quota' });
        const result = await db.run('UPDATE telesale_sources SET daily_quota = ? WHERE crm_type = ?', [parseInt(daily_quota), crm_type]);
        return { success: true, message: `Đã đồng bộ quota = ${daily_quota} cho tất cả nguồn`, updated: result?.changes || 0 };
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
        const { source_id, crm_type, status, search, carrier, page = 1, limit = 50, assigned_user_id } = req.query;
        let where = 'WHERE 1=1';
        const params = [];
        let paramIdx = 0;
        if (source_id) { paramIdx++; where += ` AND d.source_id = $${paramIdx}`; params.push(source_id); }
        else if (crm_type && crm_type !== 'all') { where += ` AND d.source_id IN (SELECT id FROM telesale_sources WHERE crm_type = '${crm_type.replace(/'/g, "''")}' AND is_active = true)`; }
        if (assigned_user_id) { paramIdx++; where += ` AND d.last_assigned_user_id = $${paramIdx}`; params.push(parseInt(assigned_user_id)); }
        // Special status filters that use telesale_assignments join
        const _specialStatuses = ['answered', 'transferred', 'cold_answered', 'ncc_answered', 'no_answer_busy', 'invalid'];
        if (status && _specialStatuses.includes(status)) {
            if (status === 'answered') {
                where += ` AND d.id IN (SELECT DISTINCT a2.data_id FROM telesale_assignments a2 WHERE a2.call_status = 'answered')`;
            } else if (status === 'transferred') {
                where += ` AND d.id IN (SELECT DISTINCT a2.data_id FROM telesale_assignments a2 JOIN telesale_answer_statuses ans2 ON ans2.id = a2.answer_status_id WHERE ans2.action_type = 'transfer')`;
            } else if (status === 'cold_answered') {
                where += ` AND d.id IN (SELECT DISTINCT a2.data_id FROM telesale_assignments a2 JOIN telesale_answer_statuses ans2 ON ans2.id = a2.answer_status_id WHERE ans2.action_type = 'cold')`;
            } else if (status === 'ncc_answered') {
                where += ` AND d.id IN (SELECT DISTINCT a2.data_id FROM telesale_assignments a2 JOIN telesale_answer_statuses ans2 ON ans2.id = a2.answer_status_id WHERE ans2.action_type = 'cold_ncc')`;
            } else if (status === 'no_answer_busy') {
                where += ` AND d.id IN (SELECT DISTINCT a2.data_id FROM telesale_assignments a2 WHERE a2.call_status IN ('no_answer','busy'))`;
            } else if (status === 'invalid') {
                where += ` AND d.id IN (SELECT DISTINCT a2.data_id FROM telesale_assignments a2 WHERE a2.call_status = 'invalid')`;            }
        } else if (status) {
            paramIdx++; where += ` AND d.status = $${paramIdx}`; params.push(status);
        }
        if (carrier) { paramIdx++; where += ` AND d.carrier ILIKE $${paramIdx}`; params.push(`%${carrier}%`); }
        if (search) { paramIdx++; where += ` AND (d.phone ILIKE $${paramIdx} OR d.customer_name ILIKE $${paramIdx} OR d.company_name ILIKE $${paramIdx})`; params.push(`%${search}%`); }

        const countRes = await db.get(`SELECT COUNT(*) as total FROM telesale_data d ${where}`, params);
        const offset = (parseInt(page) - 1) * parseInt(limit);
        paramIdx++; const limitParam = paramIdx;
        paramIdx++; const offsetParam = paramIdx;
        params.push(parseInt(limit), offset);

        const data = await db.all(`SELECT d.*, s.name as source_name, s.icon as source_icon,
            u.full_name as last_assigned_user_name,
            la.call_status as last_call_status, la.answer_action_type, la.answer_status_name
            FROM telesale_data d
            LEFT JOIN telesale_sources s ON s.id = d.source_id
            LEFT JOIN users u ON u.id = d.last_assigned_user_id
            LEFT JOIN LATERAL (
                SELECT a.call_status, ans.action_type as answer_action_type, ans.name as answer_status_name
                FROM telesale_assignments a
                LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
                WHERE a.data_id = d.id
                ORDER BY a.assigned_date DESC, a.id DESC LIMIT 1
            ) la ON true
            ${where} ORDER BY d.updated_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`, params);
        // Filter salary info for non-director roles
        if (!_SALARY_VISIBLE_ROLES.includes(req.user.role)) {
            data.forEach(d => { d.post_content = _filterSalaryLines(d.post_content); });
        }
        return { data, total: countRes.total, page: parseInt(page), limit: parseInt(limit) };
    });

    fastify.get('/api/telesale/data/stats', { preHandler: authenticate }, async (req, reply) => {
        const { crm_type, source_id, date_from, date_to, assigned_user_id } = req.query;
        const hasDateFilter = date_from && date_to;
        const cacheKey = 'stats_' + (crm_type||'all') + '_' + (source_id||'all') + '_' + (date_from||'') + '_' + (date_to||'') + '_u' + (assigned_user_id||'');
        if (!hasDateFilter && !assigned_user_id) { const cached = _getCached(cacheKey); if (cached) return cached; }

        let crmFilter = '';
        const params = [];
        let paramIdx = 0;
        if (crm_type) { paramIdx++; crmFilter = ` AND s.crm_type = $${paramIdx}`; params.push(crm_type); }
        let userFilter = '';
        if (assigned_user_id) { paramIdx++; userFilter = ` AND d.last_assigned_user_id = $${paramIdx}`; params.push(parseInt(assigned_user_id)); }

        // Base stats (available always total, no date filter)
        const stats = await db.all(`SELECT s.id, s.name, s.icon, s.daily_quota,
            COUNT(d.id) FILTER (WHERE true) as total,
            COUNT(d.id) FILTER (WHERE d.status = 'available') as available,
            COUNT(d.id) FILTER (WHERE d.status = 'assigned') as assigned_current,
            COUNT(d.id) FILTER (WHERE d.status = 'cold') as cold
            FROM telesale_sources s
            LEFT JOIN telesale_data d ON d.source_id = s.id${userFilter.replace('d.last_assigned_user_id', 'd.last_assigned_user_id')}
            WHERE s.is_active = true${crmFilter}
            GROUP BY s.id, s.name, s.icon, s.daily_quota
            ORDER BY s.display_order`, params);

        // Date-filtered stats from telesale_assignments
        const _buildDateStats = async (df, dt) => {
            const srcIds = stats.map(s => s.id);
            if (srcIds.length === 0) return {};
            const dateCondAssigned = df && dt ? ` AND a.assigned_date BETWEEN '${df}' AND '${dt}'` : '';
            const dateCondCalled = df && dt ? ` AND a.called_at >= '${df}'::date AND a.called_at < ('${dt}'::date + INTERVAL '1 day')` : '';

            const userCondAssignment = assigned_user_id ? ` AND a.user_id = ${parseInt(assigned_user_id)}` : '';

            const rows = await db.all(`
                SELECT d.source_id,
                    COUNT(DISTINCT a.data_id) FILTER (WHERE true) as assigned,
                    COUNT(DISTINCT a.data_id) FILTER (WHERE a.call_status = 'answered') as answered,
                    COUNT(DISTINCT a.data_id) FILTER (WHERE ans.action_type = 'transfer') as transferred,
                    COUNT(DISTINCT a.data_id) FILTER (WHERE ans.action_type = 'cold') as cold_answered,
                    COUNT(DISTINCT a.data_id) FILTER (WHERE ans.action_type = 'cold_ncc') as ncc_answered,
                    COUNT(DISTINCT a.data_id) FILTER (WHERE a.call_status IN ('no_answer','busy')) as no_answer_busy,
                    COUNT(DISTINCT a.data_id) FILTER (WHERE a.call_status = 'invalid') as invalid
                FROM telesale_assignments a
                JOIN telesale_data d ON d.id = a.data_id
                LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
                WHERE d.source_id IN (${srcIds.map((_, i) => '$' + (i + 1)).join(',')})
                ${userCondAssignment}
                ${dateCondAssigned || dateCondCalled ? `AND (
                    (a.assigned_date IS NOT NULL${dateCondAssigned})
                    OR (a.called_at IS NOT NULL${dateCondCalled})
                )` : ''}
                GROUP BY d.source_id
            `, srcIds);

            // If we have date filter, re-query with proper separation
            if (df && dt) {
                const assignedRows = await db.all(`
                    SELECT d.source_id, COUNT(DISTINCT a.data_id) as cnt
                    FROM telesale_assignments a
                    JOIN telesale_data d ON d.id = a.data_id
                    WHERE d.source_id IN (${srcIds.map((_, i) => '$' + (i + 1)).join(',')})
                    AND a.assigned_date BETWEEN '${df}' AND '${dt}'
                    ${userCondAssignment}
                    GROUP BY d.source_id
                `, srcIds);
                
                const calledRows = await db.all(`
                    SELECT d.source_id,
                        COUNT(DISTINCT a.data_id) FILTER (WHERE a.call_status = 'answered') as answered,
                        COUNT(DISTINCT a.data_id) FILTER (WHERE ans.action_type = 'transfer') as transferred,
                        COUNT(DISTINCT a.data_id) FILTER (WHERE ans.action_type = 'cold') as cold_answered,
                        COUNT(DISTINCT a.data_id) FILTER (WHERE ans.action_type = 'cold_ncc') as ncc_answered,
                        COUNT(DISTINCT a.data_id) FILTER (WHERE a.call_status IN ('no_answer','busy')) as no_answer_busy,
                        COUNT(DISTINCT a.data_id) FILTER (WHERE a.call_status = 'invalid') as invalid
                    FROM telesale_assignments a
                    JOIN telesale_data d ON d.id = a.data_id
                    LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
                    WHERE d.source_id IN (${srcIds.map((_, i) => '$' + (i + 1)).join(',')})
                    AND a.called_at >= '${df}'::date AND a.called_at < ('${dt}'::date + INTERVAL '1 day')
                    ${userCondAssignment}
                    GROUP BY d.source_id
                `, srcIds);

                const map = {};
                for (const r of assignedRows) map[r.source_id] = { ...(map[r.source_id] || {}), assigned: parseInt(r.cnt) };
                for (const r of calledRows) {
                    map[r.source_id] = {
                        ...(map[r.source_id] || {}),
                        answered: parseInt(r.answered), transferred: parseInt(r.transferred),
                        cold_answered: parseInt(r.cold_answered), ncc_answered: parseInt(r.ncc_answered),
                        no_answer_busy: parseInt(r.no_answer_busy), invalid: parseInt(r.invalid||0)
                    };
                }
                return map;
            }

            // No date filter — use combined rows
            const map = {};
            for (const r of rows) {
                map[r.source_id] = {
                    assigned: parseInt(r.assigned), answered: parseInt(r.answered),
                    transferred: parseInt(r.transferred), cold_answered: parseInt(r.cold_answered),
                    ncc_answered: parseInt(r.ncc_answered), no_answer_busy: parseInt(r.no_answer_busy),
                    invalid: parseInt(r.invalid||0)
                };
            }
            return map;
        };

        // Current period stats
        const dateStats = await _buildDateStats(date_from, date_to);
        // Merge into stats
        for (const s of stats) {
            const ds = dateStats[s.id] || {};
            if (hasDateFilter) {
                s.assigned = parseInt(s.assigned_current) || 0;
                s.answered = ds.answered || 0;
                s.transferred = ds.transferred || 0;
                s.cold_answered = ds.cold_answered || 0;
                s.ncc_answered = ds.ncc_answered || 0;
                s.no_answer_busy = ds.no_answer_busy || 0;
                s.invalid = ds.invalid || 0;
            } else {
                // Original queries for non-date mode (backward compat)
                const ds2 = dateStats[s.id] || {};
                s.assigned = parseInt(s.assigned_current) || 0;
                s.answered = ds2.answered || 0;
                s.transferred = ds2.transferred || 0;
                s.cold_answered = ds2.cold_answered || 0;
                s.ncc_answered = ds2.ncc_answered || 0;
                s.no_answer_busy = ds2.no_answer_busy || 0;
                s.invalid = ds2.invalid || 0;
            }
        }

        // Comparison: previous period stats
        let prevStats = null;
        if (hasDateFilter) {
            const df = new Date(date_from), dt = new Date(date_to);
            const diffDays = Math.round((dt - df) / 86400000) + 1;
            const prevTo = new Date(df); prevTo.setDate(prevTo.getDate() - 1);
            const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - diffDays + 1);
            const pf = prevFrom.toISOString().split('T')[0], pt = prevTo.toISOString().split('T')[0];
            const prevDateStats = await _buildDateStats(pf, pt);
            prevStats = {};
            for (const s of stats) {
                prevStats[s.id] = prevDateStats[s.id] || { assigned: 0, answered: 0, transferred: 0, cold_answered: 0, ncc_answered: 0, no_answer_busy: 0 };
            }
        }

        // Carrier stats (unchanged)
        let carrierFilter = '';
        const carrierParams = [];
        if (source_id) {
            carrierFilter = ' WHERE d.source_id = $1';
            carrierParams.push(source_id);
        } else if (crm_type) {
            carrierFilter = ' WHERE d.source_id IN (SELECT id FROM telesale_sources WHERE crm_type = $1)';
            carrierParams.push(crm_type);
        }
        const carrierRows = await db.all(
            `SELECT UNNEST(STRING_TO_ARRAY(d.carrier, '|')) as c, COUNT(*) as cnt
             FROM telesale_data d${carrierFilter}
             GROUP BY c ORDER BY cnt DESC`, carrierParams);
        const carrierStats = {};
        for (const r of carrierRows) {
            const key = (r.c || '').trim();
            if (key) carrierStats[key] = (carrierStats[key] || 0) + parseInt(r.cnt);
        }

        // Per-source carrier breakdown
        let sourceCarrierStats = {};
        if (!source_id && crm_type) {
            const perSrcRows = await db.all(
                `SELECT d.source_id, UNNEST(STRING_TO_ARRAY(d.carrier, '|')) as c, COUNT(*) as cnt
                 FROM telesale_data d
                 WHERE d.source_id IN (SELECT id FROM telesale_sources WHERE crm_type = $1)
                 AND d.status = 'available'
                 GROUP BY d.source_id, c ORDER BY d.source_id, cnt DESC`, [crm_type]);
            for (const r of perSrcRows) {
                const key = (r.c || '').trim();
                if (!key) continue;
                if (!sourceCarrierStats[r.source_id]) sourceCarrierStats[r.source_id] = {};
                sourceCarrierStats[r.source_id][key] = (sourceCarrierStats[r.source_id][key] || 0) + parseInt(r.cnt);
            }
        }

        const result = { stats, carrierStats, sourceCarrierStats, prevStats };
        if (!hasDateFilter && !assigned_user_id) _setCache(cacheKey, result);
        return result;
    });

    // Single data record detail with assignment history
    fastify.get('/api/telesale/data/:id', { preHandler: authenticate }, async (req, reply) => {
        const data = await db.get(`SELECT d.*, s.name as source_name, s.icon as source_icon,
            u.full_name as last_assigned_user_name,
            la.call_status as last_call_status, la.answer_action_type, la.answer_status_name
            FROM telesale_data d
            LEFT JOIN telesale_sources s ON s.id = d.source_id
            LEFT JOIN users u ON u.id = d.last_assigned_user_id
            LEFT JOIN LATERAL (
                SELECT a.call_status, ans.action_type as answer_action_type, ans.name as answer_status_name
                FROM telesale_assignments a
                LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
                WHERE a.data_id = d.id
                ORDER BY a.assigned_date DESC, a.id DESC LIMIT 1
            ) la ON true
            WHERE d.id = $1`, [req.params.id]);
        if (!data) return reply.code(404).send({ success: false, error: 'Không tìm thấy data' });
        // Get full assignment history
        const assignments = await db.all(`SELECT a.*, u.full_name as user_name,
            ans.name as answer_status_name, ans.action_type as answer_action_type
            FROM telesale_assignments a
            LEFT JOIN users u ON u.id = a.user_id
            LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
            WHERE a.data_id = $1
            ORDER BY a.assigned_date DESC, a.created_at DESC`, [req.params.id]);
        // Filter salary info for non-director roles
        if (!_SALARY_VISIBLE_ROLES.includes(req.user.role)) {
            data.post_content = _filterSalaryLines(data.post_content);
        }
        return { success: true, data, assignments };
    });
    fastify.post('/api/telesale/data', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { source_id, company_name, group_name, post_link, post_content, customer_name, phone, address } = req.body;
        if (!source_id || !phone) return reply.code(400).send({ error: 'Nguồn và SĐT là bắt buộc' });
        // Check duplicate phone GLOBALLY (across all sources/CRM)
        const exists = await db.get(`SELECT d.id, s.name as source_name FROM telesale_data d 
            LEFT JOIN telesale_sources s ON s.id = d.source_id WHERE d.phone = ?`, [phone]);
        if (exists) return reply.code(400).send({ error: `SĐT đã tồn tại trong nguồn "${exists.source_name || 'Không rõ'}"` });
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

        // 1. Get ALL existing phones globally (cross-CRM dedup)
        const existingRows = await db.all('SELECT phone FROM telesale_data WHERE phone IS NOT NULL AND phone != \'\'');
        const existingPhones = new Set(existingRows.map(r => r.phone));

        // 2. Normalize ALL phones first, then filter duplicates using processed phone
        const newRows = [];
        const seenPhones = new Set();
        let invalidCount = 0;
        for (const row of rows) {
            const rawPhone = (row.phone || '').toString().trim();
            if (!rawPhone) continue;
            const processed = _processPhone(rawPhone);
            if (processed.isInvalid) { invalidCount++; continue; }
            const normalizedPhone = processed.phone;
            // Check duplicate against NORMALIZED phone (matches DB format)
            if (existingPhones.has(normalizedPhone) || seenPhones.has(normalizedPhone)) continue;
            seenPhones.add(normalizedPhone);
            const clean = v => (v || '').toString().replace(/\x00/g, '').trim();
            newRows.push({
                company_name: clean(row.company_name), group_name: clean(row.group_name),
                post_link: clean(row.post_link), post_content: clean(row.post_content),
                customer_name: clean(row.customer_name), phone: normalizedPhone,
                address: clean(row.address), extra_data: JSON.stringify(row.extra || {}),
                carrier: processed.carrier
            });
        }
        const skipped = rows.length - newRows.length - invalidCount;

        // 3. Batch INSERT in chunks of 500
        const BATCH_SIZE = 500;
        let inserted = 0;

        for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
            const chunk = newRows.slice(i, i + BATCH_SIZE);
            const values = [];
            const placeholders = [];
            for (const row of chunk) {
                placeholders.push('(?,?,?,?,?,?,?,?,?,?,?)');
                values.push(source_id, row.company_name, row.group_name, row.post_link, row.post_content, row.customer_name, row.phone, row.address, row.extra_data, row.carrier, 'available');
            }
            await db.run(`INSERT INTO telesale_data (source_id, company_name, group_name, post_link, post_content, customer_name, phone, address, extra_data, carrier, status) VALUES ${placeholders.join(',')}`, values);
            inserted += chunk.length;
        }
        return { success: true, message: `Import: ${inserted} mới, ${invalidCount} SĐT không hợp lệ (đã loại), ${skipped} trùng`, inserted, skipped, invalidCount };
    });

    fastify.delete('/api/telesale/data/:id', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        await db.run('DELETE FROM telesale_assignments WHERE data_id = ?', [req.params.id]);
        await db.run('DELETE FROM telesale_data WHERE id = ?', [req.params.id]);
        return { success: true, message: 'Đã xóa data' };
    });

    // Bulk delete all data in a source
    fastify.delete('/api/telesale/data/source/:sourceId', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const sourceId = req.params.sourceId;
        await db.run('DELETE FROM telesale_assignments WHERE data_id IN (SELECT id FROM telesale_data WHERE source_id = ?)', [sourceId]);
        const result = await db.run('DELETE FROM telesale_data WHERE source_id = ?', [sourceId]);
        return { success: true, message: `Đã xóa ${result.rowCount || 0} data`, deleted: result.rowCount || 0 };
    });

    // 63 tỉnh/thành phố Việt Nam + viết tắt → tên chuẩn
    const _PROVINCE_MAP = {
        'Hà Nội': 'Hà Nội', 'HN': 'Hà Nội', 'Ha Noi': 'Hà Nội', 'Hanoi': 'Hà Nội',
        'Hồ Chí Minh': 'Hồ Chí Minh', 'HCM': 'Hồ Chí Minh', 'TP.HCM': 'Hồ Chí Minh', 'TPHCM': 'Hồ Chí Minh', 'TP HCM': 'Hồ Chí Minh', 'Tp.HCM': 'Hồ Chí Minh', 'Tp HCM': 'Hồ Chí Minh', 'Sài Gòn': 'Hồ Chí Minh', 'SG': 'Hồ Chí Minh', 'Saigon': 'Hồ Chí Minh', 'Ho Chi Minh': 'Hồ Chí Minh',
        'Đà Nẵng': 'Đà Nẵng', 'Da Nang': 'Đà Nẵng', 'Hải Phòng': 'Hải Phòng', 'Hai Phong': 'Hải Phòng',
        'Cần Thơ': 'Cần Thơ', 'Can Tho': 'Cần Thơ',
        'Hà Giang': 'Hà Giang', 'Cao Bằng': 'Cao Bằng', 'Bắc Kạn': 'Bắc Kạn', 'Tuyên Quang': 'Tuyên Quang',
        'Lào Cai': 'Lào Cai', 'Điện Biên': 'Điện Biên', 'Lai Châu': 'Lai Châu', 'Sơn La': 'Sơn La',
        'Yên Bái': 'Yên Bái', 'Hòa Bình': 'Hòa Bình', 'Thái Nguyên': 'Thái Nguyên',
        'Lạng Sơn': 'Lạng Sơn', 'Quảng Ninh': 'Quảng Ninh', 'Bắc Giang': 'Bắc Giang', 'Phú Thọ': 'Phú Thọ',
        'Vĩnh Phúc': 'Vĩnh Phúc', 'Bắc Ninh': 'Bắc Ninh', 'Hải Dương': 'Hải Dương', 'Hưng Yên': 'Hưng Yên',
        'Thái Bình': 'Thái Bình', 'Hà Nam': 'Hà Nam', 'Nam Định': 'Nam Định', 'Ninh Bình': 'Ninh Bình',
        'Thanh Hóa': 'Thanh Hóa', 'Nghệ An': 'Nghệ An', 'Hà Tĩnh': 'Hà Tĩnh', 'Quảng Bình': 'Quảng Bình',
        'Quảng Trị': 'Quảng Trị', 'Thừa Thiên Huế': 'Thừa Thiên Huế', 'Huế': 'Thừa Thiên Huế',
        'Quảng Nam': 'Quảng Nam', 'Quảng Ngãi': 'Quảng Ngãi', 'Bình Định': 'Bình Định',
        'Phú Yên': 'Phú Yên', 'Khánh Hòa': 'Khánh Hòa', 'Nha Trang': 'Khánh Hòa',
        'Ninh Thuận': 'Ninh Thuận', 'Bình Thuận': 'Bình Thuận',
        'Kon Tum': 'Kon Tum', 'Gia Lai': 'Gia Lai', 'Đắk Lắk': 'Đắk Lắk', 'Đắk Nông': 'Đắk Nông',
        'Lâm Đồng': 'Lâm Đồng', 'Đà Lạt': 'Lâm Đồng',
        'Bình Phước': 'Bình Phước', 'Tây Ninh': 'Tây Ninh', 'Bình Dương': 'Bình Dương',
        'Đồng Nai': 'Đồng Nai', 'Biên Hòa': 'Đồng Nai',
        'Bà Rịa - Vũng Tàu': 'Bà Rịa - Vũng Tàu', 'Bà Rịa': 'Bà Rịa - Vũng Tàu', 'Vũng Tàu': 'Bà Rịa - Vũng Tàu',
        'Long An': 'Long An', 'Tiền Giang': 'Tiền Giang', 'Bến Tre': 'Bến Tre', 'Trà Vinh': 'Trà Vinh',
        'Vĩnh Long': 'Vĩnh Long', 'Đồng Tháp': 'Đồng Tháp', 'An Giang': 'An Giang',
        'Kiên Giang': 'Kiên Giang', 'Phú Quốc': 'Kiên Giang',
        'Hậu Giang': 'Hậu Giang', 'Sóc Trăng': 'Sóc Trăng', 'Bạc Liêu': 'Bạc Liêu', 'Cà Mau': 'Cà Mau',
    };
    const _PROVINCE_KEYS = Object.keys(_PROVINCE_MAP).sort((a, b) => b.length - a.length);

    // Load 686 quận/huyện from JSON file → { "Cầu Giấy": "Hà Nội", ... }
    const _DISTRICT_MAP = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'data', 'districts.json'), 'utf8'));
    const _DISTRICT_KEYS = Object.keys(_DISTRICT_MAP).sort((a, b) => b.length - a.length);

    function _extractAddress(text) {
        if (!text) return '';
        
        // Step 1: Find province
        let province = '';
        for (const key of _PROVINCE_KEYS) {
            if (key.length <= 3) {
                const regex = new RegExp(`(?:^|[\\s,.:;\\-\\/])${key.replace(/\./g, '\\.')}(?=$|[\\s,.:;\\-\\/])`, 'i');
                if (regex.test(text)) { province = _PROVINCE_MAP[key]; break; }
            } else {
                if (text.includes(key)) { province = _PROVINCE_MAP[key]; break; }
            }
        }
        
        // Step 2: Find district
        let district = '';
        let distProvince = '';
        for (const key of _DISTRICT_KEYS) {
            if (key.length <= 3) {
                // Skip very short district names to avoid false positives
                continue;
            }
            if (text.includes(key)) {
                district = key;
                distProvince = _DISTRICT_MAP[key];
                break;
            }
        }
        
        // Step 3: Build result
        if (district && province) {
            // Both found — use district + province (prefer province from province map)
            if (distProvince === province) {
                return `${district}, ${province}`;
            } else {
                // District and province don't match, show both independently
                return `${district}, ${distProvince}`;
            }
        } else if (district) {
            // Only district found — auto-map to province
            return `${district}, ${distProvince}`;
        } else if (province) {
            // Only province found
            return province;
        }
        return '';
    }

    // Vietnamese mobile carrier detection + phone validation
    const _CARRIER_PREFIXES = {
        // Viettel
        '032': 'Viettel', '033': 'Viettel', '034': 'Viettel', '035': 'Viettel',
        '036': 'Viettel', '037': 'Viettel', '038': 'Viettel', '039': 'Viettel',
        '086': 'Viettel', '096': 'Viettel', '097': 'Viettel', '098': 'Viettel',
        // Mobifone
        '070': 'Mobi', '076': 'Mobi', '077': 'Mobi', '078': 'Mobi', '079': 'Mobi',
        '089': 'Mobi', '090': 'Mobi', '093': 'Mobi',
        // Vinaphone
        '081': 'Vina', '082': 'Vina', '083': 'Vina', '084': 'Vina', '085': 'Vina',
        '088': 'Vina', '091': 'Vina', '094': 'Vina',
        // Vietnamobile
        '052': 'Vnmb', '056': 'Vnmb', '058': 'Vnmb', '092': 'Vnmb',
        // Gmobile
        '059': 'Gmob', '099': 'Gmob',
        // iTel (Itelecom)
        '087': 'iTel',
        // Reddi Mobile
        '055': 'Reddi',
    };

    function _normalizePhone(phone) {
        if (!phone) return '';
        let cleaned = phone.toString().replace(/[\s\-\.]/g, '');
        // Normalize +84 / 84 prefix → 0
        if (cleaned.startsWith('+84')) cleaned = '0' + cleaned.slice(3);
        else if (cleaned.startsWith('84') && cleaned.length === 11) cleaned = '0' + cleaned.slice(2);
        return cleaned;
    }

    function _detectCarrier(phone) {
        const cleaned = _normalizePhone(phone);
        if (!cleaned) return 'invalid';
        // Must be exactly 10 digits starting with 0
        if (!/^0\d{9}$/.test(cleaned)) return 'invalid';
        const prefix = cleaned.substring(0, 3);
        return _CARRIER_PREFIXES[prefix] || 'invalid';
    }

    // Process phone field that may contain multiple numbers separated by |
    // Returns { phone: "cleaned1|cleaned2", carrier: "Viettel|Mobi", isInvalid: false }
    function _processPhone(rawPhone) {
        if (!rawPhone) return { phone: '', carrier: 'invalid', isInvalid: true };
        const raw = rawPhone.toString().trim();
        
        // Split by | and clean each number
        const parts = raw.split('|').map(p => p.replace(/[\s\-\.]/g, '').trim()).filter(Boolean);
        
        if (parts.length <= 1) {
            // Single number — normalize + detect
            const normalized = _normalizePhone(raw);
            const c = _detectCarrier(raw);
            return { phone: normalized || raw, carrier: c, isInvalid: c === 'invalid' };
        }
        
        // Multiple numbers — validate each, keep max 3 valid mobile numbers
        const validPhones = [];
        for (const p of parts) {
            const c = _detectCarrier(p);
            if (c !== 'invalid' && validPhones.length < 3) {
                validPhones.push({ phone: _normalizePhone(p), carrier: c });
            }
        }
        
        if (validPhones.length === 0) {
            return { phone: raw, carrier: 'invalid', isInvalid: true };
        }
        
        return {
            phone: validPhones.map(v => v.phone).join('|'),
            carrier: validPhones.map(v => v.carrier).join('|'),
            isInvalid: false
        };
    }

    // Backfill addresses server-side (all-in-one)
    fastify.post('/api/telesale/data/backfill-address', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        
        // Reset old wrong addresses first, then re-extract all
        await db.run(`UPDATE telesale_data SET address = '' WHERE address IS NOT NULL AND address != ''`);
        
        const data = await db.all(`SELECT id, post_content FROM telesale_data WHERE post_content IS NOT NULL AND post_content != '' LIMIT 50000`);
        
        if (!data || data.length === 0) return { success: true, total: 0, extracted: 0, message: 'Không có data!' };
        
        let extracted = 0;
        const updates = [];
        for (const row of data) {
            const addr = _extractAddress(row.post_content);
            if (addr) {
                updates.push({ id: row.id, address: addr });
                extracted++;
            }
        }
        
        // Batch update
        for (const u of updates) {
            await db.run('UPDATE telesale_data SET address = $1 WHERE id = $2', [u.address, u.id]);
        }
        
        return { success: true, total: data.length, extracted, updated: updates.length, message: `Trích xuất: ${extracted}/${data.length}, cập nhật: ${updates.length}` };
    });

    // Sync all columns: company_name, address, carrier
    fastify.post('/api/telesale/data/sync-all', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        
        const results = { companyUpdated: 0, addressExtracted: 0, addressTotal: 0, carrierUpdated: 0, invalidMarked: 0 };
        
        // Step 1: Copy group_name → company_name where company_name is empty
        const companyResult = await db.run(`UPDATE telesale_data SET company_name = group_name WHERE (company_name IS NULL OR company_name = '') AND group_name IS NOT NULL AND group_name != ''`);
        results.companyUpdated = companyResult.rowCount || 0;
        
        // Step 2: Re-extract addresses for records missing address
        const data = await db.all(`SELECT id, post_content FROM telesale_data WHERE (address IS NULL OR address = '') AND post_content IS NOT NULL AND post_content != '' LIMIT 50000`);
        results.addressTotal = data.length;
        const addrUpdates = [];
        for (const row of data) {
            const addr = _extractAddress(row.post_content);
            if (addr) { addrUpdates.push({ id: row.id, address: addr }); results.addressExtracted++; }
        }
        for (const u of addrUpdates) {
            await db.run('UPDATE telesale_data SET address = $1 WHERE id = $2', [u.address, u.id]);
        }
        
        // Step 3: Process ALL phones (handle | separated, detect carrier, clean phone)
        const phones = await db.all(`SELECT id, phone, status FROM telesale_data LIMIT 200000`);
        const carrierUpdates = [];
        for (const row of phones) {
            const processed = _processPhone(row.phone);
            const changed = processed.phone !== row.phone || processed.carrier !== row.carrier;
            if (changed || !row.carrier) {
                carrierUpdates.push({ id: row.id, phone: processed.phone, carrier: processed.carrier, isInvalid: processed.isInvalid, oldStatus: row.status });
                results.carrierUpdated++;
                if (processed.isInvalid && row.status !== 'invalid') results.invalidMarked++;
            }
        }
        // Batch update
        for (let i = 0; i < carrierUpdates.length; i += 500) {
            const chunk = carrierUpdates.slice(i, i + 500);
            for (const u of chunk) {
                if (u.isInvalid) {
                    await db.run('UPDATE telesale_data SET phone = $1, carrier = $2, status = $3 WHERE id = $4', [u.phone, u.carrier, 'invalid', u.id]);
                } else {
                    // If was invalid before, set back to available
                    const newStatus = u.oldStatus === 'invalid' ? 'available' : u.oldStatus;
                    await db.run('UPDATE telesale_data SET phone = $1, carrier = $2, status = $3 WHERE id = $4', [u.phone, u.carrier, newStatus || 'available', u.id]);
                }
            }
        }
        
        return { success: true, ...results, message: `CT: ${results.companyUpdated} | Địa chỉ: ${results.addressExtracted} | Nhà mạng: ${results.carrierUpdated} | SĐT sai: ${results.invalidMarked}` };
    });

    // ========== DEDUP GLOBAL: remove duplicate phones across ALL sources/CRM ==========
    fastify.post('/api/telesale/data/dedup-crm', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });

        // Find ALL duplicate phones globally
        const dupes = await db.all(`SELECT phone, COUNT(*) as cnt FROM telesale_data 
            WHERE phone IS NOT NULL AND phone != '' GROUP BY phone HAVING COUNT(*) > 1`);
        if (dupes.length === 0) return { success: true, deleted: 0, message: 'Không có SĐT trùng' };

        const deleteIds = [];
        for (const dupe of dupes) {
            const records = await db.all(`SELECT d.id,
                (SELECT COUNT(*) FROM telesale_assignments a WHERE a.data_id = d.id) as assign_count,
                (SELECT COUNT(*) FROM telesale_assignments a WHERE a.data_id = d.id AND a.call_status = 'answered') as answered_count,
                (SELECT COUNT(*) FROM telesale_assignments a 
                 JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id 
                 WHERE a.data_id = d.id AND ans.action_type = 'transfer') as transfer_count
                FROM telesale_data d WHERE d.phone = $1 ORDER BY d.id ASC`, [dupe.phone]);
            // Priority: transfer > answered > assignment > oldest
            records.sort((a, b) => {
                if (b.transfer_count !== a.transfer_count) return b.transfer_count - a.transfer_count;
                if (b.answered_count !== a.answered_count) return b.answered_count - a.answered_count;
                if (b.assign_count !== a.assign_count) return b.assign_count - a.assign_count;
                return a.id - b.id;
            });
            for (let i = 1; i < records.length; i++) deleteIds.push(records[i].id);
        }

        // Batch delete
        const BATCH = 500;
        for (let i = 0; i < deleteIds.length; i += BATCH) {
            const chunk = deleteIds.slice(i, i + BATCH);
            await db.run(`DELETE FROM telesale_assignments WHERE data_id IN (${chunk.map((_, j) => '$' + (j + 1)).join(',')})`, chunk);
            await db.run(`DELETE FROM telesale_data WHERE id IN (${chunk.map((_, j) => '$' + (j + 1)).join(',')})`, chunk);
        }

        return { 
            success: true, deleted: deleteIds.length, 
            message: `Đã xóa ${deleteIds.length} SĐT trùng toàn hệ thống (giữ bản có lịch sử gọi)` 
        };
    });
    // ========== DELETE ALL DATA for a source ==========
    fastify.post('/api/telesale/data/delete-all', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc mới được xóa toàn bộ' });
        const { source_id } = req.body;
        if (!source_id) return reply.code(400).send({ error: 'Cần source_id' });

        const src = await db.get('SELECT id, name FROM telesale_sources WHERE id = ?', [source_id]);
        if (!src) return reply.code(404).send({ error: 'Nguồn không tồn tại' });

        // Delete assignments first
        await db.run('DELETE FROM telesale_assignments WHERE data_id IN (SELECT id FROM telesale_data WHERE source_id = $1)', [source_id]);
        // Count then delete data
        const before = await db.get('SELECT COUNT(*) as c FROM telesale_data WHERE source_id = $1', [source_id]);
        await db.run('DELETE FROM telesale_data WHERE source_id = $1', [source_id]);

        return { success: true, deleted: before.c, message: `Đã xóa toàn bộ ${Number(before.c).toLocaleString()} bản ghi trong nguồn "${src.name}"` };
    });

    // ========== ACTIVE MEMBERS ==========
    fastify.get('/api/telesale/active-members', { preHandler: authenticate }, async (req, reply) => {
        const { crm_type } = req.query;
        let crmFilter = '';
        const params = [];
        if (crm_type) { crmFilter = ' AND tam.crm_type = $1'; params.push(crm_type); }
        const members = await db.all(`SELECT tam.*, u.full_name, u.username, u.role, u.department_id,
            d.name as dept_name, d.parent_id as dept_parent_id
            FROM telesale_active_members tam
            JOIN users u ON u.id = tam.user_id
            LEFT JOIN departments d ON d.id = u.department_id
            WHERE u.status = 'active'${crmFilter}
            ORDER BY u.full_name`, params);
        return { members };
    });

    fastify.post('/api/telesale/active-members', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { user_id, daily_quota, crm_type } = req.body;
        if (!user_id) return reply.code(400).send({ error: 'user_id là bắt buộc' });
        const crmVal = crm_type || 'tu_tim_kiem';
        const existing = await db.get('SELECT id FROM telesale_active_members WHERE user_id = ? AND crm_type = ?', [user_id, crmVal]);
        if (existing) {
            await db.run('UPDATE telesale_active_members SET is_active = true WHERE user_id = ? AND crm_type = ?', [user_id, crmVal]);
        } else {
            // Mặc định: daily_quota = NULL → nhận đủ Source quota
            await db.run('INSERT INTO telesale_active_members (user_id, crm_type, daily_quota) VALUES (?,?,?)',
                [user_id, crmVal, null]);
        }
        return { success: true, message: 'Đã thêm NV vào Telesale' };
    });

    fastify.put('/api/telesale/active-members/:userId', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { daily_quota, is_active, crm_type, set_default } = req.body;
        const crmVal = crm_type || 'tu_tim_kiem';
        if (set_default) {
            // Đặt về mặc định: daily_quota = NULL
            await db.run('UPDATE telesale_active_members SET daily_quota = NULL, is_active = COALESCE(?,is_active) WHERE user_id = ? AND crm_type = ?',
                [is_active, req.params.userId, crmVal]);
        } else {
            await db.run('UPDATE telesale_active_members SET daily_quota = COALESCE(?,daily_quota), is_active = COALESCE(?,is_active) WHERE user_id = ? AND crm_type = ?',
                [daily_quota, is_active, req.params.userId, crmVal]);
        }
        return { success: true, message: 'Đã cập nhật' };
    });

    fastify.post('/api/telesale/active-members/sync-quota', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { user_ids, daily_quota, crm_type } = req.body;
        const crmVal = crm_type || 'tu_tim_kiem';
        if (!user_ids || !Array.isArray(user_ids) || !daily_quota) return reply.code(400).send({ error: 'Cần user_ids[] và daily_quota' });
        for (const uid of user_ids) {
            await db.run('UPDATE telesale_active_members SET daily_quota = ? WHERE user_id = ? AND crm_type = ?', [daily_quota, uid, crmVal]);
        }
        return { success: true, message: `Đã đồng bộ ${user_ids.length} NV → ${daily_quota} số/ngày` };
    });

    // Đặt tất cả NV về chế độ Mặc định (daily_quota = NULL)
    fastify.post('/api/telesale/active-members/set-default-all', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { crm_type } = req.body;
        const crmVal = crm_type || 'tu_tim_kiem';
        const result = await db.run('UPDATE telesale_active_members SET daily_quota = NULL WHERE crm_type = ? AND is_active = true', [crmVal]);
        return { success: true, message: `Đã đặt tất cả NV về chế độ Mặc định`, updated: result?.changes || 0 };
    });

    fastify.delete('/api/telesale/active-members/:userId', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const crm_type = req.query.crm_type || 'tu_tim_kiem';
        await db.run('UPDATE telesale_active_members SET is_active = false WHERE user_id = ? AND crm_type = ?', [req.params.userId, crm_type]);
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

    // ========== VISIBLE MEMBERS API ==========
    fastify.get('/api/telesale/visible-members', { preHandler: authenticate }, async (req, reply) => {
        const ids = await _getVisibleUserIds(req.user);
        console.log(`[Visibility] user=${req.user.id} role=${req.user.role} => ${ids.length} visible IDs: [${ids.join(',')}]`);
        return { user_ids: ids };
    });

    fastify.get('/api/telesale/user-calls/:userId', { preHandler: authenticate }, async (req, reply) => {
        if (!(await _canViewUser(req.user, req.params.userId)))
            return reply.code(403).send({ error: 'Không có quyền xem data user này' });
        const dateFrom = req.query.date_from || req.query.date || new Date().toISOString().split('T')[0];
        const dateTo = req.query.date_to || req.query.date || dateFrom;
        const calls = await db.all(`SELECT a.*, d.company_name, d.group_name, d.post_link, d.post_content,
            d.customer_name, d.phone, d.address, d.extra_data, d.fb_link,
            s.name as source_name, s.icon as source_icon, s.crm_type as source_crm_type,
            ans.name as answer_status_name, ans.icon as answer_status_icon, ans.action_type
            FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            LEFT JOIN telesale_sources s ON s.id = d.source_id
            LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
            WHERE a.user_id = $1 AND a.assigned_date >= $2 AND a.assigned_date <= $3
            ORDER BY a.assigned_date DESC, a.call_status = 'pending' DESC, a.id`, [req.params.userId, dateFrom, dateTo]);
        return { calls, date_from: dateFrom, date_to: dateTo };
    });

    fastify.put('/api/telesale/call/:assignmentId', { preHandler: authenticate }, async (req, reply) => {
        const { call_status, answer_status_id, notes, callback_date, callback_time } = req.body;
        const assign = await db.get('SELECT * FROM telesale_assignments WHERE id = ?', [req.params.assignmentId]);
        if (!assign) return reply.code(404).send({ error: 'Không tìm thấy' });
        // Chỉ chủ sở hữu (người được phân SĐT) mới được thao tác
        if (assign.user_id !== req.user.id)
            return reply.code(403).send({ error: 'Chỉ nhân viên được phân SĐT mới được thao tác' });

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

            // If answer is "cold" or "cold_ncc" type → set cold_until
            if (answer_status_id) {
                const ansStatus = await db.get('SELECT * FROM telesale_answer_statuses WHERE id = ?', [answer_status_id]);
                if (ansStatus && ansStatus.action_type === 'cold') {
                    const noRepump = await db.get("SELECT value FROM app_config WHERE key = 'telesale_cold_no_repump'");
                    if (noRepump?.value === 'true') {
                        // Đóng băng vĩnh viễn — không bơm lại
                        await db.run(`UPDATE telesale_data SET status = 'cold', cold_until = NULL, updated_at = NOW() WHERE id = ?`, [assign.data_id]);
                    } else {
                        const coldMonths = await db.get("SELECT value FROM app_config WHERE key = 'telesale_cold_months'");
                        const months = parseInt(coldMonths?.value || '4');
                        await db.run(`UPDATE telesale_data SET status = 'cold',
                            cold_until = CURRENT_DATE + INTERVAL '${months} months', updated_at = NOW() WHERE id = ?`, [assign.data_id]);
                    }
                } else if (ansStatus && ansStatus.action_type === 'cold_ncc') {
                    const noRepumpNcc = await db.get("SELECT value FROM app_config WHERE key = 'telesale_ncc_no_repump'");
                    if (noRepumpNcc?.value === 'true') {
                        await db.run(`UPDATE telesale_data SET status = 'cold', cold_until = NULL, updated_at = NOW() WHERE id = ?`, [assign.data_id]);
                    } else {
                        const nccMonths = await db.get("SELECT value FROM app_config WHERE key = 'telesale_ncc_cold_months'");
                        const months = parseInt(nccMonths?.value || '3');
                        await db.run(`UPDATE telesale_data SET status = 'cold',
                            cold_until = CURRENT_DATE + INTERVAL '${months} months', updated_at = NOW() WHERE id = ?`, [assign.data_id]);
                    }
                }
            }
        } else if (call_status === 'invalid') {
            // Set data status to invalid immediately + increment count
            await db.run("UPDATE telesale_data SET status = 'invalid', invalid_count = invalid_count + 1, updated_at = NOW() WHERE id = ?", [assign.data_id]);
        } else {
            // For no_answer, busy — still update the timestamp
            await db.run("UPDATE telesale_data SET updated_at = NOW() WHERE id = ?", [assign.data_id]);
        }

        _invalidateStatsCache(); // Clear stats cache so admin sees updated data immediately
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
        if (!(await _canViewUser(req.user, req.params.userId)))
            return reply.code(403).send({ error: 'Không có quyền' });
        const dateFrom = req.query.date_from || req.query.date || new Date().toISOString().split('T')[0];
        const dateTo = req.query.date_to || req.query.date || dateFrom;

        const _buildUserStats = async (df, dt) => {
            const row = await db.get(`SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE a.call_status = 'pending') as pending,
                COUNT(*) FILTER (WHERE a.call_status = 'answered') as answered,
                COUNT(*) FILTER (WHERE a.call_status = 'no_answer') as no_answer,
                COUNT(*) FILTER (WHERE a.call_status = 'busy') as busy,
                COUNT(*) FILTER (WHERE a.call_status = 'invalid') as invalid,
                COUNT(*) FILTER (WHERE ans.action_type = 'transfer') as transferred,
                COUNT(*) FILTER (WHERE ans.action_type = 'cold') as cold_answered,
                COUNT(*) FILTER (WHERE ans.action_type = 'cold_ncc') as ncc_answered
                FROM telesale_assignments a
                LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
                WHERE a.user_id = $1 AND a.assigned_date >= $2 AND a.assigned_date <= $3`,
                [req.params.userId, df, dt]);
            return row || { total:0, pending:0, answered:0, no_answer:0, busy:0, invalid:0, transferred:0, cold_answered:0, ncc_answered:0 };
        };

        const stats = await _buildUserStats(dateFrom, dateTo);

        // Previous period comparison
        const df = new Date(dateFrom), dt = new Date(dateTo);
        const diffDays = Math.round((dt - df) / 86400000) + 1;
        const prevTo = new Date(df); prevTo.setDate(prevTo.getDate() - 1);
        const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - diffDays + 1);
        const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const prevStats = await _buildUserStats(fmt(prevFrom), fmt(prevTo));

        return { stats, prevStats };
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

    // ========== SETTINGS (GĐ only) ==========
    fastify.get('/api/telesale/settings', { preHandler: authenticate }, async (req, reply) => {
        const [coldMonths, nccMonths, coldNoRepump, nccNoRepump] = await Promise.all([
            db.get("SELECT value FROM app_config WHERE key = 'telesale_cold_months'"),
            db.get("SELECT value FROM app_config WHERE key = 'telesale_ncc_cold_months'"),
            db.get("SELECT value FROM app_config WHERE key = 'telesale_cold_no_repump'"),
            db.get("SELECT value FROM app_config WHERE key = 'telesale_ncc_no_repump'")
        ]);
        return {
            cold_months: parseInt(coldMonths?.value || '4'),
            ncc_cold_months: parseInt(nccMonths?.value || '3'),
            cold_no_repump: coldNoRepump?.value === 'true',
            ncc_no_repump: nccNoRepump?.value === 'true'
        };
    });

    fastify.put('/api/telesale/settings', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { cold_months, ncc_cold_months, cold_no_repump, ncc_no_repump } = req.body;
        if (cold_months != null) {
            await db.run("INSERT INTO app_config (key, value, updated_at) VALUES ('telesale_cold_months', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()", [String(cold_months)]);
        }
        if (ncc_cold_months != null) {
            await db.run("INSERT INTO app_config (key, value, updated_at) VALUES ('telesale_ncc_cold_months', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()", [String(ncc_cold_months)]);
        }
        if (cold_no_repump != null) {
            await db.run("INSERT INTO app_config (key, value, updated_at) VALUES ('telesale_cold_no_repump', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()", [String(cold_no_repump)]);
        }
        if (ncc_no_repump != null) {
            await db.run("INSERT INTO app_config (key, value, updated_at) VALUES ('telesale_ncc_no_repump', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()", [String(ncc_no_repump)]);
        }
        return { success: true };
    });

    // ========== MANUAL REPUMP (GĐ only) ==========
    fastify.post('/api/telesale/data/repump', { preHandler: authenticate }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ GĐ' });
        const { data_ids } = req.body;
        if (!data_ids || !Array.isArray(data_ids) || data_ids.length === 0) {
            return reply.code(400).send({ error: 'Chưa chọn data nào' });
        }
        let repumped = 0;
        for (const dataId of data_ids) {
            // 1. Force status back to available (regardless of current status)
            await db.run(
                "UPDATE telesale_data SET status = 'available', cold_until = NULL, updated_at = NOW() WHERE id = $1",
                [dataId]
            );
            // 2. Delete all assignment history so record becomes truly fresh
            //    (won't show in "Đã Gọi", "Không Nghe", etc. filters)
            const delResult = await db.run(
                "DELETE FROM telesale_assignments WHERE data_id = $1",
                [dataId]
            );
            repumped++;
        }
        _invalidateStatsCache();
        return { success: true, message: `Đã chuyển ${repumped} SĐT về Sẵn Sàng để tự động bơm`, repumped };
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

    // ========== SELF-SEARCH LOCATIONS CRUD ==========
    fastify.get('/api/self-search-locations', { preHandler: authenticate }, async (req, reply) => {
        const locations = await db.all('SELECT * FROM self_search_locations WHERE is_active = true ORDER BY name');
        return { locations };
    });

    fastify.post('/api/self-search-locations', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        const { name } = req.body;
        if (!name) return reply.code(400).send({ error: 'Tên nơi tìm kiếm là bắt buộc' });
        await db.run('INSERT INTO self_search_locations (name, created_by) VALUES (?, ?)', [name.trim(), req.user.id]);
        return { success: true, message: 'Đã thêm nơi tìm kiếm' };
    });

    fastify.delete('/api/self-search-locations/:id', { preHandler: authenticate }, async (req, reply) => {
        const mgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'];
        if (!mgr.includes(req.user.role)) return reply.code(403).send({ error: 'Không có quyền' });
        await db.run('UPDATE self_search_locations SET is_active = false WHERE id = ?', [req.params.id]);
        return { success: true, message: 'Đã xóa nơi tìm kiếm' };
    });

    // ========== SELF-SEARCH: Employee adds customer ==========
    fastify.post('/api/telesale/self-search', { preHandler: authenticate }, async (req, reply) => {
        const { customer_name, fb_link, phone, source_id, search_location_id } = req.body;
        if (!customer_name || !customer_name.trim()) return reply.code(400).send({ error: 'Tên KH là bắt buộc' });
        if (!fb_link && !phone) return reply.code(400).send({ error: 'Cần ít nhất Link FB hoặc SĐT' });
        if (!source_id) return reply.code(400).send({ error: 'Chọn Nguồn' });
        if (!search_location_id) return reply.code(400).send({ error: 'Chọn Nơi tìm kiếm' });

        const src = await db.get('SELECT id, crm_type FROM telesale_sources WHERE id = ? AND is_active = true', [source_id]);
        if (!src) return reply.code(400).send({ error: 'Nguồn không hợp lệ' });

        let normalizedPhone = '';
        let carrier = '';
        let transferredFromSource = null; // Track if we transferred an existing record
        if (phone && phone.trim()) {
            const processed = _processPhone(phone.trim());
            normalizedPhone = processed.phone;
            carrier = processed.carrier;
            if (normalizedPhone && !processed.isInvalid) {
                // Check duplicate phone GLOBALLY (across ALL sources/CRM)
                const existing = await db.get(
                    `SELECT d.id, d.status, d.source_id, s.name as source_name,
                        la.call_status as last_call_status, la.answer_action_type, la.answer_status_name
                    FROM telesale_data d
                    LEFT JOIN telesale_sources s ON s.id = d.source_id
                    LEFT JOIN LATERAL (
                        SELECT a.call_status, ans.action_type as answer_action_type, ans.name as answer_status_name
                        FROM telesale_assignments a
                        LEFT JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
                        WHERE a.data_id = d.id ORDER BY a.assigned_date DESC, a.id DESC LIMIT 1
                    ) la ON true
                    WHERE d.phone = $1`,
                    [normalizedPhone]
                );
                if (existing) {
                    // ★ If status = 'available' AND no call history → transfer to NV's source
                    const hasCallHistory = existing.last_call_status && existing.last_call_status !== 'pending';
                    if (existing.status === 'available' && !hasCallHistory) {
                        // Transfer: update source + assign to NV
                        const vnNowT = new Date(Date.now() + 7 * 3600000);
                        const todayT = vnNowT.toISOString().split('T')[0];
                        await db.run(
                            `UPDATE telesale_data SET source_id = $1, customer_name = $2, fb_link = $3,
                             search_location_id = $4, self_searched_by = $5, self_searched_at = NOW(),
                             carrier = $6, status = 'assigned', last_assigned_date = $7, last_assigned_user_id = $5,
                             updated_at = NOW() WHERE id = $8`,
                            [source_id, customer_name.trim(), fb_link?.trim() || null, search_location_id,
                             req.user.id, carrier || null, todayT, existing.id]
                        );
                        // Create assignment
                        try {
                            await db.run(
                                `INSERT INTO telesale_assignments (data_id, user_id, assigned_date, call_status, created_at) VALUES ($1, $2, $3, 'pending', NOW())`,
                                [existing.id, req.user.id, todayT]
                            );
                        } catch(e) { /* duplicate assignment, skip */ }
                        transferredFromSource = existing.source_name;
                        // Skip the INSERT below — we already updated the existing record
                    } else {
                        // ★ Has call history or non-available status → BLOCK with detailed info
                        let statusLabel = '';
                        if (existing.status === 'assigned') statusLabel = 'Đã Phân Cho NV';
                        else if (existing.status === 'invalid') statusLabel = 'Hủy K. Tồn Tại';
                        else if (existing.status === 'cold') statusLabel = 'Kho Lạnh';
                        else if (existing.answer_action_type === 'transfer') statusLabel = 'Chuyển Số';
                        else if (existing.answer_action_type === 'cold') statusLabel = 'Không Có Nhu Cầu';
                        else if (existing.answer_action_type === 'cold_ncc') statusLabel = 'Đã Có NCC';
                        else if (existing.last_call_status === 'no_answer' || existing.last_call_status === 'busy') statusLabel = 'Không Nghe/Bận';
                        else if (existing.last_call_status === 'answered') statusLabel = existing.answer_status_name || 'Đã Gọi Bắt Máy';
                        else statusLabel = 'Đang xử lý';
                        return reply.code(400).send({ 
                            error: `SĐT ${normalizedPhone} đã tồn tại trong nguồn "${existing.source_name || 'Không rõ'}" — Tình trạng: ${statusLabel}` 
                        });
                    }
                }
            }
        }

        if (fb_link && fb_link.trim()) {
            const dupFb = await db.get(
                `SELECT d.id FROM telesale_data d JOIN telesale_sources s ON s.id = d.source_id WHERE d.fb_link = $1 AND s.crm_type = $2`,
                [fb_link.trim(), src.crm_type || 'tu_tim_kiem']
            );
            if (dupFb) return reply.code(400).send({ error: 'Link FB đã tồn tại trong CRM' });
        }

        // Use VN timezone (UTC+7) for date — matching pattern from runTelesaleRecall
        const vnNow = new Date(Date.now() + 7 * 3600000);
        const today = vnNow.toISOString().split('T')[0];
        const now = new Date().toISOString();

        // Only INSERT new record if we didn't already transfer an existing one
        if (!transferredFromSource) {
            const result = await db.run(
                `INSERT INTO telesale_data (source_id, customer_name, phone, fb_link, search_location_id, self_searched_by, self_searched_at, carrier, status, last_assigned_date, last_assigned_user_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'assigned', $9, $10, $7)`,
                [source_id, customer_name.trim(), normalizedPhone || '', fb_link?.trim() || null, search_location_id, req.user.id, now, carrier || null, today, req.user.id]
            );

            const dataId = result.lastInsertRowid || result.insertId;
            if (dataId) {
                await db.run(
                    `INSERT INTO telesale_assignments (data_id, user_id, assigned_date, call_status, created_at) VALUES ($1, $2, $3, 'pending', NOW())`,
                    [dataId, req.user.id, today]
                );
            }
        }

        // ★ ALSO create a customer record in `customers` table so it appears in CRM Tự Tìm Kiếm
        const crmType = src.crm_type || 'tu_tim_kiem';
        try {
            // Get daily order number for this user
            const maxNum = await db.get(
                "SELECT COALESCE(MAX(daily_order_number), 0) as mx FROM customers WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ?::date AND assigned_to_id = ?",
                [today, req.user.id]
            );
            const dailyNum = (maxNum?.mx || 0) + 1;

            // Get source name for job field
            const srcName = src.name || (await db.get('SELECT name FROM telesale_sources WHERE id = ?', [source_id]))?.name || null;

            await db.run(
                `INSERT INTO customers (crm_type, customer_name, phone, facebook_link, assigned_to_id, receiver_id, daily_order_number, created_by, job)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [crmType, customer_name.trim(), normalizedPhone || null, fb_link?.trim() || null, req.user.id, req.user.id, dailyNum, req.user.id, srcName]
            );
            console.log(`[Self-Search] ✅ Created customer in CRM ${crmType} for "${customer_name.trim()}" by user ${req.user.id}`);
        } catch (custErr) {
            // Non-fatal: telesale_data already created, just log the error
            console.error('[Self-Search] ⚠️ Failed to create customer record:', custErr.message);
        }

        const countRes = await db.get(
            `SELECT COUNT(*) as cnt FROM telesale_data WHERE self_searched_by = $1 AND (self_searched_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $2::date`,
            [req.user.id, today]
        );
        const todayCount = parseInt(countRes?.cnt || 0);

        _invalidateStatsCache();
        const msg = transferredFromSource
            ? `Đã chuyển SĐT từ nguồn "${transferredFromSource}" về Tự Tìm Kiếm cho "${customer_name.trim()}"`
            : `Đã thêm KH "${customer_name.trim()}"`;
        return { success: true, message: msg, today_count: todayCount, transferred: !!transferredFromSource };
    });

    // ========== SELF-SEARCH STATS ==========
    fastify.get('/api/telesale/self-search-stats/:userId', { preHandler: authenticate }, async (req, reply) => {
        if (!(await _canViewUser(req.user, req.params.userId)))
            return reply.code(403).send({ error: 'Không có quyền' });
        const userId = req.params.userId;
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];
        const countRes = await db.get(
            `SELECT COUNT(*) as cnt FROM telesale_data WHERE self_searched_by = $1 AND (self_searched_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $2::date`,
            [userId, targetDate]
        );

        // Calculate day_of_week for the target date (DB: 1=Mon..7=Sun)
        const d = new Date(targetDate + 'T00:00:00');
        const jsDay = d.getDay(); // 0=Sun
        const dbDay = jsDay === 0 ? 7 : jsDay;

        // Lookup target from task template min_quantity FOR THIS DAY
        let target = 20; // default fallback
        const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
        if (user) {
            const tmpl = await db.get(
                `SELECT min_quantity FROM task_point_templates
                 WHERE task_name ILIKE '%Tự Tìm Kiếm%'
                 AND day_of_week = $3
                 AND ((target_type = 'team' AND target_id = $1) OR (target_type = 'individual' AND target_id = $2))
                 ORDER BY min_quantity DESC LIMIT 1`,
                [user.department_id, userId, dbDay]
            );
            if (tmpl && tmpl.min_quantity > 0) target = tmpl.min_quantity;
        }

        return { count: parseInt(countRes?.cnt || 0), date: targetDate, target };
    });

    // ========== TELESALE CALL PROGRESS (for Lịch Khóa Biểu + goidien progress bar) ==========
    fastify.get('/api/telesale/call-progress/:userId', { preHandler: authenticate }, async (req, reply) => {
        if (!(await _canViewUser(req.user, req.params.userId)))
            return reply.code(403).send({ error: 'Không có quyền' });
        const userId = req.params.userId;
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Count answered calls for this user on target date
        const answeredRes = await db.get(
            `SELECT COUNT(*) as cnt FROM telesale_assignments
             WHERE user_id = $1 AND assigned_date = $2 AND call_status = 'answered'`,
            [userId, targetDate]
        );
        const answered = parseInt(answeredRes?.cnt || 0);

        // Calculate day_of_week for the target date (DB: 1=Mon..7=Sun)
        const d = new Date(targetDate + 'T00:00:00');
        const jsDay = d.getDay(); // 0=Sun
        const dbDay = jsDay === 0 ? 7 : jsDay; // Convert to 1=Mon..7=Sun

        // Lookup target & points from task templates FOR THIS DAY ONLY
        let target = 100; // default fallback
        let total_points = 50; // default fallback
        const user = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);
        if (user) {
            const tmpls = await db.all(
                `SELECT min_quantity, points FROM task_point_templates
                 WHERE task_name ILIKE '%Gọi Điện Telesale%'
                 AND day_of_week = $3
                 AND ((target_type = 'team' AND target_id = $1) OR (target_type = 'individual' AND target_id = $2))`,
                [user.department_id, userId, dbDay]
            );
            if (tmpls.length > 0) {
                target = tmpls.reduce((sum, t) => sum + (t.min_quantity || 0), 0) || 100;
                total_points = tmpls.reduce((sum, t) => sum + (t.points || 0), 0) || 50;
            }
        }

        return { answered, target, total_points, date: targetDate };
    });

};

// ========== PUMP LOGIC (exported for cron) ==========
async function runTelesalePump() {
    const today = new Date().toISOString().split('T')[0];
    const CRM_TYPES = ['tu_tim_kiem', 'goi_hop_tac', 'goi_ban_hang'];
    let totalPumped = 0;
    const alerts = [];

    // ★ Step 0: Tự Tìm Kiếm — gán lại KH cho NV gốc (safety net nếu recall chưa chạy)
    const selfSearchedAvail = await db.all(`
        SELECT DISTINCT d.id as data_id, d.self_searched_by as original_user_id
        FROM telesale_data d
        JOIN users u ON u.id = d.self_searched_by
        WHERE d.self_searched_by IS NOT NULL
          AND d.status = 'available'
          AND u.status = 'active'
          AND NOT EXISTS (SELECT 1 FROM telesale_assignments a2 WHERE a2.data_id = d.id AND a2.assigned_date = $1)
    `, [today]);
    for (const ss of selfSearchedAvail) {
        try {
            await db.run("UPDATE telesale_data SET status = 'assigned', last_assigned_user_id = $1, last_assigned_date = $2, updated_at = NOW() WHERE id = $3",
                [ss.original_user_id, today, ss.data_id]);
            await db.run("INSERT INTO telesale_assignments (data_id, user_id, assigned_date, call_status, created_at) VALUES ($1, $2, $3, 'pending', NOW())",
                [ss.data_id, ss.original_user_id, today]);
            totalPumped++;
        } catch(e) { /* duplicate */ }
    }
    if (selfSearchedAvail.length > 0) {
        console.log(`  🔄 [Pump] Tự Tìm Kiếm: gán lại ${selfSearchedAvail.length} KH cho NV gốc`);
    }

    for (const crmType of CRM_TYPES) {
        const members = await db.all(`SELECT tam.user_id, tam.daily_quota, u.full_name
            FROM telesale_active_members tam JOIN users u ON u.id = tam.user_id
            WHERE tam.is_active = true AND u.status = 'active' AND tam.crm_type = ?`, [crmType]);
        if (members.length === 0) continue;

        const sources = await db.all('SELECT * FROM telesale_sources WHERE is_active = true AND crm_type = ? ORDER BY display_order', [crmType]);
        if (sources.length === 0) continue;

        const sourceIds = sources.map(s => s.id);

        for (const member of members) {
            // Nếu daily_quota = NULL → dùng tổng source quota (chế độ mặc định)
            const totalSourceQuota = sources.reduce((s, src) => s + (src.daily_quota || 0), 0);
            let remaining = member.daily_quota != null ? member.daily_quota : totalSourceQuota;
            // Check if already pumped today for this CRM's sources
            const existing = await db.get(`SELECT COUNT(*) as cnt FROM telesale_assignments a
                JOIN telesale_data d ON d.id = a.data_id
                WHERE a.user_id = ? AND a.assigned_date = ? AND d.source_id = ANY($3::int[])`,
                [member.user_id, today, sourceIds]);
            if (existing && existing.cnt > 0) continue;

            // Add callbacks due today
            const callbacks = await db.all(`SELECT DISTINCT a.data_id FROM telesale_assignments a
                JOIN telesale_data d ON d.id = a.data_id
                WHERE a.callback_date = $1 AND a.user_id = $2 AND d.source_id = ANY($3::int[])
                AND NOT EXISTS (SELECT 1 FROM telesale_assignments a2 WHERE a2.data_id = a.data_id AND a2.assigned_date = $1)`,
                [today, member.user_id, sourceIds]);
            for (const cb of callbacks) {
                try {
                    await db.run('INSERT INTO telesale_assignments (data_id, user_id, assigned_date) VALUES (?,?,?)',
                        [cb.data_id, member.user_id, today]);
                    await db.run("UPDATE telesale_data SET status = 'assigned', last_assigned_date = ?, last_assigned_user_id = ?, updated_at = NOW() WHERE id = ?",
                        [today, member.user_id, cb.data_id]);
                    totalPumped++;
                    remaining--;
                } catch (e) { /* duplicate, skip */ }
            }

            // Distribute from sources proportionally with carrier priority
            const totalQuota = sources.reduce((s, src) => s + (src.daily_quota || 0), 0);
            for (let si = 0; si < sources.length && remaining > 0; si++) {
                const src = sources[si];
                let count = totalQuota > 0 ? Math.round(remaining * (src.daily_quota || 0) / totalQuota) : Math.ceil(remaining / sources.length);
                count = Math.min(count, remaining);
                if (count <= 0) continue;

                const priority = src.carrier_priority || ['Viettel','Mobi','Vina','Vnmb','Gmob','iTel','Reddi'];
                const mode = src.distribution_mode || 'priority';
                let pickedIds = [];

                if (mode === 'even') {
                    // Even mode: distribute equally across carriers
                    const perCarrier = Math.max(1, Math.floor(count / priority.length));
                    for (const carrier of priority) {
                        if (pickedIds.length >= count) break;
                        const need = Math.min(perCarrier, count - pickedIds.length);
                        const rows = await db.all(`SELECT id FROM telesale_data
                            WHERE source_id = $1 AND status = 'available' AND carrier LIKE $2
                            ORDER BY RANDOM() LIMIT $3`, [src.id, `%${carrier}%`, need]);
                        pickedIds.push(...rows.map(r => r.id));
                    }
                    // Fill remainder with any available
                    if (pickedIds.length < count) {
                        const fill = await db.all(`SELECT id FROM telesale_data
                            WHERE source_id = $1 AND status = 'available' AND id != ALL($2::int[])
                            ORDER BY RANDOM() LIMIT $3`, [src.id, pickedIds.length > 0 ? pickedIds : [0], count - pickedIds.length]);
                        pickedIds.push(...fill.map(r => r.id));
                    }
                } else {
                    // Priority mode: take from highest-priority carrier first
                    for (const carrier of priority) {
                        if (pickedIds.length >= count) break;
                        const need = count - pickedIds.length;
                        const rows = await db.all(`SELECT id FROM telesale_data
                            WHERE source_id = $1 AND status = 'available' AND carrier LIKE $2
                            AND id != ALL($3::int[])
                            ORDER BY RANDOM() LIMIT $4`, [src.id, `%${carrier}%`, pickedIds.length > 0 ? pickedIds : [0], need]);
                        pickedIds.push(...rows.map(r => r.id));
                    }
                    // Fill remainder with any available (including invalid/unknown carrier)
                    if (pickedIds.length < count) {
                        const fill = await db.all(`SELECT id FROM telesale_data
                            WHERE source_id = $1 AND status = 'available' AND id != ALL($2::int[])
                            ORDER BY RANDOM() LIMIT $3`, [src.id, pickedIds.length > 0 ? pickedIds : [0], count - pickedIds.length]);
                        pickedIds.push(...fill.map(r => r.id));
                    }
                }

                if (pickedIds.length < count && pickedIds.length < (src.daily_quota || 0)) {
                    alerts.push({ source: src.name, needed: count, available: pickedIds.length });
                }

                for (const dId of pickedIds) {
                    try {
                        await db.run('INSERT INTO telesale_assignments (data_id, user_id, assigned_date) VALUES (?,?,?)',
                            [dId, member.user_id, today]);
                        await db.run("UPDATE telesale_data SET status = 'assigned', last_assigned_date = ?, last_assigned_user_id = ?, updated_at = NOW() WHERE id = ?",
                            [today, member.user_id, dId]);
                        totalPumped++;
                        remaining--;
                    } catch (e) { /* duplicate */ }
                }
            }

            // If still remaining, try any source in this CRM
            if (remaining > 0) {
                const extra = await db.all(`SELECT id FROM telesale_data
                    WHERE status = 'available' AND source_id = ANY($1::int[])
                    AND id NOT IN (SELECT data_id FROM telesale_assignments WHERE assigned_date = $2 AND user_id = $3)
                    ORDER BY RANDOM() LIMIT $4`, [sourceIds, today, member.user_id, remaining]);
                for (const d of extra) {
                    try {
                        await db.run('INSERT INTO telesale_assignments (data_id, user_id, assigned_date) VALUES (?,?,?)',
                            [d.id, member.user_id, today]);
                        await db.run("UPDATE telesale_data SET status = 'assigned', last_assigned_date = ?, last_assigned_user_id = ?, updated_at = NOW() WHERE id = ?",
                            [today, member.user_id, d.id]);
                        totalPumped++;
                        remaining--;
                    } catch (e) { /* skip */ }
                }
            }
        }
    }

    // Save alerts
    if (alerts.length > 0) {
        await db.run("INSERT INTO app_config (key, value, updated_at) VALUES ('telesale_source_alert', ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
            [JSON.stringify(alerts)]);
    }

    return { success: true, message: `Đã bơm ${totalPumped} SĐT`, pumped: totalPumped, alerts };
}

async function runTelesaleRecall() {
    // Use VN time (UTC+7) for date calculation
    const vnNow = new Date(Date.now() + 7 * 3600000);
    const vnToday = vnNow.toISOString().split('T')[0];
    const yesterday = new Date(vnNow.getTime() - 86400000).toISOString().split('T')[0];
    console.log(`[Telesale Recall] VN today=${vnToday}, yesterday=${yesterday}`);
    let recalled = 0, invalidated = 0;

    // 1. Pending (not called) → return to pool
    const pendingAssigns = await db.all(`SELECT a.data_id FROM telesale_assignments a
        WHERE a.assigned_date <= $1 AND a.call_status = 'pending'`, [yesterday]);
    for (const a of pendingAssigns) {
        await db.run("UPDATE telesale_data SET status = 'available', updated_at = NOW() WHERE id = ? AND status = 'assigned'", [a.data_id]);
        recalled++;
    }

    // 2. No answer + busy → NO LONGER auto-recalled (GĐ uses "Chuyển Đổi Về Sẵn Sàng" manually)
    // Kept for reference — previously these were returned to pool automatically

    // ★ 2.1. Tự Tìm Kiếm: KH do NV tự tìm → gán lại cho NV gốc (không trả về pool chung)
    let selfReassigned = 0;
    const selfSearchedRecalled = await db.all(`
        SELECT DISTINCT d.id as data_id, d.self_searched_by as original_user_id, u.username
        FROM telesale_data d
        JOIN users u ON u.id = d.self_searched_by
        WHERE d.self_searched_by IS NOT NULL
          AND d.status = 'available'
          AND u.status = 'active'
          AND NOT EXISTS (SELECT 1 FROM telesale_assignments a2 WHERE a2.data_id = d.id AND a2.assigned_date = $1)
    `, [vnToday]);
    for (const ss of selfSearchedRecalled) {
        try {
            await db.run("UPDATE telesale_data SET status = 'assigned', last_assigned_user_id = $1, last_assigned_date = $2, updated_at = NOW() WHERE id = $3",
                [ss.original_user_id, vnToday, ss.data_id]);
            await db.run("INSERT INTO telesale_assignments (data_id, user_id, assigned_date, call_status, created_at) VALUES ($1, $2, $3, 'pending', NOW())",
                [ss.data_id, ss.original_user_id, vnToday]);
            selfReassigned++;
        } catch(e) { /* duplicate assignment, skip */ }
    }
    if (selfReassigned > 0) {
        console.log(`  🔄 [Tự Tìm Kiếm] Gán lại ${selfReassigned} KH cho NV gốc`);
    }

    // 2.5. Cold/cold_ncc answered → recall assignment (data stays cold in pool)
    let coldRecalled = 0;
    const coldAssigns = await db.all(`SELECT a.id, a.data_id FROM telesale_assignments a
        JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id
        WHERE a.assigned_date <= $1 AND a.call_status = 'answered'
        AND ans.action_type IN ('cold', 'cold_ncc')`, [yesterday]);
    for (const a of coldAssigns) {
        coldRecalled++;
    }

    // 3. Invalid → keep data (GĐ can restore), no longer delete
    // Data already has status='invalid' set when NV marked it

    // 4. Unfreeze cold data that has passed cold_until (only when cold_until IS NOT NULL)
    const unfrozen = await db.run("UPDATE telesale_data SET status = 'available', cold_until = NULL, updated_at = NOW() WHERE status = 'cold' AND cold_until IS NOT NULL AND cold_until <= CURRENT_DATE");

    // 5. Track last recall run
    await db.run("INSERT INTO app_config (key, value, updated_at) VALUES ('telesale_last_recall', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()", [new Date().toISOString()]);

    console.log(`[Telesale Recall] recalled=${recalled}, selfReassigned=${selfReassigned}, cold=${coldRecalled}, invalid=${invalidated}, unfrozen=${unfrozen?.changes || 0}`);
    return { success: true, message: `Thu hồi: ${recalled} SĐT, ${selfReassigned} gán lại NV gốc, ${coldRecalled} kho lạnh, ${invalidated} chuyển kho không tồn tại, ${unfrozen?.changes || 0} giải đông`, recalled, selfReassigned, coldRecalled, invalidated };
}

// ========== PUMP FOR SINGLE USER (called on account unlock) ==========
async function runTelesalePumpForUser(userId) {
    // Check VN time < 18:00
    const vnNow = new Date(Date.now() + 7 * 3600000);
    const vnHour = vnNow.getUTCHours();
    if (vnHour >= 18) {
        return { pumped: 0, message: 'Sau 18:00 — sẽ bơm tự động sáng mai', skipped: true };
    }

    const today = vnNow.toISOString().split('T')[0];
    const CRM_TYPES = ['tu_tim_kiem', 'goi_hop_tac', 'goi_ban_hang'];
    let totalPumped = 0;

    for (const crmType of CRM_TYPES) {
        // Check if user is an active telesale member for this CRM type
        const member = await db.get(`SELECT tam.user_id, tam.daily_quota, u.full_name
            FROM telesale_active_members tam JOIN users u ON u.id = tam.user_id
            WHERE tam.user_id = $1 AND tam.is_active = true AND u.status = 'active' AND tam.crm_type = $2`,
            [userId, crmType]);
        if (!member) continue;

        const sources = await db.all('SELECT * FROM telesale_sources WHERE is_active = true AND crm_type = ? ORDER BY display_order', [crmType]);
        if (sources.length === 0) continue;

        const sourceIds = sources.map(s => s.id);

        // Check if already pumped today for this CRM's sources
        const existing = await db.get(`SELECT COUNT(*) as cnt FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            WHERE a.user_id = $1 AND a.assigned_date = $2 AND d.source_id = ANY($3::int[])`,
            [userId, today, sourceIds]);
        if (existing && existing.cnt > 0) continue;

        // Calculate remaining quota
        const totalSourceQuota = sources.reduce((s, src) => s + (src.daily_quota || 0), 0);
        let remaining = member.daily_quota != null ? member.daily_quota : totalSourceQuota;

        // Add callbacks due today
        const callbacks = await db.all(`SELECT DISTINCT a.data_id FROM telesale_assignments a
            JOIN telesale_data d ON d.id = a.data_id
            WHERE a.callback_date = $1 AND a.user_id = $2 AND d.source_id = ANY($3::int[])
            AND NOT EXISTS (SELECT 1 FROM telesale_assignments a2 WHERE a2.data_id = a.data_id AND a2.assigned_date = $1)`,
            [today, userId, sourceIds]);
        for (const cb of callbacks) {
            try {
                await db.run('INSERT INTO telesale_assignments (data_id, user_id, assigned_date) VALUES (?,?,?)',
                    [cb.data_id, userId, today]);
                await db.run("UPDATE telesale_data SET status = 'assigned', last_assigned_date = ?, last_assigned_user_id = ?, updated_at = NOW() WHERE id = ?",
                    [today, userId, cb.data_id]);
                totalPumped++;
                remaining--;
            } catch (e) { /* duplicate, skip */ }
        }

        // Distribute from sources proportionally with carrier priority
        const totalQuota = sources.reduce((s, src) => s + (src.daily_quota || 0), 0);
        for (let si = 0; si < sources.length && remaining > 0; si++) {
            const src = sources[si];
            let count = totalQuota > 0 ? Math.round(remaining * (src.daily_quota || 0) / totalQuota) : Math.ceil(remaining / sources.length);
            count = Math.min(count, remaining);
            if (count <= 0) continue;

            const priority = src.carrier_priority || ['Viettel','Mobi','Vina','Vnmb','Gmob','iTel','Reddi'];
            const mode = src.distribution_mode || 'priority';
            let pickedIds = [];

            if (mode === 'even') {
                const perCarrier = Math.max(1, Math.floor(count / priority.length));
                for (const carrier of priority) {
                    if (pickedIds.length >= count) break;
                    const need = Math.min(perCarrier, count - pickedIds.length);
                    const rows = await db.all(`SELECT id FROM telesale_data
                        WHERE source_id = $1 AND status = 'available' AND carrier LIKE $2
                        ORDER BY RANDOM() LIMIT $3`, [src.id, `%${carrier}%`, need]);
                    pickedIds.push(...rows.map(r => r.id));
                }
                if (pickedIds.length < count) {
                    const fill = await db.all(`SELECT id FROM telesale_data
                        WHERE source_id = $1 AND status = 'available' AND id != ALL($2::int[])
                        ORDER BY RANDOM() LIMIT $3`, [src.id, pickedIds.length > 0 ? pickedIds : [0], count - pickedIds.length]);
                    pickedIds.push(...fill.map(r => r.id));
                }
            } else {
                for (const carrier of priority) {
                    if (pickedIds.length >= count) break;
                    const need = count - pickedIds.length;
                    const rows = await db.all(`SELECT id FROM telesale_data
                        WHERE source_id = $1 AND status = 'available' AND carrier LIKE $2
                        AND id != ALL($3::int[])
                        ORDER BY RANDOM() LIMIT $4`, [src.id, `%${carrier}%`, pickedIds.length > 0 ? pickedIds : [0], need]);
                    pickedIds.push(...rows.map(r => r.id));
                }
                if (pickedIds.length < count) {
                    const fill = await db.all(`SELECT id FROM telesale_data
                        WHERE source_id = $1 AND status = 'available' AND id != ALL($2::int[])
                        ORDER BY RANDOM() LIMIT $3`, [src.id, pickedIds.length > 0 ? pickedIds : [0], count - pickedIds.length]);
                    pickedIds.push(...fill.map(r => r.id));
                }
            }

            for (const dId of pickedIds) {
                try {
                    await db.run('INSERT INTO telesale_assignments (data_id, user_id, assigned_date) VALUES (?,?,?)',
                        [dId, userId, today]);
                    await db.run("UPDATE telesale_data SET status = 'assigned', last_assigned_date = ?, last_assigned_user_id = ?, updated_at = NOW() WHERE id = ?",
                        [today, userId, dId]);
                    totalPumped++;
                    remaining--;
                } catch (e) { /* duplicate */ }
            }
        }

        // If still remaining, try any source in this CRM
        if (remaining > 0) {
            const extra = await db.all(`SELECT id FROM telesale_data
                WHERE status = 'available' AND source_id = ANY($1::int[])
                AND id NOT IN (SELECT data_id FROM telesale_assignments WHERE assigned_date = $2 AND user_id = $3)
                ORDER BY RANDOM() LIMIT $4`, [sourceIds, today, userId, remaining]);
            for (const d of extra) {
                try {
                    await db.run('INSERT INTO telesale_assignments (data_id, user_id, assigned_date) VALUES (?,?,?)',
                        [d.id, userId, today]);
                    await db.run("UPDATE telesale_data SET status = 'assigned', last_assigned_date = ?, last_assigned_user_id = ?, updated_at = NOW() WHERE id = ?",
                        [today, userId, d.id]);
                    totalPumped++;
                    remaining--;
                } catch (e) { /* skip */ }
            }
        }
    }

    if (totalPumped > 0) {
        console.log(`  📞 [Telesale] Auto-pump sau mở khóa: ${totalPumped} SĐT cho user ${userId}`);
        return { pumped: totalPumped, message: `Đã bơm ${totalPumped} SĐT gọi điện`, skipped: false };
    }
    return { pumped: 0, message: '', skipped: false };
}

module.exports = telesaleRoutes;
module.exports.runTelesalePump = runTelesalePump;
module.exports.runTelesaleRecall = runTelesaleRecall;
module.exports.runTelesalePumpForUser = runTelesalePumpForUser;
