// ========== KIỂM KHO — Desktop SPA ==========
var _kk={rolls:[],tree:null,filter:{warehouse_id:null,material_id:null},search:''};
var _kkOpen={};

function renderKiemkhoPage(content){
    if(!document.getElementById('_kkS')){var st=document.createElement('style');st.id='_kkS';
    st.textContent='.kk-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.kk-sb{width:280px;min-width:280px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.kk-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.kk-main>*{flex-shrink:0}'
    +'.kk-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#0d9488}'
    +'.kk-sb-total{background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:12px 16px;font-size:12px;font-weight:700;cursor:pointer}'
    +'.kk-sb-total .tv{font-size:16px;font-weight:900}.kk-sb-total .ts{font-size:10px;opacity:.85;margin-top:2px}'
    +'.kk-sb-wh{padding:8px 16px;font-weight:800;font-size:11px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
    +'.kk-sb-mat{padding:6px 16px 6px 28px;font-size:11px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;color:#0d9488}'
    +'.kk-sb-mat:hover{background:#f0fdfa}.kk-sb-mat.active{background:#ccfbf1;font-weight:800;color:#0f766e}'
    +'.kk-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
    +'.kk-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
    +'.kk-ib.on{background:#ccfbf1;border-color:#14b8a6}'
    +'.kk-diff{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800}'
    +'.kk-diff.ok{background:#d1fae5;color:#059669}.kk-diff.short{background:#fee2e2;color:#dc2626}.kk-diff.over{background:#dbeafe;color:#2563eb}'
    +'.kk-grp{background:#f0fdfa;padding:8px 12px;font-weight:800;color:#0f766e;font-size:12px;border-top:2px solid #99f6e4}'
    +'@media(max-width:768px){.kk-sb{display:none}}';
    document.head.appendChild(st);}
    content.innerHTML='<div class="kk-wrap"><div class="kk-sb" id="kkSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="kk-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="kkInfo" style="font-size:12px"></div><div id="kkStats" style="display:flex;gap:10px;flex:1;justify-content:center"></div><input id="kkSearch" placeholder="🔍 Tìm chất liệu / màu..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none"></div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="kkTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th>📋</th><th>➕</th><th>Tên Vải / Chất Liệu</th><th>Tồn Kho (kg)</th><th>Ghi Chú KK</th><th>Kiểm Kho (kg)</th><th>Chênh Lệch</th><th>Cập Nhật</th>'
    +'</tr></thead><tbody id="kkTb"><tr><td colspan="9" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('kkSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_kk.search=document.getElementById('kkSearch').value||'';_kkRender();},300);});
    _kkLoadAll();
}

async function _kkLoadAll(){try{var tR=await apiCall('/api/stockcheck/tree');_kk.tree=tR;_kkRenderSb();await _kkLoadRolls();}catch(e){console.error('[KK]',e);}}

function _kkRenderSb(){var sb=document.getElementById('kkSb');if(!sb||!_kk.tree)return;var t=_kk.tree,f=_kk.filter;
var h='<div class="kk-sb-title">────── 📋 Kiểm Kho Vải ──────</div>';
h+='<div class="kk-sb-total" onclick="_kkFilter()"><div style="display:flex;justify-content:space-between"><span>📦 Tất cả</span><span class="tv">'+(t.totals.total_rolls||0)+'</span></div><div class="ts">⚖️ '+Number(t.totals.total_weight||0).toLocaleString('vi-VN')+' kg &nbsp;|&nbsp; ✅ Đã kiểm: '+(t.checked_count||0)+'</div></div>';
if(t.tree)t.tree.forEach(function(w){var wo=!!_kkOpen['w'+w.id];
h+='<div class="kk-sb-wh" onclick="_kkTgl(\'w'+w.id+'\')"><span>'+(wo?'▼':'▶')+' 🏭 '+w.name+'</span><span style="background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+w.roll_count+'</span></div>';
if(wo&&w.materials)w.materials.forEach(function(m){var mA=f.material_id==m.id;
h+='<div class="kk-sb-mat'+(mA?' active':'')+'" onclick="event.stopPropagation();_kkFilter('+w.id+','+m.id+')"><span>📦 '+m.name+'</span><span style="font-size:9px;color:#94a3b8">'+m.roll_count+' | '+Number(m.total_weight).toLocaleString('vi-VN')+'</span></div>';});
});sb.innerHTML=h;}

function _kkTgl(k){_kkOpen[k]=!_kkOpen[k];_kkRenderSb();}
function _kkFilter(wid,mid){_kk.filter={warehouse_id:wid||null,material_id:mid||null};_kkRenderSb();_kkLoadRolls();}

async function _kkLoadRolls(){var f=_kk.filter,qs='?_=1';
if(f.material_id)qs+='&material_id='+f.material_id;
else if(f.warehouse_id)qs+='&warehouse_id='+f.warehouse_id;
try{var res=await apiCall('/api/stockcheck/rolls'+qs);_kk.rolls=res.rolls||[];_kkRender();}catch(e){console.error('[KK]',e);}}

function _kkFD(d){if(!d)return'';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}
function _kkDiff(d){if(d===null||d===undefined)return'<span class="kk-diff" style="background:#f1f5f9;color:#94a3b8">— Chưa kiểm</span>';var n=Number(d);if(n===0)return'<span class="kk-diff ok">✅ Khớp</span>';if(n>0)return'<span class="kk-diff short">🔴 Thiếu '+n.toLocaleString('vi-VN')+' kg</span>';return'<span class="kk-diff over">🔵 Dư '+Math.abs(n).toLocaleString('vi-VN')+' kg</span>';}

