// ========== THỐNG KÊ CHIẾN DỊCH ADS ROUTES ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function (fastify, opts) {

    // ========== 0. AUTO MIGRATION ==========

    // Bảng 1: ads_stats_accounts — Tài khoản quảng cáo
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_stats_accounts (
                id SERIAL PRIMARY KEY,
                platform VARCHAR(20) NOT NULL DEFAULT 'facebook',
                account_name VARCHAR(255) NOT NULL,
                fb_ad_account_id VARCHAR(100),
                fb_ad_account_link TEXT,
                fb_dev_account_name VARCHAR(255),
                fb_dev_account_link TEXT,
                fb_dev_portal_link TEXT,
                fb_access_token TEXT,
                fanpage_id VARCHAR(100),
                fanpage_name VARCHAR(255),
                effectiveness_metric VARCHAR(50) DEFAULT 'cpa',
                effectiveness_threshold DECIMAL(15,2) DEFAULT 75000,
                spend_min DECIMAL(15,2) DEFAULT 1,
                spend_max DECIMAL(15,2) DEFAULT 20000000,
                is_active BOOLEAN DEFAULT TRUE,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.run(`ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS win_rate_threshold DECIMAL(8,2) DEFAULT 50`);
        await db.run(`UPDATE ads_stats_accounts SET win_rate_threshold = 50 WHERE win_rate_threshold >= 100 OR win_rate_threshold <= 0 OR win_rate_threshold IS NULL`);
    } catch(e) { console.error('[ads_stats_accounts migration]', e.message); }

    // Bảng 2: ads_stats_daily — Thống kê hàng ngày theo campaign
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_stats_daily (
                id SERIAL PRIMARY KEY,
                account_id INT NOT NULL REFERENCES ads_stats_accounts(id) ON DELETE CASCADE,
                report_date DATE NOT NULL,
                campaign_id VARCHAR(100) NOT NULL,
                campaign_name VARCHAR(500),
                link_post_id VARCHAR(255),
                spend DECIMAL(15,2) DEFAULT 0,
                messages INT DEFAULT 0,
                cpa DECIMAL(15,2) DEFAULT 0,
                cpc DECIMAL(15,2) DEFAULT 0,
                ctr DECIMAL(10,4) DEFAULT 0,
                cpm DECIMAL(15,2) DEFAULT 0,
                run_count INT DEFAULT 1,
                is_effective BOOLEAN DEFAULT FALSE,
                raw_actions JSONB,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(account_id, report_date, campaign_id)
            )
        `);
        await db.run(`ALTER TABLE ads_stats_daily ADD COLUMN IF NOT EXISTS cpc DECIMAL(15,2) DEFAULT 0`);
    } catch(e) { console.error('[ads_stats_daily migration]', e.message); }

    // Bảng 3: ads_sync_schedule_settings — Cấu hình khung giờ đồng bộ tự động
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_sync_schedule_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.run(`
            INSERT INTO ads_sync_schedule_settings (setting_key, setting_value, updated_at)
            VALUES ('sync_hours', '0,1,8,13,19', NOW())
            ON CONFLICT (setting_key) DO NOTHING
        `);
        await db.run(`
            INSERT INTO ads_sync_schedule_settings (setting_key, setting_value, updated_at)
            VALUES ('sync_enabled', 'true', NOW())
            ON CONFLICT (setting_key) DO NOTHING
        `);
        await db.run(`
            INSERT INTO ads_sync_schedule_settings (setting_key, setting_value, updated_at)
            VALUES ('zalo_notify_hours', '0', NOW())
            ON CONFLICT (setting_key) DO NOTHING
        `);
    } catch(e) { console.error('[ads_sync_schedule_settings migration]', e.message); }

    // ========== HELPERS ==========

    function _isGiamDoc(user) {
        const r = (user.role || '').toLowerCase();
        return r === 'giam_doc' || r === 'admin' || r === 'ban_giam_doc' || !!user.is_admin;
    }

    // ========== 1. ACCOUNTS CRUD ==========

    // GET /api/thongkeads/accounts — Lấy danh sách tài khoản QC
    fastify.get('/api/thongkeads/accounts', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rows = await db.all(`
                SELECT a.*,
                    (SELECT COUNT(*) FROM ads_stats_daily d WHERE d.account_id = a.id) as total_records
                FROM ads_stats_accounts a
                ORDER BY a.id DESC
            `);
            // Ẩn token khi trả về (chỉ show 10 ký tự đầu)
            const safe = rows.map(r => ({
                ...r,
                fb_access_token: r.fb_access_token ? r.fb_access_token.substring(0, 10) + '...' : null,
                _has_token: !!r.fb_access_token
            }));
            return reply.send({ ok: true, accounts: safe });
        } catch (e) {
            console.error('[thongkeads accounts GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/thongkeads/accounts/:id — Lấy chi tiết 1 tài khoản (Giám Đốc mới thấy token đầy đủ)
    fastify.get('/api/thongkeads/accounts/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const row = await db.get(`SELECT * FROM ads_stats_accounts WHERE id = $1`, [req.params.id]);
            if (!row) return reply.code(404).send({ error: 'Không tìm thấy tài khoản!' });

            if (!_isGiamDoc(req.user)) {
                row.fb_access_token = row.fb_access_token ? row.fb_access_token.substring(0, 10) + '...' : null;
            }
            return reply.send({ ok: true, account: row });
        } catch (e) {
            console.error('[thongkeads accounts GET/:id]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/thongkeads/accounts — Tạo tài khoản QC mới (Giám Đốc)
    fastify.post('/api/thongkeads/accounts', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền tạo tài khoản quảng cáo!' });
            }

            const {
                platform, account_name, fb_ad_account_id, fb_ad_account_link,
                fb_dev_account_name, fb_dev_account_link, fb_dev_portal_link,
                fb_access_token, fanpage_id, fanpage_name,
                effectiveness_metric, effectiveness_threshold,
                spend_min, spend_max
            } = req.body || {};

            if (!account_name || !account_name.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập tên tài khoản quảng cáo!' });
            }

            const plat = (platform || 'facebook').toLowerCase();
            if (plat === 'facebook') {
                if (!fb_ad_account_id || !fb_access_token) {
                    return reply.code(400).send({ error: 'Vui lòng nhập ID tài khoản QC và Access Token Meta!' });
                }
            }

            let cleanAdAccId = (fb_ad_account_id || '').trim();
            if (cleanAdAccId && !cleanAdAccId.startsWith('act_')) {
                cleanAdAccId = 'act_' + cleanAdAccId;
            }

            const result = await db.get(`
                INSERT INTO ads_stats_accounts (
                    platform, account_name, fb_ad_account_id, fb_ad_account_link,
                    fb_dev_account_name, fb_dev_account_link, fb_dev_portal_link,
                    fb_access_token, fanpage_id, fanpage_name,
                    effectiveness_metric, effectiveness_threshold,
                    spend_min, spend_max, created_by
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
                RETURNING *
            `, [
                plat,
                account_name.trim(),
                cleanAdAccId || null,
                (fb_ad_account_link || '').trim() || null,
                (fb_dev_account_name || '').trim() || null,
                (fb_dev_account_link || '').trim() || null,
                (fb_dev_portal_link || '').trim() || null,
                (fb_access_token || '').trim() || null,
                (fanpage_id || '').trim() || null,
                (fanpage_name || '').trim() || null,
                effectiveness_metric || 'cpa',
                parseFloat(effectiveness_threshold) || 75000,
                parseFloat(spend_min) || 1,
                parseFloat(spend_max) || 20000000,
                req.user.id
            ]);

            return reply.send({ ok: true, account: result });
        } catch (e) {
            console.error('[thongkeads accounts POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    function _cleanNumber(val, defaultVal = null) {
        if (val === null || val === undefined || val === '') return defaultVal;
        const str = String(val).replace(/\./g, '').replace(/,/g, '').trim();
        const num = parseFloat(str);
        return isNaN(num) ? defaultVal : num;
    }

    function _cleanPercent(val, defaultVal = 50) {
        if (val === null || val === undefined || val === '') return defaultVal;
        const num = parseFloat(String(val).replace(',', '.'));
        return isNaN(num) ? defaultVal : num;
    }

    // PUT /api/thongkeads/accounts/:id — Sửa tài khoản (Giám Đốc)
    fastify.put('/api/thongkeads/accounts/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền sửa tài khoản!' });
            }

            const id = Number(req.params.id);
            const existing = await db.get(`SELECT * FROM ads_stats_accounts WHERE id = $1`, [id]);
            if (!existing) return reply.code(404).send({ error: 'Không tìm thấy tài khoản!' });

            const {
                account_name, fb_ad_account_id, fb_ad_account_link,
                fb_dev_account_name, fb_dev_account_link, fb_dev_portal_link,
                fb_access_token, fanpage_id, fanpage_name,
                effectiveness_metric, effectiveness_threshold, ignore_no_msg_spend_threshold,
                win_rate_threshold,
                spend_min, spend_max, is_active
            } = req.body || {};

            let cleanAdAccId = (fb_ad_account_id || '').trim();
            if (cleanAdAccId && !cleanAdAccId.startsWith('act_')) {
                cleanAdAccId = 'act_' + cleanAdAccId;
            }

            const result = await db.get(`
                UPDATE ads_stats_accounts SET
                    account_name = COALESCE($1, account_name),
                    fb_ad_account_id = COALESCE($2, fb_ad_account_id),
                    fb_ad_account_link = COALESCE($3, fb_ad_account_link),
                    fb_dev_account_name = COALESCE($4, fb_dev_account_name),
                    fb_dev_account_link = COALESCE($5, fb_dev_account_link),
                    fb_dev_portal_link = COALESCE($6, fb_dev_portal_link),
                    fb_access_token = COALESCE($7, fb_access_token),
                    fanpage_id = COALESCE($8, fanpage_id),
                    fanpage_name = COALESCE($9, fanpage_name),
                    effectiveness_metric = COALESCE($10, effectiveness_metric),
                    effectiveness_threshold = COALESCE($11, effectiveness_threshold),
                    ignore_no_msg_spend_threshold = COALESCE($12, ignore_no_msg_spend_threshold),
                    win_rate_threshold = COALESCE($13, win_rate_threshold),
                    spend_min = COALESCE($14, spend_min),
                    spend_max = COALESCE($15, spend_max),
                    is_active = COALESCE($16, is_active),
                    updated_at = NOW()
                WHERE id = $17
                RETURNING *
            `, [
                account_name?.trim() || null,
                cleanAdAccId || null,
                fb_ad_account_link?.trim() || null,
                fb_dev_account_name?.trim() || null,
                fb_dev_account_link?.trim() || null,
                fb_dev_portal_link?.trim() || null,
                fb_access_token?.trim() || null,
                fanpage_id?.trim() || null,
                fanpage_name?.trim() || null,
                effectiveness_metric || null,
                effectiveness_threshold != null ? _cleanNumber(effectiveness_threshold, existing.effectiveness_threshold) : existing.effectiveness_threshold,
                ignore_no_msg_spend_threshold != null ? _cleanNumber(ignore_no_msg_spend_threshold, existing.ignore_no_msg_spend_threshold || 70000) : existing.ignore_no_msg_spend_threshold || 70000,
                win_rate_threshold != null ? _cleanPercent(win_rate_threshold, _cleanPercent(existing.win_rate_threshold, 50)) : _cleanPercent(existing.win_rate_threshold, 50),
                spend_min != null ? _cleanNumber(spend_min, existing.spend_min) : existing.spend_min,
                spend_max != null ? _cleanNumber(spend_max, existing.spend_max) : existing.spend_max,
                is_active != null ? is_active : null,
                id
            ]);

            return reply.send({ ok: true, account: result });
        } catch (e) {
            console.error('[thongkeads accounts PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/thongkeads/accounts/:id — Xóa tài khoản (Giám Đốc)
    fastify.delete('/api/thongkeads/accounts/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa tài khoản!' });
            }
            const id = Number(req.params.id);
            // CASCADE sẽ tự xóa ads_stats_daily liên quan
            await db.run(`DELETE FROM ads_stats_accounts WHERE id = $1`, [id]);
            return reply.send({ ok: true });
        } catch (e) {
            console.error('[thongkeads accounts DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 2. SYNC FROM META API ==========

    /**
     * Hàm core: đồng bộ dữ liệu từ Meta Graph API
     * Giống logic n8n workflow — 2 bước:
     *   1) GET /act_{id}/insights?level=campaign (lấy insights)
     *   2) GET /{campaign_id}/ads?fields=creative{object_story_id} (lấy Post ID)
     */
    async function syncMetaForAccount(account, sinceDate, untilDate) {
        const adAccId = account.fb_ad_account_id;
        const token = account.fb_access_token;
        const spendMin = parseFloat(account.spend_min) || 1;
        const spendMax = parseFloat(account.spend_max) || 20000000;
        const threshold = parseFloat(account.effectiveness_threshold) || 75000;
        const metric = account.effectiveness_metric || 'cpa';

        if (!adAccId || !token) {
            throw new Error('Chưa cấu hình Ad Account ID hoặc Access Token!');
        }

        // BƯỚC 1: Lấy insights level=campaign
        const timeRange = JSON.stringify({ since: sinceDate, until: untilDate });
        const insightsUrl = `https://graph.facebook.com/v20.0/${adAccId}/insights`
            + `?level=campaign`
            + `&fields=campaign_id,campaign_name,spend,actions,ctr,cpm,cpc,cost_per_inline_link_click,inline_link_clicks,clicks,date_start`
            + `&action_breakdowns=action_type`
            + `&time_range=${encodeURIComponent(timeRange)}`
            + `&time_increment=1`
            + `&limit=500`
            + `&access_token=${encodeURIComponent(token)}`;

        let allData = [];
        let nextUrl = insightsUrl;

        // Pagination: follow paging.next
        while (nextUrl) {
            const resp = await fetch(nextUrl);
            const json = await resp.json();

            if (json.error) {
                throw new Error(`Meta API Error: ${json.error.message}`);
            }

            if (json.data && json.data.length > 0) {
                allData = allData.concat(json.data);
            }

            nextUrl = json.paging?.next || null;
        }

        console.log(`[ThongKeAds Sync] Account "${account.account_name}": ${allData.length} campaign-day records from Meta`);

        // Cache Post IDs per campaign (tránh gọi lại API cho cùng campaign)
        const postIdCache = {};

        let savedCount = 0;
        let skippedCount = 0;

        for (const item of allData) {
            const campaignId = item.campaign_id;
            const campaignName = item.campaign_name || '';
            const reportDate = item.date_start;
            const spend = parseFloat(item.spend || 0);
            const ctr = parseFloat(item.ctr || 0);
            const cpm = parseFloat(item.cpm || 0);

            // Lọc theo ngưỡng chi tiêu
            if (spend < spendMin || spend > spendMax) {
                skippedCount++;
                continue;
            }

            // Đếm tin nhắn: onsite_conversion.messaging_conversation_started_7d
            let messages = 0;
            const actions = item.actions || [];
            for (const act of actions) {
                if (act.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                    messages += parseInt(act.value || 0, 10);
                }
            }

            // Tính CPA
            const cpa = messages > 0 ? spend / messages : 999999;

            // Tính CPC (Cost per inline link click hoặc cpc từ Meta API)
            let cpc = 0;
            if (item.cost_per_inline_link_click) {
                if (Array.isArray(item.cost_per_inline_link_click) && item.cost_per_inline_link_click.length > 0) {
                    cpc = parseFloat(item.cost_per_inline_link_click[0].value || 0);
                } else {
                    cpc = parseFloat(item.cost_per_inline_link_click || 0);
                }
            }
            if (!cpc && item.cpc) {
                cpc = parseFloat(item.cpc || 0);
            }
            if (!cpc && spend > 0) {
                let linkClicks = 0;
                if (item.inline_link_clicks) linkClicks = parseInt(item.inline_link_clicks || 0, 10);
                else if (item.clicks) linkClicks = parseInt(item.clicks || 0, 10);

                if (linkClicks > 0) {
                    cpc = spend / linkClicks;
                } else if (ctr > 0 && cpm > 0) {
                    cpc = cpm / (ctr * 10);
                }
            }

            // Đánh dấu hiệu quả
            let isEffective = false;
            if (metric === 'cpa') {
                isEffective = messages > 0 && cpa < threshold;
            } else if (metric === 'ctr') {
                isEffective = ctr > threshold;
            } else if (metric === 'cpm') {
                isEffective = cpm < threshold;
            }

            // BƯỚC 2: Lấy Post ID (cache per campaign)
            let linkPostId = '';
            if (!postIdCache.hasOwnProperty(campaignId)) {
                try {
                    const adsUrl = `https://graph.facebook.com/v20.0/${campaignId}/ads`
                        + `?fields=creative{object_story_id}`
                        + `&limit=1`
                        + `&access_token=${encodeURIComponent(token)}`;
                    const adsResp = await fetch(adsUrl);
                    const adsJson = await adsResp.json();

                    if (adsJson.data && adsJson.data.length > 0) {
                        const firstAd = adsJson.data[0];
                        if (firstAd.creative && firstAd.creative.object_story_id) {
                            const storyId = firstAd.creative.object_story_id;
                            // Format: PAGE_ID_POST_ID → lấy POST_ID
                            if (storyId.includes('_')) {
                                linkPostId = storyId.split('_')[1];
                            } else {
                                linkPostId = storyId;
                            }
                        }
                    }
                    postIdCache[campaignId] = linkPostId || campaignId;
                } catch (e) {
                    console.error(`[ThongKeAds] Error getting Post ID for campaign ${campaignId}:`, e.message);
                    postIdCache[campaignId] = campaignId; // fallback to campaign ID
                }
            }
            linkPostId = postIdCache[campaignId];

            // Upsert vào DB
            await db.run(`
                INSERT INTO ads_stats_daily (
                    account_id, report_date, campaign_id, campaign_name,
                    link_post_id, spend, messages, cpa, cpc, ctr, cpm,
                    run_count, is_effective, raw_actions, synced_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
                ON CONFLICT (account_id, report_date, campaign_id)
                DO UPDATE SET
                    campaign_name = $4,
                    link_post_id = $5,
                    spend = $6,
                    messages = $7,
                    cpa = $8,
                    cpc = $9,
                    ctr = $10,
                    cpm = $11,
                    run_count = $12,
                    is_effective = $13,
                    raw_actions = $14,
                    synced_at = NOW()
            `, [
                account.id,
                reportDate,
                campaignId,
                campaignName,
                linkPostId,
                spend,
                messages,
                Math.round(cpa * 100) / 100,
                Math.round(cpc * 100) / 100,
                Math.round(ctr * 10000) / 10000,
                Math.round(cpm * 100) / 100,
                1, // run_count = 1 per day
                isEffective,
                JSON.stringify(actions)
            ]);

            savedCount++;
        }

        return {
            account_name: account.account_name,
            total_from_api: allData.length,
            saved: savedCount,
            skipped: skippedCount,
            date_range: `${sinceDate} → ${untilDate}`
        };
    }

    // POST /api/thongkeads/accounts/:id/sync — Đồng bộ từ Meta API (Giám Đốc)
    fastify.post('/api/thongkeads/accounts/:id/sync', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền đồng bộ dữ liệu!' });
            }

            const id = Number(req.params.id);
            const account = await db.get(`SELECT * FROM ads_stats_accounts WHERE id = $1`, [id]);
            if (!account) return reply.code(404).send({ error: 'Không tìm thấy tài khoản!' });

            if (account.platform !== 'facebook') {
                return reply.code(400).send({ error: `Platform "${account.platform}" chưa được hỗ trợ đồng bộ!` });
            }

            // Xác định date range từ request body
            let { since, until, year, month } = req.body || {};
            let sinceDate, untilDate;
            if (since && until) {
                sinceDate = since;
                untilDate = until;
            } else {
                const now = new Date();
                const targetYear = parseInt(year) || now.getFullYear();
                const targetMonth = parseInt(month) || (now.getMonth() + 1);
                sinceDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
                const lastDay = new Date(targetYear, targetMonth, 0).getDate();
                untilDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            }

            const result = await syncMetaForAccount(account, sinceDate, untilDate);

            return reply.send({
                ok: true,
                message: `Đồng bộ thành công! ${result.saved} bản ghi đã lưu, ${result.skipped} bản ghi bỏ qua (ngoài ngưỡng chi tiêu).`,
                result
            });
        } catch (e) {
            console.error('[thongkeads sync]', e);
            return reply.code(500).send({ error: `Lỗi đồng bộ: ${e.message}` });
        }
    });

    // ========== 3. STATS API ==========

    // GET /api/thongkeads/stats — Lấy thống kê (filter theo account, tháng, search)
    fastify.get('/api/thongkeads/stats', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { account_id, year, month, search, page, limit: rawLimit } = req.query || {};

            const queryParams = [];
            let whereClause = 'WHERE 1=1';

            if (account_id && account_id !== 'all') {
                queryParams.push(Number(account_id));
                whereClause += ` AND d.account_id = $${queryParams.length}`;
            }

            if (req.query.start_date && req.query.end_date) {
                queryParams.push(req.query.start_date);
                whereClause += ` AND d.report_date >= $${queryParams.length}`;
                queryParams.push(req.query.end_date);
                whereClause += ` AND d.report_date <= $${queryParams.length}`;
            } else if (req.query.quarter && year) {
                const targetYear = parseInt(year);
                const q = parseInt(req.query.quarter);
                let startM = 1, endM = 3;
                if (q === 2) { startM = 4; endM = 6; }
                else if (q === 3) { startM = 7; endM = 9; }
                else if (q === 4) { startM = 10; endM = 12; }
                const sinceDate = `${targetYear}-${String(startM).padStart(2, '0')}-01`;
                const lastDay = new Date(targetYear, endM, 0).getDate();
                const untilDate = `${targetYear}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                queryParams.push(sinceDate);
                whereClause += ` AND d.report_date >= $${queryParams.length}`;
                queryParams.push(untilDate);
                whereClause += ` AND d.report_date <= $${queryParams.length}`;
            } else if (year && month && month !== 'all') {
                const targetYear = parseInt(year);
                const targetMonth = parseInt(month);
                const sinceDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
                const lastDay = new Date(targetYear, targetMonth, 0).getDate();
                const untilDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                queryParams.push(sinceDate);
                whereClause += ` AND d.report_date >= $${queryParams.length}`;
                queryParams.push(untilDate);
                whereClause += ` AND d.report_date <= $${queryParams.length}`;
            } else if (year) {
                const targetYear = parseInt(year);
                queryParams.push(`${targetYear}-01-01`);
                whereClause += ` AND d.report_date >= $${queryParams.length}`;
                queryParams.push(`${targetYear}-12-31`);
                whereClause += ` AND d.report_date <= $${queryParams.length}`;
            }

            if (search && search.trim()) {
                queryParams.push(`%${search.trim().toLowerCase()}%`);
                const pIdx = queryParams.length;
                whereClause += ` AND (LOWER(d.campaign_name) LIKE $${pIdx} OR LOWER(d.campaign_id) LIKE $${pIdx} OR LOWER(d.link_post_id) LIKE $${pIdx})`;
            }

            // Pagination
            const limitVal = Math.min(parseInt(rawLimit) || 500, 2000);
            const pageVal = Math.max(parseInt(page) || 1, 1);
            const offset = (pageVal - 1) * limitVal;

            // Count total
            const countResult = await db.get(`
                SELECT COUNT(*) as total
                FROM ads_stats_daily d
                ${whereClause}
            `, queryParams);

            // Get data
            const stats = await db.all(`
                SELECT d.*, a.account_name, a.effectiveness_threshold, a.effectiveness_metric
                FROM ads_stats_daily d
                LEFT JOIN ads_stats_accounts a ON d.account_id = a.id
                ${whereClause}
                ORDER BY d.report_date DESC, d.campaign_name ASC
                LIMIT ${limitVal} OFFSET ${offset}
            `, queryParams);

            return reply.send({
                ok: true,
                stats,
                total: parseInt(countResult?.total || 0),
                page: pageVal,
                limit: limitVal
            });
        } catch (e) {
            console.error('[thongkeads stats GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/thongkeads/summary — Tổng hợp chỉ số
    fastify.get('/api/thongkeads/summary', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { account_id, year, month, quarter, start_date, end_date } = req.query || {};

            const queryParams = [];
            let whereClause = 'WHERE 1=1';

            if (account_id && account_id !== 'all') {
                queryParams.push(Number(account_id));
                whereClause += ` AND d.account_id = $${queryParams.length}`;
            }

            if (start_date && end_date) {
                queryParams.push(start_date);
                whereClause += ` AND d.report_date >= $${queryParams.length}`;
                queryParams.push(end_date);
                whereClause += ` AND d.report_date <= $${queryParams.length}`;
            } else if (quarter && year) {
                const targetYear = parseInt(year);
                const q = parseInt(quarter);
                let startM = 1, endM = 3;
                if (q === 2) { startM = 4; endM = 6; }
                else if (q === 3) { startM = 7; endM = 9; }
                else if (q === 4) { startM = 10; endM = 12; }
                const sinceDate = `${targetYear}-${String(startM).padStart(2, '0')}-01`;
                const lastDay = new Date(targetYear, endM, 0).getDate();
                const untilDate = `${targetYear}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                queryParams.push(sinceDate);
                whereClause += ` AND d.report_date >= $${queryParams.length}`;
                queryParams.push(untilDate);
                whereClause += ` AND d.report_date <= $${queryParams.length}`;
            } else if (year && month && month !== 'all') {
                const targetYear = parseInt(year);
                const targetMonth = parseInt(month);
                const sinceDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
                const lastDay = new Date(targetYear, targetMonth, 0).getDate();
                const untilDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                queryParams.push(sinceDate);
                whereClause += ` AND d.report_date >= $${queryParams.length}`;
                queryParams.push(untilDate);
                whereClause += ` AND d.report_date <= $${queryParams.length}`;
            } else if (year) {
                const targetYear = parseInt(year);
                queryParams.push(`${targetYear}-01-01`);
                whereClause += ` AND d.report_date >= $${queryParams.length}`;
                queryParams.push(`${targetYear}-12-31`);
                whereClause += ` AND d.report_date <= $${queryParams.length}`;
            }

            const summary = await db.get(`
                SELECT
                    COUNT(*) as total_records,
                    COALESCE(SUM(d.spend), 0) as total_spend,
                    COALESCE(SUM(d.messages), 0) as total_messages,
                    COALESCE(SUM(d.run_count), 0) as total_run_count,
                    COALESCE(SUM(CASE WHEN d.is_effective THEN 1 ELSE 0 END), 0) as total_effective,
                    CASE WHEN SUM(d.messages) > 0
                        THEN ROUND(SUM(d.spend) / SUM(d.messages), 0)
                        ELSE 0
                    END as avg_cpa,
                    COUNT(DISTINCT d.campaign_id) as unique_campaigns,
                    COUNT(DISTINCT d.report_date) as unique_days
                FROM ads_stats_daily d
                ${whereClause}
            `, queryParams);

            return reply.send({ ok: true, summary });
        } catch (e) {
            console.error('[thongkeads summary GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 3.5. GET /api/thongkeads/campaign-summary ==========
    fastify.get('/api/thongkeads/campaign-summary', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { account_id, month, year, quarter, start_date, end_date, search } = req.query;
            let whereClauses = [];
            let queryParams = [];

            if (account_id && account_id !== 'all') {
                whereClauses.push('d.account_id = ?');
                queryParams.push(account_id);
            }

            if (start_date && end_date) {
                whereClauses.push('d.report_date >= ? AND d.report_date <= ?');
                queryParams.push(start_date, end_date);
            } else if (quarter && year) {
                const q = parseInt(quarter);
                let startM = 1, endM = 3;
                if (q === 2) { startM = 4; endM = 6; }
                else if (q === 3) { startM = 7; endM = 9; }
                else if (q === 4) { startM = 10; endM = 12; }
                const sDate = `${year}-${String(startM).padStart(2, '0')}-01`;
                const lastDay = new Date(year, endM, 0).getDate();
                const eDate = `${year}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                whereClauses.push('d.report_date >= ? AND d.report_date <= ?');
                queryParams.push(sDate, eDate);
            } else if (month && year && month !== 'all') {
                const sDate = `${year}-${String(month).padStart(2, '0')}-01`;
                const lastDay = new Date(year, month, 0).getDate();
                const eDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                whereClauses.push('d.report_date >= ? AND d.report_date <= ?');
                queryParams.push(sDate, eDate);
            } else if (year) {
                const sDate = `${year}-01-01`;
                const eDate = `${year}-12-31`;
                whereClauses.push('d.report_date >= ? AND d.report_date <= ?');
                queryParams.push(sDate, eDate);
            }

            if (search) {
                whereClauses.push('(d.campaign_name LIKE ? OR d.campaign_id LIKE ? OR d.link_post_id LIKE ?)');
                const s = `%${search}%`;
                queryParams.push(s, s, s);
            }

            const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

            const rows = await db.all(`
                SELECT 
                    d.link_post_id,
                    d.campaign_name,
                    d.campaign_id,
                    SUM(d.spend) as total_spend,
                    SUM(d.messages) as total_messages,
                    CASE 
                        WHEN SUM(d.messages) > 0 THEN ROUND(SUM(d.spend) / SUM(d.messages), 2)
                        ELSE 0 
                    END as avg_cpa,
                    ROUND(AVG(COALESCE(NULLIF(d.cpc, 0), CASE WHEN d.ctr > 0 AND d.cpm > 0 THEN d.cpm / (d.ctr * 10) ELSE 0 END)), 0) as avg_cpc,
                    ROUND(AVG(d.ctr), 2) as avg_ctr,
                    ROUND(AVG(d.cpm), 0) as avg_cpm,
                    SUM(COALESCE(d.run_count, 1)) as total_run_count,
                    SUM(CASE 
                        WHEN (COALESCE(d.messages, 0) > 0 OR COALESCE(d.spend, 0) >= COALESCE(a.ignore_no_msg_spend_threshold, 70000))
                        THEN COALESCE(d.run_count, 1)
                        ELSE 0 
                    END) as filtered_run_count,
                    SUM(CASE 
                        WHEN (COALESCE(d.messages, 0) > 0 AND (d.spend / d.messages) <= COALESCE(a.effectiveness_threshold, 75000))
                        THEN 1 
                        ELSE 0 
                    END) as total_effective_count,
                    MAX(a.effectiveness_threshold) as effectiveness_threshold,
                    MAX(COALESCE(a.ignore_no_msg_spend_threshold, 70000)) as ignore_no_msg_spend_threshold,
                    MAX(a.account_name) as account_name
                FROM ads_stats_daily d
                LEFT JOIN ads_stats_accounts a ON a.id = d.account_id
                ${whereClause}
                GROUP BY d.link_post_id, d.campaign_name, d.campaign_id
                ORDER BY total_effective_count DESC, avg_cpa ASC, avg_ctr DESC
            `, queryParams);

            return reply.send({ ok: true, campaigns: rows || [] });
        } catch (e) {
            console.error('[thongkeads campaign-summary GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/thongkeads/sync-schedule — Lấy cấu hình lịch đồng bộ CRM & giờ báo Zalo
    fastify.get('/api/thongkeads/sync-schedule', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rows = await db.all(`SELECT setting_key, setting_value FROM ads_sync_schedule_settings`);
            const settings = {};
            rows.forEach(r => { settings[r.setting_key] = r.setting_value; });

            let hours = [0, 1, 8, 13, 19];
            if (settings.sync_hours != null) {
                hours = settings.sync_hours.split(',').map(h => parseInt(h.trim(), 10)).filter(h => !isNaN(h) && h >= 0 && h <= 23);
            }

            let zaloHours = [0];
            if (settings.zalo_notify_hours != null) {
                zaloHours = settings.zalo_notify_hours.split(',').map(h => parseInt(h.trim(), 10)).filter(h => !isNaN(h) && h >= 0 && h <= 23);
            }

            return reply.send({
                ok: true,
                sync_enabled: settings.sync_enabled !== 'false',
                sync_hours: hours,
                zalo_notify_hours: zaloHours
            });
        } catch (e) {
            console.error('[thongkeads sync-schedule GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/thongkeads/sync-schedule — Cập nhật cấu hình lịch đồng bộ CRM & giờ báo Zalo (Giám Đốc)
    fastify.post('/api/thongkeads/sync-schedule', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền chỉnh sửa lịch đồng bộ tự động!' });
            }

            const { sync_hours, sync_enabled, zalo_notify_hours } = req.body || {};

            let hoursArr = Array.isArray(sync_hours) ? sync_hours : [];
            hoursArr = hoursArr.map(h => parseInt(h, 10)).filter(h => !isNaN(h) && h >= 0 && h <= 23);
            hoursArr.sort((a, b) => a - b);
            const hoursStr = hoursArr.join(',');

            let zaloArr = Array.isArray(zalo_notify_hours) ? zalo_notify_hours : [];
            zaloArr = zaloArr.map(h => parseInt(h, 10)).filter(h => !isNaN(h) && h >= 0 && h <= 23);
            zaloArr.sort((a, b) => a - b);
            const zaloStr = zaloArr.join(',');

            const enabledStr = sync_enabled === false || sync_enabled === 'false' ? 'false' : 'true';

            await db.run(`
                INSERT INTO ads_sync_schedule_settings (setting_key, setting_value, updated_at)
                VALUES ('sync_hours', $1, NOW())
                ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1, updated_at = NOW()
            `, [hoursStr]);

            await db.run(`
                INSERT INTO ads_sync_schedule_settings (setting_key, setting_value, updated_at)
                VALUES ('zalo_notify_hours', $1, NOW())
                ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1, updated_at = NOW()
            `, [zaloStr]);

            await db.run(`
                INSERT INTO ads_sync_schedule_settings (setting_key, setting_value, updated_at)
                VALUES ('sync_enabled', $1, NOW())
                ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1, updated_at = NOW()
            `, [enabledStr]);

            return reply.send({
                ok: true,
                message: 'Đã lưu lịch đồng bộ CRM & giờ báo Zalo tự động thành công!',
                sync_enabled: enabledStr === 'true',
                sync_hours: hoursArr,
                zalo_notify_hours: zaloArr
            });
        } catch (e) {
            console.error('[thongkeads sync-schedule POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== HELPER: Gửi Thông Báo Zalo Thống Kê Camp Hiệu Quả ==========
    async function sendThongKeAdsZaloNotification(syncedAccounts, executionDate) {
        try {
            if (!syncedAccounts || syncedAccounts.length === 0) return;

            // Đọc cấu hình Zalo trung tâm từ system_zalo_settings (fallback về ads_spend_limit_settings)
            let enabledRow = await db.get(`SELECT setting_value FROM system_zalo_settings WHERE setting_key = 'zalo_enabled'`);
            if (!enabledRow) enabledRow = await db.get(`SELECT setting_value FROM ads_spend_limit_settings WHERE setting_key = 'zalo_enabled'`);
            if (enabledRow?.setting_value !== 'true') return;

            let tokenRow = await db.get(`SELECT setting_value FROM system_zalo_settings WHERE setting_key = 'zalo_access_token'`);
            if (!tokenRow) tokenRow = await db.get(`SELECT setting_value FROM ads_spend_limit_settings WHERE setting_key = 'zalo_access_token'`);

            let userIdRow = await db.get(`SELECT setting_value FROM system_zalo_settings WHERE setting_key = 'zalo_user_id'`);
            if (!userIdRow) userIdRow = await db.get(`SELECT setting_value FROM ads_spend_limit_settings WHERE setting_key = 'zalo_user_id'`);

            let webhookRow = await db.get(`SELECT setting_value FROM system_zalo_settings WHERE setting_key = 'zalo_webhook_url'`);
            if (!webhookRow) webhookRow = await db.get(`SELECT setting_value FROM ads_spend_limit_settings WHERE setting_key = 'zalo_webhook_url'`);

            const zaloToken = tokenRow?.setting_value?.trim();
            const zaloUserId = userIdRow?.setting_value?.trim();
            const webhookUrl = webhookRow?.setting_value?.trim();

            if (!zaloToken && !webhookUrl) return;

            const count = syncedAccounts.length;
            const accountNamesList = syncedAccounts.map(a => a.account_name || 'TK QC').join(' - ');

            const now = executionDate || new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            });

            const parts = formatter.formatToParts(now);
            const partMap = {};
            parts.forEach(p => { if (p.type !== 'literal') partMap[p.type] = p.value; });

            const year = parseInt(partMap.year, 10);
            const month = parseInt(partMap.month, 10);
            const day = parseInt(partMap.day, 10);
            const hour = parseInt(partMap.hour, 10) % 24;
            const minute = parseInt(partMap.minute, 10);
            const second = parseInt(partMap.second, 10);

            const pad = (n) => String(n).padStart(2, '0');
            const dateFormatted = `${pad(day)}/${pad(month)}/${year} ${pad(hour)}:${pad(minute)}:${pad(second)}`;

            // Xác định ngày tổng quan báo cáo:
            // Nếu khung giờ hiện tại < 5h sáng (chốt ngày 00:00), báo số liệu HÔM QUA.
            // Nếu khung giờ >= 5h sáng (08h, 13h, 19h...), báo số liệu HÔM NAY.
            let targetYear = year;
            let targetMonth = month;
            let targetDay = day;
            let reportTitleLabel = 'TỔNG QUAN HÔM NAY';

            if (hour < 5) {
                const d = new Date(year, month - 1, day);
                d.setDate(d.getDate() - 1);
                targetYear = d.getFullYear();
                targetMonth = d.getMonth() + 1;
                targetDay = d.getDate();
                reportTitleLabel = 'TỔNG QUAN HÔM QUA';
            }

            const targetDateStr = `${targetYear}-${pad(targetMonth)}-${pad(targetDay)}`;
            const targetDateDisplay = `${pad(targetDay)}/${pad(targetMonth)}/${targetYear}`;

            const accountIds = syncedAccounts.map(a => a.id);

            let statsMsg = '';
            if (accountIds.length > 0) {
                const placeholders = accountIds.map((_, i) => `$${i + 1}`).join(',');
                const statsRow = await db.get(`
                    SELECT 
                        SUM(COALESCE(spend, 0)) as total_spend,
                        SUM(COALESCE(messages, 0)) as total_msgs,
                        SUM(CASE WHEN is_effective = TRUE THEN 1 ELSE 0 END) as effective_camps
                    FROM ads_stats_daily
                    WHERE account_id IN (${placeholders}) AND report_date = $${accountIds.length + 1}
                `, [...accountIds, targetDateStr]);

                const spend = parseFloat(statsRow?.total_spend || 0);
                const msgs = parseInt(statsRow?.total_msgs || 0, 10);
                const cpa = msgs > 0 ? Math.round(spend / msgs) : 0;
                const effectiveCamps = parseInt(statsRow?.effective_camps || 0, 10);

                const fmtSpend = new Intl.NumberFormat('vi-VN').format(spend);
                const fmtCpa = new Intl.NumberFormat('vi-VN').format(cpa);

                statsMsg = `\n\n📊 *${reportTitleLabel} (${targetDateDisplay}):*\n💸 Chi tiêu: ${fmtSpend} VND\n💬 Tin nhắn: ${msgs}\n🎯 CPA trung bình: ${fmtCpa} VND\n✅ Camp hiệu quả: ${effectiveCamps}`;
            }

            const message = `🎯  THỐNG KÊ CAMP HIỆU QUẢ ${count} TÀI KHOẢN :\n*${accountNamesList}*\n📅 Ngày: ${dateFormatted}${statsMsg}`;

            // 1. Direct Zalo Bot API
            if (zaloToken && zaloUserId) {
                try {
                    const directUrl = `https://bot-api.zaloplatforms.com/bot${zaloToken}/sendMessage`;
                    await fetch(directUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: zaloUserId,
                            text: message
                        })
                    });
                    console.log(`[ThongKeAds Zalo] ✅ Đã gửi tin nhắn Zalo cho ${count} tài khoản tới User ${zaloUserId}`);
                } catch (e) {
                    console.error('[ThongKeAds Zalo Direct API Error]', e.message);
                }
            }

            // 2. Webhook n8n
            if (webhookUrl) {
                try {
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message,
                            text: message,
                            accounts: syncedAccounts.map(a => a.account_name),
                            count,
                            executed_at: dateFormatted
                        })
                    });
                    console.log(`[ThongKeAds Zalo Webhook] ✅ Đã gửi webhook sang n8n`);
                } catch (e) {
                    console.error('[ThongKeAds Zalo Webhook Error]', e.message);
                }
            }
        } catch (err) {
            console.error('[ThongKeAds Zalo notification error]', err.message);
        }
    }

    // POST /api/thongkeads/zalo-test-notification — Endpoint thử gửi thông báo Zalo báo cáo mẫu
    fastify.post('/api/thongkeads/zalo-test-notification', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền thử nghiệm thông báo Zalo!' });
            }

            const accounts = await db.all(`
                SELECT * FROM ads_stats_accounts
                WHERE is_active = TRUE AND platform = 'facebook'
            `);

            if (!accounts || accounts.length === 0) {
                return reply.code(400).send({ error: 'Không có tài khoản quảng cáo Facebook nào đang hoạt động.' });
            }

            await sendThongKeAdsZaloNotification(accounts, new Date());
            return reply.send({ ok: true, message: `✅ Đã phát thử thông báo Zalo báo cáo cho ${accounts.length} tài khoản thành công!` });
        } catch (e) {
            console.error('[thongkeads zalo-test-notification POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 4. CRON DYNAMIC: TỰ ĐỘNG ĐỒNG BỘ N NGÀY GẦN NHẤT THEO KHUNG GIỜ CÀI ĐẶT ==========

    function startThongKeAdsCron() {
        const cronLabel = '[ThongKeAds Cron]';

        async function runSyncWindow(currentHour) {
            try {
                const accounts = await db.all(`
                    SELECT * FROM ads_stats_accounts
                    WHERE is_active = TRUE AND platform = 'facebook'
                    AND fb_ad_account_id IS NOT NULL AND fb_access_token IS NOT NULL
                `);

                if (!accounts || accounts.length === 0) {
                    console.log(`${cronLabel} Không có tài khoản active nào để đồng bộ.`);
                    return;
                }

                // Đồng bộ cửa sổ 3 ngày gần nhất (Hôm kia -> Hôm nay) để chốt chính xác tin nhắn trễ & chi tiêu của Meta
                const today = new Date();
                const twoDaysAgo = new Date(Date.now() - (2 * 86400000));

                const sinceStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;
                const untilStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                console.log(`${cronLabel} 🔄 Bắt đầu quét đồng bộ ${accounts.length} tài khoản từ ${sinceStr} đến ${untilStr} (3 ngày gần nhất)...`);

                for (const account of accounts) {
                    try {
                        const result = await syncMetaForAccount(account, sinceStr, untilStr);
                        console.log(`${cronLabel} ✅ ${account.account_name}: ${result.saved} saved, ${result.skipped} skipped`);
                    } catch (e) {
                        console.error(`${cronLabel} ❌ ${account.account_name}: ${e.message}`);
                    }
                }

                // Kiểm tra xem khung giờ hiện tại có thuộc danh sách zalo_notify_hours không
                const zaloRow = await db.get(`SELECT setting_value FROM ads_sync_schedule_settings WHERE setting_key = 'zalo_notify_hours'`);
                let zaloHours = [0];
                if (zaloRow && zaloRow.setting_value != null) {
                    zaloHours = zaloRow.setting_value.split(',').map(h => parseInt(h.trim(), 10)).filter(h => !isNaN(h) && h >= 0 && h <= 23);
                }

                const checkHour = currentHour != null ? currentHour : new Date().getHours();
                if (zaloHours.includes(checkHour)) {
                    console.log(`${cronLabel} 📱 Phát tin nhắn Zalo cho khung giờ ${checkHour}:00...`);
                    await sendThongKeAdsZaloNotification(accounts, new Date());
                } else {
                    console.log(`${cronLabel} ⏭️ Bỏ qua thông báo Zalo cho khung giờ ${checkHour}:00 (không nằm trong giờ báo Zalo: [${zaloHours.join(', ')}]).`);
                }
            } catch (e) {
                console.error(`${cronLabel} Fatal error:`, e.message);
            }
        }

        // Cron Động: Quét mỗi 60 giây và kiểm tra theo danh sách khung giờ cài đặt trong DB
        let _lastExecutedHour = -1;
        setInterval(async () => {
            try {
                const now = new Date();
                const hour = now.getHours();
                const min = now.getMinutes();

                const enabledRow = await db.get(`SELECT setting_value FROM ads_sync_schedule_settings WHERE setting_key = 'sync_enabled'`);
                if (enabledRow && enabledRow.setting_value === 'false') return;

                const hoursRow = await db.get(`SELECT setting_value FROM ads_sync_schedule_settings WHERE setting_key = 'sync_hours'`);
                let configuredHours = [0, 1, 8, 13, 19];
                if (hoursRow && hoursRow.setting_value != null) {
                    configuredHours = hoursRow.setting_value.split(',').map(h => parseInt(h.trim(), 10)).filter(h => !isNaN(h) && h >= 0 && h <= 23);
                }

                if (configuredHours.includes(hour) && min < 5 && _lastExecutedHour !== hour) {
                    _lastExecutedHour = hour;
                    console.log(`${cronLabel} 🌟 Khung giờ cài đặt ${hour}:00 — Bắt đầu quét đồng bộ 3 ngày gần nhất...`);
                    await runSyncWindow(hour);
                }

                if (min >= 10 && _lastExecutedHour === hour) {
                    _lastExecutedHour = -1;
                }
            } catch (err) {
                console.error(`${cronLabel} Interval error:`, err.message);
            }
        }, 60 * 1000);

        console.log(`${cronLabel} ✅ Đã khởi động cron đồng bộ Meta Ads động theo cấu hình DB.`);
    }

    // Khởi động cron
    startThongKeAdsCron();

};
