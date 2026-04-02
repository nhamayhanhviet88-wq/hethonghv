// ========== LỊCH SỬ BÁO CÁO CÔNG VIỆC ==========

let _rhData = null;
let _rhSelectedUser = null;
let _rhYear = new Date().getFullYear();
let _rhFromMonth = new Date().getMonth() + 1;
let _rhToMonth = 0; // 0 = not set (single month)
let _rhCurrentMonth = ''; // computed from range
let _rhIsManager = false;
let _rhTeamMembers = [];
let _rhActiveDepts = [];
let _rhApprovers = [];
let _rhAllDepts = [];
let _rhExpandedDepts = new Set();
let _rhTaskGroups = [];
let _rhReportMap = {};
let _rhWorkingDays = [];
let _rhModalTaskIdx = null; // currently open task modal index
let _rhModalMonth = ''; // month being viewed in modal
let _rhLockGroups = []; // lock task groups for modal
let _rhLockModalIdx = null; // currently open lock task modal index

// Color palette for task cards (deterministic hash)
const _rhColors = [
    { bg: '#fef3c7', border: '#fde68a', badge: '#d97706', text: '#92400e', tag: '#fef9c3' },
    { bg: '#dbeafe', border: '#93c5fd', badge: '#2563eb', text: '#1e40af', tag: '#eff6ff' },
    { bg: '#d1fae5', border: '#6ee7b7', badge: '#059669', text: '#065f46', tag: '#ecfdf5' },
    { bg: '#fce7f3', border: '#f9a8d4', badge: '#db2777', text: '#9d174d', tag: '#fdf2f8' },
    { bg: '#e0e7ff', border: '#a5b4fc', badge: '#4f46e5', text: '#3730a3', tag: '#eef2ff' },
    { bg: '#ffedd5', border: '#fdba74', badge: '#ea580c', text: '#9a3412', tag: '#fff7ed' },
    { bg: '#cffafe', border: '#67e8f9', badge: '#0891b2', text: '#155e75', tag: '#ecfeff' },
    { bg: '#f3e8ff', border: '#c4b5fd', badge: '#7c3aed', text: '#5b21b6', tag: '#f5f3ff' },
];
let _rhColorMap = {};
function _rhGetColor(name) {
    if (_rhColorMap[name]) return _rhColorMap[name];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    const idx = Math.abs(h) % _rhColors.length;
    _rhColorMap[name] = _rhColors[idx];
    return _rhColors[idx];
}

const _RH_DAY_NAMES = { 0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };
const _RH_STATUS = {
    approved: { icon: '✅', label: 'Đạt', color: '#16a34a', bg: '#dcfce7' },
    pending: { icon: '⏳', label: 'Chờ duyệt', color: '#d97706', bg: '#fef3c7' },
    rejected: { icon: '❌', label: 'Từ chối', color: '#dc2626', bg: '#fecaca' },
    expired: { icon: '🚫', label: 'Hết hạn', color: '#6b7280', bg: '#f3f4f6' },
    missed: { icon: '🚫', label: 'Bỏ lỡ', color: '#ef4444', bg: '#fef2f2' }
};

const _RH_MONTH_NAMES = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

// Popstate listener for SPA
window.addEventListener('popstate', function() {
    const p = location.pathname.replace(/^\/+/, '');
    if (p === 'lichsubaocaocv') {
        const container = document.getElementById('contentArea');
        if (container) renderLichSuBaoCaoPage(container);
    }
});

async function renderLichSuBaoCaoPage(container) {
    _rhColorMap = {};
    _rhIsManager = ['giam_doc', 'pho_giam_doc', 'quan_ly', 'truong_phong'].includes(currentUser.role);

    // Detect F5 vs menu navigation
    const lastPage = sessionStorage.getItem('_rh_lastPage');
    const isReload = lastPage === 'lichsubaocaocv';
    sessionStorage.setItem('_rh_lastPage', 'lichsubaocaocv');

    if (isReload) {
        // F5 → restore saved state
        try {
            const saved = JSON.parse(sessionStorage.getItem('_rh_state') || '{}');
            if (saved.year) _rhYear = saved.year;
            if (saved.fromMonth !== undefined) _rhFromMonth = saved.fromMonth;
            if (saved.toMonth !== undefined) _rhToMonth = saved.toMonth;
            if (saved.userId && saved.userName) _rhSelectedUser = { id: saved.userId, name: saved.userName };
        } catch(e) {}
    } else {
        // From another menu → reset defaults
        _rhYear = new Date().getFullYear();
        _rhFromMonth = new Date().getMonth() + 1;
        _rhToMonth = 0;
        _rhSelectedUser = null;
        sessionStorage.removeItem('_rh_state');
    }
    _rhCurrentMonth = `${_rhYear}-${String(_rhFromMonth || 1).padStart(2, '0')}`;

    container.innerHTML = `<div style="padding:40px;text-align:center;color:#9ca3af;"><div style="font-size:40px;margin-bottom:12px;">⏳</div>Đang tải trang...</div>`;

    if (_rhIsManager) {
        const [deptRes, memberRes] = await Promise.all([
            apiCall('/api/task-points/departments'),
            apiCall('/api/schedule/team-members')
        ]);
        const raw = (deptRes.departments || []).filter(d => !d.name.toUpperCase().includes('AFFILIATE'));
        const activeDeptIds = deptRes.active_dept_ids || [];
        _rhTeamMembers = memberRes.members || [];
        _rhApprovers = deptRes.approvers || [];

        const activeSet = new Set(activeDeptIds);
        const systemDepts = raw.filter(d => d.name.startsWith('HỆ THỐNG'));
        const nonSystemDepts = raw.filter(d => !d.name.startsWith('HỆ THỐNG'));

        // Build flat list for auto-select
        _rhActiveDepts = nonSystemDepts.filter(d => activeSet.has(d.id))
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        _rhAllDepts = raw;
        _rhExpandedDepts = new Set(_rhActiveDepts.map(d => d.id));
        _renderRhManagerLayout(container, systemDepts, nonSystemDepts, activeSet);
        // Auto-load saved user
        if (_rhSelectedUser) {
            await _rhLoadHistory();
        }
    } else {
        _rhSelectedUser = { id: currentUser.id, name: currentUser.full_name };
        _renderRhEmployeeLayout(container);
        await _rhLoadHistory();
    }
}

