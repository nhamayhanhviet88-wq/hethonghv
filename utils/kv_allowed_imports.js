/**
 * Utility to manage allowed import slips constraints for fabric colors (kv_fabric_colors).
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
 * Validate and apply import slips limit for a new order.
 * @param {object} dbOrClient Database pool wrapper or pg client
 * @param {object[]} items New order items
 */
async function validateAndApplyImportSlipsForNewOrder(dbOrClient, items) {
    const uniqueColors = getUniqueColorsFromItemsList(items);
    for (const colId of uniqueColors) {
        // Lock row to prevent race conditions
        const colorInfo = await executeGet(
            dbOrClient,
            `SELECT id, color_name, stop_import, allowed_import_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
            [colId]
        );
        if (!colorInfo) continue;
        
        if (colorInfo.allowed_import_slips !== null && colorInfo.allowed_import_slips !== undefined) {
            const allowed = Number(colorInfo.allowed_import_slips);
            if (allowed < 1) {
                throw new Error(
                    `Màu vải "${colorInfo.color_name}" đã hết lượt đơn hàng được phép tạo mới (đối với vải dừng nhập).`
                );
            }
            const remaining = allowed - 1;
            await executeRun(
                dbOrClient,
                `UPDATE kv_fabric_colors 
                 SET allowed_import_slips = $1, 
                     stop_import = CASE WHEN $1 <= 0 THEN true ELSE stop_import END, 
                     updated_at = NOW() 
                 WHERE id = $2`, 
                [remaining, colId]
            );
        }
    }
}

/**
 * Refund import slips directly from a list of items (used if order insertion fails after deduction).
 * @param {object} dbOrClient Database pool wrapper or pg client
 * @param {object[]} items List of items to refund
 */
async function refundImportSlipsForItemsList(dbOrClient, items) {
    const uniqueColors = getUniqueColorsFromItemsList(items);
    for (const colId of uniqueColors) {
        const colorInfo = await executeGet(
            dbOrClient,
            `SELECT id, color_name, stop_import, allowed_import_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
            [colId]
        );
        if (!colorInfo) continue;
        
        if (colorInfo.allowed_import_slips !== null && colorInfo.allowed_import_slips !== undefined) {
            const refunded = Number(colorInfo.allowed_import_slips) + 1;
            await executeRun(
                dbOrClient,
                `UPDATE kv_fabric_colors 
                 SET allowed_import_slips = $1, 
                     stop_import = CASE WHEN $1 > 0 THEN false ELSE stop_import END, 
                     updated_at = NOW() 
                 WHERE id = $2`, 
                [refunded, colId]
            );
        } else if (colorInfo.stop_import) {
            // If it was already stopped and allowed_import_slips was null, check if we need to restore 1 slot
            // Wait, if it was auto-locked when it hit 0, allowed_import_slips became NULL and stop_import became true.
            // But we don't know for sure if it was auto-locked or locked manually.
            // Wait, how did kv_allowed_slips handle this?
            // Let's check kv_allowed_slips.js lines 126-137:
            // "if (colorInfo.allowed_slips !== null && colorInfo.allowed_slips !== undefined) { ... }"
            // Since allowed_slips is kept as 0 when reached, refunding just does 0 + 1 = 1 and sets is_active = true.
            // Wait! In my query above for UPDATE:
            // "allowed_import_slips = CASE WHEN $1 <= 0 THEN NULL ELSE $1 END"
            // Wait! If we set it to NULL, then we lose the information that it had a limit!
            // Ah! Let's check what kv_allowed_slips did:
            // "allowed_slips = $1, is_active = CASE WHEN $1 <= 0 THEN false ELSE is_active END"
            // Oh! It did NOT set allowed_slips to NULL when it became 0! It kept it as 0!
            // That is so smart! If it keeps it as 0, then:
            // 1. The badge shows "Còn 0 đơn" or the system knows it has a limit of 0.
            // 2. Refunding can increment it from 0 to 1 and re-enable it.
            // This is extremely simple and elegant.
            // Let's change our code to KEEP the limit as 0 (and NOT set to NULL) when it reaches <= 0!
            // Yes! That makes it exactly identical to the allowed_slips behavior.
            // Let's rewrite this part.
        }
    }
}

