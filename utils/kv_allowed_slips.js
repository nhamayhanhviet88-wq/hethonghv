/**
 * Utility to manage allowed slips constraints for fabric colors (kv_fabric_colors).
 * Prevents race conditions using row-level locking (FOR UPDATE) inside database transaction blocks.
 */

// Helper to run query get compatibility between db wrapper and raw pg client
async function executeGet(dbOrClient, sql, params = []) {
    if (typeof dbOrClient.get === 'function') {
        return await dbOrClient.get(sql, params);
    }
    const res = await dbOrClient.query(sql, params);
    return res.rows[0] || null;
}

// Helper to run query run compatibility between db wrapper and raw pg client
async function executeRun(dbOrClient, sql, params = []) {
    if (typeof dbOrClient.run === 'function') {
        return await dbOrClient.run(sql, params);
    }
    const res = await dbOrClient.query(sql, params);
    return { lastInsertRowid: res.rows && res.rows[0] ? res.rows[0].id : 0, changes: res.rowCount };
}

/**
 * Extract unique color IDs used in a single order item (including material pairs).
 * @param {object} item 
 * @returns {number[]}
 */
function getUniqueColorIdsInItem(item) {
    if (!item) return [];
    const colorSet = new Set();
    
    const colId = Number(item.color_id);
    if (!isNaN(colId) && colId > 0) {
        colorSet.add(colId);
    }
    
    let pairs = [];
    if (item.material_pairs) {
        try {
            pairs = typeof item.material_pairs === 'string' 
                ? JSON.parse(item.material_pairs) 
                : item.material_pairs;
        } catch (e) {}
    }
    if (Array.isArray(pairs)) {
        for (const pair of pairs) {
            const pairColId = Number(pair.color_id);
            if (!isNaN(pairColId) && pairColId > 0) {
                colorSet.add(pairColId);
            }
        }
    }
    return Array.from(colorSet);
}

/**
 * Counts how many slips are requested for each color ID from a list of order items.
 * @param {object[]} items 
 * @returns {Record<number, number>} Map of colorId -> slipCount
 */
function getSlipCountsFromItems(items) {
    const counts = {};
    if (!Array.isArray(items)) return counts;
    for (const item of items) {
        const uniqueColors = getUniqueColorIdsInItem(item);
        for (const colId of uniqueColors) {
            counts[colId] = (counts[colId] || 0) + 1;
        }
    }
    return counts;
}

/**
 * Validate and apply slips limit for a new order.
 * @param {object} dbOrClient Database pool wrapper or pg client
 * @param {object[]} items New order items
 */
async function validateAndApplySlipsForNewOrder(dbOrClient, items) {
    const counts = getSlipCountsFromItems(items);
    for (const [colIdStr, reqCount] of Object.entries(counts)) {
        const colId = Number(colIdStr);
        // Lock row to prevent race conditions
        const colorInfo = await executeGet(
            dbOrClient,
            `SELECT id, color_name, is_active, allowed_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
            [colId]
        );
        if (!colorInfo) continue;
        
        if (colorInfo.allowed_slips !== null && colorInfo.allowed_slips !== undefined) {
            const allowed = Number(colorInfo.allowed_slips);
            if (allowed < reqCount) {
                throw new Error(
                    `Màu vải "${colorInfo.color_name}" chỉ còn tối đa ${allowed} lượt tạo phiếu, nhưng đơn hàng này yêu cầu ${reqCount} phiếu.`
                );
            }
            const remaining = allowed - reqCount;
            await executeRun(
                dbOrClient,
                `UPDATE kv_fabric_colors 
                 SET allowed_slips = $1, 
                     is_active = CASE WHEN $1 <= 0 THEN false ELSE is_active END, 
                     updated_at = NOW() 
                 WHERE id = $2`, 
                [remaining, colId]
            );
        }
    }
}

/**
 * Refund slips directly from a list of items (used if order insertion fails after deduction).
 * @param {object} dbOrClient Database pool wrapper or pg client
 * @param {object[]} items List of items to refund
 */
async function refundSlipsForItemsList(dbOrClient, items) {
    const counts = getSlipCountsFromItems(items);
    for (const [colIdStr, count] of Object.entries(counts)) {
        const colId = Number(colIdStr);
        if (count <= 0) continue;
        
        const colorInfo = await executeGet(
            dbOrClient,
            `SELECT id, color_name, is_active, allowed_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
            [colId]
        );
        if (!colorInfo) continue;
        
        if (colorInfo.allowed_slips !== null && colorInfo.allowed_slips !== undefined) {
            const refunded = Number(colorInfo.allowed_slips) + count;
            await executeRun(
                dbOrClient,
                `UPDATE kv_fabric_colors 
                 SET allowed_slips = $1, 
                     is_active = CASE WHEN $1 > 0 THEN true ELSE is_active END, 
                     updated_at = NOW() 
                 WHERE id = $2`, 
                [refunded, colId]
            );
        }
    }
}

