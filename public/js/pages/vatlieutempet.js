// ========== VẬT LIỆU PET/TEM — Desktop SPA ==========

var _pt={tree:null,rolls:[],filter:{roll_type:null,year:null,month:null},search:''};
var _ptOpen={};
var _ptTL={PET:'PET',TEM:'Tem',DECAL:'Decal'};
var _ptIC={PET:'🏷️',TEM:'🎫',DECAL:'📋'};
var _ptCL={PET:'#e11d48',TEM:'#7c3aed',DECAL:'#d97706'};
var _ptImpStocks={PET:0,TEM:0,DECAL:0};
var _ptAllowedWaste = { PET: 5, TEM: 5, DECAL: 10 };

function renderVatlieutempetPage(content){
    if(!document.getElementById('_ptStyle')){
        var st=document.createElement('style');
        st.id='_ptStyle';
        st.textContent='.pt-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden;font-family:"Inter",sans-serif}'
        +'.pt-sb{width:240px;min-width:240px;background:#fff;border-right:1px solid #e2e8f0;overflow-y:auto;display:flex;flex-direction:column}'
        +'.pt-main{flex:1;min-width:0;display:flex;flex-direction:column;padding:20px;overflow-y:auto}'
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
        +'.pt-btn:disabled { background: #cbd5e1 !important; color: #64748b !important; cursor: not-allowed !important; }'
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
        +'.pt-details-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 1001; }'
        +'.pt-details-content { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; width: 1000px; max-width: 95%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); animation: ptFadeIn 0.2s ease-out; color: #0f172a; }'
        +'.pt-details-grid { display: flex; flex-direction: row; flex: 1; overflow: hidden; min-height: 480px; }'
        +'.pt-details-left { width: 220px; min-width: 220px; background: #f8fafc; border-right: 1px solid #e2e8f0; padding: 20px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }'
        +'.pt-details-mid { flex: 1; padding: 20px; border-right: 1px solid #e2e8f0; overflow-y: auto; }'
        +'.pt-details-right { width: 340px; min-width: 340px; padding: 20px; background: #fafbfe; overflow-y: auto; }'
        +'.pt-action-btn { width: 100%; padding: 10px 14px; border-radius: 8px; font-size: 11.5px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }'
        +'.pt-action-btn.waste { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }'
        +'.pt-action-btn.waste:hover { background: #fde68a; }'
        +'.pt-action-btn.error { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }'
        +'.pt-action-btn.error:hover { background: #fecaca; }'
        +'.pt-action-btn.reset { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }'
        +'.pt-action-btn.reset:hover { background: #e2e8f0; }'
        +'.pt-action-btn.close { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }'
        +'.pt-action-btn.close:hover { background: #a7f3d0; }'
        +'.pt-badge-closed { background: #e0f2fe; color: #0369a1; padding: 10px; border-radius: 8px; font-size: 11px; font-weight: 800; text-align: center; border: 1px solid #bae6fd; line-height: 1.4; }'
        +'#ptTable th, #ptTable td { text-align: center !important; vertical-align: middle !important; }'
        +'@keyframes ptFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }'
        +'@media(max-width:768px){.pt-sb{display:none}}';
        document.head.appendChild(st);}
    var configBtnHtml = '';
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc') {
        configBtnHtml = '<button class="pt-btn" style="background:#475569;color:#fff;border:1px solid #475569" onclick="openPtConfigWasteModal()">⚙️ Cài đặt hao hụt</button>';
    }
    content.innerHTML='<div class="pt-wrap"><div class="pt-sb" id="ptSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="pt-main">'
    +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="ptInfo" style="font-size:12px"></div><div id="ptStats" style="display:flex;gap:8px;flex:1;justify-content:center;flex-wrap:wrap"></div>' + configBtnHtml + '<button class="pt-btn pt-btn-primary" onclick="openPtImportModal()">➕ Thêm Vật Liệu</button><input id="ptSearch" placeholder="🔍 Tìm lĩnh vực, ghi chú..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none"></div>'
    +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="ptTable"><thead><tr style="background:var(--gray-800)">'
    +'<th>STT</th><th id="ptColCay">Cây</th><th>Ngày Nhập</th><th>Lĩnh Vực</th><th>Tên Vật Liệu</th><th>SL Nhập</th><th>Hao Hụt</th><th>SL Sai</th><th>Tồn Cuối</th><th>Đã In</th><th>Người Chốt</th><th>Ghi Chú</th><th>Lịch sử CN</th>'
    +'</tr></thead><tbody id="ptTb"><tr><td colspan="13" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t;document.getElementById('ptSearch').addEventListener('input',function(){clearTimeout(_t);_t=setTimeout(function(){_pt.search=document.getElementById('ptSearch').value||'';_ptRender();},300);});
    _ptLoadAll();
}

