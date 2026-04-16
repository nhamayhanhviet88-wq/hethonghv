/**
 * WORKING DAY UTILITIES
 * Shared helpers for calculating next working days
 * Used by: deadline-checker.js, customers_part2.js (pin feature)
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

// Format date → YYYY-MM-DD
function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Tính ngày làm việc tiếp theo (bỏ qua CN, lễ, nghỉ phép NV)
 * @param {Date} startDate - Ngày bắt đầu (sẽ tính từ ngày sau startDate)
 * @param {number|null} userId - User cần check nghỉ phép
 * @returns {string} - YYYY-MM-DD ngày làm việc tiếp theo
 */
async function getNextWorkingDay(startDate, userId) {
    const holidays = await getHolidays();
    let d = new Date(startDate);
    d.setDate(d.getDate() + 1); // Bắt đầu từ ngày mai
    let maxIter = 30;
    while (maxIter-- > 0) {
        const ds = toDateStr(d);
        const isSunday = d.getDay() === 0;
        const isHoliday = holidays.has(ds);
        const onLeave = userId ? await isUserOnLeave(userId, ds) : false;
        if (!isSunday && !isHoliday && !onLeave) return ds;
        d.setDate(d.getDate() + 1);
    }
    return toDateStr(new Date(startDate.getTime() + 86400000)); // Fallback: tomorrow
}

/**
 * Tính ngày làm việc hiệu lực (dùng cho deadline-checker)
 * Nếu ngày gốc rơi vào CN/Lễ/NV nghỉ → dời tới ngày đi làm tiếp theo
 */
async function getEffectiveWorkingDay(originalDate, userId, holidays) {
    let d = new Date(originalDate);
    let maxIter = 30;
    while (maxIter-- > 0) {
        const ds = toDateStr(d);
        const isSunday = d.getDay() === 0;
        const isHoliday = holidays.has(ds);
        const onLeave = userId ? await isUserOnLeave(userId, ds) : false;
        if (!isSunday && !isHoliday && !onLeave) return ds;
        d.setDate(d.getDate() + 1);
    }
    return toDateStr(originalDate);
}

module.exports = {
    getHolidays,
    isUserOnLeave,
    toDateStr,
    getNextWorkingDay,
    getEffectiveWorkingDay
};
