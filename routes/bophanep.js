// ========== BỘ PHẬN ÉP — Routes ==========
const db = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { vnNow } = require('../utils/timezone');
const path = require('path');
const fs = require('fs');

module.exports = async function(fastify) {

    // ========== AUTO-MIGRATE ==========
    try { await db.exec(`CREATE TABLE IF NOT EXISTS pressing_records (
        id SERIAL PRIMARY KEY, dht_order_id INTEGER,
        is_reported BOOLEAN DEFAULT false, reported_at TIMESTAMPTZ, reported_by INTEGER REFERENCES users(id),
        salary_approved BOOLEAN DEFAULT false, salary_approved_at TIMESTAMPTZ, salary_approved_by INTEGER REFERENCES users(id),
        error_reported BOOLEAN DEFAULT false, error_order_id INTEGER,
        press_date DATE, presser_id INTEGER REFERENCES users(id),
        product_name TEXT, cskh_name TEXT,
        order_quantity INTEGER DEFAULT 0, press_quantity INTEGER DEFAULT 0,
        press_salary NUMERIC DEFAULT 0,
        pos_chest_arm INTEGER DEFAULT 0, pos_back_belly INTEGER DEFAULT 0,
        pos_protective INTEGER DEFAULT 0, pos_packaging INTEGER DEFAULT 0, pos_other TEXT,
        press_images TEXT DEFAULT '[]', notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_pr_presser ON pressing_records(presser_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_pr_date ON pressing_records(press_date)`);

    try {
        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS order_item_id INTEGER`);
        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS material_name TEXT`);
        await db.exec(`ALTER TABLE pressing_records ADD COLUMN IF NOT EXISTS fabric_color TEXT`);
    } catch(errCol) { console.error('[BPE] ALTER TABLE migration:', errCol.message); }

    } catch(e) { console.error('[BPE] records:', e.message); }

    try { await db.exec(`CREATE TABLE IF NOT EXISTS pressing_history (
        id SERIAL PRIMARY KEY, pressing_id INTEGER NOT NULL REFERENCES pressing_records(id) ON DELETE CASCADE,
        action TEXT NOT NULL, details TEXT, performed_by INTEGER REFERENCES users(id),
        performed_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ph_pid ON pressing_history(pressing_id)`);
    } catch(e) { console.error('[BPE] history:', e.message); }

    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'pressing');
    try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch(e) {}

    // ========== HELPERS ==========
    const MGMT = ['giam_doc', 'quan_ly_cap_cao'];
    async function isPressManager(req) {
        if (MGMT.includes(req.user.role)) return true;
        const d = await db.get(`SELECT d.name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.id=$1`, [req.user.id]);
        if (d && d.name) { const n = d.name.toLowerCase(); if (n.includes('qlx') || n.includes('ép') || n.includes('ep') || n.includes('quản lý xưởng')) return true; }
        return false;
    }

    async function calculatePresserSalary(presserId, posChest, posBack, posProt, posPack, posOther) {
        if (!presserId) return { salary: 0, price_chest_arm: 0, price_back_belly: 0, price_protective: 0, price_packaging: 0, price_other: 0 };
        const assignment = await db.get(`SELECT tier_id FROM user_pressing_salary_tiers WHERE user_id = $1`, [presserId]);
        if (!assignment) return { salary: 0, price_chest_arm: 0, price_back_belly: 0, price_protective: 0, price_packaging: 0, price_other: 0 };
        const tier = await db.get(`
            SELECT price_chest_arm, price_back_belly, price_protective, price_packaging, price_other
            FROM pressing_salary_tiers WHERE id = $1
        `, [assignment.tier_id]);
        if (!tier) return { salary: 0, price_chest_arm: 0, price_back_belly: 0, price_protective: 0, price_packaging: 0, price_other: 0 };

        const chestPrice = Number(tier.price_chest_arm) || 0;
        const backPrice = Number(tier.price_back_belly) || 0;
        const protPrice = Number(tier.price_protective) || 0;
        const packPrice = Number(tier.price_packaging) || 0;
        const otherPrice = Number(tier.price_other) || 0;

        const chestQty = Number(posChest) || 0;
        const backQty = Number(posBack) || 0;
        const protQty = Number(posProt) || 0;
        const packQty = Number(posPack) || 0;
        const otherQty = Number(posOther) || 0;

        const totalSalary = (chestQty * chestPrice) +
                            (backQty * backPrice) +
                            (protQty * protPrice) +
                            (packQty * packPrice) +
                            (otherQty * otherPrice);

        return { 
            salary: totalSalary,
            price_chest_arm: chestPrice,
            price_back_belly: backPrice,
            price_protective: protPrice,
            price_packaging: packPrice,
            price_other: otherPrice
        };
    }

    // ========== TREE ==========
    fastify.get('/api/pressing/tree', { preHandler: [authenticate] }, async (req) => {
        const mgr = await isPressManager(req);
        let where = '', params = [];
        if (!mgr && !['quan_ly','truong_phong'].includes(req.user.role)) { where = ' AND pr.presser_id=$1'; params.push(req.user.id); }
        
        const rows = await db.all(`
            SELECT
                EXTRACT(YEAR FROM COALESCE(pr.press_date, pr.created_at))::int AS year,
                pr.presser_id,
                u.full_name AS presser_name,
                pr.is_reported,
                CASE WHEN pr.is_reported THEN
                    EXTRACT(MONTH FROM COALESCE(pr.reported_at, pr.press_date, pr.created_at))::int
                ELSE NULL END AS done_month,
                COUNT(*)::int AS cnt
            FROM pressing_records pr
            LEFT JOIN users u ON pr.presser_id = u.id
            WHERE 1=1 ${where}
            GROUP BY year, pr.presser_id, u.full_name, pr.is_reported, done_month
            ORDER BY year DESC, u.full_name, done_month DESC
        `, params);

        const total = rows.reduce((s, r) => s + r.cnt, 0);
        const yearMap = {};
        for (const r of rows) {
            if (!yearMap[r.year]) yearMap[r.year] = { year: r.year, count: 0, pressers: {} };
            const prKey = r.presser_id || 0;
            if (!yearMap[r.year].pressers[prKey]) {
                yearMap[r.year].pressers[prKey] = {
                    id: r.presser_id, name: r.presser_name || 'Chưa phân công',
                    total: 0, incomplete_count: 0, months: {}
                };
            }
            const presser = yearMap[r.year].pressers[prKey];
            presser.total += r.cnt;
            yearMap[r.year].count += r.cnt;
            if (r.is_reported && r.done_month) {
                if (!presser.months[r.done_month]) presser.months[r.done_month] = { month: r.done_month, count: 0 };
                presser.months[r.done_month].count += r.cnt;
            } else {
                presser.incomplete_count += r.cnt;
            }
        }

        const yearTree = Object.values(yearMap).map(y => ({
            year: y.year, count: y.count,
            pressers: Object.values(y.pressers).map(p => ({
                ...p, months: Object.values(p.months).sort((a, b) => b.month - a.month)
            }))
        })).sort((a, b) => b.year - a.year);

        // Count unassigned items for pressing
        const unassigned = await db.get(`
            WITH item_status AS (
                SELECT 
                    oi.id AS item_id,
                    (
                        EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = oi.id)
                        AND NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = oi.id AND cr.is_cut_done = false)
                    ) AS is_cut_done,
                    (
                        EXISTS (
                            SELECT 1 FROM printing_records pr 
                            WHERE (
                                pr.order_item_id = oi.id 
                                OR (
                                    pr.order_item_id IS NULL 
                                    AND pr.dht_order_id = o.id 
                                    AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = oi.id)
                                )
                            )
                              AND pr.print_field IN ('IN PET', 'IN DECAL')
                              AND pr.printer_id IS NOT NULL
                        ) AND NOT EXISTS (
                            SELECT 1 FROM printing_records pr 
                            WHERE (
                                pr.order_item_id = oi.id 
                                OR (
                                    pr.order_item_id IS NULL 
                                    AND pr.dht_order_id = o.id 
                                    AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = oi.id)
                                )
                            )
                              AND pr.print_field IN ('IN PET', 'IN DECAL')
                              AND pr.printer_id IS NOT NULL
                              AND pr.is_print_done = false
                        )
                    ) AS is_print_done
                FROM dht_order_items oi
                JOIN dht_orders o ON oi.dht_order_id = o.id
                LEFT JOIN dht_categories c ON o.category_id = c.id
                WHERE EXISTS (SELECT 1 FROM qlx_preparation pp WHERE pp.dht_order_id = o.id)
                  AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
                  AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
                  AND COALESCE(o.shipping_status, '') NOT IN ('shipped', 'cancelled')
                  AND NOT EXISTS (SELECT 1 FROM pressing_records pr WHERE pr.order_item_id = oi.id)
                  AND EXISTS (
                      SELECT 1 FROM qlx_order_print_assignments qa
                      JOIN printing_fields pf ON qa.field_id = pf.id
                      WHERE (
                          qa.item_id = oi.id 
                          OR (
                              qa.item_id IS NULL 
                              AND qa.dht_order_id = o.id 
                              AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = oi.id)
                          )
                      )
                        AND pf.name IN ('IN PET', 'IN DECAL')
                        AND qa.operator_type = 'user'
                  )
            )
            SELECT 
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE is_cut_done = true AND is_print_done = true)::int AS ready,
                COUNT(*) FILTER (WHERE is_cut_done = false OR is_print_done = false)::int AS pending
            FROM item_status
        `);

        const stats = await db.get(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE NOT pr.is_reported)::int AS pressing,
                COUNT(*) FILTER (WHERE pr.is_reported)::int AS done,
                COUNT(*) FILTER (WHERE pr.salary_approved)::int AS approved
            FROM pressing_records pr
            WHERE 1=1 ${where}
        `, params);

        return {
            yearTree,
            total,
            stats: stats || { total: 0, pressing: 0, done: 0, approved: 0 },
            unassigned: unassigned || { total: 0, ready: 0, pending: 0 }
        };
    });

    // ========== LIST ==========
    fastify.get('/api/pressing/records', { preHandler: [authenticate] }, async (req) => {
        const mgr = await isPressManager(req);
        const { year, month, presser_id, status, search } = req.query;
        let where = 'WHERE 1=1', params = [], idx = 1;
        if (!mgr && !['quan_ly','truong_phong'].includes(req.user.role)) { where += ` AND pr.presser_id=$${idx++}`; params.push(req.user.id); }
        if (year) { where += ` AND EXTRACT(YEAR FROM COALESCE(pr.press_date,pr.created_at))=$${idx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM COALESCE(pr.press_date,pr.created_at))=$${idx++}`; params.push(Number(month)); }
        if (presser_id) { where += ` AND pr.presser_id=$${idx++}`; params.push(Number(presser_id)); }
        if (status === 'reported') where += ` AND pr.is_reported=true`;
        else if (status === 'incomplete') where += ` AND pr.is_reported=false`;
        else if (status === 'approved') where += ` AND pr.salary_approved=true`;
        else if (status === 'error') where += ` AND pr.error_reported=true`;
        if (search) { where += ` AND (pr.product_name ILIKE $${idx} OR pr.cskh_name ILIKE $${idx} OR o.order_code ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
        const records = await db.all(`
            SELECT pr.*, u.full_name AS presser_name, u_rpt.full_name AS reported_by_name,
                   u_sal.full_name AS salary_by_name, o.order_code, o.shipping_priority,
                   o.customer_name,
                   lh.details AS last_update_detail, lh.performed_at AS last_update_at, lhu.full_name AS last_update_by,
                   (
                        SELECT string_agg(pf.name, ', ')
                        FROM qlx_order_print_assignments qa
                        JOIN printing_fields pf ON qa.field_id = pf.id
                        WHERE (
                            qa.item_id = pr.order_item_id 
                            OR (
                                qa.item_id IS NULL 
                                AND qa.dht_order_id = pr.dht_order_id 
                                AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = pr.order_item_id)
                            )
                        )
                          AND pf.name IN ('IN PET', 'IN DECAL')
                          AND qa.operator_type = 'user'
                   ) AS print_types,
                   (
                        SELECT string_agg(pf.name, ', ')
                        FROM qlx_order_print_assignments qa
                        JOIN printing_fields pf ON qa.field_id = pf.id
                        WHERE (
                            qa.item_id = pr.order_item_id 
                            OR (
                                qa.item_id IS NULL 
                                AND qa.dht_order_id = pr.dht_order_id 
                                AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = pr.order_item_id)
                            )
                        )
                          AND pf.name IN ('IN PET', 'IN DECAL')
                          AND qa.operator_type = 'user'
                          AND NOT EXISTS (
                              SELECT 1 FROM printing_records prr
                              WHERE (
                                  prr.order_item_id = pr.order_item_id
                                  OR (
                                      prr.order_item_id IS NULL
                                      AND prr.dht_order_id = pr.dht_order_id
                                      AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = pr.order_item_id)
                                  )
                              )
                                AND prr.print_field = pf.name
                                AND prr.is_print_done = true
                          )
                   ) AS pending_print_types
            FROM pressing_records pr LEFT JOIN users u ON pr.presser_id=u.id
            LEFT JOIN users u_rpt ON pr.reported_by=u_rpt.id LEFT JOIN users u_sal ON pr.salary_approved_by=u_sal.id
            LEFT JOIN dht_orders o ON pr.dht_order_id=o.id
            LEFT JOIN LATERAL (SELECT h.details, h.performed_at, h.performed_by FROM pressing_history h WHERE h.pressing_id=pr.id ORDER BY h.performed_at DESC LIMIT 1) lh ON true
            LEFT JOIN users lhu ON lh.performed_by=lhu.id
            ${where} ORDER BY pr.press_date DESC NULLS LAST, pr.created_at DESC`, params);
        return { records };
    });

    // ========== CREATE ==========
    fastify.post('/api/pressing/records', { preHandler: [authenticate] }, async (req) => {
        const b = req.body || {}, now = vnNow();
        const r = await db.get(`INSERT INTO pressing_records (dht_order_id,press_date,presser_id,product_name,cskh_name,
            order_quantity,press_quantity,press_salary,pos_chest_arm,pos_back_belly,pos_protective,pos_packaging,pos_other,
            press_images,notes,created_by,created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
            [b.dht_order_id||null, b.press_date||null, b.presser_id||null, b.product_name||null, b.cskh_name||null,
             Number(b.order_quantity)||0, Number(b.press_quantity)||0, Number(b.press_salary)||0,
             Number(b.pos_chest_arm)||0, Number(b.pos_back_belly)||0, Number(b.pos_protective)||0,
             Number(b.pos_packaging)||0, b.pos_other||null, b.press_images||'[]', b.notes||null, req.user.id, now]);
        await db.run(`INSERT INTO pressing_history (pressing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [r.id, 'create', 'Tạo đơn ép mới', req.user.id, now]);
        return { success: true, id: r.id };
    });

    // ========== TOGGLE ==========
    fastify.post('/api/pressing/toggle/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { action } = req.body || {}, now = vnNow();
        const rec = await db.get('SELECT * FROM pressing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        let detail = '';
        if (action === 'report') {
            if (rec.is_reported && !['giam_doc', 'quan_ly_cap_cao'].includes(req.user.role)) {
                return reply.code(403).send({ error: 'Chỉ quản lý cấp cao và giám đốc mới được báo cáo lại!' });
            }
            await db.run(`UPDATE pressing_records SET is_reported=true, reported_at=$1, reported_by=$2, updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            detail = '🔥 Báo cáo ép';
        } else if (action === 'undo_report') {
            if (!['giam_doc', 'quan_ly_cap_cao'].includes(req.user.role)) {
                return reply.code(403).send({ error: 'Chỉ quản lý cấp cao và giám đốc mới được hoàn tác báo cáo!' });
            }
            await db.run(`UPDATE pressing_records SET is_reported=false, reported_at=NULL, reported_by=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '↩️ Hoàn tác báo cáo';
        } else if (action === 'approve_salary') {
            if (!(await isPressManager(req))) return reply.code(403).send({ error: 'Chỉ QLX/GĐ' });
            await db.run(`UPDATE pressing_records SET salary_approved=true, salary_approved_at=$1, salary_approved_by=$2, updated_at=$1 WHERE id=$3`, [now, req.user.id, id]);
            detail = '💰 Duyệt lương ép';
        } else if (action === 'undo_salary') {
            if (!(await isPressManager(req))) return reply.code(403).send({ error: 'Không có quyền' });
            await db.run(`UPDATE pressing_records SET salary_approved=false, salary_approved_at=NULL, salary_approved_by=NULL, updated_at=$1 WHERE id=$2`, [now, id]);
            detail = '↩️ Hoàn tác duyệt lương';
        } else if (action === 'report_error') {
            await db.run(`UPDATE pressing_records SET error_reported=true, error_order_id=$1, updated_at=$2 WHERE id=$3`, [req.body.error_order_id||null, now, id]);
            detail = '⚠️ Báo lỗi nội bộ';
        } else { return reply.code(400).send({ error: 'Action không hợp lệ' }); }
        await db.run(`INSERT INTO pressing_history (pressing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`, [id, action, detail, req.user.id, now]);
        return { success: true };
    });

    // ========== UPDATE ==========
    fastify.put('/api/pressing/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), b = req.body || {}, now = vnNow();
        const rec = await db.get('SELECT * FROM pressing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });

        if (rec.is_reported && !['giam_doc', 'quan_ly_cap_cao'].includes(req.user.role)) {
            return reply.code(403).send({ error: 'Chỉ quản lý cấp cao và giám đốc mới được sửa báo cáo đã hoàn thành!' });
        }

        // Update target order quantity dynamically based on latest cut records if available
        const latestCut = await db.get(`
            SELECT SUM(cut_quantity)::int AS cut_qty
            FROM cutting_records
            WHERE order_item_id = $1 AND is_cut_done = true
              AND (material_name = $2 OR (material_name IS NULL AND $2 IS NULL))
              AND (fabric_color = $3 OR (fabric_color IS NULL AND $3 IS NULL))
        `, [rec.order_item_id, rec.material_name, rec.fabric_color]);
        const latestQty = (latestCut && latestCut.cut_qty) ? latestCut.cut_qty : rec.order_quantity;

        let calculatedSalary = rec.press_salary;
        let pricesObj = {
            price_chest_arm: rec.price_chest_arm || 0,
            price_back_belly: rec.price_back_belly || 0,
            price_protective: rec.price_protective || 0,
            price_packaging: rec.price_packaging || 0,
            price_other: rec.price_other || 0
        };

        if (b.press_salary === undefined) {
            const presserId = b.presser_id !== undefined ? b.presser_id : rec.presser_id;
            const chest = b.pos_chest_arm !== undefined ? Number(b.pos_chest_arm) : rec.pos_chest_arm;
            const back = b.pos_back_belly !== undefined ? Number(b.pos_back_belly) : rec.pos_back_belly;
            const prot = b.pos_protective !== undefined ? Number(b.pos_protective) : rec.pos_protective;
            const pack = b.pos_packaging !== undefined ? Number(b.pos_packaging) : rec.pos_packaging;
            const otherVal = b.pos_other !== undefined ? Number(b.pos_other) : Number(rec.pos_other);
            const salInfo = await calculatePresserSalary(presserId, chest, back, prot, pack, otherVal);
            calculatedSalary = salInfo.salary;
            if (salInfo.price_chest_arm !== undefined) {
                pricesObj = salInfo;
            }
        } else {
            calculatedSalary = Number(b.press_salary);
        }

        await db.run(`UPDATE pressing_records SET press_date=$1,presser_id=$2,product_name=$3,cskh_name=$4,
            order_quantity=$5,press_quantity=$6,press_salary=$7,salary=$7,pos_chest_arm=$8,pos_back_belly=$9,
            pos_protective=$10,pos_packaging=$11,pos_other=$12,press_images=$13,notes=$14,updated_at=$15,
            price_chest_arm=$16, price_back_belly=$17, price_protective=$18, price_packaging=$19, price_other=$20
            WHERE id=$21`,
            [b.press_date!==undefined?b.press_date:rec.press_date, b.presser_id!==undefined?b.presser_id:rec.presser_id,
             b.product_name!==undefined?b.product_name:rec.product_name, b.cskh_name!==undefined?b.cskh_name:rec.cskh_name,
             latestQty,
             b.press_quantity!==undefined?Number(b.press_quantity):rec.press_quantity,
             calculatedSalary,
             b.pos_chest_arm!==undefined?Number(b.pos_chest_arm):rec.pos_chest_arm,
             b.pos_back_belly!==undefined?Number(b.pos_back_belly):rec.pos_back_belly,
             b.pos_protective!==undefined?Number(b.pos_protective):rec.pos_protective,
             b.pos_packaging!==undefined?Number(b.pos_packaging):rec.pos_packaging,
             b.pos_other!==undefined?b.pos_other:rec.pos_other,
             b.press_images!==undefined?b.press_images:rec.press_images,
             b.notes!==undefined?b.notes:rec.notes, now,
             pricesObj.price_chest_arm, pricesObj.price_back_belly, pricesObj.price_protective,
             pricesObj.price_packaging, pricesObj.price_other, id]);
        await db.run(`INSERT INTO pressing_history (pressing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'update', 'Cập nhật thông tin ép', req.user.id, now]);
        return { success: true };
    });

    // ========== INLINE FIELD ==========
    fastify.patch('/api/pressing/records/:id/field', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), { field, value } = req.body || {}, now = vnNow();
        const ALLOWED = ['press_date','presser_id','product_name','cskh_name','order_quantity','press_quantity',
            'press_salary','pos_chest_arm','pos_back_belly','pos_protective','pos_packaging','pos_other','notes'];
        if (!ALLOWED.includes(field)) return reply.code(400).send({ error: 'Trường không hợp lệ' });
        const numF = ['presser_id','order_quantity','press_quantity','press_salary','pos_chest_arm','pos_back_belly','pos_protective','pos_packaging'];
        const fv = numF.includes(field) ? (Number(value)||0) : (value||null);
        await db.run(`UPDATE pressing_records SET ${field}=$1, updated_at=$2 WHERE id=$3`, [fv, now, id]);
        
        if (field === 'press_salary') {
            await db.run(`UPDATE pressing_records SET salary=$1 WHERE id=$2`, [fv, id]);
        }

        const positionFields = ['presser_id', 'pos_chest_arm', 'pos_back_belly', 'pos_protective', 'pos_packaging', 'pos_other'];
        if (positionFields.includes(field)) {
            const rec = await db.get('SELECT * FROM pressing_records WHERE id=$1', [id]);
            if (rec) {
                const salInfo = await calculatePresserSalary(
                    rec.presser_id,
                    rec.pos_chest_arm,
                    rec.pos_back_belly,
                    rec.pos_protective,
                    rec.pos_packaging,
                    rec.pos_other
                );
                await db.run(`
                    UPDATE pressing_records 
                    SET press_salary=$1, 
                        salary=$1, 
                        price_chest_arm=$2, 
                        price_back_belly=$3, 
                        price_protective=$4, 
                        price_packaging=$5, 
                        price_other=$6 
                    WHERE id=$7
                `, [
                    salInfo.salary, 
                    salInfo.price_chest_arm || 0,
                    salInfo.price_back_belly || 0,
                    salInfo.price_protective || 0,
                    salInfo.price_packaging || 0,
                    salInfo.price_other || 0,
                    id
                ]);
            }
        }

        await db.run(`INSERT INTO pressing_history (pressing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'inline_update', `${field}: ${value}`, req.user.id, now]);
        return { success: true };
    });

    // ========== UPLOAD IMAGES ==========
    fastify.post('/api/pressing/records/:id/images', { preHandler: [authenticate] }, async (req, reply) => {
        const id = Number(req.params.id), now = vnNow();
        const rec = await db.get('SELECT press_images FROM pressing_records WHERE id=$1', [id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });
        const parts = await req.parts();
        let images = []; try { images = JSON.parse(rec.press_images || '[]'); } catch(e) { images = []; }
        for await (const part of parts) {
            if (part.file) {
                const ext = path.extname(part.filename || '.jpg');
                const fname = `press_${id}_${Date.now()}${ext}`;
                const dest = path.join(uploadsDir, fname);
                const chunks = []; for await (const chunk of part.file) chunks.push(chunk);
                fs.writeFileSync(dest, Buffer.concat(chunks));
                images.push(`/uploads/pressing/${fname}`);
            }
        }
        await db.run(`UPDATE pressing_records SET press_images=$1, updated_at=$2 WHERE id=$3`, [JSON.stringify(images), now, id]);
        await db.run(`INSERT INTO pressing_history (pressing_id,action,details,performed_by,performed_at) VALUES ($1,$2,$3,$4,$5)`,
            [id, 'upload_image', `Upload ${images.length} ảnh`, req.user.id, now]);
        return { success: true, images };
    });

    // ========== DELETE ==========
    fastify.delete('/api/pressing/records/:id', { preHandler: [authenticate] }, async (req, reply) => {
        if (!(await isPressManager(req))) return reply.code(403).send({ error: 'Chỉ QLX/GĐ' });
        await db.run('DELETE FROM pressing_records WHERE id=$1', [Number(req.params.id)]);
        return { success: true };
    });

    // ========== HISTORY ==========
    fastify.get('/api/pressing/history/:id', { preHandler: [authenticate] }, async (req) => {
        return { history: await db.all(`SELECT h.*, u.full_name AS performer_name FROM pressing_history h LEFT JOIN users u ON h.performed_by=u.id WHERE h.pressing_id=$1 ORDER BY h.performed_at DESC LIMIT 50`, [Number(req.params.id)]) };
    });

    // ========== STAFF ==========
    fastify.get('/api/pressing/staff', { preHandler: [authenticate] }, async () => {
        return { staff: await db.all(`SELECT u.id, u.full_name, u.username, d.name AS dept_name FROM users u LEFT JOIN departments d ON u.department_id=d.id WHERE u.status='active' AND u.role NOT IN ('tkaffiliate','hoa_hong','ctv','nuoi_duong','sinh_vien') ORDER BY u.full_name`) };
    });

    // ========== UNASSIGNED: Đơn chưa ép (pool) ==========
    fastify.get('/api/pressing/unassigned', { preHandler: [authenticate] }, async (request, reply) => {
        const orders = await db.all(`
            SELECT o.id, o.order_code, o.customer_name, o.customer_phone,
                   o.total_quantity, o.order_date, o.expected_ship_date, o.shipping_priority,
                   c.name AS category_name,
                   u_cskh.full_name AS cskh_name,
                   u_created.full_name AS created_by_name
            FROM dht_orders o
            LEFT JOIN dht_categories c ON o.category_id = c.id
            LEFT JOIN users u_cskh ON o.cskh_user_id = u_cskh.id
            LEFT JOIN users u_created ON o.created_by = u_created.id
            WHERE EXISTS (
                SELECT 1 FROM dht_order_items oi
                WHERE oi.dht_order_id = o.id
                  AND NOT EXISTS (SELECT 1 FROM pressing_records pr WHERE pr.order_item_id = oi.id)
                  AND EXISTS (
                      SELECT 1 FROM qlx_order_print_assignments qa
                      JOIN printing_fields pf ON qa.field_id = pf.id
                      WHERE (
                          qa.item_id = oi.id 
                          OR (
                              qa.item_id IS NULL 
                              AND qa.dht_order_id = o.id 
                              AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = oi.id)
                          )
                      )
                        AND pf.name IN ('IN PET', 'IN DECAL')
                        AND qa.operator_type = 'user'
                  )
            )
              AND EXISTS (SELECT 1 FROM qlx_preparation pp WHERE pp.dht_order_id = o.id)
              AND UPPER(COALESCE(c.name, '')) NOT IN ('PET', 'TEM')
              AND o.order_code NOT ILIKE '%TEM%' AND o.order_code NOT ILIKE '%PET%'
              AND COALESCE(o.shipping_status, '') NOT IN ('shipped', 'cancelled')
            ORDER BY
                CASE WHEN EXISTS (
                    SELECT 1 FROM dht_order_items oi
                    WHERE oi.dht_order_id = o.id
                      AND NOT EXISTS (SELECT 1 FROM pressing_records pr WHERE pr.order_item_id = oi.id)
                      AND EXISTS (
                          SELECT 1 FROM qlx_order_print_assignments qa
                          JOIN printing_fields pf ON qa.field_id = pf.id
                          WHERE (
                              qa.item_id = oi.id 
                              OR (
                                  qa.item_id IS NULL 
                                  AND qa.dht_order_id = o.id 
                                  AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = oi.id)
                              )
                          )
                            AND pf.name IN ('IN PET', 'IN DECAL')
                            AND qa.operator_type = 'user'
                      )
                      AND EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = oi.id)
                      AND NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = oi.id AND cr.is_cut_done = false)
                      AND EXISTS (
                          SELECT 1 FROM printing_records prr 
                          WHERE (
                              prr.order_item_id = oi.id 
                              OR (
                                  prr.order_item_id IS NULL 
                                  AND prr.dht_order_id = o.id 
                                  AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = oi.id)
                              )
                          )
                            AND prr.print_field IN ('IN PET', 'IN DECAL')
                            AND prr.printer_id IS NOT NULL
                      )
                      AND NOT EXISTS (
                          SELECT 1 FROM printing_records prr 
                          WHERE (
                              prr.order_item_id = oi.id 
                              OR (
                                  prr.order_item_id IS NULL 
                                  AND prr.dht_order_id = o.id 
                                  AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = oi.id)
                              )
                          )
                            AND prr.print_field IN ('IN PET', 'IN DECAL')
                            AND prr.printer_id IS NOT NULL
                            AND prr.is_print_done = false
                      )
                ) THEN 0 ELSE 1 END,
                CASE WHEN COALESCE(o.shipping_priority, 'CHUẨN') NOT IN ('GẤP','GỬI') THEN 0
                     WHEN o.shipping_priority = 'GẤP' THEN 1
                     WHEN o.shipping_priority = 'GỬI' THEN 2
                     ELSE 3 END,
                o.expected_ship_date ASC NULLS LAST, o.order_date DESC
        `);

        const orderIds = orders.map(o => o.id);
        let items = [], allItemCounts = {};
        if (orderIds.length > 0) {
            items = await db.all(`
                SELECT 
                    doi.dht_order_id, 
                    doi.id, 
                    doi.description, 
                    doi.material_pairs,
                    doi.quantity AS quantity,
                    (
                        SELECT COUNT(*)::int 
                        FROM dht_order_items doi2 
                        WHERE doi2.dht_order_id = doi.dht_order_id AND doi2.id <= doi.id
                    ) AS real_item_index,
                    EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = doi.id) AS has_cut_records,
                    NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = doi.id AND cr.is_cut_done = false) AS all_cuts_done,
                    EXISTS (
                        SELECT 1 FROM qlx_order_print_assignments qa
                        JOIN printing_fields pf ON qa.field_id = pf.id
                        WHERE (
                            qa.item_id = doi.id 
                            OR (
                                qa.item_id IS NULL 
                                AND qa.dht_order_id = doi.dht_order_id 
                                AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = doi.id)
                            )
                        )
                          AND pf.name IN ('IN PET', 'IN DECAL')
                          AND qa.operator_type = 'user'
                    ) AS has_pc_in,
                    (
                        EXISTS (
                            SELECT 1 FROM printing_records pr 
                            WHERE (
                                pr.order_item_id = doi.id 
                                OR (
                                    pr.order_item_id IS NULL 
                                    AND pr.dht_order_id = doi.dht_order_id 
                                    AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = doi.id)
                                )
                            )
                              AND pr.print_field IN ('IN PET', 'IN DECAL')
                              AND pr.printer_id IS NOT NULL
                        ) AND NOT EXISTS (
                            SELECT 1 FROM printing_records pr 
                            WHERE (
                                pr.order_item_id = doi.id 
                                OR (
                                    pr.order_item_id IS NULL 
                                    AND pr.dht_order_id = doi.dht_order_id 
                                    AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = doi.id)
                                )
                            )
                              AND pr.print_field IN ('IN PET', 'IN DECAL')
                              AND pr.printer_id IS NOT NULL
                              AND pr.is_print_done = false
                        )
                    ) AS is_print_done_rec,
                    (
                        SELECT string_agg(pf.name, ', ')
                        FROM qlx_order_print_assignments qa
                        JOIN printing_fields pf ON qa.field_id = pf.id
                        WHERE (
                            qa.item_id = doi.id 
                            OR (
                                qa.item_id IS NULL 
                                AND qa.dht_order_id = doi.dht_order_id 
                                AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = doi.id)
                            )
                        )
                          AND pf.name IN ('IN PET', 'IN DECAL')
                          AND qa.operator_type = 'user'
                    ) AS print_types,
                    (
                        SELECT string_agg(pf.name, ', ')
                        FROM qlx_order_print_assignments qa
                        JOIN printing_fields pf ON qa.field_id = pf.id
                        WHERE (
                            qa.item_id = doi.id 
                            OR (
                                qa.item_id IS NULL 
                                AND qa.dht_order_id = doi.dht_order_id 
                                AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = doi.id)
                            )
                        )
                          AND pf.name IN ('IN PET', 'IN DECAL')
                          AND qa.operator_type = 'user'
                          AND NOT EXISTS (
                              SELECT 1 FROM printing_records pr
                              WHERE (
                                  pr.order_item_id = doi.id
                                  OR (
                                      pr.order_item_id IS NULL
                                      AND pr.dht_order_id = doi.dht_order_id
                                      AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = doi.id)
                                  )
                              )
                                AND pr.print_field = pf.name
                                AND pr.is_print_done = true
                          )
                    ) AS pending_print_types
                FROM dht_order_items doi
                WHERE doi.dht_order_id = ANY($1)
                  AND NOT EXISTS (SELECT 1 FROM pressing_records pr WHERE pr.order_item_id = doi.id)
                  AND EXISTS (
                      SELECT 1 FROM qlx_order_print_assignments qa
                      JOIN printing_fields pf ON qa.field_id = pf.id
                      WHERE (
                          qa.item_id = doi.id 
                          OR (
                              qa.item_id IS NULL 
                              AND qa.dht_order_id = doi.dht_order_id 
                              AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = doi.id)
                          )
                      )
                        AND pf.name IN ('IN PET', 'IN DECAL')
                        AND qa.operator_type = 'user'
                  )
                ORDER BY doi.dht_order_id, doi.id
            `, [orderIds]);

            const countRows = await db.all(`
                SELECT dht_order_id, COUNT(*)::int AS cnt
                FROM dht_order_items WHERE dht_order_id = ANY($1)
                GROUP BY dht_order_id
            `, [orderIds]);
            for (const c of countRows) allItemCounts[c.dht_order_id] = c.cnt;
        }

        const itemMap = {};
        for (const it of items) {
            if (!itemMap[it.dht_order_id]) itemMap[it.dht_order_id] = [];
            itemMap[it.dht_order_id].push(it);
        }

        let completedCuts = [];
        if (items.length > 0) {
            const itemIds = items.map(it => it.id);
            completedCuts = await db.all(`
                SELECT order_item_id, material_name, fabric_color, is_cut_done, SUM(cut_quantity)::int AS cut_qty
                FROM cutting_records
                WHERE order_item_id = ANY($1)
                GROUP BY order_item_id, material_name, fabric_color, is_cut_done
            `, [itemIds]);
        }

        const rows = [];
        for (const o of orders) {
            const itsArr = itemMap[o.id] || [];
            const totalItemsInOrder = allItemCounts[o.id] || 1;
            if (!itsArr.length) continue;

            for (const it of itsArr) {
                const itemIdx = it.real_item_index;
                let pairs = [];
                try { pairs = typeof it.material_pairs === 'string' ? JSON.parse(it.material_pairs) : (it.material_pairs || []); } catch(e) {}
                
                const isCutReady = it.has_cut_records && it.all_cuts_done;
                const isPrintReady = it.is_print_done_rec;
                const ready = isCutReady && isPrintReady;

                const warnings = [];
                if (!isCutReady) warnings.push('Chưa cắt');
                if (!isPrintReady) {
                    if (it.pending_print_types) {
                        const types = it.pending_print_types.split(', ').map(t => t.trim());
                        if (types.includes('IN PET') && types.includes('IN DECAL')) {
                            warnings.push('Chưa In Pet + Decal');
                        } else if (types.includes('IN PET')) {
                            warnings.push('Chưa In Pet');
                        } else if (types.includes('IN DECAL')) {
                            warnings.push('Chưa In Decal');
                        } else {
                            warnings.push('Chưa in');
                        }
                    } else {
                        warnings.push('Chưa in');
                    }
                }
                const warningMsg = warnings.length > 0 ? warnings.join(' + ') : null;

                const itemCuts = completedCuts.filter(c => c.order_item_id === it.id);

                let materialName = null;
                let colorName = null;
                let phoiList = [];

                if (pairs.length > 0) {
                    materialName = [...new Set(pairs.map(p => (p.material_name || '').trim()).filter(Boolean))].join(', ');
                    colorName = [...new Set(pairs.map(p => (p.color_name || '').trim()).filter(Boolean))].join(', ');
                    
                    phoiList = pairs.map(p => {
                        const matchingCut = itemCuts.find(c => (c.material_name || '').trim().toLowerCase() === (p.material_name || '').trim().toLowerCase() && (c.fabric_color || '').trim().toLowerCase() === (p.color_name || '').trim().toLowerCase());
                        return {
                            material_name: p.material_name || null,
                            color_name: p.color_name || null,
                            cut_qty: matchingCut ? (matchingCut.cut_qty || 0) : 0
                        };
                    });
                }

                const maxCutQty = itemCuts.length > 0 ? Math.max(...itemCuts.map(c => c.cut_qty || 0), 0) : 0;
                const displayCutQty = maxCutQty > 0 ? maxCutQty : it.quantity;

                rows.push({
                    ...o,
                    item_id: it.id,
                    item_desc: it.description,
                    item_index: itemIdx,
                    phoi_in_item: 1,
                    total_phoi: 1,
                    total_items_in_order: totalItemsInOrder,
                    material_name: materialName || null,
                    color_name: colorName || null,
                    item_qty: it.quantity,
                    cut_qty: displayCutQty,
                    is_cut_done: isCutReady,
                    is_print_done: isPrintReady,
                    print_types: it.print_types || null,
                    pending_print_types: it.pending_print_types || null,
                    warning_msg: warningMsg,
                    ready: ready,
                    phoi: phoiList
                });
            }
        }

        return { orders: rows };
    });

    // ========== CLAIM: Nhận đơn ép (per-phiếu) ==========
    fastify.post('/api/pressing/claim', { preHandler: [authenticate] }, async (request, reply) => {
        const { dht_order_id, order_item_id } = request.body || {};
        if (!dht_order_id || !order_item_id) return reply.code(400).send({ error: 'Thiếu mã đơn hoặc mã phiếu' });

        const now = vnNow();
        const userId = request.user.id;

        // Implement transaction-level row locking to prevent race conditions (double claiming)
        await db.run('BEGIN');
        try {
            const order = await db.get(`
                SELECT o.id, o.order_code, o.shipping_status
                FROM dht_orders o
                WHERE o.id = $1
            `, [dht_order_id]);
            if (!order) {
                await db.run('ROLLBACK');
                return reply.code(404).send({ error: 'Đơn không tồn tại' });
            }
            if (['shipped', 'cancelled'].includes(order.shipping_status)) {
                await db.run('ROLLBACK');
                return reply.code(400).send({
                    error: `Đơn hàng đã ${order.shipping_status === 'shipped' ? 'gửi đi' : 'bị hủy'} — không thể nhận đơn ép!`
                });
            }

            // Lock the target dht_order_items row using FOR UPDATE to block concurrent claim requests
            const item = await db.get(`
                SELECT doi.id, doi.description, doi.material_pairs, doi.quantity,
                       EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = doi.id) AS has_cut_records,
                       NOT EXISTS (SELECT 1 FROM cutting_records cr WHERE cr.order_item_id = doi.id AND cr.is_cut_done = false) AS all_cuts_done,
                       EXISTS (
                           SELECT 1 FROM qlx_order_print_assignments qa
                           JOIN printing_fields pf ON qa.field_id = pf.id
                           WHERE (
                               qa.item_id = doi.id 
                               OR (
                                   qa.item_id IS NULL 
                                   AND qa.dht_order_id = doi.dht_order_id 
                                   AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = doi.id)
                               )
                           )
                             AND pf.name IN ('IN PET', 'IN DECAL')
                             AND qa.operator_type = 'user'
                       ) AS has_pc_in,
                       (
                           EXISTS (
                               SELECT 1 FROM printing_records pr 
                               WHERE (
                                   pr.order_item_id = doi.id 
                                   OR (
                                       pr.order_item_id IS NULL 
                                       AND pr.dht_order_id = doi.dht_order_id 
                                       AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = doi.id)
                                   )
                               )
                                 AND pr.print_field IN ('IN PET', 'IN DECAL')
                                 AND pr.printer_id IS NOT NULL
                           ) AND NOT EXISTS (
                               SELECT 1 FROM printing_records pr 
                               WHERE (
                                   pr.order_item_id = doi.id 
                                   OR (
                                       pr.order_item_id IS NULL 
                                       AND pr.dht_order_id = doi.dht_order_id 
                                       AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = doi.id)
                                   )
                               )
                                 AND pr.print_field IN ('IN PET', 'IN DECAL')
                                 AND pr.printer_id IS NOT NULL
                                 AND pr.is_print_done = false
                           )
                       ) AS is_print_done_rec,
                       (
                           SELECT string_agg(pf.name, ', ')
                           FROM qlx_order_print_assignments qa
                           JOIN printing_fields pf ON qa.field_id = pf.id
                           WHERE (
                               qa.item_id = doi.id 
                               OR (
                                   qa.item_id IS NULL 
                                   AND qa.dht_order_id = doi.dht_order_id 
                                   AND NOT EXISTS (SELECT 1 FROM qlx_order_print_assignments qa2 WHERE qa2.item_id = doi.id)
                               )
                           )
                             AND pf.name IN ('IN PET', 'IN DECAL')
                             AND qa.operator_type = 'user'
                             AND NOT EXISTS (
                                 SELECT 1 FROM printing_records pr
                                 WHERE (
                                     pr.order_item_id = doi.id
                                     OR (
                                         pr.order_item_id IS NULL
                                         AND pr.dht_order_id = doi.dht_order_id
                                         AND NOT EXISTS (SELECT 1 FROM printing_records pr2 WHERE pr2.order_item_id = doi.id)
                                     )
                                 )
                                   AND pr.print_field = pf.name
                                   AND pr.is_print_done = true
                             )
                       ) AS pending_print_types
                FROM dht_order_items doi
                WHERE doi.id = $1 FOR UPDATE
            `, [order_item_id]);
            if (!item) {
                await db.run('ROLLBACK');
                return reply.code(404).send({ error: 'Không tìm thấy phiếu' });
            }

            if (!item.has_pc_in) {
                await db.run('ROLLBACK');
                return reply.code(400).send({ error: 'Đơn hàng này không thuộc diện ép của xưởng (không có phân công in PET/Decal nội bộ)' });
            }

            const exists = await db.get(`SELECT 1 FROM pressing_records WHERE order_item_id = $1`, [order_item_id]);
            if (exists) {
                await db.run('ROLLBACK');
                return reply.code(400).send({ error: 'Đơn này đã được nhận ép rồi!' });
            }

            const isCutReady = item.has_cut_records && item.all_cuts_done;
            const isPrintReady = item.is_print_done_rec;
            if (!isCutReady || !isPrintReady) {
                let errMsg = 'Không thể nhận đơn ép do: ';
                const errs = [];
                if (!isCutReady) errs.push('chưa cắt xong');
                if (!isPrintReady) {
                    if (item.pending_print_types) {
                        const types = item.pending_print_types.split(', ').map(t => t.trim());
                        if (types.includes('IN PET') && types.includes('IN DECAL')) {
                            errs.push('chưa in xong Pet và Decal');
                        } else if (types.includes('IN PET')) {
                            errs.push('chưa in xong Pet');
                        } else if (types.includes('IN DECAL')) {
                            errs.push('chưa in xong Decal');
                        } else {
                            errs.push('chưa in xong');
                        }
                    } else {
                        errs.push('chưa in xong');
                    }
                }
                await db.run('ROLLBACK');
                return reply.code(400).send({ error: errMsg + errs.join(', ') });
            }

            const cuts = await db.all(`
                SELECT material_name, fabric_color, SUM(cut_quantity)::int AS cut_qty
                FROM cutting_records
                WHERE order_item_id = $1 AND is_cut_done = true
                GROUP BY material_name, fabric_color
            `, [order_item_id]);

            if (cuts.length === 0) {
                await db.run('ROLLBACK');
                return reply.code(400).send({ error: 'Không tìm thấy số lượng cắt hoàn thành' });
            }

            const allItems = await db.all(`SELECT id FROM dht_order_items WHERE dht_order_id = $1 ORDER BY id`, [dht_order_id]);
            const itemIdx = allItems.findIndex(a => a.id === Number(order_item_id)) + 1;

            let prodName = order.order_code;
            if (allItems.length > 1) {
                prodName += ` — Phiếu ${itemIdx}`;
            }
            if (item.description) {
                prodName += ` — ${item.description}`;
            }

            const materialName = [...new Set(cuts.map(c => (c.material_name || '').trim()).filter(Boolean))].join(', ');
            const fabricColor = [...new Set(cuts.map(c => (c.fabric_color || '').trim()).filter(Boolean))].join(', ');
            
            const maxCutQty = Math.max(...cuts.map(c => c.cut_qty || 0), 0);
            const targetQty = maxCutQty > 0 ? maxCutQty : (item.quantity || 0);

            await db.run(`
                INSERT INTO pressing_records (
                    dht_order_id, order_item_id, presser_id, press_date, product_name, cskh_name,
                    order_quantity, press_quantity, press_salary, created_by, created_at, updated_at,
                    material_name, fabric_color
                ) VALUES ($1, $2, $3, $4, $5, (SELECT u.full_name FROM users u LEFT JOIN dht_orders o ON o.cskh_user_id = u.id WHERE o.id = $6), $7, 0, 0, $3, $8, $8, $9, $10)
            `, [
                dht_order_id, order_item_id, userId, now, prodName, dht_order_id, targetQty, now, materialName || null, fabricColor || null
            ]);

            await db.run('COMMIT');
            return { success: true, created: 1 };
        } catch (err) {
            await db.run('ROLLBACK');
            throw err;
        }
    });

    // ========== UNCLAIM: Trả đơn ép (per-phiếu) ==========
    fastify.post('/api/pressing/unclaim', { preHandler: [authenticate] }, async (request, reply) => {
        const { order_item_id } = request.body || {};
        if (!order_item_id) return reply.code(400).send({ error: 'Thiếu thông tin nhận' });

        const records = await db.all(`
            SELECT is_reported, salary_approved FROM pressing_records
            WHERE order_item_id = $1
        `, [order_item_id]);

        if (records.length === 0) {
            return reply.code(404).send({ error: 'Không tìm thấy đơn ép đã nhận' });
        }

        if (records.some(r => r.is_reported || r.salary_approved)) {
            return reply.code(400).send({ error: 'Đơn ép đã báo cáo hoặc đã duyệt lương — không thể trả lại đơn!' });
        }

        await db.run(`DELETE FROM pressing_records WHERE order_item_id = $1`, [order_item_id]);
        return { success: true };
    });
};
