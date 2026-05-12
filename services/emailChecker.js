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
    if (isRunning) { console.log('[EmailChecker] ⏭️ Already running, skip'); return; }
    isRunning = true;
    console.log('[EmailChecker] 🔍 Checking emails...');
    try {
        // 1) Read config
        const config = await db.get('SELECT * FROM email_import_config WHERE id = 1');
        if (!config || !config.is_active || !config.gmail_user || !config.gmail_pass) {
            console.log('[EmailChecker] ⏸️ Not configured or disabled');
            isRunning = false;
            return;
        }

        const password = decrypt(config.gmail_pass);
        if (!password) {
            console.log('[EmailChecker] ❌ Cannot decrypt password');
            await db.run("UPDATE email_import_config SET last_error = 'Không thể giải mã App Password', last_check_at = NOW() WHERE id = 1");
            isRunning = false;
            return;
        }

        // 2) Get active bank parsers
        const banks = await db.all('SELECT * FROM email_bank_parsers WHERE is_active = true');
        if (!banks.length) {
            console.log('[EmailChecker] ⏸️ No active banks');
            isRunning = false;
            return;
        }
        console.log('[EmailChecker] 🏦 Active banks:', banks.map(b => b.bank_name).join(', '));

        // 3) Connect IMAP
        const client = new ImapFlow({
            host: 'imap.gmail.com',
            port: 993,
            secure: true,
            auth: { user: config.gmail_user, pass: password },
            logger: false
        });

        await client.connect();
        console.log('[EmailChecker] ✅ IMAP connected');
        const lock = await client.getMailboxLock('INBOX');

        try {
            let importCount = 0;
            let checkedCount = 0;
            let skippedNeg = 0;
            let skippedDup = 0;

            // For each bank, search emails from that sender
            for (const bank of banks) {
                const filter = bank.sender_filter.toLowerCase();
                console.log(`[EmailChecker] 🔎 Searching emails for: ${bank.bank_name} (filter: ${filter})`);

                // Search by FROM containing the filter keyword
                // ImapFlow search: use 'from' criteria
                let searchCriteria;
                try {
                    searchCriteria = { from: filter };
                    // Also limit to last 90 days to avoid processing ancient emails
                    const since = new Date();
                    since.setDate(since.getDate() - 90);
                    searchCriteria.since = since;
                } catch(e) {
                    searchCriteria = { from: filter };
                }

                const messages = client.fetch(searchCriteria, {
                    envelope: true,
                    source: true,
                    uid: true
                });

                for await (const msg of messages) {
                    checkedCount++;
                    const msgId = msg.envelope.messageId || `uid-${msg.uid}`;
                    const refHash = crypto.createHash('md5').update(msgId).digest('hex');

                    // Check duplicate by message ID hash FIRST (fast skip)
                    const existing = await db.get(
                        'SELECT id FROM payment_records WHERE source = $1 AND source_ref_id = $2',
                        ['email_auto', refHash]
                    );
                    if (existing) { skippedDup++; continue; }

                    // Parse email body
                    const rawSource = msg.source ? msg.source.toString('utf-8') : '';
                    const parsed = parseEmailBody(rawSource, bank);

                    if (!parsed) { continue; }
                    if (parsed.amount <= 0) { skippedNeg++; continue; }

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
                    console.log(`[EmailChecker] 💰 ${code} | ${parsed.amount.toLocaleString()}đ | ${bank.bank_name} | ${parsed.description.substring(0, 50)}`);
                }
            }

            // Update last check time
            await db.run(
                'UPDATE email_import_config SET last_check_at = NOW(), last_import_count = $1, last_error = NULL WHERE id = 1',
                [importCount]
            );

            console.log(`[EmailChecker] ✅ Done: checked ${checkedCount} emails, imported ${importCount}, skipped ${skippedDup} duplicates, ${skippedNeg} negative`);

        } finally {
            lock.release();
        }

        await client.logout();

    } catch (err) {
        console.error('[EmailChecker] ❌ Error:', err.message);
        try {
            await db.run('UPDATE email_import_config SET last_error = $1, last_check_at = NOW() WHERE id = 1', [err.message]);
        } catch {}
    }
    isRunning = false;
}

// ========== PARSE EMAIL BODY ==========
function parseEmailBody(rawSource, bank) {
    try {
        let html = '';

        // Check if base64 encoded
        const isBase64 = /Content-Transfer-Encoding:\s*base64/i.test(rawSource);

        if (isBase64) {
            // For base64 emails: find empty line after headers, decode everything after
            // Single-part: headers\r\n\r\nBASE64DATA
            // Multipart: ...Content-Type: text/html...\r\n\r\nBASE64DATA\r\n--boundary
            
            // Try multipart first
            const mpMatch = rawSource.match(/Content-Type:\s*text\/html[^\r\n]*[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--)/i);
            if (mpMatch) {
                try { html = Buffer.from(mpMatch[1].replace(/[\r\n\s]/g, ''), 'base64').toString('utf-8'); } catch {}
            }
            
            // If multipart didn't work, try single-part (entire body after headers)
            if (!html) {
                // Find the blank line separating headers from body
                const blankIdx = rawSource.search(/\r?\n\r?\n/);
                if (blankIdx > 0) {
                    const bodyPart = rawSource.substring(blankIdx).replace(/^\s+/, '');
                    try { html = Buffer.from(bodyPart.replace(/[\r\n\s]/g, ''), 'base64').toString('utf-8'); } catch {}
                }
            }
        }

        // If not base64 or decode failed, try plain HTML extraction
        if (!html) {
            const htmlMatch = rawSource.match(/Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\.\r?\n|$)/i);
            html = htmlMatch ? htmlMatch[1] : rawSource;
            
            // Decode quoted-printable
            html = html.replace(/=\r?\n/g, '');
            html = html.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        }

        // Strip HTML tags for easier parsing
        const text = html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ');

        // ---- Parse AMOUNT ----
        // Sacombank format: + 2,000,000 VND  or  - 7,280,000 VND
        const amtPatterns = [
            /(?:Ph(?:á|a)t sinh|Transaction)[^]*?([+-])\s*([\d,]+(?:\.\d+)?)\s*VND/i,
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
            /(?:Ng(?:à|a)y|Date)[^]*?(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/i,
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
            const now = new Date();
            dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        }

        // ---- Parse DESCRIPTION ----
        // Sacombank: "Nội dung / Description   PHAN THI HANH chuyen tien..."
        const descPatterns = [
            /(?:N[^\s]*i\s*dung|Description)\s*(?:\/\s*Description)?\s*([A-Z][^\r\n]{3,300})/i,
            /(?:N[^\s]*i\s*dung|Description)\s*[^:]*:\s*([^\n<]{3,300})/i
        ];
        let description = '';
        for (const pat of descPatterns) {
            const m = text.match(pat);
            if (m) {
                description = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                // Clean up: remove footer text
                const footerIdx = description.search(/Tr[^\s]*n tr[^\s]*ng|Thank you|1800\s*5858|www\.sacombank/i);
                if (footerIdx > 10) description = description.substring(0, footerIdx).trim();
                break;
            }
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
