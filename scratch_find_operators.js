require('dotenv').config();
const db = require('./db/pool');

async function main() {
    try {
        await db.init();
        
        console.log('--- PRINTING FIELDS ---');
        const fields = await db.all(`SELECT id, name FROM printing_fields`);
        console.log(JSON.stringify(fields, null, 2));

        console.log('--- PRINTING CONTRACTORS ---');
        const contractors = await db.all(`SELECT id, name, is_active FROM printing_contractors`);
        console.log(JSON.stringify(contractors, null, 2));

        console.log('--- PRINTING FIELD OPERATORS ---');
        const operators = await db.all(`
            SELECT fo.id, fo.field_id, f.name as field_name, fo.operator_type, fo.operator_id,
                   CASE WHEN fo.operator_type = 'contractor' THEN pc.name ELSE u.full_name END as operator_name
            FROM printing_field_operators fo
            JOIN printing_fields f ON fo.field_id = f.id
            LEFT JOIN printing_contractors pc ON fo.operator_type = 'contractor' AND fo.operator_id = pc.id
            LEFT JOIN users u ON fo.operator_type = 'user' AND fo.operator_id = u.id
        `);
        console.log(JSON.stringify(operators, null, 2));

        console.log('--- KV LOCATIONS ---');
        const locs = await db.all(`SELECT id, name, printing_contractor_id FROM kv_locations`);
        console.log(JSON.stringify(locs, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        await db.close();
    }
}
main();
