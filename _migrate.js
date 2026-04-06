const db = require('./db/pool');
(async () => {
    await db.run(`ALTER TABLE telesale_sources ADD COLUMN IF NOT EXISTS carrier_priority JSONB DEFAULT '["Viettel","Mobi","Vina","Vnmb","Gmob","iTel","Reddi"]'`);
    await db.run(`ALTER TABLE telesale_sources ADD COLUMN IF NOT EXISTS distribution_mode VARCHAR(20) DEFAULT 'priority'`);
    console.log('Done: added carrier_priority + distribution_mode columns');
    
    const cols = await db.all(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'telesale_sources' AND column_name IN ('carrier_priority','distribution_mode')`);
    console.log(JSON.stringify(cols, null, 2));
    process.exit(0);
})();
