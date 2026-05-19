// ========== EMAIL CHECKER — Auto-import bank emails → payment_records ==========
const { ImapFlow } = require('imapflow');
const db = require('../db/pool');
const crypto = require('crypto');
const { sendTelegramMessage } = require('../utils/telegram');
const { syncToAppSheet, isAppSheetSyncEnabled, retryFailedSync } = require('./appsheetSync');

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

            // ★ Read Telegram notification group (once per cycle)
            let _tgPaymentGroup = null;
            try {
                const tgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_payment_notify_group'");
                _tgPaymentGroup = tgRow?.value?.trim() || null;
            } catch (e) { /* ignore */ }

            // ★ Read AppSheet sync config (once per cycle)
            let _appSheetEnabled = false;
            try {
                _appSheetEnabled = await isAppSheetSyncEnabled();
            } catch (e) { /* ignore */ }

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

                    const insertResult = await db.get(`
                        INSERT INTO payment_records (
                            payment_code, payment_method, daily_seq,
                            amount, payment_type, transfer_note,
                            money_source, bank_name,
                            handover_status, source, source_ref_id,
                            payment_date, created_at
                        ) VALUES ($1,'CK',$2,$3,'pending',$4,'khach_hang',$5,'thu_quy_nhan','email_auto',$6,$7,NOW())
                        ON CONFLICT (source_ref_id) DO NOTHING
                        RETURNING id
                    `, [code, seq, parsed.amount, parsed.description, bank.bank_name, refHash, parsed.date]);

                    // If INSERT returned null → duplicate source_ref_id → skip everything
                    if (!insertResult) {
                        skippedDup++;
                        console.log(`[EmailChecker] ⏭️ DB conflict skip ${code} (ref: ${refHash.substring(0,8)})`);
                        continue;
                    }

                    importCount++;
                    console.log(`[EmailChecker] 💰 ${code} | ${parsed.amount.toLocaleString()}đ | ${bank.bank_name} | ${parsed.description.substring(0, 50)}`);

                    // ★ Send Telegram notification (ONLY if INSERT succeeded)
                    if (_tgPaymentGroup) {
                        const fmtAmt = parsed.amount.toLocaleString('vi-VN');
                        const cleanDesc = _cleanPaymentDesc(parsed.description);
                        const tgMsg = `🏦${code} : ${fmtAmt}đ ${bank.bank_name} ${cleanDesc}`;
                        sendTelegramMessage(_tgPaymentGroup, tgMsg).catch(() => {});
                    }

                    // ★ Sync to AppSheet NKy (ONLY if INSERT succeeded)
                    if (_appSheetEnabled) {
                        try {
                            await db.run('UPDATE payment_records SET appsheet_synced = true WHERE source_ref_id = $1', [refHash]);
                            await syncToAppSheet({
                                payment_code: code,
                                date: parsed.date,
                                amount: parsed.amount,
                                bank_name: bank.bank_name,
                                description: parsed.description
                            });
                            console.log(`[AppSheet] ✅ Synced ${code}`);
                        } catch (err) {
                            await db.run('UPDATE payment_records SET appsheet_synced = false WHERE source_ref_id = $1', [refHash]).catch(() => {});
                            console.error(`[AppSheet] ❌ Failed ${code}:`, err.message);
                        }
                    }
                }
            }

            // Update last check time
            await db.run(
                'UPDATE email_import_config SET last_check_at = NOW(), last_import_count = $1, last_error = NULL WHERE id = 1',
                [importCount]
            );

            console.log(`[EmailChecker] ✅ Done: checked ${checkedCount} emails, imported ${importCount}, skipped ${skippedDup} duplicates, ${skippedNeg} negative`);

            // ★ Retry failed AppSheet syncs
            if (_appSheetEnabled) {
                await retryFailedSync();
            }

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
            // Try multipart first
            const mpMatch = rawSource.match(/Content-Type:\s*text\/html[^\r\n]*[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--)/i);
            if (mpMatch) {
                try { html = Buffer.from(mpMatch[1].replace(/[\r\n\s]/g, ''), 'base64').toString('utf-8'); } catch {}
            }
            // Fallback: single-part (entire body after headers)
            if (!html) {
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

        // Detect bank type from sender_filter
        const isACB = bank.sender_filter.toLowerCase().includes('acb');

        // ============ PARSE AMOUNT ============
        let amount = 0;
        let sign = '+';

        if (isACB) {
            // ACB format: "Ghi có +30,000,000.00 VND" or "Ghi nợ -7,280,000.00 VND"
            // After HTML strip: "Ghi c +19,000.00 VND" (diacritics stripped)
            const acbAmt = text.match(/Ghi\s*(?:c[^\s]*|n[^\s]*)\s*([+-])\s*([\d,]+(?:\.\d+)?)\s*VND/i)
                        || text.match(/(?:Credit|Debit)\s*([+-])\s*([\d,]+(?:\.\d+)?)\s*VND/i);
            if (acbAmt) {
                sign = acbAmt[1].trim();
                // ACB uses decimal .00 → remove it: 30,000,000.00 → 30000000
                amount = parseFloat(acbAmt[2].replace(/,/g, ''));
                // Remove decimal cents (ACB always .00)
                if (amount > 0 && amount !== Math.floor(amount)) amount = Math.floor(amount);
            }
        } else {
            // Sacombank format: "+ 2,000,000 VND" or "- 7,280,000 VND"
            const amtPatterns = [
                /(?:Ph[^\s]*t sinh|Transaction)[^]*?([+-])\s*([\d,]+(?:\.\d+)?)\s*VND/i,
                /([+-])\s*([\d,]+(?:\.\d+)?)\s*VND/i
            ];
            for (const pat of amtPatterns) {
                const m = text.match(pat);
                if (m) {
                    sign = m[1].trim();
                    amount = parseFloat(m[2].replace(/,/g, ''));
                    break;
                }
            }
        }

        // Skip negative (money going out) or zero
        if (sign === '-' || amount <= 0) return null;

        // ============ PARSE DATE ============
        let dateStr = null;
        let timeStr = '';

        if (isACB) {
            // ACB: "tính đến 12/05/2026" → after strip: "t nh n 28/02/2025"
            const acbDate = text.match(/(?:t.{0,3}nh\s*.{0,3}n|up\s*to)\s*(\d{2})\/(\d{2})\/(\d{4})/i);
            if (acbDate) {
                dateStr = `${acbDate[3]}-${acbDate[2]}-${acbDate[1]}`;
            }
            // Try to get time from GD ref: "GD 342940-022825 13:16:51"
            const acbTime = text.match(/(\d{2}):(\d{2}):\d{2}\s*\./);
            if (acbTime) timeStr = `${acbTime[1]}:${acbTime[2]}`;
        } else {
            // Sacombank: "Ngày / Date 28/02/2025 13:16"
            const datePatterns = [
                /(?:Ng[^\s]*y|Date)[^]*?(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/i,
                /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/
            ];
            for (const pat of datePatterns) {
                const m = text.match(pat);
                if (m) {
                    dateStr = `${m[3]}-${m[2]}-${m[1]}`;
                    timeStr = `${m[4]}:${m[5]}`;
                    break;
                }
            }
        }

        // Fallback: use email date or today
        if (!dateStr) {
            const now = new Date();
            dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        }

        // ============ PARSE DESCRIPTION ============
        let description = '';

        if (isACB) {
            // ACB: "Nội dung giao dịch: CTCP MARS TAM UNG..." → stripped: "N i dung giao d ch: XXX"
            const acbDesc = text.match(/N.{0,3}i\s*dung\s*giao\s*d.{0,3}ch\s*:\s*([^.]{3,500})/i)
                         || text.match(/Content\s*:\s*([^.]{3,500})/i);
            if (acbDesc) {
                description = acbDesc[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                // Remove ACB footer
                const footerIdx = description.search(/C.{0,3}m\s*.{0,3}n\s*Qu|Thank you|Ch.{0,3}ng\s*t.{0,3}i\s*mong|Yours\s*faithfully/i);
                if (footerIdx > 5) description = description.substring(0, footerIdx).trim();
            }
        } else {
            // Sacombank: "Nội dung / Description PHAN THI HANH chuyen tien..."
            const descPatterns = [
                /(?:N[^\s]*i\s*dung|Description)\s*(?:\/\s*Description)?\s*([A-Z][^\r\n]{3,300})/i,
                /(?:N[^\s]*i\s*dung|Description)\s*[^:]*:\s*([^\n<]{3,300})/i
            ];
            for (const pat of descPatterns) {
                const m = text.match(pat);
                if (m) {
                    description = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                    // Remove Sacombank footer
                    const footerIdx = description.search(/Tr.{0,3}n\s*tr.{0,3}ng\s*c.{0,3}m|Thank you|1800\s*5858|www\.sacombank|B.{0,3}n quy.{0,3}n/i);
                    if (footerIdx > 10) description = description.substring(0, footerIdx).trim();
                    break;
                }
            }
        }

        if (!description) description = 'Auto import from ' + (bank.bank_name || 'email');

        return { amount, date: dateStr, time: timeStr, description };

    } catch (err) {
        console.error('[EmailChecker] Parse error:', err.message);
        return null;
    }
}

// ========== CLEAN DESCRIPTION FOR TELEGRAM ==========
function _cleanPaymentDesc(desc) {
    if (!desc) return '';
    let s = desc;
    // Remove "- Ngan hang..." / "- Ngân hàng..." sender bank at end
    s = s.replace(/\s*-\s*Ngan\s*hang.*$/i, '');
    s = s.replace(/\s*-\s*Ng[aâ]n\s*h[aà]ng.*$/i, '');
    // Remove QR-DDMMYY- date reference codes
    s = s.replace(/QR-\d{6}-/g, '');
    // Remove CKN + reference number
    s = s.replace(/CKN\s+\d+/gi, '');
    // Remove long alphanumeric codes (8+ chars like 6135ASCB02B94WGM, cJ1HEF8J)
    s = s.replace(/\b[A-Za-z0-9]{8,}\b/g, function(m) {
        // Only remove if it contains both letters and digits (not pure words)
        return (/[A-Za-z]/.test(m) && /\d/.test(m)) ? '' : m;
    });
    // Remove standalone long numbers (6+ digits, reference IDs)
    s = s.replace(/\b\d{6,}\b/g, '');
    // Remove GD reference (ACB: "GD 342940-022825")
    s = s.replace(/GD\s+\d+-\d+/gi, '');
    // Clean up multiple spaces and orphan dashes
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/\s*-\s*$/, '').trim();
    s = s.replace(/^\s*-\s*/, '').trim();
    return s;
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
