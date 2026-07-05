// PUBLIC/JS/PAGES/SOKHACHSALE.JS
// Hierarchical Year > Month > Day Navigation & Customer Intake Dashboard for Sổ Khách Sale

let _sksSidebarUsers = [];
let _sksSidebarDepts = [];
let _sksSidebarSelectedUserId = null;
let _sksSelectedYear = null;
let _sksSelectedMonth = null;
let _sksSelectedDay = null;
let _sksTreeData = [];
let _sksExpandedNodes = new Set();
let _sksCurrentPage = 1;
let _sksPageSize = 25;
let _sksAllCustomers = [];
let _sksTotalCustomers = 0;

// Save original loadCrmData from crm.js for back-compatibility
if (typeof window._originalLoadCrmData !== 'function' && typeof loadCrmData === 'function') {
    window._originalLoadCrmData = loadCrmData;
}

// Override loadCrmData to support reloading Sổ Khách Sale
window.loadCrmData = async function(crmType) {
    if (crmType === 'sale') {
        await sksLoadCustomers();
        let url = '/api/customers/statistics-tree?crm_type=sale';
        if (_sksSidebarSelectedUserId) url += `&employee_id=${_sksSidebarSelectedUserId}`;
        try {
            const res = await apiCall(url);
            if (res.success) {
                _sksTreeData = res.tree || [];
                sksRenderSidebar();
            }
        } catch(e) {}
    } else if (typeof window._originalLoadCrmData === 'function') {
        await window._originalLoadCrmData(crmType);
    }
};

