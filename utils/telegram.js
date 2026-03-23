// ========== TELEGRAM BOT UTILITY ==========
const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

/**
 * Send a message to a Telegram chat/group
 * @param {string} chatId - Telegram chat ID or group ID
 * @param {string} message - Message text (supports HTML parse mode)
 * @returns {Promise<boolean>}
 */
async function sendTelegramMessage(chatId, message) {
    if (!TELEGRAM_BOT_TOKEN || !chatId) {
        console.log('[Telegram] Skipped (no token or chatId):', message);
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
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
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

module.exports = { sendTelegramMessage, broadcastTelegram };
