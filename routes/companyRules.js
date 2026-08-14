const db = require('../db/pool');

function getDepartmentPrefix(deptName, deptCode) {
    if (!deptName) return 'NQ-CHUNG';
    const nameUpper = deptName.toUpperCase();
    if (nameUpper.includes('KẾ TOÁN')) return 'NQ-KT';
    if (nameUpper.includes('SALE')) return 'NQ-SALE';
    if (nameUpper.includes('MARKETING')) return 'NQ-MKT';
    if (nameUpper.includes('THIẾT KẾ')) return 'NQ-TK';
    if (nameUpper.includes('THỦ QUỸ')) return 'NQ-TQ';
    if (nameUpper.includes('NHÂN SỰ') || nameUpper.includes('HÀNH CHÍNH')) return 'NQ-NS';
    if (nameUpper.includes('KINH DOANH')) return 'NQ-KD';
    if (nameUpper.includes('CẮT')) return 'NQ-CAT';
    if (nameUpper.includes('KHO')) return 'NQ-KHO';
    if (nameUpper.includes('IN')) return 'NQ-IN';
    if (nameUpper.includes('ÉP')) return 'NQ-EP';
    if (nameUpper.includes('MAY')) return 'NQ-MAY';
    if (nameUpper.includes('HOÀN THIỆN')) return 'NQ-HT';
    
    if (deptCode) return 'NQ-' + deptCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return 'NQ-PB';
}

