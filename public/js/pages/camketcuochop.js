// ===== CAM KẾT CUỘC HỌP — Layout 3 phần: Sidebar | Top Filter | Content =====
var _ckchOrg = null, _ckchSessionCache = {}, _ckchOpenSessions = {};
// Restore state from localStorage
var _ckchSelected = (function(){ try { var s=localStorage.getItem('ckch_selected'); return s?JSON.parse(s):{type:'all',id:null}; } catch(e){ return {type:'all',id:null}; } })();

async function renderCamketcuochopPage(content) {
    var container = content || document.getElementById('main-content');
    if (!container) return;
    var now = new Date(), curMonth = now.getMonth()+1, curYear = now.getFullYear();

    container.innerHTML = `<style>
.ckch-layout{display:flex;height:calc(100vh - 60px);overflow:hidden}
.ckch-sidebar{width:280px;min-width:280px;background:#fff;border-right:2px solid #e5e7eb;display:flex;flex-direction:column;overflow:hidden}
.ckch-sidebar-head{padding:16px;background:linear-gradient(135deg,#1e293b,#334155);color:#fff}
.ckch-sidebar-head h3{margin:0 0 10px;font-size:15px;font-weight:800}
.ckch-sidebar-search{width:100%;padding:8px 12px;border:none;border-radius:8px;font-size:12px;background:rgba(255,255,255,.12);color:#fff;outline:none}
.ckch-sidebar-search::placeholder{color:rgba(255,255,255,.5)}
.ckch-sidebar-tree{flex:1;overflow-y:auto;padding:8px}
.ckch-dept-item{margin-bottom:2px}
.ckch-dept-btn{width:100%;text-align:left;padding:8px 10px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;transition:all .15s;background:transparent;color:#334155}
.ckch-dept-btn:hover{background:#eef2ff}
.ckch-dept-btn.active{background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff}
.ckch-dept-btn.root{background:linear-gradient(135deg,#1e293b,#334155);color:#fff;font-size:13px;font-weight:800;margin-bottom:4px}
.ckch-dept-btn.root.active{background:linear-gradient(135deg,#312e81,#4338ca)}
.ckch-dept-children{padding-left:16px}
.ckch-user-btn{width:100%;text-align:left;padding:6px 10px;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;display:flex;align-items:center;gap:6px;transition:all .15s;background:transparent;color:#475569}
.ckch-user-btn:hover{background:#f1f5f9}
.ckch-user-btn.active{background:#eef2ff;color:#4338ca;font-weight:700}
.ckch-user-role{font-size:9px;color:#94a3b8;margin-left:auto;font-weight:500}
.ckch-user-btn.active .ckch-user-role{color:#6366f1}
.ckch-main{flex:1;display:flex;flex-direction:column;overflow:hidden;background:#f8fafc}
.ckch-topbar{padding:16px 24px;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ckch-topbar h2{margin:0;font-size:18px;font-weight:900;background:linear-gradient(90deg,#fbbf24,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.ckch-topbar-sub{font-size:11px;color:#94a3b8}
.ckch-filter{padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;font-size:12px;font-weight:600;cursor:pointer;outline:none}
.ckch-filter option{color:#1e293b;background:#fff}
.ckch-content{flex:1;overflow-y:auto;padding:20px 24px}
.ckch-card{background:#fff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.04);margin-bottom:16px}
.ckch-card-head{padding:14px 20px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .15s}
.ckch-card-head:hover{background:#fafbff}
.ckch-card-title{font-size:14px;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:8px}
.ckch-card-date{font-size:11px;color:#6b7280}
.ckch-pill{padding:3px 10px;border-radius:16px;font-size:10px;font-weight:700}
.ckch-card-body{padding:12px 20px 16px}
.ckch-emp-section{margin-bottom:14px;border:1px solid #f1f5f9;border-radius:10px;overflow:hidden}
.ckch-emp-head{padding:10px 14px;background:#f8fafc;font-size:13px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px;border-bottom:1px solid #f1f5f9}
.ckch-emp-role-tag{font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600}
.ckch-commit{padding:12px 16px;margin:6px 0;border-radius:8px;border-left:3px solid #e5e7eb;background:#fafbfc;font-size:12px}
.ckch-commit-done{border-left-color:#22c55e;background:#f0fdf4}
.ckch-commit-partial{border-left-color:#f59e0b;background:#fffbeb}
.ckch-commit-pending{border-left-color:#94a3b8;background:#f1f5f9}
.ckch-stt{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}
.ckch-commit-text{font-weight:600;color:#1e293b}
.ckch-commit-meta{font-size:10px;color:#6b7280;margin-top:2px}
.ckch-commit-review{font-size:10px;color:#059669;margin-top:2px;background:#ecfdf5;padding:3px 6px;border-radius:4px;font-style:italic}
.ckch-pct{font-size:16px;font-weight:900;min-width:44px;text-align:center}
.ckch-search-wrap{position:relative;flex:1;max-width:500px;display:flex;gap:6px;align-items:center}
.ckch-search-user-filter{padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.12);color:#fff;font-size:11px;font-weight:600;outline:none;cursor:pointer;min-width:100px;max-width:160px}
.ckch-search-user-filter option{color:#1e293b;background:#fff}
.ckch-search-inner{position:relative;flex:1}
.ckch-search-input{width:100%;padding:8px 14px 8px 32px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.12);color:#fff;font-size:12px;font-weight:600;outline:none;transition:all .2s;box-sizing:border-box}
.ckch-search-input::placeholder{color:rgba(255,255,255,.5)}
.ckch-search-input:focus{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.4)}
.ckch-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none}
.ckch-search-results{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#fff;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.18);max-height:360px;overflow-y:auto;z-index:100;border:1px solid #e5e7eb}
.ckch-search-item{padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .1s}
.ckch-search-item:hover{background:#f0f4ff}
.ckch-search-item:last-child{border-bottom:none}
.ckch-search-session{font-size:10px;color:#6366f1;font-weight:700}
.ckch-search-user{font-size:10px;color:#64748b;margin-left:8px}
.ckch-search-text{font-size:12px;color:#1e293b;font-weight:600;margin-top:2px}
.ckch-search-text mark{background:#fef08a;color:#1e293b;border-radius:2px;padding:0 2px}
.ckch-highlight-flash{animation:ckchFlash 2s ease-out}
@keyframes ckchFlash{0%{background:#fef08a;box-shadow:0 0 12px rgba(250,204,21,.5)}100%{background:inherit;box-shadow:none}}
.ckch-empty{padding:40px;text-align:center;color:#94a3b8;font-size:13px}
.ckch-no-commit{padding:8px 14px;color:#cbd5e1;font-size:11px;text-align:center;font-style:italic}
.ckch-mobile-toggle{display:none;position:fixed;bottom:20px;left:20px;z-index:100;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#4338ca,#6366f1);color:#fff;border:none;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(67,56,202,.4)}
@media(max-width:768px){
.ckch-sidebar{position:fixed;left:-300px;top:0;bottom:0;z-index:99;transition:left .3s;box-shadow:4px 0 20px rgba(0,0,0,.15)}
.ckch-sidebar.open{left:0}
.ckch-mobile-toggle{display:block}
}
</style>
<div class="ckch-layout">
<div class="ckch-sidebar" id="ckchSidebar">
<div class="ckch-sidebar-head">
<h3>🏢 Tổ Chức Công Ty</h3>
<input class="ckch-sidebar-search" id="ckchSearch" placeholder="🔍 Tìm nhân viên..." oninput="_ckchFilter(this.value)">
</div>
<div class="ckch-sidebar-tree" id="ckchTree"><div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px">⏳</div></div>
</div>
<div class="ckch-main">
<div class="ckch-topbar">
<div><h2>📝 Cam Kết Cuộc Họp</h2><div class="ckch-topbar-sub">Theo dõi cam kết & review sau cuộc họp</div></div>
<div class="ckch-search-wrap"><select class="ckch-search-user-filter" id="ckchSearchUser" onchange="_ckchSearchContent(document.getElementById('ckchContentSearch').value)"><option value="">👥 Tất cả NV</option></select><div class="ckch-search-inner"><span class="ckch-search-icon">🔍</span><input class="ckch-search-input" id="ckchContentSearch" placeholder="Tìm nội dung cam kết..." oninput="_ckchSearchContent(this.value)" onfocus="_ckchSearchContent(this.value)"><div id="ckchSearchResults" class="ckch-search-results" style="display:none"></div></div></div>
<div style="margin-left:auto;display:flex;gap:8px;align-items:center">
<select class="ckch-filter" id="ckchMonth"></select>
<select class="ckch-filter" id="ckchYear"></select>
</div>
</div>
<div class="ckch-content" id="ckchContent"><div class="ckch-empty">⏳ Đang tải...</div></div>
</div>
</div>
<button class="ckch-mobile-toggle" onclick="_ckchToggleSidebar()">☰</button>`;

    // Populate filters
    var ms = document.getElementById('ckchMonth');
    ms.innerHTML = '<option value="">Tất cả tháng</option>';
    for(var m=1;m<=12;m++) ms.innerHTML += '<option value="'+m+'"'+(m===curMonth?' selected':'')+'>Tháng '+m+'</option>';
    var ys = document.getElementById('ckchYear');
    for(var y=curYear;y>=curYear-3;y--) ys.innerHTML += '<option value="'+y+'"'+(y===curYear?' selected':'')+'>'+y+'</option>';
    ms.onchange = _ckchLoadContent;
    ys.onchange = _ckchLoadContent;

    // Load org tree + first content
    try {
        _ckchOrg = await apiCall('/api/permissions/org-tree');
        // Auto-expand root departments only on first visit (no saved state)
        var hasSavedState = !!localStorage.getItem('ckch_expanded');
        if (!hasSavedState) {
            var allDepts = _ckchOrg.departments || [];
            allDepts.forEach(function(d) {
                if (!d.parent_id && !_ckchIsHidden(d.id, allDepts)) _ckchExpanded[d.id] = true;
            });
        }
        _ckchBuildTree();
        _ckchPopulateSearchUsers();
    } catch(e) { document.getElementById('ckchTree').innerHTML = '<div style="padding:12px;color:#ef4444;font-size:11px">Lỗi tải cây tổ chức</div>'; }
    _ckchLoadContent();
}