async function renderSokhachsalePage(container) {
    window._currentCrmType = 'sale';
    _sksCurrentPage = 1;
    _sksSelectedYear = null;
    _sksSelectedMonth = null;
    _sksSelectedDay = null;
    _sksTreeData = [];
    _sksExpandedNodes.clear();

    // Fetch initial sidebar details
    const [staffRes, deptsRes] = await Promise.all([
        apiCall('/api/managed-staff'),
        apiCall('/api/departments')
    ]);
    _sksSidebarUsers = (staffRes.users || []).filter(u => ['nhan_vien', 'truong_phong', 'quan_ly', 'quan_ly_cap_cao'].includes(u.role));
    _sksSidebarDepts = deptsRes.departments || deptsRes || [];

    // Enforce role-based initial selection
    if (['quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role)) {
        _sksSidebarSelectedUserId = currentUser.id;
    } else if (currentUser.role === 'nhan_vien') {
        _sksSidebarSelectedUserId = currentUser.id;
    } else {
        _sksSidebarSelectedUserId = null; // Admin / GĐ see all by default
    }

    container.innerHTML = `
        <style>
            .sks-container { 
                display: flex; 
                height: calc(100vh - 120px); 
                gap: 20px; 
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                background: #f8fafc; 
                padding: 10px;
            }
            .sks-sidebar { 
                width: 280px; 
                min-width: 280px; 
                background: #ffffff; 
                border-radius: 16px;
                border: 1px solid #e2e8f0; 
                display: flex; 
                flex-direction: column; 
                overflow: hidden; 
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            }
            .sks-main { 
                flex: 1; 
                overflow: auto; 
                padding: 24px; 
                background: #ffffff; 
                border-radius: 16px;
                border: 1px solid #e2e8f0; 
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                display: flex;
                flex-direction: column;
            }
            
            /* Sidebar User Card */
            .sks-user-item {
                display: flex;
                flex-direction: column;
                padding: 12px;
                cursor: pointer;
                border-radius: 12px;
                margin-bottom: 6px;
                transition: all 0.2s ease;
                background: #ffffff;
                border: 1px solid #e2e8f0;
            }
            .sks-user-item:hover {
                background: #f8fafc;
                border-color: #cbd5e1;
                transform: translateY(-1px);
            }
            .sks-user-item.active {
                background: linear-gradient(135deg, #1e293b, #0f172a);
                color: #ffffff;
                border-color: #0f172a;
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
            }

            /* Tree CSS styling */
            .sks-tree-container { 
                margin-top: 10px; 
                padding-left: 10px; 
                border-left: 2px solid rgba(255, 255, 255, 0.15); 
                display: flex; 
                flex-direction: column; 
                gap: 6px; 
            }
            .sks-user-item:not(.active) .sks-tree-container {
                border-left-color: #cbd5e1;
            }
            
            .sks-tree-node { 
                display: flex; 
                align-items: center; 
                justify-content: space-between; 
                padding: 8px 10px; 
                border-radius: 8px; 
                cursor: pointer; 
                font-size: 11.5px; 
                font-weight: 600; 
                transition: all 0.15s; 
                background: rgba(255, 255, 255, 0.05); 
                border: 1px solid rgba(255, 255, 255, 0.1); 
                color: rgba(255, 255, 255, 0.8); 
            }
            .sks-user-item:not(.active) .sks-tree-node {
                background: #f8fafc;
                border-color: #e2e8f0;
                color: #475569;
            }
            .sks-tree-node:hover { 
                background: rgba(255, 255, 255, 0.15); 
                color: #ffffff; 
            }
            .sks-user-item:not(.active) .sks-tree-node:hover {
                background: #f1f5f9;
                color: #0f172a;
            }
            
            .sks-tree-node.active { 
                background: #fad24c !important; 
                border-color: #fad24c !important; 
                color: #0f172a !important; 
                font-weight: 700; 
                box-shadow: 0 2px 8px rgba(250, 210, 76, 0.3); 
            }
            .sks-user-item:not(.active) .sks-tree-node.active {
                background: #3b82f6 !important;
                border-color: #3b82f6 !important;
                color: #ffffff !important;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            }
            
            .sks-tree-node .node-label { 
                display: flex; 
                align-items: center; 
                gap: 6px; 
                flex: 1; 
                text-align: left; 
            }
            .sks-tree-node .node-badge { 
                background: rgba(255, 255, 255, 0.2); 
                color: #ffffff; 
                font-size: 9.5px; 
                font-weight: 800; 
                padding: 2px 6px; 
                border-radius: 20px; 
                flex-shrink: 0; 
            }
            .sks-user-item:not(.active) .sks-tree-node .node-badge {
                background: #cbd5e1;
                color: #334155;
            }
            .sks-tree-node.active .node-badge { 
                background: #0f172a !important; 
                color: #fad24c !important; 
            }
            .sks-user-item:not(.active) .sks-tree-node.active .node-badge {
                background: #ffffff !important;
                color: #3b82f6 !important;
            }
            
            .sks-tree-children { 
                display: flex; 
                flex-direction: column; 
                gap: 5px; 
                padding-left: 12px; 
            }
            .sks-tree-year { font-weight: 700; }
            .sks-tree-month { font-weight: 600; }
            .sks-tree-day { font-weight: 500; }
            
            /* Table Styling */
            .sks-table-card {
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                margin-top: 10px;
                background: #ffffff;
            }
            table.sks-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
            }
            table.sks-table thead th {
                background: #0f172a !important;
                color: #ffffff !important;
                padding: 14px 16px;
                font-weight: 700;
                font-size: 11.5px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border: none;
            }
            table.sks-table thead th:first-child {
                border-top-left-radius: 12px;
                border-bottom-left-radius: 12px;
            }
            table.sks-table thead th:last-child {
                border-top-right-radius: 12px;
                border-bottom-right-radius: 12px;
            }
            table.sks-table tbody td {
                padding: 14px 16px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: middle;
            }
            table.sks-table tbody tr {
                transition: all 0.2s ease;
            }
            table.sks-table tbody tr:hover {
                background: #f8fafc;
            }
            table.sks-table tbody tr:last-child td {
                border-bottom: none;
            }

            /* Pagination */
            .crm-pagination { display:flex; align-items:center; justify-content:center; gap:6px; padding:16px 0; flex-wrap:wrap; }
            .crm-pagination button { 
                min-width: 36px; 
                height: 36px; 
                border: 1px solid #cbd5e1; 
                background: #ffffff; 
                color: #475569; 
                border-radius: 8px; 
                font-size: 13px; 
                font-weight: 600; 
                cursor: pointer; 
                transition: all 0.2s; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
            }
            .crm-pagination button:hover { 
                background: #f1f5f9; 
                color: #0f172a; 
                border-color: #cbd5e1;
            }
            .crm-pagination button.active { 
                background: linear-gradient(135deg, #1e293b, #0f172a); 
                color: white; 
                border-color: #0f172a; 
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); 
            }
            .crm-pagination button:disabled { opacity:.4; cursor:not-allowed; }
            .crm-pagination .pg-info { color:#64748b; font-size:12px; font-weight:600; margin:0 8px; }
        </style>
        <div class="sks-container">
            <!-- LEFT SIDEBAR -->
            <div class="sks-sidebar">
                <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0; background:linear-gradient(135deg,#1e293b,#0f172a); color:white;">
                    <h4 style="margin:0;font-size:14px;font-weight:800;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;">💼 BỘ PHẬN SALE</h4>
                </div>
                <div id="sksSidebarList" style="flex:1;overflow:auto;padding:12px;background:#f8fafc;display:flex;flex-direction:column;gap:4px;"></div>
            </div>

            <!-- RIGHT MAIN CONTENT -->
            <div class="sks-main">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:24px;">📖</span>
                        <h3 style="margin:0;font-size:19px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">Sổ Khách Sale</h3>
                    </div>
                    <div id="sksFilterInfo" style="font-size:12.5px;font-weight:700;color:#2563eb;background:#eff6ff;padding:6px 14px;border-radius:20px;border:1px solid #bfdbfe;box-shadow:0 1px 2px rgba(37,99,235,0.05)">
                        Đang tải...
                    </div>
                </div>

                <!-- Filters area -->
                <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap; align-items:center;">
                    <div style="position:relative; display:flex; align-items:center;">
                        <span style="position:absolute; left:12px; color:#64748b; font-size:14px; pointer-events:none;">🎯</span>
                        <select id="sksFilterStatus" class="form-control" style="width:auto;min-width:180px; padding-left:34px; border-radius:10px; border:1px solid #cbd5e1; height:40px; font-size:13px; font-weight:600; color:#334155; box-shadow:0 1px 2px rgba(0,0,0,0.02)">
                            <option value="">Tất cả trạng thái</option>
                            <option value="dang_tu_van">Đang Tư Vấn</option>
                            <option value="bao_gia">Báo Giá</option>
                            <option value="dat_coc">Đã Đặt Cọc</option>
                            <option value="chot_don">Chốt Đơn</option>
                            <option value="san_xuat">Sản Xuất</option>
                            <option value="giao_hang">Giao Hàng</option>
                            <option value="hoan_thanh">Hoàn Thành</option>
                        </select>
                    </div>
                    <div style="position:relative; display:flex; align-items:center; flex:1; max-width:320px;">
                        <span style="position:absolute; left:12px; color:#64748b; font-size:14px; pointer-events:none;">🔍</span>
                        <input type="text" id="sksSearch" class="form-control" placeholder="Tìm tên hoặc SĐT..." style="width:100%; padding-left:34px; border-radius:10px; border:1px solid #cbd5e1; height:40px; font-size:13px; font-weight:500; box-shadow:0 1px 2px rgba(0,0,0,0.02)">
                    </div>
                </div>

                <!-- Customers table -->
                <div class="sks-table-card" style="flex:1; overflow-y:auto;">
                    <table class="sks-table" id="sksTable">
                        <thead><tr>
                            <th>Mã</th><th>Khách Hàng</th><th>SĐT</th><th>Nguồn</th>
                            <th>Người Nhận</th><th>Trạng Thái</th><th>Ngày tạo</th><th>Thao Tác</th>
                        </tr></thead>
                        <tbody id="sksTbody"><tr><td colspan="8" style="text-align:center;padding:40px;color:#64748b;">⏳ Đang tải...</td></tr></tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="crm-pagination" id="sksPagination"></div>
            </div>
        </div>
    `;

    // Filter event listeners
    document.getElementById('sksFilterStatus').addEventListener('change', () => {
        _sksCurrentPage = 1;
        sksLoadCustomers();
    });
    let searchTimeout;
    document.getElementById('sksSearch').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            _sksCurrentPage = 1;
            sksLoadCustomers();
        }, 450);
    });

    // Populate sidebar and tree elements
    await sksSelectUser(_sksSidebarSelectedUserId);
}

