// ===== CAM KẾT CUỘC HỌP — Redesigned v2: Dashboard + Tabs + Timeline =====
var _ckchOrg = null, _ckchSessionCache = {}, _ckchOpenSessions = {};
var _ckchOverview = null; // overview data from API
var _ckchActiveTab = 'overview'; // 'overview' or 'byDept'

async function renderCamketcuochopPage(content) {
    var container = content || document.getElementById('main-content');
    if (!container) return;
    var now = new Date(), curMonth = now.getMonth()+1, curYear = now.getFullYear();

    container.innerHTML = `<style>
/* ===== GLOBAL LAYOUT ===== */
.ckch-page{background:linear-gradient(135deg,#f8fafc,#eef2ff);min-height:calc(100vh - 60px);padding:0}
.ckch-header{background:linear-gradient(135deg,#1e293b 0%,#312e81 50%,#4338ca 100%);padding:20px 28px;color:#fff;display:flex;align-items:center;gap:16px;flex-wrap:wrap;box-shadow:0 4px 20px rgba(30,41,59,.3)}
.ckch-header h2{margin:0;font-size:22px;font-weight:900;background:linear-gradient(90deg,#fbbf24,#f59e0b,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap}
.ckch-header-sub{font-size:11px;color:#94a3b8;margin-top:2px}
.ckch-filters{display:flex;gap:8px;align-items:center;margin-left:auto;flex-wrap:wrap}
.ckch-sel{padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;font-size:12px;font-weight:700;cursor:pointer;outline:none;backdrop-filter:blur(4px);transition:all .2s}
.ckch-sel:hover{background:rgba(255,255,255,.2)}
.ckch-sel option{color:#1e293b;background:#fff}
.ckch-btn-perm{padding:8px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(245,158,11,.3);transition:transform .15s}
.ckch-btn-perm:hover{transform:translateY(-1px)}

/* ===== SEARCH BAR (in header) ===== */
.ckch-search-wrap{position:relative;flex:1;max-width:420px;display:flex;gap:6px;align-items:center}
.ckch-search-user-filter{padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;font-size:11px;font-weight:600;outline:none;cursor:pointer;min-width:100px;max-width:160px}
.ckch-search-user-filter option{color:#1e293b;background:#fff}
.ckch-search-inner{position:relative;flex:1}
.ckch-search-input{width:100%;padding:8px 14px 8px 32px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;font-size:12px;font-weight:600;outline:none;transition:all .2s;box-sizing:border-box}
.ckch-search-input::placeholder{color:rgba(255,255,255,.5)}
.ckch-search-input:focus{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.4)}
.ckch-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none}
.ckch-search-results{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);max-height:360px;overflow-y:auto;z-index:100;border:1px solid #e5e7eb}
.ckch-search-item{padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .1s}
.ckch-search-item:hover{background:#f0f4ff}
.ckch-search-item:last-child{border-bottom:none}
.ckch-search-session{font-size:10px;color:#6366f1;font-weight:700}
.ckch-search-user{font-size:10px;color:#64748b;margin-left:8px}
.ckch-search-text{font-size:12px;color:#1e293b;font-weight:600;margin-top:2px}
.ckch-search-text mark{background:#fef08a;color:#1e293b;border-radius:2px;padding:0 2px}

/* ===== DASHBOARD CARDS ===== */
.ckch-dashboard{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:20px 28px}
.ckch-stat-card{background:#fff;border-radius:16px;padding:20px;border:1px solid #e5e7eb;box-shadow:0 2px 12px rgba(0,0,0,.04);transition:transform .2s,box-shadow .2s;position:relative;overflow:hidden}
.ckch-stat-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.08)}
.ckch-stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px}
.ckch-stat-card:nth-child(1)::before{background:linear-gradient(90deg,#6366f1,#8b5cf6)}
.ckch-stat-card:nth-child(2)::before{background:linear-gradient(90deg,#f59e0b,#d97706)}
.ckch-stat-card:nth-child(3)::before{background:linear-gradient(90deg,#10b981,#059669)}
.ckch-stat-card:nth-child(4)::before{background:linear-gradient(90deg,#3b82f6,#2563eb)}
.ckch-stat-icon{font-size:32px;margin-bottom:8px}
.ckch-stat-value{font-size:28px;font-weight:900;color:#1e293b;line-height:1}
.ckch-stat-label{font-size:12px;color:#6b7280;font-weight:600;margin-top:4px}

/* ===== TAB SYSTEM ===== */
.ckch-tabs-wrap{padding:0 28px}
.ckch-tabs{display:flex;gap:4px;background:#e5e7eb;border-radius:12px;padding:4px;width:fit-content}
.ckch-tab{padding:10px 24px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:700;color:#6b7280;background:transparent;transition:all .2s}
.ckch-tab.active{background:#fff;color:#4338ca;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.ckch-tab:hover:not(.active){color:#4338ca;background:rgba(255,255,255,.5)}
.ckch-tab-content{padding:16px 28px}

/* ===== SESSION CARDS (Tab 1) ===== */
.ckch-session-list{display:flex;flex-direction:column;gap:16px}
.ckch-session-card{background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.04);transition:all .2s}
.ckch-session-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08)}
.ckch-session-head{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .15s;gap:12px}
.ckch-session-head:hover{background:#fafbff}
.ckch-session-title{font-size:15px;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:8px}
.ckch-session-date{font-size:11px;color:#6b7280;font-weight:500}
.ckch-session-source{font-size:10px;padding:3px 10px;border-radius:10px;font-weight:700}
.ckch-session-source.kpikdoanh{background:#eef2ff;color:#4338ca}
.ckch-session-source.kpisale{background:#fef3c7;color:#92400e}
.ckch-dept-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
.ckch-dept-tag{font-size:10px;padding:2px 8px;border-radius:8px;font-weight:700;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
.ckch-session-stats{display:flex;gap:8px;align-items:center}
.ckch-pill{padding:4px 12px;border-radius:12px;font-size:11px;font-weight:700}
.ckch-session-body{padding:16px 20px;display:none}

/* ===== DEPT TABLE (Tab 2) ===== */
.ckch-dept-table{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 2px 12px rgba(0,0,0,.04)}
.ckch-dept-table thead th{background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:14px 16px;font-size:12px;font-weight:700;text-align:left;white-space:nowrap}
.ckch-dept-table tbody tr{transition:background .15s}
.ckch-dept-table tbody tr:hover{background:#f0f4ff}
.ckch-dept-table tbody td{padding:14px 16px;font-size:13px;border-bottom:1px solid #f1f5f9;color:#1e293b}
.ckch-dept-table tbody tr:last-child td{border-bottom:none}
.ckch-pbar{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;min-width:100px}
.ckch-pbar-fill{height:100%;border-radius:4px;transition:width .5s ease}

/* ===== TIMELINE (bottom) ===== */
.ckch-timeline-wrap{padding:16px 28px 28px}
.ckch-timeline-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.ckch-timeline-title{font-size:15px;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:8px}
.ckch-timeline-nav{display:flex;gap:8px;align-items:center}
.ckch-timeline-btn{padding:6px 14px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
.ckch-timeline-btn:hover{background:#eef2ff;border-color:#6366f1;color:#4338ca}
.ckch-timeline-year{font-size:16px;font-weight:900;color:#4338ca}
.ckch-timeline-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:8px}
.ckch-timeline-cell{background:#fff;border-radius:12px;padding:12px 8px;text-align:center;border:2px solid #e5e7eb;cursor:pointer;transition:all .2s;position:relative}
.ckch-timeline-cell:hover{border-color:#6366f1;transform:translateY(-2px);box-shadow:0 4px 12px rgba(99,102,241,.15)}
.ckch-timeline-cell.active{border-color:#4338ca;background:linear-gradient(135deg,#eef2ff,#e0e7ff);box-shadow:0 4px 12px rgba(67,56,202,.15)}
.ckch-timeline-cell.has-data{border-color:#10b981}
.ckch-timeline-cell.has-data.active{border-color:#4338ca}
.ckch-timeline-month{font-size:11px;font-weight:700;color:#6b7280}
.ckch-timeline-count{font-size:18px;font-weight:900;color:#1e293b;margin-top:4px}
.ckch-timeline-pct{font-size:10px;font-weight:600;margin-top:2px}
.ckch-timeline-dot{width:6px;height:6px;border-radius:50%;margin:4px auto 0}

/* ===== DETAIL VIEW (shared) ===== */
.ckch-empty{padding:40px;text-align:center;color:#94a3b8;font-size:13px}
.ckch-tbl{width:100%;border-collapse:collapse;font-size:12px;background:#fff}
.ckch-tbl th{padding:8px 12px;background:#f8fafc;color:#475569;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;border-bottom:1px solid #e2e8f0;white-space:nowrap}
.ckch-tbl td{padding:10px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle;color:#1e293b}
.ckch-tbl tr:last-child td{border-bottom:none}
.ckch-tbl tr:hover td{background:#f8fafc}
.ckch-stt{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
.ckch-highlight-flash{animation:ckchFlash 2s ease-out}
@keyframes ckchFlash{0%{background:#fef08a;box-shadow:0 0 12px rgba(250,204,21,.5)}100%{background:inherit;box-shadow:none}}

/* ===== RESPONSIVE ===== */
@media(max-width:1024px){.ckch-dashboard{grid-template-columns:repeat(2,1fr)}.ckch-timeline-grid{grid-template-columns:repeat(6,1fr)}}
@media(max-width:640px){.ckch-dashboard{grid-template-columns:1fr}.ckch-timeline-grid{grid-template-columns:repeat(4,1fr)}.ckch-header{flex-direction:column;align-items:stretch}.ckch-filters{margin-left:0}}
</style>

<!-- HEADER -->
<div class="ckch-header">
    <div>
        <h2>📝 Cam Kết Cuộc Họp</h2>
        <div class="ckch-header-sub">Theo dõi cam kết & review sau cuộc họp</div>
    </div>
    <div class="ckch-search-wrap"><select class="ckch-search-user-filter" id="ckchSearchUser" onchange="_ckchSearchContent(document.getElementById('ckchContentSearch').value)"><option value="">👥 Tất cả NV</option></select><div class="ckch-search-inner"><span class="ckch-search-icon">🔍</span><input class="ckch-search-input" id="ckchContentSearch" placeholder="Tìm nội dung cam kết..." oninput="_ckchSearchContent(this.value)" onfocus="_ckchSearchContent(this.value)"><div id="ckchSearchResults" class="ckch-search-results" style="display:none"></div></div></div>
    <div class="ckch-filters">
        <select class="ckch-sel" id="ckchDept"><option value="">🏢 Tất cả bộ phận</option></select>
        <select class="ckch-sel" id="ckchSessionSelect"><option value="">📅 Tất cả cuộc họp</option></select>
        <select class="ckch-sel" id="ckchMonth"></select>
        <select class="ckch-sel" id="ckchYear"></select>
        <button class="ckch-btn-perm" id="ckchCreateSessionBtn" style="display:none;background:linear-gradient(135deg,#6366f1,#4338ca);box-shadow:0 2px 8px rgba(99,102,241,.3)" onclick="_ckchOpenCreateSessionModal()">➕ Tạo Cuộc Họp</button>
        <button class="ckch-btn-perm" id="ckchPermBtn" style="display:none" onclick="_ckchOpenPermissions()">⚙️ Cài Đặt Quyền</button>
    </div>
</div>

<!-- DASHBOARD CARDS -->
<div class="ckch-dashboard" id="ckchDashboard"></div>

<!-- TABS -->
<div class="ckch-tabs-wrap">
    <div class="ckch-tabs">
        <button class="ckch-tab active" onclick="_ckchSwitchTab('overview',this)">📋 Tổng Quan</button>
        <button class="ckch-tab" onclick="_ckchSwitchTab('byDept',this)">🏢 Theo Bộ Phận</button>
    </div>
</div>
<div class="ckch-tab-content" id="ckchTabContent"><div class="ckch-empty">⏳ Đang tải...</div></div>

<!-- TIMELINE -->
<div class="ckch-timeline-wrap" id="ckchTimeline"></div>
`;

    // Populate filters
    var ms = document.getElementById('ckchMonth');
    ms.innerHTML = '';
    for(var m=1;m<=12;m++) ms.innerHTML += '<option value="'+m+'"'+(m===curMonth?' selected':'')+'>Tháng '+m+'</option>';
    var ys = document.getElementById('ckchYear');
    for(var y=curYear;y>=curYear-3;y--) ys.innerHTML += '<option value="'+y+'"'+(y===curYear?' selected':'')+'>'+y+'</option>';
    ms.onchange = _ckchLoadContent;
    ys.onchange = _ckchLoadContent;
    document.getElementById('ckchDept').onchange = _ckchLoadContent;

    // Load org tree for dept filter
    try {
        _ckchOrg = await apiCall('/api/permissions/org-tree');
        _ckchPopulateDeptFilter();
        _ckchPopulateSearchUsers();
    } catch(e) {}

    _ckchLoadContent();
}

// ===== POPULATE DEPT FILTER =====
function _ckchPopulateDeptFilter() {
    var sel = document.getElementById('ckchDept');
    if(!sel || !_ckchOrg) return;
    var depts = _ckchOrg.departments || [];
    var h = '<option value="">🏢 Tất cả bộ phận</option>';

    // Filter allowed root systems: HỆ THỐNG VĂN PHÒNG HV & HỆ THỐNG XƯỞNG HV
    var allowedRoots = depts.filter(function(d){
        if (d.parent_id) return false;
        var nameUpper = (d.name || '').toUpperCase();
        return nameUpper.includes('VĂN PHÒNG') || nameUpper.includes('XƯỞNG') || d.id === 10 || d.id === 11;
    });

    // Ensure VĂN PHÒNG first, XƯỞNG second
    allowedRoots.sort(function(a, b) {
        if (a.id === 10 || (a.name || '').toUpperCase().includes('VĂN PHÒNG')) return -1;
        if (b.id === 10 || (b.name || '').toUpperCase().includes('VĂN PHÒNG')) return 1;
        return a.id - b.id;
    });

    var masterDeptOrder = [10, 4, 1, 6, 5, 16, 17, 19, 11, 8, 12, 13, 14, 15, 18];
    allowedRoots.forEach(function(root) {
        h += '<option value="' + root.id + '">🏛️ ' + root.name.toUpperCase() + '</option>';
        var childDepts = depts.filter(function(d){ return d.parent_id === root.id; });
        childDepts.sort(function(a, b){
            var ia = masterDeptOrder.indexOf(a.id);
            var ib = masterDeptOrder.indexOf(b.id);
            if (ia === -1) ia = 999;
            if (ib === -1) ib = 999;
            return ia - ib;
        });
        childDepts.forEach(function(child) {
            h += '<option value="' + child.id + '">&nbsp;&nbsp;&nbsp;&nbsp;└ 🏢 ' + child.name + '</option>';
        });
    });

    sel.innerHTML = h;
}

// ===== SWITCH TAB =====
window._ckchSwitchTab = function(tab, btn) {
    _ckchActiveTab = tab;
    var tabs = document.querySelectorAll('.ckch-tab');
    for(var i=0;i<tabs.length;i++) tabs[i].classList.remove('active');
    if(btn) btn.classList.add('active');
    _ckchRenderTab();
};

