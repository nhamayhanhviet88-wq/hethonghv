const jwt = require('jsonwebtoken');

function authenticate(request, reply, done) {
    const token = request.cookies?.token;
    if (!token) {
        reply.code(401).send({ error: 'Chưa đăng nhập' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        request.user = decoded;
        done();
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