function sksRenderSidebar() {
    const list = document.getElementById('sksSidebarList');
    if (!list) return;

    const isAllActive = _sksSidebarSelectedUserId === null;
    const _isTP = currentUser.role === 'truong_phong';

    let topBtn = '';
    // Only managers/directors/admins can view "Tổng bộ phận"
    if (['giam_doc', 'quan_ly', 'quan_ly_cap_cao'].includes(currentUser.role)) {
        topBtn = `<div onclick="sksSelectUser(null)" class="sks-user-item ${isAllActive ? 'active' : ''}">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:16px;background:${isAllActive ? 'rgba(255,255,255,0.15)' : '#e2e8f0'};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">👥</span>
                <div style="flex:1;">
                    <div style="font-size:12px;font-weight:800;letter-spacing:-0.2px;">Tổng Bộ Phận Sale</div>
                    <div style="font-size:9.5px;opacity:0.75;">Xem tổng hợp tất cả NV</div>
                </div>
            </div>
            ${isAllActive ? `<div id="sksTreeContainer_null" style="margin-top:8px;" onclick="event.stopPropagation()">${sksRenderTreeHTML(null)}</div>` : ''}
        </div>`;
    }

    const saleDept = _sksSidebarDepts.find(d => d.id === 4) || 
                     _sksSidebarDepts.find(d => d.name && d.name.toUpperCase() === 'PHÒNG SALE') || 
                     _sksSidebarDepts.find(d => d.name && d.name.toUpperCase().includes('SALE') && !d.name.toUpperCase().includes('XƯỞNG') && d.parent_id !== 4);
    if (!saleDept) {
        list.innerHTML = topBtn + '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;font-weight:600;">Không tìm thấy Phòng Sale</div>';
        return;
    }

    const saleDeptIds = new Set([saleDept.id]);
    _sksSidebarDepts.forEach(d => {
        if (d.parent_id === saleDept.id) saleDeptIds.add(d.id);
    });

    const excludeRoles = ['hoa_hong', 'ctv', 'tkaffiliate', 'nuoi_duong', 'sinh_vien'];
    let saleUsers = _sksSidebarUsers.filter(u => saleDeptIds.has(u.department_id) && !excludeRoles.includes(u.role));

    if (_isTP && currentUser.department_id) {
        saleUsers = saleUsers.filter(u => u.department_id === currentUser.department_id);
    }

    if (saleUsers.length === 0 && !topBtn) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;font-weight:600;">Không có NV trong Phòng Sale</div>';
        return;
    }

    function avatarColor(n) {
        let h = 0;
        for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
        return ['#3b82f6', '#059669', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#ec4899', '#6366f1'][Math.abs(h) % 8];
    }
    function initials(n) {
        if (!n) return '?';
        const p = n.trim().split(/\s+/);
        return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : n.substring(0, 2).toUpperCase();
    }
    function sortMembers(users) {
        const roleOrder = { giam_doc: 0, quan_ly_cap_cao: 1, quan_ly: 2, truong_phong: 3, nhan_vien: 4, part_time: 5 };
        return [...users].sort((a, b) => {
            const orderA = roleOrder[a.role] !== undefined ? roleOrder[a.role] : 99;
            const orderB = roleOrder[b.role] !== undefined ? roleOrder[b.role] : 99;
            if (orderA !== orderB) return orderA - orderB;
            return a.full_name.localeCompare(b.full_name);
        });
    }
    function roleBadge(role) {
        const roleColors = { giam_doc: '#ef4444', quan_ly_cap_cao: '#f59e0b', quan_ly: '#3b82f6', truong_phong: '#8b5cf6', nhan_vien: '#10b981', part_time: '#6b7280' };
        const roleLabels = { giam_doc: 'GĐ', quan_ly_cap_cao: 'QLCC', quan_ly: 'QL', truong_phong: 'TP', nhan_vien: 'NV', part_time: 'PT' };
        const color = roleColors[role] || '#6b7280';
        const label = roleLabels[role] || role;
        return ` <span style="background:${color};color:white;font-size:8px;padding:2px 5px;border-radius:4px;font-weight:700;vertical-align:middle;margin-left:4px;text-transform:uppercase;">${label}</span>`;
    }

    function renderSidebarUser(u, indent) {
        const active = u.id === _sksSidebarSelectedUserId;
        const c = avatarColor(u.full_name || u.username);
        const deptMap = {};
        _sksSidebarDepts.forEach(d => { deptMap[d.id] = d.name; });
        const dName = deptMap[u.department_id] || '';
        const badge = roleBadge(u.role);
        return `<div class="sks-user-item ${active ? 'active' : ''}" style="margin-left:${indent}px;" onclick="sksSelectUser(${u.id})">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="background:${active ? 'rgba(255,255,255,0.2)' : c};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white;flex-shrink:0;">${initials(u.full_name || u.username)}</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-0.1px;">${u.full_name || u.username}${badge}</div>
                    <div style="font-size:9.5px;opacity:0.65;font-weight:500;">${dName}</div>
                </div>
            </div>
            ${active ? `<div id="sksTreeContainer_${u.id}" style="margin-top:8px;" onclick="event.stopPropagation()">${sksRenderTreeHTML(u.id)}</div>` : ''}
        </div>`;
    }

    const directUsers = sortMembers(saleUsers.filter(u => u.department_id === saleDept.id));
    let childTeams = _sksSidebarDepts.filter(d => d.parent_id === saleDept.id).sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || a.name.localeCompare(b.name));

    if (_isTP && currentUser.department_id) {
        childTeams = childTeams.filter(t => t.id === currentUser.department_id);
    }

    let html = '';

    if (directUsers.length > 0 && !_isTP) {
        html += `<div style="padding:6px 12px;margin:8px 0 4px;font-size:10px;font-weight:800;color:#64748b;letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#3b82f6;"></span>
            ${saleDept.name}
        </div>`;
        directUsers.forEach(u => { html += renderSidebarUser(u, 0); });
    } else if (!_isTP) {
        html += `<div style="padding:6px 12px;margin:8px 0 4px;font-size:10px;font-weight:800;color:#64748b;letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#3b82f6;"></span>
            ${saleDept.name}
        </div>`;
    }

    childTeams.forEach(team => {
        const teamUsers = sortMembers(saleUsers.filter(u => u.department_id === team.id));
        if (teamUsers.length === 0) return;
        html += `<div style="padding:6px 12px;margin:12px 0 4px;font-size:10px;font-weight:800;color:#64748b;letter-spacing:1px;text-transform:uppercase;display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10b981;"></span>
            ${team.name}
        </div>`;
        teamUsers.forEach(u => { html += renderSidebarUser(u, 0); });
    });

    list.innerHTML = topBtn + html;
}

