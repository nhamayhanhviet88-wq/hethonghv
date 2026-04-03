// ========== BÀN GIAO CV KHÓA ==========
const _LK_RECURRENCE_LABELS = {
    weekly: '📅 Lặp theo tuần',
    monthly: '📅 Lặp theo tháng',
    once: '1️⃣ Không lặp',
    administrative: '🏢 Hành chính (T2-T7)',
    daily: '🔄 Hằng ngày (T2-CN)'
};
const _LK_DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

let _lkSelectedUserId = null;
let _lkSelectedDeptId = null;
let _lkTreeData = null;
let _lkIsParentDept = false; // true if selected dept is a PHÒNG (not sub-team)
let _lkIsSystemDept = false; // true if selected dept is HỆ THỐNG

async function renderBanGiaoKhoaPage(container) {
    const isManager = ['giam_doc', 'quan_ly', 'truong_phong', 'quan_ly_cap_cao'].includes(currentUser.role);

    // Load departments + members using same data source as Lịch Khóa Biểu
    let sidebarHtml = '';
    try {
        const [dData, treeData] = await Promise.all([
            apiCall('/api/task-points/departments'),
            apiCall('/api/lock-tasks/tree')
        ]);
        _lkTreeData = treeData;
        const rawDepts = (dData.departments || []).filter(d => !d.name.toUpperCase().includes('AFFILIATE'));
        const activeDeptIds = new Set(dData.active_dept_ids || []);
        const { users: allUsers, statusMap } = treeData;
        const allApprovers = dData.approvers || [];

        const systemDepts = rawDepts.filter(d => d.name.startsWith('HỆ THỐNG'));
        const nonSystemDepts = rawDepts.filter(d => !d.name.startsWith('HỆ THỐNG'));

        // Role priority for sorting
        const _lkRolePriority = { giam_doc: 5, quan_ly_cap_cao: 4, quan_ly: 3, truong_phong: 2, nhan_vien: 1, part_time: 0 };
        const _lkRoleLabel = { giam_doc: '⭐ Giám đốc', quan_ly_cap_cao: '⭐ Quản lý cấp cao', quan_ly: '⭐ Quản lý', truong_phong: '⭐ Trưởng phòng', nhan_vien: 'Nhân viên', part_time: 'Part time' };
        const _lkIsLeader = (role) => ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(role);

        // Helper: render members for a dept
        const renderDeptUsers = (dept, isChild) => {
            let deptUsers = (allUsers || []).filter(u => u.department_id === dept.id);
            const deptApprovers = allApprovers.filter(a => a.department_id === dept.id);
            const approverIdSet = new Set();
            deptApprovers.forEach(a => {
                approverIdSet.add(a.user_id);
                if (!deptUsers.some(u => u.id === a.user_id)) {
                    deptUsers.push({ id: a.user_id, full_name: a.full_name, username: a.username, role: a.role, department_id: dept.id, _isApprover: true });
                }
            });
            deptUsers.forEach(u => { if (approverIdSet.has(u.id)) u._isApprover = true; });
            deptUsers.sort((a, b) => {
                const aP = (a._isApprover ? 10 : 0) + (_lkRolePriority[a.role] || 0);
                const bP = (b._isApprover ? 10 : 0) + (_lkRolePriority[b.role] || 0);
                return bP - aP;
            });
            let html = '';
            deptUsers.forEach(u => {
                const st = statusMap ? statusMap[u.id] : null;
                let statusBadge = '';
                if (st && st.total > 0) {
                    statusBadge = st.done >= st.total
                        ? `<span style="background:#dcfce7;color:#059669;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">✅ ${st.done}/${st.total}</span>`
                        : `<span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;">🔴 ${st.done}/${st.total}</span>`;
                }
                const isApprover = u._isApprover;
                const isLead = _lkIsLeader(u.role) || isApprover;
                const roleTag = isApprover ? '⭐ Quản Lý' : (_lkRoleLabel[u.role] || u.role);
                const nameStyle = `font-weight:${isLead ? '700' : '500'};`;
                const roleStyle = `font-size:10px;${isLead ? 'color:#d97706;font-weight:700;' : 'color:#94a3b8;'}`;
                html += `
                    <div class="lk-user-item" data-user-id="${u.id}" data-name="${(u.full_name || '').toLowerCase()}" onclick="_lkSelectUser(${u.id},'${(u.full_name || '').replace(/'/g, "\\'")}', event)" style="padding:9px 14px ${isChild ? '9px 32px' : '9px 18px'};font-size:13px;color:#1e293b;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:all .15s;border-left:3px solid transparent;display:flex;align-items:center;gap:8px;background:white;"
                        onmouseover="if(!this.classList.contains('lk-selected'))this.style.background='#f8fafc'"
                        onmouseout="if(!this.classList.contains('lk-selected'))this.style.background='white'">
                        <div style="flex:1;min-width:0;">
                            <div style="${nameStyle}font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.full_name}</div>
                            <div style="${roleStyle}margin-top:1px;">${roleTag}</div>
                        </div>
                        ${statusBadge}
                    </div>`;
            });
            return html;
        };

        // Build sidebar grouped by HỆ THỐNG
        let deptListHtml = '';
        systemDepts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        systemDepts.forEach(sys => {
            let childDepts = nonSystemDepts.filter(d => d.parent_id === sys.id && activeDeptIds.has(d.id));
            childDepts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            const hasSysApprovers = allApprovers.some(a => a.department_id === sys.id);
            if (childDepts.length === 0 && !hasSysApprovers) return;

            // System header
            deptListHtml += `<div class="lk-system-header" data-sys-id="${sys.id}" onclick="_lkToggleSystem(${sys.id})" style="padding:10px 14px;font-size:13px;font-weight:900;color:#fff;text-transform:uppercase;background:linear-gradient(135deg,#0f172a,#1e3a5f);border-bottom:2px solid #0f172a;margin-top:6px;box-shadow:0 3px 10px rgba(15,23,42,0.35);border-radius:8px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;transition:all .2s;cursor:pointer;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                <span style="font-size:15px;">🏛️</span>
                <span style="flex:1;">${sys.name}</span>
                <span class="lk-sys-arrow" style="font-size:10px;opacity:0.7;">▼</span>
            </div>`;
            deptListHtml += `<div class="lk-sys-content" data-sys-id="${sys.id}">`;

            // System-level approvers (quản lý cấp cao)
            const sysApprovers = allApprovers.filter(a => a.department_id === sys.id);
            sysApprovers.forEach(a => {
                deptListHtml += `
                    <div class="lk-user-item" data-user-id="${a.user_id}" data-name="${(a.full_name || '').toLowerCase()}" onclick="_lkSelectUser(${a.user_id},'${(a.full_name || '').replace(/'/g, "\\'")}', event)" style="padding:9px 14px 9px 18px;font-size:13px;color:#1e293b;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:all .15s;border-left:3px solid transparent;display:flex;align-items:center;gap:8px;background:white;"
                        onmouseover="if(!this.classList.contains('lk-selected'))this.style.background='#f8fafc'"
                        onmouseout="if(!this.classList.contains('lk-selected'))this.style.background='white'">
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.full_name}</div>
                            <div style="font-size:10px;color:#d97706;font-weight:700;margin-top:1px;">⭐ Quản lý cấp cao</div>
                        </div>
                    </div>`;
            });

            let parentStt = 0, childStt = 0;
            childDepts.forEach(dept => {
                const isSubTeam = childDepts.some(p => p.id === dept.parent_id);
                const subTeams = nonSystemDepts.filter(sub => sub.parent_id === dept.id && activeDeptIds.has(sub.id))
                    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                if (!isSubTeam) { parentStt++; childStt = 0; }
                const sttLabel = !isSubTeam
                    ? `<span style="color:#0f172a;font-size:12px;font-weight:900;margin-right:5px;background:rgba(255,255,255,0.85);padding:1px 6px;border-radius:4px;">${parentStt}.</span>`
                    : `<span style="color:#1e3a5f;font-size:11px;font-weight:800;margin-right:3px;">${++childStt}.</span>`;

                deptListHtml += `<div class="lk-dept-header" data-dept-id="${dept.id}" onclick="_lkSelectDept(${dept.id})" style="padding:${isSubTeam ? '7px 14px 7px 28px' : '10px 14px'};font-size:${isSubTeam ? '11px' : '13px'};font-weight:900;color:${isSubTeam ? '#475569' : '#fff'};text-transform:uppercase;background:${isSubTeam ? 'linear-gradient(135deg,#f1f5f9,#e8eef5)' : 'linear-gradient(135deg,#1e3a5f,#2563eb)'};border-bottom:${isSubTeam ? '1px solid #e2e8f0' : '2px solid #1e40af'};${isSubTeam ? 'border-left:3px solid #93c5fd;' : 'margin-top:4px;box-shadow:0 2px 8px rgba(37,99,235,0.25);border-radius:6px;'}letter-spacing:${isSubTeam ? '0.3px' : '0.5px'};display:flex;align-items:center;gap:6px;transition:all .2s;cursor:pointer;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">${sttLabel}${isSubTeam ? '<span style="color:#94a3b8;">└</span> ' : '<span style="font-size:14px;">🏢</span> '}<span style="flex:1;">${dept.name}</span></div>`;
                deptListHtml += renderDeptUsers(dept, isSubTeam);

                subTeams.forEach(sub => {
                    childStt++;
                    deptListHtml += `<div class="lk-dept-header" data-dept-id="${sub.id}" onclick="_lkSelectDept(${sub.id})" style="padding:7px 14px 7px 28px;font-size:11px;font-weight:900;color:#475569;text-transform:uppercase;background:linear-gradient(135deg,#f1f5f9,#e8eef5);border-bottom:1px solid #e2e8f0;border-left:3px solid #93c5fd;letter-spacing:0.3px;display:flex;align-items:center;gap:6px;transition:all .2s;cursor:pointer;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'"><span style="color:#1e3a5f;font-size:11px;font-weight:800;margin-right:3px;">${childStt}.</span><span style="color:#94a3b8;">└</span> <span style="flex:1;">${sub.name}</span></div>`;
                    deptListHtml += renderDeptUsers(sub, true);
                });
            });
            deptListHtml += `</div>`;
        });

        sidebarHtml = `
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;width:250px;min-width:250px;overflow-y:auto;max-height:calc(100vh - 80px);box-shadow:0 1px 4px rgba(0,0,0,0.06);">
            <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:12px 12px 0 0;">
                <input type="text" id="lkTreeSearch" placeholder="🔍 Tìm nhân viên..." 
                       oninput="_lkFilterSidebar()" 
                       style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;box-sizing:border-box;color:#1e293b;background:white;outline:none;" 
                       onfocus="this.style.borderColor='#2563eb';this.style.boxShadow='0 0 0 2px rgba(37,99,235,0.1)'" 
                       onblur="this.style.borderColor='#e2e8f0';this.style.boxShadow='none'" />
            </div>
            <div id="lkTreeContainer">
                ${deptListHtml}
            </div>
        </div>`;
    } catch(e) {
        sidebarHtml = '<div style="color:#dc2626;padding:20px;">Lỗi tải sidebar</div>';
    }

    container.innerHTML = `
    <div style="display:flex;height:calc(100vh - 60px);overflow:hidden;gap:16px;padding:16px;">
        ${sidebarHtml}
        <!-- RIGHT: TASK LIST -->
        <div id="lkTaskPanel" style="flex:1;overflow-y:auto;padding:0;background:#f8fafc;border-radius:12px;">
            <div style="text-align:center;padding:60px;color:#9ca3af;">
                <div style="font-size:48px;margin-bottom:12px;">👈</div>
                <div style="font-size:14px;font-weight:600;">Chọn phòng ban hoặc nhân viên bên trái</div>
                <div style="font-size:12px;margin-top:4px;">để xem và quản lý công việc khóa</div>
            </div>
        </div>
    </div>`;

    // Detect F5 vs menu navigation
    const lastPage = sessionStorage.getItem('_lk_lastPage');
    const isReload = lastPage === 'bangiao-khoa';
    sessionStorage.setItem('_lk_lastPage', 'bangiao-khoa');

    if (isReload) {
        // F5 on same page → restore previous state
        _lkRestoreState();
    } else {
        // Coming from another menu → reset to defaults
        _lkYear = new Date().getFullYear();
        _lkFromMonth = 0; // Tất cả
        _lkToMonth = 0;
        _lkSelectedUserId = null;
        _lkUserName = '';
        sessionStorage.removeItem('_lk_state');
    }
}

// ===== SIDEBAR FILTER =====
function _lkToggleSystem(sysId) {
    const content = document.querySelector(`.lk-sys-content[data-sys-id="${sysId}"]`);
    const header = document.querySelector(`.lk-system-header[data-sys-id="${sysId}"]`);
    if (!content) return;
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    const arrow = header?.querySelector('.lk-sys-arrow');
    if (arrow) arrow.textContent = isHidden ? '▼' : '▶';
}

function _lkFilterSidebar() {
    const q = (document.getElementById('lkTreeSearch')?.value || '').toLowerCase().trim();

    // Filter users
    document.querySelectorAll('.lk-user-item').forEach(el => {
        if (!q) { el.style.display = ''; return; }
        const name = el.dataset.name || '';
        el.style.display = name.includes(q) ? '' : 'none';
    });

    // Filter dept headers
    document.querySelectorAll('.lk-dept-header').forEach(el => {
        if (!q) { el.style.display = ''; return; }
        const deptName = (el.textContent || '').toLowerCase();
        // Check if any visible members in this dept
        const deptId = el.dataset.deptId;
        let hasVisible = false;
        let sibling = el.nextElementSibling;
        while (sibling && sibling.classList.contains('lk-user-item')) {
            if (sibling.style.display !== 'none') hasVisible = true;
            sibling = sibling.nextElementSibling;
        }
        el.style.display = (deptName.includes(q) || hasVisible) ? '' : 'none';
        // If dept name matches, show all its members
        if (deptName.includes(q)) {
            sibling = el.nextElementSibling;
            while (sibling && sibling.classList.contains('lk-user-item')) {
                sibling.style.display = '';
                sibling = sibling.nextElementSibling;
            }
        }
    });
}

// ===== SELECT DEPT =====
function _lkSelectDept(deptId) {
    _lkSelectedDeptId = deptId;
    _lkSelectedUserId = null;
    // Determine if this is a parent dept (PHÒNG) or sub-team or system dept
    const dept = _lkTreeData?.departments?.find(d => d.id === deptId);
    const parentDept = dept?.parent_id ? _lkTreeData?.departments?.find(d => d.id === dept.parent_id) : null;
    // Check if this is a HỆ THỐNG dept
    _lkIsSystemDept = dept?.name?.startsWith('HỆ THỐNG') || false;
    // It's a parent dept if its parent is a system dept (code starts with 'SYS') or has no parent
    _lkIsParentDept = _lkIsSystemDept || !parentDept || (parentDept?.code?.startsWith('SYS') || parentDept?.name?.startsWith('HỆ THỐNG'));
    // Remove selected styles
    document.querySelectorAll('.lk-user-item').forEach(el => {
        el.classList.remove('lk-selected');
        el.style.background = 'white';
        el.style.color = '#1e293b';
        el.style.fontWeight = '';
        el.style.borderLeft = '3px solid transparent';
    });
    _lkLoadDeptTasks(deptId);
    _lkSaveState();
}

// ===== SELECT USER =====
async function _lkSelectUser(userId, userName, event) {
    if (event) event.stopPropagation();
    _lkSelectedUserId = userId;
    _lkSelectedDeptId = null;
    _lkUserName = userName || _lkUserName;
    // Highlight selected — light blue
    document.querySelectorAll('.lk-user-item').forEach(el => {
        const isActive = Number(el.dataset.userId) === userId;
        el.classList.toggle('lk-selected', isActive);
        el.style.background = isActive ? '#eff6ff' : 'white';
        el.style.color = isActive ? '#1e40af' : '#1e293b';
        el.style.fontWeight = isActive ? '700' : '';
        el.style.borderLeft = isActive ? '3px solid #2563eb' : '3px solid transparent';
        el.style.borderRadius = '';
    });
    _lkSaveState();
    _lkLoadUserTasks(userId, userName);
}

