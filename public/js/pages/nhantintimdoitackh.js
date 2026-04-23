// ========== NHẮN TIN TÌM ĐỐI TÁC KH ==========
let _poCollapsedDepts = new Set(); // Track which depts are manually collapsed
let _po = { entries:[], categories:[], members:[], stats:{}, selectedUser:null, selectedDept:null, imageData:null, scheduleInfo:null };
let _poSelectedCat = null; // null = all, or category id
let _poOverrideUserIds = new Set(); // users with task overrides
let _poDatePreset = 'today';
let _poDateFrom = '';
let _poDateTo = '';
let _poSelectedYear = new Date().getFullYear();

function _poGetDateRange() {
    const today = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const todayStr = fmt(today);
    switch (_poDatePreset) {
        case 'today': return { from: todayStr, to: todayStr, label: 'hôm nay' };
        case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); const ys=fmt(y); return { from: ys, to: ys, label: 'hôm qua' }; }
        case '7days': { const d = new Date(today); d.setDate(d.getDate()-6); return { from: fmt(d), to: todayStr, label: '7 ngày' }; }
        case 'this_month': { const m = new Date(_poSelectedYear, today.getMonth(), 1); return { from: fmt(m), to: todayStr, label: 'tháng này' }; }
        case 'last_month': { const m1 = new Date(_poSelectedYear, today.getMonth()-1, 1); const m2 = new Date(_poSelectedYear, today.getMonth(), 0); return { from: fmt(m1), to: fmt(m2), label: 'tháng trước' }; }
        case 'custom': return { from: _poDateFrom, to: _poDateTo, label: `${_poDateFrom} → ${_poDateTo}` };
        case 'all': return { from: `${_poSelectedYear}-01-01`, to: `${_poSelectedYear}-12-31`, label: `năm ${_poSelectedYear}` };
        default: return { from: todayStr, to: todayStr, label: 'hôm nay' };
    }
}
function _poSwitchPreset(preset) { _poDatePreset = preset; if (preset === 'custom') return; _poLoadData(); _poLoadAll(); }
function _poApplyCustomDate() { _poDateFrom = document.getElementById('poDateFrom')?.value||''; _poDateTo = document.getElementById('poDateTo')?.value||''; if (_poDateFrom&&_poDateTo) { _poLoadData(); _poLoadAll(); } }

function _poInit() {
    if (window.location.pathname !== '/nhantintimdoitackh') return;
    const area = document.getElementById('contentArea');
    if (!area) return;
    area.innerHTML = `
    <div style="display:flex;gap:0;min-height:calc(100vh - 60px);">
        <div id="poSidebar" style="width:260px;min-width:260px;background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px 12px;overflow-y:auto;"></div>
        <div style="flex:1;padding:20px 24px;overflow-y:auto;">
            <div id="poGuide"></div>
            <div id="poStats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>
            <div id="poDateFilter"></div>
            <div id="poCatFilter" style="margin-bottom:14px;"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 id="poTableTitle" style="margin:0;font-size:18px;color:#122546;">📋 Danh sách hôm nay</h2>
                <div id="poActionButtons" style="display:flex;gap:8px;"></div>
            </div>
            <div id="poTable"></div>
        </div>
    </div>
    <!-- Lightbox -->
    <div id="poLightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;align-items:center;justify-content:center;cursor:zoom-out;" onclick="_poCloseLightbox()">
        <img id="poLightboxImg" src="" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;box-shadow:0 0 40px rgba(0,0,0,0.5);transition:transform .3s ease;" onclick="event.stopPropagation()">
        <button onclick="_poCloseLightbox()" style="position:absolute;top:20px;right:24px;background:rgba(255,255,255,0.15);border:none;color:white;width:44px;height:44px;border-radius:50%;font-size:22px;cursor:pointer;backdrop-filter:blur(8px);transition:all .2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">✕</button>
        <div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;">
            <button onclick="event.stopPropagation();_poLightboxZoom(1.5)" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;backdrop-filter:blur(8px);">🔍+ Phóng to</button>
            <button onclick="event.stopPropagation();_poLightboxZoom(1)" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;backdrop-filter:blur(8px);">↺ Gốc</button>
        </div>
    </div>`;
    // Lightbox CSS
    if (!document.getElementById('_poLightboxCSS')) {
        const st = document.createElement('style'); st.id = '_poLightboxCSS';
        st.textContent = `
        .po-thumb { width:52px;height:52px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid #e2e8f0;transition:all .2s;box-shadow:0 1px 4px rgba(0,0,0,0.08); }
        .po-thumb:hover { transform:scale(1.15);border-color:#3b82f6;box-shadow:0 4px 16px rgba(37,99,235,0.25); }
        #poLightbox { display:none; }
        #poLightbox.active { display:flex !important; animation:_poFadeIn .2s ease; }
        @keyframes _poFadeIn { from{opacity:0} to{opacity:1} }
        `;
        document.head.appendChild(st);
    }
    document.getElementById('pageTitle').textContent = 'Nhắn Tìm Đối Tác KH KOL Tiktok';
    _poLoadAll();
}

