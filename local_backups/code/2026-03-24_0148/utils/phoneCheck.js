const db = require('../db/pool');

/**
 * Get short name (last word) from full name.
 * E.g., "Lê Việt Trinh" → "Trinh"
 */
function shortName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1];
}

/**
 * Check if phone number is already used by any user or customer in the system.
 * @param {string} phone - Phone number to check
 * @param {object} exclude - Optional: { userId, customerId } to exclude current record during edit
 * @returns {null} if phone is available, or {string} error message if duplicate found
 */
async function checkPhoneDuplicate(phone, exclude = {}) {
    if (!phone) return null; // empty phone is allowed

    // Check in users table — also get managing employee name
    let userQuery = `SELECT u.id, u.full_name, u.role, m.full_name as manager_name
        FROM users u LEFT JOIN users m ON m.id = u.managed_by_user_id
        WHERE u.phone = ?`;
    const userParams = [phone];
    if (exclude.userId) {
        userQuery += ' AND u.id != ?';
        userParams.push(Number(exclude.userId));
    }
    const existingUser = await db.get(userQuery, userParams);
    if (existingUser) {
        const mgrPart = existingUser.manager_name ? `, quản lý bởi "${shortName(existingUser.manager_name)}"` : '';
        return `SĐT ${phone} đã thuộc về NV "${shortName(existingUser.full_name)}"${mgrPart}`;
    }

    // Check in customers table — also get managing employee name
    let custQuery = `SELECT c.id, c.customer_name, u.full_name as manager_name
        FROM customers c LEFT JOIN users u ON u.id = c.assigned_to_id
        WHERE c.phone = ?`;
    const custParams = [phone];
    if (exclude.customerId) {
        custQuery += ' AND c.id != ?';
        custParams.push(Number(exclude.customerId));
    }
    const existingCust = await db.get(custQuery, custParams);
    if (existingCust) {
        const mgrPart = existingCust.manager_name ? `, quản lý bởi "${shortName(existingCust.manager_name)}"` : '';
        return `SĐT ${phone} đã thuộc về KH "${shortName(existingCust.customer_name)}"${mgrPart}`;
    }

    return null; // phone is available
}

module.exports = { checkPhoneDuplicate };
