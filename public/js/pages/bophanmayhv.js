// ========== BỘ PHẬN MAY — Desktop SPA ==========
var _bpm={records:[],tree:null,filter:{year:null,month:null,sewer_id:null,contractor_id:null},search:'',page:1,ps:100,contractors:[]};
var _bpmOpen={};

function renderBophanmayPage(content){
    if(!document.getElementById('_bpmS')){var st=document.createElement('style');st.id='_bpmS';
    st.textContent='.bpm-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.bpm-sb{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.bpm-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.bpm-main>*{flex-shrink:0}'
    +'.bpm-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#0d9488}'
    +'.bpm-sb-total{background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer}'
    +'.bpm-sb-year{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
    +'.bpm-sb-month{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;color:#0d9488}'
    +'.bpm-sb-month:hover{background:#f0fdfa}.bpm-sb-month.active{background:#ccfbf1;font-weight:800}'
    +'.bpm-sb-item{padding:5px 16px 5px 42px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #fafafa;color:#64748b}'
    +'.bpm-sb-item:hover{background:#f0fdfa}.bpm-sb-item.active{background:#ccfbf1;color:#0d9488;font-weight:800}'
    +'.bpm-sb-label{padding:4px 16px 4px 36px;font-size:9px;font-weight:800;color:#5eead4;letter-spacing:1px;background:#f0fdfa}'
    +'.bpm-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
    +'.bpm-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
    +'.bpm-ib.on-rpt{background:#ccfbf1;border-color:#14b8a6}.bpm-ib.on-err{background:#fee2e2;border-color:#ef4444}.bpm-ib.on-sal{background:#fef3c7;border-color:#f59e0b}'
    +'@media(max-width:768px){.bpm-sb{display:none}}';
    document.head.appendChild(st);}
    content.innerHTML='<div class="bpm-wrap"><div class="bpm-sb" id="bpmSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpm-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="bpmInfo" style="font-size:12px"></div><div id="bpmStats" style="display:flex;gap:10px;flex:1;justify-content:center"></div><input id="bpmSearch" placeholder="🔍 Tìm SP..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none">'
    +(window._currentUser && window._currentUser.role === 'giam_doc' ? '<button onclick="_bpmManageContractors()" style="padding:6px 14px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-left:8px;transition:all .2s" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">🏭 Quản Lý Gia Công May</button>' : '')
    +'</div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bpmTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th>📋</th><th>⚠️</th><th>📄</th><th>💰</th><th>✏️</th><th>Ra DK</th><th>BG May</th><th>Xong</th><th>NV May</th><th>Tên SP</th><th>SL</th><th>Giá Gốc</th><th>Giá KT</th><th>Lương</th><th>Chi Tiết</th><th>KK</th><th>May Chung</th><th>Ảnh</th><th>Ghi Chú</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="bpmTb"><tr><td colspan="21" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('bpmSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_bpm.search=document.getElementById('bpmSearch').value||'';_bpm.page=1;_bpmRender();},300);});
    _bpmLoadAll();
}

async function _bpmLoadAll(){try{var[tR,cR]=await Promise.all([apiCall('/api/sewing/tree'),apiCall('/api/sewing/contractors')]);_bpm.tree=tR;_bpm.contractors=cR.contractors||[];_bpmRenderSb();await _bpmLoadRecs();}catch(e){console.error('[BPM]',e);}}

