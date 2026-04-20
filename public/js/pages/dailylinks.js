// ========== DAILY LINKS — UNIFIED FRONTEND ==========
let _dlCollapsedDepts = new Set();
const _DL_MODULES = {
    '/addcmtdoitackh':    { type:'addcmt',       label:'Add/Cmt Đối Tác KH',    icon:'👥', grad:'linear-gradient(135deg,#16a34a,#15803d)', accent:'#16a34a' },
    '/dangvideo':         { type:'dang_video',    label:'Đăng Video Isocal',      icon:'🎬', grad:'linear-gradient(135deg,#dc2626,#b91c1c)', accent:'#dc2626' },
    '/dangcontent':       { type:'dang_content',  label:'Đăng Content Isocal',    icon:'✍️', grad:'linear-gradient(135deg,#8b5cf6,#7c3aed)', accent:'#8b5cf6' },
    '/danggruop':         { type:'dang_group',    label:'Đăng & Tìm KH Group',   icon:'📢', grad:'linear-gradient(135deg,#0891b2,#0e7490)', accent:'#0891b2' },
    '/seddingcongdong':   { type:'sedding',       label:'Sedding Cộng Đồng & Lẫn Nhau',     icon:'🌐', grad:'linear-gradient(135deg,#ea580c,#c2410c)', accent:'#ea580c' },
    '/dangbanthansp':     { type:'dang_banthan_sp', label:'Đăng Bản Thân & Sản Phẩm', icon:'📸', grad:'linear-gradient(135deg,#d946ef,#a21caf)', accent:'#d946ef' },
    '/timgrzalovathongke':{ type:'tim_gr_zalo',    label:'Tìm Gr Zalo Và Join',   icon:'🔍', grad:'linear-gradient(135deg,#0284c7,#0369a1)', accent:'#0284c7' },
    '/tuyendungsvkd':     { type:'tuyen_dung',    label:'Tuyển Dụng SV KD',      icon:'🎓', grad:'linear-gradient(135deg,#be185d,#9d174d)', accent:'#be185d' },
};

let _dl = { entries:[], stats:{}, selUser:null, selDept:null, mod:null, imageData:null };
let _dlOverrideUserIds = new Set();
let _dlDatePreset = 'today';
let _dlDateFrom = '';
let _dlDateTo = '';
let _dlSelectedYear = new Date().getFullYear();

// ===== Helper: đang xem chính mình? =====
function _dlIsViewingSelf() {
    if (_dl.selUser) return _dl.selUser == currentUser.id;
    if (_dl.selDept) return false; // viewing a dept/team = not self
    if (['nhan_vien','part_time'].includes(currentUser.role)) return true;
    return false;
}

// ===== Persist / Restore selection in sessionStorage (F5 support) =====
function _dlSaveState() {
    const path = window.location.pathname;
    sessionStorage.setItem('dl_sel_' + path, JSON.stringify({
        selUser: _dl.selUser,
        selDept: _dl.selDept,
        datePreset: _dlDatePreset,
        dateFrom: _dlDateFrom,
        dateTo: _dlDateTo,
        selectedYear: _dlSelectedYear
    }));
}
function _dlRestoreState() {
    const path = window.location.pathname;
    try {
        const raw = sessionStorage.getItem('dl_sel_' + path);
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s.selUser != null) _dl.selUser = s.selUser;
        if (s.selDept != null) _dl.selDept = s.selDept;
        if (s.datePreset) _dlDatePreset = s.datePreset;
        if (s.dateFrom) _dlDateFrom = s.dateFrom;
        if (s.dateTo) _dlDateTo = s.dateTo;
        if (s.selectedYear) _dlSelectedYear = s.selectedYear;
    } catch(e) {}
}

function _dlGetDateRange() {
    const today = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const todayStr = fmt(today);
    switch (_dlDatePreset) {
        case 'today': return { from: todayStr, to: todayStr, label: 'hôm nay' };
        case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); const ys=fmt(y); return { from: ys, to: ys, label: 'hôm qua' }; }
        case '7days': { const d = new Date(today); d.setDate(d.getDate()-6); return { from: fmt(d), to: todayStr, label: '7 ngày' }; }
        case 'this_month': { const m = new Date(_dlSelectedYear, today.getMonth(), 1); return { from: fmt(m), to: todayStr, label: 'tháng này' }; }
        case 'last_month': { const m1 = new Date(_dlSelectedYear, today.getMonth()-1, 1); const m2 = new Date(_dlSelectedYear, today.getMonth(), 0); return { from: fmt(m1), to: fmt(m2), label: 'tháng trước' }; }
        case 'custom': return { from: _dlDateFrom, to: _dlDateTo, label: `${_dlDateFrom} → ${_dlDateTo}` };
        case 'all': return { from: `${_dlSelectedYear}-01-01`, to: `${_dlSelectedYear}-12-31`, label: `năm ${_dlSelectedYear}` };
        default: return { from: todayStr, to: todayStr, label: 'hôm nay' };
    }
}