function _renderRhManagerLayout(container, systemDepts, nonSystemDepts, activeSet) {
    systemDepts = (systemDepts || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    let sidebarHtml = '';

    systemDepts.forEach(sys => {
        let childDepts = nonSystemDepts.filter(d => d.parent_id === sys.id && activeSet.has(d.id));
        childDepts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        const hasSysApprovers = _rhApprovers.some(a => a.department_id === sys.id);
        if (childDepts.length === 0 && !hasSysApprovers) return;

        // System header
        sidebarHtml += `<div class="rh-system-header" data-sys-id="${sys.id}" onclick="_rhToggleSystem(${sys.id})" style="padding:10px 14px;font-size:13px;font-weight:900;color:#fff;text-transform:uppercase;background:linear-gradient(135deg,#0f172a,#1e3a5f);border-bottom:2px solid #0f172a;margin-top:6px;box-shadow:0 3px 10px rgba(15,23,42,0.35);border-radius:8px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;cursor:pointer;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
            <span style="font-size:15px;">🏛️</span>
            <span style="flex:1;">${sys.name}</span>
            <span class="rh-sys-arrow" style="font-size:10px;opacity:0.7;">▼</span>
        </div>`;
        sidebarHtml += `<div class="rh-sys-content" data-sys-id="${sys.id}">`;

        // System-level approvers (quản lý cấp cao)
        const sysApprovers = _rhApprovers.filter(a => a.department_id === sys.id);
        sysApprovers.forEach(a => {
            const isSelected = _rhSelectedUser && _rhSelectedUser.id === a.user_id;
            sidebarHtml += `<div onclick="_rhSelectUser(${a.user_id}, '${(a.full_name || '').replace(/'/g, "\\'")}')" style="padding:6px 14px 6px 18px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s;${isSelected ? 'background:#eff6ff;border-left:3px solid #2563eb;font-weight:700;color:#1e40af;' : 'background:white;border-left:3px solid transparent;'}" onmouseover="if(!${isSelected})this.style.background='#f8fafc'" onmouseout="if(!${isSelected})this.style.background='white'">
                <span style="font-size:14px;">⭐</span>
                <span style="flex:1;font-weight:700;">${a.full_name}</span>
                <span style="font-size:9px;background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:6px;font-weight:700;">⭐ Quản lý cấp cao</span>
            </div>`;
        });

        let parentStt = 0, childStt = 0;
        childDepts.forEach((d, i) => {
            const isChild = childDepts.some(p => p.id === d.parent_id);
            const subTeams = nonSystemDepts.filter(sub => sub.parent_id === d.id && activeSet.has(sub.id))
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            if (!isChild) { parentStt++; childStt = 0; }
            const sttLabel = !isChild
                ? `<span style="color:#0f172a;font-size:12px;font-weight:900;margin-right:5px;background:rgba(255,255,255,0.85);padding:1px 6px;border-radius:4px;">${parentStt}.</span>`
                : `<span style="color:#1e3a5f;font-size:11px;font-weight:800;margin-right:3px;">${++childStt}.</span>`;

            sidebarHtml += `
            <div class="rh-dept-header" data-dept-id="${d.id}" onclick="_rhToggleDept(${d.id})" style="display:flex;align-items:center;gap:6px;padding:${isChild ? '7px 14px 7px 28px' : '10px 14px'};font-size:${isChild ? '11px' : '13px'};color:${isChild ? '#475569' : '#fff'};cursor:pointer;border-bottom:${isChild ? '1px solid #e2e8f0' : '2px solid #1e40af'};font-weight:900;text-transform:uppercase;letter-spacing:${isChild ? '0.3px' : '0.5px'};background:${isChild ? 'linear-gradient(135deg,#f1f5f9,#e8eef5)' : 'linear-gradient(135deg,#1e3a5f,#2563eb)'};${!isChild ? 'margin-top:4px;box-shadow:0 2px 8px rgba(37,99,235,0.25);border-radius:6px;' : 'border-left:3px solid #93c5fd;'}transition:all .2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                ${sttLabel}${isChild ? '<span style="color:#94a3b8;">└</span> ' : '<span style="font-size:14px;">🏢</span> '}<span style="flex:1;">${d.name}</span><span style="font-size:10px;opacity:0.7;">${_rhExpandedDepts.has(d.id) ? '▼' : '▶'}</span>
            </div>
            <div id="rhMembers_${d.id}" style="display:${_rhExpandedDepts.has(d.id) ? 'block' : 'none'};">
                ${_rhRenderDeptMembers(d.id, d.name)}
            </div>`;

            subTeams.forEach(sub => {
                childStt++;
                sidebarHtml += `
                <div class="rh-dept-header" data-dept-id="${sub.id}" onclick="_rhToggleDept(${sub.id})" style="display:flex;align-items:center;gap:6px;padding:7px 14px 7px 28px;font-size:11px;color:#475569;cursor:pointer;border-bottom:1px solid #e2e8f0;font-weight:900;text-transform:uppercase;letter-spacing:0.3px;background:linear-gradient(135deg,#f1f5f9,#e8eef5);border-left:3px solid #93c5fd;transition:all .2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                    <span style="color:#1e3a5f;font-size:11px;font-weight:800;margin-right:3px;">${childStt}.</span><span style="color:#94a3b8;">└</span> <span style="flex:1;">${sub.name}</span><span style="font-size:10px;opacity:0.7;">${_rhExpandedDepts.has(sub.id) ? '▼' : '▶'}</span>
                </div>
                <div id="rhMembers_${sub.id}" style="display:${_rhExpandedDepts.has(sub.id) ? 'block' : 'none'};">
                    ${_rhRenderDeptMembers(sub.id, sub.name)}
                </div>`;
            });
        });
        sidebarHtml += `</div>`;
    });

    container.innerHTML = `
    <div style="margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="margin:0;font-size:20px;color:#122546;font-weight:700;">📊 Lịch Sử Báo Cáo Công Việc</h2>
        </div>
        <div style="display:flex;gap:16px;align-items:flex-start;">
            <div style="min-width:230px;max-width:240px;background:white;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.06);flex-shrink:0;overflow-x:hidden;">
                <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:12px 12px 0 0;">
                    <input type="text" id="rhSearchInput" placeholder="🔍 Tìm NV..." oninput="_rhFilterSidebar()" style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;box-sizing:border-box;color:#1e293b;background:white;outline:none;" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#e2e8f0'" />
                </div>
                <div id="rhDeptList" style="max-height:calc(100vh - 250px);overflow-y:auto;">
                    ${sidebarHtml}
                </div>
            </div>
            <div style="flex:1;min-width:0;">
                <div id="rhContent" style="background:white;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                    <div style="padding:50px;text-align:center;color:#9ca3af;font-size:14px;">
                        <div style="font-size:40px;margin-bottom:12px;">📊</div>
                        Chọn nhân viên bên trái để xem lịch sử báo cáo
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function _renderRhEmployeeLayout(container) {
    container.innerHTML = `
    <div style="margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="margin:0;font-size:20px;color:#122546;font-weight:700;">📊 Lịch Sử Báo Cáo Công Việc</h2>
        </div>
        <div id="rhContent" style="background:white;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
            <div style="padding:50px;text-align:center;color:#9ca3af;font-size:14px;">
                <div style="font-size:40px;margin-bottom:12px;">⏳</div>
                Đang tải lịch sử...
            </div>
        </div>
    </div>`;
}

function _rhRenderDeptMembers(deptId, deptName) {
    let members = _rhTeamMembers.filter(m => m.dept_name === deptName);
    // Add approvers for this dept
    const deptApprovers = (_rhApprovers || []).filter(a => a.department_id === deptId);
    const approverIdSet = new Set();
    deptApprovers.forEach(a => {
        approverIdSet.add(a.user_id);
        if (!members.some(m => m.id === a.user_id)) {
            members.unshift({ id: a.user_id, full_name: a.full_name, username: a.username, role: a.role, dept_name: deptName, _isApprover: true });
        }
    });
    members.forEach(m => { if (approverIdSet.has(m.id)) m._isApprover = true; });
    // Sort: approvers first, then leaders by role priority, then regular
    const _rhRolePri = { giam_doc: 5, pho_giam_doc: 4, quan_ly: 4, truong_phong: 3, trinh: 2, nhan_vien: 1 };
    members.sort((a, b) => {
        const aP = (a._isApprover ? 20 : 0) + (a._is_dept_head ? 10 : 0) + (_rhRolePri[a.role] || 0);
        const bP = (b._isApprover ? 20 : 0) + (b._is_dept_head ? 10 : 0) + (_rhRolePri[b.role] || 0);
        return bP - aP;
    });
    if (members.length === 0) return '<div style="padding:8px 14px;font-size:11px;color:#9ca3af;">Chưa có nhân viên</div>';
    const isLeader = (role) => ['giam_doc', 'pho_giam_doc', 'quan_ly', 'truong_phong'].includes(role);
    return members.map(m => {
        const isHead = m._is_dept_head;
        const isApprover = m._isApprover;
        const isSelected = _rhSelectedUser && _rhSelectedUser.id === m.id;
        const nameStyle = (isHead || isApprover) ? 'font-weight:700;' : '';
        const badge = isApprover ? '<span style="font-size:9px;background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:6px;font-weight:700;">⭐ Quản Lý</span>'
            : (isHead ? '<span style="font-size:9px;background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:6px;">TP</span>' : '');
        return `<div onclick="_rhSelectUser(${m.id}, '${(m.full_name || '').replace(/'/g, "\\'")}')" style="padding:6px 14px 6px 32px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s;${isSelected ? 'background:#eff6ff;border-left:3px solid #2563eb;font-weight:700;color:#1e40af;' : 'background:white;border-left:3px solid transparent;'}" onmouseover="if(!${isSelected})this.style.background='#f8fafc'" onmouseout="if(!${isSelected})this.style.background='white'">
            <span style="font-size:14px;">${isApprover ? '⭐' : (isHead || isLeader(m.role) ? '⭐' : '👤')}</span>
            <span style="flex:1;${nameStyle}">${m.full_name}</span>
            ${badge}
        </div>`;
    }).join('');
}

function _rhToggleSystem(sysId) {
    const content = document.querySelector(`.rh-sys-content[data-sys-id="${sysId}"]`);
    const header = document.querySelector(`.rh-system-header[data-sys-id="${sysId}"]`);
    if (!content) return;
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    const arrow = header?.querySelector('.rh-sys-arrow');
    if (arrow) arrow.textContent = isHidden ? '▼' : '▶';
}

function _rhToggleDept(deptId) {
    if (_rhExpandedDepts.has(deptId)) _rhExpandedDepts.delete(deptId);
    else _rhExpandedDepts.add(deptId);
    const wrap = document.getElementById(`rhMembers_${deptId}`);
    if (wrap) wrap.style.display = _rhExpandedDepts.has(deptId) ? 'block' : 'none';
    const header = document.querySelector(`.rh-dept-header[data-dept-id="${deptId}"] span:last-child`);
    if (header) header.textContent = _rhExpandedDepts.has(deptId) ? '▼' : '▶';
}

async function _rhSelectUser(userId, userName) {
    _rhSelectedUser = { id: userId, name: userName };
    _rhSaveState();
    const deptList = document.getElementById('rhDeptList');
    if (deptList) {
        _rhActiveDepts.forEach(d => {
            const wrap = document.getElementById(`rhMembers_${d.id}`);
            if (wrap) wrap.innerHTML = _rhRenderDeptMembers(d.id, d.name);
        });
    }
    await _rhLoadHistory();
}

function _rhGetMonthRange() {
    if (_rhFromMonth === 0) {
        const months = [];
        for (let m = 1; m <= 12; m++) months.push(`${_rhYear}-${String(m).padStart(2, '0')}`);
        return months;
    }
    const from = _rhFromMonth;
    const to = _rhToMonth && _rhToMonth >= from ? _rhToMonth : from;
    const months = [];
    for (let m = from; m <= to; m++) months.push(`${_rhYear}-${String(m).padStart(2, '0')}`);
    return months;
}

function _rhRangeLabel() {
    if (_rhFromMonth === 0) return `Tất cả tháng / ${_rhYear}`;
    if (!_rhToMonth || _rhToMonth <= _rhFromMonth) return `Tháng ${_rhFromMonth}/${_rhYear}`;
    return `T${_rhFromMonth} → T${_rhToMonth}/${_rhYear}`;
}

function _rhBuildYearOptions() {
    let html = '';
    for (let y = 2026; y <= 2100; y++) html += `<option value="${y}" ${y === _rhYear ? 'selected' : ''}>${y}</option>`;
    return html;
}

function _rhBuildFromOptions() {
    const months = _RH_MONTH_NAMES;
    let html = `<option value="0"${_rhFromMonth === 0 ? ' selected' : ''}>📊 Tất cả</option>`;
    for (let m = 1; m <= 12; m++) html += `<option value="${m}" ${m === _rhFromMonth ? 'selected' : ''}>${months[m]}</option>`;
    return html;
}

function _rhBuildToOptions() {
    const months = _RH_MONTH_NAMES;
    let html = `<option value="0"${_rhToMonth === 0 ? ' selected' : ''}>— Đến —</option>`;
    for (let m = 1; m <= 12; m++) html += `<option value="${m}" ${m === _rhToMonth ? 'selected' : ''}>${months[m]}</option>`;
    return html;
}

async function _rhLoadHistory() {
    if (!_rhSelectedUser) return;
    const wrap = document.getElementById('rhContent');
    if (!wrap) return;
    wrap.innerHTML = '<div style="padding:50px;text-align:center;color:#9ca3af;"><div style="font-size:30px;margin-bottom:8px;">⏳</div>Đang tải lịch sử...</div>';

    try {
        const monthList = _rhGetMonthRange();
        const results = await Promise.all(monthList.map(m => apiCall(`/api/report-history/user/${_rhSelectedUser.id}?month=${m}`)));

        // Merge data from all months
        const merged = { templates: [], reports: [], snapshots: [], holidays: [], lock_completions: [], lock_tasks: [], user_info: {}, from_date: '', to_date: '', month: monthList[0] };
        const lockTaskIdSet = new Set();
        results.forEach(data => {
            if (data.error) return;
            (data.templates || []).forEach(t => merged.templates.push(t));
            (data.reports || []).forEach(r => merged.reports.push(r));
            (data.snapshots || []).forEach(s => merged.snapshots.push(s));
            (data.holidays || []).forEach(h => {
                if (!merged.holidays.some(eh => eh.holiday_date === h.holiday_date)) merged.holidays.push(h);
            });
            (data.lock_completions || []).forEach(c => merged.lock_completions.push(c));
            (data.lock_tasks || []).forEach(t => {
                if (!lockTaskIdSet.has(t.id)) { lockTaskIdSet.add(t.id); merged.lock_tasks.push(t); }
            });
            if (data.user_info) merged.user_info = data.user_info;
            if (!merged.from_date || (data.from_date && data.from_date < merged.from_date)) merged.from_date = data.from_date;
            if (!merged.to_date || (data.to_date && data.to_date > merged.to_date)) merged.to_date = data.to_date;
        });

        _rhData = merged;
        _rhCurrentMonth = monthList[0];
        if (_rhData.error) {
            wrap.innerHTML = `<div style="padding:50px;text-align:center;color:#dc2626;"><div style="font-size:30px;margin-bottom:8px;">❌</div>Lỗi: ${_rhData.error}</div>`;
            return;
        }
        _rhRenderContent();
    } catch (e) {
        wrap.innerHTML = `<div style="padding:50px;text-align:center;color:#dc2626;"><div style="font-size:30px;margin-bottom:8px;">❌</div>Lỗi: ${e.message || 'Không thể tải dữ liệu'}</div>`;
    }
}

function _rhRenderContent() {
    const wrap = document.getElementById('rhContent');
    if (!wrap || !_rhData) return;

    const { templates = [], reports = [], snapshots = [], holidays = [], lock_completions = [], lock_tasks = [], user_info = {}, from_date, to_date } = _rhData;
    const monthList = _rhGetMonthRange();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const holidaySet = new Set(holidays.map(h => h.holiday_date));

    const workingDays = [];
    monthList.forEach(month => {
        const [year, mon] = month.split('-').map(Number);
        const lastDay = new Date(year, mon, 0).getDate();
        for (let d = 1; d <= lastDay; d++) {
            const dateStr = `${month}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, mon - 1, d);
            const dayOfWeek = dateObj.getDay();
            if (holidaySet.has(dateStr)) continue;
            if (dateStr > todayStr) continue;
            workingDays.push({ dateStr, dayOfWeek, dayNum: d });
        }
    });

    // Group snapshots by TASK NAME
    const taskGroupMap = new Map();
    snapshots.forEach(s => {
        const name = s.task_name;
        const dateStr = s.snapshot_date_str || s.snapshot_date;
        if (!taskGroupMap.has(name)) {
            taskGroupMap.set(name, {
                task_name: name, points: s.points, min_quantity: s.min_quantity,
                requires_approval: s.requires_approval, guide_url: s.guide_url,
                input_requirements: s.input_requirements, output_requirements: s.output_requirements,
                template_ids: new Set(), dayEntries: []
            });
        }
        const group = taskGroupMap.get(name);
        group.template_ids.add(s.template_id);
        group.dayEntries.push({ dateStr, template_id: s.template_id, time_start: s.time_start, time_end: s.time_end });
    });

    templates.forEach(t => {
        const name = t.task_name;
        if (!taskGroupMap.has(name)) {
            taskGroupMap.set(name, {
                task_name: name, points: t.points, min_quantity: t.min_quantity,
                requires_approval: t.requires_approval, guide_url: t.guide_url,
                input_requirements: t.input_requirements, output_requirements: t.output_requirements,
                template_ids: new Set(), dayEntries: []
            });
        }
        const group = taskGroupMap.get(name);
        group.template_ids.add(t.id);
        const todayDow = today.getDay() === 0 ? 7 : today.getDay();
        if (t.day_of_week === todayDow && todayStr >= from_date && todayStr <= to_date) {
            if (!group.dayEntries.some(e => e.dateStr === todayStr && e.template_id === t.id)) {
                group.dayEntries.push({ dateStr: todayStr, template_id: t.id, time_start: t.time_start, time_end: t.time_end });
            }
        }
    });

    const reportMap = {};
    reports.forEach(r => { reportMap[`${r.template_id}_${r.report_date}`] = r; });

    const taskGroups = [...taskGroupMap.values()].map(g => {
        let completed = 0, missed = 0, pending = 0, points = 0, total = 0;
        const validEntries = g.dayEntries.filter(e => workingDays.some(w => w.dateStr === e.dateStr));
        validEntries.forEach(e => {
            total++;
            const report = reportMap[`${e.template_id}_${e.dateStr}`];
            if (report) {
                if (report.status === 'approved') { completed++; points += (report.points_earned || 0); }
                else if (report.status === 'pending') { pending++; }
                else { missed++; }
            } else {
                if (e.dateStr < todayStr) missed++;
            }
        });
        return { ...g, completed, missed, pending, points, total };
    }).sort((a, b) => a.task_name.localeCompare(b.task_name));

    _rhTaskGroups = taskGroups;
    _rhReportMap = reportMap;
    _rhWorkingDays = workingDays;

    let totalAssigned = 0, totalCompleted = 0, totalPoints = 0, totalMissed = 0;
    taskGroups.forEach(g => { totalAssigned += g.total; totalCompleted += g.completed; totalPoints += g.points; totalMissed += g.missed; });
    const completionRate = totalAssigned > 0 ? Math.round(totalCompleted / totalAssigned * 100) : 0;

    let html = '';

    // Header
    const _rhSelStyle = 'padding:6px 10px;border:1px solid #a7f3d0;border-radius:8px;font-size:12px;color:#064e3b;background:white;cursor:pointer;font-weight:600;';
    html += `<div style="padding:14px 20px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-bottom:1px solid #a7f3d0;border-radius:10px 10px 0 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">👤</span>
            <div>
                <div style="font-weight:700;color:#064e3b;font-size:15px;">${user_info.full_name}</div>
                <div style="font-size:11px;color:#059669;">${user_info.dept_name || 'Chưa phân bổ'} · ${_rhRangeLabel()}</div>
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
            <select onchange="_rhOnYearChange(this.value)" style="${_rhSelStyle}">${_rhBuildYearOptions()}</select>
            <select onchange="_rhOnFromChange(this.value)" style="${_rhSelStyle}">${_rhBuildFromOptions()}</select>
            ${_rhFromMonth !== 0 ? `<span style="font-size:11px;color:#9ca3af;font-weight:600;">→</span>
            <select onchange="_rhOnToChange(this.value)" style="${_rhSelStyle}">${_rhBuildToOptions()}</select>` : ''}
        </div>
    </div>`;

    // CV ĐIỂM Header
    html += `<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:10px 20px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;">📊</span>
        <span style="font-weight:800;color:white;font-size:14px;letter-spacing:0.5px;">CV ĐIỂM</span>
        <span style="background:rgba(255,255,255,0.2);color:white;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${totalAssigned} công việc</span>
    </div>`;

    // Stats cards
    html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px 20px;border-bottom:1px solid #e5e7eb;">
        <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#1e40af;">${totalAssigned}</div>
            <div style="font-size:11px;color:#3b82f6;font-weight:600;">CV Được Giao</div>
        </div>
        <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #6ee7b7;border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#059669;">${totalCompleted} <span style="font-size:14px;color:#10b981;">(${completionRate}%)</span></div>
            <div style="font-size:11px;color:#059669;font-weight:600;">Hoàn Thành</div>
        </div>
        <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fdba74;border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#ea580c;">${totalPoints}đ</div>
            <div style="font-size:11px;color:#ea580c;font-weight:600;">Tổng Điểm</div>
        </div>
        <div style="background:linear-gradient(135deg,#fef2f2,#fecaca);border:1px solid #fca5a5;border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#dc2626;">${totalMissed}</div>
            <div style="font-size:11px;color:#dc2626;font-weight:600;">Bỏ Lỡ / Từ Chối</div>
        </div>
    </div>`;

    // Task list
    if (taskGroups.length === 0) {
        html += `<div style="padding:50px;text-align:center;color:#9ca3af;font-size:14px;">
            <div style="font-size:40px;margin-bottom:12px;">📭</div>
            Chưa có công việc nào được bàn giao trong ${_RH_MONTH_NAMES[mon]} ${year}
        </div>`;
    } else {
        html += '<div style="padding:16px 20px;display:flex;flex-direction:column;gap:8px;">';
        taskGroups.forEach((g, idx) => {
            const c = _rhGetColor(g.task_name);
            const rate = g.total > 0 ? Math.round(g.completed / g.total * 100) : 0;
            html += `
            <div onclick="_rhOpenTaskModal(${idx})" style="border:1px solid ${c.border};border-left:4px solid ${c.badge};border-radius:10px;background:white;box-shadow:0 1px 4px rgba(0,0,0,0.04);cursor:pointer;transition:all .15s;overflow:hidden;" onmouseover="this.style.boxShadow='0 3px 12px rgba(0,0,0,0.1)';this.style.transform='translateY(-1px)'" onmouseout="this.style.boxShadow='0 1px 4px rgba(0,0,0,0.04)';this.style.transform='none'">
                <div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                        <div style="min-width:0;flex:1;">
                            <div style="font-weight:700;color:${c.text};font-size:14px;">${g.task_name}</div>
                            <div style="font-size:10px;color:#6b7280;margin-top:2px;">
                                📈 ${g.completed}/${g.total} đạt (${rate}%) · ${g.points}đ
                                ${g.missed > 0 ? ' · <span style="color:#dc2626;">' + g.missed + ' bỏ lỡ</span>' : ''}
                                ${g.pending > 0 ? ' · <span style="color:#d97706;">' + g.pending + ' chờ</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                        <span style="background:${c.badge};color:white;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${g.points}đ</span>
                        <span style="color:#9ca3af;font-size:14px;">▶</span>
                    </div>
                </div>
            </div>`;
        });
        html += '</div>';
    }

    // ===== CV KHÓA SECTION =====
    if (lock_completions.length > 0) {
        // Group completions by task
        const lockGroupMap = new Map();
        lock_tasks.forEach(lt => {
            if (!lockGroupMap.has(lt.task_name)) {
                lockGroupMap.set(lt.task_name, {
                    task_name: lt.task_name, lock_task_id: lt.id,
                    guide_link: lt.guide_link,
                    requires_approval: lt.requires_approval,
                    completions: []
                });
            }
        });
        lock_completions.forEach(lc => {
            if (!lockGroupMap.has(lc.task_name)) {
                lockGroupMap.set(lc.task_name, {
                    task_name: lc.task_name, lock_task_id: lc.lock_task_id,
                    guide_link: lc.guide_link,
                    requires_approval: lc.requires_approval,
                    completions: []
                });
            }
            lockGroupMap.get(lc.task_name).completions.push(lc);
        });

        const lockGroups = [...lockGroupMap.values()].filter(g => g.completions.length > 0);
        let lockApproved = 0, lockPending = 0, lockRejected = 0;
        lock_completions.forEach(lc => {
            if (lc.status === 'approved') lockApproved++;
            else if (lc.status === 'pending') lockPending++;
            else if (lc.status === 'rejected') lockRejected++;
        });

        html += `
        <div style="margin-top:16px;border-top:3px solid #fecaca;padding-top:0;">
            <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:10px 20px;display:flex;align-items:center;gap:8px;">
                <span style="font-size:16px;">🔐</span>
                <span style="font-weight:800;color:white;font-size:14px;letter-spacing:0.5px;">CV KHÓA</span>
                <span style="background:rgba(255,255,255,0.2);color:white;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">${lock_completions.length} báo cáo</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px 20px;border-bottom:1px solid #fecaca;">
                <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:10px;padding:14px;text-align:center;">
                    <div style="font-size:24px;font-weight:800;color:#1e40af;">${lock_completions.length}</div>
                    <div style="font-size:11px;color:#3b82f6;font-weight:600;">Tổng Báo Cáo</div>
                </div>
                <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #6ee7b7;border-radius:10px;padding:14px;text-align:center;">
                    <div style="font-size:24px;font-weight:800;color:#059669;">${lockApproved} <span style="font-size:14px;color:#10b981;">(${lock_completions.length > 0 ? Math.round(lockApproved/lock_completions.length*100) : 0}%)</span></div>
                    <div style="font-size:11px;color:#059669;font-weight:600;">Đạt</div>
                </div>
                <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fbbf24;border-radius:10px;padding:14px;text-align:center;">
                    <div style="font-size:24px;font-weight:800;color:#d97706;">${lockPending}</div>
                    <div style="font-size:11px;color:#d97706;font-weight:600;">Chờ Duyệt</div>
                </div>
                <div style="background:linear-gradient(135deg,#fef2f2,#fecaca);border:1px solid #fca5a5;border-radius:10px;padding:14px;text-align:center;">
                    <div style="font-size:24px;font-weight:800;color:#dc2626;">${lockRejected}</div>
                    <div style="font-size:11px;color:#dc2626;font-weight:600;">Từ Chối</div>
                </div>
            </div>
            <div style="padding:12px 20px;display:flex;flex-direction:column;gap:8px;">`;

        _rhLockGroups = lockGroups; // store for modal

        lockGroups.forEach((g, idx) => {
            const approved = g.completions.filter(c => c.status === 'approved').length;
            const pending = g.completions.filter(c => c.status === 'pending').length;
            const rejected = g.completions.filter(c => c.status === 'rejected').length;
            const total = g.completions.length;

            html += `
            <div onclick="_rhOpenLockModal(${idx})" style="border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:10px;background:white;box-shadow:0 1px 4px rgba(0,0,0,0.04);cursor:pointer;transition:all .15s;overflow:hidden;" onmouseover="this.style.boxShadow='0 3px 12px rgba(0,0,0,0.1)';this.style.transform='translateY(-1px)'" onmouseout="this.style.boxShadow='0 1px 4px rgba(0,0,0,0.04)';this.style.transform='none'">
                <div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                        <div style="min-width:0;flex:1;">
                            <div style="font-weight:700;color:#991b1b;font-size:14px;">${g.task_name}</div>
                            <div style="font-size:10px;color:#6b7280;margin-top:2px;">
                                🔐 ${total} báo cáo
                                ${approved > 0 ? ' · <span style="color:#16a34a;">' + approved + ' đạt</span>' : ''}
                                ${pending > 0 ? ' · <span style="color:#d97706;">' + pending + ' chờ</span>' : ''}
                                ${rejected > 0 ? ' · <span style="color:#dc2626;">' + rejected + ' từ chối</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                        <span style="background:#dc2626;color:white;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">🔐</span>
                        <span style="color:#9ca3af;font-size:14px;">▶</span>
                    </div>
                </div>
            </div>`;
        });

        html += '</div></div>';

    }

    wrap.innerHTML = html;
}

// ========== TASK HISTORY MODAL ==========
function _rhOpenTaskModal(idx) {
    _rhModalTaskIdx = idx;
    _rhModalMonth = _rhCurrentMonth; // start with page's current month
    _rhRenderTaskModal();
}

async function _rhRenderTaskModal() {
    const idx = _rhModalTaskIdx;
    const g = _rhTaskGroups[idx];
    if (!g) return;

    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    if (!overlay || !titleEl || !body) return;

    // Make modal wider for this page
    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) modalContainer.style.maxWidth = '800px';

    const c = _rhGetColor(g.task_name);
    const [year, mon] = _rhModalMonth.split('-').map(Number);

    // If modal month differs from page month, fetch that month's data
    let data = _rhData;
    if (_rhModalMonth !== (_rhData.month || _rhCurrentMonth)) {
        // Show loading in modal body
        titleEl.innerHTML = `<span style="background:${c.badge};color:white;padding:2px 8px;border-radius:6px;font-size:12px;margin-right:8px;">${g.points}đ</span> ${g.task_name}`;
        body.innerHTML = '<div style="padding:40px;text-align:center;color:#9ca3af;">⏳ Đang tải...</div>';
        footer.innerHTML = '';
        overlay.classList.add('show');
        try {
            data = await apiCall(`/api/report-history/user/${_rhSelectedUser.id}?month=${_rhModalMonth}`);
        } catch(e) {
            body.innerHTML = `<div style="padding:40px;text-align:center;color:#dc2626;">❌ Lỗi tải dữ liệu</div>`;
            footer.innerHTML = `<button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
            return;
        }
    }

    const { reports = [], snapshots = [], holidays = [] } = data;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const lastDay = new Date(year, mon, 0).getDate();
    const holidaySet = new Set(holidays.map(h => h.holiday_date));

    const workingDays = [];
    for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${_rhModalMonth}-${String(d).padStart(2, '0')}`;
        const dateObj = new Date(year, mon - 1, d);
        const dayOfWeek = dateObj.getDay();
        if (holidaySet.has(dateStr)) continue;
        if (dateStr > todayStr) continue;
        workingDays.push({ dateStr, dayOfWeek, dayNum: d });
    }

    // Rebuild report map for this month
    const modalReportMap = {};
    reports.forEach(r => { modalReportMap[`${r.template_id}_${r.report_date}`] = r; });

    // Filter entries for this task name in this month's snapshots
    const modalEntries = snapshots
        .filter(s => s.task_name === g.task_name)
        .map(s => ({ dateStr: s.snapshot_date_str || s.snapshot_date, template_id: s.template_id, time_start: s.time_start, time_end: s.time_end }))
        .filter(e => workingDays.some(w => w.dateStr === e.dateStr))
        .sort((a, b) => a.dateStr.localeCompare(b.dateStr) || (a.time_start || '').localeCompare(b.time_start || ''));

    // Stats
    let completed = 0, missed = 0, pending = 0, pts = 0;
    modalEntries.forEach(e => {
        const report = modalReportMap[`${e.template_id}_${e.dateStr}`];
        if (report) {
            if (report.status === 'approved') { completed++; pts += (report.points_earned || 0); }
            else if (report.status === 'pending') { pending++; }
            else { missed++; }
        } else if (e.dateStr < todayStr) { missed++; }
    });
    const total = modalEntries.length;
    const rate = total > 0 ? Math.round(completed / total * 100) : 0;

    // Rows
    let rows = '';
    modalEntries.forEach(e => {
        const wd = workingDays.find(w => w.dateStr === e.dateStr);
        if (!wd) return;
        const dayLabel = _RH_DAY_NAMES[wd.dayOfWeek];
        const dateDisplay = `${String(wd.dayNum).padStart(2, '0')}/${String(mon).padStart(2, '0')}`;
        const timeSlot = `${e.time_start || '??'} — ${e.time_end || '??'}`;

        const report = modalReportMap[`${e.template_id}_${e.dateStr}`];
        let statusHtml, detailBtn;
        if (report) {
            const st = _RH_STATUS[report.status] || _RH_STATUS.missed;
            const pointsText = report.status === 'approved' ? ` +${report.points_earned}đ` : '';
            statusHtml = `<span style="background:${st.bg};color:${st.color};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap;">${st.icon} ${st.label}${pointsText}</span>`;
            detailBtn = `<button onclick="event.stopPropagation();_rhShowDetail(${report.id})" style="padding:4px 10px;font-size:11px;border:1px solid #d1d5db;border-radius:5px;background:white;color:#374151;cursor:pointer;font-weight:500;">👁️ Xem</button>`;
        } else if (e.dateStr < todayStr) {
            const st = _RH_STATUS.missed;
            statusHtml = `<span style="background:${st.bg};color:${st.color};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">${st.icon} ${st.label}</span>`;
            detailBtn = '<span style="color:#d1d5db;">—</span>';
        } else {
            statusHtml = '<span style="background:#f3f4f6;color:#9ca3af;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">🔒 Sắp tới</span>';
            detailBtn = '<span style="color:#d1d5db;">—</span>';
        }

        rows += `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 12px;font-size:12px;color:#374151;white-space:nowrap;">${dateDisplay} <span style="color:#9ca3af;font-size:10px;">${dayLabel}</span></td>
            <td style="padding:8px 12px;font-size:11px;color:#6b7280;white-space:nowrap;">⏰ ${timeSlot}</td>
            <td style="padding:8px 12px;text-align:center;">${statusHtml}</td>
            <td style="padding:8px 12px;text-align:center;">${detailBtn}</td>
        </tr>`;
    });

    const contentHtml = `
    <div style="padding:16px 20px;">
        <!-- Month picker inside modal -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:8px;">
                <button onclick="_rhModalPrevMonth()" style="padding:4px 10px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;">◀</button>
                <span style="font-weight:700;color:#1e293b;font-size:14px;">${_RH_MONTH_NAMES[mon]} ${year}</span>
                <button onclick="_rhModalNextMonth()" style="padding:4px 10px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;">▶</button>
            </div>
            <input type="month" value="${_rhModalMonth}" onchange="_rhModalChangeMonth(this.value)" style="padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:#374151;background:white;cursor:pointer;" />
        </div>
        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
            <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#1e40af;">${total}</div>
                <div style="font-size:10px;color:#3b82f6;font-weight:600;">Tổng</div>
            </div>
            <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #6ee7b7;border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#059669;">${completed} <span style="font-size:12px;color:#10b981;">(${rate}%)</span></div>
                <div style="font-size:10px;color:#059669;font-weight:600;">Đạt</div>
            </div>
            <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fdba74;border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#ea580c;">${pts}đ</div>
                <div style="font-size:10px;color:#ea580c;font-weight:600;">Điểm</div>
            </div>
            <div style="background:linear-gradient(135deg,#fef2f2,#fecaca);border:1px solid #fca5a5;border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:800;color:#dc2626;">${missed}</div>
                <div style="font-size:10px;color:#dc2626;font-weight:600;">Bỏ lỡ</div>
            </div>
        </div>
        <!-- Task info -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#475569;">
            <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
                <span>📊 Điểm: <b style="color:#1e293b;">${g.points}đ</b></span>
                <span>📋 SL tối thiểu: <b style="color:#1e293b;">≥${g.min_quantity} lần</b></span>
                ${g.requires_approval ? '<span>🔒 <b style="color:#d97706;">Cần duyệt</b></span>' : ''}
                ${g.guide_url ? `<a href="${g.guide_url}" target="_blank" style="color:#2563eb;text-decoration:none;">📎 Hướng dẫn CV →</a>` : ''}
            </div>
            ${g.input_requirements ? `<div style="margin-top:6px;">🔽 <b>Yêu cầu đầu vào:</b> ${g.input_requirements}</div>` : ''}
            ${g.output_requirements ? `<div style="margin-top:4px;">🔼 <b>Yêu cầu đầu ra:</b> ${g.output_requirements}</div>` : ''}
        </div>
        <!-- Table -->
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#f8fafc;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Ngày</th>
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Khung Giờ</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;">Trạng Thái</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;width:90px;">Chi Tiết</th>
                </tr></thead>
                <tbody>${rows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;font-size:12px;">Chưa có dữ liệu trong tháng này</td></tr>'}</tbody>
            </table>
        </div>
    </div>`;

    titleEl.innerHTML = `<span style="background:${c.badge};color:white;padding:2px 8px;border-radius:6px;font-size:12px;margin-right:8px;">${g.points}đ</span> ${g.task_name}`;
    body.innerHTML = contentHtml;
    footer.innerHTML = `<button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
    overlay.classList.add('show');
}

