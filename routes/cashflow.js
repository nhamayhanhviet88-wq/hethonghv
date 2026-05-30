// ========== SỔ THU CHI — Cashflow Management ==========
const db = require('../db/pool');

// Default permissions
const DEFAULT_CF_PERMS = {
    cf_check:      ['giam_doc', 'quan_ly_cap_cao'],
    cf_create_chi: ['giam_doc', 'quan_ly_cap_cao']
};

module.exports = async function (fastify) {

    // Helper: verify token
    function _auth(request) {
        const token = request.cookies?.token;
        if (!token) return null;
        const jwt = require('jsonwebtoken');
        try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
    }

    // Helper: check permission
    async function _checkCfPerm(user, action) {
        if (!user) return false;
        try {
            const row = await db.get("SELECT value FROM app_config WHERE key = 'cf_action_permissions'");
            const perms = row ? JSON.parse(row.value) : {};
            const allowedRoles = perms[action] || DEFAULT_CF_PERMS[action] || [];
            return allowedRoles.includes(user.role);
        } catch { return DEFAULT_CF_PERMS[action]?.includes(user.role) || false; }
    }

    // Helper: build cashflow code  TM1-15-5-Y26 (cùng format với Sổ Ghi Nhận Tiền)
    function _buildCode(seq, date) {
        const d = new Date(date);
        const dd = d.getDate();
        const mm = d.getMonth() + 1;
        const yy = d.getFullYear().toString().slice(-2);
        return `TM${seq}-${dd}-${mm}-Y${yy}`;
    }

    // Helper: get next TM seq — check CẢ payment_records + cashflow_records để tránh trùng
    async function _getNextTMSeq(cfDate) {
        const prRow = await db.get(
            `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM payment_records WHERE payment_date = $1 AND payment_method = 'TM'`,
            [cfDate]
        );
        const cfRow = await db.get(
            `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM cashflow_records WHERE cashflow_date = $1 AND cashflow_code LIKE 'TM%'`,
            [cfDate]
        );
        return Math.max(Number(prRow.max_seq), Number(cfRow.max_seq)) + 1;
    }

    // Helper: build CPMAY code  CPMAY-TM-1-15-5-Y26
    function _buildCpmayCode(seq, date) {
        const d = new Date(date);
        const dd = d.getDate();
        const mm = d.getMonth() + 1;
        const yy = d.getFullYear().toString().slice(-2);
        return `CPMAY-TM-${seq}-${dd}-${mm}-Y${yy}`;
    }

    // Helper: get next CPMAY daily seq
    async function _getNextCpmaySeq(cfDate) {
        const row = await db.get(
            `SELECT COALESCE(MAX(daily_seq), 0) AS max_seq FROM cashflow_records WHERE cashflow_date = $1 AND cashflow_code LIKE 'CPMAY-%'`,
            [cfDate]
        );
        return Number(row.max_seq) + 1;
    }

    // ========== GET PERMISSIONS ==========
    fastify.get('/api/cashflow/permissions', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const row = await db.get("SELECT value FROM app_config WHERE key = 'cf_action_permissions'");
        const perms = row ? JSON.parse(row.value) : DEFAULT_CF_PERMS;

        // Merge defaults for any missing keys
        Object.keys(DEFAULT_CF_PERMS).forEach(k => { if (!perms[k]) perms[k] = DEFAULT_CF_PERMS[k]; });

        // Check current user permissions
        const userPerms = {};
        Object.keys(perms).forEach(k => { userPerms[k] = perms[k].includes(user.role); });

        return { permissions: perms, user_permissions: userPerms };
    });

    // ========== SAVE PERMISSIONS (GĐ only) ==========
    fastify.put('/api/cashflow/permissions', async (request, reply) => {
        const user = _auth(request);
        if (!user || user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const perms = request.body;
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('cf_action_permissions', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [JSON.stringify(perms)]
        );
        return { success: true };
    });

    // ========== GET TELEGRAM CONFIG ==========
    fastify.get('/api/cashflow/tg-config', async (request, reply) => {
        const user = _auth(request);
        if (!user || user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const row = await db.get("SELECT value FROM app_config WHERE key = 'tg_cashflow_group'");
        return { group_id: row?.value || '' };
    });

    // ========== SAVE TELEGRAM CONFIG ==========
    fastify.put('/api/cashflow/tg-config', async (request, reply) => {
        const user = _auth(request);
        if (!user || user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const { group_id } = request.body;
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('tg_cashflow_group', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [group_id || '']
        );
        return { success: true };
    });

    // ========== TEST TELEGRAM ==========
    fastify.post('/api/cashflow/tg-test', async (request, reply) => {
        const user = _auth(request);
        if (!user || user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const { group_id } = request.body || {};
        if (!group_id) return reply.code(400).send({ error: 'Chưa nhập Group ID' });

        const { sendTelegramMessage } = require('../utils/telegram');
        const msg = `✅ Test Sổ Thu Chi — Kết nối thành công!`;
        const ok = await sendTelegramMessage(group_id, msg);
        return { success: ok };
    });

    // ========== CP MAY TELEGRAM CONFIG ==========
    fastify.get('/api/cashflow/cpmay-tg-config', async (request, reply) => {
        const user = _auth(request);
        if (!user || user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const row = await db.get("SELECT value FROM app_config WHERE key = 'tg_cpmay_group'");
        return { group_id: row?.value || '' };
    });

    fastify.put('/api/cashflow/cpmay-tg-config', async (request, reply) => {
        const user = _auth(request);
        if (!user || user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { group_id } = request.body;
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('tg_cpmay_group', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [group_id || '']
        );
        return { success: true };
    });

    fastify.post('/api/cashflow/cpmay-tg-test', async (request, reply) => {
        const user = _auth(request);
        if (!user || user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });
        const { group_id } = request.body || {};
        if (!group_id) return reply.code(400).send({ error: 'Chưa nhập Group ID' });
        const { sendTelegramMessage } = require('../utils/telegram');
        const msg = `✅ Test Sổ Cổ Phần May — Kết nối thành công!`;
        const ok = await sendTelegramMessage(group_id, msg);
        return { success: ok };
    });

    // ========== GET RECORDS ==========
    fastify.get('/api/cashflow/records', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const { year, month, day, money_source } = request.query;
        let where = 'WHERE 1=1';
        const params = [];
        let paramIdx = 1;

        // Source filter
        let srcFilterSQL = '';
        if (money_source) { where += ` AND cf.money_source = $${paramIdx++}`; params.push(money_source); srcFilterSQL = `AND money_source = '${money_source}'`; }
        else { where += ` AND NOT (cf.money_source = 'cophanmay' AND cf.cashflow_type = 'THU' AND cf.cashflow_code LIKE 'CPMAY-%')`; srcFilterSQL = `AND NOT (money_source = 'cophanmay' AND cashflow_type = 'THU' AND cashflow_code LIKE 'CPMAY-%')`; }
        if (year) { where += ` AND EXTRACT(YEAR FROM cf.cashflow_date) = $${paramIdx++}`; params.push(Number(year)); }
        if (month) { where += ` AND EXTRACT(MONTH FROM cf.cashflow_date) = $${paramIdx++}`; params.push(Number(month)); }
        if (day) { where += ` AND EXTRACT(DAY FROM cf.cashflow_date) = $${paramIdx++}`; params.push(Number(day)); }

        const rows = await db.all(`
            SELECT cf.*,
                   u_created.full_name AS created_by_name,
                   u_checked.full_name AS checked_by_name
            FROM cashflow_records cf
            LEFT JOIN users u_created ON cf.created_by = u_created.id
            LEFT JOIN users u_checked ON cf.checked_by = u_checked.id
            ${where}
            ORDER BY cf.cashflow_date DESC, cf.id DESC
        `, params);

        // Calculate carry-forward balance from ALL unclosed records BEFORE the filter window
        let carryForward = 0;
        if (year || month || day) {
            // Build a date condition for "before the filter period"
            let beforeWhere = `WHERE is_closed = false ${srcFilterSQL}`;
            const beforeParams = [];
            let bIdx = 1;
            if (year && month) {
                // Before this specific month
                beforeWhere += ` AND (cashflow_date < make_date($${bIdx++}::int, $${bIdx++}::int, 1))`;
                beforeParams.push(Number(year), Number(month));
            } else if (year && !month) {
                // Before this year
                beforeWhere += ` AND (cashflow_date < make_date($${bIdx++}::int, 1, 1))`;
                beforeParams.push(Number(year));
            }
            if (beforeParams.length > 0) {
                const cfRow = await db.get(`
                    SELECT COALESCE(SUM(CASE WHEN cashflow_type = 'THU' THEN amount ELSE -amount END), 0) AS bal
                    FROM cashflow_records ${beforeWhere}
                `, beforeParams);
                carryForward = Number(cfRow.bal);
            }
        }

        // Calculate running balance (oldest to newest for correct cumulation)
        const sorted = [...rows].reverse();
        let runBal = carryForward;
        const balMap = {};
        sorted.forEach(r => {
            if (!r.is_closed) {
                const amt = Number(r.amount) || 0;
                if (r.cashflow_type === 'THU') runBal += amt;
                else runBal -= amt;
            }
            balMap[r.id] = runBal;
        });

        rows.forEach(r => { r.running_balance = balMap[r.id] || 0; });

        return { records: rows, carry_forward: carryForward };
    });

    // ========== GET TREE (sidebar) ==========
    fastify.get('/api/cashflow/tree', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const { money_source } = request.query;
        const srcFilter = money_source ? `AND money_source = '${money_source}'` : `AND NOT (money_source = 'cophanmay' AND cashflow_type = 'THU' AND cashflow_code LIKE 'CPMAY-%')`;

        const rows = await db.all(`
            SELECT
                EXTRACT(YEAR FROM cashflow_date)::int AS y,
                EXTRACT(MONTH FROM cashflow_date)::int AS m,
                cashflow_type,
                COALESCE(SUM(amount), 0) AS total
            FROM cashflow_records
            WHERE is_closed = false ${srcFilter}
            GROUP BY y, m, cashflow_type
            ORDER BY y DESC, m DESC
        `);

        const yearMap = {};
        rows.forEach(r => {
            if (!yearMap[r.y]) yearMap[r.y] = {};
            if (!yearMap[r.y][r.m]) yearMap[r.y][r.m] = { thu: 0, chi: 0 };
            if (r.cashflow_type === 'THU') yearMap[r.y][r.m].thu = Number(r.total);
            else yearMap[r.y][r.m].chi = Number(r.total);
        });

        const thisYear = new Date().getFullYear();
        if (!yearMap[thisYear]) yearMap[thisYear] = {};

        const tree = [];
        let grandTotal = 0;
        Object.keys(yearMap).sort((a, b) => b - a).forEach(y => {
            const months = [];
            let yearTotal = 0;
            for (let m = 12; m >= 1; m--) {
                const data = yearMap[y][m] || { thu: 0, chi: 0 };
                const balance = data.thu - data.chi;
                yearTotal += balance;
                months.push({ month: m, balance });
            }
            grandTotal += yearTotal;
            tree.push({ year: Number(y), balance: yearTotal, months });
        });

        return { tree, total_unclosed: grandTotal };
    });

    // ========== UPLOAD IMAGE ==========
    fastify.post('/api/cashflow/upload', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const data = await request.file();
        if (!data) return reply.code(400).send({ error: 'Không có file' });

        const path = require('path');
        const { compressAndSave } = require('../utils/imageCompressor');
        const dir = path.join(__dirname, '..', 'uploads', 'cashflow');
        const buf = await data.toBuffer();

        const result = await compressAndSave(buf, dir, 'cf_');
        return { success: true, url: `/uploads/cashflow/${result.fileName}`, path: result.filePath, compressed: result.ratio };
    });

    // ========== NEXT SEQ (for code preview) ==========
    fastify.get('/api/cashflow/next-seq', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const { date } = request.query;
        const cfDate = date || new Date().toISOString().split('T')[0];
        const seq = await _getNextTMSeq(cfDate);
        return { next_seq: seq, code: _buildCode(seq, cfDate) };
    });

    // ========== CREATE CHI (expense) ==========
    fastify.post('/api/cashflow/records', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const canCreate = await _checkCfPerm(user, 'cf_create_chi');
        if (!canCreate) return reply.code(403).send({ error: 'Bạn không có quyền tạo phiếu chi' });

        const b = request.body;
        if (!b.amount || Number(b.amount) <= 0) return reply.code(400).send({ error: 'Thiếu số tiền' });
        if (!b.description) return reply.code(400).send({ error: 'Thiếu nội dung' });

        const cfDate = b.cashflow_date || new Date().toISOString().split('T')[0];
        const moneySrc = b.money_source || 'congty';

        let seq, code;
        if (moneySrc === 'cophanmay') {
            // Use CPMAY sequence (separate from TM)
            seq = await _getNextCpmaySeq(cfDate);
            code = _buildCpmayCode(seq, cfDate);
        } else {
            // Use TM sequence (shared with Sổ Ghi Nhận Tiền)
            seq = await _getNextTMSeq(cfDate);
            code = _buildCode(seq, cfDate);
        }

        try {
            // Reserve TM code in payment_records only for CÔNG TY (not CPMAY)
            if (moneySrc !== 'cophanmay') {
                await db.run(`
                    INSERT INTO payment_records (payment_code, payment_method, daily_seq, amount, payment_type, transfer_note, money_source, source, payment_date, created_by)
                    VALUES ($1, 'TM', $2, $3, 'chi', $4, $5, 'cashflow_chi', $6, $7)
                `, [code, seq, Number(b.amount), b.description, 'congty', cfDate, user.id]);
            }

            const result = await db.get(`
                INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, order_code, image_url, money_source, created_by)
                VALUES ($1, 'CHI', $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id, cashflow_code
            `, [code, seq, cfDate, b.description, Number(b.amount), b.order_code || null, b.image_url || null, moneySrc, user.id]);

            // Send Telegram (photo if available, otherwise text)
            try {
                const tgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cashflow_group'");
                if (tgRow && tgRow.value) {
                    const amtStr = Number(b.amount).toLocaleString('vi-VN');
                    const thuSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='THU' AND is_closed=false AND NOT (money_source='cophanmay' AND cashflow_code LIKE 'CPMAY-%')");
                    const chiSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='CHI' AND is_closed=false");
                    const runBal = Number(thuSum.t) - Number(chiSum.t);
                    const balStr = runBal.toLocaleString('vi-VN');
                    const caption = moneySrc === 'cophanmay'
                        ? `🔴🔴🔴CHI <b>CỔ PHẦN MAY</b> :\n💰${code} : <b>${amtStr}đ</b> ${b.description} 👤 ${user.full_name || user.username}\n\n🔗Tổng Kế Toán Cầm : <b>${balStr}đ</b>`
                        : `🔴CHI TM <b>CÔNG TY</b> :\n💰${code} : <b>${amtStr}đ</b> ${b.description} 👤 ${user.full_name || user.username}\n\n🔗Tổng Kế Toán Cầm : <b>${balStr}đ</b>`;

                    if (b.image_url && b.image_path) {
                        const { sendTelegramPhoto } = require('../utils/telegram');
                        await sendTelegramPhoto(tgRow.value, b.image_path, caption);
                    } else {
                        const { sendTelegramMessage } = require('../utils/telegram');
                        await sendTelegramMessage(tgRow.value, caption);
                    }
                }
            } catch (tgErr) { console.error('[CF TG] Error:', tgErr.message); }

            // Send to CP May Telegram group (if money_source is cophanmay)
            if (moneySrc === 'cophanmay') {
                try {
                    const cpmTgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cpmay_group'");
                    if (cpmTgRow && cpmTgRow.value) {
                        const cpmAmtStr = Number(b.amount).toLocaleString('vi-VN');
                        const cpmTotal = await db.get("SELECT COALESCE(SUM(CASE WHEN cashflow_type='THU' THEN amount ELSE -amount END),0) AS t FROM cashflow_records WHERE money_source='cophanmay' AND is_closed=false");
                        const cpmTotalStr = Number(cpmTotal.t).toLocaleString('vi-VN');
                        const cpmCaption = `🔴🔴🔴CHI <b>CỔ PHẦN MAY</b> :\n💰${code} : <b>${cpmAmtStr}đ</b> ${b.description} 👤 ${user.full_name || user.username}\n\n🔗Tổng CP May : <b>${cpmTotalStr}đ</b>`;

                        if (b.image_url && b.image_path) {
                            const { sendTelegramPhoto } = require('../utils/telegram');
                            await sendTelegramPhoto(cpmTgRow.value, b.image_path, cpmCaption);
                        } else {
                            const { sendTelegramMessage } = require('../utils/telegram');
                            await sendTelegramMessage(cpmTgRow.value, cpmCaption);
                        }
                    }
                } catch (cpmTgErr) { console.error('[CPM TG] Error:', cpmTgErr.message); }
            }

            return { success: true, id: result.id, cashflow_code: result.cashflow_code };
        } catch (err) {
            if (err.message && err.message.includes('unique')) {
                return reply.code(409).send({ error: 'Mã đã tồn tại. Thử lại.' });
            }
            throw err;
        }
    });

    // ========== CHECK (mark as checked) ==========
    fastify.put('/api/cashflow/:id/check', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const canCheck = await _checkCfPerm(user, 'cf_check');
        if (!canCheck) return reply.code(403).send({ error: 'Bạn không có quyền kiểm tra' });

        await db.run(`UPDATE cashflow_records SET checked_by = $1, checked_at = NOW(), updated_at = NOW() WHERE id = $2`,
            [user.id, request.params.id]);
        return { success: true };
    });

    // ========== IMPACT CHECK: Kiểm tra ảnh hưởng trước khi xóa ==========
    fastify.get('/api/cashflow/:id/impact', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const rec = await db.get('SELECT * FROM cashflow_records WHERE id = $1', [request.params.id]);
        if (!rec) return reply.code(404).send({ error: 'Không tìm thấy' });

        const impacts = [];
        const isCpMay = rec.money_source === 'cophanmay' || (rec.cashflow_code && rec.cashflow_code.startsWith('CPMAY-'));

        // Check linked payment_records (reserved TM code)
        if (rec.cashflow_code && !rec.cashflow_code.startsWith('CPMAY-')) {
            const linkedPR = await db.get("SELECT id, payment_code, amount FROM payment_records WHERE payment_code = $1 AND source = 'cashflow_chi'", [rec.cashflow_code]);
            if (linkedPR) {
                impacts.push({
                    module: '💵 Sổ Ghi Nhận Tiền',
                    detail: 'Mã ' + linkedPR.payment_code + ' (reserved) sẽ bị XÓA theo',
                    effect: 'Mã TM sẽ được giải phóng'
                });
            }
        }

        // Check linked Sổ Thu Chi record (for CP May records created from Sổ Thu Chi)
        if (isCpMay) {
            // Check if this CP May record has a mirror in cashflow (Sổ Thu Chi group)
            const cfLinked = await db.get("SELECT id, cashflow_code, amount FROM cashflow_records WHERE cashflow_code = $1 AND id != $2 AND money_source = 'cophanmay'", [rec.cashflow_code, rec.id]);
            if (cfLinked) {
                impacts.push({
                    module: '📒 Sổ Thu Chi',
                    detail: 'Bản ghi liên kết ở Sổ Thu Chi sẽ bị ảnh hưởng',
                    effect: 'Số dư Kế Toán Cầm sẽ thay đổi'
                });
            }
            impacts.push({
                module: '🧵 Sổ Cổ Phần May',
                detail: rec.cashflow_type + ' ' + Number(rec.amount).toLocaleString('vi-VN') + 'đ sẽ bị xóa',
                effect: 'Tổng CP May sẽ thay đổi'
            });
        } else {
            impacts.push({
                module: '📒 Sổ Thu Chi',
                detail: rec.cashflow_type + ' ' + Number(rec.amount).toLocaleString('vi-VN') + 'đ sẽ bị xóa',
                effect: 'Số dư Kế Toán Cầm sẽ thay đổi'
            });
        }

        return {
            record: { code: rec.cashflow_code, amount: Number(rec.amount), type: rec.cashflow_type, money_source: rec.money_source },
            impacts
        };
    });

    // ========== DELETE (chỉ Giám Đốc) ==========
    fastify.delete('/api/cashflow/:id', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc được xóa' });

        const record = await db.get('SELECT * FROM cashflow_records WHERE id = $1', [request.params.id]);
        if (!record) return reply.code(404).send({ error: 'Không tìm thấy' });

        // Delete linked payment_records if exists (TM code reservation)
        if (record.cashflow_code && !record.cashflow_code.startsWith('CPMAY-')) {
            await db.run(`DELETE FROM payment_records WHERE payment_code = $1 AND source = 'cashflow_chi'`, [record.cashflow_code]);
        }

        await db.run('DELETE FROM cashflow_records WHERE id = $1', [request.params.id]);
        return { success: true, deleted_code: record.cashflow_code };
    });

    // ========== BATCH CHECK ==========
    fastify.put('/api/cashflow/batch-check', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const canCheck = await _checkCfPerm(user, 'cf_check');
        if (!canCheck) return reply.code(403).send({ error: 'Bạn không có quyền kiểm tra' });

        const { ids } = request.body;
        if (!ids || !ids.length) return reply.code(400).send({ error: 'Chưa chọn mã nào' });

        const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
        await db.run(
            `UPDATE cashflow_records SET checked_by = $1, checked_at = NOW(), updated_at = NOW() WHERE id IN (${placeholders}) AND checked_by IS NULL`,
            [user.id, ...ids]
        );
        return { success: true, count: ids.length };
    });

    // ========== CLOSE (chốt sổ) ==========
    fastify.put('/api/cashflow/:id/close', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        await db.run(`UPDATE cashflow_records SET is_closed = true, updated_at = NOW() WHERE id = $1`,
            [request.params.id]);
        return { success: true };
    });

    // ========== BALANCE (total unclosed) ==========
    fastify.get('/api/cashflow/balance', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const thu = await db.get("SELECT COALESCE(SUM(amount), 0) AS total FROM cashflow_records WHERE cashflow_type = 'THU' AND is_closed = false");
        const chi = await db.get("SELECT COALESCE(SUM(amount), 0) AS total FROM cashflow_records WHERE cashflow_type = 'CHI' AND is_closed = false");
        return { balance: Number(thu.total) - Number(chi.total), thu: Number(thu.total), chi: Number(chi.total) };
    });

    // ========== SYNC: Create THU from TM payment ==========
    fastify.post('/api/cashflow/sync-thu', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const { payment_record_id } = request.body;
        if (!payment_record_id) return reply.code(400).send({ error: 'Thiếu payment_record_id' });

        const exists = await db.get('SELECT id FROM cashflow_records WHERE source_record_id = $1', [payment_record_id]);
        if (exists) return { success: true, already_exists: true };

        const pr = await db.get('SELECT * FROM payment_records WHERE id = $1', [payment_record_id]);
        if (!pr) return reply.code(404).send({ error: 'Không tìm thấy mã tiền' });
        if (pr.payment_method !== 'TM') return reply.code(400).send({ error: 'Chỉ sync tiền mặt (TM)' });

        const cfDate = pr.payment_date;
        const syncAmount = Number(pr.amount);
        if (!syncAmount || isNaN(syncAmount) || syncAmount <= 0) {
            return reply.code(400).send({ error: 'Số tiền không hợp lệ: ' + pr.amount });
        }
        // Use original payment_code as cashflow_code (TM5-15-5-Y26)
        const result = await db.get(`
            INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, source_record_id, created_by)
            VALUES ($1, 'THU', $2, $3, $4, $5, $6, $7)
            RETURNING id, cashflow_code
        `, [pr.payment_code, pr.daily_seq || 0, cfDate, pr.transfer_note || pr.payment_code, syncAmount, pr.id, pr.created_by || user.id]);

        // Send Telegram for THU
        try {
            const tgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cashflow_group'");
            if (tgRow && tgRow.value) {
                const { sendTelegramMessage } = require('../utils/telegram');
                const amtStr = Number(pr.amount).toLocaleString('vi-VN');
                const thuSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='THU' AND is_closed=false AND NOT (money_source='cophanmay' AND cashflow_code LIKE 'CPMAY-%')");
                const chiSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='CHI' AND is_closed=false");
                const runBal = Number(thuSum.t) - Number(chiSum.t);
                const balStr = runBal.toLocaleString('vi-VN');
                const msg = `🟢THU TIỀN MẶT CÔNG TY :\n💰${pr.payment_code} : <b>${amtStr}đ</b> ${pr.transfer_note || ''} 👤 Hệ Thống\n\n🔗Tổng Kế Toán Cầm : <b>${balStr}đ</b>`;
                await sendTelegramMessage(tgRow.value, msg);
            }
        } catch (tgErr) { console.error('[CF TG THU] Error:', tgErr.message); }

        return { success: true, id: result.id, cashflow_code: result.cashflow_code };
    });

    // ========== CPMAY: Next Seq Preview ==========
    fastify.get('/api/cashflow/cpmay-next-seq', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const { date } = request.query;
        if (!date) return reply.code(400).send({ error: 'Thiếu date' });
        const seq = await _getNextCpmaySeq(date);
        const code = _buildCpmayCode(seq, date);
        return { next_seq: seq, code };
    });

    // ========== CPMAY: Create Record ==========
    fastify.post('/api/cashflow/cpmay-records', async (request, reply) => {
        const user = _auth(request);
        if (!user) return reply.code(401).send({ error: 'Chưa đăng nhập' });

        const b = request.body;
        const cfDate = b.cashflow_date;
        const cfType = b.cashflow_type === 'CHI' ? 'CHI' : 'THU';
        if (!cfDate || !b.amount || !b.description) {
            return reply.code(400).send({ error: 'Thiếu thông tin bắt buộc' });
        }

        const seq = await _getNextCpmaySeq(cfDate);
        const code = _buildCpmayCode(seq, cfDate);

        try {
            const result = await db.get(`
                INSERT INTO cashflow_records (cashflow_code, cashflow_type, daily_seq, cashflow_date, description, amount, image_url, money_source, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'cophanmay', $8)
                RETURNING id, cashflow_code
            `, [code, cfType, seq, cfDate, b.description, Number(b.amount), b.image_url || null, user.id]);

            // Send Telegram to CP May group
            try {
                const cpmTgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cpmay_group'");
                if (cpmTgRow && cpmTgRow.value) {
                    const amtStr = Number(b.amount).toLocaleString('vi-VN');
                    const cpmTotal = await db.get("SELECT COALESCE(SUM(CASE WHEN cashflow_type='THU' THEN amount ELSE -amount END),0) AS t FROM cashflow_records WHERE money_source='cophanmay' AND is_closed=false");
                    const totalStr = Number(cpmTotal.t).toLocaleString('vi-VN');
                    const emoji = cfType === 'THU' ? '🟢🟢🟢' : '🔴🔴🔴';
                    const typeLabel = cfType === 'THU' ? 'THU' : 'CHI';
                    const caption = `${emoji}${typeLabel} <b>CỔ PHẦN MAY</b> :\n💰${code} : <b>${amtStr}đ</b> ${b.description} 👤 ${user.full_name || user.username}\n\n🔗Tổng CP May : <b>${totalStr}đ</b>`;

                    if (b.image_url && b.image_path) {
                        const { sendTelegramPhoto } = require('../utils/telegram');
                        await sendTelegramPhoto(cpmTgRow.value, b.image_path, caption);
                    } else {
                        const { sendTelegramMessage } = require('../utils/telegram');
                        await sendTelegramMessage(cpmTgRow.value, caption);
                    }
                }
            } catch (tgErr) { console.error('[CPMAY TG] Error:', tgErr.message); }

            // CHI also sends to Sổ Thu Chi Telegram (because CHI CP May shows in both)
            if (cfType === 'CHI') {
                try {
                    const tgRow = await db.get("SELECT value FROM app_config WHERE key = 'tg_cashflow_group'");
                    if (tgRow && tgRow.value) {
                        const amtStr = Number(b.amount).toLocaleString('vi-VN');
                        const thuSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='THU' AND is_closed=false AND NOT (money_source='cophanmay' AND cashflow_code LIKE 'CPMAY-%')");
                        const chiSum = await db.get("SELECT COALESCE(SUM(amount),0) AS t FROM cashflow_records WHERE cashflow_type='CHI' AND is_closed=false");
                        const runBal = Number(thuSum.t) - Number(chiSum.t);
                        const balStr = runBal.toLocaleString('vi-VN');
                        const caption = `🔴🔴🔴CHI <b>CỔ PHẦN MAY</b> :\n💰${code} : <b>${amtStr}đ</b> ${b.description} 👤 ${user.full_name || user.username}\n\n🔗Tổng Kế Toán Cầm : <b>${balStr}đ</b>`;

                        if (b.image_url && b.image_path) {
                            const { sendTelegramPhoto } = require('../utils/telegram');
                            await sendTelegramPhoto(tgRow.value, b.image_path, caption);
                        } else {
                            const { sendTelegramMessage } = require('../utils/telegram');
                            await sendTelegramMessage(tgRow.value, caption);
                        }
                    }
                } catch (tgErr) { console.error('[CPMAY->CF TG] Error:', tgErr.message); }
            }

            return { success: true, id: result.id, cashflow_code: result.cashflow_code };
        } catch (err) {
            if (err.message && err.message.includes('unique')) {
                return reply.code(409).send({ error: 'Mã đã tồn tại. Thử lại.' });
            }
            throw err;
        }
    });

    // ========== DAILY REPORT: Config Get ==========
    fastify.get('/api/cashflow/report-config', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const grp = await db.get("SELECT value FROM app_config WHERE key = 'cf_report_tg_group'");
        const time = await db.get("SELECT value FROM app_config WHERE key = 'cf_report_time'");
        return {
            group_id: grp?.value || '',
            report_time: time?.value || '21:00'
        };
    });

    // ========== DAILY REPORT: Config Save ==========
    fastify.put('/api/cashflow/report-config', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const { group_id, report_time } = request.body || {};
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('cf_report_tg_group', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [(group_id || '').trim()]
        );
        await db.run(
            `INSERT INTO app_config (key, value, updated_at) VALUES ('cf_report_time', $1, NOW())
             ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = NOW()`,
            [(report_time || '21:00').trim()]
        );
        return { success: true };
    });

    // ========== DAILY REPORT: Manual Send ==========
    fastify.post('/api/cashflow/report-send', async (request, reply) => {
        const token = request.cookies?.token;
        if (!token) return reply.code(401).send({ error: 'Chưa đăng nhập' });
        const jwt = require('jsonwebtoken');
        let user;
        try { user = jwt.verify(token, process.env.JWT_SECRET); } catch { return reply.code(401).send({ error: 'Token không hợp lệ' }); }
        if (user.role !== 'giam_doc') return reply.code(403).send({ error: 'Chỉ Giám Đốc' });

        const bodyGroupId = (request.body?.group_id || '').trim();
        let groupId = bodyGroupId;
        if (!groupId) {
            const grp = await db.get("SELECT value FROM app_config WHERE key = 'cf_report_tg_group'");
            groupId = grp?.value?.trim();
        }
        if (!groupId) return reply.code(400).send({ error: 'Chưa cài đặt Group ID Telegram' });

        const { vnNow } = require('../utils/timezone');
        const now = vnNow();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

        const rows = await db.all(`
            SELECT money_source, COALESCE(SUM(amount), 0)::numeric AS total
            FROM cashflow_records
            WHERE cashflow_date = $1 AND cashflow_type = 'CHI'
            GROUP BY money_source
        `, [todayStr]);

        let totalCongTy = 0, totalCPMay = 0;
        for (const r of rows) {
            if (r.money_source === 'cophanmay') totalCPMay = Number(r.total);
            else totalCongTy = Number(r.total);
        }
        const totalAll = totalCongTy + totalCPMay;
        const dd = String(now.getDate()).padStart(2,'0');
        const mm = String(now.getMonth()+1).padStart(2,'0');
        const yyyy = now.getFullYear();
        const fmtVN = (n) => Number(n).toLocaleString('vi-VN') + 'đ';

        let msg = `<b>TỔNG SỐ TIỀN CHI</b> ngày ${dd}/${mm}/${yyyy}:\n`;
        msg += `<b>${fmtVN(totalCongTy)}</b> CÔNG TY + <b>${fmtVN(totalCPMay)}</b> CỔ PHẦN MAY = <b>${fmtVN(totalAll)}</b>`;

        const { sendTelegramMessage } = require('../utils/telegram');
        const ok = await sendTelegramMessage(groupId, msg);
        if (ok) return { success: true, message: msg };
        return reply.code(400).send({ error: 'Gửi thất bại! Kiểm tra Bot Token và Group ID.' });
    });
};
