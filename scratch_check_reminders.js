const db = require('./db/pool');
(async () => {
    await db.init();
    const o = await db.get("SELECT id FROM dht_orders WHERE order_code='VTTI0023'");
    console.log('Order:', o);
    if (o) {
        const rems = await db.all('SELECT * FROM qlx_reminders WHERE dht_order_id=$1', [o.id]);
        console.log('Reminders:', JSON.stringify(rems, null, 2));
        const prep = await db.get('SELECT print_remind_choice, press_remind_choice FROM qlx_preparation WHERE dht_order_id=$1 AND item_id IS NULL', [o.id]);
        console.log('Prep:', prep);
        
        // Also check printing_records for this order  
        const prints = await db.all('SELECT id, dht_order_id, order_item_id, print_field, contractor_id FROM printing_records WHERE dht_order_id=$1', [o.id]);
        console.log('Printing records:', JSON.stringify(prints, null, 2));
    }
    await db.close();
})();
