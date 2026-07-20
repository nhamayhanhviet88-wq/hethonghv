const db = require('./db/pool');

async function main() {
    try {
        await db.init();
        const rows = await db.all(`
            SELECT pid, state, query, query_start, state_change, backend_type, application_name
            FROM pg_stat_activity 
            WHERE datname = 'dongphuchv'
        `);
        console.log("ACTIVE PG CONNECTIONS:");
        rows.forEach(r => {
            console.log("-----------------------------------------");
            console.log(`PID: ${r.pid} | State: ${r.state} | App: ${r.application_name}`);
            console.log(`Start: ${r.query_start} | Changed: ${r.state_change}`);
            console.log(`Query: ${r.query}`);
        });
    } catch(err) {
        console.error("ERROR:", err);
    } finally {
        await db.close();
    }
}

main();
