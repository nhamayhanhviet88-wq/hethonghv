require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const db = require('./db/pool');

async function debugFullResponse() {
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
            console.log("=== FULL RESPONSE DATA ===");
            console.log("Month:", data.month);
            console.log("Summary:", data.summary);
            console.log("Categories length:", data.categories ? data.categories.length : 0);
            console.log("Handlers length:", data.handlers ? data.handlers.length : 0);
            if (data.handlers && data.handlers.length > 0) {
                console.log("Handler 0:", {
                    name: data.handlers[0].ads_handler_name,
                    items_count: data.handlers[0].items ? data.handlers[0].items.length : 0,
                    first_item: data.handlers[0].items && data.handlers[0].items[0] ? data.handlers[0].items[0].category_name : null
                });
            }
        });
    });

    req.end();
}

debugFullResponse();
