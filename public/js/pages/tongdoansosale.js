// ========== TỔNG DOANH SỐ SALE KD ==========
// Page: /tongdoansosale
// Auto-detected by convention: renderTongdoanhsosalePage(container)

var _tds = { period:'month', dateStr:'', data:null, expandedTeams:new Set() };

async function renderTongdoanhsosalePage(container) {
    var now = new Date(), yr = now.getFullYear(), mo = now.getMonth()+1;
    if(!_tds.dateStr) _tds.dateStr = yr+'-'+String(mo).padStart(2,'0');
    container.innerHTML = _tdsStyles() + _tdsToolbar() + '<div id="tdsContent"><div style="text-align:center;padding:60px;color:#6b7280">⏳ Đang tải dữ liệu...</div></div>';
    _tdsLoadData();
}

function _tdsStyles(){
return `<style>
.tds-wrap{max-width:1280px;margin:0 auto;font-family:inherit}
.tds-toolbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:24px}
.tds-tabs{display:flex;gap:0;border-radius:10px;overflow:hidden;border:1.5px solid #0f766e}
.tds-tab{padding:8px 20px;font-size:13px;font-weight:700;cursor:pointer;background:#fff;color:#0f766e;border:none;transition:all .25s}
.tds-tab.active{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff}
.tds-tab:hover:not(.active){background:#f0fdfa}
.tds-nav{display:flex;align-items:center;gap:8px}
.tds-nav-btn{width:36px;height:36px;border-radius:50%;border:1.5px solid #99f6e4;background:#fff;color:#0f766e;font-size:16px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.tds-nav-btn:hover{background:#0f766e;color:#fff;border-color:#0f766e}
.tds-plabel{font-size:16px;font-weight:800;color:#134e4a;min-width:100px;text-align:center}
.tds-filter{padding:8px 14px;border-radius:10px;border:1.5px solid #99f6e4;font-size:13px;font-weight:600;background:#fff;color:#134e4a;cursor:pointer}
.tds-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:24px}
.tds-card{border-radius:14px;padding:22px 18px;text-align:center;position:relative;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);transition:transform .2s,box-shadow .2s}
.tds-card:hover{transform:translateY(-3px);box-shadow:0 8px 30px rgba(0,0,0,.12)}
.tds-card-val{font-size:32px;font-weight:900;line-height:1}
.tds-card-lbl{font-size:11px;font-weight:600;margin-top:6px;text-transform:uppercase;letter-spacing:.5px;opacity:.8}
.tds-card-trend{font-size:11px;font-weight:700;margin-top:5px;display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px}
.tds-trend-up{color:#34d399;background:rgba(52,211,153,.15)}
.tds-trend-down{color:#f87171;background:rgba(248,113,113,.15)}
.tds-trend-flat{color:rgba(255,255,255,.5);background:rgba(255,255,255,.1)}
.tds-cat-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}
.tds-chip{padding:10px 18px;border-radius:12px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;box-shadow:0 2px 12px rgba(0,0,0,.06)}
.tds-section{background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);margin-bottom:24px}
.tds-sec-hdr{padding:16px 24px;font-size:15px;font-weight:800;display:flex;align-items:center;gap:8px;border-bottom:2px solid rgba(15,118,110,.12);color:#134e4a;background:linear-gradient(90deg,#f0fdfa,#ccfbf1,#f0fdfa)}
.tds-team-hdr{display:grid;grid-template-columns:40px 1fr repeat(3,100px) 110px 70px;padding:14px 24px;background:#f8fafc;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb}
.tds-team-row{display:grid;grid-template-columns:40px 1fr repeat(3,100px) 110px 70px;padding:14px 24px;border-bottom:1px solid #f1f5f9;align-items:center;cursor:pointer;transition:background .2s}
.tds-team-row:hover{background:#f0fdfa}
.tds-team-row.expanded{background:#ecfdf5;border-left:3px solid #14b8a6}
.tds-emp-row{display:grid;grid-template-columns:40px 40px 1fr repeat(3,100px) 110px 70px;padding:10px 24px;border-bottom:1px solid #f8fafc;align-items:center;background:#fafffe;font-size:13px}
.tds-emp-row:hover{background:#f0fdfa}
.tds-rank{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0}
.tds-bar{height:6px;border-radius:3px;background:#e5e7eb;overflow:hidden;margin-top:4px}
.tds-bar-fill{height:100%;border-radius:3px;transition:width .5s ease}
.tds-chart-wrap{padding:24px;position:relative;height:280px}
@media(max-width:768px){
.tds-team-hdr,.tds-team-row{grid-template-columns:30px 1fr 90px 90px}
.tds-emp-row{grid-template-columns:30px 30px 1fr 90px 90px}
.tds-cards{grid-template-columns:repeat(2,1fr)}
}
/* === ORDER DETAIL POPUP === */
.tds-od-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.6);z-index:9998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.tds-od-modal{background:#1e293b;border-radius:20px;width:850px;max-width:95vw;max-height:90vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.4);animation:tdsOdSlide .3s ease;display:flex;flex-direction:column}
@keyframes tdsOdSlide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.tds-od-head{padding:18px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.1)}
.tds-od-head h3{font-size:16px;font-weight:800;color:#fff;margin:0}
.tds-od-close{background:rgba(255,255,255,.1);border:none;color:#94a3b8;font-size:18px;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center}
.tds-od-close:hover{background:rgba(255,255,255,.2);color:#fff}
.tds-od-tabs{display:flex;gap:8px;padding:14px 24px;border-bottom:1px solid rgba(255,255,255,.06)}
.tds-od-tab{padding:6px 16px;border-radius:20px;border:none;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s}
.tds-od-tab.t-all{background:#3b82f6;color:#fff}
.tds-od-tab.t-new{background:rgba(16,185,129,.15);color:#10b981}
.tds-od-tab.t-old{background:rgba(168,85,247,.15);color:#a855f7}
.tds-od-tab.active-all{background:#3b82f6;color:#fff}
.tds-od-tab.active-new{background:#10b981;color:#fff}
.tds-od-tab.active-old{background:#a855f7;color:#fff}
.tds-od-tab:not([class*='active']){opacity:.6}.tds-od-tab:hover{opacity:1}
.tds-od-body{overflow-y:auto;flex:1;padding:0}
.tds-od-table{width:100%;border-collapse:collapse;font-size:12px}
.tds-od-table th{padding:10px 12px;text-align:left;color:#94a3b8;font-weight:600;font-size:11px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.06);position:sticky;top:0;background:#1e293b;z-index:1}
.tds-od-table td{padding:10px 12px;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,.04)}
.tds-od-table tr:hover td{background:rgba(255,255,255,.03)}
.tds-od-empty{padding:40px;text-align:center;color:#64748b;font-size:13px}
@media(max-width:768px){.tds-od-modal{width:100%;max-width:100%;max-height:100%;border-radius:0}}
</style>`;
}

