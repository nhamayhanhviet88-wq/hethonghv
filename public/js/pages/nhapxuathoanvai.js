// ========== NHẬP XUẤT HOÀN VẢI — Desktop SPA ==========
var _nxhv={records:[],tree:null,filter:{tx_type:null,year:null,month:null},search:''};
var _nxhvOpen={};
var _nxhvTL={HOAN:'Hoàn',NHAP_KK:'Nhập KK',XUAT_KK:'Xuất KK',NHAP:'Nhập Vải',XUAT:'Xuất Vải'};
var _nxhvIC={HOAN:'🔄',NHAP_KK:'📥',XUAT_KK:'📤',NHAP:'📦',XUAT:'🚛'};
var _nxhvCL={HOAN:'#059669',NHAP_KK:'#7c3aed',XUAT_KK:'#ea580c',NHAP:'#2563eb',XUAT:'#dc2626'};

function renderNhapxuathoanvaiPage(content){
    if(!document.getElementById('_nxhvS')){var st=document.createElement('style');st.id='_nxhvS';
    st.textContent='.nxhv-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.nxhv-sb{width:280px;min-width:280px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.nxhv-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.nxhv-main>*{flex-shrink:0}'
    +'.nxhv-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#0891b2}'
    +'.nxhv-sb-total{background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;padding:12px 16px;font-size:12px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center}'
    +'.nxhv-sb-type{padding:8px 16px;font-weight:800;font-size:11px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--gray-200)}'
    +'.nxhv-sb-type:hover{background:#ecfeff}'
    +'.nxhv-sb-yr{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;color:#475569}'
    +'.nxhv-sb-yr:hover{background:#f0f9ff}'
    +'.nxhv-sb-mo{padding:5px 16px 5px 44px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #fafafa;color:#64748b}'
    +'.nxhv-sb-mo:hover{background:#ecfeff}.nxhv-sb-mo.active{background:#cffafe;color:#0891b2;font-weight:800}'
    +'.nxhv-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s}'
    +'.nxhv-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
    +'.nxhv-ib.on{background:#ccfbf1;border-color:#14b8a6}'
    +'.nxhv-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800;color:#fff}'
    +'.nxhv-debt{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800}'
    +'.nxhv-debt.red{background:#fee2e2;color:#dc2626}.nxhv-debt.green{background:#d1fae5;color:#059669}'
    +'@media(max-width:768px){.nxhv-sb{display:none}}';
    document.head.appendChild(st);}
    content.innerHTML='<div class="nxhv-wrap"><div class="nxhv-sb" id="nxhvSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="nxhv-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="nxhvInfo" style="font-size:12px"></div><div id="nxhvStats" style="display:flex;gap:8px;flex:1;justify-content:center;flex-wrap:wrap"></div><input id="nxhvSearch" placeholder="🔍 Tìm chất liệu / màu / nguồn..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:220px;outline:none"></div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="nxhvTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th>✅</th><th>📸</th><th>Nghiệp Vụ</th><th>Ngày</th><th>Nguồn Vải</th><th>NV</th><th>Chất Liệu</th><th>Màu Vải</th><th>ĐVT</th><th>Các Cây</th><th>Số Cây</th><th>Tổng SL</th><th>Giá</th><th>Thành Tiền</th><th>Công Nợ</th><th>Thanh Toán</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="nxhvTb"><tr><td colspan="18" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('nxhvSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_nxhv.search=document.getElementById('nxhvSearch').value||'';_nxhvRender();},300);});
    _nxhvLoadAll();
}

async function _nxhvLoadAll(){try{var tR=await apiCall('/api/fabrictx/tree');_nxhv.tree=tR;_nxhvRenderSb();await _nxhvLoadRecs();}catch(e){console.error('[NXHV]',e);}}
function _nxhvFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}
function _nxhvFN(n){if(!n&&n!==0)return'0';return Number(n).toLocaleString('vi-VN');}

function _nxhvRenderSb(){var sb=document.getElementById('nxhvSb');if(!sb||!_nxhv.tree)return;var t=_nxhv.tree,f=_nxhv.filter;
var h='<div class="nxhv-sb-title">────── 🔄 Nhập Xuất Hoàn Vải ──────</div>';
h+='<div class="nxhv-sb-total" onclick="_nxhvFilter()"><span>📦 Tất cả</span><span style="font-size:16px;font-weight:900">'+(t.grand_total||0)+'</span></div>';
if(t.types)t.types.forEach(function(tp){var tk='t_'+tp.type,to=!!_nxhvOpen[tk],cl=_nxhvCL[tp.type]||'#0891b2';
h+='<div class="nxhv-sb-type" style="color:'+cl+'" onclick="_nxhvTgl(\''+tk+'\');_nxhvFilter(\''+tp.type+'\')"><span>'+(to?'▼':'▶')+' '+(_nxhvIC[tp.type]||'')+' '+tp.label+'</span><span style="background:'+cl+';color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+tp.total+'</span></div>';
if(to&&tp.years)tp.years.forEach(function(yr){var yk=tk+'_'+yr.year,yo=!!_nxhvOpen[yk];
h+='<div class="nxhv-sb-yr" onclick="event.stopPropagation();_nxhvTgl(\''+yk+'\');_nxhvFilter(\''+tp.type+'\','+yr.year+')"><span>'+(yo?'▼':'▶')+' 📆 '+yr.year+'</span><span>'+yr.count+'</span></div>';
if(yo)yr.months.forEach(function(mo){var mA=f.tx_type===tp.type&&f.year==yr.year&&f.month==mo.month;
h+='<div class="nxhv-sb-mo'+(mA?' active':'')+'" onclick="event.stopPropagation();_nxhvFilter(\''+tp.type+'\','+yr.year+','+mo.month+')"><span>T'+String(mo.month).padStart(2,'0')+'/'+yr.year+'</span><span>'+mo.count+'</span></div>';
});});});sb.innerHTML=h;}

