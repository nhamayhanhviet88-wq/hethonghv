// ========== PHAN QUYEN (PERMISSIONS) ==========

const PERM_FEATURES = [
    // ===== TỔNG QUAN =====
    { key: 'tong_quan', label: 'Các Chỉ Số Tổng Quan', perms: ['view'], section: 'TỔNG QUAN' },
    { key: 'tim_kiem_kh', label: 'Tìm Kiếm Khách Hàng', perms: ['view'], section: 'TỔNG QUAN' },

    // ===== CÔNG VIỆC NV KINH DOANH =====
    { key: 'goi_dien', label: 'Gọi Điện Telesale', perms: ['view','create'], section: 'CÔNG VIỆC NV KINH DOANH' },
    { key: 'he_thong_goi_dien', label: 'Hệ Thống Phân Chia Gọi Điện', perms: ['view','create','edit'], section: 'CÔNG VIỆC NV KINH DOANH' },
    { key: 'nhan_tin_doi_tac', label: 'Nhắn Tìm Đối Tác KH KOL Tiktok', perms: ['view','create','edit','delete'], section: 'CÔNG VIỆC NV KINH DOANH' },
    { key: 'add_cmt_doi_tac', label: 'Add/Cmt Đối Tác KH', perms: ['view','create','delete'], section: 'CÔNG VIỆC NV KINH DOANH' },
    { key: 'dang_video', label: 'Đăng Video Isocal', perms: ['view','create','delete'], section: 'CÔNG VIỆC NV KINH DOANH' },
    { key: 'dang_content', label: 'Đăng Content Isocal', perms: ['view','create','delete'], section: 'CÔNG VIỆC NV KINH DOANH' },
    { key: 'dang_group', label: 'Đăng & Tìm KH Group', perms: ['view','create','delete'], section: 'CÔNG VIỆC NV KINH DOANH' },
    { key: 'sedding_cong_dong', label: 'Sedding Cộng Đồng & Lẫn Nhau', perms: ['view','create','delete'], section: 'CÔNG VIỆC NV KINH DOANH' },
    { key: 'dang_ban_than', label: 'Đăng Bản Thân & Sản Phẩm', perms: ['view','create','delete'], section: 'CÔNG VIỆC NV KINH DOANH' },
    { key: 'tim_gr_zalo', label: 'Tìm Gr Zalo Và Join', perms: ['view','create'], section: 'CÔNG VIỆC NV KINH DOANH' },
    { key: 'nhom_spam_zalo', label: 'Nhóm Spam Zalo', perms: ['view','create'], section: 'CÔNG VIỆC NV KINH DOANH' },
    { key: 'tuyen_dung_sv', label: 'Tuyển Dụng SV KD', perms: ['view','create','delete'], section: 'CÔNG VIỆC NV KINH DOANH' },

    // ===== KINH DOANH CHĂM SÓC =====
    { key: 'crm_nhu_cau', label: 'Chăm Sóc KH Nhu Cầu', perms: ['view','create','edit','delete'], section: 'KINH DOANH CHĂM SÓC' },
    { key: 'crm_ctv', label: 'Chăm Sóc CTV', perms: ['view','create','edit','delete'], section: 'KINH DOANH CHĂM SÓC' },
    { key: 'crm_affiliate', label: 'Chăm Sóc Affiliate', perms: ['view','create','edit','delete'], section: 'KINH DOANH CHĂM SÓC' },
    { key: 'crm_koc_kol', label: 'Chăm Sóc KOL/KOC Tiktok', perms: ['view','create','edit','delete'], section: 'KINH DOANH CHĂM SÓC' },
    { key: 'huy_khach', label: 'Hủy Khách Hàng', perms: ['view','delete'], section: 'KINH DOANH CHĂM SÓC' },

    // ===== CÔNG VIỆC HẰNG NGÀY =====
    { key: 'lich_khoa_bieu', label: 'Lịch Khóa Biểu Công Việc', perms: ['view'], section: 'CÔNG VIỆC HẰNG NGÀY' },
    { key: 'lich_su_bao_cao', label: 'Lịch Sử Báo Cáo CV', perms: ['view','create','edit','delete'], section: 'CÔNG VIỆC HẰNG NGÀY' },
    { key: 'bangiao_diem', label: 'Bàn Giao CV Điểm', perms: ['view'], section: 'CÔNG VIỆC HẰNG NGÀY' },
    { key: 'bangiao_khoa', label: 'Bàn Giao CV Khóa - Chuỗi', perms: ['view'], section: 'CÔNG VIỆC HẰNG NGÀY' },

    // ===== CÔNG VIỆC CHĂM SÓC KHÁCH =====
    { key: 'don_khach_sll', label: 'Đơn Khách SLL', perms: ['view'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH' },
    { key: 'don_khach_nhieu_lan', label: 'Đơn Khách Nhiều Lần', perms: ['view'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH' },
    { key: 'don_khach_moi', label: 'Đơn Khách Mới', perms: ['view'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH' },
    { key: 'don_quan_he', label: 'Đơn Quan Hệ', perms: ['view'], section: 'CÔNG VIỆC CHĂM SÓC KHÁCH' },

    // ===== HỖ TRỢ NHÂN VIÊN =====
    { key: 'cap_cuu_sep', label: 'Cấp Cứu Sếp', perms: ['view','create','edit'], section: 'HỖ TRỢ NHÂN VIÊN' },
    { key: 'chuyen_so', label: 'Chuyển Số NV Kinh Doanh', perms: ['view','create','edit'], section: 'HỖ TRỢ NHÂN VIÊN' },
    { key: 'khoa_tk_nv', label: 'Nhân Viên Bị Phạt Tiền', perms: ['view'], section: 'HỖ TRỢ NHÂN VIÊN' },
    { key: 'xin_nghi_nv', label: 'Xin Nghỉ NV', perms: ['view','create'], section: 'HỖ TRỢ NHÂN VIÊN' },

    // ===== QUẢN LÝ NHÂN VIÊN =====
    { key: 'nhan_vien', label: 'Tài Khoản Nhân Viên', perms: ['view','create','edit','delete'], section: 'QUẢN LÝ NHÂN VIÊN' },
    { key: 'co_cau_to_chuc', label: 'Cơ Cấu Tổ Chức', perms: ['view','create','edit','delete'], section: 'QUẢN LÝ NHÂN VIÊN' },
    { key: 'phan_quyen', label: 'Phân Quyền', perms: ['view','edit'], section: 'QUẢN LÝ NHÂN VIÊN' },
    { key: 'trao_giai_thuong', label: 'Trao Giải Thưởng', perms: ['view'], section: 'BXH & GIẢI THƯỞNG' },

    // ===== HỆ THỐNG =====
    { key: 'cai_dat', label: 'Cài Đặt Phân Tầng', perms: ['view','edit'], section: 'HỆ THỐNG' },
];

const PERM_LABELS = { view: 'Xem', create: 'Thêm', edit: 'Sửa', delete: 'Xóa' };

let _permOrgData = { departments: [], users: [] };
let _permSelected = { type: null, id: null, name: '' };
let _permCollapsed = new Set();

function _escName(s) { return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

async function renderPermissionsPage(container) {
    container.innerHTML = `
        <div class="toolbar" style="justify-content:space-between;">
            <div>
                <h3 style="font-weight:700;color:var(--navy);margin:0;">&#128274; Phân Quyền</h3>
                <div style="font-size:12px;color:var(--gray-500);margin-top:2px;">Quản lý quyền hạn theo đơn vị và tài khoản</div>
            </div>
        </div>
        <div style="display:flex;gap:16px;margin-top:12px;">
            <div id="permSidebar" style="width:360px;min-width:360px;background:white;border-radius:10px;border:1px solid var(--gray-200);overflow:hidden;">
                <div style="padding:12px 14px;background:#122546;color:#fad24c;font-weight:700;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
                    <span>Vai trò</span>
                    <div style="display:flex;gap:6px;">
                        <button onclick="permCollapseAll()" style="background:rgba(255,255,255,0.15);border:none;color:#fad24c;font-size:10px;padding:3px 8px;border-radius:4px;cursor:pointer;font-weight:600;">Thu Gọn</button>
                        <button onclick="permExpandAll()" style="background:rgba(255,255,255,0.15);border:none;color:#fad24c;font-size:10px;padding:3px 8px;border-radius:4px;cursor:pointer;font-weight:600;">Mở Tất Cả</button>
                    </div>
                </div>
                <div style="padding:8px 10px;background:#f8fafc;border-bottom:1px solid var(--gray-200);">
                    <input type="text" id="permSearchInput" placeholder="🔍 Tìm tên hoặc username..." 
                        oninput="permSearchDebounce()" 
                        style="width:100%;padding:6px 10px;border:1px solid var(--gray-300);border-radius:6px;font-size:12px;outline:none;">
                </div>
                <div id="permOrgList" style="max-height:70vh;overflow-y:auto;padding:4px 0;">
                    <div style="text-align:center;padding:20px;color:#6b7280;">&#9203; Đang tải...</div>
                </div>
            </div>
            <div id="permPanel" style="flex:1;background:white;border-radius:10px;border:1px solid var(--gray-200);overflow:hidden;">
                <div style="padding:30px;text-align:center;color:#6b7280;">
                    <div style="font-size:32px;margin-bottom:8px;">&#128274;</div>
                    <div>Chọn đơn vị hoặc tài khoản bên trái để xem phân quyền</div>
                </div>
            </div>
        </div>
    `;
    await loadPermOrgTree();
}

async function loadPermOrgTree() {
    const data = await apiCall('/api/permissions/org-tree');
    _permOrgData = data;
    // Default: Thu Gọn state — only Hệ Thống (root) expanded
    if (_permCollapsed.size === 0 && data.departments) {
        data.departments.filter(d => !d.parent_id).forEach(d => _permCollapsed.add(d.id));
    }
    renderPermOrgTree();
}

function renderPermOrgTree() {
    const container = document.getElementById('permOrgList');
    if (!container) return;

    const { departments, users } = _permOrgData;
    const roots = departments.filter(d => !d.parent_id);
    const childrenOf = (pid) => departments.filter(d => d.parent_id === pid);
    const usersOf = (deptId) => users.filter(u => u.department_id === deptId);
    const unassigned = users.filter(u => !u.department_id && u.role !== 'giam_doc');

    // Search filter
    const searchTerm = (document.getElementById('permSearchInput')?.value || '').trim().toLowerCase();
    const isSearching = searchTerm.length > 0;

    // If searching, find matching user IDs and their department chains
    let matchedUserIds = new Set();
    let matchedDeptIds = new Set();
    if (isSearching) {
        users.forEach(u => {
            if ((u.full_name || '').toLowerCase().includes(searchTerm) || (u.username || '').toLowerCase().includes(searchTerm)) {
                matchedUserIds.add(u.id);
                // Add all parent departments to expand
                let dId = u.department_id;
                while (dId) {
                    matchedDeptIds.add(dId);
                    const d = departments.find(x => x.id === dId);
                    dId = d ? d.parent_id : null;
                }
            }
        });
        // Also expand root departments that contain matches
        departments.filter(d => !d.parent_id).forEach(d => {
            if (matchedDeptIds.has(d.id)) matchedDeptIds.add(d.id);
        });
    }

    let html = '';

    function renderDept(dept, level) {
        const children = childrenOf(dept.id).sort((a, b) => (a.display_order || 999) - (b.display_order || 999) || a.name.localeCompare(b.name, 'vi'));
        const members = usersOf(dept.id);
        const indent = level * 16;
        const isSelected = _permSelected.type === 'department' && _permSelected.id === dept.id;
        const hasChildren = children.length > 0 || members.length > 0;
        const isCollapsed = isSearching ? !matchedDeptIds.has(dept.id) : !_permCollapsed.has(dept.id);
        var arrow = hasChildren ? (isCollapsed ? '&#9654;' : '&#9660;') : '';
        var deptIcon = level === 0 ? '&#127970;' : (level >= 2 ? '&#128312;' : '&#128193;');
        var nameEsc = _escName(dept.name);

        html += '<div class="perm-org-item" data-type="department" data-id="' + dept.id + '" '
            + 'style="padding:8px 14px;padding-left:' + (14 + indent) + 'px;cursor:pointer;font-size:13px;font-weight:700;color:#122546;'
            + (isSelected ? 'background:#eef2ff;border-right:3px solid #6366f1;' : '')
            + 'display:flex;align-items:center;justify-content:space-between;">'
            + '<span onclick="selectPermTarget(\'department\',' + dept.id + ',\'' + nameEsc + '\')" style="flex:1;">';

        if (hasChildren) {
            html += '<span onclick="event.stopPropagation();togglePermDept(' + dept.id + ')" style="display:inline-block;width:16px;font-size:10px;color:#6b7280;cursor:pointer;">' + arrow + '</span>';
        } else {
            html += '<span style="display:inline-block;width:16px;"></span>';
        }

        // Count all members recursively
        function countAllMembers(dId) {
            var count = usersOf(dId).length;
            // Count head user if not already in members
            var d = departments.find(function(x) { return x.id === dId; });
            if (d && d.head_user_id) {
                var headInMembers = usersOf(dId).find(function(u) { return u.id === d.head_user_id; });
                if (!headInMembers) {
                    var headUser = users.find(function(u) { return u.id === d.head_user_id; });
                    if (headUser) count++;
                }
            }
            childrenOf(dId).forEach(function(c) { count += countAllMembers(c.id); });
            return count;
        }
        var totalCount = countAllMembers(dept.id);

        html += ' ' + deptIcon + ' ' + dept.name
            + '</span>'
            + '<span style="background:#e0e7ff;color:#4338ca;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;">' + totalCount + '</span>'
            + '</div>';

        if (!isCollapsed) {
            // Render head user FIRST (directly under department) with role badge
            var ROLE_BADGES = { giam_doc: 'Giám Đốc', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng', nhan_vien: 'Nhân Viên', thu_viec: 'Thử Việc', hoa_hong: 'Hoa Hồng' };
            var headId = dept.head_user_id;
            var headUser = headId ? members.find(function(u) { return u.id === headId; }) : null;
            // Also check if head is not in members (e.g. department_id is null)
            if (!headUser && headId) {
                headUser = users.find(function(u) { return u.id === headId; });
            }
            if (headUser) {
                var isHeadMatch = isSearching && matchedUserIds.has(headUser.id);
                if (!isSearching || isHeadMatch) {
                    var isHeadSel = _permSelected.type === 'user' && _permSelected.id === headUser.id;
                    var hNameEsc = _escName(headUser.full_name);
                    var roleBadge = ROLE_BADGES[headUser.role] || headUser.role;
                    html += '<div class="perm-org-item" data-type="user" data-id="' + headUser.id + '"'
                        + ' onclick="selectPermTarget(\'user\',' + headUser.id + ',\'' + hNameEsc + '\')"'
                        + ' style="padding:6px 14px;padding-left:' + (14 + indent + 24) + 'px;cursor:pointer;font-size:12px;color:#d97706;font-weight:600;'
                        + (isHeadSel ? 'background:#eef2ff;border-right:3px solid #6366f1;' : '')
                        + (isHeadMatch ? 'background:#fef9c3;' : '') + '">'
                        + ' &#128100; ' + headUser.full_name
                        + (headUser.username ? ' <span style="font-size:10px;color:#94a3b8;margin-left:2px;">(' + headUser.username + ')</span>' : '')
                        + ' <span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:8px;margin-left:4px;">' + roleBadge + '</span>'
                        + '</div>';
                }
            }
            // Render child departments
            children.forEach(function(c) { renderDept(c, level + 1); });
            // Render other members (exclude head)
            members.forEach(function(u) {
                if (headUser && u.id === headUser.id) return; // skip head, already rendered
                var isUserMatch = isSearching && matchedUserIds.has(u.id);
                if (isSearching && !isUserMatch) return; // hide non-matching users when searching
                var isUserSel = _permSelected.type === 'user' && _permSelected.id === u.id;
                var uNameEsc = _escName(u.full_name);
                var uRoleBadge = ROLE_BADGES[u.role] || u.role;
                html += '<div class="perm-org-item" data-type="user" data-id="' + u.id + '"'
                    + ' onclick="selectPermTarget(\'user\',' + u.id + ',\'' + uNameEsc + '\')"'
                    + ' style="padding:6px 14px;padding-left:' + (14 + indent + 24) + 'px;cursor:pointer;font-size:12px;color:#6b7280;'
                    + (isUserSel ? 'background:#eef2ff;border-right:3px solid #6366f1;' : '')
                    + (isUserMatch ? 'background:#fef9c3;' : '') + '">'
                    + ' &#128100; ' + u.full_name
                    + (u.username ? ' <span style="font-size:10px;color:#94a3b8;margin-left:2px;">(' + u.username + ')</span>' : '')
                    + ' <span style="font-size:10px;background:#f3f4f6;color:#6b7280;padding:1px 6px;border-radius:8px;margin-left:4px;">' + uRoleBadge + '</span>'
                    + '</div>';
            });
        }
    }

    // Sort roots: HỆ THỐNG first, then by display_order
    roots.sort((a, b) => {
        const aIsHT = a.name.toUpperCase().includes('HỆ THỐNG');
        const bIsHT = b.name.toUpperCase().includes('HỆ THỐNG');
        if (aIsHT && !bIsHT) return -1;
        if (!aIsHT && bIsHT) return 1;
        return (a.display_order || 999) - (b.display_order || 999) || a.name.localeCompare(b.name, 'vi');
    });
    roots.forEach(function(r) { renderDept(r, 0); });

    // Unassigned users
    if (unassigned.length > 0) {
        html += '<div style="padding:8px 14px;font-size:12px;font-weight:700;color:#6b7280;border-top:1px solid #e5e7eb;margin-top:4px;">Chưa phân bổ</div>';
        unassigned.forEach(function(u) {
            var isUserSel = _permSelected.type === 'user' && _permSelected.id === u.id;
            var uNameEsc = _escName(u.full_name);
            html += '<div class="perm-org-item" data-type="user" data-id="' + u.id + '"'
                + ' onclick="selectPermTarget(\'user\',' + u.id + ',\'' + uNameEsc + '\')"'
                + ' style="padding:6px 14px;padding-left:28px;cursor:pointer;font-size:12px;color:#6b7280;'
                + (isUserSel ? 'background:#eef2ff;border-right:3px solid #6366f1;' : '') + '">'
                + ' &#128100; ' + u.full_name
                + '</div>';
        });
    }

    container.innerHTML = html || '<div style="padding:20px;text-align:center;color:#6b7280;">Chưa có dữ liệu</div>';

    // Show search result count
    if (isSearching) {
        container.insertAdjacentHTML('afterbegin', '<div style="padding:6px 10px;background:#fef9c3;font-size:11px;color:#92400e;font-weight:600;border-bottom:1px solid #fde68a;">🔍 Tìm thấy ' + matchedUserIds.size + ' nhân sự</div>');
    }
}

let _permSearchTimer = null;
function permSearchDebounce() {
    clearTimeout(_permSearchTimer);
    _permSearchTimer = setTimeout(() => renderPermOrgTree(), 300);
}

async function selectPermTarget(type, id, name) {
    _permSelected = { type, id, name };
    renderPermOrgTree();
    await loadPermPanel();
}

async function loadPermPanel() {
    const { type, id, name } = _permSelected;
    if (!type || !id) return;

    const panel = document.getElementById('permPanel');
    panel.innerHTML = '<div style="padding:30px;text-align:center;color:#6b7280;">&#9203; Đang tải...</div>';

    const data = await apiCall(`/api/permissions/${type}/${id}`);
    const perms = data.permissions || [];

    const permMap = {};
    perms.forEach(p => { permMap[p.feature] = p; });

    // If viewing a user, fetch their department permissions
    let deptPermMap = {};
    if (type === 'user') {
        const userInfo = _permOrgData.users.find(u => u.id === id);
        if (userInfo && userInfo.department_id) {
            const deptData = await apiCall(`/api/permissions/department/${userInfo.department_id}`);
            const deptPerms = deptData.permissions || [];
            deptPerms.forEach(p => { deptPermMap[p.feature] = p; });
        }
    }

    const typeLabel = type === 'department' ? '&#127970; Đơn vị' : '&#128100; Tài khoản';

    let lastSection = '';
    let featuresHTML = PERM_FEATURES.map(feat => {
        let sectionHeader = '';
        if (feat.section && feat.section !== lastSection) {
            lastSection = feat.section;
            sectionHeader = `<div style="font-weight:800;color:#6366f1;font-size:13px;margin:${sectionHeader ? '20' : '0'}px 0 10px;padding:8px 12px;background:linear-gradient(135deg,#eef2ff,#f0f4ff);border-radius:8px;border-left:3px solid #6366f1;text-transform:uppercase;letter-spacing:0.5px;">📁 ${feat.section}</div>`;
        }
        const p = permMap[feat.key] || {};
        const dp = deptPermMap[feat.key] || {};

        if (type === 'department') {
            // Department: simple checkboxes
            return sectionHeader + `
            <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div style="font-weight:700;color:#122546;font-size:14px;">${feat.label}</div>
                    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:#6366f1;font-weight:600;">
                        <input type="checkbox" class="perm-row-all" data-feature="${feat.key}"
                            ${feat.perms.every(pk => p['can_' + pk] > 0) ? 'checked' : ''}
                            onchange="toggleRowPerms(this)"
                            style="width:14px;height:14px;accent-color:#6366f1;">
                        Tất cả
                    </label>
                </div>
                <div style="display:flex;gap:24px;flex-wrap:wrap;">
                    ${feat.perms.map(pk => `
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#374151;">
                            <input type="checkbox" class="perm-cb" data-feature="${feat.key}" data-perm="${pk}"
                                ${p['can_' + pk] > 0 ? 'checked' : ''}
                                onchange="syncRowAllCheckbox('${feat.key}')"
                                style="width:16px;height:16px;accent-color:#6366f1;">
                            ${PERM_LABELS[pk]}
                        </label>
                    `).join('')}
                </div>
            </div>`;
        }

        // User: 3-state checkboxes
        return sectionHeader + `
        <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:12px;">
            <div style="font-weight:700;color:#122546;font-size:14px;margin-bottom:12px;">${feat.label}</div>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">
                ${feat.perms.map(pk => {
                    const userVal = p['can_' + pk];
                    const deptVal = dp['can_' + pk];
                    const isDenied = userVal === -1;
                    const fromDept = deptVal > 0;
                    const fromUser = userVal > 0;

                    let checked, labelHTML, color, stateAttr;
                    if (isDenied) {
                        checked = false;
                        labelHTML = PERM_LABELS[pk] + ' <span style="font-size:10px;color:#ef4444;">&#128683; chặn</span>';
                        color = '#ef4444';
                        stateAttr = 'denied';
                    } else if (fromDept && !fromUser) {
                        checked = true;
                        labelHTML = PERM_LABELS[pk] + ' <span style="font-size:10px;color:#a78bfa;">(kế thừa)</span>';
                        color = '#a78bfa';
                        stateAttr = 'inherited';
                    } else if (fromUser) {
                        checked = true;
                        labelHTML = PERM_LABELS[pk] + (fromDept ? ' <span style="font-size:10px;color:#a78bfa;">(kế thừa)</span>' : '');
                        color = '#6366f1';
                        stateAttr = 'user';
                    } else {
                        checked = false;
                        labelHTML = PERM_LABELS[pk];
                        color = '#6366f1';
                        stateAttr = 'none';
                    }

                    return `
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#374151;">
                        <input type="checkbox" class="perm-cb" data-feature="${feat.key}" data-perm="${pk}"
                            data-from-dept="${fromDept ? 1 : 0}" data-state="${stateAttr}"
                            ${checked ? 'checked' : ''}
                            onchange="onUserPermChange(this)"
                            style="width:16px;height:16px;accent-color:${color};">
                        ${labelHTML}
                    </label>`;
                }).join('')}
            </div>
        </div>`;
    }).join('');

    panel.innerHTML = `
        <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
            <div style="font-size:16px;font-weight:700;color:#122546;">Phân quyền: ${name}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">${typeLabel}${type === 'user' ? ' &middot; <span style="color:#a78bfa;">Tím = kế thừa</span> &middot; <span style="color:#ef4444;">Đỏ = chặn riêng</span>' : ''}</div>
        </div>
        <div style="padding:20px;max-height:65vh;overflow-y:auto;">
            ${featuresHTML}
        </div>
        <div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end;align-items:center;">
            <button class="btn btn-sm" onclick="toggleAllPerms(true)" style="background:#dcfce7;color:#166534;border:1px solid #4ade80;font-size:11px;">&#9745; Chọn Tất Cả</button>
            <button class="btn btn-sm" onclick="toggleAllPerms(false)" style="background:#fef2f2;color:#991b1b;border:1px solid #f87171;font-size:11px;">&#9744; Bỏ Tất Cả</button>
            <div style="flex:1;"></div>
            <button class="btn btn-sm" onclick="resetPermDefaults()" style="background:white;color:#6366f1;border:1px solid #6366f1;font-size:12px;">&#128260; Reset mặc định</button>
            <button class="btn btn-primary" onclick="savePermissions()" style="width:auto;font-size:12px;">&#128190; Lưu phân quyền</button>
        </div>
    `;
}

// Handle user permission checkbox change with 3-state logic
function onUserPermChange(cb) {
    const fromDept = cb.dataset.fromDept === '1';
    const prevState = cb.dataset.state;
    const lbl = cb.parentElement;
    const span = lbl.querySelector('span');

    if (fromDept) {
        if (prevState === 'inherited' || prevState === 'user') {
            cb.checked = false;
            cb.dataset.state = 'denied';
            cb.style.accentColor = '#ef4444';
            if (span) span.outerHTML = '<span style="font-size:10px;color:#ef4444;">&#128683; chặn</span>';
            else lbl.insertAdjacentHTML('beforeend', ' <span style="font-size:10px;color:#ef4444;">&#128683; chặn</span>');
        } else if (prevState === 'denied') {
            cb.checked = true;
            cb.dataset.state = 'inherited';
            cb.style.accentColor = '#a78bfa';
            if (span) span.outerHTML = '<span style="font-size:10px;color:#a78bfa;">(kế thừa)</span>';
        }
    } else {
        cb.dataset.state = cb.checked ? 'user' : 'none';
        if (span) span.remove();
    }
}

function resetPermDefaults() {
    document.querySelectorAll('.perm-cb').forEach(cb => {
        const fromDept = cb.dataset?.fromDept === '1';
        if (fromDept) {
            cb.checked = true;
            cb.dataset.state = 'inherited';
            cb.style.accentColor = '#a78bfa';
            const span = cb.parentElement.querySelector('span');
            if (span) span.outerHTML = '<span style="font-size:10px;color:#a78bfa;">(kế thừa)</span>';
        } else {
            cb.checked = false;
            cb.dataset.state = 'none';
            const span = cb.parentElement.querySelector('span');
            if (span) span.remove();
        }
    });
    showToast('Đã reset về mặc định (kế thừa phòng ban)');
}

async function savePermissions() {
    const { type, id } = _permSelected;
    if (!type || !id) return;

    const permissions = PERM_FEATURES.map(feat => {
        const obj = { feature: feat.key };
        feat.perms.forEach(pk => {
            const cb = document.querySelector('.perm-cb[data-feature="' + feat.key + '"][data-perm="' + pk + '"]');
            if (!cb) { obj['can_' + pk] = 0; return; }

            if (type === 'user') {
                const state = cb.dataset.state;
                if (state === 'denied') {
                    obj['can_' + pk] = -1;
                } else if (state === 'user') {
                    obj['can_' + pk] = 1;
                } else {
                    obj['can_' + pk] = 0;
                }
            } else {
                obj['can_' + pk] = cb.checked ? 1 : 0;
            }
        });
        return obj;
    });

    const data = await apiCall('/api/permissions/' + type + '/' + id, 'POST', { permissions });
    if (data.success) {
        showToast('&#10004; ' + data.message);
    } else {
        showToast(data.error || 'Lỗi!', 'error');
    }
}

// Toggle all checkboxes in a single feature row
function toggleRowPerms(allCb) {
    const feature = allCb.dataset.feature;
    const checked = allCb.checked;
    document.querySelectorAll('.perm-cb[data-feature="' + feature + '"]').forEach(cb => {
        cb.checked = checked;
        if (cb.dataset.state) cb.dataset.state = checked ? 'user' : 'none';
    });
}

// Sync the row's "all" checkbox based on individual checkboxes
function syncRowAllCheckbox(feature) {
    const cbs = document.querySelectorAll('.perm-cb[data-feature="' + feature + '"]');
    const allCb = document.querySelector('.perm-row-all[data-feature="' + feature + '"]');
    if (allCb) allCb.checked = [...cbs].every(cb => cb.checked);
}

// Toggle ALL permissions globally
function toggleAllPerms(checked) {
    document.querySelectorAll('.perm-cb').forEach(cb => {
        cb.checked = checked;
        if (cb.dataset.state) cb.dataset.state = checked ? 'user' : 'none';
    });
    document.querySelectorAll('.perm-row-all').forEach(cb => cb.checked = checked);
    showToast(checked ? 'Đã chọn tất cả quyền' : 'Đã bỏ tất cả quyền');
}

function togglePermDept(deptId) {
    if (_permCollapsed.has(deptId)) _permCollapsed.delete(deptId);
    else _permCollapsed.add(deptId);
    renderPermOrgTree();
}

function permCollapseAll() {
    _permCollapsed.clear();
    // Keep only Hệ Thống (root depts) expanded
    const { departments } = _permOrgData;
    departments.filter(d => !d.parent_id).forEach(d => _permCollapsed.add(d.id));
    renderPermOrgTree();
}

function permExpandAll() {
    const { departments } = _permOrgData;
    departments.forEach(d => _permCollapsed.add(d.id));
    renderPermOrgTree();
}
