// ========== EMAIL CHECKER — Auto-import bank emails → payment_records ==========
const { ImapFlow } = require('imapflow');
const db = require('../db/pool');
const crypto = require('crypto');

const ENC_KEY = (process.env.JWT_SECRET || 'fallback-key-32chars-long!!!!!!').slice(0, 32).padEnd(32, '0');
const ENC_IV = Buffer.alloc(16, 0);

function encrypt(text) {
    if (!text) return '';
    const cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, ENC_IV);
    return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}
function decrypt(hex) {
    if (!hex) return '';
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, ENC_IV);
        return decipher.update(hex, 'hex', 'utf8') + decipher.final('utf8');
    } catch { return ''; }
}

let cronTimer = null;
let isRunning = false;

// ========== MAIN CHECK ==========
async function checkEmails() {
    if (isRunning) return;
    isRunning = true;
    try {
        // 1) Read config
        const config = await db.get('SELECT * FROM email_import_config WHERE id = 1');
        if (!config || !config.is_active || !config.gmail_user || !config.gmail_pass) {
            isRunning = false;
            return;
        }

        const password = decrypt(config.gmail_pass);
        if (!password) { isRunning = false; return; }

        // 2) Get active bank parsers
        const banks = await db.all('SELECT * FROM email_bank_parsers WHERE is_active = true');
        if (!banks.length) { isRunning = false; return; }

        // 3) Connect IMAP
        const client = new ImapFlow({
            host: 'imap.gmail.com',
            port: 993,
            secure: true,
            auth: { user: config.gmail_user, pass: password },
            logger: false
        });

        await client.connect();
        const lock = await client.getMailboxLock('INBOX');

        try {
            // Search UNSEEN emails
            const messages = client.fetch(
                { seen: false },
                { envelope: true, source: true, uid: true }
            );

            let importCount = 0;
            for await (const msg of messages) {
                const from = (msg.envelope.from || []).map(f => f.address || '').join(',').toLowerCase();
                const subject = msg.envelope.subject || '';
                const msgId = msg.envelope.messageId || msg.uid.toString();
                const rawSource = msg.source ? msg.source.toString('utf-8') : '';

                // Check each bank
                for (const bank of banks) {
                    const senderMatch = from.includes(bank.sender_filter.toLowerCase()) ||
                                        subject.toLowerCase().includes(bank.sender_filter.toLowerCase());
                    if (!senderMatch) continue;

                    // Parse email body
                    const parsed = parseEmailBody(rawSource, bank);
                    if (!parsed || parsed.amount <= 0) continue;

                    // Check duplicate by message ID hash
                    const refHash = crypto.createHash('md5').update(msgId).digest('hex');
                    const existing = await db.get(
                        'SELECT id FROM payment_records WHERE source = $1 AND source_ref_id = $2',
                        ['email_auto', refHash]
                    );
                    if (existing) continue;

                    // Get next CK sequence for that date
                    const seqRow = await db.get(
                        `SELECT COALESCE(MAX(daily_seq), 0) + 1 AS next_seq
                         FROM payment_records WHERE payment_method = 'CK' AND payment_date = $1`,
                        [parsed.date]
                    );
                    const seq = seqRow.next_seq;
                    const d = new Date(parsed.date);
                    const dd = d.getDate(), mm = d.getMonth() + 1;
                    const yy = d.getFullYear().toString().slice(-2);
                    const code = `CK${seq}-${dd}-${mm}-Y${yy}`;

                    await db.get(`
                        INSERT INTO payment_records (
                            payment_code, payment_method, daily_seq,
                            amount, payment_type, transfer_note,
                            money_source, bank_name,
                            handover_status, source, source_ref_id,
                            payment_date, created_at
                        ) VALUES ($1,'CK',$2,$3,'pending',$4,'khach_hang',$5,'thu_quy_nhan','email_auto',$6,$7,NOW())
                        RETURNING id
                    `, [code, seq, parsed.amount, parsed.description, bank.bank_name, refHash, parsed.date]);

                    importCount++;
                    break; // Only match first bank
                }

                // Mark as SEEN
                try { await client.messageFlagsAdd(msg.uid, ['\\Seen'], { uid: true }); } catch {}
            }

            // Update last check time
            await db.run('UPDATE email_import_config SET last_check_at = NOW(), last_import_count = $1 WHERE id = 1', [importCount]);

            if (importCount > 0) {
                console.log(`[EmailChecker] ✅ Imported ${importCount} new payment records`);
            }

        } finally {
            lock.release();
        }

        await client.logout();

    } catch (err) {
        console.error('[EmailChecker] ❌ Error:', err.message);
        // Save error to config for UI display
        try {
            await db.run('UPDATE email_import_config SET last_error = $1, last_check_at = NOW() WHERE id = 1', [err.message]);
        } catch {}
    }
    isRunning = false;
}

