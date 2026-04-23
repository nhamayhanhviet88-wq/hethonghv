// ========== ADD/CMT ĐỐI TÁC KH ==========
let _ac = { entries:[], members:[], stats:{}, selectedUser:null, selectedDept:null, imageData:null, scheduleInfo:null };
let _acCollapsedDepts = new Set();
let _acCachedDepts = [];
let _acDatePreset = 'today';
let _acDateFrom = '';
let _acDateTo = '';
let _acSelectedYear = new Date().getFullYear();

function _acGetDateRange() {
    const today = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const todayStr = fmt(today);
    switch (_acDatePreset) {
        case 'today': return { from: todayStr, to: todayStr, label: 'hôm nay' };
        case 'yesterday': { const y = new Date(today); y.setDate(y.getDate()-1); const ys=fmt(y); return { from: ys, to: ys, label: 'hôm qua' }; }
        case '7days': { const d = new Date(today); d.setDate(d.getDate()-6); return { from: fmt(d), to: todayStr, label: '7 ngày' }; }
        case 'this_month': { const m = new Date(_acSelectedYear, today.getMonth(), 1); return { from: fmt(m), to: todayStr, label: 'tháng này' }; }
        case 'last_month': { const m1 = new Date(_acSelectedYear, today.getMonth()-1, 1); const m2 = new Date(_acSelectedYear, today.getMonth(), 0); return { from: fmt(m1), to: fmt(m2), label: 'tháng trước' }; }
        case 'custom': return { from: _acDateFrom, to: _acDateTo, label: `${_acDateFrom} → ${_acDateTo}` };
        case 'all': return { from: `${_acSelectedYear}-01-01`, to: `${_acSelectedYear}-12-31`, label: `năm ${_acSelectedYear}` };
        default: return { from: todayStr, to: todayStr, label: 'hôm nay' };
    }
}
function _acSwitchPreset(p) { _acDatePreset = p; if (p === 'custom') return; _acLoadData(); }
function _acApplyCustomDate() { _acDateFrom = document.getElementById('acDateFrom')?.value||''; _acDateTo = document.getElementById('acDateTo')?.value||''; if (_acDateFrom&&_acDateTo) _acLoadData(); }

function _acIsViewingSelf() {
    if (_ac.selectedUser) return _ac.selectedUser === currentUser.id;
    if (_ac.selectedDept) return false;
    if (['nhan_vien','part_time'].includes(currentUser.role)) return true;
    return false;
}

function _acInit() {
    if (window.location.pathname !== '/addcmtdoitackh') return;
    const area = document.getElementById('contentArea');
    if (!area) return;
    area.innerHTML = `
    <div style="display:flex;gap:0;min-height:calc(100vh - 60px);">
        <div id="acSidebar" style="width:260px;min-width:260px;background:#f8fafc;border-right:1px solid #e5e7eb;padding:16px 12px;overflow-y:auto;"></div>
        <div style="flex:1;padding:20px 24px;overflow-y:auto;">
            <div id="acGuide"></div>
            <div id="acStats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;"></div>
            <div id="acDateFilter"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 id="acTableTitle" style="margin:0;font-size:18px;color:#122546;">📋 Danh sách hôm nay</h2>
                <div id="acActionBtns" style="display:flex;gap:8px;align-items:center;"></div>
            </div>
            <div id="acTable"></div>
        </div>
    </div>
    <div id="acLightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;align-items:center;justify-content:center;cursor:zoom-out;" onclick="_acCloseLB()">
        <img id="acLBImg" src="" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;box-shadow:0 0 40px rgba(0,0,0,0.5);transition:transform .3s;" onclick="event.stopPropagation()">
        <button onclick="_acCloseLB()" style="position:absolute;top:20px;right:24px;background:rgba(255,255,255,0.15);border:none;color:white;width:44px;height:44px;border-radius:50%;font-size:22px;cursor:pointer;backdrop-filter:blur(8px);">✕</button>
        <div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;">
            <button onclick="event.stopPropagation();document.getElementById('acLBImg').style.transform='scale(1.8)'" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;backdrop-filter:blur(8px);">🔍+ Phóng to</button>
            <button onclick="event.stopPropagation();document.getElementById('acLBImg').style.transform='scale(1)'" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;backdrop-filter:blur(8px);">↺ Gốc</button>
        </div>
    </div>`;
    if (!document.getElementById('_acLBCSS')) {
        const st = document.createElement('style'); st.id = '_acLBCSS';
        st.textContent = `.ac-thumb{width:52px;height:52px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid #e2e8f0;transition:all .2s;box-shadow:0 1px 4px rgba(0,0,0,0.08)}.ac-thumb:hover{transform:scale(1.15);border-color:#16a34a;box-shadow:0 4px 16px rgba(22,163,74,0.25)}#acLightbox.active{display:flex!important;animation:_acFI .2s}@keyframes _acFI{from{opacity:0}to{opacity:1}}@keyframes _acPulse{0%,100%{box-shadow:0 3px 12px rgba(22,163,74,0.4)}50%{box-shadow:0 3px 20px rgba(22,163,74,0.7)}}`;
        document.head.appendChild(st);
    }
    document.getElementById('pageTitle').textContent = 'Add/Cmt Đối Tác KH';
    _acLoadAll();
}