function _dlSwitchPreset(preset) {
    _dlDatePreset = preset;
    if (preset === 'custom') return;
    _dlLoadData();
}
function _dlApplyCustomDate() {
    _dlDateFrom = document.getElementById('dlDateFrom')?.value || '';
    _dlDateTo = document.getElementById('dlDateTo')?.value || '';
    if (_dlDateFrom && _dlDateTo) _dlLoadData();
}

function _dlInit() {
    const path = window.location.pathname;
    const cfg = _DL_MODULES[path];
    if (!cfg) return;
    _dl.mod = cfg;
    _dl.imageData = null;
    // Restore selection state from sessionStorage (F5 persistence)
    _dlRestoreState();
    const area = document.getElementById('contentArea');
    if (!area) return;
    area.innerHTML = `
    <div style="display:flex;gap:0;min-height:calc(100vh - 60px);">
        <div id="dlSidebar" style="width:260px;min-width:260px;background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px 12px;overflow-y:auto;"></div>
        <div style="flex:1;padding:20px 24px;overflow-y:auto;">
            <div id="dlGuide"></div>
            <div id="dlStats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>
            <div id="dlDateFilter"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 id="dlTableTitle" style="margin:0;font-size:18px;color:#122546;">📋 Danh sách link hôm nay</h2>
                <div id="dlActionBtns" style="display:flex;gap:8px;align-items:center;"></div>
            </div>
            <div id="dlTable"></div>
        </div>
    </div>
    <div id="dlLightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;align-items:center;justify-content:center;cursor:zoom-out;" onclick="_dlCloseLB()">
        <img id="dlLBImg" src="" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;box-shadow:0 0 40px rgba(0,0,0,0.5);transition:transform .3s;" onclick="event.stopPropagation()">
        <button onclick="_dlCloseLB()" style="position:absolute;top:20px;right:24px;background:rgba(255,255,255,0.15);border:none;color:white;width:44px;height:44px;border-radius:50%;font-size:22px;cursor:pointer;backdrop-filter:blur(8px);">✕</button>
        <div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;">
            <button onclick="event.stopPropagation();document.getElementById('dlLBImg').style.transform='scale(1.8)'" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;backdrop-filter:blur(8px);">🔍+ Phóng to</button>
            <button onclick="event.stopPropagation();document.getElementById('dlLBImg').style.transform='scale(1)'" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;backdrop-filter:blur(8px);">↺ Gốc</button>
        </div>
    </div>`;
    if (!document.getElementById('_dlLBCSS')) {
        const st = document.createElement('style'); st.id = '_dlLBCSS';
        st.textContent = `.dl-thumb{width:52px;height:52px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid #e2e8f0;transition:all .2s;box-shadow:0 1px 4px rgba(0,0,0,0.08)}.dl-thumb:hover{transform:scale(1.15);border-color:#16a34a;box-shadow:0 4px 16px rgba(22,163,74,0.25)}#dlLightbox.active{display:flex!important;animation:_dlFI .2s}@keyframes _dlFI{from{opacity:0}to{opacity:1}}`;
        document.head.appendChild(st);
    }
    document.getElementById('pageTitle').textContent = cfg.label;
    _dlLoadGuide();
    _dlLoadAll();
}
function _dlOpenLB(src){const lb=document.getElementById('dlLightbox'),img=document.getElementById('dlLBImg');img.src=src;img.style.transform='scale(1)';lb.classList.add('active');document.body.style.overflow='hidden';}
function _dlCloseLB(){document.getElementById('dlLightbox')?.classList.remove('active');document.body.style.overflow='';}


async function _dlLoadGuide() {
    const m = _dl.mod;
    if (!m) return;
    try {
        const res = await apiCall('/api/dailylinks/guide-url?module_type=' + m.type);
        const el = document.getElementById('dlGuide');
        if (!el || !res.guide_url) return;
        const taskLabel = (res.task_name || m.label).toUpperCase();
        el.innerHTML = `
        <a href="${res.guide_url}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:12px 18px;margin-bottom:16px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;text-decoration:none;color:white;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(245,158,11,0.35);transition:all .2s;border:2px solid #fbbf24;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(245,158,11,0.5)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 15px rgba(245,158,11,0.35)'">
            <span style="font-size:18px;">📘</span>
            HƯỚNG DẪN CÔNG VIỆC: ${taskLabel}
            <span style="margin-left:auto;font-size:16px;">→</span>
        </a>`;
    } catch(e) {}
}

async function _dlLoadAll() {
    const [memRes, ovRes] = await Promise.all([
        apiCall('/api/dailylinks/members'),
        apiCall('/api/schedule/override-users').catch(() => ({ user_ids: [] }))
    ]);
    _dlOverrideUserIds = new Set((ovRes.user_ids || []).map(Number));
    _dlCachedDepts = memRes.departments || [];
    _dlRenderSidebar(_dlCachedDepts);
    await _dlLoadData();
}

