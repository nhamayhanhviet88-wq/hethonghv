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
 * @param {object} options - Optional: { returnDetails: true } to return full duplicate info
 * @returns {null} if phone is available, or {string} error message if duplicate found (default)
 *          If returnDetails=true: returns { error, type: 'user'|'customer', customer: {...} } or null
 */
async function checkPhoneDuplicate(phone, exclude = {}, options = {}) {
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
        const error = `SĐT ${phone} đã thuộc về NV "${shortName(existingUser.full_name)}"${mgrPart}`;
        if (options.returnDetails) {
            return { error, type: 'user', customer: null };
        }
        return error;
    }

    // Check in customers table — also get managing employee name + full info
    let custQuery = `SELECT c.id, c.customer_name, c.phone, c.crm_type, c.order_status,
        c.daily_order_number, c.effective_date, c.assigned_to_id,
        u.full_name as assigned_to_name, u.telegram_group_id as assigned_telegram,
        d.name as dept_name
        FROM customers c 
        LEFT JOIN users u ON u.id = c.assigned_to_id
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE c.phone = ?`;
    const custParams = [phone];
    if (exclude.customerId) {
        custQuery += ' AND c.id != ?';
        custParams.push(Number(exclude.customerId));
    }
    const existingCust = await db.get(custQuery, custParams);
    if (existingCust) {
        const mgrPart = existingCust.assigned_to_name ? `, quản lý bởi "${shortName(existingCust.assigned_to_name)}"` : '';
        const error = `SĐT ${phone} đã thuộc về KH "${shortName(existingCust.customer_name)}"${mgrPart}`;
        if (options.returnDetails) {
            // Build current code from daily_order_number + effective_date
            let currentCode = '';
            if (existingCust.daily_order_number && existingCust.effective_date) {
                const ed = new Date(existingCust.effective_date);
                const d = ed.getDate(), m = ed.getMonth() + 1;
                const y = String(ed.getFullYear()).slice(-2);
                currentCode = `${existingCust.daily_order_number}-${d}-${m}-Y${y}`;
            }
            return {
                error,
                type: 'customer',
                customer: {
                    id: existingCust.id,
                    customer_name: existingCust.customer_name,
                    phone: existingCust.phone,
                    crm_type: existingCust.crm_type,
                    order_status: existingCust.order_status,
                    assigned_to_id: existingCust.assigned_to_id,
                    assigned_to_name: existingCust.assigned_to_name || '',
                    assigned_telegram: existingCust.assigned_telegram || '',
                    dept_name: existingCust.dept_name || '',
                    current_code: currentCode
                }
            };
        }
        return error;
    }

    return null; // phone is available
}

module.exports = { checkPhoneDuplicate };
