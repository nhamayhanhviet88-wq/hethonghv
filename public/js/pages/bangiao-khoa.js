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
    const isManager = ['giam_doc', 'quan_ly', 'truong_phong', 'trinh'].includes(currentUser.role);

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
        const _lkRolePriority = { giam_doc: 5, quan_ly: 4, truong_phong: 3, trinh: 2, nhan_vien: 1 };
        const _lkRoleLabel = { giam_doc: '⭐ Giám đốc', quan_ly: '⭐ Quản lý', truong_phong: '⭐ Trưởng phòng', trinh: 'Trình', nhan_vien: 'Nhân viên' };
        const _lkIsLeader = (role) => ['giam_doc', 'quan_ly', 'truong_phong'].includes(role);

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
    const isManager = ['giam_doc', 'quan_ly', 'truong_phong', 'trinh'].includes(currentUser.role);
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
            ${canAddTask ? `<button onclick="_lkShowCreateModal(${deptId})" style="padding:8px 18px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#dc2626,#ef4444);color:white;cursor:pointer;font-weight:700;box-shadow:0 2px 6px rgba(220,38,38,0.3);">🔐 Thêm CV Khóa</button>` : ''}
        </div>`;

        if (tasks.length === 0) {
            html += `<div style="text-align:center;padding:60px;background:white;border-radius:12px;border:2px solid #e2e8f0;margin:0 16px;">
                <div style="font-size:40px;margin-bottom:8px;">📋</div>
                <div style="color:#9ca3af;font-size:13px;">Chưa có công việc khóa nào</div>
            </div>`;
        } else {
            // Check if this dept has sub-teams
            const hasSubTeams = (_lkIsParentDept || _lkIsSystemDept) && (_lkTreeData?.departments || []).some(d => d.parent_id === deptId);
            const showEdit = _lkIsSystemDept ? isDirector : _lkIsParentDept;
            html += `<div style="padding:0 16px;">${_lkRenderTaskTable(tasks, true, showEdit, hasSubTeams)}</div>`;
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
        rows += `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 12px;font-size:12px;color:#374151;white-space:nowrap;">${dateF}</td>
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
                <thead><tr style="background:#fef2f2;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;border-bottom:2px solid #fecaca;">Ngày</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;border-bottom:2px solid #fecaca;">Trạng Thái</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;border-bottom:2px solid #fecaca;width:90px;">Chi Tiết</th>
                </tr></thead>
                <tbody>${rows || '<tr><td colspan="3" style="padding:20px;text-align:center;color:#9ca3af;font-size:12px;">Chưa có báo cáo</td></tr>'}</tbody>
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
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Link hướng dẫn *</label>
                    <input id="lkf_guide" type="url" value="${t.guide_link || ''}" placeholder="https://..." style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
                </div>
                <div>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Mức phạt (VNĐ)</label>
                    <input id="lkf_penalty" type="number" value="${t.penalty_amount || 50000}" min="0" step="10000" style="width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;box-sizing:border-box;">
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
        penalty_amount: Number(document.getElementById('lkf_penalty')?.value) || 50000,
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
