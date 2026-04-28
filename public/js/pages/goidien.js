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
let _gd_selectedYear = new Date().getFullYear();
let _gd_statusFilter = null;
let _gd_selfSearchSources = [];
let _gd_selfSearchLocations = [];
let _gd_selfSearchCount = 0;
let _gd_visibleUserIds = new Set(); // Role-based visible user IDs
let _gd_overrideUserIds = new Set(); // Users with task overrides
let _gd_isViewOnly = false; // true khi xem data người khác
function _gd_filterByCard(key) {
    _gd_statusFilter = _gd_statusFilter === key ? null : key;
    if (_gd_selectedUserId === 'all') _gd_loadAllUsersStats();
    else if (_gd_selectedUserId) _gd_loadCallsForUser(_gd_selectedUserId);
}

function _gd_getDateRange() {
    const today = new Date(); today.setHours(0,0,0,0);
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    switch (_gd_datePreset) {
        case 'today': return { from: fmt(today), to: fmt(today) };
        case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); return { from: fmt(y), to: fmt(y) }; }
        case '7days': { const d = new Date(today); d.setDate(d.getDate()-6); return { from: fmt(d), to: fmt(today) }; }
        case 'this_month': { const m = new Date(_gd_selectedYear, today.getMonth(), 1); const mEnd = _gd_selectedYear === today.getFullYear() ? today : new Date(_gd_selectedYear, today.getMonth()+1, 0); return { from: fmt(m), to: fmt(mEnd) }; }
        case 'last_month': { const m1 = new Date(_gd_selectedYear, today.getMonth()-1, 1); const m2 = new Date(_gd_selectedYear, today.getMonth(), 0); return { from: fmt(m1), to: fmt(m2) }; }
        case 'custom': return { from: _gd_dateFrom, to: _gd_dateTo };
        case 'all': return { from: `${_gd_selectedYear}-01-01`, to: `${_gd_selectedYear}-12-31` };
        default: return { from: fmt(today), to: fmt(today) };
    }
}
function _gd_switchDatePreset(preset) {
    _gd_datePreset = preset;
    if (preset === 'custom') return;
    if (_gd_selectedUserId === 'all') _gd_loadAllUsersStats();
    else if (_gd_selectedUserId) _gd_loadCallsForUser(_gd_selectedUserId);
}
function _gd_applyCustomDate() {
    _gd_dateFrom = document.getElementById('gdDateFrom')?.value || '';
    _gd_dateTo = document.getElementById('gdDateTo')?.value || '';
    if (_gd_dateFrom && _gd_dateTo) {
        if (_gd_selectedUserId === 'all') _gd_loadAllUsersStats();
        else if (_gd_selectedUserId) _gd_loadCallsForUser(_gd_selectedUserId);
    }
}
const _gd_CRM_TABS = [
    { value: null, label: 'Tất cả', icon: '📋', grad: 'linear-gradient(135deg,#122546,#1e3a5f)', color: '#122546' },
    { value: 'goi_hop_tac', label: 'Gọi Điện Đối Tác', icon: '🤝', grad: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#f59e0b' },
    { value: 'goi_ban_hang', label: 'Gọi Điện Bán Hàng', icon: '📞', grad: 'linear-gradient(135deg,#059669,#10b981)', color: '#059669' },
    { value: 'tu_tim_kiem', label: 'Tự Tìm Kiếm Telesale', icon: '🔍', grad: 'linear-gradient(135deg,#2563eb,#3b82f6)', color: '#2563eb' },
];
let _gd_isManager = false;
let _gd_allUsers = [];
let _gd_allDepts = [];
let _gd_memberIds = new Set();
let _gd_sidebarDeptFilter = '';

async function renderGoiDienPage(container) {
    _gd_isManager = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role);
    const _isNhanVien = ['nhan_vien', 'part_time'].includes(currentUser.role);
    const _isTopAdmin = ['giam_doc', 'quan_ly_cap_cao'].includes(currentUser.role);

    // NV/PT: ẩn sidebar, full-width content (chỉ xem data của mình)
    const sidebarHTML = _isNhanVien ? '' : `
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
            </div>`;

    container.innerHTML = `
        <div style="display:flex;height:calc(100vh - 120px);gap:0;">
            ${sidebarHTML}
            <div id="gdContent" style="flex:1;overflow:auto;padding:20px;">
                <div style="text-align:center;padding:40px;color:#6b7280;">⏳ Đang tải dữ liệu...</div>
            </div>
        </div>`;

    // Fetch data - dùng /api/users/dropdown (không yêu cầu role manager)
    let srcRes, statusRes, usersRes, deptsRes, membersRes, locRes, visRes;
    try {
        [srcRes, statusRes, usersRes, deptsRes, membersRes, locRes, visRes] = await Promise.all([
            apiCall('/api/telesale/sources'),
            apiCall('/api/telesale/answer-statuses'),
            apiCall('/api/users/dropdown'),
            apiCall('/api/departments'),
            apiCall('/api/telesale/active-members'),
            apiCall('/api/self-search-locations'),
            apiCall('/api/telesale/visible-members')
        ]);
        // Fetch override user IDs (parallel, non-blocking)
        apiCall('/api/schedule/override-users').then(r => { _gd_overrideUserIds = new Set((r.user_ids || []).map(Number)); }).catch(() => {});
    } catch (err) {
        console.error('[GD] Lỗi khởi tạo trang:', err);
        const el = document.getElementById('gdContent');
        if (el) el.innerHTML = `<div class="ts-empty"><span class="ts-empty-icon">❌</span><div class="ts-empty-title">Lỗi tải dữ liệu</div><div class="ts-empty-desc">${err.message || 'Vui lòng thử lại'}</div></div>`;
        return;
    }

    _gd_sources = srcRes.sources || [];
    _gd_answerStatuses = statusRes.statuses || [];
    _gd_allUsers = usersRes.users || usersRes || [];
    _gd_allDepts = deptsRes.departments || deptsRes || [];
    _gd_memberIds = new Set((membersRes.members || []).filter(m => m.is_active).map(m => m.user_id));
    _gd_selfSearchSources = _gd_sources.filter(s => s.crm_type === 'tu_tim_kiem');
    _gd_selfSearchLocations = locRes.locations || [];
    _gd_visibleUserIds = new Set((visRes.user_ids || []).map(Number));
    console.log('[GD Debug] visibleIds=', [..._gd_visibleUserIds], 'memberIds=', [..._gd_memberIds]);

    // Populate dept filter (chỉ khi có sidebar)
    if (!_isNhanVien) {
        const deptSelect = document.getElementById('gdDeptFilter');
        if (deptSelect) {
            const deptsWithMembers = _gd_allDepts.filter(d => _gd_allUsers.some(u => u.department_id === d.id && _gd_memberIds.has(u.id)));
            deptsWithMembers.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id; opt.textContent = d.name;
                deptSelect.appendChild(opt);
            });
        }
    }

    // Handle URL params: ?sel_user=ID&sel_date=YYYY-MM-DD (from "Xem báo cáo" in schedule)
    const _gdUrlParams = new URLSearchParams(window.location.search);
    const _gdSelUser = _gdUrlParams.get('sel_user');
    const _gdSelDate = _gdUrlParams.get('sel_date');
    if (_gdSelDate) {
        _gd_datePreset = 'custom';
        _gd_dateFrom = _gdSelDate;
        _gd_dateTo = _gdSelDate;
    }
    const _gdSelCrm = _gdUrlParams.get('sel_crm');
    if (_gdSelCrm) {
        _gd_activeCrmTab = _gdSelCrm;
    }

    // Auto-select logic
    if (_gdSelUser) {
        // URL param specifies user → select that user
        const targetUserId = parseInt(_gdSelUser);
        const targetUser = _gd_allUsers.find(u => u.id === targetUserId);
        _gd_selectedUserId = targetUserId;
        _gd_selectedUserName = targetUser ? (targetUser.full_name || targetUser.username) : 'Nhân viên';
        _gd_isViewOnly = (targetUserId !== currentUser.id);
        if (!_isNhanVien) _gd_renderSidebar();
        await _gd_loadCallsForUser(targetUserId);
    } else if (_isNhanVien) {
        // NV/PT: luôn load data bản thân (không cần sidebar)
        _gd_selectedUserId = currentUser.id;
        _gd_selectedUserName = currentUser.full_name || currentUser.username;
        _gd_isViewOnly = false;
        await _gd_loadCallsForUser(_gd_selectedUserId);
    } else if (['quan_ly_cap_cao','quan_ly','truong_phong'].includes(currentUser.role)) {
        // QLCC/QL/TP: auto-select self first
        _gd_selectedUserId = currentUser.id;
        _gd_selectedUserName = currentUser.full_name || currentUser.username;
        _gd_isViewOnly = false;
        _gd_renderSidebar();
        await _gd_loadCallsForUser(_gd_selectedUserId);
    } else {
        // GĐ: default to aggregate view
        _gd_selectedUserId = 'all';
        _gd_selectedUserName = 'Tổng Phòng Kinh Doanh';
        _gd_isViewOnly = true;
        _gd_renderSidebar();
        await _gd_loadAllUsersStats();
    }
}

function _gd_avatarColor(n) { let h=0; for(let i=0;i<(n||'').length;i++) h=n.charCodeAt(i)+((h<<5)-h); return ['#3b82f6','#059669','#f59e0b','#8b5cf6','#06b6d4','#f43f5e','#ec4899','#6366f1'][Math.abs(h)%8]; }
function _gd_initials(n) { if(!n) return '?'; const p=n.trim().split(/\s+/); return p.length>1?(p[0][0]+p[p.length-1][0]).toUpperCase():n.substring(0,2).toUpperCase(); }

