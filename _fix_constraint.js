const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fix() {
    const client = await pool.connect();
    try {
        // Check current constraints on consult_type_configs
        const res = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'consult_type_configs'::regclass AND contype = 'u'
        `);
        console.log('Current UNIQUE constraints on consult_type_configs:', res.rows);

        // Drop old UNIQUE on key only (if exists)
        for (const row of res.rows) {
            if (row.pg_get_constraintdef.includes('(key)') && !row.pg_get_constraintdef.includes('crm_menu')) {
                console.log(`Dropping old constraint: ${row.conname}`);
                await client.query(`ALTER TABLE consult_type_configs DROP CONSTRAINT "${row.conname}"`);
            }
        }

        // Check if (key, crm_menu) constraint already exists
        const existing = res.rows.find(r => r.pg_get_constraintdef.includes('crm_menu'));
        if (!existing) {
            await client.query(`
                ALTER TABLE consult_type_configs 
                ADD CONSTRAINT consult_type_configs_key_crm_menu_unique UNIQUE (key, crm_menu)
            `);
            console.log('✅ Added UNIQUE constraint on (key, crm_menu)');
        } else {
            console.log('✅ Constraint (key, crm_menu) already exists:', existing.conname);
        }

        // Also fix consult_flow_rules
        const res2 = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'consult_flow_rules'::regclass AND contype = 'u'
        `);
        console.log('\nCurrent UNIQUE constraints on consult_flow_rules:', res2.rows);

        // Check if (from_status, to_type_key, crm_menu) exists
        const existing2 = res2.rows.find(r => r.pg_get_constraintdef.includes('crm_menu'));
        if (!existing2) {
            // Drop old constraint without crm_menu
            for (const row of res2.rows) {
                if (!row.pg_get_constraintdef.includes('crm_menu')) {
                    console.log(`Dropping old flow rules constraint: ${row.conname}`);
                    await client.query(`ALTER TABLE consult_flow_rules DROP CONSTRAINT "${row.conname}"`);
                }
            }
            await client.query(`
                ALTER TABLE consult_flow_rules 
                ADD CONSTRAINT consult_flow_rules_unique UNIQUE (from_status, to_type_key, crm_menu)
            `);
            console.log('✅ Added UNIQUE constraint on flow rules (from_status, to_type_key, crm_menu)');
        } else {
            console.log('✅ Flow rules constraint already exists:', existing2.conname);
        }

    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        pool.end();
    }
}
fix();