function _ckchRoleIcon(r){
    if(r==='giam_doc')return '⭐';if(r==='quan_ly_cap_cao')return '👑';if(r==='quan_ly')return '💼';
    if(r==='truong_phong')return '🎖️';if(r==='partime')return '🕐';return '👤';
}
function _ckchRoleStyle(r){
    if(r==='giam_doc') return {bg:'linear-gradient(135deg,#92400e,#d97706)',color:'#fff',tagBg:'#fef3c7',tagColor:'#92400e',border:'#d97706'};
    if(r==='quan_ly_cap_cao') return {bg:'linear-gradient(135deg,#312e81,#6366f1)',color:'#fff',tagBg:'#e0e7ff',tagColor:'#3730a3',border:'#6366f1'};
    if(r==='quan_ly') return {bg:'linear-gradient(135deg,#065f46,#059669)',color:'#fff',tagBg:'#d1fae5',tagColor:'#065f46',border:'#059669'};
    if(r==='truong_phong') return {bg:'linear-gradient(135deg,#1e3a5f,#3b82f6)',color:'#fff',tagBg:'#dbeafe',tagColor:'#1e40af',border:'#3b82f6'};
    if(r==='partime') return {bg:'#f8fafc',color:'#64748b',tagBg:'#f1f5f9',tagColor:'#64748b',border:'#e2e8f0'};
    return {bg:'#f8fafc',color:'#1e293b',tagBg:'#f1f5f9',tagColor:'#64748b',border:'#e2e8f0'};
}
function _ckchRoleName(r){
    if(r==='giam_doc')return 'Giám Đốc';if(r==='quan_ly_cap_cao')return 'QL Cấp Cao';if(r==='quan_ly')return 'Quản Lý';
    if(r==='truong_phong')return 'Trưởng Phòng';if(r==='partime')return 'Partime';if(r==='nhan_vien')return 'Nhân Viên';return r||'';
}
function _ckchRoleOrder(r){
    var m={giam_doc:0,quan_ly_cap_cao:1,quan_ly:2,truong_phong:3,nhan_vien:4,partime:5};return m[r]!=null?m[r]:6;
}

