// ========== CƠ CẤU TỔ CHỨC (ORGANIZATIONAL STRUCTURE) ==========

let _deptData = [];
let _deptExpandState = {}; // Track expand/collapse per dept id

async function renderTeamsPage(container) {
    container.innerHTML = `
        <div class="toolbar" style="justify-content:space-between;">
            <div>
                <h3 style="font-weight:700;color:var(--navy);margin:0;">🏢 Cơ Cấu Tổ Chức</h3>
                <div style="font-size:12px;color:var(--gray-500);margin-top:2px;">Quản lý cơ cấu tổ chức phân cấp</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button class="btn btn-sm" onclick="deptCollapseDefault()" style="width:auto;font-size:11px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;">Thu Gọn</button>
                <button class="btn btn-sm" onclick="deptExpandAll()" style="width:auto;font-size:11px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;">Mở Tất Cả</button>
                <button class="btn btn-primary" onclick="showCreateDeptModal()" style="width:auto;font-size:12px;">➕ Thêm cơ cấu</button>
            </div>
        </div>
        <div style="margin:12px 0;">
            <input type="text" id="deptSearch" class="form-control" placeholder="🔍 Tìm đơn vị, tên nhân sự, hoặc username..." oninput="filterDeptTree()" style="max-width:500px;font-size:13px;">
        </div>
        <div id="deptTreeContainer" style="background:white;border-radius:10px;border:1px solid var(--gray-200);overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="background:#122546;color:#fad24c;font-weight:700;font-size:12px;">
                        <th style="padding:10px 14px;text-align:left;">Tên đơn vị</th>
                        <th style="padding:10px 14px;text-align:center;width:120px;">Mã đơn vị</th>
                        <th style="padding:10px 14px;text-align:center;width:150px;">Thuộc đơn vị</th>
                        <th style="padding:10px 14px;text-align:center;width:100px;">Trạng thái</th>
                        <th style="padding:10px 14px;text-align:center;width:130px;">Trưởng đơn vị</th>
                        <th style="padding:10px 14px;text-align:center;width:80px;">NV</th>
                        <th style="padding:10px 14px;text-align:center;width:55px;">STT</th>
                        <th style="padding:10px 14px;text-align:center;width:60px;"></th>
                    </tr>
                </thead>
                <tbody id="deptTreeBody">
                    <tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray-500);">⏳ Đang tải...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    await loadDeptTree();
}

async function loadDeptTree() {
    // Save expand state before reload
    document.querySelectorAll('.dept-toggle').forEach(t => {
        _deptExpandState[t.dataset.id] = t.textContent.trim();
    });
    const data = await apiCall('/api/departments');
    _deptData = data.departments || [];
    renderDeptTree();
    // Default: show Hệ Thống + Phòng Ban, hide Teams
    deptCollapseDefault();
}

// Determine dept level: 0=Hệ Thống, 1=Phòng Ban, 2=Team
function getDeptLevel(dept, allDepts) {
    if (!dept.parent_id) {
        // Root item: only "HỆ THỐNG" named items are true Hệ Thống
        return dept.name.toUpperCase().includes('HỆ THỐNG') ? 0 : 1;
    }
    const parent = allDepts.find(d => d.id === dept.parent_id);
    if (!parent) return 1;
    // If parent is Hệ Thống (level 0) → this is Phòng Ban (level 1)
    const parentLevel = getDeptLevel(parent, allDepts);
    if (parentLevel === 0) return 1;
    // If parent is Phòng Ban (level 1) → this is Team (level 2)
    return 2;
}

const LEVEL_CONFIG = [
    { label: 'Hệ Thống', icon: '🏢', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', fontSize: '14px', fontWeight: '800' },
    { label: 'Phòng Ban', icon: '📁', color: '#0369a1', bg: '#f0f9ff', border: '#7dd3fc', fontSize: '13px', fontWeight: '700' },
    { label: 'Team', icon: '🔸', color: '#122546', bg: 'transparent', border: 'transparent', fontSize: '13px', fontWeight: '600' }
];

function renderDeptTree(filterText, userMatchedDeptIds) {
    const tbody = document.getElementById('deptTreeBody');
    if (!tbody) return;
    if (_deptData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--gray-500);">
            <div style="font-size:24px;margin-bottom:8px;">🏢</div>
            <div>Chưa có đơn vị nào</div>
            <div style="font-size:12px;margin-top:4px;">Bấm "Thêm cơ cấu" để bắt đầu</div>
        </td></tr>`;
        return;
    }

    // Build tree
    const roots = _deptData.filter(d => !d.parent_id);
    const childrenOf = (pid) => _deptData.filter(d => d.parent_id === pid);
    const uMatch = userMatchedDeptIds || new Set();

    let html = '';
    const filter = filterText?.toLowerCase() || '';

    function renderNode(dept, level) {
        const children = childrenOf(dept.id).sort((a, b) => (a.display_order || 999) - (b.display_order || 999) || a.name.localeCompare(b.name, 'vi'));
        const hasChildren = children.length > 0;
        const indent = level * 32;
        const deptLevel = getDeptLevel(dept, _deptData);
        const cfg = LEVEL_CONFIG[deptLevel] || LEVEL_CONFIG[2];

        // Filter
        if (filter) {
            const match = dept.name.toLowerCase().includes(filter) 
                || (dept.code || '').toLowerCase().includes(filter)
                || (dept.head_name || '').toLowerCase().includes(filter);
            // Also check if this dept or descendants have user matches
            function deptOrChildHasUserMatch(dId) {
                if (uMatch.has(dId)) return true;
                return childrenOf(dId).some(c => deptOrChildHasUserMatch(c.id));
            }
            function childMatchDeep(pid) {
                return childrenOf(pid).some(c => 
                    c.name.toLowerCase().includes(filter) 
                    || (c.code || '').toLowerCase().includes(filter)
                    || (c.head_name || '').toLowerCase().includes(filter)
                    || uMatch.has(c.id)
                    || childMatchDeep(c.id)
                );
            }
            if (!match && !deptOrChildHasUserMatch(dept.id) && !childMatchDeep(dept.id)) return;
        }

        const statusBadge = dept.status === 'active'
            ? `<span onclick="event.stopPropagation();toggleDeptStatus(${dept.id},'active')" style="background:#10b981;color:white;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;">Đang Làm Việc</span>`
            : `<span onclick="event.stopPropagation();toggleDeptStatus(${dept.id},'inactive')" style="background:#ef4444;color:white;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;">Nghỉ Việc</span>`;

        const toggleIcon = hasChildren
            ? `<span class="dept-toggle" data-id="${dept.id}" onclick="toggleDeptRow(${dept.id})" style="cursor:pointer;display:inline-block;width:18px;text-align:center;font-size:12px;color:#6b7280;">▼</span>`
            : `<span style="display:inline-block;width:18px;text-align:center;color:#d1d5db;">•</span>`;

        // "Thuộc" column label
        let belongsTo;
        if (deptLevel === 0) {
            belongsTo = '<span style="color:#7c3aed;font-weight:600;">Hệ Thống</span>';
        } else {
            belongsTo = dept.parent_name || '—';
        }

        // Level badge - only show for Hệ Thống
        const levelBadge = deptLevel === 0 
            ? `<span style="background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border};padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;margin-left:6px;">${cfg.label}</span>`
            : '';

        html += `<tr class="dept-row" data-id="${dept.id}" data-parent="${dept.parent_id || ''}" data-level="${level}" style="border-bottom:1px solid #f3f4f6;${deptLevel === 0 ? 'background:#f5f3ff;' : deptLevel === 1 ? 'background:#f8fafc;' : ''}">
            <td style="padding:10px 14px;">
                <div style="padding-left:${indent}px;display:flex;align-items:center;gap:6px;">
                    ${toggleIcon}
                    <span style="font-size:16px;">${cfg.icon}</span>
                    <span onclick="toggleDeptAccordion(${dept.id})" style="font-weight:${cfg.fontWeight};color:${cfg.color};font-size:${cfg.fontSize};cursor:pointer;text-decoration:underline dotted #6b7280;">${dept.name}</span>
                    ${levelBadge}
                </div>
            </td>
            <td style="text-align:center;color:#6b7280;font-family:monospace;font-size:12px;">${dept.code}</td>
            <td style="text-align:center;color:#6b7280;font-size:12px;">${belongsTo}</td>
            <td style="text-align:center;">${statusBadge}</td>
            <td style="text-align:center;font-size:12px;color:#122546;font-weight:600;">${dept.head_name || '<span style="color:#d1d5db;">—</span>'}</td>
            <td style="text-align:center;font-weight:700;color:#122546;">${dept.member_count || 0}</td>
            <td style="text-align:center;">
                <input type="number" value="${dept.display_order || 0}" min="0" max="999"
                    onchange="saveDeptOrder(${dept.id}, this.value)"
                    onblur="saveDeptOrder(${dept.id}, this.value)"
                    style="width:42px;text-align:center;border:1px solid #cbd5e1;border-radius:6px;padding:3px 2px;font-size:12px;font-weight:700;color:#122546;background:#f8fafc;"
                    onclick="event.stopPropagation();this.select()">
            </td>
            <td style="text-align:center;">
                <div style="display:flex;gap:4px;justify-content:center;">
                    <button onclick="showEditDeptModal(${dept.id})" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Sửa">✏️</button>
                    ${deptLevel !== 0 ? `<button onclick="showDeptMembers(${dept.id})" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Nhân sự">👥</button>` : ''}
                    <button onclick="deleteDept(${dept.id},'${dept.name.replace(/'/g, "\\'")}')" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Xóa">🗑️</button>
                </div>
            </td>
        </tr>
        <tr class="dept-accordion" data-dept-acc="${dept.id}" style="display:none;">
            <td colspan="8" style="padding:0;">
                <div id="deptAcc_${dept.id}" style="background:#f0f4ff;padding:12px 20px 12px ${indent + 40}px;border-bottom:2px solid #c7d2fe;">
                    <div style="text-align:center;color:#6b7280;font-size:12px;">⏳ Đang tải...</div>
                </div>
            </td>
        </tr>`;

        children.forEach(c => renderNode(c, level + 1));
    }

    // Sort roots: "HỆ THỐNG" named items always first, then alphabetically
    roots.sort((a, b) => {
        const aIsHT = a.name.toUpperCase().includes('HỆ THỐNG');
        const bIsHT = b.name.toUpperCase().includes('HỆ THỐNG');
        if (aIsHT && !bIsHT) return -1;
        if (!aIsHT && bIsHT) return 1;
        return a.name.localeCompare(b.name, 'vi');
    });
    roots.forEach(r => renderNode(r, 0));
    tbody.innerHTML = html || '<tr><td colspan="8" style="text-align:center;padding:20px;color:#6b7280;">Không tìm thấy</td></tr>';
}

function toggleDeptRow(id) {
    const rows = document.querySelectorAll('.dept-row');
    const toggle = document.querySelector(`.dept-toggle[data-id="${id}"]`);
    const isCollapsed = toggle?.textContent?.trim() === '▶';

    // Find all descendant rows
    const descendants = [];
    function findDescendants(pid) {
        rows.forEach(r => {
            if (Number(r.dataset.parent) === pid) {
                descendants.push(r);
                findDescendants(Number(r.dataset.id));
            }
        });
    }
    findDescendants(id);

    descendants.forEach(r => {
        r.style.display = isCollapsed ? '' : 'none';
        // If expanding, also reset child toggles to expanded
        if (isCollapsed) {
            const ct = r.querySelector('.dept-toggle');
            if (ct) ct.textContent = '▼';
        }
    });

    if (toggle) toggle.textContent = isCollapsed ? '▼' : '▶';
}

async function deptExpandAll() {
    document.querySelectorAll('.dept-row').forEach(r => r.style.display = '');
    document.querySelectorAll('.dept-toggle').forEach(t => t.textContent = '▼');
    // Also open all member accordions
    const accRows = document.querySelectorAll('.dept-accordion');
    for (const accRow of accRows) {
        const deptId = accRow.dataset.deptAcc;
        if (accRow.style.display === 'none') {
            await toggleDeptAccordion(Number(deptId));
        }
    }
}

function deptCollapseAll() {
    document.querySelectorAll('.dept-row').forEach(r => {
        if (Number(r.dataset.level) > 0) r.style.display = 'none';
    });
    document.querySelectorAll('.dept-toggle').forEach(t => t.textContent = '▶');
}

// Default collapse: show Hệ Thống (level 0) + Phòng Ban (level 1), hide Teams (level 2+)
function deptCollapseDefault() {
    document.querySelectorAll('.dept-row').forEach(r => {
        const lvl = Number(r.dataset.level);
        if (lvl >= 2) {
            r.style.display = 'none';
        } else {
            r.style.display = '';
        }
    });
    // Phòng Ban toggles that have Team children: set to ▶
    document.querySelectorAll('.dept-toggle').forEach(t => {
        const id = Number(t.dataset.id);
        const row = t.closest('.dept-row');
        const rowLevel = row ? Number(row.dataset.level) : 0;
        // Level 1 depts (Phòng) with children (Teams): collapsed
        if (rowLevel >= 1) t.textContent = '▶';
        else t.textContent = '▼'; // Hệ Thống: expanded
    });
    // Close all open member accordions
    document.querySelectorAll('.dept-accordion').forEach(a => a.style.display = 'none');
}

let _deptSearchTimer = null;
function filterDeptTree() {
    clearTimeout(_deptSearchTimer);
    _deptSearchTimer = setTimeout(async () => {
        const text = (document.getElementById('deptSearch')?.value || '').trim();
        if (!text) {
            renderDeptTree();
            deptCollapseDefault();
            return;
        }
        // Also search users by name/username
        try {
            const usersData = await apiCall('/api/users');
            const allUsers = usersData.users || [];
            const filter = text.toLowerCase();
            const matchedDeptIds = new Set();
            allUsers.forEach(u => {
                if ((u.full_name || '').toLowerCase().includes(filter) || (u.username || '').toLowerCase().includes(filter)) {
                    if (u.department_id) matchedDeptIds.add(u.department_id);
                    // Also add parent chain
                    let dept = _deptData.find(d => d.id === u.department_id);
                    while (dept && dept.parent_id) {
                        matchedDeptIds.add(dept.parent_id);
                        dept = _deptData.find(d => d.id === dept.parent_id);
                    }
                }
            });
            // Render with text filter + user-matched dept IDs
            renderDeptTree(text, matchedDeptIds);
            // Expand all visible + open accordions of matched depts
            document.querySelectorAll('.dept-row').forEach(r => r.style.display = '');
            document.querySelectorAll('.dept-toggle').forEach(t => t.textContent = '▼');
            // Open accordions for depts that have matching users
            for (const deptId of matchedDeptIds) {
                const accRow = document.querySelector(`tr[data-dept-acc="${deptId}"]`);
                if (accRow && accRow.style.display === 'none') {
                    await toggleDeptAccordion(deptId);
                }
            }
        } catch(e) {
            renderDeptTree(text);
            deptExpandAll();
        }
    }, 300);
}

async function toggleDeptAccordion(deptId) {
    const accRow = document.querySelector(`tr[data-dept-acc="${deptId}"]`);
    if (!accRow) return;

    if (accRow.style.display !== 'none') {
        accRow.style.display = 'none';
        return;
    }

    accRow.style.display = '';
    const container = document.getElementById(`deptAcc_${deptId}`);
    container.innerHTML = '<div style="text-align:center;color:#6b7280;font-size:12px;">⏳ Đang tải...</div>';

    const data = await apiCall(`/api/departments/${deptId}`);
    const members = data.members || [];
    const dept = data.department;

    if (members.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#6b7280;font-size:12px;padding:8px;">Chưa có nhân viên</div>';
        return;
    }

    let tbl = `<table style="width:100%;font-size:12px;border-collapse:collapse;">
        <thead><tr style="background:#122546;">
            <th style="padding:6px 10px;text-align:left;color:#fad24c;">#</th>
            <th style="padding:6px 10px;text-align:left;color:#fad24c;">Họ tên</th>
            <th style="padding:6px 10px;text-align:center;color:#fad24c;">Vai trò</th>
            <th style="padding:6px 10px;text-align:center;color:#fad24c;">SĐT</th>
            <th style="padding:6px 10px;text-align:center;color:#fad24c;">Trạng thái</th>
            <th style="padding:6px 10px;text-align:center;color:#fad24c;">Sinh nhật</th>
        </tr></thead><tbody>`;

    // Sort: trưởng phòng (head) first, then nhân viên
    const sorted = [...members].sort((a, b) => {
        const aHead = dept && dept.head_user_id === a.id ? 0 : 1;
        const bHead = dept && dept.head_user_id === b.id ? 0 : 1;
        return aHead - bHead;
    });

    sorted.forEach((m, i) => {
        const isHead = dept && dept.head_user_id === m.id;
        const ROLE_MAP = { giam_doc: 'Giám Đốc', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng', nhan_vien: 'Nhân Viên', hoa_hong: 'Hoa Hồng' };
        const headBadge = isHead ? ' <span style="background:#fef3c7;color:#92400e;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;border:1px solid #f59e0b44;">⭐ Trưởng đơn vị</span>' : '';
        const roleLabel = `<span style="color:${isHead ? '#d97706' : '#6b7280'};font-weight:${isHead ? '700' : '400'};">${ROLE_MAP[m.role] || m.role}</span>${headBadge}`;
        const statusBg = m.status === 'active' ? '#10b981' : '#ef4444';
        const statusLabel = m.status === 'active' ? 'Đang làm' : 'Nghỉ việc';
        const birthday = m.birth_date ? new Date(m.birth_date).toLocaleDateString('vi-VN') : '—';

        tbl += `<tr onclick="showEditAccountModal(${m.id})" style="cursor:pointer;border-top:1px solid #e5e7eb;" onmouseover="this.style.background='#eef2ff'" onmouseout="this.style.background=''">
            <td style="padding:5px 10px;color:#6b7280;">${i + 1}</td>
            <td style="padding:5px 10px;font-weight:600;color:#122546;">${m.full_name}</td>
            <td style="padding:5px 10px;text-align:center;">${roleLabel}</td>
            <td style="padding:5px 10px;text-align:center;color:#6b7280;">${m.phone || '—'}</td>
            <td style="padding:5px 10px;text-align:center;"><span style="background:${statusBg};color:white;padding:1px 8px;border-radius:8px;font-size:10px;">${statusLabel}</span></td>
            <td style="padding:5px 10px;text-align:center;color:#6b7280;">${birthday}</td>
        </tr>`;
    });

    tbl += '</tbody></table>';
    container.innerHTML = tbl;
}

async function toggleDeptStatus(deptId, currentStatus) {
    const dept = _deptData.find(d => d.id === deptId);
    const deptName = dept ? dept.name : 'Đơn vị';

    const bodyHTML = `
        <div style="text-align:center;padding:10px 0;">
            <div style="font-size:14px;color:#122546;margin-bottom:16px;">Chọn trạng thái cho <b>${deptName}</b>:</div>
            <div style="display:flex;flex-direction:column;gap:10px;max-width:300px;margin:0 auto;">
                <button onclick="confirmDeptStatus(${deptId},'active')" class="btn" 
                    style="padding:12px;font-size:14px;font-weight:700;border-radius:10px;border:2px solid ${currentStatus === 'active' ? '#10b981' : '#e5e7eb'};
                    background:${currentStatus === 'active' ? '#ecfdf5' : 'white'};color:#10b981;cursor:pointer;">
                    ✅ Đang Làm Việc
                </button>
                <button onclick="confirmDeptStatus(${deptId},'inactive')" class="btn"
                    style="padding:12px;font-size:14px;font-weight:700;border-radius:10px;border:2px solid ${currentStatus === 'inactive' ? '#ef4444' : '#e5e7eb'};
                    background:${currentStatus === 'inactive' ? '#fef2f2' : 'white'};color:#ef4444;cursor:pointer;">
                    🚫 Cho Nghỉ Việc
                </button>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-top:14px;">
                ⚠️ Cho Nghỉ Việc sẽ khóa đăng nhập tất cả nhân viên trong đơn vị
            </div>
        </div>
    `;

    openModal('🔄 Thay đổi trạng thái', bodyHTML, `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
    `);
}

async function confirmDeptStatus(deptId, newStatus) {
    const label = newStatus === 'active' ? 'Đang Làm Việc' : 'Cho Nghỉ Việc';
    const data = await apiCall(`/api/departments/${deptId}`, 'PUT', { status: newStatus });
    if (data.success) {
        showToast(`✅ Đã chuyển sang: ${label}`);
        closeModal();
        await loadDeptTree();
    } else {
        showToast(data.error || 'Lỗi!', 'error');
    }
}

// Builds hierarchical <option> list, optionally filtered by allowed parent levels
// allowLevels: if provided, only show depts at those levels (0=Hệ Thống, 1=Phòng Ban)
function buildDeptOptions(departments, selectedId, excludeId, allowLevels) {
    const roots = departments.filter(d => !d.parent_id);
    const childrenOf = (pid) => departments.filter(d => d.parent_id === pid);
    let html = '<option value="">-- Không có (Hệ Thống) --</option>';

    function addOpt(dept, level) {
        if (dept.id === excludeId) return;
        const deptLevel = getDeptLevel(dept, departments);
        const cfg = LEVEL_CONFIG[deptLevel] || LEVEL_CONFIG[2];
        // If allowLevels specified, only show matching levels
        if (allowLevels && !allowLevels.includes(deptLevel)) {
            // Still recurse into children in case they match
            childrenOf(dept.id).forEach(c => addOpt(c, level + 1));
            return;
        }
        const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(level);
        const sel = dept.id === selectedId ? 'selected' : '';
        html += `<option value="${dept.id}" ${sel}>${indent}${cfg.icon} ${dept.name} (${cfg.label})</option>`;
        childrenOf(dept.id).forEach(c => addOpt(c, level + 1));
    }

    roots.forEach(r => addOpt(r, 0));
    return html;
}

async function showCreateDeptModal() {
    const data = await apiCall('/api/departments');
    const depts = data.departments || [];

    const bodyHTML = `
        <div class="form-group">
            <label>Cấp tổ chức <span style="color:var(--danger)">*</span></label>
            <select id="deptLevel" class="form-control" onchange="onCreateDeptLevelChange()" style="font-weight:700;">
                <option value="0">🏢 Hệ Thống</option>
                <option value="1">📁 Phòng Ban</option>
                <option value="2">📂 Team</option>
            </select>
        </div>
        <div class="form-group">
            <label>Tên <span id="deptLevelLabel">Hệ Thống</span> <span style="color:var(--danger)">*</span></label>
            <input type="text" id="deptName" class="form-control" placeholder="VD: HỆ THỐNG KINH DOANH">
        </div>
        <div class="form-group">
            <label>Mã <span style="color:var(--danger)">*</span></label>
            <input type="text" id="deptCode" class="form-control" placeholder="VD: HTKD">
        </div>
        <div class="form-group" id="deptParentGroup" style="display:none;">
            <label id="deptParentLabel">Thuộc Hệ Thống</label>
            <select id="deptParent" class="form-control">
                ${buildDeptOptions(depts)}
            </select>
        </div>
        <div class="form-group">
            <label>Trạng thái</label>
            <select id="deptStatus" class="form-control">
                <option value="active">Đang Làm Việc</option>
                <option value="inactive">Cho Nghỉ Việc</option>
            </select>
        </div>
        <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:10px 14px;margin-top:8px;font-size:12px;color:#4338ca;display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">ℹ️</span>
            <span>Cấu trúc: <b>Hệ Thống</b> → <b>Phòng Ban</b> → <b>Team</b></span>
        </div>
    `;

    openModal('⊕ Thêm cơ cấu tổ chức mới', bodyHTML, `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy bỏ</button>
        <button class="btn btn-primary" onclick="submitCreateDept()" style="width:auto;">➕ Tạo mới</button>
    `);
}

function onCreateDeptLevelChange() {
    const level = Number(document.getElementById('deptLevel').value);
    const parentGroup = document.getElementById('deptParentGroup');
    const parentLabel = document.getElementById('deptParentLabel');
    const parentSelect = document.getElementById('deptParent');
    const levelLabel = document.getElementById('deptLevelLabel');
    const nameInput = document.getElementById('deptName');

    const labels = ['Hệ Thống', 'Phòng Ban', 'Team'];
    const placeholders = ['VD: HỆ THỐNG KINH DOANH', 'VD: Phòng Kinh Doanh', 'VD: Team Cắt Cạnh'];
    levelLabel.textContent = labels[level];
    nameInput.placeholder = placeholders[level];

    if (level === 0) {
        // Hệ Thống: no parent
        parentGroup.style.display = 'none';
        parentSelect.innerHTML = '<option value="">-- Không có --</option>';
    } else if (level === 1) {
        // Phòng Ban: parent must be true Hệ Thống (name contains 'HỆ THỐNG')
        parentGroup.style.display = '';
        parentLabel.textContent = 'Thuộc Hệ Thống';
        const depts = _deptData;
        const systems = depts.filter(d => !d.parent_id && d.name.toUpperCase().includes('HỆ THỐNG'));
        parentSelect.innerHTML = '<option value="">-- Chọn Hệ Thống --</option>' + systems.map(s => `<option value="${s.id}">🏢 ${s.name}</option>`).join('');
    } else {
        // Team: parent must be Phòng Ban (non-Hệ Thống root items + level 1 items)
        parentGroup.style.display = '';
        parentLabel.textContent = 'Thuộc Phòng Ban';
        const depts = _deptData;
        const donVis = depts.filter(d => {
            if (getDeptLevel(d, depts) === 1) return true; // actual level 1
            if (!d.parent_id && !d.name.toUpperCase().includes('HỆ THỐNG')) return true; // legacy root (not Hệ Thống)
            return false;
        });
        parentSelect.innerHTML = '<option value="">-- Chọn Phòng Ban --</option>' + donVis.map(dv => `<option value="${dv.id}">📁 ${dv.name}</option>`).join('');
    }
}

async function submitCreateDept() {
    const name = document.getElementById('deptName').value.trim();
    const code = document.getElementById('deptCode').value.trim();
    if (!name) { showToast('Nhập tên đơn vị', 'error'); return; }
    if (!code) { showToast('Nhập mã đơn vị', 'error'); return; }

    const body = {
        name,
        code,
        parent_id: document.getElementById('deptParent').value || null,
        status: document.getElementById('deptStatus').value
    };

    const data = await apiCall('/api/departments', 'POST', body);
    if (data.success) {
        showToast('✅ ' + data.message);
        closeModal();
        await loadDeptTree();
    } else {
        showToast(data.error || 'Lỗi!', 'error');
    }
}

async function showEditDeptModal(deptId) {
    const [deptData, allData, staffData] = await Promise.all([
        apiCall(`/api/departments/${deptId}`),
        apiCall('/api/departments'),
        apiCall('/api/users/dropdown')
    ]);
    const dept = deptData.department;
    if (!dept) { showToast('Không tìm thấy đơn vị', 'error'); return; }
    const allDepts = allData.departments || [];
    const allStaff = staffData.users || [];
    const deptLevel = getDeptLevel(dept, allDepts);
    // Head candidates by current level
    const headRolesByLevel = [['giam_doc', 'pho_giam_doc', 'trinh'], ['quan_ly', 'trinh'], ['truong_phong', 'to_truong']];
    const headRoles = headRolesByLevel[deptLevel] || headRolesByLevel[2];
    // Allow 1 person to be head of multiple departments
    const headCandidates = allStaff.filter(u => headRoles.includes(u.role));
    const headRoleLabelMap = ['Giám Đốc / PGĐ / Trinh', 'Quản Lý / Trinh', 'Trưởng Phòng / Tổ Trưởng'];
    const headRoleLabel = headRoleLabelMap[deptLevel] || headRoleLabelMap[2];
    // Store for dynamic onchange
    window._editDeptAllDepts = allDepts;
    window._editDeptAllStaff = allStaff;
    window._editDeptId = deptId;
    window._editDeptOtherHeadIds = [];

    // Build parent options for each level
    const parentOptsLevel1 = allDepts.filter(d => !d.parent_id && d.id !== deptId && d.name.toUpperCase().includes('HỆ THỐNG')).map(s => `<option value="${s.id}" ${dept.parent_id === s.id ? 'selected' : ''}>🏢 ${s.name}</option>`).join('');
    const parentOptsLevel2 = allDepts.filter(d => d.parent_id && getDeptLevel(d, allDepts) === 1 && d.id !== deptId).map(dv => `<option value="${dv.id}" ${dept.parent_id === dv.id ? 'selected' : ''}>📁 ${dv.name}</option>`).join('');

    const bodyHTML = `
        <div class="form-group">
            <label>Tên đơn vị <span style="color:var(--danger)">*</span></label>
            <input type="text" id="editDeptName" class="form-control" value="${dept.name}">
        </div>
        <div class="form-group">
            <label>Mã đơn vị <span style="color:var(--danger)">*</span></label>
            <input type="text" id="editDeptCode" class="form-control" value="${dept.code}">
        </div>
        <div class="form-group">
            <label>Cấp tổ chức</label>
            <select id="editDeptLevel" class="form-control" onchange="onEditDeptLevelChange()" style="font-weight:700;">
                <option value="0" ${deptLevel === 0 ? 'selected' : ''}>🏢 Hệ Thống</option>
                <option value="1" ${deptLevel === 1 ? 'selected' : ''}>📁 Phòng Ban</option>
                <option value="2" ${deptLevel === 2 ? 'selected' : ''}>📂 Team</option>
            </select>
        </div>
        <div class="form-group" id="editDeptParentGroup" style="${deptLevel === 0 ? 'display:none;' : ''}">
            <label id="editDeptParentLabel">Thuộc ${deptLevel === 1 ? 'Hệ Thống' : deptLevel === 2 ? 'Phòng Ban' : ''}</label>
            <select id="editDeptParent" class="form-control">
                ${deptLevel === 0
                    ? '<option value="">-- Không có --</option>'
                    : deptLevel === 1
                        ? '<option value="">-- Chọn Hệ Thống --</option>' + parentOptsLevel1
                        : '<option value="">-- Chọn Phòng Ban --</option>' + parentOptsLevel2
                }
            </select>
        </div>
        <div id="editDeptHeadGroup">
            <div class="form-group">
                <label>Trưởng đơn vị <span style="font-size:11px;color:#6b7280;">(${headRoleLabel})</span></label>
                <select id="editDeptHead" class="form-control">
                    <option value="">— Chưa gán —</option>
                    ${headCandidates.map(u => `<option value="${u.id}" ${u.id === dept.head_user_id ? 'selected' : ''}>${u.full_name}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Trạng thái</label>
            <select id="editDeptStatus" class="form-control">
                <option value="active" ${dept.status === 'active' ? 'selected' : ''}>Đang Làm Việc</option>
                <option value="inactive" ${dept.status === 'inactive' ? 'selected' : ''}>Cho Nghỉ Việc</option>
            </select>
        </div>
    `;

    openModal(`✏️ Sửa ${LEVEL_CONFIG[deptLevel]?.label || 'đơn vị'}: ${dept.name}`, bodyHTML, `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="submitEditDept(${deptId})" style="width:auto;">💾 Lưu</button>
    `);
}

function onEditDeptLevelChange() {
    const level = Number(document.getElementById('editDeptLevel').value);
    const parentGroup = document.getElementById('editDeptParentGroup');
    const parentLabel = document.getElementById('editDeptParentLabel');
    const parentSelect = document.getElementById('editDeptParent');
    const headGroup = document.getElementById('editDeptHeadGroup');
    const depts = window._editDeptAllDepts || _deptData;
    const deptId = window._editDeptId;

    if (level === 0) {
        parentGroup.style.display = 'none';
        parentSelect.innerHTML = '<option value="">-- Không có --</option>';
        headGroup.style.display = '';
    } else if (level === 1) {
        parentGroup.style.display = '';
        parentLabel.textContent = 'Thuộc Hệ Thống';
        const systems = depts.filter(d => !d.parent_id && d.id !== deptId && d.name.toUpperCase().includes('HỆ THỐNG'));
        parentSelect.innerHTML = '<option value="">-- Chọn Hệ Thống --</option>' + systems.map(s => `<option value="${s.id}">🏢 ${s.name}</option>`).join('');
        headGroup.style.display = '';
    } else {
        parentGroup.style.display = '';
        parentLabel.textContent = 'Thuộc Phòng Ban';
        const donVis = depts.filter(d => {
            if (d.id === deptId) return false;
            if (getDeptLevel(d, depts) === 1) return true;
            if (!d.parent_id && !d.name.toUpperCase().includes('HỆ THỐNG')) return true;
            return false;
        });
        parentSelect.innerHTML = '<option value="">-- Chọn Phòng Ban --</option>' + donVis.map(dv => `<option value="${dv.id}">📁 ${dv.name}</option>`).join('');
        headGroup.style.display = '';
    }
}

async function submitEditDept(deptId) {
    const body = {
        name: document.getElementById('editDeptName').value.trim(),
        code: document.getElementById('editDeptCode').value.trim(),
        parent_id: document.getElementById('editDeptParent').value || null,
        head_user_id: document.getElementById('editDeptHead').value || null,
        status: document.getElementById('editDeptStatus').value
    };
    if (!body.name || !body.code) { showToast('Tên và mã là bắt buộc', 'error'); return; }

    const data = await apiCall(`/api/departments/${deptId}`, 'PUT', body);
    if (data.success) {
        showToast('✅ ' + data.message);
        // Re-open edit modal with fresh data (preserve modal)
        await loadDeptTree();
        await showEditDeptModal(deptId);
    } else {
        showToast(data.error || 'Lỗi!', 'error');
    }
}

async function deleteDept(deptId, name) {
    if (!window.confirm(`Xóa đơn vị "${name}"?\nCác đơn vị con sẽ trở thành đơn vị gốc.`)) return;
    const data = await apiCall(`/api/departments/${deptId}`, 'DELETE');
    if (data.success) {
        showToast('✅ Đã xóa');
        await loadDeptTree();
    } else {
        showToast(data.error || 'Lỗi!', 'error');
    }
}

async function showDeptMembers(deptId) {
    const [deptData, staffData] = await Promise.all([
        apiCall(`/api/departments/${deptId}`),
        apiCall('/api/users/dropdown')
    ]);
    const dept = deptData.department;
    const members = deptData.members || [];
    const allStaff = staffData.users || [];
    // Exclude users already in this dept, giam_doc, already assigned to ANOTHER dept
    const available = allStaff.filter(u => !members.find(m => m.id === u.id) && u.role !== 'giam_doc' && (!u.department_id || u.department_id === deptId));

    const ROLE_LABELS = { giam_doc: 'Giám Đốc', quan_ly: 'Quản Lý', truong_phong: 'Trưởng Phòng', nhan_vien: 'Nhân Viên', hoa_hong: 'Hoa Hồng' };

    const membersHTML = members.length > 0 ? members.map(m => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #f3f4f6;">
            <div style="width:32px;height:32px;border-radius:50%;background:#122546;color:#fad24c;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">
                ${m.full_name.split(' ').map(w=>w[0]).join('').slice(0,2)}
            </div>
            <div style="flex:1;">
                <div style="font-weight:600;color:#122546;font-size:13px;">${m.full_name}</div>
                <div style="font-size:11px;color:#6b7280;">${ROLE_LABELS[m.role] || m.role}</div>
            </div>
            <button onclick="unassignDeptMember(${deptId},${m.id})" class="btn btn-sm" style="background:#ef4444;color:white;font-size:10px;padding:3px 8px;">Gỡ</button>
        </div>
    `).join('') : '<div style="text-align:center;padding:20px;color:#6b7280;">Chưa có nhân viên</div>';

    const bodyHTML = `
        <div style="margin-bottom:16px;">
            <div style="font-size:12px;font-weight:700;color:#122546;margin-bottom:8px;">📌 Thêm nhân viên vào đơn vị</div>
            <div style="display:flex;gap:8px;">
                <select id="addMemberSelect" class="form-control" style="font-size:12px;">
                    <option value="">Chọn nhân viên...</option>
                    ${available.map(u => `<option value="${u.id}">${u.full_name} (${ROLE_LABELS[u.role] || u.role})</option>`).join('')}
                </select>
                <button class="btn btn-primary" onclick="assignDeptMember(${deptId})" style="width:auto;font-size:12px;white-space:nowrap;">➕ Thêm</button>
            </div>
        </div>
        <div style="font-size:12px;font-weight:700;color:#122546;margin-bottom:8px;">👥 Danh sách nhân viên (${members.length})</div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;max-height:300px;overflow-y:auto;">
            ${membersHTML}
        </div>
    `;

    openModal(`👥 ${dept.name} — Quản lý nhân sự`, bodyHTML, `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
    `);
}

async function assignDeptMember(deptId) {
    const userId = document.getElementById('addMemberSelect')?.value;
    if (!userId) { showToast('Chọn nhân viên', 'error'); return; }
    const data = await apiCall(`/api/departments/${deptId}/assign`, 'POST', { user_id: Number(userId) });
    if (data.success) {
        showToast('✅ ' + data.message);
        showDeptMembers(deptId);
        loadDeptTree();
    }
}

async function unassignDeptMember(deptId, userId) {
    if (!window.confirm('Gỡ nhân viên khỏi đơn vị?')) return;
    const data = await apiCall(`/api/departments/${deptId}/unassign`, 'POST', { user_id: userId });
    if (data.success) {
        showToast('✅ ' + data.message);
        showDeptMembers(deptId);
        loadDeptTree();
    }
}

// ========== INLINE ORDER SAVE ==========
let _orderSaveTimers = {};
async function saveDeptOrder(deptId, value) {
    const order = Number(value) || 0;
    // Debounce per dept
    clearTimeout(_orderSaveTimers[deptId]);
    _orderSaveTimers[deptId] = setTimeout(async () => {
        // Save expand state before reload
        const expandState = {};
        document.querySelectorAll('.dept-toggle').forEach(t => {
            expandState[t.dataset.id] = t.textContent.trim();
        });
        const data = await apiCall(`/api/departments/${deptId}`, 'PUT', { display_order: order });
        if (data.success) {
            // Reload tree and restore expand state
            const dData = await apiCall('/api/departments');
            _deptData = dData.departments || [];
            renderDeptTree();
            // Restore expand states
            document.querySelectorAll('.dept-toggle').forEach(t => {
                const id = t.dataset.id;
                if (expandState[id] === '▶') {
                    t.textContent = '▶';
                    // Hide descendants
                    document.querySelectorAll(`.dept-row[data-parent="${id}"]`).forEach(r => {
                        r.style.display = 'none';
                        // Recursively hide
                        function hideChildren(pid) {
                            document.querySelectorAll(`.dept-row[data-parent="${pid}"]`).forEach(cr => {
                                cr.style.display = 'none';
                                hideChildren(cr.dataset.id);
                            });
                        }
                        hideChildren(r.dataset.id);
                    });
                }
            });
        }
    }, 400);
}