async function _ptLoadAll(){
    try{
        var tR=await apiCall('/api/pettem/tree');
        _pt.tree=tR;
        _ptRenderSb();
        
        try {
            var configs = await apiCall('/api/app-configs/batch', 'POST', {
                keys: ['pettem_allowed_waste_pet', 'pettem_allowed_waste_tem', 'pettem_allowed_waste_decal']
            });
            if (configs) {
                if (configs.pettem_allowed_waste_pet !== null && configs.pettem_allowed_waste_pet !== undefined) _ptAllowedWaste.PET = Number(configs.pettem_allowed_waste_pet);
                if (configs.pettem_allowed_waste_tem !== null && configs.pettem_allowed_waste_tem !== undefined) _ptAllowedWaste.TEM = Number(configs.pettem_allowed_waste_tem);
                if (configs.pettem_allowed_waste_decal !== null && configs.pettem_allowed_waste_decal !== undefined) _ptAllowedWaste.DECAL = Number(configs.pettem_allowed_waste_decal);
            }
        } catch(cfgErr) {
            console.error('[PT] Fetch config failed:', cfgErr);
        }
        
        await _ptLoadRolls();
    }catch(e){console.error('[PT]',e);}
}
function getVNDateParts(d) {
    var date = new Date(d);
    if (isNaN(date.getTime())) return null;
    try {
        var formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
            hour12: false
        });
        var parts = formatter.formatToParts(date);
        var partMap = {};
        parts.forEach(function(p) { partMap[p.type] = p.value; });
        return {
            hour: partMap.hour,
            min: partMap.minute,
            day: partMap.day,
            month: partMap.month,
            year: parseInt(partMap.year)
        };
    } catch(e) {
        return null;
    }
}
function _ptFD(d) {
    if (!d) return '—';
    var p = getVNDateParts(d);
    if (!p) {
        try {
            var parts = d.split('T')[0].split('-');
            return parts[2] + '/' + parts[1] + '/' + parts[0];
        } catch(e) {
            return d;
        }
    }
    return p.day + '/' + p.month + '/' + p.year;
}
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
    
    var colCay = document.getElementById('ptColCay');
    if (colCay) {
        var rollType = _pt.filter.roll_type;
        if (rollType === 'PET') {
            colCay.textContent = 'Cây PET';
        } else if (rollType === 'TEM') {
            colCay.textContent = 'Cây TEM';
        } else if (rollType === 'DECAL') {
            colCay.textContent = 'Cây DECAL';
        } else {
            colCay.textContent = 'Cây';
        }
    }

    if(!all.length){tb.innerHTML='<tr><td colspan="13"><div class="empty-state"><div class="icon">🏷️</div><h3>Chưa có dữ liệu</h3><p>Chọn loại từ sidebar</p></div></td></tr>';}else{
    tb.innerHTML=all.map(function(r,i){
        var cl=_ptCL[r.roll_type]||'#e11d48';
        var rem=Number(r.qty_remaining)||0;var rC=rem>0?'pos':rem===0?'zero':'neg';
        var rL=rem>0?'🟢 '+_ptFN(rem):rem===0?'⚪ 0':'🔴 '+_ptFN(rem);
        var upd='';if(r.last_update_at){upd=_ptFD(r.last_update_at);if(r.last_update_by)upd+='<br><span style="color:#e11d48;font-size:9px">'+r.last_update_by+'</span>';}
        
        var colType = r.roll_type ? r.roll_type.toUpperCase() : '';
        var colLabel = 'Cây' + (colType ? ' ' + colType : '');
        var lotPrefix = (r.material_tx_id && !['PET','TEM','DECAL'].includes(r.roll_type)) ? 'Lô #' + r.material_tx_id + ' - ' : '';
        
        var displayFieldName = r.field_name || '—';
        var seqStr = r.seq ? '#' + r.seq : '';
        var btnLabel = '';
        var treeBadge = '';
        
        if (r.roll_type === 'PET') {
            btnLabel = 'Cây Pet ' + seqStr;
            treeBadge = '<span style="background:#fee2e2;color:#dc2626;padding:1.5px 5.5px;border-radius:4px;font-size:9px;font-weight:800;margin-right:6px;border:1px solid #fca5a5;display:inline-block;vertical-align:middle;line-height:1.2">Cây Pet ' + seqStr + '</span>';
            displayFieldName = 'Màng In Pet';
        } else if (r.roll_type === 'TEM') {
            btnLabel = 'Cây Tem ' + seqStr;
            treeBadge = '<span style="background:#f3e8ff;color:#7c3aed;padding:1.5px 5.5px;border-radius:4px;font-size:9px;font-weight:800;margin-right:6px;border:1px solid #d8b4fe;display:inline-block;vertical-align:middle;line-height:1.2">Cây Tem ' + seqStr + '</span>';
            displayFieldName = 'Màng In Tem';
        } else if (r.roll_type === 'DECAL') {
            btnLabel = 'Cây Decal ' + seqStr;
            treeBadge = '<span style="background:#d1fae5;color:#059669;padding:1.5px 5.5px;border-radius:4px;font-size:9px;font-weight:800;margin-right:6px;border:1px solid #6ee7b7;display:inline-block;vertical-align:middle;line-height:1.2">Cây Decal ' + seqStr + '</span>';
            displayFieldName = 'Màng In Decal';
        } else {
            btnLabel = colLabel + ' #' + (r.material_tx_id || r.id);
            if (displayFieldName === 'PET') displayFieldName = 'Màng In Pet';
            if (displayFieldName === 'TEM') displayFieldName = 'Màng In Tem';
            if (displayFieldName === 'DECAL') displayFieldName = 'Màng In Decal';
        }
        
        var nameCellHtml = lotPrefix + displayFieldName;
        if (treeBadge) {
            nameCellHtml = '<div style="display:flex;align-items:center;justify-content:flex-start;text-align:left">' + treeBadge + '<span>' + displayFieldName + '</span></div>';
        }
        
        var confirmedCell = '—';
        if (r.confirmed_by_name) {
            confirmedCell = r.confirmed_by_name;
        } else if (r.pending_approval) {
            confirmedCell = '<span style="color:#d97706;font-weight:800;font-size:9.5px;background:#fef3c7;padding:2px 6px;border-radius:4px;border:1px solid #fde68a">⏳ Chờ duyệt</span>';
        }
        
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1)+'</td>'
        +'<td style="text-align:center"><button class="pt-btn" style="padding:2px 8px;font-size:10px;background:#f8fafc;color:#1e293b;border:1px solid #cbd5e1;cursor:pointer" onclick="openPtDetailsModal('+r.id+')">🌲 ' + btnLabel + '</button></td>'
        +'<td style="font-size:10px">'+_ptFD(r.import_date)+'</td>'
        +'<td><span class="pt-tag" style="background:'+cl+'">'+(_ptTL[r.roll_type]||r.roll_type)+'</span></td>'
        +'<td style="font-size:10px;color:#1e293b;font-weight:600;text-align:left !important;padding-left:12px">'+nameCellHtml+'</td>'
        +'<td style="text-align:center;font-weight:800;color:#e11d48;font-size:13px">'+_ptFN(r.qty_imported)+'</td>'
        +'<td style="text-align:center;color:#f59e0b;font-weight:600">'+_ptFN(r.qty_waste)+'</td>'
        +'<td style="text-align:center;color:#dc2626;font-weight:600">'+_ptFN(r.qty_error)+'</td>'
        +'<td><span class="pt-rem '+rC+'">'+rL+'</span></td>'
        +'<td style="text-align:center;font-weight:700;color:#059669">'+_ptFN(r.qty_printed)+'</td>'
        +'<td style="font-size:10px;color:#6366f1;font-weight:600">'+confirmedCell+'</td>'
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
var _ptAvailableLots = [];

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
            + '          <option value="DECAL">📋 DECAL (Màng In Decal)</option>'
            + '        </select>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Tên vật liệu</label>'
            + '        <input type="text" id="ptImpMatName" readonly>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Tồn tổng kho vật liệu</label>'
            + '        <input type="text" id="ptImpStock" readonly>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Chọn Lô Nhập Kho Vật Liệu <span style="color:#ef4444">*</span></label>'
            + '        <select id="ptImpLotSelect" required onchange="onPtImpLotChange()"></select>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Phương thức xuất</label>'
            + '        <div style="display:flex;gap:16px;margin:4px 0">'
            + '          <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;text-transform:none"><input type="radio" name="ptImpType" value="full" checked onchange="onPtImpTypeChange()" style="width:auto;margin:0"> Xuất hết / Xuất phần còn lại</label>'
            + '          <label id="ptImpTypePartialLabel" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;text-transform:none"><input type="radio" name="ptImpType" value="partial" onchange="onPtImpTypeChange()" style="width:auto;margin:0"> Xuất một phần</label>'
            + '        </div>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label id="ptImpQtyLabel">Số mét xuất kho</label>'
            + '        <input type="number" id="ptImpQty" step="0.01" min="0.01" style="font-weight:bold" oninput="onPtImpQtyInput()" required>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Tồn cuối kho vật liệu (sau khi xuất)</label>'
            + '        <input type="text" id="ptImpEndBal" readonly>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Ghi chú</label>'
            + '        <textarea id="ptImpNotes" rows="2" style="width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:8px;font-size:12px;outline:none" placeholder="Nhập ghi chú..."></textarea>'
            + '      </div>'
            + '      <div id="ptImpWarning" style="display:none;background:#fee2e2;border:1px solid #fca5a5;color:#b91c1c;padding:10px 12px;border-radius:8px;font-size:11px;font-weight:700;margin-bottom:12px;line-height:1.4"></div>'
            + '      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">'
            + '        <button type="button" class="pt-btn" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1" onclick="closePtImportModal()">Hủy</button>'
            + '        <button type="submit" id="submitPtImpBtn" class="pt-btn pt-btn-primary">Xác Nhận Xuất</button>'
            + '      </div>'
            + '    </div>'
            + '  </form>'
            + '</div>';
    }
    
    // Set date and staff
    var todayStr = typeof vnDateStr === 'function' ? vnDateStr() : new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
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
        var decalStock = 0;
        if (kvTree && kvTree.tree) {
            kvTree.tree.forEach(function(wh) {
                if (wh.items) {
                    wh.items.forEach(function(item) {
                        if (item.id === 4) petStock = Number(item.remaining_stock) || 0;
                        if (item.id === 11) temStock = Number(item.remaining_stock) || 0;
                        if (item.id === 21) decalStock = Number(item.remaining_stock) || 0;
                    });
                }
            });
        }
        _ptImpStocks = { PET: petStock, TEM: temStock, DECAL: decalStock };
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

async function onPtImpFieldChange() {
    var field = document.getElementById('ptImpField').value;
    var name = field === 'PET' ? 'Màng In Pet' : field === 'TEM' ? 'Màng In Tem' : 'Màng In Decal';
    var stock = _ptImpStocks[field] || 0;
    var materialItemId = field === 'PET' ? 4 : field === 'TEM' ? 11 : 21;
    
    document.getElementById('ptImpMatName').value = name;
    document.getElementById('ptImpStock').value = _ptFN(stock) + ' mét';
    
    // Check if there are any unconfirmed active rolls of this type. If yes, show warning and disable submit.
    var warningEl = document.getElementById('ptImpWarning');
    var submitBtn = document.getElementById('submitPtImpBtn');
    if (warningEl && submitBtn) {
        warningEl.style.display = 'none';
        warningEl.innerHTML = '';
        submitBtn.disabled = false;
    }
    
    var selectEl = document.getElementById('ptImpLotSelect');
    
    try {
        var activeRes = await apiCall('/api/pettem/active-rolls?roll_type=' + field);
        var activeRolls = activeRes.rolls || [];
        var unconfirmedRoll = activeRolls.find(function(r) { return !r.confirmed_by; });
        if (unconfirmedRoll) {
            if (warningEl && submitBtn) {
                var rollCode = unconfirmedRoll.material_tx_id || unconfirmedRoll.id;
                warningEl.innerHTML = '⚠️ Cần chốt cuộn ' + field + ' hiện tại trước khi thêm cuộn mới!<br>'
                    + '• Cuộn chưa chốt: Cây ' + field + ' #' + rollCode + '<br>'
                    + '• Nhập ngày: ' + _ptFD(unconfirmedRoll.import_date) + '<br>'
                    + '• Tồn còn lại: ' + _ptFN(unconfirmedRoll.qty_remaining) + 'm.<br>'
                    + 'Vui lòng chốt/xác nhận cây này ở bảng danh sách phía dưới trước.';
                warningEl.style.display = 'block';
                submitBtn.disabled = true;
            }
            if (selectEl) {
                selectEl.innerHTML = '<option value="">⚠️ Vui lòng chốt cuộn ' + field + ' hiện tại trước</option>';
                selectEl.disabled = true;
            }
            document.getElementById('ptImpQty').value = '';
            document.getElementById('ptImpEndBal').value = '';
            return;
        }
    } catch(e) {
        console.error('[PT] Check active rolls failed:', e);
    }
    
    if (selectEl) {
        selectEl.disabled = false;
        selectEl.innerHTML = '<option value="">⏳ Đang tải danh sách lô...</option>';
    }
    
    try {
        var res = await apiCall('/api/khovatlieu/available-rolls?material_item_id=' + materialItemId);
        _ptAvailableLots = res.rolls || [];
        
        if (_ptAvailableLots.length === 0) {
            if (selectEl) selectEl.innerHTML = '<option value="">⚠️ Không có lô nào còn tồn trong kho</option>';
            document.getElementById('ptImpQty').value = '';
            document.getElementById('ptImpEndBal').value = '';
            return;
        }
        
        // Find if there is any partially exported lot (remaining_qty < quantity)
        var partialLot = _ptAvailableLots.find(function(lot) {
            return lot.remaining_qty < lot.quantity;
        });
        
        var h = '';
        var partialLabel = document.getElementById('ptImpTypePartialLabel');
        
        if (partialLot) {
            var dateStr = _ptFD(partialLot.performed_at.split('T')[0]);
            var seqStr = partialLot.seq ? '#' + partialLot.seq : '';
            var displayName = 'Cây ' + (field === 'PET' ? 'Pet' : field === 'TEM' ? 'Tem' : 'Decal') + ' ' + seqStr;
            
            h = '<option value="' + partialLot.id + '">' + displayName + ' (' + _ptFN(partialLot.remaining_qty) + 'm) [ĐANG XUẤT DỞ] - Nhập ngày ' + dateStr + '</option>';
            if (selectEl) {
                selectEl.innerHTML = h;
                selectEl.value = partialLot.id;
                selectEl.disabled = true;
            }
            
            document.querySelector('input[name="ptImpType"][value="full"]').checked = true;
            if (partialLabel) {
                partialLabel.style.display = 'none';
            }
            
            if (warningEl && submitBtn && !warningEl.innerHTML.includes('Cần chốt cuộn')) {
                warningEl.innerHTML = '💡 Lô ' + displayName + ' đang được xuất dở dang. Bạn bắt buộc phải xuất hết phần còn lại của lô này trước khi bắt đầu cây mới.';
                warningEl.style.display = 'block';
            }
        } else {
            if (selectEl) {
                selectEl.disabled = false;
            }
            if (partialLabel) {
                partialLabel.style.display = 'inline-flex';
            }
            if (warningEl && !warningEl.innerHTML.includes('Cần chốt cuộn')) {
                warningEl.style.display = 'none';
                warningEl.innerHTML = '';
            }
            
            h = '<option value="">-- Chọn lô nhập --</option>';
            _ptAvailableLots.forEach(function(lot) {
                var dateStr = _ptFD(lot.performed_at.split('T')[0]);
                var seqStr = lot.seq ? '#' + lot.seq : '';
                var displayName = 'Cây ' + (field === 'PET' ? 'Pet' : field === 'TEM' ? 'Tem' : 'Decal') + ' ' + seqStr;
                h += '<option value="' + lot.id + '">' + displayName + ' (' + _ptFN(lot.remaining_qty) + 'm) - Nhập ngày ' + dateStr + ' [' + lot.source_name + ']</option>';
            });
            if (selectEl) selectEl.innerHTML = h;
        }
    } catch(e) {
        console.error('[PT] Load available rolls failed:', e);
        if (selectEl) selectEl.innerHTML = '<option value="">❌ Lỗi tải danh sách lô</option>';
    }
    
    onPtImpLotChange();
}

function onPtImpLotChange() {
    onPtImpTypeChange();
}

function onPtImpTypeChange() {
    var typeEl = document.querySelector('input[name="ptImpType"]:checked');
    var type = typeEl ? typeEl.value : 'full';
    var qtyInput = document.getElementById('ptImpQty');
    var selectEl = document.getElementById('ptImpLotSelect');
    var lotId = Number(selectEl.value);
    var lot = _ptAvailableLots.find(function(l) { return l.id === lotId; });
    
    if (type === 'full') {
        qtyInput.readOnly = true;
        qtyInput.style.background = '#f1f5f9';
        qtyInput.style.cursor = 'not-allowed';
        if (lot) {
            qtyInput.value = lot.remaining_qty;
        } else {
            qtyInput.value = '';
        }
    } else {
        qtyInput.readOnly = false;
        qtyInput.style.background = '';
        qtyInput.style.cursor = '';
        qtyInput.placeholder = 'Nhập số mét cần xuất...';
    }
    
    onPtImpQtyInput();
}

function onPtImpQtyInput() {
    var selectEl = document.getElementById('ptImpLotSelect');
    var lotId = Number(selectEl.value);
    var lot = _ptAvailableLots.find(function(l) { return l.id === lotId; });
    var qtyInput = document.getElementById('ptImpQty');
    var qty = Number(qtyInput.value);
    var warningEl = document.getElementById('ptImpWarning');
    var submitBtn = document.getElementById('submitPtImpBtn');
    
    if (!lot) {
        document.getElementById('ptImpEndBal').value = '';
        return;
    }
    
    var remaining = lot.remaining_qty;
    
    if (qtyInput.value !== '' && (isNaN(qty) || qty <= 0)) {
        if (warningEl && submitBtn) {
            warningEl.innerHTML = '⚠️ Số mét xuất kho phải lớn hơn 0.';
            warningEl.style.display = 'block';
            submitBtn.disabled = true;
        }
        document.getElementById('ptImpEndBal').value = '';
        return;
    }
    
    if (qty > remaining) {
        if (warningEl && submitBtn) {
            warningEl.innerHTML = '⚠️ Số mét xuất kho (' + _ptFN(qty) + 'm) vượt quá tồn kho còn lại của lô (' + _ptFN(remaining) + 'm).';
            warningEl.style.display = 'block';
            submitBtn.disabled = true;
        }
        document.getElementById('ptImpEndBal').value = '';
        return;
    }
    
    var field = document.getElementById('ptImpField').value;
    var partialLot = _ptAvailableLots.find(function(l) { return l.remaining_qty < l.quantity; });
    
    if (warningEl && submitBtn && !warningEl.innerHTML.includes('Cần chốt cuộn')) {
        if (partialLot) {
            var seqStr = partialLot.seq ? '#' + partialLot.seq : '';
            var displayName = 'Cây ' + (field === 'PET' ? 'Pet' : field === 'TEM' ? 'Tem' : 'Decal') + ' ' + seqStr;
            warningEl.innerHTML = '💡 Lô ' + displayName + ' đang được xuất dở dang. Bạn bắt buộc phải xuất hết phần còn lại của lô này trước khi bắt đầu cây mới.';
            warningEl.style.display = 'block';
        } else {
            warningEl.style.display = 'none';
            warningEl.innerHTML = '';
        }
        submitBtn.disabled = false;
    }
    
    var totalStock = _ptImpStocks[field] || 0;
    var bal = totalStock - qty;
    
    var balEl = document.getElementById('ptImpEndBal');
    if (balEl) {
        balEl.value = _ptFN(bal) + ' mét';
        if (bal < 0) {
            balEl.style.color = '#dc2626';
            balEl.style.fontWeight = 'bold';
        } else {
            balEl.style.color = '';
            balEl.style.fontWeight = '';
        }
    }
}

async function submitPtImportForm(event) {
    event.preventDefault();
    var btn = document.getElementById('submitPtImpBtn');
    if (btn) {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.innerText = 'Đang xử lý...';
    }

    function enableBtn() {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Xác Nhận Xuất';
        }
    }

    var field = document.getElementById('ptImpField').value;
    var selectEl = document.getElementById('ptImpLotSelect');
    var lotId = Number(selectEl.value);
    var notes = document.getElementById('ptImpNotes').value;
    var qtyInput = document.getElementById('ptImpQty');
    var qty = Number(qtyInput.value);
    
    if (!lotId) {
        showToast('Vui lòng chọn lô nhập từ Kho Vật Liệu', 'error');
        enableBtn();
        return;
    }
    
    var lot = _ptAvailableLots.find(function(l) { return l.id === lotId; });
    if (!lot) {
        showToast('Lô vật liệu chọn không hợp lệ', 'error');
        enableBtn();
        return;
    }
    
    if (isNaN(qty) || qty <= 0) {
        showToast('Số mét xuất kho phải lớn hơn 0', 'error');
        enableBtn();
        return;
    }
    
    if (qty > lot.remaining_qty) {
        showToast('Số mét xuất vượt quá tồn kho còn lại của lô', 'error');
        enableBtn();
        return;
    }
    
    // Check if there are any unconfirmed active rolls of this type. If yes, prevent adding new roll.
    try {
        var activeRes = await apiCall('/api/pettem/active-rolls?roll_type=' + field);
        var activeRolls = activeRes.rolls || [];
        var unconfirmedCount = activeRolls.filter(function(r) { return !r.confirmed_by; }).length;
        if (unconfirmedCount > 0) {
            showToast('⚠️ Cần chốt cuộn ' + field + ' hiện tại trước khi thêm cuộn mới!', 'error');
            enableBtn();
            return;
        }
    } catch(e) {
        console.error('[PT] Check active rolls failed:', e);
    }
    
    var dateVal = typeof vnISOStr === 'function' ? vnISOStr().split('T')[0] : (typeof vnNow === 'function' ? vnNow() : new Date()).toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).split(' ')[0];
    
    try {
        var res = await apiCall('/api/pettem/rolls/import-from-warehouse', 'POST', {
            roll_type: field,
            material_tx_id: lotId,
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
            enableBtn();
        }
    } catch(e) {
        console.error('[PT] submit import failed:', e);
        showToast('Có lỗi xảy ra khi xuất kho', 'error');
        enableBtn();
    }
}

