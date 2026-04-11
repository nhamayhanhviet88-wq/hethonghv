// ========== TÀI KHOẢN AFFILIATE PAGE ==========
const AFF_ROLES = ['tkaffiliate'];

async function renderTaiKhoanAffiliatePage(container) {
    container.innerHTML = `
        <div class="toolbar">
            <div class="toolbar-filters">
                <select class="form-control" id="affFilterRole" onchange="loadAffAccounts()" style="display:none;">
                    <option value="tkaffiliate">TK Affiliate</option>
                </select>
                <select class="form-control" id="affFilterStatus" onchange="loadAffAccounts()">
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Đang hợp tác</option>
                    <option value="locked">Đã dừng</option>
                </select>
                <select class="form-control" id="affFilterCrm" onchange="loadAffAccounts()">
                    <option value="">Tất cả CRM</option>
                    <option value="nhu_cau">KH Nhu Cầu</option>
                    <option value="ctv">CTV</option>
                    <option value="tu_tim_kiem">GV / HS / SV</option>
                    <option value="goi_hop_tac">NS/KT/P.Mua Hàng</option>
                    <option value="goi_ban_hang">TT/Thời Trang</option>
                    <option value="koc_tiktok">KOC/KOL Tiktok</option>
                </select>
                <input type="text" class="form-control" id="affFilterSearch" placeholder="🔍 Tìm tên, SĐT..." oninput="loadAffAccounts()" style="min-width:180px;">
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button class="btn" onclick="affExpandAll()" style="width:auto;background:#dbeafe;color:#1e40af;font-size:12px;padding:6px 14px;">📂 Mở rộng</button>
                <button class="btn" onclick="affCollapseAll()" style="width:auto;background:#fef3c7;color:#92400e;font-size:12px;padding:6px 14px;">📁 Thu gọn</button>
                <button class="btn btn-primary" onclick="showCreateAffModal()" style="width:auto;">
                    ➕ Thêm TK Affiliate
                </button>
            </div>
        </div>
        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Họ tên</th>
                            <th>Tài khoản</th>
                            <th>Vai trò</th>
                            <th>CRM</th>
                            <th>SĐT</th>
                            <th>Trạng thái</th>

                            <th>Số Người GT</th>
                            <th>Tầng Chiết Khấu</th>
                            <th>Số Ngày Hợp Tác</th>
                            <th>Phân Tầng</th>
                            <th style="text-align:center;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="affTableBody">
                        <tr><td colspan="11" class="text-center text-muted" style="padding:40px;">Đang tải...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    await loadAffAccounts();
}

async function loadAffAccounts() {
    const statusFilter = document.getElementById('affFilterStatus')?.value || '';
    const crmFilter = document.getElementById('affFilterCrm')?.value || '';
    const searchQ = (document.getElementById('affFilterSearch')?.value || '').toLowerCase().trim();
    const CRM_MAP = {nhu_cau:'KH Nhu Cầu',ctv:'CTV',tu_tim_kiem:'Tự Tìm Kiếm',goi_hop_tac:'GĐ Hợp Tác',goi_ban_hang:'GĐ Bán Hàng',koc_tiktok:'KOC Tiktok'};
    const tbody = document.getElementById('affTableBody');

    const data = await apiCall('/api/affiliate/org-tree');
    const departments = data.departments || [];
    const employees = data.employees || [];
    let affiliates = data.affiliates || [];

    // Frontend filters
    if (statusFilter) affiliates = affiliates.filter(u => u.status === statusFilter);
    if (crmFilter) affiliates = affiliates.filter(u => u.source_crm_type === crmFilter);
    if (searchQ) {
        affiliates = affiliates.filter(u =>
            (u.full_name || '').toLowerCase().includes(searchQ) ||
            (u.phone || '').includes(searchQ) ||
            (u.username || '').toLowerCase().includes(searchQ)
        );
    }

    if (affiliates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><div class="icon">🔑</div><h3>Không tìm thấy tài khoản affiliate</h3><p>Thử thay đổi bộ lọc</p></div></td></tr>`;
        return;
    }

    // Sort by cooperation days (most days first = oldest created_at first)
    affiliates.sort((a, b) => new Date(a.created_at || '9999') - new Date(b.created_at || '9999'));

    // Build lookup maps
    const deptById = {};
    departments.forEach(d => { deptById[d.id] = d; });
    const empById = {};
    employees.forEach(e => { empById[e.id] = e; });
    const affById = {};
    affiliates.forEach(a => { affById[a.id] = a; });

    // Affiliate parent→child map
    const affChildrenMap = {};
    affiliates.forEach(a => {
        if (a.assigned_to_user_id && affById[a.assigned_to_user_id]) {
            if (!affChildrenMap[a.assigned_to_user_id]) affChildrenMap[a.assigned_to_user_id] = [];
            affChildrenMap[a.assigned_to_user_id].push(a);
        }
    });

    // Group affiliates by managed_by_user_id (employee)
    const affByEmp = {};
    affiliates.forEach(a => {
        const eid = a.managed_by_user_id;
        if (!affByEmp[eid]) affByEmp[eid] = [];
        affByEmp[eid].push(a);
    });

    // Group employees by department_id
    const empByDept = {};
    employees.forEach(e => {
        const did = e.department_id || 0;
        if (!empByDept[did]) empByDept[did] = [];
        empByDept[did].push(e);
    });

    // Also add head_user_id employees to their departments (even if department_id differs)
    departments.forEach(d => {
        if (d.head_user_id) {
            const headEmp = empById[d.head_user_id];
            if (headEmp) {
                if (!empByDept[d.id]) empByDept[d.id] = [];
                // Avoid duplicates
                if (!empByDept[d.id].find(e => e.id === headEmp.id)) {
                    empByDept[d.id].push(headEmp);
                }
            }
        }
    });

    // Track placed employees (so they don't appear in "Chưa phân đơn vị")
    const placedEmpIds = new Set();

    // Find parent departments (đơn vị gốc) and child departments (phòng ban)
    const parentDepts = departments.filter(d => !d.parent_id);
    const childDeptsByParent = {};
    departments.forEach(d => {
        if (d.parent_id) {
            if (!childDeptsByParent[d.parent_id]) childDeptsByParent[d.parent_id] = [];
            childDeptsByParent[d.parent_id].push(d);
        }
    });

    let _sc = 0; // scope counter

    // Render affiliate row
    function affRow(aff, depth, tierLabel, gid, sid, spid) {
        const kids = affChildrenMap[aff.id] || [];
        const hasKids = kids.length > 0;
        const isChild = depth > 1;
        const pad = 16 + depth * 24;
        const badge = (hasKids && !isChild) ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;margin-left:6px;">${kids.length} con</span>` : '';
        const toggleId = `${aff.id}_${sid}`;
        const arrow = (hasKids && !isChild)
            ? `<span class="aff-toggle" data-toggle-id="${toggleId}" style="cursor:pointer;font-size:13px;margin-right:6px;user-select:none;color:#d4a843;">▶</span>`
            : `<span style="margin-right:6px;color:#c4b5fd;">┗</span>`;
        const bg = depth <= 3 ? 'background:#faf5ff;' : 'background:#f5f0ff;';

        const statusIcon = aff.status === 'locked' ? '🔒 ' : '✅ ';
        return `<tr class="aff-row" data-group="${gid}" data-scope-parent="${spid}" data-user-id="${aff.id}" data-depth="${depth}" style="${bg}${depth > 1 ? 'display:none;' : ''}">
            <td style="padding-left:${pad}px;">${arrow}<span style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:#fad24c;padding:5px 16px;border-radius:20px;font-size:12px;font-weight:700;border:1.5px solid rgba(250,210,76,0.4);transition:all 0.2s;box-shadow:0 1px 4px rgba(30,58,95,0.3);" onclick="showAffDetail(${aff.id})" onmouseover="this.style.borderColor='#fad24c';this.style.boxShadow='0 3px 12px rgba(250,210,76,0.3)'" onmouseout="this.style.borderColor='rgba(250,210,76,0.4)';this.style.boxShadow='0 1px 4px rgba(30,58,95,0.3)'">${aff.full_name}</span>${badge}</td>
            <td>${aff.username}</td>
            <td><span class="role-badge role-${aff.role}">${ROLE_LABELS[aff.role] || aff.role}</span></td>
            <td>${CRM_MAP[aff.source_crm_type] || aff.source_crm_type || '-'}</td>
            <td>${aff.phone || '-'}</td>
            <td>${aff.status === 'active'
                ? `<span onclick="affToggleStatus(${aff.id}, 'locked')" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid #6ee7b7;transition:all 0.2s;" onmouseover="this.style.background='linear-gradient(135deg,#fee2e2,#fecaca)';this.style.color='#991b1b';this.style.borderColor='#fca5a5'" onmouseout="this.style.background='linear-gradient(135deg,#d1fae5,#a7f3d0)';this.style.color='#065f46';this.style.borderColor='#6ee7b7'">✅ Đang hợp tác</span>`
                : aff.status === 'locked'
                ? `<span onclick="affToggleStatus(${aff.id}, 'active')" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#fee2e2,#fecaca);color:#991b1b;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid #fca5a5;transition:all 0.2s;" onmouseover="this.style.background='linear-gradient(135deg,#d1fae5,#a7f3d0)';this.style.color='#065f46';this.style.borderColor='#6ee7b7'" onmouseout="this.style.background='linear-gradient(135deg,#fee2e2,#fecaca)';this.style.color='#991b1b';this.style.borderColor='#fca5a5'">🔒 Dừng Hợp Tác</span>`
                : aff.status
            }</td>

            <td style="text-align:center;font-weight:700;color:var(--info);">${aff.referral_count || 0}</td>
            <td>${aff.tier_name ? `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;">${aff.tier_percentage || 0}% / ${aff.tier_parent_percentage || 0}%</span>` : '<span style="color:#9ca3af;">—</span>'}</td>
            <td>${aff.created_at ? (() => { const c = new Date(aff.created_at); const t = new Date(); const cd = new Date(c.getFullYear(), c.getMonth(), c.getDate()); const td = new Date(t.getFullYear(), t.getMonth(), t.getDate()); return Math.round((td - cd) / 86400000) + ' ngày'; })() : '-'}</td>
            <td>${tierLabel}</td>
            <td style="text-align:center;">
                <div class="d-flex align-center gap-10" style="justify-content:center;">
                    <button class="btn btn-xs btn-secondary" onclick="showEditAffModal(${aff.id})" title="Sửa">✏️</button>

                    <button class="btn btn-xs" onclick="showTransferAffModal(${aff.id}, '${aff.full_name.replace(/'/g, "\\\\'")}')" title="Chuyển quản lý" style="background:#dbeafe;color:#1e40af;">🔄</button>

                    ${currentUser.role === 'giam_doc' ? `<button class="btn btn-xs" onclick="affDelete(${aff.id}, '${aff.full_name}')" title="Xóa" style="background:transparent;color:#ef4444;border:1.5px solid #fca5a5;border-radius:8px;transition:all 0.2s;" onmouseover="this.style.background='#ef4444';this.style.color='#fff';this.style.borderColor='#ef4444'" onmouseout="this.style.background='transparent';this.style.color='#ef4444';this.style.borderColor='#fca5a5'">✕</button>` : ''}
                </div>
            </td>
        </tr>`;
    }

    // Render affiliates under an employee
    function renderEmpAffiliates(empId, baseDepth, gid) {
        let h = '';
        const emAffs = affByEmp[empId] || [];
        const rootAffs = emAffs.filter(a => !a.assigned_to_user_id || !affById[a.assigned_to_user_id]);
        const sid = 's' + (_sc++);

        rootAffs.sort((a, b) => (b.referral_count || 0) - (a.referral_count || 0));
        rootAffs.forEach(aff => {
            const hasKids = (affChildrenMap[aff.id] || []).length > 0;
            const label = hasKids ? `<span style="color:#d97706;font-weight:700;">🥇 Cha</span>` : `<span style="color:#10b981;font-weight:600;">🔹 Gốc</span>`;
            const empToggleId = `emp_${empId}_${sid}`;
            h += affRow(aff, baseDepth, label, gid, sid, empToggleId);
            const kids = affChildrenMap[aff.id] || [];
            kids.forEach(child => {
                const childLabel = `<span style="color:#6366f1;font-weight:600;font-size:11px;">← ${aff.full_name}</span>`;
                const parentToggle = `${aff.id}_${sid}`;
                h += affRow(child, baseDepth + 1, childLabel, gid, sid, parentToggle);
            });
        });

        // Duplicate: non-root affiliates that also have children
        const nonRootParents = emAffs.filter(a => a.assigned_to_user_id && affById[a.assigned_to_user_id] && (affChildrenMap[a.id] || []).length > 0);
        nonRootParents.forEach(aff => {
            const sid2 = 's' + (_sc++);
            const label = `<span style="color:#d97706;font-weight:700;">🥇 Cha</span>`;
            const empToggleId = `emp_${empId}_${sid2}`;
            h += affRow(aff, baseDepth, label, gid, sid2, empToggleId);
            const kids = affChildrenMap[aff.id] || [];
            kids.forEach(child => {
                const childLabel = `<span style="color:#6366f1;font-weight:600;font-size:11px;">← ${aff.full_name}</span>`;
                const parentToggle = `${aff.id}_${sid2}`;
                h += affRow(child, baseDepth + 1, childLabel, gid, sid2, parentToggle);
            });
        });

        return h;
    }

    let html = '';

    // Group employees by their department_id → show department name as header
    // Collect all unique department IDs from employees who have affiliates
    const empDeptGroups = {}; // deptId → [employee, ...]
    employees.forEach(emp => {
        if (!affByEmp[emp.id] || affByEmp[emp.id].length === 0) return;
        const did = emp.department_id || 0;
        if (!empDeptGroups[did]) empDeptGroups[did] = [];
        empDeptGroups[did].push(emp);
    });

    // Sort department IDs: real departments first, then 0 (unassigned)
    const sortedDeptIds = Object.keys(empDeptGroups).map(Number).sort((a, b) => {
        if (a === 0) return 1;
        if (b === 0) return -1;
        const nameA = deptById[a]?.name || '';
        const nameB = deptById[b]?.name || '';
        return nameA.localeCompare(nameB);
    });

    sortedDeptIds.forEach(deptId => {
        const deptEmps = empDeptGroups[deptId];
        const dept = deptById[deptId];
        const deptName = dept ? dept.name : 'Chưa phân đơn vị';
        const gid = 'dept' + deptId;

        // Department header
        html += `<tr class="aff-dept-header" data-group="${gid}" style="background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;cursor:pointer;">
            <td colspan="11" style="padding:14px 16px;font-weight:700;font-size:15px;">
                <span class="dept-toggle" style="margin-right:8px;font-size:14px;">▼</span>
                📁 ${deptName}
                <span style="background:rgba(255,255,255,0.15);padding:3px 10px;border-radius:12px;font-size:11px;margin-left:8px;">${deptEmps.reduce((sum, emp) => sum + (affByEmp[emp.id] || []).length, 0)} affiliate</span>
            </td>
        </tr>`;

        // Employees under this department
        deptEmps.forEach(emp => {
            const emAffs = affByEmp[emp.id] || [];
            placedEmpIds.add(emp.id);
            html += `<tr class="aff-row aff-emp-row" data-group="${gid}" data-depth="0" data-emp-id="${emp.id}" style="background:#f0f9ff;cursor:pointer;">
                <td colspan="11" style="padding:10px 16px 10px 20px;font-weight:600;font-size:13px;">
                    ${emAffs.length > 0 ? '<span class="emp-toggle" style="margin-right:6px;font-size:13px;color:#3b82f6;">▼</span>' : ''}
                    👤 ${emp.full_name} <span style="color:#6b7280;font-weight:400;font-size:11px;">(${ROLE_LABELS[emp.role] || emp.role})</span>
                    <span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:6px;">${emAffs.length} affiliate</span>
                </td>
            </tr>`;
            if (emAffs.length > 0) html += renderEmpAffiliates(emp.id, 1, gid);
        });
    });

    tbody.innerHTML = html;

    // === TOGGLE EVENT LISTENERS ===

    // Đơn vị toggle
    tbody.querySelectorAll('.aff-dept-header').forEach(row => {
        row.addEventListener('click', () => {
            const gid = row.dataset.group;
            const tog = row.querySelector('.dept-toggle');
            const isOpen = tog.textContent.trim() === '▼';
            tog.textContent = isOpen ? '▶' : '▼';
            // Show/hide depth-0 rows (subdept headers + emp rows at depth 0)
            tbody.querySelectorAll(`.aff-row[data-group="${gid}"][data-depth="0"]`).forEach(r => {
                if (isOpen) {
                    r.style.display = 'none';
                } else {
                    r.style.display = '';
                }
            });
            // Collapse all deeper when closing
            if (isOpen) {
                tbody.querySelectorAll(`.aff-row[data-group="${gid}"]`).forEach(r => {
                    r.style.display = 'none';
                    r.querySelectorAll('.subdept-toggle, .emp-toggle, .aff-toggle').forEach(t => t.textContent = '▶');
                });
            }
        });
    });

    // Phòng ban toggle
    tbody.querySelectorAll('.aff-subdept-header').forEach(row => {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            const gid = row.dataset.group;
            const sdId = row.dataset.subdeptId;
            const tog = row.querySelector('.subdept-toggle');
            const isOpen = tog.textContent.trim() === '▼';
            tog.textContent = isOpen ? '▶' : '▼';
            // Show/hide emp rows in this subdept
            tbody.querySelectorAll(`.aff-emp-row[data-group="${gid}"][data-subdept-id="${sdId}"]`).forEach(r => {
                r.style.display = isOpen ? 'none' : '';
                if (isOpen) r.querySelectorAll('.emp-toggle').forEach(t => t.textContent = '▶');
            });
            // Collapse affiliate rows when closing
            if (isOpen) {
                tbody.querySelectorAll(`.aff-row[data-group="${gid}"][data-subdept-id="${sdId}"]`).forEach(r => {
                    if (!r.classList.contains('aff-emp-row') && !r.classList.contains('aff-subdept-header')) {
                        r.style.display = 'none';
                    }
                });
            }
        });
    });

    // Employee toggle
    tbody.querySelectorAll('.aff-emp-row').forEach(row => {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            const empId = row.dataset.empId;
            const gid = row.dataset.group;
            const tog = row.querySelector('.emp-toggle');
            const isOpen = tog.textContent.trim() === '▼';
            tog.textContent = isOpen ? '▶' : '▼';
            // Show/hide affiliate rows that have scope-parent starting with emp_empId
            tbody.querySelectorAll(`.aff-row[data-group="${gid}"]`).forEach(r => {
                const sp = r.dataset.scopeParent || '';
                if (sp.startsWith('emp_' + empId + '_')) {
                    r.style.display = isOpen ? 'none' : '';
                    if (isOpen) r.querySelectorAll('.aff-toggle').forEach(t => t.textContent = '▶');
                }
                // Also collapse deeper children
                if (isOpen) {
                    const toggle = r.querySelector('.aff-toggle');
                    if (toggle) {
                        const tid = toggle.dataset.toggleId;
                        tbody.querySelectorAll(`.aff-row[data-scope-parent="${tid}"]`).forEach(gc => gc.style.display = 'none');
                    }
                }
            });
        });
    });

    // Affiliate toggle (parent→child)
    tbody.querySelectorAll('.aff-toggle').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const toggleId = this.dataset.toggleId;
            const isOpen = this.textContent.trim() === '▼';
            this.textContent = isOpen ? '▶' : '▼';
            tbody.querySelectorAll(`.aff-row[data-scope-parent="${toggleId}"]`).forEach(r => {
                if (isOpen) {
                    r.style.display = 'none';
                    r.querySelectorAll('.aff-toggle').forEach(t => {
                        t.textContent = '▶';
                        const gcId = t.dataset.toggleId;
                        tbody.querySelectorAll(`.aff-row[data-scope-parent="${gcId}"]`).forEach(gc => gc.style.display = 'none');
                    });
                } else {
                    r.style.display = '';
                }
            });
        });
    });
}

function affExpandAll() {
    const tbody = document.getElementById('affTableBody');
    if (!tbody) return;
    tbody.querySelectorAll('.aff-row').forEach(r => r.style.display = '');
    tbody.querySelectorAll('.emp-toggle').forEach(t => t.textContent = '▼');
    tbody.querySelectorAll('.aff-toggle').forEach(t => t.textContent = '▼');
    tbody.querySelectorAll('.subdept-toggle').forEach(t => t.textContent = '▼');
}

function affCollapseAll() {
    const tbody = document.getElementById('affTableBody');
    if (!tbody) return;
    // Hide all affiliate rows (non-emp, non-dept)
    tbody.querySelectorAll('.aff-row:not(.aff-emp-row):not(.aff-dept-row):not(.aff-subdept-row)').forEach(r => r.style.display = 'none');
    // Reset all toggles
    tbody.querySelectorAll('.emp-toggle').forEach(t => t.textContent = '▶');
    tbody.querySelectorAll('.aff-toggle').forEach(t => t.textContent = '▶');
}

function buildAffDeptOptions(depts, selectedId) {
    const affParent = depts.find(d => !d.parent_id && d.name.toUpperCase().includes('AFFILIATE'));
    if (!affParent) return '';
    const children = depts.filter(d => d.parent_id === affParent.id);
    let first = true;
    return children.map(c => {
        const sel = selectedId ? (c.id === selectedId ? 'selected' : '') : (first ? (first = false, 'selected') : '');
        return `<option value="${c.id}" ${sel}>📁 ${c.name}</option>`;
    }).join('');
}

// ========== TẠO TK AFFILIATE ==========
async function showCreateAffModal() {
    const [tiers, staffList, deptData] = await Promise.all([
        apiCall('/api/settings/commission-tiers'),
        apiCall('/api/users/dropdown'),
        apiCall('/api/departments')
    ]);
    const depts = deptData.departments || [];
    const deptOptionsHTML = buildAccDeptOptions(depts);

    const bodyHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Tên đăng nhập <span style="color:var(--danger)">*</span></label>
                <input type="text" id="affUsername" class="form-control" placeholder="Tên đăng nhập">
            </div>
            <div class="form-group">
                <label>Mật khẩu <span style="color:var(--danger)">*</span></label>
                <input type="password" id="affPassword" class="form-control" placeholder="Mật khẩu">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Họ tên <span style="color:var(--danger)">*</span></label>
                <input type="text" id="affFullName" class="form-control" placeholder="Chọn KH nguồn để tự điền" readonly style="background:#e5e7eb;cursor:not-allowed;color:#374151;">
            </div>
            <div class="form-group">
                <label>Vai trò</label>
                <input type="text" class="form-control" value="TK Affiliate" disabled style="background:#e5e7eb;cursor:not-allowed;color:#374151;">
                <input type="hidden" id="affRole" value="tkaffiliate">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>👤 Nhân viên quản lý <span style="color:var(--danger)">*</span></label>
                <select id="affManagedBy" class="form-control" onchange="onAffManagedByChange()">
                    <option value="">— Chọn nhân viên —</option>
                    ${(() => {
                        const visibleParentIds = JSON.parse(localStorage.getItem('aff_visible_depts') || '[]');
                        const hiddenChildIds = JSON.parse(localStorage.getItem('aff_hidden_child_depts') || '[]');
                        const allVisibleDeptIds = new Set();
                        visibleParentIds.forEach(pid => {
                            allVisibleDeptIds.add(pid);
                            depts.filter(d => d.parent_id === pid && !hiddenChildIds.includes(d.id)).forEach(cd => {
                                allVisibleDeptIds.add(cd.id);
                                depts.filter(d2 => d2.parent_id === cd.id && !hiddenChildIds.includes(d2.id)).forEach(gcd => allVisibleDeptIds.add(gcd.id));
                            });
                        });
                        return (staffList.users || [])
                            .filter(u => !['hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate'].includes(u.role))
                            .filter(u => allVisibleDeptIds.size === 0 || allVisibleDeptIds.has(u.department_id))
                            .map(e => `<option value="${e.id}">${e.full_name} (${ROLE_LABELS[e.role] || e.role})</option>`)
                            .join('');
                    })()}
                </select>
            </div>
            <div class="form-group">
                <label>📋 Khách hàng nguồn <span style="color:var(--danger)">*</span></label>
                <input type="text" id="affSourceSearch" class="form-control" placeholder="Chọn NV quản lý trước..." disabled onfocus="affLoadSourceDropdown()" oninput="affSearchSource(this.value)">
                <input type="hidden" id="affSourceCustomerId">
                <input type="hidden" id="affSourceCrmType">
                <div id="affSourceResults" style="max-height:150px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:8px;margin-top:4px;display:none;"></div>
            </div>
        </div>
        <div class="form-group">
            <label>📌 Khách CRM từ đâu? <span style="color:var(--danger)">*</span></label>
            <input type="text" id="affSourceCrmLabel" class="form-control" disabled placeholder="Tự điền khi chọn KH nguồn" style="background:#e5e7eb;cursor:not-allowed;color:#374151;font-weight:600;">
        </div>
        <div class="form-group">
            <label>👔 Chức Danh</label>
            <input type="text" id="affSourceJobTitle" class="form-control" disabled placeholder="Tự điền khi chọn KH nguồn" style="background:#e5e7eb;cursor:not-allowed;color:#374151;font-weight:600;">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Số điện thoại</label>
                <input type="text" id="affPhone" class="form-control" placeholder="10 chữ số" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
            </div>
            <div class="form-group">
                <label>🎂 Sinh nhật</label>
                <input type="date" id="affBirthDate" class="form-control">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Địa chỉ</label>
                <input type="text" id="affAddress" class="form-control" placeholder="Địa chỉ">
            </div>
            <div class="form-group">
                <label>Tỉnh / Thành phố</label>
                <select id="affProvince" class="form-control">
                    <option value="">— Chọn tỉnh thành —</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Đơn vị / Phòng ban</label>
            <select id="affDepartment" class="form-control">
                <option value="">— Chọn phòng ban —</option>
                ${buildAffDeptOptions(depts)}
            </select>
        </div>
        <div id="affHoaHongFields">
            <hr style="margin: 15px 0; border-color: var(--gray-200);">
            <h4 style="color:var(--navy);margin-bottom:10px;">💰 Hoa Hồng</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Tầng chiết khấu</label>
                    <select id="affTierId" class="form-control">
                        <option value="">Chọn tầng</option>
                        ${(tiers.items || []).map(t => `<option value="${t.id}">${t.name} (TT: ${t.percentage}% / CT: ${t.parent_percentage || 0}%)</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="position:relative;">
                    <label>Gán cho TK Affiliate nào?</label>
                    <input type="text" id="affAssignToSearch" class="form-control" placeholder="Chọn NV quản lý trước..." disabled autocomplete="off" oninput="affFilterAssignTo(this.value)" onfocus="affShowAssignDropdown()">
                    <input type="hidden" id="affAssignTo" value="">
                    <div id="affAssignToResults" style="position:absolute;z-index:10;width:100%;max-height:180px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;background:white;margin-top:2px;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Ngân hàng</label>
                    <input type="text" id="affBankName" class="form-control" placeholder="VD: Vietcombank">
                </div>
                <div class="form-group">
                    <label>Số tài khoản</label>
                    <input type="text" id="affBankAccount" class="form-control" placeholder="Số TK ngân hàng">
                </div>
            </div>
            <div class="form-group">
                <label>Chủ tài khoản</label>
                <input type="text" id="affBankHolder" class="form-control" placeholder="Tên chủ tài khoản">
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" onclick="submitCreateAff()">Tạo Tài Khoản</button>
    `;
    openModal('➕ Thêm TK Affiliate', bodyHTML, footerHTML);
    populateProvinceDropdown('affProvince');
}

async function onAffManagedByChange() {
    const empId = document.getElementById('affManagedBy')?.value;
    const searchEl = document.getElementById('affSourceSearch');
    const resEl = document.getElementById('affSourceResults');
    const assignSel = document.getElementById('affAssignTo');
    if (searchEl) {
        if (empId) {
            searchEl.disabled = false;
            searchEl.placeholder = 'Click để xem danh sách hoặc tìm kiếm...';
        } else {
            searchEl.disabled = true;
            searchEl.placeholder = 'Chọn NV quản lý trước...';
            searchEl.value = '';
            document.getElementById('affSourceCustomerId').value = '';
        }
    }
    if (resEl) resEl.style.display = 'none';
    // Load affiliates managed by this employee
    const assignInput = document.getElementById('affAssignToSearch');
    const assignHidden = document.getElementById('affAssignTo');
    if (assignInput) {
        if (empId) {
            const data = await apiCall(`/api/users?role=tkaffiliate`);
            window._affAssignToList = (data.users || []).filter(u => String(u.managed_by_user_id) === String(empId));
            assignInput.disabled = false;
            assignInput.placeholder = 'Gõ tên hoặc username để tìm...';
            assignInput.value = '';
            if (assignHidden) assignHidden.value = '';
        } else {
            assignInput.disabled = true;
            assignInput.placeholder = 'Chọn NV quản lý trước...';
            assignInput.value = '';
            window._affAssignToList = [];
            if (assignHidden) assignHidden.value = '';
        }
    }
}

let _affSourceCache = [];
async function affLoadSourceDropdown() {
    const empId = document.getElementById('affManagedBy')?.value;
    if (!empId) return;
    const q = document.getElementById('affSourceSearch')?.value || '';
    const data = await apiCall(`/api/affiliate/customers-for-assign?employee_id=${empId}&q=${encodeURIComponent(q)}`);
    _affSourceCache = data.customers || [];
    affRenderSourceResults(_affSourceCache);
}

let _affSearchTimeout = null;
async function affSearchSource(q) {
    clearTimeout(_affSearchTimeout);
    const empId = document.getElementById('affManagedBy')?.value;
    if (!empId) return;
    _affSearchTimeout = setTimeout(async () => {
        const data = await apiCall(`/api/affiliate/customers-for-assign?employee_id=${empId}&q=${encodeURIComponent(q)}`);
        _affSourceCache = data.customers || [];
        affRenderSourceResults(_affSourceCache);
    }, 300);
}

function affRenderSourceResults(customers) {
    const resDiv = document.getElementById('affSourceResults');
    if (!resDiv) return;
    if (customers.length === 0) {
        resDiv.innerHTML = '<div style="padding:8px;color:#9ca3af;font-size:12px;">Không tìm thấy khách hàng</div>';
    } else {
        resDiv.innerHTML = customers.map((c, i) =>
            `<div style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid #f3f4f6;transition:background .15s;"
                 onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''"
                 onmousedown="affSelectSource(${i})">
                <b>${c.customer_name}</b> — ${c.phone || 'Chưa có SĐT'}
                ${c.address ? `<br><span style="color:#6b7280;">${c.address}${c.province ? ', ' + c.province : ''}</span>` : ''}
            </div>`
        ).join('');
    }
    resDiv.style.display = 'block';
}

// Store original source customer data for comparison on submit
let _affSourceOriginal = null;

function affSelectSource(index) {
    const c = _affSourceCache[index];
    if (!c) return;
    document.getElementById('affSourceCustomerId').value = c.id;
    document.getElementById('affSourceSearch').value = `${c.customer_name} - ${c.phone || ''}`;
    document.getElementById('affSourceResults').style.display = 'none';

    const CRM_L = {nhu_cau:'Chăm Sóc KH Nhu Cầu',ctv:'Chăm Sóc CTV',tu_tim_kiem:'CRM Tự Tìm Kiếm',goi_hop_tac:'CRM Gọi Điện Hợp Tác',goi_ban_hang:'CRM Gọi Điện Bán Hàng',koc_tiktok:'CRM KOL/KOC Tiktok'};
    document.getElementById('affSourceCrmType').value = c.crm_type || '';
    document.getElementById('affSourceCrmLabel').value = CRM_L[c.crm_type] || c.crm_type || '';
    document.getElementById('affSourceJobTitle').value = c.job || '';

    // Auto-fill name (locked), phone, birthday, address, province
    document.getElementById('affFullName').value = c.customer_name || '';
    if (c.phone) document.getElementById('affPhone').value = c.phone;
    if (c.birthday) {
        const bd = c.birthday.split('T')[0];
        document.getElementById('affBirthDate').value = bd;
    }
    if (c.address) document.getElementById('affAddress').value = c.address;
    if (c.province) {
        populateProvinceDropdown('affProvince');
        document.getElementById('affProvince').value = c.province;
    }

    // Store original for comparison later
    _affSourceOriginal = {
        phone: c.phone || '',
        address: c.address || '',
        province: c.province || '',
        birthday: c.birthday ? c.birthday.split('T')[0] : ''
    };
}

async function submitCreateAff() {
    const phone = document.getElementById('affPhone').value;
    if (phone && !/^\d{10}$/.test(phone)) {
        showToast('Số điện thoại phải đúng 10 chữ số', 'error');
        return;
    }

    const body = {
        username: document.getElementById('affUsername').value,
        password: document.getElementById('affPassword').value,
        full_name: document.getElementById('affFullName').value,
        role: document.getElementById('affRole').value,
        phone,
        address: document.getElementById('affAddress').value,
        birth_date: document.getElementById('affBirthDate')?.value || null,
        department_id: document.getElementById('affDepartment')?.value || null,
        commission_tier_id: document.getElementById('affTierId')?.value || null,
        assigned_to_user_id: document.getElementById('affAssignTo')?.value || null,
        bank_name: document.getElementById('affBankName')?.value || null,
        bank_account: document.getElementById('affBankAccount')?.value || null,
        bank_holder: document.getElementById('affBankHolder')?.value || null,
        managed_by_user_id: document.getElementById('affManagedBy')?.value || null,
        source_customer_id: document.getElementById('affSourceCustomerId')?.value || null,
        province: document.getElementById('affProvince')?.value || null,
        source_crm_type: document.getElementById('affSourceCrmType')?.value || null,
    };

    if (!body.username || !body.password || !body.full_name || !body.role) {
        showToast('Vui lòng điền đầy đủ thông tin bắt buộc (*)', 'error');
        return;
    }
    if (!AFF_ROLES.includes(body.role)) {
        showToast('Vai trò không hợp lệ', 'error');
        return;
    }
    if (!body.department_id) { showToast('Vui lòng chọn Đơn vị / Phòng ban', 'error'); return; }
    if (!body.source_customer_id) { showToast('Vui lòng chọn Khách hàng nguồn', 'error'); return; }
    if (!body.commission_tier_id) { showToast('Vui lòng chọn Tầng chiết khấu', 'error'); return; }
    const affList = window._affAssignToList || [];
    if (affList.length > 0 && !body.assigned_to_user_id) { showToast('Vui lòng chọn TK Affiliate gán vào', 'error'); return; }

    // Auto-sync phone/address/province/birthday to source customer
    body.sync_source = true;

    const data = await apiCall('/api/users', 'POST', body);
    if (data.success) {
        showToast('Tạo tài khoản affiliate thành công!');
        closeModal();
        await loadAffAccounts();
    } else {
        showToast(data.error, 'error');
    }
}

// ========== SỬA TK AFFILIATE ==========
async function showEditAffModal(userId) {
    const [userData, tiers, staffList, deptData] = await Promise.all([
        apiCall(`/api/users/${userId}`),
        apiCall('/api/settings/commission-tiers'),
        apiCall('/api/users/dropdown'),
        apiCall('/api/departments')
    ]);
    const user = userData.user;
    if (!user) { showToast('Không tìm thấy tài khoản', 'error'); return; }
    const depts = deptData.departments || [];
    const deptOptionsHTML = buildAffDeptOptions(depts, user.department_id);
    const CRM_L = {nhu_cau:'Chăm Sóc KH Nhu Cầu',ctv:'Chăm Sóc CTV',tu_tim_kiem:'CRM Tự Tìm Kiếm',goi_hop_tac:'CRM Gọi Điện Hợp Tác',goi_ban_hang:'CRM Gọi Điện Bán Hàng',koc_tiktok:'CRM KOL/KOC Tiktok'};

    const bodyHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Tên đăng nhập</label>
                <input type="text" class="form-control" value="${user.username}" disabled style="background:#e5e7eb;cursor:not-allowed;color:#374151;">
            </div>
            <div class="form-group">
                <label>Vai trò</label>
                <input type="text" class="form-control" value="TK Affiliate" disabled style="background:#e5e7eb;cursor:not-allowed;color:#374151;">
                <input type="hidden" id="editAffRole" value="tkaffiliate">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Họ tên</label>
                <input type="text" id="editAffFullName" class="form-control" value="${user.full_name}" readonly style="background:#e5e7eb;cursor:not-allowed;color:#374151;">
            </div>
            <div class="form-group">
                <label>🎂 Sinh nhật</label>
                <input type="date" id="editAffBirthDate" class="form-control" value="${user.birth_date ? user.birth_date.split('T')[0] : ''}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>👤 Nhân viên quản lý</label>
                <select id="editAffManagedBy" class="form-control" onchange="onEditAffManagedByChange()">
                    <option value="">— Chọn nhân viên —</option>
                    ${(() => {
                        const visibleParentIds = JSON.parse(localStorage.getItem('aff_visible_depts') || '[]');
                        const hiddenChildIds = JSON.parse(localStorage.getItem('aff_hidden_child_depts') || '[]');
                        const allVisibleDeptIds = new Set();
                        visibleParentIds.forEach(pid => {
                            allVisibleDeptIds.add(pid);
                            depts.filter(d => d.parent_id === pid && !hiddenChildIds.includes(d.id)).forEach(cd => {
                                allVisibleDeptIds.add(cd.id);
                                depts.filter(d2 => d2.parent_id === cd.id && !hiddenChildIds.includes(d2.id)).forEach(gcd => allVisibleDeptIds.add(gcd.id));
                            });
                        });
                        return (staffList.users || [])
                            .filter(u => !['hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate'].includes(u.role))
                            .filter(u => allVisibleDeptIds.size === 0 || allVisibleDeptIds.has(u.department_id))
                            .map(e => `<option value="${e.id}" ${user.managed_by_user_id==e.id?'selected':''}>${e.full_name} (${ROLE_LABELS[e.role] || e.role})</option>`)
                            .join('');
                    })()}
                </select>
            </div>
            <div class="form-group">
                <label>📋 Khách hàng nguồn</label>
                <input type="text" id="editAffSourceSearch" class="form-control" placeholder="Tìm khách hàng..." value="${user.source_customer_name || ''}" onfocus="editAffLoadSource()" oninput="editAffSearchSource(this.value)">
                <input type="hidden" id="editAffSourceCustomerId" value="${user.source_customer_id || ''}">
                <input type="hidden" id="editAffSourceCrmType" value="${user.source_crm_type || ''}">
                <div id="editAffSourceResults" style="max-height:150px;overflow-y:auto;border:1px solid var(--gray-200);border-radius:8px;margin-top:4px;display:none;"></div>
            </div>
        </div>
        <div class="form-group">
            <label>📌 Khách CRM từ đâu?</label>
            <input type="text" id="editAffSourceCrmLabel" class="form-control" disabled value="${CRM_L[user.source_crm_type] || user.source_crm_type || '—'}" style="background:#f9fafb;color:var(--navy);font-weight:600;">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>SĐT <small style="color:var(--danger);">(10 chữ số)</small></label>
                <input type="text" id="editAffPhone" class="form-control" value="${user.phone || ''}" maxlength="10" pattern="[0-9]{10}" oninput="this.value=this.value.replace(/[^0-9]/g,'')">
            </div>
            <div class="form-group">
                <label>Tỉnh / Thành phố</label>
                <select id="editAffProvince" class="form-control">
                    <option value="">— Chọn tỉnh thành —</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Địa chỉ</label>
            <input type="text" id="editAffAddress" class="form-control" value="${user.address || ''}">
        </div>
        <div class="form-group">
            <label>Đơn vị / Phòng ban</label>
            <select id="editAffDepartment" class="form-control">
                <option value="">— Chọn phòng ban —</option>
                ${deptOptionsHTML}
            </select>
        </div>
        <div id="editAffHoaHongFields">
            <hr style="margin: 15px 0; border-color: var(--gray-200);">
            <h4 style="color:var(--navy);margin-bottom:10px;">💰 Hoa Hồng</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Tầng chiết khấu</label>
                    <select id="editAffTierId" class="form-control">
                        <option value="">Chọn tầng</option>
                        ${(tiers.items || []).map(t => `<option value="${t.id}" ${user.commission_tier_id==t.id?'selected':''}>${t.name} (TT: ${t.percentage}% / CT: ${t.parent_percentage || 0}%)</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="position:relative;">
                    <label>Gán cho TK Affiliate nào?</label>
                    <input type="text" id="editAffAssignToSearch" class="form-control" placeholder="Gõ tên hoặc username để tìm..." autocomplete="off" oninput="editAffFilterAssignTo(this.value)" onfocus="editAffShowAssignDropdown()">
                    <input type="hidden" id="editAffAssignTo" value="${user.assigned_to_user_id || ''}">
                    <div id="editAffAssignToResults" style="position:absolute;z-index:10;width:100%;max-height:180px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;background:white;margin-top:2px;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Ngân hàng</label>
                    <input type="text" id="editAffBankName" class="form-control" value="${user.bank_name || ''}" placeholder="VD: Vietcombank">
                </div>
                <div class="form-group">
                    <label>Số tài khoản</label>
                    <input type="text" id="editAffBankAccount" class="form-control" value="${user.bank_account || ''}" placeholder="Số TK">
                </div>
            </div>
            <div class="form-group">
                <label>Chủ tài khoản</label>
                <input type="text" id="editAffBankHolder" class="form-control" value="${user.bank_holder || ''}" placeholder="Tên chủ TK">
            </div>
        </div>
        <hr style="margin: 15px 0; border-color: var(--gray-200);">
        <div class="form-group">
            <label>Đổi mật khẩu (để trống nếu không đổi)</label>
            <input type="password" id="editAffNewPassword" class="form-control" placeholder="Mật khẩu mới">
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-success" onclick="submitEditAff(${userId})">Lưu Thay Đổi</button>
    `;
    const lockUnlockBtn = currentUser.role === 'giam_doc' ? (
        user.status === 'locked'
            ? `<button class="btn btn-success" onclick="affToggleStatus(${userId}, 'active');closeModal();" style="padding:4px 14px;font-size:12px;border-radius:8px;">▶️ Tiếp tục hợp tác</button>`
            : `<button class="btn btn-danger" onclick="affToggleStatus(${userId}, 'locked');closeModal();" style="padding:4px 14px;font-size:12px;border-radius:8px;">⏸️ Dừng hợp tác</button>`
    ) : '';
    openModal('✏️ Sửa TK Affiliate: ' + user.full_name + ' ' + lockUnlockBtn, bodyHTML, footerHTML);
    populateProvinceDropdown('editAffProvince');
    const editProvSel = document.getElementById('editAffProvince');
    if (editProvSel && user.province) editProvSel.value = user.province;

    // Populate affiliate parent autocomplete
    if (user.managed_by_user_id) {
        const affData = await apiCall(`/api/users?role=tkaffiliate`);
        window._editAffAssignToList = (affData.users || []).filter(u => String(u.managed_by_user_id) === String(user.managed_by_user_id) && u.id !== userId);
        const assignInput = document.getElementById('editAffAssignToSearch');
        if (assignInput && user.assigned_to_user_id) {
            const selected = window._editAffAssignToList.find(u => u.id === user.assigned_to_user_id);
            if (selected) assignInput.value = `${selected.full_name} (${selected.username})`;
        }
    }

    // Store source customer original data for sync comparison
    _editAffSourceOriginal = null;
    if (user.source_customer_id) {
        // Use the user's current data as baseline (since it should match source customer)
        _editAffSourceOriginal = {
            phone: user.phone || '',
            address: user.address || '',
            province: user.province || '',
            birthday: user.birth_date ? user.birth_date.split('T')[0] : ''
        };
    }
}

function onEditAffRoleChange() {
    const role = document.getElementById('editAffRole').value;
    const hhFields = document.getElementById('editAffHoaHongFields');
    if (hhFields) hhFields.style.display = role === 'hoa_hong' ? 'block' : 'none';
}

async function onEditAffManagedByChange() {
    const managerId = document.getElementById('editAffManagedBy')?.value;
    const searchInput = document.getElementById('editAffSourceSearch');
    const assignSel = document.getElementById('editAffAssignTo');
    if (searchInput) {
        searchInput.disabled = !managerId;
        if (!managerId) {
            searchInput.placeholder = 'Chọn NV quản lý trước...';
            searchInput.value = '';
            document.getElementById('editAffSourceCustomerId').value = '';
            document.getElementById('editAffSourceCrmType').value = '';
            document.getElementById('editAffSourceCrmLabel').value = '';
        } else {
            searchInput.placeholder = 'Tìm khách hàng...';
        }
    }
    // Load affiliates managed by this employee
    const editAssignInput = document.getElementById('editAffAssignToSearch');
    const editAssignHidden = document.getElementById('editAffAssignTo');
    if (editAssignInput) {
        if (managerId) {
            const data = await apiCall(`/api/users?role=tkaffiliate`);
            window._editAffAssignToList = (data.users || []).filter(u => String(u.managed_by_user_id) === String(managerId));
            editAssignInput.placeholder = 'Gõ tên hoặc username để tìm...';
            editAssignInput.value = '';
            if (editAssignHidden) editAssignHidden.value = '';
        } else {
            window._editAffAssignToList = [];
            editAssignInput.placeholder = 'Chọn NV quản lý trước...';
            editAssignInput.value = '';
            if (editAssignHidden) editAssignHidden.value = '';
        }
    }
}

let _editAffSourceCache = [];
let _editAffSourceOriginal = null;
async function editAffLoadSource() {
    const managerId = document.getElementById('editAffManagedBy')?.value;
    if (!managerId) return;
    const q = document.getElementById('editAffSourceSearch')?.value || '';
    const data = await apiCall(`/api/affiliate/customers-for-assign?employee_id=${managerId}&q=${encodeURIComponent(q)}`);
    _editAffSourceCache = data.customers || [];
    editAffRenderSourceResults(_editAffSourceCache);
}

async function editAffSearchSource(q) {
    const managerId = document.getElementById('editAffManagedBy')?.value;
    if (!managerId) return;
    const data = await apiCall(`/api/affiliate/customers-for-assign?employee_id=${managerId}&q=${encodeURIComponent(q)}`);
    _editAffSourceCache = data.customers || [];
    editAffRenderSourceResults(_editAffSourceCache);
}

function editAffRenderSourceResults(customers) {
    const resDiv = document.getElementById('editAffSourceResults');
    if (!resDiv) return;
    if (customers.length === 0) {
        resDiv.innerHTML = '<div style="padding:8px;color:#9ca3af;font-size:12px;">Không tìm thấy khách hàng</div>';
    } else {
        resDiv.innerHTML = customers.map((c, i) =>
            `<div style="padding:8px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid #f3f4f6;transition:background .15s;"
                 onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background=''"
                 onmousedown="editAffSelectSource(${i})">
                <b>${c.customer_name}</b> — ${c.phone || 'Chưa có SĐT'}
            </div>`
        ).join('');
    }
    resDiv.style.display = 'block';
}

function editAffSelectSource(index) {
    const c = _editAffSourceCache[index];
    if (!c) return;
    document.getElementById('editAffSourceCustomerId').value = c.id;
    document.getElementById('editAffSourceSearch').value = `${c.customer_name} - ${c.phone || ''}`;
    document.getElementById('editAffSourceResults').style.display = 'none';
    const CRM_L = {nhu_cau:'Chăm Sóc KH Nhu Cầu',ctv:'Chăm Sóc CTV',tu_tim_kiem:'CRM Tự Tìm Kiếm',goi_hop_tac:'CRM Gọi Điện Hợp Tác',goi_ban_hang:'CRM Gọi Điện Bán Hàng',koc_tiktok:'CRM KOL/KOC Tiktok'};
    document.getElementById('editAffSourceCrmType').value = c.crm_type || '';
    document.getElementById('editAffSourceCrmLabel').value = CRM_L[c.crm_type] || c.crm_type || '';
}

async function submitEditAff(userId) {
    const phone = document.getElementById('editAffPhone').value;
    if (phone && !/^\d{10}$/.test(phone)) {
        showToast('Số điện thoại phải đúng 10 chữ số', 'error');
        return;
    }

    const body = {
        full_name: document.getElementById('editAffFullName').value,
        role: document.getElementById('editAffRole').value,
        phone,
        address: document.getElementById('editAffAddress').value,
        province: document.getElementById('editAffProvince')?.value || null,
        birth_date: document.getElementById('editAffBirthDate')?.value || null,
        department_id: document.getElementById('editAffDepartment')?.value || null,
        commission_tier_id: document.getElementById('editAffTierId')?.value || null,
        assigned_to_user_id: document.getElementById('editAffAssignTo')?.value || null,
        bank_name: document.getElementById('editAffBankName')?.value || null,
        bank_account: document.getElementById('editAffBankAccount')?.value || null,
        bank_holder: document.getElementById('editAffBankHolder')?.value || null,
        managed_by_user_id: document.getElementById('editAffManagedBy')?.value || null,
        source_customer_id: document.getElementById('editAffSourceCustomerId')?.value || null,
        source_crm_type: document.getElementById('editAffSourceCrmType')?.value || null,
    };

    // Auto-sync phone/address/province/birthday to source customer
    body.sync_source = true;

    const data = await apiCall(`/api/users/${userId}`, 'PUT', body);
    if (data.success) {
        const newPass = document.getElementById('editAffNewPassword').value;
        if (newPass) {
            await apiCall(`/api/users/${userId}/change-password`, 'PUT', { newPassword: newPass });
        }
        showToast('Cập nhật tài khoản affiliate thành công!');
        // Re-open edit modal with fresh data (preserve state)
        await loadAffAccounts();
        await showEditAffModal(userId);
    } else {
        showToast(data.error, 'error');
    }
}

// ========== XEM CHI TIẾT ==========
async function showAffDetail(userId) {
    const { user } = await apiCall(`/api/users/${userId}`);
    if (!user) { showToast('Không tìm thấy', 'error'); return; }

    const CRM_L = {nhu_cau:'Chăm Sóc KH Nhu Cầu',ctv:'Chăm Sóc CTV',tu_tim_kiem:'CRM Tự Tìm Kiếm',goi_hop_tac:'CRM Gọi Điện Hợp Tác',goi_ban_hang:'CRM Gọi Điện Bán Hàng',koc_tiktok:'CRM KOL/KOC Tiktok'};

    const initials = user.full_name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();
    const statusBadge = user.status === 'active'
        ? '<span style="display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;border:1px solid #6ee7b7;">✅ Đang hợp tác</span>'
        : user.status === 'locked'
        ? '<span style="display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,#fee2e2,#fecaca);color:#991b1b;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;border:1px solid #fca5a5;">🔒 Dừng Hợp Tác</span>'
        : '<span style="background:#e5e7eb;color:#374151;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;">' + user.status + '</span>';

    const bodyHTML = `
        <!-- Profile Header -->
        <div style="text-align:center;padding:24px 20px 20px;background:linear-gradient(135deg,#0f172a,#1e3a5f);border-radius:14px;margin-bottom:20px;">
            <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#fad24c,#e0b82e);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:22px;font-weight:800;color:#0f172a;box-shadow:0 4px 14px rgba(212,168,67,0.4);">${initials}</div>
            <div style="font-size:18px;font-weight:800;color:#fad24c;margin-bottom:4px;">${user.full_name}</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-bottom:10px;">@${user.username}</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;">
                <span class="role-badge role-${user.role}" style="font-size:11px;padding:4px 12px;color:#fff;">${ROLE_LABELS[user.role] || user.role}</span>
                ${statusBadge}
            </div>
        </div>

        <!-- Info Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:16px;">
            <div style="background:#fff;padding:14px 16px;">
                <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📱 SĐT</div>
                <div style="font-size:14px;font-weight:600;color:#1e293b;">${user.phone || '—'}</div>
            </div>
            <div style="background:#fff;padding:14px 16px;">
                <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🎂 Sinh nhật</div>
                <div style="font-size:14px;font-weight:600;color:#1e293b;">${user.birth_date ? formatDate(user.birth_date) : '—'}</div>
            </div>
            <div style="background:#fff;padding:14px 16px;">
                <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">📍 Địa chỉ</div>
                <div style="font-size:13px;font-weight:500;color:#1e293b;">${user.address || '—'}</div>
            </div>
            <div style="background:#fff;padding:14px 16px;">
                <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">🏙️ Tỉnh / TP</div>
                <div style="font-size:13px;font-weight:500;color:#1e293b;">${user.province || '—'}</div>
            </div>
        </div>

        <!-- Affiliate Info -->
        <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:12px;padding:16px;margin-bottom:16px;">
            <div style="font-size:11px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">🔗 Thông tin Affiliate</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                    <div style="font-size:10px;color:#6b7280;font-weight:600;">👤 NV quản lý</div>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:2px;">${user.manager_name || '—'}</div>
                </div>
                <div>
                    <div style="font-size:10px;color:#6b7280;font-weight:600;">📋 KH nguồn</div>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:2px;">${user.source_customer_name || '—'}</div>
                </div>
                <div>
                    <div style="font-size:10px;color:#6b7280;font-weight:600;">📌 CRM nguồn</div>
                    <div style="font-size:13px;font-weight:700;color:#1e40af;margin-top:2px;">${CRM_L[user.source_crm_type] || user.source_crm_type || '—'}</div>
                </div>
                <div>
                    <div style="font-size:10px;color:#6b7280;font-weight:600;">👪 Affiliate cha</div>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:2px;">${user.assigned_to_name || 'Affiliate gốc'}</div>
                </div>
                <div>
                    <div style="font-size:10px;color:#6b7280;font-weight:600;">💰 Tầng hoa hồng</div>
                    <div style="font-size:13px;font-weight:700;color:#d97706;margin-top:2px;">${user.tier_name || 'Chưa gán'} ${user.tier_percentage ? '(TT: ' + user.tier_percentage + '% / CT: ' + (user.tier_parent_percentage || 0) + '%)' : ''}</div>
                </div>
            </div>
        </div>

        <!-- Banking -->
        <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:12px;padding:16px;">
            <div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">🏦 Tài chính & Ngân hàng</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                    <div style="font-size:10px;color:#6b7280;font-weight:600;">💵 Số dư</div>
                    <div style="font-size:16px;font-weight:800;color:#d97706;margin-top:2px;">${formatCurrency(user.balance)} <span style="font-size:11px;font-weight:600;">VNĐ</span></div>
                </div>
                <div>
                    <div style="font-size:10px;color:#6b7280;font-weight:600;">🏦 Ngân hàng</div>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:2px;">${user.bank_name || '—'}</div>
                </div>
                <div>
                    <div style="font-size:10px;color:#6b7280;font-weight:600;">💳 Số TK</div>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:2px;">${user.bank_account || '—'}</div>
                </div>
                <div>
                    <div style="font-size:10px;color:#6b7280;font-weight:600;">👤 Chủ TK</div>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:2px;">${user.bank_holder || '—'}</div>
                </div>
            </div>
        </div>
    `;

    openModal('💎 Chi Tiết Affiliate', bodyHTML, `
        <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
    `);
}

// ========== ACTIONS ==========
async function affToggleStatus(userId, newStatus) {
    const data = await apiCall(`/api/users/${userId}/status`, 'PUT', { status: newStatus });
    if (data.success) {
        showToast(newStatus === 'locked' ? '⏸️ Đã dừng hợp tác' : '▶️ Đã tiếp tục hợp tác');
        await loadAffAccounts();
    } else {
        showToast(data.error, 'error');
    }
}

async function affUnlock(userId, name) {
    const confirm = window.confirm(`Mở khóa tài khoản "${name}"?\n\nKhách hàng nguồn sẽ được phục hồi về CRM với trạng thái Tư Vấn và lịch hẹn hôm nay.`);
    if (!confirm) return;
    const data = await apiCall(`/api/users/${userId}/unlock`, 'PUT');
    if (data.success) {
        showToast('🔓 ' + data.message);
        await loadAffAccounts();
    } else {
        showToast(data.error, 'error');
    }
}

async function affDelete(userId, name) {
    const confirm = window.confirm(`Bạn có chắc muốn XÓA tài khoản "${name}"? Hành động này không thể hoàn tác!`);
    if (!confirm) return;
    const data = await apiCall(`/api/users/${userId}`, 'DELETE');
    if (data.success) {
        showToast('Xóa tài khoản thành công!');
        await loadAffAccounts();
    } else {
        showToast(data.error, 'error');
    }
}

// ========== CUSTOM SYNC CONFIRM DIALOG ==========
function showSyncConfirmDialog(changes) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease;backdrop-filter:blur(4px);';

        const changesHTML = changes.map(c => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #f59e0b;">
                <span style="font-weight:700;color:#1e293b;min-width:70px;font-size:13px;">${c.label}</span>
                <span style="color:#94a3b8;font-size:12px;text-decoration:line-through;">${c.from}</span>
                <span style="color:#f59e0b;font-size:14px;">→</span>
                <span style="color:#059669;font-weight:600;font-size:13px;">${c.to}</span>
            </div>
        `).join('');

        overlay.innerHTML = `
            <div style="background:#fff;border-radius:16px;max-width:480px;width:90%;box-shadow:0 25px 60px rgba(0,0,0,0.3);overflow:hidden;animation:slideUp .3s ease;">
                <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:20px 24px;display:flex;align-items:center;gap:12px;">
                    <div style="width:44px;height:44px;background:rgba(245,158,11,0.2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">🔄</div>
                    <div>
                        <h3 style="margin:0;color:#fff;font-size:16px;font-weight:700;">Đồng Bộ Khách Hàng Nguồn</h3>
                        <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Thông tin khác với KH nguồn CRM</p>
                    </div>
                </div>
                <div style="padding:20px 24px;">
                    <p style="color:#475569;font-size:13px;margin:0 0 14px;">Các thay đổi so với khách hàng nguồn:</p>
                    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
                        ${changesHTML}
                    </div>
                    <p style="color:#64748b;font-size:12px;margin:0;padding:10px 12px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;">
                        ⚠️ Nếu đồng ý, thông tin trên sẽ được cập nhật ngược lại cho Khách Hàng Nguồn ở CRM.
                    </p>
                </div>
                <div style="padding:0 24px 20px;display:flex;gap:10px;justify-content:flex-end;">
                    <button id="syncConfirmYes" style="padding:10px 24px;border:none;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(245,158,11,0.3);transition:all .2s;">
                        ✅ Đồng ý cập nhật
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const cleanup = (result) => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
            resolve(result);
        };

        overlay.querySelector('#syncConfirmYes').addEventListener('click', () => cleanup(true));
    });
}

// ========== 1A: SINGLE TRANSFER AFFILIATE ==========
async function showTransferAffModal(affId, affName) {
    const staffRes = await fetch('/api/staff-list', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
    const staffList = await staffRes.json();
    const deptRes = await fetch('/api/departments', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
    const depts = await deptRes.json();

    const visibleParentIds = JSON.parse(localStorage.getItem('aff_visible_depts') || '[]');
    const hiddenChildIds = JSON.parse(localStorage.getItem('aff_hidden_child_depts') || '[]');
    const allVisibleDeptIds = new Set();
    visibleParentIds.forEach(pid => {
        allVisibleDeptIds.add(pid);
        depts.filter(d => d.parent_id === pid && !hiddenChildIds.includes(d.id)).forEach(cd => {
            allVisibleDeptIds.add(cd.id);
            depts.filter(d2 => d2.parent_id === cd.id && !hiddenChildIds.includes(d2.id)).forEach(gcd => allVisibleDeptIds.add(gcd.id));
        });
    });

    const managers = (staffList.users || [])
        .filter(u => !['hoa_hong','ctv','nuoi_duong','sinh_vien','tkaffiliate'].includes(u.role))
        .filter(u => allVisibleDeptIds.size === 0 || allVisibleDeptIds.has(u.department_id));

    const options = managers.map(e => `<option value="${e.id}">${e.full_name} (${ROLE_LABELS[e.role] || e.role})</option>`).join('');

    const bodyHTML = `
        <p style="margin-bottom:12px;font-size:14px;">Chuyển <strong>${affName}</strong> sang nhân viên khác:</p>
        <select id="transferNewManager" class="form-control" style="margin-bottom:12px;">
            <option value="">— Chọn nhân viên nhận —</option>
            ${options}
        </select>
    `;
    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-primary" onclick="submitTransferAff(${affId})">🔄 Chuyển</button>
    `;
    openModal('🔄 Chuyển Quản Lý Affiliate', bodyHTML, footerHTML);
}