async function _dlLoadData() {
    const m = _dl.mod;
    const dr = _dlGetDateRange();
    let url = `/api/dailylinks/entries?module_type=${m.type}&date_from=${dr.from}&date_to=${dr.to}`;
    if (_dl.selUser) url += '&user_id=' + _dl.selUser;
    else if (_dl.selDept) url += '&dept_id=' + _dl.selDept;
    // Stats: dept aggregate when viewing dept, user-specific otherwise
    let statsUrl = '/api/dailylinks/stats?module_type=' + m.type;
    if (_dl.selDept && !_dl.selUser) statsUrl += '&dept_id=' + _dl.selDept;
    else statsUrl += '&user_id=' + (_dl.selUser || currentUser.id);
    const [eRes, sRes] = await Promise.all([
        apiCall(url),
        apiCall(statsUrl)
    ]);
    _dl.entries = eRes.entries || [];
    _dl.stats = sRes;
    _dlRenderStats();
    _dlRenderDateFilter();
    _dlRenderTable();
    _dlUpdateActions();
    // Save state for F5 persistence
    _dlSaveState();
}

// ===== Update action buttons based on role and selection =====
function _dlUpdateActions() {
    const el = document.getElementById('dlActionBtns');
    if (!el) return;
    const m = _dl.mod;
    const canAdd = _dlIsViewingSelf();
    let h = '';
    if (canAdd) {
        h += `<button onclick="_dlAddModal()" style="padding:8px 20px;border:none;border-radius:8px;background:${m.grad};color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">＋ Báo cáo công việc</button>`;
    } else if (_dl.selDept || (!_dl.selUser && !['nhan_vien','part_time'].includes(currentUser.role))) {
        h += '<span style="padding:8px 16px;border-radius:8px;background:#f1f5f9;color:#64748b;font-size:12px;font-weight:600;border:1px solid #e2e8f0;">👁️ Chế độ xem tổng hợp</span>';
    }
    el.innerHTML = h;
}

function _dlToday() { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; }
function _dlFormatDate(ds) { if (!ds) return ''; const d = new Date(ds+'T00:00:00'); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }

