// ========== BỘ PHẬN IN — Desktop SPA ==========
var _bpi = { records: [], tree: null, filter: { year: null, month: null, printer_id: null, contractor_id: null }, search: '', page: 1, ps: 100, contractors: [] };
var _bpiOpen = {};

function renderBophaninPage(content) {
    if (!document.getElementById('_bpiS')) {
        var st = document.createElement('style'); st.id = '_bpiS';
        st.textContent = '.bpi-wrap{display:flex;height:calc(100vh - 60px);overflow:hidden}.bpi-sb{width:270px;min-width:270px;background:#fff;border-right:1px solid var(--gray-200);overflow-y:auto}.bpi-main{flex:1;min-width:0;display:flex;flex-direction:column;overflow-y:auto;padding:16px}.bpi-main>*{flex-shrink:0}'
+'.bpi-sb-title{font-size:13px;font-weight:800;padding:16px;border-bottom:1px solid var(--gray-200);text-align:center;color:#7c3aed}'
+'.bpi-sb-total{background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;padding:12px 16px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;cursor:pointer}'
+'.bpi-sb-year{padding:8px 16px;font-weight:800;font-size:12px;color:var(--navy);cursor:pointer;display:flex;justify-content:space-between;background:#f8fafc;border-bottom:1px solid var(--gray-200)}'
+'.bpi-sb-month{padding:6px 16px 6px 28px;font-size:11px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #f0f0f0;color:#7c3aed}'
+'.bpi-sb-month:hover{background:#f5f3ff}.bpi-sb-month.active{background:#ede9fe;font-weight:800}'
+'.bpi-sb-item{padding:5px 16px 5px 42px;font-size:10px;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;border-bottom:1px solid #fafafa;color:#64748b}'
+'.bpi-sb-item:hover{background:#f5f3ff}.bpi-sb-item.active{background:#ede9fe;color:#7c3aed;font-weight:800}'
+'.bpi-sb-label{padding:4px 16px 4px 36px;font-size:9px;font-weight:800;color:#a78bfa;letter-spacing:1px;background:#faf5ff}'
+'.bpi-ib{width:26px;height:26px;border-radius:6px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;margin:0 1px}'
+'.bpi-ib:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,0.12)}'
+'.bpi-ib.on-test{background:#fef3c7;border-color:#f59e0b}.bpi-ib.on-done{background:#dcfce7;border-color:#22c55e}.bpi-ib.on-err{background:#fee2e2;border-color:#ef4444}'
+'@media(max-width:768px){.bpi-sb{display:none}}';
        document.head.appendChild(st);
    }
    content.innerHTML = '<div class="bpi-wrap"><div class="bpi-sb" id="bpiSb"><div style="padding:20px;text-align:center;color:var(--gray-400);font-size:12px">Đang tải...</div></div><div class="bpi-main">'
        +'<div style="display:flex;gap:10px;margin-bottom:8px;flex-wrap:wrap;align-items:center"><div id="bpiInfo" style="font-size:12px"></div><div id="bpiStats" style="display:flex;gap:10px;flex:1;justify-content:center"></div><input id="bpiSearch" placeholder="🔍 Tìm SP, CSKH..." style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;width:200px;outline:none">'
        +(currentUser && currentUser.role === 'giam_doc' ? '<button onclick="_bpiManageContractors()" style="padding:6px 14px;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;margin-left:8px;transition:all .2s" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">🏭 Quản Lý Gia Công In</button>' : '')
        +'</div>'
        +'<div class="card"><div class="card-body" style="overflow-x:auto;padding:8px"><table class="table" style="font-size:11px;white-space:nowrap" id="bpiTable"><thead><tr style="background:var(--gray-800)">'
        +'<th>STT</th><th>🧪</th><th>✅</th><th>⚠️</th><th>Ngày In</th><th>NV In</th><th>Tên SP</th><th>CSKH</th><th>SL Đơn</th><th>Mét In</th><th>SL Đầu Cuộn</th><th>SL Cuối Cuộn</th><th>Lĩnh Vực</th><th>In/Thêu Chung</th><th>Ghi Chú</th><th>Cập Nhật</th>'
        +'</tr></thead><tbody id="bpiTb"><tr><td colspan="16" style="text-align:center;padding:40px">⏳</td></tr></tbody></table></div></div></div></div>';
    var _t; document.getElementById('bpiSearch').addEventListener('input', function() {
        clearTimeout(_t); _t = setTimeout(function() { _bpi.search = document.getElementById('bpiSearch').value || ''; _bpi.page = 1; _bpiRender(); }, 300);
    });
    _bpiLoadAll();
}