// ========== ROLL DETAILS MODAL & ACTIONS ==========
function _ptFDT(d) {
    if (!d) return '—';
    var p = getVNDateParts(d);
    if (!p) return d;
    return p.hour + ':' + p.min + ' ' + p.day + '/' + p.month + '/' + p.year;
}

function _ptFDT_NoYear(d) {
    if (!d) return '—';
    var p = getVNDateParts(d);
    if (!p) return d;
    return p.hour + ':' + p.min + ' ' + p.day + '/' + p.month;
}

async function openPtDetailsModal(rollId) {
    var m = document.getElementById('ptDetailsModal');
    if (!m) {
        m = document.createElement('div');
        m.id = 'ptDetailsModal';
        m.className = 'pt-details-modal';
        document.body.appendChild(m);
    }
    m.innerHTML = '<div class="pt-details-content" style="padding:40px;color:#475569;font-weight:700;text-align:center">⏳ Đang tải thông tin cây vật liệu...</div>';
    m.style.display = 'flex';
    
    try {
        var rollRes = await apiCall('/api/pettem/rolls/' + rollId);
        var roll = rollRes.roll;
        if (!roll) {
            showToast('Không tìm thấy cây vật liệu', 'error');
            closePtDetailsModal();
            return;
        }
        
        var ordersRes = await apiCall('/api/pettem/rolls/' + rollId + '/orders');
        var orders = ordersRes.orders || [];
        
        var historyRes = await apiCall('/api/pettem/rolls/' + rollId + '/history');
        var history = historyRes.history || [];
        
        var rem = Number(roll.qty_remaining) || 0;
        var canClose = Math.abs(rem) <= 0.001 && !roll.confirmed_by;
        
        var allowedPct = _ptAllowedWaste[roll.roll_type] || 5;
        var qtyImported = Number(roll.qty_imported) || 0;
        var maxAllowed = qtyImported * (allowedPct / 100);
        var totalWasteError = (Number(roll.qty_waste) || 0) + (Number(roll.qty_error) || 0);
        var isExceeded = totalWasteError - maxAllowed > 0.001;
        
        var statusColor = isExceeded ? '#dc2626' : '#059669';
        var statusBg = isExceeded ? '#fee2e2' : '#d1fae5';
        var statusBorder = isExceeded ? '#fca5a5' : '#a7f3d0';
        var statusText = isExceeded ? '🔴 Vượt hạn mức hao hụt' : '🟢 Trong hạn mức hao hụt';
        
        var limitHtml = '<div style="background:' + statusBg + ';border:1px solid ' + statusBorder + ';color:' + statusColor + ';padding:10px;border-radius:8px;font-size:11px;font-weight:700;margin-bottom:16px;line-height:1.4;text-align:left">'
                  + '  <div>Hạn mức cho phép: <span style="font-size:12px;font-weight:800">' + allowedPct + '%</span> (Tối đa ' + maxAllowed.toFixed(2) + 'm trên ' + qtyImported + 'm nhập)</div>'
                  + '  <div style="margin-top:2px">Thực tế hao hụt + lỗi: <span style="font-size:12px;font-weight:800">' + totalWasteError.toFixed(2) + 'm</span> (' + (qtyImported > 0 ? ((totalWasteError/qtyImported)*100).toFixed(1) : 0) + '%)</div>'
                  + '  <div style="margin-top:4px;font-size:10.5px">' + statusText + '</div>'
                  + '</div>';
                  
        var actHtml = '';
        if (roll.confirmed_by) {
            actHtml = '<div class="pt-badge-closed">🔒 ĐÃ CHỐT CUỘN<br><span style="font-size:9px;font-weight:normal">Bởi ' + (roll.confirmed_by_name || 'Hệ thống') + '<br>' + _ptFDT(roll.confirmed_at) + '</span></div>';
        } else if (roll.pending_approval) {
            var isDirector = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'giam_doc';
            if (isDirector) {
                actHtml = '<div style="background:#fef3c7;border:1px solid #fde68a;color:#d97706;padding:8px;border-radius:6px;font-size:11px;font-weight:700;margin-bottom:8px;line-height:1.4;text-align:center">⚠️ ĐANG CHỜ DUYỆT CHỐT</div>'
                        + '<button class="pt-action-btn" style="background:#059669;color:#fff;border:none;margin-top:4px" onclick="ptDetailsApproveRoll(' + roll.id + ')">✅ Duyệt chốt</button>'
                        + '<button class="pt-action-btn" style="background:#dc2626;color:#fff;border:none;margin-top:8px" onclick="ptDetailsRejectRoll(' + roll.id + ')">❌ Từ chối</button>';
            } else {
                actHtml = '<div class="pt-badge-closed" style="background:#fef3c7;color:#d97706;border:1px solid #fde68a">⏳ CHỜ DUYỆT CHỐT<br><span style="font-size:9px;font-weight:normal">Đang chờ Giám đốc duyệt chốt do vượt hao hụt</span></div>';
            }
        } else {
            actHtml = '<button class="pt-action-btn waste" onclick="ptDetailsAction(\'waste\', ' + roll.id + ')">⚠️ Hao hụt</button>'
                    + '<button class="pt-action-btn error" style="margin-top:8px" onclick="ptDetailsAction(\'error\', ' + roll.id + ')">❌ Sản xuất lỗi</button>';
            if (canClose) {
                actHtml += '<button class="pt-action-btn close" style="margin-top:8px" onclick="ptDetailsCloseRoll(' + roll.id + ')">✅ Chốt cuộn</button>';
            } else {
                actHtml += '<div style="font-size:10px;color:#ef4444;background:#fef2f2;border:1px solid #fee2e2;padding:8px;border-radius:6px;font-weight:600;margin-top:8px;text-align:center">⚠️ Phải in và khai báo hết tồn mới được chốt cuộn.</div>';
            }
        }
        
        var histRows = history.map(function(h) {
            var badge = '';
            if (h.action === 'waste') {
                badge = '<span style="background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:4px;font-weight:700">Hao hụt</span>';
            } else if (h.action === 'error') {
                badge = '<span style="background:#fee2e2;color:#b91c1c;padding:2px 6px;border-radius:4px;font-weight:700">SX Lỗi</span>';
            } else if (h.action === 'close') {
                badge = '<span style="background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:4px;font-weight:700">Chốt cuộn</span>';
            } else if (h.action === 'reset') {
                badge = '<span style="background:#e2e8f0;color:#475569;padding:2px 6px;border-radius:4px;font-weight:700">Reset</span>';
            } else if (h.action === 'pending_approval') {
                badge = '<span style="background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:4px;font-weight:700">Chờ duyệt</span>';
            } else if (h.action === 'reject') {
                badge = '<span style="background:#fee2e2;color:#dc2626;padding:2px 6px;border-radius:4px;font-weight:700">Từ chối</span>';
            } else {
                badge = '<span style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-weight:700">Nhập kho</span>';
            }
            
            var qtyStr = '—';
            var reasonStr = h.details || '—';
            
            if (h.action === 'create') {
                qtyStr = '+' + _ptFN(roll.qty_imported) + 'm';
                reasonStr = 'nhập kho ' + (roll.roll_type || '').toLowerCase();
            } else if (h.action === 'waste') {
                var qtyMatch = (h.details || '').match(/(?:hao hụt|waste):\s*([+-]?\s*\d+(?:\.\d+)?)/i);
                if (!qtyMatch) qtyMatch = (h.details || '').match(/([+-]?\s*\d+(?:\.\d+)?)/);
                if (qtyMatch) {
                    var num = parseFloat(qtyMatch[1].replace(/\s+/g, ''));
                    if (!isNaN(num)) {
                        qtyStr = '-' + _ptFN(Math.abs(num)) + 'm';
                    }
                }
                var reasonMatch = (h.details || '').match(/\(Lý do:\s*([^)]+)\)/);
                if (reasonMatch) {
                    reasonStr = reasonMatch[1];
                } else {
                    reasonStr = (h.details || '').replace(/Khai báo hao hụt:\s*[+-]?\s*\d+(?:\.\d+)?\w*\s*/i, '').trim();
                }
            } else if (h.action === 'error') {
                var qtyMatch = (h.details || '').match(/(?:sản xuất lỗi|lỗi|error):\s*([+-]?\s*\d+(?:\.\d+)?)/i);
                if (!qtyMatch) qtyMatch = (h.details || '').match(/([+-]?\s*\d+(?:\.\d+)?)/);
                if (qtyMatch) {
                    var num = parseFloat(qtyMatch[1].replace(/\s+/g, ''));
                    if (!isNaN(num)) {
                        qtyStr = '-' + _ptFN(Math.abs(num)) + 'm';
                    }
                }
                var reasonMatch = (h.details || '').match(/\(Lý do:\s*([^)]+)\)/);
                if (reasonMatch) {
                    reasonStr = reasonMatch[1];
                } else {
                    reasonStr = (h.details || '').replace(/Khai báo sản xuất lỗi:\s*[+-]?\s*\d+(?:\.\d+)?\w*\s*/i, '').trim();
                }
            }
            
            return '<tr>'
                 + '  <td>' + _ptFDT_NoYear(h.performed_at) + '</td>'
                 + '  <td>' + badge + '</td>'
                 + '  <td style="font-weight:700;color:#1e293b">' + qtyStr + '</td>'
                 + '  <td style="white-space:normal;font-size:11px;color:#475569">' + reasonStr + '</td>'
                 + '  <td>' + (h.performer_name || '—') + '</td>'
                 + '</tr>';
        }).join('');
        
        if (!histRows) {
            histRows = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:12px">Chưa có điều chỉnh hao hụt hay lỗi nào.</td></tr>';
        }
        
        var orderRows = orders.map(function(o) {
            return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:8px;box-shadow:0 1px 2px rgba(0,0,0,0.02)">'
                 + '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
                 + '    <span style="font-weight:800;color:#0284c7;font-size:11.5px">#' + o.order_code + '</span>'
                 + '    <span style="font-size:10px;color:#059669;font-weight:700">' + _ptFN(o.print_meters) + 'm</span>'
                 + '  </div>'
                 + '  <div style="font-size:9.5px;color:#475569;display:flex;justify-content:space-between">'
                 + '    <span>SL đơn: <b>' + _ptFN(o.order_quantity) + '</b></span>'
                 + '    <span>In bởi: <b>' + (o.printer_name || 'Gia công') + '</b></span>'
                 + '  </div>'
                 + '  <div style="font-size:9px;color:#94a3b8;margin-top:4px;text-align:right">' + _ptFDT(o.print_done_at) + '</div>'
                 + '</div>';
        }).join('');
        
        if (!orderRows) {
            orderRows = '<div style="text-align:center;color:#94a3b8;padding:40px 10px;font-size:11px">Chưa có đơn hàng nào được in từ cây này.</div>';
        }
        
        var txId = roll.material_tx_id || '—';
        if (txId === '—' && roll.notes) {
            var txMatch = roll.notes.match(/\(Giao dịch(?:\s*gốc)?\s*#(\d+)\)/i);
            if (txMatch) txId = txMatch[1];
        }
        var displayNotes = (roll.notes || '—').replace(/kho vật liệu/gi, '<b>$&</b>');
        
        var seqStr = roll.seq ? '#' + roll.seq : '';
        var titleName = '';
        if (roll.roll_type === 'PET') {
            titleName = 'Cây Pet ' + seqStr;
        } else if (roll.roll_type === 'TEM') {
            titleName = 'Cây Tem ' + seqStr;
        } else if (roll.roll_type === 'DECAL') {
            titleName = 'Cây Decal ' + seqStr;
        } else {
            titleName = 'Cây ' + roll.roll_type + ' #' + (roll.material_tx_id || roll.id);
        }

        var lotRowHtml = (['PET','TEM','DECAL'].includes(roll.roll_type)) ? '' : '          <tr><td style="color:#64748b;font-weight:600">Nhập từ lô kho</td><td><span style="font-weight:800;color:#7c3aed">🌀 Lô #' + txId + '</span></td></tr>';

        m.innerHTML = 
            '<div class="pt-details-content">'
          + '  <div class="pt-modal-header" style="background:#f8fafc">'
          + '    <h3>🌲 Chi Tiết ' + titleName + '</h3>'
          + '    <span class="pt-close-btn" onclick="closePtDetailsModal()">&times;</span>'
          + '  </div>'
          + '  <div class="pt-details-grid">'
          + '    <div class="pt-details-left">'
          + '      <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:8px">THAO TÁC CUỘN</div>'
          +        actHtml
          + '      <div id="ptDetailsFormArea" style="margin-top:12px"></div>'
          + '    </div>'
          + '    <div class="pt-details-mid">'
          + '      <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:12px">THÔNG TIN CHUNG</div>'
          + '      <table class="table" style="font-size:11.5px;margin-bottom:20px">'
          + '        <tbody>'
          + '          <tr><td style="width:140px;color:#64748b;font-weight:600">Định lượng</td><td><b>Mét (m)</b></td></tr>'
          + '          <tr><td style="color:#64748b;font-weight:600">Người nhập</td><td><b>' + (roll.created_by_name || 'Hệ thống') + '</b></td></tr>'
          + '          <tr><td style="color:#64748b;font-weight:600">Thời gian nhập</td><td><b>' + _ptFDT(roll.created_at) + '</b></td></tr>'
          +            lotRowHtml
          + '          <tr><td style="color:#64748b;font-weight:600">Ghi chú ban đầu</td><td style="white-space:normal">' + displayNotes + '</td></tr>'
          + '        </tbody>'
          + '      </table>'
          + '      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin-bottom:8px">'
          + '        <div style="background:#f1f5f9;padding:8px;border-radius:6px;text-align:center"><div style="font-size:8px;color:#64748b;font-weight:700">TỔNG NHẬP</div><div style="font-size:12px;font-weight:800;color:#1e293b">' + _ptFN(roll.qty_imported) + 'm</div></div>'
          + '        <div style="background:#e0f2fe;padding:8px;border-radius:6px;text-align:center"><div style="font-size:8px;color:#0369a1;font-weight:700">ĐÃ IN (SX)</div><div style="font-size:12px;font-weight:800;color:#0369a1">' + _ptFN(roll.qty_printed) + 'm</div></div>'
          + '        <div style="background:#d1fae5;padding:8px;border-radius:6px;text-align:center"><div style="font-size:8px;color:#065f46;font-weight:700">TỒN CUỐI</div><div style="font-size:12px;font-weight:800;color:#065f46">' + _ptFN(roll.qty_remaining) + 'm</div></div>'
          + '      </div>'
          +        limitHtml
          + '      <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:8px;margin-bottom:20px">'
          + '        <div style="background:#fffbeb;border:2px solid #f59e0b;padding:8px;border-radius:6px;text-align:center;box-shadow:0 2px 8px rgba(245,158,11,0.15)"><div style="font-size:9px;color:#d97706;font-weight:800;letter-spacing:0.5px">⚠️ HAO HỤT</div><div style="font-size:14px;font-weight:800;color:#b45309;margin-top:2px">' + _ptFN(roll.qty_waste) + 'm</div></div>'
          + '        <div style="background:#fef2f2;border:2px solid #ef4444;padding:8px;border-radius:6px;text-align:center;box-shadow:0 2px 8px rgba(239,68,68,0.15)"><div style="font-size:9px;color:#dc2626;font-weight:800;letter-spacing:0.5px">❌ SX LỖI</div><div style="font-size:14px;font-weight:800;color:#991b1b;margin-top:2px">' + _ptFN(roll.qty_error) + 'm</div></div>'
          + '      </div>'
          + '      <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:8px">LỊCH SỬ ĐIỀU CHỈNH HAO HỤT / LỖI</div>'
          + '      <div style="max-height:220px;overflow-y:auto">'
          + '        <table class="table" style="font-size:10px;white-space:nowrap">'
          + '          <thead><tr style="background:#f1f5f9;color:#475569"><th>Thời Gian</th><th>Hoạt động</th><th>Số Mét</th><th>Lý Do</th><th>Người thực hiện</th></tr></thead>'
          + '          <tbody>' + histRows + '</tbody>'
          + '        </table>'
          + '      </div>'
          + '    </div>'
          + '    <div class="pt-details-right">'
          + '      <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:12px">DANH SÁCH ĐƠN ĐÃ IN (' + orders.length + ')</div>'
          + '      <div style="max-height:calc(90vh - 120px);overflow-y:auto">'
          +        orderRows
          + '      </div>'
          + '    </div>'
          + '  </div>'
          + '</div>';
    } catch(e) {
        showToast('Lỗi tải chi tiết cây: ' + e.message, 'error');
        closePtDetailsModal();
    }
}