/**
 * Validate and apply import slips limit updates when modifying an existing order.
 * @param {object} dbOrClient Database pool wrapper or pg client
 * @param {number} orderId ID of the order being edited
 * @param {object[]} newItems New order items from payload
 */
async function validateAndApplyImportSlipsForUpdateOrder(dbOrClient, orderId, newItems) {
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
    
    const allColors = new Set([...oldColors, ...newColors]);
    
    for (const colId of allColors) {
        const existedBefore = oldSet.has(colId);
        const existsNow = newSet.has(colId);
        
        if (existedBefore && existsNow) {
            continue;
        }
        
        if (!existedBefore && existsNow) {
            const colorInfo = await executeGet(
                dbOrClient,
                `SELECT id, color_name, stop_import, allowed_import_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
                [colId]
            );
            if (!colorInfo) continue;
            
            if (colorInfo.allowed_import_slips !== null && colorInfo.allowed_import_slips !== undefined) {
                const allowed = Number(colorInfo.allowed_import_slips);
                if (allowed < 1) {
                    throw new Error(
                        `Màu vải "${colorInfo.color_name}" đã hết lượt đơn hàng được phép tạo mới (đối với vải dừng nhập).`
                    );
                }
                const remaining = allowed - 1;
                await executeRun(
                    dbOrClient,
                    `UPDATE kv_fabric_colors 
                     SET allowed_import_slips = $1, 
                         stop_import = CASE WHEN $1 <= 0 THEN true ELSE stop_import END, 
                         updated_at = NOW() 
                     WHERE id = $2`, 
                    [remaining, colId]
                );
            }
        } else if (existedBefore && !existsNow) {
            const colorInfo = await executeGet(
                dbOrClient,
                `SELECT id, color_name, stop_import, allowed_import_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
                [colId]
            );
            if (!colorInfo) continue;
            
            if (colorInfo.allowed_import_slips !== null && colorInfo.allowed_import_slips !== undefined) {
                const refunded = Number(colorInfo.allowed_import_slips) + 1;
                await executeRun(
                    dbOrClient,
                    `UPDATE kv_fabric_colors 
                     SET allowed_import_slips = $1, 
                         stop_import = CASE WHEN $1 > 0 THEN false ELSE stop_import END, 
                         updated_at = NOW() 
                     WHERE id = $2`, 
                    [refunded, colId]
                );
            }
        }
    }
}

/**
 * Refund import slips (orders) for an order when it is deleted or cancelled.
 * @param {object} dbOrClient Database pool wrapper or pg client
 * @param {number} orderId ID of the order being cancelled/deleted
 */
async function refundImportSlipsForDeletedOrCancelledOrder(dbOrClient, orderId) {
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
    
    const uniqueColors = getUniqueColorsFromItemsList(oldItems);
    for (const colId of uniqueColors) {
        const colorInfo = await executeGet(
            dbOrClient,
            `SELECT id, color_name, stop_import, allowed_import_slips FROM kv_fabric_colors WHERE id = $1 FOR UPDATE`, 
            [colId]
        );
        if (!colorInfo) continue;
        
        if (colorInfo.allowed_import_slips !== null && colorInfo.allowed_import_slips !== undefined) {
            const refunded = Number(colorInfo.allowed_import_slips) + 1;
            await executeRun(
                dbOrClient,
                `UPDATE kv_fabric_colors 
                 SET allowed_import_slips = $1, 
                     stop_import = CASE WHEN $1 > 0 THEN false ELSE stop_import END, 
                     updated_at = NOW() 
                 WHERE id = $2`, 
                [refunded, colId]
            );
        }
    }
}

module.exports = {
    validateAndApplyImportSlipsForNewOrder,
    validateAndApplyImportSlipsForUpdateOrder,
    refundImportSlipsForDeletedOrCancelledOrder,
    refundImportSlipsForItemsList
};