function sksRenderTreeHTML(userId) {
    if (!_sksTreeData || _sksTreeData.length === 0) {
        return `<div style="text-align:center;padding:12px;color:#94a3b8;font-size:11px;">📭 Chưa có dữ liệu</div>`;
    }

    let html = `<div class="sks-tree-container">`;

    _sksTreeData.forEach(yData => {
        const y = yData.year;
        const yearKey = `year_${y}`;
        const isYearExpanded = _sksExpandedNodes.has(yearKey);
        const isYearActive = _sksSelectedYear === y && _sksSelectedMonth === null && _sksSelectedDay === null;

        html += `
            <div class="sks-tree-node sks-tree-year ${isYearActive ? 'active' : ''}" 
                 onclick="sksSelectNode(${userId}, ${y}, null, null)">
                <span class="node-label">
                    <span onclick="event.stopPropagation(); sksToggleNode('${yearKey}')" style="padding:2px 6px;cursor:pointer;">${isYearExpanded ? '▼' : '▶'}</span>
                    <span>📅 Năm ${y}</span>
                </span>
                <span class="node-badge">${yData.count}</span>
            </div>
        `;

        if (isYearExpanded && yData.months) {
            html += `<div class="sks-tree-children">`;
            yData.months.forEach(mData => {
                const m = mData.month;
                const monthKey = `month_${y}_${m}`;
                const isMonthExpanded = _sksExpandedNodes.has(monthKey);
                const isMonthActive = _sksSelectedYear === y && _sksSelectedMonth === m && _sksSelectedDay === null;

                html += `
                    <div class="sks-tree-node sks-tree-month ${isMonthActive ? 'active' : ''}"
                         onclick="sksSelectNode(${userId}, ${y}, ${m}, null)">
                        <span class="node-label">
                            <span onclick="event.stopPropagation(); sksToggleNode('${monthKey}')" style="padding:2px 6px;cursor:pointer;">${isMonthExpanded ? '▼' : '▶'}</span>
                            <span>📁 Tháng ${m}</span>
                        </span>
                        <span class="node-badge">${mData.count}</span>
                    </div>
                `;

                if (isMonthExpanded && mData.days) {
                    html += `<div class="sks-tree-children">`;
                    mData.days.forEach(dData => {
                        const d = dData.day;
                        const isDayActive = _sksSelectedYear === y && _sksSelectedMonth === m && _sksSelectedDay === d;

                        html += `
                            <div class="sks-tree-node sks-tree-day ${isDayActive ? 'active' : ''}"
                                 onclick="sksSelectNode(${userId}, ${y}, ${m}, ${d})">
                                <span class="node-label">
                                    <span style="visibility:hidden;width:12px;">📄</span>
                                    <span>📄 Ngày ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}</span>
                                </span>
                                <span class="node-badge">${dData.count}</span>
                            </div>
                        `;
                    });
                    html += `</div>`;
                }
            });
            html += `</div>`;
        }
    });

    html += `</div>`;
    return html;
}