// Month navigation inside modal
function _rhModalPrevMonth() {
    const [y, m] = _rhModalMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    _rhModalMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    _rhRenderTaskModal();
}
function _rhModalNextMonth() {
    const [y, m] = _rhModalMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    _rhModalMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    _rhRenderTaskModal();
}
function _rhModalChangeMonth(val) {
    if (!val) return;
    _rhModalMonth = val;
    _rhRenderTaskModal();
}

// ========== LOCK TASK MODAL ==========
function _rhOpenLockModal(idx) {
    _rhLockModalIdx = idx;
    _rhModalMonth = _rhCurrentMonth;
    _rhRenderLockModal();
}

async function _rhRenderLockModal() {
    const idx = _rhLockModalIdx;
    const g = _rhLockGroups[idx];
    if (!g) return;

    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const footer = document.getElementById('modalFooter');
    if (!overlay || !titleEl || !body) return;

    const modalContainer = document.getElementById('modalContainer');
    if (modalContainer) modalContainer.style.maxWidth = '800px';

    const [year, mon] = _rhModalMonth.split('-').map(Number);

    // If modal month differs, fetch that month's data
    let completions = g.completions;
    if (_rhModalMonth !== (_rhData.month || _rhCurrentMonth)) {
        titleEl.innerHTML = `<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:6px;font-size:12px;margin-right:8px;">🔐</span> ${g.task_name}`;
        body.innerHTML = '<div style="padding:40px;text-align:center;color:#9ca3af;">⏳ Đang tải...</div>';
        footer.innerHTML = '';
        overlay.classList.add('show');
        try {
            const data = await apiCall(`/api/report-history/user/${_rhSelectedUser.id}?month=${_rhModalMonth}`);
            completions = (data.lock_completions || []).filter(lc => lc.task_name === g.task_name);
        } catch(e) {
            body.innerHTML = '<div style="padding:40px;text-align:center;color:#dc2626;">❌ Lỗi tải dữ liệu</div>';
            footer.innerHTML = `<button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
            return;
        }
    }

    // Stats
    const total = completions.length;
    const approved = completions.filter(c => c.status === 'approved').length;
    const pending = completions.filter(c => c.status === 'pending').length;
    const rejected = completions.filter(c => c.status === 'rejected').length;
    const rate = total > 0 ? Math.round(approved / total * 100) : 0;

    // Rows
    let rows = '';
    completions.sort((a, b) => a.completion_date.localeCompare(b.completion_date)).forEach((c, ci) => {
        const dateF = c.completion_date.split('-').reverse().join('/');
        const st = _RH_STATUS[c.status] || _RH_STATUS.pending;
        const statusHtml = `<span style="background:${st.bg};color:${st.color};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap;">${st.icon} ${st.label}</span>`;
        const detailBtn = `<button onclick="event.stopPropagation();_rhShowLockDetail(${idx},${ci})" style="padding:4px 10px;font-size:11px;border:1px solid #d1d5db;border-radius:5px;background:white;color:#374151;cursor:pointer;font-weight:500;">👁️ Xem</button>`;

        rows += `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 12px;font-size:12px;color:#374151;white-space:nowrap;">${dateF}</td>
            <td style="padding:8px 12px;text-align:center;">${statusHtml}</td>
            <td style="padding:8px 12px;text-align:center;">${detailBtn}</td>
        </tr>`;
    });

    const contentHtml = `
    <div style="padding:16px 20px;">
        <!-- Month picker inside modal -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:8px;">
                <button onclick="_rhLockModalPrev()" style="padding:4px 10px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;">◀</button>
                <span style="font-weight:700;color:#1e293b;font-size:14px;">${_RH_MONTH_NAMES[mon]} ${year}</span>
                <button onclick="_rhLockModalNext()" style="padding:4px 10px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;">▶</button>
            </div>
            <input type="month" value="${_rhModalMonth}" onchange="_rhLockModalChange(this.value)" style="padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;color:#374151;background:white;cursor:pointer;" />
        </div>
        <!-- Stats -->
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
        <!-- Task info -->
        <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px;color:#7f1d1d;">
            <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
                <span>🔐 <b>CV Khóa</b></span>
                ${g.requires_approval ? '<span>🔒 <b style="color:#d97706;">Cần duyệt</b></span>' : ''}
                ${g.guide_link ? `<a href="${g.guide_link}" target="_blank" style="color:#2563eb;text-decoration:none;">📎 Hướng dẫn CV →</a>` : ''}
            </div>
        </div>
        <!-- Table -->
        <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#fef2f2;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;border-bottom:2px solid #fecaca;">Ngày</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;border-bottom:2px solid #fecaca;">Trạng Thái</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;border-bottom:2px solid #fecaca;width:90px;">Chi Tiết</th>
                </tr></thead>
                <tbody>${rows || '<tr><td colspan="3" style="padding:20px;text-align:center;color:#9ca3af;font-size:12px;">Chưa có báo cáo trong tháng này</td></tr>'}</tbody>
            </table>
        </div>
    </div>`;

    titleEl.innerHTML = `<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:6px;font-size:12px;margin-right:8px;">🔐</span> ${g.task_name}`;
    body.innerHTML = contentHtml;
    footer.innerHTML = `<button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
    overlay.classList.add('show');
}

function _rhLockModalPrev() {
    const [y, m] = _rhModalMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    _rhModalMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    _rhRenderLockModal();
}
function _rhLockModalNext() {
    const [y, m] = _rhModalMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    _rhModalMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    _rhRenderLockModal();
}
function _rhLockModalChange(val) {
    if (!val) return;
    _rhModalMonth = val;
    _rhRenderLockModal();
}

// ========== REPORT DETAIL (rich view with BACK button) ==========
function _rhShowDetail(reportId) {
    // Find report in current data or fetch
    const allReports = _rhData ? _rhData.reports : [];
    const report = allReports.find(r => r.id === reportId);
    if (!report) return;

    const st = _RH_STATUS[report.status] || _RH_STATUS.missed;
    const taskName = report.template_task_name || report.task_name || 'Công việc';
    const c = _rhGetColor(taskName);

    // Merge data: report template join + task group snapshot data (fallback)
    const tg = _rhTaskGroups.find(g => g.task_name === taskName) || {};
    const guideUrl = report.template_guide_url || tg.guide_url || '';
    const inputReqs = report.template_input_requirements || tg.input_requirements || '';
    const outputReqs = report.template_output_requirements || tg.output_requirements || '';
    const minQty = report.template_min_quantity || tg.min_quantity || 0;
    const timeStart = report.template_time_start || '';
    const timeEnd = report.template_time_end || '';
    const reqApproval = report.template_requires_approval || tg.requires_approval || false;
    const pts = report.template_points || tg.points || report.points_earned || 0;

    // Parse requirements (try JSON array or plain text)
    const parseReqs = (val) => {
        if (!val) return '';
        try {
            const arr = JSON.parse(val);
            if (Array.isArray(arr)) return arr.map((r, i) => `<div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0;"><span style="background:#e0e7ff;color:#4f46e5;padding:1px 7px;border-radius:50%;font-size:10px;font-weight:700;">${i + 1}</span> <span>${r}</span></div>`).join('');
        } catch (e) {}
        return `<div>${val}</div>`;
    };

    let contentHtml = `
    <div style="padding:20px;">
        <!-- Task info header -->
        <div style="background:${c.bg};border:1px solid ${c.border};border-left:4px solid ${c.badge};border-radius:10px;padding:14px 16px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="font-weight:700;color:${c.text};font-size:16px;">${taskName}</div>
                <span style="background:${st.bg};color:${st.color};padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700;">${st.icon} ${st.label}${report.status === 'approved' ? ' +' + report.points_earned + 'đ' : ''}</span>
            </div>
            <!-- Prominent stats row -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                <div style="background:white;border:1px solid ${c.border};border-radius:8px;padding:6px 14px;display:flex;align-items:center;gap:6px;">
                    <span style="font-size:14px;">📅</span>
                    <span style="font-size:12px;color:#374151;font-weight:600;">${_rhFormatDate(report.report_date)}</span>
                </div>
                ${timeStart ? `<div style="background:white;border:1px solid ${c.border};border-radius:8px;padding:6px 14px;display:flex;align-items:center;gap:6px;">
                    <span style="font-size:14px;">⏰</span>
                    <span style="font-size:12px;color:#374151;font-weight:600;">${timeStart} — ${timeEnd || '??'}</span>
                </div>` : ''}
                <div style="background:linear-gradient(135deg,#059669,#10b981);border-radius:8px;padding:6px 14px;display:flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(5,150,105,0.3);">
                    <span style="font-size:14px;">🏆</span>
                    <span style="font-size:14px;color:white;font-weight:800;">${pts}đ</span>
                </div>
                ${minQty ? `<div style="background:linear-gradient(135deg,#2563eb,#3b82f6);border-radius:8px;padding:6px 14px;display:flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(37,99,235,0.3);">
                    <span style="font-size:14px;">📋</span>
                    <span style="font-size:14px;color:white;font-weight:800;">≥${minQty} lần</span>
                </div>` : ''}
                ${reqApproval ? `<div style="background:linear-gradient(135deg,#d97706,#f59e0b);border-radius:8px;padding:6px 14px;display:flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(217,119,6,0.3);">
                    <span style="font-size:14px;">🔒</span>
                    <span style="font-size:12px;color:white;font-weight:700;">Cần duyệt</span>
                </div>` : ''}
            </div>
        </div>

        <!-- Guide URL -->
        ${guideUrl ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">📎</span>
            <div>
                <div style="font-size:11px;color:#6b7280;font-weight:600;">Hướng dẫn công việc:</div>
                <a href="${guideUrl}" target="_blank" style="color:#2563eb;font-size:12px;word-break:break-all;">${guideUrl}</a>
            </div>
        </div>` : ''}

        <!-- Requirements -->
        ${inputReqs ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-bottom:12px;">
            <div style="font-size:11px;color:#166534;font-weight:700;margin-bottom:6px;">🔽 Yêu cầu đầu vào</div>
            <div style="font-size:12px;color:#374151;">${parseReqs(inputReqs)}</div>
        </div>` : ''}
        ${outputReqs ? `<div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:12px;">
            <div style="font-size:11px;color:#854d0e;font-weight:700;margin-bottom:6px;">🔼 Yêu cầu đầu ra</div>
            <div style="font-size:12px;color:#374151;">${parseReqs(outputReqs)}</div>
        </div>` : ''}

        <!-- ===== REPORT CONTENT SECTION ===== -->
        <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-top:16px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:10px 16px;display:flex;align-items:center;gap:8px;">
                <span style="font-size:15px;">📝</span>
                <span style="color:white;font-size:13px;font-weight:700;letter-spacing:0.5px;">NỘI DUNG BÁO CÁO NHÂN VIÊN</span>
            </div>
            <div style="padding:16px;">
                ${report.report_value ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:10px;">
                    <div style="font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">📎 Link báo cáo</div>
                    <a href="${report.report_value}" target="_blank" style="color:#2563eb;font-size:13px;word-break:break-all;font-weight:500;">${report.report_value}</a>
                </div>` : ''}

                ${report.report_image ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:10px;">
                    <div style="font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">🖼️ Hình ảnh minh chứng</div>
                    <img src="${report.report_image}" style="max-width:100%;max-height:300px;border-radius:8px;border:1px solid #e5e7eb;cursor:pointer;" onclick="window.open('${report.report_image}','_blank')" />
                </div>` : ''}

                ${report.content ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:10px;">
                    <div style="font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">📝 Nội dung báo cáo</div>
                    <div style="font-size:13px;color:#1e293b;line-height:1.6;white-space:pre-wrap;">${report.content}</div>
                </div>` : ''}

                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    ${report.quantity ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;flex:1;min-width:120px;">
                        <div style="font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">📊 Số lượng đã làm</div>
                        <div style="font-size:22px;font-weight:800;color:#1e40af;">${report.quantity} <span style="font-size:13px;color:#6b7280;font-weight:500;">lần</span></div>
                        ${minQty ? `<div style="font-size:10px;color:${report.quantity >= minQty ? '#059669' : '#dc2626'};font-weight:600;margin-top:2px;">${report.quantity >= minQty ? '✅ Đạt yêu cầu' : '⚠️ Chưa đạt'} (yêu cầu ≥${minQty})</div>` : ''}
                    </div>` : ''}
                    ${report.points_earned ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;flex:1;min-width:120px;">
                        <div style="font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">🏆 Điểm nhận được</div>
                        <div style="font-size:22px;font-weight:800;color:#059669;">${report.points_earned}<span style="font-size:13px;">đ</span></div>
                    </div>` : ''}
                </div>

                ${report.reject_reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;margin-top:10px;">
                    <div style="font-size:10px;color:#dc2626;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">❌ Lý do từ chối</div>
                    <div style="font-size:13px;color:#dc2626;line-height:1.5;">${report.reject_reason}</div>
                </div>` : ''}

                ${report.redo_count > 0 ? `<div style="margin-top:8px;font-size:11px;color:#6b7280;text-align:right;">🔄 Đã nộp lại: <b>${report.redo_count}</b> lần</div>` : ''}

                ${!report.report_value && !report.report_image && !report.content && !report.quantity ? `<div style="text-align:center;color:#9ca3af;font-size:13px;padding:24px;">
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
            <button class="btn btn-secondary" onclick="_rhBackToTaskModal()" style="margin-right:auto;">← Quay lại</button>
            <button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
        overlay.classList.add('show');
    }
}

