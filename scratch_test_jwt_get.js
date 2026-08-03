const http = require('http');
const jwt = require('jsonwebtoken');

// Generate JWT token for admin
const secret = process.env.JWT_SECRET || 'secret';
const token = jwt.sign({ id: 1, username: 'admin', role: 'giam_doc' }, secret, { expiresIn: '1d' });

console.log("Generated token:", token.substring(0, 20) + "...");

const req = http.request({
    hostname: 'localhost',
    port: 11000,
    path: '/api/reports/kpi-marketing?month=2026-08',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log("STATUS CODE:", res.statusCode);
        console.log("RESPONSE BODY HEAD:", body.substring(0, 300));
    });
});

req.on('error', (e) => console.error("HTTP ERROR:", e));
req.end();
