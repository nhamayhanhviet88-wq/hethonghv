require('dotenv').config();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const { Pool } = require('pg');

async function initDB() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
    });

    try {
        // Read and execute schema
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schema);
        console.log('✅ Schema created successfully');

        // Check if admin exists
        const existing = await pool.query("SELECT id FROM users WHERE username = 'admin'");
        if (existing.rows.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await pool.query(
                `INSERT INTO users (username, password_hash, full_name, role, status)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['admin', hash, 'Giám Đốc', 'giam_doc', 'active']
            );
            console.log('✅ Admin account created (admin / admin123)');
        } else {
            console.log('ℹ️  Admin account already exists');
        }

        console.log('✅ Database initialized successfully!');
    } catch (err) {
        console.error('❌ Error initializing database:', err.message);
    } finally {
        await pool.end();
    }
}

initDB();
