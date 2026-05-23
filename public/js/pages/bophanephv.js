// ========== BỘ PHẬN ÉP — Desktop SPA ==========
var _bpe={records:[],tree:null,filter:{year:null,month:null,presser_id:null},search:''};
var _bpeOpen={};

function renderBophanepPage(content){
    if(!document.getElementById('_bpeS')){var st=document.createElement('style');st.id='_bpeS';
    st.textContent='.bpe-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.bpe-sb{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.bpe-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.bpe-main>*{flex-shrink:0}'
    +'.bpe-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#ea580c}'
    +'.bpe-sb-total{background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer}'
    +'.bpe-sb-year{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
    +'.bpe-sb-month{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;color:#ea580c}'
    +'.bpe-sb-month:hover{background:#fff7ed}.bpe-sb-month.active{background:#ffedd5;font-weight:800}'
    +'.bpe-sb-item{padding:5px 16px 5px 42px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #fafafa;color:#64748b}'
    +'.bpe-sb-item:hover{background:#fff7ed}.bpe-sb-item.active{background:#ffedd5;color:#ea580c;font-weight:800}'
    +'.bpe-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
    +'.bpe-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
    +'.bpe-ib.on-rpt{background:#ffedd5;border-color:#f97316}.bpe-ib.on-sal{background:#fef3c7;border-color:#f59e0b}.bpe-ib.on-err{background:#fee2e2;border-color:#ef4444}'
    +'.bpe-pos{font-size:9px;text-align:center;font-weight:700;color:#ea580c}'
    +'@media(max-width:768px){.bpe-sb{display:none}}';
    document.head.appendChild(st);}
    content.innerHTML='<div class="bpe-wrap"><div class="bpe-sb" id="bpeSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpe-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="bpeInfo" style="font-size:12px"></div><div id="bpeStats" style="display:flex;gap:10px;flex:1;justify-content:center"></div><input id="bpeSearch" placeholder="🔍 Tìm SP / CSKH..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none"></div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bpeTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th>🔥</th><th>💰</th><th>⚠️</th><th>Ngày Ép</th><th>NV Ép</th><th>Tên SP</th><th>CSKH</th><th>SL Đơn</th><th>SL Ép</th><th>Lương</th>'
    +'<th title="Ngực/Tay/Tạp Dề/Vải Mũ">Ngực/Tay</th><th title="Lưng/Bụng/Sườn/Áo Sẵn/Mũ Sẵn">Lưng/Bụng</th><th title="Bảo Hộ/Bếp/Sơ Mi">BH/Bếp</th><th title="Đóng Gói/Cổ Bẻ Vải">ĐG/Cổ Bẻ</th><th>VT Khác</th>'
    +'<th>Ảnh</th><th>Ghi Chú</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="bpeTb"><tr><td colspan="19" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('bpeSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_bpe.search=document.getElementById('bpeSearch').value||'';_bpeRender();},300);});
    _bpeLoadAll();
}

async function _bpeLoadAll(){try{var tR=await apiCall('/api/pressing/tree');_bpe.tree=tR;_bpeRenderSb();await _bpeLoadRecs();}catch(e){console.error('[BPE]',e);}}

function _bpeRenderSb(){var sb=document.getElementById('bpeSb');if(!sb||!_bpe.tree)return;var t=_bpe.tree,f=_bpe.filter;
var h='<div class="bpe-sb-title">────── 🔥 Bộ Phận Ép ──────</div>';
h+='<div class="bpe-sb-total" onclick="_bpeFilter()"><span>📦 Tổng đơn ép</span><span style="font-size:16px">'+(t.total||0)+'</span></div>';
if(t.tree)t.tree.forEach(function(yr){var yo=!!_bpeOpen['y'+yr.year];
h+='<div class="bpe-sb-year" onclick="_bpeTgl(\'y'+yr.year+'\')"><span>'+(yo?'▼':'▶')+' 📆 '+yr.year+'</span><span style="background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+yr.count+'</span></div>';
if(yo&&yr.months)yr.months.forEach(function(mo){var mk='m'+yr.year+'_'+mo.month,mo2=!!_bpeOpen[mk],mA=f.year==yr.year&&f.month==mo.month&&!f.presser_id;
h+='<div class="bpe-sb-month'+(mA?' active':'')+'" onclick="event.stopPropagation();_bpeTgl(\''+mk+'\');_bpeFilter('+yr.year+','+mo.month+')"><span>'+(mo2?'▼':'▶')+' T'+String(mo.month).padStart(2,'0')+'</span><span>'+mo.count+'</span></div>';
if(mo2&&mo.pressers)mo.pressers.forEach(function(p){var pA=f.year==yr.year&&f.month==mo.month&&f.presser_id==p.id;
h+='<div class="bpe-sb-item'+(pA?' active':'')+'" onclick="event.stopPropagation();_bpeFilter('+yr.year+','+mo.month+','+p.id+')"><span>👤 '+(p.name||'Chưa PC')+'</span><span>'+p.count+'</span></div>';});
});});sb.innerHTML=h;}

function _bpeTgl(k){_bpeOpen[k]=!_bpeOpen[k];_bpeRenderSb();}
function _bpeFilter(y,m,p){_bpe.filter={year:y||null,month:m||null,presser_id:p||null};_bpeRenderSb();_bpeLoadRecs();}

