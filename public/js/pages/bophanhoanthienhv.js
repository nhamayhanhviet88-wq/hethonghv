// ========== CẮT CHỈ & HOÀN THIỆN — Desktop SPA ==========
var _bpht={records:[],tree:null,filter:{year:null,month:null,finisher_id:null},search:'',page:1};
var _bphtOpen={};
var _bphtState={currentRecordId:null,finishImages:[],staff:[]};

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
    +'.qlx-cl-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}'
    +'.qlx-cl-popup{background:#fff;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s}'
    +'@keyframes qlxSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}'
    +'@media(max-width:768px){.bpht-sb{display:none}}';
    document.head.appendChild(st);}
    
    var isGD = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
    var setupBtn2 = isGD ? '<button onclick="_bphtDisplaySetup()" style="padding:6px 12px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;color:#334155;transition:all 0.15s;margin-right:8px;" onmouseover="this.style.borderColor=\'#059669\';this.style.color=\'#059669\';" onmouseout="this.style.borderColor=\'#cbd5e1\';this.style.color=\'#334155\';">⚙️ Setup Hoàn Thiện</button>' : '';
    var setupBtn = isGD ? (setupBtn2 + '<button onclick="_bphtChecklistSetup()" style="padding:6px 12px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;color:#334155;transition:all 0.15s;" onmouseover="this.style.borderColor=\'#059669\';this.style.color=\'#059669\';" onmouseout="this.style.borderColor=\'#cbd5e1\';this.style.color=\'#334155\';">⚙️ Setup Checklist Hoàn Thiện</button>') : '';

    content.innerHTML='<div class="bpht-wrap"><div class="bpht-sb" id="bphtSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpht-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="bphtInfo" style="font-size:12px"></div><div id="bphtStats" style="display:flex;gap:10px;flex:1;justify-content:center"></div>'+setupBtn+'<input id="bphtSearch" placeholder="🔍 Tìm SP / CSKH..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none"></div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bphtTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th>✅</th><th>⚠️</th><th>Hạn gửi hàng</th><th>Hoàn Thiện</th><th>Tiến Độ</th><th>Tên SP</th><th>CSKH</th><th>SL</th><th>NV HT</th><th>NV May</th><th>Ảnh</th><th>TC Gửi</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="bphtTb"><tr><td colspan="14" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
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
if(mo2&&mo.finishers)mo.finishers.forEach(function(p){var pId=p.id||'unassigned';var pA=f.year==yr.year&&f.month==mo.month&&f.finisher_id==pId;
h+='<div class="bpht-sb-item'+(pA?' active':'')+'" onclick="event.stopPropagation();_bphtFilter('+yr.year+','+mo.month+',\''+pId+'\')"><span>👤 '+(p.name||'Chưa PC')+'</span><span>'+p.count+'</span></div>';});
});});sb.innerHTML=h;}

function _bphtTgl(k){_bphtOpen[k]=!_bphtOpen[k];_bphtRenderSb();}
function _bphtFilter(y,m,f){_bpht.filter={year:y||null,month:m||null,finisher_id:f!==undefined?f:null};_bphtRenderSb();_bphtLoadRecs();}

async function _bphtLoadRecs(){var f=_bpht.filter,qs='?_=1';
if(f.year)qs+='&year='+f.year;if(f.month)qs+='&month='+f.month;if(f.finisher_id)qs+='&finisher_id='+f.finisher_id;
try{var res=await apiCall('/api/finishing/records'+qs);_bpht.records=res.records||[];_bphtRender();}catch(e){console.error('[BPHT]',e);}}

function _bphtFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}

function _bphtGetRaDukien(r) {
    var targetDateStr = r.expected_ship_date || r.expected_date;
    if (!targetDateStr) return '—';
    try {
        var dt = new Date(targetDateStr);
        var day = String(dt.getDate()).padStart(2, '0');
        var month = String(dt.getMonth() + 1).padStart(2, '0');
        var year = dt.getFullYear();
        if (r.shipping_standard === 'chuan') {
            var timeStr = '';
            if (r.standard_delivery_time) {
                timeStr = r.standard_delivery_time.trim();
            } else {
                var hrs = String(dt.getHours()).padStart(2, '0');
                var mins = String(dt.getMinutes()).padStart(2, '0');
                timeStr = hrs + ':' + mins;
            }
            return timeStr + ' ' + day + '/' + month + '/' + year;
        } else {
            return day + '/' + month + '/' + year;
        }
    } catch(e) {
        return _bphtFD(targetDateStr);
    }
}

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

function _bphtCleanProdName(r) {
    if (!r) return 'Sản phẩm';
    var name = r.cut_product_name || r.product_name || '';
    if (!name) return 'Sản phẩm';
    var parts = name.split(/—/).map(function(p) { return p.trim(); }).filter(Boolean);
    var orderCode = r.order_code || '';
    var ticketPart = '';
    var prodNamePart = '';
    parts.forEach(function(p) {
        var upper = p.toUpperCase();
        if (orderCode && upper === orderCode.toUpperCase()) return;
        var ticketMatch = p.match(/(?:Phiếu\s*|P)(\d+)/i);
        if (ticketMatch) {
            if (!ticketPart) ticketPart = 'Phiếu ' + ticketMatch[1];
            return;
        }
        if (!prodNamePart) prodNamePart = p;
        else prodNamePart += ' — ' + p;
    });
    var res = [];
    if (orderCode) res.push(orderCode);
    if (ticketPart) res.push(ticketPart);
    if (prodNamePart) res.push(prodNamePart);
    else res.push(r.product_name || 'Sản phẩm');
    return res.join(' — ');
}

