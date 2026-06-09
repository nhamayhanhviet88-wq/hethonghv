const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dongphuchv' });
    await client.connect();

    try {
        console.log('Checking if checked_techniques column exists...');
        const checkRes = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sewing_records' AND column_name = 'checked_techniques'
        `);

        if (checkRes.rows.length === 0) {
            console.log('Adding checked_techniques column...');
            await client.query('ALTER TABLE sewing_records ADD COLUMN checked_techniques TEXT');
            console.log('Column checked_techniques added successfully!');
        } else {
            console.log('Column checked_techniques already exists.');
        }
    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        await client.end();
    }
}
run();