// ===== DEPT TASKS =====
async function _lkLoadDeptTasks(deptId) {
    const panel = document.getElementById('lkTaskPanel');
    if (!panel) return;
    const isManager = ['giam_doc', 'quan_ly', 'truong_phong', 'quan_ly_cap_cao'].includes(currentUser.role);
    const isDirector = currentUser.role === 'giam_doc';

    panel.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải...</div>';

    try {
        const data = await apiCall(`/api/lock-tasks/dept/${deptId}`);
        const tasks = data.tasks || [];
        const dept = _lkTreeData?.departments?.find(d => d.id === deptId);
        const deptName = dept?.name || 'Phòng ban';

        // Show Thêm button: at PHÒNG level for managers, at HỆ THỐNG level only for GĐ
        const canAddTask = _lkIsSystemDept ? isDirector : (isManager && _lkIsParentDept);

        let html = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding:16px 16px 0;">
            <div>
                <h3 style="margin:0;font-size:18px;color:#122546;font-weight:800;">🏢 ${deptName}</h3>
                <div style="font-size:12px;color:#6b7280;margin-top:2px;">${tasks.length} công việc khóa</div>
            </div>
            ${canAddTask ? `<div style="position:relative;display:inline-block;" id="lkAddDropdown_${deptId}">
                <button onclick="_lkToggleAddDropdown(${deptId})" style="padding:8px 18px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#dc2626,#ef4444);color:white;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(220,38,38,0.3);">🔐 Thêm CV Khóa ▼</button>
                <div id="lkAddMenu_${deptId}" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;background:white;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);border:1px solid #e5e7eb;z-index:100;min-width:200px;overflow:hidden;">
                    <div onclick="_lkShowCreateModal(${deptId});_lkCloseAddMenus()" style="padding:10px 16px;cursor:pointer;font-size:13px;color:#374151;font-weight:600;border-bottom:1px solid #f3f4f6;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='white'">📝 Thêm CV Đơn lẻ</div>
                    <div onclick="_ctShowDeployModal(${deptId});_lkCloseAddMenus()" style="padding:10px 16px;cursor:pointer;font-size:13px;color:#374151;font-weight:600;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='white'">🔗 Thêm CV Chuỗi</div>
                </div>
            </div>` : ''}
        </div>`;

        if (tasks.length === 0 && (!data.chain_instances || data.chain_instances.length === 0)) {
            html += `<div style="text-align:center;padding:60px;background:white;border-radius:12px;border:2px solid #e2e8f0;margin:0 16px;">
                <div style="font-size:40px;margin-bottom:8px;">📋</div>
                <div style="color:#9ca3af;font-size:13px;">Chưa có công việc khóa nào</div>
            </div>`;
        } else {
            // Check if this dept has sub-teams
            const hasSubTeams = (_lkIsParentDept || _lkIsSystemDept) && (_lkTreeData?.departments || []).some(d => d.parent_id === deptId);
            const showEdit = _lkIsSystemDept ? isDirector : _lkIsParentDept;
            if (tasks.length > 0) html += `<div style="padding:0 16px;">${_lkRenderTaskTable(tasks, true, showEdit, hasSubTeams)}</div>`;

            // Chain task instances
            const chains = data.chain_instances || [];
            if (chains.length > 0) {
                html += `<div style="padding:0 16px;margin-top:12px;">${_ctRenderChainRows(chains)}</div>`;
            }
        }

        panel.innerHTML = html;
    } catch(e) {
        panel.innerHTML = `<div style="color:#dc2626;padding:20px;">Lỗi: ${e.message}</div>`;
    }
}

// ===== USER TASKS (grouped by task, with year/month range picker + stats) =====
let _lkYear = new Date().getFullYear();
let _lkFromMonth = 0; // 0 = Tất cả (T1-T12)
let _lkToMonth = 0; // 0 = not set
let _lkUserName = '';
let _lkLockGroups = [];
let _lkLockModalIdx = null;
const _LK_STATUS = {
    approved: { icon:'✅', label:'Đạt', bg:'#dcfce7', color:'#059669' },
    pending: { icon:'⏳', label:'Chờ duyệt', bg:'#fef3c7', color:'#d97706' },
    rejected: { icon:'❌', label:'Từ chối', bg:'#fef2f2', color:'#dc2626' },
    expired: { icon:'💀', label:'Quá hạn', bg:'#fef2f2', color:'#991b1b' },
    missed: { icon:'🔴', label:'Bỏ lỡ', bg:'#fef2f2', color:'#dc2626' }
};

function _lkBuildYearOptions() {
    let html = '';
    for (let y = 2026; y <= 2100; y++) {
        html += `<option value="${y}" ${y === _lkYear ? 'selected' : ''}>${y}</option>`;
    }
    return html;
}

function _lkBuildMonthOptions(selected, allowEmpty, emptyLabel) {
    const months = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
    let html = allowEmpty ? `<option value="0"${selected === 0 ? ' selected' : ''}>${emptyLabel || '—'}</option>` : '';
    for (let m = 1; m <= 12; m++) {
        html += `<option value="${m}" ${m === selected ? 'selected' : ''}>${months[m]}</option>`;
    }
    return html;
}

function _lkBuildFromOptions() {
    const months = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
    let html = `<option value="0"${_lkFromMonth === 0 ? ' selected' : ''}>📊 Tất cả</option>`;
    for (let m = 1; m <= 12; m++) {
        html += `<option value="${m}" ${m === _lkFromMonth ? 'selected' : ''}>${months[m]}</option>`;
    }
    return html;
}

function _lkGetMonthRange() {
    if (_lkFromMonth === 0) {
        // "Tất cả" — all 12 months
        const months = [];
        for (let m = 1; m <= 12; m++) months.push(`${_lkYear}-${String(m).padStart(2, '0')}`);
        return months;
    }
    const from = _lkFromMonth;
    const to = _lkToMonth && _lkToMonth >= from ? _lkToMonth : from;
    const months = [];
    for (let m = from; m <= to; m++) {
        months.push(`${_lkYear}-${String(m).padStart(2, '0')}`);
    }
    return months;
}

function _lkRangeLabel() {
    if (_lkFromMonth === 0) return `Tất cả tháng / ${_lkYear}`;
    if (!_lkToMonth || _lkToMonth <= _lkFromMonth) {
        return `Tháng ${_lkFromMonth}/${_lkYear}`;
    }
    return `T${_lkFromMonth} → T${_lkToMonth}/${_lkYear}`;
}

async function _lkLoadUserTasks(userId, userName) {
    const panel = document.getElementById('lkTaskPanel');
    if (!panel) return;
    _lkUserName = userName || _lkUserName;

    panel.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">⏳ Đang tải...</div>';

    try {
        // Fetch all months in range in parallel
        const monthList = _lkGetMonthRange();
        const results = await Promise.all(monthList.map(m => apiCall(`/api/report-history/user/${userId}?month=${m}`)));

        // Merge lock_completions and lock_tasks
        let lock_completions = [];
        let lock_tasks = [];
        const taskIdSet = new Set();
        results.forEach(data => {
            (data.lock_completions || []).forEach(c => lock_completions.push(c));
            (data.lock_tasks || []).forEach(t => {
                if (!taskIdSet.has(t.id)) { taskIdSet.add(t.id); lock_tasks.push(t); }
            });
        });

        // Group by task_name
        const groupMap = new Map();
        lock_completions.forEach(c => {
            const key = c.task_name || 'Unknown';
            if (!groupMap.has(key)) {
                const lt = lock_tasks.find(t => t.id === c.lock_task_id || t.task_name === key) || {};
                groupMap.set(key, {
                    task_name: key,
                    lock_task_id: c.lock_task_id,
                    guide_link: lt.guide_link || '',
                    input_requirements: lt.input_requirements || '',
                    output_requirements: lt.output_requirements || '',
                    requires_approval: lt.requires_approval || false,
                    min_quantity: lt.min_quantity || 1,
                    completions: []
                });
            }
            groupMap.get(key).completions.push(c);
        });
        const lockGroups = [...groupMap.values()].filter(g => g.completions.length > 0);
        _lkLockGroups = lockGroups;

        // Stats
        let totalApproved = 0, totalPending = 0, totalRejected = 0;
        lock_completions.forEach(c => {
            if (c.status === 'approved') totalApproved++;
            else if (c.status === 'pending') totalPending++;
            else if (c.status === 'rejected') totalRejected++;
        });
        const totalAll = lock_completions.length;
        const rate = totalAll > 0 ? Math.round(totalApproved / totalAll * 100) : 0;

        const selectStyle = 'padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;color:#374151;background:white;cursor:pointer;font-weight:600;';

        let html = `
        <div style="padding:16px 20px 0;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
                <div>
                    <h3 style="margin:0;font-size:18px;color:#122546;font-weight:800;">👤 ${_lkUserName || 'Nhân viên'}</h3>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">🔐 CV Khóa • ${_lkRangeLabel()}</div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <select onchange="_lkOnYearChange(this.value)" style="${selectStyle}">
                        ${_lkBuildYearOptions()}
                    </select>
                    <select onchange="_lkOnFromChange(this.value)" style="${selectStyle}">
                        ${_lkBuildFromOptions()}
                    </select>
                    ${_lkFromMonth !== 0 ? `<span style="font-size:11px;color:#9ca3af;font-weight:600;">→</span>
                    <select onchange="_lkOnToChange(this.value)" style="${selectStyle}">
                        ${_lkBuildMonthOptions(_lkToMonth, true, '— Đến —')}
                    </select>` : ''}
                </div>
            </div>
        </div>

        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:0 20px 16px;border-bottom:1px solid #fecaca;">
            <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:#1e40af;">${totalAll}</div>
                <div style="font-size:11px;color:#3b82f6;font-weight:600;">Tổng Báo Cáo</div>
            </div>
            <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #6ee7b7;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:#059669;">${totalApproved} <span style="font-size:14px;color:#10b981;">(${rate}%)</span></div>
                <div style="font-size:11px;color:#059669;font-weight:600;">Đạt</div>
            </div>
            <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fbbf24;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:#d97706;">${totalPending}</div>
                <div style="font-size:11px;color:#d97706;font-weight:600;">Chờ Duyệt</div>
            </div>
            <div style="background:linear-gradient(135deg,#fef2f2,#fecaca);border:1px solid #fca5a5;border-radius:10px;padding:14px;text-align:center;">
                <div style="font-size:24px;font-weight:800;color:#dc2626;">${totalRejected}</div>
                <div style="font-size:11px;color:#dc2626;font-weight:600;">Từ Chối</div>
            </div>
        </div>`;

        // Task groups
        if (lockGroups.length === 0) {
            html += `<div style="text-align:center;padding:60px;color:#9ca3af;font-size:14px;">
                <div style="font-size:40px;margin-bottom:8px;">📭</div>
                Không có báo cáo CV Khóa trong khoảng thời gian này
            </div>`;
        } else {
            html += `<div style="padding:12px 20px;display:flex;flex-direction:column;gap:8px;">`;
            lockGroups.forEach((g, idx) => {
                const approved = g.completions.filter(c => c.status === 'approved').length;
                const pending = g.completions.filter(c => c.status === 'pending').length;
                const rejected = g.completions.filter(c => c.status === 'rejected').length;
                const total = g.completions.length;

                html += `
                <div onclick="_lkShowGroupModal(${idx})" style="background:white;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all .15s;box-shadow:0 1px 3px rgba(0,0,0,0.04);" onmouseover="this.style.boxShadow='0 4px 12px rgba(220,38,38,0.15)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;color:#991b1b;font-size:14px;margin-bottom:4px;">${g.task_name}</div>
                        <div style="display:flex;gap:4px;flex-wrap:wrap;">
                            <span style="background:#fef2f2;color:#991b1b;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;">📊 ${total} báo cáo</span>
                            ${approved > 0 ? `<span style="background:#dcfce7;color:#16a34a;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">✅ ${approved}</span>` : ''}
                            ${pending > 0 ? `<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">⏳ ${pending}</span>` : ''}
                            ${rejected > 0 ? `<span style="background:#fecaca;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">❌ ${rejected}</span>` : ''}
                        </div>
                    </div>
                    <button onclick="event.stopPropagation();_lkShowGroupModal(${idx})" style="padding:6px 14px;font-size:12px;border:1px solid #fecaca;border-radius:6px;background:white;color:#991b1b;cursor:pointer;font-weight:600;white-space:nowrap;">👁️ Xem</button>
                </div>`;
            });
            html += `</div>`;
        }

        panel.innerHTML = html;
    } catch(e) {
        panel.innerHTML = `<div style="color:#dc2626;padding:20px;">Lỗi: ${e.message}</div>`;
    }
}

function _lkOnYearChange(val) {
    _lkYear = Number(val);
    _lkSaveState();
    if (_lkSelectedUserId) _lkLoadUserTasks(_lkSelectedUserId, _lkUserName);
}
function _lkOnFromChange(val) {
    _lkFromMonth = Number(val);
    if (_lkFromMonth === 0) {
        _lkToMonth = 0; // "Tất cả" doesn't need "To"
    } else if (_lkToMonth && _lkToMonth < _lkFromMonth) {
        _lkToMonth = 0;
    }
    _lkSaveState();
    if (_lkSelectedUserId) _lkLoadUserTasks(_lkSelectedUserId, _lkUserName);
}
function _lkOnToChange(val) {
    _lkToMonth = Number(val);
    _lkSaveState();
    if (_lkSelectedUserId) _lkLoadUserTasks(_lkSelectedUserId, _lkUserName);
}

// ===== SESSION PERSISTENCE =====
function _lkSaveState() {
    try {
        sessionStorage.setItem('_lk_state', JSON.stringify({
            userId: _lkSelectedUserId,
            userName: _lkUserName,
            deptId: _lkSelectedDeptId,
            year: _lkYear,
            fromMonth: _lkFromMonth,
            toMonth: _lkToMonth
        }));
    } catch(e) {}
}

function _lkRestoreState() {
    try {
        const raw = sessionStorage.getItem('_lk_state');
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s.year) _lkYear = s.year;
        if (s.fromMonth) _lkFromMonth = s.fromMonth;
        if (s.toMonth !== undefined) _lkToMonth = s.toMonth;
        if (s.userId) {
            _lkSelectedUserId = s.userId;
            _lkUserName = s.userName || '';
            // Highlight user in sidebar
            setTimeout(() => {
                const el = document.querySelector(`.lk-user-item[data-user-id="${s.userId}"]`);
                if (el) {
                    el.classList.add('lk-selected');
                    el.style.background = '#eff6ff';
                    el.style.color = '#1e40af';
                    el.style.fontWeight = '700';
                    el.style.borderLeft = '3px solid #2563eb';
                    el.scrollIntoView({ block: 'center', behavior: 'instant' });
                }
                _lkLoadUserTasks(s.userId, s.userName);
            }, 100);
        } else if (s.deptId) {
            setTimeout(() => {
                _lkSelectDept(s.deptId);
                // Scroll dept header into view
                const deptEl = document.querySelector(`.lk-dept-header[data-dept-id="${s.deptId}"]`);
                if (deptEl) deptEl.scrollIntoView({ block: 'center', behavior: 'instant' });
            }, 100);
        }
    } catch(e) {}
}

// ===== GROUP MODAL (like Lịch Sử Báo Cáo) =====
function _lkShowGroupModal(idx) {
    _lkLockModalIdx = idx;
    _lkRenderGroupModal();
}

function _lkRenderGroupModal() {
    const g = _lkLockGroups[_lkLockModalIdx];
    if (!g) return;

    const completions = g.completions;
    let approved = 0, pending = 0, rejected = 0;
    completions.forEach(c => {
        if (c.status === 'approved') approved++;
        else if (c.status === 'pending') pending++;
        else if (c.status === 'rejected') rejected++;
    });
    const total = completions.length;
    const rate = total > 0 ? Math.round(approved / total * 100) : 0;

    let rows = '';
    completions.sort((a, b) => (a.completion_date || '').localeCompare(b.completion_date || '')).forEach((c, ci) => {
        const dateF = (c.completion_date || '').split('-').reverse().join('/');
        const st = _LK_STATUS[c.status] || _LK_STATUS.missed;
        const statusHtml = `<span style="background:${st.bg};color:${st.color};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap;">${st.icon} ${st.label}</span>`;
        const detailBtn = `<button onclick="event.stopPropagation();_lkShowCompletionDetail(${_lkLockModalIdx},${ci})" style="padding:4px 10px;font-size:11px;border:1px solid #d1d5db;border-radius:5px;background:white;color:#374151;cursor:pointer;font-weight:500;">👁️ Xem</button>`;
        const qd = c.quantity_done || 0;
        const mq = g.min_quantity || 1;
        const qLow = qd < mq;
        const qtyHtml = `<span style="font-weight:700;color:${qLow ? '#dc2626' : '#166534'};font-size:11px;">${qd}/${mq}</span> ${qLow ? '<span style="font-size:10px;color:#dc2626;">⚠️</span>' : '<span style="font-size:10px;color:#16a34a;">✅</span>'}`;
        rows += `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 12px;font-size:12px;color:#374151;white-space:nowrap;">${dateF}</td>
            <td style="padding:8px 12px;text-align:center;">${qtyHtml}</td>
            <td style="padding:8px 12px;text-align:center;">${statusHtml}</td>
            <td style="padding:8px 12px;text-align:center;">${detailBtn}</td>
        </tr>`;
    });

    const contentHtml = `
    <div style="padding:16px 20px;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
            <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#1e40af;">${total}</div>
                <div style="font-size:10px;color:#3b82f6;font-weight:600;">Tổng</div>
            </div>
            <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #6ee7b7;border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#059669;">${approved} <span style="font-size:12px;color:#10b981;">(${rate}%)</span></div>
                <div style="font-size:10px;color:#059669;font-weight:600;">Đạt</div>
            </div>
            <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fbbf24;border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#d97706;">${pending}</div>
                <div style="font-size:10px;color:#d97706;font-weight:600;">Chờ duyệt</div>
            </div>
            <div style="background:linear-gradient(135deg,#fef2f2,#fecaca);border:1px solid #fca5a5;border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#dc2626;">${rejected}</div>
                <div style="font-size:10px;color:#dc2626;font-weight:600;">Từ chối</div>
            </div>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#7f1d1d;">
            <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
                <span>🔐 <b>${g.task_name}</b></span>
                ${g.requires_approval ? '<span>🔒 <b style="color:#d97706;">Cần duyệt</b></span>' : ''}
                ${g.guide_link ? `<a href="${g.guide_link}" target="_blank" style="color:#2563eb;text-decoration:none;">📎 Hướng dẫn CV →</a>` : ''}
            </div>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:linear-gradient(135deg,#1e3a5f,#122546);">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:white;font-weight:700;text-transform:uppercase;border-bottom:2px solid #1e3a5f;">Ngày</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:white;font-weight:700;text-transform:uppercase;border-bottom:2px solid #1e3a5f;">SL Công Việc</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:white;font-weight:700;text-transform:uppercase;border-bottom:2px solid #1e3a5f;">Trạng Thái</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:white;font-weight:700;text-transform:uppercase;border-bottom:2px solid #1e3a5f;width:90px;">Chi Tiết</th>
                </tr></thead>
                <tbody>${rows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;font-size:12px;">Chưa có báo cáo</td></tr>'}</tbody>
            </table>
        </div>
    </div>`;

    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    if (overlay && titleEl && body) {
        titleEl.innerHTML = `<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:6px;font-size:12px;margin-right:8px;">🔐</span> ${g.task_name}`;
        body.innerHTML = contentHtml;
        footer.innerHTML = `<button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
        overlay.classList.add('show');
    }
}

// ===== COMPLETION DETAIL (like Lịch Sử Báo Cáo lock detail) =====
function _lkShowCompletionDetail(groupIdx, compIdx) {
    const g = _lkLockGroups[groupIdx];
    if (!g) return;
    const c = g.completions.sort((a, b) => (a.completion_date || '').localeCompare(b.completion_date || ''))[compIdx];
    if (!c) return;

    const st = _LK_STATUS[c.status] || _LK_STATUS.missed;
    const dateF = (c.completion_date || '').split('-').reverse().join('/');

    const parseReqs = (val) => {
        if (!val) return '';
        try {
            const arr = JSON.parse(val);
            if (Array.isArray(arr)) return arr.map((r, i) => `<div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0;"><span style="background:#e0e7ff;color:#4f46e5;padding:1px 7px;border-radius:50%;font-size:10px;font-weight:700;">${i+1}</span> <span>${r}</span></div>`).join('');
        } catch(e) {}
        return `<div>${val}</div>`;
    };

    let contentHtml = `
    <div style="padding:20px;">
        <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="font-weight:700;color:#991b1b;font-size:16px;">${g.task_name}</div>
                <span style="background:${st.bg};color:${st.color};padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700;">${st.icon} ${st.label}</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <div style="background:white;border:1px solid #fecaca;border-radius:8px;padding:6px 14px;display:flex;align-items:center;gap:6px;">
                    <span style="font-size:14px;">📅</span>
                    <span style="font-size:12px;color:#374151;font-weight:600;">${dateF}</span>
                </div>
                <div style="background:linear-gradient(135deg,#dc2626,#ef4444);border-radius:8px;padding:6px 14px;display:flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(220,38,38,0.3);">
                    <span style="font-size:14px;">🔐</span>
                    <span style="font-size:12px;color:white;font-weight:700;">CV Khóa</span>
                </div>
            </div>
        </div>

        ${g.guide_link ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">📎</span>
            <div>
                <div style="font-size:11px;color:#6b7280;font-weight:600;">Hướng dẫn công việc:</div>
                <a href="${g.guide_link}" target="_blank" style="color:#2563eb;font-size:12px;word-break:break-all;">${g.guide_link}</a>
            </div>
        </div>` : ''}

        ${g.input_requirements ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-bottom:12px;">
            <div style="font-size:11px;color:#166534;font-weight:700;margin-bottom:6px;">🔽 Yêu cầu đầu vào</div>
            <div style="font-size:12px;color:#374151;">${parseReqs(g.input_requirements)}</div>
        </div>` : ''}
        ${g.output_requirements ? `<div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:12px;">
            <div style="font-size:11px;color:#854d0e;font-weight:700;margin-bottom:6px;">🔼 Yêu cầu đầu ra</div>
            <div style="font-size:12px;color:#374151;">${parseReqs(g.output_requirements)}</div>
        </div>` : ''}

        <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-top:16px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:10px 16px;display:flex;align-items:center;gap:8px;">
                <span style="font-size:15px;">📝</span>
                <span style="color:white;font-size:13px;font-weight:700;letter-spacing:0.5px;">NỘI DUNG BÁO CÁO</span>
            </div>
            <div style="padding:16px;">
                ${c.proof_url ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:10px;">
                    <div style="font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">📎 Link báo cáo</div>
                    <a href="${c.proof_url}" target="_blank" style="color:#2563eb;font-size:13px;word-break:break-all;font-weight:500;">${c.proof_url}</a>
                </div>` : ''}
                ${c.content ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:10px;">
                    <div style="font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">📝 Nội dung báo cáo</div>
                    <div style="font-size:13px;color:#1e293b;line-height:1.6;white-space:pre-wrap;">${c.content}</div>
                </div>` : ''}
                ${(() => { const qd = c.quantity_done || 0; const mq = g.min_quantity || 1; const isLow = qd < mq; return `<div style="background:${isLow ? '#fef2f2' : '#f0fdf4'};border:1px solid ${isLow ? '#fecaca' : '#bbf7d0'};border-radius:8px;padding:8px 14px;margin-bottom:10px;display:flex;align-items:center;gap:8px;"><span style="font-size:12px;font-weight:700;color:${isLow ? '#dc2626' : '#166534'};">📊 Số lượng: ${qd}/${mq}</span>${isLow ? '<span style="font-size:10px;color:#dc2626;font-weight:600;">⚠️ Chưa đạt</span>' : '<span style="font-size:10px;color:#16a34a;font-weight:600;">✅ Đạt</span>'}</div>`; })()}
                ${c.reject_reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;margin-top:10px;">
                    <div style="font-size:10px;color:#dc2626;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">❌ Lý do từ chối</div>
                    <div style="font-size:13px;color:#dc2626;line-height:1.5;">${c.reject_reason}</div>
                </div>` : ''}
                ${c.redo_count > 0 ? `<div style="margin-top:8px;font-size:11px;color:#6b7280;text-align:right;">🔄 Đã nộp lại: <b>${c.redo_count}</b> lần</div>` : ''}
                ${!c.proof_url && !c.content ? `<div style="text-align:center;color:#9ca3af;font-size:13px;padding:24px;">
                    <div style="font-size:30px;margin-bottom:8px;">📭</div>
                    Nhân viên chưa nộp nội dung báo cáo
                </div>` : ''}
            </div>
        </div>
    </div>`;

    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    if (overlay && titleEl && body) {
        titleEl.textContent = '📋 Chi Tiết Báo Cáo';
        body.innerHTML = contentHtml;
        footer.innerHTML = `
            <button class="btn btn-secondary" onclick="_lkShowGroupModal(${groupIdx})" style="margin-right:auto;">← Quay lại</button>
            <button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
        overlay.classList.add('show');
    }
}