function _dlRenderSidebar(depts) {
    const sb = document.getElementById('dlSidebar');
    if (!sb) return;
    const role = currentUser.role;
    if (role==='nhan_vien'||role==='part_time') { sb.style.display='none'; return; }

    // Inject sparkle CSS once
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
            position: relative;
            border-radius: 12px;
            padding: 10px 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border: 1.5px solid rgba(99,102,241,0.3);
            animation: _dlBorderGlow 3s ease-in-out infinite;
            transition: all 0.25s ease;
            overflow: hidden;
        }
        ._dlTeamCard::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
            background-size: 200% 100%;
            animation: _dlShimmer 3s ease-in-out infinite;
            pointer-events: none;
            border-radius: 12px;
        }
        ._dlTeamCard:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 20px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15) !important;
        }
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
        ._dlTeamBadge {
            font-size: 10px; font-weight: 800;
            padding: 3px 9px; border-radius: 12px;
            color: white; min-width: 20px; text-align: center;
            animation: _dlPulseGlow 2.5s ease-in-out infinite;
        }
        ._dlTeamIcon {
            width: 26px; height: 26px; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px; flex-shrink: 0;
        }
        ._dlMemberRow { padding:7px 12px 7px 18px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px;margin:2px 0;transition:all 0.15s ease; }
        ._dlMemberRow:hover { background: #f1f5f9; }
        `;
        document.head.appendChild(style);
    }

    const TEAM_STYLES = [
        { grad: 'linear-gradient(135deg,#2563eb,#4f46e5)', badge:'#3b82f6', icon:'🏢', iconBg:'linear-gradient(135deg,#3b82f6,#6366f1)' },
        { grad: 'linear-gradient(135deg,#10b981,#059669)', badge:'#10b981', icon:'🚀', iconBg:'linear-gradient(135deg,#10b981,#34d399)' },
        { grad: 'linear-gradient(135deg,#f59e0b,#d97706)', badge:'#f59e0b', icon:'🌟', iconBg:'linear-gradient(135deg,#f59e0b,#fbbf24)' },
        { grad: 'linear-gradient(135deg,#a855f7,#7c3aed)', badge:'#a855f7', icon:'💎', iconBg:'linear-gradient(135deg,#a855f7,#c084fc)' },
    ];

    const c = _dl.mod.accent;
    const isAll = !_dl.selUser && !_dl.selDept;
    let h = `
    <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
            <div style="width:32px;height:32px;border-radius:10px;background:${_dl.mod.grad};display:flex;align-items:center;justify-content:center;font-size:16px;">👥</div>
            <div style="font-size:15px;font-weight:800;color:#122546;">Phòng Kinh Doanh</div>
        </div>
        <div onclick="_dlSelAll()" style="padding:10px 14px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;margin-bottom:6px;
            background:${isAll ? _dl.mod.grad : 'linear-gradient(135deg,#f1f5f9,#e2e8f0)'};
            color:${isAll ? 'white' : '#475569'};
            box-shadow:${isAll ? '0 3px 12px rgba(0,0,0,0.2)' : 'none'};
            transition:all 0.2s ease;">
            📊 Tất cả nhân viên
        </div>
    </div>
    <div style="height:1px;background:linear-gradient(to right,transparent,#cbd5e1,transparent);margin:12px 0;"></div>`;
    (depts||[]).forEach((d, di) => {
        const isDeptSel = _dl.selDept==d.id && !_dl.selUser;
        const hasSelMember = d.members.some(m => _dl.selUser == m.id);
        const isOpen = !_dlCollapsedDepts.has(d.id); // Always open unless manually collapsed
        const ts = TEAM_STYLES[di % TEAM_STYLES.length];
        h += `
        <div style="margin-bottom:10px;">
            <div class="_dlTeamCard _dlTeamCard--${di % 4}" style="${isDeptSel ? 'transform:scale(1.02);ring:2px solid #1e293b;' : ''}">
                <div onclick="_dlSelDept(${d.id})" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer;">
                    <div class="_dlTeamIcon" style="background:${ts.iconBg};color:white;">${ts.icon}</div>
                    <span style="font-size:12px;font-weight:800;color:${isDeptSel ? '#1e293b' : '#475569'};text-transform:uppercase;letter-spacing:0.5px;">${d.name}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                    <span class="_dlTeamBadge" style="background:${ts.badge};">${d.members.length}</span>
                    <div onclick="event.stopPropagation();_dlToggleOnly(${d.id})" style="width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;font-size:11px;color:#475569;flex-shrink:0;" onmouseover="this.style.background='rgba(0,0,0,0.15)'" onmouseout="this.style.background='rgba(0,0,0,0.08)'" title="${isOpen ? 'Thu gọn' : 'Mở rộng'}">${isOpen ? '▼' : '▶'}</div>
                </div>
            </div>`;
        if (isOpen) {
            d.members.forEach(m => {
                const isSel = _dl.selUser == m.id;
                const initials = (m.full_name || '').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
                h += `
                <div onclick="_dlSelUser(${m.id})" class="_dlMemberRow" style="
                    background:${isSel ? _dl.mod.grad : 'transparent'};
                    box-shadow:${isSel ? '0 2px 10px rgba(0,0,0,0.18)' : 'none'};">
                    <div style="width:28px;height:28px;border-radius:50%;background:${isSel ? 'rgba(255,255,255,0.25)' : 'linear-gradient(135deg,#e2e8f0,#cbd5e1)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:${isSel ? 'white' : '#64748b'};flex-shrink:0;">${initials}</div>
                    <span style="font-size:13px;font-weight:${isSel ? '700' : '500'};color:${isSel ? 'white' : '#334155'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;">${m.full_name}${_dlOverrideUserIds.has(m.id) ? '<span title="Đã tùy chỉnh công việc" style="display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;font-size:8px;padding:2px 5px;border-radius:4px;font-weight:800;line-height:1;flex-shrink:0;box-shadow:0 1px 3px rgba(217,119,6,0.3);">✏️ TC</span>' : ''}</span>
                </div>`;
            });
        }
        h += '</div>';
    });
    sb.innerHTML = h;
}

function _dlSelAll(){_dl.selUser=null;_dl.selDept=null;_dlSaveState();_dlLoadAll();}
function _dlSelDept(id){_dl.selUser=null;_dl.selDept=id;_dlSaveState();_dlRenderSidebarFromCache();_dlLoadData();}
function _dlSelUser(id){_dl.selUser=id;_dl.selDept=null;_dlSaveState();_dlRenderSidebarFromCache();_dlLoadData();}
function _dlToggleOnly(id){if(_dlCollapsedDepts.has(id)){_dlCollapsedDepts.delete(id);}else{_dlCollapsedDepts.add(id);}_dlRenderSidebarFromCache();}
function _dlToggleDept(id){if(_dlCollapsedDepts.has(id)){_dlCollapsedDepts.delete(id);}else{_dlCollapsedDepts.add(id);}_dlSelDept(id);}

// Cache departments for re-rendering sidebar without re-fetching
let _dlCachedDepts = [];
function _dlRenderSidebarFromCache() { _dlRenderSidebar(_dlCachedDepts); }

function _dlRenderStats() {
    const s=_dl.stats, el=document.getElementById('dlStats'), m=_dl.mod;
    if(!el) return;
    const wt = s.week_target || s.target || 20;
    const mt = s.month_target || s.target || 20;
    el.innerHTML=[
        {l:'Hôm Nay',v:`${s.today||0}/${s.target||20}`,bg:m.grad,icon:'📊'},
        {l:'Tuần Này',v:`${s.week||0}/${wt}`,bg:'linear-gradient(135deg,#f59e0b,#d97706)',icon:'📅'},
        {l:'Tháng Này',v:`${s.month||0}/${mt}`,bg:'linear-gradient(135deg,#6366f1,#4f46e5)',icon:'📆'},
    ].map(c=>`<div style="flex:1;min-width:200px;background:${c.bg};border-radius:14px;padding:18px 20px;color:white;box-shadow:0 4px 15px rgba(0,0,0,0.15);"><div style="font-size:28px;margin-bottom:4px;">${c.icon}</div><div style="font-size:28px;font-weight:900;">${c.v}</div><div style="font-size:12px;opacity:0.9;font-weight:600;margin-top:2px;">${c.l}</div></div>`).join('');
}

function _dlRenderDateFilter() {
    const el = document.getElementById('dlDateFilter');
    if (!el) return;
    const dr = _dlGetDateRange();
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
        ${presets.map(p => { const a = _dlDatePreset === p.key; return `<button onclick="_dlSwitchPreset('${p.key}')" style="padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;border:1.5px solid ${a?'#2563eb':'#e2e8f0'};background:${a?'linear-gradient(135deg,#2563eb,#3b82f6)':'white'};color:${a?'white':'#64748b'};box-shadow:${a?'0 2px 8px rgba(37,99,235,0.3)':'none'};">${p.icon} ${p.label}</button>`; }).join('')}
        <span style="width:1px;height:20px;background:#cbd5e1;margin:0 4px;"></span>
        <button onclick="_dlDatePreset='custom';document.getElementById('dlCustomArea').style.display='flex';" style="padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${_dlDatePreset==='custom'?'#7c3aed':'#e2e8f0'};background:${_dlDatePreset==='custom'?'linear-gradient(135deg,#7c3aed,#8b5cf6)':'white'};color:${_dlDatePreset==='custom'?'white':'#64748b'};transition:all .2s;">🔧 Tùy chọn</button>
        <select onchange="_dlSelectedYear=parseInt(this.value);_dlSwitchPreset('all')" style="padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;border:1.5px solid #2563eb;background:linear-gradient(135deg,#eff6ff,#dbeafe);color:#1e40af;cursor:pointer;">
            ${(() => { const cur = new Date().getFullYear(); let opts = ''; for (let y = cur; y >= 2024; y--) { opts += `<option value="${y}" ${y === _dlSelectedYear ? 'selected' : ''}>${y}</option>`; } return opts; })()}
        </select>
        <div id="dlCustomArea" style="display:${_dlDatePreset==='custom'?'flex':'none'};align-items:center;gap:6px;margin-left:4px;">
            <input type="date" id="dlDateFrom" value="${dr.from}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_dlDateFrom=this.value">
            <span style="font-size:11px;color:#9ca3af;">→</span>
            <input type="date" id="dlDateTo" value="${dr.to}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_dlDateTo=this.value">
            <button onclick="_dlApplyCustomDate()" style="padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid #059669;background:linear-gradient(135deg,#059669,#10b981);color:white;">✓</button>
        </div>
        ${dr.from ? `<span style="margin-left:auto;font-size:10px;color:#6b7280;font-weight:600;">📊 ${dr.from}${!isSingle?' → '+dr.to:''}</span>` : ''}
    </div>`;

    // Update table title
    const titleEl = document.getElementById('dlTableTitle');
    if (titleEl) {
        const titleLabels = { today:'hôm nay', yesterday:'hôm qua', '7days':'7 ngày qua', this_month:'tháng này', last_month:'tháng trước', all:`năm ${_dlSelectedYear}`, custom:`${dr.from} → ${dr.to}` };
        titleEl.textContent = `📋 Danh sách link ${titleLabels[_dlDatePreset] || 'hôm nay'}`;
    }
}