// ========== AGGREGATE ALL USERS ==========
async function _gd_loadAllUsersStats() {
    const el = document.getElementById('gdContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280;">⏳ Đang tải tổng hợp...</div>';
    const dr = _gd_getDateRange();
    const isSingleDay = dr.from === dr.to;
    const dateParams = `date_from=${dr.from}&date_to=${dr.to}`;

    // Get all visible member IDs
    const visibleMembers = _gd_allUsers.filter(u => {
        if (!_gd_memberIds.has(u.id)) return false;
        if (_gd_visibleUserIds.size > 0 && !_gd_visibleUserIds.has(u.id)) return false;
        return true;
    });

    // Fetch stats for ALL users in parallel
    const statsPromises = visibleMembers.map(u => apiCall(`/api/telesale/daily-stats/${u.id}?${dateParams}`).catch(() => ({ stats: {} })));
    const allStatsRes = await Promise.all(statsPromises);

    // Aggregate
    const agg = { total:0, pending:0, answered:0, no_answer:0, busy:0, invalid:0, transferred:0, cold_answered:0, ncc_answered:0 };
    const prevAgg = { total:0, pending:0, answered:0, no_answer:0, busy:0, invalid:0, transferred:0, cold_answered:0, ncc_answered:0 };
    allStatsRes.forEach(r => {
        const s = r.stats || {};
        const p = r.prevStats || {};
        Object.keys(agg).forEach(k => { agg[k] += parseInt(s[k] || 0); prevAgg[k] += parseInt(p[k] || 0); });
    });

    const totalAnswered = agg.answered;
    const noAB = agg.no_answer + agg.busy;
    const prevNoAB = prevAgg.no_answer + prevAgg.busy;
    const rateBM = agg.total > 0 ? Math.round(totalAnswered / agg.total * 100) : 0;
    const rateCS = totalAnswered > 0 ? Math.round(agg.transferred / totalAnswered * 100) : 0;

    const _comp = (val, prev) => {
        if (!prev && prev !== 0) return '';
        const d = val - prev;
        if (d === 0) return '';
        return `<div style="font-size:9px;margin-top:2px;color:${d>0?'#bbf7d0':'#fecaca'};font-weight:700;">${d>0?'▲':'▼'} ${Math.abs(d)}</div>`;
    };

    const miniCards = [
        { icon:'📤', val:agg.total, label:'Đã Phân Còn Lại', grad:'linear-gradient(135deg,#f59e0b,#f97316)', pv:prevAgg.total, fk:'total' },
        { icon:'📞', val:totalAnswered, label:'Đã Gọi Bắt Máy', grad:'linear-gradient(135deg,#059669,#10b981)', pv:prevAgg.answered, fk:'answered' },
        { icon:'🔥', val:agg.transferred, label:'Chuyển Số', grad:'linear-gradient(135deg,#f59e0b,#ea580c)', pv:prevAgg.transferred, fk:'transferred' },
        { icon:'📵', val:noAB, label:'Không Nghe, Bận', grad:'linear-gradient(135deg,#6366f1,#8b5cf6)', pv:prevNoAB, fk:'no_answer_busy' },
        { icon:'🚫', val:agg.cold_answered, label:'Không Có Nhu Cầu', grad:'linear-gradient(135deg,#06b6d4,#0ea5e9)', pv:prevAgg.cold_answered, fk:'cold_answered' },
        { icon:'🏪', val:agg.ncc_answered, label:'Đã Có Nhà Cung Cấp', grad:'linear-gradient(135deg,#854d0e,#a16207)', pv:prevAgg.ncc_answered, fk:'ncc_answered' },
        { icon:'❌', val:agg.invalid, label:'Hủy Khách, K. Tồn Tại', grad:'linear-gradient(135deg,#6b7280,#374151)', pv:prevAgg.invalid, fk:'invalid' },
    ];

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
        <select onchange="_gd_selectedYear=parseInt(this.value);_gd_switchDatePreset('all')" style="padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;border:1.5px solid #2563eb;background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1e40af;cursor:pointer;">
            ${(() => { const cur = new Date().getFullYear(); let opts = ''; for (let y = cur; y >= 2024; y--) { opts += `<option value="${y}" ${y === _gd_selectedYear ? 'selected' : ''}>${y}</option>`; } return opts; })()}
        </select>
        <div id="gdCustomDateArea" style="display:${_gd_datePreset==='custom'?'flex':'none'};align-items:center;gap:6px;margin-left:4px;">
            <input type="date" id="gdDateFrom" value="${dr.from}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_gd_dateFrom=this.value">
            <span style="font-size:11px;color:#9ca3af;">→</span>
            <input type="date" id="gdDateTo" value="${dr.to}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_gd_dateTo=this.value">
            <button onclick="_gd_applyCustomDate()" style="padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid #059669;background:linear-gradient(135deg,#059669,#10b981);color:white;">✓</button>
        </div>
        ${dr.from ? `<span style="margin-left:auto;font-size:10px;color:#6b7280;font-weight:600;">📊 ${dr.from}${dr.from!==dr.to?' → '+dr.to:''}</span>` : ''}
    </div>`;

    const dateLabel = isSingleDay ? _gd_formatDate(dr.from) : `${_gd_formatDateShort(dr.from)} → ${_gd_formatDateShort(dr.to)}`;

    // Per-user breakdown table
    let userRows = '';
    visibleMembers.forEach((u, i) => {
        const s = allStatsRes[i]?.stats || {};
        const answered = parseInt(s.answered || 0);
        const transferred = parseInt(s.transferred || 0);
        const total = parseInt(s.total || 0);
        if (total === 0) return;
        userRows += `<tr style="cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background=''" onclick="_gd_selectUser(${u.id},'${(u.full_name||u.username).replace(/'/g,"\\\\'")}')">
            <td style="padding:8px 10px;font-weight:700;color:#122546;font-size:12px;">${u.full_name || u.username}</td>
            <td style="padding:8px 10px;text-align:center;font-weight:700;font-size:13px;color:#f59e0b;">${total}</td>
            <td style="padding:8px 10px;text-align:center;font-weight:700;font-size:13px;color:#059669;">${answered}</td>
            <td style="padding:8px 10px;text-align:center;font-weight:800;font-size:13px;color:#ea580c;">${transferred}</td>
            <td style="padding:8px 10px;text-align:center;font-weight:700;font-size:13px;color:#6366f1;">${parseInt(s.no_answer||0)+parseInt(s.busy||0)}</td>
            <td style="padding:8px 10px;text-align:center;font-weight:700;font-size:13px;color:#6b7280;">${parseInt(s.cold_answered||0)}</td>
            <td style="padding:8px 10px;text-align:center;font-weight:700;font-size:13px;color:#854d0e;">${parseInt(s.ncc_answered||0)}</td>
        </tr>`;
    });

    el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <h3 style="margin:0;color:#122546;font-size:18px;font-weight:800;">📊 Tổng Phòng Kinh Doanh</h3>
                <span style="padding:4px 12px;background:linear-gradient(135deg,#122546,#1e3a5f);color:white;border-radius:8px;font-size:11px;font-weight:700;">${visibleMembers.length} nhân viên</span>
            </div>
            <div style="font-size:12px;color:#6b7280;">📅 ${dateLabel}</div>
        </div>
        ${dfHtml}
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
            ${miniCards.map(c => `<div class="ts-stat-card" style="background:${c.grad};color:white;cursor:default;"><span class="ts-stat-icon">${c.icon}</span><div class="ts-stat-val">${c.val}</div><div class="ts-stat-label">${c.label}</div>${_comp(c.val,c.pv)}</div>`).join('')}
        </div>
        <div style="display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap;">
            <div style="flex:1;min-width:180px;padding:10px 14px;background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1.5px solid #bae6fd;border-radius:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:11px;font-weight:700;color:#0369a1;">📞 Tỷ lệ bắt máy</span><span style="font-size:14px;font-weight:800;color:#0c4a6e;">${rateBM}%</span></div>
                <div style="height:6px;background:#e0f2fe;border-radius:3px;overflow:hidden;"><div style="height:100%;width:${Math.min(rateBM,100)}%;background:linear-gradient(90deg,#0ea5e9,#2563eb);border-radius:3px;transition:width 0.5s;"></div></div>
                <div style="font-size:9px;color:#64748b;margin-top:3px;">${totalAnswered} bắt máy / ${agg.total} tổng</div>
            </div>
            <div style="flex:1;min-width:180px;padding:10px 14px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fde68a;border-radius:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><span style="font-size:11px;font-weight:700;color:#92400e;">🔥 Tỷ lệ chuyển số</span><span style="font-size:14px;font-weight:800;color:#78350f;">${rateCS}%</span></div>
                <div style="height:6px;background:#fef3c7;border-radius:3px;overflow:hidden;"><div style="height:100%;width:${Math.min(rateCS,100)}%;background:linear-gradient(90deg,#f59e0b,#ea580c);border-radius:3px;transition:width 0.5s;"></div></div>
                <div style="font-size:9px;color:#64748b;margin-top:3px;">${agg.transferred} chuyển / ${totalAnswered} bắt máy</div>
            </div>
        </div>
        ${userRows ? `
        <div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <div style="padding:12px 16px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-bottom:1.5px solid #e2e8f0;">
                <span style="font-size:13px;font-weight:800;color:#122546;">👥 Chi tiết theo nhân viên</span>
            </div>
            <table style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#f8fafc;">
                    <th style="padding:8px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:700;">Nhân viên</th>
                    <th style="padding:8px 10px;text-align:center;font-size:11px;color:#64748b;font-weight:700;">📤 Phân</th>
                    <th style="padding:8px 10px;text-align:center;font-size:11px;color:#64748b;font-weight:700;">📞 Bắt máy</th>
                    <th style="padding:8px 10px;text-align:center;font-size:11px;color:#64748b;font-weight:700;">🔥 Chuyển</th>
                    <th style="padding:8px 10px;text-align:center;font-size:11px;color:#64748b;font-weight:700;">📵 K.Nghe</th>
                    <th style="padding:8px 10px;text-align:center;font-size:11px;color:#64748b;font-weight:700;">🚫 K.NC</th>
                    <th style="padding:8px 10px;text-align:center;font-size:11px;color:#64748b;font-weight:700;">🏪 NCC</th>
                </tr></thead>
                <tbody>${userRows}</tbody>
            </table>
        </div>` : ''}
    `;
}

