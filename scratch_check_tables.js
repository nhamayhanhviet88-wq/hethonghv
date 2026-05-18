const db = require('./db/pool');
(async () => {
    try {
        // Check dht_settings_options structure
        const cols = await db.all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='dht_settings_options' ORDER BY ordinal_position");
        console.log('=== dht_settings_options columns ===');
        console.log(JSON.stringify(cols, null, 2));
        // Check current data
        const data = await db.all("SELECT DISTINCT category FROM dht_settings_options ORDER BY category");
        console.log('\n=== categories ===');
        console.log(JSON.stringify(data));
        // Check existing DHT tables
        const tbls = await db.all("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'dht%' ORDER BY table_name");
        console.log('\n=== DHT tables ===');
        console.log(JSON.stringify(tbls));
        // Check kv tables
        const kv = await db.all("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'kv%' ORDER BY table_name");
        console.log('\n=== KV tables ===');
        console.log(JSON.stringify(kv));
    } catch(e) { console.error(e.message); }
    process.exit(0);
})();