function closePtDetailsModal() {
    var m = document.getElementById('ptDetailsModal');
    if (m) m.style.display = 'none';
}

function ptDetailsAction(type, rollId) {
    var area = document.getElementById('ptDetailsFormArea');
    if (!area) return;
    
    var title = type === 'waste' ? 'Khai báo Hao hụt' : 'Khai báo SX Lỗi';
    var placeholder = type === 'waste' ? 'Nhập lý do hao hụt...' : 'Nhập lý do sản xuất lỗi...';
    var labelClass = type === 'waste' ? 'color:#d97706' : 'color:#dc2626';
    
    area.innerHTML = 
        '<div style="background:#fff;border:1px solid #e2e8f0;padding:12px;border-radius:8px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)">'
      + '  <div style="font-weight:800;font-size:11px;' + labelClass + ';margin-bottom:8px">' + title + '</div>'
      + '  <div class="pt-form-group">'
      + '    <label>Số lượng (mét) <span style="color:#ef4444">*</span></label>'
      + '    <input type="number" id="ptActQty" min="0.01" step="0.01" required placeholder="Ví dụ: 2.34">'
      + '  </div>'
      + '  <div class="pt-form-group">'
      + '    <label>Lý do bắt buộc <span style="color:#ef4444">*</span></label>'
      + '    <input type="text" id="ptActReason" required placeholder="' + placeholder + '">'
      + '  </div>'
      + '  <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px">'
      + '    <button class="pt-btn" style="background:#f1f5f9;color:#475569;padding:4px 8px;font-size:10px" onclick="document.getElementById(\'ptDetailsFormArea\').innerHTML=\'\'">Hủy</button>'
      + '    <button class="pt-btn pt-btn-primary" style="padding:4px 8px;font-size:10px" onclick="ptDetailsSubmitAction(\'' + type + '\', ' + rollId + ')">Xác nhận</button>'
      + '  </div>'
      + '</div>';
    
    setTimeout(function() { document.getElementById('ptActQty').focus(); }, 50);
}

