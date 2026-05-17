/**
 * Helper for penaltyLedger — check if a date is a day off (Sunday or holiday)
 * Extracted to avoid circular dependency with deadline-checker
 */
const db = require('../db/pool');

let _holidayCache = null;
let _holidayCacheTime = 0;

async function isDayOff(dateStr) {
    // Load holidays (cache 1 hour)
    const now = Date.now();
    if (!_holidayCache || now - _holidayCacheTime > 3600000) {
        const rows = await db.all("SELECT holiday_date::text as d FROM holidays");
        _holidayCache = new Set(rows.map(r => r.d));
        _holidayCacheTime = now;
    }
    const d = new Date(dateStr + 'T00:00:00Z');
    if (d.getUTCDay() === 0) return true; // Chủ nhật
    return _holidayCache.has(dateStr);
}

module.exports = { isDayOff };
