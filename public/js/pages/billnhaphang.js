// ========== BILL NHẬP VẢI — Desktop SPA ==========
var _bnh={records:[],tree:null,filter:{source_id:null},search:'',sources:[],isDuyet:false};

function renderBillnhaphangPage(content){
    if(!document.getElementById('_bnhS')){var st=document.createElement('style');st.id='_bnhS';
    st.textContent='.bnh-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.bnh-sb{width:280px;min-width:280px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.bnh-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.bnh-main>*{flex-shrink:0}'
    +'.bnh-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#4f46e5;display:flex;justify-content:space-between;align-items:center}'
    +'.bnh-sb-total{background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:12px 16px;font-size:12px;font-weight:700;cursor:pointer}'
    +'.bnh-sb-total .tv{font-size:16px;font-weight:900}.bnh-sb-total .ts{font-size:10px;opacity:.85;margin-top:2px}'
    +'.bnh-sb-src{padding:10px 16px;font-size:11px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;color:#374151;gap:6px}'
    +'.bnh-sb-src:hover{background:#eef2ff}.bnh-sb-src.active{background:#e0e7ff;color:#4f46e5;font-weight:800}'
    +'.bnh-sb-src .sn{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bnh-sb-src .sc{font-size:9px;color:#4f46e5;font-weight:800;white-space:nowrap}'
    +'.bnh-sb-src .sm{font-size:9px;color:#94a3b8;white-space:nowrap}'
    +'.bnh-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s}'
    +'.bnh-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
    +'.bnh-ib.on{background:#e0e7ff;border-color:#6366f1}'
    +'.bnh-debt{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800}'
    +'.bnh-debt.red{background:#fee2e2;color:#dc2626}.bnh-debt.green{background:#d1fae5;color:#059669}.bnh-debt.blue{background:#dbeafe;color:#2563eb}'
    +'.bnh-add-src{padding:8px 16px;font-size:11px;font-weight:600;cursor:pointer;color:#4f46e5;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:6px}'
    +'.bnh-add-src:hover{background:#eef2ff}'
    +'.bnh-fab-btn{background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:6px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;white-space:nowrap;transition:all .2s;box-shadow:0 2px 8px #7c3aed30}'
    +'.bnh-fab-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px #7c3aed50}'
    +'.bnh-fab-badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:800;background:#ede9fe;color:#7c3aed;margin-left:4px}'
    +'@media(max-width:768px){.bnh-sb{display:none}}';
    document.head.appendChild(st);}
    content.innerHTML='<div class="bnh-wrap"><div class="bnh-sb" id="bnhSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bnh-main">'
    +'<div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="bnhInfo" style="font-size:12px"></div><div id="bnhStats" style="display:flex;gap:6px;flex:1;justify-content:center;flex-wrap:nowrap;overflow-x:auto"></div><button id="bnhFabBtn" class="bnh-fab-btn" style="display:none" onclick="_bnhOpenFabric()">🧵 Nhập Vải</button><input id="bnhSearch" placeholder="🔍 Tìm chất liệu / nguồn..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none"></div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bnhTable"><thead><tr style="background:var(--gray-800)">'
    +'<th style="text-align:center">STT</th><th style="text-align:center">Duyệt</th><th style="text-align:center">TT</th><th>Ngày Nhập</th><th>Nguồn</th><th>NV Nhập</th><th>Chất Liệu - Màu Vải</th><th style="text-align:center">Số Cây Vải</th><th style="text-align:center">SL Nhập</th><th style="text-align:right">Chi Phí</th><th style="text-align:right">Hoàn</th><th style="text-align:right">Thành Tiền</th><th style="text-align:right">Thanh Toán</th><th style="text-align:center">Công Nợ</th><th>Ghi Chú CP</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="bnhTb"><tr><td colspan="16" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('bnhSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_bnh.search=document.getElementById('bnhSearch').value||'';_bnhRender();},300);});
    _bnhLoadAll();
}

