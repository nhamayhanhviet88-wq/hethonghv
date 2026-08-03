const http = require('http');

// First login to get token
const loginData = JSON.stringify({ username: 'admin', password: '1' });

const req = http.request({
    hostname: 'localhost',
    port: 11000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            const loginRes = JSON.parse(body);
            const token = loginRes.token;
            console.log("Logged in successfully. Token length:", token ? token.length : 0);

            // Now call /api/reports/kpi-marketing
            const req2 = http.request({
                hostname: 'localhost',
                port: 11000,
                path: '/api/reports/kpi-marketing?month=2026-08',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }, (res2) => {
                let body2 = '';
                res2.on('data', chunk => body2 += chunk);
                res2.on('end', () => {
                    try {
                        const data = JSON.parse(body2);
                        console.log("=== API RESPONSE KEYS ===", Object.keys(data));
                        console.log("=== CATEGORIES COUNT ===", data.categories ? data.categories.length : 'NULL');
                        console.log("=== CATEGORIES SAMPLE ===", JSON.stringify(data.categories, null, 2));
                    } catch(e) {
                        console.error("Parse error:", e.message, body2);
                    }
                });
            });
            req2.end();
        } catch(e) {
            console.error("Login parse error:", e.message);
        }
    });
});

req.write(loginData);
req.end();