function _bpmRenderSb(){var sb=document.getElementById('bpmSb');if(!sb||!_bpm.tree)return;var t=_bpm.tree,f=_bpm.filter;
var h='<div class="bpm-sb-title">───── 🧵 Bộ Phận May ─────</div>';
h+='<div class="bpm-sb-total" onclick="_bpmFilter()"><span>📦 Tổng đơn may</span><span style="font-size:16px">'+(t.total||0)+'</span></div>';
if(t.tree)t.tree.forEach(function(yr){var yo=!!_bpmOpen['y'+yr.year];
h+='<div class="bpm-sb-year" onclick="_bpmTgl(\'y'+yr.year+'\')"><span>'+(yo?'▼':'▶')+' 📆 '+yr.year+'</span><span style="background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+yr.count+'</span></div>';
if(yo&&yr.months)yr.months.forEach(function(mo){var mk='m'+yr.year+'_'+mo.month,mo2=!!_bpmOpen[mk],mA=f.year==yr.year&&f.month==mo.month&&!f.sewer_id&&!f.contractor_id;
h+='<div class="bpm-sb-month'+(mA?' active':'')+'" onclick="event.stopPropagation();_bpmTgl(\''+mk+'\');_bpmFilter('+yr.year+','+mo.month+')"><span>'+(mo2?'▼':'▶')+' T'+String(mo.month).padStart(2,'0')+'</span><span>'+mo.count+'</span></div>';
if(mo2){if(mo.sewers&&mo.sewers.length){h+='<div class="bpm-sb-label">── NV NỘI BỘ ──</div>';
mo.sewers.forEach(function(p){var pA=f.year==yr.year&&f.month==mo.month&&f.sewer_id==p.id;
h+='<div class="bpm-sb-item'+(pA?' active':'')+'" onclick="event.stopPropagation();_bpmFilter('+yr.year+','+mo.month+','+p.id+')"><span>👤 '+(p.name||'Chưa PC')+'</span><span>'+p.count+'</span></div>';});}
if(mo.contractors&&mo.contractors.length){h+='<div class="bpm-sb-label">── GIA CÔNG ──</div>';
mo.contractors.forEach(function(c){var cA=f.year==yr.year&&f.month==mo.month&&f.contractor_id==c.id;
h+='<div class="bpm-sb-item'+(cA?' active':'')+'" onclick="event.stopPropagation();_bpmFilter('+yr.year+','+mo.month+',null,'+c.id+')"><span>🏭 '+c.name+'</span><span>'+c.count+'</span></div>';});}
}});});sb.innerHTML=h;}

function _bpmTgl(k){_bpmOpen[k]=!_bpmOpen[k];_bpmRenderSb();}
function _bpmFilter(y,m,s,c){_bpm.filter={year:y||null,month:m||null,sewer_id:s||null,contractor_id:c||null};_bpm.page=1;_bpmRenderSb();_bpmLoadRecs();}

async function _bpmLoadRecs(){var f=_bpm.filter,qs='?_=1';
if(f.year)qs+='&year='+f.year;if(f.month)qs+='&month='+f.month;
if(f.sewer_id)qs+='&sewer_id='+f.sewer_id;if(f.contractor_id)qs+='&contractor_id='+f.contractor_id;
try{var res=await apiCall('/api/sewing/records'+qs);_bpm.records=res.records||[];_bpm.page=1;_bpmRender();}catch(e){console.error('[BPM]',e);}}

function _bpmFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}
function _bpmFN(n){if(!n&&n!==0)return'—';return Number(n).toLocaleString('vi-VN');}