var _ckchExpanded = (function(){ try { var s=localStorage.getItem('ckch_expanded'); return s?JSON.parse(s):{}; } catch(e){ return {}; } })(); // track which depts are expanded
var _ckchHiddenDepts = [20]; // HỆ THỐNG AFFILIATE HV

function _ckchIsHidden(deptId, depts) {
    if (_ckchHiddenDepts.indexOf(deptId) > -1) return true;
    // Check if any parent is hidden
    var d = depts.find(function(x){return x.id===deptId;});
    if (d && d.parent_id) return _ckchIsHidden(d.parent_id, depts);
    return false;
}

function _ckchBuildTree() {
    if(!_ckchOrg) return;
    var depts = _ckchOrg.departments || [], users = _ckchOrg.users || [];
    // Filter out hidden depts
    var visibleDepts = depts.filter(function(d){ return !_ckchIsHidden(d.id, depts); });
    var roots = visibleDepts.filter(function(d){return !d.parent_id;});
    var h = '<button class="ckch-dept-btn'+(_ckchSelected.type==='all'?' active':'')+'" onclick="_ckchSelect(\'all\',null)" style="margin-bottom:8px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:800">🌐 Tất cả công ty</button>';

    function buildDept(dept, level) {
        var children = visibleDepts.filter(function(d){return d.parent_id===dept.id;});
        var deptUsers = users.filter(function(u){return u.department_id===dept.id;});
        deptUsers.sort(function(a,b){return _ckchRoleOrder(a.role)-_ckchRoleOrder(b.role);});
        var isActive = _ckchSelected.type==='dept' && _ckchSelected.id===dept.id;
        var isExpanded = !!_ckchExpanded[dept.id];
        var hasContent = deptUsers.length > 0 || children.length > 0;
        var cls = level===0?'root':'';
        var indent = level>0?'padding-left:'+(level*8)+'px;':'';
        var arrow = hasContent ? (isExpanded ? '▼' : '▶') : '';
        var memberCount = deptUsers.length;
        // Count all users in subtree
        function countSub(did){ var c=users.filter(function(u){return u.department_id===did;}).length; visibleDepts.filter(function(d){return d.parent_id===did;}).forEach(function(cd){c+=countSub(cd.id);}); return c; }
        var totalCount = countSub(dept.id);

        var s = '<div class="ckch-dept-item" data-dept="'+dept.id+'" style="'+indent+'">';
        // Dept button - click left part expands, click name selects
        s += '<div style="display:flex;align-items:center;gap:0">';
        if(hasContent) s += '<button style="background:none;border:none;cursor:pointer;padding:4px 6px;font-size:10px;color:#94a3b8" onclick="event.stopPropagation();_ckchToggleDeptTree('+dept.id+')">'+arrow+'</button>';
        else s += '<span style="width:24px"></span>';
        s += '<button class="ckch-dept-btn '+cls+(isActive?' active':'')+'" onclick="_ckchSelect(\'dept\','+dept.id+')" style="flex:1">';
        s += '<span>🏢</span><span style="flex:1">'+dept.name+'</span>';
        if(totalCount) s += '<span style="font-size:9px;opacity:.7;background:rgba(255,255,255,.2);padding:1px 6px;border-radius:8px">'+totalCount+'</span>';
        s += '</button></div>';

        // Collapsible content (users + children)
        if(hasContent) {
            s += '<div style="'+(isExpanded?'':'display:none')+'" data-dept-content="'+dept.id+'">';
            for(var ui=0;ui<deptUsers.length;ui++){
                var u = deptUsers[ui];
                var uActive = _ckchSelected.type==='user' && _ckchSelected.id===u.id;
                s += '<button class="ckch-user-btn'+(uActive?' active':'')+'" onclick="_ckchSelect(\'user\','+u.id+')" data-name="'+u.full_name.toLowerCase()+'">';
                s += '<span>'+_ckchRoleIcon(u.role)+'</span>';
                s += '<span>'+u.full_name+'</span>';
                s += '<span class="ckch-user-role">'+_ckchRoleName(u.role)+'</span>';
                s += '</button>';
            }
            if(children.length){
                s += '<div class="ckch-dept-children">';
                for(var ci=0;ci<children.length;ci++) s += buildDept(children[ci], level+1);
                s += '</div>';
            }
            s += '</div>';
        }
        s += '</div>';
        return s;
    }

    for(var ri=0;ri<roots.length;ri++) h += buildDept(roots[ri], 0);
    document.getElementById('ckchTree').innerHTML = h;
}

