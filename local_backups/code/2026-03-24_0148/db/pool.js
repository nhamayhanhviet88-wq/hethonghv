const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

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
        const noIdTables = ['app_config'];
        const hasNoId = noIdTables.some(t => new RegExp('INTO\\s+' + t, 'i').test(finalSql));
        if (/^\s*INSERT\s/i.test(finalSql) && !/RETURNING/i.test(finalSql) && !hasNoId) {
            finalSql = finalSql.replace(/;?\s*$/, ' RETURNING id');
        }

        const result = await pool.query(finalSql, converted.params);
        const lastInsertRowid = result.rows && result.rows.length > 0 && result.rows[0].id != null
            ? result.rows[0].id : 0;
        return { lastInsertRowid, changes: result.rowCount };
    },

    // Run a query and return all matching rows as objects
    async all(sql, params = []) {
        const converted = convertPlaceholders(sql, params);
        const result = await pool.query(converted.sql, converted.params);
        return result.rows;
    },

    // Run a query and return the first matching row as an object
    async get(sql, params = []) {
        const converted = convertPlaceholders(sql, params);
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

    // Graceful shutdown
    async close() {
        await pool.end();
    }
};

module.exports = database;
