const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function main() {
    const filePath = path.join(__dirname, 'backups', '2026-07-15', 'db_20260715_2100.sql');
    if (!fs.existsSync(filePath)) {
        console.log('Backup file not found:', filePath);
        return;
    }
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line.includes('INSERT INTO "dht_order_items"') && (line.includes('VALUES (201,') || line.includes('VALUES (202,'))) {
            console.log('MATCH:', line);
        }
    }
}

main();
