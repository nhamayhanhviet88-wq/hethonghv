const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { getProductionCutoff, getTestAccountIds, buildProductionFilter } = require('../utils/productionMode');

async function ctvQuotationsRoutes(fastify, options) {

    // Helper to get managed department IDs recursively
    async function getManagedDeptIds(userId) {
        const headDepts = await db.all('SELECT id FROM departments WHERE head_user_id = ? AND status = ?', [userId, 'active']);
        const allIds = new Set();
        const queue = headDepts.map(d => d.id);
        const dbUser = await db.get('SELECT department_id FROM users WHERE id = ?', [userId]);
        if (dbUser && dbUser.department_id) queue.push(dbUser.department_id);
        while (queue.length > 0) {
            const dId = queue.shift();
            if (allIds.has(dId)) continue;
            allIds.add(dId);
            const children = await db.all('SELECT id FROM departments WHERE parent_id = ? AND status = ?', [dId, 'active']);
            children.forEach(c => queue.push(c.id));
        }
        return [...allIds];
    }

    // 1. GET Active Pricing Configuration
    fastify.get('/api/ctv-quotations/config/active', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const config = await db.get("SELECT * FROM ctv_price_configs WHERE status = 'active'");
            if (!config) {
                return reply.code(404).send({ error: 'Chưa có cấu hình bảng giá nào đang hoạt động' });
            }
            config.materials = typeof config.materials === 'string' ? JSON.parse(config.materials) : config.materials;
            config.surcharges = typeof config.surcharges === 'string' ? JSON.parse(config.surcharges) : config.surcharges;
            config.print_prices = typeof config.print_prices === 'string' ? JSON.parse(config.print_prices) : config.print_prices;
            return { config };
        } catch (err) {
            return reply.code(500).send({ error: 'Lỗi lấy cấu hình bảng giá active: ' + err.message });
        }
    });

    // 2. GET Configuration Version History (Director & Senior Manager only)
    fastify.get('/api/ctv-quotations/config/history', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao')] }, async (request, reply) => {
        try {
            const history = await db.all(`
                SELECT c.*, u.full_name as creator_name 
                FROM ctv_price_configs c 
                LEFT JOIN users u ON c.created_by = u.id 
                ORDER BY c.created_at DESC
            `);
            history.forEach(c => {
                c.materials = typeof c.materials === 'string' ? JSON.parse(c.materials) : c.materials;
                c.surcharges = typeof c.surcharges === 'string' ? JSON.parse(c.surcharges) : c.surcharges;
                c.print_prices = typeof c.print_prices === 'string' ? JSON.parse(c.print_prices) : c.print_prices;
            });
            return { history };
        } catch (err) {
            return reply.code(500).send({ error: 'Lỗi lấy lịch sử bảng giá: ' + err.message });
        }
    });

    // 3. POST Create New Configuration Version (Director & Senior Manager only)
    fastify.post('/api/ctv-quotations/config', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const { version_name, materials, surcharges, print_prices, apply_now } = request.body || {};
        if (!version_name) {
            return reply.code(400).send({ error: 'Vui lòng điền tên phiên bản' });
        }
        if (!materials || !Array.isArray(materials)) {
            return reply.code(400).send({ error: 'Danh sách chất liệu không hợp lệ' });
        }
        if (!surcharges || typeof surcharges !== 'object') {
            return reply.code(400).send({ error: 'Bảng phụ phí không hợp lệ' });
        }
        if (!print_prices || typeof print_prices !== 'object') {
            return reply.code(400).send({ error: 'Bảng giá in không hợp lệ' });
        }

        try {
            const status = apply_now ? 'active' : 'inactive';
            if (apply_now) {
                // Set all other configurations to inactive first
                await db.run("UPDATE ctv_price_configs SET status = 'inactive' WHERE status = 'active'");
            }

            const result = await db.run(
                `INSERT INTO ctv_price_configs (version_name, materials, surcharges, print_prices, status, created_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    version_name,
                    JSON.stringify(materials),
                    JSON.stringify(surcharges),
                    JSON.stringify(print_prices),
                    status,
                    request.user.id
                ]
            );

            return { success: true, message: 'Đã lưu cấu hình bảng giá mới thành công', id: result.lastInsertRowid };
        } catch (err) {
            return reply.code(500).send({ error: 'Lỗi lưu cấu hình mới: ' + err.message });
        }
    });

    // 4. POST Apply / Activate Pricing Version (Director & Senior Manager only)
    fastify.post('/api/ctv-quotations/config/:id/apply', { preHandler: [authenticate, requireRole('giam_doc', 'quan_ly_cap_cao')] }, async (request, reply) => {
        const configId = Number(request.params.id);
        if (isNaN(configId)) {
            return reply.code(400).send({ error: 'ID cấu hình không hợp lệ' });
        }

        try {
            // Verify if target config exists
            const target = await db.get("SELECT id FROM ctv_price_configs WHERE id = ?", [configId]);
            if (!target) {
                return reply.code(404).send({ error: 'Không tìm thấy cấu hình bảng giá được yêu cầu' });
            }

            // Set all to inactive, then activate target config
            await db.run("UPDATE ctv_price_configs SET status = 'inactive' WHERE status = 'active'");
            await db.run("UPDATE ctv_price_configs SET status = 'active', updated_at = NOW() WHERE id = ?", [configId]);

            return { success: true, message: 'Đã kích hoạt áp dụng bảng giá thành công' };
        } catch (err) {
            return reply.code(500).send({ error: 'Lỗi kích hoạt bảng giá: ' + err.message });
        }
    });

    // 5. GET Autocomplete CRM Customers (scoped by role permissions)
    fastify.get('/api/ctv-quotations/customers', { preHandler: [authenticate] }, async (request, reply) => {
        const { search } = request.query || {};
        const user = request.user;

        let query = `SELECT c.id, c.customer_name, c.phone, c.crm_type FROM customers c WHERE 1=1`;
        const params = [];

        // Apply production mode filters to exclude test data
        const _cutoff = await getProductionCutoff();
        const _testIds = await getTestAccountIds();
        const _prodFilter = buildProductionFilter(_cutoff, _testIds, 'c.created_at', 'c.created_by');
        if (_prodFilter) {
            query += _prodFilter;
        }

        if (search) {
            query += ` AND (c.customer_name ILIKE ? OR c.phone LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        // Limit customer types if required (e.g. ctv, ctv_hoa_hong, nhu_cau, koc_tiktok)
        query += ` AND c.crm_type IN ('nhu_cau', 'ctv', 'ctv_hoa_hong', 'koc_tiktok')`;

        // Permission Scoping
        if (user.role !== 'giam_doc' && user.role !== 'quan_ly_cap_cao') {
            if (user.role === 'truong_phong' || user.role === 'quan_ly') {
                const managedDeptIds = await getManagedDeptIds(user.id);
                let managedUserIds = [user.id];
                if (managedDeptIds.length > 0) {
                    const staff = await db.all(
                        `SELECT id FROM users WHERE department_id IN (${managedDeptIds.map(() => '?').join(',')}) AND status = 'active'`,
                        managedDeptIds
                    );
                    staff.forEach(u => {
                        if (!managedUserIds.includes(u.id)) managedUserIds.push(u.id);
                    });
                }
                const placeholders = managedUserIds.map(() => '?').join(',');
                query += ` AND c.assigned_to_id IN (${placeholders})`;
                params.push(...managedUserIds);
            } else {
                query += ` AND c.assigned_to_id = ?`;
                params.push(user.id);
            }
        }

        query += ` ORDER BY c.customer_name ASC LIMIT 50`;

        try {
            const customers = await db.all(query, params);
            return { customers };
        } catch (err) {
            return reply.code(500).send({ error: 'Lỗi tìm kiếm khách hàng: ' + err.message });
        }
    });

    // 6. POST Save New Quotation calculation
    fastify.post('/api/ctv-quotations', { preHandler: [authenticate] }, async (request, reply) => {
        const { customer_id, config_version_id, input_details, calculated_price, total_amount } = request.body || {};
        if (!customer_id) {
            return reply.code(400).send({ error: 'Vui lòng chọn khách hàng' });
        }
        if (!input_details || typeof input_details !== 'object') {
            return reply.code(400).send({ error: 'Dữ liệu tính toán không hợp lệ' });
        }
        if (calculated_price === undefined || total_amount === undefined) {
            return reply.code(400).send({ error: 'Thiếu thông tin giá tính toán' });
        }

        try {
            // Find target configuration to store as snapshot
            let configRow;
            if (config_version_id) {
                configRow = await db.get("SELECT * FROM ctv_price_configs WHERE id = ?", [Number(config_version_id)]);
            } else {
                configRow = await db.get("SELECT * FROM ctv_price_configs WHERE status = 'active'");
            }

            if (!configRow) {
                return reply.code(400).send({ error: 'Không tìm thấy cấu hình bảng giá để làm mẫu chụp snapshot' });
            }

            // Standardize json fields
            const configSnapshot = {
                id: configRow.id,
                version_name: configRow.version_name,
                materials: typeof configRow.materials === 'string' ? JSON.parse(configRow.materials) : configRow.materials,
                surcharges: typeof configRow.surcharges === 'string' ? JSON.parse(configRow.surcharges) : configRow.surcharges,
                print_prices: typeof configRow.print_prices === 'string' ? JSON.parse(configRow.print_prices) : configRow.print_prices,
                created_at: configRow.created_at
            };

            const result = await db.run(
                `INSERT INTO ctv_quotations (customer_id, config_version_id, config_snapshot, input_details, calculated_price, total_amount, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    Number(customer_id),
                    configRow.id,
                    JSON.stringify(configSnapshot),
                    JSON.stringify(input_details),
                    Number(calculated_price),
                    Number(total_amount),
                    request.user.id
                ]
            );

            return { success: true, message: 'Đã lưu lịch sử tính báo giá thành công', id: result.lastInsertRowid };
        } catch (err) {
            return reply.code(500).send({ error: 'Lỗi lưu báo giá: ' + err.message });
        }
    });

    // 7. GET Quotation Calculation History Logs (scoped by permissions)
    fastify.get('/api/ctv-quotations', { preHandler: [authenticate] }, async (request, reply) => {
        const { search, year, month } = request.query || {};
        const user = request.user;

        let query = `
            SELECT q.*, c.customer_name, c.phone as customer_phone, c.crm_type as customer_crm_type,
                   u.full_name as creator_name, cfg.version_name as config_version_name
            FROM ctv_quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN users u ON q.created_by = u.id
            LEFT JOIN ctv_price_configs cfg ON q.config_version_id = cfg.id
            WHERE 1=1
        `;
        const params = [];

        // Apply production mode filters to exclude test data
        const _cutoff = await getProductionCutoff();
        const _testIds = await getTestAccountIds();
        const _prodFilter = buildProductionFilter(_cutoff, _testIds, 'q.created_at', 'q.created_by', { assignedToCol: 'c.assigned_to_id' });
        if (_prodFilter) {
            query += _prodFilter;
        }

        if (search) {
            query += ` AND (c.customer_name ILIKE ? OR c.phone LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (year) {
            query += ` AND EXTRACT(YEAR FROM q.created_at) = ?`;
            params.push(Number(year));
        }

        if (month) {
            query += ` AND EXTRACT(MONTH FROM q.created_at) = ?`;
            params.push(Number(month));
        }

        // Scope to role permissions
        if (user.role !== 'giam_doc' && user.role !== 'quan_ly_cap_cao') {
            if (user.role === 'truong_phong' || user.role === 'quan_ly') {
                const managedDeptIds = await getManagedDeptIds(user.id);
                let managedUserIds = [user.id];
                if (managedDeptIds.length > 0) {
                    const staff = await db.all(
                        `SELECT id FROM users WHERE department_id IN (${managedDeptIds.map(() => '?').join(',')}) AND status = 'active'`,
                        managedDeptIds
                    );
                    staff.forEach(u => {
                        if (!managedUserIds.includes(u.id)) managedUserIds.push(u.id);
                    });
                }
                const placeholders = managedUserIds.map(() => '?').join(',');
                query += ` AND q.created_by IN (${placeholders})`;
                params.push(...managedUserIds);
            } else {
                query += ` AND q.created_by = ?`;
                params.push(user.id);
            }
        }

        query += ` ORDER BY q.created_at DESC`;

        try {
            const quotations = await db.all(query, params);
            quotations.forEach(q => {
                q.config_snapshot = typeof q.config_snapshot === 'string' ? JSON.parse(q.config_snapshot) : q.config_snapshot;
                q.input_details = typeof q.input_details === 'string' ? JSON.parse(q.input_details) : q.input_details;
            });
            return { quotations };
        } catch (err) {
            return reply.code(500).send({ error: 'Lỗi lấy lịch sử tính báo giá: ' + err.message });
        }
    });
}

module.exports = ctvQuotationsRoutes;