function _acOpenLB(src) { const lb=document.getElementById('acLightbox'),img=document.getElementById('acLBImg'); img.src=src; img.style.transform='scale(1)'; lb.classList.add('active'); document.body.style.overflow='hidden'; }
function _acCloseLB() { document.getElementById('acLightbox')?.classList.remove('active'); document.body.style.overflow=''; }

async function _acLoadAll() {
    const memRes = await apiCall('/api/addcmt/members');
    _acCachedDepts = memRes.departments || [];
    _acRenderSidebar(_acCachedDepts);
    await _acLoadData();
}

async function _acLoadData() {
    const dr = _acGetDateRange();
    let url = `/api/addcmt/entries?date_from=${dr.from}&date_to=${dr.to}`;
    if (_ac.selectedUser) url += '&user_id=' + _ac.selectedUser;
    else if (_ac.selectedDept) url += '&dept_id=' + _ac.selectedDept;
    const uid = _ac.selectedUser || currentUser.id;
    let statsUrl = '/api/addcmt/stats?';
    if (_ac.selectedDept && !_ac.selectedUser) statsUrl += 'dept_id=' + _ac.selectedDept;
    else statsUrl += 'user_id=' + uid;
    const [eRes, sRes] = await Promise.all([apiCall(url), apiCall(statsUrl)]);
    _ac.entries = eRes.entries || [];
    _ac.stats = sRes;
    try { _ac.scheduleInfo = await apiCall('/api/addcmt/schedule-info?user_id=' + uid); } catch(e) { _ac.scheduleInfo = null; }
    _acRenderGuide();
    _acRenderStats();
    _acRenderDateFilter();
    _acRenderTable();
    _acUpdateActions();
}

function _acToday() { const n = new Date(); n.setHours(n.getHours()+7); return n.toISOString().split('T')[0]; }

function _acRenderGuide() {
    const el = document.getElementById('acGuide'); if (!el) return;
    const si = _ac.scheduleInfo, guideUrl = si?.guide_url;
    if (!guideUrl) { el.innerHTML = ''; return; }
    el.innerHTML = `<a href="${guideUrl}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:12px 18px;margin-bottom:16px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;text-decoration:none;color:white;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(245,158,11,0.35);transition:all .2s;border:2px solid #fbbf24;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'"><span style="font-size:18px;">📘</span>HƯỚNG DẪN CÔNG VIỆC: ADD/CMT ĐỐI TÁC KH<span style="margin-left:auto;font-size:16px;">→</span></a>`;
}