window._ckchToggleDeptTree = function(deptId) {
    _ckchExpanded[deptId] = !_ckchExpanded[deptId];
    try { localStorage.setItem('ckch_expanded', JSON.stringify(_ckchExpanded)); } catch(e){}
    _ckchBuildTree();
};

window._ckchSelect = function(type, id) {
    _ckchSelected = {type:type, id:id};
    try { localStorage.setItem('ckch_selected', JSON.stringify(_ckchSelected)); } catch(e){}
    _ckchBuildTree(); // re-highlight
    _ckchLoadContent();
};

window._ckchFilter = function(q) {
    q = (q||'').toLowerCase();
    var btns = document.querySelectorAll('.ckch-user-btn');
    for(var i=0;i<btns.length;i++){
        var name = btns[i].getAttribute('data-name')||'';
        btns[i].style.display = (!q || name.indexOf(q)>-1) ? '' : 'none';
    }
};

window._ckchToggleSidebar = function() {
    var sb = document.getElementById('ckchSidebar');
    if(sb) sb.classList.toggle('open');
};

async function _ckchLoadContent() {
    var el = document.getElementById('ckchContent');
    if(!el) return;
    el.innerHTML = '<div class="ckch-empty">⏳ Đang tải cuộc họp...</div>';

    var month = document.getElementById('ckchMonth').value;
    var year = document.getElementById('ckchYear').value;
    var isGD = typeof currentUser!=='undefined' && currentUser && currentUser.role==='giam_doc';

    try {
        var url = '/api/meeting-commitments/sessions?';
        if(month) url += 'month='+month+'&';
        if(year) url += 'year='+year+'&';
        var sessions = (await apiCall(url)).sessions || [];

        if(!sessions.length){
            el.innerHTML = '<div class="ckch-empty"><div style="font-size:40px;margin-bottom:8px">📭</div>Không có cuộc họp nào</div>';
            return;
        }

        // If dept/user selected, preload all sessions to filter relevant ones
        if(_ckchSelected.type !== 'all') {
            var promises = sessions.map(function(s){
                if(_ckchSessionCache[s.id]) return Promise.resolve(_ckchSessionCache[s.id]);
                return apiCall('/api/meeting-commitments/sessions/'+s.id).then(function(d){ _ckchSessionCache[s.id]=d; return d; });
            });
            var allData = await Promise.all(promises);

            // Filter: only keep sessions that have matching commitments
            var deptUserIds = null;
            if(_ckchSelected.type === 'dept') {
                deptUserIds = _ckchGetDeptUsers(_ckchSelected.id).map(function(u){return u.id;});
            }
            sessions = sessions.filter(function(s, idx) {
                var commits = (allData[idx].commitments || []);
                if(_ckchSelected.type === 'user') return commits.some(function(c){return c.user_id === _ckchSelected.id;});
                if(_ckchSelected.type === 'dept') return commits.some(function(c){return deptUserIds.indexOf(c.user_id)>-1;});
                return true;
            });
        }

        if(!sessions.length){
            el.innerHTML = '<div class="ckch-empty"><div style="font-size:40px;margin-bottom:8px">📭</div>Không có cuộc họp nào cho '+(_ckchSelected.type==='dept'?_ckchGetDeptName(_ckchSelected.id):_ckchGetUserName(_ckchSelected.id))+'</div>';
            return;
        }

        var h = '<div style="margin-bottom:12px;font-size:12px;color:#6b7280">'+
            '📋 '+sessions.length+' cuộc họp'+
            (_ckchSelected.type==='all'?' — Toàn công ty':_ckchSelected.type==='dept'?' — '+_ckchGetDeptName(_ckchSelected.id):' — '+_ckchGetUserName(_ckchSelected.id))+
            '</div>';

        for(var si=0;si<sessions.length;si++){
            var s = sessions[si];
            var dt = new Date(s.meeting_date);
            var pctDone = s.total_items>0 ? Math.round(100*s.completed_items/s.total_items) : 0;
            var pctBg = pctDone>=80?'#dcfce7;color:#166534':pctDone>=50?'#fef3c7;color:#92400e':'#fee2e2;color:#991b1b';

            h += '<div class="ckch-card">';
            h += '<div class="ckch-card-head" onclick="_ckchToggleSession('+s.id+')">';
            h += '<div class="ckch-card-title">📋 '+s.title+' <span class="ckch-card-date">'+dt.toLocaleDateString('vi-VN')+'</span></div>';
            h += '<div style="display:flex;gap:6px;align-items:center">';
            h += '<span class="ckch-pill" style="background:#eff6ff;color:#1d4ed8">'+s.total_items+' cam kết</span>';
            h += '<span class="ckch-pill" style="background:'+pctBg+'">'+pctDone+'%</span>';
            if(isGD) h += '<button class="ckch-pill" style="background:#fee2e2;color:#dc2626;border:none;cursor:pointer" onclick="event.stopPropagation();_ckchDeleteSession('+s.id+')">🗑️</button>';
            h += '</div></div>';
            h += '<div class="ckch-card-body" id="ckchBody'+s.id+'" style="display:none"><div class="ckch-empty">⏳</div></div>';
            h += '</div>';
        }
        el.innerHTML = h;
        if(sessions.length) _ckchToggleSession(sessions[0].id);
    } catch(e) {
        el.innerHTML = '<div class="ckch-empty" style="color:#ef4444">⚠️ '+(e.message||'Lỗi')+'</div>';
    }
}

