// ========== CUSTOMER ERROR ORDERS — Đơn Lỗi Khách Hàng ==========
const db = require('../db/pool');
const path = require('path');
const fs = require('fs');
const { vnNow } = require('../utils/timezone');

// Image upload directory
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'customer-errors');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

async function routes(fastify) {
    // ========== AUTH MIDDLEWARE ==========
    const { authenticate } = require('../middleware/auth');

    // ========== GET /api/customer-errors/tree — Sidebar tree data ==========
    fastify.get('/api/customer-errors/tree', { preHandler: authenticate }, async (request) => {
        const rows = await db.all(`
            SELECT
                EXTRACT(YEAR FROM report_date)::int AS year,
                EXTRACT(MONTH FROM report_date)::int AS month,
                COUNT(*)::int AS count
            FROM customer_error_orders
            GROUP BY EXTRACT(YEAR FROM report_date), EXTRACT(MONTH FROM report_date)
            ORDER BY year DESC, month DESC
        `);
        const total = rows.reduce((s, r) => s + r.count, 0);
        return { tree: rows, total };
    });

    // ========== GET /api/customer-errors — List with filters ==========
    fastify.get('/api/customer-errors', { preHandler: authenticate }, async (request) => {
        const { year, month } = request.query;
        let where = '';
        const params = [];
        if (year) {
            params.push(Number(year));
            where += ` AND EXTRACT(YEAR FROM ceo.report_date) = $${params.length}`;
        }
        if (month) {
            params.push(Number(month));
            where += ` AND EXTRACT(MONTH FROM ceo.report_date) = $${params.length}`;
        }

        const rows = await db.all(`
            SELECT ceo.*,
                   u.full_name AS created_by_name,
                   u_qlx.full_name AS qlx_updated_by_name
            FROM customer_error_orders ceo
            LEFT JOIN users u ON u.id = ceo.created_by
            LEFT JOIN users u_qlx ON u_qlx.id = ceo.qlx_updated_by
            WHERE 1=1 ${where}
            ORDER BY ceo.report_date DESC, ceo.id DESC
        `, params);

        return { items: rows };
    });

    // ========== GET /api/customer-errors/by-order/:orderId/return-status — Check return status ==========
    // ★ MUST be registered BEFORE /:id to prevent route conflict
    fastify.get('/api/customer-errors/by-order/:orderId/return-status', { preHandler: authenticate }, async (request) => {
        const orderId = Number(request.params.orderId);
        const rows = await db.all(`
            SELECT ceo.id, ceo.order_code, ceo.error_return_handed_over, ceo.error_return_handed_to,
                   ceo.error_return_notes, ceo.error_return_at, ceo.error_return_by,
                   u.full_name AS error_return_by_name
            FROM customer_error_orders ceo
            LEFT JOIN users u ON u.id = ceo.error_return_by
            WHERE ceo.dht_order_id = $1
            ORDER BY ceo.id DESC
        `, [orderId]);
        return { items: rows };
    });

    // ========== EXTERNAL VIOLATORS (Bên Gia Công) — MUST be before /:id ==========
    fastify.get('/api/customer-errors/external-violators', { preHandler: authenticate }, async () => {
        const rows = await db.all('SELECT id, name, created_at FROM ceo_external_violators ORDER BY name ASC');
        return { items: rows };
    });

    // ========== GET /api/customer-errors/:id — Detail ==========
    fastify.get('/api/customer-errors/:id', { preHandler: authenticate }, async (request) => {
        const row = await db.get(`
            SELECT ceo.*,
                   u.full_name AS created_by_name,
                   u_qlx.full_name AS qlx_updated_by_name
            FROM customer_error_orders ceo
            LEFT JOIN users u ON u.id = ceo.created_by
            LEFT JOIN users u_qlx ON u_qlx.id = ceo.qlx_updated_by
            WHERE ceo.id = $1
        `, [request.params.id]);
        if (!row) return { error: 'Không tìm thấy' };
        return { item: row };
    });

    // ========== POST /api/customer-errors — Create ==========
    fastify.post('/api/customer-errors', { preHandler: authenticate }, async (request) => {
        const b = request.body;
        const userId = request.user.id;

        if (!b.report_date) return { error: 'Ngày báo cáo lỗi là bắt buộc' };

        const result = await db.get(`
            INSERT INTO customer_error_orders (
                order_code, report_date, cskh_name, error_quantity,
                error_content, error_images, sale_resolution,
                violator_name, production_cost, shipping_cost,
                violation_month, penalty_month, violator_commitment,
                fix_plan, common_error_type, dht_order_id,
                customer_name, production_quantity, linh_vuc, created_by, error_department
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
            RETURNING id
        `, [
            b.order_code || null,
            b.report_date,
            b.cskh_name || null,
            Number(b.error_quantity) || 0,
            b.error_content || null,
            JSON.stringify(b.error_images || []),
            b.sale_resolution || null,
            b.violator_name || null,
            Number(b.production_cost) || 0,
            Number(b.shipping_cost) || 0,
            b.violation_month || null,
            b.penalty_month || null,
            b.violator_commitment || null,
            b.fix_plan || null,
            b.common_error_type || null,
            b.dht_order_id ? Number(b.dht_order_id) : null,
            b.customer_name || null,
            Number(b.production_quantity) || 0,
            b.linh_vuc || null,
            userId,
            b.error_department || null
        ]);

        // ★ Create audit log entry for DHT order history
        if (b.dht_order_id && result && result.id) {
            try {
                const auditResult = await db.get(
                    `INSERT INTO dht_audit_logs (dht_order_id, action, summary, changes, performed_by)
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [
                        Number(b.dht_order_id),
                        'error',
                        '🚨 Đã báo đơn lỗi — SL lỗi: ' + (Number(b.error_quantity) || 0),
                        JSON.stringify([
                            { field: 'error_quantity', label: 'Số lượng lỗi', old: null, new: String(Number(b.error_quantity) || 0) },
                            { field: 'error_content', label: 'Nội dung lỗi', old: null, new: b.error_content || '' }
                        ]),
                        userId
                    ]
                );
                var auditLogId = auditResult ? auditResult.id : null;
            } catch(auditErr) { console.error('[AuditLog] error report:', auditErr.message); var auditLogId = null; }
        }

        // ★★★ AUTO-LINK: Đơn Lỗi → Phiếu Xử Lý CV ★★★
        let linkedTicketId = null;
        let linkedReplyId = null;
        if (b.order_code && b.order_code.trim()) {
            try {
                const orderCode = b.order_code.trim();
                const errorImages = b.error_images || [];
                const errorQty = Number(b.error_quantity) || 0;
                const errorContent = b.error_content || '(không có nội dung)';

                // Build reply message
                let replyMsg = '🚨 ĐƠN LỖI MỚI — SL lỗi: ' + errorQty;
                replyMsg += '\n→ Nội dung: ' + errorContent;
                if (errorImages.length) replyMsg += '\n→ Hình ảnh lỗi: ' + errorImages.length + ' ảnh';

                // Build attachments from error images
                const attachments = errorImages.map(url => ({ type: 'image', url }));

                // Check if work ticket exists for this order_code
                const existingTicket = await db.get(
                    `SELECT id, status, priority_level FROM work_tickets WHERE order_code = $1`,
                    [orderCode]
                );

                if (existingTicket) {
                    // === CASE B: Ticket EXISTS → Add reply + escalate ===
                    linkedTicketId = existingTicket.id;

                    // B1: Add reply (images empty now — will be updated in finalize-audit)
                    const replyRow = await db.get(
                        `INSERT INTO work_ticket_replies (ticket_id, user_id, message, attachments, metadata, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                        [
                            existingTicket.id,
                            userId,
                            replyMsg,
                            '[]',
                            JSON.stringify({ auto_error: true, error_order_id: result.id }),
                            vnNow()
                        ]
                    );
                    if (replyRow) linkedReplyId = replyRow.id;

                    // B2: Escalate to urgent + recalculate deadline
                    const urgentSetting = await db.get(`SELECT * FROM priority_settings WHERE priority_key = 'urgent'`);
                    let newDeadline = null;
                    if (urgentSetting && urgentSetting.duration_hours) {
                        // Simple deadline: now + duration_hours (in business hours via work_schedules)
                        const durationMin = Math.round(parseFloat(urgentSetting.duration_hours) * 60);
                        const nowTime = vnNow();
                        // Load work sessions
                        const sessions = (await db.all(`SELECT start_time, end_time FROM work_schedules WHERE role_type = 'qlx' ORDER BY display_order`))
                            .map(r => {
                                const [sh, sm] = r.start_time.split(':').map(Number);
                                const [eh, em] = r.end_time.split(':').map(Number);
                                return { start: sh * 60 + (sm || 0), end: eh * 60 + (em || 0) };
                            });
                        const holidays = (await db.all(`SELECT holiday_date FROM holidays`)).map(r => {
                            const d = r.holiday_date;
                            return typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().slice(0, 10);
                        });

                        // Calculate business deadline
                        let cursor = new Date(nowTime);
                        let remaining = durationMin;
                        const isHolSun = (dt) => dt.getDay() === 0 || holidays.includes(dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0'));
                        const getMin = (dt) => dt.getHours() * 60 + dt.getMinutes();

                        let safety = 0;
                        while (remaining > 0 && safety < 500) {
                            safety++;
                            if (isHolSun(cursor)) {
                                cursor.setDate(cursor.getDate() + 1);
                                cursor.setHours(Math.floor(sessions[0].start / 60), sessions[0].start % 60, 0, 0);
                                while (isHolSun(cursor)) cursor.setDate(cursor.getDate() + 1);
                                continue;
                            }
                            const m = getMin(cursor);
                            let inSession = false;
                            for (const sess of sessions) {
                                if (m >= sess.start && m < sess.end) {
                                    const avail = sess.end - m;
                                    if (remaining <= avail) { cursor.setMinutes(cursor.getMinutes() + remaining); remaining = 0; }
                                    else { remaining -= avail; cursor.setHours(Math.floor(sess.end / 60), sess.end % 60, 0, 0); }
                                    inSession = true; break;
                                }
                            }
                            if (!inSession) {
                                let found = false;
                                for (const sess of sessions) {
                                    if (m < sess.start) { cursor.setHours(Math.floor(sess.start / 60), sess.start % 60, 0, 0); found = true; break; }
                                }
                                if (!found) {
                                    cursor.setDate(cursor.getDate() + 1);
                                    cursor.setHours(Math.floor(sessions[0].start / 60), sessions[0].start % 60, 0, 0);
                                    while (isHolSun(cursor)) cursor.setDate(cursor.getDate() + 1);
                                }
                            }
                        }
                        newDeadline = cursor;
                    }

                    // B3: Update ticket — re-open if closed/resolved + set urgent
                    await db.run(
                        `UPDATE work_tickets SET
                            priority_level = 'urgent',
                            priority = 'GẤP',
                            status = 'pending',
                            is_overdue = false,
                            overdue_at = NULL,
                            resolved_at = NULL,
                            deadline_at = $1,
                            due_date = ($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
                            updated_at = $2
                        WHERE id = $3`,
                        [newDeadline ? newDeadline.toISOString() : null, vnNow(), existingTicket.id]
                    );

                    console.log(`[ErrorAutoLink] ✅ Linked error to existing ticket #${existingTicket.id} (${orderCode}) — escalated to urgent`);

                } else {
                    // === CASE C: No ticket → Auto-create ===
                    // C1: Find QLX manager
                    const allDepts = await db.all(`SELECT id, name, parent_id FROM departments ORDER BY name`);
                    const xuongDept = allDepts.find(d => d.name && d.name.toUpperCase().indexOf('XƯỞNG HV') !== -1);
                    let xuongDeptIds = [];
                    if (xuongDept) {
                        xuongDeptIds.push(xuongDept.id);
                        function collectChildren(pid) { allDepts.forEach(d => { if (d.parent_id === pid) { xuongDeptIds.push(d.id); collectChildren(d.id); } }); }
                        collectChildren(xuongDept.id);
                    }
                    let qlxId = null;
                    if (xuongDeptIds.length > 0) {
                        const ph = xuongDeptIds.map((_, i) => `$${i + 1}`).join(',');
                        const mgr = await db.get(`SELECT id FROM users WHERE role = 'quan_ly_cap_cao' AND department_id IN (${ph}) AND status = 'active' ORDER BY id LIMIT 1`, xuongDeptIds);
                        if (mgr) qlxId = mgr.id;
                    }
                    if (!qlxId) {
                        const fallback = await db.get(`SELECT id FROM users WHERE role = 'quan_ly_cap_cao' AND status = 'active' ORDER BY id LIMIT 1`);
                        if (fallback) qlxId = fallback.id;
                    }

                    if (qlxId) {
                        // C2: Create ticket
                        const ticketCode = orderCode;
                        const ticketTitle = '🚨 ĐƠN LỖI — ' + orderCode;
                        const ticketDesc = 'SL lỗi: ' + errorQty + '\nNội dung: ' + errorContent;

                        // Check ticket_code doesn't conflict
                        const codeExists = await db.get(`SELECT id FROM work_tickets WHERE ticket_code = $1`, [ticketCode]);
                        if (!codeExists) {
                            // Calculate urgent deadline
                            const urgentSetting = await db.get(`SELECT * FROM priority_settings WHERE priority_key = 'urgent'`);
                            let deadlineAt = null;
                            if (urgentSetting && urgentSetting.duration_hours) {
                                const ms = parseFloat(urgentSetting.duration_hours) * 60 * 60 * 1000;
                                deadlineAt = new Date(vnNow().getTime() + ms); // simplified for new ticket
                            }

                            const nowISO = vnNow().toISOString();
                            await db.run(
                                `INSERT INTO work_tickets (ticket_code, type, order_id, order_code, title, description, priority, priority_level, status, created_by, assigned_to, due_date, deadline_at, created_at, updated_at)
                                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)`,
                                [
                                    ticketCode, 'order', b.dht_order_id ? Number(b.dht_order_id) : null, orderCode,
                                    ticketTitle, ticketDesc, 'GẤP', 'urgent', 'pending',
                                    userId, qlxId,
                                    deadlineAt ? deadlineAt.toISOString().slice(0, 10) : null,
                                    deadlineAt ? deadlineAt.toISOString() : null,
                                    nowISO
                                ]
                            );

                            const newTicket = await db.get(`SELECT id FROM work_tickets WHERE ticket_code = $1`, [ticketCode]);
                            if (newTicket) {
                                linkedTicketId = newTicket.id;
                                // C3: Add auto-error reply (attachments updated in finalize-audit)
                                const newReplyRow = await db.get(
                                    `INSERT INTO work_ticket_replies (ticket_id, user_id, message, attachments, metadata, created_at)
                                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                                    [newTicket.id, userId, replyMsg, '[]',
                                     JSON.stringify({ auto_error: true, error_order_id: result.id }), vnNow()]
                                );
                                if (newReplyRow) linkedReplyId = newReplyRow.id;
                            }
                            console.log(`[ErrorAutoLink] ✅ Created NEW ticket ${ticketCode} for error → assigned to QLX #${qlxId}`);
                        } else {
                            console.log(`[ErrorAutoLink] ⚠️ Ticket code ${ticketCode} already exists but order_code mismatch — skipped`);
                        }
                    } else {
                        console.log(`[ErrorAutoLink] ⚠️ No QLX manager found — skipped auto-create ticket`);
                    }
                }
            } catch (linkErr) {
                console.error('[ErrorAutoLink] ❌ Error:', linkErr.message);
                // Non-blocking — error order was already created successfully
            }
        }

        return { success: true, id: result.id, audit_log_id: auditLogId || null, linked_ticket_id: linkedTicketId, linked_reply_id: linkedReplyId };
    });

    // ========== PUT /api/customer-errors/:id — Update ==========
    fastify.put('/api/customer-errors/:id', { preHandler: authenticate }, async (request) => {
        const b = request.body;
        const id = request.params.id;

        const existing = await db.get('SELECT id FROM customer_error_orders WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy đơn lỗi' };

        await db.run(`
            UPDATE customer_error_orders SET
                order_code = $1, report_date = $2, cskh_name = $3,
                error_quantity = $4, error_content = $5, error_images = $6,
                sale_resolution = $7, violator_name = $8,
                production_cost = $9, shipping_cost = $10,
                violation_month = $11, penalty_month = $12,
                violator_commitment = $13, fix_plan = $14,
                common_error_type = $15, dht_order_id = $16,
                customer_name = $17, production_quantity = $18,
                linh_vuc = $19, error_department = $20, updated_at = NOW()
            WHERE id = $21
        `, [
            b.order_code || null,
            b.report_date,
            b.cskh_name || null,
            Number(b.error_quantity) || 0,
            b.error_content || null,
            JSON.stringify(b.error_images || []),
            b.sale_resolution || null,
            b.violator_name || null,
            Number(b.production_cost) || 0,
            Number(b.shipping_cost) || 0,
            b.violation_month || null,
            b.penalty_month || null,
            b.violator_commitment || null,
            b.fix_plan || null,
            b.common_error_type || null,
            b.dht_order_id ? Number(b.dht_order_id) : null,
            b.customer_name || null,
            Number(b.production_quantity) || 0,
            b.linh_vuc || null,
            b.error_department || null,
            id
        ]);

        return { success: true };
    });

    // ========== PATCH /api/customer-errors/:id/field — Inline field update ==========
    fastify.patch('/api/customer-errors/:id/field', { preHandler: authenticate }, async (request) => {
        const { field, value } = request.body;
        const id = request.params.id;

        // Whitelist of editable fields
        const ALLOWED = [
            'order_code', 'report_date', 'cskh_name', 'error_quantity',
            'error_content', 'sale_resolution', 'violator_name',
            'production_cost', 'shipping_cost', 'violation_month',
            'penalty_month', 'violator_commitment', 'fix_plan', 'common_error_type',
            'error_department', 'resolution_status', 'penalty_total', 'penalty_per_person', 'phat_updated_at',
            'cost_cut', 'cost_print', 'cost_press', 'cost_sew', 'cost_collar', 'cost_discount', 'cost_discount',
            'cost_material_other', 'cost_other', 'ship_return', 'ship_delivery', 'ship_other'
        ];
        if (!ALLOWED.includes(field)) return { error: 'Trường không hợp lệ' };

        const numericFields = ['error_quantity', 'production_cost', 'shipping_cost', 'penalty_total',
            'cost_cut', 'cost_print', 'cost_press', 'cost_sew', 'cost_collar',
            'cost_material_other', 'cost_other', 'cost_discount', 'ship_return', 'ship_delivery', 'ship_other'];
        const finalValue = numericFields.includes(field) ? (Number(value) || 0) : (value || null);

        console.log(`[CEO PATCH] id=${id} field=${field} value=${typeof value === 'string' ? value.substring(0, 80) : value} finalValue=${typeof finalValue === 'string' ? finalValue.substring(0, 80) : finalValue}`);

        await db.run(
            `UPDATE customer_error_orders SET ${field} = $1, updated_at = NOW() WHERE id = $2`,
            [finalValue, id]
        );

        return { success: true };
    });

    // ========== PATCH /api/customer-errors/:id/qlx-update — Atomic QLX update ==========
    fastify.patch('/api/customer-errors/:id/qlx-update', { preHandler: authenticate }, async (request) => {
        const id = request.params.id;
        const { common_error_type, sale_resolution, violator_name } = request.body;

        if (!common_error_type) return { error: 'Vui lòng chọn Lỗi Thường Gặp' };
        if (!sale_resolution || sale_resolution.trim() === '' || sale_resolution.trim() === '1. ') return { error: 'Vui lòng nhập Cách Xử Lý Lỗi QLX' };
        if (!violator_name || violator_name.trim() === '') return { error: 'Vui lòng chọn Người Vi Phạm' };

        const existing = await db.get('SELECT id FROM customer_error_orders WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy đơn lỗi' };

        await db.run(`
            UPDATE customer_error_orders SET
                common_error_type = $1,
                sale_resolution = $2,
                violator_name = $3,
                qlx_updated_at = NOW(),
                qlx_updated_by = $4,
                updated_at = NOW()
            WHERE id = $5
        `, [common_error_type, sale_resolution.trim(), violator_name.trim(), request.user.id, id]);

        return { success: true };
    });


    fastify.post('/api/customer-errors/external-violators', { preHandler: authenticate }, async (request) => {
        if (request.user.role !== 'giam_doc') return { error: 'Chỉ Giám Đốc mới được thêm' };
        const { name } = request.body || {};
        if (!name || !name.trim()) return { error: 'Tên không được trống' };
        try {
            const result = await db.get('INSERT INTO ceo_external_violators (name) VALUES ($1) RETURNING id, name', [name.trim()]);
            return { success: true, item: result };
        } catch(e) {
            if (e.message && e.message.includes('unique')) return { error: 'Tên này đã tồn tại' };
            throw e;
        }
    });

    fastify.delete('/api/customer-errors/external-violators/:id', { preHandler: authenticate }, async (request) => {
        if (request.user.role !== 'giam_doc') return { error: 'Chỉ Giám Đốc mới được xóa' };
        await db.exec('DELETE FROM ceo_external_violators WHERE id = $1', [request.params.id]);
        return { success: true };
    });

    // ========== DELETE /api/customer-errors/:id — Delete ==========
    fastify.delete('/api/customer-errors/:id', { preHandler: authenticate }, async (request) => {
        // Only GĐ/QL can delete
        if (!['giam_doc', 'quan_ly_cap_cao', 'quan_ly'].includes(request.user.role)) {
            return { error: 'Không có quyền xóa' };
        }

        const existing = await db.get('SELECT id, error_images FROM customer_error_orders WHERE id = $1', [request.params.id]);
        if (!existing) return { error: 'Không tìm thấy' };

        // Delete associated images
        try {
            const images = JSON.parse(existing.error_images || '[]');
            for (const img of images) {
                const filePath = path.join(__dirname, '..', img.replace(/^\//, ''));
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        } catch(e) { /* silent */ }

        await db.run('DELETE FROM customer_error_orders WHERE id = $1', [request.params.id]);
        return { success: true };
    });

    // ========== POST /api/customer-errors/:id/images — Upload images ==========
    fastify.post('/api/customer-errors/:id/images', { preHandler: authenticate }, async (request) => {
        const id = request.params.id;
        const existing = await db.get('SELECT id, error_images FROM customer_error_orders WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy đơn lỗi' };

        const parts = request.parts();
        const uploadedUrls = [];

        for await (const part of parts) {
            if (part.type === 'file' && part.filename) {
                const ext = path.extname(part.filename).toLowerCase() || '.jpg';
                const fileName = `ceo_${id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
                const filePath = path.join(UPLOAD_DIR, fileName);

                const chunks = [];
                for await (const chunk of part.file) {
                    chunks.push(chunk);
                }
                fs.writeFileSync(filePath, Buffer.concat(chunks));
                uploadedUrls.push(`/uploads/customer-errors/${fileName}`);
            }
        }

        // Merge with existing images
        let currentImages = [];
        try { currentImages = JSON.parse(existing.error_images || '[]'); } catch(e) {}
        const allImages = [...currentImages, ...uploadedUrls];

        await db.run(
            'UPDATE customer_error_orders SET error_images = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(allImages), id]
        );

        return { success: true, images: allImages };
    });

    // ========== DELETE /api/customer-errors/:id/images — Remove single image ==========
    fastify.delete('/api/customer-errors/:id/images', { preHandler: authenticate }, async (request) => {
        const id = request.params.id;
        const { image_url } = request.body;

        const existing = await db.get('SELECT id, error_images FROM customer_error_orders WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy đơn lỗi' };

        let currentImages = [];
        try { currentImages = JSON.parse(existing.error_images || '[]'); } catch(e) {}

        // Remove from array
        const filtered = currentImages.filter(img => img !== image_url);

        // Delete file
        try {
            const filePath = path.join(__dirname, '..', image_url.replace(/^\//, ''));
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch(e) { /* silent */ }

        await db.run(
            'UPDATE customer_error_orders SET error_images = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(filtered), id]
        );

        return { success: true, images: filtered };
    });

    // ========== POST /api/customer-errors/:id/video — Upload video ==========
    fastify.post('/api/customer-errors/:id/video', { preHandler: authenticate }, async (request) => {
        const id = request.params.id;
        const existing = await db.get('SELECT id FROM customer_error_orders WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy đơn lỗi' };

        const parts = request.parts();
        let videoUrl = null;

        for await (const part of parts) {
            if (part.type === 'file' && part.filename) {
                const ext = path.extname(part.filename).toLowerCase() || '.mp4';
                const fileName = `ceo_video_${id}_${Date.now()}${ext}`;
                const filePath = path.join(UPLOAD_DIR, fileName);

                const chunks = [];
                for await (const chunk of part.file) {
                    chunks.push(chunk);
                }
                fs.writeFileSync(filePath, Buffer.concat(chunks));
                videoUrl = `/uploads/customer-errors/${fileName}`;
            }
        }

        if (videoUrl) {
            await db.run(
                'UPDATE customer_error_orders SET error_video = $1, updated_at = NOW() WHERE id = $2',
                [videoUrl, id]
            );
        }

        return { success: true, video: videoUrl };
    });

    // ========== COMMON ERRORS — Lỗi Thường Gặp & Xử Lý ==========

    // GET /api/common-errors/tree — sidebar tree grouped by year/month
    fastify.get('/api/common-errors/tree', { preHandler: authenticate }, async () => {
        const rows = await db.all(`
            SELECT
                EXTRACT(YEAR FROM report_date)::int AS year,
                EXTRACT(MONTH FROM report_date)::int AS month,
                COUNT(*)::int AS count,
                COUNT(*) FILTER (WHERE resolution_status = 'pending' OR resolution_status IS NULL)::int AS pending,
                COUNT(*) FILTER (WHERE resolution_status = 'in_progress')::int AS in_progress,
                COUNT(*) FILTER (WHERE resolution_status = 'resolved')::int AS resolved
            FROM customer_error_orders
            GROUP BY EXTRACT(YEAR FROM report_date), EXTRACT(MONTH FROM report_date)
            ORDER BY year DESC, month DESC
        `);
        const total = rows.reduce((s, r) => s + r.count, 0);
        const totalPending = rows.reduce((s, r) => s + r.pending, 0);
        const totalInProgress = rows.reduce((s, r) => s + r.in_progress, 0);
        const totalResolved = rows.reduce((s, r) => s + r.resolved, 0);
        return { tree: rows, total, totalPending, totalInProgress, totalResolved };
    });

    // GET /api/common-errors/list — full list with repeat_count
    fastify.get('/api/common-errors/list', { preHandler: authenticate }, async (request) => {
        const { year, month, department, status } = request.query;
        let where = 'WHERE 1=1';
        const params = [];
        let idx = 1;

        if (year) { where += ` AND EXTRACT(YEAR FROM ceo.report_date) = $${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM ceo.report_date) = $${idx++}`; params.push(Number(month)); }
        if (department) { where += ` AND ceo.error_department = $${idx++}`; params.push(department); }
        if (status) {
            if (status === 'pending') where += ` AND (ceo.resolution_status = 'pending' OR ceo.resolution_status IS NULL)`;
            else { where += ` AND ceo.resolution_status = $${idx++}`; params.push(status); }
        }

        const items = await db.all(`
            SELECT ceo.*,
                   u.full_name AS created_by_name,
                   u2.full_name AS resolved_by_name,
                   COUNT(*) OVER (PARTITION BY ceo.common_error_type, ceo.error_department)::int AS repeat_count
            FROM customer_error_orders ceo
            LEFT JOIN users u ON u.id = ceo.created_by
            LEFT JOIN users u2 ON u2.id = ceo.resolved_by
            ${where}
            ORDER BY ceo.report_date DESC, ceo.id DESC
        `, params);

        return { items };
    });

    // GET /api/common-errors/stats — aggregate stats by department
    fastify.get('/api/common-errors/stats', { preHandler: authenticate }, async (request) => {
        const { year, month } = request.query;
        let where = '';
        const params = [];
        let idx = 1;
        if (year) { where += ` AND EXTRACT(YEAR FROM report_date) = $${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM report_date) = $${idx++}`; params.push(Number(month)); }

        const rows = await db.all(`
            SELECT
                error_department,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE resolution_status = 'pending' OR resolution_status IS NULL)::int AS pending,
                COUNT(*) FILTER (WHERE resolution_status = 'in_progress')::int AS in_progress,
                COUNT(*) FILTER (WHERE resolution_status = 'resolved')::int AS resolved
            FROM customer_error_orders
            WHERE 1=1 ${where}
            GROUP BY error_department
            ORDER BY total DESC
        `, params);

        // Overall stats
        const overall = await db.get(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE resolution_status = 'pending' OR resolution_status IS NULL)::int AS pending,
                COUNT(*) FILTER (WHERE resolution_status = 'in_progress')::int AS in_progress,
                COUNT(*) FILTER (WHERE resolution_status = 'resolved')::int AS resolved
            FROM customer_error_orders
            WHERE 1=1 ${where}
        `, params);

        return { byDepartment: rows, overall: overall || { total: 0, pending: 0, in_progress: 0, resolved: 0 } };
    });

    // PATCH /api/common-errors/:id/status — update resolution status
    fastify.patch('/api/common-errors/:id/status', { preHandler: authenticate }, async (request) => {
        const { status } = request.body;
        const id = request.params.id;
        const validStatuses = ['pending', 'in_progress', 'resolved'];
        if (!validStatuses.includes(status)) return { error: 'Trạng thái không hợp lệ' };

        const existing = await db.get('SELECT id FROM customer_error_orders WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy đơn lỗi' };

        if (status === 'resolved') {
            await db.run(
                'UPDATE customer_error_orders SET resolution_status = $1, resolved_at = NOW(), resolved_by = $2, updated_at = NOW() WHERE id = $3',
                [status, request.user.id, id]
            );
        } else {
            await db.run(
                'UPDATE customer_error_orders SET resolution_status = $1, resolved_at = NULL, resolved_by = NULL, updated_at = NOW() WHERE id = $2',
                [status, id]
            );
        }

        return { success: true };
    });

    // ========== PATCH /api/customer-errors/:id/error-return — Bàn giao Hàng Lỗi Về cho QLX ==========
    fastify.patch('/api/customer-errors/:id/error-return', { preHandler: authenticate }, async (request) => {
        const id = request.params.id;
        const { handed_to, handed_to_id, notes } = request.body || {};

        const existing = await db.get('SELECT id, order_code FROM customer_error_orders WHERE id = $1', [id]);
        if (!existing) return { error: 'Không tìm thấy đơn lỗi' };

        if (!handed_to || !handed_to.trim()) return { error: 'Vui lòng chọn Quản Lý Xưởng' };

        await db.run(
            `UPDATE customer_error_orders SET
                error_return_handed_over = TRUE,
                error_return_handed_to = $1,
                error_return_notes = $2,
                error_return_at = NOW(),
                error_return_by = $3,
                updated_at = NOW()
            WHERE id = $4`,
            [handed_to.trim(), notes || null, request.user.id, id]
        );

        // === AUTO-CREATE/UPDATE WORK TICKET for Công Việc QLX ===
        try {
            const orderCode = existing.order_code;
            if (orderCode) {
                // Determine assigned_to: use handed_to_id if provided, else look up by name
                let assignedTo = handed_to_id ? parseInt(handed_to_id) : null;
                if (!assignedTo && handed_to) {
                    const foundUser = await db.get("SELECT id FROM users WHERE full_name = $1 AND status = 'active' LIMIT 1", [handed_to.trim()]);
                    assignedTo = foundUser ? foundUser.id : request.user.id;
                }
                if (!assignedTo) assignedTo = request.user.id;

                const now = vnNow();
                const todayStr = now.toISOString().slice(0, 10).split('-').reverse().join('/');

                // Check: does a work ticket already exist for this order_code?
                const existingTicket = await db.get(
                    "SELECT id, description, status FROM work_tickets WHERE type = 'error_return' AND order_code = $1",
                    [orderCode]
                );

                if (existingTicket) {
                    // === MERGE: Append notes to existing ticket, re-open if resolved ===
                    const appendNote = '\n---\n[' + todayStr + ' - Bàn giao bổ sung] ' + (notes || 'Không có ghi chú');
                    await db.run(`UPDATE work_tickets SET
                        description = COALESCE(description, '') || $1,
                        status = CASE WHEN status IN ('resolved','closed') THEN 'pending' ELSE status END,
                        due_date = CASE WHEN status IN ('resolved','closed') THEN NULL ELSE due_date END,
                        resolved_at = CASE WHEN status IN ('resolved','closed') THEN NULL ELSE resolved_at END,
                        assigned_to = $2,
                        updated_at = $3
                        WHERE id = $4`, [appendNote, assignedTo, now, existingTicket.id]);
                } else {
                    // === CREATE NEW work ticket ===
                    const last = await db.get('SELECT ticket_code FROM work_tickets ORDER BY id DESC LIMIT 1');
                    let nextNum = 1;
                    if (last && last.ticket_code) {
                        const match = last.ticket_code.match(/PHIEUHV(\d+)/);
                        if (match) nextNum = parseInt(match[1]) + 1;
                    }
                    const ticketCode = 'PHIEUHV' + String(nextNum).padStart(4, '0');

                    await db.run(`
                        INSERT INTO work_tickets (ticket_code, type, order_code, title, description, priority, status, created_by, assigned_to, due_date, created_at, updated_at)
                        VALUES ($1, 'error_return', $2, $3, $4, 'GẤP', 'pending', $5, $6, NULL, $7, $7)
                    `, [
                        ticketCode,
                        orderCode,
                        'HÀNG LỖI VỀ — ' + orderCode,
                        '[' + todayStr + '] ' + (notes || 'Bàn giao hàng lỗi về cho QLX'),
                        request.user.id,
                        assignedTo,
                        now
                    ]);
                }
            }
        } catch(wtErr) { console.error('[WorkTicket] auto-create from error-return:', wtErr.message); }

        return { success: true };
    });

    // ★ by-order return-status route moved to top (before /:id) to prevent route conflict

    // ========== PATCH /api/customer-errors/:id/finalize-audit — Update audit log with images/video ==========
    fastify.patch('/api/customer-errors/:id/finalize-audit', { preHandler: authenticate }, async (request) => {
        const id = request.params.id;
        const { audit_log_id, image_urls, video_url } = request.body || {};
        if (!audit_log_id) return { error: 'Missing audit_log_id' };

        // Fetch current audit log
        const auditLog = await db.get('SELECT id, changes FROM dht_audit_logs WHERE id = $1', [audit_log_id]);
        if (!auditLog) return { error: 'Audit log not found' };

        // Parse existing changes and add image/video entries
        let changes = [];
        try { changes = typeof auditLog.changes === 'string' ? JSON.parse(auditLog.changes) : (auditLog.changes || []); } catch(e) {}

        // Add images
        if (image_urls && image_urls.length > 0) {
            changes.push({ field: 'error_images', label: 'Hình ảnh lỗi', old: null, new: JSON.stringify(image_urls) });
        }
        // Add video
        if (video_url) {
            changes.push({ field: 'error_video', label: 'Video lỗi', old: null, new: video_url });
        }

        await db.run(
            'UPDATE dht_audit_logs SET changes = $1 WHERE id = $2',
            [JSON.stringify(changes), audit_log_id]
        );

        // ★ Update linked work_ticket_reply attachments with uploaded images/video
        try {
            const linkedReply = await db.get(
                `SELECT id FROM work_ticket_replies WHERE (metadata->>'auto_error')::text = 'true' AND (metadata->>'error_order_id')::int = $1 ORDER BY id DESC LIMIT 1`,
                [parseInt(id)]
            );
            if (linkedReply) {
                const replyAttach = [];
                if (image_urls && image_urls.length > 0) {
                    image_urls.forEach(url => replyAttach.push({ type: 'image', url }));
                }
                if (video_url) {
                    replyAttach.push({ type: 'video', url: video_url });
                }
                if (replyAttach.length > 0) {
                    await db.run(
                        'UPDATE work_ticket_replies SET attachments = $1 WHERE id = $2',
                        [JSON.stringify(replyAttach), linkedReply.id]
                    );
                    console.log(`[ErrorAutoLink] ✅ Updated reply #${linkedReply.id} with ${replyAttach.length} attachments`);
                }
            }
        } catch(linkErr) {
            console.error('[ErrorAutoLink] ❌ Finalize attach error:', linkErr.message);
        }

        return { success: true };
    });
}

module.exports = routes;
