// ========== PARTNER REGISTRATION — Public form → Telegram ==========
const db = require('../db/pool');
const https = require('https');
const { authenticate, requireRole } = require('../middleware/auth');

// ========== In-memory rate limiter ==========
const rateLimitMap = new Map(); // key: IP → { count, resetAt }
const RATE_LIMIT_MAX = 3;       // max 3 submissions per IP
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour window

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return true;
    }
    if (entry.count >= RATE_LIMIT_MAX) return false;
    entry.count++;
    return true;
}

// Cleanup old entries every 30 min
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
        if (now > entry.resetAt) rateLimitMap.delete(ip);
    }
}, 30 * 60 * 1000);

// ========== Send Telegram with custom bot token ==========
async function sendPartnerTelegram(botToken, chatId, message) {
    if (!botToken || !chatId) {
        console.log('[PartnerReg] Skipped Telegram (no token or chatId)');
        return false;
    }
    return new Promise((resolve) => {
        const data = JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('[PartnerReg] ✅ Telegram sent to', chatId);
                    resolve(true);
                } else {
                    console.log('[PartnerReg] ❌ Telegram error:', body);
                    resolve(false);
                }
            });
        });
        req.on('error', (err) => {
            console.log('[PartnerReg] ❌ Telegram request error:', err.message);
            resolve(false);
        });
        req.write(data);
        req.end();
    });
}

