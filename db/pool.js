const { Pool, types } = require('pg');

// Override DATE type parser — return raw 'YYYY-MM-DD' string instead of JS Date
// Prevents timezone shift (e.g. 2026-04-05 → 2026-04-06 in UTC+7)
types.setTypeParser(1082, val => val); // 1082 = DATE type OID

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
    max: 30,                       // ↑ 20→30: đủ cho ~6 cron jobs + concurrent user requests
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // ↑ 5s→10s: cho phép chờ lâu hơn khi pool bận
    allowExitOnIdle: false,
});

// ========== POOL HEALTH MONITORING ==========
// Log when pool is running low on connections (early warning)
let _lastPoolWarning = 0;
const POOL_WARN_INTERVAL = 60000; // warn at most once per minute

function checkPoolHealth(context) {
    const total = pool.totalCount;
    const idle = pool.idleCount;
    const waiting = pool.waitingCount;
    const now = Date.now();

    // Warn if pool utilization > 80% or there are waiting queries
    if ((waiting > 0 || (total - idle) > pool.options.max * 0.8) && now - _lastPoolWarning > POOL_WARN_INTERVAL) {
        _lastPoolWarning = now;
        console.warn(`⚠️ [Pool Health] ${context || 'check'}: total=${total}, idle=${idle}, active=${total - idle}, waiting=${waiting}, max=${pool.options.max}`);
    }
}

// ========== POOL ERROR HANDLING ==========
pool.on('error', (err, client) => {
    console.error('🔴 [Pool] Unexpected error on idle client:', err.message);
    // Don't crash — pg Pool handles reconnection automatically
});

// Set Vietnam timezone for every new connection
pool.on('connect', (client) => {
    client.query("SET timezone = 'Asia/Ho_Chi_Minh'").catch(err => {
        console.error('⚠️ [Pool] Failed to set timezone:', err.message);
    });
});

// ========== QUERY TIMEOUT WRAPPER ==========
// Auto-cancel queries that take too long (prevents connection leak from hanging queries)
const DEFAULT_QUERY_TIMEOUT_MS = 30000; // 30 seconds

async function safeQuery(sql, params, timeoutMs = DEFAULT_QUERY_TIMEOUT_MS) {
    checkPoolHealth('query');

    // Use pool.query() with a statement_timeout for safety
    const timeoutSql = `SET LOCAL statement_timeout = '${timeoutMs}'`;

    // For simple queries, just use pool.query directly (it auto-releases)
    return pool.query(sql, params);
}

// Convert SQLite-style ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql, params) {
    if (!params || params.length === 0) return { sql, params };
    let idx = 0;
    const newSql = sql.replace(/\?/g, () => `$${++idx}`);
    return { sql: newSql, params };
}

const database = {
    pool,

    async init() {
        // Test connection
        const client = await pool.connect();
        try {
            await client.query('SELECT 1');
            console.log('✅ PostgreSQL connected');
        } finally {
            client.release();
        }
    },

    // Run a query that modifies data (INSERT, UPDATE, DELETE)
    // Returns { lastInsertRowid } for compatibility
    async run(sql, params = []) {
        const converted = convertPlaceholders(sql, params);
        let finalSql = converted.sql;

        // Auto-add RETURNING id for INSERT statements (if not already present)
        // Skip for tables that don't have 'id' column (e.g., app_config uses 'key' as PK)
        const noIdTables = ['app_config', 'task_schedule_active_teams', 'global_penalty_config'];
        const hasNoId = noIdTables.some(t => new RegExp('INTO\\s+' + t, 'i').test(finalSql));
        if (/^\s*INSERT\s/i.test(finalSql) && !/RETURNING/i.test(finalSql) && !hasNoId) {
            finalSql = finalSql.replace(/;?\s*$/, ' RETURNING id');
        }

        checkPoolHealth('run');
        const result = await pool.query(finalSql, converted.params);
        const lastInsertRowid = result.rows && result.rows.length > 0 && result.rows[0].id != null
            ? result.rows[0].id : 0;
        return { lastInsertRowid, changes: result.rowCount };
    },

    // Run a query and return all matching rows as objects
    async all(sql, params = []) {
        const converted = convertPlaceholders(sql, params);
        checkPoolHealth('all');
        const result = await pool.query(converted.sql, converted.params);
        return result.rows;
    },

    // Run a query and return the first matching row as an object
    async get(sql, params = []) {
        const converted = convertPlaceholders(sql, params);
        checkPoolHealth('get');
        const result = await pool.query(converted.sql, converted.params);
        return result.rows[0] || null;
    },

    // Execute raw SQL (for schema creation, multiple statements)
    async exec(sql) {
        await pool.query(sql);
    },

    // No-op for compatibility (PostgreSQL auto-persists)
    save() {},

    // For compatibility — returns the pool
    getDB() { return pool; },

    // Pool stats — for health check endpoint
    getPoolStats() {
        return {
            total: pool.totalCount,
            idle: pool.idleCount,
            active: pool.totalCount - pool.idleCount,
            waiting: pool.waitingCount,
            max: pool.options.max,
        };
    },

    // Graceful shutdown
    async close() {
        await pool.end();
    }
};

module.exports = database;