// ===== TASK TABLE (DEPT VIEW) =====
function _lkRenderTaskTable(tasks, showAssignees, showEditBtns = true, showTeamCol = false) {
    let html = `<div style="background:white;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr style="background:linear-gradient(135deg,#991b1b,#dc2626);">
                    <th style="padding:10px 12px;text-align:left;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Công việc</th>
                    <th style="padding:10px 12px;text-align:left;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Lặp lại</th>
                    <th style="padding:10px 12px;text-align:center;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">QL Duyệt</th>
                    <th style="padding:10px 12px;text-align:right;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Phạt</th>
                    ${showTeamCol ? '<th style="padding:10px 12px;text-align:left;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Team</th>' : ''}
                    ${showAssignees ? '<th style="padding:10px 12px;text-align:left;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Nhân viên</th>' : ''}
                    ${showEditBtns ? '<th style="padding:10px 12px;width:60px;"></th>' : ''}
                </tr>
            </thead>
            <tbody>`;

    tasks.forEach((t, i) => {
        const recLabel = _LK_RECURRENCE_LABELS[t.recurrence_type] || t.recurrence_type;
        const recDetail = t.recurrence_type === 'weekly' ? ` (${_LK_DAY_NAMES[Number(t.recurrence_value)] || ''})` :
                          t.recurrence_type === 'monthly' ? ` (ngày ${t.recurrence_value})` : '';

        // Group users by team for team column
        let teamColHtml = '';
        if (showTeamCol) {
            const teams = {};
            (t.assigned_users || []).forEach(u => {
                const tn = u.dept_name || 'Khác';
                if (!teams[tn]) teams[tn] = [];
                teams[tn].push(u.name);
            });
            teamColHtml = Object.keys(teams).map(tn => `<span style="display:inline-block;background:#f0f9ff;color:#0369a1;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;margin:1px 2px;white-space:nowrap;">🏢 ${tn}</span>`).join('');
        }

        html += `<tr style="border-bottom:1px solid #f1f5f9;${i % 2 ? 'background:#fafbfc;' : ''}">
            <td style="padding:10px 12px;">
                <div style="font-size:13px;font-weight:700;color:#1e293b;">${t.task_name}</div>
                ${t.guide_link ? `<a href="${t.guide_link}" target="_blank" style="font-size:10px;color:#2563eb;">📖 Hướng dẫn</a>` : ''}
            </td>
            <td style="padding:10px 12px;font-size:11px;color:#6b7280;">${recLabel}${recDetail}</td>
            <td style="padding:10px 12px;text-align:center;font-size:11px;">${t.requires_approval ? '✅' : '—'}</td>
            <td style="padding:10px 12px;text-align:right;font-size:12px;font-weight:700;color:#dc2626;">${(t.penalty_amount || 50000).toLocaleString()}đ</td>
            ${showTeamCol ? `<td style="padding:10px 12px;">${teamColHtml || '<span style="color:#9ca3af;">—</span>'}</td>` : ''}
            ${showAssignees ? `<td style="padding:10px 12px;font-size:11px;color:#374151;max-width:200px;">
                ${(t.assigned_users || []).map(u => `<span style="display:inline-block;background:#eff6ff;color:#1d4ed8;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;margin:1px 2px;cursor:pointer;white-space:nowrap;" onclick="_lkSelectUser(${u.id},'${(u.name||'').replace(/'/g,"\\'")}',event)">👤 ${u.name}</span>`).join('') || '<span style="color:#9ca3af;">—</span>'}
            </td>` : ''}
            ${showEditBtns ? `<td style="padding:10px 12px;text-align:center;">
                <button onclick="_lkEditTask(${t.id})" style="padding:2px 6px;font-size:10px;border:1px solid #e2e8f0;border-radius:4px;background:white;color:#6b7280;cursor:pointer;">✏️</button>
                <button onclick="_lkDeleteTask(${t.id})" style="padding:2px 6px;font-size:10px;border:1px solid #fecaca;border-radius:4px;background:white;color:#dc2626;cursor:pointer;">🗑️</button>
            </td>` : ''}
        </tr>`;
    });

    html += '</tbody></table></div>';
    return html;
}

// ===== CREATE/EDIT MODAL =====
async function _lkShowCreateModal(deptId, editTask) {
    document.getElementById('lkTaskModal')?.remove();

    // Load dept users for assignment
    let deptUsers = [];
    try {
        const d = await apiCall(`/api/lock-tasks/dept-users/${deptId}`);
        deptUsers = d.users || [];
    } catch(e) {}

    const isEdit = !!editTask;
    const t = editTask || {};
    const assignedIds = (t.assigned_users || []).map(u => u.id);

    const modal = document.createElement('div');
    modal.id = 'lkTaskModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
    modal.innerHTML = `
    <div style="background:white;border-radius:16px;width:620px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.3);">
        <div style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:18px 24px;border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between;">
            <span style="color:white;font-weight:800;font-size:16px;">🔐 ${isEdit ? 'Sửa' : 'Thêm'} Công Việc Khóa</span>
            <button onclick="document.getElementById('lkTaskModal')?.remove()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;">✕</button>
        </div>
        <div style="padding:20px 24px;">
            <div style="margin-bottom:14px;">
                <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Tên công việc *</label>
                <input id="lkf_name" type="text" value="${t.task_name || ''}" placeholder="VD: Báo cáo doanh thu" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Nội dung công việc *</label>
                <textarea id="lkf_content" rows="2" placeholder="Mô tả chi tiết..." style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;">${t.task_content || ''}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Link hướng dẫn *</label>
                    <input id="lkf_guide" type="url" value="${t.guide_link || ''}" placeholder="https://..." style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">SL tối thiểu *</label>
                    <input id="lkf_min_qty" type="number" value="${t.min_quantity || 1}" min="1" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Mức phạt</label>
                    <div style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;box-sizing:border-box;background:#f8fafc;color:#64748b;font-weight:600;">⚙️ Theo cấu hình hệ thống</div>
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <label style="font-size:11px;font-weight:700;color:#991b1b;">📥 Yêu cầu đầu vào CV *</label>
                    <button type="button" onclick="_lkAddReqItem('lkf_input_list')" style="padding:2px 10px;font-size:14px;border:1px solid #a7f3d0;border-radius:6px;background:#f0fdf4;color:#059669;cursor:pointer;font-weight:800;">＋</button>
                </div>
                <div id="lkf_input_list">${_lkRenderReqItems(_lkParseReqs(t.input_requirements))}</div>
            </div>
            <div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <label style="font-size:11px;font-weight:700;color:#991b1b;">📤 Yêu cầu đầu ra CV *</label>
                    <button type="button" onclick="_lkAddReqItem('lkf_output_list')" style="padding:2px 10px;font-size:14px;border:1px solid #a7f3d0;border-radius:6px;background:#f0fdf4;color:#059669;cursor:pointer;font-weight:800;">＋</button>
                </div>
                <div id="lkf_output_list">${_lkRenderReqItems(_lkParseReqs(t.output_requirements))}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Loại lặp lại *</label>
                    <select id="lkf_recurrence" onchange="_lkRecurrenceChanged()" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        <option value="administrative" ${t.recurrence_type === 'administrative' ? 'selected' : ''}>🏢 Hành chính (T2-T7)</option>
                        <option value="daily" ${t.recurrence_type === 'daily' ? 'selected' : ''}>🔄 Hằng ngày (T2-CN)</option>
                        <option value="weekly" ${t.recurrence_type === 'weekly' ? 'selected' : ''}>📅 Lặp theo tuần</option>
                        <option value="monthly" ${t.recurrence_type === 'monthly' ? 'selected' : ''}>📅 Lặp theo tháng</option>
                        <option value="once" ${t.recurrence_type === 'once' ? 'selected' : ''}>1️⃣ Không lặp (1 lần)</option>
                    </select>
                </div>
                <div id="lkf_recurrence_value_wrap">
                    ${_lkRecurrenceValueHTML(t.recurrence_type || 'administrative', t.recurrence_value)}
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                    <input id="lkf_approval" type="checkbox" ${t.requires_approval ? 'checked' : ''} onchange="document.getElementById('lkf_redo_wrap').style.display=this.checked?'block':'none'" style="width:16px;height:16px;">
                    <span style="font-size:12px;font-weight:600;color:#374151;">QL phải duyệt (Nếu tích, sau khi NV nộp → QL phải duyệt/từ chối)</span>
                </label>
                <div id="lkf_redo_wrap" style="margin-top:8px;margin-left:24px;display:${t.requires_approval ? 'block' : 'none'};">
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Số lần nộp lại tối đa khi bị từ chối</label>
                    <input id="lkf_redo_max" type="number" value="${t.max_redo_count || 3}" min="1" max="10" style="width:100px;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;">
                </div>
            </div>
            <!-- ASSIGN USERS -->
            <div style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <label style="font-size:11px;font-weight:700;color:#374151;">Gán cho nhân viên *</label>
                    <label style="font-size:10px;color:#6b7280;cursor:pointer;"><input type="checkbox" id="lkf_selectAll" onchange="_lkToggleAll(this.checked)" ${deptUsers.length === assignedIds.length && deptUsers.length > 0 ? 'checked' : ''}> Chọn tất cả</label>
                </div>
                <div id="lkf_userList" style="max-height:200px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;padding:8px;">
                    ${(() => {
                        // Group users by dept hierarchy
                        let userHtml = '';
                        if (_lkIsSystemDept) {
                            // HỆ THỐNG: show QLCC first, then group by PHÒNG → Team
                            const qlccUsers = deptUsers.filter(u => ['quan_ly'].includes(u.role) || u.department_id === deptId);
                            const otherUsers = deptUsers.filter(u => !qlccUsers.some(q => q.id === u.id));
                            if (qlccUsers.length > 0) {
                                userHtml += `<div style="font-size:10px;font-weight:800;color:#dc2626;text-transform:uppercase;padding:6px 6px 2px;margin-top:2px;border-bottom:2px solid #fecaca;background:#fef2f2;border-radius:4px;">⭐ QUẢN LÝ CẤP CAO</div>`;
                                qlccUsers.forEach(u => {
                                    userHtml += `<label style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:12px;color:#991b1b;font-weight:600;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'"><input type="checkbox" class="lkf-user-cb" value="${u.id}" ${assignedIds.includes(u.id) ? 'checked' : ''} style="width:14px;height:14px;"> ⭐ ${u.full_name}</label>`;
                                });
                            }
                            // Group remaining by PHÒNG
                            const phongGroups = {};
                            otherUsers.forEach(u => {
                                const key = u.dept_name || 'Khác';
                                if (!phongGroups[key]) phongGroups[key] = [];
                                phongGroups[key].push(u);
                            });
                            Object.keys(phongGroups).forEach(grp => {
                                userHtml += `<div style="font-size:10px;font-weight:800;color:#1e3a5f;text-transform:uppercase;padding:6px 6px 2px;margin-top:6px;border-bottom:1px solid #e2e8f0;">📂 ${grp}</div>`;
                                phongGroups[grp].forEach(u => {
                                    userHtml += `<label style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:12px;color:#374151;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'"><input type="checkbox" class="lkf-user-cb" value="${u.id}" ${assignedIds.includes(u.id) ? 'checked' : ''} style="width:14px;height:14px;"> ${u.full_name}</label>`;
                                });
                            });
                        } else {
                            // Normal PHÒNG: group by team
                            const groups = {};
                            deptUsers.forEach(u => {
                                const key = u.dept_name || 'Khác';
                                if (!groups[key]) groups[key] = [];
                                groups[key].push(u);
                            });
                            Object.keys(groups).forEach(grp => {
                                if (Object.keys(groups).length > 1) {
                                    userHtml += `<div style="font-size:10px;font-weight:800;color:#1e3a5f;text-transform:uppercase;padding:6px 6px 2px;margin-top:4px;border-bottom:1px solid #e2e8f0;">🏢 ${grp}</div>`;
                                }
                                groups[grp].forEach(u => {
                                    userHtml += `<label style="display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:12px;color:#374151;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'"><input type="checkbox" class="lkf-user-cb" value="${u.id}" ${assignedIds.includes(u.id) ? 'checked' : ''} style="width:14px;height:14px;"> ${u.full_name}</label>`;
                                });
                            });
                        }
                        return userHtml;
                    })()}
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:10px;border-top:1px solid #e2e8f0;">
                <button onclick="document.getElementById('lkTaskModal')?.remove()" style="padding:8px 20px;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-weight:600;">Hủy</button>
                <button onclick="_lkSaveTask(${isEdit ? t.id : 'null'}, ${deptId})" style="padding:8px 24px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#dc2626,#991b1b);color:white;cursor:pointer;font-weight:700;">💾 ${isEdit ? 'Cập nhật' : 'Tạo công việc'}</button>
            </div>
        </div>
    </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    _lkRecurrenceChanged();
}

function _lkRecurrenceValueHTML(type, value) {
    if (type === 'weekly') {
        return `<div>
            <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Thứ mấy?</label>
            <select id="lkf_recval" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                <option value="1" ${value==='1'?'selected':''}>Thứ 2</option>
                <option value="2" ${value==='2'?'selected':''}>Thứ 3</option>
                <option value="3" ${value==='3'?'selected':''}>Thứ 4</option>
                <option value="4" ${value==='4'?'selected':''}>Thứ 5</option>
                <option value="5" ${value==='5'?'selected':''}>Thứ 6</option>
                <option value="6" ${value==='6'?'selected':''}>Thứ 7</option>
                <option value="0" ${value==='0'?'selected':''}>Chủ nhật</option>
            </select>
        </div>`;
    } else if (type === 'monthly') {
        return `<div>
            <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Ngày mấy?</label>
            <input id="lkf_recval" type="number" value="${value || '1'}" min="1" max="31" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>`;
    } else if (type === 'once') {
        return `<div>
            <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Ngày cụ thể</label>
            <input id="lkf_recval" type="date" value="${value || ''}" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>`;
    }
    return '<div style="padding-top:20px;font-size:11px;color:#9ca3af;">Không cần cấu hình thêm</div>';
}

