// ========== GỌI ĐIỆN TELESALE — PREMIUM UI ==========

let _gd_selectedUserId = null;
let _gd_selectedUserName = '';
let _gd_datePreset = 'today';
let _gd_dateFrom = '';
let _gd_dateTo = '';
let _gd_calls = [];
let _gd_stats = null;
let _gd_prevStats = null;
let _gd_sources = [];
let _gd_answerStatuses = [];
let _gd_activeSourceFilter = null;
let _gd_activeCrmTab = null;
let _gd_statusFilter = null;
function _gd_filterByCard(key) {
    _gd_statusFilter = _gd_statusFilter === key ? null : key;
    if (_gd_selectedUserId) _gd_loadCallsForUser(_gd_selectedUserId);
}

function _gd_getDateRange() {
    const today = new Date(); today.setHours(0,0,0,0);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    switch (_gd_datePreset) {
        case 'today': return { from: fmt(today), to: fmt(today) };
        case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); return { from: fmt(y), to: fmt(y) }; }
        case '7days': { const d = new Date(today); d.setDate(d.getDate()-6); return { from: fmt(d), to: fmt(today) }; }
        case 'this_month': { const m = new Date(today.getFullYear(), today.getMonth(), 1); return { from: fmt(m), to: fmt(today) }; }
        case 'last_month': { const m1 = new Date(today.getFullYear(), today.getMonth()-1, 1); const m2 = new Date(today.getFullYear(), today.getMonth(), 0); return { from: fmt(m1), to: fmt(m2) }; }
        case 'custom': return { from: _gd_dateFrom, to: _gd_dateTo };
        case 'all': return { from: '2020-01-01', to: fmt(today) };
        default: return { from: fmt(today), to: fmt(today) };
    }
}
function _gd_switchDatePreset(preset) {
    _gd_datePreset = preset;
    if (preset === 'custom') return;
    if (_gd_selectedUserId) _gd_loadCallsForUser(_gd_selectedUserId);
}
function _gd_applyCustomDate() {
    _gd_dateFrom = document.getElementById('gdDateFrom')?.value || '';
    _gd_dateTo = document.getElementById('gdDateTo')?.value || '';
    if (_gd_dateFrom && _gd_dateTo && _gd_selectedUserId) _gd_loadCallsForUser(_gd_selectedUserId);
}
const _gd_CRM_TABS = [
    { value: null, label: 'Tất cả', icon: '📋', grad: 'linear-gradient(135deg,#122546,#1e3a5f)', color: '#122546' },
    { value: 'hoa_hong_crm', label: 'CRM Tự Tìm Kiếm', icon: '🔍', grad: 'linear-gradient(135deg,#2563eb,#3b82f6)', color: '#2563eb' },
    { value: 'nuoi_duong', label: 'CRM Giới Thiệu Hợp Tác', icon: '🤝', grad: 'linear-gradient(135deg,#059669,#10b981)', color: '#059669' },
    { value: 'sinh_vien', label: 'CRM Gọi Bán Hàng', icon: '🛒', grad: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#f59e0b' },
];
let _gd_isManager = false;
let _gd_allUsers = [];
let _gd_allDepts = [];
let _gd_memberIds = new Set();
let _gd_sidebarDeptFilter = '';

async function renderGoiDienPage(container) {
    _gd_isManager = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role);
    container.innerHTML = `
        <div style="display:flex;height:calc(100vh - 120px);gap:0;">
            <div id="gdSidebar" style="width:280px;min-width:280px;background:linear-gradient(180deg,#f8fafc,#f1f5f9);border-right:1.5px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;">
                <div style="padding:14px;border-bottom:1.5px solid #e2e8f0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <h4 style="margin:0;color:#122546;font-size:14px;font-weight:800;">📞 Gọi Điện Telesale</h4>
                        ${currentUser.role === 'giam_doc' ? `<button class="ts-btn ts-btn-ghost" style="font-size:11px;padding:4px 10px;" onclick="_gd_openSettings()">⚙️ Cài đặt</button>` : ''}
                    </div>
                    <select id="gdDeptFilter" class="ts-select" style="width:100%;margin-bottom:8px;padding:8px 10px;" onchange="_gd_sidebarDeptFilter=this.value;_gd_renderSidebar()">
                        <option value="">📁 Tất cả phòng ban</option>
                    </select>
                </div>
                <div id="gdSidebarList" class="ts-scroll" style="flex:1;overflow:auto;padding:8px;"></div>
            </div>
            <div id="gdContent" style="flex:1;overflow:auto;padding:20px;">
                <div class="ts-empty">
                    <span class="ts-empty-icon">👈</span>
                    <div class="ts-empty-title">Chọn nhân viên bên trái</div>
                    <div class="ts-empty-desc">Chọn NV để xem danh sách SĐT gọi điện hôm nay</div>
                </div>
            </div>
        </div>`;

    const [srcRes, statusRes, usersRes, deptsRes, membersRes] = await Promise.all([
        apiCall('/api/telesale/sources'),
        apiCall('/api/telesale/answer-statuses'),
        apiCall('/api/users'),
        apiCall('/api/departments'),
        apiCall('/api/telesale/active-members')
    ]);
    _gd_sources = srcRes.sources || [];
    _gd_answerStatuses = statusRes.statuses || [];
    _gd_allUsers = (usersRes.users || usersRes || []).filter(u => u.status === 'active');
    _gd_allDepts = deptsRes.departments || deptsRes || [];
    _gd_memberIds = new Set((membersRes.members || []).filter(m => m.is_active).map(m => m.user_id));

    // Populate dept filter
    const deptSelect = document.getElementById('gdDeptFilter');
    if (deptSelect) {
        const deptsWithMembers = _gd_allDepts.filter(d => _gd_allUsers.some(u => u.department_id === d.id && _gd_memberIds.has(u.id)));
        deptsWithMembers.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id; opt.textContent = d.name;
            deptSelect.appendChild(opt);
        });
    }

    // TP/NV: auto-select themselves
    const _canSeeOthers = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'].includes(currentUser.role);
    if (!_canSeeOthers) {
        _gd_selectedUserId = currentUser.id;
        _gd_selectedUserName = currentUser.full_name || currentUser.username;
    }
    _gd_renderSidebar();
    if (_gd_selectedUserId) await _gd_loadCallsForUser(_gd_selectedUserId);
    else { // auto-select first
        const first = _gd_allUsers.find(u => _gd_memberIds.has(u.id));
        if (first) { _gd_selectedUserId = first.id; _gd_selectedUserName = first.full_name || first.username; await _gd_loadCallsForUser(first.id); }
    }
}

