// ========== TELEGRAM BOT UTILITY ==========
const https = require('https');
const db = require('../db/pool');

// ========== EVENT REGISTRY ==========
// scope: 'global' = 1 Group ID cho tất cả NV (lưu app_config)
// scope: 'per_staff' = mỗi NV có Group ID riêng (lưu bảng telegram_notifications)
const TELEGRAM_EVENTS = [
    // === GLOBAL: Cài 1 Group ID, áp dụng tất cả NV ===
    { key: 'cap_cuu_sep',      label: '🚨 Cấp Cứu Sếp',        scope: 'global',    icon: '🚨' },
    { key: 'huy_khach',        label: '❌ Hủy Khách',            scope: 'global',    icon: '❌' },
    { key: 'huy_don_tra_coc',  label: '🚫 Hủy Đơn Trả Cọc',    scope: 'global',    icon: '🚫' },
    { key: 'hoan_thanh_may',  label: '✅ Hoàn Thành May (QC)',  scope: 'global',    icon: '✅' },
    { key: 'hoan_thanh_hoan_thien', label: '✅ Hoàn Thành Hoàn Thiện', scope: 'global', icon: '✅' },
    { key: 'hoan_vai', label: '🔄 Hoàn Vải', scope: 'global', icon: '🔄' },

    // === PER-STAFF: Mỗi NV cài Group ID riêng ===
    { key: 'chuyen_so',        label: '📱 Chuyển Số',            scope: 'per_staff', icon: '📱' },
    { key: 'gui_lai_so',       label: '🔄 Gửi Lại Số',          scope: 'per_staff', icon: '🔄' },
    // (thêm loại per_staff khác sau...)
];

// ========== BOT TOKEN CACHE ==========
let _cachedToken = null;
let _tokenExpiry = 0;
const TOKEN_CACHE_MS = 5 * 60 * 1000; // 5 phút

async function getBotToken() {
    if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;
    try {
        const row = await db.get("SELECT value FROM app_config WHERE key = 'telegram_bot_token'");
        _cachedToken = (row?.value || '').trim() || process.env.TELEGRAM_BOT_TOKEN || '';
        _tokenExpiry = Date.now() + TOKEN_CACHE_MS;
    } catch (e) {
        _cachedToken = process.env.TELEGRAM_BOT_TOKEN || '';
        _tokenExpiry = Date.now() + 30000; // retry sau 30s nếu lỗi
    }
    return _cachedToken;
}

// Xóa cache khi GĐ cập nhật token mới
function clearTokenCache() {
    _cachedToken = null;
    _tokenExpiry = 0;
}

/**
 * Send a message to a Telegram chat/group
 * @param {string} chatId - Telegram chat ID or group ID
 * @param {string} message - Message text (supports HTML parse mode)
 * @param {string} [token] - Optional custom token (otherwise reads from cache)
 * @returns {Promise<boolean>}
 */
async function sendTelegramMessage(chatId, message, token) {
    const botToken = token || await getBotToken();
    if (!botToken || !chatId) {
        console.log('[Telegram] Skipped (no token or chatId):', message?.substring(0, 80));
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
                    console.log('[Telegram] ✅ Sent to', chatId);
                    resolve(true);
                } else {
                    console.log('[Telegram] ❌ Error:', body);
                    resolve(false);
                }
            });
        });

        req.on('error', (err) => {
            console.log('[Telegram] ❌ Request error:', err.message);
            resolve(false);
        });

        req.write(data);
        req.end();
    });
}

/**
 * Send notification to multiple groups
 * @param {string[]} chatIds - Array of chat IDs
 * @param {string} message - Message text
 */
async function broadcastTelegram(chatIds, message) {
    const uniqueIds = [...new Set(chatIds.filter(Boolean))];
    for (const id of uniqueIds) {
        await sendTelegramMessage(id, message);
    }
}

/**
 * ★ SMART NOTIFY — Gửi thông báo theo event type
 * - Global event → đọc từ app_config (tg_global_xxx)
 * - Per-staff event → đọc từ telegram_notifications, fallback users.telegram_group_id
 *
 * @param {number|null} userId - ID nhân viên liên quan (null cho global-only events)
 * @param {string} eventType - Key trong TELEGRAM_EVENTS (e.g. 'chuyen_so', 'cap_cuu_sep')
 * @param {string} message - Nội dung tin nhắn HTML
 */