function _nxhvTgl(k){_nxhvOpen[k]=!_nxhvOpen[k];_nxhvRenderSb();}
function _nxhvFilter(type,y,m){_nxhv.filter={tx_type:type||null,year:y||null,month:m||null};_nxhvRenderSb();_nxhvLoadRecs();}

async function _nxhvLoadRecs(){var f=_nxhv.filter,qs='?_=1';
if(f.tx_type)qs+='&tx_type='+f.tx_type;if(f.year)qs+='&year='+f.year;if(f.month)qs+='&month='+f.month;
try{var res=await apiCall('/api/fabrictx/records'+qs);_nxhv.records=res.records||[];_nxhvRender();}catch(e){console.error('[NXHV]',e);}}

function _nxhvRender(){
    var all=_nxhv.records.slice();
    if(_nxhv.search){var q=_nxhv.search.toLowerCase();all=all.filter(function(r){return(r.material_name||'').toLowerCase().indexOf(q)>=0||(r.color_name||'').toLowerCase().indexOf(q)>=0||(r.source_name||'').toLowerCase().indexOf(q)>=0;});}
    var tot=all.length,sumTA=0,sumDebt=0,sumPay=0;
    all.forEach(function(r){sumTA+=Number(r.total_amount)||0;sumDebt+=Number(r.debt)||0;sumPay+=Number(r.payment)||0;});
    var tb=document.getElementById('nxhvTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="18"><div class="empty-state"><div class="icon">🔄</div><h3>Chưa có giao dịch</h3></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var aI=r.is_approved?'✅':'⬜',aC=r.is_approved?' on':'',aA=r.is_approved?'unapprove':'approve';
        var cl=_nxhvCL[r.tx_type]||'#0891b2';
        var imgs='—';try{var ia=typeof r.bill_images==='string'?JSON.parse(r.bill_images):r.bill_images;if(ia&&ia.length)imgs='📸 '+ia.length;}catch(e){}
        var debt=Number(r.debt)||0;var dB=debt>0?'<span class="nxhv-debt red">🔴 '+_nxhvFN(debt)+'</span>':'<span class="nxhv-debt green">✅ 0</span>';
        var upd='';if(r.last_update_at){upd=_nxhvFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#0891b2;font-size:9px">'+r.last_update_by+'</span>';}
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center"><button class="nxhv-ib'+aC+'" onclick="_nxhvTog('+r.id+',\''+aA+'\')" title="Duyệt">'+aI+'</button></td>'
        +'<td style="text-align:center;font-size:10px">'+imgs+'</td>'
        +'<td><span class="nxhv-tag" style="background:'+cl+'">'+(_nxhvTL[r.tx_type]||r.tx_type)+'</span></td>'
        +'<td style="font-size:10px">'+_nxhvFD(r.tx_date)+'</td>'
        +'<td style="font-size:10px;color:#0891b2;font-weight:700">'+(r.source_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+(r.staff_name||'—')+'</td>'
        +'<td style="font-weight:600;color:#1e293b">'+(r.material_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#6366f1;font-weight:600">'+(r.color_name||'—')+'</td>'
        +'<td style="font-size:10px;color:#94a3b8">'+(r.unit||'kg')+'</td>'
        +'<td style="font-size:9px;max-width:100px;overflow:hidden;text-overflow:ellipsis">'+(r.tree_details||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700">'+_nxhvFN(r.tree_count)+'</td>'
        +'<td style="text-align:center;font-weight:800;color:#0891b2">'+_nxhvFN(r.total_quantity)+'</td>'
        +'<td style="text-align:right;font-weight:600;color:#f59e0b">'+_nxhvFN(r.price)+'</td>'
        +'<td style="text-align:right;font-weight:800;color:#1e293b">'+_nxhvFN(r.total_amount)+'</td>'
        +'<td>'+dB+'</td>'
        +'<td style="text-align:right;color:#059669;font-weight:700">'+_nxhvFN(r.payment)+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';}).join('');}
    var el=document.getElementById('nxhvInfo');if(el){var lbl=_nxhv.filter.tx_type?(_nxhvTL[_nxhv.filter.tx_type]||''):'Tất cả';
    el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">🔄 '+lbl+' — <span style="color:#a5f3fc;font-weight:900">'+tot+'</span> giao dịch</div>';}
    var sc=document.getElementById('nxhvStats');if(sc){
    sc.innerHTML='<div style="background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG</div><div style="font-size:14px;font-weight:900">'+tot+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">💰 THÀNH TIỀN</div><div style="font-size:12px;font-weight:900">'+_nxhvFN(sumTA)+'</div></div>'
    +'<div style="background:linear-gradient(135deg,'+(sumDebt>0?'#ef4444,#dc2626':'#059669,#10b981')+');color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📊 CÔNG NỢ</div><div style="font-size:12px;font-weight:900">'+_nxhvFN(sumDebt)+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 14px;border-radius:10px;min-width:90px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">✅ THANH TOÁN</div><div style="font-size:12px;font-weight:900">'+_nxhvFN(sumPay)+'</div></div>';}
}

async function _nxhvTog(id,action){try{await apiCall('/api/fabrictx/toggle/'+id,'POST',{action});showToast('✅ Cập nhật');await _nxhvLoadAll();}catch(e){showToast(e.message||'Lỗi','error');}}