function _gd_avatarColor(n) { let h=0; for(let i=0;i<(n||'').length;i++) h=n.charCodeAt(i)+((h<<5)-h); return ['#3b82f6','#059669','#f59e0b','#8b5cf6','#06b6d4','#f43f5e','#ec4899','#6366f1'][Math.abs(h)%8]; }
function _gd_initials(n) { if(!n) return '?'; const p=n.trim().split(/\s+/); return p.length>1?(p[0][0]+p[p.length-1][0]).toUpperCase():n.substring(0,2).toUpperCase(); }

function _gd_renderSidebar() {
    const list = document.getElementById('gdSidebarList');
    if (!list) return;

    const isMgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly'].includes(currentUser.role);

    // Filter members
    let filtered = _gd_allUsers.filter(u => {
        if (!_gd_memberIds.has(u.id)) return false;
        if (!isMgr && u.id !== currentUser.id) return false; // TP/NV only see themselves
        if (_gd_sidebarDeptFilter && String(u.department_id) !== _gd_sidebarDeptFilter) return false;
        return true;
    });

    if (filtered.length === 0) {
        list.innerHTML = `<div class="ts-empty" style="padding:20px;"><span class="ts-empty-icon" style="font-size:28px;">📭</span><div class="ts-empty-title" style="font-size:12px;">Không có NV nào</div></div>`;
        return;
    }

    // For managers: group by dept hierarchy
    if (isMgr && !_gd_sidebarDeptFilter) {
        const deptMap = {}; _gd_allDepts.forEach(d => { deptMap[d.id] = d; });

        // Build tree: find the top-level parent for each user's dept
        const groups = {}; // parentDeptId → { name, children: { childDeptId → { name, users[] } } }
        filtered.forEach(u => {
            const dept = deptMap[u.department_id];
            if (!dept) {
                // No dept — put in "Khác"
                if (!groups['_other']) groups['_other'] = { name: '📁 Khác', children: { '_other_team': { name: '', users: [] } } };
                groups['_other'].children['_other_team'].users.push(u);
                return;
            }
            const parentDept = dept.parent_id ? deptMap[dept.parent_id] : null;
            if (parentDept) {
                // dept is a child (team) — group under parent
                const pId = parentDept.id;
                if (!groups[pId]) groups[pId] = { name: parentDept.name, children: {} };
                if (!groups[pId].children[dept.id]) groups[pId].children[dept.id] = { name: dept.name, users: [] };
                groups[pId].children[dept.id].users.push(u);
            } else {
                // dept is a top-level — no team subdivision
                if (!groups[dept.id]) groups[dept.id] = { name: dept.name, children: {} };
                if (!groups[dept.id].children['_direct_' + dept.id]) groups[dept.id].children['_direct_' + dept.id] = { name: '', users: [] };
                groups[dept.id].children['_direct_' + dept.id].users.push(u);
            }
        });

        let html = '';
        Object.entries(groups).forEach(([pId, pData]) => {
            html += `<div style="margin-bottom:8px;">
                <div style="padding:6px 8px;background:linear-gradient(135deg,#1e3a5f,#122546);border-radius:10px;margin-bottom:4px;">
                    <span style="font-size:11px;font-weight:800;color:#93c5fd;">📁 ${pData.name}</span>
                </div>`;
            Object.entries(pData.children).forEach(([cId, cData]) => {
                if (cData.name) {
                    html += `<div style="padding:3px 8px 3px 16px;margin-bottom:2px;">
                        <span style="font-size:10px;font-weight:700;color:#64748b;">└ ${cData.name}</span>
                    </div>`;
                }
                cData.users.forEach(u => {
                    html += _gd_renderUserCard(u, cData.name ? 24 : 12);
                });
            });
            html += '</div>';
        });
        list.innerHTML = html;
    } else {
        // Flat list (TP/NV self-only, or dept filter active)
        list.innerHTML = filtered.map(u => _gd_renderUserCard(u, 0)).join('');
    }
}

