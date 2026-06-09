const dotenv = require('dotenv');
dotenv.config();
const db = require('../db/pool');

async function runIndexCreation() {
    try {
        await db.init();
        
        console.log('Creating idx_cutting_order_item on cutting_records(order_item_id)...');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_cutting_order_item ON cutting_records(order_item_id)');
        console.log('Created idx_cutting_order_item successfully!');
        
        console.log('Creating idx_dht_products_name on dht_products(name)...');
        await db.exec('CREATE INDEX IF NOT EXISTS idx_dht_products_name ON dht_products(name)');
        console.log('Created idx_dht_products_name successfully!');
        
    } catch (err) {
        console.error('Error during index creation:', err);
    } finally {
        await db.close();
    }
}

runIndexCreation();