async function submitTransferAff(affId) {
    const newManagerId = document.getElementById('transferNewManager')?.value;
    if (!newManagerId) { showToast('Chọn nhân viên nhận', 'error'); return; }

    try {
        const res = await fetch(`/api/users/${affId}/transfer`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: JSON.stringify({ newManagerId: Number(newManagerId), type: 'affiliate' })
        });
        const data = await res.json();
        if (data.success) {
            closeModal();
            showToast(data.message, 'success');
            loadAffAccounts();
        } else {
            showToast(data.error || 'Lỗi', 'error');
        }
    } catch (e) {
        showToast('Lỗi kết nối', 'error');
    }
}

// ========== AUTOCOMPLETE: GÁN CHO TK AFFILIATE (CREATE) ==========
function affRenderAssignDropdown(list, resultsDivId, hiddenId, searchId) {
    const resDiv = document.getElementById(resultsDivId);
    if (!resDiv) return;
    let html = '';
    if (list.length === 0) {
        html = '<div style="padding:8px 12px;font-size:13px;color:#9ca3af;">Không tìm thấy</div>';
    }
    list.forEach(u => {
        html += `<div style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #f3f4f6;transition:background .15s;"
             onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background=''"
             onmousedown="affSelectAssignTo('${u.id}', '${u.full_name.replace(/'/g,"\\'")} (${u.username})', '${hiddenId}', '${searchId}', '${resultsDivId}')">
            <b>${u.full_name}</b> <span style="color:#6b7280;">(${u.username})</span>
        </div>`;
    });
    resDiv.innerHTML = html;
    resDiv.style.display = 'block';
}