async function companyRulesRoutes(fastify, options) {
    
    // GET /api/company-rules/departments - Lấy danh sách phòng ban kèm tên Quản lý/Trưởng phòng
    fastify.get('/api/company-rules/departments', async (req, reply) => {
        try {
            const depts = await db.all(`
                SELECT 
                    d.id, d.name, d.code, d.parent_id, d.display_order, d.head_user_id,
                    u.fullname as head_fullname, u.username as head_username, u.role as head_role
                FROM departments d
                LEFT JOIN users u ON u.id = d.head_user_id
                WHERE d.status = 'active'
                ORDER BY d.parent_id NULLS FIRST, d.display_order ASC, d.id ASC
            `);
            
            // Also get all managers/leaders to assign fallback head names
            const managers = await db.all(`
                SELECT id, fullname, username, role, department_id 
                FROM users 
                WHERE role IN ('giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong') AND status = 'active'
            `);

            const deptList = depts.map(d => {
                let headName = d.head_fullname || d.head_username || '';
                let headId = d.head_user_id || null;

                if (!headName && d.id) {
                    const mgr = managers.find(m => m.department_id === d.id);
                    if (mgr) {
                        headName = mgr.fullname || mgr.username || '';
                        headId = mgr.id;
                    }
                }

                if (!headName) {
                    const gd = managers.find(m => m.role === 'giam_doc');
                    if (gd) {
                        headName = (gd.fullname || gd.username) + ' (Ban Giám Đốc)';
                        headId = gd.id;
                    }
                }

                return {
                    ...d,
                    head_user_id: headId,
                    head_user_name: headName
                };
            });

            const vanPhong = [];
            const xuong = [];
            const other = [];

            const rootVp = deptList.find(d => d.name && d.name.includes('VĂN PHÒNG'));
            const rootXuong = deptList.find(d => d.name && d.name.includes('XƯỞNG'));

            const rootVpId = rootVp ? rootVp.id : null;
            const rootXuongId = rootXuong ? rootXuong.id : null;

            deptList.forEach(d => {
                if (d.id === rootVpId || d.id === rootXuongId) return; // Skip system roots
                if (d.parent_id === rootVpId) {
                    vanPhong.push(d);
                } else if (d.parent_id === rootXuongId) {
                    xuong.push(d);
                } else if (d.parent_id) {
                    const parent = deptList.find(p => p.id === d.parent_id);
                    if (parent && parent.parent_id === rootVpId) vanPhong.push(d);
                    else if (parent && parent.parent_id === rootXuongId) xuong.push(d);
                    else other.push(d);
                } else {
                    other.push(d);
                }
            });

            return {
                vanPhong,
                xuong,
                other,
                all: deptList.filter(d => d.id !== rootVpId && d.id !== rootXuongId)
            };
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: 'Lỗi lấy danh sách phòng ban' });
        }
    });

    // GET /api/company-rules/next-code - Gợi ý mã NQ tiếp theo
    fastify.get('/api/company-rules/next-code', async (req, reply) => {
        try {
            const { scope, department_id } = req.query || {};
            let prefix = 'NQ-CHUNG';

            if (scope === 'phong_ban' && department_id) {
                const dept = await db.get('SELECT name, code FROM departments WHERE id = $1', [department_id]);
                if (dept) {
                    prefix = getDepartmentPrefix(dept.name, dept.code);
                }
            }

            const rows = await db.all(`
                SELECT rule_code FROM company_rules 
                WHERE rule_code LIKE $1 || '%'
            `, [prefix]);

            let maxNum = 0;
            rows.forEach(r => {
                const numStr = r.rule_code.replace(prefix, '').replace(/[^0-9]/g, '');
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            });

            const nextNum = maxNum + 1;
            const nextCode = prefix + String(nextNum).padStart(4, '0');

            return { prefix, nextNum, nextCode };
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: 'Lỗi sinh mã điều khoản' });
        }
    });

    // GET /api/company-rules - Danh sách điều khoản kèm bộ lọc & thống kê
    fastify.get('/api/company-rules', async (req, reply) => {
        try {
            const { scope, department_id, month, year, search, has_fine } = req.query || {};

            let whereClauses = ["cr.status = 'active'"];
            let params = [];

            if (scope && scope !== 'all') {
                params.push(scope);
                whereClauses.push(`cr.scope = $${params.length}`);
            }

            if (department_id && department_id !== 'all') {
                params.push(department_id);
                whereClauses.push(`cr.department_id = $${params.length}`);
            }

            if (has_fine === 'true' || has_fine === true) {
                whereClauses.push(`(cr.has_fine = true OR cr.has_manager_fine = true)`);
            }

            if (year && year !== 'all' && !isNaN(Number(year))) {
                params.push(Number(year));
                whereClauses.push(`EXTRACT(YEAR FROM cr.effective_date) = $${params.length}`);
            }

            if (month && month !== 'all' && !isNaN(Number(month))) {
                params.push(Number(month));
                whereClauses.push(`EXTRACT(MONTH FROM cr.effective_date) = $${params.length}`);
            }

            if (search && search.trim()) {
                params.push(`%${search.trim()}%`);
                const pIdx = params.length;
                whereClauses.push(`(cr.rule_code ILIKE $${pIdx} OR cr.title ILIKE $${pIdx} OR cr.content ILIKE $${pIdx} OR cr.created_by_name ILIKE $${pIdx} OR cr.manager_name ILIKE $${pIdx})`);
            }

            const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

            const sql = `
                SELECT 
                    cr.*,
                    d.name as department_name,
                    d.code as department_code
                FROM company_rules cr
                LEFT JOIN departments d ON d.id = cr.department_id
                ${whereSql}
                ORDER BY cr.rule_code ASC, cr.created_at DESC
            `;

            const rules = await db.all(sql, params);

            const stats = await db.get(`
                SELECT 
                    COUNT(*) as total_rules,
                    COUNT(CASE WHEN scope = 'chung' THEN 1 END) as general_rules,
                    COUNT(CASE WHEN scope = 'phong_ban' THEN 1 END) as dept_rules,
                    COUNT(CASE WHEN has_fine = true OR has_manager_fine = true THEN 1 END) as fine_rules
                FROM company_rules
                WHERE status = 'active'
            `);

            return {
                rules,
                stats: {
                    totalRules: Number(stats ? stats.total_rules : 0),
                    generalRules: Number(stats ? stats.general_rules : 0),
                    deptRules: Number(stats ? stats.dept_rules : 0),
                    fineRules: Number(stats ? stats.fine_rules : 0)
                }
            };
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: 'Lỗi lấy danh sách nội quy' });
        }
    });

    // POST /api/company-rules - Thêm điều khoản mới
    fastify.post('/api/company-rules', async (req, reply) => {
        try {
            const {
                scope,
                department_id,
                rule_code,
                title,
                content,
                doc_link,
                image_url,
                effective_date,
                is_forever,
                expiry_date,
                has_fine,
                fine_amount,
                has_manager_fine,
                manager_fine_amount,
                manager_user_id,
                manager_name
            } = req.body || {};

            if (!title || !title.trim()) return reply.code(400).send({ error: 'Vui lòng nhập tiêu đề nội quy' });
            if (!content || !content.trim()) return reply.code(400).send({ error: 'Vui lòng nhập nội dung nội quy' });
            if (!effective_date) return reply.code(400).send({ error: 'Vui lòng chọn ngày áp dụng' });

            const ruleScope = scope === 'chung' ? 'chung' : 'phong_ban';
            const deptId = ruleScope === 'chung' ? null : (department_id ? Number(department_id) : null);

            // Auto-generate rule_code
            let prefix = 'NQ-CHUNG';
            if (ruleScope === 'phong_ban' && deptId) {
                const dept = await db.get('SELECT name, code FROM departments WHERE id = $1', [deptId]);
                if (dept) prefix = getDepartmentPrefix(dept.name, dept.code);
            }
            const rows = await db.all(`SELECT rule_code FROM company_rules WHERE rule_code LIKE $1 || '%'`, [prefix]);
            let maxNum = 0;
            rows.forEach(r => {
                const numStr = r.rule_code.replace(prefix, '').replace(/[^0-9]/g, '');
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            });
            const finalCode = prefix + String(maxNum + 1).padStart(4, '0');

            const user = req.user || {};
            const createdByName = user.fullname || user.name || user.username || 'Quản lý Hệ Thống';
            const createdByUserId = user.id || null;

            const isForeverVal = is_forever !== false && is_forever !== 'false';
            const expiryDateVal = isForeverVal ? null : (expiry_date || null);

            const res = await db.run(`
                INSERT INTO company_rules 
                (rule_code, scope, department_id, title, content, doc_link, image_url, effective_date, is_forever, expiry_date, created_by_user_id, created_by_name, has_fine, fine_amount, has_manager_fine, manager_fine_amount, manager_user_id, manager_name, status, created_at, updated_at)
                VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active', NOW(), NOW())
            `, [
                finalCode,
                ruleScope,
                deptId,
                title.trim(),
                content.trim(),
                doc_link ? doc_link.trim() : null,
                image_url ? image_url.trim() : null,
                effective_date,
                isForeverVal,
                expiryDateVal,
                createdByUserId,
                createdByName,
                has_fine ? true : false,
                Number(fine_amount) || 0,
                has_manager_fine ? true : false,
                Number(manager_fine_amount) || 0,
                manager_user_id ? Number(manager_user_id) : null,
                manager_name ? manager_name.trim() : null
            ]);

            return { success: true, message: 'Tạo điều khoản mới thành công', id: res.lastInsertRowid, rule_code: finalCode };
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: 'Lỗi tạo mới điều khoản' });
        }
    });

    // PUT /api/company-rules/:id - Cập nhật điều khoản
    fastify.put('/api/company-rules/:id', async (req, reply) => {
        try {
            const { id } = req.params;
            const {
                scope,
                department_id,
                title,
                content,
                doc_link,
                image_url,
                effective_date,
                is_forever,
                expiry_date,
                has_fine,
                fine_amount,
                has_manager_fine,
                manager_fine_amount,
                manager_user_id,
                manager_name
            } = req.body || {};

            const rule = await db.get('SELECT id FROM company_rules WHERE id = $1', [id]);
            if (!rule) return reply.code(404).send({ error: 'Không tìm thấy điều khoản cần sửa' });
            if (!title || !title.trim()) return reply.code(400).send({ error: 'Vui lòng nhập tiêu đề' });
            if (!content || !content.trim()) return reply.code(400).send({ error: 'Vui lòng nhập nội dung' });

            const ruleScope = scope === 'chung' ? 'chung' : 'phong_ban';
            const deptId = ruleScope === 'chung' ? null : (department_id ? Number(department_id) : null);
            const isForeverVal = is_forever !== false && is_forever !== 'false';
            const expiryDateVal = isForeverVal ? null : (expiry_date || null);

            await db.run(`
                UPDATE company_rules
                SET 
                    scope = $1,
                    department_id = $2,
                    title = $3,
                    content = $4,
                    doc_link = $5,
                    image_url = $6,
                    effective_date = $7,
                    is_forever = $8,
                    expiry_date = $9,
                    has_fine = $10,
                    fine_amount = $11,
                    has_manager_fine = $12,
                    manager_fine_amount = $13,
                    manager_user_id = $14,
                    manager_name = $15,
                    updated_at = NOW()
                WHERE id = $16
            `, [
                ruleScope,
                deptId,
                title.trim(),
                content.trim(),
                doc_link ? doc_link.trim() : null,
                image_url ? image_url.trim() : null,
                effective_date,
                isForeverVal,
                expiryDateVal,
                has_fine ? true : false,
                Number(fine_amount) || 0,
                has_manager_fine ? true : false,
                Number(manager_fine_amount) || 0,
                manager_user_id ? Number(manager_user_id) : null,
                manager_name ? manager_name.trim() : null,
                id
            ]);

            return { success: true, message: 'Cập nhật điều khoản thành công' };
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: 'Lỗi cập nhật điều khoản' });
        }
    });

    // DELETE /api/company-rules/:id - Xóa điều khoản
    fastify.delete('/api/company-rules/:id', async (req, reply) => {
        try {
            const { id } = req.params;
            await db.run("UPDATE company_rules SET status = 'inactive', updated_at = NOW() WHERE id = $1", [id]);
            return { success: true, message: 'Đã xóa điều khoản thành công' };
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: 'Lỗi xóa điều khoản' });
        }
    });
}

module.exports = companyRulesRoutes;
