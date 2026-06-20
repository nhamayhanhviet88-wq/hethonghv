/**
 * PENALTY LEDGER — Sổ phạt hàng ngày (Single Source of Truth)
 * Ghi: chỉ deadline-checker ghi vào
 * Đọc: tất cả views (popup, phiếu, block screen)
 */
const db = require('../db/pool');

// Ghi 1 dòng phạt vào ledger (idempotent — ON CONFLICT DO NOTHING)
async function writeLedger(userId, penaltyDate, sourceType, sourceRefId, taskName, amount, reason) {
    try {
        await db.run(
            `INSERT INTO daily_penalty_ledger (user_id, penalty_date, source_type, source_ref_id, task_name, penalty_amount, penalty_reason)
             VALUES ($1, $2::date, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id, penalty_date, source_type, source_ref_id) DO NOTHING`,
            [userId, penaltyDate, sourceType, sourceRefId, taskName, amount || 0, reason || '']
        );
    } catch (e) {
        console.error(`  ❌ [Ledger] Write error: ${e.message}`);
    }
}

// Sync tất cả penalties cho 1 ngày vào ledger (gọi từ deadline-checker)
async function syncLedgerForDate(dateStr) {
    // Load GPC config
    const GPC = {};
    const gpcRows = await db.all('SELECT key, amount FROM global_penalty_config');
    gpcRows.forEach(r => GPC[r.key] = Number(r.amount));
    const BASE_SUPPORT = GPC.ho_tro_nv || GPC.ql_khong_ho_tro || 50000;
    const BASE_CAPCUU = GPC.cap_cuu_ql_khong_xu_ly || 50000;
    let count = 0;

    // ★ Check if dateStr is a day off (Sunday or holiday) — skip ongoing stacking sources
    const { isDayOff: _isDayOff } = require('./ledgerDayOff');
    const isDateOff = await _isDayOff(dateStr);

    // Source 1: CV Khóa (NV không nộp + QL không duyệt)
    try {
        const rows = await db.all(
            `SELECT ltc.id, ltc.user_id, lt.task_name, ltc.completion_date::text as d, ltc.penalty_amount, ltc.redo_count
             FROM lock_task_completions ltc JOIN lock_tasks lt ON lt.id = ltc.lock_task_id
             WHERE ltc.status = 'expired' AND ltc.penalty_applied = true AND ltc.completion_date = $1::date`, [dateStr]
        );
        for (const r of rows) {
            const isQL = r.redo_count === -1;
            await writeLedger(r.user_id, r.d, isQL ? 'ql_khoa' : 'cv_khoa', 'ltc_' + r.id,
                isQL ? 'Không duyệt CV Khóa: ' + r.task_name : 'CV Khóa: ' + r.task_name,
                r.penalty_amount, isQL ? 'Không duyệt công việc khóa' : 'Không nộp CV Khóa');
            count++;
        }
    } catch (e) { console.error('  ❌ [Ledger] CV Khóa:', e.message); }

    // Source 2: CV Chuỗi
    try {
        const rows = await db.all(
            `SELECT cc.id, cc.user_id, ci.task_name, cins.chain_name, cc.penalty_amount, cc.redo_count,
                    (CASE WHEN cc.redo_count = -2 THEN cc.created_at::date ELSE ci.deadline END)::text as d
             FROM chain_task_completions cc
             JOIN chain_task_instance_items ci ON ci.id = cc.chain_item_id
             JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
             WHERE cc.status = 'expired' AND cc.penalty_applied = true
               AND (ci.deadline = $1::date OR (cc.redo_count = -2 AND cc.created_at::date = $1::date))`, [dateStr]
        );
        for (const r of rows) {
            const label = r.chain_name ? `${r.task_name} (${r.chain_name})` : r.task_name;
            await writeLedger(r.user_id, r.d, r.redo_count === -2 ? 'ql_chuoi' : 'cv_chuoi', 'cc_' + r.id,
                (r.redo_count === -2 ? 'Không duyệt CV Chuỗi: ' : 'CV Chuỗi: ') + label,
                r.penalty_amount, r.redo_count === -2 ? 'Không duyệt CV chuỗi' : 'Không nộp CV Chuỗi');
            count++;
        }
    } catch (e) { console.error('  ❌ [Ledger] CV Chuỗi:', e.message); }

    // Source 3: Sếp Hỗ Trợ — expired ngày này
    try {
        const rows = await db.all(
            `SELECT sr.id, sr.manager_id, sr.task_name, sr.task_date::text as d, sr.penalty_amount, sr.penalty_reason
             FROM task_support_requests sr
             WHERE sr.status IN ('expired','ql_expired') AND sr.penalty_amount > 0 AND sr.task_date = $1::date`, [dateStr]
        );
        for (const r of rows) {
            const isDiem = r.penalty_reason?.includes('Không duyệt');
            await writeLedger(r.manager_id, r.d, isDiem ? 'cv_diem' : 'ho_tro_nv', 'sr_' + r.id,
                (isDiem ? 'Không duyệt CV Điểm: ' : 'Không hỗ trợ NV: ') + r.task_name,
                r.penalty_amount, r.penalty_reason);
            count++;
        }
    } catch (e) { console.error('  ❌ [Ledger] Sếp HT:', e.message); }

    // Source 4: Phạt chồng QL Hỗ Trợ — ongoing từ ngày trước, ghi BASE_SUPPORT cho ngày hôm nay
    // ★ Skip ngày nghỉ — không phạt chồng vào CN/lễ
    if (!isDateOff) {
    try {
        const rows = await db.all(
            `SELECT sr.id, sr.manager_id, sr.task_name, sr.task_date::text as orig_date, sr.penalty_reason
             FROM task_support_requests sr
             WHERE sr.status = 'ql_expired' AND sr.penalty_amount > 0 AND sr.task_date != $1::date`, [dateStr]
        );
        for (const r of rows) {
            await writeLedger(r.manager_id, dateStr, 'ho_tro_chong', 'sr_' + r.id,
                'Chưa hỗ trợ NV: ' + r.task_name + ' (gốc: ' + r.orig_date + ')',
                BASE_SUPPORT, r.penalty_reason || 'Phạt chồng không hỗ trợ nhân sự');
            count++;
        }
    } catch (e) { console.error('  ❌ [Ledger] Phạt chồng HT:', e.message); }
    } // end if (!isDateOff) Source 4

    // Source 5: Phạt chồng QL CV Khóa — ongoing từ ngày trước
    // ★ Skip ngày nghỉ
    if (!isDateOff) {
    try {
        const rows = await db.all(
            `SELECT ltc_ql.id, ltc_ql.user_id, lt.task_name, ltc_ql.completion_date::text as orig_date, ltc_ql.penalty_amount
             FROM lock_task_completions ltc_ql JOIN lock_tasks lt ON lt.id = ltc_ql.lock_task_id
             WHERE ltc_ql.redo_count = -1 AND ltc_ql.status = 'expired' AND ltc_ql.penalty_applied = true
               AND ltc_ql.completion_date != $1::date
               AND EXISTS (SELECT 1 FROM lock_task_completions ltc_nv
                           WHERE ltc_nv.lock_task_id = ltc_ql.lock_task_id AND ltc_nv.completion_date = ltc_ql.completion_date
                             AND ltc_nv.status = 'pending' AND ltc_nv.redo_count >= 0)`, [dateStr]
        );
        for (const r of rows) {
            await writeLedger(r.user_id, dateStr, 'ql_khoa_chong', 'ltc_' + r.id,
                'Chưa duyệt CV Khóa: ' + r.task_name + ' (gốc: ' + r.orig_date + ')',
                BASE_SUPPORT, 'Phạt chồng không duyệt CV Khóa');
            count++;
        }
    } catch (e) { console.error('  ❌ [Ledger] Phạt chồng Khóa:', e.message); }
    } // end if (!isDateOff) Source 5

    // Source 6: Phạt chồng QL CV Chuỗi
    // ★ Skip ngày nghỉ
    if (!isDateOff) {
    try {
        const rows = await db.all(
            `SELECT cc_ql.id, cc_ql.user_id, ci.task_name, cins.chain_name
             FROM chain_task_completions cc_ql
             JOIN chain_task_instance_items ci ON ci.id = cc_ql.chain_item_id
             JOIN chain_task_instances cins ON cins.id = ci.chain_instance_id
             WHERE cc_ql.redo_count = -2 AND cc_ql.status = 'expired' AND cc_ql.penalty_applied = true
               AND EXISTS (SELECT 1 FROM chain_task_completions cc_nv
                           WHERE cc_nv.chain_item_id = cc_ql.chain_item_id AND cc_nv.status = 'pending' AND cc_nv.redo_count >= 0)`
        );
        for (const r of rows) {
            const label = r.chain_name ? `${r.task_name} (${r.chain_name})` : r.task_name;
            await writeLedger(r.user_id, dateStr, 'ql_chuoi_chong', 'cc_' + r.id,
                'Chưa duyệt CV Chuỗi: ' + label, BASE_SUPPORT, 'Phạt chồng không duyệt CV Chuỗi');
            count++;
        }
    } catch (e) { console.error('  ❌ [Ledger] Phạt chồng Chuỗi:', e.message); }
    } // end if (!isDateOff) Source 6

    // Source 7: Cấp cứu sếp — pending + phạt
    // ★ Skip ngày nghỉ
    if (!isDateOff) {
    try {
        const rows = await db.all(
            `SELECT e.id, COALESCE(e.handover_to, e.handler_id) as uid, e.reason, c.customer_name
             FROM emergencies e LEFT JOIN customers c ON c.id = e.customer_id
             WHERE e.penalty_applied = true AND e.status = 'pending'`
        );
        for (const r of rows) {
            await writeLedger(r.uid, dateStr, 'cap_cuu', 'em_' + r.id,
                'Cấp Cứu Sếp: ' + (r.customer_name || 'KH'),
                BASE_CAPCUU, 'Không xử lý cấp cứu: ' + (r.reason || ''));
            count++;
        }
    } catch (e) { console.error('  ❌ [Ledger] Cấp cứu:', e.message); }
    } // end if (!isDateOff) Source 7

    // Source 8: KH Chưa XL + KH Trễ
    try {
        const rows = await db.all(
            `SELECT cpr.id, cpr.user_id, cpr.crm_type, cpr.unhandled_count, cpr.penalty_amount, cpr.penalty_date::text as d
             FROM customer_penalty_records cpr JOIN users u ON u.id = cpr.user_id
             WHERE cpr.penalty_date = $1::date AND u.role != 'giam_doc'`, [dateStr]
        );
        for (const r of rows) {
            const isTre = r.crm_type?.startsWith('tre_');
            const rawType = isTre ? r.crm_type.replace('tre_', '') : r.crm_type;
            const LABELS = { nhu_cau: 'Chăm Sóc Nhu Cầu', ctv: 'CTV', ctv_hoa_hong: 'Affiliate', koc_tiktok: 'KOL/KOC', qua_tang: 'QT/SK/DL', nguoi_than: 'NT/BB' };
            const label = LABELS[rawType] || rawType;
            const name = isTre ? `KH xử lý trễ: ${label} (${r.unhandled_count} KH)` : `KH chưa xử lý: ${label} (${r.unhandled_count} KH)`;
            await writeLedger(r.user_id, r.d, isTre ? 'kh_tre' : 'kh_chua_xl', 'cpr_' + r.id,
                name, r.penalty_amount, isTre ? 'Không xử lý khách trễ' : 'Không xử lý khách hôm nay');
            count++;
        }
    } catch (e) { console.error('  ❌ [Ledger] KH:', e.message); }

    // Source 9: Gửi Hàng Trễ — KT chưa gửi đơn đúng hạn (FLAT 100k/ngày)
    if (!isDateOff) {
    try {
        const ktCutoffMinutes = GPC.kt_cutoff_time !== undefined ? GPC.kt_cutoff_time : 1110;
        const ktHrs = Math.floor(ktCutoffMinutes / 60);
        const ktMins = ktCutoffMinutes % 60;
        const ktTimeStr = `${String(ktHrs).padStart(2, '0')}:${String(ktMins).padStart(2, '0')}:00`;

        const overdueOrders = await db.all(`
            SELECT o.id, o.order_code FROM dht_orders o
            WHERE o.shipping_status IN ('pending','rescheduled')
              AND o.expected_ship_date IS NOT NULL
              AND (
                  COALESCE(o.rescheduled_ship_date, o.expected_ship_date) <= $1::date
                  OR (
                      o.qlx_actual_output_at IS NOT NULL
                      AND o.qlx_actual_output_at AT TIME ZONE 'Asia/Ho_Chi_Minh' < ($1::date + $2::time)
                  )
              )
              AND NOT EXISTS (
                  SELECT 1 FROM dht_shipping_reschedules r
                  WHERE r.dht_order_id = o.id
                    AND (r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $1::date
              )
        `, [dateStr, ktTimeStr]);
        if (overdueOrders.length > 0) {
            const PENALTY_AMT = GPC.gui_hang_tre || 100000;
            const ktUsers = await db.all(`
                SELECT u.id FROM users u
                JOIN departments d ON u.department_id = d.id
                WHERE (d.name ILIKE '%kế toán%' OR d.name ILIKE '%ke toan%')
                  AND u.status = 'active' AND u.role != 'giam_doc'
            `);
            for (const kt of ktUsers) {
                await writeLedger(kt.id, dateStr, 'gui_hang_tre', 'shipping_daily',
                    `Gửi Hàng Trễ: ${overdueOrders.length} đơn quá hạn`,
                    PENALTY_AMT, 'Kế toán chưa gửi đơn hàng đúng hạn');
                count++;
            }
        }
    } catch (e) { console.error('  ❌ [Ledger] Gửi Hàng Trễ:', e.message); }
    } // end if (!isDateOff) Source 9

    // Source 10: Phiếu QLX Quá Hạn — QLX không xử lý phiếu yêu cầu kịp deadline
    // Phạt chồng hàng ngày: nếu ticket vẫn pending/in_progress + is_overdue → phạt tiếp
    // ★ Skip ngày nghỉ
    if (!isDateOff) {
    try {
        const PENALTY_WT = GPC.phieu_qlx_qua_han || 50000;
        const overdueTickets = await db.all(`
            SELECT t.id, t.ticket_code, t.assigned_to, t.deadline_at
            FROM work_tickets t
            JOIN users u ON u.id = t.assigned_to
            WHERE t.status IN ('pending','in_progress')
              AND t.is_overdue = true
              AND t.deadline_at IS NOT NULL
              AND t.deadline_at::date <= $1::date
              AND u.role != 'giam_doc' AND u.status = 'active'
        `, [dateStr]);
        for (const t of overdueTickets) {
            await writeLedger(
                t.assigned_to, dateStr, 'phieu_qlx_qua_han', 'wt_' + t.id,
                'Phiếu QLX Quá Hạn: ' + t.ticket_code,
                PENALTY_WT, 'Không xử lý phiếu yêu cầu kịp hạn'
            );
            count++;
        }
    } catch (e) { console.error('  ❌ [Ledger] Phiếu QLX:', e.message); }
    } // end if (!isDateOff) Source 10

    // Source 11: Quản Lý Xưởng Trễ Đơn Hàng Hôm Nay
    if (!isDateOff) {
    try {
        const qlxOrders = await db.all(`
            SELECT id, order_code, created_at, expected_ship_date, qlx_expected_date, qlx_rescheduled_date
            FROM dht_orders
            WHERE shipping_status IN ('pending','rescheduled')
              AND qlx_actual_output_at IS NULL
              AND expected_ship_date IS NOT NULL
              AND COALESCE(qlx_rescheduled_date, qlx_expected_date, expected_ship_date) <= $1::date
        `, [dateStr]);

        const { vnDateStr, vnTimeStr } = require('./timezone');
        const cutoffMinutes = GPC.qlx_cutoff_time !== undefined ? GPC.qlx_cutoff_time : 1080;
        const cutoffHrs = Math.floor(cutoffMinutes / 60);
        const cutoffMins = cutoffMinutes % 60;
        const cutoffTimeStr = `${String(cutoffHrs).padStart(2, '0')}:${String(cutoffMins).padStart(2, '0')}`;

        const overdueOrders = qlxOrders.filter(order => {
            const orderDate = vnDateStr(order.created_at);
            const orderTime = vnTimeStr(order.created_at);
            if (orderDate === dateStr && orderTime > cutoffTimeStr) {
                return false; // Exclude late orders created today after cutoff
            }
            return true;
        });

        if (overdueOrders.length > 0) {
            const PENALTY_AMT = GPC.phat_qlx_tre_don_hom_nay !== undefined ? GPC.phat_qlx_tre_don_hom_nay : 100000;
            const qlxUsers = await db.all(`
                SELECT u.id FROM users u
                JOIN departments d ON u.department_id = d.id
                WHERE (d.name ILIKE '%quản lý xưởng%' OR d.name ILIKE '%quan ly xuong%' OR d.name ILIKE '%qlx%')
                  AND u.status = 'active' AND u.role != 'giam_doc'
            `);
            for (const qlx of qlxUsers) {
                await writeLedger(qlx.id, dateStr, 'phat_qlx_tre_don_hom_nay', 'qlx_daily',
                    `QLX Trễ Đơn Hàng Hôm Nay: ${overdueOrders.length} đơn trễ`,
                    PENALTY_AMT, 'Quản lý xưởng chưa hoàn thành đơn hàng hôm nay');
                count++;
            }
        }
    } catch (e) { console.error('  ❌ [Ledger] QLX Trễ Đơn:', e.message); }
    } // end if (!isDateOff) Source 11

    return count;
}

