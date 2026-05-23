// ========== CẮT CHỈ & HOÀN THIỆN — Desktop SPA ==========
var _bpht={records:[],tree:null,filter:{year:null,month:null,finisher_id:null},search:'',page:1};
var _bphtOpen={};

function renderBophanhoanthienPage(content){
    if(!document.getElementById('_bphtS')){var st=document.createElement('style');st.id='_bphtS';
    st.textContent='.bpht-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.bpht-sb{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.bpht-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.bpht-main>*{flex-shrink:0}'
    +'.bpht-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#059669}'
    +'.bpht-sb-total{background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer}'
    +'.bpht-sb-year{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
    +'.bpht-sb-month{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;color:#059669}'
    +'.bpht-sb-month:hover{background:#ecfdf5}.bpht-sb-month.active{background:#d1fae5;font-weight:800}'
    +'.bpht-sb-item{padding:5px 16px 5px 42px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #fafafa;color:#64748b}'
    +'.bpht-sb-item:hover{background:#ecfdf5}.bpht-sb-item.active{background:#d1fae5;color:#059669;font-weight:800}'
    +'.bpht-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
    +'.bpht-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
    +'.bpht-ib.on-ok{background:#d1fae5;border-color:#10b981}.bpht-ib.on-err{background:#fee2e2;border-color:#ef4444}'
    +'.bpht-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800;letter-spacing:.5px}'
    +'.bpht-badge.gap{background:#fee2e2;color:#dc2626}.bpht-badge.gui{background:#dbeafe;color:#2563eb}.bpht-badge.chuan{background:#d1fae5;color:#059669}'
    +'.bpht-progress{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800}'
    +'@media(max-width:768px){.bpht-sb{display:none}}';
    document.head.appendChild(st);}
    content.innerHTML='<div class="bpht-wrap"><div class="bpht-sb" id="bphtSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpht-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="bphtInfo" style="font-size:12px"></div><div id="bphtStats" style="display:flex;gap:10px;flex:1;justify-content:center"></div><input id="bphtSearch" placeholder="🔍 Tìm SP / CSKH..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none"></div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bphtTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th>✅</th><th>⚠️</th><th>Ra DK</th><th>Hoàn Thiện</th><th>Tiến Độ</th><th>Tên SP</th><th>CSKH</th><th>SL</th><th>NV HT</th><th>NV May</th><th>Ảnh</th><th>TC Gửi</th><th>Ghi Chú</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="bphtTb"><tr><td colspan="15" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('bphtSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_bpht.search=document.getElementById('bphtSearch').value||'';_bphtRender();},300);});
    _bphtLoadAll();
}

async function _bphtLoadAll(){try{var tR=await apiCall('/api/finishing/tree');_bpht.tree=tR;_bphtRenderSb();await _bphtLoadRecs();}catch(e){console.error('[BPHT]',e);}}

function _bphtRenderSb(){var sb=document.getElementById('bphtSb');if(!sb||!_bpht.tree)return;var t=_bpht.tree,f=_bpht.filter;
var h='<div class="bpht-sb-title">────── ✅ Cắt Chỉ & Hoàn Thiện ──────</div>';
h+='<div class="bpht-sb-total" onclick="_bphtFilter()"><span>📦 Tổng đơn</span><span style="font-size:16px">'+(t.total||0)+'</span></div>';
if(t.tree)t.tree.forEach(function(yr){var yo=!!_bphtOpen['y'+yr.year];
h+='<div class="bpht-sb-year" onclick="_bphtTgl(\'y'+yr.year+'\')"><span>'+(yo?'▼':'▶')+' 📆 '+yr.year+'</span><span style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+yr.count+'</span></div>';
if(yo&&yr.months)yr.months.forEach(function(mo){var mk='m'+yr.year+'_'+mo.month,mo2=!!_bphtOpen[mk],mA=f.year==yr.year&&f.month==mo.month&&!f.finisher_id;
h+='<div class="bpht-sb-month'+(mA?' active':'')+'" onclick="event.stopPropagation();_bphtTgl(\''+mk+'\');_bphtFilter('+yr.year+','+mo.month+')"><span>'+(mo2?'▼':'▶')+' T'+String(mo.month).padStart(2,'0')+'</span><span>'+mo.count+'</span></div>';
if(mo2&&mo.finishers)mo.finishers.forEach(function(p){var pA=f.year==yr.year&&f.month==mo.month&&f.finisher_id==p.id;
h+='<div class="bpht-sb-item'+(pA?' active':'')+'" onclick="event.stopPropagation();_bphtFilter('+yr.year+','+mo.month+','+p.id+')"><span>👤 '+(p.name||'Chưa PC')+'</span><span>'+p.count+'</span></div>';});
});});sb.innerHTML=h;}

function _bphtTgl(k){_bphtOpen[k]=!_bphtOpen[k];_bphtRenderSb();}
function _bphtFilter(y,m,f){_bpht.filter={year:y||null,month:m||null,finisher_id:f||null};_bphtRenderSb();_bphtLoadRecs();}

async function _bphtLoadRecs(){var f=_bpht.filter,qs='?_=1';
if(f.year)qs+='&year='+f.year;if(f.month)qs+='&month='+f.month;if(f.finisher_id)qs+='&finisher_id='+f.finisher_id;
try{var res=await apiCall('/api/finishing/records'+qs);_bpht.records=res.records||[];_bphtRender();}catch(e){console.error('[BPHT]',e);}}

function _bphtFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}