function _gd_renderUserCard(u, indent) {
    const active = u.id === _gd_selectedUserId;
    const c = _gd_avatarColor(u.full_name || u.username);
    const deptMap = {}; _gd_allDepts.forEach(d => { deptMap[d.id] = d.name; });
    const dName = deptMap[u.department_id] || '';
    return `<div onclick="_gd_selectUser(${u.id},'${(u.full_name||u.username).replace(/'/g,"\\\\'")}')"
        style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-radius:10px;margin-bottom:3px;margin-left:${indent}px;transition:all 0.15s;
        ${active ? 'background:linear-gradient(135deg,#122546,#1e3a5f);color:white;box-shadow:0 4px 12px rgba(18,37,70,0.3);' : 'background:white;border:1px solid #e5e7eb;color:#374151;'}">
        <span class="ts-avatar" style="background:${active?'rgba(255,255,255,0.2)':c};width:32px;height:32px;font-size:12px;">${_gd_initials(u.full_name || u.username)}</span>
        <div style="flex:1;min-width:0;">
            <div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.full_name || u.username}</div>
            <div style="font-size:9px;opacity:0.6;">${dName}</div>
        </div>
    </div>`;
}

async function _gd_selectUser(userId, userName) {
    _gd_selectedUserId = userId; _gd_selectedUserName = userName;
    _gd_renderSidebar();
    await _gd_loadCallsForUser(userId);
}

