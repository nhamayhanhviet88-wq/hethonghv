const jwt = require('jsonwebtoken');
const db = require('../db/pool');

// Whitelist: API paths cho phép khi bị chặn truy cập
const ACCESS_BLOCK_WHITELIST = [
    '/api/auth/me',
    '/api/auth/logout',
    '/api/access-block/status',
];

async function authenticate(request, reply) {
    const token = request.cookies?.token;
    if (!token) {
        reply.code(401).send({ error: 'Chưa đăng nhập' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Check if user is still active in DB
        const user = await db.get('SELECT status, access_blocked FROM users WHERE id = ?', [decoded.id]);
        if (!user || user.status !== 'active') {
            reply.clearCookie('token');
            reply.code(401).send({ error: 'Tài khoản đã bị khóa' });
            return;
        }

        request.user = decoded;

        // ★ Access Block — chặn truy cập nếu bị phạt
        // Chỉ GĐ được miễn. QL/QLCC/HR bị chặn bình thường.
        if (user.access_blocked) {
            if (decoded.role === 'giam_doc') return;
            const url = request.url.split('?')[0];
            if (ACCESS_BLOCK_WHITELIST.includes(url)) return;
            reply.code(423).send({
                error: 'access_blocked',
                message: 'Tài khoản bị tạm chặn truy cập do chưa hoàn thành công việc.'
            });
            return;
        }
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
