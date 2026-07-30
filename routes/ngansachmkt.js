const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

function isGiamDoc(user) {
    if (!user) return false;
    if (user.role === 'giam_doc' || user.role === 'admin' || user.username === 'admin') return true;
    if (user.full_name && (user.full_name.toLowerCase().includes('giám đốc') || user.full_name.toLowerCase().includes('giam doc'))) return true;
    return false;
}

function normalizeSourceKey(val) {
    if (!val) return '';
    return String(val)
        .normalize('NFKC')
        .toLowerCase()
        .trim()
        .replace(/\s*\/\s*/g, '/')
        .replace(/\s+/g, ' ');
}

async function nganSachMktRoutes(fastify, options) {

    // Ensure tables and columns exist
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS mkt_categories (
                id SERIAL PRIMARY KEY,
                parent_id INT REFERENCES mkt_categories(id) ON DELETE SET NULL,
                group_type VARCHAR(20) NOT NULL, -- 'online' or 'offline'
                name VARCHAR(100) NOT NULL,
                icon VARCHAR(20) DEFAULT '📌',
                sort_order INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                linked_source_type VARCHAR(20),
                linked_source_name VARCHAR(100),
                pancake_page_id VARCHAR(100),
                pancake_page_name VARCHAR(255),
                ads_handler_name VARCHAR(255),
                fb_ad_account_id VARCHAR(100),
                fb_ad_account_name VARCHAR(255),
                fb_ad_account_link TEXT,
                fb_access_token TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await db.run(`
            CREATE TABLE IF NOT EXISTS marketing_budgets (
                id SERIAL PRIMARY KEY,
                category_id INT REFERENCES mkt_categories(id) ON DELETE SET NULL,
                group_type VARCHAR(20) NOT NULL, -- 'online' or 'offline'
                channel VARCHAR(100),
                channel_name VARCHAR(100),
                budget_year INT NOT NULL,
                budget_month INT NOT NULL,
                budget_date VARCHAR(10),
                budget_amount NUMERIC(15,2) DEFAULT 0,
                spent_amount NUMERIC(15,2) DEFAULT 0,
                lead_count INT DEFAULT 0,
                order_count INT DEFAULT 0,
                revenue_amount NUMERIC(15,2) DEFAULT 0,
                notes TEXT,
                pancake_page_id VARCHAR(100),
                pancake_page_name VARCHAR(255),
                linked_source_name VARCHAR(100),
                ads_handler_name VARCHAR(255),
                fb_ad_account_id VARCHAR(100),
                fb_ad_account_name VARCHAR(255),
                fb_ad_account_link TEXT,
                created_by INT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await db.run(`
            CREATE TABLE IF NOT EXISTS mkt_ads_handler_resources (
                id SERIAL PRIMARY KEY,
                ads_handler_name VARCHAR(255) UNIQUE NOT NULL,
                content TEXT,
                updated_by INT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS parent_id INT');
        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS linked_source_type VARCHAR(20)');
        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS linked_source_name VARCHAR(100)');
        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS pancake_page_id VARCHAR(100)');
        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS pancake_page_name VARCHAR(255)');
        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS ads_handler_name VARCHAR(255)');
        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS allowed_reporter_names TEXT');
        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS fb_ad_account_id VARCHAR(100)');
        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS fb_ad_account_name VARCHAR(255)');
        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS fb_ad_account_link TEXT');
        await db.run('ALTER TABLE mkt_categories ADD COLUMN IF NOT EXISTS fb_access_token TEXT');

        await db.run('ALTER TABLE marketing_budgets ALTER COLUMN channel DROP NOT NULL');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS category_id INT');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS group_type VARCHAR(20) DEFAULT \'online\'');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS channel_name VARCHAR(100)');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS budget_year INT');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS budget_date VARCHAR(10)');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS order_count INT DEFAULT 0');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS pancake_page_id VARCHAR(100)');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS pancake_page_name VARCHAR(255)');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS linked_source_name VARCHAR(100)');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS ads_handler_name VARCHAR(255)');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS fb_ad_account_id VARCHAR(100)');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS fb_ad_account_link TEXT');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS image_url TEXT');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS campaign_id INT');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS report_link TEXT');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS approved_by INT');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ');
        await db.run('ALTER TABLE marketing_budgets ADD COLUMN IF NOT EXISTS director_bill_image_url TEXT');

        await db.run(`
            CREATE TABLE IF NOT EXISTS mkt_campaigns (
                id SERIAL PRIMARY KEY,
                category_id INT REFERENCES mkt_categories(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                target_goal TEXT NOT NULL,
                max_budget NUMERIC(15,2) NOT NULL DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_by INT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Seed default categories if table is empty
        const countRow = await db.get('SELECT COUNT(*) as cnt FROM mkt_categories');
        if (Number(countRow?.cnt || 0) === 0) {
            const defaultCats = [
                { group_type: 'online', name: 'Facebook Ads', icon: '📘', sort_order: 1 },
                { group_type: 'online', name: 'Tiktok Ads', icon: '🎵', sort_order: 2 },
                { group_type: 'online', name: 'Google Ads', icon: '🔍', sort_order: 3 },
                { group_type: 'online', name: 'Zalo Ads / OA', icon: '💬', sort_order: 4 },
                { group_type: 'online', name: 'KOL / KOC', icon: '⭐', sort_order: 5 },
                { group_type: 'online', name: 'Seeding Group', icon: '👥', sort_order: 6 },

                { group_type: 'offline', name: 'Tờ Rơi / Poster', icon: '📄', sort_order: 1 },
                { group_type: 'offline', name: 'Sự Kiện / Event', icon: '🎪', sort_order: 2 },
                { group_type: 'offline', name: 'Bảng Hiệu / Pano', icon: '🪧', sort_order: 3 },
                { group_type: 'offline', name: 'Quà Tặng KH', icon: '🎁', sort_order: 4 }
            ];

            for (const cat of defaultCats) {
                await db.run(
                    'INSERT INTO mkt_categories (group_type, name, icon, sort_order) VALUES (?, ?, ?, ?)',
                    [cat.group_type, cat.name, cat.icon, cat.sort_order]
                );
            }
            console.log('✅ Seeded default marketing categories');
        }
    } catch(e) {
        console.error('Error initializing marketing tables:', e.message);
    }

    // GET /api/marketing-sources-and-pages
    fastify.get('/api/marketing-sources-and-pages', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const sourcesNhuCau = await db.all("SELECT id, name FROM settings_sources WHERE show_in_kdoanh = true ORDER BY sort_order ASC, id ASC");
            const sourcesSale = await db.all("SELECT id, name FROM settings_sources WHERE show_in_sale = true ORDER BY sort_order ASC, id ASC");

            const allSources = await db.all("SELECT id, name FROM settings_sources");
            const sourceMap = new Map((allSources || []).map(s => [Number(s.id), s.name]));

            const allUsers = await db.all("SELECT id, full_name FROM users");
            const userMap = new Map((allUsers || []).map(u => [Number(u.id), u.full_name]));

            let pages = [];
            const pancakeConfig = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
            if (pancakeConfig && pancakeConfig.value) {
                try {
                    const parsed = JSON.parse(pancakeConfig.value);
                    if (parsed && Array.isArray(parsed.pages)) {
                        pages = parsed.pages.map(p => {
                            const srcName = sourceMap.get(Number(p.source_id)) || p.default_source || p.source_name || 'Khác';
                            const adsName = userMap.get(Number(p.ads_manager_id)) || p.assigned_role_name || p.assigned_role || 'Giám Đốc';

                            return {
                                id: p.id || p.page_id,
                                name: p.name || p.page_name || 'Fanpage',
                                default_source: srcName,
                                ads_handler: adsName
                            };
                        });
                    }
                } catch(pe) {
                    console.error('Error parsing pancake_settings:', pe.message);
                }
            }

            return {
                success: true,
                sources: {
                    nhu_cau: sourcesNhuCau || [],
                    sale: sourcesSale || []
                },
                pages: pages || []
            };
        } catch(err) {
            console.error('Error fetching marketing sources and pages:', err);
            return reply.code(500).send({ error: 'Lỗi khi lấy thông tin Nguồn & Page' });
        }
    });

    // GET /api/marketing-categories/marketing-users (Chỉ lấy Giám Đốc và nhân viên thuộc PHÒNG MARKETING)
    fastify.get('/api/marketing-categories/marketing-users', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const users = await db.all(`
                SELECT u.id, u.username, u.full_name, u.role, d.name as department_name
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.status = 'active'
                  AND (
                      u.role IN ('giam_doc', 'admin', 'quan_ly_mkt', 'nhan_vien_mkt', 'mkt', 'marketing')
                      OR LOWER(COALESCE(d.name, '')) LIKE '%marketing%'
                      OR LOWER(COALESCE(d.name, '')) LIKE '%mkt%'
                      OR LOWER(COALESCE(u.role, '')) LIKE '%mkt%'
                      OR LOWER(COALESCE(u.role, '')) LIKE '%marketing%'
                      OR LOWER(COALESCE(u.full_name, '')) LIKE '%giám đốc%'
                      OR LOWER(COALESCE(u.full_name, '')) LIKE '%giam doc%'
                      OR LOWER(COALESCE(u.full_name, '')) LIKE '%mkt%'
                      OR LOWER(COALESCE(u.username, '')) LIKE '%mkt%'
                  )
                ORDER BY u.full_name
            `);

            return {
                success: true,
                users: users || []
            };
        } catch(err) {
            console.error('Error fetching marketing users:', err);
            return reply.code(500).send({ error: 'Lỗi khi lấy danh sách nhân viên phòng Marketing' });
        }
    });

    // GET /api/marketing-categories/ads-handlers-resources (Lấy danh sách người cầm Ads & nguyên liệu đã lưu)
    fastify.get('/api/marketing-categories/ads-handlers-resources', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const isManager = isGiamDoc(request.user) || request.user.role === 'quan_ly_cap_cao' || request.user.role === 'quan_ly';
            const reqUserName = (request.user.full_name || request.user.name || request.user.username || '').toLowerCase().trim();

            // Collect unique ads handlers from Pancake pages & mkt_categories
            const handlerSet = new Set(['Giám Đốc']);

            // 1. From mkt_categories
            const catHandlers = await db.all("SELECT DISTINCT ads_handler_name FROM mkt_categories WHERE ads_handler_name IS NOT NULL AND ads_handler_name != ''");
            (catHandlers || []).forEach(h => handlerSet.add(h.ads_handler_name.trim()));

            // 2. From Pancake config
            const pancakeConfig = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
            if (pancakeConfig && pancakeConfig.value) {
                try {
                    const allUsers = await db.all("SELECT id, full_name FROM users");
                    const userMap = new Map((allUsers || []).map(u => [Number(u.id), u.full_name]));
                    const parsed = JSON.parse(pancakeConfig.value);
                    if (parsed && Array.isArray(parsed.pages)) {
                        parsed.pages.forEach(p => {
                            const adsName = userMap.get(Number(p.ads_manager_id)) || p.assigned_role_name || p.assigned_role;
                            if (adsName) handlerSet.add(adsName.trim());
                        });
                    }
                } catch(e) {}
            }

            // 3. Fetch saved resources from DB
            const savedResources = await db.all(`
                SELECT r.*, u.full_name as updater_name
                FROM mkt_ads_handler_resources r
                LEFT JOIN users u ON u.id = r.updated_by
            `);

            const resourceMap = new Map((savedResources || []).map(r => [r.ads_handler_name, r]));

            const handlerList = Array.from(handlerSet).map(hName => {
                const saved = resourceMap.get(hName);
                const hLower = hName.toLowerCase().trim();
                const isOwner = hLower && (hLower === reqUserName || hLower.includes(reqUserName) || reqUserName.includes(hLower));

                return {
                    ads_handler_name: hName,
                    content: (isManager || isOwner) ? (saved ? saved.content : '') : '🔒 Dữ liệu bảo mật - Chỉ Giám Đốc và ' + hName + ' mới được xem.',
                    updated_at: saved ? saved.updated_at : null,
                    updater_name: saved ? saved.updater_name : null,
                    can_access: isManager || isOwner
                };
            });

            return {
                success: true,
                handlers: handlerList
            };
        } catch(err) {
            console.error('Error fetching ads handlers resources:', err);
            return reply.code(500).send({ error: 'Lỗi khi lấy danh sách nguyên liệu tài khoản' });
        }
    });

    // POST /api/marketing-categories/ads-handlers-resources (Lưu nguyên liệu tài khoản cho 1 người cầm Ads)
    fastify.post('/api/marketing-categories/ads-handlers-resources', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const isManager = isGiamDoc(request.user) || request.user.role === 'quan_ly_cap_cao' || request.user.role === 'quan_ly';
            const reqUserName = (request.user.full_name || request.user.name || request.user.username || '').toLowerCase().trim();

            const { ads_handler_name, content } = request.body || {};
            if (!ads_handler_name) {
                return reply.code(400).send({ error: 'Vui lòng chọn Người Cầm Ads!' });
            }

            const cleanName = ads_handler_name.trim();
            const cleanLower = cleanName.toLowerCase();
            const isOwner = cleanLower && (cleanLower === reqUserName || cleanLower.includes(reqUserName) || reqUserName.includes(cleanLower));

            if (!isManager && !isOwner) {
                return reply.code(403).send({ error: `Bạn không có quyền cập nhật nguyên liệu tài khoản của: ${cleanName}` });
            }

            const resContent = content || '';

            const existing = await db.get('SELECT id FROM mkt_ads_handler_resources WHERE ads_handler_name = ?', [cleanName]);
            if (existing) {
                await db.run(`
                    UPDATE mkt_ads_handler_resources SET
                        content = ?,
                        updated_by = ?,
                        updated_at = NOW()
                    WHERE id = ?
                `, [resContent, request.user.id, existing.id]);
            } else {
                await db.run(`
                    INSERT INTO mkt_ads_handler_resources (ads_handler_name, content, updated_by, created_at, updated_at)
                    VALUES (?, ?, ?, NOW(), NOW())
                `, [cleanName, resContent, request.user.id]);
            }

            return { success: true, message: `Đã lưu nguyên liệu tài khoản cho ${cleanName}!` };
        } catch(err) {
            console.error('Error saving ads handler resource:', err);
            return reply.code(500).send({ error: 'Lỗi khi lưu nguyên liệu tài khoản' });
        }
    });

    // POST /api/marketing-categories/sync-pancake-pages
    fastify.post('/api/marketing-categories/sync-pancake-pages', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            if (!isGiamDoc(request.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền đồng bộ Page Pancake!' });
            }

            let fbParent = await db.get("SELECT id FROM mkt_categories WHERE group_type = 'online' AND LOWER(name) LIKE '%facebook%' AND parent_id IS NULL AND is_active = TRUE");
            if (!fbParent) {
                const maxOrderRow = await db.get("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM mkt_categories WHERE group_type = 'online'");
                fbParent = await db.get(`
                    INSERT INTO mkt_categories (group_type, name, icon, sort_order)
                    VALUES ('online', 'Facebook Ads', '📘', ?) RETURNING id
                `, [Number(maxOrderRow?.max_order || 0) + 1]);
            }

            const allSources = await db.all("SELECT id, name FROM settings_sources");
            const sourceMap = new Map((allSources || []).map(s => [Number(s.id), s.name]));

            const allUsers = await db.all("SELECT id, full_name FROM users");
            const userMap = new Map((allUsers || []).map(u => [Number(u.id), u.full_name]));

            const parentId = fbParent.id;
            let countSynced = 0;

            const pancakeConfig = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
            if (pancakeConfig && pancakeConfig.value) {
                const parsed = JSON.parse(pancakeConfig.value);
                if (parsed && Array.isArray(parsed.pages)) {
                    for (const p of parsed.pages) {
                        const pageId = String(p.id || p.page_id || '');
                        const pageName = p.name || p.page_name || 'Fanpage';
                        const sourceName = sourceMap.get(Number(p.source_id)) || p.default_source || p.source_name || null;
                        const handlerName = userMap.get(Number(p.ads_manager_id)) || p.assigned_role_name || p.assigned_role || 'Giám Đốc';

                        const existingCat = await db.get("SELECT id FROM mkt_categories WHERE (pancake_page_id = ? OR LOWER(name) = ?) AND is_active = TRUE", [pageId, pageName.toLowerCase()]);
                        if (!existingCat) {
                            const maxOrderRow = await db.get("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM mkt_categories WHERE parent_id = ?", [parentId]);
                            await db.run(`
                                INSERT INTO mkt_categories (parent_id, group_type, name, icon, sort_order, linked_source_type, linked_source_name, pancake_page_id, pancake_page_name, ads_handler_name)
                                VALUES (?, 'online', ?, '📄', ?, 'sale', ?, ?, ?, ?)
                            `, [
                                parentId,
                                pageName,
                                Number(maxOrderRow?.max_order || 0) + 1,
                                sourceName,
                                pageId,
                                pageName,
                                handlerName
                            ]);
                            countSynced++;
                        }
                    }
                }
            }

            return { success: true, countSynced, message: `Đã đồng bộ thành công ${countSynced} Fanpage từ Pancake!` };
        } catch(err) {
            console.error('Error syncing pancake pages:', err);
            return reply.code(500).send({ error: 'Lỗi khi đồng bộ Page từ Pancake' });
        }
    });

    // POST /api/marketing-categories/:id/meta-config (Lưu cấu hình Ad Acc ID, Ad Acc Name, Link, Token Meta)
    fastify.post('/api/marketing-categories/:id/meta-config', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            if (!isGiamDoc(request.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền lưu cấu hình Facebook Ads Token!' });
            }

            const id = Number(request.params.id);
            const { fb_ad_account_id, fb_access_token, fb_ad_account_name, fb_ad_account_link } = request.body || {};

            if (!fb_ad_account_id || !fb_access_token || !fb_ad_account_name || !fb_ad_account_link) {
                return reply.code(400).send({ error: 'Vui lòng điền đầy đủ cả 4 thông tin bắt buộc: ID tài khoản, Tên tài khoản, Link trực tiếp và Token Meta!' });
            }

            let cleanAdAccId = fb_ad_account_id.trim();
            if (!cleanAdAccId.startsWith('act_')) {
                cleanAdAccId = 'act_' + cleanAdAccId;
            }

            await db.run(`
                UPDATE mkt_categories SET
                    fb_ad_account_id = ?,
                    fb_access_token = ?,
                    fb_ad_account_name = ?,
                    fb_ad_account_link = ?
                WHERE id = ?
            `, [
                cleanAdAccId,
                fb_access_token.trim(),
                fb_ad_account_name.trim(),
                fb_ad_account_link.trim(),
                id
            ]);

            // Also update existing marketing_budgets for this category to inherit ad account name & link
            await db.run(`
                UPDATE marketing_budgets SET
                    fb_ad_account_id = ?,
                    fb_ad_account_name = ?,
                    fb_ad_account_link = ?
                WHERE category_id = ?
            `, [
                cleanAdAccId,
                fb_ad_account_name.trim(),
                fb_ad_account_link.trim(),
                id
            ]);

            return { success: true, message: 'Đã lưu cấu hình Facebook Ads API cho kênh này!' };
        } catch(err) {
            console.error('Error updating Meta config for category:', err);
            return reply.code(500).send({ error: 'Lỗi khi lưu cấu hình Meta API' });
        }
    });

    // POST /api/marketing-budgets/sync-facebook-insights
    fastify.post('/api/marketing-budgets/sync-facebook-insights', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            if (!isGiamDoc(request.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền rút dữ liệu Meta Ads!' });
            }

            const { year, month, category_id } = request.body || {};
            const targetYear = Number(year || new Date().getFullYear());
            const targetMonth = Number(month || (new Date().getMonth() + 1));

            const sinceDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(targetYear, targetMonth, 0).getDate();
            const untilDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            let sql = "SELECT * FROM mkt_categories WHERE is_active = TRUE AND fb_ad_account_id IS NOT NULL AND fb_access_token IS NOT NULL";
            const params = [];

            if (category_id && category_id !== 'all') {
                params.push(Number(category_id));
                sql += " AND id = ?";
            }

            const targetCats = await db.all(sql, params);

            if (!targetCats || targetCats.length === 0) {
                return reply.code(400).send({ error: 'Chưa có kênh nào được cấu hình ID Tài Khoản Ads (act_...) và Access Token Meta! Vui lòng bấm "⚙️ Cấu Hình Token Ads" để cài đặt.' });
            }

            for (const cat of targetCats) {
                await db.run("DELETE FROM marketing_budgets WHERE category_id = ? AND CAST(budget_year AS INTEGER) = ? AND CAST(budget_month AS INTEGER) = ? AND (budget_date IS NULL OR budget_date = '')", [cat.id, targetYear, targetMonth]);
            }

            let successCount = 0;
            let totalDaysSynced = 0;
            const results = [];
            let lastErrorMessage = '';

            for (const cat of targetCats) {
                try {
                    const adAccId = cat.fb_ad_account_id;
                    const token = cat.fb_access_token;
                    const adAccName = cat.fb_ad_account_name || null;
                    const adAccLink = cat.fb_ad_account_link || null;

                    const fbUrl = `https://graph.facebook.com/v20.0/${adAccId}/insights?fields=spend,actions&time_range=${encodeURIComponent(JSON.stringify({ since: sinceDate, until: untilDate }))}&time_increment=1&limit=100&access_token=${encodeURIComponent(token)}`;

                    const resp = await fetch(fbUrl);
                    const json = await resp.json();

                    if (json.error) {
                        console.error(`Meta API Error for cat ${cat.name}:`, json.error.message);
                        lastErrorMessage = json.error.message;
                        results.push({ category: cat.name, success: false, error: json.error.message });
                        continue;
                    }

                    let dataArr = json.data || [];

                    const now = new Date();
                    const currDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const yesterday = new Date(now.getTime() - 86400000);
                    const yestDateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

                    const datesToCheck = [yestDateStr, currDateStr];
                    for (const dt of datesToCheck) {
                        if (dt.startsWith(`${targetYear}-${String(targetMonth).padStart(2, '0')}`)) {
                            const hasDt = dataArr.some(d => d.date_start === dt);
                            if (!hasDt) {
                                try {
                                    const singleUrl = `https://graph.facebook.com/v20.0/${adAccId}/insights?fields=spend,actions&time_range=${encodeURIComponent(JSON.stringify({ since: dt, until: dt }))}&access_token=${encodeURIComponent(token)}`;
                                    const singleResp = await fetch(singleUrl);
                                    const singleJson = await singleResp.json();
                                    if (singleJson.data && singleJson.data.length > 0) {
                                        dataArr.push(singleJson.data[0]);
                                    }
                                } catch(e) {
                                    console.error(`Error fetching single date ${dt}:`, e.message);
                                }
                            }
                        }
                    }

                    let catTotalSpent = 0;
                    let catTotalMsgs = 0;

                    for (const dayObj of dataArr) {
                        const dayDate = dayObj.date_start;
                        const daySpent = Number(dayObj.spend || 0);
                        let dayMsgs = 0;

                        if (Array.isArray(dayObj.actions)) {
                            const msgStartedAct = dayObj.actions.find(a => 
                                a.action_type === 'onsite_conversion.messaging_conversation_started_7d' || 
                                a.action_type === 'messaging_conversation_started_7d' ||
                                a.action_type === 'messaging_conversation_started'
                            );

                            if (msgStartedAct) {
                                dayMsgs = Number(msgStartedAct.value || 0);
                            } else {
                                const totalConnAct = dayObj.actions.find(a => a.action_type === 'onsite_conversion.total_messaging_connection');
                                const leadAct = dayObj.actions.find(a => a.action_type === 'lead');
                                if (totalConnAct) dayMsgs = Number(totalConnAct.value || 0);
                                else if (leadAct) dayMsgs = Number(leadAct.value || 0);
                            }
                        }

                        catTotalSpent += daySpent;
                        catTotalMsgs += dayMsgs;

                        const existingRecord = await db.get("SELECT id FROM marketing_budgets WHERE category_id = ? AND budget_date = ?", [cat.id, dayDate]);

                        if (existingRecord) {
                            await db.run(`
                                UPDATE marketing_budgets SET
                                    spent_amount = ?,
                                    lead_count = ?,
                                    fb_ad_account_id = ?,
                                    fb_ad_account_name = ?,
                                    fb_ad_account_link = ?,
                                    updated_at = NOW()
                                WHERE id = ?
                            `, [daySpent, dayMsgs, adAccId, adAccName, adAccLink, existingRecord.id]);
                        } else {
                            await db.run(`
                                INSERT INTO marketing_budgets 
                                (category_id, group_type, channel, channel_name, budget_year, budget_month, budget_date, budget_amount, spent_amount, lead_count, pancake_page_id, pancake_page_name, linked_source_name, ads_handler_name, fb_ad_account_id, fb_ad_account_name, fb_ad_account_link, created_by, created_at, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                            `, [
                                cat.id,
                                cat.group_type,
                                cat.name,
                                cat.name,
                                targetYear,
                                targetMonth,
                                dayDate,
                                daySpent,
                                dayMsgs,
                                cat.pancake_page_id,
                                cat.pancake_page_name,
                                cat.linked_source_name,
                                cat.ads_handler_name,
                                adAccId,
                                adAccName,
                                adAccLink,
                                request.user.id
                            ]);
                        }
                        totalDaysSynced++;
                    }

                    successCount++;
                    results.push({ category: cat.name, success: true, spent: catTotalSpent, leads: catTotalMsgs, daysCount: dataArr.length });
                } catch(catErr) {
                    console.error(`Error syncing Meta insights for ${cat.name}:`, catErr.message);
                    lastErrorMessage = catErr.message;
                    results.push({ category: cat.name, success: false, error: catErr.message });
                }
            }

            if (successCount === 0) {
                return reply.code(400).send({
                    error: `Không thể rút dữ liệu từ Meta Ads: ${lastErrorMessage || 'Lỗi kết nối Facebook API'}`
                });
            }

            return {
                success: true,
                message: `Đã rút thành công chi tiết ${totalDaysSynced} ngày cho ${successCount}/${targetCats.length} kênh từ Meta Ads API!`,
                results
            };
        } catch(err) {
            console.error('Error syncing Facebook Insights:', err);
            return reply.code(500).send({ error: 'Lỗi khi đồng bộ chi phí từ Facebook API' });
        }
    });

    // GET /api/marketing-categories
    fastify.get('/api/marketing-categories', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const rows = await db.all('SELECT * FROM mkt_categories WHERE is_active = TRUE ORDER BY group_type ASC, parent_id ASC NULLS FIRST, sort_order ASC, id ASC');
            return { success: true, data: rows };
        } catch(err) {
            console.error('Error fetching marketing categories:', err);
            return reply.code(500).send({ error: 'Lỗi khi lấy danh mục Marketing' });
        }
    });

    // POST /api/marketing-categories
    fastify.post('/api/marketing-categories', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { group_type, name, icon, parent_id, linked_source_type, linked_source_name, pancake_page_id, pancake_page_name, ads_handler_name, allowed_reporter_names, fb_ad_account_id, fb_access_token, fb_ad_account_name, fb_ad_account_link } = request.body || {};
            if (!group_type || !name) {
                return reply.code(400).send({ error: 'Vui lòng nhập tên kênh và chọn loại nhóm (Online / Offline)' });
            }

            if (!['online', 'offline'].includes(group_type)) {
                return reply.code(400).send({ error: 'Loại nhóm không hợp lệ' });
            }

            const parentIdNum = parent_id ? Number(parent_id) : null;
            const maxOrderRow = await db.get('SELECT COALESCE(MAX(sort_order), 0) as max_order FROM mkt_categories WHERE group_type = ?', [group_type]);
            const nextOrder = Number(maxOrderRow?.max_order || 0) + 1;

            let cleanAdAccId = fb_ad_account_id ? fb_ad_account_id.trim() : null;
            if (cleanAdAccId && !cleanAdAccId.startsWith('act_')) {
                cleanAdAccId = 'act_' + cleanAdAccId;
            }

            const reportersVal = allowed_reporter_names !== undefined ? (typeof allowed_reporter_names === 'string' ? allowed_reporter_names : JSON.stringify(allowed_reporter_names)) : null;

            const finalLinkedType = parentIdNum ? (linked_source_type || null) : null;
            const finalLinkedName = parentIdNum ? (linked_source_name || null) : null;

            const res = await db.get(`
                INSERT INTO mkt_categories (parent_id, group_type, name, icon, sort_order, linked_source_type, linked_source_name, pancake_page_id, pancake_page_name, ads_handler_name, allowed_reporter_names, fb_ad_account_id, fb_access_token, fb_ad_account_name, fb_ad_account_link)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *
            `, [
                parentIdNum,
                group_type,
                name.trim(),
                icon || (group_type === 'online' ? '🌐' : '🏢'),
                nextOrder,
                finalLinkedType,
                finalLinkedName,
                pancake_page_id || null,
                pancake_page_name || null,
                ads_handler_name || null,
                reportersVal,
                cleanAdAccId,
                fb_access_token || null,
                fb_ad_account_name || null,
                fb_ad_account_link || null
            ]);

            return { success: true, data: res, message: 'Đã thêm kênh Marketing mới' };
        } catch(err) {
            console.error('Error adding marketing category:', err);
            return reply.code(500).send({ error: 'Lỗi khi thêm kênh Marketing mới' });
        }
    });

    // DELETE /api/marketing-categories/:id
    fastify.delete('/api/marketing-categories/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const id = Number(request.params.id);
            await db.run('UPDATE mkt_categories SET is_active = FALSE WHERE id = ? OR parent_id = ?', [id, id]);
            return { success: true, message: 'Đã xóa kênh Marketing' };
        } catch(err) {
            console.error('Error deleting marketing category:', err);
            return reply.code(500).send({ error: 'Lỗi khi xóa kênh' });
        }
    });

    // PUT /api/marketing-categories/:id
    fastify.put('/api/marketing-categories/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            if (request.user.role !== 'giam_doc' && request.user.role !== 'quan_ly_cap_cao') {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền chỉnh sửa mục Marketing' });
            }
            const id = Number(request.params.id);
            const { name, icon, linked_source_name, ads_handler_name, allowed_reporter_names, pancake_page_id, pancake_page_name, fb_ad_account_id, fb_ad_account_name, fb_ad_account_link } = request.body || {};

            const existing = await db.get('SELECT * FROM mkt_categories WHERE id = ? AND is_active = TRUE', [id]);
            if (!existing) {
                return reply.code(404).send({ error: 'Không tìm thấy mục Marketing' });
            }

            let cleanAdAccId = fb_ad_account_id !== undefined ? (fb_ad_account_id ? fb_ad_account_id.trim() : null) : existing.fb_ad_account_id;
            if (cleanAdAccId && !cleanAdAccId.startsWith('act_')) {
                cleanAdAccId = 'act_' + cleanAdAccId;
            }

            const reportersVal = allowed_reporter_names !== undefined ? (typeof allowed_reporter_names === 'string' ? allowed_reporter_names : JSON.stringify(allowed_reporter_names)) : existing.allowed_reporter_names;

            const isParentCat = !existing.parent_id;
            const finalLinkedName = isParentCat ? null : (linked_source_name !== undefined ? linked_source_name : existing.linked_source_name);

            await db.run(`
                UPDATE mkt_categories SET
                    name = ?,
                    icon = ?,
                    linked_source_name = ?,
                    ads_handler_name = ?,
                    allowed_reporter_names = ?,
                    pancake_page_id = ?,
                    pancake_page_name = ?,
                    fb_ad_account_id = ?,
                    fb_ad_account_name = ?,
                    fb_ad_account_link = ?
                WHERE id = ?
            `, [
                name !== undefined ? name.trim() : existing.name,
                icon !== undefined ? icon : existing.icon,
                finalLinkedName,
                ads_handler_name !== undefined ? ads_handler_name : existing.ads_handler_name,
                reportersVal,
                pancake_page_id !== undefined ? pancake_page_id : existing.pancake_page_id,
                pancake_page_name !== undefined ? pancake_page_name : existing.pancake_page_name,
                cleanAdAccId,
                fb_ad_account_name !== undefined ? fb_ad_account_name : existing.fb_ad_account_name,
                fb_ad_account_link !== undefined ? fb_ad_account_link : existing.fb_ad_account_link,
                id
            ]);

            // Sync ads_handler_name to existing marketing_budgets records for this category if updated
            if (ads_handler_name !== undefined) {
                await db.run('UPDATE marketing_budgets SET ads_handler_name = ? WHERE category_id = ?', [ads_handler_name, id]);
            }

            return { success: true, message: 'Đã cập nhật cấu hình & phân công nhân viên cho mục Marketing' };
        } catch(err) {
            console.error('Error updating marketing category:', err);
            return reply.code(500).send({ error: 'Lỗi khi cập nhật mục Marketing' });
        }
    });

    // GET /api/marketing-budgets
    fastify.get('/api/marketing-budgets', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { year, month, group_type, category_id, view_type } = request.query || {};
            let sql = `
                SELECT m.*, c.name as category_name, c.group_type as cat_group, c.icon as cat_icon, c.linked_source_name as cat_linked_source, c.parent_id as cat_parent_id, c.fb_ad_account_id as cat_fb_acc, c.fb_ad_account_name as cat_fb_acc_name, c.fb_ad_account_link as cat_fb_acc_link, u.full_name as creator_name,
                       mc.name as campaign_name, mc.max_budget as campaign_max_budget, mc.target_goal as campaign_target_goal,
                       app_u.full_name as approver_name
                FROM marketing_budgets m 
                LEFT JOIN mkt_categories c ON c.id = m.category_id 
                LEFT JOIN mkt_campaigns mc ON mc.id = m.campaign_id
                LEFT JOIN users u ON u.id = m.created_by 
                LEFT JOIN users app_u ON app_u.id = m.approved_by
                WHERE 1=1
            `;
            const params = [];

            if (year) {
                params.push(Number(year));
                sql += ` AND CAST(m.budget_year AS INTEGER) = ?`;
            }

            if (month) {
                params.push(Number(month));
                sql += ` AND CAST(m.budget_month AS INTEGER) = ?`;
            }

            if (group_type && group_type !== 'all') {
                params.push(group_type);
                sql += ` AND COALESCE(m.group_type, c.group_type) = ?`;
            }

            if (category_id && category_id !== 'all') {
                const targetCatId = Number(category_id);
                const children = await db.all('SELECT id FROM mkt_categories WHERE parent_id = ? AND is_active = TRUE', [targetCatId]);
                if (children && children.length > 0) {
                    const allCatIds = [targetCatId, ...children.map(ch => ch.id)];
                    const placeholders = allCatIds.map(() => `?`).join(',');
                    params.push(...allCatIds);
                    sql += ` AND m.category_id IN (${placeholders})`;
                } else {
                    params.push(targetCatId);
                    sql += ` AND m.category_id = ?`;
                }
            }

            if (view_type === 'daily') {
                sql += ' ORDER BY m.budget_date ASC NULLS LAST, m.id ASC';
            } else {
                sql += ' ORDER BY m.budget_date DESC NULLS LAST, m.budget_year DESC, m.budget_month DESC, m.id DESC';
            }

            const rows = await db.all(sql, params);

            const orderStats = await db.all(`
                WITH ActiveSources AS (
                    SELECT DISTINCT 
                        LOWER(TRIM(REGEXP_REPLACE(unnest(string_to_array(linked_source_name, ',')), '\\s*\\/\\s*', '/', 'g'))) as clean_src
                    FROM mkt_categories 
                    WHERE is_active = TRUE AND NULLIF(TRIM(linked_source_name), '') IS NOT NULL
                ),
                NormalizedOrders AS (
                    SELECT 
                        o.id,
                        o.order_code,
                        TO_CHAR(o.order_date, 'YYYY-MM-DD') as dt_str,
                        TRIM(o.source) as source,
                        LOWER(TRIM(REGEXP_REPLACE(o.source, '\\s*\\/\\s*', '/', 'g'))) as clean_source_key,
                        o.total_amount,
                        RIGHT(REGEXP_REPLACE(COALESCE(c.phone, o.customer_phone, ''), '\\D', '', 'g'), 9) as norm_phone
                    FROM dht_orders o
                    LEFT JOIN customers c ON c.id = o.customer_id OR (
                        RIGHT(REGEXP_REPLACE(c.phone, '\\D', '', 'g'), 9) = RIGHT(REGEXP_REPLACE(o.customer_phone, '\\D', '', 'g'), 9)
                        AND RIGHT(REGEXP_REPLACE(o.customer_phone, '\\D', '', 'g'), 9) <> ''
                    )
                    WHERE o.order_date IS NOT NULL 
                      AND COALESCE(o.is_draft, false) = false
                      AND NULLIF(TRIM(o.source), '') IS NOT NULL
                      AND LOWER(TRIM(REGEXP_REPLACE(o.source, '\\s*\\/\\s*', '/', 'g'))) IN (SELECT clean_src FROM ActiveSources)
                ),
                RankedOrders AS (
                    SELECT 
                        *,
                        ROW_NUMBER() OVER (
                            PARTITION BY norm_phone 
                            ORDER BY dt_str ASC, id ASC
                        ) as rn
                    FROM NormalizedOrders
                )
                SELECT 
                    dt_str, 
                    source, 
                    clean_source_key,
                    COUNT(*)::int as cnt, 
                    SUM(total_amount)::numeric as rev
                FROM RankedOrders
                WHERE rn = 1
                GROUP BY dt_str, source, clean_source_key
            `);

            const orderMap = new Map();
            (orderStats || []).forEach(o => {
                if (o.dt_str) {
                    const dateKey = o.dt_str.trim();
                    const srcKey = normalizeSourceKey(o.source);
                    const cleanKey = normalizeSourceKey(o.clean_source_key) || srcKey;
                    
                    const item = orderMap.get(`${dateKey}|${srcKey}`) || { cnt: 0, rev: 0 };
                    item.cnt += Number(o.cnt || 0);
                    item.rev += Number(o.rev || 0);
                    
                    orderMap.set(`${dateKey}|${srcKey}`, item);
                    orderMap.set(`${dateKey}|${cleanKey}`, item);
                }
            });

            rows.forEach(r => {
                const dtKey = r.budget_date ? r.budget_date.trim() : '';
                const srcName = r.linked_source_name || r.cat_linked_source || r.channel_name || '';
                const srcKey = normalizeSourceKey(srcName);

                const matchedOrder = orderMap.get(`${dtKey}|${srcKey}`);
                if (matchedOrder) {
                    r.order_count = matchedOrder.cnt;
                    r.revenue_amount = matchedOrder.rev;
                } else {
                    r.order_count = Number(r.order_count || 0);
                }
            });

            // Target linked sources filter
            let isCategorySelected = category_id && category_id !== 'all';
            let targetLinkedSources = new Set();

            if (isCategorySelected) {
                const targetCatId = Number(category_id);
                const cats = await db.all('SELECT id, linked_source_name FROM mkt_categories WHERE (id = ? OR parent_id = ?) AND is_active = TRUE', [targetCatId, targetCatId]);
                cats.forEach(c => {
                    if (c.linked_source_name) {
                        c.linked_source_name.split(/[,;|\n]+/).forEach(s => {
                            if (s.trim()) targetLinkedSources.add(normalizeSourceKey(s));
                        });
                    }
                });
            } else {
                const allActiveCats = await db.all("SELECT DISTINCT linked_source_name FROM mkt_categories WHERE is_active = TRUE AND NULLIF(TRIM(linked_source_name), '') IS NOT NULL");
                allActiveCats.forEach(c => {
                    if (c.linked_source_name) {
                        c.linked_source_name.split(/[,;|\n]+/).forEach(s => {
                            if (s.trim()) targetLinkedSources.add(normalizeSourceKey(s));
                        });
                    }
                });
            }

            let filteredOrderStats = orderStats || [];
            if (targetLinkedSources.size === 0) {
                filteredOrderStats = [];
            } else {
                filteredOrderStats = filteredOrderStats.filter(o => targetLinkedSources.has(normalizeSourceKey(o.source)) || targetLinkedSources.has(normalizeSourceKey(o.clean_source_key)));
            }

            if (year && month && month !== 'all') {
                const prefix = `${year}-${String(month).padStart(2, '0')}`;
                filteredOrderStats = filteredOrderStats.filter(o => o.dt_str && o.dt_str.startsWith(prefix));
            } else if (year) {
                const prefix = `${year}-`;
                filteredOrderStats = filteredOrderStats.filter(o => o.dt_str && o.dt_str.startsWith(prefix));
            }

            // Append synthetic rows for orderStats dates that aren't present in marketing_budgets yet (e.g. today 29th)
            if (view_type === 'daily' && month && month !== 'all') {
                const existingDates = new Set(rows.map(r => r.budget_date));
                const defaultCat = (await db.all('SELECT * FROM mkt_categories WHERE is_active = TRUE'))[0] || {};
                
                filteredOrderStats.forEach(o => {
                    if (o.dt_str && !existingDates.has(o.dt_str)) {
                        rows.push({
                            id: 'auto_order_' + o.dt_str + '_' + (o.clean_source_key || 'src'),
                            budget_date: o.dt_str,
                            budget_year: Number(o.dt_str.split('-')[0]),
                            budget_month: Number(o.dt_str.split('-')[1]),
                            channel_name: o.source,
                            cat_icon: '📦',
                            linked_source_name: o.source,
                            ads_handler_name: defaultCat.ads_handler_name || 'Giám Đốc',
                            spent_amount: 0,
                            lead_count: 0,
                            order_count: Number(o.cnt || 0),
                            revenue_amount: Number(o.rev || 0)
                        });
                        existingDates.add(o.dt_str);
                    }
                });

                rows.sort((a, b) => (b.budget_date || '').localeCompare(a.budget_date || ''));
            }

            let totalBudget = 0;
            let totalSpent = 0;
            let totalLeads = 0;
            let totalOrders = 0;
            let totalRevenue = 0;

            rows.forEach(r => {
                totalBudget += Number(r.budget_amount || 0);
                totalSpent += Number(r.spent_amount || 0);
                totalLeads += Number(r.lead_count || 0);
            });

            filteredOrderStats.forEach(o => {
                totalOrders += Number(o.cnt || 0);
                totalRevenue += Number(o.rev || 0);
            });

            const avgCpl = totalLeads > 0 ? Math.round(totalSpent / totalLeads) : 0;
            const roas = totalSpent > 0 ? Number((totalRevenue / totalSpent * 100).toFixed(1)) : 0;

            return {
                success: true,
                data: rows,
                summary: {
                    totalBudget,
                    totalSpent,
                    totalLeads,
                    totalOrders,
                    totalRevenue,
                    avgCpl,
                    roas
                }
            };
        } catch(err) {
            console.error('Error fetching marketing budgets:', err);
            return reply.code(500).send({ error: 'Lỗi máy chủ khi lấy dữ liệu ngân sách' });
        }
    });

    // GET /api/marketing-budgets/first-touch-orders
    fastify.get('/api/marketing-budgets/first-touch-orders', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { year, month, group_type, category_id } = request.query;

            const orderDetails = await db.all(`
                WITH ActiveSources AS (
                    SELECT DISTINCT 
                        LOWER(TRIM(REGEXP_REPLACE(unnest(string_to_array(linked_source_name, ',')), '\\s*\\/\\s*', '/', 'g'))) as clean_src
                    FROM mkt_categories 
                    WHERE is_active = TRUE AND NULLIF(TRIM(linked_source_name), '') IS NOT NULL
                ),
                NormalizedOrders AS (
                    SELECT 
                        o.id,
                        o.order_code,
                        TO_CHAR(o.order_date, 'YYYY-MM-DD HH24:MI') as order_time_str,
                        TO_CHAR(o.order_date, 'YYYY-MM-DD') as dt_str,
                        TRIM(o.source) as source,
                        LOWER(TRIM(REGEXP_REPLACE(o.source, '\\s*\\/\\s*', '/', 'g'))) as clean_source_key,
                        COALESCE(c.customer_name, o.customer_name, 'Khách hàng') as customer_name,
                        COALESCE(u.full_name, '—') as sale_name,
                        COALESCE(o.total_quantity, 0) as total_quantity,
                        COALESCE(o.deposit_amount_cache, 0) as deposit_amount,
                        o.total_amount,
                        RIGHT(REGEXP_REPLACE(COALESCE(c.phone, o.customer_phone, ''), '\\D', '', 'g'), 9) as norm_phone
                    FROM dht_orders o
                    LEFT JOIN customers c ON c.id = o.customer_id OR (
                        RIGHT(REGEXP_REPLACE(c.phone, '\\D', '', 'g'), 9) = RIGHT(REGEXP_REPLACE(o.customer_phone, '\\D', '', 'g'), 9)
                        AND RIGHT(REGEXP_REPLACE(o.customer_phone, '\\D', '', 'g'), 9) <> ''
                    )
                    LEFT JOIN users u ON u.id = o.created_by
                    WHERE o.order_date IS NOT NULL 
                      AND COALESCE(o.is_draft, false) = false
                      AND NULLIF(TRIM(o.source), '') IS NOT NULL
                      AND LOWER(TRIM(REGEXP_REPLACE(o.source, '\\s*\\/\\s*', '/', 'g'))) IN (SELECT clean_src FROM ActiveSources)
                ),
                RankedOrders AS (
                    SELECT 
                        *,
                        ROW_NUMBER() OVER (
                            PARTITION BY norm_phone 
                            ORDER BY dt_str ASC, id ASC
                        ) as rn
                    FROM NormalizedOrders
                )
                SELECT * FROM RankedOrders 
                WHERE rn = 1
                ORDER BY order_time_str DESC, id DESC
            `);

            let isCategorySelected = category_id && category_id !== 'all';
            let targetLinkedSources = new Set();

            if (isCategorySelected) {
                const targetCatId = Number(category_id);
                const cats = await db.all('SELECT id, linked_source_name FROM mkt_categories WHERE (id = ? OR parent_id = ?) AND is_active = TRUE', [targetCatId, targetCatId]);
                cats.forEach(c => {
                    if (c.linked_source_name) {
                        c.linked_source_name.split(/[,;|\n]+/).forEach(s => {
                            if (s.trim()) targetLinkedSources.add(normalizeSourceKey(s));
                        });
                    }
                });
            } else {
                const allActiveCats = await db.all("SELECT DISTINCT linked_source_name FROM mkt_categories WHERE is_active = TRUE AND NULLIF(TRIM(linked_source_name), '') IS NOT NULL");
                allActiveCats.forEach(c => {
                    if (c.linked_source_name) {
                        c.linked_source_name.split(/[,;|\n]+/).forEach(s => {
                            if (s.trim()) targetLinkedSources.add(normalizeSourceKey(s));
                        });
                    }
                });
            }

            let filteredOrders = orderDetails || [];
            if (targetLinkedSources.size === 0) {
                filteredOrders = [];
            } else {
                filteredOrders = filteredOrders.filter(o => targetLinkedSources.has(normalizeSourceKey(o.source)) || targetLinkedSources.has(normalizeSourceKey(o.clean_source_key)));
            }

            if (year && month && month !== 'all') {
                const prefix = `${year}-${String(month).padStart(2, '0')}`;
                filteredOrders = filteredOrders.filter(o => o.dt_str && o.dt_str.startsWith(prefix));
            } else if (year) {
                const prefix = `${year}-`;
                filteredOrders = filteredOrders.filter(o => o.dt_str && o.dt_str.startsWith(prefix));
            }

            let totalQty = 0;
            let totalDeposit = 0;
            let totalRev = 0;

            filteredOrders.forEach(o => {
                totalQty += Number(o.total_quantity || 0);
                totalDeposit += Number(o.deposit_amount || 0);
                totalRev += Number(o.total_amount || 0);
            });

            return {
                success: true,
                orders: filteredOrders,
                summary: {
                    totalOrders: filteredOrders.length,
                    totalQuantity: totalQty,
                    totalDeposit: totalDeposit,
                    totalRevenue: totalRev
                }
            };
        } catch(err) {
            console.error('Error fetching first-touch order details:', err);
            return reply.code(500).send({ error: 'Lỗi máy chủ khi lấy danh sách đơn hàng Marketing' });
        }
    });

    // POST /api/marketing-budgets
    fastify.post('/api/marketing-budgets', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { 
                category_id, group_type, channel_name, budget_year, budget_month, budget_date, 
                budget_amount, spent_amount, lead_count, order_count, revenue_amount, notes,
                image_url, pancake_page_id, pancake_page_name, linked_source_name, ads_handler_name, fb_ad_account_id,
                fb_ad_account_name, fb_ad_account_link, campaign_id, report_link
            } = request.body || {};

            if (!budget_date) {
                return reply.code(400).send({ error: 'Vui lòng chọn Ngày Cụ Thể' });
            }
            if (!notes || !notes.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập Nội dung chi Marketing' });
            }
            if (!report_link || !report_link.trim()) {
                return reply.code(400).send({ error: 'Bắt buộc phải nhập 🔗 Đường Link Báo Chi Phí' });
            }
            if (!image_url || !image_url.trim()) {
                return reply.code(400).send({ error: 'Bắt buộc phải dán/tải 🖼️ Ảnh Hóa Đơn / Bill Chi Phí' });
            }

            let targetCampaignId = campaign_id ? Number(campaign_id) : null;
            if (targetCampaignId) {
                const camp = await db.get('SELECT * FROM mkt_campaigns WHERE id = ? AND is_active = TRUE', [targetCampaignId]);
                if (camp && Number(camp.max_budget || 0) > 0) {
                    const maxBudget = Number(camp.max_budget);
                    const spentSumRow = await db.get('SELECT COALESCE(SUM(spent_amount), 0) as total_spent FROM marketing_budgets WHERE campaign_id = ?', [targetCampaignId]);
                    const existingSpent = Number(spentSumRow?.total_spent || 0);
                    const newSpent = Number(spent_amount || 0);

                    if (existingSpent + newSpent > maxBudget) {
                        const remaining = Math.max(0, maxBudget - existingSpent);
                        return reply.code(400).send({ 
                            error: `Chi phí thực tế (${newSpent.toLocaleString('vi-VN')}đ) vượt quá Chi Phí Tối Đa (${maxBudget.toLocaleString('vi-VN')}đ) của Chiến dịch "${camp.name}". Số tiền tối đa còn được phép nhập: ${remaining.toLocaleString('vi-VN')}đ.` 
                        });
                    }
                }
            }

            // Derive year & month from budget_date if needed
            const dateParts = budget_date.split('-');
            const calcYear = dateParts.length === 3 ? Number(dateParts[0]) : Number(budget_year || new Date().getFullYear());
            const calcMonth = dateParts.length === 3 ? Number(dateParts[1]) : Number(budget_month || (new Date().getMonth() + 1));

            let catId = category_id ? Number(category_id) : null;
            let group = group_type || 'online';
            let channel = channel_name || 'Khác';
            let finalLinkedSource = linked_source_name || null;
            let finalPageId = pancake_page_id || null;
            let finalPageName = pancake_page_name || null;
            let finalAdsHandler = ads_handler_name || null;
            let finalAdAccId = fb_ad_account_id || null;
            let finalAdAccName = fb_ad_account_name || null;
            let finalAdAccLink = fb_ad_account_link || null;

            if (catId) {
                const catInfo = await db.get('SELECT * FROM mkt_categories WHERE id = ?', [catId]);
                if (catInfo) {
                    group = catInfo.group_type;
                    channel = catInfo.name;
                    if (!finalLinkedSource && catInfo.linked_source_name) finalLinkedSource = catInfo.linked_source_name;
                    if (!finalPageId && catInfo.pancake_page_id) finalPageId = catInfo.pancake_page_id;
                    if (!finalPageName && catInfo.pancake_page_name) finalPageName = catInfo.pancake_page_name;
                    if (!finalAdsHandler && catInfo.ads_handler_name) finalAdsHandler = catInfo.ads_handler_name;
                    if (!finalAdAccId && catInfo.fb_ad_account_id) finalAdAccId = catInfo.fb_ad_account_id;
                    if (!finalAdAccName && catInfo.fb_ad_account_name) finalAdAccName = catInfo.fb_ad_account_name;
                    if (!finalAdAccLink && catInfo.fb_ad_account_link) finalAdAccLink = catInfo.fb_ad_account_link;

                    // Permission check for non-managers
                    if (request.user.role !== 'giam_doc' && request.user.role !== 'quan_ly_cap_cao' && request.user.role !== 'quan_ly') {
                        const reqUserName = (request.user.full_name || request.user.name || request.user.username || '').toLowerCase().trim();
                        const handler = (catInfo.ads_handler_name || '').toLowerCase().trim();
                        const reporters = (catInfo.allowed_reporter_names || '').toLowerCase().trim();
                        const isHandlerMatch = handler && (handler.includes(reqUserName) || reqUserName.includes(handler));
                        const isReporterMatch = reporters && reporters.includes(reqUserName);

                        if (!isHandlerMatch && !isReporterMatch) {
                            return reply.code(403).send({ error: `Bạn không có quyền báo chi phí cho Kênh Marketing: ${catInfo.name}` });
                        }
                    }
                }
            }

            const res = await db.get(`
                INSERT INTO marketing_budgets 
                (category_id, campaign_id, group_type, channel, channel_name, budget_year, budget_month, budget_date, budget_amount, spent_amount, lead_count, order_count, revenue_amount, notes, image_url, report_link, pancake_page_id, pancake_page_name, linked_source_name, ads_handler_name, fb_ad_account_id, fb_ad_account_name, fb_ad_account_link, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                RETURNING id
            `, [
                catId,
                targetCampaignId,
                group,
                channel,
                channel,
                calcYear,
                calcMonth,
                budget_date || null,
                Number(budget_amount || 0),
                Number(spent_amount || 0),
                Number(lead_count || 0),
                Number(order_count || 0),
                Number(revenue_amount || 0),
                notes.trim(),
                image_url || null,
                report_link ? report_link.trim() : null,
                finalPageId,
                finalPageName,
                finalLinkedSource,
                finalAdsHandler,
                finalAdAccId,
                finalAdAccName,
                finalAdAccLink,
                request.user.id
            ]);

            return { success: true, id: res.id, message: 'Đã thêm khoản chi phí/ngân sách' };
        } catch(err) {
            console.error('Error adding marketing budget:', err);
            return reply.code(500).send({ error: 'Lỗi khi thêm khoản chi phí' });
        }
    });

    // PUT /api/marketing-budgets/:id
    fastify.put('/api/marketing-budgets/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const id = Number(request.params.id);
            const { 
                category_id, group_type, channel_name, budget_year, budget_month, budget_date, 
                budget_amount, spent_amount, lead_count, order_count, revenue_amount, notes,
                image_url, pancake_page_id, pancake_page_name, linked_source_name, ads_handler_name, fb_ad_account_id,
                fb_ad_account_name, fb_ad_account_link, campaign_id, report_link
            } = request.body || {};
            
            const existing = await db.get('SELECT * FROM marketing_budgets WHERE id = ?', [id]);
            if (!existing) {
                return reply.code(404).send({ error: 'Không tìm thấy bản ghi chi phí' });
            }
            if (existing.is_approved) {
                return reply.code(400).send({ error: '🔒 Phiếu chi này đã được Giám Đốc DUYỆT CHI. Hệ thống KHÓA LẠI không cho phép chỉnh sửa!' });
            }

            let catId = category_id ? Number(category_id) : existing.category_id;
            let group = group_type || existing.group_type;
            let channel = channel_name || existing.channel_name;
            let finalLinkedSource = linked_source_name ?? existing.linked_source_name;

            if (category_id) {
                const catInfo = await db.get('SELECT * FROM mkt_categories WHERE id = ?', [catId]);
                if (catInfo) {
                    group = catInfo.group_type;
                    channel = catInfo.name;
                }
            }

            let calcYear = existing.budget_year;
            let calcMonth = existing.budget_month;
            if (budget_date) {
                const dateParts = budget_date.split('-');
                if (dateParts.length === 3) {
                    calcYear = Number(dateParts[0]);
                    calcMonth = Number(dateParts[1]);
                }
            }

            await db.run(`
                UPDATE marketing_budgets SET
                    category_id = ?,
                    campaign_id = ?,
                    group_type = ?,
                    channel = ?,
                    channel_name = ?,
                    budget_year = ?,
                    budget_month = ?,
                    budget_date = ?,
                    budget_amount = ?,
                    spent_amount = ?,
                    lead_count = ?,
                    order_count = ?,
                    revenue_amount = ?,
                    notes = ?,
                    image_url = ?,
                    report_link = ?,
                    pancake_page_id = ?,
                    pancake_page_name = ?,
                    linked_source_name = ?,
                    ads_handler_name = ?,
                    fb_ad_account_id = ?,
                    fb_ad_account_name = ?,
                    fb_ad_account_link = ?,
                    updated_at = NOW()
                WHERE id = ?
            `, [
                catId,
                campaign_id ? Number(campaign_id) : existing.campaign_id,
                group,
                channel,
                channel,
                calcYear,
                calcMonth,
                budget_date || existing.budget_date,
                budget_amount ?? existing.budget_amount,
                spent_amount ?? existing.spent_amount,
                lead_count ?? existing.lead_count,
                order_count ?? existing.order_count,
                revenue_amount ?? existing.revenue_amount,
                notes ? notes.trim() : existing.notes,
                image_url ?? existing.image_url,
                report_link ? report_link.trim() : existing.report_link,
                pancake_page_id ?? existing.pancake_page_id,
                pancake_page_name ?? existing.pancake_page_name,
                finalLinkedSource,
                ads_handler_name ?? existing.ads_handler_name,
                fb_ad_account_id ?? existing.fb_ad_account_id,
                fb_ad_account_name ?? existing.fb_ad_account_name,
                fb_ad_account_link ?? existing.fb_ad_account_link,
                id
            ]);

            return { success: true, message: 'Đã cập nhật chi phí' };
        } catch(err) {
            console.error('Error updating marketing budget:', err);
            return reply.code(500).send({ error: 'Lỗi khi cập nhật chi phí' });
        }
    });

    // DELETE /api/marketing-budgets/:id
    fastify.delete('/api/marketing-budgets/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const id = Number(request.params.id);
            const existing = await db.get('SELECT * FROM marketing_budgets WHERE id = ?', [id]);
            if (!existing) {
                return reply.code(404).send({ error: 'Không tìm thấy bản ghi chi phí' });
            }
            if (existing.is_approved) {
                return reply.code(400).send({ error: '🔒 Phiếu chi này đã được Giám Đốc DUYỆT CHI. Hệ thống KHÓA LẠI không cho phép xóa!' });
            }
            await db.run('DELETE FROM marketing_budgets WHERE id = ?', [id]);
            return { success: true, message: 'Đã xóa bản ghi chi phí thành công!' };
        } catch(err) {
            console.error('Error deleting marketing budget:', err);
            return reply.code(500).send({ error: 'Lỗi khi xóa chi phí' });
        }
    });

    // POST /api/marketing-budgets/:id/approve (Director only)
    fastify.post('/api/marketing-budgets/:id/approve', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            if (!isGiamDoc(request.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền Duyệt Chi' });
            }
            const id = Number(request.params.id);
            const { director_bill_image_url } = request.body || {};

            const existing = await db.get('SELECT * FROM marketing_budgets WHERE id = ?', [id]);
            if (!existing) {
                return reply.code(404).send({ error: 'Không tìm thấy bản ghi chi phí' });
            }

            await db.run(`
                UPDATE marketing_budgets SET
                    is_approved = TRUE,
                    approved_by = ?,
                    approved_at = NOW(),
                    director_bill_image_url = ?
                WHERE id = ?
            `, [
                request.user.id,
                director_bill_image_url || null,
                id
            ]);

            return { success: true, message: '✅ Đã Duyệt Chi và gửi Bill chuyển khoản thành công!' };
        } catch(err) {
            console.error('Error approving marketing budget:', err);
            return reply.code(500).send({ error: 'Lỗi khi duyệt chi phí' });
        }
    });

    // GET /api/marketing-campaigns
    fastify.get('/api/marketing-campaigns', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            const { category_id } = request.query || {};
            let sql = `
                SELECT mc.*, c.name as category_name, c.icon as category_icon, u.full_name as creator_name,
                       COALESCE((SELECT SUM(spent_amount) FROM marketing_budgets WHERE campaign_id = mc.id), 0) as total_spent
                FROM mkt_campaigns mc
                LEFT JOIN mkt_categories c ON c.id = mc.category_id
                LEFT JOIN users u ON u.id = mc.created_by
                WHERE mc.is_active = TRUE
            `;
            const params = [];
            if (category_id && category_id !== 'all') {
                const targetCatId = Number(category_id);
                const children = await db.all('SELECT id FROM mkt_categories WHERE parent_id = ? AND is_active = TRUE', [targetCatId]);
                const allCatIds = [targetCatId, ...(children || []).map(ch => ch.id)];
                const placeholders = allCatIds.map(() => `?`).join(',');
                params.push(...allCatIds);
                sql += ` AND (mc.category_id IS NULL OR mc.category_id IN (${placeholders}))`;
            }
            sql += ' ORDER BY mc.id DESC';
            const rows = await db.all(sql, params);
            return rows || [];
        } catch(err) {
            console.error('Error fetching campaigns:', err);
            return reply.code(500).send({ error: 'Lỗi khi lấy danh sách chiến dịch' });
        }
    });

    // POST /api/marketing-campaigns (Director only)
    fastify.post('/api/marketing-campaigns', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            if (!isGiamDoc(request.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền tạo Chiến Dịch Marketing' });
            }

            const { category_id, name, target_goal, max_budget } = request.body || {};
            if (!name || !name.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập Tên chiến dịch Marketing' });
            }
            if (!target_goal || !target_goal.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập Mục tiêu chiến dịch' });
            }
            if (!max_budget || Number(max_budget) <= 0) {
                return reply.code(400).send({ error: 'Vui lòng nhập Chi phí tối đa hợp lệ (> 0đ)' });
            }

            const res = await db.get(`
                INSERT INTO mkt_campaigns (category_id, name, target_goal, max_budget, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                RETURNING id
            `, [
                category_id ? Number(category_id) : null,
                name.trim(),
                target_goal.trim(),
                Number(max_budget),
                request.user.id
            ]);

            return { success: true, id: res.id, message: 'Đã tạo Chiến Dịch Marketing thành công!' };
        } catch(err) {
            console.error('Error creating campaign:', err);
            return reply.code(500).send({ error: 'Lỗi khi tạo chiến dịch' });
        }
    });

    // DELETE /api/marketing-campaigns/:id (Director only)
    fastify.delete('/api/marketing-campaigns/:id', { preHandler: [authenticate] }, async (request, reply) => {
        try {
            if (!isGiamDoc(request.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa Chiến Dịch Marketing' });
            }
            const id = Number(request.params.id);
            await db.run('UPDATE mkt_campaigns SET is_active = FALSE WHERE id = ?', [id]);
            return { success: true, message: 'Đã xóa chiến dịch' };
        } catch(err) {
            console.error('Error deleting campaign:', err);
            return reply.code(500).send({ error: 'Lỗi khi xóa chiến dịch' });
        }
    });
}