// ========== LOCK TASK REQUIREMENT HELPERS ==========
function _lkParseReqs(val) {
    if (!val) return [''];
    const raw = (typeof val === 'string') ? val.trim() : '';
    if (!raw) return [''];
    try { if (raw.startsWith('[')) { const arr = JSON.parse(raw); return arr.length ? arr : ['']; } } catch(e) {}
    return [raw];
}

function _lkRenderReqItems(items) {
    if (!items || items.length === 0) items = [''];
    return items.map((item, i) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;" class="lkReqRow">
            <span style="font-size:11px;font-weight:700;color:#6b7280;min-width:20px;">${i + 1}.</span>
            <input type="text" class="lkReqInput" value="${(item || '').replace(/"/g, '&quot;')}" placeholder="Nhập yêu cầu..." style="flex:1;padding:6px 10px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;box-sizing:border-box;">
            <button type="button" onclick="_lkRemoveReqItem(this)" style="padding:2px 8px;font-size:12px;border:1px solid #fecaca;border-radius:4px;background:#fff5f5;color:#dc2626;cursor:pointer;" title="Xóa">🗑️</button>
        </div>
    `).join('');
}

function _lkAddReqItem(containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    const count = wrap.querySelectorAll('.lkReqRow').length;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
    div.className = 'lkReqRow';
    div.innerHTML = `
        <span style="font-size:11px;font-weight:700;color:#6b7280;min-width:20px;">${count + 1}.</span>
        <input type="text" class="lkReqInput" placeholder="Nhập yêu cầu..." style="flex:1;padding:6px 10px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;box-sizing:border-box;">
        <button type="button" onclick="_lkRemoveReqItem(this)" style="padding:2px 8px;font-size:12px;border:1px solid #fecaca;border-radius:4px;background:#fff5f5;color:#dc2626;cursor:pointer;" title="Xóa">🗑️</button>
    `;
    wrap.appendChild(div);
    div.querySelector('.lkReqInput').focus();
}

function _lkRemoveReqItem(btn) {
    const row = btn.closest('.lkReqRow');
    const wrap = row.parentElement;
    if (wrap.querySelectorAll('.lkReqRow').length <= 1) { showToast('Phải có ít nhất 1 yêu cầu!', 'error'); return; }
    row.remove();
    wrap.querySelectorAll('.lkReqRow').forEach((r, i) => {
        const num = r.querySelector('span');
        if (num) num.textContent = (i + 1) + '.';
    });
}

function _lkCollectReqItems(containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return [];
    return [...wrap.querySelectorAll('.lkReqInput')].map(el => el.value.trim()).filter(v => v);
}

function _lkRecurrenceChanged() {
    const type = document.getElementById('lkf_recurrence')?.value;
    const wrap = document.getElementById('lkf_recurrence_value_wrap');
    if (wrap) wrap.innerHTML = _lkRecurrenceValueHTML(type, '');
}

function _lkToggleAll(checked) {
    document.querySelectorAll('.lkf-user-cb').forEach(cb => cb.checked = checked);
}

async function _lkSaveTask(taskId, deptId) {
    const name = document.getElementById('lkf_name')?.value?.trim();
    if (!name) { alert('Nhập tên công việc!'); return; }
    const content = document.getElementById('lkf_content')?.value?.trim();
    if (!content) { alert('Nhập nội dung công việc!'); return; }
    const guideLink = document.getElementById('lkf_guide')?.value?.trim();
    if (!guideLink) { alert('Nhập link hướng dẫn!'); return; }
    const inputReqs = _lkCollectReqItems('lkf_input_list');
    if (inputReqs.length === 0) { alert('Nhập ít nhất 1 yêu cầu đầu vào!'); return; }
    const outputReqs = _lkCollectReqItems('lkf_output_list');
    if (outputReqs.length === 0) { alert('Nhập ít nhất 1 yêu cầu đầu ra!'); return; }

    const userIds = [];
    document.querySelectorAll('.lkf-user-cb:checked').forEach(cb => userIds.push(Number(cb.value)));
    if (userIds.length === 0) { alert('Chọn ít nhất 1 nhân viên!'); return; }

    const payload = {
        task_name: name,
        task_content: content,
        guide_link: guideLink,
        input_requirements: JSON.stringify(inputReqs),
        output_requirements: JSON.stringify(outputReqs),
        recurrence_type: document.getElementById('lkf_recurrence')?.value || 'administrative',
        recurrence_value: document.getElementById('lkf_recval')?.value || '',
        requires_approval: document.getElementById('lkf_approval')?.checked || false,
        max_redo_count: Number(document.getElementById('lkf_redo_max')?.value) || 3,
        penalty_amount: 50000,
        min_quantity: Number(document.getElementById('lkf_min_qty')?.value) || 1,
        department_id: deptId,
        user_ids: userIds
    };

    try {
        if (taskId) {
            await apiCall(`/api/lock-tasks/${taskId}`, 'PUT', payload);
            showToast('✅ Đã cập nhật');
        } else {
            await apiCall('/api/lock-tasks', 'POST', payload);
            showToast('✅ Đã tạo công việc khóa');
        }
        document.getElementById('lkTaskModal')?.remove();
        if (_lkSelectedUserId) {
            _lkSelectUser(_lkSelectedUserId, '', null);
        } else {
            _lkLoadDeptTasks(deptId);
        }
        // Reload sidebar to update status badges
        const content = document.getElementById('content') || document.querySelector('[id="content"]');
        if (content) renderBanGiaoKhoaPage(content);
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

async function _lkEditTask(taskId) {
    try {
        const deptId = _lkSelectedDeptId || 0;
        const tasks = await apiCall(`/api/lock-tasks/dept/${deptId}`);
        const task = (tasks.tasks || []).find(t => t.id === taskId);
        if (task) {
            _lkShowCreateModal(task.department_id, task);
        }
    } catch(e) { alert('Lỗi'); }
}

async function _lkDeleteTask(taskId) {
    if (!confirm('Xóa công việc này?')) return;
    try {
        await apiCall(`/api/lock-tasks/${taskId}`, 'DELETE');
        showToast('✅ Đã xóa');
        if (_lkSelectedUserId) {
            _lkSelectUser(_lkSelectedUserId, '', null);
        } else if (_lkSelectedDeptId) {
            _lkLoadDeptTasks(_lkSelectedDeptId);
        }
    } catch(e) { alert('Lỗi'); }
}

// ===== UPLOAD PROOF =====
function _lkUploadProof(taskId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = document.cookie.split('token=')[1]?.split(';')[0];
            const res = await fetch(`/api/lock-tasks/${taskId}/submit`, {
                method: 'POST',
                headers: { 'Cookie': `token=${token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                showToast('✅ Đã nộp bài!');
                if (_lkSelectedUserId) _lkSelectUser(_lkSelectedUserId, '', null);
            } else {
                alert(data.error || 'Lỗi');
            }
        } catch(e) {
            alert('Lỗi upload: ' + e.message);
        }
    };
    input.click();
}

