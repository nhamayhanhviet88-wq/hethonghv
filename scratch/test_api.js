const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const postData = JSON.stringify(data);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function get(url, cookie) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: 'GET',
            headers: {
                'Cookie': cookie
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        // 1. Login
        const loginRes = await post('http://localhost:11000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        console.log('Login status:', loginRes.statusCode);
        const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';
        console.log('Cookie:', cookie);

        // 2. Call matching-payments API
        const apiRes = await get('http://localhost:11000/api/shipping/matching-payments?order_code=NHANVIEN10-MAU0002&target_amount=200000', cookie);
        console.log('API Status:', apiRes.statusCode);
        console.log('API Response:', apiRes.body);
    } catch (e) {
        console.error(e);
    }
}

run();
