const db = require('./db/pool');

async function main() {
    try {
        const tables = await db.all("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log('Tables:');
        console.log(tables.map(t => t.table_name).join(', '));
    } catch (e) {
        console.error(e);
    }
}

main();