function _bpmRender(){
    var all=_bpm.records.slice();
    if(_bpm.search){var q=_bpm.search.toLowerCase();all=all.filter(function(r){return(r.product_name||'').toLowerCase().indexOf(q)>=0||(r.order_code||'').toLowerCase().indexOf(q)>=0;});}
    var tot=all.length;
    var tb=document.getElementById('bpmTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="21"><div class="empty-state"><div class="icon">🧵</div><h3>Chưa có đơn may</h3></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var rI=r.is_reported?'📋':'⬜',rC=r.is_reported?' on-rpt':'',rA=r.is_reported?'undo_report':'report';
        var eI=r.error_reported?'⚠️':'⬜',eC=r.error_reported?' on-err':'';
        var sI=r.salary_approved?'💰':'⬜',sC=r.salary_approved?' on-sal':'',sA=r.salary_approved?'undo_salary':'approve_salary';
        var nvN=r.contractor_id?(r.contractor_name?'🏭 '+r.contractor_name:'🏭 Gia công'):(r.sewer_name||'—');
        var imgs='—';try{var ia=JSON.parse(r.finish_images||'[]');if(ia.length)imgs='📸 '+ia.length;}catch(e){}
        var upd='';if(r.last_update_at){upd=_bpmFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#0d9488;font-size:9px">'+r.last_update_by+'</span>';}
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center"><button class="bpm-ib'+rC+'" onclick="_bpmTog('+r.id+',\''+rA+'\')" title="Báo cáo">'+rI+'</button></td>'
        +'<td style="text-align:center"><button class="bpm-ib'+eC+'" onclick="_bpmErr('+r.id+')" title="Báo lỗi">'+eI+'</button></td>'
        +'<td style="text-align:center"><button class="bpm-ib" onclick="_bpmView('+r.id+')" title="Xem phiếu">📄</button></td>'
        +'<td style="text-align:center"><button class="bpm-ib'+sC+'" onclick="_bpmTog('+r.id+',\''+sA+'\')" title="Lương">'+sI+'</button></td>'
        +'<td style="text-align:center"><button class="bpm-ib" onclick="_bpmEdit('+r.id+')" title="Chi tiết">✏️</button></td>'
        +'<td style="font-size:10px">'+_bpmFD(r.expected_date)+'</td>'
        +'<td style="font-size:10px">'+_bpmFD(r.handover_date)+'</td>'
        +'<td style="font-size:10px;color:'+(r.done_date?'#059669':'#94a3b8')+'">'+_bpmFD(r.done_date)+'</td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+nvN+'</td>'
        +'<td style="font-weight:600;color:#1e293b">'+(r.product_name||r.order_code||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#0d9488">'+(r.quantity||'—')+'</td>'
        +'<td style="text-align:right;font-size:10px">'+_bpmFN(r.base_price)+'</td>'
        +'<td style="text-align:right;font-size:10px;color:#dc2626;font-weight:700">'+_bpmFN(r.checked_price)+'</td>'
        +'<td style="text-align:right;font-weight:800;color:#f59e0b">'+_bpmFN(r.salary)+'</td>'
        +'<td style="font-size:9px;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.sewing_details||'—')+'</td>'
        +'<td style="font-size:9px;max-width:60px;overflow:hidden;text-overflow:ellipsis">'+(r.inventory_notes||'—')+'</td>'
        +'<td style="font-size:9px">'+(r.shared_sewing||'—')+'</td>'
        +'<td style="text-align:center;font-size:10px">'+imgs+'</td>'
        +'<td style="font-size:9px;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.notes||'—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';}).join('');}
    // Stats
    var el=document.getElementById('bpmInfo');if(el){var parts=['🧵 Bộ Phận May'];if(_bpm.filter.year)parts.push('📆 '+_bpm.filter.year);if(_bpm.filter.month)parts.push('🗓️ T'+_bpm.filter.month);
    el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">'+parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ')+' — <span style="color:#99f6e4;font-weight:900">'+tot+'</span> đơn</div>';}
    var sc=document.getElementById('bpmStats');if(sc){
    var prog=all.filter(function(r){return r.is_reported&&!r.done_date;}).length,done=all.filter(function(r){return r.done_date;}).length,appr=all.filter(function(r){return r.salary_approved;}).length;
    sc.innerHTML='<div style="background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #0d948830"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG</div><div style="font-size:15px;font-weight:900">'+tot+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #3b82f630"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">🔄 ĐANG MAY</div><div style="font-size:15px;font-weight:900">'+prog+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #05966930"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">✅ XONG</div><div style="font-size:15px;font-weight:900">'+done+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #f59e0b30"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">💰 LƯƠNG</div><div style="font-size:15px;font-weight:900">'+appr+'</div></div>';}
}

async function _bpmTog(id,action){try{await apiCall('/api/sewing/toggle/'+id,'POST',{action});showToast('✅ Cập nhật');await _bpmLoadAll();}catch(e){showToast(e.message||'Lỗi','error');}}
function _bpmErr(id){if(typeof navigate==='function'){navigate('don-loi-khach-hang');showToast('📋 Chuyển sang Đơn Lỗi');}}
function _bpmView(id){var r=_bpm.records.find(function(x){return x.id===id;});if(!r)return;
var imgs='';try{var ia=JSON.parse(r.finish_images||'[]');if(ia.length)imgs=ia.map(function(s){return'<img src="'+s+'" style="width:100px;height:100px;object-fit:cover;border-radius:8px;margin:2px">';}).join('');}catch(e){}
showToast('📄 Phiếu #'+id+': '+(r.product_name||'SP')+' — SL:'+r.quantity+' — Lương:'+_bpmFN(r.salary));}
function _bpmEdit(id){showToast('✏️ Chức năng edit chi tiết — phát triển thêm');}

// ========== GIA CÔNG MAY MANAGEMENT (Giám Đốc only) ==========
async function _bpmManageContractors() {
    try {
        var res = await apiCall('/api/sewing/contractors');
        var cons = res.contractors || [];

        var html = '<div style="padding:20px;font-family:\'Inter\',sans-serif">';
        html += '<h3 style="margin:0 0 16px;color:#0f172a">🏭 Quản Lý Gia Công May</h3>';

        // Add new form
        html += '<div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:20px;border:1px solid #e2e8f0">';
        html += '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px">➕ Thêm Gia Công May Mới</div>';
        html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
        html += '<input id="_bpmConName" placeholder="Tên gia công..." style="flex:1;min-width:150px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">';
        html += '<input id="_bpmConPhone" placeholder="SĐT (tuỳ chọn)" style="width:120px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">';
        html += '<input id="_bpmConNotes" placeholder="Ghi chú" style="width:150px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">';
        html += '<button onclick="_bpmConAdd()" style="padding:8px 16px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer">Thêm</button>';
        html += '</div></div>';

        // List existing
        if (cons.length) {
            html += '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9">';
            html += '<th style="padding:8px;text-align:left">#</th><th style="padding:8px;text-align:left">Tên</th><th style="padding:8px;text-align:left">SĐT</th><th style="padding:8px;text-align:left">Ghi chú</th><th style="padding:8px;text-align:center">Thao tác</th></tr></thead><tbody>';
            cons.forEach(function(c, i) {
                html += '<tr style="border-bottom:1px solid #e2e8f0">';
                html += '<td style="padding:8px;color:#94a3b8;font-weight:700">' + (i+1) + '</td>';
                html += '<td style="padding:8px;font-weight:700;color:#1e293b">🏭 ' + c.name + '</td>';
                html += '<td style="padding:8px;color:#6b7280">' + (c.phone || '—') + '</td>';
                html += '<td style="padding:8px;color:#6b7280;max-width:120px;overflow:hidden;text-overflow:ellipsis">' + (c.notes || '—') + '</td>';
                html += '<td style="padding:8px;text-align:center">';
                html += '<button onclick="_bpmConDel(' + c.id + ')" style="padding:4px 10px;border:1px solid #fca5a5;border-radius:6px;font-size:10px;cursor:pointer;background:#fef2f2;color:#dc2626;font-weight:600">🗑️ Xóa</button>';
                html += '</td></tr>';
            });
            html += '</tbody></table>';
        } else {
            html += '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px">Chưa có Gia Công May nào</div>';
        }

        html += '<div style="padding:16px 0 0;text-align:right"><button onclick="document.getElementById(\'_bpmConOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569">Đóng</button></div>';
        html += '</div>';

        var old = document.getElementById('_bpmConOverlay'); if (old) old.remove();
        var ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto;animation:qlxFadeIn .2s;transition:opacity .25s ease';
        ov.id = '_bpmConOverlay';
        ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:650px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);animation:qlxSlideUp .3s;margin-bottom:40px">' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _bpmConAdd() {
    var name = (document.getElementById('_bpmConName') || {}).value || '';
    var phone = (document.getElementById('_bpmConPhone') || {}).value || '';
    var notes = (document.getElementById('_bpmConNotes') || {}).value || '';
    if (!name.trim()) return showToast('Nhập tên gia công', 'error');
    try {
        await apiCall('/api/sewing/contractors', 'POST', { name: name.trim(), phone: phone.trim(), notes: notes.trim() });
        showToast('✅ Đã thêm Gia Công May');
        _bpmManageContractors();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bpmConDel(id) {
    if (!confirm('Xóa Gia Công May này?')) return;
    try {
        await apiCall('/api/sewing/contractors/' + id, 'DELETE');
        showToast('✅ Đã xóa');
        _bpmManageContractors();
    } catch(e) { showToast(e.message, 'error'); }
}
