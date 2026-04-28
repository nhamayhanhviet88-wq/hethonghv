// ========== SIDEBAR UTILS — Shared across all modules ==========
// Source of Truth for role-based access control on the frontend.
// All sidebar modules MUST use these functions to ensure consistency.
//
// ┌─────────┬─────────────────┬──────────────────────┬────────────────┐
// │ Role    │ Default View    │ Dept Tree Visible    │ Add/Delete     │
// ├─────────┼─────────────────┼──────────────────────┼────────────────┤
// │ GĐ      │ Tổng (all)      │ Tất cả               │ ✅ Luôn có     │
// │ QLCC    │ Chính mình      │ Root system mình     │ Chỉ khi xem mình │
// │ QL      │ Chính mình      │ Phòng mình + con     │ Chỉ khi xem mình │
// │ TP      │ Chính mình      │ Team mình + con      │ Chỉ khi xem mình │
// │ NV      │ Chính mình      │ Ẩn sidebar           │ Chỉ chính mình │
// └─────────┴─────────────────┴──────────────────────┴────────────────┘
//
// Sorting: Within each team/dept, leadership appears first:
//   QLCC(1) → QL(2) → TP(3) → NV(99) → Thu Việc(100) → Part-time(101)

// ===== 1. SORT: Leadership roles appear first in member lists =====
const _SIDEBAR_ROLE_PRIORITY = {
    quan_ly_cap_cao: 1,
    quan_ly: 2,
    truong_phong: 3,
    nhan_vien: 99,
    thu_viec: 100,
    part_time: 101
};

/**
 * Sort members array: leadership roles first, then alphabetically by name.
 * Returns a NEW sorted array (does not mutate original).
 * @param {Array} members - [{id, full_name, role, ...}]
 * @returns {Array} sorted copy
 */
function _sidebarSortMembers(members) {
    if (!members || !Array.isArray(members)) return [];
    return [...members].sort((a, b) => {
        const pa = _SIDEBAR_ROLE_PRIORITY[a.role] ?? 50;
        const pb = _SIDEBAR_ROLE_PRIORITY[b.role] ?? 50;
        if (pa !== pb) return pa - pb;
        return (a.full_name || '').localeCompare(b.full_name || '');
    });
}

// ===== 2. BADGE: Visual icon for leadership roles =====
/**
 * Returns HTML badge for leadership roles. Empty string for NV/others.
 * QLCC → 🏆 purple | QL → ⭐ gold | TP → 👑 blue
 */
function _sidebarRoleBadge(role) {
    switch (role) {
        case 'quan_ly_cap_cao':
            return '<span style="display:inline-flex;align-items:center;gap:2px;font-size:8px;padding:1px 6px;border-radius:4px;font-weight:800;margin-left:4px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:white;line-height:1.3;box-shadow:0 1px 3px rgba(168,85,247,0.3);">🏆 QLCC</span>';
        case 'quan_ly':
            return '<span style="display:inline-flex;align-items:center;gap:2px;font-size:8px;padding:1px 6px;border-radius:4px;font-weight:800;margin-left:4px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;line-height:1.3;box-shadow:0 1px 3px rgba(245,158,11,0.3);">⭐ QL</span>';
        case 'truong_phong':
            return '<span style="display:inline-flex;align-items:center;gap:2px;font-size:8px;padding:1px 6px;border-radius:4px;font-weight:800;margin-left:4px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;line-height:1.3;box-shadow:0 1px 3px rgba(59,130,246,0.3);">👑 TP</span>';
        default:
            return '';
    }
}

// ===== 3. DEFAULT VIEW: Which user to auto-select on page load =====
/**
 * Returns the default selectedUserId when entering a page.
 * - GĐ → null (sees aggregate/all data first)
 * - QLCC, QL, TP → currentUser.id (sees own work first)
 * - NV, Part-time → currentUser.id (locked to self)
 *
 * @returns {number|null} userId to auto-select, or null for "Tất cả"
 */
function _sidebarDefaultView() {
    if (!currentUser) return null;
    if (currentUser.role === 'giam_doc') return null;
    return currentUser.id;
}

// ===== 4. CAN MODIFY: Check if Add/Delete buttons should be shown =====
/**
 * Determines if the current user can perform create/delete actions
 * in the current view context.
 *
 * Rules:
 * - GĐ: Always can modify (even when viewing others' data)
 * - QLCC, QL, TP: Can modify ONLY when viewing their own data
 * - NV, Part-time: Can modify ONLY their own data
 *
 * @param {number|null} selectedUserId - currently selected user in sidebar (null = aggregate)
 * @returns {boolean}
 */
function _sidebarCanModify(selectedUserId) {
    if (!currentUser) return false;
    // GĐ always has modify rights
    if (currentUser.role === 'giam_doc') return true;
    // Everyone else: only when viewing their own data
    return selectedUserId === currentUser.id;
}

// ===== 5. IS MANAGER: Quick role check =====
/**
 * Returns true if current user is a manager-level role (can see subordinates).
 * NV and Part-time return false (they only see themselves).
 */
function _sidebarIsManager() {
    if (!currentUser) return false;
    return ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role);
}

// ===== 6. SHOULD SHOW SIDEBAR: Quick check for NV =====
/**
 * Returns false for NV/Part-time (sidebar should be hidden).
 * Returns true for all manager roles.
 */
function _sidebarShouldShow() {
    if (!currentUser) return false;
    return !['nhan_vien', 'part_time', 'thu_viec'].includes(currentUser.role);
}

// ===== 7. IS VIEWING SELF: Check if user is viewing their own data =====
/**
 * Determines if the current sidebar state means "viewing own data".
 * @param {number|null} selectedUserId
 * @param {number|null} selectedDeptId
 * @returns {boolean}
 */
function _sidebarIsViewingSelf(selectedUserId, selectedDeptId) {
    if (!currentUser) return false;
    if (selectedUserId) return selectedUserId === currentUser.id;
    if (selectedDeptId) return false; // viewing a department = not self
    // No selection: NV/PT implicitly view self, managers view aggregate
    return ['nhan_vien', 'part_time', 'thu_viec'].includes(currentUser.role);
}
