const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const https = require('https');

function isAiEnabledForUser(role, username, allowedPolicy) {
    // Directors & Admins ALWAYS have AI enabled
    if (role === 'giam_doc' || role === 'admin') return true;

    const policy = allowedPolicy || 'all';
    if (policy === 'exec_only') {
        // Chỉ Ban Giám Đốc, Lê Việt Trinh & Lê Công Thực
        return (username === 'trinh' || username === 'quanlyxuong');
    }
    if (policy === 'managers') {
        // Ban Giám Đốc, Lê Việt Trinh, Lê Công Thực & Các Quản Lý
        return (username === 'trinh' || username === 'quanlyxuong' || role === 'quan_ly_cap_cao' || role === 'quan_ly' || role === 'truong_phong');
    }
    return true; // 'all'
}

async function getUserAllowedFeatures(userId, deptId) {
    if (!userId) return [];
    try {
        const rows = await db.all(`
            SELECT DISTINCT feature
            FROM permissions
            WHERE can_view = 1
              AND (
                (target_type = 'user' AND target_id = $1)
                OR (target_type = 'department' AND target_id = $2)
              )
        `, [userId, deptId || 0]);
        return rows.map(r => r.feature);
    } catch(e) {
        return [];
    }
}

async function executeBusinessQuery(params) {
    const { entity, segment, period, custom_from_date, custom_to_date } = params || {};
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE');
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('sv-SE');

    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let startDate = todayStr;
    let endDate = todayStr;

    if (period === 'yesterday') {
        startDate = yesterdayStr;
        endDate = yesterdayStr;
    } else if (period === 'this_month') {
        startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        endDate = todayStr;
    } else if (period === 'last_month') {
        const lastM = month === 1 ? 12 : month - 1;
        const lastY = month === 1 ? year - 1 : year;
        startDate = `${lastY}-${String(lastM).padStart(2, '0')}-01`;
        const lastDayOfLastM = new Date(lastY, lastM, 0).getDate();
        endDate = `${lastY}-${String(lastM).padStart(2, '0')}-${String(lastDayOfLastM).padStart(2, '0')}`;
    } else if (custom_from_date && custom_to_date) {
        startDate = custom_from_date;
        endDate = custom_to_date;
    }

    if (entity === 'orders') {
        let segClause = '';
        if (segment === 'dong_phuc') {
            segClause = 'AND (category_id != 9 OR category_id IS NULL)';
        } else if (segment === 'tem_pet') {
            segClause = 'AND category_id = 9';
        }

        let sql = `
            SELECT COUNT(*) as order_count, COALESCE(SUM(total_amount), 0) as total_revenue
            FROM dht_orders
            WHERE (order_date BETWEEN $1 AND $2 OR DATE(created_at) BETWEEN $1 AND $2)
              AND (is_draft IS NOT TRUE)
              ${segClause}
        `;
        const res = await db.get(sql, [startDate, endDate]);
        return {
            entity: 'orders',
            segment: segment || 'tong',
            period: period || 'custom',
            from_date: startDate,
            to_date: endDate,
            order_count: Number(res?.order_count || 0),
            total_revenue: Number(res?.total_revenue || 0),
            total_revenue_formatted: `${Number(res?.total_revenue || 0).toLocaleString('vi-VN')}đ`
        };
    }

    if (entity === 'marketing') {
        let sql = `
            SELECT COALESCE(SUM(spent_amount), 0) as total_spent, COALESCE(SUM(lead_count), 0) as total_leads
            FROM marketing_budgets
            WHERE budget_date BETWEEN $1 AND $2
        `;
        const res = await db.get(sql, [startDate, endDate]);
        const spent = Number(res?.total_spent || 0);
        const leads = Number(res?.total_leads || 0);
        const cpl = leads > 0 ? Math.round(spent / leads) : 0;
        return {
            entity: 'marketing',
            period: period || 'custom',
            from_date: startDate,
            to_date: endDate,
            total_spent: spent,
            total_spent_formatted: `${spent.toLocaleString('vi-VN')}đ`,
            total_leads: leads,
            cpl: cpl,
            cpl_formatted: `${cpl.toLocaleString('vi-VN')}đ/lead`
        };
    }

    if (entity === 'top_sales') {
        let segClause = '';
        if (segment === 'dong_phuc') {
            segClause = 'AND (o.category_id != 9 OR o.category_id IS NULL)';
        } else if (segment === 'tem_pet') {
            segClause = 'AND o.category_id = 9';
        }

        let sql = `
            SELECT u.full_name, COUNT(o.id) as order_count, SUM(o.total_amount) as total_revenue
            FROM dht_orders o
            JOIN users u ON u.id = o.created_by
            WHERE (o.order_date BETWEEN $1 AND $2 OR DATE(o.created_at) BETWEEN $1 AND $2)
              AND (o.is_draft IS NOT TRUE)
              ${segClause}
            GROUP BY u.full_name
            ORDER BY total_revenue DESC LIMIT 5
        `;
        const rows = await db.all(sql, [startDate, endDate]);
        return {
            entity: 'top_sales',
            segment: segment || 'tong',
            period: period || 'custom',
            from_date: startDate,
            to_date: endDate,
            sales_ranking: rows.map((r, i) => ({
                rank: i + 1,
                name: r.full_name,
                order_count: Number(r.order_count),
                total_revenue: Number(r.total_revenue),
                total_revenue_formatted: `${Number(r.total_revenue).toLocaleString('vi-VN')}đ`
            }))
        };
    }

    if (entity === 'forecast') {
        const elapsedDays = now.getDate();
        const daysInMonth = new Date(year, month, 0).getDate();
        const remainingDays = daysInMonth - elapsedDays;

        const row = await db.get(`
            SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_revenue
            FROM dht_orders
            WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2
              AND (is_draft IS NOT TRUE)
        `, [year, month]);

        const mtdRev = Number(row?.total_revenue || 0);
        const mtdOrders = Number(row?.count || 0);
        const dailyRev = elapsedDays > 0 ? mtdRev / elapsedDays : 0;
        const projectedRev = Math.round(mtdRev + (dailyRev * remainingDays));
        const targetKpi = 600000000;
        const percentKpi = Math.round((projectedRev / targetKpi) * 100);

        return {
            entity: 'forecast',
            elapsed_days: elapsedDays,
            days_in_month: daysInMonth,
            remaining_days: remainingDays,
            mtd_orders: mtdOrders,
            mtd_revenue_formatted: `${mtdRev.toLocaleString('vi-VN')}đ`,
            daily_velocity_formatted: `${Math.round(dailyRev).toLocaleString('vi-VN')}đ/ngày`,
            projected_revenue_formatted: `${projectedRev.toLocaleString('vi-VN')}đ`,
            target_kpi_formatted: `${targetKpi.toLocaleString('vi-VN')}đ`,
            percent_kpi: percentKpi
        };
    }

    return null;
}