function _acRenderDateFilter() {
    const el = document.getElementById('acDateFilter'); if (!el) return;
    const dr = _acGetDateRange();
    const presets = [{key:'today',label:'Hôm nay',icon:'📅'},{key:'yesterday',label:'Hôm qua',icon:'⏪'},{key:'7days',label:'7 ngày',icon:'📆'},{key:'this_month',label:'Tháng này',icon:'🗓️'},{key:'last_month',label:'Tháng trước',icon:'📋'},{key:'all',label:'Tất cả',icon:'♾️'}];
    const isSingle = dr.from === dr.to;
    const grad = 'linear-gradient(135deg,#16a34a,#15803d)';
    el.innerHTML = `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:14px;padding:10px 14px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1.5px solid #e2e8f0;border-radius:12px;">
        <span style="font-size:13px;font-weight:800;color:#334155;margin-right:4px;">📅</span>
        ${presets.map(p=>{const a=_acDatePreset===p.key;return `<button onclick="_acSwitchPreset('${p.key}')" style="padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;border:1.5px solid ${a?'#16a34a':'#e2e8f0'};background:${a?grad:'white'};color:${a?'white':'#64748b'};box-shadow:${a?'0 2px 8px rgba(22,163,74,0.3)':'none'};">${p.icon} ${p.label}</button>`;}).join('')}
        <span style="width:1px;height:20px;background:#cbd5e1;margin:0 4px;"></span>
        <button onclick="_acDatePreset='custom';document.getElementById('acCustomArea').style.display='flex';" style="padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${_acDatePreset==='custom'?'#7c3aed':'#e2e8f0'};background:${_acDatePreset==='custom'?'linear-gradient(135deg,#7c3aed,#8b5cf6)':'white'};color:${_acDatePreset==='custom'?'white':'#64748b'};transition:all .2s;">🔧 Tùy chọn</button>
        <select onchange="_acSelectedYear=parseInt(this.value);_acSwitchPreset('all')" style="padding:5px 10px;border-radius:8px;font-size:11px;font-weight:700;border:1.5px solid #16a34a;background:linear-gradient(135deg,#f0fdf4,#dcfce7);color:#166534;cursor:pointer;">
            ${(()=>{const cur=new Date().getFullYear();let o='';for(let y=cur;y>=2024;y--)o+=`<option value="${y}" ${y===_acSelectedYear?'selected':''}>${y}</option>`;return o;})()}
        </select>
        <div id="acCustomArea" style="display:${_acDatePreset==='custom'?'flex':'none'};align-items:center;gap:6px;margin-left:4px;">
            <input type="date" id="acDateFrom" value="${dr.from}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_acDateFrom=this.value">
            <span style="font-size:11px;color:#9ca3af;">→</span>
            <input type="date" id="acDateTo" value="${dr.to}" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;" onchange="_acDateTo=this.value">
            <button onclick="_acApplyCustomDate()" style="padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid #059669;background:linear-gradient(135deg,#059669,#10b981);color:white;">✓</button>
        </div>
        ${dr.from?`<span style="margin-left:auto;font-size:10px;color:#6b7280;font-weight:600;">📊 ${dr.from}${!isSingle?' → '+dr.to:''}</span>`:''}
    </div>`;
    const titleEl = document.getElementById('acTableTitle');
    if (titleEl) {
        const tl = {today:'hôm nay',yesterday:'hôm qua','7days':'7 ngày qua',this_month:'tháng này',last_month:'tháng trước',all:`năm ${_acSelectedYear}`,custom:`${dr.from} → ${dr.to}`};
        titleEl.textContent = `📋 Danh sách ${tl[_acDatePreset]||'hôm nay'}`;
    }
}

