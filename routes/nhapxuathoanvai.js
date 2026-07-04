// ========== NHẬP XUẤT HOÀN VẢI — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');
const path = require('path');
const fs = require('fs');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try { await db.exec(`CREATE TABLE IF NOT EXISTS fabric_transactions (
        id SERIAL PRIMARY KEY,
        tx_type TEXT NOT NULL DEFAULT 'HOAN',
        is_approved BOOLEAN DEFAULT false, approved_at TIMESTAMPTZ, approved_by INTEGER REFERENCES users(id),
        bill_images JSONB DEFAULT '[]'::jsonb,
        tx_date DATE, source_name TEXT, staff_id INTEGER REFERENCES users(id),
        material_name TEXT, color_name TEXT, unit TEXT DEFAULT 'kg',
        tree_details TEXT, tree_count INTEGER DEFAULT 0,
        total_quantity NUMERIC DEFAULT 0, price NUMERIC DEFAULT 0,
        total_amount NUMERIC DEFAULT 0, debt NUMERIC DEFAULT 0, payment NUMERIC DEFAULT 0,
        notes TEXT, created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
        is_postponed BOOLEAN DEFAULT false,
        postponed_at TIMESTAMPTZ,
        postponed_by INTEGER REFERENCES users(id),
        postponed_images JSONB DEFAULT '[]'::jsonb,
        postponed_notes TEXT,
        postponed_target_date DATE
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ftx_type ON fabric_transactions(tx_type)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ftx_date ON fabric_transactions(tx_date)`);
    
    // Add columns dynamically for existing DBs
    const cols = [
        'is_postponed BOOLEAN DEFAULT false',
        'postponed_at TIMESTAMPTZ',
        'postponed_by INTEGER REFERENCES users(id)',
        'postponed_images JSONB DEFAULT \'[]\'::jsonb',
        'postponed_notes TEXT',
        'postponed_target_date DATE',
        'shelf_names TEXT',
        'is_approved_1 BOOLEAN DEFAULT false',
        'approved_1_at TIMESTAMPTZ',
        'approved_1_by INTEGER REFERENCES users(id)',
        'initial_quantity NUMERIC',
        'actual_quantity NUMERIC',
        'actual_quantity_images JSONB DEFAULT \'[]\'::jsonb',
        'actual_quantity_notes TEXT',
        'needs_discrepancy_approval BOOLEAN DEFAULT false',
        'discrepancy_approved BOOLEAN DEFAULT false',
        'discrepancy_approved_at TIMESTAMPTZ',
        'discrepancy_approved_by INTEGER REFERENCES users(id)'
    ];
    for (const col of cols) {
        try {
            await db.exec(`ALTER TABLE fabric_transactions ADD COLUMN IF NOT EXISTS ${col}`);
        } catch(e) { console.error('[NXHV] alter column:', e.message); }
    }
    } catch(e) { console.error('[NXHV] tx:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS fabric_tx_history (
        id SERIAL PRIMARY KEY, tx_id INTEGER NOT NULL REFERENCES fabric_transactions(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_fth_txid ON fabric_tx_history(tx_id)`);
    } catch(e) { console.error('[NXHV] hist:', e.message); }

    // ========== HELPERS ==========
    const MGMT = ['giam_doc','quan_ly_cap_cao'];
    const TX_TYPES = ['HOAN','NHAP_KK','XUAT_KK','NHAP','XUAT'];
    const TX_LABELS = {HOAN:'Hoàn',NHAP_KK:'Nhập Kiểm Kê',XUAT_KK:'Xuất Kiểm Kê',NHAP:'Nhập Vải',XUAT:'Xuất Vải'};
    async function isNxhvManager(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) { const n = d.name.toLowerCase(); if (n.includes('qlx') || n.includes('kế toán') || n.includes('ke toan') || n.includes('kho')) return true; }
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
    function calcFin(qty, price) {
        const q = Number(qty)||0, p = Number(price)||0;
        return { total_amount: q * p };
    }

    // ========== TREE ==========
    fastify.get('/api/fabrictx/tree', { preHandler: [authenticate] }, async () => {
        const types = [];
        for (const t of TX_TYPES) {
            const rows = await db.all(`
                SELECT EXTRACT(YEAR FROM COALESCE(tx_date,created_at))::int AS year,
                       EXTRACT(MONTH FROM COALESCE(tx_date,created_at))::int AS month,
                       COUNT(*)::int AS count
                FROM fabric_transactions WHERE tx_type=$1
                GROUP BY year, month ORDER BY year DESC, month DESC`, [t]);
            const years = {};
            rows.forEach(r => { if (!years[r.year]) years[r.year] = { year: r.year, months: [], count: 0 }; years[r.year].months.push({ month: r.month, count: r.count }); years[r.year].count += r.count; });
            const total = rows.reduce((s, r) => s + r.count, 0);
            types.push({ type: t, label: TX_LABELS[t], total, years: Object.values(years).sort((a,b) => b.year - a.year) });
        }
        const grand = await db.get(`SELECT COUNT(*)::int AS total FROM fabric_transactions`);
        return { types, grand_total: (grand||{}).total||0 };
    });

    // ========== LIST ==========
    fastify.get('/api/fabrictx/records', { preHandler: [authenticate] }, async (req) => {
        const { tx_type, year, month, status, search } = req.query;
        let where = 'WHERE 1=1', params = [], idx = 1;
        if (tx_type && TX_TYPES.includes(tx_type)) { where += ` AND ft.tx_type=$${idx++}`; params.push(tx_type); }
        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(ft.tx_date,ft.created_at))=$${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(ft.tx_date,ft.created_at))=$${idx++}`; params.push(Number(month)); }
        if (status === 'approved') where += ` AND ft.is_approved=true`;
        else if (status === 'pending') where += ` AND ft.is_approved=false`;
        else if (status === 'debt') where += ` AND ft.debt > 0`;
        if (search) { where += ` AND (ft.material_name ILIKE $${idx} OR ft.color_name ILIKE $${idx} OR ft.source_name ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        const records = await db.all(`
            WITH seq_hoan AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY tx_date ASC NULLS FIRST, created_at ASC, id ASC) as seq_num
                FROM fabric_transactions
                WHERE tx_type = 'HOAN'
            )
            SELECT ft.*, u.full_name AS staff_name, u_ap.full_name AS approved_by_name,
                   u_ap1.full_name AS approved_1_by_name,
                   u_pp.full_name AS postponed_by_name,
                   lh.performed_at AS last_update_at, lhu.full_name AS last_update_by,
                   s.seq_num
            FROM fabric_transactions ft
            LEFT JOIN seq_hoan s ON ft.id = s.id
            LEFT JOIN users u ON ft.staff_id=u.id 
            LEFT JOIN users u_ap ON ft.approved_by=u_ap.id
            LEFT JOIN users u_ap1 ON ft.approved_1_by=u_ap1.id
            LEFT JOIN users u_pp ON ft.postponed_by=u_pp.id
            LEFT JOIN LATERAL (SELECT h.performed_at, h.performed_by FROM fabric_tx_history h WHERE h.tx_id=ft.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY ft.tx_date DESC NULLS LAST, ft.created_at DESC`, params);
        return { records };
    });

    // ========== GET ROLLS FOR A TRANSACTION ==========
    fastify.get('/api/fabrictx/records/:id/rolls', { preHandler: [authenticate] }, async (req) => {
        const id = Number(req.params.id);
        if (isNaN(id)) return { rolls: [] };
        const rolls = await db.all(`
            SELECT id, fabric_color_id, weight, roll_code, source_import_id
            FROM kv_rolls
            WHERE return_tx_id = $1
            ORDER BY id ASC
        `, [id]);
        return { rolls };
    });

    // ========== CREATE ==========
    fastify.post('/api/fabrictx/records', { preHandler: [authenticate] }, async (req, reply) => {
        const b = req.body || {}, now = vnNow();
        if (!b.tx_type || !TX_TYPES.includes(b.tx_type)) return { error: 'Loại nghiệp vụ không hợp lệ' };
        if (b.tx_type === 'HOAN') {
            const canReturn = req.user && (
                req.user.role === 'giam_doc' || 
                req.user.username === 'trinh' || 
                (req.user.full_name && req.user.full_name.includes('Lê Việt Trinh'))
            );
            if (!canReturn) {
                return { error: 'Bạn không có quyền thực hiện hoàn trả cây vải.' };
            }
        }
        const fin = calcFin(b.total_quantity, b.price);
        
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

        const r = await db.get(`INSERT INTO fabric_transactions
            (tx_type,tx_date,source_name,staff_id,material_name,color_name,unit,tree_details,tree_count,
             total_quantity,price,total_amount,debt,payment,notes,bill_images,created_by,created_at,
             is_postponed, postponed_at, postponed_by, postponed_images, postponed_notes, postponed_target_date, shelf_names)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19,$20,$21,$22::jsonb,$23,$24,$25) RETURNING id`,
            [b.tx_type, b.tx_date||null, b.source_name||null, b.staff_id||null,
             b.material_name||null, b.color_name||null, b.unit||'kg',
             b.tree_details||null, Number(b.tree_count)||0,
             Number(b.total_quantity)||0, Number(b.price)||0, fin.total_amount,
             Number(b.debt)||0, Number(b.payment)||0, b.notes||null,
             JSON.stringify(b.bill_images||[]), req.user.id, now,
             isPostponed, postponedAt, postponedBy, postponedImages, postponedNotes, postponedTargetDate, b.shelf_names||null]);
        
        await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [r.id, 'create', isPostponed ? `Tạo ${TX_LABELS[b.tx_type]} (Có hẹn lịch lùi)` : `Tạo ${TX_LABELS[b.tx_type]}`, req.user.id, now]);
        return { success: true, id: r.id };
    });

    // ========== TOGGLE APPROVE ==========
    fastify.post('/api/fabrictx/toggle/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { action } = req.body || {}, now = vnNow();
        if (action === 'approve') {
            if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Chỉ QLX/GĐ/KT' });
            
            const tx = await db.get('SELECT tx_type FROM fabric_transactions WHERE id=$1', [id]);
            if (tx && tx.tx_type === 'HOAN') {
                return reply.code(400).send({ error: 'Vui lòng sử dụng quy trình xác nhận 2 bước cho giao dịch hoàn vải.' });
            }

            await db.run(`UPDATE fabric_transactions SET is_approved=true, approved_at=$1, approved_by=$2, updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, 'approve', '✅ Duyệt', req.user.id, now]);
        } else if (action === 'unapprove') {
            if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Không có quyền' });
            
            const tx = await db.get('SELECT tx_type FROM fabric_transactions WHERE id=$1', [id]);
            if (tx && tx.tx_type === 'HOAN') {
                return reply.code(400).send({ error: 'Không thể hoàn tác giao dịch hoàn vải đã duyệt!' });
            }

            await db.run(`UPDATE fabric_transactions SET is_approved=false, approved_at=NULL, approved_by=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, 'unapprove', '↩️ Hoàn tác duyệt', req.user.id, now]);
        } else { return reply.code(400).send({ error: 'Action không hợp lệ' }); }
        return { success: true };
    });

    // ========== POSTPONE RETURN ==========
    fastify.post('/api/fabrictx/postpone/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Không có quyền thực hiện thao tác này' });
        const id = Number(req.params.id), { images, notes, target_date } = req.body || {}, now = vnNow();
        
        if (!target_date) {
            return reply.code(400).send({ error: 'Vui lòng chọn thời gian lùi lịch hoàn vải' });
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
            `UPDATE fabric_transactions
             SET is_postponed = true, postponed_at = $1, postponed_by = $2,
                 postponed_images = $3::jsonb, postponed_notes = $4,
                 postponed_target_date = $5, updated_at = $1
             WHERE id = $6`,
            [now, req.user.id, JSON.stringify(images || []), notes || null, target_date, id]
        );
        await db.run(
            `INSERT INTO fabric_tx_history (tx_id, action, details, performed_by, performed_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, 'postpone', `Lùi lịch hoàn vải đến ngày ${target_date}: ${notes || ''}`, req.user.id, now]
        );
        return { success: true };
    });

    // ========== UNPOSTPONE RETURN ==========
    fastify.post('/api/fabrictx/unpostpone/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Không có quyền thực hiện thao tác này' });
        const id = Number(req.params.id), now = vnNow();
        await db.run(
            `UPDATE fabric_transactions
             SET is_postponed = false, postponed_at = NULL, postponed_by = NULL,
                 postponed_images = '[]'::jsonb, postponed_notes = NULL,
                 postponed_target_date = NULL, updated_at = $1
             WHERE id = $2`,
            [now, id]
        );
        await db.run(
            `INSERT INTO fabric_tx_history (tx_id, action, details, performed_by, performed_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, 'unpostpone', `Hủy lùi lịch hoàn vải`, req.user.id, now]
        );
        return { success: true };
    });

    // ========== UPLOAD POSTPONE PROOF IMAGE ==========
    fastify.post('/api/fabrictx/upload-postpone/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Không có quyền thực hiện thao tác này' });
        const id = Number(req.params.id);
        const data = await req.file();
        if (!data) return reply.code(400).send({ error: 'Không có file' });
        const uploadDir = path.join(__dirname, '..', 'uploads', 'postpone');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const ext = path.extname(data.filename) || '.webp';
        const fn = `pp_${id}_${Date.now()}${ext}`;
        const fp = path.join(uploadDir, fn);
        const buf = await data.toBuffer();
        fs.writeFileSync(fp, buf);
        const url = `/uploads/postpone/${fn}`;
        return { success: true, url };
    });

    // ========== INLINE FIELD ==========
    fastify.patch('/api/fabrictx/records/:id/field', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { field, value } = req.body || {}, now = vnNow();
        const ALLOWED = ['tx_type','tx_date','source_name','staff_id','material_name','color_name','unit',
            'tree_details','tree_count','total_quantity','price','debt','payment','notes'];
        if (!ALLOWED.includes(field)) return reply.code(400).send({ error: 'Trường không hợp lệ' });
        if (field === 'price') {
            if (!(await isGdOrTrinh(req))) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc chị Lê Việt Trinh mới có quyền thay đổi đơn giá!' });
            }
        }
        const numF = ['staff_id','tree_count','total_quantity','price','debt','payment'];
        const fv = numF.includes(field) ? (Number(value)||0) : (value||null);
        await db.run(`UPDATE fabric_transactions SET ${field}=$1, updated_at=$2 WHERE id=$3`, [fv, now, id]);
        if (['total_quantity','price'].includes(field)) {
            const rec = await db.get('SELECT total_quantity, price FROM fabric_transactions WHERE id=$1', [id]);
            if (rec) { const fin = calcFin(rec.total_quantity, rec.price);
                await db.run(`UPDATE fabric_transactions SET total_amount=$1 WHERE id=$2`, [fin.total_amount, id]); }
        }
        await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'inline_update', `${field}: ${value}`, req.user.id, now]);
        return { success: true };
    });

    // ========== UPLOAD BILL IMAGE ==========
    fastify.post('/api/fabrictx/upload/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), now = vnNow();
        const data = await req.file();
        if (!data) return reply.code(400).send({ error: 'Không có file' });
        const uploadDir = path.join(__dirname, '..', 'uploads', 'fabrictx');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const ext = path.extname(data.filename) || '.jpg';
        const fn = `ftx_${id}_${Date.now()}${ext}`;
        const fp = path.join(uploadDir, fn);
        const buf = await data.toBuffer();
        fs.writeFileSync(fp, buf);
        const url = `/uploads/fabrictx/${fn}`;
        const rec = await db.get('SELECT bill_images FROM fabric_transactions WHERE id=$1', [id]);
        let imgs = [];
        try { imgs = JSON.parse(rec.bill_images || '[]'); } catch(e) {}
        if (!Array.isArray(imgs)) imgs = [];
        imgs.push(url);
        await db.run(`UPDATE fabric_transactions SET bill_images=$1::jsonb, updated_at=$2 WHERE id=$3`, [JSON.stringify(imgs), now, id]);
        await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'upload', `📸 Upload ảnh bill`, req.user.id, now]);
        return { success: true, url, images: imgs };
    });

    // ========== UPDATE ==========
    fastify.put('/api/fabrictx/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), b = req.body || {}, now = vnNow();
        
        const old = await db.get('SELECT price FROM fabric_transactions WHERE id=$1', [id]);
        if (old && b.price !== undefined && Number(old.price) !== Number(b.price)) {
            if (!(await isGdOrTrinh(req))) {
                return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc chị Lê Việt Trinh mới có quyền thay đổi đơn giá!' });
            }
        }
        
        const fin = calcFin(b.total_quantity, b.price);
        await db.run(`UPDATE fabric_transactions SET tx_type=$1,tx_date=$2,source_name=$3,staff_id=$4,material_name=$5,
            color_name=$6,unit=$7,tree_details=$8,tree_count=$9,total_quantity=$10,price=$11,total_amount=$12,
            debt=$13,payment=$14,notes=$15,shelf_names=$16,updated_at=$17 WHERE id=$18`,
            [b.tx_type, b.tx_date||null, b.source_name||null, b.staff_id||null,
             b.material_name||null, b.color_name||null, b.unit||'kg',
             b.tree_details||null, Number(b.tree_count)||0,
             Number(b.total_quantity)||0, Number(b.price)||0, fin.total_amount,
             Number(b.debt)||0, Number(b.payment)||0, b.notes||null,
             b.shelf_names||null, now, id]);
        await db.run(`INSERT INTO fabric_tx_history (tx_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật giao dịch', req.user.id, now]);
        return { success: true };
    });

    // ========== DELETE ==========
    fastify.delete('/api/fabrictx/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isNxhvManager(req)) && req.user.role !== 'ke_toan') return reply.code(403).send({ error: 'Chỉ QLX/GĐ/KT' });
        const id = Number(req.params.id);
        await db.run(`DELETE FROM kv_transactions WHERE description LIKE 'Trả NCC (%' || $1 || '):%'`, [id]);
        await db.run(`UPDATE kv_rolls SET is_returned = false, location = original_location, original_location = NULL, return_tx_id = NULL WHERE return_tx_id = $1`, [id]);
        await db.run('DELETE FROM fabric_transactions WHERE id=$1', [id]);
        return { success: true };
    });

    // ========== STAFF ==========
    fastify.get('/api/fabrictx/staff', { preHandler: [authenticate] }, async () => {
        return { staff: await db.all(`SELECT id, full_name, username FROM users WHERE status='active' AND role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien') ORDER BY full_name`) };
    });

    // ========== NXHV CONFIG ==========
    fastify.get('/api/fabrictx/config', { preHandler: [authenticate] }, async () => {
        const row = await db.get("SELECT value FROM app_config WHERE key = 'nxhv_max_postpone_days'");
        const maxDays = row ? parseInt(row.value) : 3;
        return { max_postpone_days: maxDays };
    });

    fastify.post('/api/fabrictx/config', { preHandler: [authenticate] }, async (req, reply) => {
        if (req.user.role !== 'giam_doc') {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc mới có quyền thay đổi cấu hình này' });
        }
        const { max_postpone_days } = req.body || {};
        const val = parseInt(max_postpone_days);
        if (isNaN(val) || val < 1 || val > 30) {
            return reply.code(400).send({ error: 'Thời gian lùi lịch tối đa không hợp lệ (1 - 30 ngày)' });
        }
        await db.run(
            `INSERT INTO app_config (key, value) VALUES ('nxhv_max_postpone_days', $1)
             ON CONFLICT (key) DO UPDATE SET value = $1`,
            [String(val)]
        );
        return { success: true };
    });

    // ========== CONFIRM 1 (ĐÃ BÀN GIAO NCC) ==========
    fastify.post('/api/fabrictx/confirm1/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { image_data } = req.body || {}, now = vnNow();
        
        const tx = await db.get('SELECT * FROM fabric_transactions WHERE id=$1', [id]);
        if (!tx) return reply.code(404).send({ error: 'Không tìm thấy giao dịch' });
        if (tx.tx_type !== 'HOAN') return reply.code(400).send({ error: 'Không phải giao dịch hoàn vải' });
        if (tx.is_approved_1) return reply.code(400).send({ error: 'Giao dịch đã được xác nhận lần 1' });
        if (tx.is_canceled) return reply.code(400).send({ error: 'Giao dịch đã bị hủy' });
        if (!image_data) return reply.code(400).send({ error: 'Hình ảnh nhà cung cấp lấy vải bắt buộc (Chụp/Dán ảnh)' });

        // Save image
        let imageUrl = '';
        let fpath = '';
        if (image_data.startsWith('/uploads/')) {
            imageUrl = image_data;
            fpath = path.join(__dirname, '..', image_data);
        } else {
            const dir = path.join(__dirname, '..', 'uploads', 'fabrictx');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const fname = `ftx_confirm1_${id}_${Date.now()}.png`;
            fpath = path.join(dir, fname);
            const base64 = image_data.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(fpath, Buffer.from(base64, 'base64'));
            imageUrl = `/uploads/fabrictx/${fname}`;
        }

        const pool = db.getDB();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. Update fabric_transactions
            let billImgs = [];
            try { billImgs = typeof tx.bill_images === 'string' ? JSON.parse(tx.bill_images || '[]') : (tx.bill_images || []); } catch(e) {}
            if (!billImgs.includes(imageUrl)) billImgs.push(imageUrl);
            
            await client.query(
                `UPDATE fabric_transactions 
                 SET is_approved_1 = true, approved_1_at = $1, approved_1_by = $2, bill_images = $3::jsonb, updated_at = $1 
                 WHERE id = $4`,
                [now, req.user.id, JSON.stringify(billImgs), id]
            );

            // 2. Insert kv_transactions & Update kv_rolls (mark as returned immediately to deduct inventory)
            const rollsRes = await client.query(
                `SELECT id, fabric_color_id, weight FROM kv_rolls WHERE return_tx_id = $1 AND is_returned = false`,
                [id]
            );
            for (const roll of rollsRes.rows) {
                await client.query(
                    `INSERT INTO kv_transactions (fabric_color_id, tx_type, quantity, description, created_by, created_at)
                     VALUES ($1, 'XUAT', $2, $3, $4, $5)`,
                    [roll.fabric_color_id, Number(roll.weight), `Trả NCC (Bàn giao hoàn #${id}): cục ${roll.weight}`, req.user.id, now]
                );
            }

            await client.query(
                `UPDATE kv_rolls 
                 SET is_returned = true, location = NULL, updated_at = $1 
                 WHERE return_tx_id = $2 AND is_returned = false`,
                [now, id]
            );

            // 3. History
            await client.query(
                `INSERT INTO fabric_tx_history (tx_id, action, details, performed_by, performed_at)
                 VALUES ($1, 'confirm1', 'Xác nhận lần 1: Đã bàn giao cho nhà cung cấp lấy vải về và xuất kho', $2, $3)`,
                [id, req.user.id, now]
            );

            await client.query('COMMIT');
        } catch(err) {
            await client.query('ROLLBACK');
            console.error('[NXHV Confirm1]', err.message);
            return reply.code(400).send({ error: err.message || 'Lỗi khi xác nhận lần 1' });
        } finally {
            client.release();
        }

        // 4. Send Telegram Notification
        try {
            const { sendTelegramPhoto, getBotToken } = require('../utils/telegram');
            const token = await getBotToken();
            const tgConfigRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_global_hoan_vai'");
            const chatId = tgConfigRow?.value?.trim();

            if (chatId) {
                const formattedNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                const caption = `🔄 <b>HOÀN VẢI (XÁC NHẬN LẦN 1)</b>\n` +
                                `━━━━━━━━━━━━━━━━━\n` +
                                `📦 <b>Mã giao dịch:</b> Bill Hoàn #${tx.id}\n` +
                                `🏢 <b>Nhà cung cấp:</b> ${tx.source_name || '—'}\n` +
                                `👕 <b>Chất liệu:</b> ${tx.material_name || '—'}\n` +
                                `🎨 <b>Màu vải:</b> ${tx.color_name || '—'}\n` +
                                `⚖️ <b>Số lượng:</b> ${Number(tx.total_quantity).toLocaleString('vi-VN')} kg\n` +
                                `👤 <b>Người thực hiện:</b> ${req.user.full_name}\n` +
                                `📆 <b>Thời gian:</b> ${formattedNow}\n\n` +
                                `⏳ <i>Chờ Kế Toán cân thực tế và thực hiện xác nhận lần 2.</i>`;

                if (fpath && fs.existsSync(fpath)) {
                    await sendTelegramPhoto(chatId, fpath, caption);
                } else {
                    const { sendTelegramMessage } = require('../utils/telegram');
                    await sendTelegramMessage(chatId, caption);
                }
            }
        } catch(tgErr) {
            console.error('[NXHV Confirm1 TG Error]', tgErr.message);
        }

        return { success: true };
    });

    // Helper to auto-create refund bill in import_records
    async function createRefundBill(client, tx, actQty, price, userId, now) {
        let sourceId = null;
        const sourceName = tx.source_name ? tx.source_name.trim() : '';
        if (sourceName) {
            const srcRow = await client.query(
                `SELECT id FROM import_sources WHERE name ILIKE $1 LIMIT 1`,
                [sourceName]
            );
            if (srcRow.rows.length > 0) {
                sourceId = srcRow.rows[0].id;
            } else {
                const insertSrc = await client.query(
                    `INSERT INTO import_sources (name, source_type, created_at) VALUES ($1, 'fabric', NOW()) RETURNING id`,
                    [sourceName]
                );
                sourceId = insertSrc.rows[0].id;
            }
        }

        const totalRefundAmt = Number(actQty) * Number(price);
        const refundCode = `HV-${tx.id}`;

        let billImg = null;
        if (tx.bill_images) {
            try {
                const imgs = typeof tx.bill_images === 'string' ? JSON.parse(tx.bill_images) : tx.bill_images;
                if (Array.isArray(imgs) && imgs.length > 0) {
                    billImg = imgs[0];
                }
            } catch (e) {
                console.error('[NXHV createRefundBill parse images error]', e);
            }
        }

        const importResult = await client.query(
            `INSERT INTO import_records (
                record_type, fabric_import_code, import_date, source_id, importer_id,
                fabric_material, fabric_quantity, material_quantity,
                cost, refund, total_amount, paid, debt,
                bill_image_url, cost_notes, created_by, created_at, updated_at
             ) VALUES (
                'refund', $1, $2, $3, $4,
                $5, $6, $7,
                $8, $9, 0, 0, $10,
                $11, $12, $4, $13, $13
             ) RETURNING id`,
            [
                refundCode,
                now, // Use current approval date as import_date to sort refund to the top of ledger
                sourceId,
                userId,
                `Hoàn vải chất liệu - màu vải: ${tx.material_name || ''} - ${tx.color_name || ''}`,
                actQty,
                tx.tree_count || 1,
                totalRefundAmt,
                totalRefundAmt,
                -totalRefundAmt,
                billImg,
                `Hoàn trả từ giao dịch hoàn vải #${tx.id} (Yêu cầu ngày ${tx.tx_date || ''})`,
                now
            ]
        );

        const refundRecordId = importResult.rows[0].id;

        await client.query(
            `INSERT INTO import_history (import_id, action, details, performed_by, performed_at)
             VALUES ($1, 'create_refund', $2, $3, $4)`,
            [refundRecordId, `Tự động tạo bill hoàn từ giao dịch hoàn vải #${tx.id}`, userId, now]
        );
        
        return refundRecordId;
    }

    // ========== CONFIRM 2 (KẾ TOÁN ĐỐI CHIẾU CÂN NẶNG THỰC TẾ) ==========
    fastify.post('/api/fabrictx/confirm2/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { actual_quantity, image_data, notes } = req.body || {}, now = vnNow();

        if (!(await isAccountantOrMgmt(req))) {
            return reply.code(403).send({ error: 'Chỉ Kế toán, Giám đốc, hoặc Lê Việt Trinh mới có quyền thực hiện xác nhận lần 2!' });
        }

        const tx = await db.get('SELECT * FROM fabric_transactions WHERE id=$1', [id]);
        if (!tx) return reply.code(404).send({ error: 'Không tìm thấy giao dịch' });
        if (tx.tx_type !== 'HOAN') return reply.code(400).send({ error: 'Không phải giao dịch hoàn vải' });
        if (!tx.is_approved_1) return reply.code(400).send({ error: 'Giao dịch chưa được xác nhận lần 1' });
        if (tx.is_approved) return reply.code(400).send({ error: 'Giao dịch đã được xác nhận lần 2' });
        if (tx.is_canceled) return reply.code(400).send({ error: 'Giao dịch đã bị hủy' });

        const actQty = Number(actual_quantity);
        if (isNaN(actQty) || actQty <= 0) {
            return reply.code(400).send({ error: 'Số lượng thực tế không hợp lệ' });
        }

        const initialQty = Number(tx.total_quantity);
        const qtyDiff = actQty - initialQty;

        // If weight differs, proof photo is mandatory!
        if (Math.abs(qtyDiff) > 0.001 && !image_data && !tx.actual_quantity_images?.length) {
            return reply.code(400).send({ error: 'Sai lệch số lượng cân nặng thực tế so với ban đầu. Bắt buộc phải có hình ảnh chụp cân nặng để chứng minh!' });
        }

        // Save actual quantity image if provided
        let imageUrl = '';
        let fpath = '';
        if (image_data) {
            if (image_data.startsWith('/uploads/')) {
                imageUrl = image_data;
                fpath = path.join(__dirname, '..', image_data);
            } else {
                const dir = path.join(__dirname, '..', 'uploads', 'fabrictx');
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const fname = `ftx_confirm2_${id}_${Date.now()}.png`;
                fpath = path.join(dir, fname);
                const base64 = image_data.replace(/^data:image\/\w+;base64,/, '');
                fs.writeFileSync(fpath, Buffer.from(base64, 'base64'));
                imageUrl = `/uploads/fabrictx/${fname}`;
            }
        }

        // Case 2: Actual weight is LESS than initial weight -> Require discrepancy approval
        if (actQty < initialQty) {
            let actualImages = [];
            if (imageUrl) {
                actualImages.push(imageUrl);
            } else if (tx.actual_quantity_images) {
                try {
                    actualImages = typeof tx.actual_quantity_images === 'string' ? JSON.parse(tx.actual_quantity_images) : tx.actual_quantity_images;
                } catch(e) {}
            }

            await db.run(
                `UPDATE fabric_transactions 
                 SET needs_discrepancy_approval = true, discrepancy_approved = false,
                     initial_quantity = $1, actual_quantity = $2,
                     actual_quantity_images = $3::jsonb, actual_quantity_notes = $4,
                     updated_at = $5
                 WHERE id = $6`,
                [initialQty, actQty, JSON.stringify(actualImages), notes || null, now, id]
            );

            // History
            await db.run(
                `INSERT INTO fabric_tx_history (tx_id, action, details, performed_by, performed_at)
                 VALUES ($1, 'request_discrepancy_approval', $2, $3, $4)`,
                [id, `Yêu cầu duyệt sai lệch cân nặng: Cân thực tế ${actQty} kg < Ban đầu ${initialQty} kg. Chờ QL Lê Việt Trinh duyệt.`, req.user.id, now]
            );

            // Send Telegram to Lê Việt Trinh / Manager
            try {
                const { sendTelegramPhoto, getBotToken, sendTelegramMessage } = require('../utils/telegram');
                const token = await getBotToken();
                const tgConfigRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_global_hoan_vai'");
                const chatId = tgConfigRow?.value?.trim();
                
                if (chatId) {
                    const formattedNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                    const diffText = `${qtyDiff.toFixed(2)} kg`;
                    
                    const caption = `⚠️ <b>YÊU CẦU DUYỆT SAI LỆCH HOÀN VẢI (CÂN THỰC TẾ ÍT HƠN)</b>\n` +
                                    `━━━━━━━━━━━━━━━━━\n` +
                                    `📦 <b>Mã giao dịch:</b> Bill Hoàn #${id}\n` +
                                    `🏢 <b>Nhà cung cấp:</b> ${tx.source_name || '—'}\n` +
                                    `👕 <b>Chất liệu:</b> ${tx.material_name || '—'}\n` +
                                    `🎨 <b>Màu vải:</b> ${tx.color_name || '—'}\n` +
                                    `⚖️ <b>Cân nặng ban đầu:</b> ${initialQty.toLocaleString('vi-VN')} kg\n` +
                                    `⚖️ <b>Cân nặng thực tế:</b> ${actQty.toLocaleString('vi-VN')} kg\n` +
                                    `🔴 <b>Hao hụt (Sai lệch):</b> ${diffText}\n` +
                                    `👤 <b>Kế toán yêu cầu:</b> ${req.user.full_name}\n` +
                                    `📆 <b>Thời gian:</b> ${formattedNow}\n\n` +
                                    `👉 <b>Vui lòng quản lý Lê Việt Trinh hoặc Giám Đốc vào duyệt sai lệch để hoàn tất giao dịch!</b>`;
                    
                    if (imageUrl && fpath && fs.existsSync(fpath)) {
                        await sendTelegramPhoto(chatId, fpath, caption);
                    } else {
                        await sendTelegramMessage(chatId, caption);
                    }
                }
            } catch (tgErr) {
                console.error('[NXHV Confirm2 Discrepancy TG Error]', tgErr.message);
            }

            return { success: true, needs_discrepancy_approval: true };
        }

        // Case 1: Actual weight >= initial weight -> Complete immediately
        const totalAmount = actQty * Number(tx.price);
        const debt = totalAmount - Number(tx.payment);

        const pool = db.getDB();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let actualImages = [];
            if (imageUrl) {
                actualImages.push(imageUrl);
            } else if (tx.actual_quantity_images) {
                try {
                    actualImages = typeof tx.actual_quantity_images === 'string' ? JSON.parse(tx.actual_quantity_images) : tx.actual_quantity_images;
                } catch(e) {}
            }

            // 1. Update fabric_transactions
            await client.query(
                `UPDATE fabric_transactions 
                 SET is_approved = true, approved_at = $1, approved_by = $2,
                     initial_quantity = $3, actual_quantity = $4,
                     actual_quantity_images = $5::jsonb, actual_quantity_notes = $6,
                     total_quantity = $4, total_amount = $7, debt = $8, updated_at = $1,
                     needs_discrepancy_approval = false, discrepancy_approved = false
                 WHERE id = $9`,
                [now, req.user.id, initialQty, actQty, JSON.stringify(actualImages), notes || null, totalAmount, debt, id]
            );

            // 2. kv_rolls and kv_transactions are already updated in confirm1 (Step 1)

            // 3. Auto-create refund bill in import_records
            await createRefundBill(client, tx, actQty, tx.price, req.user.id, now);

            // 4. History
            await client.query(
                `INSERT INTO fabric_tx_history (tx_id, action, details, performed_by, performed_at)
                 VALUES ($1, 'confirm2', $2, $3, $4)`,
                [id, `Xác nhận lần 2: Đã đối chiếu cân nặng thực tế ${actQty} kg (Ban đầu: ${initialQty} kg, Sai lệch: ${qtyDiff.toFixed(2)} kg)`, req.user.id, now]
            );

            await client.query('COMMIT');
        } catch(err) {
            await client.query('ROLLBACK');
            console.error('[NXHV Confirm2]', err.message);
            return reply.code(400).send({ error: err.message || 'Lỗi khi xác nhận lần 2' });
        } finally {
            client.release();
        }

        // 5. Send Telegram Notification
        try {
            const { sendTelegramPhoto, getBotToken } = require('../utils/telegram');
            const token = await getBotToken();
            const tgConfigRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_global_hoan_vai'");
            const chatId = tgConfigRow?.value?.trim();

            if (chatId) {
                const formattedNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                const diffText = qtyDiff !== 0 ? `${qtyDiff > 0 ? '+' : ''}${qtyDiff.toFixed(2)} kg` : '0 kg';
                
                const caption = `✅ <b>HOÀN VẢI THÀNH CÔNG (XÁC NHẬN LẦN 2)</b>\n` +
                                `━━━━━━━━━━━━━━━━━\n` +
                                `📦 <b>Mã giao dịch:</b> Bill Hoàn #${tx.id}\n` +
                                `🏢 <b>Nhà cung cấp:</b> ${tx.source_name || '—'}\n` +
                                `👕 <b>Chất liệu:</b> ${tx.material_name || '—'}\n` +
                                `🎨 <b>Màu vải:</b> ${tx.color_name || '—'}\n` +
                                `⚖️ <b>Cân nặng thực tế:</b> ${actQty.toLocaleString('vi-VN')} kg (Ban đầu: ${initialQty.toLocaleString('vi-VN')} kg)\n` +
                                `📊 <b>Sai lệch:</b> ${diffText}\n` +
                                `💰 <b>Thành tiền mới:</b> ${totalAmount.toLocaleString('vi-VN')}đ\n` +
                                `💳 <b>Công nợ mới:</b> ${debt.toLocaleString('vi-VN')}đ\n` +
                                `👤 <b>Kế toán thực hiện:</b> ${req.user.full_name}\n` +
                                `📆 <b>Thời gian:</b> ${formattedNow}\n\n` +
                                `✅ <b>Giao dịch đã được đối chiếu và hoàn tất!</b>`;

                if (imageUrl && fpath && fs.existsSync(fpath)) {
                    await sendTelegramPhoto(chatId, fpath, caption);
                } else {
                    const { sendTelegramMessage } = require('../utils/telegram');
                    await sendTelegramMessage(chatId, caption);
                }
            }
        } catch(tgErr) {
            console.error('[NXHV Confirm2 TG Error]', tgErr.message);
        }

        return { success: true };
    });

    // ========== APPROVE DISCREPANCY (QUẢN LÝ LÊ VIỆT TRINH / GIÁM ĐỐC DUYỆT) ==========
    fastify.post('/api/fabrictx/approve-discrepancy/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isGdOrTrinh(req))) {
            return reply.code(403).send({ error: 'Chỉ Giám Đốc hoặc Lê Việt Trinh mới có quyền duyệt sai lệch!' });
        }
        const id = Number(req.params.id), now = vnNow();
        const tx = await db.get('SELECT * FROM fabric_transactions WHERE id=$1', [id]);
        if (!tx) return reply.code(404).send({ error: 'Không tìm thấy giao dịch' });
        if (!tx.needs_discrepancy_approval) return reply.code(400).send({ error: 'Giao dịch không có sai lệch cần duyệt' });
        if (tx.is_approved) return reply.code(400).send({ error: 'Giao dịch đã được duyệt trước đó' });

        const actQty = Number(tx.actual_quantity);
        const totalAmount = actQty * Number(tx.price);
        const debt = totalAmount - Number(tx.payment);

        const pool = db.getDB();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Update fabric_transactions to approved
            await client.query(
                `UPDATE fabric_transactions 
                 SET is_approved = true, approved_at = $1, approved_by = $2,
                     discrepancy_approved = true, discrepancy_approved_at = $1, discrepancy_approved_by = $2,
                     needs_discrepancy_approval = false,
                     total_quantity = $3, total_amount = $4, debt = $5, updated_at = $1
                 WHERE id = $6`,
                [now, req.user.id, actQty, totalAmount, debt, id]
            );

            // 2. kv_rolls and kv_transactions are already updated in confirm1 (Step 1)

            // 3. Auto-create refund bill in import_records
            await createRefundBill(client, tx, actQty, tx.price, req.user.id, now);

            // 4. History
            await client.query(
                `INSERT INTO fabric_tx_history (tx_id, action, details, performed_by, performed_at)
                 VALUES ($1, 'approve_discrepancy', $2, $3, $4)`,
                [id, `Quản lý duyệt sai lệch: Cân thực tế ${actQty} kg (Ban đầu: ${tx.total_quantity} kg)`, req.user.id, now]
            );

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[NXHV Approve Discrepancy]', err.message);
            return reply.code(400).send({ error: err.message || 'Lỗi khi duyệt sai lệch' });
        } finally {
            client.release();
        }

        // 5. Send Telegram Notification
        try {
            const { sendTelegramPhoto, getBotToken, sendTelegramMessage } = require('../utils/telegram');
            const token = await getBotToken();
            const tgConfigRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_global_hoan_vai'");
            const chatId = tgConfigRow?.value?.trim();

            if (chatId) {
                const formattedNow = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                const initialQty = Number(tx.total_quantity);
                const qtyDiff = actQty - initialQty;
                const diffText = qtyDiff !== 0 ? `${qtyDiff > 0 ? '+' : ''}${qtyDiff.toFixed(2)} kg` : '0 kg';
                
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

                const caption = `✅ <b>QUẢN LÝ DUYỆT SAI LỆCH HOÀN VẢI THÀNH CÔNG</b>\n` +
                                `━━━━━━━━━━━━━━━━━\n` +
                                `📦 <b>Mã giao dịch:</b> Bill Hoàn #${tx.id}\n` +
                                `🏢 <b>Nhà cung cấp:</b> ${tx.source_name || '—'}\n` +
                                `👕 <b>Chất liệu:</b> ${tx.material_name || '—'}\n` +
                                `🎨 <b>Màu vải:</b> ${tx.color_name || '—'}\n` +
                                `⚖️ <b>Cân nặng thực tế chốt:</b> ${actQty.toLocaleString('vi-VN')} kg (Ban đầu: ${initialQty.toLocaleString('vi-VN')} kg)\n` +
                                `📊 <b>Sai lệch hao hụt:</b> ${diffText}\n` +
                                `💰 <b>Thành tiền chốt:</b> ${totalAmount.toLocaleString('vi-VN')}đ\n` +
                                `💳 <b>Công nợ chốt:</b> ${debt.toLocaleString('vi-VN')}đ\n` +
                                `👤 <b>Quản lý duyệt:</b> ${req.user.full_name}\n` +
                                `📆 <b>Thời gian:</b> ${formattedNow}\n\n` +
                                `✅ <b>Giao dịch hao hụt đã được phê duyệt và tạo Bill hoàn tất!</b>`;

                if (proofImg && fpath && fs.existsSync(fpath)) {
                    await sendTelegramPhoto(chatId, fpath, caption);
                } else {
                    await sendTelegramMessage(chatId, caption);
                }
            }
        } catch(tgErr) {
            console.error('[NXHV Approve Discrepancy TG Error]', tgErr.message);
        }

        return { success: true };
    });
};

