require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const db = require('./db/pool');

async function testGetKpiMktHandlers() {
    const user = await db.get('SELECT id, username, role, token_version FROM users WHERE username = ?', ['admin']);
    const secret = process.env.JWT_SECRET;
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, tv: user.token_version }, secret, { expiresIn: '1d' });

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
            const data = JSON.parse(body);
            console.log("HANDLERS COUNT:", data.handlers ? data.handlers.length : 0);
            if (data.handlers && data.handlers.length > 0) {
                console.log("HANDLER NAMES:", data.handlers.map(h => h.ads_handler_name));
                console.log("HANDLER 0 ITEMS:", data.handlers[0].items ? data.handlers[0].items.length : 0);
            }
        });
    });

    req.end();
}

testGetKpiMktHandlers();
