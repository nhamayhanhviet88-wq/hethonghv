const db = require('./db/pool');
const https = require('https');

async function testModel25() {
    let keyRow = await db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'`);
    const apiKey = keyRow?.setting_value || process.env.GEMINI_API_KEY;

    const postData = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log('gemini-2.5-flash STATUS:', res.statusCode);
            console.log('BODY:', body.substring(0, 300));
        });
    });
    req.write(postData);
    req.end();
}

testModel25();
