// ========== NHẮC XỬ LÝ — Cron Job mỗi 1 phút ==========
// 4 loại: Chuyển Số + Gửi Lại | Cấp Cứu Sếp | Hủy Khách | Hủy Đơn Trả Cọc
// Phút nhắc lấy từ app_config (configurable qua Settings UI)

const db = require('../db/pool');
const { notifyTelegram } = require('../utils/telegram');
const { getVNTimeInfo, getVNToday, getHolidays, isUserOnLeave } = require('../utils/workingDay');

// ========== ANTI-SPAM: Track last reminder per type+staff ==========
const _lastReminded = new Map(); // "type:userId" → timestamp

// ========== CONFIG KEYS ==========
const CONFIG_KEYS = {
    weekday:  'reminder_hours_weekday',
    saturday: 'reminder_hours_saturday',
    sunday:   'reminder_hours_sunday'
};

const DEFAULTS = {
    weekday:  '08:00-18:15',
    saturday: '08:00-17:15',
    sunday:   'off'
};

// Default minutes if not configured
const DEFAULT_MINUTES = {
    chuyen_so: 5,
    cap_cuu_sep: 10,
    huy_khach: 15,
    huy_don: 15
};

/**
 * Parse time slots — supports both formats:
 *   OLD: "08:00-18:15" → [{ start: 480, end: 1095 }]
 *   NEW: [{"start":"08:00","end":"11:30"},{"start":"13:30","end":"17:30"}]
 *   OFF: "off" or null → []
 */
function parseTimeSlots(value) {
    if (!value || value.trim().toLowerCase() === 'off') return [];

    // Try JSON array first (new format)
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return parsed.map(slot => {
                const [sh, sm] = (slot.start || '00:00').split(':').map(Number);
                const [eh, em] = (slot.end || '23:59').split(':').map(Number);
                if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
                return { start: sh * 60 + sm, end: eh * 60 + em };
            }).filter(Boolean);
        }
    } catch (e) { /* not JSON, try old format */ }

    // Old format: "HH:MM-HH:MM"
    const parts = value.trim().split('-');
    if (parts.length !== 2) return [];
    const [startStr, endStr] = parts;
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return [];
    return [{ start: sh * 60 + sm, end: eh * 60 + em }];
}

async function isWithinReminderHours() {
    const vnTime = getVNTimeInfo();
    const currentMinutes = vnTime.hour * 60 + vnTime.minute;
    const dow = vnTime.dayOfWeek;

    let configKey, defaultVal;
    if (dow === 0) { configKey = CONFIG_KEYS.sunday; defaultVal = DEFAULTS.sunday; }
    else if (dow === 6) { configKey = CONFIG_KEYS.saturday; defaultVal = DEFAULTS.saturday; }
    else { configKey = CONFIG_KEYS.weekday; defaultVal = DEFAULTS.weekday; }

    let value = defaultVal;
    try {
        const row = await db.get("SELECT value FROM app_config WHERE key = $1", [configKey]);
        if (row?.value) value = row.value;
    } catch (e) { /* use default */ }

    const slots = parseTimeSlots(value);
    if (slots.length === 0) return false;
    // Check if current time is within ANY active slot
    return slots.some(slot => currentMinutes >= slot.start && currentMinutes <= slot.end);
}

async function isUserWorkingToday(userId, dateStr) {
    try {
        const user = await db.get("SELECT status FROM users WHERE id = $1", [userId]);
        if (!user || user.status !== 'active') return false;

        const holidays = await getHolidays();
        if (holidays.has(dateStr)) return false;

        const onLeave = await isUserOnLeave(userId, dateStr);
        if (onLeave) return false;

        const [y, m, d] = dateStr.split('-').map(Number);
        const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = CN, 1 = T2, etc.

        let globalWorkingDays = {};
        let config = {};
        const configRow = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
        if (configRow?.value) {
            config = typeof configRow.value === 'string' ? JSON.parse(configRow.value) : configRow.value;
            globalWorkingDays = config.global_working_days || {};
        }

        if (dayOfWeek === 0) {
            const schedule = config.sunday_duty_schedule || {};
            const assignedUsers = schedule[dateStr] || [];
            return assignedUsers.includes(Number(userId));
        }

        let workingDays = [1, 2, 3, 4, 5, 6]; // default Mon-Sat
        if (globalWorkingDays[userId] !== undefined) {
            workingDays = globalWorkingDays[userId].map(Number).filter(x => x !== 0);
        }
        return workingDays.includes(dayOfWeek);
    } catch (err) {
        console.error('[Reminder Working Day Check] Error:', err.message);
        return false;
    }
}