async function partnerRegistrationRoutes(fastify, options) {

    // ========== PUBLIC: Submit partner registration ==========
    fastify.post('/api/partner-registration', async (request, reply) => {
        const body = request.body || {};

        // --- Honeypot check ---
        if (body._website && body._website.trim() !== '') {
            // Bot detected — silently accept but don't process
            return { success: true, message: 'Đã gửi đăng ký thành công!' };
        }

        // --- Rate limit ---
        const clientIp = request.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || request.headers['x-real-ip']
            || request.ip;
        if (!checkRateLimit(clientIp)) {
            return reply.code(429).send({
                error: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ.'
            });
        }

        // --- Validate required fields ---
        const {
            ho_ten, sdt, dia_chi, cong_viec,
            ai_gioi_thieu, biet_tu_dau, biet_tu_dau_khac,
            nhan_vien_gioi_thieu, ly_do
        } = body;

        if (!ho_ten || !ho_ten.trim()) {
            return reply.code(400).send({ error: 'Vui lòng nhập Họ Tên' });
        }
        if (!sdt || !sdt.trim()) {
            return reply.code(400).send({ error: 'Vui lòng nhập Số Điện Thoại' });
        }
        // Validate phone format (Vietnamese phone: 10-11 digits)
        const phoneClean = sdt.trim().replace(/[\s\-\.]/g, '');
        if (!/^(0|\+84)\d{8,10}$/.test(phoneClean)) {
            return reply.code(400).send({ error: 'Số điện thoại không hợp lệ' });
        }
        if (!dia_chi || !dia_chi.trim()) {
            return reply.code(400).send({ error: 'Vui lòng nhập Địa Chỉ' });
        }
        if (!cong_viec || !cong_viec.trim()) {
            return reply.code(400).send({ error: 'Vui lòng nhập Công Việc hiện tại' });
        }
        if (!biet_tu_dau || !biet_tu_dau.trim()) {
            return reply.code(400).send({ error: 'Vui lòng chọn bạn biết tới Đồng Phục HV từ đâu' });
        }

        const validSources = [
            'Nhân Viên Gửi', 'Người Quen Giới Thiệu', 'Zalo',
            'Facebook', 'Mạng Xã Hội', 'Website', 'Khác'
        ];
        if (!validSources.includes(biet_tu_dau.trim())) {
            return reply.code(400).send({ error: 'Nguồn biết tới không hợp lệ' });
        }

        // If "Khác" → must have detail
        if (biet_tu_dau.trim() === 'Khác' && (!biet_tu_dau_khac || !biet_tu_dau_khac.trim())) {
            return reply.code(400).send({ error: 'Vui lòng nhập chi tiết bạn biết tới từ đâu' });
        }

        // If "Nhân Viên Gửi" → must have employee name
        if (biet_tu_dau.trim() === 'Nhân Viên Gửi' && (!nhan_vien_gioi_thieu || !nhan_vien_gioi_thieu.trim())) {
            return reply.code(400).send({ error: 'Vui lòng nhập tên Nhân Viên Giới Thiệu' });
        }

        if (!ly_do || !ly_do.trim()) {
            return reply.code(400).send({ error: 'Vui lòng nhập lý do bạn muốn làm đối tác' });
        }

        // --- Get Telegram config ---
        const botTokenRow = await db.get("SELECT value FROM app_config WHERE key = 'partner_reg_telegram_bot_token'");
        const chatIdRow = await db.get("SELECT value FROM app_config WHERE key = 'partner_reg_telegram_chat_id'");
        const botToken = botTokenRow?.value?.trim();
        const chatId = chatIdRow?.value?.trim();

        if (!botToken || !chatId) {
            console.log('[PartnerReg] ⚠️ Telegram not configured, skipping send');
            // Still accept the registration — just can't notify
        }

        // --- Auto-increment STT ---
        let stt = 1;
        try {
            const counterRow = await db.get("SELECT value FROM app_config WHERE key = 'partner_reg_counter'");
            if (counterRow && counterRow.value) {
                stt = parseInt(counterRow.value, 10) + 1;
            }
            await db.run(
                "INSERT INTO app_config (key, value, updated_at) VALUES ('partner_reg_counter', $1, NOW()) ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()",
                [String(stt)]
            );
        } catch (e) {
            console.error('[PartnerReg] Counter error:', e.message);
        }

        // --- Format STT ---
        const sttFormatted = String(stt).padStart(3, '0');
        const now = new Date();
        // Vietnam timezone (UTC+7)
        const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const day = String(vnNow.getUTCDate()).padStart(2, '0');
        const month = String(vnNow.getUTCMonth() + 1).padStart(2, '0');
        const year = vnNow.getUTCFullYear();

        // --- Build source display ---
        let sourceDisplay = biet_tu_dau.trim();
        if (biet_tu_dau.trim() === 'Khác' && biet_tu_dau_khac?.trim()) {
            sourceDisplay = `Khác — ${biet_tu_dau_khac.trim()}`;
        }

        // --- Build Telegram message ---
        const tgMsg = `📋 <b>${sttFormatted} - ${day} - ${month} - ${year}:</b>\n` +
            `<b>Đơn yêu cầu làm đối tác</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 Họ tên: <b>${ho_ten.trim()}</b>\n` +
            `📱 SĐT: <b>${sdt.trim()}</b>\n` +
            `📍 Địa chỉ: <b>${dia_chi.trim()}</b>\n` +
            `💼 Công Việc: <b>${cong_viec.trim()}</b>\n` +
            `🤝 Ai Giới Thiệu: ${ai_gioi_thieu?.trim() || '—'}\n` +
            `📢 Bạn biết tới Đối Tác Đồng Phục HV từ đâu: <b>${sourceDisplay}</b>\n` +
            `👨‍💼 Nhân Viên Giới Thiệu: ${nhan_vien_gioi_thieu?.trim() || '—'}\n` +
            `💡 Lý do muốn làm đối tác: ${ly_do.trim()}`;

        // --- Send Telegram ---
        if (botToken && chatId) {
            const sent = await sendPartnerTelegram(botToken, chatId, tgMsg);
            if (!sent) {
                console.log('[PartnerReg] ⚠️ Telegram send failed but accepting registration');
            }
        }

        return { success: true, message: 'Đăng ký đối tác thành công! Chúng tôi sẽ liên hệ bạn sớm nhất.' };
    });

    // ========== SETTINGS: GET (GĐ only) ==========
    fastify.get('/api/partner-registration/settings', {
        preHandler: [authenticate, requireRole('giam_doc')]
    }, async (request, reply) => {
        const botTokenRow = await db.get("SELECT value FROM app_config WHERE key = 'partner_reg_telegram_bot_token'");
        const chatIdRow = await db.get("SELECT value FROM app_config WHERE key = 'partner_reg_telegram_chat_id'");
        const counterRow = await db.get("SELECT value FROM app_config WHERE key = 'partner_reg_counter'");
        return {
            bot_token: botTokenRow?.value || '',
            chat_id: chatIdRow?.value || '',
            counter: counterRow?.value || '0'
        };
    });

    // ========== SETTINGS: SAVE (GĐ only) ==========
    fastify.put('/api/partner-registration/settings', {
        preHandler: [authenticate, requireRole('giam_doc')]
    }, async (request, reply) => {
        const { bot_token, chat_id } = request.body || {};

        if (typeof bot_token !== 'string' || typeof chat_id !== 'string') {
            return reply.code(400).send({ error: 'Thiếu bot_token hoặc chat_id' });
        }

        await db.run(
            "INSERT INTO app_config (key, value, updated_at) VALUES ('partner_reg_telegram_bot_token', $1, NOW()) ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()",
            [bot_token.trim()]
        );
        await db.run(
            "INSERT INTO app_config (key, value, updated_at) VALUES ('partner_reg_telegram_chat_id', $1, NOW()) ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()",
            [chat_id.trim()]
        );

        return { success: true, message: 'Đã lưu cấu hình Telegram cho Đăng Ký Đối Tác!' };
    });

    // ========== TEST: Send test message (GĐ only) ==========
    fastify.post('/api/partner-registration/test-telegram', {
        preHandler: [authenticate, requireRole('giam_doc')]
    }, async (request, reply) => {
        const botTokenRow = await db.get("SELECT value FROM app_config WHERE key = 'partner_reg_telegram_bot_token'");
        const chatIdRow = await db.get("SELECT value FROM app_config WHERE key = 'partner_reg_telegram_chat_id'");
        const botToken = botTokenRow?.value?.trim();
        const chatId = chatIdRow?.value?.trim();

        if (!botToken || !chatId) {
            return reply.code(400).send({ error: 'Chưa cấu hình Bot Token hoặc Chat ID' });
        }

        const testMsg = `🧪 <b>TEST - Đăng Ký Đối Tác</b>\n` +
            `Hệ thống đã kết nối thành công!\n` +
            `Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;

        const sent = await sendPartnerTelegram(botToken, chatId, testMsg);
        if (sent) {
            return { success: true, message: 'Đã gửi tin nhắn test thành công!' };
        }
        return reply.code(500).send({ error: 'Gửi tin nhắn test thất bại. Kiểm tra lại Bot Token và Chat ID.' });
    });
}

module.exports = partnerRegistrationRoutes;
