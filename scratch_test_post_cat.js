const http = require('http');
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'secret';
const token = jwt.sign({ id: 1, username: 'admin', role: 'giam_doc' }, secret, { expiresIn: '1d' });

function testPostCategory(urlPath) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            parent_id: 1,
            name: "Test Category Auto " + Date.now(),
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
                console.log(`[${urlPath}] STATUS:`, res.statusCode, "BODY:", body);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`[${urlPath}] ERROR:`, e);
            resolve();
        });

        req.write(postData);
        req.end();
    });
}

async function runTests() {
    await testPostCategory('/api/reports/kpi-marketing/categories');
    await testPostCategory('/api/marketing-categories');
    await testPostCategory('/api/mkt-budget/categories');
}

runTests();