function _bphtProgress(exp, done) {
    if (!exp) return '<span class="bpht-progress" style="background:#f1f5f9;color:#94a3b8">— Chưa có DK</span>';
    var expD = new Date(exp.split('T')[0]), today = new Date();
    today.setHours(0,0,0,0); expD.setHours(0,0,0,0);
    if (done) {
        var doneD = new Date(done.split('T')[0]); doneD.setHours(0,0,0,0);
        var diff = Math.round((doneD - expD) / 86400000);
        if (diff < 0) return '<span class="bpht-progress" style="background:#d1fae5;color:#059669">⚡ Nhanh '+Math.abs(diff)+' ngày</span>';
        if (diff === 0) return '<span class="bpht-progress" style="background:#dbeafe;color:#2563eb">✅ Đúng hạn</span>';
        return '<span class="bpht-progress" style="background:#fee2e2;color:#dc2626">🔴 Trễ '+diff+' ngày</span>';
    }
    var diff2 = Math.round((expD - today) / 86400000);
    if (diff2 > 0) return '<span class="bpht-progress" style="background:#fef3c7;color:#d97706">⏳ Còn '+diff2+' ngày</span>';
    if (diff2 === 0) return '<span class="bpht-progress" style="background:#fef3c7;color:#f59e0b">⏰ Hôm nay</span>';
    return '<span class="bpht-progress" style="background:#fee2e2;color:#dc2626">🔴 Quá '+Math.abs(diff2)+' ngày</span>';
}

function _bphtShip(s) {
    if (s === 'gap') return '<span class="bpht-badge gap">🔴 GẤP</span>';
    if (s === 'gui') return '<span class="bpht-badge gui">📦 GỬI</span>';
    return '<span class="bpht-badge chuan">✅ CHUẨN</span>';
}

function _bphtRender(){
    var all=_bpht.records.slice();
    if(_bpht.search){var q=_bpht.search.toLowerCase();all=all.filter(function(r){return(r.product_name||'').toLowerCase().indexOf(q)>=0||(r.cskh_name||'').toLowerCase().indexOf(q)>=0;});}
    var tot=all.length;
    var tb=document.getElementById('bphtTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="15"><div class="empty-state"><div class="icon">✅</div><h3>Chưa có đơn hoàn thiện</h3></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var cI=r.is_completed?'✅':'⬜',cC=r.is_completed?' on-ok':'',cA=r.is_completed?'undo_complete':'complete';
        var eI=r.error_reported?'⚠️':'⬜',eC=r.error_reported?' on-err':'';
        var imgs='—';try{var ia=JSON.parse(r.finish_images||'[]');if(ia.length)imgs='📸 '+ia.length;}catch(e){}
        var upd='';if(r.last_update_at){upd=_bphtFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#059669;font-size:9px">'+r.last_update_by+'</span>';}
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center"><button class="bpht-ib'+cC+'" onclick="_bphtTog('+r.id+',\''+cA+'\')" title="Hoàn thành">'+cI+'</button></td>'
        +'<td style="text-align:center"><button class="bpht-ib'+eC+'" onclick="_bphtErr()" title="Báo lỗi">'+eI+'</button></td>'
        +'<td style="font-size:10px">'+_bphtFD(r.expected_date)+'</td>'
        +'<td style="font-size:10px;color:'+(r.done_date?'#059669':'#94a3b8')+'">'+_bphtFD(r.done_date)+'</td>'
        +'<td>'+_bphtProgress(r.expected_date, r.done_date)+'</td>'
        +'<td style="font-weight:600;color:#1e293b">'+(r.product_name||r.order_code||'—')+'</td>'
        +'<td style="font-size:10px;color:#2563eb;font-weight:600">'+(r.cskh_name||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#059669">'+(r.quantity||'—')+'</td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+(r.finisher_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#6b7280">'+(r.sewer_name||'—')+'</td>'
        +'<td style="text-align:center;font-size:10px">'+imgs+'</td>'
        +'<td>'+_bphtShip(r.shipping_standard)+'</td>'
        +'<td style="font-size:9px;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.notes||'—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';}).join('');}
    var el=document.getElementById('bphtInfo');if(el){var parts=['✅ Cắt Chỉ & Hoàn Thiện'];if(_bpht.filter.year)parts.push('📆 '+_bpht.filter.year);if(_bpht.filter.month)parts.push('🗓️ T'+_bpht.filter.month);
    el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">'+parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ')+' — <span style="color:#bbf7d0;font-weight:900">'+tot+'</span> đơn</div>';}
    var sc=document.getElementById('bphtStats');if(sc){
    var prog=all.filter(function(r){return r.is_completed&&!r.done_date;}).length,done=all.filter(function(r){return r.done_date;}).length,err=all.filter(function(r){return r.error_reported;}).length;
    sc.innerHTML='<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #05966930"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG</div><div style="font-size:15px;font-weight:900">'+tot+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #3b82f630"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">🔄 ĐANG LÀM</div><div style="font-size:15px;font-weight:900">'+prog+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#059669,#047857);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #05966930"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">✅ XONG</div><div style="font-size:15px;font-weight:900">'+done+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #ef444430"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">⚠️ LỖI</div><div style="font-size:15px;font-weight:900">'+err+'</div></div>';}
}

async function _bphtTog(id,action){try{await apiCall('/api/finishing/toggle/'+id,'POST',{action});showToast('✅ Cập nhật');await _bphtLoadAll();}catch(e){showToast(e.message||'Lỗi','error');}}
function _bphtErr(){if(typeof navigate==='function'){navigate('don-loi-khach-hang');showToast('📋 Chuyển sang Đơn Lỗi');}}