function _tdsToolbar(){
var tabs = [['day','Ngày'],['week','Tuần'],['month','Tháng'],['quarter','Quý'],['year','Năm']];
var h = '<div class="tds-wrap"><div class="tds-toolbar"><div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">';
h += '<div class="tds-tabs">';
tabs.forEach(function(t){ h += '<button class="tds-tab'+(t[0]===_tds.period?' active':'')+'" onclick="_tdsSwitchPeriod(\''+t[0]+'\')">'+t[1]+'</button>'; });
h += '</div><div class="tds-nav"><button class="tds-nav-btn" onclick="_tdsNav(-1)">◀</button><span class="tds-plabel" id="tdsPeriodLabel">...</span><button class="tds-nav-btn" onclick="_tdsNav(1)">▶</button></div></div>';
h += '<select id="tdsCatFilter" class="tds-filter" onchange="_tdsLoadData()"><option value="all">Tất cả lĩnh vực</option></select>';
h += '</div>';
return h;
}

async function _tdsLoadData(){
var content = document.getElementById('tdsContent');
if(!content) return;
content.innerHTML = '<div style="text-align:center;padding:60px;color:#6b7280">⏳ Đang tải...</div>';
try {
    var cat = document.getElementById('tdsCatFilter');
    var catVal = cat ? cat.value : 'all';
    var url = '/api/reports/total-sales?period='+_tds.period+'&date='+encodeURIComponent(_tds.dateStr)+'&category='+catVal;
    _tds.data = await apiCall(url);
    var d = _tds.data;
    // Update period label
    var lbl = document.getElementById('tdsPeriodLabel');
    if(lbl) lbl.textContent = d.period.label;
    // Update category filter
    if(cat && d.categories){
        var cv = cat.value;
        cat.innerHTML = '<option value="all">Tất cả lĩnh vực</option>';
        d.categories.forEach(function(c){ cat.innerHTML += '<option value="'+c.id+'"'+(cv==c.id?' selected':'')+'>'+c.name+'</option>'; });
    }
    _tdsRender(d);
} catch(e){ content.innerHTML = '<div style="text-align:center;padding:60px;color:#ef4444">❌ Lỗi tải dữ liệu: '+e.message+'</div>'; }
}