// Đọc penalties từ ledger cho 1 user, 1 ngày
async function getLedgerForUser(userId, dateStr) {
    return db.all(
        `SELECT * FROM daily_penalty_ledger WHERE user_id = $1 AND penalty_date = $2::date ORDER BY source_type, id`,
        [userId, dateStr]
    );
}

// Đọc penalties từ ledger cho 1 ngày, nhiều users (filtered by dept)
async function getLedgerForDate(dateStr, excludeUserId, deptIds) {
    if (!deptIds || deptIds.length === 0) return [];
    const ph = deptIds.map((_, i) => `$${i + 3}`).join(',');
    return db.all(
        `SELECT dpl.*, u.full_name, u.username, u.department_id, u.role
         FROM daily_penalty_ledger dpl
         JOIN users u ON u.id = dpl.user_id
         WHERE dpl.penalty_date = $1::date AND dpl.user_id != $2 AND u.department_id IN (${ph})
           AND u.role != 'giam_doc'
         ORDER BY dpl.user_id, dpl.source_type`,
        [dateStr, excludeUserId, ...deptIds]
    );
}

// Đọc penalties từ ledger cho 1 user, khoảng thời gian (phiếu phạt)
async function getLedgerForUserRange(userId, startDate, endDate) {
    return db.all(
        `SELECT * FROM daily_penalty_ledger WHERE user_id = $1 AND penalty_date BETWEEN $2::date AND $3::date ORDER BY penalty_date, source_type`,
        [userId, startDate, endDate]
    );
}

module.exports = { writeLedger, syncLedgerForDate, getLedgerForUser, getLedgerForDate, getLedgerForUserRange };
