require('dotenv').config();
const db = require('./db/pool');
(async () => {
    const r = await db.all(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='telesale_assignments' ORDER BY ordinal_position`);
    console.log('telesale_assignments:');
    r.forEach(c => console.log(' ', c.column_name, c.data_type));

    const r2 = await db.all(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='telesale_answer_statuses' ORDER BY ordinal_position`);
    console.log('telesale_answer_statuses:');
    r2.forEach(c => console.log(' ', c.column_name, c.data_type));

    const r3 = await db.all(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='telesale_data' ORDER BY ordinal_position`);
    console.log('telesale_data:');
    r3.forEach(c => console.log(' ', c.column_name, c.data_type));

    process.exit(0);
})();
