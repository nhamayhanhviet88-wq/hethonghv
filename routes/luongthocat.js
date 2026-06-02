// ========== LƯƠNG THỢ CẮT (SETTINGS) — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE / SCHEMA SETUP ==========
    try {
        // 1. Table for salary tiers
        await db.exec(`CREATE TABLE IF NOT EXISTS cutting_salary_tiers (
            id              SERIAL PRIMARY KEY,
            tier_name       VARCHAR(100) NOT NULL,
            product_type    VARCHAR(100) NOT NULL,
            rules           JSONB NOT NULL, -- Array of [{"min_qty": 1, "max_qty": 299, "price": 400}, ...]
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )`);

        // 2. Table for user tier assignments
        await db.exec(`CREATE TABLE IF NOT EXISTS user_cutting_salary_tiers (
            id              SERIAL PRIMARY KEY,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            product_type    VARCHAR(100) NOT NULL,
            tier_id         INTEGER NOT NULL REFERENCES cutting_salary_tiers(id) ON DELETE CASCADE,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT uniq_user_prod UNIQUE (user_id, product_type)
        )`);
    } catch(e) {
        console.error('[LTC] Database auto-migration error:', e.message);
    }

    // ========== HELPERS ==========
    const MGMT_ROLES = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'];
    async function isSalaryManager(req) {
        if (MGMT_ROLES.includes(req.user.role)) return true;
        const u = await db.get(`
            SELECT u.id, d.name AS dept_name, d.code AS dept_code
            FROM users u 
            LEFT JOIN departments d ON u.department_id = d.id 
            WHERE u.id = $1
        `, [req.user.id]);
        if (u && u.dept_name) {
            const n = u.dept_name.toLowerCase();
            const c = (u.dept_code || '').toLowerCase();
            return (
                n.includes('kế toán') || c.includes('ketoan') ||
                n.includes('thủ quỹ') || c.includes('thuquy') ||
                n.includes('quản lý xưởng') || n.includes('qlx') ||
                n.includes('nhân sự') || n.includes('hành chính')
            );
        }
        return false;
    }

    // ========== API: PRODUCT TYPES ==========
    fastify.get('/api/cutting-salary/product-types', { preHandler: [authenticate] }, async (req) => {
        const rows = await db.all(`
            SELECT id, name 
            FROM dht_settings_options 
            WHERE category = 'cutting_category' AND is_active = true 
            ORDER BY display_order ASC, id ASC
        `);
        return { product_types: rows.map(r => r.name) };
    });

    // ========== API: TIERS CRUD ==========
    fastify.get('/api/cutting-salary/tiers', { preHandler: [authenticate] }, async (req) => {
        const tiers = await db.all(`
            SELECT * FROM cutting_salary_tiers 
            ORDER BY product_type ASC, tier_name ASC, id ASC
        `);
        return { tiers };
    });

    fastify.post('/api/cutting-salary/tiers', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền cấu hình bậc lương' });
        }
        const { tier_name, product_type, rules } = req.body || {};
        if (!tier_name || !tier_name.trim()) return reply.code(400).send({ error: 'Thiếu tên bậc lương' });
        if (!product_type || !product_type.trim()) return reply.code(400).send({ error: 'Thiếu loại sản phẩm' });
        if (!Array.isArray(rules) || rules.length === 0) return reply.code(400).send({ error: 'Thiếu hoặc sai định dạng khoảng số lượng' });

        // Validate rules
        for (const rule of rules) {
            if (rule.min_qty === undefined || rule.min_qty === null || isNaN(Number(rule.min_qty))) {
                return reply.code(400).send({ error: 'Min Qty không hợp lệ trong rules' });
            }
            if (rule.price === undefined || rule.price === null || isNaN(Number(rule.price))) {
                return reply.code(400).send({ error: 'Đơn giá không hợp lệ trong rules' });
            }
        }

        const now = vnNow();
        const result = await db.get(`
            INSERT INTO cutting_salary_tiers (tier_name, product_type, rules, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $4)
            RETURNING *
        `, [tier_name.trim(), product_type.trim(), JSON.stringify(rules), now]);

        return { success: true, tier: result };
    });

    fastify.put('/api/cutting-salary/tiers/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền cấu hình bậc lương' });
        }
        const id = Number(req.params.id);
        const { tier_name, product_type, rules } = req.body || {};
        if (!tier_name || !tier_name.trim()) return reply.code(400).send({ error: 'Thiếu tên bậc lương' });
        if (!product_type || !product_type.trim()) return reply.code(400).send({ error: 'Thiếu loại sản phẩm' });
        if (!Array.isArray(rules) || rules.length === 0) return reply.code(400).send({ error: 'Thiếu hoặc sai định dạng khoảng số lượng' });

        // Validate rules
        for (const rule of rules) {
            if (rule.min_qty === undefined || rule.min_qty === null || isNaN(Number(rule.min_qty))) {
                return reply.code(400).send({ error: 'Min Qty không hợp lệ trong rules' });
            }
            if (rule.price === undefined || rule.price === null || isNaN(Number(rule.price))) {
                return reply.code(400).send({ error: 'Đơn giá không hợp lệ trong rules' });
            }
        }

        const now = vnNow();
        await db.run(`
            UPDATE cutting_salary_tiers 
            SET tier_name = $1, product_type = $2, rules = $3, updated_at = $4 
            WHERE id = $5
        `, [tier_name.trim(), product_type.trim(), JSON.stringify(rules), now, id]);

        return { success: true };
    });

    fastify.delete('/api/cutting-salary/tiers/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền cấu hình bậc lương' });
        }
        const id = Number(req.params.id);
        
        // Check if assigned
        const isAssigned = await db.get(`SELECT id FROM user_cutting_salary_tiers WHERE tier_id = $1 LIMIT 1`, [id]);
        if (isAssigned) {
            return reply.code(400).send({ error: 'Bậc lương này đang được gán cho nhân viên. Không thể xóa.' });
        }

        await db.run(`DELETE FROM cutting_salary_tiers WHERE id = $1`, [id]);
        return { success: true };
    });

    // ========== API: ASSIGNMENTS ==========
    fastify.get('/api/cutting-salary/assignments', { preHandler: [authenticate] }, async (req) => {
        // Fetch active cutters
        // Users belonging to department 'phongcat' or with role 'nhanviencat'/'nhan_vien_cat'
        const cutters = await db.all(`
            SELECT u.id, u.full_name, u.username, u.role
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.status = 'active'
              AND (LOWER(COALESCE(d.name, '')) LIKE '%cắt%' 
                   OR LOWER(COALESCE(d.code, '')) LIKE '%cat%' 
                   OR LOWER(COALESCE(d.name, '')) = 'phongcat'
                   OR u.role IN ('nhanviencat', 'nhan_vien_cat'))
            ORDER BY u.full_name ASC
        `);

        // Fetch current assignments
        const assignments = await db.all(`
            SELECT user_id, product_type, tier_id 
            FROM user_cutting_salary_tiers
        `);

        // Fetch all available tiers for assigning
        const tiers = await db.all(`
            SELECT id, tier_name, product_type 
            FROM cutting_salary_tiers 
            ORDER BY product_type ASC, tier_name ASC
        `);

        return { cutters, assignments, tiers };
    });

    fastify.post('/api/cutting-salary/assignments', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền gán bậc lương' });
        }
        const { user_id, product_type, tier_id } = req.body || {};
        if (!user_id) return reply.code(400).send({ error: 'Thiếu ID nhân viên' });
        if (!product_type || !product_type.trim()) return reply.code(400).send({ error: 'Thiếu loại sản phẩm' });

        const userId = Number(user_id);
        const prodType = product_type.trim();
        const now = vnNow();

        if (!tier_id) {
            // Delete assignment if tier_id is null/empty
            await db.run(`
                DELETE FROM user_cutting_salary_tiers 
                WHERE user_id = $1 AND product_type = $2
            `, [userId, prodType]);
            return { success: true, deleted: true };
        } else {
            const tierId = Number(tier_id);
            // Insert or Update assignment
            await db.run(`
                INSERT INTO user_cutting_salary_tiers (user_id, product_type, tier_id, updated_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, product_type) 
                DO UPDATE SET tier_id = EXCLUDED.tier_id, updated_at = EXCLUDED.updated_at
            `, [userId, prodType, tierId, now]);
            return { success: true };
        }
    });

};
