const db = require('../db/pool');

async function main() {
    console.log("=== INSPECTING ORDER VTTI0039 ===");
    const order = await db.get("SELECT id, order_code FROM dht_orders WHERE order_code = 'VTTI0039'");
    if (!order) {
        console.log("Order VTTI0039 not found.");
        return;
    }
    console.log("Order ID:", order.id);

    const reservations = await db.all("SELECT * FROM qlx_fabric_reservations WHERE dht_order_id = $1", [order.id]);
    console.log("\n=== RESERVATIONS ===");
    for (const res of reservations) {
        console.log(`Res ID: ${res.id}, Roll ID: ${res.roll_id}, status: ${res.status}, kg_reserved: ${res.kg_reserved}`);
        if (res.roll_id) {
            const roll = await db.get("SELECT * FROM kv_rolls WHERE id = $1", [res.roll_id]);
            if (roll) {
                console.log(`  Roll Code: ${roll.roll_code}, Location: ${roll.location}, Original Location: ${roll.original_location}, return_tx_id: ${roll.return_tx_id}, return_requested: ${roll.return_requested}`);
            }
        }
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
