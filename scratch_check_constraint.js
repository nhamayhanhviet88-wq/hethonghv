const db = require('./db/pool');

async function main() {
    await db.init();
    try {
        console.log('Altering pettem_rolls...');
        await db.exec(`ALTER TABLE pettem_rolls ADD COLUMN IF NOT EXISTS material_tx_id INTEGER`);
        console.log('Success adding material_tx_id!');
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
