/**
 * WORKING DAY UTILITIES
 * Shared helpers for calculating next working days
 * Used by: deadline-checker.js, customers_part2.js (pin feature), affiliateAccount.js
 *
 * ★ TIMEZONE-SAFE: Uses Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh'})
 *   to always get correct VN date regardless of server timezone (UTC or UTC+7).
 *   Callers should pass `new Date()` — NO `Date.now() + 7*3600000` needed.
 */
const db = require('../db/pool');

let _holidayCache = null;
let _holidayCacheTime = 0;

// Lấy danh sách ngày lễ (cache 1 giờ)
async function getHolidays() {
    const now = Date.now();
    if (_holidayCache && now - _holidayCacheTime < 3600000) return _holidayCache;
    const rows = await db.all("SELECT holiday_date::text as d FROM holidays");
    _holidayCache = new Set(rows.map(r => r.d));
    _holidayCacheTime = now;
    return _holidayCache;
}

let _leaveCache = null;
let _leaveCacheTime = 0;

function clearLeaveCache() {
    _leaveCache = null;
    _leaveCacheTime = 0;
}

// Kiểm tra user có nghỉ ngày X không
async function isUserOnLeave(userId, dateStr) {
    const now = Date.now();
    if (_leaveCache && now - _leaveCacheTime < 300000) {
        const list = _leaveCache.get(userId);
        if (!list) return false;
        return list.some(lr => dateStr >= lr.date_from && dateStr <= lr.date_to);
    }

    try {
        const rows = await db.all(`
            SELECT user_id, date_from::text as date_from, date_to::text as date_to FROM leave_requests WHERE status = 'active'
            UNION ALL
            SELECT user_id, off_date::text as date_from, off_date::text as date_to FROM staff_off_dates WHERE type = 'off' OR type IS NULL
        `);
        const map = new Map();
        for (const r of rows) {
            if (!map.has(r.user_id)) map.set(r.user_id, []);
            map.get(r.user_id).push(r);
        }
        _leaveCache = map;
        _leaveCacheTime = now;

        const list = _leaveCache.get(userId);
        if (!list) return false;
        return list.some(lr => dateStr >= lr.date_from && dateStr <= lr.date_to);
    } catch(e) {
        const leave = await db.get(
            `SELECT id FROM leave_requests WHERE user_id = $1 AND status = 'active' AND date_from <= $2 AND date_to >= $2
             UNION ALL
             SELECT id FROM staff_off_dates WHERE user_id = $1 AND off_date = $2 AND (type = 'off' OR type IS NULL) LIMIT 1`,
            [userId, dateStr]
        );
        return !!leave;
    }
}

/**
 * ★ TIMEZONE-SAFE: Trả về ngày VN (YYYY-MM-DD) từ bất kỳ Date object nào
 * Luôn chính xác bất kể server chạy UTC hay UTC+7
 */
function toDateStr(d) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
}

/**
 * ★ TIMEZONE-SAFE: Lấy ngày VN hôm nay (YYYY-MM-DD)
 */
function getVNToday() {
    return toDateStr(new Date());
}

/**
 * Tính ngày làm việc tiếp theo (bỏ qua CN, lễ, nghỉ phép NV)
 * ★ Caller chỉ cần truyền new Date() — KHÔNG cần Date.now() + 7h
 * @param {Date} startDate - Ngày bắt đầu (sẽ tính từ ngày SAU startDate theo VN timezone)
 * @param {number|null} userId - User cần check nghỉ phép
 * @returns {string} - YYYY-MM-DD ngày làm việc tiếp theo
 */