// ===== REVIEW =====
async function _lkReview(completionId, action) {
    let reason = '';
    if (action === 'reject') {
        reason = prompt('Lý do từ chối:');
        if (reason === null) return;
    }

    try {
        await apiCall(`/api/lock-tasks/${completionId}/review`, 'POST', { action, reject_reason: reason });
        showToast(action === 'approve' ? '✅ Đã duyệt' : '❌ Đã từ chối');
        if (_lkSelectedUserId) _lkSelectUser(_lkSelectedUserId, '', null);
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

// ==================== CÔNG VIỆC CHUỖI (Chain Tasks) ====================

// Dropdown toggle
function _lkToggleAddDropdown(deptId) {
    _lkCloseAddMenus();
    const menu = document.getElementById(`lkAddMenu_${deptId}`);
    if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}
function _lkCloseAddMenus() {
    document.querySelectorAll('[id^="lkAddMenu_"]').forEach(el => el.style.display = 'none');
}
document.addEventListener('click', (e) => {
    if (!e.target.closest('[id^="lkAddDropdown_"]')) _lkCloseAddMenus();
});

// Render chain rows for dept view
function _ctRenderChainRows(chains) {
    if (!chains || chains.length === 0) return '';
    // Store for popup
    window._ctChainsList = chains;

    // Group by chain_name
    const grouped = {};
    chains.forEach(c => {
        const key = c.chain_name || 'Không tên';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
    });

    let html = `<div style="margin-top:8px;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#122546);color:white;padding:8px 14px;border-radius:8px 8px 0 0;font-size:12px;font-weight:700;">🔗 CÔNG VIỆC CHUỖI</div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">`;

    Object.keys(grouped).forEach(chainName => {
        const instances = grouped[chainName];
        const totalAll = instances.reduce((s, c) => s + Number(c.total_items || 0), 0);
        const doneAll = instances.reduce((s, c) => s + Number(c.completed_items || 0), 0);
        const pctAll = totalAll > 0 ? Math.round(doneAll / totalAll * 100) : 0;
        const allDone = instances.every(c => c.status === 'completed');
        const statusColor = allDone ? '#059669' : '#2563eb';
        const deployCount = instances.length;
        const modeLabel = instances[0].execution_mode === 'sequential' ? 'Tuần tự' : 'Song song';
        const escapedName = chainName.replace(/'/g, "\\'");

        // Collect unique users across all instances
        const allUsersSet = new Set();
        instances.forEach(c => {
            if (c.assigned_users_str) {
                c.assigned_users_str.split(', ').forEach(u => allUsersSet.add(u.trim()));
            }
        });
        const uniqueUsers = [...allUsersSet];

        html += `<div onclick="_ctShowChainInstancesModal('${escapedName}')" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#f0f7ff'" onmouseout="this.style.background='white'">
            <div style="flex:1;">
                <div style="font-weight:700;color:#1e293b;font-size:13px;">🔗 ${chainName}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px;">📋 ${modeLabel} • ${instances[0].total_items || 0} task con • ${instances[0].creator_name || ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;max-width:300px;justify-content:flex-end;">
                ${uniqueUsers.map(u => `<span style="padding:1px 6px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;font-size:10px;color:#1d4ed8;font-weight:600;white-space:nowrap;">👤 ${u}</span>`).join('')}
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-left:10px;">
                <span style="padding:2px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;font-size:10px;font-weight:700;color:#2563eb;">${deployCount} lần triển khai</span>
                <div style="width:60px;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
                    <div style="width:${pctAll}%;height:100%;background:${statusColor};border-radius:3px;"></div>
                </div>
                <span style="font-size:11px;font-weight:600;color:${statusColor};white-space:nowrap;">${allDone ? '✅' : doneAll+'/'+totalAll}</span>
            </div>
        </div>`;
    });

    html += `</div></div>`;
    return html;
}

function _ctShowChainInstancesModal(chainName) {
    const allChains = window._ctChainsList || [];
    const instances = allChains.filter(c => (c.chain_name || '') === chainName);
    if (instances.length === 0) return;
    _ctCurrentChainName = chainName;

    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    if (!overlay || !titleEl || !body) return;

    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) modalContainer.style.maxWidth = '950px';

    const modeLabel = instances[0].execution_mode === 'sequential' ? 'Tuần tự' : 'Song song';
    titleEl.innerHTML = `🔗 ${chainName}`;

    let html = `<div style="padding:12px 16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;padding:8px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
            <span style="font-size:12px;color:#1e40af;font-weight:600;">📋 ${modeLabel}</span>
            <span style="font-size:12px;color:#1e40af;">•</span>
            <span style="font-size:12px;color:#1e40af;font-weight:600;">${instances[0].total_items || 0} task con</span>
            <span style="font-size:12px;color:#1e40af;">•</span>
            <span style="font-size:12px;color:#1e40af;font-weight:600;">${instances.length} lần triển khai</span>
        </div>
        <table style="width:100%;font-size:11px;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead>
                <tr style="background:linear-gradient(135deg,#1e3a5f,#122546);">
                    <th style="padding:8px 10px;text-align:left;color:white;font-weight:700;">📅 Thời gian</th>
                    <th style="padding:8px 10px;text-align:center;color:white;font-weight:700;">Task con</th>
                    <th style="padding:8px 10px;text-align:center;color:white;font-weight:700;">Mức phạt</th>
                    <th style="padding:8px 10px;text-align:left;color:white;font-weight:700;">👤 Nhân viên</th>
                    <th style="padding:8px 10px;text-align:center;color:white;font-weight:700;">Tiến độ</th>
                    <th style="padding:8px 10px;text-align:center;color:white;font-weight:700;">Trạng thái</th>
                    <th style="padding:8px 10px;text-align:center;color:white;font-weight:700;"></th>
                </tr>
            </thead>
            <tbody>`;

    instances.forEach((c, idx) => {
        const pct = Number(c.total_items) > 0 ? Math.round(Number(c.completed_items) / Number(c.total_items) * 100) : 0;
        const sc = c.status === 'completed' ? '#059669' : '#2563eb';
        const startStr = c.start_date ? _ctFmtDate(c.start_date) : '—';
        const endStr = c.end_date ? _ctFmtDate(c.end_date) : '—';
        const penaltyItem = c.penalty_amount ? Number(c.penalty_amount).toLocaleString('vi-VN') + 'đ' : '—';
        const penaltyChain = c.chain_penalty_amount ? Number(c.chain_penalty_amount).toLocaleString('vi-VN') + 'đ' : '—';
        const users = c.assigned_users_str || '—';
        const statusBadge = c.status === 'completed'
            ? '<span style="padding:2px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;color:#059669;font-weight:700;font-size:10px;">✅ Xong</span>'
            : '<span style="padding:2px 8px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;color:#2563eb;font-weight:700;font-size:10px;">⏳ Đang chạy</span>';

        html += `<tr style="border-bottom:1px solid #f3f4f6;" onmouseover="this.style.background='#fafbfc'" onmouseout="this.style.background='white'">
            <td style="padding:8px 10px;white-space:nowrap;"><b>#${idx+1}</b> ${startStr} → ${endStr}</td>
            <td style="padding:8px 10px;text-align:center;font-weight:700;">${c.completed_items}/${c.total_items}</td>
            <td style="padding:8px 10px;text-align:center;color:#9333ea;font-weight:600;font-size:10px;">⚙️ theo HT</td>
            <td style="padding:8px 10px;max-width:140px;overflow:hidden;text-overflow:ellipsis;">${users}</td>
            <td style="padding:8px 10px;text-align:center;">
                <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                    <div style="width:50px;height:5px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
                        <div style="width:${pct}%;height:100%;background:${sc};border-radius:3px;"></div>
                    </div>
                    <span style="font-weight:700;color:${sc};font-size:10px;">${pct}%</span>
                </div>
            </td>
            <td style="padding:8px 10px;text-align:center;">${statusBadge}</td>
            <td style="padding:8px 10px;text-align:center;">
                <button onclick="_ctShowDetailModal(${c.id})" style="padding:3px 10px;font-size:10px;border:1px solid #2563eb;border-radius:5px;background:white;color:#2563eb;cursor:pointer;font-weight:600;">📊 Xem</button>
            </td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    body.innerHTML = html;
    footer.innerHTML = `<button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
    overlay.classList.add('show');
}

// ========== CHAIN DETAIL MODAL ==========
let _ctCurrentChainId = null;
let _ctCurrentChainName = null;

async function _ctShowDetailModal(instanceId) {
    _ctCurrentChainId = instanceId;
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    if (!overlay || !titleEl || !body) return;

    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) modalContainer.style.maxWidth = '900px';

    titleEl.innerHTML = '🔗 Đang tải...';
    body.innerHTML = '<div style="padding:40px;text-align:center;color:#9ca3af;">⏳ Đang tải chi tiết chuỗi...</div>';
    footer.innerHTML = '';
    overlay.classList.add('show');

    try {
        const data = await apiCall(`/api/chain-tasks/instances/${instanceId}`);
        window._ctCurrentChainData = data;
        _ctRenderDetailContent(data);
    } catch(e) {
        body.innerHTML = `<div style="padding:40px;text-align:center;color:#dc2626;">❌ Lỗi: ${e.message}</div>`;
        footer.innerHTML = `<button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
    }
}

function _ctRenderDetailContent(data) {
    const titleEl = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    const items = data.items || [];
    const completedCount = items.filter(i => {
        if (i.status === 'completed') return true;
        const comps = i.completions || [];
        const minQty = i.min_quantity || 1;
        return comps.filter(c => c.status === 'approved').length >= minQty;
    }).length;
    const pct = items.length > 0 ? Math.round(completedCount / items.length * 100) : 0;
    const modeLabel = data.execution_mode === 'sequential' ? '📋 Tuần tự' : '🔄 Song song';
    const isManager = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(currentUser.role);

    titleEl.innerHTML = `<span style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;padding:2px 10px;border-radius:6px;font-size:12px;margin-right:8px;">🔗</span> ${data.chain_name}`;

    let html = `<div style="padding:16px 20px;">
        <!-- Info bar -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:14px;flex-wrap:wrap;">
            <span style="font-size:12px;color:#6b7280;">${modeLabel}</span>
            <span style="font-size:12px;color:#6b7280;">📅 ${_ctFmtDate(data.start_date)} → ${_ctFmtDate(data.end_date)}</span>
            <span style="font-size:12px;color:#6b7280;">👤 ${data.creator_name || '—'}</span>
        </div>
        ${data.chain_description ? `<!-- Description -->
        <div style="margin-bottom:14px;padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;">
            <div style="font-size:10px;color:#0369a1;font-weight:700;margin-bottom:4px;text-transform:uppercase;">📝 Mô tả công việc chuỗi</div>
            <div style="font-size:12px;color:#1e293b;white-space:pre-wrap;">${data.chain_description}</div>
        </div>` : ''}
        <!-- Progress bar -->
        <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:12px;font-weight:700;color:#1e293b;">Tiến độ</span>
                <span style="font-size:12px;font-weight:700;color:${pct === 100 ? '#059669' : '#2563eb'};">${completedCount}/${items.length} (${pct}%)</span>
            </div>
            <div style="width:100%;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${pct === 100 ? '#059669' : 'linear-gradient(90deg,#2563eb,#3b82f6)'};border-radius:4px;transition:width 0.3s;"></div>
            </div>
        </div>
        <!-- Items table -->
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:linear-gradient(135deg,#1e3a5f,#122546);">
                    <th style="padding:8px 12px;text-align:center;font-size:10px;color:white;font-weight:700;text-transform:uppercase;width:30px;">#</th>
                    <th style="padding:8px 12px;text-align:left;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Task Con</th>
                    <th style="padding:8px 12px;text-align:center;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Deadline</th>
                    <th style="padding:8px 12px;text-align:center;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Nhân Viên</th>
                    <th style="padding:8px 12px;text-align:center;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Trạng Thái</th>
                    <th style="padding:8px 12px;text-align:center;font-size:10px;color:white;font-weight:700;text-transform:uppercase;width:70px;">Báo Cáo</th>
                    <th style="padding:8px 12px;text-align:center;font-size:10px;color:white;font-weight:700;text-transform:uppercase;">Người BC</th>
                    <th style="padding:8px 12px;text-align:center;font-size:10px;color:white;font-weight:700;text-transform:uppercase;width:90px;">Hành Động</th>
                </tr></thead>
                <tbody>`;

    items.forEach((item, idx) => {
        const deadlineStr = _ctFmtDate(item.deadline);
        const users = item.assigned_users || [];
        const usersHtml = users.length > 0
            ? users.map(u => `<span style="background:#eff6ff;color:#2563eb;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;">${u.full_name}</span>`).join(' ')
            : '<span style="color:#9ca3af;font-size:10px;">—</span>';

        const completions = item.completions || [];
        const myComps = completions.filter(c => c.user_id === currentUser.id);
        const isAssigned = (item.assigned_users || []).some(u => u.user_id === currentUser.id);
        let statusHtml = '', actionHtml = '';
        const isOverdue = new Date(item.deadline) < new Date() && item.status !== 'completed';
        const minQty = item.min_quantity || 1;
        const totalApproved = completions.filter(c => c.status === 'approved').length;
        // "First to finish" — any user approved enough = item done for everyone
        const isEffectivelyCompleted = item.status === 'completed' || totalApproved >= minQty;

        // Find reporter(s) who completed
        const approvedComps = completions.filter(c => c.status === 'approved');
        const reporterNames = [...new Set(approvedComps.map(c => c.reporter_name || c.user_name || ''))].filter(n => n);
        const reporterHtml = reporterNames.length > 0
            ? reporterNames.map(n => `<span style="background:#f0fdf4;color:#059669;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;">${n}</span>`).join(' ')
            : '<span style="color:#d1d5db;font-size:10px;">—</span>';

        if (isEffectivelyCompleted) {
            statusHtml = '<span style="background:#dcfce7;color:#059669;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">✅ Xong</span>';
            actionHtml = '<span style="color:#d1d5db;">—</span>';
        } else if (item.status === 'pending' && data.execution_mode === 'sequential') {
            statusHtml = '<span style="background:#f3f4f6;color:#9ca3af;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">⏳ Sắp tới</span>';
            actionHtml = _ctGetActionBtn(item, data, isManager);
        } else if (item.status === 'overdue' || isOverdue) {
            statusHtml = '<span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">💀 Quá hạn</span>';
            actionHtml = _ctGetActionBtn(item, data, isManager);
        } else {
            const myApproved = myComps.filter(c => c.status === 'approved').length;
            const myPending = myComps.filter(c => c.status === 'pending').length;
            const myRejected = myComps.filter(c => c.status === 'rejected').length;
            const totalPending = completions.filter(c => c.status === 'pending').length;

            if (isAssigned || !isManager) {
                if (myApproved >= minQty) {
                    statusHtml = `<span style="background:#dcfce7;color:#059669;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">✅ ${myApproved}/${minQty} BC</span>`;
                } else if (myPending > 0) {
                    statusHtml = '<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">⏳ Chờ duyệt</span>';
                } else if (myRejected > 0) {
                    statusHtml = '<span style="background:#fecaca;color:#dc2626;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">❌ Bị từ chối</span>';
                } else {
                    statusHtml = '<span style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">🔵 Đang làm</span>';
                }
            } else {
                if (totalPending > 0) {
                    statusHtml = `<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">⏳ ${totalPending} chờ duyệt</span>`;
                } else {
                    statusHtml = '<span style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">🔵 Đang làm</span>';
                }
            }
            actionHtml = _ctGetActionBtn(item, data, isManager);
        }

        // Report column: chain tasks are collaborative — show all reports to everyone
        const displayComps = completions;

        html += `<tr style="border-bottom:1px solid #f3f4f6;${isOverdue ? 'background:#fff5f5;' : ''}">
            <td style="padding:8px 12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;">${item.item_order}</td>
            <td style="padding:8px 12px;">
                <div style="font-size:12px;font-weight:600;color:#1e293b;">${item.task_name}</div>
                ${item.guide_link ? `<a href="${item.guide_link}" target="_blank" onclick="event.stopPropagation()" style="font-size:10px;color:#2563eb;text-decoration:underline;cursor:pointer;">🔗 Hướng dẫn CV</a>` : ''}
                ${item.task_content ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;">${item.task_content.substring(0,60)}</div>` : ''}
            </td>
            <td style="padding:8px 12px;text-align:center;font-size:11px;color:${isOverdue ? '#dc2626' : '#374151'};font-weight:${isOverdue ? '700' : '500'};white-space:nowrap;">${deadlineStr}</td>
            <td style="padding:8px 12px;text-align:center;">${usersHtml}</td>
            <td style="padding:8px 12px;text-align:center;">${statusHtml}</td>
            <td style="padding:8px 12px;text-align:center;">${displayComps.length > 0 ? `<button onclick="event.stopPropagation();_ctShowReportHistory(${item.id})" style="padding:2px 8px;font-size:10px;border:1px solid #2563eb;border-radius:5px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:600;white-space:nowrap;">📄 ${displayComps.length}</button>` : '<span style="color:#d1d5db;">—</span>'}</td>
            <td style="padding:8px 12px;text-align:center;">${reporterHtml}</td>
            <td style="padding:8px 12px;text-align:center;">${actionHtml}</td>
        </tr>`;
    });

    html += `</tbody></table></div></div>`;
    body.innerHTML = html;

    let footerHtml = '';
    if (isManager) {
        if (currentUser.role === 'giam_doc' && data.status === 'completed') {
            footerHtml += `<button onclick="_ctEditInstance(${data.id})" style="padding:6px 14px;font-size:12px;border:1px solid #2563eb;border-radius:6px;background:white;color:#2563eb;cursor:pointer;font-weight:600;">✏️ Sửa chuỗi</button>`;
        }
        if (currentUser.role === 'giam_doc') {
            footerHtml += `<button onclick="_ctShowPostponeUI()" style="padding:6px 14px;font-size:12px;border:1px solid #d97706;border-radius:6px;background:white;color:#d97706;cursor:pointer;font-weight:600;">⏪ Lùi lịch</button>`;
        }
    }
    footerHtml += `<button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
    let footerLeft = '';
    if (_ctCurrentChainName) {
        footerLeft = `<button onclick="_ctShowChainInstancesModal(_ctCurrentChainName)" style="padding:6px 14px;font-size:12px;border:1px solid #6b7280;border-radius:6px;background:white;color:#374151;cursor:pointer;font-weight:600;">⬅ Quay lại</button>`;
    }
    footerHtml = `<div style="display:flex;justify-content:space-between;width:100%;">
        <div>${footerLeft}</div>
        <div style="display:flex;gap:8px;">${footerHtml}</div>
    </div>`;
    footer.innerHTML = footerHtml;
}

// Show report history for a chain task item
function _ctShowReportHistory(itemId) {
    const chainData = window._ctCurrentChainData;
    if (!chainData) return;
    const item = (chainData.items || []).find(i => i.id === itemId);
    if (!item) return;

    const allCompletions = item.completions || [];
    // Chain tasks are collaborative — show all reports to everyone
    const completions = allCompletions;
    const body = document.getElementById('modalBody');
    const titleEl = document.getElementById('modalTitle');
    const footer = document.getElementById('modalFooter');

    titleEl.innerHTML = `<span style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;padding:3px 10px;border-radius:6px;font-size:12px;">📄</span> Lịch sử báo cáo — ${item.task_name}`;

    let html = `<div style="padding:16px 20px;">`;

    if (completions.length === 0) {
        html += `<div style="text-align:center;color:#9ca3af;padding:30px;">Chưa có báo cáo nào</div>`;
    } else {
        completions.forEach((comp, idx) => {
            const date = comp.created_at ? new Date(comp.created_at).toLocaleString('vi-VN') : '';
            let statusBadge = '';
            if (comp.status === 'approved') statusBadge = '<span style="background:#dcfce7;color:#059669;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">✅ Đã duyệt</span>';
            else if (comp.status === 'pending') statusBadge = '<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">⏳ Chờ duyệt</span>';
            else if (comp.status === 'rejected') statusBadge = '<span style="background:#fecaca;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">❌ Từ chối</span>';

            const borderColor = comp.status === 'approved' ? '#a7f3d0' : comp.status === 'rejected' ? '#fecaca' : '#fde68a';
            const bgColor = comp.status === 'approved' ? '#f0fdf4' : comp.status === 'rejected' ? '#fef2f2' : '#fffbeb';

            // Detect if proof_url is an image
            const isImage = comp.proof_url && comp.proof_url.match(/\.(jpg|jpeg|png|gif|webp)/i);
            // Detect links in content
            const contentHtml = comp.content ? comp.content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#2563eb;text-decoration:underline;word-break:break-all;">$1</a>') : '';

            html += `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:10px;padding:14px 18px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span style="font-weight:700;color:#1e293b;font-size:13px;">📝 Lần ${idx + 1}</span>
                        <span style="background:#eff6ff;color:#2563eb;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">👤 ${comp.reporter_name || '—'}</span>
                        <span style="font-size:10px;color:#6b7280;">🕐 ${date}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div style="font-size:12px;margin-bottom:6px;"><span style="color:#6b7280;font-weight:600;">📊 Số lượng:</span> <span style="color:#1e293b;font-weight:700;font-size:13px;">${comp.quantity_done || '—'}</span></div>
                ${contentHtml ? `<div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:8px;">
                    <div style="font-size:10px;color:#6b7280;font-weight:600;margin-bottom:4px;">📄 NỘI DUNG:</div>
                    <div style="font-size:13px;color:#1e293b;font-weight:500;line-height:1.5;white-space:pre-wrap;">${contentHtml}</div>
                </div>` : ''}
                ${comp.proof_url && !isImage ? `<div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:8px;">
                    <div style="font-size:10px;color:#6b7280;font-weight:600;margin-bottom:4px;">🔗 LINK ĐÍNH KÈM:</div>
                    <a href="${comp.proof_url}" target="_blank" style="color:#2563eb;font-size:13px;font-weight:600;text-decoration:underline;word-break:break-all;">${comp.proof_url}</a>
                </div>` : ''}
                ${isImage ? `<div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:8px;text-align:center;">
                    <div style="font-size:10px;color:#6b7280;font-weight:600;margin-bottom:6px;">📷 ẢNH ĐÍNH KÈM:</div>
                    <a href="${comp.proof_url}" target="_blank"><img src="${comp.proof_url}" style="max-width:100%;max-height:300px;border-radius:8px;border:1px solid #d1d5db;cursor:pointer;" /></a>
                </div>` : ''}
                ${comp.reject_reason ? `<div style="margin-top:6px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:6px 10px;font-size:11px;"><span style="color:#dc2626;font-weight:700;">❌ Lý do từ chối:</span> <span style="color:#991b1b;">${comp.reject_reason}</span></div>` : ''}
                ${comp.reviewer_name ? `<div style="margin-top:4px;font-size:10px;color:#6b7280;">👤 Duyệt bởi: <b>${comp.reviewer_name}</b></div>` : ''}
            </div>`;
        });
    }

    html += `</div>`;
    body.innerHTML = html;
    footer.innerHTML = `<button onclick="_ctShowDetailModal(_ctCurrentChainId)" style="padding:8px 20px;border-radius:8px;border:1px solid #2563eb;background:#2563eb;color:white;font-weight:700;cursor:pointer;">← Quay lại</button>`;
}

// Frontend approval hierarchy (mirrors utils/approvalHierarchy.js)
const _ROLE_LEVEL = { part_time: 0, nhan_vien: 1, truong_phong: 2, quan_ly: 3, quan_ly_cap_cao: 4, giam_doc: 5 };
function _canApproveRole(approverRole, reporterRole) {
    return (_ROLE_LEVEL[approverRole] || 0) > (_ROLE_LEVEL[reporterRole] || 0);
}

function _ctGetActionBtn(item, chain, isManager) {
    const completions = item.completions || [];
    const pendingComps = completions.filter(c => c.status === 'pending');
    const isAssigned = (item.assigned_users || []).some(u => u.user_id === currentUser.id);

    // Manager: show approve/reject only if user outranks the reporter
    if (isManager && pendingComps.length > 0) {
        const pc = pendingComps[0];
        if (_canApproveRole(currentUser.role, pc.reporter_role)) {
            return `<div style="display:flex;gap:4px;justify-content:center;">
                <button onclick="event.stopPropagation();_ctApprove(${item.id},${pc.id})" style="padding:2px 8px;font-size:10px;border:none;border-radius:4px;background:#059669;color:white;cursor:pointer;font-weight:600;" title="Duyệt">✅</button>
                <button onclick="event.stopPropagation();_ctReject(${item.id},${pc.id})" style="padding:2px 8px;font-size:10px;border:none;border-radius:4px;background:#dc2626;color:white;cursor:pointer;font-weight:600;" title="Từ chối">❌</button>
            </div>`;
        }
        // User doesn't outrank — just show "Chờ duyệt" status
        return `<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">⏳ Chờ duyệt</span>`;
    }

    // Assigned user: check existing completions
    if (isAssigned) {
        const myComps = completions.filter(c => c.user_id === currentUser.id);
        if (myComps.length > 0) {
            const latest = myComps[myComps.length - 1];
            if (latest.status === 'pending') {
                return `<span style="background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">⏳ Chờ duyệt</span>`;
            } else if (latest.status === 'approved') {
                return `<span style="background:#dcfce7;color:#059669;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">✅ Đã duyệt</span>`;
            } else if (latest.status === 'rejected') {
                return `<button onclick="event.stopPropagation();_ctSubmitReport(${item.id})" style="padding:3px 10px;font-size:10px;border:none;border-radius:5px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;cursor:pointer;font-weight:600;">🔄 Nộp lại</button>`;
            }
        }

        if (item.status !== 'completed') {
            if (item.requires_report) {
                return `<button onclick="event.stopPropagation();_ctSubmitReport(${item.id})" style="padding:3px 10px;font-size:10px;border:none;border-radius:5px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:white;cursor:pointer;font-weight:600;">📝 Nộp</button>`;
            } else {
                return `<button onclick="event.stopPropagation();_ctMarkDone(${item.id})" style="padding:3px 10px;font-size:10px;border:none;border-radius:5px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:600;">✅ Xong</button>`;
            }
        }
    }

    return '<span style="color:#d1d5db;">—</span>';
}

// Submit report for chain item — full modal form
let _ctReportImageFile = null;
function _ctSubmitReport(itemId) {
    // Find item data from current chain detail
    const chainData = window._ctCurrentChainData;
    const item = chainData ? (chainData.items || []).find(i => i.id === itemId) : null;
    const taskName = item ? item.task_name : 'CV Chuỗi';
    const minQty = item ? (item.min_quantity || 1) : 1;
    const guideLink = item ? (item.guide_link || '') : '';
    const inputReq = item ? (item.input_requirements || '') : '';
    const outputReq = item ? (item.output_requirements || '') : '';
    const deadlineStr = item && item.deadline ? new Date(item.deadline).toLocaleDateString('vi-VN') : '';

    _ctReportImageFile = null;

    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    titleEl.innerHTML = `<span style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;padding:3px 10px;border-radius:6px;font-size:12px;">📝</span> Báo cáo công việc`;

    let html = `<div style="padding:16px 20px;font-size:12px;">
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;margin-bottom:10px;">
            <div style="font-size:11px;font-weight:700;color:#d97706;">⚠️ Không làm sẽ bị phạt và khóa tài khoản</div>
        </div>

        <!-- Task info cards -->
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 12px;">
                <div style="font-size:9px;color:#6b7280;">📋 TÊN CÔNG VIỆC</div>
                <div style="font-weight:700;color:#1e293b;font-size:12px;">${taskName}</div>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 12px;">
                <div style="font-size:9px;color:#6b7280;">📅 DEADLINE</div>
                <div style="font-weight:700;color:#1e293b;font-size:12px;">${deadlineStr}</div>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 12px;">
                <div style="font-size:9px;color:#6b7280;">📊 SL TỐI THIỂU</div>
                <div style="font-weight:700;color:#1e293b;font-size:12px;">${minQty} lần</div>
            </div>
        </div>`;

    // Guide link
    if (guideLink) {
        html += `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
            <div>
                <div style="font-size:10px;color:#2563eb;font-weight:700;">📘 Hướng dẫn công việc</div>
                <a href="${guideLink}" target="_blank" style="font-size:10px;color:#2563eb;text-decoration:underline;word-break:break-all;">${guideLink.length > 60 ? guideLink.substring(0,60)+'...' : guideLink}</a>
            </div>
            <a href="${guideLink}" target="_blank" style="font-size:14px;text-decoration:none;">→</a>
        </div>`;
    }

    // Input/Output requirements
    if (inputReq) {
        html += `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:6px;">
            <div style="font-size:10px;font-weight:700;color:#991b1b;">📋 Yêu cầu đầu vào</div>
            <div style="font-size:11px;color:#dc2626;margin-top:2px;">${inputReq}</div>
        </div>`;
    }
    if (outputReq) {
        html += `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:10px;">
            <div style="font-size:10px;font-weight:700;color:#991b1b;">📋 Yêu cầu đầu ra</div>
            <div style="font-size:11px;color:#dc2626;margin-top:2px;">${outputReq}</div>
        </div>`;
    }

    // Form fields
    html += `<hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;">

        <div style="margin-bottom:10px;">
            <label style="font-weight:700;color:#374151;">📊 Số lượng đã hoàn thành <span style="color:#dc2626;">*</span></label>
            <input type="number" id="ctReportQty" value="${minQty}" min="1" required style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;" />
        </div>

        <div style="margin-bottom:10px;">
            <label style="font-weight:700;color:#374151;">📄 Nội dung hoàn thành <span style="color:#dc2626;">*</span></label>
            <textarea id="ctReportContent" rows="3" required placeholder="Mô tả công việc đã làm..." style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;resize:none;"></textarea>
        </div>

        <div style="margin-bottom:10px;">
            <label style="font-weight:700;color:#374151;">🔗 Link báo cáo kết quả <span style="color:#dc2626;" id="ctReportLinkStar">*</span></label>
            <input type="url" id="ctReportLink" placeholder="https://docs.google.com/... hoặc link TikTok..." style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;" oninput="_ctReportCheckRequired()" />
        </div>

        <div style="margin-bottom:10px;">
            <label style="font-weight:700;color:#374151;">🖼️ Hình ảnh báo cáo <span style="color:#dc2626;" id="ctReportImgStar">*</span> <span style="font-weight:400;color:#9ca3af;">(Ctrl+V để dán ảnh)</span></label>
            <div id="ctReportPasteArea" tabindex="0" style="border:2px dashed #d1d5db;border-radius:8px;padding:20px;text-align:center;margin-top:4px;cursor:pointer;background:#fafbfc;min-height:60px;outline:none;transition:border-color 0.2s;" 
                 onclick="document.getElementById('ctReportFileInput').click()"
                 onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
                <div style="color:#9ca3af;font-size:11px;">📷<br>Click vào đây rồi <b>Ctrl+V</b> để dán ảnh từ clipboard</div>
            </div>
            <input type="file" id="ctReportFileInput" accept="image/*" style="display:none;" onchange="_ctReportFileSelected(this)" />
            <div id="ctReportImgPreview" style="margin-top:6px;"></div>
        </div>

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:6px 10px;font-size:10px;color:#d97706;">
            💡 Lưu ý: Bắt buộc phải có ít nhất <b>link</b> hoặc <b>hình ảnh</b> để nộp báo cáo.
        </div>
    </div>`;

    body.innerHTML = html;

    // Paste event listener
    const pasteArea = document.getElementById('ctReportPasteArea');
    pasteArea.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                _ctReportImageFile = items[i].getAsFile();
                _ctReportShowPreview(_ctReportImageFile);
                _ctReportCheckRequired();
                break;
            }
        }
    });

    footer.innerHTML = `
        <button onclick="_ctShowDetailModal(_ctCurrentChainId)" style="padding:8px 20px;border-radius:8px;border:1px solid #d1d5db;background:white;color:#374151;font-weight:600;cursor:pointer;">Hủy</button>
        <button onclick="_ctDoSubmitReport(${itemId})" style="padding:8px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(220,38,38,0.3);">📝 Nộp báo cáo</button>
    `;
}

function _ctReportFileSelected(input) {
    if (input.files && input.files[0]) {
        _ctReportImageFile = input.files[0];
        _ctReportShowPreview(_ctReportImageFile);
        _ctReportCheckRequired();
    }
}

function _ctReportShowPreview(file) {
    const preview = document.getElementById('ctReportImgPreview');
    if (!preview) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `<div style="position:relative;display:inline-block;">
            <img src="${e.target.result}" style="max-height:120px;border-radius:6px;border:1px solid #d1d5db;" />
            <button onclick="event.stopPropagation();_ctReportImageFile=null;this.parentElement.remove();_ctReportCheckRequired()" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;border:none;background:#dc2626;color:white;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>`;
    };
    reader.readAsDataURL(file);
    // Update paste area text
    const pasteArea = document.getElementById('ctReportPasteArea');
    if (pasteArea) pasteArea.innerHTML = `<div style="color:#059669;font-size:11px;">✅ Đã chọn ảnh: ${file.name}</div>`;
}

