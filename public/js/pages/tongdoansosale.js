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
h += _tdsCard('💰','TỔNG DOANH SỐ',_tdsFmtMoney(cur.total_revenue),s.trend_pct,'linear-gradient(135deg,#134e4a,#0f766e)');
h += _tdsCard('📦','TỔNG ĐƠN HÀNG',cur.total_orders+' đơn',s.trend_orders > 0 ? s.trend_orders : s.trend_orders,'linear-gradient(135deg,#1e1b4b,#4338ca)');
h += _tdsCard('📈','KỲ TRƯỚC',_tdsFmtMoney(prev.total_revenue),null,'linear-gradient(135deg,#78350f,#d97706)');
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
        h += '<div class="tds-chip" style="background:'+col+'11;color:'+col+';border:1.5px solid '+col+'33">';
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

function _tdsCard(icon,label,value,trend,bg){
var h = '<div class="tds-card" style="background:'+bg+';color:#fff">';
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
    h += '<tr style="cursor:pointer;border-bottom:1px solid #f1f5f9;background:'+(isExp?'#ecfdf5':'#fff')+';transition:background .2s" onclick="_tdsToggleTeam('+team.dept_id+')" onmouseover="this.style.background=\'#f0fdfa\'" onmouseout="this.style.background=\''+(isExp?'#ecfdf5':'#fff')+'\'">';
    h += '<td style="padding:12px 16px"><div class="tds-rank" style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff">'+(ti+1)+'</div></td>';
    h += '<td style="padding:12px 16px"><div style="font-weight:800;color:#134e4a;font-size:14px">'+(isExp?'▼':'▶')+' '+team.dept_name+'</div>';
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
            h += '<tr style="background:#fafffe;border-bottom:1px solid #f8fafc" onmouseover="this.style.background=\'#f0fdfa\'" onmouseout="this.style.background=\'#fafffe\'">';
            h += '<td style="padding:10px 16px"></td>';
            h += '<td style="padding:10px 16px;padding-left:44px"><span style="font-weight:600;color:#475569">'+emp.name+'</span><span style="font-size:11px;color:#94a3b8;margin-left:6px">'+(emp.role==='truong_phong'?'TP':'NV')+'</span></td>';
            catIds.forEach(function(cid){
                var cv = emp.current.by_category[cid];
                h += '<td style="padding:10px 10px;text-align:right;font-size:12px;color:#475569">'+(cv?_tdsFmtMoney(cv.revenue):'—')+'</td>';
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
