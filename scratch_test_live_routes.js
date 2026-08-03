require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const db = require('./db/pool');

async function testLiveServerRoutes() {
    const user = await db.get('SELECT id, username, role, token_version FROM users WHERE username = ?', ['admin']);
    const secret = process.env.JWT_SECRET;
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, tv: user.token_version }, secret, { expiresIn: '1d' });

    function sendPost(urlPath) {
        return new Promise((resolve) => {
            const postData = JSON.stringify({
                group_type: 'online',
                parent_id: 1,
                name: "Test Cat Live " + Date.now(),
                pancake_page_name: "Page Công Ty 2",
                ads_handler_name: "Giám Đốc"
            });

            const req = http.request({
                hostname: 'localhost',
                port: 11000,
                path: urlPath,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': `Bearer ${token}`
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    console.log(`LIVE TEST [${urlPath}] STATUS:`, res.statusCode, "BODY:", body);
                    resolve();
                });
            });

            req.on('error', (e) => {
                console.error(`LIVE TEST [${urlPath}] ERROR:`, e);
                resolve();
            });

            req.write(postData);
            req.end();
        });
    }

    await sendPost('/api/reports/kpi-marketing/categories');
    await sendPost('/api/marketing-categories');
    await sendPost('/api/mkt-budget/categories');
}

testLiveServerRoutes();
