const db = require('../db/pool');

let _activeSessionCache = undefined;
let _activeSessionCacheAt = 0;
const CACHE_TTL = 3000; // 3 seconds TTL to prevent database strain

async function isStockcheckActive() {
    const now = Date.now();
    if (_activeSessionCache !== undefined && (now - _activeSessionCacheAt) < CACHE_TTL) {
        return _activeSessionCache;
    }
    try {
        const row = await db.get("SELECT value FROM app_config WHERE key = 'stockcheck_active_session'");
        if (row && row.value) {
            const info = JSON.parse(row.value);
            _activeSessionCache = (info && info.status === 'active');
        } else {
            _activeSessionCache = false;
        }
    } catch (e) {
        console.error('[StockcheckLock] Error reading session status:', e.message);
        _activeSessionCache = false;
    }
    _activeSessionCacheAt = now;
    return _activeSessionCache;
}

function clearStockcheckLockCache() {
    _activeSessionCache = undefined;
    _activeSessionCacheAt = 0;
}

async function checkStockcheckLock(request, reply) {
    const active = await isStockcheckActive();
    if (active) {
        reply.code(409).send({
            error: 'Hệ thống đang trong quá trình kiểm kê kho vải. Tất cả các hoạt động nhập, xuất, cắt, đặt trước và di chuyển vải tạm thời bị khóa cho đến khi kiểm kê hoàn tất!'
        });
        return reply; // Halt processing in Fastify preHandler
    }
}

module.exports = {
    isStockcheckActive,
    clearStockcheckLockCache,
    checkStockcheckLock
};
