const db = require('./db/pool');

async function main() {
    try {
        const rows = await db.all("SELECT * FROM dht_order_session_backups");
        console.log('Total session backups:', rows.length);
        rows.forEach(r => {
            console.log(`Order ID: ${r.order_id}, User ID: ${r.user_id}, Session ID: ${r.session_id}`);
            try {
                const data = typeof r.original_data === 'string' ? JSON.parse(r.original_data) : r.original_data;
                console.log('Items in backup:', data.items.map(it => ({ id: it.id, name: it.product_name, mockup: it.mockup_image, print: it.print_details })));
            } catch (e) {
                console.log('Failed to parse original_data');
            }
            console.log('----------------------------------------------------');
        });
    } catch (e) {
        console.error(e);
    }
}

main();