function _gd_renderSidebar() {
    const list = document.getElementById('gdSidebarList');
    if (!list) return;

    const isMgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role);

    // "Tổng Phòng KD" button at top
    const isAllActive = _gd_selectedUserId === 'all';
    let topBtn = `<div onclick="_gd_selectUser('all','Tổng Phòng Kinh Doanh')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-radius:10px;margin-bottom:8px;transition:all 0.15s;${isAllActive ? 'background:linear-gradient(135deg,#f59e0b,#ea580c);color:white;box-shadow:0 4px 12px rgba(245,158,11,0.3);' : 'background:white;border:1.5px solid #e2e8f0;color:#374151;'}">
        <span style="font-size:20px;">📊</span>
        <div style="flex:1;">
            <div style="font-size:12px;font-weight:800;">Tổng Phòng KD</div>
            <div style="font-size:9px;opacity:0.7;">Xem tổng hợp tất cả NV</div>
        </div>
    </div>`;

    // Filter members by active status and dept filter
    let filtered = _gd_allUsers.filter(u => {
        if (!_gd_memberIds.has(u.id)) return false;
        // Role-based visibility: if visibleUserIds loaded, apply filter; else show all (backend enforces security)
        if (_gd_visibleUserIds.size > 0 && !_gd_visibleUserIds.has(u.id)) return false;
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

        // Pre-seed KD hierarchy: always show all KD teams (even empty), ordered by display_order
        const kdParent = deptMap[1]; // PHÒNG KINH DOANH
        if (kdParent) {
            groups[1] = { name: kdParent.name, children: {} };
            // Add direct members slot
            groups[1].children['_direct_1'] = { name: '', users: [], order: -1 };
            // Pre-seed all child teams sorted by display_order
            _gd_allDepts
                .filter(d => d.parent_id === 1 && d.status !== 'inactive')
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || a.id - b.id)
                .forEach(d => {
                    groups[1].children[d.id] = { name: d.name, users: [], order: d.display_order || 0 };
                });
        }

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
                        <span style="font-size:10px;font-weight:700;color:#64748b;">└ ${cData.name}${cData.users.length === 0 ? ' <span style="color:#9ca3af;font-size:9px;">(trống)</span>' : ''}</span>
                    </div>`;
                }
                _sidebarSortMembers(cData.users).forEach(u => {
                    html += _gd_renderUserCard(u, cData.name ? 24 : 12);
                });
            });
            html += '</div>';
        });
        list.innerHTML = topBtn + html;
    } else {
        // Flat list (TP/NV self-only, or dept filter active)
        list.innerHTML = topBtn + _sidebarSortMembers(filtered).map(u => _gd_renderUserCard(u, 0)).join('');
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
            <div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;">${u.full_name || u.username}${_sidebarRoleBadge(u.role)}${_gd_overrideUserIds.has(u.id) ? '<span title="Đã tùy chỉnh công việc" style="display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-size:7px;padding:1px 4px;border-radius:3px;font-weight:800;line-height:1;flex-shrink:0;box-shadow:0 1px 2px rgba(217,119,6,0.3);">✏️ TC</span>' : ''}</div>
            <div style="font-size:9px;opacity:0.6;">${dName}</div>
        </div>
    </div>`;
}

async function _gd_selectUser(userId, userName) {
    _gd_selectedUserId = userId; _gd_selectedUserName = userName;
    _gd_isViewOnly = (userId !== currentUser.id);
    _gd_renderSidebar();
    if (userId === 'all') await _gd_loadAllUsersStats();
    else await _gd_loadCallsForUser(userId);
}

