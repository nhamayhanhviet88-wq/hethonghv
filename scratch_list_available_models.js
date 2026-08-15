const db = require('./db/pool');
const https = require('https');

async function listModels() {
    let keyRow = await db.get(`SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'`);
    const apiKey = keyRow?.setting_value || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.log('No API Key');
        return;
    }

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models?key=${apiKey}`,
        method: 'GET'
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log('ListModels Status:', res.statusCode);
            try {
                const parsed = JSON.parse(body);
                if (parsed.models) {
                    const valid = parsed.models.filter(m => m.supportedGenerationMethods?.includes('generateContent'));
                    console.log('AVAILABLE MODELS FOR generateContent:');
                    valid.forEach(m => console.log(`- ${m.name}`));
                } else {
                    console.log('Body:', body);
                }
            } catch(e) {
                console.log('Body raw:', body);
            }
        });
    });
    req.end();
}

listModels();
