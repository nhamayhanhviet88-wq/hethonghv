const db = require('../db/pool');
const { vnNow } = require('./timezone');

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
            'SELECT order_item_id, material_name, fabric_color, is_cutting, is_cut_done, printing_contractor_id FROM cutting_records WHERE dht_order_id = $1',
            [orderId]
        );

        // Fetch active reservations
        // Filter out reservations where the roll weight is 0 or less, since those rolls are exhausted
        const reservations = await db.all(`
            SELECT r.item_id, r.phoi_index, r.status, r.roll_id, roll.location AS roll_location
            FROM qlx_fabric_reservations r
            LEFT JOIN kv_rolls roll ON r.roll_id = roll.id
            WHERE r.dht_order_id = $1 
              AND r.status NOT IN ('released', 'fulfilled') 
              AND (r.roll_id IS NULL OR roll.weight > 0)
        `, [orderId]);

        const printAssigns = await db.all(`
            SELECT item_id, field_id, operator_type, operator_id
            FROM qlx_order_print_assignments
            WHERE dht_order_id = $1
        `, [orderId]);

        const linkedShelves = await db.all(`
            SELECT id, name, printing_contractor_id, user_id FROM kv_locations
            WHERE printing_contractor_id IS NOT NULL OR user_id IS NOT NULL
        `);

        const phoiFabStatus = {};
        for (const r of reservations) {
            const key = `${r.item_id}_${r.phoi_index}`;
            if (!phoiFabStatus[key]) {
                phoiFabStatus[key] = { total: 0, arrived: 0, pending: 0 };
            }
            phoiFabStatus[key].total++;

            let status = r.status;
            if (status === 'arrived' && r.roll_id) {
                const assign = printAssigns.find(a => a.item_id === r.item_id) || 
                               printAssigns.find(a => a.item_id === null);
                if (assign) {
                    const linkedLoc = linkedShelves.find(l => 
                        (assign.operator_type === 'contractor' && l.printing_contractor_id === assign.operator_id) ||
                        (assign.operator_type === 'user' && l.user_id === assign.operator_id)
                    );
                    if (linkedLoc) {
                        const rollLoc = (r.roll_location || '').toLowerCase().replace(/^📍\s*/, '').trim();
                        const targetLoc = linkedLoc.name.toLowerCase().trim();
                        if (rollLoc !== targetLoc) {
                            status = 'reserved'; // Treat as pending/reserved
                        }
                    }
                }
            }

            if (status === 'arrived') {
                phoiFabStatus[key].arrived++;
            } else {
                phoiFabStatus[key].pending++;
            }
        }

        // Update contractor cutting records is_cutting status based on fabric arrival
        for (const cr of cuttingRows) {
            if (cr.printing_contractor_id === null || cr.is_cut_done) continue;
            const it = oItems.find(item => item.id === cr.order_item_id);
            if (!it) continue;

            let pairs = [];
            try {
                pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []);
            } catch(e) {}
            if (!Array.isArray(pairs)) pairs = [];

            let isArrived = false;
            if (pairs.length === 0) {
                const key = `${it.id}_0`;
                const pfs = phoiFabStatus[key];
                isArrived = (pfs && pfs.pending === 0 && pfs.arrived > 0) || (it.material_arrived);
            } else {
                const pIdx = cr.phoi_index !== null && cr.phoi_index !== undefined ? cr.phoi_index : 0;
                const key = `${it.id}_${pIdx}`;
                const pfs = phoiFabStatus[key];
                isArrived = (pfs && pfs.pending === 0 && pfs.arrived > 0);
            }

            const targetIsCutting = isArrived;
            if (cr.is_cutting !== targetIsCutting) {
                const now = vnNow();
                await db.run(
                    `UPDATE cutting_records SET is_cutting = $1, cutting_at = $2 WHERE order_item_id = $3 AND phoi_index = $4`,
                    [targetIsCutting, targetIsCutting ? now : null, cr.order_item_id, cr.phoi_index]
                );
                cr.is_cutting = targetIsCutting; // Update in-memory copy
                console.log(`[QLX FABRIC RECALC] Updated contractor cutting record: item ${cr.order_item_id}, phoi ${cr.phoi_index}, is_cutting = ${targetIsCutting}`);
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
                const isCutOrCutting = itemCuts.some(c => c.is_cut_done || (c.is_cutting && !c.printing_contractor_id));
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

                    const isMatchCutOrCutting = match && (match.is_cut_done || (match.is_cutting && !match.printing_contractor_id));
                    if (isMatchCutOrCutting) {
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

async function releaseReservationsForRoll(rollId, performedBy = 1) {
    if (!rollId) return;
    const now = vnNow();

    try {
        // Find active reservations for this roll
        const activeRes = await db.all(`
            SELECT id, dht_order_id, item_id, phoi_index, roll_code, kg_reserved, unit
            FROM qlx_fabric_reservations 
            WHERE roll_id = $1 AND status IN ('reserved', 'arrived')
        `, [rollId]);

        if (activeRes.length > 0) {
            console.log(`[QLX FABRIC HELPER] Releasing ${activeRes.length} reservations on roll ${rollId} by user ${performedBy}`);
            
            // Release the reservations in DB
            await db.run(`
                UPDATE qlx_fabric_reservations 
                SET status = 'released', updated_at = $1 
                WHERE roll_id = $2 AND status IN ('reserved', 'arrived')
            `, [now, rollId]);

            // Track affected order IDs to recalculate later
            const affectedOrderIds = new Set();

            for (const res of activeRes) {
                affectedOrderIds.add(res.dht_order_id);

                // Insert history entry for reservation release
                await db.run(`
                    INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                    VALUES ($1, 'fabric_release', $2, $3, $4)
                `, [res.dht_order_id, `Tự hủy giữ vải do cây vải bị báo mất/xóa: ${res.roll_code || ''} (${res.kg_reserved}${res.unit || 'kg'})`, performedBy, now]);

                // Check if there are other active reservations for item_id & phoi_index
                const otherActive = await db.get(`
                    SELECT 1 FROM qlx_fabric_reservations
                    WHERE item_id = $1 AND phoi_index = $2 AND status IN ('reserved', 'arrived', 'fulfilled')
                    LIMIT 1
                `, [res.item_id, res.phoi_index]);

                if (!otherActive) {
                    // Delete incomplete cutting record if it exists
                    const cuttingRec = await db.get(`
                        SELECT id FROM cutting_records
                        WHERE order_item_id = $1 AND phoi_index = $2 AND is_cut_done = false
                        LIMIT 1
                    `, [res.item_id, res.phoi_index]);
                    
                    if (cuttingRec) {
                        await db.run('DELETE FROM cutting_records WHERE id = $1', [cuttingRec.id]);
                        console.log(`[QLX FABRIC HELPER] Deleted incomplete cutting record for item ${res.item_id}, phoi ${res.phoi_index}.`);
                        
                        await db.run(`
                            INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                            VALUES ($1, 'fabric_release_reset_claim', $2, $3, $4)
                        `, [res.dht_order_id, `Hủy nhận cắt phối ${res.phoi_index + 1} do hết vải/hủy giữ vải`, performedBy, now]);
                    }
                }
            }

            // Recalculate status for each affected order
            for (const orderId of affectedOrderIds) {
                await recalculateOrderFabricStatus(orderId);
            }
        }
    } catch (err) {
        console.error(`[QLX FABRIC HELPER] Error releasing reservations for roll ${rollId}:`, err);
    }
}

async function releaseReservationsForOrderOrItem(orderId, itemId, userId) {
    if (!orderId) return;
    const now = vnNow();

    try {
        let query = `
            SELECT * FROM qlx_fabric_reservations 
            WHERE dht_order_id = $1 AND status IN ('reserved', 'arrived')
        `;
        const params = [orderId];
        if (itemId) {
            query += ` AND item_id = $2`;
            params.push(itemId);
        }
        const activeRes = await db.all(query, params);
        if (activeRes.length === 0) return;

        for (const res of activeRes) {
            const pi = res.phoi_index !== undefined && res.phoi_index !== null ? res.phoi_index : 0;
            // Release reservation
            await db.run('UPDATE qlx_fabric_reservations SET status = $1, updated_at = $2 WHERE id = $3', ['released', now, res.id]);

            if (res.roll_id) {
                const roll = await db.get('SELECT id, roll_code, location, original_location, return_tx_id FROM kv_rolls WHERE id = $1', [res.roll_id]);
                if (roll) {
                    const otherActiveRes = await db.get(`
                        SELECT 1 FROM qlx_fabric_reservations
                        WHERE roll_id = $1 AND status IN ('reserved', 'arrived', 'fulfilled') AND id != $2
                        LIMIT 1
                    `, [roll.id, res.id]);
                    if (!otherActiveRes) {
                        if (roll.location === '📍 Kệ Dự Định Hoàn Vải' || roll.original_location === '📍 Kệ Dự Định Hoàn Vải') {
                            await db.run(`
                                UPDATE kv_rolls 
                                SET return_requested = true, 
                                    return_requested_by = $1, 
                                    return_requested_at = $2 
                                WHERE id = $3
                            `, [userId, now, roll.id]);
                        }
                        if (roll.return_tx_id) {
                            const txId = roll.return_tx_id;
                            const tx = await db.get('SELECT notes FROM fabric_transactions WHERE id = $1', [txId]);
                            let cleanNotes = tx ? (tx.notes || '') : '';
                            if (cleanNotes.startsWith('[ĐÃ HỦY] ')) {
                                cleanNotes = cleanNotes.substring('[ĐÃ HỦY] '.length);
                            } else {
                                cleanNotes = cleanNotes.replace(/QLX chọn cắt\s+\S+/g, '').trim();
                            }
                            await db.run(`UPDATE fabric_transactions SET is_canceled = false, notes = $1, updated_at = $2 WHERE id = $3`, [cleanNotes, now, txId]);
                            await db.run(`INSERT INTO fabric_tx_history (tx_id, action, details, performed_by, performed_at) VALUES ($1, 'uncancel', $2, $3, $4)`, 
                                [txId, `Hoàn tác hủy do QLX hủy giữ/đánh dấu cắt cây vải ${roll.roll_code || roll.id}`, userId, now]);
                        }
                    }
                }
            }

            // Check if there are other active reservations for this item_id & phoi_index
            const otherActive = await db.get(`
                SELECT 1 FROM qlx_fabric_reservations
                WHERE item_id = $1 AND phoi_index = $2 AND status IN ('reserved', 'arrived', 'fulfilled')
                LIMIT 1
            `, [res.item_id, pi]);
            if (!otherActive) {
                // Delete incomplete cutting record if it exists
                const cuttingRec = await db.get(`
                    SELECT id FROM cutting_records
                    WHERE order_item_id = $1 AND phoi_index = $2 AND is_cut_done = false
                    LIMIT 1
                `, [res.item_id, pi]);
                if (cuttingRec) {
                    await db.run('DELETE FROM cutting_records WHERE id = $1', [cuttingRec.id]);
                    await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                        VALUES ($1, 'fabric_release_reset_claim', $2, $3, $4)`,
                        [res.dht_order_id, `Hủy nhận cắt phối ${pi + 1} do hết vải/hủy giữ vải (Tự động chuyển in 3D cắt)`, userId, now]);
                }
            }

            await db.run(`INSERT INTO qlx_history (dht_order_id, action, details, performed_by, performed_at)
                VALUES ($1, 'fabric_release', $2, $3, $4)`,
                [res.dht_order_id, `Giải phóng tự động (Do chuyển in 3D cắt): ${res.roll_code || 'Gọi vải'} (${res.kg_reserved || res.call_amount}${res.unit})`, userId, now]);

            // ===== CASCADE RELEASE for new_call =====
            if (res.reservation_type === 'new_call') {
                const linkedRows = await db.all(
                    'SELECT id, dht_order_id, item_id, phoi_index FROM qlx_fabric_reservations WHERE linked_call_id=$1 AND status!=$2',
                    [res.id, 'released']);
                for (const lk of linkedRows) {
                    await db.run('UPDATE qlx_fabric_reservations SET status=$1, updated_at=$2 WHERE id=$3', ['released', now, lk.id]);
                }
            }
        }

        // Recalculate status for this order
        await recalculateOrderFabricStatus(orderId);
    } catch (err) {
        console.error(`[QLX FABRIC HELPER] Error releasing reservations for order/item:`, err);
    }
}

module.exports = {
    recalculateOrderFabricStatus,
    releaseReservationsForRoll,
    releaseReservationsForOrderOrItem
};