let _poCurrentZoom = 1;
function _poOpenLightbox(src) {
    const lb = document.getElementById('poLightbox');
    const img = document.getElementById('poLightboxImg');
    img.src = src; img.style.transform = 'scale(1)'; _poCurrentZoom = 1;
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function _poCloseLightbox() {
    document.getElementById('poLightbox')?.classList.remove('active');
    document.body.style.overflow = '';
}
function _poLightboxZoom(z) {
    _poCurrentZoom = z;
    document.getElementById('poLightboxImg').style.transform = `scale(${z})`;
}

function _poRenderGuide() {
    const el = document.getElementById('poGuide');
    if (!el) return;
    const si = _po.scheduleInfo;
    const guideUrl = si?.guide_url;
    if (!guideUrl) { el.innerHTML = ''; return; }
    el.innerHTML = `
    <a href="${guideUrl}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:12px 18px;margin-bottom:16px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;text-decoration:none;color:white;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(245,158,11,0.35);transition:all .2s;border:2px solid #fbbf24;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(245,158,11,0.5)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 15px rgba(245,158,11,0.35)'">
        <span style="font-size:18px;">📘</span>
        HƯỚNG DẪN CÔNG VIỆC: NHẮN TÌM ĐỐI TÁC KH KOL TIKTOK
        <span style="margin-left:auto;font-size:16px;">→</span>
    </a>`;
}

async function _poLoadAll() {
    const [catRes, memRes, ovRes] = await Promise.all([
        apiCall('/api/partner-outreach/categories'),
        apiCall('/api/partner-outreach/members'),
        apiCall('/api/schedule/override-users').catch(() => ({ user_ids: [] }))
    ]);
    _po.categories = catRes.categories || [];
    _poOverrideUserIds = new Set((ovRes.user_ids || []).map(Number));
    _poCachedDepts = memRes.departments || [];
    _poRenderSidebar(_poCachedDepts);
    await _poLoadData();
}

async function _poLoadScheduleInfo() {
    try {
        const uid = _po.selectedUser || currentUser.id;
        _po.scheduleInfo = await apiCall('/api/partner-outreach/schedule-info?user_id=' + uid);
    } catch(e) { _po.scheduleInfo = null; }
}

async function _poLoadData() {
    const dr = _poGetDateRange();
    let url = `/api/partner-outreach/entries?date_from=${dr.from}&date_to=${dr.to}`;
    if (_po.selectedUser) url += '&user_id=' + _po.selectedUser;
    else if (_po.selectedDept) url += '&dept_id=' + _po.selectedDept;
    // Stats: dept aggregate when viewing dept, user-specific otherwise
    let statsUrl = '/api/partner-outreach/stats?';
    if (_po.selectedDept && !_po.selectedUser) statsUrl += 'dept_id=' + _po.selectedDept;
    else statsUrl += 'user_id=' + (_po.selectedUser || currentUser.id);
    const [entRes, stRes] = await Promise.all([
        apiCall(url),
        apiCall(statsUrl)
    ]);
    _po.entries = entRes.entries || [];
    _po.stats = stRes;
    await _poLoadScheduleInfo();
    _poRenderGuide();
    _poRenderStats();
    _poRenderDateFilter();
    _poRenderCategoryFilter();
    _poRenderTable();
    _poUpdateActionButtons();
}

// Check if currently viewing own data (can add entries + report)
// RULE: Mỗi tài khoản chỉ được báo cáo/thêm cho chính mình
function _poIsViewingSelf() {
    // If a specific user is selected, it must be the current user
    if (_po.selectedUser) return _po.selectedUser === currentUser.id;
    // If a dept is selected (not a specific user), viewing team/dept aggregate → can't add/report
    if (_po.selectedDept) return false;
    // "Tất cả nhân viên" selected → aggregate view → can't add/report
    // UNLESS user is nhan_vien/part_time (they only see themselves)
    if (['nhan_vien','part_time'].includes(currentUser.role)) return true;
    return false;
}

function _poUpdateActionButtons() {
    const el = document.getElementById('poActionButtons');
    if (!el) return;
    const canAdd = _poIsViewingSelf();
    let h = '';
    if (currentUser?.role === 'giam_doc') {
        h += '<button onclick="_poCatModal()" style="padding:8px 16px;border:1px solid #6366f1;border-radius:8px;background:#eef2ff;color:#6366f1;cursor:pointer;font-weight:600;font-size:13px;">⚙️ Lĩnh Vực</button>';
    }
    // Chỉ hiện nút Thêm khi xem chính tài khoản mình
    if (canAdd) {
        h += '<button onclick="_poAddModal()" style="padding:8px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(37,99,235,0.3);">＋ Thêm Đối Tác</button>';
    }
    // Hiện nhãn khi xem phòng/team tổng hợp
    if (!canAdd && (_po.selectedDept || (!_po.selectedUser && !['nhan_vien','part_time'].includes(currentUser.role)))) {
        h += '<span style="padding:8px 16px;border-radius:8px;background:#f1f5f9;color:#64748b;font-size:12px;font-weight:600;border:1px solid #e2e8f0;">👁️ Chế độ xem tổng hợp</span>';
    }
    el.innerHTML = h;
}

function _poToday() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
}
function _poFormatDate(ds) { if (!ds) return ''; const d = new Date(ds+'T00:00:00'); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }

function _poRenderSidebar(depts) {
    const sb = document.getElementById('poSidebar');
    if (!sb) return;
    const role = currentUser.role;
    if (role === 'nhan_vien' || role === 'part_time') { sb.style.display = 'none'; return; }

    // Inject sparkle CSS once (shared with dailylinks)
    if (!document.getElementById('_dlSparkleCSS')) {
        const style = document.createElement('style'); style.id = '_dlSparkleCSS';
        style.textContent = `
        @keyframes _dlBorderGlow {
            0%,100% { border-color: rgba(99,102,241,0.4); box-shadow: 0 0 8px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.1); }
            50% { border-color: rgba(168,85,247,0.6); box-shadow: 0 0 16px rgba(168,85,247,0.25), inset 0 1px 0 rgba(255,255,255,0.2); }
        }
        @keyframes _dlShimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        @keyframes _dlPulseGlow {
            0%,100% { opacity: 0.4; }
            50% { opacity: 1; }
        }
        ._dlTeamCard {
            position: relative; border-radius: 12px; padding: 10px 14px; cursor: pointer;
            display: flex; align-items: center; justify-content: space-between;
            border: 1.5px solid rgba(99,102,241,0.3);
            animation: _dlBorderGlow 3s ease-in-out infinite;
            transition: all 0.25s ease; overflow: hidden;
        }
        ._dlTeamCard::before {
            content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
            background-size: 200% 100%; animation: _dlShimmer 3s ease-in-out infinite;
            pointer-events: none; border-radius: 12px;
        }
        ._dlTeamCard:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15) !important; }
        ._dlTeamCard--0 { background: linear-gradient(135deg, rgba(37,99,235,0.08), rgba(99,102,241,0.05)); border-color: rgba(37,99,235,0.35); }
        ._dlTeamCard--0:hover { background: linear-gradient(135deg, rgba(37,99,235,0.14), rgba(99,102,241,0.1)); }
        ._dlTeamCard--1 { background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.05)); border-color: rgba(16,185,129,0.35); animation-name: _dlBorderGlow1; }
        ._dlTeamCard--1:hover { background: linear-gradient(135deg, rgba(16,185,129,0.14), rgba(5,150,105,0.1)); }
        ._dlTeamCard--2 { background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.05)); border-color: rgba(245,158,11,0.35); animation-name: _dlBorderGlow2; }
        ._dlTeamCard--2:hover { background: linear-gradient(135deg, rgba(245,158,11,0.14), rgba(217,119,6,0.1)); }
        ._dlTeamCard--3 { background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.05)); border-color: rgba(168,85,247,0.35); animation-name: _dlBorderGlow3; }
        ._dlTeamCard--3:hover { background: linear-gradient(135deg, rgba(168,85,247,0.14), rgba(139,92,246,0.1)); }
        @keyframes _dlBorderGlow1 { 0%,100% { border-color:rgba(16,185,129,0.35);box-shadow:0 0 8px rgba(16,185,129,0.12);} 50%{border-color:rgba(52,211,153,0.6);box-shadow:0 0 16px rgba(52,211,153,0.22);}}
        @keyframes _dlBorderGlow2 { 0%,100% { border-color:rgba(245,158,11,0.35);box-shadow:0 0 8px rgba(245,158,11,0.12);} 50%{border-color:rgba(251,191,36,0.6);box-shadow:0 0 16px rgba(251,191,36,0.22);}}
        @keyframes _dlBorderGlow3 { 0%,100% { border-color:rgba(168,85,247,0.35);box-shadow:0 0 8px rgba(168,85,247,0.12);} 50%{border-color:rgba(192,132,252,0.6);box-shadow:0 0 16px rgba(192,132,252,0.22);}}
        ._dlTeamBadge { font-size:10px;font-weight:800;padding:3px 9px;border-radius:12px;color:white;min-width:20px;text-align:center;animation:_dlPulseGlow 2.5s ease-in-out infinite; }
        ._dlTeamIcon { width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0; }
        ._dlMemberRow { padding:7px 12px 7px 18px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px;margin:2px 0;transition:all 0.15s ease; }
        ._dlMemberRow:hover { background: #f1f5f9; }
        `;
        document.head.appendChild(style);
    }

    const TEAM_STYLES = [
        { badge:'#3b82f6', icon:'🏢', iconBg:'linear-gradient(135deg,#3b82f6,#6366f1)' },
        { badge:'#10b981', icon:'🚀', iconBg:'linear-gradient(135deg,#10b981,#34d399)' },
        { badge:'#f59e0b', icon:'🌟', iconBg:'linear-gradient(135deg,#f59e0b,#fbbf24)' },
        { badge:'#a855f7', icon:'💎', iconBg:'linear-gradient(135deg,#a855f7,#c084fc)' },
    ];

    const grad = 'linear-gradient(135deg,#2563eb,#1d4ed8)';
    const isAll = !_po.selectedUser && !_po.selectedDept;
    let h = `
    <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
            <div style="width:32px;height:32px;border-radius:10px;background:${grad};display:flex;align-items:center;justify-content:center;font-size:16px;">💬</div>
            <div style="font-size:15px;font-weight:800;color:#122546;">Phòng Kinh Doanh</div>
        </div>
        <div onclick="_poSelectAll()" style="padding:10px 14px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;margin-bottom:6px;
            background:${isAll ? grad : 'linear-gradient(135deg,#f1f5f9,#e2e8f0)'};
            color:${isAll ? 'white' : '#475569'};
            box-shadow:${isAll ? '0 3px 12px rgba(0,0,0,0.2)' : 'none'};
            transition:all 0.2s ease;">
            📊 Tất cả nhân viên
        </div>
    </div>
    <div style="height:1px;background:linear-gradient(to right,transparent,#cbd5e1,transparent);margin:12px 0;"></div>`;
    (depts||[]).forEach((d, di) => {
        const isDeptSel = _po.selectedDept==d.id && !_po.selectedUser;
        const hasSelMember = d.members.some(m => _po.selectedUser == m.id);
        const isOpen = !_poCollapsedDepts.has(d.id); // Always open unless manually collapsed
        const ts = TEAM_STYLES[di % TEAM_STYLES.length];
        h += `
        <div style="margin-bottom:10px;">
            <div class="_dlTeamCard _dlTeamCard--${di % 4}" style="${isDeptSel ? 'transform:scale(1.02);' : ''}">
                <div onclick="_poSelectDept(${d.id})" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer;">
                    <div class="_dlTeamIcon" style="background:${ts.iconBg};color:white;">${ts.icon}</div>
                    <span style="font-size:12px;font-weight:800;color:${isDeptSel ? '#1e293b' : '#475569'};text-transform:uppercase;letter-spacing:0.5px;">${d.name}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <span class="_dlTeamBadge" style="background:${ts.badge};">${d.members.length}</span>
                    <div onclick="event.stopPropagation();_poToggleOnly(${d.id})" style="width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;font-size:11px;color:#475569;flex-shrink:0;" onmouseover="this.style.background='rgba(0,0,0,0.15)'" onmouseout="this.style.background='rgba(0,0,0,0.08)'" title="${isOpen ? 'Thu gọn' : 'Mở rộng'}">${isOpen ? '▼' : '▶'}</div>
                </div>
            </div>`;
        if (isOpen) {
            d.members.forEach(m => {
                const isSel = _po.selectedUser == m.id;
                const initials = (m.full_name || '').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
                h += `
                <div onclick="_poSelectUser(${m.id})" class="_dlMemberRow" style="
                    background:${isSel ? grad : 'transparent'};
                    box-shadow:${isSel ? '0 2px 10px rgba(0,0,0,0.18)' : 'none'};">
                    <div style="width:28px;height:28px;border-radius:50%;background:${isSel ? 'rgba(255,255,255,0.25)' : 'linear-gradient(135deg,#e2e8f0,#cbd5e1)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:${isSel ? 'white' : '#64748b'};flex-shrink:0;">${initials}</div>
                    <span style="font-size:13px;font-weight:${isSel ? '700' : '500'};color:${isSel ? 'white' : '#334155'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;">${m.full_name}${_poOverrideUserIds.has(m.id) ? '<span title="Đã tùy chỉnh công việc" style="display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-size:8px;padding:2px 5px;border-radius:4px;font-weight:800;line-height:1;flex-shrink:0;box-shadow:0 1px 3px rgba(217,119,6,0.3);">✏️ TC</span>' : ''}</span>
                </div>`;
            });
        }
        h += '</div>';
    });
    sb.innerHTML = h;
}

function _poSelectAll() { _po.selectedUser=null; _po.selectedDept=null; _poRenderSidebarFromCache(); _poLoadData(); _poLoadAll(); }
function _poSelectDept(id) { _po.selectedUser=null; _po.selectedDept=id; _poRenderSidebarFromCache(); _poLoadData(); }
function _poSelectUser(id) { _po.selectedUser=id; _po.selectedDept=null; _poRenderSidebarFromCache(); _poLoadData(); }
function _poToggleOnly(id){if(_poCollapsedDepts.has(id)){_poCollapsedDepts.delete(id);}else{_poCollapsedDepts.add(id);}_poRenderSidebarFromCache();}
function _poToggleDept(id){if(_poCollapsedDepts.has(id)){_poCollapsedDepts.delete(id);}else{_poCollapsedDepts.add(id);}_poSelectDept(id);}

// Cache departments for re-rendering sidebar without re-fetching
let _poCachedDepts = [];
function _poRenderSidebarFromCache() { _poRenderSidebar(_poCachedDepts); }

