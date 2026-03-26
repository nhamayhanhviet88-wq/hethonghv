/**
 * Restore v5 - separate transactions for truncate, insert, and cleanup
 */
require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

const backupFile = process.argv[2] || 'backups/2026-03-24/db_20260324_0140.sql';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });

async function main() {
    console.log('📂 Reading:', backupFile);
    const content = fs.readFileSync(backupFile, 'utf8');

    const copyRegex = /COPY public\.(\w+)\s*\(([^)]+)\)\s*FROM stdin;\r?\n([\s\S]*?)\r?\n\\\./g;
    const tables = {};
    let match;
    while ((match = copyRegex.exec(content)) !== null) {
        tables[match[1]] = {
            columns: match[2].split(',').map(c => c.trim()),
            rows: match[3].split('\n').filter(l => l.trim())
        };
    }
    console.log('Found', Object.keys(tables).length, 'tables in backup');

    // ==== PHASE 1: TRUNCATE ====
    console.log('\n🗑️  Phase 1: Truncating...');
    const allTables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    const tableNames = allTables.rows.map(r => `"${r.tablename}"`).join(', ');
    await pool.query(`TRUNCATE ${tableNames} CASCADE`);
    console.log('  ✅ Truncated');

    // ==== PHASE 2: DISABLE TRIGGERS ====
    console.log('\n🔓 Phase 2: Disabling triggers...');
    for (const row of allTables.rows) {
        await pool.query(`ALTER TABLE "${row.tablename}" DISABLE TRIGGER ALL`);
    }
    console.log('  ✅ Triggers disabled');

    // ==== PHASE 3: INSERT DATA (one transaction, savepoints) ====
    console.log('\n📥 Phase 3: Inserting data...');
    const client = await pool.connect();
    await client.query('BEGIN');
    let totalRows = 0, totalErrors = 0;

    for (const [table, data] of Object.entries(tables)) {
        if (!data.rows.length) continue;
        let ok = 0, err = 0;

        for (const line of data.rows) {
            const values = line.split('\t').map(v => v === '\\N' ? null : v.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\'));
            if (values.length !== data.columns.length) { err++; continue; }

            const ph = values.map((_, i) => `$${i + 1}`).join(', ');
            const cols = data.columns.map(c => `"${c}"`).join(', ');

            await client.query('SAVEPOINT sp');
            try {
                await client.query(`INSERT INTO "${table}" (${cols}) VALUES (${ph})`, values);
                await client.query('RELEASE SAVEPOINT sp');
                ok++; totalRows++;
            } catch (e) {
                await client.query('ROLLBACK TO SAVEPOINT sp');
                err++;
            }
        }
        console.log(`  ${table}: ${ok}/${data.rows.length}${err ? ` (${err} skip)` : ''}`);
        totalErrors += err;
    }

    console.log(`\n  Committing ${totalRows} rows...`);
    try {
        await client.query('COMMIT');
        console.log('  ✅ COMMIT OK');
    } catch(e) {
        console.log('  ❌ COMMIT FAILED:', e.message);
    }
    client.release();

    // Verify immediately after commit
    const r = await pool.query('SELECT COUNT(*) as cnt FROM users');
    console.log('  Users after commit:', r.rows[0].cnt);

    // ==== PHASE 4: RE-ENABLE TRIGGERS ====
    console.log('\n🔒 Phase 4: Re-enabling triggers...');
    for (const row of allTables.rows) {
        try { await pool.query(`ALTER TABLE "${row.tablename}" ENABLE TRIGGER ALL`); } catch(e) {}
    }

    // ==== PHASE 5: RESET SEQUENCES ====
    console.log('🔄 Phase 5: Resetting sequences...');
    for (const row of allTables.rows) {
        try {
            await pool.query(`SELECT setval(pg_get_serial_sequence('${row.tablename}', 'id'), COALESCE((SELECT MAX(id) FROM "${row.tablename}"), 1))`);
        } catch(e) {}
    }

    // ==== VERIFY ====
    console.log('\n📊 Final verification:');
    for (const t of ['users', 'customers', 'departments', 'consultation_logs', 'permissions', 'teams', 'order_codes', 'withdrawal_requests']) {
        try {
            const r = await pool.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
            console.log(`  ${t}: ${r.rows[0].cnt}`);
        } catch(e) {}
    }

    await pool.end();
    console.log('\n✅ Done!');
}

main().catch(e => console.error('Fatal:', e));
