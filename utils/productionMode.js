/**
 * Production Mode — "Chế Độ Thực Chiến"
 * Chỉ lọc theo tài khoản test:
 *   - Ẩn dữ liệu do tài khoản test tạo ra (created_by IN test_account_ids)
 *   - TK thật luôn thấy dữ liệu bất kể thời điểm tạo
 * 
 * ⚠️ production_start_date vẫn được lưu trong app_config nhưng KHÔNG dùng để lọc data
 * 
 * Usage in routes:
 *   const { getProductionCutoff, getTestAccountIds, buildProductionFilter } = require('../utils/productionMode');
 *   const cutoff = await getProductionCutoff();
 *   const testIds = await getTestAccountIds();
 *   query += buildProductionFilter(cutoff, testIds, 'c.created_at', 'c.created_by');
 */

const db = require('../db/pool');

// ========== CACHE: Cutoff Date ==========
let _cachedCutoff = undefined;
let _cachedCutoffAt = 0;

// ========== CACHE: Test Account IDs ==========
let _cachedTestIds = undefined;
let _cachedTestIdsAt = 0;

const CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Get the production cutoff date from app_config.
 * Returns a Date object or null (null = no time filter).
 */
async function getProductionCutoff() {
    const now = Date.now();
    if (_cachedCutoff !== undefined && (now - _cachedCutoffAt) < CACHE_TTL) {
        return _cachedCutoff;
    }

    try {
        const row = await db.get("SELECT value FROM app_config WHERE key = 'production_start_date'");
        if (row && row.value) {
            _cachedCutoff = new Date(row.value);
            if (isNaN(_cachedCutoff.getTime())) {
                console.warn('[ProductionMode] Invalid production_start_date:', row.value);
                _cachedCutoff = null;
            }
        } else {
            _cachedCutoff = null;
        }
    } catch (e) {
        console.error('[ProductionMode] Error reading cutoff:', e.message);
        _cachedCutoff = null;
    }

    _cachedCutoffAt = now;
    return _cachedCutoff;
}

/**
 * Get test account IDs from app_config.
 * Returns an array of user IDs or empty array.
 */
async function getTestAccountIds() {
    const now = Date.now();
    if (_cachedTestIds !== undefined && (now - _cachedTestIdsAt) < CACHE_TTL) {
        return _cachedTestIds;
    }

    try {
        const row = await db.get("SELECT value FROM app_config WHERE key = 'test_account_ids'");
        if (row && row.value) {
            _cachedTestIds = JSON.parse(row.value);
            if (!Array.isArray(_cachedTestIds)) _cachedTestIds = [];
        } else {
            _cachedTestIds = [];
        }
    } catch (e) {
        console.error('[ProductionMode] Error reading test_account_ids:', e.message);
        _cachedTestIds = [];
    }

    _cachedTestIdsAt = now;
    return _cachedTestIds;
}

/**
 * Build combined SQL filter for production mode.
 * Generates: AND (created_by NOT IN (testIds)) AND (assigned_to_id NOT IN (testIds))
 * Safe to append to any WHERE clause.
 * 
 * @param {Date|null} cutoff - Cutoff date
 * @param {number[]} testIds - Test account IDs
 * @param {string} dateCol - Column for date filter (e.g. 'c.created_at')
 * @param {string} createdByCol - Column for creator filter (e.g. 'c.created_by')
 * @param {object} [opts] - Optional: { assignedToCol: 'c.assigned_to_id' }
 * @returns {string} SQL fragment (safe to concat, empty string if nothing to filter)
 */
function buildProductionFilter(cutoff, testIds, dateCol = 'created_at', createdByCol = 'created_by', opts = {}) {
    let sql = '';

    // ★ Lọc theo tài khoản test — KHÔNG lọc theo thời gian
    // Ẩn dữ liệu do TK test tạo RA HOẶC được gán CHO TK test
    if (testIds && testIds.length > 0) {
        const idList = testIds.map(id => parseInt(id)).join(',');
        sql += ` AND ${createdByCol} NOT IN (${idList})`;
        // ★ Also hide customers ASSIGNED TO test accounts
        const assignedCol = opts.assignedToCol || (createdByCol.includes('.') ? createdByCol.replace(/\.[^.]+$/, '.assigned_to_id') : 'assigned_to_id');
        sql += ` AND ${assignedCol} NOT IN (${idList})`;
    }

    return sql;
}


/**
 * Build SQL fragment for cutoff filtering only (legacy compat).
 */
function buildCutoffSQL(cutoff, column, paramOffset = 0) {
    if (!cutoff) return { sql: '', params: [] };
    return {
        sql: ` AND ${column} >= $${paramOffset + 1}::timestamp`,
        params: [cutoff.toISOString()]
    };
}

/**
 * Build a simple cutoff WHERE clause using ? placeholder (for simpler queries).
 */
function buildCutoffWhere(cutoff, column) {
    if (!cutoff) return { sql: '', params: [] };
    return {
        sql: ` AND ${column} >= ?`,
        params: [cutoff.toISOString()]
    };
}

/**
 * Force-clear ALL caches (called when admin updates config).
 */
function clearProductionCache() {
    _cachedCutoff = undefined;
    _cachedCutoffAt = 0;
    _cachedTestIds = undefined;
    _cachedTestIdsAt = 0;
}

// Backward compatibility alias
const clearProductionCutoffCache = clearProductionCache;

module.exports = {
    getProductionCutoff,
    getTestAccountIds,
    buildProductionFilter,
    buildCutoffSQL,
    buildCutoffWhere,
    clearProductionCache,
    clearProductionCutoffCache
};
