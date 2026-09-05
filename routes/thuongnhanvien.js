const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');

module.exports = async function (fastify, opts) {
    // Auto-create database table for employee monthly rewards
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS employee_monthly_rewards (
                id SERIAL PRIMARY KEY,
                month_year VARCHAR(7) NOT NULL,
                department_id INT NOT NULL,
                department_name VARCHAR(255),
                user_id INT NOT NULL,
                user_name VARCHAR(255),
                reward_title VARCHAR(255) NOT NULL,
                reward_condition TEXT,
                reward_type VARCHAR(20) NOT NULL DEFAULT 'money',
                reward_amount DECIMAL(15, 2) DEFAULT 0,
                reward_gift_description TEXT,
                award_status VARCHAR(30) DEFAULT 'pending',
                award_status_updated_at TIMESTAMP,
                award_status_updated_by INT,
                status VARCHAR(20) DEFAULT 'active',
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Migration for existing tables: add columns if missing
        await db.exec(`
            ALTER TABLE employee_monthly_rewards ADD COLUMN IF NOT EXISTS award_status VARCHAR(30) DEFAULT 'pending';
            ALTER TABLE employee_monthly_rewards ADD COLUMN IF NOT EXISTS award_status_updated_at TIMESTAMP;
            ALTER TABLE employee_monthly_rewards ADD COLUMN IF NOT EXISTS award_status_updated_by INT;
            ALTER TABLE employee_monthly_rewards ADD COLUMN IF NOT EXISTS target_type VARCHAR(20) DEFAULT 'single';
            ALTER TABLE employee_monthly_rewards ADD COLUMN IF NOT EXISTS batch_id VARCHAR(50);

            CREATE INDEX IF NOT EXISTS idx_emr_status_month ON employee_monthly_rewards(status, month_year);
            CREATE INDEX IF NOT EXISTS idx_emr_dept_user ON employee_monthly_rewards(department_id, user_id);
            CREATE INDEX IF NOT EXISTS idx_emr_batch_id ON employee_monthly_rewards(batch_id);
        `);

        try {
            await db.run(
                `UPDATE employee_monthly_rewards SET target_type = 'team' WHERE reward_title ILIKE '%Team%' OR reward_title ILIKE '%Thủ Lĩnh%' OR reward_title ILIKE '%Thu Linh%' OR reward_title ILIKE '%Pk%' OR reward_title ILIKE '%Bứt Phá%' OR reward_title ILIKE '%But Pha%' OR reward_title ILIKE '%Giải Nhá%' OR reward_title ILIKE '%Giải Nhấ%' OR reward_title = '23423'`
            );

            await db.run(
                `UPDATE employee_monthly_rewards SET target_type = 'department' WHERE reward_title ILIKE '%Phòng%' OR reward_title ILIKE '%Phong%'`
            );

            // Auto-assign batch_id to existing team/department rewards or multi-user rewards that don't have batch_id yet
            const unbatchedRows = await db.all(
                "SELECT id, month_year, department_id, reward_title, reward_amount, target_type, batch_id FROM employee_monthly_rewards WHERE status = 'active'"
            );
            if (unbatchedRows && unbatchedRows.length > 0) {
                const groups = {};
                for (const row of unbatchedRows) {
                    const titleClean = (row.reward_title || '').trim().toLowerCase();
                    const key = `${row.month_year}_${titleClean}_${row.reward_amount || 0}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(row);
                }
                for (const key in groups) {
                    const rows = groups[key];
                    if (rows.length > 1) {
                        let batchId = rows.find(r => r.batch_id)?.batch_id;
                        if (!batchId) {
                            batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
                        }
                        const hasDept = rows.some(r => r.target_type === 'department' || (r.reward_title || '').toLowerCase().includes('phòng'));
                        const hasTeam = rows.some(r => r.target_type === 'team' || (r.reward_title || '').toLowerCase().includes('team'));
                        const derivedTargetType = hasDept ? 'department' : (hasTeam ? 'team' : 'department');

                        const ids = rows.map(r => r.id);
                        const placeholders = ids.map(() => '?').join(',');
                        await db.run(
                            `UPDATE employee_monthly_rewards SET batch_id = ?, target_type = CASE WHEN target_type IS NULL OR target_type = 'single' THEN ? ELSE target_type END WHERE id IN (${placeholders})`,
                            [batchId, derivedTargetType, ...ids]
                        );
                    }
                }
            }

            // Auto-sync award_status across sibling rows of the same batch_id if inconsistent
            const allActiveRows = await db.all(
                "SELECT id, batch_id, award_status FROM employee_monthly_rewards WHERE status = 'active' AND batch_id IS NOT NULL"
            );
            const batchStatusMap = {};
            for (const r of allActiveRows) {
                if (!batchStatusMap[r.batch_id]) batchStatusMap[r.batch_id] = [];
                batchStatusMap[r.batch_id].push(r);
            }
            for (const bId in batchStatusMap) {
                const bRows = batchStatusMap[bId];
                if (bRows.length > 1) {
                    const handedOver = bRows.find(r => r.award_status === 'handed_over');
                    const achieved = bRows.find(r => r.award_status === 'achieved');
                    const notAchieved = bRows.find(r => r.award_status === 'not_achieved');

                    const targetStatus = handedOver ? 'handed_over' : (achieved ? 'achieved' : (notAchieved ? 'not_achieved' : null));
                    if (targetStatus) {
                        const inconsistent = bRows.some(r => r.award_status !== targetStatus);
                        if (inconsistent) {
                            await db.run(
                                `UPDATE employee_monthly_rewards SET award_status = ?, updated_at = CURRENT_TIMESTAMP WHERE status = 'active' AND batch_id = ?`,
                                [targetStatus, bId]
                            );
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Data patch error:', err.message);
        }

        console.log('✅ Table employee_monthly_rewards ready with indexes, columns and batch_id');
    } catch (e) {
        console.error('⚠️ Error creating/updating employee_monthly_rewards table:', e.message);
    }

    // GET /api/thuong-nhan-vien/check-eligible - Check if previous months are fully evaluated before setup
    fastify.get('/api/thuong-nhan-vien/check-eligible', { preHandler: [authenticate] }, async (request, reply) => {
        const { target_month_year } = request.query || {};

        if (!target_month_year || !/^\d{4}-\d{2}$/.test(target_month_year)) {
            return { eligible: true };
        }

        // Current system month (e.g., "2026-09")
        const now = new Date();
        const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Past system month restriction
        if (target_month_year < curMonthStr) {
            return { eligible: false, isPastMonth: true, error: `⚠️ Không được chọn hoặc tạo thưởng cho các tháng trong quá khứ (${target_month_year}).` };
        }

        try {
            // Rule: Check if a newer month already has rewards created (e.g., month 10/2026 created -> cannot create 09/2026)
            const maxRow = await db.get("SELECT MAX(month_year) as max_month FROM employee_monthly_rewards WHERE status = 'active'");
            const maxMonthStr = maxRow ? maxRow.max_month : null;

            if (maxMonthStr && target_month_year < maxMonthStr) {
                const [tY, tM] = target_month_year.split('-');
                const [mY, mM] = maxMonthStr.split('-');
                return {
                    eligible: false,
                    isPastMaxMonth: true,
                    maxMonthStr,
                    error: `⛔ Không thể tạo giải thưởng cho Tháng ${tM}/${tY}! Hệ thống đã tạo giải thưởng cho Tháng ${mM}/${mY} (Nguyên tắc: Khi đã tạo thưởng cho tháng lớn hơn, không thể tạo mới cho các tháng nhỏ hơn).`
                };
            }

            // Gatekeeper check: ONLY enforce when creating setup for a FUTURE month (> curMonthStr)
            if (target_month_year > curMonthStr) {
                const pendingRewards = await db.all(
                    `SELECT * FROM employee_monthly_rewards 
                     WHERE status = 'active' 
                       AND month_year < ? 
                       AND (award_status IS NULL OR award_status NOT IN ('not_achieved', 'handed_over'))
                     ORDER BY month_year ASC, id ASC`,
                    [target_month_year]
                );

                if (pendingRewards.length > 0) {
                    const incompleteMonth = pendingRewards[0].month_year;
                    const monthPending = pendingRewards.filter(r => r.month_year === incompleteMonth);

                    return {
                        eligible: false,
                        incompleteMonth,
                        incompleteCount: monthPending.length,
                        pendingRewards: monthPending
                    };
                }
            }

            return { eligible: true };
        } catch (e) {
            console.error('Error checking setup eligibility:', e.message);
            return { eligible: true };
        }
    });

    // GET /api/thuong-nhan-vien - Fetch rewards by year, month, department & user
    fastify.get('/api/thuong-nhan-vien', { preHandler: [authenticate] }, async (request, reply) => {
        const { year, month, month_year, department_id, user_id } = request.query || {};
        let sql = "SELECT * FROM employee_monthly_rewards WHERE status = 'active'";
        const params = [];

        if (month_year) {
            sql += " AND month_year = ?";
            params.push(month_year);
        } else {
            if (year && year !== 'all') {
                sql += " AND month_year LIKE ?";
                params.push(`${year}-%`);
            }
            if (month && month !== 'all') {
                const mStr = String(month).padStart(2, '0');
                sql += " AND month_year LIKE ?";
                params.push(`%-${mStr}`);
            }
        }
        if (department_id && department_id !== 'all') {
            const subDepts = await db.all('SELECT id FROM departments WHERE id = ? OR parent_id = ? OR parent_id IN (SELECT id FROM departments WHERE parent_id = ?)', [department_id, department_id, department_id]);
            const deptIds = subDepts.map(d => d.id);
            if (deptIds.length > 0) {
                const placeholders = deptIds.map(() => '?').join(',');
                sql += ` AND department_id IN (${placeholders})`;
                params.push(...deptIds);
            } else {
                sql += ' AND department_id = ?';
                params.push(department_id);
            }
        }
        if (user_id && user_id !== 'all') {
            sql += " AND user_id = ?";
            params.push(user_id);
        }

        sql += " ORDER BY month_year DESC, created_at DESC, id DESC";

        try {
            await db.run(
                `UPDATE employee_monthly_rewards 
                 SET target_type = 'team' 
                 WHERE reward_title ILIKE '%Giải Nhá%' OR reward_title ILIKE '%Giải Nhấ%' OR reward_title ILIKE '%Pk%' OR reward_title ILIKE '%Thủ Lĩnh%' OR reward_title ILIKE '%Team%' OR reward_title = '23423'`
            );
        } catch (err) {}

        try {
            const rewards = await db.all(sql, params);
            return { rewards: rewards || [] };
        } catch (e) {
            console.error('Error fetching employee monthly rewards:', e.message);
            return reply.code(500).send({ error: 'Lỗi tải danh sách thưởng nhân viên' });
        }
    });

    // PATCH /api/thuong-nhan-vien/:id/award-status - Update award evaluation / handover status
    fastify.patch('/api/thuong-nhan-vien/:id/award-status', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { id } = request.params;
        const { award_status } = request.body || {};

        const validStatuses = ['pending', 'not_achieved', 'achieved', 'handed_over'];
        if (!validStatuses.includes(award_status)) {
            return reply.code(400).send({ error: 'Trạng thái giải thưởng không hợp lệ' });
        }

        const existing = await db.get('SELECT * FROM employee_monthly_rewards WHERE id = ? AND status = \'active\'', [id]);
        if (!existing) {
            return reply.code(404).send({ error: 'Không tìm thấy bản ghi thưởng' });
        }

        try {
            let whereClause = "id = ?";
            let whereParams = [id];

            if (existing.batch_id) {
                whereClause = "batch_id = ?";
                whereParams = [existing.batch_id];
            } else if (existing.target_type === 'department' || existing.target_type === 'team') {
                whereClause = "month_year = ? AND department_id = ? AND reward_title = ?";
                whereParams = [existing.month_year, existing.department_id, existing.reward_title];
            }

            await db.run(
                `UPDATE employee_monthly_rewards SET 
                    award_status = ?,
                    award_status_updated_at = CURRENT_TIMESTAMP,
                    award_status_updated_by = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE status = 'active' AND ${whereClause}`,
                [award_status, request.user.id, ...whereParams]
            );

            return { success: true, message: 'Đã cập nhật trạng thái trao giải thành công', award_status };
        } catch (e) {
            console.error('Error updating award status:', e.message);
            return reply.code(500).send({ error: 'Lỗi cập nhật trạng thái trao giải: ' + e.message });
        }
    });

    // POST /api/thuong-nhan-vien - Create new employee reward
    fastify.post('/api/thuong-nhan-vien', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { month_year, department_id, user_id, reward_title, reward_condition, reward_type, reward_amount, reward_gift_description, target_type } = request.body || {};

        if (!month_year || !department_id || !user_id || !reward_title) {
            return reply.code(400).send({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc (Tháng, Phòng ban, Nhân viên, Tiêu đề giải thưởng)' });
        }

        // Current system month (e.g., "2026-09")
        const now = new Date();
        const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Rule 3: Reject creating rewards for past months (< curMonthStr)
        if (month_year < curMonthStr) {
            return reply.code(400).send({
                error: `⚠️ Không được chọn hoặc tạo thưởng cho các tháng trong quá khứ (${month_year}). Anh chỉ có thể tạo thưởng cho Tháng Hiện Tại (${curMonthStr}) hoặc Tháng Tương Lai!`
            });
        }

        // Rule: Reject creating rewards for a month smaller than max existing month
        const maxRow = await db.get("SELECT MAX(month_year) as max_month FROM employee_monthly_rewards WHERE status = 'active'");
        const maxMonthStr = maxRow ? maxRow.max_month : null;
        if (maxMonthStr && month_year < maxMonthStr) {
            const [tY, tM] = month_year.split('-');
            const [mY, mM] = maxMonthStr.split('-');
            return reply.code(400).send({
                error: `⛔ Không thể tạo giải thưởng cho Tháng ${tM}/${tY}! Hệ thống đã tạo giải thưởng cho Tháng ${mM}/${mY} (Nguyên tắc: Khi đã tạo thưởng cho tháng lớn hơn, không thể tạo mới cho các tháng nhỏ hơn).`
            });
        }

        // Rule 2: Gatekeeper check: ONLY enforce when creating setup for a FUTURE month (> curMonthStr)
        if (month_year > curMonthStr) {
            const pendingRewards = await db.all(
                `SELECT * FROM employee_monthly_rewards 
                 WHERE status = 'active' 
                   AND month_year < ? 
                   AND (award_status IS NULL OR award_status NOT IN ('not_achieved', 'handed_over'))
                 ORDER BY month_year ASC, id ASC`,
                [month_year]
            );

            if (pendingRewards.length > 0) {
                const incompleteMonth = pendingRewards[0].month_year;
                const monthPendingCount = pendingRewards.filter(r => r.month_year === incompleteMonth).length;
                return reply.code(400).send({
                    eligible: false,
                    incomplete_awards: pendingRewards,
                    error: `⛔ Chưa đủ điều kiện setup tháng ${month_year}! Anh cần hoàn thành đánh giá & trao giải cho tất cả giải thưởng của Tháng ${incompleteMonth} trước (Còn ${monthPendingCount} giải thưởng chưa chốt).`
                });
            }
        }

        const dept = await db.get('SELECT id, name FROM departments WHERE id = ?', [department_id]);
        const userObj = await db.get('SELECT id, full_name FROM users WHERE id = ?', [user_id]);

        const deptName = dept ? dept.name : '';
        const userName = userObj ? userObj.full_name : '';
        const type = reward_type === 'gift' ? 'gift' : 'money';
        const amount = type === 'money' ? (Number(reward_amount) || 0) : 0;
        const giftDesc = type === 'gift' ? (reward_gift_description || '') : '';
        const targetType = target_type === 'team' ? 'team' : 'single';

        try {
            const result = await db.run(
                `INSERT INTO employee_monthly_rewards 
                (month_year, department_id, department_name, user_id, user_name, reward_title, reward_condition, reward_type, reward_amount, reward_gift_description, award_status, target_type, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
                [month_year, department_id, deptName, user_id, userName, reward_title, reward_condition || '', type, amount, giftDesc, targetType, request.user.id]
            );

            return { success: true, message: 'Đã tạo thưởng nhân viên thành công', id: result ? result.lastID || result.id : null };
        } catch (e) {
            console.error('Error creating employee reward:', e.message);
            return reply.code(500).send({ error: 'Lỗi lưu thông tin thưởng nhân viên: ' + e.message });
        }
    });

    // POST /api/thuong-nhan-vien/batch - Create team batch rewards for all eligible members of a department/team
    fastify.post('/api/thuong-nhan-vien/batch', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { month_year, department_id, reward_title, reward_condition, reward_type, reward_amount, reward_gift_description, target_type } = request.body || {};

        if (!month_year || !department_id || !reward_title) {
            return reply.code(400).send({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc (Tháng, Phòng ban/Team, Tiêu đề giải thưởng)' });
        }

        const now = new Date();
        const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        if (month_year < curMonthStr) {
            return reply.code(400).send({
                error: `⚠️ Không được chọn hoặc tạo thưởng cho các tháng trong quá khứ (${month_year}). Anh chỉ có thể tạo thưởng cho Tháng Hiện Tại (${curMonthStr}) hoặc Tháng Tương Lai!`
            });
        }

        // Rule: Reject creating rewards for a month smaller than max existing month
        const maxRowBatch = await db.get("SELECT MAX(month_year) as max_month FROM employee_monthly_rewards WHERE status = 'active'");
        const maxMonthStrBatch = maxRowBatch ? maxRowBatch.max_month : null;
        if (maxMonthStrBatch && month_year < maxMonthStrBatch) {
            const [tY, tM] = month_year.split('-');
            const [mY, mM] = maxMonthStrBatch.split('-');
            return reply.code(400).send({
                error: `⛔ Không thể tạo giải thưởng cho Tháng ${tM}/${tY}! Hệ thống đã tạo giải thưởng cho Tháng ${mM}/${mY} (Nguyên tắc: Khi đã tạo thưởng cho tháng lớn hơn, không thể tạo mới cho các tháng nhỏ hơn).`
            });
        }

        if (month_year > curMonthStr) {
            const pendingRewards = await db.all(
                `SELECT * FROM employee_monthly_rewards 
                 WHERE status = 'active' 
                   AND month_year < ? 
                   AND (award_status IS NULL OR award_status NOT IN ('not_achieved', 'handed_over'))
                 ORDER BY month_year ASC, id ASC`,
                [month_year]
            );

            if (pendingRewards.length > 0) {
                const incompleteMonth = pendingRewards[0].month_year;
                const monthPendingCount = pendingRewards.filter(r => r.month_year === incompleteMonth).length;
                return reply.code(400).send({
                    eligible: false,
                    incomplete_awards: pendingRewards,
                    error: `⛔ Chưa đủ điều kiện setup tháng ${month_year}! Anh cần hoàn thành đánh giá & trao giải cho tất cả giải thưởng của Tháng ${incompleteMonth} trước (Còn ${monthPendingCount} giải thưởng chưa chốt).`
                });
            }
        }

        const targetDept = await db.get('SELECT id, name FROM departments WHERE id = ?', [department_id]);
        const targetDeptName = targetDept ? targetDept.name : '';

        const subDepts = await db.all(
            'SELECT id FROM departments WHERE id = ? OR parent_id = ? OR parent_id IN (SELECT id FROM departments WHERE parent_id = ?)',
            [department_id, department_id, department_id]
        );
        const deptIds = subDepts.map(d => d.id);
        if (deptIds.length === 0) deptIds.push(Number(department_id));

        const placeholders = deptIds.map(() => '?').join(',');

        const users = await db.all(
            `SELECT u.id, u.full_name, u.department_id, d.name as dept_name 
             FROM users u 
             LEFT JOIN departments d ON u.department_id = d.id 
             WHERE (u.status = 'active' OR u.status IS NULL) AND u.department_id IN (${placeholders})`,
            deptIds
        );

        if (users.length === 0) {
            return reply.code(400).send({ error: 'Không tìm thấy nhân viên nào thuộc Team / Phòng Ban này.' });
        }

        const targetTypeVal = (target_type === 'department' || target_type === 'team') ? target_type : 'team';
        const typeLabel = targetTypeVal === 'department' ? 'Phòng Ban' : 'Team';

        const eligibleUsers = users;

        const type = reward_type === 'gift' ? 'gift' : 'money';
        const amount = type === 'money' ? (Number(reward_amount) || 0) : 0;
        const giftDesc = type === 'gift' ? (reward_gift_description || '') : '';
        const batch_id = 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

        let createdCount = 0;
        const createdUsers = [];

        for (const u of eligibleUsers) {
            await db.run(
                `INSERT INTO employee_monthly_rewards 
                (month_year, department_id, department_name, user_id, user_name, reward_title, reward_condition, reward_type, reward_amount, reward_gift_description, award_status, target_type, batch_id, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
                [month_year, department_id, targetDeptName || u.dept_name || '', u.id, u.full_name, reward_title, reward_condition || '', type, amount, giftDesc, targetTypeVal, batch_id, request.user.id]
            );
            createdCount++;
            createdUsers.push(u.full_name);
        }

        return {
            success: true,
            message: `🎉 Đã tạo thưởng thành công cho ${createdCount} nhân viên thuộc Team / Phòng Ban!`,
            count: createdCount,
            batch_id,
            createdUsers,
            skippedCount: users.length - eligibleUsers.length
        };
    });

    // PUT /api/thuong-nhan-vien/:id - Update employee reward
    fastify.put('/api/thuong-nhan-vien/:id', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { id } = request.params;
        const { month_year, department_id, user_id, reward_title, reward_condition, reward_type, reward_amount, reward_gift_description, target_type, update_batch } = request.body || {};

        const existing = await db.get('SELECT * FROM employee_monthly_rewards WHERE id = ?', [id]);
        if (!existing) {
            return reply.code(404).send({ error: 'Không tìm thấy bản ghi thưởng' });
        }

        const type = (reward_type || existing.reward_type) === 'gift' ? 'gift' : 'money';
        const amount = type === 'money' ? (Number(reward_amount) || 0) : 0;
        const giftDesc = type === 'gift' ? (reward_gift_description || '') : '';
        const targetTypeVal = target_type ? ((target_type === 'department' || target_type === 'team') ? target_type : 'single') : (existing.target_type || 'single');

        // If batch update requested (e.g. updating a grouped team/department reward)
        if (update_batch && (existing.batch_id || existing.target_type === 'team' || existing.target_type === 'department')) {
            let whereClause = "batch_id = ?";
            let whereParams = [existing.batch_id];

            if (!existing.batch_id) {
                whereClause = "month_year = ? AND department_id = ? AND reward_title = ? AND (target_type = 'team' OR target_type = 'department')";
                whereParams = [existing.month_year, existing.department_id, existing.reward_title];
            }

            await db.run(
                `UPDATE employee_monthly_rewards SET
                    reward_title = ?,
                    reward_condition = ?,
                    reward_type = ?,
                    reward_amount = ?,
                    reward_gift_description = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE status = 'active' AND ${whereClause}`,
                [
                    reward_title || existing.reward_title,
                    reward_condition !== undefined ? reward_condition : existing.reward_condition,
                    type,
                    amount,
                    giftDesc,
                    ...whereParams
                ]
            );

            return { success: true, message: 'Đã cập nhật đợt thưởng team thành công' };
        }

        const targetUserId = Number(user_id || existing.user_id);
        const targetMonthYear = month_year || existing.month_year;

        // Rule: Each user can only have 1 active reward per month (excluding current record being edited)
        const existingOtherReward = await db.get(
            "SELECT id, reward_title FROM employee_monthly_rewards WHERE user_id = ? AND month_year = ? AND status = 'active' AND id != ?",
            [targetUserId, targetMonthYear, id]
        );
        if (existingOtherReward) {
            const uObj = await db.get('SELECT full_name FROM users WHERE id = ?', [targetUserId]);
            const uName = uObj ? uObj.full_name : 'Nhân viên này';
            const mParts = targetMonthYear.split('-');
            return reply.code(400).send({
                error: `⚠️ ${uName} đã có giải thưởng "${existingOtherReward.reward_title}" trong Tháng ${mParts[1]}/${mParts[0]} rồi!\n\nMỗi nhân viên chỉ được nhận 1 giải thưởng trong mỗi tháng.`
            });
        }

        const dept = await db.get('SELECT id, name FROM departments WHERE id = ?', [department_id || existing.department_id]);
        const userObj = await db.get('SELECT id, full_name FROM users WHERE id = ?', [user_id || existing.user_id]);

        const deptName = dept ? dept.name : existing.department_name;
        const userName = userObj ? userObj.full_name : existing.user_name;

        try {
            await db.run(
                `UPDATE employee_monthly_rewards SET
                    month_year = ?,
                    department_id = ?,
                    department_name = ?,
                    user_id = ?,
                    user_name = ?,
                    reward_title = ?,
                    reward_condition = ?,
                    reward_type = ?,
                    reward_amount = ?,
                    reward_gift_description = ?,
                    target_type = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
                [
                    month_year || existing.month_year,
                    department_id || existing.department_id,
                    deptName,
                    user_id || existing.user_id,
                    userName,
                    reward_title || existing.reward_title,
                    reward_condition !== undefined ? reward_condition : existing.reward_condition,
                    type,
                    amount,
                    giftDesc,
                    targetTypeVal,
                    id
                ]
            );

            return { success: true, message: 'Đã cập nhật thưởng nhân viên thành công' };
        } catch (e) {
            console.error('Error updating employee reward:', e.message);
            return reply.code(500).send({ error: 'Lỗi cập nhật thông tin thưởng' });
        }
    });

    // DELETE /api/thuong-nhan-vien/:id - Soft delete employee reward (supports batch deletion via ?batch=true or ?ids=1,2,3)
    fastify.delete('/api/thuong-nhan-vien/:id', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { id } = request.params;
        const { batch, ids } = request.query || {};

        try {
            if (ids) {
                const idArr = String(ids).split(',').map(n => Number(n.trim())).filter(Boolean);
                if (idArr.length > 0) {
                    const placeholders = idArr.map(() => '?').join(',');
                    await db.run(
                        `UPDATE employee_monthly_rewards SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
                        idArr
                    );
                    return { success: true, message: `Đã xóa ${idArr.length} bản ghi thưởng thành công` };
                }
            }

            const existing = await db.get('SELECT * FROM employee_monthly_rewards WHERE id = ?', [id]);
            if (existing && batch === 'true' && (existing.batch_id || existing.target_type === 'team' || existing.target_type === 'department')) {
                if (existing.batch_id) {
                    await db.run(
                        "UPDATE employee_monthly_rewards SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE batch_id = ?",
                        [existing.batch_id]
                    );
                } else {
                    await db.run(
                        "UPDATE employee_monthly_rewards SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE month_year = ? AND department_id = ? AND reward_title = ? AND (target_type = 'team' OR target_type = 'department')",
                        [existing.month_year, existing.department_id, existing.reward_title]
                    );
                }
                return { success: true, message: 'Đã xóa đợt thưởng team / phòng ban thành công' };
            }

            await db.run("UPDATE employee_monthly_rewards SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
            return { success: true, message: 'Đã xóa thưởng thành công' };
        } catch (e) {
            console.error('Error deleting employee reward:', e.message);
            return reply.code(500).send({ error: 'Lỗi xóa thông tin thưởng' });
        }
    });
};
