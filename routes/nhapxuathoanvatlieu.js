// ========== NHẬP XUẤT HOÀN VẬT LIỆU — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');
const path = require('path');
const fs = require('fs');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try {
        // Ensure all required approval and postponement columns are in material_transactions
        const cols = [
            'is_approved BOOLEAN DEFAULT false',
            'approved_at TIMESTAMPTZ',
            'approved_by INTEGER REFERENCES users(id)',
            'is_approved_1 BOOLEAN DEFAULT false',
            'approved_1_at TIMESTAMPTZ',
            'approved_1_by INTEGER REFERENCES users(id)',
            'is_canceled BOOLEAN DEFAULT false',
            'canceled_at TIMESTAMPTZ',
            'canceled_by INTEGER REFERENCES users(id)',
            'initial_quantity NUMERIC',
            'actual_quantity NUMERIC',
            'actual_quantity_images JSONB DEFAULT \'[]\'::jsonb',
            'actual_quantity_notes TEXT',
            'needs_discrepancy_approval BOOLEAN DEFAULT false',
            'discrepancy_approved BOOLEAN DEFAULT false',
            'discrepancy_approved_at TIMESTAMPTZ',
            'discrepancy_approved_by INTEGER REFERENCES users(id)',
            'bill_images JSONB DEFAULT \'[]\'::jsonb',
            'is_postponed BOOLEAN DEFAULT false',
            'postponed_at TIMESTAMPTZ',
            'postponed_by INTEGER REFERENCES users(id)',
            'postponed_images JSONB DEFAULT \'[]\'::jsonb',
            'postponed_notes TEXT',
            'postponed_target_date DATE',
            'material_items JSONB DEFAULT \'[]\'::jsonb',
            'updated_at TIMESTAMPTZ DEFAULT NOW()'
        ];
        for (const col of cols) {
            try {
                await db.exec(`ALTER TABLE material_transactions ADD COLUMN IF NOT EXISTS ${col}`);
            } catch(e) { console.error('[NXHVL] alter column:', e.message); }
        }

        // Set non-HOAN (NHAP, XUAT) transactions to approved by default
        await db.run(`UPDATE material_transactions SET is_approved = true WHERE tx_type IN ('NHAP', 'XUAT') AND is_approved = false`);

        // Ensure record_type in import_records is long enough for 'refund_material'
        try {
            await db.exec(`ALTER TABLE import_records ALTER COLUMN record_type TYPE VARCHAR(50)`);
        } catch(e) { console.error('[NXHVL] alter import_records record_type error:', e.message); }

    } catch(e) { console.error('[NXHVL] tx migration error:', e.message); }

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS material_tx_history (
            id SERIAL PRIMARY KEY,
            tx_id INTEGER NOT NULL REFERENCES material_transactions(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            details TEXT,
            performed_by INTEGER REFERENCES users(id),
            performed_at TIMESTAMPTZ DEFAULT NOW()
        )`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_mth_txid ON material_tx_history(tx_id)`);
    } catch(e) { console.error('[NXHVL] history table error:', e.message); }

    // ========== HELPERS ==========
    const MGMT = ['giam_doc','quan_ly_cap_cao'];
    const TX_TYPES = ['HOAN','NHAP_KK','XUAT_KK','NHAP','XUAT'];
    const TX_LABELS = {HOAN:'Hoàn',NHAP_KK:'Nhập Kiểm Kê',XUAT_KK:'Xuất Kiểm Kê',NHAP:'Nhập Vật Liệu',XUAT:'Xuất Vật Liệu'};

    async function isNxhvManager(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) {
            const n = d.name.toLowerCase();
            if (n.includes('qlx') || n.includes('kế toán') || n.includes('ke toan') || n.includes('kho')) return true;
        }
        return false;
    }

    async function isGdOrTrinh(req) {
        if (MGMT.includes(req.user.role)) return true;
        const u = await db.get('SELECT full_name, username FROM users WHERE id=$1', [req.user.id]);
        if (u) {
            const name = u.full_name || '';
            const uname = u.username || '';
            if (name.includes('Lê Việt Trinh') || name.includes('Le Viet Trinh') || uname === 'leviettrinh' || uname === 'trinh.lvt') {
                return true;
            }
        }
        return false;
    }

    async function isAccountantOrMgmt(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) {
            const n = d.name.toLowerCase();
            if (n.includes('kế toán') || n.includes('ke toan')) return true;
        }
        const u = await db.get('SELECT full_name, username FROM users WHERE id=$1', [req.user.id]);
        if (u) {
            const name = u.full_name || '';
            const uname = u.username || '';
            if (name.includes('Lê Việt Trinh') || name.includes('Le Viet Trinh') || uname === 'leviettrinh' || uname === 'trinh.lvt') {
                return true;
            }
        }
        return false;
    }

    // ========== TREE ==========
    fastify.get('/api/materialtx/tree', { preHandler: [authenticate] }, async () => {
        const types = [];
        for (const t of TX_TYPES) {
            const rows = await db.all(`
                SELECT EXTRACT(YEAR FROM COALESCE(performed_at,created_at))::int AS year,
                       EXTRACT(MONTH FROM COALESCE(performed_at,created_at))::int AS month,
                       COUNT(*)::int AS count
                FROM material_transactions WHERE tx_type=$1
                GROUP BY year, month ORDER BY year DESC, month DESC`, [t]);
            const years = {};
            rows.forEach(r => {
                if (!years[r.year]) years[r.year] = { year: r.year, months: [], count: 0 };
                years[r.year].months.push({ month: r.month, count: r.count });
                years[r.year].count += r.count;
            });
            const total = rows.reduce((s, r) => s + r.count, 0);
            types.push({ type: t, label: TX_LABELS[t], total, years: Object.values(years).sort((a,b) => b.year - a.year) });
        }
        const grand = await db.get(`SELECT COUNT(*)::int AS total FROM material_transactions`);
        return { types, grand_total: (grand||{}).total||0 };
    });

    // ========== IMPORT ITEMS FOR RETURN CREATION ==========
    fastify.get('/api/materialtx/import-items', { preHandler: [authenticate] }, async (req) => {
        const items = await db.all(`
            SELECT ir.id AS import_record_id, 
                   ir.fabric_import_code, 
                   ir.import_date,
                   ir.source_id,
                   s.name AS source_name,
                   (item->>'material_item_id')::int AS material_item_id,
                   (item->>'material_item_name')::text AS material_item_name,
                   (item->>'quantity')::numeric AS quantity,
                   (item->>'price')::numeric AS price,
                   (item->>'cost')::numeric AS cost,
                   mi.unit AS unit
            FROM import_records ir
            LEFT JOIN import_sources s ON ir.source_id = s.id
            CROSS JOIN LATERAL jsonb_array_elements(ir.fabric_items) AS item
            LEFT JOIN material_items mi ON (item->>'material_item_id')::int = mi.id
            WHERE ir.record_type = 'general' 
              AND ir.fabric_items IS NOT NULL 
              AND jsonb_typeof(ir.fabric_items) = 'array'
            ORDER BY ir.import_date DESC, ir.id DESC
        `);
        return { items };
    });

    // ========== LIST ==========
    fastify.get('/api/materialtx/records', { preHandler: [authenticate] }, async (req) => {
        const { tx_type, year, month, status, search } = req.query;
        let where = 'WHERE 1=1', params = [], idx = 1;
        if (tx_type && TX_TYPES.includes(tx_type)) { where += ` AND mt.tx_type=$${idx++}`; params.push(tx_type); }
        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(mt.performed_at,mt.created_at))=$${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(mt.performed_at,mt.created_at))=$${idx++}`; params.push(Number(month)); }
        if (status === 'approved') where += ` AND mt.is_approved=true`;
        else if (status === 'pending') where += ` AND mt.is_approved=false`;
        
        if (search) {
            where += ` AND (mi.name ILIKE $${idx} OR s.name ILIKE $${idx} OR mt.notes ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }
        const records = await db.all(`
            WITH seq_hoan AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY performed_at ASC NULLS FIRST, created_at ASC, id ASC) as seq_num
                FROM material_transactions
                WHERE tx_type = 'HOAN'
            )
            SELECT mt.*, 
                   mi.name AS material_name,
                   mi.unit AS unit,
                   s.name AS source_name,
                   ir.fabric_import_code AS original_import_code,
                   u.full_name AS staff_name, 
                   u_ap.full_name AS approved_by_name,
                   u_ap1.full_name AS approved_1_by_name,
                   u_pp.full_name AS postponed_by_name,
                   lh.performed_at AS last_update_at, 
                   lhu.full_name AS last_update_by,
                   sh.seq_num
            FROM material_transactions mt
            LEFT JOIN material_items mi ON mt.material_item_id = mi.id
            LEFT JOIN import_records ir ON mt.import_record_id = ir.id
            LEFT JOIN import_sources s ON ir.source_id = s.id
            LEFT JOIN seq_hoan sh ON mt.id = sh.id
            LEFT JOIN users u ON mt.performed_by=u.id 
            LEFT JOIN users u_ap ON mt.approved_by=u_ap.id
            LEFT JOIN users u_ap1 ON mt.approved_1_by=u_ap1.id
            LEFT JOIN users u_pp ON mt.postponed_by=u_pp.id
            LEFT JOIN LATERAL (
                SELECT h.performed_at, h.performed_by 
                FROM material_tx_history h 
                WHERE h.tx_id=mt.id 
                ORDER BY h.performed_at DESC 
                LIMIT 1
            ) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} 
            ORDER BY mt.performed_at DESC NULLS LAST, mt.created_at DESC`, params);
        return { records };
    });

    // ========== CREATE ==========
    fastify.post('/api/materialtx/records', { preHandler: [authenticate] }, async (req, reply) => {
        const b = req.body || {}, now = vnNow();
        if (!b.tx_type || !TX_TYPES.includes(b.tx_type)) return { error: 'Loại nghiệp vụ không hợp lệ' };
        
        let qty = Number(b.quantity) || 0;
        let prc = Number(b.price) || 0;
        let total = qty * prc;
        let matItems = b.material_items || [];

        if (b.tx_type === 'HOAN') {
            const canReturn = req.user && (
                req.user.role === 'giam_doc' || 
                req.user.username === 'trinh' || 
                (req.user.full_name && req.user.full_name.includes('Lê Việt Trinh')) ||
                (await isAccountantOrMgmt(req))
            );
            if (!canReturn) {
                return { error: 'Bạn không có quyền thực hiện hoàn trả vật liệu.' };
            }

            if (matItems && matItems.length > 0) {
                // Populate aggregate values
                b.material_item_id = matItems[0].material_item_id;
                b.import_record_id = matItems[0].import_record_id;
                
                total = matItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
                qty = matItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                prc = qty > 0 ? (total / qty) : 0;
                
                // Map/ensure necessary keys inside each item
                matItems = matItems.map(item => ({
                    material_item_id: Number(item.material_item_id),
                    import_record_id: Number(item.import_record_id),
                    material_name: item.material_name || '',
                    quantity: Number(item.quantity) || 0,
                    initial_quantity: Number(item.quantity) || 0,
                    actual_quantity: Number(item.quantity) || 0,
                    price: Number(item.price) || 0,
                    total_amount: (Number(item.quantity) || 0) * (Number(item.price) || 0),
                    unit: item.unit || '',
                    original_import_code: item.original_import_code || ''
                }));
            } else {
                if (!b.material_item_id || !b.import_record_id) {
                    return { error: 'Thiếu vật liệu hoặc bill nhập vật liệu gốc' };
                }
                // Construct single item for backward compatibility
                const matNameRes = await db.get('SELECT name, unit FROM material_items WHERE id = $1', [b.material_item_id]);
                const origCodeRes = await db.get('SELECT fabric_import_code FROM import_records WHERE id = $1', [b.import_record_id]);
                matItems = [{
                    material_item_id: Number(b.material_item_id),
                    import_record_id: Number(b.import_record_id),
                    material_name: matNameRes?.name || '',
                    quantity: qty,
                    initial_quantity: qty,
                    actual_quantity: qty,
                    price: prc,
                    total_amount: total,
                    unit: matNameRes?.unit || '',
                    original_import_code: origCodeRes?.fabric_import_code || ''
                }];
            }
        }
        
        const isPostponed = !!b.is_postponed;
        const postponedAt = isPostponed ? now : null;
        const postponedBy = isPostponed ? req.user.id : null;
        const postponedImages = isPostponed ? JSON.stringify(b.postponed_images || []) : '[]';
        const postponedNotes = isPostponed ? b.postponed_notes : null;
        const postponedTargetDate = isPostponed ? b.postponed_target_date : null;

        if (isPostponed && postponedTargetDate) {
            const parts = postponedTargetDate.split('-');
            const y = Number(parts[0]), m = Number(parts[1]), day = Number(parts[2]);
            if (isNaN(y) || isNaN(m) || isNaN(day)) {
                return { error: 'Thời gian hẹn lịch không hợp lệ' };
            }
            const d = new Date(y, m - 1, day);
            if (d.getDay() === 0) {
                return { error: 'Không được hẹn lịch vào ngày Chủ Nhật' };
            }
            const isHoliday = await db.get(`SELECT 1 FROM holidays WHERE holiday_date = $1`, [postponedTargetDate]);
            if (isHoliday) {
                return { error: 'Không được hẹn lịch vào ngày nghỉ lễ' };
            }
        }

        let createdId = null;
        if (b.tx_type === 'HOAN') {
            const pool = db.getDB();
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                let finalBillImages = b.bill_images || [];
                if (finalBillImages.length === 0 && b.postponed_images && b.postponed_images.length > 0) {
                    finalBillImages = b.postponed_images;
                }

                const insertRes = await client.query(
                    `INSERT INTO material_transactions
                    (tx_type, performed_at, performed_by, material_item_id, import_record_id,
                     quantity, price, total_amount, notes, bill_images,
                     is_postponed, postponed_at, postponed_by, postponed_images, postponed_notes, postponed_target_date,
                     material_items,
                     is_approved_1, approved_1_at, approved_1_by,
                     is_approved, approved_at, approved_by,
                     initial_quantity, actual_quantity)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14::jsonb, $15, $16, $17::jsonb, $18, $19, $20, $21, $22, $23, $24, $25) RETURNING *`,
                    [
                        b.tx_type, b.tx_date || now, req.user.id, b.material_item_id || null, b.import_record_id || null,
                        qty, prc, total, b.notes || null, JSON.stringify(finalBillImages),
                        isPostponed, postponedAt, postponedBy, JSON.stringify(b.postponed_images || []), postponedNotes, postponedTargetDate,
                        JSON.stringify(matItems),
                        true, now, req.user.id, // is_approved_1, approved_1_at, approved_1_by
                        true, now, req.user.id, // is_approved, approved_at, approved_by
                        qty, qty // initial_quantity, actual_quantity
                    ]
                );
                const insertedTx = insertRes.rows[0];
                createdId = insertedTx.id;

                // 2. Auto-create refund bill in import_records
                await createMaterialRefundBill(client, insertedTx, qty, prc, req.user.id, now);

                // 3. History
                await client.query(
                    `INSERT INTO material_tx_history (tx_id, action, details, performed_by, performed_at)
                     VALUES ($1, 'create', $2, $3, $4)`,
                    [createdId, `Tạo giao dịch hoàn vật liệu & tự động hoàn tất (đã trừ công nợ)`, req.user.id, now]
                );

                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                console.error('[NXHVL Create HOAN Error]', err.message);
                return { error: err.message || 'Lỗi khi tạo và tự động duyệt giao dịch hoàn vật liệu' };
            } finally {
                client.release();
            }

            // Send Telegram Notification
            try {
                const { sendTelegramPhoto, getBotToken } = require('../utils/telegram');
                const token = await getBotToken();
                const tgConfigRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_global_hoan_vai'");
                const chatId = tgConfigRow?.value?.trim();

                if (chatId) {
                    const formattedNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                    const matName = await db.get('SELECT name FROM material_items WHERE id = $1', [b.material_item_id]);
                    const caption = `✅ <b>HOÀN VẬT LIỆU THÀNH CÔNG</b>\n` +
                                    `━━━━━━━━━━━━━━━━━\n` +
                                    `📦 <b>Mã giao dịch:</b> Bill Hoàn #${createdId}\n` +
                                    `👕 <b>Vật liệu:</b> ${matName?.name || '—'}\n` +
                                    `⚖️ <b>Số lượng:</b> ${qty.toLocaleString('vi-VN')}\n` +
                                    `💰 <b>Thành tiền:</b> ${total.toLocaleString('vi-VN')}đ\n` +
                                    `👤 <b>Kế toán thực hiện:</b> ${req.user.full_name}\n` +
                                    `📆 <b>Thời gian:</b> ${formattedNow}\n\n` +
                                    `✅ <b>Giao dịch đã được đối chiếu và hoàn tất, công nợ đã được khấu trừ!</b>`;

                    let proofImg = '';
                    let fpath = '';
                    if (b.postponed_images && b.postponed_images.length > 0) {
                        proofImg = b.postponed_images[0];
                        if (proofImg.startsWith('/uploads/')) {
                            fpath = path.join(__dirname, '..', proofImg);
                        }
                    }
                    if (proofImg && fpath && fs.existsSync(fpath)) {
                        await sendTelegramPhoto(chatId, fpath, caption);
                    } else {
                        const { sendTelegramMessage } = require('../utils/telegram');
                        await sendTelegramMessage(chatId, caption);
                    }
                }
            } catch(tgErr) {
                console.error('[NXHVL Create Auto-Approve TG Error]', tgErr.message);
            }

            return { success: true, id: createdId };
        } else {
            const r = await db.get(`INSERT INTO material_transactions
                (tx_type, performed_at, performed_by, material_item_id, import_record_id,
                 quantity, price, total_amount, notes, bill_images,
                 is_postponed, postponed_at, postponed_by, postponed_images, postponed_notes, postponed_target_date,
                 material_items)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14::jsonb, $15, $16, $17::jsonb) RETURNING id`,
                [b.tx_type, b.tx_date||now, req.user.id, b.material_item_id||null, b.import_record_id||null,
                 qty, prc, total, b.notes||null, JSON.stringify(b.bill_images||[]),
                 isPostponed, postponedAt, postponedBy, postponedImages, postponedNotes, postponedTargetDate,
                 JSON.stringify(matItems)]);
            
            await db.run(`INSERT INTO material_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
                [r.id, 'create', `Tạo ${TX_LABELS[b.tx_type]}`, req.user.id, now]);
            
            return { success: true, id: r.id };
        }
    });

    // ========== TOGGLE APPROVE (For manual count adjustments) ==========
    fastify.post('/api/materialtx/toggle/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { action } = req.body || {}, now = vnNow();
        if (action === 'approve') {
            if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Chỉ QLX/GĐ/KT' });
            
            const tx = await db.get('SELECT tx_type FROM material_transactions WHERE id=$1', [id]);
            if (tx && tx.tx_type === 'HOAN') {
                return reply.code(400).send({ error: 'Vui lòng sử dụng quy trình xác nhận 2 bước cho giao dịch hoàn vật liệu.' });
            }

            await db.run(`UPDATE material_transactions SET is_approved=true, approved_at=$1, approved_by=$2, updated_at=NOW() WHERE id=$3`, [now, req.user.id, id]);
            await db.run(`INSERT INTO material_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, 'approve', '✅ Duyệt', req.user.id, now]);
        } else if (action === 'unapprove') {
            if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Không có quyền' });
            
            const tx = await db.get('SELECT tx_type FROM material_transactions WHERE id=$1', [id]);
            if (tx && tx.tx_type === 'HOAN') {
                return reply.code(400).send({ error: 'Không thể hoàn tác giao dịch hoàn vật liệu đã duyệt!' });
            }

            await db.run(`UPDATE material_transactions SET is_approved=false, approved_at=NULL, approved_by=NULL, updated_at=NOW() WHERE id=$2`, [now, id]);
            await db.run(`INSERT INTO material_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, 'unapprove', '↩️ Hoàn tác duyệt', req.user.id, now]);
        } else { return reply.code(400).send({ error: 'Action không hợp lệ' }); }
        return { success: true };
    });

    // ========== POSTPONE RETURN ==========
    fastify.post('/api/materialtx/postpone/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Không có quyền thực hiện thao tác này' });
        const id = Number(req.params.id), { images, notes, target_date } = req.body || {}, now = vnNow();
        
        if (!target_date) {
            return reply.code(400).send({ error: 'Vui lòng chọn thời gian lùi lịch hoàn vật liệu' });
        }
        const [y, m, day] = target_date.split('-').map(Number);
        if (isNaN(y) || isNaN(m) || isNaN(day)) {
            return reply.code(400).send({ error: 'Thời gian lùi lịch không hợp lệ' });
        }
        
        // Sunday validation
        const d = new Date(y, m - 1, day);
        if (d.getDay() === 0) {
            return reply.code(400).send({ error: 'Không được lùi lịch vào ngày Chủ Nhật' });
        }
        
        // Holiday validation
        const isHoliday = await db.get(`SELECT 1 FROM holidays WHERE holiday_date = $1`, [target_date]);
        if (isHoliday) {
            return reply.code(400).send({ error: 'Không được lùi lịch vào ngày nghỉ lễ' });
        }
        
        await db.run(
            `UPDATE material_transactions
             SET is_postponed = true, postponed_at = $1, postponed_by = $2,
                 postponed_images = $3::jsonb, postponed_notes = $4,
                 postponed_target_date = $5, updated_at = NOW()
             WHERE id = $6`,
            [now, req.user.id, JSON.stringify(images || []), notes || null, target_date, id]
        );
        await db.run(
            `INSERT INTO material_tx_history (tx_id, action, details, performed_by, performed_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, 'postpone', `Lùi lịch hoàn vật liệu đến ngày ${target_date}: ${notes || ''}`, req.user.id, now]
        );
        return { success: true };
    });

    // ========== UNPOSTPONE RETURN ==========
    fastify.post('/api/materialtx/unpostpone/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Không có quyền thực hiện thao tác này' });
        const id = Number(req.params.id), now = vnNow();
        await db.run(
            `UPDATE material_transactions
             SET is_postponed = false, postponed_at = NULL, postponed_by = NULL,
                 postponed_images = '[]'::jsonb, postponed_notes = NULL,
                 postponed_target_date = NULL, updated_at = NOW()
             WHERE id = $2`,
            [now, id]
        );
        await db.run(
            `INSERT INTO material_tx_history (tx_id, action, details, performed_by, performed_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, 'unpostpone', `Hủy lùi lịch hoàn vật liệu`, req.user.id, now]
        );
        return { success: true };
    });

    // ========== UPLOAD POSTPONE PROOF IMAGE ==========
    fastify.post('/api/materialtx/upload-postpone/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Không có quyền thực hiện thao tác này' });
        const id = Number(req.params.id);
        const data = await req.file();
        if (!data) return reply.code(400).send({ error: 'Không có file' });
        const uploadDir = path.join(__dirname, '..', 'uploads', 'postpone');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const ext = path.extname(data.filename) || '.webp';
        const fn = `pp_mat_${id}_${Date.now()}${ext}`;
        const fp = path.join(uploadDir, fn);
        const buf = await data.toBuffer();
        fs.writeFileSync(fp, buf);
        const url = `/uploads/postpone/${fn}`;
        return { success: true, url };
    });

    // ========== INLINE FIELD EDIT ==========
    fastify.patch('/api/materialtx/records/:id/field', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { field, value } = req.body || {}, now = vnNow();
        const ALLOWED = ['tx_type','performed_at','material_item_id','quantity','price','notes'];
        if (!ALLOWED.includes(field)) return reply.code(400).send({ error: 'Trường không hợp lệ' });
        if (field === 'price') {
            if (!(await isGdOrTrinh(req))) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc chị Lê Việt Trinh mới có quyền thay đổi đơn giá!' });
            }
        }
        const numF = ['material_item_id','quantity','price'];
        const fv = numF.includes(field) ? (Number(value)||0) : (value||null);
        await db.run(`UPDATE material_transactions SET ${field}=$1, updated_at=NOW() WHERE id=$3`, [fv, id]);
        
        if (['quantity','price'].includes(field)) {
            const rec = await db.get('SELECT quantity, price FROM material_transactions WHERE id=$1', [id]);
            if (rec) {
                const total = (Number(rec.quantity)||0) * (Number(rec.price)||0);
                await db.run(`UPDATE material_transactions SET total_amount=$1 WHERE id=$2`, [total, id]);
            }
        }
        await db.run(`INSERT INTO material_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'inline_update', `${field}: ${value}`, req.user.id, now]);
        return { success: true };
    });

    // ========== UPLOAD BILL IMAGE ==========
    fastify.post('/api/materialtx/upload/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), now = vnNow();
        const data = await req.file();
        if (!data) return reply.code(400).send({ error: 'Không có file' });
        const uploadDir = path.join(__dirname, '..', 'uploads', 'materialtx');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const ext = path.extname(data.filename) || '.jpg';
        const fn = `mtx_${id}_${Date.now()}${ext}`;
        const fp = path.join(uploadDir, fn);
        const buf = await data.toBuffer();
        fs.writeFileSync(fp, buf);
        const url = `/uploads/materialtx/${fn}`;
        
        const rec = await db.get('SELECT bill_images FROM material_transactions WHERE id=$1', [id]);
        let imgs = [];
        try { imgs = JSON.parse(rec.bill_images || '[]'); } catch(e) {}
        if (!Array.isArray(imgs)) imgs = [];
        imgs.push(url);
        
        await db.run(`UPDATE material_transactions SET bill_images=$1::jsonb, updated_at=NOW() WHERE id=$3`, [JSON.stringify(imgs), id]);
        await db.run(`INSERT INTO material_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'upload', `📸 Upload ảnh bill`, req.user.id, now]);
        return { success: true, url, images: imgs };
    });

    // ========== UPDATE ==========
    fastify.put('/api/materialtx/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), b = req.body || {}, now = vnNow();
        
        const old = await db.get('SELECT price FROM material_transactions WHERE id=$1', [id]);
        if (old && b.price !== undefined && Number(old.price) !== Number(b.price)) {
            if (!(await isGdOrTrinh(req))) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc chị Lê Việt Trinh mới có quyền thay đổi đơn giá!' });
            }
        }
        
        const total = (Number(b.quantity)||0) * (Number(b.price)||0);
        await db.run(`UPDATE material_transactions SET tx_type=$1,performed_at=$2,material_item_id=$3,
            quantity=$4,price=$5,total_amount=$6,notes=$7,updated_at=NOW() WHERE id=$8`,
            [b.tx_type, b.tx_date||now, b.material_item_id, Number(b.quantity)||0, Number(b.price)||0, total, b.notes||null, id]);
        
        await db.run(`INSERT INTO material_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật giao dịch', req.user.id, now]);
        return { success: true };
    });

    // ========== DELETE ==========
    fastify.delete('/api/materialtx/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Chỉ QLX/GĐ/KT' });
        const id = Number(req.params.id);
        
        // 1. Delete associated refund bill from import_records
        await db.run(`DELETE FROM import_records WHERE fabric_import_code = $1`, [`HVVL-${id}`]);
        
        // 2. Delete the material transaction
        await db.run('DELETE FROM material_transactions WHERE id=$1', [id]);
        
        return { success: true };
    });

    // ========== HELPER TO CREATE REFUND BILL FOR MATERIALS IN import_records ==========
    async function createMaterialRefundBill(client, tx, actQty, price, userId, now) {
        let fabricItems = [];
        let source_id = null;
        let warehouse_id = null;
        let materialName = '';
        let totalRefundAmt = 0;
        let totalQty = 0;

        let matItems = [];
        if (tx.material_items) {
            try {
                matItems = typeof tx.material_items === 'string' ? JSON.parse(tx.material_items) : tx.material_items;
            } catch (e) {}
        }

        if (Array.isArray(matItems) && matItems.length > 0) {
            // Find source_id and warehouse_id from first item's import_record_id
            const firstImpId = matItems[0].import_record_id;
            const origImport = await client.query(
                `SELECT source_id, warehouse_id FROM import_records WHERE id = $1`,
                [firstImpId]
            );
            if (origImport.rows.length === 0) {
                throw new Error('Không tìm thấy hóa đơn nhập gốc');
            }
            source_id = origImport.rows[0].source_id;
            warehouse_id = origImport.rows[0].warehouse_id;

            fabricItems = matItems.map(it => {
                const itemQty = Number(it.actual_quantity);
                const itemCost = itemQty * Number(it.price);
                totalQty += itemQty;
                totalRefundAmt += itemCost;
                return {
                    material_item_id: it.material_item_id,
                    material_item_name: it.material_name,
                    quantity: itemQty,
                    unit: it.unit || '',
                    price: Number(it.price),
                    cost: itemCost
                };
            });
            materialName = matItems.map(it => it.material_name).join(', ');
        } else {
            // Fallback for backward compatibility
            const origImport = await client.query(
                `SELECT source_id, warehouse_id FROM import_records WHERE id = $1`,
                [tx.import_record_id]
            );
            if (origImport.rows.length === 0) {
                throw new Error('Không tìm thấy hóa đơn nhập gốc');
            }
            source_id = origImport.rows[0].source_id;
            warehouse_id = origImport.rows[0].warehouse_id;

            // Fetch material item name
            const matRes = await client.query(
                `SELECT name, unit FROM material_items WHERE id = $1`,
                [tx.material_item_id]
            );
            materialName = matRes.rows[0]?.name || 'Vật liệu';
            const unit = matRes.rows[0]?.unit || '';

            totalQty = Number(actQty);
            totalRefundAmt = totalQty * Number(price);

            fabricItems = [
                {
                    material_item_id: tx.material_item_id,
                    material_item_name: materialName,
                    quantity: totalQty,
                    unit: unit,
                    price: Number(price),
                    cost: totalRefundAmt
                }
            ];
        }

        const refundCode = `HVVL-${tx.id}`;

        let billImg = null;
        if (tx.bill_images) {
            try {
                const imgs = typeof tx.bill_images === 'string' ? JSON.parse(tx.bill_images) : tx.bill_images;
                if (Array.isArray(imgs) && imgs.length > 0) {
                    billImg = imgs[0];
                }
            } catch (e) {}
        }

        const importResult = await client.query(
            `INSERT INTO import_records (
                record_type, fabric_import_code, import_date, source_id, warehouse_id, importer_id,
                fabric_items, fabric_material, fabric_quantity, material_quantity,
                cost, refund, total_amount, paid, debt,
                bill_image_url, cost_notes, created_by, created_at, updated_at
             ) VALUES (
                'refund_material', $1, $2, $3, $4, $5,
                $6::jsonb, $7, $8, $8,
                $9, $10, 0, 0, $11,
                $12, $13, $5, $14, $14
             ) RETURNING id`,
            [
                refundCode,
                now,
                source_id,
                warehouse_id,
                userId,
                JSON.stringify(fabricItems),
                materialName.substring(0, 250), // prevent too long name
                totalQty,
                totalRefundAmt,
                totalRefundAmt,
                -totalRefundAmt,
                billImg,
                `Hoàn trả vật liệu từ giao dịch #${tx.id} (Yêu cầu ngày ${tx.performed_at ? tx.performed_at.toISOString().split('T')[0] : ''})`,
                now
            ]
        );

        const refundRecordId = importResult.rows[0].id;

        await client.query(
            `INSERT INTO import_history (import_id, action, details, performed_by, performed_at)
             VALUES ($1, 'create_refund_material', $2, $3, $4)`,
            [refundRecordId, `Tự động tạo bill hoàn vật liệu từ giao dịch hoàn #${tx.id}`, userId, now]
        );
        
        return refundRecordId;
    }

    // ========== CONFIRM 1 (ĐÃ BÀN GIAO NCC) ==========
    fastify.post('/api/materialtx/confirm1/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { image_data } = req.body || {}, now = vnNow();
        
        const tx = await db.get('SELECT * FROM material_transactions WHERE id=$1', [id]);
        if (!tx) return reply.code(404).send({ error: 'Không tìm thấy giao dịch' });
        if (tx.tx_type !== 'HOAN') return reply.code(400).send({ error: 'Không phải giao dịch hoàn vật liệu' });
        if (tx.is_approved_1) return reply.code(400).send({ error: 'Giao dịch đã được xác nhận lần 1' });
        if (tx.is_canceled) return reply.code(400).send({ error: 'Giao dịch đã bị hủy' });
        if (!image_data) return reply.code(400).send({ error: 'Hình ảnh nhà cung cấp lấy vật liệu bắt buộc' });

        // Save image
        let imageUrl = '';
        let fpath = '';
        if (image_data.startsWith('/uploads/')) {
            imageUrl = image_data;
            fpath = path.join(__dirname, '..', image_data);
        } else {
            const dir = path.join(__dirname, '..', 'uploads', 'materialtx');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const fname = `mtx_confirm1_${id}_${Date.now()}.png`;
            fpath = path.join(dir, fname);
            const base64 = image_data.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(fpath, Buffer.from(base64, 'base64'));
            imageUrl = `/uploads/materialtx/${fname}`;
        }

        const pool = db.getDB();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            let billImgs = [];
            try { billImgs = typeof tx.bill_images === 'string' ? JSON.parse(tx.bill_images || '[]') : (tx.bill_images || []); } catch(e) {}
            if (!billImgs.includes(imageUrl)) billImgs.push(imageUrl);
            
            await client.query(
                `UPDATE material_transactions 
                 SET is_approved_1 = true, approved_1_at = $1, approved_1_by = $2, bill_images = $3::jsonb, updated_at = NOW() 
                 WHERE id = $4`,
                [now, req.user.id, JSON.stringify(billImgs), id]
            );

            await client.query(
                `INSERT INTO material_tx_history (tx_id, action, details, performed_by, performed_at)
                 VALUES ($1, 'confirm1', 'Xác nhận lần 1: Đã bàn giao cho nhà cung cấp lấy vật liệu và xuất kho', $2, $3)`,
                [id, req.user.id, now]
            );

            await client.query('COMMIT');
        } catch(err) {
            await client.query('ROLLBACK');
            console.error('[NXHVL Confirm1]', err.message);
            return reply.code(400).send({ error: err.message || 'Lỗi khi xác nhận lần 1' });
        } finally {
            client.release();
        }

        // Send Telegram Notification
        try {
            const { sendTelegramPhoto, getBotToken } = require('../utils/telegram');
            const token = await getBotToken();
            const tgConfigRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_global_hoan_vai'");
            const chatId = tgConfigRow?.value?.trim();

            if (chatId) {
                const formattedNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                const matName = await db.get('SELECT name FROM material_items WHERE id = $1', [tx.material_item_id]);
                const caption = `🔄 <b>HOÀN VẬT LIỆU (XÁC NHẬN LẦN 1)</b>\n` +
                                `━━━━━━━━━━━━━━━━━\n` +
                                `📦 <b>Mã giao dịch:</b> Bill Hoàn #${tx.id}\n` +
                                `👕 <b>Vật liệu:</b> ${matName?.name || '—'}\n` +
                                `⚖️ <b>Số lượng:</b> ${Number(tx.quantity).toLocaleString('vi-VN')}\n` +
                                `👤 <b>Người thực hiện:</b> ${req.user.full_name}\n` +
                                `📆 <b>Thời gian:</b> ${formattedNow}\n\n` +
                                `⏳ <i>Chờ Kế Toán cân đo thực tế và thực hiện xác nhận lần 2.</i>`;

                if (fpath && fs.existsSync(fpath)) {
                    await sendTelegramPhoto(chatId, fpath, caption);
                } else {
                    const { sendTelegramMessage } = require('../utils/telegram');
                    await sendTelegramMessage(chatId, caption);
                }
            }
        } catch(tgErr) {
            console.error('[NXHVL Confirm1 TG Error]', tgErr.message);
        }

        return { success: true };
    });

    // ========== CONFIRM 2 (XÁC NHẬN LẦN 2) ==========
    fastify.post('/api/materialtx/confirm2/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { actual_quantity, actual_items, image_data, notes } = req.body || {}, now = vnNow();

        if (!(await isAccountantOrMgmt(req))) {
            return reply.code(403).send({ error: 'Chỉ Kế toán, Giám đốc, hoặc Lê Việt Trinh mới có quyền thực hiện xác nhận lần 2!' });
        }

        const tx = await db.get('SELECT * FROM material_transactions WHERE id=$1', [id]);
        if (!tx) return reply.code(404).send({ error: 'Không tìm thấy giao dịch' });
        if (tx.tx_type !== 'HOAN') return reply.code(400).send({ error: 'Không phải giao dịch hoàn vật liệu' });
        if (!tx.is_approved_1) return reply.code(400).send({ error: 'Giao dịch chưa được xác nhận lần 1' });
        if (tx.is_approved) return reply.code(400).send({ error: 'Giao dịch đã được xác nhận lần 2' });
        if (tx.is_canceled) return reply.code(400).send({ error: 'Giao dịch đã bị hủy' });

        let currentItems = [];
        if (tx.material_items) {
            try {
                currentItems = typeof tx.material_items === 'string' ? JSON.parse(tx.material_items) : tx.material_items;
            } catch (e) {}
        }
        if (!Array.isArray(currentItems)) currentItems = [];

        let actQty = 0;
        let initialQty = 0;
        let totalAmount = 0;
        let isDiscrepancyLess = false;
        let updatedItems = [];

        if (Array.isArray(actual_items) && actual_items.length > 0 && currentItems.length > 0) {
            // Multi-item path
            updatedItems = currentItems.map(item => {
                const match = actual_items.find(ai => 
                    Number(ai.material_item_id) === Number(item.material_item_id) && 
                    Number(ai.import_record_id) === Number(item.import_record_id)
                );
                const itemActQty = match ? Number(match.actual_quantity) : Number(item.quantity);
                const itemInitialQty = Number(item.initial_quantity || item.quantity);
                
                if (itemActQty < itemInitialQty) {
                    isDiscrepancyLess = true;
                }

                actQty += itemActQty;
                initialQty += itemInitialQty;
                totalAmount += itemActQty * Number(item.price);

                return {
                    ...item,
                    actual_quantity: itemActQty,
                    total_amount: itemActQty * Number(item.price)
                };
            });
        } else {
            // Single-item path fallback
            actQty = Number(actual_quantity);
            if (isNaN(actQty) || actQty <= 0) {
                return reply.code(400).send({ error: 'Số lượng thực tế không hợp lệ' });
            }
            initialQty = Number(tx.quantity);
            if (actQty < initialQty) {
                isDiscrepancyLess = true;
            }
            totalAmount = actQty * Number(tx.price);

            if (currentItems.length > 0) {
                updatedItems = currentItems.map(item => {
                    const itemInitialQty = Number(item.initial_quantity || item.quantity);
                    if (actQty < itemInitialQty) {
                        isDiscrepancyLess = true;
                    }
                    return {
                        ...item,
                        actual_quantity: actQty,
                        total_amount: actQty * Number(item.price)
                    };
                });
            } else {
                updatedItems = [{
                    material_item_id: tx.material_item_id,
                    import_record_id: tx.import_record_id,
                    material_name: '',
                    quantity: tx.quantity,
                    initial_quantity: initialQty,
                    actual_quantity: actQty,
                    price: tx.price,
                    total_amount: totalAmount,
                    unit: '',
                    original_import_code: ''
                }];
            }
        }

        const qtyDiff = actQty - initialQty;

        // If weight differs, proof photo is mandatory
        if (Math.abs(qtyDiff) > 0.001 && !image_data && !tx.actual_quantity_images?.length) {
            return reply.code(400).send({ error: 'Sai lệch số lượng thực tế so với ban đầu. Bắt buộc phải có hình ảnh chụp thực tế để chứng minh!' });
        }

        // Save image if provided
        let imageUrl = '';
        let fpath = '';
        if (image_data) {
            if (image_data.startsWith('/uploads/')) {
                imageUrl = image_data;
                fpath = path.join(__dirname, '..', image_data);
            } else {
                const dir = path.join(__dirname, '..', 'uploads', 'materialtx');
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const fname = `mtx_confirm2_${id}_${Date.now()}.png`;
                fpath = path.join(dir, fname);
                const base64 = image_data.replace(/^data:image\/\w+;base64,/, '');
                fs.writeFileSync(fpath, Buffer.from(base64, 'base64'));
                imageUrl = `/uploads/materialtx/${fname}`;
            }
        }

        // Case 2: Actual qty is LESS than initial -> Require discrepancy approval
        if (isDiscrepancyLess) {
            let actualImages = [];
            if (imageUrl) actualImages.push(imageUrl);
            else if (tx.actual_quantity_images) {
                try { actualImages = typeof tx.actual_quantity_images === 'string' ? JSON.parse(tx.actual_quantity_images) : tx.actual_quantity_images; } catch(e) {}
            }

            await db.run(
                `UPDATE material_transactions 
                 SET needs_discrepancy_approval = true, discrepancy_approved = false,
                     initial_quantity = $1, actual_quantity = $2,
                     actual_quantity_images = $3::jsonb, actual_quantity_notes = $4,
                     material_items = $5::jsonb,
                     updated_at = NOW()
                 WHERE id = $6`,
                [initialQty, actQty, JSON.stringify(actualImages), notes || null, JSON.stringify(updatedItems), id]
            );

            await db.run(
                `INSERT INTO material_tx_history (tx_id, action, details, performed_by, performed_at)
                 VALUES ($1, 'request_discrepancy_approval', $2, $3, $4)`,
                [id, `Yêu cầu duyệt sai lệch hoàn vật liệu: Thực tế ${actQty} < Ban đầu ${initialQty}. Chờ QL Lê Việt Trinh duyệt.`, req.user.id, now]
            );

            // Send Telegram to manager
            try {
                const { sendTelegramPhoto, getBotToken, sendTelegramMessage } = require('../utils/telegram');
                const token = await getBotToken();
                const tgConfigRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_global_hoan_vai'");
                const chatId = tgConfigRow?.value?.trim();
                
                if (chatId) {
                    const formattedNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                    const matName = await db.get('SELECT name FROM material_items WHERE id = $1', [tx.material_item_id]);
                    const caption = `⚠️ <b>YÊU CẦU DUYỆT SAI LỆCH HOÀN VẬT LIỆU (THỰC TẾ ÍT HƠN)</b>\n` +
                                    `━━━━━━━━━━━━━━━━━\n` +
                                    `📦 <b>Mã giao dịch:</b> Bill Hoàn #${id}\n` +
                                    `👕 <b>Vật liệu:</b> ${matName?.name || '—'}\n` +
                                    `⚖️ <b>Số lượng ban đầu:</b> ${initialQty.toLocaleString('vi-VN')}\n` +
                                    `⚖️ <b>Số lượng thực tế:</b> ${actQty.toLocaleString('vi-VN')}\n` +
                                    `🔴 <b>Sai lệch hao hụt:</b> ${qtyDiff.toFixed(2)}\n` +
                                    `👤 <b>Kế toán yêu cầu:</b> ${req.user.full_name}\n` +
                                    `📆 <b>Thời gian:</b> ${formattedNow}\n\n` +
                                    `👉 <b>Vui lòng quản lý Lê Việt Trinh hoặc Giám Đốc vào duyệt để hoàn tất!</b>`;
                    
                    if (imageUrl && fpath && fs.existsSync(fpath)) {
                        await sendTelegramPhoto(chatId, fpath, caption);
                    } else {
                        await sendTelegramMessage(chatId, caption);
                    }
                }
            } catch (tgErr) {
                console.error('[NXHVL Confirm2 Discrepancy TG Error]', tgErr.message);
            }

            return { success: true, needs_discrepancy_approval: true };
        }

        // Case 1: Actual >= initial weight -> Complete immediately
        const pool = db.getDB();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let actualImages = [];
            if (imageUrl) actualImages.push(imageUrl);
            else if (tx.actual_quantity_images) {
                try { actualImages = typeof tx.actual_quantity_images === 'string' ? JSON.parse(tx.actual_quantity_images) : tx.actual_quantity_images; } catch(e) {}
            }

            // 1. Update material_transactions
            await client.query(
                `UPDATE material_transactions 
                 SET is_approved = true, approved_at = $1, approved_by = $2,
                     initial_quantity = $3, actual_quantity = $4,
                     actual_quantity_images = $5::jsonb, actual_quantity_notes = $6,
                     quantity = $4, total_amount = $7, updated_at = NOW(),
                     needs_discrepancy_approval = false, discrepancy_approved = false,
                     material_items = $8::jsonb
                 WHERE id = $9`,
                [now, req.user.id, initialQty, actQty, JSON.stringify(actualImages), notes || null, totalAmount, JSON.stringify(updatedItems), id]
            );

            // Fetch the freshly updated tx so it has the correct updated material_items JSON
            const updatedTxResult = await client.query('SELECT * FROM material_transactions WHERE id = $1', [id]);
            const updatedTx = updatedTxResult.rows[0];

            // 2. Auto-create refund bill in import_records
            await createMaterialRefundBill(client, updatedTx, actQty, tx.price, req.user.id, now);

            // 3. History
            await client.query(
                `INSERT INTO material_tx_history (tx_id, action, details, performed_by, performed_at)
                 VALUES ($1, 'confirm2', $2, $3, $4)`,
                [id, `Xác nhận lần 2: Đã đối chiếu số lượng thực tế ${actQty} (Ban đầu: ${initialQty})`, req.user.id, now]
            );

            await client.query('COMMIT');
        } catch(err) {
            await client.query('ROLLBACK');
            console.error('[NXHVL Confirm2 Error]', err.message);
            return reply.code(400).send({ error: err.message || 'Lỗi khi xác nhận lần 2' });
        } finally {
            client.release();
        }

        // Send Telegram Notification
        try {
            const { sendTelegramPhoto, getBotToken } = require('../utils/telegram');
            const token = await getBotToken();
            const tgConfigRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_global_hoan_vai'");
            const chatId = tgConfigRow?.value?.trim();

            if (chatId) {
                const formattedNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                const matName = await db.get('SELECT name FROM material_items WHERE id = $1', [tx.material_item_id]);
                const caption = `✅ <b>HOÀN VẬT LIỆU THÀNH CÔNG (XÁC NHẬN LẦN 2)</b>\n` +
                                `━━━━━━━━━━━━━━━━━\n` +
                                `📦 <b>Mã giao dịch:</b> Bill Hoàn #${tx.id}\n` +
                                `👕 <b>Vật liệu:</b> ${matName?.name || '—'}\n` +
                                `⚖️ <b>Số lượng chốt:</b> ${actQty.toLocaleString('vi-VN')} (Ban đầu: ${initialQty.toLocaleString('vi-VN')})\n` +
                                `💰 <b>Thành tiền:</b> ${totalAmount.toLocaleString('vi-VN')}đ\n` +
                                `👤 <b>Kế toán thực hiện:</b> ${req.user.full_name}\n` +
                                `📆 <b>Thời gian:</b> ${formattedNow}\n\n` +
                                `✅ <b>Giao dịch đã được đối chiếu và hoàn tất, công nợ đã được khấu trừ!</b>`;

                if (imageUrl && fpath && fs.existsSync(fpath)) {
                    await sendTelegramPhoto(chatId, fpath, caption);
                } else {
                    const { sendTelegramMessage } = require('../utils/telegram');
                    await sendTelegramMessage(chatId, caption);
                }
            }
        } catch(tgErr) {
            console.error('[NXHVL Confirm2 TG Error]', tgErr.message);
        }

        return { success: true };
    });

    // ========== APPROVE DISCREPANCY (DUYỆT SAI LỆCH) ==========
    fastify.post('/api/materialtx/approve-discrepancy/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isGdOrTrinh(req))) {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc Lê Việt Trinh mới có quyền duyệt sai lệch!' });
        }
        const id = Number(req.params.id), now = vnNow();
        const tx = await db.get('SELECT * FROM material_transactions WHERE id=$1', [id]);
        if (!tx) return reply.code(404).send({ error: 'Không tìm thấy giao dịch' });
        if (!tx.needs_discrepancy_approval) return reply.code(400).send({ error: 'Giao dịch không có sai lệch cần duyệt' });
        if (tx.is_approved) return reply.code(400).send({ error: 'Giao dịch đã được duyệt trước đó' });

        const actQty = Number(tx.actual_quantity);
        
        let currentItems = [];
        if (tx.material_items) {
            try {
                currentItems = typeof tx.material_items === 'string' ? JSON.parse(tx.material_items) : tx.material_items;
            } catch (e) {}
        }
        if (!Array.isArray(currentItems)) currentItems = [];

        let totalAmount = 0;
        if (currentItems.length > 0) {
            totalAmount = currentItems.reduce((sum, item) => sum + (Number(item.actual_quantity || item.quantity) * Number(item.price || 0)), 0);
        } else {
            totalAmount = actQty * Number(tx.price);
        }

        const pool = db.getDB();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Update material_transactions to approved
            await client.query(
                `UPDATE material_transactions 
                 SET is_approved = true, approved_at = $1, approved_by = $2,
                     discrepancy_approved = true, discrepancy_approved_at = $1, discrepancy_approved_by = $2,
                     needs_discrepancy_approval = false,
                     quantity = $3, total_amount = $4, updated_at = NOW()
                 WHERE id = $5`,
                [now, req.user.id, actQty, totalAmount, id]
            );

            // Fetch the updated tx record so createMaterialRefundBill has access to the updated material_items JSON
            const updatedTxRes = await client.query('SELECT * FROM material_transactions WHERE id = $1', [id]);
            const updatedTx = updatedTxRes.rows[0];

            // 2. Auto-create refund bill in import_records
            await createMaterialRefundBill(client, updatedTx, actQty, tx.price, req.user.id, now);

            // 3. History
            await client.query(
                `INSERT INTO material_tx_history (tx_id, action, details, performed_by, performed_at)
                 VALUES ($1, 'approve_discrepancy', $2, $3, $4)`,
                [id, `Quản lý duyệt sai lệch hoàn vật liệu: Thực tế ${actQty} (Ban đầu: ${tx.quantity})`, req.user.id, now]
            );

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[NXHVL Approve Discrepancy Error]', err.message);
            return reply.code(400).send({ error: err.message || 'Lỗi khi duyệt sai lệch' });
        } finally {
            client.release();
        }

        // Send Telegram Notification
        try {
            const { sendTelegramPhoto, getBotToken, sendTelegramMessage } = require('../utils/telegram');
            const token = await getBotToken();
            const tgConfigRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_global_hoan_vai'");
            const chatId = tgConfigRow?.value?.trim();

            if (chatId) {
                const formattedNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                const matName = await db.get('SELECT name FROM material_items WHERE id = $1', [tx.material_item_id]);
                const qtyDiff = actQty - Number(tx.quantity);
                
                let proofImg = '';
                let fpath = '';
                if (tx.actual_quantity_images) {
                    try {
                        const imgs = typeof tx.actual_quantity_images === 'string' ? JSON.parse(tx.actual_quantity_images) : tx.actual_quantity_images;
                        if (Array.isArray(imgs) && imgs.length > 0) {
                            proofImg = imgs[0];
                            fpath = path.join(__dirname, '..', proofImg);
                        }
                    } catch (e) {}
                }

                const caption = `✅ <b>QUẢN LÝ DUYỆT SAI LỆCH HOÀN VẬT LIỆU THÀNH CÔNG</b>\n` +
                                `━━━━━━━━━━━━━━━━━\n` +
                                `📦 <b>Mã giao dịch:</b> Bill Hoàn #${tx.id}\n` +
                                `👕 <b>Vật liệu:</b> ${matName?.name || '—'}\n` +
                                `⚖️ <b>Số lượng thực tế chốt:</b> ${actQty.toLocaleString('vi-VN')} (Ban đầu: ${Number(tx.quantity).toLocaleString('vi-VN')})\n` +
                                `📊 <b>Sai lệch hao hụt:</b> ${qtyDiff.toFixed(2)}\n` +
                                `💰 <b>Thành tiền chốt:</b> ${totalAmount.toLocaleString('vi-VN')}đ\n` +
                                `👤 <b>Quản lý duyệt:</b> ${req.user.full_name}\n` +
                                `📆 <b>Thời gian:</b> ${formattedNow}\n\n` +
                                `✅ <b>Giao dịch đã được phê duyệt và hoàn tất, công nợ đã được khấu trừ!</b>`;

                if (proofImg && fpath && fs.existsSync(fpath)) {
                    await sendTelegramPhoto(chatId, fpath, caption);
                } else {
                    await sendTelegramMessage(chatId, caption);
                }
            }
        } catch(tgErr) {
            console.error('[NXHVL Approve Discrepancy TG Error]', tgErr.message);
        }

        return { success: true };
    });
};