async function _bpiLoadAll() {
    try {
        var [treeRes, conRes] = await Promise.all([apiCall('/api/printing/tree'), apiCall('/api/printing/contractors')]);
        _bpi.tree = treeRes; _bpi.contractors = conRes.contractors || [];
        _bpiRenderSb();
        await _bpiLoadRecs();
    } catch(e) { console.error('[BPI]', e); }
}

function _bpiRenderSb() {
    var sb = document.getElementById('bpiSb'); if (!sb || !_bpi.tree) return;
    var t = _bpi.tree, f = _bpi.filter;
    var h = '<div class="bpi-sb-title">───── 🖨️ Bộ Phận In ─────</div>';
    h += '<div class="bpi-sb-total" onclick="_bpiFilter()"><span>📦 Tổng đơn in</span><span style="font-size:16px">'+(t.total||0)+'</span></div>';
    if (t.tree) t.tree.forEach(function(yr) {
        var yo = !!_bpiOpen['y'+yr.year];
        h += '<div class="bpi-sb-year" onclick="_bpiTgl(\'y'+yr.year+'\')"><span>'+(yo?'▼':'▶')+' 📆 '+yr.year+'</span><span style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;padding:2px 10px;border-radius:10px;font-size:10px">'+yr.count+'</span></div>';
        if (yo && yr.months) yr.months.forEach(function(mo) {
            var mk = 'm'+yr.year+'_'+mo.month, mo2 = !!_bpiOpen[mk], mA = f.year==yr.year && f.month==mo.month && !f.printer_id && !f.contractor_id;
            h += '<div class="bpi-sb-month'+(mA?' active':'')+'" onclick="event.stopPropagation();_bpiTgl(\''+mk+'\');_bpiFilter('+yr.year+','+mo.month+')"><span>'+(mo2?'▼':'▶')+' T'+String(mo.month).padStart(2,'0')+'</span><span>'+mo.count+'</span></div>';
            if (mo2) {
                if (mo.printers && mo.printers.length) { h += '<div class="bpi-sb-label">── NV NỘI BỘ ──</div>';
                    mo.printers.forEach(function(p) { var pA = f.year==yr.year && f.month==mo.month && f.printer_id==p.id;
                        h += '<div class="bpi-sb-item'+(pA?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+','+mo.month+','+p.id+')"><span>👤 '+(p.name||'Chưa PC')+'</span><span>'+p.count+'</span></div>'; }); }
                if (mo.contractors && mo.contractors.length) { h += '<div class="bpi-sb-label">── GIA CÔNG ──</div>';
                    mo.contractors.forEach(function(c) { var cA = f.year==yr.year && f.month==mo.month && f.contractor_id==c.id;
                        h += '<div class="bpi-sb-item'+(cA?' active':'')+'" onclick="event.stopPropagation();_bpiFilter('+yr.year+','+mo.month+',null,'+c.id+')"><span>🏭 '+c.name+'</span><span>'+c.count+'</span></div>'; }); }
            }
        });
    });
    sb.innerHTML = h;
}

function _bpiTgl(k) { _bpiOpen[k] = !_bpiOpen[k]; _bpiRenderSb(); }
function _bpiFilter(y,m,p,c) { _bpi.filter = { year:y||null, month:m||null, printer_id:p||null, contractor_id:c||null }; _bpi.page=1; _bpiRenderSb(); _bpiLoadRecs(); }

async function _bpiLoadRecs() {
    var f = _bpi.filter, qs = '?_=1';
    if (f.year) qs += '&year='+f.year; if (f.month) qs += '&month='+f.month;
    if (f.printer_id) qs += '&printer_id='+f.printer_id; if (f.contractor_id) qs += '&contractor_id='+f.contractor_id;
    try { var res = await apiCall('/api/printing/records'+qs); _bpi.records = res.records||[]; _bpi.page=1; _bpiRender(); } catch(e) { console.error('[BPI]',e); }
}

function _bpiFD(d) { if (!d) return '—'; try { var p=d.split('T')[0].split('-'); return p[2]+'/'+p[1]+'/'+p[0]; } catch(e) { return d; } }

function _bpiRender() {
    var all = _bpi.records.slice();
    if (_bpi.search) { var q=_bpi.search.toLowerCase(); all=all.filter(function(r){return (r.product_name||'').toLowerCase().indexOf(q)>=0||(r.cskh_name||'').toLowerCase().indexOf(q)>=0||(r.order_code||'').toLowerCase().indexOf(q)>=0;}); }
    var tot=all.length, tp=Math.ceil(tot/_bpi.ps)||1; if(_bpi.page>tp)_bpi.page=tp; if(_bpi.page<1)_bpi.page=1;
    var s=(_bpi.page-1)*_bpi.ps, paged=all.slice(s,s+_bpi.ps);
    // Render rows
    var tb=document.getElementById('bpiTb'); if(!tb)return;
    if(!paged.length){tb.innerHTML='<tr><td colspan="16"><div class="empty-state"><div class="icon">🖨️</div><h3>Chưa có đơn in nào</h3></div></td></tr>';} else {
    tb.innerHTML=paged.map(function(r,i){
        var tI=r.is_test_print?'🧪':'⬜',tC=r.is_test_print?' on-test':'',tA=r.is_test_print?'undo_test':'start_test';
        var dI=r.is_print_done?'✅':'⬜',dC=r.is_print_done?' on-done':'',dA=r.is_print_done?'undo_done':'print_done';
        var eI=r.error_reported?'⚠️':'⬜',eC=r.error_reported?' on-err':'';
        var nvName=r.contractor_id?(r.contractor_name?'🏭 '+r.contractor_name:'🏭 Gia công'):(r.printer_name||'—');
        var fieldBadge=r.print_field==='tem'?'<span style="background:#dbeafe;color:#1d4ed8;padding:1px 8px;border-radius:4px;font-size:9px;font-weight:800">TEM</span>':r.print_field==='pet'?'<span style="background:#ede9fe;color:#7c3aed;padding:1px 8px;border-radius:4px;font-size:9px;font-weight:800">PET</span>':'—';
        var upd=''; if(r.last_update_at){upd=_bpiFD(r.last_update_at); if(r.last_update_by)upd+='<br><span style="color:#7c3aed;font-size:9px">'+r.last_update_by+'</span>';}
        return '<tr><td style="text-align:center;font-weight:700;color:#94a3b8">'+(i+1+(_bpi.page-1)*_bpi.ps)+'</td>'
        +'<td style="text-align:center"><button class="bpi-ib'+tC+'" onclick="_bpiTog('+r.id+',\''+tA+'\')" title="In test">'+tI+'</button></td>'
        +'<td style="text-align:center"><button class="bpi-ib'+dC+'" onclick="_bpiTog('+r.id+',\''+dA+'\')" title="In xong">'+dI+'</button></td>'
        +'<td style="text-align:center"><button class="bpi-ib'+eC+'" onclick="_bpiErr('+r.id+')" title="Báo lỗi">'+eI+'</button></td>'
        +'<td style="font-size:10px">'+_bpiFD(r.print_date)+'</td>'
        +'<td style="font-size:10px;color:#059669;font-weight:600">'+nvName+'</td>'
        +'<td style="font-weight:600;color:#1e293b">'+( r.product_name||r.order_code||'—')+'</td>'
        +'<td style="font-size:10px;color:#0369a1">'+( r.cskh_name||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#7c3aed">'+(r.order_quantity||'—')+'</td>'
        +'<td style="text-align:center;font-weight:700;color:#dc2626">'+(r.print_meters||'—')+'</td>'
        +'<td style="text-align:center;font-weight:600">'+(r.roll_start_qty||'—')+'</td>'
        +'<td style="text-align:center;font-weight:600">'+(r.roll_end_qty||'—')+'</td>'
        +'<td style="text-align:center">'+fieldBadge+'</td>'
        +'<td style="font-size:9px;color:#6b7280;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.shared_process||'—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280;max-width:80px;overflow:hidden;text-overflow:ellipsis">'+(r.notes||'—')+'</td>'
        +'<td style="font-size:9px;color:#6b7280">'+upd+'</td></tr>';
    }).join(''); }
    // Stats
    var el=document.getElementById('bpiInfo'); if(el){
        var parts=['🖨️ Bộ Phận In']; if(_bpi.filter.year)parts.push('📆 '+_bpi.filter.year); if(_bpi.filter.month)parts.push('🗓️ T'+_bpi.filter.month);
        el.innerHTML='<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:700">'+parts.join(' <span style="opacity:0.5;margin:0 6px">•</span> ')+' — <span style="color:#c4b5fd;font-weight:900">'+tot+'</span> đơn</div>';
    }
    var sc=document.getElementById('bpiStats'); if(sc){
        var testing=all.filter(function(r){return r.is_test_print&&!r.is_print_done;}).length, done=all.filter(function(r){return r.is_print_done;}).length, errs=all.filter(function(r){return r.error_reported;}).length;
        sc.innerHTML='<div style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #7c3aed30"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">📦 TỔNG</div><div style="font-size:15px;font-weight:900">'+tot+'</div></div>'
        +'<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #f59e0b30"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">🧪 TEST</div><div style="font-size:15px;font-weight:900">'+testing+'</div></div>'
        +'<div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #05966930"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">✅ XONG</div><div style="font-size:15px;font-weight:900">'+done+'</div></div>'
        +'<div style="background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;padding:8px 18px;border-radius:10px;min-width:90px;text-align:center;box-shadow:0 4px 15px #dc262630"><div style="font-size:9px;font-weight:600;opacity:.85;letter-spacing:1px;margin-bottom:2px">⚠️ LỖI</div><div style="font-size:15px;font-weight:900">'+errs+'</div></div>';
    }
}

async function _bpiTog(id, action) { try { await apiCall('/api/printing/toggle/'+id,'POST',{action}); showToast('✅ Cập nhật'); await _bpiLoadAll(); } catch(e) { showToast(e.message||'Lỗi','error'); } }
function _bpiErr(id) { if(typeof navigate==='function'){navigate('don-loi-khach-hang');showToast('📋 Chuyển sang Đơn Lỗi — tạo báo cáo lỗi nội bộ');} }

// ========== GIA CÔNG IN MANAGEMENT (Giám Đốc only) ==========
async function _bpiManageContractors() {
    try {
        var res = await apiCall('/api/printing/contractors');
        var cons = res.contractors || [];

        var html = '<div style="padding:20px">';
        html += '<h3 style="margin:0 0 16px;color:#0f172a">🏭 Quản Lý Gia Công In</h3>';

        // Add new form
        html += '<div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:20px;border:1px solid #e2e8f0">';
        html += '<div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:8px">➕ Thêm Gia Công In Mới</div>';
        html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
        html += '<input id="_bpiConName" placeholder="Tên gia công..." style="flex:1;min-width:150px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">';
        html += '<input id="_bpiConPhone" placeholder="SĐT (tuỳ chọn)" style="width:120px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">';
        html += '<input id="_bpiConNotes" placeholder="Ghi chú" style="width:150px;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">';
        html += '<button onclick="_bpiConAdd()" style="padding:8px 16px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer">Thêm</button>';
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
                html += '<button onclick="_bpiConDel(' + c.id + ')" style="padding:4px 10px;border:1px solid #fca5a5;border-radius:6px;font-size:10px;cursor:pointer;background:#fef2f2;color:#dc2626;font-weight:600">🗑️ Xóa</button>';
                html += '</td></tr>';
            });
            html += '</tbody></table>';
        } else {
            html += '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px">Chưa có Gia Công In nào</div>';
        }

        html += '<div style="padding:16px 0 0;text-align:right"><button onclick="document.getElementById(\'_bpiConOverlay\').remove()" style="padding:8px 20px;background:#f1f5f9;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;color:#475569">Đóng</button></div>';
        html += '</div>';

        var old = document.getElementById('_bpiConOverlay'); if (old) old.remove();
        var ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;animation:qlxFadeIn .2s';
        ov.id = '_bpiConOverlay';
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
        ov.innerHTML = '<div style="background:#fff;border-radius:16px;width:650px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);animation:qlxSlideUp .3s">' + html + '</div>';
        document.body.appendChild(ov);
    } catch(e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function _bpiConAdd() {
    var name = (document.getElementById('_bpiConName') || {}).value || '';
    var phone = (document.getElementById('_bpiConPhone') || {}).value || '';
    var notes = (document.getElementById('_bpiConNotes') || {}).value || '';
    if (!name.trim()) return showToast('Nhập tên gia công', 'error');
    try {
        await apiCall('/api/printing/contractors', 'POST', { name: name.trim(), phone: phone.trim(), notes: notes.trim() });
        showToast('✅ Đã thêm Gia Công In');
        _bpiManageContractors();
    } catch(e) { showToast(e.message, 'error'); }
}

async function _bpiConDel(id) {
    if (!confirm('Xóa Gia Công In này?')) return;
    try {
        await apiCall('/api/printing/contractors/' + id, 'DELETE');
        showToast('✅ Đã xóa');
        _bpiManageContractors();
    } catch(e) { showToast(e.message, 'error'); }
}