function _bphtGetOrderCodeWithTicket(r) {
    if (!r) return '';
    var orderCode = r.order_code || '';
    var name = r.cut_product_name || r.product_name || '';
    if (!name) return orderCode;
    var parts = name.split(/—/).map(function(p) { return p.trim(); }).filter(Boolean);
    var ticketPart = '';
    parts.forEach(function(p) {
        var ticketMatch = p.match(/(?:Phiếu\s*|P)(\d+)/i);
        if (ticketMatch && !ticketPart) {
            ticketPart = 'Phiếu ' + ticketMatch[1];
        }
    });
    if (ticketPart) {
        return orderCode + ' - ' + ticketPart;
    }
    return orderCode;
}

function _bphtRender(){
    var all=_bpht.records.slice();
    if(_bpht.search){var q=_bpht.search.toLowerCase();all=all.filter(function(r){return(r.cut_product_name||r.product_name||'').toLowerCase().indexOf(q)>=0||(r.cskh_name||'').toLowerCase().indexOf(q)>=0||(r.order_code||'').toLowerCase().indexOf(q)>=0;});}
    var tot=all.length;
    var tb=document.getElementById('bphtTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="14"><div class="empty-state"><div class="icon">✅</div><h3>Chưa có đơn hoàn thiện</h3></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var cI=r.is_completed?'✅':'⬜',cC=r.is_completed?' on-ok':'';
        var clickAction = r.is_completed ? `_bphtOpenCompleteModal(${r.id}, true)` : `_bphtOpenCompleteModal(${r.id})`;
        var eI=r.error_reported?'⚠️':'⬜',eC=r.error_reported?' on-err':'';
        var imgs='—';try{var ia=JSON.parse(r.finish_images||'[]');if(ia.length)imgs=`<span style="color:#059669;cursor:pointer;font-weight:700;text-decoration:underline;" onclick="_bphtViewImages(${r.id})">📸 ${ia.length}</span>`;}catch(e){}
        var upd='';if(r.last_update_at){upd=_bphtFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#059669;font-size:9px">'+r.last_update_by+'</span>';}
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center"><button class="bpht-ib'+cC+'" onclick="'+clickAction+'" title="Hoàn thành">'+cI+'</button></td>'
        +'<td style="text-align:center"><button class="bpht-ib'+eC+'" onclick="_bphtErr()" title="Báo lỗi">'+eI+'</button></td>'
        +'<td style="font-size:10px">'+_bphtGetRaDukien(r)+'</td>'
        +'<td style="font-size:10px;color:'+(r.done_date?'#059669':'#94a3b8')+'">'+_bphtFD(r.done_date)+'</td>'
        +'<td>'+_bphtProgress(r.expected_ship_date||r.expected_date, r.done_date)+'</td>'
        +'<td style="font-weight:600;color:#1e293b;white-space:normal;max-width:250px;word-break:break-word;">'+_bphtCleanProdName(r)+'</td>'
        +'<td style="font-size:10px;color:#2563eb;font-weight:600">'+(r.cskh_name||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#059669">'+(r.quantity||'—')+'</td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+(r.finisher_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#6b7280">'+(r.sewer_name||'—')+'</td>'
        +'<td style="text-align:center;font-size:10px">'+imgs+'</td>'
        +'<td>'+_bphtShip(r.shipping_standard)+'</td>'
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

async function _bphtTog(id,action){
    if (action === 'undo_complete') {
        if (!confirm('Bạn có chắc chắn muốn hoàn tác trạng thái hoàn thành?')) return;
    }
    try{
        await apiCall('/api/finishing/toggle/'+id,'POST',{action});
        showToast('✅ Cập nhật');
        await _bphtLoadAll();
    }catch(e){
        showToast(e.message||'Lỗi','error');
    }
}

function _bphtErr(){if(typeof navigate==='function'){navigate('don-loi-khach-hang');showToast('📋 Chuyển sang Đơn Lỗi');}}

// ========== IMAGE VIEW OVERLAY ==========
function _bphtViewImages(recordId) {
    const r = _bpht.records.find(x => x.id === recordId);
    if (!r) return;
    let images = [];
    try { images = JSON.parse(r.finish_images || '[]'); } catch(e) {}
    if (!images.length) return;
    
    let html = `
        <div id="bphtImageViewOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.8);backdrop-filter:blur(4px);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;" onclick="document.getElementById('bphtImageViewOverlay').remove()">
            <div style="position:relative;background:#fff;border-radius:12px;padding:20px;max-width:90vw;max-height:85vh;overflow-y:auto;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;" onclick="event.stopPropagation()">
                <button onclick="document.getElementById('bphtImageViewOverlay').remove()" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:20px;cursor:pointer;font-weight:bold;color:#475569;">✕</button>
                <div style="width:100%;text-align:center;font-weight:800;color:#0f172a;margin-bottom:10px;font-size:14px;">📷 Ảnh hoàn thiện đơn hàng #${r.order_code || r.id}</div>
    `;
    const t = Date.now();
    images.forEach(src => {
        const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
        html += `
            <div style="border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;width:200px;height:200px;">
                <img src="${src}${buster}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" onclick="window.open('${src}${buster}', '_blank')">
            </div>
        `;
    });
    html += `
            </div>
        </div>
    `;
    const old = document.getElementById('bphtImageViewOverlay'); if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
}

// ========== COMPLETING CHECKLIST MODAL (Thợ Hoàn Thiện) ==========
async function _bphtOpenCompleteModal(recordId, readOnly = false) {
    const r = _bpht.records.find(x => x.id === recordId);
    if (!r) return;
    
    _bphtState.currentRecordId = recordId;
    _bphtState.finishImages = [];
    try {
        _bphtState.finishImages = JSON.parse(r.finish_images || '[]');
    } catch(e) {}

    // Fetch staff if not loaded
    if (!_bphtState.staff.length) {
        try {
            const res = await apiCall('/api/finishing/staff');
            _bphtState.staff = res.staff || [];
        } catch(e) {
            console.error('Lỗi tải nhân viên:', e);
        }
    }

    // Load templates & answers
    let templates = [];
    let answers = [];
    try {
        const res = await apiCall('/api/finishing/checklist/answers/' + recordId);
        templates = res.templates || [];
        answers = res.answers || [];
    } catch(e) {
        console.error('Lỗi tải checklist:', e);
    }

    const activeFinisherId = r.finisher_id || (window.currentUser ? window.currentUser.id : '');
    let staffOptions = '';
    _bphtState.staff.forEach(s => {
        const sel = activeFinisherId === s.id ? 'selected' : '';
        staffOptions += `<option value="${s.id}" ${sel}>${s.full_name} (${s.username})</option>`;
    });

    let imagesHtml = '';
    const t = Date.now();
    _bphtState.finishImages.forEach(src => {
        const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
        imagesHtml += `
            <div style="position:relative; width:80px; height:80px; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden;">
                <img src="${src}${buster}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="window.open('${src}${buster}', '_blank')">
                ${readOnly ? '' : `<button onclick="_bphtDeleteImage('${src}')" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>`}
            </div>
        `;
    });

    let checklistHtml = '';
    if (templates.length > 0) {
        checklistHtml += '<div style="margin-top:16px; border-top:1px solid #e2e8f0; padding-top:16px;">';
        checklistHtml += '<h4 style="margin:0 0 12px; font-size:13px; color:#0f172a;">📋 CHECKLIST HOÀN THIỆN (Bắt buộc trả lời hết)</h4>';
        templates.forEach(q => {
            const ans = answers.find(a => a.template_id === q.id);
            const val = ans ? ans.answer_value : '';

            checklistHtml += `<div class="bpht-qc-question-row" data-id="${q.id}" data-type="${q.type}" data-content="${q.content.replace(/"/g, '&quot;')}" style="margin-bottom:12px; display:flex; flex-direction:column; gap:6px;">`;
            checklistHtml += `<div style="font-weight:700; font-size:12.5px; color:#334155;">${q.content} <span style="color:#ef4444;">*</span></div>`;

            if (q.type === 'yes_no') {
                const hasYes = val === 'yes' ? 'checked' : '';
                const hasNo = val === 'no' ? 'checked' : '';
                checklistHtml += `
                    <div style="display:flex; gap:24px; margin-top:4px;">
                        <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:${readOnly ? 'default' : 'pointer'}; color:#334155; user-select:none;">
                            <input type="radio" name="bpht_q_${q.id}" value="yes" ${hasYes} ${readOnly ? 'disabled' : ''} style="width:18px; height:18px; cursor:${readOnly ? 'default' : 'pointer'}; accent-color:#059669;"> Có
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:${readOnly ? 'default' : 'pointer'}; color:#334155; user-select:none;">
                            <input type="radio" name="bpht_q_${q.id}" value="no" ${hasNo} ${readOnly ? 'disabled' : ''} style="width:18px; height:18px; cursor:${readOnly ? 'default' : 'pointer'}; accent-color:#dc2626;"> Không
                        </label>
                    </div>
                `;
            } else if (q.type === 'percentage') {
                const pctVal = val !== '' ? val : '50';
                checklistHtml += `
                    <div style="display:flex; align-items:center; gap:12px; margin-top:4px;">
                        <input type="range" name="bpht_q_${q.id}" min="0" max="100" value="${pctVal}" ${readOnly ? 'disabled' : ''} style="flex:1; height:6px; border-radius:3px; accent-color:#059669; cursor:${readOnly ? 'default' : 'pointer'};" oninput="this.nextElementSibling.textContent = this.value + '%'">
                        <span style="font-size:14px; font-weight:800; color:#059669; min-width:45px; text-align:right;">${pctVal}%</span>
                    </div>
                `;
            } else {
                const cleanContent = q.content.toLowerCase().replace(/\s+/g, '');
                const isCountQuestion = cleanContent.includes('sốlượngđếmlàbaonhiêu') || cleanContent.includes('sơlượngđếmlàbaonhiêu') || cleanContent.includes('soluongdemlabaonhieu');
                checklistHtml += `
                    <input type="text" class="bpht-qc-text" value="${val}" ${readOnly ? 'disabled' : ''} placeholder="Nhập câu trả lời..." style="background:${readOnly ? '#f1f5f9' : '#ffffff'}; border:1px solid #cbd5e1; color:${readOnly ? '#64748b' : '#1e293b'}; font-size:13px; border-radius:8px; padding:8px 12px; width:100%; outline:none; box-sizing:border-box; cursor:${readOnly ? 'not-allowed' : 'text'};"
                        ${isCountQuestion && !readOnly ? `oninput="_bphtValidateCountInput(this, ${r.quantity || 0})"` : ''}>
                    ${isCountQuestion && !readOnly ? `<div class="bpht-count-error-msg" style="color:#ef4444; font-size:11px; font-weight:700; margin-top:4px; ${val !== '' && (parseInt(val.replace(/\D/g, ''), 10) !== parseInt(r.quantity || 0, 10)) ? 'display:block;' : 'display:none;'}">Bạn đã đếm sai, hãy đếm lại !</div>` : ''}
                `;
            }
            checklistHtml += '</div>';
        });
        checklistHtml += '</div>';
    }

    let formattedExpectedDate = '—';
    const targetDateStr = r.expected_ship_date || r.expected_date;
    if (targetDateStr) {
        try {
            const dt = new Date(targetDateStr);
            const day = String(dt.getDate()).padStart(2, '0');
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            if (r.shipping_standard === 'chuan') {
                let timeStr = '';
                if (r.standard_delivery_time) {
                    timeStr = r.standard_delivery_time.trim();
                } else {
                    const hrs = String(dt.getHours()).padStart(2, '0');
                    const mins = String(dt.getMinutes()).padStart(2, '0');
                    timeStr = `${hrs}:${mins}`;
                }
                formattedExpectedDate = `${timeStr} ngày ${day}/${month}`;
            } else {
                formattedExpectedDate = `ngày ${day}/${month}`;
            }
        } catch(e) {
            formattedExpectedDate = targetDateStr;
        }
    }

    let uploadBlockHtml = '';
    if (readOnly) {
        uploadBlockHtml = `
            <div id="bphtImagesContainer" style="display:flex; gap:8px; flex-wrap:wrap;">
                ${imagesHtml}
            </div>
        `;
    } else {
        uploadBlockHtml = `
            <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
                <button onclick="document.getElementById('bphtFileInput').click()" style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:11px; font-weight:700; background:#f8fafc; cursor:pointer; color:#334155;">📷 Tải ảnh lên</button>
                <span id="bphtUploadStatus" style="font-size:11px; color:#64748b;">${_bphtState.finishImages.length > 0 ? `Đã tải ${_bphtState.finishImages.length} ảnh` : 'Chưa có ảnh'}</span>
                <input type="file" id="bphtFileInput" multiple accept="image/*" style="display:none;" onchange="_bphtUploadImages(event)">
            </div>
            <div id="bphtImagesContainer" style="display:flex; gap:8px; flex-wrap:wrap;">
                ${imagesHtml}
            </div>
        `;
    }

    let notesHtml = `
        <div>
            <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">Ghi Chú</label>
            <textarea id="bphtNotes" rows="2" ${readOnly ? 'disabled' : ''} placeholder="${readOnly ? '' : 'Nhập ghi chú (nếu có)...'}" style="width:100%; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; outline:none; box-sizing:border-box; font-family:inherit; background:${readOnly ? '#f1f5f9' : '#fff'}; color:${readOnly ? '#64748b' : '#0f172a'}; cursor:${readOnly ? 'not-allowed' : 'text'};">${r.notes || ''}</textarea>
        </div>
    `;

    let footerBtns = '';
    if (readOnly) {
        footerBtns = `
            <button onclick="document.getElementById('bphtCompleteOverlay').remove()" style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-weight:700; background:#fff; cursor:pointer; color:#475569;">Đóng</button>
            <button onclick="document.getElementById('bphtCompleteOverlay').remove(); _bphtTog(${r.id},'undo_complete')" style="padding:8px 20px; background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">Hoàn Tác Hoàn Thành</button>
        `;
    } else {
        footerBtns = `
            <button onclick="document.getElementById('bphtCompleteOverlay').remove()" style="padding:8px 16px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-weight:700; background:#fff; cursor:pointer; color:#475569;">Hủy</button>
            <button onclick="_bphtSubmitComplete()" style="padding:8px 20px; background:linear-gradient(135deg,#059669,#10b981); color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">Xác Nhận Hoàn Thành</button>
        `;
    }

    const modalHtml = `
        <div id="bphtCompleteOverlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;">
            <div style="background:#fff; border-radius:16px; width:550px; max-width:100%; box-shadow:0 25px 50px rgba(0,0,0,0.25); overflow:hidden; display:flex; flex-direction:column; max-height:90vh; animation:qlxSlideUp .3s;">
                <div style="background:linear-gradient(135deg,#059669,#10b981); color:#fff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:800; font-size:14px;">${readOnly ? '🔍 Xem Hoàn Thiện & Checklist' : '📦 Xác Nhận Hoàn Thiện & Checklist'}</div>
                    <button onclick="document.getElementById('bphtCompleteOverlay').remove()" style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer; font-weight:bold;">✕</button>
                </div>
                <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:14px;">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;">
                        <div>
                            <span style="font-size:10px; color:#64748b; font-weight:700; display:block; margin-bottom:2px; text-transform:uppercase;">Mã Đơn Hàng</span>
                            <span style="font-size:13px; color:#0f172a; font-weight:800;">${_bphtGetOrderCodeWithTicket(r)}</span>
                        </div>
                        <div>
                            <span style="font-size:10px; color:#64748b; font-weight:700; display:block; margin-bottom:2px; text-transform:uppercase;">CSKH</span>
                            <span style="font-size:13px; color:#059669; font-weight:800;">${r.cskh_name || '—'}</span>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">Nhân Viên Hoàn Thiện <span style="color:#ef4444;">*</span></label>
                            <select id="bphtFinisherId" disabled style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; outline:none; background:#f1f5f9; color:#64748b; cursor:not-allowed;">
                                ${staffOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">Tiêu Chuẩn Gửi</label>
                            <select id="bphtShippingStandard" disabled style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; outline:none; background:#f1f5f9; color:#64748b; cursor:not-allowed;">
                                <option value="chuan" ${r.shipping_standard === 'chuan' ? 'selected' : ''}>✅ CHUẨN</option>
                                <option value="gap" ${r.shipping_standard === 'gap' ? 'selected' : ''}>🔴 GẤP</option>
                                <option value="gui" ${r.shipping_standard === 'gui' ? 'selected' : ''}>📦 GỬI</option>
                            </select>
                            <div style="font-size:11px; font-weight:700; color:#64748b; margin-top:4px;">
                                Hạn gửi hàng: <span style="color:#059669; font-weight:800;">${formattedExpectedDate}</span>
                            </div>
                        </div>
                    </div>

                    ${checklistHtml}

                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">Ảnh Sản Phẩm Hoàn Thiện <span style="color:#ef4444;">*</span></label>
                        ${uploadBlockHtml}
                    </div>

                    ${notesHtml}
                </div>
                <div style="padding:12px 20px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:10px;">
                    ${footerBtns}
                </div>
            </div>
        </div>
    `;

    const old = document.getElementById('bphtCompleteOverlay'); if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function _bphtValidateCountInput(inputEl, targetQty) {
    inputEl.value = inputEl.value.replace(/\D/g, '');
    const val = inputEl.value.trim();
    const errorEl = inputEl.nextElementSibling;
    if (!errorEl || !errorEl.classList.contains('bpht-count-error-msg')) return;

    if (val === '') {
        errorEl.style.display = 'none';
        return;
    }

    if (parseInt(val, 10) !== parseInt(targetQty, 10)) {
        errorEl.style.display = 'block';
    } else {
        errorEl.style.display = 'none';
    }
}

function _bphtResizeImage(file, maxW = 800, maxH = 800, quality = 0.6) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxW) {
                        height = Math.round((height * maxW) / width);
                        width = maxW;
                    }
                } else {
                    if (height > maxH) {
                        width = Math.round((width * maxH) / height);
                        height = maxH;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function _bphtUploadImages(event) {
    const files = event.target.files;
    if (!files.length) return;

    const statusEl = document.getElementById('bphtUploadStatus');
    try {
        if (statusEl) statusEl.textContent = 'Đang xử lý...';
        const fd = new FormData();
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const resized = await _bphtResizeImage(file, 800, 800, 0.6);
                fd.append('file', resized);
            } else {
                fd.append('file', file);
            }
        }

        if (statusEl) statusEl.textContent = 'Đang tải lên...';
        const res = await fetch(`/api/finishing/records/${_bphtState.currentRecordId}/images`, {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi upload');

        _bphtState.finishImages = data.images;
        showToast('Tải ảnh thành công!');
        if (statusEl) statusEl.textContent = `Đã tải ${data.images.length} ảnh`;

        const container = document.getElementById('bphtImagesContainer');
        if (container) {
            const t = Date.now();
            container.innerHTML = data.images.map(src => {
                const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
                return `
                    <div style="position:relative; width:80px; height:80px; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden;">
                        <img src="${src}${buster}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="window.open('${src}${buster}', '_blank')">
                        <button onclick="_bphtDeleteImage('${src}')" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
                    </div>
                `;
            }).join('');
        }

        const r = _bpht.records.find(x => x.id === _bphtState.currentRecordId);
        if (r) r.finish_images = JSON.stringify(data.images);
    } catch(err) {
        showToast(err.message || 'Lỗi tải ảnh', 'error');
        if (statusEl) statusEl.textContent = 'Lỗi tải ảnh!';
    }
}

async function _bphtDeleteImage(imgSrc) {
    if (!confirm('Xóa ảnh này?')) return;
    const updatedImgs = _bphtState.finishImages.filter(src => src !== imgSrc);
    try {
        await apiCall(`/api/finishing/records/${_bphtState.currentRecordId}`, 'PUT', { finish_images: JSON.stringify(updatedImgs) });
        _bphtState.finishImages = updatedImgs;
        showToast('Đã xóa ảnh!');

        const container = document.getElementById('bphtImagesContainer');
        if (container) {
            const t = Date.now();
            container.innerHTML = updatedImgs.map(src => {
                const buster = src.includes('?') ? `&t=${t}` : `?t=${t}`;
                return `
                    <div style="position:relative; width:80px; height:80px; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden;">
                        <img src="${src}${buster}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="window.open('${src}${buster}', '_blank')">
                        <button onclick="_bphtDeleteImage('${src}')" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
                    </div>
                `;
            }).join('');
        }

        const statusEl = document.getElementById('bphtUploadStatus');
        if (statusEl) {
            statusEl.textContent = updatedImgs.length > 0 ? `Đã tải ${updatedImgs.length} ảnh` : 'Chưa có ảnh';
        }

        const r = _bpht.records.find(x => x.id === _bphtState.currentRecordId);
        if (r) r.finish_images = JSON.stringify(updatedImgs);
    } catch(err) {
        showToast(err.message || 'Lỗi', 'error');
    }
}

async function _bphtSubmitComplete() {
    const finisherId = document.getElementById('bphtFinisherId').value;
    const shippingStandard = document.getElementById('bphtShippingStandard').value;
    const notes = document.getElementById('bphtNotes').value;

    if (!finisherId) {
        showToast('Vui lòng chọn Nhân viên Hoàn Thiện', 'error');
        return;
    }

    if (!_bphtState.finishImages || _bphtState.finishImages.length === 0) {
        showToast('Bắt buộc phải chụp ảnh/tải lên ảnh sản phẩm hoàn thiện!', 'error');
        return;
    }

    // Validate checklist answers
    const questionRows = document.querySelectorAll('.bpht-qc-question-row');
    const answersList = [];
    const r = _bpht.records.find(x => x.id === _bphtState.currentRecordId);

    for (const row of questionRows) {
        const qId = row.dataset.id;
        const qType = row.dataset.type;
        const qContent = row.dataset.content || '';
        let val = '';

        if (qType === 'yes_no') {
            const rad = row.querySelector(`input[name="bpht_q_${qId}"]:checked`);
            if (!rad) {
                showToast('Vui lòng trả lời đầy đủ tất cả câu hỏi checklist!', 'error');
                return;
            }
            val = rad.value;
        } else if (qType === 'percentage') {
            const range = row.querySelector(`input[name="bpht_q_${qId}"]`);
            val = range.value;
        } else {
            const text = row.querySelector(`.bpht-qc-text`);
            if (!text || !text.value.trim()) {
                showToast('Vui lòng điền đầy đủ tất cả câu hỏi checklist!', 'error');
                return;
            }
            val = text.value.trim();
        }

        // Custom validation for "Số lượng đếm là bao nhiêu ?"
        const cleanContent = qContent.toLowerCase().replace(/\s+/g, '');
        if (cleanContent.includes('sơlượngđếmlàbaonhiêu') || cleanContent.includes('soluongdemlabaonhieu')) {
            const errorEl = row.querySelector('.bpht-count-error-msg');
            if (!/^\d+$/.test(val)) {
                if (errorEl) errorEl.style.display = 'block';
                alert('Bạn đã ghi sai số lượng đếm, hãy đếm lại');
                return;
            }
            const targetQty = r ? parseInt(r.quantity, 10) : null;
            if (targetQty !== null && parseInt(val, 10) !== targetQty) {
                if (errorEl) errorEl.style.display = 'block';
                alert('Bạn đã ghi sai số lượng đếm, hãy đếm lại');
                return;
            }
        }

        answersList.push({ template_id: parseInt(qId), answer_value: val });
    }

    try {
        // 1. Update finishing record fields (finisher_id, shipping_standard, notes)
        await apiCall(`/api/finishing/records/${_bphtState.currentRecordId}`, 'PUT', {
            finisher_id: parseInt(finisherId),
            shipping_standard: shippingStandard,
            notes: notes
        });

        // 2. Submit checklist answers (if any)
        if (answersList.length > 0) {
            await apiCall(`/api/finishing/checklist/answers/${_bphtState.currentRecordId}`, 'POST', { answers: answersList });
        }

        // 3. Mark completed (complete action)
        await apiCall(`/api/finishing/toggle/${_bphtState.currentRecordId}`, 'POST', { action: 'complete' });

        // 4. Send Telegram Notification
        try {
            await apiCall(`/api/finishing/checklist/notify/${_bphtState.currentRecordId}`, 'POST');
        } catch(tgErr) {
            console.error('Lỗi gửi Telegram:', tgErr);
        }

        showToast('✅ Đã hoàn thành đơn hoàn thiện!');
        const overlay = document.getElementById('bphtCompleteOverlay');
        if (overlay) overlay.remove();
        
        await _bphtLoadAll();
    } catch(err) {
        showToast(err.message || 'Lỗi', 'error');
    }
}

// ========== CHECKLIST SETUP MODAL (Giám Đốc) ==========
async function _bphtChecklistSetup() {
    try {
        const data = await apiCall('/api/finishing/checklist/templates/all');
        const templates = data.templates || [];
        let html = '<div style="padding:20px"><h3 style="margin:0 0 16px;color:#0f172a">⚙️ Quản Lý Checklist Hoàn Thiện</h3>';
        html += '<div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:20px;border:1px solid #e2e8f0">';
        html += '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px">➕ Thêm Mới Câu Hỏi/Checklist</div>';
        html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
        html += '<select id="_bphtClNewType" style="padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;background:#fff;"><option value="yes_no">✔️ Có/Không</option><option value="text">📝 Văn bản</option><option value="percentage">📈 Thanh kéo (%)</option></select>';
        html += '<input id="_bphtClNewContent" placeholder="Nội dung câu hỏi..." style="flex:1;min-width:200px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;background:#fff;outline:none;">';
        html += '<input id="_bphtClNewOrder" type="number" value="0" placeholder="TT" style="width:60px;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;text-align:center;background:#fff;outline:none;">';
        html += '<button onclick="_bphtClAdd()" style="padding:8px 16px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">Thêm</button>';
        html += '</div></div>';
        if (templates.length) {
            html += '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9"><th style="padding:8px;text-align:left">Loại</th><th style="padding:8px;text-align:left">Nội dung</th><th style="padding:8px;text-align:center">TT</th><th style="padding:8px;text-align:center">Trạng thái</th><th style="padding:8px;text-align:center">Thao tác</th></tr></thead><tbody>';
            templates.forEach(function(t) {
                let tp = '';
                if (t.type === 'yes_no') {
                    tp = '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">✔️ Có/Không</span>';
                } else if (t.type === 'percentage') {
                    tp = '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">📈 Thanh kéo (%)</span>';
                } else {
                    tp = '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">📝 Văn bản</span>';
                }
                const st = t.is_active ? '<span style="color:#059669;font-weight:700">Bật</span>' : '<span style="color:#dc2626;font-weight:700">Tắt</span>';
                html += `<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px">${tp}</td><td style="padding:8px;"><input type="text" value="${t.content.replace(/"/g, '&quot;')}" onchange="_bphtClUpdate(${t.id}, \'content\', this.value)" style="width:95%; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-weight:600; background:#fff; color:#1e293b; outline:none;" onfocus="this.style.borderColor=\'#059669\'" onblur="this.style.borderColor=\'#cbd5e1\'"></td><td style="padding:8px;text-align:center;"><input type="number" value="${t.sort_order}" onchange="_bphtClUpdate(${t.id}, \'sort_order\', parseInt(this.value)||0)" style="width:50px; padding:6px 4px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; text-align:center; background:#fff; color:#1e293b; outline:none;" onfocus="this.style.borderColor=\'#059669\'" onblur="this.style.borderColor=\'#cbd5e1\'"></td><td style="padding:8px;text-align:center">${st}</td>`;
                html += `<td style="padding:8px;text-align:center"><button onclick="_bphtClToggleActive(${t.id},${!t.is_active})" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:10px;cursor:pointer;background:#fff;margin-right:4px">${t.is_active ? '🔇 Tắt' : '🔔 Bật'}</button>`;
                html += `<button onclick="_bphtClDelete(${t.id})" style="padding:4px 10px;border:1px solid #fca5a5;border-radius:6px;font-size:10px;cursor:pointer;background:#fef2f2;color:#dc2626">🗑️ Xóa</button></td></tr>`;
            });
            html += '</tbody></table>';
        } else { html += '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px">Chưa có câu hỏi nào</div>'; }
        html += '<div style="padding:16px 20px;border-top:1px solid #e2e8f0;text-align:right"><button onclick="document.getElementById(\'_bphtSetupOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569;">Đóng</button></div>';
        html += '</div>';
        
        let old = document.getElementById('_bphtSetupOverlay'); if (old) old.remove();
        let ov = document.createElement('div');
        ov.className = 'qlx-cl-overlay'; ov.id = '_bphtSetupOverlay';
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
        ov.innerHTML = '<div class="qlx-cl-popup" style="width:700px;background:#fff;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s;"><div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:16px 20px;"><h3>⚙️ Setup Checklist Hoàn Thiện</h3><p style="margin:4px 0 0;font-size:11px;opacity:0.85;">Quản lý câu hỏi kiểm tra khi hoàn thiện sản phẩm</p></div>' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _bphtClAdd() {
    const t = document.getElementById('_bphtClNewType').value;
    const c = document.getElementById('_bphtClNewContent').value;
    const s = parseInt(document.getElementById('_bphtClNewOrder').value) || 0;
    if (!c.trim()) return showToast('Nhập nội dung câu hỏi', 'error');
    try {
        await apiCall('/api/finishing/checklist/templates', 'POST', { type: t, content: c, sort_order: s });
        showToast('✅ Đã thêm');
        _bphtChecklistSetup();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bphtClToggleActive(id, val) {
    try {
        await apiCall('/api/finishing/checklist/templates/' + id, 'PUT', { is_active: val });
        showToast('✅ Cập nhật');
        _bphtChecklistSetup();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bphtClDelete(id) {
    if (!confirm('Xóa câu hỏi này?')) return;
    try {
        await apiCall('/api/finishing/checklist/templates/' + id, 'DELETE');
        showToast('✅ Đã xóa');
        _bphtChecklistSetup();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bphtClUpdate(id, field, val) {
    try {
        const payload = {};
        payload[field] = val;
        await apiCall('/api/finishing/checklist/templates/' + id, 'PUT', payload);
        showToast('✅ Đã lưu thay đổi');
        _bphtChecklistSetup();
    } catch(e) { showToast(e.message, 'error'); }
}

// ========== DISPLAY SETTINGS SETUP MODAL (Giám Đốc) ==========
async function _bphtDisplaySetup() {
    try {
        const data = await apiCall('/api/finishing/display-settings');
        const teams = data.teams || [];
        const contractors = data.contractors || [];

        let html = '<div style="padding:20px"><h3 style="margin:0 0 8px;color:#0f172a">⚙️ Cấu Hình Nguồn Hiển Thị Hoàn Thiện</h3>';
        html += '<p style="font-size:12px;color:#64748b;margin-bottom:20px;">Tích chọn các Tổ May và Nhà Gia Công được phép hiển thị tại Cắt Chỉ & Hoàn Thiện. Các nguồn bị bỏ tích sẽ <b>tự động hoàn thiện ngay sau khâu QC</b> và không hiện ở đây.</p>';
        
        html += '<div style="display:flex;gap:20px;margin-bottom:20px;">';
        
        // Left column: Tổ May
        html += '<div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">';
        html += '<div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:12px;padding-bottom:6px;border-bottom:1.5px solid #059669;display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>TỔ MAY TRONG XƯỞNG</span>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button onclick="_bphtTglAllDs(\'team\', true)" style="border:none;background:none;color:#059669;font-size:11px;font-weight:700;cursor:pointer;">Tất cả</button>';
        html += '<span style="color:#cbd5e1;font-size:11px;">|</span>';
        html += '<button onclick="_bphtTglAllDs(\'team\', false)" style="border:none;background:none;color:#dc2626;font-size:11px;font-weight:700;cursor:pointer;">Bỏ chọn hết</button>';
        html += '</div>';
        html += '</div>';
        html += '<div style="max-height:350px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">';
        if (teams.length) {
            teams.forEach(t => {
                html += `<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:4px 0;">`;
                html += `<input type="checkbox" class="bpht-ds-check" data-type="team" data-id="${t.id}" ${t.is_visible ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">`;
                html += `<span>${t.name}</span>`;
                html += `</label>`;
            });
        } else {
            html += '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:10px;">Chưa có tổ may</div>';
        }
        html += '</div></div>';

        // Right column: Nhà Gia Công
        html += '<div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">';
        html += '<div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:12px;padding-bottom:6px;border-bottom:1.5px solid #059669;display:flex;justify-content:space-between;align-items:center;">';
        html += '<span>NHÀ GIA CÔNG MAY BÍCH</span>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button onclick="_bphtTglAllDs(\'contractor\', true)" style="border:none;background:none;color:#059669;font-size:11px;font-weight:700;cursor:pointer;">Tất cả</button>';
        html += '<span style="color:#cbd5e1;font-size:11px;">|</span>';
        html += '<button onclick="_bphtTglAllDs(\'contractor\', false)" style="border:none;background:none;color:#dc2626;font-size:11px;font-weight:700;cursor:pointer;">Bỏ chọn hết</button>';
        html += '</div>';
        html += '</div>';
        html += '<div style="max-height:350px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">';
        if (contractors.length) {
            contractors.forEach(c => {
                html += `<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:4px 0;">`;
                html += `<input type="checkbox" class="bpht-ds-check" data-type="contractor" data-id="${c.id}" ${c.is_visible ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">`;
                html += `<span>${c.name}</span>`;
                html += `</label>`;
            });
        } else {
            html += '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:10px;">Chưa có nhà gia công</div>';
        }
        html += '</div></div>';

        html += '</div>';

        html += '<div style="padding:16px 20px;border-top:1px solid #e2e8f0;text-align:right;display:flex;justify-content:flex-end;gap:10px;">';
        html += '<button onclick="document.getElementById(\'_bphtDsOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569;">Đóng</button>';
        html += '<button onclick="_bphtSaveDisplaySettings()" style="padding:8px 20px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">Lưu Cấu Hình</button>';
        html += '</div>';
        html += '</div>';

        let old = document.getElementById('_bphtDsOverlay'); if (old) old.remove();
        let ov = document.createElement('div');
        ov.className = 'qlx-cl-overlay'; ov.id = '_bphtDsOverlay';
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
        ov.innerHTML = '<div class="qlx-cl-popup" style="width:750px;background:#fff;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,0.25);overflow:hidden;animation:qlxSlideUp .3s;"><div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:16px 20px;"><h3>⚙️ Setup Hoàn Thiện</h3><p style="margin:4px 0 0;font-size:11px;opacity:0.85;">Thiết lập hiển thị Tổ may / Nhà gia công tại CCHT</p></div>' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

function _bphtTglAllDs(type, val) {
    const list = document.querySelectorAll(`.bpht-ds-check[data-type="${type}"]`);
    list.forEach(cb => cb.checked = val);
}

async function _bphtSaveDisplaySettings() {
    const checks = document.querySelectorAll('.bpht-ds-check');
    const settings = [];
    checks.forEach(cb => {
        settings.push({
            source_type: cb.getAttribute('data-type'),
            source_id: parseInt(cb.getAttribute('data-id')),
            is_visible: cb.checked
        });
    });

    try {
        await apiCall('/api/finishing/display-settings', 'POST', { settings });
        showToast('✅ Đã lưu cấu hình thành công!');
        const overlay = document.getElementById('_bphtDsOverlay');
        if (overlay) overlay.remove();
        await _bphtLoadAll();
    } catch(err) {
        showToast(err.message || 'Lỗi lưu cấu hình', 'error');
    }
}