function _acRenderSidebar(depts) {
    const sb = document.getElementById('acSidebar'); if (!sb) return;
    const role = currentUser.role;
    if (role === 'nhan_vien' || role === 'part_time') { sb.style.display = 'none'; return; }
    if (!document.getElementById('_dlSparkleCSS')) {
        const style = document.createElement('style'); style.id = '_dlSparkleCSS';
        style.textContent = `@keyframes _dlBorderGlow{0%,100%{border-color:rgba(99,102,241,0.4);box-shadow:0 0 8px rgba(99,102,241,0.15)}50%{border-color:rgba(168,85,247,0.6);box-shadow:0 0 16px rgba(168,85,247,0.25)}}@keyframes _dlShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}@keyframes _dlPulseGlow{0%,100%{opacity:0.4}50%{opacity:1}}._dlTeamCard{position:relative;border-radius:12px;padding:10px 14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border:1.5px solid rgba(99,102,241,0.3);animation:_dlBorderGlow 3s ease-in-out infinite;transition:all 0.25s ease;overflow:hidden}._dlTeamCard::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent);background-size:200% 100%;animation:_dlShimmer 3s ease-in-out infinite;pointer-events:none;border-radius:12px}._dlTeamCard:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(99,102,241,0.3)!important}._dlTeamCard--0{background:linear-gradient(135deg,rgba(37,99,235,0.08),rgba(99,102,241,0.05));border-color:rgba(37,99,235,0.35)}._dlTeamCard--1{background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.05));border-color:rgba(16,185,129,0.35)}._dlTeamCard--2{background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(217,119,6,0.05));border-color:rgba(245,158,11,0.35)}._dlTeamCard--3{background:linear-gradient(135deg,rgba(168,85,247,0.08),rgba(139,92,246,0.05));border-color:rgba(168,85,247,0.35)}._dlTeamBadge{font-size:10px;font-weight:800;padding:3px 9px;border-radius:12px;color:white;min-width:20px;text-align:center;animation:_dlPulseGlow 2.5s ease-in-out infinite}._dlTeamIcon{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}._dlMemberRow{padding:7px 12px 7px 18px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px;margin:2px 0;transition:all 0.15s ease}._dlMemberRow:hover{background:#f1f5f9}`;
        document.head.appendChild(style);
    }
    const TEAM_STYLES = [{badge:'#3b82f6',icon:'🏢',iconBg:'linear-gradient(135deg,#3b82f6,#6366f1)'},{badge:'#10b981',icon:'🚀',iconBg:'linear-gradient(135deg,#10b981,#34d399)'},{badge:'#f59e0b',icon:'🌟',iconBg:'linear-gradient(135deg,#f59e0b,#fbbf24)'},{badge:'#a855f7',icon:'💎',iconBg:'linear-gradient(135deg,#a855f7,#c084fc)'}];
    const grad = 'linear-gradient(135deg,#16a34a,#15803d)';
    const isAll = !_ac.selectedUser && !_ac.selectedDept;
    let h = `<div style="margin-bottom:16px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;"><div style="width:32px;height:32px;border-radius:10px;background:${grad};display:flex;align-items:center;justify-content:center;font-size:16px;">👥</div><div style="font-size:15px;font-weight:800;color:#122546;">Phòng Kinh Doanh</div></div><div onclick="_acSelAll()" style="padding:10px 14px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;margin-bottom:6px;background:${isAll?grad:'linear-gradient(135deg,#f1f5f9,#e2e8f0)'};color:${isAll?'white':'#475569'};box-shadow:${isAll?'0 3px 12px rgba(0,0,0,0.2)':'none'};transition:all 0.2s;">📊 Tất cả nhân viên</div></div><div style="height:1px;background:linear-gradient(to right,transparent,#cbd5e1,transparent);margin:12px 0;"></div>`;
    (depts||[]).forEach((d,di)=>{
        const isDeptSel = _ac.selectedDept==d.id && !_ac.selectedUser;
        const isOpen = !_acCollapsedDepts.has(d.id);
        const ts = TEAM_STYLES[di%4];
        h += `<div style="margin-bottom:10px;"><div class="_dlTeamCard _dlTeamCard--${di%4}"><div onclick="_acSelDept(${d.id})" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer;"><div class="_dlTeamIcon" style="background:${ts.iconBg};color:white;">${ts.icon}</div><span style="font-size:12px;font-weight:800;color:${isDeptSel?'#1e293b':'#475569'};text-transform:uppercase;letter-spacing:0.5px;">${d.name}</span></div><div style="display:flex;align-items:center;gap:6px;"><span class="_dlTeamBadge" style="background:${ts.badge};">${d.members.length}</span><div onclick="event.stopPropagation();_acToggleDept(${d.id})" style="width:24px;height:24px;border-radius:6px;background:rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;color:#475569;flex-shrink:0;">${isOpen?'▼':'▶'}</div></div></div>`;
        if (isOpen) { d.members.forEach(m=>{ const isSel=_ac.selectedUser==m.id; const ini=(m.full_name||'').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase(); h+=`<div onclick="_acSelUser(${m.id})" class="_dlMemberRow" style="background:${isSel?grad:'transparent'};box-shadow:${isSel?'0 2px 10px rgba(0,0,0,0.18)':'none'};"><div style="width:28px;height:28px;border-radius:50%;background:${isSel?'rgba(255,255,255,0.25)':'linear-gradient(135deg,#e2e8f0,#cbd5e1)'};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:${isSel?'white':'#64748b'};flex-shrink:0;">${ini}</div><span style="font-size:13px;font-weight:${isSel?'700':'500'};color:${isSel?'white':'#334155'};">${m.full_name}</span></div>`; }); }
        h += '</div>';
    });
    sb.innerHTML = h;
}
function _acRenderSidebarFromCache() { _acRenderSidebar(_acCachedDepts); }