async function _gd_loadCallsForUser(userId) {
    const el = document.getElementById('gdContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280;">⏳ Đang tải...</div>';

    const dr = _gd_getDateRange();
    const isSingleDay = dr.from === dr.to;
    const dateParams = `date_from=${dr.from}&date_to=${dr.to}`;

    const [callsRes, statsRes, callbacksRes] = await Promise.all([
        apiCall(`/api/telesale/user-calls/${userId}?${dateParams}`),
        apiCall(`/api/telesale/daily-stats/${userId}?${dateParams}`),
        apiCall(`/api/telesale/callbacks?date=${dr.from}&user_id=${userId}`)
    ]);
    _gd_calls = callsRes.calls || [];
    _gd_stats = statsRes.stats || { total:0, pending:0, answered:0, no_answer:0, busy:0, invalid:0, transferred:0, cold_answered:0, ncc_answered:0 };
    _gd_prevStats = statsRes.prevStats || null;
    const callbacks = callbacksRes.callbacks || [];
    // CRM tab filter
    const crmFilteredCalls = _gd_activeCrmTab ? _gd_calls.filter(c => {
        const src = _gd_sources.find(s => s.name === c.source_name);
        return src && src.crm_type === _gd_activeCrmTab;
    }) : _gd_calls;
    let filteredCalls = _gd_activeSourceFilter ? crmFilteredCalls.filter(c => c.source_name === _gd_activeSourceFilter) : crmFilteredCalls;
    // Status filter from card click
    if (_gd_statusFilter) {
        filteredCalls = filteredCalls.filter(c => {
            switch (_gd_statusFilter) {
                case 'total': return true;
                case 'pending': return c.call_status === 'pending';
                case 'answered': return c.call_status === 'answered';
                case 'transferred': return c.action_type === 'transfer';
                case 'no_answer_busy': return c.call_status === 'no_answer' || c.call_status === 'busy';
                case 'cold_answered': return c.action_type === 'cold';
                case 'ncc_answered': return c.action_type === 'cold_ncc';
                default: return true;
            }
        });
    }
    const totalAnswered = parseInt(_gd_stats.answered || 0);
    const targetCalls = 100; const totalPoints = 50;
    const earnedPoints = Math.round(Math.min(totalAnswered, targetCalls) / targetCalls * totalPoints);
    const progressPct = Math.min(100, Math.round(totalAnswered / targetCalls * 100));
    const sourcesInCalls = [...new Set(crmFilteredCalls.map(c => c.source_name).filter(Boolean))];
    const crmCounts = {};
    _gd_CRM_TABS.forEach(tab => {
        if (tab.value === null) { crmCounts['all'] = _gd_calls.length; }
        else { crmCounts[tab.value] = _gd_calls.filter(c => { const src = _gd_sources.find(s => s.name === c.source_name); return src && src.crm_type === tab.value; }).length; }
    });

    // Comparison helper
    const ps = _gd_prevStats || {};
    const _comp = (val, prev) => {
        if (!_gd_prevStats) return '';
        const diff = val - prev;
        if (diff === 0) return '<div style="font-size:9px;opacity:0.8;margin-top:2px;">— kỳ trước</div>';
        const arrow = diff > 0 ? '↑' : '↓';
        const bg = diff > 0 ? 'rgba(187,247,208,0.3)' : 'rgba(254,202,202,0.3)';
        return `<div style="font-size:9px;margin-top:2px;padding:1px 6px;background:${bg};border-radius:4px;display:inline-block;">${arrow}${Math.abs(diff)}</div>`;
    };
    const noAB = parseInt(_gd_stats.no_answer||0)+parseInt(_gd_stats.busy||0);
    const prevNoAB = parseInt(ps.no_answer||0)+parseInt(ps.busy||0);
    const totalHandedOver = parseInt(_gd_stats.total||0) - parseInt(_gd_stats.pending||0);
    const prevHandedOver = parseInt(ps.total||0) - parseInt(ps.pending||0);
    const miniCards = [
        { icon:'📊', val:totalHandedOver, label:'Được Bàn Giao', grad:'linear-gradient(135deg,#3b82f6,#6366f1)', pv:prevHandedOver, fk:'total' },
        { icon:'✅', val:totalAnswered, label:'Bắt Máy', grad:'linear-gradient(135deg,#059669,#14b8a6)', pv:parseInt(ps.answered||0), fk:'answered' },
        { icon:'🔥', val:parseInt(_gd_stats.transferred||0), label:'Chuyển Số', grad:'linear-gradient(135deg,#ea580c,#dc2626)', pv:parseInt(ps.transferred||0), fk:'transferred' },
        { icon:'📵', val:noAB, label:'Không Nghe', grad:'linear-gradient(135deg,#6366f1,#8b5cf6)', pv:prevNoAB, fk:'no_answer_busy' },
        { icon:'🚫', val:parseInt(_gd_stats.cold_answered||0), label:'Không Nhu Cầu', grad:'linear-gradient(135deg,#f43f5e,#ef4444)', pv:parseInt(ps.cold_answered||0), fk:'cold_answered' },
        { icon:'🏪', val:parseInt(_gd_stats.ncc_answered||0), label:'Đã Có NCC', grad:'linear-gradient(135deg,#854d0e,#a16207)', pv:parseInt(ps.ncc_answered||0), fk:'ncc_answered' },
    ];

    // Conversion rates
    const rateBM = parseInt(_gd_stats.total||0) > 0 ? Math.round(totalAnswered / parseInt(_gd_stats.total) * 100) : 0;
    const rateCS = totalAnswered > 0 ? Math.round(parseInt(_gd_stats.transferred||0) / totalAnswered * 100) : 0;

    // Date filter chips
    const _presets = [
        { key:'today', label:'Hôm nay', icon:'📅' }, { key:'yesterday', label:'Hôm qua', icon:'⏪' },
        { key:'7days', label:'7 ngày', icon:'📆' }, { key:'this_month', label:'Tháng này', icon:'🗓️' },
        { key:'last_month', label:'Tháng trước', icon:'📋' }, { key:'all', label:'Tất cả', icon:'♾️' },
    ];
    const dfHtml = `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px;padding:10px 14px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1.5px solid #e2e8f0;border-radius:12px;">
        <span style="font-size:13px;font-weight:800;color:#334155;margin-right:4px;">📅</span>
        ${_presets.map(p => { const a = _gd_datePreset === p.key; return `<button onclick="_gd_switchDatePreset('${p.key}')" style="padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;border:1.5px solid ${a?'#2563eb':'#e2e8f0'};background:${a?'linear-gradient(135deg,#2563eb,#3b82f6)':'white'};color:${a?'white':'#64748b'};box-shadow:${a?'0 2px 8px rgba(37,99,235,0.3)':'none'};">${p.icon} ${p.label}</button>`; }).join('')}
        <span style="width:1px;height:20px;background:#cbd5e1;margin:0 4px;"></span>
        <button onclick="_gd_datePreset='custom';document.getElementById('gdCustomDateArea').style.display='flex';" style="padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${_gd_datePreset==='custom'?'#7c3aed':'#e2e8f0'};background:${_gd_datePreset==='custom'?'linear-gradient(135deg,#7c3aed,#8b5cf6)':'white'};color:${_gd_datePreset==='custom'?'white':'#64748b'};transition:all .2s;">🔧 Tùy chọn</button>
        <div id="gdCustomDateArea" style="display:${_gd_datePreset==='custom'?'flex':'none'};align-items:center;gap:6px;margin-left:4px;">
            <input type="date" id="gdDateFrom" value="${dr.from}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_gd_dateFrom=this.value">
            <span style="font-size:11px;color:#9ca3af;">→</span>
            <input type="date" id="gdDateTo" value="${dr.to}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_gd_dateTo=this.value">
            <button onclick="_gd_applyCustomDate()" style="padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid #059669;background:linear-gradient(135deg,#059669,#10b981);color:white;">✓</button>
        </div>
        ${dr.from ? `<span style="margin-left:auto;font-size:10px;color:#6b7280;font-weight:600;">📊 ${dr.from}${dr.from!==dr.to?' → '+dr.to:''}</span>` : ''}
    </div>`;

    const cvHtml = `<div style="display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap;">
        <div style="flex:1;min-width:180px;padding:10px 14px;background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1.5px solid #bae6fd;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:11px;font-weight:700;color:#0369a1;">📞 Tỷ lệ bắt máy</span><span style="font-size:14px;font-weight:800;color:#0c4a6e;">${rateBM}%</span></div>
            <div style="height:6px;background:#e0f2fe;border-radius:3px;overflow:hidden;"><div style="height:100%;width:${Math.min(rateBM,100)}%;background:linear-gradient(90deg,#0ea5e9,#2563eb);border-radius:3px;transition:width 0.5s;"></div></div>
            <div style="font-size:9px;color:#64748b;margin-top:3px;">${totalAnswered} bắt máy / ${_gd_stats.total} tổng</div>
        </div>
        <div style="flex:1;min-width:180px;padding:10px 14px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fde68a;border-radius:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:11px;font-weight:700;color:#92400e;">🔥 Tỷ lệ chuyển số</span><span style="font-size:14px;font-weight:800;color:#78350f;">${rateCS}%</span></div>
            <div style="height:6px;background:#fef3c7;border-radius:3px;overflow:hidden;"><div style="height:100%;width:${Math.min(rateCS,100)}%;background:linear-gradient(90deg,#f59e0b,#ea580c);border-radius:3px;transition:width 0.5s;"></div></div>
            <div style="font-size:9px;color:#64748b;margin-top:3px;">${_gd_stats.transferred||0} chuyển / ${totalAnswered} bắt máy</div>
        </div>
    </div>`;

    // Group calls by date
    let callsHtml = '';
    if (!isSingleDay && filteredCalls.length > 0) {
        const grouped = {};
        filteredCalls.forEach(c => { const d = c.assigned_date?.split('T')[0] || 'unknown'; if (!grouped[d]) grouped[d] = []; grouped[d].push(c); });
        Object.entries(grouped).sort((a,b) => b[0].localeCompare(a[0])).forEach(([date, calls]) => {
            callsHtml += `<div style="margin-bottom:16px;"><div style="padding:8px 12px;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;font-weight:800;color:#334155;">📅 ${_gd_formatDate(date)}</span><span class="ts-badge" style="background:#dbeafe;color:#1e40af;">${calls.length} SĐT</span></div>${calls.map(call => _gd_renderCallCard(call)).join('')}</div>`;
        });
    } else {
        callsHtml = filteredCalls.length === 0
            ? `<div class="ts-empty"><span class="ts-empty-icon">📭</span><div class="ts-empty-title">Chưa có SĐT nào</div><div class="ts-empty-desc">Chưa có data được phân cho ${isSingleDay ? 'ngày này' : 'khoảng thời gian này'}</div></div>`
            : filteredCalls.map(call => _gd_renderCallCard(call)).join('');
    }

    const dateLabel = isSingleDay ? _gd_formatDate(dr.from) : `${_gd_formatDateShort(dr.from)} → ${_gd_formatDateShort(dr.to)}`;

    el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><div><h3 style="margin:0;color:#122546;font-size:18px;font-weight:800;">${_gd_selectedUserName}</h3><div style="font-size:12px;color:#6b7280;">📅 ${dateLabel}</div></div></div>
        ${dfHtml}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:14px;">
            ${miniCards.map(c => { const isA = _gd_statusFilter===c.fk; return `<div class="ts-stat-card" style="background:${c.grad};color:white;padding:12px 10px;cursor:pointer;transition:all .2s;${isA?'outline:3px solid white;outline-offset:2px;transform:scale(1.05);':''}" onclick="_gd_filterByCard('${c.fk}')"><span class="ts-stat-icon" style="font-size:22px;">${c.icon}</span><div class="ts-stat-val" style="font-size:20px;">${c.val}</div><div class="ts-stat-label">${c.label}</div>${_comp(c.val,c.pv)}</div>`; }).join('')}
        </div>
        ${cvHtml}
        <div style="margin-bottom:16px;padding:14px 16px;background:linear-gradient(135deg,#f0f9ff,#ecfdf5);border:1.5px solid #a7f3d0;border-radius:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:13px;font-weight:700;color:#065f46;">📊 CV Điểm: ${totalAnswered}/${targetCalls} bắt máy → ${earnedPoints}/${totalPoints} điểm</span><span style="font-size:12px;font-weight:800;color:${progressPct>=100?'#059669':'#2563eb'};">${progressPct}%</span></div>
            <div style="background:#e5e7eb;border-radius:10px;height:10px;overflow:hidden;"><div style="background:linear-gradient(90deg,#059669,#10b981,#34d399);height:100%;width:${progressPct}%;border-radius:10px;transition:width 0.5s ease;"></div></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;padding:4px;background:#f1f5f9;border-radius:14px;">
            ${_gd_CRM_TABS.map(tab => { const isA = _gd_activeCrmTab === tab.value; const cnt = tab.value === null ? crmCounts['all'] : (crmCounts[tab.value]||0);
                return `<button onclick="_gd_activeCrmTab=${tab.value===null?'null':"'"+tab.value+"'"};_gd_activeSourceFilter=null;_gd_loadCallsForUser(${userId});" style="display:flex;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;border:none;cursor:pointer;font-size:12px;font-weight:700;transition:all 0.2s;${isA?`background:${tab.grad};color:white;box-shadow:0 4px 12px rgba(0,0,0,0.15);`:'background:transparent;color:#64748b;'}"><span style="font-size:15px;">${tab.icon}</span><span>${tab.label}</span><span style="padding:2px 8px;border-radius:12px;font-size:10px;font-weight:800;${isA?'background:rgba(255,255,255,0.25);color:white;':'background:#e2e8f0;color:#475569;'}">${cnt}</span></button>`; }).join('')}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
            <button class="ts-source-pill${!_gd_activeSourceFilter?' active':''}" onclick="_gd_activeSourceFilter=null;_gd_loadCallsForUser(${userId});">Tất cả <span class="ts-pill-count">${crmFilteredCalls.length}</span></button>
            ${sourcesInCalls.map(s => { const cnt = crmFilteredCalls.filter(c => c.source_name === s).length; return `<button class="ts-source-pill${_gd_activeSourceFilter===s?' active':''}" onclick="_gd_activeSourceFilter='${s}';_gd_loadCallsForUser(${userId});">${s} <span class="ts-pill-count">${cnt}</span></button>`; }).join('')}
        </div>
        ${callbacks.length > 0 ? `<div style="margin-bottom:16px;padding:14px 16px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fde68a;border-radius:14px;"><div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px;">🔔 Hẹn Gọi Lại (${callbacks.length})</div>${callbacks.map(cb => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;"><span style="font-weight:700;color:#d97706;font-family:monospace;">${cb.phone}</span><span style="color:#374151;font-weight:600;">${cb.customer_name||''}</span><span style="font-size:10px;color:#6b7280;">${cb.source_icon||''} ${cb.source_name||''}</span>${cb.callback_time?`<span class="ts-badge" style="background:#fef3c7;color:#92400e;font-size:9px;">⏰ ${cb.callback_time}</span>`:''}</div>`).join('')}</div>` : ''}
        <div id="gdCallsList">${callsHtml}</div>`;
}