function sksToggleNode(nodeKey) {
    if (_sksExpandedNodes.has(nodeKey)) {
        _sksExpandedNodes.delete(nodeKey);
    } else {
        _sksExpandedNodes.add(nodeKey);
    }
    sksRenderSidebar();
}

function sksSelectNode(userId, year, month, day) {
    _sksSelectedYear = year;
    _sksSelectedMonth = month;
    _sksSelectedDay = day;
    _sksCurrentPage = 1;

    updateFilterLabel(userId);
    sksRenderSidebar();
    sksLoadCustomers();
}

function updateFilterLabel(userId) {
    const filterInfo = document.getElementById('sksFilterInfo');
    if (!filterInfo) return;

    let label = '';
    if (_sksSelectedDay) label += `Ngày ${String(_sksSelectedDay).padStart(2,'0')}/${String(_sksSelectedMonth).padStart(2,'0')}/${_sksSelectedYear}`;
    else if (_sksSelectedMonth) label += `Tháng ${_sksSelectedMonth}/${_sksSelectedYear}`;
    else if (_sksSelectedYear) label += `Năm ${_sksSelectedYear}`;
    else label += 'Tất cả thời gian';
    
    let uName = 'Tổng bộ phận';
    if (userId) {
        const u = _sksSidebarUsers.find(x => x.id === userId);
        if (u) uName = u.full_name || u.username;
    }
    filterInfo.textContent = `${uName} • ${label}`;
}