function _dlRenderTable() {
    const el=document.getElementById('dlTable');
    if(!el) return;
    const rows=_dl.entries, today=_dlToday(), m=_dl.mod;
    const dr = _dlGetDateRange();
    const isMultiDay = dr.from !== dr.to;
    if(!rows.length){el.innerHTML=`<div style="text-align:center;padding:40px;color:#9ca3af;">Chưa có dữ liệu ${_dlDatePreset==='today'?'hôm nay':'trong khoảng thời gian này'}</div>`;return;}
    const showUser=!_dl.selUser&&!['nhan_vien','part_time'].includes(currentUser.role);
    const hasImg = m.type === 'addcmt';
    const isVideo = m.type === 'dang_video';

    // ===== DANGVIDEO: custom table with 7 platform columns =====
    if (isVideo) {
        const platHeaders = (_DL_VIDEO_PLATFORMS||[]).map(p => `<th style="padding:8px 4px;text-align:center;font-size:11px;white-space:nowrap;" title="${p.label}"><span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:5px;background:${p.color};color:white;font-size:10px;">${p.icon}</span></th>`).join('');
        let h=`<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
            <th style="padding:8px 6px;text-align:center;width:40px;">STT</th>
            ${isMultiDay?'<th style="padding:8px 6px;width:80px;">NGÀY</th>':''}
            ${showUser?'<th style="padding:8px 6px;">NV</th>':''}
            ${platHeaders}
            <th style="padding:8px 6px;text-align:center;width:50px;">XÓA</th>
        </tr></thead><tbody>`;
        rows.forEach((r,i)=>{
            const ed=typeof r.entry_date==='string'?r.entry_date.split('T')[0]:r.entry_date;
            const canDel=(r.user_id===currentUser.id&&ed===today)||currentUser.role==='giam_doc';
            let lj = r.links_json;
            if (typeof lj === 'string') try { lj = JSON.parse(lj); } catch(e) { lj = null; }
            const platCells = (_DL_VIDEO_PLATFORMS||[]).map(p => {
                const link = lj?.[p.key];
                if (link) {
                    return `<td style="padding:6px 4px;text-align:center;"><a href="${link}" target="_blank" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;background:${p.color};color:white;font-size:11px;text-decoration:none;transition:all .15s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="${p.label}: ${link}">✓</a></td>`;
                }
                return `<td style="padding:6px 4px;text-align:center;"><span style="color:#d1d5db;">—</span></td>`;
            }).join('');
            h+=`<tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:8px 6px;text-align:center;font-weight:700;color:#6b7280;">${i+1}</td>
                ${isMultiDay?`<td style="padding:8px 6px;font-size:11px;font-weight:600;color:#475569;">${_dlFormatDate(ed)}</td>`:''}
                ${showUser?`<td style="padding:8px 6px;font-size:11px;color:#6b7280;">${r.user_name||''}</td>`:''}
                ${platCells}
                <td style="padding:8px 6px;text-align:center;">${canDel?`<button onclick="_dlDel(${r.id})" style="padding:2px 6px;border:1px solid #fecaca;border-radius:5px;background:#fff5f5;color:#dc2626;cursor:pointer;font-size:10px;">🗑️</button>`:''}</td>
            </tr>`;
        });
        h+='</tbody></table>';
        el.innerHTML=h;
        return;
    }

    // ===== DEFAULT TABLE =====
    let h=`<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
        <th style="padding:10px 8px;text-align:center;width:50px;">STT</th>
        ${isMultiDay?'<th style="padding:10px 8px;width:100px;">NGÀY</th>':''}
        ${!hasImg?'<th style="padding:10px 8px;">LINK</th>':''}
        ${showUser?'<th style="padding:10px 8px;">NHÂN VIÊN</th>':''}
        ${hasImg?'<th style="padding:10px 8px;text-align:center;">ẢNH CHỤP</th>':''}
        <th style="padding:10px 8px;text-align:center;width:80px;">XÓA</th>
    </tr></thead><tbody>`;
    rows.forEach((r,i)=>{
        const fbShort=r.fb_link.length>60?r.fb_link.substring(0,60)+'...':r.fb_link;
        const ed=typeof r.entry_date==='string'?r.entry_date.split('T')[0]:r.entry_date;
        const canDel=(r.user_id===currentUser.id&&ed===today)||currentUser.role==='giam_doc';
        const imgCell = hasImg ? (r.image_path ? `<img src="${r.image_path}" class="dl-thumb" onclick="_dlOpenLB('${r.image_path}')" alt="Ảnh" loading="lazy">` : '<span style="color:#d1d5db;">—</span>') : '';
        h+=`<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#6b7280;">${i+1}</td>
            ${isMultiDay?`<td style="padding:10px 8px;font-size:11px;font-weight:600;color:#475569;">${_dlFormatDate(ed)}</td>`:''}
            ${!hasImg?`<td style="padding:10px 8px;"><a href="${r.fb_link}" target="_blank" style="color:${m.accent};font-weight:500;">${fbShort}</a></td>`:''}
            ${showUser?`<td style="padding:10px 8px;font-size:12px;color:#6b7280;">${r.user_name||''}</td>`:''}
            ${hasImg?`<td style="padding:10px 8px;text-align:center;">${imgCell}</td>`:''}
            <td style="padding:10px 8px;text-align:center;">${canDel?`<button onclick="_dlDel(${r.id})" style="padding:3px 8px;border:1px solid #fecaca;border-radius:6px;background:#fff5f5;color:#dc2626;cursor:pointer;font-size:11px;">🗑️</button>`:''}</td>
        </tr>`;
    });
    h+='</tbody></table>';
    el.innerHTML=h;
}