function _poRenderStats() {
    const s = _po.stats;
    const el = document.getElementById('poStats');
    if (!el) return;
    const si = _po.scheduleInfo;
    const isDeptView = _po.selectedDept && !_po.selectedUser;
    // Khi xem dept/team: dùng target tổng hợp từ stats API, không dùng scheduleInfo cá nhân
    const target = isDeptView ? (s.target || 20) : (si?.found ? si.min_quantity : (s.target || 20));
    const todayDone = isDeptView ? (s.today || 0) : (si?.found ? si.today_count : (s.today || 0));
    const pct = target > 0 ? Math.min(100, Math.round(todayDone / target * 100)) : 0;
    const isComplete = todayDone >= target;
    const isSelf = _poIsViewingSelf();

    // Report status — CHỈ hiện khi xem chính tài khoản mình
    let reportBadge = '';
    let reportBtn = '';
    if (si?.found && isSelf) {
        if (si.report) {
            if (si.report.status === 'approved') reportBadge = '<div style="margin-top:8px;"><span style="background:#dcfce7;color:#059669;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;">✅ Đã duyệt</span></div>';
            else if (si.report.status === 'pending') reportBadge = '<div style="margin-top:8px;"><span style="background:#fef3c7;color:#d97706;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;">⏳ Chờ duyệt</span></div>';
            else if (si.report.status === 'rejected') {
                reportBadge = '<div style="margin-top:8px;"><span style="background:#fecaca;color:#dc2626;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;">❌ Bị từ chối</span></div>';
                reportBtn = `<button onclick="_poSubmitReport()" style="margin-top:8px;padding:8px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#dc2626,#991b1b);color:white;cursor:pointer;font-weight:800;font-size:13px;box-shadow:0 3px 12px rgba(220,38,38,0.4);transition:all .2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">🔄 Nộp lại</button>`;
            }
        } else if (todayDone > 0) {
            reportBtn = `<button onclick="_poSubmitReport()" style="margin-top:8px;padding:8px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;cursor:pointer;font-weight:800;font-size:13px;box-shadow:0 3px 12px rgba(22,163,74,0.4);transition:all .2s;animation:_poPulse 2s infinite;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">📤 Báo Cáo (${todayDone} đối tác)</button>`;
        }
    }

    const wt = s.week_target || s.target || 20;
    const mt = s.month_target || s.target || 20;
    const cards = [
        { label:'Hôm Nay', val:`${todayDone}/${target}`, bg:'linear-gradient(135deg,#3b82f6,#2563eb)', icon:'📊' },
        { label:'Tuần Này', val:`${s.week||0}/${wt}`, bg:'linear-gradient(135deg,#f59e0b,#d97706)', icon:'📅' },
        { label:'Tháng Này', val:`${s.month||0}/${mt}`, bg:'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon:'📆' },
        { label:'Đã Chuyển Số', val:s.transferred||0, bg:'linear-gradient(135deg,#10b981,#059669)', icon:'🔄' },
    ];
    el.innerHTML = cards.map(c => `
        <div style="flex:1;min-width:180px;background:${c.bg};border-radius:14px;padding:18px 20px;color:white;box-shadow:0 4px 15px rgba(0,0,0,0.15);">
            <div style="font-size:28px;margin-bottom:4px;">${c.icon}</div>
            <div style="font-size:28px;font-weight:900;">${c.val}</div>
            <div style="font-size:12px;opacity:0.9;font-weight:600;margin-top:2px;">${c.label}</div>
        </div>`).join('')
    + (si?.found ? `
        <div style="width:100%;margin-top:4px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:13px;font-weight:700;color:#334155;">📋 Tiến độ Lịch Khóa Biểu</span>
                    <span style="font-size:11px;font-weight:600;color:${isComplete ? '#059669' : '#dc2626'};">${todayDone}/${target} ${isComplete ? '✅' : ''}</span>
                    ${si.points ? `<span style="background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;">${si.points}đ</span>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    ${reportBadge}
                    ${reportBtn}
                </div>
            </div>
            <div style="background:#e5e7eb;border-radius:8px;height:8px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,${isComplete ? '#059669,#10b981' : '#3b82f6,#60a5fa'});height:100%;width:${pct}%;border-radius:8px;transition:width 0.5s ease;"></div>
            </div>
        </div>` : '');

    // Inject pulse animation
    if (!document.getElementById('_poPulseCSS')) {
        const st = document.createElement('style'); st.id = '_poPulseCSS';
        st.textContent = '@keyframes _poPulse { 0%,100%{box-shadow:0 3px 12px rgba(22,163,74,0.4)} 50%{box-shadow:0 3px 20px rgba(22,163,74,0.7)} }';
        document.head.appendChild(st);
    }
}

async function _poSubmitReport() {
    const si = _po.scheduleInfo;
    if (!si?.found) { showToast('Không tìm thấy công việc trong Lịch Khóa Biểu!', 'error'); return; }

    const todayCount = si.today_count;
    if (todayCount === 0) { showToast('Chưa có đối tác nào hôm nay!', 'error'); return; }

    const today = _poToday();
    const isRedo = si.report && si.report.status === 'rejected';

    try {
        if (isRedo) {
            // Redo: PUT /api/schedule/report/:id/redo
            const formData = new FormData();
            formData.append('quantity', todayCount);
            formData.append('content', `Nhắn Tìm Đối Tác: ${todayCount} đối tác`);
            formData.append('report_value', window.location.origin + '/nhantintimdoitackh');
            const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
            const resp = await fetch(`/api/schedule/report/${si.report.id}/redo`, {
                method: 'PUT',
                body: formData,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const result = await resp.json();
            if (result.success) {
                showToast('🔄 Đã nộp lại! ⏳ Chờ duyệt');
                await _poLoadData();
            } else {
                showToast('Lỗi: ' + (result.error || 'Không thể nộp lại'), 'error');
            }
        } else {
            // New report: POST /api/schedule/report
            const formData = new FormData();
            formData.append('template_id', si.template_id);
            formData.append('report_date', today);
            formData.append('quantity', todayCount);
            formData.append('content', `Nhắn Tìm Đối Tác: ${todayCount} đối tác`);
            formData.append('report_value', window.location.origin + '/nhantintimdoitackh');
            const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
            const resp = await fetch('/api/schedule/report', {
                method: 'POST',
                body: formData,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await resp.json();
            if (data.success) {
                const msg = data.status === 'pending' ? '⏳ Chờ duyệt' : `+${data.points_earned}đ`;
                showToast(`✅ Đã nộp báo cáo! ${msg}`);
                await _poLoadData();
            } else {
                showToast('Lỗi: ' + (data.error || 'Không thể nộp'), 'error');
            }
        }
    } catch(e) { showToast('Lỗi gửi báo cáo: ' + (e.message || ''), 'error'); }
}

function _poRenderDateFilter() {
    const el = document.getElementById('poDateFilter');
    if (!el) return;
    const dr = _poGetDateRange();
    const presets = [
        { key:'today', label:'Hôm nay', icon:'📅' },
        { key:'yesterday', label:'Hôm qua', icon:'⏪' },
        { key:'7days', label:'7 ngày', icon:'📆' },
        { key:'this_month', label:'Tháng này', icon:'🗓️' },
        { key:'last_month', label:'Tháng trước', icon:'📋' },
        { key:'all', label:'Tất cả', icon:'♾️' },
    ];
    const isSingle = dr.from === dr.to;
    el.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px;padding:10px 14px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1.5px solid #e2e8f0;border-radius:12px;">
        <span style="font-size:13px;font-weight:800;color:#334155;margin-right:4px;">📅</span>
        ${presets.map(p => { const a = _poDatePreset === p.key; return `<button onclick="_poSwitchPreset('${p.key}')" style="padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;border:1.5px solid ${a?'#2563eb':'#e2e8f0'};background:${a?'linear-gradient(135deg,#2563eb,#3b82f6)':'white'};color:${a?'white':'#64748b'};box-shadow:${a?'0 2px 8px rgba(37,99,235,0.3)':'none'};">${p.icon} ${p.label}</button>`; }).join('')}
        <span style="width:1px;height:20px;background:#cbd5e1;margin:0 4px;"></span>
        <button onclick="_poDatePreset='custom';document.getElementById('poCustomArea').style.display='flex';" style="padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${_poDatePreset==='custom'?'#7c3aed':'#e2e8f0'};background:${_poDatePreset==='custom'?'linear-gradient(135deg,#7c3aed,#8b5cf6)':'white'};color:${_poDatePreset==='custom'?'white':'#64748b'};transition:all .2s;">🔧 Tùy chọn</button>
        <select onchange="_poSelectedYear=parseInt(this.value);_poSwitchPreset('all')" style="padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;border:1.5px solid #2563eb;background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1e40af;cursor:pointer;">
            ${(() => { const cur = new Date().getFullYear(); let opts = ''; for (let y = cur; y >= 2024; y--) { opts += `<option value="${y}" ${y === _poSelectedYear ? 'selected' : ''}>${y}</option>`; } return opts; })()}
        </select>
        <div id="poCustomArea" style="display:${_poDatePreset==='custom'?'flex':'none'};align-items:center;gap:6px;margin-left:4px;">
            <input type="date" id="poDateFrom" value="${dr.from}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_poDateFrom=this.value">
            <span style="font-size:11px;color:#9ca3af;">→</span>
            <input type="date" id="poDateTo" value="${dr.to}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_poDateTo=this.value">
            <button onclick="_poApplyCustomDate()" style="padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid #059669;background:linear-gradient(135deg,#059669,#10b981);color:white;">✓</button>
        </div>
        ${dr.from ? `<span style="margin-left:auto;font-size:10px;color:#6b7280;font-weight:600;">📊 ${dr.from}${!isSingle?' → '+dr.to:''}</span>` : ''}
    </div>`;

    const titleEl = document.getElementById('poTableTitle');
    if (titleEl) {
        const titleLabels = { today:'hôm nay', yesterday:'hôm qua', '7days':'7 ngày qua', this_month:'tháng này', last_month:'tháng trước', all:`năm ${_poSelectedYear}`, custom:`${dr.from} → ${dr.to}` };
        titleEl.textContent = `📋 Danh sách ${titleLabels[_poDatePreset] || 'hôm nay'}`;
    }
}

function _poSelectCat(catId) {
    _poSelectedCat = _poSelectedCat === catId ? null : catId;
    _poRenderCategoryFilter();
    _poRenderTable();
}

function _poRenderCategoryFilter() {
    const el = document.getElementById('poCatFilter');
    if (!el) return;
    const cats = _po.categories || [];
    const entries = _po.entries || [];

    // Count entries per category
    const catCounts = {};
    let noCatCount = 0;
    entries.forEach(e => {
        if (e.category_id) catCounts[e.category_id] = (catCounts[e.category_id] || 0) + 1;
        else noCatCount++;
    });

    const isAll = _poSelectedCat === null;
    let h = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;">`;
    // "Tất Cả" box
    h += `<div onclick="_poSelectCat(null)" style="
        min-width:100px;padding:10px 16px;border-radius:10px;cursor:pointer;text-align:center;
        font-size:12px;font-weight:700;transition:all .2s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
        background:${isAll ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'white'};
        color:${isAll ? 'white' : '#475569'};
        border:2px solid ${isAll ? '#2563eb' : '#e2e8f0'};
        box-shadow:${isAll ? '0 4px 12px rgba(37,99,235,0.3)' : '0 1px 4px rgba(0,0,0,0.06)'};
    " onmouseover="if(!${isAll})this.style.borderColor='#93c5fd'" onmouseout="if(!${isAll})this.style.borderColor='#e2e8f0'">
        <span style="font-size:16px;">📋</span>
        <span>Tất Cả</span>
        <span style="font-size:10px;opacity:0.8;font-weight:600;">${entries.length}</span>
    </div>`;

    // Each category box
    cats.forEach(c => {
        const isSel = _poSelectedCat === c.id;
        const count = catCounts[c.id] || 0;
        h += `<div onclick="_poSelectCat(${c.id})" style="
            min-width:100px;padding:10px 16px;border-radius:10px;cursor:pointer;text-align:center;
            font-size:12px;font-weight:700;transition:all .2s;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
            background:${isSel ? c.color : 'white'};
            color:${isSel ? 'white' : '#475569'};
            border:2px solid ${isSel ? c.color : '#e2e8f0'};
            box-shadow:${isSel ? '0 4px 12px ' + c.color + '50' : '0 1px 4px rgba(0,0,0,0.06)'};
        " onmouseover="if(!${isSel})this.style.borderColor='${c.color}'" onmouseout="if(!${isSel})this.style.borderColor='#e2e8f0'">
            <span style="width:12px;height:12px;border-radius:50%;background:${isSel ? 'rgba(255,255,255,0.5)' : c.color};flex-shrink:0;"></span>
            <span>${c.name}</span>
            <span style="font-size:10px;opacity:0.8;font-weight:600;">${count}</span>
        </div>`;
    });

    h += '</div>';
    el.innerHTML = h;
}

function _poRenderTable() {
    const el = document.getElementById('poTable');
    if (!el) return;
    let rows = _po.entries;
    // Filter by selected category
    if (_poSelectedCat !== null) {
        rows = rows.filter(r => r.category_id === _poSelectedCat);
    }
    const dr = _poGetDateRange();
    const isMultiDay = dr.from !== dr.to;
    if (!rows.length) { el.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af;">Chưa có dữ liệu ${_poDatePreset==='today'?'hôm nay':'trong khoảng thời gian này'}</div>`; return; }
    const isOwner = (uid) => uid === currentUser.id;
    const today = _poToday();
    let h = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
            <th style="padding:10px 8px;text-align:center;width:40px;">STT</th>
            ${isMultiDay?'<th style="padding:10px 8px;width:90px;">NGÀY</th>':''}
            <th style="padding:10px 8px;">NHÂN VIÊN</th>
            <th style="padding:10px 8px;">TÊN KHÁCH</th>
            <th style="padding:10px 8px;">LINK FACEBOOK</th>
            <th style="padding:10px 8px;">SĐT</th>
            <th style="padding:10px 8px;">KÊNH ISOCAL</th>
            <th style="padding:10px 8px;">LĨNH VỰC</th>
            <th style="padding:10px 8px;text-align:center;">ẢNH TIN NHẮN</th>
            <th style="padding:10px 8px;text-align:center;">THAO TÁC</th>
            <th style="padding:10px 8px;text-align:center;">TIME CẬP NHẬT</th>
        </tr></thead><tbody>`;
    rows.forEach((r, i) => {
        const catBadge = r.category_name ? `<span style="background:${r.category_color||'#e5e7eb'};color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${r.category_name}</span>` : '-';
        // Thumbnail ảnh thay vì link text
        const imgCell = r.image_path 
            ? `<img src="${r.image_path}" class="po-thumb" onclick="_poOpenLightbox('${r.image_path}')" alt="Ảnh tin nhắn" loading="lazy">` 
            : '<span style="color:#d1d5db;font-size:12px;">—</span>';
        const fbShort = r.fb_link.length > 30 ? r.fb_link.substring(0,30)+'...' : r.fb_link;
        const entryDate = typeof r.entry_date === 'string' ? r.entry_date.split('T')[0] : r.entry_date;
        const channelColors = {'Facebook Cá Nhân':'#1877f2','Page Facebook':'#4267b2','Tiktok':'#000000','Instagram':'#e4405f','Threads':'#333333','Linkedin':'#0a66c2','Twitter':'#1da1f2'};
        const chColor = channelColors[r.channel] || '#6b7280';
        const channelBadge = r.channel ? `<span style="background:${chColor};color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${r.channel}</span>` : '—';
        let actions = '';
        if (r.transferred_to_crm) {
            actions = '<span style="background:#dcfce7;color:#16a34a;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;">✅ Đã Chuyển Số</span>';
        } else {
            actions += `<button onclick="_poChuyenSo(${r.id})" style="padding:3px 8px;border:1px solid #ea580c;border-radius:6px;background:#fff7ed;color:#ea580c;cursor:pointer;font-size:11px;font-weight:600;margin-right:4px;" title="Chuyển Số Khách Hàng">📱 Chuyển Số</button>`;
            if (isOwner(r.user_id) && entryDate === today) {
                actions += `<button onclick="_poEditModal(${r.id})" style="padding:3px 8px;border:1px solid #d1d5db;border-radius:6px;background:white;cursor:pointer;font-size:11px;margin-right:4px;">✏️</button>`;
                actions += `<button onclick="_poDelete(${r.id})" style="padding:3px 8px;border:1px solid #fecaca;border-radius:6px;background:#fff5f5;color:#dc2626;cursor:pointer;font-size:11px;">🗑️</button>`;
            }
        }
        const updatedAt = r.updated_at || r.created_at || '';
        const fmtTime = updatedAt ? new Date(updatedAt).toLocaleString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
        h += `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#6b7280;">${i+1}</td>
            ${isMultiDay?`<td style="padding:10px 8px;font-size:11px;font-weight:600;color:#475569;">${_poFormatDate(entryDate)}</td>`:''}
            <td style="padding:10px 8px;font-size:13px;color:#1e293b;font-weight:700;">${r.user_name||'—'}</td>
            <td style="padding:10px 8px;font-weight:600;color:#122546;">${r.partner_name||'—'}</td>
            <td style="padding:10px 8px;"><a href="${r.fb_link}" target="_blank" style="color:#2563eb;">${fbShort}</a></td>
            <td style="padding:10px 8px;">${r.phone||'—'}</td>
            <td style="padding:10px 8px;">${channelBadge}</td>
            <td style="padding:10px 8px;">${catBadge}</td>
            <td style="padding:10px 8px;text-align:center;">${imgCell}</td>
            <td style="padding:10px 8px;text-align:center;white-space:nowrap;">${actions}</td>
            <td style="padding:10px 8px;text-align:center;font-size:11px;color:#6b7280;white-space:nowrap;">${fmtTime}</td>
        </tr>`;
    });
    h += '</tbody></table>';
    el.innerHTML = h;
}

function _poAddModal(editEntry) {
    const isEdit = !!editEntry;
    _po.imageData = null;
    document.getElementById('poModal')?.remove();
    const m = document.createElement('div'); m.id = 'poModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(500px,92vw);max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:20px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:18px;font-weight:800;">${isEdit?'✏️ Sửa':'＋ Thêm'} Đối Tác</div>
                <button onclick="document.getElementById('poModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:24px;">
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Kênh Isocal <span style="color:#dc2626;">*</span> <span style="font-size:11px;color:#6b7280;font-weight:400;">(chọn trước)</span></label>
                <div id="poFChannelWrap" style="position:relative;margin-top:4px;"></div>
            </div>
            <div style="margin-bottom:14px;">
                <label id="poFLinkLabel" style="font-weight:600;font-size:13px;color:#374151;">Link MXH <span style="color:#dc2626;">*</span></label>
                <input id="poFFb" value="${editEntry?.fb_link||''}" ${editEntry?.channel ? '' : 'disabled'} style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;${editEntry?.channel ? '' : 'background:#f1f5f9;cursor:not-allowed;'}" placeholder="${editEntry?.channel ? '' : 'Vui lòng chọn Kênh Isocal trước'}">
                <small id="poFLinkHint" style="font-size:10px;margin-top:2px;display:${editEntry?.channel ? 'block' : 'none'};color:#6b7280;"></small>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                    <label style="font-weight:600;font-size:13px;color:#374151;">Tên Đối Tác / KH <span style="color:#dc2626;">*</span></label>
                    <input id="poFName" value="${editEntry?.partner_name||''}" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;" placeholder="VD: Nguyễn Văn A (không bắt buộc)">
                </div>
                <div>
                    <label style="font-weight:600;font-size:13px;color:#374151;">SĐT (nếu có)</label>
                    <input id="poFPhone" value="${editEntry?.phone||''}" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:4px;box-sizing:border-box;" placeholder="09xx...">
                </div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Lĩnh Vực <span style="color:#dc2626;">*</span></label>
                <div id="poFCatWrap" style="position:relative;margin-top:4px;"></div>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Hình Ảnh <span style="color:#dc2626;">*</span> (Ctrl+V để dán)</label>
                <div id="poFImgZone" tabindex="0" style="margin-top:4px;border:2px dashed #fde68a;border-radius:10px;padding:24px;text-align:center;cursor:pointer;background:#fffbeb;min-height:80px;outline:none;transition:border-color .2s;" onclick="this.focus()">
                    <div id="poFImgPreview" style="font-size:13px;color:#92400e;">📋 Click vào đây rồi Ctrl+V để dán hình ảnh</div>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid #f3f4f6;">
                <button onclick="document.getElementById('poModal').remove()" style="padding:9px 18px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                <button onclick="_poSave(${editEntry?.id||'null'})" style="padding:9px 22px;border:none;border-radius:8px;background:#2563eb;color:white;cursor:pointer;font-size:13px;font-weight:700;">💾 ${isEdit?'Cập Nhật':'Ghi Nhận'}</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(m);
    // Paste handler
    const zone = document.getElementById('poFImgZone');
    zone.addEventListener('paste', e => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = ev => {
                    _po.imageData = ev.target.result;
                    document.getElementById('poFImgPreview').innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:200px;border-radius:8px;">`;
                    zone.style.borderColor = '#10b981';
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    });
    if (editEntry?.image_path) {
        document.getElementById('poFImgPreview').innerHTML = `<img src="${editEntry.image_path}" style="max-width:100%;max-height:200px;border-radius:8px;">`;
    }
    // Channel → Link mapping
    const _poChCfg = {
        'Facebook Cá Nhân': { label: 'Link Facebook', domain: 'facebook.com', ph: 'https://www.facebook.com/abc' },
        'Page Facebook':    { label: 'Page Facebook', domain: 'facebook.com', ph: 'https://www.facebook.com/abc/' },
        'Tiktok':           { label: 'Tiktok', domain: 'tiktok.com', ph: 'https://www.tiktok.com/@abc' },
        'Instagram':        { label: 'Instagram', domain: 'instagram.com', ph: 'https://www.instagram.com/abc' },
        'Threads':          { label: 'Threads', domain: 'threads.com', ph: 'https://www.threads.com/@abc' },
        'Linkedin':         { label: 'Linkedin', domain: 'linkedin.com', ph: 'https://www.linkedin.com/in/abc' },
        'Twitter':          { label: 'Twitter', domain: 'x.com', ph: 'https://x.com/abc' },
    };
    window._poChCfg = _poChCfg; // expose for validation in _poSave
    function _poOnChannelChange(channelValue) {
        const linkInput = document.getElementById('poFFb');
        const linkLabel = document.getElementById('poFLinkLabel');
        const linkHint = document.getElementById('poFLinkHint');
        if (!linkInput || !linkLabel) return;
        const cfg = _poChCfg[channelValue];
        if (cfg) {
            linkLabel.innerHTML = cfg.label + ' <span style="color:#dc2626;">*</span>';
            linkInput.placeholder = cfg.ph;
            linkInput.disabled = false;
            linkInput.style.background = '#fff';
            linkInput.style.cursor = 'text';
            if (linkHint) { linkHint.style.display = 'block'; linkHint.textContent = 'Link phải chứa "' + cfg.domain + '"'; linkHint.style.color = '#6b7280'; }
        } else {
            linkLabel.innerHTML = 'Link MXH <span style="color:#dc2626;">*</span>';
            linkInput.placeholder = 'Vui lòng chọn Kênh Isocal trước';
            linkInput.disabled = true;
            linkInput.style.background = '#f1f5f9';
            linkInput.style.cursor = 'not-allowed';
            linkInput.value = '';
            if (linkHint) { linkHint.style.display = 'none'; }
        }
    }
    // Link input validation feedback + auto-extract username
    const fbInput = document.getElementById('poFFb');
    fbInput.addEventListener('input', () => {
        const channelVal = document.getElementById('poFChannel')?.value;
        const cfg = _poChCfg[channelVal];
        const linkHint = document.getElementById('poFLinkHint');
        const url = fbInput.value.trim().toLowerCase();
        if (cfg && linkHint) {
            if (!url) { linkHint.style.color = '#6b7280'; linkHint.textContent = 'Link phải chứa "' + cfg.domain + '"'; fbInput.style.borderColor = '#d1d5db'; }
            else if (url.includes(cfg.domain)) { linkHint.style.color = '#10b981'; linkHint.textContent = '✅ Link ' + cfg.label + ' hợp lệ'; fbInput.style.borderColor = '#10b981'; }
            else { linkHint.style.color = '#ef4444'; linkHint.textContent = '❌ Link phải chứa "' + cfg.domain + '"'; fbInput.style.borderColor = '#ef4444'; }
        }
        // Auto-extract username for name field
        const nameInput = document.getElementById('poFName');
        if (nameInput && !nameInput.value.trim() && url) {
            try {
                const match = url.match(/(?:facebook|fb)\.com\/([^/?&#]+)/i) || url.match(/tiktok\.com\/@?([^/?&#]+)/i) || url.match(/instagram\.com\/([^/?&#]+)/i) || url.match(/threads\.com\/@?([^/?&#]+)/i) || url.match(/linkedin\.com\/in\/([^/?&#]+)/i) || url.match(/x\.com\/([^/?&#]+)/i);
                if (match && match[1] && !['profile.php','pages','groups','watch','reel','share','photo','video','story'].includes(match[1].toLowerCase())) {
                    nameInput.value = decodeURIComponent(match[1]).replace('@','');
                }
            } catch(e) {}
        }
    });
    // Init searchable dropdowns
    const channelOpts = ['Facebook Cá Nhân','Page Facebook','Tiktok','Instagram','Threads','Linkedin','Twitter'];
    _poInitSearchDropdown('poFChannelWrap', 'poFChannel', channelOpts, editEntry?.channel || '', _poOnChannelChange);
    const catItems = (_po.categories||[]).map(c => ({value: String(c.id), label: c.name}));
    _poInitSearchDropdown('poFCatWrap', 'poFCat', catItems, editEntry?.category_id ? String(editEntry.category_id) : '');
    // If editing, update link field for existing channel
    if (editEntry?.channel) _poOnChannelChange(editEntry.channel);
}

// Reusable searchable dropdown component
function _poInitSearchDropdown(wrapperId, hiddenId, options, initialValue, onChange) {
    const wrap = document.getElementById(wrapperId);
    if (!wrap) return;
    // options can be [{value, label}] or ['string', ...]
    const items = options.map(o => typeof o === 'string' ? {value: o, label: o} : o);
    const initItem = items.find(i => i.value === initialValue);
    wrap.innerHTML = `
        <input type="hidden" id="${hiddenId}" value="${initialValue||''}">
        <input id="${hiddenId}_search" type="text" autocomplete="off" value="${initItem?.label||''}"
            style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;background:white;"
            placeholder="Gõ để tìm...">
        <div id="${hiddenId}_list" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:10000;background:white;border:1px solid #d1d5db;border-radius:8px;max-height:180px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.15);margin-top:2px;"></div>
    `;
    const searchInput = document.getElementById(hiddenId + '_search');
    const listEl = document.getElementById(hiddenId + '_list');
    const hiddenInput = document.getElementById(hiddenId);

    function renderList(filter) {
        const q = (filter||'').toLowerCase();
        const filtered = q ? items.filter(i => i.label.toLowerCase().includes(q)) : items;
        if (filtered.length === 0) {
            listEl.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:#9ca3af;">Không tìm thấy</div>';
        } else {
            listEl.innerHTML = filtered.map(i => `
                <div class="po-dd-item" data-value="${i.value}" style="padding:9px 14px;font-size:13px;cursor:pointer;transition:background .15s;${hiddenInput.value===i.value?'background:#eff6ff;color:#2563eb;font-weight:700;':''}"
                    onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${hiddenInput.value===i.value?'#eff6ff':'white'}'">${i.label}</div>
            `).join('');
        }
        listEl.querySelectorAll('.po-dd-item').forEach(el => {
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                hiddenInput.value = el.dataset.value;
                searchInput.value = el.textContent.trim();
                listEl.style.display = 'none';
                if (typeof onChange === 'function') onChange(el.dataset.value);
            });
        });
    }

    searchInput.addEventListener('focus', () => { renderList(searchInput.value); listEl.style.display = 'block'; });
    searchInput.addEventListener('input', () => { hiddenInput.value = ''; renderList(searchInput.value); listEl.style.display = 'block'; });
    searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            listEl.style.display = 'none';
            // If no valid selection, reset
            if (!hiddenInput.value) {
                const match = items.find(i => i.label.toLowerCase() === searchInput.value.toLowerCase().trim());
                if (match) { hiddenInput.value = match.value; searchInput.value = match.label; if (typeof onChange === 'function') onChange(match.value); }
                else { searchInput.value = ''; if (typeof onChange === 'function') onChange(''); }
            }
        }, 200);
    });
}