/**
 * Validate and apply slips limit updates when modifying an existing order.
 * @param {object} dbOrClient Database pool wrapper or pg client
 * @param {number} orderId ID of the order being edited
 * @param {object[]} newItems New order items from payload
 */
async function validateAndApplySlipsForUpdateOrder(dbOrClient, orderId, newItems) {
    // 1. Fetch old items from DB to compare
    let oldItems = [];
    if (typeof dbOrClient.all === 'function') {
        oldItems = await dbOrClient.all(
            `SELECT id, color_id, material_pairs FROM dht_order_items WHERE dht_order_id = $1`, 
            [orderId]
        );
    } else {
        const res = await dbOrClient.query(
            `SELECT id, color_id, material_pairs FROM dht_order_items WHERE dht_order_id = $1`, 
            [orderId]
        );
        oldItems = res.rows || [];
    }
    
    const oldCounts = getSlipCountsFromItems(oldItems);
    const newCounts = getSlipCountsFromItems(newItems);
    
    // 2. Collect union of all color IDs
    const allColorIds = new Set([
        ...Object.keys(oldCounts).map(Number),
        ...Object.keys(newCounts).map(Number)
    ]);
    
    for (const colId of allColorIds) {
        const oldCnt = oldCounts[colId] || 0;
        const newCnt = newCounts[colId] || 0;
        const delta = newCnt - oldCnt;
        
        if (delta === 0) continue;
        
        // Lock row
        const colorInfo = await executeGet(
            dbOrClient,
            `SELECT id, color_name, is_active, allowed_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
            [colId]
        );
        if (!colorInfo) continue;
        
        if (colorInfo.allowed_slips !== null && colorInfo.allowed_slips !== undefined) {
            const allowed = Number(colorInfo.allowed_slips);
            if (delta > 0) {
                // Slips increased, check limit
                if (allowed < delta) {
                    throw new Error(
                        `Màu vải "${colorInfo.color_name}" chỉ còn tối đa ${allowed} lượt tạo phiếu (Yêu cầu tăng thêm ${delta} phiếu cho đơn hàng này).`
                    );
                }
                const remaining = allowed - delta;
                await executeRun(
                    dbOrClient,
                    `UPDATE kv_fabric_colors 
                     SET allowed_slips = $1, 
                         is_active = CASE WHEN $1 <= 0 THEN false ELSE is_active END, 
                         updated_at = NOW() 
                     WHERE id = $2`, 
                    [remaining, colId]
                );
            } else {
                // Slips decreased, refund slots
                const refunded = allowed + Math.abs(delta);
                await executeRun(
                    dbOrClient,
                    `UPDATE kv_fabric_colors 
                     SET allowed_slips = $1, 
                         is_active = CASE WHEN $1 > 0 THEN true ELSE is_active END, 
                         updated_at = NOW() 
                     WHERE id = $2`, 
                    [refunded, colId]
                );
            }
        }
    }
}

/**
 * Refund slips for an order when it is deleted, or cancelled.
 * @param {object} dbOrClient Database pool wrapper or pg client
 * @param {number} orderId ID of the order being cancelled/deleted
 */
async function refundSlipsForDeletedOrCancelledOrder(dbOrClient, orderId) {
    let oldItems = [];
    if (typeof dbOrClient.all === 'function') {
        oldItems = await dbOrClient.all(
            `SELECT id, color_id, material_pairs FROM dht_order_items WHERE dht_order_id = $1`, 
            [orderId]
        );
    } else {
        const res = await dbOrClient.query(
            `SELECT id, color_id, material_pairs FROM dht_order_items WHERE dht_order_id = $1`, 
            [orderId]
        );
        oldItems = res.rows || [];
    }
    
    await refundSlipsForItemsList(dbOrClient, oldItems);
}

module.exports = {
    validateAndApplySlipsForNewOrder,
    validateAndApplySlipsForUpdateOrder,
    refundSlipsForDeletedOrCancelledOrder,
    refundSlipsForItemsList
};