// ===== VIDEO LINK PLATFORMS CONFIG =====
const _DL_VIDEO_PLATFORMS = [
    { key:'zalo',       label:'Zalo Video',        pattern:'video.zalo.me',          icon:'💬', color:'#0068FF', placeholder:'https://video.zalo.me/...' },
    { key:'tiktok',     label:'Tiktok Video',       pattern:'tiktok.com',             icon:'🎵', color:'#000000', placeholder:'https://www.tiktok.com/...' },
    { key:'fb_canhan',  label:'Facebook Cá Nhân',   pattern:'facebook.com/reel',      icon:'👤', color:'#1877F2', placeholder:'https://www.facebook.com/reel/...' },
    { key:'fb_page',    label:'Page Facebook',       pattern:'facebook.com/reel',      icon:'📄', color:'#1877F2', placeholder:'https://www.facebook.com/reel/...' },
    { key:'fb_stories', label:'Facebook Stories',    pattern:'facebook.com/stories',   icon:'📖', color:'#E4405F', placeholder:'https://www.facebook.com/stories/...' },
    { key:'instagram',  label:'Instagram',           pattern:'instagram.com/reel',     icon:'📷', color:'#E4405F', placeholder:'https://www.instagram.com/reel/...' },
    { key:'youtube',    label:'Youtube',             pattern:'youtube.com',            icon:'▶️', color:'#FF0000', placeholder:'https://www.youtube.com/...' },
];