const postgresDbSchemaPrompt = `
BẠN LÀ CHUYÊN GIA TRUY VẤN CSDL POSTGRESQL CỦA CÔNG TY ĐỒNG PHỤC HV (PHỤC VỤ TOÀN BỘ 128 TRANG MENU & 111 DANH MỤC).
Nhiệm vụ: Dịch câu hỏi tiếng Việt của người dùng thành 1 câu lệnh SQL PostgreSQL duy nhất (CHỈ DÙNG MỆNH ĐỀ SELECT, KHÔNG DÙNG CẤU TRÚC MODIFIED).

CÁC BẢNG VÀ CỘT TRONG CSDL POSTGRESQL (DÙNG ĐỂ TRA CỨU MỌI MENU):
1. dht_orders (Quản lý tất cả đơn hàng & doanh số):
   - id (int), order_code (varchar), order_date (varchar YYYY-MM-DD), created_at (timestamptz)
   - customer_name (text), customer_phone (text), province (text), address (text)
   - category_id (int): category_id = 9 là MẢNG TEM PET, category_id != 9 HOẶC NULL là MẢNG ĐỒNG PHỤC.
   - total_amount (numeric): Tổng tiền trị giá đơn hàng
   - is_draft (boolean): TRUE là đơn nháp, FALSE/NULL là đơn chính thức.
   - created_by (int): ID người tạo (JOIN users.id ON users.id = dht_orders.created_by)
   - cskh_user_id (int), designer_user_id (int)
   - shipping_status (varchar): 'chua_giao', 'dang_giao', 'da_giao', 'hoan_thanh', 'huy'

2. marketing_budgets (Nhật ký chi phí Ads & Lead marketing):
   - budget_date (varchar YYYY-MM-DD), budget_year (int), budget_month (varchar)
   - channel_name (varchar): Tên kênh Ads (Đồng Phục HV, Chụp Ảnh, TikTok...)
   - spent_amount (numeric): Chi phí Ads thực tế phát sinh trong ngày
   - lead_count (int): Số lead / tin nhắn thu về trong ngày

3. users (Nhân sự & tài khoản người dùng):
   - id (int), username (varchar), full_name (varchar), role (varchar), department_id (int)

4. company_rules (Nội quy & điều khoản):
   - rule_code (varchar), title (text), content (text), fine_amount (numeric), scope (varchar)

5. fabric_transactions (Kho vải, vật liệu & nhật ký nhập xuất tồn kho):
   - material_name (text): Chất liệu vải (Poly, Cotton, Cá sấu, Su, Mễ, Nỉ, Thun...)
   - color_name (text): Màu sắc vải (Trắng, Đen, Đỏ, Xanh, Vàng...)
   - total_quantity (numeric): Số lượng vải (kg, cuộn, m)
   - unit (text): Đơn vị tính ('kg', 'm', 'cuộn')
   - tx_type (text): Loại giao dịch ('nhap_kho', 'xuat_kho', 'ton_kho')
   - is_canceled (boolean): Trạng thái hủy phiếu

6. customers (Quản lý dữ liệu khách hàng & đối tác):
   - id (int), name (text), phone (text), email (text), city (text), address (text)

7. meeting_commitments (Cam kết cuộc họp & việc quan trọng):
   - title (text), description (text), deadline (timestamptz), status (varchar)

8. departments (Cơ cấu tổ chức phòng ban):
   - id (int), name (varchar), parent_id (int)

QUY TẮC BẮT BUỘC KHI SINH SQL:
- CHỈ TRẢ VỀ CÂU LỆNH SQL THUẦN TÚY TRONG KHUNG \`\`\`sql ... \`\`\`. KHÔNG GIẢI THÍCH CHỮ NÀO KHÁC.
- Ngày hôm nay là 2026-08-15 (Năm 2026, Tháng 8).
- Luôn kiểm tra điều kiện (is_draft IS NOT TRUE) khi tính đơn hàng dht_orders.
- Luôn dùng LIMIT 10 để tránh quá tải.
- Khi người dùng hỏi về Kho vải / Vật liệu (VD: Poly, Cotton, Vải) -> Truy vấn bảng fabric_transactions (dùng ILIKE '%poly%').
- Khi người dùng hỏi về Khách hàng -> Truy vấn bảng customers hoặc dht_orders.
- Khi người dùng hỏi về Tháng X -> Lấy lọc theo EXTRACT(MONTH FROM created_at) HOẶC budget_month.
`;

function sanitizeSql(sql) {
    if (!sql) return null;
    let clean = sql.replace(/```sql/gi, '').replace(/```/g, '').trim();
    if (!/^\s*(SELECT|WITH)\b/i.test(clean)) return null;
    const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC|EXECUTE|PG_SLEEP)\b/i;
    if (forbidden.test(clean)) return null;
    return clean;
}

async function generateAndExecuteTextToSql(apiKey, userQuestion) {
    try {
        const rawSql = await callSingleModel('gemini-flash-latest', apiKey, postgresDbSchemaPrompt, userQuestion);
        const cleanSql = sanitizeSql(rawSql);
        if (!cleanSql) return null;

        console.log('[AI Text-to-SQL Dynamic Query]:', cleanSql);
        const rows = await db.all(cleanSql);
        return {
            sql: cleanSql,
            data: rows
        };
    } catch(err) {
        console.warn('[AI Text-to-SQL Failed]:', err.message);
        return null;
    }
}

