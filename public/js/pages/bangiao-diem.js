// ========== BÀN GIAO CV ĐIỂM — Task Point Templates ==========
const DAY_NAMES = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
function _tpLinkify(t) { return t ? String(t).replace(/(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" style="color:#2563eb;text-decoration:underline;word-break:break-all;" onclick="event.stopPropagation()">$1</a>') : ''; }
let _tpTasks = [];
let _tpTarget = { type: 'team', id: null };
let _tpAllDepts = [];
let _tpActiveDeptIds = [];
let _tpUsers = [];
let _tpIsReadonly = false;
let _tpIsDirector = false; // only giam_doc can manage fixed tasks
let _tpCurrentWeekStart = null;
let _tpHolidayMap = {};
let _tpViewMode = 'team'; // 'team' | 'individual'
let _tpViewUserId = null;
let _tpViewUserName = '';
let _tpViewDeptName = '';

// ===== SELECTION PERSISTENCE (per user, localStorage) =====
function _tpSaveSelection(sel) {
    try {
        const key = `tp_selection_${window._currentUser?.id || 'default'}`;
        localStorage.setItem(key, JSON.stringify(sel));
    } catch {}
}
function _tpGetSavedSelection() {
    try {
        const key = `tp_selection_${window._currentUser?.id || 'default'}`;
        return JSON.parse(localStorage.getItem(key));
    } catch { return null; }
}

// ===== REMOVE DEPT from sidebar (deactivate via API) =====
async function _tpRemoveDept(deptId, event) {
    if (event) event.stopPropagation();
    const dept = _tpAllDepts.find(d => d.id === deptId);
    const name = dept?.name || 'phòng này';
    if (!confirm(`Xóa ${name} khỏi sidebar?\nDữ liệu công việc vẫn được giữ nguyên.\nCó thể thêm lại bất cứ lúc nào.`)) return;
    try {
        await apiCall('/api/task-points/deactivate-team', 'POST', { team_id: deptId });
        // Also remove child teams
        const children = _tpAllDepts.filter(d => d.parent_id === deptId);
        for (const child of children) {
            await apiCall('/api/task-points/deactivate-team', 'POST', { team_id: child.id });
            _tpActiveDeptIds = _tpActiveDeptIds.filter(id => id !== child.id);
        }
        _tpActiveDeptIds = _tpActiveDeptIds.filter(id => id !== deptId);
        _tpCachedActiveDepts = _tpCachedActiveDepts.filter(d => d.id !== deptId && d.parent_id !== deptId);
        _tpRebuildSidebar();
        // Select first remaining dept
        if (_tpCachedActiveDepts.length > 0) {
            _tpSelectDept(_tpCachedActiveDepts[0].id);
        }
        showToast(`✅ Đã xóa ${name} khỏi sidebar`);
    } catch(e) {
        showToast('Lỗi: ' + (e.message || 'Không thể xóa'), 'error');
    }
}
let _tpCachedActiveDepts = []; // cached for rebuild
let _tpAllApprovers = []; // all approvers across depts
function _tpRebuildSidebar() {
    const list = document.getElementById('tpDeptList');
    if (!list) return;
    list.innerHTML = _tpBuildDeptListHtml();
}
function _tpBuildDeptListHtml() {
    const activeSet = new Set(_tpActiveDeptIds);
    const systemDepts = _tpAllDepts.filter(d => d.name.startsWith('HỆ THỐNG'));
    const nonSystemDepts = _tpAllDepts.filter(d => !d.name.startsWith('HỆ THỐNG'));
    let html = '';
    systemDepts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    systemDepts.forEach(sys => {
        let childDepts = nonSystemDepts.filter(d => d.parent_id === sys.id && activeSet.has(d.id));
        childDepts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        const hasSysApprovers = _tpAllApprovers.some(a => a.department_id === sys.id);
        if (childDepts.length === 0 && !hasSysApprovers) return;
        html += `<div class="tp-system-header" data-sys-id="${sys.id}" onclick="_tpToggleSystem(${sys.id})" style="padding:10px 14px;font-size:13px;font-weight:900;color:#fff;text-transform:uppercase;background:linear-gradient(135deg,#0f172a,#1e3a5f);border-bottom:2px solid #0f172a;margin-top:6px;box-shadow:0 3px 10px rgba(15,23,42,0.35);border-radius:8px;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;cursor:pointer;"><span style="font-size:15px;">🏛️</span><span style="flex:1;">${sys.name}</span><span class="tp-sys-arrow" style="font-size:10px;opacity:0.7;">▼</span></div>`;
        html += `<div class="tp-sys-content" data-sys-id="${sys.id}">`;
        // System-level approvers (quản lý cấp cao)
        const sysApprovers = _tpAllApprovers.filter(a => a.department_id === sys.id);
        sysApprovers.forEach(a => {
            html += `<div class="tp-member-item" data-uid="${a.user_id}" data-name="${(a.full_name||'').toLowerCase()}" data-uname="${(a.username||'').toLowerCase()}"
                 onclick="_tpSelectMember(${sys.id},${a.user_id},'${(a.full_name||'').replace(/'/g,"\\'")}')"
                 style="padding:8px 14px 8px 18px;font-size:13px;color:#1e293b;cursor:pointer;transition:all .12s;border-left:3px solid transparent;display:flex;align-items:center;gap:8px;background:white;"
                 onmouseover="if(!this.classList.contains('tp-member-active'))this.style.background='#f8fafc'"
                 onmouseout="if(!this.classList.contains('tp-member-active'))this.style.background='white'">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.full_name}</div>
                    <div style="font-size:10px;color:#d97706;font-weight:700;margin-top:1px;">⭐ Quản lý cấp cao</div>
                </div>
            </div>`;
        });
        let parentStt = 0, childStt = 0;
        childDepts.forEach(d => {
            const isChild = childDepts.some(p => p.id === d.parent_id);
            const subTeams = nonSystemDepts.filter(sub => sub.parent_id === d.id && activeSet.has(sub.id))
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            if (!isChild) { parentStt++; childStt = 0; }
            const sttLabel = !isChild
                ? `<span style="color:#0f172a;font-size:12px;font-weight:900;margin-right:5px;background:rgba(255,255,255,0.85);padding:1px 6px;border-radius:4px;">${parentStt}.</span>`
                : `<span style="color:#1e3a5f;font-size:11px;font-weight:800;margin-right:3px;">${++childStt}.</span>`;
            html += `<div class="tp-dept-item tp-dept-header" data-id="${d.id}" data-key="team-${d.id}" data-type="team" onclick="_tpSelectDept(${d.id})" style="display:flex;align-items:center;gap:6px;padding:${isChild ? '7px 14px 7px 28px' : '10px 14px'};font-size:${isChild ? '11px' : '13px'};color:${isChild ? '#475569' : '#fff'};cursor:pointer;border-bottom:${isChild ? '1px solid #e2e8f0' : '2px solid #1e40af'};transition:all .2s;font-weight:900;text-transform:uppercase;letter-spacing:${isChild ? '0.3px' : '0.5px'};background:${isChild ? 'linear-gradient(135deg,#f1f5f9,#e8eef5)' : 'linear-gradient(135deg,#1e3a5f,#2563eb)'};${!isChild ? 'margin-top:4px;box-shadow:0 2px 8px rgba(37,99,235,0.25);border-radius:6px;' : 'border-left:3px solid #93c5fd;'}">${sttLabel}${isChild ? '<span style="color:#94a3b8;">└</span> ' : '<span style="font-size:14px;">🏢</span> '}<span style="flex:1;">${d.name}</span>${!isChild ? '<span style="font-size:10px;opacity:0.7;">▶</span>' : ''}</div><div id="tpMemberWrap_${d.id}" style="display:none;"></div>`;
            subTeams.forEach(sub => {
                childStt++;
                html += `<div class="tp-dept-item tp-dept-header" data-id="${sub.id}" data-key="team-${sub.id}" data-type="team" onclick="_tpSelectDept(${sub.id})" style="display:flex;align-items:center;gap:6px;padding:7px 14px 7px 28px;font-size:11px;color:#475569;cursor:pointer;border-bottom:1px solid #e2e8f0;transition:all .2s;font-weight:900;text-transform:uppercase;letter-spacing:0.3px;background:linear-gradient(135deg,#f1f5f9,#e8eef5);border-left:3px solid #93c5fd;"><span style="color:#1e3a5f;font-size:11px;font-weight:800;margin-right:3px;">${childStt}.</span><span style="color:#94a3b8;">└</span> <span style="flex:1;">${sub.name}</span></div><div id="tpMemberWrap_${sub.id}" style="display:none;"></div>`;
            });
        });
        html += `</div>`;
    });
    return html;
}
function _tpToggleSystem(sysId) {
    const content = document.querySelector(`.tp-sys-content[data-sys-id="${sysId}"]`);
    const header = document.querySelector(`.tp-system-header[data-sys-id="${sysId}"]`);
    if (!content) return;
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    const arrow = header?.querySelector('.tp-sys-arrow');
    if (arrow) arrow.textContent = isHidden ? '▼' : '▶';
}
let _tpDeptMembers = []; // members of currently selected dept
const _tpColorPalette = [
    { bg:'#eff6ff', border:'#bfdbfe', badge:'#1d4ed8', text:'#1e3a5f', tag:'#dbeafe' },
    { bg:'#ecfdf5', border:'#a7f3d0', badge:'#059669', text:'#064e3b', tag:'#d1fae5' },
    { bg:'#fffbeb', border:'#fde68a', badge:'#d97706', text:'#78350f', tag:'#fef3c7' },
    { bg:'#f5f3ff', border:'#c4b5fd', badge:'#7c3aed', text:'#4c1d95', tag:'#ede9fe' },
    { bg:'#fff1f2', border:'#fecdd3', badge:'#e11d48', text:'#881337', tag:'#ffe4e6' },
    { bg:'#f0fdfa', border:'#99f6e4', badge:'#0d9488', text:'#134e4a', tag:'#ccfbf1' },
    { bg:'#fff7ed', border:'#fed7aa', badge:'#ea580c', text:'#7c2d12', tag:'#ffedd5' },
    { bg:'#eef2ff', border:'#a5b4fc', badge:'#4f46e5', text:'#312e81', tag:'#e0e7ff' },
    { bg:'#fdf2f8', border:'#f9a8d4', badge:'#db2777', text:'#831843', tag:'#fce7f3' },
    { bg:'#ecfeff', border:'#a5f3fc', badge:'#0891b2', text:'#164e63', tag:'#cffafe' },
];
let _tpTaskColorMap = {};
let _tpExemptedTasks = []; // permanently exempted team tasks

async function renderBanGiaoDiemPage(container) {
    const isManager = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(currentUser.role);
    _tpIsDirector = currentUser.role === 'giam_doc';
    _tpIsReadonly = !isManager;
    _tpCurrentWeekStart = null; // Always reset to current week on page load

    // Load departments
    try {
        const d = await apiCall('/api/task-points/departments');
        const raw = d.departments || [];
        _tpAllDepts = raw.filter(d => !d.name.toUpperCase().includes('AFFILIATE'));
        _tpActiveDeptIds = d.active_dept_ids || [];
        _tpAllApprovers = d.approvers || [];
    } catch(e) { _tpAllDepts = []; _tpActiveDeptIds = []; _tpAllApprovers = []; }

    // Build flat list of active non-system depts for auto-select
    const activeSet = new Set(_tpActiveDeptIds);
    const nonSysDepts = _tpAllDepts.filter(d => !d.name.startsWith('HỆ THỐNG'));
    const activeDepts = nonSysDepts.filter(d => activeSet.has(d.id))
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    _tpCachedActiveDepts = activeDepts;

    container.innerHTML = `
    <div style="margin:0 auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="margin:0;font-size:20px;color:#122546;font-weight:700;">🏪 Bàn Giao CV Điểm</h2>
            ${isManager ? `<div style="display:flex;gap:8px;">
                <button onclick="_tpShowTaskLibrary()" style="padding:7px 16px;border-radius:8px;border:1px solid #2563eb;background:#eff6ff;color:#2563eb;cursor:pointer;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;">📦 Kho Công Việc</button>
                ${currentUser.role === 'giam_doc' ? '<button onclick="_tpShowCloneDialog()" style="padding:7px 16px;border-radius:8px;border:1px solid #059669;background:#ecfdf5;color:#059669;cursor:pointer;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;">📋 Áp dụng từ team khác</button>' : ''}
            </div>` : ''}
        </div>
        <input type="hidden" id="tpTargetType" value="team">
        <select id="tpUserSelect" style="display:none;"><option value=""></option></select>
        <select id="tpDeptSelect" style="display:none;"><option value=""></option></select>

        <div style="display:flex;gap:16px;align-items:flex-start;">
            <!-- LEFT: Dept list -->
            <div style="min-width:230px;max-width:240px;background:white;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.06);flex-shrink:0;overflow-x:hidden;">
                <div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:12px 12px 0 0;">
                    <input type="text" id="tpGlobalSearch" placeholder="🔍 Tìm NV / phòng ban..." 
                           oninput="_tpGlobalFilter()" 
                           style="width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;box-sizing:border-box;color:#1e293b;background:white;outline:none;" 
                           onfocus="this.style.borderColor='#2563eb';this.style.boxShadow='0 0 0 2px rgba(37,99,235,0.1)'" 
                           onblur="this.style.borderColor='#e2e8f0';this.style.boxShadow='none'" />
                </div>
                <div id="tpDeptList" style="max-height:calc(100vh - 250px);overflow-y:auto;">
                    ${_tpBuildDeptListHtml()} 

                </div>
            </div>

            <!-- RIGHT: Grid -->
            <div style="flex:1;min-width:0;">
                <div id="tpGridWrap" style="overflow-x:auto;background:white;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                    <div style="padding:50px;text-align:center;color:#9ca3af;font-size:14px;">
                        <div style="font-size:40px;margin-bottom:12px;">📋</div>
                        ${activeDepts.length > 0 ? 'Chọn phòng ban bên trái để xem lịch' : 'Chưa có phòng ban nào. Ấn <b>＋ Tạo mới</b> để bắt đầu.'}
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // ===== AUTO-SELECT from query params (from "Xem" button in approval panel) =====
    const _tpUrlParams = new URLSearchParams(window.location.search);
    const _tpAutoUserId = _tpUrlParams.get('sel_user') ? Number(_tpUrlParams.get('sel_user')) : null;
    const _tpAutoDate = _tpUrlParams.get('sel_date');
    if (_tpAutoUserId || _tpAutoDate) {
        // Navigate to correct week if date specified
        if (_tpAutoDate) {
            const d = new Date(_tpAutoDate + 'T00:00:00');
            const day = d.getDay();
            const mon = new Date(d);
            mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
            _tpCurrentWeekStart = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate());
        }
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
    }

    // Auto-select (restore from localStorage or default to first dept)
    if (activeDepts.length > 0) {
        // Load members for ALL active depts in parallel instead of sequential
        await Promise.all(activeDepts.map(dept => _tpLoadDeptMembers(dept.id)));
        const saved = _tpAutoUserId ? { type: 'member', userId: _tpAutoUserId } : _tpGetSavedSelection();
        if (saved && saved.type === 'member' && saved.userId) {
            // Find which dept this member belongs to
            const memberEl = document.querySelector(`.tp-member-item[data-uid="${saved.userId}"]`);
            if (memberEl) {
                const deptId = saved.deptId || activeDepts[0].id;
                _tpSelectMember(deptId, saved.userId, saved.userName || '');
            } else {
                _tpSelectDept(activeDepts[0].id);
            }
        } else if (saved && saved.type === 'dept' && saved.deptId) {
            const deptExists = activeDepts.some(d => d.id === saved.deptId);
            _tpSelectDept(deptExists ? saved.deptId : activeDepts[0].id);
        } else {
            _tpSelectDept(activeDepts[0].id);
        }
        // Auto-snapshot today's tasks (idempotent)
        try { apiCall('/api/task-points/snapshot-today', 'POST'); } catch(e) {}
    }
}

// Show modal to create template for dept or individual
function _tpShowCreateDeptModal() {
    const modal = document.createElement('div');
    modal.id = 'tpCreateDeptModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    // Build options: structured by system > dept > team
    const systemDepts = _tpAllDepts.filter(d => d.name.startsWith('HỆ THỐNG'));
    const nonSystemDepts = _tpAllDepts.filter(d => !d.name.startsWith('HỆ THỐNG'));
    let inactiveOpts = '';
    systemDepts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).forEach(sys => {
        const childDepts = nonSystemDepts.filter(d => d.parent_id === sys.id)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        let sysInner = '';
        childDepts.forEach(d => {
            const parentIsActive = _tpActiveDeptIds.includes(d.id);
            const subTeams = nonSystemDepts.filter(sub => sub.parent_id === d.id && !_tpActiveDeptIds.includes(sub.id));
            if (!parentIsActive) {
                sysInner += `<option value="${d.id}">🏢 ${d.name}</option>`;
                subTeams.forEach(sub => { sysInner += `<option value="${sub.id}">  └ ${sub.name}</option>`; });
            } else if (subTeams.length > 0) {
                sysInner += `<optgroup label="🏢 ${d.name}">`;
                subTeams.forEach(sub => { sysInner += `<option value="${sub.id}">${sub.name}</option>`; });
                sysInner += `</optgroup>`;
            }
        });
        if (sysInner) {
            inactiveOpts += `<optgroup label="🏛️ ${sys.name}">${sysInner}</optgroup>`;
        }
    });
    modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:24px;width:min(420px,90vw);border:1px solid #e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0;font-size:16px;color:#122546;">＋ Tạo lịch công việc</h3>
            <button onclick="document.getElementById('tpCreateDeptModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;">×</button>
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Phòng ban / Team <span style="color:#dc2626;">*</span></label>
            <select id="tpNewDeptSelect" onchange="_tpLoadCreateUsers()" style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#122546;box-sizing:border-box;">
                ${inactiveOpts || '<option value="">Tất cả phòng đã được thêm</option>'}
            </select>
        </div>
        <div style="margin-bottom:6px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Nhân viên <span style="color:#9ca3af;font-weight:400;">(không chọn = lịch team)</span></label>
            <select id="tpNewUserSelect" style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;color:#122546;box-sizing:border-box;">
                <option value="">— Toàn bộ Team —</option>
            </select>
            <div style="font-size:11px;color:#9ca3af;margin-top:4px;">💡 Để trống = lịch chung cho cả team. Chọn NV = lịch riêng cho người đó.</div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
            <button onclick="document.getElementById('tpCreateDeptModal').remove()" style="padding:8px 16px;border-radius:6px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
            <button onclick="_tpActivateDept()" style="padding:8px 20px;border-radius:6px;border:none;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:600;">✅ Tạo</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    _tpLoadCreateUsers();
}

async function _tpLoadCreateUsers() {
    const deptId = document.getElementById('tpNewDeptSelect')?.value;
    const userSel = document.getElementById('tpNewUserSelect');
    if (!deptId || !userSel) return;
    try {
        const u = await apiCall(`/api/task-points/users?department_id=${deptId}`);
        const users = u.users || [];
        userSel.innerHTML = '<option value="">— Toàn bộ Team —</option>' + users.map(u => `<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('');
    } catch(e) {
        userSel.innerHTML = '<option value="">— Toàn bộ Team —</option>';
    }
}

async function _tpActivateDept() {
    const deptSel = document.getElementById('tpNewDeptSelect');
    const userSel = document.getElementById('tpNewUserSelect');
    if (!deptSel) return;
    const deptId = Number(deptSel.value);
    const deptName = deptSel.options[deptSel.selectedIndex]?.text?.replace(/^🔒\s*/, '').replace(/\s*\(đã ẩn.*$/, '');
    const userId = userSel?.value ? Number(userSel.value) : null;
    const userName = userId ? userSel.options[userSel.selectedIndex]?.text : null;
    
    
    document.getElementById('tpCreateDeptModal')?.remove();

    const targetType = userId ? 'individual' : 'team';
    const targetId = userId || deptId;
    const itemKey = `${targetType}-${targetId}`;
    const label = userId ? `👤 ${userName}` : deptName;

    // Check duplicate
    const existing = document.querySelector(`.tp-dept-item[data-key="${itemKey}"]`);
    if (existing) {
        _tpSelectItem(targetType, targetId);
        showToast('Đã có lịch này rồi!', 'info');
        return;
    }

    // Add to left sidebar
    if (targetType === 'team') {
        _tpActiveDeptIds.push(deptId);
        // Persist so it survives F5
        try { await apiCall('/api/task-points/activate-team', 'POST', { team_id: deptId }); } catch(e) {}
    }
    const list = document.getElementById('tpDeptList');
    if (list) {
        const div = document.createElement('div');
        div.className = 'tp-dept-item' + (targetType === 'team' ? ' tp-dept-header' : '');
        div.dataset.key = itemKey;
        div.dataset.type = targetType;
        div.dataset.id = targetId;
        if (targetType === 'team') {
            div.onclick = () => _tpSelectDept(targetId);
        } else {
            div.onclick = () => _tpSelectItem(targetType, targetId);
        }
        div.style.cssText = `padding:10px 14px;font-size:13px;color:#374151;cursor:pointer;border-bottom:1px solid #f9fafb;transition:all .15s;border-left:3px solid transparent;font-weight:600;${userId ? 'padding-left:22px;font-weight:400;' : ''}`;
        div.innerHTML = label;
        div.onmouseover = function(){ if(!this.classList.contains('tp-active')) this.style.background='#f9fafb'; };
        div.onmouseout = function(){ if(!this.classList.contains('tp-active')) this.style.background='white'; };
        list.appendChild(div);
        
        // Add member wrap div for new teams
        if (targetType === 'team') {
            const memberWrap = document.createElement('div');
            memberWrap.id = `tpMemberWrap_${deptId}`;
            memberWrap.style.display = 'none';
            list.appendChild(memberWrap);
        }
    }
    if (targetType === 'team') {
        _tpSelectDept(targetId);
    } else {
        _tpSelectItem(targetType, targetId);
    }
    showToast(`✅ Đã tạo lịch cho ${userId ? userName : deptName}`);
}

async function _tpSelectDept(deptId) {
    _tpViewMode = 'team';
    _tpViewUserId = null;
    _tpViewUserName = '';
    _tpViewDeptName = '';
    _tpSelectItem('team', deptId);
    _tpSaveSelection({ type: 'dept', deptId });
    // Load and show members under this dept
    await _tpLoadDeptMembers(deptId);
}

async function _tpLoadDeptMembers(deptId) {
    const wrap = document.getElementById(`tpMemberWrap_${deptId}`);
    if (!wrap) return;

    try {
        const u = await apiCall(`/api/task-points/users?department_id=${deptId}`);
        _tpDeptMembers = u.users || [];
    } catch(e) { _tpDeptMembers = []; }

    // Sort by role priority: approvers first, leaders next, dept heads at top
    const _rolePri = { giam_doc: 5, quan_ly_cap_cao: 4, quan_ly: 3, truong_phong: 2, nhan_vien: 1, part_time: 0 };
    const _roleLabel = { giam_doc: '⭐ Quản lý', quan_ly_cap_cao: '⭐ Quản lý cấp cao', quan_ly: '⭐ Quản lý', truong_phong: '⭐ Trưởng phòng', nhan_vien: 'Nhân viên', part_time: 'Part time' };
    const _isLeader = (role) => ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong'].includes(role);
    _tpDeptMembers.sort((a, b) => {
        const aHead = a._is_dept_head ? 10 : 0;
        const bHead = b._is_dept_head ? 10 : 0;
        const aAppr = a._isApprover ? 10 : 0;
        const bAppr = b._isApprover ? 10 : 0;
        return (bHead + bAppr + (_rolePri[b.role] || 0)) - (aHead + aAppr + (_rolePri[a.role] || 0));
    });

    wrap.style.display = 'block';
    wrap.innerHTML = `
        <div id="tpMemberList_${deptId}">
            ${_tpDeptMembers.map(m => {
                const isDeptHead = m._is_dept_head;
                const isApprover = m._isApprover;
                const lead = isDeptHead || _isLeader(m.role) || isApprover;
                const roleTag = isApprover ? '⭐ Quản Lý' : (isDeptHead ? '⭐ Trưởng phòng' : (_roleLabel[m.role] || m.role));
                const nameStyle = `font-weight:${lead ? '700' : '500'};`;
                const roleStyle = lead ? 'color:#d97706;font-weight:700;' : 'color:#94a3b8;';
                return `
                <div class="tp-member-item" data-uid="${m.id}" data-name="${(m.full_name||'').toLowerCase()}" data-uname="${(m.username||'').toLowerCase()}"
                     onclick="_tpSelectMember(${deptId},${m.id},'${(m.full_name||'').replace(/'/g,"\\'")}')" 
                     style="padding:8px 14px 8px 24px;font-size:13px;color:#1e293b;cursor:pointer;transition:all .12s;border-left:3px solid transparent;display:flex;align-items:center;gap:8px;background:white;"
                     onmouseover="if(!this.classList.contains('tp-member-active'))this.style.background='#f8fafc'" 
                     onmouseout="if(!this.classList.contains('tp-member-active'))this.style.background='white'">
                    <div style="flex:1;min-width:0;">
                        <div style="${nameStyle}font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.full_name}</div>
                        <div style="font-size:10px;${roleStyle}margin-top:1px;">${roleTag}</div>
                    </div>
                </div>`;
            }).join('')}
        </div>`;
}

function _tpGlobalFilter() {
    const q = (document.getElementById('tpGlobalSearch')?.value || '').toLowerCase().trim();
    
    // Filter members across all depts
    document.querySelectorAll('.tp-member-item').forEach(el => {
        if (!q) { el.style.display = ''; return; }
        const name = el.dataset.name || '';
        const uname = el.dataset.uname || '';
        el.style.display = (name.includes(q) || uname.includes(q)) ? '' : 'none';
    });
    
    // Filter dept headers — show if name matches or has visible members
    document.querySelectorAll('.tp-dept-header').forEach(el => {
        if (!q) { el.style.display = ''; return; }
        const deptName = (el.textContent || '').toLowerCase();
        const deptId = el.dataset.id;
        const wrap = document.getElementById(`tpMemberWrap_${deptId}`);
        const hasVisibleMembers = wrap ? wrap.querySelectorAll('.tp-member-item:not([style*="display: none"])').length > 0 : false;
        el.style.display = (deptName.includes(q) || hasVisibleMembers) ? '' : 'none';
        
        // If dept name matches, show ALL its members
        if (deptName.includes(q) && wrap) {
            wrap.querySelectorAll('.tp-member-item').forEach(m => m.style.display = '');
        }
        
        // Show/hide member wrap
        if (wrap) wrap.style.display = el.style.display === 'none' ? 'none' : 'block';
    });
}

function _tpSelectMember(deptId, userId, userName) {
    _tpViewMode = 'individual';
    _tpViewUserId = userId;
    _tpViewUserName = userName;
    // Find dept name for header
    const deptHeader = document.querySelector(`.tp-dept-header[data-id="${deptId}"]`);
    _tpViewDeptName = deptHeader ? deptHeader.textContent.replace(/[0-9.└🏢►▶▼]/g, '').trim() : '';
    // First: highlight dept header (this also clears member highlights)
    _tpSelectItem('team', deptId);
    // Then: re-apply member highlight AFTER _tpSelectItem cleared them
    document.querySelectorAll('.tp-member-item').forEach(el => {
        const isActive = Number(el.dataset.uid) === userId;
        el.classList.toggle('tp-member-active', isActive);
        el.style.background = isActive ? '#eff6ff' : 'white';
        el.style.color = isActive ? '#1e40af' : '#1e293b';
        el.style.fontWeight = isActive ? '700' : '';
        el.style.borderLeft = isActive ? '3px solid #2563eb' : '3px solid transparent';
    });
    _tpTarget = { type: 'team', id: deptId, userId: userId };
    _tpSaveSelection({ type: 'member', deptId, userId, userName });
    _tpLoadTasks();
}

function _tpSelectItem(targetType, targetId) {
    const itemKey = `${targetType}-${targetId}`;
    document.querySelectorAll('.tp-dept-item').forEach(el => {
        const isActive = el.dataset.key === itemKey || (!el.dataset.key && el.dataset.id == targetId && targetType === 'team');
        const isDeptHeader = el.classList.contains('tp-dept-header');
        const isChild = !!el.dataset.parentId;
        el.classList.toggle('tp-active', isActive);
        if (isDeptHeader) {
            // Preserve gradient for dept headers
            if (!isChild) {
                el.style.background = isActive ? 'linear-gradient(135deg,#0f2a4a,#1e50a0)' : 'linear-gradient(135deg,#1e3a5f,#2563eb)';
                el.style.color = '#fff';
                el.style.fontWeight = '900';
                el.style.borderLeft = '';
                if (isActive) {
                    el.style.boxShadow = '0 2px 12px rgba(37,99,235,0.4)';
                } else {
                    el.style.boxShadow = '0 2px 8px rgba(37,99,235,0.25)';
                }
            } else {
                el.style.background = isActive ? '#e0e7ff' : 'linear-gradient(135deg,#f1f5f9,#e8eef5)';
                el.style.color = isActive ? '#1e3a8a' : '#475569';
                el.style.fontWeight = isActive ? '900' : '800';
                el.style.borderLeft = isActive ? '3px solid #2563eb' : '3px solid #93c5fd';
            }
        } else {
            el.style.background = isActive ? '#eff6ff' : 'white';
            el.style.color = isActive ? '#122546' : '#374151';
            el.style.fontWeight = isActive ? '600' : '400';
            el.style.borderLeft = isActive ? '3px solid #2563eb' : '3px solid transparent';
        }
    });
    // Clear member highlights
    document.querySelectorAll('.tp-member-item').forEach(el => {
        el.classList.remove('tp-member-active');
        el.style.background = 'white';
        el.style.color = '#1e293b';
        el.style.fontWeight = '';
        el.style.borderLeft = '3px solid transparent';
    });
    _tpTarget = { type: targetType, id: targetId };
    _tpLoadTasks();
}

async function _tpLoadTasks() {
    if (!_tpTarget.id) return;

    // Init week
    if (!_tpCurrentWeekStart) {
        const now = new Date();
        const day = now.getDay();
        const mon = new Date(now);
        mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        _tpCurrentWeekStart = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate());
    }

    const weekStr = _tpDateStr(_tpCurrentWeekStart);

    try {
        if (_tpViewMode === 'individual' && _tpViewUserId) {
            // Individual view: merged team + personal tasks
            const d = await apiCall(`/api/task-points/individual?user_id=${_tpViewUserId}&week_start=${weekStr}`);
            _tpTasks = d.tasks || [];
            _tpExemptedTasks = d.exempted_tasks || [];
        } else {
            // Team view
            const d = await apiCall(`/api/task-points?target_type=${_tpTarget.type}&target_id=${_tpTarget.id}&week_start=${weekStr}`);
            _tpTasks = d.tasks || [];
            _tpExemptedTasks = [];
        }
    } catch(e) { _tpTasks = []; }

    // Merge snapshots for past days of this week (preserve deleted task history)
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const monDate = new Date(_tpCurrentWeekStart);
        // Only load snapshots if this week has past days
        if (monDate < today) {
            const sunDate = new Date(monDate); sunDate.setDate(monDate.getDate() + 6);
            const endDate = sunDate < today ? sunDate : new Date(today.getTime() - 86400000); // yesterday or sunDate
            const startStr = _tpDateStr(monDate);
            const endStr = _tpDateStr(endDate);
            const targetType = _tpViewMode === 'individual' ? 'individual' : (_tpTarget.type || 'team');
            const targetId = _tpViewMode === 'individual' ? _tpViewUserId : _tpTarget.id;
            const snapData = await apiCall(`/api/task-points/month-data?target_type=${targetType}&target_id=${targetId}&month=${weekStr.substring(0,7)}`);
            if (snapData && snapData.dayData) {
                // For each past day in this week, if templates don't cover it, use snapshots
                let cursor = new Date(monDate);
                while (cursor < today && cursor <= sunDate) {
                    const dateStr = _tpDateStr(cursor);
                    const dow = cursor.getDay() || 7; // 1=Mon..7=Sun
                    const snaps = snapData.dayData[dateStr] || [];
                    if (snaps.length > 0) {
                        // Check if templates already have this day covered
                        const hasTemplate = _tpTasks.some(t => t.day_of_week === dow && !t._fromSnapshot);
                        if (!hasTemplate) {
                            // Add snapshots as read-only tasks
                            snaps.forEach(s => {
                                _tpTasks.push({
                                    ...s,
                                    id: s.template_id || s.id,
                                    day_of_week: dow,
                                    _fromSnapshot: true,
                                    _readOnly: true
                                });
                            });
                        }
                    }
                    cursor.setDate(cursor.getDate() + 1);
                }
            }
        }
    } catch(e) { console.warn('Snapshot merge error:', e); }

    // Load holidays
    try {
        const h = await apiCall(`/api/holidays/week?date=${weekStr}`);
        _tpHolidayMap = h.holidays || {};
    } catch(e) { _tpHolidayMap = {}; }

    _tpRenderGrid();
}

