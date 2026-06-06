// ========== VẬT LIỆU PET/TEM — Desktop SPA ==========

var _pt={tree:null,rolls:[],filter:{roll_type:null,year:null,month:null},search:''};
var _ptOpen={};
var _ptTL={PET:'PET',TEM:'Tem',DECAL:'Decal'};
var _ptIC={PET:'🏷️',TEM:'🎫',DECAL:'📋'};
var _ptCL={PET:'#e11d48',TEM:'#7c3aed',DECAL:'#d97706'};
var _ptImpStocks={PET:0,TEM:0};

function renderVatlieutempetPage(content){
    if(!document.getElementById('_ptStyle')){
        var st=document.createElement('style');
        st.id='_ptStyle';
        st.textContent='.pt-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden;font-family:"Inter",sans-serif}'
        +'.pt-sb{width:240px;min-width:240px;background:#fff;border-right:1px solid #e2e8f0;overflow-y:auto;display:flex;flex-direction:column}'
        +'.pt-sb-title{padding:16px;font-size:11px;font-weight:800;color:var(--gray-500);text-transform:uppercase;letter-spacing:1px;text-align:center;border-bottom:1px solid #f0f0f0}'
        +'.pt-sb-total{padding:12px 16px;font-size:12px;font-weight:700;color:#1e293b;cursor:pointer;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center}'
        +'.pt-sb-total:hover{background:#f8fafc}'
        +'.pt-sb-type{padding:10px 16px;font-size:12px;font-weight:800;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0}'
        +'.pt-sb-type:hover{background:#fdf2f8}'
        +'.pt-sb-yr{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;color:#475569}'
        +'.pt-sb-yr:hover{background:#fdf2f8}'
        +'.pt-sb-mo{padding:5px 16px 5px 44px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #fafafa;color:#64748b}'
        +'.pt-sb-mo:hover{background:#fff1f2}.pt-sb-mo.active{background:#ffe4e6;color:#e11d48;font-weight:800}'
        +'.pt-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800;color:#fff}'
        +'.pt-rem{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800}'
        +'.pt-rem.pos{background:#d1fae5;color:#059669}.pt-rem.zero{background:#f1f5f9;color:#94a3b8}.pt-rem.neg{background:#fee2e2;color:#dc2626}'
        +'.pt-btn { padding: 6px 12px; font-size: 11px; font-weight: 700; border-radius: 6px; cursor: pointer; border: none; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px; }'
        +'.pt-btn-primary { background: #e11d48; color: #fff; }'
        +'.pt-btn-primary:hover { background: #be123c; }'
        +'.pt-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 1000; }'
        +'.pt-modal-content { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; width: 450px; max-width: 95%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); animation: ptFadeIn 0.2s ease-out; color: #0f172a; }'
        +'.pt-modal-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }'
        +'.pt-modal-header h3 { margin: 0; font-size: 15px; font-weight: 800; color: #0f172a; }'
        +'.pt-close-btn { font-size: 20px; cursor: pointer; color: #64748b; transition: color 0.2s; }'
        +'.pt-close-btn:hover { color: #0f172a; }'
        +'.pt-modal-body { padding: 20px; overflow-y: auto; flex: 1; }'
        +'.pt-form-group { margin-bottom: 12px; }'
        +'.pt-form-group label { display: block; font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 4px; }'
        +'.pt-form-group input, .pt-form-group select, .pt-form-group textarea { width: 100%; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; color: #0f172a; padding: 8px; font-size: 12px; outline: none; }'
        +'.pt-form-group input:focus, .pt-form-group select:focus, .pt-form-group textarea:focus { border-color: #e11d48; }'
        +'.pt-form-group input[readonly] { background: #f1f5f9; color: #64748b; cursor: not-allowed; }'
        +'@keyframes ptFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }'
        +'@media(max-width:768px){.pt-sb{display:none}}';
        document.head.appendChild(st);}
    content.innerHTML='<div class="pt-wrap"><div class="pt-sb" id="ptSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="pt-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="ptInfo" style="font-size:12px"></div><div id="ptStats" style="display:flex;gap:8px;flex:1;justify-content:center;flex-wrap:wrap"></div><button class="pt-btn pt-btn-primary" onclick="openPtImportModal()">➕ Thêm Vật Liệu</button><input id="ptSearch" placeholder="🔍 Tìm lĩnh vực, ghi chú..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none"></div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="ptTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th>Cây</th><th>Ngày Nhập</th><th>Lĩnh Vực</th><th>SL Nhập</th><th>Hao Hụt</th><th>SL Sai</th><th>Tồn Cuối</th><th>Đã In</th><th>Người Chốt</th><th>Ghi Chú</th><th>Lịch sử CN</th>'
    +'</tr></thead><tbody id="ptTb"><tr><td colspan="12" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('ptSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_pt.search=document.getElementById('ptSearch').value||'';_ptRender();},300);});
    _ptLoadAll();
}

