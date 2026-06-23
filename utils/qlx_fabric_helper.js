const db = require('../db/pool');

async function recalculateOrderFabricStatus(orderId) {
    if (!orderId) return;

    try {
        // Fetch items
        const oItems = await db.all(`
            SELECT doi.id, doi.material_pairs, qp.material_called, qp.material_arrived 
            FROM dht_order_items doi
            LEFT JOIN qlx_preparation qp ON doi.id = qp.item_id
            WHERE doi.dht_order_id = $1
        `, [orderId]);

        // Fetch cutting records
        const cuttingRows = await db.all(
            'SELECT order_item_id, material_name, fabric_color, is_cutting, is_cut_done FROM cutting_records WHERE dht_order_id = $1',
            [orderId]
        );

        // Fetch active reservations
        // Filter out reservations where the roll weight is 0 or less, since those rolls are exhausted
        const reservations = await db.all(`
            SELECT r.item_id, r.phoi_index, r.status, r.roll_id
            FROM qlx_fabric_reservations r
            LEFT JOIN kv_rolls roll ON r.roll_id = roll.id
            WHERE r.dht_order_id = $1 
              AND r.status NOT IN ('released', 'fulfilled') 
              AND (r.roll_id IS NULL OR roll.weight > 0)
        `, [orderId]);

        const phoiFabStatus = {};
        for (const r of reservations) {
            const key = `${r.item_id}_${r.phoi_index}`;
            if (!phoiFabStatus[key]) {
                phoiFabStatus[key] = { total: 0, arrived: 0, pending: 0 };
            }
            phoiFabStatus[key].total++;
            if (r.status === 'arrived') {
                phoiFabStatus[key].arrived++;
            } else if (r.status === 'reserved') {
                phoiFabStatus[key].pending++;
            }
        }

        let totalPhois = 0;
        let arrivedPhois = 0;
        let calledPhois = 0;

        for (const it of oItems) {
            let pairs = [];
            try {
                pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []);
            } catch(e) {}
            if (!Array.isArray(pairs)) pairs = [];

            if (pairs.length === 0) {
                totalPhois++;
                const itemCuts = cuttingRows.filter(c => c.order_item_id === it.id);
                const isCutOrCutting = itemCuts.some(c => c.is_cutting || c.is_cut_done);
                if (isCutOrCutting) {
                    arrivedPhois++;
                    calledPhois++;
                } else {
                    const key = `${it.id}_0`;
                    const pfs = phoiFabStatus[key];
                    if (pfs && pfs.pending === 0 && pfs.arrived > 0) {
                        arrivedPhois++;
                        calledPhois++;
                    } else if (pfs && pfs.total > 0) {
                        calledPhois++;
                    } else if (it.material_called || it.material_arrived) {
                        calledPhois++;
                        if (it.material_arrived) arrivedPhois++;
                    }
                }
            } else {
                pairs.forEach((p, pIdx) => {
                    totalPhois++;
                    const pMat = (p.material_name || '').trim().toLowerCase();
                    const pColor = (p.color_name || '').trim().toLowerCase();

                    const itemCuts = cuttingRows.filter(c => c.order_item_id === it.id);
                    const match = itemCuts.find(c => {
                        const cMat = (c.material_name || '').trim().toLowerCase();
                        const cColor = (c.fabric_color || '').trim().toLowerCase();
                        return cMat === pMat && cColor === pColor;
                    });

                    if (match && (match.is_cutting || match.is_cut_done)) {
                        arrivedPhois++;
                        calledPhois++;
                    } else {
                        const key = `${it.id}_${pIdx}`;
                        const pfs = phoiFabStatus[key];
                        if (pfs && pfs.pending === 0 && pfs.arrived > 0) {
                            arrivedPhois++;
                            calledPhois++;
                        } else if (pfs && pfs.total > 0) {
                            calledPhois++;
                        }
                    }
                });
            }
        }

        let fabricArrived = false;
        let fabricCalled = false;

        if (totalPhois > 0) {
            fabricArrived = (arrivedPhois === totalPhois);
            fabricCalled = (calledPhois > 0);
        }

        // Update qlx_preparation table in database
        await db.run(`
            INSERT INTO qlx_preparation (dht_order_id, fabric_called, fabric_arrived, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (dht_order_id) WHERE item_id IS NULL
            DO UPDATE SET 
                fabric_called = EXCLUDED.fabric_called, 
                fabric_arrived = EXCLUDED.fabric_arrived, 
                updated_at = EXCLUDED.updated_at
        `, [orderId, fabricCalled, fabricArrived]);
        
        console.log(`[QLX FABRIC RECALC] Order ${orderId}: fabric_called = ${fabricCalled}, fabric_arrived = ${fabricArrived}`);
    } catch (err) {
        console.error(`[QLX FABRIC RECALC] Error recalculating order ${orderId}:`, err);
    }
}

module.exports = {
    recalculateOrderFabricStatus
};
