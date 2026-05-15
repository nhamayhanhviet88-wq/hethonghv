// ========== APPSHEET SYNC — Sync payment_records → AppSheet NKy ==========
const https = require('https');
const db = require('../db/pool');

const APPSHEET_URL = 'https://api.appsheet.com/api/v2/apps/e9a7435c-a328-4c79-88f5-4cca0b1dc237/tables/NKy/Action?applicationAccessKey=V2-IfAm1-lAxLc-ecP0P-8M4Zb-cMNbq-3Et5Z-umnY0-L3Hfh';

// ========== HELPERS ==========
function _formatDateDDMMYYYY(dateStr) {
    if (!dateStr) return '';
    const s = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
    const parts = s.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
            "Ngày": _formatDateDDMMYYYY(record.date),
            "Loại": "THU",
            "PT thanh toán": "CK",
            "Nguồn": "Khách hàng",
            "Tiền": String(record.amount),
            "Ngân hàng": record.bank_name || '',
            "Nội dung": record.description || '',
            "Người ghi nhận": "Mail"
        }]
    };

    const res = await _postJSON(APPSHEET_URL, payload);

    if (res.ok) return true;

    // KEY duplicate → treat as already synced
    if (res.status === 409 || (res.body && (res.body.includes('duplicate') || res.body.includes('already exists')))) {
        console.log(`[AppSheet] ⚠️ KEY duplicate ${record.payment_code} — marked as synced`);
        return true;
    }

    throw new Error(`HTTP ${res.status}: ${(res.body || '').substring(0, 200)}`);
}

// ========== CONFIG CHECK ==========
async function isAppSheetSyncEnabled() {
    try {
        const row = await db.get("SELECT value FROM app_config WHERE key = 'appsheet_sync_enabled'");
        return row?.value === 'true';
    } catch { return false; }
}

// ========== RETRY FAILED ==========
async function retryFailedSync() {
    try {
        const failed = await db.all(
            `SELECT id, payment_code, payment_date, amount, bank_name, transfer_note
             FROM payment_records
             WHERE source = 'email_auto'
               AND (appsheet_synced IS NULL OR appsheet_synced = false)
             ORDER BY id DESC LIMIT 10`
        );
        if (!failed.length) return;
        console.log(`[AppSheet Retry] 🔄 ${failed.length} records to retry`);
        for (const r of failed) {
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
                await db.run('UPDATE payment_records SET appsheet_synced = true WHERE id = $1', [r.id]);
                console.log(`[AppSheet Retry] ✅ ${r.payment_code}`);
            } catch (e) {
                console.error(`[AppSheet Retry] ❌ ${r.payment_code}:`, e.message);
            }
        }
    } catch (e) {
        console.error('[AppSheet Retry] Error:', e.message);
    }
}

module.exports = { syncToAppSheet, isAppSheetSyncEnabled, retryFailedSync };