function affSelectAssignTo(id, label, hiddenId, searchId, resultsDivId) {
    document.getElementById(hiddenId).value = id;
    document.getElementById(searchId).value = label;
    document.getElementById(resultsDivId).style.display = 'none';
}

function affShowAssignDropdown() {
    const list = window._affAssignToList || [];
    affRenderAssignDropdown(list, 'affAssignToResults', 'affAssignTo', 'affAssignToSearch');
}

function affFilterAssignTo(q) {
    const list = window._affAssignToList || [];
    const lower = q.toLowerCase();
    const filtered = list.filter(u =>
        u.full_name.toLowerCase().includes(lower) || u.username.toLowerCase().includes(lower)
    );
    affRenderAssignDropdown(filtered, 'affAssignToResults', 'affAssignTo', 'affAssignToSearch');
    // If input is cleared, reset hidden value
    if (!q.trim()) document.getElementById('affAssignTo').value = '';
}

// ========== AUTOCOMPLETE: GÁN CHO TK AFFILIATE (EDIT) ==========
function editAffShowAssignDropdown() {
    const list = window._editAffAssignToList || [];
    affRenderAssignDropdown(list, 'editAffAssignToResults', 'editAffAssignTo', 'editAffAssignToSearch');
}

function editAffFilterAssignTo(q) {
    const list = window._editAffAssignToList || [];
    const lower = q.toLowerCase();
    const filtered = list.filter(u =>
        u.full_name.toLowerCase().includes(lower) || u.username.toLowerCase().includes(lower)
    );
    affRenderAssignDropdown(filtered, 'editAffAssignToResults', 'editAffAssignTo', 'editAffAssignToSearch');
    if (!q.trim()) document.getElementById('editAffAssignTo').value = '';
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
    ['affAssignToResults', 'editAffAssignToResults'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.contains(e.target) && e.target.id !== id.replace('Results', 'Search')) {
            el.style.display = 'none';
        }
    });
});
