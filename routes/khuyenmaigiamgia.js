const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

async function khuyenMaiRoutes(fastify, options) {
    // Migration: Create promotion_codes table
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS promotion_codes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(8) UNIQUE NOT NULL,
                promo_type VARCHAR(20) NOT NULL, -- 'discount' or 'gift'
                discount_pct DOUBLE PRECISION DEFAULT 0,
                gift_quantity INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active', -- 'active' or 'inactive'
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        // Add applied_coupon column to dht_orders table if not exists
        await db.run(`
            ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS applied_coupon VARCHAR(8)
        `);
        await db.run(`
            ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS promo_discount_amount DOUBLE PRECISION DEFAULT 0
        `);
        await db.run(`
            ALTER TABLE dht_orders ADD COLUMN IF NOT EXISTS promo_gift_info TEXT DEFAULT ''
        `);
        
        // Add max_uses, used_count, expire_at columns to promotion_codes table if not exist
        await db.run(`
            ALTER TABLE promotion_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 1
        `);
        await db.run(`
            ALTER TABLE promotion_codes ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0
        `);
        await db.run(`
            ALTER TABLE promotion_codes ADD COLUMN IF NOT EXISTS expire_at TIMESTAMP DEFAULT NULL
        `);
        await db.run(`
            ALTER TABLE promotion_codes ADD COLUMN IF NOT EXISTS proof_image TEXT DEFAULT NULL
        `);
    } catch(e) {
        console.error('Migration error for promotion_codes:', e);
    }

    // Role verification helper
    function isAllowedUser(user) {
        if (!user) return false;
        return user.role === 'giam_doc' || 
               user.role === 'quan_ly_cap_cao' || 
               user.username === 'leviettrinh' || 
               user.username === 'trinh';
    }

    // Helper to determine who is allowed to enter/edit max_uses
    function canEditMaxUses(user) {
        if (!user) return false;
        
        // ----------------------------------------------------
        // CẤU HÌNH PHÂN QUYỀN SỐ LẦN ÁP DỤNG:
        // - Tài khoản Giám đốc (role === 'giam_doc') hoặc admin được quyền điền số lần áp dụng.
        // - Tài khoản quản lý Lê Việt Trinh (leviettrinh, trinh, hoặc role quan_ly_cap_cao) không được quyền điền (mặc định là 1).
        // ----------------------------------------------------
        if (user.role === 'giam_doc' || user.username === 'admin') {
            return true;
        }
        
        return false;
    }

    const checkPromoManager = (request, reply, done) => {
        if (!isAllowedUser(request.user)) {
            return reply.code(403).send({ error: 'Bạn không có quyền thực hiện thao tác này.' });
        }
        done();
    };

    // Helper to generate a unique 8-character code
    async function generateUniquePromoCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        let exists = true;
        let attempts = 0;
        
        while (exists && attempts < 100) {
            attempts++;
            code = '';
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            // Check if code exists in DB
            const row = await db.get('SELECT id FROM promotion_codes WHERE code = $1', [code]);
            if (!row) {
                exists = false;
            }
        }
        return code;
    }

    // GET /api/promotion-codes - Fetch all promo codes
    fastify.get('/api/promotion-codes', { preHandler: [authenticate, checkPromoManager] }, async (request, reply) => {
        const rows = await db.all(`
            SELECT pc.*, u.full_name as creator_name, u.username as creator_username
            FROM promotion_codes pc
            LEFT JOIN users u ON pc.created_by = u.id
            ORDER BY pc.created_at DESC
        `);
        
        // Dynamically compute exact uses count and applied orders list for each code in the list (including draft orders)
        for (let row of rows) {
            const appliedOrders = await db.all(`
                SELECT o.id, o.order_code, o.is_draft, o.draft_name,
                       COALESCE(u_created.full_name, u_cskh.full_name) AS staff_name
                FROM dht_orders o
                LEFT JOIN users u_created ON o.created_by = u_created.id
                LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
                WHERE UPPER(o.applied_coupon) = UPPER($1)
                UNION
                SELECT DISTINCT o.id, o.order_code, o.is_draft, o.draft_name,
                       COALESCE(u_created.full_name, u_cskh.full_name) AS staff_name
                FROM dht_orders o
                JOIN dht_order_items oi ON o.id = oi.dht_order_id
                LEFT JOIN users u_created ON o.created_by = u_created.id
                LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
                WHERE UPPER(oi.promo_gift_code) = UPPER($1)
            `, [row.code]);
            
            row.applied_orders = appliedOrders || [];
            row.used_count = (appliedOrders || []).length;
        }
        
        return { items: rows, can_edit_max_uses: canEditMaxUses(request.user) };
    });

    // POST /api/promotion-codes - Create a promo code
    fastify.post('/api/promotion-codes', { preHandler: [authenticate, checkPromoManager] }, async (request, reply) => {
        const { promo_type, discount_pct, gift_quantity, max_uses, expire_at, proof_image } = request.body || {};
        
        if (!promo_type || (promo_type !== 'discount' && promo_type !== 'gift')) {
            return reply.code(400).send({ error: 'Loại khuyến mãi không hợp lệ.' });
        }

        const pct = promo_type === 'discount' ? Number(discount_pct) : 0;
        const qty = promo_type === 'gift' ? Number(gift_quantity) : 0;

        if (promo_type === 'discount' && (isNaN(pct) || pct <= 0 || pct > 100)) {
            return reply.code(400).send({ error: 'Phần trăm giảm giá phải lớn hơn 0 và nhỏ hơn hoặc bằng 100.' });
        }
        if (promo_type === 'gift' && (isNaN(qty) || qty <= 0)) {
            return reply.code(400).send({ error: 'Số lượng quà tặng phải lớn hơn 0.' });
        }
        if (!proof_image || !proof_image.trim()) {
            return reply.code(400).send({ error: 'Hình ảnh minh chứng lý do tạo mã khuyến mãi là bắt buộc.' });
        }

        // Determine max_uses based on user permission
        let finalMaxUses = 1;
        if (canEditMaxUses(request.user)) {
            if (max_uses !== undefined && max_uses !== null) {
                const parsed = parseInt(max_uses);
                if (!isNaN(parsed) && parsed > 0) {
                    finalMaxUses = parsed;
                }
            }
        }

        const finalExpireAt = expire_at && expire_at.trim() !== '' ? expire_at.trim() : null;

        const code = await generateUniquePromoCode();
        
        const result = await db.run(`
            INSERT INTO promotion_codes (code, promo_type, discount_pct, gift_quantity, max_uses, expire_at, created_by, proof_image)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [code, promo_type, pct, qty, finalMaxUses, finalExpireAt, request.user.id, proof_image.trim()]);

        const item = await db.get('SELECT * FROM promotion_codes WHERE code = $1', [code]);
        return { success: true, item, message: 'Tạo mã khuyến mãi thành công!' };
    });

    // POST /api/promotion-codes/upload - Upload proof image
    fastify.post('/api/promotion-codes/upload', { preHandler: [authenticate, checkPromoManager] }, async (request, reply) => {
        const data = await request.file();
        if (!data) return reply.code(400).send({ error: 'Không có file' });
        const path = require('path');
        const fs = require('fs');
        const { compressAndSave } = require('../utils/imageCompressor');
        const dir = path.join(__dirname, '..', 'uploads', 'promotions');
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const buf = await data.toBuffer();
        const result = await compressAndSave(buf, dir, 'promo_');
        return { success: true, url: `/uploads/promotions/${result.fileName}` };
    });

    // PUT /api/promotion-codes/:id - Update promo code status
    fastify.put('/api/promotion-codes/:id', { preHandler: [authenticate, checkPromoManager] }, async (request, reply) => {
        const { id } = request.params;
        const { status } = request.body || {};

        if (!status || (status !== 'active' && status !== 'inactive')) {
            return reply.code(400).send({ error: 'Trạng thái không hợp lệ.' });
        }

        await db.run(`
            UPDATE promotion_codes
            SET status = $1, updated_at = NOW()
            WHERE id = $2
        `, [status, Number(id)]);

        return { success: true, message: 'Cập nhật trạng thái thành công!' };
    });

    // DELETE /api/promotion-codes/:id - Delete promo code
    fastify.delete('/api/promotion-codes/:id', { preHandler: [authenticate, checkPromoManager] }, async (request, reply) => {
        const { id } = request.params;
        await db.run('DELETE FROM promotion_codes WHERE id = $1', [Number(id)]);
        return { success: true, message: 'Xóa mã khuyến mãi thành công!' };
    });

    // GET /api/promotion-codes/check - Check/validate promo code
    fastify.get('/api/promotion-codes/check', { preHandler: [authenticate] }, async (request, reply) => {
        const { code } = request.query || {};
        const excludeOrderId = Number(request.query.exclude_order_id || request.query.excludeOrderId || 0);
        if (!code) {
            return reply.code(400).send({ error: 'Thiếu mã khuyến mãi.' });
        }

        const row = await db.get(`
            SELECT * FROM promotion_codes WHERE UPPER(code) = UPPER($1)
        `, [code.trim()]);

        if (!row) {
            return { valid: false, error: 'Mã khuyến mãi không tồn tại.' };
        }
        if (row.status !== 'active') {
            return { valid: false, error: 'Mã khuyến mãi đã hết hạn hoặc bị vô hiệu hóa.' };
        }

        // 1. Check expiration date/time
        if (row.expire_at) {
            const expireTime = new Date(row.expire_at).getTime();
            const nowTime = Date.now();
            if (nowTime > expireTime) {
                return { valid: false, error: 'Mã khuyến mãi đã hết hạn sử dụng.' };
            }
        }

        const discountUses = await db.get(`
            SELECT COUNT(*) as count FROM dht_orders 
            WHERE UPPER(applied_coupon) = UPPER($1)
              AND id != $2
        `, [row.code, excludeOrderId]);

        const giftUses = await db.get(`
            SELECT COUNT(DISTINCT oi.dht_order_id) as count FROM dht_order_items oi
            JOIN dht_orders o ON oi.dht_order_id = o.id
            WHERE UPPER(oi.promo_gift_code) = UPPER($1)
              AND oi.dht_order_id != $2
        `, [row.code, excludeOrderId]);

        const totalUses = (discountUses?.count || 0) + (giftUses?.count || 0);

        if (row.max_uses !== null && totalUses >= row.max_uses) {
            return { valid: false, error: `Mã khuyến mãi đã đạt giới hạn số lần sử dụng (${row.max_uses} lần).` };
        }

        return {
            valid: true,
            code: row.code,
            promo_type: row.promo_type,
            discount_pct: row.discount_pct,
            gift_quantity: row.gift_quantity
        };
    });
}

module.exports = khuyenMaiRoutes;