function _kkRender(){
    var all=_kk.rolls.slice();
    if(_kk.search){var q=_kk.search.toLowerCase();all=all.filter(function(r){return(r.material_name||'').toLowerCase().indexOf(q)>=0||(r.color_name||'').toLowerCase().indexOf(q)>=0;});}
    var tot=all.length,ck=all.filter(function(r){return r.is_checked;}).length;
    var tb=document.getElementById('kkTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="9"><div class="empty-state"><div class="icon">📋</div><h3>Chưa có dữ liệu</h3><p>Chọn chất liệu từ sidebar</p></div></td></tr>';}else{
    // Group by material_name + color_name
    var groups={},order=[];
    all.forEach(function(r){var k=r.material_name+' - '+r.color_name;if(!groups[k]){groups[k]=[];order.push(k);}groups[k].push(r);});
    var html='',idx=0;
    order.forEach(function(k){
    var rows=groups[k],first=rows[0];
    var grpW=rows.reduce(function(s,r){return s+Number(r.system_weight||0);},0);
    html+='<tr><td colspan="9" class="kk-grp">📦 '+k+' <span style="font-weight:600;color:#0d9488;font-size:10px;margin-left:8px">('+rows.length+' cây | ⚖️ '+grpW.toLocaleString('vi-VN')+' kg)</span></td></tr>';
    rows.forEach(function(r){idx++;
        var cI=r.is_checked?'📋':'⬜',cC=r.is_checked?' on':'';
        var upd='';if(r.last_update_at){upd=_kkFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#0d9488;font-size:9px">'+r.last_update_by+'</span>';}
        html+='<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+idx+'</td>'
        +'<td style="text-align:center"><button class="kk-ib'+cC+'" onclick="_kkTog('+r.roll_id+')" title="Kiểm kho">'+cI+'</button></td>'
        +'<td style="text-align:center"><button class="kk-ib" onclick="_kkSurplus('+r.fabric_color_id+',\''+k.replace(/'/g,"\\'")+'\')" title="Nhập cây thừa">➕</button></td>'
        +'<td style="font-size:10px;color:#1e293b"><span style="color:#0d9488;font-weight:700">'+r.roll_code+'</span> <span style="color:#94a3b8">('+Number(r.original_weight||0).toLocaleString('vi-VN')+'kg gốc)</span></td>'
        +'<td style="text-align:center;font-weight:800;color:#0d9488;font-size:13px">'+Number(r.system_weight||0).toLocaleString('vi-VN')+'</td>'
        +'<td style="font-size:9px;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.sc_notes||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:'+(r.actual_weight!==null&&r.actual_weight!==undefined?'#1e293b':'#94a3b8')+'">'+((r.actual_weight!==null&&r.actual_weight!==undefined)?Number(r.actual_weight).toLocaleString('vi-VN'):'<span style="cursor:pointer" onclick="_kkInput('+r.roll_id+','+Number(r.system_weight)+')">📝</span>')+'</td>'
        +'<td>'+_kkDiff(r.actual_weight!==null&&r.actual_weight!==undefined?r.difference:null)+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';
    });});
    tb.innerHTML=html;}
    var el=document.getElementById('kkInfo');if(el){el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">📋 Kiểm Kho Vải — <span style="color:#99f6e4;font-weight:900">'+tot+'</span> cây</div>';}
    var sc=document.getElementById('kkStats');if(sc){
    var sumW=all.reduce(function(s,r){return s+Number(r.system_weight||0);},0);
    sc.innerHTML='<div style="background:linear-gradient(135deg,#0d9488,#14b8a6);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG CÂY</div><div style="font-size:15px;font-weight:900">'+tot+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">⚖️ TỔNG KG</div><div style="font-size:13px;font-weight:900">'+sumW.toLocaleString('vi-VN')+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">✅ ĐÃ KIỂM</div><div style="font-size:15px;font-weight:900">'+ck+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 18px;border-radius:10px;min-width:100px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">⏳ CHƯA KIỂM</div><div style="font-size:15px;font-weight:900">'+(tot-ck)+'</div></div>';}
}

async function _kkTog(rollId){try{await apiCall('/api/stockcheck/check/'+rollId,'POST',{action:'toggle_check'});showToast('✅ Cập nhật');await _kkLoadAll();}catch(e){showToast(e.message||'Lỗi','error');}}
function _kkInput(rollId,sysW){var v=prompt('Nhập cân thực tế (kg):\n(Tồn hệ thống: '+sysW+' kg)');if(v===null)return;v=Number(v);if(isNaN(v)||v<0){showToast('Số không hợp lệ','error');return;}
var n=prompt('Ghi chú kiểm kho (tuỳ chọn):');
apiCall('/api/stockcheck/check/'+rollId,'POST',{actual_weight:v,notes:n||''}).then(function(){showToast('✅ Đã kiểm: '+v+'kg');_kkLoadAll();}).catch(function(e){showToast(e.message||'Lỗi','error');});}
function _kkSurplus(fcid,label){var w=prompt('Nhập cây thừa cho:\n'+label+'\n\nTrọng lượng (kg):');if(!w)return;w=Number(w);if(isNaN(w)||w<=0){showToast('Số không hợp lệ','error');return;}
var n=prompt('Ghi chú (tuỳ chọn):');
apiCall('/api/stockcheck/add-surplus','POST',{fabric_color_id:fcid,weight:w,note:n||''}).then(function(){showToast('✅ Đã nhập cây thừa: '+w+'kg');_kkLoadAll();}).catch(function(e){showToast(e.message||'Lỗi','error');});}