function _dlAddModal() {
    const m=_dl.mod;
    _dl.imageData = null;
    document.getElementById('dlModal')?.remove();
    const d=document.createElement('div');d.id='dlModal';
    d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    d.onclick=e=>{if(e.target===d)d.remove();};
    const needImg = m.type === 'addcmt';
    const isVideo = m.type === 'dang_video';

    if (isVideo) {
        // ===== DANGVIDEO: 7 platform link fields =====
        let fieldsHtml = _DL_VIDEO_PLATFORMS.map(p => `
            <div style="margin-bottom:12px;">
                <label style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;color:#374151;margin-bottom:4px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:${p.color};color:white;font-size:12px;">${p.icon}</span>
                    ${p.label} <span style="color:#dc2626;">*</span>
                </label>
                <input id="dlV_${p.key}" style="width:100%;padding:9px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;transition:border-color .2s;" placeholder="${p.placeholder}">
                <div id="dlVErr_${p.key}" style="display:none;margin-top:4px;padding:4px 10px;border-radius:6px;background:#fef2f2;color:#dc2626;font-size:11px;font-weight:600;"></div>
            </div>
        `).join('');

        d.innerHTML=`
        <div style="background:white;border-radius:16px;width:min(560px,95vw);max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
            <div style="background:${m.grad};padding:20px 24px;border-radius:16px 16px 0 0;color:white;position:sticky;top:0;z-index:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:18px;font-weight:800;">${m.icon} Báo cáo công việc - ${m.label}</div>
                    <button onclick="document.getElementById('dlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
                </div>
                <div style="font-size:12px;opacity:0.85;margin-top:6px;">Điền đầy đủ 7 link nền tảng bên dưới</div>
            </div>
            <div style="padding:24px;">
                ${fieldsHtml}
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid #f3f4f6;">
                    <button onclick="document.getElementById('dlModal').remove()" style="padding:9px 18px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                    <button onclick="_dlSave()" style="padding:9px 22px;border:none;border-radius:8px;background:${m.accent};color:white;cursor:pointer;font-size:13px;font-weight:700;">💾 Lưu</button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(d);
        // Add real-time validation hints
        _DL_VIDEO_PLATFORMS.forEach(p => {
            const inp = document.getElementById('dlV_' + p.key);
            if (!inp) return;
            inp.addEventListener('input', () => {
                const errEl = document.getElementById('dlVErr_' + p.key);
                const val = inp.value.trim();
                if (val && !val.toLowerCase().includes(p.pattern.toLowerCase())) {
                    errEl.style.display = 'block';
                    errEl.textContent = `⚠️ Link phải chứa "${p.pattern}" — Vui lòng dán đúng link ${p.label}`;
                    inp.style.borderColor = '#dc2626';
                } else {
                    errEl.style.display = 'none';
                    inp.style.borderColor = val ? '#16a34a' : '#d1d5db';
                }
            });
        });
        setTimeout(() => document.getElementById('dlV_zalo')?.focus(), 100);
        return;
    }

    // ===== DEFAULT MODAL (other modules) =====
    d.innerHTML=`
    <div style="background:white;border-radius:16px;width:min(480px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:${m.grad};padding:20px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:18px;font-weight:800;">${m.icon} Báo cáo công việc - ${m.label}</div>
                <button onclick="document.getElementById('dlModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:24px;">
            ${!needImg ? `<div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Link <span style="color:#dc2626;">*</span></label>
                <input id="dlFLink" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;margin-top:6px;box-sizing:border-box;" placeholder="https://..." autofocus>
            </div>` : ''}
            ${needImg ? `<div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">📸 Dán Ảnh Chụp Màn Hình <span style="color:#dc2626;">*</span></label>
                <div id="dlFImgZone" tabindex="0" style="margin-top:6px;border:2px dashed #86efac;border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;background:#f0fdf4;min-height:90px;outline:none;transition:all .2s;" onclick="this.focus()">
                    <div id="dlFImgPreview" style="font-size:14px;color:#166534;">
                        <div style="font-size:36px;margin-bottom:8px;">📋</div>
                        <div style="font-weight:700;">Click vào đây rồi Ctrl+V</div>
                        <div style="font-size:12px;color:#4ade80;margin-top:4px;">Dán ảnh chụp màn hình từ clipboard</div>
                    </div>
                </div>
            </div>` : ''}
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
                <button onclick="document.getElementById('dlModal').remove()" style="padding:9px 18px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                <button onclick="_dlSave()" style="padding:9px 22px;border:none;border-radius:8px;background:${m.accent};color:white;cursor:pointer;font-size:13px;font-weight:700;">💾 Lưu</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(d);
    if (needImg) {
        const zone = document.getElementById('dlFImgZone');
        zone?.addEventListener('paste', e => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = ev => {
                        _dl.imageData = ev.target.result;
                        document.getElementById('dlFImgPreview').innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:200px;border-radius:8px;">`;
                        zone.style.borderColor = '#16a34a';
                    };
                    reader.readAsDataURL(file);
                    break;
                }
            }
        });
        setTimeout(()=>document.getElementById('dlFImgZone')?.focus(),100);
    } else {
        setTimeout(()=>document.getElementById('dlFLink')?.focus(),100);
    }
}

