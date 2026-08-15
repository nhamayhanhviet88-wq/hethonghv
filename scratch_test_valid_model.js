const db = require('./db/pool');
const https = require('https');

async function testModels() {
    let keyRow = await db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'`);
    const apiKey = keyRow?.setting_value || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.log('No API Key');
        return;
    }

    const testList = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];

    for (const m of testList) {
        console.log(`Testing model: ${m}...`);
        await new Promise((resolve) => {
            const postData = JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
            });

            const options = {
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/${m}:generateContent?key=${apiKey}`,
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
                    console.log(`Model ${m} -> Status Code: ${res.statusCode}`);
                    if (res.statusCode !== 200) {
                        console.log(`Error body for ${m}:`, body.substring(0, 200));
                    } else {
                        console.log(`SUCCESS for ${m}!`);
                    }
                    resolve();
                });
            });
            req.on('error', () => resolve());
            req.write(postData);
            req.end();
        });
    }
}

testModels().then(() => process.exit(0));