function _gd_renderCallCard(call) {
    const st = {
        pending: { bg:'linear-gradient(135deg,#fffbeb,#fefce8)', border:'#fde68a', icon:'⏸️', label:'Chưa gọi', leftBorder:'#f59e0b' },
        answered: { bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'#86efac', icon:'✅', label:'Bắt máy', leftBorder:'#059669' },
        no_answer: { bg:'linear-gradient(135deg,#fef2f2,#fee2e2)', border:'#fecaca', icon:'📵', label:'Không nghe', leftBorder:'#ef4444' },
        busy: { bg:'linear-gradient(135deg,#fff7ed,#ffedd5)', border:'#fed7aa', icon:'📞', label:'Máy bận', leftBorder:'#f97316' },
        invalid: { bg:'linear-gradient(135deg,#fdf2f8,#fce7f3)', border:'#fbcfe8', icon:'❌', label:'K.tồn tại', leftBorder:'#ec4899' },
    }[call.call_status] || { bg:'#fefce8', border:'#fde68a', icon:'⏸️', label:'Chưa gọi', leftBorder:'#f59e0b' };

    return `
    <div style="border:1.5px solid ${st.border};border-left:4px solid ${st.leftBorder};border-radius:14px;margin-bottom:10px;overflow:hidden;background:white;transition:box-shadow 0.2s,transform 0.2s;"
        onmouseenter="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)';this.style.transform='translateY(-1px)'"
        onmouseleave="this.style.boxShadow='none';this.style.transform='none'">
        <div style="padding:14px 16px;background:${st.bg};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="font-size:28px;">${st.icon}</div>
                <div>
                    <div style="font-size:14px;font-weight:800;color:#122546;">${call.customer_name || 'Chưa có tên'}</div>
                    <div style="font-size:16px;font-weight:700;color:#2563eb;font-family:'SF Mono',monospace;letter-spacing:0.5px;">${call.phone}</div>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                <span class="ts-badge" style="background:white;border:1.5px solid ${st.border};color:#374151;">${st.icon} ${st.label}</span>
                <span style="font-size:10px;color:#6b7280;">${call.source_icon||''} ${call.source_name||''}</span>
            </div>
        </div>
        <div style="padding:8px 16px;font-size:11px;color:#6b7280;display:flex;gap:16px;flex-wrap:wrap;border-bottom:1px solid #f1f5f9;">
            ${call.company_name ? `<span>🏢 ${call.company_name}</span>` : ''}
            ${call.group_name ? `<span>👥 ${call.group_name}</span>` : ''}
            ${call.address ? `<span>📍 ${call.address}</span>` : ''}
        </div>
        ${call.call_status === 'pending' ? `
        <div style="padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <button class="ts-btn ts-btn-green" onclick="_gd_showAnswerStatuses(${call.id},this)">✅ Bắt máy</button>
            <button class="ts-btn ts-btn-red" onclick="_gd_markCall(${call.id},'no_answer')">📵 Không nghe</button>
            <button class="ts-btn" style="background:linear-gradient(135deg,#f59e0b,#f97316);color:white;" onclick="_gd_markCall(${call.id},'busy')">📞 Bận</button>
            <button class="ts-btn ts-btn-ghost" onclick="_gd_markCall(${call.id},'invalid')">❌ K.tồn tại</button>
        </div>
        <div id="gdAnswerPanel_${call.id}" style="display:none;padding:14px 16px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-top:1.5px solid #bbf7d0;">
            <div style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:10px;">📋 Chọn tình trạng bắt máy:</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                ${_gd_answerStatuses.map(as => `
                <button class="ts-btn ts-btn-ghost" onclick="_gd_selectAnswerStatus(${call.id},${as.id},'${as.action_type}',${as.default_followup_days||3})">${as.icon} ${as.name}</button>`).join('')}
            </div>
            <label style="font-size:11px;font-weight:600;color:#374151;">📝 Ghi chú</label>
            <textarea id="gdNotes_${call.id}" class="ts-search" style="width:100%;margin-top:4px;padding:8px;min-height:50px;resize:vertical;" placeholder="Ghi chú cuộc gọi..."></textarea>
        </div>` : ''}
        ${call.call_status === 'answered' && !call.answer_status_id ? `
        <div style="padding:14px 16px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-top:1.5px solid #bbf7d0;">
            <div style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:10px;">📋 Chọn tình trạng bắt máy:</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                ${_gd_answerStatuses.map(as => `
                <button class="ts-btn ts-btn-ghost" onclick="_gd_selectAnswerStatus(${call.id},${as.id},'${as.action_type}',${as.default_followup_days})">${as.icon} ${as.name}</button>`).join('')}
            </div>
            <label style="font-size:11px;font-weight:600;color:#374151;">📝 Ghi chú</label>
            <textarea id="gdNotes_${call.id}" class="ts-search" style="width:100%;margin-top:4px;padding:8px;min-height:50px;resize:vertical;" placeholder="Ghi chú cuộc gọi..."></textarea>
        </div>` : ''}
        ${call.answer_status_id ? `
        <div style="padding:10px 16px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-top:1.5px solid #bbf7d0;font-size:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="ts-badge" style="background:#dcfce7;color:#065f46;">${call.answer_status_icon||'📋'} ${call.answer_status_name||''}</span>
            ${call.notes ? `<span style="color:#6b7280;">— ${call.notes}</span>` : ''}
            ${call.callback_date ? `<span class="ts-badge" style="background:#fef3c7;color:#92400e;">📅 Hẹn: ${call.callback_date}</span>` : ''}
        </div>` : ''}
    </div>`;
}

// ========== CALL ACTIONS (unchanged logic) ==========
async function _gd_markCall(assignmentId, callStatus) {
    if (callStatus === 'answered') {
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', { call_status: 'answered' });
        if (res.success) { showToast('✅ Đã ghi nhận bắt máy'); await _gd_loadCallsForUser(_gd_selectedUserId); }
        else showToast(res.error, 'error');
    } else {
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', { call_status: callStatus });
        if (res.success) { showToast(`Đã cập nhật: ${callStatus}`); await _gd_loadCallsForUser(_gd_selectedUserId); }
        else showToast(res.error, 'error');
    }
}

function _gd_showAnswerStatuses(assignmentId, btn) {
    const panel = document.getElementById(`gdAnswerPanel_${assignmentId}`);
    if (panel) {
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            btn.style.background = '#059669';
            btn.style.boxShadow = '0 0 0 3px rgba(5,150,105,0.3)';
            panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            btn.style.background = '';
            btn.style.boxShadow = '';
        }
    }
}

async function _gd_selectAnswerStatus(assignmentId, answerStatusId, actionType, defaultFollowupDays) {
    const notes = document.getElementById(`gdNotes_${assignmentId}`)?.value || '';
    const call = _gd_calls.find(c => c.id === assignmentId);
    if (actionType === 'transfer') { _gd_openChuyenSoForm(assignmentId, answerStatusId, notes, call); }
    else if (actionType === 'cold_ncc' || actionType === 'cold') {
        // Auto-freeze — just save, backend handles cold_until
        if (!confirm(actionType === 'cold_ncc' ? '🏪 Đóng băng — Đã có NCC?' : '🚫 Đóng băng — Không có nhu cầu?')) return;
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', { call_status:'answered', answer_status_id:answerStatusId, notes });
        if (res.success) { showToast('✅ Đã đóng băng'); await _gd_loadCallsForUser(_gd_selectedUserId); }
        else showToast(res.error, 'error');
    } else if (actionType === 'followup') {
        const defaultDate = new Date(); defaultDate.setDate(defaultDate.getDate() + (defaultFollowupDays || 3));
        const dateStr = defaultDate.toISOString().split('T')[0];
        openModal('📅 Hẹn Gọi Lại', `
            <div class="form-group"><label>📅 Ngày hẹn</label>
            <input type="date" id="gdCallbackDate" class="form-control" value="${dateStr}" readonly style="background:#f1f5f9;cursor:not-allowed;"></div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">⏰ Tự động hẹn sau ${defaultFollowupDays||3} ngày</div>
        `, `<button class="ts-btn ts-btn-green" onclick="_gd_submitFollowup(${assignmentId},${answerStatusId})">💾 Lưu</button>`);
    } else {
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', { call_status:'answered', answer_status_id:answerStatusId, notes });
        if (res.success) { showToast('✅ Đã lưu'); await _gd_loadCallsForUser(_gd_selectedUserId); }
        else showToast(res.error, 'error');
    }
}

async function _gd_submitFollowup(assignmentId, answerStatusId) {
    const notes = document.getElementById(`gdNotes_${assignmentId}`)?.value || '';
    const callbackDate = document.getElementById('gdCallbackDate')?.value;
    const callbackTime = document.getElementById('gdCallbackTime')?.value;
    if (!callbackDate) return showToast('Chọn ngày hẹn', 'error');
    const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', {
        call_status:'answered', answer_status_id:answerStatusId, notes,
        callback_date:callbackDate, callback_time:callbackTime||null
    });
    if (res.success) { showToast('✅ Đã hẹn gọi lại'); closeModal(); await _gd_loadCallsForUser(_gd_selectedUserId); }
    else showToast(res.error, 'error');
}

function _gd_openChuyenSoForm(assignmentId, answerStatusId, notes, call) {
    const source = _gd_sources.find(s => s.name === call.source_name);
    const crmType = source?.crm_type || '';
    const crmOptions = [
        {value:'nhu_cau',label:'Chăm Sóc KH Nhu Cầu'},{value:'hoa_hong_crm',label:'CRM Tự Tìm Kiếm'},
        {value:'nuoi_duong',label:'CRM Gọi Điện Hợp Tác'},{value:'sinh_vien',label:'CRM Gọi Điện Bán Hàng'},
        {value:'koc_tiktok',label:'CRM KOL/KOC Tiktok'},
        {value:'affiliate',label:'CRM Affiliate Giới Thiệu'},
    ];
    openModal('📞 Chuyển Số — CRM', `
        <div style="margin-bottom:12px;padding:10px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fde68a;border-radius:12px;font-size:12px;color:#92400e;">
            🔒 <strong>Nguồn Khách: GỌI ĐIỆN</strong> — SĐT, Tên KH không được chỉnh sửa
        </div>
        <div class="form-group"><label>📞 SĐT</label><input type="text" class="form-control" value="${call.phone}" readonly style="background:#f3f4f6;font-weight:700;"></div>
        <div class="form-group"><label>👤 Tên KH</label><input type="text" class="form-control" value="${call.customer_name||''}" readonly style="background:#f3f4f6;"></div>
        <div class="form-group"><label>🏢 Công Ty</label><input type="text" class="form-control" value="${call.company_name||''}" readonly style="background:#f3f4f6;"></div>
        <div class="form-group"><label>📋 CRM Đích</label>
            <select id="gdChuyenSoCRM" class="form-control" ${crmType?'disabled':''}>${crmOptions.map(o=>`<option value="${o.value}" ${o.value===crmType?'selected':''}>${o.label}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>📝 Ghi chú</label><textarea id="gdChuyenSoNotes" class="form-control" rows="3">${notes}</textarea></div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="ts-btn ts-btn-green" onclick="_gd_submitChuyenSo(${assignmentId},${answerStatusId},'${call.phone}','${(call.customer_name||'').replace(/'/g,"\\\\'")}','${(call.company_name||'').replace(/'/g,"\\\\'")}')">📞 Chuyển Số</button>`);
}

