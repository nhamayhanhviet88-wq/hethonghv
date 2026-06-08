// ========== LƯƠNG THỢ ÉP (SETTINGS) — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE / SCHEMA SETUP ==========
    try {
        // 0. Table for pressing positions configurations
        await db.exec(`CREATE TABLE IF NOT EXISTS pressing_positions (
            id              SERIAL PRIMARY KEY,
            key_code        VARCHAR(50) UNIQUE NOT NULL,
            display_name    VARCHAR(255) NOT NULL,
            is_active       BOOLEAN DEFAULT TRUE,
            display_order   INTEGER DEFAULT 0,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            updated_at      TIMESTAMPTZ DEFAULT NOW()
        )`);

        // Seed default positions if empty
        const posCount = await db.get(`SELECT COUNT(*)::int AS cnt FROM pressing_positions`);
        if (posCount && posCount.cnt === 0) {
            await db.run(`
                INSERT INTO pressing_positions (key_code, display_name, display_order)
                VALUES 
                  ('pos_chest_arm', 'Ngực, Tay, Tạp Dề Vải Mũ', 1),
                  ('pos_back_belly', 'Lưng, Bụng, Sườn Áo Sẵn, Mũ Sẵn', 2),
                  ('pos_protective', 'Bảo Hộ, Bếp, Sơ Mi', 3),
                  ('pos_packaging', 'Đóng Gói, Cổ Bẻ Vải', 4),
                  ('pos_other', 'Vị Trí Khác', 5)
            `);
            console.log('[LTE] Seeded default pressing positions');
        }

        // Fetch and run ALTER TABLE statements to ensure all position columns exist dynamically
        const allPositions = await db.all(`SELECT key_code FROM pressing_positions`);
        for (const pos of allPositions) {
            const qtyCol = pos.key_code;
            const prcCol = qtyCol.startsWith('pos_') && !['pos_chest_arm', 'pos_back_belly', 'pos_protective', 'pos_packaging', 'pos_other'].includes(qtyCol)
                ? 'price_' + qtyCol
                : qtyCol.replace('pos_', 'price_');
            
            // Alter pressing_records qty column (except default ones which exist)
            if (!['pos_chest_arm', 'pos_back_belly', 'pos_protective', 'pos_packaging', 'pos_other'].includes(qtyCol)) {
                await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS ${qtyCol} NUMERIC DEFAULT 0`);
            }
            // Alter pressing_records price column
            await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS ${prcCol} NUMERIC DEFAULT 0`);
            // Alter pressing_salary_tiers price column
            await db.exec(`ALTER TABLE pressing_salary_tiers ADD COLUMN IF NOT EXISTS ${prcCol} NUMERIC DEFAULT 0`);
        }

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
        const { tier_name } = req.body || {};
        if (!tier_name || !tier_name.trim()) return reply.code(400).send({ error: 'Thiếu tên bậc lương' });

        const positions = await db.all(`SELECT key_code FROM pressing_positions`);
        const columns = ['tier_name', 'created_at', 'updated_at'];
        const values = [tier_name.trim(), vnNow(), vnNow()];
        const placeholders = ['$1', '$2', '$3'];

        positions.forEach((pos) => {
            const prcCol = pos.key_code.startsWith('pos_') && !['pos_chest_arm', 'pos_back_belly', 'pos_protective', 'pos_packaging', 'pos_other'].includes(pos.key_code)
                ? 'price_' + pos.key_code
                : pos.key_code.replace('pos_', 'price_');
            
            columns.push(prcCol);
            values.push(Number(req.body[prcCol]) || 0);
            placeholders.push(`$${columns.length}`);
        });

        const sql = `
            INSERT INTO pressing_salary_tiers (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING *
        `;
        const result = await db.get(sql, values);
        return { success: true, tier: result };
    });

    fastify.put('/api/pressing-salary/tiers/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền cấu hình bậc lương thợ ép' });
        }
        const id = Number(req.params.id);
        const { tier_name } = req.body || {};
        if (!tier_name || !tier_name.trim()) return reply.code(400).send({ error: 'Thiếu tên bậc lương' });

        const positions = await db.all(`SELECT key_code FROM pressing_positions`);
        const setClauses = ['tier_name = $1', 'updated_at = $2'];
        const values = [tier_name.trim(), vnNow()];

        positions.forEach((pos) => {
            const prcCol = pos.key_code.startsWith('pos_') && !['pos_chest_arm', 'pos_back_belly', 'pos_protective', 'pos_packaging', 'pos_other'].includes(pos.key_code)
                ? 'price_' + pos.key_code
                : pos.key_code.replace('pos_', 'price_');
            
            values.push(Number(req.body[prcCol]) || 0);
            setClauses.push(`${prcCol} = $${values.length}`);
        });

        values.push(id);
        const sql = `
            UPDATE pressing_salary_tiers 
            SET ${setClauses.join(', ')}
            WHERE id = $${values.length}
        `;
        await db.run(sql, values);
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

    // ========== API: PRESSING POSITIONS ==========
    fastify.get('/api/pressing/positions', { preHandler: [authenticate] }, async (req) => {
        const positions = await db.all(`
            SELECT * FROM pressing_positions 
            ORDER BY display_order ASC, id ASC
        `);
        return { positions };
    });

    fastify.post('/api/pressing/positions', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền cấu hình vị trí ép' });
        }
        const { display_name } = req.body || {};
        if (!display_name || !display_name.trim()) {
            return reply.code(400).send({ error: 'Thiếu tên vị trí' });
        }

        const maxIdRow = await db.get(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM pressing_positions`);
        const nextId = maxIdRow.next_id;
        const keyCode = `pos_${nextId}`;

        const maxOrderRow = await db.get(`SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM pressing_positions`);
        const nextOrder = maxOrderRow.next_order;

        const now = vnNow();
        const result = await db.get(`
            INSERT INTO pressing_positions (key_code, display_name, display_order, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, TRUE, $4, $4)
            RETURNING *
        `, [keyCode, display_name.trim(), nextOrder, now]);

        // Alter pressing_records qty & price, and pressing_salary_tiers price
        const qtyCol = keyCode;
        const prcCol = 'price_' + keyCode;

        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS ${qtyCol} NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS ${prcCol} NUMERIC DEFAULT 0`);
        await db.exec(`ALTER TABLE pressing_salary_tiers ADD COLUMN IF NOT EXISTS ${prcCol} NUMERIC DEFAULT 0`);

        return { success: true, position: result };
    });

    fastify.put('/api/pressing/positions/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isSalaryManager(req))) {
            return reply.code(403).send({ error: 'Không có quyền cấu hình vị trí ép' });
        }
        const id = Number(req.params.id);
        const { display_name, display_order, is_active } = req.body || {};
        if (!display_name || !display_name.trim()) {
            return reply.code(400).send({ error: 'Thiếu tên vị trí' });
        }

        const now = vnNow();
        await db.run(`
            UPDATE pressing_positions
            SET display_name = $1,
                display_order = $2,
                is_active = $3,
                updated_at = $4
            WHERE id = $5
        `, [
            display_name.trim(),
            Number(display_order) || 0,
            is_active === undefined ? true : !!is_active,
            now,
            id
        ]);

        return { success: true };
    });

};