// Back from detail view to task history modal
function _rhBackToTaskModal() {
    if (_rhModalTaskIdx !== null) {
        _rhRenderTaskModal();
    }
}

// Back from lock detail to lock task modal
function _rhBackToLockModal() {
    if (_rhLockModalIdx !== null) {
        _rhRenderLockModal();
    }
}

// ========== LOCK TASK REPORT DETAIL ==========
function _rhShowLockDetail(groupIdx, completionIdx) {
    const g = _rhLockGroups[groupIdx];
    if (!g) return;
    const c_item = g.completions.sort((a, b) => a.completion_date.localeCompare(b.completion_date))[completionIdx];
    if (!c_item) return;

    const st = _RH_STATUS[c_item.status] || _RH_STATUS.pending;
    const dateF = _rhFormatDate(c_item.completion_date);

    // Parse requirements
    const parseReqs = (val) => {
        if (!val) return '';
        try {
            const arr = JSON.parse(val);
            if (Array.isArray(arr)) return arr.map((r, i) => `<div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0;"><span style="background:#e0e7ff;color:#4f46e5;padding:1px 7px;border-radius:50%;font-size:10px;font-weight:700;">${i + 1}</span> <span>${r}</span></div>`).join('');
        } catch (e) {}
        return `<div>${val}</div>`;
    };

    // Get lock task detail for requirements
    const lockTask = (_rhData.lock_tasks || []).find(lt => lt.id === g.lock_task_id || lt.task_name === g.task_name) || {};
    const guideLink = lockTask.guide_link || g.guide_link || '';
    const inputReqs = lockTask.input_requirements || '';
    const outputReqs = lockTask.output_requirements || '';

    let contentHtml = `
    <div style="padding:20px;">
        <!-- Task info header -->
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
                ${g.requires_approval ? `<div style="background:linear-gradient(135deg,#d97706,#f59e0b);border-radius:8px;padding:6px 14px;display:flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(217,119,6,0.3);">
                    <span style="font-size:14px;">🔒</span>
                    <span style="font-size:12px;color:white;font-weight:700;">Cần duyệt</span>
                </div>` : ''}
            </div>
        </div>

        <!-- Guide URL -->
        ${guideLink ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">📎</span>
            <div>
                <div style="font-size:11px;color:#6b7280;font-weight:600;">Hướng dẫn công việc:</div>
                <a href="${guideLink}" target="_blank" style="color:#2563eb;font-size:12px;word-break:break-all;">${guideLink}</a>
            </div>
        </div>` : ''}

        <!-- Requirements -->
        ${inputReqs ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-bottom:12px;">
            <div style="font-size:11px;color:#166534;font-weight:700;margin-bottom:6px;">🔽 Yêu cầu đầu vào</div>
            <div style="font-size:12px;color:#374151;">${parseReqs(inputReqs)}</div>
        </div>` : ''}
        ${outputReqs ? `<div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:12px;">
            <div style="font-size:11px;color:#854d0e;font-weight:700;margin-bottom:6px;">🔼 Yêu cầu đầu ra</div>
            <div style="font-size:12px;color:#374151;">${parseReqs(outputReqs)}</div>
        </div>` : ''}

        <!-- Report content -->
        <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-top:16px;">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:10px 16px;display:flex;align-items:center;gap:8px;">
                <span style="font-size:15px;">📝</span>
                <span style="color:white;font-size:13px;font-weight:700;letter-spacing:0.5px;">NỘI DUNG BÁO CÁO NHÂN VIÊN</span>
            </div>
            <div style="padding:16px;">
                ${c_item.proof_url ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:10px;">
                    <div style="font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">📎 Link báo cáo</div>
                    <a href="${c_item.proof_url}" target="_blank" style="color:#2563eb;font-size:13px;word-break:break-all;font-weight:500;">${c_item.proof_url}</a>
                </div>` : ''}

                ${c_item.content ? `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:10px;">
                    <div style="font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">📝 Nội dung báo cáo</div>
                    <div style="font-size:13px;color:#1e293b;line-height:1.6;white-space:pre-wrap;">${c_item.content}</div>
                </div>` : ''}

                ${c_item.reject_reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;margin-top:10px;">
                    <div style="font-size:10px;color:#dc2626;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">❌ Lý do từ chối</div>
                    <div style="font-size:13px;color:#dc2626;line-height:1.5;">${c_item.reject_reason}</div>
                </div>` : ''}

                ${c_item.redo_count > 0 ? `<div style="margin-top:8px;font-size:11px;color:#6b7280;text-align:right;">🔄 Đã nộp lại: <b>${c_item.redo_count}</b> lần</div>` : ''}

                ${!c_item.proof_url && !c_item.content ? `<div style="text-align:center;color:#9ca3af;font-size:13px;padding:24px;">
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
            <button class="btn btn-secondary" onclick="_rhBackToLockModal()" style="margin-right:auto;">← Quay lại</button>
            <button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('show')">Đóng</button>`;
        overlay.classList.add('show');
    }
}