function _ckchGetDeptName(id){
    if(!_ckchOrg) return '';
    var d = (_ckchOrg.departments||[]).find(function(x){return x.id===id;});
    return d?d.name:'';
}
function _ckchGetUserName(id){
    if(!_ckchOrg) return '';
    var u = (_ckchOrg.users||[]).find(function(x){return x.id===id;});
    return u?u.full_name:'';
}
function _ckchGetDeptUsers(deptId){
    if(!_ckchOrg) return [];
    var depts = _ckchOrg.departments||[], allIds = [deptId];
    // collect child dept ids recursively
    function collect(pid){ depts.forEach(function(d){if(d.parent_id===pid){allIds.push(d.id);collect(d.id);}}); }
    collect(deptId);
    return (_ckchOrg.users||[]).filter(function(u){return allIds.indexOf(u.department_id)>-1;});
}

window._ckchToggleSession = async function(sid) {
    var body = document.getElementById('ckchBody'+sid);
    if(!body) return;
    if(body.style.display!=='none'){ body.style.display='none'; return; }
    body.style.display='block';
    body.innerHTML = '<div class="ckch-empty">⏳ Đang tải cam kết...</div>';

    try {
        // Use cache if available
        if(!_ckchSessionCache[sid]){
            _ckchSessionCache[sid] = await apiCall('/api/meeting-commitments/sessions/'+sid);
        }
        var data = _ckchSessionCache[sid];
        var commits = data.commitments || [];

        // Filter commits based on selection
        var filteredCommits = commits;
        if(_ckchSelected.type==='user'){
            filteredCommits = commits.filter(function(c){return c.user_id===_ckchSelected.id;});
        } else if(_ckchSelected.type==='dept'){
            var deptUserIds = _ckchGetDeptUsers(_ckchSelected.id).map(function(u){return u.id;});
            filteredCommits = commits.filter(function(c){return deptUserIds.indexOf(c.user_id)>-1;});
        }

        // Group by dept then user
        var byDept = {};
        filteredCommits.forEach(function(c){
            var dk = c.dept_id||0;
            if(!byDept[dk]) byDept[dk]={name:c.dept_name||'Khác',users:{}};
            if(!byDept[dk].users[c.user_id]) byDept[dk].users[c.user_id]={name:c.user_name,role:c.user_role,items:[]};
            byDept[dk].users[c.user_id].items.push(c);
        });

        // Also show users without commits if selecting dept/all
        if(_ckchSelected.type!=='user' && _ckchOrg){
            var targetUsers = _ckchSelected.type==='dept' ? _ckchGetDeptUsers(_ckchSelected.id) : (_ckchOrg.users||[]);
            targetUsers.forEach(function(u){
                var deptId = u.department_id||0;
                var dept = (_ckchOrg.departments||[]).find(function(d){return d.id===deptId;});
                if(!byDept[deptId]) byDept[deptId]={name:dept?dept.name:'Khác',users:{}};
                if(!byDept[deptId].users[u.id]) byDept[deptId].users[u.id]={name:u.full_name,role:u.role,items:[]};
            });
        }

        var h = '';
        var deptKeys = Object.keys(byDept);
        var deptColors = ['#312e81','#92400e','#065f46','#7c2d12','#581c87','#1e3a5f'];

        for(var di=0;di<deptKeys.length;di++){
            var dg = byDept[deptKeys[di]];
            var dc = deptColors[di%deptColors.length];

            h += '<div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">';
            h += '<div style="padding:10px 16px;background:'+dc+';color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;gap:8px">';
            h += '🏢 '+dg.name;
            var uCount = Object.keys(dg.users).length;
            h += '<span style="margin-left:auto;font-size:10px;opacity:.8">'+uCount+' người</span>';
            h += '</div>';

            // Sort users by role
            var uKeys = Object.keys(dg.users);
            uKeys.sort(function(a,b){return _ckchRoleOrder(dg.users[a].role)-_ckchRoleOrder(dg.users[b].role);});

            for(var ui=0;ui<uKeys.length;ui++){
                var usr = dg.users[uKeys[ui]];
                var hasCommits = usr.items.length>0;
                var doneCount = usr.items.filter(function(x){return x.is_completed;}).length;
                var usrPct = hasCommits ? Math.round(100*doneCount/usr.items.length) : -1;
                var pColor = usrPct>=80?'#059669':usrPct>=50?'#d97706':'#ef4444';
                var rs = _ckchRoleStyle(usr.role);

                h += '<div class="ckch-emp-section" style="margin-bottom:16px;border:2px solid '+rs.border+';border-radius:12px;overflow:hidden">';
                h += '<div style="padding:12px 16px;background:'+rs.bg+';font-size:14px;font-weight:800;color:'+rs.color+';display:flex;align-items:center;gap:10px">';
                h += '<span style="font-size:18px">'+_ckchRoleIcon(usr.role)+'</span>';
                h += '<span>'+usr.name+'</span>';
                h += '<span style="font-size:10px;padding:3px 10px;border-radius:12px;font-weight:700;background:'+rs.tagBg+';color:'+rs.tagColor+'">'+_ckchRoleName(usr.role)+'</span>';
                if(hasCommits){
                    h += '<span style="margin-left:auto;font-size:11px;font-weight:700;opacity:.9">'+usr.items.length+' cam kết</span>';
                    h += '<span style="font-size:13px;font-weight:900;background:rgba(255,255,255,.25);padding:2px 10px;border-radius:10px">'+usrPct+'%</span>';
                } else {
                    h += '<span style="margin-left:auto;font-size:11px;opacity:.7">Chưa có cam kết</span>';
                }
                h += '</div>';

                if(hasCommits){
                    for(var ci=0;ci<usr.items.length;ci++){
                        var item = usr.items[ci];
                        var cls = item.is_completed?' ckch-commit-done':item.completion_pct>0?' ckch-commit-partial':' ckch-commit-pending';
                        var pc = item.completion_pct>=80?'#22c55e':item.completion_pct>=50?'#f59e0b':'#ef4444';
                        // Split content at ✅ to separate question and answer
                        var parts = item.content.split('✅');
                        var question = (parts[0] || '').trim();
                        var answer = parts.length > 1 ? parts.slice(1).join('✅').trim() : '';
                        var pctVal = item.completion_pct||0;

                        h += '<div class="ckch-commit'+cls+'" id="ckchCommit'+item.id+'" data-commit-id="'+item.id+'">';

                        // Row 1: STT + Câu hỏi
                        h += '<div style="display:flex;align-items:flex-start;gap:10px">';
                        h += '<div class="ckch-stt">'+item.stt+'</div>';
                        h += '<div style="flex:1">';
                        h += '<div style="font-size:10px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">❓ Câu hỏi / Cam kết</div>';
                        h += '<div style="font-size:14px;font-weight:700;color:#1e293b;line-height:1.6">'+question+'</div>';
                        h += '</div>';
                        h += '</div>';

                        // Row 2: Câu trả lời + Review (side by side)
                        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:stretch;margin-top:10px">';
                        // Câu trả lời
                        h += '<div style="padding:10px 14px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe">';
                        h += '<div style="font-size:10px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">💬 Câu trả lời</div>';
                        var answerFormatted = answer ? answer.replace(/\s*(\d+)\.\s*/g, function(m,n,o){ return o>0?'<br>'+n+'. ':n+'. '; }) : '';
                        h += '<div style="font-size:13px;font-weight:600;color:#1e3a5f;line-height:1.8">'+(answerFormatted || '<span style="color:#94a3b8;font-style:italic">Chưa có câu trả lời</span>')+'</div>';
                        h += '</div>';
                        // Review
                        h += '<div style="padding:10px 14px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0">';
                        h += '<div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">✍️ Nhận xét</div>';
                        if(item.review_note){
                            h += '<div style="font-size:13px;font-weight:600;color:#064e3b;line-height:1.6">'+item.review_note+'</div>';
                            if(item.reviewed_by_name) h += '<div style="font-size:10px;color:#6366f1;margin-top:4px">👤 '+item.reviewed_by_name+'</div>';
                        } else {
                            h += '<div style="font-size:13px;color:#94a3b8;font-style:italic">Chưa có review</div>';
                        }
                        h += '</div>';
                        h += '</div>';

                        // Row 3: Mục tiêu + Hoàn thành (side by side)
                        h += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px">';
                        h += '<div style="flex:1;min-width:140px;padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;text-align:center">';
                        h += '<div style="font-size:10px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:.5px">🎯 Mục tiêu</div>';
                        h += '<div style="font-size:18px;font-weight:900;color:#1e293b;margin-top:4px">'+(item.target_revenue>0?_ckchFmtMoney(item.target_revenue):'—')+'</div>';
                        h += '</div>';
                        h += '<div style="flex:1;min-width:220px;padding:8px 12px;background:'+(pctVal>=80?'#f0fdf4':pctVal>=50?'#fffbeb':'#fef2f2')+';border-radius:8px;border:1px solid '+(pctVal>=80?'#bbf7d0':pctVal>=50?'#fde68a':'#fecaca')+'">';
                        h += '<div style="font-size:10px;font-weight:700;color:'+pc+';text-transform:uppercase;letter-spacing:.5px">📊 Hoàn thành</div>';
                        h += '<div style="display:flex;align-items:center;gap:8px;margin-top:2px;white-space:nowrap">';
                        h += '<span style="font-size:20px;font-weight:900;color:'+pc+'">'+pctVal+'%</span>';
                        h += '<span style="font-size:11px;color:#64748b;white-space:nowrap">'+(item.is_completed?'✅ Đã hoàn thành':'⏳ Đang thực hiện')+'</span>';
                        h += '</div>';
                        h += '<div style="height:4px;background:#e5e7eb;border-radius:2px;margin-top:4px"><div style="height:100%;width:'+pctVal+'%;background:'+pc+';border-radius:2px"></div></div>';
                        h += '</div>';
                        h += '</div>';

                        h += '</div>';
                    }
                }
                h += '</div>';
            }
            h += '</div>';
        }

        if(!h) h = '<div class="ckch-empty">Không có cam kết phù hợp với lựa chọn</div>';
        body.innerHTML = h;
    } catch(e) {
        body.innerHTML = '<div class="ckch-empty" style="color:#ef4444">⚠️ '+(e.message||'Lỗi')+'</div>';
    }
};

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