async function sksSelectUser(userId) {
    _sksSidebarSelectedUserId = userId;
    _sksCurrentPage = 1;
    _sksTreeData = [];
    _sksExpandedNodes.clear();

    sksRenderSidebar();

    // Fetch the statistics-tree data for the selected user
    let url = '/api/customers/statistics-tree?crm_type=sale';
    if (userId) url += `&employee_id=${userId}`;

    try {
        const res = await apiCall(url);
        if (res.success) {
            _sksTreeData = res.tree || [];
        }
    } catch (e) {
        console.error('Error fetching stats tree:', e);
    }

    sksAutoSelectDefaultTime();
    updateFilterLabel(userId);
    sksRenderSidebar();
    sksLoadCustomers();
}

function sksAutoSelectDefaultTime() {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curDay = now.getDate();

    // Default expand current Year and Month
    _sksExpandedNodes.add(`year_${curYear}`);
    _sksExpandedNodes.add(`month_${curYear}_${curMonth}`);

    let todayNode = null;
    let fallbackNode = null;

    if (_sksTreeData && _sksTreeData.length > 0) {
        // Find latest available node as fallback
        const latestYearData = _sksTreeData[0];
        if (latestYearData.months && latestYearData.months.length > 0) {
            const latestMonthData = latestYearData.months[0];
            if (latestMonthData.days && latestMonthData.days.length > 0) {
                const latestDayData = latestMonthData.days[0];
                fallbackNode = {
                    year: latestYearData.year,
                    month: latestMonthData.month,
                    day: latestDayData.day
                };
            }
        }

        // Check if today exists in the tree data
        const yData = _sksTreeData.find(y => y.year === curYear);
        if (yData && yData.months) {
            const mData = yData.months.find(m => m.month === curMonth);
            if (mData && mData.days) {
                const dData = mData.days.find(d => d.day === curDay);
                if (dData) {
                    todayNode = { year: curYear, month: curMonth, day: curDay };
                }
            }
        }
    }

    if (todayNode) {
        _sksSelectedYear = todayNode.year;
        _sksSelectedMonth = todayNode.month;
        _sksSelectedDay = todayNode.day;
    } else if (fallbackNode) {
        _sksSelectedYear = fallbackNode.year;
        _sksSelectedMonth = fallbackNode.month;
        _sksSelectedDay = fallbackNode.day;
        
        // Auto expand year and month of the fallback node
        _sksExpandedNodes.add(`year_${fallbackNode.year}`);
        _sksExpandedNodes.add(`month_${fallbackNode.year}_${fallbackNode.month}`);
    } else {
        _sksSelectedYear = null;
        _sksSelectedMonth = null;
        _sksSelectedDay = null;
    }
}

