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

// Kiểm tra user có nghỉ ngày X không
async function isUserOnLeave(userId, dateStr) {
    const leave = await db.get(
        "SELECT id FROM leave_requests WHERE user_id = $1 AND status = 'active' AND date_from <= $2 AND date_to >= $2",
        [userId, dateStr]
    );
    return !!leave;
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
    // Use UTC to avoid local timezone shifting during date math
    let current = new Date(Date.UTC(y, m - 1, day + 1)); // tomorrow
    let maxIter = 30;
    while (maxIter-- > 0) {
        const ds = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`;
        const isSunday = current.getUTCDay() === 0;
        const isHoliday = holidays.has(ds);
        const onLeave = userId ? await isUserOnLeave(userId, ds) : false;
        if (!isSunday && !isHoliday && !onLeave) return ds;
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
    let current = new Date(Date.UTC(y, m - 1, day));
    let maxIter = 30;
    while (maxIter-- > 0) {
        const ds = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`;
        const isSunday = current.getUTCDay() === 0;
        const isHoliday = holidays.has(ds);
        const onLeave = userId ? await isUserOnLeave(userId, ds) : false;
        if (!isSunday && !isHoliday && !onLeave) return ds;
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

module.exports = {
    getHolidays,
    isUserOnLeave,
    toDateStr,
    getVNToday,
    getVNHour,
    getVNTimeInfo,
    getNextWorkingDay,
    getEffectiveWorkingDay
};