function _poEditModal(id) {
    const entry = _po.entries.find(e => e.id === id);
    if (!entry) return;
    _poAddModal(entry);
}

async function _poSave(editId) {
    const name = document.getElementById('poFName').value.trim();
    const fb = document.getElementById('poFFb').value.trim();
    const phone = document.getElementById('poFPhone').value.trim();
    const catId = document.getElementById('poFCat').value;
    const channel = document.getElementById('poFChannel').value;
    if (!channel) { showToast('Vui lòng chọn Kênh Isocal trước!', 'error'); return; }
    if (!name) { showToast('Vui lòng nhập Tên Đối Tác / KH!', 'error'); return; }
    if (!fb) { showToast('Vui lòng nhập link!', 'error'); return; }
    // Validate domain matches selected channel
    if (window._poChCfg && window._poChCfg[channel]) {
        const reqDomain = window._poChCfg[channel].domain;
        if (!fb.toLowerCase().includes(reqDomain)) {
            showToast('Link phải chứa "' + reqDomain + '" cho kênh ' + channel + '!', 'error');
            return;
        }
    }
    if (!catId) { showToast('Vui lòng chọn Lĩnh Vực!', 'error'); return; }
    if (!editId && !_po.imageData) { showToast('Vui lòng dán hình ảnh chụp tin nhắn!', 'error'); return; }
    const payload = { partner_name: name, fb_link: fb, phone, category_id: catId || null, channel, image_data: _po.imageData };
    try {
        if (editId) await apiCall('/api/partner-outreach/entries/' + editId, 'PUT', payload);
        else await apiCall('/api/partner-outreach/entries', 'POST', payload);
        document.getElementById('poModal')?.remove();
        showToast('✅ ' + (editId ? 'Đã cập nhật!' : 'Đã thêm đối tác!'));
        _poLoadData();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _poDelete(id) {
    if (!confirm('Xóa entry này?')) return;
    try {
        await apiCall('/api/partner-outreach/entries/' + id, 'DELETE');
        showToast('✅ Đã xóa'); _poLoadData();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _poChuyenSo(id) {
    const entry = (_po.entries || []).find(e => e.id === id);
    if (!entry) { showToast('Không tìm thấy entry', 'error'); return; }
    // Get category name for Lĩnh Vực
    const cat = (_po.categories || []).find(c => c.id === entry.category_id);
    const linhVuc = cat ? cat.name : '';
    // Open the global MXH Chuyển Số modal with callback
    await openChuyenSoMXH('nhantintimdoitackh', linhVuc, async () => {
        // Mark entry as transferred after successful Chuyển Số
        try {
            await apiCall('/api/partner-outreach/entries/' + id + '/mark-transferred', 'POST');
        } catch(e) { /* ignore if fails */ }
        _poLoadData(); // Reload table to reflect new status
    });
    // Pre-fill fields from entry data
    setTimeout(() => {
        const nameEl = document.getElementById('csMxhName');
        const phoneEl = document.getElementById('csMxhPhone');
        const fbEl = document.getElementById('csMxhFacebook');
        if (nameEl && entry.partner_name) nameEl.value = entry.partner_name;
        if (phoneEl && entry.phone) phoneEl.value = entry.phone;
        if (fbEl && entry.fb_link) { fbEl.value = entry.fb_link; fbEl.dispatchEvent(new Event('input')); }
    }, 300);
}

async function _poTransfer(id) {
    // Show dropdown to choose CRM destination
    const old = document.getElementById('poTransferModal');
    if (old) old.remove();
    const m = document.createElement('div'); m.id = 'poTransferModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
        <div style="background:white;border-radius:16px;padding:24px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="font-size:16px;font-weight:800;color:#122546;margin-bottom:16px;text-align:center;">📋 Chuyển vào CRM nào?</div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button onclick="_poDoTransfer(${id},'nhu_cau')" style="padding:14px;border:2px solid #3b82f6;border-radius:12px;background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1e40af;font-weight:700;font-size:14px;cursor:pointer;transition:all .2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(59,130,246,0.3)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                    📋 Chăm Sóc KH Nhu Cầu
                </button>
                <button onclick="_poDoTransfer(${id},'ctv_hoa_hong')" style="padding:14px;border:2px solid #ec4899;border-radius:12px;background:linear-gradient(135deg,#fdf2f8,#fce7f3);color:#9d174d;font-weight:700;font-size:14px;cursor:pointer;transition:all .2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(236,72,153,0.3)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                    💝 Chăm Sóc Affiliate
                </button>
            </div>
            <div style="text-align:center;margin-top:14px;">
                <button onclick="document.getElementById('poTransferModal').remove()" style="padding:8px 20px;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b;cursor:pointer;font-size:13px;">Hủy</button>
            </div>
        </div>`;
    document.body.appendChild(m);
}

async function _poDoTransfer(id, targetCrmType) {
    document.getElementById('poTransferModal')?.remove();
    try {
        await apiCall('/api/partner-outreach/entries/' + id + '/transfer', 'POST', { target_crm_type: targetCrmType });
        const label = targetCrmType === 'nhu_cau' ? 'Chăm Sóc KH Nhu Cầu' : 'Chăm Sóc Affiliate';
        showToast('✅ Đã chuyển vào ' + label); _poLoadData();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

function _poCatModal() {
    document.getElementById('poCatModal')?.remove();
    const m = document.createElement('div'); m.id = 'poCatModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
    m.onclick = e => { if(e.target===m) m.remove(); };
    let listHtml = _po.categories.map(c => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8fafc;border-radius:8px;margin-bottom:6px;">
            <span style="width:16px;height:16px;border-radius:50%;background:${c.color};flex-shrink:0;"></span>
            <span style="flex:1;font-weight:600;font-size:13px;">${c.name}</span>
            <button onclick="_poCatDel(${c.id})" style="padding:2px 8px;border:1px solid #fecaca;border-radius:4px;background:#fff5f5;color:#dc2626;cursor:pointer;font-size:11px;">🗑️</button>
        </div>`).join('');
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(420px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:18px 24px;border-radius:16px 16px 0 0;color:white;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:16px;font-weight:800;">⚙️ Quản Lý Lĩnh Vực</div>
            <button onclick="document.getElementById('poCatModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;">×</button>
        </div>
        <div style="padding:20px 24px;">
            <div style="margin-bottom:14px;">${listHtml||'<div style="color:#9ca3af;text-align:center;">Chưa có lĩnh vực</div>'}</div>
            <div style="display:flex;gap:8px;">
                <input id="poCatName" placeholder="Tên lĩnh vực mới..." style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;">
                <input id="poCatColor" type="color" value="#3b82f6" style="width:40px;height:36px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;">
                <button onclick="_poCatAdd()" style="padding:8px 16px;border:none;border-radius:8px;background:#16a34a;color:white;cursor:pointer;font-weight:700;font-size:13px;">＋</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(m);
}

async function _poCatAdd() {
    const name = document.getElementById('poCatName').value.trim();
    const color = document.getElementById('poCatColor').value;
    if (!name) return;
    try {
        await apiCall('/api/partner-outreach/categories', 'POST', { name, color });
        showToast('✅ Đã thêm'); document.getElementById('poCatModal')?.remove();
        const res = await apiCall('/api/partner-outreach/categories');
        _po.categories = res.categories || [];
        _poCatModal();
    } catch(e) { showToast(e.message||'Lỗi','error'); }
}

async function _poCatDel(id) {
    if (!confirm('Xóa lĩnh vực này?')) return;
    try {
        await apiCall('/api/partner-outreach/categories/' + id, 'DELETE');
        showToast('✅ Đã xóa'); document.getElementById('poCatModal')?.remove();
        const res = await apiCall('/api/partner-outreach/categories');
        _po.categories = res.categories || [];
        _poCatModal();
    } catch(e) { showToast(e.message||'Lỗi','error'); }
}

// Hook into SPA router
(function() {
    const origHandleRoute = window.handleRoute;
    if (origHandleRoute) {
        window.handleRoute = function() {
            origHandleRoute.apply(this, arguments);
            if (window.location.pathname === '/nhantintimdoitackh') _poInit();
        };
    }
    if (window.location.pathname === '/nhantintimdoitackh') {
        setTimeout(_poInit, 100);
    }
})();
