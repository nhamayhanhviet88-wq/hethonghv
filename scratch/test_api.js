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
                    status: res.statusCode,
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

function get(url, cookies) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: 'GET',
            headers: {
                'Cookie': cookies.join('; ')
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
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
        const loginRes = await post('http://localhost:11000/api/auth/login', { username: 'admin', password: 'admin123' });
        console.log('Login Status:', loginRes.status);
        const cookies = loginRes.headers['set-cookie'] || [];
        
        const ordersRes = await get('http://localhost:11000/api/trasoat/orders?search=AFF-VTTI0007', cookies);
        console.log('Orders API Status:', ordersRes.status);
        const data = JSON.parse(ordersRes.body);
        
        console.log('Returned Orders:');
        data.orders.forEach(o => {
            console.log(`- Code: ${o.order_code}, Stage: ${o.current_step_name}, Progress: ${o.progress_percent}%`);
        });
    } catch(e) {
        console.error(e.message);
    }
}
run();
