require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const db = require('./db/pool');

async function testCookieGet() {
    const user = await db.get('SELECT id, username, role, token_version FROM users WHERE username = ?', ['admin']);
    const secret = process.env.JWT_SECRET;
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, tv: user.token_version }, secret, { expiresIn: '1d' });

    const req = http.request({
        hostname: 'localhost',
        port: 11000,
        path: '/api/reports/kpi-marketing?month=2026-08',
        method: 'GET',
        headers: {
            'Cookie': `token=${token}`
        }
    }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            console.log("COOKIE GET STATUS:", res.statusCode);
            console.log("COOKIE GET BODY HEAD:", body.substring(0, 400));
        });
    });

    req.end();
}

testCookieGet();