async function _gd_submitChuyenSo(assignmentId, answerStatusId, phone, customerName, companyName) {
    const crmType = document.getElementById('gdChuyenSoCRM')?.value;
    const notes = document.getElementById('gdChuyenSoNotes')?.value || '';
    if (!crmType) return showToast('Chọn CRM đích', 'error');
    const custRes = await apiCall('/api/customers', 'POST', { phone, name:customerName, company:companyName, source:'GỌI ĐIỆN', crm_type:crmType, notes, assigned_to:currentUser.id });
    const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', {
        call_status:'answered', answer_status_id:answerStatusId, notes,
        transferred_customer_id: custRes.customer?.id || custRes.lastInsertRowid || null
    });
    if (res.success) { showToast('✅ Chuyển số thành công!'); closeModal(); await _gd_loadCallsForUser(_gd_selectedUserId); }
    else showToast(res.error, 'error');
}

function _gd_changeDate(delta) {
    const d = new Date(_gd_dateFrom); d.setDate(d.getDate()+delta);
    _gd_dateFrom = d.toISOString().split('T')[0];
    _gd_dateTo = _gd_dateFrom;
    _gd_loadCallsForUser(_gd_selectedUserId);
}

function _gd_setMonthRange(year, monthFrom, monthTo) {
    const y = year || new Date(_gd_dateFrom).getFullYear();
    const mf = monthFrom || (new Date(_gd_dateFrom).getMonth()+1);
    const mt = monthTo || (new Date(_gd_dateTo).getMonth()+1);
    const mfinal = Math.min(parseInt(mf), parseInt(mt));
    const mtfinal = Math.max(parseInt(mf), parseInt(mt));
    _gd_dateFrom = `${y}-${String(mfinal).padStart(2,'0')}-01`;
    const lastDay = new Date(parseInt(y), parseInt(mtfinal), 0).getDate();
    _gd_dateTo = `${y}-${String(mtfinal).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    if (_gd_selectedUserId) _gd_loadCallsForUser(_gd_selectedUserId);
}

function _gd_formatDate(dateStr) {
    const d = new Date(dateStr);
    const days = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
    return `${days[d.getDay()]}, ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}

