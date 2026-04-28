// ========== SIDEBAR UTILS — Shared across all modules ==========
// Provides: role-based sorting + leadership badge for sidebar member lists
// Usage: _sidebarSortMembers(members) → sorted array (leadership first)
//        _sidebarRoleBadge(role)      → HTML badge string

/**
 * Sort members: leadership roles first, then by name
 * Priority: QLCC(1) → QL(2) → TP(3) → NV(99) → others(100)
 */
const _SIDEBAR_ROLE_PRIORITY = {
    quan_ly_cap_cao: 1,
    quan_ly: 2,
    truong_phong: 3,
    nhan_vien: 99,
    thu_viec: 100,
    part_time: 101
};

function _sidebarSortMembers(members) {
    if (!members || !Array.isArray(members)) return [];
    return [...members].sort((a, b) => {
        const pa = _SIDEBAR_ROLE_PRIORITY[a.role] ?? 50;
        const pb = _SIDEBAR_ROLE_PRIORITY[b.role] ?? 50;
        if (pa !== pb) return pa - pb;
        return (a.full_name || '').localeCompare(b.full_name || '');
    });
}

/**
 * Returns HTML badge for leadership roles
 * QLCC → 🏆 purple badge
 * QL   → ⭐ gold badge
 * TP   → 👑 blue badge
 * Others → empty string
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