async function _bnhLoadAll(){
    // Load fabric module if not yet loaded
    if(!window._bnhFabLoaded){window._bnhFabLoaded=true;var s=document.createElement('script');s.src='/js/pages/fab-import-v4.js?v=20260531b';document.head.appendChild(s);}
    try{var[tR,sR,dR]=await Promise.all([apiCall('/api/import/tree'),apiCall('/api/import/sources'),apiCall('/api/import/check-duyet-perm')]);_bnh.tree=tR;_bnh.sources=sR.sources||[];_bnh.isDuyet=dR.allowed||false;_bnhRenderSb();await _bnhLoadRecs();
    // Check fabric permission
    setTimeout(function(){if(typeof _bnhCheckFabPerm==='function')_bnhCheckFabPerm();},300);
    }catch(e){console.error('[BNH]',e);}}

function _bnhFM(n){if(!n&&n!==0)return'0';return Number(n).toLocaleString('vi-VN');}
function _bnhFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}

// Parse fabric_items JSONB to compute tree count and import quantity by unit
function _bnhTreeInfo(r){
    if(r.record_type!=='fabric'||!r.fabric_items)return{trees:Number(r.fabric_quantity)||0,qty:'—'};
    var items;
    try{items=typeof r.fabric_items==='string'?JSON.parse(r.fabric_items):(r.fabric_items||[]);}catch(e){return{trees:Number(r.fabric_quantity)||0,qty:'—'};}
    if(!items.length)return{trees:Number(r.fabric_quantity)||0,qty:'—'};
    var tc=0,byUnit={};
    items.forEach(function(it){
        var trees=it.trees||[];tc+=trees.length;
        var u=it.unit||'kg';
        var total=trees.reduce(function(s,t){return s+(Number(t.weight)||0);},0);
        byUnit[u]=(byUnit[u]||0)+total;
    });
    var parts=[];
    Object.keys(byUnit).forEach(function(u){if(byUnit[u]>0)parts.push(_bnhFM(byUnit[u])+' '+u);});
    return{trees:tc,qty:parts.join(' + ')||'—',byUnit:byUnit};
}

function _bnhRenderSb(){var sb=document.getElementById('bnhSb');if(!sb)return;var t=_bnh.tree,f=_bnh.filter;
var h='<div class="bnh-sb-title"><span>────── 🧾 Bill Nhập Vải ──────</span></div>';
if(t&&t.totals){var tt=t.totals;
h+='<div class="bnh-sb-total" onclick="_bnhFilter()"><div style="display:flex;justify-content:space-between;align-items:center"><span>📦 Tất cả</span><span class="tv">'+(tt.total||0)+'</span></div><div class="ts">🌲 Cây vải: '+(tt.total_trees||0)+' &nbsp;|&nbsp; 💰 '+_bnhFM(tt.sum_total)+' ₫'+(Number(tt.sum_debt)>0?' &nbsp;|&nbsp; 🔴 Nợ: '+_bnhFM(tt.sum_debt)+' ₫':'')+'</div></div>';}
var u=window._currentUser||{};if(u.role==='giam_doc'||u.role==='quan_ly_cap_cao')h+='<div class="bnh-add-src" onclick="_bnhAddSrc()">➕ Thêm nguồn cung cấp</div>';
if(t&&t.sources)t.sources.forEach(function(s){var active=f.source_id==s.id;
h+='<div class="bnh-sb-src'+(active?' active':'')+'" onclick="_bnhFilter('+s.id+')"><span class="sn">🏪 '+s.name+'</span><span class="sc">['+s.count+']</span><span class="sm">'+_bnhFM(s.sum_total)+'₫</span></div>';});
sb.innerHTML=h;}

function _bnhFilter(sid){_bnh.filter.source_id=sid||null;_bnhRenderSb();_bnhLoadRecs();}

async function _bnhLoadRecs(){var f=_bnh.filter,qs='?_=1';
if(f.source_id)qs+='&source_id='+f.source_id;
try{var res=await apiCall('/api/import/records'+qs);_bnh.records=res.records||[];_bnhRender();}catch(e){console.error('[BNH]',e);}}

function _bnhDebt(d){var n=Number(d)||0;if(n>0)return'<span class="bnh-debt red">🔴 '+_bnhFM(n)+'</span>';if(n===0)return'<span class="bnh-debt green">✅ Đã TT</span>';return'<span class="bnh-debt blue">🔵 Dư '+_bnhFM(Math.abs(n))+'</span>';}