async function getNextWorkingDay(startDate, userId) {
    const holidays = await getHolidays();
    // Get VN date string then parse → use UTC methods to avoid any timezone drift
    const vnDateStr = toDateStr(startDate instanceof Date ? startDate : new Date());
    const [y, m, day] = vnDateStr.split('-').map(Number);

    // Load pancake_settings to check Sunday duty
    let sundayDutySchedule = {};
    if (userId) {
        try {
            const configRow = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
            if (configRow?.value) {
                const config = typeof configRow.value === 'string' ? JSON.parse(configRow.value) : configRow.value;
                sundayDutySchedule = config.sunday_duty_schedule || {};
            }
        } catch (e) {
            console.error('[getNextWorkingDay] Error loading pancake settings:', e.message);
        }
    }

    // Use UTC to avoid local timezone shifting during date math
    let current = new Date(Date.UTC(y, m - 1, day + 1)); // tomorrow
    let maxIter = 30;
    while (maxIter-- > 0) {
        const ds = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`;
        const dayOfWeek = current.getUTCDay();
        
        let isWorkingDay = true;
        if (dayOfWeek === 0) {
            const assignedUsers = sundayDutySchedule[ds] || [];
            isWorkingDay = userId ? assignedUsers.includes(Number(userId)) : false;
        }

        const isHoliday = holidays.has(ds);
        const onLeave = userId ? await isUserOnLeave(userId, ds) : false;
        if (isWorkingDay && !isHoliday && !onLeave) return ds;
        current.setUTCDate(current.getUTCDate() + 1);
    }
    // Fallback: tomorrow
    return `${y}-${String(m).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;
}

/**
 * Tính ngày làm việc hiệu lực (dùng cho deadline-checker)
 * Nếu ngày gốc rơi vào CN/Lễ/NV nghỉ → dời tới ngày đi làm tiếp theo
 */
async function getEffectiveWorkingDay(originalDate, userId, holidays) {
    const vnDateStr = toDateStr(originalDate instanceof Date ? originalDate : new Date(originalDate));
    const [y, m, day] = vnDateStr.split('-').map(Number);
    
    // Load pancake_settings to check Sunday duty
    let sundayDutySchedule = {};
    if (userId) {
        try {
            const configRow = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
            if (configRow?.value) {
                const config = typeof configRow.value === 'string' ? JSON.parse(configRow.value) : configRow.value;
                sundayDutySchedule = config.sunday_duty_schedule || {};
            }
        } catch (e) {
            console.error('[getEffectiveWorkingDay] Error loading pancake settings:', e.message);
        }
    }

    let current = new Date(Date.UTC(y, m - 1, day));
    let maxIter = 30;
    while (maxIter-- > 0) {
        const ds = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`;
        const dayOfWeek = current.getUTCDay();
        
        let isWorkingDay = true;
        if (dayOfWeek === 0) {
            const assignedUsers = sundayDutySchedule[ds] || [];
            isWorkingDay = userId ? assignedUsers.includes(Number(userId)) : false;
        }

        const isHoliday = holidays.has(ds);
        const onLeave = userId ? await isUserOnLeave(userId, ds) : false;
        if (isWorkingDay && !isHoliday && !onLeave) return ds;
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return vnDateStr;
}

/**
 * ★ TIMEZONE-SAFE: Lấy giờ VN hiện tại (0-23)
 */
function getVNHour() {
    return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(new Date()));
}

/**
 * ★ TIMEZONE-SAFE: Lấy thông tin thời gian VN hiện tại (giờ, phút, thứ)
 * @returns {{ hour: number, minute: number, dayOfWeek: number }} dayOfWeek: 0=CN, 1=T2, ..., 6=T7
 */
function getVNTimeInfo() {
    const now = new Date();
    const hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false }).format(now));
    const minute = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', minute: 'numeric' }).format(now));
    // Get VN day of week: parse VN date string → create Date → getDay()
    const vnDateStr = toDateStr(now);
    const [y, m, d] = vnDateStr.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=CN, 6=T7
    return { hour, minute, dayOfWeek };
}

/**
 * Tính ngày chăm sóc tiếp theo (dựa trên lịch nhận lead và xoay vòng chăm sóc)
 * @param {Date} startDate - Ngày bắt đầu
 * @param {number|null} userId - ID nhân viên
 * @returns {string} - YYYY-MM-DD ngày chăm sóc tiếp theo
 */
async function getNextFollowUpDate(startDate, userId) {
    const configRow = await db.get("SELECT value FROM app_config WHERE key = 'pancake_settings'");
    let globalWorkingDays = {};
    if (configRow && configRow.value) {
        try {
            const config = typeof configRow.value === 'string' ? JSON.parse(configRow.value) : configRow.value;
            globalWorkingDays = config.global_working_days || {};
        } catch (e) {
            console.error('[getNextFollowUpDate] Parse pancake_settings error:', e.message);
        }
    }

    let workingDays = [0, 1, 3, 4, 6]; // Default lead-receiving days: CN, T2, T4, T5, T7
    if (userId && globalWorkingDays[userId] !== undefined) {
        workingDays = globalWorkingDays[userId].map(Number);
    }
    const careDays = [1, 2, 3, 4, 5, 6].filter(d => !workingDays.includes(d));

    // Fallback: if no care days defined (e.g. working 7 days/week), use next working day
    if (careDays.length === 0) {
        return getNextWorkingDay(startDate, userId);
    }

    const holidays = await getHolidays();
    const vnDateStr = toDateStr(startDate instanceof Date ? startDate : new Date());
    const [y, m, day] = vnDateStr.split('-').map(Number);
    
    // Find first care day in the future
    let current = new Date(Date.UTC(y, m - 1, day + 1));
    let maxIter = 30;
    while (maxIter-- > 0) {
        const ds = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`;
        const dayOfWeek = current.getUTCDay(); // 0 = CN, 1 = T2, etc.
        const isHoliday = holidays.has(ds);
        const onLeave = userId ? await isUserOnLeave(userId, ds) : false;

        if (careDays.includes(dayOfWeek) && !isHoliday && !onLeave) {
            return ds;
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }

    // Fallback
    return getNextWorkingDay(startDate, userId);
}

/**
 * Lấy mốc giờ chuyển ngày (cutoff time) động dựa theo cấu hình Nhắc Xử Lý Số — Khung Giờ Hoạt Động
 * @param {Date} startDate - Ngày cần check
 * @returns {Promise<string>} - Chuỗi dạng "HH:MM" (vd: "18:15" hoặc "17:15")
 */
async function getDynamicCutoffTime(startDate) {
    const d = startDate instanceof Date ? startDate : new Date();
    const vnDateStr = toDateStr(d);
    const [y, m, day] = vnDateStr.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay(); // 0 = CN, 1 = T2, ..., 6 = T7

    let configKey = 'reminder_hours_weekday';
    let defaultCutoff = '18:15';

    if (dow === 0) {
        configKey = 'reminder_hours_sunday';
        defaultCutoff = '17:15';
    } else if (dow === 6) {
        configKey = 'reminder_hours_saturday';
        defaultCutoff = '17:15';
    }

    try {
        const row = await db.get("SELECT value FROM app_config WHERE key = $1", [configKey]);
        if (row && row.value && row.value.trim().toLowerCase() !== 'off') {
            try {
                const parsed = JSON.parse(row.value);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const slots = parsed.map(slot => {
                        const [eh, em] = (slot.end || '00:00').split(':').map(Number);
                        return { raw: slot.end || '00:00', minutes: eh * 60 + em };
                    });
                    slots.sort((a, b) => a.minutes - b.minutes);
                    return slots[slots.length - 1].raw;
                }
            } catch (jsonErr) {
                const parts = row.value.trim().split('-');
                if (parts.length === 2) {
                    return parts[1];
                }
            }
        }
    } catch (e) {
        console.error('[Dynamic Cutoff] Error parsing config:', e.message);
    }
    return defaultCutoff;
}

module.exports = {
    getHolidays,
    isUserOnLeave,
    toDateStr,
    getVNToday,
    getVNHour,
    getVNTimeInfo,
    getNextWorkingDay,
    getEffectiveWorkingDay,
    getNextFollowUpDate,
    getDynamicCutoffTime,
    clearLeaveCache
};