function _tpDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _tpGetTaskColor(taskName) {
    if (!_tpTaskColorMap[taskName]) {
        // Deterministic hash — same name always gets same color (synced with lich-khoabieu)
        let hash = 0;
        for (let i = 0; i < taskName.length; i++) hash = ((hash << 5) - hash) + taskName.charCodeAt(i);
        const idx = Math.abs(hash) % _tpColorPalette.length;
        _tpTaskColorMap[taskName] = _tpColorPalette[idx];
    }
    return _tpTaskColorMap[taskName];
}

function _tpChangeWeek(offset) {
    if (!_tpCurrentWeekStart) return;
    const d = new Date(_tpCurrentWeekStart);
    d.setDate(d.getDate() + offset * 7);
    _tpCurrentWeekStart = d;
    _tpLoadTasks();
}

function _tpFormatDate(date) {
    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
}

function _tpRenderGrid() {
    const wrap = document.getElementById('tpGridWrap');
    if (!wrap) return;

    // ★ Self-view: QL/TP xem chính mình → readonly (chỉ GĐ mới tự quản lý)
    const _tpIsSelfView = _tpViewMode === 'individual' && Number(_tpViewUserId) === currentUser.id && !_tpIsDirector;
    const effectiveReadonly = _tpIsReadonly || _tpIsSelfView;

    // Inject approval badge pulse animation (once)
    if (!document.getElementById('_tpPulseStyle')) {
        const s = document.createElement('style');
        s.id = '_tpPulseStyle';
        s.textContent = '@keyframes _tpPulse { 0%,100%{transform:scale(1);box-shadow:0 2px 6px rgba(217,119,6,0.4)} 50%{transform:scale(1.08);box-shadow:0 3px 10px rgba(217,119,6,0.6)} }';
        document.head.appendChild(s);
    }

    // Build color map from unique task names (hash-based — deterministic)
    _tpTaskColorMap = {};
    const uniqueNames = [...new Set(_tpTasks.map(t => t.task_name))];
    uniqueNames.forEach(name => _tpGetTaskColor(name));

    // Group tasks by day (past days: only snapshots; today+future: templates)
    const _gridToday = new Date(); _gridToday.setHours(0,0,0,0);
    const _gridMonDate = _tpCurrentWeekStart ? new Date(_tpCurrentWeekStart) : new Date();
    const byDay = {};
    for (let d = 1; d <= 7; d++) {
        const colDate = new Date(_gridMonDate); colDate.setDate(_gridMonDate.getDate() + d - 1); colDate.setHours(0,0,0,0);
        const isPast = colDate < _gridToday;
        byDay[d] = _tpTasks.filter(t => {
            if (t.day_of_week !== d) return false;
            if (isPast) return !!t._fromSnapshot; // past: only snapshot tasks
            return !t._fromSnapshot; // today/future: only template tasks
        });
    }

    // Collect all unique time slots and sort (include both template and snapshot tasks)
    const allSlots = new Set();
    _tpTasks.forEach(t => {
        const colDate = new Date(_gridMonDate); colDate.setDate(_gridMonDate.getDate() + t.day_of_week - 1); colDate.setHours(0,0,0,0);
        const isPast = colDate < _gridToday;
        if (isPast && !t._fromSnapshot) return; // skip template tasks for past days
        if (!isPast && t._fromSnapshot) return; // skip snapshot tasks for future days
        allSlots.add(t.time_start + '|' + t.time_end);
    });
    _tpExemptedTasks.forEach(t => allSlots.add(t.time_start + '|' + t.time_end));
    const sortedSlots = [...allSlots].sort((a, b) => a.localeCompare(b));

    // Calculate totals per day (skip holidays)
    const dayTotals = {};
    for (let d = 1; d <= 7; d++) dayTotals[d] = _tpHolidayMap[d] ? 0 : (byDay[d] || []).reduce((s, t) => s + (t.points || 0), 0);

    // Today for past-day protection
    const today = new Date(); today.setHours(0,0,0,0);

    // Week navigation
    const monDate = _tpCurrentWeekStart ? new Date(_tpCurrentWeekStart) : new Date();
    const sunDate = new Date(monDate); sunDate.setDate(monDate.getDate() + 6);

    let html = '';

    // Show selected user header when viewing individual
    if (_tpViewMode === 'individual' && _tpViewUserName) {
        html += `<div style="padding:12px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e5e7eb;background:white;border-radius:10px 10px 0 0;">
            <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1e3a5f,#2563eb);display:flex;align-items:center;justify-content:center;color:white;font-size:18px;font-weight:700;">${(_tpViewUserName || '?')[0].toUpperCase()}</div>
            <div>
                <div style="font-weight:700;color:#122546;font-size:15px;">${_tpViewUserName}</div>
                <div style="font-size:11px;color:#6b7280;">${_tpViewDeptName || ''}</div>
            </div>
        </div>`;
    } else if (_tpViewMode === 'team' && _tpTarget.id) {
        const _deptInfo = _tpAllDepts.find(d => d.id === Number(_tpTarget.id));
        const _deptDisplayName = _deptInfo?.name || 'Phòng ban';
        const _isParentDept = _tpAllDepts.some(d => d.parent_id === Number(_tpTarget.id));
        const _deptIcon = _isParentDept ? '🏢' : '🏠';
        const _deptLabel = _isParentDept ? 'Phòng ban' : 'Team';
        html += `<div style="padding:12px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e5e7eb;background:white;">
            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#122546,#1e3a5f);display:flex;align-items:center;justify-content:center;color:white;font-size:20px;">${_deptIcon}</div>
            <div>
                <div style="font-weight:800;color:#122546;font-size:16px;">${_deptDisplayName}</div>
                <div style="font-size:11px;color:#6b7280;">${_deptLabel} · ${_tpTasks.length} công việc</div>
            </div>
        </div>`;
    }

    html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e5e7eb;background:#f8fafc;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:6px;">
            <button onclick="_tpChangeWeek(-1)" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">◀ Tuần trước</button>
            <div style="font-weight:700;color:#122546;font-size:14px;">📅 ${_tpFormatDate(monDate)} — ${_tpFormatDate(sunDate)}/${monDate.getFullYear()}</div>
            <button onclick="_tpChangeWeek(1)" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">Tuần sau ▶</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
            <input type="month" id="tpMonthPicker" value="${monDate.getFullYear()}-${String(monDate.getMonth()+1).padStart(2,'0')}" onchange="_tpShowMonthView(this.value)" style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;color:#374151;cursor:pointer;background:white;" title="Xem lịch tháng" />
            <button onclick="_tpShowChangeLog()" style="padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:14px;" title="Lịch sử thay đổi">📝</button>
        </div>
    </div>`;

    html += `<table style="width:100%;border-collapse:collapse;font-size:13px;">`;

    // Header with dates
    html += `<thead><tr>`;
    html += `<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb;min-width:100px;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;background:#f8fafc;">Khung giờ</th>`;
    for (let d = 1; d <= 7; d++) {
        const isHoliday = !!_tpHolidayMap[d];
        const colDate = new Date(monDate); colDate.setDate(monDate.getDate() + d - 1);
        const dateLabel = _tpFormatDate(colDate);
        if (isHoliday) {
            html += `<th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;min-width:150px;background:#fef2f2;">
                <div style="font-weight:700;color:#dc2626;font-size:13px;">${DAY_NAMES[d]} <span style="font-size:10px;color:#9ca3af;">${dateLabel}</span></div>
                <div style="margin-top:4px;font-size:11px;color:#dc2626;">🏖️ ${_tpHolidayMap[d]}</div>
            </th>`;
        } else {
            const total = dayTotals[d];
            const pct = Math.min(total, 100);
            const barColor = total === 100 ? '#16a34a' : total > 100 ? '#dc2626' : '#d97706';
            html += `<th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;min-width:150px;background:#f8fafc;">
                <div style="font-weight:700;color:#122546;font-size:13px;">${DAY_NAMES[d]} <span style="font-size:10px;color:#9ca3af;">${dateLabel}</span></div>
                <div style="margin-top:6px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width .3s;"></div>
                </div>
                <div style="font-size:10px;margin-top:3px;color:${barColor};font-weight:600;">${total}/100đ</div>
            </th>`;
        }
    }
    html += `</tr></thead>`;

    // Body — one row per time slot
    html += `<tbody>`;
    if (sortedSlots.length === 0) {
        html += `<tr><td colspan="7" style="padding:40px;text-align:center;color:#9ca3af;border-bottom:1px solid #f3f4f6;">
            Chưa có công việc nào.${!effectiveReadonly ? ' Ấn <b>+ Thêm</b> để bắt đầu.' : ''}
        </td></tr>`;
    } else {
        sortedSlots.forEach((slot, idx) => {
            const [tStart, tEnd] = slot.split('|');
            const isLast = idx === sortedSlots.length - 1;
            const borderB = isLast ? 'none' : '1px solid #f3f4f6';
            html += `<tr>`;
            // Time column
            html += `<td style="padding:10px 14px;border-bottom:${borderB};background:#fafbfc;vertical-align:top;">
                <div style="background:linear-gradient(135deg,#122546,#1e3a5f);border-radius:10px;padding:10px 14px;text-align:center;box-shadow:0 2px 8px rgba(18,37,70,0.15);min-width:70px;">
                    <div style="font-weight:800;color:#fff;font-size:16px;letter-spacing:0.5px;text-shadow:0 1px 2px rgba(0,0,0,0.2);">${tStart}</div>
                    <div style="margin:4px auto;width:20px;height:1px;background:rgba(255,255,255,0.3);"></div>
                    <div style="font-weight:800;color:#FFC107;font-size:16px;letter-spacing:0.5px;text-shadow:0 1px 2px rgba(0,0,0,0.2);">${tEnd}</div>
                </div>
            </td>`;
            for (let d = 1; d <= 7; d++) {
                if (_tpHolidayMap[d]) {
                    html += `<td style="padding:8px 10px;border-bottom:${borderB};background:#fef2f2;vertical-align:middle;text-align:center;">
                        <div style="color:#fca5a5;font-size:18px;">🏖️</div>
                    </td>`;
                    continue;
                }
                const task = byDay[d].find(t => t.time_start + '|' + t.time_end === slot);
                if (task) {
                    const c = _tpGetTaskColor(task.task_name);
                    const isTeamTask = task._source === 'team';
                    const isIndivView = _tpViewMode === 'individual';
                    const isFixedTask = !task.week_only;
                    const canEditFixed = _tpIsDirector;
                    // Past-day protection: calculate actual date for this column
                    const colDate = new Date(monDate); colDate.setDate(monDate.getDate() + d - 1); colDate.setHours(0,0,0,0);
                    const isPast = colDate < today;
                    const canEdit = !isPast && !task._fromSnapshot && !effectiveReadonly && (!isIndivView || !isTeamTask) && (isFixedTask ? canEditFixed : true);
                    // Director can delete team tasks from individual view (but not past)
                    const canDeleteTeam = !isPast && isIndivView && isTeamTask && _tpIsDirector;
                    
                    // Source badge
                    let sourceBadge = '';
                    if (isIndivView) {
                        sourceBadge = isTeamTask 
                            ? `<span style="background:#dbeafe;color:#1d4ed8;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600;">📦 Từ team</span>`
                            : `<span style="background:#d1fae5;color:#059669;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600;">👤 Riêng</span>`;
                    }
                    // Week-only badge
                    let weekBadge = '';
                    if (task.week_only) {
                        weekBadge = `<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600;">📅 Tuần này</span>`;
                    }

                    html += `<td data-day="${d}" data-slot="${slot}" ondragover="_tpDragOver(event)" ondrop="_tpDrop(event)" ondragenter="_tpDragEnter(event)" ondragleave="_tpDragLeave(event)" style="padding:8px 10px;border-bottom:${borderB};vertical-align:top;transition:background .15s;">
                        <div ${_tpIsDirector ? `draggable="true" ondragstart="_tpDragStart(event, ${task.id}, '${slot}', ${d})"` : ''} style="background:${c.bg};border:1px solid ${c.border};border-left:3px solid ${c.badge};border-radius:8px;padding:10px 12px;text-align:center;position:relative;${isTeamTask && isIndivView ? 'opacity:0.85;' : ''}${_tpIsDirector ? 'cursor:grab;' : ''}">
                            <span style="position:absolute;top:-6px;right:-6px;font-size:10px;padding:2px 6px;border-radius:8px;font-weight:700;line-height:1;box-shadow:0 1px 3px rgba(0,0,0,0.15);${task.week_only ? 'background:#fef3c7;color:#d97706;border:1px solid #fde68a;' : 'background:#dcfce7;color:#16a34a;border:1px solid #bbf7d0;'}">${task.week_only ? '📅 Tuần' : '📌 CĐ'}</span>
                            ${task.requires_approval ? '<span style="position:absolute;top:-7px;left:-7px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:2px 7px;border-radius:8px;font-size:9px;font-weight:800;line-height:1.2;box-shadow:0 2px 6px rgba(217,119,6,0.4);animation:_tpPulse 2s infinite;border:1px solid #fbbf24;">🔒 CẦN DUYỆT</span>' : ''}
                            <div onclick="_tpShowTaskDetail(${task.id})" style="font-weight:700;color:${c.text};font-size:13px;margin-bottom:4px;cursor:pointer;transition:all .15s;" onmouseover="this.style.textDecoration='underline';this.style.opacity='0.8'" onmouseout="this.style.textDecoration='none';this.style.opacity='1'">${task.task_name}</div>
                            <div style="display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap;">
                                <span style="background:${c.badge};color:white;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700;">${task.points}đ</span>
                                <span style="background:${c.tag};color:${c.text};padding:1px 6px;border-radius:4px;font-size:9px;">≥ ${task.min_quantity} lần</span>
                                ${sourceBadge}
                            </div>
                            ${''}

                            ${canEdit ? `<div style="margin-top:6px;display:flex;justify-content:center;gap:4px;">
                                <button onclick="_tpEditTask(${task.id})" style="padding:2px 8px;font-size:10px;border:1px solid ${c.border};border-radius:5px;background:white;color:${c.text};cursor:pointer;font-weight:500;">✏️ Sửa</button>
                                <button onclick="_tpDeleteTask(${task.id})" style="padding:2px 8px;font-size:10px;border:1px solid #fecaca;border-radius:5px;background:#fff5f5;color:#dc2626;cursor:pointer;font-weight:500;">🗑️ Xóa</button>
                            </div>` : ''}
                            ${canDeleteTeam ? `<div style="margin-top:6px;display:flex;justify-content:center;">
                                <button onclick="_tpExemptTeamTask(${task.id}, '${task.task_name.replace(/'/g, "\\'")}')" style="padding:2px 8px;font-size:10px;border:1px solid #fecaca;border-radius:5px;background:#fff5f5;color:#dc2626;cursor:pointer;font-weight:500;">🗑️ Xóa CV team</button>
                            </div>` : ''}
                        </div>
                    </td>`;
                } else {
                    // Check if there's an exempted task for this slot+day
                    const exempted = _tpExemptedTasks.find(e => e.day_of_week === d && e.time_start + '|' + e.time_end === slot);
                    if (exempted) {
                        // exempted cells are also drop targets
                        html += `<td style="padding:8px 10px;border-bottom:${borderB};vertical-align:top;">
                            <div style="background:#f9fafb;border:1px dashed #d1d5db;border-radius:8px;padding:10px 12px;text-align:center;opacity:0.7;">
                                <div style="font-size:12px;color:#9ca3af;font-weight:600;margin-bottom:4px;">🚫 ${exempted.task_name}</div>
                                <div style="font-size:10px;color:#d1d5db;margin-bottom:6px;">Đã miễn trừ</div>
                                ${_tpIsDirector ? `<button onclick="_tpRestoreExempt(${exempted.exemption_id}, '${exempted.task_name.replace(/'/g, "\\\\'")}')" style="padding:3px 10px;font-size:10px;border:1px solid #a7f3d0;border-radius:5px;background:#ecfdf5;color:#059669;cursor:pointer;font-weight:600;">🔄 Khôi phục</button>` : ''}
                            </div>
                        </td>`;
                    } else {
                        html += `<td data-day="${d}" data-slot="${slot}" ondragover="_tpDragOver(event)" ondrop="_tpDrop(event)" ondragenter="_tpDragEnter(event)" ondragleave="_tpDragLeave(event)" style="padding:8px 10px;border-bottom:${borderB};vertical-align:middle;text-align:center;color:#d1d5db;font-size:20px;transition:background .15s;">—</td>`;
                    }
                }
            }
            html += `</tr>`;
        });
    }
    html += `</tbody>`;

    // Footer — Add buttons (skip holidays)
    if (!effectiveReadonly) {
        html += `<tfoot><tr>`;
        html += `<td style="padding:8px 14px;background:#fafbfc;font-weight:600;font-size:11px;color:#9ca3af;border-top:2px solid #e5e7eb;">THÊM</td>`;
        for (let d = 1; d <= 7; d++) {
            const footDate = new Date(monDate); footDate.setDate(monDate.getDate() + d - 1); footDate.setHours(0,0,0,0);
            const footPast = footDate < today;
            if (_tpHolidayMap[d]) {
                html += `<td style="padding:8px;text-align:center;background:#fef2f2;border-top:2px solid #e5e7eb;"></td>`;
            } else if (footPast) {
                html += `<td style="padding:8px;text-align:center;background:#fafbfc;border-top:2px solid #e5e7eb;color:#d1d5db;font-size:10px;">🔒</td>`;
            } else {
                html += `<td style="padding:8px;text-align:center;background:#fafbfc;border-top:2px solid #e5e7eb;">
                <button onclick="_tpAddTask(${d})" style="padding:5px 14px;font-size:12px;border:1px dashed #93c5fd;border-radius:6px;background:rgba(37,99,235,0.04);color:#2563eb;cursor:pointer;font-weight:600;transition:all .15s;" onmouseover="this.style.background='#eff6ff';this.style.borderColor='#2563eb'" onmouseout="this.style.background='rgba(37,99,235,0.04)';this.style.borderColor='#93c5fd'">＋ Thêm</button>
            </td>`;
            }
        }
        html += `</tr></tfoot>`;
    }

    html += `</table>`;
    wrap.innerHTML = html;
}

// Auto-format time input as HH:MM (24h)
function _tpFormatTime(el) {
    let v = el.value.replace(/[^\d]/g, '');
    if (v.length > 4) v = v.slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2);
    el.value = v;
}

// Premium task detail modal
function _tpShowTaskDetail(taskId) {
    const task = _tpTasks.find(t => t.id === taskId);
    if (!task) return;
    const c = _tpGetTaskColor(task.task_name);
    const inputReqs = _tpParseJSON(task.input_requirements);
    const outputReqs = _tpParseJSON(task.output_requirements);
    const isFixed = !task.week_only;

    // Remove existing
    document.getElementById('tpDetailModal')?.remove();

    const m = document.createElement('div');
    m.id = 'tpDetailModal';
    m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;animation:tpFadeIn .2s ease;';
    m.onclick = (e) => { if (e.target === m) m.remove(); };

    const reqList = (items, icon, color, label) => {
        if (!items || items.length === 0) return '';
        return `
            <div style="margin-bottom:14px;">
                <div style="font-weight:700;font-size:12px;color:${color};margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                    <span style="font-size:14px;">${icon}</span> ${label}
                </div>
                <div style="background:#f8fafc;border-radius:8px;padding:10px 14px;border:1px solid #e5e7eb;">
                    ${items.map((r, i) => `
                        <div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;${i < items.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}">
                            <span style="background:${color};color:white;min-width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${i + 1}</span>
                            <span style="font-size:13px;color:#374151;line-height:1.5;padding-top:1px;">${_tpLinkify(r)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    };

    m.innerHTML = `
    <style>
        @keyframes tpFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes tpSlideUp { from { transform:translateY(20px);opacity:0; } to { transform:translateY(0);opacity:1; } }
    </style>
    <div style="background:white;border-radius:16px;width:min(480px,92vw);max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,0.2);animation:tpSlideUp .25s ease;">
        <!-- Header with gradient -->
        <div style="background:linear-gradient(135deg, ${c.badge}, ${c.badge}dd);padding:24px 28px;border-radius:16px 16px 0 0;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.1);"></div>
            <div style="position:absolute;bottom:-30px;left:30px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
            <button onclick="document.getElementById('tpDetailModal').remove()" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
            <div style="font-size:22px;font-weight:800;color:white;margin-bottom:6px;text-shadow:0 1px 3px rgba(0,0,0,0.15);">${task.task_name}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <span style="background:rgba(255,255,255,0.2);color:white;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;">${isFixed ? '📌 Cố định' : '📅 1 tuần'}</span>
                <span style="background:rgba(255,255,255,0.2);color:white;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;">${DAY_NAMES[task.day_of_week]}</span>
            </div>
        </div>

        <!-- Body -->
        <div style="padding:24px 28px;">
            <!-- Info Cards -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">
                <div style="text-align:center;background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:12px 8px;">
                    <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Điểm</div>
                    <div style="font-size:24px;font-weight:800;color:${c.badge};">${task.points}<span style="font-size:12px;">đ</span></div>
                </div>
                <div style="text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 8px;">
                    <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">SL Tối Thiểu</div>
                    <div style="font-size:24px;font-weight:800;color:#16a34a;">≥${task.min_quantity}<span style="font-size:12px;"> lần</span></div>
                </div>
                <div style="text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 8px;">
                    <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Khung Giờ</div>
                    <div style="font-size:14px;font-weight:800;color:#334155;margin-top:2px;">${task.time_start}</div>
                    <div style="font-size:9px;color:#9ca3af;">→ ${task.time_end}</div>
                </div>
            </div>

            <!-- Guide Link -->
            ${task.guide_url ? `
            <div style="margin-bottom:18px;">
                <a href="${task.guide_url}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:linear-gradient(135deg, #eff6ff, #dbeafe);border:1px solid #93c5fd;border-radius:10px;text-decoration:none;color:#1d4ed8;transition:all .15s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(37,99,235,0.15)'" onmouseout="this.style.transform='none';this.style.boxShadow='none'">
                    <span style="font-size:20px;">📘</span>
                    <div>
                        <div style="font-weight:700;font-size:13px;">Xem hướng dẫn công việc</div>
                        <div style="font-size:11px;color:#3b82f6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:350px;">${task.guide_url}</div>
                    </div>
                    <span style="margin-left:auto;font-size:14px;">→</span>
                </a>
            </div>` : ''}

            <!-- Requirements -->
            ${reqList(inputReqs, '📥', '#2563eb', 'Yêu cầu đầu vào')}
            ${reqList(outputReqs, '📤', '#059669', 'Yêu cầu đầu ra')}

            ${!inputReqs.length && !outputReqs.length ? `
            <div style="text-align:center;padding:16px;color:#9ca3af;font-size:13px;background:#f9fafb;border-radius:8px;border:1px dashed #e5e7eb;">
                Chưa có yêu cầu đầu vào/ra
            </div>` : ''}
        </div>
    </div>`;
    document.body.appendChild(m);
}

function _tpAddTask(dayOfWeek) {
    _tpShowPickFromLibrary(dayOfWeek);
}

function _tpEditTask(taskId) {
    const task = _tpTasks.find(t => t.id === taskId);
    if (!task) return;
    _tpShowTaskModal(task, task.day_of_week);
}

async function _tpDeleteTask(taskId) {
    const task = _tpTasks.find(t => t.id === taskId);
    if (!task) return;

    // Count how many instances this task_name has in the current view
    const sameNameCount = _tpTasks.filter(t => t.task_name === task.task_name && t.time_start === task.time_start && t.time_end === task.time_end).length;

    // If only 1 instance, just confirm and delete
    if (sameNameCount <= 1) {
        if (!confirm(`Xóa công việc "${task.task_name}"?`)) return;
        try {
            await apiCall(`/api/task-points/${taskId}`, 'DELETE');
            showToast('✅ Đã xóa');
            _tpLoadTasks();
        } catch(e) { showToast('Lỗi!', 'error'); }
        return;
    }

    // Multiple instances → show modal with 2 choices
    document.getElementById('tpDeleteChoiceModal')?.remove();
    const m = document.createElement('div');
    m.id = 'tpDeleteChoiceModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(3px);';
    m.onclick = (e) => { if (e.target === m) m.remove(); };
    m.innerHTML = `
    <div style="background:white;border-radius:16px;padding:0;width:420px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;animation:tpSlideUp .25s ease;">
        <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:18px 24px;color:white;position:relative;">
            <button onclick="document.getElementById('tpDeleteChoiceModal').remove()" style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
            <div style="font-size:16px;font-weight:800;">🗑️ Xóa công việc</div>
            <div style="font-size:12px;margin-top:4px;opacity:0.9;">CV: <b>${task.task_name}</b> — Khung giờ: <b>${task.time_start}—${task.time_end}</b> — ${sameNameCount} ngày</div>
        </div>
        <div style="padding:20px 24px;">
            <div style="margin-bottom:12px;font-size:13px;color:#374151;font-weight:600;">Chọn cách xóa:</div>
            <button onclick="_tpDoDelete('single', ${taskId})" style="width:100%;padding:14px 16px;margin-bottom:10px;border:2px solid #d97706;border-radius:10px;background:#fffbeb;color:#d97706;cursor:pointer;font-size:13px;font-weight:700;text-align:left;transition:all .15s;" onmouseover="this.style.background='#d97706';this.style.color='white'" onmouseout="this.style.background='#fffbeb';this.style.color='#d97706'">
                📅 Xóa ngày ${DAY_NAMES[task.day_of_week]} này thôi<br><span style="font-weight:400;font-size:11px;opacity:0.8;">Chỉ xóa 1 ô — các ngày khác vẫn giữ</span>
            </button>
            <button onclick="_tpDoDelete('all', ${taskId})" style="width:100%;padding:14px 16px;margin-bottom:10px;border:2px solid #dc2626;border-radius:10px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:13px;font-weight:700;text-align:left;transition:all .15s;" onmouseover="this.style.background='#dc2626';this.style.color='white'" onmouseout="this.style.background='#fef2f2';this.style.color='#dc2626'">
                🗑️ Xóa toàn bộ "${task.task_name}" (${task.time_start}—${task.time_end})<br><span style="font-weight:400;font-size:11px;opacity:0.8;">Xóa tất cả ${sameNameCount} ngày cùng khung giờ</span>
            </button>
            <button onclick="document.getElementById('tpDeleteChoiceModal').remove()" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#6b7280;cursor:pointer;font-size:13px;font-weight:500;">Hủy</button>
        </div>
    </div>`;
    document.body.appendChild(m);
}

async function _tpDoDelete(mode, taskId) {
    const task = _tpTasks.find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('tpDeleteChoiceModal')?.remove();

    try {
        if (mode === 'single') {
            await apiCall(`/api/task-points/${taskId}`, 'DELETE');
            showToast('✅ Đã xóa 1 ngày');
        } else {
            // Use target_type and target_id directly from the task record
            const targetType = task.target_type || (_tpViewMode === 'individual' ? 'individual' : 'team');
            const targetId = task.target_id || (_tpViewMode === 'individual' ? _tpViewUserId : _tpTarget.id);
            const r = await apiCall('/api/task-points/delete-all-by-name', 'POST', {
                task_name: task.task_name,
                target_type: targetType,
                target_id: Number(targetId),
                time_start: task.time_start,
                time_end: task.time_end
            });
            showToast(`✅ Đã xóa toàn bộ "${task.task_name}" (${r.deleted || 0} ngày)`);
        }
        _tpLoadTasks();
    } catch(e) { showToast('Lỗi: ' + (e.message || 'Không thể xóa'), 'error'); }
}

function _tpShowTaskModal(task, dayOfWeek, prefill) {
    const isEdit = !!task;
    const pf = prefill || {}; // pre-fill from library
    const title = isEdit ? '✏️ Sửa công việc' : `＋ Thêm công việc — ${DAY_NAMES[dayOfWeek]}`;
    const isFromLib = !isEdit && (pf.task_name || pf.points); // picked from library = lock fields
    const shouldLock = isFromLib || isEdit; // Lock fields when editing or from library

    // Locked field styles
    const lockStyle = shouldLock ? 'background:#f3f4f6;color:#6b7280;cursor:not-allowed;' : '';
    const lockAttr = shouldLock ? 'readonly tabindex="-1"' : '';

    // Days checkboxes for multi-day add (all 7 days selectable — templates are recurring)
    const daysHtml = !isEdit ? `
    <div style="margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Áp dụng cho ngày:</label>
            <div style="display:flex;gap:6px;">
                <button type="button" onclick="document.querySelectorAll('.tpDayCb').forEach(c=>c.checked=true)" style="padding:3px 10px;font-size:11px;border:1px solid #2563eb;border-radius:5px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:600;">Tất cả</button>
                <button type="button" onclick="document.querySelectorAll('.tpDayCb').forEach(c=>{c.checked=[1,2,3,4,5,6].includes(Number(c.value))})" style="padding:3px 10px;font-size:11px;border:1px solid #059669;border-radius:5px;background:#ecfdf5;color:#059669;cursor:pointer;font-weight:600;">Hành chính</button>
            </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
            ${[1,2,3,4,5,6,7].map(d => `
                <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;color:#374151;padding:4px 8px;border:1px solid ${d === dayOfWeek ? '#2563eb' : '#e5e7eb'};border-radius:6px;background:${d === dayOfWeek ? '#eff6ff' : 'white'};">
                    <input type="checkbox" class="tpDayCb" value="${d}" ${d === dayOfWeek ? 'checked' : ''} style="cursor:pointer;accent-color:#2563eb;">
                    ${DAY_NAMES[d]}
                </label>
            `).join('')}
        </div>
    </div>` : '';

    const modal = document.createElement('div');
    modal.id = 'tpModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:24px;width:min(460px,90vw);max-height:90vh;overflow-y:auto;border:1px solid #e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #f3f4f6;">
            <h3 style="margin:0;font-size:16px;color:#122546;font-weight:700;">${title}</h3>
            <button onclick="document.getElementById('tpModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;line-height:1;">×</button>
        </div>
        <div style="margin-bottom:14px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Tên công việc <span style="color:#dc2626;">*</span></label>
            <input id="tpFTask" type="text" ${lockAttr} style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;${lockStyle}" value="${task ? task.task_name : (pf.task_name || '')}" placeholder="VD: Gọi điện Telesale" onfocus="if(!this.readOnly)this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
                <label style="font-weight:600;font-size:13px;color:#374151;">Điểm <span style="color:#dc2626;">*</span></label>
                <input id="tpFPoints" type="number" ${lockAttr} style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;${lockStyle}" value="${task ? task.points : (pf.points || '')}" placeholder="20" onfocus="if(!this.readOnly)this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
            </div>
            <div>
                <label style="font-weight:600;font-size:13px;color:#374151;">SL tối thiểu phải làm <span style="color:#dc2626;">*</span></label>
                <input id="tpFMinQty" type="number" ${lockAttr} style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;${lockStyle}" value="${task ? task.min_quantity : (pf.min_quantity || '1')}" placeholder="15" onfocus="if(!this.readOnly)this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div>
                <label style="font-weight:600;font-size:13px;color:#374151;">Giờ bắt đầu <span style="color:#dc2626;">*</span></label>
                <input id="tpFStart" type="text" pattern="[0-2][0-9]:[0-5][0-9]" maxlength="5" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? task.time_start : ''}" placeholder="08:30" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'" oninput="_tpFormatTime(this)">
            </div>
            <div>
                <label style="font-weight:600;font-size:13px;color:#374151;">Giờ kết thúc <span style="color:#dc2626;">*</span></label>
                <input id="tpFEnd" type="text" pattern="[0-2][0-9]:[0-5][0-9]" maxlength="5" style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;" value="${task ? task.time_end : ''}" placeholder="10:30" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'" oninput="_tpFormatTime(this)">
            </div>
        </div>
        <div style="margin-bottom:8px;">
            <label style="font-weight:600;font-size:13px;color:#374151;">Link hướng dẫn CV</label>
            <input id="tpFGuide" type="url" ${lockAttr} style="margin-top:4px;width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;color:#122546;box-sizing:border-box;outline:none;${lockStyle}" value="${task ? (task.guide_url || '') : (pf.guide_url || '')}" placeholder="https://docs.google.com/..." onfocus="if(!this.readOnly)this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'">
        </div>
        <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">📥 Yêu cầu đầu vào CV <span style="color:#dc2626;">*</span></label>
                ${!shouldLock ? '<button type="button" onclick="_tpAddReqItem(\'tpFInputReqList\')" style="padding:2px 10px;font-size:14px;border:1px solid #2563eb;border-radius:5px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:700;">＋</button>' : ''}
            </div>
            <div id="tpFInputReqList">${shouldLock ? _tpRenderReqReadonly(_tpParseJSON(task ? task.input_requirements : pf.input_requirements)) : _tpRenderReqItems((_tpParseJSON(task ? task.input_requirements : pf.input_requirements)).length ? _tpParseJSON(task ? task.input_requirements : pf.input_requirements) : [''])}</div>
        </div>
        <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">📤 Yêu cầu đầu ra CV <span style="color:#dc2626;">*</span></label>
                ${!shouldLock ? '<button type="button" onclick="_tpAddReqItem(\'tpFOutputReqList\')" style="padding:2px 10px;font-size:14px;border:1px solid #059669;border-radius:5px;background:#ecfdf5;color:#059669;cursor:pointer;font-weight:700;">＋</button>' : ''}
            </div>
            <div id="tpFOutputReqList">${shouldLock ? _tpRenderReqReadonly(_tpParseJSON(task ? task.output_requirements : pf.output_requirements)) : _tpRenderReqItems((_tpParseJSON(task ? task.output_requirements : pf.output_requirements)).length ? _tpParseJSON(task ? task.output_requirements : pf.output_requirements) : [''])}</div>
        </div>
        <div style="margin-bottom:8px;padding:10px 12px;background:#fef3c7;border-radius:8px;border:1px solid #fde68a;display:flex;align-items:center;gap:8px;">
            <input id="tpFApproval" type="checkbox" ${(task && task.requires_approval) || pf.requires_approval ? 'checked' : ''} onchange="document.getElementById('tpFRedoWrap').style.display=this.checked?'block':'none'" style="width:16px;height:16px;accent-color:#d97706;cursor:pointer;">
            <label for="tpFApproval" style="font-size:13px;color:#78350f;cursor:pointer;font-weight:600;">🔒 Cần duyệt <span style="font-weight:400;font-size:11px;color:#92400e;">(Quản lý/TP phải duyệt mới tính điểm)</span></label>
        </div>
        <div id="tpFRedoWrap" style="margin-bottom:8px;margin-left:24px;display:${(task && task.requires_approval) || pf.requires_approval ? 'block' : 'none'};">
            <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px;">Số lần nộp lại tối đa khi bị từ chối</label>
            <input id="tpFRedoMax" type="number" value="${task?.max_redo_count || pf.max_redo_count || 3}" min="1" max="10" style="width:100px;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;">
        </div>
        <div style="display:none;">
            <input type="radio" name="tpWeekType" value="fixed" ${!(task?.week_only || pf._auto_week_only) ? 'checked' : ''}>
            <input type="radio" name="tpWeekType" value="weekly" ${(task?.week_only || pf._auto_week_only) ? 'checked' : ''}>
        </div>
        ${daysHtml}
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px;padding-top:12px;border-top:1px solid #f3f4f6;">
            <button onclick="document.getElementById('tpModal').remove()" style="padding:9px 18px;border-radius:8px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;font-weight:500;">Hủy</button>
            <button onclick="_tpSaveTask(${isEdit ? task.id : 'null'}, ${dayOfWeek})" style="padding:9px 22px;border-radius:8px;border:none;background:#122546;color:white;cursor:pointer;font-size:13px;font-weight:600;">💾 Lưu</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
}

async function _tpSaveTask(editId, defaultDay) {
    const task_name = document.getElementById('tpFTask').value.trim();
    const points = Number(document.getElementById('tpFPoints').value) || 0;
    const min_quantity = Number(document.getElementById('tpFMinQty').value) || 1;
    const time_start = document.getElementById('tpFStart').value;
    const time_end = document.getElementById('tpFEnd').value;
    const guide_url = document.getElementById('tpFGuide').value.trim();
    const requires_approval = document.getElementById('tpFApproval')?.checked || false;
    const max_redo_count = Number(document.getElementById('tpFRedoMax')?.value) || 3;
    const weekTypeRadio = document.querySelector('input[name="tpWeekType"]:checked');
    const isWeekOnly = weekTypeRadio?.value === 'weekly';
    const week_only = isWeekOnly && _tpCurrentWeekStart ? _tpDateStr(_tpCurrentWeekStart) : null;
    let input_requirements = [], output_requirements = [];
    // Collect from visible lists if present, otherwise empty
    const inpList = document.getElementById('tpFInputReqList');
    const outList = document.getElementById('tpFOutputReqList');
    if (inpList && inpList.querySelectorAll('.tpReqInput').length > 0) {
        input_requirements = _tpCollectReqItems('tpFInputReqList');
    } else if (inpList) {
        // readonly: parse from data attrs
        input_requirements = [...inpList.querySelectorAll('.tpReqReadonlyItem')].map(el => el.textContent.replace(/^\d+\.\s*/, '').trim()).filter(v => v);
    }
    if (outList && outList.querySelectorAll('.tpReqInput').length > 0) {
        output_requirements = _tpCollectReqItems('tpFOutputReqList');
    } else if (outList) {
        output_requirements = [...outList.querySelectorAll('.tpReqReadonlyItem')].map(el => el.textContent.replace(/^\d+\.\s*/, '').trim()).filter(v => v);
    }

    if (!task_name || !time_start || !time_end) { showToast('Vui lòng điền đầy đủ!', 'error'); return; }
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(time_start) || !timeRegex.test(time_end)) { showToast('Giờ phải đúng định dạng HH:MM (VD: 08:30, 15:00)', 'error'); return; }

    // Determine target: if individual view, create as individual for user
    let targetType = _tpTarget.type;
    let targetId = _tpTarget.id;
    if (_tpViewMode === 'individual' && _tpViewUserId) {
        targetType = 'individual';
        targetId = _tpViewUserId;
    }

    const savePayload = { task_name, points, min_quantity, time_start, time_end, guide_url, requires_approval, max_redo_count, week_only, input_requirements, output_requirements };

    try {
        if (editId) {
            // Check if there are multiple instances of this task
            const editingTask = _tpTasks.find(t => t.id === editId);
            const oldName = editingTask ? editingTask.task_name : task_name;
            const oldTimeStart = editingTask ? editingTask.time_start : time_start;
            const oldTimeEnd = editingTask ? editingTask.time_end : time_end;
            const sameNameCount = _tpTasks.filter(t => t.task_name === oldName && t.time_start === oldTimeStart && t.time_end === oldTimeEnd).length;

            if (sameNameCount > 1) {
                // Show choice modal
                document.getElementById('tpModal')?.remove();
                _tpShowEditChoiceModal(editId, defaultDay, oldName, oldTimeStart, oldTimeEnd, sameNameCount, savePayload, targetType, targetId);
                return;
            }

            // Single instance — save directly
            await apiCall(`/api/task-points/${editId}`, 'PUT', { ...savePayload, day_of_week: defaultDay, sort_order: 0 });
            showToast('✅ Đã cập nhật');
        } else {
            const checkedDays = [...document.querySelectorAll('.tpDayCb:checked')].map(cb => Number(cb.value));
            if (checkedDays.length === 0) { showToast('Chọn ít nhất 1 ngày!', 'error'); return; }

            for (const day of checkedDays) {
                await apiCall('/api/task-points', 'POST', {
                    target_type: targetType, target_id: targetId,
                    day_of_week: day, task_name, points, min_quantity, time_start, time_end, guide_url, sort_order: 0, requires_approval, max_redo_count, week_only, input_requirements, output_requirements
                });
            }
            showToast(`✅ Đã thêm ${checkedDays.length} công việc${isWeekOnly ? ' (tuần này)' : ''}`);
        }
        document.getElementById('tpModal')?.remove();
        _tpLoadTasks();
    } catch(e) { showToast('Lỗi: ' + (e.message || 'Unknown'), 'error'); }
}

function _tpShowEditChoiceModal(editId, dayOfWeek, oldName, oldTimeStart, oldTimeEnd, count, payload, targetType, targetId) {
    document.getElementById('tpEditChoiceModal')?.remove();
    const m = document.createElement('div');
    m.id = 'tpEditChoiceModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(3px);';
    m.onclick = (e) => { if (e.target === m) m.remove(); };
    // Store payload in window for the callbacks
    window._tpEditPayload = { editId, dayOfWeek, oldName, oldTimeStart, oldTimeEnd, payload, targetType, targetId };
    m.innerHTML = `
    <div style="background:white;border-radius:16px;padding:0;width:440px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;animation:tpSlideUp .25s ease;">
        <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:18px 24px;color:white;position:relative;">
            <button onclick="document.getElementById('tpEditChoiceModal').remove()" style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
            <div style="font-size:16px;font-weight:800;">✏️ Sửa công việc</div>
            <div style="font-size:12px;margin-top:4px;opacity:0.9;">CV: <b>${oldName}</b> — Khung giờ: <b>${oldTimeStart}—${oldTimeEnd}</b> — ${count} ngày</div>
        </div>
        <div style="padding:20px 24px;">
            <div style="margin-bottom:12px;font-size:13px;color:#374151;font-weight:600;">Chọn cách sửa:</div>
            <button onclick="_tpDoEditChoice('single')" style="width:100%;padding:14px 16px;margin-bottom:10px;border:2px solid #2563eb;border-radius:10px;background:#eff6ff;color:#2563eb;cursor:pointer;font-size:13px;font-weight:700;text-align:left;transition:all .15s;" onmouseover="this.style.background='#2563eb';this.style.color='white'" onmouseout="this.style.background='#eff6ff';this.style.color='#2563eb'">
                📅 Chỉ sửa ${DAY_NAMES[dayOfWeek]} này thôi<br><span style="font-weight:400;font-size:11px;opacity:0.8;">Chỉ thay đổi 1 ô — các ngày khác giữ nguyên</span>
            </button>
            <button onclick="_tpDoEditChoice('all')" style="width:100%;padding:14px 16px;margin-bottom:10px;border:2px solid #059669;border-radius:10px;background:#ecfdf5;color:#059669;cursor:pointer;font-size:13px;font-weight:700;text-align:left;transition:all .15s;" onmouseover="this.style.background='#059669';this.style.color='white'" onmouseout="this.style.background='#ecfdf5';this.style.color='#059669'">
                🔄 Sửa toàn bộ "${oldName}" (${count} ngày)<br><span style="font-weight:400;font-size:11px;opacity:0.8;">Áp dụng thay đổi cho tất cả ${count} ngày cùng khung giờ</span>
            </button>
            <button onclick="document.getElementById('tpEditChoiceModal').remove()" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#6b7280;cursor:pointer;font-size:13px;font-weight:500;">Hủy</button>
        </div>
    </div>`;
    document.body.appendChild(m);
}

async function _tpDoEditChoice(mode) {
    const { editId, dayOfWeek, oldName, oldTimeStart, oldTimeEnd, payload, targetType, targetId } = window._tpEditPayload || {};
    if (!editId) return;
    document.getElementById('tpEditChoiceModal')?.remove();

    try {
        if (mode === 'single') {
            await apiCall(`/api/task-points/${editId}`, 'PUT', { ...payload, day_of_week: dayOfWeek, sort_order: 0 });
            showToast('✅ Đã cập nhật 1 ngày');
        } else {
            const r = await apiCall('/api/task-points/update-all-by-name', 'PUT', {
                old_task_name: oldName,
                old_time_start: oldTimeStart,
                old_time_end: oldTimeEnd,
                target_type: targetType,
                target_id: Number(targetId),
                ...payload
            });
            showToast(`✅ Đã cập nhật toàn bộ "${payload.task_name}" (${r.updated || 0} ngày)`);
        }
        _tpLoadTasks();
    } catch(e) { showToast('Lỗi: ' + (e.message || 'Không thể cập nhật'), 'error'); }
}

async function _tpCopyToIndividual() {
    const deptId = document.getElementById('tpDeptSelect').value;
    const userId = document.getElementById('tpUserSelect').value;
    if (!deptId || !userId) { showToast('Chọn phòng ban và nhân viên!', 'error'); return; }
    if (!confirm('Copy toàn bộ lịch công việc từ Team sang nhân viên này?\nLịch cũ của nhân viên sẽ bị xóa.')) return;

    try {
        const r = await apiCall('/api/task-points/copy-to-individual', 'POST', { team_id: Number(deptId), user_id: Number(userId) });
        showToast(`✅ Đã copy ${r.copied} công việc`);
        _tpLoadTasks();
    } catch(e) { showToast('Lỗi!', 'error'); }
}

// ===== CLONE FROM TEAM (Director only) =====
function _tpShowCloneDialog() {
    if (_tpViewMode !== 'team' || !_tpTarget.id) {
        showToast('Hãy chọn một team/phòng ban trước!', 'error');
        return;
    }
    const currentTeamId = Number(_tpTarget.id);
    const currentTeamName = _tpAllDepts.find(d => d.id === currentTeamId)?.name || 'Team hiện tại';
    const teamOptions = _tpAllDepts
        .filter(d => d.id !== currentTeamId)
        .map(d => `<option value="${d.id}">${d.name}</option>`)
        .join('');

    if (!teamOptions) {
        showToast('Không có team khác để clone!', 'error');
        return;
    }

    const m = document.createElement('div');
    m.id = 'tpCloneModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(3px);';
    m.innerHTML = `
    <div style="background:white;border-radius:16px;padding:0;width:460px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;">
        <div style="background:linear-gradient(135deg,#059669,#047857);padding:18px 24px;color:white;">
            <div style="font-size:16px;font-weight:800;">📋 Áp dụng CV từ team khác</div>
            <div style="font-size:12px;margin-top:4px;opacity:0.9;">Team đích: <b>${currentTeamName}</b></div>
        </div>
        <div style="padding:20px 24px;">
            <div style="margin-bottom:16px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Chọn team nguồn:</label>
                <select id="tpCloneSource" style="margin-top:6px;width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;" onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#d1d5db'">
                    <option value="">-- Chọn team --</option>
                    ${teamOptions}
                </select>
            </div>
            <div style="margin-bottom:12px;font-size:13px;color:#374151;font-weight:600;">Chế độ áp dụng:</div>
            <button onclick="_tpDoClone('replace')" style="width:100%;padding:14px 16px;margin-bottom:10px;border:2px solid #dc2626;border-radius:10px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:13px;font-weight:700;text-align:left;transition:all .15s;" onmouseover="this.style.background='#dc2626';this.style.color='white'" onmouseout="this.style.background='#fef2f2';this.style.color='#dc2626'">
                🔄 Thay thế toàn bộ<br><span style="font-weight:400;font-size:11px;opacity:0.8;">Xóa CV cũ của ${currentTeamName}, thay bằng CV team nguồn</span>
            </button>
            <button onclick="_tpDoClone('merge')" style="width:100%;padding:14px 16px;margin-bottom:10px;border:2px solid #2563eb;border-radius:10px;background:#eff6ff;color:#2563eb;cursor:pointer;font-size:13px;font-weight:700;text-align:left;transition:all .15s;" onmouseover="this.style.background='#2563eb';this.style.color='white'" onmouseout="this.style.background='#eff6ff';this.style.color='#2563eb'">
                ➕ Gộp thêm<br><span style="font-weight:400;font-size:11px;opacity:0.8;">Giữ CV cũ, thêm CV từ team nguồn</span>
            </button>
            <button onclick="document.getElementById('tpCloneModal').remove()" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#6b7280;cursor:pointer;font-size:13px;font-weight:500;">Hủy</button>
        </div>
    </div>`;
    document.body.appendChild(m);
}

async function _tpDoClone(mode) {
    const sourceId = document.getElementById('tpCloneSource')?.value;
    if (!sourceId) { showToast('Chọn team nguồn!', 'error'); return; }
    const sourceName = _tpAllDepts.find(d => d.id === Number(sourceId))?.name || 'Team nguồn';
    const targetName = _tpAllDepts.find(d => d.id === Number(_tpTarget.id))?.name || 'Team đích';

    const confirmMsg = mode === 'replace'
        ? `⚠️ XÓA toàn bộ CV của "${targetName}" và thay bằng CV của "${sourceName}"?\n\nHành động này KHÔNG thể hoàn tác!`
        : `Thêm CV từ "${sourceName}" vào "${targetName}"?\n\nCV hiện tại sẽ được giữ nguyên.`;
    if (!confirm(confirmMsg)) return;

    try {
        const r = await apiCall('/api/task-points/clone-from-team', 'POST', {
            source_team_id: Number(sourceId),
            target_team_id: Number(_tpTarget.id),
            mode
        });
        document.getElementById('tpCloneModal')?.remove();
        if (r.error) {
            showToast('❌ ' + r.error, 'error');
        } else {
            showToast('✅ ' + (r.message || `Đã clone ${r.cloned} CV`));
            _tpLoadTasks();
        }
    } catch(e) {
        showToast('Lỗi: ' + (e.message || 'Không thể clone'), 'error');
    }
}

// ===== EXEMPT TEAM TASK (Director only) =====
function _tpExemptTeamTask(templateId, taskName) {
    const weekStr = _tpCurrentWeekStart ? _tpDateStr(_tpCurrentWeekStart) : '';
    const userName = _tpViewUserName || '';
    const m = document.createElement('div');
    m.id = 'tpExemptModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(3px);';
    m.innerHTML = `
    <div style="background:white;border-radius:16px;padding:0;width:420px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;animation:fadeIn .2s ease-out;">
        <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:18px 24px;color:white;">
            <div style="font-size:16px;font-weight:800;">⚠️ Xóa CV team cho nhân viên</div>
            <div style="font-size:12px;margin-top:4px;opacity:0.9;">CV: <b>${taskName}</b> — NV: <b>${userName}</b></div>
        </div>
        <div style="padding:20px 24px;">
            <div style="margin-bottom:12px;font-size:13px;color:#374151;">Chọn cách xóa:</div>
            <button onclick="_tpDoExempt(${templateId}, 'permanent')" style="width:100%;padding:14px 16px;margin-bottom:10px;border:2px solid #dc2626;border-radius:10px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:13px;font-weight:700;text-align:left;transition:all .15s;" onmouseover="this.style.background='#dc2626';this.style.color='white'" onmouseout="this.style.background='#fef2f2';this.style.color='#dc2626'">
                🗑️ Xóa vĩnh viễn<br><span style="font-weight:400;font-size:11px;opacity:0.8;">NV ${userName} không phải làm CV này từ nay trở đi</span>
            </button>
            <button onclick="_tpDoExempt(${templateId}, 'week')" style="width:100%;padding:14px 16px;margin-bottom:10px;border:2px solid #d97706;border-radius:10px;background:#fffbeb;color:#d97706;cursor:pointer;font-size:13px;font-weight:700;text-align:left;transition:all .15s;" onmouseover="this.style.background='#d97706';this.style.color='white'" onmouseout="this.style.background='#fffbeb';this.style.color='#d97706'">
                📅 Chỉ bỏ tuần này<br><span style="font-weight:400;font-size:11px;opacity:0.8;">Tuần sau NV ${userName} vẫn phải làm CV này</span>
            </button>
            <button onclick="document.getElementById('tpExemptModal').remove()" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#6b7280;cursor:pointer;font-size:13px;font-weight:500;">Hủy</button>
        </div>
    </div>`;
    document.body.appendChild(m);
}

async function _tpDoExempt(templateId, exemptType) {
    const weekStr = _tpCurrentWeekStart ? _tpDateStr(_tpCurrentWeekStart) : '';
    try {
        const r = await apiCall('/api/task-points/exempt', 'POST', {
            user_id: _tpViewUserId,
            template_id: templateId,
            exempt_type: exemptType,
            week_start: exemptType === 'week' ? weekStr : null
        });
        document.getElementById('tpExemptModal')?.remove();
        if (r.error) {
            showToast('❌ ' + r.error, 'error');
        } else {
            const msg = r.message || (exemptType === 'permanent' ? 'Đã xóa vĩnh viễn cho nhân viên' : 'Đã bỏ qua tuần này');
            showToast('✅ ' + msg);
            _tpLoadTasks();
        }
    } catch(e) {
        document.getElementById('tpExemptModal')?.remove();
        showToast('Lỗi: ' + (e.message || 'Không thể xóa'), 'error');
    }
}

async function _tpRestoreExempt(exemptionId, taskName) {
    if (!confirm(`Khôi phục CV "${taskName}" cho nhân viên ${_tpViewUserName}?`)) return;
    try {
        const r = await apiCall(`/api/task-points/exempt/${exemptionId}`, 'DELETE');
        showToast(`✅ ${r.message}`);
        _tpLoadTasks();
    } catch(e) {
        showToast('Lỗi: ' + (e.message || 'Không thể khôi phục'), 'error');
    }
}


// ===== KHO CÔNG VIỆC (TASK LIBRARY) =====
let _tpLibraryTasks = [];
let _tpLibFilterDeptId = '';

async function _tpShowTaskLibrary() {
    _tpLibFilterDeptId = '';
    _tpLibFilterWeekly = false; // false = cố định, true = 1 tuần
    // Pre-load all library tasks
    try {
        const d = await apiCall('/api/task-library');
        _tpLibraryTasks = d.tasks || [];
    } catch(e) { _tpLibraryTasks = []; }

    const fixedCount = _tpLibraryTasks.filter(t => !t.is_weekly).length;
    const weeklyCount = _tpLibraryTasks.filter(t => t.is_weekly).length;

    const modal = document.createElement('div');
    modal.id = 'tpLibModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
    <div style="background:white;border-radius:14px;padding:0;width:min(720px,92vw);max-height:90vh;overflow:hidden;display:flex;flex-direction:column;border:1px solid #e5e7eb;box-shadow:0 25px 60px rgba(0,0,0,0.2);">
        <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:18px 22px;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;font-size:17px;color:white;font-weight:700;">📦 Kho Công Việc</h3>
                <div style="font-size:11px;color:#93c5fd;margin-top:3px;">Quản lý tất cả công việc để tái sử dụng · ${_tpLibraryTasks.length} CV</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <button id="tpLibAddBtn" onclick="_tpShowLibAddModal(null, _tpLibFilterWeekly)" style="padding:7px 16px;border-radius:8px;border:none;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:700;white-space:nowrap;">＋ Thêm CV mới</button>
                <button onclick="document.getElementById('tpLibModal').remove()" style="background:rgba(255,255,255,0.15);border:none;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;">×</button>
            </div>
        </div>
        <!-- 2 Main Tabs: Cố Định / 1 Tuần -->
        <div style="display:flex;border-bottom:2px solid #e5e7eb;">
            <button id="tpLibTabFixed" onclick="_tpSwitchLibTab(false)" style="flex:1;padding:12px;font-size:14px;font-weight:700;border:none;cursor:pointer;background:#eff6ff;color:#2563eb;border-bottom:3px solid #2563eb;transition:all .2s;">
                📌 Cố Định <span style="background:#2563eb;color:white;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-left:4px;">${fixedCount}</span>
            </button>
            <button id="tpLibTabWeekly" onclick="_tpSwitchLibTab(true)" style="flex:1;padding:12px;font-size:14px;font-weight:700;border:none;cursor:pointer;background:#f9fafb;color:#6b7280;border-bottom:3px solid transparent;transition:all .2s;">
                📅 Chỉ 1 Tuần <span style="background:#e5e7eb;color:#374151;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-left:4px;">${weeklyCount}</span>
            </button>
        </div>
        <!-- Dept sub-filter -->
        <div id="tpLibDeptFilter" style="padding:10px 22px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:6px;overflow-x:auto;"></div>
        <div id="tpLibList" style="flex:1;overflow-y:auto;padding:12px 22px;"></div>
    </div>`;
    document.body.appendChild(modal);
    // Initial add button visibility (Fixed tab is default)
    if (!_tpIsDirector) {
        const addBtn = document.getElementById('tpLibAddBtn');
        if (addBtn) addBtn.style.display = 'none';
    }
    _tpUpdateLibDeptFilter();
    _tpRenderLibList();
}

let _tpLibFilterWeekly = false;

function _tpSwitchLibTab(isWeekly) {
    _tpLibFilterWeekly = isWeekly;
    _tpLibFilterDeptId = '';
    // Update tab styles
    const fixedTab = document.getElementById('tpLibTabFixed');
    const weeklyTab = document.getElementById('tpLibTabWeekly');
    if (fixedTab) {
        fixedTab.style.background = !isWeekly ? '#eff6ff' : '#f9fafb';
        fixedTab.style.color = !isWeekly ? '#2563eb' : '#6b7280';
        fixedTab.style.borderBottom = !isWeekly ? '3px solid #2563eb' : '3px solid transparent';
        const badge = fixedTab.querySelector('span');
        if (badge) { badge.style.background = !isWeekly ? '#2563eb' : '#e5e7eb'; badge.style.color = !isWeekly ? 'white' : '#374151'; }
    }
    if (weeklyTab) {
        weeklyTab.style.background = isWeekly ? '#fff7ed' : '#f9fafb';
        weeklyTab.style.color = isWeekly ? '#ea580c' : '#6b7280';
        weeklyTab.style.borderBottom = isWeekly ? '3px solid #ea580c' : '3px solid transparent';
        const badge = weeklyTab.querySelector('span');
        if (badge) { badge.style.background = isWeekly ? '#ea580c' : '#e5e7eb'; badge.style.color = isWeekly ? 'white' : '#374151'; }
    }
    // Show/hide add button based on permissions
    const addBtn = document.getElementById('tpLibAddBtn');
    if (addBtn) {
        const canAdd = isWeekly || _tpIsDirector; // Fixed: only director; Weekly: all managers
        addBtn.style.display = canAdd ? '' : 'none';
    }
    _tpUpdateLibDeptFilter();
    _tpRenderLibList();
}

function _tpUpdateLibDeptFilter() {
    const wrap = document.getElementById('tpLibDeptFilter');
    if (!wrap) return;
    const filtered = _tpLibraryTasks.filter(t => !!t.is_weekly === _tpLibFilterWeekly);
    const deptCounts = {};
    filtered.forEach(t => { const did = t.department_id || 0; deptCounts[did] = (deptCounts[did] || 0) + 1; });
    
    const totalCount = filtered.length;
    let html = `<button class="tpLibDeptTab" data-id="" onclick="_tpSelectLibDept('')" style="padding:5px 12px;border-radius:16px;border:${!_tpLibFilterDeptId ? '2px solid #2563eb' : '1px solid #e5e7eb'};background:${!_tpLibFilterDeptId ? '#eff6ff' : 'white'};color:${!_tpLibFilterDeptId ? '#2563eb' : '#374151'};cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;">Tất cả <span style="background:${!_tpLibFilterDeptId ? '#2563eb' : '#e5e7eb'};color:${!_tpLibFilterDeptId ? 'white' : '#374151'};padding:0 6px;border-radius:8px;font-size:10px;margin-left:3px;">${totalCount}</span></button>`;
    
    _tpAllDepts.filter(d => (deptCounts[d.id] || 0) > 0).forEach(d => {
        const cnt = deptCounts[d.id];
        const active = String(_tpLibFilterDeptId) === String(d.id);
        html += `<button class="tpLibDeptTab" data-id="${d.id}" onclick="_tpSelectLibDept('${d.id}')" style="padding:5px 12px;border-radius:16px;border:${active ? '2px solid #2563eb' : '1px solid #e5e7eb'};background:${active ? '#eff6ff' : 'white'};color:${active ? '#2563eb' : '#374151'};cursor:pointer;font-size:11px;font-weight:600;white-space:nowrap;">${d.name} <span style="background:${active ? '#2563eb' : '#e5e7eb'};color:${active ? 'white' : '#374151'};padding:0 6px;border-radius:8px;font-size:10px;margin-left:3px;">${cnt}</span></button>`;
    });
    wrap.innerHTML = html;
}

function _tpSelectLibDept(deptId) {
    _tpLibFilterDeptId = deptId;
    _tpUpdateLibDeptFilter();
    _tpRenderLibList();
}

async function _tpLoadLibrary() {
    try {
        const url = _tpLibFilterDeptId ? `/api/task-library?department_id=${_tpLibFilterDeptId}` : '/api/task-library';
        const d = await apiCall(url);
        _tpLibraryTasks = d.tasks || [];
    } catch(e) { _tpLibraryTasks = []; }
    _tpRenderLibList();
}

function _tpRenderLibList() {
    const wrap = document.getElementById('tpLibList');
    if (!wrap) return;

    let filtered = _tpLibraryTasks.filter(t => !!t.is_weekly === _tpLibFilterWeekly);
    if (_tpLibFilterDeptId) filtered = filtered.filter(t => t.department_id === Number(_tpLibFilterDeptId));

    const tabLabel = _tpLibFilterWeekly ? '📅 1 Tuần' : '📌 Cố Định';
    if (filtered.length === 0) {
        wrap.innerHTML = `<div style="padding:30px;text-align:center;color:#9ca3af;font-size:14px;">📦 Chưa có công việc ${tabLabel} nào.<br>Ấn <b>＋ Thêm CV mới</b> để bắt đầu.</div>`;
        return;
    }

    // Group by department
    const byDept = {};
    filtered.forEach(t => {
        const key = t.dept_name || 'Chưa gán phòng';
        if (!byDept[key]) byDept[key] = [];
        byDept[key].push(t);
    });

    let html = '';
    Object.keys(byDept).sort().forEach(deptName => {
        html += `<div style="margin-bottom:16px;">
            <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #f3f4f6;">🏢 ${deptName} (${byDept[deptName].length})</div>`;
        byDept[deptName].forEach(t => {
            const c = _tpGetTaskColor(t.task_name);
            const canManage = _tpLibFilterWeekly || _tpIsDirector; // Fixed: only director; Weekly: all managers
            html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:${c.bg};border:1px solid ${c.border};border-left:3px solid ${c.badge};border-radius:8px;margin-bottom:6px;">
                <div style="flex:1;">
                    <div style="font-weight:700;color:${c.text};font-size:14px;">${t.task_name}</div>
                    <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
                        <span style="background:${c.badge};color:white;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:700;">${t.points}đ</span>
                        <span style="background:${c.tag};color:${c.text};padding:1px 6px;border-radius:4px;font-size:10px;">≥ ${t.min_quantity} lần</span>
                        ${t.requires_approval ? '<span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:4px;font-size:10px;">🔒 Duyệt</span>' : ''}
                        ${t.guide_url ? '<span style="font-size:10px;color:#2563eb;">📘 Có HD</span>' : ''}
                    </div>
                </div>
                ${canManage ? `<div style="display:flex;gap:4px;">
                    <button onclick="_tpEditLibTask(${t.id})" style="padding:4px 10px;border:1px solid ${c.border};border-radius:5px;background:white;color:${c.text};font-size:11px;cursor:pointer;">✏️</button>
                    <button onclick="_tpDeleteLibTask(${t.id})" style="padding:4px 10px;border:1px solid #fecaca;border-radius:5px;background:#fff5f5;color:#dc2626;font-size:11px;cursor:pointer;">🗑️</button>
                </div>` : '<div style="font-size:10px;color:#9ca3af;padding:4px 8px;">👁️ Xem</div>'}
            </div>`;
        });
        html += `</div>`;
    });
    wrap.innerHTML = html;
}

function _tpShowLibAddModal(editTask, isWeekly) {
    const isEdit = !!editTask;
    if (isEdit && editTask.is_weekly !== undefined) isWeekly = editTask.is_weekly;
    const typeLabel = isWeekly ? '📅 Chỉ 1 Tuần' : '📌 Cố Định';
    const typeBg = isWeekly ? '#fff7ed' : '#eff6ff';
    const typeColor = isWeekly ? '#ea580c' : '#2563eb';
    const m = document.createElement('div');
    m.id = 'tpLibAddModal';
    m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:10000;';
    m.innerHTML = `
    <div style="background:white;border-radius:12px;padding:22px;width:min(440px,90vw);border:1px solid #e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="margin:0;font-size:16px;color:#122546;">${isEdit ? '✏️ Sửa công việc' : '＋ Thêm công việc vào kho'}</h3>
            <span style="background:${typeBg};color:${typeColor};padding:4px 12px;border-radius:12px;font-size:11px;font-weight:700;border:1px solid ${typeColor}30;">${typeLabel}</span>
        </div>
        <input type="hidden" id="tpLibIsWeekly" value="${isWeekly ? '1' : '0'}" />
        <div style="margin-bottom:12px;">
            <label style="font-weight:600;font-size:12px;color:#374151;">Phòng ban <span style="color:#dc2626;">*</span></label>
            <select id="tpLibDept" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;margin-top:4px;box-sizing:border-box;">
                <option value="">-- Chọn phòng --</option>
                ${_tpAllDepts.map(d => `<option value="${d.id}" ${editTask && editTask.department_id === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-weight:600;font-size:12px;color:#374151;">Tên công việc <span style="color:#dc2626;">*</span></label>
            <input id="tpLibName" type="text" value="${editTask ? editTask.task_name : ''}" placeholder="VD: Gọi điện Telesale" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;margin-top:4px;box-sizing:border-box;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
                <label style="font-weight:600;font-size:12px;color:#374151;">Điểm <span style="color:#dc2626;">*</span></label>
                <input id="tpLibPoints" type="number" value="${editTask ? editTask.points : 20}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;margin-top:4px;box-sizing:border-box;">
            </div>
            <div>
                <label style="font-weight:600;font-size:12px;color:#374151;">SL tối thiểu phải làm <span style="color:#dc2626;">*</span></label>
                <input id="tpLibMinQty" type="number" value="${editTask ? editTask.min_quantity : 1}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;margin-top:4px;box-sizing:border-box;">
            </div>
        </div>
        <div style="margin-bottom:12px;">
            <label style="font-weight:600;font-size:12px;color:#374151;">Link hướng dẫn <span style="color:#dc2626;">*</span></label>
            <input id="tpLibGuide" type="url" value="${editTask ? (editTask.guide_url || '') : ''}" placeholder="https://..." style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;margin-top:4px;box-sizing:border-box;">
        </div>
        <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <label style="font-weight:600;font-size:12px;color:#374151;">📥 Yêu cầu đầu vào CV <span style="color:#dc2626;">*</span></label>
                <button type="button" onclick="_tpAddReqItem('tpLibInputReqs')" style="padding:2px 10px;font-size:14px;border:1px solid #2563eb;border-radius:5px;background:#eff6ff;color:#2563eb;cursor:pointer;font-weight:700;">＋</button>
            </div>
            <div id="tpLibInputReqs">${_tpRenderReqItems(editTask ? _tpParseJSON(editTask.input_requirements) : [''])}</div>
        </div>
        <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <label style="font-weight:600;font-size:12px;color:#374151;">📤 Yêu cầu đầu ra CV <span style="color:#dc2626;">*</span></label>
                <button type="button" onclick="_tpAddReqItem('tpLibOutputReqs')" style="padding:2px 10px;font-size:14px;border:1px solid #059669;border-radius:5px;background:#ecfdf5;color:#059669;cursor:pointer;font-weight:700;">＋</button>
            </div>
            <div id="tpLibOutputReqs">${_tpRenderReqItems(editTask ? _tpParseJSON(editTask.output_requirements) : [''])}</div>
        </div>
        <div style="display:none;">
            <input type="checkbox" id="tpLibApproval" ${editTask && editTask.requires_approval ? 'checked' : ''}>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button onclick="document.getElementById('tpLibAddModal').remove()" style="padding:8px 16px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
            <button onclick="_tpSaveLibTask(${isEdit ? editTask.id : 'null'})" style="padding:8px 20px;border:none;border-radius:6px;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:600;">💾 Lưu</button>
        </div>
    </div>`;
    document.body.appendChild(m);
}

function _tpParseJSON(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch(e) { return []; }
}

function _tpRenderReqItems(items) {
    if (!items || items.length === 0) items = [''];
    return items.map((item, i) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;" class="tpReqRow">
            <span style="font-size:11px;font-weight:700;color:#6b7280;min-width:20px;">${i + 1}.</span>
            <input type="text" class="tpReqInput" value="${(item || '').replace(/"/g, '&quot;')}" placeholder="Nhập yêu cầu..." style="flex:1;padding:6px 10px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;box-sizing:border-box;">
            <button type="button" onclick="_tpRemoveReqItem(this)" style="padding:2px 8px;font-size:12px;border:1px solid #fecaca;border-radius:4px;background:#fff5f5;color:#dc2626;cursor:pointer;" title="Xóa">🗑️</button>
        </div>
    `).join('');
}

function _tpAddReqItem(containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    const count = wrap.querySelectorAll('.tpReqRow').length;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
    div.className = 'tpReqRow';
    div.innerHTML = `
        <span style="font-size:11px;font-weight:700;color:#6b7280;min-width:20px;">${count + 1}.</span>
        <input type="text" class="tpReqInput" placeholder="Nhập yêu cầu..." style="flex:1;padding:6px 10px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;box-sizing:border-box;">
        <button type="button" onclick="_tpRemoveReqItem(this)" style="padding:2px 8px;font-size:12px;border:1px solid #fecaca;border-radius:4px;background:#fff5f5;color:#dc2626;cursor:pointer;" title="Xóa">🗑️</button>
    `;
    wrap.appendChild(div);
    div.querySelector('.tpReqInput').focus();
}

function _tpRemoveReqItem(btn) {
    const row = btn.closest('.tpReqRow');
    const wrap = row.parentElement;
    if (wrap.querySelectorAll('.tpReqRow').length <= 1) {
        showToast('Phải có ít nhất 1 yêu cầu!', 'error');
        return;
    }
    row.remove();
    // Re-number
    wrap.querySelectorAll('.tpReqRow').forEach((r, i) => {
        const num = r.querySelector('span');
        if (num) num.textContent = (i + 1) + '.';
    });
}

function _tpCollectReqItems(containerId) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return [];
    return [...wrap.querySelectorAll('.tpReqInput')].map(el => el.value.trim()).filter(v => v);
}

function _tpRenderReqReadonly(items) {
    if (!items || items.length === 0) return '<div style="font-size:12px;color:#9ca3af;padding:4px 0;">Không có</div>';
    return items.map((item, i) => `
        <div class="tpReqReadonlyItem" style="display:flex;align-items:center;gap:6px;margin-bottom:3px;padding:5px 10px;background:#f3f4f6;border-radius:5px;font-size:12px;color:#374151;">
            <span style="font-weight:700;color:#6b7280;min-width:20px;">${i + 1}.</span>
            ${(item || '')}
        </div>
    `).join('');
}

async function _tpSaveLibTask(editId) {
    const dept = document.getElementById('tpLibDept')?.value;
    const name = document.getElementById('tpLibName')?.value?.trim();
    const points = document.getElementById('tpLibPoints')?.value;
    const minQty = document.getElementById('tpLibMinQty')?.value;
    const guide = document.getElementById('tpLibGuide')?.value?.trim();
    const approval = document.getElementById('tpLibApproval')?.checked;
    const isWeekly = document.getElementById('tpLibIsWeekly')?.value === '1';

    if (!name) { showToast('Nhập tên công việc!', 'error'); return; }
    if (!dept) { showToast('Chọn phòng ban!', 'error'); return; }
    if (!points || Number(points) <= 0) { showToast('Nhập điểm!', 'error'); return; }
    if (!minQty || Number(minQty) <= 0) { showToast('Nhập số lượng tối thiểu!', 'error'); return; }
    if (!guide) { showToast('Nhập link hướng dẫn!', 'error'); return; }

    const inputReqs = _tpCollectReqItems('tpLibInputReqs');
    const outputReqs = _tpCollectReqItems('tpLibOutputReqs');
    if (inputReqs.length === 0) { showToast('Nhập ít nhất 1 yêu cầu đầu vào!', 'error'); return; }
    if (outputReqs.length === 0) { showToast('Nhập ít nhất 1 yêu cầu đầu ra!', 'error'); return; }

    const body = { task_name: name, points: Number(points) || 0, min_quantity: Number(minQty) || 1, guide_url: guide || null, requires_approval: approval, department_id: Number(dept), is_weekly: isWeekly, input_requirements: inputReqs, output_requirements: outputReqs };

    try {
        if (editId) {
            await apiCall(`/api/task-library/${editId}`, 'PUT', body);
            showToast('✅ Đã cập nhật');
        } else {
            await apiCall('/api/task-library', 'POST', body);
            showToast('✅ Đã thêm vào kho');
        }
        document.getElementById('tpLibAddModal')?.remove();
        await _tpLoadLibrary();
    } catch(e) { showToast('Lỗi!', 'error'); }
}

function _tpEditLibTask(id) {
    const task = _tpLibraryTasks.find(t => t.id === id);
    if (!task) return;
    _tpShowLibAddModal(task, task.is_weekly);
}

async function _tpDeleteLibTask(id) {
    if (!confirm('Xóa công việc này khỏi kho?')) return;
    try {
        await apiCall(`/api/task-library/${id}`, 'DELETE');
        showToast('✅ Đã xóa');
        await _tpLoadLibrary();
    } catch(e) { showToast('Lỗi!', 'error'); }
}

// ===== THÊM TỪ KHO VÀO GRID =====
let _tpPickerTasks = []; // cache for picker flow
let _tpPickerDayOfWeek = 1;
let _tpPickerFilterWeekly = false; // false = cố định tab, true = 1 tuần tab
let _tpPickerDeptId = null;

async function _tpShowPickFromLibrary(dayOfWeek) {
    _tpPickerDayOfWeek = dayOfWeek;
    _tpPickerFilterWeekly = false;
    // Load library for current dept — resolve dept for individual targets too
    _tpPickerDeptId = null;
    if (_tpTarget.type === 'team') {
        _tpPickerDeptId = _tpTarget.id;
    } else if (_tpTarget.type === 'individual') {
        try {
            const u = await apiCall(`/api/users/${_tpTarget.id}`);
            _tpPickerDeptId = u.user?.department_id || null;
        } catch(e) {}
    }
    let tasks = [];
    try {
        const url = _tpPickerDeptId ? `/api/task-library?department_id=${_tpPickerDeptId}&include_ancestors=true` : '/api/task-library';
        const d = await apiCall(url);
        tasks = d.tasks || [];
    } catch(e) { tasks = []; }

    if (tasks.length === 0) {
        showToast('Kho công việc trống! Hãy thêm CV vào Kho trước.', 'error');
        return;
    }

    _tpPickerTasks = tasks;

    const fixedCount = tasks.filter(t => !t.is_weekly).length;
    const weeklyCount = tasks.filter(t => t.is_weekly).length;

    const modal = document.createElement('div');
    modal.id = 'tpPickModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9999;';

    modal.innerHTML = `
    <div style="background:white;border-radius:14px;padding:0;width:min(520px,92vw);max-height:80vh;overflow:hidden;display:flex;flex-direction:column;border:1px solid #e5e7eb;box-shadow:0 20px 60px rgba(0,0,0,0.15);">
        <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;font-size:16px;color:#122546;">📦 Chọn CV từ Kho — ${DAY_NAMES[dayOfWeek]}</h3>
                <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Click để thêm vào lịch · ${tasks.length} CV có sẵn</div>
            </div>
            <button onclick="document.getElementById('tpPickModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;">×</button>
        </div>
        <!-- 2 Tabs -->
        <div style="display:flex;border-bottom:2px solid #e5e7eb;">
            <button id="tpPickTabFixed" onclick="_tpSwitchPickerTab(false)" style="flex:1;padding:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:#eff6ff;color:#2563eb;border-bottom:3px solid #2563eb;transition:all .2s;">
                📌 Cố Định <span style="background:#2563eb;color:white;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;margin-left:3px;">${fixedCount}</span>
            </button>
            <button id="tpPickTabWeekly" onclick="_tpSwitchPickerTab(true)" style="flex:1;padding:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:#f9fafb;color:#6b7280;border-bottom:3px solid transparent;transition:all .2s;">
                📅 Chỉ 1 Tuần <span style="background:#e5e7eb;color:#374151;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;margin-left:3px;">${weeklyCount}</span>
            </button>
        </div>
        <div id="tpPickList" style="flex:1;overflow-y:auto;padding:12px 20px;"></div>
        <div style="padding:10px 20px;border-top:1px solid #f3f4f6;text-align:center;">
            <button onclick="document.getElementById('tpPickModal').remove();_tpShowTaskModal(null,${dayOfWeek})" style="padding:6px 14px;border:1px dashed #6b7280;border-radius:6px;background:white;color:#6b7280;cursor:pointer;font-size:12px;">✏️ Hoặc tạo thủ công</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    _tpRenderPickerTab();
}

function _tpSwitchPickerTab(isWeekly) {
    _tpPickerFilterWeekly = isWeekly;
    const fixedTab = document.getElementById('tpPickTabFixed');
    const weeklyTab = document.getElementById('tpPickTabWeekly');
    if (fixedTab) {
        fixedTab.style.background = !isWeekly ? '#eff6ff' : '#f9fafb';
        fixedTab.style.color = !isWeekly ? '#2563eb' : '#6b7280';
        fixedTab.style.borderBottom = !isWeekly ? '3px solid #2563eb' : '3px solid transparent';
        const badge = fixedTab.querySelector('span');
        if (badge) { badge.style.background = !isWeekly ? '#2563eb' : '#e5e7eb'; badge.style.color = !isWeekly ? 'white' : '#374151'; }
    }
    if (weeklyTab) {
        weeklyTab.style.background = isWeekly ? '#fff7ed' : '#f9fafb';
        weeklyTab.style.color = isWeekly ? '#ea580c' : '#6b7280';
        weeklyTab.style.borderBottom = isWeekly ? '3px solid #ea580c' : '3px solid transparent';
        const badge = weeklyTab.querySelector('span');
        if (badge) { badge.style.background = isWeekly ? '#ea580c' : '#e5e7eb'; badge.style.color = isWeekly ? 'white' : '#374151'; }
    }
    _tpRenderPickerTab();
}

function _tpRenderPickerTab() {
    const wrap = document.getElementById('tpPickList');
    if (!wrap) return;
    const dayOfWeek = _tpPickerDayOfWeek;
    const currentDeptId = _tpPickerDeptId;

    const filtered = _tpPickerTasks.filter(t => !!t.is_weekly === _tpPickerFilterWeekly);

    if (filtered.length === 0) {
        const tabLabel = _tpPickerFilterWeekly ? '📅 1 Tuần' : '📌 Cố Định';
        wrap.innerHTML = `<div style="padding:30px;text-align:center;color:#9ca3af;font-size:14px;">📦 Chưa có CV ${tabLabel} nào trong kho.</div>`;
        return;
    }

    // Group by department
    const byDept = {};
    filtered.forEach(t => {
        const key = t.dept_name || 'Chưa gán phòng';
        if (!byDept[key]) byDept[key] = { deptId: t.department_id, tasks: [] };
        byDept[key].tasks.push(t);
    });

    let html = '';
    Object.keys(byDept).forEach(deptName => {
        const group = byDept[deptName];
        const isOwn = group.deptId === currentDeptId;
        const icon = isOwn ? '📦' : '📂';
        const label = isOwn ? `CV của ${deptName}` : `CV từ ${deptName}`;
        const labelColor = isOwn ? '#1d4ed8' : '#059669';
        const labelBg = isOwn ? '#eff6ff' : '#ecfdf5';

        html += `<div style="margin-bottom:12px;">
            <div style="font-size:12px;font-weight:700;color:${labelColor};text-transform:uppercase;margin-bottom:6px;padding:6px 10px;background:${labelBg};border-radius:6px;border-left:3px solid ${labelColor};">${icon} ${label} (${group.tasks.length})</div>`;
        group.tasks.forEach(t => {
            const c = _tpGetTaskColor(t.task_name);
            const isFixed = !t.is_weekly;
            const locked = isFixed && !_tpIsDirector;
            if (locked) {
                html += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f3f4f6;border:1px solid #e5e7eb;border-left:3px solid #d1d5db;border-radius:8px;margin-bottom:6px;cursor:not-allowed;opacity:0.6;" title="Chỉ Giám Đốc mới thêm CV cố định vào lịch">
                    <div style="flex:1;">
                        <div style="font-weight:700;color:#9ca3af;font-size:14px;">🔒 ${t.task_name}</div>
                        <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${t.points}đ · ≥${t.min_quantity} lần · 📌 Cố định — Chỉ GĐ</div>
                    </div>
                    <span style="color:#d1d5db;font-size:14px;">🔒</span>
                </div>`;
            } else {
                html += `<div onclick="_tpPickLibTask(${t.id},${dayOfWeek})" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${c.bg};border:1px solid ${c.border};border-left:3px solid ${c.badge};border-radius:8px;margin-bottom:6px;cursor:pointer;transition:all .15s;" onmouseover="this.style.transform='translateX(3px)'" onmouseout="this.style.transform='none'">
                    <div style="flex:1;">
                        <div style="font-weight:700;color:${c.text};font-size:14px;">${t.task_name}</div>
                        <div style="font-size:10px;color:#6b7280;margin-top:2px;">${t.points}đ · ≥${t.min_quantity} lần ${t.requires_approval ? '· 🔒Duyệt' : ''} · <span style="color:${labelColor};font-weight:600;">${deptName}</span></div>
                    </div>
                    <span style="color:${c.badge};font-size:18px;">→</span>
                </div>`;
            }
        });
        html += `</div>`;
    });
    wrap.innerHTML = html;
}

async function _tpPickLibTask(libId, dayOfWeek) {
    // Check picker cache first (includes ancestor tasks), then library cache, then API
    let t = _tpPickerTasks.find(x => x.id === libId) || _tpLibraryTasks.find(x => x.id === libId) || null;
    if (!t) {
        // Fetch from API
        try {
            const d = await apiCall('/api/task-library');
            const found = (d.tasks || []).find(x => x.id === libId);
            if (found) return _tpPickLibTaskDo(found, dayOfWeek);
        } catch(e) {}
        showToast('Không tìm thấy CV!', 'error');
        return;
    }
    _tpPickLibTaskDo(t, dayOfWeek);
}

function _tpPickLibTaskDo(libTask, dayOfWeek) {
    document.getElementById('tpPickModal')?.remove();
    // Pre-fill the task modal with library data
    // Auto-set week_only based on library task type
    const task = {
        task_name: libTask.task_name,
        points: libTask.points,
        min_quantity: libTask.min_quantity,
        guide_url: libTask.guide_url,
        requires_approval: libTask.requires_approval,
        input_requirements: libTask.input_requirements,
        output_requirements: libTask.output_requirements,
        _auto_week_only: libTask.is_weekly ? true : false
    };
    _tpShowTaskModal(null, dayOfWeek, task);
}

// ========== DRAG & DROP (Director only) ==========
let _tpDragData = null;

function _tpDragStart(e, taskId, slot, day) {
    _tpDragData = { taskId, slot, day, clone: e.ctrlKey || e.metaKey };
    e.dataTransfer.effectAllowed = _tpDragData.clone ? 'copy' : 'move';
    e.dataTransfer.setData('text/plain', taskId);
    // Visual: reduce opacity of dragged element
    setTimeout(() => { e.target.style.opacity = '0.4'; }, 0);
    // Show hint
    const hint = document.createElement('div');
    hint.id = '_tpDragHint';
    hint.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#122546;color:white;padding:8px 20px;border-radius:8px;font-size:12px;font-weight:600;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:none;';
    hint.textContent = e.ctrlKey || e.metaKey ? '📋 Nhân bản — thả vào ô đích' : '↕️ Di chuyển — giữ Ctrl để nhân bản';
    document.body.appendChild(hint);
    // Listen for Ctrl key changes during drag
    document.addEventListener('keydown', _tpDragKeyHandler);
    document.addEventListener('keyup', _tpDragKeyHandler);
}

function _tpDragKeyHandler(e) {
    if (e.key === 'Control' || e.key === 'Meta') {
        if (_tpDragData) _tpDragData.clone = e.type === 'keydown';
        const hint = document.getElementById('_tpDragHint');
        if (hint) hint.textContent = e.type === 'keydown' ? '📋 Nhân bản — thả vào ô đích' : '↕️ Di chuyển — giữ Ctrl để nhân bản';
    }
}

function _tpDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = (_tpDragData && _tpDragData.clone) ? 'copy' : 'move';
}

function _tpDragEnter(e) {
    e.preventDefault();
    const td = e.target.closest('td[data-day]');
    if (td) td.style.background = '#ecfdf5';
}

function _tpDragLeave(e) {
    const td = e.target.closest('td[data-day]');
    if (td) td.style.background = '';
}

async function _tpDrop(e) {
    e.preventDefault();
    // Clean up
    document.getElementById('_tpDragHint')?.remove();
    document.removeEventListener('keydown', _tpDragKeyHandler);
    document.removeEventListener('keyup', _tpDragKeyHandler);

    const td = e.target.closest('td[data-day]');
    if (!td || !_tpDragData) return;
    td.style.background = '';

    const targetDay = Number(td.dataset.day);
    const targetSlot = td.dataset.slot;
    if (!targetDay || !targetSlot) return;

    const [newStart, newEnd] = targetSlot.split('|');
    const { taskId, slot: srcSlot, day: srcDay, clone } = _tpDragData;
    _tpDragData = null;

    // Same slot same day = no-op (unless clone)
    if (!clone && targetDay === srcDay && targetSlot === srcSlot) {
        _tpRenderGrid(); // reset opacity
        return;
    }

    try {
        const r = await apiCall('/api/task-points/move-task', 'POST', {
            task_id: taskId,
            new_day: targetDay,
            new_time_start: newStart,
            new_time_end: newEnd,
            clone: !!clone
        });
        if (r.error) {
            showToast('❌ ' + r.error, 'error');
        } else {
            showToast('✅ ' + (r.message || 'Thành công'));
            _tpLoadTasks();
        }
    } catch(err) {
        showToast('Lỗi: ' + (err.message || 'Không thể thực hiện'), 'error');
    }
}

// Reset drag visual on dragend
document.addEventListener('dragend', (e) => {
    if (e.target.draggable) e.target.style.opacity = '1';
    document.getElementById('_tpDragHint')?.remove();
    document.removeEventListener('keydown', _tpDragKeyHandler);
    document.removeEventListener('keyup', _tpDragKeyHandler);
    _tpDragData = null;
});

// ===== SIDEBAR STT REORDER MODAL (giam_doc only) =====
let _tpParentSttCounter = 0;
let _tpChildSttCounter = 0;

function _tpShowReorderModal() {
    // Get current active depts from sidebar
    const list = document.getElementById('tpDeptList');
    if (!list) return;

    // Build tree structure from _tpAllDepts that are active
    const activeHeaders = list.querySelectorAll('.tp-dept-header');
    const activeIds = new Set([...activeHeaders].map(h => Number(h.dataset.id)));
    const activeDepts = _tpAllDepts.filter(d => activeIds.has(d.id));
    
    // Separate parents and children
    const parents = activeDepts.filter(d => !d.parent_id || !activeDepts.some(p => p.id === d.parent_id))
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    let rowsHtml = '';
    let parentIdx = 0;
    parents.forEach(p => {
        parentIdx++;
        rowsHtml += `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #f3f4f6;background:#f8fafc;">
                <input type="number" min="1" class="_tpSttInput" data-id="${p.id}" data-level="parent" value="${p.display_order !== null && p.display_order !== undefined ? p.display_order + 1 : parentIdx}" style="width:50px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;font-weight:700;text-align:center;color:#2563eb;outline:none;" onfocus="this.style.borderColor='#2563eb';this.select()" onblur="this.style.borderColor='#d1d5db'">
                <span style="font-weight:700;color:#122546;font-size:13px;">${p.name}</span>
            </div>`;
        // Children of this parent
        const children = activeDepts.filter(c => c.parent_id === p.id)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        children.forEach((c, ci) => {
            rowsHtml += `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 14px 8px 36px;border-bottom:1px solid #f9fafb;">
                <input type="number" min="1" class="_tpSttInput" data-id="${c.id}" data-level="child" data-parent="${p.id}" value="${c.display_order !== null && c.display_order !== undefined ? c.display_order + 1 : ci + 1}" style="width:46px;padding:5px 6px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;text-align:center;color:#059669;outline:none;" onfocus="this.style.borderColor='#059669';this.select()" onblur="this.style.borderColor='#e5e7eb'">
                <span style="color:#6b7280;font-size:12px;">└ ${c.name}</span>
            </div>`;
        });
    });

    const modal = document.createElement('div');
    modal.id = '_tpReorderModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
    <div style="background:white;border-radius:12px;width:min(420px,90vw);max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
        <div style="padding:18px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3 style="margin:0;font-size:16px;color:#122546;font-weight:700;">🔢 Sắp xếp thứ tự phòng ban</h3>
                <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Nhập số STT — số nhỏ hiển trước</div>
            </div>
            <button onclick="document.getElementById('_tpReorderModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;line-height:1;">×</button>
        </div>
        <div style="overflow-y:auto;flex:1;">
            ${rowsHtml}
        </div>
        <div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:8px;">
            <button onclick="document.getElementById('_tpReorderModal').remove()" style="padding:8px 16px;border-radius:6px;border:1px solid #d1d5db;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
            <button onclick="_tpSaveReorder()" style="padding:8px 20px;border-radius:6px;border:none;background:#2563eb;color:white;cursor:pointer;font-size:13px;font-weight:600;">✅ Lưu thứ tự</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
}

async function _tpSaveReorder() {
    const inputs = document.querySelectorAll('._tpSttInput');
    const orders = [];
    inputs.forEach(inp => {
        const id = Number(inp.dataset.id);
        const stt = Number(inp.value) || 0;
        // Store as 0-indexed (STT 1 = display_order 0)
        orders.push({ id, display_order: stt - 1 });
    });
    try {
        await apiCall('/api/task-points/reorder-departments', 'PUT', { orders });
        showToast('✅ Đã lưu thứ tự');
        document.getElementById('_tpReorderModal')?.remove();
        // Reload page to reflect new order
        const content = document.getElementById('content') || document.querySelector('[id="content"]');
        if (content) renderBanGiaoDiemPage(content);
    } catch(e) {
        showToast('Lỗi lưu thứ tự', 'error');
    }
}

// ===== MONTH VIEW =====
async function _tpShowMonthView(monthStr) {
    if (!monthStr) return;
    // Validate format: must be YYYY-MM (4-digit year)
    if (!/^\d{4}-\d{2}$/.test(monthStr)) return;
    // Parse robustly via Date
    const parsedDate = new Date(monthStr + '-01');
    const year = parsedDate.getFullYear();
    const month = parsedDate.getMonth() + 1; // 1-indexed
    if (isNaN(year) || year < 2020 || year > 2100) return;
    const wrap = document.getElementById('tpGridWrap');
    if (!wrap) return;

    // Load month data from snapshot API (past = snapshots, future = templates)
    let dayData = {};
    let snapshotDates = [];
    try {
        if (_tpTarget.id) {
            const r = await apiCall(`/api/task-points/month-data?target_type=${_tpTarget.type}&target_id=${_tpTarget.id}&month=${monthStr}`);
            dayData = r.dayData || {};
            snapshotDates = r.snapshotDates || [];
        }
    } catch(e) {}

    // Fetch change log to mark modified tasks
    let changedTaskNames = new Set();
    try {
        const logR = await apiCall(`/api/task-points/change-log?target_type=${_tpTarget.type || 'team'}&target_id=${_tpTarget.id}&limit=100`);
        (logR.logs || []).forEach(log => {
            if (log.task_name) changedTaskNames.add(log.task_name);
        });
    } catch(e) {}

    // Calculate weeks of the month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    let startMon = new Date(firstDay);
    const dow = startMon.getDay() || 7;
    startMon.setDate(startMon.getDate() - (dow - 1));

    const weeks = [];
    let cursor = new Date(startMon);
    while (cursor <= lastDay || cursor.getDay() !== 1) {
        const weekStart = new Date(cursor);
        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            weekDays.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        weeks.push({ start: weekStart, days: weekDays });
        if (cursor > lastDay && cursor.getDay() === 1) break;
    }

    const today = new Date(); today.setHours(0,0,0,0);
    const monthNames = ['','Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

    // Compute prev/next month strings
    const prevY = month <= 1 ? year - 1 : year;
    const prevM = month <= 1 ? 12 : month - 1;
    const nextY = month >= 12 ? year + 1 : year;
    const nextM = month >= 12 ? 1 : month + 1;
    const prevStr = prevY + '-' + String(prevM).padStart(2, '0');
    const nextStr = nextY + '-' + String(nextM).padStart(2, '0');
    const titleStr = '📆 ' + monthNames[month] + ' ' + String(year);

    let html = `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:2px solid #e5e7eb;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:10px 10px 0 0;">
        <div style="font-weight:800;color:#122546;font-size:16px;">${titleStr}</div>
        <div style="display:flex;gap:6px;">
            <button onclick="_tpShowMonthView('${prevStr}')" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">◀</button>
            <button onclick="_tpLoadTasks()" style="padding:4px 12px;border:1px solid #2563eb;border-radius:6px;background:#eff6ff;color:#2563eb;cursor:pointer;font-size:12px;font-weight:600;">⬅ Xem tuần</button>
            <button onclick="_tpShowMonthView('${nextStr}')" style="padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;background:white;color:#374151;cursor:pointer;font-size:12px;font-weight:600;">▶</button>
        </div>
    </div>`;

    html += `<table style="width:100%;border-collapse:collapse;font-size:12px;">`;
    html += `<thead><tr>`;
    const dayHeaders = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','CN'];
    dayHeaders.forEach(h => {
        html += `<th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb;font-weight:700;color:#6b7280;font-size:11px;text-transform:uppercase;background:#f8fafc;width:${100/7}%;">${h}</th>`;
    });
    html += `</tr></thead><tbody>`;

    weeks.forEach(week => {
        html += `<tr>`;
        week.days.forEach((day, idx) => {
            const isThisMonth = day.getMonth() === month - 1;
            const isToday = day.getTime() === today.getTime();
            const dayNum = day.getDate();
            const isPast = day < today;

            // Get tasks for this specific date from dayData
            const dateStr = _tpDateStr(day);
            const dayTasks = dayData[dateStr] || [];
            const totalPts = dayTasks.reduce((s, t) => s + (t.points || 0), 0);
            const hasSnapshot = snapshotDates.includes(dateStr);

            // Click on week to drill into week view
            const weekMonday = new Date(week.start);

            // Past + no snapshot = gray "no data" state
            const noData = isPast && !hasSnapshot && dayTasks.length === 0;

            html += `<td style="padding:6px 8px;border:1px solid #f1f5f9;vertical-align:top;min-height:80px;height:80px;background:${isToday ? '#eff6ff' : noData ? '#f9fafb' : isPast ? '#fafbfc' : 'white'};${!isThisMonth ? 'opacity:0.4;' : ''}cursor:pointer;transition:background .15s;" 
                onclick="_tpGoToWeek('${_tpDateStr(weekMonday)}')" 
                onmouseover="this.style.background='${isToday ? '#dbeafe' : '#f8fafc'}'" 
                onmouseout="this.style.background='${isToday ? '#eff6ff' : noData ? '#f9fafb' : isPast ? '#fafbfc' : 'white'}'">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <span style="font-weight:${isToday ? '800' : '600'};font-size:${isToday ? '14px' : '12px'};color:${isToday ? '#2563eb' : '#374151'};">${dayNum}</span>
                    ${totalPts > 0 ? `<span style="font-size:9px;padding:1px 5px;border-radius:8px;font-weight:700;background:${totalPts >= 100 ? '#dcfce7' : '#fef3c7'};color:${totalPts >= 100 ? '#16a34a' : '#d97706'};">${totalPts}đ</span>` : ''}
                </div>`;

            if (noData && isThisMonth) {
                html += `<div style="font-size:8px;color:#d1d5db;text-align:center;margin-top:8px;">—</div>`;
            } else {
                // Show max 3 task names
                dayTasks.slice(0, 3).forEach(t => {
                    const c = _tpGetTaskColor(t.task_name);
                    const hasChange = changedTaskNames.has(t.task_name);
                    html += `<div style="font-size:9px;padding:1px 4px;margin-bottom:2px;border-radius:3px;background:${c.bg};color:${c.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:2px solid ${hasChange ? '#f59e0b' : c.badge};display:flex;align-items:center;gap:2px;">${hasChange ? '<span title="Đã thay đổi" style="flex-shrink:0;">🔄</span>' : ''}${t.task_name}</div>`;
                });
                if (dayTasks.length > 3) {
                    html += `<div style="font-size:8px;color:#9ca3af;">+${dayTasks.length - 3} khác</div>`;
                }
            }
            if (isPast && isThisMonth && hasSnapshot) {
                html += `<div style="font-size:8px;color:#d1d5db;margin-top:2px;">🔒</div>`;
            }

            html += `</td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table>`;
    wrap.innerHTML = html;
}

function _tpGoToWeek(weekStartStr) {
    _tpCurrentWeekStart = new Date(weekStartStr);
    _tpLoadTasks();
}

// ===== CHANGE LOG POPUP =====
async function _tpShowChangeLog() {
    const targetId = _tpTarget.id;
    const targetType = _tpTarget.type || 'team';
    
    let logs = [];
    try {
        const r = await apiCall(`/api/task-points/change-log?target_type=${targetType}&target_id=${targetId}&limit=50`);
        logs = r.logs || [];
    } catch(e) {}

    // Group by month
    const byMonth = {};
    logs.forEach(log => {
        const d = new Date(log.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const label = `Tháng ${d.getMonth()+1}/${d.getFullYear()}`;
        if (!byMonth[key]) byMonth[key] = { label, items: [] };
        byMonth[key].items.push(log);
    });

    const actionIcons = { add: '➕', edit: '✏️', delete: '🗑️' };
    const actionLabels = { add: 'Thêm', edit: 'Sửa', delete: 'Xóa' };

    let logHtml = '';
    const sortedMonths = Object.keys(byMonth).sort().reverse();
    if (sortedMonths.length === 0) {
        logHtml = '<div style="padding:30px;text-align:center;color:#9ca3af;">Chưa có thay đổi nào.</div>';
    } else {
        sortedMonths.forEach(key => {
            const group = byMonth[key];
            logHtml += `<div style="padding:8px 14px;background:#f1f5f9;font-weight:700;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">📅 ${group.label}</div>`;
            group.items.forEach(log => {
                const d = new Date(log.created_at);
                const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                const icon = actionIcons[log.action] || '📝';
                const label = actionLabels[log.action] || log.action;
                logHtml += `<div style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;display:flex;align-items:flex-start;gap:8px;">
                    <span>${icon}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;color:#1e293b;">${label}: <span style="color:#2563eb;">${log.task_name || ''}</span></div>
                        <div style="font-size:10px;color:#94a3b8;margin-top:2px;">👤 ${log.changed_by_name || 'N/A'} — ${time}</div>
                    </div>
                </div>`;
            });
        });
    }

    // Create modal
    document.getElementById('_tpChangeLogModal')?.remove();
    const modal = document.createElement('div');
    modal.id = '_tpChangeLogModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `<div style="background:white;border-radius:14px;width:440px;max-height:70vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.15);display:flex;flex-direction:column;" onclick="event.stopPropagation()">
        <div style="padding:16px 20px;border-bottom:2px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:14px 14px 0 0;">
            <div style="font-weight:800;font-size:15px;color:#1e293b;">📝 Lịch sử thay đổi</div>
            <button onclick="this.closest('#_tpChangeLogModal').remove()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#94a3b8;padding:4px;">✕</button>
        </div>
        <div style="overflow-y:auto;flex:1;">
            ${logHtml}
        </div>
    </div>`;
    document.body.appendChild(modal);
}

