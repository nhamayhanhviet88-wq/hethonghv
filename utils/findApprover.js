/**
 * findActiveApprover — Tìm người duyệt hợp lệ theo hierarchy
 * 
 * Dùng cho: CV Điểm, CV Khóa, CV Chuỗi
 * Logic: Leo từ dept NV → parent → grandparent...
 * Filter: 
 *   - user.status = 'active' (loại test_hidden, resigned...)
 *   - user.role != 'giam_doc' (GĐ không bao giờ nhận trực tiếp)
 *   - user_id != excludeUserId (không tự duyệt chính mình)
 */
const db = require('../db/pool');

async function findActiveApprover(excludeUserId, startDeptId) {
    let lookupDeptId = startDeptId;
    const visited = new Set();
    while (lookupDeptId && !visited.has(lookupDeptId)) {
        visited.add(lookupDeptId);
        const approver = await db.get(
            `SELECT ta.user_id FROM task_approvers ta
             JOIN users u ON ta.user_id = u.id
             WHERE ta.department_id = $1 AND ta.user_id != $2
               AND u.status = 'active' AND u.role != 'giam_doc'
             LIMIT 1`,
            [lookupDeptId, excludeUserId]
        );
        if (approver) return approver.user_id;
        const dept = await db.get('SELECT parent_id FROM departments WHERE id = $1', [lookupDeptId]);
        lookupDeptId = dept ? dept.parent_id : null;
    }
    return null;
}

/**
 * Kiểm tra manager có miễn phạt không
 * Chỉ Giám Đốc không bao giờ bị phạt/khóa
 * QLCC vẫn bị phạt khi được gán trực tiếp làm người duyệt
 */
const IMMUNE_ROLES = ['giam_doc'];


async function isManagerImmune(managerId) {
    if (!managerId) return true;
    const mgr = await db.get('SELECT role FROM users WHERE id = $1', [managerId]);
    return IMMUNE_ROLES.includes(mgr?.role);
}

module.exports = { findActiveApprover, isManagerImmune };