async function notifyTelegram(userId, eventType, message) {
    const token = await getBotToken();
    if (!token) return;

    const event = TELEGRAM_EVENTS.find(e => e.key === eventType);
    if (!event) {
        console.log('[Telegram] ⚠️ Unknown event type:', eventType);
        return;
    }

    const targets = new Set();

    if (event.scope === 'global') {
        // ★ GLOBAL: đọc từ app_config
        try {
            const row = await db.get(
                "SELECT value FROM app_config WHERE key = $1",
                [`tg_global_${eventType}`]
            );
            if (row?.value?.trim()) targets.add(row.value.trim());
        } catch (e) {
            console.log('[Telegram] ⚠️ Global config read error:', e.message);
        }
    } else if (event.scope === 'per_staff' && userId) {
        // ★ PER-STAFF: đọc từ bảng telegram_notifications
        try {
            const row = await db.get(
                'SELECT chat_id FROM telegram_notifications WHERE user_id = $1 AND event_type = $2 AND enabled = true',
                [userId, eventType]
            );
            if (row?.chat_id?.trim()) {
                targets.add(row.chat_id.trim());
            } else {
                // Fallback: cột cũ telegram_group_id
                const user = await db.get('SELECT telegram_group_id FROM users WHERE id = $1', [userId]);
                if (user?.telegram_group_id?.trim()) targets.add(user.telegram_group_id.trim());
            }
        } catch (e) {
            console.log('[Telegram] ⚠️ Per-staff config read error:', e.message);
            // Fallback: cột cũ
            try {
                const user = await db.get('SELECT telegram_group_id FROM users WHERE id = $1', [userId]);
                if (user?.telegram_group_id?.trim()) targets.add(user.telegram_group_id.trim());
            } catch (e2) { /* ignore */ }
        }
    }

    // Gửi (deduplicated)
    for (const chatId of targets) {
        await sendTelegramMessage(chatId, message, token);
    }
}

/**
 * Send a photo to Telegram chat/group
 * @param {string} chatId
 * @param {string} filePath - Absolute path to image file on disk
 * @param {string} caption - Caption text
 */
async function sendTelegramPhoto(chatId, filePath, caption) {
    const botToken = await getBotToken();
    if (!botToken || !chatId) return false;
    const fs = require('fs');
    const path = require('path');
    if (!fs.existsSync(filePath)) {
        console.log('[Telegram] ⚠️ Photo file not found:', filePath);
        return false;
    }
    const boundary = '----TgBoundary' + Date.now();
    const fileData = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const CRLF = '\r\n';

    // Build parts as array of Buffers to avoid encoding issues with HTML in caption
    const parts = [];

    // chat_id
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="chat_id"${CRLF}${CRLF}${chatId}${CRLF}`));

    // parse_mode
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="parse_mode"${CRLF}${CRLF}HTML${CRLF}`));

    // caption (use UTF-8 buffer to preserve <b> tags and special chars)
    if (caption) {
        parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="caption"${CRLF}${CRLF}`, 'utf8'));
        parts.push(Buffer.from(caption, 'utf8'));
        parts.push(Buffer.from(CRLF, 'utf8'));
    }

    // photo file
    parts.push(Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="photo"; filename="${fileName}"${CRLF}Content-Type: image/png${CRLF}${CRLF}`));
    parts.push(fileData);
    parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`));

    const payload = Buffer.concat(parts);

    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'api.telegram.org', port: 443,
            path: `/bot${botToken}/sendPhoto`, method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': payload.length }
        }, (res) => {
            let b = ''; res.on('data', c => b += c);
            res.on('end', () => {
                if (res.statusCode === 200) { console.log('[Telegram] ✅ Photo sent to', chatId); resolve(true); }
                else { console.log('[Telegram] ❌ Photo error:', b); resolve(false); }
            });
        });
        req.on('error', (err) => { console.log('[Telegram] ❌ Photo request error:', err.message); resolve(false); });
        req.write(payload);
        req.end();
    });
}

module.exports = {
    TELEGRAM_EVENTS,
    sendTelegramMessage,
    sendTelegramPhoto,
    broadcastTelegram,
    notifyTelegram,
    getBotToken,
    clearTokenCache
};
