const db = require('../db/pool');
const { authenticate, requireRole } = require('../middleware/auth');
const { clearProductionCutoffCache } = require('../utils/productionMode');

// In-memory cache for app configurations to reduce database latency at startup
const appConfigCache = new Map();
const CACHE_TTL_MS = 30000; // 30 seconds

async function settingsRoutes(fastify, options) {
    // Migration: add sort_order + show_in_chuyenso columns if missing
    try {
        await db.run(`ALTER TABLE settings_sources ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`);
        await db.run(`ALTER TABLE settings_sources ADD COLUMN IF NOT EXISTS show_in_chuyenso BOOLEAN DEFAULT false`);
        // Initialize sort_order for existing rows that have 0
        const rows = await db.all('SELECT id FROM settings_sources WHERE sort_order = 0 OR sort_order IS NULL ORDER BY id ASC');
        for (let i = 0; i < rows.length; i++) {
            await db.run('UPDATE settings_sources SET sort_order = $1 WHERE id = $2', [i + 1, rows[i].id]);
        }
    } catch(e) { /* column may already exist */ }

    const tables = {
        'commission-tiers': { table: 'commission_tiers', fields: ['name', 'percentage', 'parent_percentage'], label: 'Tầng hoa hồng' },
        'sources': { table: 'settings_sources', fields: ['name'], label: 'Nguồn khách NV Kinh Doanh' },
        'promotions': { table: 'settings_promotions', fields: ['name'], label: 'Khuyến mãi' },
        'industries': { table: 'settings_industries', fields: ['name'], label: 'Lĩnh vực' }
    };

    // ===== Job Titles per CRM (MUST be before generic :type routes) =====
    fastify.get('/api/settings/job-titles', { preHandler: [authenticate] }, async (request, reply) => {
        const { crm_type } = request.query || {};
        if (crm_type) {
            const items = await db.all('SELECT * FROM settings_job_titles WHERE crm_type = ? ORDER BY id ASC', [crm_type]);
            return { items };
        }
        const items = await db.all('SELECT * FROM settings_job_titles ORDER BY crm_type, id ASC');
        return { items };
    });

    fastify.post('/api/settings/job-titles', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { crm_type, name } = request.body || {};
        if (!crm_type || !name) return reply.code(400).send({ error: 'Thiếu crm_type hoặc tên' });
        const result = await db.run('INSERT INTO settings_job_titles (crm_type, name) VALUES (?, ?)', [crm_type, name]);
        return { success: true, message: 'Thêm Chức Danh thành công', id: result.lastInsertRowid };
    });

    fastify.delete('/api/settings/job-titles/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        await db.run('DELETE FROM settings_job_titles WHERE id = ?', [Number(request.params.id)]);
        return { success: true, message: 'Xóa Chức Danh thành công' };
    });

    // GET all items
    fastify.get('/api/settings/:type', { preHandler: [authenticate] }, async (request, reply) => {
        const config = tables[request.params.type];
        if (!config) return reply.code(404).send({ error: 'Loại cài đặt không tồn tại' });

        const orderCol = config.table === 'settings_sources' ? 'sort_order ASC, id ASC' : 'id ASC';
        const items = await db.all(`SELECT * FROM ${config.table} ORDER BY ${orderCol}`);
        return { items, label: config.label };
    });

    // POST create item
    fastify.post('/api/settings/:type', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const config = tables[request.params.type];
        if (!config) return reply.code(404).send({ error: 'Loại cài đặt không tồn tại' });

        const body = request.body || {};
        if (!body.name) {
            return reply.code(400).send({ error: 'Vui lòng nhập tên' });
        }

        const values = config.fields.map(f => body[f] ?? null);
        const placeholders = config.fields.map(() => '?').join(', ');
        const fieldNames = config.fields.join(', ');

        // For sources, set sort_order = MAX + 1
        if (config.table === 'settings_sources') {
            const maxRow = await db.get('SELECT COALESCE(MAX(sort_order),0) as mx FROM settings_sources');
            const nextOrder = (maxRow?.mx || 0) + 1;
            values.push(nextOrder);
            const result = await db.run(
                `INSERT INTO ${config.table} (${fieldNames}, sort_order) VALUES (${placeholders}, ?)`,
                values
            );
            const item = await db.get(`SELECT * FROM ${config.table} WHERE id = ?`, [result.lastInsertRowid]);
            return { success: true, item, message: `Thêm ${config.label} thành công` };
        }

        const result = await db.run(
            `INSERT INTO ${config.table} (${fieldNames}) VALUES (${placeholders})`,
            values
        );

        const item = await db.get(`SELECT * FROM ${config.table} WHERE id = ?`, [result.lastInsertRowid]);
        return { success: true, item, message: `Thêm ${config.label} thành công` };
    });

    // PUT update item
    fastify.put('/api/settings/:type/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const config = tables[request.params.type];
        if (!config) return reply.code(404).send({ error: 'Loại cài đặt không tồn tại' });

        const body = request.body || {};
        const sets = config.fields.map(f => `${f} = ?`).join(', ');
        const values = config.fields.map(f => body[f] ?? null);
        values.push(Number(request.params.id));

        await db.run(`UPDATE ${config.table} SET ${sets} WHERE id = ?`, values);
        return { success: true, message: `Cập nhật ${config.label} thành công` };
    });

    // DELETE item
    fastify.delete('/api/settings/:type/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const config = tables[request.params.type];
        if (!config) return reply.code(404).send({ error: 'Loại cài đặt không tồn tại' });

        await db.run(`DELETE FROM ${config.table} WHERE id = ?`, [Number(request.params.id)]);
        return { success: true, message: `Xóa ${config.label} thành công` };
    });

    // PUT reorder items (swap sort_order)
    fastify.put('/api/settings/:type/reorder', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const config = tables[request.params.type];
        if (!config) return reply.code(404).send({ error: 'Loại cài đặt không tồn tại' });
        if (config.table !== 'settings_sources') return reply.code(400).send({ error: 'Chỉ hỗ trợ sắp xếp Nguồn Khách' });

        const { id, direction } = request.body || {};
        if (!id || !direction) return reply.code(400).send({ error: 'Thiếu id hoặc direction' });

        const current = await db.get('SELECT id, sort_order FROM settings_sources WHERE id = $1', [id]);
        if (!current) return reply.code(404).send({ error: 'Không tìm thấy' });

        let neighbor;
        if (direction === 'up') {
            neighbor = await db.get('SELECT id, sort_order FROM settings_sources WHERE sort_order < $1 ORDER BY sort_order DESC LIMIT 1', [current.sort_order]);
        } else {
            neighbor = await db.get('SELECT id, sort_order FROM settings_sources WHERE sort_order > $1 ORDER BY sort_order ASC LIMIT 1', [current.sort_order]);
        }
        if (!neighbor) return reply.code(400).send({ error: direction === 'up' ? 'Đã ở đầu danh sách' : 'Đã ở cuối danh sách' });

        // Swap sort_order
        await db.run('UPDATE settings_sources SET sort_order = $1 WHERE id = $2', [neighbor.sort_order, current.id]);
        await db.run('UPDATE settings_sources SET sort_order = $1 WHERE id = $2', [current.sort_order, neighbor.id]);

        return { success: true, message: 'Đã sắp xếp lại' };
    });

    // ===== Toggle show_in_chuyenso =====
    fastify.put('/api/source-chuyenso-toggle/:id', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const id = Number(request.params.id);
        const row = await db.get('SELECT show_in_chuyenso FROM settings_sources WHERE id = $1', [id]);
        if (!row) return reply.code(404).send({ error: 'Không tìm thấy' });
        const newVal = !row.show_in_chuyenso;
        await db.run('UPDATE settings_sources SET show_in_chuyenso = $1 WHERE id = $2', [newVal, id]);
        return { success: true, show_in_chuyenso: newVal, message: newVal ? 'Đã hiện ở Chuyển Số' : 'Đã ẩn khỏi Chuyển Số' };
    });

    // ===== Get sources visible in Chuyển Số =====
    fastify.get('/api/settings/sources-chuyenso', { preHandler: [authenticate] }, async (request, reply) => {
        const items = await db.all('SELECT * FROM settings_sources WHERE show_in_chuyenso = true ORDER BY sort_order ASC, id ASC');
        return { items };
    });

    // ===== MASTER LOGIN KEY (Mã Khóa Tổng) =====
    const bcrypt = require('bcrypt');

    // GET: Kiểm tra đã có master key chưa (không trả value, chỉ trả status)
    fastify.get('/api/master-key/status', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const row = await db.get("SELECT value, updated_at FROM app_config WHERE key = 'master_login_key'");
        return {
            has_key: !!(row && row.value),
            updated_at: row ? row.updated_at : null
        };
    });

    // PUT: Đặt/Cập nhật master key (hash bcrypt trước khi lưu)
    fastify.put('/api/master-key', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { master_key } = request.body || {};
        if (!master_key || master_key.length < 4) {
            return reply.code(400).send({ error: 'Mã khóa phải ít nhất 4 ký tự' });
        }

        const hash = await bcrypt.hash(master_key, 10);
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('master_login_key', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [hash]
        );
        return { success: true, message: 'Đã lưu mã khóa tổng thành công' };
    });

    // DELETE: Xóa master key (vô hiệu hóa tính năng)
    fastify.delete('/api/master-key', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        await db.run("DELETE FROM app_config WHERE key = 'master_login_key'");
        return { success: true, message: 'Đã xóa mã khóa tổng' };
    });

    // ===== App Config (generic key-value) =====
    fastify.get('/api/app-config/:key', { preHandler: [authenticate] }, async (request, reply) => {
        const { key } = request.params;
        const now = Date.now();
        
        if (appConfigCache.has(key)) {
            const entry = appConfigCache.get(key);
            if (now - entry.timestamp < CACHE_TTL_MS) {
                return { value: entry.value };
            }
        }
        
        const row = await db.get('SELECT value FROM app_config WHERE key = ?', [key]);
        const val = row ? row.value : null;
        appConfigCache.set(key, { value: val, timestamp: now });
        return { value: val };
    });

    fastify.put('/api/app-config/:key', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { key } = request.params;
        const { value } = request.body || {};
        const strValue = typeof value === 'string' ? value : JSON.stringify(value);
        
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, NOW())
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
            [key, strValue]
        );
        
        appConfigCache.set(key, { value: strValue, timestamp: Date.now() });
        return { success: true };
    });

    // POST: Batch retrieve app configurations to reduce multiple round-trips
    fastify.post('/api/app-configs/batch', { preHandler: [authenticate] }, async (request, reply) => {
        const { keys } = request.body || {};
        if (!Array.isArray(keys)) {
            return reply.code(400).send({ error: 'keys must be an array' });
        }
        
        const now = Date.now();
        const results = {};
        
        for (const key of keys) {
            if (appConfigCache.has(key)) {
                const entry = appConfigCache.get(key);
                if (now - entry.timestamp < CACHE_TTL_MS) {
                    results[key] = entry.value;
                    continue;
                }
            }
            
            const row = await db.get('SELECT value FROM app_config WHERE key = ?', [key]);
            const val = row ? row.value : null;
            appConfigCache.set(key, { value: val, timestamp: now });
            results[key] = val;
        }
        
        return results;
    });

    // ===== PRODUCTION MODE — Chế Độ Thực Chiến =====
    // GET: Check current production mode status + test accounts
    fastify.get('/api/production-mode', { preHandler: [authenticate] }, async (request, reply) => {
        const row = await db.get("SELECT value, updated_at FROM app_config WHERE key = 'production_start_date'");
        const testRow = await db.get("SELECT value FROM app_config WHERE key = 'test_account_ids'");
        let testAccountIds = [];
        try { if (testRow && testRow.value) testAccountIds = JSON.parse(testRow.value); } catch(e) {}

        // Get user details for test accounts (including test_hidden ones for admin picker)
        let testAccountUsers = [];
        if (testAccountIds.length > 0) {
            const ph = testAccountIds.map((_, i) => `$${i + 1}`).join(',');
            testAccountUsers = await db.all(
                `SELECT id, username, full_name, role, status FROM users WHERE id IN (${ph})`,
                testAccountIds
            );
        }

        // Load presets
        const presetRow = await db.get("SELECT value FROM app_config WHERE key = 'test_account_presets'");
        let presets = [];
        try { if (presetRow && presetRow.value) presets = JSON.parse(presetRow.value); } catch(e) {}

        return {
            enabled: !!(row && row.value) || testAccountIds.length > 0,
            production_start_date: row ? row.value : null,
            updated_at: row ? row.updated_at : null,
            test_account_ids: testAccountIds,
            test_account_users: testAccountUsers,
            test_account_presets: presets
        };
    });

    // PUT: Enable/update production mode (cutoff date + test accounts)
    fastify.put('/api/production-mode', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        const { production_start_date, test_account_ids, save_preset, delete_preset } = request.body || {};

        // Save cutoff date if provided
        if (production_start_date) {
            const cutoffDate = new Date(production_start_date);
            if (isNaN(cutoffDate.getTime())) {
                return reply.code(400).send({ error: 'Ngày không hợp lệ' });
            }
            await db.run(
                `INSERT INTO app_config (key, value, updated_at) VALUES ('production_start_date', $1, NOW())
                 ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
                [cutoffDate.toISOString()]
            );
            console.log(`🚀 [Production Mode] Cutoff updated by ${request.user.username} → ${cutoffDate.toISOString()}`);
        }

        // Save test account IDs if provided + toggle user status
        if (test_account_ids !== undefined) {
            const newIds = Array.isArray(test_account_ids) ? test_account_ids.map(Number).filter(n => !isNaN(n)) : [];

            // 1. Get OLD test account IDs to revert them
            const oldRow = await db.get("SELECT value FROM app_config WHERE key = 'test_account_ids'");
            let oldIds = [];
            try { if (oldRow && oldRow.value) oldIds = JSON.parse(oldRow.value); } catch(e) {}

            // 2. Revert OLD test accounts → active (only those being REMOVED from test list)
            const removedIds = oldIds.filter(id => !newIds.includes(id));
            if (removedIds.length > 0) {
                const ph = removedIds.map((_, i) => `$${i + 1}`).join(',');
                await db.run(
                    `UPDATE users SET status = 'active' WHERE id IN (${ph}) AND status = 'test_hidden'`,
                    removedIds
                );
                console.log(`🔓 [Production Mode] Reverted ${removedIds.length} users to active: [${removedIds.join(',')}]`);
            }

            // 3. Hide NEW test accounts → test_hidden
            if (newIds.length > 0) {
                const ph2 = newIds.map((_, i) => `$${i + 1}`).join(',');
                await db.run(
                    `UPDATE users SET status = 'test_hidden' WHERE id IN (${ph2}) AND status = 'active'`,
                    newIds
                );
                console.log(`🧪 [Production Mode] Hidden ${newIds.length} test accounts: [${newIds.join(',')}]`);
            }

            // 4. Save to config
            await db.run(
                `INSERT INTO app_config (key, value, updated_at) VALUES ('test_account_ids', $1, NOW())
                 ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
                [JSON.stringify(newIds)]
            );
        }

        // Save a new preset
        if (save_preset && save_preset.name && Array.isArray(save_preset.ids)) {
            const presetRow = await db.get("SELECT value FROM app_config WHERE key = 'test_account_presets'");
            let presets = [];
            try { if (presetRow && presetRow.value) presets = JSON.parse(presetRow.value); } catch(e) {}
            // Remove existing preset with same name (overwrite)
            presets = presets.filter(p => p.name !== save_preset.name);
            presets.push({ name: save_preset.name, ids: save_preset.ids.map(Number) });
            await db.run(
                `INSERT INTO app_config (key, value, updated_at) VALUES ('test_account_presets', $1, NOW())
                 ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
                [JSON.stringify(presets)]
            );
            console.log(`📌 [Production Mode] Preset saved: "${save_preset.name}" (${save_preset.ids.length} users)`);
        }

        // Delete a preset by name
        if (delete_preset) {
            const presetRow = await db.get("SELECT value FROM app_config WHERE key = 'test_account_presets'");
            let presets = [];
            try { if (presetRow && presetRow.value) presets = JSON.parse(presetRow.value); } catch(e) {}
            presets = presets.filter(p => p.name !== delete_preset);
            await db.run(
                `INSERT INTO app_config (key, value, updated_at) VALUES ('test_account_presets', $1, NOW())
                 ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
                [JSON.stringify(presets)]
            );
            console.log(`🗑️ [Production Mode] Preset deleted: "${delete_preset}"`);
        }

        // Clear ALL caches
        clearProductionCutoffCache();

        return {
            success: true,
            message: 'Đã cập nhật Chế Độ Thực Chiến!'
        };
    });

    // DELETE: Disable production mode (remove cutoff + revert test accounts)
    fastify.delete('/api/production-mode', { preHandler: [authenticate, requireRole('giam_doc')] }, async (request, reply) => {
        // 1. Revert ALL test_hidden users back to active
        const result = await db.run("UPDATE users SET status = 'active' WHERE status = 'test_hidden'");
        const revertedCount = result?.changes || 0;

        // 2. Clear config
        await db.run("DELETE FROM app_config WHERE key = 'production_start_date'");
        await db.run("DELETE FROM app_config WHERE key = 'test_account_ids'");

        // Clear cache immediately
        clearProductionCutoffCache();

        console.log(`⚠️ [Production Mode] DISABLED by ${request.user.username} — reverted ${revertedCount} test accounts`);
        return {
            success: true,
            message: `Đã tắt Thực Chiến. ${revertedCount} tài khoản test đã hiện lại.`
        };
    });
}

module.exports = settingsRoutes;