async function _gd_loadCallsForUser(userId) {
    const el = document.getElementById('gdContent');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280;">⏳ Đang tải...</div>';

    const dr = _gd_getDateRange();
    const isSingleDay = dr.from === dr.to;
    const dateParams = `date_from=${dr.from}&date_to=${dr.to}`;

    const [callsRes, statsRes, callbacksRes, callProgRes] = await Promise.all([
        apiCall(`/api/telesale/user-calls/${userId}?${dateParams}`),
        apiCall(`/api/telesale/daily-stats/${userId}?${dateParams}`),
        apiCall(`/api/telesale/callbacks?date=${dr.from}&user_id=${userId}`),
        apiCall(`/api/telesale/call-progress/${userId}?date=${dr.from}`)
    ]);
    _gd_calls = callsRes.calls || [];
    _gd_stats = statsRes.stats || { total:0, pending:0, answered:0, no_answer:0, busy:0, invalid:0, transferred:0, cold_answered:0, ncc_answered:0 };
    _gd_prevStats = statsRes.prevStats || null;
    _gd_callProgTarget = callProgRes.target || 100;
    _gd_callProgPoints = callProgRes.total_points || 50;
    const callbacks = callbacksRes.callbacks || [];
    // CRM tab filter
    const crmFilteredCalls = (_gd_activeCrmTab ? _gd_calls.filter(c => {
        const src = _gd_sources.find(s => s.name === c.source_name);
        return src && src.crm_type === _gd_activeCrmTab;
    }) : _gd_calls);
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
                case 'invalid': return c.call_status === 'invalid';
                default: return true;
            }
        });
    }
    const totalAnswered = parseInt(_gd_stats.answered || 0);
    const targetCalls = _gd_callProgTarget || 100; const totalPoints = _gd_callProgPoints || 50;
    const earnedPoints = Math.round(Math.min(totalAnswered, targetCalls) / targetCalls * totalPoints);
    const progressPct = Math.min(100, Math.round(totalAnswered / targetCalls * 100));
    const sourcesInCalls = [...new Set(crmFilteredCalls.map(c => c.source_name).filter(Boolean))];
    const _activeCalls = _gd_calls;
    const crmCounts = {};
    _gd_CRM_TABS.forEach(tab => {
        if (tab.value === null) { crmCounts['all'] = _activeCalls.length; }
        else { crmCounts[tab.value] = _activeCalls.filter(c => { const src = _gd_sources.find(s => s.name === c.source_name); return src && src.crm_type === tab.value; }).length; }
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
    // "Đã Phân Còn Lại" chỉ đếm pending hôm nay (ngày trước đã thu hồi)
    const _todayStr = new Date(Date.now() + 7 * 3600000).toISOString().split('T')[0];
    const totalAssigned = _gd_calls.filter(c => c.call_status === 'pending' && (c.assigned_date||'').split('T')[0] === _todayStr).length;
    const prevAssigned = parseInt(ps.pending||0);
    const miniCards = [
        { icon:'📤', val:totalAssigned, label:'Đã Phân Còn Lại', grad:'linear-gradient(135deg,#f59e0b,#f97316)', pv:prevAssigned, fk:'total' },
        { icon:'📞', val:totalAnswered, label:'Đã Gọi Bắt Máy', grad:'linear-gradient(135deg,#8b5cf6,#a855f7)', pv:parseInt(ps.answered||0), fk:'answered' },
        { icon:'🔥', val:parseInt(_gd_stats.transferred||0), label:'Chuyển Số', grad:'linear-gradient(135deg,#f59e0b,#ea580c)', pv:parseInt(ps.transferred||0), fk:'transferred' },
        { icon:'📵', val:noAB, label:'Không Nghe, Bận', grad:'linear-gradient(135deg,#6366f1,#8b5cf6)', pv:prevNoAB, fk:'no_answer_busy' },
        { icon:'🚫', val:parseInt(_gd_stats.cold_answered||0), label:'Không Có Nhu Cầu', grad:'linear-gradient(135deg,#06b6d4,#0ea5e9)', pv:parseInt(ps.cold_answered||0), fk:'cold_answered' },
        { icon:'🏪', val:parseInt(_gd_stats.ncc_answered||0), label:'Đã Có Nhà Cung Cấp', grad:'linear-gradient(135deg,#854d0e,#a16207)', pv:parseInt(ps.ncc_answered||0), fk:'ncc_answered' },
        { icon:'❌', val:parseInt(_gd_stats.invalid||0), label:'Hủy Khách, K. Tồn Tại', grad:'linear-gradient(135deg,#6b7280,#374151)', pv:parseInt(ps.invalid||0), fk:'invalid' },
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
        <select onchange="_gd_selectedYear=parseInt(this.value);_gd_switchDatePreset('all')" style="padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;border:1.5px solid #2563eb;background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1e40af;cursor:pointer;">
            ${(() => { const cur = new Date().getFullYear(); let opts = ''; for (let y = cur; y >= 2024; y--) { opts += `<option value="${y}" ${y === _gd_selectedYear ? 'selected' : ''}>${y}</option>`; } return opts; })()}
        </select>
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
            ? `<div class="ts-empty"><span class="ts-empty-icon">📭</span><div class="ts-empty-title">Chưa có SĐT nào</div><div class="ts-empty-desc">Chưa có data được phân cho ${isSingleDay && canDo('goi_dien', 'create') ? 'ngày này' : 'khoảng thời gian này'}</div></div>`
            : filteredCalls.map(call => _gd_renderCallCard(call)).join('');
    }

    const dateLabel = isSingleDay ? _gd_formatDate(dr.from) : `${_gd_formatDateShort(dr.from)} → ${_gd_formatDateShort(dr.to)}`;
    // Active filter label
    const _filterLabels = { total:'📤 Đã Phân Còn Lại', answered:'📞 Đã Gọi Bắt Máy', transferred:'🔥 Chuyển Số', no_answer_busy:'📵 Không Nghe, Bận', cold_answered:'🚫 Không Có Nhu Cầu', ncc_answered:'🏪 Đã Có Nhà Cung Cấp', invalid:'❌ Hủy Khách, K. Tồn Tại' };
    const activeFilterHtml = _gd_statusFilter ? `<div style="display:inline-flex;align-items:center;gap:6px;padding:5px 14px;background:linear-gradient(135deg,#122546,#1e3a5f);color:white;border-radius:10px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(18,37,70,0.3);animation:_gdFilterPulse 2s ease-in-out infinite;">
        <span>🔍</span><span>${_filterLabels[_gd_statusFilter] || _gd_statusFilter}</span>
        <button onclick="_gd_filterByCard('${_gd_statusFilter}')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:18px;height:18px;border-radius:50%;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;" title="Bỏ lọc">✕</button>
    </div>` : '';

    const viewOnlyBanner = _gd_isViewOnly ? `<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:linear-gradient(135deg,#fefce8,#fef9c3);border:1.5px solid #fde68a;border-radius:10px;margin-bottom:12px;font-size:12px;font-weight:600;color:#92400e;"><span style="font-size:16px;">👁️</span> Chế độ xem — Bạn đang xem dữ liệu của <strong>${_gd_selectedUserName}</strong>. Chỉ chủ sở hữu mới thao tác được.</div>` : '';
    el.innerHTML = `
        <style>@keyframes _gdFilterPulse { 0%,100%{box-shadow:0 2px 8px rgba(18,37,70,0.3)} 50%{box-shadow:0 2px 16px rgba(18,37,70,0.5)} }</style>
        ${viewOnlyBanner}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><div style="display:flex;align-items:center;gap:12px;"><h3 style="margin:0;color:#122546;font-size:18px;font-weight:800;">${_gd_selectedUserName}</h3>${activeFilterHtml}</div><div style="font-size:12px;color:#6b7280;">📅 ${dateLabel}</div></div>
        ${dfHtml}
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
            ${miniCards.map(c => { const isA = _gd_statusFilter===c.fk; return `<div class="ts-stat-card" style="background:${c.grad};color:white;cursor:pointer;transition:all .2s;${isA?'outline:3px solid white;outline-offset:2px;transform:scale(1.05);':''}" onclick="_gd_filterByCard('${c.fk}')"><span class="ts-stat-icon">${c.icon}</span><div class="ts-stat-val">${c.val}</div><div class="ts-stat-label">${c.label}</div>${_comp(c.val,c.pv)}</div>`; }).join('')}
        </div>
        ${cvHtml}
        <div style="margin-bottom:16px;padding:14px 16px;background:linear-gradient(135deg,#f0f9ff,#ecfdf5);border:1.5px solid #a7f3d0;border-radius:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:13px;font-weight:700;color:#065f46;">📊 CV Điểm: ${totalAnswered}/${targetCalls} bắt máy → ${earnedPoints}/${totalPoints} điểm</span><span style="font-size:12px;font-weight:800;color:${progressPct>=100?'#059669':'#2563eb'};">${progressPct}%</span></div>
            <div style="background:#e5e7eb;border-radius:10px;height:10px;overflow:hidden;"><div style="background:linear-gradient(90deg,#059669,#10b981,#34d399);height:100%;width:${progressPct}%;border-radius:10px;transition:width 0.5s ease;"></div></div>
        </div>
        <div id="gdSelfSearchProgress"></div>
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

    // Load self-search progress if CRM Tự Tìm Kiếm tab
    if (_gd_activeCrmTab === 'tu_tim_kiem') {
        _gd_loadSelfSearchProgress(userId);
    } else {
        const ssEl = document.getElementById('gdSelfSearchProgress');
        if (ssEl) ssEl.innerHTML = '';
    }
}

function _gd_renderCallCard(call) {
    const st = {
        pending: { bg:'linear-gradient(135deg,#fffbeb,#fefce8)', border:'#fde68a', icon:'⏸️', label:'Chưa gọi', leftBorder:'#f59e0b' },
        answered: { bg:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'#86efac', icon:'✅', label:'Bắt máy', leftBorder:'#059669' },
        no_answer: { bg:'linear-gradient(135deg,#fef2f2,#fee2e2)', border:'#fecaca', icon:'📵', label:'Không nghe', leftBorder:'#ef4444' },
        busy: { bg:'linear-gradient(135deg,#fff7ed,#ffedd5)', border:'#fed7aa', icon:'📞', label:'Máy bận', leftBorder:'#f97316' },
        invalid: { bg:'linear-gradient(135deg,#fdf2f8,#fce7f3)', border:'#fbcfe8', icon:'❌', label:'Hủy K. Tồn Tại', leftBorder:'#ec4899' },
    }[call.call_status] || { bg:'#fefce8', border:'#fde68a', icon:'⏸️', label:'Chưa gọi', leftBorder:'#f59e0b' };

    return `
    <div style="border:1.5px solid ${st.border};border-left:4px solid ${st.leftBorder};border-radius:14px;margin-bottom:10px;overflow:hidden;background:white;transition:box-shadow 0.2s,transform 0.2s;"
        onmouseenter="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)';this.style.transform='translateY(-1px)'"
        onmouseleave="this.style.boxShadow='none';this.style.transform='none'">
        <div style="padding:14px 16px;background:${st.bg};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="font-size:28px;">${st.icon}</div>
                <div style="cursor:pointer;" onclick="_gd_viewDataDetail(${call.data_id})">
                    <div style="font-size:14px;font-weight:800;color:#122546;">${call.customer_name || 'Chưa có tên'}</div>
                    <div style="font-size:16px;font-weight:700;color:#2563eb;font-family:'SF Mono',monospace;letter-spacing:0.5px;">${call.phone}</div>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                <span class="ts-badge" style="background:white;border:1.5px solid ${st.border};color:#374151;">${st.icon} ${st.label}</span>
                <span style="font-size:10px;color:#6b7280;">${call.source_icon||''} ${call.source_name||''}</span>
                <button class="ts-btn ts-btn-ghost" style="font-size:10px;padding:3px 10px;border-radius:8px;" onclick="event.stopPropagation();_gd_viewDataDetail(${call.data_id})">📋 Thông tin KH</button>
            </div>
        </div>
        <div style="padding:8px 16px;font-size:11px;color:#6b7280;display:flex;gap:16px;flex-wrap:wrap;border-bottom:1px solid #f1f5f9;">
            ${call.company_name ? `<span>🏢 ${call.company_name}</span>` : ''}
            ${call.group_name ? `<span>👥 ${call.group_name}</span>` : ''}
            ${call.address ? `<span>📍 ${call.address}</span>` : ''}
        </div>
        ${call.call_status === 'pending' && !_gd_isViewOnly && !call.self_searched_by ? `
        <div style="padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <button class="ts-btn ts-btn-green" onclick="_gd_showAnswerStatuses(${call.id},this)">✅ Bắt máy</button>
            <button class="ts-btn ts-btn-red" onclick="_gd_markCall(${call.id},'no_answer')">📵 Không nghe</button>
            <button class="ts-btn" style="background:linear-gradient(135deg,#f59e0b,#f97316);color:white;" onclick="_gd_markCall(${call.id},'busy')">📞 Bận</button>
            <button class="ts-btn ts-btn-ghost" onclick="_gd_markCall(${call.id},'invalid')">❌ Hủy K. Tồn Tại</button>
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
        ${call.call_status === 'pending' && call.self_searched_by ? `
        <div style="padding:10px 16px;background:linear-gradient(135deg,#fefce8,#fef9c3);border-top:1.5px solid #fde68a;font-size:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="ts-badge" style="background:#fef3c7;color:#92400e;">⏳ Tự tìm kiếm Telesale - đang đồng bộ...</span>
        </div>` : ''}
        ${call.call_status === 'answered' && !call.answer_status_id && !_gd_isViewOnly && !call.notes && !call.self_searched_by ? `
        <div style="padding:14px 16px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-top:1.5px solid #bbf7d0;">
            <div style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:10px;">📋 Chọn tình trạng bắt máy:</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                ${_gd_answerStatuses.map(as => `
                <button class="ts-btn ts-btn-ghost" onclick="_gd_selectAnswerStatus(${call.id},${as.id},'${as.action_type}',${as.default_followup_days})">${as.icon} ${as.name}</button>`).join('')}
            </div>
            <label style="font-size:11px;font-weight:600;color:#374151;">📝 Ghi chú</label>
            <textarea id="gdNotes_${call.id}" class="ts-search" style="width:100%;margin-top:4px;padding:8px;min-height:50px;resize:vertical;" placeholder="Ghi chú cuộc gọi..."></textarea>
        </div>` : ''}
        ${call.call_status === 'answered' && !call.answer_status_id && (call.notes || call.self_searched_by) ? `
        <div style="padding:10px 16px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-top:1.5px solid #bbf7d0;font-size:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="ts-badge" style="background:#dcfce7;color:#065f46;">✅ Đã xử lý</span>
            ${call.notes ? `<span style="color:#6b7280;">— ${call.notes}</span>` : ''}
        </div>` : ''}
        ${call.answer_status_id ? `
        <div style="padding:10px 16px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border-top:1.5px solid #bbf7d0;font-size:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="ts-badge" style="background:#dcfce7;color:#065f46;">${call.answer_status_icon||'📋'} ${call.answer_status_name||''}</span>
            ${call.notes ? `<span style="color:#6b7280;">— ${call.notes}</span>` : ''}
            ${call.callback_date ? `<span class="ts-badge" style="background:#fef3c7;color:#92400e;">📅 Hẹn: ${call.callback_date}</span>` : ''}
        </div>` : ''}
    </div>`;
}

// ========== CALL ACTIONS ==========
function _gd_markCall(assignmentId, callStatus) {
    const call = _gd_calls.find(c => c.id === assignmentId);
    const khName = call?.customer_name || 'Khách hàng';
    const khPhone = call?.phone || '';

    const configs = {
        no_answer: {
            icon: '📵', title: 'Không Nghe Máy',
            desc: `Xác nhận <strong>${khName}</strong> ${khPhone ? '(<code>' + khPhone + '</code>)' : ''} không nghe máy?`,
            gradient: 'linear-gradient(135deg,#ef4444,#dc2626)',
            bgGrad: 'linear-gradient(135deg,#fef2f2,#fee2e2)',
            borderColor: '#fecaca', iconBg: '#fee2e2', iconColor: '#dc2626',
            btnGrad: 'linear-gradient(135deg,#ef4444,#dc2626)',
            btnText: '📵 Xác Nhận Không Nghe'
        },
        busy: {
            icon: '📞', title: 'Máy Bận',
            desc: `Xác nhận <strong>${khName}</strong> ${khPhone ? '(<code>' + khPhone + '</code>)' : ''} đang bận?`,
            gradient: 'linear-gradient(135deg,#f59e0b,#ea580c)',
            bgGrad: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
            borderColor: '#fde68a', iconBg: '#fef3c7', iconColor: '#d97706',
            btnGrad: 'linear-gradient(135deg,#f59e0b,#ea580c)',
            btnText: '📞 Xác Nhận Bận'
        },
        invalid: {
            icon: '❌', title: 'Hủy Khách, Không Tồn Tại',
            desc: `Xác nhận số <strong>${khName}</strong> ${khPhone ? '(<code>' + khPhone + '</code>)' : ''} không tồn tại hoặc hủy khách?<br><span style="font-size:11px;color:#6b7280;">Số này sẽ không được phân lại.</span>`,
            gradient: 'linear-gradient(135deg,#6b7280,#374151)',
            bgGrad: 'linear-gradient(135deg,#f9fafb,#f3f4f6)',
            borderColor: '#d1d5db', iconBg: '#f3f4f6', iconColor: '#374151',
            btnGrad: 'linear-gradient(135deg,#6b7280,#374151)',
            btnText: '❌ Xác Nhận Hủy'
        }
    };

    const cfg = configs[callStatus];
    if (!cfg) return;

    openModal(`${cfg.icon} ${cfg.title}`, `
        <div style="text-align:center;padding:10px 0;">
            <div style="width:80px;height:80px;border-radius:50%;background:${cfg.bgGrad};border:3px solid ${cfg.borderColor};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:36px;animation:_gdConfirmPulse 1.5s ease-in-out infinite;">
                ${cfg.icon}
            </div>
            <div style="font-size:15px;color:#1e293b;line-height:1.6;margin-bottom:8px;">
                ${cfg.desc}
            </div>
        </div>
        <style>@keyframes _gdConfirmPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }</style>
    `, `<button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 24px;font-size:13px;font-weight:700;border-radius:10px;">↩️ Quay Lại</button>
        <button onclick="_gd_confirmMarkCall(${assignmentId},'${callStatus}')" style="padding:10px 24px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:${cfg.btnGrad};color:white;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.2);transition:all .2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">${cfg.btnText}</button>`);
}

async function _gd_confirmMarkCall(assignmentId, callStatus) {
    try {
        closeModal();
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', { call_status: callStatus });
        if (res.success) {
            const labels = { answered: '✅ Đã ghi nhận bắt máy', no_answer: '📵 Không nghe máy', busy: '📞 Máy bận', invalid: '❌ Đã đánh dấu không tồn tại' };
            showToast(labels[callStatus] || `Đã cập nhật: ${callStatus}`);
            await _gd_loadCallsForUser(_gd_selectedUserId);
        } else {
            showToast(res.error || 'Lỗi không xác định', 'error');
        }
    } catch(e) {
        console.error('[_gd_markCall] ERROR:', e);
        showToast('Lỗi: ' + e.message, 'error');
    }
}

async function _gd_confirmCold(assignmentId, answerStatusId) {
    try {
        closeModal();
        const notes = document.getElementById(`gdNotes_${assignmentId}`)?.value || '';
        const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', { call_status:'answered', answer_status_id:answerStatusId, notes });
        if (res.success) { showToast('✅ Đã đóng băng'); await _gd_loadCallsForUser(_gd_selectedUserId); }
        else showToast(res.error, 'error');
    } catch(e) {
        console.error('[_gd_confirmCold] ERROR:', e);
        showToast('Lỗi: ' + e.message, 'error');
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
        const khName = call?.customer_name || 'Khách hàng';
        const khPhone = call?.phone || '';
        const isColdNcc = actionType === 'cold_ncc';
        const cfg = isColdNcc ? {
            icon: '🏪', title: 'Đã Có Nhà Cung Cấp',
            desc: `Xác nhận <strong>${khName}</strong> ${khPhone ? '(<code>' + khPhone + '</code>)' : ''} đã có nhà cung cấp?<br><span style="font-size:11px;color:#6b7280;">Số này sẽ được đóng băng theo thời gian cài đặt.</span>`,
            bgGrad: 'linear-gradient(135deg,#fefce8,#fef9c3)', borderColor: '#fde047',
            btnGrad: 'linear-gradient(135deg,#854d0e,#a16207)', btnText: '🏪 Xác Nhận Đã Có NCC'
        } : {
            icon: '🚫', title: 'Không Có Nhu Cầu',
            desc: `Xác nhận <strong>${khName}</strong> ${khPhone ? '(<code>' + khPhone + '</code>)' : ''} không có nhu cầu?<br><span style="font-size:11px;color:#6b7280;">Số này sẽ được đóng băng theo thời gian cài đặt.</span>`,
            bgGrad: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', borderColor: '#a5b4fc',
            btnGrad: 'linear-gradient(135deg,#6366f1,#4f46e5)', btnText: '🚫 Xác Nhận Không NC'
        };
        openModal(`${cfg.icon} ${cfg.title}`, `
            <div style="text-align:center;padding:10px 0;">
                <div style="width:80px;height:80px;border-radius:50%;background:${cfg.bgGrad};border:3px solid ${cfg.borderColor};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:36px;animation:_gdConfirmPulse 1.5s ease-in-out infinite;">
                    ${cfg.icon}
                </div>
                <div style="font-size:15px;color:#1e293b;line-height:1.6;margin-bottom:8px;">
                    ${cfg.desc}
                </div>
            </div>
            <style>@keyframes _gdConfirmPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }</style>
        `, `<button class="btn btn-secondary" onclick="closeModal()" style="padding:10px 24px;font-size:13px;font-weight:700;border-radius:10px;">↩️ Quay Lại</button>
            <button onclick="_gd_confirmCold(${assignmentId},${answerStatusId})" style="padding:10px 24px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:${cfg.btnGrad};color:white;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.2);transition:all .2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">${cfg.btnText}</button>`);
        return;
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
    // Map crm_type → nguồn khách tương ứng
    const _crmSourceMap = { 'goi_hop_tac': 'GỌI ĐIỆN ĐỐI TÁC', 'goi_ban_hang': 'GỌI ĐIỆN BÁN HÀNG', 'tu_tim_kiem': 'TỰ TÌM KIẾM TELESALE' };
    const sourceName = _crmSourceMap[crmType] || 'GỌI ĐIỆN TELESALE';
    const crmOptions = [
        {value:'nhu_cau',label:'Chăm Sóc KH Nhu Cầu'},{value:'ctv_hoa_hong',label:'Chăm Sóc Affiliate'},
    ];
    const hasName = !!(call.customer_name && call.customer_name.trim());
    const hasFb = !!(call.fb_link && call.fb_link.trim());

    // Split multiple phones on | separator
    const rawPhones = (call.phone || '').split('|').map(p => p.trim()).filter(Boolean);
    const phone1 = rawPhones[0] || '';
    const phone2 = rawPhones[1] || '';
    const hasPhone = !!phone1;

    openModal('📱 Chuyển Số Khách Hàng', `
        <div style="max-width:600px;">
            <input type="hidden" id="gdCSSourceName" value="${sourceName}">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">CRM <span style="color:#dc2626;">*</span></label>
                    <select id="gdCSCrm" class="form-control" onchange="_gd_csLoadJobTitles(this.value)">
                        ${crmOptions.map(o => `<option value="${o.value}" ${o.value===crmType?'selected':''}>${o.label}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">Nguồn Khách <span style="color:#dc2626;">*</span></label>
                    <input type="text" class="form-control" value="${sourceName}" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                </div>
            </div>
            <div id="gdCSJobTitleRow" style="display:none;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">Lĩnh Vực <span style="color:#dc2626;">*</span></label>
                    <select id="gdCSJobTitle" class="form-control">
                        <option value="">-- Chọn Lĩnh Vực --</option>
                    </select>
                </div>
                <div></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">Tên Khách Hàng <span style="color:#dc2626;">*</span></label>
                    <input type="text" id="gdCSName" class="form-control" value="${(call.customer_name||'').replace(/"/g,'&quot;')}" ${hasName?'disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;"':''}>
                </div>
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">📱 SĐT Chính <span style="color:#dc2626;">*</span></label>
                    <input type="text" id="gdCSPhone" class="form-control" value="${phone1}" ${hasPhone?'disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;"':''}>
                </div>
            </div>
            ${phone2 ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">📱 SĐT Phụ</label>
                    <input type="text" id="gdCSPhone2" class="form-control" value="${phone2}" disabled style="font-weight:700;color:#059669;background:#f0fdf4;cursor:not-allowed;border-color:#a7f3d0;">
                </div>
                <div></div>
            </div>` : ''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">🔗 Link Khách Hàng</label>
                    <input type="text" id="gdCSFacebook" class="form-control" value="${call.fb_link||''}" ${hasFb?'disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;"':''} placeholder="https://facebook.com, instagram.com, tiktok.com...">
                    <small style="color:#6b7280;font-size:10px;">Nhập SĐT hoặc Link MXH (ít nhất 1)</small>
                </div>
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">Công Việc</label>
                    <input type="text" class="form-control" value="Gọi Điện Telesale" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                    <input type="hidden" id="gdCSCongViec" value="Gọi Điện Telesale">
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">Sản Phẩm</label>
                    <select id="gdCSIndustry" class="form-control">
                        <option value="">-- Chọn sản phẩm --</option>
                    </select>
                </div>
                <div></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">Lĩnh Vực</label>
                    <input type="text" id="gdCSLinhVuc" class="form-control" value="${call.source_name || ''}" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                </div>
                <div></div>
            </div>
            <div class="form-group">
                <label style="font-weight:700;font-size:12px;color:#374151;">Người Nhận Số <span style="color:#dc2626;">*</span></label>
                <input type="text" class="form-control" value="${currentUser.full_name || currentUser.username}" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
            </div>
            <div class="form-group">
                <label style="font-weight:700;font-size:12px;color:#374151;">Ghi chú</label>
                <textarea id="gdCSNotes" class="form-control" rows="3" placeholder="Ghi chú thêm...">${notes||''}</textarea>
            </div>
        </div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="ts-btn ts-btn-green" onclick="_gd_submitChuyenSo(${assignmentId},${answerStatusId})">📱 Chuyển Số</button>`);

    // Load job titles for initial CRM
    _gd_csLoadJobTitles(crmType, call.source_name);

    // Load industries (Sản Phẩm) for dropdown
    apiCall('/api/settings/industries').then(data => {
        const sel = document.getElementById('gdCSIndustry');
        if (sel && data.items) {
            sel.innerHTML = '<option value="">-- Chọn sản phẩm --</option>' +
                data.items.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
        }
    });
}

async function _gd_csLoadJobTitles(crmType, preselect) {
    const jobRow = document.getElementById('gdCSJobTitleRow');
    const jobSel = document.getElementById('gdCSJobTitle');
    if (!jobRow || !jobSel) return;
    const crmTypesWithJobs = [];
    if (crmTypesWithJobs.includes(crmType)) {
        const data = await apiCall(`/api/telesale/sources?crm_type=${crmType}`);
        const sources = data.sources || [];
        jobSel.innerHTML = '<option value="">-- Chọn Lĩnh Vực --</option>' +
            sources.map(s => `<option value="${s.name}" ${preselect && s.name === preselect ? 'selected' : ''}>${s.name}</option>`).join('');
        jobRow.style.display = 'grid';
    } else {
        jobRow.style.display = 'none';
        jobSel.innerHTML = '<option value="">-- Chọn Lĩnh Vực --</option>';
    }
}

async function _gd_submitChuyenSo(assignmentId, answerStatusId) {
    const call = _gd_calls.find(c => c.id === assignmentId) || {};
    const crmType = document.getElementById('gdCSCrm')?.value;
    const phone = document.getElementById('gdCSPhone')?.value?.trim();
    const phone2 = document.getElementById('gdCSPhone2')?.value?.trim() || null;
    const fbLink = document.getElementById('gdCSFacebook')?.value?.trim();
    const customerName = document.getElementById('gdCSName')?.value?.trim();
    const jobTitle = document.getElementById('gdCSJobTitle')?.value;
    const notes = document.getElementById('gdCSNotes')?.value || '';
    const industryId = document.getElementById('gdCSIndustry')?.value || null;

    if (!crmType) return showToast('Chọn CRM', 'error');
    if (!customerName) return showToast('Vui lòng nhập Tên Khách Hàng', 'error');
    if (!phone && !fbLink) return showToast('Vui lòng nhập SĐT hoặc Link Khách Hàng', 'error');

    const custRes = await apiCall('/api/customers', 'POST', {
        crm_type: crmType,
        customer_name: customerName,
        phone: phone,
        phone2: phone2,
        facebook_link: fbLink || null,
        source_name: document.getElementById('gdCSSourceName')?.value || 'GỌI ĐIỆN TELESALE',
        receiver_id: currentUser.id,
        notes: notes,
        job: call.source_name || jobTitle || null,
        industry_id: industryId,
        cong_viec: document.getElementById('gdCSCongViec')?.value || 'Gọi Điện Telesale'
    });
    if (!custRes.success) return showToast(custRes.error || 'Lỗi chuyển số', 'error');

    const res = await apiCall(`/api/telesale/call/${assignmentId}`, 'PUT', {
        call_status:'answered', answer_status_id:answerStatusId, notes,
        transferred_customer_id: custRes.customer?.id || custRes.lastInsertRowid || null
    });
    if (res.success) { showToast(`✅ Chuyển số thành công! Mã: ${custRes.dailyNum || ''}`); closeModal(); await _gd_loadCallsForUser(_gd_selectedUserId); }
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
    const [res, coldNR, nccNR] = await Promise.all([
        apiCall('/api/telesale/settings'),
        apiCall('/api/app-config/telesale_cold_no_repump'),
        apiCall('/api/app-config/telesale_ncc_no_repump')
    ]);
    const coldMonths = res.cold_months || 4;
    const nccMonths = res.ncc_cold_months || 3;
    const coldNoRepump = coldNR.value === 'true';
    const nccNoRepump = nccNR.value === 'true';
    console.log('[GD Settings] Loaded:', { coldMonths, nccMonths, coldNoRepump, nccNoRepump });
    openModal('⚙️ Cài Đặt Gọi Điện Telesale', `
        <div style="display:flex;flex-direction:column;gap:16px;">
            <div style="padding:16px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;border:1.5px solid #93c5fd;">
                <div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:8px;">❄️ Kho Lạnh — Không Có Nhu Cầu</div>
                <div style="font-size:11px;color:#6b7280;margin-bottom:8px;">Khi KH không có nhu cầu → đóng băng bao lâu trước khi gọi lại</div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <input type="number" id="gdSettingColdMonths" class="form-control" value="${coldMonths}" min="1" max="24" ${coldNoRepump ? 'disabled' : ''} style="width:80px;text-align:center;font-weight:700;font-size:16px;opacity:${coldNoRepump ? '0.5' : '1'};background:${coldNoRepump ? '#f3f4f6' : 'white'};">
                    <span style="font-size:13px;color:#374151;font-weight:600;">tháng</span>
                </div>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 10px;background:${coldNoRepump ? 'rgba(220,38,38,0.08)' : 'rgba(0,0,0,0.03)'};border:1px solid ${coldNoRepump ? '#fca5a5' : '#e5e7eb'};border-radius:8px;transition:all .2s;">
                    <input type="checkbox" id="gdColdNoRepump" ${coldNoRepump ? 'checked' : ''} onchange="_gd_toggleNoRepump('cold', this.checked)" style="cursor:pointer;width:16px;height:16px;">
                    <span style="font-size:12px;font-weight:700;color:${coldNoRepump ? '#dc2626' : '#6b7280'};">🚫 Không bơm lại</span>
                </label>
            </div>
            <div style="padding:16px;background:linear-gradient(135deg,#fefce8,#fef9c3);border-radius:12px;border:1.5px solid #fde047;">
                <div style="font-size:13px;font-weight:700;color:#854d0e;margin-bottom:8px;">🏪 Đã Có Nhà Cung Cấp</div>
                <div style="font-size:11px;color:#6b7280;margin-bottom:8px;">Khi KH đã có NCC → đóng băng bao lâu trước khi gọi lại</div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <input type="number" id="gdSettingNccMonths" class="form-control" value="${nccMonths}" min="1" max="24" ${nccNoRepump ? 'disabled' : ''} style="width:80px;text-align:center;font-weight:700;font-size:16px;opacity:${nccNoRepump ? '0.5' : '1'};background:${nccNoRepump ? '#f3f4f6' : 'white'};">
                    <span style="font-size:13px;color:#374151;font-weight:600;">tháng</span>
                </div>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 10px;background:${nccNoRepump ? 'rgba(220,38,38,0.08)' : 'rgba(0,0,0,0.03)'};border:1px solid ${nccNoRepump ? '#fca5a5' : '#e5e7eb'};border-radius:8px;transition:all .2s;">
                    <input type="checkbox" id="gdNccNoRepump" ${nccNoRepump ? 'checked' : ''} onchange="_gd_toggleNoRepump('ncc', this.checked)" style="cursor:pointer;width:16px;height:16px;">
                    <span style="font-size:12px;font-weight:700;color:${nccNoRepump ? '#dc2626' : '#6b7280'};">🚫 Không bơm lại</span>
                </label>
            </div>
        </div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        <button class="ts-btn ts-btn-green" onclick="_gd_saveSettings()">💾 Lưu Cài Đặt</button>`);
}

function _gd_toggleNoRepump(type, checked) {
    const inputId = type === 'cold' ? 'gdSettingColdMonths' : 'gdSettingNccMonths';
    const labelId = type === 'cold' ? 'gdColdNoRepump' : 'gdNccNoRepump';
    const input = document.getElementById(inputId);
    if (input) {
        input.disabled = checked;
        input.style.opacity = checked ? '0.5' : '1';
        input.style.background = checked ? '#f3f4f6' : 'white';
    }
    const cb = document.getElementById(labelId);
    if (cb) {
        const label = cb.closest('label');
        if (label) {
            label.style.background = checked ? 'rgba(220,38,38,0.08)' : 'rgba(0,0,0,0.03)';
            label.style.borderColor = checked ? '#fca5a5' : '#e5e7eb';
            const span = label.querySelector('span');
            if (span) span.style.color = checked ? '#dc2626' : '#6b7280';
        }
    }
}

async function _gd_saveSettings() {
    const cold_months = parseInt(document.getElementById('gdSettingColdMonths')?.value) || 4;
    const ncc_cold_months = parseInt(document.getElementById('gdSettingNccMonths')?.value) || 3;
    const cold_no_repump = document.getElementById('gdColdNoRepump')?.checked === true;
    const ncc_no_repump = document.getElementById('gdNccNoRepump')?.checked === true;
    // Save all values via stable app-config API
    await Promise.all([
        apiCall('/api/telesale/settings', 'PUT', { cold_months, ncc_cold_months }),
        apiCall('/api/app-config/telesale_cold_no_repump', 'PUT', { value: String(cold_no_repump) }),
        apiCall('/api/app-config/telesale_ncc_no_repump', 'PUT', { value: String(ncc_no_repump) })
    ]);
    showToast('✅ Đã lưu cài đặt');
    closeModal();
}

// ========== DATA DETAIL MODAL ==========
const _gd_carrierMap = {
    'Viettel': { label:'Viettel', bg:'#ecfdf5', color:'#059669' },
    'Mobi': { label:'Mobi', bg:'#eff6ff', color:'#2563eb' },
    'Vina': { label:'Vina', bg:'#fefce8', color:'#ca8a04' },
    'Vnmb': { label:'Vnmb', bg:'#f0fdf4', color:'#16a34a' },
    'Gmob': { label:'Gmob', bg:'#faf5ff', color:'#9333ea' },
    'iTel': { label:'iTel', bg:'#fff7ed', color:'#ea580c' },
    'Reddi': { label:'Reddi', bg:'#fef2f2', color:'#b91c1c' },
    'invalid': { label:'Sai', bg:'#fef2f2', color:'#dc2626' },
};

async function _gd_viewDataDetail(dataId) {
    if (!dataId) return showToast('Không có thông tin data', 'error');
    const res = await apiCall(`/api/telesale/data/${dataId}`);
    if (!res.success) return showToast(res.error || 'Không tìm thấy data', 'error');
    const d = res.data;
    const assignments = res.assignments || [];
    const carriers = (d.carrier||'').split('|').filter(Boolean);
    const carrierHtml = carriers.map(c => {
        const cm = _gd_carrierMap[c] || _gd_carrierMap['invalid'];
        return `<span class="ts-badge" style="background:${cm.bg};color:${cm.color};font-size:11px;padding:2px 8px;">${cm.label}</span>`;
    }).join(' ') || '—';
    // ★ Rich status badge (same logic as hethonggoidien.js)
    const _detailBadge = (cs, at, dataStatus) => {
        let b;
        if (cs === 'invalid') b = { icon:'❌', label:'Hủy K.Tồn Tại', bg:'#fee2e2', color:'#dc2626' };
        else if (cs === 'answered' && at === 'cold_ncc') b = { icon:'🏪', label:'Đã Có NCC', bg:'#fef3c7', color:'#92400e' };
        else if (cs === 'answered' && at === 'cold') b = { icon:'🚫', label:'Không Có NC', bg:'#eef2ff', color:'#6366f1' };
        else if (cs === 'answered' && at === 'transfer') b = { icon:'🔥', label:'Chuyển Số', bg:'#fff7ed', color:'#ea580c' };
        else if (cs === 'answered') b = { icon:'📞', label:'Bắt Máy', bg:'#f5f3ff', color:'#7c3aed' };
        else if (cs === 'no_answer' || cs === 'busy') b = { icon:'📵', label:'Không Nghe, Bận', bg:'#eef2ff', color:'#4f46e5' };
        else if (dataStatus === 'assigned' || cs === 'pending') b = { icon:'📤', label:'Đã Phân', bg:'#dbeafe', color:'#2563eb' };
        else if (dataStatus === 'available') b = { icon:'✅', label:'Sẵn Sàng', bg:'#dcfce7', color:'#16a34a' };
        else if (dataStatus === 'cold') b = { icon:'🚫', label:'Không Có NC', bg:'#eef2ff', color:'#6366f1' };
        else b = { icon:'✅', label:'Sẵn Sàng', bg:'#dcfce7', color:'#16a34a' };
        return `<span class="ts-badge" style="background:${b.bg};color:${b.color};">${b.icon} ${b.label}</span>`;
    };
    const statusHtml = _detailBadge(d.last_call_status, d.answer_action_type, d.status);
    let assignHtml = '<div style="color:#9ca3af;font-size:12px;text-align:center;padding:12px;">Chưa có lịch sử phân bổ</div>';
    if (assignments.length > 0) {
        assignHtml = `<table class="ts-table" style="font-size:12px;"><thead><tr>
            <th>Ngày</th><th>NV</th><th>Trạng thái</th><th>Ghi chú</th>
        </tr></thead><tbody>
        ${assignments.map(a => `<tr>
            <td style="white-space:nowrap;">${a.assigned_date ? new Date(a.assigned_date).toLocaleDateString('vi-VN') : '—'}</td>
            <td style="font-weight:600;">${a.user_name || '—'}</td>
            <td>${_detailBadge(a.call_status, a.answer_action_type, null)}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${a.answer_status_name || a.notes || '—'}</td>
        </tr>`).join('')}
        </tbody></table>`;
    }
    openModal('📋 Chi Tiết Data #' + d.id, `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
            <div style="background:#f0f9ff;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">📱 SĐT</label><div style="font-size:18px;font-weight:800;color:#2563eb;font-family:'SF Mono',monospace;letter-spacing:1px;">${d.phone}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">📡 Nhà Mạng</label><div style="margin-top:2px;">${carrierHtml}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">👤 Tên KH</label><div style="font-weight:700;font-size:15px;color:#122546;">${d.customer_name || '—'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">🏢 Công Ty</label><div style="font-weight:600;color:#374151;">${d.company_name || '—'}</div></div>
            <div style="background:#fffbeb;padding:12px;border-radius:10px;grid-column:1/-1;"><label style="font-size:10px;color:#92400e;font-weight:600;display:block;margin-bottom:4px;">📝 Nội Dung ĐB</label><div style="color:#374151;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word;">${d.post_content || '—'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">📍 Địa Chỉ</label><div style="color:#374151;">${d.address || '—'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">📊 Trạng Thái</label><div style="margin-top:2px;">${statusHtml}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">👨‍💼 NV Phân Cho</label><div style="font-weight:600;color:#374151;">${d.last_assigned_user_name || '—'}</div></div>
            <div style="background:#f8fafc;padding:12px;border-radius:10px;"><label style="font-size:10px;color:#6b7280;font-weight:600;display:block;margin-bottom:4px;">📅 Ngày Phân</label><div style="color:#374151;">${d.last_assigned_date ? new Date(d.last_assigned_date).toLocaleDateString('vi-VN') : '—'}</div></div>
        </div>
        <div style="border-top:1.5px solid #e5e7eb;padding-top:14px;">
            <div style="font-size:13px;font-weight:700;color:#122546;margin-bottom:10px;">📜 Lịch Sử Phân Bổ (${assignments.length})</div>
            <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;max-height:200px;overflow-y:auto;">${assignHtml}</div>
        </div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`);
}

// ========== SELF-SEARCH CRM ==========
async function _gd_loadSelfSearchProgress(userId) {
    const el = document.getElementById('gdSelfSearchProgress');
    if (!el) return;
    const dr = _gd_getDateRange();
    const isSingleDay = dr.from === dr.to;
    const statsRes = await apiCall(`/api/telesale/self-search-stats/${userId}?date=${dr.from}`);
    _gd_selfSearchCount = statsRes.count || 0;
    const target = statsRes.target || 20;
    const pct = Math.min(100, Math.round(_gd_selfSearchCount / target * 100));
    const done = _gd_selfSearchCount >= target;
    el.innerHTML = `
    <div style="margin-bottom:14px;padding:14px 16px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1.5px solid #a5b4fc;border-radius:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13px;font-weight:700;color:#3730a3;">🔍 Tự Tìm Kiếm Telesale: ${_gd_selfSearchCount}/${target} KH${isSingleDay && canDo('goi_dien', 'create') ? ' hôm nay' : ''}</span>
            <div style="display:flex;gap:8px;align-items:center;">
                <span style="font-size:12px;font-weight:800;color:${done?'#059669':'#6366f1'};">${pct}%${done?' ✅':''}</span>
                ${isSingleDay && canDo('goi_dien', 'create') ? `<button onclick="_gd_openSelfSearchModal()" style="padding:6px 14px;border:none;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(99,102,241,0.3);transition:all .2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">＋ Thêm KH</button>` : ''}
            </div>
        </div>
        <div style="background:#c7d2fe;border-radius:10px;height:10px;overflow:hidden;"><div style="background:linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa);height:100%;width:${pct}%;border-radius:10px;transition:width 0.5s ease;"></div></div>
    </div>`;
}

let _gd_ssSelectedDisposition = null; // Track selected call disposition

function _gd_openSelfSearchModal() {
    _gd_ssSelectedDisposition = null;
    const srcOptions = _gd_selfSearchSources.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
    const isMgr = ['giam_doc', 'quan_ly_cap_cao', 'quan_ly', 'truong_phong'].includes(currentUser.role);

    // 5 call dispositions (removed has_ncc)
    const dispositions = [
        { key: 'transfer', icon: '🔥', label: 'Có nhu cầu — Chuyển số', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', positive: true },
        { key: 'quote', icon: '📨', label: 'Yêu cầu gửi báo giá', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', positive: true },
        { key: 'meet', icon: '🤝', label: 'Hẹn gặp trực tiếp', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', positive: true },
        { key: 'considering', icon: '💬', label: 'Đang cân nhắc', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', positive: true },
        { key: 'no_need', icon: '🚫', label: 'Không có nhu cầu', color: '#6366f1', bg: '#eef2ff', border: '#a5b4fc', positive: false },
    ];

    const crmOptions = [
        {value:'nhu_cau',label:'Chăm Sóc KH Nhu Cầu'},{value:'ctv_hoa_hong',label:'Chăm Sóc Affiliate'},
    ];

    openModal('🔍 Thêm KH Tự Tìm Kiếm Telesale', `
        <div style="max-width:600px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">👤 Tên KH/Đối tác <span style="color:#dc2626;">*</span></label>
                    <input id="gdSSName" type="text" class="form-control" placeholder="VD: Nguyễn Văn A">
                </div>
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">📱 Số Điện Thoại</label>
                    <input id="gdSSPhone" type="text" class="form-control" placeholder="0912345678">
                    <small style="color:#6b7280;font-size:10px;">Bắt buộc nếu không có Link MXH</small>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">🔗 Link Khách Hàng</label>
                    <input id="gdSSFbLink" type="url" class="form-control" placeholder="https://facebook.com/...">
                    <small style="color:#6b7280;font-size:10px;">Bắt buộc nếu không có SĐT</small>
                </div>
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">Công Việc</label>
                    <input type="text" class="form-control" value="Gọi Điện Telesale" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div class="form-group">
                    <label style="font-weight:700;font-size:12px;color:#374151;">📂 Lĩnh Vực <span style="color:#dc2626;">*</span></label>
                    <select id="gdSSSource" class="form-control"><option value="">-- Chọn lĩnh vực --</option>${srcOptions}</select>
                </div>
                <div></div>
            </div>
            <div class="form-group">
                <label style="font-weight:700;font-size:12px;color:#374151;">📞 Tình trạng bắt máy <span style="color:#dc2626;">*</span></label>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;" id="gdSSDispositions">
                    ${dispositions.map(d => `
                        <button type="button" id="gdSSDisp_${d.key}" onclick="_gd_ssSelectDisposition('${d.key}')"
                            style="padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;
                            border:1.5px solid ${d.border};background:${d.bg};color:${d.color};"
                            onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
                        >${d.icon} ${d.label}</button>
                    `).join('')}
                </div>
            </div>
            <div id="gdSSCrmRow" style="display:none;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                    <div class="form-group">
                        <label style="font-weight:700;font-size:12px;color:#374151;">CRM <span style="color:#dc2626;">*</span></label>
                        <select id="gdSSCrm" class="form-control">
                            ${crmOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label style="font-weight:700;font-size:12px;color:#374151;">Nguồn Khách</label>
                        <input type="text" class="form-control" value="TỰ TÌM KIẾM TELESALE" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
                    </div>
                </div>
            </div>
            <div id="gdSSDispHint" style="display:none;margin-bottom:10px;padding:6px 10px;border-radius:6px;font-size:11px;font-weight:600;"></div>
            <div class="form-group">
                <label style="font-weight:700;font-size:12px;color:#374151;">Người Nhận Số</label>
                <input type="text" class="form-control" value="${currentUser.full_name || currentUser.username}" disabled style="font-weight:700;color:#122546;background:#f1f5f9;cursor:not-allowed;">
            </div>
            <div class="form-group">
                <label style="font-weight:700;font-size:12px;color:#374151;">📝 Ghi chú</label>
                <textarea id="gdSSNotes" class="form-control" rows="2" placeholder="Ghi chú cuộc gọi..." style="resize:vertical;"></textarea>
            </div>
        </div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="ts-btn ts-btn-green" onclick="_gd_submitSelfSearch()">💾 Thêm KH</button>`);
}

function _gd_ssSelectDisposition(key) {
    _gd_ssSelectedDisposition = key;
    const dispositions = {
        transfer: { icon: '🔥', label: 'Có nhu cầu — Chuyển số', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', positive: true },
        quote: { icon: '📨', label: 'Yêu cầu gửi báo giá', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', positive: true },
        meet: { icon: '🤝', label: 'Hẹn gặp trực tiếp', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', positive: true },
        considering: { icon: '💬', label: 'Đang cân nhắc', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', positive: true },
        no_need: { icon: '🚫', label: 'Không có nhu cầu', color: '#6366f1', bg: '#eef2ff', border: '#a5b4fc', positive: false },
    };
    // Highlight selected button, dim others
    Object.keys(dispositions).forEach(k => {
        const btn = document.getElementById(`gdSSDisp_${k}`);
        if (!btn) return;
        const d = dispositions[k];
        if (k === key) {
            btn.style.background = d.color;
            btn.style.color = 'white';
            btn.style.borderColor = d.color;
            btn.style.boxShadow = `0 2px 10px ${d.color}40`;
            btn.style.transform = 'scale(1.05)';
        } else {
            btn.style.background = d.bg;
            btn.style.color = d.color;
            btn.style.borderColor = d.border;
            btn.style.boxShadow = 'none';
            btn.style.transform = 'scale(1)';
            btn.style.opacity = '0.5';
        }
    });
    // Show/hide CRM row based on positive/negative
    const crmRow = document.getElementById('gdSSCrmRow');
    const sel = dispositions[key];
    if (crmRow) crmRow.style.display = sel && sel.positive ? 'block' : 'none';
    // Show hint
    const hint = document.getElementById('gdSSDispHint');
    if (hint && sel) {
        hint.style.display = 'block';
        if (sel.positive) {
            hint.style.background = '#f0fdf4';
            hint.style.color = '#065f46';
            hint.style.border = '1px solid #bbf7d0';
            hint.innerHTML = `✅ KH sẽ được chuyển vào <b>CRM</b> + ghi nhận Tự Tìm Kiếm Telesale`;
        } else {
            hint.style.background = '#fef2f2';
            hint.style.color = '#991b1b';
            hint.style.border = '1px solid #fecaca';
            hint.innerHTML = `⛔ KH chỉ ghi nhận ở <b>Tự Tìm Kiếm Telesale</b>, không đổ vào CRM`;
        }
    }
}

function _gd_ssValidateContact() {
    const fb = document.getElementById('gdSSFbLink')?.value?.trim();
    const ph = document.getElementById('gdSSPhone')?.value?.trim();
    const err = document.getElementById('gdSSContactError');
    if (err) err.style.display = (!fb && !ph) ? 'block' : 'none';
}

async function _gd_submitSelfSearch() {
    const customer_name = document.getElementById('gdSSName')?.value?.trim();
    const fb_link = document.getElementById('gdSSFbLink')?.value?.trim();
    const phone = document.getElementById('gdSSPhone')?.value?.trim();
    const source_id = document.getElementById('gdSSSource')?.value;
    const notes = document.getElementById('gdSSNotes')?.value?.trim();
    const call_disposition = _gd_ssSelectedDisposition;

    if (!customer_name) return showToast('Nhập tên KH!', 'error');
    if (!fb_link && !phone) return showToast('Cần ít nhất Link MXH hoặc SĐT!', 'error');
    if (!source_id) return showToast('Chọn Lĩnh Vực!', 'error');
    if (!call_disposition) return showToast('Chọn tình trạng bắt máy!', 'error');

    const isPositive = ['transfer', 'quote', 'meet', 'considering'].includes(call_disposition);
    if (isPositive) {
        const crmType = document.getElementById('gdSSCrm')?.value;
        if (!crmType) return showToast('Chọn CRM!', 'error');
        // Create customer in CRM
        const selectedSrc = _gd_selfSearchSources.find(s => String(s.id) === String(source_id));
        try {
            const custRes = await apiCall('/api/customers', 'POST', {
                crm_type: crmType,
                customer_name: customer_name,
                phone: phone || null,
                facebook_link: fb_link || null,
                source_name: 'TỰ TÌM KIẾM TELESALE',
                receiver_id: currentUser.id,
                notes: notes || null,
                job: selectedSrc?.name || null,
                cong_viec: 'Gọi Điện Telesale'
            });
            if (!custRes.success) return showToast(custRes.error || 'Lỗi chuyển số CRM', 'error');
        } catch(e) {
            return showToast(e.message || 'Lỗi chuyển số CRM', 'error');
        }
    }

    try {
        const res = await apiCall('/api/telesale/self-search', 'POST', {
            customer_name, fb_link: fb_link || null, phone: phone || null,
            source_id: Number(source_id), search_location_id: null,
            call_disposition, notes: notes || null
        });
        if (res.success) {
            showToast(`✅ ${res.message} (${res.today_count} KH hôm nay)`);
            closeModal();
            await _gd_loadCallsForUser(_gd_selectedUserId);
        } else {
            showToast(res.error || 'Lỗi', 'error');
        }
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}

// ========== NƠI TÌM KIẾM MANAGER ==========
async function _gd_openLocationManager() {
    const locRes = await apiCall('/api/self-search-locations');
    _gd_selfSearchLocations = locRes.locations || [];
    const listHtml = _gd_selfSearchLocations.map(l => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f8fafc;border-radius:8px;margin-bottom:6px;border:1px solid #e5e7eb;">
            <span style="font-size:13px;font-weight:600;color:#1e293b;">📍 ${l.name}</span>
            <button onclick="_gd_deleteLocation(${l.id})" style="padding:3px 8px;font-size:10px;border:1px solid #ef4444;border-radius:5px;background:#fef2f2;color:#ef4444;cursor:pointer;font-weight:600;">🗑️ Xóa</button>
        </div>
    `).join('') || '<div style="text-align:center;color:#9ca3af;font-size:12px;padding:20px;">Chưa có nơi tìm kiếm nào</div>';

    openModal('📍 Quản Lý Nơi Tìm Kiếm', `
        <div style="margin-bottom:16px;">
            <div style="display:flex;gap:8px;margin-bottom:12px;">
                <input id="gdNewLocationName" type="text" class="form-control" placeholder="VD: Facebook, Zalo, Google Maps..." style="flex:1;font-size:13px;">
                <button onclick="_gd_addLocation()" class="ts-btn ts-btn-green" style="white-space:nowrap;">＋ Thêm</button>
            </div>
        </div>
        <div id="gdLocationList">${listHtml}</div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Đóng</button>`);
}

async function _gd_addLocation() {
    const name = document.getElementById('gdNewLocationName')?.value?.trim();
    if (!name) return showToast('Nhập tên nơi tìm kiếm!', 'error');
    try {
        const res = await apiCall('/api/self-search-locations', 'POST', { name });
        if (res.success) { showToast('✅ Đã thêm'); _gd_openLocationManager(); }
        else showToast(res.error, 'error');
    } catch(e) { showToast(e.message, 'error'); }
}

async function _gd_deleteLocation(id) {
    if (!confirm('Xóa nơi tìm kiếm này?')) return;
    try {
        const res = await apiCall(`/api/self-search-locations/${id}`, 'DELETE');
        if (res.success) { showToast('✅ Đã xóa'); _gd_openLocationManager(); }
        else showToast(res.error, 'error');
    } catch(e) { showToast(e.message, 'error'); }
}