// ===== LOAD CONTENT =====
async function _ckchLoadContent() {
    _ckchSessionCache = {};
    _ckchOverview = null;
    var dashboard = document.getElementById('ckchDashboard');
    var tabContent = document.getElementById('ckchTabContent');
    if(tabContent) tabContent.innerHTML = '<div class="ckch-empty">⏳ Đang tải dữ liệu...</div>';

    var month = document.getElementById('ckchMonth').value;
    var year = document.getElementById('ckchYear').value;
    var deptId = document.getElementById('ckchDept').value;

    try {
        var url = '/api/meeting-commitments/overview?month='+month+'&year='+year;
        if(deptId) url += '&dept_id='+deptId;
        _ckchOverview = await apiCall(url);

        // Populate session select dropdown
        _ckchPopulateSessionFilter();

        // Render dashboard cards
        _ckchRenderDashboard();
        // Render active tab
        _ckchRenderTab();
        // Render timeline
        _ckchRenderTimeline();

    } catch(e) {
        if(tabContent) tabContent.innerHTML = '<div class="ckch-empty" style="color:#ef4444">⚠️ '+(e.message||'Lỗi tải dữ liệu')+'</div>';
    }
}

// ===== POPULATE SESSION FILTER =====
function _ckchPopulateSessionFilter() {
    var sel = document.getElementById('ckchSessionSelect');
    if (!sel || !_ckchOverview) return;
    var sessions = _ckchOverview.sessions || [];
    var prevVal = sel.value;
    var h = '<option value="">📅 Tất cả cuộc họp (' + sessions.length + ')</option>';
    for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        h += '<option value="' + s.id + '"' + (s.id == prevVal ? ' selected' : '') + '>📋 ' + s.title + '</option>';
    }
    sel.innerHTML = h;
    sel.onchange = function() {
        _ckchRenderTab();
    };
}

// ===== RENDER DASHBOARD CARDS =====
function _ckchRenderDashboard() {
    var el = document.getElementById('ckchDashboard');
    if(!el || !_ckchOverview) return;
    var s = _ckchOverview.stats;
    var pctColor = s.avgCompletion >= 80 ? '#059669' : s.avgCompletion >= 50 ? '#d97706' : '#ef4444';

    el.innerHTML = 
        '<div class="ckch-stat-card"><div class="ckch-stat-icon">📋</div><div class="ckch-stat-value">'+s.totalSessions+'</div><div class="ckch-stat-label">Cuộc Họp</div></div>' +
        '<div class="ckch-stat-card"><div class="ckch-stat-icon">🏢</div><div class="ckch-stat-value">'+s.totalDepts+'</div><div class="ckch-stat-label">Bộ Phận Tham Gia</div></div>' +
        '<div class="ckch-stat-card"><div class="ckch-stat-icon">👥</div><div class="ckch-stat-value">'+s.totalUsers+'</div><div class="ckch-stat-label">Nhân Viên Cam Kết</div></div>' +
        '<div class="ckch-stat-card"><div class="ckch-stat-icon">📊</div><div class="ckch-stat-value" style="color:'+pctColor+'">'+s.avgCompletion+'%</div><div class="ckch-stat-label">Hoàn Thành TB</div></div>';
}

// ===== RENDER TAB CONTENT =====
function _ckchRenderTab() {
    if(_ckchActiveTab === 'overview') _ckchRenderOverview();
    else _ckchRenderByDept();
}