function _acSelAll() { _ac.selectedUser=null; _ac.selectedDept=null; _acRenderSidebarFromCache(); _acLoadData(); }
function _acSelDept(id) { _ac.selectedUser=null; _ac.selectedDept=id; _acRenderSidebarFromCache(); _acLoadData(); }
function _acSelUser(id) { _ac.selectedUser=id; _ac.selectedDept=null; _acRenderSidebarFromCache(); _acLoadData(); }
function _acToggleDept(id) { if(_acCollapsedDepts.has(id)){_acCollapsedDepts.delete(id);}else{_acCollapsedDepts.add(id);} _acRenderSidebarFromCache(); }

function _acUpdateActions() {
    const el = document.getElementById('acActionBtns');
    if (!el) return;
    const canAdd = _acIsViewingSelf();
    let h = '';
    if (canAdd) {
        h += '<button onclick="_acAddModal()" style="padding:8px 20px;border:none;border-radius:8px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(22,163,74,0.3);">＋ Báo cáo công việc</button>';
    } else if (_ac.selectedDept || (!_ac.selectedUser && !['nhan_vien','part_time'].includes(currentUser.role))) {
        h += '<span style="padding:8px 16px;border-radius:8px;background:#f1f5f9;color:#64748b;font-size:12px;font-weight:600;border:1px solid #e2e8f0;">👁️ Chế độ xem tổng hợp</span>';
    }
    el.innerHTML = h;
}

