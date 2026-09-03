/**
 * Employee Evaluations — Đánh Giá Nhân Sự Cuộc Họp
 */
const db = require('../db/pool');

async function employeeEvaluationsRoutes(fastify, options) {

    // Auto-migrate table if needed
    try {
        await db.run("ALTER TABLE employee_evaluations ADD COLUMN IF NOT EXISTS eval_type VARCHAR(50) DEFAULT 'Cần Cải Thiện'");
    } catch(e) { console.error('Error altering eval_type:', e); }
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS employee_evaluations (
            id SERIAL PRIMARY KEY,
            month_year VARCHAR(50) NOT NULL,
            meeting_id INTEGER,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            employee_name VARCHAR(255) NOT NULL,
            department VARCHAR(100),
            improvement_errors TEXT,
            manager_evaluation TEXT,
            remediation_action TEXT,
            training_direction TEXT,
            manager_commitment TEXT,
            employee_opinion TEXT,
            resolution_deadline VARCHAR(50),
            employee_commitment TEXT,
            manager_report TEXT,
            employee_report TEXT,
            completion_rate INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'pending',
            created_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`);
    } catch(e) { console.error('Migration error employee_evaluations:', e); }

    // GET /api/employee-evaluations — List evaluations with filters
    fastify.get('/api/employee-evaluations', async (request, reply) => {
        try {
            const { month_year, year, month, department, employee_name, status, stat_filter, eval_type, search } = request.query || {};
            let sql = `SELECT * FROM employee_evaluations WHERE 1=1`;
            const params = [];

            if (year && year !== 'all' && month && month !== 'all') {
                const shortY = year.slice(-2);
                sql += ` AND (month_year = ? OR month_year LIKE ? OR month_year LIKE ? OR month_year LIKE ?)`;
                params.push(`Tháng ${month}/${year}`, `%${month}/${year}`, `Tháng ${month}/${shortY}`, `%${month}/${shortY}`);
            } else if (year && year !== 'all') {
                const shortY = year.slice(-2);
                sql += ` AND (month_year LIKE ? OR month_year LIKE ?)`;
                params.push(`%/${year}`, `%/${shortY}`);
            } else if (month && month !== 'all') {
                sql += ` AND (month_year LIKE ? OR month_year LIKE ?)`;
                params.push(`Tháng ${month}/%`, `%${month}/%`);
            } else if (month_year && month_year !== 'all') {
                sql += ` AND (month_year = ? OR month_year LIKE ?)`;
                params.push(month_year, `%${month_year}%`);
            }

            if (department && department !== 'all') {
                sql += ` AND department = ?`;
                params.push(department);
            }
            if (employee_name && employee_name !== 'all') {
                sql += ` AND employee_name = ?`;
                params.push(employee_name);
            }
            if (status && status !== 'all') {
                sql += ` AND status = ?`;
                params.push(status);
            }

            if (eval_type && eval_type !== 'all') {
                sql += ` AND eval_type = ?`;
                params.push(eval_type);
            }

            // Handle stat_filter from card clicks
            if (stat_filter === 'pending_employee') {
                sql += ` AND ((employee_opinion IS NULL OR employee_opinion = '') AND (employee_commitment IS NULL OR employee_commitment = ''))`;
            } else if (stat_filter === 'pending_progress') {
                sql += ` AND (((employee_opinion IS NOT NULL AND employee_opinion != '') OR (employee_commitment IS NOT NULL AND employee_commitment != '')) AND (manager_report IS NULL OR manager_report = '') AND (employee_report IS NULL OR employee_report = ''))`;
            } else if (stat_filter === 'completed_progress') {
                sql += ` AND ((manager_report IS NOT NULL AND manager_report != '') OR (employee_report IS NOT NULL AND employee_report != ''))`;
            }

            if (search && search.trim() !== '') {
                const s = `%${search.trim()}%`;
                sql += ` AND (
                    employee_name LIKE ? OR 
                    department LIKE ? OR 
                    improvement_errors LIKE ? OR 
                    manager_evaluation LIKE ? OR 
                    remediation_action LIKE ? OR
                    training_direction LIKE ? OR
                    manager_commitment LIKE ? OR
                    employee_opinion LIKE ? OR
                    employee_commitment LIKE ? OR
                    manager_report LIKE ? OR
                    employee_report LIKE ?
                )`;
                params.push(s, s, s, s, s, s, s, s, s, s, s);
            }

            sql += ` ORDER BY id DESC`;
            const items = await db.all(sql, params);
            return reply.send({ success: true, items });
        } catch (err) {
            console.error('Error fetching employee_evaluations:', err);
            return reply.code(500).send({ error: err.message });
        }
    });

    // GET /api/employee-evaluations/stats — Summary stats
    fastify.get('/api/employee-evaluations/stats', async (request, reply) => {
        try {
            const { month_year, year, month } = request.query || {};
            let sql = `SELECT * FROM employee_evaluations WHERE 1=1`;
            const params = [];

            if (year && year !== 'all' && month && month !== 'all') {
                const shortY = year.slice(-2);
                sql += ` AND (month_year = ? OR month_year LIKE ? OR month_year LIKE ? OR month_year LIKE ?)`;
                params.push(`Tháng ${month}/${year}`, `%${month}/${year}`, `Tháng ${month}/${shortY}`, `%${month}/${shortY}`);
            } else if (year && year !== 'all') {
                const shortY = year.slice(-2);
                sql += ` AND (month_year LIKE ? OR month_year LIKE ?)`;
                params.push(`%/${year}`, `%/${shortY}`);
            } else if (month && month !== 'all') {
                sql += ` AND (month_year LIKE ? OR month_year LIKE ?)`;
                params.push(`Tháng ${month}/%`, `%${month}/%`);
            } else if (month_year && month_year !== 'all') {
                sql += ` AND (month_year = ? OR month_year LIKE ?)`;
                params.push(month_year, `%${month_year}%`);
            }

            const items = await db.all(sql, params);

            const total = items.length;

            const isSection2Done = (i) => {
                return (i.employee_opinion && i.employee_opinion.trim() !== '') || 
                       (i.employee_commitment && i.employee_commitment.trim() !== '');
            };

            const isSection3Done = (i) => {
                return (i.manager_report && i.manager_report.trim() !== '') || 
                       (i.employee_report && i.employee_report.trim() !== '');
            };

            // Count by classification
            const total_errors = items.filter(i => i.eval_type === 'Lỗi Vi Phạm').length;
            const total_improvements = items.filter(i => i.eval_type === 'Cần Cải Thiện').length;

            // 🔴 CHƯA XỬ LÝ 💬 Ý KIẾN & CAM KẾT NHÂN SỰ: Mục 1 đã xong nhưng Mục 2 chưa nhập
            const pending_employee = items.filter(i => !isSection2Done(i)).length;
            
            // 🟡 CHƯA HOÀN THÀNH 📊 BÁO CÁO TIẾN ĐỘ: Mục 2 đã nhập xong nhưng Mục 3 chưa nhập
            const pending_progress = items.filter(i => isSection2Done(i) && !isSection3Done(i)).length;
            
            // 🟢 HOÀN THÀNH 📊 BÁO CÁO TIẾN ĐỘ: Đã nhập đủ Mục 3
            const completed_progress = items.filter(i => isSection3Done(i)).length;

            return reply.send({
                success: true,
                stats: { total, total_errors, total_improvements, pending_employee, pending_progress, completed_progress }
            });
        } catch (err) {
            console.error('Error fetching employee_evaluations stats:', err);
            return reply.code(500).send({ error: err.message });
        }
    });

    // POST /api/employee-evaluations — Create evaluation
    fastify.post('/api/employee-evaluations', async (request, reply) => {
        try {
            const b = request.body || {};
            if (!b.employee_name || !b.employee_name.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập tên nhân sự' });
            }

            const month_year = b.month_year || 'Tháng ' + (new Date().getMonth() + 1) + '/' + new Date().getFullYear();
            const rate = Number(b.completion_rate) || 0;
            let status = 'pending';
            if ((b.manager_report && b.manager_report.trim() !== '') && (b.employee_report && b.employee_report.trim() !== '')) {
                status = 'completed';
            } else if ((b.manager_report && b.manager_report.trim() !== '') || (b.employee_report && b.employee_report.trim() !== '') || (b.employee_opinion && b.employee_opinion.trim() !== '') || (b.employee_commitment && b.employee_commitment.trim() !== '')) {
                status = 'in_progress';
            }

            const res = await db.run(`
                INSERT INTO employee_evaluations (
                    month_year, meeting_id, user_id, employee_name, department,
                    eval_type, improvement_errors, manager_evaluation, remediation_action,
                    training_direction, manager_commitment, employee_opinion,
                    resolution_deadline, employee_commitment, manager_report,
                    employee_report, completion_rate, status, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                month_year,
                b.meeting_id || null,
                b.user_id || null,
                b.employee_name.trim(),
                b.department || 'Kinh Doanh',
                b.eval_type || 'Cần Cải Thiện',
                b.improvement_errors || '',
                b.manager_evaluation || '',
                b.remediation_action || '',
                b.training_direction || '',
                b.manager_commitment || '',
                b.employee_opinion || '',
                b.resolution_deadline || '',
                b.employee_commitment || '',
                b.manager_report || '',
                b.employee_report || '',
                rate,
                status,
                b.created_by || 'Admin'
            ]);

            const newItem = await db.get(`SELECT * FROM employee_evaluations WHERE id = ?`, [res.lastID || res.insertId]);
            return reply.send({ success: true, item: newItem });
        } catch (err) {
            console.error('Error creating employee_evaluation:', err);
            return reply.code(500).send({ error: err.message });
        }
    });

    // PUT /api/employee-evaluations/:id — Update evaluation
    fastify.put('/api/employee-evaluations/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const b = request.body || {};

            const existing = await db.get(`SELECT * FROM employee_evaluations WHERE id = ?`, [id]);
            if (!existing) {
                return reply.code(404).send({ error: 'Không tìm thấy phiếu đánh giá' });
            }

            const rate = b.completion_rate !== undefined ? Number(b.completion_rate) : Number(existing.completion_rate || 0);
            
            const mgrReport = b.manager_report !== undefined ? b.manager_report : existing.manager_report;
            const empReport = b.employee_report !== undefined ? b.employee_report : existing.employee_report;
            const empOpinion = b.employee_opinion !== undefined ? b.employee_opinion : existing.employee_opinion;

            let status = 'pending';
            if ((mgrReport && mgrReport.trim() !== '') && (empReport && empReport.trim() !== '')) {
                status = 'completed';
            } else if ((mgrReport && mgrReport.trim() !== '') || (empReport && empReport.trim() !== '') || (empOpinion && empOpinion.trim() !== '')) {
                status = 'in_progress';
            }

            await db.run(`
                UPDATE employee_evaluations SET
                    month_year = ?,
                    user_id = ?,
                    employee_name = ?,
                    department = ?,
                    eval_type = ?,
                    improvement_errors = ?,
                    manager_evaluation = ?,
                    remediation_action = ?,
                    training_direction = ?,
                    manager_commitment = ?,
                    employee_opinion = ?,
                    resolution_deadline = ?,
                    employee_commitment = ?,
                    manager_report = ?,
                    employee_report = ?,
                    completion_rate = ?,
                    status = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [
                b.month_year !== undefined ? b.month_year : existing.month_year,
                b.user_id !== undefined ? b.user_id : existing.user_id,
                b.employee_name !== undefined ? b.employee_name : existing.employee_name,
                b.department !== undefined ? b.department : existing.department,
                b.eval_type !== undefined ? b.eval_type : (existing.eval_type || 'Cần Cải Thiện'),
                b.improvement_errors !== undefined ? b.improvement_errors : existing.improvement_errors,
                b.manager_evaluation !== undefined ? b.manager_evaluation : existing.manager_evaluation,
                b.remediation_action !== undefined ? b.remediation_action : existing.remediation_action,
                b.training_direction !== undefined ? b.training_direction : existing.training_direction,
                b.manager_commitment !== undefined ? b.manager_commitment : existing.manager_commitment,
                b.employee_opinion !== undefined ? b.employee_opinion : existing.employee_opinion,
                b.resolution_deadline !== undefined ? b.resolution_deadline : existing.resolution_deadline,
                b.employee_commitment !== undefined ? b.employee_commitment : existing.employee_commitment,
                b.manager_report !== undefined ? b.manager_report : existing.manager_report,
                b.employee_report !== undefined ? b.employee_report : existing.employee_report,
                rate,
                status,
                id
            ]);

            const updated = await db.get(`SELECT * FROM employee_evaluations WHERE id = ?`, [id]);
            return reply.send({ success: true, item: updated });
        } catch (err) {
            console.error('Error updating employee_evaluation:', err);
            return reply.code(500).send({ error: err.message });
        }
    });

    // DELETE /api/employee-evaluations/:id — Delete evaluation
    fastify.delete('/api/employee-evaluations/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            await db.run(`DELETE FROM employee_evaluations WHERE id = ?`, [id]);
            return reply.send({ success: true, message: 'Đã xóa đánh giá' });
        } catch (err) {
            console.error('Error deleting employee_evaluation:', err);
            return reply.code(500).send({ error: err.message });
        }
    });
}

module.exports = employeeEvaluationsRoutes;