function _ctReportCheckRequired() {
    const link = document.getElementById('ctReportLink')?.value?.trim();
    const hasImage = !!_ctReportImageFile;
    const linkStar = document.getElementById('ctReportLinkStar');
    const imgStar = document.getElementById('ctReportImgStar');
    if (linkStar) linkStar.style.display = hasImage ? 'none' : '';
    if (imgStar) imgStar.style.display = link ? 'none' : '';
}

async function _ctDoSubmitReport(itemId) {
    const qty = parseInt(document.getElementById('ctReportQty')?.value);
    const content = document.getElementById('ctReportContent')?.value?.trim();
    const link = document.getElementById('ctReportLink')?.value?.trim();
    const hasImage = !!_ctReportImageFile;

    if (!qty || qty < 1) { alert('⚠️ Vui lòng nhập số lượng hoàn thành'); return; }
    if (!content) { alert('⚠️ Vui lòng nhập nội dung hoàn thành'); return; }
    if (!link && !hasImage) { /* link/image optional, content is enough */ }

    const formData = new FormData();
    formData.append('content', content);
    formData.append('quantity_done', qty.toString());
    if (link) formData.append('proof_url', link);
    if (hasImage) formData.append('file', _ctReportImageFile);

    try {
        const token = document.cookie.split('token=')[1]?.split(';')[0];
        const res = await fetch(`/api/chain-tasks/items/${itemId}/report`, {
            method: 'POST',
            headers: { 'Cookie': `token=${token}` },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            showToast('✅ Đã nộp báo cáo!');
            _ctShowDetailModal(_ctCurrentChainId);
        } else {
            alert(data.error || 'Lỗi');
        }
    } catch(err) {
        alert('Lỗi: ' + err.message);
    }
}

// Mark done (no report required)
async function _ctMarkDone(itemId) {
    try {
        await apiCall(`/api/chain-tasks/items/${itemId}/report`, 'POST', { content: 'Hoàn thành', quantity_done: 1 });
        showToast('✅ Đã hoàn thành!');
        _ctShowDetailModal(_ctCurrentChainId);
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

// Approve / Reject
async function _ctApprove(itemId, completionId) {
    try {
        await apiCall(`/api/chain-tasks/items/${itemId}/approve`, 'POST', { completion_id: completionId });
        showToast('✅ Đã duyệt!');
        _ctShowDetailModal(_ctCurrentChainId);
    } catch(e) { alert('Lỗi: ' + e.message); }
}
async function _ctReject(itemId, completionId) {
    const reason = prompt('Lý do từ chối:');
    if (reason === null) return;
    try {
        await apiCall(`/api/chain-tasks/items/${itemId}/reject`, 'POST', { completion_id: completionId, reject_reason: reason });
        showToast('❌ Đã từ chối!');
        _ctShowDetailModal(_ctCurrentChainId);
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// Delete chain
async function _ctDeleteChain(instanceId) {
    if (!confirm('Bạn có chắc muốn hủy chuỗi công việc này?')) return;
    try {
        await apiCall(`/api/chain-tasks/instances/${instanceId}`, 'DELETE');
        showToast('🗑️ Đã hủy chuỗi!');
        document.getElementById('modalOverlay').classList.remove('show');
        if (_lkSelectedDeptId) _lkLoadDeptTasks(_lkSelectedDeptId);
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// ========== EDIT INSTANCE ==========
async function _ctEditInstance(instanceId) {
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    const titleEl = document.getElementById('modalTitle');
    body.innerHTML = '<div style="padding:40px;text-align:center;color:#9ca3af;">⏳ Đang tải...</div>';

    try {
        const data = await apiCall(`/api/chain-tasks/instances/${instanceId}`);
        // Fetch dept users for assignment
        const usersData = data.department_id ? await apiCall(`/api/lock-tasks/dept-users/${data.department_id}`) : { users: [] };
        const deptUsers = usersData.users || usersData || [];

        titleEl.innerHTML = `<span style="background:linear-gradient(135deg,#059669,#047857);color:white;padding:2px 10px;border-radius:6px;font-size:12px;margin-right:8px;">✏️</span> Sửa chuỗi — ${data.chain_name}`;

        let html = `<div style="padding:16px 20px;">
            <div style="margin-bottom:12px;">
                <label style="font-size:11px;font-weight:700;color:#374151;">Tên chuỗi</label>
                <input id="ctInstEditName" value="${data.chain_name || ''}" style="width:100%;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box;" />
            </div>
            <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                <label style="font-size:11px;font-weight:700;color:#374151;">📋 Công việc con</label>
                <button onclick="_ctInstEditAddItem()" style="padding:3px 10px;font-size:10px;border:1px solid #059669;border-radius:4px;background:white;color:#059669;cursor:pointer;font-weight:600;">➕ Thêm mới</button>
            </div>
            <div id="ctInstEditItems" style="display:flex;flex-direction:column;gap:8px;">`;

        const items = data.items || [];
        items.forEach((item) => {
            const isPending = item.status === 'pending';
            const assignedIds = (item.assigned_users || []).map(u => u.user_id);

            if (isPending) {
                // Editable item
                const userChecks = deptUsers.map(u =>
                    `<label style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:4px;font-size:10px;cursor:pointer;">
                        <input type="checkbox" class="ct-inst-item-user" value="${u.id}" ${assignedIds.includes(u.id) ? 'checked' : ''} /> ${u.full_name}
                    </label>`
                ).join(' ');

                html += `<div class="ct-inst-edit-item" data-item-id="${item.id}" data-is-new="false" style="border:1px solid #2563eb;border-radius:8px;padding:10px 12px;background:#f0f9ff;position:relative;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:10px;font-weight:700;color:#2563eb;">⏳ Pending — có thể sửa</span>
                        <button onclick="this.closest('.ct-inst-edit-item').setAttribute('data-deleted','true');this.closest('.ct-inst-edit-item').style.display='none'" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:12px;" title="Xóa">🗑️</button>
                    </div>
                    <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-bottom:6px;">
                        <div>
                            <label style="font-size:10px;color:#6b7280;">Tên</label>
                            <input class="ct-inst-item-name" value="${item.task_name || ''}" style="width:100%;padding:4px 8px;border:1px solid #93c5fd;border-radius:4px;font-size:11px;box-sizing:border-box;" />
                        </div>
                        <div>
                            <label style="font-size:10px;color:#6b7280;">Deadline</label>
                            <input type="date" class="ct-inst-item-deadline" value="${item.deadline?.split('T')[0] || ''}" style="width:100%;padding:4px 8px;border:1px solid #93c5fd;border-radius:4px;font-size:11px;box-sizing:border-box;" />
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px;">
                        <div>
                            <label style="font-size:10px;color:#6b7280;">Link HD</label>
                            <input class="ct-inst-item-guide" value="${item.guide_link || ''}" style="width:100%;padding:4px 8px;border:1px solid #93c5fd;border-radius:4px;font-size:11px;box-sizing:border-box;" />
                        </div>
                        <div>
                            <label style="font-size:10px;color:#6b7280;">SL tối thiểu</label>
                            <input type="number" class="ct-inst-item-qty" value="${item.min_quantity || 1}" min="1" style="width:100%;padding:4px 8px;border:1px solid #93c5fd;border-radius:4px;font-size:11px;box-sizing:border-box;" />
                        </div>
                        <div>
                            <label style="font-size:10px;color:#6b7280;">Lần nộp lại</label>
                            <input type="number" class="ct-inst-item-redo" value="${item.max_redo_count || 3}" min="1" max="10" style="width:100%;padding:4px 8px;border:1px solid #93c5fd;border-radius:4px;font-size:11px;box-sizing:border-box;" />
                        </div>
                    </div>
                    <div style="margin-bottom:6px;">
                        <label style="font-size:10px;color:#6b7280;cursor:pointer;"><input type="checkbox" class="ct-inst-item-approval" ${item.requires_approval ? 'checked' : ''} /> ✅ Cần QL duyệt</label>
                    </div>
                    <div>
                        <label style="font-size:10px;color:#6b7280;">👥 Nhân viên:</label>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${userChecks}</div>
                    </div>
                </div>`;
            } else {
                // Non-editable item (completed/in_progress)
                const statusLabel = item.status === 'completed' ? '✅ Hoàn thành' : '🔄 Đang làm';
                const statusColor = item.status === 'completed' ? '#059669' : '#d97706';
                const usersStr = (item.assigned_users || []).map(u => u.full_name).join(', ');
                html += `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;background:#f3f4f6;opacity:0.7;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <span style="font-weight:700;font-size:12px;color:#1e293b;">${item.task_name}</span>
                            <span style="background:${statusColor}22;color:${statusColor};padding:1px 8px;border-radius:4px;font-size:10px;font-weight:700;margin-left:6px;">${statusLabel}</span>
                        </div>
                        <span style="font-size:10px;color:#6b7280;">🔒 Không thể sửa</span>
                    </div>
                    <div style="font-size:10px;color:#6b7280;margin-top:4px;">📅 ${_ctFmtDate(item.deadline)} • 👥 ${usersStr || '—'}</div>
                </div>`;
            }
        });

        html += '</div></div>';
        body.innerHTML = html;

        // Store dept users for adding new items
        window._ctInstEditDeptUsers = deptUsers;

        footer.innerHTML = `
            <button onclick="_ctOpenChainDetail(${instanceId})" class="btn btn-secondary">← Quay lại</button>
            <button onclick="_ctSaveEditInstance(${instanceId})" style="padding:8px 20px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#047857);color:white;cursor:pointer;font-weight:700;">💾 Lưu</button>`;
    } catch(e) {
        body.innerHTML = `<div style="padding:40px;text-align:center;color:#dc2626;">❌ ${e.message}</div>`;
    }
}

function _ctInstEditAddItem() {
    const container = document.getElementById('ctInstEditItems');
    if (!container) return;
    const deptUsers = window._ctInstEditDeptUsers || [];
    const userChecks = deptUsers.map(u =>
        `<label style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:4px;font-size:10px;cursor:pointer;">
            <input type="checkbox" class="ct-inst-item-user" value="${u.id}" /> ${u.full_name}
        </label>`
    ).join(' ');

    container.insertAdjacentHTML('beforeend', `<div class="ct-inst-edit-item" data-item-id="" data-is-new="true" style="border:2px dashed #059669;border-radius:8px;padding:10px 12px;background:#f0fdf4;position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;color:#059669;">🆕 Task con mới</span>
            <button onclick="this.closest('.ct-inst-edit-item').remove()" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px;">×</button>
        </div>
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-bottom:6px;">
            <div>
                <label style="font-size:10px;color:#6b7280;">Tên <span style="color:#dc2626;">*</span></label>
                <input class="ct-inst-item-name" style="width:100%;padding:4px 8px;border:1px solid #86efac;border-radius:4px;font-size:11px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:10px;color:#6b7280;">Deadline <span style="color:#dc2626;">*</span></label>
                <input type="date" class="ct-inst-item-deadline" style="width:100%;padding:4px 8px;border:1px solid #86efac;border-radius:4px;font-size:11px;box-sizing:border-box;" />
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px;">
            <div>
                <label style="font-size:10px;color:#6b7280;">Link HD</label>
                <input class="ct-inst-item-guide" style="width:100%;padding:4px 8px;border:1px solid #86efac;border-radius:4px;font-size:11px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:10px;color:#6b7280;">SL tối thiểu</label>
                <input type="number" class="ct-inst-item-qty" value="1" min="1" style="width:100%;padding:4px 8px;border:1px solid #86efac;border-radius:4px;font-size:11px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:10px;color:#6b7280;">Lần nộp lại</label>
                <input type="number" class="ct-inst-item-redo" value="3" min="1" max="10" style="width:100%;padding:4px 8px;border:1px solid #86efac;border-radius:4px;font-size:11px;box-sizing:border-box;" />
            </div>
        </div>
        <div style="margin-bottom:6px;">
            <label style="font-size:10px;color:#6b7280;cursor:pointer;"><input type="checkbox" class="ct-inst-item-approval" /> ✅ Cần QL duyệt</label>
        </div>
        <div>
            <label style="font-size:10px;color:#6b7280;">👥 Nhân viên:</label>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${userChecks}</div>
        </div>
    </div>`);
}

async function _ctSaveEditInstance(instanceId) {
    const chainName = document.getElementById('ctInstEditName')?.value?.trim();
    const allItems = document.querySelectorAll('#ctInstEditItems > .ct-inst-edit-item');

    const items_update = [];
    const items_add = [];
    const items_delete = [];
    let hasError = false;

    allItems.forEach((el, idx) => {
        if (hasError) return;
        const isDeleted = el.getAttribute('data-deleted') === 'true';
        const isNew = el.getAttribute('data-is-new') === 'true';
        const itemId = parseInt(el.getAttribute('data-item-id'));

        if (isDeleted && !isNew && itemId) {
            items_delete.push(itemId);
            return;
        }
        if (isDeleted) return;

        const name = el.querySelector('.ct-inst-item-name')?.value?.trim();
        const deadline = el.querySelector('.ct-inst-item-deadline')?.value;
        if (!name) { alert(`⚠️ Item #${idx+1}: Vui lòng nhập tên`); hasError = true; return; }
        if (!deadline) { alert(`⚠️ Item #${idx+1}: Vui lòng chọn deadline`); hasError = true; return; }

        const userIds = Array.from(el.querySelectorAll('.ct-inst-item-user:checked')).map(cb => parseInt(cb.value));

        const itemData = {
            task_name: name, deadline,
            guide_link: el.querySelector('.ct-inst-item-guide')?.value?.trim() || '',
            min_quantity: parseInt(el.querySelector('.ct-inst-item-qty')?.value) || 1,
            max_redo_count: parseInt(el.querySelector('.ct-inst-item-redo')?.value) || 3,
            requires_approval: el.querySelector('.ct-inst-item-approval')?.checked || false,
            user_ids: userIds
        };

        if (isNew) {
            items_add.push(itemData);
        } else if (itemId) {
            itemData.id = itemId;
            items_update.push(itemData);
        }
    });

    if (hasError) return;

    try {
        await apiCall(`/api/chain-tasks/instances/${instanceId}`, 'PUT', {
            chain_name: chainName, items_update, items_add, items_delete
        });
        showToast('💾 Đã lưu chuỗi!');
        _ctOpenChainDetail(instanceId);
    } catch(e) { alert('Lỗi: ' + e.message); }
}

function _ctShowPostponeUI() {
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    if (!body) return;

    body.innerHTML = `<div style="padding:20px;">
        <h4 style="margin:0 0 14px;color:#1e293b;font-size:15px;">⏪ Lùi lịch chuỗi</h4>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:600;color:#374151;">Lùi cho:</label>
            <select id="ctPostponeType" onchange="_ctPostponeTypeChange()" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;">
                <option value="item">Từng task con</option>
                <option value="all">Toàn bộ chuỗi</option>
            </select>
        </div>
        <div id="ctPostponeItemSelect" style="margin-bottom:12px;"></div>
        <div style="margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="flex:1;">
                    <label style="font-size:12px;font-weight:600;color:#374151;">Deadline cũ:</label>
                    <div id="ctOldDeadline" style="padding:8px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;margin-top:4px;font-size:12px;color:#6b7280;">— Chọn task con —</div>
                </div>
                <div style="flex:1;">
                    <label style="font-size:12px;font-weight:600;color:#374151;">Deadline mới: <span style="color:#dc2626;">*</span></label>
                    <input type="date" id="ctNewDeadline" onchange="_ctUpdateCascadePreview()" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;" />
                </div>
            </div>
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:600;color:#374151;">Lý do: <span style="color:#dc2626;">*</span></label>
            <textarea id="ctPostponeReason" rows="2" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;resize:none;" placeholder="Lý do lùi lịch (bắt buộc)..."></textarea>
        </div>
        <div id="ctCascadeOption" style="margin-bottom:12px;display:none;">
            <label style="font-size:12px;color:#d97706;font-weight:600;">
                <input type="checkbox" id="ctCascadeCheck" /> Tự động lùi các task con phía sau
            </label>
            <div id="ctCascadePreview" style="margin-top:6px;font-size:11px;color:#6b7280;"></div>
        </div>
    </div>`;

    footer.innerHTML = `
        <button onclick="_ctShowDetailModal(_ctCurrentChainId)" style="padding:6px 14px;font-size:12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;">← Quay lại</button>
        <button onclick="_ctDoPostpone()" style="padding:6px 14px;font-size:12px;border:none;border-radius:6px;background:linear-gradient(135deg,#d97706,#f59e0b);color:white;cursor:pointer;font-weight:600;">⏪ Lùi lịch</button>
        <button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;

    _ctPostponeTypeChange();
}

async function _ctPostponeTypeChange() {
    const type = document.getElementById('ctPostponeType')?.value;
    const itemDiv = document.getElementById('ctPostponeItemSelect');
    const cascadeDiv = document.getElementById('ctCascadeOption');
    if (!itemDiv) return;

    if (type === 'item') {
        try {
            const data = await apiCall(`/api/chain-tasks/instances/${_ctCurrentChainId}`);
            const items = (data.items || []).filter(i => {
                if (i.status === 'completed') return false;
                // Also hide if all assigned users have enough approved completions
                const completions = i.completions || [];
                const assignedUsers = i.assigned_users || [];
                if (assignedUsers.length > 0) {
                    const minQty = i.min_quantity || 1;
                    const allDone = assignedUsers.every(u => {
                        const approved = completions.filter(c => c.user_id === u.user_id && c.status === 'approved').length;
                        return approved >= minQty;
                    });
                    if (allDone) return false;
                }
                return true;
            });
            let opts = items.map(i => `<option value="${i.id}" data-order="${i.item_order}" data-deadline="${i.deadline}">${i.item_order}. ${i.task_name} (${_ctFmtDate(i.deadline)})</option>`).join('');
            itemDiv.innerHTML = `<label style="font-size:12px;font-weight:600;color:#374151;">Chọn task con:</label>
                <select id="ctPostponeItemId" onchange="_ctUpdateCascadePreview();_ctUpdateOldDeadline()" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;">${opts}</select>`;
            cascadeDiv.style.display = 'block';
            window._ctPostponeItems = data.items;
            _ctUpdateOldDeadline();
        } catch(e) {
            itemDiv.innerHTML = '<div style="color:#dc2626;font-size:11px;">Lỗi tải dữ liệu</div>';
        }
    } else {
        itemDiv.innerHTML = '';
        cascadeDiv.style.display = 'none';
        _ctUpdateOldDeadline();
    }
}

function _ctUpdateCascadePreview() {
    const sel = document.getElementById('ctPostponeItemId');
    const newDate = document.getElementById('ctNewDeadline')?.value;
    const preview = document.getElementById('ctCascadePreview');
    if (!sel || !preview || !newDate) return;

    const selectedOrder = parseInt(sel.options[sel.selectedIndex]?.dataset?.order);
    const oldDeadline = sel.options[sel.selectedIndex]?.dataset?.deadline;
    if (!oldDeadline || !selectedOrder) return;

    const daysDiff = Math.round((new Date(newDate) - new Date(oldDeadline)) / (86400000));
    if (daysDiff <= 0) { preview.innerHTML = ''; return; }

    const following = (window._ctPostponeItems || []).filter(i => i.item_order > selectedOrder && i.status !== 'completed');
    if (following.length === 0) { preview.innerHTML = '<em>Không có task con nào phía sau</em>'; return; }

    preview.innerHTML = following.map(f => {
        const newD = new Date(f.deadline);
        newD.setDate(newD.getDate() + daysDiff);
        return `${f.item_order}. ${f.task_name}: ${_ctFmtDate(f.deadline)} → <b>${_ctFmtDate(newD.toISOString().split('T')[0])}</b> (+${daysDiff}d)`;
    }).join('<br>');
}

function _ctUpdateOldDeadline() {
    const sel = document.getElementById('ctPostponeItemId');
    const oldEl = document.getElementById('ctOldDeadline');
    if (!oldEl) return;
    if (sel) {
        const dl = sel.options[sel.selectedIndex]?.dataset?.deadline;
        oldEl.innerHTML = dl ? `📅 <b>${_ctFmtDate(dl)}</b>` : '—';
    } else {
        // "All" mode — show chain end date
        const data = window._ctCurrentChainData;
        oldEl.innerHTML = data?.end_date ? `📅 <b>${_ctFmtDate(data.end_date)}</b>` : '—';
    }
}

async function _ctDoPostpone() {
    const type = document.getElementById('ctPostponeType')?.value;
    const newDeadline = document.getElementById('ctNewDeadline')?.value;
    const reason = document.getElementById('ctPostponeReason')?.value || '';
    const cascade = document.getElementById('ctCascadeCheck')?.checked || false;

    if (!newDeadline) { alert('Vui lòng chọn deadline mới'); return; }
    if (!reason.trim()) { alert('Vui lòng nhập lý do lùi lịch'); return; }

    const payload = {
        chain_instance_id: _ctCurrentChainId,
        new_deadline: newDeadline,
        reason,
        cascade
    };

    if (type === 'item') {
        payload.chain_item_id = parseInt(document.getElementById('ctPostponeItemId')?.value);
        if (!payload.chain_item_id) { alert('Chọn task con'); return; }
    }

    try {
        await apiCall('/api/chain-tasks/postpone', 'POST', payload);
        showToast('⏪ Đã lùi lịch!');
        _ctShowDetailModal(_ctCurrentChainId);
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// ========== DEPLOY MODAL (Thêm CV Chuỗi) ==========
let _ctDeployDeptId = null;
let _ctDeployDeptName = '';
let _ctTemplates = [];
let _ctSelectedTemplateId = null;
let _ctTemplateEdited = false;

async function _ctShowDeployModal(deptId) {
    _ctDeployDeptId = deptId;
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    if (!overlay || !titleEl || !body) return;

    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) modalContainer.style.maxWidth = '800px';

    titleEl.innerHTML = '🔗 Triển khai Công Việc Chuỗi';
    body.innerHTML = '<div style="padding:40px;text-align:center;color:#9ca3af;">⏳ Đang tải kho chuỗi...</div>';
    footer.innerHTML = '';
    overlay.classList.add('show');

    try {
        const [templates, usersData, deptData] = await Promise.all([
            apiCall(`/api/chain-tasks/templates?department_id=${deptId}`),
            apiCall(`/api/lock-tasks/dept-users/${deptId}`),
            apiCall('/api/task-points/departments')
        ]);
        _ctTemplates = templates;
        const dept = (deptData.departments || []).find(d => d.id === deptId);
        _ctDeployDeptName = dept?.name || `Phòng #${deptId}`;
        _ctRenderDeployForm(usersData.users || usersData || []);
    } catch(e) {
        body.innerHTML = `<div style="padding:40px;text-align:center;color:#dc2626;">❌ ${e.message}</div>`;
    }
}

function _ctRenderDeployForm(users) {
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    const isDirector = currentUser.role === 'giam_doc';
    const tmplOptions = _ctTemplates.map(t =>
        `<option value="${t.id}">${t.chain_name} (${t.item_count} task con, ${t.execution_mode === 'sequential' ? 'Tuần tự' : 'Song song'})</option>`
    ).join('');

    const userCheckboxes = (users || []).map(u =>
        `<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;cursor:pointer;">
            <input type="checkbox" name="ct_user" value="${u.id}" /> ${u.full_name}
        </label>`
    ).join(' ');

    body.innerHTML = `<div style="padding:16px 20px;">
        <div style="margin-bottom:12px;padding:8px 14px;background:linear-gradient(135deg,#1e40af,#2563eb);border-radius:8px;color:white;font-weight:700;font-size:14px;">🏢 ${_ctDeployDeptName}</div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Chọn mẫu chuỗi từ kho:</label>
            <select id="ctDeployTemplate" onchange="_ctOnTemplateSelect()" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;">
                <option value="">-- Chọn mẫu --</option>
                ${tmplOptions}
            </select>
            ${isDirector ? `<button onclick="_ctShowNewTemplateUI()" style="margin-top:6px;padding:4px 12px;font-size:11px;border:1px solid #2563eb;border-radius:6px;background:white;color:#2563eb;cursor:pointer;font-weight:600;">➕ Tạo mẫu mới</button>
            <button onclick="_ctShowManageTemplates()" style="margin-top:6px;margin-left:6px;padding:4px 12px;font-size:11px;border:1px solid #6b7280;border-radius:6px;background:white;color:#6b7280;cursor:pointer;font-weight:600;">📚 Quản lý kho</button>` : ''}
        </div>
        <div id="ctTemplatePreview" style="margin-bottom:12px;"></div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Ngày bắt đầu:</label>
            <input type="date" id="ctDeployStartDate" value="${new Date().toISOString().split('T')[0]}" onchange="_ctOnTemplateSelect()" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;" />
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Gán nhân viên (tất cả task con):</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">${userCheckboxes || '<span style="color:#9ca3af;font-size:11px;">Không có nhân viên</span>'}</div>
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Mức phạt:</label>
            <div style="padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;background:#f8fafc;color:#64748b;font-weight:600;">⚙️ Theo cấu hình hệ thống (Phạt Khóa TK NV)</div>
        </div>
    </div>`;

    footer.innerHTML = `
        <button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Hủy</button>
        <button onclick="_ctDoDeploy()" style="padding:8px 20px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;cursor:pointer;font-weight:700;">🚀 Triển khai</button>`;

    // Auto-select previously chosen template
    if (_ctSelectedTemplateId) {
        const sel = document.getElementById('ctDeployTemplate');
        if (sel) { sel.value = _ctSelectedTemplateId; _ctOnTemplateSelect(); }
    }
}

async function _ctOnTemplateSelect() {
    const tmplId = document.getElementById('ctDeployTemplate')?.value;
    const preview = document.getElementById('ctTemplatePreview');
    if (!preview || !tmplId) { if(preview) preview.innerHTML = ''; _ctSelectedTemplateId = null; _ctTemplateEdited = false; return; }
    // Only reset edited flag if user switched to a different template
    if (_ctSelectedTemplateId !== tmplId) _ctTemplateEdited = false;
    _ctSelectedTemplateId = tmplId;

    try {
        const tmpl = await apiCall(`/api/chain-tasks/templates/${tmplId}`);
        const startDate = document.getElementById('ctDeployStartDate')?.value || new Date().toISOString().split('T')[0];
        let html = `<div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <div style="background:#eff6ff;padding:8px 12px;font-size:11px;font-weight:700;color:#1e40af;display:flex;justify-content:space-between;align-items:center;">
                <span>📋 Preview: ${tmpl.chain_name} (${tmpl.execution_mode === 'sequential' ? 'Tuần tự' : 'Song song'})</span>
                ${currentUser.role === 'giam_doc' ? `<button onclick="_ctEditTemplate(${tmplId}, 'deploy')" style="padding:2px 8px;font-size:10px;border:1px solid #2563eb;border-radius:4px;background:white;color:#2563eb;cursor:pointer;font-weight:600;">✏️ Sửa mẫu</button>` : ''}
            </div>`;
        (tmpl.items || []).forEach((it, i) => {
            const dlStr = it.deadline ? _ctFmtDate(it.deadline) : '';
            html += `<div style="padding:8px 12px;border-top:1px solid #f3f4f6;font-size:11px;display:flex;justify-content:space-between;">
                <span><b>${it.item_order}.</b> ${it.task_name}</span>
                <span style="color:#6b7280;">${dlStr ? '📅 '+dlStr+' ' : ''}${it.requires_approval ? '🔒 QL duyệt' : ''}</span>
            </div>`;
        });
        html += '</div>';
        preview.innerHTML = html;
    } catch(e) {
        preview.innerHTML = `<div style="color:#dc2626;font-size:11px;">Lỗi: ${e.message}</div>`;
    }
}

async function _ctDoDeploy() {
    const templateId = document.getElementById('ctDeployTemplate')?.value;
    if (!templateId) { alert('Vui lòng chọn mẫu chuỗi'); return; }

    const startDate = document.getElementById('ctDeployStartDate')?.value;
    if (!startDate) { alert('Vui lòng chọn ngày bắt đầu'); return; }

    const userIds = Array.from(document.querySelectorAll('input[name="ct_user"]:checked')).map(cb => parseInt(cb.value));
    if (userIds.length === 0) { alert('Vui lòng chọn ít nhất 1 nhân viên'); return; }

    // Must edit template before deploy
    if (!_ctTemplateEdited) {
        alert('⚠️ Vui lòng bấm "✏️ Sửa mẫu" để cập nhật thông tin (deadline, link HD...) trước khi triển khai.');
        return;
    }

    // Check all items have deadlines
    try {
        const tmpl = await apiCall(`/api/chain-tasks/templates/${templateId}`);
        const missingDl = (tmpl.items || []).filter(it => !it.deadline);
        if (missingDl.length > 0) {
            alert(`⚠️ Có ${missingDl.length} task con chưa có deadline.\nVui lòng bấm "✏️ Sửa mẫu" để điền deadline trước khi triển khai.`);
            return;
        }
    } catch(e) { alert('Lỗi: ' + e.message); return; }

    const payload = {
        template_id: parseInt(templateId),
        department_id: _ctDeployDeptId,
        start_date: startDate,
        user_ids: userIds,
        penalty_amount: 50000,
        chain_penalty_amount: 0
    };

    try {
        await apiCall('/api/chain-tasks/deploy', 'POST', payload);
        // Clear template deadlines so next deploy starts fresh
        const tmplDetail = await apiCall(`/api/chain-tasks/templates/${templateId}`);
        const cleanItems = (tmplDetail.items || []).map(it => ({ ...it, deadline: null }));
        await apiCall(`/api/chain-tasks/templates/${templateId}`, 'PUT', {
            chain_name: tmplDetail.chain_name, description: tmplDetail.description || '',
            execution_mode: tmplDetail.execution_mode, items: cleanItems
        });
        _ctSelectedTemplateId = null;
        showToast('🚀 Đã triển khai chuỗi!');
        document.getElementById('modalOverlay').classList.remove('show');
        if (_lkSelectedDeptId) _lkLoadDeptTasks(_lkSelectedDeptId);
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

// ========== TEMPLATE MANAGEMENT (GĐ) ==========
function _ctShowNewTemplateUI() {
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');

    body.innerHTML = `<div style="padding:16px 20px;">
        <h4 style="margin:0 0 14px;color:#1e293b;">➕ Tạo mẫu chuỗi mới</h4>
        <div style="margin-bottom:10px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Tên chuỗi: <span style="color:#dc2626;">*</span></label>
            <input type="text" id="ctNewName" placeholder="VD: Chụp hình sản phẩm" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;" />
        </div>
        <div style="margin-bottom:10px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Mô tả: <span style="color:#dc2626;">*</span></label>
            <textarea id="ctNewDesc" rows="2" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;resize:none;" placeholder="Mô tả chuỗi..."></textarea>
        </div>
        <div style="margin-bottom:10px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Chế độ thực hiện:</label>
            <select id="ctNewMode" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;font-size:12px;">
                <option value="sequential">📋 Tuần tự (task 1 xong → mở task 2)</option>
                <option value="parallel">🔄 Song song (tất cả cùng lúc)</option>
            </select>
        </div>
        <div style="margin-bottom:10px;">
            <label style="font-size:12px;font-weight:700;color:#374151;">Các task con:</label>
            <div id="ctNewItems" style="margin-top:6px;"></div>
            <button onclick="_ctAddNewItem()" style="margin-top:6px;padding:4px 12px;font-size:11px;border:1px solid #2563eb;border-radius:6px;background:white;color:#2563eb;cursor:pointer;font-weight:600;">+ Thêm task con</button>
        </div>
    </div>`;

    footer.innerHTML = `
        <button onclick="_ctShowDeployModal(_ctDeployDeptId)" class="btn btn-secondary">← Quay lại</button>
        <button onclick="_ctSaveNewTemplate()" style="padding:8px 20px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;">💾 Lưu mẫu</button>`;

    // Add 2 default items
    _ctAddNewItem();
    _ctAddNewItem();
}

let _ctItemCounter = 0;
function _ctAddNewItem() {
    _ctItemCounter++;
    const container = document.getElementById('ctNewItems');
    if (!container) return;

    const div = document.createElement('div');
    div.id = `ctItem_${_ctItemCounter}`;
    div.style.cssText = 'background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:8px;';
    div.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-weight:700;color:#374151;font-size:12px;">#${container.children.length + 1}</span>
            <input type="text" class="ct-item-name" placeholder="Tên task con *" required style="flex:1;padding:6px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;" />
            <button onclick="this.closest('[id^=ctItem_]').remove()" style="padding:2px 8px;font-size:10px;border:none;border-radius:4px;background:#fecaca;color:#dc2626;cursor:pointer;">✕</button>
        </div>
        <div style="margin-bottom:6px;">
            <label style="font-size:10px;color:#6b7280;">🔗 Link hướng dẫn CV <span style="color:#dc2626;">*</span></label>
            <input type="url" class="ct-item-guide" placeholder="https://..." required style="width:100%;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr;gap:6px;margin-bottom:6px;">
            <div>
                <label style="font-size:10px;color:#6b7280;">SL CV Tối thiểu <span style="color:#dc2626;">*</span></label>
                <input type="number" class="ct-item-qty" value="1" min="1" required style="width:100%;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;" />
            </div>
        </div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
            <span style="font-size:10px;color:#059669;font-weight:600;">📝 Bắt buộc nộp báo cáo</span>
            <label style="font-size:10px;color:#6b7280;cursor:pointer;" title="Quản lý phải duyệt báo cáo trước khi task con được tính hoàn thành"><input type="checkbox" class="ct-item-approval" checked /> ✅ Cần QL duyệt</label>
            <label style="font-size:10px;color:#6b7280;" title="Số lần nhân viên được nộp lại khi bị từ chối">🔄 Số lần nộp lại: <input type="number" class="ct-item-max-redo" value="3" min="1" max="10" style="width:48px;padding:2px 4px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;" /></label>
        </div>`;
    container.appendChild(div);
}

async function _ctSaveNewTemplate() {
    const chainName = document.getElementById('ctNewName')?.value?.trim();
    if (!chainName) { alert('⚠️ Vui lòng nhập tên chuỗi'); return; }

    const description = document.getElementById('ctNewDesc')?.value?.trim();
    if (!description) { alert('⚠️ Vui lòng nhập mô tả'); return; }

    const executionMode = document.getElementById('ctNewMode')?.value || 'sequential';

    const itemEls = document.querySelectorAll('#ctNewItems > div');
    const items = [];
    let hasError = false;

    itemEls.forEach((el, idx) => {
        if (hasError) return;
        const name = el.querySelector('.ct-item-name')?.value?.trim();
        const deadline = el.querySelector('.ct-item-deadline')?.value;
        const qty = parseInt(el.querySelector('.ct-item-qty')?.value);
        const guide = el.querySelector('.ct-item-guide')?.value?.trim();

        if (!name) { alert(`⚠️ Task con #${idx+1}: Vui lòng nhập tên`); hasError = true; return; }

        items.push({
            task_name: name,
            deadline: deadline || null,
            relative_days: 0,
            min_quantity: qty || 1,
            guide_link: guide || '',
            requires_report: true,
            requires_approval: el.querySelector('.ct-item-approval')?.checked || false,
            max_redo_count: parseInt(el.querySelector('.ct-item-max-redo')?.value) || 3
        });
    });

    if (hasError) return;
    if (items.length === 0) { alert('⚠️ Cần ít nhất 1 task con'); return; }

    try {
        await apiCall('/api/chain-tasks/templates', 'POST', {
            chain_name: chainName,
            description,
            execution_mode: executionMode,
            department_id: _ctDeployDeptId,
            items
        });
        showToast('💾 Đã lưu mẫu chuỗi!');
        _ctShowDeployModal(_ctDeployDeptId);
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

// Manage templates
async function _ctShowManageTemplates() {
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    body.innerHTML = '<div style="padding:40px;text-align:center;color:#9ca3af;">⏳ Đang tải...</div>';

    try {
        const [templates, deptData] = await Promise.all([
            apiCall(`/api/chain-tasks/templates?department_id=${_ctDeployDeptId}`),
            apiCall('/api/task-points/departments')
        ]);
        const allDepts = (deptData.departments || []).filter(d => !d.name.toUpperCase().includes('AFFILIATE') && !d.name.startsWith('HỆ THỐNG'));

        let html = `<div style="padding:16px 20px;">
            <h4 style="margin:0 0 14px;color:#1e293b;">📚 Kho mẫu chuỗi — ${_ctDeployDeptName || ''}</h4>`;

        if (templates.length === 0) {
            html += '<div style="text-align:center;padding:30px;color:#9ca3af;">Chưa có mẫu chuỗi nào cho phòng ban này</div>';
        } else {
            templates.forEach(t => {
                // Build copy dropdown options
                const otherDepts = allDepts.filter(d => d.id !== _ctDeployDeptId);
                const copyOptions = otherDepts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

                html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;">
                    <div>
                        <div style="font-weight:700;color:#1e293b;font-size:13px;">🔗 ${t.chain_name}</div>
                        <div style="font-size:11px;color:#6b7280;">${t.item_count} task con • ${t.execution_mode === 'sequential' ? 'Tuần tự' : 'Song song'} • ${t.creator_name || ''}</div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <select id="ctCopyDept_${t.id}" onchange="_ctToggleCopyBtn(${t.id})" style="padding:4px 8px;font-size:11px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;">
                            <option value="">📋 Copy sang...</option>
                            ${copyOptions}
                        </select>
                        <button id="ctCopyBtn_${t.id}" onclick="_ctCopyTemplate(${t.id})" style="display:none;padding:4px 12px;font-size:11px;border:none;border-radius:6px;background:linear-gradient(135deg,#059669,#10b981);color:white;cursor:pointer;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(5,150,105,0.3);transition:all .2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">📋 Copy sang</button>
                        <button onclick="_ctEditTemplate(${t.id})" style="padding:4px 10px;font-size:10px;border:1px solid #2563eb;border-radius:4px;background:white;color:#2563eb;cursor:pointer;font-weight:600;">✏️ Sửa</button>
                        <button onclick="_ctDeleteTemplate(${t.id})" style="padding:4px 10px;font-size:10px;border:1px solid #dc2626;border-radius:4px;background:white;color:#dc2626;cursor:pointer;font-weight:600;">🗑️ Xóa</button>
                    </div>
                </div>`;
            });
        }
        html += '</div>';
        body.innerHTML = html;
        footer.innerHTML = `<button onclick="_ctShowDeployModal(_ctDeployDeptId)" class="btn btn-secondary">← Quay lại</button>`;
    } catch(e) {
        body.innerHTML = `<div style="padding:40px;text-align:center;color:#dc2626;">❌ ${e.message}</div>`;
    }
}

async function _ctCopyTemplate(templateId) {
    const sel = document.getElementById(`ctCopyDept_${templateId}`);
    const targetDeptId = sel?.value;
    if (!targetDeptId) { alert('Chọn phòng ban đích trước!'); return; }

    const deptName = sel.options[sel.selectedIndex]?.text || '';
    if (!confirm(`📋 Xác nhận copy mẫu chuỗi sang "${deptName}"?`)) return;

    try {
        await apiCall(`/api/chain-tasks/templates/${templateId}/copy`, 'POST', {
            target_department_id: parseInt(targetDeptId)
        });
        showToast(`📋 Đã copy thành công sang ${deptName}!`);
        // Reset dropdown & hide button
        sel.value = '';
        const btn = document.getElementById(`ctCopyBtn_${templateId}`);
        if (btn) btn.style.display = 'none';
    } catch(e) {
        alert('Lỗi: ' + e.message);
    }
}

function _ctToggleCopyBtn(templateId) {
    const sel = document.getElementById(`ctCopyDept_${templateId}`);
    const btn = document.getElementById(`ctCopyBtn_${templateId}`);
    if (!btn) return;
    if (sel?.value) {
        const deptName = sel.options[sel.selectedIndex]?.text || '';
        btn.textContent = `📋 Copy → ${deptName}`;
        btn.style.display = 'inline-block';
    } else {
        btn.style.display = 'none';
    }
}

async function _ctEditTemplate(templateId, mode = 'manage') {
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    const titleEl = document.getElementById('modalTitle');
    body.innerHTML = '<div style="padding:40px;text-align:center;color:#9ca3af;">⏳ Đang tải...</div>';
    window._ctEditMode = mode;

    try {
        const tmpl = await apiCall(`/api/chain-tasks/templates/${templateId}`);
        titleEl.innerHTML = mode === 'deploy' ? '📅 Cập nhật lịch triển khai' : '✏️ Sửa mẫu chuỗi';

        let itemsHtml = '';
        (tmpl.items || []).forEach((it, idx) => {
            itemsHtml += _ctEditTemplateItemRow(it, idx, mode);
        });

        if (mode === 'deploy') {
            // Deploy mode: only deadline editable, no name/desc/mode editing
            body.innerHTML = `<div style="padding:16px 20px;">
                <div style="margin-bottom:12px;padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
                    <div style="font-weight:700;color:#1e40af;font-size:13px;">🔗 ${tmpl.chain_name}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">${tmpl.description || ''} • ${tmpl.execution_mode === 'sequential' ? 'Tuần tự' : 'Song song'}</div>
                </div>
                <div style="margin-bottom:8px;">
                    <label style="font-size:11px;font-weight:700;color:#374151;">📋 Đặt deadline cho từng công việc con</label>
                </div>
                <div id="ctEditItems" style="display:flex;flex-direction:column;gap:8px;">${itemsHtml}</div>
            </div>`;
        } else {
            // Manage mode: full edit, hide deadline 
            body.innerHTML = `<div style="padding:16px 20px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                    <div>
                        <label style="font-size:11px;font-weight:700;color:#374151;">Tên chuỗi <span style="color:#dc2626;">*</span></label>
                        <input id="ctEditName" value="${tmpl.chain_name || ''}" style="width:100%;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box;" />
                    </div>
                    <div>
                        <label style="font-size:11px;font-weight:700;color:#374151;">Chế độ</label>
                        <select id="ctEditMode" style="width:100%;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;">
                            <option value="sequential" ${tmpl.execution_mode === 'sequential' ? 'selected' : ''}>Tuần tự</option>
                            <option value="parallel" ${tmpl.execution_mode === 'parallel' ? 'selected' : ''}>Song song</option>
                        </select>
                    </div>
                </div>
                <div style="margin-bottom:12px;">
                    <label style="font-size:11px;font-weight:700;color:#374151;">Mô tả</label>
                    <textarea id="ctEditDesc" rows="2" style="width:100%;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box;resize:vertical;">${tmpl.description || ''}</textarea>
                </div>
                <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                    <label style="font-size:11px;font-weight:700;color:#374151;">📋 Công việc con</label>
                    <button onclick="_ctEditTemplateAddItem()" style="padding:3px 10px;font-size:10px;border:1px solid #059669;border-radius:4px;background:white;color:#059669;cursor:pointer;font-weight:600;">➕ Thêm</button>
                </div>
                <div id="ctEditItems" style="display:flex;flex-direction:column;gap:8px;">${itemsHtml}</div>
            </div>`;
        }

        const backFn = mode === 'deploy' ? '_ctShowDeployModal(_ctDeployDeptId)' : '_ctShowManageTemplates()';
        footer.innerHTML = `
            <button onclick="${backFn}" class="btn btn-secondary">← Quay lại</button>
            <button onclick="_ctSaveEditTemplate(${templateId})" style="padding:8px 20px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#047857);color:white;cursor:pointer;font-weight:700;">💾 Lưu</button>`;
    } catch(e) {
        body.innerHTML = `<div style="padding:40px;text-align:center;color:#dc2626;">❌ ${e.message}</div>`;
    }
}

function _ctEditTemplateItemRow(item, idx, mode) {
    mode = mode || window._ctEditMode || 'manage';
    const isDeploy = mode === 'deploy';

    if (isDeploy) {
        // Deploy mode: show name as read-only, only deadline editable
        return `<div class="ct-edit-item" style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;background:#fafbfc;">
            <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;align-items:start;">
                <div>
                    <div style="font-weight:700;font-size:14px;color:#1e293b;margin-bottom:6px;">📋 ${item?.task_name || ''}</div>
                    ${item?.guide_link ? `<a href="${item.guide_link}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;margin-bottom:6px;word-break:break-all;">🔗 ${item.guide_link}</a>` : '<div style="padding:4px 10px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#dc2626;font-size:11px;font-weight:600;margin-bottom:6px;">⚠️ Chưa có link hướng dẫn</div>'}
                    <div style="display:flex;gap:12px;font-size:12px;color:#374151;margin-top:4px;">
                        <span style="background:#f0fdf4;border:1px solid #bbf7d0;padding:2px 8px;border-radius:4px;">📦 SL: <b>${item?.min_quantity || 1}</b></span>
                        <span style="background:#fefce8;border:1px solid #fde68a;padding:2px 8px;border-radius:4px;">🔄 Nộp lại: <b>${item?.max_redo_count || 3}</b> lần</span>
                        ${item?.requires_approval ? '<span style="background:#fef3c7;border:1px solid #fcd34d;padding:2px 8px;border-radius:4px;">🔒 <b>QL duyệt</b></span>' : ''}
                    </div>
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;">📅 Deadline <span style="color:#dc2626;">*</span></label>
                    <input type="date" class="ct-edit-item-deadline" value="${item?.deadline?.split('T')[0] || ''}" style="width:100%;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;box-sizing:border-box;margin-top:4px;" />
                </div>
            </div>
            <input type="hidden" class="ct-edit-item-name" value="${item?.task_name || ''}" />
            <input type="hidden" class="ct-edit-item-guide" value="${item?.guide_link || ''}" />
            <input type="hidden" class="ct-edit-item-qty" value="${item?.min_quantity || 1}" />
            <input type="hidden" class="ct-edit-item-redo" value="${item?.max_redo_count || 3}" />
            <input type="hidden" class="ct-edit-item-approval" value="${item?.requires_approval ? '1' : '0'}" ${item?.requires_approval ? 'checked' : ''} />
        </div>`;
    }

    // Manage mode: full edit, no deadline
    return `<div class="ct-edit-item" style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;background:#fafbfc;position:relative;">
        <button onclick="this.closest('.ct-edit-item').remove()" style="position:absolute;top:4px;right:6px;background:none;border:none;color:#dc2626;cursor:pointer;font-size:14px;" title="Xóa">×</button>
        <div style="margin-bottom:6px;">
            <label style="font-size:10px;color:#6b7280;">Tên task con <span style="color:#dc2626;">*</span></label>
            <input class="ct-edit-item-name" value="${item?.task_name || ''}" style="width:100%;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;box-sizing:border-box;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:6px;">
            <div>
                <label style="font-size:10px;color:#6b7280;">Link hướng dẫn <span style="color:#dc2626;">*</span></label>
                <input class="ct-edit-item-guide" value="${item?.guide_link || ''}" style="width:100%;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:10px;color:#6b7280;">SL tối thiểu <span style="color:#dc2626;">*</span></label>
                <input type="number" class="ct-edit-item-qty" value="${item?.min_quantity || 1}" min="1" style="width:100%;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;box-sizing:border-box;" />
            </div>
            <div>
                <label style="font-size:10px;color:#6b7280;">Số lần nộp lại <span style="color:#dc2626;">*</span></label>
                <input type="number" class="ct-edit-item-redo" value="${item?.max_redo_count || 3}" min="1" max="10" style="width:100%;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;box-sizing:border-box;" />
            </div>
        </div>
        <div style="display:flex;gap:12px;align-items:center;">
            <label style="font-size:10px;color:#6b7280;cursor:pointer;"><input type="checkbox" class="ct-edit-item-approval" ${item?.requires_approval ? 'checked' : ''} /> ✅ Cần QL duyệt</label>
        </div>
    </div>`;
}

function _ctEditTemplateAddItem() {
    const container = document.getElementById('ctEditItems');
    if (!container) return;
    container.insertAdjacentHTML('beforeend', _ctEditTemplateItemRow(null, container.children.length));
}

async function _ctSaveEditTemplate(templateId) {
    const mode = window._ctEditMode || 'manage';
    let chainName, description, executionMode;

    if (mode === 'deploy') {
        // Deploy mode: get name/desc/mode from API (fields not in form)
        try {
            const tmpl = await apiCall(`/api/chain-tasks/templates/${templateId}`);
            chainName = tmpl.chain_name;
            description = tmpl.description || '';
            executionMode = tmpl.execution_mode || 'sequential';
        } catch(e) { alert('Lỗi: ' + e.message); return; }
    } else {
        chainName = document.getElementById('ctEditName')?.value?.trim();
        if (!chainName) { alert('⚠️ Vui lòng nhập tên chuỗi'); return; }
        description = document.getElementById('ctEditDesc')?.value?.trim() || '';
        executionMode = document.getElementById('ctEditMode')?.value || 'sequential';
    }

    const itemEls = document.querySelectorAll('#ctEditItems > .ct-edit-item');
    const items = [];
    let hasError = false;

    itemEls.forEach((el, idx) => {
        if (hasError) return;
        const name = el.querySelector('.ct-edit-item-name')?.value?.trim();
        const deadline = el.querySelector('.ct-edit-item-deadline')?.value;
        const qty = parseInt(el.querySelector('.ct-edit-item-qty')?.value);
        const guide = el.querySelector('.ct-edit-item-guide')?.value?.trim();

        if (!name) { alert(`⚠️ Task con #${idx+1}: Vui lòng nhập tên`); hasError = true; return; }
        if (mode === 'deploy' && !deadline) { alert(`⚠️ Task con #${idx+1} "${name}": Vui lòng chọn deadline`); hasError = true; return; }
        if (mode === 'manage' && !guide) { alert(`⚠️ Task con #${idx+1} "${name}": Vui lòng nhập link hướng dẫn`); hasError = true; return; }

        const approvalEl = el.querySelector('.ct-edit-item-approval');
        const isApproved = approvalEl?.type === 'checkbox' ? approvalEl.checked : (approvalEl?.value === '1');

        items.push({
            task_name: name, deadline: deadline || null, min_quantity: qty || 1, guide_link: guide || '',
            requires_approval: isApproved,
            max_redo_count: parseInt(el.querySelector('.ct-edit-item-redo')?.value) || 3
        });
    });

    if (hasError) return;
    if (items.length === 0) { alert('⚠️ Cần ít nhất 1 task con'); return; }

    try {
        await apiCall(`/api/chain-tasks/templates/${templateId}`, 'PUT', {
            chain_name: chainName, description, execution_mode: executionMode, items
        });
        showToast('💾 Đã lưu!');
        _ctTemplateEdited = true;
        _ctShowDeployModal(_ctDeployDeptId);
    } catch(e) { alert('Lỗi: ' + e.message); }
}

async function _ctDeleteTemplate(templateId) {
    if (!confirm('Xóa mẫu chuỗi này?')) return;
    try {
        await apiCall(`/api/chain-tasks/templates/${templateId}`, 'DELETE');
        showToast('🗑️ Đã xóa mẫu!');
        _ctShowManageTemplates();
    } catch(e) { alert('Lỗi: ' + e.message); }
}

// Utility
function _ctFmtDate(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