async function _dlSave() {
    const m = _dl.mod;
    const needImg = m.type === 'addcmt';
    const isVideo = m.type === 'dang_video';

    if (isVideo) {
        // ===== DANGVIDEO: validate all 7 fields =====
        const linksJson = {};
        let hasError = false;
        for (const p of _DL_VIDEO_PLATFORMS) {
            const inp = document.getElementById('dlV_' + p.key);
            const errEl = document.getElementById('dlVErr_' + p.key);
            const val = inp?.value?.trim() || '';
            if (!val) {
                errEl.style.display = 'block';
                errEl.textContent = `⚠️ Bắt buộc — Vui lòng nhập link ${p.label}`;
                inp.style.borderColor = '#dc2626';
                hasError = true;
                continue;
            }
            if (!val.toLowerCase().includes(p.pattern.toLowerCase())) {
                errEl.style.display = 'block';
                errEl.textContent = `⚠️ Link phải chứa "${p.pattern}" — Đây không phải link ${p.label} hợp lệ`;
                inp.style.borderColor = '#dc2626';
                hasError = true;
                continue;
            }
            errEl.style.display = 'none';
            inp.style.borderColor = '#16a34a';
            linksJson[p.key] = val;
        }
        if (hasError) { showToast('Vui lòng điền đầy đủ 7 link hợp lệ!', 'error'); return; }
        try {
            await apiCall('/api/dailylinks/entries', 'POST', {
                fb_link: linksJson.zalo, // primary link = Zalo
                module_type: m.type,
                links_json: linksJson
            });
            document.getElementById('dlModal')?.remove();
            showToast('✅ Đã thêm thành công!'); _dlLoadData();
        } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
        return;
    }

    // ===== DEFAULT SAVE (other modules) =====
    const linkEl = document.getElementById('dlFLink');
    const link = needImg ? ('addcmt_' + Date.now()) : (linkEl?.value?.trim() || '');
    if(!needImg && !link){showToast('Vui lòng nhập link!','error');return;}
    if(needImg && !_dl.imageData){showToast('Vui lòng dán hình ảnh (Ctrl+V)!','error');return;}
    try{
        const body = {fb_link:link, module_type:m.type};
        if(needImg && _dl.imageData) body.image_data = _dl.imageData;
        await apiCall('/api/dailylinks/entries','POST', body);
        document.getElementById('dlModal')?.remove();
        showToast('✅ Đã thêm thành công!');_dlLoadData();
    }catch(e){showToast(e.message||'Lỗi','error');}
}

async function _dlDel(id) {
    if(!confirm('Xóa link này?'))return;
    try{await apiCall('/api/dailylinks/entries/'+id,'DELETE');showToast('✅ Đã xóa');_dlLoadData();}
    catch(e){showToast(e.message||'Lỗi','error');}
}

// SPA Router Hook — preserve state on F5, reset on SPA nav
(function(){
    const paths=Object.keys(_DL_MODULES);
    const orig=window.handleRoute;
    if(orig){window.handleRoute=function(){orig.apply(this,arguments);if(paths.includes(window.location.pathname)){_dl.selUser=null;_dl.selDept=null;_dlDatePreset='today';_dlInit();}};}
    // On F5/direct load: DO NOT reset state, _dlInit will restore from sessionStorage
    if(paths.includes(window.location.pathname)) setTimeout(_dlInit,100);
})();
