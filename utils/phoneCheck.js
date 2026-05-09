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
 * Check if phone number is used by any INTERNAL USER (NV) in the system.
 * This remains a HARD BLOCK — SĐT NV nội bộ không được trùng.
 * @param {string} phone - Phone number to check
 * @param {object} exclude - Optional: { userId } to exclude current user during edit
 * @returns {null} if phone is available, or {string} error message if duplicate found
 */
async function checkPhoneUser(phone, exclude = {}) {
    if (!phone) return null;

    // Chỉ hard-block NV nội bộ. Đối tác (hoa_hong, tkaffiliate, ctv) KHÔNG block
    // vì SĐT CTV/Affiliate thường trùng với KH (đó chính là khách hàng)
    const internalRoles = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong', 'nhan_vien', 'thu_viec', 'part_time'];
    const rolePlaceholders = internalRoles.map((_, i) => `$${i + 2}`).join(',');

    let userQuery = `SELECT u.id, u.full_name, u.role, m.full_name as manager_name
        FROM users u LEFT JOIN users m ON m.id = u.managed_by_user_id
        WHERE u.phone = $1 AND u.role IN (${rolePlaceholders})`;
    const userParams = [phone, ...internalRoles];
    if (exclude.userId) {
        userQuery += ` AND u.id != $${userParams.length + 1}`;
        userParams.push(Number(exclude.userId));
    }
    const existingUser = await db.get(userQuery, userParams);
    if (existingUser) {
        const mgrPart = existingUser.manager_name ? `, quản lý bởi "${shortName(existingUser.manager_name)}"` : '';
        return `SĐT ${phone} đã thuộc về NV "${shortName(existingUser.full_name)}"${mgrPart}`;
    }
    return null;
}

/**
 * Check if phone number is used by any CUSTOMER in the system.
 * Returns WARNING info (not a blocker) — since UID-based system allows duplicate phones.
 * @param {string} phone - Phone number to check
 * @param {object} exclude - Optional: { customerId } to exclude current customer during edit
 * @returns {null} if no duplicate, or { warning, customer } with duplicate info
 */
async function checkPhoneCustomerWarning(phone, exclude = {}) {
    if (!phone) return null;

    let custQuery = `SELECT c.id, c.customer_uid, c.customer_name, c.phone, c.crm_type, c.order_status,
        c.daily_order_number, c.effective_date, c.assigned_to_id,
        u.full_name as assigned_to_name, u.telegram_group_id as assigned_telegram,
        d.name as dept_name
        FROM customers c 
        LEFT JOIN users u ON u.id = c.assigned_to_id
        LEFT JOIN departments d ON d.id = u.department_id
        WHERE c.phone = $1`;
    const custParams = [phone];
    if (exclude.customerId) {
        custQuery += ' AND c.id != $2';
        custParams.push(Number(exclude.customerId));
    }
    const existingCust = await db.get(custQuery, custParams);
    if (existingCust) {
        const mgrPart = existingCust.assigned_to_name ? `, quản lý bởi "${shortName(existingCust.assigned_to_name)}"` : '';
        let currentCode = '';
        if (existingCust.daily_order_number && existingCust.effective_date) {
            const ed = new Date(existingCust.effective_date);
            const d = ed.getDate(), m = ed.getMonth() + 1;
            const y = String(ed.getFullYear()).slice(-2);
            currentCode = `${existingCust.daily_order_number}-${d}-${m}-Y${y}`;
        }
        return {
            warning: `SĐT ${phone} đã thuộc về KH "${shortName(existingCust.customer_name)}"${mgrPart}`,
            customer: {
                id: existingCust.id,
                customer_uid: existingCust.customer_uid || '',
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
    return null;
}

/**
 * LEGACY WRAPPER — Maintains backward compatibility with existing callers.
 * Checks both users (BLOCK) and customers (WARNING with returnDetails, or BLOCK without).
 * 
 * NOTE: For new code, prefer using checkPhoneUser() + checkPhoneCustomerWarning() separately.
 */
async function checkPhoneDuplicate(phone, exclude = {}, options = {}) {
    if (!phone) return null;

    // Check users — still a hard block
    const userError = await checkPhoneUser(phone, exclude);
    if (userError) {
        if (options.returnDetails) return { error: userError, type: 'user', customer: null };
        return userError;
    }

    // Check customers — now returns warning info instead of blocking
    const custWarning = await checkPhoneCustomerWarning(phone, exclude);
    if (custWarning) {
        if (options.returnDetails) {
            return {
                error: custWarning.warning,
                type: 'customer',
                customer: custWarning.customer
            };
        }
        return custWarning.warning;
    }

    return null;
}

module.exports = { checkPhoneDuplicate, checkPhoneUser, checkPhoneCustomerWarning };
