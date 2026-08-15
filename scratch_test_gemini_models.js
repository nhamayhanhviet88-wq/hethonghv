const db = require('./db/pool');
const https = require('https');

async function testGeminiModels() {
    let keyRow = await db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'`);
    const apiKey = keyRow?.setting_value || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.log('No API Key in DB or env');
        return;
    }

    console.log('API Key found, testing gemini-2.0-flash model...');
    const postData = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Xin chào, bạn tên là gì?' }] }]
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
            console.log('Status code:', res.statusCode);
            console.log('Response body:', body.substring(0, 300));
        });
    });
    req.write(postData);
    req.end();
}

testGeminiModels();
