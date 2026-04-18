/**
 * Global Phone Dedup Script
 * Removes duplicate phone numbers across ALL sources/CRM types
 * Priority: transferred > answered > has_assignment > oldest (smallest ID)
 */
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv',
    max: 5
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('🔍 Scanning for duplicate phones across ALL sources/CRM...\n');

        // 1. Find all duplicate phones
        const dupes = await client.query(`
            SELECT phone, COUNT(*) as cnt 
            FROM telesale_data 
            WHERE phone IS NOT NULL AND phone != ''
            GROUP BY phone 
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
        `);
        console.log(`Found ${dupes.rows.length} phone numbers with duplicates\n`);

        if (dupes.rows.length === 0) {
            console.log('✅ No duplicates found!');
            return;
        }

        // Show top 10 worst offenders
        console.log('Top duplicates:');
        for (const d of dupes.rows.slice(0, 10)) {
            console.log(`  📞 ${d.phone} → ${d.cnt} records`);
        }
        console.log('');

        let totalDeleted = 0;
        let totalAssignmentsDeleted = 0;

        // 2. For each duplicate phone, decide which to keep
        for (const dupe of dupes.rows) {
            // Get all records for this phone with assignment info
            const records = await client.query(`
                SELECT d.id, d.phone, d.source_id, d.status, d.created_at,
                    s.name as source_name, s.crm_type,
                    (SELECT COUNT(*) FROM telesale_assignments a WHERE a.data_id = d.id) as assign_count,
                    (SELECT COUNT(*) FROM telesale_assignments a WHERE a.data_id = d.id AND a.call_status = 'answered') as answered_count,
                    (SELECT COUNT(*) FROM telesale_assignments a 
                     JOIN telesale_answer_statuses ans ON ans.id = a.answer_status_id 
                     WHERE a.data_id = d.id AND ans.action_type = 'transfer') as transfer_count
                FROM telesale_data d
                LEFT JOIN telesale_sources s ON s.id = d.source_id
                WHERE d.phone = $1
                ORDER BY d.id ASC
            `, [dupe.phone]);

            // Sort by priority: transfer > answered > has_assignment > oldest
            const sorted = records.rows.sort((a, b) => {
                if (b.transfer_count !== a.transfer_count) return b.transfer_count - a.transfer_count;
                if (b.answered_count !== a.answered_count) return b.answered_count - a.answered_count;
                if (b.assign_count !== a.assign_count) return b.assign_count - a.assign_count;
                return a.id - b.id; // oldest first (smallest ID)
            });

            const keepRecord = sorted[0];
            const deleteRecords = sorted.slice(1);

            if (deleteRecords.length > 0) {
                const deleteIds = deleteRecords.map(r => r.id);
                
                // Delete assignments first (FK constraint)
                const delAssign = await client.query(
                    `DELETE FROM telesale_assignments WHERE data_id = ANY($1::int[])`,
                    [deleteIds]
                );
                totalAssignmentsDeleted += delAssign.rowCount;

                // Delete duplicate data records
                const delData = await client.query(
                    `DELETE FROM telesale_data WHERE id = ANY($1::int[])`,
                    [deleteIds]
                );
                totalDeleted += delData.rowCount;
            }
        }

        console.log(`\n✅ Dedup complete!`);
        console.log(`   📊 Phones with dupes: ${dupes.rows.length}`);
        console.log(`   🗑️ Records deleted: ${totalDeleted}`);
        console.log(`   🗑️ Assignments deleted: ${totalAssignmentsDeleted}`);

        // 3. Verify no more duplicates
        const verify = await client.query(`
            SELECT COUNT(*) as cnt FROM (
                SELECT phone FROM telesale_data 
                WHERE phone IS NOT NULL AND phone != ''
                GROUP BY phone HAVING COUNT(*) > 1
            ) sub
        `);
        console.log(`\n🔍 Verification: ${verify.rows[0].cnt} duplicate phones remaining`);

        // 4. Show total records
        const total = await client.query('SELECT COUNT(*) as cnt FROM telesale_data');
        console.log(`📊 Total records after cleanup: ${total.rows[0].cnt}`);

    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
