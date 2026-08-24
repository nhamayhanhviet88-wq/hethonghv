// ========== CHIẾN DỊCH VIDEO/ẢNH ADS ROUTES ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');

module.exports = async function (fastify, opts) {

    // ========== 0. AUTO MIGRATION ==========

    // Bảng 1: ads_channels — Kênh quảng cáo (Giám Đốc tạo)
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_channels (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                icon VARCHAR(50) DEFAULT '📺',
                color VARCHAR(20) DEFAULT '#6366f1',
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Seed 3 kênh mặc định
        const cnt = await db.get(`SELECT COUNT(*) as count FROM ads_channels`);
        if (parseInt((cnt && cnt.count) || 0) === 0) {
            await db.run(`INSERT INTO ads_channels (name, icon, color) VALUES 
                ('TikTok', '🎵', '#000000'),
                ('Facebook', '📘', '#1877f2'),
                ('YouTube', '▶️', '#ff0000')
                ON CONFLICT DO NOTHING`);
        }
    } catch(e) { console.error('[ads_channels migration]', e.message); }

    // Bảng 2: ads_campaigns — Chiến dịch quảng cáo
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_campaigns (
                id SERIAL PRIMARY KEY,
                kho_ads_item_id INT NOT NULL,
                channel_id INT,
                ad_account_id INT,
                channel_name VARCHAR(100),
                campaign_name VARCHAR(500) NOT NULL,
                post_id VARCHAR(255),
                camp_id VARCHAR(255),
                status VARCHAR(20) DEFAULT 'chay_test',
                created_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                finished_at TIMESTAMP
            )
        `);
        await db.run("ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS ad_account_id INT");
        await db.run("ALTER TABLE ads_campaigns ADD COLUMN IF NOT EXISTS channel_name VARCHAR(100)");
        try { await db.run("ALTER TABLE ads_campaigns ALTER COLUMN channel_id DROP NOT NULL"); } catch(e) {}
    } catch(e) { console.error('[ads_campaigns migration]', e.message); }

    // Bảng 3: ads_campaign_reports — Báo cáo hàng ngày
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS ads_campaign_reports (
                id SERIAL PRIMARY KEY,
                campaign_id INT NOT NULL,
                report_date DATE NOT NULL,
                tong_ngan_sach DECIMAL(15,2) DEFAULT 0,
                tin_nhan INT DEFAULT 0,
                cpa DECIMAL(15,2) DEFAULT 0,
                ctr DECIMAL(8,4) DEFAULT 0,
                cpm DECIMAL(15,2) DEFAULT 0,
                so_lan_chay INT DEFAULT 0,
                so_lan_hieu_qua INT DEFAULT 0,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(campaign_id, report_date)
            )
        `);
    } catch(e) { console.error('[ads_campaign_reports migration]', e.message); }

    // Seed penalty config cho chiến dịch ads
    try {
        await db.run(`
            INSERT INTO global_penalty_config (key, label, amount)
            VALUES ('ads_campaign_khong_bao_cao', 'Chiến dịch Ads không báo cáo hàng ngày', 100000)
            ON CONFLICT (key) DO NOTHING
        `);
    } catch(e) { /* ignore — table or constraint may not exist yet */ }

    // ========== HELPER FUNCTIONS ==========

    function _isGiamDoc(user) {
        const r = (user.role || '').toLowerCase();
        return r === 'giam_doc' || r === 'admin' || r === 'ban_giam_doc' || !!user.is_admin;
    }

    function _isQuanLy(user) {
        const r = (user.role || '').toLowerCase();
        return r === 'quan_ly' || r === 'quan_ly_cap_cao' || r === 'quan_ly_xuong';
    }

    function _isTruongPhong(user) {
        const r = (user.role || '').toLowerCase();
        return r === 'truong_phong' || r === 'leader' || r === 'truong_nhom';
    }

    // ========== 1. CHANNELS API ==========

    // GET /api/ads-campaigns/channels — Lấy danh sách kênh
    fastify.get('/api/ads-campaigns/channels', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rows = await db.all(`SELECT * FROM ads_channels ORDER BY id ASC`);
            return reply.send({ ok: true, channels: rows });
        } catch (e) {
            console.error('[ads-campaigns channels GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/ads-campaigns/channels — Tạo kênh mới (Giám Đốc)
    fastify.post('/api/ads-campaigns/channels', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền tạo kênh quảng cáo!' });
            }
            const { name, icon, color } = req.body || {};
            if (!name || !name.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập tên kênh!' });
            }
            const result = await db.get(`
                INSERT INTO ads_channels (name, icon, color, created_by) 
                VALUES ($1, $2, $3, $4) RETURNING *
            `, [name.trim(), (icon || '📺').trim(), (color || '#6366f1').trim(), req.user.id]);
            return reply.send({ ok: true, channel: result });
        } catch (e) {
            console.error('[ads-campaigns channels POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/ads-campaigns/channels/:id — Sửa kênh (Giám Đốc)
    fastify.put('/api/ads-campaigns/channels/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền sửa kênh!' });
            }
            const { name, icon, color } = req.body || {};
            const result = await db.get(`
                UPDATE ads_channels SET name = COALESCE($1, name), icon = COALESCE($2, icon), color = COALESCE($3, color)
                WHERE id = $4 RETURNING *
            `, [name?.trim() || null, icon?.trim() || null, color?.trim() || null, req.params.id]);
            if (!result) return reply.code(404).send({ error: 'Không tìm thấy kênh!' });
            return reply.send({ ok: true, channel: result });
        } catch (e) {
            console.error('[ads-campaigns channels PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/ads-campaigns/channels/:id — Xóa kênh (Giám Đốc)
    fastify.delete('/api/ads-campaigns/channels/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            if (!_isGiamDoc(req.user)) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền xóa kênh!' });
            }
            // Kiểm tra có chiến dịch nào đang dùng kênh này không
            const used = await db.get(`SELECT COUNT(*) as count FROM ads_campaigns WHERE channel_id = $1`, [req.params.id]);
            if (parseInt(used?.count || 0) > 0) {
                return reply.code(400).send({ error: `Kênh này đang được sử dụng bởi ${used.count} chiến dịch, không thể xóa!` });
            }
            await db.run(`DELETE FROM ads_channels WHERE id = $1`, [req.params.id]);
            return reply.send({ ok: true });
        } catch (e) {
            console.error('[ads-campaigns channels DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/ads-campaigns/linked-platforms — Lấy danh sách kênh/nền tảng từ Cài Đặt Tài Khoản Ads
    fastify.get('/api/ads-campaigns/linked-platforms', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const rows = await db.all(`
                SELECT DISTINCT platform, custom_platform_name
                FROM ads_stats_accounts
                WHERE platform IS NOT NULL AND TRIM(platform) != ''
            `);
            
            const platformMeta = {
                'facebook': { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877f2' },
                'tiktok': { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#000000' },
                'google_ads': { id: 'google_ads', name: 'Google Ads', icon: '🌐', color: '#4285f4' },
                'youtube': { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#ff0000' }
            };

            const resultPlatforms = [];
            const seenKeys = new Set();

            (rows || []).forEach(r => {
                const key = (r.platform || '').toLowerCase().trim();
                if (!key || seenKeys.has(key)) return;
                seenKeys.add(key);

                if (platformMeta[key]) {
                    resultPlatforms.push(platformMeta[key]);
                } else {
                    resultPlatforms.push({
                        id: key,
                        name: r.custom_platform_name || key.toUpperCase(),
                        icon: '📢',
                        color: '#6366f1'
                    });
                }
            });

            // Mặc định luôn có TikTok, Facebook, YouTube nếu chưa cấu hình tài khoản nào
            if (!seenKeys.has('tiktok')) resultPlatforms.push(platformMeta['tiktok']);
            if (!seenKeys.has('facebook')) resultPlatforms.unshift(platformMeta['facebook']);
            if (!seenKeys.has('youtube')) resultPlatforms.push(platformMeta['youtube']);

            return reply.send({ ok: true, platforms: resultPlatforms });
        } catch(e) {
            console.error('[ads-campaigns linked-platforms GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/ads-campaigns/accounts-by-platform — Lấy tài khoản QC theo kênh từ Cài Đặt Tài Khoản Ads
    fastify.get('/api/ads-campaigns/accounts-by-platform', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const platform = (req.query.platform || 'facebook').toLowerCase().trim();
            const rows = await db.all(`
                SELECT id, platform, custom_platform_name, account_name, fb_ad_account_id, connection_status, assigned_staff_name
                FROM ads_stats_accounts
                WHERE LOWER(platform) = $1
                ORDER BY id ASC
            `, [platform]);

            return reply.send({ ok: true, accounts: rows || [] });
        } catch(e) {
            console.error('[ads-campaigns accounts-by-platform GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // GET /api/ads-campaigns/ad-account-campaigns — Lấy live chiến dịch camp từ Tài khoản Quảng Cáo (Graph API Meta)
    fastify.get('/api/ads-campaigns/ad-account-campaigns', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const accountId = parseInt(req.query.account_id);
            if (!accountId) return reply.code(400).send({ error: 'Vui lòng cung cấp account_id!' });

            const account = await db.get(`
                SELECT id, platform, account_name, fb_ad_account_id, fb_access_token
                FROM ads_stats_accounts
                WHERE id = $1
            `, [accountId]);

            if (!account) return reply.code(404).send({ error: 'Không tìm thấy tài khoản quảng cáo!' });

            if ((account.platform || '').toLowerCase() === 'facebook') {
                if (!account.fb_access_token || !account.fb_ad_account_id) {
                    return reply.code(400).send({ error: `Tài khoản "${account.account_name}" chưa được cấu hình Access Token hoặc Ad Account ID trong Cài Đặt Tài Khoản Ads.` });
                }
                const token = account.fb_access_token.trim();
                const rawActId = account.fb_ad_account_id.replace(/^act_/i, '').trim();

                const campaignsUrl = `https://graph.facebook.com/v24.0/act_${rawActId}/campaigns?fields=id,name,status,effective_status,ads.limit(1){creative{object_story_id,effective_object_story_id}}&limit=500&access_token=${encodeURIComponent(token)}`;
                const res = await fetch(campaignsUrl);
                const data = await res.json();

                if (data.error) {
                    return reply.code(400).send({ error: `🔴 Lỗi từ Facebook API: ${data.error.message || 'Không thể truy vấn danh sách chiến dịch'}` });
                }

                const campaigns = (data.data || []).map(c => {
                    let postId = '';
                    if (c.ads && c.ads.data && c.ads.data.length > 0) {
                        const creative = c.ads.data[0].creative || {};
                        const storyId = creative.object_story_id || creative.effective_object_story_id || '';
                        if (storyId) {
                            postId = storyId.includes('_') ? storyId.split('_')[1] : storyId;
                        }
                    }
                    return {
                        id: c.id,
                        name: c.name,
                        status: c.status,
                        effective_status: c.effective_status,
                        post_id: postId
                    };
                });

                return reply.send({ ok: true, campaigns, account_name: account.account_name });
            } else {
                return reply.send({ ok: true, campaigns: [], account_name: account.account_name, message: 'Nền tảng này chưa hỗ trợ API đồng bộ trực tiếp.' });
            }
        } catch(e) {
            console.error('[ads-campaigns ad-account-campaigns GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 2. MY ITEMS (Lấy mẫu từ Kho Ads chưa liên kết chiến dịch) ==========

    fastify.get('/api/ads-campaigns/my-items', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const userId = Number(req.user.id);
            const isGD = _isGiamDoc(req.user);

            let whereClause = `WHERE i.id NOT IN (SELECT DISTINCT kho_ads_item_id FROM ads_campaigns WHERE kho_ads_item_id IS NOT NULL)`;
            const params = [];
            if (!isGD) {
                whereClause += ` AND i.created_by = $1`;
                params.push(userId);
            }

            const rows = await db.all(`
                SELECT i.id, i.title, i.linh_vuc, i.media_type, i.thumbnail_url, i.drive_url, i.description,
                       i.created_by, u.full_name as created_by_name, i.created_at
                FROM kho_ads_items i
                LEFT JOIN users u ON i.created_by = u.id
                ${whereClause}
                ORDER BY i.id DESC
            `, params);
            return reply.send({ ok: true, items: rows });
        } catch (e) {
            console.error('[ads-campaigns my-items GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 3. CAMPAIGNS CRUD ==========

    // GET /api/ads-campaigns — Lấy danh sách chiến dịch (phân quyền 4 cấp)
    fastify.get('/api/ads-campaigns', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const user = req.user || {};
            const userId = Number(user.id);
            const deptId = user.department_id ? Number(user.department_id) : 0;
            const isGD = _isGiamDoc(user);
            const isQL = _isQuanLy(user);
            const isTP = _isTruongPhong(user);

            let permClause = '';
            const queryParams = [];

            if (isGD) {
                // Giám Đốc: xem TẤT CẢ
                permClause = '';
            } else if (isQL) {
                // Quản Lý: xem chính mình + trưởng phòng + nhân viên trong bộ phận
                permClause = `AND (
                    c.created_by IN (SELECT id FROM users WHERE department_id = $1 OR department_id IN (SELECT id FROM departments WHERE parent_id = $1))
                    OR c.created_by = $2
                )`;
                queryParams.push(deptId, userId);
            } else if (isTP) {
                // Trưởng Phòng: xem chính mình + nhân viên trong team
                permClause = `AND (
                    c.created_by IN (SELECT id FROM users WHERE department_id = $1 OR managed_by_user_id = $2)
                    OR c.created_by = $2
                )`;
                queryParams.push(deptId, userId);
            } else {
                // Nhân Viên: chỉ xem chính mình
                permClause = `AND c.created_by = $1`;
                queryParams.push(userId);
            }

            // Filter params
            const { status, channel_id, search } = req.query || {};
            let filterClause = '';
            if (status && status !== 'all') {
                queryParams.push(status);
                filterClause += ` AND c.status = $${queryParams.length}`;
            }
            if (channel_id && channel_id !== 'all') {
                queryParams.push(channel_id);
                filterClause += ` AND (c.channel_id = $${queryParams.length} OR LOWER(c.channel_name) = LOWER($${queryParams.length}) OR LOWER(sa.platform) = LOWER($${queryParams.length}))`;
            }
            if (search && search.trim()) {
                queryParams.push(`%${search.trim().toLowerCase()}%`);
                const pIdx = queryParams.length;
                filterClause += ` AND (LOWER(c.campaign_name) LIKE $${pIdx} OR LOWER(c.post_id) LIKE $${pIdx} OR LOWER(c.camp_id) LIKE $${pIdx} OR LOWER(u.full_name) LIKE $${pIdx} OR LOWER(sa.account_name) LIKE $${pIdx})`;
            }

            const sql = `
                SELECT c.*, 
                       ch.name as legacy_channel_name, ch.icon as channel_icon, ch.color as channel_color,
                       sa.account_name as ad_account_name, sa.fb_ad_account_id, sa.platform as ad_account_platform,
                       COALESCE(c.channel_name, sa.platform, ch.name, 'Facebook') as channel_name,
                       i.title as item_title, i.thumbnail_url, i.linh_vuc, i.media_type, i.drive_url,
                       u.full_name as created_by_name,
                       COALESCE(rpt.latest_tong_ngan_sach, 0) as latest_tong_ngan_sach,
                       COALESCE(rpt.latest_tin_nhan, 0) as latest_tin_nhan,
                       COALESCE(rpt.latest_cpa, 0) as latest_cpa,
                       COALESCE(rpt.latest_ctr, 0) as latest_ctr,
                       COALESCE(rpt.latest_cpm, 0) as latest_cpm,
                       COALESCE(rpt.latest_so_lan_chay, 0) as latest_so_lan_chay,
                       COALESCE(rpt.latest_so_lan_hieu_qua, 0) as latest_so_lan_hieu_qua,
                       COALESCE(rpt.latest_report_date, NULL) as latest_report_date,
                       COALESCE(totals.total_ngan_sach, 0) as total_ngan_sach,
                       COALESCE(totals.total_tin_nhan, 0) as total_tin_nhan,
                       COALESCE(totals.total_so_lan_chay, 0) as total_so_lan_chay,
                       COALESCE(totals.total_so_lan_hieu_qua, 0) as total_so_lan_hieu_qua,
                       COALESCE(totals.report_count, 0) as report_count
                FROM ads_campaigns c
                LEFT JOIN ads_channels ch ON c.channel_id = ch.id
                LEFT JOIN ads_stats_accounts sa ON c.ad_account_id = sa.id
                LEFT JOIN kho_ads_items i ON c.kho_ads_item_id = i.id
                LEFT JOIN users u ON c.created_by = u.id
                LEFT JOIN LATERAL (
                    SELECT r.tong_ngan_sach as latest_tong_ngan_sach, 
                           r.tin_nhan as latest_tin_nhan,
                           r.cpa as latest_cpa, r.ctr as latest_ctr, r.cpm as latest_cpm,
                           r.so_lan_chay as latest_so_lan_chay, 
                           r.so_lan_hieu_qua as latest_so_lan_hieu_qua,
                           r.report_date as latest_report_date
                    FROM ads_campaign_reports r 
                    WHERE r.campaign_id = c.id 
                    ORDER BY r.report_date DESC LIMIT 1
                ) rpt ON true
                LEFT JOIN LATERAL (
                    SELECT SUM(r2.tong_ngan_sach) as total_ngan_sach,
                           SUM(r2.tin_nhan) as total_tin_nhan,
                           SUM(r2.so_lan_chay) as total_so_lan_chay,
                           SUM(r2.so_lan_hieu_qua) as total_so_lan_hieu_qua,
                           COUNT(*) as report_count
                    FROM ads_campaign_reports r2 
                    WHERE r2.campaign_id = c.id
                ) totals ON true
                WHERE 1=1 ${permClause} ${filterClause}
                ORDER BY c.id DESC
            `;

            const campaigns = await db.all(sql, queryParams);
            return reply.send({ ok: true, campaigns });
        } catch (e) {
            console.error('[ads-campaigns GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/ads-campaigns — Tạo chiến dịch mới
    fastify.post('/api/ads-campaigns', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { kho_ads_item_id, channel_id, ad_account_id, channel_name, post_id, camp_id, campaign_name } = req.body || {};

            if (!kho_ads_item_id) return reply.code(400).send({ error: 'Vui lòng chọn mẫu từ Kho Ads!' });
            if (!ad_account_id && !channel_id && !channel_name) {
                return reply.code(400).send({ error: 'Vui lòng chọn kênh quảng cáo / tài khoản quảng cáo!' });
            }

            // Kiểm tra mẫu tồn tại
            const item = await db.get(`SELECT id, title, created_by FROM kho_ads_items WHERE id = $1`, [kho_ads_item_id]);
            if (!item) return reply.code(404).send({ error: 'Không tìm thấy mẫu Ads!' });

            // Kiểm tra mẫu đã được tạo chiến dịch chưa
            const existingCamp = await db.get(`SELECT id FROM ads_campaigns WHERE kho_ads_item_id = $1`, [kho_ads_item_id]);
            if (existingCamp) {
                return reply.code(400).send({ error: 'Mẫu Ads này đã được tạo chiến dịch và liên kết rồi, không thể tạo lặp lại!' });
            }

            // Kiểm tra quyền: chỉ lấy mẫu của chính mình (trừ Giám Đốc)
            if (!_isGiamDoc(req.user) && Number(item.created_by) !== Number(req.user.id)) {
                return reply.code(403).send({ error: 'Bạn chỉ có thể tạo chiến dịch từ mẫu Ads do chính mình tạo!' });
            }

            let adAccId = ad_account_id ? Number(ad_account_id) : null;
            let cName = channel_name || 'Facebook';
            let channelId = channel_id ? Number(channel_id) : null;

            if (adAccId) {
                const acc = await db.get(`SELECT id, account_name, platform FROM ads_stats_accounts WHERE id = $1`, [adAccId]);
                if (acc && acc.platform) {
                    cName = acc.platform.charAt(0).toUpperCase() + acc.platform.slice(1);
                }
            }

            const finalCampName = (campaign_name && campaign_name.trim()) ? campaign_name.trim() : `${item.title} - ${cName}`;

            const result = await db.get(`
                INSERT INTO ads_campaigns (kho_ads_item_id, channel_id, ad_account_id, channel_name, campaign_name, post_id, camp_id, status, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'chay_test', $8) RETURNING *
            `, [kho_ads_item_id, channelId, adAccId, cName, finalCampName, (post_id || '').trim(), (camp_id || '').trim(), req.user.id]);

            return reply.send({ ok: true, campaign: result });
        } catch (e) {
            console.error('[ads-campaigns POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/ads-campaigns/:id — Cập nhật chiến dịch (post_id, camp_id)
    fastify.put('/api/ads-campaigns/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const campId = Number(req.params.id);
            const existing = await db.get(`SELECT * FROM ads_campaigns WHERE id = $1`, [campId]);
            if (!existing) return reply.code(404).send({ error: 'Không tìm thấy chiến dịch!' });

            const isGD = _isGiamDoc(req.user);
            const isCreator = Number(req.user.id) === Number(existing.created_by);
            if (!isGD && !isCreator) {
                return reply.code(403).send({ error: 'Bạn không có quyền chỉnh sửa chiến dịch này!' });
            }

            const { post_id, camp_id } = req.body || {};
            const result = await db.get(`
                UPDATE ads_campaigns SET post_id = $1, camp_id = $2 WHERE id = $3 RETURNING *
            `, [(post_id || '').trim(), (camp_id || '').trim(), campId]);

            return reply.send({ ok: true, campaign: result });
        } catch (e) {
            console.error('[ads-campaigns PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // PUT /api/ads-campaigns/:id/status — Đổi trạng thái (chay_test → mau_win / mau_lose)
    fastify.put('/api/ads-campaigns/:id/status', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const campId = Number(req.params.id);
            const existing = await db.get(`SELECT * FROM ads_campaigns WHERE id = $1`, [campId]);
            if (!existing) return reply.code(404).send({ error: 'Không tìm thấy chiến dịch!' });

            const isGD = _isGiamDoc(req.user);
            const isCreator = Number(req.user.id) === Number(existing.created_by);
            if (!isGD && !isCreator) {
                return reply.code(403).send({ error: 'Bạn không có quyền thay đổi trạng thái chiến dịch này!' });
            }

            const { status } = req.body || {};
            if (!['chay_test', 'mau_win', 'mau_lose'].includes(status)) {
                return reply.code(400).send({ error: 'Trạng thái không hợp lệ! Chỉ chấp nhận: chay_test, mau_win, mau_lose' });
            }

            const finishedAt = (status === 'mau_win' || status === 'mau_lose') ? 'NOW()' : 'NULL';
            const result = await db.get(`
                UPDATE ads_campaigns SET status = $1, finished_at = ${finishedAt} WHERE id = $2 RETURNING *
            `, [status, campId]);

            return reply.send({ ok: true, campaign: result });
        } catch (e) {
            console.error('[ads-campaigns status PUT]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // DELETE /api/ads-campaigns/:id — Xóa chiến dịch
    fastify.delete('/api/ads-campaigns/:id', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const campId = Number(req.params.id);
            const existing = await db.get(`SELECT * FROM ads_campaigns WHERE id = $1`, [campId]);
            if (!existing) return reply.code(404).send({ error: 'Không tìm thấy chiến dịch!' });

            const isGD = _isGiamDoc(req.user);
            const isCreator = Number(req.user.id) === Number(existing.created_by);
            if (!isGD && !isCreator) {
                return reply.code(403).send({ error: 'Bạn không có quyền xóa chiến dịch này!' });
            }

            // Xóa báo cáo liên quan
            await db.run(`DELETE FROM ads_campaign_reports WHERE campaign_id = $1`, [campId]);
            await db.run(`DELETE FROM ads_campaigns WHERE id = $1`, [campId]);

            return reply.send({ ok: true });
        } catch (e) {
            console.error('[ads-campaigns DELETE]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 4. REPORTS API ==========

    // GET /api/ads-campaigns/:id/reports — Lấy báo cáo hàng ngày của chiến dịch
    fastify.get('/api/ads-campaigns/:id/reports', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const campId = Number(req.params.id);
            const rows = await db.all(`
                SELECT r.*, u.full_name as created_by_name
                FROM ads_campaign_reports r
                LEFT JOIN users u ON r.created_by = u.id
                WHERE r.campaign_id = $1
                ORDER BY r.report_date DESC
            `, [campId]);
            return reply.send({ ok: true, reports: rows });
        } catch (e) {
            console.error('[ads-campaigns reports GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // POST /api/ads-campaigns/:id/reports — Nhập/Cập nhật báo cáo ngày
    fastify.post('/api/ads-campaigns/:id/reports', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const campId = Number(req.params.id);
            const existing = await db.get(`SELECT * FROM ads_campaigns WHERE id = $1`, [campId]);
            if (!existing) return reply.code(404).send({ error: 'Không tìm thấy chiến dịch!' });

            // Chỉ báo cáo khi đang chạy test
            if (existing.status !== 'chay_test') {
                return reply.code(400).send({ error: 'Chỉ có thể báo cáo khi chiến dịch đang ở trạng thái "Chạy Test"!' });
            }

            const isGD = _isGiamDoc(req.user);
            const isCreator = Number(req.user.id) === Number(existing.created_by);
            if (!isGD && !isCreator) {
                return reply.code(403).send({ error: 'Bạn không có quyền báo cáo cho chiến dịch này!' });
            }

            const { report_date, tong_ngan_sach, tin_nhan, cpa, ctr, cpm, so_lan_chay, so_lan_hieu_qua } = req.body || {};

            const rptDate = report_date || new Date().toISOString().split('T')[0];

            const result = await db.get(`
                INSERT INTO ads_campaign_reports (campaign_id, report_date, tong_ngan_sach, tin_nhan, cpa, ctr, cpm, so_lan_chay, so_lan_hieu_qua, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (campaign_id, report_date) 
                DO UPDATE SET tong_ngan_sach = $3, tin_nhan = $4, cpa = $5, ctr = $6, cpm = $7, so_lan_chay = $8, so_lan_hieu_qua = $9
                RETURNING *
            `, [campId, rptDate,
                parseFloat(tong_ngan_sach) || 0,
                parseInt(tin_nhan) || 0,
                parseFloat(cpa) || 0,
                parseFloat(ctr) || 0,
                parseFloat(cpm) || 0,
                parseInt(so_lan_chay) || 0,
                parseInt(so_lan_hieu_qua) || 0,
                req.user.id
            ]);

            return reply.send({ ok: true, report: result });
        } catch (e) {
            console.error('[ads-campaigns reports POST]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

    // ========== 5. CHECK UNREPORTED (Kiểm tra chiến dịch chưa báo cáo hôm nay) ==========

    fastify.get('/api/ads-campaigns/check-unreported', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const userId = Number(req.user.id);
            const today = new Date().toISOString().split('T')[0];

            const unreported = await db.all(`
                SELECT c.id, c.campaign_name, c.created_at, ch.name as channel_name
                FROM ads_campaigns c
                LEFT JOIN ads_channels ch ON c.channel_id = ch.id
                WHERE c.status = 'chay_test'
                  AND c.created_by = $1
                  AND NOT EXISTS (
                      SELECT 1 FROM ads_campaign_reports r 
                      WHERE r.campaign_id = c.id AND r.report_date = $2
                  )
                ORDER BY c.id ASC
            `, [userId, today]);

            return reply.send({ ok: true, unreported, today });
        } catch (e) {
            console.error('[ads-campaigns check-unreported GET]', e);
            return reply.code(500).send({ error: e.message });
        }
    });

};