async function syncMetaInsightsInternal(targetYear, targetMonth) {
    try {
        const now = new Date();
        const year = targetYear || now.getFullYear();
        const month = targetMonth || (now.getMonth() + 1);

        const sinceDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const untilDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const targetCats = await db.all("SELECT * FROM mkt_categories WHERE is_active = TRUE AND fb_ad_account_id IS NOT NULL AND fb_access_token IS NOT NULL");
        if (!targetCats || targetCats.length === 0) return { success: false, message: 'No cats' };

        for (const cat of targetCats) {
            try {
                const adAccId = cat.fb_ad_account_id;
                const token = cat.fb_access_token;
                const adAccName = cat.fb_ad_account_name || null;
                const adAccLink = cat.fb_ad_account_link || null;

                const fbUrl = `https://graph.facebook.com/v20.0/${adAccId}/insights?fields=spend,actions&time_range=${encodeURIComponent(JSON.stringify({ since: sinceDate, until: untilDate }))}&time_increment=1&limit=100&access_token=${encodeURIComponent(token)}`;
                const resp = await fetch(fbUrl);
                const json = await resp.json();
                if (!json.data) continue;

                for (const dayObj of json.data) {
                    const dayDate = dayObj.date_start;
                    const daySpent = Number(dayObj.spend || 0);
                    let dayMsgs = 0;

                    if (Array.isArray(dayObj.actions)) {
                        const msgStartedAct = dayObj.actions.find(a => 
                            a.action_type === 'onsite_conversion.messaging_conversation_started_7d' || 
                            a.action_type === 'messaging_conversation_started_7d' ||
                            a.action_type === 'messaging_conversation_started'
                        );

                        if (msgStartedAct) {
                            dayMsgs = Number(msgStartedAct.value || 0);
                        } else {
                            const totalConnAct = dayObj.actions.find(a => a.action_type === 'onsite_conversion.total_messaging_connection');
                            const leadAct = dayObj.actions.find(a => a.action_type === 'lead');
                            if (totalConnAct) dayMsgs = Number(totalConnAct.value || 0);
                            else if (leadAct) dayMsgs = Number(leadAct.value || 0);
                        }
                    }

                    const existingRecord = await db.get("SELECT id FROM marketing_budgets WHERE category_id = ? AND budget_date = ? AND (notes IS NULL OR notes = '') AND image_url IS NULL", [cat.id, dayDate]);

                    if (existingRecord) {
                        await db.run(`
                            UPDATE marketing_budgets SET
                                spent_amount = ?,
                                lead_count = ?,
                                fb_ad_account_id = ?,
                                fb_ad_account_name = ?,
                                fb_ad_account_link = ?,
                                updated_at = NOW()
                            WHERE id = ?
                        `, [daySpent, dayMsgs, adAccId, adAccName, adAccLink, existingRecord.id]);
                    } else {
                        await db.run(`
                            INSERT INTO marketing_budgets 
                            (category_id, group_type, channel, channel_name, budget_year, budget_month, budget_date, budget_amount, spent_amount, lead_count, pancake_page_id, pancake_page_name, linked_source_name, ads_handler_name, fb_ad_account_id, fb_ad_account_name, fb_ad_account_link, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                        `, [
                            cat.id,
                            cat.group_type,
                            cat.name,
                            cat.name,
                            year,
                            month,
                            dayDate,
                            daySpent,
                            dayMsgs,
                            cat.pancake_page_id,
                            cat.pancake_page_name,
                            cat.linked_source_name,
                            cat.ads_handler_name,
                            adAccId,
                            adAccName,
                            adAccLink
                        ]);
                    }
                }
            } catch(e) {}
        }
        return { success: true };
    } catch(e) {
        return { success: false, error: e.message };
    }
}

nganSachMktRoutes.syncMetaInsightsInternal = syncMetaInsightsInternal;
module.exports = nganSachMktRoutes;