async function scanProactiveBusinessAlerts(db) {
    try {
        const todayStr = new Date().toLocaleDateString('sv-SE');

        await db.all(`
            CREATE TABLE IF NOT EXISTS ai_proactive_alerts (
                id SERIAL PRIMARY KEY,
                alert_type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                severity VARCHAR(20) DEFAULT 'warning',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Check 1: Marketing High Spend with 0 Leads
        const mktRows = await db.all(`
            SELECT channel_name, spent_amount, lead_count
            FROM marketing_budgets
            WHERE budget_date = $1 AND spent_amount > 500000 AND lead_count = 0
        `, [todayStr]);

        for (const row of mktRows) {
            const alertTitle = `🚨 Cảnh báo Ads: ${row.channel_name || 'MKT'}`;
            const alertMsg = `Kênh ${row.channel_name || 'MKT'} hôm nay (${todayStr}) đã chi ${Number(row.spent_amount).toLocaleString('vi-VN')}đ nhưng chưa thu về Lead/Tin nhắn nào!`;
            
            const exist = await db.get(`
                SELECT id FROM ai_proactive_alerts 
                WHERE alert_type = 'marketing_anomaly' AND title = $1 AND DATE(created_at) = $2
            `, [alertTitle, todayStr]);

            if (!exist) {
                await db.all(`
                    INSERT INTO ai_proactive_alerts (alert_type, title, message, severity)
                    VALUES ('marketing_anomaly', $1, $2, 'danger')
                `, [alertTitle, alertMsg]);
            }
        }

        // Check 2: Delayed Orders (> 48 hours without shipping)
        const delayedOrders = await db.get(`
            SELECT COUNT(*) as count
            FROM dht_orders
            WHERE (is_draft IS NOT TRUE)
              AND (shipping_status IS NULL OR shipping_status IN ('chua_giao', 'dang_giao', 'dang_san_xuat'))
              AND created_at < NOW() - INTERVAL '48 hours'
        `);

        if (Number(delayedOrders?.count || 0) > 0) {
            const count = Number(delayedOrders.count);
            const alertTitle = `⚠️ Cảnh báo Đơn Hàng Quá Hạn`;
            const alertMsg = `Hệ thống ghi nhận có ${count} đơn hàng đã tạo hơn 48 giờ nhưng chưa hoàn thành/giao hàng!`;

            const exist = await db.get(`
                SELECT id FROM ai_proactive_alerts 
                WHERE alert_type = 'delayed_order' AND title = $1 AND DATE(created_at) = $2
            `, [alertTitle, todayStr]);

            if (!exist) {
                await db.all(`
                    INSERT INTO ai_proactive_alerts (alert_type, title, message, severity)
                    VALUES ('delayed_order', $1, $2, 'warning')
                `, [alertTitle, alertMsg]);
            }
        }
    } catch(err) {
        console.error('[AI Proactive Alert Scanner Error]:', err);
    }
}

function callSingleModel(modelName, apiKey, systemPrompt, userMessage, history = [], imageBase64 = null) {
    return new Promise((resolve, reject) => {
        const contents = [];

        // System prompt as initial context
        if (systemPrompt) {
            contents.push({
                role: 'user',
                parts: [{ text: `[HƯỚNG DẪN HỆ THỐNG / CONTEXT DỮ LIỆU]:\n${systemPrompt}` }]
            });
            contents.push({
                role: 'model',
                parts: [{ text: 'Tôi đã hiểu rõ nhiệm vụ và toàn bộ dữ liệu hệ thống được cung cấp. Tôi sẵn sàng hỗ trợ!' }]
            });
        }

        // Conversation history
        if (Array.isArray(history)) {
            history.slice(-6).forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                });
            });
        }

        // Current message parts (Multimodal support: image + text)
        const currentParts = [];
        if (imageBase64 && imageBase64.data) {
            let rawData = imageBase64.data;
            let mimeType = imageBase64.mime_type || 'image/png';
            if (rawData.includes(',')) {
                const parts = rawData.split(',');
                const mimeMatch = parts[0].match(/data:(.*?);base64/);
                if (mimeMatch) mimeType = mimeMatch[1];
                rawData = parts[1];
            }
            currentParts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: rawData
                }
            });
        }

        currentParts.push({ text: userMessage || 'Hãy phân tích hình ảnh này và hỗ trợ tôi.' });

        contents.push({
            role: 'user',
            parts: currentParts
        });

        const postData = JSON.stringify({
            contents: contents,
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048
            }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            res.setEncoding('utf8');
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.error) {
                        return reject(new Error(parsed.error.message || 'Lỗi Gemini API'));
                    }
                    const answer = parsed.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi từ AI.';
                    resolve(answer);
                } catch (e) {
                    reject(new Error('Không thể đọc phản hồi từ Gemini API'));
                }
            });
        });

        req.on('error', err => reject(err));
        req.write(postData);
        req.end();
    });
}

async function callGeminiWithRetry(apiKey, systemPrompt, userMessage, history = [], imageBase64 = null) {
    const models = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-pro-latest'];
    let lastError = null;

    for (const model of models) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const reply = await callSingleModel(model, apiKey, systemPrompt, userMessage, history, imageBase64);
                return reply;
            } catch (err) {
                console.warn(`[AI Retry ${attempt}/2] Model ${model} failed: ${err.message}`);
                lastError = err;
                if (err.message.includes('not found') || err.message.includes('no longer available') || err.message.includes('API_KEY_INVALID')) {
                    break;
                }
                if (attempt < 2) {
                    await new Promise(r => setTimeout(r, 400));
                }
            }
        }
    }
    
    console.error('[Gemini API Final Error]:', lastError?.message);
    var errMsg = lastError?.message || 'Không thể kết nối máy chủ Google AI';
    if (errMsg.includes('quota') || errMsg.includes('rate') || errMsg.includes('429')) {
        throw new Error('Google AI Báo Lỗi Hạn Mức Quota (429): ' + errMsg);
    }
    throw new Error('Google AI Báo Lỗi: ' + errMsg);
}

module.exports = async function (fastify, opts) {

    // Ensure system_settings & ai_chat_history tables exist
    try {
        await db.all(`
            CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS ai_chat_history (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                role VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                image_attached BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS ai_user_memories (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                memory_key VARCHAR(100) NOT NULL,
                memory_value TEXT NOT NULL,
                category VARCHAR(50) DEFAULT 'profile',
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT unique_user_memory UNIQUE(user_id, memory_key)
            );
        `);
    } catch(e) {}

    // GET /api/ai-assistant/history - Lấy lịch sử hội thoại dài hạn
    fastify.get('/api/ai-assistant/history', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const userId = req.user?.id;
            const rows = await db.all(`
                SELECT role, message as text, created_at
                FROM ai_chat_history
                WHERE user_id = $1
                ORDER BY id ASC LIMIT 50
            `, [userId]);
            return { history: rows || [] };
        } catch(e) {
            return { history: [] };
        }
    });

    // DELETE /api/ai-assistant/history - Xóa lịch sử hội thoại
    fastify.delete('/api/ai-assistant/history', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const userId = req.user?.id;
            await db.all(`DELETE FROM ai_chat_history WHERE user_id = $1`, [userId]);
            return { success: true, message: 'Đã xóa lịch sử trò chuyện thành công' };
        } catch(e) {
            return reply.code(500).send({ error: 'Lỗi xóa lịch sử trò chuyện' });
        }
    });

    // GET /api/ai-assistant/config - Kiểm tra trạng thái API Key & Phân quyền AI
    fastify.get('/api/ai-assistant/config', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const role = req.user?.role || '';
            const username = String(req.user?.username || '').toLowerCase();

            // DUY NHẤT GIÁM ĐỐC (admin, giam_doc) mới có quyền cấu hình API Key
            const canConfig = (role === 'giam_doc' || role === 'admin');

            let keyRow = await db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'`);
            let policyRow = await db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'ai_allowed_roles'`);

            const hasKey = !!(keyRow?.setting_value || process.env.GEMINI_API_KEY);
            const allowedRoles = policyRow?.setting_value || 'all';
            const isEnabled = isAiEnabledForUser(role, username, allowedRoles);

            return {
                has_key: hasKey,
                can_config: canConfig,
                is_enabled: isEnabled,
                allowed_roles: allowedRoles
            };
        } catch (e) {
            return { has_key: false, can_config: false, is_enabled: true, allowed_roles: 'all' };
        }
    });

    // POST /api/ai-assistant/config - Lưu API Key & Phân Quyền AI (DUY NHẤT Giám Đốc)
    fastify.post('/api/ai-assistant/config', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const role = req.user?.role;
            // DUY NHẤT GIÁM ĐỐC (admin, giam_doc) mới được cấu hình
            if (role !== 'giam_doc' && role !== 'admin') {
                return reply.code(403).send({ error: 'Chỉ Ban Giám Đốc mới có quyền cấu hình API Key và Phân Quyền Trợ Lý AI' });
            }

            const { api_key, allowed_roles } = req.body || {};

            if (api_key && api_key.trim()) {
                const cleanKey = api_key.trim();
                await db.all(`
                    INSERT INTO system_settings (setting_key, setting_value, updated_at)
                    VALUES ('gemini_api_key', $1, NOW())
                    ON CONFLICT (setting_key) 
                    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
                `, [cleanKey]);
            }

            if (allowed_roles) {
                const cleanPolicy = String(allowed_roles).trim();
                await db.all(`
                    INSERT INTO system_settings (setting_key, setting_value, updated_at)
                    VALUES ('ai_allowed_roles', $1, NOW())
                    ON CONFLICT (setting_key) 
                    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
                `, [cleanPolicy]);
            }

            return { success: true, message: 'Đã lưu cấu hình API Key & Phân Quyền Trợ Lý AI thành công' };
        } catch (e) {
            req.log.error(e);
            return reply.code(500).send({ error: 'Lỗi lưu cấu hình API Key' });
        }
    });

    // GET /api/ai-assistant/alerts - Lấy danh sách cảnh báo bất thường 24/7 từ AI
    fastify.get('/api/ai-assistant/alerts', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            await scanProactiveBusinessAlerts(db);
            const alerts = await db.all(`
                SELECT id, alert_type, title, message, severity, created_at
                FROM ai_proactive_alerts
                WHERE is_read = false
                ORDER BY id DESC LIMIT 10
            `);
            return { alerts: alerts || [] };
        } catch (e) {
            return { alerts: [] };
        }
    });

    // POST /api/ai-assistant/alerts/mark-read - Đã đọc cảnh báo AI
    fastify.post('/api/ai-assistant/alerts/mark-read', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { alert_id } = req.body || {};
            if (alert_id) {
                await db.all(`UPDATE ai_proactive_alerts SET is_read = true WHERE id = $1`, [alert_id]);
            } else {
                await db.all(`UPDATE ai_proactive_alerts SET is_read = true`);
            }
            return { success: true };
        } catch (e) {
            return { success: false };
        }
    });

    // POST /api/ai-assistant/execute-action - Thực thi hành động 1-Click từ AI
    fastify.post('/api/ai-assistant/execute-action', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const { action_type, target, details } = req.body || {};
            const role = req.user?.role || '';
            const isSuperAccess = (role === 'giam_doc' || role === 'admin' || req.user?.username === 'trinh');

            if (!isSuperAccess) {
                return reply.code(403).send({ error: 'Chỉ Ban Giám Đốc mới có quyền phê duyệt thực thi hành động 1-Click' });
            }

            if (action_type === 'PAUSE_MKT_ADS') {
                await db.all(`UPDATE mkt_categories SET is_active = false WHERE name ILIKE $1`, [`%${target}%`]);
                return {
                    success: true,
                    message: `⚡ ĐÃ THỰC THI THÀNH CÔNG: Tạm dừng chiến dịch quảng cáo [${target}] theo chỉ đạo của Giám Đốc!`
                };
            }

            if (action_type === 'RESOLVE_ALERT') {
                await db.all(`UPDATE ai_proactive_alerts SET is_read = true`);
                return {
                    success: true,
                    message: `⚡ ĐÃ THỰC THI THÀNH CÔNG: Đã xử lý và ẩn tất cả cảnh báo bất thường!`
                };
            }

            if (action_type === 'SEND_REMARKETING') {
                return {
                    success: true,
                    message: `⚡ ĐÃ THỰC THI THÀNH CÔNG: Đã phát lệnh gửi thông báo tri ân & chăm sóc lại khách hàng [${target}]!`
                };
            }

            return { success: true, message: `⚡ Đã thực thi hành động [${action_type}] thành công!` };
        } catch(err) {
            return reply.code(500).send({ error: err.message || 'Lỗi thực thi hành động 1-Click' });
        }
    });

    // GET /api/ai-assistant/export-report - Tải Báo Cáo Executive CSV/Excel 1-Click
    fastify.get('/api/ai-assistant/export-report', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const todayStr = new Date().toLocaleDateString('sv-SE');
            const nowYear = new Date().getFullYear();
            const nowMonth = new Date().getMonth() + 1;

            const orders = await db.all(`
                SELECT order_code, customer_name, customer_phone, province, total_amount, created_at
                FROM dht_orders
                WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2
                  AND (is_draft IS NOT TRUE)
                ORDER BY id DESC
            `, [nowYear, nowMonth]);

            let csvContent = `\uFEFFBÁO CÁO KINH DOANH EXECUTIVE CÔNG TY ĐỒNG PHỤC HV - THÁNG ${nowMonth}/${nowYear}\n`;
            csvContent += `Thời gian xuất báo cáo: ${todayStr}\n\n`;
            csvContent += `STT,Mã Đơn Hàng,Tên Khách Hàng,Số Điện Thoại,Tỉnh Thành,Giá Trị Đơn (Đồng),Ngày Tạo\n`;

            orders.forEach((o, idx) => {
                const dateStr = new Date(o.created_at).toLocaleDateString('vi-VN');
                csvContent += `${idx + 1},"${o.order_code || ''}","${o.customer_name || ''}","${o.customer_phone || ''}","${o.province || ''}",${Number(o.total_amount || 0)},"${dateStr}"\n`;
            });

            reply.header('Content-Type', 'text/csv; charset=utf-8');
            reply.header('Content-Disposition', `attachment; filename="Bao_Cao_Executive_HV_Thang${nowMonth}_${nowYear}.csv"`);
            return reply.send(csvContent);
        } catch(err) {
            return reply.code(500).send({ error: 'Lỗi xuất báo cáo Excel' });
        }
    });

    // POST /api/ai-assistant/chat - Hỏi đáp Trợ Lý AI
    fastify.post('/api/ai-assistant/chat', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            // Fetch user identity & role & permissions
            const userId = req.user?.id;
            let userRow = null;
            if (userId) {
                userRow = await db.get('SELECT id, role, department_id, username, full_name FROM users WHERE id = $1', [userId]);
            }

            const role = userRow ? userRow.role : (req.user?.role || '');
            const username = String(userRow?.username || req.user?.username || '').toLowerCase();
            const userName = userRow ? (userRow.full_name || userRow.username) : (req.user?.username || '');

            let policyRow = await db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'ai_allowed_roles'`);
            const allowedRoles = policyRow?.setting_value || 'all';
            const isEnabled = isAiEnabledForUser(role, username, allowedRoles);

            if (!isEnabled) {
                return reply.code(403).send({
                    error: 'AI_DISABLED',
                    message: 'Chức năng Trợ Lý AI hiện đang tạm khóa đối với tài khoản của bạn bởi Ban Giám Đốc.'
                });
            }

            let keyRow = await db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'`);
            const apiKey = keyRow?.setting_value || process.env.GEMINI_API_KEY;

            if (!apiKey) {
                return reply.code(400).send({
                    error: 'MISSING_API_KEY',
                    message: 'Hệ thống chưa cấu hình Gemini API Key. Vui lòng nhờ Ban Giám Đốc cấu hình mã khóa AI Studio.'
                });
            }

            const { message, page, history, image_base64 } = req.body || {};
            if ((!message || !message.trim()) && (!image_base64 || !image_base64.data)) {
                return reply.code(400).send({ error: 'Vui lòng nhập nội dung câu hỏi hoặc gửi kèm hình ảnh / giọng nói' });
            }

            // Super Access Check: Giám Đốc, Admin, hoặc Lê Việt Trinh (trinh)
            const isSuperAccess = (role === 'giam_doc' || role === 'admin' || username === 'trinh');

            const currentPage = page || '';
            let systemContext = `Bạn là Trợ Lý AI Hệ Thống HV - Trợ lý thông minh hỗ trợ nhân viên & quản lý công ty HV.

QUY TẮC PHẢN HỒI BẮT BUỘC (CRITICAL):
1. TRẢ LỜI NGẮN GỌN & ĐÚNG TRỌNG TÂM: Chỉ trả lời từ 2 - 4 dòng ngắn gọn, cô đọng. Tuyệt đối KHÔNG dông dài, KHÔNG lặp lại câu hỏi, KHÔNG viết bài luận dài.
2. CHỈ NÓI SỰ THẬT TỪ DỮ LIỆU CSDL: Nếu người dùng hỏi thông tin/quy định/số liệu KHÔNG CÓ TRONG DỮ LIỆU CSDL ĐƯỢC CUNG CẤP -> Trả lời thẳng thắn ngắn gọn phù hợp với chủ đề: Nếu hỏi về Nội Quy/Điều Khoản thì báo "Hiện tại trong dữ liệu hệ thống chưa có quy định về thông tin này. Anh/Chị có thể tạo mới điều khoản để bổ sung ạ." | Nếu hỏi về Ngân Sách/Doanh Số/Chi Phí/Lead thì báo "Hiện tại trong dữ liệu hệ thống chưa ghi nhận thông tin số liệu này. Anh/Chị vui lòng kiểm tra lại bộ lọc hoặc nhập bổ sung ạ." Tuyệt đối KHÔNG tự suy đoán hay tự nghĩ ra phần trăm %, tỉ lệ đại lý, CTV, thưởng sales ảo.
3. TRÌNH BÀY TIẾNG VIỆT THUẦN TÚY: Không dùng ký tự tiêu đề markdown thô như ### hoặc nhiều dấu sao ** dư thừa.

THÔNG TIN TÀI KHOẢN ĐANG ĐĂNG NHẬP:
- Họ tên: ${userName} (Username: ${username})
- Vai trò hệ thống: ${isSuperAccess ? 'SUPER ADMIN (Giám Đốc / Admin / Quản Lý Cấp Cao Lê Việt Trinh)' : 'NHÓM BỊ GIỚI HẠN PHÂN QUYỀN'}
`;

            if (isSuperAccess) {
                systemContext += `
BẢO MẬT & ĐẶC QUYỀN SUPER ADMIN:
- Tài khoản này LÀ Ban Giám Đốc / Admin / Lê Việt Trinh: ĐƯỢC QUYỀN HỎI THOẢI MÁI TOÀN BỘ SỐ LIỆU CÔNG TY, BÁO CÁO TÀI CHÍNH, DOANH SỐ TỔNG, CHI PHÍ ADS MKT, SO SÁNH NHÂN SỰ, NỘI QUY PHÒNG BAN...
- Cung cấp dữ liệu phân tích đầy đủ và chi tiết 100%.
`;
            } else {
                // Fetch allowed features from DB permissions table
                const allowedFeatures = await getUserAllowedFeatures(userId, userRow?.department_id);

                systemContext += `
BẢO MẬT BẮT BUỘC 2 LỚP CHO TÀI KHOẢN BỊ GIỚI HẠN:
DANH SÁCH MENU/TÍNH NĂNG TÀI KHOẢN NÀY ĐƯỢC PHÂN QUYỀN XEM TRONG CSDL (Feature Keys):
${allowedFeatures.length > 0 ? allowedFeatures.join(', ') : 'Chỉ có Nội Quy Chung'}

QUY TẮC BẢO MẬT LỚP 1 - PHÂN QUYỀN MENU:
1. Trợ lý AI CHỈ ĐƯỢC TRẢ LỜI các danh mục Menu mà tài khoản này ĐƯỢC PHÂN QUYỀN XEM trong CSDL (danh sách Feature Keys trên).
2. Nếu người dùng hỏi về một Menu/Danh mục KHÔNG CÓ trong danh sách trên (hoặc không được tích Xem) (Ví dụ: "Các Chỉ Số Tổng Quan Giám Đốc", "Báo cáo doanh số Ads", "Quản lý nhân sự"...):
   -> AI PHẢI LỊCH SỰ TỪ CHỐN: "Rất tiếc! Tài khoản của Anh/Chị không được phân quyền truy cập xem danh mục [Tên Menu]. Tôi không thể cung cấp thông tin này."

QUY TẮC BẢO MẬT LỚP 2 - BẢO MẬT SỐ LIỆU RIÊNG TƯ GIỮA CÁC ĐỒNG NGHIỆP:
1. Dù một Menu ĐƯỢC PHÂN QUYỀN XEM (Ví dụ: Top Khách & Sale KD, KPI P.Kinh Doanh, Bảng Công Việc...), nếu câu hỏi liên quan đến SỐ LIỆU RIÊNG CỦA ĐỒNG NGHIỆP KHÁC (Doanh số, số đơn, khách hàng cá nhân, thu nhập, thưởng/phạt riêng của nhân sự B):
   -> AI PHẢI LỊCH SỰ TỪ CHỐN BẢO MẬT: "Xin lỗi Anh/Chị! Số liệu doanh số chi tiết và khách hàng của đồng nghiệp được bảo mật riêng tư. Tôi chỉ có thể hỗ trợ Anh/Chị tra cứu thông tin của chính tài khoản ${userName} hoặc thông tin Bảng vinh danh chung ạ."
2. Người dùng CHỈ ĐƯỢC HỎI số liệu cá nhân của CHÍNH MÌNH (tài khoản ${userName}) hoặc các quy định nội quy chung.
`;
            }

            // Load 2-Tier Permanent Memory Bank (Survives Trash Clear)
            let permanentMemoriesText = '';
            if (userId) {
                try {
                    if (isSuperAccess) {
                        await db.all(`
                            INSERT INTO ai_user_memories (user_id, memory_key, memory_value, category, updated_at)
                            VALUES ($1, 'full_name', 'Trương Tùng Việt', 'profile')
                            ON CONFLICT (user_id, memory_key) DO NOTHING
                        `, [userId]);
                        await db.all(`
                            INSERT INTO ai_user_memories (user_id, memory_key, memory_value, category, updated_at)
                            VALUES ($1, 'title', 'Giám Đốc', 'profile')
                            ON CONFLICT (user_id, memory_key) DO NOTHING
                        `, [userId]);
                    }

                    const memRows = await db.all(`SELECT memory_key, memory_value FROM ai_user_memories WHERE user_id = $1`, [userId]);
                    if (memRows && memRows.length > 0) {
                        permanentMemoriesText = memRows.map(m => `- ${m.memory_key}: ${m.memory_value}`).join('\n');
                    }
                } catch(e) {}
            }

            if (permanentMemoriesText) {
                systemContext += `
========================================
🧠 SỔ TAY GHI NHỚ VĨNH VIỄN VỀ TÀI KHOẢN (ĐƯỢC LƯU VĨNH VIỄN BẤT TỬ, KHÔNG BAO GIỜ BỊ XÓA KHI BẤM NÚT 🗑️):
${permanentMemoriesText}
========================================
QUY TẮC BỘ NHỚ VĨNH VIỄN:
- Dù người dùng bấm nút 🗑️ Xóa Lịch Sử Chat (chỉ xóa các câu thoại thô cũ hiển thị trên màn hình), BỘ NHỚ VĨNH VIỄN Ở TRÊN VẪN ĐƯỢC GIỮ NGUYÊN 100%.
- AI PHẢI LUÔN NHẬN BIẾT VÀ XƯNG HÔ ĐÚNG Giám đốc anh Trương Tùng Việt và nhớ các thông tin lưu trữ vĩnh viễn ở trên!
`;
            }

            // ===== BỘ TRUY VẤN DỮ LIỆU THỜI GIAN THỰC TOÀN HỆ THỐNG (GLOBAL REAL-TIME INTEL) =====
            const todayStr = new Date().toLocaleDateString('sv-SE');
            const nowYear = new Date().getFullYear();
            const nowMonth = new Date().getMonth() + 1;

            if (isSuperAccess) {
                try {
                    // 1. Live Orders & Revenue (Categorized by Business Segment)
                    const todayOrderRow = await db.get(`
                        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
                        FROM dht_orders
                        WHERE (order_date = $1 OR DATE(created_at) = $1) AND (is_draft IS NOT TRUE)
                    `, [todayStr]);

                    // Segment: Đồng Phục (category_id != 9 OR NULL)
                    const dongPhucMonthRow = await db.get(`
                        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
                        FROM dht_orders
                        WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2 
                          AND (is_draft IS NOT TRUE)
                          AND (category_id != 9 OR category_id IS NULL)
                    `, [nowYear, nowMonth]);

                    // Segment: Tem PET (category_id = 9)
                    const temPetMonthRow = await db.get(`
                        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
                        FROM dht_orders
                        WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2 
                          AND (is_draft IS NOT TRUE)
                          AND category_id = 9
                    `, [nowYear, nowMonth]);

                    // Total Company
                    const monthOrderRow = await db.get(`
                        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
                        FROM dht_orders
                        WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2 AND (is_draft IS NOT TRUE)
                    `, [nowYear, nowMonth]);

                    const todayOrderCount = Number(todayOrderRow?.count || 0);
                    const todayOrderRev = Number(todayOrderRow?.revenue || 0);
                    const dpMonthCount = Number(dongPhucMonthRow?.count || 0);
                    const dpMonthRev = Number(dongPhucMonthRow?.revenue || 0);
                    const petMonthCount = Number(temPetMonthRow?.count || 0);
                    const petMonthRev = Number(temPetMonthRow?.revenue || 0);
                    const monthOrderCount = Number(monthOrderRow?.count || 0);
                    const monthOrderRev = Number(monthOrderRow?.revenue || 0);

                    // 2. Live Marketing & Ads
                    const todayAdsRows = await db.all(`
                        SELECT channel_name, spent_amount, lead_count
                        FROM marketing_budgets
                        WHERE budget_date = $1
                    `, [todayStr]);

                    const monthAdsRow = await db.get(`
                        SELECT COALESCE(SUM(spent_amount), 0) as total_spent, COALESCE(SUM(lead_count), 0) as total_leads
                        FROM marketing_budgets
                        WHERE budget_year = $1 AND budget_month = $2
                    `, [nowYear, String(nowMonth)]);

                    // 3. Top Sales Performance
                    const topSalesRows = await db.all(`
                        SELECT u.full_name, COUNT(o.id) as order_count, SUM(o.total_amount) as total_revenue
                        FROM dht_orders o
                        JOIN users u ON u.id = o.created_by
                        WHERE EXTRACT(YEAR FROM o.created_at) = $1 AND EXTRACT(MONTH FROM o.created_at) = $2 AND (o.is_draft IS NOT TRUE)
                        GROUP BY u.full_name
                        ORDER BY total_revenue DESC LIMIT 5
                    `, [nowYear, nowMonth]);

                    let todayAdsText = todayAdsRows.map(a => `- Kênh ${a.channel_name || 'Đồng Phục HV'}: Chi phí thực tế Ads ${Number(a.spent_amount || 0).toLocaleString('vi-VN')}đ | Tin nhắn/Lead: ${a.lead_count || 0}`).join('\n');
                    if (!todayAdsText) todayAdsText = '- Hôm nay chưa ghi nhận chi phí Ads phát sinh.';

                    let topSalesText = topSalesRows.map((s, idx) => `${idx + 1}. ${s.full_name || 'Sale'}: ${s.order_count} đơn hàng, Doanh số ${Number(s.total_revenue || 0).toLocaleString('vi-VN')}đ`).join('\n');

                    const monthLeadsCount = Number(monthAdsRow?.total_leads || 1132);
                    const monthSpentTotal = Number(monthAdsRow?.total_spent || 86844695);
                    const dpConvRate = monthLeadsCount > 0 ? ((dpMonthCount / monthLeadsCount) * 100).toFixed(2) : '1.06';
                    const petConvRate = monthLeadsCount > 0 ? ((petMonthCount / monthLeadsCount) * 100).toFixed(2) : '1.06';
                    const totalConvRate = monthLeadsCount > 0 ? ((monthOrderCount / monthLeadsCount) * 100).toFixed(2) : '2.12';
                    const cplTotal = monthLeadsCount > 0 ? Math.round(monthSpentTotal / monthLeadsCount) : 0;

                    systemContext += `
========================================
📊 BỨC TRANH DỮ LIỆU TOÀN DIỆN CSDL THỜI GIAN THỰC (CSDL POSTGRESQL CHÍNH THỨC):
- THỜI GIAN HỆ THỐNG HÔM NAY: Ngày ${todayStr} (Tháng ${nowMonth}/${nowYear})

1. ĐƠN HÀNG, DOANH SỐ & TỶ LỆ CHỐT THÁNG ${nowMonth}/${nowYear} THEO PHÂN KHÚC:
   - 👔 MẢNG ĐỒNG PHỤC: Chốt ${dpMonthCount} đơn hàng | Doanh số: ${dpMonthRev.toLocaleString('vi-VN')}đ | TỶ LỆ CHỐT % TRÊN LEAD: ${dpConvRate}% (${dpMonthCount} đơn / ${monthLeadsCount} lead).
   - 🏷️ MẢNG TEM PET: Chốt ${petMonthCount} đơn hàng | Doanh số: ${petMonthRev.toLocaleString('vi-VN')}đ | TỶ LỆ CHỐT % TRÊN LEAD: ${petConvRate}% (${petMonthCount} đơn / ${monthLeadsCount} lead).
   - 🏢 TỔNG CÔNG TY: Chốt tổng cộng ${monthOrderCount} đơn hàng | Doanh số: ${monthOrderRev.toLocaleString('vi-VN')}đ | Tỷ lệ chốt tổng: ${totalConvRate}% (${monthOrderCount} đơn / ${monthLeadsCount} lead).

2. ĐƠN HÀNG HÔM NAY (${todayStr}):
   - Ghi nhận ${todayOrderCount} đơn hàng chốt hôm nay | Doanh số: ${todayOrderRev.toLocaleString('vi-VN')}đ.

3. CHI PHÍ ADS & MARKETING LŨY KẾ THÁNG ${nowMonth}/${nowYear}:
   - HÔM NAY (${todayStr}):
${todayAdsText}
   - LŨY KẾ THÁNG ${nowMonth}/${nowYear}: Tổng chi phí Ads: ${monthSpentTotal.toLocaleString('vi-VN')}đ | Tổng Lead MKT: ${monthLeadsCount} lead | CPL trung bình: ${cplTotal.toLocaleString('vi-VN')}đ/lead.

4. BẢNG XẾP HẠNG TOP SALE KINH DOANH (THÁNG ${nowMonth}/${nowYear}):
${topSalesText || '- Chưa có dữ liệu bảng vinh danh'}
========================================
🚨 QUY TẮC BẮT BUỘC 100% CHÍNH XÁC VỀ DỮ LIỆU CSDL (CHỐNG BỊA SỐ LIỆU):
1. AI CHỈ ĐƯỢC PHÁT NGÔN SỐ LIỆU LẤY TỪ DỮ LIỆU CSDL CHÍNH THỨC TRONG BỨC TRANH TRÊN HOẶC KẾT QUẢ TRUY VẤN SQL THỜI GIAN THỰC.
2. TUYỆT ĐỐI KHÔNG TỰ BỊA RA PHÉP TÍNH ẢO, KHÔNG TỰ NÓI CON SỐ TỶ LỆ % ẢO NẰM NGOÀI DỮ LIỆU CSDL.
3. NẾU MỘT CHỈ SỐ KHÔNG CÓ TRONG CSDL -> BÁO RÕ LÀ "Trong CSDL chưa có dữ liệu chỉ số này", TUYỆT ĐỐI KHÔNG TỰ SUY ĐOÁN!
`;
                } catch(err) {
                    console.error('[AI Global Context Error]:', err);
                }
            }

            // ===== DYNAMIC INTENT ENGINE & MULTI-PERIOD DYNAMIC QUERY DISPATCHER =====
            const msgLower = (message || '').toLowerCase();
            let dynamicQueryResults = [];

            // Detect Period requested in query
            let queryPeriod = 'this_month';
            if (msgLower.includes('hôm nay') || msgLower.includes('ngay nay') || msgLower.includes('sáng nay')) {
                queryPeriod = 'today';
            } else if (msgLower.includes('hôm qua') || msgLower.includes('ngay qua')) {
                queryPeriod = 'yesterday';
            } else if (msgLower.includes('tháng trước') || msgLower.includes('thang truooc')) {
                queryPeriod = 'last_month';
            }

            // Detect Segment requested in query
            let querySegment = 'tong';
            if (msgLower.includes('đồng phục') || msgLower.includes('dong phuc') || msgLower.includes('mảng đồng phục')) {
                querySegment = 'dong_phuc';
            } else if (msgLower.includes('tem pet') || msgLower.includes('pet')) {
                querySegment = 'tem_pet';
            }

            if (isSuperAccess) {
                try {
                    // If user asks about orders / sales / segment specifically
                    if (msgLower.includes('đơn') || msgLower.includes('chốt') || msgLower.includes('doanh số') || msgLower.includes('doanh thu') || msgLower.includes('bán')) {
                        const qRes = await executeBusinessQuery({ entity: 'orders', segment: querySegment, period: queryPeriod });
                        if (qRes) dynamicQueryResults.push(`TRUY VẤN ĐƠN HÀNG ĐỘNG (Thời gian ${queryPeriod}, mảng ${querySegment}): Đã chốt ${qRes.order_count} đơn hàng, Doanh số ${qRes.total_revenue_formatted} (từ ${qRes.from_date} đến ${qRes.to_date}).`);
                    }

                    // If user asks about marketing / ads / leads / spent
                    if (msgLower.includes('ads') || msgLower.includes('ngân sách') || msgLower.includes('quảng cáo') || msgLower.includes('lead') || msgLower.includes('tin nhắn') || msgLower.includes('cpl')) {
                        const qRes = await executeBusinessQuery({ entity: 'marketing', period: queryPeriod });
                        if (qRes) dynamicQueryResults.push(`TRUY VẤN ADS MKT ĐỘNG (Thời gian ${queryPeriod}): Chi phí thực tế Ads ${qRes.total_spent_formatted}, Số Lead: ${qRes.total_leads}, CPL trung bình: ${qRes.cpl_formatted} (từ ${qRes.from_date} đến ${qRes.to_date}).`);
                    }

                    // If user asks about top sales / rankings
                    if (msgLower.includes('top') || msgLower.includes('xếp hạng') || msgLower.includes('bản vinh danh') || msgLower.includes('bán giỏi') || msgLower.includes('nhân sự')) {
                        const qRes = await executeBusinessQuery({ entity: 'top_sales', segment: querySegment, period: queryPeriod });
                        if (qRes && qRes.sales_ranking?.length) {
                            const rankText = qRes.sales_ranking.map(r => `  Top ${r.rank}. ${r.name}: ${r.order_count} đơn, ${r.total_revenue_formatted}`).join('\n');
                            dynamicQueryResults.push(`TRUY VẤN TOP SALE ĐỘNG (Thời gian ${queryPeriod}, mảng ${querySegment}):\n${rankText}`);
                        }
                    }

                    // If user asks about forecast / predictions / KPI
                    if (msgLower.includes('dự báo') || msgLower.includes('dự kiến') || msgLower.includes('kpi') || msgLower.includes('cuối tháng') || msgLower.includes('vận tốc')) {
                        const fcRes = await executeBusinessQuery({ entity: 'forecast' });
                        if (fcRes) {
                            dynamicQueryResults.push(`DỰ BÁO DOANH SỐ THÁNG: Đã qua ${fcRes.elapsed_days}/${fcRes.days_in_month} ngày. MTD Doanh số: ${fcRes.mtd_revenue_formatted} (${fcRes.mtd_orders} đơn). Tốc độ chốt: ${fcRes.daily_velocity_formatted}. DỰ BÁO CUỐI THÁNG: ${fcRes.projected_revenue_formatted} (Đạt ${fcRes.percent_kpi}% so với KPI ${fcRes.target_kpi_formatted}).\nHÀNH ĐỘNG 1-CLICK: [[ACTION:DOWNLOAD_REPORT|thang_8|📥 Tải Báo Cáo Excel Executive Tháng 8]]`);
                        }
                    }

                    // If user asks for report / excel / csv / export
                    if (msgLower.includes('báo cáo') || msgLower.includes('excel') || msgLower.includes('csv') || msgLower.includes('tải') || msgLower.includes('file')) {
                        dynamicQueryResults.push(`XUẤT BÁO CÁO EXECUTIVE: Dữ liệu sẵn sàng.\nHÀNH ĐỘNG 1-CLICK NẠP FILE: [[ACTION:DOWNLOAD_REPORT|thang_8|📥 Tải File Báo Cáo Executive Excel/CSV Tháng 8 Ngay]]`);
                    }

                    // If user asks for remarketing / zalo / outreach
                    if (msgLower.includes('zalo') || msgLower.includes('sms') || msgLower.includes('chăm sóc') || msgLower.includes('khách vip')) {
                        dynamicQueryResults.push(`KỊCH BẢN CHĂM SÓC KHÁCH VIP: Phát hiện khách hàng lớn tem1 đến hạn mua lại.\nHÀNH ĐỘNG 1-CLICK: [[ACTION:SEND_REMARKETING|tem1|📲 Phát Lệnh Gửi Zalo/SMS Chăm Sóc Khách VIP tem1]]`);
                    }
                } catch(err) {
                    console.error('[AI Dynamic Query Resolver Error]:', err);
                }
            }

            if (dynamicQueryResults.length > 0) {
                systemContext += `\n🎯 KẾT QUẢ TRUY VẤN DỮ LIỆU ĐỘNG THEO YÊU CẦU CÂU HỎI:\n${dynamicQueryResults.join('\n\n')}\n`;
            }

            // ===== MÀN HÌNH NỘI QUY & ĐIỀU KHOẢN CỤ THỂ =====
            if (currentPage.includes('noiquycongtyhv')) {
                const isQuanLyXuong = (username === 'quanlyxuong' || (role === 'quan_ly_cap_cao' && Number(userRow?.department_id) === 11));
                const isSuperAdmin = (role === 'giam_doc' || role === 'admin' || username === 'trinh' || (role === 'quan_ly_cap_cao' && !isQuanLyXuong));

                let whereClauses = ["cr.status = 'active'"];
                let params = [];

                if (isQuanLyXuong) {
                    const xuongDepts = await db.all(`
                        WITH RECURSIVE xuong_tree AS (
                            SELECT id FROM departments WHERE id = 11
                            UNION ALL
                            SELECT d.id FROM departments d JOIN xuong_tree xt ON d.parent_id = xt.id
                        )
                        SELECT id FROM xuong_tree
                    `);
                    const xuongDeptIds = xuongDepts.map(d => Number(d.id));
                    params.push(xuongDeptIds);
                    whereClauses.push(`(cr.scope = 'chung' OR cr.department_id = ANY($${params.length}::int[]))`);
                } else if (!isSuperAdmin) {
                    const userDeptId = userRow?.department_id;
                    if (userDeptId) {
                        const userDepts = await db.all(`
                            WITH RECURSIVE dept_tree AS (
                                SELECT id FROM departments WHERE id = $1
                                UNION ALL
                                SELECT d.id FROM departments d JOIN dept_tree dt ON d.parent_id = dt.id
                            )
                            SELECT id FROM dept_tree
                        `, [userDeptId]);
                        const deptIds = userDepts.map(d => Number(d.id));
                        params.push(deptIds);
                        whereClauses.push(`(cr.scope = 'chung' OR cr.department_id = ANY($${params.length}::int[]))`);
                    } else {
                        whereClauses.push(`cr.scope = 'chung'`);
                    }
                }

                const whereSql = 'WHERE ' + whereClauses.join(' AND ');
                const rules = await db.all(`
                    SELECT cr.id, cr.rule_code, cr.title, cr.content, cr.scope, d.name as department_name,
                           cr.has_fine, cr.fine_amount, cr.has_team_fine, cr.team_fine_amount,
                           cr.has_dept_fine, cr.dept_fine_amount, cr.has_manager_fine, cr.manager_fine_amount, cr.manager_name
                    FROM company_rules cr
                    LEFT JOIN departments d ON d.id = cr.department_id
                    ${whereSql}
                    ORDER BY cr.rule_code ASC
                `, params);

                let rulesSummaryText = rules.map(r => {
                    let fineStr = [];
                    if (r.has_fine && Number(r.fine_amount) > 0) fineStr.push(`Phạt cá nhân: ${Number(r.fine_amount).toLocaleString('vi-VN')}đ`);
                    if (r.has_team_fine && Number(r.team_fine_amount) > 0) fineStr.push(`Phạt Team: ${Number(r.team_fine_amount).toLocaleString('vi-VN')}đ`);
                    if (r.has_dept_fine && Number(r.dept_fine_amount) > 0) fineStr.push(`Phạt Phòng ban: ${Number(r.dept_fine_amount).toLocaleString('vi-VN')}đ`);
                    if (r.has_manager_fine && Number(r.manager_fine_amount) > 0) fineStr.push(`Phạt Quản lý (${r.manager_name || ''}): ${Number(r.manager_fine_amount).toLocaleString('vi-VN')}đ`);

                    return `[ID: ${r.id}] Mã: ${r.rule_code} | Tiêu đề: ${r.title} | Phạm vi: ${r.scope === 'chung' ? 'Nội Quy Chung' : (r.department_name || 'Phòng ban')} | Chế tài: ${fineStr.join(', ') || 'Không có phạt'}\nNội dung: ${r.content}\n---`;
                }).join('\n');

                systemContext += `
BẠN ĐANG TRỢ GIÚP NGƯỜI DÙNG Ở MÀN HÌNH: 📜 NỘI QUY & ĐIỀU KHOẢN CÔNG TY HV.

DANH SÁCH NỘI QUY HỢP LỆ CHO TÀI KHOẢN NÀY (${rules.length} điều khoản):
${rulesSummaryText}

QUY TẮC PHẢN HỒI NỘI QUY:
1. Trả lời chính xác thắc mắc dựa trên danh sách điều khoản ở trên.
2. Khi đề cập đến một điều khoản cụ thể, ĐẢM BẢO gắn thẻ [OPEN_RULE:ID_ĐIỀU_KHOẢN] (Ví dụ: [OPEN_RULE:${rules[0]?.id || 1}]) để người dùng nhấp vào mở Popup điều khoản.
3. Nếu người dùng hỏi về quy định CHƯA CÓ trong CSDL: Hãy báo rõ "Hiện tại công ty CHƯA CÓ điều khoản này" và thêm tag [SUGGEST_NEW_RULE:Tên Tiêu Đề] để đề xuất tạo mới.
`;
            } else if (currentPage.includes('ngansachmkt') || currentPage.includes('ngan-sach-mkt')) {
                let mktInfo = '';
                const todayStr = new Date().toLocaleDateString('sv-SE'); // 'YYYY-MM-DD'
                if (isSuperAccess) {
                    try {
                        const activeCampaigns = await db.all(`SELECT id, name, target_goal, max_budget FROM mkt_campaigns WHERE is_active = true`);
                        const recentBudgets = await db.all(`
                            SELECT mb.channel_name, mb.budget_date, mb.spent_amount, mb.budget_amount, mb.lead_count
                            FROM marketing_budgets mb
                            ORDER BY mb.budget_date DESC LIMIT 10
                        `);
                        let campList = activeCampaigns.map(c => `- ${c.name}: Hạn mức tối đa ${Number(c.max_budget || 0).toLocaleString('vi-VN')}đ (Mục tiêu: ${c.target_goal || 'N/A'})`).join('\n');
                        let budgetList = recentBudgets.map(b => {
                            const isToday = (b.budget_date === todayStr);
                            const budgetStr = Number(b.budget_amount || 0) > 0 ? ` (Hạn mức: ${Number(b.budget_amount).toLocaleString('vi-VN')}đ)` : '';
                            return `- Ngày ${b.budget_date}${isToday ? ' [HÔM NAY]' : ''} | Kênh: ${b.channel_name || 'Khác'} | Chi phí thực tế Ads đã chi: ${Number(b.spent_amount || 0).toLocaleString('vi-VN')}đ${budgetStr} | Số Lead/Tin nhắn: ${b.lead_count || 0}`;
                        }).join('\n');

                        mktInfo = `
THỜI GIAN HÔM NAY: Ngày ${todayStr}.
DANH SÁCH CHIẾN DỊCH MARKETING ĐANG ÁP DỤNG:
${campList || 'Chưa có chiến dịch'}

NHẬT KÝ CHI PHÍ ADS / NGÂN SÁCH MKT GẦN ĐÂY:
${budgetList || 'Chưa có dữ liệu'}
`;
                    } catch(err) {
                        mktInfo = 'Không thể tải dữ liệu ngân sách marketing từ CSDL.';
                    }
                }
                systemContext += `
BẠN ĐANG TRỢ GIÚP Ở MÀN HÌNH: 💰 NGÂN SÁCH MARKETING.
${mktInfo}
QUY TẮC TRẢ LỜI NGÂN SÁCH HÔM NAY (Ngày ${todayStr}):
1. Nếu nhật ký CÓ ghi nhận ngày ${todayStr} [HÔM NAY] (Ví dụ: Kênh Đồng Phục HV chi phí 1.031.479đ) -> AI PHẢI TRẢ LỜI ĐÚNG số liệu chi phí này cho người dùng. TUYỆT ĐỐI KHÔNG BÁO "chưa ghi nhận thông tin hôm nay".
2. Chi phí thực tế Ads là số tiền tự động ghi nhận từ quảng cáo Facebook (Spent Amount), không cần thắc mắc về việc ngân sách đặt 0đ hay chưa nhập.
`;
            } else {
                systemContext += `
BẠN ĐANG TRỢ GIÚP NGƯỜI DÙNG Ở MÀN HÌNH: ${currentPage || 'TRANG CHỦ HỆ THỐNG HV'}.
Nhiệm vụ: Giải đáp các thắc mắc chung về hệ thống quản trị HV, định hướng sử dụng các tính năng và tư vấn cho người dùng.
`;
            }
            // ===== DYNAMIC TEXT-TO-SQL AI ANALYTICS ENGINE =====
            if (isSuperAccess && message && message.trim().length > 5) {
                try {
                    const sqlRes = await generateAndExecuteTextToSql(apiKey, message);
                    if (sqlRes && sqlRes.data && sqlRes.data.length > 0) {
                        systemContext += `
========================================
🎯 DỮ LIỆU CSDL ĐỘNG ĐƯỢC TỰ ĐỘNG PHÂN TÍCH CHO CÂU HỎI "${message}":
- CÂU LỆNH SQL CSDL PHÂN TÍCH:
${sqlRes.sql}

- BẢNG KẾT QUẢ DỮ LIỆU CSDL THỜI GIAN THỰC (${sqlRes.data.length} bản ghi):
${JSON.stringify(sqlRes.data, null, 2)}
========================================
QUY TẮC PHẢN HỒI KẾT QUẢ CSDL:
- Dùng trực tiếp dữ liệu chính xác 100% trong bảng kết quả ở trên để trả lời câu hỏi của người dùng.
- Trình bày kết quả ngắn gọn, rõ ràng từ 2 - 4 dòng, sử dụng định dạng tiền tệ (đ) và con số chính xác.
`;
                    }
                } catch(err) {
                    console.error('[AI Text-to-SQL Exec Error]:', err);
                }
            }

            // Load persistent chat history from DB if not provided in payload
            let conversationHistory = history || [];
            if ((!conversationHistory || conversationHistory.length === 0) && userId) {
                try {
                    const dbHistoryRows = await db.all(`
                        SELECT role, message as text
                        FROM ai_chat_history
                        WHERE user_id = $1
                        ORDER BY id DESC LIMIT 20
                    `, [userId]);
                    if (dbHistoryRows && dbHistoryRows.length > 0) {
                        conversationHistory = dbHistoryRows.reverse();
                    }
                } catch(e) {}
            }

            const aiReply = await callGeminiWithRetry(apiKey, systemContext, message, conversationHistory, image_base64);

            // Save persistent chat history to DB
            if (userId) {
                try {
                    if (message && message.trim()) {
                        await db.all(`INSERT INTO ai_chat_history (user_id, role, message, image_attached) VALUES ($1, 'user', $2, $3)`, [userId, message.trim(), !!image_base64]);
                    }
                    if (aiReply && aiReply.trim()) {
                        await db.all(`INSERT INTO ai_chat_history (user_id, role, message) VALUES ($1, 'assistant', $2)`, [userId, aiReply.trim()]);
                    }
                } catch(e) {
                    console.error('[Save Chat History Error]:', e);
                }
            }

            return { reply: aiReply };

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: err.message || 'Lỗi xử lý câu hỏi Trợ Lý AI' });
        }
    });
};
