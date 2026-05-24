// ========== BILL NHẬP HÀNG — Desktop SPA ==========
var _bnh={records:[],tree:null,filter:{source_id:null},search:'',sources:[]};

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
    +'@media(max-width:768px){.bnh-sb{display:none}}';
    document.head.appendChild(st);}
    content.innerHTML='<div class="bnh-wrap"><div class="bnh-sb" id="bnhSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bnh-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="bnhInfo" style="font-size:12px"></div><div id="bnhStats" style="display:flex;gap:10px;flex:1;justify-content:center"></div><input id="bnhSearch" placeholder="🔍 Tìm chất liệu / vật liệu..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:220px;outline:none"></div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bnhTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th>✅</th><th>Ngày Nhập</th><th>Nguồn</th><th>NV Nhập</th><th>Chất Liệu - Màu Vải</th><th>SL Vải</th><th>Tên VL</th><th>SL VL</th><th>Chi Phí</th><th>Hoàn</th><th>Thành Tiền</th><th>Thanh Toán</th><th>Công Nợ</th><th>Ghi Chú CP</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="bnhTb"><tr><td colspan="16" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('bnhSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_bnh.search=document.getElementById('bnhSearch').value||'';_bnhRender();},300);});
    _bnhLoadAll();
}

async function _bnhLoadAll(){try{var[tR,sR]=await Promise.all([apiCall('/api/import/tree'),apiCall('/api/import/sources')]);_bnh.tree=tR;_bnh.sources=sR.sources||[];_bnhRenderSb();await _bnhLoadRecs();}catch(e){console.error('[BNH]',e);}}

function _bnhFM(n){if(!n&&n!==0)return'0';return Number(n).toLocaleString('vi-VN');}
function _bnhFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}

function _bnhRenderSb(){var sb=document.getElementById('bnhSb');if(!sb)return;var t=_bnh.tree,f=_bnh.filter;
var h='<div class="bnh-sb-title"><span>────── 🧾 Bill Nhập Hàng ──────</span></div>';
if(t&&t.totals){var tt=t.totals;
h+='<div class="bnh-sb-total" onclick="_bnhFilter()"><div style="display:flex;justify-content:space-between;align-items:center"><span>📦 Tất cả</span><span class="tv">'+(tt.total||0)+'</span></div><div class="ts">💰 '+_bnhFM(tt.sum_total)+' ₫'+(Number(tt.sum_debt)>0?' &nbsp;|&nbsp; 🔴 Nợ: '+_bnhFM(tt.sum_debt)+' ₫':'')+'</div></div>';}
h+='<div class="bnh-add-src" onclick="_bnhAddSrc()">➕ Thêm nguồn cung cấp</div>';
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
    if(_bnh.search){var q=_bnh.search.toLowerCase();all=all.filter(function(r){return(r.fabric_material||'').toLowerCase().indexOf(q)>=0||(r.material_name||'').toLowerCase().indexOf(q)>=0||(r.source_name||'').toLowerCase().indexOf(q)>=0;});}
    var tot=all.length;
    var sumCost=0,sumTotal=0,sumPaid=0,sumDebt=0;
    all.forEach(function(r){sumCost+=Number(r.cost)||0;sumTotal+=Number(r.total_amount)||0;sumPaid+=Number(r.paid)||0;sumDebt+=Number(r.debt)||0;});
    var tb=document.getElementById('bnhTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="16"><div class="empty-state"><div class="icon">🧾</div><h3>Chưa có bill nhập hàng</h3></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var cI=r.is_checked?'✅':'⬜',cC=r.is_checked?' on':'',cA=r.is_checked?'uncheck':'check';
        var upd='';if(r.last_update_at){upd=_bnhFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#4f46e5;font-size:9px">'+r.last_update_by+'</span>';}
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center"><button class="bnh-ib'+cC+'" onclick="_bnhTog('+r.id+',\''+cA+'\')" title="Duyệt">'+cI+'</button></td>'
        +'<td style="font-size:10px">'+_bnhFD(r.import_date)+'</td>'
        +'<td style="font-size:10px;color:#4f46e5;font-weight:700">'+(r.source_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+(r.importer_name||'—')+'</td>'
        +'<td style="font-weight:600;color:#1e293b;max-width:160px;overflow:hidden;text-overflow:ellipsis">'+(r.fabric_material||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#4f46e5">'+_bnhFM(r.fabric_quantity)+'</td>'
        +'<td style="font-size:10px;max-width:100px;overflow:hidden;text-overflow:ellipsis">'+(r.material_name||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700">'+_bnhFM(r.material_quantity)+'</td>'
        +'<td style="text-align:right;font-weight:600">'+_bnhFM(r.cost)+'</td>'
        +'<td style="text-align:right;color:#f59e0b;font-weight:600">'+_bnhFM(r.refund)+'</td>'
        +'<td style="text-align:right;font-weight:800;color:#1e293b">'+_bnhFM(r.total_amount)+'</td>'
        +'<td style="text-align:right;color:#059669;font-weight:700">'+_bnhFM(r.paid)+'</td>'
        +'<td>'+_bnhDebt(r.debt)+'</td>'
        +'<td style="font-size:9px;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.cost_notes||'—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';}).join('');}
    var el=document.getElementById('bnhInfo');if(el){var src=_bnh.filter.source_id?(_bnh.sources.find(function(s){return s.id==_bnh.filter.source_id;})||{}).name||'':'Tất cả';
    el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">🧾 '+src+' — <span style="color:#c7d2fe;font-weight:900">'+tot+'</span> bill</div>';}
    var sc=document.getElementById('bnhStats');if(sc){
    sc.innerHTML='<div style="background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center;box-shadow:0 4px 15px #4f46e530"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG BILL</div><div style="font-size:15px;font-weight:900">'+tot+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center;box-shadow:0 4px 15px #1e293b30"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">💰 THÀNH TIỀN</div><div style="font-size:13px;font-weight:900">'+_bnhFM(sumTotal)+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center;box-shadow:0 4px 15px #05966930"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">✅ ĐÃ TT</div><div style="font-size:13px;font-weight:900">'+_bnhFM(sumPaid)+'</div></div>'
    +'<div style="background:linear-gradient(135deg,'+(sumDebt>0?'#ef4444,#dc2626':'#059669,#10b981')+');color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center;box-shadow:0 4px 15px '+(sumDebt>0?'#ef444430':'#05966930')+'"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📊 CÔNG NỢ</div><div style="font-size:13px;font-weight:900">'+_bnhFM(sumDebt)+'</div></div>';}
}

async function _bnhTog(id,action){try{await apiCall('/api/import/toggle/'+id,'POST',{action});showToast('✅ Cập nhật');await _bnhLoadAll();}catch(e){showToast(e.message||'Lỗi','error');}}

function _bnhAddSrc(){var name=prompt('Nhập tên nguồn cung cấp:');if(!name)return;
apiCall('/api/import/sources','POST',{name}).then(function(){showToast('✅ Đã thêm nguồn: '+name);_bnhLoadAll();}).catch(function(e){showToast(e.message||'Lỗi','error');});}