function _tdsRender(d){
var content = document.getElementById('tdsContent');
if(!content) return;
var s = d.summary, cur = s.current, prev = s.previous;
var h = '';

// === SUMMARY CARDS ===
h += '<div class="tds-cards">';
h += _tdsCard('💰','TỔNG DOANH SỐ',_tdsFmtMoney(cur.total_revenue),s.trend_pct,'linear-gradient(135deg,#134e4a,#0f766e)','onclick="tdsShowOrders({})"');
h += _tdsCard('📦','TỔNG ĐƠN HÀNG',cur.total_orders+' đơn',s.trend_orders > 0 ? s.trend_orders : s.trend_orders,'linear-gradient(135deg,#1e1b4b,#4338ca)','onclick="tdsShowOrders({})"');
h += _tdsCard('📈','KỲ TRƯỚC',_tdsFmtMoney(prev.total_revenue),null,'linear-gradient(135deg,#78350f,#d97706)','onclick="tdsShowOrders({})"');
h += _tdsCard('👥','NHÂN VIÊN',d.employees.length+' người',null,'linear-gradient(135deg,#4c1d95,#7c3aed)');
h += '</div>';

// === CATEGORY CHIPS ===
var catColors = ['#0f766e','#4338ca','#c2410c','#7c3aed','#0284c7','#d97706','#059669','#dc2626'];
if(cur.by_category && Object.keys(cur.by_category).length > 0){
    h += '<div class="tds-cat-chips">';
    var ci = 0;
    for(var catId in cur.by_category){
        var cd = cur.by_category[catId];
        var col = catColors[ci % catColors.length];
        h += '<div class="tds-chip" style="background:'+col+'11;color:'+col+';border:1.5px solid '+col+'33;cursor:pointer" onclick="tdsShowOrders({categoryId:'+catId+',title:\''+cd.name.replace(/'/g,"\\'")+'\'})">';
        h += '<span style="font-size:16px">'+(['🏷️','👔','🎯','📋','🧵','⚡','🔥','💎'][ci%8])+'</span>';
        h += '<span>'+cd.name+': <strong>'+_tdsFmtMoney(cd.revenue)+'</strong> ('+cd.orders+' đơn)</span></div>';
        ci++;
    }
    h += '</div>';
}

// === CHART ===
h += '<div class="tds-section"><div class="tds-sec-hdr">📊 Biểu Đồ Doanh Số Theo Lĩnh Vực</div>';
h += '<div class="tds-chart-wrap"><canvas id="tdsChart"></canvas></div></div>';

// === TEAM TABLE ===
h += '<div class="tds-section"><div class="tds-sec-hdr">🏢 Chi Tiết Theo Team & Nhân Viên</div>';
h += _tdsTeamTable(d);
h += '</div>';

content.innerHTML = h;
_tdsDrawChart(d);
}

function _tdsCard(icon,label,value,trend,bg,extra){
var h = '<div class="tds-card" style="background:'+bg+';color:#fff;'+(extra?'cursor:pointer':'')+';" '+(extra||'')+'>';
h += '<div style="font-size:28px;margin-bottom:6px">'+icon+'</div>';
h += '<div class="tds-card-val">'+value+'</div>';
h += '<div class="tds-card-lbl">'+label+'</div>';
if(trend !== null && trend !== undefined){
    var cls = typeof trend === 'number' ? (trend > 0 ? 'tds-trend-up' : trend < 0 ? 'tds-trend-down' : 'tds-trend-flat') : 'tds-trend-flat';
    var arrow = typeof trend === 'number' ? (trend > 0 ? '▲' : trend < 0 ? '▼' : '—') : '';
    var txt = typeof trend === 'number' ? (trend > 0 ? '+' : '') + trend + (String(trend).indexOf('%')>=0?'':'%') : trend;
    h += '<div class="tds-card-trend '+cls+'">'+arrow+' '+txt+'</div>';
}
h += '</div>';
return h;
}

function _tdsTeamTable(d){
if(!d.teams || d.teams.length === 0) return '<div style="padding:40px;text-align:center;color:#9ca3af">Chưa có dữ liệu</div>';
var cats = d.categories || [];
var maxRev = Math.max(...d.teams.map(function(t){return t.current.total_revenue}), 1);

// Dynamic columns based on categories in data
var catIds = [];
var allCatIds = new Set();
d.teams.forEach(function(t){ Object.keys(t.current.by_category||{}).forEach(function(k){allCatIds.add(k)}); });
catIds = Array.from(allCatIds);

var h = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">';
// Header
h += '<thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb">';
h += '<th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;width:40px">#</th>';
h += '<th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280">TEAM / NHÂN VIÊN</th>';
catIds.forEach(function(cid){
    var cn = '—';
    d.teams.forEach(function(t){ if(t.current.by_category[cid]) cn = t.current.by_category[cid].name; });
    h += '<th style="padding:12px 10px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;min-width:100px">'+cn+'</th>';
});
h += '<th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;min-width:110px">TỔNG DS</th>';
h += '<th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;min-width:60px">ĐƠN</th>';
h += '<th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;min-width:60px">TREND</th>';
h += '</tr></thead><tbody>';

d.teams.forEach(function(team, ti){
    var isExp = _tds.expandedTeams.has(team.dept_id);
    var pct = Math.round(team.current.total_revenue / maxRev * 100);
    // Team row
    var teamEscName = team.dept_name.replace(/'/g,"\\'");
    h += '<tr style="cursor:pointer;border-bottom:1px solid #f1f5f9;background:'+(isExp?'#ecfdf5':'#fff')+';transition:background .2s" onclick="_tdsToggleTeam('+team.dept_id+')" onmouseover="this.style.background=\'#f0fdfa\'" onmouseout="this.style.background=\''+(isExp?'#ecfdf5':'#fff')+'\'">';
    h += '<td style="padding:12px 16px"><div class="tds-rank" style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff">'+(ti+1)+'</div></td>';
    h += '<td style="padding:12px 16px"><div style="font-weight:800;color:#134e4a;font-size:14px;display:flex;align-items:center;gap:8px">'+(isExp?'▼':'▶')+' '+team.dept_name;
    h += ' <span onclick="event.stopPropagation();tdsShowOrders({deptId:'+team.dept_id+',title:\''+teamEscName+'\'})" style="cursor:pointer;font-size:14px;opacity:.7;transition:opacity .2s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.7" title="Xem chi tiết đơn team">📋</span></div>';
    h += '<div style="font-size:11px;color:#6b7280;margin-top:2px">'+team.member_count+' thành viên'+(team.leader_name?' • TP: '+team.leader_name:'')+'</div>';
    h += '<div class="tds-bar" style="width:80%;margin-top:4px"><div class="tds-bar-fill" style="width:'+pct+'%;background:linear-gradient(90deg,#14b8a6,#0f766e)"></div></div></td>';
    catIds.forEach(function(cid){
        var cv = team.current.by_category[cid];
        h += '<td style="padding:12px 10px;text-align:right;font-weight:600;color:#334155">'+(cv?_tdsFmtMoney(cv.revenue):'—')+'</td>';
    });
    h += '<td style="padding:12px 16px;text-align:right;font-weight:900;color:#0f766e;font-size:14px">'+_tdsFmtMoney(team.current.total_revenue)+'</td>';
    h += '<td style="padding:12px 16px;text-align:right;font-weight:700;color:#4338ca">'+team.current.total_orders+'</td>';
    h += '<td style="padding:12px 16px;text-align:right">'+_tdsTrendBadge(team.trend_pct)+'</td>';
    h += '</tr>';

    // Employee rows (if expanded)
    if(isExp && team.employees){
        team.employees.forEach(function(emp, ei){
            var empEscName = emp.name.replace(/'/g,"\\'");
            h += '<tr style="background:#fafffe;border-bottom:1px solid #f8fafc;cursor:pointer" onclick="tdsShowOrders({userId:'+emp.user_id+',title:\''+empEscName+'\'})">';
            h += '<td style="padding:10px 16px"></td>';
            h += '<td style="padding:10px 16px;padding-left:44px"><span style="font-weight:600;color:#475569">'+emp.name+'</span><span style="font-size:11px;color:#94a3b8;margin-left:6px">'+(emp.role==='truong_phong'?'TP':'NV')+'</span></td>';
            catIds.forEach(function(cid){
                var cv = emp.current.by_category[cid];
                h += '<td style="padding:10px 10px;text-align:right;font-size:12px;color:#475569;cursor:pointer" onclick="event.stopPropagation();tdsShowOrders({userId:'+emp.user_id+',categoryId:'+cid+',title:\''+empEscName+'\'})"><span style="border-bottom:1px dashed #94a3b8">'+(cv?_tdsFmtMoney(cv.revenue):'—')+'</span></td>';
            });
            h += '<td style="padding:10px 16px;text-align:right;font-weight:800;color:#0f766e">'+_tdsFmtMoney(emp.current.total_revenue)+'</td>';
            h += '<td style="padding:10px 16px;text-align:right;font-weight:600;color:#4338ca">'+emp.current.total_orders+'</td>';
            h += '<td style="padding:10px 16px;text-align:right">'+_tdsTrendBadge(emp.trend_pct)+'</td>';
            h += '</tr>';
        });
    }
});
h += '</tbody></table></div>';
return h;
}

function _tdsTrendBadge(pct){
if(pct === null || pct === undefined) return '';
var cls = pct > 0 ? 'tds-trend-up' : pct < 0 ? 'tds-trend-down' : 'tds-trend-flat';
var arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
return '<span class="tds-card-trend '+cls+'" style="font-size:11px">'+arrow+(pct>0?'+':'')+pct+'%</span>';
}

function _tdsFmtMoney(v){
if(!v || v===0) return '0đ';
if(v >= 1e9) return (v/1e9).toFixed(1).replace(/\.0$/,'')+'tỷ';
if(v >= 1e6) return (v/1e6).toFixed(1).replace(/\.0$/,'')+'tr';
if(v >= 1e3) return (v/1e3).toFixed(0)+'k';
return Number(v).toLocaleString('vi-VN')+'đ';
}

function _tdsToggleTeam(deptId){
if(_tds.expandedTeams.has(deptId)) _tds.expandedTeams.delete(deptId);
else _tds.expandedTeams.add(deptId);
if(_tds.data) _tdsRender(_tds.data);
}

function _tdsSwitchPeriod(p){
_tds.period = p;
var now = new Date(), yr = now.getFullYear(), mo = now.getMonth()+1, dd = now.getDate();
if(p==='day') _tds.dateStr = yr+'-'+String(mo).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
else if(p==='week') _tds.dateStr = '';
else if(p==='month') _tds.dateStr = yr+'-'+String(mo).padStart(2,'0');
else if(p==='quarter') _tds.dateStr = yr+'-Q'+Math.ceil(mo/3);
else if(p==='year') _tds.dateStr = ''+yr;
document.querySelectorAll('.tds-tab').forEach(function(t){t.classList.remove('active')});
event.target.classList.add('active');
_tdsLoadData();
}

function _tdsNav(dir){
var p = _tds.period, ds = _tds.dateStr;
if(p==='day'){
    var d = ds ? new Date(ds+'T00:00:00') : new Date();
    d.setDate(d.getDate()+dir);
    _tds.dateStr = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
} else if(p==='month'){
    var parts = ds.split('-').map(Number);
    var m = parts[1]+dir, y = parts[0];
    if(m<1){m=12;y--} if(m>12){m=1;y++}
    _tds.dateStr = y+'-'+String(m).padStart(2,'0');
} else if(p==='quarter'){
    var qp = ds.split('-Q');
    var qy = parseInt(qp[0]), qq = parseInt(qp[1])+dir;
    if(qq<1){qq=4;qy--} if(qq>4){qq=1;qy++}
    _tds.dateStr = qy+'-Q'+qq;
} else if(p==='year'){
    _tds.dateStr = ''+(parseInt(ds)+dir);
} else if(p==='week'){
    // Simple: shift by 7 days
    var wd = ds ? new Date(ds.split('-W')[0]+'-01-01') : new Date();
    wd.setDate(wd.getDate()+dir*7);
    _tds.dateStr = '';
}
_tdsLoadData();
}

function _tdsDrawChart(d){
var canvas = document.getElementById('tdsChart');
if(!canvas) return;
var ctx = canvas.getContext('2d');
var wrap = canvas.parentElement;
canvas.width = wrap.clientWidth;
canvas.height = 260;
ctx.clearRect(0,0,canvas.width,canvas.height);

var cats = d.summary.current.by_category || {};
var keys = Object.keys(cats);
if(keys.length === 0){
    ctx.fillStyle='#9ca3af'; ctx.font='14px sans-serif'; ctx.textAlign='center';
    ctx.fillText('Chưa có dữ liệu',canvas.width/2,130);
    return;
}

var colors = ['#0f766e','#4338ca','#c2410c','#7c3aed','#0284c7','#d97706','#059669','#dc2626'];
var maxVal = Math.max(...keys.map(function(k){return cats[k].revenue}), 1);
var barW = Math.min(80, (canvas.width - 80) / keys.length - 20);
var startX = 60;
var chartH = 200;
var baseY = 240;

// Y-axis
ctx.strokeStyle='#e5e7eb'; ctx.lineWidth=1;
for(var i=0;i<=4;i++){
    var y = baseY - (chartH/4)*i;
    ctx.beginPath(); ctx.moveTo(50,y); ctx.lineTo(canvas.width-20,y); ctx.stroke();
    ctx.fillStyle='#9ca3af'; ctx.font='11px sans-serif'; ctx.textAlign='right';
    ctx.fillText(_tdsFmtMoney(maxVal/4*i),46,y+4);
}

// Bars
keys.forEach(function(k, idx){
    var val = cats[k].revenue;
    var barH = (val/maxVal)*chartH;
    var x = startX + idx*(barW+20);
    // Gradient bar
    var grad = ctx.createLinearGradient(x,baseY-barH,x,baseY);
    grad.addColorStop(0, colors[idx%colors.length]);
    grad.addColorStop(1, colors[idx%colors.length]+'99');
    ctx.fillStyle = grad;
    // Rounded top
    var r = Math.min(6, barW/2);
    ctx.beginPath();
    ctx.moveTo(x,baseY);
    ctx.lineTo(x,baseY-barH+r);
    ctx.quadraticCurveTo(x,baseY-barH,x+r,baseY-barH);
    ctx.lineTo(x+barW-r,baseY-barH);
    ctx.quadraticCurveTo(x+barW,baseY-barH,x+barW,baseY-barH+r);
    ctx.lineTo(x+barW,baseY);
    ctx.fill();
    // Value on top
    ctx.fillStyle='#1e293b'; ctx.font='bold 11px sans-serif'; ctx.textAlign='center';
    ctx.fillText(_tdsFmtMoney(val), x+barW/2, baseY-barH-8);
    // Label
    ctx.fillStyle='#475569'; ctx.font='12px sans-serif';
    ctx.fillText(cats[k].name, x+barW/2, baseY+16);
    // Orders count
    ctx.fillStyle='#94a3b8'; ctx.font='10px sans-serif';
    ctx.fillText(cats[k].orders+' đơn', x+barW/2, baseY+30);
});
}

// ========== ORDER DETAIL POPUP ==========
var _tdsOd = { orders: [], filter: 'all' };

window.tdsShowOrders = async function(opts) {
    opts = opts || {};
    var d = _tds.data;
    if (!d || !d.period) return;

    // Remove existing
    var ex = document.getElementById('tdsOdOverlay');
    if (ex) ex.remove();

    var titleText = opts.title || 'Tất cả';
    var overlay = document.createElement('div');
    overlay.id = 'tdsOdOverlay';
    overlay.className = 'tds-od-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div class="tds-od-modal">'
        + '<div class="tds-od-head"><h3>📊 Chi tiết đơn — ' + titleText + '</h3>'
        + '<button class="tds-od-close" onclick="document.getElementById(\'tdsOdOverlay\').remove()">✕</button></div>'
        + '<div class="tds-od-tabs" id="tdsOdTabs"><span style="color:#94a3b8;font-size:13px">⏳ Đang tải...</span></div>'
        + '<div class="tds-od-body" id="tdsOdBody"><div style="text-align:center;padding:40px;color:#94a3b8">⏳ Đang tải dữ liệu...</div></div>'
        + '</div>';
    document.body.appendChild(overlay);

    // Build API params
    var params = 'start_date=' + d.period.start + '&end_date=' + d.period.end;
    if (opts.userId) params += '&user_id=' + opts.userId;
    if (opts.deptId) params += '&dept_id=' + opts.deptId;
    if (opts.categoryId) params += '&category_id=' + opts.categoryId;

    try {
        var data = await apiCall('/api/reports/total-sales/orders?' + params);
        if (data.error) {
            document.getElementById('tdsOdBody').innerHTML = '<div class="tds-od-empty">❌ ' + data.error + '</div>';
            return;
        }
        _tdsOd.orders = data.orders || [];
        _tdsOd.filter = 'all';

        // Render tabs
        var sm = data.summary || {};
        document.getElementById('tdsOdTabs').innerHTML = ''
            + '<button class="tds-od-tab t-all active-all" onclick="_tdsOdFilter(\'all\')" id="tdsOdTabAll">Tất cả (' + sm.total + ')</button>'
            + '<button class="tds-od-tab t-new" onclick="_tdsOdFilter(\'moi\')" id="tdsOdTabNew">Đ.Mới (' + sm.new_orders + ')</button>'
            + '<button class="tds-od-tab t-old" onclick="_tdsOdFilter(\'cu\')" id="tdsOdTabOld">Đ.Cũ (' + sm.old_orders + ')</button>'
            + '<span style="margin-left:auto;font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:6px">📅 ' + (data.periodLabel || '') + '</span>';

        _tdsOdRender(_tdsOd.orders);
    } catch (err) {
        document.getElementById('tdsOdBody').innerHTML = '<div class="tds-od-empty">❌ Lỗi: ' + err.message + '</div>';
    }
};

function _tdsOdFilter(f) {
    _tdsOd.filter = f;
    // Update active tabs
    var tabs = { all: 'tdsOdTabAll', moi: 'tdsOdTabNew', cu: 'tdsOdTabOld' };
    var activeClass = { all: 'active-all', moi: 'active-new', cu: 'active-old' };
    for (var k in tabs) {
        var el = document.getElementById(tabs[k]);
        if (el) { el.className = 'tds-od-tab t-' + (k === 'all' ? 'all' : k === 'moi' ? 'new' : 'old') + (k === f ? ' ' + activeClass[k] : ''); }
    }
    var filtered = f === 'all' ? _tdsOd.orders : _tdsOd.orders.filter(function(o) { return o.customer_type === f; });
    _tdsOdRender(filtered);
}

function _tdsOdFmtFull(v) {
    if (!v || v === 0) return '0đ';
    return Number(parseFloat(v)).toLocaleString('vi-VN') + 'đ';
}

function _tdsOdRender(orders) {
    var body = document.getElementById('tdsOdBody');
    if (!body) return;
    if (!orders || orders.length === 0) {
        body.innerHTML = '<div class="tds-od-empty">📭 Không có đơn nào</div>';
        return;
    }
    var h = '<table class="tds-od-table"><thead><tr>'
        + '<th style="width:36px">#</th>'
        + '<th>Loại</th>'
        + '<th>Mã Đơn</th>'
        + '<th>Khách Hàng</th>'
        + '<th>SĐT</th>'
        + '<th>Doanh Số</th>'
        + '<th>Lĩnh Vực</th>'
        + '<th>Ngày</th>'
        + '<th>NV</th>'
        + '<th>Affiliate</th>'
        + '<th style="width:36px">Lần</th>'
        + '</tr></thead><tbody>';

    orders.forEach(function(o, i) {
        var typeHtml = o.customer_type === 'moi'
            ? '<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(16,185,129,.15);color:#34d399">🆕 Mới</span>'
            : '<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(168,85,247,.15);color:#c084fc">🔄 Cũ</span>';
        var dateStr = o.order_date ? new Date(o.order_date).toLocaleDateString('vi-VN') : '—';
        var affHtml = o.referrer_name
            ? '<span style="color:#8b5cf6;font-weight:600;font-size:11px">🤝 ' + o.referrer_name + '</span>'
            : '<span style="color:#64748b;font-size:10px">—</span>';
        var catHtml = o.category_name
            ? '<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;background:rgba(15,118,110,.12);color:#14b8a6">' + o.category_name + '</span>'
            : '<span style="color:#64748b">—</span>';

        h += '<tr>'
            + '<td style="color:#94a3b8;font-weight:600">' + (i + 1) + '</td>'
            + '<td>' + typeHtml + '</td>'
            + '<td style="color:#60a5fa;font-weight:700;font-size:12px">' + (o.order_code || '—') + '</td>'
            + '<td style="font-weight:600">' + (o.customer_name || '—') + '</td>'
            + '<td style="font-family:monospace;font-size:12px">' + (o.customer_phone || '—') + '</td>'
            + '<td style="font-weight:800;color:#fbbf24;white-space:nowrap">' + _tdsOdFmtFull(o.revenue) + '</td>'
            + '<td>' + catHtml + '</td>'
            + '<td style="font-size:12px">' + dateStr + '</td>'
            + '<td style="font-size:11px;color:#94a3b8">' + (o.employee_name || '—') + '</td>'
            + '<td>' + affHtml + '</td>'
            + '<td style="text-align:center;font-weight:700;color:' + (o.order_count <= 1 ? '#34d399' : '#c084fc') + '">' + (o.order_count || 1) + '</td>'
            + '</tr>';
    });

    h += '</tbody></table>';
    body.innerHTML = h;
}
