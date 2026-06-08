// ========== LƯƠNG THỢ ÉP (SETTINGS) — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE / SCHEMA SETUP ==========
    try {
        // 1. Table for salary tiers
        await db.exec(`CREATE TABLE IF NOT EXISTS pressing_salary_tiers (
            id              SERIAL PRIMARY KEY,
            tier_name       VARCHAR(100) NOT NULL,
            price_chest_arm NUMERIC DEFAULT 0, -- Ngực, Tay, Tạp Dề Vải Mũ
            price_back_belly NUMERIC DEFAULT 0, -- Lưng, Bụng, Sườn Áo Sẵn, Mũ Sẵn
            price_protective NUMERIC DEFAULT 0, -- Bảo Hộ, Bếp, Sơ Mi
            price_packaging NUMERIC DEFAULT 0, -- Đóng Gói, Cổ Bẻ Vải
            price_other     NUMERIC DEFAULT 0, -- Vị Trí Khác
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )`);

        // 2. Table for user tier assignments
        await db.exec(`CREATE TABLE IF NOT EXISTS user_pressing_salary_tiers (
            id              SERIAL PRIMARY KEY,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            tier_id         INTEGER NOT NULL REFERENCES pressing_salary_tiers(id) ON DELETE CASCADE,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )`);

        // 3. Add price snapshot columns on pressing_records
        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS price_chest_arm NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS price_back_belly NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS price_protective NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS price_packaging NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS price_other NUMERIC DEFAULT 0`);

        // Seed initial tier Bậc 1 if empty
        const count = await db.get(`SELECT COUNT(*)::int AS cnt FROM pressing_salary_tiers`);
        if (count && count.cnt === 0) {
            await db.run(`
                INSERT INTO pressing_salary_tiers (
                    tier_name, price_chest_arm, price_back_belly, price_protective, price_packaging, price_other
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, ['Bậc 1', 250, 350, 400, 100, 250]);
            console.log('[LTE] Seeded initial pressing tier Bậc 1');
        }

        // Sync price snapshot columns for existing pressing records from current assignments or 0 if no assignment
        await db.run(`
            UPDATE pressing_records pr
            SET 
              price_chest_arm = COALESCE(t.price_chest_arm, 0),
              price_back_belly = COALESCE(t.price_back_belly, 0),
              price_protective = COALESCE(t.price_protective, 0),
              price_packaging = COALESCE(t.price_packaging, 0),
              price_other = COALESCE(t.price_other, 0)
            FROM (
              SELECT u.id AS user_id, pt.price_chest_arm, pt.price_back_belly, pt.price_protective, pt.price_packaging, pt.price_other
              FROM users u
              LEFT JOIN user_pressing_salary_tiers ut ON u.id = ut.user_id
              LEFT JOIN pressing_salary_tiers pt ON ut.tier_id = pt.id
            ) t
            WHERE pr.presser_id = t.user_id
        `);

        // Clean up records where presser has no linked tier assignment
        await db.run(`
            UPDATE pressing_records
            SET 
              price_chest_arm = 0,
              price_back_belly = 0,
              price_protective = 0,
              price_packaging = 0,
              price_other = 0
            WHERE presser_id IS NULL OR presser_id NOT IN (SELECT user_id FROM user_pressing_salary_tiers)
        `);

    } catch(e) {
        console.error('[LTE] Database auto-migration error:', e.message);
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

    // ========== API: TIERS CRUD ==========
    fastify.get('/api/pressing-salary/tiers', { preHandler: [authenticate] }, async (req) => {
        const tiers = await db.all(`
            SELECT * FROM pressing_salary_tiers 
            ORDER BY tier_name ASC, id ASC
        `);
        return { tiers };
    });

    fastify.post('/api/pressing-salary/tiers', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền cấu hình bậc lương thợ ép' });
        }
        const { tier_name, price_chest_arm, price_back_belly, price_protective, price_packaging, price_other } = req.body || {};
        if (!tier_name || !tier_name.trim()) return reply.code(400).send({ error: 'Thiếu tên bậc lương' });

        const now = vnNow();
        const result = await db.get(`
            INSERT INTO pressing_salary_tiers (
                tier_name, price_chest_arm, price_back_belly, price_protective, price_packaging, price_other, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
            RETURNING *
        `, [
            tier_name.trim(),
            Number(price_chest_arm) || 0,
            Number(price_back_belly) || 0,
            Number(price_protective) || 0,
            Number(price_packaging) || 0,
            Number(price_other) || 0,
            now
        ]);

        return { success: true, tier: result };
    });

    fastify.put('/api/pressing-salary/tiers/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền cấu hình bậc lương thợ ép' });
        }
        const id = Number(req.params.id);
        const { tier_name, price_chest_arm, price_back_belly, price_protective, price_packaging, price_other } = req.body || {};
        if (!tier_name || !tier_name.trim()) return reply.code(400).send({ error: 'Thiếu tên bậc lương' });

        const now = vnNow();
        await db.run(`
            UPDATE pressing_salary_tiers 
            SET tier_name = $1, 
                price_chest_arm = $2, 
                price_back_belly = $3, 
                price_protective = $4, 
                price_packaging = $5, 
                price_other = $6, 
                updated_at = $7 
            WHERE id = $8
        `, [
            tier_name.trim(),
            Number(price_chest_arm) || 0,
            Number(price_back_belly) || 0,
            Number(price_protective) || 0,
            Number(price_packaging) || 0,
            Number(price_other) || 0,
            now,
            id
        ]);

        return { success: true };
    });

    fastify.delete('/api/pressing-salary/tiers/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền cấu hình bậc lương thợ ép' });
        }
        const id = Number(req.params.id);
        
        // Check if assigned
        const isAssigned = await db.get(`SELECT id FROM user_pressing_salary_tiers WHERE tier_id = $1 LIMIT 1`, [id]);
        if (isAssigned) {
            return reply.code(400).send({ error: 'Bậc lương này đang được gán cho nhân viên. Không thể xóa.' });
        }

        await db.run(`DELETE FROM pressing_salary_tiers WHERE id = $1`, [id]);
        return { success: true };
    });

    // ========== API: ASSIGNMENTS ==========
    fastify.get('/api/pressing-salary/assignments', { preHandler: [authenticate] }, async (req) => {
        // Fetch active pressers / workers in department 'ép' or role 'ep' or who already have assignments
        const pressers = await db.all(`
            SELECT u.id, u.full_name, u.username, u.role, d.name AS dept_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.status = 'active'
              AND (
                LOWER(COALESCE(d.name, '')) LIKE '%ép%'
                OR LOWER(COALESCE(d.name, '')) LIKE '%ep%'
                OR u.role IN ('nhanvienep', 'nhan_vien_ep')
                OR u.id IN (SELECT user_id FROM user_pressing_salary_tiers)
              )
            ORDER BY u.full_name ASC
        `);

        // Fetch current assignments
        const assignments = await db.all(`
            SELECT user_id, tier_id 
            FROM user_pressing_salary_tiers
        `);

        // Fetch all available tiers for assigning
        const tiers = await db.all(`
            SELECT id, tier_name 
            FROM pressing_salary_tiers 
            ORDER BY tier_name ASC
        `);

        return { pressers, assignments, tiers };
    });

    fastify.post('/api/pressing-salary/assignments', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền gán bậc lương thợ ép' });
        }
        const { user_id, tier_id } = req.body || {};
        if (!user_id) return reply.code(400).send({ error: 'Thiếu ID nhân viên' });

        const userId = Number(user_id);
        const now = vnNow();

        if (!tier_id) {
            // Delete assignment if tier_id is null/empty
            await db.run(`
                DELETE FROM user_pressing_salary_tiers 
                WHERE user_id = $1
            `, [userId]);
            return { success: true, deleted: true };
        } else {
            const tierId = Number(tier_id);
            // Insert or Update assignment
            await db.run(`
                INSERT INTO user_pressing_salary_tiers (user_id, tier_id, updated_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (user_id) 
                DO UPDATE SET tier_id = EXCLUDED.tier_id, updated_at = EXCLUDED.updated_at
            `, [userId, tierId, now]);
            return { success: true };
        }
    });

};
