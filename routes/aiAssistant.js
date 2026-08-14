const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const https = require('https');

async function callSingleModel(modelName, apiKey, systemPrompt, userMessage, history = []) {
    return new Promise((resolve, reject) => {
        const contents = [];

        // System prompt context
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

        // Current message
        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
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

async function callGeminiWithRetry(apiKey, systemPrompt, userMessage, history = []) {
    const model = 'gemini-2.5-flash';
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const reply = await callSingleModel(model, apiKey, systemPrompt, userMessage, history);
            return reply;
        } catch (err) {
            console.warn(`[AI Retry ${attempt}/3] Model ${model} failed (${err.message})...`);
            lastError = err;
            if (attempt < 3) {
                await new Promise(r => setTimeout(r, 600));
            }
        }
    }
    throw new Error('Máy chủ Google AI đang có lưu lượng truy cập cao trong giây lát. Vui lòng bấm Gửi lại sau ít giây.');
}

module.exports = async function (fastify, opts) {

    // Ensure system_settings table exists
    try {
        await db.all(`
            CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch(e) {}

    // GET /api/ai-assistant/config - Kiểm tra trạng thái API Key
    fastify.get('/api/ai-assistant/config', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            let keyRow = await db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'`);
            const hasKey = !!(keyRow?.setting_value || process.env.GEMINI_API_KEY);
            return { has_key: hasKey };
        } catch (e) {
            return { has_key: false };
        }
    });

    // POST /api/ai-assistant/config - Lưu API Key (Chỉ Admin/Giám Đốc)
    fastify.post('/api/ai-assistant/config', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            const role = req.user?.role;
            if (role !== 'giam_doc' && role !== 'admin') {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc và Admin mới có quyền cấu hình API Key' });
            }

            const { api_key } = req.body || {};
            if (!api_key || !api_key.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập API Key hợp lệ' });
            }

            const cleanKey = api_key.trim();
            await db.all(`
                INSERT INTO system_settings (setting_key, setting_value, updated_at)
                VALUES ('gemini_api_key', $1, NOW())
                ON CONFLICT (setting_key) 
                DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
            `, [cleanKey]);

            return { success: true, message: 'Đã lưu Gemini API Key thành công' };
        } catch (e) {
            req.log.error(e);
            return reply.code(500).send({ error: 'Lỗi lưu cấu hình API Key' });
        }
    });

    // POST /api/ai-assistant/chat - Hỏi đáp Trợ Lý AI
    fastify.post('/api/ai-assistant/chat', { preHandler: [authenticate] }, async (req, reply) => {
        try {
            let keyRow = await db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'`);
            const apiKey = keyRow?.setting_value || process.env.GEMINI_API_KEY;

            if (!apiKey) {
                return reply.code(400).send({
                    error: 'MISSING_API_KEY',
                    message: 'Hệ thống chưa cấu hình Gemini API Key. Vui lòng nhờ Ban Giám Đốc bấm nút ⚙️ Cấu Hình API Key để dán mã khóa AI Studio.'
                });
            }

            const { message, page, history } = req.body || {};
            if (!message || !message.trim()) {
                return reply.code(400).send({ error: 'Vui lòng nhập nội dung câu hỏi' });
            }

            // Fetch user identity & role
            const userId = req.user?.id;
            let userRow = null;
            if (userId) {
                userRow = await db.get('SELECT id, role, department_id, username FROM users WHERE id = $1', [userId]);
            }

            const role = userRow ? userRow.role : (req.user?.role || '');
            const isExecutive = (role === 'giam_doc' || role === 'admin');

            const currentPage = page || '';
            let systemContext = `Bạn là Trợ Lý AI Hệ Thống HV - Trợ lý thông minh hỗ trợ nhân viên & quản lý công ty HV. Trả lời bằng tiếng Việt chuyên nghiệp, lịch sự, phân đoạn rõ ràng, súc tích.

QUY TẮC BẢO MẬT & PHÂN QUYỀN VAI TRÒ:
- Người dùng hiện tại có vai trò: ${isExecutive ? 'BAN GIÁM ĐỐC / ADMIN (Quyền truy cập cao nhất)' : 'NHÂN VIÊN / QUẢN LÝ PHÒNG BAN (Không có quyền xem Các Chỉ Số Tổng Quan Giám Đốc)'}.
- VỀ MÀN HÌNH "CÁC CHỈ SỐ TỔNG QUAN GIÁM ĐỐC": Báo cáo này chứa thông tin doanh số tổng công ty, chi phí Marketing Ads và bức tranh tài chính cấp cao.
  + NẾU NGƯỜI DÙNG KHÔNG PHẢI GIÁM ĐỐC/ADMIN (${!isExecutive ? 'Đúng trường hợp hiện tại' : ''}): Khi người dùng hỏi về số liệu Các Chỉ Số Tổng Quan Giám Đốc hay Doanh số tổng/Chi phí Ads MKT, hãy LỊCH SỰ TỪ CHỐN VÀ THÔNG BÁO: "Xin lỗi Anh/Chị! Báo cáo Các Chỉ Số Tổng Quan Giám Đốc chứa dữ liệu tài chính cấp cao thuộc thẩm quyền Ban Giám Đốc. Tài khoản của Anh/Chị không được phân quyền menu này nên tôi không thể cung cấp số liệu chi tiết. Anh/Chị có thể tra cứu thông tin KPI Sale / Nội Quy & Điều Khoản mà tài khoản của mình có quyền sử dụng ạ."
  + NẾU NGƯỜI DÙNG LÀ GIÁM ĐỐC/ADMIN (${isExecutive ? 'Đúng trường hợp hiện tại' : ''}): Trả lời chi tiết và đầy đủ các chỉ số tài chính tổng quan.
`;

            // ===== 1. TRANG CÁC CHỈ SỐ TỔNG QUAN GIÁM ĐỐC =====
            if (currentPage.includes('cacchisotongquan') || currentPage.includes('kpimarketing') || currentPage.includes('overview')) {
                if (isExecutive) {
                    systemContext += `
BẠN ĐANG TRỢ GIÚP BAN GIÁM ĐỐC/ADMIN Ở MÀN HÌNH: 📊 CÁC CHỈ SỐ TỔNG QUAN GIÁM ĐỐC / MARKETING OVERVIEW.
DỮ LIỆU BÁO CÁO THÁNG 8/2026:
- Tổng Doanh Số Chốt: 138.160.742đ (Đồng Phục: 9 đơn - 138.160.742đ; Tem PET: 13 đơn; Tổng Cty: 341.518.934đ - 22 đơn)
- Giá / Đơn trung bình (CPD): 8.025.486đ / đơn
- Chi phí Quảng cáo Ads MKT: 49.780.000đ (Chi phí/DT Ads: 145.1%)
- Giá Ads / Lead (CPL): 68.464đ / Lead | Tỷ lệ % chốt tổng thể: 0.85% (Tỷ lệ chốt Ads: 0.38%) | Tỷ lệ Khách cũ: 6.94%
`;
                } else {
                    systemContext += `
BẠN ĐANG TRỢ GIÚP NHÂN VIÊN KHÔNG CÓ QUYỀN XEM BÁO CÁO GIÁM ĐỐC. Hãy lịch sự từ chối cung cấp các con số tài chính tổng quan.
`;
                }
            } 
            // ===== 2. TRANG NỘI QUY & ĐIỀU KHOẢN =====
            else if (currentPage.includes('noiquycongtyhv')) {
                const uname = String(userRow?.username || req.user?.username || '').toLowerCase();
                const isQuanLyXuong = (uname === 'quanlyxuong' || (role === 'quan_ly_cap_cao' && Number(userRow?.department_id) === 11));
                const isSuperAdmin = (role === 'giam_doc' || role === 'admin' || (role === 'quan_ly_cap_cao' && !isQuanLyXuong));

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
            } else {
                systemContext += `
BẠN ĐANG TRỢ GIÚP NGƯỜI DÙNG Ở MÀN HÌNH: ${currentPage || 'TRANG CHỦ HỆ THỐNG HV'}.
Nhiệm vụ: Giải đáp các thắc mắc chung về hệ thống quản trị HV, định hướng sử dụng các tính năng và tư vấn cho người dùng.
`;
            }

            const aiReply = await callGeminiWithRetry(apiKey, systemContext, message, history);
            return { reply: aiReply };

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: err.message || 'Lỗi xử lý câu hỏi Trợ Lý AI' });
        }
    });
};