// ===== SEARCH COMMITMENTS =====
var _ckchSearchTimer = null;
window._ckchSearchContent = function(q) {
    clearTimeout(_ckchSearchTimer);
    var dd = document.getElementById('ckchSearchResults');
    if(!dd) return;
    q = (q||'').trim();
    if(q.length < 2) { dd.style.display='none'; return; }
    _ckchSearchTimer = setTimeout(function(){
        var results = [];
        var keys = Object.keys(_ckchSessionCache);
        var ql = q.toLowerCase();

        // Get filters
        var filterUserId = document.getElementById('ckchSearchUser') ? document.getElementById('ckchSearchUser').value : '';
        var filterMonth = document.getElementById('ckchMonth') ? document.getElementById('ckchMonth').value : '';
        var filterYear = document.getElementById('ckchYear') ? document.getElementById('ckchYear').value : '';

        for(var i=0;i<keys.length;i++){
            var sid = keys[i];
            var data = _ckchSessionCache[sid];
            if(!data || !data.commitments) continue;

            // Filter by month/year using session meeting_date
            if(data.session && data.session.meeting_date && (filterMonth || filterYear)){
                var sd = new Date(data.session.meeting_date);
                if(filterMonth && (sd.getMonth()+1) !== Number(filterMonth)) continue;
                if(filterYear && sd.getFullYear() !== Number(filterYear)) continue;
            }

            var sessionTitle = data.session ? data.session.title : ('Session '+sid);
            var sessionDate = data.session && data.session.meeting_date ? new Date(data.session.meeting_date).toLocaleDateString('vi-VN') : '';
            for(var j=0;j<data.commitments.length;j++){
                var c = data.commitments[j];
                // Filter by employee
                if(filterUserId && String(c.user_id) !== filterUserId) continue;
                if((c.content||'').toLowerCase().indexOf(ql) > -1){
                    results.push({sid:Number(sid), commitId:c.id, sessionTitle:sessionTitle, sessionDate:sessionDate, userName:c.user_name, content:c.content, q:ql});
                }
                if(results.length >= 20) break;
            }
            if(results.length >= 20) break;
        }
        if(!results.length){
            dd.innerHTML = '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">Không tìm thấy cam kết nào</div>';
            dd.style.display='block'; return;
        }
        var h = '';
        for(var k=0;k<results.length;k++){
            var r = results[k];
            var preview = r.content.replace(/✅/g,' ▸ ');
            // Highlight matched text
            var idx = preview.toLowerCase().indexOf(r.q);
            if(idx > -1) {
                var before = preview.substring(0, idx);
                var match = preview.substring(idx, idx + r.q.length);
                var after = preview.substring(idx + r.q.length);
                preview = before + '<mark>' + match + '</mark>' + after;
            }
            if(preview.length > 120) preview = preview.substring(0,120)+'...';
            h += '<div class="ckch-search-item" onclick="_ckchGoToCommit('+r.sid+','+r.commitId+')">';
            h += '<div><span class="ckch-search-session">📋 '+r.sessionTitle+'</span>';
            if(r.sessionDate) h += '<span style="font-size:9px;color:#94a3b8;margin-left:4px">'+r.sessionDate+'</span>';
            h += '<span class="ckch-search-user">👤 '+r.userName+'</span></div>';
            h += '<div class="ckch-search-text">'+preview+'</div>';
            h += '</div>';
        }
        dd.innerHTML = h;
        dd.style.display = 'block';
    }, 300);
};

