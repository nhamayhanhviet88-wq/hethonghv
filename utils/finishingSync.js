const db = require('../db/pool');
const { vnDateStr, vnISOString } = require('./timezone');

async function syncFinishingRecord(sewingRecordId, userId, now) {
    try {
        const existing = await db.get(`SELECT id FROM finishing_records WHERE sewing_record_id = $1`, [sewingRecordId]);
        
        const sRec = await db.get(`
            SELECT sr.*, o.shipping_priority, u_cskh.full_name AS cskh_name, COALESCE(dt.name, u.full_name) AS sewer_name, c.name AS contractor_name
            FROM sewing_records sr
            LEFT JOIN dht_orders o ON sr.dht_order_id = o.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u ON sr.sewer_id = u.id
            LEFT JOIN departments dt ON sr.sewing_team_id = dt.id
            LEFT JOIN sewing_contractors c ON sr.contractor_id = c.id
            WHERE sr.id = $1
        `, [sewingRecordId]);
        
        if (sRec) {
            const prodName = sRec.product_name;
            const hasCCHT = await db.get(`
                SELECT 1 FROM dht_product_process pp
                JOIN dht_process_steps ps ON pp.step_id = ps.id
                JOIN dht_products p ON pp.product_id = p.id
                LEFT JOIN dht_order_items oi ON oi.id = $2
                LEFT JOIN dht_settings_options so ON so.category = 'sale_type' AND so.name = oi.sale_type
                WHERE ps.short_name = 'CCHT' AND pp.is_active = true AND ps.is_active = true
                  AND (p.sale_type_id = so.id OR (so.id IS NULL AND p.sale_type_id = 1))
                  AND (p.name = $1 OR p.name = TRIM(COALESCE(oi.product_name, oi.description)) OR $1 LIKE '%' || p.name)
                LIMIT 1
            `, [prodName, sRec.order_item_id]);
            
            if (hasCCHT) {
                const sewerName = sRec.contractor_id ? sRec.contractor_name : sRec.sewer_name;
                const shippingStandard = (sRec.shipping_priority || 'CHUẨN').toLowerCase() === 'gấp' ? 'gap' : 
                                         ((sRec.shipping_priority || 'CHUẨN').toLowerCase() === 'gửi' ? 'gui' : 'chuan');
                
                let isVisible = true;
                if (sRec.sewing_team_id) {
                    const checkTeam = await db.get(`
                        SELECT 1 FROM finishing_display_settings
                        WHERE source_type = 'team' AND source_id = $1 AND is_visible = false
                    `, [sRec.sewing_team_id]);
                    if (checkTeam) isVisible = false;
                }
                if (sRec.contractor_id) {
                    const checkContractor = await db.get(`
                        SELECT 1 FROM finishing_display_settings
                        WHERE source_type = 'contractor' AND source_id = $1 AND is_visible = true
                    `, [sRec.contractor_id]);
                    if (!checkContractor) isVisible = false;
                }

                if (!existing) {
                    const doneDate = isVisible ? null : vnDateStr(now);
                    const isCompleted = !isVisible;
                    const completedAt = isVisible ? null : vnISOString(now);
                    const completedBy = isVisible ? null : userId;

                    const r = await db.get(`
                        INSERT INTO finishing_records (
                            dht_order_id, sewing_record_id, expected_date, done_date, is_completed, completed_at, completed_by, product_name, cskh_name, quantity, sewer_name, shipping_standard, notes, created_by, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id
                    `, [
                        sRec.dht_order_id,
                        sewingRecordId,
                        sRec.expected_date,
                        doneDate,
                        isCompleted,
                        completedAt,
                        completedBy,
                        prodName,
                        sRec.cskh_name,
                        sRec.quantity,
                        sewerName,
                        shippingStandard,
                        sRec.notes,
                        userId,
                        now
                    ]);
                    
                    if (isVisible) {
                        await db.run(`INSERT INTO finishing_history (finishing_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5)`,
                            [r.id, 'create', 'Tạo tự động từ kết quả QC', userId, now]);
                    } else {
                        await db.run(`INSERT INTO finishing_history (finishing_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, $5)`,
                            [r.id, 'complete', 'đơn không có ở mục hoàn thiện', userId, now]);
                    }
                } else {
                    // Update existing finishing record fields
                    await db.run(`
                        UPDATE finishing_records
                        SET expected_date = $1,
                            product_name = $2,
                            quantity = $3,
                            sewer_name = $4,
                            shipping_standard = $5,
                            notes = COALESCE($6, notes)
                        WHERE id = $7
                    `, [sRec.expected_date, prodName, sRec.quantity, sewerName, shippingStandard, sRec.notes, existing.id]);
                }
            }
        }
    } catch(e) {
        console.error('[syncFinishingRecord] Error:', e.message);
    }
}

module.exports = { syncFinishingRecord };
