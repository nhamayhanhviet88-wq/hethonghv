const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hethonghv'
});

async function run() {
    try {
        const res = await pool.query("UPDATE mkt_categories SET ads_handler_name = 'Giám Đốc' WHERE name LIKE '%Đồng Phục HV%' OR name LIKE '%Xưởng In%'");
        console.log('SUCCESS! Updated rows:', res.rowCount);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