async function sksLoadCustomers() {
    const tbody = document.getElementById('sksTbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;">⏳ Đang tải danh sách khách hàng...</td></tr>`;
    }

    const status = document.getElementById('sksFilterStatus')?.value || '';
    const search = document.getElementById('sksSearch')?.value || '';

    let url = `/api/customers?crm_type=sale`;
    if (_sksSidebarSelectedUserId) url += `&employee_id=${_sksSidebarSelectedUserId}`;
    if (_sksSelectedYear) url += `&year=${_sksSelectedYear}`;
    if (_sksSelectedMonth) url += `&month=${_sksSelectedMonth}`;
    if (_sksSelectedDay) url += `&day=${_sksSelectedDay}`;
    if (status) url += `&order_status=${status}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const data = await apiCall(url);
        _sksAllCustomers = data.customers || [];
        _sksTotalCustomers = _sksAllCustomers.length;
        sksRenderTable();
    } catch (e) {
        console.error('Error fetching customers:', e);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--danger)">❌ Lỗi tải dữ liệu khách hàng:<br>${e.message}<br>${e.stack}</td></tr>`;
        }
    }
}

function sksRenderTable() {
    const tbody = document.getElementById('sksTbody');
    if (!tbody) return;

    try {
        if (_sksAllCustomers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="icon">📭</div><h3>Chưa có khách hàng</h3></div></td></tr>`;
            document.getElementById('sksPagination').innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(_sksAllCustomers.length / _sksPageSize);
        if (_sksCurrentPage > totalPages) _sksCurrentPage = totalPages;
        const startIdx = (_sksCurrentPage - 1) * _sksPageSize;
        const paged = _sksAllCustomers.slice(startIdx, startIdx + _sksPageSize);

        tbody.innerHTML = paged.map(c => {
            const statusBadge = typeof getStatusBadge === 'function' ? getStatusBadge(c.order_status) : c.order_status;
            const custCode = typeof getCustomerCode === 'function' ? getCustomerCode(c) : c.id;
            const formattedDate = typeof formatDate === 'function' ? formatDate(c.created_at) : c.created_at;

            let phoneHTML = '';
            if (c.phone && c.phone.startsWith('pancake_')) {
                const shortId = c.phone.substring(8, 14);
                if (c.facebook_link) {
                    phoneHTML = `<a href="${c.facebook_link}" target="_blank" title="${c.phone}" style="display:inline-flex;align-items:center;gap:6px;color:#2563eb;text-decoration:none;font-weight:600;background:#dbeafe;padding:4px 10px;border-radius:20px;font-size:11px;border:1px solid #93c5fd;transition:all 0.2s;" onmouseover="this.style.background='#bfdbfe'" onmouseout="this.style.background='#dbeafe'">
                        <span style="font-size:12px;">💬</span> Pancake Chat
                    </a>`;
                } else {
                    phoneHTML = `<span title="${c.phone}" style="display:inline-flex;align-items:center;gap:6px;color:#475569;background:#f1f5f9;padding:4px 10px;border-radius:20px;font-size:11px;border:1px solid #e2e8f0;font-family:monospace;">
                        💬 Pancake (${shortId}...)
                    </span>`;
                }
            } else if (c.phone) {
                const displayPhone = c.readonly && typeof _maskPhone === 'function' ? _maskPhone(c.phone) : c.phone;
                phoneHTML = c.readonly 
                    ? `<span style="color:#64748b;font-family:monospace;font-weight:500;font-size:12.5px;">${displayPhone}</span>`
                    : `<a href="tel:${c.phone}" style="display:inline-flex;align-items:center;gap:5px;color:#2563eb;font-family:monospace;font-weight:700;text-decoration:none;font-size:12.5px;padding:3px 8px;border-radius:6px;background:rgba(37,99,235,0.05);border:1px solid rgba(37,99,235,0.1);transition:all 0.2s;" onmouseover="this.style.background='rgba(37,99,235,0.12)';this.style.borderColor='rgba(37,99,235,0.3)'" onmouseout="this.style.background='rgba(37,99,235,0.05)';this.style.borderColor='rgba(37,99,235,0.1)'">
                        📞 ${displayPhone}
                    </a>`;
            } else {
                phoneHTML = '<span style="color:#94a3b8">-</span>';
            }

            return `<tr>
                <td><span style="color:#0f172a;background:#f1f5f9;border:1px solid #cbd5e1;padding:4px 8px;border-radius:6px;font-family:monospace;font-size:12px;font-weight:700;display:inline-block;box-shadow:0 1px 2px rgba(0,0,0,0.05)">${custCode}</span></td>
                <td><span style="font-weight:600;color:#1e293b;font-size:13.5px;">${typeof _crmIsBirthdayToday === 'function' && _crmIsBirthdayToday(c.birthday) ? '🎂🎉 ' : ''}${c.customer_name}</span></td>
                <td>${phoneHTML}</td>
                <td><span style="font-weight:500;color:#475569">${c.source_name || '-'}</span></td>
                <td><span style="font-weight:500;color:#475569">${c.assigned_to_name || '-'}</span></td>
                <td>${statusBadge}</td>
                <td><span style="color:#64748b;font-size:12px;font-weight:500">${formattedDate}</span></td>
                <td>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button class="btn btn-sm" onclick="showCustomerDetail(${c.id})" title="Chi tiết" style="padding:6px 10px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:6px;transition:all 0.2s;font-weight:500;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">👁️ Chi tiết</button>
                        ${!c.readonly && ['giam_doc','quan_ly','truong_phong','nhan_vien'].includes(currentUser.role)
                            ? `<button class="btn btn-sm" onclick="showEditStatus(${c.id}, '${c.order_status}')" title="Cập nhật" style="padding:6px 10px;background:#fff;color:#2563eb;border:1px solid #3b82f6;border-radius:6px;transition:all 0.2s;font-weight:500;" onmouseover="this.style.background='rgba(59,130,246,0.05)'" onmouseout="this.style.background='#fff'">📝 Cập nhật</button>`
                            : ''}
                    </div>
                </td>
            </tr>`;
        }).join('');

        // Pagination
        const pgEl = document.getElementById('sksPagination');
        if (!pgEl) return;
        if (totalPages <= 1) { pgEl.innerHTML = ''; return; }
        
        let pgHtml = '<button ' + (_sksCurrentPage <= 1 ? 'disabled' : '') + ' onclick="sksGoToPage(' + (_sksCurrentPage - 1) + ')">◀</button>';
        for (let p = 1; p <= totalPages; p++) {
            pgHtml += '<button class="' + (p === _sksCurrentPage ? 'active' : '') + '" onclick="sksGoToPage(' + p + ')">' + p + '</button>';
        }
        pgHtml += '<button ' + (_sksCurrentPage >= totalPages ? 'disabled' : '') + ' onclick="sksGoToPage(' + (_sksCurrentPage + 1) + ')">▶</button>';
        pgHtml += '<span class="pg-info">' + (startIdx + 1) + '–' + Math.min(startIdx + _sksPageSize, _sksAllCustomers.length) + ' / ' + _sksAllCustomers.length + '</span>';
        pgEl.innerHTML = pgHtml;
    } catch(err) {
        console.error('Error rendering table:', err);
        tbody.innerHTML = `<tr><td colspan="8" style="color:red;padding:20px;font-size:12px;">Lỗi render table:<br>${err.message}<br>${err.stack}</td></tr>`;
    }
}

function sksGoToPage(page) {
    _sksCurrentPage = page;
    _sksRenderTable();
    document.getElementById('sksTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