async function _ptLoadAll(){try{var tR=await apiCall('/api/pettem/tree');_pt.tree=tR;_ptRenderSb();await _ptLoadRolls();}catch(e){console.error('[PT]',e);}}
function _ptFD(d){if(!d)return'—';try{var p=d.split('T')[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return d;}}
function _ptFN(n){if(!n&&n!==0)return'0';return Number(n).toLocaleString('vi-VN');}

function _ptRenderSb(){var sb=document.getElementById('ptSb');if(!sb||!_pt.tree)return;var t=_pt.tree,f=_pt.filter;
var h='<div class="pt-sb-title">────── 🏷️ Vật Liệu PET/TEM ──────</div>';
h+='<div class="pt-sb-total" onclick="_ptFilter()"><span>📦 Tất cả</span><span style="font-size:16px;font-weight:900">'+(t.grand_total||0)+'</span></div>';
if(t.types)t.types.forEach(function(tp){var tk='t_'+tp.type,to=!!_ptOpen[tk],cl=_ptCL[tp.type]||'#e11d48';
h+='<div class="pt-sb-type" style="color:'+cl+'" onclick="_ptTgl(\''+tk+'\');_ptFilter(\''+tp.type+'\')"><span>'+(to?'▼':'▶')+' '+(_ptIC[tp.type]||'')+' '+tp.label+'</span><span style="background:'+cl+';color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+tp.total+'</span></div>';
if(to&&tp.years)tp.years.forEach(function(yr){var yk=tk+'_'+yr.year,yo=!!_ptOpen[yk];
h+='<div class="pt-sb-yr" onclick="event.stopPropagation();_ptTgl(\''+yk+'\');_ptFilter(\''+tp.type+'\','+yr.year+')"><span>'+(yo?'▼':'▶')+' 📆 '+yr.year+'</span><span>'+yr.count+'</span></div>';
if(yo)yr.months.forEach(function(mo){var mA=f.roll_type===tp.type&&f.year==yr.year&&f.month==mo.month;
h+='<div class="pt-sb-mo'+(mA?' active':'')+'" onclick="event.stopPropagation();_ptFilter(\''+tp.type+'\','+yr.year+','+mo.month+')"><span>T'+String(mo.month).padStart(2,'0')+'/'+yr.year+'</span><span>'+mo.count+'</span></div>';
});});});sb.innerHTML=h;}

function _ptTgl(k){_ptOpen[k]=!_ptOpen[k];_ptRenderSb();}
function _ptFilter(type,y,m){_pt.filter={roll_type:type||null,year:y||null,month:m||null};_ptRenderSb();_ptLoadRolls();}

async function _ptLoadRolls(){var f=_pt.filter,qs='?_=1';
if(f.roll_type)qs+='&roll_type='+f.roll_type;if(f.year)qs+='&year='+f.year;if(f.month)qs+='&month='+f.month;
try{var res=await apiCall('/api/pettem/rolls'+qs);_pt.rolls=res.rolls||[];_ptRender();}catch(e){console.error('[PT]',e);}}

function _ptRender(){
    var all=_pt.rolls.slice();
    if(_pt.search){var q=_pt.search.toLowerCase();all=all.filter(function(r){return(r.field_name||'').toLowerCase().indexOf(q)>=0||(r.notes||'').toLowerCase().indexOf(q)>=0;});}
    var tot=all.length,sumImp=0,sumPr=0,sumRem=0;
    all.forEach(function(r){sumImp+=Number(r.qty_imported)||0;sumPr+=Number(r.qty_printed)||0;sumRem+=Number(r.qty_remaining)||0;});
    var tb=document.getElementById('ptTb');if(!tb)return;
    if(!all.length){tb.innerHTML='<tr><td colspan="12"><div class="empty-state"><div class="icon">🏷️</div><h3>Chưa có dữ liệu</h3><p>Chọn loại từ sidebar</p></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var cl=_ptCL[r.roll_type]||'#e11d48';
        var rem=Number(r.qty_remaining)||0;var rC=rem>0?'pos':rem===0?'zero':'neg';
        var rL=rem>0?'🟢 '+_ptFN(rem):rem===0?'⚪ 0':'🔴 '+_ptFN(rem);
        var upd='';if(r.last_update_at){upd=_ptFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#e11d48;font-size:9px">'+r.last_update_by+'</span>';}
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td><span class="pt-tag" style="background:'+cl+'">'+(_ptTL[r.roll_type]||r.roll_type)+'</span></td>'
        +'<td style="font-size:10px">'+_ptFD(r.import_date)+'</td>'
        +'<td style="font-size:10px;color:#1e293b;font-weight:600">'+(r.field_name||'—')+'</td>'
        +'<td style="text-align:center;font-weight:800;color:#e11d48;font-size:13px">'+_ptFN(r.qty_imported)+'</td>'
        +'<td style="text-align:center;color:#f59e0b;font-weight:600">'+_ptFN(r.qty_waste)+'</td>'
        +'<td style="text-align:center;color:#dc2626;font-weight:600">'+_ptFN(r.qty_error)+'</td>'
        +'<td><span class="pt-rem '+rC+'">'+rL+'</span></td>'
        +'<td style="text-align:center;font-weight:700;color:#059669">'+_ptFN(r.qty_printed)+'</td>'
        +'<td style="font-size:10px;color:#6366f1;font-weight:600">'+(r.confirmed_by_name||'—')+'</td>'
        +'<td style="font-size:9px;max-width:100px;overflow:hidden;text-overflow:ellipsis">'+(r.notes||'—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';}).join('');}
    var el=document.getElementById('ptInfo');if(el){var lbl=_pt.filter.roll_type?(_ptTL[_pt.filter.roll_type]||''):'Tất cả';
    el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#e11d48,#f43f5e);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">🏷️ '+lbl+' — <span style="color:#fecdd3;font-weight:900">'+tot+'</span> cây</div>';}
    var sc=document.getElementById('ptStats');if(sc){
    sc.innerHTML='<div style="background:linear-gradient(135deg,#e11d48,#f43f5e);color:#fff;padding:8px 14px;border-radius:10px;min-width:80px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG CÂY</div><div style="font-size:14px;font-weight:900">'+tot+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#be123c,#e11d48);color:#fff;padding:8px 14px;border-radius:10px;min-width:80px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📥 SL NHẬP</div><div style="font-size:13px;font-weight:900">'+_ptFN(sumImp)+'</div></div>'
    +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 14px;border-radius:10px;min-width:80px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">🖨️ ĐÃ IN</div><div style="font-size:13px;font-weight:900">'+_ptFN(sumPr)+'</div></div>'
    +'<div style="background:linear-gradient(135deg,'+(sumRem>=0?'#0891b2,#06b6d4':'#dc2626,#ef4444')+');color:#fff;padding:8px 14px;border-radius:10px;min-width:80px;text-align:center"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📊 TỒN CUỐI</div><div style="font-size:13px;font-weight:900">'+_ptFN(sumRem)+'</div></div>';}
}

// ========== IMPORT FROM WAREHOUSE MODAL ==========
async function openPtImportModal() {
    var m = document.getElementById('ptImportModal');
    if (!m) {
        m = document.createElement('div');
        m.id = 'ptImportModal';
        m.className = 'pt-modal';
        document.body.appendChild(m);
        
        m.innerHTML = 
            '<div class="pt-modal-content">'
            + '  <div class="pt-modal-header">'
            + '    <h3>➕ Thêm Vật Liệu Vào Xưởng In</h3>'
            + '    <span class="pt-close-btn" onclick="closePtImportModal()">&times;</span>'
            + '  </div>'
            + '  <form id="ptImportForm" onsubmit="submitPtImportForm(event)">'
            + '    <div class="pt-modal-body">'
            + '      <div class="pt-form-group">'
            + '        <label>Ngày hiện tại</label>'
            + '        <input type="text" id="ptImpDate" readonly>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Tên nhân viên</label>'
            + '        <input type="text" id="ptImpStaff" readonly>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Lĩnh vực</label>'
            + '        <select id="ptImpField" required onchange="onPtImpFieldChange()">'
            + '          <option value="TEM">🎫 TEM (Màng In Tem)</option>'
            + '          <option value="PET">🏷️ PET (Màng In Pet)</option>'
            + '        </select>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Tên vật liệu</label>'
            + '        <input type="text" id="ptImpMatName" readonly>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Tồn đầu kho vật liệu</label>'
            + '        <input type="text" id="ptImpStock" readonly>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Xuất kho vật liệu (mét) <span style="color:#ef4444">*</span></label>'
            + '        <input type="number" id="ptImpQty" min="0.01" step="0.01" required oninput="calcPtImpEndBal()">'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Tồn cuối kho vật liệu</label>'
            + '        <input type="text" id="ptImpEndBal" readonly>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Ghi chú</label>'
            + '        <textarea id="ptImpNotes" rows="2" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:8px;font-size:12px;outline:none" placeholder="Nhập ghi chú..."></textarea>'
            + '      </div>'
            + '      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">'
            + '        <button type="button" class="pt-btn" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1" onclick="closePtImportModal()">Hủy</button>'
            + '        <button type="submit" class="pt-btn pt-btn-primary">Xác Nhận Xuất</button>'
            + '      </div>'
            + '    </div>'
            + '  </form>'
            + '</div>';
    }
    
    // Set date and staff
    var todayStr = typeof vnDateStr === 'function' ? vnDateStr() : new Date().toLocaleDateString('vi-VN');
    var staffName = (window.currentUser && window.currentUser.full_name) || 'Nhân Viên';
    document.getElementById('ptImpDate').value = todayStr;
    document.getElementById('ptImpStaff').value = staffName;
    document.getElementById('ptImpQty').value = '';
    document.getElementById('ptImpNotes').value = '';
    document.getElementById('ptImpEndBal').value = '';
    
    // Fetch remaining stock from Kho Vật Liệu
    try {
        var kvTree = await apiCall('/api/khovatlieu/tree');
        var petStock = 0;
        var temStock = 0;
        if (kvTree && kvTree.tree) {
            kvTree.tree.forEach(function(wh) {
                if (wh.items) {
                    wh.items.forEach(function(item) {
                        if (item.id === 4) petStock = Number(item.remaining_stock) || 0;
                        if (item.id === 11) temStock = Number(item.remaining_stock) || 0;
                    });
                }
            });
        }
        _ptImpStocks = { PET: petStock, TEM: temStock };
    } catch(e) {
        console.error('[PT] Load warehouse stock failed:', e);
        showToast('Lỗi tải tồn kho từ Kho Vật Liệu', 'error');
    }
    
    m.style.display = 'flex';
    onPtImpFieldChange();
}

function closePtImportModal() {
    var m = document.getElementById('ptImportModal');
    if (m) m.style.display = 'none';
}

function onPtImpFieldChange() {
    var field = document.getElementById('ptImpField').value;
    var name = field === 'PET' ? 'Màng In Pet' : 'Màng In Tem';
    var stock = _ptImpStocks[field] || 0;
    
    document.getElementById('ptImpMatName').value = name;
    document.getElementById('ptImpStock').value = _ptFN(stock) + ' mét';
    calcPtImpEndBal();
}

function calcPtImpEndBal() {
    var field = document.getElementById('ptImpField').value;
    var stock = _ptImpStocks[field] || 0;
    var qty = Number(document.getElementById('ptImpQty').value) || 0;
    var bal = stock - qty;
    
    var balEl = document.getElementById('ptImpEndBal');
    if (!balEl) return;
    balEl.value = _ptFN(bal) + ' mét';
    if (bal < 0) {
        balEl.style.color = '#dc2626';
        balEl.style.fontWeight = 'bold';
    } else {
        balEl.style.color = '';
        balEl.style.fontWeight = '';
    }
}

async function submitPtImportForm(event) {
    event.preventDefault();
    var field = document.getElementById('ptImpField').value;
    var qty = Number(document.getElementById('ptImpQty').value);
    var notes = document.getElementById('ptImpNotes').value;
    
    var stock = _ptImpStocks[field] || 0;
    if (qty <= 0) {
        showToast('Số lượng xuất kho phải lớn hơn 0', 'error');
        return;
    }
    if (qty > stock) {
        showToast('Không đủ tồn kho trong Kho Vật Liệu!', 'error');
        return;
    }
    
    var dateVal = typeof vnISOStr === 'function' ? vnISOStr().split('T')[0] : new Date().toISOString().split('T')[0];
    
    try {
        var res = await apiCall('/api/pettem/rolls/import-from-warehouse', 'POST', {
            roll_type: field,
            qty_imported: qty,
            import_date: dateVal,
            notes: notes
        });
        if (res && res.success) {
            showToast('Xuất kho vật liệu thành công!', 'success');
            closePtImportModal();
            _ptLoadAll();
        } else {
            showToast(res.error || 'Lỗi khi xuất kho', 'error');
        }
    } catch(e) {
        console.error('[PT] submit import failed:', e);
        showToast('Có lỗi xảy ra khi xuất kho', 'error');
    }
}