async function ptDetailsSubmitAction(type, rollId) {
    var qty = Number(document.getElementById('ptActQty').value);
    var reason = document.getElementById('ptActReason').value || '';
    
    if (!qty || qty <= 0) {
        showToast('Số lượng mét phải lớn hơn 0', 'error');
        return;
    }
    if (!reason.trim()) {
        showToast('Vui lòng điền lý do bắt buộc', 'error');
        return;
    }
    
    try {
        var url = type === 'waste' ? '/api/pettem/rolls/' + rollId + '/adjust-waste' : '/api/pettem/rolls/' + rollId + '/adjust-error';
        var res = await apiCall(url, 'POST', {
            qty: qty,
            reason: reason
        });
        if (res && res.error) {
            showToast(res.error, 'error');
        } else {
            showToast('✅ Cập nhật hao hụt/lỗi thành công!');
            await openPtDetailsModal(rollId);
            _ptLoadAll();
        }
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}

async function ptDetailsReset(rollId) {
    if (!confirm('Bạn có chắc chắn muốn reset toàn bộ hao hụt, sản xuất lỗi và trạng thái chốt của cây này không?')) return;
    try {
        await apiCall('/api/pettem/rolls/' + rollId + '/reset', 'POST');
        showToast('✅ Đã reset cây vật liệu thành công!');
        await openPtDetailsModal(rollId);
        _ptLoadAll();
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}

async function ptDetailsCloseRoll(rollId) {
    if (!confirm('Bạn có chắc chắn muốn chốt cây vật liệu này? Sau khi chốt sẽ không thể chỉnh sửa hoặc dùng in đơn mới.')) return;
    try {
        var res = await apiCall('/api/pettem/rolls/' + rollId + '/close', 'POST');
        if (res && res.error) {
            showToast(res.message || res.error, 'error');
        } else if (res && res.pending_approval) {
            showToast(res.message || 'Đã gửi yêu cầu chốt cuộn lên Giám đốc.');
            await openPtDetailsModal(rollId);
            _ptLoadAll();
        } else {
            showToast('✅ Đã chốt cây vật liệu!');
            await openPtDetailsModal(rollId);
            _ptLoadAll();
        }
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}

async function ptDetailsApproveRoll(rollId) {
    if (!confirm('Bạn có chắc chắn muốn DUYỆT chốt cây vật liệu này?')) return;
    try {
        var res = await apiCall('/api/pettem/rolls/' + rollId + '/approve', 'POST');
        if (res && res.error) {
            showToast(res.error, 'error');
        } else {
            showToast('✅ Đã duyệt chốt cây vật liệu!');
            await openPtDetailsModal(rollId);
            _ptLoadAll();
        }
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}

async function ptDetailsRejectRoll(rollId) {
    if (!confirm('Bạn có chắc chắn muốn TỪ CHỐI yêu cầu chốt cây vật liệu này?')) return;
    try {
        var res = await apiCall('/api/pettem/rolls/' + rollId + '/reject', 'POST');
        if (res && res.error) {
            showToast(res.error, 'error');
        } else {
            showToast('✅ Đã từ chối yêu cầu chốt cuộn!');
            await openPtDetailsModal(rollId);
            _ptLoadAll();
        }
    } catch(e) {
        showToast(e.message || 'Lỗi', 'error');
    }
}

// ========== CONFIG ALLOWED WASTE MODAL ==========
function openPtConfigWasteModal() {
    var m = document.getElementById('ptConfigWasteModal');
    if (!m) {
        m = document.createElement('div');
        m.id = 'ptConfigWasteModal';
        m.className = 'pt-modal';
        document.body.appendChild(m);
        
        m.innerHTML = 
            '<div class="pt-modal-content">'
            + '  <div class="pt-modal-header">'
            + '    <h3>⚙️ Cài đặt tỷ lệ hao hụt cho phép</h3>'
            + '    <span class="pt-close-btn" onclick="closePtConfigWasteModal()">&times;</span>'
            + '  </div>'
            + '  <form id="ptConfigWasteForm" onsubmit="submitPtConfigWasteForm(event)">'
            + '    <div class="pt-modal-body">'
            + '      <div style="font-size:11px;color:#64748b;margin-bottom:16px;line-height:1.4">'
            + '        Chỉ Giám đốc mới có quyền thay đổi thông số này. Nếu (Hao hụt + Lỗi) vượt quá tỷ lệ cấu hình, Quản lý xưởng bắt buộc phải được Giám đốc duyệt (hoặc nhập Mã Khóa Tổng) mới được chốt cuộn.'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Tỉ lệ hao hụt PET (%)</label>'
            + '        <input type="number" id="ptCfgWastePet" step="0.1" min="0" max="100" required>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Tỉ lệ hao hụt TEM (%)</label>'
            + '        <input type="number" id="ptCfgWasteTem" step="0.1" min="0" max="100" required>'
            + '      </div>'
            + '      <div class="pt-form-group">'
            + '        <label>Tỉ lệ hao hụt DECAL (%)</label>'
            + '        <input type="number" id="ptCfgWasteDecal" step="0.1" min="0" max="100" required>'
            + '      </div>'
            + '      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">'
            + '        <button type="button" class="pt-btn" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1" onclick="closePtConfigWasteModal()">Hủy</button>'
            + '        <button type="submit" id="submitPtCfgWasteBtn" class="pt-btn pt-btn-primary">Lưu Cài Đặt</button>'
            + '      </div>'
            + '    </div>'
            + '  </form>'
            + '</div>';
    }
    
    document.getElementById('ptCfgWastePet').value = _ptAllowedWaste.PET;
    document.getElementById('ptCfgWasteTem').value = _ptAllowedWaste.TEM;
    document.getElementById('ptCfgWasteDecal').value = _ptAllowedWaste.DECAL;
    
    m.style.display = 'flex';
}

function closePtConfigWasteModal() {
    var m = document.getElementById('ptConfigWasteModal');
    if (m) m.style.display = 'none';
}

async function submitPtConfigWasteForm(event) {
    event.preventDefault();
    var btn = document.getElementById('submitPtCfgWasteBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Đang lưu...';
    }
    
    var petVal = parseFloat(document.getElementById('ptCfgWastePet').value);
    var temVal = parseFloat(document.getElementById('ptCfgWasteTem').value);
    var decalVal = parseFloat(document.getElementById('ptCfgWasteDecal').value);
    
    try {
        await apiCall('/api/app-config/pettem_allowed_waste_pet', 'PUT', { value: petVal });
        await apiCall('/api/app-config/pettem_allowed_waste_tem', 'PUT', { value: temVal });
        await apiCall('/api/app-config/pettem_allowed_waste_decal', 'PUT', { value: decalVal });
        
        _ptAllowedWaste.PET = petVal;
        _ptAllowedWaste.TEM = temVal;
        _ptAllowedWaste.DECAL = decalVal;
        
        showToast('Đã cập nhật cấu hình tỷ lệ hao hụt!', 'success');
        closePtConfigWasteModal();
        _ptLoadAll();
    } catch(e) {
        console.error('[PT] save configs failed:', e);
        showToast('Có lỗi xảy ra khi lưu cấu hình: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Lưu Cài Đặt';
        }
    }
}