// ===== TAB 1: OVERVIEW — Session Cards =====
function _ckchRenderOverview() {
    var el = document.getElementById('ckchTabContent');
    if(!el || !_ckchOverview) return;
    var sessions = _ckchOverview.sessions || [];
    var isGD = typeof currentUser!=='undefined' && currentUser && currentUser.role==='giam_doc';

    var sessionFilterVal = document.getElementById('ckchSessionSelect') ? document.getElementById('ckchSessionSelect').value : '';
    if (sessionFilterVal) {
        sessions = sessions.filter(function(x) { return x.id == sessionFilterVal; });
    }

    if(!sessions.length) {
        el.innerHTML = '<div class="ckch-empty"><div style="font-size:48px;margin-bottom:12px">📭</div><div style="font-size:15px;font-weight:700;color:#64748b">Không có cuộc họp nào</div><div style="margin-top:4px">Chọn tháng/năm khác hoặc thay đổi bộ lọc</div></div>';
        return;
    }

    var h = '<div class="ckch-session-list">';
    var month = document.getElementById('ckchMonth').value;
    var year = document.getElementById('ckchYear').value;
    h += '<div style="font-size:13px;color:#6b7280;margin-bottom:4px;font-weight:600">📋 '+sessions.length+' cuộc họp — Tháng '+month+'/'+year+'</div>';

    var todayStr = new Date().toISOString().split('T')[0];
    var isBoss = typeof currentUser!=='undefined' && currentUser && (currentUser.role==='giam_doc' || currentUser.role==='quan_ly_cap_cao');

    for(var si=0;si<sessions.length;si++) {
        var s = sessions[si];
        var dt = new Date(s.meeting_date);
        var dateStr = dt.toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
        var pctBg = s.pct>=80?'background:#dcfce7;color:#166534':s.pct>=50?'background:#fef3c7;color:#92400e':'background:#fee2e2;color:#991b1b';
        var sourceClass = (s.source||'').indexOf('sale')>-1 ? 'kpisale' : 'kpikdoanh';
        var sourceLabel = (s.source==='kpisale') ? 'P.Sale' : ((s.source==='kpikdoanh') ? 'P.Kinh Doanh' : 'Toàn Công Ty');

        var sDate = s.start_date ? s.start_date.split('T')[0] : (s.meeting_date ? s.meeting_date.split('T')[0] : '');
        var eDate = s.end_date ? s.end_date.split('T')[0] : '';
        if(!eDate && sDate) {
            var ed = new Date(sDate);
            ed.setDate(ed.getDate() + 7);
            eDate = ed.toISOString().split('T')[0];
        }
        var isOpen = (!sDate || todayStr >= sDate) && (!eDate || todayStr <= eDate);

        h += '<div class="ckch-session-card">';
        h += '<div class="ckch-session-head" onclick="_ckchToggleSession('+s.id+')">';
        h += '<div style="flex:1">';
        h += '<div class="ckch-session-title">📋 '+s.title;
        if(s.source) h += ' <span class="ckch-session-source '+sourceClass+'" style="background:#ede9fe;color:#5b21b6">'+sourceLabel+'</span>';
        if(isOpen) {
            h += ' <span style="font-size:11px;font-weight:800;color:#15803d;background:#dcfce7;padding:3px 8px;border-radius:10px;margin-left:6px">🟢 Đang Mở</span>';
        } else {
            h += ' <span style="font-size:11px;font-weight:800;color:#b91c1c;background:#fee2e2;padding:3px 8px;border-radius:10px;margin-left:6px">🔴 Đã Đóng</span>';
        }
        h += '</div>';
        h += '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap">';
        h += '<span class="ckch-session-date">📅 '+dateStr+'</span>';
        if(eDate) h += '<span style="font-size:11px;color:#64748b">🔒 Hạn đóng: '+eDate.split('-').reverse().join('/')+'</span>';
        if(s.depts && s.depts.length) {
            h += '<div class="ckch-dept-tags">';
            var masterDeptOrder = [10, 4, 1, 6, 5, 16, 17, 19, 11, 8, 12, 13, 14, 15, 18];
            var renderDepts = s.depts.slice().sort(function(a, b) {
                var ia = masterDeptOrder.indexOf(a.id);
                var ib = masterDeptOrder.indexOf(b.id);
                if (ia === -1) ia = 999;
                if (ib === -1) ib = 999;
                return ia - ib;
            });
            for(var di=0;di<renderDepts.length;di++) {
                var dColors = ['#eef2ff;color:#4338ca','#ecfdf5;color:#065f46','#fef3c7;color:#92400e','#fce7f3;color:#9d174d','#f0fdf4;color:#166534'];
                h += '<span class="ckch-dept-tag" style="background:'+dColors[di%dColors.length]+';cursor:default">🏢 '+renderDepts[di].name+'</span>';
            }
            h += '</div>';
        }
        h += '</div></div>';
        h += '<div class="ckch-session-stats">';
        h += '<span class="ckch-pill" style="background:#eff6ff;color:#1d4ed8">'+s.total_items+' cam kết</span>';
        h += '<span class="ckch-pill" style="background:#f5f3ff;color:#7c3aed">'+s.userCount+' người</span>';
        h += '<span class="ckch-pill" style="'+pctBg+'">'+s.pct+'%</span>';
        if(isOpen && isBoss) {
            h += '<button class="ckch-pill" style="background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;cursor:pointer;font-weight:700" onclick="event.stopPropagation();_ckchOpenManageSessionDeptsModal('+s.id+', \''+s.title.replace(/'/g, "\\'")+'\')">🏢 Chọn Bộ Phận</button>';
            h += '<button class="ckch-pill" style="background:#fff7ed;color:#c2410c;border:1px solid #ffedd5;cursor:pointer;font-weight:700" onclick="event.stopPropagation();_ckchCloseSession('+s.id+', \''+s.title.replace(/'/g, "\\'")+'\')">🔒 Đóng Cuộc Họp</button>';
        } else if(!isOpen && isBoss) {
            h += '<button class="ckch-pill" style="background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;cursor:pointer;font-weight:700" onclick="event.stopPropagation();_ckchOpenManageSessionDeptsModal('+s.id+', \''+s.title.replace(/'/g, "\\'")+'\')">🏢 Chọn Bộ Phận</button>';
            h += '<button class="ckch-pill" style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;cursor:pointer;font-weight:700" onclick="event.stopPropagation();_ckchReopenSession('+s.id+', \''+s.title.replace(/'/g, "\\'")+'\')">🔓 Mở Lại Cuộc Họp</button>';
        }
        if(isGD) h += '<button class="ckch-pill" style="background:#fee2e2;color:#dc2626;border:none;cursor:pointer" onclick="event.stopPropagation();_ckchDeleteSession('+s.id+')">🗑️</button>';
        h += '</div></div>';
        h += '<div class="ckch-session-body" id="ckchBody'+s.id+'"><div class="ckch-empty">⏳</div></div>';
        h += '</div>';
    }
    h += '</div>';
    el.innerHTML = h;

    // Auto restore open sessions
    if (!window._ckchOpenSessions) window._ckchOpenSessions = {};
    var openSids = Object.keys(window._ckchOpenSessions);
    if (openSids.length > 0) {
        openSids.forEach(function(sId) {
            _ckchToggleSession(parseInt(sId), true);
        });
    } else if (sessions.length === 1) {
        _ckchToggleSession(sessions[0].id, true);
    }
}

// ===== TAB 2: BY DEPT — Table =====
function _ckchRenderByDept() {
    var el = document.getElementById('ckchTabContent');
    if(!el || !_ckchOverview) return;
    var rawDepts = _ckchOverview.deptSummary || [];

    var deptMap = {};
    rawDepts.forEach(function(d){
        if (d.dept_id) deptMap[d.dept_id] = d;
    });

    var customDeptGroups = [
        {
            systemName: '🏛️ HỆ THỐNG VĂN PHÒNG HV',
            depts: [
                { id: 4, name: 'PHÒNG SALE' },
                { id: 1, name: 'PHÒNG KINH DOANH' },
                { id: 6, name: 'PHÒNG MARKETING' },
                { id: 5, name: 'PHÒNG THIẾT KẾ' },
                { id: 16, name: 'PHÒNG KẾ TOÁN' },
                { id: 17, name: 'PHÒNG HÀNH CHÍNH NHÂN SỰ' },
                { id: 19, name: 'PHÒNG THỦ QUỸ' }
            ]
        },
        {
            systemName: '🏛️ HỆ THỐNG XƯỞNG HV',
            depts: [
                { id: 8, name: 'PHÒNG CẮT' },
                { id: 12, name: 'PHÒNG IN' },
                { id: 13, name: 'PHÒNG ÉP' },
                { id: 14, name: 'PHÒNG MAY' },
                { id: 15, name: 'PHÒNG HOÀN THIỆN' },
                { id: 18, name: 'PHÒNG THỦ KHO' }
            ]
        }
    ];

    var h = '<table class="ckch-dept-table"><thead><tr>';
    h += '<th style="width:40px;text-align:center">#</th><th>Bộ Phận</th><th style="text-align:center">Cuộc Họp</th><th style="text-align:center">Nhân Viên</th><th style="text-align:center">Cam Kết</th><th style="text-align:center">Hoàn Thành</th><th style="text-align:center">Tỷ Lệ TB</th><th style="min-width:140px">Tiến Độ</th>';
    h += '</tr></thead><tbody>';

    var globalIndex = 1;

    customDeptGroups.forEach(function(group) {
        // Group Header Row
        h += '<tr style="background:linear-gradient(135deg, #e0e7ff, #ede9fe);color:#1e1b4b;font-weight:900"><td colspan="8" style="padding:10px 16px;font-size:14px;letter-spacing:0.5px;border-top:2px solid #a5b4fc;border-bottom:1.5px solid #c7d2fe">'+group.systemName+'</td></tr>';

        group.depts.forEach(function(targetDept) {
            var d = deptMap[targetDept.id] || {
                dept_id: targetDept.id,
                dept_name: targetDept.name,
                sessionCount: 0,
                userCount: 0,
                commitCount: 0,
                doneCount: 0,
                avgPct: 0
            };

            var pctColor = d.avgPct >= 80 ? '#059669' : d.avgPct >= 50 ? '#d97706' : d.avgPct > 0 ? '#ef4444' : '#64748b';
            var pctGrad = d.avgPct >= 80 ? 'linear-gradient(90deg,#22c55e,#10b981)' : d.avgPct >= 50 ? 'linear-gradient(90deg,#f59e0b,#eab308)' : 'linear-gradient(90deg,#ef4444,#f87171)';

            h += '<tr style="cursor:pointer;transition:background .15s" onclick="_ckchFilterByDept('+d.dept_id+')" onmouseover="this.style.background=\'#f1f5f9\'" onmouseout="this.style.background=\'#fff\'">';
            h += '<td style="font-weight:800;color:#6366f1;text-align:center">'+(globalIndex++)+'</td>';
            h += '<td><div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px">🏢</span><div style="font-weight:800;color:#1e293b">'+d.dept_name+'</div></div></td>';
            h += '<td style="text-align:center"><span style="background:#eff6ff;color:#1d4ed8;padding:3px 10px;border-radius:8px;font-size:12px;font-weight:700">'+d.sessionCount+'</span></td>';
            h += '<td style="text-align:center"><span style="font-weight:700">'+d.userCount+'</span></td>';
            h += '<td style="text-align:center"><span style="font-weight:700">'+d.commitCount+'</span></td>';
            h += '<td style="text-align:center"><span style="font-weight:700;color:'+pctColor+'">'+d.doneCount+'/'+d.commitCount+'</span></td>';
            h += '<td style="text-align:center"><span style="font-size:15px;font-weight:900;color:'+pctColor+'">'+d.avgPct+'%</span></td>';
            h += '<td><div class="ckch-pbar"><div class="ckch-pbar-fill" style="width:'+d.avgPct+'%;background:'+pctGrad+'"></div></div></td>';
            h += '</tr>';
        });
    });

    h += '</tbody></table>';
    el.innerHTML = h;
}

// ===== FILTER BY DEPT (from table click) =====
window._ckchFilterByDept = function(deptId) {
    var sel = document.getElementById('ckchDept');
    if(sel) { sel.value = deptId; _ckchLoadContent(); }
    _ckchSwitchTab('overview', document.querySelector('.ckch-tab'));
};

// ===== RENDER TIMELINE =====
function _ckchRenderTimeline() {
    var el = document.getElementById('ckchTimeline');
    if(!el || !_ckchOverview) return;
    var tl = _ckchOverview.yearlyTimeline;
    var year = document.getElementById('ckchYear').value;
    var curMonth = parseInt(document.getElementById('ckchMonth').value);
    var monthNames = ['','T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

    var h = '<div class="ckch-timeline-header">';
    h += '<div class="ckch-timeline-title">📅 Lịch Sử Cuộc Họp</div>';
    h += '<div class="ckch-timeline-nav">';
    h += '<button class="ckch-timeline-btn" onclick="_ckchChangeYear(-1)">← '+(parseInt(year)-1)+'</button>';
    h += '<span class="ckch-timeline-year">'+year+'</span>';
    h += '<button class="ckch-timeline-btn" onclick="_ckchChangeYear(1)">'+(parseInt(year)+1)+' →</button>';
    h += '</div></div>';

    h += '<div class="ckch-timeline-grid">';
    for(var i=0;i<tl.length;i++) {
        var t = tl[i];
        var isActive = t.month === curMonth;
        var hasData = t.sessionCount > 0;
        var cls = 'ckch-timeline-cell' + (isActive?' active':'') + (hasData?' has-data':'');
        var pctColor = t.avgPct >= 80 ? '#059669' : t.avgPct >= 50 ? '#d97706' : t.avgPct > 0 ? '#ef4444' : '#cbd5e1';
        var dotColor = hasData ? (t.avgPct >= 80 ? '#22c55e' : t.avgPct >= 50 ? '#f59e0b' : '#ef4444') : '#e5e7eb';

        h += '<div class="'+cls+'" onclick="_ckchSelectMonth('+t.month+')">';
        h += '<div class="ckch-timeline-month">'+monthNames[t.month]+'</div>';
        h += '<div class="ckch-timeline-count">'+(hasData?t.sessionCount:'—')+'</div>';
        if(hasData) h += '<div class="ckch-timeline-pct" style="color:'+pctColor+'">'+t.avgPct+'%</div>';
        h += '<div class="ckch-timeline-dot" style="background:'+dotColor+'"></div>';
        h += '</div>';
    }
    h += '</div>';
    el.innerHTML = h;
}

window._ckchSelectMonth = function(m) {
    var sel = document.getElementById('ckchMonth');
    if(sel) { sel.value = m; _ckchLoadContent(); }
};

window._ckchChangeYear = function(delta) {
    var sel = document.getElementById('ckchYear');
    if(sel) {
        var newYear = parseInt(sel.value) + delta;
        // Check if option exists
        var opts = sel.options;
        for(var i=0;i<opts.length;i++) {
            if(parseInt(opts[i].value) === newYear) { sel.value = newYear; _ckchLoadContent(); return; }
        }
        // Add year option if not exists
        var opt = document.createElement('option');
        opt.value = newYear; opt.textContent = newYear;
        if(delta < 0) sel.appendChild(opt); else sel.insertBefore(opt, sel.firstChild);
        sel.value = newYear;
        _ckchLoadContent();
    }
};

// ===== ROLE HELPERS (kept from original) =====
function _ckchRoleIcon(r){
    if(r==='giam_doc')return '⭐';if(r==='quan_ly_cap_cao')return '👑';if(r==='quan_ly')return '💼';
    if(r==='truong_phong')return '🎖️';if(r==='partime')return '🕐';return '👤';
}
function _ckchRoleStyle(r){
    if(r==='giam_doc') return {bg:'#fef3c7',color:'#78350f',tagBg:'#fde68a',tagColor:'#92400e',border:'#f59e0b'};
    if(r==='quan_ly_cap_cao') return {bg:'#e0e7ff',color:'#1e1b4b',tagBg:'#c7d2fe',tagColor:'#3730a3',border:'#6366f1'};
    if(r==='quan_ly') return {bg:'#d1fae5',color:'#064e3b',tagBg:'#a7f3d0',tagColor:'#065f46',border:'#10b981'};
    if(r==='truong_phong') return {bg:'#dbeafe',color:'#1e3a8a',tagBg:'#bfdbfe',tagColor:'#1e40af',border:'#3b82f6'};
    if(r==='nhan_vien') return {bg:'#e0f2fe',color:'#0c4a6e',tagBg:'#bae6fd',tagColor:'#0369a1',border:'#0284c7'};
    if(r==='partime') return {bg:'#f1f5f9',color:'#0f172a',tagBg:'#e2e8f0',tagColor:'#334155',border:'#64748b'};
    return {bg:'#e0f2fe',color:'#0c4a6e',tagBg:'#bae6fd',tagColor:'#0369a1',border:'#0284c7'};
}
function _ckchRoleName(r){
    if(r==='giam_doc')return 'Giám Đốc';if(r==='quan_ly_cap_cao')return 'QL Cấp Cao';if(r==='quan_ly')return 'Quản Lý';
    if(r==='truong_phong')return 'Trưởng Phòng';if(r==='partime')return 'Partime';if(r==='nhan_vien')return 'Nhân Viên';return r||'';
}
function _ckchRoleOrder(r){
    var m={giam_doc:0,quan_ly_cap_cao:1,quan_ly:2,truong_phong:3,nhan_vien:4,partime:5};return m[r]!=null?m[r]:6;
}

// ===== TOGGLE SESSION (kept from original, slightly adapted) =====
window._ckchToggleSession = async function(sid, forceOpen) {
    var body = document.getElementById('ckchBody'+sid);
    if(!body) return;
    var card = body.closest('.ckch-session-card');
    if(!window._ckchOpenSessions) window._ckchOpenSessions = {};

    if(!forceOpen && body.style.display!=='none' && body.style.display!=='') {
        body.style.display='none';
        if (card) card.classList.remove('active');
        delete window._ckchOpenSessions[sid];
        return;
    }
    body.style.display='block';
    if (card) card.classList.add('active');
    window._ckchOpenSessions[sid] = true;
    body.innerHTML = '<div class="ckch-empty">⏳ Đang tải cam kết...</div>';

    try {
        if(!_ckchSessionCache[sid]){
            _ckchSessionCache[sid] = await apiCall('/api/meeting-commitments/sessions/'+sid);
        }
        var data = _ckchSessionCache[sid];
        var commits = data.commitments || [];

        // 3-Tier Grouping: Main Dept -> Team -> Member / Team Template Card
        var byMainDept = {};
        commits.forEach(function(c){
            var dk = c.dept_id || 0;
            var dname = c.dept_name || 'Khác';
            if(!byMainDept[dk]) byMainDept[dk] = { name: dname, teams: {} };

            var tk = c.team_id || c.department_id || dk;
            var tname = c.team_name || c.dept_name || 'Team Khác';
            if(!byMainDept[dk].teams[tk]) byMainDept[dk].teams[tk] = { name: tname, users: {} };

            var isTeamTpl = !!c.department_id;
            var uk = isTeamTpl ? ('team_' + c.department_id + '_' + c.user_id) : c.user_id;
            var uName = isTeamTpl ? ('🏠 Cam Kết Team ' + tname + ' (Ghi bởi ' + c.user_name + ')') : c.user_name;
            var uRole = isTeamTpl ? 'truong_phong' : c.user_role;

            if(!byMainDept[dk].teams[tk].users[uk]) {
                byMainDept[dk].teams[tk].users[uk] = { id: (isTeamTpl ? c.department_id : c.user_id), name: uName, role: uRole, isTeamTpl: isTeamTpl, items: [], team_id: tk };
            }
            byMainDept[dk].teams[tk].users[uk].items.push(c);
        });

        // Only include system root management department (Lê Việt Trinh / Lê Công Thực) for systems that have registered departments or commitments
        var regDepts = (data.registeredDepts || []).slice();
        if (_ckchOrg && _ckchOrg.departments && regDepts.length > 0) {
            var activeSysIds = {};
            regDepts.forEach(function(rd) {
                var dObj = _ckchOrg.departments.find(function(d){ return d.id == rd.id; });
                if (dObj && dObj.parent_id) activeSysIds[dObj.parent_id] = true;
                else if (dObj) activeSysIds[dObj.id] = true;
            });
            _ckchOrg.departments.forEach(function(d) {
                if ((!d.parent_id || d.parent_id === 0) && activeSysIds[d.id]) {
                    var hasDirectUser = _ckchOrg.users && _ckchOrg.users.some(function(u){ return u.department_id == d.id; });
                    if (hasDirectUser && !regDepts.some(function(rd){ return rd.id == d.id; })) {
                        regDepts.push({ id: d.id, name: 'BAN QUẢN LÝ ' + d.name, parent_id: null, isSystemMgmt: true });
                    }
                }
            });
        }

        regDepts.forEach(function(rd) {
            if (!byMainDept[rd.id]) {
                byMainDept[rd.id] = { name: rd.name, teams: {} };
            }
            if (_ckchOrg && _ckchOrg.users) {
                var empList = _ckchOrg.users.filter(function(u) {
                    // System root departments (id 10/11 or no parent_id): ONLY direct executive users
                    var isSysRoot = !rd.parent_id || rd.parent_id === 0 || rd.id === 10 || rd.id === 11;
                    if (isSysRoot) {
                        return u.department_id == rd.id;
                    }
                    // Normal departments: include direct users or child team users
                    if (u.department_id == rd.id) return true;
                    if (u.parent_dept_id == rd.id) return true;
                    if (_ckchOrg.departments) {
                        var userDept = _ckchOrg.departments.find(function(d) { return d.id == u.department_id; });
                        if (userDept && userDept.parent_id == rd.id) return true;
                    }
                    return false;
                });
                empList.forEach(function(u) {
                    var tk = u.department_id || rd.id;
                    var tname = u.dept_name || rd.name;
                    if (!tname && _ckchOrg.departments) {
                        var dObj = _ckchOrg.departments.find(function(d) { return d.id == tk; });
                        if (dObj) tname = dObj.name;
                    }
                    if (!tname) tname = rd.name;

                    if (!byMainDept[rd.id].teams[tk]) byMainDept[rd.id].teams[tk] = { name: tname, users: {} };
                    if (!byMainDept[rd.id].teams[tk].users[u.id]) {
                        byMainDept[rd.id].teams[tk].users[u.id] = { id: u.id, name: u.full_name, role: u.role, isTeamTpl: false, items: [], team_id: tk };
                    }
                });
            }
        });

        // Helper: get system parent for department
        var _ckchGetSystemParent = function(deptId) {
            if (_ckchOrg && _ckchOrg.departments) {
                var d = _ckchOrg.departments.find(function(x){ return x.id == deptId; });
                if (d && d.parent_id) {
                    var p = _ckchOrg.departments.find(function(x){ return x.id == d.parent_id; });
                    if (p) return { id: p.id, name: p.name };
                }
                if (d) return { id: d.id, name: d.name };
            }
            return { id: 10, name: 'HỆ THỐNG VĂN PHÒNG HV' };
        };

        // Group by Main Department, then by System
        var bySystem = {};
        var mainKeys = Object.keys(byMainDept);
        mainKeys.forEach(function(dId) {
            var mainGroup = byMainDept[dId];
            var sysInfo = _ckchGetSystemParent(dId);
            var sysId = sysInfo.id;
            var sysName = sysInfo.name;

            if (!bySystem[sysId]) {
                bySystem[sysId] = { id: sysId, name: sysName, depts: {} };
            }
            bySystem[sysId].depts[dId] = mainGroup;
        });

        var h = '';
        var sysKeys = Object.keys(bySystem);
        // Department color palette with soft light pastel backgrounds and high-contrast dark text
        var _ckchDeptPalette = [
            { bg: '#e0f2fe', border: '#0284c7', text: '#0369a1', title: '#0c4a6e' }, // Soft Sky Blue (Kinh Doanh)
            { bg: '#ffedd5', border: '#ea580c', text: '#c2410c', title: '#7c2d12' }, // Soft Orange (Sale)
            { bg: '#dcfce7', border: '#16a34a', text: '#15803d', title: '#064e3b' }, // Soft Emerald Mint (Kế Toán)
            { bg: '#f3e8ff', border: '#9333ea', text: '#7e22ce', title: '#581c87' }, // Soft Lavender (Thiết Kế/MKT)
            { bg: '#ffe4e6', border: '#e11d48', text: '#be123c', title: '#881337' }, // Soft Rose (May/Cắt)
            { bg: '#fef9c3', border: '#ca8a04', text: '#a16207', title: '#713f12' }  // Soft Amber
        ];

        var _ckchGetDeptStyle = function(deptName, index) {
            var nameLower = (deptName || '').toLowerCase();
            if (nameLower.includes('kinh doanh')) return _ckchDeptPalette[0];
            if (nameLower.includes('sale')) return _ckchDeptPalette[1];
            if (nameLower.includes('kế toán') || nameLower.includes('ke toan') || nameLower.includes('thủ quỹ')) return _ckchDeptPalette[2];
            if (nameLower.includes('thiết kế') || nameLower.includes('marketing')) return _ckchDeptPalette[3];
            if (nameLower.includes('may') || nameLower.includes('cắt') || nameLower.includes('hoàn thiện')) return _ckchDeptPalette[4];
            return _ckchDeptPalette[index % _ckchDeptPalette.length];
        };

        var _ckchRenderMemberCard = function(usr, sid, deptIdVal, uKeyVal) {
            var cardHtml = '';
            var hasCommits = usr.items.length > 0;
            var doneCount = usr.items.filter(function(x){ return x.is_completed; }).length;
            var usrPct = hasCommits ? Math.round(100 * doneCount / usr.items.length) : -1;
            var rs = _ckchRoleStyle(usr.role);

            var cardBg = usr.isTeamTpl ? 'linear-gradient(135deg,#e0e7ff,#ede9fe)' : rs.bg;
            var cardColor = usr.isTeamTpl ? '#3730a3' : rs.color;
            var cardBorder = usr.isTeamTpl ? '#6366f1' : rs.border;

            cardHtml += '<div style="margin:10px 0;border:1.5px solid '+cardBorder+';border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.04)">';
            cardHtml += '<div style="padding:10px 14px;background:'+cardBg+';font-size:13px;font-weight:700;color:'+cardColor+';display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(0,0,0,0.05)">';
            cardHtml += '<span style="font-size:16px">'+(usr.isTeamTpl?'📋':_ckchRoleIcon(usr.role))+'</span>';
            cardHtml += '<span style="font-weight:700;color:'+cardColor+'">'+usr.name+'</span>';
            if (!usr.isTeamTpl) {
                cardHtml += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;background:'+rs.tagBg+';color:'+rs.tagColor+'">'+_ckchRoleName(usr.role)+'</span>';
            }
            if(hasCommits){
                cardHtml += '<span style="margin-left:auto;font-size:11px;font-weight:600;color:'+cardColor+';opacity:.95">'+usr.items.length+' cam kết</span>';
                cardHtml += '<span style="font-size:12px;font-weight:700;background:rgba(0,0,0,0.08);color:'+cardColor+';padding:2px 8px;border-radius:8px;border:1px solid rgba(0,0,0,0.08)">'+usrPct+'%</span>';
            } else {
                cardHtml += '<span style="margin-left:auto;font-size:12px;font-weight:600;color:#64748b">Chưa có cam kết</span>';
            }
            var safeUsrName = usr.name.replace(/'/g, "\\'");
            var userIdVal = usr.id || parseInt(uKeyVal) || 0;
            cardHtml += '<button style="margin-left:8px;padding:4px 12px;border-radius:8px;border:none;background:#4f46e5;color:#fff;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(79,70,229,.3)" onclick="event.stopPropagation();_ckchOpenMemberRecordModal('+sid+','+userIdVal+',\''+safeUsrName+'\','+usr.isTeamTpl+','+deptIdVal+')">✍️ Ghi</button>';
            cardHtml += '<button style="margin-left:4px;padding:4px 12px;border-radius:8px;border:none;background:#16a34a;color:#fff;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(22,163,74,.3)" onclick="event.stopPropagation();_ckchOpenMemberReviewModal('+sid+','+userIdVal+',\''+safeUsrName+'\','+usr.isTeamTpl+','+deptIdVal+')">✅ Review</button>';
            cardHtml += '</div>';

            if(hasCommits){
                cardHtml += '<div style="overflow-x:auto"><table class="ckch-tbl"><thead><tr>';
                cardHtml += '<th style="width:36px;text-align:center">#</th>';
                cardHtml += '<th>❓ Câu Hỏi / Cam Kết & 💬 Câu Trả Lời</th>';
                cardHtml += '<th style="width:110px;text-align:right">🎯 Mục Tiêu</th>';
                cardHtml += '<th style="width:110px;text-align:right">📊 Đã Đạt</th>';
                cardHtml += '<th style="width:25%">✍️ Trao Đổi Kết Quả</th>';
                cardHtml += '<th style="width:140px">📈 Tiến Độ</th>';
                cardHtml += '</tr></thead><tbody>';

                for(var ci=0;ci<usr.items.length;ci++){
                    var item = usr.items[ci];
                    var pc = item.completion_pct>=80?'#16a34a':item.completion_pct>=50?'#d97706':'#dc2626';
                    var parts = item.content.split('✅');
                    var question = (parts[0] || '').trim();
                    var answer = parts.length > 1 ? parts.slice(1).join('✅').trim() : '';
                    if (!parts[1] && !item.content.includes('✅')) {
                        answer = item.content;
                        question = item.question_content || '';
                    }
                    var cleanQ = (question || '').replace(/^❓\s*/, '').trim();
                    var sttNum = item.stt || (ci + 1);
                    var questionDisplay = '❓ Câu Hỏi ' + sttNum + ' : ' + (cleanQ ? cleanQ : ('Cam kết #' + sttNum));

                    var pctVal = item.completion_pct||0;
                    var actualRev = item.target_revenue > 0 ? Math.round(item.target_revenue * pctVal / 100) : 0;

                    cardHtml += '<tr id="ckchCommit'+item.id+'" data-commit-id="'+item.id+'">';
                    cardHtml += '<td style="text-align:center"><span class="ckch-stt" style="width:22px;height:22px;font-size:10px;margin:0 auto">'+item.stt+'</span></td>';
                    cardHtml += '<td>';
                    cardHtml += '<div style="font-weight:700;color:#1e293b;font-size:13px;line-height:1.4">'+questionDisplay+'</div>';
                    if(answer) {
                        var answerFormatted = answer.replace(/\s*(\d+)\.\s*/g, function(m,n,o){ return o>0?'<br>'+n+'. ':n+'. '; });
                        cardHtml += '<div style="margin-top:4px;font-size:12px;font-weight:600;color:#1d4ed8;background:#eff6ff;padding:4px 8px;border-radius:6px;border:1px solid #bfdbfe;line-height:1.5;display:inline-block;max-width:100%">💬 '+answerFormatted+'</div>';
                    } else {
                        cardHtml += '<div style="margin-top:2px;font-size:11px;color:#94a3b8;font-style:italic">Chưa có câu trả lời</div>';
                    }
                    cardHtml += '</td>';
                    cardHtml += '<td style="text-align:right">';
                    if(item.target_revenue > 0) cardHtml += '<span style="font-weight:800;color:#b45309;font-size:13px">'+_ckchFmtMoney(item.target_revenue)+'</span>';
                    else cardHtml += '<span style="color:#cbd5e1">—</span>';
                    cardHtml += '</td>';
                    cardHtml += '<td style="text-align:right">';
                    if(item.target_revenue > 0) cardHtml += '<span style="font-weight:800;color:#15803d;font-size:13px">'+_ckchFmtMoney(actualRev)+'</span>';
                    else cardHtml += '<span style="color:#cbd5e1">—</span>';
                    cardHtml += '</td>';
                    cardHtml += '<td>';
                    if(item.review_note){
                        cardHtml += '<div style="font-size:12px;font-weight:600;color:#064e3b;background:#ecfdf5;padding:4px 8px;border-radius:6px;border:1px solid #a7f3d0;line-height:1.4">✍️ '+item.review_note;
                        if(item.reviewed_by_name) cardHtml += '<div style="font-size:10px;color:#6366f1;margin-top:2px">👤 '+item.reviewed_by_name+'</div>';
                        cardHtml += '</div>';
                    } else {
                        cardHtml += '<span style="color:#94a3b8;font-style:italic;font-size:11px">Chưa có review</span>';
                    }
                    cardHtml += '</td>';
                    cardHtml += '<td>';
                    cardHtml += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">';
                    cardHtml += '<span style="font-size:12px;font-weight:900;color:'+pc+'">'+pctVal+'%</span>';
                    cardHtml += '</div>';
                    cardHtml += '<div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pctVal+'%;background:'+pc+';border-radius:3px"></div></div>';
                    cardHtml += '</td>';
                    cardHtml += '</tr>';
                }
                cardHtml += '</tbody></table></div>';
            }
            cardHtml += '</div>';
            return cardHtml;
        };

        var activeDeptFilter = document.getElementById('ckchDept') ? document.getElementById('ckchDept').value : '';

        for (var si = 0; si < sysKeys.length; si++) {
            var sysGroup = bySystem[sysKeys[si]];

            // If a specific sub-department filter is selected, check if this system contains the selected department!
            if (activeDeptFilter) {
                var hasMatchingDeptInSys = Object.keys(sysGroup.depts || {}).some(function(dk){ return dk == activeDeptFilter; });
                if (!hasMatchingDeptInSys) continue; // SKIP entire system block if it does NOT contain the filtered department!
            }

            var sysBlockId = 'ckchSysBlock_' + sid + '_' + sysKeys[si];
            var isSysOpen = !window._ckchBlockStates || window._ckchBlockStates[sysBlockId] !== false;

            // Tier 0: System Root Block (Nền sáng nhẹ, chữ đậm to nổi bật)
            h += '<div style="margin-bottom:28px;border:2px solid #a5b4fc;border-radius:20px;overflow:hidden;background:#ffffff;box-shadow:0 6px 20px rgba(99,102,241,0.08)">';
            h += '<div style="padding:16px 22px;background:linear-gradient(135deg, #e0e7ff, #ede9fe);color:#1e1b4b;font-size:16px;font-weight:700;display:flex;align-items:center;gap:10px;letter-spacing:0.3px;cursor:pointer;user-select:none;border-bottom:1px solid #c7d2fe" onclick="_ckchToggleCollapse(\''+sysBlockId+'\', this)" title="Nhấp để mở rộng / thu gọn khối hệ thống">';
            h += '🏛️ ' + sysGroup.name.toUpperCase();
            h += '<span class="ckch-collapse-icon" data-type="text" style="margin-left:auto;font-size:12px;font-weight:600;background:#ffffff;color:#4338ca;border:1px solid #c7d2fe;padding:4px 14px;border-radius:14px;box-shadow:0 2px 6px rgba(0,0,0,0.05)">'+(isSysOpen ? '▼ Thu gọn' : '▲ Mở rộng')+'</span>';
            h += '</div>';
            h += '<div id="' + sysBlockId + '" style="display:'+(isSysOpen ? 'block' : 'none')+';padding:16px;background:#f8fafc">';

            // Render direct system management executive members (Lê Việt Trinh, Lê Công Thực) ONLY when viewing all departments or filtering for system root itself
            if (!activeDeptFilter || activeDeptFilter == sysKeys[si]) {
                var directSysDept = sysGroup.depts[sysKeys[si]];
                if (directSysDept && directSysDept.teams) {
                    var sTeamKeys = Object.keys(directSysDept.teams);
                    for (var sti = 0; sti < sTeamKeys.length; sti++) {
                        var sTeamGroup = directSysDept.teams[sTeamKeys[sti]];
                        var sUserKeys = Object.keys(sTeamGroup.users);
                        for (var sui = 0; sui < sUserKeys.length; sui++) {
                            var sysUsr = sTeamGroup.users[sUserKeys[sui]];
                            h += _ckchRenderMemberCard(sysUsr, sid, sysKeys[si], sUserKeys[sui]);
                        }
                    }
                }
            }

            // Tier 1: Main Department Block inside System
            var deptKeys = Object.keys(sysGroup.depts);
            for (var di = 0; di < deptKeys.length; di++) {
                if (deptKeys[di] == sysKeys[si]) continue; // Skip direct system dept because it's rendered directly under system header
                if (activeDeptFilter && deptKeys[di] != activeDeptFilter) continue; // Filter to show ONLY the selected department!
                var mainGroup = sysGroup.depts[deptKeys[di]];
                var teamKeysCheck = Object.keys(mainGroup.teams || {});
                if (teamKeysCheck.length === 0) continue;
                var ds = _ckchGetDeptStyle(mainGroup.name, di);

                var blockId = 'ckchDeptBlock_' + sid + '_' + deptKeys[di];
                var isDeptOpen = !!(window._ckchBlockStates && window._ckchBlockStates[blockId]);

                h += '<div style="margin-bottom:18px;border:1.5px solid '+ds.border+';border-left:6px solid '+ds.border+';border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 4px 14px rgba(0,0,0,.03)">';
                var isBoss = typeof currentUser!=='undefined' && currentUser && (currentUser.role==='giam_doc' || currentUser.role==='quan_ly_cap_cao' || currentUser.role==='quan_ly');
                var safeDeptName = mainGroup.name.replace(/'/g, "\\'");
                var deptIdVal = deptKeys[di];

                h += '<div style="padding:14px 18px;background:'+ds.bg+';color:'+ds.title+';font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px;letter-spacing:0.3px;cursor:pointer;user-select:none;transition:all 0.2s" onclick="_ckchToggleCollapse(\''+blockId+'\', this)" title="Nhấp để mở rộng / thu gọn phòng ban">';
                h += '🏢 '+mainGroup.name.toUpperCase();
                if (isBoss) {
                    h += '<div style="margin-left:auto;display:flex;align-items:center;gap:6px" onclick="event.stopPropagation()">';
                    h += '<button style="padding:5px 14px;border-radius:18px;border:1px solid '+ds.border+';background:#ffffff;color:'+ds.text+';font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.06);transition:all .15s" onclick="_ckchOpenDeptTemplateModal('+deptIdVal+', \''+safeDeptName+'\', false)">⚙️ Mẫu Cá Nhân</button>';
                    h += '<button style="padding:5px 14px;border-radius:18px;border:1px solid '+ds.border+';background:#ffffff;color:'+ds.text+';font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.06);transition:all .15s" onclick="_ckchOpenDeptTemplateModal('+deptIdVal+', \''+safeDeptName+'\', true)">⚙️ Mẫu Team</button>';
                    h += '</div>';
                }
                h += '<span class="ckch-collapse-icon" data-type="text" style="'+(isBoss ? 'margin-left:8px' : 'margin-left:auto')+';font-size:11px;font-weight:600;background:#ffffff;color:'+ds.title+';border:1px solid '+ds.border+';padding:3px 12px;border-radius:12px;box-shadow:0 2px 4px rgba(0,0,0,0.04)">'+(isDeptOpen ? '▼ Thu gọn' : '▲ Mở rộng')+'</span>';
                h += '</div>';
                h += '<div id="'+blockId+'" style="display:'+(isDeptOpen ? 'block' : 'none')+'">';

                var teamKeys = Object.keys(mainGroup.teams);
                for(var ti=0; ti<teamKeys.length; ti++) {
                    var teamGroup = mainGroup.teams[teamKeys[ti]];
                    var teamBlockId = 'ckchTeamBlock_' + sid + '_' + deptKeys[di] + '_' + teamKeys[ti];

                    // Tier 2: Team Block (TEAM có Nền Đậm, chữ trắng nổi bật - Ảnh 4)
                    h += '<div style="margin:12px;border:1.5px solid #475569;border-radius:14px;background:#ffffff;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.05)">';
                    h += '<div style="padding:11px 16px;background:linear-gradient(135deg, #1e293b, #334155);border-bottom:1.5px solid #475569;color:#ffffff;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none" onclick="_ckchToggleCollapse(\''+teamBlockId+'\', this)" title="Nhấp để thu gọn / mở rộng team">';
                    h += '🏠 TEAM: '+teamGroup.name.toUpperCase();
                    var userCount = Object.keys(teamGroup.users).length;
                    h += '<span style="margin-left:auto;font-size:11px;font-weight:600;color:#ffffff;background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px">'+userCount+' mục</span>';
                    h += '<span class="ckch-collapse-icon" data-type="icon" style="font-size:11px;color:#94a3b8;margin-left:4px;font-weight:700">▼</span>';
                    h += '</div>';
                    h += '<div id="'+teamBlockId+'">';

                    var uKeys = Object.keys(teamGroup.users);
                    uKeys.sort(function(a,b){
                        var uA = teamGroup.users[a], uB = teamGroup.users[b];
                        if (uA.isTeamTpl && !uB.isTeamTpl) return -1;
                        if (!uA.isTeamTpl && uB.isTeamTpl) return 1;
                        return _ckchRoleOrder(uA.role) - _ckchRoleOrder(uB.role);
                    });

                    // Tier 3: Member / Team Template Cards (Nền Nhạt, Chữ Nổi - Ảnh 1, 2, 3)
                    for(var ui=0; ui<uKeys.length; ui++) {
                        var usr = teamGroup.users[uKeys[ui]];
                        h += _ckchRenderMemberCard(usr, sid, deptIdVal, uKeys[ui]);
                    } // End ui
                    h += '</div>'; // End Tier 2 Body (teamBlockId)
                    h += '</div>'; // End Tier 2 Box
                } // End ti
                h += '</div>'; // End Tier 1 Body (blockId)
                h += '</div>'; // End Tier 1 Main Dept Box
            } // End di
            h += '</div>'; // End Tier 0 System Body
            h += '</div>'; // End Tier 0 System Box
        } // End si

        if(!h) {
            h = '<div style="padding:36px 20px;text-align:center;background:#ffffff;border:2px dashed #a5b4fc;border-radius:18px;margin:16px 0;box-shadow:0 6px 20px rgba(99,102,241,0.05)">';
            h += '<div style="font-size:42px;margin-bottom:12px">🏛️</div>';
            h += '<div style="font-size:16px;font-weight:800;color:#1e1b4b;margin-bottom:8px">Cuộc họp này chưa có phòng ban nào tham gia</div>';
            h += '<div style="font-size:13px;color:#64748b;margin-bottom:18px">Vui lòng bấm nút <b>"🏢 Chọn Bộ Phận"</b> ở góc trên để chọn các phòng ban tham gia cho cuộc họp này.</div>';
            var isBossUser = typeof currentUser !== 'undefined' && currentUser && (currentUser.role === 'giam_doc' || currentUser.role === 'quan_ly_cap_cao');
            if (isBossUser) {
                var safeTitle = (data.session ? data.session.title : '').replace(/'/g, "\\'");
                h += '<button style="padding:10px 24px;border-radius:20px;border:none;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(79,70,229,.35)" onclick="_ckchOpenManageSessionDeptsModal(' + sid + ', \'' + safeTitle + '\')">🏢 Chọn Bộ Phận Tham Gia Cuộc Họp</button>';
            }
            h += '</div>';
        }
        body.innerHTML = h;
    } catch(e) {
        body.innerHTML = '<div class="ckch-empty" style="color:#ef4444">⚠️ '+(e.message||'Lỗi')+'</div>';
    }
};

// ===== TOGGLE COLLAPSE DEPARTMENT / TEAM BLOCK =====
window._ckchToggleCollapse = function(targetId, headerEl) {
    var target = document.getElementById(targetId);
    if (!target) return;
    var isHidden = target.style.display === 'none';
    target.style.display = isHidden ? 'block' : 'none';

    if (!window._ckchBlockStates) window._ckchBlockStates = {};
    window._ckchBlockStates[targetId] = isHidden;

    var icon = headerEl.querySelector('.ckch-collapse-icon');
    if (icon) {
        if (icon.getAttribute('data-type') === 'text') {
            icon.innerHTML = isHidden ? '▼ Thu gọn' : '▲ Mở rộng';
        } else {
            icon.innerHTML = isHidden ? '▼' : '▲';
        }
    }
};

// ===== DELETE SESSION =====
window._ckchDeleteSession = async function(sid) {
    if(!confirm('Xóa cuộc họp này?')) return;
    try { await apiCall('/api/meeting-commitments/sessions/'+sid,'DELETE'); delete _ckchSessionCache[sid]; _ckchLoadContent(); } catch(e){ alert('Lỗi: '+(e.message||'')); }
};

function _ckchFmtMoney(n){
    if(!n) return '0';
    return Number(n).toLocaleString('vi-VN');
}

// ===== POPULATE SEARCH USER DROPDOWN =====
function _ckchPopulateSearchUsers(){
    var sel = document.getElementById('ckchSearchUser');
    if(!sel || !_ckchOrg) return;
    var staffRoles = ['giam_doc','quan_ly_cap_cao','quan_ly','truong_phong','nhan_vien','partime'];
    var users = (_ckchOrg.users||[]).filter(function(u){return staffRoles.indexOf(u.role)>-1;}).sort(function(a,b){return (a.full_name||'').localeCompare(b.full_name||'');});
    var h = '<option value="">👥 Tất cả NV</option>';
    for(var i=0;i<users.length;i++){
        h += '<option value="'+users[i].id+'">'+users[i].full_name+'</option>';
    }
    sel.innerHTML = h;
}

// ===== SEARCH COMMITMENTS (GLOBAL ACROSS ALL MONTHS & YEARS) =====
var _ckchSearchTimer = null;
window._ckchSearchContent = function(q) {
    clearTimeout(_ckchSearchTimer);
    var dd = document.getElementById('ckchSearchResults');
    if(!dd) return;
    q = (q||'').trim();
    var filterUserId = document.getElementById('ckchSearchUser') ? document.getElementById('ckchSearchUser').value : '';
    if(q.length < 2 && !filterUserId) { dd.style.display='none'; return; }

    _ckchSearchTimer = setTimeout(async function(){
        try {
            var url = '/api/meeting-commitments/search?q=' + encodeURIComponent(q);
            if (filterUserId) url += '&user_id=' + filterUserId;
            var res = await apiCall(url);
            var results = (res && res.results) ? res.results : [];

            if(!results.length){
                dd.innerHTML = '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">Không tìm thấy cam kết nào</div>';
                dd.style.display='block'; return;
            }

            var h = '';
            var ql = q.toLowerCase();
            for(var k=0;k<results.length;k++){
                var r = results[k];
                var preview = (r.content||'').replace(/✅/g,' ▸ ');
                if (ql) {
                    var idx = preview.toLowerCase().indexOf(ql);
                    if(idx > -1) {
                        var before = preview.substring(0, idx);
                        var match = preview.substring(idx, idx + ql.length);
                        var after = preview.substring(idx + ql.length);
                        preview = before + '<mark>' + match + '</mark>' + after;
                    }
                }
                if(preview.length > 120) preview = preview.substring(0,120)+'...';

                var dateStr = r.month ? ('Tháng ' + r.month + '/' + r.year) : '';

                h += '<div class="ckch-search-item" onclick="_ckchGoToCommit('+r.session_id+','+r.commit_id+','+r.month+','+r.year+')">';
                h += '<div><span class="ckch-search-session">📋 '+(r.session_title || ('Cuộc Họp #'+r.session_id))+'</span>';
                if(dateStr) h += '<span style="font-size:10px;font-weight:700;color:#6366f1;background:#eef2ff;padding:2px 6px;border-radius:4px;margin-left:6px">📅 '+dateStr+'</span>';
                if(r.user_name) h += '<span class="ckch-search-user">👤 '+r.user_name+'</span>';
                h += '</div>';
                h += '<div class="ckch-search-text">'+preview+'</div>';
                h += '</div>';
            }
            dd.innerHTML = h;
            dd.style.display = 'block';
        } catch(e) {
            dd.innerHTML = '<div style="padding:16px;text-align:center;color:#ef4444;font-size:12px">⚠️ Lỗi tìm kiếm</div>';
            dd.style.display = 'block';
        }
    }, 300);
};

window._ckchGoToCommit = async function(sid, commitId, targetMonth, targetYear) {
    var dd = document.getElementById('ckchSearchResults');
    if(dd) dd.style.display = 'none';
    var inp = document.getElementById('ckchContentSearch');
    if(inp) inp.value = '';

    // Switch Month and Year filters if different
    var monthSel = document.getElementById('ckchMonth');
    var yearSel = document.getElementById('ckchYear');
    var needReload = false;

    if (targetYear && yearSel && parseInt(yearSel.value) !== parseInt(targetYear)) {
        // Ensure option exists for targetYear
        var hasYearOpt = false;
        for (var i = 0; i < yearSel.options.length; i++) {
            if (parseInt(yearSel.options[i].value) === parseInt(targetYear)) { hasYearOpt = true; break; }
        }
        if (!hasYearOpt) {
            var opt = document.createElement('option');
            opt.value = targetYear; opt.textContent = targetYear;
            yearSel.insertBefore(opt, yearSel.firstChild);
        }
        yearSel.value = targetYear;
        needReload = true;
    }

    if (targetMonth && monthSel && parseInt(monthSel.value) !== parseInt(targetMonth)) {
        monthSel.value = targetMonth;
        needReload = true;
    }

    // Switch to overview tab
    _ckchSwitchTab('overview', document.querySelector('.ckch-tab'));
    await _ckchLoadContent();

    // Expand session card if collapsed
    var body = document.getElementById('ckchBody'+sid);
    if(!body || body.style.display === 'none' || body.style.display === '') {
        await _ckchToggleSession(sid, true);
    }

    setTimeout(function(){
        var el = document.getElementById('ckchCommit'+commitId);
        if(el) {
            // Expand all parent collapsed blocks (System Block, Dept Block, Team Block)
            var curr = el.parentElement;
            while (curr && curr.id !== ('ckchBody' + sid)) {
                if (curr.id && (curr.id.indexOf('ckchDeptBlock_') === 0 || curr.id.indexOf('ckchSysBlock_') === 0 || curr.id.indexOf('ckchTeamBlock_') === 0)) {
                    curr.style.display = 'block';
                    if (!window._ckchBlockStates) window._ckchBlockStates = {};
                    window._ckchBlockStates[curr.id] = true;
                    var header = curr.previousElementSibling;
                    if (header) {
                        var icon = header.querySelector('.ckch-collapse-icon');
                        if (icon && icon.getAttribute('data-type') === 'text') {
                            icon.textContent = '▼ Thu gọn';
                        }
                    }
                }
                curr = curr.parentElement;
            }

            el.scrollIntoView({behavior:'smooth', block:'center'});
            el.classList.add('ckch-highlight-flash');
            setTimeout(function(){ el.classList.remove('ckch-highlight-flash'); }, 3000);
        } else {
            var sessEl = document.getElementById('ckchSessionCard'+sid);
            if (sessEl) sessEl.scrollIntoView({behavior:'smooth', block:'center'});
        }
    }, 500);
};

// Close search dropdown when clicking outside
document.addEventListener('click', function(e){
    var wrap = document.querySelector('.ckch-search-wrap');
    if(wrap && !wrap.contains(e.target)){
        var dd = document.getElementById('ckchSearchResults');
        if(dd) dd.style.display = 'none';
    }
});

// ===== PERMISSION SETTINGS MODAL (kept from original) =====
var _ckchPermData = [];
var _ckchAllRoles = [
    { value: 'giam_doc', label: 'Giám Đốc' },
    { value: 'quan_ly_cap_cao', label: 'Quản Lý Cấp Cao' },
    { value: 'quan_ly', label: 'Quản Lý' },
    { value: 'truong_phong', label: 'Trưởng Phòng' },
    { value: 'nhan_vien', label: 'Nhân Viên' },
    { value: 'thu_viec', label: 'Thử Việc' }
];
var _ckchSources = [
    { value: 'kpikdoanh', label: 'KPI P.Kinh Doanh' },
    { value: 'kpisale', label: 'KPI P.Sale' }
];
var _ckchPermTypes = [
    { value: 'create_session', label: '➕ Tạo Cuộc Họp', icon: '📋' },
    { value: 'setup_personal', label: '⚙️ Mẫu Cá Nhân', icon: '👤' },
    { value: 'setup_team', label: '⚙️ Mẫu Team', icon: '👥' }
];

function _ckchCheckPermBtn() {
    var user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
    var btn = document.getElementById('ckchPermBtn');
    if (btn && user && user.role === 'giam_doc') btn.style.display = '';

    var createBtn = document.getElementById('ckchCreateSessionBtn');
    if (createBtn && user && (user.role === 'giam_doc' || user.role === 'quan_ly_cap_cao')) createBtn.style.display = '';
}
setTimeout(_ckchCheckPermBtn, 500);
setTimeout(_ckchCheckPermBtn, 2000);

async function _ckchCalcAutoTitle() {
    var titleEl = document.getElementById('ckchNewTitle');
    var dateVal = document.getElementById('ckchNewDate') ? document.getElementById('ckchNewDate').value : '';
    if (!titleEl) return;

    var d = new Date();
    if (dateVal) {
        var parts = dateVal.split('-');
        if (parts.length === 3) d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    var m = d.getMonth() + 1;
    var y = d.getFullYear();

    var count = 0;
    try {
        var res = await apiCall('/api/meeting-commitments/sessions?month=' + m + '&year=' + y);
        count = (res && res.sessions) ? res.sessions.length : 0;
    } catch(e) {}

    var sessionNo = count + 1;
    titleEl.value = 'Cuộc Họp Số ' + sessionNo + ' - Tháng ' + m + '/' + y;
}

window._ckchOnStartDateChange = function(sVal) {
    _ckchCalcAutoTitle();
    var endEl = document.getElementById('ckchNewEndDate');
    if (!endEl || !sVal) return;
    var d = new Date(sVal);
    d.setDate(d.getDate() + 7);
    var eVal = d.toISOString().split('T')[0];
    endEl.value = eVal;
};

window._ckchCloseSession = async function(sessionId, title) {
    if (typeof Swal !== 'undefined') {
        var res = await Swal.fire({
            title: '🔒 Đóng cuộc họp',
            html: 'Bạn có chắc chắn muốn <b>ĐÓNG</b> cuộc họp <b>[' + title + ']</b> ngay bây giờ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#c2410c',
            cancelButtonColor: '#64748b',
            confirmButtonText: '🔒 Đồng ý đóng',
            cancelButtonText: 'Hủy'
        });
        if (!res.isConfirmed) return;
    } else {
        if (!confirm('Bạn có chắc chắn muốn ĐÓNG cuộc họp [' + title + '] ngay bây giờ?')) return;
    }
    var yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    try {
        try {
            await apiCall('/api/meeting-commitments/sessions/' + sessionId, 'PUT', { is_close: true, end_date: yesterday });
        } catch(err) {
            await apiCall('/api/meeting-commitments/sessions/' + sessionId + '/close', 'PUT');
        }
        showToast('✅ Đã đóng cuộc họp thành công!', 'success');
        _ckchOverview = null;
        _ckchLoadContent();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

window._ckchReopenSession = async function(sessionId, title) {
    if (typeof Swal !== 'undefined') {
        var res = await Swal.fire({
            title: '🔓 Mở lại cuộc họp',
            html: 'Bạn có chắc chắn muốn <b>MỞ LẠI</b> cuộc họp <b>[' + title + ']</b> không?<br><span style="font-size:12px;color:#64748b">Mặc định cuộc họp sẽ được gia hạn thêm 7 ngày.</span>',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#64748b',
            confirmButtonText: '🔓 Đồng ý mở lại',
            cancelButtonText: 'Hủy'
        });
        if (!res.isConfirmed) return;
    } else {
        if (!confirm('Bạn có chắc chắn muốn MỞ LẠI cuộc họp [' + title + '] không? Mặc định cuộc họp sẽ được gia hạn thêm 7 ngày.')) return;
    }
    var todayStr = new Date().toISOString().split('T')[0];
    var newEnd = new Date();
    newEnd.setDate(newEnd.getDate() + 7);
    var newEndStr = newEnd.toISOString().split('T')[0];
    try {
        try {
            await apiCall('/api/meeting-commitments/sessions/' + sessionId, 'PUT', { is_reopen: true, start_date: todayStr, end_date: newEndStr });
        } catch(err) {
            await apiCall('/api/meeting-commitments/sessions/' + sessionId + '/reopen', 'PUT');
        }
        showToast('✅ Đã mở lại cuộc họp thành công!', 'success');
        _ckchOverview = null;
        _ckchLoadContent();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

window._ckchOpenCreateSessionModal = function() {
    var today = new Date().toISOString().split('T')[0];
    var activeSession = null;
    if (_ckchOverview && _ckchOverview.sessions) {
        activeSession = _ckchOverview.sessions.find(function(s) {
            var sDate = s.start_date ? s.start_date.split('T')[0] : (s.meeting_date ? s.meeting_date.split('T')[0] : '');
            var eDate = s.end_date ? s.end_date.split('T')[0] : '';
            if (!eDate && sDate) {
                var ed = new Date(sDate);
                ed.setDate(ed.getDate() + 7);
                eDate = ed.toISOString().split('T')[0];
            }
            return (!sDate || today >= sDate) && (!eDate || today <= eDate);
        });
    }

    var defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 7);
    var defaultEndStr = defaultEnd.toISOString().split('T')[0];

    var overlay = document.createElement('div');
    overlay.id = 'ckchCreateSessionOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var h = '<div style="background:#fff;border-radius:16px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden">';
    h += '<div style="padding:16px 20px;background:linear-gradient(135deg,#1e293b,#312e81);color:#fff;display:flex;align-items:center;justify-content:space-between">';
    h += '<h3 style="margin:0;font-size:16px;font-weight:800">➕ Tạo Cuộc Họp Mới</h3>';
    h += '<button onclick="document.getElementById(\'ckchCreateSessionOverlay\').remove()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer">✕</button>';
    h += '</div>';
    h += '<div style="padding:20px">';

    if (activeSession) {
        h += '<div style="margin-bottom:14px;padding:14px;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;color:#991b1b;font-size:12px;font-weight:700;line-height:1.5">';
        h += '⚠️ <b>CẢNH BÁO TẠO CUỘC HỌP</b><br>';
        h += 'Cuộc họp <b>"' + activeSession.title + '"</b> hiện tại chưa được đóng.<br>';
        h += '<span style="font-weight:500;color:#7f1d1d">Vui lòng bấm nút <b>"🔒 Đóng Cuộc Họp"</b> tại cuộc họp hiện tại trước khi tạo cuộc họp mới!</span>';
        h += '</div>';
    }

    h += '<div style="margin-bottom:14px"><label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">Tiêu đề cuộc họp (Tự động & Khóa)</label>';
    h += '<input class="ckch-search-input" id="ckchNewTitle" value="' + (activeSession ? activeSession.title : 'Đang tính...') + '" readonly style="width:100%;background:#f1f5f9;cursor:not-allowed;font-weight:700;color:#1e293b;padding:10px;border:1px solid #cbd5e1"></div>';

    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">';
    h += '<div><label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">🚀 Thời gian mở (Từ ngày)</label>';
    h += '<input class="ckch-search-input" type="date" id="ckchNewDate" value="' + today + '" ' + (activeSession ? 'disabled' : '') + ' style="width:100%;color:#1e293b;background:' + (activeSession ? '#f1f5f9' : '#fff') + ';border:1px solid #cbd5e1;padding:10px" onchange="_ckchOnStartDateChange(this.value)"></div>';
    h += '<div><label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">🔒 Thời gian đóng (Đến ngày)</label>';
    h += '<input class="ckch-search-input" type="date" id="ckchNewEndDate" value="' + defaultEndStr + '" ' + (activeSession ? 'disabled' : '') + ' style="width:100%;color:#1e293b;background:' + (activeSession ? '#f1f5f9' : '#fff') + ';border:1px solid #cbd5e1;padding:10px"></div>';
    h += '</div>';

    h += '<div style="font-size:11px;color:#64748b;background:#f8fafc;padding:8px 12px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:10px">💡 Mặc định cuộc họp sẽ đóng sau 7 ngày kể từ ngày mở. Bạn có thể chọn chỉnh sửa lại ngày đóng nếu cần.</div>';

    h += '</div>';
    h += '<div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px">';
    h += '<button onclick="document.getElementById(\'ckchCreateSessionOverlay\').remove()" style="padding:8px 16px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:12px;font-weight:700;cursor:pointer">Đóng</button>';
    if (!activeSession) {
        h += '<button onclick="_ckchSaveNewSession()" style="padding:8px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.3)">Tạo Cuộc Họp</button>';
    }
    h += '</div></div>';

    overlay.innerHTML = h;
    document.body.appendChild(overlay);
    if (!activeSession) _ckchCalcAutoTitle();
};

window._ckchSaveNewSession = async function() {
    var title = document.getElementById('ckchNewTitle').value.trim();
    var sDate = document.getElementById('ckchNewDate').value;
    var eDate = document.getElementById('ckchNewEndDate').value;
    if(!title || title === 'Đang tính...') return alert('Vui lòng chờ tính tiêu đề cuộc họp');
    if(!sDate) return alert('Vui lòng chọn thời gian mở');
    if(!eDate) return alert('Vui lòng chọn thời gian đóng');
    try {
        await apiCall('/api/meeting-commitments/sessions', 'POST', { title: title, meeting_date: sDate, start_date: sDate, end_date: eDate, source: 'camketcuochop' });
        var overlay = document.getElementById('ckchCreateSessionOverlay');
        if(overlay) overlay.remove();
        showToast('✅ Tạo cuộc họp thành công!', 'success');
        _ckchLoadContent();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

async function _ckchOpenPermissions() {
    try {
        var res = await apiCall('/api/meeting-commitments/permissions');
        _ckchPermData = res.permissions || [];
    } catch(e) { _ckchPermData = []; }

    var overlay = document.createElement('div');
    overlay.id = 'ckchPermOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var html = '<div style="background:#fff;border-radius:16px;width:700px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">';
    html += '<div style="padding:20px 24px;background:linear-gradient(135deg,#1e293b,#334155);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:between">';
    html += '<div style="flex:1"><h3 style="margin:0;color:#fff;font-size:18px;font-weight:900">⚙️ Cài Đặt Quyền Cuộc Họp</h3><div style="color:#94a3b8;font-size:12px;margin-top:4px">Chọn role được phép thực hiện từng chức năng</div></div>';
    html += '<button onclick="document.getElementById(\'ckchPermOverlay\').remove()" style="background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:4px">✕</button>';
    html += '</div>';
    html += '<div style="padding:24px">';

    for (var s = 0; s < _ckchSources.length; s++) {
        var src = _ckchSources[s];
        html += '<div style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">';
        html += '<div style="padding:12px 16px;background:linear-gradient(135deg,' + (s===0?'#4338ca,#6366f1':'#0891b2,#06b6d4') + ');color:#fff;font-size:14px;font-weight:800">' + src.label + '</div>';

        for (var p = 0; p < _ckchPermTypes.length; p++) {
            var pt = _ckchPermTypes[p];
            var perm = _ckchPermData.find(function(x) { return x.source === src.value && x.permission_type === pt.value; });
            var activeRoles = perm ? perm.allowed_roles.split(',') : ['giam_doc'];

            html += '<div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:12px;flex-wrap:wrap">';
            html += '<div style="min-width:140px;font-size:13px;font-weight:700;color:#1e293b">' + pt.icon + ' ' + pt.label + '</div>';
            html += '<div style="display:flex;gap:6px;flex-wrap:wrap">';

            for (var r = 0; r < _ckchAllRoles.length; r++) {
                var role = _ckchAllRoles[r];
                var checked = activeRoles.indexOf(role.value) >= 0;
                var checkId = 'perm_' + src.value + '_' + pt.value + '_' + role.value;
                html += '<label style="display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;border:1px solid ' + (checked ? '#6366f1' : '#e5e7eb') + ';background:' + (checked ? '#eef2ff' : '#fff') + ';cursor:pointer;font-size:11px;font-weight:600;color:' + (checked ? '#4338ca' : '#6b7280') + ';transition:all .15s">';
                html += '<input type="checkbox" id="' + checkId + '" ' + (checked ? 'checked' : '') + ' style="accent-color:#6366f1" onchange="_ckchToggleRoleStyle(this)">';
                html += role.label + '</label>';
            }
            html += '</div></div>';
        }
        html += '</div>';
    }

    html += '</div>';
    html += '<div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px">';
    html += '<button onclick="document.getElementById(\'ckchPermOverlay\').remove()" style="padding:10px 20px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:13px;font-weight:700;cursor:pointer">Hủy</button>';
    html += '<button onclick="_ckchSavePermissions()" style="padding:10px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.3)">💾 Lưu Cài Đặt</button>';
    html += '</div></div>';

    overlay.innerHTML = html;
    document.body.appendChild(overlay);
}

window._ckchToggleRoleStyle = function(cb) {
    var lbl = cb.parentElement;
    if (cb.checked) {
        lbl.style.borderColor = '#6366f1';
        lbl.style.background = '#eef2ff';
        lbl.style.color = '#4338ca';
    } else {
        lbl.style.borderColor = '#e5e7eb';
        lbl.style.background = '#fff';
        lbl.style.color = '#6b7280';
    }
};

window._ckchSavePermissions = async function() {
    var perms = [];
    for (var s = 0; s < _ckchSources.length; s++) {
        var src = _ckchSources[s];
        for (var p = 0; p < _ckchPermTypes.length; p++) {
            var pt = _ckchPermTypes[p];
            var roles = [];
            for (var r = 0; r < _ckchAllRoles.length; r++) {
                var role = _ckchAllRoles[r];
                var cb = document.getElementById('perm_' + src.value + '_' + pt.value + '_' + role.value);
                if (cb && cb.checked) roles.push(role.value);
            }
            if (roles.length === 0) roles = ['giam_doc'];
            perms.push({ source: src.value, permission_type: pt.value, allowed_roles: roles.join(',') });
        }
    }
    try {
        await apiCall('/api/meeting-commitments/permissions', 'PUT', { permissions: perms });
        showToast('✅ Đã lưu cài đặt quyền thành công!', 'success');
        var overlay = document.getElementById('ckchPermOverlay');
        if (overlay) overlay.remove();
    } catch(e) {
        alert('Lỗi: ' + (e.message || ''));
    }
};

// ===== RECORD COMMITMENT MODAL FOR MEMBER / TEAM =====
window._ckchToggleTargetInput = function(chkEl) {
    var card = chkEl.closest('.ckch-record-item-row');
    if (!card) return;
    var targetBox = card.querySelector('.ckch-rec-target-box');
    if (!targetBox) return;
    if (chkEl.checked) {
        targetBox.style.display = 'flex';
    } else {
        targetBox.style.display = 'none';
        var input = targetBox.querySelector('.ckch-rec-target');
        if (input) input.value = 0;
    }
};

// ===== RECORD COMMITMENT MODAL FOR MEMBER / TEAM (Image 1 Format) =====
function _ckchBuildRecordCardHTML(index, questionText, answerText, targetValue, canDelete) {
    var hasTarget = (parseFloat(targetValue) > 0);
    var h = '<div class="ckch-record-item-row" style="margin-bottom:16px;padding:16px;border:1.5px solid #e0e7ff;border-radius:14px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.02)">';
    
    // Header STT (Image 1 style)
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
    h += '<div style="display:flex;align-items:center;gap:8px">';
    h += '<span style="width:26px;height:26px;border-radius:50%;background:#4f46e5;color:#fff;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center">' + index + '</span>';
    h += '<span style="font-weight:800;font-size:14px;color:#1e293b">Cam kết #' + index + '</span>';
    h += '</div>';
    if (canDelete) {
        h += '<button onclick="this.closest(\'.ckch-record-item-row\').remove()" style="width:24px;height:24px;border-radius:50%;background:#fee2e2;border:none;color:#ef4444;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>';
    }
    h += '</div>';

    // Question Section:
    // If questionText exists -> Preset Banner
    // If questionText is empty -> Editable Textarea (Image 2 style: 📋 CÂU HỎI / NỘI DUNG *)
    if (questionText) {
        var cleanQ = (questionText || '').replace(/^❓\s*/, '').trim();
        var qDisplay = '❓ Câu Hỏi ' + index + ' : ' + (cleanQ ? cleanQ : ('Cam kết #' + index));
        h += '<div style="background:#eef2ff;border-radius:10px;padding:12px 14px;margin-bottom:12px">';
        h += '<div style="font-size:11px;font-weight:800;color:#4f46e5;letter-spacing:0.5px;margin-bottom:4px">📋 CÂU HỎI</div>';
        h += '<div style="font-size:13px;font-weight:700;color:#1e293b" class="ckch-rec-q-banner" data-q="' + (questionText || '').replace(/"/g, '&quot;') + '">' + qDisplay + '</div>';
        h += '</div>';
    } else {
        h += '<div style="margin-bottom:12px">';
        h += '<div style="font-size:11px;font-weight:800;color:#4f46e5;letter-spacing:0.5px;margin-bottom:6px">📋 CÂU HỎI / NỘI DUNG *</div>';
        h += '<textarea class="ckch-rec-q-input" placeholder="VD: Mục tiêu bạn đặt ra cho giai đoạn tới?" style="width:100%;height:65px;padding:10px 12px;border:1.5px solid #c7d2fe;border-radius:10px;font-size:13px;outline:none;resize:vertical;font-family:inherit;background:#eff6ff;color:#1e293b"></textarea>';
        h += '</div>';
    }

    // Answer Input Section (Image 1 style: ✍️ CÂU TRẢ LỜI / CAM KẾT *)
    h += '<div style="margin-bottom:12px">';
    h += '<div style="font-size:11px;font-weight:800;color:#16a34a;letter-spacing:0.5px;margin-bottom:6px">✍️ CÂU TRẢ LỜI / CAM KẾT *</div>';
    h += '<textarea class="ckch-rec-content" placeholder="Nhập câu trả lời, cam kết cụ thể..." style="width:100%;height:75px;padding:10px 12px;border:1.5px solid #bbf7d0;border-radius:10px;font-size:13px;outline:none;resize:vertical;font-family:inherit">' + (answerText || '') + '</textarea>';
    h += '</div>';

    // Target Checkbox & Target Input Box (Image 1, 2, 3 style)
    h += '<div>';
    h += '<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:#b45309;cursor:pointer">';
    h += '<input type="checkbox" class="ckch-rec-has-target" ' + (hasTarget ? 'checked' : '') + ' onchange="_ckchToggleTargetInput(this)" style="width:16px;height:16px;accent-color:#4f46e5"> 💰 Có mục tiêu';
    h += '</label>';
    
    h += '<div class="ckch-rec-target-box" style="display:' + (hasTarget ? 'flex' : 'none') + ';align-items:center;gap:8px;padding:8px 14px;border:1.5px solid #fef08a;border-radius:10px;background:#fff;margin-top:8px">';
    h += '<span style="font-size:12px;font-weight:800;color:#b45309">💰 Mục tiêu:</span>';
    h += '<input type="number" class="ckch-rec-target" value="' + (targetValue || 0) + '" placeholder="0" style="width:160px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;font-weight:800;color:#1e293b">';
    h += '</div>';
    h += '</div>';

    h += '</div>';
    return h;
}

window._ckchOpenMemberRecordModal = async function(sid, uid, uname, isTeamTpl, deptId) {
    var data = _ckchSessionCache[sid];
    var commits = (data && data.commitments) ? data.commitments : [];
    var session = (data && data.session) ? data.session : (_ckchOverview && _ckchOverview.sessions ? _ckchOverview.sessions.find(function(s){ return s.id == sid; }) : null);

    // Get department name
    var deptName = 'PHÒNG BAN';
    var targetDeptId = deptId || uid;
    if (_ckchOrg && _ckchOrg.departments) {
        var dObj = _ckchOrg.departments.find(function(d){ return d.id == targetDeptId; });
        if (dObj) deptName = dObj.name;
    }

    if (targetDeptId && sid) {
        if (!window._ckchBlockStates) window._ckchBlockStates = {};
        window._ckchBlockStates['ckchDeptBlock_' + sid + '_' + targetDeptId] = true;
        if (!window._ckchOpenSessions) window._ckchOpenSessions = {};
        window._ckchOpenSessions[sid] = true;
    }

    // Format date string for subtitle: THÁNG 08/2026 (01/08/2026)
    var mStr = '08/2026', dStr = '01/08/2026';
    if (session && session.meeting_date) {
        var dt = new Date(session.meeting_date);
        var m = String(dt.getMonth() + 1).padStart(2, '0');
        var y = dt.getFullYear();
        var d = String(dt.getDate()).padStart(2, '0');
        mStr = m + '/' + y;
        dStr = d + '/' + m + '/' + y;
    } else {
        var mVal = document.getElementById('ckchMonth') ? document.getElementById('ckchMonth').value : (new Date().getMonth() + 1);
        var yVal = document.getElementById('ckchYear') ? document.getElementById('ckchYear').value : new Date().getFullYear();
        mStr = String(mVal).padStart(2, '0') + '/' + yVal;
        dStr = '01/' + mStr;
    }

    var userItems = commits.filter(function(c) {
        if (isTeamTpl) return !!c.department_id && c.department_id == (deptId || uid);
        return !c.department_id && c.user_id == uid;
    });

    var itemRows = [];
    if (userItems.length > 0) {
        itemRows = userItems.map(function(c) {
            var parts = (c.content || '').split('✅');
            var q = parts[0] ? parts[0].trim() : '';
            var a = parts.length > 1 ? parts.slice(1).join('✅').trim() : '';
            if (!parts[1] && !c.content.includes('✅')) {
                a = c.content;
                q = c.question_content || '';
            }
            return { question: q, content: a, target_revenue: c.target_revenue || 0 };
        });
    } else {
        try {
            var pageKey = 'dept_' + targetDeptId + '_' + (isTeamTpl ? 'team' : 'personal');
            var tRes = await apiCall('/api/meeting-commitments/templates?page=' + pageKey);
            if (tRes && tRes.templates && tRes.templates.length > 0) {
                itemRows = tRes.templates.map(function(t) {
                    return { question: t.question_content, content: '', target_revenue: 0, has_target: t.has_revenue_target };
                });
            }
        } catch(e) {}
        if (itemRows.length === 0) itemRows = [{ question: '', content: '', target_revenue: 0 }];
    }

    var overlay = document.createElement('div');
    overlay.id = 'ckchRecordOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var h = '<div style="background:#fff;border-radius:16px;width:650px;max-width:95vw;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">';
    
    // Header (Image 1 style)
    h += '<div style="padding:18px 24px;border-bottom:1px solid #f1f5f9;position:relative">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between">';
    h += '<h3 style="margin:0;font-size:17px;font-weight:900;color:#1e293b">📝 Cam Kết — ' + uname + '</h3>';
    h += '<button onclick="document.getElementById(\'ckchRecordOverlay\').remove()" style="background:none;border:none;color:#94a3b8;font-size:22px;cursor:pointer">✕</button>';
    h += '</div>';
    h += '<div style="font-size:12px;font-weight:800;color:#b45309;margin-top:3px">— ' + deptName.toUpperCase() + ' - THÁNG ' + mStr + ' (' + dStr + ')</div>';
    h += '</div>';

    h += '<div style="padding:20px">';
    h += '<div id="ckchRecordItemsContainer">';

    for (var i = 0; i < itemRows.length; i++) {
        var item = itemRows[i];
        h += _ckchBuildRecordCardHTML(i + 1, item.question, item.content, item.target_revenue, itemRows.length > 1);
    }
    h += '</div>';

    h += '<button onclick="_ckchAddRecordItemRow()" style="width:100%;padding:12px;border:none;border-radius:12px;background:#f3f4f6;color:#4f46e5;font-size:13px;font-weight:800;cursor:pointer;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:6px">➕ Thêm cam kết</button>';

    h += '</div>';
    h += '<div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px">';
    h += '<button onclick="document.getElementById(\'ckchRecordOverlay\').remove()" style="padding:8px 18px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:12px;font-weight:700;cursor:pointer">Hủy</button>';
    h += '<button onclick="_ckchSaveMemberRecord(' + sid + ', ' + uid + ', ' + isTeamTpl + ', ' + (deptId || 0) + ')" style="padding:8px 22px;border-radius:10px;border:none;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.3)">💾 Lưu Cam Kết</button>';
    h += '</div></div>';

    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

window._ckchAddRecordItemRow = function() {
    var container = document.getElementById('ckchRecordItemsContainer');
    if (!container) return;
    var count = container.querySelectorAll('.ckch-record-item-row').length + 1;
    var cardHTML = _ckchBuildRecordCardHTML(count, '', '', 0, true);
    var div = document.createElement('div');
    div.innerHTML = cardHTML;
    container.appendChild(div.firstElementChild);
};

window._ckchSaveMemberRecord = async function(sid, uid, isTeamTpl, deptId) {
    var container = document.getElementById('ckchRecordItemsContainer');
    if (!container) return;
    var rows = container.querySelectorAll('.ckch-record-item-row');
    var items = [];
    rows.forEach(function(row) {
        var qText = '';
        var qBanner = row.querySelector('.ckch-rec-q-banner');
        if (qBanner) {
            qText = qBanner.getAttribute('data-q') || qBanner.textContent.trim();
        } else {
            var qInput = row.querySelector('.ckch-rec-q-input');
            if (qInput) qText = qInput.value.trim();
        }

        var aText = row.querySelector('.ckch-rec-content').value.trim();
        var target = 0;
        var hasTargetChk = row.querySelector('.ckch-rec-has-target');
        if (hasTargetChk && hasTargetChk.checked) {
            target = parseFloat(row.querySelector('.ckch-rec-target').value) || 0;
        }

        var fullContent = qText ? (qText + ' ✅ ' + aText) : aText;
        if (fullContent.trim()) {
            items.push({ content: fullContent, target_revenue: target });
        }
    });

    if (items.length === 0) return alert('Vui lòng nhập ít nhất 1 nội dung cam kết');

    try {
        var payload = { session_id: sid, items: items };
        if (isTeamTpl) payload.department_id = deptId || uid;
        else payload.user_id = uid;

        var lastScrollY = window.scrollY;

        await apiCall('/api/meeting-commitments', 'POST', payload);
        _ckchSessionCache = {};
        var overlay = document.getElementById('ckchRecordOverlay');
        if (overlay) overlay.remove();
        showToast('✅ Đã lưu cam kết thành công!', 'success');

        var targetDeptId = deptId || uid;
        if (targetDeptId && sid) {
            if (!window._ckchBlockStates) window._ckchBlockStates = {};
            window._ckchBlockStates['ckchDeptBlock_' + sid + '_' + targetDeptId] = true;
            if (!window._ckchOpenSessions) window._ckchOpenSessions = {};
            window._ckchOpenSessions[sid] = true;
        }

        await _ckchLoadContent();
        await _ckchToggleSession(sid, true);
        window.scrollTo({ top: lastScrollY, behavior: 'instant' });
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

window._ckchUpdateRevPct = function(inputEl, targetRev) {
    var val = parseFloat(inputEl.value) || 0;
    var pct = targetRev > 0 ? Math.round(100 * val / targetRev) : 0;
    if (pct > 100) pct = 100;
    if (pct < 0) pct = 0;
    var outEl = inputEl.parentElement.querySelector('.ckch-rev-pct-out');
    if (outEl) outEl.value = pct + '%';
};

// ===== REVIEW / SCORE COMMITMENT MODAL FOR MEMBER / TEAM =====
window._ckchOpenMemberReviewModal = function(sid, uid, uname, isTeamTpl, deptId) {
    var data = _ckchSessionCache[sid];
    var commits = (data && data.commitments) ? data.commitments : [];
    var session = (data && data.session) ? data.session : (_ckchOverview && _ckchOverview.sessions ? _ckchOverview.sessions.find(function(s){ return s.id == sid; }) : null);
    var targetDeptId = deptId || uid;

    // Get department name
    var deptName = 'PHÒNG BAN';
    if (_ckchOrg && _ckchOrg.departments) {
        var dObj = _ckchOrg.departments.find(function(d){ return d.id == targetDeptId; });
        if (dObj) deptName = dObj.name;
    }

    // Format date string for subtitle: THÁNG 08/2026 (01/08/2026)
    var mStr = '08/2026', dStr = '01/08/2026';
    if (session && session.meeting_date) {
        var dt = new Date(session.meeting_date);
        var m = String(dt.getMonth() + 1).padStart(2, '0');
        var y = dt.getFullYear();
        var d = String(dt.getDate()).padStart(2, '0');
        mStr = m + '/' + y;
        dStr = d + '/' + m + '/' + y;
    } else {
        var mVal = document.getElementById('ckchMonth') ? document.getElementById('ckchMonth').value : (new Date().getMonth() + 1);
        var yVal = document.getElementById('ckchYear') ? document.getElementById('ckchYear').value : new Date().getFullYear();
        mStr = String(mVal).padStart(2, '0') + '/' + yVal;
        dStr = '01/' + mStr;
    }
    
    if (targetDeptId && sid) {
        if (!window._ckchBlockStates) window._ckchBlockStates = {};
        window._ckchBlockStates['ckchDeptBlock_' + sid + '_' + targetDeptId] = true;
        if (!window._ckchOpenSessions) window._ckchOpenSessions = {};
        window._ckchOpenSessions[sid] = true;
        window._ckchLastReviewDeptId = targetDeptId;
    }

    var userItems = commits.filter(function(c) {
        if (isTeamTpl) return !!c.department_id && c.department_id == (deptId || uid);
        return !c.department_id && c.user_id == uid;
    });

    if (userItems.length === 0) {
        return alert('Nhân viên / Team này chưa có cam kết nào để review! Vui lòng bấm nút "✍️ Ghi" để thêm cam kết trước.');
    }

    var overlay = document.createElement('div');
    overlay.id = 'ckchReviewOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var h = '<div style="background:#fff;border-radius:16px;width:660px;max-width:95vw;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">';
    
    // Header (Image 1 style)
    h += '<div style="padding:18px 24px;border-bottom:1px solid #f1f5f9;position:relative">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between">';
    h += '<h3 style="margin:0;font-size:17px;font-weight:900;color:#1e293b">📝 Review Cam Kết — ' + uname + '</h3>';
    h += '<button onclick="document.getElementById(\'ckchReviewOverlay\').remove()" style="background:none;border:none;color:#94a3b8;font-size:22px;cursor:pointer">✕</button>';
    h += '</div>';
    h += '<div style="font-size:12px;font-weight:800;color:#b45309;margin-top:3px">— ' + deptName.toUpperCase() + ' - THÁNG ' + mStr + ' (' + dStr + ')</div>';
    h += '</div>';

    h += '<div style="padding:20px">';

    for (var i = 0; i < userItems.length; i++) {
        var item = userItems[i];
        var parts = (item.content || '').split('✅');
        var questionText = parts[0] ? parts[0].trim() : '';
        var answerText = parts.length > 1 ? parts.slice(1).join('✅').trim() : '';
        if (!parts[1] && !item.content.includes('✅')) {
            answerText = item.content;
            questionText = item.question_content || '';
        }
        var targetRev = item.target_revenue || 0;
        var pct = item.completion_pct || 0;
        var actualVal = targetRev > 0 ? Math.round(targetRev * pct / 100) : '';

        h += '<div class="ckch-review-item-row" data-commit-id="' + item.id + '" data-target-rev="' + targetRev + '" style="margin-bottom:16px;border:1.5px solid #cbd5e1;border-radius:14px;background:#fff;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,.03)">';
        
        // Item Badge & Title (Image 1 style)
        h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">';
        h += '<span style="width:24px;height:24px;border-radius:50%;background:#4338ca;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:900">' + (i + 1) + '</span>';
        h += '<span style="font-size:14px;font-weight:900;color:#312e81">Cam kết #' + (i + 1) + '</span>';
        h += '</div>';

        // 📋 CÂU HỎI Banner
        if (questionText) {
            var cleanQ = (questionText || '').replace(/^❓\s*/, '').trim();
            var qDisplay = '❓ Câu Hỏi Cam Kết ' + (i + 1) + ' : ' + (cleanQ ? cleanQ : ('Cam kết #' + (i + 1)));
            h += '<div style="background:#eef2ff;border-radius:10px;padding:12px 14px;margin-bottom:10px">';
            h += '<div style="font-size:11px;font-weight:800;color:#4f46e5;letter-spacing:0.5px;margin-bottom:4px">📋 CÂU HỎI</div>';
            h += '<div style="font-size:13px;font-weight:700;color:#1e293b">' + qDisplay + '</div>';
            h += '</div>';
        }

        // ✍️ CÂU TRẢ LỜI Banner
        h += '<div style="background:#ecfdf5;border:1.5px solid #bbf7d0;border-radius:10px;padding:12px 14px;margin-bottom:10px">';
        h += '<div style="font-size:11px;font-weight:800;color:#16a34a;letter-spacing:0.5px;margin-bottom:4px">✍️ CÂU TRẢ LỜI</div>';
        h += '<div style="font-size:13px;font-weight:700;color:#1e293b">' + (answerText || 'Chưa có nội dung') + '</div>';
        h += '</div>';

        // 🎯 Mục tiêu Banner (if targetRev > 0)
        if (targetRev > 0) {
            h += '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:1.5px solid #fef08a;border-radius:10px;background:#fef9c3;margin-bottom:10px">';
            h += '<span style="font-size:12px;font-weight:800;color:#b45309">🎯 Mục tiêu:</span>';
            h += '<span style="font-size:14px;font-weight:900;color:#b45309">' + targetRev.toLocaleString('vi-VN') + '</span>';
            h += '</div>';

            // 📊 Đã đạt: Input & %
            h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">';
            h += '<span style="font-size:12px;font-weight:800;color:#4338ca;min-width:60px">📊 Đã đạt:</span>';
            h += '<input type="number" class="ckch-rev-actual-val" value="' + actualVal + '" placeholder="Nhập số liệu hoàn thành..." style="flex:1;padding:9px 12px;border:1.5px solid #c7d2fe;border-radius:10px;font-size:13px;font-weight:700;color:#1e293b" oninput="_ckchUpdateRevPct(this, ' + targetRev + ')">';
            h += '<output class="ckch-rev-pct-out" style="font-size:13px;font-weight:900;color:#4338ca;width:48px;text-align:right">' + pct + '%</output>';
            h += '</div>';
        } else {
            // 📊 Tiến độ: Slider & %
            h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">';
            h += '<span style="font-size:12px;font-weight:800;color:#4338ca;min-width:60px">📊 Tiến độ:</span>';
            h += '<input type="range" class="ckch-rev-pct-range" value="' + pct + '" min="0" max="100" style="flex:1;accent-color:#4338ca" oninput="this.nextElementSibling.value = this.value + \'%\'">';
            h += '<output style="font-size:13px;font-weight:900;color:#4338ca;width:48px;text-align:right">' + pct + '%</output>';
            h += '</div>';
        }

        // ✍️ TRAO ĐỔI KẾT QUẢ Box
        h += '<div style="background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:10px;padding:12px 14px">';
        h += '<div style="font-size:11px;font-weight:800;color:#16a34a;letter-spacing:0.5px;margin-bottom:6px">✍️ TRAO ĐỔI KẾT QUẢ</div>';
        h += '<input type="text" class="ckch-rev-note" value="' + (item.review_note || '').replace(/"/g, '&quot;') + '" placeholder="Nhập nội dung trao đổi kết quả..." style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;background:#ffffff">';
        h += '</div>';

        h += '</div>';
    }

    h += '</div>';
    h += '<div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px">';
    h += '<button onclick="document.getElementById(\'ckchReviewOverlay\').remove()" style="padding:9px 20px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:12px;font-weight:800;cursor:pointer">Hủy</button>';
    h += '<button onclick="_ckchSaveMemberReview(' + sid + ')" style="padding:9px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.3)">💾 Lưu Review</button>';
    h += '</div></div>';

    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

window._ckchSaveMemberReview = async function(sid) {
    var overlay = document.getElementById('ckchReviewOverlay');
    if (!overlay) return;
    var rows = overlay.querySelectorAll('.ckch-review-item-row');
    var reviews = [];
    rows.forEach(function(row) {
        var id = parseInt(row.getAttribute('data-commit-id'));
        var targetRev = parseFloat(row.getAttribute('data-target-rev')) || 0;
        var pct = 0;

        var actualInput = row.querySelector('.ckch-rev-actual-val');
        if (actualInput && targetRev > 0) {
            var actualVal = parseFloat(actualInput.value) || 0;
            pct = Math.round(100 * actualVal / targetRev);
            if (pct < 0) pct = 0;
            if (pct > 100) pct = 100;
        } else {
            var rangeInput = row.querySelector('.ckch-rev-pct-range');
            if (rangeInput) pct = parseInt(rangeInput.value) || 0;
        }

        var note = row.querySelector('.ckch-rev-note').value.trim();
        var isDone = pct >= 100;
        if (id) reviews.push({ id: id, completion_pct: pct, is_completed: isDone, review_note: note });
    });
    if (reviews.length === 0) return;

    try {
        var lastScrollY = window.scrollY;
        await apiCall('/api/meeting-commitments/batch-review', 'PUT', { reviews: reviews });
        _ckchSessionCache = {};
        overlay.remove();
        showToast('✅ Đã lưu review chấm điểm thành công!', 'success');

        if (window._ckchLastReviewDeptId && sid) {
            if (!window._ckchBlockStates) window._ckchBlockStates = {};
            window._ckchBlockStates['ckchDeptBlock_' + sid + '_' + window._ckchLastReviewDeptId] = true;
            if (!window._ckchOpenSessions) window._ckchOpenSessions = {};
            window._ckchOpenSessions[sid] = true;
        }

        await _ckchLoadContent();
        await _ckchToggleSession(sid, true);
        window.scrollTo({ top: lastScrollY, behavior: 'instant' });
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

// ===== MANAGE PARTICIPATING DEPARTMENTS FOR A SESSION =====
window._ckchOpenManageSessionDeptsModal = async function(sid, title) {
    var depts = (_ckchOrg && _ckchOrg.departments) ? _ckchOrg.departments : [];
    
    // Root systems (parent_id IS NULL or 0)
    var rootSystems = depts.filter(function(d){ return !d.parent_id || d.parent_id === 0; });

    // Working departments are level 1 (where parent_id is not null)
    var actualDepts = depts.filter(function(d){ return !!d.parent_id; });
    if (actualDepts.length === 0) actualDepts = depts;

    var registeredIds = [];
    try {
        var res = await apiCall('/api/meeting-commitments/sessions/' + sid);
        if (res && res.registeredDepts) {
            registeredIds = res.registeredDepts.map(function(d) { return d.id; });
        }
    } catch(e) {}

    var overlay = document.createElement('div');
    overlay.id = 'ckchManageDeptsOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var h = '<div style="background:#fff;border-radius:16px;width:660px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">';
    h += '<div style="padding:16px 20px;background:linear-gradient(135deg,#312e81,#4338ca);color:#fff;display:flex;align-items:center;justify-content:space-between;border-radius:16px 16px 0 0">';
    h += '<div><h3 style="margin:0;font-size:16px;font-weight:800">🏢 Chọn Phòng Ban Tham Gia Cuộc Họp</h3><div style="font-size:12px;opacity:.8;margin-top:2px">' + title + '</div></div>';
    h += '<button onclick="document.getElementById(\'ckchManageDeptsOverlay\').remove()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer">✕</button>';
    h += '</div>';
    h += '<div style="padding:20px">';

    h += '<div style="font-size:12px;color:#475569;font-weight:700;margin-bottom:14px">Tích chọn các phòng ban sẽ tham gia và thực hiện cam kết trong cuộc họp này:</div>';

    if (rootSystems.length > 0) {
        for (var rs = 0; rs < rootSystems.length; rs++) {
            var sys = rootSystems[rs];
            var sysDepts = actualDepts.filter(function(d){ return d.parent_id === sys.id; });
            var masterDeptOrder = [10, 4, 1, 6, 5, 16, 17, 19, 11, 8, 12, 13, 14, 15, 18];
            sysDepts.sort(function(a, b){
                var ia = masterDeptOrder.indexOf(a.id);
                var ib = masterDeptOrder.indexOf(b.id);
                if (ia === -1) ia = 999;
                if (ib === -1) ib = 999;
                return ia - ib;
            });
            if (sysDepts.length === 0) continue;

            h += '<div style="margin-bottom:16px;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px;background:#f8fafc">';
            h += '<div style="font-size:13px;font-weight:900;color:#1e293b;margin-bottom:10px;display:flex;align-items:center;gap:6px;padding-bottom:6px;border-bottom:1px solid #e2e8f0">🏛️ ' + sys.name.toUpperCase() + '</div>';
            h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';

            for (var i = 0; i < sysDepts.length; i++) {
                var d = sysDepts[i];
                var isChecked = registeredIds.indexOf(d.id) >= 0;
                h += '<label style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;border:1.5px solid ' + (isChecked ? '#6366f1' : '#cbd5e1') + ';background:' + (isChecked ? '#eef2ff' : '#fff') + ';cursor:pointer;font-size:12px;font-weight:700;color:' + (isChecked ? '#4338ca' : '#334155') + ';transition:all .15s">';
                h += '<input type="checkbox" class="ckch-dept-cb" value="' + d.id + '" ' + (isChecked ? 'checked' : '') + ' style="accent-color:#6366f1;width:16px;height:16px" onchange="_ckchToggleDeptCbStyle(this)">';
                h += '<span>📁 ' + d.name + '</span>';
                h += '</label>';
            }
            h += '</div></div>';
        }
    } else {
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">';
        for (var i = 0; i < actualDepts.length; i++) {
            var d = actualDepts[i];
            var isChecked = registeredIds.indexOf(d.id) >= 0;
            h += '<label style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;border:1.5px solid ' + (isChecked ? '#6366f1' : '#cbd5e1') + ';background:' + (isChecked ? '#eef2ff' : '#fff') + ';cursor:pointer;font-size:12px;font-weight:700;color:' + (isChecked ? '#4338ca' : '#334155') + ';transition:all .15s">';
            h += '<input type="checkbox" class="ckch-dept-cb" value="' + d.id + '" ' + (isChecked ? 'checked' : '') + ' style="accent-color:#6366f1;width:16px;height:16px" onchange="_ckchToggleDeptCbStyle(this)">';
            h += '<span>📁 ' + d.name + '</span>';
            h += '</label>';
        }
        h += '</div>';
    }

    h += '</div>';
    h += '<div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px">';
    h += '<button onclick="document.getElementById(\'ckchManageDeptsOverlay\').remove()" style="padding:8px 16px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:12px;font-weight:700;cursor:pointer">Hủy</button>';
    h += '<button onclick="_ckchSaveSessionDepts(' + sid + ')" style="padding:8px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.3)">💾 Lưu Bộ Phận Tham Gia</button>';
    h += '</div></div>';

    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

window._ckchToggleDeptCbStyle = function(cb) {
    var lbl = cb.parentElement;
    if (cb.checked) {
        lbl.style.borderColor = '#6366f1';
        lbl.style.background = '#eef2ff';
        lbl.style.color = '#4338ca';
    } else {
        lbl.style.borderColor = '#e2e8f0';
        lbl.style.background = '#fff';
        lbl.style.color = '#334155';
    }
};

window._ckchSaveSessionDepts = async function(sid) {
    var overlay = document.getElementById('ckchManageDeptsOverlay');
    if (!overlay) return;
    var cbs = overlay.querySelectorAll('.ckch-dept-cb:checked');
    var ids = [];
    cbs.forEach(function(cb) { ids.push(parseInt(cb.value)); });

    try {
        await apiCall('/api/meeting-commitments/sessions/' + sid + '/departments', 'PUT', { department_ids: ids });
        delete _ckchSessionCache[sid];
        overlay.remove();
        showToast('✅ Đã cập nhật bộ phận tham gia cuộc họp!', 'success');
        _ckchLoadContent();
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

// ===== SETUP QUESTION TEMPLATES FOR A DEPARTMENT (Images 1, 2, 3, 4) =====
window._ckchOpenDeptTemplateModal = async function(deptId, deptName, isTeam) {
    var pageKey = 'dept_' + deptId + '_' + (isTeam ? 'team' : 'personal');
    var templates = [];
    try {
        var res = await apiCall('/api/meeting-commitments/templates?page=' + pageKey);
        templates = (res && res.templates) ? res.templates : [];
    } catch(e) { templates = []; }

    var overlay = document.createElement('div');
    overlay.id = 'ckchDeptTemplateOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

    var typeTitle = isTeam ? 'Mẫu Team' : 'Mẫu Cá Nhân';

    var h = '<div style="background:#fff;border-radius:16px;width:560px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">';
    h += '<div style="padding:16px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between">';
    h += '<h3 style="margin:0;font-size:16px;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:8px">⚙️ Câu Hỏi ' + typeTitle + ' — ' + deptName + '</h3>';
    h += '<button onclick="document.getElementById(\'ckchDeptTemplateOverlay\').remove()" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer">✕</button>';
    h += '</div>';
    h += '<div style="padding:20px">';

    h += '<div style="margin-bottom:14px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;color:#166534;font-size:12px;font-weight:600;line-height:1.5">';
    h += '💡 Các câu hỏi mẫu sẽ tự động điền vào form khi bấm "✍️ Ghi" cho nhân viên/team chưa có cam kết.';
    h += '</div>';

    h += '<div id="ckchDeptTplContainer">';
    var itemRows = templates.length > 0 ? templates : [{ question_content: '', has_revenue_target: false }];
    for (var i = 0; i < itemRows.length; i++) {
        var t = itemRows[i];
        h += '<div class="ckch-dept-tpl-row" style="margin-bottom:14px;padding:14px;border:1.5px solid #e2e8f0;border-radius:12px;background:#fff;position:relative">';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
        h += '<div style="display:flex;align-items:center;gap:8px">';
        h += '<span style="width:24px;height:24px;border-radius:50%;background:#4f46e5;color:#fff;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center">' + (i + 1) + '</span>';
        h += '<span style="font-weight:800;font-size:13px;color:#1e293b">Câu hỏi #' + (i + 1) + '</span>';
        h += '</div>';
        if (i > 0) h += '<button onclick="this.closest(\'.ckch-dept-tpl-row\').remove()" style="width:22px;height:22px;border-radius:50%;background:#fee2e2;border:none;color:#ef4444;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>';
        h += '</div>';

        h += '<textarea class="ckch-tpl-q-text" placeholder="Nhập câu hỏi mẫu..." style="width:100%;height:65px;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;margin-bottom:8px;resize:vertical;font-family:inherit">' + (t.question_content || '') + '</textarea>';

        h += '<label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#475569;cursor:pointer">';
        h += '<input type="checkbox" class="ckch-tpl-target-cb" ' + (t.has_revenue_target ? 'checked' : '') + ' style="accent-color:#4f46e5;width:15px;height:15px">';
        h += 'Có ô nhập mục tiêu</label>';
        h += '</div>';
    }
    h += '</div>';

    h += '<button onclick="_ckchAddDeptTplRow()" style="width:100%;padding:10px;border:none;border-radius:10px;background:#f3f4f6;color:#4f46e5;font-size:13px;font-weight:800;cursor:pointer;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:6px">➕ Thêm câu hỏi</button>';

    h += '</div>';
    h += '<div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px">';
    h += '<button onclick="document.getElementById(\'ckchDeptTemplateOverlay\').remove()" style="padding:8px 18px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-size:12px;font-weight:700;cursor:pointer">Hủy</button>';
    h += '<button onclick="_ckchSaveDeptTemplate(' + deptId + ', ' + isTeam + ')" style="padding:8px 22px;border-radius:10px;border:none;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(99,102,241,.3)">💾 Lưu Câu Hỏi Mẫu</button>';
    h += '</div></div>';

    overlay.innerHTML = h;
    document.body.appendChild(overlay);
};

window._ckchAddDeptTplRow = function() {
    var container = document.getElementById('ckchDeptTplContainer');
    if (!container) return;
    var count = container.querySelectorAll('.ckch-dept-tpl-row').length + 1;
    var div = document.createElement('div');
    div.className = 'ckch-dept-tpl-row';
    div.style.cssText = 'margin-bottom:14px;padding:14px;border:1.5px solid #e2e8f0;border-radius:12px;background:#fff;position:relative';
    div.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
        '<div style="display:flex;align-items:center;gap:8px"><span style="width:24px;height:24px;border-radius:50%;background:#4f46e5;color:#fff;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center">' + count + '</span><span style="font-weight:800;font-size:13px;color:#1e293b">Câu hỏi #' + count + '</span></div>' +
        '<button onclick="this.closest(\'.ckch-dept-tpl-row\').remove()" style="width:22px;height:22px;border-radius:50%;background:#fee2e2;border:none;color:#ef4444;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>' +
        '</div>' +
        '<textarea class="ckch-tpl-q-text" placeholder="Nhập câu hỏi mẫu..." style="width:100%;height:65px;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;margin-bottom:8px;resize:vertical;font-family:inherit"></textarea>' +
        '<label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#475569;cursor:pointer"><input type="checkbox" class="ckch-tpl-target-cb" checked style="accent-color:#4f46e5;width:15px;height:15px">Có ô nhập mục tiêu</label>';
    container.appendChild(div);
};

window._ckchSaveDeptTemplate = async function(deptId, isTeam) {
    var overlay = document.getElementById('ckchDeptTemplateOverlay');
    if (!overlay) return;
    var rows = overlay.querySelectorAll('.ckch-dept-tpl-row');
    var items = [];
    rows.forEach(function(row) {
        var q = row.querySelector('.ckch-tpl-q-text').value.trim();
        var hasTarget = row.querySelector('.ckch-tpl-target-cb').checked;
        if (q) items.push({ question_content: q, has_revenue_target: hasTarget });
    });

    var pageKey = 'dept_' + deptId + '_' + (isTeam ? 'team' : 'personal');

    try {
        await apiCall('/api/meeting-commitments/templates', 'PUT', { page_key: pageKey, items: items });
        overlay.remove();
        showToast('✅ Đã lưu câu hỏi mẫu thành công!', 'success');
    } catch(e) { alert('Lỗi: ' + (e.message || '')); }
};

window._ckchFilterByDeptId = function(deptId) {
    var sel = document.getElementById('ckchDept');
    if (!sel) return;
    sel.value = deptId;
    _ckchLoadContent();
    if (typeof showToast === 'function') {
        var optText = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : 'bộ phận';
        showToast('🏢 Đã lọc theo: ' + optText, 'info');
    }
};

window.renderCamketcuochopPage = renderCamketcuochopPage;