window._ckchGoToCommit = async function(sid, commitId) {
    // Close search dropdown
    var dd = document.getElementById('ckchSearchResults');
    if(dd) dd.style.display = 'none';
    var inp = document.getElementById('ckchContentSearch');
    if(inp) inp.value = '';

    // Switch sidebar to "Tất cả công ty" so all sessions are visible
    _ckchSelected = {type:'all',id:null};
    try { localStorage.setItem('ckch_selected', JSON.stringify(_ckchSelected)); } catch(e){}
    _ckchBuildTree();
    await _ckchLoadContent();

    // Ensure session body is open
    var body = document.getElementById('ckchBody'+sid);
    if(!body) return;
    if(body.style.display === 'none') {
        await _ckchToggleSession(sid);
    }

    // Wait for DOM to render, then scroll to commit
    setTimeout(function(){
        var el = document.getElementById('ckchCommit'+commitId);
        if(el) {
            el.scrollIntoView({behavior:'smooth', block:'center'});
            el.classList.add('ckch-highlight-flash');
            setTimeout(function(){ el.classList.remove('ckch-highlight-flash'); }, 2500);
        }
    }, 400);
};

// Close search dropdown when clicking outside
document.addEventListener('click', function(e){
    var wrap = document.querySelector('.ckch-search-wrap');
    if(wrap && !wrap.contains(e.target)){
        var dd = document.getElementById('ckchSearchResults');
        if(dd) dd.style.display = 'none';
    }
});