/**
 * Load configurable reminder minutes from app_config
 */
async function getMinutes() {
    const mins = { ...DEFAULT_MINUTES };
    try {
        const rows = await db.all("SELECT key, value FROM app_config WHERE key LIKE 'reminder_minutes_%'");
        for (const r of rows) {
            const k = r.key.replace('reminder_minutes_', '');
            mins[k] = Math.max(1, Number(r.value) || DEFAULT_MINUTES[k] || 5);
        }
    } catch (e) { /* use defaults */ }
    return mins;
}

const crmLabels = {
    nhu_cau: 'Chăm Sóc KH Nhu Cầu',
    ctv: 'Chăm Sóc CTV',
    ctv_hoa_hong: 'Chăm Sóc Affiliate',
    koc_tiktok: 'Chăm Sóc KOL/KOC Tiktok',
    sale: 'Chăm Sóc Khách Sale'
};

/**
 * Build customer code: STT-dd-mm-Yyy
 */
function buildCode(row) {
    if (!row.daily_order_number || !row.effective_date) return '?';
    const ed = new Date(row.effective_date);
    const d = ed.getDate(), m = ed.getMonth() + 1;
    const y = 'Y' + String(ed.getFullYear()).slice(-2);
    return `${row.daily_order_number}-${d}-${m}-${y}`;
}

// ========== CHECK 1: Chuyển Số + Gửi Lại ==========
async function checkChuyenSo(today, mins) {
    const interval = `${mins.chuyen_so} minutes`;
    const unprocessed = await db.all(`
        SELECT c.id, c.customer_name, c.phone, c.crm_type, c.assigned_to_id,
               c.daily_order_number, c.effective_date, c.appointment_date,
               c.created_at, c.updated_at, c.notes,
               u.full_name as staff_name,
               s.name as source_name,
               p.name as promo_name,
               ind.name as industry_name
        FROM customers c
        LEFT JOIN users u ON u.id = c.assigned_to_id
        LEFT JOIN settings_sources s ON s.id = c.source_id
        LEFT JOIN settings_promotions p ON p.id = c.promotion_id
        LEFT JOIN settings_industries ind ON ind.id = c.industry_id
        WHERE (
            (c.effective_date = $1::date AND c.created_at::date = $1::date AND c.created_at <= NOW() - INTERVAL '${interval}')
            OR
            (c.appointment_date::date = $1::date AND c.updated_at <= NOW() - INTERVAL '${interval}')
            OR
            (c.created_at::date = $1::date AND c.effective_date != $1::date AND c.created_at <= NOW() - INTERVAL '${interval}')
        )
        AND NOT EXISTS (
            SELECT 1 FROM consultation_logs cl
            WHERE cl.customer_id = c.id
            AND cl.created_at >= LEAST(c.created_at, COALESCE(c.updated_at, c.created_at)) - INTERVAL '1 minute'
            AND cl.log_type NOT IN ('khong_xu_ly', 'chuyen_doi_crm', 'tao_tk_affiliate', 'gui_lai_so')
            AND cl.content NOT LIKE '%Pancake%'
            AND cl.content NOT LIKE '%Đồng bộ%'
        )
        AND c.assigned_to_id IS NOT NULL
        ORDER BY c.assigned_to_id, c.daily_order_number
    `, [today]);

    if (unprocessed.length === 0) return;

    const now = Date.now();
    const cooldownMs = mins.chuyen_so * 60 * 1000;

    for (const row of unprocessed) {
        const userId = row.assigned_to_id;
        const isWorking = await isUserWorkingToday(userId, today);
        if (!isWorking) continue;

        const cacheKey = `chuyen_so:${userId}:${row.id}`;
        const lastTime = _lastReminded.get(cacheKey) || 0;
        if (now - lastTime < cooldownMs) continue;

        const isResend = row.appointment_date === today && row.effective_date !== today;
        const code = buildCode(row);

        const hasPhone = row.phone && !row.phone.startsWith('pancake_') && row.phone !== 'Chưa có SĐT' && row.phone !== 'N/A';
        const phonePart = hasPhone ? ` - <code>${row.phone}</code>` : '';
        const tgParts = [`⏰ Xử lí số : <b>${code}</b> : <code>${row.customer_name || '?'}</code>${phonePart}`];
        if (row.source_name) tgParts.push(row.source_name);
        if (row.promo_name) tgParts.push(row.promo_name);
        if (row.industry_name) tgParts.push(row.industry_name);
        let msg = tgParts.join(' - ');
        if (row.notes && row.notes.trim()) {
            msg += ` - 💬 ${row.notes.trim()}`;
        }
        if (isResend) {
            msg += ' (Gửi Lại)';
        }

        notifyTelegram(Number(userId), 'chuyen_so', msg);
        _lastReminded.set(cacheKey, now);
        console.log(`[Reminder] ⏰ Nhắc Chuyển Số riêng: ${row.staff_name} (id=${userId}) - khách: ${row.customer_name} (${code})`);
    }
}

