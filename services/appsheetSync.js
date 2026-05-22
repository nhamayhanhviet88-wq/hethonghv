// ========== APPSHEET SYNC — Sync payment_records → AppSheet NKy ==========
const https = require('https');
const db = require('../db/pool');

const APPSHEET_URL = 'https://api.appsheet.com/api/v2/apps/e9a7435c-a328-4c79-88f5-4cca0b1dc237/tables/NKy/Action?applicationAccessKey=V2-IfAm1-lAxLc-ecP0P-8M4Zb-cMNbq-3Et5Z-umnY0-L3Hfh';

// ========== HELPERS ==========
function _formatDate(dateStr) {
    if (!dateStr) return '';
    const s = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
    return s.split('T')[0]; // YYYY-MM-DD
}

// Map CRM bank_name → AppSheet "Ngân hàng" enum value
const BANK_MAPPING = {
    'Sacombank': 'SACOM',
    'ACB Công Ty': 'ACB',
    'ACB': 'ACB',
    'ABC cá nhân': 'ABC cá nhân',
    'PGBank': 'PGBank',
};

function _mapBank(bankName) {
    return BANK_MAPPING[bankName] || bankName || '';
}

function _postJSON(url, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: responseData });
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(new Error('Timeout 15s')); });
        req.write(body);
        req.end();
    });
}

// ========== MAIN SYNC ==========
async function syncToAppSheet(record) {
    const payload = {
        "Action": "Add",
        "Rows": [{
            "KEY": record.payment_code,
            "Ngày": _formatDate(record.date),
            "Loại": "THU",
            "PT thanh toán": "CK",
            "Nguồn": "Khách hàng",
            "Tiền": String(Math.round(Number(record.amount)) / 1000),
            "Ngân hàng": _mapBank(record.bank_name),
            "Nội dung": record.description || '',
            "Người ghi nhận": "Mail"
        }]
    };

    console.log(`[AppSheet] 📤 Sending:`, JSON.stringify(payload));
    const res = await _postJSON(APPSHEET_URL, payload);

    if (res.ok) return true;

    // KEY duplicate → treat as already synced
    if (res.status === 409 || (res.body && (res.body.includes('duplicate') || res.body.includes('already exists')))) {
        console.log(`[AppSheet] ⚠️ KEY duplicate ${record.payment_code} — marked as synced`);
        return true;
    }

    throw new Error(`HTTP ${res.status}: ${(res.body || '').substring(0, 500)}`);
}

// ========== CONFIG CHECK ==========
async function isAppSheetSyncEnabled() {
    try {
        const row = await db.get("SELECT value FROM app_config WHERE key = 'appsheet_sync_enabled'");
        return row?.value === 'true';
    } catch { return false; }
}

// ========== RETRY FAILED NOTIFICATIONS ==========
// Retries BOTH Telegram and AppSheet for records that failed initial send
// Uses atomic claim (UPDATE RETURNING) — only ONE process can retry each record
// NEVER rolls back — if claimed, stays claimed (prevents infinite loops)
async function retryFailedSync() {
    const { sendTelegramMessage } = require('../utils/telegram');
    try {
        // Find records needing retry (either Telegram or AppSheet unsent)
        const failed = await db.all(
            `SELECT id, payment_code, payment_date, amount, bank_name, transfer_note,
                    telegram_sent, appsheet_synced
             FROM payment_records
             WHERE source = 'email_auto'
               AND (telegram_sent = false OR appsheet_synced = false)
               AND created_at < NOW() - INTERVAL '3 minutes'
             ORDER BY id ASC LIMIT 10`
        );
        if (!failed.length) return;
        console.log(`[Retry] 🔄 ${failed.length} records need retry`);

        // Read Telegram group config once
        let tgGroup = null;
        try {
            const row = await db.get("SELECT value FROM app_config WHERE key = 'tg_payment_notify_group'");
            tgGroup = row?.value?.trim() || null;
        } catch {}

        for (const r of failed) {
            // ── Retry Telegram ──
            if (!r.telegram_sent) {
                const claimed = await db.get(
                    `UPDATE payment_records SET telegram_sent = true
                     WHERE id = $1 AND telegram_sent = false
                     RETURNING id`, [r.id]
                );
                if (claimed && tgGroup) {
                    try {
                        const fmtAmt = Number(r.amount).toLocaleString('vi-VN');
                        const tgMsg = `🏦${r.payment_code} : ${fmtAmt}đ ${r.bank_name} ${(r.transfer_note || '').substring(0, 100)}`;
                        await sendTelegramMessage(tgGroup, tgMsg);
                        console.log(`[Retry TG] ✅ ${r.payment_code}`);
                    } catch (e) {
                        // Keep telegram_sent=true — do NOT retry endlessly
                        console.error(`[Retry TG] ❌ ${r.payment_code} (giving up):`, e.message);
                    }
                }
            }

            // ── Retry AppSheet ──
            if (!r.appsheet_synced) {
                const claimed = await db.get(
                    `UPDATE payment_records SET appsheet_synced = true
                     WHERE id = $1 AND appsheet_synced = false
                     RETURNING id`, [r.id]
                );
                if (claimed) {
                    try {
                        const dateStr = r.payment_date instanceof Date
                            ? r.payment_date.toISOString().split('T')[0]
                            : String(r.payment_date).split('T')[0];
                        await syncToAppSheet({
                            payment_code: r.payment_code,
                            date: dateStr,
                            amount: r.amount,
                            bank_name: r.bank_name,
                            description: r.transfer_note
                        });
                        console.log(`[Retry AppSheet] ✅ ${r.payment_code}`);
                    } catch (e) {
                        // Keep appsheet_synced=true — do NOT retry endlessly
                        console.error(`[Retry AppSheet] ❌ ${r.payment_code} (giving up):`, e.message);
                    }
                }
            }
        }
    } catch (e) {
        console.error('[Retry] Error:', e.message);
    }
}

module.exports = { syncToAppSheet, isAppSheetSyncEnabled, retryFailedSync };