// ========== PARSE EMAIL BODY ==========
function parseEmailBody(rawSource, bank) {
    try {
        // Decode HTML body from raw email source
        let html = rawSource;

        // Try to extract HTML part
        const htmlMatch = rawSource.match(/Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\.\r?\n|$)/i);
        if (htmlMatch) html = htmlMatch[1];

        // Decode quoted-printable if needed
        html = html.replace(/=\r?\n/g, '');
        html = html.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

        // Decode base64 if needed
        if (/Content-Transfer-Encoding:\s*base64/i.test(rawSource)) {
            try {
                const b64Match = rawSource.match(/Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--)/i);
                if (b64Match) html = Buffer.from(b64Match[1].replace(/\s/g, ''), 'base64').toString('utf-8');
            } catch {}
        }

        // Strip HTML tags for easier parsing
        const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

        // ---- Parse AMOUNT ----
        // Look for patterns like: + 2,000,000 VND or - 7,280,000 VND
        const amtPatterns = [
            /(?:Phát sinh|Transaction)[^]*?([+-])\s*([\d,]+(?:\.\d+)?)\s*VND/i,
            /([+-])\s*([\d,]+(?:\.\d+)?)\s*VND/i
        ];
        let amount = 0;
        let sign = '+';
        for (const pat of amtPatterns) {
            const m = text.match(pat);
            if (m) {
                sign = m[1].trim();
                amount = parseFloat(m[2].replace(/,/g, ''));
                break;
            }
        }
        // Skip negative (money going out)
        if (sign === '-' || amount <= 0) return null;

        // ---- Parse DATE ----
        const datePatterns = [
            /(?:Ngày|Date)[^]*?(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/i,
            /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/
        ];
        let dateStr = null;
        let timeStr = '';
        for (const pat of datePatterns) {
            const m = text.match(pat);
            if (m) {
                dateStr = `${m[3]}-${m[2]}-${m[1]}`; // YYYY-MM-DD
                timeStr = `${m[4]}:${m[5]}`;
                break;
            }
        }
        if (!dateStr) {
            // Fallback: today
            const now = new Date();
            dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        }

        // ---- Parse DESCRIPTION ----
        const descPatterns = [
            /(?:Nội dung|Description)[^]*?(?::|\/)\s*([^\n<]{5,200})/i
        ];
        let description = '';
        for (const pat of descPatterns) {
            const m = text.match(pat);
            if (m) { description = m[1].trim(); break; }
        }
        if (!description) description = 'Auto import from ' + (bank.bank_name || 'email');

        return { amount, date: dateStr, time: timeStr, description };

    } catch (err) {
        console.error('[EmailChecker] Parse error:', err.message);
        return null;
    }
}

// ========== CRON MANAGEMENT ==========
async function startCron() {
    stopCron();
    try {
        const config = await db.get('SELECT check_interval, is_active FROM email_import_config WHERE id = 1');
        if (!config || !config.is_active) {
            console.log('[EmailChecker] ⏸️ Email checker is disabled');
            return;
        }
        const interval = (config.check_interval || 2) * 60 * 1000;
        console.log(`[EmailChecker] ✅ Started (every ${config.check_interval || 2} min)`);
        cronTimer = setInterval(checkEmails, interval);
        // Run first check after 10 seconds
        setTimeout(checkEmails, 10000);
    } catch (err) {
        console.log('[EmailChecker] ⚠️ No config yet, skipping');
    }
}

function stopCron() {
    if (cronTimer) { clearInterval(cronTimer); cronTimer = null; }
}

async function restartCron() {
    stopCron();
    await startCron();
}

module.exports = { startCron, stopCron, restartCron, checkEmails, encrypt, decrypt };
