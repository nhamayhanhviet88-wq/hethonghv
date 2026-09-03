/**
 * Employee Evaluations — Đánh Giá Nhân Sự Cuộc Họp
 */
const db = require('../db/pool');

async function employeeEvaluationsRoutes(fastify, options) {

    // Auto-migrate table if needed
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
            const { month_year, department, status, search } = request.query || {};
            let sql = `SELECT * FROM employee_evaluations WHERE 1=1`;
            const params = [];

            if (month_year && month_year !== 'all') {
                sql += ` AND (month_year = ? OR month_year LIKE ?)`;
                params.push(month_year, `%${month_year}%`);
            }
            if (department && department !== 'all') {
                sql += ` AND department = ?`;
                params.push(department);
            }
            if (status && status !== 'all') {
                sql += ` AND status = ?`;
                params.push(status);
            }
            if (search && search.trim() !== '') {
                const s = `%${search.trim()}%`;
                sql += ` AND (employee_name LIKE ? OR department LIKE ? OR improvement_errors LIKE ? OR manager_evaluation LIKE ? OR remediation_action LIKE ?)`;
                params.push(s, s, s, s, s);
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
            const { month_year } = request.query || {};
            let sql = `SELECT * FROM employee_evaluations WHERE 1=1`;
            const params = [];
            if (month_year && month_year !== 'all') {
                sql += ` AND (month_year = ? OR month_year LIKE ?)`;
                params.push(month_year, `%${month_year}%`);
            }
            const items = await db.all(sql, params);

            const total = items.length;
            const completed = items.filter(i => i.status === 'completed' || (i.manager_report && i.manager_report.trim() !== '' && i.employee_report && i.employee_report.trim() !== '')).length;
            const in_progress = items.filter(i => i.status === 'in_progress' || ((i.manager_report && i.manager_report.trim() !== '') || (i.employee_report && i.employee_report.trim() !== '') || (i.employee_opinion && i.employee_opinion.trim() !== '')) && i.status !== 'completed').length;
            const pending = items.filter(i => !i.status || i.status === 'pending' || ((!i.manager_report || i.manager_report.trim() === '') && (!i.employee_report || i.employee_report.trim() === '') && (!i.employee_opinion || i.employee_opinion.trim() === ''))).length;

            return reply.send({
                success: true,
                stats: { total, pending, in_progress, completed }
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
                    improvement_errors, manager_evaluation, remediation_action,
                    training_direction, manager_commitment, employee_opinion,
                    resolution_deadline, employee_commitment, manager_report,
                    employee_report, completion_rate, status, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                month_year,
                b.meeting_id || null,
                b.user_id || null,
                b.employee_name.trim(),
                b.department || 'Kinh Doanh',
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
