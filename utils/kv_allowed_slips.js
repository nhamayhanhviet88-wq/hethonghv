/**
 * Utility to manage allowed orders constraints for fabric colors (kv_fabric_colors).
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
 * Extract union of unique color IDs from a list of order items.
 * @param {object[]} items 
 * @returns {number[]} Unique color IDs
 */
function getUniqueColorsFromItemsList(items) {
    const colorSet = new Set();
    if (!Array.isArray(items)) return [];
    for (const item of items) {
        const uniqueColors = getUniqueColorIdsInItem(item);
        for (const colId of uniqueColors) {
            colorSet.add(colId);
        }
    }
    return Array.from(colorSet).map(Number);
}

/**
 * Validate and apply slips (orders) limit for a new order.
 * @param {object} dbOrClient Database pool wrapper or pg client
 * @param {object[]} items New order items
 */
async function validateAndApplySlipsForNewOrder(dbOrClient, items) {
    const uniqueColors = getUniqueColorsFromItemsList(items);
    for (const colId of uniqueColors) {
        // Lock row to prevent race conditions
        const colorInfo = await executeGet(
            dbOrClient,
            `SELECT id, color_name, is_active, allowed_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
            [colId]
        );
        if (!colorInfo) continue;
        
        if (colorInfo.allowed_slips !== null && colorInfo.allowed_slips !== undefined) {
            const allowed = Number(colorInfo.allowed_slips);
            if (allowed < 1) {
                throw new Error(
                    `Màu vải "${colorInfo.color_name}" đã hết lượt đơn hàng được phép tạo mới.`
                );
            }
            const remaining = allowed - 1;
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
 * Refund slips (orders) directly from a list of items (used if order insertion fails after deduction).
 * @param {object} dbOrClient Database pool wrapper or pg client
 * @param {object[]} items List of items to refund
 */
async function refundSlipsForItemsList(dbOrClient, items) {
    const uniqueColors = getUniqueColorsFromItemsList(items);
    for (const colId of uniqueColors) {
        const colorInfo = await executeGet(
            dbOrClient,
            `SELECT id, color_name, is_active, allowed_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
            [colId]
        );
        if (!colorInfo) continue;
        
        if (colorInfo.allowed_slips !== null && colorInfo.allowed_slips !== undefined) {
            const refunded = Number(colorInfo.allowed_slips) + 1;
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
    
    const oldColors = getUniqueColorsFromItemsList(oldItems);
    const newColors = getUniqueColorsFromItemsList(newItems);
    
    const oldSet = new Set(oldColors);
    const newSet = new Set(newColors);
    
    // Union of all colors used
    const allColors = new Set([...oldColors, ...newColors]);
    
    for (const colId of allColors) {
        const existedBefore = oldSet.has(colId);
        const existsNow = newSet.has(colId);
        
        if (existedBefore && existsNow) {
            // No net change for this color in this order
            continue;
        }
        
        if (!existedBefore && existsNow) {
            // New color added, consume 1 slot
            const colorInfo = await executeGet(
                dbOrClient,
                `SELECT id, color_name, is_active, allowed_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
                [colId]
            );
            if (!colorInfo) continue;
            
            if (colorInfo.allowed_slips !== null && colorInfo.allowed_slips !== undefined) {
                const allowed = Number(colorInfo.allowed_slips);
                if (allowed < 1) {
                    throw new Error(
                        `Màu vải "${colorInfo.color_name}" đã hết lượt đơn hàng được phép tạo mới.`
                    );
                }
                const remaining = allowed - 1;
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
        } else if (existedBefore && !existsNow) {
            // Color completely removed, refund 1 slot
            const colorInfo = await executeGet(
                dbOrClient,
                `SELECT id, color_name, is_active, allowed_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
                [colId]
            );
            if (!colorInfo) continue;
            
            if (colorInfo.allowed_slips !== null && colorInfo.allowed_slips !== undefined) {
                const refunded = Number(colorInfo.allowed_slips) + 1;
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
 * Refund slips (orders) for an order when it is deleted or cancelled.
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
