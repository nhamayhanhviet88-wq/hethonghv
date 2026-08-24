// ========== CÀI ĐẶT TÀI KHOẢN ADS ROUTE (CENTRALIZED AD ACCOUNTS & HEALTH CHECK) ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function (fastify, opts) {

    // ========== 0. AUTO MIGRATION ==========
    try {
        await db.run("ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS custom_platform_name VARCHAR(100)");
        await db.run("ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS connection_status VARCHAR(50) DEFAULT 'unconfigured'");
        await db.run("ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS connection_error TEXT");
        await db.run("ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ");
        await db.run("ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS assigned_staff_name VARCHAR(255)");
        await db.run("ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS token_expires_at DATE");
        await db.run("ALTER TABLE ads_stats_accounts ADD COLUMN IF NOT EXISTS auto_reenable_at TIMESTAMPTZ");

        // Migration: Bảng Video Hướng Dẫn Cài Đặt Ads
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_account_guides (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                video_url TEXT NOT NULL,
                doc_url TEXT,
                description TEXT,
                platform VARCHAR(50) DEFAULT 'facebook',
                sort_order INT DEFAULT 0,
                created_by INT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await db.run("ALTER TABLE ads_account_guides ADD COLUMN IF NOT EXISTS doc_url TEXT");

        // Migration: Bảng Danh Sách Nhân Viên Phụ Trách Ads
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_assigned_staff (
                id SERIAL PRIMARY KEY,
                staff_name VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Migration: Bảng Cấu Hình Zalo Trung Tâm Toàn Hệ Thống
        await db.run(`
            CREATE TABLE IF NOT EXISTS system_zalo_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Migration Copy từ ads_spend_limit_settings nếu system_zalo_settings rỗng
        try {
            const countRow = await db.get(`SELECT COUNT(*) as c FROM system_zalo_settings`);
            if (parseInt(countRow?.c || '0', 10) === 0) {
                const oldRows = await db.all(`SELECT setting_key, setting_value FROM ads_spend_limit_settings WHERE setting_key LIKE 'zalo_%'`);
                for (const old of oldRows) {
                    await db.run(`
                        INSERT INTO system_zalo_settings (setting_key, setting_value, updated_at)
                        VALUES ($1, $2, NOW())
                        ON CONFLICT (setting_key) DO NOTHING
                    `, [old.setting_key, old.setting_value]);
                }
            }
        } catch (migErr) { console.error('[system_zalo_settings copy error]', migErr.message); }
    } catch(e) { console.error('[ads_stats_accounts alter migration]', e.message); }

    // ========== HELPERS ==========
    function _isGiamDoc(user) {
        if (!user) return false;
        const r = (user.role || '').toLowerCase();
        return r === 'giam_doc' || r === 'admin' || r === 'ban_giam_doc' || !!user.is_admin;
    }

    function _cleanAdAccountId(rawId) {
        if (!rawId) return '';
        let str = String(rawId).trim();
        str = str.replace(/^(act[=_])+/gi, '');
        str = str.replace(/[^0-9]/g, '');
        return str ? 'act_' + str : '';
    }

    /**
     * Core Connection Health Test Engine for Facebook Meta API
     */
    async function testFacebookConnection(adAccountId, accessToken) {
        if (!adAccountId || !accessToken) {
            return {
                status: 'unconfigured',
                message: 'Chưa cấu hình ID tài khoản QC hoặc Access Token Meta.'
            };
        }

        const cleanAdAccId = _cleanAdAccountId(adAccountId);
        if (!cleanAdAccId) {
            return {
                status: 'error',
                message: '🔴 Mã tài khoản quảng cáo Meta không hợp lệ (cần bao gồm các chữ số ID).'
            };
        }

        try {
            const testUrl = `https://graph.facebook.com/v20.0/${cleanAdAccId}?fields=name,account_status,currency&access_token=${encodeURIComponent(accessToken.trim())}`;
            const resp = await fetch(testUrl);
            const json = await resp.json();

            if (json.error) {
                const errCode = json.error.code;
                const errSubcode = json.error.error_subcode;
                let userMsg = `🔴 MẤT KẾT NỐI (Mã lỗi ${errCode}): ${json.error.message}`;

                if (errCode === 190 || errCode === 102 || errSubcode === 463 || errSubcode === 467) {
                    userMsg = `🔴 MẤT KẾT NỐI (Lỗi Token Hết Hạn - Code ${errCode}): Access Token Meta đã hết hạn hoặc bị vô hiệu hóa do đổi mật khẩu Facebook. ➡️ Cách sửa: Vào Meta Developer Explorer để lấy Token mới dán vào đây.`;
                } else if (errCode === 100 || errCode === 1483004) {
                    userMsg = `🔴 MẤT KẾT NỐI (Lỗi ID hoặc Quyền Hạn - Code ${errCode}): Mã tài khoản ${cleanAdAccId} không tồn tại hoặc Token thiếu quyền (ads_read, read_insights). ➡️ Cách sửa: Kiểm tra lại Mã ID và tích đủ quyền khi lấy Token.`;
                } else if (errCode === 17 || errCode === 4 || errCode === 613) {
                    userMsg = `🔴 MẤT KẾT NỐI (Tạm Thời Giới Hạn API - Code ${errCode}): Facebook tạm ngắt kết nối do vượt giới hạn tần suất yêu cầu trong thời gian ngắn. ➡️ Cách sửa: Vui lòng chờ 15 - 30 phút rồi bấm Kiểm Tra Lại.`;
                }

                return {
                    status: 'error',
                    message: userMsg,
                    error_code: errCode,
                    raw: json.error
                };
            }

            if (json.id) {
                return {
                    status: 'connected',
                    message: `🟢 Kết nối thành công! Tài khoản: "${json.name || cleanAdAccId}" (${json.currency || 'VND'})`,
                    account_name_api: json.name,
                    account_status_code: json.account_status,
                    raw: json
                };
            }

            return {
                status: 'error',
                message: 'Phản hồi từ Facebook API không hợp lệ.'
            };

        } catch (e) {
            return {
                status: 'error',
                message: `🔴 Không thể kết nối tới server Facebook: ${e.message}`
            };
        }
    }

    // ========== 1. API: LIST ALL AD ACCOUNTS ==========
    // GET /api/ads-accounts
    fastify.get('/api/ads-accounts', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { platform } = req.query || {};
            let sql = `
                SELECT a.*,
                    (SELECT COUNT(*) FROM ads_stats_daily d WHERE d.account_id = a.id) as total_records
                FROM ads_stats_accounts a
                WHERE 1=1
            `;
            const params = [];

            if (platform && platform !== 'all') {
                params.push(platform.toLowerCase());
                sql += ` AND LOWER(a.platform) = $${params.length}`;
            }

            sql += ` ORDER BY a.id DESC`;

            const rows = await db.all(sql, params);

            // Summary metrics
            let connectedCount = 0;
            let errorCount = 0;
            let unconfiguredCount = 0;

            const safeRows = rows.map(r => {
                const st = r.connection_status || 'unconfigured';
                if (st === 'connected') connectedCount++;
                else if (st === 'error') errorCount++;
                else unconfiguredCount++;

                return {
                    ...r,
                    fb_access_token: r.fb_access_token ? r.fb_access_token.substring(0, 10) + '...' : null,
                    _has_token: !!r.fb_access_token
                };
            });

            return reply.send({
                ok: true,
                accounts: safeRows,
                summary: {
                    total: rows.length,
                    connected: connectedCount,
                    error: errorCount,
                    unconfigured: unconfiguredCount
                }
            });
        } catch (e) {
            console.error('[ads-accounts GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/ads-accounts/:id
    fastify.get('/api/ads-accounts/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const row = await db.get(`SELECT * FROM ads_stats_accounts WHERE id = $1`, [req.params.id]);
            if (!row) return reply.code(404).send({ error: 'Không tìm thấy tài khoản QC!' });

            if (!_isGiamDoc(req.user)) {
                row.fb_access_token = row.fb_access_token ? row.fb_access_token.substring(0, 10) + '...' : null;
            }
            return reply.send({ ok: true, account: row });
        } catch (e) {
            console.error('[ads-accounts GET/:id]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    function _cleanNumber(val, defaultVal = null) {
        if (val === null || val === undefined || val === '') return defaultVal;
        const str = String(val).replace(/\./g, '').replace(/,/g, '').trim();
        const num = parseFloat(str);
        return isNaN(num) ? defaultVal : num;
    }

    // ========== 2. API: CREATE AD ACCOUNT ==========
    // POST /api/ads-accounts
    fastify.post('/api/ads-accounts', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền tạo tài khoản quảng cáo!' });
            }

            const {
                platform, custom_platform_name, account_name,
                fb_ad_account_id, fb_ad_account_link,
                fb_dev_account_name, fb_dev_account_link, fb_dev_portal_link,
                fb_access_token, token_expires_at, fanpage_id, fanpage_name,
                effectiveness_metric, effectiveness_threshold,
                spend_min, spend_max, assigned_staff_name
            } = req.body || {};

            if (!account_name || !account_name.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập tên tài khoản quảng cáo!' });
            }

            const plat = (platform || 'facebook').toLowerCase();
            const cleanAdAccId = _cleanAdAccountId(fb_ad_account_id);

            // Perform health test for Facebook
            let testRes = { status: 'unconfigured', message: 'Chưa kiểm tra' };
            if (plat === 'facebook' && cleanAdAccId && fb_access_token) {
                testRes = await testFacebookConnection(cleanAdAccId, fb_access_token);
            }

            const result = await db.get(`
                INSERT INTO ads_stats_accounts (
                    platform, custom_platform_name, account_name,
                    fb_ad_account_id, fb_ad_account_link,
                    fb_dev_account_name, fb_dev_account_link, fb_dev_portal_link,
                    fb_access_token, token_expires_at, fanpage_id, fanpage_name,
                    effectiveness_metric, effectiveness_threshold,
                    spend_min, spend_max,
                    connection_status, connection_error, last_checked_at,
                    assigned_staff_name, created_by, created_at, updated_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),$19,$20,NOW(),NOW())
                RETURNING *
            `, [
                plat,
                (custom_platform_name || '').trim() || null,
                account_name.trim(),
                cleanAdAccId || null,
                (fb_ad_account_link || '').trim() || null,
                (fb_dev_account_name || '').trim() || null,
                (fb_dev_account_link || '').trim() || null,
                (fb_dev_portal_link || '').trim() || null,
                (fb_access_token || '').trim() || null,
                token_expires_at ? token_expires_at.trim() : null,
                (fanpage_id || '').trim() || null,
                (fanpage_name || '').trim() || null,
                effectiveness_metric || 'cpa',
                _cleanNumber(effectiveness_threshold, 75000),
                _cleanNumber(spend_min, 1),
                _cleanNumber(spend_max, 20000000),
                testRes.status,
                testRes.status === 'error' ? testRes.message : null,
                assigned_staff_name ? assigned_staff_name.trim() : null,
                req.user.id
            ]);

            return reply.send({ ok: true, account: result, test_result: testRes });
        } catch (e) {
            console.error('[ads-accounts POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 3. API: UPDATE AD ACCOUNT ==========
    // PUT /api/ads-accounts/:id
    fastify.put('/api/ads-accounts/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền chỉnh sửa tài khoản QC!' });
            }

            const id = Number(req.params.id);
            const existing = await db.get(`SELECT * FROM ads_stats_accounts WHERE id = $1`, [id]);
            if (!existing) return reply.code(404).send({ error: 'Không tìm thấy tài khoản!' });

            const {
                platform, custom_platform_name, account_name,
                fb_ad_account_id, fb_ad_account_link,
                fb_dev_account_name, fb_dev_account_link, fb_dev_portal_link,
                fb_access_token, token_expires_at, fanpage_id, fanpage_name,
                effectiveness_metric, effectiveness_threshold,
                spend_min, spend_max, is_active, assigned_staff_name
            } = req.body || {};

            const cleanAdAccId = fb_ad_account_id != null ? _cleanAdAccountId(fb_ad_account_id) : existing.fb_ad_account_id;

            const finalToken = fb_access_token != null && fb_access_token.trim() !== ''
                ? fb_access_token.trim()
                : existing.fb_access_token;

            const targetPlat = platform ? platform.toLowerCase() : existing.platform;

            // Re-run test connection if updated
            let testRes = null;
            let statusVal = existing.connection_status;
            let errorVal = existing.connection_error;

            if (targetPlat === 'facebook' && cleanAdAccId && finalToken) {
                testRes = await testFacebookConnection(cleanAdAccId, finalToken);
                statusVal = testRes.status;
                errorVal = testRes.status === 'error' ? testRes.message : null;
            }

            const result = await db.get(`
                UPDATE ads_stats_accounts SET
                    platform = COALESCE($1, platform),
                    custom_platform_name = COALESCE($2, custom_platform_name),
                    account_name = COALESCE($3, account_name),
                    fb_ad_account_id = COALESCE($4, fb_ad_account_id),
                    fb_ad_account_link = COALESCE($5, fb_ad_account_link),
                    fb_dev_account_name = COALESCE($6, fb_dev_account_name),
                    fb_dev_account_link = COALESCE($7, fb_dev_account_link),
                    fb_dev_portal_link = COALESCE($8, fb_dev_portal_link),
                    fb_access_token = $9,
                    token_expires_at = $10,
                    fanpage_id = COALESCE($11, fanpage_id),
                    fanpage_name = COALESCE($12, fanpage_name),
                    effectiveness_metric = COALESCE($13, effectiveness_metric),
                    effectiveness_threshold = COALESCE($14, effectiveness_threshold),
                    spend_min = COALESCE($15, spend_min),
                    spend_max = COALESCE($16, spend_max),
                    is_active = COALESCE($17, is_active),
                    connection_status = $18,
                    connection_error = $19,
                    assigned_staff_name = COALESCE($20, assigned_staff_name),
                    last_checked_at = NOW(),
                    updated_at = NOW()
                WHERE id = $21
                RETURNING *
            `, [
                platform ? platform.toLowerCase() : null,
                custom_platform_name != null ? custom_platform_name.trim() : null,
                account_name != null ? account_name.trim() : null,
                cleanAdAccId || null,
                fb_ad_account_link != null ? fb_ad_account_link.trim() : null,
                fb_dev_account_name != null ? fb_dev_account_name.trim() : null,
                fb_dev_account_link != null ? fb_dev_account_link.trim() : null,
                fb_dev_portal_link != null ? fb_dev_portal_link.trim() : null,
                finalToken,
                token_expires_at != null ? (token_expires_at.trim() || null) : existing.token_expires_at,
                fanpage_id != null ? fanpage_id.trim() : null,
                fanpage_name != null ? fanpage_name.trim() : null,
                effectiveness_metric || null,
                effectiveness_threshold != null ? _cleanNumber(effectiveness_threshold, existing.effectiveness_threshold) : existing.effectiveness_threshold,
                spend_min != null ? _cleanNumber(spend_min, existing.spend_min) : existing.spend_min,
                spend_max != null ? _cleanNumber(spend_max, existing.spend_max) : existing.spend_max,
                is_active != null ? is_active : null,
                statusVal,
                errorVal,
                assigned_staff_name != null ? assigned_staff_name.trim() : null,
                id
            ]);

            return reply.send({ ok: true, account: result, test_result: testRes });
        } catch (e) {
            console.error('[ads-accounts PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 4. API: DELETE AD ACCOUNT ==========
    // DELETE /api/ads-accounts/:id
    fastify.delete('/api/ads-accounts/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa tài khoản!' });
            }
            const id = Number(req.params.id);
            await db.run(`DELETE FROM ads_stats_accounts WHERE id = $1`, [id]);
            return reply.send({ ok: true, message: 'Đã xóa tài khoản quảng cáo thành công.' });
        } catch (e) {
            console.error('[ads-accounts DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 5. API: TEST CONNECTION SINGLE ACCOUNT ==========
    // POST /api/ads-accounts/:id/test-connection
    fastify.post('/api/ads-accounts/:id/test-connection', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const id = Number(req.params.id);
            const account = await db.get(`SELECT * FROM ads_stats_accounts WHERE id = $1`, [id]);
            if (!account) return reply.code(404).send({ error: 'Không tìm thấy tài khoản!' });

            if (account.platform !== 'facebook') {
                return reply.send({
                    ok: true,
                    status: 'unconfigured',
                    message: `Nền tảng "${account.platform}" chưa hỗ trợ kiểm tra tự động API.`
                });
            }

            const testRes = await testFacebookConnection(account.fb_ad_account_id, account.fb_access_token);

            await db.run(`
                UPDATE ads_stats_accounts SET
                    connection_status = $1,
                    connection_error = $2,
                    last_checked_at = NOW(),
                    updated_at = NOW()
                WHERE id = $3
            `, [testRes.status, testRes.status === 'error' ? testRes.message : null, id]);

            return reply.send({
                ok: true,
                account_id: id,
                account_name: account.account_name,
                test_result: testRes
            });
        } catch (e) {
            console.error('[ads-accounts test-connection]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 6. API: TEST CONNECTION ALL ACCOUNTS ==========
    // POST /api/ads-accounts/test-all
    fastify.post('/api/ads-accounts/test-all', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const accounts = await db.all(`
                SELECT * FROM ads_stats_accounts
                WHERE is_active = TRUE AND platform = 'facebook'
            `);

            const results = [];
            let connectedCount = 0;
            let errorCount = 0;

            for (const acc of accounts) {
                const testRes = await testFacebookConnection(acc.fb_ad_account_id, acc.fb_access_token);

                if (testRes.status === 'connected') connectedCount++;
                else if (testRes.status === 'error') errorCount++;

                await db.run(`
                    UPDATE ads_stats_accounts SET
                        connection_status = $1,
                        connection_error = $2,
                        last_checked_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $3
                `, [testRes.status, testRes.status === 'error' ? testRes.message : null, acc.id]);

                results.push({
                    id: acc.id,
                    account_name: acc.account_name,
                    test_result: testRes
                });
            }

            return reply.send({
                ok: true,
                message: `Đã kiểm tra ${accounts.length} tài khoản Facebook. (🟢 ${connectedCount} Đã kết nối | 🔴 ${errorCount} Lỗi kết nối)`,
                summary: { total: accounts.length, connected: connectedCount, error: errorCount },
                results
            });
        } catch (e) {
            console.error('[ads-accounts test-all]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 7. VIDEO GUIDES APIs ==========

    // GET /api/ads-account-guides
    fastify.get('/api/ads-account-guides', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { platform } = req.query || {};
            let sql = `SELECT * FROM ads_account_guides WHERE 1=1`;
            const params = [];

            if (platform && platform !== 'all') {
                params.push(platform.toLowerCase());
                sql += ` AND (LOWER(platform) = $${params.length} OR platform = 'general')`;
            }

            sql += ` ORDER BY sort_order ASC, id ASC`;
            const guides = await db.all(sql, params);

            return reply.send({ ok: true, guides });
        } catch(e) {
            console.error('[ads-account-guides GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/ads-account-guides (Giám đốc)
    fastify.post('/api/ads-account-guides', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền thêm video hướng dẫn!' });
            }

            const { title, video_url, doc_url, description, platform, sort_order } = req.body || {};

            if (!title || !title.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập tiêu đề video hướng dẫn!' });
            }
            if (!video_url || !video_url.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập đường link video!' });
            }

            const guide = await db.get(`
                INSERT INTO ads_account_guides (
                    title, video_url, doc_url, description, platform, sort_order, created_by, created_at, updated_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
                RETURNING *
            `, [
                title.trim(),
                video_url.trim(),
                (doc_url || '').trim() || null,
                (description || '').trim() || null,
                (platform || 'facebook').toLowerCase(),
                parseInt(sort_order) || 0,
                req.user.id
            ]);

            return reply.send({ ok: true, guide, message: 'Đã thêm video hướng dẫn thành công!' });
        } catch(e) {
            console.error('[ads-account-guides POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/ads-account-guides/:id (Giám đốc)
    fastify.put('/api/ads-account-guides/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền sửa video hướng dẫn!' });
            }

            const id = Number(req.params.id);
            const { title, video_url, doc_url, description, platform, sort_order } = req.body || {};

            const guide = await db.get(`
                UPDATE ads_account_guides SET
                    title = COALESCE($1, title),
                    video_url = COALESCE($2, video_url),
                    doc_url = COALESCE($3, doc_url),
                    description = COALESCE($4, description),
                    platform = COALESCE($5, platform),
                    sort_order = COALESCE($6, sort_order),
                    updated_at = NOW()
                WHERE id = $7
                RETURNING *
            `, [
                title ? title.trim() : null,
                video_url ? video_url.trim() : null,
                doc_url != null ? doc_url.trim() : null,
                description != null ? description.trim() : null,
                platform ? platform.toLowerCase() : null,
                sort_order != null ? parseInt(sort_order) : null,
                id
            ]);

            return reply.send({ ok: true, guide, message: 'Đã cập nhật video hướng dẫn!' });
        } catch(e) {
            console.error('[ads-account-guides PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/ads-account-guides/:id (Giám đốc)
    fastify.delete('/api/ads-account-guides/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa video hướng dẫn!' });
            }

            const id = Number(req.params.id);
            await db.run(`DELETE FROM ads_account_guides WHERE id = $1`, [id]);

            return reply.send({ ok: true, message: 'Đã xóa video hướng dẫn thành công.' });
        } catch(e) {
            console.error('[ads-account-guides DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 5. API: NHÂN VIÊN PHỤ TRÁCH ADS (ĐỒNG BỘ TỪ PHÒNG MARKETING) ==========
    // GET /api/ads-staff
    fastify.get('/api/ads-staff', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const users = await db.all(`
                SELECT 
                    COALESCE(NULLIF(TRIM(u.full_name), ''), u.username) AS name,
                    u.username,
                    u.role,
                    COALESCE(d.name, 'Marketing') AS department_name
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.status = 'active'
                  AND (
                      u.role IN ('giam_doc', 'admin', 'quan_ly_mkt', 'nhan_vien_mkt', 'mkt', 'marketing')
                      OR LOWER(COALESCE(d.name, '')) LIKE '%marketing%'
                      OR LOWER(COALESCE(d.name, '')) LIKE '%mkt%'
                      OR LOWER(COALESCE(u.role, '')) LIKE '%mkt%'
                      OR LOWER(COALESCE(u.role, '')) LIKE '%marketing%'
                      OR LOWER(COALESCE(u.username, '')) LIKE '%mkt%'
                  )
                ORDER BY name ASC
            `);

            const existingAccountsStaff = await db.all(`
                SELECT DISTINCT assigned_staff_name AS name
                FROM ads_stats_accounts
                WHERE assigned_staff_name IS NOT NULL AND TRIM(assigned_staff_name) != ''
            `);

            const staffMap = new Map();
            (users || []).forEach(u => {
                if (u.name) staffMap.set(u.name.trim().toLowerCase(), { id: u.username, staff_name: u.name, username: u.username, role: u.role });
            });
            (existingAccountsStaff || []).forEach(s => {
                if (s.name && !staffMap.has(s.name.trim().toLowerCase())) {
                    staffMap.set(s.name.trim().toLowerCase(), { id: s.name, staff_name: s.name, username: s.name, role: 'nhan_vien' });
                }
            });

            const staffList = Array.from(staffMap.values());
            return reply.send({ ok: true, staff: staffList });
        } catch (e) {
            console.error('[ads-staff GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/ads-staff (Giám Đốc)
    fastify.post('/api/ads-staff', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền tạo tên nhân viên phụ trách!' });
            }

            const { staff_name } = req.body || {};
            if (!staff_name || !staff_name.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập tên nhân viên!' });
            }

            const cleanName = staff_name.trim();
            const row = await db.get(`
                INSERT INTO ads_assigned_staff (staff_name) VALUES ($1) RETURNING *
            `, [cleanName]);

            return reply.send({ ok: true, staff: row, message: 'Đã thêm nhân viên phụ trách thành công!' });
        } catch (e) {
            console.error('[ads-staff POST]', e);
            if (e.message && e.message.includes('unique constraint')) {
                return reply.code(400).send({ error: 'Tên nhân viên này đã tồn tại trong danh sách!' });
            }
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/ads-staff/:id (Giám Đốc - Đổi tên nhân viên & Cập nhật toàn bộ tài khoản đã gắn)
    fastify.put('/api/ads-staff/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền sửa tên nhân viên phụ trách!' });
            }

            const id = Number(req.params.id);
            const existing = await db.get(`SELECT * FROM ads_assigned_staff WHERE id = $1`, [id]);
            if (!existing) return reply.code(404).send({ error: 'Không tìm thấy nhân viên!' });

            const { staff_name } = req.body || {};
            if (!staff_name || !staff_name.trim()) {
                return reply.code(400).send({ error: 'Tên nhân viên mới không được để trống!' });
            }

            const oldName = existing.staff_name;
            const newName = staff_name.trim();

            // 1. Update staff table
            const updated = await db.get(`
                UPDATE ads_assigned_staff SET staff_name = $1, updated_at = NOW() WHERE id = $2 RETURNING *
            `, [newName, id]);

            // 2. Cascade update all ad accounts with this staff name
            const updateCount = await db.run(`
                UPDATE ads_stats_accounts SET assigned_staff_name = $1 WHERE assigned_staff_name = $2
            `, [newName, oldName]);

            return reply.send({
                ok: true,
                staff: updated,
                message: `Đã đổi tên nhân viên từ "${oldName}" sang "${newName}". Đã tự động cập nhật ${updateCount?.rowCount || 0} tài khoản quảng cáo liên quan!`
            });
        } catch (e) {
            console.error('[ads-staff PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/ads-staff/:id (Giám Đốc)
    fastify.delete('/api/ads-staff/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa tên nhân viên phụ trách!' });
            }

            const id = Number(req.params.id);
            await db.run(`DELETE FROM ads_assigned_staff WHERE id = $1`, [id]);
            return reply.send({ ok: true, message: 'Đã xóa tên nhân viên phụ trách.' });
        } catch (e) {
            console.error('[ads-staff DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 6. API: MẠNG XÃ HỘI TỰ ĐỊNH NGHĨA (CRUD) ==========
    // GET /api/ads-platforms
    fastify.get('/api/ads-platforms', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rows = await db.all(`SELECT * FROM ads_custom_platforms ORDER BY id ASC`);
            return reply.send({ ok: true, platforms: rows || [] });
        } catch (e) {
            console.error('[ads-platforms GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/ads-platforms (Giám Đốc)
    fastify.post('/api/ads-platforms', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền tạo mạng xã hội mới!' });
            }

            const { platform_name, icon } = req.body || {};
            if (!platform_name || !platform_name.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập tên Mạng Xã Hội!' });
            }

            const cleanName = platform_name.trim();
            const key = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');

            const row = await db.get(`
                INSERT INTO ads_custom_platforms (platform_key, platform_name, icon) VALUES ($1, $2, $3) RETURNING *
            `, [key, cleanName, (icon || '🌐').trim()]);

            return reply.send({ ok: true, platform: row, message: 'Đã tạo Mạng Xã Hội mới thành công!' });
        } catch (e) {
            console.error('[ads-platforms POST]', e);
            if (e.message && e.message.includes('unique constraint')) {
                return reply.code(400).send({ error: 'Mạng xã hội này đã tồn tại!' });
            }
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/ads-platforms/:id (Giám Đốc)
    fastify.put('/api/ads-platforms/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền sửa tên mạng xã hội!' });
            }

            const id = Number(req.params.id);
            const { platform_name, icon } = req.body || {};

            if (!platform_name || !platform_name.trim()) {
                return reply.code(400).send({ error: 'Tên mạng xã hội mới không được để trống!' });
            }

            const cleanName = platform_name.trim();
            const updated = await db.get(`
                UPDATE ads_custom_platforms SET platform_name = $1, icon = COALESCE($2, icon), updated_at = NOW() WHERE id = $3 RETURNING *
            `, [cleanName, icon ? icon.trim() : null, id]);

            return reply.send({ ok: true, platform: updated, message: 'Đã cập nhật mạng xã hội!' });
        } catch (e) {
            console.error('[ads-platforms PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/ads-platforms/:id (Giám Đốc)
    fastify.delete('/api/ads-platforms/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa mạng xã hội!' });
            }

            const id = Number(req.params.id);
            await db.run(`DELETE FROM ads_custom_platforms WHERE id = $1`, [id]);
            return reply.send({ ok: true, message: 'Đã xóa mạng xã hội thành công.' });
        } catch (e) {
            console.error('[ads-platforms DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== CENTRAL ZALO SETTINGS ENDPOINTS ==========
    // GET /api/caidatads/zalo-settings
    fastify.get('/api/caidatads/zalo-settings', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rows = await db.all(`SELECT setting_key, setting_value FROM system_zalo_settings`);
            const settings = {};
            rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
            return { ok: true, settings };
        } catch (e) {
            console.error('[zalo-settings GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/caidatads/zalo-settings
    fastify.post('/api/caidatads/zalo-settings', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền chỉnh sửa cấu hình Zalo trung tâm!' });
            }

            const { settings } = req.body;
            if (!settings || typeof settings !== 'object') {
                return reply.code(400).send({ error: 'Dữ liệu settings không hợp lệ' });
            }

            for (const [key, value] of Object.entries(settings)) {
                // Save into system_zalo_settings
                await db.run(`
                    INSERT INTO system_zalo_settings (setting_key, setting_value, updated_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()
                `, [key, String(value ?? '')]);

                // Sync backward compatible into ads_spend_limit_settings
                if (key.startsWith('zalo_')) {
                    await db.run(`
                        INSERT INTO ads_spend_limit_settings (setting_key, setting_value, updated_at)
                        VALUES ($1, $2, NOW())
                        ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = NOW()
                    `, [key, String(value ?? '')]);
                }
            }

            return reply.send({ ok: true, message: 'Đã lưu cấu hình Gửi Thông Báo Zalo trung tâm thành công!' });
        } catch (e) {
            console.error('[zalo-settings POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/caidatads/zalo-test
    fastify.post('/api/caidatads/zalo-test', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền test gửi tin Zalo!' });
            }

            const { zalo_access_token, zalo_user_id, zalo_webhook_url } = req.body || {};
            const token = (zalo_access_token || '').trim();
            const userId = (zalo_user_id || '').trim();
            const webhookUrl = (zalo_webhook_url || '').trim();

            if (!token && !webhookUrl) {
                return reply.code(400).send({ error: 'Vui lòng nhập Zalo AccessToken hoặc Zalo Webhook URL trước khi thử nghiệm.' });
            }

            const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            const testMsg = `🧪 [TEST THÔNG BÁO ZALO SYSTEM]\n\n✅ Đã kết nối thành công Zalo Bot từ trang Cài Đặt Tài Khoản Ads!\n📅 Thời gian: ${now}\n👤 Người gửi: ${req.user.full_name || req.user.username || 'Giám Đốc'}`;

            let directSuccess = false;
            let webhookSuccess = false;
            let errorDetails = [];

            // 1. Test Direct Zalo Bot API
            if (token && userId) {
                try {
                    const directUrl = `https://bot-api.zaloplatforms.com/bot${token}/sendMessage`;
                    const res = await fetch(directUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: userId, text: testMsg })
                    });
                    const resJson = await res.json();
                    if (res.ok && resJson.ok !== false) {
                        directSuccess = true;
                    } else {
                        errorDetails.push(`Zalo Direct Bot API Lỗi: ${JSON.stringify(resJson)}`);
                    }
                } catch (err) {
                    errorDetails.push(`Zalo Direct Bot API Exception: ${err.message}`);
                }
            } else if (token && !userId) {
                errorDetails.push(`Thiếu Zalo UserId / Chat ID để gửi tin trực tiếp.`);
            }

            // 2. Test Webhook if present
            if (webhookUrl) {
                try {
                    const res = await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: testMsg, text: testMsg, test: true, sender: req.user.username })
                    });
                    if (res.ok) webhookSuccess = true;
                    else errorDetails.push(`Webhook HTTP status: ${res.status}`);
                } catch (err) {
                    errorDetails.push(`Webhook Exception: ${err.message}`);
                }
            }

            if (directSuccess || webhookSuccess) {
                return reply.send({
                    ok: true,
                    message: `✅ Test gửi tin Zalo THÀNH CÔNG!${directSuccess ? ' (Đã gửi qua Zalo Bot Direct API)' : ''}${webhookSuccess ? ' (Đã bắn Webhook n8n)' : ''}`
                });
            } else {
                return reply.code(400).send({
                    ok: false,
                    error: `🔴 Gửi tin thử nghiệm THẤT BẠI: ${errorDetails.join(' | ')}`
                });
            }
        } catch (e) {
            console.error('[zalo-test POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

};

