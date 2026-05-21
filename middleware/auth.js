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
        const user = await db.get('SELECT status, access_blocked, token_version FROM users WHERE id = ?', [decoded.id]);
        if (!user || user.status !== 'active') {
            reply.clearCookie('token');
            reply.code(401).send({ error: 'Tài khoản đã bị khóa' });
            return;
        }

        // ★ Token version check — force re-login after promotion/demotion
        if (typeof decoded.tv === 'number' && user.token_version !== decoded.tv) {
            reply.clearCookie('token');
            reply.code(401).send({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
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

// ★ Permission-based access control (Layer 2 — server-side)
// Usage: requirePerm('don_hang_tong', 'delete')
// Checks user's effective permission (department + individual override)
function requirePerm(featureKey, action) {
    return async function (request, reply) {
        if (!request.user) { reply.code(401).send({ error: 'Chưa đăng nhập' }); return; }
        // GĐ always bypass
        if (request.user.role === 'giam_doc') return;
        const permCol = 'can_' + action;
        // Check individual override first (value = 1 granted, -1 blocked)
        const userPerm = await db.get(
            `SELECT ${permCol} FROM user_permissions WHERE user_id = $1 AND feature_key = $2`,
            [request.user.id, featureKey]
        );
        if (userPerm) {
            if (userPerm[permCol] === -1) { reply.code(403).send({ error: '🔒 Bạn không có quyền thực hiện thao tác này' }); return; }
            if (userPerm[permCol] > 0) return; // explicitly granted
        }
        // Fallback to department permission
        const deptPerm = await db.get(
            `SELECT dp.${permCol} FROM department_permissions dp
             JOIN users u ON u.department_id = dp.department_id
             WHERE u.id = $1 AND dp.feature_key = $2`,
            [request.user.id, featureKey]
        );
        if (deptPerm && deptPerm[permCol] > 0) return; // department grants it
        // No permission found
        reply.code(403).send({ error: '🔒 Bạn không có quyền thực hiện thao tác này' });
    };
}

module.exports = { authenticate, requireRole, requirePerm };
