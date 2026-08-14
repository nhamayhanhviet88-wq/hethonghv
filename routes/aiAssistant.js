const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const https = require('https');

async function callGeminiAPI(apiKey, systemPrompt, userMessage, history = []) {
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
                maxOutputTokens: 1000
            }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

module.exports = async function (fastify, opts) {

    // Ensure system_settings table exists
    try {
        await db.query(`
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
            await db.query(`
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

            // Read context rules based on page
            let systemContext = `Bạn là Trợ Lý AI Hệ Thống HV - Trợ lý thông minh hỗ trợ nhân viên & quản lý công ty HV.`;

            // If query comes from noiquycongtyhv page
            if (!page || page.includes('noiquycongtyhv')) {
                // Fetch active rules visible to this user
                const userId = req.user?.id;
                let userRow = null;
                if (userId) {
                    userRow = await db.get('SELECT id, role, department_id, username FROM users WHERE id = $1', [userId]);
                }

                const role = userRow ? userRow.role : (req.user?.role || '');
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
DANH SÁCH NỘI QUY & ĐIỀU KHOẢN HIỆN CÓ TRONG CSDL CÔNG TY HV (Gồm ${rules.length} điều khoản):
${rulesSummaryText}

QUY TẮC PHẢN HỒI CỦA TRỢ LÝ AI NỘI QUY:
1. Trả lời chính xác thắc mắc dựa trên danh sách điều khoản trên.
2. Khi đề cập đến một điều khoản cụ thể, hãy ĐẢM BẢO thêm thẻ [OPEN_RULE:ID_ĐIỀU_KHOẢN] (Ví dụ: [OPEN_RULE:${rules[0]?.id || 1}]) để người dùng có thể nhấp chuột mở trực tiếp Popup điều khoản đó.
3. Nếu người dùng hỏi về một quy định/nội quy CHƯA CÓ trong CSDL:
   - Hãy nói rõ rằng: "Hiện tại công ty CHƯA CÓ điều khoản quy định về vấn đề này."
   - Đánh giá xem có nên bổ sung không. Nếu nên bổ sung, hãy thêm tag [SUGGEST_NEW_RULE:Tên Tiêu Đề Gợi Ý] ở cuối câu trả lời.
4. Giữ giọng văn thân thiện, chuyên nghiệp, hỗ trợ nhiệt tình.
`;
            }

            const aiReply = await callGeminiAPI(apiKey, systemContext, message, history);
            return { reply: aiReply };

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: err.message || 'Lỗi xử lý câu hỏi Trợ Lý AI' });
        }
    });
};
