/**
 * Vietnam Timezone Utility — utils/timezone.js
 * ===============================================
 * Cách dùng:
 *   const { vnNow, vnFormat, vnISOString } = require('../utils/timezone');
 * 
 *   vnNow()           → Date object ở giờ VN
 *   vnFormat(date)     → "00:35 12/05/2026"
 *   vnISOString(date)  → "2026-05-12T00:35:00"  (local VN, không có Z)
 *   vnDateStr(date)    → "2026-05-12"
 *   vnTimeStr(date)    → "00:35"
 */

const TZ = 'Asia/Ho_Chi_Minh';

/**
 * Get current time as a Date object adjusted to VN timezone
 */
function vnNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

/**
 * Format a Date to Vietnamese display string: "HH:mm dd/MM/yyyy"
 * @param {Date|string} date
 * @returns {string}
 */
function vnFormat(date) {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleString('vi-VN', {
        timeZone: TZ,
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/**
 * Convert a Date to VN local ISO string: "YYYY-MM-DDTHH:mm"
 * (No trailing Z — this is LOCAL VN time)
 * @param {Date|string} date
 * @returns {string}
 */
function vnISOString(date) {
    const d = date ? new Date(date) : new Date();
    const vn = new Date(d.toLocaleString('en-US', { timeZone: TZ }));
    const Y = vn.getFullYear();
    const M = String(vn.getMonth() + 1).padStart(2, '0');
    const D = String(vn.getDate()).padStart(2, '0');
    const h = String(vn.getHours()).padStart(2, '0');
    const m = String(vn.getMinutes()).padStart(2, '0');
    return `${Y}-${M}-${D}T${h}:${m}`;
}

/**
 * Get VN date string: "YYYY-MM-DD"
 * @param {Date|string} [date]
 * @returns {string}
 */
function vnDateStr(date) {
    return vnISOString(date).slice(0, 10);
}

/**
 * Get VN time string: "HH:mm"
 * @param {Date|string} [date]
 * @returns {string}
 */
function vnTimeStr(date) {
    return vnISOString(date).slice(11, 16);
}

module.exports = { TZ, vnNow, vnFormat, vnISOString, vnDateStr, vnTimeStr };
