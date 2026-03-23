require('dotenv').config();
const { Pool } = require('pg');

async function createDB() {
    // Connect to default 'postgres' database first
    const connStr = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv_crm';
    const dbName = connStr.split('/').pop().split('?')[0];
    const baseUrl = connStr.substring(0, connStr.lastIndexOf('/')) + '/postgres';
    
    console.log(`Creating database "${dbName}"...`);
    
    const pool = new Pool({ connectionString: baseUrl });
    try {
        const check = await pool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
        if (check.rows.length === 0) {
            await pool.query(`CREATE DATABASE "${dbName}"`);
            console.log(`✅ Database "${dbName}" created!`);
        } else {
            console.log(`ℹ️  Database "${dbName}" already exists`);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.log('\n⚠️  Possible causes:');
        console.log('   1. PostgreSQL is not running');
        console.log('   2. Wrong credentials in .env (DATABASE_URL)');
        console.log('   3. PostgreSQL not installed');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

createDB();