function _gd_formatDateShort(dateStr) {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
}

// ========== SETTINGS MODAL (GĐ only) ==========
async function _gd_openSettings() {
    const res = await apiCall('/api/telesale/settings');
    const coldMonths = res.cold_months || 4;
    const nccMonths = res.ncc_cold_months || 3;
    openModal('⚙️ Cài Đặt Gọi Điện Telesale', `
        <div style="display:flex;flex-direction:column;gap:16px;">
            <div style="padding:16px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;border:1.5px solid #93c5fd;">
                <div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:8px;">❄️ Kho Lạnh — Không Có Nhu Cầu</div>
                <div style="font-size:11px;color:#6b7280;margin-bottom:8px;">Khi KH không có nhu cầu → đóng băng bao lâu trước khi gọi lại</div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="number" id="gdSettingColdMonths" class="form-control" value="${coldMonths}" min="1" max="24" style="width:80px;text-align:center;font-weight:700;font-size:16px;">
                    <span style="font-size:13px;color:#374151;font-weight:600;">tháng</span>
                </div>
            </div>
            <div style="padding:16px;background:linear-gradient(135deg,#fefce8,#fef9c3);border-radius:12px;border:1.5px solid #fde047;">
                <div style="font-size:13px;font-weight:700;color:#854d0e;margin-bottom:8px;">🏪 Đã Có Nhà Cung Cấp</div>
                <div style="font-size:11px;color:#6b7280;margin-bottom:8px;">Khi KH đã có NCC → đóng băng bao lâu trước khi gọi lại</div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="number" id="gdSettingNccMonths" class="form-control" value="${nccMonths}" min="1" max="24" style="width:80px;text-align:center;font-weight:700;font-size:16px;">
                    <span style="font-size:13px;color:#374151;font-weight:600;">tháng</span>
                </div>
            </div>
        </div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        <button class="ts-btn ts-btn-green" onclick="_gd_saveSettings()">💾 Lưu Cài Đặt</button>`);
}

async function _gd_saveSettings() {
    const cold_months = parseInt(document.getElementById('gdSettingColdMonths')?.value) || 4;
    const ncc_cold_months = parseInt(document.getElementById('gdSettingNccMonths')?.value) || 3;
    const res = await apiCall('/api/telesale/settings', 'PUT', { cold_months, ncc_cold_months });
    if (res.success) { showToast('✅ Đã lưu cài đặt'); closeModal(); }
    else showToast(res.error || 'Lỗi', 'error');
}