function _bnhRender(){
    var all=_bnh.records.slice();
    if(_bnh.search){var q=_bnh.search.toLowerCase();all=all.filter(function(r){return(r.fabric_material||'').toLowerCase().indexOf(q)>=0||(r.source_name||'').toLowerCase().indexOf(q)>=0||(r.fabric_import_code||'').toLowerCase().indexOf(q)>=0;});}
    var tot=all.length;
    var sumCost=0,sumTotal=0,sumPaid=0,sumDebt=0,sumTrees=0,sumQtyByUnit={};
    all.forEach(function(r){
        sumCost+=Number(r.cost)||0;sumTotal+=Number(r.total_amount)||0;sumPaid+=Number(r.paid)||0;sumDebt+=Number(r.debt)||0;
        var info=_bnhTreeInfo(r);sumTrees+=info.trees;
        if(info.byUnit){Object.keys(info.byUnit).forEach(function(u){sumQtyByUnit[u]=(sumQtyByUnit[u]||0)+info.byUnit[u];});}
    });
    // Build total import qty string
    var qtyParts=[];Object.keys(sumQtyByUnit).forEach(function(u){if(sumQtyByUnit[u]>0)qtyParts.push(_bnhFM(sumQtyByUnit[u])+' '+u);});
    var totalQtyStr=qtyParts.join(' + ')||'0';
    _bnh.sumDebt=sumDebt;

    var tb=document.getElementById('bnhTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="16"><div class="empty-state"><div class="icon">🧾</div><h3>Chưa có bill nhập vải</h3></div></td></tr>';}else{
    // Compute running cumulative debt (oldest → newest, bottom → top)
    var runDebt=new Array(all.length);var cumDebt=0;
    for(var ri=all.length-1;ri>=0;ri--){cumDebt+=Number(all[ri].debt)||0;runDebt[ri]=cumDebt;}
    tb.innerHTML=all.map(function(r,i){
        var upd='';if(r.last_update_at){upd=_bnhFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#4f46e5;font-size:9px">'+r.last_update_by+'</span>';}
        var info=_bnhTreeInfo(r);
        var duyetHtml='',payHtml='';
        if(!r.is_checked&&_bnh.isDuyet){duyetHtml='<button class="bnh-ib" onclick="event.stopPropagation();_bnhTog('+r.id+',\'check\')" title="Duyệt kiểm tra">⬜</button>';}
        else if(r.is_checked){duyetHtml='<span style="font-size:11px" title="Đã duyệt: '+(r.checked_by_name||'')+'">✅</span>';}
        if(Number(r.debt)>0){payHtml='<button class="bnh-ib" style="background:#fffbeb;border-color:#f59e0b" onclick="event.stopPropagation();_bnhPayModal('+r.id+','+r.debt+','+r.total_amount+')" title="Thanh toán">💳</button>';}
        else{payHtml='<span style="font-size:11px" title="Đã thanh toán đủ">✅</span>';}
        return '<tr style="'+(r.record_type==='fabric'?'cursor:pointer':'')+'" onclick="'+(r.record_type==='fabric'?'_bnhFabDetail('+r.id+')':'')+'"><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center">'+duyetHtml+'</td>'
        +'<td style="text-align:center">'+payHtml+'</td>'
        +'<td style="font-size:10px">'+_bnhFD(r.import_date)+'</td>'
        +'<td style="font-size:10px;color:#4f46e5;font-weight:700">'+(r.source_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+(r.importer_name||'—')+'</td>'
        +'<td style="font-weight:600;color:#1e293b;max-width:160px;overflow:hidden;text-overflow:ellipsis">'+(r.fabric_material||'—')+(r.record_type==='fabric'?'<span class="bnh-fab-badge">🧵 Vải</span>':'')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#4f46e5">'+_bnhFM(info.trees)+'</td>'
        +'<td style="text-align:center;font-weight:600;color:#7c3aed;font-size:10px">'+info.qty+'</td>'
        +'<td style="text-align:right;font-weight:600">'+_bnhFM(r.cost)+'</td>'
        +'<td style="text-align:right;color:#f59e0b;font-weight:600">'+_bnhFM(r.refund)+'</td>'
        +'<td style="text-align:right;font-weight:800;color:#1e293b">'+_bnhFM(r.total_amount)+'</td>'
        +'<td style="text-align:right;color:#059669;font-weight:700">'+_bnhFM(r.paid)+'</td>'
        +'<td style="text-align:center">'+_bnhDebt(runDebt[i])+'</td>'
        +'<td style="font-size:9px;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.cost_notes||'—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';}).join('');}
    var el=document.getElementById('bnhInfo');if(el){var src=_bnh.filter.source_id?(_bnh.sources.find(function(s){return s.id==_bnh.filter.source_id;})||{}).name||'':'Tất cả';
    el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">🧾 '+src+' — <span style="color:#c7d2fe;font-weight:900">'+tot+'</span> bill</div>';}
    var sc=document.getElementById('bnhStats');if(sc){
    sc.innerHTML='<div style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:6px 12px;border-radius:8px;min-width:70px;text-align:center;box-shadow:0 3px 10px #4f46e520;flex-shrink:0"><div style="font-size:8px;font-weight:600;opacity:.85;letter-spacing:.5px;margin-bottom:1px">📦 TỔNG BILL</div><div style="font-size:14px;font-weight:900">'+tot+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:6px 12px;border-radius:8px;min-width:70px;text-align:center;box-shadow:0 3px 10px #7c3aed20;flex-shrink:0"><div style="font-size:8px;font-weight:600;opacity:.85;letter-spacing:.5px;margin-bottom:1px">🌲 CÂY VẢI</div><div style="font-size:14px;font-weight:900">'+sumTrees+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;padding:6px 12px;border-radius:8px;min-width:80px;text-align:center;box-shadow:0 3px 10px #6d28d920;flex-shrink:0"><div style="font-size:8px;font-weight:600;opacity:.85;letter-spacing:.5px;margin-bottom:1px">📏 SL NHẬP</div><div style="font-size:12px;font-weight:900">'+totalQtyStr+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:6px 12px;border-radius:8px;min-width:80px;text-align:center;box-shadow:0 3px 10px #1e293b20;flex-shrink:0"><div style="font-size:8px;font-weight:600;opacity:.85;letter-spacing:.5px;margin-bottom:1px">💰 THÀNH TIỀN</div><div style="font-size:12px;font-weight:900">'+_bnhFM(sumTotal)+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:6px 12px;border-radius:8px;min-width:70px;text-align:center;box-shadow:0 3px 10px #05966920;flex-shrink:0"><div style="font-size:8px;font-weight:600;opacity:.85;letter-spacing:.5px;margin-bottom:1px">✅ ĐÃ TT</div><div style="font-size:12px;font-weight:900">'+_bnhFM(sumPaid)+'</div></div>'
    +'<div style="background:linear-gradient(135deg,'+(sumDebt>0?'#ef4444,#dc2626':'#059669,#10b981')+');color:#fff;padding:6px 12px;border-radius:8px;min-width:80px;text-align:center;box-shadow:0 3px 10px '+(sumDebt>0?'#ef444420':'#05966920')+';flex-shrink:0"><div style="font-size:8px;font-weight:600;opacity:.85;letter-spacing:.5px;margin-bottom:1px">📊 TỔNG CÔNG NỢ</div><div style="font-size:12px;font-weight:900">'+_bnhFM(sumDebt)+'</div></div>';}
}

async function _bnhTog(id,action){if(action==='check'&&!confirm('Xác nhận duyệt bill này?'))return;try{await apiCall('/api/import/toggle/'+id,'POST',{action});showToast('✅ Cập nhật');await _bnhLoadAll();}catch(e){showToast(e.message||'Lỗi','error');}}

function _bnhAddSrc(){var name=prompt('Nhập tên nguồn cung cấp:');if(!name)return;
apiCall('/api/import/sources','POST',{name}).then(function(){showToast('✅ Đã thêm nguồn: '+name);_bnhLoadAll();}).catch(function(e){showToast(e.message||'Lỗi','error');});}

// ========== PAYMENT MODAL ==========
var _bnhPay={importId:null,imageData:null};
function _bnhPayModal(importId,debt,total){
    _bnhPay={importId:importId,imageData:null};
    var remaining=Number(debt)||0;
    var ov=document.createElement('div');ov.id='_bnhPayOv';
    ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.onclick=function(){ov.remove();};
    ov.innerHTML='<div style="background:#fff;border-radius:16px;width:100%;max-width:480px;box-shadow:0 25px 50px rgba(0,0,0,.25)" onclick="event.stopPropagation()">'
    +'<div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#059669,#10b981);border-radius:16px 16px 0 0;color:#fff;display:flex;justify-content:space-between;align-items:center">'
    +'<div style="font-size:15px;font-weight:800">💳 Thanh Toán Bill</div>'
    +'<button onclick="document.getElementById(\'_bnhPayOv\').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;font-weight:600">✕ Đóng</button></div>'
    +'<div style="padding:20px">'
    +'<div style="background:#fee2e2;padding:10px 14px;border-radius:10px;margin-bottom:10px;display:flex;justify-content:space-between"><span style="font-size:12px;color:#dc2626;font-weight:700">📊 Tổng Công Nợ còn lại</span><span style="font-size:16px;font-weight:900;color:#dc2626">'+_bnhFM(_bnh.sumDebt||0)+'₫</span></div>'
    +'<div style="background:#f1f5f9;padding:8px 14px;border-radius:10px;margin-bottom:16px;display:flex;justify-content:space-between"><span style="font-size:11px;color:#6b7280;font-weight:600">Nợ bill này</span><span style="font-size:14px;font-weight:800;color:#f59e0b">'+_bnhFM(remaining)+'₫</span></div>'
    +'<div style="margin-bottom:14px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">💵 Số tiền thanh toán <span style="color:#dc2626">*</span></label>'
    +'<input id="_bnhPayAmt" type="number" placeholder="Nhập số tiền..." style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-weight:700;outline:none" max="'+remaining+'"></div>'
    +'<div style="margin-bottom:14px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">📸 Hình ảnh thanh toán <span style="color:#dc2626">* (Ctrl+V)</span></label>'
    +'<div id="_bnhPayImg" style="border:2px dashed #d1d5db;border-radius:10px;padding:30px;text-align:center;color:#9ca3af;cursor:pointer;min-height:80px;font-size:12px" tabindex="0">📋 Click vào đây rồi Ctrl+V dán hình ảnh</div></div>'
    +'<div style="margin-bottom:16px"><label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">📝 Ghi chú (tùy chọn)</label>'
    +'<textarea id="_bnhPayNote" rows="2" placeholder="Ghi chú thanh toán..." style="width:100%;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;resize:none;outline:none"></textarea></div>'
    +'<button id="_bnhPayBtn" onclick="_bnhPaySubmit()" style="width:100%;padding:12px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;transition:all .2s">💳 XÁC NHẬN THANH TOÁN</button>'
    +'</div></div>';
    document.body.appendChild(ov);
    // Attach paste handler
    var imgArea=document.getElementById('_bnhPayImg');
    imgArea.addEventListener('paste',function(e){
        var items=(e.clipboardData||e.originalEvent.clipboardData).items;
        for(var i=0;i<items.length;i++){if(items[i].type.indexOf('image')!==-1){var blob=items[i].getAsFile();var reader=new FileReader();
        reader.onload=function(ev){_bnhPay.imageData=ev.target.result;imgArea.innerHTML='<img src="'+ev.target.result+'" style="max-height:120px;border-radius:8px"><div style="font-size:10px;color:#059669;margin-top:4px;font-weight:600">✅ Đã dán hình ảnh</div>';imgArea.style.borderColor='#059669';};
        reader.readAsDataURL(blob);break;}}
        e.preventDefault();
    });
}
async function _bnhPaySubmit(){
    var amt=Number(document.getElementById('_bnhPayAmt').value)||0;
    if(amt<=0){showToast('Vui lòng nhập số tiền','error');return;}
    if(!_bnhPay.imageData){showToast('Vui lòng dán hình ảnh thanh toán (Ctrl+V)','error');return;}
    var note=document.getElementById('_bnhPayNote').value||'';
    var btn=document.getElementById('_bnhPayBtn');btn.disabled=true;btn.textContent='⏳ Đang xử lý...';
    try{
        var res=await apiCall('/api/import/payments/'+_bnhPay.importId,'POST',{amount:amt,image_data:_bnhPay.imageData,note:note});
        if(res.error){showToast(res.error,'error');btn.disabled=false;btn.textContent='💳 XÁC NHẬN THANH TOÁN';return;}
        showToast('✅ Thanh toán thành công: '+_bnhFM(amt)+'₫');
        var ov=document.getElementById('_bnhPayOv');if(ov)ov.remove();
        await _bnhLoadAll();
    }catch(e){showToast(e.message||'Lỗi','error');btn.disabled=false;btn.textContent='💳 XÁC NHẬN THANH TOÁN';}
}