// ========== CHECK 2: Cấp Cứu Sếp ==========
async function checkCapCuuSep(today, mins) {
    const interval = `${mins.cap_cuu_sep} minutes`;
    const pending = await db.all(`
        SELECT e.id, e.customer_id, e.reason, e.requested_by, e.handler_id, e.created_at,
               c.customer_name, c.phone,
               u_req.full_name as requester_name,
               u_handler.full_name as handler_name,
               u_handler.role as handler_role
        FROM emergencies e
        LEFT JOIN customers c ON c.id = e.customer_id
        LEFT JOIN users u_req ON u_req.id = e.requested_by
        LEFT JOIN users u_handler ON u_handler.id = e.handler_id
        WHERE e.status = 'pending'
        AND e.created_at <= NOW() - INTERVAL '${interval}'
        AND e.created_at::date = $1::date
    `, [today]);

    if (pending.length === 0) return;

    const now = Date.now();
    const cooldownMs = mins.cap_cuu_sep * 60 * 1000;

    // Role labels
    const roleLabels = {
        giam_doc: 'GIÁM ĐỐC',
        quan_ly: 'QUẢN LÝ',
        quan_ly_cap_cao: 'QUẢN LÝ CẤP CAO',
        truong_phong: 'TRƯỞNG PHÒNG'
    };

    // Group by handler role
    const grouped = {};
    for (const em of pending) {
        const role = em.handler_role || 'giam_doc';
        if (!grouped[role]) grouped[role] = [];
        grouped[role].push(em);
    }

    const [yy, mm, dd] = today.split('-').map(Number);

    for (const [role, items] of Object.entries(grouped)) {
        const cacheKey = `cap_cuu_sep:${role}`;
        const lastTime = _lastReminded.get(cacheKey) || 0;
        if (now - lastTime < cooldownMs) continue;

        // Build STT for each emergency
        const lines = [];
        for (const em of items) {
            const origCount = await db.get(
                "SELECT COUNT(*) as cnt FROM emergencies WHERE created_at::date = $1::date AND id <= $2",
                [today, em.id]
            );
            const stt = Number(origCount?.cnt) || 1;
            const code = `${stt}-${dd}-${mm}-Y${String(yy).slice(-2)}`;
            lines.push(`🚨 <b>${code}</b> : <code>${em.customer_name || '?'}</code> — ${em.requester_name || '?'}`);
        }

        const label = roleLabels[role] || role.toUpperCase();
        const msg = `⏰ <b>NHẮC CẤP CỨU SẾP CHƯA XỬ LÝ : ${label}</b>\n\n` +
            `Có <b>${items.length} cấp cứu</b> chưa xử lý:\n\n` +
            lines.join('\n') +
            `\n\n⚡ <b>Xử lý ngay!</b>`;

        notifyTelegram(null, 'cap_cuu_sep', msg);
        _lastReminded.set(cacheKey, now);
        console.log(`[Reminder] 🚨 Nhắc Cấp Cứu Sếp (${label}): ${items.length} chưa xử lý`);
    }
}