async function _bpeLoadRecs(){var f=_bpe.filter,qs='?_=1';
if(f.year)qs+='&year='+f.year;if(f.month)qs+='&month='+f.month;if(f.presser_id)qs+='&presser_id='+f.presser_id;
try{var res=await apiCall('/api/pressing/records'+qs);_bpe.records=res.records||[];_bpeRender();}catch(e){console.error('[BPE]',e);}}

function _bpeFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}
function _bpeFN(n){if(!n&&n!==0)return'—';return Number(n).toLocaleString('vi-VN');}

function _bpeRender(){
    var all=_bpe.records.slice();
    if(_bpe.search){var q=_bpe.search.toLowerCase();all=all.filter(function(r){return(r.product_name||'').toLowerCase().indexOf(q)>=0||(r.cskh_name||'').toLowerCase().indexOf(q)>=0;});}
    var tot=all.length;
    var tb=document.getElementById('bpeTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="19"><div class="empty-state"><div class="icon">🔥</div><h3>Chưa có đơn ép</h3></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var rI=r.is_reported?'🔥':'⬜',rC=r.is_reported?' on-rpt':'',rA=r.is_reported?'undo_report':'report';
        var sI=r.salary_approved?'💰':'⬜',sC=r.salary_approved?' on-sal':'',sA=r.salary_approved?'undo_salary':'approve_salary';
        var eI=r.error_reported?'⚠️':'⬜',eC=r.error_reported?' on-err':'';
        var imgs='—';try{var ia=JSON.parse(r.press_images||'[]');if(ia.length)imgs='📸 '+ia.length;}catch(e){}
        var upd='';if(r.last_update_at){upd=_bpeFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#ea580c;font-size:9px">'+r.last_update_by+'</span>';}
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center"><button class="bpe-ib'+rC+'" onclick="_bpeTog('+r.id+',\''+rA+'\')" title="Báo cáo ép">'+rI+'</button></td>'
        +'<td style="text-align:center"><button class="bpe-ib'+sC+'" onclick="_bpeTog('+r.id+',\''+sA+'\')" title="Lương">'+sI+'</button></td>'
        +'<td style="text-align:center"><button class="bpe-ib'+eC+'" onclick="_bpeErr()" title="Báo lỗi">'+eI+'</button></td>'
        +'<td style="font-size:10px">'+_bpeFD(r.press_date)+'</td>'
        +'<td style="font-size:10px;color:#ea580c;font-weight:600">'+(r.presser_name||'—')+'</td>'
        +'<td style="font-weight:600;color:#1e293b">'+(r.product_name||r.order_code||'—')+'</td>'
        +'<td style="font-size:10px;color:#2563eb;font-weight:600">'+(r.cskh_name||'—')+'</td>'
        +'<td style="text-align:center;font-weight:600">'+(r.order_quantity||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#ea580c">'+(r.press_quantity||'—')+'</td>'
        +'<td style="text-align:right;font-weight:800;color:#f59e0b">'+_bpeFN(r.press_salary)+'</td>'
        +'<td class="bpe-pos">'+(r.pos_chest_arm||'—')+'</td>'
        +'<td class="bpe-pos">'+(r.pos_back_belly||'—')+'</td>'
        +'<td class="bpe-pos">'+(r.pos_protective||'—')+'</td>'
        +'<td class="bpe-pos">'+(r.pos_packaging||'—')+'</td>'
        +'<td style="font-size:9px;max-width:60px;overflow:hidden;text-overflow:ellipsis">'+(r.pos_other||'—')+'</td>'
        +'<td style="text-align:center;font-size:10px">'+imgs+'</td>'
        +'<td style="font-size:9px;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.notes||'—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';}).join('');}
    var el=document.getElementById('bpeInfo');if(el){var parts=['🔥 Bộ Phận Ép'];if(_bpe.filter.year)parts.push('📆 '+_bpe.filter.year);if(_bpe.filter.month)parts.push('🗓️ T'+_bpe.filter.month);
    el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">'+parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ')+' — <span style="color:#fed7aa;font-weight:900">'+tot+'</span> đơn</div>';}
    var sc=document.getElementById('bpeStats');if(sc){
    var rpt=all.filter(function(r){return r.is_reported;}).length,appr=all.filter(function(r){return r.salary_approved;}).length,err=all.filter(function(r){return r.error_reported;}).length;
    sc.innerHTML='<div style="background:linear-gradient(135deg,#ea580c,#f97316);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #ea580c30"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG</div><div style="font-size:15px;font-weight:900">'+tot+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#f97316,#fb923c);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #f9731630"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">🔥 BÁO CÁO</div><div style="font-size:15px;font-weight:900">'+rpt+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #f59e0b30"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">💰 LƯƠNG</div><div style="font-size:15px;font-weight:900">'+appr+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #ef444430"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">⚠️ LỖI</div><div style="font-size:15px;font-weight:900">'+err+'</div></div>';}
}

async function _bpeTog(id,action){try{await apiCall('/api/pressing/toggle/'+id,'POST',{action});showToast('✅ Cập nhật');await _bpeLoadAll();}catch(e){showToast(e.message||'Lỗi','error');}}
function _bpeErr(){if(typeof navigate==='function'){navigate('don-loi-khach-hang');showToast('📋 Chuyển sang Đơn Lỗi');}}
