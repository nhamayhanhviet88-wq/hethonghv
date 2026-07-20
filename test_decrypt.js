require('dotenv').config();
const db = require('./db/pool');
const crypto = require('crypto');

const ENC_KEY = (process.env.JWT_SECRET || 'fallback-key-32chars-long!!!!!!').slice(0, 32).padEnd(32, '0');
const ENC_IV = Buffer.alloc(16, 0);

function decryptWithError(hex) {
    if (!hex) return 'EMPTY_HEX';
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, ENC_IV);
        return decipher.update(hex, 'hex', 'utf8') + decipher.final('utf8');
    } catch(e) {
        return 'ERROR: ' + e.message;
    }
}

async function main() {
    try {
        await db.init();
        const customPassRow = await db.get("SELECT value FROM app_config WHERE key = 'dht_design_sender_password'");
        const config = await db.get('SELECT gmail_pass FROM email_import_config WHERE id = 1');
        
        console.log("JWT_SECRET loaded:", process.env.JWT_SECRET ? "YES" : "NO");
        console.log("ENC_KEY:", ENC_KEY);
        console.log("Custom Pass Hex:", customPassRow?.value);
        console.log("Decrypted custom sender password:", decryptWithError(customPassRow?.value));
        console.log("Decrypted email import password:", decryptWithError(config?.gmail_pass));
    } catch(err) {
        console.error("ERROR:", err);
    } finally {
        await db.close();
    }
}

main();