// ========== CHECK 3: Hủy Khách ==========
async function checkHuyKhach(today, mins) {
    const interval = `${mins.huy_khach} minutes`;
    const pending = await db.all(`
        SELECT c.id, c.customer_name, c.phone, c.cancel_reason, c.cancel_requested_at,
               u.full_name as requester_name
        FROM customers c
        LEFT JOIN users u ON u.id = c.cancel_requested_by
        WHERE c.order_status = 'cho_duyet_huy'
        AND c.cancel_requested_at IS NOT NULL
        AND c.cancel_requested_at::timestamptz <= NOW() - INTERVAL '${interval}'
    `);

    if (pending.length === 0) return;

    const now = Date.now();
    const cooldownMs = mins.huy_khach * 60 * 1000;
    const cacheKey = 'huy_khach:global';
    const lastTime = _lastReminded.get(cacheKey) || 0;
    if (now - lastTime < cooldownMs) return;

    const lines = pending.map((c, i) => {
        return `❌ <b>${i + 1}.</b> <code>${c.customer_name || '?'}</code> — ${c.requester_name || '?'}`;
    });

    const msg = `⏰ <b>NHẮC DUYỆT HỦY KHÁCH</b>\n\n` +
        `Có <b>${pending.length} khách</b> chờ duyệt hủy:\n\n` +
        lines.join('\n') +
        `\n\n⚡ <b>Duyệt hoặc từ chối ngay!</b>`;

    notifyTelegram(null, 'huy_khach', msg);
    _lastReminded.set(cacheKey, now);
    console.log(`[Reminder] ❌ Nhắc Hủy Khách: ${pending.length} chờ duyệt`);
}

// ========== CHECK 4: Hủy Đơn Trả Cọc ==========
async function checkHuyDon(today, mins) {
    const interval = `${mins.huy_don} minutes`;
    const pending = await db.all(`
        SELECT c.id, c.customer_name, c.phone, c.cancel_reason, c.cancel_requested_at,
               u.full_name as requester_name
        FROM customers c
        LEFT JOIN users u ON u.id = c.cancel_requested_by
        WHERE c.order_status = 'cho_duyet_huy_don'
        AND c.cancel_requested_at IS NOT NULL
        AND c.cancel_requested_at::timestamptz <= NOW() - INTERVAL '${interval}'
    `);

    if (pending.length === 0) return;

    const now = Date.now();
    const cooldownMs = mins.huy_don * 60 * 1000;
    const cacheKey = 'huy_don:global';
    const lastTime = _lastReminded.get(cacheKey) || 0;
    if (now - lastTime < cooldownMs) return;

    const lines = pending.map((c, i) => {
        return `🚫 <b>${i + 1}.</b> <code>${c.customer_name || '?'}</code> — ${c.requester_name || '?'}`;
    });

    const msg = `⏰ <b>NHẮC DUYỆT HỦY ĐƠN TRẢ CỌC</b>\n\n` +
        `Có <b>${pending.length} đơn</b> chờ duyệt hủy:\n\n` +
        lines.join('\n') +
        `\n\n⚡ <b>Duyệt hoặc từ chối ngay!</b>`;

    notifyTelegram(null, 'huy_don_tra_coc', msg);
    _lastReminded.set(cacheKey, now);
    console.log(`[Reminder] 🚫 Nhắc Hủy Đơn Trả Cọc: ${pending.length} chờ duyệt`);
}

// ========== MAIN ==========
async function checkAndRemind() {
    try {
        const inHours = await isWithinReminderHours();
        if (!inHours) return;

        const today = getVNToday();
        const mins = await getMinutes();

        // Run all 4 checks in parallel
        await Promise.all([
            checkChuyenSo(today, mins),
            checkCapCuuSep(today, mins),
            checkHuyKhach(today, mins),
            checkHuyDon(today, mins)
        ]);

    } catch (err) {
        console.error('[Reminder] ❌ Error:', err.message);
    }
}

function startReminderChecker() {
    console.log('[Reminder] ✅ Cron nhắc nhở đã khởi động (mỗi 1 phút) — 4 loại');
    setTimeout(() => checkAndRemind(), 10000);
    setInterval(() => checkAndRemind(), 60 * 1000);
}

module.exports = { startReminderChecker, isWithinReminderHours };
