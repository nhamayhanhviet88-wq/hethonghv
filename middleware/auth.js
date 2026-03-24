const jwt = require('jsonwebtoken');
const db = require('../db/pool');

async function authenticate(request, reply) {
    const token = request.cookies?.token;
    if (!token) {
        reply.code(401).send({ error: 'Chưa đăng nhập' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Check if user is still active in DB
        const user = await db.get('SELECT status FROM users WHERE id = ?', [decoded.id]);
        if (!user || user.status !== 'active') {
            reply.clearCookie('token');
            reply.code(401).send({ error: 'Tài khoản đã bị khóa' });
            return;
        }
        request.user = decoded;
    } catch (err) {
        reply.code(401).send({ error: 'Token không hợp lệ' });
    }
}

function requireRole(...roles) {
    return function (request, reply, done) {
        if (!request.user || !roles.includes(request.user.role)) {
            reply.code(403).send({ error: 'Không có quyền truy cập' });
            return;
        }
        done();
    };
}

module.exports = { authenticate, requireRole };
