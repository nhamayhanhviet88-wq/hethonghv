require('dotenv').config();
const db = require('./db/pool');
const nodemailer = require('nodemailer');
const { decrypt } = require('./services/emailChecker');

async function main() {
    try {
        await db.init();
        const customEmailRow = await db.get("SELECT value FROM app_config WHERE key = 'dht_design_sender_email'");
        const customPassRow = await db.get("SELECT value FROM app_config WHERE key = 'dht_design_sender_password'");
        
        if (!customEmailRow || !customPassRow) {
            console.error("Missing config!");
            return;
        }
        
        const senderEmail = customEmailRow.value.trim();
        const decryptedPassword = decrypt(customPassRow.value);
        
        console.log("Connecting to SMTP as:", senderEmail);
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: senderEmail,
                pass: decryptedPassword
            },
            connectionTimeout: 10000,
            socketTimeout: 10000,
            greetingTimeout: 10000
        });
        
        await transporter.verify();
        console.log("SMTP Connection verified successfully!");
    } catch(err) {
        console.error("SMTP ERROR:", err);
    } finally {
        await db.close();
    }
}

main();