function _acRenderStats() {
    const s = _ac.stats, el = document.getElementById('acStats');
    if (!el) return;
    const si = _ac.scheduleInfo;
    const target = si?.found ? si.min_quantity : (s.target || 20);
    const todayDone = si?.found ? si.today_count : (s.today || 0);
    const isSelf = _acIsViewingSelf();

    // Report button — CHỈ hiện khi xem chính tài khoản mình
    let reportHtml = '';
    if (si?.found && isSelf) {
        if (si.report) {
            if (si.report.status === 'approved') reportHtml = '<span style="background:#dcfce7;color:#059669;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;">✅ Đã duyệt</span>';
            else if (si.report.status === 'pending') reportHtml = '<span style="background:#fef3c7;color:#d97706;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;">⏳ Chờ duyệt</span>';
            else if (si.report.status === 'rejected') {
                reportHtml = '<span style="background:#fecaca;color:#dc2626;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;">❌ Từ chối</span>';
                reportHtml += ` <button onclick="_acSubmitReport()" style="padding:6px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#dc2626,#991b1b);color:white;cursor:pointer;font-weight:700;font-size:12px;">🔄 Nộp lại</button>`;
            }
        } else if (todayDone > 0) {
            reportHtml = `<button onclick="_acSubmitReport()" style="padding:6px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;cursor:pointer;font-weight:700;font-size:12px;animation:_acPulse 2s infinite;">📤 Báo Cáo (${todayDone})</button>`;
        }
    }

    el.innerHTML = [
        { l:'Hôm Nay', v:`${todayDone}/${target}`, bg:'linear-gradient(135deg,#16a34a,#15803d)', icon:'📊' },
        { l:'Tuần Này', v:s.week||0, bg:'linear-gradient(135deg,#f59e0b,#d97706)', icon:'📅' },
        { l:'Tháng Này', v:s.month||0, bg:'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon:'📆' },
    ].map(c => `<div style="flex:1;min-width:200px;background:${c.bg};border-radius:14px;padding:18px 20px;color:white;box-shadow:0 4px 15px rgba(0,0,0,0.15);"><div style="font-size:28px;margin-bottom:4px;">${c.icon}</div><div style="font-size:28px;font-weight:900;">${c.v}</div><div style="font-size:12px;opacity:0.9;font-weight:600;margin-top:2px;">${c.l}</div></div>`).join('')
    + (reportHtml ? `<div style="width:100%;display:flex;align-items:center;gap:8px;margin-top:4px;">${reportHtml}</div>` : '');
}

async function _acSubmitReport() {
    const si = _ac.scheduleInfo;
    if (!si?.found) { showToast('Không tìm thấy CV trong Lịch Khóa Biểu!', 'error'); return; }
    if (si.today_count === 0) { showToast('Chưa có link nào hôm nay!', 'error'); return; }
    const today = _acToday();
    const isRedo = si.report && si.report.status === 'rejected';
    try {
        const formData = new FormData();
        formData.append('quantity', si.today_count);
        formData.append('content', `Add/Cmt Đối Tác: ${si.today_count} link`);
        formData.append('report_value', window.location.origin + '/addcmtdoitackh');
        const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        let resp;
        if (isRedo) {
            resp = await fetch(`/api/schedule/report/${si.report.id}/redo`, { method: 'PUT', body: formData, headers });
        } else {
            formData.append('template_id', si.template_id);
            formData.append('report_date', today);
            resp = await fetch('/api/schedule/report', { method: 'POST', body: formData, headers });
        }
        const data = await resp.json();
        if (data.success) { showToast(isRedo ? '🔄 Đã nộp lại!' : '✅ Đã báo cáo!'); await _acLoadData(); }
        else showToast('Lỗi: ' + (data.error || ''), 'error');
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _acRenderTable() {
    const el = document.getElementById('acTable');
    if (!el) return;
    const rows = _ac.entries;
    if (!rows.length) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">Chưa có dữ liệu hôm nay</div>'; return; }
    const today = _acToday();
    const showUserCol = !_ac.selectedUser && !['nhan_vien','part_time'].includes(currentUser.role);
    let h = `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">
        <th style="padding:10px 8px;text-align:center;width:50px;">STT</th>
        ${showUserCol ? '<th style="padding:10px 8px;">NHÂN VIÊN</th>' : ''}
        <th style="padding:10px 8px;text-align:center;">ẢNH CHỤP MÀN HÌNH</th>
        <th style="padding:10px 8px;text-align:center;">TIME CẬP NHẬT</th>
        <th style="padding:10px 8px;text-align:center;width:80px;">XÓA</th>
    </tr></thead><tbody>`;
    rows.forEach((r, i) => {
        const ed = typeof r.entry_date === 'string' ? r.entry_date.split('T')[0] : r.entry_date;
        const canDel = (r.user_id === currentUser.id && ed === today) || currentUser.role === 'giam_doc';
        const imgCell = r.image_path
            ? `<img src="${r.image_path}" class="ac-thumb" onclick="_acOpenLB('${r.image_path}')" alt="Ảnh" loading="lazy">`
            : '<span style="color:#d1d5db;">—</span>';
        const updatedAt = r.updated_at || r.created_at || '';
        const fmtTime = updatedAt ? new Date(updatedAt).toLocaleString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
        h += `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:10px 8px;text-align:center;font-weight:700;color:#6b7280;">${i+1}</td>
            ${showUserCol ? `<td style="padding:10px 8px;font-size:12px;color:#6b7280;">${r.user_name||''}</td>` : ''}
            <td style="padding:10px 8px;text-align:center;">${imgCell}</td>
            <td style="padding:10px 8px;text-align:center;font-size:11px;color:#6b7280;white-space:nowrap;">${fmtTime}</td>
            <td style="padding:10px 8px;text-align:center;">${canDel ? `<button onclick="_acDel(${r.id})" style="padding:3px 8px;border:1px solid #fecaca;border-radius:6px;background:#fff5f5;color:#dc2626;cursor:pointer;font-size:11px;">🗑️</button>` : ''}</td>
        </tr>`;
    });
    h += '</tbody></table>';
    el.innerHTML = h;
}

function _acAddModal() {
    _ac.imageData = null;
    document.getElementById('acModal')?.remove();
    const m = document.createElement('div'); m.id = 'acModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    m.onclick = e => { if(e.target===m) m.remove(); };
    m.innerHTML = `
    <div style="background:white;border-radius:16px;width:min(480px,92vw);box-shadow:0 20px 60px rgba(0,0,0,0.25);">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:20px 24px;border-radius:16px 16px 0 0;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:18px;font-weight:800;">📷 Báo cáo công việc - Add/Cmt</div>
                <button onclick="document.getElementById('acModal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;font-size:16px;cursor:pointer;">×</button>
            </div>
        </div>
        <div style="padding:24px;">
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-weight:600;font-size:13px;color:#374151;">Hình Ảnh <span style="color:#dc2626;">*</span> (Ctrl+V để dán)</label>
                <div id="acFImgZone" tabindex="0" style="margin-top:4px;border:2px dashed #86efac;border-radius:10px;padding:20px;text-align:center;cursor:pointer;background:#f0fdf4;min-height:70px;outline:none;transition:border-color .2s;" onclick="this.focus()">
                    <div id="acFImgPreview" style="font-size:13px;color:#166534;">📋 Click vào đây rồi Ctrl+V để dán ảnh chụp màn hình</div>
                </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
                <button onclick="document.getElementById('acModal').remove()" style="padding:9px 18px;border:1px solid #d1d5db;border-radius:8px;background:white;color:#374151;cursor:pointer;font-size:13px;">Hủy</button>
                <button onclick="_acSave()" style="padding:9px 22px;border:none;border-radius:8px;background:#16a34a;color:white;cursor:pointer;font-size:13px;font-weight:700;">💾 Lưu</button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(m);
    // Paste handler
    const zone = document.getElementById('acFImgZone');
    zone.addEventListener('paste', e => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = ev => {
                    _ac.imageData = ev.target.result;
                    document.getElementById('acFImgPreview').innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:200px;border-radius:8px;">`;
                    zone.style.borderColor = '#16a34a';
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    });
    setTimeout(() => document.getElementById('acFImgZone')?.focus(), 100);
}

async function _acSave() {
    if (!_ac.imageData) { showToast('Vui lòng dán hình ảnh chụp màn hình!', 'error'); return; }
    try {
        await apiCall('/api/addcmt/entries', 'POST', { fb_link: 'addcmt_' + Date.now(), image_data: _ac.imageData });
        document.getElementById('acModal')?.remove();
        showToast('✅ Đã báo cáo!');
        _acLoadData();
    } catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}

async function _acDel(id) {
    if (!confirm('Xóa link này?')) return;
    try { await apiCall('/api/addcmt/entries/' + id, 'DELETE'); showToast('✅ Đã xóa'); _acLoadData(); }
    catch(e) { showToast(e.message || 'Lỗi', 'error'); }
}