function _rhOnYearChange(val) {
    _rhYear = Number(val);
    _rhSaveState();
    _rhLoadHistory();
}
function _rhOnFromChange(val) {
    _rhFromMonth = Number(val);
    if (_rhFromMonth === 0) _rhToMonth = 0;
    else if (_rhToMonth && _rhToMonth < _rhFromMonth) _rhToMonth = 0;
    _rhSaveState();
    _rhLoadHistory();
}
function _rhOnToChange(val) {
    _rhToMonth = Number(val);
    _rhSaveState();
    _rhLoadHistory();
}
function _rhSaveState() {
    try {
        sessionStorage.setItem('_rh_state', JSON.stringify({
            userId: _rhSelectedUser?.id,
            userName: _rhSelectedUser?.name,
            year: _rhYear,
            fromMonth: _rhFromMonth,
            toMonth: _rhToMonth
        }));
    } catch(e) {}
}

function _rhFilterSidebar() {
    const q = (document.getElementById('rhSearchInput')?.value || '').toLowerCase().trim();
    const deptList = document.getElementById('rhDeptList');
    if (!deptList) return;

    _rhActiveDepts.forEach(d => {
        const header = deptList.querySelector(`.rh-dept-header[data-dept-id="${d.id}"]`);
        const membersWrap = document.getElementById(`rhMembers_${d.id}`);
        if (!header || !membersWrap) return;

        if (!q) {
            header.style.display = 'flex';
            membersWrap.style.display = _rhExpandedDepts.has(d.id) ? 'block' : 'none';
            return;
        }

        const members = _rhTeamMembers.filter(m => m.dept_name === d.name);
        const hasMatch = members.some(m => (m.full_name || '').toLowerCase().includes(q));
        const deptMatch = d.name.toLowerCase().includes(q);

        header.style.display = (hasMatch || deptMatch) ? 'flex' : 'none';
        if (hasMatch) {
            membersWrap.style.display = 'block';
            membersWrap.querySelectorAll('div[onclick]').forEach(el => {
                const name = el.textContent.toLowerCase();
                el.style.display = name.includes(q) ? 'flex' : 'none';
            });
        } else {
            membersWrap.style.display = deptMatch ? 'block' : 'none';
        }
    });
}

function _rhFormatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
